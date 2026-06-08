# Deploy on Hostinger (lockychat.com)

## hPanel build settings (copy exactly)

| Setting | Value |
|---------|--------|
| **Framework** | Express.js (or Other) |
| **Root directory** | `./` |
| **Node.js version** | **20.x** (recommended) |
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Entry file** | `index.js` |
| **Output directory** | `public` |

## Environment variables (not `.env` file)

**Do not upload or import a `.env` file on Hostinger.** LockyChat reads configuration from process environment variables—the same names as in `.env.example`, but you set them in hPanel.

### Why `.env` is missing after git deploy or import

1. **Git deploy** — `.env` is listed in `.gitignore` and is never pushed to GitHub. Hostinger deploys from your repository, so no `.env` file exists on the server.
2. **File import / FTP** — Files whose names start with a dot (like `.env`) are often hidden in file pickers and FTP clients unless you enable “show hidden files.”
3. **How Hostinger works** — Node.js apps on Hostinger get environment variables from **hPanel**, not from a `.env` file on disk. Use local `.env` only for development on your machine.

### Set variables in hPanel (step by step)

1. Open **hPanel → Websites → Node.js** and select your LockyChat app.
2. Go to **Environment variables** (or **Settings → Environment variables**).
3. Add each variable below. Use the **Name** exactly as shown; **Value** comes from your Hostinger MySQL setup (see next section) or defaults.
4. Save, then **Redeploy** the app (or **Restart** if you only changed env vars and the app is already deployed).

| Name | Example value | Notes |
|------|---------------|--------|
| `NODE_ENV` | `production` | Required for production |
| `PORT` | *(leave unset)* | Hostinger injects `PORT` automatically — do **not** override unless support tells you to |
| `DB_HOST` | `localhost` | Same server as the Node.js app |
| `DB_PORT` | `3306` | Default MySQL port on Hostinger |
| `DB_USER` | `u123456789_lockychat_db` | MySQL username from hPanel → Databases |
| `DB_PASSWORD` | `your_mysql_password_here` | MySQL password from hPanel (never commit this) |
| `DB_NAME` | `u123456789_lockychat_db` | Database name from hPanel → Databases |

After all variables are saved: **Redeploy** (or **Restart**), then check **Runtime logs** for `LockyChat server (app + API)`.

### MySQL on Hostinger

1. In **hPanel → Databases → MySQL Databases**, create a database and user (or use an existing pair).
2. Note the **database name**, **username**, and **password**. On Hostinger Node.js apps on the same server, use `DB_HOST=localhost` and `DB_PORT=3306`.
3. Add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to the Node.js app environment variables. Do **not** commit real passwords to git.
4. On first start, LockyChat creates the `locks` table automatically. It does **not** run `CREATE DATABASE` when `DB_NAME` is your Hostinger database (only the local default `lockychat_db` is auto-created for dev).

**Note:** The build installs client dev tools (Vite, TypeScript) automatically via `--include=dev`. You do not need a separate install command.

## After changing settings

1. **Settings and redeploy**
2. If the site shows 403, click **Restart** on the Node.js dashboard

## Troubleshooting

### Build failed

- Use Node **20.x** (not 22.x if builds keep failing)
- Install must be `npm install` (do not use `--omit=dev`)
- Build logs should show `vite build` and `Copied client/dist → public/`
- Client install must show **~190+ packages**, not 13. If you see only 13, redeploy the latest `main` (`--include=dev` fix)

### 403 Forbidden

- Entry file must be `index.js`
- Output directory must be `public`
- Add `NODE_ENV=production` in environment variables
- Check **Runtime logs** for `LockyChat server (app + API)`

### 503 Service Unavailable

A **503** usually means the Node process is **not listening** on the port Hostinger expects (crashed on startup or never started).

**Checklist (in order):**

1. **Runtime logs** — open **hPanel → Node.js → Runtime logs** after redeploy.
   - **Healthy:** `LockyChat server (app + API) → http://0.0.0.0:XXXX` then `MySQL ready → u…_lockychat_db`
   - **Crash (old behavior):** `Database connection failed:` then the process exits — site shows 503. Redeploy the latest code (server now listens first and retries DB).
   - **Degraded but up:** server line appears, then `Database unavailable` — site loads but unlock fails until MySQL env vars are fixed.
2. **Entry file** — must be `index.js` at the repo root (not `server/index.js`).
3. **Start command** — `npm start` (runs `node index.js`).
4. **Build** — build logs must include `Copied client/dist → public/`. If `public/` is empty, static files are missing (may still get API-only mode, not always 503).
5. **NODE_ENV** — set `production` in hPanel environment variables.
6. **PORT** — do **not** set `PORT` manually unless Hostinger support says so; the platform sets it. The app uses `process.env.PORT`.
7. **MySQL env vars** — all five must be set in hPanel (not a `.env` file on the server):
   - `DB_HOST=localhost`
   - `DB_PORT=3306`
   - `DB_USER=u123456789_lockychat_db` (your `u…` user from **Databases → MySQL**)
   - `DB_PASSWORD=` (password from hPanel — special characters are OK)
   - `DB_NAME=u123456789_lockychat_db` (must match the database name; user and DB name are often the same on Hostinger)
8. **Database exists** — in **hPanel → Databases**, confirm the MySQL database and user exist and the user is assigned to that database.
9. **Redeploy** after changing env vars or code — **Restart** alone may not rebuild `public/`.

**Quick health check (after deploy):** visit `https://lockychat.com/health`. You should see JSON with `"ok": true`, `"ready": true`, and `"db": "ready"`. If `"db": "failed"`, fix MySQL variables above and redeploy.

### Runtime logs

Open **Runtime logs** in hPanel. A healthy start looks like:

```
LockyChat server (app + API) → http://0.0.0.0:XXXX
```
