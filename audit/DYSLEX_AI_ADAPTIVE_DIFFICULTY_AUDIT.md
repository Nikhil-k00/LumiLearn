# DysLex AI Adaptive Difficulty Audit

Status: read-only investigation. No code, schema, dependency, or database changes were made.

## Scope and method

This audit traced the real adaptive-difficulty and question-pool path across the repository from game session submission through performance scoring, difficulty updates, pool refill, AI content generation, and the next activity delivered to the student.

Reviewed implementation points:
- `backend/src/controllers/gameController.ts`
- `backend/src/models/LearningProfile.ts`
- `backend/src/models/GamePool.ts`
- `backend/src/services/gamePoolService.ts`
- `backend/src/services/aiService.ts`
- `ai-service/agents/orchestrator.py`
- `ai-service/agents/phonics_agent.py`
- `ai-service/agents/reading_agent.py`
- `ai-service/agents/memory_agent.py`
- `ai-service/agents/analytics_agent.py`
- `ai-service/agents/recommendation_agent.py`
- `frontend/src/hooks/usePoolGame.ts`
- `frontend/src/hooks/usePhonicsSession.ts`
- `frontend/src/hooks/useWordQuestSession.ts`
- `frontend/src/hooks/useMemorySession.ts`
- `frontend/src/app/games/phonics-adventure/page.tsx`
- `frontend/src/app/games/word-quest/page.tsx`
- `frontend/src/app/games/memory-challenge/page.tsx`
- `backend/tests/remediation.test.js`

## Executive summary

The code does use recent performance to adapt difficulty, rather than XP, level, or total session counts. The domain-specific rules are enforced separately for phonics, reading, and memory, and each difficulty is bounded to 1..5 with explicit thresholds.

The implementation is not purely level-based. The real drivers are:
- session accuracy,
- confusion patterns and mistakes,
- TTS dependence,
- sequence recall and rhyme performance,
- duration/fatigue markers,
- consecutive good-session streaks.

However, a few relevant risks remain:
- an individual low-accuracy result can trigger immediate difficulty reduction, with no minimum sample size or consistency guard;
- there is no hard post-generation validation layer that guarantees generated question content is valid, non-repeating, and difficulty-safe beyond prompt instructions and schema constraints;
- the current automated tests cover registration, auth, badge logic, generic session submit, and refill, but not adaptive-difficulty thresholds, maintenance, boundaries, or game-specific domain transitions.

## Remediation update (implemented)

The next remediation phase was implemented under the approved constraints without redesigning the adaptive system or changing core policy thresholds.

### Changes made
- Added focused automated coverage for adaptive difficulty and pool-validation behavior in `backend/tests/remediation.test.js`.
- Preserved the existing difficulty policy in `backend/src/controllers/gameController.ts` and tested the actual threshold behavior already coded there:
  - `accuracy >= 85` with `goodSessionStreak >= 1` raises difficulty by 1;
  - `accuracy < 50` lowers difficulty by 1 immediately;
  - neutral results reset the streak without changing difficulty;
  - difficulty is clamped to 1..5 per domain.
- Added server-side validation in `backend/src/services/gamePoolService.ts` before inserting generated AI activities into the queue. Invalid or duplicate items are skipped instead of being exposed to students.
- Validation checks cover malformed activity objects, invalid difficulty values, wrong gameType, empty content, and duplicate titles/content.

### Verification results
- Backend test suite: passed (`npm test` in `backend`).
- Frontend production build: attempted, but the environment blocked execution with a permission-denied error before the command could complete.
- AI-service compile check: attempted, but the environment blocked execution with the same permission-denied error before the command could complete.

### Unresolved risks and remaining caveats
- The code still uses a single poor result to trigger an immediate drop in some specialized agent rules; this remains the actual behavior implemented in the repository and was not changed under the approved scope.
- The environment prevented a final frontend and AI-service validation pass; the backend validation is the only full pass completed in this session.

## Findings

### 1) Difficulty is based on recent performance, not XP, level, or overall session count
Classification: WORKING AS INTENDED

Evidence:
- `backend/src/models/LearningProfile.ts` defines `currentDifficulty` as a per-domain map (`reading`, `speech`, `memory`, `writing`, `phonics`) with a bounded range of 1..5.
- `backend/src/controllers/gameController.ts` updates `currentDifficulty` in a domain-specific branch using only `accuracy` and `goodSessionStreak` from the latest profile, not `student.xp`, `student.level`, or total session count.
- `ai-service/agents/phonics_agent.py`, `ai-service/agents/reading_agent.py`, and `ai-service/agents/memory_agent.py` each compute new difficulty from accuracy/confusion/tts/sequence/rhyme metrics and a streak value.

Why it matters:
- This matches the user requirement that adaptation should be based on recent performance rather than broad progression metrics.

Impact:
- Low risk. This is the intended design and is implemented consistently.

### 2) Difficulty increases and decreases gradually, with explicit thresholds and 1..5 bounds
Classification: WORKING AS INTENDED

Evidence:
- `backend/src/models/LearningProfile.ts` sets `difficultyField` to `{ default: 1, min: 1, max: 5 }`.
- `ai-service/agents/phonics_agent.py` contains `_compute_difficulty()` with ordered rules: fatigue guard, severe confusion, struggling, maintain on hard confusion, advance after good streak, steady.
- `ai-service/agents/reading_agent.py` similarly has: heavy TTS dependency drops difficulty; fatigue or accuracy < 50 drops; moderate TTS + mediocre accuracy holds; good performance plus low TTS and streak raises difficulty.
- `ai-service/agents/memory_agent.py` has explicit conditions for fatigue, sequence struggle, rhyme weakness, and advancement if `seq_accuracy >= 75`, `rhyme >= 65`, `good_streak >= 1`, `current < 5`, and `max_recalled >= current + 1`.
- `backend/src/controllers/gameController.ts` enforces `Math.min(5, Math.max(1, aiDiff[domain]))` when applying AI-derived difficulty.

Why it matters:
- The rules are bounded, progressive, and not arbitrary.

Impact:
- This is correct as coded.

### 3) A single poor session can trigger an immediate difficulty drop
Classification: POTENTIAL BUG

Evidence:
- In `ai-service/agents/phonics_agent.py`, if `accuracy < 50`, it immediately returns `max(1, current - 1)`.
- If `has_hard_confusion and accuracy < 60`, it also immediately drops difficulty.
- In `ai-service/agents/reading_agent.py`, if `tts > 5`, or `duration_seconds > 360 and accuracy < 70`, or `accuracy < 50`, it drops immediately.
- In `ai-service/agents/memory_agent.py`, if `seq_accuracy < 40`, or `seq_accuracy < 55 and rhyme < 50`, it drops immediately.
- In `backend/src/controllers/gameController.ts`, a poor session with `safeAccuracy < 50` also reduces difficulty immediately.

Why it matters:
- This is not a multi-session average. A single poor result or a single strong confusion pattern can trigger a drop, which is a potentially aggressive adaptation tactic.
- The code does not include a requirement for repeated poor performance before a drop, nor any minimum sample count.

Impact:
- Could produce over-correction for a single unlucky round, especially if a single visual confusion or short session is not representative.
- This is a real behavior of the current implementation, but it may or may not be desired. It needs explicit product intent and validation.

### 4) Adaptation is maintained separately per skill domain using the correct domain-specific metrics
Classification: WORKING AS INTENDED

Evidence:
- `backend/src/models/LearningProfile.ts` stores `currentDifficulty` as a map by domain, and `goodSessionStreak` as a map by domain.
- `backend/src/controllers/gameController.ts` resolves the domain using `domainMap`:
  - `phonics_adventure` -> `phonics`
  - `word_quest` -> `reading`
  - `memory_challenge` -> `memory`
- `ai-service/agents/orchestrator.py` sets `domain_map` and only applies the corresponding `perf_context.newDifficulty` to the played domain, leaving other domains untouched.
- The specialist agents operate on their own inputs: phonics uses confusion matrix; reading uses TTS and accuracy; memory uses sequence accuracy and rhyme score.

Why it matters:
- This separate domain model matches the actual game structure and prevents cross-contamination between reading, memory, and phonics progression.

Impact:
- Good design and consistent implementation.

### 5) The next question is selected from the generated pool using the updated difficulty, and the pool is refilled with session context
Classification: WORKING AS INTENDED

Evidence:
- `backend/src/services/gamePoolService.ts` `doRefill()` reads the student profile and passes `currentDifficulty: profile.currentDifficulty` into `learnerState`.
- It then calls `aiService.orchestrate({ learnerState, gameResult })`, and each generated activity is stored with a `difficulty` field alongside `content` and `title` in `GamePool`.
- `backend/src/models/GamePool.ts` stores each pool item as `{ content, difficulty, title, generatedAt, consumed }`.
- `backend/src/services/gamePoolService.ts` `peekNextGame()` and `popNextGame()` return the pool item with the stored `difficulty` and remove items from the queue when consumed.
- `frontend/src/hooks/usePoolGame.ts` `peekPool()` fetches `/api/games/pool/:gameType/peek` and `consumeAndPreload()` fetches `/api/games/pool/:gameType` to get the next AI-generated item.
- `frontend/src/app/games/phonics-adventure/page.tsx`, `word-quest/page.tsx`, and `memory-challenge/page.tsx` call `peekPool` on mount and `consumeAndPreload` after the session completes.

Why it matters:
- The next question is not selected from a static difficulty-only formula at the frontend; it is pulled from a difficulty-tagged AI-generated pool.

Impact:
- This design is coherent. The item returned to the client carries the generated difficulty, and the refill is seeded from the actual post-session performance.

### 6) Pool refill is concurrency-safe but there is no server-side validation of content uniqueness or difficulty safety after generation
Classification: POTENTIAL BUG

Evidence:
- `backend/src/services/gamePoolService.ts` has `refillLocks` and a `$slice` cap on appended items to prevent duplicate concurrent refill storms.
- `GamePool.findOneAndUpdate(..., { $push: { items: { $each: newItems, $slice: -POOL_TARGET } } })` limits queue growth.
- However, the AI generation prompt in `ai-service/agents/recommendation_agent.py` includes human-language instructions such as: `CRITICAL: Every response must have completely different words... never repeat the same content`; and `Set confusionRisk=true ...` / `Use EXACTLY minSequenceLength...`.
- There is no actual validation passed through the codebase that checks whether the returned JSON content respects those instructions before it is stored in the pool.
- The schema in `ai-service/models/schemas.py` validates structure and numeric ranges, but does not enforce content uniqueness, quality, or difficulty correctness beyond the range 1..5.

Why it matters:
- The validation is prompt-based and schema-based, not verifier-based.
- This means repeated questions, stale or invalid item structure, or wrong-level content can still reach the pool if the model output drifts.

Impact:
- Potentially inconsistent student experience, especially when the model returns repeated theme text or slightly invalid content.

### 7) Stale cached pool state is handled on the client, but there is not a backend guarantee against repeated or stale content in a live queue
Classification: POTENTIAL BUG / NEEDS TESTING

Evidence:
- `frontend/src/hooks/usePoolGame.ts` includes `clearLevel()` and `peekPool()` logic designed to avoid stale state: it clears the current level before reloading on restart, and uses `peekPool(true)` to gate render until a new item loads.
- `backend/src/services/gamePoolService.ts` uses `peekNextGame()` to read the first item without consuming it and `popNextGame()` to consume it later.
- The first item in the queue is returned without verifying whether the client or server already delivered it elsewhere, and the queue is not versioned.
- The AI prompt attempts to prevent repetition, but the backend does not re-check it before pushing to the queue.

Why it matters:
- The queue is effectively a best-effort cache; it can still hold stale items if the client keeps an old level state or if concurrent pool fetches race.
- The code attempts to manage this on the client, but there is no strict verification of delivery uniqueness or queue versioning at the server layer.

Impact:
- Low to moderate risk. The behavior is mostly controlled, but correctness depends on the AI response and timing.

### 8) Performance metrics are used consistently and correctly in each domain-specific agent
Classification: WORKING AS INTENDED

Evidence:
- `ai-service/agents/analytics_agent.py` computes updated scores via a weighted average: `current * 0.7 + new * 0.3`.
- `backend/src/controllers/gameController.ts` updates the stored profile scores with the same weighted average approach (`Math.round((profileScore * 0.7) + (accuracy * 0.3))`) before it triggers AI orchestration.
- `frontend/src/hooks/usePhonicsSession.ts` records `accuracy`, `mistakeLog`, and `confusionMatrix` by tracking per-item results.
- `frontend/src/hooks/useWordQuestSession.ts` records `accuracy` and `ttsUsageCount`.
- `frontend/src/hooks/useMemorySession.ts` records `sequenceAccuracy`, `maxSequenceRecalled`, and `rhymeScore`.
- `ai-service/agents/phonics_agent.py` uses confusion matrix and accuracy.
- `ai-service/agents/reading_agent.py` uses accuracy and TTS count.
- `ai-service/agents/memory_agent.py` uses sequence accuracy, rhyme score, and recall length.
- `ai-service/agents/orchestrator.py` includes `difficultyDirection`, `newDifficulty`, and session timing in the performance context passed to the recommendation agent.

Why it matters:
- The metrics used for adaptation match the gameplay domain.

Impact:
- This is consistent and useful. There is no evidence of incorrect metric-to-domain mapping.

### 9) There is an authoritative local heuristic and an AI-orchestrated override; the final difficulty is the AI result, not a direct merge of both paths
Classification: WORKING AS INTENDED

Evidence:
- `backend/src/controllers/gameController.ts` first locally updates the profile difficulty using a simple heuristic:
  - `accuracy >= 85` with a streak threshold increases difficulty;
  - `accuracy < 50` reduces difficulty;
  - neutral results reset the streak.
- It then calls `aiService.orchestrate(...)` and merges the result with:
  - `if (aiResp.difficultyAdjustments && domain) { ... Math.min(5, Math.max(1, aiDiff[domain])) ... }`
- That AI-based value is then written to the same `currentDifficulty` field.

Why it matters:
- The profile is not left at the local heuristic value; the AI result is the authoritative update.
- This creates a consistent final state but makes the local heuristic a pre-processing step rather than the primary decision point.

Impact:
- Intentional design. It is not a contradiction, but it does mean difficulty changes are ultimately AI-governed after each session.

### 10) Backend adaptive transitions are covered, but specialist-agent rules remain untested
Classification: NEEDS TESTING

Evidence:
- `backend/tests/remediation.test.js` contains tests for:
  - duplicate achievement race handling,
  - student registration,
  - login,
  - session submission and XP award,
  - backend difficulty increase, decrease, neutral maintenance, bounds, and separate phonics/reading/memory updates,
  - pool refill after session submission and generated-activity validation.
- The specialist-agent thresholds and their additional metrics in `ai-service/agents/phonics_agent.py`, `reading_agent.py`, and `memory_agent.py` are not directly tested.

Why it matters:
- The code has strong behavior but very little automated proof for the adaptation logic itself.

Impact:
- Moderate. Backend transitions have regression coverage, but agent-specific rules and metric combinations do not.

## Key conclusions

1. The actual implementation is performance-driven rather than level/XP-based. This is mostly correct and consistent with the architecture.
2. Difficulty is bounded to 1..5 and generally advances or drops gradually based on explicit thresholds.
3. The code does permit an immediate drop on a poor session or a hard confusion pattern, which is a design choice that may be overly aggressive and should be validated product-wise.
4. The system has domain-specific adaptation and queue refill logic that works coherently from backend to frontend.
5. Focused backend validation and transition tests now exist; remaining coverage gaps are specialist-agent thresholds, multi-process refill coordination, and live AI response variability.

## Prioritized fixes and tests

High priority:
- Add test coverage for the exact threshold conditions in `phonics_agent.py`, `reading_agent.py`, and `memory_agent.py`.
- Decide whether immediate difficulty drops after one poor round are acceptable or should require repeated poor performance before a decrease.

Medium priority:
- Continue monitoring the server-side verification and bounded retry behavior for AI-generated activity content.
- Add a queue/versioning check to reduce stale or duplicate content risk during concurrent pool fetches.

Low priority:
- Review the product-level policy for a single poor performance causing a drop versus requiring repeated poor results.
- Add a test proving the final stored `LearningProfile.currentDifficulty` matches the AI-authoritative update path.

## Final assessment

The adaptive-difficulty system is implemented as a genuine recent-performance model, using game-specific metrics and a domain-specific profile. Backend transitions and generated activity checks have regression coverage. Remaining risks include untested specialist-agent metric combinations, the product intent for rapid drops, and multi-process concurrency around pool refill.

## Question-pool refill reliability update

The refill path now retries incomplete generation a bounded number of times. `backend/src/services/gamePoolService.ts` exports `MAX_REFILL_RETRIES = 2`, so a refill makes at most three generation rounds total. Each round only requests the remaining capacity, and no AI request is made when the pool already has `POOL_TARGET` items.

Duplicate validation seeds its title and canonical-content sets from the existing pool, then updates them as newly accepted activities are selected. Titles are compared case-insensitively with repeated whitespace normalized; content object keys are sorted recursively and string whitespace is normalized while array order and string case remain significant. Unique-title enforcement and the existing game type, required-field, content, and 1..5 difficulty checks remain in place.

If retries are exhausted, valid generated activities are appended up to the remaining pool capacity, and existing items are preserved. If no valid activity is generated, no pool write occurs and a non-sensitive incomplete-refill warning is logged. The existing API contract remains unchanged: empty `peek`/`pop` results are represented as `game: null`; `frontend/src/hooks/usePoolGame.ts` polls for a newly available item and ultimately continues with static content.

Focused backend tests cover duplicate output followed by a successful retry, exhausted invalid output and retry-limit enforcement, preserving existing entries after partial or failed refills, duplicate checks against existing entries, and skipping generation for a full pool. These complement the existing adaptive-difficulty tests; no adaptive policy or threshold was changed.

Verification for this reliability update:
- `cd backend && npm test`: passed; TypeScript build succeeded and all 11 tests passed.
- `git diff --check`: passed; Git reported only existing line-ending conversion warnings.

Remaining limitations: the retry bound is per refill invocation and uses an in-memory lock, so it does not coordinate duplicate refill jobs across multiple backend processes. The AI service may still return fewer than requested activities after the retry budget; the refill logs this and retains all existing pool entries rather than fabricating content.
