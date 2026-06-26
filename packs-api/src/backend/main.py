import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from src.backend.routers.kit_packs import router as kit_router
from src.backend.routers.loot_packs import router as loot_router
from src.backend.utils.config import settings
from src.backend.utils.database_manager import DatabaseManager

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = DatabaseManager()
    await db.init_pool()
    log.info("packs_api_started port=%d", settings.packs_api_port)
    yield
    await db.close()
    log.info("packs_api_stopped")


app = FastAPI(title="Hytale Packs API", version="1.0.0", lifespan=lifespan)

app.include_router(kit_router, prefix="/api/v1")
app.include_router(loot_router, prefix="/api/v1")


@app.get("/health")
async def health():
    db = DatabaseManager()
    async with db.get_connection() as conn:
        await conn.execute("SELECT 1")
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    log.error("unexpected_error error=%s path=%s", str(exc), request.url.path)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
