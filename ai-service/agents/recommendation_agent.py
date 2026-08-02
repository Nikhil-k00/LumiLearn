"""
Recommendation Agent — calls GPT-4o with the full learner context
(scores, difficulty direction, confusion patterns, session timing, and
personalization preferences) to generate 3 genuinely adaptive activities.
"""
import json
import random
import string
from models.schemas import LearnerState, ActivitySuggestion
from utils.openai_client import get_client

SYSTEM_PROMPT = """You are an expert dyslexia learning coach for children aged 4–14.
You generate personalized, adaptive activity recommendations based on a child's live performance data.
Always be encouraging and positive. Deeply personalize ALL content using the child's favorite character and theme —
the words, story, orbs, and rhymes must feel like they belong in that character's world.
CRITICAL: Every response must have completely different words, sentences, stories, rhyme pairs,
sequence items and word chains from any previous response — never repeat the same content.
Output ONLY valid JSON — no markdown, no explanation."""


def _random_seed() -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


def _build_session_summary(ctx) -> str:
    """Build a plain-English summary of the session context for the GPT prompt."""
    if ctx is None:
        return "No session data available yet."

    lines = []
    lines.append(f"- Difficulty direction this session: {ctx.difficultyDirection.upper()} (next level = {ctx.newDifficulty})")
    lines.append(f"- Session duration: {ctx.durationSeconds}s {'⚠ long session — child may be fatigued' if ctx.durationSeconds > 300 else ''}")
    lines.append(f"- Consecutive good sessions (streak): {ctx.goodStreak}")

    if ctx.topConfusions:
        lines.append(f"- Letter confusions (most frequent first): {', '.join(ctx.topConfusions)}")
        lines.append(f"  → Focus letters for next phonics game: {', '.join(ctx.focusLetters)}")

    if ctx.ttsUsageCount:
        level = "heavy" if ctx.ttsUsageCount > 5 else ("moderate" if ctx.ttsUsageCount >= 3 else "low")
        lines.append(f"- TTS (read-aloud) usage: {ctx.ttsUsageCount} taps ({level}) — {'use simpler sentences with familiar words' if level != 'low' else 'child reads independently — challenge with richer vocabulary'}")

    if ctx.maxSequenceRecalled:
        lines.append(f"- Longest memory sequence recalled: {ctx.maxSequenceRecalled} items")

    if ctx.sequenceAccuracy is not None:
        lines.append(f"- Sequence recall accuracy: {ctx.sequenceAccuracy:.0f}%")

    if ctx.rhymeScore is not None:
        lines.append(f"- Rhyme matching accuracy: {ctx.rhymeScore:.0f}% {'→ use simpler same-family rhymes' if ctx.rhymeScore < 55 else ''}")

    return "\n".join(lines)


async def recommend(state: LearnerState, updated_scores: dict[str, float]) -> dict:
    character = state.favoriteCharacter or "your favorite hero"
    theme = state.favoriteTheme or "adventure"
    ctx = state.sessionContext

    weak = [k for k, v in updated_scores.items() if v < 50]
    if not weak:
        weak = sorted(updated_scores, key=lambda k: updated_scores[k])[:2]

    # Compute exact sequence lengths for this child's memory difficulty
    mem_diff = ctx.newDifficulty if (ctx and ctx.difficultyDirection != "stable") else state.currentDifficulty.memory
    seq_min  = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}.get(mem_diff, 2)
    seq_max  = {1: 4, 2: 5, 3: 6, 4: 7, 5: 8}.get(mem_diff, 4)

    # Effective difficulty levels (use specialist-computed where available)
    ph_diff  = ctx.newDifficulty if (ctx and ctx.difficultyDirection != "stable" and state.currentDifficulty.phonics != ctx.newDifficulty) else state.currentDifficulty.phonics
    rd_diff  = ctx.newDifficulty if (ctx and ctx.difficultyDirection != "stable" and state.currentDifficulty.reading != ctx.newDifficulty) else state.currentDifficulty.reading

    session_summary = _build_session_summary(ctx)
    seed = _random_seed()

    user_prompt = f"""
[Generation ID: {seed}] — produce entirely NEW content, different from every previous response.

═══ CHILD PROFILE ═══
Name: {state.name}, Age: {state.age}
Favorite character: {character}
Favorite theme: {theme}
Scores: Phonics={updated_scores.get('phonicsScore', state.phonicsScore):.0f}, Reading={updated_scores.get('readingScore', state.readingScore):.0f}, Memory={updated_scores.get('memoryScore', state.memoryScore):.0f}
Weak areas: {', '.join(weak) or 'none identified yet'}
Strong areas: {', '.join(state.strongAreas) or 'none yet'}

═══ LIVE SESSION PERFORMANCE (use this to adapt content) ═══
{session_summary}

═══ CONTENT ADAPTATION RULES ═══
1. PERSONALIZATION — ALL content (words, story, orbs, rhymes, sentences) must be themed
   around "{character}" and "{theme}". A child who loves "{character}" must immediately
   recognize their world in every game. Generic words like "dog", "cat", "ball" are FORBIDDEN
   unless they directly relate to the theme.

2. DIFFICULTY DIRECTION:
   - If direction = UP: increase complexity — longer words, harder blends, longer sequences,
     multi-syllable rhymes, richer story vocabulary.
   - If direction = DOWN: reduce complexity — shorter CVC words, simpler rhymes,
     shorter sequences, very simple sentence structures, high-frequency words only.
   - If direction = STABLE: maintain current level, vary only the theme/topic.

3. PHONICS CONFUSION TARGETING: If the child confuses {', '.join(ctx.topConfusions) if ctx and ctx.topConfusions else 'no specific letters'},
   generate words that include those exact letters in both correct and confusion-risk positions.
   Set confusionRisk=true on those words so the game highlights them.

4. READING TTS DEPENDENCY: If TTS usage is high ({ctx.ttsUsageCount if ctx else 0} taps),
   use short sentences (3–4 words) with simple high-frequency words the child already knows.
   If TTS usage is low, use richer vocabulary and longer sentences.

5. MEMORY FATIGUE: If session was long (>{300}s), reduce sequence length and use
   highly familiar theme objects (easy to remember) for memory orbs.

6. UNIQUENESS — every word, story title, rhyme pair, sequence item, and word chain
   must be freshly invented for this exact session. NEVER reuse content from prior responses.

═══ DIFFICULTY CONTENT GUIDE ═══

phonics_adventure (difficulty {ph_diff}/5):
  Level 1-2: 3-letter CVC words. Single consonants. Ages 4-6.
  Level 3: Consonant blend words (bl, br, dr, cl, st, gr, pl, sk). Ages 7-9.
  Level 4-5: Digraphs and multisyllabic words. Ages 10-14.
  ALL levels: at least 4 words featuring the focus letters: {', '.join(ctx.focusLetters) if ctx and ctx.focusLetters else 'b, d, p'} — mark confusionRisk=true.
  PHONEMES RULE — CRITICAL: phonemes array MUST contain multiple separate string elements.
  Examples: "cat"→["c","a","t"], "blend"→["bl","e","nd"], "thunder"→["th","u","nd","er"].

word_quest (difficulty {rd_diff}/5):
  Level 1-2: 1-2 syllable words. Sentences of 3-4 words. Story of 4-5 very simple lines.
  Level 3: 2-3 syllable words. Sentences of 5-6 words. Descriptive story language.
  Level 4-5: 3-4 syllable words. Longer sentences. Rich vocabulary, 3 inferential questions.
  {'Use simple 3-4 word sentences — child relies heavily on audio help.' if ctx and ctx.ttsUsageCount and ctx.ttsUsageCount > 5 else 'Use age-appropriate vocabulary — child reads well independently.'}
  Story title and theme MUST be unique — invent a brand-new plot around {character} / {theme}.

memory_challenge (difficulty {mem_diff}/5):
  Use EXACTLY minSequenceLength={seq_min} and maxSequenceLength={seq_max}.
  Level 1-2: Simple same-family rhyme pairs. Single-consonant beginning sounds.
  Level 3: Two-syllable rhymes. Consonant blend beginning sounds.
  Level 4-5: Complex multi-syllable rhymes. Blend and digraph beginning sounds.
  {'Use shorter sequences and familiar objects — child showed fatigue.' if ctx and ctx.durationSeconds > 300 else 'Vary sequence items — child is engaged.'}
  ALL sequenceItems must relate to {character} / {theme} — use objects from that world.
  Include at least 2 non-rhyming distractor pairs in rhymePairs (rhymes: false).

Generate exactly 3 activities (one per gameType).
Counts required:
  phonics_adventure: 8-10 words, 2-4 confusionPairs, 4-6 sentenceFragments
  word_quest: 6-8 wordPicturePairs, 4-6 sentences, 1 story (4-6 lines, 2-3 comprehension questions)
  memory_challenge: 4-6 sequenceItems, 6-8 rhymePairs (mix true/false), EXACTLY 4 beginningSound items, 2-3 wordChains

Return JSON matching this EXACT schema:
{{
  "activities": [
    {{
      "gameType": "phonics_adventure",
      "title": "<unique title featuring {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "phonics",
      "difficulty": {ph_diff},
      "estimatedMinutes": <5-15>,
      "content": {{
        "letters": ["<letter>"],
        "words": [
          {{ "word": "<word>", "phonemes": ["<chunk>", "<chunk>"], "emoji": "<emoji>", "audioHint": "<hint>", "confusionRisk": <true|false> }}
        ],
        "confusionPairs": [
          {{ "letter1": "<l1>", "letter2": "<l2>", "hint1": "<hint>", "hint2": "<hint>", "emoji1": "<e1>", "emoji2": "<e2>" }}
        ],
        "sentenceFragments": ["<sentence featuring {character} or {theme}>"]
      }}
    }},
    {{
      "gameType": "word_quest",
      "title": "<unique title featuring {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "reading",
      "difficulty": {rd_diff},
      "estimatedMinutes": <5-15>,
      "content": {{
        "wordPicturePairs": [
          {{ "word": "<word from {theme} world>", "emoji": "<emoji>", "category": "<noun|verb|adjective>", "audioHint": "<hint>" }}
        ],
        "sentences": [
          {{ "words": ["<word1>", "<word2>", "<word3>"], "emoji": "<emoji>" }}
        ],
        "stories": [
          {{
            "title": "<unique story title featuring {character}>",
            "emoji": "<emoji>",
            "lines": ["<line1>", "<line2>", "<line3>", "<line4>"],
            "comprehensionQuestions": [
              {{ "question": "<question>", "options": ["<opt1>", "<opt2>", "<opt3>"], "correct": <0|1|2> }}
            ]
          }}
        ]
      }}
    }},
    {{
      "gameType": "memory_challenge",
      "title": "<unique title featuring {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "memory",
      "difficulty": {mem_diff},
      "estimatedMinutes": <5-15>,
      "content": {{
        "sequenceItems": [
          {{ "id": "<single-word-id>", "emoji": "<emoji>", "label": "<single word from {theme} world>", "ttsText": "<MUST be identical to label>", "color": "bg-sky-pastel" }}
        ],
        "minSequenceLength": {seq_min},
        "maxSequenceLength": {seq_max},
        "rhymePairs": [
          {{ "word1": "<w1>", "word2": "<w2>", "emoji1": "<e1>", "emoji2": "<e2>", "rhymes": <true|false> }}
        ],
        "beginningSound": [
          {{
            "phoneme": "<ONSET phoneme e.g. /b/, /sh/, /bl/, /str/>",
            "ttsText": "<letter(s), as in word — e.g. 'b, as in ball'>",
            "options": [
              {{ "word": "<word starting with phoneme>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<word NOT starting with phoneme>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<word NOT starting with phoneme>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<letter(s), as in word>",
            "options": [
              {{ "word": "<correct>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<letter(s), as in word>",
            "options": [
              {{ "word": "<correct>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<letter(s), as in word>",
            "options": [
              {{ "word": "<correct>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }}
        ],
        "wordChains": [
          {{ "words": ["<w1>", "<w2>", "<w3>", "<w4>"], "description": "<w1> -> <w2> -> <w3> -> <w4>" }}
        ]
      }}
    }}
  ],
  "focusAreas": ["<area1>", "<area2>"],
  "encouragementMessage": "<warm, personalized sentence mentioning {character} or {theme}, max 20 words>",
  "difficultyAdjustments": {{
    "phonics": {ph_diff},
    "reading": {rd_diff},
    "memory": {mem_diff},
    "writing": {state.currentDifficulty.writing},
    "speech": {state.currentDifficulty.speech}
  }}
}}
"""

    client = get_client()
    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
        max_tokens=8192,
        temperature=1.0,
        response_format={"type": "json_object"},
    )

    raw = resp.choices[0].message.content or ""
    data = json.loads(raw)

    activities = []
    for a in data.get("activities", []):
        try:
            activities.append(ActivitySuggestion(**a))
        except Exception as e:
            print("Failed parsing activity recommendation:", e, "Data:", a)

    return {
        "activities":            activities,
        "focusAreas":            data.get("focusAreas", []),
        "encouragementMessage":  data.get("encouragementMessage", "Keep going, you're amazing!"),
        "difficultyAdjustments": data.get("difficultyAdjustments", {}),
        "gptResponseRaw":        raw,
    }
