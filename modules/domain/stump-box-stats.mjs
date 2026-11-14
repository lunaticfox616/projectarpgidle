import { stumpOf } from './stump-box-state.mjs';
import { stumpSignature, stumpPlacedCells } from './stump-box-board-items.mjs';
import { stumpBoardEffects, stumpSynergyMul } from './stump-box-synergy.mjs';
import { stumpIsMature, stumpYieldOf, stumpItemValue, stumpLineValues, stumpAddLines, stumpScarValues, stumpQualityOf, stumpGoldenMul, stumpAlbinoLines } from './stump-box-item-values.mjs';
import { stumpGraftMultiplier } from './stump-box-graft-values.mjs';

/** The board's 오행 and synergies (boardEffects), grown working items per colour (counts) and stat totals. */
export function stumpEvaluate(env, state) {
    const box = stumpOf(env, state), key = stumpSignature(box);
    if (env.memo.key === key && env.memo.box === box) return env.memo.value;
    const effects = stumpBoardEffects(env, box), counts = Object.fromEntries(env.COLORS.map(color => [color, 0]));
    const grown = stumpPlacedCells(box).filter(({ item }) => stumpIsMature(item) && stumpYieldOf(env, item) && !effects.suppressed.has(item.id));
    grown.forEach(({ item }) => { counts[item.color]++; });
    const stats = {}, values = {}, extras = {};
    for (const { item, cell } of grown) {
        const boardMul = stumpSynergyMul(env, effects, item) * stumpGraftMultiplier(env, box, cell);
        values[item.id] = stumpItemValue(env, item, boardMul);
        extras[item.id] = stumpLineValues(env, item, boardMul);
        stumpAddLines(stats, [{ stat: stumpYieldOf(env, item).stat, value: values[item.id] }].concat(extras[item.id]));
    }
    stumpPlacedCells(box).filter(({ item }) => item.family === 'scar' && stumpIsMature(item)).forEach(({ item, cell }) => {
        extras[item.id] = stumpScarValues(item, stumpGraftMultiplier(env, box, cell));
        stumpAddLines(stats, extras[item.id]);
    });
    const value = { ...effects, counts, stats, values, extras };
    env.memo = { key, box, value };
    return value;
}

/** An item's extra lines now: the board's values (evaluate's extras) when placed and working, otherwise a grown seed's or
 * ripening lines at its quality and golden, or what a scar absorbed. */
export function stumpExtraLinesOf(env, item, result) {
    if (result.extras[item.id]) return result.extras[item.id];
    if (item.family === 'scar') return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value }));
    const scale = stumpQualityOf(item) * stumpGoldenMul(env, item), lines = stumpIsMature(item) && item.harvest ? item.harvest.lines : [];
    return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(stumpAlbinoLines(env, item));
}

/** Adds the box's grown, unsuppressed yields to a stat bucket (the pipeline's reward bucket). */
export function stumpApplyStats(env, bucket, state) {
    if (!state.stumpBox || !state.stumpBox.acquired) return;
    const stats = stumpEvaluate(env, state).stats;
    Object.keys(stats).forEach(stat => env.deps.addStatToBucket(bucket, stat, stats[stat]));
}
