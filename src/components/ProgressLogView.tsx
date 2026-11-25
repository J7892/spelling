import {
  ClipboardList,
  Radio,
  Flame,
  CheckCircle2,
  ArrowLeft,
  Keyboard,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import {
  PlayerProgress,
  WordEntry,
  WordMasteryRecord,
  Zone,
  ZoneId,
} from '../types/curriculum';

interface ProgressLogViewProps {
  zones: Zone[];
  wordsByZone: Record<ZoneId, WordEntry[]>;
  progress: PlayerProgress;
  wordMastery: Record<string, WordMasteryRecord>;
  totalWordsTyped: number;
  onBack: () => void;
}

export function ProgressLogView({
  zones,
  wordsByZone,
  progress,
  wordMastery,
  totalWordsTyped,
  onBack,
}: ProgressLogViewProps) {
  const masteryRecords = Object.values(wordMastery);
  const needsRepairWords = masteryRecords.filter((r) => r.needsRepair);

  // Compute 'Rules to Practise' accuracy breakdown from wordMastery
  const ruleBuckets: Record<string, { attempts: number; firstTry: number }> = {};
  for (const rec of masteryRecords) {
    if (!ruleBuckets[rec.ruleTag]) {
      ruleBuckets[rec.ruleTag] = { attempts: 0, firstTry: 0 };
    }
    ruleBuckets[rec.ruleTag].attempts += rec.attempts;
    ruleBuckets[rec.ruleTag].firstTry += rec.firstTryCorrect;
  }

  const ruleStats = Object.entries(ruleBuckets)
    .map(([rule, counts]) => ({
      rule,
      pct:
        counts.attempts > 0
          ? Math.round((counts.firstTry / counts.attempts) * 100)
          : 0,
      attempts: counts.attempts,
    }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-pine-deep">
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Station Telemetry
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-timber-dark sm:text-3xl">
            Field Log &amp; Mastery Dashboard
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

      {/* Summary Gauges */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="wood-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sky-beacon">
            <Radio className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Towers Repaired
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-timber-dark">
            {progress.towersRepaired} / {zones.length}
          </p>
        </div>

        <div className="wood-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-brass-dark">
            <Flame className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Current / Best Streak
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-timber-dark">
            {progress.currentStreak}{' '}
            <span className="text-base font-semibold text-timber-mid">
              / {progress.bestStreak}
            </span>
          </p>
        </div>

        <div className="wood-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-pine-deep">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Mastered Words
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-timber-dark">
            {progress.masteredWords.length}
          </p>
        </div>

        <div className="wood-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-timber-warm">
            <Keyboard className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Words Typed
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-timber-dark">
            {totalWordsTyped}
          </p>
        </div>
      </div>

      {/* Visual Mastery Meters per Zone */}
      <section className="wood-panel rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-timber-dark">
          Zone Mastery Meters
        </h2>
        <div className="mt-4 space-y-4">
          {zones.map((zone) => {
            const total = (wordsByZone[zone.id] ?? []).length;
            const rec = progress.zoneProgress[zone.id];
            const completed = rec?.wordsCompleted.length ?? 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={zone.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-display font-bold text-timber-dark">
                    Zone {zone.number}: {zone.name}
                  </span>
                  <span className="text-xs font-bold text-timber-warm">
                    {completed}/{total} words ({pct}%) •{' '}
                    {rec?.repaired ? 'Tower Online' : 'In Progress'}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-timber-light">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      rec?.repaired ? 'bg-pine-mid' : 'bg-sky-beacon'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rules to Practise Breakdown */}
        <section className="wood-panel rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-timber-dark">
            Rules to Practise
          </h2>
          {ruleStats.length === 0 ? (
            <p className="mt-3 text-sm text-timber-warm">
              Complete a few puzzles to see rule-by-rule accuracy.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {ruleStats.map((stat) => (
                <div
                  key={stat.rule}
                  className="flex items-center justify-between rounded-xl border border-timber-light bg-white px-4 py-2.5 text-sm"
                >
                  <span className="font-semibold text-timber-dark">
                    {stat.rule}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      stat.pct >= 80
                        ? 'bg-pine-soft text-pine-deep'
                        : 'bg-brass-light text-brass-dark'
                    }`}
                  >
                    {stat.pct}% ({stat.attempts} tries)
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leitner Needs Repair + Mastered Words */}
        <section className="wood-panel space-y-5 rounded-2xl p-6">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-brass-dark" />
              <h2 className="font-display text-xl font-bold text-timber-dark">
                Needs Repair Queue ({needsRepairWords.length})
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-timber-warm">
              Misspelled words stay here until spelled right on the first try
              twice in a row.
            </p>
            {needsRepairWords.length === 0 ? (
              <p className="mt-2 text-sm text-pine-deep">
                No words flagged for repair right now!
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {needsRepairWords.map((rec) => (
                  <span
                    key={rec.word}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brass-gold bg-brass-light px-2.5 py-1 text-xs font-bold text-timber-dark"
                  >
                    <AlertTriangle className="h-3 w-3 text-brass-dark" />
                    {rec.word} (Box {rec.boxLevel})
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-timber-light pt-4">
            <h3 className="font-display text-lg font-bold text-timber-dark">
              Mastered Words ({progress.masteredWords.length})
            </h3>
            {progress.masteredWords.length === 0 ? (
              <p className="mt-1 text-sm text-timber-warm">
                No words mastered yet.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {progress.masteredWords.map((w) => (
                  <span
                    key={w}
                    className="rounded-lg border border-pine-mid/30 bg-pine-soft px-2.5 py-0.5 text-xs font-bold text-pine-deep"
                  >
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent Mistakes */}
      <section className="wood-panel rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-timber-dark">
          Recent Diagnostics &amp; Hints
        </h2>
        {progress.recentMistakes.length === 0 ? (
          <p className="mt-3 text-sm text-timber-warm">
            No misspellings logged yet. Keep calibrating!
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {progress.recentMistakes.slice(0, 10).map((item, idx) => (
              <div
                key={`${item.word}-${item.timestamp}-${idx}`}
                className="rounded-xl border border-timber-light bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-timber-dark">
                    Target: <span className="text-pine-deep">{item.word}</span>{' '}
                    • Attempt:{' '}
                    <span className="text-brass-dark line-through">
                      {item.attempt}
                    </span>
                  </div>
                  <span className="text-xs text-timber-mid">
                    {new Date(item.timestamp).toLocaleDateString('en-CA')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-timber-warm">
                  {item.hintShown}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
