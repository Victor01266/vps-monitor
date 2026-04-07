name: firewall-mgmt
description: Gerencia regras de IPTables e status do Fail2Ban para controle de acesso.
version: 1.0.0
author: IT-Security-Agent
## Objetivo
Prover interface de controle sobre o firewall da VPS para mitigação de ataques em tempo real.

## Passos
1. Verificar se o IP fornecido é válido.
2. Executar `iptables -A INPUT -s [IP] -j DROP` para bloqueio.
3. Executar `iptables -D INPUT -s [IP] -j DROP` para desbloqueio.
4. Persistir regras via `iptables-save`.
