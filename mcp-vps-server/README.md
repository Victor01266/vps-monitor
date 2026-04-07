# MCP VPS Server

Servidor MCP customizado para monitoramento e gerenciamento da VPS.

## Ferramentas Disponíveis

1. **execute_command** - Executa comandos shell
2. **read_file** - Lê arquivos
3. **write_file** - Escreve arquivos
4. **systemctl** - Gerencia serviços systemd
5. **docker_command** - Comandos Docker
6. **fail2ban_command** - Gerencia fail2ban
7. **firewall_command** - Gerencia iptables
8. **get_logs** - Recupera logs do sistema
9. **system_info** - Informações do sistema (CPU, memória, disco, rede)

## Instalação na VPS

```bash
# 1. Copiar arquivos para VPS
scp -r mcp-vps-server user@vps-ip:~/

# 2. Conectar na VPS
ssh user@vps-ip

# 3. Executar instalação
cd ~/mcp-vps-server
chmod +x install-vps.sh
./install-vps.sh
```

## Configuração Local (Windows)

Adicione ao seu `mcp_config.json`:

```json
{
  "mcpServers": {
    "vps-monitor": {
      "command": "ssh",
      "args": [
        "user@vps-ip",
        "node",
        "/root/mcp-vps-server/index.js"
      ]
    }
  }
}
```

## Segurança

- Todas as operações de firewall usam caminhos absolutos (`/sbin/iptables`)
- Logs são sanitizados antes de exibição
- Comandos destrutivos requerem confirmação
