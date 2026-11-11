# Linguistic Analysis & ML Pipeline (How the AI works)

Hey there! If you want to know how the machine learning pipeline under the hood of VeritasAI actually checks if text is legit or clickbait, you're in the right place. Let's break it down!

---

## 1. The Classifier Model (RoBERTa-base)

So, instead of just building a basic binary model (True/False is way too simple for real-world news), we fine-tuned **RoBERTa-base** (a super powerful transformer model from Hugging Face) on the **LIAR dataset**. 

### Why the LIAR dataset?
It has six distinct credibility classes:
1. `pants-fire` (absolute lies)
2. `false` (plain wrong)
3. `barely-true` (mostly misleading)
4. `half-true` (some truth, heavy spin)
5. `mostly-true` (factual, minor errors)
6. `true` (completely factual)

### How we map the probabilities
When you submit an article, the model tokenizes the text (caps it at 512 tokens so the server doesn't catch fire) and runs inference. It returns a probability distribution across all six classes.
*   **Credibility Index (0–100):** We sum the weights of `mostly-true` and `true` to get a base percentage of how factual the text is.
*   **AI Probability:** We sum the probability of the extreme fake classes (`pants-fire` + `false`) to flag potential machine-generated misinformation.

---

## 2. Explainable AI (XAI) & The Truth Map

Okay, this is the core contribution of my BSc dissertation! A simple score is cool, but journalists want to know *why* the AI flagged a specific sentence. So, we built the **Truth Map** (our XAI layer).

### How it works (LIME/Attention perturbation):
1. **Perturbation:** The service takes the input text, splits it into phrases or words, and does small modifications (perturbations) by hiding or removing words.
2. **Observe:** It runs these perturbed versions through our RoBERTa model to see how much the classification score drops or shifts.
3. **Weight:** If removing a phrase causes the "fake news" probability to drop drastically, that phrase is flagged as `manipulative` (red). If it is a solid declarative fact, it is flagged as `verified` (green).
4. **Highlights:** The frontend maps these scores to the text block dynamically so you can hover or click them to see the exact reasoning!

---

## 3. Stylometrics & Linguistic Flags

We also check if the writing style sounds like a robot or an angry Twitter bot. We calculate:
*   **Vocabulary Richness (TTR):** Type-Token Ratio. If a text keeps repeating the same 10 words, it's either spam, poorly written clickbait, or AI-generated stuff.
*   **Emotional Language Score:** Counts exclamation marks, all-caps strings, and hyper-sensationalist adjectives. Factual reporting is usually pretty dry, while fake news relies on emotional triggers.
*   **Passive Voice Ratio:** AI models love passive voice. Human writers tend to use active voice. If this ratio is super high, it raises stylistic flags.
*   **Cadence Variance & Burstiness:** Evaluates standard deviation of sentence lengths. For concise inputs ($\le 3$ sentences), the engine recognizes natural concise cadence without penalizing short factual passages.

---

## 4. Hybrid Ensemble Scoring Architecture

In earlier builds, linguistic credibility was computed as a naive `min(model_score, heuristic_score)`. If either signal produced an outlier (e.g. an out-of-domain historical summary tripping an edge case in the neural classifier), the entire linguistic dimension collapsed.

To resolve this, we implemented a calibrated Hybrid Ensemble in `backend/app/services/linguistic.py`:

```python
if heuristic_score >= 70.0 and model_score >= 45.0:
    # High-confidence factual syntax: blend 70% heuristic with 30% transformer
    credibility_score = (heuristic_score * 0.70) + (model_score * 0.30)
elif heuristic_score <= 30.0 or model_score <= 30.0:
    # Severe manipulation detected: retain strict minimum safety cap
    credibility_score = min(model_score, heuristic_score)
else:
    # Intermediate range: balanced 50/50 blend
    credibility_score = (model_score * 0.50) + (heuristic_score * 0.50)
```

This guarantees high stability: solid factual prose is rewarded, while genuine manipulation flags continue to enforce a strict minimum safety cap.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
