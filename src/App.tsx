import { useCallback, useState } from 'react';
import { endlessLevel, getLevel } from '@/game/levels';
import { loadSave, persistSave } from '@/game/storage';
import { foodCap, victoryReward } from '@/game/balance';
import type { LevelDef, SaveData } from '@/game/types';
import { MainMenu } from '@/components/MainMenu';
import { LevelSelect } from '@/components/LevelSelect';
import { SetupScreen } from '@/components/SetupScreen';
import { BattleScreen } from '@/components/BattleScreen';
import { DemonMode } from '@/components/DemonMode';
import { Codex } from '@/components/Codex';

export interface BattleResult {
  win: boolean;
  retreated?: boolean;
  hpLeft: number;
  bestHit: number;
  bestTotal: number;
  totalDealt: number;
  turnsLeft: number;
  badgesEarned: number;
  diamondEarned: number;
}

type Screen =
  | { name: 'menu' }
  | { name: 'story' }
  | { name: 'endless' }
  | { name: 'demon' }
  | { name: 'codex' }
  | { name: 'setup'; level: LevelDef; mode: 'story' | 'endless'; key: number }
  | { name: 'battle'; level: LevelDef; mode: 'story' | 'endless'; startDiamonds: number; badgeCost: number; key: number };

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
    (mode: 'story' | 'endless', levelId: string, r: BattleResult) => {
      updateSave((s) => {
        const next = { ...s, records: { ...s.records } };
        if (r.win) next.badges += r.badgesEarned;
        const rec = next.records[levelId] ?? { bestHit: 0, bestTotal: 0, completed: false };
        rec.bestHit = Math.max(rec.bestHit, r.bestHit);
        rec.bestTotal = Math.max(rec.bestTotal, r.bestTotal);
        if (r.win) {
          rec.completed = true;
          delete rec.hpLeft; // 通关后清除保留血量
        } else {
          rec.hpLeft = r.hpLeft; // 未通关（含撤回）：保留战果，下次续打
        }
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
          onBack={() => setScreen(screen.mode === 'story' ? { name: 'story' } : { name: 'menu' })}
          onStart={(startDiamonds, badgeCost) => {
            if (badgeCost > 0) {
              updateSave((s) => ({ ...s, badges: Math.max(0, s.badges - badgeCost) }));
            }
            setScreen({ name: 'battle', level: screen.level, mode: screen.mode, startDiamonds, badgeCost, key: Date.now() });
          }}
        />
      );
    case 'battle': {
      const s = screen;
      const cap = Math.round(foodCap(save.foodUpgrade) * s.level.foodScale);
      const hpLeft = save.records[s.level.id]?.hpLeft;
      return (
        <BattleScreen
          key={s.key}
          level={s.level}
          foodCap={cap}
          startDiamonds={s.startDiamonds}
          hpLeft={hpLeft}
          onFinish={(r) => {
            handleBattleEnd(s.mode, s.level.id, {
              ...r,
              badgesEarned: r.win ? victoryReward(s.level.chapter, r.turnsLeft) : 0,
            });
            if (s.mode === 'endless' && r.win) {
              startSetup(endlessLevel(Number(s.level.id.split('-')[1]) + 1), 'endless');
            } else {
              startSetup(s.level, s.mode);
            }
          }}
        />
      );
    }
  }
}
