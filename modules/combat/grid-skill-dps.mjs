import { skillGetSkillHitSequenceProfile } from './grid-hit-profile.mjs';

/** 집중의 마무리 일격 배율, 없으면 0. */
export function skillGetChannelFinisherMultiplier(pattern) {
    return pattern.kind === 'channel' && pattern.finisher ? Math.max(0.01, Number(pattern.finisher.damagePct) || 100) / 100 : 0;
}

export function skillGetConfiguredSkillDpsMultiplier(pattern) {
    if (!pattern) return null;
    if (pattern.kind === 'authored') return pattern.stages.reduce((sum, stage) => sum + stage.damagePct / 100, 0);
    if (pattern.kind === 'meteor') {
        let hits = Math.max(1, Math.min(8, Math.floor(Number(pattern.groundHits) || 3)));
        return 1 + hits * Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    }
    if (['field', 'channel'].includes(pattern.kind)) {
        let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
        return hits * Math.max(0.01, Number(pattern.damagePct) || 100) / 100 + skillGetChannelFinisherMultiplier(pattern);
    }
    return null;
}

/** Expected extra count: 5.5 means five guaranteed shots and a 50% sixth shot. */
export function skillRollProjectileExtraShots(env, expectedShots) {
    const value = Math.max(0, Number(expectedShots) || 0);
    const whole = Math.floor(value);
    const fraction = value - whole;
    return whole + Number(fraction > 0 && env.deps.random() < fraction);
}

export function skillGetProjectileExtraShotDpsMultiplier(env, skill, expectedShots) {
    if (skill.nativeCastId) return skillGetNativeGemProjectileDpsMultiplier(env, skill.nativeCastId, expectedShots);
    if (!(skill.tags || []).includes('projectile')) return 1;
    const pct = Math.max(0, Number(skill.extraProjectileDamagePct) || env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    const extra = Math.max(0, Number(expectedShots) || 0);
    if (skill.projectilePattern?.kind === 'fan') {
        return skillGetFanProjectileDpsMultiplier(skill.projectilePattern, extra, pct);
    }
    const native = Math.max(1, Math.min(12, Math.floor(skill.multiHit || 1)));
    const baseMultiplier = Number.isFinite(skill.repeatHitDamagePct) ? 1 + (native - 1) * skill.repeatHitDamagePct / 100 : native;
    return 1 + Math.min(extra, 12 - native) * pct / Math.max(0.01, baseMultiplier);
}

export function skillGetFanProjectileDpsMultiplier(pattern,extra,pct) {
    const baseRays=Math.max(1,Math.min(8,pattern.rays || 1));
    return (1+(Math.min(8,baseRays+extra)-1)*pct)/(1+(baseRays-1)*pct);
}

/**
 * DPS shares of a fan (연발 사격): one target takes only the middle arrow, the side arrows and extra shots land on other enemies.
 * The shown DPS is that one target's share; packMul brings every arrow back for a pack that takes them all (packDps). Shown
 * numbers used to count every arrow on one target, so the archer's starter gem read as an upgrade while it dealt less than a
 * basic attack (2026-10-07 user decision). Other skills keep their multipliers (packMul 1).
 */
export function skillSplitFanSpreadDps(skill, extraShotDpsMul, sequenceDpsMul) {
    if (skill?.projectilePattern?.kind !== 'fan' || skill.nativeCastId) return { extraShotDpsMul, sequenceDpsMul, packMul: 1 };
    return { extraShotDpsMul: 1, sequenceDpsMul: 1, packMul: Math.max(1, sequenceDpsMul) * Math.max(1, extraShotDpsMul) };
}

// Empty-flask shards roll the fractional bonus independently, with eleven total shards.
export function skillGetNativeGemProjectileDpsMultiplier(env, id, expectedShots) {
    if (id!==49) return 1;
    const extra=Math.max(0,Number(expectedShots)||0),whole=Math.floor(extra),fraction=extra-whole;
    let sum=0;
    for(let base=1;base<=4;base++) {
        let probabilities=[1];
        for(let i=0;i<base;i++) {
            const next=Array(probabilities.length+1).fill(0);
            probabilities.forEach((p,k)=>{next[k]+=p*(1-fraction);next[k+1]+=p*fraction;});
            probabilities=next;
        }
        sum+=probabilities.reduce((value,p,k)=>value+p*Math.min(11-base,base*whole+k),0);
    }
    return 1+(sum/4)*(env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100)/3.5;
}

export function skillGetSkillHitSequenceDpsMultiplier(env, skillName, skill) {
    // 탄성 플라스크(44): 네 번 떨어질 때마다 대상 100%와 둘레 1칸 폭발 30%(js/skill-gem-casts.js stepBounce, 2026-10-17 스킬룬 인계)
    if (skill?.nativeCastId) return ({44:4*1.3,49:3.5})[skill.nativeCastId] || 1;
    let configured = skillGetConfiguredSkillDpsMultiplier(skill && skill.combatPattern);
    if (configured !== null) return configured;
    let profile = skillGetSkillHitSequenceProfile(env, skillName, skill || {});
    if (profile.kind === 'slam') return Math.max(0, 1 - profile.damageMultiplier) + profile.damageMultiplier;
    return skillGetProjectileSequenceDpsMultiplier(env, skill);
}

function skillGetProjectileSequenceDpsMultiplier(env, skill) {
    let projectilePattern = skill && skill.projectilePattern;
    if (projectilePattern && projectilePattern.kind === 'fan') {
        let rays = Math.max(1, Math.min(8, Math.floor(Number(projectilePattern.rays) || 1)));
        return 1 + (rays - 1) * Math.max(0, Number(skill.extraProjectileDamagePct) || env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    }
    let repeats = Math.max(1, Math.floor(Number(skill && skill.multiHit) || 1));
    if (repeats <= 1) return 1;
    let repeatPct = Number(skill.repeatHitDamagePct);
    return Number.isFinite(repeatPct) ? 1 + (repeats - 1) * Math.max(0, repeatPct) / 100 : repeats;
}
