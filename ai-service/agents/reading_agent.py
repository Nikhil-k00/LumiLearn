"""
Reading Agent — analyzes reading accuracy, TTS dependency, session timing,
and consecutive streak to return an adaptive difficulty decision and
structured signals for the recommendation agent.
"""
from models.schemas import ReadingAnalysisRequest, ReadingAnalysisResult
from utils.openai_client import get_client


def _compute_new_score(current: float, accuracy: float) -> float:
    return round(current * 0.7 + accuracy * 0.3, 1)


def _compute_difficulty(
    current: int,
    accuracy: float,
    tts_count: int,
    duration_seconds: int,
    good_streak: int,
) -> tuple[int, str]:
    """
    Returns (new_difficulty, direction).

    Adaptive rules (ordered by priority):
    1. Heavy TTS dependency (>5 taps) regardless of accuracy → drop or hold.
       The child is compensating with audio — content is too hard.
    2. Fatigue: session >360 s AND accuracy < 70 → drop.
    3. Struggling: accuracy < 50 → drop immediately.
    4. Moderate TTS (3–5) + accuracy 50–79 → hold.
    5. Good performance (>=80%) + low TTS (<=2) + 2 consecutive streaks → up.
    6. Good performance but moderate TTS dependency → hold (build confidence).
    7. Steady: 50–79% → hold.
    """
    tts = tts_count or 0

    # Rule 1 — heavy TTS dependency
    if tts > 5:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 2 — fatigue
    if duration_seconds > 360 and accuracy < 70:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 3 — struggling
    if accuracy < 50:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 4 — moderate TTS + mediocre accuracy → hold
    if tts >= 3 and accuracy < 80:
        return current, "stable"

    # Rule 5 — ready to advance
    if accuracy >= 80 and tts <= 2 and good_streak >= 1 and current < 5:
        return current + 1, "up"

    # Rule 6 — good accuracy but still relying on audio
    if accuracy >= 80 and tts > 2:
        return current, "stable"

    # Rule 7 — steady
    return current, "stable"


async def analyze(req: ReadingAnalysisRequest) -> ReadingAnalysisResult:
    new_score = _compute_new_score(req.currentScore, req.accuracy)
    new_difficulty, direction = _compute_difficulty(
        req.difficulty, req.accuracy,
        req.ttsUsageCount or 0,
        req.durationSeconds, req.goodStreak
    )

    client = get_client()
    tts_text = f" They used the read-aloud button {req.ttsUsageCount} times." if req.ttsUsageCount else ""
    prompt = (
        f"A child just completed a reading game with {req.accuracy:.0f}% accuracy.{tts_text} "
        f"Reading difficulty is moving {direction}. "
        "Write ONE short encouraging sentence (max 15 words). "
        "Never use negative language. Output only the sentence."
    )
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=40,
        temperature=0.7,
    )
    feedback = (resp.choices[0].message.content or "").strip()

    return ReadingAnalysisResult(
        newScore=new_score,
        newDifficulty=new_difficulty,
        difficultyDirection=direction,
        feedback=feedback,
    )
