import { MOBILE_CRAFT_ORB_KEYS } from './static-ui-data.mjs';

export function getCraftActionValidators(runtime, item) {

    let hasHoneyLocked = (item.stats || []).some(v => v.lockedByHoney);
    return {
        honey: !!item && (runtime.deps.game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
        stinger: !!item && (runtime.deps.game.currencies.venomStinger || 0) > 0 && !(0, runtime.deps.getVenomStingerRefusal)(item),
        baseUpgrade: !!item && !(0, runtime.deps.getBaseUpgradeRefusal)(item),
        voidSocket: !!item && runtime.deps.equipmentSockets.canChisel(item)
    };

}

export function getCraftOrbUseState(runtime, key, item) {

    if (!item) return { enabled: false, reason: (0, runtime.deps._t)('아이템 미선택') };
    if ((runtime.deps.game.currencies[key] || 0) <= 0) return { enabled: false, reason: (0, runtime.deps._t)('재화 부족') };
    let actionKey = runtime.deps.equipmentCrafting.resolveAction(key, item.rarity);
    // 막는 까닭은 제작이 스스로 쓰는 규칙 그대로다(craftCurrencyUse.blockReason: 성화의 뿌리 선택 대기, 타락, 융합 유물, 등급과 자리).
    const block = runtime.deps.craftCurrencyUse.blockReason(item, actionKey);
    if (block) return { enabled: false, reason: block };
    let sporeMode = (0, runtime.deps.isSporeCraftEquipment)(item) ? (runtime.deps.game.sporeCraftModes[key] || 'none') : 'none';
    const sporeBlock = runtime.deps.craftCurrencyUse.addonReason(item, actionKey, sporeMode);
    if (sporeBlock) return { enabled: false, reason: sporeBlock };
    if (isCraftSporeCostMissing(runtime, key, item, sporeMode)) {
        return { enabled: false, reason: runtime.deps.craftingCatalogUi.sporeShortage(sporeMode) };
    }
    return { enabled: true, reason: (0, runtime.deps._t)('사용 가능') };

}

function isCraftSporeCostMissing(runtime, key, item, sporeMode) {
    return ['magicBud','sapBud','formlessDew'].includes(key)
        && typeof runtime.deps.isSporeCraftEquipment === 'function'
        && (0, runtime.deps.isSporeCraftEquipment)(item)
        && sporeMode !== 'none'
        && typeof runtime.deps.hasSporeCraftCost === 'function'
        && !(0, runtime.deps.hasSporeCraftCost)(sporeMode);
}

export function getMobileCraftCurrencyUseState(runtime, key, item) {

    if (!key || !runtime.deps.ORB_DB[key]) return { enabled: false, reason: (0, runtime.deps._t)('재화를 선택하세요.') };
    if ((runtime.deps.game.currencies[key] || 0) <= 0) return { enabled: false, reason: (0, runtime.deps._t)('보유량 없음') };
    if (!item) return { enabled: false, reason: (0, runtime.deps._t)('아이템을 선택하세요.') };
    if (item.fusedRelic || item.corrupted) return getCraftOrbUseState(runtime, key, item);
    return resolveMobileCraftCurrencyUseState(runtime, key, item);
}

function resolveMobileCraftCurrencyUseState(runtime, key, item) {
    if (key === 'enchantedHoney') {
        let v = getCraftActionValidators(runtime, item);
        return { enabled: !!v.honey, reason: v.honey ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'venomStinger') {
        let v = getCraftActionValidators(runtime, item);
        return { enabled: !!v.stinger, reason: v.stinger ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'voidChisel') {
        let enabled = runtime.deps.equipmentSockets.canChisel(item);
        return { enabled: enabled, reason: enabled ? '사용 가능' : '소켓이 이미 있거나 뚫을 수 없는 장비' };
    }
    if (MOBILE_CRAFT_ORB_KEYS.includes(key)) return resolveBasicCraftCurrencyUseState(runtime, key, item);
    return { enabled: false, reason: (0, runtime.deps._t)('지원하지 않는 재화') };
}

function resolveBasicCraftCurrencyUseState(runtime, key, item) {
    if (key === 'blessing') {
        const enabled = Array.isArray(item.baseStats) && item.baseStats.length > 0;
        return { enabled, reason: enabled ? '사용 가능' : '베이스 옵션 없음' };
    }
    if (['deepWhetstone', 'rootIron', 'jewelPolish'].includes(key)) return getCraftQualityUseState(key, item);
    if (key === 'abyssCatalyst') {
        let enabled = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
        return { enabled: enabled, reason: enabled ? '사용 가능' : '퀄리티와 추가 옵션이 있는 장비에만 사용 가능' };
    }
    return getCraftOrbUseState(runtime, key, item);
}

const QUALITY_SLOTS = {
    deepWhetstone: ['무기'], rootIron: ['투구', '갑옷', '방패', '장갑', '신발', '허리띠'], jewelPolish: ['목걸이', '반지']
};

function getCraftQualityUseState(key, item) {
    const slotOk = QUALITY_SLOTS[key].includes(String(item.slot || ''));
    const qualityOk = Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
    const enabled = slotOk && qualityOk;
    return { enabled, reason: enabled ? '사용 가능' : '현재 아이템 조건 불일치' };
}
