// DOM heads-up display after UI mockup v9: act header, exploration gauge, target nameplate, round
// minimap, objectives with the loot pouch, combat log, HP orb, class plate, wallet and EXP gauge.
// Reads state and scene; player actions go through panels.ts.
import { CLASSES, expToNext } from '../data/balance.ts';
import { actText } from '../data/acts.ts';
import { CURRENCY_NAMES, KIND_NAMES, RARITY_NAMES, itemName } from '../data/names.ts';
import { actMap, tileIndex } from '../core/map.ts';
import { stats } from '../core/stats.ts';
import { currencyIconUrl, itemIconUrl } from './icons.ts';
import type { Art } from './art.ts';
import { actorName, type Announcement, type LogEntry, type Scene } from './scene.ts';
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
  logFilter: 'all' | 'fight' | 'loot';
}

export function createHud(): Hud {
  const hud: Hud = { root: $('hud'), keys: {}, minimapAt: -Infinity, logFilter: 'all' };
  for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-log]')) {
    tab.addEventListener('click', () => {
      hud.logFilter = tab.dataset.log as Hud['logFilter'];
      for (const t of document.querySelectorAll('[data-log]')) t.setAttribute('aria-selected', String(t === tab));
      hud.keys.log = '';
    });
  }
  // Desktop folds the always-visible log; phones unfold the one-line log instead.
  $('log-fold').addEventListener('click', () => {
    const phone = window.matchMedia('(max-width: 760px)').matches, log = $('log');
    const expanded = phone ? log.classList.toggle('open') : !log.classList.toggle('folded');
    $('log-fold').textContent = expanded ? '–' : '+';
    $('log-fold').setAttribute('aria-expanded', String(expanded));
  });
  if (window.matchMedia('(max-width: 760px)').matches) $('log-fold').textContent = '+';
  return hud;
}

function changed(hud: Hud, key: string, value: string): boolean {
  if (hud.keys[key] === value) return false;
  hud.keys[key] = value;
  return true;
}

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

function coinSocket(key: CurrencyKey, amount: number): string {
  return `<span class="socket" title="${CURRENCY_NAMES[key]}"><img src="${currencyIconUrl(key)}" alt=""><span class="n">${fmt(amount)}</span></span>`;
}

function renderHero(state: GameState): void {
  const s = stats(state), need = expToNext(state.level), ratio = Math.max(0, state.hp) / s.maxHp;
  $('hero-level').textContent = String(state.level);
  $('hero-class').textContent = CLASSES[state.classId].name;
  $('hp-fill').style.height = `${ratio * 100}%`;
  $('hp-text').textContent = `${Math.ceil(Math.max(0, state.hp))} / ${s.maxHp}`;
  $('hp-orb').classList.toggle('low', ratio < 0.3 && state.hp > 0);
  $('exp-fill').style.width = `${(state.exp / need) * 100}%`;
  $('exp-text').textContent = `EXP ${((state.exp / need) * 100).toFixed(1)}%`;
}

function renderAct(hud: Hud, state: GameState): void {
  const run = state.run!, map = actMap(run.act), text = actText(run.act);
  let floor = 0, seen = 0;
  map.tiles.forEach((t, i) => { if (t === 1) { floor++; seen += run.fog[i]!; } });
  $('explore-fill').style.width = `${(seen / floor) * 100}%`;
  $('explore-text').textContent = `탐험 ${Math.round((seen / floor) * 100)}%`;
  const normals = run.enemies.filter(e => e.kind === 'normal').length, elites = run.enemies.filter(e => e.kind === 'elite').length;
  $('act-count').textContent = `몬스터 ${normals} · 정예 ${elites}`;
  const elitePacks = run.packs.filter(p => p.role === 'elite'), elitesDown = elitePacks.filter(p => p.alive === 0).length;
  const packsLeft = run.packs.filter(p => p.alive > 0 && p.role !== 'boss').length;
  const key = [run.act, elitesDown, run.gateOpen, run.status, state.settings.exploreMode, packsLeft].join('|');
  if (!changed(hud, 'act', key)) return;
  $('act-no').textContent = `액트 ${run.act}`;
  $('act-title').textContent = text.title;
  const steps: [string, string, boolean][] = [
    [`액트 ${run.act} 정예 처치`, `${elitesDown}/${elitePacks.length}`, elitesDown === elitePacks.length],
    ['보스 봉인 해제', run.gateOpen ? '1/1' : '0/1', run.gateOpen],
    [`${text.boss} 처치`, run.status === 'cleared' ? '1/1' : '0/1', run.status === 'cleared']
  ];
  if (state.settings.exploreMode === 'full') steps.unshift(['모든 무리 소탕', `${run.packs.length - 1 - packsLeft}/${run.packs.length - 1}`, packsLeft === 0]);
  const now = steps.findIndex(([, , done]) => !done);
  $('objective').innerHTML = steps.map(([label, n, done], i) => `<li class="${done ? 'done' : i === now ? 'now' : ''}"><span>${esc(label)}</span><span class="n">${n}</span></li>`).join('');
}

function renderTarget(state: GameState, scene: Scene): void {
  const actors = [...scene.actors.values()];
  const boss = actors.find(a => a.kind === 'boss' && a.active && (a.diedAt === null || scene.time - a.diedAt < 800));
  const last = scene.targetId === null ? undefined : scene.actors.get(scene.targetId);
  const target = boss ?? (last && (last.diedAt === null || scene.time - last.diedAt < 600) ? last : undefined);
  $('target').hidden = !target;
  if (!target) return;
  $('target-name').textContent = actorName(scene, target);
  const tag = $('target-tag');
  tag.textContent = target.kind === 'boss' ? '보스' : target.kind === 'elite' ? '정예' : `Lv.${state.run!.act * 3}`;
  tag.className = target.kind === 'normal' ? '' : target.kind;
  $('target-fill').style.width = `${(Math.max(0, target.hp) / target.maxHp) * 100}%`;
  $('target-text').textContent = `${fmt(Math.max(0, target.hp))} / ${fmt(target.maxHp)}`;
}

function lootCount(loot: TempLoot): number {
  return Object.values(loot.currencies).reduce((a, b) => a + (b ?? 0), 0) + loot.items.length;
}

function renderPouch(hud: Hud, state: GameState): void {
  const loot = state.run!.loot, key = JSON.stringify(loot.currencies) + loot.items.map(i => i.id).join(',');
  if (!changed(hud, 'pouch', key)) return;
  const coins = (Object.entries(loot.currencies) as [CurrencyKey, number][]).map(([k, n]) => `<li>${coinSocket(k, n)}</li>`);
  const items = loot.items.map(item => `<li><span class="socket r-${item.rarity}" title="${esc(`${RARITY_NAMES[item.rarity]} ${KIND_NAMES[item.slot]} · ${itemName(item)}`)}"><img src="${itemIconUrl(item.base)}" alt=""></span></li>`);
  $('pouch-list').innerHTML = [...items, ...coins].join('') || '<li class="empty">아직 비어 있다</li>';
  $('pouch-count').textContent = lootCount(loot) ? String(lootCount(loot)) : '';
  const pouch = $('pouch');
  pouch.classList.remove('pulse');
  void pouch.offsetWidth;
  if (lootCount(loot) > 0) pouch.classList.add('pulse');
}

function renderWallet(hud: Hud, state: GameState): void {
  const keys: CurrencyKey[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore', 'bossCore'];
  if (!changed(hud, 'wallet', keys.map(k => state.currencies[k]).join('|'))) return;
  $('wallet').innerHTML = keys.map(k => coinSocket(k, state.currencies[k])).join('');
}

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function renderLog(hud: Hud, scene: Scene): void {
  const due = scene.log.filter(e => e.at <= scene.time);
  const recent = due.filter(e => scene.time - e.at < 10_000);
  const sum = (tone: LogEntry['tone']) => recent.filter(e => e.tone === tone).reduce((a, e) => a + (e.value ?? 0), 0);
  $('dealt').textContent = fmt(sum('hit'));
  $('taken').textContent = fmt(sum('taken'));
  const shown = due.filter(e => hud.logFilter === 'all' || e.cat === hud.logFilter).slice(-14);
  if (!changed(hud, 'log', `${hud.logFilter}|${shown.length}|${shown.at(-1)?.at ?? 0}|${due.length}`)) return;
  $('log-lines').innerHTML = shown.map(e =>
    `<li class="${e.tone}"><time>${clock(e.at)}</time><span>${esc(e.text)}</span><span class="v">${e.value === null ? '' : Math.max(1, Math.round(e.value))}</span></li>`).join('');
}

/** Round minimap centred on the hero: explored floor, rooms brighter, the gate, packs and the hero. */
function renderMinimap(hud: Hud, state: GameState, scene: Scene): void {
  if (scene.time - hud.minimapAt < 200 && hud.minimapAt <= scene.time) return;
  hud.minimapAt = scene.time;
  const run = state.run!, map = actMap(run.act), canvas = $<HTMLCanvasElement>('minimap'), ctx = canvas.getContext('2d')!;
  const cell = 4, cx = canvas.width / 2 - (run.player.x + 0.5) * cell, cy = canvas.height / 2 - (run.player.y + 0.5) * cell;
  ctx.fillStyle = '#070a08';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.columns; x++) {
    const i = tileIndex(map, { x, y });
    if (!run.fog[i] || map.tiles[i] !== 1) continue;
    ctx.fillStyle = map.rooms.some(r => Math.abs(x - r.x) <= r.radiusX && Math.abs(y - r.y) <= r.radiusY) ? '#8a7650' : '#5c4e36';
    ctx.fillRect(cx + x * cell, cy + y * cell, cell, cell);
  }
  const dot = (x: number, y: number, color: string, size: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx + (x + 0.5) * cell - size / 2, cy + (y + 0.5) * cell - size / 2, size, size);
  };
  for (const e of run.enemies) if (run.fog[tileIndex(map, e)]) dot(e.x, e.y, e.kind === 'boss' ? '#ff4a3a' : e.kind === 'elite' ? '#ffc04a' : '#b5553f', e.kind === 'normal' ? 3 : 6);
  if (run.fog[tileIndex(map, map.gate)]) dot(map.gate.x, map.gate.y, run.gateOpen ? '#6f6048' : '#f3d493', 6);
  dot(run.player.x, run.player.y, '#7ff0ff', 6);
}

function renderNotices(unseen: boolean): void {
  $('gear-noti').hidden = !unseen;
  $('gear-noti-m').hidden = !unseen;
}

/** Refresh everything that follows the state. Cheap when nothing changed. */
/** @param unseenItems whether the bag holds items the player has not looked at yet. */
export function updateHud(hud: Hud, state: GameState, scene: Scene, unseenItems: boolean): void {
  renderHero(state);
  renderAct(hud, state);
  renderTarget(state, scene);
  renderPouch(hud, state);
  renderWallet(hud, state);
  renderLog(hud, scene);
  renderMinimap(hud, state, scene);
  renderNotices(unseenItems);
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
  el.innerHTML = `<div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2><div class="rule"></div><p>${esc(body)}</p>${extra ? `<div class="loot">${esc(extra)}</div>` : ''}`;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

/** Show what the scene announced this frame. */
export function announce(a: Announcement): void {
  switch (a.kind) {
    case 'act': {
      const t = actText(a.act);
      return banner('', `액트 ${a.act}`, t.title, t.subtitle);
    }
    case 'boss': return banner('boss', '보스 출현', actText(a.act).boss, '');
    case 'gate': return toast('봉인이 풀렸다 — 보스에게 가는 길이 열렸다', 'gold');
    case 'levelUp': return toast(`레벨 ${a.level} 달성!`, 'gold');
    case 'cleared': {
      const t = actText(a.act);
      return banner('', `액트 ${a.act} 정복`, `${t.boss} 처치`, t.clearText, lootLine(a.loot) ? `획득: ${lootLine(a.loot)}` : '');
    }
    case 'died': {
      const lost = lootLine(a.lost);
      return banner('dead', '쓰러졌다', '다시 일어선다', '같은 액트를 처음부터 다시 탐험한다.', lost ? `잃은 전리품: ${lost}` : '');
    }
    case 'equipped': return toast(`더 좋은 장비 ${a.count}개를 착용했다`, 'gold');
    case 'rareDrop': return toast(`희귀 ${KIND_NAMES[a.item.slot]} — ${itemName(a.item)}`, 'rare');
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
