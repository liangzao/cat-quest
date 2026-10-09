import { useCallback, useState } from 'react';
import { endlessLevel, getLevel } from '@/game/levels';
import { loadSave, persistSave } from '@/game/storage';
import { foodCap, victoryReward } from '@/game/balance';
import type { LevelDef, Placement, SaveData } from '@/game/types';
import { MainMenu } from '@/components/MainMenu';
import { LevelSelect } from '@/components/LevelSelect';
import { SetupScreen } from '@/components/SetupScreen';
import { BattleScreen } from '@/components/BattleScreen';
import { DemonMode } from '@/components/DemonMode';
import { Codex } from '@/components/Codex';

export interface BattleResult {
  win: boolean;
  bestHit: number;
  bestTotal: number;
  totalDealt: number;
  turnsLeft: number;
  badgesEarned: number;
  diamondEarned: number;
  summonedCount: number;
}

type Screen =
  | { name: 'menu' }
  | { name: 'story' }
  | { name: 'endless' }
  | { name: 'demon' }
  | { name: 'codex' }
  | { name: 'setup'; level: LevelDef; mode: 'story' | 'endless'; key: number }
  | { name: 'battle'; level: LevelDef; mode: 'story' | 'endless'; placement: Placement; startDiamonds: number; badgeCost: number; key: number };

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave());
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

  const updateSave = useCallback((fn: (s: SaveData) => SaveData) => {
    setSave((s) => {
      const next = fn(s);
      persistSave(next);
      return next;
    });
  }, []);

  const startSetup = (level: LevelDef, mode: 'story' | 'endless') =>
    setScreen({ name: 'setup', level, mode, key: Date.now() });

  const handleBattleEnd = useCallback(
    (mode: 'story' | 'endless', levelId: string, level: LevelDef, r: BattleResult) => {
      updateSave((s) => {
        const next = { ...s, records: { ...s.records } };
        // 🏆 勇者徽章：仅胜利获得（局内💎与援军已随战斗结束清空，无需处理）
        next.badges += r.badgesEarned;
        const rec = next.records[levelId] ?? { bestHit: 0, bestTotal: 0, completed: false };
        rec.bestHit = Math.max(rec.bestHit, r.bestHit);
        rec.bestTotal = Math.max(rec.bestTotal, r.bestTotal);
        if (r.win) rec.completed = true;
        next.records[levelId] = rec;
        if (mode === 'endless' && r.win) {
          const stage = Number(levelId.split('-')[1]) + 1;
          next.endless = {
            stage: Math.max(next.endless.stage, stage),
            bestHit: Math.max(next.endless.bestHit, r.bestHit),
            bestDmgPerCat: next.endless.bestDmgPerCat,
          };
        }
        if (r.win && levelId === '2-5') next.storyCleared = true;
        return next;
      });
    },
    [updateSave],
  );

  switch (screen.name) {
    case 'menu':
      return (
        <MainMenu
          save={save}
          onStory={() => setScreen({ name: 'story' })}
          onEndless={() => startSetup(endlessLevel(save.endless.stage), 'endless')}
          onDemon={() => setScreen({ name: 'demon' })}
          onCodex={() => setScreen({ name: 'codex' })}
        />
      );
    case 'story':
      return (
        <LevelSelect
          save={save}
          onBack={() => setScreen({ name: 'menu' })}
          onPick={(id) => startSetup(getLevel(id)!, 'story')}
        />
      );
    case 'codex':
      return <Codex onBack={() => setScreen({ name: 'menu' })} />;
    case 'demon':
      return <DemonMode save={save} onBack={() => setScreen({ name: 'menu' })} />;
    case 'setup':
      return (
        <SetupScreen
          key={screen.key}
          level={screen.level}
          save={save}
          onChange={updateSave}
          onBack={() => setScreen(screen.mode === 'story' ? { name: 'story' } : { name: 'menu' })}
          onStart={(p, startDiamonds, badgeCost) => {
            if (badgeCost > 0) {
              updateSave((s) => ({ ...s, badges: Math.max(0, s.badges - badgeCost) }));
            }
            setScreen({ name: 'battle', level: screen.level, mode: screen.mode, placement: p, startDiamonds, badgeCost, key: Date.now() });
          }}
        />
      );
    case 'battle': {
      const s = screen;
      const cap = Math.round(foodCap(save.foodUpgrade) * s.level.foodScale);
      const backToSetup = () => startSetup(s.level, s.mode);
      return (
        <BattleScreen
          key={s.key}
          level={s.level}
          placement={s.placement}
          foodCap={cap}
          startDiamonds={s.startDiamonds}
          onExit={(r) => handleBattleEnd(s.mode, s.level.id, s.level, {
            ...r,
            badgesEarned: r.win ? victoryReward(s.level.chapter, r.turnsLeft) : 0,
          })}
          onRetreat={backToSetup}
          onNext={
            s.mode === 'endless'
              ? () => startSetup(endlessLevel(Number(s.level.id.split('-')[1]) + 1), 'endless')
              : undefined
          }
        />
      );
    }
  }
}
