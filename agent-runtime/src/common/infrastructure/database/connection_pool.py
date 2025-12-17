import asyncpg


class ConnectionPool:
    def __init__(self, dsn: str, *, min_size: int = 1, max_size: int = 5):
        self._dsn = dsn
        self._min_size = min_size
        self._max_size = max_size
        self._pool: asyncpg.Pool | None = None

    async def start(self) -> None:
        if self._pool:
            return
        self._pool = await asyncpg.create_pool(dsn=self._dsn, min_size=self._min_size, max_size=self._max_size)

    @property
    def pool(self) -> asyncpg.Pool:
        if not self._pool:
            raise RuntimeError("ConnectionPool not started")
        return self._pool

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

