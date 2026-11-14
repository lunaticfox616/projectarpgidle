import { craftHarvestBlockReason, hasCraftHarvestCost, isCraftHarvestEquipment } from './craft-harvest.mjs';

const RELIC_ACTIONS = Object.freeze(['divine', 'tainted', 'blessing']);
const qualityFits = slots => item => slots.includes(String(item.slot || ''))
    && Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;

export function createCurrencyFits(deps) {
    return Object.freeze({
        ...Object.fromEntries(deps.equipmentCrafting.basicActions.map(action => [action,
            item => deps.equipmentCrafting.basicFits(item, action)])),
        divine: item => item.rarity !== 'normal',
        chance: (item, owner) => item.rarity === 'normal' && deps.uniquePools(owner, item).normal.length > 0,
        scour: item => item.rarity !== 'normal' && item.rarity !== 'unique',
        tainted: item => !item.corrupted || (deps.isKaleidoscopeShieldItem(item)
            && deps.getItemExplicitOptionCount(item) <= deps.EXPLICIT_AFFIX_LINE_CAP),
        blessing: item => Array.isArray(item.baseStats) && item.baseStats.length > 0,
        annulment: item => deps.getAnnulmentRemovableStats(item).length > 0,
        abyssCatalyst: item => Math.max(0, Math.floor(item.quality || 0)) > 0
            && Array.isArray(item.stats) && item.stats.length > 0,
        deepWhetstone: qualityFits(['무기']),
        rootIron: qualityFits(['투구', '갑옷', '방패', '장갑', '신발', '허리띠']),
        jewelPolish: qualityFits(['목걸이', '반지'])
    });
}

export function currencyBlockReason(env, owner, item, action) {
    const locked = env.deps.equipmentCrafting.buildLockReason(owner);
    if (locked) return locked;
    const waiting = env.deps.equipmentCrafting.choiceWaitReason(owner);
    if (waiting) return waiting;
    if (item.corrupted && action !== 'tainted') return '타락한 아이템은 더 이상 제작할 수 없습니다.';
    if (item.fusedRelic && !RELIC_ACTIONS.includes(action)) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
    return Object.hasOwn(env.fits, action) && env.fits[action](item, owner)
        ? '' : '지금 선택한 아이템에는 사용할 수 없습니다.';
}

function sporeMode(deps, owner, item, currencyKey) {
    owner.sporeCraftModes = owner.sporeCraftModes || {};
    return isCraftHarvestEquipment(deps, item) ? (owner.sporeCraftModes[currencyKey] || 'none') : 'none';
}

function sporeReason(deps, owner, item, action, { mode, guaranteedMod }) {
    const blocked = craftHarvestBlockReason(deps, owner, item, action, { mode });
    if (blocked || mode === 'none' || !deps.equipmentCrafting.basicActions.includes(action)) return blocked;
    if (!guaranteedMod) return deps.equipmentCrafting.rerollActions.includes(action)
        ? '이 장비에는 선택한 수확 계열로 출현 가능한 옵션이 없어 제작할 수 없습니다.'
        : '선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다. 수확 제작을 사용 안 함으로 바꾸거나 해당 계열의 기존 옵션을 제거하세요.';
    return hasCraftHarvestCost(deps, owner, mode) ? '' : '식물이 없어 제작을 시작하지 않았습니다.';
}

// Decide the harvest guarantee, root and added option before either payment is spent.
export function planCurrencyCraft(deps, owner, item, currencyKey, action) {
    const mode = sporeMode(deps, owner, item, currencyKey);
    const spore = deps.equipmentCrafting.basicActions.includes(action) ? mode : 'none';
    const sideBlock = deps.equipmentCrafting.armedSideReason(owner, item, action, spore);
    if (sideBlock) return { reason: sideBlock };
    const omen = deps.equipmentCrafting.omenFor(owner, action, item, mode);
    const guaranteedMod = spore === 'none' ? null : deps.equipmentCrafting.pickSporeMod(item, action, spore, omen);
    const reason = sporeReason(deps, owner, item, action, { mode, guaranteedMod });
    if (reason) return { reason };
    const addedMod = action === 'exalted' ? guaranteedMod || deps.equipmentCrafting.pickAddMod(item, omen) : null;
    return action === 'exalted' && !addedMod
        ? { reason: deps._t('이 장비에 추가로 부여할 수 있는 옵션이 없습니다.') }
        : { spore, guaranteedMod, omen, addedMod };
}

export function currencyAddonReason(deps, owner, item, action, mode) {
    return deps.equipmentCrafting.armedSideReason(owner, item, action, mode)
        || craftHarvestBlockReason(deps, owner, item, action,
            { mode, omen: deps.equipmentCrafting.omenFor(owner, action, item, mode) });
}
