import { itemFlowGetTimeRiftFusionMismatchReason } from './item-rift-altar.mjs';

export function itemFlowRollTimeRiftKeptOptions(env, stats, pressure) {
    const order = stats.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(env.deps.itemRandom() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    const kept = new Set();
    order.forEach(index => { if (env.deps.itemRandom() < env.deps.getTimeRiftOptionKeepChance(pressure, kept.size)) kept.add(index); });
    return stats.filter((_, index) => kept.has(index));
}

export function* itemFlowResolveTimeRiftFusion(env, owner) {
    let rift = env.deps.ensureTimeRiftState();
    const mismatch = itemFlowGetTimeRiftFusionMismatchReason(env, rift.altarUnique, rift.altarRare);
    if (mismatch) { (yield { kind: 'itemLog', args: [mismatch, 'attack-monster'] }); return null; }
    // 제단을 비우기 전에 결과물이 들어갈 공간부터 확보한다 — 실패 시 제단을 그대로 유지하고
    // 재도전(공간 확보 후 미래 재클리어)할 수 있게 한다.
    if (!env.deps.canStoreEquipmentItems([rift.altarUnique], owner)) {
        (yield { kind: 'itemLog', args: [env.deps._t('⌛ 융합이 보류되었습니다: 인벤토리 공간이 필요합니다. (제단은 유지됩니다. 공간 확보 후 미래를 다시 클리어하세요)'), 'attack-monster'] });
        return null;
    }
    let fused = JSON.parse(JSON.stringify(rift.altarUnique));
    fused.id = env.deps.allocateItemId();
    let rareStats = (Array.isArray(rift.altarRare.stats) ? JSON.parse(JSON.stringify(rift.altarRare.stats)) : []).filter(Boolean);
    let kept = itemFlowRollTimeRiftKeptOptions(env, rareStats, rift.pressure);
    let lost = rareStats.length - kept.length;
    let grade = env.deps.getTimeRiftFusionGrade(lost, rareStats.length);
    rareStats = kept;
    fused.stats = Array.isArray(fused.stats) ? fused.stats : [];
    rareStats.forEach(stat => { stat.fusedFromRare = true; fused.stats.push(stat); });
    fused.fusedRelic = true;
    fused.fusionGrade = grade;
    fused.fusionLost = lost;
    fused.fusedRareName = rift.altarRare.name || '';
    env.deps.equipmentSockets.returnJewels(rift.altarRare); // the consumed rare's jewels stay the player's
    rift.altarUnique = null;
    rift.altarRare = null;
    rift.altarOpen = false;
    rift.activePressure = null;
    // guaranteedKeep: 융합 결과물이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    env.deps.addItemToInventory(fused, { guaranteedKeep: true, skipAutoEquip: true });
    rift.lastFusion = { id: fused.id, instanceId: env.deps.ensureEquipmentLoadoutItemIdentity(fused), name: fused.name,
        pressure: rift.pressure, inherited: rareStats.length, lost, season: owner.season };
    return { fused: fused, grade: grade, lost: lost, inherited: rareStats.length };
}
