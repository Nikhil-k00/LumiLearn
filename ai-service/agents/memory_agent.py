"""
Memory Agent — analyzes sequence recall accuracy and
returns updated working memory score + difficulty.
"""
from models.schemas import MemoryAnalysisRequest, MemoryAnalysisResult
from utils.openai_client import get_client


def _compute_new_score(current: float, seq_accuracy: float, rhyme_score: float | None) -> float:
    base = seq_accuracy
    if rhyme_score is not None:
        base = (base + rhyme_score) / 2
    return round(current * 0.7 + base * 0.3, 1)


def _compute_difficulty(current: int, accuracy: float) -> int:
    if accuracy >= 80 and current < 5:
        return current + 1
    if accuracy < 50 and current > 1:
        return current - 1
    return current


async def analyze(req: MemoryAnalysisRequest) -> MemoryAnalysisResult:
    new_score = _compute_new_score(req.currentScore, req.sequenceAccuracy, req.rhymeScore)
    new_difficulty = _compute_difficulty(req.difficulty, req.sequenceAccuracy)

    client = get_client()
    prompt = (
        f"A child just played a memory game and remembered {req.maxSequenceRecalled} sounds in a row! "
        "Write ONE short celebrating sentence (max 15 words) for the child. "
        "Output only the sentence."
    )
    # gpt-4o-mini is sufficient for a single celebrating sentence — ~15x cheaper than gpt-4o
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
        feedback=feedback,
    )
