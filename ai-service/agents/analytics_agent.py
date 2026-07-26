"""
Analytics Agent — pure computation, no GPT.
Aggregates game result metrics into a domain score delta.
"""
from models.schemas import GameResult, LearnerState


def aggregate(state: LearnerState, result: GameResult) -> dict[str, float]:
    """
    Returns a dict of domain -> updated score after this game session.
    Uses a 70/30 weighted moving average.
    """
    def update(current: float, new: float) -> float:
        return round(current * 0.7 + new * 0.3, 1)

    scores = {
        "readingScore":  state.readingScore,
        "speechScore":   state.speechScore,
        "memoryScore":   state.memoryScore,
        "writingScore":  state.writingScore,
        "phonicsScore":  state.phonicsScore,
    }

    if result.gameType == "phonics_adventure":
        scores["phonicsScore"] = update(state.phonicsScore, result.accuracy)

    elif result.gameType == "word_quest":
        scores["readingScore"] = update(state.readingScore, result.accuracy)

    elif result.gameType == "memory_challenge":
        seq_acc = result.sequenceAccuracy if result.sequenceAccuracy is not None else result.accuracy
        scores["memoryScore"] = update(state.memoryScore, seq_acc)

    return scores
