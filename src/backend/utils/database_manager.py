from contextlib import asynccontextmanager
from typing import AsyncGenerator, List, Optional

import asyncpg

from src.backend.utils.config import settings


class DatabaseManager:
    _instance = None
    _pool: Optional[asyncpg.Pool] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def init_pool(self) -> None:
        DatabaseManager._pool = await asyncpg.create_pool(
            settings.get_database_url(),
            min_size=2,
            max_size=10,
            command_timeout=30,
            server_settings={"application_name": settings.service_name},
        )

    async def close(self) -> None:
        if DatabaseManager._pool:
            await DatabaseManager._pool.close()
            DatabaseManager._pool = None

    async def get_pool(self) -> asyncpg.Pool:
        if DatabaseManager._pool is None:
            await self.init_pool()
        return DatabaseManager._pool

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[asyncpg.Connection, None]:
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                yield conn

    @staticmethod
    async def fetch_one(conn: asyncpg.Connection, query: str, *args) -> Optional[asyncpg.Record]:
        return await conn.fetchrow(query, *args)

    @staticmethod
    async def fetch_all(conn: asyncpg.Connection, query: str, *args) -> List[asyncpg.Record]:
        return await conn.fetch(query, *args)

    @staticmethod
    async def execute(conn: asyncpg.Connection, query: str, *args) -> str:
        return await conn.execute(query, *args)

    @staticmethod
    async def fetch_val(conn: asyncpg.Connection, query: str, *args):
        return await conn.fetchval(query, *args)
