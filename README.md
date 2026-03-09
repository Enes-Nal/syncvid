# SyncWeb

SyncWeb is a production-oriented watch-party platform modeled after SyncTube, but built around a universal embed pipeline so rooms can synchronize videos from multiple providers instead of only YouTube.

## Architecture

The codebase is a small monorepo:

- `apps/web`: React + Vite frontend for room UI, player shell, chat, playlist, and user presence
- `apps/server`: Express + Socket.IO synchronization server with authoritative room state
- `packages/shared`: shared event contracts and room state types

### Core runtime flow

1. A user joins `/room/:roomId`.
2. The frontend opens a WebSocket connection and requests the current room snapshot.
3. The server creates the room on demand, assigns the first user as host, and returns the authoritative state.
4. Host playback commands update the server state first.
5. The server broadcasts playback, playlist, and chat updates to the room.
6. Clients compare local playback time with the authoritative room time and self-correct when drift exceeds `300ms`.

### Synchronization model

- The server is authoritative for `play`, `pause`, `seek`, and playlist advancement.
- Playback state stores:
  - `status`
  - `positionSeconds`
  - `playbackRate`
  - `videoStartedAt`
- Clients resolve current target position from the last authoritative seek/play event plus elapsed wall-clock time.
- Every client sends periodic drift reports.
- If reported time diverges beyond threshold, the server rebroadcasts playback state and the client seeks to target.

### Universal embed strategy

`apps/server/src/embed.ts` and `apps/web/src/lib/embed.ts` normalize external URLs into `EmbedDescriptor`.

Supported provider transforms:

- YouTube -> `youtube.com/embed/...`
- Vimeo -> `player.vimeo.com/video/...`
- Dailymotion -> `dailymotion.com/embed/video/...`
- Twitch -> `player.twitch.tv/...`
- Direct file URLs -> HTML5 video source
- Any other embeddable URL -> generic iframe fallback

Important constraint:
Generic iframe embeds cannot be synchronized with frame-accurate control unless the remote provider exposes a postMessage or SDK API. The adapter boundary in the frontend is designed so provider-specific adapters can be added without changing room or socket logic.

### Scaling path

The current implementation uses in-memory room storage for fast local development.

For horizontal scaling:

- move room state and playlist persistence into Redis/PostgreSQL
- use Redis pub/sub or the Socket.IO Redis adapter
- keep backend nodes stateless
- persist chat backlog and room metadata with TTL-based cleanup jobs
- add provider metadata fetchers and background enrichment for titles/durations

## Folder structure

```text
.
├─ apps
│  ├─ server
│  │  └─ src
│  │     ├─ embed.ts
│  │     ├─ index.ts
│  │     ├─ room-manager.ts
│  │     └─ validation.ts
│  └─ web
│     └─ src
│        ├─ components
│        ├─ hooks
│        ├─ lib
│        ├─ pages
│        └─ players
└─ packages
   └─ shared
      └─ src
```

## Security notes

- room payloads and playback commands are schema-validated with `zod`
- the server enforces host-only controls for seek, pause/play, kick, and playlist removal
- URLs are parsed through `URL` before conversion to embed descriptors
- generic iframe rendering is sandboxed
- chat is rate-limited per connection

## Local development

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

## Docker

```bash
docker compose up --build
```

## Next production steps

- add Redis adapter and durable room store
- add provider-specific adapters for YouTube/Vimeo/Twitch postMessage control
- persist playlist/chat history
- add auth, moderation audit logs, and metrics
- add end-to-end sync tests with Playwright
