import {
  Radio,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  CustomWordList,
  PlayerProgress,
  WordEntry,
  Zone,
  ZoneId,
} from '../types/curriculum';
import { CanadianTowerLandscape } from './CanadianTowerLandscape';

interface TowerMapProps {
  zones: Zone[];
  wordsByZone: Record<ZoneId, WordEntry[]>;
  progress: PlayerProgress;
  customLists: CustomWordList[];
  onSelectZone: (zoneId: ZoneId) => void;
  onSelectCustomList: (listId: string) => void;
}

export function TowerMap({
  zones,
  wordsByZone,
  progress,
  customLists,
  onSelectZone,
  onSelectCustomList,
}: TowerMapProps) {
  return (
    <div className="space-y-8">
      {/* Animated SVG Canadian Landscape Map */}
      <CanadianTowerLandscape
        zones={zones}
        progress={progress}
        onSelectZone={onSelectZone}
      />

      {/* 5 Zones Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-timber-dark">
            Relay Zones
          </h2>
          <span className="text-xs font-medium text-timber-warm">
            Ontario &amp; BC Grade 3 Curriculum
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => {
            const zoneWords = wordsByZone[zone.id] ?? [];
            const record = progress.zoneProgress[zone.id];
            const completedCount = record?.wordsCompleted.length ?? 0;
            const totalCount = zoneWords.length;
            const isRepaired = record?.repaired ?? false;
            const pct =
              totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <article
                key={zone.id}
                className="wood-panel flex flex-col justify-between rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  {/* Zone Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 font-display text-base font-bold ${
                          isRepaired
                            ? 'border-pine-mid bg-pine-deep text-white'
                            : 'border-brass-gold bg-brass-light text-timber-dark'
                        }`}
                      >
                        {zone.number}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold leading-tight text-timber-dark">
                          {zone.name}
                        </h3>
                        <p className="text-xs font-medium text-timber-warm">
                          {zone.towerName}
                        </p>
                      </div>
                    </div>

                    {isRepaired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pine-soft px-2.5 py-1 text-xs font-bold text-pine-deep">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2.5 py-1 text-xs font-bold text-sky-beacon">
                        <Radio className="h-3.5 w-3.5" />
                        Needs Repair
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-timber-warm">
                    {zone.description}
                  </p>

                  {/* Rule Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {zone.focusRules.map((rule) => (
                      <span
                        key={rule}
                        className="rounded-lg border border-timber-light bg-white px-2 py-0.5 text-xs font-medium text-timber-dark"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress & Action */}
                <div className="mt-5 space-y-3 border-t border-timber-light pt-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-timber-warm">
                      <span>
                        {completedCount} of {totalCount} words calibrated
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-timber-light">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isRepaired ? 'bg-pine-mid' : 'bg-sky-beacon'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectZone(zone.id)}
                    className={`tactile-btn flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold ${
                      isRepaired
                        ? 'border-pine-deep bg-pine-soft text-pine-deep shadow-[0_2px_0_0_#1e4d3b] hover:bg-pine-soft/80'
                        : 'border-pine-deep bg-pine-mid text-white shadow-[0_3px_0_0_#1e4d3b] hover:bg-pine-deep'
                    }`}
                  >
                    <span>
                      {isRepaired ? 'Practise Again' : 'Repair Tower'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Custom Lists Section (if any exist) */}
      {customLists.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-timber-dark">
            Special Delivery Towers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customLists.map((list) => (
              <div
                key={list.id}
                className="wood-panel flex flex-col justify-between rounded-2xl p-5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-beacon">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Special Delivery Tower
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-timber-dark">
                    {list.title}
                  </h3>
                  <p className="text-xs text-timber-warm">
                    {list.words.length} words • By {list.createdBy}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectCustomList(list.id)}
                  className="tactile-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-beacon bg-sky-beacon px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_0_#1b5380] hover:bg-sky-beacon/90"
                >
                  <span>Practise Tower</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
