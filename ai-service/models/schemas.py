from pydantic import BaseModel, Field
from typing import Optional


# ─── Shared primitives ────────────────────────────────────────────────────────

class DifficultyMap(BaseModel):
    reading: int = Field(1, ge=1, le=5)
    speech:  int = Field(1, ge=1, le=5)
    memory:  int = Field(1, ge=1, le=5)
    writing: int = Field(1, ge=1, le=5)
    phonics: int = Field(1, ge=1, le=5)


class MistakeEntry(BaseModel):
    item:          str
    studentAnswer: str
    correct:       str


# ─── Learner state (sent from backend to AI service) ─────────────────────────

class LearnerState(BaseModel):
    studentId:          str
    name:               str
    age:                int
    favoriteCharacter:  Optional[str] = None
    favoriteTheme:      Optional[str] = None
    readingScore:       float = 50
    speechScore:        float = 50
    memoryScore:        float = 50
    writingScore:       float = 50
    phonicsScore:       float = 50
    weakAreas:          list[str] = []
    strongAreas:        list[str] = []
    currentDifficulty:  DifficultyMap = Field(default_factory=DifficultyMap)


# ─── Game result (sent alongside learner state) ───────────────────────────────

class GameResult(BaseModel):
    gameType:    str          # phonics_adventure | word_quest | memory_challenge
    score:       float
    accuracy:    float        # 0–100
    duration:    int          # seconds
    attempts:    int = 0
    mistakeLog:  list[MistakeEntry] = []
    confusionMatrix: dict[str, int] = {}   # e.g. {"b_for_d": 3}
    # word_quest extras
    ttsUsageCount:   Optional[int] = None
    # memory extras
    maxSequenceRecalled: Optional[int] = None
    sequenceAccuracy:    Optional[float] = None
    rhymeScore:          Optional[float] = None   # 0–100 from RhymeMatcher game


# ─── Orchestrator I/O ─────────────────────────────────────────────────────────

class OrchestratorRequest(BaseModel):
    learnerState: LearnerState
    gameResult:   GameResult


class ActivitySuggestion(BaseModel):
    gameType:        str
    title:           str
    description:     str
    targetArea:      str
    difficulty:      int
    estimatedMinutes: int
    content:         Optional[dict] = None


class OrchestratorResponse(BaseModel):
    updatedScores:          dict[str, float]          # domain -> new score
    difficultyAdjustments:  dict[str, int]            # domain -> new difficulty
    activities:             list[ActivitySuggestion]
    focusAreas:             list[str]
    encouragementMessage:   str
    confusionSummary:       Optional[dict[str, int]] = None


# ─── Individual agent I/O ─────────────────────────────────────────────────────

class PhonicsAnalysisRequest(BaseModel):
    mistakeLog:      list[MistakeEntry]
    confusionMatrix: dict[str, int]
    currentScore:    float
    difficulty:      int
    studentAge:      int
    totalAttempts:   int = 1   # total answered items in the session (correct + wrong)

class PhonicsAnalysisResult(BaseModel):
    newScore:        float
    topConfusions:   list[str]        # e.g. ["b/d", "p/q"]
    focusLetters:    list[str]
    newDifficulty:   int
    feedback:        str


class MemoryAnalysisRequest(BaseModel):
    sequenceAccuracy:    float
    maxSequenceRecalled: int
    rhymeScore:          Optional[float] = None
    currentScore:        float
    difficulty:          int

class MemoryAnalysisResult(BaseModel):
    newScore:      float
    newDifficulty: int
    feedback:      str


class ReadingAnalysisRequest(BaseModel):
    accuracy:      float
    ttsUsageCount: Optional[int]
    currentScore:  float
    difficulty:    int

class ReadingAnalysisResult(BaseModel):
    newScore:      float
    newDifficulty: int
    feedback:      str


