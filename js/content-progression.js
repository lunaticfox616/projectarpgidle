// GENERATED from modules/content-progression*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/content-unlock-rules.mjs
  function contentKind(def) {
    return def.cost > 0 ? "paid" : "auto";
  }
  function contentParents(def) {
    return [...new Set([def.after, ...def.requires || []].filter(Boolean))];
  }
  function contentRequirements(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def) return [];
    const rows = [[env.deps._t("루프 {minLoop}", { minLoop: def.minLoop }), owner.season >= def.minLoop]];
    for (const key of contentParents(def)) rows.push([env.deps._t("{name} 해금", { name: env.deps._t(env.definitions.get(key).name) }), contentIsUnlocked(env, key, owner)]);
    if (def.progress) rows.push(...env.progressChecks[def.progress](owner));
    return rows.map(([label, met, route]) => ({ label, met: !!met, route }));
  }
  function contentMeetsUsageGate(def, owner) {
    if (def.hardMinLoop && !(owner.season >= def.minLoop)) return false;
    if (def.id !== "battleTrials") return true;
    const state = owner.contentProgression;
    return owner.season >= def.minLoop && !!state && (state.unlocked.includes("trials") || state.inherited.includes("trials"));
  }
  function contentIsUnlocked(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def || !contentMeetsUsageGate(def, owner)) return false;
    const state = owner.contentProgression;
    if (!state) return true;
    if (state.unlocked.includes(id) || state.inherited.includes(id)) return true;
    if (contentKind(def) !== "auto") return false;
    if (state.automatic.includes(id)) return true;
    return contentAutomaticAccess(env, def, owner);
  }
  function contentAutomaticAccess(env, def, owner) {
    if (!contentOwnConditionsMet(env, def, owner)) return false;
    return !!owner.contentProgression.looseContent || contentEarlierRowsOpen(env, def, owner);
  }
  function contentOwnConditionsMet(env, def, owner) {
    return owner.season >= def.minLoop && (!def.progress || env.progressChecks[def.progress](owner).every((row) => row[1]));
  }
  function contentEarlierRowsOpen(env, def, owner) {
    const state = owner.contentProgression, waiting = contentParents(def);
    while (waiting.length) {
      const row = env.definitions.get(waiting.pop());
      if (!contentMeetsUsageGate(row, owner)) return false;
      if (state.unlocked.includes(row.id) || state.inherited.includes(row.id) || state.automatic.includes(row.id)) continue;
      if (contentKind(row) !== "auto" || !contentOwnConditionsMet(env, row, owner)) return false;
      waiting.push(...contentParents(row));
    }
    return true;
  }
  function contentHolds(env, id, owner, loop = null) {
    const def = env.definitions.get(id);
    if (!def) return false;
    return contentIsTreeRecord(env, owner?.contentProgression) ? contentHeldInRecord(owner.contentProgression, id) : contentReachedLoop(owner, loop) >= (def.formerLoop || def.minLoop);
  }
  function contentIsTreeRecord(env, state) {
    return !!state && Number(state.version) >= env.LEDGER_VERSION;
  }
  function contentHeldInRecord(state, id) {
    return [state.unlocked, state.inherited].some((list) => Array.isArray(list) && list.includes(id));
  }
  function contentReachedLoop(owner, loop) {
    return loop === null ? Math.max(Number(owner?.season) || 1, Number(owner?.contentProgression?.highestLoop) || 1) : loop;
  }
  function contentRank(env, series, owner) {
    const state = owner.contentProgression;
    if (!state) return 0;
    const owned = /* @__PURE__ */ new Set([...Array.isArray(state.unlocked) ? state.unlocked : [], ...Array.isArray(state.inherited) ? state.inherited : []]);
    return env.deps.CONTENT_UNLOCK_CATALOG.filter((def) => def.series === series && owned.has(def.id)).length;
  }
  function contentCanDropCurrency(env, key, owner) {
    const unlocks = env.deps.ORB_DB[env.deps.getCanonicalCurrencyKey(key)]?.dropUnlocks;
    return !unlocks || unlocks.some((id) => contentIsUnlocked(env, id, owner));
  }
  function contentCanDropUnique(env, unique, owner) {
    return !!unique && (!unique.contentUnlock || contentIsUnlocked(env, unique.contentUnlock, owner));
  }
  function contentCanOpenMap(owner) {
    return owner.season >= 2 || owner.maxZoneId >= 1 || owner.unlocks.map || owner.contentProgression.legacy === true;
  }
  function contentNpcsMet(owner) {
    return !!(owner.unlocks && owner.unlocks.npcs) || Object.keys(owner.npcMet || {}).length > 0;
  }
  function contentCanOpen(env, route, owner) {
    if (!env.opening.canOpen(owner, route)) return false;
    if (!owner.contentProgression || !route || env.coreRoutes.has(route)) return true;
    if (env.progressRoutes[route]) return env.progressRoutes[route](owner);
    const feature = env.routes.get(route);
    return !!feature && contentIsUnlocked(env, feature, owner);
  }

  // modules/domain/content-unlock-points.mjs
  function contentEarnedBy(env, loop, awards = env.deps.CONTENT_UNLOCK_POINT_AWARDS) {
    const { early, perLoop } = awards, loops = Math.max(0, Math.floor(Number(loop) || 1) - 1);
    return early.slice(0, loops).reduce((sum, points) => sum + points, 0) + Math.max(0, loops - early.length) * perLoop;
  }
  function contentCarryGap(env, loop) {
    return Math.max(0, contentEarnedBy(env, loop, env.AWARDS_BEFORE_NPC_SPLIT) - contentEarnedBy(env, loop, env.AWARDS_BEFORE_GROWTH));
  }
  function contentCarryOf(env, state, loop) {
    if (!(Number(state.version) >= env.NPC_SPLIT_VERSION)) return contentCarryGap(env, loop);
    return Math.min(contentCarryGap(env, loop), Math.max(0, Math.floor(Number(state.carry) || 0)));
  }
  function contentPaceGap(env, loop) {
    return Math.max(0, contentEarnedBy(env, loop, env.AWARDS_BEFORE_GROWTH) - contentEarnedBy(env, loop));
  }
  function contentPaceCarryOf(env, state, loop) {
    if (!(Number(state.version) >= env.SERIES_VERSION)) return 0;
    return Math.min(contentPaceGap(env, loop), Math.max(0, Math.floor(Number(state.paceCarry) || 0)));
  }
  function contentLedger(env, state, loop) {
    const unlocked = Array.isArray(state.unlocked) ? state.unlocked : [], inherited = Array.isArray(state.inherited) ? state.inherited : [];
    const version = Number(state.version), before = !(version >= env.SERIES_VERSION), beforeTree = !(version >= env.LEDGER_VERSION);
    const paid = (def) => !!def && contentKind(def) === "paid" && !(before && def.series) && !(beforeTree && def.since === env.LEDGER_VERSION) && !(def.addedIn && !(version >= def.addedIn));
    const remaining = env.deps.CONTENT_UNLOCK_CATALOG.reduce((sum, def) => sum + (paid(def) && !unlocked.includes(def.id) && !inherited.includes(def.id) ? def.cost : 0), 0);
    const spent = unlocked.reduce((sum, id) => sum + (paid(env.definitions.get(id)) ? Number((state.paidCosts || {})[id]) || 0 : 0), 0);
    const reached = Math.max(Number(state.highestLoop) || 1, loop);
    const earned = contentEarnedBy(env, reached, before ? env.AWARDS_BEFORE_GROWTH : env.deps.CONTENT_UNLOCK_POINT_AWARDS) + contentCarryOf(env, state, reached) + contentPaceCarryOf(env, state, reached);
    return { remaining, spent, earned };
  }
  function contentPoints(env, owner) {
    const state = owner.contentProgression;
    if (!state) return { balance: 0, remaining: 0, nextAward: 0, complete: true };
    const { remaining, spent, earned } = contentLedger(env, state, owner.season);
    const current = Math.min(remaining, Math.max(0, earned - spent));
    const nextEarned = contentLedger(env, state, owner.season + 1).earned;
    const nextAward = Math.min(remaining, Math.max(0, nextEarned - spent)) - current;
    return { balance: current, remaining, nextAward, complete: remaining === 0 };
  }
  function contentOverflow(env, owner) {
    const state = owner.contentProgression;
    return state ? contentOverflowOf(env, state, owner.season) : 0;
  }
  function contentOverflowOf(env, state, loop) {
    const { remaining, spent, earned } = contentLedger(env, state, loop);
    const floor = Number(state.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(state.graftFloor) || 0)) : 0;
    return Math.max(floor, earned - spent - remaining, 0);
  }
  function contentBalance(env, owner) {
    return contentPoints(env, owner).balance;
  }

  // modules/domain/content-unlock-purchase.mjs
  function contentCheapestOpen(env, owner) {
    return env.deps.CONTENT_UNLOCK_CATALOG.filter((def) => contentKind(def) === "paid" && !def.series && owner.season >= def.minLoop && !contentIsUnlocked(env, def.id, owner) && contentRequirements(env, def.id, owner).every((row) => row.met)).reduce((best, def) => !best || def.cost < best.cost ? def : best, null);
  }
  function contentStatus(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def) return { available: false, reason: env.deps._t("알 수 없는 콘텐츠입니다.") };
    if (contentIsUnlocked(env, id, owner)) return { available: false, reason: env.deps._t("해금 완료"), unlocked: true };
    const missing = contentRequirements(env, id, owner).filter((row) => !row.met);
    if (missing.length) return { available: false, reason: env.deps._t("{label} 필요", { label: env.deps._t(missing[0].label) }) };
    if (contentBalance(env, owner) < def.cost) return { available: false, reason: env.deps._t("해금 포인트 부족") };
    return { available: true, reason: env.deps._t("{cost}점으로 해금", { cost: def.cost }) };
  }
  function contentSync(env, owner) {
    const state = owner.contentProgression;
    if (!state) return;
    state.highestLoop = Math.max(state.highestLoop, Math.floor(owner.season || 1));
    Object.assign(owner.unlocks, { char: contentCanOpen(env, "tab-char", owner), items: true, skills: true, map: contentCanOpen(env, "tab-map", owner), season: owner.season >= 2 });
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
      const opened = contentIsUnlocked(env, def.id, owner);
      if (def.gate) owner.unlocks[def.gate] = opened;
      for (const flag of def.flags || []) owner[flag] = opened;
    }
    const automatic = env.deps.CONTENT_UNLOCK_CATALOG.filter((def) => contentKind(def) === "auto" && contentIsUnlocked(env, def.id, owner)).map((def) => def.id);
    state.automatic = [.../* @__PURE__ */ new Set([...state.automatic, ...automatic])];
  }
  function contentGrantEntryReward(env, id, key, owner) {
    if (id === "craft") owner.currencies[key]++;
    if (id === "support") {
      if (!env.deps.hasSupportGemOwned(key, owner)) {
        owner.supports.push(key);
        owner.supportGemData[key] = env.deps.normalizeGemRecord(null);
      }
    }
  }
  function contentPurchase(env, id, owner, rewardKey) {
    const def = env.definitions.get(id), check = contentStatus(env, id, owner);
    if (!check.available) return { ok: false, message: check.reason };
    if (contentKind(def) !== "paid") return { ok: false, message: env.deps._t("조건을 채우면 저절로 열립니다.") };
    const choices = def.rewardChoices || [];
    const key = rewardKey === void 0 ? choices[0]?.key : rewardKey;
    if (choices.length && !choices.some((row) => row.key === key)) return { ok: false, message: env.deps._t("받을 보상을 선택하세요.") };
    contentGrantEntryReward(env, id, key, owner);
    owner.contentProgression.unlocked.push(id);
    owner.contentProgression.paidCosts[id] = def.cost;
    contentSync(env, owner);
    return { ok: true, message: env.deps._t("{name} 해금", { name: env.deps._t(def.name) }) };
  }
  function contentPlanTarget(env, id, owner) {
    if (!owner.contentProgression || id !== "" && !env.definitions.has(id)) return false;
    owner.contentProgression.plannedUnlockId = id;
    return true;
  }

  // modules/domain/content-unlock-migrations.mjs
  function contentLegacyAccess(def, owner) {
    if (def.addedIn || ["craftSimulator", "knitting"].includes(def.id)) return false;
    if (def.id === "market") return owner.maxZoneId >= 5;
    if ((def.routes || []).some((route) => owner.unlockedMapContents.includes(route))) return true;
    if (def.id === "journal") return owner.journalEntries.length > 0;
    if (def.gate) return !!owner.unlocks[def.gate];
    if (def.flags) return def.flags.some((flag) => owner[flag]);
    return owner.season >= def.minLoop || ["support", "craft", "fossil", "hall", "records"].includes(def.id);
  }
  function contentRestorePurchases(env, purchased, next, record) {
    const version = Number(record.version) || 0, saved = new Set(purchased);
    let remaining = contentEarnedBy(env, next.highestLoop) + next.carry + contentPaceCarryOf(env, next, next.highestLoop);
    for (const id of purchased) {
      const def = env.definitions.get(id);
      if (!def || contentKind(def) === "auto" || next.inherited.includes(id)) continue;
      const cost = contentRestoredPrice(env, def, record);
      if (cost > remaining) continue;
      if (version >= 4 && !next.grandfathered.includes(id) && !contentCanRestoreChoice(env, def, next, version, saved)) continue;
      next.unlocked.push(id);
      next.paidCosts[id] = cost;
      remaining -= cost;
    }
  }
  function contentKeepEarlyPurchases(env, purchased, next, record) {
    if (Number(record.version) >= env.LOOP_MOVE_VERSION) return;
    for (const id of purchased) {
      if (next.highestLoop < env.definitions.get(id).minLoop && !next.grandfathered.includes(id)) next.grandfathered.push(id);
    }
  }
  function contentCanRestoreChoice(env, def, next, version, saved) {
    if (next.highestLoop < def.minLoop) return false;
    if (version < env.LEDGER_VERSION) return true;
    return contentParents(def).every((key) => saved.has(key) || next.inherited.includes(key) || contentKind(env.definitions.get(key)) === "auto");
  }
  function contentRestoredPrice(env, def, record) {
    const version = Number(record.version) || 0;
    if (version < env.LEDGER_VERSION && def.since === env.LEDGER_VERSION) return 0;
    if (version < 6) return 1;
    const paid = record.paidCosts?.[def.id];
    return paid === 0 || paid === 1 ? paid : def.cost;
  }
  function contentInheritFormerFreeAccess(record, next, owner) {
    if (!(Number(record.version) < 4)) return;
    const previous = /* @__PURE__ */ new Set([...Array.isArray(record.unlocked) ? record.unlocked : [], ...next.inherited]);
    if (record.version === 3) {
      const bundled = [["gemForge", 4]];
      for (const [id, loop] of bundled) {
        if (previous.has(id) || previous.has("support") && next.highestLoop >= loop) next.inherited.push(id);
      }
    }
    if (owner.season >= 10) next.inherited.push("deepTree");
    next.inherited = [...new Set(next.inherited)];
  }
  function contentSavedPurchases(env, record) {
    const ids = contentSavedIds(env, record.unlocked);
    return Number(record.version) >= env.SERIES_VERSION ? ids : ids.filter((id) => !env.definitions.get(id).series);
  }
  function contentSavedIds(env, raw) {
    return [...new Set((Array.isArray(raw) ? raw : []).filter((id) => env.definitions.has(id)))];
  }
  function contentRestoredLedger(env, record, owner, legacy) {
    const savedLoop = Number.isFinite(record.highestLoop) ? record.highestLoop : 1;
    const highestLoop = Math.max(1, owner.season, Math.min(1e6, Math.floor(savedLoop)));
    const inherited = legacy ? env.deps.CONTENT_UNLOCK_CATALOG.filter((def) => contentLegacyAccess(def, owner)).map((def) => def.id) : contentSavedIds(env, record.inherited);
    const savedChoices = contentSavedIds(env, record.unlocked);
    const grandfathered = Number(record.version) < 5 ? savedChoices : record.grandfathered;
    return {
      version: env.deps.CONTENT_UNLOCK_RECORD_VERSION,
      highestLoop,
      legacy: legacy || record.legacy === true,
      carry: contentCarryOf(env, record, highestLoop),
      looseContent: record.looseContent === true,
      graftFloor: Number(record.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(record.graftFloor) || 0)) : 0,
      paceCarry: Number(record.version) >= env.SERIES_VERSION ? Math.max(0, Math.floor(Number(record.paceCarry) || 0)) : contentPaceGap(env, highestLoop),
      unlocked: [],
      paidCosts: {},
      inherited: contentSavedIds(env, inherited),
      grandfathered: contentSavedIds(env, grandfathered),
      plannedUnlockId: env.definitions.has(record.plannedUnlockId) ? record.plannedUnlockId : "",
      automatic: contentSavedIds(env, record.automatic).filter((id) => contentKind(env.definitions.get(id)) === "auto")
    };
  }
  function contentRestore(env, raw, owner, existingSave) {
    const record = raw && typeof raw === "object" ? raw : {};
    const next = contentRestoredLedger(env, record, owner, raw === void 0 && existingSave);
    contentInheritFormerTactics(env, record, next, owner, existingSave);
    contentInheritFormerFreeAccess(record, next, owner);
    const purchases = contentSavedPurchases(env, record);
    contentKeepEarlyPurchases(env, purchases, next, record);
    contentRestorePurchases(env, purchases, next, record);
    if (Number(record.version) < 5 && [...next.unlocked, ...next.inherited].some((id) => contentKind(env.definitions.get(id)) !== "auto") && ![...next.unlocked, ...next.inherited].includes("craft")) next.inherited.push("craft");
    next.grandfathered = next.grandfathered.filter((id) => next.unlocked.includes(id));
    contentInheritSplitGrowth(record, next);
    contentInheritGrowthSeries(env, record, next, owner, existingSave);
    contentInheritTreeAccess(env, record, next, existingSave);
    contentKeepOverflowOfAddedRows(env, record, next, existingSave);
    contentInheritVoidSockets(env, record, next, existingSave);
    contentInheritPassiveTree(env, record, next, owner, existingSave);
    return next;
  }
  function contentInheritGrowthSeries(env, record, next, owner, existingSave) {
    if (Number(record.version) >= env.SERIES_VERSION || !existingSave) return;
    const offline = owner.offlineProgress || {}, level = (key) => Math.max(0, Math.floor(Number(offline[key]) || 0));
    const steps = {
      bagPage: env.deps.getEquipmentInventoryPageCount({ ...owner, contentProgression: null }) - 1,
      offlineHours: level("recognitionLevel"),
      offlineRate: level("efficiencyLevel")
    };
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
      if (def.series && def.rank <= (steps[def.series] || 0) && !next.inherited.includes(def.id)) next.inherited.push(def.id);
    }
    next.graftFloor = contentOverflowOf(env, record, next.highestLoop);
  }
  function contentKeepOverflowOfAddedRows(env, record, next, existingSave) {
    if (Number(record.version) >= env.deps.CONTENT_UNLOCK_RECORD_VERSION || !existingSave) return;
    next.graftFloor = Math.max(next.graftFloor, contentOverflowOf(env, record, next.highestLoop));
  }
  function contentInheritVoidSockets(env, record, next, existingSave) {
    const def = env.definitions.get("voidSocket");
    if (!(Number(record.version) < def.addedIn) || !existingSave || next.highestLoop < def.minLoop) return;
    if (!next.unlocked.includes(def.id) && !next.inherited.includes(def.id)) next.inherited.push(def.id);
  }
  function contentInheritPassiveTree(env, record, next, owner, existingSave) {
    const def = env.definitions.get("passiveTree");
    if (!existingSave || (Number(record.version) || 0) >= def.addedIn) return;
    if (next.unlocked.includes(def.id) || next.inherited.includes(def.id)) return;
    if (next.highestLoop >= def.minLoop || owner.passives?.length || owner.passivePoints > 0) next.inherited.push(def.id);
  }
  function contentInheritTreeAccess(env, record, next, existingSave) {
    if (Number(record.version) >= env.LEDGER_VERSION || !existingSave || next.highestLoop < 2) return;
    next.looseContent = true;
    for (const def of env.deps.CONTENT_UNLOCK_CATALOG) {
      const owned = next.unlocked.includes(def.id) || next.inherited.includes(def.id);
      if (def.since === env.LEDGER_VERSION && !owned && next.highestLoop >= (def.formerLoop || def.minLoop)) next.inherited.push(def.id);
    }
    next.graftFloor = Math.max(next.graftFloor, contentOverflowOf(env, record, next.highestLoop));
  }
  function contentInheritFormerTactics(env, record, next, owner, existingSave) {
    if (!existingSave || next.inherited.includes("tactics")) return;
    const formerSetting = Number(record.version || 0) < 8 && owner.combatTacticsUnlocked === true;
    if (formerSetting || contentSavedIds(env, record.unlocked).includes("tactics")) next.inherited.push("tactics");
  }
  function contentInheritSplitGrowth(record, next) {
    if (Number(record.version) >= 7) return;
    const owned = /* @__PURE__ */ new Set([...next.unlocked, ...next.inherited]);
    if (owned.has("gemForge") && !owned.has("engraving")) next.inherited.push("engraving");
  }

  // modules/domain/content-opening-rules.mjs
  function openingSeen(owner, key) {
    return !!owner.seenTutorials?.includes(key);
  }
  function openingVisitKey(route) {
    return "opening_visited_" + route;
  }
  function openingEnrolled(env, owner) {
    return openingSeen(owner, env.ENROLLED);
  }
  function openingApplies(env, owner) {
    return (owner.season || 1) === 1 && openingEnrolled(env, owner);
  }
  function openingEquipped(owner) {
    return openingSeen(owner, "opening_done");
  }
  function openingCombatOnly(env, owner) {
    return openingApplies(env, owner) && !openingEquipped(owner);
  }
  function openingHasLoot(owner) {
    return owner.inventory.some(Boolean) || Object.entries(owner.equipment).some(([slot, item]) => slot !== "무기" && !!item);
  }
  function openingCanOpen(env, owner, route) {
    return !openingApplies(env, owner) || !Object.hasOwn(env.gates, route) || !!env.gates[route](owner);
  }
  function openingSignature(env, owner) {
    return openingApplies(env, owner) ? Object.keys(env.gates).map((route) => Number(openingCanOpen(env, owner, route))).join("") : "";
  }
  function openingEnroll(env, owner) {
    if (!openingSeen(owner, env.ENROLLED)) owner.seenTutorials.push(env.ENROLLED);
  }
  function openingTradeReady(owner) {
    return openingEquipped(owner) && owner.maxZoneId >= 5 && Object.values(owner.npcShops || {}).some((shop) => shop.loop === owner.season && shop.zoneId >= 5 && shop.offers?.length > 0);
  }
  function openingVisit(env, owner, route) {
    if (!openingApplies(env, owner) || !env.cues.includes(route) || openingSeen(owner, openingVisitKey(route))) return false;
    if (route === "tab-items" && owner.starterWeaponTutorialPending != null) return false;
    owner.seenTutorials.push(openingVisitKey(route));
    return true;
  }
  function openingCueReady(env, owner, route) {
    if (openingSeen(owner, openingVisitKey(route)) || !openingCanOpen(env, owner, route)) return false;
    if (route === "tab-map") return owner.maxZoneId === 1 && owner.currentZoneId === 0;
    if (route === "tab-items") return openingHasLoot(owner);
    if (route === "tab-journal") return !openingSeen(owner, env.TRADE);
    if (route === "tab-trade") return true;
    return owner.maxZoneId < 4;
  }
  function openingNextCue(env, owner) {
    return openingApplies(env, owner) && openingEquipped(owner) ? env.cues.find((route) => openingCueReady(env, owner, route)) : null;
  }
  function openingInlineNotice(env, owner, key) {
    return openingApplies(env, owner) && env.inlineKeys.has(key);
  }
  function openingSync(env, owner) {
    if (!openingApplies(env, owner)) return;
    if (!openingSeen(owner, env.GEAR) && openingHasLoot(owner)) owner.seenTutorials.push(env.GEAR);
    if (!openingSeen(owner, env.PROFILE) && owner.passives.length > 0) owner.seenTutorials.push(env.PROFILE);
    if (!openingSeen(owner, env.TRADE) && openingTradeReady(owner)) owner.seenTutorials.push(env.TRADE);
  }

  // modules/domain/content-opening.mjs
  function createOpeningProgression(deps) {
    const env = { deps };
    env.ENROLLED = "opening_systems_v2";
    env.GEAR = "opening_gear_ready";
    env.PROFILE = "opening_profile_ready";
    env.TRADE = "opening_trade_ready";
    env.cues = ["tab-items", "tab-map", "tab-character", "tab-journal", "tab-trade"];
    env.inlineKeys = /* @__PURE__ */ new Set([
      "unlock_items",
      "tutorial_first_gear",
      "tutorial_starter_gem_equip",
      "unlock_map"
    ]);
    env.gates = {
      "tab-skills": (owner) => !!env.deps.SKILL_DB[owner.activeSkill]?.isGem || openingEquipped(owner) || owner.maxZoneId >= 1,
      "tab-items": (owner) => openingSeen(owner, env.GEAR),
      "tab-character": (owner) => openingSeen(owner, env.PROFILE),
      "tab-trade": (owner) => openingSeen(owner, env.TRADE),
      "tab-journal": (owner) => owner.maxZoneId >= 4 || openingSeen(owner, openingVisitKey("tab-journal")),
      "tab-social": () => false,
      "tab-records": () => false
    };
    return Object.freeze({
      applies: (...args) => openingApplies(env, ...args),
      enroll: (...args) => openingEnroll(env, ...args),
      combatOnly: (...args) => openingCombatOnly(env, ...args),
      hasLoot: openingHasLoot,
      canOpen: (...args) => openingCanOpen(env, ...args),
      signature: (...args) => openingSignature(env, ...args),
      sync: (...args) => openingSync(env, ...args),
      visit: (...args) => openingVisit(env, ...args),
      nextCue: (...args) => openingNextCue(env, ...args),
      inlineNotice: (...args) => openingInlineNotice(env, ...args)
    });
  }

  // modules/domain/content-progression.mjs
  function createContentProgressChecks(deps) {
    return {
      tactics: (owner) => [["액트 3 클리어", deps.hasCombatTacticsUnlockProgress(owner)]],
      trials: (owner) => [["액트 3 클리어", owner.maxZoneId >= 3 || owner.completedTrials.length > 0]],
      meteor: (owner) => [["루프 7에서 액트 7 클리어", owner.maxZoneId >= 7]],
      deepChaos: (owner) => [["혼돈 20층 클리어", deps.hasCurrentLoopChaos20Clear(owner)]],
      chaosRealm: (owner) => [["나무꾼에게 10% 피해 후 전투 종료", !!owner.chaosRealm.unlocked, "outside-chaos"]],
      underworld: deps.getUnderworldUnlockChecks,
      cosmos: deps.getCosmosUnlockChecks,
      sky: (owner) => [["혼돈 20층 클리어", owner.skyTower.unlocked || owner.season > 15 || deps.hasCurrentLoopChaos20Clear(owner), "map-explore-chaos"]],
      beyond: (owner) => [["경계의 관측자 처치, 그리고 루프 50 또는 세계수 씨앗 4개", deps.isBeyondBoundaryUnlockRequirementMet(owner)]],
      cube: (owner) => [["지하계 10층 클리어", owner.underworldProgress.highestFloor >= 11]],
      talent: (owner) => [["재능 개화", deps.hasPermanentTalentTabUnlock(owner)]],
      woodsman: (owner) => [["나무꾼 조우 또는 기록", !!owner.woodsmanSimulatorSeenLoop || owner.woodsmanDefeatAttempts > 0 || owner.journalEntries.includes("woodsman")]],
      stump: (owner) => [["액트 10 클리어", !!(owner.stumpBox && owner.stumpBox.acquired) || deps.stumpBox.eligible(owner)]]
    };
  }
  function createContentProgressRoutes(env) {
    return {
      "tab-map": contentCanOpenMap,
      "tab-season": (owner) => owner.season >= 2,
      "tab-unlocks": (owner) => owner.season >= 2,
      "tab-guide": (owner) => contentCanOpen(env, "tab-journal", owner),
      // NPC, 거래소, 장비 전당 중 하나가 열리면 거래 창을 연다. 옛 칸 주소는 UI가 이 창으로 보낸다.
      "tab-trade": (owner) => contentNpcsMet(owner) || contentIsUnlocked(env, "market", owner) || contentIsUnlocked(env, "hall", owner),
      // 아틀라스와 혼돈계의 최초 개방 기록은 서로 독립적이다.
      "map-explore-worldtree": (owner) => !!owner.atlas?.unlocked
    };
  }
  function createContentEnvironment(deps) {
    const env = { deps };
    env.definitions = new Map(deps.CONTENT_UNLOCK_CATALOG.map((row) => [row.id, row]));
    env.routes = new Map(deps.CONTENT_UNLOCK_CATALOG.flatMap((row) => (row.routes || []).map((route) => [route, row.id])));
    env.coreRoutes = /* @__PURE__ */ new Set([
      "tab-character",
      "tab-items",
      "tab-skills",
      "tab-battle",
      "tab-settings",
      "tab-social",
      "item-tab-equip",
      "skill-tab-equip",
      "map-tab-zones",
      "map-explore-atlas",
      "map-explore-hunting",
      "map-explore-chaos",
      "map-explore-root-boss"
    ]);
    env.opening = createOpeningProgression(deps);
    env.progressChecks = createContentProgressChecks(deps);
    env.progressRoutes = createContentProgressRoutes(env);
    env.AWARDS_BEFORE_NPC_SPLIT = Object.freeze({ early: Object.freeze([4, 4, 3, 3]), perLoop: 2 });
    env.AWARDS_BEFORE_GROWTH = Object.freeze({ early: Object.freeze([2, 2, 3, 3, 2, 1, 1, 1, 2]), perLoop: 2 });
    env.NPC_SPLIT_VERSION = 9;
    env.SERIES_VERSION = env.deps.CONTENT_UNLOCK_SERIES_VERSION;
    env.LEDGER_VERSION = env.deps.CONTENT_UNLOCK_TREE_VERSION;
    env.LOOP_MOVE_VERSION = env.deps.CONTENT_UNLOCK_LOOP_MOVE_VERSION;
    return env;
  }
  function createContentProgression(deps) {
    const env = createContentEnvironment(deps);
    return Object.freeze({
      opening: env.opening,
      kind: contentKind,
      parents: contentParents,
      holds: (...args) => contentHolds(env, ...args),
      rank: (...args) => contentRank(env, ...args),
      isUnlocked: (...args) => contentIsUnlocked(env, ...args),
      canDropUnique: (...args) => contentCanDropUnique(env, ...args),
      canDropCurrency: (...args) => contentCanDropCurrency(env, ...args),
      canOpen: (...args) => contentCanOpen(env, ...args),
      npcsMet: contentNpcsMet,
      earnedBy: (...args) => contentEarnedBy(env, ...args),
      points: (...args) => contentPoints(env, ...args),
      overflow: (...args) => contentOverflow(env, ...args),
      balance: (...args) => contentBalance(env, ...args),
      cheapestOpen: (...args) => contentCheapestOpen(env, ...args),
      status: (...args) => contentStatus(env, ...args),
      requirements: (...args) => contentRequirements(env, ...args),
      sync: (...args) => contentSync(env, ...args),
      purchase: (...args) => contentPurchase(env, ...args),
      restore: (...args) => contentRestore(env, ...args),
      planTarget: (...args) => contentPlanTarget(env, ...args)
    });
  }

  // modules/content-progression-classic.mjs
  var rules = createContentProgression({
    get _t() {
      return _t;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getCanonicalCurrencyKey() {
      return getCanonicalCurrencyKey;
    },
    get CONTENT_UNLOCK_POINT_AWARDS() {
      return CONTENT_UNLOCK_POINT_AWARDS;
    },
    get hasSupportGemOwned() {
      return hasSupportGemOwned;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get CONTENT_UNLOCK_RECORD_VERSION() {
      return CONTENT_UNLOCK_RECORD_VERSION;
    },
    get getEquipmentInventoryPageCount() {
      return getEquipmentInventoryPageCount;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getUnderworldUnlockChecks() {
      return getUnderworldUnlockChecks;
    },
    get getCosmosUnlockChecks() {
      return getCosmosUnlockChecks;
    },
    get hasCombatTacticsUnlockProgress() {
      return hasCombatTacticsUnlockProgress;
    },
    get hasCurrentLoopChaos20Clear() {
      return hasCurrentLoopChaos20Clear;
    },
    get isBeyondBoundaryUnlockRequirementMet() {
      return isBeyondBoundaryUnlockRequirementMet;
    },
    get hasPermanentTalentTabUnlock() {
      return hasPermanentTalentTabUnlock;
    },
    get stumpBox() {
      return stumpBox;
    },
    get CONTENT_UNLOCK_SERIES_VERSION() {
      return CONTENT_UNLOCK_SERIES_VERSION;
    },
    get CONTENT_UNLOCK_TREE_VERSION() {
      return CONTENT_UNLOCK_TREE_VERSION;
    },
    get CONTENT_UNLOCK_LOOP_MOVE_VERSION() {
      return CONTENT_UNLOCK_LOOP_MOVE_VERSION;
    }
  });
  var contentProgression = Object.freeze({
    ...rules,
    requirements: (id, owner = game) => rules.requirements(id, owner),
    isUnlocked: (id, owner = game) => rules.isUnlocked(id, owner),
    holds: (id, owner = game, loop = null) => rules.holds(id, owner, loop),
    rank: (series, owner = game) => rules.rank(series, owner),
    canDropCurrency: (key, owner = game) => rules.canDropCurrency(key, owner),
    canDropUnique: (unique, owner = game) => rules.canDropUnique(unique, owner),
    canOpen: (route, owner = game) => rules.canOpen(route, owner),
    points: (owner = game) => rules.points(owner),
    overflow: (owner = game) => rules.overflow(owner),
    balance: (owner = game) => rules.balance(owner),
    cheapestOpen: (owner = game) => rules.cheapestOpen(owner),
    status: (id, owner = game) => rules.status(id, owner),
    sync: (owner = game) => rules.sync(owner),
    purchase: (id, owner = game, rewardKey) => rules.purchase(id, owner, rewardKey),
    planTarget: (id, owner = game) => rules.planTarget(id, owner)
  });
  safeExposeGlobals({ contentProgression });
})();
