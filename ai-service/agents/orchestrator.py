"""
Learning Orchestrator — central coordinator.
Receives game result + learner state, calls relevant specialist agents,
aggregates all outputs, builds a rich PerformanceContext, and passes
it to the recommendation agent so GPT can generate genuinely adaptive,
personalised content for the NEXT game.
"""
from models.schemas import (
    OrchestratorRequest, OrchestratorResponse,
    PhonicsAnalysisRequest, MemoryAnalysisRequest, ReadingAnalysisRequest,
    PerformanceContext,
)
from agents import analytics_agent, phonics_agent, reading_agent, memory_agent, recommendation_agent


async def orchestrate(req: OrchestratorRequest) -> OrchestratorResponse:
    state  = req.learnerState
    result = req.gameResult

    # 1. Analytics agent — compute updated domain scores (pure math, no GPT)
    updated_scores = analytics_agent.aggregate(state, result)

    # 2. Specialist agent — produces newDifficulty, direction, and domain signals
    confusion_summary = None
    perf_context = PerformanceContext(
        durationSeconds=result.duration,
        goodStreak=result.goodStreak,
    )

    if result.gameType == "phonics_adventure":
        phonics_req = PhonicsAnalysisRequest(
            mistakeLog=result.mistakeLog,
            confusionMatrix=result.confusionMatrix,
            currentScore=state.phonicsScore,
            difficulty=state.currentDifficulty.phonics,
            studentAge=state.age,
            totalAttempts=result.attempts if result.attempts > 0 else 1,
            durationSeconds=result.duration,
            goodStreak=result.goodStreak,
        )
        phonics_result = await phonics_agent.analyze(phonics_req)
        updated_scores["phonicsScore"] = phonics_result.newScore

        # Build rich performance context for the recommendation agent
        perf_context = PerformanceContext(
            difficultyDirection=phonics_result.difficultyDirection,
            newDifficulty=phonics_result.newDifficulty,
            durationSeconds=result.duration,
            topConfusions=phonics_result.topConfusions,
            focusLetters=phonics_result.focusLetters,
            goodStreak=result.goodStreak,
        )

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
            durationSeconds=result.duration,
            goodStreak=result.goodStreak,
        )
        reading_result = await reading_agent.analyze(reading_req)
        updated_scores["readingScore"] = reading_result.newScore

        perf_context = PerformanceContext(
            difficultyDirection=reading_result.difficultyDirection,
            newDifficulty=reading_result.newDifficulty,
            durationSeconds=result.duration,
            ttsUsageCount=result.ttsUsageCount or 0,
            goodStreak=result.goodStreak,
        )

    elif result.gameType == "memory_challenge":
        memory_req = MemoryAnalysisRequest(
            sequenceAccuracy=result.sequenceAccuracy or result.accuracy,
            maxSequenceRecalled=result.maxSequenceRecalled or 0,
            rhymeScore=result.rhymeScore,
            currentScore=state.memoryScore,
            difficulty=state.currentDifficulty.memory,
            durationSeconds=result.duration,
            goodStreak=result.goodStreak,
        )
        memory_result = await memory_agent.analyze(memory_req)
        updated_scores["memoryScore"] = memory_result.newScore

        perf_context = PerformanceContext(
            difficultyDirection=memory_result.difficultyDirection,
            newDifficulty=memory_result.newDifficulty,
            durationSeconds=result.duration,
            maxSequenceRecalled=result.maxSequenceRecalled or 0,
            rhymeScore=result.rhymeScore,
            sequenceAccuracy=result.sequenceAccuracy,
            goodStreak=result.goodStreak,
        )

    else:
        print(f"[Orchestrator] WARNING: unknown gameType '{result.gameType}' — skipping specialist agent")

    # Attach the performance context to learner state so the recommendation
    # agent receives the full picture in one unified object.
    state_with_context = state.model_copy(update={"sessionContext": perf_context})

    # 3. Recommendation agent — GPT generates activities using all signals
    rec = await recommendation_agent.recommend(state_with_context, updated_scores)

    # Build difficultyAdjustments from the specialist agent's decision
    # (rec["difficultyAdjustments"] from GPT is advisory only — the authoritative
    # value comes from the specialist rule engine above).
    domain_map = {
        "phonics_adventure": "phonics",
        "word_quest":        "reading",
        "memory_challenge":  "memory",
    }
    played_domain = domain_map.get(result.gameType)
    difficulty_adjustments: dict[str, int] = dict(rec.get("difficultyAdjustments", {}))
    if played_domain:
        difficulty_adjustments[played_domain] = perf_context.newDifficulty

    return OrchestratorResponse(
        updatedScores=updated_scores,
        difficultyAdjustments=difficulty_adjustments,
        activities=rec["activities"],
        focusAreas=rec["focusAreas"],
        encouragementMessage=rec["encouragementMessage"],
        confusionSummary=confusion_summary,
    )
