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
| `DB_HOST` | `127.0.0.1` | Use **`127.0.0.1`** (not `localhost`) — Node resolves `localhost` to IPv6 `::1`, which often causes `ER_ACCESS_DENIED_ERROR` on Hostinger. The app also auto-maps `localhost` → `127.0.0.1`. If connection still fails, try the remote host from **Databases → MySQL** (e.g. `srv1234.hstgr.io`). |
| `DB_PORT` | `3306` | Default MySQL port on Hostinger |
| `DB_USER` | `u123456789_lockychat_db` | **Full** MySQL username from hPanel → Databases (always starts with `u` + account id). Do not use a short name. |
| `DB_PASSWORD` | `your@password` | MySQL password from hPanel — **no extra quotes** unless hPanel truncates at `@`. See password troubleshooting below. |
| `DB_NAME` | `u123456789_lockychat_db` | **Full** database name from hPanel → Databases (often the same string as `DB_USER`). |

After all variables are saved: **Redeploy** (or **Restart**), then check **Runtime logs** for `LockyChat server (app + API)`.

### MySQL on Hostinger

1. In **hPanel → Databases → MySQL Databases**, create a database and user (or use an existing pair).
2. Note the **database name**, **username**, **password**, and (if shown) **MySQL hostname**.
3. For `DB_HOST`, use **`127.0.0.1`** (recommended) or `localhost` (the app maps `localhost` → `127.0.0.1`). If unlock still fails, try the remote hostname from hPanel (e.g. `srv1234.hstgr.io`) and redeploy.
4. Add all five `DB_*` variables to the Node.js app environment variables in hPanel — **not** a `.env` file on the server. Do **not** commit real passwords to git.
5. On first start, LockyChat creates the `locks` table automatically. It does **not** run `CREATE DATABASE` when `DB_NAME` is your Hostinger database (only the local default `lockychat_db` is auto-created for dev).

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

**Quick health check (after deploy):** visit `https://lockychat.com/health`. You should see JSON with `"ok": true`, `"ready": true`, and `"db": "ready"`. If `"db": "failed"`, see the next section.

### "Database is temporarily unavailable. Try again shortly."

This message appears when the app is running but MySQL never connected (unlock needs the `locks` table). The server no longer crashes on DB failure — fix credentials and redeploy.

#### `/health` shows correct `database` but `"db": "failed"`

If `GET /health` returns the correct `"database": "u123456789_lockychat_db"` but `"ready": false` and `"db": "failed"`, **`DB_NAME` is being read** — the failure is almost always one of:

| Cause | Typical `mysqlCode` in `/health` | Fix |
|-------|-------------------------------|-----|
| Wrong or truncated password | `ER_ACCESS_DENIED_ERROR` (errno 1045) | See password section below |
| Wrong MySQL hostname | `ECONNREFUSED` | Fix `DB_HOST` (see hostname section) |
| User not linked to database | `ER_ACCESS_DENIED_ERROR` or `ER_DBACCESS_DENIED_ERROR` | hPanel → Databases → assign user to DB with All privileges |
| Wrong `DB_USER` | `ER_ACCESS_DENIED_ERROR` | Use full `u…_…` username from hPanel, not a short name |

Use `/health` fields (no password exposed): `mysqlCode`, `mysqlMessage`, `mysqlErrno`, `dbHost`, `dbUser`, `attempts`.

#### MySQL hostname (`DB_HOST`)

1. Open **hPanel → Websites → Databases → MySQL Databases**.
2. Find your database — the **hostname** may be listed as `localhost` or a remote host like `srv1234.hstgr.io`.
3. For **Node.js on the same Hostinger server**, use `DB_HOST=127.0.0.1` and `DB_PORT=3306`.
4. If `/health` shows `mysqlMessage` with **`@'::1'`** — Node connected via IPv6; set `DB_HOST=127.0.0.1` in hPanel and redeploy (the app also auto-maps `localhost` → `127.0.0.1`).
5. If `/health` shows `mysqlCode: "ECONNREFUSED"`, change `DB_HOST` to the remote hostname from hPanel and **Redeploy**.

#### Password with `@` or special characters

hPanel env parsing is inconsistent. Try in this order:

1. **Plain value, no quotes:** `DB_PASSWORD=your@password` (LockyChat strips accidental surrounding quotes on deploy).
2. If unlock still fails with `ER_ACCESS_DENIED_ERROR`, hPanel may have truncated at `@` — try wrapping: `"your@password"` (quotes only if plain value fails).
3. **Definitive test:** in hPanel → Databases, **change the MySQL password** to one **without** `@`, `#`, `$`, or spaces, update `DB_PASSWORD`, **Redeploy**, and retry `/health`.
4. **phpMyAdmin:** open **Databases → phpMyAdmin**, log in with the same `DB_USER` and password. If phpMyAdmin fails, the Node app will fail too — reset password in hPanel and update env vars.

#### Checklist (in order)

1. **All five `DB_*` vars in hPanel** — not a `.env` file on the server:
   - `DB_HOST` — `127.0.0.1` (or remote hostname if `ECONNREFUSED`)
   - `DB_PORT=3306`
   - `DB_USER` — full name, e.g. `u123456789_lockychat_db`
   - `DB_PASSWORD` — exact password (see above)
   - `DB_NAME` — full name, e.g. `u123456789_lockychat_db` (must match the database, not `lockychat_db`)
2. **phpMyAdmin** — same username/password must work before the app will connect.
3. **User assigned to database** — in **Databases → MySQL**, confirm the user has **All privileges** on that database.
4. **Runtime logs** — after redeploy, look for:
   - `MySQL connect attempt 1/5 → u…@localhost:3306/u…_lockychat_db`
   - `Database connection failed (attempt N/5): ER_ACCESS_DENIED_ERROR errno=1045 — …` → wrong user/password
   - `Database connection failed … ECONNREFUSED errno=…` → wrong `DB_HOST`
   - `Database connection failed … ER_BAD_DB_ERROR` → wrong `DB_NAME`
   - `MySQL ready → u…_lockychat_db` → fixed
5. **`/health`** — visit `https://lockychat.com/health`:
   - `"ready": true`, `"db": "ready"` → fixed
   - `"db": "failed"` → read `mysqlCode`, `mysqlMessage`, `dbHost`, `dbUser`, `attempts`
6. **Redeploy** after **any** env var change — save variables, then **Redeploy** (Restart alone may not reload env).

### Video calls / ring not working

1. **Redeploy latest `main`** — production uses Socket.io **HTTP polling** (Hostinger LiteSpeed often breaks WebSocket upgrade). Console may still show old WebSocket warnings until redeployed.
2. **Same lock & key** — both users must unlock the same lock with the matching key.
3. **HTTPS** — camera/mic require `https://lockychat.com` (not HTTP).
4. **Ring sound** — tap anywhere on the page once after load (browser autoplay rule). Outgoing ring works after you tap Call; incoming ring works if you already interacted with the page.
5. **Video across mobile networks** — if both users see only their own camera, add a **TURN server** (`VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` at build time). STUN alone is not enough on strict NAT/carrier networks.

### `/api/lock/unlock` returns 400

- **Lock** must be 2–32 characters: letters, numbers, hyphens, underscores (spaces become hyphens).
- **Key** must be 4–64 characters.
- Wrong key on an existing lock returns **401**, not 400.


Open **Runtime logs** in hPanel. A healthy start looks like:

```
LockyChat server (app + API) → http://0.0.0.0:XXXX
MySQL connect attempt 1/5 → u123456789_lockychat_db@localhost:3306/u123456789_lockychat_db
MySQL ready → u123456789_lockychat_db
```

If MySQL fails, you will also see lines like:

```
Database connection failed (attempt 5/5): ER_ACCESS_DENIED_ERROR errno=1045 Access denied for user 'u…'@'localhost'
Database unavailable — server is running but unlock/chat persistence will fail until DB connects.
Last MySQL error: ER_ACCESS_DENIED_ERROR Access denied for user 'u…'@'localhost'
```
