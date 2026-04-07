#!/bin/bash
# Script de instalação do MCP Server na VPS

set -e

echo "=== Instalando MCP Server na VPS ==="

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Cria diretório do servidor
mkdir -p ~/mcp-vps-server
cd ~/mcp-vps-server

# Copia arquivos (serão enviados via SCP)
echo "Instalando dependências..."
npm install

# Torna o script executável
chmod +x index.js

# Cria serviço systemd (opcional, para rodar como daemon)
cat > /tmp/mcp-vps-server.service << 'EOF'
[Unit]
Description=MCP VPS Monitor Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/mcp-vps-server
ExecStart=/usr/bin/node /root/mcp-vps-server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Instala o serviço (comentado por padrão, descomente se quiser rodar como daemon)
# sudo mv /tmp/mcp-vps-server.service /etc/systemd/system/
# sudo systemctl daemon-reload
# sudo systemctl enable mcp-vps-server
# sudo systemctl start mcp-vps-server

echo "=== Instalação concluída ==="
echo "Para testar: node index.js"
