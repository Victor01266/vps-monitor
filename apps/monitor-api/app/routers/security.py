import re
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from app.ssh_client import run_remote
from app.config import LOG_PATHS

router = APIRouter(prefix="/security", tags=["security"])
logger = logging.getLogger(__name__)

# O journalctl loga com formato Mês Dia HH:MM:SS (Ex: Apr 06 12:42:23)
_TS = r"(?:([A-Z][a-z]{2}\s+\d+\s+[\d:]+)|(\d{4}-\d{2}-\d{2}T[\d:]+))"

# Adaptamos a Regex para capturar também no journalctl e auth.log
_BRUTE_PATTERN = re.compile(
    _TS + r".*Failed password for(?: invalid user)? (\S+) from ([\d.]+)"
)
_INVALID_PATTERN = re.compile(
    _TS + r".*(?:Invalid user|Connection closed by invalid user) (\S+) (?:from )?([\d.]+)"
)
_ACCEPTED_PATTERN = re.compile(
    _TS + r".*Accepted (?:password|publickey) for (\S+) from ([\d.]+)"
)

_BAN_PATTERN = re.compile(
    r"(\d{4}-\d{2}-\d{2}\s[\d:,]+).*NOTICE\s+\[(\S+)\] Ban ([\d.]+)"
)


def _sanitize(value: str) -> str:
    return re.sub(r"[<>\"'%;()&+]", "", value)[:256]


@router.get("/attacks")
async def get_attacks(lines: int = 5000):
    """
    Retorna as últimas tentativas de ataque detectadas no journalctl (SSH) e fail2ban.log.
    Parâmetro: lines — quantas linhas do final do log analisar (padrão 5000).
    """
    if lines > 50000:
        lines = 50000

    try:
        # Sempre lê auth.log (fonte primária); journalctl como complemento se tiver entradas
        stdout_auth, _ = run_remote(
            f"tail -n {lines} {LOG_PATHS['auth']} 2>/dev/null"
        )
        # Complementa com journalctl se retornar entradas reais (exclui a linha "-- No entries --")
        stdout_jctl, _ = run_remote(
            f"journalctl -u sshd --no-pager -n {lines} --output=short 2>/dev/null | "
            f"grep -v '^-- ' || true"
        )
        if stdout_jctl.strip():
            stdout_auth = stdout_auth + "\n" + stdout_jctl
        # Leitura do fail2ban.log
        stdout_f2b, _ = run_remote(
            f"tail -n {lines} {LOG_PATHS['fail2ban']} 2>/dev/null"
        )

        attacks = []
        accepted = []

        for line in stdout_auth.splitlines():
            m_brute = _BRUTE_PATTERN.search(line)
            if m_brute:
                ts = _sanitize(m_brute.group(1) or m_brute.group(2) or "")
                attacks.append({
                    "type": "brute_force",
                    "timestamp": ts,
                    "user": _sanitize(m_brute.group(3)),
                    "ip": _sanitize(m_brute.group(4)),
                    "source": "journald",
                })
                continue
                
            m_invalid = _INVALID_PATTERN.search(line)
            if m_invalid:
                ts = _sanitize(m_invalid.group(1) or m_invalid.group(2) or "")
                attacks.append({
                    "type": "invalid_user",
                    "timestamp": ts,
                    "user": _sanitize(m_invalid.group(3)),
                    "ip": _sanitize(m_invalid.group(4)),
                    "source": "journald",
                })
                continue
                
            m_accept = _ACCEPTED_PATTERN.search(line)
            if m_accept:
                ts = _sanitize(m_accept.group(1) or m_accept.group(2) or "")
                accepted.append({
                    "type": "accepted",
                    "timestamp": ts,
                    "user": _sanitize(m_accept.group(3)),
                    "ip": _sanitize(m_accept.group(4)),
                    "source": "journald",
                })

        bans = []
        for line in stdout_f2b.splitlines():
            m_ban = _BAN_PATTERN.search(line)
            if m_ban:
                bans.append({
                    "timestamp": _sanitize(m_ban.group(1)),
                    "jail": _sanitize(m_ban.group(2)),
                    "ip": _sanitize(m_ban.group(3)),
                })

        # Agrupa IPs com mais de 1 tentativa de falha
        ip_count: dict[str, int] = {}
        for a in attacks:
            ip_count[a["ip"]] = ip_count.get(a["ip"], 0) + 1

        top_attackers = sorted(
            [{"ip": ip, "attempts": count} for ip, count in ip_count.items()],
            key=lambda x: x["attempts"],
            reverse=True,
        )[:20]

        return {
            "total_attacks": len(attacks),
            "attacks": attacks[-100:],  # Retorna os 100 eventos mais recentes
            "accepted_logins": accepted[-20:], # Retorna logins com sucesso reais
            "bans": bans[-50:],
            "top_attackers": top_attackers,
        }

    except Exception as e:
        logger.error(f"Erro em /security/attacks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attacks/daily")
async def get_attacks_daily(days: int = 30):
    """
    Retorna contagem diária de tentativas de ataque (brute_force + invalid_user).
    Lê auth.log atual + rotacionados para cobrir até `days` dias.
    """
    if days > 90:
        days = 90
    try:
        cmd = (
            "(cat /var/log/auth.log 2>/dev/null; "
            " cat /var/log/auth.log.1 2>/dev/null; "
            " find /var/log -maxdepth 1 -name 'auth.log.*.gz' 2>/dev/null | sort | xargs zcat 2>/dev/null) | "
            "grep -E 'Failed password|Invalid user|Connection closed by invalid user'"
        )
        stdout, _ = run_remote(cmd)

        from collections import defaultdict
        import datetime

        daily: dict[str, dict[str, int]] = defaultdict(lambda: {"brute": 0, "invalid": 0})

        for line in stdout.splitlines():
            # ISO format: 2026-03-08T00:15:02...
            m_iso = re.match(r"^(\d{4}-\d{2}-\d{2})", line)
            # Traditional: "Apr  7 09:12:34" or "Apr 17 09:12:34"
            m_trad = re.match(r"^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})", line)

            date_str: str | None = None
            if m_iso:
                date_str = m_iso.group(1)
            elif m_trad:
                try:
                    raw = re.sub(r"\s+", " ", m_trad.group(1).strip())
                    parsed = datetime.datetime.strptime(
                        f"{raw} {datetime.datetime.now().year}", "%b %d %H:%M:%S %Y"
                    )
                    date_str = parsed.strftime("%Y-%m-%d")
                except ValueError:
                    pass

            if not date_str:
                continue

            if "Failed password" in line:
                daily[date_str]["brute"] += 1
            else:
                daily[date_str]["invalid"] += 1

        today = datetime.date.today()
        cutoff = today - datetime.timedelta(days=days)

        # Preenche todos os dias do período com zeros (inclusive os sem ataques)
        result = []
        for i in range(days + 1):
            d = (cutoff + datetime.timedelta(days=i)).isoformat()
            v = daily.get(d, {"brute": 0, "invalid": 0})
            result.append({
                "date": d,
                "brute": v["brute"],
                "invalid": v["invalid"],
                "total": v["brute"] + v["invalid"],
            })

        return {"days": days, "data": result}
    except Exception as e:
        logger.error(f"Erro em /security/attacks/daily: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attacks/count")
async def get_attacks_count():
    """
    Retorna o total histórico de tentativas de ataque em todos os logs rotacionados.
    Não tem limite de dias — lê auth.log, auth.log.1 e todos os .gz disponíveis.
    """
    try:
        cmd = (
            "(cat /var/log/auth.log 2>/dev/null; "
            " cat /var/log/auth.log.1 2>/dev/null; "
            " find /var/log -maxdepth 1 -name 'auth.log.*.gz' 2>/dev/null | sort | xargs zcat 2>/dev/null) | "
            "grep -cE 'Failed password|Invalid user|Connection closed by invalid user' || echo 0"
        )
        stdout, _ = run_remote(cmd)
        total = 0
        for line in stdout.strip().splitlines():
            try:
                total = int(line.strip())
                break
            except ValueError:
                pass
        return {"total": total}
    except Exception as e:
        logger.error(f"Erro em /security/attacks/count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class UnbanRequest(BaseModel):
    jail: str
    ip: str

    @field_validator("ip")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        if not re.match(r"^\d{1,3}(\.\d{1,3}){3}$", v):
            raise ValueError("IP inválido")
        return v

    @field_validator("jail")
    @classmethod
    def validate_jail(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError("Nome de jail inválido")
        return v


@router.post("/fail2ban/unban")
async def fail2ban_unban(request: UnbanRequest):
    """Desbanir um IP de um jail específico do Fail2Ban."""
    try:
        stdout, stderr = run_remote(
            f"fail2ban-client set {request.jail} unbanip {request.ip} 2>&1"
        )
        combined = (stdout + stderr).strip()
        if "NOK" in combined or "does not exist" in combined:
            raise HTTPException(status_code=400, detail=f"Falha ao desbanir: {combined[:200]}")
        return {
            "status": "success",
            "jail": request.jail,
            "ip": request.ip,
            "message": f"IP {request.ip} desbanido do jail {request.jail}.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro em /security/fail2ban/unban: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fail2ban/status")
async def get_fail2ban_status():
    """Retorna o status do Fail2Ban e jails ativos."""
    try:
        stdout, _ = run_remote("fail2ban-client status 2>/dev/null")
        jails_line = next(
            (line for line in stdout.splitlines() if "Jail list" in line), ""
        )
        jail_names = [j.strip() for j in jails_line.split(":")[-1].split(",") if j.strip()]

        jails_detail = []
        for jail in jail_names:
            out, _ = run_remote(f"fail2ban-client status {jail} 2>/dev/null")
            banned_match = re.search(r"Banned IP list:\s*(.*)", out)
            total_match = re.search(r"Total banned:\s*(\d+)", out)
            currently_match = re.search(r"Currently banned:\s*(\d+)", out)
            jails_detail.append({
                "jail": _sanitize(jail),
                "total_banned": int(total_match.group(1)) if total_match else 0,
                "currently_banned": int(currently_match.group(1)) if currently_match else 0,
                "banned_ips": [_sanitize(ip.strip()) for ip in (banned_match.group(1).split() if banned_match else [])],
            })

        return {"jails": jails_detail}

    except Exception as e:
        logger.error(f"Erro em /security/fail2ban/status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
