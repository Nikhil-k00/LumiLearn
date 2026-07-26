from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from api.routes import router as api_router

load_dotenv()

# ─── App Factory ──────────────────────────────────────────────────────────

app = FastAPI(
    title="DysLex AI — AI Service",
    description=(
        "Multi-agent AI service powering DysLex AI. "
        "Hosts the GPT-4o orchestrator and specialist agents for phonics, "
        "word recognition, memory training, speech feedback, and analytics."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("BACKEND_URL", "http://localhost:5000"),
        "http://localhost:3000",   # frontend dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Endpoint ──────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "service": "dyslex-ai-service",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
    }

# ─── Routers ──────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api", tags=["agents"])
