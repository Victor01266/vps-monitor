# VPS Monitor — Painel Corporativo

Painel de monitoramento de VPS para a Diagonal TI. Exibe em tempo real:
contêineres Docker, segurança SSH (ataques, Fail2Ban), firewall (UFW/iptables), recursos de servidor e acessos por serviço.

## Como usar

### Pré-requisitos
- Node.js 18+
- Python 3.10+
- OpenSSH no PATH (`ssh` disponível no terminal)
- Acesso SSH à VPS (`72.60.158.84:2222`)

### Primeira vez

```bash
cd apps/monitor-dashboard
npm install
```

### Iniciar

Dê duplo clique em **`iniciar.bat`** na raiz do projeto.

Isso irá:
1. Abrir túnel SSH (`localhost:8001` → VPS porta 8001)
2. Iniciar o dashboard Next.js
3. Abrir o painel em `http://localhost:3000`

---

## Estrutura

```
Monitor/
├── iniciar.bat                  # ← Clique aqui para iniciar tudo
├── apps/
│   ├── monitor-dashboard/       # Frontend Next.js (React + Recharts + Tailwind)
│   └── monitor-api/             # Backend FastAPI (Python) — roda na VPS
└── infra-map.json               # Mapa de containers/serviços
```

## Deploy da API (VPS)

A API FastAPI roda em `/opt/monitor-api` na VPS como serviço systemd `monitor-api`.
Para atualizar os routers na VPS, use `redeploy_api.py` (não incluído no repo — contém credenciais).

## Tecnologias

- **Frontend**: Next.js 16, React 19, Recharts, Tailwind CSS v4, shadcn/ui
- **Backend**: FastAPI, Uvicorn, Paramiko (SSH interno)
- **Infra**: VPS Ubuntu, Nginx, UFW, Fail2Ban, Docker, PM2
