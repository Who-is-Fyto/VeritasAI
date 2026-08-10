# Active Learning & Self-Training Pipeline

Yo! Let's talk about the coolest loop in this project: how the app actually learns from its own users over time. We wanted to make sure the AI updates its rules without us having to manually retrain it on a laptop. Here's the layout of our self-training pipeline!

---

## 1. Capturing User Feedback

Whenever a user views an analysis report, we give them feedback buttons (like upvoting if the rating is accurate, or correcting the labels on specific highlighted sentences).
*   **Database Storage:** This feedback is saved inside MongoDB. It links the original text content, the model's rating, and the user's manual correction.
*   **The Dataset:** Over two or three weeks, this feedback acts as an annotated active learning dataset of edge cases (where the AI was wrong and a human corrected it).

---

## 2. The Background Training Scheduler

In `backend/app/services/trainer.py`, we set up an asynchronous background task.
*   **Cron Trigger:** In production, a task scheduler triggers `POST /api/v1/admin/train/trigger` every 2 weeks.
*   **Concurrency Locking:** To prevent the database from getting overloaded or running multiple GPU scripts at once, we wrapped the training logic inside `asyncio.Lock()`. If a training run is already active, other trigger calls are immediately ignored with a `"Training already in progress"` status message.

---

## 3. Training Execution (GPU vs. Fallback CPU)

The training script automatically detects the host hardware:
1.  **CUDA GPU Mode:** If a GPU is available, it pulls the user feedback dataset, tokenizes the phrases, and runs a 3-epoch sequence classification fine-tuning loop on our RoBERTa model. The new model weights are saved back to disk.
2.  **Fallback Heuristics Mode (CPU):** On low-resource environments (like standard CPU student hosting or local Docker containers), running PyTorch training would crash the system or take days. 
    *   **The Heuristic Solution:** Instead, the trainer analyzes the corrected terms and adjusts word credibility weights inside `data/heuristic_weights.json`.
    *   **Hot-Reloading Patterns:** The `linguistic.py` service hot-reloads these updated weights on startup/request, dynamically compiling fresh regex matching patterns.

---

## 4. UI Dashboard Status Polling

In the Profile tab, we built a progress tracker. When training starts, the frontend polls the backend status every 1.5 seconds. It displays:
*   Pipeline status (e.g. `training` or `idle`)
*   Current training loss
*   Epoch progress (e.g., `Epoch 1/3`)
*   Last run timestamp and weight presence flag

This makes the system feel completely alive and reactive!

---

*BSc IT Dissertation Notes — Michael Mazhambe*
