import re
import asyncio
import logging
import subprocess
import threading
from datetime import datetime
from app.config import LOG_PATHS
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

# Padrões de detecção de ataques nos logs
PATTERNS = {
    "brute_force": re.compile(
        r"Failed password for(?: invalid user)? (\S+) from ([\d.]+) port \d+"
    ),
    "invalid_user": re.compile(
        r"Invalid user (\S+) from ([\d.]+)"
    ),
    "accepted_login": re.compile(
        r"Accepted (?:password|publickey) for (\S+) from ([\d.]+) port \d+"
    ),
    "fail2ban_ban": re.compile(
        r"fail2ban\.actions\s+\[\d+\]: NOTICE\s+\[(\S+)\] Ban ([\d.]+)"
    ),
    "fail2ban_unban": re.compile(
        r"fail2ban\.actions\s+\[\d+\]: NOTICE\s+\[(\S+)\] Unban ([\d.]+)"
    ),
}

_watcher_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _sanitize(value: str) -> str:
    """Remove caracteres perigosos antes de exibir no dashboard."""
    return re.sub(r"[<>\"'%;()&+]", "", value)[:256]


def _parse_line(line: str, log_type: str) -> dict | None:
    for event_type, pattern in PATTERNS.items():
        match = pattern.search(line)
        if match:
            groups = [_sanitize(g) for g in match.groups()]
            payload: dict = {
                "event": event_type,
                "log": log_type,
                "raw": _sanitize(line.strip()),
                "timestamp": datetime.utcnow().isoformat(),
            }
            if event_type in ("brute_force", "invalid_user", "accepted_login"):
                payload["user"] = groups[0] if len(groups) > 0 else ""
                payload["ip"] = groups[1] if len(groups) > 1 else ""
            elif event_type in ("fail2ban_ban", "fail2ban_unban"):
                payload["jail"] = groups[0] if len(groups) > 0 else ""
                payload["ip"] = groups[1] if len(groups) > 1 else ""
            return payload
    return None


def _tail_logs_local(loop: asyncio.AbstractEventLoop):
    """Roda em thread separada fazendo tail -F localmente nos logs críticos."""
    import platform
    if platform.system() == "Windows":
        logger.warning("Log watcher local desabilitado no Windows (tail -F indisponível). Logs são monitorados via SSH na VPS.")
        return

    log_files = [p for p in [LOG_PATHS.get("auth"), LOG_PATHS.get("fail2ban")] if p]
    cmd = ["tail", "-F"] + log_files

    while not _stop_event.is_set():
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1,
            )
            logger.info("Log watcher local iniciado (tail -F).")

            current_log = "auth"
            for line in proc.stdout:  # type: ignore[union-attr]
                if _stop_event.is_set():
                    break
                line = line.rstrip()
                if line.startswith("==>") and "fail2ban" in line:
                    current_log = "fail2ban"
                elif line.startswith("==>") and "auth" in line:
                    current_log = "auth"
                else:
                    event = _parse_line(line, current_log)
                    if event:
                        asyncio.run_coroutine_threadsafe(
                            manager.broadcast("security_alert", event), loop
                        )
            proc.wait()
        except Exception as e:
            logger.error(f"Erro no log watcher local: {e}. Reiniciando em 10s...")
            _stop_event.wait(10)


def start_watcher(loop: asyncio.AbstractEventLoop):
    global _watcher_thread
    _stop_event.clear()
    _watcher_thread = threading.Thread(
        target=_tail_logs_local, args=(loop,), daemon=True, name="log-watcher"
    )
    _watcher_thread.start()
    logger.info("Log watcher iniciado.")


def stop_watcher():
    _stop_event.set()
    if _watcher_thread:
        _watcher_thread.join(timeout=5)
    logger.info("Log watcher encerrado.")
