# DysLex AI — Full Agent Analysis & Flow Plan

## Top-Level Overview

DysLex AI is a **three-service, multi-agent, gamified learning platform** for children with dyslexia (ages 4–14). This plan documents every agent, identifies what is working vs broken, maps the complete data flow, and lists unwanted/orphaned files.

---

## Service Architecture

| Service | Stack | Port |
|---|---|---|
| `frontend/` | Next.js 14 · TypeScript · Tailwind CSS | 3000 |
| `backend/` | Node.js · Express · TypeScript · MongoDB | 5000 |
| `ai-service/` | Python · FastAPI · OpenAI GPT-4o | 8000 |

---

## Complete Data Flow

```
Child plays a game in browser (Next.js)
    │
    │  React hook (usePhonicsSession / useWordQuestSession / useMemorySession)
    │  tracks: score, accuracy, attempts, mistakeLog, confusionMatrix
    │
    ▼
POST /api/games/session  ──►  Express Backend (port 5000)
    │  JWT auth via protect() middleware
    │  1. Fetch Student + LearningProfile from MongoDB
    │  2. Save GameSession to MongoDB
    │  3. Calculate XP (gamification.ts)
    │
    ├──►  POST /api/orchestrate  ──►  FastAPI AI Service (port 8000)
    │         │
    │         │  Orchestrator Agent receives OrchestratorRequest
    │         │      (LearnerState + GameResult)
    │         │
    │         ├── Analytics Agent (pure math, no GPT)
    │         │       70/30 weighted moving average on domain scores
    │         │
    │         ├── Phonics Agent (if gameType == phonics_adventure)
    │         │       • Extract top confusion pairs (b/d, p/q, m/w, n/u)
    │         │       • Compute new phonics score
    │         │       • GPT-4o generates child-friendly feedback sentence
    │         │
    │         ├── Reading Agent (if gameType == word_quest)
    │         │       • Compute new reading score
    │         │       • TTS usage penalty if > 5 uses
    │         │       • GPT-4o generates encouragement sentence
    │         │
    │         ├── Memory Agent (if gameType == memory_challenge)
    │         │       • Compute new memory score (seq + rhyme average)
    │         │       • GPT-4o generates celebrating sentence
    │         │
    │         └── Recommendation Agent (always runs last)
    │                 • GPT-4o generates 3 personalized activities
    │                 • Returns difficulty adjustments, focusAreas, encouragementMessage
    │                 • Full JSON game content embedded in each activity
    │
    │  4. Update LearningProfile (scores + difficulty) in MongoDB
    │  5. Award XP + coins → Update Student record
    │  6. Save Recommendation to MongoDB
    │  7. Upsert daily AnalyticsEntry
    │
    ▼
Response to Frontend: { xpAwarded, recommendations, encouragementMessage, leveledUp }
    │
    ▼
Student Dashboard updates: XP bar, level, coins, streak, recommended games

─── Speech Feedback Path (separate) ────────────────────────────────────────────

Child clicks microphone → records audio (MediaRecorder)
    │
    ▼
POST /api/speech/analyze  ──►  FastAPI AI Service (port 8000)
    │  Speech Agent:
    │    1. OpenAI Whisper transcribes audio bytes
    │    2. Levenshtein distance → 1–5 star score
    │    3. GPT-4o generates kind feedback sentence
    ▼
Return { transcription, score, mispronounced, feedback }
```

---

## Agent Registry (ai-service/agents/)

### 1. Analytics Agent — `analytics_agent.py`
**Status: ✅ WORKING — No issues**

- **Role:** Pure computation. No GPT calls.
- **Entry point:** `aggregate(state, result) -> dict[str, float]`
- **Logic:** Applies a 70/30 weighted moving average to update domain scores (phonicsScore, readingScore, memoryScore, writingScore, speechScore) based on the incoming game result.
- **Called by:** Orchestrator (step 1, always)
- **Dependencies:** `models/schemas.py` only. No external services.
- **Issues:** None.

---

### 2. Phonics Agent — `phonics_agent.py`
**Status: ✅ WORKING — No issues**

- **Role:** Specialist agent for the `phonics_adventure` game type.
- **Entry point:** `async analyze(req: PhonicsAnalysisRequest) -> PhonicsAnalysisResult`
- **Logic:**
  1. Parses `confusionMatrix` to extract top letter confusion pairs (e.g., `b_for_d` → `b/d`)
  2. Computes accuracy from mistake ratio
  3. Applies 70/30 weighted average for new phonics score
  4. Computes new difficulty (±1 based on 80%/50% thresholds)
  5. Calls **GPT-4o** for one short child-friendly feedback sentence
- **Called by:** Orchestrator (step 2 — only for `phonics_adventure`)
- **Dependencies:** `openai_client.py`, `models/schemas.py`
- **Issues:** None.

---

### 3. Reading Agent — `reading_agent.py`
**Status: ✅ WORKING — No issues**

- **Role:** Specialist agent for the `word_quest` game type.
- **Entry point:** `async analyze(req: ReadingAnalysisRequest) -> ReadingAnalysisResult`
- **Logic:**
  1. Computes new reading score (70/30 weighted average)
  2. Adjusts difficulty (±1 based on 80%/50% thresholds)
  3. If TTS usage > 5, lowers difficulty (child needs more audio support)
  4. Calls **GPT-4o** for one short encouragement sentence
- **Called by:** Orchestrator (step 2 — only for `word_quest`)
- **Dependencies:** `openai_client.py`, `models/schemas.py`
- **Issues:** None.

---

### 4. Memory Agent — `memory_agent.py`
**Status: ✅ WORKING — No issues**

- **Role:** Specialist agent for the `memory_challenge` game type.
- **Entry point:** `async analyze(req: MemoryAnalysisRequest) -> MemoryAnalysisResult`
- **Logic:**
  1. Computes new memory score as average of sequence accuracy + optional rhyme score
  2. Adjusts difficulty (±1 based on thresholds)
  3. Calls **GPT-4o** for one celebrating sentence about sequences recalled
- **Called by:** Orchestrator (step 2 — only for `memory_challenge`)
- **Dependencies:** `openai_client.py`, `models/schemas.py`
- **Issues:** None.

---

### 5. Recommendation Agent — `recommendation_agent.py`
**Status: ✅ WORKING — Complex but functional**

- **Role:** Uses GPT-4o to generate personalized game content and activity recommendations.
- **Entry point:** `async recommend(state: LearnerState, updated_scores: dict) -> dict`
- **Logic:**
  1. Identifies weak areas from updated scores (< 50, or bottom 2 if all pass)
  2. Sends a large structured prompt to **GPT-4o** (JSON mode) with the child's profile
  3. GPT generates 3 full activities — one per game type — with embedded game content
    - `phonics_adventure`: words with confusion risk, confusion pairs, sentence fragments
    - `word_quest`: word-picture pairs, sentences, story + comprehension questions
    - `memory_challenge`: sequence items, rhyme pairs, beginning sound items, word chains
  4. Returns difficulty adjustments, focus areas, and encouragement message
- **Called by:** Orchestrator (step 3, always)
- **Dependencies:** `openai_client.py`, `models/schemas.py`
- **Issues:** None functionally. GPT parse failures are caught and logged.

---

### 6. Speech Agent — `speech_agent.py`
**Status: ✅ WORKING — No issues**

- **Role:** Transcribes audio via OpenAI Whisper, scores pronunciation, gives feedback.
- **Entry point:** `async analyze_audio(audio_bytes, filename, target_text) -> SpeechAnalysisResult`
- **Logic:**
  1. Calls **OpenAI Whisper** (`whisper-1`) to transcribe audio bytes
  2. Computes Levenshtein edit distance at word level → 1–5 star score
  3. Finds mispronounced words (words in target not in transcription)
  4. Calls **GPT-4o** for child-friendly feedback (celebrates ≥ 4 stars, encourages < 4)
- **Called by:** API route `POST /api/speech/analyze` (NOT through orchestrator)
- **Dependencies:** `openai_client.py`, `models/schemas.py`
- **Issues:** None.

---

### 7. Orchestrator — `orchestrator.py`
**Status: ✅ WORKING — Coordinator, not a GPT agent itself**

- **Role:** Central coordinator. Receives game result + learner state, calls appropriate agents, assembles final response.
- **Entry point:** `async orchestrate(req: OrchestratorRequest) -> OrchestratorResponse`
- **Logic:**
  1. Calls Analytics Agent (always)
  2. Calls one specialist agent based on `gameType`
  3. Calls Recommendation Agent (always last)
  4. Assembles `OrchestratorResponse`
- **Called by:** API route `POST /api/orchestrate`
- **Issues:** None. Clean flow.

---

---

## Backend Agent-Adjacent Services

### Express Backend — `backend/src/`

| File | Role | Status |
|---|---|---|
| `server.ts` | Bootstrap MongoDB + start Express | ✅ Working |
| `app.ts` | Express app: CORS, helmet, rate-limit, routes | ✅ Working |
| `config/db.ts` | MongoDB connection | ✅ Working |
| `middleware/auth.ts` | JWT protect() middleware | ✅ Working |
| `controllers/authController.ts` | Student/Parent register, login, getMe, assessment | ✅ Working |
| `controllers/gameController.ts` | submitGameSession, getNextLevel | ✅ Working |
| `controllers/analyticsController.ts` | 7-day analytics per student | ✅ Working |
| `controllers/studentController.ts` | Dashboard, profile update | ✅ Working |
| `services/aiService.ts` | Axios client calling FastAPI | ✅ Working |
| `utils/gamification.ts` | XP calculation, level lookup | ✅ Working |
| `utils/jwt.ts` | Sign/verify JWT | ✅ Working |

### MongoDB Models

| Model | Purpose | Status |
|---|---|---|
| `Student` | Student account + gamification state | ✅ |
| `Parent` | Parent account + linked student IDs | ✅ |
| `LearningProfile` | Per-student skill scores + difficulty | ✅ |
| `GameSession` | Raw game result + mistakeLog | ✅ |
| `AnalyticsEntry` | Daily aggregated analytics | ✅ |
| `Achievement` | Earned badges | ✅ — stored but no award logic in backend |
| `Recommendation` | GPT-generated activity plans | ✅ |

---

## Frontend Hooks/Agents (Client-Side)

| Hook | Role | Status |
|---|---|---|
| `usePhonicsSession.ts` | Tracks score, accuracy, confusionMatrix for phonics game | ✅ Working |
| `useWordQuestSession.ts` | Tracks score, accuracy, TTS usage for word quest | ✅ Working |
| `useMemorySession.ts` | Tracks sequence accuracy, rhyme score, max recalled | ✅ Working |
| `useDashboardData.ts` | Fetches student dashboard from backend | ✅ Working |
| `useTTS.ts` | Web Speech API text-to-speech hook | ✅ Working |
| `AuthContext.tsx` | Login, register, JWT persistence in localStorage | ✅ Working |

---

## Issues Found

### Critical Issues

| # | Issue | File | Impact |
|---|---|---|---|
| 1 | **Missing Dockerfile** | `ai-service/Dockerfile` (referenced in `render.yaml`) | ❌ AI service cannot be deployed to Render — deploy will fail |
| 2 | **Writing Agent not wired** | `ai-service/agents/writing_agent.py` | ❌ Dead code — no game type, no route, not called anywhere |
| 3 | **`__init__.py` is stale** | `ai-service/agents/__init__.py` | ❌ Comments list `word_agent.py` and `difficulty_agent.py` which don't exist |

### Architecture Gaps (docs vs reality)

| # | Issue | Details |
|---|---|---|
| 4 | **`docs/ARCHITECTURE.md` is outdated** | Lists `WordAgent`, `DifficultyAgent` as separate agents — they don't exist as files. Difficulty logic is inline in each specialist agent. Routes like `/phonics/evaluate` don't exist (actual route is `/api/orchestrate`). |
| 5 | **Achievement awarding not implemented** | `Achievement` model exists but nothing in backend awards badges (no controller logic to `Achievement.create()` for gameplay milestones) |
| 6 | **Parent linking not implemented** | `Parent.linkedStudentIds` field exists but no route/controller to link a parent to a student |
| 7 | **No `.env.example` files** | `README.md` instructs `cp .env.example .env` but no `.env.example` files exist in any service directory |
| 8 | **`NEXT_PUBLIC_AI_SERVICE_URL` env var unused** | Defined in `docs/ARCHITECTURE.md` but frontend never calls the AI service directly — all AI calls go through backend |

### Unwanted / Orphaned Files

| File/Directory | Reason |
|---|---|
| `ai-service/__pycache__/` | Compiled Python bytecode — should be in `.gitignore`, not source |
| `ai-service/agents/__pycache__/` | Same as above |
| `ai-service/api/__pycache__/` | Same |
| `ai-service/models/__pycache__/` | Same |
| `ai-service/utils/__pycache__/` | Same |
| `backend/dist/` | TypeScript compiled output — should be in `.gitignore`, not source |
| `backend/node_modules/` | 32,000+ files — should be in `.gitignore`, never committed |
| `frontend/node_modules/` | Same |
| `frontend/.next/` | Next.js build cache — should be in `.gitignore` |
| `ai-service/agents/writing_agent.py` | No game type, not called anywhere — dead code or future work |

---

## Sub-Task 1 — Fix Missing Dockerfile (CRITICAL for deployment)
**Status:** `[ ] pending`

**Intent:** `render.yaml` points to `ai-service/Dockerfile` which doesn't exist. Without it the AI service cannot deploy.

**Expected Outcomes:** A `Dockerfile` exists at `ai-service/Dockerfile` that runs FastAPI with uvicorn.

**Todo List:**
1. Create `ai-service/Dockerfile` using Python 3.11 slim base image
2. Install dependencies from `requirements.txt`
3. Set workdir, expose port 8000, run `uvicorn main:app`

**Relevant Context:** `render.yaml` line 31: `dockerfilePath: ./ai-service/Dockerfile`

---

## Sub-Task 2 — Fix `__init__.py` Stale Comments
**Status:** `[ ] pending`

**Intent:** `ai-service/agents/__init__.py` lists files that don't exist (`word_agent.py`, `difficulty_agent.py`) and is missing files that do exist (`orchestrator.py`, `writing_agent.py`).

**Expected Outcomes:** `__init__.py` accurately reflects the actual agent files in the package.

**Todo List:**
1. Update `__init__.py` comments to match the actual files: `analytics_agent.py`, `phonics_agent.py`, `reading_agent.py`, `memory_agent.py`, `speech_agent.py`, `recommendation_agent.py`, `writing_agent.py`, `orchestrator.py`

**Relevant Context:** `ai-service/agents/__init__.py`

---

## Sub-Task 3 — Wire Writing Agent OR Mark as Pending
**Status:** `[ ] pending`

**Intent:** `writing_agent.py` is fully coded but never called. Decision needed: wire it to a new game type or add a TODO comment to mark it as future work.

**Expected Outcomes:** Either (a) a new game type `spelling_challenge` is routed to the writing agent in the orchestrator, OR (b) a clear `# TODO:` comment marks it as future work.

**Todo List:**
1. Add `elif result.gameType == "spelling_challenge":` branch in `orchestrator.py` calling `writing_agent.analyze()`
2. OR add a `# TODO: wire when spelling game is built` comment to `writing_agent.py`

**Relevant Context:** `ai-service/agents/orchestrator.py` lines 18–51, `ai-service/agents/writing_agent.py`

---

## Sub-Task 4 — Add Achievement Awarding Logic
**Status:** `[ ] pending`

**Intent:** The `Achievement` model and collection exist but no code ever creates achievement records for gameplay milestones (first game, level up, streak, high accuracy).

**Expected Outcomes:** `gameController.ts` awards at least 3 milestone badges.

**Todo List:**
1. In `submitGameSession`, after XP update, check milestone conditions:
   - First game completed → `first_game` badge
   - Level up occurred → `level_up` badge
   - Accuracy ≥ 90 → `star_player` badge
2. Call `Achievement.create()` for each earned badge

**Relevant Context:** `backend/src/controllers/gameController.ts`, `backend/src/models/Achievement.ts`

---

## Sub-Task 5 — Add `.gitignore` Entries and `.env.example` Files
**Status:** `[ ] pending`

**Intent:** `__pycache__`, `dist/`, `node_modules/`, `.next/` appear to be tracked in source. `.env.example` files referenced in README don't exist.

**Expected Outcomes:** 
- Root `.gitignore` excludes build artifacts
- `.env.example` files exist in each service with all required keys (no values)

**Todo List:**
1. Create/update root `.gitignore` to exclude `__pycache__/`, `*.pyc`, `dist/`, `node_modules/`, `.next/`, `.env`
2. Create `ai-service/.env.example` with: `OPENAI_API_KEY=`, `BACKEND_URL=`
3. Create `backend/.env.example` with: `MONGODB_URI=`, `JWT_SECRET=`, `OPENAI_API_KEY=`, `AI_SERVICE_URL=`, `FRONTEND_URL=`, `PORT=`, `NODE_ENV=`
4. Create `frontend/.env.example` with: `NEXT_PUBLIC_API_URL=`

**Relevant Context:** `README.md` lines 37–39, `docs/ARCHITECTURE.md` environment variables table

---

## Sub-Task 6 — Fix `docs/ARCHITECTURE.md` to Match Reality
**Status:** `[ ] pending`

**Intent:** The architecture doc shows non-existent agents and wrong API routes, which will confuse developers.

**Expected Outcomes:** `docs/ARCHITECTURE.md` reflects actual agents, routes, and data flow.

**Todo List:**
1. Update agent list: remove `WordAgent`, `DifficultyAgent` — add that difficulty is inline in each specialist agent
2. Update API routes: replace `/phonics/evaluate`, `/wordquest/evaluate` etc. with actual routes: `POST /api/orchestrate`, `POST /api/speech/analyze`
3. Update data flow diagram to show the single `/api/orchestrate` entry point
4. Remove `NEXT_PUBLIC_AI_SERVICE_URL` from env vars table (frontend never calls AI service directly)

**Relevant Context:** `docs/ARCHITECTURE.md`

---

## Data Flow Summary (Verified)

```
Frontend Game Hook → POST /api/games/session (Backend)
  → MongoDB: save GameSession
  → POST /api/orchestrate (AI Service)
      → Analytics Agent (always, pure math)
      → Specialist Agent (one of: Phonics / Reading / Memory)
          → GPT-4o feedback sentence
      → Recommendation Agent (always)
          → GPT-4o full activity JSON
  ← OrchestratorResponse
  → MongoDB: update LearningProfile
  → MongoDB: update Student (XP, level, coins)
  → MongoDB: save Recommendation
  → MongoDB: upsert AnalyticsEntry
← Frontend response: xp, recommendations, encouragement

Frontend Speech → POST /api/speech/analyze (AI Service directly)
  → Speech Agent → Whisper → GPT-4o
← score, feedback
```

---

## Key Design Constraints Observed (Dyslexia-Specific)

- No red for errors — soft peach/orange only
- Lexend font as primary, OpenDyslexic as accessible toggle
- All body text ≥ 18px, game targets ≥ 36px
- TTS on every word in Word Quest
- Touch targets ≥ 44px
- Confusion pairs (b/d, p/q, m/w, n/u) tracked at every game level
