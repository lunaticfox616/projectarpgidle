import { cellGetClosestGridUnitCell, cellGetGridUnitCells, cellGridCellKey, cellIsGridUnitInCellSet, cellGetGridUnitDistance, cellIsGridCellInBounds, cellHasGridCell } from './grid-units.mjs';
import { skillGetGridFanDirections, skillGetGridFanRayEnds, skillGetGridDiagonalAttackDirection, skillIsGridUnitOnDiagonalRay } from './grid-area-geometry.mjs';
import { cellGridLineCells } from './grid-lines.mjs';
import { skillGetGridAttackAreaCells, skillIsGridPrimaryInReach } from './grid-attack-area.mjs';
import { skillGetSkillGridProfile, skillGetGridSkillTargetMult } from './grid-skill-profile.mjs';
import { skillNoteGridBandSide } from './grid-bands.mjs';

/** A fan's hits: an aimed fan (spreadDeg) per selectGridAimedFanHits; a grid-direction fan, per ray, the first candidate standing
 * exactly on that direction's line within range. */
export function skillSelectGridFanHits(env, attackerCell, primaryEnemy, profile, orderedCandidates) {
    if (Number(profile.spreadDeg) > 0) return skillSelectGridAimedFanHits(env, attackerCell, primaryEnemy, profile, orderedCandidates);
    const primaryCell = cellGetClosestGridUnitCell(env, attackerCell, primaryEnemy);
    return skillGetGridFanDirections(attackerCell, primaryCell, profile.rays || 3).map(direction => {
        const match = orderedCandidates.find(row => cellGetGridUnitCells(env, row.enemy).some(cell => {
            const dx = cell.gx - attackerCell.gx, dy = cell.gy - attackerCell.gy;
            const steps = direction.gx !== 0 ? dx / direction.gx : dy / direction.gy;
            return Number.isInteger(steps) && steps >= 1 && steps <= profile.range
                && attackerCell.gx + direction.gx * steps === cell.gx
                && attackerCell.gy + direction.gy * steps === cell.gy;
        }));
        return match && match.enemy;
    }).filter(Boolean);
}

/** An aimed fan's volley: the middle arrow strikes the target it aims at, every other arrow the first enemy on its line, and no
 * enemy takes two arrows. The old grid-direction fan missed a target off the eight lines with every arrow (2026-10-07). */
export function skillSelectGridAimedFanHits(env, attackerCell, primaryEnemy, profile, orderedCandidates) {
    const hits = [primaryEnemy];
    skillGetGridFanRayEnds(attackerCell, cellGetClosestGridUnitCell(env, attackerCell, primaryEnemy), profile).slice(1).forEach(end => {
        const keys = new Set(cellGridLineCells(env, {ax:attackerCell.gx, ay:attackerCell.gy, tx:end.gx, ty:end.gy, maxLen:profile.range}).map(cell => cellGridCellKey(cell.gx, cell.gy)));
        const match = orderedCandidates.find(row => !hits.includes(row.enemy) && cellIsGridUnitInCellSet(env, row.enemy, keys));
        if (match) hits.push(match.enemy);
    });
    return hits;
}

/** 연쇄 스킬: 1차 대상에서 jump칸 이내 가장 가까운 적으로 targetCount까지 튄다. */
export function skillBuildGridChainTargets(env, profile, targetCount, primaryEnemy, candidates) {
    let jump = Math.max(1, profile.jump || env.deps.COMBAT_GRID_CONFIG.chainJumpRange);
    let hits = [primaryEnemy];
    let remaining = candidates.filter(enemy => enemy !== primaryEnemy);
    let current = primaryEnemy;
    while (hits.length < targetCount && remaining.length > 0) {
        let bestIdx = -1, bestDist = Infinity;
        remaining.forEach((enemy, idx) => {
            let dist = cellGetGridUnitDistance(env, profile.fork ? primaryEnemy : current, enemy);
            if (dist <= jump && dist < bestDist) { bestIdx = idx; bestDist = dist; }
        });
        if (bestIdx < 0) break;
        current = remaining.splice(bestIdx, 1)[0];
        hits.push(current);
    }
    return hits;
}

export function skillCompareGridCandidateTie(a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    let aId = Number(a.enemy.id), bId = Number(b.enemy.id);
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
    return String(a.enemy.id).localeCompare(String(b.enemy.id));
}

export function skillGetGridDangerScore(enemy) {
    if (enemy && enemy.isBoss) return 3;
    if (enemy && (enemy.isElite || enemy.elite)) return 2;
    return enemy && enemy.attackKind === 'ranged' ? 1 : 0;
}

export function skillGetGridDensityScore(env, candidate, candidates, profile, attackerCell) {
    let cells = skillGetGridAttackAreaCells(env, profile, attackerCell, candidate.enemy);
    let areaKeys = new Set(cells.map(cell => cellGridCellKey(cell.gx, cell.gy)));
    return candidates.reduce((count, row) => count + (cellIsGridUnitInCellSet(env, row.enemy, areaKeys) ? 1 : 0), 0);
}

export function skillSelectGridPrimaryCandidate(env, candidates, profile, attackerCell, options) {
    let inRange = candidates.filter(row => skillIsGridPrimaryInReach(env, row, profile, attackerCell));
    if (inRange.length === 0) return null;
    let preferredId = options && options.preferredEnemyId;
    let preferred = inRange.find(row => String(row.enemy.id) === String(preferredId));
    if (preferred) return preferred;
    let priority = options && options.targetPriority;
    if (priority === 'weakest') {
        return inRange.slice().sort((a, b) => {
            let aRatio = Math.max(0, Number(a.enemy.hp) || 0) / Math.max(1, Number(a.enemy.maxHp) || 1);
            let bRatio = Math.max(0, Number(b.enemy.hp) || 0) / Math.max(1, Number(b.enemy.maxHp) || 1);
            return aRatio - bRatio || skillCompareGridCandidateTie(a, b);
        })[0];
    }
    if (priority === 'dangerous') {
        return inRange.slice().sort((a, b) => skillGetGridDangerScore(b.enemy) - skillGetGridDangerScore(a.enemy) || skillCompareGridCandidateTie(a, b))[0];
    }
    if (priority === 'dense') {
        return inRange.slice().sort((a, b) => skillGetGridDensityScore(env, b, inRange, profile, attackerCell)
            - skillGetGridDensityScore(env, a, inRange, profile, attackerCell) || skillCompareGridCandidateTie(a, b))[0];
    }
    return inRange[0];
}

/** Monsters that have not noticed the hero (options.splashOnly) can be caught by an area, a chain or a spill, never aimed at. */
export function skillGetGridPrimaryPool(candidates, options) {
    let splashOnly = options && options.splashOnly;
    return splashOnly ? candidates.filter(row => !splashOnly.has(row.enemy)) : candidates;
}

/** 투사체 연쇄(패시브 트리의 무기 줄): 마지막으로 맞힌 적에서 연쇄 거리 안의 가장 가까운 안 맞은 적으로 chains번 튄다. */
export function skillExtendGridTargetsByProjectileChain(env, hits, chains, candidates) {
    let jumps = Math.floor(Number(chains) || 0), from = hits.at(-1);
    if (jumps <= 0 || !from) return;
    let fresh = candidates.filter(enemy => enemy === from || !hits.includes(enemy));
    hits.push(...skillBuildGridChainTargets(env, { jump: env.deps.COMBAT_GRID_CONFIG.chainJumpRange }, jumps + 1, from, fresh).slice(1));
}

export function skillSelectGridSkillTargets(env, skillName, skill, attackerCell, {enemies, options}) {
    if (!attackerCell || !cellIsGridCellInBounds(env, attackerCell.gx, attackerCell.gy)) return [];
    let profile = skillGetSkillGridProfile(env, skillName, skill);
    let candidates = (enemies || []).filter((...args)=>cellHasGridCell(env,...args))
        .map(enemy => ({ enemy, dist: cellGetGridUnitDistance(env, attackerCell, enemy) }))
        .sort(skillCompareGridCandidateTie);
    let primary = skillSelectGridPrimaryCandidate(env, skillGetGridPrimaryPool(candidates, options), profile, attackerCell, options);
    if (!primary) return [];
    skillNoteGridBandSide(env, skillName, skill, attackerCell, {primaryEnemy:primary.enemy, candidates:candidates});
    let orderedCandidates = [primary].concat(candidates.filter(row => row !== primary));
    let targetCount = Math.max(1, Math.floor(skill.targets || 1));
    let mode = skill.targetMode || 'single';
    const attack = { profile, attackerCell, targetCount };
    let hits = skillSelectGridDirectHits(env, attack, primary, orderedCandidates);
    skillExtendGridMeleeHits(env, hits, attack, primary, orderedCandidates);
    let fanDamage = skill.projectilePattern && skill.projectilePattern.kind === 'fan'
        ? Math.max(0, Number(skill.extraProjectileDamagePct) || env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100 : null;
    let directHits = hits.length;
    skillExtendGridTargetsByProjectileChain(env, hits, skill.projectileChain, orderedCandidates.map(row => row.enemy));
    let directMult = idx => (fanDamage !== null && idx > 0 ? fanDamage : skillGetGridSkillTargetMult(mode, idx));
    return hits.map((enemy, idx) => ({ enemy, mult: idx < directHits ? directMult(idx) : env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT / 100 }));
}

function skillSelectGridDirectHits(env, {profile, attackerCell, targetCount}, primary, orderedCandidates) {
    if (profile.kind === 'chain') {
        return skillBuildGridChainTargets(env, profile, targetCount, primary.enemy, orderedCandidates.map(row => row.enemy));
    } else if (profile.kind === 'fan') {
        return skillSelectGridFanHits(env, attackerCell, primary.enemy, profile, orderedCandidates).slice(0, targetCount);
    } else {
        let areaKeys = new Set(skillGetGridAttackAreaCells(env, profile, attackerCell, primary.enemy).map(cell => cellGridCellKey(cell.gx, cell.gy)));
        return orderedCandidates.filter(row => cellIsGridUnitInCellSet(env, row.enemy, areaKeys))
            .slice(0, targetCount).map(row => row.enemy);
    }
}

function skillExtendGridMeleeHits(env, hits, {profile, attackerCell, targetCount}, primary, orderedCandidates) {
    if (profile.kind === 'melee' || profile.kind === 'arc') {
        let spillCandidates = orderedCandidates.map(row => row.enemy);
        let diagonalDirection = profile.kind === 'melee'
            ? skillGetGridDiagonalAttackDirection(env, attackerCell, primary.enemy) : null;
        if (diagonalDirection) {
            spillCandidates = spillCandidates.filter(enemy => skillIsGridUnitOnDiagonalRay(env, attackerCell, enemy, diagonalDirection));
        }
        skillExtendGridTargetsBySpill(env, hits, targetCount, spillCandidates);
    }
}

/**
 * 남는 타겟 수를 '전이 타격'으로 소모한다: 이미 타격된 적의 주변 1칸에 있는 적에게
 * 타격이 번져 나간다. 범위가 좁은 스킬(근접 단일/부채꼴 등)에서도 타겟 수
 * 옵션·각인이 실제 추가 타격으로 이어지게 하는 규칙이다.
 * @param {Array<object>} hits 이미 타격이 확정된 적 목록(제자리 수정)
 * @param {number} targetCount 스킬의 최종 타겟 수
 * @param {Array<object>} candidates 후보 적(공격자 기준 거리 오름차순 정렬)
 */
export function skillExtendGridTargetsBySpill(env, hits, targetCount, candidates) {
    let added = true;
    while (hits.length < targetCount && added) {
        added = false;
        for (let i = 0; i < candidates.length; i++) {
            let enemy = candidates[i];
            if (hits.includes(enemy)) continue;
            if (!hits.some(hit => cellGetGridUnitDistance(env, hit, enemy) <= 1)) continue;
            hits.push(enemy);
            added = true;
            break;
        }
    }
}

/** 사거리 안 가장 가까운 살아 있는 적(그리드 칸 보유)을 찾는다. range 생략 시 전장 전체. */
export function skillFindNearestGridEnemy(env, fromCell, enemies, range) {
    if (!fromCell) return null;
    let best = null, bestDist = Infinity;
    (enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0 || !cellHasGridCell(env, enemy)) return;
        let dist = cellGetGridUnitDistance(env, fromCell, enemy);
        if (dist < bestDist && (!Number.isFinite(range) || dist <= range)) { best = enemy; bestDist = dist; }
    });
    return best;
}
