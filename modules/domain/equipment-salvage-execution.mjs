import { acquireGetJewelSalvageShardGain, acquireRollItemSalvageRewards, acquireMergeSalvageRewards } from './equipment-salvage-rewards.mjs';
import { acquireAwardCurrency } from './equipment-acquisition-currency.mjs';

export function* acquireSalvageJewelObject(env, owner, jewel, silent) {
    let shardGain = acquireGetJewelSalvageShardGain(jewel);
    if (shardGain <= 0) return 0;
    (yield* acquireAwardCurrency(env, owner, 'jewelShard', shardGain, 'reward'));
    if (!silent) (yield { kind: 'acquisitionLog', args: [env.deps._t('💠 [{name}] 주얼 해체 ({rewards})', { name: env.deps._t(jewel.name), rewards: (yield { kind: 'acquisitionSalvageText', args: [{ jewelShard: shardGain }] }) }), 'loot-normal'] });
    return shardGain;
}

export function* acquireSalvageItemObject(env, owner, item, silent, options) {
    if (!item) return {};
    const jewels = env.deps.equipmentSockets.returnJewels(item, owner);
    if (jewels > 0) (yield { kind: 'acquisitionLog', args: [env.deps._t('💠 [{name}]에 끼운 주얼 {jewels}개를 가방으로 돌려받았습니다.', { name: env.deps._t(item.name), jewels }), 'loot-rare'] });
    let rewards = acquireRollItemSalvageRewards(env, item, options);
    for (const [key, amount] of Object.entries(rewards)) (yield* acquireAwardCurrency(env, owner, key, amount, 'reward'));
    if (typeof env.deps.salvageRecoveryRuntime !== 'undefined') env.deps.salvageRecoveryRuntime.record(item, rewards, owner);
    if (!silent) (yield { kind: 'acquisitionLog', args: [env.deps._t("🧪 <span class='loot-{rarity}'>[{name}]</span> 해체, {rewards}", { rarity: item.rarity, name: env.deps._t(item.name), rewards: (yield { kind: 'acquisitionSalvageText', args: [rewards] }) }), "loot-normal"] });
    return rewards;
}

// 일괄 해체 보호: 잠금·장비 프리셋 아이템은 대상에서 제외한다.
export function acquireIsBulkSalvageProtectedItem(env, owner, item) {
    if (!item) return true;
    if (item.locked || env.deps.equipmentLootPolicy.matches(item, owner)) return true;
    return typeof env.deps.equipmentLoadoutRuntime !== 'undefined' && env.deps.equipmentLoadoutRuntime.isReferenced(item, owner);
}

/** Salvages `targets` (bag items) and returns the summed rewards. The bag keeps the rest and whatever came into it on the way:
 * an item hands its socketed jewels back to the bag as it is salvaged, and a bag rebuilt from a list made beforehand lost them
 * (2026-10-12). Jewels, cores and wards go the same way as gear (js/bag-items.js salvageProfile gives their rewards). */
export function* acquireSalvageBagItems(env, owner, targets) {
    const rewards = {}, gone = new Set(targets);
    for (const item of targets) acquireMergeSalvageRewards(env, rewards, (yield* acquireSalvageItemObject(env, owner, item, true)));
    owner.inventory = owner.inventory.filter(item => !gone.has(item));
    // Manual bulk salvage emits once; automatic drop salvage never goes through this function.
    if (targets.length) (yield { kind: 'acquisitionEvent', args: ['items-salvaged', { count: targets.length }] });
    return rewards;
}

/** Of the items a bulk salvage asked about, those still in the bag and still unprotected once the player has answered. */
export function acquireConfirmedSalvageTargets(env, owner, items) {
    return items.filter(item => owner.inventory.includes(item) && !acquireIsBulkSalvageProtectedItem(env, owner, item));
}
