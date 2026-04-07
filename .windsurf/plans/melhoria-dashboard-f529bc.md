# Plano de Melhoria e Integração do Monitor Dashboard

## Resumo
Aprimorar o dashboard para exibir status fidedignos dos principais serviços da VPS (Cadascredito, Cobrabot, Diagotools, GLPI, etc.), garantir a precisão dos dados de login lendo do `journalctl` ou corrigindo o parsing do `auth.log`, e simplificar a barra lateral apenas para as abas essenciais.

## Passos

1. **Correção de Leitura de Logs (Dados Fidedignos)**
   - Atualmente a leitura do `auth.log` pode estar imprecisa no Ubuntu mais recente (onde o SSH loga primariamente no `journald`).
   - Alterar a API (`app/routers/security.py`) para consumir as tentativas de login via `journalctl -u ssh --since "24 hours ago" --no-pager` em vez de apenas ler o arquivo de texto `auth.log` cru, garantindo que 100% das tentativas reais sejam capturadas.
   
2. **Nova Tela Inicial (Dashboard Aprimorado com Cards de Serviço)**
   - Reestruturar o `DashboardClient.tsx`.
   - Adicionar uma seção principal destacando os status dos serviços críticos (Cadascredito, Cobrabot, Diagotools, GLPI App, GLPI Bot, Evolution API, N8N, DB).
   - Criar um componente visual atraente ("ServiceCard") para mostrar se o container do projeto está "Up/Healthy" ou "Down/Unhealthy", além da porta alocada.
   - Os dados virão da rota já existente `/stats/services` da API que executa `docker ps`.

3. **Simplificação da Barra Lateral (Cleanup)**
   - No `MainLayout.tsx`, editar o array `sidebarItems`.
   - Manter apenas: Dashboard (`/`), Serviços (`/services`), Firewall (`/firewall`), Segurança (`/security`) e Configurações (`/settings`).
   - Excluir arquivos e pastas inúteis criados anteriormente (`app/tasks`, `app/features`, `app/products`, `app/pages`).
   
4. **Criação das Novas Abas**
   - Implementar a página `/services` (listagem completa e uso de recursos por container).
   - Implementar a página `/firewall` (gestão do ufw / iptables visual).
   - Implementar a página `/security` (tabela de eventos de ataque e Fail2Ban).
   - Ajustar roteamento.

5. **Testes de Integração**
   - Validar se o dashboard exibe os ataques em tempo real corretamente.
   - Validar a saúde visual dos serviços selecionados no dashboard.
