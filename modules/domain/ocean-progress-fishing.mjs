import { oceanGetOceanFishingStrategyDef, oceanGetOceanFishCollectionBonus, oceanGetOceanFishCollectionProgress } from './ocean-progress-collection.mjs';

export function* oceanAdvanceOceanDiveFromKill(env, owner, zone) {
    // 일반 심해 전투 구간 전체 완료 시 호출한다. 개별 몬스터나 가디언 보상과 중복하지 않는다.
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    if (Math.random() < 0.06) (yield { kind: 'progressAwardCurrency', args: ['reefFragment', 1] });
    // 수심은 몬스터를 쓰러뜨릴 때마다 쌓여 조금씩 내려간다(applyOceanKill, tickOceanDepth). 구간을 끝내면 낚시만 준다.
    yield* oceanGainOceanFishingGaugeFromCombat(env, owner, zone);
}

export function* oceanGainOceanFishingGaugeFromCombat(env, owner, zone) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    // 낚시 게이지는 구역 강도(수심 단계)에 따라 세분화: 얕은(약한) 곳에선 조금, 깊은(강한) 곳에선 조금 더 오른다.
    let depthTier = Math.max(0, Math.floor(zone?.depthTier ?? env.deps.getOceanDepthTier(st.depthM)));
    let strategy = oceanGetOceanFishingStrategyDef(env, owner, st);
    let collectionGainPct = oceanGetOceanFishCollectionBonus(env, owner, 'gaugeGainPct', st);
    // A first dive clears only three shallow sections before the 500m guardian, so each gives at least 35 and the first fish comes in
    // that dive (it came in the third, eight minutes in); deeper water improves pace up to tier20.
    let gain = Math.max(35, 20 + Math.min(depthTier, 20) * 2) * env.deps.getOceanFishingGaugeGainMul(owner);
    gain *= Math.max(0.1, Number(strategy.gaugeGainMul) || 1) * (1 + collectionGainPct / 100);
    if (env.deps.hasOceanCurrent(zone, 'school_of_fish')) gain *= 1.5;
    gain = Math.min(100, gain); // At most one catch per completed encounter, including all bonuses.
    let nextGauge = (st.fishingGauge || 0) + gain;
    st.fishingGauge = env.deps.clampNumber(nextGauge, 0, 100);
    if (st.fishingGauge >= 100) {
        st.fishingGauge = env.deps.clampNumber(nextGauge - 100, 0, 99.99);
        yield* oceanCatchOceanFish(env, owner, st.pressureLevel || 0);
    }
}

export function* oceanCatchOceanFish(env, owner, depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let eligible = Object.keys(env.deps.OCEAN_FISH_DB).filter(key => (env.deps.OCEAN_FISH_DB[key].depthTier || 0) <= safeTier);
    if (eligible.length === 0) return null;
    let st = env.deps.ensureOceanState(owner);
    let strategy = oceanGetOceanFishingStrategyDef(env, owner, st);
    let rareEligible = eligible.filter(key => (env.deps.OCEAN_FISH_RARITY_META[env.deps.OCEAN_FISH_DB[key].rarity] || {}).rank >= 2);
    let guaranteed = st.rareFishPity >= 100 && rareEligible.length > 0;
    if (guaranteed) eligible = rareEligible;
    let rareChanceBonusPct = yield { kind: 'progressRareFishChance', args: [] };
    rareChanceBonusPct += oceanGetOceanFishCollectionBonus(env, owner, 'rareChancePct', st);
    let picked = rollOceanFish(env, eligible, safeTier, strategy, rareChanceBonusPct);
    let wasDiscovered = (st.fishCaughtTotal[picked] || 0) > 0;
    let rarityRank = recordOceanCatch(env, st, picked, strategy, guaranteed);
    (yield { kind: 'progressBattleFx', args: ['fishCatch', {duration:400, background:owner.isBackgroundCalculation}] });
    let logType = rarityRank >= 4 ? 'loot-unique' : (rarityRank >= 2 ? 'loot-rare' : 'loot-magic');
    (yield { kind: 'progressLog', args: [env.deps._t('{omen}{fish} 낚았습니다!', { omen: guaranteed ? `${env.deps._t('✨ 희귀 조짐 적중!')} ` : '🐟 ', fish: env.deps.withObjectParticle(env.deps._t(env.deps.OCEAN_FISH_DB[picked].name)) }), logType] });
    yield* announceOceanDiscovery(env, owner, st, wasDiscovered);
    return picked;
}

function rollOceanFish(env, eligible, safeTier, strategy, rareChanceBonusPct) {
    let weights = eligible.map(key => {
        let fish = env.deps.OCEAN_FISH_DB[key];
        let rarityRank = (env.deps.OCEAN_FISH_RARITY_META[fish.rarity] || {}).rank || 0;
        let rareWeight = Number.isFinite(fish.rareWeight) ? fish.rareWeight : 1;
        if (rarityRank >= 2) rareWeight *= Math.max(0.1, Number(strategy.rareWeightMul) || 1) * (1 + rareChanceBonusPct / 100);
        return (1 / (1 + (safeTier - (fish.depthTier || 0)))) * rareWeight;
    });
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let picked = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { picked = eligible[i]; break; }
    }
    return picked;
}

function recordOceanCatch(env, st, picked, strategy, guaranteed) {
    st.fishStock[picked] = Math.max(0, Math.floor(st.fishStock[picked] || 0)) + 1;
    st.fishCaughtTotal[picked] = Math.max(0, Math.floor(st.fishCaughtTotal[picked] || 0)) + 1;
    let rarityRank = (env.deps.OCEAN_FISH_RARITY_META[env.deps.OCEAN_FISH_DB[picked].rarity] || {}).rank || 0;
    st.rareFishPity = rarityRank >= 2 ? 0 : Math.min(100, st.rareFishPity + Math.max(1, Number(strategy.pityGain) || 8));
    st.lastCatch = { key: picked, at: Date.now(), guaranteed };
    return rarityRank;
}

function* announceOceanDiscovery(env, owner, st, wasDiscovered) {
    let discoveredCount = oceanGetOceanFishCollectionProgress(env, owner, st).discoveredCount;
    if (!wasDiscovered && env.deps.OCEAN_FISH_COLLECTION_MILESTONES.some(row => row.required === discoveredCount)) {
        (yield { kind: 'progressLog', args: [env.deps._t('📘 심해 도감 {discoveredCount}/{length}, 받을 보상이 있습니다.', { discoveredCount, length: Object.keys(env.deps.OCEAN_FISH_DB).length }), 'loot-rare'] });
        owner.noti.map = true;
    }
}
