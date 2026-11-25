import { useState, FormEvent } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Puzzle,
} from 'lucide-react';
import { MiniGameMode, WordEntry, Zone } from '../types/curriculum';
import {
  isMuted,
  isTtsAvailable,
  playSound,
  setMuted,
  speakSentence,
  speakWord,
} from '../utils/audioEngine';
import {
  LetterFeedback,
  validateSpellingAttempt,
} from '../utils/spellValidator';

interface ZonePracticeProps {
  title: string;
  subtitle: string;
  zone?: Zone;
  words: WordEntry[];
  completedWords: string[];
  onRecordAttempt: (
    word: WordEntry,
    attempt: string,
    isCorrect: boolean,
    hintShown: string
  ) => void;
  onExit: () => void;
}

const MODE_LABELS: Record<MiniGameMode, string> = {
  'signal-builder': 'Signal Builder',
  'morpheme-weld': 'Morpheme Weld',
  'mistake-spotter': 'Mistake Spotter',
  'dictation-relay': 'Dictation Relay',
};

function maskWordInSentence(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  return sentence.replace(regex, '_______');
}

export function ZonePractice({
  title,
  subtitle,
  zone,
  words,
  completedWords,
  onRecordAttempt,
  onExit,
}: ZonePracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<MiniGameMode>('signal-builder');
  const [input, setInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showScaffolds, setShowScaffolds] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'incorrect';
    message: string;
    letterFeedback?: LetterFeedback[];
  } | null>(null);

  if (words.length === 0) {
    return (
      <div className="wood-panel rounded-2xl p-8 text-center">
        <p className="text-timber-warm">No words found in this station.</p>
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

  const currentWord = words[currentIndex] ?? words[0];
  const isWordMastered = completedWords.includes(currentWord.word);
  const maskedSentence = maskWordInSentence(
    currentWord.contextSentence,
    currentWord.word
  );

  const ttsSupported = isTtsAvailable();

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateSpellingAttempt(input, currentWord);
    if (result.category === 'empty') return;

    if (result.isCorrect) {
      const willCompleteZone =
        zone &&
        !completedWords.includes(currentWord.word) &&
        completedWords.length + 1 >= words.length;
      playSound(willCompleteZone ? 'towerComplete' : 'success');
      setFeedback({ type: 'correct', message: result.feedback });
      onRecordAttempt(currentWord, result.normalizedAttempt, true, '');
    } else {
      playSound('hint');
      setFeedback({
        type: 'incorrect',
        message: result.feedback,
        letterFeedback: result.letterFeedback,
      });
      onRecordAttempt(
        currentWord,
        result.normalizedAttempt,
        false,
        result.feedback
      );
    }
  };

  const handleNext = () => {
    setInput('');
    setFeedback(null);
    setShowHint(false);
    setShowScaffolds(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-timber-light bg-parchment px-3.5 py-2 text-sm font-bold text-timber-dark shadow-[0_2px_0_0_#d5c2a6] hover:bg-timber-light/40"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tower Map</span>
        </button>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(MODE_LABELS) as MiniGameMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                mode === m
                  ? 'border-brass-dark bg-brass-gold text-timber-dark'
                  : 'border-timber-light bg-parchment text-timber-warm hover:bg-timber-light/40'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workbench Card */}
      <section className="wood-panel space-y-6 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-timber-light pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pine-mid">
              {zone ? `Zone ${zone.number} • ${zone.towerName}` : subtitle}
            </p>
            <h1 className="font-display text-2xl font-bold text-timber-dark">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-brass-gold bg-brass-light px-3 py-1 text-xs font-bold text-timber-dark">
              Word {currentIndex + 1} of {words.length}
            </span>
            {isWordMastered && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-pine-soft px-2.5 py-1 text-xs font-bold text-pine-deep">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Calibrated
              </span>
            )}
          </div>
        </div>

        {/* Rule Tag + Audio Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-beacon/30 bg-sky-soft px-3 py-1 text-xs font-bold text-sky-beacon">
            Rule Focus: {currentWord.ruleTag}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => speakWord(currentWord.word)}
              disabled={muted || !ttsSupported}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-beacon bg-sky-beacon px-3 py-1.5 text-xs font-bold text-white shadow-[0_2px_0_0_#1b5380] hover:bg-sky-beacon/90 disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" />
              <span>Hear Word</span>
            </button>
            <button
              type="button"
              onClick={() =>
                speakSentence(currentWord.contextSentence, currentWord.word)
              }
              disabled={muted || !ttsSupported}
              className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-timber-light bg-white px-3 py-1.5 text-xs font-bold text-timber-dark shadow-[0_2px_0_0_#d5c2a6] hover:bg-timber-light/30 disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" />
              <span>Hear Sentence</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? 'Unmute audio' : 'Mute audio'}
              className="inline-flex items-center gap-1 rounded-xl border border-timber-light bg-white px-2.5 py-1.5 text-xs font-semibold text-timber-warm hover:bg-timber-light/30"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span>{muted ? 'Muted' : 'Sound On'}</span>
            </button>
          </div>
        </div>

        {/* Context Sentence */}
        <div className="rounded-2xl border-2 border-timber-light bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-timber-mid">
            Tower Dispatch ({MODE_LABELS[mode]})
          </p>
          <p className="mt-2 font-display text-lg leading-relaxed text-timber-dark sm:text-xl">
            {maskedSentence}
          </p>
        </div>

        {/* Phoneme / Syllable / Morpheme Scaffolds */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brass-gold bg-brass-light/60 px-3 py-1.5 text-xs font-bold text-timber-dark hover:bg-brass-light"
          >
            <Lightbulb className="h-4 w-4 text-brass-dark" />
            <span>{showHint ? 'Hide Rule Hint' : 'Show Rule Hint'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScaffolds((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-pine-mid/40 bg-pine-soft/70 px-3 py-1.5 text-xs font-bold text-pine-deep hover:bg-pine-soft"
          >
            <Layers className="h-4 w-4" />
            <span>
              {showScaffolds ? 'Hide Sound & Syllable Slots' : 'Show Sound & Syllable Slots'}
            </span>
          </button>
        </div>

        {showHint && (
          <div className="rounded-xl border border-brass-gold bg-brass-light/50 p-4 text-sm text-timber-dark">
            <strong className="font-bold">Mechanic&apos;s Hint:</strong>{' '}
            {currentWord.hint}
          </div>
        )}

        {showScaffolds && (
          <div className="grid gap-3 rounded-xl border border-pine-mid/30 bg-pine-soft/40 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-pine-deep">
                Sound Slots ({currentWord.phonemeSlots.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currentWord.phonemeSlots.map((_, idx) => (
                  <span
                    key={idx}
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg border-2 border-dashed border-pine-mid bg-white px-2 text-xs font-bold text-pine-deep"
                  >
                    {idx + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-pine-deep">
                Syllables ({currentWord.syllables.length})
              </p>
              <p className="text-sm font-semibold text-timber-dark">
                {currentWord.syllables.map(() => '___').join(' • ')}
              </p>
              {currentWord.morphemes && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-pine-deep">
                  <Puzzle className="h-3.5 w-3.5" />
                  <span>
                    {currentWord.morphemes.length} word parts (morphemes)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spelling Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="spelling-input"
              className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
            >
              Type the missing word to calibrate the relay:
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="spelling-input"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  playSound('keystroke');
                }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Type your spelling here..."
                className="flex-1 rounded-xl border-2 border-timber-mid bg-white px-4 py-3 font-sans text-lg font-semibold text-timber-dark placeholder:text-timber-mid/60 focus:border-sky-beacon focus:outline-none"
              />
              <button
                type="submit"
                className="tactile-btn rounded-xl border-2 border-pine-deep bg-pine-mid px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep"
              >
                Test Signal
              </button>
            </div>
          </div>
        </form>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`flex flex-col justify-between gap-3 rounded-xl border-2 p-4 sm:flex-row sm:items-center ${
              feedback.type === 'correct'
                ? 'border-pine-mid bg-pine-soft text-pine-deep'
                : 'border-brass-dark bg-brass-light text-timber-dark'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                {feedback.type === 'correct' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pine-deep" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brass-dark" />
                )}
                <p className="text-sm font-medium leading-relaxed">
                  {feedback.message}
                </p>
              </div>
              {feedback.letterFeedback && feedback.letterFeedback.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-7">
                  {feedback.letterFeedback.map((lf, idx) => (
                    <span
                      key={idx}
                      className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-mono text-xs font-bold uppercase ${
                        lf.status === 'match'
                          ? 'border-pine-mid bg-pine-soft text-pine-deep'
                          : lf.status === 'close'
                            ? 'border-brass-gold bg-white text-brass-dark'
                            : 'border-timber-mid/40 bg-white/70 text-timber-warm'
                      }`}
                      title={
                        lf.status === 'match'
                          ? 'Right letter, right spot'
                          : lf.status === 'close'
                            ? 'Letter is in the word, different spot'
                            : 'Needs attention'
                      }
                    >
                      {lf.char}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {feedback.type === 'correct' && (
              <button
                type="button"
                onClick={handleNext}
                className="tactile-btn inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-pine-deep bg-pine-deep px-4 py-2 text-xs font-bold text-white shadow-[0_2px_0_0_#112e23]"
              >
                <span>Next Word</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
