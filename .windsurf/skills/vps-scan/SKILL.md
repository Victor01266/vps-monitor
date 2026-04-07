name: vps-scan
description: Vasculha a VPS em busca de processos, contêineres Docker, portas abertas e arquivos de log ativos.
version: 1.0.0
author: IT-Security-Agent
## Objetivo
Mapear toda a infraestrutura rodando na VPS para alimentar o banco de dados do monitor.

## Passos
1. Listar contêineres Docker e extrair logs de erro recentes.
2. Identificar serviços via `systemctl` e `netstat`.
3. Localizar `/var/log/auth.log` ou logs de acesso equivalentes.
4. Gerar um arquivo `vps-inventory.json` com o mapa de serviços.
