# Workflow: Setup Monitor
## Descrição
Prepara o ambiente de monitoramento e instala as dependências do painel.

## Passos
1. Executar @vps-scan para mapear serviços.
2. Instalar dependências em `apps/monitor-api` (FastAPI/Python).
3. Instalar dependências em `apps/monitor-dashboard` (Next.js/Tailwind).
4. Gerar o arquivo .env com os caminhos de log detectados.
