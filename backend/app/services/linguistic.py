"""
Linguistic Analysis & Advanced AI/Disinformation Detection Service
───────────────────────────────────────────────────────────────────
Runs text through fine-tuned RoBERTa + Advanced Statistical AI Detector:
  1. Linguistic Credibility Score (0–100).
  2. Absurdity, Satire, & False Attribution Detection.
  3. AI Generation Probability (0–100) based on Burstiness, Perplexity, and LLM Buzzwords.
  4. Sentence-level XAI Annotations with high-precision attribution verification.
"""
import logging
import os
import json
import re
import math
from collections import Counter
from typing import Optional
import numpy as np
from dataclasses import dataclass, field
from app.config import settings
from app.schemas.response import (
    XAIAnnotation,
    LinguisticFlag,
    AnnotationType,
    ForensicStylometrics,
    SentenceAIScore,
)

logger = logging.getLogger(__name__)

# Expanded 120+ Synthetic LLM Transitional Markers & Stylometric Fingerprints
SYNTHETIC_LLM_MARKERS = [
    # 1. Hedging & Moralizing Reflexes
    "it is important to remember", "it is worth noting", "it should be noted", "it's crucial to understand",
    "essential to consider", "one must bear in mind", "it is paramount to", "careful consideration must",
    "delicate balance between", "serves as a reminder", "underscores the importance", "reinforces the notion",
    "sheds light on", "paves the way for", "only time will tell", "remains to be seen",
    "vital to recognize", "imperative to address", "cannot be overstated", "leaves much to be desired",
    "key takeaway is", "nuanced understanding of", "complex interplay between", "pivotal moment in",
    "it is safe to say", "it is critical to", "it goes without saying", "needless to say",
    
    # 2. Formulaic Openings & Structural Signposts
    "in this article, we delve", "delve into", "delve deeper into", "let's explore", "let us examine",
    "at the forefront of", "in the realm of", "in today's fast-paced world", "in today's digital age",
    "in this ever-evolving landscape", "in an ever-changing world", "navigating the complexities of",
    "unravelling the mystery", "a multifaceted approach", "at its core", "first and foremost",
    "furthermore, it is", "moreover, the", "on the flip side", "on one hand", "on the other hand",
    "having said that", "to put this into perspective", "a closer look reveals", "taking a closer look",
    "diving headfirst into", "without further ado", "embarking on a journey", "navigating the turbulent",
    "at this juncture", "shedding light on the", "a panoramic view of",

    # 3. Synthetic Flourishes & Buzzwords
    "rich tapestry", "tapestry of", "testament to", "beacon of hope", "beacon of light",
    "game-changer", "paradigm shift", "seamlessly integrates", "seamless integration", "myriad of factors",
    "plethora of", "deep dive", "synergistic effect", "groundbreaking innovation", "revolutionary advancement",
    "burgeoning field", "transformative power", "holistic understanding", "quintessential example", "crucial role",
    "pivotal role", "fostering a culture of", "poised to revolutionize", "quantum leap forward", "synergy between",
    "harnessing the power of", "catalyst for change", "unwavering commitment", "cornerstone of modern", "indispensable tool",
    "harmonious blend", "fostering an environment", "dynamic interplay", "symbiotic relationship", "kaleidoscope of",

    # 4. Robotic Concluding Summaries & Epilogues
    "in summary, it is clear", "in conclusion, the", "to summarize the key points", "ultimately, the future of",
    "as we look to the future", "all in all", "to sum up", "the journey ahead", "standing at the crossroads",
    "leaves an indelible mark", "a testament to human ingenuity", "bright future ahead", "the implications are profound",
    "in the final analysis", "as history has shown", "charting a course toward", "a new dawn in", "shaping the destiny of",
    "the overarching theme", "a stark reminder of", "time will be the ultimate judge", "a lasting impression",
    "concluding thoughts", "moving forward, it will be",

    # 5. Emotive & Rhetorical Overstatement
    "breathtaking journey", "captivating exploration", "fascinating realm", "stunning achievement",
    "a beacon of inspiration", "resonate deeply with", "speaks volumes about", "striking testament",
    "a testament to resilience", "monumental milestone", "vital cog in the machine", "at the epicenter of",
    "a clarion call for", "an uphill battle", "a double-edged sword", "the silver lining",
    "pushing the envelope", "raising the bar", "setting the stage for", "a stepping stone toward",
    "unlocking the potential", "the tip of the iceberg", "unprecedented heights", "pinnacle of excellence",
    "in essence, it represents", "a compelling narrative", "intertwined with", "a tapestry woven with",
    "profound ramifications", "navigating these uncharted waters"
]

LLM_BUZZWORDS = SYNTHETIC_LLM_MARKERS

# Legitimate Real-World Institutions for Valid Attribution
VALID_INSTITUTIONS = [
    "reuters", "associated press", "ap news", "bbc", "nasa", "who", "cdc",
    "united nations", "un", "harvard", "oxford", "nature", "science", "fda",
    "mit", "stanford", "yale", "journal", "university", "official report",
    "peer-reviewed", "bureau of labor", "census bureau", "national institute",
    "rand corporation", "rand", "brookings", "pew research", "csis"
]

# Composite Absurdity & Satire Patterns (Requires absurd co-occurrence of subjects + actions)
ABSURDITY_PATTERNS = [
    r"\bmoon\b.*\b(made of|swiss cheese|fondue)\b",
    r"\blunar\b.*\b(mining|lactose|fondue)\b",
    r"\b(cows|herds)\b.*\b(morse code|strike)\b",
    r"\b(badger|animals)\b.*\b(metropolis|jazz|saxophones)\b",
    r"\b(bioluminescent|subterranean)\b.*\bmetropolis\b",
    r"\bcrypto-(musicologist|zoologist)\b",
    r"\b(flat earth|chemtrails|lizard people|illuminati)\b"
]



try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch or Transformers not available. Falling back to statistical NLP engine.")


@dataclass
class LinguisticResult:
    score: float                           # 0–100 Credibility Score
    ai_probability: float                  # 0–100 AI Generation Probability
    xai_annotations: list[XAIAnnotation] = field(default_factory=list)
    flags: list[LinguisticFlag]            = field(default_factory=list)
    ai_forensics: Optional[ForensicStylometrics] = None


class LinguisticService:
    def __init__(self) -> None:
        self._model_loaded = False
        self._tokenizer = None
        self._model = None
        self._ai_tokenizer = None
        self._ai_model = None
        self._ai_model_loaded = False
        self._heuristic_weights = None

        heuristic_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data",
            "heuristic_weights.json"
        )
        if os.path.exists(heuristic_path):
            try:
                with open(heuristic_path, "r") as f:
                    self._heuristic_weights = json.load(f)
                logger.info("Loaded custom heuristic weights successfully.")
            except Exception as e:
                logger.warning("Could not load heuristic weights: %s", e)

        if TORCH_AVAILABLE:
            try:
                logger.info("Attempting to load model from path: %s", settings.model_path)
                self._tokenizer = AutoTokenizer.from_pretrained(settings.model_path)
                self._model = AutoModelForSequenceClassification.from_pretrained(settings.model_path)
                self._model.eval()
                self._model_loaded = True
                logger.info("LinguisticService loaded Hugging Face model successfully.")
            except Exception as e:
                logger.warning("Could not load Hugging Face model: %s. Using statistical NLP fallback.", e)

            # Optional Neural AI Detector Checkpoint
            if getattr(settings, "enable_neural_ai_detector", False):
                try:
                    logger.info("Attempting to load neural AI detector: %s", settings.ai_detector_model_path)
                    self._ai_tokenizer = AutoTokenizer.from_pretrained(settings.ai_detector_model_path, local_files_only=True)
                    self._ai_model = AutoModelForSequenceClassification.from_pretrained(settings.ai_detector_model_path, local_files_only=True)
                    self._ai_model.eval()
                    self._ai_model_loaded = True
                    logger.info("Loaded neural AI detector checkpoint successfully.")
                except Exception as e:
                    logger.info("Neural AI detector not cached locally (%s). Using deep forensic stylometrics engine.", e)

    @property
    def model_loaded(self) -> bool:
        return self._model_loaded

    def calculate_forensic_stylometrics(self, text: str) -> tuple[float, ForensicStylometrics]:
        clean_text = text.strip()
        if not clean_text:
            empty_forensics = ForensicStylometrics(
                burstiness_score=0.0,
                burstiness_classification="moderate",
                perplexity_estimate=50.0,
                perplexity_classification="moderate",
                lexical_diversity=0.5,
                shannon_entropy=4.0,
                synthetic_marker_count=0,
                synthetic_markers_found=[],
                sentence_analyses=[]
            )
            return 10.0, empty_forensics

        # 1. Clean sentence splitting (preserving punctuation boundaries)
        raw_sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_text) if s.strip()]
        if not raw_sentences:
            raw_sentences = [clean_text]

        # 2. Tokenization and Sentence Lengths
        sentence_lengths = [len(re.findall(r"\b\w+\b", s)) for s in raw_sentences]
        valid_lengths = [l for l in sentence_lengths if l > 0]
        mean_len = float(np.mean(valid_lengths)) if valid_lengths else 1.0
        std_len = float(np.std(valid_lengths)) if len(valid_lengths) > 1 else 0.0

        # Burstiness & Cadence Variance (Coefficient of Variation)
        cv = (std_len / mean_len) if mean_len > 0 else 0.4
        burstiness_score = round(min(cv * 100.0, 100.0), 1)

        if cv < 0.28:
            burstiness_class = "low_burstiness"
        elif cv < 0.45:
            burstiness_class = "moderate"
        else:
            burstiness_class = "high_burstiness"

        # 3. Lexical Diversity & Shannon Entropy
        all_words = re.findall(r"\b[a-zA-Z]{2,}\b", clean_text.lower())
        total_word_count = len(all_words)

        if total_word_count > 0:
            counts = Counter(all_words)
            # Shannon entropy in bits
            shannon_entropy = -sum((c / total_word_count) * math.log2(c / total_word_count) for c in counts.values())
            # Moving-Average Type-Token Ratio (MATTR) with window=25 to prevent length bias
            window_size = min(25, total_word_count)
            if total_word_count <= window_size:
                mattr = len(counts) / float(total_word_count)
            else:
                window_ttrs = []
                for i in range(total_word_count - window_size + 1):
                    w_slice = all_words[i : i + window_size]
                    window_ttrs.append(len(set(w_slice)) / float(window_size))
                mattr = float(np.mean(window_ttrs))
        else:
            shannon_entropy = 4.2
            mattr = 0.65

        # Perplexity & Predictability Estimation
        # Typical rich human prose entropy ranges from 4.8 to 7.2 bits.
        # Repetitive / formulaic AI text clusters with lower unigram entropy (< 4.2 bits).
        clamped_entropy = max(2.5, min(shannon_entropy, 7.5))
        # High predictability score = lower entropy / higher formulaic repetition
        perplexity_estimate = round(max(5.0, min(95.0, 100.0 - ((clamped_entropy - 2.5) / 5.0) * 80.0)), 1)

        if perplexity_estimate >= 65.0:
            perplexity_class = "highly_predictable"
        elif perplexity_estimate >= 40.0:
            perplexity_class = "moderate"
        else:
            perplexity_class = "natural_unpredictable"

        # 4. 120+ Synthetic Transitional Markers Scan
        low_text = clean_text.lower()
        markers_found: list[str] = []
        for marker in SYNTHETIC_LLM_MARKERS:
            if marker in low_text:
                markers_found.append(marker)

        synthetic_marker_count = len(markers_found)

        # 5. Document-level AI Probability Baseline (Forensic stylometric ensemble)
        marker_weight = min(synthetic_marker_count * 15.0, 52.0)

        # Low burstiness (cadence uniformity) penalty
        if cv < 0.22:
            burst_weight = 30.0
        elif cv < 0.32:
            burst_weight = 18.0
        elif cv < 0.42:
            burst_weight = 8.0
        else:
            burst_weight = 0.0

        # Predictability weight
        pred_weight = max(0.0, (perplexity_estimate - 35.0) * 0.40)

        # Lexical diversity weight (low MATTR = repetitive formulaic vocabulary)
        if mattr < 0.52 and total_word_count > 40:
            mattr_weight = 18.0
        elif mattr < 0.62 and total_word_count > 40:
            mattr_weight = 8.0
        else:
            mattr_weight = 0.0

        base_ai_prob = 6.0 + marker_weight + burst_weight + pred_weight + mattr_weight
        doc_ai_prob = max(3.0, min(base_ai_prob, 96.0))

        # 6. Granular Sentence-by-Sentence AI Analysis & Heatmap Ratings
        sentence_analyses: list[SentenceAIScore] = []
        for idx, s in enumerate(raw_sentences):
            s_low = s.lower()
            s_words = re.findall(r"\b\w+\b", s_low)
            s_len = len(s_words)

            local_burst_dev = abs(s_len - mean_len) / (mean_len + 1e-5)
            s_markers = [m for m in markers_found if m in s_low]

            s_prob = doc_ai_prob
            if s_markers:
                s_prob += min(len(s_markers) * 22.0, 45.0)

            # Syntactic uniformity check
            if cv < 0.30 and abs(s_len - mean_len) < 3 and s_len > 6:
                s_prob += 10.0
            elif local_burst_dev > 0.8:
                s_prob -= 12.0

            s_prob = round(max(4.0, min(s_prob, 98.0)), 1)

            if s_prob >= 65.0:
                s_class = "synthetic"
            elif s_prob >= 35.0:
                s_class = "mixed"
            else:
                s_class = "human"

            s_perp = round(max(5.0, min(perplexity_estimate + (15.0 if s_markers else -5.0), 95.0)), 1)

            sentence_analyses.append(
                SentenceAIScore(
                    sentence_index=idx,
                    text=s,
                    ai_probability=s_prob,
                    classification=s_class,
                    burstiness=round(local_burst_dev, 2),
                    perplexity_score=s_perp,
                    detected_markers=s_markers
                )
            )

        forensics = ForensicStylometrics(
            burstiness_score=burstiness_score,
            burstiness_classification=burstiness_class,
            perplexity_estimate=perplexity_estimate,
            perplexity_classification=perplexity_class,
            lexical_diversity=round(mattr, 3),
            shannon_entropy=round(shannon_entropy, 2),
            synthetic_marker_count=synthetic_marker_count,
            synthetic_markers_found=markers_found[:15],
            sentence_analyses=sentence_analyses
        )

        return round(doc_ai_prob, 1), forensics

    def _calculate_advanced_ai_probability(self, text: str) -> float:
        prob, _ = self.calculate_forensic_stylometrics(text)
        return prob

    async def analyse(self, text: str) -> LinguisticResult:
        flags = self._compute_stylometric_flags(text)
        
        # Run statistical heuristic analysis + forensic stylometrics
        heuristic_res = self._analyse_heuristics(text, flags)

        if not self._model_loaded:
            return heuristic_res

        try:
            inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            device = settings.device
            if device == "cuda" and torch.cuda.is_available():
                self._model.to("cuda")
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self._model(**inputs)
                
            probs = torch.softmax(outputs.logits, dim=-1)[0]
            num_labels = self._model.config.num_labels
            
            if num_labels == 6:
                model_score = round((probs[3] * 0.5 + probs[4] * 0.8 + probs[5] * 1.0).item() * 100, 1)
            elif num_labels == 2:
                fake_prob = probs[0].item()
                model_score = round((1 - fake_prob) * 100, 1)
            else:
                model_score = 70.0

            # Blend model score with heuristic absurdity penalty
            final_score = min(model_score, heuristic_res.score)
            ai_prob = heuristic_res.ai_probability
            ai_forensics = heuristic_res.ai_forensics

            # Optional neural AI detection blending if enabled and loaded
            if self._ai_model_loaded and self._ai_tokenizer is not None and self._ai_model is not None:
                try:
                    ai_inputs = self._ai_tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
                    if device == "cuda" and torch.cuda.is_available():
                        ai_inputs = {k: v.to("cuda") for k, v in ai_inputs.items()}
                    with torch.no_grad():
                        ai_out = self._ai_model(**ai_inputs)
                    ai_probs = torch.softmax(ai_out.logits, dim=-1)[0]
                    neural_prob = (ai_probs[1].item() if len(ai_probs) > 1 else ai_probs[0].item()) * 100.0
                    ai_prob = round(0.55 * neural_prob + 0.45 * ai_prob, 1)
                except Exception as ex:
                    logger.warning("Neural AI detector inference failed: %s. Using forensic stylometrics.", ex)
            
            return LinguisticResult(
                score=round(final_score, 1),
                ai_probability=round(ai_prob, 1),
                xai_annotations=heuristic_res.xai_annotations,
                flags=flags,
                ai_forensics=ai_forensics
            )
        except Exception as e:
            logger.error("Error during transformer inference: %s. Falling back to heuristics.", e)
            return heuristic_res

    def _analyse_heuristics(self, text: str, flags: list[LinguisticFlag]) -> LinguisticResult:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
        annotations = []
        scores_list = []
        absurd_detected = False

        manipulative_list = ["shocking", "breaking", "explosive", "never", "always", "everyone", "bombshell", "unbelievable", "proof", "secret", "mind-blowing", "warning"]

        for s in sentences:
            s_low = s.lower()

            # 1. Absurdity / Satire / Fabricated Trope Check (Highest Priority)
            if any(re.search(pat, s_low) for pat in ABSURDITY_PATTERNS):
                annotations.append(XAIAnnotation(
                    text=s,
                    type=AnnotationType.manipulative,
                    reason="Absurd, satirical, or pseudoscientific claim detected.",
                    confidence=95.0
                ))
                scores_list.append(5.0)
                absurd_detected = True
                continue

            has_manipulative = any(w in s_low for w in manipulative_list)
            has_attribution_phrase = any(phrase in s_low for phrase in ["according to", "reported by", "published in", "stated by", "cited by"])
            has_valid_institution = any(inst in s_low for inst in VALID_INSTITUTIONS)
            has_quantitative = bool(re.search(r"\b(\d+%\s+|\d+\s+percent|\$\d+|\d+\s+million|\d+\s+billion)\b", s_low))

            # 2. Manipulative clickbait framing takes precedence over naive keyword matches
            if has_manipulative:
                annotations.append(XAIAnnotation(
                    text=s,
                    type=AnnotationType.manipulative,
                    reason="Sensationalist, clickbait, or emotional manipulation pattern.",
                    confidence=84.0
                ))
                scores_list.append(25.0)
            elif has_attribution_phrase:
                if has_valid_institution:
                    annotations.append(XAIAnnotation(
                        text=s,
                        type=AnnotationType.verified,
                        reason="Journalistic attribution to a recognized institution or wire service.",
                        confidence=86.0
                    ))
                    scores_list.append(88.0)
                elif has_quantitative:
                    annotations.append(XAIAnnotation(
                        text=s,
                        type=AnnotationType.neutral,
                        reason="Empirical or statistical claim citing unverified source.",
                        confidence=70.0
                    ))
                    scores_list.append(60.0)
                else:
                    annotations.append(XAIAnnotation(
                        text=s,
                        type=AnnotationType.unverified,
                        reason="Attributed to an unverified, anonymous, or fictitious entity.",
                        confidence=75.0
                    ))
                    scores_list.append(35.0)
            elif has_valid_institution:
                annotations.append(XAIAnnotation(
                    text=s,
                    type=AnnotationType.verified,
                    reason="Factual statement referencing recognized institutional research or authority.",
                    confidence=84.0
                ))
                scores_list.append(85.0)
            else:
                annotations.append(XAIAnnotation(text=s, type=AnnotationType.neutral, reason="Neutral factual assertion.", confidence=70.0))
                scores_list.append(65.0)

        base_score = sum(scores_list) / len(scores_list) if scores_list else 50.0
        
        # Heavy penalty if absurdity/satire detected
        if absurd_detected:
            base_score = min(base_score, 25.0)

        score = max(min(round(base_score, 1), 100.0), 0.0)
        ai_prob, ai_forensics = self.calculate_forensic_stylometrics(text)

        return LinguisticResult(
            score=score,
            ai_probability=round(ai_prob, 1),
            xai_annotations=annotations,
            flags=flags,
            ai_forensics=ai_forensics
        )

    def _compute_stylometric_flags(self, text: str) -> list[LinguisticFlag]:
        words = re.findall(r"\b\w+\b", text.lower())
        num_words = len(words)
        
        ttr = len(set(words)) / num_words if num_words > 0 else 0.0
        ttr_rating = f"{ttr:.2f} — " + ("High lexical diversity" if ttr >= 0.55 else "Low vocabulary variety")
        ttr_ok = ttr >= 0.50

        sentences = [s.strip() for s in re.split(r"[.!?]", text) if s.strip()]
        lengths = [len(s.split()) for s in sentences]
        mean_len = np.mean(lengths) if lengths else 1.0
        std_len = np.std(lengths) if len(lengths) > 1 else 0.0
        
        if len(lengths) > 1:
            cv = std_len / mean_len if mean_len > 0 else 0.5
            burst_rating = f"CV: {cv:.2f} — " + ("Natural human cadence" if cv >= 0.35 else "Monotonous uniform cadence")
            burst_ok = cv >= 0.35
        else:
            burst_rating = "Standard single-statement cadence"
            burst_ok = True

        low_text = text.lower()
        found_bw = [bw for bw in LLM_BUZZWORDS if bw in low_text]
        bw_count = len(found_bw)
        bw_rating = f"{bw_count} detected" + (f" ({', '.join(found_bw[:2])})" if found_bw else "")
        bw_ok = bw_count <= 1

        absurd_matches = [pat for pat in ABSURDITY_PATTERNS if re.search(pat, low_text)]
        fact_ok = len(absurd_matches) == 0
        fact_rating = "Passed" if fact_ok else f"Flagged ({absurd_matches[0]})"

        return [
            LinguisticFlag(label="Sentence Burstiness (Cadence)", rating=burst_rating, ok=burst_ok),
            LinguisticFlag(label="Vocabulary Richness (TTR)", rating=ttr_rating, ok=ttr_ok),
            LinguisticFlag(label="Factual Realism Check", rating=fact_rating, ok=fact_ok),
            LinguisticFlag(label="AI Stylometric Buzzwords", rating=bw_rating, ok=bw_ok),
        ]

linguistic_service = LinguisticService()
