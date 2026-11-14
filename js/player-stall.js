// GENERATED from modules/player-stall*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/stall-access.mjs
  function stallRulesUnlocked(env, owner) {
    return env.deps.contentProgression.isUnlocked("market", owner);
  }
  function stallRulesCanManage(owner) {
    return !owner.woodsmanBuildLock && !owner.isBackgroundCalculation;
  }
  function stallRulesValidPrice(env, price) {
    return Number.isSafeInteger(price) && price >= 1 && price <= env.rules.maxAsk;
  }
  function stallRulesValidCurrency(env, currency) {
    return env.rules.currencies.includes(currency);
  }
  function stallRulesBankKey(env, currency) {
    return env.rules.proceedsKeys[currency];
  }
  function stallRulesValidClock(now) {
    return Number.isSafeInteger(now) && now >= 0;
  }
  function stallRulesValidSlot(env, slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < env.rules.slots;
  }
  function stallRulesFirstEmptySlot(env, occupied) {
    for (let slot = 0; slot < env.rules.slots; slot++) if (!occupied.has(slot)) return slot;
    return -1;
  }
  function stallRulesListingPlacement(env, stall, options) {
    const settings = options && typeof options === "object" ? options : { negotiate: options };
    const occupied = new Set(stall.listings.map((row) => row.slot));
    const slot = Object.prototype.hasOwnProperty.call(settings, "slot") ? settings.slot : stallRulesFirstEmptySlot(env, occupied);
    const currency = settings.currency === void 0 ? "formlessDew" : settings.currency;
    return {
      slot,
      currency,
      negotiate: settings.negotiate === true,
      available: stallRulesValidCurrency(env, currency) && stallRulesValidSlot(env, slot) && !occupied.has(slot)
    };
  }
  function stallRulesListBlockReason(env, item, owner) {
    if (!item || env.deps.bagItems.isSpecial(item) || !Number.isSafeInteger(item.id) || !env.deps.itemAppraisal.quote(item)) return "가판대에 올릴 수 없는 물건입니다.";
    const flag = env.FLAG_REASONS.find(([key]) => item[key]);
    if (flag) return flag[1];
    if (env.deps.equipmentSockets.jewels(item).length > 0) return "주얼을 빼야 올릴 수 있습니다.";
    if (env.deps.equipmentSockets.harvests(item).length > 0) return "소켓의 꽃, 열매, 덩굴, 뿌리를 빼야 올릴 수 있습니다.";
    if (Object.values(owner.equipment).some((equipped) => equipped?.id === item.id)) return "장착한 장비입니다.";
    return env.deps.equipmentLoadoutRuntime.isReferenced(item, owner) ? "프리셋에 쓰이는 장비입니다." : "";
  }
  function stallRulesEligible(env, item, owner) {
    return !stallRulesListBlockReason(env, item, owner);
  }

  // modules/domain/stall-appraisal.mjs
  function stallRulesAppraiseListings(env, stall) {
    return stall.listings.map((row) => ({
      row,
      value: env.deps.itemAppraisal.quote(row.item, row.currency),
      fits: env.deps.PLAYER_STALL_CUSTOMERS.map((customer) => env.deps.itemAppraisal.affinity(row.item, customer))
    }));
  }
  function stallRulesViewingInterest(env, price, fair, ageMs) {
    if (ageMs < env.rules.minimumAgeMs) return 0;
    const discount = Math.min(1, Math.max(0, 1 - price / fair) / env.rules.fullEarlyDiscount);
    const early = env.rules.earlyInterest + env.rules.earlyDiscountBoost * discount;
    const maturity = Math.min(1, (ageMs - env.rules.minimumAgeMs) / (env.rules.matureAgeMs - env.rules.minimumAgeMs));
    return early + (1 - early) * maturity;
  }
  function stallRulesChance(env, item, price, customer, ...selection) {
    const [currency = "formlessDew", ageMs = env.rules.matureAgeMs] = selection;
    const value = env.deps.itemAppraisal.quote(item, currency);
    if (!value) return 0;
    return stallRulesPurchaseChance(env, value, price, env.deps.itemAppraisal.affinity(item, customer), ageMs, customer);
  }
  function stallRulesBuyerLimit(value, fit, customer) {
    const preference = 0.88 + 0.12 * fit;
    const premium = fit >= 0.65 ? customer.premium : Math.min(1, customer.premium);
    return Math.min(value.ceiling, Math.max(1, Math.floor(value.fair * preference * premium)));
  }
  function stallRulesPurchaseChance(env, value, price, fit, ...selection) {
    const [ageMs, customer] = selection;
    if (!value || price > stallRulesBuyerLimit(value, fit, customer)) return 0;
    const ratio = price / value.fair;
    const interest = 0.45 + 0.55 * fit;
    const decision = Math.min(0.95, Math.max(0.03, 1.2 - ratio * 0.7) * interest) * value.demand;
    const perVisit = 1 - Math.pow(1 - decision, env.rules.visitMs / env.rules.decisionWindowMs);
    return Math.min(1, perVisit * stallRulesViewingInterest(env, price, value.fair, ageMs) * customer.buyRate);
  }

  // modules/domain/stall-clock.mjs
  function stallRulesRandom(stall) {
    stall.rng = Math.imul(stall.rng, 1664525) + 1013904223 >>> 0;
    return stall.rng / 4294967296;
  }
  function stallRulesVisitDelay(env, stall) {
    let seed = stall.rng ^ 2654435769;
    seed = Math.imul(seed ^ seed >>> 16, 569420461);
    seed = Math.imul(seed ^ seed >>> 15, 1935289751);
    const roll = ((seed ^ seed >>> 15) >>> 0) / 4294967296;
    return Math.round(Math.min(env.rules.maxVisitMs, env.rules.minVisitMs - Math.log1p(-roll) * env.rules.visitSpreadMs));
  }
  function stallRulesReadyAt(env, row) {
    return Math.max(row.listedAt + env.rules.minimumAgeMs, (row.priceChangedAt || row.listedAt) + env.rules.repriceDelayMs);
  }
  function stallRulesValidPriceChangeAt(row, lastAt) {
    return Number.isSafeInteger(row.priceChangedAt) && row.priceChangedAt >= row.listedAt && row.priceChangedAt <= lastAt;
  }
  function stallRulesStallClock(stall, now) {
    return Math.max(now, stall.lastAt);
  }

  // modules/domain/stall-ledger.mjs
  function stallRulesRecord(env, stall, event) {
    stall.history.unshift({ currency: "formlessDew", ...event, id: ++stall.eventSequence });
    stall.history.length = Math.min(stall.history.length, env.rules.historyLimit);
  }
  function stallRulesSell(env, stall, row, at, ...selection) {
    const [customer, amount] = selection;
    const key = stallRulesBankKey(env, row.currency);
    const index = stall.listings.indexOf(row);
    if (index < 0 || !Number.isSafeInteger(stall[key] + amount)) return 0;
    stall[key] += amount;
    stall.listings.splice(index, 1);
    const item = JSON.parse(JSON.stringify(row.item));
    stall.sales.unshift({ id: ++stall.saleSequence, at, listedAt: row.listedAt, currency: row.currency, customer, price: amount, item });
    stall.sales.length = Math.min(stall.sales.length, env.rules.salesLimit);
    stallRulesRecord(env, stall, { at, kind: "sale", slot: row.slot, currency: row.currency, customer, sold: true, name: row.item.name, price: amount });
    return amount * env.deps.itemAppraisal.unitValue(row.currency);
  }
  function stallRulesCollect(env, owner) {
    if (owner.isBackgroundCalculation) return 0;
    const stall = owner.playerStall;
    const amounts = Object.fromEntries(env.rules.currencies.map((currency) => [currency, stall[stallRulesBankKey(env, currency)]]));
    if (!env.rules.currencies.some((currency) => amounts[currency] > 0)) return 0;
    if (env.rules.currencies.some((currency) => !Number.isSafeInteger(owner.currencies[currency] + amounts[currency]))) return 0;
    for (const currency of env.rules.currencies) {
      owner.currencies[currency] += amounts[currency];
      stall[stallRulesBankKey(env, currency)] = 0;
    }
    owner.currencyDropVersion = (owner.currencyDropVersion || 0) + 1;
    return env.rules.currencies.reduce((sum, currency) => sum + amounts[currency] * env.deps.itemAppraisal.unitValue(currency), 0);
  }
  function stallRulesPayouts(env, stall) {
    return env.rules.currencies.map((key) => ({ key, amount: stall[stallRulesBankKey(env, key)] })).filter((row) => row.amount > 0);
  }
  function stallRulesLoopBlockReason(env, owner) {
    const stall = owner.playerStall, parts = [];
    if (stall.listings.length) parts.push(`진열품 ${stall.listings.length}개`);
    const labels = { formlessDew: "이슬", magicBud: "새싹" };
    for (const currency of env.rules.currencies) {
      const amount = stall[stallRulesBankKey(env, currency)];
      if (amount) parts.push(`판매 대금 ${labels[currency] || env.deps._t(env.deps.ORB_DB[currency].name)} ${amount}개`);
    }
    if (!parts.length) return "";
    return `가판대에 ${parts.join("와 ")}가 남아 있습니다. 거래 → 가판대에서 회수한 뒤 루프를 진행하세요.`;
  }

  // modules/domain/stall-offers.mjs
  function stallRulesReleaseOffer(env, stall, row, at) {
    if (!row.offer) return;
    row.offer = null;
    stall.nextOfferAt = Math.max(stall.nextOfferAt, at + env.rules.offerCooldownMs);
  }
  function stallRulesExpireOffers(env, stall, at) {
    for (const row of stall.listings) {
      if (!row.offer || row.offer.expiresAt > at) continue;
      const deadline = row.offer.expiresAt;
      stallRulesRecord(env, stall, {
        at: deadline,
        currency: row.currency,
        customer: env.deps.PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
        sold: false,
        reason: env.deps._t("{name} 가격 제안의 기한이 지났습니다.", { name: row.item.name })
      });
      stallRulesReleaseOffer(env, stall, row, deadline);
    }
  }
  function stallRulesProposalCandidate(env, entry) {
    const { row, value, fit } = entry;
    if (!row.negotiate || row.offer || row.price <= 1) return null;
    if (value.marketValue < env.deps.itemAppraisal.unitValue(row.currency)) return null;
    return { row, value, fit };
  }
  function stallRulesPropose(env, stall, candidates, customerId, at) {
    if (at < stall.nextOfferAt) return false;
    const customer = env.deps.PLAYER_STALL_CUSTOMERS[customerId];
    const selected = candidates.map((...args) => stallRulesProposalCandidate(env, ...args)).filter(Boolean).sort((a, b) => b.fit - a.fit || a.row.id - b.row.id)[0];
    if (!selected) return false;
    const { row, value, fit } = selected;
    const bargain = row.price <= value.fair ? env.rules.bargainOfferRate * row.price / value.fair : 1;
    const decision = Math.min(0.95, (0.35 + fit * 0.4) * value.demand * bargain * customer.offerRate);
    const probability = (1 - Math.pow(1 - decision, env.rules.visitMs / env.rules.decisionWindowMs)) * stallRulesViewingInterest(env, row.price, value.fair, at - row.listedAt);
    if (stallRulesRandom(stall) >= probability) return false;
    const basis = Math.min(row.price, value.fair);
    const roll = stallRulesRandom(stall);
    const lowball = env.rules.lowballOfferRate * customer.lowballRate;
    const ratio = roll < lowball ? env.rules.lowballOfferMin + (env.rules.lowballOfferMax - env.rules.lowballOfferMin) * roll / lowball : 0.65 + fit * 0.2 + 0.1 * (roll - lowball) / (1 - lowball);
    const limit = stallRulesBuyerLimit(value, fit, customer);
    const amount = Math.min(row.price - 1, limit, Math.max(1, Math.floor(basis * ratio)));
    row.offer = { id: ++stall.offerSequence, amount, customerId, createdAt: at, expiresAt: at + env.rules.offerLifetimeMs, buyerLimit: limit, negotiated: false };
    stall.nextOfferAt = at + env.rules.offerCooldownMs;
    stallRulesRecord(env, stall, { at, kind: "offer", slot: row.slot, customerId, currency: row.currency, customer: customer.name, sold: false, reason: env.deps._t("{name}에 {name2} {amount}개를 제안했습니다.", { name: row.item.name, name2: env.deps._t(env.deps.ORB_DB[row.currency].name), amount }) });
    return true;
  }
  function stallRulesResolveCounter(env, stall, row, amount, now) {
    const offer = row.offer, customer = env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    const value = env.deps.itemAppraisal.quote(row.item, row.currency), fit = env.deps.itemAppraisal.affinity(row.item, customer);
    const limit = Math.min(offer.buyerLimit, stallRulesBuyerLimit(value, fit, customer));
    const gap = (amount - offer.amount) / Math.max(1, limit - offer.amount);
    const acceptChance = amount <= limit ? Math.max(0.05, 0.85 - gap * (1 - customer.flexibility * 0.4)) : 0;
    const roll = stallRulesRandom(stall);
    if (roll < acceptChance) {
      const paid = stallRulesSell(env, stall, row, now, customer.name, amount);
      return { ok: paid > 0, reason: paid ? "손님이 역제안을 수락했습니다." : "판매 대금을 먼저 수령해 주세요." };
    }
    const finalAmount = Math.min(amount - 1, row.price - 1, limit, Math.floor(offer.amount + (limit - offer.amount) * customer.flexibility));
    if (finalAmount > offer.amount && roll < acceptChance + (1 - acceptChance) * customer.flexibility) {
      row.offer = { ...offer, id: ++stall.offerSequence, amount: finalAmount, negotiated: true };
      stallRulesRecord(env, stall, {
        at: now,
        kind: "offer",
        slot: row.slot,
        customerId: offer.customerId,
        currency: row.currency,
        customer: customer.name,
        sold: false,
        reason: env.deps._t("{name}에 {name2} {finalAmount}개를 마지막으로 제안했습니다.", { name: row.item.name, name2: env.deps._t(env.deps.ORB_DB[row.currency].name), finalAmount })
      });
      return { ok: true, reason: env.deps._t("손님이 마지막 가격을 제안했습니다.") };
    }
    stallRulesReleaseOffer(env, stall, row, now);
    stallRulesRecord(env, stall, { at: now, customer: customer.name, sold: false, reason: env.deps._t("역제안을 듣고 손님이 떠났습니다.") });
    return { ok: true, reason: env.deps._t("손님이 떠났습니다. 물건은 계속 진열됩니다.") };
  }

  // modules/domain/stall-visits.mjs
  function stallRulesVisit(env, stall, at, appraisals) {
    const customerId = Math.floor(stallRulesRandom(stall) * env.deps.PLAYER_STALL_CUSTOMERS.length);
    const customer = env.deps.PLAYER_STALL_CUSTOMERS[customerId];
    const candidates = appraisals.filter((entry) => stall.listings.includes(entry.row) && at >= stallRulesReadyAt(env, entry.row)).map((entry) => ({
      row: entry.row,
      value: entry.value,
      fit: entry.fits[customerId],
      chance: stallRulesPurchaseChance(env, entry.value, entry.row.price, entry.fits[customerId], at - entry.row.listedAt, customer)
    })).sort((a, b) => b.chance - a.chance || a.row.id - b.row.id);
    const candidate = candidates.find((entry) => entry.chance > 0);
    if (!candidate || stallRulesRandom(stall) >= candidate.chance) {
      if (stallRulesPropose(env, stall, candidates, customerId, at)) return 0;
      stallRulesRecord(env, stall, {
        at,
        kind: "visit",
        customerId,
        slot: candidates[0]?.row.slot,
        nextSlot: candidates[1]?.row.slot,
        customer: customer.name,
        sold: false,
        reason: env.deps._t("물건을 둘러보고 떠났습니다.")
      });
      return 0;
    }
    return stallRulesSell(env, stall, candidate.row, at, customer.name, candidate.row.price);
  }
  function stallRulesBargainHeat(env, entry, at) {
    const { row, value } = entry;
    if (at < stallRulesReadyAt(env, row) || value.demand < env.rules.crowdMinDemand || row.price > value.ceiling) return 0;
    if (value.marketValue < env.rules.crowdMinMarketValue || Math.max(...entry.fits) < env.rules.crowdMinFit) return 0;
    return Math.max(0, 1 - row.price / value.fair / env.rules.crowdPriceRatio);
  }
  function stallRulesArrival(env, stall, at, appraisals) {
    stallRulesExpireOffers(env, stall, at);
    const heat = Math.max(0, ...appraisals.filter((entry) => stall.listings.includes(entry.row)).map((entry) => stallRulesBargainHeat(env, entry, at)));
    let visitors = 1;
    if (heat > 0) {
      const probability = env.rules.crowdBaseChance + heat * env.rules.crowdDiscountChance, roll = stallRulesRandom(stall);
      if (roll < probability) visitors = 2 + Math.floor(roll / probability * (env.rules.maxCrowd - 1));
    }
    if (visitors > 1) stallRulesRecord(env, stall, {
      at,
      kind: "crowd",
      visitors,
      customer: "몰려든 손님들",
      sold: false,
      reason: env.deps._t("가격표를 본 손님 {visitors}명이 한꺼번에 가판대 앞으로 모여들었습니다.", { visitors })
    });
    let paid = 0;
    for (let index = 0; index < visitors; index++) paid += stallRulesVisit(env, stall, at, appraisals);
    return paid;
  }
  function stallRulesFinishVisits(env, stall, now, end) {
    stall.lastAt = now;
    stallRulesExpireOffers(env, stall, now);
    if (!stall.listings.length) stall.nextVisitAt = 0;
    else if (now > end) stall.nextVisitAt = now + stallRulesVisitDelay(env, stall);
  }
  function stallRulesAdvance(env, owner, now) {
    const stall = owner.playerStall;
    if (!stallRulesValidClock(now) || owner.isBackgroundCalculation) return 0;
    const clock = stallRulesStallClock(stall, now);
    if (clock === stall.lastAt) return 0;
    if (!stall.lastAt || !stallRulesUnlocked(env, owner)) {
      stall.lastAt = clock;
      stall.nextVisitAt = stall.listings.length ? clock + stallRulesVisitDelay(env, stall) : 0;
      return 0;
    }
    const end = Math.min(clock, stall.lastAt + env.rules.offlineLimitMs);
    const first = Math.max(stall.nextVisitAt, stall.lastAt + 1);
    const appraisals = first <= end ? stallRulesAppraiseListings(env, stall) : [];
    let paid = 0;
    for (let at = first; at <= end && stall.listings.length; at = stall.nextVisitAt) {
      paid += stallRulesArrival(env, stall, at, appraisals);
      stall.nextVisitAt = at + stallRulesVisitDelay(env, stall);
    }
    stallRulesFinishVisits(env, stall, clock, end);
    return paid;
  }

  // modules/domain/stall-settlement.mjs
  function stallRulesSettle(env, owner, now) {
    const stall = owner.playerStall, since = stall.lastAt, before = stallRulesPayouts(env, stall), sequence = stall.offerSequence;
    const offerIds = stall.listings.map((row) => row.offer?.id).filter(Boolean);
    const paid = stallRulesAdvance(env, owner, now);
    const gains = stallRulesPayouts(env, stall).map((row) => ({ key: row.key, amount: row.amount - (before.find((old) => old.key === row.key)?.amount || 0) })).filter((row) => row.amount > 0);
    const withOffer = stall.listings.filter((row) => row.offer);
    return {
      paid,
      sold: paid > 0 ? stall.history.filter((event) => event.sold && event.at > since) : [],
      gains,
      offers: withOffer.filter((row) => !offerIds.includes(row.offer.id)),
      changed: sequence !== stall.offerSequence || offerIds.join(",") !== withOffer.map((row) => row.offer.id).join(",")
    };
  }

  // modules/domain/stall-listings.mjs
  function stallRulesList(env, owner, itemId, price, ...selection) {
    const [now, options = false] = selection;
    if (!stallRulesUnlocked(env, owner) || !stallRulesCanManage(owner)) return { ok: false, reason: env.deps._t("지금은 가판대를 이용할 수 없습니다.") };
    if (!stallRulesValidPrice(env, price)) return { ok: false, reason: env.deps._t("가격은 1~1,000,000 사이의 정수로 입력하세요.") };
    const item = owner.inventory.find((entry) => entry.id === itemId), stall = owner.playerStall;
    const blocked = stallRulesListBlockReason(env, item, owner);
    if (blocked) return { ok: false, reason: blocked };
    if (stall.listings.length >= env.rules.slots) return { ok: false, reason: env.deps._t("가판대가 가득 찼습니다.") };
    const placement = stallRulesListingPlacement(env, stall, options);
    if (!placement.available) return { ok: false, reason: env.deps._t("판매 재화와 진열할 빈칸을 확인해 주세요.") };
    if (!stallRulesValidClock(now)) return { ok: false, reason: env.deps._t("기기의 시간을 확인해 주세요.") };
    const clock = stallRulesStallClock(stall, now);
    stallRulesAdvance(env, owner, clock);
    stall.sequence++;
    owner.inventory.splice(owner.inventory.indexOf(item), 1);
    stall.listings.push({ id: stall.sequence, item, price, currency: placement.currency, listedAt: clock, priceChangedAt: clock, slot: placement.slot, negotiate: placement.negotiate, offer: null });
    if (stall.listings.length === 1) stall.nextVisitAt = clock + stallRulesVisitDelay(env, stall);
    return { ok: true };
  }
  function stallRulesMoveListing(env, owner, listingId, targetSlot) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner)) return { ok: false, reason: env.deps._t("지금은 진열 위치를 바꿀 수 없습니다.") };
    const row = owner.playerStall.listings.find((entry) => entry.id === listingId);
    if (!row) return { ok: false, reason: env.deps._t("이미 판매되었거나 회수된 물건입니다.") };
    if (!stallRulesValidSlot(env, targetSlot)) return { ok: false, reason: env.deps._t("진열할 빈칸을 선택해 주세요.") };
    if (owner.playerStall.listings.some((entry) => entry !== row && entry.slot === targetSlot)) {
      return { ok: false, reason: env.deps._t("다른 물건이 놓여 있는 칸입니다.") };
    }
    row.slot = targetSlot;
    return { ok: true, reason: env.deps._t("진열 위치를 바꿨습니다.") };
  }
  function stallRulesWithdraw(env, owner, listingId, place = null) {
    if (!stallRulesCanManage(owner)) return { ok: false, reason: env.deps._t("지금은 회수할 수 없습니다.") };
    const stall = owner.playerStall, row = stall.listings.find((entry) => entry.id === listingId);
    if (!row) return { ok: false, reason: env.deps._t("이미 판매되었거나 회수된 물건입니다.") };
    const fit = place ? env.deps.equipmentInventoryGridRuntime.canAdd(row.item, place.column, place.row, owner) : { ok: env.deps.canStoreEquipmentItems([row.item], owner) };
    if (!fit.ok) return { ok: false, reason: place ? fit.reason : "장비 보관함에 공간이 필요합니다. 물건은 가판대에 보관됩니다." };
    stallRulesReleaseOffer(env, stall, row, stall.lastAt);
    owner.inventory.push(row.item);
    stall.listings.splice(stall.listings.indexOf(row), 1);
    if (place) env.deps.equipmentInventoryGridRuntime.placeInventoryItem(env.deps.equipmentInventoryGridRuntime.getItemKey(row.item), place.column, place.row, owner);
    return { ok: true };
  }
  function stallRulesReprice(env, owner, listingId, price, ...selection) {
    const [now, currency] = selection;
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner)) return false;
    if (!stallRulesValidPrice(env, price) || !stallRulesValidClock(now)) return false;
    const row = owner.playerStall.listings.find((entry) => entry.id === listingId);
    if (!row) return false;
    const nextCurrency = currency === void 0 ? row.currency : currency;
    if (!stallRulesValidCurrency(env, nextCurrency)) return false;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    if (!owner.playerStall.listings.includes(row)) return false;
    if (`${row.price}:${row.currency}` === `${price}:${nextCurrency}`) return true;
    stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    row.price = price;
    row.currency = nextCurrency;
    row.priceChangedAt = clock;
    return true;
  }
  function stallRulesSetNegotiation(env, owner, listingId, enabled, now) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner) || !stallRulesValidClock(now) || typeof enabled !== "boolean") return false;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    const row = owner.playerStall.listings.find((entry) => entry.id === listingId);
    if (!row) return false;
    if (!enabled) stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    row.negotiate = enabled;
    return true;
  }

  // modules/domain/stall-restoration.mjs
  function stallRulesValidListing(env, row, seen) {
    return Number.isSafeInteger(row.id) && row.id > 0 && !seen.listings.has(row.id) && stallRulesValidPrice(env, row.price) && stallRulesValidCurrency(env, row.currency) && !!env.deps.itemAppraisal.quote(row.item, row.currency);
  }
  function stallRulesRestoreListing(env, row, owner, seen) {
    if (!row?.item || !Number.isSafeInteger(row.item.id) || seen.items.has(row.item.id)) {
      env.deps.console.warn("가판대 저장 오류: 장비가 없거나 이미 소유 중인 진열 정보를 제외했습니다.");
      return false;
    }
    seen.items.add(row.item.id);
    row.item = env.deps.normalizeItem(row.item);
    if (row.currency === void 0) row.currency = "formlessDew";
    if (!stallRulesValidListing(env, row, seen)) {
      owner.inventory.push(row.item);
      env.deps.console.warn("가판대 저장 오류: 장비를 보관함으로 반환했습니다.");
      return false;
    }
    seen.listings.add(row.id);
    row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : owner.playerStall.lastAt;
    row.priceChangedAt = stallRulesValidPriceChangeAt(row, owner.playerStall.lastAt) ? row.priceChangedAt : row.listedAt;
    row.negotiate = row.negotiate === true;
    return true;
  }
  function stallRulesRestorePositions(env, stall, owner) {
    const occupied = /* @__PURE__ */ new Set(), repair = [];
    for (const row of stall.listings) {
      if (stallRulesValidSlot(env, row.slot) && !occupied.has(row.slot)) occupied.add(row.slot);
      else repair.push(row);
    }
    const overflow = /* @__PURE__ */ new Set();
    for (const row of repair) {
      if (row.slot !== void 0) env.deps.console.warn("가판대 저장 오류: 겹치거나 유효하지 않은 진열 위치를 복구했습니다.");
      const slot = stallRulesFirstEmptySlot(env, occupied);
      if (slot < 0) {
        owner.inventory.push(row.item);
        overflow.add(row);
        env.deps.console.warn("가판대 저장 오류: 진열 칸을 초과한 장비를 보관함으로 반환했습니다.");
        continue;
      }
      row.slot = slot;
      occupied.add(slot);
    }
    stall.listings = stall.listings.filter((row) => !overflow.has(row));
  }
  function stallRulesValidOfferPrice(env, row, offer, seen) {
    return row.negotiate && Number.isSafeInteger(offer.id) && offer.id > 0 && !seen.has(offer.id) && Number.isSafeInteger(offer.amount) && offer.amount >= 1 && offer.amount < row.price && offer.amount <= env.deps.itemAppraisal.quote(row.item, row.currency).ceiling;
  }
  function stallRulesValidOfferClock(env, stall, row, offer) {
    return Number.isSafeInteger(offer.createdAt) && offer.createdAt >= row.listedAt + env.rules.minimumAgeMs && offer.createdAt <= stall.lastAt && Number.isSafeInteger(offer.expiresAt) && offer.expiresAt === offer.createdAt + env.rules.offerLifetimeMs && offer.expiresAt > stall.lastAt;
  }
  function stallRulesRestoreOffer(env, stall, row, seen) {
    const offer = row.offer;
    row.offer = null;
    if (!offer) return;
    const customer = Number.isInteger(offer.customerId) && !!env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    if (!stallRulesValidOfferPrice(env, row, offer, seen) || !stallRulesValidOfferClock(env, stall, row, offer) || !customer) {
      env.deps.console.warn("가판대 저장 오류: 유효하지 않은 가격 제안만 취소했습니다. 장비와 판매 대금은 유지됩니다.");
      return;
    }
    seen.add(offer.id);
    const value = env.deps.itemAppraisal.quote(row.item, row.currency), buyer = env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    const limit = stallRulesBuyerLimit(value, env.deps.itemAppraisal.affinity(row.item, buyer), buyer);
    offer.buyerLimit = Number.isSafeInteger(offer.buyerLimit) ? Math.min(limit, Math.max(offer.amount, offer.buyerLimit)) : Math.max(offer.amount, limit);
    offer.negotiated = offer.negotiated === true;
    row.offer = offer;
    stall.offerSequence = Math.max(stall.offerSequence, offer.id);
    stall.nextOfferAt = Math.max(stall.nextOfferAt, offer.createdAt + env.rules.offerCooldownMs);
  }
  function stallRulesRestoreVisitClock(env, stall) {
    if (!stall.lastAt) return;
    if (stall.nextVisitAt <= stall.lastAt || stall.nextVisitAt > stall.lastAt + env.rules.maxVisitMs) {
      stall.nextVisitAt = stall.lastAt + env.rules.visitMs;
    }
  }
  function stallRulesRestoreSales(env, stall, source) {
    const legacy = source?.version < 8 && !source.sales?.length ? stall.history.filter((event) => event.sold).map((event, index) => ({ ...event, id: index + 1, listedAt: null, item: null })) : [];
    const ids = /* @__PURE__ */ new Set();
    stall.sales = (legacy.length ? legacy : Array.isArray(source?.sales) ? source.sales : []).filter((sale) => {
      if (!sale || !Number.isSafeInteger(sale.id) || sale.id < 1 || ids.has(sale.id)) return false;
      if (!Number.isSafeInteger(sale.at) || sale.at < 0 || !stallRulesValidCurrency(env, sale.currency) || !stallRulesValidPrice(env, sale.price)) return false;
      ids.add(sale.id);
      return true;
    }).slice(0, env.rules.salesLimit).map((sale) => ({
      ...sale,
      item: sale.item && env.deps.itemAppraisal.quote(sale.item) ? JSON.parse(JSON.stringify(sale.item)) : null,
      listedAt: Number.isSafeInteger(sale.listedAt) && sale.listedAt <= sale.at && sale.listedAt >= 0 ? sale.listedAt : null
    }));
    stall.saleSequence = Math.max(stall.saleSequence, ...stall.sales.map((sale) => sale.id));
  }
  function stallRulesLegacyOfflineItems(owner) {
    const offline = owner.offlineProgress || {};
    return [offline.stash, offline.protectedOverflow].flat();
  }
  function stallRulesRestore(env, owner) {
    const source = owner.playerStall;
    const stall = { ...JSON.parse(JSON.stringify(env.deps.defaultGame.playerStall)), ...source && typeof source === "object" ? source : {} };
    for (const key of ["sequence", "offerSequence", "eventSequence", "saleSequence", "nextOfferAt", "lastAt", "nextVisitAt", ...Object.values(env.rules.proceedsKeys)]) {
      stall[key] = Number.isSafeInteger(stall[key]) && stall[key] >= 0 ? stall[key] : 0;
    }
    stall.version = 8;
    delete stall.budgetMs;
    stallRulesRestoreVisitClock(env, stall);
    stall.rng = Number.isSafeInteger(stall.rng) ? stall.rng >>> 0 : 1357911;
    stall.history = Array.isArray(stall.history) ? stall.history.filter((event) => event && Number.isFinite(event.at)).map((event) => ({ ...event, currency: event.currency === void 0 ? "formlessDew" : event.currency })).filter((event) => stallRulesValidCurrency(env, event.currency)).slice(0, env.rules.historyLimit) : [];
    stall.eventSequence = Math.max(stall.eventSequence, ...stall.history.map((event) => Number.isSafeInteger(event.id) ? event.id : 0));
    stallRulesRestoreSales(env, stall, source);
    owner.playerStall = stall;
    const owned = [
      env.deps.getEquipmentLoadoutOwnedItems(owner),
      owner.equipmentTemporaryStorage,
      owner.timeRift.altarUnique,
      owner.timeRift.altarRare,
      stallRulesLegacyOfflineItems(owner),
      env.deps.actExplorationLoot.reservedItems(owner),
      env.deps.actExplorationState.groundLoot.reservedItems(owner)
    ].flat().filter(Boolean);
    const seen = { items: new Set(owned.map((item) => item.id)), listings: /* @__PURE__ */ new Set() };
    stall.listings = (Array.isArray(stall.listings) ? stall.listings : []).filter((row) => stallRulesRestoreListing(env, row, owner, seen));
    stall.sequence = Math.max(stall.sequence, ...seen.listings);
    stallRulesRestorePositions(env, stall, owner);
    if (!stall.listings.length) stall.nextVisitAt = 0;
    const offerIds = /* @__PURE__ */ new Set();
    stall.listings.forEach((row) => stallRulesRestoreOffer(env, stall, row, offerIds));
  }

  // modules/domain/stall-negotiation.mjs
  function stallRulesCounterOffer(env, owner, request, now) {
    const { listingId, offerId, amount } = request;
    const original = owner.playerStall.listings.find((entry) => entry.id === listingId)?.offer;
    if (!original || original.id !== offerId || original.negotiated) return { ok: false, reason: env.deps._t("역제안할 수 없는 제안입니다.") };
    const row = owner.playerStall.listings.find((entry) => entry.id === listingId);
    if (!stallRulesValidPrice(env, amount) || amount <= original.amount || amount > row.price) return { ok: false, reason: env.deps._t("손님의 제안보다 높고 희망가 이하인 정수를 입력하세요.") };
    const live = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!live) return { ok: false, reason: env.deps._t("이미 처리되었거나 기한이 지난 제안입니다.") };
    if (!Number.isSafeInteger(owner.playerStall[stallRulesBankKey(env, live.currency)] + amount)) return { ok: false, reason: env.deps._t("판매 대금을 먼저 수령해 주세요.") };
    return stallRulesResolveCounter(env, owner.playerStall, live, amount, stallRulesStallClock(owner.playerStall, now));
  }
  function stallRulesActionableOffer(env, owner, listingId, offerId, now) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner) || !stallRulesValidClock(now)) return null;
    const row = owner.playerStall.listings.find((entry) => entry.id === listingId);
    const offer = row?.offer;
    if (!offer || offer.id !== offerId) return null;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    return owner.playerStall.listings.includes(row) && row.offer === offer && offer.expiresAt > clock ? row : null;
  }
  function stallRulesAcceptOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t("이미 처리되었거나 기한이 지난 제안입니다.") };
    const offer = row.offer;
    if (offer.amount >= row.price || offer.amount > env.deps.itemAppraisal.quote(row.item, row.currency).ceiling) return { ok: false, reason: env.deps._t("제안의 금액을 확인해 주세요.") };
    const paid = stallRulesSell(env, owner.playerStall, row, stallRulesStallClock(owner.playerStall, now), env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId].name, offer.amount);
    return { ok: paid > 0, reason: paid ? env.deps._t("제안을 수락했습니다. 판매 대금에 {name} {amount}개가 적립되었습니다.", { name: env.deps._t(env.deps.ORB_DB[row.currency].name), amount: offer.amount }) : "판매 대금을 먼저 수령해 주세요." };
  }
  function stallRulesRejectOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t("이미 처리되었거나 기한이 지난 제안입니다.") };
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesRecord(env, owner.playerStall, {
      at: clock,
      currency: row.currency,
      customer: env.deps.PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
      sold: false,
      reason: env.deps._t("{name}의 가격 제안을 거절했습니다.", { name: row.item.name })
    });
    stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    return { ok: true, reason: env.deps._t("제안을 거절했습니다. 물건은 계속 진열됩니다.") };
  }

  // modules/domain/player-stall.mjs
  function createPlayerStall(deps) {
    const env = { deps };
    env.rules = env.deps.PLAYER_STALL_RULES;
    env.FLAG_REASONS = [
      ["locked", "잠근 장비입니다."],
      ["loopSealed", "봉인한 장비입니다."],
      ["tradeLocked", "거래할 수 없는 장비입니다."],
      ["hallReplica", "거래할 수 없는 장비입니다."],
      ["hallRelistBlocked", "거래할 수 없는 장비입니다."]
    ];
    return Object.freeze({
      unlocked: (...args) => stallRulesUnlocked(env, ...args),
      eligible: (...args) => stallRulesEligible(env, ...args),
      listBlockReason: (...args) => stallRulesListBlockReason(env, ...args),
      chance: (...args) => stallRulesChance(env, ...args),
      advance: (...args) => stallRulesAdvance(env, ...args),
      settle: (...args) => stallRulesSettle(env, ...args),
      payouts: (...args) => stallRulesPayouts(env, ...args),
      list: (...args) => stallRulesList(env, ...args),
      moveListing: (...args) => stallRulesMoveListing(env, ...args),
      withdraw: (...args) => stallRulesWithdraw(env, ...args),
      reprice: (...args) => stallRulesReprice(env, ...args),
      collect: (...args) => stallRulesCollect(env, ...args),
      loopBlockReason: (...args) => stallRulesLoopBlockReason(env, ...args),
      restore: (...args) => stallRulesRestore(env, ...args),
      acceptOffer: (...args) => stallRulesAcceptOffer(env, ...args),
      rejectOffer: (...args) => stallRulesRejectOffer(env, ...args),
      counterOffer: (...args) => stallRulesCounterOffer(env, ...args),
      setNegotiation: (...args) => stallRulesSetNegotiation(env, ...args)
    });
  }

  // modules/player-stall-classic.mjs
  var rules = createPlayerStall({
    get contentProgression() {
      return contentProgression;
    },
    get bagItems() {
      return bagItems;
    },
    get itemAppraisal() {
      return itemAppraisal;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get PLAYER_STALL_CUSTOMERS() {
      return PLAYER_STALL_CUSTOMERS;
    },
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get console() {
      return console;
    },
    get defaultGame() {
      return defaultGame;
    },
    get getEquipmentLoadoutOwnedItems() {
      return getEquipmentLoadoutOwnedItems;
    },
    get actExplorationLoot() {
      return actExplorationLoot;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get PLAYER_STALL_RULES() {
      return PLAYER_STALL_RULES;
    }
  });
  var playerStall = rules;
  safeExposeGlobals({ playerStall });
})();
