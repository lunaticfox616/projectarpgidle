import { moveSteps, movePlain } from './boss-move-geometry.mjs';
import { BOSS_MOVE_RULES } from './boss-move-values.mjs';

/** The area's lanes from the boss outward: a fan's rays, or a line's cells; only cells the warning covered. */
    export function moveLanesOf(env, area, source) {
        const keys = new Set(area.cells.map(cell => env.deps.gridCellKey(cell.gx, cell.gy)));
        if (area.kind === 'fan') {
            return (area.rays || []).map(tip => env.deps.gridLineCells(source.gx, source.gy, tip.gx, tip.gy, 16)
                .filter(cell => keys.has(env.deps.gridCellKey(cell.gx, cell.gy))));
        }
        return [area.cells.slice().sort((a, b) => moveSteps(source, a) - moveSteps(source, b))];
    }

/** Lanes advancing together: the k-th cell of every lane lands at firstMs + k × stepMs. */
    export function moveLaneStages(lanes, rule) {
        const length = Math.max(0, ...lanes.map(lane => lane.length));
        return Array.from({ length }, (_, k) => ({ ms: rule.firstMs + k * rule.stepMs,
            cells: lanes.flatMap((lane, index) => (lane[k] ? [{ gx: lane[k].gx, gy: lane[k].gy, lane: index }] : [])) }));
    }

export function moveBeamStages(env, area, source) {
        const rule = BOSS_MOVE_RULES.beam, cells = moveLanesOf(env, area, source)[0].map(cell => ({ gx: cell.gx, gy: cell.gy, lane: 0 }));
        return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
    }

export function moveGrindStages(area) {
        const rule = BOSS_MOVE_RULES.grind, cells = area.cells.map(movePlain);
        return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
    }

export function moveRingStages(area) {
        const rule = BOSS_MOVE_RULES.rings, centre = area.center, near = cell => Math.abs(cell.gx - centre.gx) + Math.abs(cell.gy - centre.gy) <= 1;
        return [{ ms: rule.firstMs, cells: area.cells.filter(near).map(movePlain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !near(cell)).map(movePlain) }];
    }

export function moveCrossStages(area) {
        const rule = BOSS_MOVE_RULES.cross, centre = area.center, middle = cell => cell.gx === centre.gx && cell.gy === centre.gy;
        return [{ ms: rule.firstMs, cells: area.cells.filter(middle).map(movePlain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !middle(cell)).map(movePlain) }];
    }

export function moveScatterStages(area) {
        const rule = BOSS_MOVE_RULES.scatter, cells = area.cells.map(movePlain);
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const size = Math.ceil(cells.length / rule.waves);
        return Array.from({ length: rule.waves }, (_, k) => ({ ms: rule.firstMs + k * rule.gapMs, cells: cells.slice(k * size, (k + 1) * size) }))
            .filter(stage => stage.cells.length);
    }

export function moveStagesOf(env, kind, area, source) {
        if (kind === 'volley' || kind === 'chain') return moveLaneStages(moveLanesOf(env, area, source), BOSS_MOVE_RULES[kind]);
        if (kind === 'beam') return moveBeamStages(env, area, source);
        if (kind === 'grind') return moveGrindStages(area);
        if (kind === 'rings') return moveRingStages(area);
        return kind === 'cross' ? moveCrossStages(area) : moveScatterStages(area);
    }
