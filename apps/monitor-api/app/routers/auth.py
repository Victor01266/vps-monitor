import os
import time
import hmac
import hashlib
import base64
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

ADMIN_USER = os.getenv("MONITOR_USER", "admin")
ADMIN_PASSWORD = os.getenv("MONITOR_PASSWORD", "")
SECRET_KEY = os.getenv("MONITOR_SECRET", "change-me-in-production")
TOKEN_TTL = 60 * 60 * 12  # 12 horas


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_in: int


def _sign(payload: dict) -> str:
    data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}.{sig}"


def _verify(token: str) -> dict | None:
    try:
        data, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Autenticação não configurada no servidor")
    if req.username != ADMIN_USER or req.password != ADMIN_PASSWORD:
        logger.warning("Tentativa de login inválida para usuário '%s'", req.username)
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    payload = {"sub": req.username, "exp": time.time() + TOKEN_TTL}
    token = _sign(payload)
    return LoginResponse(token=token, expires_in=TOKEN_TTL)


@router.get("/verify")
async def verify(token: str):
    payload = _verify(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return {"valid": True, "username": payload.get("sub")}
