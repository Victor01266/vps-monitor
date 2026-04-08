# VPS Monitor — Painel Corporativo

Painel de monitoramento de VPS para a Diagonal TI. Exibe em tempo real:
contêineres Docker, segurança SSH (ataques, Fail2Ban), firewall (UFW/iptables), recursos de servidor e acessos por serviço.

> **Privado por design** — roda apenas na rede interna da empresa. Não fica exposto na internet.

---

## Arquitetura

```
PC da empresa  ──►  API FastAPI (localhost:8001)  ──SSH──►  VPS (72.60.158.84:2222)
               ──►  Dashboard Next.js (localhost:3000)
```

A API e o dashboard rodam **localmente** no computador da empresa. A conexão com a VPS é feita via SSH pelo `ssh_client.py` (Paramiko). Nada fica exposto publicamente.

---

## Pré-requisitos

- Node.js 18+
- Python 3.10+
- Credenciais SSH da VPS configuradas em `apps/monitor-api/.env`

---

## Primeira vez

```bash
# 1. Configure as credenciais SSH
copy apps\monitor-api\.env.example apps\monitor-api\.env
# Edite apps\monitor-api\.env com os dados reais da VPS

# 2. Instale dependências do dashboard
cd apps\monitor-dashboard
npm install
cd ..\..

# 3. Instale dependências da API
pip install -r apps\monitor-api\requirements.txt
```

---

## Iniciar

Dê duplo clique em **`iniciar.bat`** na raiz do projeto.

Isso irá:
1. Iniciar a API FastAPI em `http://localhost:8001` (conecta na VPS via SSH)
2. Iniciar o dashboard Next.js em `http://localhost:3000`
3. Abrir o painel no browser

---

## Acesso remoto (do PC pessoal)

O monitor **não fica exposto na internet**. Para acessar de casa ou de outro lugar, use um túnel SSH para o computador da empresa:

```bash
# No seu PC pessoal — substitua USUARIO e IP-DA-EMPRESA
ssh -L 3000:localhost:3000 USUARIO@IP-DA-EMPRESA -N
```

Depois abra `http://localhost:3000` no browser do seu PC pessoal.

> O IP da empresa pode ser fixo (IP público do roteador) ou acessado via VPN corporativa.

---

## Estrutura

```
Monitor/
├── iniciar.bat                  # ← Clique aqui para iniciar tudo
└── apps/
    ├── monitor-dashboard/       # Frontend Next.js (React + Recharts + Tailwind)
    │   └── lib/api.ts           # Cliente HTTP — aponta para localhost:8001
    └── monitor-api/             # Backend FastAPI (Python)
        ├── app/ssh_client.py    # Conexão SSH com a VPS via Paramiko
        ├── .env                 # Credenciais SSH (não versionado)
        └── .env.example         # Modelo de configuração
```

---

## Tecnologias

- **Frontend**: Next.js 16, React 19, Recharts, Tailwind CSS v4, shadcn/ui
- **Backend**: FastAPI, Uvicorn, Paramiko (SSH para VPS)
- **Infra**: VPS Ubuntu, Nginx, UFW, Fail2Ban, Docker
