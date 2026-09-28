// Windows opened from the rail (PC) or bottom tabs (phone): equipment (3×4 paper doll, stats,
// 10×10 grid bag with item footprints, compare tooltip, detail card with crafting) and settings.
// Player input reaches the rules core only through core functions and Settings fields.
import { CLASSES } from '../data/balance.ts';
import { EQUIP_SLOTS, ITEM_SIZE } from '../data/item-bases.ts';
import { CRAFT_HINTS, CURRENCY_NAMES, KIND_NAMES, RARITY_NAMES, itemName, slotName, statText } from '../data/names.ts';
import { defaultSlot, discard, equip, equipUpgrades, itemScore, slotsFor, unequip } from '../core/items.ts';
import { affixStats, itemStats } from '../core/affixes.ts';
import { CRAFT_CURRENCIES, craft, craftBlock, type CraftTarget } from '../core/crafting.ts';
import { stats } from '../core/stats.ts';
import { currencyIconUrl, itemIconUrl } from './icons.ts';
import { toast } from './hud.ts';
import { itemBase } from '../data/item-bases.ts';
import type { StatId } from '../data/affix-types.ts';
import type { CraftCurrency, EquipSlot, GameState, Item, Settings } from '../core/types.ts';

export interface PanelHost {
  state(): GameState;
  /** Called after the player changed the save (equipment, settings). */
  saved(): void;
  /** Start over after the player confirmed. */
  reset(): void;
}

type PanelKind = 'gear' | 'settings' | 'log';
type Selection = CraftTarget | null;
type Placed = { item: Item; x: number; y: number };

let host: PanelHost;
let open: PanelKind | null = null;
let shownKey = '';
let selected: Selection = null;
let page = 0;
let mobileView: 'bag' | 'doll' = 'bag';
/** Highest item id the player has seen in the bag; newer ones light the menu dot. */
let seenItemId = 0;

const el = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const narrow = () => window.matchMedia('(max-width: 760px)').matches;

/** Doll layout, row by row; null cells are gaps. */
const DOLL: (EquipSlot | null)[] = [null, 'helmet', 'amulet', 'weapon', 'armor', 'offhand', 'ring', 'belt', 'ring2', 'gloves', 'boots', null];
const BAG_W = 10, BAG_H = 10;

export const hasUnseenItems = (state: GameState): boolean => state.inventory.some(i => i.id > seenItemId);

const isUpgrade = (state: GameState, item: Item) => itemScore(item) > itemScore(state.equipment[defaultSlot(state, item.slot)]);

/** Base stat, then each option with its tier (T1 weakest … T20 strongest). */
function affixLines(item: Item): string {
  const implicit = itemBase(item.base).implicit;
  const lines = item.affixes.map(a => `<div class="affix"><span class="tier">T${a.tier}</span>${affixStats(a).map(([stat, v]) => esc(statText(stat, v))).join(' · ')}</div>`);
  return `<div class="affix implicit">${esc(statText(implicit.stat, implicit.value))}</div>${lines.join('')}`;
}

function statTotals(item: Item | undefined): Map<StatId, number> {
  const totals = new Map<StatId, number>();
  for (const [stat, v] of item ? itemStats(item) : []) totals.set(stat, (totals.get(stat) ?? 0) + v);
  return totals;
}

/** Per-stat change if `item` replaced `worn`, gains green and losses red. */
function diffHtml(item: Item, worn: Item | undefined): string {
  const mine = statTotals(item), theirs = statTotals(worn);
  const parts = [...new Set([...mine.keys(), ...theirs.keys()])].map(stat => [stat, (mine.get(stat) ?? 0) - (theirs.get(stat) ?? 0)] as const)
    .filter(([, d]) => Math.abs(d) > 1e-9)
    .map(([stat, d]) => `<span class="${d > 0 ? 'up' : 'down'}">${esc(statText(stat, Math.round(d * 100) / 100))}</span>`);
  return parts.join(' · ') || '<span class="muted">변화 없음</span>';
}

/** One button per crafting currency; a blocked one says why on hover and stays disabled. */
function craftHtml(state: GameState, item: Item): string {
  const buttons = CRAFT_CURRENCIES.map(key => {
    const block = craftBlock(state, item, key);
    return `<button type="button" class="craft" data-craft="${key}" ${block ? 'disabled' : ''} title="${esc(`${CURRENCY_NAMES[key]} — ${CRAFT_HINTS[key]}${block ? ` (${block})` : ''}`)}">
      <img src="${currencyIconUrl(key)}" alt=""><span class="n">${state.currencies[key]}</span><span class="sr">${CURRENCY_NAMES[key]}</span></button>`;
  });
  return `<div class="crafts"><span class="label">제작</span>${buttons.join('')}</div>`;
}

function card(item: Item, state: GameState, compareTo?: EquipSlot): string {
  const worn = compareTo ? state.equipment[compareTo] : undefined;
  const cmp = compareTo ? `<div class="cmp">${worn ? `${esc(itemName(worn))} 대신 착용하면` : '빈 칸에 착용하면'}<br>${diffHtml(item, worn)}</div>` : '';
  return `<h4 class="r-${item.rarity}">${esc(itemName(item))}</h4>
    <div class="kind">${RARITY_NAMES[item.rarity]} ${KIND_NAMES[item.slot]} · 아이템 레벨 ${item.itemLevel}</div>${affixLines(item)}${cmp}`;
}

function dollHtml(state: GameState): string {
  return DOLL.map(slot => {
    if (!slot) return '<span class="eslot hole" aria-hidden="true"></span>';
    const item = state.equipment[slot], pressed = selected?.from === 'slot' && selected.slot === slot;
    return `<button type="button" class="eslot ${item ? '' : 'empty'}" data-slot="${slot}" aria-pressed="${pressed}">
      <span class="cap">${slotName(slot, state.classId)}</span>
      <span class="sock">${item ? `<img src="${itemIconUrl(item.base)}" alt="">` : ''}</span>
      <span class="nm ${item ? `r-${item.rarity}` : ''}">${item ? esc(itemName(item)) : '비어 있음'}</span></button>`;
  }).join('');
}

function sheetHtml(state: GameState): string {
  const s = stats(state);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return `<div class="sheet"><span>생명력 <b>${s.maxHp}</b></span><span>피해 <b>${s.damage.toFixed(1)}</b></span><span>공격/초 <b>${s.attacksPerSec.toFixed(2)}</b></span>
    <span>방어도 <b>${s.armor}</b></span><span>치명타 <b>${pct(s.critChance)}</b></span><span>치명 피해 <b>${pct(s.critMulti)}</b></span><span>피해 감소 <b>${pct(s.damageReduction)}</b></span>
    <span>화염 <b>${pct(s.resist.fire)}</b></span><span>냉기 <b>${pct(s.resist.cold)}</b></span><span>번개 <b>${pct(s.resist.light)}</b></span>
    <span>카오스 <b>${pct(s.resist.chaos)}</b></span><span>연속 타격 <b>${pct(s.doubleStrike)}</b></span><span>흡수 <b>${pct(s.leech)}</b></span></div>`;
}

function fits(used: boolean[], x: number, y: number, w: number, h: number): boolean {
  if (x + w > BAG_W || y + h > BAG_H) return false;
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (used[(y + dy) * BAG_W + x + dx]) return false;
  return true;
}

/** First-fit packing of the bag into 10×10 pages; the layout is derived from the list, never saved. */
function packBag(state: GameState): Placed[][] {
  const order = [...state.inventory].sort((a, b) => EQUIP_SLOTS.indexOf(a.slot) - EQUIP_SLOTS.indexOf(b.slot) || itemScore(b) - itemScore(a) || a.id - b.id);
  const pages: { used: boolean[]; items: Placed[] }[] = [];
  for (const item of order) {
    const [w, h] = ITEM_SIZE[item.slot];
    for (let p = 0; ; p++) {
      const target = pages[p] ?? (pages[p] = { used: new Array<boolean>(BAG_W * BAG_H).fill(false), items: [] });
      const at = target.used.findIndex((_, i) => fits(target.used, i % BAG_W, Math.floor(i / BAG_W), w, h));
      if (at < 0) continue;
      const x = at % BAG_W, y = Math.floor(at / BAG_W);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) target.used[(y + dy) * BAG_W + x + dx] = true;
      target.items.push({ item, x, y });
      break;
    }
  }
  return pages.length ? pages.map(p => p.items) : [[]];
}

function bagHtml(state: GameState): string {
  const pages = packBag(state);
  page = Math.min(page, pages.length - 1);
  const upgrades = state.inventory.filter(i => isUpgrade(state, i)).length, worse = state.inventory.length - upgrades;
  const shown = pages[page]!;
  const cells = shown.map(({ item, x, y }) => {
    const [w, h] = ITEM_SIZE[item.slot], pressed = selected?.from === 'bag' && selected.id === item.id;
    return `<button type="button" class="it r-${item.rarity} ${isUpgrade(state, item) ? 'up' : ''}" data-item="${item.id}" aria-pressed="${pressed}" aria-label="${esc(itemName(item))}"
      style="grid-column:${x + 1} / span ${w};grid-row:${y + 1} / span ${h}"><img src="${itemIconUrl(item.base)}" alt=""></button>`;
  }).join('');
  const used = shown.reduce((n, { item }) => n + ITEM_SIZE[item.slot][0] * ITEM_SIZE[item.slot][1], 0);
  const fresh = state.inventory.filter(i => i.id > seenItemId).length;
  return `<div class="bag-head">
      <button type="button" class="k-button" data-act="equip-best" ${upgrades ? '' : 'disabled'}>추천 교체 ${upgrades}</button>
      <button type="button" class="k-button quiet" data-act="discard-worse" ${worse ? '' : 'disabled'}>하위 장비 정리 ${worse}</button>
      <span class="spacer"></span>
      <div class="pages">${pages.map((_, i) => `<button type="button" data-page="${i}" aria-current="${i === page ? 'page' : 'false'}">${i + 1}</button>`).join('')}</div></div>
    <div class="bag">${cells}</div>
    <div class="bag-foot"><span>가방 ${page + 1}쪽 · ${used} / ${BAG_W * BAG_H} 칸</span><span>${fresh ? `새 장비 ${fresh}` : `총 ${state.inventory.length}개`}</span></div>`;
}

function detailHtml(state: GameState): string {
  const sel = selected;
  if (!sel) return '<div class="box detail muted">장비를 누르면 설명과 착용 장비 비교가 나온다. ▲가 붙은 장비가 지금보다 좋다.</div>';
  if (sel.from === 'slot') {
    const item = state.equipment[sel.slot];
    if (!item) return `<div class="box detail muted">${slotName(sel.slot, state.classId)} 칸이 비어 있다.</div>`;
    return `<div class="box detail card">${card(item, state)}${craftHtml(state, item)}<div class="acts"><button type="button" class="k-button" data-act="unequip">해제</button></div></div>`;
  }
  const item = state.inventory.find(i => i.id === sel.id);
  if (!item) return '<div class="box detail muted">그 장비는 더 이상 가방에 없다.</div>';
  const slots = slotsFor(item.slot);
  const buttons = slots.length > 1
    ? slots.map((s, i) => `<button type="button" class="k-button" data-act="equip" data-to="${s}">반지 ${i + 1}에 착용</button>`).join('')
    : `<button type="button" class="k-button primary" data-act="equip" data-to="${slots[0]}">착용</button>`;
  return `<div class="box detail card">${card(item, state, defaultSlot(state, item.slot))}${craftHtml(state, item)}
    <div class="acts">${buttons}<button type="button" class="k-button quiet" data-act="discard">버리기</button></div></div>`;
}

function gearHtml(state: GameState): string {
  return `<div class="seg mobile-only" role="tablist">
      <button type="button" role="tab" data-view="bag" aria-selected="${mobileView === 'bag'}">가방 ${state.inventory.length}</button>
      <button type="button" role="tab" data-view="doll" aria-selected="${mobileView === 'doll'}">착용 장비</button></div>
    <div class="gear" data-view="${mobileView}">
      <div class="gear-doll"><div class="box"><h3>장착</h3><div class="doll">${dollHtml(state)}</div></div>
        <div class="box sheet-box"><h3>능력치</h3>${sheetHtml(state)}</div></div>
      <div class="gear-bag">${bagHtml(state)}${detailHtml(state)}</div></div>`;
}

function choice(name: keyof Settings, options: [string, string][], value: string): string {
  return `<div class="choice" role="group">${options.map(([v, label]) => `<button type="button" class="k-button" data-setting="${name}" data-value="${v}" aria-pressed="${v === value}">${label}</button>`).join('')}</div>`;
}

function settingsHtml(state: GameState): string {
  const st = state.settings;
  return `<div class="setting"><div><b>탐험 방식</b><p>보스 직행은 정예만 쓰러뜨리고 봉인으로, 전체 탐험은 모든 무리를 소탕한다.</p></div>
      ${choice('exploreMode', [['boss', '보스 직행'], ['full', '전체 탐험']], st.exploreMode)}</div>
    <div class="setting"><div><b>액트 정복 후</b><p>다음 액트로 나아가거나, 같은 액트를 반복해 성장한다.</p></div>
      ${choice('autoContinue', [['true', '다음 액트'], ['false', '반복']], String(st.autoContinue))}</div>
    <div class="setting"><div><b>자동 착용</b><p>전리품이 확정될 때 더 좋은 장비를 바로 입는다.</p></div>
      ${choice('autoEquip', [['true', '켜기'], ['false', '끄기']], String(st.autoEquip))}</div>
    <div class="setting"><div><b>처음부터</b><p>${CLASSES[state.classId].name} Lv ${state.level} · 액트 ${state.actsCleared}까지 정복. 되돌릴 수 없다.</p></div>
      <button type="button" class="k-button danger" data-act="reset">새로 시작</button></div>`;
}

const contentKey = (state: GameState) => `${state.inventory.map(i => i.id).join(',')}|${state.buildRevision}|${JSON.stringify(state.settings)}|${JSON.stringify(state.currencies)}`;

function render(): void {
  if (open !== 'gear' && open !== 'settings') return;
  const state = host.state();
  el('drawer-title').textContent = open === 'gear' ? '장비 및 인벤토리' : '설정';
  el('drawer-body').innerHTML = open === 'gear' ? gearHtml(state) : settingsHtml(state);
  if (open === 'gear') seenItemId = Math.max(seenItemId, ...state.inventory.map(i => i.id));
  shownKey = contentKey(state);
}

function setSetting(state: GameState, name: string, value: string): void {
  if (name === 'exploreMode' && (value === 'boss' || value === 'full')) state.settings.exploreMode = value;
  else if (name === 'autoContinue' || name === 'autoEquip') state.settings[name] = value === 'true';
  else throw new Error(`panels: unknown setting ${name}=${value}`);
}

/** Apply one button press to the save. Returns false when it was not a save-changing action. */
function act(state: GameState, data: DOMStringMap): boolean {
  const sel = selected;
  if (data.setting && data.value) setSetting(state, data.setting, data.value);
  else if (data.craft && sel && (CRAFT_CURRENCIES as readonly string[]).includes(data.craft)) {
    const result = craft(state, sel, data.craft as CraftCurrency);
    if (!result.ok) toast(result.reason);
  } else if (data.act === 'equip' && sel?.from === 'bag') {
    if (!equip(state, sel.id, data.to as EquipSlot)) toast('그 장비는 이 칸에 맞지 않는다');
    selected = null;
  } else if (data.act === 'unequip' && sel?.from === 'slot') unequip(state, sel.slot);
  else if (data.act === 'discard' && sel?.from === 'bag') {
    discard(state, [sel.id]);
    selected = null;
  } else if (data.act === 'equip-best') toast(`${equipUpgrades(state).length}개를 착용했다`, 'gold');
  else if (data.act === 'discard-worse') {
    toast(`${discard(state, state.inventory.filter(i => !isUpgrade(state, i)).map(i => i.id))}개를 정리했다`);
    selected = null;
  } else return false;
  return true;
}

function onClick(event: MouseEvent): void {
  const target = (event.target as HTMLElement).closest('button');
  if (!target) return;
  const state = host.state(), data = target.dataset;
  if (data.act === 'reset') {
    if (window.confirm('지금까지의 진행을 모두 지우고 처음부터 시작할까요?')) host.reset();
    return;
  }
  if (data.item) selected = { from: 'bag', id: Number(data.item) };
  else if (data.slot) selected = { from: 'slot', slot: data.slot as EquipSlot };
  else if (data.page) page = Number(data.page);
  else if (data.view) mobileView = data.view as typeof mobileView;
  else if (act(state, data)) host.saved();
  hideTip();
  render();
}

function hideTip(): void {
  el('tip').hidden = true;
}

/** Hover card for bag items and worn slots (mouse only; touch uses the detail card). */
function onHover(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return;
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-item], [data-slot]');
  const state = host.state();
  const bagItem = button?.dataset.item ? state.inventory.find(i => i.id === Number(button.dataset.item)) : undefined;
  const worn = button?.dataset.slot ? state.equipment[button.dataset.slot as EquipSlot] : undefined;
  const html = bagItem ? card(bagItem, state, defaultSlot(state, bagItem.slot)) : worn ? card(worn, state) : '';
  if (!html) return hideTip();
  const tip = el('tip');
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = `${Math.min(event.clientX + 16, window.innerWidth - tip.offsetWidth - 8)}px`;
  tip.style.top = `${Math.min(event.clientY + 12, window.innerHeight - tip.offsetHeight - 8)}px`;
}

function markCurrent(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) {
    if ((b.dataset.panel || null) === open) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
}

export function openPanel(kind: PanelKind | null): void {
  open = open === kind ? null : kind;
  selected = null;
  hideTip();
  el('drawer').hidden = open !== 'gear' && open !== 'settings';
  // The log is always on screen on desktop; "전투 기록" unfolds it, and on phones expands it.
  el('log').classList.toggle('open', open === 'log');
  if (open === 'log' && !narrow()) el('log').classList.remove('folded');
  markCurrent();
  render();
}

/** Re-render the open window when the save changed underneath it (loot settled, auto-equip). */
export function refreshPanel(): void {
  if ((open === 'gear' || open === 'settings') && contentKey(host.state()) !== shownKey) render();
}

export function initPanels(h: PanelHost): void {
  host = h;
  el('drawer-body').addEventListener('click', onClick);
  el('drawer-body').addEventListener('pointermove', onHover);
  el('drawer-body').addEventListener('pointerleave', hideTip);
  el('drawer-close').addEventListener('click', () => openPanel(null));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) {
    b.addEventListener('click', () => openPanel((b.dataset.panel || null) as PanelKind | null));
  }
  document.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();
    if (key === 'escape') openPanel(null);
    else if (key === 'i') openPanel('gear');
    else if (key === 'o') openPanel('settings');
    else if (key === 'l') openPanel('log');
  });
  markCurrent();
}
