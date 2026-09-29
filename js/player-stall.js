/**
 * Escrow and deterministic NPC visits, independent of combat speed and loot bonuses.
 * owner.playerStall: listings own their items exclusively; proceeds are unclaimed integer dew.
 * lastAt is a monotonic wall-clock watermark (UTC ms); nextVisitAt and rng survive reloads.
 */
const playerStall = (() => {
    const rules = PLAYER_STALL_RULES;
    const dewMs = 3600000 / rules.dewPerHour;
    function unlocked(owner) { return contentProgression.isUnlocked('market', owner); }
    function canManage(owner) { return !owner.woodsmanBuildLock && !owner.isBackgroundCalculation; }
    function validPrice(price) { return Number.isSafeInteger(price) && price >= 1 && price <= rules.maxAsk; }
    function validClock(stall, now) { return Number.isSafeInteger(now) && now >= 0 && now >= stall.lastAt; }
    function restricted(item) {
        return ['locked','tradeLocked','hallReplica','hallRelistBlocked','loopSealed'].some(key => item[key])
            || !!item.voidSocket?.jewel || !!item.abyssSockets?.some(socket => socket?.jewel);
    }
    function eligible(item, owner) {
        if (!item || !Number.isSafeInteger(item.id) || !itemAppraisal.quote(item)) return false;
        return !restricted(item) && !Object.values(owner.equipment).some(equipped => equipped?.id === item.id)
            && !equipmentLoadoutRuntime.isReferenced(item, owner);
    }
    function random(stall) {
        stall.rng = (Math.imul(stall.rng, 1664525) + 1013904223) >>> 0;
        return stall.rng / 4294967296;
    }
    function record(stall, event) {
        stall.history.unshift(event);
        stall.history.length = Math.min(stall.history.length, rules.historyLimit);
    }
    function chance(item, price, customer) {
        const value = itemAppraisal.quote(item);
        if (!value || price > value.ceiling) return 0;
        const ratio = price / value.fair;
        const interest = 0.45 + 0.55 * itemAppraisal.affinity(item, customer);
        return Math.min(0.95, Math.max(0.03, 1.2 - ratio * 0.7) * interest);
    }
    function visit(stall, at) {
        const customer = PLAYER_STALL_CUSTOMERS[Math.floor(random(stall) * PLAYER_STALL_CUSTOMERS.length)];
        const candidates = stall.listings.filter(row => at - row.listedAt >= rules.minimumAgeMs)
            .map(row => ({ row, chance: chance(row.item, row.price, customer) }))
            .sort((a, b) => b.chance - a.chance || a.row.id - b.row.id);
        const candidate = candidates.find(entry => entry.chance > 0 && entry.row.price * dewMs <= stall.budgetMs);
        if (!candidate || random(stall) >= candidate.chance) {
            record(stall, { at, customer: customer.name, sold: false,
                reason: candidates.some(entry => entry.chance > 0) ? '살 만한 물건을 둘러보고 떠났습니다.' : '가격표를 살펴보고 떠났습니다.' });
            return 0;
        }
        const listing = candidate.row;
        stall.budgetMs -= listing.price * dewMs;
        stall.proceeds += listing.price;
        stall.listings.splice(stall.listings.indexOf(listing), 1);
        record(stall, { at, customer: customer.name, sold: true, name: listing.item.name, price: listing.price });
        return listing.price;
    }
    function advance(owner, now) {
        const stall = owner.playerStall;
        if (!validClock(stall, now) || owner.isBackgroundCalculation || now === stall.lastAt) return 0;
        if (!stall.lastAt || !unlocked(owner)) {
            stall.lastAt = now; stall.nextVisitAt = now + rules.visitMs;
            return 0;
        }
        const end = Math.min(now, stall.lastAt + rules.offlineLimitMs);
        let cursor = stall.lastAt, paid = 0;
        for (let at = Math.max(stall.nextVisitAt, cursor + 1); at <= end && stall.listings.length; at += rules.visitMs) {
            stall.budgetMs = Math.min(rules.walletCap * dewMs, stall.budgetMs + at - cursor);
            paid += visit(stall, at); cursor = at;
            stall.nextVisitAt = at + rules.visitMs;
        }
        stall.budgetMs = Math.min(rules.walletCap * dewMs, stall.budgetMs + end - cursor);
        stall.lastAt = now;
        // Discard excess absence once, including its budget. Never replay the capped tail on reload.
        if (now > end || !stall.listings.length) stall.nextVisitAt = now + rules.visitMs;
        return paid;
    }
    function list(owner, itemId, price, now) {
        if (!unlocked(owner) || !canManage(owner)) return { ok: false, reason: '지금은 가판대를 이용할 수 없습니다.' };
        if (!validPrice(price)) return { ok: false, reason: '가격은 1~1,000,000 사이의 정수로 입력하세요.' };
        const item = owner.inventory.find(entry => entry.id === itemId), stall = owner.playerStall;
        if (!eligible(item, owner)) return { ok: false, reason: '잠금·장착·프리셋·주얼·거래 제한이 없는 장비를 선택하세요.' };
        if (stall.listings.length >= rules.slots) return { ok: false, reason: '가판대가 가득 찼습니다.' };
        if (!validClock(stall, now)) return { ok: false, reason: '기기의 시간을 확인해 주세요.' };
        advance(owner, now);
        stall.sequence++;
        owner.inventory.splice(owner.inventory.indexOf(item), 1);
        stall.listings.push({ id: stall.sequence, item, price, listedAt: now });
        if (stall.listings.length === 1) stall.nextVisitAt = now + rules.visitMs;
        return { ok: true };
    }
    function withdraw(owner, listingId) {
        if (!canManage(owner)) return { ok: false, reason: '지금은 회수할 수 없습니다.' };
        const stall = owner.playerStall, row = stall.listings.find(entry => entry.id === listingId);
        if (!row) return { ok: false, reason: '이미 판매되었거나 회수된 물건입니다.' };
        if (!canStoreEquipmentItems([row.item], owner)) return { ok: false, reason: '장비 보관함에 공간이 필요합니다. 물건은 가판대에 보관됩니다.' };
        owner.inventory.push(row.item);
        stall.listings.splice(stall.listings.indexOf(row), 1);
        return { ok: true };
    }
    function reprice(owner, listingId, price, now) {
        if (!canManage(owner) || !unlocked(owner)) return false;
        if (!validPrice(price)) return false;
        if (!validClock(owner.playerStall, now)) return false;
        advance(owner, now);
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        if (!row) return false;
        row.price = price; row.listedAt = now;
        return true;
    }
    /** Why a loop reset must wait, or '': the reset would delete listed gear or carry unclaimed dew across loops.
     * triggerSeasonReset refuses while this is non-empty; the loop screen shows the same sentence. */
    function loopBlockReason(owner) {
        const stall = owner.playerStall, parts = [];
        if (stall.listings.length) parts.push(`진열품 ${stall.listings.length}개`);
        if (stall.proceeds) parts.push(`판매 대금 이슬 ${stall.proceeds}개`);
        if (!parts.length) return '';
        return `가판대에 ${parts.join('와 ')}가 남아 있습니다. 장비 → 거래소 → 나의 가판대에서 회수한 뒤 루프를 진행하세요.`;
    }
    function collect(owner) {
        if (owner.isBackgroundCalculation) return 0;
        const amount = owner.playerStall.proceeds;
        if (!amount || !Number.isSafeInteger(owner.currencies.formlessDew + amount)) return 0;
        owner.currencies.formlessDew += amount;
        owner.playerStall.proceeds = 0;
        owner.currencyDropVersion = (owner.currencyDropVersion || 0) + 1;
        return amount;
    }
    function validListing(row, seen) {
        return Number.isSafeInteger(row.id) && row.id > 0 && !seen.listings.has(row.id)
            && validPrice(row.price) && !!itemAppraisal.quote(row.item);
    }
    function restoreListing(row, owner, seen) {
        if (!row?.item || !Number.isSafeInteger(row.item.id) || seen.items.has(row.item.id)) {
            console.warn('가판대 저장 오류: 장비가 없거나 이미 소유 중인 진열 정보를 제외했습니다.');
            return false;
        }
        seen.items.add(row.item.id);
        row.item = normalizeItem(row.item);
        if (!validListing(row, seen)) {
            owner.inventory.push(row.item);
            console.warn('가판대 저장 오류: 장비를 보관함으로 반환했습니다.');
            return false;
        }
        seen.listings.add(row.id);
        row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : owner.playerStall.lastAt;
        return true;
    }
    function restore(owner) {
        const source = owner.playerStall;
        const stall = { ...JSON.parse(JSON.stringify(defaultGame.playerStall)), ...(source && typeof source === 'object' ? source : {}) };
        for (const key of ['sequence','lastAt','nextVisitAt','proceeds']) {
            stall[key] = Number.isSafeInteger(stall[key]) && stall[key] >= 0 ? stall[key] : 0;
        }
        stall.version = 1;
        stall.budgetMs = Number.isSafeInteger(stall.budgetMs) ? Math.max(0, Math.min(rules.walletCap * dewMs, stall.budgetMs)) : 0;
        stall.rng = Number.isSafeInteger(stall.rng) ? stall.rng >>> 0 : 1357911;
        stall.history = Array.isArray(stall.history) ? stall.history.filter(event => event && Number.isFinite(event.at)).slice(0, rules.historyLimit) : [];
        owner.playerStall = stall;
        const owned = [getEquipmentLoadoutOwnedItems(owner), owner.equipmentTemporaryStorage,
            owner.timeRift.altarUnique, owner.timeRift.altarRare, owner.offlineProgress.stash, owner.offlineProgress.protectedOverflow,
            actExplorationLoot.reservedItems(owner)].flat().filter(Boolean);
        const seen = { items: new Set(owned.map(item => item.id)), listings: new Set() };
        stall.listings = (Array.isArray(stall.listings) ? stall.listings : []).filter(row => restoreListing(row, owner, seen));
        stall.sequence = Math.max(stall.sequence, ...seen.listings);
    }
    return Object.freeze({ unlocked, eligible, chance, advance, list, withdraw, reprice, collect, loopBlockReason, restore });
})();
safeExposeGlobals({ playerStall });
