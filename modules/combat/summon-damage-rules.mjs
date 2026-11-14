

export function summonGetLimitedSummonPenetrationStats(env, pStats, summon) {
    pStats = env.deps.summonSupports.localStats(summon, pStats);
    let fullPen = env.deps.hasKeystone('sb6');
    const inheritedResPen = Math.max(0, (pStats.resPen || 0) - env.deps.summonSupports.playerSupportValue(pStats, 'resPen'));
    let baseResPen = fullPen ? inheritedResPen : Math.min(40, inheritedResPen * 0.55);
    let basePhysIgnore = Math.min(30, Math.max(0, (pStats.physIgnore || 0) - env.deps.summonSupports.playerSupportValue(pStats, 'physIgnore')) * 0.55);
    return {
        // Only these flags are consumed by getEffectiveEnemyMitigation. Avoid copying the entire
        // player stat sheet for every summon hit and every DPS estimate.
        allowNegativePhysIgnore: pStats.allowNegativePhysIgnore,
        crusaderLightningIgnoreRes: pStats.crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: pStats.crusaderNoResPenOnLightning,
        resPen: baseResPen + Math.max(0, (summon && summon.resPenBonus) || 0) + Math.max(0, (pStats && pStats.summonResPen) || 0),
        physIgnore: basePhysIgnore + Math.max(0, (summon && summon.physIgnoreBonus) || 0)
    };
}

export function summonGetPassiveWisdomLeapDamageMultiplier(pStats, element) {
    let damageElement = String(element || '').replace('lightning', 'light');
    if (damageElement === 'chaos' && pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.absolution) return 0;   // 면죄의 복음
    let selectedElement = pStats && pStats.passiveWisdomElement;
    if (!selectedElement) return 1;
    return damageElement === selectedElement ? 1.2 : 0;
}

/** 피해의 몇 할이 카오스로 바뀌는가: 검은 증류(원소의 50%). 시간왜곡은 2026-11-12부터 변환이 아니다(js/passives.js applyPassiveWrittenKeystoneRules). */
export function summonGetPassiveChaosConversionShare(pStats, element) {
    const flags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (element === 'chaos') return 0;
    const distill = flags.blackDistill && ['fire', 'cold', 'light'].includes(element) ? 0.5 : 0;
    return distill;
}

export function summonGetLimitedSummonFinalDamageMultiplier(pStats, summon) {
    // 소환수도 플레이어의 일반 최종 피해 배율과 지혜의 도약 속성 선택을 적용받습니다.
    let finalMultiplier = Number(pStats && pStats.finalDamageMultiplier);
    if (!Number.isFinite(finalMultiplier)) finalMultiplier = 1;
    return Math.max(0, finalMultiplier) * summonGetPassiveWisdomLeapDamageMultiplier(pStats, summon && summon.ele);
}

export function summonGetLimitedSummonBossDamageMultiplier(pStats, target) {
    if (!target || !target.isBoss) return 1;
    let mul = Math.max(0, Number(pStats && pStats.bossDamageDealtMultiplier) || 1);
    if (mul <= 1) return mul;
    return 1 + Math.min(1.25, (mul - 1) * 0.65);
}

export function summonGetSummonAttackIntervalMs(env, pStats, summon) {
    pStats = env.deps.summonSupports.localStats(summon, pStats);
    const forgeSpeed = env.deps.gemCoreForge.forSkill(summon && summon.gemName).speed;
    if (typeof env.deps.getPreciseTalentLevel === 'function' && env.deps.getPreciseTalentLevel('hero3__soulbinder')) {
        return Math.max(120, Math.floor(1000 / (Math.max(0.1, Number(pStats && pStats.aspd) || 1) * forgeSpeed)));
    }
    let profileMul = Math.max(0.1, Number((summon && summon.attackSpeedMul) || 1));
    let summonAspdMul = 1 + Math.max(0, ((pStats && pStats.summonAspd) || 0) / 100);
    return Math.max(120, Math.floor(1000 / (summonAspdMul * profileMul * forgeSpeed * pStats.summonSupportEffects.speedMultiplier)));
}

/** The gem's tags, plus the element a rolling wisp (분광) hits with on this attack. */
export function summonGetSummonDamageTags(env, summon) {
    const skillDef = env.deps.summonSupports.skill(summon);
    return new Set(skillDef.tags);
}

export function summonGetSummonSharedDamageIncreasePct(env, summon, pStats) {
    let generic = Math.max(0, Number((pStats && pStats.summonSharedPctDmg) || 0));
    let taggedStats = (pStats && pStats.summonSharedTaggedPctDmg) || {};
    let tags = summonGetSummonDamageTags(env, summon);
    let tagged = 0;
    Object.keys(env.deps.TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        if (!tags.has(tag)) return;
        tagged += Math.max(0, Number(taggedStats[env.deps.TAGGED_DAMAGE_STAT_BY_TAG[tag]]) || 0);
    });
    return generic + tagged;
}

/** A wisp that rolls its element per attack (분광) gets each element's increase a third of the time: the average. */
export function summonGetSummonAverageSharedIncreasePct(env, summon, pStats) {
    const elements = env.deps.wispSummons.elements(summon.gemName);
    if (!elements) return summonGetSummonSharedDamageIncreasePct(env, summon, pStats);
    return elements.reduce((sum, ele) => sum + summonGetSummonSharedDamageIncreasePct(env, { ...summon, ele }, pStats), 0) / elements.length;
}
