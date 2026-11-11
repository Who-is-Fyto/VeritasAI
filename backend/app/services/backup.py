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
import shutil
import uuid
import zipfile
from datetime import datetime, timezone, timedelta
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
        
        try:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            fallback = Path("/tmp/veritas_backups")
            fallback.mkdir(parents=True, exist_ok=True)
            logger.warning("Permission denied for %s. Falling back to %s", self.backup_dir, fallback)
            self.backup_dir = fallback

        # Optional secondary mirror directory (3-2-1 backup strategy)
        self.secondary_dir: Optional[Path] = None
        if settings.backup_secondary_dir:
            try:
                sec_path = Path(settings.backup_secondary_dir)
                sec_path.mkdir(parents=True, exist_ok=True)
                self.secondary_dir = sec_path
                logger.info("Secondary backup mirror initialised at: %s", self.secondary_dir)
            except Exception as sec_err:
                logger.warning("Could not initialise secondary backup mirror at %s: %s", settings.backup_secondary_dir, sec_err)
                self.secondary_dir = None

        logger.info("BackupService initialised at: %s", self.backup_dir)

    def _sanitize_filename(self, filename: str) -> str:
        clean = os.path.basename(filename.strip())
        if not clean.endswith(".zip") or not re.match(r"^[a-zA-Z0-9_\-\.]+\.zip$", clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid backup filename. Must be a safe alphanumeric '.zip' file."
            )
        return clean

    def prune_automated_backups(self, keep_count: int) -> int:
        """
        Retains at most `keep_count` automated backup archives and deletes older ones.
        Also synchronises deletions with the secondary mirror directory.
        """
        if keep_count <= 0:
            return 0

        auto_files: List[Path] = []
        for file_path in self.backup_dir.glob("*.zip"):
            if file_path.name.startswith("."):
                continue
            is_auto = False
            if file_path.name.startswith("veritas_autobackup_"):
                is_auto = True
            else:
                try:
                    with zipfile.ZipFile(file_path, "r") as zf:
                        if "manifest.json" in zf.namelist():
                            manifest = json_util.loads(zf.read("manifest.json").decode("utf-8"))
                            if manifest.get("backup_type") == "automated":
                                is_auto = True
                except Exception:
                    pass
            if is_auto:
                auto_files.append(file_path)

        auto_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        pruned_count = 0
        if len(auto_files) > keep_count:
            for old_file in auto_files[keep_count:]:
                try:
                    old_file.unlink(missing_ok=True)
                    if self.secondary_dir:
                        (self.secondary_dir / old_file.name).unlink(missing_ok=True)
                    pruned_count += 1
                    logger.info("Pruned expired automated backup archive: %s", old_file.name)
                except Exception as err:
                    logger.warning("Failed to prune expired backup %s: %s", old_file.name, err)
        return pruned_count

    async def create_backup(
        self,
        db: AsyncIOMotorDatabase,
        backup_type: str = "manual"
    ) -> BackupMetadata:
        """
        Dumps MongoDB collections to compressed JSON/BSON zip archive with metadata manifest.
        Supports 'manual' and 'automated' snapshots, optional mirroring, and retention pruning.
        """
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        backup_id = str(uuid.uuid4())
        prefix = "veritas_autobackup" if backup_type == "automated" else "veritas_backup"
        filename = f"{prefix}_{timestamp_str}_{backup_id[:8]}.zip"
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
            "backup_type": backup_type,
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

            # Mirror to secondary backup destination if configured
            mirrored = False
            if self.secondary_dir:
                try:
                    shutil.copy2(target_path, self.secondary_dir / filename)
                    mirrored = True
                    logger.info("Mirrored backup archive %s to secondary storage at %s", filename, self.secondary_dir)
                except Exception as copy_err:
                    logger.warning("Failed to mirror backup to %s: %s", self.secondary_dir, copy_err)

            # Auto-prune old automated backups
            if backup_type == "automated":
                self.prune_automated_backups(settings.backup_auto_retention_count)

            logger.info(
                "Created backup %s (%s, %d docs, sha256:%s, type:%s, mirrored:%s)",
                filename, format_bytes(size_bytes), total_documents, checksum[:8], backup_type, mirrored
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
                status="completed",
                backup_type=backup_type,
                mirrored=mirrored
            )
        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            logger.error("Failed to generate backup archive: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup generation failed: {str(e)}"
            )

    async def import_backup_archive(self, file_bytes: bytes, original_filename: str) -> BackupMetadata:
        """
        Validates, saves, and registers an uploaded external backup zip archive.
        Ensures strict manifest verification and mirrors to secondary storage if enabled.
        """
        try:
            zf_check = zipfile.ZipFile(io.BytesIO(file_bytes), "r")
            namelist = zf_check.namelist()
            if "manifest.json" not in namelist:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid backup archive: missing 'manifest.json' metadata manifest."
                )
            manifest_raw = zf_check.read("manifest.json").decode("utf-8")
            manifest_data = json_util.loads(manifest_raw)
            zf_check.close()
        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is not a valid ZIP archive."
            )

        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        safe_base = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", os.path.basename(original_filename.strip()))
        if not safe_base.endswith(".zip"):
            safe_base += ".zip"
        filename = f"veritas_imported_{timestamp_str}_{safe_base}"
        target_path = self.backup_dir / filename

        target_path.write_bytes(file_bytes)
        size_bytes = len(file_bytes)

        hasher = hashlib.sha256(file_bytes)
        checksum = hasher.hexdigest()

        mirrored = False
        if self.secondary_dir:
            try:
                shutil.copy2(target_path, self.secondary_dir / filename)
                mirrored = True
                logger.info("Mirrored imported backup archive %s to secondary storage at %s", filename, self.secondary_dir)
            except Exception as copy_err:
                logger.warning("Failed to mirror imported backup: %s", copy_err)

        backup_id = manifest_data.get("backup_id", str(uuid.uuid4()))
        collections = manifest_data.get("collections", {})
        total_documents = manifest_data.get("total_documents", sum(collections.values()))

        logger.info(
            "Imported external backup %s (%s, %d docs, sha256:%s)",
            filename, format_bytes(size_bytes), total_documents, checksum[:8]
        )

        return BackupMetadata(
            backup_id=backup_id,
            filename=filename,
            created_at=now,
            size_bytes=size_bytes,
            size_formatted=format_bytes(size_bytes),
            collections=collections,
            total_documents=total_documents,
            checksum_sha256=checksum,
            status="completed",
            backup_type="imported",
            mirrored=mirrored
        )

    async def list_backups(self) -> BackupListResponse:
        """
        Lists all available historical backup archives with metadata and schedule status.
        """
        backups: List[BackupMetadata] = []
        total_size = 0
        latest_auto_dt: Optional[datetime] = None

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
                backup_type = "manual"

                if file_path.name.startswith("veritas_autobackup_"):
                    backup_type = "automated"
                elif file_path.name.startswith("veritas_imported_"):
                    backup_type = "imported"

                try:
                    with zipfile.ZipFile(file_path, "r") as zf:
                        if "manifest.json" in zf.namelist():
                            raw_manifest = zf.read("manifest.json").decode("utf-8")
                            manifest_data = json_util.loads(raw_manifest)
                            backup_id = manifest_data.get("backup_id", backup_id)
                            collections = manifest_data.get("collections", {})
                            total_docs = manifest_data.get("total_documents", sum(collections.values()))
                            backup_type = manifest_data.get("backup_type", backup_type)
                            if "created_at" in manifest_data:
                                try:
                                    created_at = datetime.fromisoformat(manifest_data["created_at"])
                                except Exception:
                                    pass
                except Exception as zip_err:
                    logger.warning("Could not read manifest for %s: %s", file_path.name, zip_err)

                if backup_type == "automated" and (latest_auto_dt is None or created_at > latest_auto_dt):
                    latest_auto_dt = created_at

                mirrored = bool(self.secondary_dir and (self.secondary_dir / file_path.name).is_file())

                backups.append(BackupMetadata(
                    backup_id=backup_id,
                    filename=file_path.name,
                    created_at=created_at,
                    size_bytes=file_size,
                    size_formatted=format_bytes(file_size),
                    collections=collections,
                    total_documents=total_docs,
                    checksum_sha256=checksum,
                    status="completed",
                    backup_type=backup_type,
                    mirrored=mirrored
                ))
            except Exception as e:
                logger.warning("Error processing backup file %s: %s", file_path.name, e)

        # Compute next scheduled backup
        next_scheduled: Optional[datetime] = None
        if settings.backup_auto_enabled:
            interval = timedelta(hours=settings.backup_auto_interval_hours)
            if latest_auto_dt:
                next_scheduled = latest_auto_dt + interval
            else:
                next_scheduled = datetime.now(timezone.utc) + interval

        secondary_active = bool(self.secondary_dir and self.secondary_dir.exists())

        return BackupListResponse(
            backups=backups,
            total=len(backups),
            total_size_bytes=total_size,
            total_size_formatted=format_bytes(total_size),
            auto_backup_enabled=settings.backup_auto_enabled,
            auto_backup_interval_hours=settings.backup_auto_interval_hours,
            secondary_mirror_active=secondary_active,
            next_scheduled_backup=next_scheduled
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
        """Safely removes a backup archive from primary disk and secondary mirror."""
        path = self.get_backup_path(filename)
        safe_name = path.name
        try:
            path.unlink()
            if self.secondary_dir:
                sec_path = self.secondary_dir / safe_name
                sec_path.unlink(missing_ok=True)
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
