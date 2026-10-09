import type { SaveData } from './types';

const KEY = 'cat-hero-save-v3';

export function defaultSave(): SaveData {
  return {
    records: {},
    endless: { stage: 1, bestHit: 0, bestDmgPerCat: 0 },
    storyCleared: false,
    collection: [
      { uid: 'starter-1', defId: 'knight', level: 1, roll: 1.0 },
      { uid: 'starter-2', defId: 'bard', level: 1, roll: 1.0 },
      { uid: 'starter-3', defId: 'spark', level: 1, roll: 1.0 },
    ],
    badges: 500,
    foodUpgrade: 0,
  };
}

interface SaveV2 {
  records?: SaveData['records'];
  endless?: SaveData['endless'];
  storyCleared?: boolean;
  collection?: SaveData['collection'];
  crystals?: number; // v2：魔力结晶 → v3 迁移为徽章
  foodUpgrade?: number;
  lastFormation?: PlacementV2;
}

type PlacementV2 = SaveData['lastFormation'];

export function loadSave(): SaveData {
  const base = defaultSave();
  // ── v3 存档 ──
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        ...base,
        ...parsed,
        endless: { ...base.endless, ...(parsed.endless ?? {}) },
        collection: parsed.collection?.length ? parsed.collection : base.collection,
        badges: parsed.badges ?? base.badges,
        foodUpgrade: parsed.foodUpgrade ?? 0,
      };
    }
  } catch { /* ignore */ }
  // ── v2 存档迁移：魔力结晶 → 勇者徽章 ──
  try {
    const raw = localStorage.getItem('cat-hero-save-v2');
    if (raw) {
      const parsed = JSON.parse(raw) as SaveV2;
      return {
        ...base,
        records: parsed.records ?? base.records,
        endless: { ...base.endless, ...(parsed.endless ?? {}) },
        storyCleared: parsed.storyCleared ?? false,
        collection: parsed.collection?.length ? parsed.collection : base.collection,
        badges: parsed.crystals ?? base.badges,
        foodUpgrade: parsed.foodUpgrade ?? 0,
        lastFormation: parsed.lastFormation,
      };
    }
  } catch { /* ignore */ }
  return base;
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}
