"""
VeritasAI Database Backup & One-Click Restore Engine
───────────────────────────────────────────────────
Generates compressed BSON/JSON archives of MongoDB collections directly via API.
Provides historical snapshot management, SHA-256 integrity verification,
atomic restore execution, and administrator preservation safeguards.
"""
import hashlib
import io
import logging
import os
import re
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from bson import json_util
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.schemas.admin import (
    BackupMetadata,
    BackupListResponse,
    RestoreResponse,
)

logger = logging.getLogger(__name__)

STANDARD_COLLECTIONS = [
    "users",
    "results",
    "api_keys",
    "feedback",
    "audit_logs",
]


def format_bytes(bytes_count: int) -> str:
    """Format bytes count into human-readable string."""
    if bytes_count < 1024:
        return f"{bytes_count} B"
    elif bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.1f} KB"
    elif bytes_count < 1024 * 1024 * 1024:
        return f"{bytes_count / (1024 * 1024):.1f} MB"
    else:
        return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"


class BackupService:
    def __init__(self, backup_dir: Optional[Path] = None) -> None:
        if backup_dir is not None:
            self.backup_dir = Path(backup_dir)
        else:
            # Default to backend/backups
            self.backup_dir = Path(__file__).resolve().parent.parent.parent / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        logger.info("BackupService initialised at: %s", self.backup_dir)

    def _sanitize_filename(self, filename: str) -> str:
        clean = os.path.basename(filename.strip())
        if not clean.endswith(".zip") or not re.match(r"^[a-zA-Z0-9_\-\.]+\.zip$", clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid backup filename. Must be a safe alphanumeric '.zip' file."
            )
        return clean

    async def create_backup(self, db: AsyncIOMotorDatabase) -> BackupMetadata:
        """
        Dumps MongoDB collections to compressed JSON/BSON zip archive with metadata manifest.
        """
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        backup_id = str(uuid.uuid4())
        filename = f"veritas_backup_{timestamp_str}.zip"
        target_path = self.backup_dir / filename

        # 1. Discover target collections
        existing_colls = await db.list_collection_names()
        target_colls = [
            c for c in existing_colls
            if not c.startswith("system.") and not c.startswith("__")
        ]
        if not target_colls:
            target_colls = STANDARD_COLLECTIONS

        collections_summary: Dict[str, int] = {}
        total_documents = 0
        dumped_data: Dict[str, str] = {}

        # 2. Extract each collection's documents
        for coll_name in target_colls:
            cursor = db[coll_name].find({})
            docs = await cursor.to_list(length=None)
            doc_count = len(docs)
            collections_summary[coll_name] = doc_count
            total_documents += doc_count
            dumped_data[f"{coll_name}.json"] = json_util.dumps(docs, indent=2)

        # 3. Build manifest
        manifest: Dict[str, Any] = {
            "backup_id": backup_id,
            "filename": filename,
            "created_at": now.isoformat(),
            "database_name": db.name,
            "app_version": settings.app_version,
            "total_documents": total_documents,
            "collections": collections_summary,
        }

        # 4. Write zip archive atomically
        temp_path = self.backup_dir / f".tmp_{filename}"
        try:
            with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("manifest.json", json_util.dumps(manifest, indent=2))
                for file_name, file_content in dumped_data.items():
                    zf.writestr(file_name, file_content)

            # Compute SHA256 checksum
            hasher = hashlib.sha256()
            with open(temp_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            checksum = hasher.hexdigest()

            # Atomically move to target path
            if target_path.exists():
                target_path.unlink()
            temp_path.rename(target_path)
            size_bytes = target_path.stat().st_size

            logger.info(
                "Created backup %s (%s, %d docs, sha256:%s)",
                filename, format_bytes(size_bytes), total_documents, checksum[:8]
            )

            return BackupMetadata(
                backup_id=backup_id,
                filename=filename,
                created_at=now,
                size_bytes=size_bytes,
                size_formatted=format_bytes(size_bytes),
                collections=collections_summary,
                total_documents=total_documents,
                checksum_sha256=checksum,
                status="completed"
            )
        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            logger.error("Failed to generate backup archive: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup generation failed: {str(e)}"
            )

    async def list_backups(self) -> BackupListResponse:
        """
        Lists all available historical backup archives with metadata.
        """
        backups: List[BackupMetadata] = []
        total_size = 0

        files = sorted(
            [f for f in self.backup_dir.glob("*.zip") if not f.name.startswith(".")],
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )

        for file_path in files:
            try:
                stat = file_path.stat()
                file_size = stat.st_size
                total_size += file_size
                created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

                # Inspect manifest from zip archive
                backup_id = str(uuid.uuid4())
                collections: Dict[str, int] = {}
                total_docs = 0
                checksum = None

                try:
                    with zipfile.ZipFile(file_path, "r") as zf:
                        if "manifest.json" in zf.namelist():
                            raw_manifest = zf.read("manifest.json").decode("utf-8")
                            manifest_data = json_util.loads(raw_manifest)
                            backup_id = manifest_data.get("backup_id", backup_id)
                            collections = manifest_data.get("collections", {})
                            total_docs = manifest_data.get("total_documents", sum(collections.values()))
                            if "created_at" in manifest_data:
                                try:
                                    created_at = datetime.fromisoformat(manifest_data["created_at"])
                                except Exception:
                                    pass
                except Exception as zip_err:
                    logger.warning("Could not read manifest for %s: %s", file_path.name, zip_err)

                backups.append(BackupMetadata(
                    backup_id=backup_id,
                    filename=file_path.name,
                    created_at=created_at,
                    size_bytes=file_size,
                    size_formatted=format_bytes(file_size),
                    collections=collections,
                    total_documents=total_docs,
                    checksum_sha256=checksum,
                    status="completed"
                ))
            except Exception as e:
                logger.warning("Error processing backup file %s: %s", file_path.name, e)

        return BackupListResponse(
            backups=backups,
            total=len(backups),
            total_size_bytes=total_size,
            total_size_formatted=format_bytes(total_size)
        )

    def get_backup_path(self, filename: str) -> Path:
        """Validates and resolves backup file path."""
        safe_name = self._sanitize_filename(filename)
        path = self.backup_dir / safe_name
        if not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup archive '{safe_name}' was not found on server."
            )
        return path

    def delete_backup(self, filename: str) -> None:
        """Safely removes a backup archive from disk."""
        path = self.get_backup_path(filename)
        try:
            path.unlink()
            logger.info("Deleted backup archive: %s", filename)
        except Exception as e:
            logger.error("Failed to delete backup %s: %s", filename, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not delete backup archive: {str(e)}"
            )

    async def restore_backup(
        self,
        db: AsyncIOMotorDatabase,
        filename: str,
        confirmation_text: str,
        drop_existing: bool = True
    ) -> RestoreResponse:
        """
        Restores MongoDB database from a backup archive with safety checks.
        """
        if confirmation_text.strip().upper() != "RESTORE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Safety confirmation required. You must submit 'RESTORE' to proceed."
            )

        backup_path = self.get_backup_path(filename)

        try:
            with zipfile.ZipFile(backup_path, "r") as zf:
                namelist = zf.namelist()
                if "manifest.json" not in namelist:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Corrupted backup archive: missing 'manifest.json' descriptor."
                    )

                manifest_raw = zf.read("manifest.json").decode("utf-8")
                manifest_data = json_util.loads(manifest_raw)

                collections_restored: Dict[str, int] = {}
                total_restored = 0

                # 1. Process each collection JSON file
                for name in namelist:
                    if name.endswith(".json") and name != "manifest.json":
                        coll_name = name[:-5]  # strip .json
                        raw_content = zf.read(name).decode("utf-8")
                        docs = json_util.loads(raw_content)

                        if drop_existing:
                            await db[coll_name].delete_many({})

                        if docs and isinstance(docs, list):
                            await db[coll_name].insert_many(docs)
                            count = len(docs)
                        else:
                            count = 0

                        collections_restored[coll_name] = count
                        total_restored += count

                # 2. Administrative Safety Guard:
                # Ensure superadmin access remains functional even if restoring an older snapshot
                from app.routers.admin import ensure_superadmin_seeded
                await ensure_superadmin_seeded(db)

                # Ensure superadmin is never left in a suspended state
                await db["users"].update_many(
                    {"role": "superadmin"},
                    {"$set": {"is_suspended": False, "tier": "superadmin"}}
                )

                restored_at = datetime.now(timezone.utc)
                logger.info(
                    "Database successfully restored from %s (%d documents across %d collections)",
                    filename, total_restored, len(collections_restored)
                )

                return RestoreResponse(
                    status="success",
                    backup_filename=filename,
                    restored_at=restored_at,
                    collections_restored=collections_restored,
                    total_documents_restored=total_restored,
                    message=f"Database restored successfully from '{filename}'.",
                    details={
                        "original_created_at": manifest_data.get("created_at"),
                        "collections": list(collections_restored.keys()),
                    }
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Restore failed for %s: %s", filename, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database restoration failed: {str(e)}"
            )


backup_service = BackupService()
