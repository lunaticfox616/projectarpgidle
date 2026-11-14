import { cellGridChebyshevDist } from './grid-units.mjs';
import { clampNumber } from '../common/numbers.mjs';

export function tickCopyCombatGridCell(env, unit) {
    return env.deps.hasGridCell(unit) ? { gx: unit.gx, gy: unit.gy } : null;
}

export function tickGetSkillCombatDelivery(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (skill && skill.combatPattern && skill.combatPattern.kind === 'channel') return 'magicCell';
    if (tags.includes('projectile') || tickPiercesWithDelivery(skill)) {
        return tickPiercesWithDelivery(skill) ? 'projectileCell' : 'projectileTarget';
    }
    return tickAreaCombatDelivery(tags);
}

function tickPiercesWithDelivery(skill) { return skill && skill.targetMode === 'pierce'; }

function tickAreaCombatDelivery(tags) {
    if (tags.includes('spell') || (tags.includes('aoe') && !tags.includes('melee'))) return 'magicCell';
    return 'instantTarget';
}

export function tickGetCombatTravelMs(env, sourceCell, targetCell, skill) {
    let distance = sourceCell && targetCell
        ? cellGridChebyshevDist(sourceCell.gx, sourceCell.gy, targetCell.gx, targetCell.gy) : 0;
    let baseTravelMs = env.deps.COMBAT_PROJECTILE_MIN_TRAVEL_MS + distance * env.deps.COMBAT_PROJECTILE_MS_PER_CELL;
    return Math.max(36, Math.round(baseTravelMs * tickGetCombatTravelMultiplier(skill)));
}

export function tickGetCombatTravelMultiplier(skill) {
    return clampNumber(Number(skill && skill.projectileTravelTimeMultiplier) || 1, 0.15, 2);
}

/** How long a projectile takes per cell on screen: the distance part of getCombatTravelMs. The renderer holds the fixed part
 * back before the release, so the image keeps one speed from the hand to its last cell (js/canvas-world-tree-fx.js). */
export function tickGetCombatTravelCellMs(env, skill) {
    return env.deps.COMBAT_PROJECTILE_MS_PER_CELL * tickGetCombatTravelMultiplier(skill);
}

/** Projectile rows only; ground waves and areas keep their scheduled motion. */
export function tickGetPendingSkillTravelCellMs(env, row) {
    return row.delivery?.startsWith('projectile') ? tickGetCombatTravelCellMs(env, row.pStats && row.pStats.sSkill) : 0;
}

/** 공격을 시작해 맞히기까지(ms): 강타는 내려찍을 준비가 길다. 뛰어올라 내려찍는 도약 강타는 착지가 곧 타격이라(landingMs) 강타 준비를 쓰지 않는다. */
export function tickGetAttackMotionMs(tags) {
    if (tags.includes('slam') && !tags.includes('mobility')) return 460;
    return tags.includes('projectile') ? 400 : 360;
}

/** 발이 나뉜 공격(js/combat-projectile-shots.js)은 발마다 첫 단계부터 센다: 착탄 폭발 같은 첫 타격의 연출이 발마다 나온다. */
export function tickGetStageIndexInShot(stage, offset) { return stage.shotStage === undefined ? offset : stage.shotStage; }
