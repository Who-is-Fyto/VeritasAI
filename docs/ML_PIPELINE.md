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

All of this happens in parallel inside `backend/app/services/linguistic.py` so the user gets their response fast!

---

*BSc IT Dissertation Notes — Michael Mazhambe*
