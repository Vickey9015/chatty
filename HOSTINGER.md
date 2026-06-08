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

## Environment variables

Set these in **hPanel → Node.js app → Environment variables** (same names as in `.env.example`):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (or the port Hostinger assigns) |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | Your MySQL user from hPanel (e.g. `u123456789_lockychat_db`) |
| `DB_PASSWORD` | Your MySQL password from hPanel |
| `DB_NAME` | Your MySQL database name from hPanel (e.g. `u123456789_lockychat_db`) |

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

### Runtime logs

Open **Runtime logs** in hPanel. A healthy start looks like:

```
LockyChat server (app + API) → http://0.0.0.0:XXXX
```
