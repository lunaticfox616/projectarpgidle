import { finishBooks, finishRules, finishHeld, finishWalletKey, finishIngredients } from '../data/equipment-finishes.mjs';
import { craftAffixRoom, craftBuildLockReason, craftGetBlockReason, craftKeepsKind, craftKeptOnReroll, ordinaryFinishMod } from './equipment-craft-rules.mjs';

function exchangeReason(env, owner, key, variant) {
    const rule = Object.hasOwn(finishRules, key) && finishRules[key];
    if (!rule || !Object.hasOwn(rule.variants, variant)) return '재료 종류를 선택하세요.';
    if (!env.deps.contentProgression.isUnlocked(rule.unlock, owner)) return '아직 해금되지 않았습니다.';
    if (craftBuildLockReason(owner)) return craftBuildLockReason(owner);
    if (key === 'artManual' && !env.deps.gemDropRewards.spareCount(owner, finishBooks[variant].rune)) return '해당 기술의 여분 룬이 필요합니다.';
    return finishIngredients(key, variant).some(([id, count]) => !(owner.currencies[id] >= count)) ? '교환 재료가 부족합니다.' : '';
}

export function finishExchangeMaterial(env, owner, key, variant, spend = false) {
    const reason = exchangeReason(env, owner, key, variant);
    if (reason || !spend) return {ok: !reason, reason};
    const wallet = owner.currencies, into = finishWalletKey(key, variant);
    if (key === 'artManual' && !env.deps.gemDropRewards.takeSpare(owner, finishBooks[variant].rune)) return {ok: false, reason:'해당 기술의 여분 룬이 필요합니다.'};
    for (const [id, count] of finishIngredients(key, variant)) wallet[id] -= count;
    wallet[into] = (wallet[into] || 0) + 1;
    return {ok: true, reason:''};
}

function equipmentReason(env, owner, item, key) {
    if (!env.deps.contentProgression.isUnlocked(finishRules[key].unlock, owner)) return '아직 해금되지 않았습니다.';
    if (craftBuildLockReason(owner)) return craftBuildLockReason(owner);
    if (owner.craftChoice) return '먼저 제작 결과를 선택하세요.';
    if (!item || !env.deps.EQUIPMENT_DROP_SLOTS.includes(item.slot) || craftKeepsKind(item) || !['magic','rare'].includes(item.rarity)) return '마법 또는 희귀 장비를 선택하세요.';
    if (key === 'artManual' && item.slot !== '무기') return '비기 각인은 무기에만 사용할 수 있습니다.';
    return craftGetBlockReason(env, item, key);
}

export function finishOrdinaryRows(env, item) {
    const allowed = new Set(finishLegalMods(env,item).map(mod=>mod.id));
    return (item.stats || []).flatMap((stat, index) => {
        if (!stat || protectedFinishLine(stat) || craftKeptOnReroll(item,stat) || env.deps.isFixedEquipmentAffix(stat)) return [];
        const mod = env.deps.findStoredEquipmentAffix(item, stat);
        return mod && allowed.has(mod.id) ? [{stat, mod, index}] : [];
    });
}

export function finishLegalMods(env,item) {
    return env.deps.getAvailableMods({...item, stats:[], chaosInfusion:null}).filter(ordinaryFinishMod);
}

// Drop an invalid slot override on load without taking away the saved affix itself.
export function restoreTransfers(env,item) {
    if (!item.stats.some(stat => stat.craftSource === 'transferStone')) return;
    const legal = new Set(finishLegalMods(env,item).filter(mod=>mod.type==='suffix').map(mod=>mod.id));
    let retained = false;
    for (const stat of item.stats.filter(row => row.craftSource === 'transferStone')) {
        const mod = env.deps.findStoredEquipmentAffix(item,stat);
        if (!retained && mod && legal.has(mod.id)) retained = true;
        else delete stat.craftSource;
    }
}

function protectedFinishLine(stat) {
    return stat.extraStats?.length || ['craftSource','isEchoMod','oceanBenchOptionId','unremovable','encroachedFinal',
        'fossilExclusive','fossilExclusiveDrop','fossilExclusiveSpore','venomStingerBonus'].some(field => stat[field]);
}

function balanceTargets(env, item, rows, variant) {
    const tiers = rows.map(row => row.stat.tier), min = Math.min(...tiers), max = Math.max(...tiers);
    if (!(max > min)) return {reason:'서로 등급이 다른 일반 옵션 두 줄이 필요합니다.'};
    const tier = Math.floor((tiers.reduce((sum, n) => sum + n, 0) - min) / (tiers.length - 1));
    const highs = rows.filter(row => row.stat.tier === max);
    const lows = rows.filter(row => row.stat.tier === min).map(row => {
        const draft = {...item, stats:item.stats.filter(stat => stat !== row.stat)};
        const pool = env.deps.getOpenAffixMods(draft).filter(mod => ordinaryFinishMod(mod) && mod.type === row.mod.type
            && (!mod.tierValues || mod.tierValues.length >= tier) && env.deps.getAffixTags(mod).includes(variant));
        return {...row, pool};
    }).filter(row => row.pool.length);
    return {lows, highs, tier, reason:lows.length ? '' : '최저 등급 줄의 자리에 붙을 수 있는 해당 계열 옵션이 없습니다.'};
}

function finishTargets(env, item, key, variant) {
    const rows = finishOrdinaryRows(env, item);
    if (key === 'balanceWeight') return balanceTargets(env, item, rows, variant);
    if (key === 'transferStone' && !craftAffixRoom(env, item).prefix) return {reason:'빈 접두어 자리가 필요합니다.'};
    const side = {transferStone:'suffix',artManual:'prefix'}[key];
    const lows = rows.filter(row => !side || row.mod.type === side);
    return {lows, highs:undefined, tier:undefined, reason:lows.length ? '' : '선택할 수 있는 일반 옵션이 없습니다.'};
}

export function finishInspectItem(env, owner, item, key, variant) {
    if (!Object.hasOwn(finishRules, key)) return {reason:'재료 종류를 선택하세요.'};
    const block = equipmentReason(env, owner, item, key);
    if (block) return {reason:block};
    if (!Object.hasOwn(finishRules[key].variants, variant)) return {reason:'재료 종류를 선택하세요.'};
    const plan = finishTargets(env, item, key, variant);
    const held = finishHeld(owner.currencies, key, variant);
    return {...plan, reason:held < 1 ? env.deps._t('{name} 부족 ({held}/1)', {name:env.deps._t(env.deps.ORB_DB[key].name), held}) : plan.reason};
}

function replacement(env, key, variant, low, tier) {
    if (key === 'transferStone') return {...low.stat, craftSource:key};
    if (key === 'balanceWeight') return {...env.deps.rollAffixValueInTierRange(env.deps.pickWeightedMod(low.pool), tier, tier), craftSource:key};
    if (key === 'artManual') {
        const book = finishBooks[variant];
        const val = 16 + Math.floor(Math.random() * 9);
        return {id:book.stat, statName:book.label, val, valMin:16, valMax:24, tier:low.stat.tier, craftSource:key};
    }
    return {id:'wardCraftBlock', statName:'기본 재화로 옵션 추가 시 '+finishRules[key].variants[variant]+' 옵션 제외',
        val:0, valMin:0, valMax:0, tier:low.stat.tier, craftSource:key, finishVariant:variant, finishSide:low.mod.type};
}

export function finishApplyToItem(env, owner, item, key, choice) {
    const {variant, low, high} = choice || {};
    const plan = finishInspectItem(env, owner, item, key, variant);
    if (plan.reason) return {ok:false, reason:plan.reason};
    const donor = plan.lows.find(row => row.index === low), penalty = plan.highs?.find(row => row.index === high);
    if (!donor || (plan.highs && !penalty)) return {ok:false,reason:'대상 옵션을 선택하세요.'};
    const stats = item.stats.slice();
    stats[low] = replacement(env, key, variant, donor, plan.tier);
    if (penalty) stats[high] = env.deps.rollAffixValueInTierRange(penalty.mod, penalty.stat.tier - 1, penalty.stat.tier - 1);
    const draft = {...item, stats};
    env.deps.updateItemName(draft);
    item.stats = stats;
    item.name = draft.name;
    owner.currencies[finishWalletKey(key, variant)]--;
    return {ok:true};
}
