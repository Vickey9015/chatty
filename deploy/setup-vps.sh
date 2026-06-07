#!/usr/bin/env bash
# Full VPS setup for LockyChat — run on Ubuntu 22.04+ as a user with sudo
# Usage: curl -fsSL ... | bash   OR   bash deploy/setup-vps.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Vickey9015/chatty.git}"
APP_DIR="${APP_DIR:-$HOME/lockychat}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-lockychat.com}"

echo "==> LockyChat VPS setup"
echo "    Repo: $REPO_URL"
echo "    Dir:  $APP_DIR"

# Node.js 20 LTS
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Node $(node -v) npm $(npm -v)"

# Clone or update
if [[ -d "$APP_DIR/.git" ]]; then
  echo "==> Updating repo..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "==> Cloning repo..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Dependencies + build
echo "==> Installing dependencies..."
npm run install:all

echo "==> Building client..."
npm run build

mkdir -p server/uploads

# PM2
if ! command -v pm2 &>/dev/null; then
  echo "==> Installing PM2..."
  sudo npm install -g pm2
fi

echo "==> Starting app with PM2..."
pm2 delete lockychat 2>/dev/null || true
cd "$APP_DIR"
NODE_ENV=production pm2 start ecosystem.config.cjs
pm2 save

# PM2 startup on boot
echo "==> Enabling PM2 on boot (run the command PM2 prints if needed)..."
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || pm2 startup || true

# Nginx (optional)
if [[ -n "$DOMAIN" ]]; then
  echo "==> Configuring nginx for $DOMAIN..."
  sudo apt-get update -qq
  sudo apt-get install -y nginx
  sudo sed "s/www.lockychat.com/www.$DOMAIN/g; s/lockychat.com/$DOMAIN/g" deploy/nginx-lockychat.conf | sudo tee /etc/nginx/sites-available/lockychat >/dev/null
  sudo ln -sf /etc/nginx/sites-available/lockychat /etc/nginx/sites-enabled/lockychat
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl reload nginx
  echo "==> Run SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "============================================"
echo "  LockyChat is running on port 3001"
echo "  PM2:  pm2 status"
echo "  Logs: pm2 logs lockychat"
echo ""
if [[ -n "$DOMAIN" ]]; then
  echo "  URL:  https://$DOMAIN (add SSL with certbot)"
else
  echo "  URL:  http://YOUR_SERVER_IP:3001"
  echo "  Tip: set DOMAIN=lockychat.com and re-run for nginx"
fi
echo "============================================"
