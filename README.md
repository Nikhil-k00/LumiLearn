# LumiLearn

**Adaptive, multi-agent, gamified learning platform for children with dyslexia .**

Every game mechanic directly addresses a clinical dyslexia deficit — phonological awareness, working memory, reading fluency, and letter-reversal confusion.

---

## Architecture

| Service | Stack | Port |
|---------|-------|------|
| `frontend/` | Next.js 16 · TypeScript · Tailwind CSS · Framer Motion | 3000 |
| `backend/` | Node.js · Express · TypeScript · MongoDB (Mongoose) | 5000 |
| `ai-service/` | Python · FastAPI · OpenAI API integration | 8000 |

---

## Quick Start

### 1. Clone & install
```bash
git clone <repo>
cd dyslex-ai

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt
```

### 2. Environment variables
```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example  backend/.env
cp ai-service/.env.example ai-service/.env
```
Fill in your keys in each `.env` file.

### 3. Run (three terminals)
```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && npm run dev

# Terminal 3
cd ai-service && uvicorn main:app --reload --port 8000
```

---

## Games (MVP)

1. **Phonics Adventure** — letter confusion tracking, sound-to-letter mapping
2. **Word Quest** — picture-to-word, drag-and-drop sentence building, TTS on every word
3. **Memory & Sound Challenge** — auditory memory sequences, rhyme matching, phonological memory

---

## Design Principles

- **No red** for errors — soft peach/orange only
- **Lexend** font (primary), **OpenDyslexic** (toggle)
- All body text ≥ 18 px · game targets ≥ 36 px
- Cards: `rounded-3xl` · Buttons: `rounded-full`
- Pastel palette: sky · mint · lavender · peach · sunshine
- Touch targets ≥ 44 px

---

## Deployment

- Frontend → **Vercel**
- Backend + AI Service → **Render**
