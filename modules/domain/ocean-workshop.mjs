import { OCEAN_WORKBENCH_OPTIONS, SEA_GIFT_RANDOM_ORB_KEYS, SEA_GIFT_RECIPES, SEA_GIFT_ITEM_EFFECT_TYPES } from '../data/ocean-workshop.mjs';

/** Fish stock belongs to owner.ocean; selection and rendering belong to the caller.
 * Retired recipes are absent, so old UI requests fail without spending fish. */

function workshopGetModCategory(deps, mod) {
    let statId = (mod && (mod.statId || mod.id)) || '';
    let found = deps.categoryRules.find(rule => rule.ids.includes(statId));
    return found ? found.category : '특수';
}

function workshopGetOceanWorkbenchOption(topTierOnly) {
    if (topTierOnly) return OCEAN_WORKBENCH_OPTIONS.find(opt => opt.id === 'oceanLeviathanCrown');
    return OCEAN_WORKBENCH_OPTIONS[Math.floor(Math.random() * (OCEAN_WORKBENCH_OPTIONS.length - 1))];
}

/** The rerollable lines still below their top tier. */
function workshopGetSeaGiftTierStepRows(deps, item) {
    return workshopGetSeaGiftRerollRows(deps, item).filter(row => {
        let cap = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
        return Math.max(1, Math.floor(Number(row.stat.tier) || 1)) < cap;
    });
}

function workshopGetSeaGiftRerollRow(deps, item, index) {
    let stat = item && Array.isArray(item.stats) ? item.stats[index] : null;
    if (!stat || stat.lockedByHoney || stat.lockedByRift || stat.isEchoMod
        || deps.equipmentCrafting.storedAffixKind(item, stat) === 'special') return null;
    let probe = { ...item, stats: item.stats.filter((row, rowIndex) => rowIndex !== index) };
    let stored = deps.findStoredEquipmentAffix(item, stat);
    let mod = stored && deps.getAvailableMods(probe).find(row => row.id === stored.id);
    return mod ? { index, stat, mod } : null;
}

function workshopRollSeaGiftExistingAffix(deps, row, tierBoost) {
    let currentTier = Math.max(1, Math.floor(Number(row.stat.tier) || 1));
    let maxTier = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
    let targetTier = Math.min(maxTier, currentTier + Math.max(0, Math.floor(tierBoost || 0)));
    return deps.rollAffixValueInTierRange(row.mod, targetTier, targetTier);
}

function workshopGetSeaGiftRerollRows(deps, item, category) {
    return (item.stats || []).map((stat, index) => {
        if (category && workshopGetModCategory(deps, stat) !== category) return null;
        return workshopGetSeaGiftRerollRow(deps, item, index);
    }).filter(Boolean);
}

/** The most lines a sea gift adds up to: magic 2 and rare 6 (their prefix and suffix rule), else the 6-line cap. */
function workshopGetSeaGiftLineCap(deps, item) {
    const rule = deps.EXPLICIT_AFFIX_RULES[item.rarity];
    return rule ? Math.min(deps.EXPLICIT_AFFIX_LINE_CAP, rule.prefix + rule.suffix) : deps.EXPLICIT_AFFIX_LINE_CAP;
}

/** 메아리 줄은 원본과 같은 종류다. 그 종류에 자리가 없으면 같은 종류의 줄만 바꿔 끼울 수 있다. */
function workshopGetSeaGiftEchoTargets(deps, item, editableIdx, srcIdx) {
    const targetsForSource = index => {
        const kind = deps.equipmentCrafting.storedAffixKind(item, item.stats[index]), room = deps.equipmentCrafting.affixRoom(item);
        const others = editableIdx.filter(target => target !== index);
        if (!room || kind === 'special' || room[kind] > 0) return others;
        return others.filter(target => deps.equipmentCrafting.storedAffixKind(item, item.stats[target]) === kind);
    };
    if (srcIdx === undefined) {
        const maxTier = editableIdx.reduce((max, index) => Math.max(max, Number(item.stats[index].tier) || 0), 0);
        return editableIdx.filter(index => (Number(item.stats[index].tier) || 0) === maxTier)
            .map(sourceIndex => ({ sourceIndex, targetIndexes: targetsForSource(sourceIndex) }))
            .filter(choice => choice.targetIndexes.length);
    }
    return targetsForSource(srcIdx);
}

/** The indexes of the item's lines that no seal holds. */
function workshopGetSeaGiftEditableIndexes(deps, item) {
    return (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
}

/** The ocean workbench's fixed line, rolled whole, at getSeaGiftBenchSlot (before 2026-10-19 it took the first unsealed line even with
 * room). */
function workshopApplySeaGiftBenchOption(deps, item, effect, craft) {
    let option = workshopGetOceanWorkbenchOption(!!effect.topTier);
    if (!option) return workshopRefuse(deps, craft, '적용할 수 있는 고정 옵션이 없습니다.');
    let minInt = Math.floor(option.min);
    let maxInt = Math.floor(option.max);
    let val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
    let rolled = { id: option.statId, val: val, valMin: minInt, valMax: maxInt, tier: 5, statName: deps.getStatName(option.statId), oceanBenchOptionId: option.id };
    const idx = workshopGetSeaGiftBenchSlot(deps, item);
    if (idx === null) return workshopRefuse(deps, craft, '바꿀 수 있는 줄이 없습니다.');
    if (idx < 0) item.stats.push(rolled); else item.stats[idx] = rolled;
    deps.updateItemName(item);
}

/** Where the bench line goes: over the item's unsealed bench line, else added (-1) below the line cap, else over the lowest line; null
 * when the item is full and every line is sealed or fixed. A sealed bench line stays. */
function workshopGetSeaGiftBenchSlot(deps, item) {
    const own = (item.stats || []).findIndex(stat => stat && stat.oceanBenchOptionId && !stat.isEchoMod
        && !stat.lockedByHoney && !stat.lockedByRift);
    if (own >= 0) return own;
    if (deps.getItemExplicitOptionCount(item) < workshopGetSeaGiftLineCap(deps, item)) return -1;
    const low = workshopGetSeaGiftLowestLineIndex(deps, item);
    return low < 0 ? null : low;
}

/** The line a full item gives up: the lowest tier unsealed line that is not fixed (the later one on a tie), else -1. */
function workshopGetSeaGiftLowestLineIndex(deps, item) {
    const tierOf = index => Number(item.stats[index].tier) || 0;
    return workshopGetSeaGiftEditableIndexes(deps, item).filter(index => !deps.isFixedEquipmentAffix(item.stats[index]))
        .reduce((low, index) => (low < 0 || tierOf(index) <= tierOf(low) ? index : low), -1);
}

/** One of the highest tier lines echoed at half its values onto another unsealed line of the same kind. */
function workshopApplySeaGiftEcho(deps, item, effect, craft) {
    const choices = workshopGetSeaGiftEchoTargets(deps, item, workshopGetSeaGiftEditableIndexes(deps, item));
    if (!choices.length) return workshopRefuse(deps, craft, '메아리 줄을 넣을 같은 종류 자리가 없습니다(접두 3, 접미 3).');
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const dstIdx = choice.targetIndexes[Math.floor(Math.random() * choice.targetIndexes.length)];
    const source = item.stats[choice.sourceIndex];
    let echo = workshopMakeSeaGiftEchoLine(deps, source, deps.equipmentCrafting.storedAffixKind(item, source));
    item.stats[dstIdx] = echo;
    craft.say(deps._t('🔊 {echoOf} 옵션이 50% 효과로 메아리쳤습니다.', { echoOf: echo.echoOf }), 'loot-rare');
    deps.updateItemName(item);
}

function workshopMakeSeaGiftEchoLine(deps, src, kind) {
    let echo = JSON.parse(JSON.stringify(src));
    const halve = line => {
        for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal', 'valueStep']) {
            if (Number.isFinite(line[key])) line[key] = Number((line[key] / 2).toFixed(3));
        }
    };
    halve(echo);
    (echo.extraStats || []).forEach(halve);
    // Only the source owns its workbench/fossil provenance; echoKind keeps the original affix room on the copy.
    delete echo.oceanBenchOptionId;
    delete echo.fossilExclusive;
    delete echo.fossilExclusiveDrop;
    delete echo.fossilExclusiveSpore;
    if (echo.craftSource === 'fossil') delete echo.craftSource;
    echo.echoKind = kind;
    echo.echoOf = src.statName || deps.getStatName(src.id);
    echo.isEchoMod = true;
    return echo;
}

function workshopIsSeaGiftEquipmentTarget(deps, owner, item) {
    if (!item || !Array.isArray(item.stats)) return false;
    return deps.getEquipCandidateSlots(item).some(slot => Object.hasOwn(owner.equipment || {}, slot));
}
function workshopGetSeaGiftTargetBlockReason(deps, owner, item) {
    if (!item) return '대상 선택 필요';
    if (!workshopIsSeaGiftEquipmentTarget(deps, owner, item)) return '일반 장비만 가공 가능';
    if (owner.woodsmanBuildLock) return '세팅 변경 잠김';
    if (item.hallReplica) return '전당 소장품 가공 불가';
    if (item.fusedRelic) return '융합 유물 가공 불가';
    return item.corrupted ? '타락 장비 가공 불가' : '';
}
function workshopCategoryChoices(deps, item, category) {
    const pool = deps.getAvailableMods(item).filter(mod => !category || workshopGetModCategory(deps, mod) === category);
    return deps.equipmentCrafting.pickReplacement(item, pool, workshopGetSeaGiftEditableIndexes(deps, item), null, 'all');
}
function workshopEchoBlock(deps, item) {
    if ((item.stats || []).some(stat => stat && stat.isEchoMod)) return '메아리 줄 있음';
    const editable = workshopGetSeaGiftEditableIndexes(deps, item);
    if (editable.length < 2) return '봉인 안 된 2줄 필요';
    return workshopGetSeaGiftEchoTargets(deps, item, editable).length ? '' : '메아리 줄을 넣을 같은 종류 자리 없음';
}
const blockers = {
    safeReroll: (deps, item) => workshopGetSeaGiftRerollRows(deps, item).length ? '' : '굴릴 줄 없음',
    tierStepUp: (deps, item) => workshopGetSeaGiftTierStepRows(deps, item).length ? '' : '올릴 줄 없음',
    lockMod: (deps, item) => workshopGetSeaGiftEditableIndexes(deps, item).length ? '' : '봉인할 줄 없음',
    echoMod: workshopEchoBlock,
    fixedBenchOption: (deps, item) => workshopGetSeaGiftBenchSlot(deps, item) === null ? '바꿀 줄 없음' : '',
    convertCategoryMod: (deps, item, category) => workshopCategoryChoices(deps, item, category).length ? '' : '해당 계열로 변환할 자리 없음'
};
function workshopGetSeaGiftEffectBlockReason(deps, item, effect, category) {
    if (item.rarity === 'unique' && effect.type !== 'lockMod') return '고유 장비 가공 불가';
    if (category && !deps.categoryRules.some(row => row.category === category)) return '옵션 계열을 확인하세요.';
    return Object.hasOwn(blockers, effect.type) ? blockers[effect.type](deps, item, category) : '이 제작법을 적용할 수 없습니다.';
}
function workshopQuantityOf(deps, recipe, stock, count) {
    const batchLimit = recipe.group === 'supply' ? 100 : 1;
    const maxCrafts = Math.min(batchLimit, ...Object.entries(recipe.requires).map(([key, need]) => Math.floor((stock[key] || 0) / need)));
    const valid = Number.isInteger(count) && count >= 1 && count <= batchLimit;
    return { count, batchLimit, maxCrafts, valid, materialReady: valid && maxCrafts >= count };
}
function workshopGetSeaGiftRecipeStatus(deps, owner, recipeId, request = {}) {
    const recipe = SEA_GIFT_RECIPES.find(row => row.id === recipeId);
    if (!recipe) return null;
    const state = deps.ensureOceanState(owner), quantity = workshopQuantityOf(deps, recipe, state.fishStock, request.count === undefined ? 1 : request.count);
    const item = recipe.group === 'equipment' ? request.item : null;
    let reason = '';
    if (!quantity.valid) reason = '제작 횟수를 확인하세요.';
    else if (!state.unlocked) reason = '심해 해금 필요';
    else if (!quantity.materialReady) reason = '재료 부족';
    else if (recipe.group === 'equipment') reason = workshopGetSeaGiftTargetBlockReason(deps, owner, item) || workshopGetSeaGiftEffectBlockReason(deps, item, recipe.effect, request.category);
    return { recipe, ready: !reason, ...quantity, reason, item, owned: state.fishStock };
}
function workshopRefuse(deps, craft, message) { craft.say(message, 'attack-monster'); return false; }
function workshopSafeReroll(deps, item, effect, craft) {
    const rows = workshopGetSeaGiftRerollRows(deps, item), row = rows[Math.floor(Math.random() * rows.length)];
    const rolled = workshopRollSeaGiftExistingAffix(deps, row, 0);
    const oldParts = [row.stat, ...(row.stat.extraStats || [])], newParts = [rolled, ...(rolled.extraStats || [])];
    const noDecrease = oldParts.length === newParts.length && oldParts.every((part, index) => newParts[index].id === part.id && Number(newParts[index].val) >= Number(part.val));
    if (noDecrease) item.stats[row.index] = rolled;
    else craft.say('🌊 재굴림 결과가 기존보다 낮아 적용을 취소했습니다.', 'loot-magic');
    deps.updateItemName(item);
}
const effects = {
    safeReroll: workshopSafeReroll,
    tierStepUp: (deps, item) => {
        const rows = workshopGetSeaGiftTierStepRows(deps, item), row = rows[Math.floor(Math.random() * rows.length)];
        item.stats[row.index] = workshopRollSeaGiftExistingAffix(deps, row, 1);
        deps.updateItemName(item);
    },
    lockMod: (deps, item) => { item.stats[workshopGetSeaGiftEditableIndexes(deps, item)[0]].lockedByHoney = true; },
    echoMod: workshopApplySeaGiftEcho,
    fixedBenchOption: workshopApplySeaGiftBenchOption,
    convertCategoryMod: (deps, item, effect, craft) => {
        const pool = deps.getAvailableMods(item).filter(mod => !craft.category || workshopGetModCategory(deps, mod) === craft.category);
        const choice = deps.equipmentCrafting.pickReplacement(item, pool, workshopGetSeaGiftEditableIndexes(deps, item), deps.pickWeightedMod);
        if (!choice) return workshopRefuse(deps, craft, '해당 계열로 변환할 수 있는 옵션이 없습니다.');
        item.stats[choice.index] = deps.rollAffixValue(choice.mod, deps.getItemCraftTier(item));
        deps.updateItemName(item);
    }
};
function* workshopSupplyReward(deps, effect, count) {
    if (effect.type === 'currency') {
        yield { kind: 'oceanCraftCurrency', args: [effect.key, effect.amount * count] };
        return;
    }
    const gains = new Map();
    for (let i = 0; i < effect.amount * count; i++) {
        const key = SEA_GIFT_RANDOM_ORB_KEYS[Math.floor(Math.random() * SEA_GIFT_RANDOM_ORB_KEYS.length)];
        yield { kind: 'oceanCraftCurrency', args: [key, 1] };
        gains.set(key, (gains.get(key) || 0) + 1);
    }
    for (const [key, amount] of gains) yield { kind: 'oceanCraftLog', args: [`🎲 ${deps.ORB_DB[key].name} +${amount}`, 'loot-rare'] };
}
function* workshopCraftSeaGift(deps, owner, recipeId, request = {}) {
    const status = workshopGetSeaGiftRecipeStatus(deps, owner, recipeId, request);
    if (!status) return false;
    if (!status.ready) {
        yield { kind: 'oceanCraftLog', args: [deps._t('바다의 선물: {reason}', { reason: status.reason }), 'attack-monster'] };
        return false;
    }
    const { recipe, item } = status;
    if (recipe.group === 'supply') yield* workshopSupplyReward(deps, recipe.effect, status.count);
    else {
        const logs = [], craft = { category: request.category, say: (...args) => logs.push(args) };
        const success = effects[recipe.effect.type](deps, item, recipe.effect, craft) !== false;
        for (const args of logs) yield { kind: 'oceanCraftLog', args };
        if (!success) return false;
    }
    const state = deps.ensureOceanState(owner);
    for (const [key, need] of Object.entries(recipe.requires)) state.fishStock[key] = Math.max(0, Math.floor(state.fishStock[key] || 0) - need * status.count);
    yield { kind: 'oceanCraftLog', args: [deps._t('🎁 바다의 선물 {count}회 제작', { count: status.count }), 'loot-rare'] };
    if (item) yield { kind: 'oceanCraftNormalize', args: [item] };
    yield { kind: 'oceanCraftSave', args: [200] };
    return true;
}
export function createOceanWorkshop(deps) {
    return Object.freeze({
        getModCategory: (...args) => workshopGetModCategory(deps, ...args),
        getSeaGiftTierStepRows: (...args) => workshopGetSeaGiftTierStepRows(deps, ...args),
        getSeaGiftRerollRows: (...args) => workshopGetSeaGiftRerollRows(deps, ...args),
        getSeaGiftEchoTargets: (...args) => workshopGetSeaGiftEchoTargets(deps, ...args),
        getSeaGiftEditableIndexes: (...args) => workshopGetSeaGiftEditableIndexes(deps, ...args),
        getSeaGiftBenchSlot: (...args) => workshopGetSeaGiftBenchSlot(deps, ...args),
        isSeaGiftEquipmentTarget: (...args) => workshopIsSeaGiftEquipmentTarget(deps, ...args),
        getSeaGiftTargetBlockReason: (...args) => workshopGetSeaGiftTargetBlockReason(deps, ...args),
        getSeaGiftEffectBlockReason: (...args) => workshopGetSeaGiftEffectBlockReason(deps, ...args),
        getSeaGiftRecipeStatus: (...args) => workshopGetSeaGiftRecipeStatus(deps, ...args),
        craftSeaGift: (...args) => workshopCraftSeaGift(deps, ...args)
    });
}

export { OCEAN_WORKBENCH_OPTIONS, SEA_GIFT_RANDOM_ORB_KEYS, SEA_GIFT_RECIPES, SEA_GIFT_ITEM_EFFECT_TYPES };
