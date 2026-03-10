import { useEffect, useRef, useState } from "react";
import {
  generateRoomName,
  type DriftReport,
  type JoinRoomPayload,
  type PauseCommand,
  type PlayCommand,
  type PlaybackCommand,
  type PlaybackState,
  type PlaylistAddCommand,
  type PlaylistItem,
  type RoomSnapshot,
  type RoomUser,
  type SeekCommand
} from "@syncweb/shared";
import { socket } from "../lib/socket";

interface UseRoomConnectionArgs {
  roomId: string;
  username: string;
  avatarSeed: string;
}

const EMPTY_PLAYBACK: PlaybackState = {
  status: "paused",
  positionSeconds: 0,
  playbackRate: 1,
  videoStartedAt: null,
  updatedAt: 0
};

function reconcileCurrentItem(previous: PlaylistItem | null, next: PlaylistItem | null) {
  if (!previous || !next) {
    return next;
  }

  return previous.id === next.id ? previous : next;
}

export function useRoomConnection({ roomId, username, avatarSeed }: UseRoomConnectionArgs) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentItem, setCurrentItem] = useState<PlaylistItem | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>(EMPTY_PLAYBACK);
  const [error, setError] = useState<string | null>(null);
  const usersRef = useRef<RoomUser[]>([]);
  const playbackRef = useRef<PlaybackState>(EMPTY_PLAYBACK);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    const onSnapshot = (next: RoomSnapshot) => {
      setSnapshot(next);
      setUsers(next.users);
      setPlaylist(next.playlist);
      setCurrentItem((prev) => reconcileCurrentItem(prev, next.currentItem));
      setPlayback(next.playback);
      setError(null);
    };
    const onPlaybackUpdated = (nextPlayback: PlaybackState) => {
      setPlayback(nextPlayback);
      setSnapshot((prev) => (prev ? { ...prev, playback: nextPlayback } : prev));
    };
    const onPlaylistUpdated = (items: PlaylistItem[], nextCurrentItem: PlaylistItem | null) => {
      setPlaylist(items);
      setCurrentItem((prev) => reconcileCurrentItem(prev, nextCurrentItem));
      setSnapshot((prev) => {
        if (prev) {
          return {
            ...prev,
            playlist: items,
            currentItem: reconcileCurrentItem(prev.currentItem, nextCurrentItem)
          };
        }

        return {
          roomId,
          roomName: generateRoomName(roomId),
          hostUserId: null,
          currentItem: nextCurrentItem,
          playback: playbackRef.current,
          playlist: items,
          users: usersRef.current,
          chat: []
        };
      });
    };
    const onUserJoined = (user: RoomUser) => {
      setUsers((prev) => {
        const nextUsers = prev.some((entry) => entry.id === user.id) ? prev : [...prev, user];
        setSnapshot((snapshotPrev) => (snapshotPrev ? { ...snapshotPrev, users: nextUsers } : snapshotPrev));
        return nextUsers;
      });
    };
    const onUserLeft = (userId: string) => {
      setUsers((prev) => {
        const nextUsers = prev.filter((user) => user.id !== userId);
        setSnapshot((snapshotPrev) => (snapshotPrev ? { ...snapshotPrev, users: nextUsers } : snapshotPrev));
        return nextUsers;
      });
    };
    const joinRoom = () => {
      const payload: JoinRoomPayload = { roomId, username, avatarSeed };
      socket.emit("room:join", payload);
    };
    const onConnectError = (cause: Error) => {
      setError(cause.message || "Could not connect to the sync server.");
    };
    const onDisconnect = (reason: string) => {
      if (reason !== "io client disconnect") {
        setError("Disconnected from the sync server.");
      }
    };

    socket.on("room:snapshot", onSnapshot);
    socket.on("playback:updated", onPlaybackUpdated);
    socket.on("playlist:updated", onPlaylistUpdated);
    socket.on("room:user-joined", onUserJoined);
    socket.on("room:user-left", onUserLeft);
    socket.on("room:error", setError);
    socket.on("room:kicked", setError);
    socket.on("connect", joinRoom);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("room:snapshot", onSnapshot);
      socket.off("playback:updated", onPlaybackUpdated);
      socket.off("playlist:updated", onPlaylistUpdated);
      socket.off("room:user-joined", onUserJoined);
      socket.off("room:user-left", onUserLeft);
      socket.off("room:error");
      socket.off("room:kicked");
      socket.off("connect", joinRoom);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [avatarSeed, roomId, username]);

  return {
    snapshot,
    users,
    playlist,
    currentItem,
    playback,
    error,
    sendPlay: (positionSeconds: number, playbackRate = 1) => {
      const payload: PlayCommand = { roomId, positionSeconds, playbackRate, issuedAt: Date.now() };
      socket.emit("playback:play", payload);
    },
    sendPause: (positionSeconds: number) => {
      const payload: PauseCommand = { roomId, positionSeconds, issuedAt: Date.now() };
      socket.emit("playback:pause", payload);
    },
    sendSeek: (positionSeconds: number) => {
      const payload: SeekCommand = { roomId, positionSeconds, issuedAt: Date.now() };
      socket.emit("playback:seek", payload);
    },
    reportDrift: (positionSeconds: number) => {
      const payload: DriftReport = { roomId, positionSeconds, reportedAt: Date.now() };
      socket.emit("playback:drift", payload);
    },
    addPlaylistItem: (url: string) => {
      const payload: PlaylistAddCommand = { roomId, url };
      socket.emit("playlist:add", payload);
    },
    removePlaylistItem: (playlistItemId: string) => {
      socket.emit("playlist:remove", { roomId, playlistItemId });
    },
    advancePlaylist: () => {
      const payload: PlaybackCommand = { roomId, issuedAt: Date.now() };
      socket.emit("playlist:advance", payload);
    }
  };
}
