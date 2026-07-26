# DysLex AI — Architecture

## Service Map

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (child / parent)                                            │
│                                                                      │
│  Next.js 14 App Router (frontend — port 3000)                        │
│  • Tailwind CSS + Lexend font + Framer Motion                        │
│  • AccessibilityContext (font toggle, large text, reduced motion)    │
│  • Pages: /login  /register  /dashboard  /games/*  /parent-zone     │
└──────────────────┬───────────────────────────────────────────────────┘
                   │ REST (axios → NEXT_PUBLIC_API_URL)
                   ▼
┌──────────────────────────────┐
│  Express Backend (port 5000) │
│                              │
│  Routes:                     │
│   POST /api/auth/login       │
│   POST /api/auth/student/    │
│        register              │
│   GET  /api/auth/me          │
│   GET  /api/students/:id/    │
│        dashboard             │
│   PUT  /api/students/:id/    │
│        profile               │
│   POST /api/games/session    │
│   GET  /api/games/pool/      │
│        :gameType             │
│   GET  /api/games/pool/      │
│        :gameType/count       │
│   GET  /api/students/:id/    │
│        analytics             │
│                              │
│  Middleware:                 │
│   JWT protect()              │
│   helmet + CORS + rate-limit │
│                              │
│  Database: MongoDB Atlas     │
│   (Mongoose ODM)             │
└──────────────┬───────────────┘
               │ REST (axios → AI_SERVICE_URL)
               ▼
┌─────────────────────────────────────┐
│  FastAPI AI Service (port 8000)     │
│                                     │
│  Agents (ai-service/agents/):       │
│   orchestrator.py      — router     │
│   analytics_agent.py   — math only  │
│   phonics_agent.py     — GPT-4o     │
│   reading_agent.py     — GPT-4o     │
│   memory_agent.py      — GPT-4o     │
│   recommendation_agent.py — GPT-4o  │
│                                     │
│  Endpoints:                         │
│   POST /api/orchestrate             │
│   GET  /health                      │
└─────────────────────────────────────┘
```

> **Note:** The frontend only talks to the Express backend. The backend is the
> only caller of the FastAPI AI service. There is no direct browser → AI service path.
>
> TTS (text-to-speech) is handled entirely client-side via the browser's built-in
> Web Speech API (`useTTS.ts`) — no server call is needed.

---

## Data Flow — Game Session

```
Child plays game (Phonics Adventure / Word Quest / Memory Challenge)
      │
      │  React hook tracks: score, accuracy, attempts, mistakeLog, confusionMatrix
      ▼
POST /api/games/session  (Express — protected by JWT)
  → fetch Student + LearningProfile from MongoDB
  → save GameSession to MongoDB
  → calculateXP(accuracy, difficulty, attempts)
  → update LearningProfile (70/30 weighted avg score + difficulty)
  → update Student (xp, level, coins)
  → upsert daily AnalyticsEntry
  → trigger background pool refill (gamePoolService)
      │
      ▼  (background — does not block response)
POST /api/orchestrate  (FastAPI AI Service)
  → Orchestrator receives { learnerState, gameResult }
      │
      ├── Analytics Agent (always)
      │     70/30 weighted moving average → updated domain scores
      │
      ├── Phonics Agent   (only if gameType == "phonics_adventure")
      │     parse confusionMatrix → top letter pairs (b/d, p/q, m/w, n/u)
      │     compute new phonicsScore + difficulty
      │     GPT-4o-mini → 1 encouraging sentence
      │
      ├── Reading Agent   (only if gameType == "word_quest")
      │     compute new readingScore + difficulty
      │     lower difficulty if ttsUsageCount > 5
      │     GPT-4o-mini → 1 encouraging sentence
      │
      ├── Memory Agent    (only if gameType == "memory_challenge")
      │     average sequenceAccuracy + rhymeScore
      │     compute new memoryScore + difficulty
      │     GPT-4o-mini → 1 celebrating sentence
      │
      └── Recommendation Agent (always, runs last)
            GPT-4o → 3 personalized activities with embedded game content
            returns: activities, focusAreas, difficultyAdjustments, encouragementMessage
      │
      ▼
AI response stored in GamePool (MongoDB)
  → next "Play Again" pops a pre-generated game instantly (zero GPT wait)
```

---

## Game Pool Pattern

```
On register / login / after each session:
  gamePoolService.refillPool() fires in background
    → calls AI service with learner state
    → stores up to 10 pre-generated games per student per gameType
    → consumed = false

GET /api/games/pool/:gameType
  → pops first unconsumed item (consumed = true)
  → triggers background refill if remaining < 5
  → returns game content instantly — no GPT latency during play
```

---

## Collections (MongoDB)

| Collection | Purpose |
|------------|---------|
| `students` | Student accounts + gamification state (xp, coins, level, streak) |
| `parents` | Parent accounts + linked student IDs |
| `learningprofiles` | Per-student skill scores (0–100) + currentDifficulty (1–5) |
| `gamesessions` | Raw game result + mistakeLog + confusionMatrix per play |
| `gamepools` | Pre-generated AI game content per student per gameType |
| `analyticsEntries` | Daily aggregated analytics per student (date-keyed) |
| `achievements` | Earned badges per student |
| `recommendations` | GPT-generated activity plans + full game content |

---

## Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | frontend | Express backend base URL |
| `MONGODB_URI` | backend | MongoDB Atlas connection string |
| `JWT_SECRET` | backend | JWT signing secret (long random string) |
| `AI_SERVICE_URL` | backend | Internal URL of the FastAPI AI service |
| `FRONTEND_URL` | backend | Allowed CORS origin |
| `PORT` | backend | HTTP port (default 5000) |
| `NODE_ENV` | backend | `production` on Render, `development` locally |
| `OPENAI_API_KEY` | ai-service | GPT-4o + GPT-4o-mini calls |
| `BACKEND_URL` | ai-service | Express backend URL (CORS allow-list) |

> See `.env.example` in each service directory for a ready-to-copy template.

---

## Deployment

| Service | Host | Notes |
|---------|------|-------|
| Frontend | Vercel | Auto-deploy from `main`; set `NEXT_PUBLIC_API_URL` in dashboard |
| Backend | Render Web Service | Node.js env; set all backend env vars in dashboard |
| AI Service | Render Web Service (Docker) | Built from `ai-service/Dockerfile`; set `OPENAI_API_KEY` + `BACKEND_URL` |
| Database | MongoDB Atlas | Free M0 cluster (MVP) |
