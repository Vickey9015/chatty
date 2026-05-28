# ChitChat

Real-time chat built with React, Socket.io, and WebRTC. Share photos and videos in chat, and start peer-to-peer video calls with anyone in the same room.

## Features

- **Real-time messaging** — instant messages via WebSockets (Socket.io)
- **Photos & videos** — attach images or videos (up to 50MB) in the chat
- **Video calls** — 1:1 WebRTC video calls with mute and camera toggle
- **Rooms** — join any room by name; everyone in the same room sees the same chat

## Quick start

```bash
# Install dependencies (root, server, and client)
npm run install:all

# Run server + client together
npm run dev
```

- **App:** http://localhost:5173  
- **API / WebSocket:** http://localhost:3001  

Open two browser tabs (or two devices on the same network), use the same room name, and chat or call each other.

### Port already in use?

If you see `EADDRINUSE` on port 3001 or 5173, a previous dev server is still running. `npm run dev` tries to free those ports automatically. You can also run manually:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN -t | xargs kill -9
lsof -nP -iTCP:5173 -sTCP:LISTEN -t | xargs kill -9
```

## Project structure

```
chitchat/
├── client/          # React + Vite frontend
├── server/          # Express + Socket.io + file uploads
└── package.json     # Root scripts (concurrently)
```

## How it works

| Feature        | Technology                          |
|----------------|-------------------------------------|
| Chat           | Socket.io rooms                     |
| Media uploads  | Express + Multer → `/uploads`       |
| Video calls    | WebRTC + Socket.io signaling        |

Video calls use Google’s public STUN server. For production behind strict NATs, add a TURN server.

## Scripts

| Command            | Description                    |
|--------------------|--------------------------------|
| `npm run dev`      | Start server and client        |
| `npm run build`    | Build client for production    |
| `npm start`        | Run server only                |

## Hosting (production)

You need **both** a build and the **server running**. The build alone is not enough — chat, uploads, and video signaling all go through the Node server.

### Option A — Single server (simplest)

One machine serves the React app and the API/WebSocket on the same port:

```bash
npm run install:all    # once
npm run prod           # builds client, then starts server on port 3001
```

Open **http://localhost:3001** (or your server’s public URL).

Or step by step:

```bash
npm run build          # creates client/dist
npm run start          # serves app + API (set PORT if needed)
```

### Option B — Separate frontend host (Vercel/Netlify + VPS)

1. Deploy the **server** somewhere (Railway, Render, Fly.io, VPS) and set `PORT`.
2. Build the client with your API URL, e.g. `VITE_SERVER_URL=https://api.example.com npm run build --prefix client`.
3. Point the static host at `client/dist`.

For Option B you must set `CLIENT_URL` on the server to your frontend origin(s).

### Checklist before going live

| Requirement | Why |
|-------------|-----|
| **HTTPS** | Browsers require HTTPS for camera/mic (except localhost) |
| **Server always on** | Socket.io + uploads live on Node, not in static files |
| **`uploads/` folder** | Persist media on disk (or swap to S3 later) |
| **TURN server** (optional) | Helps video calls across strict networks/NAT |

### Example: VPS with HTTPS (nginx)

```bash
# On the server
git clone <your-repo> && cd chitchat
npm run install:all
npm run prod
```

Use nginx/Caddy as reverse proxy with SSL → `http://127.0.0.1:3001`.

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | — | Set to `production` when hosting |
| `CLIENT_URL` | localhost dev URLs | Allowed CORS origins (comma-separated) |
