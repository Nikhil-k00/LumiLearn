"""
Recommendation Agent — calls GPT-4o with full learner context
to generate today's 3 recommended activities + difficulty adjustments.
"""
import json
import random
import string
from models.schemas import LearnerState, ActivitySuggestion
from utils.openai_client import get_client

SYSTEM_PROMPT = """You are an expert dyslexia learning coach for children aged 4–14.
You generate personalized, UNIQUE activity recommendations based on a child's learning profile.
Always be encouraging and positive. Personalize descriptions using the child's favorite character/theme.
CRITICAL: Every response must have completely different words, sentences, stories, rhyme pairs,
sequence items and word chains from any previous response — never repeat the same content.
Output ONLY valid JSON — no markdown, no explanation."""

def _random_seed() -> str:
    """Generate a short random string to force GPT to produce unique output each call."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

async def recommend(state: LearnerState, updated_scores: dict[str, float]) -> dict:
    character = state.favoriteCharacter or "your favorite hero"
    theme = state.favoriteTheme or "adventure"

    weak = [k for k, v in updated_scores.items() if v < 50]
    if not weak:
        weak = sorted(updated_scores, key=lambda k: updated_scores[k])[:2]

    # Compute exact sequence lengths for this child's memory difficulty
    mem_diff = state.currentDifficulty.memory
    seq_min  = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}.get(mem_diff, 2)
    seq_max  = {1: 4, 2: 5, 3: 6, 4: 7, 5: 8}.get(mem_diff, 4)

    # Unique seed ensures GPT does not cache or repeat a previous response
    seed = _random_seed()

    user_prompt = f"""
[Generation ID: {seed}] — produce entirely NEW content, different from every previous response.

Child profile:
- Name: {state.name}, Age: {state.age}
- Favorite character: {character}, Theme: {theme}
- Scores: Phonics={updated_scores.get('phonicsScore', state.phonicsScore):.0f}, Reading={updated_scores.get('readingScore', state.readingScore):.0f}, Memory={updated_scores.get('memoryScore', state.memoryScore):.0f}
- Weak areas: {', '.join(weak) or 'none identified yet'}
- Current difficulty levels: phonics={state.currentDifficulty.phonics}, reading={state.currentDifficulty.reading}, memory={mem_diff}

UNIQUENESS RULES — strictly enforced:
- Every word, story, rhyme pair, sequence item, word chain, and sentence MUST be freshly invented.
- Do NOT reuse any word list, story title, story line, rhyme pair, or word chain from prior responses.
- Vary the starting phoneme, topic, and characters in each story.
- Do NOT use "star/car", "web/bed", "Sam's Quest", or "star→stay→day→play" — these are already overused.

DIFFICULTY CONTENT GUIDE — follow precisely:

phonics_adventure (difficulty {state.currentDifficulty.phonics}/5):
  Level 1-2: 3-letter CVC words only. Single consonants. Ages 4-6.
  Level 3: Consonant blend words (bl, br, dr, cl, st, gr, pl, sk). Ages 7-9.
  Level 4-5: Digraphs and multisyllabic words. Ages 10-14.
  ALL levels: at least 4 words with b/d/p/q/m/w confusion letters, confusionRisk=true.
  Use {character} or {theme} in word choices where natural.
  PHONEMES RULE — CRITICAL: phonemes array MUST contain multiple separate string elements,
  one tile per sound chunk. NEVER put the whole word in one element.
  Examples: "cat"→["c","a","t"], "blend"→["bl","e","nd"], "thunder"→["th","u","nd","er"],
  "quick"→["qu","i","ck"], "splash"→["spl","a","sh"]. All elements lowercase.

word_quest (difficulty {state.currentDifficulty.reading}/5):
  Level 1-2: 1-2 syllable words. Sentences of 3-4 words. Story of 4-5 very simple lines.
  Level 3: 2-3 syllable words. Sentences of 5-6 words. Story with descriptive language.
  Level 4-5: 3-4 syllable words. Longer sentences. Rich vocabulary, 3 inferential questions.
  Story title and theme MUST be unique — do not reuse any previous story title.
  Invent a brand-new story plot around {character} / {theme}.

memory_challenge (difficulty {mem_diff}/5):
  Use EXACTLY minSequenceLength={seq_min} and maxSequenceLength={seq_max}.
  Level 1-2: Simple rhyme pairs with DIFFERENT word families each time (not cat/hat every time).
  Level 3: Two-syllable rhymes. Consonant blend beginning sounds.
  Level 4-5: Complex rhymes. Blend and digraph beginning sounds.
  ALL sequenceItems must be NEW objects related to {character} / {theme} — vary them each call.
  Include at least 2 non-rhyming distractor pairs in rhymePairs (rhymes: false).

Generate exactly 3 activities (one per gameType) and difficulty adjustments.
Each activity MUST include a "content" object with freshly-invented items.
Counts required:
  phonics_adventure: 8-10 words, 2-4 confusionPairs, 4-6 sentenceFragments
  word_quest: 6-8 wordPicturePairs, 4-6 sentences, 1 story (4-6 lines, 2-3 comprehension questions)
  memory_challenge: 4-6 sequenceItems, 6-8 rhymePairs (mix true/false), EXACTLY 4 beginningSound items, 2-3 wordChains

Return JSON matching this EXACT schema (replace all placeholder comments with real generated data):
{{
  "activities": [
    {{
      "gameType": "phonics_adventure",
      "title": "<unique title mentioning {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "phonics",
      "difficulty": <1-5>,
      "estimatedMinutes": <5-15>,
      "content": {{
        "letters": ["<letter>"],
        "words": [
          {{ "word": "<word>", "phonemes": ["<onset>", "<vowel>", "<coda>"], "emoji": "<emoji>", "audioHint": "<hint>", "confusionRisk": <true|false> }}
        ],
        "confusionPairs": [
          {{ "letter1": "<l1>", "letter2": "<l2>", "hint1": "<hint>", "hint2": "<hint>", "emoji1": "<e1>", "emoji2": "<e2>" }}
        ],
        "sentenceFragments": ["<sentence>"]
      }}
    }},
    {{
      "gameType": "word_quest",
      "title": "<unique title mentioning {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "reading",
      "difficulty": <1-5>,
      "estimatedMinutes": <5-15>,
      "content": {{
        "wordPicturePairs": [
          {{ "word": "<word>", "emoji": "<emoji>", "category": "<noun|verb|adjective>", "audioHint": "<hint>" }}
        ],
        "sentences": [
          {{ "words": ["<word1>", "<word2>", "<word3>"], "emoji": "<emoji>" }}
        ],
        "stories": [
          {{
            "title": "<unique story title>",
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
      "title": "<unique title mentioning {character}>",
      "description": "<1 sentence, {theme} theme, max 20 words>",
      "targetArea": "memory",
      "difficulty": <1-5>,
      "estimatedMinutes": <5-15>,
      "content": {{
        "sequenceItems": [
          {{ "id": "<id>", "emoji": "<emoji>", "label": "<label>", "ttsText": "<text>", "color": "bg-sky-pastel" }}
        ],
        "minSequenceLength": {seq_min},
        "maxSequenceLength": {seq_max},
        "rhymePairs": [
          {{ "word1": "<w1>", "word2": "<w2>", "emoji1": "<e1>", "emoji2": "<e2>", "rhymes": <true|false> }}
        ],
        "beginningSound": [
          {{
            "phoneme": "<ONSET phoneme — MUST be a word-INITIAL sound, e.g. /b/, /sh/, /bl/, /dr/, /st/>",
            "ttsText": "<how to say the phoneme aloud, e.g. 'buh', 'shh', 'bluh'>",
            "options": [
              {{ "word": "<word that STARTS WITH the phoneme>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<word that does NOT start with phoneme>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<word that does NOT start with phoneme>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<spoken>",
            "options": [
              {{ "word": "<correct word starting with phoneme>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<spoken>",
            "options": [
              {{ "word": "<correct word starting with phoneme>", "emoji": "<emoji>", "isCorrect": true }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }},
              {{ "word": "<wrong>", "emoji": "<emoji>", "isCorrect": false }}
            ]
          }},
          {{
            "phoneme": "<different ONSET phoneme>",
            "ttsText": "<spoken>",
            "options": [
              {{ "word": "<correct word starting with phoneme>", "emoji": "<emoji>", "isCorrect": true }},
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
  "encouragementMessage": "<warm unique sentence for the child, max 20 words>",
  "difficultyAdjustments": {{
    "phonics": <1-5>,
    "reading": <1-5>,
    "memory": <1-5>,
    "writing": <1-5>,
    "speech": <1-5>
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
            # log warning but keep other activities
            print("Failed parsing activity recommendation:", e, "Data:", a)

    return {
        "activities":            activities,
        "focusAreas":            data.get("focusAreas", []),
        "encouragementMessage":  data.get("encouragementMessage", "Keep going, you're amazing!"),
        "difficultyAdjustments": data.get("difficultyAdjustments", {}),
        "gptResponseRaw":        raw,
    }
