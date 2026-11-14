import { skillBuildAuthoredSkillHitSequence, skillBuildEarthSpikeHitSequence } from './grid-hit-authored.mjs';
import { skillGetGridAttackAreaCells } from './grid-attack-area.mjs';
import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { skillBuildRadialBurstHitSequence } from './grid-hit-wave.mjs';
import { SIMPLE_HIT_SEQUENCES, skillBuildChannelSkillHitSequence, skillBuildWhirlSkillHitSequence } from './grid-hit-simple.mjs';
import { skillSortSkillHitTargetsByDistance, skillGetSkillHitSequenceProfile, skillGetSkillChainDamageMultiplier } from './grid-hit-profile.mjs';

export function skillBuildConfiguredSkillHitSequence(env, skillName, skill, targets) {
    let pattern = skill && skill.combatPattern;
    if (!pattern) return null;
    if (pattern.kind === 'authored') return skillBuildAuthoredSkillHitSequence(env, skillName, skill, targets);
    const area = skillGetConfiguredSequenceArea(env, skillName, skill, targets);
    const { attacker, primary, impactCells } = area;
    if (pattern.kind === 'earthSpikes') return skillBuildEarthSpikeHitSequence(env, skill, targets, primary, impactCells);
    if (pattern.kind === 'radialBurst') {
        return skillBuildRadialBurstHitSequence(env, skillName, skill, targets, { attacker, primary, impactCells });
    }
    const simple = SIMPLE_HIT_SEQUENCES[pattern.kind];
    if (simple) return simple(pattern, impactCells, targets);
    if (pattern.kind === 'channel') return skillBuildChannelSkillHitSequence(env, skillName, skill, targets, area);
    return skillBuildScheduledHitSequence(env, pattern, targets, area);
}

function skillGetConfiguredSequenceArea(env, skillName, skill, targets) {
    let intervalMs = Math.max(40, Math.floor(Number(skill.combatPattern.intervalMs) || 160));
    let attacker = (typeof env.owner !== 'undefined' && env.owner.gridPlayer) ? env.owner.gridPlayer : null;
    let primary = targets[0].enemy;
    let impactCells = attacker && primary
        ? skillGetGridAttackAreaCells(env, skillGetSkillGridProfile(env, skillName, skill), attacker, primary) : [];
    return { attacker, primary, impactCells, intervalMs };
}

function skillBuildScheduledHitSequence(env, pattern, targets, {impactCells, intervalMs}) {
    if (pattern.kind === 'field') {
        let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
        let damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100;
        return Array.from({ length: hits }, (_, idx) => ({
            kind: idx === 0 ? 'fieldStart' : 'fieldTick', label: `장판 ${idx + 1}회`,
            delayMs: idx * intervalMs, damageMultiplier, singleRepeat: true, delivery: 'magicCell', impactCells, targets
        }));
    }
    if (pattern.kind === 'mine') {
        let delayMs = Math.max(120, Math.floor(Number(pattern.armDelayMs) || 420));
        return [{
            kind: 'mineDetonate', label: '번개 각인 폭발', delayMs,
            damageMultiplier: 1, singleRepeat: true, impactCells, targets
        }];
    }
    if (pattern.kind !== 'moving') return null;
    return skillSortSkillHitTargetsByDistance(env, targets).map((entry, idx, ordered) => ({
        kind: idx === 0 ? 'movingStart' : 'movingStep', label: `이동 파동 ${idx + 1}칸`,
        delayMs: idx * intervalMs, damageMultiplier: 1,
        chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
        targets: [entry]
    }));
}

export function skillBuildPierceSkillHitSequence(env, profile, skill, targets) {
    let ordered = skillSortSkillHitTargetsByDistance(env, targets);
    let boomerang = skill && skill.combatPattern && skill.combatPattern.kind === 'boomerang';
    let outbound = ordered.map((entry, idx) => ({
        kind: idx === 0 ? 'piercePrimary' : 'pierceThrough', holdMs: idx * profile.holdMs,
        label: idx === 0 ? '관통 직격' : `${idx + 1}번째 관통`,
        delayMs: idx * profile.intervalMs, damageMultiplier: 1,
        chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
        targets: [entry]
    }));
    if (!boomerang) return outbound;
    let returnDelay = Math.max(80, Math.floor(Number(skill.combatPattern.returnDelayMs) || 160));
    let returnStart = Math.max(0, ordered.length - 1) * profile.intervalMs + returnDelay;
    return [{
        kind: 'boomerangOutbound', label: '관통 왕복', delayMs: 0, damageMultiplier: 0.5,
        chainFromEnemyId: null, targets: ordered
    }, {
        kind: 'boomerangReturn', label: '귀환 타격', delayMs: returnStart, damageMultiplier: 0.5,
        chainFromEnemyId: ordered.at(-1).enemy.id, targets: ordered.slice().reverse()
    }];
}

/** 한 번의 스킬 사용을 실제 시간차가 있는 타격 단계로 분해한다. */
export function skillBuildSkillHitSequence(env, skillName, skill, targetEntries) {
    let targets = (targetEntries || []).filter(entry => entry && entry.enemy && entry.enemy.hp > 0);
    if (targets.length <= 0) return [];
    let configured = skillBuildConfiguredSkillHitSequence(env, skillName, skill, targets);
    if (configured) return configured;
    let profile = skillGetSkillHitSequenceProfile(env, skillName, skill || {});
    if (profile.kind === 'whirl') return skillBuildWhirlSkillHitSequence(skill, targets, profile.intervalMs);
    if (profile.kind === 'chain') {
        return targets.map((entry, idx) => ({
            kind: idx === 0 ? 'chainPrimary' : 'chainJump',
            label: idx === 0 ? '1차 공격' : `${idx + 1}차 연쇄`,
            delayMs: (profile.fork ? Math.min(1, idx) : idx) * profile.intervalMs,
            damageMultiplier: skillGetSkillChainDamageMultiplier(skill, idx),
            chainFromEnemyId: idx > 0 ? targets[profile.fork ? 0 : idx - 1].enemy.id : null,
            targets: [entry]
        }));
    }
    if (profile.kind === 'pierce') {
        return skillBuildPierceSkillHitSequence(env, profile, skill, targets);
    }
    if (profile.kind === 'slam') {
        return [
            { kind: 'slamPrimary', label: '강타', delayMs: 0, damageMultiplier: Math.max(0, 1 - profile.damageMultiplier), targets },
            { kind: 'slamAftershock', label: '여진', delayMs: profile.delayMs, damageMultiplier: profile.damageMultiplier, targets }
        ];
    }
    return [{ kind: 'primary', label: '직격', delayMs: 0, damageMultiplier: 1, targets }];
}
