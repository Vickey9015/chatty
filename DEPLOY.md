# Deploy LockyChat to your server

Live site: [lockychat.com](https://lockychat.com)

## Hostinger Node.js

See **[HOSTINGER.md](./HOSTINGER.md)** for hPanel build/start settings.

Quick: Install `npm install` → Build `npm run build` → Start `npm start` → Entry `server/index.js`

## One-command VPS setup (Ubuntu)

SSH into your server, then:

```bash
git clone https://github.com/Vickey9015/chatty.git lockychat
cd lockychat
chmod +x deploy/setup-vps.sh
bash deploy/setup-vps.sh
```

With a custom domain (installs nginx):

```bash
DOMAIN=lockychat.com bash deploy/setup-vps.sh
sudo certbot --nginx -d lockychat.com -d www.lockychat.com
```

## Manual steps

```bash
git clone https://github.com/Vickey9015/chatty.git lockychat
cd lockychat
npm run install:all
npm run build
npm run deploy          # starts with PM2
pm2 save
pm2 startup             # follow the printed command
```

Open **http://YOUR_SERVER_IP:3001** or [lockychat.com](https://lockychat.com) after nginx + SSL.

## Docker

```bash
docker build -t lockychat .
docker run -d -p 3001:3001 -v lockychat-uploads:/app/server/uploads --name lockychat lockychat
```

## Useful commands

| Command | Action |
|---------|--------|
| `pm2 status` | Check if app is running |
| `pm2 logs lockychat` | View logs |
| `pm2 restart lockychat` | Restart after `git pull` |
| `npm run deploy` | Rebuild + restart |

## After `git pull` on server

```bash
cd ~/lockychat
git pull
npm run deploy
```

## HTTPS (required for video calls)

Use nginx + Let's Encrypt — see `deploy/nginx-lockychat.conf`.

## Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
# If not using nginx: sudo ufw allow 3001
sudo ufw enable
```
