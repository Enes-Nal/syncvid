export type PlaybackStatus = "playing" | "paused";

export type VideoSource =
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "twitch"
  | "direct"
  | "generic";

export interface EmbedDescriptor {
  source: VideoSource;
  embedUrl: string;
  originalUrl: string;
  title?: string;
  duration?: number | null;
  requiresParent?: boolean;
}

export interface PlaylistItem {
  id: string;
  url: string;
  title: string;
  duration: number | null;
  addedBy: string;
  embed: EmbedDescriptor;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface RoomUser {
  id: string;
  username: string;
  avatarUrl: string;
  isHost: boolean;
  joinedAt: number;
  lastDriftReportAt: number | null;
}

export interface PlaybackState {
  status: PlaybackStatus;
  positionSeconds: number;
  playbackRate: number;
  videoStartedAt: number | null;
  updatedAt: number;
}

export interface RoomSnapshot {
  roomId: string;
  roomName: string;
  hostUserId: string | null;
  currentItem: PlaylistItem | null;
  playback: PlaybackState;
  playlist: PlaylistItem[];
  users: RoomUser[];
  chat: ChatMessage[];
}

export interface JoinRoomPayload {
  roomId: string;
  username: string;
  avatarSeed: string;
}

export interface PlaybackCommand {
  roomId: string;
  issuedAt: number;
}

export interface PlayCommand extends PlaybackCommand {
  positionSeconds: number;
  playbackRate?: number;
}

export interface PauseCommand extends PlaybackCommand {
  positionSeconds: number;
}

export interface SeekCommand extends PlaybackCommand {
  positionSeconds: number;
}

export interface DriftReport {
  roomId: string;
  positionSeconds: number;
  reportedAt: number;
}

export interface PlaylistAddCommand {
  roomId: string;
  url: string;
}

export interface PlaylistRemoveCommand {
  roomId: string;
  playlistItemId: string;
}

export interface ChatCommand {
  roomId: string;
  message: string;
}

export interface KickCommand {
  roomId: string;
  userId: string;
}

export interface ServerToClientEvents {
  "room:snapshot": (snapshot: RoomSnapshot) => void;
  "room:user-joined": (user: RoomUser) => void;
  "room:user-left": (userId: string) => void;
  "playback:updated": (playback: PlaybackState) => void;
  "playlist:updated": (items: PlaylistItem[], currentItem: PlaylistItem | null) => void;
  "chat:message": (message: ChatMessage) => void;
  "room:kicked": (reason: string) => void;
  "room:error": (message: string) => void;
}

export interface ClientToServerEvents {
  "room:join": (payload: JoinRoomPayload) => void;
  "playback:play": (payload: PlayCommand) => void;
  "playback:pause": (payload: PauseCommand) => void;
  "playback:seek": (payload: SeekCommand) => void;
  "playback:drift": (payload: DriftReport) => void;
  "playlist:add": (payload: PlaylistAddCommand) => void;
  "playlist:remove": (payload: PlaylistRemoveCommand) => void;
  "playlist:advance": (payload: PlaybackCommand) => void;
  "chat:send": (payload: ChatCommand) => void;
  "room:kick": (payload: KickCommand) => void;
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const PROFANITY_PATTERNS = [
  /f+u+c*k+/i,
  /s+h+i+t+/i,
  /b+i+t+c+h+/i,
  /c+u+n+t+/i,
  /n+i+g+g+(?:e+r|a)/i,
  /f+a+g+(?:g+o*t*)?/i,
  /s+l+u+t+/i,
  /w+h+o+r+e+/i,
  /r+a+p+e+/i
] as const;
const KOKONUT_AVATAR_PREFIX = "kokonut-avatar-";

const USER_ADJECTIVES = [
  "Neon",
  "Solar",
  "Ghost",
  "Turbo",
  "Nova",
  "Frost",
  "Pixel",
  "Velvet",
  "Hyper",
  "Echo",
  "Chrome",
  "Midnight"
] as const;

const USER_NOUNS = [
  "Rider",
  "Viper",
  "Comet",
  "Drifter",
  "Falcon",
  "Phantom",
  "Blaze",
  "Voyager",
  "Maverick",
  "Rogue",
  "Glider",
  "Circuit"
] as const;

const ROOM_ADJECTIVES = [
  "Neon",
  "Velvet",
  "Secret",
  "Electric",
  "Silver",
  "Midnight",
  "Golden",
  "Cosmic",
  "Dream",
  "Static",
  "Retro",
  "Crystal"
] as const;

const ROOM_NOUNS = [
  "Lounge",
  "Hideout",
  "Cinema",
  "Club",
  "Den",
  "Arcade",
  "Studio",
  "Harbor",
  "Parlor",
  "Loft",
  "Vault",
  "Deck"
] as const;

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickPair(seed: string, adjectives: readonly string[], nouns: readonly string[]) {
  const hash = hashString(seed);
  return {
    adjective: adjectives[hash % adjectives.length],
    noun: nouns[Math.floor(hash / adjectives.length) % nouns.length],
    hash
  };
}

export function isPlaceholderUsername(username: string) {
  return /^user-\d+$/i.test(username.trim());
}

export function normalizeUsername(username: string) {
  return username.trim().replace(/\s+/g, " ");
}

function getUsernameProfanityKey(username: string) {
  return normalizeUsername(username).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getUsernameValidationError(username: string) {
  const normalized = normalizeUsername(username);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`;
  }

  if (isPlaceholderUsername(normalized)) {
    return "Username is not allowed";
  }

  const profanityKey = getUsernameProfanityKey(normalized);
  if (PROFANITY_PATTERNS.some((pattern) => pattern.test(profanityKey))) {
    return "Username contains blocked language";
  }

  return null;
}

export function isUsernameAllowed(username: string) {
  return getUsernameValidationError(username) === null;
}

export function generateNickname(seed: string) {
  const { adjective, noun, hash } = pickPair(seed, USER_ADJECTIVES, USER_NOUNS);
  const suffix = ((Math.floor(hash / 97) % 90) + 10).toString();
  return `${adjective}${noun}${suffix}`;
}

function getKokonutAvatarSvg(avatarId: number) {
  switch (avatarId) {
    case 1:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" role="img" aria-label="Avatar 1"><rect width="36" height="36" rx="18" fill="#ff005b"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18)" fill="#ffb238"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" stroke="#000" stroke-linecap="round"/><rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000"/><rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000"/></g></svg>`;
    case 2:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" role="img" aria-label="Avatar 2"><rect width="36" height="36" rx="18" fill="#ff7d10"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" fill="#0a0310"/><g transform="translate(7 -6) rotate(-5 18 18)"><path d="M15 20c2 1 4 1 6 0" stroke="#fff" stroke-linecap="round"/><rect x="14" y="14" width="1.5" height="2" rx="1" fill="#fff"/><rect x="20" y="14" width="1.5" height="2" rx="1" fill="#fff"/></g></svg>`;
    case 3:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" role="img" aria-label="Avatar 3"><rect width="36" height="36" rx="18" fill="#0a0310"/><rect x="0" y="0" width="36" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" fill="#ff005b"/><g transform="translate(-3 3.5) rotate(7 18 18)"><path d="M13 21a1 0.75 0 0 0 10 0" fill="#fff"/><rect x="12" y="14" width="1.5" height="2" rx="1" fill="#fff"/><rect x="22" y="14" width="1.5" height="2" rx="1" fill="#fff"/></g></svg>`;
    case 4:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" role="img" aria-label="Avatar 4"><rect width="36" height="36" rx="18" fill="#d8fcb3"/><rect x="0" y="0" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18)" fill="#89fcb3"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" stroke="#000" stroke-linecap="round"/><rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000"/><rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000"/></g></svg>`;
    default:
      return null;
  }
}

function getKokonutAvatarId(seed: string) {
  if (!seed.startsWith(KOKONUT_AVATAR_PREFIX)) {
    return null;
  }

  const avatarId = Number.parseInt(seed.slice(KOKONUT_AVATAR_PREFIX.length), 10);
  return Number.isInteger(avatarId) ? avatarId : null;
}

export function generateAvatarUrl(seed: string) {
  const kokonutAvatarId = getKokonutAvatarId(seed);
  const kokonutAvatarSvg = kokonutAvatarId ? getKokonutAvatarSvg(kokonutAvatarId) : null;
  if (kokonutAvatarSvg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(kokonutAvatarSvg)}`;
  }

  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodedSeed}&backgroundType=gradientLinear`;
}

export function generateRoomName(roomId: string) {
  const { adjective, noun } = pickPair(roomId, ROOM_ADJECTIVES, ROOM_NOUNS);
  return `${adjective} ${noun}`;
}

export function generateRoomId(seed: string) {
  const roomName = generateRoomName(seed).toLowerCase().replace(/\s+/g, "-");
  const suffix = hashString(`room:${seed}`).toString(36).slice(0, 4);
  return `${roomName}-${suffix}`;
}

const PLAYLIST_TITLE_FALLBACK = "Untitled video";

function formatHostname(hostname: string) {
  const clean = hostname.replace(/^www\./i, "").trim();
  return clean || "this site";
}

function formatPathSegment(segment: string) {
  const cleaned = segment
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveTitleFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const meaningfulSegment = url.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .map(formatPathSegment)
      .find(Boolean);

    if (meaningfulSegment) {
      return meaningfulSegment;
    }

    return `Video from ${formatHostname(url.hostname)}`;
  } catch {
    return null;
  }
}

export function resolveVideoTitle(title: string | null | undefined, url: string) {
  const normalizedTitle = title?.trim();
  if (normalizedTitle && normalizedTitle.toLowerCase() !== PLAYLIST_TITLE_FALLBACK.toLowerCase()) {
    return normalizedTitle;
  }

  return deriveTitleFromUrl(url) ?? PLAYLIST_TITLE_FALLBACK;
}
