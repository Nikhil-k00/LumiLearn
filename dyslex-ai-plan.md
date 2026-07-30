# LumiLearn — Hackathon MVP Plan

## Top-Level Overview

**Goal:** Build LumiLearn — an adaptive, multi-agent, gamified learning platform specifically engineered for children with dyslexia (ages 4–14). The platform's core thesis is that **the games are the therapy** — every mechanic directly addresses a clinical dyslexia deficit (phonological awareness, working memory, reading fluency, letter reversal confusion).

**Scope (MVP):**
- Student registration + JWT auth + learning profile creation
- Student Dashboard (XP, coins, level, streak, avatar, missions)
- 3 deeply dyslexia-specific games:
  1. **Phonics Adventure** — letter confusion tracking, sound-to-letter mapping
  2. **Word Quest** — picture-to-word, drag-and-drop sentence building, TTS on every word
  3. **Memory & Sound Challenge** — auditory memory sequences, rhyme matching, phonological memory
- Learning Analytics (per session + historical)
- Recommendation Engine (GPT-powered orchestrator)
- Parent Dashboard (progress, weak areas, reports)
- AI Speech Feedback (OpenAI Whisper API + browser Web Speech API / gTTS)
- Gamification system (XP, Coins, Badges, Streaks, Avatar unlocks)

**Out of scope for MVP:** Teacher dashboard, admin panel, Games 4–6, emotion detection, handwriting analysis, eye tracking, offline mode.

**Architecture:**
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- Backend: Node.js + Express.js + MongoDB Atlas (Mongoose)
- AI Service: Python + FastAPI — 8 agents orchestrated by GPT-4o
- Auth: JWT + bcrypt
- Storage: Cloudinary
- Speech: OpenAI Whisper API (STT) + browser Web Speech API (TTS)
- AI Brain: OpenAI GPT-4o
- Game content: Hardcoded curated JSON datasets + GPT for dynamic generation

**Deployment:** Vercel (frontend) · Render (backend + ai-service)

---

## Sub-Task 1 — Project Scaffolding & Configuration

**Intent:** Create the complete folder structure, configuration files, environment templates, and shared types for all three services so every subsequent sub-task has a stable foundation to build on.

**Expected Outcomes:**
- `frontend/`, `backend/`, `ai-service/`, `shared/`, `docs/` directories exist with correct structure
- All `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts` files configured
- `requirements.txt` and FastAPI app skeleton in place
- `.env.example` files for frontend, backend, and ai-service
- Shared TypeScript types for Student, LearningProfile, GameSession, Analytics
- Lexend font imported globally, Tailwind configured with dyslexia-friendly design tokens (font sizes, spacing, border-radius, pastel palette)

**Todo List:**
1. Create root `package.json` with workspaces for frontend and backend
2. Scaffold `frontend/` as Next.js 14 app with TypeScript, Tailwind CSS, Framer Motion
3. Configure `tailwind.config.ts` with custom dyslexia theme: Lexend font, pastel color palette (`sky`, `mint`, `lavender`, `peach`, `sunshine`), large spacing scale, rounded-3xl as default card radius
4. Add global CSS: Lexend as body font, `letter-spacing: 0.05em`, `line-height: 1.8`, `word-spacing: 0.1em` (dyslexia reading aids)
5. Scaffold `backend/` as Express + TypeScript project with `src/` structure: `routes/`, `controllers/`, `models/`, `middleware/`, `utils/`
6. Scaffold `ai-service/` as FastAPI project: `agents/`, `models/`, `api/`, `utils/`, `datasets/`
7. Create `shared/types/` with TypeScript interfaces: `Student`, `LearningProfile`, `GameSession`, `Achievement`, `AnalyticsEntry`, `Recommendation`
8. Create `.env.example` for all three services documenting every required key
9. Create `docs/ARCHITECTURE.md` with service map and data flow

**Relevant Context:**
- Dyslexia font standards: Lexend (primary), OpenDyslexic (optional toggle)
- Color palette must be soft pastels — avoid high-contrast harsh colors that cause visual stress
- All font sizes minimum 18px for ages 4–14

**Status:** [ ] pending

---

## Sub-Task 2 — Database Models & Backend Foundation

**Intent:** Define all MongoDB collections with Mongoose schemas and wire up the Express server with auth middleware, so all subsequent features have a data layer to write to.

**Expected Outcomes:**
- MongoDB connection established via `MONGODB_URI` env var
- Mongoose models: `Student`, `Parent`, `LearningProfile`, `GameSession`, `AnalyticsEntry`, `Achievement`, `Recommendation`, `Activity`
- JWT auth middleware (`protect` + `roleGuard`)
- bcrypt password hashing on Student and Parent models
- Base Express app with CORS, helmet, rate limiting, JSON parsing
- Health check endpoint `GET /api/health`

**Todo List:**
1. Create `backend/src/config/db.ts` — Mongoose connection with retry logic
2. Create Mongoose schema `Student` — fields: name, age, grade, parentEmail, preferredLanguage, favoriteCharacter, favoriteTheme, learningInterests, readingLevel, avatarUrl, xp, coins, level, streak, lastActiveDate, role
3. Create Mongoose schema `Parent` — fields: name, email, passwordHash, linkedStudentIds
4. Create Mongoose schema `LearningProfile` — fields: studentId, readingScore, speechScore, memoryScore, writingScore, phonicsScore, attentionScore, commonErrors (array), weakAreas, strongAreas, currentMission, currentDifficulty (1–5 per domain)
5. Create Mongoose schema `GameSession` — fields: studentId, gameType (enum: phonics_adventure | word_quest | memory_challenge), score, xpEarned, accuracy, duration, mistakeLog (array of {item, studentAnswer, correct}), completedAt
6. Create Mongoose schema `AnalyticsEntry` — fields: studentId, date, readingAccuracy, pronunciationScore, memoryScore, writingScore, phonicsScore, sessionTime, gameScores
7. Create Mongoose schema `Achievement` — fields: studentId, badgeId, name, description, iconUrl, earnedAt
8. Create Mongoose schema `Recommendation` — fields: studentId, generatedAt, activities (array), focusAreas, difficultyAdjustments, gpResponseRaw
9. Create `backend/src/middleware/auth.ts` — JWT verify + attach `req.user`, roleGuard factory
10. Create `backend/src/utils/jwt.ts` — sign/verify helpers
11. Wire up Express app in `backend/src/app.ts` with all middleware
12. Create `backend/src/server.ts` entry point

**Relevant Context:**
- `LearningProfile.currentDifficulty` is the key field the Recommendation Agent writes to — it controls game difficulty per domain
- `GameSession.mistakeLog` feeds the Phonics Agent's letter confusion tracker
- `AnalyticsEntry` is aggregated per day per student

**Status:** [ ] pending

---

## Sub-Task 3 — Authentication & Student Registration API

**Intent:** Build the complete auth flow — student registration (with initial assessment), parent registration, login for both roles, and the learning profile creation step that seeds the AI agents.

**Expected Outcomes:**
- `POST /api/auth/student/register` — creates Student + LearningProfile with initial scores
- `POST /api/auth/parent/register` — creates Parent account
- `POST /api/auth/login` — returns JWT for student or parent
- `GET /api/auth/me` — returns current user profile
- `PUT /api/students/:id/profile` — update learning profile
- Initial assessment endpoint that sets baseline scores
- All passwords hashed with bcrypt (salt rounds: 12)

**Todo List:**
1. Create `backend/src/controllers/authController.ts` with register (student), register (parent), login, getMe handlers
2. Student registration collects: name, age, grade, parentEmail, preferredLanguage, favoriteCharacter, favoriteTheme, learningInterests, readingLevel — store all as Learning Profile seed data
3. On student register, auto-create `LearningProfile` with baseline scores derived from age + readingLevel input (age 4–6 = level 1, 7–10 = level 2, 11–14 = level 3)
4. Create `backend/src/routes/authRoutes.ts` and mount at `/api/auth`
5. Create `backend/src/routes/studentRoutes.ts` for profile CRUD
6. JWT payload: `{ id, role, name }` — 7d expiry for students, 30d for parents
7. Create initial assessment endpoint `POST /api/students/:id/assessment` that accepts answers to 5 simple questions and sets initial phonics/reading/memory scores

**Relevant Context:**
- The favoriteCharacter and favoriteTheme fields are used by the GPT Recommendation Agent to personalize activity descriptions (e.g., "Help Pikachu spell these words!")
- readingLevel options: `beginner`, `emerging`, `developing`, `fluent`

**Status:** [ ] pending

---

## Sub-Task 4 — AI Service Foundation & Agent Architecture

**Intent:** Build the FastAPI service with all 8 agent modules wired to GPT-4o as the orchestrator brain. Each agent has a clear responsibility, a Pydantic input/output schema, and calls GPT with a specialized system prompt tuned for dyslexia education.

**Expected Outcomes:**
- FastAPI app running on port 8000 with `/health` endpoint
- 8 agent modules in `ai-service/agents/`: orchestrator, reading, phonics, speech, memory, writing, analytics, recommendation
- GPT-4o client configured in `ai-service/utils/openai_client.py`
- Each agent has a `process(input: AgentInput) -> AgentOutput` function
- Pydantic schemas for all agent I/O in `ai-service/models/schemas.py`
- Orchestrator routes requests to the correct specialist agents and aggregates results
- `POST /api/agents/orchestrate` — main entry point called by backend

**Todo List:**
1. Create `ai-service/main.py` — FastAPI app, CORS, routers mounted
2. Create `ai-service/utils/openai_client.py` — OpenAI client singleton using `OPENAI_API_KEY` env var
3. Create `ai-service/models/schemas.py` — Pydantic models for: `LearnerState`, `GameResult`, `AgentRecommendation`, `PhonicsAnalysis`, `SpeechAnalysis`, `MemoryAnalysis`, `OrchestratorRequest`, `OrchestratorResponse`
4. Create `ai-service/agents/orchestrator.py` — receives `OrchestratorRequest` (learner profile + latest game session), calls relevant specialist agents, aggregates, returns `OrchestratorResponse` with updated scores + next activity recommendations
5. Create `ai-service/agents/phonics_agent.py` — analyzes `mistakeLog` for letter confusion patterns (b/d, p/q, m/w, n/u), returns confusion matrix + recommended phonics focus, uses GPT to generate targeted phonics exercises
6. Create `ai-service/agents/reading_agent.py` — analyzes reading accuracy, speed, skipped words, returns fluency score + vocabulary recommendations
7. Create `ai-service/agents/speech_agent.py` — receives audio blob, calls OpenAI Whisper API for transcription, compares to target text, returns pronunciation score + mispronounced phonemes
8. Create `ai-service/agents/memory_agent.py` — analyzes memory game results, sequence recall accuracy, returns working memory score + adaptive difficulty recommendation
9. Create `ai-service/agents/writing_agent.py` — analyzes spelling attempts, returns spelling patterns, common errors, confidence score
10. Create `ai-service/agents/analytics_agent.py` — aggregates all scores into daily `AnalyticsEntry`, computes weekly trends, no GPT call needed (pure computation)
11. Create `ai-service/agents/recommendation_agent.py` — takes full learner profile + analytics, calls GPT-4o with detailed system prompt to generate: today's 3 recommended activities, difficulty level per domain, encouragement message personalized to favoriteCharacter/theme
12. Create `ai-service/api/routes.py` — FastAPI router with `/orchestrate`, `/speech/analyze`, `/recommend`, `/phonics/analyze`
13. Create `ai-service/requirements.txt` — fastapi, uvicorn, openai, pydantic, python-dotenv, httpx, numpy

**Relevant Context:**
- GPT system prompts must explicitly instruct the model to: (1) consider dyslexia-specific patterns, (2) never use negative language, (3) output structured JSON, (4) personalize using the child's favorite character/theme
- The Phonics Agent's confusion matrix is the most clinically important output — b/d reversal is the #1 dyslexia indicator
- Speech Agent uses `openai.audio.transcriptions.create(model="whisper-1")` for cloud STT

**Status:** [ ] pending

---

## Sub-Task 5 — Game Content Datasets

**Intent:** Create the curated hardcoded JSON/TypeScript content datasets that power all 3 games across 3 difficulty levels, ensuring content is age-appropriate and dyslexia-specific (high b/d/p/q confusion words, CVC words, decodable texts).

**Expected Outcomes:**
- `frontend/src/data/phonics-content.ts` — letter sets, confusion pairs, CVC words, phonics rules by level
- `frontend/src/data/word-quest-content.ts` — word-picture pairs, decodable sentences, comprehension questions by level
- `frontend/src/data/memory-content.ts` — sound sequences, rhyme pairs, word chains, beginning sound sets by level
- Each dataset has 3 difficulty levels (1=beginner ages 4–6, 2=emerging ages 7–10, 3=developing ages 11–14)
- Backend `ai-service/datasets/` mirrors with Python-accessible versions

**Todo List:**
1. Create `frontend/src/data/phonics-content.ts` with:
   - Level 1: single letters a–z with audio cues, 20 CVC words (cat, dog, big, bed, pen), 5 confusion pairs (b/d, p/q)
   - Level 2: consonant blends (bl, cr, st), 30 words, 10 confusion pairs including (m/w, n/u)
   - Level 3: digraphs (sh, ch, th), 40 words, full confusion matrix
   - Each word has: `word`, `phonemes[]`, `imageUrl` (emoji fallback), `audioHint`, `confusionRisk` flag
2. Create `frontend/src/data/word-quest-content.ts` with:
   - Level 1: 15 word-picture pairs with simple 3-letter words, 5 sentences (3–4 words each)
   - Level 2: 25 pairs, compound words, 8 sentences (5–6 words)
   - Level 3: 35 pairs, multisyllabic words, 10 sentences + 3 comprehension questions per passage
3. Create `frontend/src/data/memory-content.ts` with:
   - Level 1: 3-item sound sequences, 10 rhyme pairs (cat/hat, dog/log), 5 beginning-sound sets
   - Level 2: 4-item sequences, 15 rhyme pairs, 8 beginning-sound sets
   - Level 3: 5-item sequences, 20 rhyme pairs, word chains (sun→fun→fan→can)
4. Mirror datasets as Python dicts in `ai-service/datasets/content.py` for agent access

**Relevant Context:**
- CVC words (consonant-vowel-consonant) are the foundation of dyslexia phonics therapy
- Words with high b/d confusion risk should be flagged so the Phonics Agent can track them specifically
- All image references should use emoji as fallback so no external image loading is needed for core gameplay

**Status:** [ ] pending

---

## Sub-Task 6 — Game 1: Phonics Adventure

**Intent:** Build the most clinically important game. Phonics Adventure directly targets the core dyslexia deficit — phonological awareness and letter confusion. Every mechanic is designed around b/d/p/q reversals and sound-to-letter mapping with continuous adaptive difficulty.

**Expected Outcomes:**
- Fully playable Phonics Adventure game at `frontend/src/app/games/phonics-adventure/`
- 4 game modes: Letter Recognition, Sound Match, Build-a-Word, Missing Letter
- Real-time letter confusion tracking — the game detects and records b/d/p/q/m/w mistakes
- Audio button on EVERY letter and word — child can hear the sound before answering
- Animated character guide (adventure theme) that reacts to correct/incorrect answers
- After each round, session data posted to `POST /api/games/session` on backend
- Adaptive difficulty — after 3 consecutive wrong answers on same confusion pair, difficulty reduces and audio support increases

**Todo List:**
1. Create `frontend/src/app/games/phonics-adventure/page.tsx` — game entry with mode selector
2. Create `frontend/src/components/games/phonics/LetterCard.tsx` — large rounded card with letter, audio button, visual cue (animal/object starting with that letter), tap-to-hear interaction
3. Create `frontend/src/components/games/phonics/SoundMatchGame.tsx` — play audio, child taps the matching letter from 4 options. Tracks if wrong answer is the confusion pair (b chosen when d played = confusion recorded)
4. Create `frontend/src/components/games/phonics/BuildAWordGame.tsx` — drag-and-drop letter tiles to spell a shown picture. Letters are large (min 56px), well-spaced. Correct letters glow green, wrong letters gently bounce (not harsh red flash)
5. Create `frontend/src/components/games/phonics/MissingLetterGame.tsx` — word shown with one letter blanked (always a confusion-risk letter). Child picks from 2 options with audio support
6. Create `frontend/src/components/games/phonics/PhonicsGuide.tsx` — animated space/adventure character that celebrates correct answers with Framer Motion animations, gives gentle audio encouragement on wrong answers
7. Create `frontend/src/hooks/usePhonicsSession.ts` — tracks `mistakeLog[]`, `confusionMatrix{}`, `score`, `xpEarned`, `accuracy`, submits to backend on game end
8. Create `frontend/src/components/games/phonics/GameComplete.tsx` — end screen with stars earned, XP gained, specific positive feedback ("You're great at 'b' sounds! Let's practice 'd' more!")
9. Wire backend endpoint `POST /api/games/session` → calls AI service Phonics Agent → updates LearningProfile → returns XP delta
10. Add Framer Motion: letter cards bounce in, correct answers explode with confetti particles, level-up triggers full-screen celebration

**Relevant Context:**
- NEVER use red/harsh colors for wrong answers — use gentle orange glow or a "try again" bounce
- Audio must autoplay on first render of each question (accessibility for pre-readers age 4–6)
- Letter tiles must be minimum 56px × 56px for small fingers on touch screens
- confusionMatrix should be a dict: `{ "b_for_d": 3, "d_for_b": 1, "p_for_q": 2 }` — this feeds the Phonics Agent

**Status:** [ ] pending

---

## Sub-Task 7 — Game 2: Word Quest

**Intent:** Build Word Quest targeting reading fluency and vocabulary — the second major dyslexia pillar. Every word in the game has a TTS button. Drag-and-drop sentence building removes the writing barrier. Picture-word matching builds vocabulary through visual association.

**Expected Outcomes:**
- Fully playable Word Quest at `frontend/src/app/games/word-quest/`
- 3 game modes: Picture-Word Match, Sentence Builder (drag-and-drop), Story Reader with comprehension
- TTS audio button on every single word — child can hear any word before interacting with it
- Adaptive story difficulty based on learner's current readingScore from LearningProfile
- Session tracking posts to backend on completion
- GPT generates a personalized story intro using the child's favoriteCharacter

**Todo List:**
1. Create `frontend/src/app/games/word-quest/page.tsx` — entry with 3 mode cards
2. Create `frontend/src/components/games/wordquest/PictureWordMatch.tsx` — grid of image cards + word cards, child drags word to matching picture. Words use Lexend font at 24px+. TTS button reads each word aloud on hover/tap
3. Create `frontend/src/components/games/wordquest/SentenceBuilder.tsx` — jumbled word tiles shown, child drags into correct order. Sentence reads aloud when assembled correctly. Wrong order gives gentle audio cue
4. Create `frontend/src/components/games/wordquest/StoryReader.tsx` — decodable story displayed word-by-word (each word tappable for audio), comprehension questions appear after story. Uses Lexend font, 1.8 line height, highlighted current word
5. Create `frontend/src/components/games/wordquest/WordCard.tsx` — reusable word tile with audio button, large rounded style, color-coded by word type (nouns=blue, verbs=green, adjectives=yellow)
6. Create `frontend/src/hooks/useWordQuestSession.ts` — tracks word accuracy, TTS usage count (measures reading confidence), comprehension score, submits session on game end
7. Add GPT story personalization — on game start, `POST /api/ai/story` sends favoriteCharacter + currentLevel to AI service → GPT generates 3-sentence story intro
8. Create `frontend/src/components/games/wordquest/QuestComplete.tsx` — celebration with words mastered, new vocabulary collected displayed as trophy cards
9. Wire backend `POST /api/games/session` with gameType `word_quest`, post session data including `ttsUsageCount` (reading independence metric)

**Relevant Context:**
- `ttsUsageCount` is a key accessibility metric — high TTS use signals the child needs more audio support, low TTS use signals growing reading independence
- The word-by-word highlight in StoryReader is the "karaoke reading" technique — clinically proven for dyslexia reading support
- Sentence Builder word tiles must be extra large and well-spaced — children with dyslexia have fine motor challenges too

**Status:** [ ] pending

---

## Sub-Task 8 — Game 3: Memory & Sound Challenge

**Intent:** Build Memory & Sound Challenge targeting phonological memory — the third dyslexia deficit pillar. Auditory memory sequences, rhyme detection, and beginning-sound matching directly train the phonological processing that underpins reading ability.

**Expected Outcomes:**
- Fully playable Memory & Sound Challenge at `frontend/src/app/games/memory-challenge/`
- 3 game modes: Sound Sequence Memory, Rhyme Matcher, Beginning Sound Sort
- All input is audio-first — child hears sounds before seeing any text
- Sequence length adapts based on working memory score from LearningProfile
- Celebratory animations for each correct sequence recall
- Session data includes sequence accuracy, max sequence recalled correctly

**Todo List:**
1. Create `frontend/src/app/games/memory-challenge/page.tsx` — entry with 3 mode cards
2. Create `frontend/src/components/games/memory/SoundSequence.tsx` — plays a sequence of animal sounds / phoneme sounds one by one, child taps them back in order. Sequence shown as glowing orbs that light up as each plays. Child taps orbs in order. Wrong order = gentle shake, correct = cascade animation
3. Create `frontend/src/components/games/memory/RhymeMatcher.tsx` — word pair shown with audio, child decides if they rhyme (tap YES/NO large buttons). Audio plays automatically for each word. Tracks rhyme detection accuracy
4. Create `frontend/src/components/games/memory/BeginningSound.tsx` — audio plays a phoneme (e.g., "/b/"), child picks which picture starts with that sound from 3 options. Uses emoji pictures at large size
5. Create `frontend/src/components/games/memory/MemoryOrb.tsx` — reusable animated orb component that glows, pulses, and plays audio on activation. Uses Framer Motion for pulse animation
6. Create `frontend/src/hooks/useMemorySession.ts` — tracks maxSequenceLength, sequenceAccuracy, rhymeScore, beginSoundScore, submits on game end
7. Adaptive sequence logic — if child correctly recalls 3 sequences at length N, next sequence is length N+1. If 2 wrong, drop to N-1. Min length 2, max length 7
8. Create `frontend/src/components/games/memory/ChallengeComplete.tsx` — "Memory Master" end screen with personal best sequence length displayed, XP gained, badge earned if new personal best
9. Wire backend `POST /api/games/session` with gameType `memory_challenge`, include `maxSequenceRecalled` and `sequenceAccuracy`

**Relevant Context:**
- Sound Sequence is the purest test of phonological working memory — the primary cognitive deficit in dyslexia
- All sounds must be played via browser Web Speech API or pre-loaded audio files — no text shown until after the sequence is played
- The "forward digit span" (sequence recall) is a standard dyslexia assessment tool — tracking max sequence length over time is clinically meaningful data

**Status:** [ ] pending

---

## Sub-Task 9 — Gamification System

**Intent:** Build the full gamification engine — XP, Coins, Levels, Streaks, Badges, and Avatar — that transforms every game interaction into a motivating reward. This is what keeps children aged 4–14 engaged and coming back daily.

**Expected Outcomes:**
- XP award system: every game completion earns XP based on accuracy + difficulty
- Level system: levels 1–20 with increasing XP thresholds, level-up triggers full celebration screen
- Coin system: daily coins for streaks, bonus coins for perfect scores
- Achievement/Badge system: 15 badges covering different milestones
- Daily streak tracker: streak increments if student plays at least one game per day
- Avatar system: students pick avatar at registration, unlock cosmetics with coins
- All state persisted in MongoDB and served via `GET /api/students/:id/gamification`

**Todo List:**
1. Create `backend/src/utils/gamification.ts` — XP formula: `baseXP * accuracyMultiplier * difficultyMultiplier`, Level thresholds array (100, 250, 450, 700... exponential curve)
2. Create `backend/src/controllers/gamificationController.ts` — endpoints: award XP, check level up, award coins, update streak, unlock badge
3. Define 15 achievement badges in `backend/src/data/badges.ts`: First Game, Phonics Star, Word Wizard, Memory Master, 3-Day Streak, 7-Day Streak, Perfect Score, Speed Reader, Sound Champion, Level 5, Level 10, Brave Beginner, Daily Hero, Rhyme King/Queen, Spelling Bee
4. Create `frontend/src/components/gamification/XPBar.tsx` — animated progress bar showing current XP to next level, glows and fills on XP gain
5. Create `frontend/src/components/gamification/LevelUpCelebration.tsx` — full-screen Framer Motion celebration with stars, confetti, and "Level Up!" text
6. Create `frontend/src/components/gamification/BadgeCard.tsx` — badge display with icon, name, earn date. Locked badges shown as silhouette
7. Create `frontend/src/components/gamification/StreakCounter.tsx` — fire emoji streak counter, animated flame grows with streak length
8. Create `frontend/src/components/gamification/CoinDisplay.tsx` — coin count with sparkle animation on coin gain
9. Create `frontend/src/components/gamification/AvatarSelector.tsx` — grid of 12 avatar characters (space explorer, dragon, unicorn, robot, wizard, fairy, knight, astronaut, mermaid, dinosaur, superhero, fox), locked ones shown with coin cost
10. Integrate gamification awards into game completion flow — every `POST /api/games/session` response returns `{ xpAwarded, coinsAwarded, newBadges[], leveledUp, newLevel }`

**Relevant Context:**
- XP formula must reward effort not just accuracy — a child with dyslexia who tries 10 times and gets 60% accuracy should earn more XP than one who plays once at 90%
- Streak mechanics are critical for daily habit formation — missing a day should NOT reset streak if parent marks it as a "rest day" (stretch goal)
- Avatar themes should match the Adventure + Space + Fantasy design theme

**Status:** [ ] pending

---

## Sub-Task 10 — Student Dashboard

**Intent:** Build the main student dashboard — the child's home base. Designed specifically for dyslexic children: minimal text, large visuals, audio labels, clear navigation. Should feel like the hub of an adventure game.

**Expected Outcomes:**
- Student dashboard at `frontend/src/app/dashboard/student/page.tsx`
- Shows: Avatar, Name, Level, XP bar, Coins, Streak, Today's Mission, 3 game navigation cards, Recent achievements, Quick-continue last game
- All navigation items have audio labels (hover/tap plays the label text via TTS)
- Animated welcome message personalized to child's name and time of day
- Responsive for tablet and mobile (children often use iPads)
- Loading state uses skeleton animations (no harsh loading spinners)

**Todo List:**
1. Create `frontend/src/app/dashboard/student/page.tsx` — protected route, fetches student data + recommendations on load
2. Create `frontend/src/components/dashboard/student/HeroSection.tsx` — avatar display, name greeting ("Good morning, Alex! 🚀"), level badge, XP bar, streak and coin display
3. Create `frontend/src/components/dashboard/student/TodaysMission.tsx` — highlighted card showing today's recommended activity (from Recommendation Agent), large play button, mission description with audio read-aloud button
4. Create `frontend/src/components/dashboard/student/GameNavGrid.tsx` — 3 large rounded game cards with: game illustration (emoji/SVG), game name with audio button, "Play" CTA, current best score indicator
5. Create `frontend/src/components/dashboard/student/RecentAchievements.tsx` — horizontal scroll of last 3 earned badges with animation
6. Create `frontend/src/components/dashboard/student/QuickContinue.tsx` — "Continue where you left off" card showing last incomplete game session
7. Create `frontend/src/hooks/useStudentDashboard.ts` — fetches `/api/students/:id/dashboard` which returns combined student + profile + gamification + recommendations
8. Create backend `GET /api/students/:id/dashboard` — aggregates all needed data in one call to avoid multiple client requests
9. Add Framer Motion stagger animation — cards animate in one by one on page load (child-friendly bouncy entrance)
10. Add audio button on every text element — clicking/tapping plays the text via browser `window.speechSynthesis`

**Relevant Context:**
- Dashboard must work on touch screens — all tap targets minimum 44×44px (WCAG AA for motor accessibility)
- "Today's Mission" card is the most important element — it should be visually dominant and placed above the fold
- The dashboard is the first thing a child sees after login — it must be delightful and immediately engaging

**Status:** [ ] pending

---

## Sub-Task 11 — AI Recommendation & Analytics API

**Intent:** Wire the full adaptive learning loop — after every game session, the backend calls the AI service, updates the learning profile, and surfaces personalized recommendations for the next session. This is what makes DysLex AI "adaptive."

**Expected Outcomes:**
- `POST /api/games/session` fully processes a game result end-to-end: saves session → calls AI service → updates LearningProfile → awards gamification → returns new recommendations
- `GET /api/students/:id/recommendations` returns today's 3 recommended activities with GPT-personalized descriptions
- `GET /api/students/:id/analytics` returns historical scores as arrays suitable for Chart.js
- LearningProfile `currentDifficulty` fields automatically update based on agent analysis
- Analytics data includes weekly trends per domain

**Todo List:**
1. Create `backend/src/controllers/gameController.ts` — `POST /api/games/session` handler that: saves GameSession, calls AI service `/orchestrate`, receives back updated scores + recommendations, updates LearningProfile, awards XP/coins/badges, saves Recommendation, returns full response
2. Create `backend/src/services/aiService.ts` — HTTP client (axios) to call FastAPI service, with timeout and fallback if AI service is unavailable
3. Create `backend/src/controllers/analyticsController.ts` — `GET /api/students/:id/analytics` returns time-series data: last 7 days and last 30 days per domain score
4. Create `backend/src/controllers/recommendationController.ts` — `GET /api/students/:id/recommendations` returns latest Recommendation document
5. Add Chart.js data formatting in analytics controller — return `{ labels: [], datasets: [{ label, data[], borderColor, backgroundColor }] }` ready for frontend
6. Create `ai-service/agents/recommendation_agent.py` GPT prompt — instructs GPT to output JSON: `{ activities: [{type, title, description, difficulty, estimatedTime}], focusAreas: [], encouragementMessage, difficultyAdjustments: {phonics, reading, memory, writing} }`
7. Add error resilience — if AI service times out, return last valid recommendation from MongoDB rather than failing the game save

**Relevant Context:**
- The adaptive loop is the core AI differentiator — it must complete within 3 seconds for good UX
- LearningProfile difficulty fields use a 1–5 scale where 1=level-1 content, 5=level-3 advanced content
- Recommendation Agent GPT prompt MUST include: student name, favoriteCharacter, age, weakAreas, last 3 game scores, currentDifficulty per domain

**Status:** [ ] pending

---

## Sub-Task 12 — Speech Feedback Feature

**Intent:** Build the voice practice feature using OpenAI Whisper API for STT and browser Web Speech API for TTS. The child reads a word or sentence aloud, the system scores their pronunciation, and gives personalized audio feedback.

**Expected Outcomes:**
- Voice recording component in `frontend/src/components/speech/VoiceRecorder.tsx`
- Child presses microphone button → records audio → sends to AI service → gets pronunciation score + feedback
- `POST /api/speech/analyze` backend endpoint
- AI service Speech Agent calls Whisper API, compares transcription to target text, returns score
- TTS feedback plays back: "Great job! You said [word] perfectly!" or "Try again — listen: [audio]"
- Integrated into Phonics Adventure (pronounce the word) and Word Quest (read the sentence aloud)

**Todo List:**
1. Create `frontend/src/components/speech/VoiceRecorder.tsx` — microphone button using browser MediaRecorder API, records audio blob, shows waveform visualization (CSS animation), sends to backend on stop
2. Create `frontend/src/components/speech/SpeechFeedback.tsx` — displays pronunciation score (emoji stars, not numbers for young children), plays TTS feedback message, shows which sounds were correct/incorrect with gentle visuals
3. Create `backend/src/controllers/speechController.ts` — receives audio blob, forwards to AI service, returns analysis
4. Create `backend/src/routes/speechRoutes.ts` — `POST /api/speech/analyze` with multipart form data (audio file + target text + studentId)
5. Create `ai-service/agents/speech_agent.py` — receives audio file + target text, calls `openai.audio.transcriptions.create(model="whisper-1")`, compares transcription to target using Levenshtein distance, identifies mispronounced phonemes, returns `{ transcription, targetText, score, mispronounced[], feedback }`
6. Add gTTS or browser SpeechSynthesis for TTS feedback — generate encouraging audio message based on score
7. Integrate into Phonics Adventure as optional "say it aloud" mode — after letter recognition, child can speak the word and get pronunciation feedback

**Relevant Context:**
- For ages 4–6, recording must be short (max 5 seconds per word) and the microphone button must be very large and obvious
- Whisper API accepts audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm — use webm from MediaRecorder
- Pronunciation score must be expressed as 1–5 stars (emoji), never as a percentage number for young children

**Status:** [ ] pending

---

## Sub-Task 13 — Parent Dashboard

**Intent:** Build the parent-facing dashboard that shows their child's weekly/monthly progress, highlights weak areas with actionable home activities, and lets parents download a progress report. Parents need data they can discuss with teachers and therapists.

**Expected Outcomes:**
- Parent dashboard at `frontend/src/app/dashboard/parent/page.tsx`
- Shows child's progress charts (Chart.js): reading accuracy, memory score, phonics score over time
- Weak areas highlighted with specific home activity recommendations
- Achievement gallery showing all earned badges
- Download PDF report button (generates summary report)
- Notification panel for milestones and streak alerts

**Todo List:**
1. Create `frontend/src/app/dashboard/parent/page.tsx` — protected (parent role), shows linked student's data
2. Create `frontend/src/components/dashboard/parent/ProgressCharts.tsx` — 3 Chart.js line charts: Reading Accuracy (7 days), Memory Score (7 days), Phonics Score (7 days). Soft pastel colors, minimal grid lines
3. Create `frontend/src/components/dashboard/parent/WeakAreasPanel.tsx` — card list of top 3 weak areas with plain-language explanations and 2–3 home activity suggestions per area (generated by Recommendation Agent)
4. Create `frontend/src/components/dashboard/parent/AchievementGallery.tsx` — grid of earned badges with earn dates
5. Create `frontend/src/components/dashboard/parent/ActivitySummary.tsx` — this week's sessions: games played, time spent, XP earned
6. Create `frontend/src/components/dashboard/parent/DownloadReport.tsx` — button that calls `GET /api/reports/:studentId` → backend generates simple HTML-to-PDF report using a library like `pdfkit` or returns a formatted HTML page
7. Create `backend/src/controllers/reportController.ts` — generates weekly summary combining analytics + achievements + weak areas + recommendations
8. Create `backend/src/routes/parentRoutes.ts` — `GET /api/parent/child/:studentId/dashboard`, `GET /api/reports/:studentId`
9. Add parent auth guard — parent can only view their own linked student's data (validate `linkedStudentIds` contains the requested studentId)

**Relevant Context:**
- Parent dashboard is adult-facing — use normal font sizes and professional layout (unlike student UI)
- Chart.js data comes from `GET /api/students/:id/analytics` — reuse the same endpoint
- Weak area plain-language descriptions should avoid clinical jargon — use phrases like "Your child is mixing up the letters b and d" not "phoneme discrimination deficit"

**Status:** [ ] pending

---

## Sub-Task 14 — Frontend Auth, Routing & Accessibility Shell

**Intent:** Build the authentication pages (login, register), protected routing, and global accessibility features (font toggle, audio labels toggle, dark mode, focus mode) that wrap the entire application.

**Expected Outcomes:**
- Login page at `frontend/src/app/login/page.tsx` — child-friendly design with avatar picker for students, standard form for parents
- Student registration multi-step form (3 steps: identity → preferences → reading level)
- Protected routes via Next.js middleware
- Global accessibility toolbar: font toggle (Lexend / OpenDyslexic), text size, dark mode, audio labels on/off
- Persistent accessibility preferences in localStorage
- Loading states and error states for all auth flows

**Todo List:**
1. Create `frontend/src/app/login/page.tsx` — role selector (Student / Parent), student login shows avatar + name input (simpler for young children), parent login shows email + password
2. Create `frontend/src/app/register/student/page.tsx` — 3-step wizard: Step 1 (name, age, grade, avatar pick), Step 2 (favorite character, theme, interests), Step 3 (reading level self-assessment with pictures)
3. Create `frontend/src/app/register/parent/page.tsx` — standard registration: name, email, password, child's name/ID link
4. Create `frontend/src/middleware.ts` — Next.js middleware for route protection, redirect unauthenticated to `/login`
5. Create `frontend/src/contexts/AuthContext.tsx` — React context for auth state, JWT storage in httpOnly-like localStorage with refresh logic
6. Create `frontend/src/contexts/AccessibilityContext.tsx` — context for: fontSize (normal/large/xl), fontFamily (lexend/opendyslexic), darkMode, audioLabels, focusMode, highContrast
7. Create `frontend/src/components/layout/AccessibilityToolbar.tsx` — floating bottom-right toolbar with toggle buttons, persists to localStorage
8. Create `frontend/src/components/layout/AppShell.tsx` — wraps all pages, applies accessibility context classes to `<html>` element, renders toolbar
9. Add OpenDyslexic font as a fallback option via `@font-face` in global CSS

**Relevant Context:**
- For children aged 4–6, the login should require minimal typing — an avatar selection + name recognition is more accessible than email/password
- Accessibility toolbar should be persistent and easily accessible but not intrusive during gameplay
- Focus mode should dim everything except the current game element (overlay with hole) to reduce visual distraction — a key dyslexia accommodation

**Status:** [ ] pending

---

## Sub-Task 15 — Integration, Environment Config & Deployment Setup

**Intent:** Wire all three services together, configure environment variables, add CORS and proxy rules, and create deployment configuration files for Vercel and Render so the MVP is fully deployable.

**Expected Outcomes:**
- Frontend `.env.local` / Vercel env config with `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AI_SERVICE_URL`
- Backend `.env` with `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `CLOUDINARY_*`, `AI_SERVICE_URL`
- AI service `.env` with `OPENAI_API_KEY`
- `vercel.json` for frontend deployment
- `render.yaml` for backend + ai-service deployment
- `Dockerfile` for ai-service (Python FastAPI)
- End-to-end smoke test: register student → play phonics game → check dashboard updates
- README.md with setup and run instructions

**Todo List:**
1. Create `.env.example` for all three services with all required variable names and descriptions
2. Create `frontend/vercel.json` — build config, rewrites for API proxy in development
3. Create `render.yaml` — defines two Render services: `dyslex-backend` (Node) and `dyslex-ai` (Python/Docker)
4. Create `ai-service/Dockerfile` — Python 3.11 slim, install requirements, run uvicorn
5. Create `backend/Dockerfile` — Node 20 alpine, install deps, build TypeScript, run dist
6. Add CORS config to backend: allow Vercel frontend URL + localhost:3000
7. Add CORS config to FastAPI: allow Render backend URL + localhost:5000
8. Create root `README.md` — project overview, setup steps for each service, env var guide, how to run locally
9. Verify all API routes are correctly prefixed and matched between frontend fetch calls and backend route definitions
10. Add a `scripts/seed.ts` backend script that seeds the database with one demo student account for judges to test

**Relevant Context:**
- Render free tier has cold starts — add a `/health` ping from frontend on app load to wake the backend
- The `render.yaml` format requires explicit `buildCommand` and `startCommand` per service
- Demo seed account credentials should be in the README for hackathon judges

**Status:** [ ] pending

---

## Data Flow Summary

```
Student plays Phonics Adventure
        ↓
frontend: usePhonicsSession collects mistakeLog + score
        ↓
POST /api/games/session (backend Express)
        ↓
backend saves GameSession to MongoDB
        ↓
backend calls POST http://ai-service/api/agents/orchestrate
        ↓
AI Orchestrator → Phonics Agent (confusionMatrix) + Analytics Agent (scores)
        ↓
Recommendation Agent calls GPT-4o with learner state
        ↓
GPT returns: { activities[], difficultyAdjustments, encouragementMessage }
        ↓
backend updates LearningProfile.currentDifficulty
        ↓
backend awards XP + coins + checks badge unlocks
        ↓
Response to frontend: { xpAwarded, coinsAwarded, newBadges[], recommendations[] }
        ↓
Student Dashboard updates with new mission + celebration
```

---

## Key Design Constraints (Dyslexia-Specific)

| Constraint | Rule |
|---|---|
| Font | Lexend primary, OpenDyslexic toggle option |
| Font size | Minimum 18px body, 24px+ game text, 36px+ game targets |
| Letter spacing | 0.05em minimum |
| Line height | 1.8 minimum |
| Word spacing | 0.1em minimum |
| Colors | Soft pastels only — no harsh red/green for right/wrong |
| Wrong answer feedback | Gentle bounce/orange glow — NEVER red flash |
| Audio | Every text element must have an audio button |
| Touch targets | Minimum 56×56px for game elements, 44×44px for nav |
| Visual clutter | Maximum 3 interactive elements per screen |
| Background | Calm gradient or soft texture — no busy patterns |
| Transitions | Smooth, 300–500ms — avoid abrupt cuts |
| Instructions | Audio + visual — never text-only instructions |
