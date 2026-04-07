import os
from dotenv import load_dotenv

load_dotenv()

INFRA_MAP_PATH = os.getenv("INFRA_MAP_PATH", "/opt/monitor-api/infra-map.json")

LOG_PATHS = {
    "auth": "/var/log/auth.log",
    "syslog": "/var/log/syslog",
    "fail2ban": "/var/log/fail2ban.log",
    "nginx_access": "/var/log/nginx/access.log",
    "nginx_error": "/var/log/nginx/error.log",
}

IPTABLES_BIN = "/sbin/iptables"
IPTABLES_SAVE_BIN = "/sbin/iptables-save"
