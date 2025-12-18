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
    connection_mode = getattr(request.app.state, "connection_mode", None)
    if connection_mode == "disabled":
        return {"status": "ok", "service": "agent-runtime", "ready": True, "checks": {"connections": "disabled"}}

    connection_error_type = getattr(request.app.state, "connection_error_type", None)

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

    payload = {
        "status": "ok" if ok else "degraded",
        "service": "agent-runtime",
        "ready": ok,
        "connection_mode": connection_mode,
        "checks": checks,
    }
    if connection_error_type:
        payload["connection_error_type"] = str(connection_error_type)
    return payload
