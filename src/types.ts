
export type Language = 'zh' | 'en' | 'mn';

export interface Word {
  id: string;
  char: string;
  pinyin: string;
  en: string;
  mn: string;
  level: number; // 1 to 6
  lesson: number; // 1 to 12
}

export type GameMode = 'SOLO' | 'PK';

export interface Sentence {
  id: string;
  parts: string[]; // ['我', '叫', '李明']
  pinyin: string[]; // ['wǒ', 'jiào', 'Lǐ Míng']
  translation: string;
  level: number;
}

export type Screen = 'START' | 'LEVEL_SELECT' | 'PREP' | 'INSTRUCTION' | 'GAME' | 'PK' | 'RESULT';

export type ChallengeMode = 'CHAR' | 'PINYIN';

export interface Inventory {
  hints: number;
  scopes: number;
  iceGuns: number;
}

export interface PlayerStats {
  score: number;
  health: number;
  correctAnswers: number;
  wrongAnswers: number;
  missedAnswers: number;
  accuracy: number;
  inventory: Inventory;
  consecutiveCorrect: number;
}

export interface GameSettings {
  level: number;
  lesson: number;
  mode: GameMode;
  language: Language;
  challengeMode: ChallengeMode;
}

export interface FeedbackData {
  word: Word;
  userPinyin: string;
  isCorrect: boolean;
}
