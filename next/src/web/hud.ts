// DOM heads-up display: hero bars, act objective, boss bar, loot pouch, wallet, minimap, banners
// and toasts. Reads state and scene announcements; player actions go through panels.ts.
import { expToNext } from '../data/balance.ts';
import { actText } from '../data/acts.ts';
import { CLASSES } from '../data/balance.ts';
import { CURRENCY_NAMES, RARITY_NAMES, SLOT_NAMES, itemName } from '../data/names.ts';
import { actMap, tileIndex } from '../core/map.ts';
import { stats } from '../core/stats.ts';
import { currencyIconUrl, type Art } from './art.ts';
import type { Announcement, Scene } from './scene.ts';
import type { CurrencyKey, GameState, TempLoot } from '../core/types.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`hud: #${id} missing from index.html`);
  return el as T;
};

export interface Hud {
  root: HTMLElement;
  /** Last rendered keys, so unchanged parts are not rebuilt every frame. */
  keys: Record<string, string>;
  minimapAt: number;
}

export function createHud(): Hud {
  return { root: $('hud'), keys: {}, minimapAt: 0 };
}

/** Rebuild an element only when its content key changed. */
function changed(hud: Hud, key: string, value: string): boolean {
  if (hud.keys[key] === value) return false;
  hud.keys[key] = value;
  return true;
}

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(Math.floor(n)));

function coinHtml(key: CurrencyKey, amount: number, withLabel: boolean): string {
  const url = currencyIconUrl(key);
  const icon = url ? `<img src="${url}" alt="">` : `<i class="core" aria-hidden="true"></i>`;
  return `${icon}${withLabel ? `<span class="label">${CURRENCY_NAMES[key]}</span>` : ''}<span class="n">×${fmt(amount)}</span>`;
}

function renderHero(hud: Hud, state: GameState): void {
  const s = stats(state), need = expToNext(state.level);
  $('hero-level').textContent = String(state.level);
  $('hero-class').textContent = CLASSES[state.classId].name;
  const hpRatio = Math.max(0, state.hp) / s.maxHp;
  $('hp-fill').style.width = `${hpRatio * 100}%`;
  $('hp-text').textContent = `${Math.ceil(Math.max(0, state.hp))} / ${s.maxHp}`;
  $('hp-meter').classList.toggle('low', hpRatio < 0.3 && state.hp > 0);
  $('hp-meter').setAttribute('aria-valuenow', String(Math.round(hpRatio * 100)));
  $('exp-fill').style.width = `${(state.exp / need) * 100}%`;
  $('exp-meter').setAttribute('aria-valuenow', String(Math.round((state.exp / need) * 100)));
}

function renderAct(hud: Hud, state: GameState): void {
  const run = state.run!, text = actText(run.act);
  const elites = run.packs.filter(p => p.role === 'elite'), elitesDown = elites.filter(p => p.alive === 0).length;
  const bossDown = run.status === 'cleared';
  const packsLeft = run.packs.filter(p => p.alive > 0 && p.role !== 'boss').length;
  const key = [run.act, elitesDown, run.gateOpen, bossDown, state.settings.exploreMode, packsLeft].join('|');
  if (!changed(hud, 'act', key)) return;
  $('act-no').textContent = `${run.act}막`;
  $('act-title').textContent = text.title;
  const steps: [string, boolean][] = [
    [`정예 무리 ${elitesDown}/${elites.length}`, elitesDown === elites.length],
    ['봉인 해제', run.gateOpen],
    [text.boss, bossDown]
  ];
  if (state.settings.exploreMode === 'full') steps.unshift([`남은 무리 ${packsLeft}`, packsLeft === 0]);
  const now = steps.findIndex(([, done]) => !done);
  $('objective').innerHTML = steps.map(([label, done], i) => `<li class="${done ? 'done' : i === now ? 'now' : ''}">${label}</li>`).join('');
}

function renderBoss(hud: Hud, state: GameState, scene: Scene): void {
  const boss = [...scene.actors.values()].find(a => a.kind === 'boss');
  const show = !!boss && boss.active && (boss.diedAt === null || scene.time - boss.diedAt < 800);
  $('bossbar').hidden = !show;
  if (!show || !boss) return;
  if (changed(hud, 'boss', String(state.run!.act))) $('boss-name').textContent = actText(state.run!.act).boss;
  $('boss-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
}

function lootCount(loot: TempLoot): number {
  return Object.values(loot.currencies).reduce((a, b) => a + (b ?? 0), 0) + loot.items.length;
}

function renderPouch(hud: Hud, state: GameState): void {
  const loot = state.run!.loot, key = JSON.stringify(loot.currencies) + loot.items.length;
  if (!changed(hud, 'pouch', key)) return;
  const rows = (Object.entries(loot.currencies) as [CurrencyKey, number][]).map(([k, n]) => `<li>${coinHtml(k, n, true)}</li>`);
  const byRarity = { rare: 0, magic: 0, normal: 0 };
  for (const item of loot.items) byRarity[item.rarity]++;
  for (const rarity of ['rare', 'magic', 'normal'] as const) {
    if (byRarity[rarity]) rows.push(`<li class="r-${rarity}"><span class="dot"></span><span class="label">${RARITY_NAMES[rarity]} 장비</span><span class="n">×${byRarity[rarity]}</span></li>`);
  }
  $('pouch-list').innerHTML = rows.join('') || '<li class="empty">아직 비어 있다</li>';
  $('pouch-count').textContent = lootCount(loot) ? String(lootCount(loot)) : '';
  const pouch = $('pouch');
  pouch.classList.remove('pulse');
  void pouch.offsetWidth;
  if (lootCount(loot) > 0) pouch.classList.add('pulse');
}

function renderWallet(hud: Hud, state: GameState): void {
  const keys: CurrencyKey[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore', 'bossCore'];
  if (!changed(hud, 'wallet', keys.map(k => state.currencies[k]).join('|') + state.inventory.length)) return;
  $('wallet').innerHTML = keys.map(k => `<span class="coin" title="${CURRENCY_NAMES[k]}">${coinHtml(k, state.currencies[k], false)}</span>`).join('');
  const bag = $('bag-count');
  bag.hidden = state.inventory.length === 0;
  bag.textContent = String(state.inventory.length);
}

function renderMinimap(hud: Hud, state: GameState, scene: Scene): void {
  if (scene.time - hud.minimapAt < 200 && hud.minimapAt <= scene.time) return;
  hud.minimapAt = scene.time;
  const run = state.run!, map = actMap(run.act), canvas = $<HTMLCanvasElement>('minimap');
  const ctx = canvas.getContext('2d')!, cell = Math.max(1, Math.floor(Math.min(canvas.width / map.columns, canvas.height / map.rows)));
  const ox = Math.floor((canvas.width - cell * map.columns) / 2), oy = Math.floor((canvas.height - cell * map.rows) / 2);
  ctx.fillStyle = '#080604';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    const i = tileIndex(map, { x, y });
    if (!run.fog[i] || map.tiles[i] !== 1) continue;
    ctx.fillStyle = '#5c4a32';
    ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
  }
  const dot = (x: number, y: number, color: string, size = cell + 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * cell + cell / 2 - size / 2, oy + y * cell + cell / 2 - size / 2, size, size);
  };
  for (const e of run.enemies) if (run.fog[tileIndex(map, e)]) dot(e.x, e.y, e.kind === 'boss' ? '#ff4a3a' : e.kind === 'elite' ? '#ffc04a' : '#b5553f', e.kind === 'normal' ? cell : cell + 2);
  if (run.fog[tileIndex(map, map.gate)]) dot(map.gate.x, map.gate.y, run.gateOpen ? '#6f6048' : '#f3d493', cell + 2);
  const blink = Math.floor(scene.time / 300) % 2 === 0;
  dot(run.player.x, run.player.y, blink ? '#ffffff' : '#9cc4ff', cell + 2);
}

/** Refresh everything that follows the state. Cheap when nothing changed. */
export function updateHud(hud: Hud, state: GameState, scene: Scene): void {
  renderHero(hud, state);
  renderAct(hud, state);
  renderBoss(hud, state, scene);
  renderPouch(hud, state);
  renderWallet(hud, state);
  renderMinimap(hud, state, scene);
}

export function toast(text: string, tone: '' | 'gold' | 'rare' = ''): void {
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.textContent = text;
  $('toasts').append(el);
  setTimeout(() => el.remove(), 2700);
}

function lootLine(loot: TempLoot): string {
  const parts = (Object.entries(loot.currencies) as [CurrencyKey, number][]).map(([k, n]) => `${CURRENCY_NAMES[k]} ${n}`);
  if (loot.items.length) parts.push(`장비 ${loot.items.length}개`);
  return parts.join(' · ');
}

function banner(kind: string, kicker: string, title: string, body: string, extra = ''): void {
  const el = $('banner');
  el.hidden = false;
  el.className = `banner ${kind}`;
  const safe = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  el.innerHTML = `<div class="kicker">${safe(kicker)}</div><h2>${safe(title)}</h2><div class="rule"></div><p>${safe(body)}</p>${extra ? `<div class="loot">${safe(extra)}</div>` : ''}`;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

/** Show what the scene announced this frame. */
export function announce(a: Announcement, state: GameState): void {
  switch (a.kind) {
    case 'act': {
      const t = actText(a.act);
      return banner('', `${a.act}막`, t.title, t.subtitle);
    }
    case 'boss': return banner('boss', '보스 출현', actText(a.act).boss, '');
    case 'gate': return toast('봉인이 풀렸다 — 보스에게 가는 길이 열렸다', 'gold');
    case 'levelUp': return toast(`레벨 ${a.level} 달성!`, 'gold');
    case 'cleared': {
      const t = actText(a.act);
      return banner('', `${a.act}막 정복`, t.boss + ' 처치', t.clearText, lootLine(a.loot) ? `획득: ${lootLine(a.loot)}` : '');
    }
    case 'died': {
      const lost = lootLine(a.lost);
      return banner('dead', '쓰러졌다', '다시 일어선다', '같은 막을 처음부터 다시 탐험한다.', lost ? `잃은 전리품: ${lost}` : '');
    }
    case 'equipped': return toast(`더 좋은 장비 ${a.count}개를 착용했다`, 'gold');
    case 'rareDrop': return toast(`희귀 ${SLOT_NAMES[a.item.slot]} — ${itemName(a.item, state.classId)}`, 'rare');
  }
}

/**
 * Idle frame of the class for the portrait and the class cards; a plain silhouette without the kit.
 * @param source square crop inside the 79px cell: x, y, size (art pixels).
 */
export function drawIdle(canvas: HTMLCanvasElement, art: Pick<Art, 'character'>, time: number, source: [number, number, number]): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const character = art.character;
  if (!character) {
    ctx.fillStyle = '#d9ac6b';
    ctx.fillRect(canvas.width * 0.4, canvas.height * 0.35, canvas.width * 0.2, canvas.height * 0.5);
    return;
  }
  const m = character.sheet.motions.idle, cell = character.sheet.cell;
  const total = m.frameMs.reduce((a, b) => a + b, 0);
  let t = time % total, frame = 0;
  while (frame < m.frames - 1 && t >= m.frameMs[frame]!) t -= m.frameMs[frame++]!;
  const [sx, sy, size] = source;
  ctx.drawImage(character.motions.idle, frame * cell + sx, sy, size, size, 0, 0, canvas.width, canvas.height);
}
