import { lootLogArguments, lootJewelColor } from './kill-loot-format.mjs';

export function lootShowEquipmentDelivery(env, enemy, item, result) {
    if (result.celebrate && !env.deps.battleFxSuppressed) celebrateLoot(env, enemy, item, result.highlight);
    if (result.receipt) lootQueueGroundReceipt(env, enemy, result.receipt);
}

/** Read-only visual receipt. The domain has already committed the reward. */
export function lootQueueGroundReceipt(env, enemy, receipt) {
    if (env.owner.isBackgroundCalculation || env.deps.battleFxSuppressed) return;
    const item = receipt.item;
    const loot = { ...receipt, zoneId: env.owner.currentZoneId, sourceCell: { gx: enemy.gx, gy: enemy.gy } };
    if (item) loot.item = { name: item.name, baseId: item.baseId, slot: item.slot,
        rarity: item.rarity, family: item.family, lines: item.lines };
    env.deps.addBattleFx('lootPickup', { enemyId: enemy.id, loot, duration: 1200 });
    celebrateLoot(env, enemy, item, receipt.highlight);
}

function celebrateLoot(env, enemy, item, highlight) {
    if (highlight) env.deps.addBattleFx('lootCelebration', { enemyId: enemy.id, ...highlight,
        itemName: item.name, tier: item.rarity, groundLoot: true, duration: 1800 });
}

const notices = {
    equipmentDelivery: (env, note) => lootShowEquipmentDelivery(env, note.enemy, note.item, note.result),
    receipt: (env, note) => lootQueueGroundReceipt(env, note.enemy, note.receipt),
    jewelReceipt: (env, note) => lootQueueGroundReceipt(env, note.enemy, { item: note.jewel, itemKind: 'jewel', color: lootJewelColor(note.jewel) }),
    yarn: (env, note) => env.deps.receiveKnittingYarn(note.id)
};

export function lootConsumeNotices(env, iterator) {
    let step = iterator.next();
    while (!step.done) {
        const note = step.value;
        if (note.event) env.deps.dispatchRuntimeEvent(note.event, note.detail);
        else notices[note.action](env, note);
        step = iterator.next();
    }
    return step.value;
}

export function lootConsumeFloorPickup(env, iterator) {
    let step = iterator.next();
    while (!step.done) {
        const notice = step.value;
        if (notice.action === 'talisman') env.deps.announceWildTalisman(notice.detail);
        else if (notice.action === 'leaf') env.deps.atlasFinds.receiveMemoryLeaf(notice.detail);
        else if (notice.action === 'yarn') env.deps.receiveKnittingYarn(notice.detail);
        else env.deps.dispatchRuntimeEvent(notice.event, notice.detail);
        step = iterator.next();
    }
    return step.value;
}

/** Resume the domain at the original notice boundary; unlock and log observers stay synchronous. */
export function lootConsumeRoll(env, iterator, say) {
    const ui = { unlocks: env.deps.checkUnlocks };
    for (const note of iterator) {
        if (note.action === 'unlocks') ui.unlocks();
        else if (note.event) env.deps.dispatchRuntimeEvent(note.event, note.detail);
        else logOrPresentNotice(env, note, say);
    }
}

function logOrPresentNotice(env, note, say) {
    const args = lootLogArguments(env, note);
    if (!args) return notices[note.action](env, note);
    if (note.action === 'equipmentLog' || note.action === 'beeEvent') env.deps.addLog(...args);
    else if (!note.deferred) say(...args);
}

export function lootAnnounceColonyWard(env, ward, say) {
    if (!ward) return;
    const line = ward.baseStats[0];
    if (ward.rarity !== 'unique') return say(env.deps._t('🛡️ 군락지 액막이 부적 획득: {statName} +{id}', {
        statName: env.deps.colonyWardsUi.statName(line.id), id: env.deps.formatValue(line.id, line.val)
    }), 'loot-rare', { item: ward, itemKind: 'talisman' });
    say(env.deps._t('🛡️ 군락지 고유 액막이 획득: [{name}]', { name: ward.name }), 'loot-unique', { item: ward, itemKind: 'talisman' });
    if (!env.owner.isBackgroundCalculation) env.deps.dispatchRuntimeEvent('incident', {
        text: env.deps._t('체이싱 고유 장비를 획득했습니다. 「{name}」', { name: ward.name }), tone: 'chase', chase: true
    });
}
