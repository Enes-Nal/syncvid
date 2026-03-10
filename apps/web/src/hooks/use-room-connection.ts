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

function didCurrentItemChange(previous: PlaylistItem | null, next: PlaylistItem | null) {
  return previous?.id !== next?.id;
}

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
  const currentItemRef = useRef<PlaylistItem | null>(null);
  const playbackRef = useRef<PlaybackState>(EMPTY_PLAYBACK);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    if (!socket) {
      setError("Missing VITE_SERVER_URL. Deploy the sync server and point the web app to it.");
      return;
    }

    const activeSocket = socket;

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
      const shouldResetPlayback = didCurrentItemChange(currentItemRef.current, nextCurrentItem);
      setPlaylist(items);
      setCurrentItem((prev) => reconcileCurrentItem(prev, nextCurrentItem));
      if (shouldResetPlayback) {
        setPlayback(EMPTY_PLAYBACK);
      }
      setSnapshot((prev) => {
        if (prev) {
          return {
            ...prev,
            playback: shouldResetPlayback ? EMPTY_PLAYBACK : prev.playback,
            playlist: items,
            currentItem: reconcileCurrentItem(prev.currentItem, nextCurrentItem)
          };
        }

        return {
          roomId,
          roomName: generateRoomName(roomId),
          hostUserId: null,
          currentItem: nextCurrentItem,
          playback: shouldResetPlayback ? EMPTY_PLAYBACK : playbackRef.current,
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
      activeSocket.emit("room:join", payload);
    };
    const onConnectError = (cause: Error) => {
      setError(cause.message || "Could not connect to the sync server.");
    };
    const onDisconnect = (reason: string) => {
      if (reason !== "io client disconnect") {
        setError("Disconnected from the sync server.");
      }
    };

    activeSocket.on("room:snapshot", onSnapshot);
    activeSocket.on("playback:updated", onPlaybackUpdated);
    activeSocket.on("playlist:updated", onPlaylistUpdated);
    activeSocket.on("room:user-joined", onUserJoined);
    activeSocket.on("room:user-left", onUserLeft);
    activeSocket.on("room:error", setError);
    activeSocket.on("room:kicked", setError);
    activeSocket.on("connect", joinRoom);
    activeSocket.on("connect_error", onConnectError);
    activeSocket.on("disconnect", onDisconnect);

    if (activeSocket.connected) {
      joinRoom();
    } else {
      activeSocket.connect();
    }

    return () => {
      activeSocket.off("room:snapshot", onSnapshot);
      activeSocket.off("playback:updated", onPlaybackUpdated);
      activeSocket.off("playlist:updated", onPlaylistUpdated);
      activeSocket.off("room:user-joined", onUserJoined);
      activeSocket.off("room:user-left", onUserLeft);
      activeSocket.off("room:error");
      activeSocket.off("room:kicked");
      activeSocket.off("connect", joinRoom);
      activeSocket.off("connect_error", onConnectError);
      activeSocket.off("disconnect", onDisconnect);
      activeSocket.disconnect();
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
      if (!socket) {
        return;
      }
      const payload: PlayCommand = { roomId, positionSeconds, playbackRate, issuedAt: Date.now() };
      socket.emit("playback:play", payload);
    },
    sendPause: (positionSeconds: number) => {
      if (!socket) {
        return;
      }
      const payload: PauseCommand = { roomId, positionSeconds, issuedAt: Date.now() };
      socket.emit("playback:pause", payload);
    },
    sendSeek: (positionSeconds: number) => {
      if (!socket) {
        return;
      }
      const payload: SeekCommand = { roomId, positionSeconds, issuedAt: Date.now() };
      socket.emit("playback:seek", payload);
    },
    reportDrift: (positionSeconds: number) => {
      if (!socket) {
        return;
      }
      const payload: DriftReport = { roomId, positionSeconds, reportedAt: Date.now() };
      socket.emit("playback:drift", payload);
    },
    addPlaylistItem: (url: string) => {
      if (!socket) {
        return;
      }
      const payload: PlaylistAddCommand = { roomId, url };
      socket.emit("playlist:add", payload);
    },
    removePlaylistItem: (playlistItemId: string) => {
      if (!socket) {
        return;
      }
      socket.emit("playlist:remove", { roomId, playlistItemId });
    },
    advancePlaylist: () => {
      if (!socket) {
        return;
      }
      const payload: PlaybackCommand = { roomId, issuedAt: Date.now() };
      socket.emit("playlist:advance", payload);
    }
  };
}
