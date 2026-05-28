# Deploy on Hostinger (chatty.vickeybuilds.com)

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

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |

## After changing settings

1. **Settings and redeploy**
2. If the site shows 403, click **Restart** on the Node.js dashboard

## Troubleshooting

### Build failed

- Use Node **20.x** (not 22.x if builds keep failing)
- Install must be `npm install` (do not use `--omit=dev`)
- Build logs should show `vite build` and `Copied client/dist → public/`
- If you only see ~13 packages installed, redeploy after the latest `main` commit (`prebuild` fix)

### 403 Forbidden

- Entry file must be `index.js`
- Output directory must be `public`
- Add `NODE_ENV=production` in environment variables
- Check **Runtime logs** for `ChitChat server (app + API)`

### Runtime logs

Open **Runtime logs** in hPanel. A healthy start looks like:

```
ChitChat server (app + API) → http://0.0.0.0:XXXX
```
