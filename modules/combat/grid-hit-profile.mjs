import { SKILL_HIT_SEQUENCE_CONFIG } from './grid-hit-values.mjs';
import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { cellGetGridUnitDistance } from './grid-units.mjs';

/** 강타 룬 가운데 여진 수치(aftershockDamagePct)를 가진 것(강타)만 본 타격 뒤 여진으로 나눠 친다. 강타 태그만 있는 룬(불사르기, 혹한의 지진,
 * 도약 강타: 2026-10-17 강타 피해와 여진이 닿도록 붙인 태그)은 제 판정 그대로 한 번에 친다. */
export function skillGetSlamAftershockProfile(skill) {
    if (!(Number(skill.aftershockDamagePct) > 0)) return null;
    return {
        kind: 'slam',
        delayMs: Math.max(120, Math.floor(Number(skill.aftershockDelayMs) || SKILL_HIT_SEQUENCE_CONFIG.slamAftershockDelayMs)),
        damageMultiplier: Math.max(0, Number(skill.aftershockDamagePct)) / 100
    };
}

/** 회전 룬의 타격 간격(공용 값). 룬마다 정하던 간격은 그것을 쓰던 정화의 집행과 함께 2026-11-08에 빠졌다. */
export function skillGetWhirlSequenceProfile() {
    return { kind: 'whirl', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.whirlIntervalMs };
}

export function skillGetPierceSequenceProfile(skillName) {
    const holds = SKILL_HIT_SEQUENCE_CONFIG.pierceHoldMs;
    return { kind: 'pierce', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.pierceIntervalMs, holdMs: holds[skillName] || holds.plain };
}

export function skillGetSkillHitSequenceProfile(env, skillName, skill) {
    let mode = skill && skill.targetMode;
    if (mode === 'whirl') return skillGetWhirlSequenceProfile();
    if (mode === 'chain') return { kind: 'chain', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.chainIntervalMs, fork: skillGetSkillGridProfile(env, skillName, skill).fork };
    let gridProfile = skillGetSkillGridProfile(env, skillName, skill || {});
    if (mode === 'pierce' || (gridProfile && gridProfile.kind === 'line')) return skillGetPierceSequenceProfile(skillName);
    return skillGetTaggedSequenceProfile(skill);
}

function skillGetTaggedSequenceProfile(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (tags.includes('slam')) return skillGetSlamAftershockProfile(skill) || { kind: 'instant' };
    return { kind: 'instant' };
}

export function skillSortSkillHitTargetsByDistance(env, targets) {
    let attacker = (typeof env.owner !== 'undefined' && env.owner.gridPlayer) ? env.owner.gridPlayer : null;
    return targets.slice().sort((a, b) => {
        if (!attacker || !a.enemy || !b.enemy) return 0;
        return cellGetGridUnitDistance(env, attacker, a.enemy) - cellGetGridUnitDistance(env, attacker, b.enemy);
    });
}

export function skillGetSkillChainDamageMultiplier(skill, jumpIndex) {
    let stepPct = Number(skill && skill.chainStepDamagePct) || 0;
    return Math.max(0.1, 1 + Math.max(0, jumpIndex) * stepPct / 100);
}
