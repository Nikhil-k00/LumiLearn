"""
Learning Orchestrator — central coordinator.
Receives game result + learner state, calls relevant specialist agents,
aggregates all outputs, and returns the full response to the backend.
"""
from models.schemas import OrchestratorRequest, OrchestratorResponse, PhonicsAnalysisRequest, MemoryAnalysisRequest, ReadingAnalysisRequest
from agents import analytics_agent, phonics_agent, reading_agent, memory_agent, recommendation_agent


async def orchestrate(req: OrchestratorRequest) -> OrchestratorResponse:
    state  = req.learnerState
    result = req.gameResult

    # 1. Analytics agent — compute updated domain scores (pure math, no GPT)
    updated_scores = analytics_agent.aggregate(state, result)

    # 2. Specialist agent based on game type
    confusion_summary = None

    if result.gameType == "phonics_adventure":
        phonics_req = PhonicsAnalysisRequest(
            mistakeLog=result.mistakeLog,
            confusionMatrix=result.confusionMatrix,
            currentScore=state.phonicsScore,
            difficulty=state.currentDifficulty.phonics,
            studentAge=state.age,
            totalAttempts=result.attempts if result.attempts > 0 else 1,
        )
        phonics_result = await phonics_agent.analyze(phonics_req)
        updated_scores["phonicsScore"] = phonics_result.newScore
        # Preserve real frequency counts from the original confusion matrix
        confusion_summary = {}
        for key, count in result.confusionMatrix.items():
            parts = key.split("_for_")
            if len(parts) == 2:
                pair = "/".join(sorted(parts))
                confusion_summary[pair] = confusion_summary.get(pair, 0) + count

    elif result.gameType == "word_quest":
        reading_req = ReadingAnalysisRequest(
            accuracy=result.accuracy,
            ttsUsageCount=result.ttsUsageCount,
            currentScore=state.readingScore,
            difficulty=state.currentDifficulty.reading,
        )
        reading_result = await reading_agent.analyze(reading_req)
        updated_scores["readingScore"] = reading_result.newScore

    elif result.gameType == "memory_challenge":
        memory_req = MemoryAnalysisRequest(
            sequenceAccuracy=result.sequenceAccuracy or result.accuracy,
            maxSequenceRecalled=result.maxSequenceRecalled or 0,
            rhymeScore=result.rhymeScore,   # now forwarded from GameResult
            currentScore=state.memoryScore,
            difficulty=state.currentDifficulty.memory,
        )
        memory_result = await memory_agent.analyze(memory_req)
        updated_scores["memoryScore"] = memory_result.newScore

    else:
        # A3 — Unknown gameType: log and continue — recommendation agent still runs
        # with unmodified scores so at least activities are returned.
        print(f"[Orchestrator] WARNING: unknown gameType '{result.gameType}' — skipping specialist agent")

    # 3. Recommendation agent — GPT generates activities + difficulty adjustments
    rec = await recommendation_agent.recommend(state, updated_scores)

    return OrchestratorResponse(
        updatedScores=updated_scores,
        difficultyAdjustments=rec["difficultyAdjustments"],
        activities=rec["activities"],
        focusAreas=rec["focusAreas"],
        encouragementMessage=rec["encouragementMessage"],
        confusionSummary=confusion_summary,
    )
