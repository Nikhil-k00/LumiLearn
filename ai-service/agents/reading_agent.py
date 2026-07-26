"""
Reading Agent — analyzes reading accuracy and TTS usage
to score reading fluency and independence.
"""
from models.schemas import ReadingAnalysisRequest, ReadingAnalysisResult
from utils.openai_client import get_client


def _compute_new_score(current: float, accuracy: float) -> float:
    return round(current * 0.7 + accuracy * 0.3, 1)


def _compute_difficulty(current: int, accuracy: float) -> int:
    if accuracy >= 80 and current < 5:
        return current + 1
    if accuracy < 50 and current > 1:
        return current - 1
    return current


async def analyze(req: ReadingAnalysisRequest) -> ReadingAnalysisResult:
    new_score = _compute_new_score(req.currentScore, req.accuracy)
    new_difficulty = _compute_difficulty(req.difficulty, req.accuracy)

    # High TTS usage = child needs more audio support → don't raise difficulty
    if req.ttsUsageCount is not None and req.ttsUsageCount > 5:
        new_difficulty = max(req.difficulty - 1, 1)

    client = get_client()
    prompt = (
        f"A child just completed a reading game with {req.accuracy:.0f}% accuracy. "
        "Write ONE short encouraging sentence (max 15 words) for the child. "
        "Never use negative language. Output only the sentence."
    )
    # gpt-4o-mini is sufficient for a single encouraging sentence — ~15x cheaper than gpt-4o
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
        feedback=feedback,
    )
