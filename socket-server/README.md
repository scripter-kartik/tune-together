# TuneTogether Socket.IO Server

Standalone Socket.IO server for real-time features (queue sync, playback sync, chat, notifications).

**Problem:** Vercel doesn't run custom Node servers (`server.js`). All real-time features were failing in production because Socket.IO only ran locally.

**Solution:** Deploy this standalone server on a host that supports long-lived processes.

## Deployment Options

### Option A: Render (Easiest)
1. Connect your GitHub repo to [Render](https://render.com)
2. Render will auto-detect `render.yaml` in the repo root
3. Set `MONGODB_URI` in the Render dashboard (Environment → Environment Variables)
4. After deploy, copy the URL (e.g., `https://tune-together-socket.onrender.com`)
5. Add `NEXT_PUBLIC_SOCKET_URL=<your-render-url>` to Vercel env vars
6. Redeploy Vercel

### Option B: Railway
1. Connect repo to [Railway](https://railway.app)
2. Set root directory to `socket-server`
3. Add `MONGODB_URI` env var
4. Deploy → copy URL
5. Add `NEXT_PUBLIC_SOCKET_URL` to Vercel

### Option C: Fly.io
1. `fly launch` (in `socket-server/` dir)
2. `fly secrets set MONGODB_URI=<your-uri>`
3. `fly deploy`
4. Copy URL → add to Vercel env

## Local Development
```bash
cd socket-server
npm install
MONGODB_URI=<your-uri> npm start
```
Runs on port 3001 by default. Not needed for local dev (the main `server.js` already runs Socket.IO on 3000).

## Environment Variables
- `PORT` - Port to listen on (default: 3001)
- `MONGODB_URI` - MongoDB connection string (required)
- `NODE_ENV` - Set to "production" on deployment

## Health Check
`GET /health` returns `{ status: "ok", rooms: N, users: N }`
