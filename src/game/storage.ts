import type { SaveData } from './types';

const KEY = 'cat-hero-save-v4';

export function defaultSave(): SaveData {
  return {
    records: {},
    endless: { stage: 1, bestHit: 0, bestDmgPerCat: 0 },
    storyCleared: false,
    badges: 300,
    foodUpgrade: 0,
  };
}

export function loadSave(): SaveData {
  const base = defaultSave();
  const merge = (parsed: Partial<SaveData>): SaveData => ({
    ...base,
    ...parsed,
    records: parsed.records ?? base.records,
    endless: { ...base.endless, ...(parsed.endless ?? {}) },
    badges: parsed.badges ?? base.badges,
    foodUpgrade: parsed.foodUpgrade ?? 0,
  });

  // ── v4 存档 ──
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw) as Partial<SaveData>);
  } catch { /* ignore */ }

  // ── v3 存档迁移：丢弃收藏/布阵（改为局内抽卡制）──
  try {
    const raw = localStorage.getItem('cat-hero-save-v3');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return merge({ ...parsed, badges: parsed.badges ?? base.badges });
    }
  } catch { /* ignore */ }

  // ── v2 存档迁移：魔力结晶 → 勇者徽章 ──
  interface SaveV2 {
    records?: SaveData['records'];
    endless?: SaveData['endless'];
    storyCleared?: boolean;
    crystals?: number;
    foodUpgrade?: number;
  }
  try {
    const raw = localStorage.getItem('cat-hero-save-v2');
    if (raw) {
      const parsed = JSON.parse(raw) as SaveV2;
      return merge({
        records: parsed.records ?? base.records,
        endless: parsed.endless ?? base.endless,
        storyCleared: parsed.storyCleared ?? false,
        badges: parsed.crystals ?? base.badges,
        foodUpgrade: parsed.foodUpgrade ?? 0,
      });
    }
  } catch { /* ignore */ }
  return base;
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}
