import base64
import json
import logging
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.ssh_client import run_remote
from app.config import INFRA_MAP_PATH

router = APIRouter(prefix="/stats", tags=["stats"])
logger = logging.getLogger(__name__)

# Mapa: keyword no nginx log → nome canônico do serviço
_NGINX_VHOST_MAP = {
    "cadascred":  "cadascredito",
    "cobrabot":   "cobrabot",
    "glpi":       "glpi",
    "evolution":  "evolution",
    "n8n":        "n8n",
    "monitor":    "monitor",
    "ranking":    "ranking_vendas",
}


def _load_infra_map() -> dict:
    try:
        with open(INFRA_MAP_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Erro ao carregar infra-map.json: {e}")
        return {}


def _check_virtual_services() -> list:
    """Verifica serviços que não são containers Docker (ex: Cadascredito no host)."""
    checks = [
        {"name": "cadascredito",   "url": "http://127.0.0.1:3000", "image": "node (host:3000)"},
        {"name": "ranking_vendas", "url": "http://127.0.0.1:8501", "image": "streamlit (host:8501)"},
    ]
    results = []
    for svc in checks:
        try:
            out, _ = run_remote(
                f"curl -s -o /dev/null -w '%{{http_code}}' --connect-timeout 3 {svc['url']} 2>/dev/null"
            )
            code = out.strip()
            is_up = code.isdigit() and int(code) < 500
            results.append({
                "name": svc["name"],
                "image": svc["image"],
                "ports": svc["url"].split("://")[1],
                "status": f"Up (HTTP {code})" if is_up else f"Down (HTTP {code or 'timeout'})",
                "state": "running" if is_up else "exited",
                "virtual": True,
            })
        except Exception:
            results.append({
                "name": svc["name"],
                "image": svc["image"],
                "ports": "",
                "status": "Down (error)",
                "state": "exited",
                "virtual": True,
            })
    return results


@router.get("/services")
async def get_services():
    """Retorna status atualizado de todos os contêineres Docker + serviços virtuais da VPS."""
    try:
        stdout, stderr = run_remote(
            "docker ps -a --format '{\"name\":\"{{.Names}}\",\"image\":\"{{.Image}}\","
            "\"ports\":\"{{.Ports}}\",\"status\":\"{{.Status}}\",\"state\":\"{{.State}}\"}'"
        )
        containers = []
        for line in stdout.strip().splitlines():
            if line.strip():
                try:
                    containers.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

        virtual = _check_virtual_services()
        all_services = containers + virtual

        infra = _load_infra_map()
        return {
            "containers": all_services,
            "total": len(containers),
            "healthy": sum(1 for c in containers if "healthy" in c.get("status", "") and "unhealthy" not in c.get("status", "")),
            "unhealthy": sum(1 for c in containers if "unhealthy" in c.get("status", "")),
            "running": sum(1 for c in all_services if c.get("state", "").lower() == "running"),
            "infra_map": infra,
        }
    except Exception as e:
        logger.error(f"Erro em /stats/services: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-accesses")
async def get_weekly_accesses():
    """Retorna contagem de acessos dos últimos 7 dias por serviço via nginx access.log."""
    try:
        cmd = (
            "for kw in cadascred cobrabot glpi evolution n8n monitor ranking; do "
            "  count=$( (cat /var/log/nginx/access.log 2>/dev/null; "
            "            cat /var/log/nginx/access.log.1 2>/dev/null; "
            "            zcat /var/log/nginx/access.log.{2..7}.gz 2>/dev/null) "
            "           | awk -v kw=\"$kw\" '($11 ~ kw) || ($7 ~ kw) {print $1}' "
            "           | sort -u | wc -l ); "
            "  echo \"$kw=$count\"; "
            "done"
        )
        stdout, _ = run_remote(cmd)
        result: dict[str, int] = {}
        for line in stdout.strip().splitlines():
            if "=" in line:
                kw, _, count = line.partition("=")
                canonical = _NGINX_VHOST_MAP.get(kw.strip(), kw.strip())
                try:
                    result[canonical] = int(count.strip())
                except ValueError:
                    result[canonical] = 0
        return result
    except Exception as e:
        logger.error(f"Erro em /stats/weekly-accesses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-sessions")
async def get_active_sessions():
    """Retorna número de sessões SSH ativas no momento via ss."""
    try:
        stdout, _ = run_remote(
            "ss -tnp state established '( dport = :22 or sport = :22 )' 2>/dev/null | "
            "grep -c ESTAB || echo 0"
        )
        count = 0
        for line in stdout.strip().splitlines():
            try:
                count = int(line.strip())
                break
            except ValueError:
                pass
        return {"active_sessions": count}
    except Exception as e:
        logger.error(f"Erro em /stats/active-sessions: {e}")
        return {"active_sessions": 0}


@router.get("/service-accesses")
async def get_service_accesses():
    """Retorna acessos por serviço parseando JWT do nginx access.log."""
    try:
        domain_map = {
            "cadascred.diagonalit.com.br": "cadascredito",
            "cobrabot.diagonalit.com.br": "cobrabot", 
            "glpi.diagonalit.com.br": "glpi",
            "evo.diagonalit.com.br": "evolution",
            "evolution.diagonalit.com.br": "evolution",
            "n8n.diagonalit.com.br": "n8n",
            "metas.diagonalit.com.br": "ranking_vendas",
            "chat.diagonalit.com.br": "chat",
            "monitor.diagonalit.com.br": "monitor"
        }
        
        # Ler access.log atual + rotacionados
        cmd = (
            "(cat /var/log/nginx/access.log 2>/dev/null; "
            " cat /var/log/nginx/access.log.1 2>/dev/null; "
            " find /var/log -maxdepth 1 -name 'access.log.*.gz' 2>/dev/null | sort | xargs zcat 2>/dev/null) | "
            "grep '/api/auth/verify' | tail -5000"
        )
        stdout, _ = run_remote(cmd)
        service_data: dict[str, dict] = {}
        now = datetime.now()
        
        for line in stdout.splitlines():
            # Parse nginx log: IP - - [timestamp] "GET /api/auth/verify HTTP/1.1" 200 "referer?token=JWT" ...
            match = re.search(r'^(\S+).*\[([^\]]+)\].*GET /api/auth/verify', line)
            if not match:
                continue
                
            ip, timestamp_str = match.groups()
            
            # Extrair token do referer
            token_match = re.search(r'token=([^&\s]+)', line)
            token = token_match.group(1) if token_match else ""
            
            # Extrair domínio do referer
            ref_match = re.search(r'"https?://([^/]+)', line)
            referer = ref_match.group(1) if ref_match else ""
            service_name = "unknown"
            
            for domain, name in domain_map.items():
                if domain in referer:
                    service_name = name
                    break
            
            # Decodificar JWT payload (sem verificação de assinatura)
            try:
                # Adicionar padding se necessário
                padded = token + '=' * (-len(token) % 4)
                payload_bytes = base64.b64decode(padded.split('.')[1] + '==')
                payload = json.loads(payload_bytes.decode())
                username = payload.get('username', 'unknown')
            except (ValueError, KeyError, IndexError, json.JSONDecodeError):
                continue
            
            # Parse timestamp
            try:
                timestamp = datetime.strptime(timestamp_str.split()[0], '%d/%b/%Y:%H:%M:%S')
            except ValueError:
                continue
            
            # Inicializar serviço se não existir
            if service_name not in service_data:
                service_data[service_name] = {
                    'users': {},
                    'recent_ips': set(),
                    'last_access': None,
                    'weekly_count': 0
                }
            
            service = service_data[service_name]
            
            # Contar acessos semanais
            if timestamp > now - timedelta(days=7):
                service['weekly_count'] += 1
                
                # Contar por usuário
                if username not in service['users']:
                    service['users'][username] = {'count': 0, 'last_access': None}
                service['users'][username]['count'] += 1
                if not service['users'][username]['last_access'] or timestamp > service['users'][username]['last_access']:
                    service['users'][username]['last_access'] = timestamp.isoformat()
            
            # Acessos recentes (últimos 5 min)
            if timestamp > now - timedelta(minutes=5):
                service['recent_ips'].add(ip)
            
            # Último acesso geral
            if not service['last_access'] or timestamp > datetime.fromisoformat(service['last_access']):  # type: ignore[arg-type]
                service['last_access'] = timestamp.isoformat()
        
        # Formatar resposta
        result = {}
        for service, data in service_data.items():
            users_list = []
            for username, user_data in data['users'].items():
                users_list.append({
                    'username': username,
                    'weekly_accesses': user_data['count'],
                    'last_access': user_data['last_access']
                })
            
            result[service] = {
                'users': sorted(users_list, key=lambda x: x['weekly_accesses'], reverse=True)[:10],
                'active_now': len(data['recent_ips']),
                'simultaneous_now': len(data['recent_ips']),
                'weekly_total': data['weekly_count'],
                'last_access': data['last_access']
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Erro em /stats/service-accesses: {e}")
        return {}


@router.get("/overview")
async def get_overview():
    """Retorna carga do sistema: CPU, memória, uptime e disco."""
    try:
        stdout, _ = run_remote(
            "echo CPU=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1); "
            "echo MEM=$(free -m | awk 'NR==2{printf \"%.1f\", $3*100/$2}'); "
            "echo DISK=$(df -h / | awk 'NR==2{print $5}'); "
            "echo UPTIME=$(uptime -p)"
        )
        result = {}
        for line in stdout.strip().splitlines():
            if "=" in line:
                key, _, val = line.partition("=")
                result[key.strip().lower()] = val.strip()
        return result
    except Exception as e:
        logger.error(f"Erro em /stats/overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))
