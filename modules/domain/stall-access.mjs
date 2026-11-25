import { listingCapacity, listingFreeSlot, listingSlotOpen, listingRowsOf } from './listing-rows.mjs';

export function stallRulesUnlocked(env, owner) { return env.deps.contentProgression.isUnlocked('market', owner); }

export function stallRulesCanManage(owner) { return !owner.woodsmanBuildLock && !owner.isBackgroundCalculation; }

export function stallRulesValidPrice(env, price) { return Number.isSafeInteger(price) && price >= 1 && price <= env.rules.maxAsk; }

export function stallRulesValidCurrency(env, currency) { return env.rules.currencies.includes(currency); }

export function stallRulesValidClock(now) { return Number.isSafeInteger(now) && now >= 0; }

/** The stall's own listings (kind 'stall') in the one store. */
export function stallRulesRows(store) { return listingRowsOf(store, 'stall'); }

/** The stall listing listingId, or undefined. */
export function stallRulesRow(store, listingId) { return store.rows.find(row => row.kind === 'stall' && row.id === listingId); }

/** Where a new listing goes and in what: options { slot, currency, negotiate } (a bare boolean is the old negotiate flag). The place is
 * any empty one of the shelf below owner's capacity (modules/domain/listing-rows.mjs). */
export function stallRulesListingPlacement(env, owner, options) {
    const settings = options && typeof options === 'object' ? options : { negotiate: options };
    const store = owner.listings, capacity = listingCapacity(env.deps, owner);
    const slot = Object.prototype.hasOwnProperty.call(settings, 'slot') ? settings.slot : listingFreeSlot(store, capacity);
    const currency = settings.currency === undefined ? 'formlessDew' : settings.currency;
    return { slot, currency, negotiate: settings.negotiate === true,
        available: stallRulesValidCurrency(env, currency) && listingSlotOpen(store, capacity, slot) };
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
