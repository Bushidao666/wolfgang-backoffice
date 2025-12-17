from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "agent-runtime",
    }


@router.get("/ready")
async def ready(request: Request):
    disable_connections = bool(getattr(request.app.state, "disable_connections", False))
    if disable_connections:
        return {"status": "ok", "service": "agent-runtime", "ready": True, "checks": {"connections": "disabled"}}

    db = getattr(request.app.state, "db", None)
    redis = getattr(request.app.state, "redis", None)

    checks: dict[str, str] = {}
    ok = True

    try:
        if db is None:
            raise RuntimeError("db not initialized")
        row = await db.fetchrow("select 1 as ok")
        checks["db"] = "ok" if row and row["ok"] == 1 else "failed"
        ok = ok and checks["db"] == "ok"
    except Exception:
        checks["db"] = "failed"
        ok = False

    try:
        if redis is None:
            raise RuntimeError("redis not initialized")
        pong = await redis.client.ping()
        checks["redis"] = "ok" if pong else "failed"
        ok = ok and checks["redis"] == "ok"
    except Exception:
        checks["redis"] = "failed"
        ok = False

    return {
        "status": "ok" if ok else "degraded",
        "service": "agent-runtime",
        "ready": ok,
        "checks": checks,
    }
