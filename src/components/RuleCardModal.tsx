import { BookOpen, ArrowRight, X } from 'lucide-react';
import { Zone, ZoneId } from '../types/curriculum';

interface RuleExample {
  before: string;
  after: string;
  note: string;
}

interface ZoneRuleGuide {
  headline: string;
  kidExplanation: string;
  examples: [RuleExample, RuleExample];
}

const ZONE_RULE_GUIDES: Record<ZoneId, ZoneRuleGuide> = {
  'zone-1': {
    headline: 'Suffix Rules: Doubling, Dropping & Changing',
    kidExplanation:
      'When you weld a suffix like -ing or -ed onto a base word, check the end of the base word first! Short 1-1-1 words double their last letter, silent-e words drop their e, and consonant-y words swap y for i.',
    examples: [
      {
        before: 'hop + ing',
        after: 'hopping',
        note: '1 syllable, 1 short vowel, 1 consonant → double the p!',
      },
      {
        before: 'smile + ed',
        after: 'smiled',
        note: 'Drop the silent e before adding a vowel suffix!',
      },
    ],
  },
  'zone-2': {
    headline: 'Morpheme Forge: Prefixes & Suffixes',
    kidExplanation:
      'Big words are built from smaller meaning pieces called morphemes! Snap a prefix onto the front (un-, pre-, dis-) or a suffix onto the end (-ful, -less, -ness, -ly). Notice -ful only uses ONE l!',
    examples: [
      {
        before: 'un + help + ful',
        after: 'unhelpful',
        note: 'Three clean parts welded together—one l in -ful!',
      },
      {
        before: 'colour + ful',
        after: 'colourful',
        note: 'Keep the Canadian -our inside the root word!',
      },
    ],
  },
  'zone-3': {
    headline: 'Pattern Peaks: Signal Vowels & Teams',
    kidExplanation:
      'Watch for signal vowels e and i: they make c say /s/ (centimetre) and g say /j/ (giant). Also keep an eye out for 4-letter vowel team eigh (/ay/) and silent letters like gn in gnome.',
    examples: [
      {
        before: 'n + eigh + b + our',
        after: 'neighbour',
        note: 'eigh says /ay/, and Canadian spelling ends in -our!',
      },
      {
        before: 'c + e + n + t + i...',
        after: 'centimetre',
        note: 'Signal vowel e makes c soft (/s/), ending in -re!',
      },
    ],
  },
  'zone-4': {
    headline: 'Syllable Sawmill: Chunking & Schwa',
    kidExplanation:
      'Longer words are easier when you saw them into syllable beats! Say each beat clearly so quiet, unstressed schwa vowels (like the i in family or the er in camera) do not hide on you.',
    examples: [
      {
        before: 'fam · i · ly',
        after: 'family',
        note: 'Say all three beats so you remember the middle i!',
      },
      {
        before: 'to · geth · er',
        after: 'together',
        note: 'Think of three friendly words: to + get + her!',
      },
    ],
  },
  'zone-5': {
    headline: 'True North Workshop: Canadian Spelling',
    kidExplanation:
      'Canadian English uses -our (colour), -re (centre), doubled l before endings (travelling), and -ce for nouns vs. -se for action verbs (practice / practise). Watch homophones like their / there / they’re!',
    examples: [
      {
        before: 'col + our',
        after: 'colour',
        note: 'Keep the u in -our and use -re in centre & metre!',
      },
      {
        before: 'travel + l + ing',
        after: 'travelling',
        note: 'Canadian English doubles the l before -ing and -ed!',
      },
    ],
  },
};

interface RuleCardModalProps {
  zone: Zone | null;
  onStartZone: (zone: Zone) => void;
  onClose: () => void;
}

export function RuleCardModal({
  zone,
  onStartZone,
  onClose,
}: RuleCardModalProps) {
  if (!zone) return null;

  const guide = ZONE_RULE_GUIDES[zone.id];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-timber-dark/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Review Rule Card for ${zone.name}`}
    >
      <div className="wood-panel w-full max-w-xl rounded-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-timber-light pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-pine-mid bg-pine-deep text-brass-light">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pine-mid">
                Review Rule Card • Zone {zone.number}
              </span>
              <h2 className="font-display text-xl font-bold text-timber-dark sm:text-2xl">
                {guide.headline}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-timber-light bg-white p-1.5 text-timber-warm hover:bg-timber-light/40"
            aria-label="Close Rule Card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-timber-dark sm:text-base">
            {guide.kidExplanation}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {guide.examples.map((ex, idx) => (
              <div
                key={idx}
                className="rounded-xl border-2 border-brass-gold bg-brass-light/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-timber-dark">
                  <span className="rounded-lg bg-white px-2.5 py-1 tracking-wide">
                    {ex.before}
                  </span>
                  <span className="text-brass-dark">→</span>
                  <span className="rounded-lg border border-pine-mid bg-pine-soft px-2.5 py-1 tracking-wide text-pine-deep">
                    {ex.after}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-timber-warm">
                  {ex.note}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-timber-light pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-timber-light bg-white px-4 py-2.5 text-sm font-bold text-timber-warm hover:bg-timber-light/30"
            >
              Back to Map
            </button>
            <button
              type="button"
              onClick={() => onStartZone(zone)}
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-pine-deep bg-pine-mid px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep"
            >
              <span>Start Repairing Tower</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
