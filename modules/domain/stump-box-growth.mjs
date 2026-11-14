import { stumpIsMature, stumpGrows, stumpYieldKind, stumpNeed, stumpGrowKind } from './stump-box-item-values.mjs';
import { stumpEvaluate } from './stump-box-stats.mjs';
import { stumpPlacedItems } from './stump-box-board-items.mjs';
import { stumpOf, stumpFindItem, stumpInvalidatePlacementUndo } from './stump-box-state.mjs';
import { stumpWornAlbinoId } from './stump-box-placement.mjs';
import { stumpNurseryRate } from './stump-box-unlocks.mjs';
import { stumpRecordHarvest } from './stump-box-harvest-records.mjs';

// ── 성장·드랍 ───────────────────────────────────────────
export function stumpKillKind(enemy) { return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal'; }

export function stumpIsGrowing(env, item, suppressed) { return !suppressed.has(item.id) && !stumpIsMature(item) && stumpGrows(env, item); }

/** Placed, unsuppressed, unripe items (seeds, sleeping talismans and scars): what a kill or compost feeds. */
export function stumpGrowingItems(env, state) {
    const suppressed = stumpEvaluate(env, state).suppressed;
    return stumpPlacedItems(stumpOf(env, state)).filter(item => stumpIsGrowing(env, item, suppressed));
}

/** [none, 1, 2, 3 extra lines] odds at this quality: straight lines between STUMP_BOX_RIPENING.lineOdds rows. */
export function stumpLineOdds(env, quality) {
    const rows = env.deps.STUMP_BOX_RIPENING.lineOdds, upper = rows.findIndex(row => row.roll >= quality);
    if (upper <= 0) return rows[upper < 0 ? rows.length - 1 : 0].odds;
    const low = rows[upper - 1], high = rows[upper], t = (quality - low.roll) / (high.roll - low.roll);
    return low.odds.map((odd, index) => odd + (high.odds[index] - odd) * t);
}

export function stumpPickCount(odds, random) {
    let roll = random();
    for (let count = 0; count < odds.length; count++) {
        roll -= odds[count];
        if (roll < 0) return count;
    }
    return 0;
}

/** A place in the pool by the lines' weights (1 unless a line says otherwise). */
export function stumpPickLineAt(left, random) {
    let roll = random() * left.reduce((sum, line) => sum + (line.weight || 1), 0);
    const at = left.findIndex(line => (roll -= line.weight || 1) < 0);
    return at < 0 ? left.length - 1 : at;
}

/** `count` different lines from the item's pool (STUMP_BOX_EXTRA_LINES), each at a rolled share of its base value. */
export function stumpRollLines(env, item, count, random) {
    const left = ((env.deps.STUMP_BOX_EXTRA_LINES[stumpYieldKind(item)] || {})[item.color] || []).slice(), lines = [];
    while (lines.length < count && left.length) {
        const line = left.splice(stumpPickLineAt(left, random), 1)[0], span = line.span || env.deps.STUMP_BOX_RIPENING.lineValue;
        lines.push({ stat: line.stat, value: Math.round(line.value * (span.min + random() * (span.max - span.min)) * 100) / 100 });
    }
    return lines;
}

/** A seed ripening: 풍작 (quality bonus), 황금 and its extra lines from its kind's pool, kept until a new loop sends it back. */
export function stumpRipen(env, item, random) {
    if (!env.FAMILIES.includes(item.family)) return;
    const bonus = random() < env.deps.STUMP_BOX_RIPENING.bumper.chance ? env.deps.STUMP_BOX_RIPENING.bumper.quality : 0;
    const golden = random() < env.deps.STUMP_BOX_RIPENING.golden.chance;
    item.harvest = { bonus, golden, lines: stumpRollLines(env, item, stumpPickCount(stumpLineOdds(env, item.roll + bonus), random), random) };
    if (random() < env.deps.STUMP_BOX_RIPENING.albino.chance) item.albino = true;
}

/** Preserve surplus albinos in storage, even when full; applies to simultaneous blooms and save repair. */
export function stumpEnforceAlbinoLimit(box, wornId = null) {
    let kept = wornId !== null;
    box.board.forEach((id, cell) => {
        if (id === wornId || !stumpFindItem(box, id)?.albino) return;
        if (kept) box.board[cell] = null;
        kept = true;
    });
}

/** One item gains `amount` (a nursery share may be a fraction); ripening rolls it and adds it to `ripened`. */
export function stumpGrowItem(env, item, amount, random, ripened) {
    item.xp = Math.min(stumpNeed(env, item), Math.round((item.xp + amount) * 100) / 100);
    if (item.xp < stumpNeed(env, item)) return;
    item.ripe = true;
    if (env.FAMILIES.includes(item.family)) item.path = stumpGrowKind(env, random);
    stumpRipen(env, item, random);
    ripened.push(item);
}

/** Nursery items still growing (nothing suppresses them). */
export function stumpNurseryGrowing(env, state) {
    const box = stumpOf(env, state);
    return box.nursery.filter(id => id !== null).map(id => stumpFindItem(box, id)).filter(item => item && !stumpIsMature(item) && stumpGrows(env, item));
}

/** Grows every growing item by `amount`, the nursery by its share, and writes first harvests into the journal. @returns {object[]} items that ripened. */
export function stumpGrowBy(env, state, amount, random = Math.random) {
    const ripened = [];
    const wornId = stumpWornAlbinoId(env, state);
    stumpGrowingItems(env, state).forEach(item => stumpGrowItem(env, item, amount, random, ripened));
    const share = amount * stumpNurseryRate(env, state);
    stumpNurseryGrowing(env, state).forEach(item => stumpGrowItem(env, item, share, random, ripened));
    if (ripened.some(item => item.albino)) {
        stumpEnforceAlbinoLimit(stumpOf(env, state), wornId);
        stumpInvalidatePlacementUndo(env, state);
    }
    stumpRecordHarvest(env, stumpOf(env, state), ripened);
    return ripened;
}

/** Grows placed, unsuppressed, unripe items by one kill. @returns {object[]} items that ripened. */
export function stumpGrow(env, state, enemy) { return stumpGrowBy(env, state, env.deps.STUMP_BOX_GROWTH.perKill[stumpKillKind(enemy)]); }
