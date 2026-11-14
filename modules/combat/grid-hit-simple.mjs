import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { skillGetGridAttackAreaCells } from './grid-attack-area.mjs';

export function skillBuildMeteorSkillHitSequence(pattern, impactCells, targets) {
    let groundHits = Math.max(1, Math.min(8, Math.floor(Number(pattern.groundHits) || 3)));
    let groundIntervalMs = Math.max(160, Math.floor(Number(pattern.groundIntervalMs) || 600));
    let groundDamageMultiplier = Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    let impact = {
        kind: 'meteorImpact', label: '유성 충돌', delayMs: 0,
        damageMultiplier: 1, impactCells, targets
    };
    let ground = Array.from({ length: groundHits }, (_, idx) => ({
        kind: 'meteorGroundTick', label: `불길 지대 ${idx + 1}회`,
        delayMs: (idx + 1) * groundIntervalMs,
        damageMultiplier: groundDamageMultiplier, singleRepeat: true,
        primaryAilmentChance: idx === 0 ? 1 : undefined, impactCells, targets
    }));
    return [impact, ...ground];
}

/** 나눠 쏘는 부채꼴(2026-10-20 스킬룬 전달본 v42의 연발 사격): 활 연타사격 그림의 쏘는 장 넷에 맞춰 화살을 shots발씩, 첫 사격에서 shotMs 뒤에
 * 쏜다. 대상은 부채꼴 갈래 순서(가운데 겨눈 화살이 먼저, js/combat-grid.js selectGridAimedFanHits)대로 나눈다. 남는 화살(추가 투사체)은 마지막
 * 사격에 붙는다. 대상과 화살마다의 피해 배율은 그대로다(나눠 쏘기만 한다). 그림은 js/canvas-world-tree-fx.js fanRays가 같은 몫으로 나눈다. */
export function skillBuildVolleySkillHitSequence(pattern, targets) {
    const shots = (pattern.shots || []).map(count => Math.max(1, Math.floor(Number(count) || 1))), at = pattern.shotMs || [];
    const stages = [];
    let next = 0;
    shots.forEach((count, idx) => {
        const group = targets.slice(next, idx === shots.length - 1 ? targets.length : next + count);
        next += group.length;
        if (group.length) stages.push({ kind: idx ? 'volleyShot' : 'primary', label: `${idx + 1}번째 사격`, delayMs: Math.max(0, Number(at[idx]) || 0), damageMultiplier: 1, targets: group });
    });
    return stages.length ? stages : [{ kind: 'primary', label: '직격', delayMs: 0, damageMultiplier: 1, targets }];
}

/** 집중(channel): hits번의 시간차 타격. finisher가 있으면 마지막에 제 피해와 범위로 한 번 더(2026-10-17 인계의 전도성 난격이 썼다),
 * advanceCells가 있으면 중간 타격 때 주인공이 겨눈 쪽으로 한 칸 걸어 나간다(js/combat-tick.js advanceHeroForStage). */
export function skillBuildChannelSkillHitSequence(env, skillName, skill, targets, area) {
    const pattern = skill.combatPattern, { attacker, primary, impactCells, intervalMs } = area;
    const hits = Math.max(2, Math.min(8, Math.floor(Number(pattern.hits) || 3)));
    const damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100, advanceAt = pattern.advanceCells ? Math.floor(hits / 2) : -1;
    const stages = Array.from({ length: hits }, (_, idx) => ({
        kind: idx === 0 ? 'channelStart' : 'channelTick', label: `집중 ${idx + 1}회`,
        delayMs: idx * intervalMs, damageMultiplier, singleRepeat: true, impactCells, targets, advanceHero: idx === advanceAt
    }));
    const finisher = pattern.finisher;
    if (!finisher) return stages;
    const profile = { ...skillGetSkillGridProfile(env, skillName, skill), ...(finisher.grid || {}) };
    stages.push({ kind: 'channelFinisher', label: finisher.label || '마무리', delayMs: hits * intervalMs,
        damageMultiplier: Math.max(0.01, Number(finisher.damagePct) || 100) / 100, singleRepeat: true, targets,
        impactCells: attacker && primary ? skillGetGridAttackAreaCells(env, profile, attacker, primary) : impactCells });
    return stages;
}

/** 회오리: as many spins as the skill has targets, one per interval. A spin picks its victim when it lands — the nearest
 * enemy not yet struck around the cell the caster stands in then — so the blade keeps cutting while they move
 * (combat.js pickWhirlSpinTargets). The cast-time primary only anchors the stage. */
export function skillBuildWhirlSkillHitSequence(skill, targets, intervalMs) {
    let spins = Math.max(1, Math.floor(Number(skill && skill.targets) || targets.length));
    let whirl = { struck: [] };
    return Array.from({ length: spins }, (_, idx) => ({
        kind: idx === 0 ? 'whirlPrimary' : 'whirlSweep',
        label: idx === 0 ? '회전 시작' : `회전 ${idx + 1}타`,
        delayMs: idx * intervalMs, damageMultiplier: 1, whirl,
        targets: targets.slice(0, 1)
    }));
}

export const SIMPLE_HIT_SEQUENCES = Object.freeze({
    meteor: (pattern, impactCells, targets) => skillBuildMeteorSkillHitSequence(pattern, impactCells, targets),
    volley: (pattern, impactCells, targets) => skillBuildVolleySkillHitSequence(pattern, targets)
});
