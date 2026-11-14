import { stumpIsMature, stumpYieldOf, stumpQualityOf, stumpGoldenMul, stumpAlbinoLines } from './stump-box-item-values.mjs';
import { stumpOf, stumpFindItem } from './stump-box-state.mjs';
import { stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpShortName } from './stump-box-item-view.mjs';
import { stumpPlacedCells } from './stump-box-board-items.mjs';
import { stumpIsSealed } from './stump-box-seals-read.mjs';

/** The cell a scar bites: one of its 8 neighbours, picked evenly; -1 off the board. */
export function stumpBiteCell(env, cell, random) {
    const [dx, dy] = env.MOORE[Math.floor(random() * env.MOORE.length)];
    const x = cell % env.deps.STUMP_BOX_SIZE + dx, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE) + dy;
    return x < 0 || y < 0 || x >= env.deps.STUMP_BOX_SIZE || y >= env.deps.STUMP_BOX_SIZE ? -1 : y * env.deps.STUMP_BOX_SIZE + x;
}

/** What eating a seed gives: its main, extra and albino lines at its quality and golden (no synergy or graft) × absorb.ripe.
 * A growing seed gives nothing (2026-11-04 사용자: 효과가 없으므로 흡수해도 능력치를 얻지 못한다). */
export function stumpMealOf(env, item) {
    const made = stumpIsMature(item) ? stumpYieldOf(env, item) : null;
    if (!made) return [];
    const share = env.deps.STUMP_BOX_SCAR.absorb.ripe, scale = stumpQualityOf(item) * stumpGoldenMul(env, item) * share;
    const lines = [{ stat: made.stat, value: made.value }].concat(item.harvest ? item.harvest.lines : []);
    return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 }))
        .concat(stumpAlbinoLines(env, item).map(line => ({ stat: line.stat, value: line.value * share })));
}

/** Adds a meal in its order, each stat up to its cap. A scar holds maxLines stats (2026-11-04 사용자): once full, a new stat is lost.
 * A save holding more keeps them and takes no new one. @returns {{kept: object[], lost: object[]}} */
export function stumpAbsorb(env, scar, meal) {
    const kept = [], lost = [];
    meal.forEach(line => {
        const held = Object.hasOwn(scar.absorbed, line.stat);
        if (!held && Object.keys(scar.absorbed).length >= env.deps.STUMP_BOX_SCAR.maxLines) return lost.push(line);
        const total = (scar.absorbed[line.stat] || 0) + line.value;
        scar.absorbed[line.stat] = Math.round(Math.min(env.SCAR_CAPS[line.stat] || 0, total) * 100) / 100;
        kept.push(line);
    });
    return { kept, lost };
}

/** One scar's bite at the end of a loop. A seed is eaten (a growing one for nothing); anything else spends the chance. */
export function stumpBite(env, state, scar, cell, random) {
    const box = stumpOf(env, state), target = stumpBiteCell(env, cell, random);
    const preyId = target >= 0 && stumpIsOpen(env, state, target) ? box.board[target] : null, prey = preyId === null ? null : stumpFindItem(box, preyId);
    if (!prey || !env.FAMILIES.includes(prey.family)) {
        scar.misses = (scar.misses || 0) + 1;
        return { scar, target, ate: null, gained: [], lost: [] };
    }
    const { kept, lost } = stumpAbsorb(env, scar, stumpMealOf(env, prey));
    scar.meals = (scar.meals || 0) + 1;
    box.board[target] = null;
    box.items = box.items.filter(item => item.id !== prey.id);
    return { scar, target, ate: stumpShortName(env, prey), gained: kept, lost };
}

/** 포식: a grown scar in a seal cell bites once as a loop ends (2026-11-04 사용자: the rest of the box is gone with the loop).
 * @returns {object[]} { scar, target, ate, gained, lost } */
export function stumpDevour(env, state, random) {
    const box = stumpOf(env, state);
    const scars = stumpPlacedCells(box).filter(({ item, cell }) => item.family === 'scar' && stumpIsMature(item) && stumpIsSealed(box, cell));
    return scars.map(({ item, cell }) => stumpBite(env, state, item, cell, random));
}
