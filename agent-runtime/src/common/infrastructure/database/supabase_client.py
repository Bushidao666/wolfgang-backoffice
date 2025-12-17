from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from .connection_pool import ConnectionPool


class SupabaseDb:
    def __init__(self, pool: ConnectionPool):
        self._pool = pool

    async def fetchrow(self, query: str, *args: Any):
        async with self._pool.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetch(self, query: str, *args: Any):
        async with self._pool.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def execute(self, query: str, *args: Any) -> str:
        async with self._pool.pool.acquire() as conn:
            return await conn.execute(query, *args)

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[Any]:
        async with self._pool.pool.acquire() as conn:
            async with conn.transaction():
                yield conn

