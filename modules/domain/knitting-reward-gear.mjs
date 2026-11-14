

export function threadRewardPick(rows, random) { return rows[Math.floor(random() * rows.length)]; }

export function threadRewardBasesFor(env, gear, tier, state, slot) {
    let pool = env.deps.BASE_ITEM_DB.filter(base => !base.dropOnly && !base.realmBase && base.reqTier <= tier);
    if (gear.base) return pool.filter(base => base.id === gear.base);
    if (slot) pool = pool.filter(base => base.slot === slot);
    else if (gear.slots) pool = pool.filter(base => gear.slots.includes(base.slot));
    if (gear.classWeapon) pool = env.deps.keepWeaponCategoryBases(pool.filter(base => base.slot === '무기'), env.deps.HANA_WEAPON_COMBOS.classWeapons[state.selectedClassId]);
    const near = pool.filter(base => base.reqTier >= tier - env.deps.BASE_DROP_WEIGHTS.windowTiers);
    return near.length ? near : pool;
}

/** 선택형(부위 목록)은 부위를 먼저 같은 확률로 고르고 그 안에서 베이스를 고른다: 베이스가 많은 부위가 더 자주 나오지 않는다. */
export function threadRewardPickBase(env, gear, tier, state, random) {
    const slots = (gear.slots || [null]).filter(slot => threadRewardBasesFor(env, gear, tier, state, slot).length);
    if (!slots.length) return null;
    return threadRewardPick(threadRewardBasesFor(env, gear, tier, state, threadRewardPick(slots, random)), random);
}

/** 화석 전용 옵션 한 줄: 공용 getFossilExclusivePool 계약 그대로(화석 전용끼리만 중복을 막고, 같은 효과의 일반 추가 옵션과는 공존한다).
 * 일반 옵션 한 줄을 대신하므로 마지막 일반 줄을 덜어 낸다. 풀이 비면 실패하고, 호출한 knit가 실타래와 아이템 id를 되돌린다. */
export function threadRewardFossilLine(env, item, random) {
    const mod = threadRewardPick(env.deps.getFossilExclusivePool(item), random);
    if (!mod) return false;
    if (item.stats.length) item.stats.pop();
    const roll = env.deps.rollAffixValueInTierRange(mod, Math.max(1, item.affixTierCap - 4), item.affixTierCap);
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    return true;
}

export function threadRewardGearReward(env, state, reward, random) {
    const base = threadRewardPickBase(env, reward.gear, reward.tier, state, random);
    if (!base) return null;
    const item = env.deps.createItemFromBase(base, 'rare', reward.tier, { affixTierCap: Math.min(20, reward.tier), affixTierFloor: Math.max(1, reward.tier - 4) });
    if (reward.gear.fossil && !threadRewardFossilLine(env, item, random)) return null;
    if (reward.gear.influence) {
        env.deps.itemInfluences.stampInfluence(item, reward.gear.influence, random);
        if (!item.stats.some(stat => env.deps.itemInfluences.lineInfluence(stat) === reward.gear.influence)) return null;
    }
    env.deps.updateItemName(item);
    env.deps.normalizeItem(item);
    return item;
}

/** 고유 보상 풀. state가 없으면(카탈로그 검사) 해금 검사만 건너뛴다. */
/** 고유 보상 후보. 극희귀·도감 전용·잠긴 콘텐츠·허용 목록 밖 출처 전용 고유는 들어오지 않는다. 보상 등급 근처로 좁히지 않는다:
 * 보상 등급까지의 모든 후보가 남고, 가치 차이는 uniqueWeight가 확률로 나눈다. state가 없으면(카탈로그 검사) 해금 검사를 건너뛴다. */
export function threadRewardUniquePool(env, reward, state) {
    const chase = reward.uniquePool === 'chase';
    const rows = env.deps.UNIQUE_DB.filter(row => !!row.ultraRare === chase && !row.realmCodexOnly && env.deps.uniqueMeetsTier(row, reward.tier)
        && (!state || env.deps.contentProgression.canDropUnique(row, state)));
    if (reward.unique) return rows.filter(row => row.name === reward.unique);
    if (!env.deps.KNITTING.uniquePools.includes(reward.uniquePool)) return [];
    return rows.filter(row => ['general', 'chase'].includes(reward.uniquePool) ? !row.dropOnly : row.dropOnly?.type === reward.uniquePool);
}

/** 고유의 희귀도 = reqTier 띠(KNITTING.uniqueBand.step 단위). 같은 띠는 같은 확률, 띠가 하나 오를 때마다 decay배.
 * 첨부 효과를 검토해 단계보다 강한 고유는 bump만큼 띠를 올린다(이름과 사유는 데이터에). */
/** 고유의 희귀도 띠: reqTier 띠(KNITTING.uniqueBand.step 단위)에 검토한 bump를 더한다. */
export function threadRewardUniqueBandOf(env, row) { return Math.floor(((row.reqTier || 1) - 1) / env.deps.KNITTING.uniqueBand.step) + (env.deps.KNITTING.uniqueBand.bump[row.name]?.[0] || 0); }

/** 같은 띠는 같은 확률, 띠가 하나 오를 때마다 decay배. */
export function threadRewardUniqueWeight(env, row) { return Math.pow(env.deps.KNITTING.uniqueBand.decay, threadRewardUniqueBandOf(env, row)); }

/** 이름 지정 고유의 세트 등급은 그 고유의 띠에서 정해진다: 띠 0은 2, 띠 1~2는 3, 띠 3 이상은 4. */
export function threadRewardNamedUniqueGrade(env, row) { const band = threadRewardUniqueBandOf(env, row); return band === 0 ? 2 : band <= 2 ? 3 : 4; }

export function threadRewardPickBy(rows, weightOf, random) {
    const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
    if (!(total > 0)) return null;
    let roll = random() * total;
    return rows.find(row => (roll -= weightOf(row)) < 0) || rows[rows.length - 1];
}

export function threadRewardUniqueReward(env, state, reward, random) {
    const def = threadRewardPickBy(threadRewardUniquePool(env, reward, state), (...args) => threadRewardUniqueWeight(env, ...args), random);
    if (!def) return null;
    // Forced named generation fixes the identity and explicit lines; only their permitted values roll.
    return env.deps.generateUniqueItem(reward.tier, def.slots[0], def.name, { type: def.dropOnly?.type || 'act', id: def.dropOnly?.id });
}
