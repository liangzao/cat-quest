// ── 音效与音乐管理（懒加载，首次交互后解锁播放）──
const cache: Record<string, HTMLAudioElement> = {};
let muted = false;
let bgmStarted = false;

function get(name: string): HTMLAudioElement {
  if (!cache[name]) {
    cache[name] = new Audio(`/assets/${name}`);
    cache[name].preload = 'auto';
  }
  return cache[name];
}

export function setMuted(m: boolean) {
  muted = m;
  Object.values(cache).forEach((a) => { a.muted = m; });
  try { localStorage.setItem('cat-hero-muted', m ? '1' : '0'); } catch { /* ignore */ }
}

export function isMuted() {
  return muted;
}

export function restoreMute() {
  try { muted = localStorage.getItem('cat-hero-muted') === '1'; } catch { /* ignore */ }
}

export function playBgm() {
  if (bgmStarted) return;
  bgmStarted = true;
  const a = get('bgm.mp3');
  a.loop = true;
  a.volume = 0.45;
  a.muted = muted;
  a.play().catch(() => { bgmStarted = false; });
}

export function playSfx(name: 'hit' | 'win' | 'gacha' | 'click') {
  const a = get(`${name}.mp3`);
  a.muted = muted;
  a.currentTime = 0;
  a.play().catch(() => { /* 未交互前静默失败 */ });
}
