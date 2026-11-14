

export function stallRulesUnlocked(env, owner) { return env.deps.contentProgression.isUnlocked('market', owner); }

export function stallRulesCanManage(owner) { return !owner.woodsmanBuildLock && !owner.isBackgroundCalculation; }

export function stallRulesValidPrice(env, price) { return Number.isSafeInteger(price) && price >= 1 && price <= env.rules.maxAsk; }

export function stallRulesValidCurrency(env, currency) { return env.rules.currencies.includes(currency); }

export function stallRulesBankKey(env, currency) { return env.rules.proceedsKeys[currency]; }

export function stallRulesValidClock(now) { return Number.isSafeInteger(now) && now >= 0; }

export function stallRulesValidSlot(env, slot) { return Number.isInteger(slot) && slot >= 0 && slot < env.rules.slots; }

export function stallRulesFirstEmptySlot(env, occupied) {
    for (let slot = 0; slot < env.rules.slots; slot++) if (!occupied.has(slot)) return slot;
    return -1;
}

export function stallRulesListingPlacement(env, stall, options) {
    const settings = options && typeof options === 'object' ? options : { negotiate: options };
    const occupied = new Set(stall.listings.map(row => row.slot));
    const slot = Object.prototype.hasOwnProperty.call(settings, 'slot') ? settings.slot : stallRulesFirstEmptySlot(env, occupied);
    const currency = settings.currency === undefined ? 'formlessDew' : settings.currency;
    return { slot, currency, negotiate: settings.negotiate === true,
        available: stallRulesValidCurrency(env, currency) && stallRulesValidSlot(env, slot) && !occupied.has(slot) };
}

export function stallRulesListBlockReason(env, item, owner) {
    if (!item || env.deps.bagItems.isSpecial(item) || !Number.isSafeInteger(item.id) || !env.deps.itemAppraisal.quote(item)) return '가판대에 올릴 수 없는 물건입니다.';
    const flag = env.FLAG_REASONS.find(([key]) => item[key]);
    if (flag) return flag[1];
    if (env.deps.equipmentSockets.jewels(item).length > 0) return '주얼을 빼야 올릴 수 있습니다.';
    if (env.deps.equipmentSockets.harvests(item).length > 0) return '소켓의 꽃, 열매, 덩굴, 뿌리를 빼야 올릴 수 있습니다.';
    if (Object.values(owner.equipment).some(equipped => equipped?.id === item.id)) return '장착한 장비입니다.';
    return env.deps.equipmentLoadoutRuntime.isReferenced(item, owner) ? '프리셋에 쓰이는 장비입니다.' : '';
}

export function stallRulesEligible(env, item, owner) { return !stallRulesListBlockReason(env, item, owner); }
