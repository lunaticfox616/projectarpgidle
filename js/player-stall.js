/**
 * Escrow and deterministic NPC visits, independent of combat speed and loot bonuses.
 * owner.playerStall: listings own their items exclusively; proceedsKeys maps each currency to its integer unclaimed balance.
 * row.currency defines the integer units of row.price and row.offer.amount; missing legacy currency means dew.
 * advance/collect return a reporting-only dew equivalent. Stored currencies remain integers.
 * lastAt is a monotonic wall-clock watermark (UTC ms); nextVisitAt and rng survive reloads.
 * Arrivals are irregular; a crowd is 2..rules.maxCrowd sequential visitors at the same UTC ms.
 * Appraisals live only inside one synchronous settlement, never in saved state or across price edits.
 * Each visitor buys independently within the appraisal ceiling, without an accumulated shop-wide budget.
 * Pending offers never block buy-now purchases; whichever transaction sells the item first invalidates the others.
 * Legacy listings keep their negotiation opt-in. Listing age in ms increases interest up to matureAgeMs.
 * row.slot is the persistent physical display position (integer 0..rules.slots-1), independent of listing order.
 * priceChangedAt is UTC ms; repricing preserves listedAt and adds a short independent exposure delay.
 * sales contains read-only sold-item snapshots, never inventory or collectible currency.
 * @typedef {{id:number, amount:number, customerId:number, createdAt:number, expiresAt:number, buyerLimit:number, negotiated:boolean}} StallOffer
 */
const playerStall = (() => {
    const rules = PLAYER_STALL_RULES;
    function unlocked(owner) { return contentProgression.isUnlocked('market', owner); }
    function canManage(owner) { return !owner.woodsmanBuildLock && !owner.isBackgroundCalculation; }
    function validPrice(price) { return Number.isSafeInteger(price) && price >= 1 && price <= rules.maxAsk; }
    function validCurrency(currency) { return rules.currencies.includes(currency); }
    function bankKey(currency) { return rules.proceedsKeys[currency]; }
    function validClock(stall, now) { return Number.isSafeInteger(now) && now >= 0 && now >= stall.lastAt; }
    function validSlot(slot) { return Number.isInteger(slot) && slot >= 0 && slot < rules.slots; }
    function firstEmptySlot(occupied) {
        for (let slot = 0; slot < rules.slots; slot++) if (!occupied.has(slot)) return slot;
        return -1;
    }
    function listingPlacement(stall, options) {
        const settings = options && typeof options === 'object' ? options : { negotiate: options };
        const occupied = new Set(stall.listings.map(row => row.slot));
        const slot = Object.prototype.hasOwnProperty.call(settings, 'slot') ? settings.slot : firstEmptySlot(occupied);
        const currency = settings.currency === undefined ? 'formlessDew' : settings.currency;
        return { slot, currency, negotiate: settings.negotiate === true,
            available: validCurrency(currency) && validSlot(slot) && !occupied.has(slot) };
    }
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
    function visitDelay(stall) {
        // Hash the saved RNG without consuming it: listing/relisting cannot reroll buyer choices.
        let seed = stall.rng ^ 0x9e3779b9;
        seed = Math.imul(seed ^ seed >>> 16, 0x21f0aaad);
        seed = Math.imul(seed ^ seed >>> 15, 0x735a2d97);
        const roll = ((seed ^ seed >>> 15) >>> 0) / 4294967296;
        return Math.round(Math.min(rules.maxVisitMs, rules.minVisitMs - Math.log1p(-roll) * rules.visitSpreadMs));
    }
    function appraiseListings(stall) {
        return stall.listings.map(row => ({ row, value: itemAppraisal.quote(row.item, row.currency),
            fits: PLAYER_STALL_CUSTOMERS.map(customer => itemAppraisal.affinity(row.item, customer)) }));
    }
    function record(stall, event) {
        stall.history.unshift({ currency: 'formlessDew', ...event, id: ++stall.eventSequence });
        stall.history.length = Math.min(stall.history.length, rules.historyLimit);
    }
    function viewingInterest(price, fair, ageMs) {
        if (ageMs < rules.minimumAgeMs) return 0;
        const discount = Math.min(1, Math.max(0, 1 - price / fair) / rules.fullEarlyDiscount);
        const early = rules.earlyInterest + rules.earlyDiscountBoost * discount;
        const maturity = Math.min(1, (ageMs - rules.minimumAgeMs) / (rules.matureAgeMs - rules.minimumAgeMs));
        return early + (1 - early) * maturity;
    }
    /** Probability for one visit, with early discounted sales and a gradual rise at ordinary prices. */
    function chance(item, price, customer, currency = 'formlessDew', ageMs = rules.matureAgeMs) {
        const value = itemAppraisal.quote(item, currency);
        if (!value) return 0;
        return purchaseChance(value, price, itemAppraisal.affinity(item, customer), ageMs, customer);
    }
    function buyerLimit(value, fit, customer) {
        const preference = 0.88 + 0.12 * fit;
        const premium = fit >= 0.65 ? customer.premium : Math.min(1, customer.premium);
        return Math.min(value.ceiling, Math.max(1, Math.floor(value.fair * preference * premium)));
    }
    function readyAt(row) {
        return Math.max(row.listedAt + rules.minimumAgeMs, (row.priceChangedAt || row.listedAt) + rules.repriceDelayMs);
    }
    function validPriceChangeAt(row, lastAt) {
        return Number.isSafeInteger(row.priceChangedAt) && row.priceChangedAt >= row.listedAt && row.priceChangedAt <= lastAt;
    }
    function purchaseChance(value, price, fit, ageMs, customer) {
        if (!value || price > buyerLimit(value, fit, customer)) return 0;
        const ratio = price / value.fair;
        const interest = 0.45 + 0.55 * fit;
        const decision = Math.min(0.95, Math.max(0.03, 1.2 - ratio * 0.7) * interest) * value.demand;
        const perVisit = 1 - Math.pow(1 - decision, rules.visitMs / rules.decisionWindowMs);
        return Math.min(1, perVisit * viewingInterest(price, value.fair, ageMs) * customer.buyRate);
    }
    function releaseOffer(stall, row, at) {
        if (!row.offer) return;
        row.offer = null;
        stall.nextOfferAt = Math.max(stall.nextOfferAt, at + rules.offerCooldownMs);
    }
    function expireOffers(stall, at) {
        for (const row of stall.listings) {
            if (!row.offer || row.offer.expiresAt > at) continue;
            const deadline = row.offer.expiresAt;
            record(stall, { at: deadline, currency: row.currency, customer: PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
                sold: false, reason: `${row.item.name} 가격 제안의 기한이 지났습니다.` });
            releaseOffer(stall, row, deadline);
        }
    }
    function sell(stall, row, at, customer, amount) {
        const key = bankKey(row.currency);
        const index = stall.listings.indexOf(row);
        if (index < 0 || !Number.isSafeInteger(stall[key] + amount)) return 0;
        stall[key] += amount;
        stall.listings.splice(index, 1);
        const item = JSON.parse(JSON.stringify(row.item));
        stall.sales.unshift({ id: ++stall.saleSequence, at, listedAt: row.listedAt, currency: row.currency, customer, price: amount, item });
        stall.sales.length = Math.min(stall.sales.length, rules.salesLimit);
        record(stall, { at, kind: 'sale', slot: row.slot, currency: row.currency, customer, sold: true, name: row.item.name, price: amount });
        return amount * itemAppraisal.unitValue(row.currency);
    }
    function proposalCandidate(entry) {
        const { row, value, fit } = entry;
        if (!row.negotiate || row.offer || row.price <= 1) return null;
        if (value.marketValue < itemAppraisal.unitValue(row.currency)) return null;
        return { row, value, fit };
    }
    function propose(stall, candidates, customerId, at) {
        if (at < stall.nextOfferAt) return false;
        const customer = PLAYER_STALL_CUSTOMERS[customerId];
        const selected = candidates.map(proposalCandidate).filter(Boolean)
            .sort((a, b) => b.fit - a.fit || a.row.id - b.row.id)[0];
        if (!selected) return false;
        const { row, value, fit } = selected;
        const bargain = row.price <= value.fair ? rules.bargainOfferRate * row.price / value.fair : 1;
        const decision = Math.min(0.95, (0.35 + fit * 0.4) * value.demand * bargain * customer.offerRate);
        const probability = (1 - Math.pow(1 - decision, rules.visitMs / rules.decisionWindowMs))
            * viewingInterest(row.price, value.fair, at - row.listedAt);
        if (random(stall) >= probability) return false;
        const basis = Math.min(row.price, value.fair);
        // Partition one stored RNG draw: low bids do not reroll future visitors or accelerate sales.
        const roll = random(stall);
        const lowball = rules.lowballOfferRate * customer.lowballRate;
        const ratio = roll < lowball
            ? rules.lowballOfferMin + (rules.lowballOfferMax - rules.lowballOfferMin) * roll / lowball
            : 0.65 + fit * 0.2 + 0.1 * (roll - lowball) / (1 - lowball);
        const limit = buyerLimit(value, fit, customer);
        const amount = Math.min(row.price - 1, limit, Math.max(1, Math.floor(basis * ratio)));
        row.offer = { id: ++stall.offerSequence, amount, customerId, createdAt: at, expiresAt: at + rules.offerLifetimeMs, buyerLimit: limit, negotiated: false };
        stall.nextOfferAt = at + rules.offerCooldownMs;
        record(stall, { at, kind: 'offer', slot: row.slot, customerId, currency: row.currency, customer: customer.name, sold: false, reason: `${row.item.name}에 ${ORB_DB[row.currency].name} ${amount}개를 제안했습니다.` });
        return true;
    }
    function visit(stall, at, appraisals) {
        const customerId = Math.floor(random(stall) * PLAYER_STALL_CUSTOMERS.length);
        const customer = PLAYER_STALL_CUSTOMERS[customerId];
        const candidates = appraisals.filter(entry => stall.listings.includes(entry.row) && at >= readyAt(entry.row))
            .map(entry => ({ row: entry.row, value: entry.value, fit: entry.fits[customerId],
                chance: purchaseChance(entry.value, entry.row.price, entry.fits[customerId], at - entry.row.listedAt, customer) }))
            .sort((a, b) => b.chance - a.chance || a.row.id - b.row.id);
        const candidate = candidates.find(entry => entry.chance > 0);
        if (!candidate || random(stall) >= candidate.chance) {
            if (propose(stall, candidates, customerId, at)) return 0;
            record(stall, { at, kind: 'visit', customerId, slot: candidates[0]?.row.slot, nextSlot: candidates[1]?.row.slot,
                customer: customer.name, sold: false, reason: '물건을 둘러보고 떠났습니다.' });
            return 0;
        }
        return sell(stall, candidate.row, at, customer.name, candidate.row.price);
    }
    function bargainHeat(entry, at) {
        const { row, value } = entry;
        if (at < readyAt(row) || value.demand < rules.crowdMinDemand || row.price > value.ceiling) return 0;
        if (value.marketValue < rules.crowdMinMarketValue || Math.max(...entry.fits) < rules.crowdMinFit) return 0;
        return Math.max(0, 1 - row.price / value.fair / rules.crowdPriceRatio);
    }
    function arrival(stall, at, appraisals) {
        expireOffers(stall, at);
        const heat = Math.max(0, ...appraisals.filter(entry => stall.listings.includes(entry.row)).map(entry => bargainHeat(entry, at)));
        let visitors = 1;
        if (heat > 0) {
            const probability = rules.crowdBaseChance + heat * rules.crowdDiscountChance, roll = random(stall);
            if (roll < probability) visitors = 2 + Math.floor(roll / probability * (rules.maxCrowd - 1));
        }
        if (visitors > 1) record(stall, { at, kind: 'crowd', visitors, customer: '몰려든 손님들', sold: false,
            reason: `가격표를 본 손님 ${visitors}명이 한꺼번에 가판대 앞으로 모여들었습니다.` });
        let paid = 0;
        for (let index = 0; index < visitors; index++) paid += visit(stall, at, appraisals);
        return paid;
    }
    function finishVisits(stall, now, end) {
        stall.lastAt = now;
        expireOffers(stall, now);
        if (!stall.listings.length) stall.nextVisitAt = 0;
        // Discard excess absence once. Never replay the capped tail on reload.
        else if (now > end) stall.nextVisitAt = now + visitDelay(stall);
    }
    function advance(owner, now) {
        const stall = owner.playerStall;
        if (!validClock(stall, now) || owner.isBackgroundCalculation || now === stall.lastAt) return 0;
        if (!stall.lastAt || !unlocked(owner)) {
            stall.lastAt = now; stall.nextVisitAt = stall.listings.length ? now + visitDelay(stall) : 0;
            return 0;
        }
        const end = Math.min(now, stall.lastAt + rules.offlineLimitMs);
        const first = Math.max(stall.nextVisitAt, stall.lastAt + 1);
        const appraisals = first <= end ? appraiseListings(stall) : [];
        let paid = 0;
        for (let at = first; at <= end && stall.listings.length; at = stall.nextVisitAt) {
            paid += arrival(stall, at, appraisals);
            stall.nextVisitAt = at + visitDelay(stall);
        }
        finishVisits(stall, now, end);
        return paid;
    }
    function list(owner, itemId, price, now, negotiate = false) {
        if (!unlocked(owner) || !canManage(owner)) return { ok: false, reason: '지금은 가판대를 이용할 수 없습니다.' };
        if (!validPrice(price)) return { ok: false, reason: '가격은 1~1,000,000 사이의 정수로 입력하세요.' };
        const item = owner.inventory.find(entry => entry.id === itemId), stall = owner.playerStall;
        if (!eligible(item, owner)) return { ok: false, reason: '잠금, 장착, 프리셋, 주얼, 거래 제한이 없는 장비를 선택하세요.' };
        if (stall.listings.length >= rules.slots) return { ok: false, reason: '가판대가 가득 찼습니다.' };
        const placement = listingPlacement(stall, negotiate);
        if (!placement.available) return { ok: false, reason: '판매 재화와 진열할 빈칸을 확인해 주세요.' };
        if (!validClock(stall, now)) return { ok: false, reason: '기기의 시간을 확인해 주세요.' };
        // Visits only remove listings, so a validated empty position stays empty during this synchronous settlement.
        advance(owner, now);
        stall.sequence++;
        owner.inventory.splice(owner.inventory.indexOf(item), 1);
        stall.listings.push({ id: stall.sequence, item, price, currency: placement.currency, listedAt: now, priceChangedAt: now, slot: placement.slot, negotiate: placement.negotiate, offer: null });
        if (stall.listings.length === 1) stall.nextVisitAt = now + visitDelay(stall);
        return { ok: true };
    }
    /** Move only the display position: this never restarts viewing time, visits, or a pending price offer. */
    function moveListing(owner, listingId, targetSlot) {
        if (!canManage(owner) || !unlocked(owner)) return { ok: false, reason: '지금은 진열 위치를 바꿀 수 없습니다.' };
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        if (!row) return { ok: false, reason: '이미 판매되었거나 회수된 물건입니다.' };
        if (!validSlot(targetSlot)) return { ok: false, reason: '진열할 빈칸을 선택해 주세요.' };
        if (owner.playerStall.listings.some(entry => entry !== row && entry.slot === targetSlot)) {
            return { ok: false, reason: '다른 물건이 놓여 있는 칸입니다.' };
        }
        row.slot = targetSlot;
        return { ok: true, reason: '진열 위치를 바꿨습니다.' };
    }
    function withdraw(owner, listingId) {
        if (!canManage(owner)) return { ok: false, reason: '지금은 회수할 수 없습니다.' };
        const stall = owner.playerStall, row = stall.listings.find(entry => entry.id === listingId);
        if (!row) return { ok: false, reason: '이미 판매되었거나 회수된 물건입니다.' };
        if (!canStoreEquipmentItems([row.item], owner)) return { ok: false, reason: '장비 보관함에 공간이 필요합니다. 물건은 가판대에 보관됩니다.' };
        releaseOffer(stall, row, stall.lastAt);
        owner.inventory.push(row.item);
        stall.listings.splice(stall.listings.indexOf(row), 1);
        return { ok: true };
    }
    function reprice(owner, listingId, price, now, currency) {
        if (!canManage(owner) || !unlocked(owner)) return false;
        if (!validPrice(price) || !validClock(owner.playerStall, now)) return false;
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        if (!row) return false;
        const nextCurrency = currency === undefined ? row.currency : currency;
        if (!validCurrency(nextCurrency)) return false;
        advance(owner, now);
        if (!owner.playerStall.listings.includes(row)) return false;
        if (`${row.price}:${row.currency}` === `${price}:${nextCurrency}`) return true;
        releaseOffer(owner.playerStall, row, now);
        row.price = price; row.currency = nextCurrency; row.priceChangedAt = now;
        return true;
    }
    /** One counter per offer. Invalid/stale actions cannot draw RNG; refusal and a final bid consume the opportunity. */
    function counterOffer(owner, request, now) {
        const { listingId, offerId, amount } = request;
        const original = owner.playerStall.listings.find(entry => entry.id === listingId)?.offer;
        if (!original || original.id !== offerId || original.negotiated) return { ok: false, reason: '역제안할 수 없는 제안입니다.' };
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        if (!validPrice(amount) || amount <= original.amount || amount > row.price) return { ok: false, reason: '손님의 제안보다 높고 희망가 이하인 정수를 입력하세요.' };
        const live = actionableOffer(owner, listingId, offerId, now);
        if (!live) return { ok: false, reason: '이미 처리되었거나 기한이 지난 제안입니다.' };
        if (!Number.isSafeInteger(owner.playerStall[bankKey(live.currency)] + amount)) return { ok: false, reason: '판매 대금을 먼저 수령해 주세요.' };
        return resolveCounter(owner.playerStall, live, amount, now);
    }
    function resolveCounter(stall, row, amount, now) {
        const offer = row.offer, customer = PLAYER_STALL_CUSTOMERS[offer.customerId];
        const value = itemAppraisal.quote(row.item, row.currency), fit = itemAppraisal.affinity(row.item, customer);
        const limit = Math.min(offer.buyerLimit, buyerLimit(value, fit, customer));
        const gap = (amount - offer.amount) / Math.max(1, limit - offer.amount);
        const acceptChance = amount <= limit ? Math.max(0.05, 0.85 - gap * (1 - customer.flexibility * 0.4)) : 0;
        const roll = random(stall);
        if (roll < acceptChance) {
            const paid = sell(stall, row, now, customer.name, amount);
            return { ok: paid > 0, reason: paid ? '손님이 역제안을 수락했습니다.' : '판매 대금을 먼저 수령해 주세요.' };
        }
        const finalAmount = Math.min(amount - 1, row.price - 1, limit, Math.floor(offer.amount + (limit - offer.amount) * customer.flexibility));
        if (finalAmount > offer.amount && roll < acceptChance + (1 - acceptChance) * customer.flexibility) {
            row.offer = { ...offer, id: ++stall.offerSequence, amount: finalAmount, negotiated: true };
            record(stall, { at: now, kind: 'offer', slot: row.slot, customerId: offer.customerId, currency: row.currency, customer: customer.name,
                sold: false, reason: `${row.item.name}에 ${ORB_DB[row.currency].name} ${finalAmount}개를 마지막으로 제안했습니다.` });
            return { ok: true, reason: '손님이 마지막 가격을 제안했습니다.' };
        }
        releaseOffer(stall, row, now);
        record(stall, { at: now, customer: customer.name, sold: false, reason: '역제안을 듣고 손님이 떠났습니다.' });
        return { ok: true, reason: '손님이 떠났습니다. 물건은 계속 진열됩니다.' };
    }
    /** Settle wall time once at this transaction boundary, then resolve the exact still-live proposal. */
    function actionableOffer(owner, listingId, offerId, now) {
        if (!canManage(owner) || !unlocked(owner) || !validClock(owner.playerStall, now)) return null;
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        const offer = row?.offer;
        if (!offer || offer.id !== offerId) return null;
        advance(owner, now);
        return owner.playerStall.listings.includes(row) && row.offer === offer && offer.expiresAt > now ? row : null;
    }
    function acceptOffer(owner, listingId, offerId, now) {
        const row = actionableOffer(owner, listingId, offerId, now);
        if (!row) return { ok: false, reason: '이미 처리되었거나 기한이 지난 제안입니다.' };
        const offer = row.offer;
        if (offer.amount >= row.price || offer.amount > itemAppraisal.quote(row.item, row.currency).ceiling) return { ok: false, reason: '제안의 금액을 확인해 주세요.' };
        const paid = sell(owner.playerStall, row, now, PLAYER_STALL_CUSTOMERS[offer.customerId].name, offer.amount);
        return { ok: paid > 0, reason: paid ? `제안을 수락했습니다. 판매 대금에 ${ORB_DB[row.currency].name} ${offer.amount}개가 적립되었습니다.` : '판매 대금을 먼저 수령해 주세요.' };
    }
    function rejectOffer(owner, listingId, offerId, now) {
        const row = actionableOffer(owner, listingId, offerId, now);
        if (!row) return { ok: false, reason: '이미 처리되었거나 기한이 지난 제안입니다.' };
        record(owner.playerStall, { at: now, currency: row.currency, customer: PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
            sold: false, reason: `${row.item.name}의 가격 제안을 거절했습니다.` });
        releaseOffer(owner.playerStall, row, now);
        return { ok: true, reason: '제안을 거절했습니다. 물건은 계속 진열됩니다.' };
    }
    function setNegotiation(owner, listingId, enabled, now) {
        if (!canManage(owner) || !unlocked(owner) || !validClock(owner.playerStall, now) || typeof enabled !== 'boolean') return false;
        advance(owner, now);
        const row = owner.playerStall.listings.find(entry => entry.id === listingId);
        if (!row) return false;
        if (!enabled) releaseOffer(owner.playerStall, row, now);
        row.negotiate = enabled;
        return true;
    }
    /** Why a loop reset must wait, or '': the reset would delete listed gear or carry unclaimed dew across loops.
     * triggerSeasonReset refuses while this is non-empty; the loop screen shows the same sentence. */
    function loopBlockReason(owner) {
        const stall = owner.playerStall, parts = [];
        if (stall.listings.length) parts.push(`진열품 ${stall.listings.length}개`);
        const labels = { formlessDew: '이슬', magicBud: '새싹' };
        for (const currency of rules.currencies) {
            const amount = stall[bankKey(currency)];
            if (amount) parts.push(`판매 대금 ${labels[currency] || ORB_DB[currency].name} ${amount}개`);
        }
        if (!parts.length) return '';
        return `가판대에 ${parts.join('와 ')}가 남아 있습니다. 장비 → 거래소 → 나의 가판대에서 회수한 뒤 루프를 진행하세요.`;
    }
    function collect(owner) {
        if (owner.isBackgroundCalculation) return 0;
        const stall = owner.playerStall;
        const amounts = Object.fromEntries(rules.currencies.map(currency => [currency, stall[bankKey(currency)]]));
        if (!rules.currencies.some(currency => amounts[currency] > 0)) return 0;
        if (rules.currencies.some(currency => !Number.isSafeInteger(owner.currencies[currency] + amounts[currency]))) return 0;
        for (const currency of rules.currencies) {
            owner.currencies[currency] += amounts[currency];
            stall[bankKey(currency)] = 0;
        }
        owner.currencyDropVersion = (owner.currencyDropVersion || 0) + 1;
        return rules.currencies.reduce((sum, currency) => sum + amounts[currency] * itemAppraisal.unitValue(currency), 0);
    }
    function validListing(row, seen) {
        return Number.isSafeInteger(row.id) && row.id > 0 && !seen.listings.has(row.id)
            && validPrice(row.price) && validCurrency(row.currency) && !!itemAppraisal.quote(row.item, row.currency);
    }
    function restoreListing(row, owner, seen) {
        if (!row?.item || !Number.isSafeInteger(row.item.id) || seen.items.has(row.item.id)) {
            console.warn('가판대 저장 오류: 장비가 없거나 이미 소유 중인 진열 정보를 제외했습니다.');
            return false;
        }
        seen.items.add(row.item.id);
        row.item = normalizeItem(row.item);
        if (row.currency === undefined) row.currency = 'formlessDew';
        if (!validListing(row, seen)) {
            owner.inventory.push(row.item);
            console.warn('가판대 저장 오류: 장비를 보관함으로 반환했습니다.');
            return false;
        }
        seen.listings.add(row.id);
        row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : owner.playerStall.lastAt;
        row.priceChangedAt = validPriceChangeAt(row, owner.playerStall.lastAt) ? row.priceChangedAt : row.listedAt;
        row.negotiate = row.negotiate === true;
        return true;
    }
    function restorePositions(stall, owner) {
        const occupied = new Set(), repair = [];
        for (const row of stall.listings) {
            if (validSlot(row.slot) && !occupied.has(row.slot)) occupied.add(row.slot);
            else repair.push(row);
        }
        const overflow = new Set();
        for (const row of repair) {
            if (row.slot !== undefined) console.warn('가판대 저장 오류: 겹치거나 유효하지 않은 진열 위치를 복구했습니다.');
            const slot = firstEmptySlot(occupied);
            if (slot < 0) {
                owner.inventory.push(row.item); overflow.add(row);
                console.warn('가판대 저장 오류: 진열 칸을 초과한 장비를 보관함으로 반환했습니다.');
                continue;
            }
            row.slot = slot; occupied.add(slot);
        }
        stall.listings = stall.listings.filter(row => !overflow.has(row));
    }
    function validOfferPrice(row, offer, seen) {
        return row.negotiate && Number.isSafeInteger(offer.id) && offer.id > 0 && !seen.has(offer.id)
            && Number.isSafeInteger(offer.amount) && offer.amount >= 1 && offer.amount < row.price
            && offer.amount <= itemAppraisal.quote(row.item, row.currency).ceiling;
    }
    function validOfferClock(stall, row, offer) {
        return Number.isSafeInteger(offer.createdAt) && offer.createdAt >= row.listedAt + rules.minimumAgeMs
            && offer.createdAt <= stall.lastAt && Number.isSafeInteger(offer.expiresAt)
            && offer.expiresAt === offer.createdAt + rules.offerLifetimeMs && offer.expiresAt > stall.lastAt;
    }
    function restoreOffer(stall, row, seen) {
        const offer = row.offer;
        row.offer = null;
        if (!offer) return;
        const customer = Number.isInteger(offer.customerId) && !!PLAYER_STALL_CUSTOMERS[offer.customerId];
        if (!validOfferPrice(row, offer, seen) || !validOfferClock(stall, row, offer) || !customer) {
            console.warn('가판대 저장 오류: 유효하지 않은 가격 제안만 취소했습니다. 장비와 판매 대금은 유지됩니다.');
            return;
        }
        seen.add(offer.id);
        const value = itemAppraisal.quote(row.item, row.currency), buyer = PLAYER_STALL_CUSTOMERS[offer.customerId];
        const limit = buyerLimit(value, itemAppraisal.affinity(row.item, buyer), buyer);
        offer.buyerLimit = Number.isSafeInteger(offer.buyerLimit) ? Math.min(limit, Math.max(offer.amount, offer.buyerLimit)) : Math.max(offer.amount, limit);
        offer.negotiated = offer.negotiated === true;
        row.offer = offer;
        stall.offerSequence = Math.max(stall.offerSequence, offer.id);
        stall.nextOfferAt = Math.max(stall.nextOfferAt, offer.createdAt + rules.offerCooldownMs);
    }
    function restoreVisitClock(stall) {
        // Preserve valid scheduled arrivals, including v6 deadlines; repair old six-minute cursors once.
        if (!stall.lastAt) return;
        if (stall.nextVisitAt <= stall.lastAt || stall.nextVisitAt > stall.lastAt + rules.maxVisitMs) {
            stall.nextVisitAt = stall.lastAt + rules.visitMs;
        }
    }
    function restoreSales(stall, source) {
        const legacy = source?.version < 8 && !source.sales?.length ? stall.history.filter(event => event.sold)
            .map((event, index) => ({ ...event, id: index + 1, listedAt: null, item: null })) : [];
        const ids = new Set();
        stall.sales = (legacy.length ? legacy : Array.isArray(source?.sales) ? source.sales : []).filter(sale => {
            if (!sale || !Number.isSafeInteger(sale.id) || sale.id < 1 || ids.has(sale.id)) return false;
            if (!Number.isSafeInteger(sale.at) || sale.at < 0 || !validCurrency(sale.currency) || !validPrice(sale.price)) return false;
            ids.add(sale.id);
            return true;
        }).slice(0, rules.salesLimit).map(sale => ({ ...sale, item: sale.item && itemAppraisal.quote(sale.item) ? JSON.parse(JSON.stringify(sale.item)) : null,
            listedAt: Number.isSafeInteger(sale.listedAt) && sale.listedAt <= sale.at && sale.listedAt >= 0 ? sale.listedAt : null }));
        stall.saleSequence = Math.max(stall.saleSequence, ...stall.sales.map(sale => sale.id));
    }
    function restore(owner) {
        const source = owner.playerStall;
        const stall = { ...JSON.parse(JSON.stringify(defaultGame.playerStall)), ...(source && typeof source === 'object' ? source : {}) };
        for (const key of ['sequence','offerSequence','eventSequence','saleSequence','nextOfferAt','lastAt','nextVisitAt',...Object.values(rules.proceedsKeys)]) {
            stall[key] = Number.isSafeInteger(stall[key]) && stall[key] >= 0 ? stall[key] : 0;
        }
        stall.version = 8;
        // Legacy NPC credit is neither player currency nor proceeds. Retire it without paying it out.
        delete stall.budgetMs;
        restoreVisitClock(stall);
        stall.rng = Number.isSafeInteger(stall.rng) ? stall.rng >>> 0 : 1357911;
        stall.history = Array.isArray(stall.history) ? stall.history.filter(event => event && Number.isFinite(event.at))
            .map(event => ({ ...event, currency: event.currency === undefined ? 'formlessDew' : event.currency }))
            .filter(event => validCurrency(event.currency)).slice(0, rules.historyLimit) : [];
        stall.eventSequence = Math.max(stall.eventSequence, ...stall.history.map(event => Number.isSafeInteger(event.id) ? event.id : 0));
        restoreSales(stall, source);
        owner.playerStall = stall;
        const owned = [getEquipmentLoadoutOwnedItems(owner), owner.equipmentTemporaryStorage,
            owner.timeRift.altarUnique, owner.timeRift.altarRare, owner.offlineProgress.stash, owner.offlineProgress.protectedOverflow,
            actExplorationLoot.reservedItems(owner)].flat().filter(Boolean);
        const seen = { items: new Set(owned.map(item => item.id)), listings: new Set() };
        stall.listings = (Array.isArray(stall.listings) ? stall.listings : []).filter(row => restoreListing(row, owner, seen));
        stall.sequence = Math.max(stall.sequence, ...seen.listings);
        restorePositions(stall, owner);
        if (!stall.listings.length) stall.nextVisitAt = 0;
        const offerIds = new Set();
        stall.listings.forEach(row => restoreOffer(stall, row, offerIds));
    }
    return Object.freeze({ unlocked, eligible, chance, advance, list, moveListing, withdraw, reprice, collect, loopBlockReason, restore,
        acceptOffer, rejectOffer, counterOffer, setNegotiation });
})();
safeExposeGlobals({ playerStall });
