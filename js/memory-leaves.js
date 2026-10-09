/** 기억의 잎(data/memory-leaves.js, docs/endgame-loot-20261009.md 3절): 아틀라스 처치에서 잎이 나올지와 어떤 잎인지(rollKill), 받기
 * (receive), 엮기(weave), 저장 정리(normalize). 상태는 아틀라스 상태 안에 있어 루프를 넘어 남는다(game.atlas.leaves, js/atlas.js
 * defaults와 normalize). 처치 연결은 js/atlas-finds.js, 화면은 js/memory-leaves-ui.js. 난수는 인자로 받는다.
 */
const memoryLeaves = (() => {
    const BY_ID = new Map(MEMORY_LEAVES.list.map(leaf => [leaf.id, leaf]));
    const defaults = () => ({ counts: {}, seen: [], woven: {} });
    const store = state => state.atlas.leaves;
    const whole = (value, cap) => Math.max(0, Math.min(cap, Math.floor(Number(value) || 0)));

    /** Save boundary: known leaves only, whole counts under the cap; a counted leaf is always seen. */
    function normalize(raw) {
        const src = raw && typeof raw === 'object' ? raw : {}, out = defaults();
        for (const id of BY_ID.keys()) {
            const count = whole(src.counts && src.counts[id], MEMORY_LEAVES.countCap), woven = whole(src.woven && src.woven[id], 99999);
            if (count) out.counts[id] = count;
            if (woven) out.woven[id] = woven;
        }
        out.seen = [...new Set([...(Array.isArray(src.seen) ? src.seen : []), ...Object.keys(out.counts)])].filter(id => BY_ID.has(id));
        return out;
    }
    /** Where a leaf falls: the treasure carrier, a golden room monster, a map boss, its region's maps or any map. */
    function sourceMatches(source, zone, enemy) {
        if (source.treasure) return !!enemy.treasureCarrier;
        if (source.golden) return !!enemy.atlasGolden;
        if (source.boss) return !!enemy.isBoss;
        if (source.region) return zone.atlasRegion === source.region;
        return !!source.any;
    }
    /** The leaves a kill can drop: a treasure carrier or golden monster drops its own kind only. */
    function poolFor(zone, enemy) {
        const open = MEMORY_LEAVES.list.filter(leaf => (leaf.minTier || 0) <= (Number(zone.atlasTier) || 0) && sourceMatches(leaf.source, zone, enemy));
        const special = open.filter(leaf => leaf.source.treasure || leaf.source.golden);
        return special.length ? special : open;
    }
    const rankOf = enemy => (enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular');
    /** @returns {string|null} the leaf an atlas kill drops */
    function rollKill(zone, enemy, random) {
        if (!zone || zone.type !== 'atlasMap') return null;
        const chance = MEMORY_LEAVES.chance[rankOf(enemy)] * (enemy.treasureCarrier ? MEMORY_LEAVES.treasureMul : enemy.atlasGolden ? MEMORY_LEAVES.goldenMul : 1);
        if (random() >= chance) return null;
        const pool = poolFor(zone, enemy), total = pool.reduce((sum, leaf) => sum + leaf.weight, 0);
        let roll = random() * total;
        const pick = pool.find(leaf => (roll -= leaf.weight) < 0) || pool[pool.length - 1];
        return pick ? pick.id : null;
    }
    /** A picked-up leaf. @returns {{id,name,count,set,first,complete}|null} complete: this leaf filled its set now */
    function receive(state, id) {
        const leaf = BY_ID.get(id), st = store(state);
        if (!leaf) return null;
        const first = !st.seen.includes(id);
        if (first) st.seen.push(id);
        st.counts[id] = Math.min(MEMORY_LEAVES.countCap, (st.counts[id] || 0) + 1);
        return { id, name: leaf.name, count: st.counts[id], set: leaf.set, first, complete: st.counts[id] === leaf.set };
    }
    /** A leaf on the floor: a first sighting is a great find (js/loot.js lootMoments), any other leaf a good one. */
    const momentOf = (state, id) => (store(state).seen.includes(id) ? 'good' : 'great');
    /** Why a leaf cannot be woven now: unknown, not enough leaves, or no stash room for its map stones (the leaves would be spent). */
    function weaveReason(state, id) {
        const leaf = BY_ID.get(id);
        if (!leaf) return '없는 잎입니다.';
        if ((store(state).counts[id] || 0) < leaf.set) return `잎이 ${leaf.set}장 있어야 엮을 수 있습니다.`;
        const maps = leaf.reward.maps;
        return maps && state.atlas.stash.length + maps.count > ATLAS.stashCap ? '지도석 보관함에 자리가 모자랍니다.' : '';
    }
    /** A unique of the general pool by name, or a random chase unique, at its own tier. */
    function rewardUnique(reward) {
        const name = reward.chase ? rndChoice(UNIQUE_DB.filter(row => row.ultraRare && !row.dropOnly).map(row => row.name)) : reward.unique;
        return generateUniqueItem(20, null, name, {});
    }
    function grantCurrencies(rows) {
        return rows.map(([key, amount]) => [key, awardCurrency(key, amount)]).filter(([, gain]) => gain > 0);
    }
    /** Grants a reward; @returns {{currencies:Array<[string,number]>, items:object[], maps:object[]}} */
    function grantLeafReward(state, reward, random) {
        const out = { currencies: [], items: [], maps: [] };
        if (reward.currency) out.currencies = grantCurrencies(reward.currency);
        if (reward.pick) out.currencies = grantCurrencies([reward.pick[Math.floor(random() * reward.pick.length)]]);
        if (reward.unique || reward.chase) out.items.push(rewardUnique(reward));
        if (reward.gear) out.items.push(...Array.from({ length: reward.gear.count }, () => generateEquipmentDrop({ isBoss: true },
            { slot: reward.gear.slot, minimumRarity: reward.gear.rarity, zone: atlas.rewardZone(state) })));
        if (reward.maps) out.maps = atlas.rewardMaps(state, reward.maps, random);
        out.items.forEach(item => addItemToInventory(item, { guaranteedKeep: true }));
        return out;
    }
    /** Spends a full set for its reward. @returns {{ok:boolean, reason?:string, leaf?:object, granted?:object}} */
    function weaveLeafSet(state, id, random = Math.random) {
        const reason = weaveReason(state, id);
        if (reason) return { ok: false, reason };
        const leaf = BY_ID.get(id), st = store(state);
        st.counts[id] -= leaf.set;
        if (!st.counts[id]) delete st.counts[id];
        st.woven[id] = (st.woven[id] || 0) + 1;
        return { ok: true, leaf, granted: grantLeafReward(state, leaf.reward, random) };
    }
    /** The reward in words for the leaf book (UI). */
    function rewardText(leaf) {
        const reward = leaf.reward, name = key => (ORB_DB[key] ? ORB_DB[key].name : key);
        if (reward.currency) return reward.currency.map(([key, n]) => `${name(key)} ${n}`).join(', ');
        if (reward.pick) return `${reward.pick.map(([key]) => name(key).replace('그림자 뿌리 입장권: ', '')).join('/')} 입장권 하나`;
        if (reward.unique) return `고유 「${reward.unique}」`;
        if (reward.gear) return `${ITEM_RARITY_LABELS[reward.gear.rarity]} ${reward.gear.slot} ${reward.gear.count}개`;
        if (reward.maps) return `${ATLAS.rarities[reward.maps.rarity].name} 지도석 ${reward.maps.count}개(최고 등급 +${reward.maps.tierUp})`;
        return reward.chase ? '체이싱 고유 하나' : '';
    }
    /** Where the leaf falls, in words. */
    function sourceText(leaf) {
        const source = leaf.source, tier = leaf.minTier ? `, ${leaf.minTier}등급 이상` : '';
        if (source.region) return `${(ATLAS.regions.find(row => row.id === source.region) || {}).name} 지도${tier}`;
        if (source.boss) return `지도 보스${tier}`;
        if (source.golden) return `황금 방${tier}`;
        if (source.treasure) return `보물 무리${tier}`;
        return `어느 지도나${tier}`;
    }
    return Object.freeze({ defaults, normalize, rollKill, receive, momentOf, weaveReason, weaveLeafSet, rewardText, sourceText,
        leaf: id => BY_ID.get(id) || null, validId: id => BY_ID.has(id), list: MEMORY_LEAVES.list });
})();
safeExposeGlobals({ memoryLeaves });
