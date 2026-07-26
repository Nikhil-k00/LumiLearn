// ─── Phonics Adventure Content ────────────────────────────────────────────────
// Three difficulty levels:
//   Level 1 — ages 4–6: single letters, basic CVC words
//   Level 2 — ages 7–10: consonant blends, longer words
//   Level 3 — ages 11–14: digraphs, multisyllabic words

export interface PhonicsWord {
  word: string;
  phonemes: string[];
  emoji: string;          // visual cue — no external image needed
  audioHint: string;      // describe the sound e.g. "buh like in bear"
  confusionRisk: boolean; // true if contains b/d/p/q/m/w confusion letters
}

export interface ConfusionPair {
  letter1: string;
  letter2: string;
  hint1: string;   // mnemonic for letter1
  hint2: string;   // mnemonic for letter2
  emoji1: string;
  emoji2: string;
}

export interface PhonicsLevel {
  level: number;
  letters: string[];
  words: PhonicsWord[];
  confusionPairs: ConfusionPair[];
  sentenceFragments: string[]; // short phrases for sentence reading
}

// ─── Dyslexia confusion mnemonics ─────────────────────────────────────────────
export const CONFUSION_PAIRS: ConfusionPair[] = [
  { letter1: "b", letter2: "d", hint1: "b has a belly on the right", hint2: "d has a belly on the left",   emoji1: "🐝", emoji2: "🦆" },
  { letter1: "p", letter2: "q", hint1: "p has a tail going down",    hint2: "q has a tail going down too", emoji1: "🐧", emoji2: "👸" },
  { letter1: "m", letter2: "w", hint1: "m has mountains on top",     hint2: "w has waves on the bottom",   emoji1: "🏔️", emoji2: "🌊" },
  { letter1: "n", letter2: "u", hint1: "n has an arch going up",     hint2: "u is a cup going down",        emoji1: "🌈", emoji2: "☕" },
];

// ─── Level 1 ──────────────────────────────────────────────────────────────────
export const PHONICS_LEVEL_1: PhonicsLevel = {
  level: 1,
  letters: ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","r","s","t","u"],
  words: [
    { word: "cat",  phonemes: ["c","a","t"],  emoji: "🐱", audioHint: "c-a-t",  confusionRisk: false },
    { word: "dog",  phonemes: ["d","o","g"],  emoji: "🐶", audioHint: "d-o-g",  confusionRisk: true  },
    { word: "bed",  phonemes: ["b","e","d"],  emoji: "🛏️", audioHint: "b-e-d",  confusionRisk: true  },
    { word: "pig",  phonemes: ["p","i","g"],  emoji: "🐷", audioHint: "p-i-g",  confusionRisk: true  },
    { word: "sun",  phonemes: ["s","u","n"],  emoji: "☀️", audioHint: "s-u-n",  confusionRisk: false },
    { word: "hat",  phonemes: ["h","a","t"],  emoji: "🎩", audioHint: "h-a-t",  confusionRisk: false },
    { word: "bus",  phonemes: ["b","u","s"],  emoji: "🚌", audioHint: "b-u-s",  confusionRisk: true  },
    { word: "cup",  phonemes: ["c","u","p"],  emoji: "☕", audioHint: "c-u-p",  confusionRisk: true  },
    { word: "map",  phonemes: ["m","a","p"],  emoji: "🗺️", audioHint: "m-a-p",  confusionRisk: true  },
    { word: "net",  phonemes: ["n","e","t"],  emoji: "🕸️", audioHint: "n-e-t",  confusionRisk: false },
    { word: "fox",  phonemes: ["f","o","x"],  emoji: "🦊", audioHint: "f-o-x",  confusionRisk: false },
    { word: "leg",  phonemes: ["l","e","g"],  emoji: "🦵", audioHint: "l-e-g",  confusionRisk: false },
    { word: "dip",  phonemes: ["d","i","p"],  emoji: "🍟", audioHint: "d-i-p",  confusionRisk: true  },
    { word: "bit",  phonemes: ["b","i","t"],  emoji: "🍎", audioHint: "b-i-t",  confusionRisk: true  },
    { word: "pod",  phonemes: ["p","o","d"],  emoji: "🫛", audioHint: "p-o-d",  confusionRisk: true  },
    { word: "mud",  phonemes: ["m","u","d"],  emoji: "💧", audioHint: "m-u-d",  confusionRisk: true  },
    { word: "pen",  phonemes: ["p","e","n"],  emoji: "🖊️", audioHint: "p-e-n",  confusionRisk: true  },
    { word: "bat",  phonemes: ["b","a","t"],  emoji: "🦇", audioHint: "b-a-t",  confusionRisk: true  },
    { word: "rat",  phonemes: ["r","a","t"],  emoji: "🐀", audioHint: "r-a-t",  confusionRisk: false },
    { word: "sit",  phonemes: ["s","i","t"],  emoji: "🪑", audioHint: "s-i-t",  confusionRisk: false },
  ],
  confusionPairs: CONFUSION_PAIRS.slice(0, 2), // b/d and p/q only at level 1
  sentenceFragments: [
    "The cat sat.", "A big dog.", "I see the sun.", "My red hat.", "The bus is big.",
  ],
};

// ─── Level 2 ──────────────────────────────────────────────────────────────────
export const PHONICS_LEVEL_2: PhonicsLevel = {
  level: 2,
  letters: ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"],
  words: [
    { word: "blend",  phonemes: ["bl","e","nd"],  emoji: "🎨", audioHint: "bl-end",   confusionRisk: true  },
    { word: "bring",  phonemes: ["br","i","ng"],  emoji: "🎁", audioHint: "br-ing",   confusionRisk: true  },
    { word: "drip",   phonemes: ["dr","i","p"],   emoji: "💧", audioHint: "dr-ip",    confusionRisk: true  },
    { word: "clap",   phonemes: ["cl","a","p"],   emoji: "👏", audioHint: "cl-ap",    confusionRisk: true  },
    { word: "stem",   phonemes: ["st","e","m"],   emoji: "🌱", audioHint: "st-em",    confusionRisk: true  },
    { word: "grab",   phonemes: ["gr","a","b"],   emoji: "🤲", audioHint: "gr-ab",    confusionRisk: true  },
    { word: "plum",   phonemes: ["pl","u","m"],   emoji: "🍇", audioHint: "pl-um",    confusionRisk: true  },
    { word: "skip",   phonemes: ["sk","i","p"],   emoji: "⏭️", audioHint: "sk-ip",    confusionRisk: true  },
    { word: "drum",   phonemes: ["dr","u","m"],   emoji: "🥁", audioHint: "dr-um",    confusionRisk: true  },
    { word: "quick",  phonemes: ["qu","i","ck"],  emoji: "⚡", audioHint: "qu-ick",   confusionRisk: true  },
    { word: "bridge", phonemes: ["br","i","dge"], emoji: "🌉", audioHint: "br-idge",  confusionRisk: true  },
    { word: "queen",  phonemes: ["qu","ee","n"],  emoji: "👸", audioHint: "qu-een",   confusionRisk: true  },
    { word: "wobble", phonemes: ["w","o","bb","le"], emoji: "🌊", audioHint: "w-ob-ble", confusionRisk: true },
    { word: "numb",   phonemes: ["n","u","mb"],   emoji: "🥶", audioHint: "n-um-b",   confusionRisk: true  },
    { word: "proud",  phonemes: ["pr","ou","d"],  emoji: "🏆", audioHint: "pr-oud",   confusionRisk: true  },
  ],
  confusionPairs: CONFUSION_PAIRS, // all 4 pairs at level 2
  sentenceFragments: [
    "The frog can jump.", "She grabbed the plum.", "He plays the drum.", "Quick! The queen is here.", "I can blend the colors.",
    "The bridge is strong.", "We skip down the path.", "A stem grows up tall.",
  ],
};

// ─── Level 3 ──────────────────────────────────────────────────────────────────
export const PHONICS_LEVEL_3: PhonicsLevel = {
  level: 3,
  letters: ["sh","ch","th","wh","ph","ng","ck","qu"],
  words: [
    { word: "shelf",    phonemes: ["sh","e","lf"],      emoji: "📚", audioHint: "sh-elf",     confusionRisk: false },
    { word: "chest",    phonemes: ["ch","e","st"],      emoji: "📦", audioHint: "ch-est",     confusionRisk: false },
    { word: "thunder",  phonemes: ["th","u","nd","er"], emoji: "⛈️", audioHint: "th-un-der",  confusionRisk: false },
    { word: "whisper",  phonemes: ["wh","i","sp","er"], emoji: "🤫", audioHint: "wh-is-per",  confusionRisk: true  },
    { word: "photo",    phonemes: ["ph","o","t","o"],   emoji: "📸", audioHint: "ph-o-to",    confusionRisk: true  },
    { word: "spring",   phonemes: ["spr","i","ng"],     emoji: "🌸", audioHint: "spr-ing",    confusionRisk: false },
    { word: "shrink",   phonemes: ["shr","i","nk"],     emoji: "🔬", audioHint: "shr-ink",    confusionRisk: false },
    { word: "through",  phonemes: ["thr","ough"],       emoji: "🚪", audioHint: "thr-ough",   confusionRisk: false },
    { word: "dolphin",  phonemes: ["d","o","lph","in"], emoji: "🐬", audioHint: "dol-ph-in",  confusionRisk: true  },
    { word: "phantom",  phonemes: ["ph","a","nt","om"], emoji: "👻", audioHint: "ph-an-tom",  confusionRisk: true  },
    { word: "clockwise",phonemes: ["cl","ock","w","ise"],emoji: "🕐", audioHint: "clock-wise", confusionRisk: true },
    { word: "thumbprint",phonemes: ["th","u","mb","pr","int"],emoji: "👍", audioHint: "thumb-print", confusionRisk: false },
  ],
  confusionPairs: CONFUSION_PAIRS,
  sentenceFragments: [
    "The dolphin swam through the waves.", "She whispered a phantom story.", "Thunder shook the shelf.",
    "Take a photo of the spring flowers.", "Clockwise means turning to the right.",
  ],
};

export const PHONICS_LEVELS: PhonicsLevel[] = [PHONICS_LEVEL_1, PHONICS_LEVEL_2, PHONICS_LEVEL_3];

export const getPhonicsLevel = (difficulty: number): PhonicsLevel => {
  if (difficulty <= 2) return PHONICS_LEVEL_1;
  if (difficulty <= 3) return PHONICS_LEVEL_2;
  return PHONICS_LEVEL_3;
};
