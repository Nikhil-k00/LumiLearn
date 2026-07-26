// ─── Word Quest Content ────────────────────────────────────────────────────────
// Three difficulty levels for picture-word matching, sentence building,
// and story reading with comprehension.

export interface WordPicturePair {
  word: string;
  emoji: string;
  category: "noun" | "verb" | "adjective";
  audioHint: string;
}

export interface Sentence {
  words: string[];        // correctly ordered words
  emoji: string;          // represents the sentence theme
}

export interface StoryPassage {
  title: string;
  lines: string[];        // each line is one sentence — shown one at a time
  emoji: string;
  comprehensionQuestions: {
    question: string;
    options: string[];
    correct: number;      // index of correct option
  }[];
}

export interface WordQuestLevel {
  level: number;
  wordPicturePairs: WordPicturePair[];
  sentences: Sentence[];
  stories: StoryPassage[];
}

// ─── Level 1 ──────────────────────────────────────────────────────────────────
export const WORD_QUEST_LEVEL_1: WordQuestLevel = {
  level: 1,
  wordPicturePairs: [
    { word: "cat",    emoji: "🐱", category: "noun",      audioHint: "cat" },
    { word: "dog",    emoji: "🐶", category: "noun",      audioHint: "dog" },
    { word: "sun",    emoji: "☀️", category: "noun",      audioHint: "sun" },
    { word: "hat",    emoji: "🎩", category: "noun",      audioHint: "hat" },
    { word: "tree",   emoji: "🌳", category: "noun",      audioHint: "tree" },
    { word: "big",    emoji: "🐘", category: "adjective", audioHint: "big" },
    { word: "run",    emoji: "🏃", category: "verb",      audioHint: "run" },
    { word: "red",    emoji: "🔴", category: "adjective", audioHint: "red" },
    { word: "book",   emoji: "📚", category: "noun",      audioHint: "book" },
    { word: "jump",   emoji: "🐸", category: "verb",      audioHint: "jump" },
    { word: "fish",   emoji: "🐟", category: "noun",      audioHint: "fish" },
    { word: "ball",   emoji: "⚽", category: "noun",      audioHint: "ball" },
    { word: "eat",    emoji: "🍎", category: "verb",      audioHint: "eat" },
    { word: "blue",   emoji: "🔵", category: "adjective", audioHint: "blue" },
    { word: "bird",   emoji: "🐦", category: "noun",      audioHint: "bird" },
  ],
  sentences: [
    { words: ["The", "cat", "sat."],           emoji: "🐱" },
    { words: ["I", "see", "the", "sun."],      emoji: "☀️" },
    { words: ["The", "dog", "is", "big."],     emoji: "🐶" },
    { words: ["She", "can", "run", "fast."],   emoji: "🏃" },
    { words: ["A", "red", "ball", "here."],    emoji: "⚽" },
  ],
  stories: [
    {
      title: "The Little Cat",
      emoji: "🐱",
      lines: [
        "A little cat sat on a mat.",
        "The cat saw a big red ball.",
        "The cat ran to the ball.",
        "The cat hit the ball!",
        "The ball went far away.",
      ],
      comprehensionQuestions: [
        {
          question: "Where did the cat sit?",
          options: ["On a mat", "In a tree", "On the ball"],
          correct: 0,
        },
        {
          question: "What color was the ball?",
          options: ["Blue", "Red", "Big"],
          correct: 1,
        },
      ],
    },
  ],
};

// ─── Level 2 ──────────────────────────────────────────────────────────────────
export const WORD_QUEST_LEVEL_2: WordQuestLevel = {
  level: 2,
  wordPicturePairs: [
    { word: "rainbow",  emoji: "🌈", category: "noun",      audioHint: "rain-bow" },
    { word: "jungle",   emoji: "🌿", category: "noun",      audioHint: "jun-gle" },
    { word: "rocket",   emoji: "🚀", category: "noun",      audioHint: "rock-et" },
    { word: "dragon",   emoji: "🐉", category: "noun",      audioHint: "dra-gon" },
    { word: "splash",   emoji: "💦", category: "verb",      audioHint: "splash" },
    { word: "thunder",  emoji: "⛈️", category: "noun",      audioHint: "thun-der" },
    { word: "sparkle",  emoji: "✨", category: "verb",      audioHint: "spark-le" },
    { word: "purple",   emoji: "💜", category: "adjective", audioHint: "pur-ple" },
    { word: "giggle",   emoji: "😄", category: "verb",      audioHint: "gig-gle" },
    { word: "tunnel",   emoji: "🚇", category: "noun",      audioHint: "tun-nel" },
    { word: "planet",   emoji: "🪐", category: "noun",      audioHint: "plan-et" },
    { word: "brave",    emoji: "🦁", category: "adjective", audioHint: "brave" },
    { word: "whisper",  emoji: "🤫", category: "verb",      audioHint: "whis-per" },
    { word: "crystal",  emoji: "💎", category: "noun",      audioHint: "crys-tal" },
    { word: "flutter",  emoji: "🦋", category: "verb",      audioHint: "flut-ter" },
    { word: "frozen",   emoji: "🧊", category: "adjective", audioHint: "fro-zen" },
    { word: "treasure", emoji: "💰", category: "noun",      audioHint: "treas-ure" },
    { word: "dolphin",  emoji: "🐬", category: "noun",      audioHint: "dol-phin" },
    { word: "crunchy",  emoji: "🥨", category: "adjective", audioHint: "crun-chy" },
    { word: "gallop",   emoji: "🐴", category: "verb",      audioHint: "gal-lop" },
    { word: "discover", emoji: "🔭", category: "verb",      audioHint: "dis-cov-er" },
    { word: "gigantic", emoji: "🐋", category: "adjective", audioHint: "gi-gan-tic" },
    { word: "lantern",  emoji: "🏮", category: "noun",      audioHint: "lan-tern" },
    { word: "whistle",  emoji: "🎵", category: "verb",      audioHint: "whis-tle" },
    { word: "dazzle",   emoji: "🌟", category: "verb",      audioHint: "daz-zle" },
  ],
  sentences: [
    { words: ["The", "dragon", "can", "fly", "high."],            emoji: "🐉" },
    { words: ["She", "found", "a", "sparkly", "crystal."],        emoji: "💎" },
    { words: ["The", "rocket", "went", "to", "the", "planet."],   emoji: "🚀" },
    { words: ["A", "brave", "dolphin", "swam", "far", "away."],   emoji: "🐬" },
    { words: ["He", "could", "hear", "the", "thunder", "rumble."], emoji: "⛈️" },
    { words: ["The", "butterfly", "began", "to", "flutter."],     emoji: "🦋" },
    { words: ["They", "found", "treasure", "in", "the", "tunnel."], emoji: "💰" },
    { words: ["Rain", "made", "a", "beautiful", "rainbow."],      emoji: "🌈" },
  ],
  stories: [
    {
      title: "The Space Dragon",
      emoji: "🐉🚀",
      lines: [
        "A purple dragon lived on a sparkly planet.",
        "One day, she found a golden rocket ship.",
        "She jumped in and flew to the rainbow cloud.",
        "Inside the cloud was a treasure of crystals.",
        "The brave dragon brought the crystals home.",
      ],
      comprehensionQuestions: [
        {
          question: "What color was the dragon?",
          options: ["Golden", "Purple", "Blue"],
          correct: 1,
        },
        {
          question: "What did the dragon find in the cloud?",
          options: ["A rocket", "Crystals", "A rainbow"],
          correct: 1,
        },
        {
          question: "How did the dragon travel?",
          options: ["She flew with wings", "In a rocket ship", "By swimming"],
          correct: 1,
        },
      ],
    },
  ],
};

// ─── Level 3 ──────────────────────────────────────────────────────────────────
export const WORD_QUEST_LEVEL_3: WordQuestLevel = {
  level: 3,
  wordPicturePairs: [
    { word: "expedition",   emoji: "🧭", category: "noun",      audioHint: "ex-pe-di-tion" },
    { word: "constellation",emoji: "⭐", category: "noun",      audioHint: "con-stel-la-tion" },
    { word: "mysterious",   emoji: "🔮", category: "adjective", audioHint: "mys-te-ri-ous" },
    { word: "adventurous",  emoji: "🦅", category: "adjective", audioHint: "ad-ven-tur-ous" },
    { word: "transformation",emoji: "🦋",category: "noun",      audioHint: "trans-for-ma-tion" },
    { word: "illuminate",   emoji: "💡", category: "verb",      audioHint: "il-lu-mi-nate" },
    { word: "magnificent",  emoji: "🏰", category: "adjective", audioHint: "mag-nif-i-cent" },
    { word: "perseverance", emoji: "🏅", category: "noun",      audioHint: "per-se-ver-ance" },
    { word: "labyrinth",    emoji: "🌀", category: "noun",      audioHint: "lab-y-rinth" },
    { word: "telescope",    emoji: "🔭", category: "noun",      audioHint: "tel-e-scope" },
  ],
  sentences: [
    { words: ["The", "adventurous", "explorer", "entered", "the", "labyrinth."],       emoji: "🧭" },
    { words: ["Stars", "in", "a", "constellation", "light", "up", "the", "sky."],     emoji: "⭐" },
    { words: ["Her", "perseverance", "led", "her", "to", "the", "magnificent", "castle."], emoji: "🏰" },
    { words: ["The", "mysterious", "crystal", "began", "to", "illuminate."],           emoji: "🔮" },
    { words: ["He", "used", "a", "telescope", "to", "study", "the", "constellation."], emoji: "🔭" },
  ],
  stories: [
    {
      title: "The Starlight Expedition",
      emoji: "⭐🧭",
      lines: [
        "A young explorer named Sam set out on a magnificent expedition.",
        "She carried a mysterious crystal that could illuminate any darkness.",
        "Deep in the labyrinth, she discovered a beautiful constellation map.",
        "With adventurous spirit and great perseverance, she decoded the map.",
        "The transformation was complete — she became the greatest star navigator.",
      ],
      comprehensionQuestions: [
        {
          question: "What was special about Sam's crystal?",
          options: ["It was heavy", "It could illuminate darkness", "It showed maps"],
          correct: 1,
        },
        {
          question: "What did Sam find in the labyrinth?",
          options: ["A telescope", "A constellation map", "Another explorer"],
          correct: 1,
        },
        {
          question: "What quality helped Sam succeed?",
          options: ["Perseverance", "Speed", "Magic powers"],
          correct: 0,
        },
      ],
    },
  ],
};

export const WORD_QUEST_LEVELS: WordQuestLevel[] = [WORD_QUEST_LEVEL_1, WORD_QUEST_LEVEL_2, WORD_QUEST_LEVEL_3];

export const getWordQuestLevel = (difficulty: number): WordQuestLevel => {
  if (difficulty <= 2) return WORD_QUEST_LEVEL_1;
  if (difficulty <= 3) return WORD_QUEST_LEVEL_2;
  return WORD_QUEST_LEVEL_3;
};
