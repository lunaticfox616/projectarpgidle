import { cellGridChebyshevDist } from './grid-units.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { tickGetCombatTravelMs } from './skill-delivery-rules.mjs';

export function tickBuildRadialBurstVisualRow(rows, now) {
    let first = rows[0];
    let waveDurationMs = Math.max(120, Number(first.waveDurationMs) || 0);
    return {
        ...first,
        targetCells: rows.flatMap(row => row.targetCells || []),
        targetEntries: rows.flatMap(row => row.targetEntries || []),
        waveDurationMs,
        fieldDurationMs: Math.max(360, first.at - now + waveDurationMs + 180)
    };
}

/** Preserve hit times on one straight visual ray, then cross empty cells to the cast's range.
 * @param {Readonly<typeof pendingSkillStageHits>} rows Scheduled rows; never mutated.
 * @returns {(typeof pendingSkillStageHits)[number] & {travelPath:Array<{gx:number,gy:number,offsetMs:number}>}}
 */
export function tickBuildLinearSkillVisualRow(env, rows) {
    const first = rows[0], last = rows[rows.length - 1];
    const source = first.sourceCell;
    const distance = cell => cellGridChebyshevDist(source.gx, source.gy, cell.gx, cell.gy);
    const end = first.options.attackFootprint.cells.reduce((a, b) => distance(b) > distance(a) ? b : a);
    const path = [{ ...source, offsetMs: 0 }];
    const dx = end.gx-source.gx, dy = end.gy-source.gy, lengthSq = dx*dx+dy*dy;
    rows.forEach((row, index) => {
        const cell = row.targetCells[0];
        const progress = lengthSq ? clampNumber(((cell.gx-source.gx)*dx+(cell.gy-source.gy)*dy)/lengthSq,0,1) : 0;
        const point = {gx:source.gx+dx*progress,gy:source.gy+dy*progress,offsetMs:Math.max(path[path.length-1].offsetMs,row.at-first.launchAt)};
        const next = rows[index + 1];
        path.push(point);
        if (next) path.push({ ...point, offsetMs: point.offsetMs + Math.min(env.deps.SKILL_HIT_SEQUENCE_CONFIG.pierceHoldMs.longest, Math.max(0, (Number(next.holdMs) || 0) - (Number(row.holdMs) || 0))) });
    });
    const tip = path[path.length - 1];
    const remaining = cellGridChebyshevDist(tip.gx, tip.gy, end.gx, end.gy);
    if (remaining > 0) {
        const skill = first.pStats.sSkill;
        const tailMs = first.patternKind === 'moving'
            ? remaining * Math.max(80, Number(skill.combatPattern.intervalMs) || 160)
            : tickGetCombatTravelMs(env, tip, end, skill) - tickGetCombatTravelMs(env, tip, tip, skill);
        path.push({ ...end, offsetMs: tip.offsetMs + Math.max(1, tailMs) });
    }
    return { ...first, at: first.launchAt + path[path.length - 1].offsetMs,
        contactSchedule: rows.map(row => ({offsetMs: row.at - first.launchAt, state: row.contactState})),
        targetCells: [{ ...end }], targetEntries: last.targetEntries, travelPath: path };
}

/** Only a simple pierce/moving wave shares one ray; authored phases own their routes. */
export function tickGroupsSkillTravelOnRay(row) {
    const skill = row.pStats.sSkill;
    if (skill.projectilePattern?.trajectory === 'stages' || skill.combatPattern?.stages) return false;
    return row.patternKind === 'moving' || (row.delivery === 'projectileCell' && !row.patternKind);
}
