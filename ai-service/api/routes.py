from fastapi import APIRouter, HTTPException
from models.schemas import OrchestratorRequest, OrchestratorResponse
from agents import orchestrator
import traceback

router = APIRouter()


@router.post("/orchestrate", response_model=OrchestratorResponse)
async def orchestrate_endpoint(req: OrchestratorRequest):
    try:
        return await orchestrator.orchestrate(req)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
