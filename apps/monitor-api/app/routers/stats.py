import json
import logging
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
        except Exception as e:
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
