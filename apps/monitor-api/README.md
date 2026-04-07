# VPS Monitor API

API de monitoramento corporativo da VPS, construída com **FastAPI**.  
Coleta dados de contêineres Docker, logs de segurança e controla o firewall via SSH.

## Estrutura

```
apps/monitor-api/
├── app/
│   ├── main.py              # Entry point FastAPI + WebSocket /ws/alerts
│   ├── config.py            # Variáveis de ambiente
│   ├── ssh_client.py        # Conexão SSH reutilizável (paramiko)
│   ├── log_watcher.py       # Watchdog de logs via tail -F SSH (thread)
│   ├── websocket_manager.py # Broadcast de alertas para clientes WS
│   └── routers/
│       ├── stats.py         # GET /stats/services, /stats/overview
│       ├── security.py      # GET /security/attacks, /security/fail2ban/status
│       └── firewall.py      # POST /firewall/action, GET /firewall/rules
├── .env                     # Credenciais SSH (não versionar)
├── .env.example
└── requirements.txt
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/stats/services` | Contêineres Docker e status |
| GET | `/stats/overview` | CPU, memória, disco, uptime |
| GET | `/security/attacks?lines=200` | Tentativas de ataque recentes |
| GET | `/security/fail2ban/status` | Status dos jails do Fail2Ban |
| POST | `/firewall/action` | Bloquear/desbloquear IP |
| GET | `/firewall/rules` | Listar IPs bloqueados no iptables |
| WS | `/ws/alerts` | Stream de alertas em tempo real |

## WebSocket — Payload

```json
{
  "type": "security_alert",
  "data": {
    "event": "brute_force",
    "log": "auth",
    "ip": "1.2.3.4",
    "user": "root",
    "timestamp": "2026-04-03T21:00:00",
    "raw": "Apr  3 21:00:00 server sshd[...]: Failed password..."
  }
}
```

## Instalação e execução

```bash
cd apps/monitor-api
pip install -r requirements.txt
cp .env.example .env   # preencha as credenciais
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Documentação interativa disponível em: `http://localhost:8000/docs`
