from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from modules.centurion.services.centurion_service import CenturionService

router = APIRouter(prefix="/centurions", tags=["centurions"])


class TestCenturionRequest(BaseModel):
    company_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


@router.post("/{centurion_id}/test")
async def test_centurion(centurion_id: str, payload: TestCenturionRequest, request: Request):
    disable_connections = bool(getattr(request.app.state, "disable_connections", False))
    if disable_connections:
        raise HTTPException(status_code=503, detail="connections disabled")

    db = getattr(request.app.state, "db", None)
    redis = getattr(request.app.state, "redis", None)
    if db is None or redis is None:
        raise HTTPException(status_code=503, detail="service not ready")

    service = CenturionService(db=db, redis=redis)
    try:
        return await service.test_centurion(company_id=payload.company_id, centurion_id=centurion_id, message=payload.message)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

