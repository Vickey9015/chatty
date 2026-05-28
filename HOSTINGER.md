# Deploy on Hostinger (chatty.vickeybuilds.com)

## hPanel build settings

| Setting | Value |
|---------|--------|
| **Framework** | **Express.js** (preferred) or Other |
| **Root directory** | `./` |
| **Node.js version** | 20.x |
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Entry file** | `index.js` |
| **Output directory** | `public` |

## Environment variables

Add in hPanel → **Environment variables**:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |

(`PORT` is set automatically by Hostinger — do not override.)

## Fix 403 Forbidden

A **403** usually means the domain is serving an empty/static folder instead of your Node app.

1. **Redeploy** after the latest commit (root `index.js` + `public/` folder).
2. Set **Entry file** to `index.js` (not `server/index.js`).
3. Set **Output directory** to `public` (build copies the React app there).
4. Set **Framework** to **Express.js** if available.
5. Click **Restart** on the Node.js dashboard (next to “Running”).
6. Check **Runtime logs** — you should see: `ChitChat server (app + API)`.

If it still fails, open **Runtime logs** and look for errors, then share the last 20 lines.

## Redeploy

Deployments → **Redeploy** (or push to `main` for auto-deploy).
