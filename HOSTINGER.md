# Deploy on Hostinger (chatty.vickeybuilds.com)

Use these **exact** settings in hPanel → Deployments → Settings:

| Setting | Value |
|---------|--------|
| **Framework** | Other |
| **Root directory** | `./` |
| **Node.js version** | 20.x (or 22.x) |
| **Install command** | `npm install` |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Entry file** | `server/index.js` |
| **Output directory** | *(leave empty)* |

Do **not** set output directory to `client/dist` — the Node server serves the built app.

### Environment variables (optional)

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | *(leave default — Hostinger sets this)* |

### After fixing settings

Click **Redeploy** on the latest commit.

### If build still fails

Check build logs for the first red error line. Common fixes:

1. **Redeploy** after pulling the latest `main` (includes `postinstall` fix).
2. Use Node **20.x** instead of 22.x.
3. Ensure install command is `npm install` (not `npm ci` alone unless lockfiles are synced).
