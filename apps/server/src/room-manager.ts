import { nanoid } from "nanoid";
import type {
  ChatMessage,
  EmbedDescriptor,
  PlaybackState,
  PlaylistItem,
  RoomSnapshot,
  RoomUser
} from "@syncweb/shared";
import { generateAvatarUrl, generateRoomName, resolveVideoTitle } from "@syncweb/shared";
import { toEmbedDescriptor } from "./embed.js";

const ROOM_TTL_MS = 1000 * 60 * 60;
const CHAT_LIMIT = 100;
const DRIFT_THRESHOLD_SECONDS = 0.3;
interface InternalRoom {
  roomId: string;
  hostUserId: string | null;
  currentItem: PlaylistItem | null;
  playback: PlaybackState;
  playlist: PlaylistItem[];
  users: Map<string, RoomUser>;
  chat: ChatMessage[];
  updatedAt: number;
}

export class RoomManager {
  private readonly rooms = new Map<string, InternalRoom>();

  getOrCreateRoom(roomId: string) {
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }

    const created: InternalRoom = {
      roomId,
      hostUserId: null,
      currentItem: null,
      playback: {
        status: "paused",
        positionSeconds: 0,
        playbackRate: 1,
        videoStartedAt: null,
        updatedAt: Date.now()
      },
      playlist: [],
      users: new Map(),
      chat: [],
      updatedAt: Date.now()
    };

    this.rooms.set(roomId, created);
    return created;
  }

  joinRoom(roomId: string, userId: string, username: string, avatarSeed: string) {
    const room = this.getOrCreateRoom(roomId);
    const now = Date.now();
    const isHost = !room.hostUserId;

    if (isHost) {
      room.hostUserId = userId;
    }

    const user: RoomUser = {
      id: userId,
      username,
      avatarUrl: generateAvatarUrl(avatarSeed),
      isHost,
      joinedAt: now,
      lastDriftReportAt: null
    };

    room.users.set(userId, user);
    room.updatedAt = now;
    return { room, user };
  }

  leaveRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const user = room.users.get(userId);
    if (!user) {
      return null;
    }

    room.users.delete(userId);
    if (room.hostUserId === userId) {
      const nextHost = room.users.values().next().value as RoomUser | undefined;
      room.hostUserId = nextHost?.id ?? null;
      if (nextHost) {
        room.users.set(nextHost.id, { ...nextHost, isHost: true });
      }
    }
    room.updatedAt = Date.now();

    if (room.users.size === 0 && Date.now() - room.updatedAt > ROOM_TTL_MS) {
      this.rooms.delete(roomId);
    }

    return user;
  }

  snapshot(roomId: string): RoomSnapshot | null {
    const room = this.rooms.get(roomId);
    return room ? this.toSnapshot(room) : null;
  }

  addPlaylistItem(roomId: string, url: string, addedBy: string, embedOverride?: EmbedDescriptor) {
    const room = this.getOrCreateRoom(roomId);
    const embed = embedOverride ?? toEmbedDescriptor(url);
    const item = this.createPlaylistItem(url, embed, addedBy);
    room.playlist.push(item);
    if (!room.currentItem) {
      room.currentItem = item;
      room.playback = this.resetPlaybackState();
    }
    room.updatedAt = Date.now();
    return { room, item };
  }

  removePlaylistItem(roomId: string, playlistItemId: string) {
    const room = this.getOrCreateRoom(roomId);
    room.playlist = room.playlist.filter((item) => item.id !== playlistItemId);

    if (room.currentItem?.id === playlistItemId) {
      room.currentItem = room.playlist[0] ?? null;
      room.playback = this.resetPlaybackState();
    }

    room.updatedAt = Date.now();
    return room;
  }

  advancePlaylist(roomId: string) {
    const room = this.getOrCreateRoom(roomId);
    if (room.playlist.length > 0) {
      room.playlist.shift();
    }
    room.currentItem = room.playlist[0] ?? null;
    room.playback = this.resetPlaybackState();
    room.updatedAt = Date.now();
    return room;
  }

  updatePlayback(roomId: string, next: Partial<PlaybackState>) {
    const room = this.getOrCreateRoom(roomId);
    room.playback = {
      ...room.playback,
      ...next,
      updatedAt: Date.now()
    };
    room.updatedAt = room.playback.updatedAt;
    return room.playback;
  }

  appendChat(roomId: string, userId: string, username: string, message: string) {
    const room = this.getOrCreateRoom(roomId);
    const chatMessage: ChatMessage = {
      id: nanoid(),
      userId,
      username,
      message,
      timestamp: Date.now()
    };
    room.chat.push(chatMessage);
    room.chat = room.chat.slice(-CHAT_LIMIT);
    room.updatedAt = Date.now();
    return chatMessage;
  }

  canControl(roomId: string, userId: string) {
    const room = this.getOrCreateRoom(roomId);
    return room.hostUserId === userId;
  }

  currentRoomUsers(roomId: string) {
    return [...this.getOrCreateRoom(roomId).users.values()];
  }

  getPlaybackTarget(roomId: string) {
    const room = this.getOrCreateRoom(roomId);
    const now = Date.now();
    if (room.playback.status === "playing" && room.playback.videoStartedAt) {
      const elapsedSeconds = (now - room.playback.videoStartedAt) / 1000;
      return room.playback.positionSeconds + elapsedSeconds * room.playback.playbackRate;
    }
    return room.playback.positionSeconds;
  }

  shouldCorrectDrift(roomId: string, userId: string, reportedSeconds: number) {
    const room = this.getOrCreateRoom(roomId);
    const user = room.users.get(userId);
    if (user) {
      room.users.set(userId, { ...user, lastDriftReportAt: Date.now() });
    }
    return Math.abs(this.getPlaybackTarget(roomId) - reportedSeconds) > DRIFT_THRESHOLD_SECONDS;
  }

  reassignHost(roomId: string, userId: string) {
    const room = this.getOrCreateRoom(roomId);
    room.hostUserId = userId;
    room.users.forEach((user, id) => {
      room.users.set(id, { ...user, isHost: id === userId });
    });
    room.updatedAt = Date.now();
    return room;
  }

  pruneInactiveRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.size === 0 && now - room.updatedAt > ROOM_TTL_MS) {
        this.rooms.delete(roomId);
      }
    }
  }

  private createPlaylistItem(url: string, embed: EmbedDescriptor, addedBy: string): PlaylistItem {
    return {
      id: nanoid(),
      url,
      title: resolveVideoTitle(embed.title, url),
      duration: embed.duration ?? null,
      addedBy,
      embed,
      createdAt: Date.now()
    };
  }

  private resetPlaybackState(): PlaybackState {
    return {
      status: "paused",
      positionSeconds: 0,
      playbackRate: 1,
      videoStartedAt: null,
      updatedAt: Date.now()
    };
  }

  private toSnapshot(room: InternalRoom): RoomSnapshot {
    return {
      roomId: room.roomId,
      roomName: generateRoomName(room.roomId),
      hostUserId: room.hostUserId,
      currentItem: room.currentItem,
      playback: room.playback,
      playlist: room.playlist,
      users: [...room.users.values()],
      chat: room.chat
    };
  }
}
