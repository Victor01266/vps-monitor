import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import stats, security, firewall, static
from app.websocket_manager import manager
from app.log_watcher import start_watcher, stop_watcher

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    start_watcher(loop)
    yield
    stop_watcher()


app = FastAPI(
    title="VPS Monitor API",
    description="API de monitoramento corporativo de VPS — contêineres, segurança e firewall.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stats.router)
app.include_router(security.router)
app.include_router(firewall.router)
app.include_router(static.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vps-monitor-api"}


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket de alertas em tempo real.
    Emite eventos de tipo:
      - security_alert: tentativas de login, brute force, bans do Fail2Ban
    """
    await manager.connect(websocket)
    try:
        while True:
            # Mantém a conexão viva; dados chegam via broadcast do log_watcher
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
