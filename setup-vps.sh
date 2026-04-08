#!/bin/bash
# Setup inicial do VPS Monitor na VPS
# Execute como root: bash setup-vps.sh
set -e

REPO_URL="https://github.com/Victor01266/vps-monitor.git"
INSTALL_DIR="/opt/monitor"
DOMAIN="monitor.diagonalit.com.br"

echo ""
echo "============================================="
echo "  VPS Monitor — Setup Inicial"
echo "============================================="
echo ""

# ── Dependências do sistema ────────────────────
echo "→ Instalando dependências..."
apt-get update -qq
apt-get install -y -qq git python3 python3-pip nodejs npm nginx certbot python3-certbot-nginx

# PM2
npm install -g pm2 --silent

# ── Clonar repositório ─────────────────────────
echo "→ Clonando repositório..."
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR" && git pull origin master
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# ── API FastAPI ────────────────────────────────
echo "→ Configurando API..."
cd "$INSTALL_DIR/apps/monitor-api"

pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "  ⚠️  Configure o arquivo $INSTALL_DIR/apps/monitor-api/.env"
    echo "      com as credenciais SSH e de autenticação antes de continuar."
    echo ""
    read -p "  Pressione ENTER quando estiver pronto..."
fi

cat > /etc/systemd/system/monitor-api.service << EOF
[Unit]
Description=VPS Monitor API
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR/apps/monitor-api
EnvironmentFile=$INSTALL_DIR/apps/monitor-api/.env
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable monitor-api
systemctl restart monitor-api
echo "  ✓ API rodando em 127.0.0.1:8001"

# ── Dashboard Next.js ──────────────────────────
echo "→ Configurando Dashboard..."
cd "$INSTALL_DIR/apps/monitor-dashboard"

npm ci --silent

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
EOF

npm run build

pm2 start npm --name "monitor-dashboard" -- start -- -p 3000
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo "  ✓ Dashboard rodando em 127.0.0.1:3000"

# ── Nginx ──────────────────────────────────────
echo "→ Configurando Nginx..."
cp "$INSTALL_DIR/nginx-monitor.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@diagonalit.com.br || true

echo ""
echo "============================================="
echo "  ✓ Setup concluído!"
echo "  Acesse: https://$DOMAIN"
echo "============================================="
echo ""
echo "  Próximos passos:"
echo "  1. Adicione seu IP em: nginx-monitor.conf (allow SEU_IP;)"
echo "  2. Configure os Secrets no GitHub:"
echo "     VPS_HOST, VPS_USER, VPS_PASSWORD, VPS_PORT"
echo ""
