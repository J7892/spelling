import { useMemo, useState } from 'react';
import { TopBar, AppView } from './components/TopBar';
import { TowerMap } from './components/TowerMap';
import { GameArena } from './components/GameArena';
import { WorkshopModal } from './components/WorkshopModal';
import { ProgressLogView } from './components/ProgressLogView';
import { RuleCardModal } from './components/RuleCardModal';
import { CURRICULUM_WORDS, ZONES } from './data/curriculumWords';
import { useGameStore } from './hooks/useGameStore';
import { WordEntry, Zone, ZoneId } from './types/curriculum';

export function App() {
  const [view, setView] = useState<AppView>('map');
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [pendingRuleZone, setPendingRuleZone] = useState<Zone | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<ZoneId>('zone-1');
  const [activeCustomListId, setActiveCustomListId] = useState<string | null>(
    null
  );

  const {
    progress,
    wordMastery,
    customLists,
    totalWordsTyped,
    recordAttempt,
    markZoneRepaired,
    getWordsForZoneSession,
    addCustomList,
    deleteCustomList,
    resetProgress,
    exportBackupJson,
    importBackupJson,
  } = useGameStore();

  const wordsByZone = useMemo(() => {
    const grouped: Record<ZoneId, WordEntry[]> = {
      'zone-1': [],
      'zone-2': [],
      'zone-3': [],
      'zone-4': [],
      'zone-5': [],
    };
    for (const entry of CURRICULUM_WORDS) {
      grouped[entry.zoneId].push(entry);
    }
    return grouped;
  }, []);

  const handleNavigate = (nextView: AppView) => {
    if (nextView === 'workshop') {
      setWorkshopOpen(true);
      return;
    }
    setView(nextView);
  };

  const handleSelectZone = (zoneId: ZoneId) => {
    const found = ZONES.find((z) => z.id === zoneId) ?? null;
    setPendingRuleZone(found);
  };

  const handleStartZoneFromRuleCard = (zone: Zone) => {
    setPendingRuleZone(null);
    setActiveCustomListId(null);
    setActiveZoneId(zone.id);
    setView('practice');
  };

  const handleSelectCustomList = (listId: string) => {
    setActiveCustomListId(listId);
    setView('practice');
  };

  const activeZone = ZONES.find((z) => z.id === activeZoneId);
  const activeCustomList = activeCustomListId
    ? customLists.find((l) => l.id === activeCustomListId)
    : undefined;

  const sessionWords = useMemo(() => {
    if (activeCustomList) return activeCustomList.words;
    return getWordsForZoneSession(activeZoneId, CURRICULUM_WORDS);
  }, [activeCustomList, activeZoneId, getWordsForZoneSession]);

  return (
    <div className="min-h-screen bg-sky-mist text-timber-dark">
      <TopBar
        currentView={workshopOpen ? 'workshop' : view}
        onNavigate={handleNavigate}
        towersRepaired={progress.towersRepaired}
        totalTowers={ZONES.length}
        currentStreak={progress.currentStreak}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {view === 'map' && (
          <TowerMap
            zones={ZONES}
            wordsByZone={wordsByZone}
            progress={progress}
            customLists={customLists}
            onSelectZone={handleSelectZone}
            onSelectCustomList={handleSelectCustomList}
          />
        )}

        {view === 'practice' && activeCustomList && (
          <GameArena
            title={activeCustomList.title}
            subtitle={`Special Delivery Tower • ${activeCustomList.createdBy}`}
            words={activeCustomList.words}
            onRecordAttempt={(word, attempt, isCorrect, hint, isFirstTry) =>
              recordAttempt(
                word,
                attempt,
                isCorrect,
                hint,
                activeCustomList.words.length,
                isFirstTry
              )
            }
            onExit={() => setView('map')}
          />
        )}

        {view === 'practice' && !activeCustomList && activeZone && (
          <GameArena
            title={activeZone.name}
            subtitle={activeZone.subtitle}
            zone={activeZone}
            words={sessionWords}
            onRecordAttempt={(word, attempt, isCorrect, hint, isFirstTry) =>
              recordAttempt(
                word,
                attempt,
                isCorrect,
                hint,
                wordsByZone[word.zoneId]?.length ?? 0,
                isFirstTry
              )
            }
            onZoneComplete={(completedZone) =>
              markZoneRepaired(completedZone.id)
            }
            onExit={() => setView('map')}
          />
        )}

        {view === 'progress' && (
          <ProgressLogView
            zones={ZONES}
            wordsByZone={wordsByZone}
            progress={progress}
            wordMastery={wordMastery}
            totalWordsTyped={totalWordsTyped}
            onBack={() => setView('map')}
          />
        )}
      </main>

      <RuleCardModal
        zone={pendingRuleZone}
        onStartZone={handleStartZoneFromRuleCard}
        onClose={() => setPendingRuleZone(null)}
      />

      <WorkshopModal
        isOpen={workshopOpen}
        onClose={() => setWorkshopOpen(false)}
        curriculumWords={CURRICULUM_WORDS}
        customLists={customLists}
        onCreateList={addCustomList}
        onDeleteList={deleteCustomList}
        onPracticeList={handleSelectCustomList}
        onExportBackup={exportBackupJson}
        onImportBackup={importBackupJson}
        onResetProgress={resetProgress}
      />
    </div>
  );
}

export default App;
