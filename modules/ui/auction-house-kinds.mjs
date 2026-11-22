/**
 * 경매장 아이템 칸이 매물의 종류(장비, 주얼, 액막이, 부적)마다 다르게 읽는 것: 이름, 부위 칸의 글, 아이템 레벨, 옵션 줄 수와 글, 그림, 자세히 칸의
 * 카드, 종류 단추 줄. 장비 전당의 전시품은 종류가 없어 장비로 읽는다. 주얼과 액막이는 가방이 쓰는 그림과 카드(shopView.itemCardHtml이 가방과
 * 같은 툴팁을 그린다), 부적은 그루터기 함의 이름, 그림, 카드(stumpBoxUi.itemTipHtml)를 쓴다.
 */
import { tr, esc, num, itemName, slotLabel } from './auction-house-format.mjs';

// The defence lines the tooltip writes as 'name: value' (modules/ui/tooltip-items.mjs appendItemBaseStats).
const DEFENCE_LINES = Object.freeze(['armor', 'evasion', 'energyShield']);

/** The lot's kind: 'gear' for a hall show (it has none). */
export function lotKind(lot) { return lot.kind || 'gear'; }

/** The kinds.lots row of a non-gear kind. */
function kindRow(runtime, kind) { return runtime.deps.auctionHouse.rules.kinds.lots.find(row => row.kind === kind) || null; }

/** The lot's shown name: a talisman by the stump box's own label, everything else by the item name rule. */
export function lotName(runtime, lot) {
    return lotKind(lot) === 'talisman' ? runtime.deps.stumpBox.label(lot.item) : itemName(runtime, lot.item);
}

/** The 부위 cell: a piece of gear's slot, the kind's name for the other kinds. */
export function lotSlot(runtime, lot) {
    const kind = lotKind(lot);
    return kind === 'gear' ? slotLabel(runtime, lot.item) : tr(runtime, kindRow(runtime, kind).label);
}

/** The 아이템 Lv. value: a piece of gear's item level, a ward's level, null for a kind without one. */
export function lotLevel(lot) { return lotKind(lot) === 'gear' ? Number(lot.item.itemLevel) || 1 : lot.level ?? null; }

/** The number of option lines (a piece of gear: its explicit lines; the other kinds: the line count the rules counted). */
export function optionCount(lot) {
    if (lotKind(lot) !== 'gear') return Number(lot.lines) || 0;
    return Array.isArray(lot.item.stats) ? lot.item.stats.length : 0;
}

/** The lot's picture: a talisman's stump box icon, otherwise the bag's picture of the item. */
function lotArtSrc(runtime, lot) {
    return lotKind(lot) === 'talisman' ? runtime.deps.stumpBox.iconPath(lot.item) : runtime.deps.getEquipmentGridVisualAsset(lot.item);
}

/** The lot's picture with its rarity colour as --item-rarity. */
export function lotArtHtml(runtime, lot) {
    return `<span class="ah-art" style="--item-rarity:${esc(runtime, runtime.deps.getRarityColor(lot.item.rarity))}"><img src="${esc(runtime, lotArtSrc(runtime, lot))}" alt="" draggable="false"></span>`;
}

/** The shown text of a gear, jewel or ward item's lines as the item tooltip writes them: base lines, explicit lines (a compound line's parts
 * joined by ' / ') and the unique effect. */
function itemLines(runtime, item) {
    const { getStatName, formatValue, formatSignedValue } = runtime.deps, label = stat => tr(runtime, stat.statName || getStatName(stat.id));
    const base = (Array.isArray(item.baseStats) ? item.baseStats : []).filter(Boolean)
        .map(stat => (DEFENCE_LINES.includes(stat.id) ? `${getStatName(stat.id)}: ${Math.floor(Number(stat.val) || 0)}` : `${label(stat)} ${formatSignedValue(stat.id, stat.val)}`));
    const explicit = (Array.isArray(item.stats) ? item.stats : []).filter(Boolean)
        .map(stat => [stat, ...(Array.isArray(stat.extraStats) ? stat.extraStats : [])].map(line => `${label(line)} +${formatValue(line.id, line.val)}`).join(' / '));
    return [...base, ...explicit, ...(item.uniqueEffect ? [tr(runtime, item.uniqueEffect)] : [])];
}

/** The shown text of the lot's lines: a talisman's lines as its card writes them (talismans.describeLine), the item lines otherwise. */
export function lotLines(runtime, lot) {
    if (lotKind(lot) !== 'talisman') return itemLines(runtime, lot.item);
    return (Array.isArray(lot.item.lines) ? lot.item.lines : []).map(line => runtime.deps.talismans.describeLine(line));
}

/** The chosen lot's card: a piece of gear with the comparison against worn gear, a jewel or a ward as the bag shows it, a talisman as the
 * stump box shows a stored one. */
export function lotCardHtml(runtime, lot) {
    const kind = lotKind(lot);
    if (kind === 'gear') return runtime.deps.shopView.itemCardHtml(lot.item);
    if (kind !== 'talisman') return runtime.deps.shopView.itemCardHtml(lot.item, { rating: false });
    return `<div class="shop-tooltip">${runtime.deps.statToneText.markup(runtime.deps.stumpBoxUi.itemTipHtml(lot.item, true))}</div>`;
}

/** The kinds the save can see ('gear' first, then the unlocked ones in the rules' order). */
export function openKinds(runtime) { return runtime.deps.auctionHouse.lotKinds(runtime.deps.game); }

/** The kind chips under the mode switch: 전체 and each open kind with its count (counted: the lots each chip would show). The box is
 * repainted alone with the list (data-ah-kinds). */
export function kindChipsHtml(runtime, counted) {
    return `<div class="ah-kinds" role="group" aria-label="${runtime.deps._t('종류')}" data-ah-kinds>${kindChipsInner(runtime, counted)}</div>`;
}

/** The chips inside the box. */
export function kindChipsInner(runtime, counted) {
    const chosen = runtime.state.gear.kind, labels = { all: '전체', gear: '장비' };
    const chip = kind => {
        const label = labels[kind] || kindRow(runtime, kind).label, count = counted.filter(lot => kind === 'all' || lotKind(lot) === kind).length;
        return `<button type="button" class="ah-group${chosen === kind ? ' is-on' : ''}" data-ah-kind="${esc(runtime, kind)}" aria-pressed="${chosen === kind}">
            <span>${esc(runtime, tr(runtime, label))}</span><small>${num(runtime, count)}</small></button>`;
    };
    return ['all', ...openKinds(runtime)].map(chip).join('');
}
