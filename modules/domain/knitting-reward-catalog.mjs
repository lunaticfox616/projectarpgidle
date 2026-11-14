import { threadRewardUniquePool, threadRewardNamedUniqueGrade } from './knitting-reward-gear.mjs';

/** Catalogue reward checks: exactly one reward family per row, real currency/base/unique IDs, non-empty unique pools. */
/** 뜨개질 자체의 선행 해금(after/requires를 거슬러 올라간 것): 뜨개질이 열려 있으면 언제나 열려 있다. 행의 unlocks는 거슬러 올라가지 않는다. */
export function threadRewardKnittingPrerequisites(env) {
    const defs = new Map(env.deps.CONTENT_UNLOCK_CATALOG.map(row => [row.id, row])), out = new Set(), queue = ['knitting'];
    while (queue.length) {
        const id = queue.pop();
        if (out.has(id) || !defs.has(id)) continue;
        out.add(id);
        const def = defs.get(id);
        queue.push(...[def.after, ...(def.requires || [])].filter(Boolean));
    }
    return out;
}

export function threadRewardCurrencyProblems(env, row, implied) {
    const own = new Set([...implied, ...(row.unlocks || [])]);
    const seeds = (row.reward.seeds || []).filter(([color, n]) => !Object.hasOwn(env.deps.STUMP_BOX_COLORS, color) || !Number.isInteger(n) || n < 1)
        .map(([color]) => `${row.id}: 씨앗 ${color}`);
    return seeds.concat((row.reward.currencies || row.reward.pickCurrencies || []).flatMap(([key, n]) => {
        const def = env.deps.ORB_DB[env.deps.getCanonicalCurrencyKey(key)];
        if (!def || !Number.isInteger(n) || n < 1) return [env.deps._t('{id}: 재화 {key}', { id: row.id, key })];
        const need = def.dropUnlocks || [];
        return need.length && !need.some(id => own.has(id)) ? [env.deps._t('{id}: {key}의 해금 {need} 누락', { id: row.id, key, need: need.join('|') })] : [];
    }));
}

export function threadRewardYarnsProblems(env, row) {
    const n = row.reward.yarns;
    return Number.isInteger(n) && n >= 1 && n <= 3 ? [] : [env.deps._t('{id}: 반환 수', { id: row.id })];
}

export function threadRewardTierProblems(env, row) {
    const tier = row.reward.tier;
    return Number.isInteger(tier) && tier >= 1 && tier <= 20 ? [] : [env.deps._t('{id}: 보상 등급 {tier}', { id: row.id, tier })];
}

/** 고유 풀이 비지 않았는지, 이름 지정 고유면 세트 등급이 그 고유의 띠와 맞는지. */
export function threadRewardUniqueProblems(env, row) {
    const reward = row.reward, pool = threadRewardUniquePool(env, reward, null);
    if (!pool.length) return [env.deps._t('{id}: 고유 풀이 비어 있음', { id: row.id })];
    if (reward.uniquePool === 'chase' && (row.grade !== 5 || row.yarnOut !== false)) return [env.deps._t('{id}: 극희귀 보상은 5등급, 반환 제외여야 함', { id: row.id })];
    const want = reward.unique ? threadRewardNamedUniqueGrade(env, pool[0]) : row.grade;
    return want === row.grade ? [] : [env.deps._t('{id}: 「{unique}」 기준 등급 {want}, 세트 등급 {grade}', { id: row.id, unique: reward.unique, want, grade: row.grade })];
}

/** 장비 계열(고유·희귀 장비)은 보상 등급을 먼저 본다: 등급이 틀리면 그 한 줄만. */
export function threadRewardEquipmentProblems(env, family, row) {
    const tier = threadRewardTierProblems(env, row);
    if (tier.length) return tier;
    return family === 'unique' ? threadRewardUniqueProblems(env, row) : threadRewardGearProblems(env, row);
}

export function threadRewardFamilyProblems(env, family, row, implied) {
    if (family === 'currencies') return threadRewardCurrencyProblems(env, row, implied);
    if (family === 'yarns') return threadRewardYarnsProblems(env, row);
    if (family === 'maps') {
        const rule = row.reward.maps;
        return rule.count === 2 && rule.rarity === 'rare' && rule.tierUp === 1 ? [] : [env.deps._t('{id}: 지도석 규격', { id: row.id })];
    }
    return threadRewardEquipmentProblems(env, family, row);
}

export function threadRewardRewardProblems(env) {
    const implied = threadRewardKnittingPrerequisites(env);
    return env.deps.KNITTING.list.flatMap(row => {

        const families = [...new Set(Object.keys(row.reward || {}).map(key => env.FAMILIES[key]).filter(Boolean))];
        return families.length === 1 ? threadRewardFamilyProblems(env, families[0], row, implied) : [env.deps._t('{id}: 보상 종류 {families}', { id: row.id, families: families.join(',') || env.deps._t('없음') })];
    });
}

export function threadRewardGearProblems(env, row) {
    const gear = row.reward.gear, slots = new Set(env.deps.BASE_ITEM_DB.map(base => base.slot));
    if (gear.slots && !gear.slots.every(slot => slots.has(slot))) return [env.deps._t('{id}: 부위', { id: row.id })];
    const open = env.deps.BASE_ITEM_DB.some(base => base.id === gear.base && !base.dropOnly && !base.realmBase && base.reqTier <= row.reward.tier);
    return gear.base && !open ? [env.deps._t('{id}: 베이스 {base}', { id: row.id, base: gear.base })] : [];
}

export function threadRewardCatalogProblems(env) { return env.deps.knitting.structureProblems().concat(threadRewardRewardProblems(env)); }
