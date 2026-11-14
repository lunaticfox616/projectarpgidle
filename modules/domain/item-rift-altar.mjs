import { itemFlowGetSelectedCraftItem, itemFlowIsCraftSelectionEquip, itemFlowClearCraftSelection } from './item-craft-selection.mjs';
import { itemFlowGetItemDisplayName } from './item-display-name.mjs';

export function* itemFlowSetTimeRiftPressure(env, owner, delta) {
    let rift = env.deps.ensureTimeRiftState();
    let inRift = owner.currentZoneId === env.deps.TIME_RIFT_PAST_ZONE_ID || owner.currentZoneId === env.deps.TIME_RIFT_FUTURE_ZONE_ID;
    if (inRift || rift.altarOpen) return (yield { kind: 'itemLog', args: [env.deps._t('시간압은 과거에 진입하기 전에만 바꿀 수 있습니다. 제단 아이템을 회수하면 다시 선택할 수 있습니다.'), 'attack-monster'] });
    rift.pressure = Math.max(1, Math.min(env.deps.TIME_RIFT_MAX_PRESSURE, rift.pressure + Math.floor(delta || 0)));
    (yield { kind: 'itemRefresh', args: [] });
}

export function itemFlowGetTimeRiftFutureEntryReason(env, owner, rift) {
    return itemFlowGetTimeRiftFusionMismatchReason(env, rift.altarUnique, rift.altarRare)
        || (rift.altarUnique && !env.deps.canStoreEquipmentItems([rift.altarUnique], owner) ? '⌛ 가방에 융합 결과가 들어갈 자리가 없습니다. 자리를 비우고 미래에 들어가세요.' : null);
}

export function itemFlowGetTimeRiftFusionMismatchReason(env, altarItem, candidate) {
    if (!altarItem || !candidate) return '제단에 고유 1개/희귀 1개가 필요합니다.';
    if (String(altarItem.slot || '') !== String(candidate.slot || '')) {
        return env.deps._t('부위 불일치 ({slot} / {slot2}), 같은 부위로 맞춰주세요.', { slot: altarItem.slot, slot2: candidate.slot });
    }
    return null;
}

export function itemFlowGetTimeAltarItemIssue(env, owner, item, rift = env.deps.ensureTimeRiftState()) {
    if (owner.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'; // 잠금이 가방을 되돌려 제단의 장비가 가방에도 남았다
    if (!rift.altarOpen) return '먼저 과거를 클리어해 제단을 열어야 합니다.';
    if (!item) return '제단에 올릴 장비를 고르세요.';
    if (item.hallReplica) return '전당 소장품은 제단에 올릴 수 없습니다.';
    if (item.fusedRelic) return '이미 융합된 유물은 다시 시간을 건널 수 없습니다.';
    if (item.corrupted) return '타락한 장비는 제단에 올릴 수 없습니다.';
    if (item.loopSealed) return '봉인된 장비는 제단에 올릴 수 없습니다.';
    return itemFlowGetTimeAltarSlotIssue(env, item, rift);
}

export function itemFlowGetTimeAltarSlotIssue(env, item, rift) {
    if (!['unique','rare'].includes(item.rarity)) return '고유 또는 희귀 장비만 올릴 수 있습니다.';
    const unique = item.rarity === 'unique';
    if (rift[unique ? 'altarUnique' : 'altarRare']) return '해당 제단 자리가 차 있습니다. 회수 후 다시 올려주세요.';
    const other = unique ? rift.altarRare : rift.altarUnique;
    return other ? itemFlowGetTimeRiftFusionMismatchReason(env, other, item) : null;
}

export function* itemFlowPlaceItemOnTimeAltar(env, owner) {
    let rift = env.deps.ensureTimeRiftState();
    let item = itemFlowGetSelectedCraftItem(env, owner);
    if (itemFlowIsCraftSelectionEquip(env)) return (yield { kind: 'itemLog', args: [env.deps._t('장착 중인 장비는 제단에 올릴 수 없습니다. 해제 후 올려주세요.'), 'attack-monster'] });
    const issue = itemFlowGetTimeAltarItemIssue(env, owner, item, rift);
    if (issue) return (yield { kind: 'itemLog', args: [issue, 'attack-monster'] });
    let slotKey = item.rarity === 'unique' ? 'altarUnique' : 'altarRare';
    owner.inventory = (owner.inventory || []).filter(row => row && row.id !== item.id);
    rift[slotKey] = item;
    itemFlowClearCraftSelection(env);
    (yield { kind: 'itemLog', args: [env.deps._t('⏳ [{name}]{particle} 과거의 제단에 올렸습니다.{full}', { name: itemFlowGetItemDisplayName(env, item), particle: env.deps.pickParticle(item.name, '을', '를'), full: rift.altarUnique && rift.altarRare ? ` ${env.deps._t('두 자리가 모두 찼습니다. 미래로 건너가세요.')}` : '' }), 'season-up'] });
    (yield { kind: 'itemRefresh', args: [] });
    (yield { kind: 'itemSave', args: [200] });
}

export function* itemFlowRetrieveTimeAltarItems(env, owner) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'itemLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] }); // 잠금이 가방을 되돌려 회수한 장비가 사라졌다
    let rift = env.deps.ensureTimeRiftState();
    if (!rift.altarUnique && !rift.altarRare) {
        if (!rift.altarOpen) return (yield { kind: 'itemLog', args: [env.deps._t('제단이 비어 있습니다.'), 'attack-monster'] });
        rift.altarOpen = false;
        rift.activePressure = null;
        (yield { kind: 'itemLog', args: [env.deps._t('⏳ 빈 제단을 닫았습니다. 시간압을 다시 선택할 수 있습니다.'), 'season-up'] });
        (yield { kind: 'itemRefresh', args: [] });
        (yield { kind: 'itemSave', args: [200] });
        return;
    }
    let altarItems = [rift.altarUnique, rift.altarRare].filter(Boolean);
    if (!env.deps.canStoreEquipmentItems(altarItems, owner)) return (yield { kind: 'itemLog', args: [env.deps._t('인벤토리 공간이 부족합니다.'), 'attack-monster'] });
    // guaranteedKeep: 회수 아이템이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    if (rift.altarUnique) { env.deps.addItemToInventory(rift.altarUnique, { guaranteedKeep: true, skipAutoEquip: true }); rift.altarUnique = null; }
    if (rift.altarRare) { env.deps.addItemToInventory(rift.altarRare, { guaranteedKeep: true, skipAutoEquip: true }); rift.altarRare = null; }
    rift.altarOpen = false;
    rift.activePressure = null;
    (yield { kind: 'itemLog', args: [env.deps._t('⏳ 제단의 아이템을 회수했습니다.'), 'season-up'] });
    (yield { kind: 'itemRefresh', args: [] });
    (yield { kind: 'itemSave', args: [200] });
}
