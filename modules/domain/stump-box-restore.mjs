import { stumpYieldKind, stumpNeed, stumpLegacyKind, stumpClampRoll, stumpIsMature } from './stump-box-item-values.mjs';
import { stumpGraftMaxRank, stumpSealLimit, stumpRollCeiling } from './stump-box-unlocks.mjs';
import { stumpGraftEarned, stumpGraftCost } from './stump-box-graft.mjs';
import { stumpEnforceAlbinoLimit } from './stump-box-growth.mjs';
import { stumpRecordHarvest } from './stump-box-harvest-records.mjs';
import { stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpInvalidatePlacementUndo, stumpEmpty } from './stump-box-state.mjs';
import { stumpSync } from './stump-box-starter.mjs';

// ── 저장 경계 ───────────────────────────────────────────
export function stumpValidItem(env, raw) {
    const colored = raw && (env.FAMILIES.includes(raw.family) || raw.family === 'sap') && env.COLORS.includes(raw.color);
    const known = raw && (raw.family === 'talisman' || raw.family === 'scar' || colored);
    return known && Number.isSafeInteger(raw.id) && raw.id > 0;
}

/** A scar: growth, known absorbed stats within their caps, meal counts. */
export function stumpCleanScar(env, raw) {
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.scar, Math.max(0, Math.floor(Number(raw.xp) || 0))), absorbed = {};
    Object.entries(raw.absorbed && typeof raw.absorbed === 'object' ? raw.absorbed : {}).forEach(([stat, value]) => {
        if (env.SCAR_CAPS[stat] && Number(value) > 0) absorbed[stat] = Math.round(Math.min(env.SCAR_CAPS[stat], Number(value)) * 100) / 100;
    });
    const count = value => Math.max(0, Math.floor(Number(value) || 0));
    return { id: raw.id, family: 'scar', color: null, path: null, xp, ripe: xp >= env.deps.STUMP_BOX_GROWTH.need.scar, roll: 1, absorbed,
        meals: count(raw.meals), misses: count(raw.misses) };
}

/** A grown seed's ripening roll: the bumper bonus, golden, and up to three different lines from its kind's pool. */
export function stumpCleanHarvest(env, raw, item) {
    if (!item.ripe || !raw || typeof raw !== 'object') return undefined;
    const pool = (env.deps.STUMP_BOX_EXTRA_LINES[stumpYieldKind(item)] || {})[item.color] || [], seen = new Set(), span = env.deps.STUMP_BOX_RIPENING.lineValue;
    const lines = (Array.isArray(raw.lines) ? raw.lines : []).map(line => ({ line, row: pool.find(row => line && row.stat === line.stat) }))
        .filter(({ line, row }) => row && Number(line.value) > 0 && !seen.has(row.stat) && seen.add(row.stat)).slice(0, 3)
        .map(({ line, row }) => ({ stat: row.stat, value: Math.round(Math.min(row.value * span.max, Number(line.value)) * 100) / 100 }));
    return { bonus: raw.bonus === env.deps.STUMP_BOX_RIPENING.bumper.quality ? raw.bonus : 0, golden: raw.golden === true, lines };
}

export function stumpCleanTalisman(env, raw) {
    const fields = env.deps.talismans.normalizeTalisman(raw);
    if (!fields) return null;
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.talisman, Math.max(0, Math.floor(Number(raw.xp) || 0)));
    return { id: raw.id, family: 'talisman', color: null, path: null, xp, ripe: xp >= env.deps.STUMP_BOX_GROWTH.need.talisman, roll: 1, ...fields };
}

/** Born marks a seed keeps: golden and ancient (12번 루프 42). */
export function stumpCleanMarks(env, raw, item) {
    if (raw.golden === true) item.golden = true;
    if (raw.ancient === true && raw.family === 'seed') item.ancient = true;
    if (raw.albino === true) {
        item.albino = true;
        item.xp = stumpNeed(env, item);
        item.ripe = true;
    }
}

/** cap: the most the save could have made (rollCeiling), so a restored roll never tops what it could have been made at. */
/** A saved item read back, keeping its lock (toggleLock). An old sap is read as the seed or root it became (legacySap). */
export function stumpCleanItem(env, raw, cap) {
    const item = stumpCleanItemFields(env, raw.family === 'sap' ? stumpLegacySap(env, raw) : raw, cap);
    if (item && raw.locked === true) item.locked = true;
    if (item && Number.isInteger(raw.slot) && raw.slot >= 0) item.slot = raw.slot;
    return item;
}

export function stumpCleanItemFields(env, raw, cap) {
    if (raw.family === 'talisman') return stumpCleanTalisman(env, raw);
    if (raw.family === 'scar') return stumpCleanScar(env, raw);
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.seed, Math.max(0, Math.floor(Number(raw.xp) || 0)));
    const ripe = xp >= env.deps.STUMP_BOX_GROWTH.need.seed;
    // 자라는 씨앗은 무엇이 될지 모른다(옛 저장에 정해 둔 꽃, 열매는 지운다). 종류 없이 저장된 다 자란 씨앗은 id로 정한다.
    const path = ripe ? (env.KINDS.includes(raw.path) ? raw.path : stumpLegacyKind(env, raw.id)) : null;
    const item = { id: raw.id, family: 'seed', color: raw.color, path, xp, ripe, roll: stumpClampRoll(env, raw.roll, cap) };
    stumpCleanMarks(env, raw, item);
    const harvest = stumpCleanHarvest(env, raw.harvest, item);
    if (harvest) item.harvest = harvest;
    return item;
}

/** 옛 수액(2026-11-04에 없앴다, 사용자 결정): 자라던 것은 같은 색 씨앗(품질은 남고 성장은 처음부터), 다 자란 호박석은 같은 색 뿌리
 * (다 자란 채, 추가 줄과 알비노도 그대로: 뿌리의 줄은 호박석의 줄이다). */
export function stumpLegacySap(env, raw) {
    const ripe = raw.ripe === true || Number(raw.xp) >= env.deps.STUMP_BOX_GROWTH.legacySapNeed;
    return { ...raw, family: 'seed', xp: ripe ? env.deps.STUMP_BOX_GROWTH.need.seed : 0, path: ripe ? 'root' : null };
}

/** A grown item living in a gear socket, in today's shape: an old 호박석 becomes its colour's 뿌리 with its quality and lines
 * (js/equipment-sockets.js migrateHarvest). Anything else passes through. */
export function stumpCurrentSocketItem(env, raw) {
    if (!raw || typeof raw !== 'object' || raw.family !== 'sap' || !env.COLORS.includes(raw.color)) return raw;
    return stumpCleanItem(env, stumpLegacySap(env, raw), Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.max, Number(raw.roll) || 0));
}

/** Whole ranks 0..graftMaxRank on every cell, never spending more than the reached loops earned (the highest ranks give way). */
export function stumpRestoreGraft(env, raw, state) {
    const source = Array.isArray(raw) ? raw : [], max = stumpGraftMaxRank(env, state);
    const ranks = Array.from({ length: env.CELLS }, (_, cell) => Math.min(max, Math.max(0, Math.floor(Number(source[cell]) || 0))));
    let over = ranks.reduce((sum, rank) => sum + stumpGraftCost(rank), 0) - stumpGraftEarned(env, state);
    while (over > 0) {
        const cell = ranks.lastIndexOf(Math.max(...ranks));
        over -= ranks[cell];
        ranks[cell] -= 1;
    }
    return ranks;
}

/** A version-1 box (growth needs before 2026-10-09, STUMP_BOX_GROWTH.v1Need): growing items keep their share of the way,
 * grown ones stay grown at the new need. A later box's items pass through. */
export function stumpUpgradeGrowth(env, raw) {
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (Number(raw.version) >= 2) return items;
    return items.map(item => {
        const old = item && env.deps.STUMP_BOX_GROWTH.v1Need[item.family], now = item && env.deps.STUMP_BOX_GROWTH.need[item.family], xp = Number(item && item.xp) || 0;
        return old ? { ...item, xp: item.ripe === true || xp >= old ? now : Math.floor(xp * now / old) } : item;
    });
}

/** Known ids onto target's cells, each id once across the board and the nursery. */
export function stumpRestoreCells(env, list, target, seen, used) {
    (Array.isArray(list) ? list : []).slice(0, env.CELLS).forEach((id, cell) => {
        if (seen.has(id) && !used.has(id)) { used.add(id); target[cell] = id; }
    });
}

export function stumpRestoreItems(env, raw, box, cap) {
    const seen = new Set();
    stumpUpgradeGrowth(env, raw).filter((...args) => stumpValidItem(env, ...args)).forEach(item => {
        const clean = seen.has(item.id) ? null : stumpCleanItem(env, item, cap);
        if (clean) { seen.add(clean.id); box.items.push(clean); }
    });
    const used = new Set();
    stumpRestoreCells(env, raw.board, box.board, seen, used);
    stumpRestoreCells(env, raw.nursery, box.nursery, seen, used);
    stumpEnforceAlbinoLimit(box);
}

/** An old journal or wallet key in today's words: 호박석 became 뿌리 (2026-11-04). */
export function stumpCurrentKey(key) { return String(key).replace(/^amber(?=-|$)/, 'root'); }

/** Known journal keys only, plus whatever is grown right now (saves from before the journal); gift receipts stay. A box before
 * version 3 keeps the rows it filled with four colours as filled (their unlocks and gifts stay), later boxes keep their list. */
export function stumpRestoreHarvest(env, raw, box, version) {
    const source = raw && typeof raw === 'object' ? raw : {}, grown = new Set((Array.isArray(source.grown) ? source.grown : []).map(stumpCurrentKey));
    const gifts = Object.fromEntries(Object.entries(source.gifts && typeof source.gifts === 'object' ? source.gifts : {}).map(([row, taken]) => [stumpCurrentKey(row), taken]));
    box.harvest.grown = env.HARVEST_KEYS.filter(key => grown.has(key));
    const kept = Number(version) >= 3 ? new Set(Array.isArray(source.legacyRows) ? source.legacyRows : [])
        : new Set(env.HARVEST_ROWS.filter(row => env.OLD_COLORS.every(color => grown.has(`${row}-${color}`))));
    box.harvest.legacyRows = env.HARVEST_ROWS.filter(row => kept.has(row));
    env.HARVEST_ROWS.forEach(row => { box.harvest.gifts[row] = gifts[row] === true; });
    stumpRecordHarvest(env, box, box.items.filter(stumpIsMature));
}

/** Known stacks with whole positive counts (an old 호박석 stack is counted into its colour's 뿌리). */
export function stumpRestoreWallet(env, raw) {
    const out = {};
    Object.entries(raw && typeof raw === 'object' ? raw : {}).forEach(([stack, value]) => {
        const key = stumpCurrentKey(stack), count = Math.floor(Number(value));
        if (env.HARVEST_KEYS.includes(key) && Number.isFinite(count) && count > 0) out[key] = (out[key] || 0) + count;
    });
    return out;
}

/** Sealed cells: distinct open cells, no more than the unlocks allow (the last ones give way). */
export function stumpRestoreSealed(env, raw, state) {
    const cells = (Array.isArray(raw) ? raw : []).filter(cell => Number.isInteger(cell) && stumpIsOpen(env, state, cell));
    return [...new Set(cells)].slice(0, stumpSealLimit(env, state));
}

/** Pouch receipts (known pouch rows) and offers waiting to be chosen (valid seed specs only). */
export function stumpRestorePouches(env, raw) {
    const rows = new Set(env.deps.STUMP_BOX_UNLOCKS.filter(row => row.pouch).map(row => row.id)), source = raw && typeof raw === 'object' ? raw : {};
    const opened = [...new Set((Array.isArray(source.opened) ? source.opened : []).filter(id => rows.has(id)))], offers = {};
    Object.entries(source.offers && typeof source.offers === 'object' ? source.offers : {}).forEach(([id, list]) => {
        const valid = Array.isArray(list) ? list.filter(spec => spec && spec.family === 'seed' && env.COLORS.includes(spec.color)) : [];
        if (rows.has(id) && !opened.includes(id) && valid.length) offers[id] = valid.map(spec => ({ family: 'seed', color: spec.color, roll: stumpClampRoll(env, spec.roll) }));
    });
    return { opened, offers };
}

/** Known codex ids in their table order, plus every unique talisman held now (saves from before the codex). */
export function stumpRestoreCodex(env, raw, box) {
    const held = box.items.filter(item => item.family === 'talisman').map(item => item.uniqueId);
    const known = new Set((Array.isArray(raw) ? raw : []).concat(held));
    return env.CODEX_IDS.filter(id => known.has(id));
}

/** Save boundary (idempotent; mergeDefaults runs it on every load, cloud apply and replay commit): repairs the box,
 * then grants it to saves that already cleared act 10 or reached loop 2. The repaired box is in place first, because
 * the unlocks (seal cells, graft ranks) read its journal. */
export function stumpRestore(env, state) {
    stumpInvalidatePlacementUndo(env, state);
    const raw = state.stumpBox, box = stumpEmpty(env);
    state.stumpBox = box;
    if (raw && typeof raw === 'object') {
        box.acquired = raw.acquired === true;
        box.via = typeof raw.via === 'string' ? raw.via : null;
        // 둘째 시작 씨앗의 영수증은 옛 저장에서 수액의 것이었다(2026-11-04)
        box.starter = { seed: !!(raw.starter && raw.starter.seed), second: !!(raw.starter && (raw.starter.second || raw.starter.sap)) };
        stumpRestoreItems(env, raw, box, stumpRollCeiling(env, state));
        box.nextId = Math.max(Number.isSafeInteger(raw.nextId) ? raw.nextId : 1, ...box.items.map(item => item.id + 1), 1);
        stumpRestoreHarvest(env, raw.harvest, box, raw.version);
        box.codex = stumpRestoreCodex(env, raw.codex, box);
        box.pouches = stumpRestorePouches(env, raw.pouches);
        box.graft = stumpRestoreGraft(env, raw.graft, state);
        box.sealed = stumpRestoreSealed(env, raw.sealed, state);
        box.scarGift = raw.scarGift === true;
        box.wallet = stumpRestoreWallet(env, raw.wallet);
    }
    stumpSync(env, state, 'migration');
    return box;
}
