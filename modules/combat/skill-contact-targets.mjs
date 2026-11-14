import { cellGridChebyshevDist, cellGridCellKey } from './grid-units.mjs';
import { tickCopyCombatGridCell } from './skill-delivery-rules.mjs';

export function tickGetPendingSkillCollisionCells(env, row) {
    if (!row || !row.sourceCell || !row.targetCells || row.targetCells.length <= 0) return row && row.targetCells || [];
    if (row.delivery !== 'projectileCell' && row.delivery !== 'magicMoving') return row.targetCells;
    let target = row.targetCells[0];
    let maxLen = Math.max(1, cellGridChebyshevDist(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy));
    let path = env.deps.gridLineCells(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy, maxLen);
    return path.length > 0 ? path.map(cell => ({ ...cell, mult: target.mult })) : row.targetCells;
}

/** 회오리: this spin's victim, chosen as it lands — the nearest enemy not yet struck around the caster's current cell,
 * with the whirl's falloff by strike order. Nobody around: the spin whiffs. */
export function tickPickWhirlSpinTargets(env, row) {
    let struck = row.whirl.struck;
    let fresh = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !struck.includes(enemy.id));
    let pick = env.deps.selectGridSkillTargets(row.options.skillName, row.pStats.sSkill, env.owner.gridPlayer, fresh)[0];
    if (!pick) return [];
    struck.push(pick.enemy.id);
    row.options.sourceCell = tickCopyCombatGridCell(env, env.owner.gridPlayer);
    return [{ enemy: pick.enemy, mult: env.deps.getGridSkillTargetMult('whirl', struck.length - 1) }];
}

/** 대지의 함성 · 서리바람 내지르기 (js/combat-grid.js buildRadialBurstHitSequence): the monsters the drawn ring has touched since the last
 * check. The ring grows one cell per msPerCell from the wave's start up to its reach; the time since the last check is sampled every
 * COMBAT_GRID_CONFIG.waveContactSampleMs against where each monster was drawn then (just after a step it glides between its cells).
 * One wave strikes a monster once, first touched first, up to the skill's targets. Stepping inside the burst no longer dodges it. */
export function tickPickWaveFrontTargets(env, row) {
    const wave = row.wave, now = env.deps.getCombatTime(), start = row.at - (Number(row.options.stageDelayMs) || 0);
    const span = { start, from: Math.min(now, Math.max(start, wave.checkedAt ?? start)), now };
    wave.checkedAt = now;
    // 원뿔 파동은 시전 때의 원뿔 칸 안에 선 몬스터만 친다(js/combat-grid.js getRadialWaveShape)
    const inside = enemy => !wave.cells || env.deps.getGridUnitCells(enemy).some(cell => wave.cells.has(cellGridCellKey(cell.gx, cell.gy)));
    const reached = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !wave.struck.includes(enemy.id) && inside(enemy))
        .map(enemy => ({ enemy, touchedAt: tickWaveTouchTime(env, wave, enemy, span) }))
        .filter(entry => entry.touchedAt !== null).sort((a, b) => a.touchedAt - b.touchedAt)
        .slice(0, Math.max(0, wave.limit - wave.struck.length));
    reached.forEach(entry => wave.struck.push(entry.enemy.id));
    return reached.map(entry => ({ enemy: entry.enemy, mult: wave.mults[entry.enemy.id] ?? 1 }));
}

/** The first sampled moment in span when the ring (radius = time since start / msPerCell, at most reach) touches the drawn enemy. */
export function tickWaveTouchTime(env, wave, enemy, span) {
    const step = Math.max(1, env.deps.COMBAT_GRID_CONFIG.waveContactSampleMs);
    for (let t = span.from; ; t = Math.min(span.now, t + step)) {
        const ring = Math.min(wave.reach, Math.max(0, t - span.start) / wave.msPerCell);
        if (env.deps.getGridWaveDrawnDistance(wave, enemy, t) <= ring) return t;
        if (t >= span.now) return null;
    }
}

export function tickGetPendingSkillImpactTargets(env, row) {
    if (!row || row.delivery === 'instantTarget' || row.delivery === 'projectileTarget') {
        return (row && row.targetEntries || []).map(entry => {
            let enemy = (env.owner.enemies || []).find(candidate => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
            return enemy ? { enemy, mult: entry.mult } : null;
        }).filter(Boolean);
    }
    let used = new Set();
    let maxTargets = Math.max(1, row.options?.targetLimit || (row.targetEntries || []).length);
    let cells = tickGetPendingSkillCollisionCells(env, row);
    // 단두대처럼 시전 대상에게 예고하는 기술: 아직 판정 칸에 남은 대상을 먼저 치고, 빈자리는 기존 칸 순서로 채운다.
    function keptCastTargets() {
        if (!row.pStats?.sSkill?.combatPattern?.keepCastTargets) return [];
        const kept = [];
        for (let entry of row.targetEntries) {
            let enemy = (env.owner.enemies || []).find(candidate => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
            let cell = enemy && !used.has(enemy.id) && cells.find(c => env.deps.getGridUnitCells(enemy).some(o => o.gx === c.gx && o.gy === c.gy));
            if (!cell) continue;
            used.add(enemy.id);
            kept.push({ enemy, mult: cell.mult });
        }
        return kept;
    }
    return keptCastTargets().concat(cells.map(cell => {
        let enemy = (env.owner.enemies || []).find(candidate => candidate && candidate.hp > 0
            && env.deps.getGridUnitCells(candidate).some(occupied => occupied.gx === cell.gx && occupied.gy === cell.gy) && !used.has(candidate.id));
        if (!enemy) return null;
        used.add(enemy.id);
        return { enemy, mult: cell.mult };
    }).filter(Boolean)).slice(0, maxTargets);
}
