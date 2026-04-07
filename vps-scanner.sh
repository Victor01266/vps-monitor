#!/bin/bash

# Define o nome do arquivo de saída
OUTPUT="infra-map.json"

echo "Iniciando varredura da VPS..."

# Inicializa o JSON
echo "{" > $OUTPUT

# 1. Contêineres Docker
echo "  \"containers\": [" >> $OUTPUT
if command -v docker &> /dev/null; then
    docker ps --format '    {"name": "{{.Names}}", "image": "{{.Image}}", "ports": "{{.Ports}}", "status": "{{.Status}}"}' | sed '$!s/$/,/' >> $OUTPUT
else
    echo "    // Docker não encontrado ou permissão negada" >> $OUTPUT
fi
echo "  ]," >> $OUTPUT

# 2. Processos/Serviços (Python, Node, Go, etc.) fora do Docker
echo "  \"services\": [" >> $OUTPUT
if command -v ss &> /dev/null; then
    # Extrai processos escutando em portas (requer root)
    ss -tulpn | grep LISTEN | awk '{print "    {\"protocol\": \""$1"\", \"address\": \""$5"\", \"process\": \""$7"\"}"}' | sed 's/\"users:((\"//g' | sed 's/\",pid=.*//g' | sed '$!s/$/,/' >> $OUTPUT
fi
echo "  ]," >> $OUTPUT

# 3. Caminhos de Logs
echo "  \"log_paths\": {" >> $OUTPUT
LOGS=""
[ -f /var/log/auth.log ] && LOGS="$LOGS\"auth\": \"/var/log/auth.log\","
[ -f /var/log/secure ] && LOGS="$LOGS\"secure\": \"/var/log/secure\"," # Alternativa CentOS/RHEL
[ -f /var/log/syslog ] && LOGS="$LOGS\"syslog\": \"/var/log/syslog\","
[ -f /var/log/messages ] && LOGS="$LOGS\"messages\": \"/var/log/messages\","
[ -f /var/log/fail2ban.log ] && LOGS="$LOGS\"fail2ban\": \"/var/log/fail2ban.log\","

# Remove a última vírgula e adiciona ao arquivo
LOGS=$(echo "$LOGS" | sed 's/,$//')
echo "    $LOGS" >> $OUTPUT
echo "  }" >> $OUTPUT

# Finaliza o JSON
echo "}" >> $OUTPUT

echo "Varredura concluída! O arquivo $OUTPUT foi gerado."
