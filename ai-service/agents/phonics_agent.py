"""
Phonics Agent — analyzes letter confusion patterns (b/d, p/q, m/w, n/u)
and returns updated phonics score + recommended focus.
"""
import json
from models.schemas import PhonicsAnalysisRequest, PhonicsAnalysisResult
from utils.openai_client import get_client

# Common dyslexia confusion pairs tracked
CONFUSION_PAIRS = [
    ("b", "d"), ("d", "b"),
    ("p", "q"), ("q", "p"),
    ("m", "w"), ("w", "m"),
    ("n", "u"), ("u", "n"),
]

def _extract_top_confusions(confusion_matrix: dict[str, int]) -> list[str]:
    """Return pairs like ['b/d', 'p/q'] sorted by frequency."""
    pairs: dict[str, int] = {}
    for key, count in confusion_matrix.items():
        parts = key.split("_for_")  # e.g. "b_for_d"
        if len(parts) == 2:
            pair = "/".join(sorted(parts))
            pairs[pair] = pairs.get(pair, 0) + count
    return [p for p, _ in sorted(pairs.items(), key=lambda x: -x[1])]


def _compute_new_score(current: float, accuracy: float) -> float:
    """Weighted moving average — 30% new result, 70% history."""
    return round(current * 0.7 + accuracy * 0.3, 1)


def _compute_difficulty(current: int, accuracy: float) -> int:
    """Increase difficulty above 80% accuracy, decrease below 50%."""
    if accuracy >= 80 and current < 5:
        return current + 1
    if accuracy < 50 and current > 1:
        return current - 1
    return current


async def analyze(req: PhonicsAnalysisRequest) -> PhonicsAnalysisResult:
    top_confusions = _extract_top_confusions(req.confusionMatrix)
    focus_letters = []
    for pair in top_confusions[:2]:
        focus_letters.extend(pair.split("/"))

    # Accuracy: correct answers / total attempts
    # total_mistakes = sum of confusion matrix values (every wrong tap)
    # We use req.totalAttempts (correct + wrong) sent from the game session.
    total_mistakes = sum(req.confusionMatrix.values())
    total_items = max(req.totalAttempts, 1)
    accuracy = max(0.0, 100.0 - (total_mistakes / total_items) * 100)

    new_score = _compute_new_score(req.currentScore, accuracy)
    new_difficulty = _compute_difficulty(req.difficulty, accuracy)

    # GPT generates a friendly, personalized feedback message
    client = get_client()
    prompt = (
        f"A child aged {req.studentAge} just played a phonics game. "
        f"Their phonics score is {new_score}/100. "
        f"They are confusing these letter pairs: {', '.join(top_confusions[:2]) if top_confusions else 'none'}. "
        "Write ONE short, encouraging sentence (max 15 words) for the child. "
        "Never use negative language. Output only the sentence, no quotes."
    )
    # gpt-4o-mini is sufficient for a single encouraging sentence — ~15x cheaper than gpt-4o
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=40,
        temperature=0.7,
    )
    feedback = (resp.choices[0].message.content or "").strip()

    return PhonicsAnalysisResult(
        newScore=new_score,
        topConfusions=top_confusions,
        focusLetters=list(set(focus_letters)),
        newDifficulty=new_difficulty,
        feedback=feedback,
    )
