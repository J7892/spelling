import { PlayerProgress, Zone, ZoneId } from '../types/curriculum';

interface CanadianTowerLandscapeProps {
  zones: Zone[];
  progress: PlayerProgress;
  onSelectZone: (zoneId: ZoneId) => void;
}

const TOWER_COORDS: Record<ZoneId, { x: number; y: number; labelY: number }> = {
  'zone-1': { x: 115, y: 158, labelY: 204 },
  'zone-2': { x: 265, y: 132, labelY: 178 },
  'zone-3': { x: 425, y: 105, labelY: 151 },
  'zone-4': { x: 585, y: 142, labelY: 188 },
  'zone-5': { x: 745, y: 118, labelY: 164 },
};

export function CanadianTowerLandscape({
  zones,
  progress,
  onSelectZone,
}: CanadianTowerLandscapeProps) {
  return (
    <div className="wood-panel overflow-hidden rounded-2xl p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-timber-dark sm:text-xl">
            True North Relay Network Map
          </h2>
          <p className="text-xs text-timber-warm">
            Click any tower to repair it—repaired towers broadcast live signal
            waves!
          </p>
        </div>
        <span className="rounded-full border border-pine-mid/30 bg-pine-soft px-3 py-1 text-xs font-bold text-pine-deep">
          {progress.towersRepaired} of {zones.length} Beacons Lit
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-timber-light bg-sky-soft">
        <svg
          viewBox="0 0 860 240"
          className="h-auto w-full select-none"
          role="img"
          aria-label="Canadian landscape map with 5 communication towers"
        >
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cce7fb" />
              <stop offset="100%" stopColor="#f2f7fa" />
            </linearGradient>
            <linearGradient id="lakeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6eb4e5" />
              <stop offset="100%" stopColor="#2b7bba" />
            </linearGradient>
          </defs>

          {/* Sky Backdrop */}
          <rect x="0" y="0" width="860" height="240" fill="url(#skyGrad)" />

          {/* Distant Rockies / Laurentian Peaks */}
          <polygon points="0,175 95,88 195,175" fill="#9fbcd1" />
          <polygon points="150,175 265,68 380,175" fill="#89acc7" />
          <polygon points="325,175 430,52 545,175" fill="#779ebb" />
          <polygon points="495,175 605,82 715,175" fill="#89acc7" />
          <polygon points="650,175 755,62 860,175" fill="#779ebb" />

          {/* Snow Caps */}
          <polygon points="430,52 406,79 422,74 432,83 444,74 454,79" fill="#ffffff" />
          <polygon points="755,62 735,86 749,82 758,89 773,83" fill="#ffffff" />

          {/* Rolling Pine Hills */}
          <path
            d="M0,175 Q140,140 280,168 T560,162 T860,170 L860,240 L0,240 Z"
            fill="#2f6f54"
          />
          <path
            d="M0,192 Q210,165 420,190 T860,185 L860,240 L0,240 Z"
            fill="#1e4d3b"
          />

          {/* Northern River / Lake */}
          <path
            d="M0,218 Q220,205 430,222 T860,214 L860,240 L0,240 Z"
            fill="url(#lakeGrad)"
            opacity="0.85"
          />

          {/* Relay Connecting Lines between Towers */}
          {zones.slice(0, -1).map((zone, i) => {
            const nextZone = zones[i + 1];
            const c1 = TOWER_COORDS[zone.id];
            const c2 = TOWER_COORDS[nextZone.id];
            const bothLit =
              progress.zoneProgress[zone.id]?.repaired &&
              progress.zoneProgress[nextZone.id]?.repaired;

            return (
              <line
                key={`link-${zone.id}`}
                x1={c1.x}
                y1={c1.y - 34}
                x2={c2.x}
                y2={c2.y - 34}
                stroke={bothLit ? '#f6e3ba' : '#8b6747'}
                strokeWidth={bothLit ? 2.5 : 1.5}
                strokeDasharray={bothLit ? undefined : '5 5'}
                opacity={bothLit ? 0.95 : 0.45}
              />
            );
          })}

          {/* 5 Communication Towers */}
          {zones.map((zone) => {
            const { x, y, labelY } = TOWER_COORDS[zone.id];
            const isRepaired = progress.zoneProgress[zone.id]?.repaired ?? false;

            return (
              <g
                key={zone.id}
                onClick={() => onSelectZone(zone.id)}
                className="cursor-pointer transition-opacity hover:opacity-90"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectZone(zone.id);
                  }
                }}
                aria-label={`Zone ${zone.number}: ${zone.name} (${
                  isRepaired ? 'Online' : 'Needs Repair'
                })`}
              >
                {/* Animated Signal Waves when Repaired */}
                {isRepaired && (
                  <>
                    <circle
                      cx={x}
                      cy={y - 36}
                      r="14"
                      fill="none"
                      stroke="#2b7bba"
                      strokeWidth="2.5"
                      className="animate-signal-wave"
                    />
                    <circle
                      cx={x}
                      cy={y - 36}
                      r="14"
                      fill="none"
                      stroke="#f6e3ba"
                      strokeWidth="2"
                      className="animate-signal-wave-delayed"
                    />
                  </>
                )}

                {/* Tower Lattice */}
                <polygon
                  points={`${x - 12},${y} ${x + 12},${y} ${x + 4},${y - 34} ${x - 4},${y - 34}`}
                  fill={isRepaired ? '#5c4028' : '#8b6747'}
                  stroke="#2f2219"
                  strokeWidth="1.5"
                />
                <line
                  x1={x - 8}
                  y1={y - 12}
                  x2={x + 8}
                  y2={y - 12}
                  stroke="#e7d8c3"
                  strokeWidth="1.5"
                />
                <line
                  x1={x - 6}
                  y1={y - 23}
                  x2={x + 6}
                  y2={y - 23}
                  stroke="#e7d8c3"
                  strokeWidth="1.5"
                />

                {/* Beacon Light */}
                <circle
                  cx={x}
                  cy={y - 36}
                  r={isRepaired ? 6.5 : 5}
                  fill={isRepaired ? '#f6e3ba' : '#d5c2a6'}
                  stroke={isRepaired ? '#c98a2c' : '#5c4028'}
                  strokeWidth="2"
                />

                {/* Zone Pill Label */}
                <rect
                  x={x - 38}
                  y={labelY - 12}
                  width="76"
                  height="20"
                  rx="8"
                  fill={isRepaired ? '#1e4d3b' : '#fbf6ee'}
                  stroke={isRepaired ? '#2f6f54' : '#c98a2c'}
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={labelY + 2}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isRepaired ? '#ffffff' : '#2f2219'}
                >
                  Zone {zone.number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
