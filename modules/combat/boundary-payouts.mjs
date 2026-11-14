export function clearGetBeyondBoundaryCompletionRewardContext(env, result) {
    let focus = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === result.rewardFocusId)
        || env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    // Pre-patch active runs retain their earned payout as equipment. New runs
    // reject a locked selection before payment instead of using this fallback.
    if (!env.deps.getBeyondBoundaryRewardFocusStatus(focus.id).available) {
        focus = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    }
    let intensity = env.deps.BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === result.intensityId)
        || env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
    let tier = Math.max(1, Math.floor(Number(result.tier) || 1));
    let liveZone = env.deps.getZone(env.deps.BEYOND_BOUNDARY_ZONE_ID) || {};
    let zone = {
        ...liveZone, tier: env.deps.getUnderworldTier(30) + Math.floor((tier - 1) / 2),
        boundaryTier: tier, name: env.deps._t('경계 너머 {tier}단계 완료 보상', { tier })
    };
    return { focus, intensity, tier, zone, rewardChanged: focus.id !== result.rewardFocusId };
}

export function clearRollBeyondBoundaryRewardCount(rewardMul) {
    let multiplier = Math.max(1, Number(rewardMul) || 1);
    return 1 + (Math.random() < Math.min(0.9, multiplier - 1) ? 1 : 0);
}

export function* clearGrantBeyondBoundaryEquipmentRewards(env, context) {
    if (context.rewardChanged) (yield { kind: 'addLog', args: [env.deps._t('선택한 보상이 잠겨 있어 이번 도전 보상을 장비로 지급합니다.'), 'loot-rare'] });
    let count = clearRollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let names = [];
    for (let index = 0; index < count; index++) {
        let item = env.deps.generateEquipmentDrop({ isBoss: true }, { minimumRarity: 'rare', zone: context.zone });
        if (!item || !env.deps.addItemToInventory(item, { guaranteedKeep: true })) continue;
        names.push(item.name);
        (yield { kind: 'addLog', args: [env.deps._t('경계 완료 보상: [{name}]', { name: env.deps._t(item.name) }), 'loot-rare', { item }] });
    }
    return env.deps._t('{length}개의 희귀 이상 장비', { length: names.length });
}

export function* clearGrantBeyondBoundaryJewelRewards(env, context) {
    let count = clearRollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let stored = 0;
    for (let index = 0; index < count; index++) {
        let jewel = env.deps.generateJewelDrop(context.zone);
        if (!env.deps.bagItems.put(env.deps.bagItems.asJewel(jewel))) { // 가방이 차면 주얼 결정으로
            env.deps.salvageJewelObject(jewel, true);
            continue;
        }
        stored++;
        (yield { kind: 'addLog', args: [env.deps._t('경계 완료 보상: [{name}]', { name: env.deps._t(jewel.name) }), 'loot-rare', { item:jewel, itemKind:'jewel' }] });
    }
    let shards = Math.max(1, Math.round((3 + env.deps.getBeyondBoundaryPayoutTier(context.tier) / 5) * context.intensity.rewardMul));
    env.deps.awardCurrency('jewelShard', shards);
    return env.deps._t('주얼 {stored}개, 주얼 결정 {shards}개', { stored, shards });
}

export function clearGrantBeyondBoundaryGemRewards(env, context) {
    let amount = Math.max(1, Math.round((3 + env.deps.getBeyondBoundaryPayoutTier(context.tier) / 10) * context.intensity.rewardMul));
    env.deps.awardCurrency('awakenedEcho', amount);
    return env.deps._t('각성 잔향 {amount}개', { amount });
}

export function clearGrantBeyondBoundaryCurrencyRewards(env, context) {
    let tier = env.deps.getBeyondBoundaryPayoutTier(context.tier);
    let multiplier = context.intensity.rewardMul;
    let buds = Math.max(1, Math.round((3 + tier / 10) * multiplier));
    let dew = Math.max(1, Math.round((2 + tier / 20) * multiplier));
    let sap = tier >= 10 ? 1 + Math.floor(tier / 50) : 0;
    env.deps.awardCurrency('magicBud', buds);
    env.deps.awardCurrency('formlessDew', dew);
    if (sap > 0) env.deps.awardCurrency('sapBud', sap);
    return `마법의 새싹 ${buds}개, 형체 없는 이슬 ${dew}개${sap ? env.deps._t(', 수액 새싹 {sap}개', { sap }) : ''}`;
}

export function* clearGrantBeyondBoundaryFocusedReward(env, result) {
    let context = clearGetBeyondBoundaryCompletionRewardContext(env, result);
    let summary = context.focus.id === 'armory' ? (yield* clearGrantBeyondBoundaryEquipmentRewards(env, context))
        : context.focus.id === 'jewel' ? (yield* clearGrantBeyondBoundaryJewelRewards(env, context))
            : context.focus.id === 'gem' ? clearGrantBeyondBoundaryGemRewards(env, context)
                : clearGrantBeyondBoundaryCurrencyRewards(env, context);
    return { focusId: context.focus.id, intensityId: context.intensity.id, summary };
}
