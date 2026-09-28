// Drawer panels: equipment (compare, equip, discard) and settings. Player input enters the rules
// core only through core functions (equip, discard, equipUpgrades) and Settings fields.
import { CLASSES } from '../data/balance.ts';
import { RARITY_NAMES, SLOT_NAMES, affixText, itemName } from '../data/names.ts';
import { discard, equip, equipUpgrades, itemScore } from '../core/items.ts';
import { stats } from '../core/stats.ts';
import { itemIconUrl } from './art.ts';
import { toast } from './hud.ts';
import type { AffixStat, GameState, Item, Settings, Slot } from '../core/types.ts';

export interface PanelHost {
  state(): GameState;
  /** Called after the player changed the save (equipment, settings). */
  saved(): void;
  /** Start over after the player confirmed. */
  reset(): void;
}

type PanelKind = 'gear' | 'settings';
let host: PanelHost;
let open: PanelKind | null = null;
let shownKey = '';

const el = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const SLOTS: readonly Slot[] = ['weapon', 'armor', 'ring'];

function affixLines(item: Item): string {
  return item.affixes.map(a => `<div class="affix">${affixText(a.stat, a.value)}</div>`).join('');
}

/** Per-stat change if `item` replaced what its slot holds, as HTML: gains green, losses red. */
function statDiff(item: Item, worn: Item | undefined): { html: string; up: boolean } {
  const total = (i: Item | undefined, stat: AffixStat) => i?.affixes.filter(a => a.stat === stat).reduce((s, a) => s + a.value, 0) ?? 0;
  const stats = [...new Set([...item.affixes, ...(worn?.affixes ?? [])].map(a => a.stat))];
  const parts = stats.map(stat => [stat, total(item, stat) - total(worn, stat)] as const).filter(([, d]) => d !== 0)
    .map(([stat, d]) => `<span class="delta ${d > 0 ? 'up' : 'down'}">${esc(affixText(stat, Math.abs(d)).replace('+', d > 0 ? '+' : '-'))}</span>`);
  return { html: parts.join(' · ') || '변화 없음', up: itemScore(item) > itemScore(worn) };
}

function itemCard(item: Item, state: GameState): string {
  const worn = state.equipment[item.slot], diff = statDiff(item, worn);
  return `<div class="item ${diff.up ? 'upgrade' : ''}">
    <img src="${itemIconUrl(item.slot, state.classId)}" alt="">
    <div><div class="name r-${item.rarity}">${esc(itemName(item, state.classId))}</div>
      <div class="affix">${RARITY_NAMES[item.rarity]} ${SLOT_NAMES[item.slot]} · 아이템 레벨 ${item.itemLevel}</div>
      ${affixLines(item)}<div class="delta">${diff.up ? '▲ 더 좋음' : '▼ 착용 중이 나음'} · ${diff.html}</div></div>
    <div class="actions"><button type="button" class="btn small" data-equip="${item.id}">장착</button>
      <button type="button" class="btn small quiet" data-discard="${item.id}">버리기</button></div></div>`;
}

function gearHtml(state: GameState): string {
  const s = stats(state);
  const slots = SLOTS.map(slot => {
    const item = state.equipment[slot];
    if (!item) return `<div class="slot empty"><div class="kind">${SLOT_NAMES[slot]}</div>비어 있음</div>`;
    return `<div class="slot"><div class="kind">${SLOT_NAMES[slot]}</div><img src="${itemIconUrl(slot, state.classId)}" alt="">
      <div class="name r-${item.rarity}">${esc(itemName(item, state.classId))}</div>${affixLines(item)}</div>`;
  }).join('');
  const bag = [...state.inventory].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || itemScore(b) - itemScore(a));
  const worse = bag.filter(i => itemScore(i) <= itemScore(state.equipment[i.slot])).length;
  const upgrades = bag.length - worse;
  const shown = bag.slice(0, 60);
  return `<section><h3 class="section-title">착용 중</h3><div class="slots">${slots}</div></section>
    <section><h3 class="section-title">능력치</h3><div class="stats">
      <span>생명력 <b>${s.maxHp}</b></span><span>피해 <b>${s.damage.toFixed(1)}</b></span><span>공격/초 <b>${s.attacksPerSec.toFixed(2)}</b></span>
      <span>방어도 <b>${s.armor}</b></span><span>사거리 <b>${s.range}</b></span><span>레벨 <b>${state.level}</b></span></div></section>
    <section><h3 class="section-title">가방 ${bag.length}</h3>
      <div class="bag-tools"><button type="button" class="btn" data-act="equip-best" ${upgrades ? '' : 'disabled'}>더 좋은 장비 모두 착용 (${upgrades})</button>
        <button type="button" class="btn quiet" data-act="discard-worse" ${worse ? '' : 'disabled'}>하위 장비 정리 (${worse})</button></div>
      <div class="items">${shown.map(i => itemCard(i, state)).join('') || '<p class="empty-note">보스를 쓰러뜨리면 전리품이 이곳에 들어온다.</p>'}</div>
      ${bag.length > shown.length ? `<p class="empty-note">외 ${bag.length - shown.length}개</p>` : ''}</section>`;
}

function choice(name: keyof Settings, options: [string, string][], value: string): string {
  return `<div class="choice" role="group">${options.map(([v, label]) => `<button type="button" data-setting="${name}" data-value="${v}" aria-pressed="${v === value}">${label}</button>`).join('')}</div>`;
}

function settingsHtml(state: GameState): string {
  const st = state.settings;
  return `<div class="setting"><div><b>탐험 방식</b><p>보스 직행은 정예만 쓰러뜨리고 봉인으로, 전체 탐험은 모든 무리를 소탕한다.</p></div>
      ${choice('exploreMode', [['boss', '보스 직행'], ['full', '전체 탐험']], st.exploreMode)}</div>
    <div class="setting"><div><b>막 정복 후</b><p>다음 막으로 나아가거나, 같은 막을 반복해 성장한다.</p></div>
      ${choice('autoContinue', [['true', '다음 막'], ['false', '반복']], String(st.autoContinue))}</div>
    <div class="setting"><div><b>자동 착용</b><p>전리품이 확정될 때 더 좋은 장비를 바로 입는다.</p></div>
      ${choice('autoEquip', [['true', '켜기'], ['false', '끄기']], String(st.autoEquip))}</div>
    <div class="setting"><div><b>처음부터</b><p>${CLASSES[state.classId].name} Lv ${state.level} · ${state.actsCleared}막까지 정복. 되돌릴 수 없다.</p></div>
      <button type="button" class="btn danger" data-act="reset">새로 시작</button></div>`;
}

function render(): void {
  if (!open) return;
  const state = host.state();
  el('drawer-title').textContent = open === 'gear' ? '장비' : '설정';
  el('drawer-body').innerHTML = open === 'gear' ? gearHtml(state) : settingsHtml(state);
  shownKey = contentKey(state);
}

const contentKey = (state: GameState) => `${state.inventory.length}|${state.buildRevision}|${JSON.stringify(state.settings)}`;

function setSetting(state: GameState, name: string, value: string): void {
  if (name === 'exploreMode' && (value === 'boss' || value === 'full')) state.settings.exploreMode = value;
  else if (name === 'autoContinue' || name === 'autoEquip') state.settings[name] = value === 'true';
  else throw new Error(`panels: unknown setting ${name}=${value}`);
}

function onClick(event: MouseEvent): void {
  const target = (event.target as HTMLElement).closest('button');
  if (!target) return;
  const state = host.state(), data = target.dataset;
  if (data.equip) {
    if (!equip(state, Number(data.equip))) toast('그 장비는 이미 가방에 없다');
  } else if (data.discard) {
    discard(state, [Number(data.discard)]);
  } else if (data.setting && data.value) {
    setSetting(state, data.setting, data.value);
  } else if (data.act === 'equip-best') {
    toast(`${equipUpgrades(state).length}개를 착용했다`, 'gold');
  } else if (data.act === 'discard-worse') {
    const worse = state.inventory.filter(i => itemScore(i) <= itemScore(state.equipment[i.slot])).map(i => i.id);
    toast(`${discard(state, worse)}개를 정리했다`);
  } else if (data.act === 'reset') {
    if (window.confirm('지금까지의 진행을 모두 지우고 처음부터 시작할까요?')) host.reset();
    return;
  } else {
    return;
  }
  host.saved();
  render();
}

export function openPanel(kind: PanelKind | null): void {
  open = open === kind ? null : kind;
  el('drawer').hidden = open === null;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) b.setAttribute('aria-expanded', String(b.dataset.panel === open));
  render();
}

/** Re-render the open panel when the save changed underneath it (loot settled, auto-equip). */
export function refreshPanel(): void {
  if (open && contentKey(host.state()) !== shownKey) render();
}

export function initPanels(h: PanelHost): void {
  host = h;
  el('drawer-body').addEventListener('click', onClick);
  el('drawer-close').addEventListener('click', () => openPanel(null));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-panel]')) {
    b.addEventListener('click', () => openPanel(b.dataset.panel as PanelKind));
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') openPanel(null);
    else if ((e.key === 'i' || e.key === 'I') && !(e.target instanceof HTMLInputElement)) openPanel('gear');
  });
}
