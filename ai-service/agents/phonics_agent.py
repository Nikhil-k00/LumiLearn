"""
Phonics Agent — analyzes letter confusion patterns (b/d, p/q, m/w, n/u),
session timing, and consecutive streak to return an accurate adaptive
difficulty decision and structured signals for the recommendation agent.
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


def _compute_difficulty(
    current: int,
    accuracy: float,
    top_confusions: list[str],
    duration_seconds: int,
    good_streak: int,
) -> tuple[int, str]:
    """
    Returns (new_difficulty, direction).

    Adaptive rules (ordered by priority):
    1. Fatigue guard: session took >300 s AND accuracy < 70 → drop or hold.
    2. Severe confusion: active b/d or p/q confusion with accuracy < 60 → drop.
    3. Struggling: accuracy < 50 → drop immediately.
    4. Good but confused: accuracy >= 80 but active hard confusions → hold.
    5. Advancing: accuracy >= 80 for 2 consecutive good sessions → up.
    6. Steady: accuracy 50–79 → hold.
    """
    hard_confusions = {"b/d", "p/q", "d/b", "q/p"}
    has_hard_confusion = any(c in hard_confusions for c in top_confusions)

    # Rule 1 — fatigue
    if duration_seconds > 300 and accuracy < 70:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 2 — severe confusion at low accuracy
    if has_hard_confusion and accuracy < 60:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 3 — struggling
    if accuracy < 50:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 4 — good accuracy but still confused on hard pairs → hold
    if accuracy >= 80 and has_hard_confusion:
        return current, "stable"

    # Rule 5 — advance after 2 consecutive good sessions (streak >= 1 means this is 2nd)
    if accuracy >= 80 and good_streak >= 1 and current < 5:
        return current + 1, "up"

    # Rule 6 — steady
    return current, "stable"


async def analyze(req: PhonicsAnalysisRequest) -> PhonicsAnalysisResult:
    top_confusions = _extract_top_confusions(req.confusionMatrix)
    focus_letters: list[str] = []
    for pair in top_confusions[:2]:
        focus_letters.extend(pair.split("/"))
    focus_letters = list(dict.fromkeys(focus_letters))  # deduplicate, preserve order

    total_mistakes = sum(req.confusionMatrix.values())
    total_items = max(req.totalAttempts, 1)
    accuracy = max(0.0, 100.0 - (total_mistakes / total_items) * 100)

    new_score = _compute_new_score(req.currentScore, accuracy)
    new_difficulty, direction = _compute_difficulty(
        req.difficulty, accuracy, top_confusions,
        req.durationSeconds, req.goodStreak
    )

    client = get_client()
    confusion_text = ", ".join(top_confusions[:2]) if top_confusions else "none"
    prompt = (
        f"A child aged {req.studentAge} just played a phonics game. "
        f"Accuracy: {accuracy:.0f}%. Letter confusions: {confusion_text}. "
        f"Difficulty is moving {direction}. "
        "Write ONE short, encouraging sentence (max 15 words). "
        "Never use negative language. Output only the sentence, no quotes."
    )
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
        focusLetters=focus_letters,
        newDifficulty=new_difficulty,
        difficultyDirection=direction,
        feedback=feedback,
    )
