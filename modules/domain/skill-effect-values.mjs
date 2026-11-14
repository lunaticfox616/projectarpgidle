

export function effectGetSkillRepeatDamageMultiplier(env, skill, hitIndex, nativeRepeats) {
    if (hitIndex <= 0) return 1;
    if (hitIndex < nativeRepeats) {
        let repeatPct = Number(skill && skill.repeatHitDamagePct);
        return Number.isFinite(repeatPct) ? Math.max(0, repeatPct) / 100 : 1;
    }
    return Math.max(0, Number(skill && skill.extraProjectileDamagePct) || env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
}

/** 철벽 척력화의 값(data/items.js realm effects): 밀어내는 칸과 같은 몬스터를 다시 밀기까지의 ms. */
export function effectReadRepelMeleeParams(ep) {
    return { cells: Math.max(1, Math.floor(Number(ep.cells) || 1)), cooldownMs: Math.max(0, Number(ep.cooldownSec ?? 1.5)) * 1000 };
}

/** 추적자의 값: 적에게 다가가는 걸음의 이동 속도 증가(%). */
export function effectReadPursuitMovePct(ep) {
    return Math.max(0, Number(ep.pct) || 40);
}

export function effectGetTrialHazardProfile(zone) {
    let source = zone && zone.trialHazard ? zone.trialHazard : {};
    return {
        pattern: ['line', 'pool', 'cross', 'block'].includes(source.pattern) ? source.pattern : 'line',
        reach: Math.max(1, Math.floor(Number(source.reach) || 1)),
        warningMs: Math.max(800, Math.min(3000, Number(source.warningMs) || 1700)),
        intervalMs: Math.max(2400, Math.min(12000, Number(source.intervalMs) || 6000)),
        initialDelayMs: Math.max(1000, Math.min(6000, Number(source.initialDelayMs) || 2200)),
        persistent: source.persistent === true
    };
}

export function effectGetFlameDecayIgniteTakenMultiplier(pStats) {
    let skill = pStats && pStats.sSkill;
    let per100 = Math.max(0, Number(skill && skill.igniteTakenHpScalePer100) || 0);
    if (per100 <= 0) return 1;
    let uncapped = 1 + (Math.max(0, Number(pStats && pStats.maxHp) || 0) / 100) * per100;
    let cap = Math.max(1, Number(skill && skill.igniteTakenMaxMultiplier) || Infinity);
    return Math.min(uncapped, cap);
}

/** 패시브 트리의 상태이상별 지속시간(getPlayerStats의 ailmentDurationPct). 줄이 없는 능력치 묶음(소환수 등)은 1이다. */
export function effectGetPassiveAilmentDurationMultiplier(type, pStats) {
    const table = pStats && pStats.ailmentDurationPct;
    return 1 + ((table && table[type]) || 0) / 100;
}
