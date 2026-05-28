# Deploy ChitChat to your server

Repo: [github.com/Vickey9015/chatty](https://github.com/Vickey9015/chatty)

## Hostinger Node.js

See **[HOSTINGER.md](./HOSTINGER.md)** for hPanel build/start settings.

Quick: Install `npm install` → Build `npm run build` → Start `npm start` → Entry `server/index.js`

## One-command VPS setup (Ubuntu)

SSH into your server, then:

```bash
git clone https://github.com/Vickey9015/chatty.git
cd chatty
chmod +x deploy/setup-vps.sh
bash deploy/setup-vps.sh
```

With a domain (installs nginx):

```bash
DOMAIN=chat.yourdomain.com bash deploy/setup-vps.sh
sudo certbot --nginx -d chat.yourdomain.com
```

## Manual steps

```bash
git clone https://github.com/Vickey9015/chatty.git
cd chatty
npm run install:all
npm run build
npm run deploy          # starts with PM2
pm2 save
pm2 startup             # follow the printed command
```

Open **http://YOUR_SERVER_IP:3001** or your domain after nginx + SSL.

## Docker

```bash
docker build -t chatty .
docker run -d -p 3001:3001 -v chatty-uploads:/app/server/uploads --name chatty chatty
```

## Useful commands

| Command | Action |
|---------|--------|
| `pm2 status` | Check if app is running |
| `pm2 logs chatty` | View logs |
| `pm2 restart chatty` | Restart after `git pull` |
| `npm run deploy` | Rebuild + restart |

## After `git pull` on server

```bash
cd ~/chatty
git pull
npm run deploy
```

## HTTPS (required for video calls)

Use nginx + Let's Encrypt — see `deploy/nginx-chatty.conf`.

## Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
# If not using nginx: sudo ufw allow 3001
sudo ufw enable
```
