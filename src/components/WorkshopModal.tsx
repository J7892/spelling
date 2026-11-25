import { useState, FormEvent, ChangeEvent } from 'react';
import {
  X,
  Lock,
  Unlock,
  Wrench,
  Plus,
  Trash2,
  Play,
  Download,
  Upload,
  RotateCcw,
  Package,
} from 'lucide-react';
import { CustomWordList, WordEntry } from '../types/curriculum';

interface WorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculumWords: WordEntry[];
  customLists: CustomWordList[];
  onCreateList: (list: CustomWordList) => void;
  onDeleteList: (listId: string) => void;
  onPracticeList: (listId: string) => void;
  onExportBackup: () => string;
  onImportBackup: (rawJson: string) => { ok: boolean; message: string };
  onResetProgress: () => void;
}

const ADULT_CHALLENGES = [
  { question: '7 × 8', answer: 56 },
  { question: '6 × 9', answer: 54 },
  { question: '8 × 9', answer: 72 },
  { question: '7 × 6', answer: 42 },
];

function buildWordEntry(
  rawWord: string,
  curriculumWords: WordEntry[],
  customSentence?: string,
  customRuleTag?: string
): WordEntry {
  const clean = rawWord.trim().toLowerCase();
  const existing = curriculumWords.find((w) => w.word.toLowerCase() === clean);
  if (existing && !customSentence && !customRuleTag) {
    return existing;
  }

  return {
    word: clean,
    zoneId: existing?.zoneId ?? 'zone-5',
    ruleTag: customRuleTag?.trim() || existing?.ruleTag || 'Special Delivery',
    phonemeSlots: existing?.phonemeSlots ?? clean.split(''),
    morphemes: existing?.morphemes,
    syllables: existing?.syllables ?? [clean],
    contextSentence:
      customSentence?.trim() ||
      existing?.contextSentence ||
      `Spell the word ${clean} to deliver the message.`,
    hint:
      existing?.hint || `Listen carefully to each sound and pattern in "${clean}".`,
    commonMistakes: existing?.commonMistakes ?? {},
  };
}

export function WorkshopModal({
  isOpen,
  onClose,
  curriculumWords,
  customLists,
  onCreateList,
  onDeleteList,
  onPracticeList,
  onExportBackup,
  onImportBackup,
  onResetProgress,
}: WorkshopModalProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [challengeIdx] = useState(() =>
    Math.floor(Math.random() * ADULT_CHALLENGES.length)
  );
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState(false);

  const [studioMode, setStudioMode] = useState<'single' | 'bulk'>('single');
  const [towerTitle, setTowerTitle] = useState('');

  // Single-word mode state
  const [singleWord, setSingleWord] = useState('');
  const [singleSentence, setSingleSentence] = useState('');
  const [singleRule, setSingleRule] = useState('');
  const [draftWords, setDraftWords] = useState<WordEntry[]>([]);

  // Bulk paste mode state
  const [bulkText, setBulkText] = useState('');
  const [bulkRule, setBulkRule] = useState('Weekly School List');

  // Backup & reset feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const challenge = ADULT_CHALLENGES[challengeIdx];

  const handleUnlock = (e: FormEvent) => {
    e.preventDefault();
    if (Number(gateInput.trim()) === challenge.answer) {
      setIsUnlocked(true);
      setGateError(false);
      setGateInput('');
    } else {
      setGateError(true);
    }
  };

  const handleAddSingleWord = () => {
    const clean = singleWord.trim().toLowerCase();
    if (!clean) return;
    const entry = buildWordEntry(
      clean,
      curriculumWords,
      singleSentence,
      singleRule
    );
    setDraftWords((prev) => [...prev, entry]);
    setSingleWord('');
    setSingleSentence('');
    setSingleRule('');
  };

  const handleSaveSingleTower = (e: FormEvent) => {
    e.preventDefault();
    if (draftWords.length === 0) return;
    const list: CustomWordList = {
      id: `special-${Date.now()}`,
      title: towerTitle.trim() || 'Special Delivery Tower',
      createdBy: 'Parent / Teacher',
      createdAt: new Date().toISOString(),
      words: draftWords,
    };
    onCreateList(list);
    setTowerTitle('');
    setDraftWords([]);
    setStatusMessage(`Created "${list.title}" on the main Tower Map!`);
  };

  const handleSaveBulkTower = (e: FormEvent) => {
    e.preventDefault();
    const tokens = bulkText
      .split(/[\n,]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const entries = tokens.map((t) =>
      buildWordEntry(t, curriculumWords, undefined, bulkRule)
    );
    const list: CustomWordList = {
      id: `special-${Date.now()}`,
      title: towerTitle.trim() || 'Special Delivery Tower',
      createdBy: 'Parent / Teacher',
      createdAt: new Date().toISOString(),
      words: entries,
    };
    onCreateList(list);
    setTowerTitle('');
    setBulkText('');
    setStatusMessage(
      `Generated "${list.title}" (${entries.length} words) on the main Tower Map!`
    );
  };

  const handleExport = () => {
    const json = onExportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `wordwright-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage('Backup exported (.json) — ready for local folder or NAS!');
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportBackup(content);
      setStatusMessage(res.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-timber-dark/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Parent/Teacher Workshop"
    >
      <div className="wood-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-timber-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brass-gold bg-brass-light text-timber-dark">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-timber-dark sm:text-2xl">
                Parent/Teacher Workshop
              </h2>
              <p className="text-xs text-timber-warm">
                Custom Word List Studio &amp; Backup Controls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-timber-light bg-white p-2 text-timber-warm hover:bg-timber-light/40"
            aria-label="Close Workshop"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Adult Gate */}
        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="my-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brass-gold bg-brass-light text-brass-dark">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-timber-dark">
              Adult Gate
            </h3>
            <p className="text-sm text-timber-warm">
              Solve this quick question to unlock the Parent/Teacher Workshop:
            </p>
            <p className="font-display text-2xl font-bold text-pine-deep">
              {challenge.question} = ?
            </p>
            <div className="mx-auto flex max-w-xs gap-2">
              <input
                type="number"
                value={gateInput}
                onChange={(e) => setGateInput(e.target.value)}
                autoFocus
                placeholder="Answer"
                className="w-full rounded-xl border-2 border-timber-mid bg-white px-4 py-2 text-center text-lg font-bold text-timber-dark focus:border-sky-beacon focus:outline-none"
                required
              />
              <button
                type="submit"
                className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-pine-deep bg-pine-mid px-4 py-2 text-sm font-bold text-white"
              >
                <Unlock className="h-4 w-4" />
                <span>Unlock</span>
              </button>
            </div>
            {gateError && (
              <p className="text-xs font-bold text-brass-dark">
                Not quite—try that multiplication again!
              </p>
            )}
          </form>
        ) : (
          <div className="mt-6 space-y-6">
            {statusMessage && (
              <div className="rounded-xl border border-pine-mid bg-pine-soft px-4 py-3 text-sm font-semibold text-pine-deep">
                {statusMessage}
              </div>
            )}

            {/* Custom Word List Studio */}
            <section className="space-y-4 rounded-2xl border-2 border-timber-light bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-sky-beacon" />
                  <h3 className="font-display text-lg font-bold text-timber-dark">
                    Custom Word List Studio
                  </h3>
                </div>

                <div className="flex rounded-xl border border-timber-light bg-sky-mist p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStudioMode('single')}
                    className={`rounded-lg px-3 py-1.5 ${
                      studioMode === 'single'
                        ? 'bg-sky-beacon text-white'
                        : 'text-timber-warm'
                    }`}
                  >
                    One-by-One
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode('bulk')}
                    className={`rounded-lg px-3 py-1.5 ${
                      studioMode === 'bulk'
                        ? 'bg-sky-beacon text-white'
                        : 'text-timber-warm'
                    }`}
                  >
                    Quick Paste
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="special-tower-title"
                  className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
                >
                  Special Delivery Tower Name
                </label>
                <input
                  id="special-tower-title"
                  type="text"
                  value={towerTitle}
                  onChange={(e) => setTowerTitle(e.target.value)}
                  placeholder="e.g., Week 7 School Spelling List"
                  className="mt-1 w-full rounded-xl border-2 border-timber-light bg-parchment px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                />
              </div>

              {studioMode === 'single' ? (
                <form onSubmit={handleSaveSingleTower} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      value={singleWord}
                      onChange={(e) => setSingleWord(e.target.value)}
                      placeholder="Word (required)"
                      className="rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                    />
                    <input
                      type="text"
                      value={singleSentence}
                      onChange={(e) => setSingleSentence(e.target.value)}
                      placeholder="Sentence (optional)"
                      className="rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                    />
                    <input
                      type="text"
                      value={singleRule}
                      onChange={(e) => setSingleRule(e.target.value)}
                      placeholder="Rule tag (optional)"
                      className="rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddSingleWord}
                      className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-beacon bg-sky-soft px-3.5 py-2 text-xs font-bold text-sky-beacon"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Word to List</span>
                    </button>

                    <button
                      type="submit"
                      disabled={draftWords.length === 0}
                      className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-pine-deep bg-pine-mid px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      <span>
                        Create Special Delivery Tower ({draftWords.length})
                      </span>
                    </button>
                  </div>

                  {draftWords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {draftWords.map((dw, idx) => (
                        <span
                          key={`${dw.word}-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brass-gold bg-brass-light/60 px-2.5 py-1 text-xs font-bold text-timber-dark"
                        >
                          {dw.word}
                          <button
                            type="button"
                            onClick={() =>
                              setDraftWords((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-timber-warm hover:text-timber-dark"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleSaveBulkTower} className="space-y-3">
                  <input
                    type="text"
                    value={bulkRule}
                    onChange={(e) => setBulkRule(e.target.value)}
                    placeholder="Rule tag for this list"
                    className="w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                  />
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste weekly spelling words (one per line or comma-separated)..."
                    className="w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-pine-deep bg-pine-mid px-4 py-2 text-xs font-bold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Generate Special Delivery Tower</span>
                  </button>
                </form>
              )}

              {/* Saved Special Delivery Towers */}
              {customLists.length > 0 && (
                <div className="space-y-2 border-t border-timber-light pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-timber-warm">
                    Active Special Delivery Towers ({customLists.length})
                  </p>
                  {customLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-timber-light bg-parchment px-3.5 py-2.5"
                    >
                      <div>
                        <span className="font-display text-sm font-bold text-timber-dark">
                          {list.title}
                        </span>
                        <span className="ml-2 text-xs text-timber-warm">
                          ({list.words.length} words)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPracticeList(list.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-beacon px-2.5 py-1 text-xs font-bold text-white"
                        >
                          <Play className="h-3 w-3" />
                          <span>Play</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteList(list.id)}
                          className="rounded-lg p-1 text-timber-warm hover:bg-brass-light hover:text-timber-dark"
                          title="Delete tower"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Backup & Sync (NAS / Local File Export) */}
            <section className="space-y-4 rounded-2xl border-2 border-timber-light bg-white p-5">
              <div>
                <h3 className="font-display text-lg font-bold text-timber-dark">
                  Backup &amp; Sync (NAS / Local File)
                </h3>
                <p className="text-xs text-timber-warm">
                  Export or restore student progress, Leitner mastery boxes, and
                  custom word lists as JSON.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-brass-dark bg-brass-light px-4 py-2 text-xs font-bold text-timber-dark"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Progress &amp; Custom Words (.json)</span>
                </button>

                <label className="tactile-btn inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-sky-beacon bg-sky-soft px-4 py-2 text-xs font-bold text-sky-beacon">
                  <Upload className="h-4 w-4" />
                  <span>Import Backup (.json)</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="border-t border-timber-light pt-3">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brass-dark hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Student Progress</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-brass-dark">
                      Are you sure? This clears all towers &amp; mastery:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResetProgress();
                        setConfirmReset(false);
                        setStatusMessage('Student progress has been reset.');
                      }}
                      className="rounded-lg bg-brass-dark px-3 py-1 text-xs font-bold text-white"
                    >
                      Yes, Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg border border-timber-light px-3 py-1 text-xs font-bold text-timber-warm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
