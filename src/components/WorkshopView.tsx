import { useState, FormEvent } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  BookOpen,
  Play,
  ArrowLeft,
} from 'lucide-react';
import {
  CustomWordList,
  WordEntry,
  Zone,
  ZoneId,
} from '../types/curriculum';

interface WorkshopViewProps {
  zones: Zone[];
  curriculumWords: WordEntry[];
  customLists: CustomWordList[];
  onCreateList: (list: CustomWordList) => void;
  onDeleteList: (listId: string) => void;
  onPracticeList: (listId: string) => void;
  onBack: () => void;
}

export function WorkshopView({
  zones,
  curriculumWords,
  customLists,
  onCreateList,
  onDeleteList,
  onPracticeList,
  onBack,
}: WorkshopViewProps) {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<ZoneId | 'all'>(
    'all'
  );
  const [title, setTitle] = useState('');
  const [createdBy, setCreatedBy] = useState('Parent / Teacher');
  const [rawWords, setRawWords] = useState('');
  const [ruleTag, setRuleTag] = useState('Custom Practice');

  const filteredWords =
    selectedZoneFilter === 'all'
      ? curriculumWords
      : curriculumWords.filter((w) => w.zoneId === selectedZoneFilter);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const cleanedWords = rawWords
      .split(/[\n,]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    if (!title.trim() || cleanedWords.length === 0) return;

    const entries: WordEntry[] = cleanedWords.map((w) => {
      const existing = curriculumWords.find(
        (cw) => cw.word.toLowerCase() === w
      );
      if (existing) return existing;

      return {
        word: w,
        zoneId: 'zone-5',
        ruleTag: ruleTag.trim() || 'Custom Practice',
        phonemeSlots: w.split(''),
        syllables: [w],
        contextSentence: `Spell the word ${w} to calibrate the relay.`,
        hint: `Listen carefully to each sound in "${w}".`,
        commonMistakes: {},
      };
    });

    const newList: CustomWordList = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      createdBy: createdBy.trim() || 'Parent / Teacher',
      createdAt: new Date().toISOString(),
      words: entries,
    };

    onCreateList(newList);
    setTitle('');
    setRawWords('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-brass-dark">
            <Wrench className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Educator &amp; Family Bench
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-timber-dark sm:text-3xl">
            Parent/Teacher Workshop
          </h1>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-timber-light bg-parchment px-4 py-2 text-sm font-bold text-timber-dark shadow-[0_2px_0_0_#d5c2a6]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tower Map</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Custom Word List */}
        <section className="wood-panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-timber-dark">
            Build a Custom Word List
          </h2>
          <p className="mt-1 text-sm text-timber-warm">
            Add weekly school words or tricky Canadian spellings. Matching words
            automatically pull full hints from the curriculum bank.
          </p>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="list-title"
                  className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
                >
                  List Title
                </label>
                <input
                  id="list-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Week 6 Spelling"
                  className="mt-1 w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="list-author"
                  className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
                >
                  Created By
                </label>
                <input
                  id="list-author"
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="list-rule"
                className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
              >
                Rule Label
              </label>
              <input
                id="list-rule"
                type="text"
                value={ruleTag}
                onChange={(e) => setRuleTag(e.target.value)}
                placeholder="e.g., Canadian -our & -re"
                className="mt-1 w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="list-words"
                className="block text-xs font-bold uppercase tracking-wider text-timber-warm"
              >
                Words (comma or line separated)
              </label>
              <textarea
                id="list-words"
                rows={4}
                value={rawWords}
                onChange={(e) => setRawWords(e.target.value)}
                placeholder="colour, centre, hopping, neighbour"
                className="mt-1 w-full rounded-xl border-2 border-timber-light bg-white px-3 py-2 text-sm font-medium text-timber-dark focus:border-sky-beacon focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-pine-deep bg-pine-mid px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep"
            >
              <Plus className="h-4 w-4" />
              <span>Save Custom List</span>
            </button>
          </form>
        </section>

        {/* Saved Custom Lists */}
        <section className="wood-panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-timber-dark">
            Saved Custom Lists ({customLists.length})
          </h2>
          <p className="mt-1 text-sm text-timber-warm">
            Launch any custom list directly in the repair bench.
          </p>

          {customLists.length === 0 ? (
            <div className="mt-6 rounded-xl border-2 border-dashed border-timber-light bg-white/60 p-8 text-center text-sm text-timber-warm">
              No custom lists yet. Create one on the left to get started!
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {customLists.map((list) => (
                <div
                  key={list.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-timber-light bg-white p-4"
                >
                  <div>
                    <h3 className="font-display font-bold text-timber-dark">
                      {list.title}
                    </h3>
                    <p className="text-xs text-timber-warm">
                      {list.words.length} words • {list.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPracticeList(list.id)}
                      className="tactile-btn inline-flex items-center gap-1 rounded-lg border-2 border-sky-beacon bg-sky-beacon px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Practise</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteList(list.id)}
                      className="rounded-lg border border-timber-light p-1.5 text-timber-warm hover:bg-brass-light hover:text-timber-dark"
                      title="Delete list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Curriculum Bank Inspector */}
      <section className="wood-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-timber-light pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-pine-deep" />
            <h2 className="font-display text-xl font-bold text-timber-dark">
              Grade 3 Curriculum Bank ({filteredWords.length} words)
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedZoneFilter('all')}
              className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                selectedZoneFilter === 'all'
                  ? 'border-pine-deep bg-pine-deep text-white'
                  : 'border-timber-light bg-white text-timber-warm'
              }`}
            >
              All Zones
            </button>
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZoneFilter(z.id)}
                className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                  selectedZoneFilter === z.id
                    ? 'border-pine-deep bg-pine-deep text-white'
                    : 'border-timber-light bg-white text-timber-warm'
                }`}
              >
                Zone {z.number}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWords.map((entry) => (
            <div
              key={`${entry.zoneId}-${entry.word}`}
              className="rounded-xl border border-timber-light bg-white p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold text-timber-dark">
                  {entry.word}
                </span>
                <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[11px] font-bold text-sky-beacon">
                  {entry.ruleTag}
                </span>
              </div>
              <p className="mt-1 text-xs text-timber-warm">
                Slots: {entry.phonemeSlots.join(' · ')}
              </p>
              <p className="mt-0.5 text-xs text-timber-mid">
                Syllables: {entry.syllables.join('-')}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
