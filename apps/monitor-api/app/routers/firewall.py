import re
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from app.ssh_client import run_remote
from app.config import IPTABLES_BIN, IPTABLES_SAVE_BIN

router = APIRouter(prefix="/firewall", tags=["firewall"])
logger = logging.getLogger(__name__)

_IP_PATTERN = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


class FirewallActionRequest(BaseModel):
    ip: str
    action: str  # "block" | "unblock"
    confirm: bool = False

    @field_validator("ip")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        if not _IP_PATTERN.match(v):
            raise ValueError("IP inválido")
        parts = [int(p) for p in v.split(".")]
        if not all(0 <= p <= 255 for p in parts):
            raise ValueError("IP fora do range válido")
        # Bloqueia IPs privados / loopback por segurança
        if parts[0] in (10, 127) or (parts[0] == 172 and 16 <= parts[1] <= 31) or (parts[0] == 192 and parts[1] == 168):
            raise ValueError("Bloqueio de IPs privados não é permitido")
        return v

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("block", "unblock"):
            raise ValueError("Ação deve ser 'block' ou 'unblock'")
        return v


@router.post("/action")
async def firewall_action(request: FirewallActionRequest):
    """
    Bloqueia ou desbloqueia um IP via iptables.
    Requer confirmação explícita (confirm: true) antes de executar.
    """
    if not request.confirm:
        return {
            "status": "awaiting_confirmation",
            "message": f"Confirme o {request.action} do IP {request.ip} enviando confirm=true.",
        }

    ip = request.ip

    if request.action == "block":
        cmd_check = f"{IPTABLES_BIN} -C INPUT -s {ip} -j DROP 2>/dev/null && echo exists || echo absent"
        out, _ = run_remote(cmd_check)
        if "exists" in out:
            return {"status": "noop", "message": f"IP {ip} já está bloqueado."}

        cmd = (
            f"{IPTABLES_BIN} -A INPUT -s {ip} -j DROP && "
            f"{IPTABLES_BIN} -A FORWARD -s {ip} -j DROP && "
            f"{IPTABLES_SAVE_BIN} > /etc/iptables/rules.v4 2>/dev/null || true"
        )
        action_label = "bloqueado"
    else:
        cmd = (
            f"{IPTABLES_BIN} -D INPUT -s {ip} -j DROP 2>/dev/null || true && "
            f"{IPTABLES_BIN} -D FORWARD -s {ip} -j DROP 2>/dev/null || true && "
            f"{IPTABLES_SAVE_BIN} > /etc/iptables/rules.v4 2>/dev/null || true"
        )
        action_label = "desbloqueado"

    try:
        stdout, stderr = run_remote(cmd)
        logger.info(f"Firewall: IP {ip} {action_label}. stdout={stdout} stderr={stderr}")
        return {
            "status": "success",
            "ip": ip,
            "action": request.action,
            "message": f"IP {ip} {action_label} com sucesso.",
        }
    except Exception as e:
        logger.error(f"Erro ao executar ação de firewall para {ip}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules")
async def get_rules():
    """Lista as regras DROP ativas no iptables (IPs bloqueados)."""
    try:
        stdout, _ = run_remote(
            f"{IPTABLES_BIN} -L INPUT -n --line-numbers | grep DROP 2>/dev/null"
        )
        rules = []
        for line in stdout.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5:
                rules.append({
                    "num": parts[0],
                    "target": parts[1],
                    "protocol": parts[2],
                    "source": parts[4],
                })
        return {"blocked_ips": rules, "total": len(rules)}
    except Exception as e:
        logger.error(f"Erro em /firewall/rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UFW management ───────────────────────────────────────────────

_UFW_RULE_RE = re.compile(
    r"^\s*\[\s*(\d+)\]\s+"
    r"(.+?)\s{2,}"
    r"(ALLOW|DENY|REJECT|LIMIT)\s+(IN|OUT|FWD)?\s*"
    r"(.+?)\s*$",
    re.IGNORECASE,
)


class UFWRuleRequest(BaseModel):
    target: str
    action: str
    comment: Optional[str] = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v.lower() not in ("allow", "deny", "reject"):
            raise ValueError("Ação deve ser allow, deny ou reject")
        return v.lower()


@router.get("/ufw")
async def get_ufw_rules():
    """Lista todas as regras UFW numeradas."""
    try:
        stdout, _ = run_remote("ufw status numbered 2>/dev/null")
        rules = []
        status = "inactive"
        for line in stdout.splitlines():
            if "Status:" in line:
                status = line.split(":", 1)[1].strip()
                continue
            m = _UFW_RULE_RE.match(line)
            if m:
                num, to, action, direction, from_addr = m.groups()
                rules.append({
                    "num": int(num),
                    "to": to.strip(),
                    "action": action.upper(),
                    "direction": (direction or "").strip() or "IN",
                    "from": from_addr.strip(),
                })
        return {"status": status, "rules": rules, "total": len(rules)}
    except Exception as e:
        logger.error(f"Erro em /firewall/ufw: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ufw/rule")
async def add_ufw_rule(request: UFWRuleRequest):
    """Adiciona regra UFW (allow/deny/reject para IP ou porta)."""
    target = request.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="target não pode ser vazio")
    cmd = f"ufw {request.action} from {target} 2>&1"
    if re.match(r"^\d+(/\w+)?$", target):
        cmd = f"ufw {request.action} {target} 2>&1"
    try:
        stdout, _ = run_remote(cmd)
        logger.info(f"UFW add rule: {request.action} {target} -> {stdout.strip()}")
        return {"status": "success", "output": stdout.strip()}
    except Exception as e:
        logger.error(f"Erro em /firewall/ufw/rule POST: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/ufw/rule/{num}")
async def delete_ufw_rule(num: int):
    """Remove regra UFW pelo número (responde 'y' automaticamente)."""
    if num < 1:
        raise HTTPException(status_code=400, detail="Número de regra inválido")
    cmd = f"echo 'y' | ufw delete {num} 2>&1"
    try:
        stdout, _ = run_remote(cmd)
        logger.info(f"UFW delete rule {num}: {stdout.strip()}")
        return {"status": "success", "deleted": num, "output": stdout.strip()}
    except Exception as e:
        logger.error(f"Erro em /firewall/ufw/rule DELETE {num}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
