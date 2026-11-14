// GENERATED from modules/items*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/item-footprints.mjs
  function itemFlowGetCodexSlotOrder() {
    return ["무기", "방패", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠"];
  }
  function itemFlowGetEquipmentInventoryFootprint(env, item) {
    let slot = String(item && item.slot || "").replace(/[123]$/, "");
    if (slot === "반지" || slot === "목걸이") return { columns: 1, rows: 1 };
    if (slot === "허리띠") return { columns: 2, rows: 1 };
    if (["투구", "장갑", "신발", "방패", "갑옷"].includes(slot)) return { columns: 2, rows: 2 };
    return slot === "무기" ? itemFlowGetWeaponInventoryFootprint(env, item) : { columns: 1, rows: 1 };
  }
  function itemFlowGetWeaponInventoryFootprint(env, item) {
    const category = env.deps.getWeaponCategoryId(item);
    if (category === "scimitar") return { columns: 1, rows: 3 };
    if (category === "greatsword") return { columns: env.deps.SLENDER_GREATSWORD_BASES.includes(env.deps.getWeaponBaseId(item)) ? 1 : 2, rows: 4 };
    return category === "shortbow" ? { columns: 2, rows: 3 } : { columns: 2, rows: 2 };
  }
  function itemFlowGetAverageExplicitAffixTier(items) {
    let tiers = (Array.isArray(items) ? items : []).flatMap((item) => {
      if (!item || item.rarity === "unique") return [];
      return (Array.isArray(item.stats) ? item.stats : []).filter((stat) => stat && !stat.encroachedFinal && !stat.encroachedCandidate && !stat.sourceOptionId && Number.isFinite(Number(stat.tier)) && Number(stat.tier) > 0).map((stat) => Number(stat.tier));
    });
    return tiers.length ? tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length : 0;
  }

  // modules/domain/item-craft-selection.mjs
  function itemFlowGetCraftSelectionRef(env) {
    return env.craftingSelectionState.ref;
  }
  function itemFlowIsCraftSelectionEquip(env) {
    return !!env.craftingSelectionState.isEquip;
  }
  function itemFlowClearCraftSelection(env) {
    env.craftingSelectionState.ref = null;
    env.craftingSelectionState.isEquip = false;
  }
  function itemFlowGetSelectedCraftItem(env, owner) {
    if (env.craftingSelectionState.ref === null) return null;
    const item = env.craftingSelectionState.isEquip ? owner.equipment[env.craftingSelectionState.ref] : (owner.inventory || []).find((row) => row.id === env.craftingSelectionState.ref);
    return item && !item.hallReplica ? item : null;
  }
  function itemFlowEnsureCraftSelectionValid(env, owner) {
    if (env.craftingSelectionState.ref !== null && !itemFlowGetSelectedCraftItem(env, owner)) itemFlowClearCraftSelection(env);
  }
  function* itemFlowSelectForCrafting(env, owner, ref, isEquip) {
    let item = isEquip ? owner.equipment[ref] : (owner.inventory || []).find((row) => row && Number(row.id) === Number(ref));
    if (item && item.hallReplica) {
      yield { kind: "itemLog", args: [env.deps._t("전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다."), "attack-monster"] };
      return false;
    }
    if (env.deps.bagItems.isSpecial(item)) {
      yield { kind: "itemLog", args: [env.deps._t("주얼, 코어, 액막이는 제작할 수 없습니다."), "attack-monster"] };
      return false;
    }
    env.craftingSelectionState.ref = ref;
    env.craftingSelectionState.isEquip = isEquip;
    yield { kind: "itemRefresh", args: [] };
    return true;
  }

  // modules/domain/item-craft-snapshot.mjs
  function itemFlowCopyCraftResultStat(stat) {
    if (!stat) return null;
    return {
      id: stat.id || "",
      statName: stat.statName || "",
      val: stat.val,
      tier: stat.tier,
      lockedByHoney: !!stat.lockedByHoney,
      lockedByRift: !!stat.lockedByRift,
      unremovable: !!stat.unremovable,
      venomStingerBonus: !!stat.venomStingerBonus
    };
  }
  function itemFlowCraftResultWardSlots(env, item) {
    return typeof env.deps.colonyWards === "object" ? env.deps.colonyWards.beltRoll(item) : void 0;
  }
  function itemFlowSnapshotCraftResultItem(env, item) {
    if (!item) return null;
    return {
      name: item.name || "",
      baseName: item.baseName || "",
      rarity: item.rarity || "normal",
      quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
      corrupted: !!item.corrupted,
      sockets: env.deps.equipmentSockets.count(item),
      uniqueEffect: item.uniqueEffect || "",
      wardSlots: itemFlowCraftResultWardSlots(env, item),
      baseStats: (item.baseStats || []).map(itemFlowCopyCraftResultStat).filter(Boolean),
      stats: (item.stats || []).map(itemFlowCopyCraftResultStat).filter(Boolean),
      chaosInfusion: itemFlowCopyCraftResultStat(item.chaosInfusion),
      encroachedStat: itemFlowCopyCraftResultStat(item.encroached && item.encroached.chosen)
    };
  }

  // modules/domain/item-equip-slots.mjs
  function itemFlowGetEquipCandidateSlots(env, owner, item, targetGame = owner) {
    if (!item || env.deps.getPassiveEquipmentRestriction(item, targetGame)) return [];
    if (item.slot === "반지") return env.deps.getTranscendentVoidPassiveCount("thirdFinger", targetGame) > 0 ? ["반지1", "반지2", "반지3"] : ["반지1", "반지2"];
    if (item.slot === "장갑") return ["장갑1", "장갑2"];
    const special = env.deps.bagItems.candidateSlots(item, targetGame);
    if (special) return special;
    let warriorDualTrain = env.deps.hasKeystone("w3", targetGame);
    if (item.slot === "무기") return warriorDualTrain ? ["무기", "방패"] : ["무기"];
    return [item.slot];
  }
  function itemFlowCanEquipItemToSlot(env, owner, item, preferredSlot) {
    return !!preferredSlot && itemFlowGetEquipCandidateSlots(env, owner, item).includes(preferredSlot) && env.deps.combatEquipmentStats.inspect(item, preferredSlot, owner).ok;
  }
  function itemFlowPickEquipSlot(env, owner, item, preferredSlot) {
    let candidates = itemFlowGetEquipCandidateSlots(env, owner, item);
    if (candidates.length === 0) return null;
    if (preferredSlot && candidates.includes(preferredSlot)) return preferredSlot;
    if (item.slot === env.deps.COLONY_WARD_RULES.slot) return env.deps.colonyWards.pickSlot(owner);
    if (item.slot === "반지") return pickEmptyRingSlot(env, owner);
    if (item.slot === "장갑") {
      if (!owner.equipment["장갑1"]) return "장갑1";
      if (!owner.equipment["장갑2"]) return "장갑2";
      return null;
    }
    if (item.slot === "무기") return pickWeaponSlot(env, owner, preferredSlot, candidates[0]);
    return candidates[0];
  }
  function pickEmptyRingSlot(env, owner) {
    if (!owner.equipment["반지1"]) return "반지1";
    if (!owner.equipment["반지2"]) return "반지2";
    if (typeof env.deps.getTranscendentVoidPassiveCount === "function" && env.deps.getTranscendentVoidPassiveCount("thirdFinger", owner) > 0 && !owner.equipment["반지3"]) return "반지3";
    return null;
  }
  function pickWeaponSlot(env, owner, preferredSlot, firstCandidate) {
    const warriorDualTrain = typeof env.deps.hasKeystone === "function" && env.deps.hasKeystone("w3", owner);
    if (!warriorDualTrain || preferredSlot) return firstCandidate;
    if (owner.equipment["무기"] && !owner.equipment["방패"]) return "방패";
    if (!owner.equipment["무기"]) return "무기";
    if (!owner.equipment["방패"]) return "방패";
    const shieldItem = owner.equipment["방패"];
    return shieldItem && shieldItem.slot === "방패" ? "방패" : null;
  }
  function itemFlowIsDualSlotItem(env, owner, slotName) {
    if (slotName === "반지" || slotName === "장갑") return true;
    return slotName === "무기" && typeof env.deps.hasKeystone === "function" && env.deps.hasKeystone("w3", owner);
  }
  function itemFlowDualSlotBothOccupied(env, owner, slotName) {
    if (slotName === "반지") return !!(owner.equipment["반지1"] && owner.equipment["반지2"] && (!(typeof env.deps.getTranscendentVoidPassiveCount === "function" && env.deps.getTranscendentVoidPassiveCount("thirdFinger", owner) > 0) || owner.equipment["반지3"]));
    if (slotName === "장갑") return !!(owner.equipment["장갑1"] && owner.equipment["장갑2"]);
    return false;
  }
  function itemFlowFindInventoryIndexById(owner, itemId) {
    return (owner.inventory || []).findIndex((item) => item && item.id === itemId);
  }

  // modules/domain/item-auto-equip.mjs
  function itemFlowTryAutoEquipEmptySlot(env, owner, item) {
    if (!item || !owner.settings || owner.settings.autoEquipEmptySlots === false) return null;
    return itemFlowEquipIntoFirstEmptySlot(env, owner, item);
  }
  function itemFlowEquipIntoFirstEmptySlot(env, owner, item) {
    let slot = itemFlowGetEquipCandidateSlots(env, owner, item).find((candidate) => candidate && Object.prototype.hasOwnProperty.call(owner.equipment, candidate) && !owner.equipment[candidate]);
    if (!slot || !env.deps.combatEquipmentStats.inspect(item, slot, owner).ok) return null;
    delete item.legacyRequirementGrace;
    owner.equipment[slot] = item;
    if (typeof env.deps.normalizeSupportLoadout === "function") env.deps.normalizeSupportLoadout(true);
    return slot;
  }
  function itemFlowEquipIntoEmptySlots(env, owner, items) {
    const rank = (item) => (Number(item.itemTier) || 0) * 10 + env.deps.JEWEL_RARITY_ORDER.indexOf(item.rarity);
    let equipped = 0;
    for (const item of [...items || []].filter(Boolean).sort((a, b) => rank(b) - rank(a))) {
      const index = owner.inventory.indexOf(item);
      if (index < 0 || !itemFlowEquipIntoFirstEmptySlot(env, owner, item)) continue;
      owner.inventory.splice(index, 1);
      equipped++;
    }
    return equipped;
  }
  function itemFlowCountFillableEmptySlots(env, owner) {
    const empty = Object.keys(owner.equipment).filter((slot) => !owner.equipment[slot]);
    if (!empty.length) return 0;
    return empty.filter((slot) => owner.inventory.some((item) => item && itemFlowGetEquipCandidateSlots(env, owner, item).includes(slot) && env.deps.combatEquipmentStats.inspect(item, slot, owner).ok)).length;
  }

  // modules/domain/item-equip-actions.mjs
  function* itemFlowEquipItem(env, owner, idx, preferredSlot) {
    let item = owner.inventory[idx];
    if (!item) return;
    const restriction = env.deps.getPassiveEquipmentRestriction(item, owner);
    if (restriction) return yield { kind: "itemLog", args: [restriction, "attack-monster", { toast: true }] };
    if (yield { kind: "itemEquipSpecial", args: [item, preferredSlot] }) return;
    const choice = equipmentChoice(env, owner, item, preferredSlot);
    if (choice) {
      yield { kind: choice, args: [item.id] };
      return;
    }
    let targetSlot = itemFlowPickEquipSlot(env, owner, item, preferredSlot);
    if (!targetSlot) return;
    const eligibility = env.deps.combatEquipmentStats.inspect(item, targetSlot, owner);
    if (!eligibility.ok) return yield { kind: "itemLog", args: ["장착 실패, " + eligibility.reason, "attack-monster", { toast: true }] };
    replaceEquipment(env, owner, item, idx, targetSlot);
    yield { kind: "itemHideTooltip", args: [] };
    env.deps.normalizeSupportLoadout(true);
    yield { kind: "itemRefresh", args: [] };
  }
  function equipmentChoice(env, owner, item, preferredSlot) {
    const warriorDualTrain = typeof env.deps.hasKeystone === "function" && env.deps.hasKeystone("w3", owner);
    if (needsWeaponChoice(owner, item, preferredSlot, warriorDualTrain)) return "itemWeaponChoice";
    if (preferredSlot) return null;
    if (!["반지", "장갑"].includes(item.slot)) return null;
    if (!itemFlowDualSlotBothOccupied(env, owner, item.slot)) return null;
    return item.slot === "반지" ? "itemRingChoice" : "itemGloveChoice";
  }
  function needsWeaponChoice(owner, item, preferredSlot, warriorDualTrain) {
    return item.slot === "무기" && warriorDualTrain && !preferredSlot && owner.equipment["무기"] && owner.equipment["방패"];
  }
  function replaceEquipment(env, owner, item, idx, targetSlot) {
    delete item.legacyRequirementGrace;
    let old = owner.equipment[targetSlot];
    if (old) delete old.legacyRequirementGrace;
    let movedId = item.id;
    owner.equipment[targetSlot] = item;
    if (old) owner.inventory[idx] = old;
    else owner.inventory.splice(idx, 1);
    if (!itemFlowIsCraftSelectionEquip(env) && itemFlowGetCraftSelectionRef(env) === movedId) {
      env.craftingSelectionState.ref = targetSlot;
      env.craftingSelectionState.isEquip = true;
    }
  }
  function* itemFlowEquipItemById(env, owner, itemId, preferredSlot) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    if (preferredSlot && !itemFlowGetEquipCandidateSlots(env, owner, owner.inventory[idx]).includes(preferredSlot)) return false;
    const targetItem = owner.inventory[idx];
    yield* itemFlowEquipItem(env, owner, idx, preferredSlot);
    return Object.values(owner.equipment).includes(targetItem) || !owner.inventory.includes(targetItem);
  }
  function* itemFlowEquipSelectedCraftInventoryItem(env, owner) {
    if (itemFlowIsCraftSelectionEquip(env)) return false;
    let itemId = itemFlowGetCraftSelectionRef(env);
    if (itemId === null) return false;
    return yield* itemFlowEquipItemById(env, owner, itemId);
  }
  function itemFlowFindUnequipPlacement(env, owner, item, column, row) {
    if (Number.isFinite(Number(column)) && Number.isFinite(Number(row))) return env.deps.equipmentInventoryGridRuntime.canAdd(item, column, row, owner);
    let result = env.deps.equipmentInventoryGridRuntime.findAddPlacement(item, owner);
    if (!result.ok && env.deps.equipmentInventoryGridRuntime.canStoreItems([item], owner)) return { ok: true, placement: null };
    return result;
  }
  function* itemFlowUnequipItemToGrid(env, owner, slot, column, row) {
    let item = owner.equipment[slot];
    if (!item) return false;
    let placementResult = itemFlowFindUnequipPlacement(env, owner, item, column, row);
    if (!placementResult.ok) {
      yield { kind: "itemLog", args: [placementResult.reason || "인벤토리 공간이 부족해 장착 해제할 수 없습니다.", "attack-monster"] };
      return false;
    }
    let itemKey = env.deps.equipmentLoadoutRuntime.ensureItemIdentity(item);
    delete item.legacyRequirementGrace;
    owner.inventory.push(item);
    owner.equipment[slot] = null;
    if (placementResult.placement) owner.equipmentInventoryPlacements = { ...owner.equipmentInventoryPlacements || {}, [itemKey]: placementResult.placement };
    if (itemFlowIsCraftSelectionEquip(env) && itemFlowGetCraftSelectionRef(env) === slot) {
      env.craftingSelectionState.ref = item.id;
      env.craftingSelectionState.isEquip = false;
    }
    env.deps.normalizeSupportLoadout(true);
    yield { kind: "itemRefresh", args: [] };
    return true;
  }
  function* itemFlowUnequipItem(env, owner, slot) {
    return yield* itemFlowUnequipItemToGrid(env, owner, slot);
  }
  function* itemFlowReleaseClosedThirdRing(env, owner, say) {
    const ring = owner.equipment && owner.equipment["반지3"];
    if (!ring || owner.isBackgroundCalculation || owner.woodsmanBuildLock || env.deps.getTranscendentVoidPassiveCount("thirdFinger", owner) > 0) return false;
    if (!itemFlowFindUnequipPlacement(env, owner, ring).ok || !(yield* itemFlowUnequipItemToGrid(env, owner, "반지3"))) return false;
    say(`세 번째 손가락이 사라져 [${ring.name}]${env.deps.pickParticle(ring.name, "을", "를")} 가방에 넣었습니다.`, "loot-normal");
    return true;
  }
  function* itemFlowSalvageItemById(owner, itemId) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    yield { kind: "itemSalvage", args: [idx] };
    return true;
  }
  function* itemFlowToggleItemLockById(env, owner, itemId) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    let item = owner.inventory[idx];
    if (!item) return false;
    if (item.hallReplica) {
      yield { kind: "itemLog", args: [env.deps._t("전당 소장품의 보호 잠금은 해제할 수 없습니다."), "attack-monster"] };
      return false;
    }
    item.locked = !item.locked;
    yield { kind: "itemLog", args: [`${item.locked ? env.deps._t("🔒 잠금") : env.deps._t("🔓 잠금 해제")}: [${item.name}]`, "loot-normal"] };
    yield { kind: "itemRefresh", args: [] };
    return true;
  }

  // modules/domain/item-run-admission.mjs
  function itemFlowHasActiveBeehiveRuntimeState(owner, b) {
    if (!b || !b.inRun) return false;
    return hasBeehiveProgress(b) || Array.isArray(b.pendingQueenRewards) && b.pendingQueenRewards.length > 0 || owner.currentZoneId === "beehive_run" && (owner.enemies || []).some((enemy) => enemy && enemy.hp > 0);
  }
  function hasBeehiveProgress(b) {
    let hasReturnZone = b.returnZoneId !== void 0 && b.returnZoneId !== null;
    let hasStartedRoute = Math.max(0, Math.floor(b.branchStep || 0)) > 0;
    return !!b.awaitingClear || !!b.pendingChoice && (hasReturnZone || hasStartedRoute) || !!b.queenActive || !!b.pendingWaveReward;
  }
  function itemFlowClearBeehiveRuntimeState(b) {
    if (!b) return;
    b.inRun = false;
    b.branchStep = 0;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = "";
    b.waveExtra = 0;
    b.pendingQueenRewards = [];
    b.queenActive = false;
  }
  function itemFlowReconcileBeehiveRunState(owner) {
    let b = owner && owner.beehive ? owner.beehive : null;
    if (!b || !b.inRun) return false;
    if (owner.currentZoneId === "beehive_run" && itemFlowHasActiveBeehiveRuntimeState(owner, b)) return true;
    let returnZoneId = b.returnZoneId ?? owner.maxZoneId;
    itemFlowClearBeehiveRuntimeState(b);
    b.returnZoneId = null;
    if (owner.currentZoneId === "beehive_run") owner.currentZoneId = returnZoneId ?? 0;
    owner.enemies = [];
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.runProgress = 0;
    owner.combatHalted = false;
    return false;
  }
  function itemFlowIsBeehiveRunLockedForMapTravel(owner) {
    let b = owner && owner.beehive ? owner.beehive : null;
    if (!b || !b.inRun) return false;
    return itemFlowReconcileBeehiveRunState(owner) && owner.currentZoneId === "beehive_run";
  }
  function* itemFlowWarnBeehiveMapTravelBlocked(env) {
    yield { kind: "itemOptionalLog", args: [env.BEEHIVE_TRAVEL_REFUSAL, "attack-monster"] };
    return true;
  }
  function itemFlowGetHeldRunBlockReason(env, owner) {
    if (itemFlowIsBeehiveRunLockedForMapTravel(owner)) return env.BEEHIVE_TRAVEL_REFUSAL;
    return env.deps.ensureBeyondBoundaryState(owner).activeRun ? "경계 너머 도전을 먼저 마치거나 포기하세요." : "";
  }
  function itemFlowGetContentStartBlockReason(env, owner) {
    if (owner.pendingLoopReady) return "⏸️ 루프 진행 대기 중에는 콘텐츠를 시작할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.";
    return itemFlowGetHeldRunBlockReason(env, owner) || (env.deps.atlas.inMap(owner) ? env.deps.atlas.runOpenReason(owner) : "");
  }

  // modules/domain/item-display-name.mjs
  function itemFlowGetItemDisplayName(env, item) {
    const name = String(item && item.name || "");
    const base = item && item.baseName;
    if (base && name === `마법의 ${base}`) return env.deps._t("마법의 {base}", { base: env.deps._t(base) });
    if (base && name === `희귀한 ${base}`) return env.deps._t("희귀한 {base}", { base: env.deps._t(base) });
    return env.deps._t(name);
  }

  // modules/domain/item-rift-altar.mjs
  function* itemFlowSetTimeRiftPressure(env, owner, delta) {
    let rift = env.deps.ensureTimeRiftState();
    let inRift = owner.currentZoneId === env.deps.TIME_RIFT_PAST_ZONE_ID || owner.currentZoneId === env.deps.TIME_RIFT_FUTURE_ZONE_ID;
    if (inRift || rift.altarOpen) return yield { kind: "itemLog", args: [env.deps._t("시간압은 과거에 진입하기 전에만 바꿀 수 있습니다. 제단 아이템을 회수하면 다시 선택할 수 있습니다."), "attack-monster"] };
    rift.pressure = Math.max(1, Math.min(env.deps.TIME_RIFT_MAX_PRESSURE, rift.pressure + Math.floor(delta || 0)));
    yield { kind: "itemRefresh", args: [] };
  }
  function itemFlowGetTimeRiftFutureEntryReason(env, owner, rift) {
    return itemFlowGetTimeRiftFusionMismatchReason(env, rift.altarUnique, rift.altarRare) || (rift.altarUnique && !env.deps.canStoreEquipmentItems([rift.altarUnique], owner) ? "⌛ 가방에 융합 결과가 들어갈 자리가 없습니다. 자리를 비우고 미래에 들어가세요." : null);
  }
  function itemFlowGetTimeRiftFusionMismatchReason(env, altarItem, candidate) {
    if (!altarItem || !candidate) return "제단에 고유 1개/희귀 1개가 필요합니다.";
    if (String(altarItem.slot || "") !== String(candidate.slot || "")) {
      return env.deps._t("부위 불일치 ({slot} / {slot2}), 같은 부위로 맞춰주세요.", { slot: altarItem.slot, slot2: candidate.slot });
    }
    return null;
  }
  function itemFlowGetTimeAltarItemIssue(env, owner, item, rift = env.deps.ensureTimeRiftState()) {
    if (owner.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.";
    if (!rift.altarOpen) return "먼저 과거를 클리어해 제단을 열어야 합니다.";
    if (!item) return "제단에 올릴 장비를 고르세요.";
    if (item.hallReplica) return "전당 소장품은 제단에 올릴 수 없습니다.";
    if (item.fusedRelic) return "이미 융합된 유물은 다시 시간을 건널 수 없습니다.";
    if (item.corrupted) return "타락한 장비는 제단에 올릴 수 없습니다.";
    if (item.loopSealed) return "봉인된 장비는 제단에 올릴 수 없습니다.";
    return itemFlowGetTimeAltarSlotIssue(env, item, rift);
  }
  function itemFlowGetTimeAltarSlotIssue(env, item, rift) {
    if (!["unique", "rare"].includes(item.rarity)) return "고유 또는 희귀 장비만 올릴 수 있습니다.";
    const unique = item.rarity === "unique";
    if (rift[unique ? "altarUnique" : "altarRare"]) return "해당 제단 자리가 차 있습니다. 회수 후 다시 올려주세요.";
    const other = unique ? rift.altarRare : rift.altarUnique;
    return other ? itemFlowGetTimeRiftFusionMismatchReason(env, other, item) : null;
  }
  function* itemFlowPlaceItemOnTimeAltar(env, owner) {
    let rift = env.deps.ensureTimeRiftState();
    let item = itemFlowGetSelectedCraftItem(env, owner);
    if (itemFlowIsCraftSelectionEquip(env)) return yield { kind: "itemLog", args: [env.deps._t("장착 중인 장비는 제단에 올릴 수 없습니다. 해제 후 올려주세요."), "attack-monster"] };
    const issue = itemFlowGetTimeAltarItemIssue(env, owner, item, rift);
    if (issue) return yield { kind: "itemLog", args: [issue, "attack-monster"] };
    let slotKey = item.rarity === "unique" ? "altarUnique" : "altarRare";
    owner.inventory = (owner.inventory || []).filter((row) => row && row.id !== item.id);
    rift[slotKey] = item;
    itemFlowClearCraftSelection(env);
    yield { kind: "itemLog", args: [env.deps._t("⏳ [{name}]{particle} 과거의 제단에 올렸습니다.{full}", { name: itemFlowGetItemDisplayName(env, item), particle: env.deps.pickParticle(item.name, "을", "를"), full: rift.altarUnique && rift.altarRare ? ` ${env.deps._t("두 자리가 모두 찼습니다. 미래로 건너가세요.")}` : "" }), "season-up"] };
    yield { kind: "itemRefresh", args: [] };
    yield { kind: "itemSave", args: [200] };
  }
  function* itemFlowRetrieveTimeAltarItems(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: "itemLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    let rift = env.deps.ensureTimeRiftState();
    if (!rift.altarUnique && !rift.altarRare) {
      if (!rift.altarOpen) return yield { kind: "itemLog", args: [env.deps._t("제단이 비어 있습니다."), "attack-monster"] };
      rift.altarOpen = false;
      rift.activePressure = null;
      yield { kind: "itemLog", args: [env.deps._t("⏳ 빈 제단을 닫았습니다. 시간압을 다시 선택할 수 있습니다."), "season-up"] };
      yield { kind: "itemRefresh", args: [] };
      yield { kind: "itemSave", args: [200] };
      return;
    }
    let altarItems = [rift.altarUnique, rift.altarRare].filter(Boolean);
    if (!env.deps.canStoreEquipmentItems(altarItems, owner)) return yield { kind: "itemLog", args: [env.deps._t("인벤토리 공간이 부족합니다."), "attack-monster"] };
    if (rift.altarUnique) {
      env.deps.addItemToInventory(rift.altarUnique, { guaranteedKeep: true, skipAutoEquip: true });
      rift.altarUnique = null;
    }
    if (rift.altarRare) {
      env.deps.addItemToInventory(rift.altarRare, { guaranteedKeep: true, skipAutoEquip: true });
      rift.altarRare = null;
    }
    rift.altarOpen = false;
    rift.activePressure = null;
    yield { kind: "itemLog", args: [env.deps._t("⏳ 제단의 아이템을 회수했습니다."), "season-up"] };
    yield { kind: "itemRefresh", args: [] };
    yield { kind: "itemSave", args: [200] };
  }

  // modules/domain/item-rift-fusion.mjs
  function itemFlowRollTimeRiftKeptOptions(env, stats, pressure) {
    const order = stats.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(env.deps.itemRandom() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const kept = /* @__PURE__ */ new Set();
    order.forEach((index) => {
      if (env.deps.itemRandom() < env.deps.getTimeRiftOptionKeepChance(pressure, kept.size)) kept.add(index);
    });
    return stats.filter((_, index) => kept.has(index));
  }
  function* itemFlowResolveTimeRiftFusion(env, owner) {
    let rift = env.deps.ensureTimeRiftState();
    const mismatch = itemFlowGetTimeRiftFusionMismatchReason(env, rift.altarUnique, rift.altarRare);
    if (mismatch) {
      yield { kind: "itemLog", args: [mismatch, "attack-monster"] };
      return null;
    }
    if (!env.deps.canStoreEquipmentItems([rift.altarUnique], owner)) {
      yield { kind: "itemLog", args: [env.deps._t("⌛ 융합이 보류되었습니다: 인벤토리 공간이 필요합니다. (제단은 유지됩니다. 공간 확보 후 미래를 다시 클리어하세요)"), "attack-monster"] };
      return null;
    }
    let fused = JSON.parse(JSON.stringify(rift.altarUnique));
    fused.id = env.deps.allocateItemId();
    let rareStats = (Array.isArray(rift.altarRare.stats) ? JSON.parse(JSON.stringify(rift.altarRare.stats)) : []).filter(Boolean);
    let kept = itemFlowRollTimeRiftKeptOptions(env, rareStats, rift.pressure);
    let lost = rareStats.length - kept.length;
    let grade = env.deps.getTimeRiftFusionGrade(lost, rareStats.length);
    rareStats = kept;
    fused.stats = Array.isArray(fused.stats) ? fused.stats : [];
    rareStats.forEach((stat) => {
      stat.fusedFromRare = true;
      fused.stats.push(stat);
    });
    fused.fusedRelic = true;
    fused.fusionGrade = grade;
    fused.fusionLost = lost;
    fused.fusedRareName = rift.altarRare.name || "";
    env.deps.equipmentSockets.returnJewels(rift.altarRare);
    rift.altarUnique = null;
    rift.altarRare = null;
    rift.altarOpen = false;
    rift.activePressure = null;
    env.deps.addItemToInventory(fused, { guaranteedKeep: true, skipAutoEquip: true });
    rift.lastFusion = {
      id: fused.id,
      instanceId: env.deps.ensureEquipmentLoadoutItemIdentity(fused),
      name: fused.name,
      pressure: rift.pressure,
      inherited: rareStats.length,
      lost,
      season: owner.season
    };
    return { fused, grade, lost, inherited: rareStats.length };
  }

  // modules/domain/item-zone-travel.mjs
  function itemFlowPrepareMeteorEncounterEntry(env, owner, returnZoneId = Number.isInteger(owner.currentZoneId) ? owner.currentZoneId : null) {
    let st = env.deps.ensureMeteorSiteState();
    st.kind = st.kind || env.deps.rollMeteorKind();
    st.activeMeteorTier = Math.max(8, env.deps.getSkyRiftGaugeEffectiveTier({ tier: st.skyRiftMinTier || 13 }, st));
    st.meteorReturnZoneId = returnZoneId !== void 0 && returnZoneId !== null ? returnZoneId : null;
    st.skyRiftReady = false;
    st.skyRiftGauge = Math.max(0, Math.floor(st.skyRiftCarryGauge || 0));
    st.skyRiftCarryGauge = 0;
    st.skyRiftMinTier = null;
  }
  function itemFlowGetZoneTravelBlockReason(env, owner, id) {
    const atlasReason = env.deps.atlas.travelReason(owner, id);
    if (atlasReason) return atlasReason;
    if (env.deps.getZone(id)?.type === "trial" && !env.deps.contentProgression.isUnlocked("battleTrials")) {
      return "루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.";
    }
    if (owner.pendingLoopReady) {
      return "⏸️ 루프 진행 대기 중에는 사냥터로 이동할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.";
    }
    if (id === env.deps.LABYRINTH_ZONE_ID) {
      if (owner.season < 3) return "고대 미궁은 루프3부터 개방됩니다.";
      if (owner.maxZoneId < 5) return "액트 5를 먼저 클리어해야 미궁에 입장할 수 있습니다.";
    }
    return null;
  }
  function* itemFlowChangeZone(env, owner, id) {
    const blockReason = itemFlowGetZoneTravelBlockReason(env, owner, id);
    if (blockReason) return yield { kind: "itemLog", args: [blockReason, "attack-monster"] };
    const held = heldTravelReason(env, owner, id);
    if (held) return yield { kind: "itemLog", args: [held, "attack-monster"] };
    owner.inTicketBossFight = false;
    if (typeof id === "number" && id > owner.maxZoneId) return;
    const meteorReason = prepareMeteorTravel(env, owner, id);
    if (meteorReason) return yield { kind: "itemLog", args: [meteorReason, "attack-monster"] };
    let zone = env.deps.getZone(id);
    if (!zone) return yield { kind: "itemLog", args: [env.deps._t("이동할 수 없는 지역입니다."), "attack-monster"] };
    const entryReason = prepareContentTravel(env, owner, id, zone);
    if (entryReason) return yield { kind: "itemLog", args: [entryReason, "attack-monster"] };
    prepareAbyssTravel(env, owner, id);
    env.deps.atlasRun.travel(zone);
    owner.killsInZone = 0;
    yield { kind: "itemLog", args: [env.deps._t("🗺️ {name} 이동", { name: env.deps._t(zone.name) }), "season-up"] };
    yield { kind: "itemStartMoving", args: [false] };
    yield { kind: "itemRefresh", args: [] };
  }
  function heldTravelReason(env, owner, id) {
    const boundary = env.deps.ensureBeyondBoundaryState(owner);
    const held = id === env.deps.BEYOND_BOUNDARY_ZONE_ID && boundary.activeRun ? "" : itemFlowGetHeldRunBlockReason(env, owner);
    if (held) return held;
    if (id === env.deps.BEYOND_BOUNDARY_ZONE_ID && !boundary.activeRun)
      return env.deps._t("경계 너머 화면에서 단계와 성장시킬 인장을 선택해 도전을 시작하세요.");
    return null;
  }
  function prepareMeteorTravel(env, owner, id) {
    if (id !== env.deps.METEOR_FALL_ZONE_ID) return null;
    const st = env.deps.ensureMeteorSiteState();
    if (!st.unlocked) return env.deps._t("운석 낙하 지점은 아직 잠겨 있습니다.");
    if (!st.skyRiftReady) return env.deps._t("하늘의 균열 게이지가 100%가 되어야 입장 가능합니다.");
    itemFlowPrepareMeteorEncounterEntry(env, owner);
    return null;
  }
  function prepareContentTravel(env, owner, id, zone) {
    if (zone.type === "seasonBoss") {
      const reason = prepareSeasonBossTravel(env, owner, zone);
      if (reason) return reason;
    }
    if (zone.type === "timeRift") {
      const reason = prepareRiftTravel(env, owner, zone);
      if (reason) return reason;
    }
    return id === env.deps.CHAOS_REALM_ZONE_ID ? prepareChaosTravel(env) : null;
  }
  function prepareSeasonBossTravel(env, owner, zone) {
    if ((owner.season || 1) < (zone.reqSeason || 2)) {
      return zone.rivalBlade ? "버려진 날붙이들은 루프 31부터 당신을 찾아옵니다." : zone.milestonePinnacle ? "아틀라스 최종 관문은 루프 31부터 모습을 드러냅니다." : "아직 뿌리 보스가 잠겨 있습니다.";
    }
    const gate = env.deps.getSeasonBossProgressGate(zone, owner);
    if (!gate.met) return env.deps._t("🔒 {label} 조건을 먼저 달성해야 합니다.", { label: env.deps._t(gate.label) });
    if (!zone.milestonePinnacle) {
      if ((owner.currencies[zone.key] || 0) <= 0) return env.deps._t("입장 열쇠({name})가 필요합니다.", { name: env.deps._t(env.deps.ORB_DB[zone.key].name) });
      owner.currencies[zone.key]--;
    }
    owner.inTicketBossFight = true;
    return null;
  }
  function prepareRiftTravel(env, owner, zone) {
    const rift = env.deps.ensureTimeRiftState();
    if ((owner.season || 1) < env.deps.TIME_RIFT_UNLOCK_LOOP) return env.deps._t("시간의 균열은 루프 {TIME_RIFT_UNLOCK_LOOP}부터 열립니다.", { TIME_RIFT_UNLOCK_LOOP: env.deps.TIME_RIFT_UNLOCK_LOOP });
    const mismatch = zone.riftPhase === "future" ? itemFlowGetTimeRiftFutureEntryReason(env, owner, rift) : null;
    if (mismatch) return mismatch;
    rift.activePressure = rift.pressure;
    return null;
  }
  function prepareChaosTravel(env) {
    const realm = env.deps.ensureChaosRealmState();
    if (!realm.unlocked) return env.deps._t("혼돈계는 나무꾼에게 10% 이상 피해를 준 전투 종료 시 해금됩니다.");
    if (!env.deps.canEnterChaosRealm()) return env.deps._t("혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.");
    const maxFloor = Math.max(1, Math.floor(realm.highestFloor || 1));
    realm.currentFloor = Math.max(1, Math.min(maxFloor, Math.floor(realm.currentFloor || 1)));
    return null;
  }
  function prepareAbyssTravel(env, owner, id) {
    if (typeof id === "number" && id >= env.deps.ABYSS_START_ZONE_ID) {
      let depth = Math.max(1, Math.floor(env.deps.getAbyssDepthFromZoneId(id) || 1));
      owner.abyssEndlessDepth = depth;
      owner.abyssUnlockedDepths = Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths : [20];
      if (depth >= 20 && !owner.abyssUnlockedDepths.includes(depth)) owner.abyssUnlockedDepths.push(depth);
    }
  }

  // modules/domain/item-base-candidates.mjs
  function itemFlowGetBaseDefenseProfile(base) {
    let ids = new Set((base.baseStats || []).map((stat) => stat.id));
    return ["armor", "evasion", "energyShield"].filter((id) => ids.has(id)).join("+");
  }
  function itemFlowGetBaseSecondaryStatSignature(base, slot) {
    let coreStatsBySlot = {
      무기: /* @__PURE__ */ new Set(["flatDmg"]),
      투구: /* @__PURE__ */ new Set(["flatHp", "armor", "evasion", "energyShield"]),
      갑옷: /* @__PURE__ */ new Set(["flatHp", "armor", "evasion", "energyShield"]),
      장갑: /* @__PURE__ */ new Set(["flatHp", "armor", "evasion", "energyShield", "aspd"]),
      신발: /* @__PURE__ */ new Set(["flatHp", "armor", "evasion", "energyShield", "move"]),
      목걸이: /* @__PURE__ */ new Set([]),
      반지: /* @__PURE__ */ new Set([]),
      허리띠: /* @__PURE__ */ new Set(["flatHp"]),
      방패: /* @__PURE__ */ new Set(["armor", "evasion", "energyShield", "baseBlockChance"])
    };
    let coreSet = coreStatsBySlot[slot] || /* @__PURE__ */ new Set();
    return (base.baseStats || []).map((stat) => stat.id).filter((statId) => !coreSet.has(statId)).sort();
  }
  function itemFlowGetWeaponBaseArchetype(base) {
    let ids = (base.baseStats || []).map((stat) => stat.id);
    if (ids.some((id) => id.startsWith("summon"))) return "summon";
    if (ids.some((id) => id.startsWith("projectile"))) return "projectile";
    if (ids.some((id) => id.startsWith("spell"))) return "spell";
    return "melee";
  }
  function itemFlowGetBaseBuildArchetype(base) {
    if (!base) return "generic";
    if (base.slot === "무기") return itemFlowGetWeaponBaseArchetype(base);
    if (base.slot === "방패") return `shield:${base.shieldStyle || "fortress"}`;
    let ids = (base.baseStats || []).map((stat) => stat.id);
    if (ids.some((id) => id.startsWith("summon"))) return "summon";
    return "generic";
  }
  function itemFlowGetBaseFamilyUpgradeCandidates(env, currentBase) {
    return env.deps.BASE_ITEM_DB.filter((base) => base.slot === currentBase.slot && base.family === currentBase.family && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase).sort((a, b) => a.reqTier - b.reqTier);
  }
  function itemFlowGetBaseUpgradeCandidates(env, currentBase) {
    if (currentBase.family) return itemFlowGetBaseFamilyUpgradeCandidates(env, currentBase);
    let currentProfile = itemFlowGetBaseDefenseProfile(currentBase);
    let currentSecondarySignature = itemFlowGetBaseSecondaryStatSignature(currentBase, currentBase.slot);
    let currentArchetype = itemFlowGetBaseBuildArchetype(currentBase);
    let currentCategory = env.deps.getWeaponCategoryOfBase(currentBase.id);
    let isArmorSlot = ["투구", "갑옷", "장갑", "신발", "방패"].includes(currentBase.slot);
    let candidates = env.deps.BASE_ITEM_DB.filter((base) => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase && !base.family).filter((base) => isArmorSlot ? itemFlowGetBaseDefenseProfile(base) === currentProfile : true).filter((base) => itemFlowGetBaseBuildArchetype(base) === currentArchetype).filter((base) => env.deps.getWeaponCategoryOfBase(base.id) === currentCategory).sort((a, b) => a.reqTier - b.reqTier);
    if (isArmorSlot) return candidates;
    if (currentSecondarySignature.length > 0) {
      let preserving = candidates.filter((base) => {
        let signature = new Set(itemFlowGetBaseSecondaryStatSignature(base, base.slot));
        return currentSecondarySignature.every((id) => signature.has(id));
      });
      if (preserving.length > 0) return preserving;
      return candidates.filter((base) => {
        let signature = new Set(itemFlowGetBaseSecondaryStatSignature(base, base.slot));
        return currentSecondarySignature.some((id) => signature.has(id));
      });
    }
    return candidates;
  }

  // modules/domain/item-base-chain.mjs
  function itemFlowBuildBaseChainInfoCache(env) {
    env._baseChainInfoCache = {};
    let pool = env.deps.BASE_ITEM_DB.filter((b) => b && b.id && !b.dropOnly && !b.realmBase);
    let succ = {};
    let preds = {};
    pool.forEach((b) => {
      preds[b.id] = [];
    });
    pool.forEach((b) => {
      let cands = itemFlowGetBaseUpgradeCandidates(env, b);
      let next = cands && cands.length > 0 ? cands[0] : null;
      succ[b.id] = next ? next.id : null;
      if (next && preds[next.id]) preds[next.id].push(b.id);
    });
    let upMemo = {};
    function up(id) {
      if (upMemo[id] != null) return upMemo[id];
      upMemo[id] = 1;
      let s = succ[id];
      return upMemo[id] = s ? 1 + up(s) : 1;
    }
    let downMemo = {};
    function down(id) {
      if (downMemo[id] != null) return downMemo[id];
      downMemo[id] = 1;
      let best = 0;
      (preds[id] || []).forEach((p) => {
        best = Math.max(best, down(p));
      });
      return downMemo[id] = best + 1;
    }
    pool.forEach((b) => {
      let d = down(b.id);
      let u = up(b.id);
      env._baseChainInfoCache[b.id] = { step: d, total: d + u - 1 };
    });
  }
  function itemFlowGetBaseChainInfo(env, base) {
    if (!base || !base.id) return null;
    if (!env._baseChainInfoCache) itemFlowBuildBaseChainInfoCache(env);
    return env._baseChainInfoCache[base.id] || null;
  }
  function itemFlowGetBaseChainRank(info) {
    return info ? info.step - Math.max(0, info.total - 6) : 0;
  }
  function itemFlowGetItemBaseChainInfo(env, item) {
    if (!item) return null;
    let base = env.deps.BASE_ITEM_DB.find((b) => b && item.baseId && b.id === item.baseId) || env.deps.BASE_ITEM_DB.find((b) => b && b.name === item.baseName && b.slot === item.slot);
    if (!base) return null;
    return itemFlowGetBaseChainInfo(env, base);
  }
  function itemFlowGetBaseUpgradeCost(env, nextBase) {
    if (!nextBase) throw new Error("베이스 업그레이드 비용을 계산할 다음 베이스가 없습니다.");
    let exchange = env.deps.MARKET_EXCHANGES.find((row) => row && row.from === "formlessDew" && row.to === "goldenRule" && Number(row.need) > 0 && Number(row.gain) > 0);
    if (!exchange) throw new Error("형체 없는 이슬과 황금률의 기준 교환 비율을 찾을 수 없습니다.");
    let dewPerGoldenRule = Number(exchange.need) / Number(exchange.gain);
    if (!Number.isInteger(dewPerGoldenRule)) throw new Error("베이스 업그레이드 교환 비율은 정수여야 합니다.");
    let targetTier = Math.max(1, Math.floor(Number(nextBase.reqTier) || 1));
    let totalDewValue = Math.max(
      10,
      Math.ceil((5 + targetTier + targetTier * targetTier * 0.5) / 5) * 5
    );
    let chainRank = itemFlowGetBaseChainRank(itemFlowGetBaseChainInfo(env, nextBase));
    if (chainRank >= 6 || nextBase.slot === "무기" && targetTier >= 20) totalDewValue = Math.max(totalDewValue, 625);
    else if (chainRank === 5) totalDewValue = Math.max(totalDewValue, 225);
    let goldenRule = Math.floor(totalDewValue / dewPerGoldenRule);
    return {
      formlessDew: totalDewValue - goldenRule * dewPerGoldenRule,
      goldenRule,
      totalDewValue,
      dewPerGoldenRule
    };
  }

  // modules/domain/item-base-rolls.mjs
  function itemFlowRollUpgradedBaseStats(env, item, nextBase) {
    let previousStats = item.baseStats || [];
    item.baseStats = env.deps.rollBaseStats(nextBase, nextBase.reqTier || 1);
    itemFlowCarryUpgradedBaseMarks(env, item, previousStats);
    if (nextBase.slot !== "방패") return;
    preserveBlockRoll(previousStats, item.baseStats);
  }
  function preserveBlockRoll(previousStats, nextStats) {
    let previous = previousStats.find((stat) => stat && stat.id === "baseBlockChance");
    let next = nextStats.find((stat) => stat && stat.id === "baseBlockChance");
    let floor = Math.max(0, Number(previous && previous.val) || 0);
    if (!next || floor <= 0 || Number(next.val || 0) >= floor) return;
    next.val = floor;
    for (const key of ["valMin", "valMax", "baseRollMin", "baseRollMax"]) next[key] = Math.max(Number(next[key] || 0), floor);
  }
  function itemFlowCarryUpgradedBaseMarks(env, item, previousStats) {
    const exceptionalIds = new Set(previousStats.filter((stat) => stat && stat.exceptional && !stat.altar).map((stat) => stat.id));
    previousStats.filter((stat) => stat && stat.altar).forEach((line) => itemFlowCarryAltarLineToUpgradedBase(env, item.baseStats, line, exceptionalIds));
    env.EXCEPTIONAL_BASE_ITEM_FIELDS.forEach((key) => delete item[key]);
    item.baseStats.forEach((stat) => {
      if (stat && !stat.altar && exceptionalIds.has(stat.id)) env.deps.boostExceptionalBaseLine(item, stat);
    });
  }
  function itemFlowCarryAltarLineToUpgradedBase(env, stats, line, exceptionalIds) {
    const open = (stat) => !!stat && !stat.altar && !exceptionalIds.has(stat.id) && !env.UPGRADE_ALTAR_KEPT_LINE_IDS.includes(stat.id);
    const replacedId = line.replaced ? line.replaced.id : null;
    let index = stats.findIndex((stat) => open(stat) && stat.id === line.id);
    if (index < 0) index = stats.findIndex((stat) => open(stat) && stat.id === replacedId);
    if (index < 0) index = stats.map(open).lastIndexOf(true);
    const carried = Object.assign({}, line);
    delete carried.replaced;
    if (index < 0) stats.push(carried);
    else stats[index] = Object.assign(carried, { replaced: { id: stats[index].id, statName: stats[index].statName || env.deps.getStatName(stats[index].id) } });
  }

  // modules/domain/item-base-upgrade.mjs
  function itemFlowBuildGoldenRuleSpendPrompt(owner, message) {
    let owned = Math.max(0, Math.floor(owner.currencies && owner.currencies.goldenRule || 0));
    return `${message}

현재 보유: 황금률 ${owned}개`;
  }
  function* itemFlowUpgradeSelectedItemBase(env, owner) {
    let item = itemFlowGetSelectedCraftItem(env, owner);
    if (!item) return yield { kind: "itemLog", args: [env.deps._t("먼저 제작 대상 장비를 선택하세요."), "attack-monster"] };
    let currentBase = env.deps.BASE_ITEM_DB.find((base) => base && base.id === item.baseId) || env.deps.BASE_ITEM_DB.find((base) => base && base.name === item.baseName && base.slot === item.slot);
    if (!currentBase) return yield { kind: "itemLog", args: [env.deps._t("현재 베이스 정보를 찾을 수 없습니다."), "attack-monster"] };
    const refusal = itemFlowGetBaseUpgradeRefusal(item, currentBase);
    if (refusal) return yield { kind: "itemLog", args: [env.deps._t(refusal), "attack-monster"] };
    let candidates = itemFlowGetBaseUpgradeCandidates(env, currentBase);
    let nextBase = candidates[0];
    if (!nextBase) return yield { kind: "itemLog", args: [env.deps._t("해당 계열의 다음 베이스가 없습니다."), "attack-monster"] };
    let cost = itemFlowGetBaseUpgradeCost(env, nextBase);
    owner.pendingBaseUpgrade = { itemId: item.id, nextBaseId: nextBase.id };
    yield { kind: "itemShowBaseUpgrade", args: [currentBase, nextBase, cost] };
  }
  function* itemFlowCloseBaseUpgradeOverlay(owner) {
    owner.pendingBaseUpgrade = null;
    yield { kind: "itemCloseBaseUpgrade", args: [] };
  }
  function itemFlowGetBaseUpgradeRefusal(item, currentBase = null) {
    if (currentBase && currentBase.realmBase) return "계 전용 베이스 장비는 베이스 업그레이드로 변경할 수 없습니다.";
    if (item.hallReplica) return "전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.";
    return item.corrupted ? "타락한 아이템은 더 이상 제작할 수 없습니다." : "";
  }
  function itemFlowGetBaseUpgradeShortfall(env, owner, cost) {
    if ((owner.currencies.formlessDew || 0) < cost.formlessDew) return env.deps._t("형체 없는 이슬이 부족합니다. (필요: {formlessDew})", { formlessDew: cost.formlessDew });
    return (owner.currencies.goldenRule || 0) < cost.goldenRule ? env.deps._t("황금률이 부족합니다. (필요: {goldenRule})", { goldenRule: cost.goldenRule }) : "";
  }
  function* itemFlowConfirmSelectedItemBaseUpgrade(env, owner) {
    let pending = owner.pendingBaseUpgrade;
    if (!pending) return;
    if (owner.woodsmanBuildLock) return yield { kind: "itemLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다."), "attack-monster"] };
    const item = findPendingUpgradeItem(owner, pending.itemId);
    if (!item) {
      yield* itemFlowCloseBaseUpgradeOverlay(owner);
      return yield { kind: "itemLog", args: [env.deps._t("대상 장비를 찾을 수 없습니다."), "attack-monster"] };
    }
    const refusal = itemFlowGetBaseUpgradeRefusal(item);
    if (refusal) {
      yield* itemFlowCloseBaseUpgradeOverlay(owner);
      return yield { kind: "itemLog", args: [env.deps._t(refusal), "attack-monster"] };
    }
    let currentBase = env.deps.BASE_ITEM_DB.find((base) => base && base.id === item.baseId) || null;
    let nextBase = env.deps.BASE_ITEM_DB.find((base) => base && base.id === pending.nextBaseId);
    if (!nextBase) return yield* itemFlowCloseBaseUpgradeOverlay(owner);
    let cost = itemFlowGetBaseUpgradeCost(env, nextBase);
    const shortfall = itemFlowGetBaseUpgradeShortfall(env, owner, cost);
    if (shortfall) return yield { kind: "itemLog", args: [shortfall, "attack-monster"] };
    applyBaseUpgrade(env, owner, item, nextBase, cost);
    yield { kind: "itemLog", args: [baseUpgradeLog(env, currentBase, nextBase, cost), "loot-magic"] };
    yield* itemFlowCloseBaseUpgradeOverlay(owner);
    yield { kind: "itemRefresh", args: [] };
  }
  function applyBaseUpgrade(env, owner, item, nextBase, cost) {
    owner.currencies.formlessDew -= cost.formlessDew;
    owner.currencies.goldenRule = Math.max(0, (owner.currencies.goldenRule || 0) - cost.goldenRule);
    item.baseId = nextBase.id;
    item.baseName = nextBase.name;
    env.deps.updateItemName(item);
    item.itemTier = Math.max(item.itemTier || 1, nextBase.reqTier || 1);
    itemFlowRollUpgradedBaseStats(env, item, nextBase);
  }
  function findPendingUpgradeItem(owner, itemId) {
    const item = (owner.inventory || []).find((v) => v && v.id === itemId);
    if (item) return item;
    const equipped = Object.entries(owner.equipment || {}).find(([, value]) => value && value.id === itemId);
    return equipped ? equipped[1] : void 0;
  }
  function baseUpgradeLog(env, currentBase, nextBase, cost) {
    return env.deps._t("🛠️ 베이스 업그레이드: {from} → {to} (형체 없는 이슬 {dew}{rule})", {
      from: env.deps._t(currentBase && currentBase.name || "기존"),
      to: env.deps._t(nextBase.name),
      dew: cost.formlessDew,
      rule: cost.goldenRule ? ` + ${env.deps._t("황금률")} ${cost.goldenRule}` : ""
    });
  }

  // modules/domain/items.mjs
  function createItemRules(deps) {
    const env = { deps };
    env.craftingSelectionState = { ref: null, isEquip: false };
    env.BEEHIVE_TRAVEL_REFUSAL = "벌집 원정 중에는 [원정 포기] 전까지 다른 지역으로 이동할 수 없습니다.";
    env.UPGRADE_ALTAR_KEPT_LINE_IDS = Object.freeze(["armor", "evasion", "energyShield"]);
    env.EXCEPTIONAL_BASE_ITEM_FIELDS = Object.freeze(["exceptionalBase", "exceptionalStatNames", "exceptionalStatName", "exceptionalAllLines"]);
    env._baseChainInfoCache = null;
    return bindItemRules(env);
  }
  function bindItemRules(env) {
    return Object.freeze({
      getCodexSlotOrder: itemFlowGetCodexSlotOrder,
      getEquipmentInventoryFootprint: (...args) => itemFlowGetEquipmentInventoryFootprint(env, ...args),
      getWeaponInventoryFootprint: (...args) => itemFlowGetWeaponInventoryFootprint(env, ...args),
      getAverageExplicitAffixTier: itemFlowGetAverageExplicitAffixTier,
      getCraftSelectionRef: (...args) => itemFlowGetCraftSelectionRef(env, ...args),
      isCraftSelectionEquip: (...args) => itemFlowIsCraftSelectionEquip(env, ...args),
      clearCraftSelection: (...args) => itemFlowClearCraftSelection(env, ...args),
      getSelectedCraftItem: (...args) => itemFlowGetSelectedCraftItem(env, ...args),
      ensureCraftSelectionValid: (...args) => itemFlowEnsureCraftSelectionValid(env, ...args),
      selectForCrafting: (...args) => itemFlowSelectForCrafting(env, ...args),
      copyCraftResultStat: itemFlowCopyCraftResultStat,
      snapshotCraftResultItem: (...args) => itemFlowSnapshotCraftResultItem(env, ...args),
      getEquipCandidateSlots: (...args) => itemFlowGetEquipCandidateSlots(env, ...args),
      canEquipItemToSlot: (...args) => itemFlowCanEquipItemToSlot(env, ...args),
      tryAutoEquipEmptySlot: (...args) => itemFlowTryAutoEquipEmptySlot(env, ...args),
      equipIntoFirstEmptySlot: (...args) => itemFlowEquipIntoFirstEmptySlot(env, ...args),
      equipIntoEmptySlots: (...args) => itemFlowEquipIntoEmptySlots(env, ...args),
      countFillableEmptySlots: (...args) => itemFlowCountFillableEmptySlots(env, ...args),
      isDualSlotItem: (...args) => itemFlowIsDualSlotItem(env, ...args),
      equipItem: (...args) => itemFlowEquipItem(env, ...args),
      equipItemById: (...args) => itemFlowEquipItemById(env, ...args),
      equipSelectedCraftInventoryItem: (...args) => itemFlowEquipSelectedCraftInventoryItem(env, ...args),
      unequipItemToGrid: (...args) => itemFlowUnequipItemToGrid(env, ...args),
      unequipItem: (...args) => itemFlowUnequipItem(env, ...args),
      releaseClosedThirdRing: (...args) => itemFlowReleaseClosedThirdRing(env, ...args),
      salvageItemById: itemFlowSalvageItemById,
      toggleItemLockById: (...args) => itemFlowToggleItemLockById(env, ...args),
      hasActiveBeehiveRuntimeState: itemFlowHasActiveBeehiveRuntimeState,
      clearBeehiveRuntimeState: itemFlowClearBeehiveRuntimeState,
      reconcileBeehiveRunState: itemFlowReconcileBeehiveRunState,
      isBeehiveRunLockedForMapTravel: itemFlowIsBeehiveRunLockedForMapTravel,
      warnBeehiveMapTravelBlocked: (...args) => itemFlowWarnBeehiveMapTravelBlocked(env, ...args),
      getHeldRunBlockReason: (...args) => itemFlowGetHeldRunBlockReason(env, ...args),
      getContentStartBlockReason: (...args) => itemFlowGetContentStartBlockReason(env, ...args),
      setTimeRiftPressure: (...args) => itemFlowSetTimeRiftPressure(env, ...args),
      getTimeRiftFutureEntryReason: (...args) => itemFlowGetTimeRiftFutureEntryReason(env, ...args),
      getTimeRiftFusionMismatchReason: (...args) => itemFlowGetTimeRiftFusionMismatchReason(env, ...args),
      getTimeAltarItemIssue: (...args) => itemFlowGetTimeAltarItemIssue(env, ...args),
      placeItemOnTimeAltar: (...args) => itemFlowPlaceItemOnTimeAltar(env, ...args),
      retrieveTimeAltarItems: (...args) => itemFlowRetrieveTimeAltarItems(env, ...args),
      resolveTimeRiftFusion: (...args) => itemFlowResolveTimeRiftFusion(env, ...args),
      prepareMeteorEncounterEntry: (...args) => itemFlowPrepareMeteorEncounterEntry(env, ...args),
      getZoneTravelBlockReason: (...args) => itemFlowGetZoneTravelBlockReason(env, ...args),
      changeZone: (...args) => itemFlowChangeZone(env, ...args),
      buildGoldenRuleSpendPrompt: itemFlowBuildGoldenRuleSpendPrompt,
      getBaseUpgradeCandidates: (...args) => itemFlowGetBaseUpgradeCandidates(env, ...args),
      getBaseChainInfo: (...args) => itemFlowGetBaseChainInfo(env, ...args),
      getBaseChainRank: itemFlowGetBaseChainRank,
      getItemBaseChainInfo: (...args) => itemFlowGetItemBaseChainInfo(env, ...args),
      upgradeSelectedItemBase: (...args) => itemFlowUpgradeSelectedItemBase(env, ...args),
      closeBaseUpgradeOverlay: itemFlowCloseBaseUpgradeOverlay,
      getBaseUpgradeRefusal: itemFlowGetBaseUpgradeRefusal,
      confirmSelectedItemBaseUpgrade: (...args) => itemFlowConfirmSelectedItemBaseUpgrade(env, ...args),
      getItemDisplayName: (...args) => itemFlowGetItemDisplayName(env, ...args)
    });
  }

  // modules/ui/item-visuals.mjs
  function itemVisualAsset(deps, item, kind) {
    return itemVisualPickAsset(deps, item, kind);
  }
  function itemVisualPickAsset(deps, item, kind) {
    let visuals2 = typeof deps.ITEM_VISUAL_ASSET_DB !== "undefined" ? deps.ITEM_VISUAL_ASSET_DB : null;
    if (!visuals2) return "";
    if (kind === "jewel") return deps.bagItems.jewelArt(item);
    if (kind === "talisman") return item && item.family === "talisman" ? deps.stumpBox.iconPath(item) : visuals2.talisman;
    if (kind === "core") return deps.coreItems.icon(item);
    return itemVisualEquipmentAsset(deps, item);
  }
  function itemVisualMarkup(deps, item, kind, className) {
    let asset = itemVisualAsset(deps, item, kind);
    if (!asset) return "";
    let label = item && (item.name || item.baseName) || "아이템";
    return `<img class="${className || "inventory-item-visual"}" src="${asset}" alt="" aria-hidden="true" data-item-visual-label="${typeof deps.escapeHTML === "function" ? deps.escapeHTML(label) : label}">`;
  }
  function itemVisualEquipmentAsset(deps, item) {
    return deps.bagItems.artOf(item) || itemVisualPickEquipmentAsset(deps, item);
  }
  function itemVisualPickEquipmentAsset(deps, item) {
    const visuals2 = deps.ITEM_VISUAL_ASSET_DB;
    if (!item) return visuals2.equipment.default;
    const grid = visuals2.equipmentGrid;
    if ((item.rarity || item.type) === "unique" && Object.hasOwn(grid.uniqueAssets, item.name)) return grid.uniqueAssets[item.name];
    const exact = grid.baseAssets[item.baseId];
    if (exact) return exact;
    const slot = String(item.slot || "").replace(/[123]$/, "");
    if (slot === "무기") {
      const label = [item.baseId, item.baseName, item.name].filter(Boolean).join(" ").toLowerCase();
      const match = visuals2.weaponKeywords.find((row) => row.terms.some((term) => label.includes(term)));
      if (match) return match.asset;
    }
    return visuals2.equipment[slot] || visuals2.equipment.default;
  }
  function itemVisualUniqueAsset(deps, entry) {
    const rule = deps.UNIQUE_EQUIPMENT_RULES[entry.name];
    return itemVisualEquipmentAsset(deps, { rarity: "unique", name: entry.name, slot: entry.slots[0], baseId: rule ? rule.baseId : "" });
  }
  function itemVisualDualSlotLabel(targetSlot) {
    if (targetSlot === "반지1") return "왼쪽 반지";
    if (targetSlot === "반지2") return "오른쪽 반지";
    if (targetSlot === "장갑1") return "왼쪽 장갑";
    if (targetSlot === "장갑2") return "오른쪽 장갑";
    if (targetSlot === "무기") return "주 무기";
    if (targetSlot === "방패") return "완갑";
    return targetSlot;
  }
  function itemVisualBaseStepClass(info) {
    if (!info || !(info.total > 1)) return "base-step-low";
    if (info.step >= info.total) return "base-step-top";
    const ratio = (info.step - 1) / (info.total - 1);
    return ratio >= 2 / 3 ? "base-step-high" : ratio >= 1 / 3 ? "base-step-mid" : "base-step-low";
  }
  function itemVisualShowBaseUpgrade(deps, currentBase, nextBase, cost) {
    let titleEl = deps.document.getElementById("base-upgrade-title");
    let bodyEl = deps.document.getElementById("base-upgrade-body");
    if (titleEl) titleEl.innerText = `${deps._t(currentBase.name)} → ${deps._t(nextBase.name)}`;
    if (bodyEl) {
      let curStats = (currentBase.baseStats || []).map((stat) => `${deps.getStatName(stat.id)} ${deps.formatSignedValue(stat.id, stat.baseMin || stat.base)}~${deps.formatValue(stat.id, stat.baseMax || stat.base)}`).join(" / ");
      let nextStats = (nextBase.baseStats || []).map((stat) => `${deps.getStatName(stat.id)} ${deps.formatSignedValue(stat.id, stat.baseMin || stat.base)}~${deps.formatValue(stat.id, stat.baseMax || stat.base)}`).join(" / ");
      bodyEl.innerHTML = `${deps._t("현재 베이스:")} <strong>${deps._t(currentBase.name)}</strong><br><span style="color:var(--copy-muted);">${curStats || deps._t("없음")}</span><br><br>${deps._t("업그레이드 베이스:")} <strong>${deps._t(nextBase.name)}</strong><br><span style="color:#ffd08a;">${nextStats || deps._t("없음")}</span><br><br>${deps._t("비용: 형체 없는 이슬 {formlessDew}", { formlessDew: cost.formlessDew })}${cost.goldenRule > 0 ? deps._t(" + 황금률 {goldenRule}", { goldenRule: cost.goldenRule }) : ""}<br><span style="color:var(--copy-muted);">${deps._t("총 이슬 가치 {totalDewValue}", { totalDewValue: cost.totalDewValue })}</span>`;
    }
    let overlay = deps.document.getElementById("base-upgrade-overlay");
    if (overlay) overlay.showModal();
  }
  function itemVisualCloseBaseUpgrade(deps) {
    const overlay = deps.document.getElementById("base-upgrade-overlay");
    if (overlay) overlay.close();
  }
  function createItemVisuals(deps) {
    return Object.freeze({
      getInventoryItemVisualAsset: (...args) => itemVisualAsset(deps, ...args),
      renderInventoryItemVisual: (...args) => itemVisualMarkup(deps, ...args),
      getEquipmentGridVisualAsset: (...args) => itemVisualEquipmentAsset(deps, ...args),
      pickEquipmentGridVisualAsset: (...args) => itemVisualPickEquipmentAsset(deps, ...args),
      getUniqueEntryVisualAsset: (...args) => itemVisualUniqueAsset(deps, ...args),
      getDualSlotDisplayLabel: itemVisualDualSlotLabel,
      getBaseStepClassName: itemVisualBaseStepClass,
      showBaseUpgrade: (...args) => itemVisualShowBaseUpgrade(deps, ...args),
      closeBaseUpgrade: (...args) => itemVisualCloseBaseUpgrade(deps, ...args)
    });
  }

  // modules/domain/item-craft-ledger.mjs
  function createCraftResultLedger(snapshotCraftResultItem2) {
    let latest = null, sequence = 0;
    function begin(item, meta) {
      if (!item) return null;
      return { itemRef: item, before: snapshotCraftResultItem2(item), meta: { ...meta || {} }, seq: ++sequence };
    }
    function commit(token, item) {
      if (!token || !item || token.itemRef !== item) return null;
      let after = snapshotCraftResultItem2(item);
      const inner = latest && latest.itemRef === item && latest.seq > token.seq ? latest.meta.outcome : void 0;
      const meta = inner && !token.meta.outcome ? { ...token.meta, outcome: inner } : token.meta;
      latest = { itemRef: item, before: token.before, after, meta, seq: token.seq, afterKey: JSON.stringify(after) };
      return latest;
    }
    function getForItem(item) {
      if (!latest || latest.itemRef !== item) return null;
      return JSON.stringify(snapshotCraftResultItem2(item)) === latest.afterKey ? latest : null;
    }
    function amend(item) {
      if (!latest || latest.itemRef !== item) return null;
      const after = snapshotCraftResultItem2(item);
      latest = { ...latest, after, afterKey: JSON.stringify(after) };
      return latest;
    }
    function clear() {
      latest = null;
    }
    return { begin, commit, amend, getForItem, clear };
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/items-classic.mjs
  var rules = createItemRules({
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get SLENDER_GREATSWORD_BASES() {
      return SLENDER_GREATSWORD_BASES;
    },
    get getWeaponBaseId() {
      return getWeaponBaseId;
    },
    get bagItems() {
      return bagItems;
    },
    get _t() {
      return _t;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get getPassiveEquipmentRestriction() {
      return getPassiveEquipmentRestriction;
    },
    get getTranscendentVoidPassiveCount() {
      return typeof getTranscendentVoidPassiveCount === "undefined" ? void 0 : getTranscendentVoidPassiveCount;
    },
    get hasKeystone() {
      return typeof hasKeystone === "undefined" ? void 0 : hasKeystone;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get COLONY_WARD_RULES() {
      return COLONY_WARD_RULES;
    },
    get normalizeSupportLoadout() {
      return typeof normalizeSupportLoadout === "undefined" ? void 0 : normalizeSupportLoadout;
    },
    get JEWEL_RARITY_ORDER() {
      return JEWEL_RARITY_ORDER;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get pickParticle() {
      return pickParticle;
    },
    get ensureBeyondBoundaryState() {
      return ensureBeyondBoundaryState;
    },
    get atlas() {
      return atlas;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get TIME_RIFT_PAST_ZONE_ID() {
      return TIME_RIFT_PAST_ZONE_ID;
    },
    get TIME_RIFT_FUTURE_ZONE_ID() {
      return TIME_RIFT_FUTURE_ZONE_ID;
    },
    get TIME_RIFT_MAX_PRESSURE() {
      return TIME_RIFT_MAX_PRESSURE;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get addItemToInventory() {
      return addItemToInventory;
    },
    itemRandom: () => Math.random(),
    get getTimeRiftOptionKeepChance() {
      return getTimeRiftOptionKeepChance;
    },
    allocateItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get getTimeRiftFusionGrade() {
      return getTimeRiftFusionGrade;
    },
    get ensureEquipmentLoadoutItemIdentity() {
      return ensureEquipmentLoadoutItemIdentity;
    },
    get ensureMeteorSiteState() {
      return ensureMeteorSiteState;
    },
    get rollMeteorKind() {
      return rollMeteorKind;
    },
    get getSkyRiftGaugeEffectiveTier() {
      return getSkyRiftGaugeEffectiveTier;
    },
    get getZone() {
      return getZone;
    },
    get contentProgression() {
      return contentProgression;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get CHAOS_REALM_ZONE_ID() {
      return CHAOS_REALM_ZONE_ID;
    },
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get atlasRun() {
      return atlasRun;
    },
    get getSeasonBossProgressGate() {
      return getSeasonBossProgressGate;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get TIME_RIFT_UNLOCK_LOOP() {
      return TIME_RIFT_UNLOCK_LOOP;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get canEnterChaosRealm() {
      return canEnterChaosRealm;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get getWeaponCategoryOfBase() {
      return getWeaponCategoryOfBase;
    },
    get rollBaseStats() {
      return rollBaseStats;
    },
    get boostExceptionalBaseLine() {
      return boostExceptionalBaseLine;
    },
    get getStatName() {
      return getStatName;
    },
    get MARKET_EXCHANGES() {
      return MARKET_EXCHANGES;
    },
    get updateItemName() {
      return updateItemName;
    }
  });
  var visuals = createItemVisuals({
    get ITEM_VISUAL_ASSET_DB() {
      return typeof ITEM_VISUAL_ASSET_DB === "undefined" ? void 0 : ITEM_VISUAL_ASSET_DB;
    },
    get bagItems() {
      return bagItems;
    },
    get stumpBox() {
      return stumpBox;
    },
    get coreItems() {
      return coreItems;
    },
    get escapeHTML() {
      return typeof escapeHTML === "undefined" ? void 0 : escapeHTML;
    },
    get UNIQUE_EQUIPMENT_RULES() {
      return UNIQUE_EQUIPMENT_RULES;
    },
    get document() {
      return document;
    },
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get formatValue() {
      return formatValue;
    }
  });
  var startItemTravel = (force) => {
    try {
      let provider = typeof startMoving === "function" ? startMoving : typeof window !== "undefined" && typeof window.startMoving === "function" ? window.startMoving : null;
      if (provider) return provider(force);
    } catch (e) {
      console.error("startMoving failed:", e);
    }
  };
  var effects = {
    get itemLog() {
      return addLog.bind(void 0);
    },
    get itemRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get itemSave() {
      return queueImportantSave.bind(void 0);
    },
    get itemHideTooltip() {
      return hideItemTooltip.bind(void 0);
    },
    get itemWeaponChoice() {
      return (itemId) => window.GameModules.equipmentSlotChoice.open("weapon", itemId);
    },
    get itemRingChoice() {
      return (itemId) => window.GameModules.equipmentSlotChoice.open("ring", itemId);
    },
    get itemGloveChoice() {
      return (itemId) => window.GameModules.equipmentSlotChoice.open("glove", itemId);
    },
    itemStartMoving: startItemTravel,
    get itemSalvage() {
      return salvageItem.bind(void 0);
    },
    get itemOptionalLog() {
      return typeof addLog === "function" ? addLog.bind(void 0) : () => void 0;
    },
    itemEquipSpecial: (item, preferredSlot) => bagItemsUi.equipSpecial(item, preferredSlot),
    itemShowBaseUpgrade: visuals.showBaseUpgrade,
    itemCloseBaseUpgrade: visuals.closeBaseUpgrade
  };
  var getCodexSlotOrder = rules.getCodexSlotOrder;
  var getInventoryItemVisualAsset = visuals.getInventoryItemVisualAsset;
  var renderInventoryItemVisual = visuals.renderInventoryItemVisual;
  var getEquipmentGridVisualAsset = visuals.getEquipmentGridVisualAsset;
  var pickEquipmentGridVisualAsset = visuals.pickEquipmentGridVisualAsset;
  var getEquipmentInventoryFootprint = rules.getEquipmentInventoryFootprint;
  var getWeaponInventoryFootprint = rules.getWeaponInventoryFootprint;
  var getUniqueEntryVisualAsset = visuals.getUniqueEntryVisualAsset;
  var getAverageExplicitAffixTier = rules.getAverageExplicitAffixTier;
  var getCraftSelectionRef = rules.getCraftSelectionRef;
  var isCraftSelectionEquip = rules.isCraftSelectionEquip;
  var clearCraftSelection = rules.clearCraftSelection;
  var getSelectedCraftItem = (...args) => rules.getSelectedCraftItem(game, ...args);
  var ensureCraftSelectionValid = (...args) => rules.ensureCraftSelectionValid(game, ...args);
  var selectForCrafting = (...args) => consumeDomainCommands(rules.selectForCrafting(game, ...args), effects);
  var copyCraftResultStat = rules.copyCraftResultStat;
  var snapshotCraftResultItem = rules.snapshotCraftResultItem;
  var getEquipCandidateSlots = (...args) => rules.getEquipCandidateSlots(game, ...args);
  var canEquipItemToSlot = (...args) => rules.canEquipItemToSlot(game, ...args);
  var tryAutoEquipEmptySlot = (item, owner = game) => rules.tryAutoEquipEmptySlot(owner, item);
  var equipIntoFirstEmptySlot = (...args) => rules.equipIntoFirstEmptySlot(game, ...args);
  var equipIntoEmptySlots = (...args) => rules.equipIntoEmptySlots(game, ...args);
  var countFillableEmptySlots = (...args) => rules.countFillableEmptySlots(game, ...args);
  var isDualSlotItem = (...args) => rules.isDualSlotItem(game, ...args);
  var getDualSlotDisplayLabel = visuals.getDualSlotDisplayLabel;
  var equipItem = (...args) => consumeDomainCommands(rules.equipItem(game, ...args), effects);
  var equipItemById = (...args) => consumeDomainCommands(rules.equipItemById(game, ...args), effects);
  var equipSelectedCraftInventoryItem = (...args) => consumeDomainCommands(rules.equipSelectedCraftInventoryItem(game, ...args), effects);
  var unequipItemToGrid = (...args) => consumeDomainCommands(rules.unequipItemToGrid(game, ...args), effects);
  var unequipItem = (...args) => consumeDomainCommands(rules.unequipItem(game, ...args), effects);
  var releaseClosedThirdRing = (...args) => consumeDomainCommands(rules.releaseClosedThirdRing(game, ...args), effects);
  var salvageItemById = (...args) => consumeDomainCommands(rules.salvageItemById(game, ...args), effects);
  var toggleItemLockById = (...args) => consumeDomainCommands(rules.toggleItemLockById(game, ...args), effects);
  var hasActiveBeehiveRuntimeState = (...args) => rules.hasActiveBeehiveRuntimeState(game, ...args);
  var clearBeehiveRuntimeState = rules.clearBeehiveRuntimeState;
  var reconcileBeehiveRunState = (...args) => rules.reconcileBeehiveRunState(game, ...args);
  var isBeehiveRunLockedForMapTravel = (...args) => rules.isBeehiveRunLockedForMapTravel(game, ...args);
  var warnBeehiveMapTravelBlocked = (...args) => consumeDomainCommands(rules.warnBeehiveMapTravelBlocked(...args), effects);
  var getHeldRunBlockReason = (...args) => rules.getHeldRunBlockReason(game, ...args);
  var getContentStartBlockReason = (...args) => rules.getContentStartBlockReason(game, ...args);
  var setTimeRiftPressure = (...args) => consumeDomainCommands(rules.setTimeRiftPressure(game, ...args), effects);
  var getTimeRiftFutureEntryReason = (...args) => rules.getTimeRiftFutureEntryReason(game, ...args);
  var getTimeRiftFusionMismatchReason = rules.getTimeRiftFusionMismatchReason;
  var getTimeAltarItemIssue = (...args) => rules.getTimeAltarItemIssue(game, ...args);
  var placeItemOnTimeAltar = (...args) => consumeDomainCommands(rules.placeItemOnTimeAltar(game, ...args), effects);
  var retrieveTimeAltarItems = (...args) => consumeDomainCommands(rules.retrieveTimeAltarItems(game, ...args), effects);
  var resolveTimeRiftFusion = (...args) => consumeDomainCommands(rules.resolveTimeRiftFusion(game, ...args), effects);
  var prepareMeteorEncounterEntry = (...args) => rules.prepareMeteorEncounterEntry(game, ...args);
  var getZoneTravelBlockReason = (...args) => rules.getZoneTravelBlockReason(game, ...args);
  var changeZone = (...args) => consumeDomainCommands(rules.changeZone(game, ...args), effects);
  var buildGoldenRuleSpendPrompt = (...args) => rules.buildGoldenRuleSpendPrompt(game, ...args);
  var getBaseUpgradeCandidates = rules.getBaseUpgradeCandidates;
  var getBaseChainInfo = rules.getBaseChainInfo;
  var getBaseChainRank = rules.getBaseChainRank;
  var getBaseStepClassName = visuals.getBaseStepClassName;
  var getItemBaseChainInfo = rules.getItemBaseChainInfo;
  var upgradeSelectedItemBase = (...args) => consumeDomainCommands(rules.upgradeSelectedItemBase(game, ...args), effects);
  var closeBaseUpgradeOverlay = (...args) => consumeDomainCommands(rules.closeBaseUpgradeOverlay(game, ...args), effects);
  var getBaseUpgradeRefusal = rules.getBaseUpgradeRefusal;
  var confirmSelectedItemBaseUpgrade = (...args) => consumeDomainCommands(rules.confirmSelectedItemBaseUpgrade(game, ...args), effects);
  var getItemDisplayName = rules.getItemDisplayName;
  var craftingResultLedger = createCraftResultLedger(snapshotCraftResultItem);
  window.GameModules = window.GameModules || {};
  window.GameModules.items = {
    get db() {
      return window.UNIQUE_DB;
    },
    get orbs() {
      return window.ORB_DB;
    },
    get market() {
      return window.MARKET_EXCHANGES;
    }
  };
  safeExposeGlobals({ getCodexSlotOrder, getInventoryItemVisualAsset, renderInventoryItemVisual, getEquipmentGridVisualAsset, pickEquipmentGridVisualAsset, getEquipmentInventoryFootprint, getWeaponInventoryFootprint, getUniqueEntryVisualAsset, getAverageExplicitAffixTier, getCraftSelectionRef, isCraftSelectionEquip, clearCraftSelection, getSelectedCraftItem, ensureCraftSelectionValid, selectForCrafting, copyCraftResultStat, snapshotCraftResultItem, getEquipCandidateSlots, canEquipItemToSlot, tryAutoEquipEmptySlot, equipIntoFirstEmptySlot, equipIntoEmptySlots, countFillableEmptySlots, isDualSlotItem, getDualSlotDisplayLabel, equipItem, equipItemById, equipSelectedCraftInventoryItem, unequipItemToGrid, unequipItem, releaseClosedThirdRing, salvageItemById, toggleItemLockById, hasActiveBeehiveRuntimeState, clearBeehiveRuntimeState, reconcileBeehiveRunState, isBeehiveRunLockedForMapTravel, warnBeehiveMapTravelBlocked, getHeldRunBlockReason, getContentStartBlockReason, setTimeRiftPressure, getTimeRiftFutureEntryReason, getTimeRiftFusionMismatchReason, getTimeAltarItemIssue, placeItemOnTimeAltar, retrieveTimeAltarItems, resolveTimeRiftFusion, prepareMeteorEncounterEntry, getZoneTravelBlockReason, changeZone, buildGoldenRuleSpendPrompt, getBaseUpgradeCandidates, getBaseChainInfo, getBaseChainRank, getBaseStepClassName, getItemBaseChainInfo, upgradeSelectedItemBase, closeBaseUpgradeOverlay, getBaseUpgradeRefusal, confirmSelectedItemBaseUpgrade, getItemDisplayName, craftingResultLedger });
})();
