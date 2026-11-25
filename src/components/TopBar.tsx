import { Radio, Flame, Wrench, ClipboardList } from 'lucide-react';

export type AppView = 'map' | 'practice' | 'workshop' | 'progress';

interface TopBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  towersRepaired: number;
  totalTowers: number;
  currentStreak: number;
}

export function TopBar({
  currentView,
  onNavigate,
  towersRepaired,
  totalTowers,
  currentStreak,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b-4 border-brass-dark bg-timber-dark text-parchment shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Brand / Home Button */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="tactile-btn group flex items-center gap-3 rounded-xl px-2 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-gold"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-brass-gold bg-pine-deep text-brass-light shadow-inner transition-colors group-hover:bg-pine-mid">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-wide text-brass-light">
                Wordwright
              </span>
              <span className="hidden rounded-full border border-brass-gold/50 bg-timber-warm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brass-light sm:inline-block">
                Grade 3 • Canada
              </span>
            </div>
            <p className="text-xs text-timber-light/80">
              Communication Tower Mechanic
            </p>
          </div>
        </button>

        {/* Status Gauges + Navigation */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Towers Repaired Gauge */}
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-pine-mid bg-pine-deep/90 px-3 py-1.5 text-sm"
            title="Towers Repaired"
          >
            <Radio className="h-4 w-4 text-sky-soft" />
            <span className="hidden text-xs font-medium text-pine-soft md:inline">
              Towers Repaired:
            </span>
            <span className="font-bold text-white">
              {towersRepaired}/{totalTowers}
            </span>
          </div>

          {/* Current Streak Gauge */}
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-brass-gold bg-timber-warm px-3 py-1.5 text-sm"
            title="Current Streak"
          >
            <Flame className="h-4 w-4 text-brass-light" />
            <span className="hidden text-xs font-medium text-brass-light md:inline">
              Current Streak:
            </span>
            <span className="font-bold text-white">{currentStreak}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('workshop')}
            className={`tactile-btn flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              currentView === 'workshop'
                ? 'border-brass-light bg-brass-gold text-timber-dark shadow-[0_2px_0_0_#8f5c14]'
                : 'border-timber-mid bg-timber-warm text-parchment shadow-[0_2px_0_0_#1e1510] hover:bg-timber-mid/40'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Parent/Teacher Workshop</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('progress')}
            className={`tactile-btn flex items-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3 py-1.5 text-xs font-semibold sm:text-sm ${
              currentView === 'progress'
                ? 'border-brass-light bg-brass-gold text-timber-dark shadow-[0_2px_0_0_#8f5c14]'
                : 'border-timber-mid bg-timber-warm text-parchment shadow-[0_2px_0_0_#1e1510] hover:bg-timber-mid/40'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Progress Log</span>
          </button>
        </div>
      </div>
    </header>
  );
}
