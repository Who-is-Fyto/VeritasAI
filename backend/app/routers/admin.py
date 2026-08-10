"""
Admin Self-Training Router
GET  /api/v1/admin/train/status
POST /api/v1/admin/train/trigger
"""
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_db
from app.services.trainer import trainer_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get(
    "/train/status",
    summary="Get the current self-training loop execution status"
)
async def get_train_status():
    return await trainer_service.get_status()


@router.post(
    "/train/trigger",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the ML model sequence classification retrain pipeline"
)
async def trigger_training(
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    background_tasks.add_task(trainer_service.trigger_training, db)
    return {"status": "accepted", "message": "Self-training job dispatched in the background."}
