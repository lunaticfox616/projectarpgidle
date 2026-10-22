/** Typed reward planning for knitting. All equipment paths make exactly one item, with no random rare→unique promotion.
 * 무작위 안에서도 같은 희귀도는 같은 확률이고 더 좋은 것이 더 흔하지 않다: 선택형 부위는 부위를 먼저 같은 확률로, 베이스와 일반 고유는
 * 보상 등급 근처 창 안에서 같은 확률로 고른다. 극희귀·도감 전용·잠긴 콘텐츠·출처 전용(허용 목록 밖) 보상은 들어오지 않는다. */
const knittingRewards = (() => {
    const pick = (rows, random) => rows[Math.floor(random() * rows.length)];
    const FAMILIES = Object.freeze({ currencies: 'currencies', gear: 'gear', unique: 'unique', uniquePool: 'unique', yarns: 'yarns' });
    function basesFor(gear, tier, state, slot) {
        let pool = BASE_ITEM_DB.filter(base => !base.dropOnly && !base.realmBase && base.reqTier <= tier);
        if (gear.base) return pool.filter(base => base.id === gear.base);
        if (slot) pool = pool.filter(base => base.slot === slot);
        else if (gear.slots) pool = pool.filter(base => gear.slots.includes(base.slot));
        if (gear.classWeapon) pool = keepWeaponCategoryBases(pool.filter(base => base.slot === '무기'), HANA_WEAPON_COMBOS.classWeapons[state.selectedClassId]);
        const near = pool.filter(base => base.reqTier >= tier - BASE_DROP_WEIGHTS.windowTiers);
        return near.length ? near : pool;
    }
    /** 선택형(부위 목록)은 부위를 먼저 같은 확률로 고르고 그 안에서 베이스를 고른다: 베이스가 많은 부위가 더 자주 나오지 않는다. */
    function pickBase(gear, tier, state, random) {
        const slots = (gear.slots || [null]).filter(slot => basesFor(gear, tier, state, slot).length);
        if (!slots.length) return null;
        return pick(basesFor(gear, tier, state, pick(slots, random)), random);
    }
    /** 화석 전용 옵션 한 줄: 공용 getFossilExclusivePool 계약 그대로(화석 전용끼리만 중복을 막고, 같은 효과의 일반 추가 옵션과는 공존한다).
     * 일반 옵션 한 줄을 대신하므로 마지막 일반 줄을 덜어 낸다. 풀이 비면 실패하고, 호출한 knit가 실타래와 아이템 id를 되돌린다. */
    function fossilLine(item, random) {
        const mod = pick(getFossilExclusivePool(item), random);
        if (!mod) return false;
        if (item.stats.length) item.stats.pop();
        const roll = rollAffixValueInTierRange(mod, Math.max(1, item.affixTierCap - 4), item.affixTierCap);
        roll.fossilExclusiveDrop = true;
        item.stats.push(roll);
        return true;
    }
    function gearReward(state, reward, random) {
        const base = pickBase(reward.gear, reward.tier, state, random);
        if (!base) return null;
        const item = createItemFromBase(base, 'rare', reward.tier, { affixTierCap: Math.min(20, reward.tier), affixTierFloor: Math.max(1, reward.tier - 4) });
        if (reward.gear.fossil && !fossilLine(item, random)) return null;
        if (reward.gear.influence) {
            itemInfluences.stampInfluence(item, reward.gear.influence, random);
            if (!item.stats.some(stat => itemInfluences.lineInfluence(stat) === reward.gear.influence)) return null;
        }
        updateItemName(item);
        normalizeItem(item);
        return item;
    }
    /** 고유 보상 풀. state가 없으면(카탈로그 검사) 해금 검사만 건너뛴다. */
    /** 고유 보상 후보. 극희귀·도감 전용·잠긴 콘텐츠·허용 목록 밖 출처 전용 고유는 들어오지 않는다. 보상 등급 근처로 좁히지 않는다:
     * 보상 등급까지의 모든 후보가 남고, 가치 차이는 uniqueWeight가 확률로 나눈다. state가 없으면(카탈로그 검사) 해금 검사를 건너뛴다. */
    function uniquePool(reward, state) {
        const rows = UNIQUE_DB.filter(row => !row.ultraRare && !row.realmCodexOnly && uniqueMeetsTier(row, reward.tier)
            && (!state || contentProgression.canDropUnique(row, state)));
        if (reward.unique) return rows.filter(row => row.name === reward.unique);
        if (!KNITTING.uniquePools.includes(reward.uniquePool)) return [];
        return rows.filter(row => reward.uniquePool === 'general' ? !row.dropOnly : row.dropOnly?.type === reward.uniquePool);
    }
    /** 고유의 희귀도 = reqTier 띠(KNITTING.uniqueBand.step 단위). 같은 띠는 같은 확률, 띠가 하나 오를 때마다 decay배.
     * 첨부 효과를 검토해 단계보다 강한 고유는 bump만큼 띠를 올린다(이름과 사유는 데이터에). */
    /** 고유의 희귀도 띠: reqTier 띠(KNITTING.uniqueBand.step 단위)에 검토한 bump를 더한다. */
    const uniqueBandOf = row => Math.floor(((row.reqTier || 1) - 1) / KNITTING.uniqueBand.step) + (KNITTING.uniqueBand.bump[row.name]?.[0] || 0);
    /** 같은 띠는 같은 확률, 띠가 하나 오를 때마다 decay배. */
    const uniqueWeight = row => Math.pow(KNITTING.uniqueBand.decay, uniqueBandOf(row));
    /** 이름 지정 고유의 세트 등급은 그 고유의 띠에서 정해진다: 띠 0은 2, 띠 1~2는 3, 띠 3 이상은 4. */
    const namedUniqueGrade = row => { const band = uniqueBandOf(row); return band === 0 ? 2 : band <= 2 ? 3 : 4; };
    function pickBy(rows, weightOf, random) {
        const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
        if (!(total > 0)) return null;
        let roll = random() * total;
        return rows.find(row => (roll -= weightOf(row)) < 0) || rows[rows.length - 1];
    }
    function uniqueReward(state, reward, random) {
        const def = pickBy(uniquePool(reward, state), uniqueWeight, random);
        if (!def) return null;
        // Forced named generation fixes the identity and explicit lines; only their permitted values roll.
        return generateUniqueItem(reward.tier, def.slots[0], def.name, { type: def.dropOnly?.type || 'act', id: def.dropOnly?.id });
    }
    const isEquipmentReward = reward => !!(reward.gear || reward.unique || reward.uniquePool);
    /** 장비 결과(기존 순서: 희귀 장비 다음 고유. 둘 다 있으면 고유가 덮는다, 난수도 이 순서로 쓴다). 장비 보상이 아니면 null. */
    function plannedItem(state, reward, random) {
        let item = null;
        if (reward.gear) item = gearReward(state, reward, random);
        if (reward.unique || reward.uniquePool) item = uniqueReward(state, reward, random);
        return item;
    }
    const plannedCurrencies = reward => (reward.currencies || []).map(([key, n]) => [getCanonicalCurrencyKey(key), n]);
    // 창공석은 재화 칸이 아니라 창공의 탑 상태에 쌓인다(js/passives.js commitCurrencyGain, js/exploration-ground-loot.js settleRow)
    const SKY_POWER = 'condensedSkyPower';
    const heldCurrency = (state, key) => (key === SKY_POWER ? (state.skyTower && state.skyTower.condensedPower) : state.currencies[key]) || 0;
    const plannedYarns = (state, row, random) => Array.from({ length: row.reward.yarns || 0 }, () => knitting.pickYarn(state, row.id, random));
    /** 장비 → 재화 → 반환 실타래 순으로 계획한다. 장비 보상인데 장비가 없거나 반환할 실타래가 없으면 null(아무것도 쓰지 않는다). */
    function plan(state, row, random) {
        const reward = row.reward, item = plannedItem(state, reward, random);
        if (isEquipmentReward(reward) && !item) return null;
        const made = { currencies: plannedCurrencies(reward), yarns: plannedYarns(state, row, random), item };
        return made.yarns.includes(null) ? null : made;
    }
    function reason(state, made) {
        if (!made) return '현재 보상 풀에 맞는 아이템이 없습니다. 실타래는 유지됩니다.';
        if (made.item && !canStoreEquipmentItems([made.item], state)) return '장비 보관함에 빈자리가 필요합니다.';
        if (made.currencies.some(([key]) => !contentProgression.canDropCurrency(key, state))) return '보상 재화의 콘텐츠를 먼저 해금하세요.';
        if (made.currencies.some(([key, n]) => !ORB_DB[key] || !Number.isSafeInteger(heldCurrency(state, key) + n))) return '재화를 더 보관할 수 없습니다.';
        const counts = {};
        for (const id of made.yarns) counts[id] = (counts[id] || 0) + 1;
        return Object.entries(counts).some(([id, n]) => (state.knitting.counts[id] || 0) + n > KNITTING.countCap) ? '실타래 보관 수량이 가득 찼습니다.' : '';
    }
    /** Prepare the entire exchange on copies. No notification or acquisition callback can run between spending and granting. */
    function commit(state, row, made) {
        const next = { ...state, currencies: { ...state.currencies }, inventory: state.inventory.slice(),
            knitting: { ...state.knitting, counts: { ...state.knitting.counts }, knitted: { ...state.knitting.knitted }, seen: state.knitting.seen.slice() } };
        next.knitting.counts[row.id] -= row.set;
        next.knitting.knitted[row.id] = (next.knitting.knitted[row.id] || 0) + 1;
        if (made.item) next.inventory.push(made.item);
        let skyPower = 0;
        for (const [key, n] of made.currencies) {
            if (key === SKY_POWER) skyPower += n;
            else next.currencies[key] = (next.currencies[key] || 0) + n;
        }
        made.yarns.forEach(id => knitting.receive(next, id));
        Object.assign(state, { currencies: next.currencies, inventory: next.inventory, knitting: next.knitting });
        if (skyPower) state.skyTower.condensedPower = heldCurrency(state, SKY_POWER) + skyPower;
        state.currencyDropVersion = (Number(state.currencyDropVersion) || 0) + made.currencies.length;
        state.noti.items = true;
    }

    /** Catalogue reward checks: exactly one reward family per row, real currency/base/unique IDs, non-empty unique pools. */
    /** 뜨개질 자체의 선행 해금(after/requires를 거슬러 올라간 것): 뜨개질이 열려 있으면 언제나 열려 있다. 행의 unlocks는 거슬러 올라가지 않는다. */
    function knittingPrerequisites() {
        const defs = new Map(CONTENT_UNLOCK_CATALOG.map(row => [row.id, row])), out = new Set(), queue = ['knitting'];
        while (queue.length) {
            const id = queue.pop();
            if (out.has(id) || !defs.has(id)) continue;
            out.add(id);
            const def = defs.get(id);
            queue.push(...[def.after, ...(def.requires || [])].filter(Boolean));
        }
        return out;
    }
    function currencyProblems(row, implied) {
        const own = new Set([...implied, ...(row.unlocks || [])]);
        return row.reward.currencies.flatMap(([key, n]) => {
            const def = ORB_DB[getCanonicalCurrencyKey(key)];
            if (!def || !Number.isInteger(n) || n < 1) return [`${row.id}: 재화 ${key}`];
            const need = def.dropUnlocks || [];
            return need.length && !need.some(id => own.has(id)) ? [`${row.id}: ${key}의 해금 ${need.join('|')} 누락`] : [];
        });
    }
    function yarnsProblems(row) {
        const n = row.reward.yarns;
        return Number.isInteger(n) && n >= 1 && n <= 3 ? [] : [`${row.id}: 반환 수`];
    }
    function tierProblems(row) {
        const tier = row.reward.tier;
        return Number.isInteger(tier) && tier >= 1 && tier <= 20 ? [] : [`${row.id}: 보상 등급 ${tier}`];
    }
    /** 고유 풀이 비지 않았는지, 이름 지정 고유면 세트 등급이 그 고유의 띠와 맞는지. */
    function uniqueProblems(row) {
        const reward = row.reward, pool = uniquePool(reward, null);
        if (!pool.length) return [`${row.id}: 고유 풀이 비어 있음`];
        const want = reward.unique ? namedUniqueGrade(pool[0]) : row.grade;
        return want === row.grade ? [] : [`${row.id}: 「${reward.unique}」 기준 등급 ${want}, 세트 등급 ${row.grade}`];
    }
    /** 장비 계열(고유·희귀 장비)은 보상 등급을 먼저 본다: 등급이 틀리면 그 한 줄만. */
    function equipmentProblems(family, row) {
        const tier = tierProblems(row);
        if (tier.length) return tier;
        return family === 'unique' ? uniqueProblems(row) : gearProblems(row);
    }
    function familyProblems(family, row, implied) {
        if (family === 'currencies') return currencyProblems(row, implied);
        if (family === 'yarns') return yarnsProblems(row);
        return equipmentProblems(family, row);
    }
    function rewardProblems() {
        const implied = knittingPrerequisites();
        return KNITTING.list.flatMap(row => {

            const families = [...new Set(Object.keys(row.reward || {}).map(key => FAMILIES[key]).filter(Boolean))];
            return families.length === 1 ? familyProblems(families[0], row, implied) : [`${row.id}: 보상 종류 ${families.join(',') || '없음'}`];
        });
    }
    function gearProblems(row) {
        const gear = row.reward.gear, slots = new Set(BASE_ITEM_DB.map(base => base.slot));
        if (gear.slots && !gear.slots.every(slot => slots.has(slot))) return [`${row.id}: 부위`];
        const open = BASE_ITEM_DB.some(base => base.id === gear.base && !base.dropOnly && !base.realmBase && base.reqTier <= row.reward.tier);
        return gear.base && !open ? [`${row.id}: 베이스 ${gear.base}`] : [];
    }
    
    
    /** 세트 하나를 뜨개질한다: 모든 보상을 계획하고 자리를 확인한 뒤에만 수량을 쓴다. 실패하면 수량도 아이템 번호도 그대로다. */
    function knit(id, random = Math.random) {
        const blocked = knitting.reason(game, id);
        if (blocked) return { ok: false, reason: blocked };
        const row = knitting.row(id), counter = itemIdCounter;
        try {
            const made = plan(game, row, random), failure = reason(game, made);
            if (failure) { itemIdCounter = counter; return { ok: false, reason: failure }; }
            commit(game, row, made);
            return { ok: true, row, made };
        } catch (error) { itemIdCounter = counter; throw error; }
    }
    const catalogProblems = () => knitting.structureProblems().concat(rewardProblems());

    return Object.freeze({ plan, reason, commit, knit, catalogProblems, uniquePool, uniqueWeight, basesFor, rewardProblems });
})();
safeExposeGlobals({ knittingRewards });
