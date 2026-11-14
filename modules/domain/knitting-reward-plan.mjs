import { threadRewardGearReward, threadRewardUniqueReward, threadRewardPick } from './knitting-reward-gear.mjs';

export function threadRewardIsEquipmentReward(reward) { return !!(reward.gear || reward.unique || reward.uniquePool); }

/** 장비 결과(기존 순서: 희귀 장비 다음 고유. 둘 다 있으면 고유가 덮는다, 난수도 이 순서로 쓴다). 장비 보상이 아니면 null. */
export function threadRewardPlannedItem(env, state, reward, random) {
    let item = null;
    if (reward.gear) item = threadRewardGearReward(env, state, reward, random);
    if (reward.unique || reward.uniquePool) item = threadRewardUniqueReward(env, state, reward, random);
    return item;
}

export function threadRewardPlannedCurrencies(env, reward, random) { return (reward.pickCurrencies ? [threadRewardPick(reward.pickCurrencies, random)] : reward.currencies || [])
    .map(([key, n]) => [env.deps.getCanonicalCurrencyKey(key), n]); }

export function threadRewardHeldCurrency(env, state, key) { return (key === env.SKY_POWER ? (state.skyTower && state.skyTower.condensedPower) : state.currencies[key]) || 0; }

/** 그루터기 함 씨앗 보상 [색, 개수](data/knitting.js reward.seeds). 품질은 수확 일지 선물과 같은 드랍 최고다. */
export function threadRewardPlannedSeeds(reward) { return (reward.seeds || []).map(([color, n]) => [color, n]); }

export function threadRewardPlannedYarns(env, state, row, random) { return Array.from({ length: row.reward.yarns || 0 }, () => env.deps.knitting.pickYarn(state, row.id, random)); }

/** 지도석도 복사본에서 먼저 만든다. 두 칸이 없으면 하나만 지급하거나 실타래를 차감하지 않는다. */
export function threadRewardPlannedMaps(env, state, rule, random) {
    if (!rule) return null;
    if (!state.atlas.unlocked || state.atlas.stash.length + rule.count > env.deps.ATLAS.stashCap) return null;
    const copy = { ...state, atlas: JSON.parse(JSON.stringify(state.atlas)) };
    const maps = env.deps.atlas.rewardMaps(copy, rule, random);
    return maps.length === rule.count ? { maps, atlas: copy.atlas } : null;
}

/** 장비 → 재화 → 반환 실타래 순으로 계획한다. 장비 보상인데 장비가 없거나 반환할 실타래가 없으면 null(아무것도 쓰지 않는다). */
export function threadRewardPlan(env, state, row, random) {
    const reward = row.reward, item = threadRewardPlannedItem(env, state, reward, random);
    if (threadRewardIsEquipmentReward(reward) && !item) return null;
    const mapReward = threadRewardPlannedMaps(env, state, reward.maps, random);
    if (reward.maps && !mapReward) return { mapBlocked: true };
    const made = { currencies: threadRewardPlannedCurrencies(env, reward, random), seeds: threadRewardPlannedSeeds(reward), yarns: threadRewardPlannedYarns(env, state, row, random), item, mapReward };
    return made.yarns.includes(null) ? null : made;
}

/** 재화의 콘텐츠와 씨앗의 그루터기 함이 열렸는지: 막는 말, 또는 ''. */
export function threadRewardLockedReason(env, state, made) {
    if (made.currencies.some(([key]) => !env.deps.contentProgression.canDropCurrency(key, state))) return '보상 재화의 콘텐츠를 먼저 해금하세요.';
    return made.seeds.length && !(state.stumpBox && state.stumpBox.acquired) ? '보상 씨앗을 받으려면 그루터기 함을 먼저 얻으세요.' : '';
}

export function threadRewardReason(env, state, made) {
    if (!made) return '현재 보상 풀에 맞는 아이템이 없습니다. 실타래는 유지됩니다.';
    if (made.mapBlocked) return '아틀라스를 열고 지도석 보관함에 빈칸 두 개를 마련하세요. 실타래는 유지됩니다.';
    if (made.item && !env.deps.canStoreEquipmentItems([made.item], state)) return '장비 보관함에 빈자리가 필요합니다.';
    const locked = threadRewardLockedReason(env, state, made);
    if (locked) return locked;
    if (made.currencies.some(([key, n]) => !env.deps.ORB_DB[key] || !Number.isSafeInteger(threadRewardHeldCurrency(env, state, key) + n))) return '재화를 더 보관할 수 없습니다.';
    const counts = {};
    for (const id of made.yarns) counts[id] = (counts[id] || 0) + 1;
    return Object.entries(counts).some(([id, n]) => (state.knitting.counts[id] || 0) + n > env.deps.KNITTING.countCap) ? '실타래 보관 수량이 가득 찼습니다.' : '';
}
