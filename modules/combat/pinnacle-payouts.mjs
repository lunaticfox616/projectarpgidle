/** A pinnacle's own unique (data/maps.js signatureUnique): sure on the first clear, then its dropOnly.bossDropChance per clear. */
export function* clearGrantPinnacleSignatureUnique(env, zone, firstClear) {
    const definition = env.deps.UNIQUE_DB.find(unique => unique.name === zone.signatureUnique);
    const repeatChance = definition && definition.dropOnly ? Number(definition.dropOnly.bossDropChance) || 0 : 0;
    if (!definition || Math.random() >= (firstClear ? 1 : repeatChance)) return null;
    const item = env.deps.generateUniqueItem(definition.reqTier, null, definition.name);
    if (env.deps.addItemToInventory(item, { guaranteedKeep: true })) (yield { kind: 'finishSay', args: [env.deps._t('👑 [{name}] 획득!', { name: item.name }), 'loot-unique', { item }] });
    return item;
}

export function* clearGrantMilestonePinnacleClearRewards(env, zone, firstClear) {
    if (!zone || !zone.milestonePinnacle) return;
    if (zone.journalId && firstClear && typeof env.deps.unlockJournalEntry === 'function') env.deps.unlockJournalEntry(zone.journalId);
    (yield* clearGrantPinnacleSignatureUnique(env, zone, firstClear));
    if (!firstClear) {
        (yield { kind: 'addLog', args: [env.deps._t('♜ [{name}] 재도전 완료, 최초 격파 보상은 이미 획득했습니다.', { name: env.deps._t(zone.name) }), 'season-up'] });
        return;
    }
    const rewardText = clearPinnacleFirstCurrency(env, zone);
    const prefix = zone.pinnacleCapstone ? '👁️ 모든 경계의 관측을 끝냈습니다.' : '♜ 새로운 최종 관문을 정복했습니다.';
    (yield { kind: 'addLog', args: [env.deps._t('{prefix} [{name}] 최초 격파{rewardText}', { prefix, name: env.deps._t(zone.name), rewardText }), 'loot-unique'] });
}

function clearPinnacleFirstCurrency(env, zone) {
    const reward = zone.firstClearReward && typeof zone.firstClearReward === 'object' ? zone.firstClearReward : null;
    if (!reward) return '';
    const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
    if (reward.key && amount > 0) env.deps.awardCurrency(reward.key, amount);
    const rewardName = env.deps.ORB_DB[reward.key] ? env.deps._t(env.deps.ORB_DB[reward.key].name) : '';
    return rewardName ? `, ${rewardName} +${amount}` : '';
}

/** A root boss's rewards: a milestone pinnacle's, 아스트라's, else its currency (half the time; a capstone rival's on its first
 * clear) and a 40% unique, half of them its own (data/items.js ROOT_BOSS_UNIQUE_RULES, data/maps.js signatureUnique). */
export function* clearGrantSeasonBossRewards(env, zone, firstRootBossClear) {
    if (zone.milestonePinnacle) return (yield* clearGrantMilestonePinnacleClearRewards(env, zone, firstRootBossClear));
    if (zone.cosmosCapstone) return (yield* clearGrantCosmosCapstoneRewards(env, zone, firstRootBossClear));
    let grantsClearCurrency = zone.capstoneRival ? firstRootBossClear : Math.random() < 0.5;
    if (grantsClearCurrency) env.deps.awardCurrency(zone.reward || 'bossCore', 1, 'drop');
    if (Math.random() < env.deps.ROOT_BOSS_UNIQUE_RULES.chance) {
        let bossUnique = env.deps.generateUniqueItem(zone.tier || 12, null, clearPickRootBossUniqueName(env, zone));
        env.deps.addItemToInventory(bossUnique);
        (yield { kind: 'finishSay', args: [env.deps._t('👑 [{name}] 획득!', { name: env.deps._t(bossUnique.name) }), 'loot-unique', { item:bossUnique }] });
    }
}

/** The boss's own unique (its signatureUnique) for ROOT_BOSS_UNIQUE_RULES.signatureShare of the unique rolls, else null (any unique). */
export function clearPickRootBossUniqueName(env, zone) {
    return zone.signatureUnique && Math.random() < env.deps.ROOT_BOSS_UNIQUE_RULES.signatureShare ? zone.signatureUnique : null;
}

export function* clearGrantCosmosCapstoneRewards(env, zone, firstRootBossClear) {
    if (zone.journalId && firstRootBossClear && typeof env.deps.unlockJournalEntry === 'function') env.deps.unlockJournalEntry(zone.journalId);
    (yield { kind: 'finishSay', args: [env.deps._t('🌌 잔향체가 흩어졌습니다. 다섯 별의 메아리가 마침내 잠잠해집니다.'), 'loot-unique'] });
    env.deps.awardCurrency(zone.reward || 'goldenRule', 2, 'drop');
    (yield* clearRollCosmosAstraUniqueDrop(env, zone));
}

/**
 * @param {{id?: string, tier?: number, cosmosCapstone?: boolean}|null} zone
 * @param {() => number} [randomFn]
 * @returns {{name:string, slot:string, rarity:string}|null}
 */
export function* clearRollCosmosAstraUniqueDrop(env, zone, randomFn) {
    if (!zone || !zone.cosmosCapstone) return null;
    const definition = env.deps.UNIQUE_DB.find(unique => unique && unique.dropOnly
        && unique.dropOnly.id === zone.id && Number.isFinite(Number(unique.dropOnly.bossDropChance)));
    if (!definition) return null;
    const chance = Math.max(0, Math.min(1, Number(definition.dropOnly.bossDropChance)));
    const roll = typeof randomFn === 'function' ? randomFn : Math.random;
    if (roll() >= chance) return null;
    const item = env.deps.generateUniqueItem(zone.tier || definition.reqTier || 1, null, definition.name);
    if (!item || !env.deps.addItemToInventory(item, { guaranteedKeep: true })) return null;
    (yield { kind: 'addLog', args: [env.deps._t('👑 [{name}] 획득!', { name: env.deps._t(item.name) }), 'loot-unique', { item }] });
    return item;
}
