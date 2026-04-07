import logging
import os
import threading
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_SSH_HOST = os.getenv("SSH_HOST", "")
_SSH_PORT = int(os.getenv("SSH_PORT", "22"))
_SSH_USER = os.getenv("SSH_USER", "root")
_SSH_PASSWORD = os.getenv("SSH_PASSWORD", "")

_client_lock = threading.Lock()
_ssh_client = None


def _get_client():
    global _ssh_client
    import paramiko

    with _client_lock:
        if _ssh_client is not None:
            try:
                transport = _ssh_client.get_transport()
                if transport and transport.is_active():
                    return _ssh_client
            except Exception:
                pass
            try:
                _ssh_client.close()
            except Exception:
                pass
            _ssh_client = None

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=_SSH_HOST,
            port=_SSH_PORT,
            username=_SSH_USER,
            password=_SSH_PASSWORD,
            timeout=15,
            banner_timeout=15,
            auth_timeout=15,
            look_for_keys=False,
            allow_agent=False,
        )
        _ssh_client = client
        logger.info(f"SSH conectado em {_SSH_HOST}:{_SSH_PORT}")
        return client


def run_remote(command: str) -> tuple[str, str]:
    """Executa comando na VPS via SSH (Paramiko)."""
    if not _SSH_HOST:
        logger.warning("SSH_HOST não configurado — pulando comando remoto")
        return "", "SSH_HOST not set"
    try:
        client = _get_client()
        _, stdout, stderr = client.exec_command(command, timeout=30)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return out, err
    except Exception as e:
        logger.error(f"Erro SSH ao executar comando: {e}")
        with _client_lock:
            global _ssh_client
            try:
                if _ssh_client:
                    _ssh_client.close()
            except Exception:
                pass
            _ssh_client = None
        return "", str(e)
