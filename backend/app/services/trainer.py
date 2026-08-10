"""
Self-Training Service
──────────────────────
Periodic/on-demand active learning pipeline.
Pulls user feedback from MongoDB, constructs training datasets, fine-tunes
the RoBERTa classification model (or fallback heuristics), and reloads the pipeline.
"""
import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings
from app.services.linguistic import linguistic_service

logger = logging.getLogger(__name__)

# Fallback heuristic weights storage inside the workspace
HEURISTIC_WEIGHTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "heuristic_weights.json"
)

# Active training task status tracker
training_status: Dict[str, Any] = {
    "status": "idle",  # "idle" | "training" | "completed" | "failed"
    "last_run": None,
    "error_message": None,
    "samples_trained": 0,
    "epoch": 0,
    "loss": 0.0,
}

training_lock = asyncio.Lock()


class TrainerService:
    """Manages active self-training loops for the ML classifier."""

    async def get_status(self) -> Dict[str, Any]:
        """Query current status of the training pipeline."""
        return {
            **training_status,
            "weights_file_exists": os.path.exists(HEURISTIC_WEIGHTS_PATH),
        }

    async def trigger_training(self, db: AsyncIOMotorDatabase) -> None:
        """Trigger background training if not already active."""
        if training_lock.locked():
            logger.warning("Self-training is already running.")
            return

        async with training_lock:
            training_status["status"] = "training"
            training_status["error_message"] = None
            training_status["epoch"] = 0
            training_status["loss"] = 0.0
            
            logger.info("Initiating VeritasAI self-training cycle...")
            
            try:
                # 1. Fetch user feedback datasets from MongoDB
                cursor = db["results"].find({"feedback": {"$ne": None}})
                feedback_records = await cursor.to_list(length=500)
                
                # If there are fewer than 3 samples, bootstrap with a small mock dataset
                # so the user can demonstrate the training loop immediately.
                if len(feedback_records) < 3:
                    logger.info("Low feedback samples. Bootstrapping training with system priors.")
                    feedback_records = feedback_records + self._get_bootstrap_samples()

                training_status["samples_trained"] = len(feedback_records)
                
                # 2. Split training paths: real ML fine-tuning vs heuristic weights tuning
                from app.services.linguistic import TORCH_AVAILABLE
                if TORCH_AVAILABLE:
                    await self._fine_tune_roberta(feedback_records)
                else:
                    await self._tune_heuristics(feedback_records)

                # 3. Reload the scoring pipeline
                linguistic_service.__init__()
                
                training_status["status"] = "completed"
                training_status["last_run"] = datetime.utcnow().isoformat()
                logger.info("VeritasAI self-training completed successfully.")
                
            except Exception as e:
                logger.exception("Self-training failed")
                training_status["status"] = "failed"
                training_status["error_message"] = str(e)
                training_status["last_run"] = datetime.utcnow().isoformat()

    def _get_bootstrap_samples(self) -> list[dict]:
        """Standard mock dataset for training bootstrapping."""
        return [
            {
                "content": "A breakthrough double-blind study published in Nature shows that regular sleep cycles significantly improve memory retention in adolescents.",
                "feedback": {"corrected_label": "credible", "corrected_score": 90.0}
            },
            {
                "content": "Shocking leaks reveal that secret government antennas are broadcasting rays that control mindwaves of citizens across major cities.",
                "feedback": {"corrected_label": "misinformation", "corrected_score": 15.0}
            },
            {
                "content": "Official reports from the Central Bank confirm interest rates will rise by 0.5% next quarter to combat inflation pressures.",
                "feedback": {"corrected_label": "credible", "corrected_score": 85.0}
            },
            {
                "content": "Miracle juice drops made from rare mountain orchids have been proven to cure all cancers in less than three days without side effects.",
                "feedback": {"corrected_label": "misinformation", "corrected_score": 10.0}
            }
        ]

    async def _fine_tune_roberta(self, records: list[dict]) -> None:
        """Fine-tune the local transformers model using PyTorch."""
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        
        logger.info("Fine-tuning sequence classifier model: %s", settings.model_path)
        
        # Load active model & tokenizer
        try:
            tokenizer = AutoTokenizer.from_pretrained(settings.model_path)
            model = AutoModelForSequenceClassification.from_pretrained(settings.model_path)
        except Exception as e:
            logger.warning(
                "Could not load model from path %s: %s. Falling back to public model 'roberta-base'.",
                settings.model_path,
                e
            )
            tokenizer = AutoTokenizer.from_pretrained("roberta-base")
            model = AutoModelForSequenceClassification.from_pretrained("roberta-base", num_labels=6, ignore_mismatched_sizes=True)


        
        # Binary or Multi classification mapping
        num_labels = model.config.num_labels
        
        texts = []
        labels = []
        for r in records:
            texts.append(r["content"])
            label_str = r["feedback"]["corrected_label"]
            if label_str == "credible":
                # Label 1 is Real for binary, Label 5 is True for LIAR dataset
                labels.append(1 if num_labels == 2 else 5)
            else:
                # Label 0 is Fake for binary, Label 1 is False for LIAR dataset
                labels.append(0 if num_labels == 2 else 1)
        
        # Tokenize dataset
        inputs = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
        labels_tensor = torch.tensor(labels)
        
        # Simple local training loop (3 epochs) to minimize package complexity
        optimizer = torch.optim.AdamW(model.parameters(), lr=5e-6)
        model.train()
        
        dataset_size = len(texts)
        batch_size = min(4, dataset_size)
        
        for epoch in range(3):
            training_status["epoch"] = epoch + 1
            epoch_loss = 0.0
            
            # Simple batch loop
            for i in range(0, dataset_size, batch_size):
                optimizer.zero_grad()
                
                batch_texts = {k: v[i:i+batch_size] for k, v in inputs.items()}
                batch_labels = labels_tensor[i:i+batch_size]
                
                outputs = model(**batch_texts, labels=batch_labels)
                loss = outputs.loss
                
                loss.backward()
                optimizer.step()
                
                epoch_loss += loss.item()
                
            avg_loss = epoch_loss / (dataset_size / batch_size)
            training_status["loss"] = round(avg_loss, 4)
            logger.info("Epoch %d/3 - Loss: %.4f", epoch + 1, avg_loss)
            await asyncio.sleep(0.5)  # yield to event loop
            
        # Save model checkpoint
        try:
            os.makedirs(settings.model_path, exist_ok=True)
            model.save_pretrained(settings.model_path)
            tokenizer.save_pretrained(settings.model_path)
            logger.info("Updated sequence classifier checkpoint saved to %s", settings.model_path)
        except OSError as e:
            import tempfile
            fallback_save_path = os.path.join(tempfile.gettempdir(), "roberta-fakenews-checkpoint")
            logger.warning(
                "Could not save model to %s due to file permissions: %s. Saving model to temporary folder: %s",
                settings.model_path,
                e,
                fallback_save_path
            )
            os.makedirs(fallback_save_path, exist_ok=True)
            model.save_pretrained(fallback_save_path)
            tokenizer.save_pretrained(fallback_save_path)


    async def _tune_heuristics(self, records: list[dict]) -> None:
        """Tuning local rule-based heuristics database when PyTorch is not present."""
        logger.info("Running heuristics optimization tuning...")
        
        # Load existing weights or create default structure
        weights = {
            "manipulative_phrases": ["shocking", "miracle", "leak", "secrets reveal", "mind control"],
            "credible_phrases": ["study published", "nature study", "peer-reviewed", "official reports", "interest rates"],
            "bias_factor": 1.0
        }
        
        if os.path.exists(HEURISTIC_WEIGHTS_PATH):
            try:
                with open(HEURISTIC_WEIGHTS_PATH, "r") as f:
                    weights = json.load(f)
            except Exception:
                pass

        # Simulate heuristic coefficient updates (epochs)
        for epoch in range(3):
            training_status["epoch"] = epoch + 1
            # Adjust weights based on feedback
            total_error = 0.0
            for r in records:
                content_lower = r["content"].lower()
                label = r["feedback"]["corrected_label"]
                score = r["feedback"].get("corrected_score", 50.0)
                
                # Simple passive learning: extract informative tokens
                words = [w for w in content_lower.split() if len(w) > 4 and w.isalnum()]
                for w in words[:5]:
                    if label == "misinformation" and w not in weights["manipulative_phrases"]:
                        weights["manipulative_phrases"].append(w)
                    elif label == "credible" and w not in weights["credible_phrases"]:
                        weights["credible_phrases"].append(w)
                
                # Mean Squared Error proxy
                total_error += (score - 50.0) ** 2
            
            training_status["loss"] = round(total_error / len(records), 2)
            await asyncio.sleep(0.5)

        # Save weights
        os.makedirs(os.path.dirname(HEURISTIC_WEIGHTS_PATH), exist_ok=True)
        with open(HEURISTIC_WEIGHTS_PATH, "w") as f:
            json.dump(weights, f, indent=2)
            
        logger.info("Updated heuristics database successfully saved to %s", HEURISTIC_WEIGHTS_PATH)


trainer_service = TrainerService()
