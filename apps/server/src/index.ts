import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import type { ClientToServerEvents, ServerToClientEvents } from "@syncweb/shared";
import { RoomManager } from "./room-manager.js";
import { toEmbedDescriptor } from "./embed.js";
import {
  chatSchema,
  driftSchema,
  joinRoomSchema,
  kickSchema,
  pauseSchema,
  playSchema,
  playbackSchema,
  playlistAddSchema,
  playlistRemoveSchema,
  seekSchema
} from "./validation.js";
import { enrichEmbedDescriptor } from "./video-metadata.js";

const app = express();
const httpServer = createServer(app);
const roomManager = new RoomManager();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: "*"
  }
});

const socketRoomMap = new Map<string, { roomId: string; userId: string; username: string }>();
const activeUsernameMap = new Map<string, string>();
const recentChatMap = new Map<string, number[]>();
const CHAT_RATE_LIMIT_WINDOW_MS = 10_000;
const CHAT_RATE_LIMIT_COUNT = 5;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function releaseSocketState(socketId: string) {
  const state = socketRoomMap.get(socketId);
  if (!state) {
    return null;
  }

  socketRoomMap.delete(socketId);
  recentChatMap.delete(state.userId);

  const normalizedUsername = normalizeUsername(state.username);
  if (activeUsernameMap.get(normalizedUsername) === socketId) {
    activeUsernameMap.delete(normalizedUsername);
  }

  return state;
}

function emitSnapshot(roomId: string) {
  const snapshot = roomManager.snapshot(roomId);
  if (snapshot) {
    io.to(roomId).emit("room:snapshot", snapshot);
  }
}

function emitPlayback(roomId: string) {
  const snapshot = roomManager.snapshot(roomId);
  if (snapshot) {
    io.to(roomId).emit("playback:updated", snapshot.playback);
  }
}

function emitPlaylist(roomId: string) {
  const snapshot = roomManager.snapshot(roomId);
  if (snapshot) {
    io.to(roomId).emit("playlist:updated", snapshot.playlist, snapshot.currentItem);
  }
}

io.on("connection", (socket) => {
  const sessionUserId = nanoid();

  socket.on("room:join", (payload) => {
    const parsed = joinRoomSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      socket.emit("room:error", issue?.message ?? "Invalid room join payload.");
      return;
    }

    const { roomId, username, avatarSeed } = parsed.data;
    const normalizedUsername = normalizeUsername(username);
    const existingSocketId = activeUsernameMap.get(normalizedUsername);
    if (existingSocketId && existingSocketId !== socket.id) {
      socket.emit("room:error", "That username is already in use.");
      return;
    }

    const existingState = releaseSocketState(socket.id);
    if (existingState) {
      const existingUser = roomManager.leaveRoom(existingState.roomId, existingState.userId);
      socket.leave(existingState.roomId);
      if (existingUser) {
        socket.to(existingState.roomId).emit("room:user-left", existingState.userId);
        emitSnapshot(existingState.roomId);
      }
    }

    socket.join(roomId);
    const { room, user } = roomManager.joinRoom(roomId, sessionUserId, username, avatarSeed);
    socketRoomMap.set(socket.id, { roomId, userId: user.id, username });
    activeUsernameMap.set(normalizedUsername, socket.id);
    socket.emit("room:snapshot", roomManager.snapshot(room.roomId)!);
    socket.to(roomId).emit("room:user-joined", user);
  });

  socket.on("playback:play", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = playSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid play command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can control playback.");
      return;
    }

    roomManager.updatePlayback(state.roomId, {
      status: "playing",
      positionSeconds: parsed.data.positionSeconds,
      playbackRate: parsed.data.playbackRate ?? 1,
      videoStartedAt: Date.now()
    });
    emitPlayback(state.roomId);
  });

  socket.on("playback:pause", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = pauseSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid pause command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can control playback.");
      return;
    }

    roomManager.updatePlayback(state.roomId, {
      status: "paused",
      positionSeconds: parsed.data.positionSeconds,
      videoStartedAt: null
    });
    emitPlayback(state.roomId);
  });

  socket.on("playback:seek", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = seekSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid seek command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can seek.");
      return;
    }

    const snapshot = roomManager.snapshot(state.roomId);
    roomManager.updatePlayback(state.roomId, {
      positionSeconds: parsed.data.positionSeconds,
      videoStartedAt: snapshot?.playback.status === "playing" ? Date.now() : null
    });
    emitPlayback(state.roomId);
  });

  socket.on("playback:drift", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = driftSchema.safeParse(payload);
    if (!state || !parsed.success) {
      return;
    }
    if (roomManager.shouldCorrectDrift(state.roomId, state.userId, parsed.data.positionSeconds)) {
      emitPlayback(state.roomId);
    }
  });

  socket.on("playlist:add", async (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = playlistAddSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid playlist add command.");
      return;
    }

    const embed = await enrichEmbedDescriptor(toEmbedDescriptor(parsed.data.url));
    roomManager.addPlaylistItem(state.roomId, parsed.data.url, state.username, embed);
    emitPlaylist(state.roomId);
    emitPlayback(state.roomId);
  });

  socket.on("playlist:remove", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = playlistRemoveSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid playlist remove command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can remove playlist items.");
      return;
    }

    roomManager.removePlaylistItem(state.roomId, parsed.data.playlistItemId);
    emitPlaylist(state.roomId);
    emitPlayback(state.roomId);
  });

  socket.on("playlist:advance", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = playbackSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid playlist advance command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can advance playlist items.");
      return;
    }

    roomManager.advancePlaylist(state.roomId);
    emitPlaylist(state.roomId);
    emitPlayback(state.roomId);
  });

  socket.on("chat:send", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = chatSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid chat payload.");
      return;
    }

    const now = Date.now();
    const recent = (recentChatMap.get(state.userId) ?? []).filter((timestamp) => now - timestamp < CHAT_RATE_LIMIT_WINDOW_MS);
    if (recent.length >= CHAT_RATE_LIMIT_COUNT) {
      socket.emit("room:error", "Chat rate limit exceeded.");
      return;
    }
    recent.push(now);
    recentChatMap.set(state.userId, recent);

    const message = roomManager.appendChat(state.roomId, state.userId, state.username, parsed.data.message);
    io.to(state.roomId).emit("chat:message", message);
  });

  socket.on("room:kick", (payload) => {
    const state = socketRoomMap.get(socket.id);
    const parsed = kickSchema.safeParse(payload);
    if (!state || !parsed.success) {
      socket.emit("room:error", "Invalid kick command.");
      return;
    }
    if (!roomManager.canControl(state.roomId, state.userId)) {
      socket.emit("room:error", "Only the host can kick users.");
      return;
    }

    for (const [socketId, membership] of socketRoomMap.entries()) {
      if (membership.userId === parsed.data.userId && membership.roomId === state.roomId) {
        io.to(socketId).emit("room:kicked", "Removed by host.");
        io.sockets.sockets.get(socketId)?.disconnect(true);
      }
    }
  });

  socket.on("disconnect", () => {
    const state = releaseSocketState(socket.id);
    if (!state) {
      return;
    }

    const user = roomManager.leaveRoom(state.roomId, state.userId);
    if (user) {
      socket.to(state.roomId).emit("room:user-left", state.userId);
      emitSnapshot(state.roomId);
    }
  });
});

setInterval(() => {
  roomManager.pruneInactiveRooms();
}, 60_000);

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`syncweb server listening on ${port}`);
});
