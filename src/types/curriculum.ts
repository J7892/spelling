export type ZoneId = 'zone-1' | 'zone-2' | 'zone-3' | 'zone-4' | 'zone-5';

export type MiniGameMode =
  | 'signal-builder'
  | 'morpheme-weld'
  | 'mistake-spotter'
  | 'dictation-relay';

export interface WordEntry {
  word: string;
  zoneId: ZoneId;
  ruleTag: string;
  /** Array of grapheme strings aligned to phoneme slots, e.g. ['n', 'eigh', 'b', 'our'] */
  phonemeSlots: string[];
  /** Optional morpheme breakdown, e.g. ['un', 'help', 'ful'] */
  morphemes?: string[];
  /** Syllable chunks, e.g. ['fam', 'i', 'ly'] */
  syllables: string[];
  contextSentence: string;
  hint: string;
  /** Maps specific common misspellings to custom pedagogical hints */
  commonMistakes: Record<string, string>;
}

export interface Zone {
  id: ZoneId;
  number: number;
  name: string;
  subtitle: string;
  towerName: string;
  description: string;
  focusRules: string[];
}

export interface ZoneProgressRecord {
  repaired: boolean;
  wordsCompleted: string[];
  attempts: number;
  correctCount: number;
}

export interface MistakeLogEntry {
  word: string;
  attempt: string;
  zoneId: ZoneId;
  hintShown: string;
  timestamp: string;
}

export interface PlayerProgress {
  towersRepaired: number;
  currentStreak: number;
  bestStreak: number;
  masteredWords: string[];
  zoneProgress: Record<ZoneId, ZoneProgressRecord>;
  recentMistakes: MistakeLogEntry[];
  lastPlayedAt: string;
}

export interface CustomWordList {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
  words: WordEntry[];
}

export type LeitnerBoxLevel = 1 | 2 | 3;

export interface WordMasteryRecord {
  word: string;
  zoneId: ZoneId;
  ruleTag: string;
  attempts: number;
  firstTryCorrect: number;
  consecutiveFirstTry: number;
  missedRules: string[];
  needsRepair: boolean;
  nextReviewDate: string;
  boxLevel: LeitnerBoxLevel;
}
