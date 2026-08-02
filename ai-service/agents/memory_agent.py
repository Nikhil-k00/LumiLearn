"""
Memory Agent — analyzes sequence recall accuracy, rhyme score, session timing,
and consecutive streak to return an adaptive difficulty decision and
structured signals for the recommendation agent.
"""
from models.schemas import MemoryAnalysisRequest, MemoryAnalysisResult
from utils.openai_client import get_client


def _compute_new_score(current: float, seq_accuracy: float, rhyme_score: float | None) -> float:
    base = seq_accuracy
    if rhyme_score is not None:
        base = (base + rhyme_score) / 2
    return round(current * 0.7 + base * 0.3, 1)


def _compute_difficulty(
    current: int,
    seq_accuracy: float,
    rhyme_score: float | None,
    max_recalled: int,
    duration_seconds: int,
    good_streak: int,
) -> tuple[int, str]:
    """
    Returns (new_difficulty, direction).

    Adaptive rules (ordered by priority):
    1. Fatigue: session >300 s AND seq_accuracy < 60 → drop.
    2. Struggling on sequences: seq_accuracy < 40 → drop immediately.
    3. Struggling on both: seq_accuracy < 55 AND rhyme_score < 50 → drop.
    4. Weak rhyme memory only: rhyme_score < 45 → hold (don't advance).
    5. Ready to advance: seq_accuracy >= 75 AND (rhyme_score is None or >= 65)
       AND 2 consecutive good sessions AND max_recalled >= current+1 → up.
    6. Good sequences but weak rhyme → hold.
    7. Steady → hold.
    """
    rhyme = rhyme_score if rhyme_score is not None else seq_accuracy

    # Rule 1 — fatigue
    if duration_seconds > 300 and seq_accuracy < 60:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 2 — struggling on sequences
    if seq_accuracy < 40:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 3 — struggling on both
    if seq_accuracy < 55 and rhyme < 50:
        new = max(1, current - 1)
        return new, "down" if new < current else "stable"

    # Rule 4 — weak rhyme only → hold
    if rhyme < 45:
        return current, "stable"

    # Rule 5 — ready to advance (child can recall at least the next sequence length)
    if seq_accuracy >= 75 and rhyme >= 65 and good_streak >= 1 and current < 5:
        if max_recalled >= current + 1:
            return current + 1, "up"

    # Rule 6 — good sequences, weak rhyme → hold
    if seq_accuracy >= 75 and rhyme < 65:
        return current, "stable"

    # Rule 7 — steady
    return current, "stable"


async def analyze(req: MemoryAnalysisRequest) -> MemoryAnalysisResult:
    new_score = _compute_new_score(req.currentScore, req.sequenceAccuracy, req.rhymeScore)
    new_difficulty, direction = _compute_difficulty(
        req.difficulty,
        req.sequenceAccuracy,
        req.rhymeScore,
        req.maxSequenceRecalled,
        req.durationSeconds,
        req.goodStreak,
    )

    client = get_client()
    rhyme_text = f" Rhyme score: {req.rhymeScore:.0f}%." if req.rhymeScore is not None else ""
    prompt = (
        f"A child just played a memory game. "
        f"They remembered {req.maxSequenceRecalled} sounds in a row! "
        f"Sequence accuracy: {req.sequenceAccuracy:.0f}%.{rhyme_text} "
        f"Memory difficulty is moving {direction}. "
        "Write ONE short celebrating sentence (max 15 words) for the child. "
        "Output only the sentence."
    )
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=40,
        temperature=0.7,
    )
    feedback = (resp.choices[0].message.content or "").strip()

    return MemoryAnalysisResult(
        newScore=new_score,
        newDifficulty=new_difficulty,
        difficultyDirection=direction,
        feedback=feedback,
    )
