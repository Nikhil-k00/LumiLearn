// ─── Memory & Sound Challenge Content ─────────────────────────────────────────
// Targets phonological working memory — the core cognitive deficit in dyslexia.
// Three difficulty levels for: Sound Sequences, Rhyme Matching, Beginning Sounds.

export interface SoundSequenceItem {
  id: string;
  emoji: string;
  label: string;     // spoken label e.g. "dog sound"
  ttsText: string;   // text passed to Web Speech API
  color: string;     // orb color (Tailwind bg class)
}

export interface RhymePair {
  word1: string;
  word2: string;
  emoji1: string;
  emoji2: string;
  rhymes: boolean;   // true = they rhyme, false = distractor pair
}

export interface BeginningSound {
  phoneme: string;        // e.g. "/b/"
  ttsText: string;        // spoken instruction
  options: {
    word: string;
    emoji: string;
    isCorrect: boolean;
  }[];
}

export interface WordChain {
  words: string[];        // each shares one phoneme with next
  description: string;    // e.g. "sun → fun → fan → can"
}

export interface MemoryLevel {
  level: number;
  sequenceItems: SoundSequenceItem[];   // pool of items used to build sequences
  minSequenceLength: number;
  maxSequenceLength: number;
  rhymePairs: RhymePair[];
  beginningSound: BeginningSound[];
  wordChains: WordChain[];              // level 3 only, empty for 1–2
}

// ─── Sequence item pool (shared across levels, subset used per level) ─────────
export const ALL_SEQUENCE_ITEMS: SoundSequenceItem[] = [
  { id: "cat",    emoji: "🐱", label: "cat",     ttsText: "cat",     color: "bg-sky-pastel" },
  { id: "dog",    emoji: "🐶", label: "dog",     ttsText: "dog",     color: "bg-mint-pastel" },
  { id: "duck",   emoji: "🦆", label: "duck",    ttsText: "duck",    color: "bg-sunshine-pastel" },
  { id: "star",   emoji: "⭐", label: "star",    ttsText: "star",    color: "bg-lavender-pastel" },
  { id: "bell",   emoji: "🔔", label: "bell",    ttsText: "bell",    color: "bg-peach-pastel" },
  { id: "rain",   emoji: "🌧️", label: "rain",    ttsText: "rain",    color: "bg-sky-pastel" },
  { id: "drum",   emoji: "🥁", label: "drum",    ttsText: "drum",    color: "bg-mint-pastel" },
  { id: "moon",   emoji: "🌙", label: "moon",    ttsText: "moon",    color: "bg-lavender-pastel" },
  { id: "fire",   emoji: "🔥", label: "fire",    ttsText: "fire",    color: "bg-peach-pastel" },
  { id: "wave",   emoji: "🌊", label: "wave",    ttsText: "wave",    color: "bg-sky-pastel" },
  { id: "cloud",  emoji: "☁️", label: "cloud",   ttsText: "cloud",   color: "bg-sunshine-pastel" },
  { id: "heart",  emoji: "❤️", label: "heart",   ttsText: "heart",   color: "bg-peach-pastel" },
];

// ─── Level 1 ──────────────────────────────────────────────────────────────────
export const MEMORY_LEVEL_1: MemoryLevel = {
  level: 1,
  sequenceItems: ALL_SEQUENCE_ITEMS.slice(0, 5),  // cat, dog, duck, star, bell
  minSequenceLength: 2,
  maxSequenceLength: 4,
  rhymePairs: [
    { word1: "cat",   word2: "hat",   emoji1: "🐱", emoji2: "🎩", rhymes: true  },
    { word1: "dog",   word2: "log",   emoji1: "🐶", emoji2: "🪵", rhymes: true  },
    { word1: "sun",   word2: "run",   emoji1: "☀️", emoji2: "🏃", rhymes: true  },
    { word1: "bed",   word2: "red",   emoji1: "🛏️", emoji2: "🔴", rhymes: true  },
    { word1: "big",   word2: "pig",   emoji1: "🐘", emoji2: "🐷", rhymes: true  },
    // distractors
    { word1: "cat",   word2: "dog",   emoji1: "🐱", emoji2: "🐶", rhymes: false },
    { word1: "sun",   word2: "bed",   emoji1: "☀️", emoji2: "🛏️", rhymes: false },
    { word1: "hat",   word2: "pig",   emoji1: "🎩", emoji2: "🐷", rhymes: false },
  ],
  beginningSound: [
    {
      phoneme: "/b/",
      ttsText: "buh",
      options: [
        { word: "ball",  emoji: "⚽", isCorrect: true  },
        { word: "cat",   emoji: "🐱", isCorrect: false },
        { word: "dog",   emoji: "🐶", isCorrect: false },
      ],
    },
    {
      phoneme: "/s/",
      ttsText: "sss",
      options: [
        { word: "sun",   emoji: "☀️", isCorrect: true  },
        { word: "hat",   emoji: "🎩", isCorrect: false },
        { word: "pig",   emoji: "🐷", isCorrect: false },
      ],
    },
    {
      phoneme: "/d/",
      ttsText: "duh",
      options: [
        { word: "duck",  emoji: "🦆", isCorrect: true  },
        { word: "ball",  emoji: "⚽", isCorrect: false },
        { word: "sun",   emoji: "☀️", isCorrect: false },
      ],
    },
    {
      phoneme: "/m/",
      ttsText: "mmm",
      options: [
        { word: "moon",  emoji: "🌙", isCorrect: true  },
        { word: "duck",  emoji: "🦆", isCorrect: false },
        { word: "cat",   emoji: "🐱", isCorrect: false },
      ],
    },
    {
      phoneme: "/h/",
      ttsText: "huh",
      options: [
        { word: "hat",   emoji: "🎩", isCorrect: true  },
        { word: "dog",   emoji: "🐶", isCorrect: false },
        { word: "sun",   emoji: "☀️", isCorrect: false },
      ],
    },
  ],
  wordChains: [],
};

// ─── Level 2 ──────────────────────────────────────────────────────────────────
export const MEMORY_LEVEL_2: MemoryLevel = {
  level: 2,
  sequenceItems: ALL_SEQUENCE_ITEMS.slice(0, 8),  // first 8
  minSequenceLength: 3,
  maxSequenceLength: 5,
  rhymePairs: [
    { word1: "night",  word2: "light",  emoji1: "🌙", emoji2: "💡", rhymes: true  },
    { word1: "dragon", word2: "wagon",  emoji1: "🐉", emoji2: "🪽", rhymes: true  },
    { word1: "spring", word2: "ring",   emoji1: "🌸", emoji2: "💍", rhymes: true  },
    { word1: "cloud",  word2: "proud",  emoji1: "☁️", emoji2: "🏆", rhymes: true  },
    { word1: "moon",   word2: "soon",   emoji1: "🌙", emoji2: "⏰", rhymes: true  },
    { word1: "stone",  word2: "alone",  emoji1: "🪨", emoji2: "🧍", rhymes: true  },
    { word1: "drum",   word2: "hum",    emoji1: "🥁", emoji2: "🎵", rhymes: true  },
    { word1: "spark",  word2: "dark",   emoji1: "✨", emoji2: "🌑", rhymes: true  },
    // distractors
    { word1: "night",  word2: "dragon", emoji1: "🌙", emoji2: "🐉", rhymes: false },
    { word1: "spring", word2: "cloud",  emoji1: "🌸", emoji2: "☁️", rhymes: false },
    { word1: "moon",   word2: "drum",   emoji1: "🌙", emoji2: "🥁", rhymes: false },
    { word1: "stone",  word2: "spark",  emoji1: "🪨", emoji2: "✨", rhymes: false },
  ],
  beginningSound: [
    {
      phoneme: "/bl/",
      ttsText: "bluh",
      options: [
        { word: "blue",   emoji: "🔵", isCorrect: true  },
        { word: "red",    emoji: "🔴", isCorrect: false },
        { word: "drum",   emoji: "🥁", isCorrect: false },
      ],
    },
    {
      phoneme: "/dr/",
      ttsText: "druh",
      options: [
        { word: "dragon", emoji: "🐉", isCorrect: true  },
        { word: "spring", emoji: "🌸", isCorrect: false },
        { word: "cloud",  emoji: "☁️", isCorrect: false },
      ],
    },
    {
      phoneme: "/sp/",
      ttsText: "spuh",
      options: [
        { word: "spark",  emoji: "✨", isCorrect: true  },
        { word: "night",  emoji: "🌙", isCorrect: false },
        { word: "moon",   emoji: "🌙", isCorrect: false },
      ],
    },
    {
      phoneme: "/st/",
      ttsText: "stuh",
      options: [
        { word: "stone",  emoji: "🪨", isCorrect: true  },
        { word: "drum",   emoji: "🥁", isCorrect: false },
        { word: "ring",   emoji: "💍", isCorrect: false },
      ],
    },
    {
      phoneme: "/pr/",
      ttsText: "pruh",
      options: [
        { word: "proud",  emoji: "🏆", isCorrect: true  },
        { word: "spring", emoji: "🌸", isCorrect: false },
        { word: "cloud",  emoji: "☁️", isCorrect: false },
      ],
    },
  ],
  wordChains: [],
};

// ─── Level 3 ──────────────────────────────────────────────────────────────────
export const MEMORY_LEVEL_3: MemoryLevel = {
  level: 3,
  sequenceItems: ALL_SEQUENCE_ITEMS,  // all 12
  minSequenceLength: 4,
  maxSequenceLength: 7,
  rhymePairs: [
    { word1: "thunder",   word2: "wonder",    emoji1: "⛈️", emoji2: "🤩", rhymes: true  },
    { word1: "brave",     word2: "cave",      emoji1: "🦁", emoji2: "🕳️", rhymes: true  },
    { word1: "mystery",   word2: "history",   emoji1: "🔮", emoji2: "📜", rhymes: true  },
    { word1: "gleam",     word2: "dream",     emoji1: "✨", emoji2: "💭", rhymes: true  },
    { word1: "venture",   word2: "adventure", emoji1: "🧭", emoji2: "🗺️", rhymes: true  },
    { word1: "shimmer",   word2: "glimmer",   emoji1: "🌟", emoji2: "💎", rhymes: true  },
    // distractors
    { word1: "thunder",   word2: "gleam",     emoji1: "⛈️", emoji2: "✨", rhymes: false },
    { word1: "mystery",   word2: "brave",     emoji1: "🔮", emoji2: "🦁", rhymes: false },
  ],
  beginningSound: [
    {
      phoneme: "/str/",
      ttsText: "struh",
      options: [
        { word: "stream",   emoji: "🌊", isCorrect: true  },
        { word: "thunder",  emoji: "⛈️", isCorrect: false },
        { word: "brave",    emoji: "🦁", isCorrect: false },
      ],
    },
    {
      phoneme: "/thr/",
      ttsText: "thruh",
      options: [
        { word: "throne",   emoji: "👑", isCorrect: true  },
        { word: "gleam",    emoji: "✨", isCorrect: false },
        { word: "venture",  emoji: "🧭", isCorrect: false },
      ],
    },
    {
      phoneme: "/shr/",
      ttsText: "shruh",
      options: [
        { word: "shriek",   emoji: "😱", isCorrect: true  },
        { word: "shimmer",  emoji: "🌟", isCorrect: false },
        { word: "dream",    emoji: "💭", isCorrect: false },
      ],
    },
  ],
  wordChains: [
    { words: ["sun",  "fun",  "fan",  "can"],   description: "sun → fun → fan → can" },
    { words: ["cat",  "bat",  "bad",  "bed"],   description: "cat → bat → bad → bed" },
    { words: ["light","night","right","ring"],   description: "light → night → right → ring" },
    { words: ["dream","cream","creak","break"],  description: "dream → cream → creak → break" },
  ],
};

export const MEMORY_LEVELS: MemoryLevel[] = [MEMORY_LEVEL_1, MEMORY_LEVEL_2, MEMORY_LEVEL_3];

export const getMemoryLevel = (difficulty: number): MemoryLevel => {
  if (difficulty <= 2) return MEMORY_LEVEL_1;
  if (difficulty <= 3) return MEMORY_LEVEL_2;
  return MEMORY_LEVEL_3;
};
