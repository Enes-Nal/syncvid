import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  generateNickname,
  generateRoomId,
  generateRoomName,
  getUsernameValidationError,
  isPlaceholderUsername,
  normalizeUsername
} from "@syncweb/shared";
import { ProfileMenu } from "../components/profile-menu";
import { DEFAULT_PROFILE_AVATAR_SEED, PROFILE_AVATAR_OPTIONS } from "../lib/profile-avatars";
import type { UnifiedPlayerAdapter } from "../players/types";
import { PlayerContainer } from "../components/player-container";
import { PlaylistPanel } from "../components/playlist-panel";
import { RoomSidebar } from "../components/room-sidebar";
import { usePlayerSync } from "../hooks/use-player-sync";
import { useRoomConnection } from "../hooks/use-room-connection";

interface StoredProfile {
  username: string;
  avatarSeed: string;
}

const PROFILE_STORAGE_KEY = "syncweb.profile";
const LEGACY_USERNAME_KEY = "syncweb.username";
const LEGACY_USER_SEED_KEY = "syncweb.user-seed";

function readStoredProfile(): StoredProfile | null {
  const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!rawProfile) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawProfile) as Partial<StoredProfile>;
    if (
      typeof parsed.username === "string" &&
      getUsernameValidationError(parsed.username) === null &&
      typeof parsed.avatarSeed === "string" &&
      parsed.avatarSeed.trim().length > 0
    ) {
      const legacyAvatarId =
        typeof (parsed as { avatarId?: unknown }).avatarId === "number" && Number.isInteger((parsed as { avatarId?: number }).avatarId)
          ? (parsed as { avatarId: number }).avatarId
          : null;
      const migratedAvatarSeed =
        parsed.avatarSeed.trim().startsWith("kokonut-avatar-") && legacyAvatarId
          ? PROFILE_AVATAR_OPTIONS[(legacyAvatarId - 1 + PROFILE_AVATAR_OPTIONS.length) % PROFILE_AVATAR_OPTIONS.length]?.seed
          : parsed.avatarSeed.trim();

      return {
        username: normalizeUsername(parsed.username),
        avatarSeed: migratedAvatarSeed || DEFAULT_PROFILE_AVATAR_SEED
      };
    }
  } catch {
    return null;
  }

  return null;
}

function createStoredProfile(): StoredProfile {
  const legacySeed = localStorage.getItem(LEGACY_USER_SEED_KEY)?.trim();
  const usernameSeed = legacySeed || crypto.randomUUID();
  const avatarSeed = legacySeed && !legacySeed.startsWith("kokonut-avatar-") ? legacySeed : DEFAULT_PROFILE_AVATAR_SEED;
  const legacyUsername = localStorage.getItem(LEGACY_USERNAME_KEY)?.trim();
  const username =
    legacyUsername && !isPlaceholderUsername(legacyUsername) && getUsernameValidationError(legacyUsername) === null
      ? normalizeUsername(legacyUsername)
      : generateNickname(usernameSeed);

  return { username, avatarSeed };
}

function getStoredProfile() {
  const profile = readStoredProfile() ?? createStoredProfile();
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  localStorage.setItem(LEGACY_USERNAME_KEY, profile.username);
  return profile;
}

export function RoomPage() {
  const { roomId = generateRoomId("fallback-room") } = useParams();
  const [profile, setProfile] = useState(getStoredProfile);
  const [adapter, setAdapter] = useState<UnifiedPlayerAdapter | null>(null);
  const connection = useRoomConnection({ roomId, username: profile.username, avatarSeed: profile.avatarSeed });
  const roomName = connection.snapshot?.roomName ?? generateRoomName(roomId);
  const isHost = useMemo(
    () => connection.users.some((user) => user.username === profile.username && user.isHost),
    [connection.users, profile.username]
  );

  usePlayerSync({
    adapter,
    canControl: isHost,
    playback: connection.playback,
    onDriftReport: connection.reportDrift,
    onLocalPlay: connection.sendPlay,
    onLocalPause: connection.sendPause,
    onLocalSeek: connection.sendSeek,
    onEnded: isHost ? connection.advancePlaylist : undefined
  });

  useEffect(() => {
    document.title = `${roomName} · SyncWeb`;
  }, [roomName]);

  const currentEmbed = connection.currentItem?.embed ?? null;

  return (
    <main className="layout">
      <header className="room-topbar">
        <div className="room-topbar-copy">
          <span className="room-topbar-label">Room</span>
          <strong>{roomName}</strong>
        </div>
        <ProfileMenu
          avatarSeed={profile.avatarSeed}
          username={profile.username}
          onSave={({ username, avatarSeed }) => {
            const nextProfile: StoredProfile = {
              username,
              avatarSeed
            };
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
            localStorage.setItem(LEGACY_USERNAME_KEY, nextProfile.username);
            localStorage.setItem(LEGACY_USER_SEED_KEY, nextProfile.avatarSeed);
            setProfile(nextProfile);
          }}
        />
      </header>
      <section className="main-grid">
        <div className="sidebar-column sidebar-column-left">
          <RoomSidebar
            snapshot={connection.snapshot}
            roomName={roomName}
            users={connection.users}
            currentUsername={profile.username}
          />
        </div>
        <div className="player-column">
          <PlayerContainer key={connection.currentItem?.id ?? "empty"} embed={currentEmbed} onAdapterReady={setAdapter} />
          {connection.error ? <div className="error-banner">{connection.error}</div> : null}
          {currentEmbed && !["direct", "youtube", "vimeo", "dailymotion", "twitch"].includes(currentEmbed.source) ? (
            <div className="notice-banner">Some sites may not sync exactly.</div>
          ) : null}
        </div>
        <div className="sidebar-column sidebar-column-right">
          <PlaylistPanel
            items={connection.playlist}
            isHost={isHost}
            onAdd={connection.addPlaylistItem}
            onRemove={connection.removePlaylistItem}
            onAdvance={connection.advancePlaylist}
          />
        </div>
      </section>
    </main>
  );
}
