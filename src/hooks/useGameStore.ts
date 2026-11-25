import { useEffect, useState } from 'react';
import {
  CustomWordList,
  LeitnerBoxLevel,
  PlayerProgress,
  WordEntry,
  WordMasteryRecord,
  ZoneId,
} from '../types/curriculum';

const STORE_STORAGE_KEY = 'wordwright_store_v2';

export interface GameStoreSnapshot {
  version: number;
  exportedAt: string;
  progress: PlayerProgress;
  wordMastery: Record<string, WordMasteryRecord>;
  customLists: CustomWordList[];
  totalWordsTyped: number;
}

function createInitialProgress(): PlayerProgress {
  return {
    towersRepaired: 0,
    currentStreak: 0,
    bestStreak: 0,
    masteredWords: [],
    zoneProgress: {
      'zone-1': { repaired: false, wordsCompleted: [], attempts: 0, correctCount: 0 },
      'zone-2': { repaired: false, wordsCompleted: [], attempts: 0, correctCount: 0 },
      'zone-3': { repaired: false, wordsCompleted: [], attempts: 0, correctCount: 0 },
      'zone-4': { repaired: false, wordsCompleted: [], attempts: 0, correctCount: 0 },
      'zone-5': { repaired: false, wordsCompleted: [], attempts: 0, correctCount: 0 },
    },
    recentMistakes: [],
    lastPlayedAt: new Date().toISOString(),
  };
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function nextReviewForBox(box: LeitnerBoxLevel): string {
  if (box === 1) return addDaysIso(1);
  if (box === 2) return addDaysIso(3);
  return addDaysIso(7);
}

interface PersistedState {
  progress: PlayerProgress;
  wordMastery: Record<string, WordMasteryRecord>;
  customLists: CustomWordList[];
  totalWordsTyped: number;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    if (!raw) {
      return {
        progress: createInitialProgress(),
        wordMastery: {},
        customLists: [],
        totalWordsTyped: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      progress: { ...createInitialProgress(), ...(parsed.progress ?? {}) },
      wordMastery: parsed.wordMastery ?? {},
      customLists: Array.isArray(parsed.customLists) ? parsed.customLists : [],
      totalWordsTyped:
        typeof parsed.totalWordsTyped === 'number' ? parsed.totalWordsTyped : 0,
    };
  } catch {
    return {
      progress: createInitialProgress(),
      wordMastery: {},
      customLists: [],
      totalWordsTyped: 0,
    };
  }
}

export function useGameStore() {
  const [state, setState] = useState<PersistedState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const recordAttempt = (
    wordEntry: WordEntry,
    attempt: string,
    isCorrect: boolean,
    hintShown: string,
    zoneWordsCount: number,
    isFirstTry = true
  ) => {
    const wordKey = wordEntry.word.toLowerCase();

    setState((prev) => {
      const prevProg = prev.progress;
      const zoneId = wordEntry.zoneId;
      const currentZoneRec = prevProg.zoneProgress[zoneId] ?? {
        repaired: false,
        wordsCompleted: [],
        attempts: 0,
        correctCount: 0,
      };

      const nextStreak = isCorrect ? prevProg.currentStreak + 1 : 0;
      const nextBestStreak = Math.max(prevProg.bestStreak, nextStreak);

      // Update Leitner Box WordMasteryRecord first so masteredWords stays consistent with needsRepair
      const existingMastery: WordMasteryRecord = prev.wordMastery[wordKey] ?? {
        word: wordEntry.word,
        zoneId: wordEntry.zoneId,
        ruleTag: wordEntry.ruleTag,
        attempts: 0,
        firstTryCorrect: 0,
        consecutiveFirstTry: 0,
        missedRules: [],
        needsRepair: false,
        nextReviewDate: new Date().toISOString(),
        boxLevel: 1,
      };

      let nextBox: LeitnerBoxLevel = existingMastery.boxLevel;
      let nextConsecutiveFirstTry = existingMastery.consecutiveFirstTry;
      let nextNeedsRepair = existingMastery.needsRepair;
      let nextFirstTryCorrect = existingMastery.firstTryCorrect;
      let nextMissedRules = existingMastery.missedRules;
      let nextReviewDate = existingMastery.nextReviewDate;

      if (isCorrect) {
        if (isFirstTry) {
          nextFirstTryCorrect += 1;
          nextConsecutiveFirstTry += 1;
          nextBox = Math.min(3, existingMastery.boxLevel + 1) as LeitnerBoxLevel;
        }
        // Clear 'Needs Repair' once spelled correctly on the first try twice in a row
        if (nextNeedsRepair && nextConsecutiveFirstTry >= 2) {
          nextNeedsRepair = false;
        }
        nextReviewDate = nextReviewForBox(nextBox);
      } else {
        nextConsecutiveFirstTry = 0;
        nextNeedsRepair = true;
        nextBox = 1;
        nextReviewDate = new Date().toISOString();
        if (!nextMissedRules.includes(wordEntry.ruleTag)) {
          nextMissedRules = [...nextMissedRules, wordEntry.ruleTag];
        }
      }

      const updatedMastery: WordMasteryRecord = {
        ...existingMastery,
        attempts: existingMastery.attempts + 1,
        firstTryCorrect: nextFirstTryCorrect,
        consecutiveFirstTry: nextConsecutiveFirstTry,
        missedRules: nextMissedRules,
        needsRepair: nextNeedsRepair,
        nextReviewDate,
        boxLevel: nextBox,
      };

      const nextMastered =
        isCorrect && !nextNeedsRepair
          ? prevProg.masteredWords.includes(wordEntry.word)
            ? prevProg.masteredWords
            : [...prevProg.masteredWords, wordEntry.word]
          : prevProg.masteredWords.filter((w) => w !== wordEntry.word);

      const nextZoneWordsCompleted =
        isCorrect && !currentZoneRec.wordsCompleted.includes(wordEntry.word)
          ? [...currentZoneRec.wordsCompleted, wordEntry.word]
          : currentZoneRec.wordsCompleted;

      const isZoneRepaired =
        currentZoneRec.repaired ||
        (zoneWordsCount > 0 && nextZoneWordsCompleted.length >= zoneWordsCount);

      const nextZoneProgress = {
        ...prevProg.zoneProgress,
        [zoneId]: {
          repaired: isZoneRepaired,
          wordsCompleted: nextZoneWordsCompleted,
          attempts: currentZoneRec.attempts + 1,
          correctCount: currentZoneRec.correctCount + (isCorrect ? 1 : 0),
        },
      };

      const nextTowersRepaired = Object.values(nextZoneProgress).filter(
        (z) => z.repaired
      ).length;

      const nextMistakes = isCorrect
        ? prevProg.recentMistakes
        : [
            {
              word: wordEntry.word,
              attempt,
              zoneId,
              hintShown,
              timestamp: new Date().toISOString(),
            },
            ...prevProg.recentMistakes,
          ].slice(0, 30);

      return {
        ...prev,
        totalWordsTyped: prev.totalWordsTyped + 1,
        wordMastery: {
          ...prev.wordMastery,
          [wordKey]: updatedMastery,
        },
        progress: {
          towersRepaired: nextTowersRepaired,
          currentStreak: nextStreak,
          bestStreak: nextBestStreak,
          masteredWords: nextMastered,
          zoneProgress: nextZoneProgress,
          recentMistakes: nextMistakes,
          lastPlayedAt: new Date().toISOString(),
        },
      };
    });
  };

  const markZoneRepaired = (zoneId: ZoneId) => {
    setState((prev) => {
      const nextZoneProgress = {
        ...prev.progress.zoneProgress,
        [zoneId]: {
          ...prev.progress.zoneProgress[zoneId],
          repaired: true,
        },
      };
      return {
        ...prev,
        progress: {
          ...prev.progress,
          zoneProgress: nextZoneProgress,
          towersRepaired: Object.values(nextZoneProgress).filter(
            (z) => z.repaired
          ).length,
        },
      };
    });
  };

  /**
   * Builds a session list for a Zone by mixing any 'Needs Repair' words
   * (Leitner spaced repetition) into the Zone's base words.
   */
  const getWordsForZoneSession = (
    zoneId: ZoneId,
    allCurriculumWords: WordEntry[]
  ): WordEntry[] => {
    const zoneWords = allCurriculumWords.filter((w) => w.zoneId === zoneId);
    const repairWords = allCurriculumWords.filter((w) => {
      const rec = state.wordMastery[w.word.toLowerCase()];
      return rec?.needsRepair === true;
    });

    const combined: WordEntry[] = [];
    const seen = new Set<string>();

    // Prioritize up to 2 'Needs Repair' words first, then fill with Zone words
    for (const rw of repairWords.slice(0, 2)) {
      const key = rw.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(rw);
      }
    }

    for (const zw of zoneWords) {
      const key = zw.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(zw);
      }
    }

    return combined;
  };

  const addCustomList = (list: CustomWordList) => {
    setState((prev) => ({
      ...prev,
      customLists: [list, ...prev.customLists],
    }));
  };

  const deleteCustomList = (listId: string) => {
    setState((prev) => ({
      ...prev,
      customLists: prev.customLists.filter((l) => l.id !== listId),
    }));
  };

  const resetProgress = () => {
    setState((prev) => ({
      ...prev,
      progress: createInitialProgress(),
      wordMastery: {},
      totalWordsTyped: 0,
    }));
  };

  const exportBackupJson = (): string => {
    const snapshot: GameStoreSnapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: state.progress,
      wordMastery: state.wordMastery,
      customLists: state.customLists,
      totalWordsTyped: state.totalWordsTyped,
    };
    return JSON.stringify(snapshot, null, 2);
  };

  const importBackupJson = (
    rawJson: string
  ): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson) as Partial<GameStoreSnapshot>;
      if (!parsed || typeof parsed !== 'object' || !parsed.progress) {
        return {
          ok: false,
          message: 'Invalid backup file: missing progress data.',
        };
      }
      setState({
        progress: { ...createInitialProgress(), ...parsed.progress },
        wordMastery: parsed.wordMastery ?? {},
        customLists: Array.isArray(parsed.customLists)
          ? parsed.customLists
          : [],
        totalWordsTyped:
          typeof parsed.totalWordsTyped === 'number'
            ? parsed.totalWordsTyped
            : 0,
      });
      return {
        ok: true,
        message: 'Backup restored! Progress and custom lists are up to date.',
      };
    } catch {
      return {
        ok: false,
        message: 'Could not read that JSON file. Please check the format.',
      };
    }
  };

  return {
    progress: state.progress,
    wordMastery: state.wordMastery,
    customLists: state.customLists,
    totalWordsTyped: state.totalWordsTyped,
    recordAttempt,
    markZoneRepaired,
    getWordsForZoneSession,
    addCustomList,
    deleteCustomList,
    resetProgress,
    exportBackupJson,
    importBackupJson,
  };
}
