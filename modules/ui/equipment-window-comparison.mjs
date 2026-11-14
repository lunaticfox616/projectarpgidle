import { pretty, slotName } from './equipment-window-actions.mjs';

/** Stats with `item` in `slot`, by the comparison tooltip's own swap (js/ui.js buildSlotPanel). @returns [before, after]
* @param {object} before the stats now, read once for all of one item's slots (fillDeltas) */
export function swapStats(runtime, item, slot, before) {
    const equipment = runtime.deps.game.equipment, had = Object.prototype.hasOwnProperty.call(equipment, slot), backup = equipment[slot];
    const twins = Array.isArray(runtime.deps.game.cosmosTwinKeystones) ? runtime.deps.game.cosmosTwinKeystones.slice() : runtime.deps.game.cosmosTwinKeystones;
    try {
        equipment[slot] = item;
        return [before, (0, runtime.deps.getUiPlayerStats)({}, false)];
    } finally {
        if (had) equipment[slot] = backup;
        else delete equipment[slot];
        runtime.deps.game.cosmosTwinKeystones = twins;
    }
}

/** The change of a stat from a by d. DPS는 앞뒤 값이 이미 길어서 증감은 비율만 적는다(좁은 칸에서 "-473,651 (-24.7%)"가 네 줄로 꺾였다). */
export function deltaText(runtime, key, a, d) {
    const sign = d > 0 ? '+' : '-';
    return key === 'dps' && a > 0 ? `${sign}${Math.abs(100 * d / a).toFixed(1)}%` : `${sign}${pretty(runtime, runtime.deps.COMPARE_STAT_META[key].format(Math.abs(d)))}`;
}

export function deltaRow(runtime, key, a, b, rest) {
    const meta = runtime.deps.COMPARE_STAT_META[key], d = b - a;
    return `<div class="eqw-dl ${d > 0 ? 'up' : 'down'}${rest ? ' is-rest' : ''}">${deltaLabel(runtime, key)}<b>${pretty(runtime, meta.format(a))}</b><i>→</i>`
        + `<b>${pretty(runtime, meta.format(b))}</b><em>${deltaText(runtime, key, a, d)}</em></div>`;
}

/** One stat across the sides of a two-slot item: the value now, then each side's value after the swap with its change, - where that
* side leaves the stat alone. */
export function multiDeltaRow(runtime, key, now, sides, rest) {
    const meta = runtime.deps.COMPARE_STAT_META[key], a = Number(now[key]) || 0;
    const cells = sides.map(side => {
        const d = (Number(side.after[key]) || 0) - a;
        if (Math.abs(d) < 0.001) return '<span class="eqw-dl-side is-same">-</span>';
        return `<span class="eqw-dl-side ${d > 0 ? 'up' : 'down'}"><b>${pretty(runtime, meta.format(a + d))}</b><em>${deltaText(runtime, key, a, d)}</em></span>`;
    }).join('');
    return `<div class="eqw-dl eqw-dl-multi${rest ? ' is-rest' : ''}">${deltaLabel(runtime, key)}<b>${pretty(runtime, meta.format(a))}</b>${cells}</div>`;
}

/** A side's ward and unique effect changes, under the side's name. */
export function sideNotes(runtime, item, slot) {
    const notes = wardRows(runtime, item, slot) + uniqueRows(runtime, item, runtime.deps.game.equipment[slot]);
    return notes ? `<div class="eqw-dl-side-name">${(0, runtime.deps.escapeHTML)(slotName(runtime, slot))}</div>${notes}` : '';
}

/** The card of a two-slot item: a head row (지금, then each side's name) and a row per stat any side changes. */
export function multiDeltaHtml(runtime, item, slots, now) {
    const sides = slots.map(slot => ({ slot, after: swapStats(runtime, item, slot, now)[1] }));
    const keys = Object.keys(runtime.deps.COMPARE_STAT_META).filter(key => sides.some(side => Math.abs((Number(side.after[key]) || 0) - (Number(now[key]) || 0)) >= 0.001));
    const rest = keys.filter(key => !runtime.state.DELTA_TINT[key]), fold = rest.length < keys.length ? rest : [];
    const head = `<div class="eqw-dl eqw-dl-multi eqw-dl-cols"><span></span><b>${(0, runtime.deps._t)('지금')}</b>${sides.map(side => `<b>${(0, runtime.deps.escapeHTML)(slotName(runtime, side.slot))}</b>`).join('')}</div>`;
    const rows = keys.map(key => multiDeltaRow(runtime, key, now, sides, fold.includes(key))).join('');
    return ((rows ? head + rows + restButton(runtime, fold.length) : '') + sides.map(side => sideNotes(runtime, item, side.slot)).join('')) || '<p class="eqw-none">능력치 변화 없음</p>';
}

/** The card's body for its slots (data-eqw-slot, commas between the sides of a two-slot item). */
export function slotsDeltaHtml(runtime, item, slotsKey, now) {
    const slots = slotsKey.split(',');
    return slots.length > 1 ? multiDeltaHtml(runtime, item, slots, now) : deltaHtml(runtime, item, slots[0], now);
}

export function uniqueRows(runtime, item, worn) {
    if ((worn && worn.uniqueEffect) === item.uniqueEffect) return '';
    const gain = item.uniqueEffect ? `<div class="eqw-dl-note is-gain">${(0, runtime.deps._t)('획득: {uniqueEffect}', { uniqueEffect: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect)) })}</div>` : '';
    return gain + (worn && worn.uniqueEffect ? `<div class="eqw-dl-note is-loss">${(0, runtime.deps._t)('상실: {uniqueEffect}', { uniqueEffect: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(worn.uniqueEffect)) })}</div>` : '');
}

/** 허리띠를 바꾸면 달라지는 액막이 칸 한 줄(2026-10-11, 허리띠마다 1~3칸이라): 칸 수 변화만(사용자: "액막이 칸수 변화만 보여줘"). */
export function wardRows(runtime, item, slot) {
    const change = runtime.deps.colonyWards.slotChange(item, slot);
    if (!change) return '';
    return `<div class="eqw-dl-note ${change.to > change.from ? 'is-gain' : 'is-loss'}">${(0, runtime.deps._t)('액막이 칸 {from} → {to}', { from: change.from, to: change.to })}</div>`;
}

/** 휴대폰의 바꾸면 표는 요약에 있는 능력치(DPS, 생명력, 보호막, 방어, 저항)만 먼저 보인다. 표가 열다섯 줄까지 길어져 그 아래 고른 장비의
* 옵션이 밀렸다(2026-10-11). 나머지 줄은 이 단추로 편다(css/equipment-window.css .eqw-dl-more, PC에서는 단추 없이 다 보인다). */
export function restButton(runtime, count) {
    return count ? `<button type="button" class="eqw-dl-more" data-rest="${count}" onclick="equipmentWindowUi.toggleDeltas(this)">${(0, runtime.deps._t)('나머지 변화 {count}줄 보기', { count })}</button>` : '';
}

export function toggleDeltas(runtime, button) {
    const open = button.closest('.eqw-dl-body').classList.toggle('is-open');
    button.textContent = open ? (0, runtime.deps._t)('접기') : (0, runtime.deps._t)('나머지 변화 {rest}줄 보기', { rest: button.dataset.rest });
    runtime.deps.equipmentInventoryInteraction.positionInspector();
}

export function deltaHtml(runtime, item, slot, now) {
    const [before, after] = swapStats(runtime, item, slot, now);
    const keys = Object.keys(runtime.deps.COMPARE_STAT_META).filter(key => Math.abs((Number(after[key]) || 0) - (Number(before[key]) || 0)) >= 0.001);
    const rest = keys.filter(key => !runtime.state.DELTA_TINT[key]);
    const fold = rest.length < keys.length ? rest : []; // 요약 능력치가 하나도 안 바뀌면 접지 않는다
    const rows = keys.map(key => deltaRow(runtime, key, Number(before[key]) || 0, Number(after[key]) || 0, fold.includes(key))).join('');
    return (rows + restButton(runtime, fold.length) + wardRows(runtime, item, slot) + uniqueRows(runtime, item, runtime.deps.game.equipment[slot])) || '<p class="eqw-none">능력치 변화 없음</p>';
}

/** A short key for the long gear signature (FNV-1a). */
export function hashKey(runtime, text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
}

/** Fills the panel's 바꾸면 tables right after the panel's first frame; the same item and gear (signature) reuse the last result.
* It waited for an idle moment before (up to 200 ms of "계산 중" while the fight kept the browser busy, 2026-11-07). */
export function fillDeltas(runtime, root, item, signature) {
    if (!runtime.active) return;
    cancelDeltaJob(runtime, runtime.state.deltaJobs.get(root));
    const tables = [...root.querySelectorAll('.eqw-deltas[data-eqw-slot]')];
    if (!tables.length) return;
    const owner = runtime.deps.game;
    if (runtime.state.deltaOwner !== owner) runtime.state.deltaCache.clear();
    runtime.state.deltaOwner = owner;
    const job = { root, frame: 0, timer: 0 };
    runtime.state.deltaJobs.set(root, job);
    runtime.state.pendingDeltas.add(job);
    const sig = hashKey(runtime, String(signature));
    let now = null; // the stats before the swap, once for every slot of the item (a ring tries three)
    const fill = table => {
        if (!table.isConnected) return;
        const key = `${sig}|${table.dataset.eqwSlot}`;
        if (!runtime.state.deltaCache.has(key)) runtime.state.deltaCache.set(key, slotsDeltaHtml(runtime, item, table.dataset.eqwSlot, now || (now = (0, runtime.deps.getUiPlayerStats)({}, false))));
        const body = table.querySelector('.eqw-dl-body');
        const focused = body.contains(runtime.deps.document.activeElement);
        body.innerHTML = runtime.state.deltaCache.get(key);
        const more = body.querySelector('.eqw-dl-more');
        if (more && body.classList.contains('is-open')) more.textContent = (0, runtime.deps._t)('접기');
        if (focused) more?.focus({ preventScroll: true });
    };
    const run = () => {
        const current = runtime.state.deltaJobs.get(root) === job;
        cancelDeltaJob(runtime, job);
        if (!runtime.active || !current || runtime.deps.game !== owner) return;
        tables.forEach(fill);
        runtime.deps.equipmentInventoryInteraction.positionInspector(); // the taller floating panel finds its place again
    };
    if (runtime.state.deltaCache.size > 24) runtime.state.deltaCache.clear();
    job.frame = runtime.deps.requestAnimationFrame(() => {
        job.frame = 0;
        job.timer = runtime.deps.setTimeout(run, 0);
    });
}

export function cancelDeltaJob(runtime, job) {
    if (!job) return;
    runtime.deps.cancelAnimationFrame(job.frame);
    runtime.deps.clearTimeout(job.timer);
    if (runtime.state.deltaJobs.get(job.root) === job) runtime.state.deltaJobs.delete(job.root);
    runtime.state.pendingDeltas.delete(job);
}

export function deltaLabel(runtime, key) {
    const tint = runtime.state.COLOR[runtime.state.DELTA_TINT[key]];
    return `<span${tint ? ` style="color:${tint}"` : ''}>${(0, runtime.deps._t)(runtime.deps.COMPARE_STAT_META[key].label)}</span>`;
}
