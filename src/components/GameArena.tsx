import { useEffect, useMemo, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  HelpCircle,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { WordEntry, Zone } from '../types/curriculum';
import {
  cancelSpeech,
  isMuted,
  isTtsAvailable,
  playSound,
  setMuted,
  speakSentence,
  speakWord,
} from '../utils/audioEngine';
import { validateSpellingAttempt } from '../utils/spellValidator';

export type ArenaMiniGame =
  | 'morpheme-welder'
  | 'sound-slot-decipher'
  | 'tower-proofreader'
  | 'syllable-chunker';

interface PuzzleItem {
  entry: WordEntry;
  game: ArenaMiniGame;
  glitchSentenceTokens?: string[];
  glitchTargetIndex?: number;
}

interface GameArenaProps {
  title: string;
  subtitle: string;
  zone?: Zone;
  words: WordEntry[];
  onRecordAttempt: (
    word: WordEntry,
    attempt: string,
    isCorrect: boolean,
    hintShown: string,
    isFirstTry: boolean
  ) => void;
  onZoneComplete?: (zone: Zone) => void;
  onExit: () => void;
}

const GAME_META: Record<
  ArenaMiniGame,
  { label: string; instruction: string }
> = {
  'morpheme-welder': {
    label: 'Morpheme Welder',
    instruction: 'Type the joined word and press Enter to weld the brass parts.',
  },
  'sound-slot-decipher': {
    label: 'Sound-Slot Decipher',
    instruction:
      'Listen to the dispatch and type the whole word. Sound boxes check your graphemes on Enter.',
  },
  'tower-proofreader': {
    label: 'Tower Proofreader',
    instruction:
      'Use Left/Right Arrows (or click) to highlight the broken word, press Enter, and type the Canadian fix.',
  },
  'syllable-chunker': {
    label: 'Syllable Chunker',
    instruction:
      'Use the syllable rhythm bar to type the full word. Press ? for syllable & schwa help.',
  },
};

const MINI_KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

function buildGlitchSentence(entry: WordEntry): {
  tokens: string[];
  targetIndex: number;
} {
  const commonKeys = Object.keys(entry.commonMistakes);
  const misspelled =
    commonKeys[0] ??
    (entry.word.length > 3
      ? `${entry.word.slice(0, -2)}${entry.word.slice(-1)}`
      : `${entry.word}e`);

  const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  const replaced = entry.contextSentence.replace(regex, misspelled);

  const tokens = replaced.split(/\s+/).filter(Boolean);
  const targetIndex = tokens.findIndex(
    (t) => t.replace(/[.,!?;:"]/g, '').toLowerCase() === misspelled.toLowerCase()
  );

  return {
    tokens,
    targetIndex: targetIndex >= 0 ? targetIndex : 0,
  };
}

function buildPuzzleSequence(words: WordEntry[]): PuzzleItem[] {
  if (words.length === 0) return [];
  const totalPuzzles = 6;
  const morphemeWords = words.filter((w) => w.morphemes && w.morphemes.length > 1);
  const otherWords = words.filter((w) => !w.morphemes || w.morphemes.length <= 1);
  const ordered = [...morphemeWords, ...otherWords];

  const gameRotation: ArenaMiniGame[] = [
    'morpheme-welder',
    'sound-slot-decipher',
    'tower-proofreader',
    'syllable-chunker',
    'sound-slot-decipher',
    'tower-proofreader',
  ];

  const items: PuzzleItem[] = [];
  for (let i = 0; i < totalPuzzles; i++) {
    const entry = ordered[i % ordered.length];
    let game = gameRotation[i];
    if (game === 'morpheme-welder' && (!entry.morphemes || entry.morphemes.length < 2)) {
      game = i % 2 === 0 ? 'sound-slot-decipher' : 'syllable-chunker';
    }

    if (game === 'tower-proofreader') {
      const glitch = buildGlitchSentence(entry);
      items.push({
        entry,
        game,
        glitchSentenceTokens: glitch.tokens,
        glitchTargetIndex: glitch.targetIndex,
      });
    } else {
      items.push({ entry, game });
    }
  }
  return items;
}

interface SlotEval {
  text: string;
  status: 'empty' | 'match' | 'fix';
}

function evaluatePhonemeSlots(
  attempt: string,
  slots: string[],
  isExactWord: boolean
): SlotEval[] {
  if (isExactWord) {
    return slots.map((s) => ({ text: s, status: 'match' }));
  }

  let cursor = 0;
  return slots.map((slot) => {
    const slice = attempt.slice(cursor, cursor + slot.length);
    cursor += slot.length;
    if (!slice) {
      return { text: '?', status: 'fix' };
    }
    if (slice.toLowerCase() === slot.toLowerCase()) {
      return { text: slice, status: 'match' };
    }
    return { text: slice, status: 'fix' };
  });
}

function getNextExpectedChar(typed: string, target: string): string | null {
  const lowerTyped = typed.toLowerCase();
  const lowerTarget = target.toLowerCase();
  for (let i = 0; i < lowerTarget.length; i++) {
    if (lowerTyped[i] !== lowerTarget[i]) {
      return lowerTarget[i];
    }
  }
  return null;
}

function findSchwaHint(entry: WordEntry): string {
  const unstressedVowels = ['a', 'e', 'i', 'o', 'u'];
  if (entry.syllables.length <= 1) {
    return `Watch the vowel pattern in "${entry.syllables.join('')}"`;
  }
  const middleOrEnd = entry.syllables.slice(1).join(' · ');
  const hasSchwaLike = unstressedVowels.some((v) => middleOrEnd.includes(v));
  return hasSchwaLike
    ? `Tricky Schwa Vowel alert in the later syllable(s): ${entry.syllables.join(' · ')}`
    : `Syllable breaks: ${entry.syllables.join(' · ')}`;
}

export function GameArena({
  title,
  subtitle,
  zone,
  words,
  onRecordAttempt,
  onZoneComplete,
  onExit,
}: GameArenaProps) {
  const puzzles = useMemo(() => buildPuzzleSequence(words), [words]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [arenaComplete, setArenaComplete] = useState(false);

  const [input, setInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [peekWordVisible, setPeekWordVisible] = useState(false);

  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0);
  const [repairBoxOpen, setRepairBoxOpen] = useState(false);
  const [proofreaderMessage, setProofreaderMessage] = useState<string | null>(
    null
  );

  const [weldedSuccess, setWeldedSuccess] = useState(false);
  const [slotResults, setSlotResults] = useState<SlotEval[] | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'incorrect';
    message: string;
  } | null>(null);

  const [muted, setMutedState] = useState(() => isMuted());
  const [idleHintKey, setIdleHintKey] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPuzzle = puzzles[puzzleIndex];
  const ttsSupported = isTtsAvailable();

  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const resetIdleTimer = (currentTyped: string, targetWord: string) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIdleHintKey(null);
    idleTimerRef.current = setTimeout(() => {
      const nextChar = getNextExpectedChar(currentTyped, targetWord);
      setIdleHintKey(nextChar);
    }, 10000);
  };

  // Auto-play audio for Sound-Slot Decipher and focus input on puzzle change
  useEffect(() => {
    if (!currentPuzzle || arenaComplete) return;

    setInput('');
    setShowHint(false);
    setConsecutiveMisses(0);
    setPeekWordVisible(false);
    setWeldedSuccess(false);
    setSlotResults(null);
    setFeedback(null);
    setProofreaderMessage(null);
    setSelectedTokenIdx(0);
    setRepairBoxOpen(currentPuzzle.game !== 'tower-proofreader');

    if (currentPuzzle.game === 'sound-slot-decipher' && !isMuted()) {
      speakWord(currentPuzzle.entry.word);
      const t = setTimeout(() => {
        speakSentence(
          currentPuzzle.entry.contextSentence,
          currentPuzzle.entry.word
        );
      }, 950);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [puzzleIndex, arenaComplete, currentPuzzle]);

  // Keep input focused and manage 10s idle adaptive keyboard timer
  useEffect(() => {
    if (!currentPuzzle || arenaComplete) return;
    if (
      currentPuzzle.game !== 'tower-proofreader' ||
      repairBoxOpen
    ) {
      focusInput();
      resetIdleTimer(input, currentPuzzle.entry.word);
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [puzzleIndex, repairBoxOpen, arenaComplete, currentPuzzle, input]);

  // Cleanup timers and speech on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Global keyboard shortcuts (ArrowUp, ArrowDown, ?, and Tower Proofreader Left/Right/Enter)
  useEffect(() => {
    if (!currentPuzzle || arenaComplete) return;

    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // Never hijack Ctrl+H or Tab
      if (e.ctrlKey || e.metaKey || e.key === 'Tab') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        speakWord(currentPuzzle.entry.word);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        speakSentence(
          currentPuzzle.entry.contextSentence,
          currentPuzzle.entry.word
        );
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowHint(true);
        playSound('hint');
        return;
      }

      if (
        currentPuzzle.game === 'tower-proofreader' &&
        !repairBoxOpen &&
        currentPuzzle.glitchSentenceTokens
      ) {
        const len = currentPuzzle.glitchSentenceTokens.length;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedTokenIdx((idx) => (idx + 1) % len);
          playSound('keystroke');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedTokenIdx((idx) => (idx - 1 + len) % len);
          playSound('keystroke');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSelectProofreaderToken(selectedTokenIdx);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

  if (!currentPuzzle) {
    return (
      <div className="wood-panel rounded-2xl p-8 text-center">
        <p className="text-timber-warm">No words available for this zone.</p>
        <button
          type="button"
          onClick={onExit}
          className="tactile-btn mt-4 rounded-xl border-2 border-timber-warm bg-timber-warm px-4 py-2 text-sm font-bold text-white"
        >
          Return to Tower Map
        </button>
      </div>
    );
  }

  const handleSelectProofreaderToken = (idx: number) => {
    setSelectedTokenIdx(idx);
    if (idx === currentPuzzle.glitchTargetIndex) {
      setRepairBoxOpen(true);
      setProofreaderMessage(null);
      playSound('keystroke');
      focusInput();
    } else {
      playSound('hint');
      setProofreaderMessage(
        'That word looks solid! Use Left/Right Arrows to find the misspelled word.'
      );
    }
  };

  const handlePeekBlueprint = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setPeekWordVisible(true);
    playSound('hint');
    peekTimerRef.current = setTimeout(() => {
      setPeekWordVisible(false);
      focusInput();
    }, 3000);
  };

  const advancePuzzle = () => {
    if (puzzleIndex + 1 >= puzzles.length) {
      setArenaComplete(true);
      playSound('towerComplete');
      if (zone && onZoneComplete) {
        onZoneComplete(zone);
      }
    } else {
      setPuzzleIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (weldedSuccess) return;

    const result = validateSpellingAttempt(input, currentPuzzle.entry);
    if (result.category === 'empty') return;

    if (currentPuzzle.game === 'sound-slot-decipher') {
      setSlotResults(
        evaluatePhonemeSlots(
          result.normalizedAttempt,
          currentPuzzle.entry.phonemeSlots,
          result.isCorrect
        )
      );
    }

    if (result.isCorrect) {
      setWeldedSuccess(true);
      setConsecutiveMisses(0);
      setFeedback({ type: 'correct', message: result.feedback });
      playSound(
        puzzleIndex + 1 >= puzzles.length ? 'towerComplete' : 'success'
      );
      onRecordAttempt(
        currentPuzzle.entry,
        result.normalizedAttempt,
        true,
        '',
        consecutiveMisses === 0
      );

      setTimeout(() => {
        advancePuzzle();
      }, 1100);
    } else {
      setConsecutiveMisses((c) => c + 1);
      setFeedback({ type: 'incorrect', message: result.feedback });
      playSound('hint');
      onRecordAttempt(
        currentPuzzle.entry,
        result.normalizedAttempt,
        false,
        result.feedback,
        consecutiveMisses === 0
      );
      focusInput();
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '?' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  if (arenaComplete) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="wood-panel space-y-6 rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-pine-mid bg-pine-deep text-brass-light shadow-md">
            <Radio className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-pine-deep">
              <Sparkles className="h-3.5 w-3.5" />
              Signal Restored
            </span>
            <h1 className="font-display text-3xl font-bold text-timber-dark">
              {zone ? `${zone.towerName} Online!` : `${title} Complete!`}
            </h1>
            <p className="text-sm text-timber-warm">
              You completed all {puzzles.length} relay puzzles in {title}.
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-pine-deep bg-pine-mid px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep"
          >
            <span>Return to Tower Map</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const { entry, game } = currentPuzzle;
  const morphemeBlocks =
    entry.morphemes && entry.morphemes.length > 1
      ? entry.morphemes
      : entry.syllables;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Top Controls & Progress Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-timber-light bg-parchment px-3.5 py-2 text-sm font-bold text-timber-dark shadow-[0_2px_0_0_#d5c2a6]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Tower Map</span>
        </button>

        {/* 6-Puzzle Progress Dots */}
        <div className="flex items-center gap-2">
          {puzzles.map((_, idx) => (
            <div
              key={idx}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                idx < puzzleIndex
                  ? 'border-pine-deep bg-pine-mid text-white'
                  : idx === puzzleIndex
                    ? 'border-brass-dark bg-brass-gold text-timber-dark scale-110'
                    : 'border-timber-light bg-white text-timber-mid'
              }`}
            >
              {idx < puzzleIndex ? '✓' : idx + 1}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex items-center gap-1.5 rounded-xl border border-timber-light bg-parchment px-3 py-1.5 text-xs font-bold text-timber-warm"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          <span>{muted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Main Arena Card */}
      <section className="wood-panel space-y-6 rounded-2xl p-6 sm:p-8">
        {/* Mini-Game Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-timber-light pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pine-mid">
              {zone ? `Zone ${zone.number} • ${zone.towerName}` : subtitle}
            </p>
            <h1 className="font-display text-2xl font-bold text-timber-dark">
              {GAME_META[game].label}
            </h1>
            <p className="mt-0.5 text-xs text-timber-warm">
              {GAME_META[game].instruction}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => speakWord(entry.word)}
              disabled={muted || !ttsSupported}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-beacon bg-sky-beacon px-3 py-1.5 text-xs font-bold text-white shadow-[0_2px_0_0_#1b5380] disabled:opacity-50"
              title="Shortcut: Up Arrow"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Word (↑)</span>
            </button>
            <button
              type="button"
              onClick={() => speakSentence(entry.contextSentence, entry.word)}
              disabled={muted || !ttsSupported}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-timber-light bg-white px-3 py-1.5 text-xs font-bold text-timber-dark shadow-[0_2px_0_0_#d5c2a6] disabled:opacity-50"
              title="Shortcut: Down Arrow"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Sentence (↓)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHint((v) => !v);
                playSound('hint');
              }}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-brass-gold bg-brass-light px-3 py-1.5 text-xs font-bold text-timber-dark"
              title="Shortcut: ?"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Hint (?)</span>
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* MINI-GAME 1: MORPHEME WELDER                                    */}
        {/* =============================================================== */}
        {game === 'morpheme-welder' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-timber-light bg-white p-6">
              {morphemeBlocks.map((part, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className={`brass-plate rounded-xl px-4 py-2 font-display text-lg font-bold text-timber-dark transition-all duration-500 ${
                      weldedSuccess
                        ? 'scale-105 border-pine-mid bg-pine-soft shadow-none'
                        : ''
                    }`}
                  >
                    {part}
                  </span>
                  {i < morphemeBlocks.length - 1 && (
                    <span
                      className={`font-bold text-brass-dark transition-all duration-500 ${
                        weldedSuccess ? 'w-0 scale-0 opacity-0' : 'px-1'
                      }`}
                    >
                      +
                    </span>
                  )}
                </div>
              ))}
              <span className="px-2 text-lg font-bold text-timber-warm">=</span>
              <span
                className={`rounded-xl border-2 px-4 py-2 font-display text-lg font-bold transition-all ${
                  weldedSuccess
                    ? 'border-pine-mid bg-pine-soft text-pine-deep'
                    : 'border-dashed border-timber-mid bg-sky-mist text-timber-mid'
                }`}
              >
                {weldedSuccess ? entry.word : '______'}
              </span>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* MINI-GAME 2: SOUND-SLOT DECIPHER                                */}
        {/* =============================================================== */}
        {game === 'sound-slot-decipher' && (
          <div className="space-y-4 rounded-2xl border-2 border-timber-light bg-white p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-timber-mid">
              {entry.phonemeSlots.length} Sound Boxes (Elkonin Slots)
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {entry.phonemeSlots.map((_, idx) => {
                const slotEval = slotResults?.[idx];
                const boxStyle = !slotEval
                  ? 'border-timber-mid bg-sky-mist text-timber-mid'
                  : slotEval.status === 'match'
                    ? 'border-pine-mid bg-pine-soft text-pine-deep'
                    : 'border-brass-dark bg-brass-light text-brass-dark';

                return (
                  <div
                    key={idx}
                    className={`flex h-14 min-w-14 items-center justify-center rounded-xl border-2 px-3 font-mono text-lg font-bold transition-colors ${boxStyle}`}
                  >
                    {slotEval ? slotEval.text : idx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* MINI-GAME 3: TOWER PROOFREADER                                  */}
        {/* =============================================================== */}
        {game === 'tower-proofreader' &&
          currentPuzzle.glitchSentenceTokens && (
            <div className="space-y-4 rounded-2xl border-2 border-timber-light bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-beacon">
                  <Wrench className="h-3.5 w-3.5" />
                  Glitchy Transmission — Select the Broken Word
                </span>
                {repairBoxOpen && (
                  <span className="rounded-full bg-pine-soft px-2.5 py-0.5 text-xs font-bold text-pine-deep">
                    Repair Box Open
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
                {currentPuzzle.glitchSentenceTokens.map((token, idx) => {
                  const isSelected = idx === selectedTokenIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectProofreaderToken(idx)}
                      className={`rounded-lg px-2.5 py-1 font-display font-semibold transition-all ${
                        isSelected
                          ? 'border-2 border-brass-dark bg-brass-light text-timber-dark shadow-sm'
                          : 'border-2 border-transparent text-timber-dark hover:bg-sky-soft/60'
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </div>

              {proofreaderMessage && (
                <p className="text-xs font-semibold text-brass-dark">
                  {proofreaderMessage}
                </p>
              )}
            </div>
          )}

        {/* =============================================================== */}
        {/* MINI-GAME 4: SYLLABLE CHUNKER                                   */}
        {/* =============================================================== */}
        {game === 'syllable-chunker' && (
          <div className="space-y-4 rounded-2xl border-2 border-timber-light bg-white p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-timber-mid">
              {entry.syllables.length} Syllable Rhythm Bar
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {entry.syllables.map((syl, idx) => (
                <div
                  key={idx}
                  className="flex h-12 min-w-20 items-center justify-center rounded-xl border-2 border-brass-gold bg-brass-light/60 px-4 font-display text-base font-bold text-timber-dark"
                >
                  {showHint ? syl : `Beat ${idx + 1}`}
                </div>
              ))}
            </div>
            {showHint && (
              <p className="text-xs font-semibold text-pine-deep">
                {findSchwaHint(entry)}
              </p>
            )}
          </div>
        )}

        {/* Hint Box */}
        {showHint && (
          <div className="rounded-xl border border-brass-gold bg-brass-light/50 p-3.5 text-sm text-timber-dark">
            <strong>Rule Hint ({entry.ruleTag}):</strong> {entry.hint}
          </div>
        )}

        {/* Look, Cover, Type Escape Hatch (after 2 misses in a row) */}
        {consecutiveMisses >= 2 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-sky-beacon/40 bg-sky-soft/60 p-4">
            {peekWordVisible ? (
              <div className="flex items-center gap-2 text-sm font-bold text-timber-dark">
                <Eye className="h-4 w-4 text-sky-beacon" />
                <span>Blueprint Peek (3s):</span>
                <span className="rounded-lg bg-white px-3 py-1 font-mono text-base text-pine-deep">
                  {entry.word}
                </span>
              </div>
            ) : (
              <>
                <span className="text-xs font-semibold text-timber-dark">
                  Stuck on this signal? Use Look, Cover, Type!
                </span>
                <button
                  type="button"
                  onClick={handlePeekBlueprint}
                  className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-beacon bg-sky-beacon px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Peek at Blueprint</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Single Clean Typing Input (always auto-focused when active) */}
        {(game !== 'tower-proofreader' || repairBoxOpen) && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={inputRef}
                type="text"
                value={input}
                disabled={weldedSuccess}
                onChange={(e) => {
                  setInput(e.target.value);
                  playSound('keystroke');
                  resetIdleTimer(e.target.value, entry.word);
                }}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Type your answer and press Enter..."
                className="flex-1 rounded-xl border-2 border-timber-mid bg-white px-4 py-3 font-sans text-lg font-semibold text-timber-dark placeholder:text-timber-mid/60 focus:border-sky-beacon focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={weldedSuccess}
                className="tactile-btn rounded-xl border-2 border-pine-deep bg-pine-mid px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep disabled:opacity-60"
              >
                Check (Enter)
              </button>
            </div>
          </form>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border-2 p-4 text-sm font-medium ${
              feedback.type === 'correct'
                ? 'border-pine-mid bg-pine-soft text-pine-deep'
                : 'border-brass-dark bg-brass-light text-timber-dark'
            }`}
          >
            {feedback.type === 'correct' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-pine-deep" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-brass-dark" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Subtle On-Screen Mini-Keyboard (illuminates next key after 10s pause) */}
        <div className="border-t border-timber-light pt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-timber-mid">
            <span>
              Shortcuts: ↑ Word • ↓ Sentence • ? Hint
            </span>
            {idleHintKey && (
              <span className="text-sky-beacon">
                Next key guide: &ldquo;{idleHintKey.toUpperCase()}&rdquo;
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 select-none">
            {MINI_KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-1">
                {row.map((keyChar) => {
                  const isLit = idleHintKey === keyChar;
                  return (
                    <span
                      key={keyChar}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-bold uppercase transition-all ${
                        isLit
                          ? 'scale-110 border-sky-beacon bg-sky-beacon text-white shadow-sm'
                          : 'border-timber-light bg-white/70 text-timber-mid'
                      }`}
                    >
                      {keyChar}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
