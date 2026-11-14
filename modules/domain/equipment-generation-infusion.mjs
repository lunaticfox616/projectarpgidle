/** 주입 줄도 접두 3, 접미 3 가운데 제 종류 자리를 쓴다. 이미 있는 주입은 바꿔 끼우므로 빼고 센다. */
export function gearChaosInfusionFitsAffixRoom(env, item, option) {
    const room = env.deps.equipmentCrafting.affixRoom(item, 'rare', item.chaosInfusion || null);
    return !room || env.deps.equipmentCrafting.storedAffixKind(item, { id: option.id }) === 'special'
        || room[env.deps.equipmentCrafting.storedAffixKind(item, { id: option.id })] > 0;
}

export function gearRollChaosInfusionOption(env, option) {
    let min = Number(option && option.min);
    let max = Number(option && option.max);
    if (!Number.isFinite(min)) min = Number(option && option.value) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let val;
    if (env.deps.isTenthStat(option.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        min = minStep / 10;
        max = maxStep / 10;
    } else {
        min = Math.floor(min);
        max = Math.floor(max);
        val = min + Math.floor(Math.random() * (max - min + 1));
    }
    return { id: option.id, val: val, valMin: min, valMax: max, tier: 5, statName: env.deps.getStatName(option.id), temporary: true, source: 'chaosInfuser', sourceOptionId: option.optionId || option.id };
}

export function gearGetChaosInfuserOption(env, optionId) {
    return env.deps.CHAOS_INFUSER_OPTIONS.find(opt => (opt.optionId || opt.id) === optionId || opt.id === optionId) || null;
}

export function gearGetChaosInfuserOptionsForItem(env, item) {
    let slot = item && item.slot ? item.slot.replace(/[12]/, '') : '';
    let occupied = env.deps.getItemOccupiedExplicitModIds(item);
    return env.deps.CHAOS_INFUSER_OPTIONS.filter(opt => (!opt.slots || opt.slots.includes(slot)) && env.deps.isDefenseTypeStatAllowed(item, opt.id) && (!occupied.has(opt.id) || (item && item.chaosInfusion && item.chaosInfusion.id === opt.id)))
        .filter(opt => !item || gearChaosInfusionFitsAffixRoom(env, item, opt));
}

export function gearIsChaosInfusionEligibleItem(env, item) {
    if (!item) return { ok: false, reason: env.deps._t('아이템 미선택') };
    if (item.corrupted) return { ok: false, reason: env.deps._t('타락된 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity === 'unique') return { ok: false, reason: env.deps._t('고유 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity === 'normal' || item.rarity === 'magic') return { ok: false, reason: env.deps._t('일반/마법 등급 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity !== 'rare') return { ok: false, reason: env.deps._t('희귀 장비에만 혼돈 주입을 할 수 있습니다.') };
    return infusionLineCapacity(env, item);
}

function infusionLineCapacity(env, item) {
    let explicitCount = env.deps.getItemExplicitOptionCount(item);
    if (!item.chaosInfusion && explicitCount >= env.deps.EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: env.deps._t('추가 옵션 6줄 제한에 걸려 더 주입할 수 없습니다.') };
    if (item.chaosInfusion && explicitCount > env.deps.EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: env.deps._t('추가 옵션이 6줄을 초과했습니다. 기존 주입을 제거하세요.') };
    return { ok: true, reason: env.deps._t('사용 가능') };
}

export function gearGetChaosInfusionCost(option, item) {
    if (!option) return null;
    let costs = [{ key: option.currency, amount: option.cost }];
    if (item && item.chaosInfusion) costs.push({ key: 'blightSpore', amount: 1 });
    return costs;
}
