// GENERATED from modules/loop-reset*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/loop-hero-selection.mjs
  function* loopFlowApplyLoopHeroSelection(env, owner, classId, previousClassId) {
    owner.pendingLoopHeroSelection = false;
    yield { kind: "loopSave", args: [{ skipCloudSync: true }] };
    yield { kind: "loopCloudSave", args: ["루프 직업 선택 완료"] };
    env.deps.startMoving(true);
    yield { kind: "loopEvent", args: ["loop-hero-selection-completed", {
      classId,
      changed: classId !== previousClassId
    }] };
  }
  function* loopFlowRequestLoopHeroSelection(owner, options = {}) {
    let previousClassId = owner.selectedClassId || "archer";
    return yield { kind: "loopHeroRequest", args: [previousClassId, options] };
  }

  // modules/domain/loop-woodsman-entry.mjs
  function loopFlowMarkLoopSpecialBossKill(owner, bossKey) {
    owner.loopProgressCurrent = owner.loopProgressCurrent || { specialBosses: [] };
    owner.loopProgressCurrent.specialBosses = Array.isArray(owner.loopProgressCurrent.specialBosses) ? owner.loopProgressCurrent.specialBosses : [];
    if (!owner.loopProgressCurrent.specialBosses.includes(bossKey)) owner.loopProgressCurrent.specialBosses.push(bossKey);
  }
  function loopFlowAddWoodsmanPendingScore(owner, scoreGain) {
    let score = Math.max(0, Math.floor(scoreGain || 0));
    if (score <= 0) return;
    owner.woodsmanPendingScore = Math.max(Math.floor(owner.woodsmanPendingScore || 0), score);
    owner.woodsmanLifetimeScore = Math.max(Math.floor(owner.woodsmanLifetimeScore || 0), score);
  }
  function* loopFlowFinishWoodsmanEntrance(env, owner) {
    if (!owner.woodsmanEntrancePending) return false;
    owner.woodsmanEntrancePending = false;
    owner.currentZoneId = env.deps.OUTSIDE_CHAOS_ZONE_ID;
    let zone = env.deps.getZone(env.deps.OUTSIDE_CHAOS_ZONE_ID);
    if (!zone || zone.type !== "outsideChaos") return false;
    owner.moveTimer = 0;
    owner.moveTotalTime = 0;
    owner.runProgress = 0;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.enemies = [];
    owner.inEncounter = true;
    yield { kind: "loopLog", args: [env.deps._t("☠️ 하늘이 갈라지고 도끼날의 그림자가 전장을 뒤덮습니다."), "loot-unique"] };
    if (env.deps.getZoneExplorationPlan(zone)) env.deps.startEncounterRun();
    else {
      env.deps.startWoodsmanCurse();
      owner.enemies = [env.deps.createEnemy(zone, { at: 0, count: 1, boss: true }, 0)];
    }
    yield { kind: "loopRefresh", args: [] };
    return true;
  }
  function* loopFlowEnterOutsideChaos(env, owner) {
    const held = env.deps.getContentStartBlockReason();
    if (held) return yield { kind: "loopLog", args: [held, "attack-monster"] };
    if ((owner.season || 1) < 10) return yield { kind: "loopLog", args: [env.deps._t("혼돈 밖은 루프 10 이후 개방됩니다."), "attack-monster"] };
    let outsideChaosRequirementMet = hasOutsideChaosRequirement(env, owner);
    if (!outsideChaosRequirementMet) return yield { kind: "loopLog", args: [env.deps.getLoopAbyssRequirementPrompt(owner.season || 1), "attack-monster"] };
    env.deps.actExplorationProgress.depart(owner);
    owner.woodsmanBuildSnapshot = env.deps.snapshotWoodsmanBuildState();
    owner.woodsmanBuildLock = true;
    owner.currentZoneId = env.deps.OUTSIDE_CHAOS_ZONE_ID;
    owner.killsInZone = 0;
    owner.runProgress = 0;
    owner.moveTotalTime = env.WOODSMAN_ENTRANCE_DELAY_SECONDS;
    owner.moveTimer = env.WOODSMAN_ENTRANCE_DELAY_SECONDS;
    owner.isTownReturning = false;
    owner.combatHalted = false;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.enemies = [];
    owner.inEncounter = false;
    owner.woodsmanEntrancePending = true;
    env.deps.resetWoodsmanCurse();
    env.deps.prepareActExplorationArrival();
    yield { kind: "loopLog", args: [env.deps._t("☠️ 금단의 경계 너머로 발을 들였습니다. 혼돈이 몇 초간 숨을 고릅니다."), "loot-unique"] };
    yield { kind: "loopRefresh", args: [] };
  }
  function hasOutsideChaosRequirement(env, owner) {
    return typeof env.deps.hasCurrentLoopAbyssRequirementClear === "function" ? env.deps.hasCurrentLoopAbyssRequirementClear(owner.season || 1) : env.deps.getSeasonAbyssDepthCap(owner.season || 1) <= 20 ? typeof env.deps.hasCurrentLoopChaos20Clear === "function" ? env.deps.hasCurrentLoopChaos20Clear() : !!(owner.loopProgressCurrent && owner.loopProgressCurrent.chaos20Cleared) : Math.max(0, Math.floor(owner.loopProgressCurrent && owner.loopProgressCurrent.bestAbyssDepth || 0)) >= env.deps.getSeasonAbyssDepthCap(owner.season || 1);
  }
  function loopFlowDressWoodsmanEchoDummy(dummy) {
    dummy.name = "나무꾼의 잔상";
    dummy.maxHp = Math.max(1, Math.floor((dummy.maxHp || 1) * 1e3));
    dummy.hp = dummy.maxHp;
    dummy.echoStartHp = dummy.maxHp;
    dummy.noAttack = true;
    dummy.regenRate = 0;
    dummy.regenBank = 0;
    return dummy;
  }
  function* loopFlowEnterWoodsmanEchoChallenge(env, owner) {
    const held = env.deps.getContentStartBlockReason();
    if (held) return yield { kind: "loopLog", args: [held, "attack-monster"] };
    let st = env.deps.ensureChaosRealmState();
    if (!st.unlocked) return yield { kind: "loopLog", args: [env.deps._t("혼돈계 해금 이후 이용 가능합니다."), "attack-monster"] };
    if (!(Array.isArray(owner.journalEntries) && owner.journalEntries.includes("woodsman_echo"))) return yield { kind: "loopLog", args: [env.deps._t("나무꾼 완전 격파 이후에만 도전할 수 있습니다."), "attack-monster"] };
    let run = env.deps.ensureWoodsmanEchoRunState();
    run.active = true;
    run.duration = 30;
    run.timeLeft = 30;
    run.lastTickAt = env.deps.getCombatTime();
    run.totalDamage = 0;
    if (owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID || run.returnZoneId === void 0 || run.returnZoneId === null) run.returnZoneId = env.deps.getContentReturnZoneId();
    owner.incidentBreath = null;
    env.deps.actExplorationProgress.depart(owner);
    owner.currentZoneId = env.deps.WOODSMAN_ECHO_ZONE_ID;
    owner.killsInZone = 0;
    owner.runProgress = 0;
    owner.moveTimer = 0;
    owner.moveTotalTime = 0;
    owner.combatHalted = false;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    if (env.deps.getZoneExplorationPlan(env.deps.getZone(env.deps.WOODSMAN_ECHO_ZONE_ID))) {
      owner.enemies = [];
      env.deps.startEncounterRun();
    } else owner.enemies = [loopFlowDressWoodsmanEchoDummy(env.deps.createEnemy(env.deps.getZone(env.deps.OUTSIDE_CHAOS_ZONE_ID), { at: 0, count: 1, boss: true }, 0))];
    yield { kind: "loopLog", args: [env.deps._t("📏 나무꾼의 잔상 도전 시작: 30초 동안 최대 피해를 기록하세요. (허수아비는 공격하지 않습니다)"), "season-up"] };
    yield { kind: "loopRefresh", args: [] };
  }
  function* loopFlowEndWoodsmanFightForLoop(env, owner) {
    if (owner.woodsmanBuildLock) {
      env.deps.clearWoodsmanBuildLock();
      yield { kind: "loopLog", args: ["☠️ 혼돈 밖 전투를 중단하고 루프를 진행합니다. 세팅 잠금이 해제되었습니다.", "season-up"] };
    }
  }

  // modules/domain/equipment-hall.mjs
  function getHeldHallLoopBlockReason(hall, userId, translate) {
    const data = hall?.data;
    if (!data || !userId || hall.dataUserId !== userId) return "";
    const shown = (Array.isArray(data.mine) ? data.mine : []).filter((row) => row && ["open", "sold_out"].includes(row.status)).length;
    return shown ? translate("장비 전당에 전시한 원본 {shown}개가 남아 있습니다. 거래 → 장비 전당에서 회수한 뒤 루프를 진행하세요.", { shown }) : "";
  }

  // modules/domain/loop-progress.mjs
  function loopFlowAwardLoopProgressPoints(owner) {
    owner.loopProgressBase = owner.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    owner.loopProgressCurrent = owner.loopProgressCurrent || { specialBosses: [] };
    const { nowDepth, depthGain } = settledAbyssProgress(owner);
    const { baseLab, nowLab, labGain } = settledLabyrinthProgress(owner);
    let baseBosses = new Set(Array.isArray(owner.loopProgressBase.specialBosses) ? owner.loopProgressBase.specialBosses : []);
    let newBosses = (Array.isArray(owner.loopProgressCurrent.specialBosses) ? owner.loopProgressCurrent.specialBosses : []).filter((id) => !baseBosses.has(id));
    let bonus = depthGain * 2 + Math.floor(labGain / 5) + newBosses.length * 3;
    let woodsmanScore = Math.max(0, Math.floor(owner.woodsmanPendingScore || 0));
    let woodsmanSettled = Math.max(0, Math.floor(owner.woodsmanSettledScore || 0));
    let woodsmanDelta = Math.max(0, woodsmanScore - woodsmanSettled);
    let woodsmanGain = Math.floor(Math.sqrt(woodsmanDelta) / 25);
    bonus += woodsmanGain;
    if (bonus > 0) owner.loopDeepPoints = Math.max(0, Math.floor(owner.loopDeepPoints || 0)) + bonus;
    owner.loopProgressBase = { abyssEndlessDepth: nowDepth, labyrinthUnlockedMaxFloor: Math.min(nowLab, baseLab + Math.floor(labGain / 5) * 5), specialBosses: Array.from(/* @__PURE__ */ new Set([...Array.isArray(owner.loopProgressBase.specialBosses) ? owner.loopProgressBase.specialBosses : [], ...newBosses])) };
    owner.loopProgressCurrent = { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] };
    owner.woodsmanSettledScore = Math.max(woodsmanSettled, woodsmanScore);
    owner.woodsmanPendingScore = owner.woodsmanSettledScore;
    return { bonus, depthGain, labGain, bossGain: newBosses.length, woodsmanGain, woodsmanScore, woodsmanDelta };
  }
  function settledAbyssProgress(owner) {
    const baseDepth = Math.max(20, Math.floor(owner.loopProgressBase.abyssEndlessDepth || 20));
    const unlockedDepths = Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths.map((v) => Math.floor(v || 0)).filter((v) => v >= 21) : [];
    const highestUnlocked = unlockedDepths.length > 0 ? Math.max(...unlockedDepths) : Math.max(20, Math.floor(owner.abyssEndlessDepth || 20));
    const nowDepth = Math.max(20, highestUnlocked >= 21 ? highestUnlocked - 1 : highestUnlocked);
    return { nowDepth, depthGain: Math.max(0, nowDepth - baseDepth) };
  }
  function settledLabyrinthProgress(owner) {
    const baseLab = Math.max(1, Math.floor(owner.loopProgressBase.labyrinthUnlockedMaxFloor || 1));
    const nowLab = Math.max(1, Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    return { baseLab, nowLab, labGain: Math.max(0, nowLab - baseLab) };
  }
  function loopFlowResolveLoopAdvancePath(env, owner, requestedPath) {
    let requested = ["cosmos", "chaos"].includes(requestedPath) ? requestedPath : null;
    let available = typeof env.deps.getAvailableLoopAdvancePaths === "function" ? env.deps.getAvailableLoopAdvancePaths(owner.season || 1) : typeof env.deps.hasCurrentLoopAbyssRequirementClear === "function" && env.deps.hasCurrentLoopAbyssRequirementClear(owner.season || 1) ? ["chaos"] : [];
    if (requested) return available.includes(requested) ? requested : null;
    if (available.length === 1) return available[0];
    return null;
  }
  function loopFlowGetLoopAdvancePathLabel(path) {
    return path === "cosmos" ? "우주계 루프" : "혼돈 루프";
  }
  function loopFlowGetHeldGearLoopBlockReason(env, owner) {
    const stallReason = typeof env.deps.playerStall === "object" ? env.deps.playerStall.loopBlockReason(owner) : "";
    if (stallReason) return stallReason;
    return getHeldHallLoopBlockReason(env.deps.hallState, env.deps.hallUserId, env.deps._t);
  }
  function loopFlowGetSeasonResetBlockReason(env, owner, loopPath) {
    const heldReason = loopFlowGetHeldGearLoopBlockReason(env, owner);
    if (heldReason) return heldReason;
    const season = owner.season || 1;
    if (season < 31 || loopPath) return "";
    let available = typeof env.deps.getAvailableLoopAdvancePaths === "function" ? env.deps.getAvailableLoopAdvancePaths(season) : [];
    return available.length > 1 ? "혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요." : env.deps.getLoopAbyssRequirementPrompt(season);
  }
  function loopFlowClearLoopGate(owner) {
    owner.pendingLoopDecision = false;
    owner.pendingLoopReady = false;
    owner.loopGateOffline = false;
  }
  function loopFlowDeepPointsNow(owner) {
    return Math.max(0, Math.floor(owner.loopDeepPoints || 0));
  }

  // modules/domain/loop-preservation.mjs
  function loopFlowCollectLoopSealedBagItems(owner) {
    return [...owner.inventory || [], ...owner.equipmentTemporaryStorage || []].filter((item) => item && item.loopSealed).map((item) => JSON.parse(JSON.stringify(item)));
  }
  function loopFlowClearLoopItemStorage(owner) {
    owner.inventory = [];
    owner.equipmentTemporaryStorage = [];
  }
  function loopFlowGetLoopCodexReveal(owner) {
    let codexReveal = {};
    Object.keys(owner.uniqueCodex || {}).forEach((key) => {
      if (!key || !owner.uniqueCodex[key]) return;
      let parts = key.split("|");
      codexReveal[key] = { revealed: true, slot: parts[0] || "", name: parts[1] || "" };
    });
    return codexReveal;
  }
  function loopFlowCaptureLoopKeptState(env, owner) {
    return { ...loopFlowCaptureLoopKeptContents(env, owner), ...loopFlowCaptureLoopKeptItems(env, owner) };
  }
  function loopFlowCaptureLoopKeptContents(env, owner) {
    let prevMeteorSite = env.deps.ensureMeteorSiteState();
    let preservedConstellationBuff = prevMeteorSite.constellationBuff && prevMeteorSite.constellationBuff.permanent ? JSON.parse(JSON.stringify(prevMeteorSite.constellationBuff)) : null;
    let prevLabMax = Math.max(1, Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    let preservedChaosRealm = JSON.parse(JSON.stringify(env.deps.ensureChaosRealmState()));
    let preservedTimeRift = JSON.parse(JSON.stringify(env.deps.ensureTimeRiftState()));
    let preservedSkyTower = JSON.parse(JSON.stringify(env.deps.ensureSkyTowerState()));
    let preservedOcean = JSON.parse(JSON.stringify(env.deps.ensureOceanState()));
    let preservedGemEnhanceUnlocked = !!owner.gemEnhanceUnlocked;
    return { preservedConstellationBuff, prevLabMax, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked };
  }
  function loopFlowCaptureLoopKeptItems(env, owner) {
    let preservedSealedEquipment = {};
    Object.keys(owner.equipment || {}).forEach((slot) => {
      let it = owner.equipment[slot];
      if (it && it.loopSealed) preservedSealedEquipment[slot] = JSON.parse(JSON.stringify(it));
    });
    let preservedSealedInventory = loopFlowCollectLoopSealedBagItems(owner);
    let preservedWoodsmanTouch = Math.max(0, Math.floor(owner.currencies && owner.currencies.ouroboros || 0));
    let preservedAltarMaterials = env.deps.atlasEndgame.loopKeptCurrencies(owner);
    let preservedWoodsmanTouchSeen = !!owner.woodsmanTouchSeen;
    return { preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedAltarMaterials, preservedWoodsmanTouchSeen };
  }

  // modules/domain/loop-reset-state.mjs
  function loopFlowCloseLoopMap(env, owner) {
    if (owner.actExploration) env.deps.actExplorationProgress.depart(owner);
  }
  function loopFlowResetLoopProgress(owner) {
    owner.level = 1;
    owner.exp = 0;
    owner.killsInZone = 0;
    owner.loopDeaths = 0;
    owner.loopKills = 0;
    owner.woodsmanSimulatorSeenLoop = false;
    owner.currentZoneId = 0;
    owner.maxZoneId = 0;
    if (owner.cosmosAtlas && typeof owner.cosmosAtlas === "object") {
      owner.cosmosAtlas.bossStones = {};
      owner.cosmosAtlas.bossStoneOptions = {};
      owner.cosmosAtlas.bossRelics = [];
      owner.cosmosAtlas.bossKills = {};
      owner.cosmosAtlas.bossClears = [];
      owner.cosmosAtlas.equippedStoneGalaxy = 0;
      owner.cosmosAtlas.equippedStones = {};
    }
    owner.combatHalted = false;
  }
  function loopFlowResetLoopBuild(env, owner) {
    owner.passivePoints = typeof env.deps.getClaimedJournalPassivePointTotal === "function" ? env.deps.getClaimedJournalPassivePointTotal(owner) : 0;
    owner.passives = [];
    owner.passiveAttributeChoices = {};
    owner.voidPassives = {};
    owner.skills = ["기본 공격"];
    owner.activeSkill = "기본 공격";
    owner.weaponBlockedSkill = "";
    owner.mobilitySkill = "";
    owner.loopStarterWeaponGranted = false;
    owner.starterWeaponTutorialPending = null;
    owner.basicSkillOffer = null;
    owner.gemData = { "기본 공격": { level: 1, exp: 0 } };
    owner.runeSpares = {};
    owner.skyGemEnhancements = {};
    owner.supports = [];
    owner.equippedSupports = [];
    owner.supportGemData = {};
    owner.enemyConditionDebuffs = {};
    owner.dotFxThrottle = {};
    owner.sealedSkills = [];
    owner.sealedSupports = [];
    owner.resonancePower = 10;
    owner.completedTrials = [];
    owner.unlockedTrials = [];
    let clearedAscendKeystones = env.deps.rememberLoopAscendancyPlan(owner);
    owner.ascendNodes = [];
    owner.ascendPoints = 0;
    env.deps.clearAscendKeystoneRuntimeState(clearedAscendKeystones, { force: true, forceAll: true });
    owner.ascendKeystones = [];
    owner.ascendKeystonePoints = 0;
    owner.cosmosTwinKeystones = [];
    owner.realmDeathWard = null;
    owner.realmInvulnerableBarrierUntil = 0;
    owner.ascendRank = 0;
    owner.ascendClass = null;
    owner.bloomLoopSpecGranted = null;
    owner.bloomedClassThisLoop = null;
    owner.bloomedTalentThisLoop = null;
    owner.pendingTalentBloomHeroId = null;
  }
  function loopFlowResetLoopItems(env, owner, kept, codexReveal) {
    const { preservedAltarMaterials, preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedWoodsmanTouchSeen, prevLabMax } = kept;
    loopFlowClearLoopItemStorage(owner);
    owner.equipment = { ...env.deps.defaultGame.equipment };
    env.deps.craftingWorkspaceState.capture(owner);
    env.deps.currencyExchange.capture(owner);
    owner.currencies = { ...env.deps.defaultGame.currencies };
    preservedAltarMaterials.forEach(([key, value]) => {
      owner.currencies[key] = value;
    });
    owner.inventory.push(...Object.values(preservedSealedEquipment), ...preservedSealedInventory);
    if (preservedWoodsmanTouch > 0) owner.currencies.ouroboros = preservedWoodsmanTouch;
    owner.woodsmanTouchSeen = preservedWoodsmanTouchSeen;
    owner.labyrinthFloor = 1;
    owner.labyrinthLastResult = null;
    owner.labyrinthUnlockedMaxFloor = Math.max(1, Math.floor(prevLabMax || 1));
    owner.jewelInventory = [];
    owner.abyssClearedDepths = [];
    owner.claimableActRewards = [];
    owner.claimedActRewards = [];
    owner.actRewardBonuses = [];
    owner.seasonChaseUniqueDropped = false;
    owner.seasonChaseUniqueDrops = [];
    owner.uniqueCodex = codexReveal;
    owner.codexNewlyRegistered = {};
  }
  function loopFlowResetLoopContents(env, owner, kept) {
    const { preservedConstellationBuff, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked } = kept;
    owner.colony = JSON.parse(JSON.stringify(env.deps.defaultGame.colony));
    env.deps.clearBeehiveRuntimeState(owner.beehive);
    env.deps.abandonBeyondBoundaryRun(owner);
    Object.assign(owner.voidRift, { active: false, activeKills: 0, requiredKills: 0, pendingWave: false, totalToSpawn: 0, spawnedCount: 0, spawnTick: 0, grandRun: null, grandBreachUnlock: false });
    if (owner.woodsmanEchoRun) Object.assign(owner.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null });
    owner.meteorSite = JSON.parse(JSON.stringify(env.deps.defaultGame.meteorSite));
    owner.meteorSite.constellationBuff = preservedConstellationBuff;
    owner.unlocks = { ...env.deps.defaultGame.unlocks };
    if (typeof env.deps.syncPermanentTalentTabUnlock === "function") env.deps.syncPermanentTalentTabUnlock(owner);
    owner.noti = { ...env.deps.defaultGame.noti };
    env.deps.coreItems.resetForLoop();
    env.deps.stumpCube.clear();
    if (typeof env.deps.stumpBox === "object") env.deps.stumpBox.regress(owner);
    owner.itemSubtab = "item-tab-equip";
    owner.skillSubtab = "skill-tab-equip";
    owner.mapSubtab = "map-tab-zones";
    owner.mapExploreSubtab = "map-explore-atlas";
    owner.chaosRealm = preservedChaosRealm;
    env.deps.atlas.onLoopReset(owner);
    env.deps.knitting.resetForLoop(owner);
    owner.timeRift = preservedTimeRift;
    Object.assign(owner.timeRift, { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    owner.skyTower = preservedSkyTower;
    owner.ocean = preservedOcean;
    env.deps.forgetOceanAutoDive(owner.ocean);
    owner.skyTower.loopSeason = Math.max(1, Math.floor(owner.season || 1));
    owner.skyTower.clearedThisLoop = 0;
    owner.skyTower.lastResult = null;
    owner.gemEnhanceUnlocked = preservedGemEnhanceUnlocked;
    owner.inTicketBossFight = false;
  }
  function loopFlowApplyLoopSettings(owner) {
    if (owner.settings) {
      if (owner.settings.disableItemAutomationAfterLoop !== false) {
        owner.settings.autoSalvageEnabled = false;
        owner.settings.itemFilterEnabled = false;
      }
      owner.settings.mapCompleteAction = owner.settings.postLoopMapCompleteAction || "nextLoopBestPlusOne";
    }
    if (owner.heroSelectionInitialized && owner.unlocks) owner.unlocks.char = true;
  }

  // modules/domain/loop-arrival.mjs
  function* loopFlowAdvanceLoopCounters(env, owner, loopPath) {
    if (loopPath === "cosmos") owner.cosmosLoopCount = Math.max(0, Math.floor(owner.cosmosLoopCount || 0)) + 1;
    owner.lastLoopAdvancePath = loopPath;
    owner.season++;
    env.deps.loopMutation.begin(owner);
    owner.loopCount = Math.max(0, Math.floor(owner.loopCount || 0)) + 1;
    owner.seasonPoints++;
    yield { kind: "loopLog", args: [`🔁 ${loopFlowGetLoopAdvancePathLabel(loopPath)}로 다음 루프에 진입합니다.${loopPath === "cosmos" ? env.deps._t(" (우주계 난이도 +{max}단계)", { max: Math.max(0, Math.floor(owner.cosmosLoopCount || 0)) }) : ""}`, "season-up"] };
  }
  function loopFlowQueueLoopArrivalNotices(env, owner) {
    Object.entries(env.deps.EXPLORATION_EVENT_NOTICES).forEach(([kind, notice]) => {
      if (owner.season === notice.loop) env.deps.queueTutorialNotice("exploration_event_" + kind, notice.title, notice.body);
    });
    if (owner.season === 31 && typeof env.deps.queueTutorialNotice === "function") {
      env.deps.queueTutorialNotice("unlock_rival_blades", env.deps._t("버려진 날붙이들"), env.deps._t("나무꾼이 벼리다 버린 다른 날들이 당신을 찾아옵니다.\n‘지도 → 탐험 → 강대한 적’에서 결투에 도전하세요.\n도전권 [표식: 버려진 날]은 심층 보스가 떨어뜨립니다.\n한 루프 안에 다섯 날을 모두 꺾으면 「완성작」이 모습을 드러냅니다."), "tab-map");
    }
  }
  function loopFlowGetLoopSettleLogLine(env, loopReward) {
    return [env.deps._t("🧬 심화 루프 정산: +{bonus}pt (혼돈 심화 +{depthGain}, 미궁 +{labGain}, 특수보스 +{bossGain}, 나무꾼 +{woodsmanGain})", { bonus: loopReward.bonus, depthGain: loopReward.depthGain, labGain: loopReward.labGain, bossGain: loopReward.bossGain, woodsmanGain: loopReward.woodsmanGain || 0 }), loopReward.bonus > 0 ? "season-up" : "attack-monster"];
  }

  // modules/domain/loop-transition.mjs
  function* loopFlowTriggerSeasonReset(env, owner, options) {
    let loopPath = loopFlowResolveLoopAdvancePath(env, owner, typeof options === "string" ? options : options && options.path);
    let blockedReason = loopFlowGetSeasonResetBlockReason(env, owner, loopPath);
    if (blockedReason) {
      yield { kind: "loopLog", args: [blockedReason, "attack-monster"] };
      return false;
    }
    if (!loopPath) loopPath = "chaos";
    yield { kind: "loopCloseReward", args: [] };
    yield* loopFlowEndWoodsmanFightForLoop(env, owner);
    loopFlowClearLoopGate(owner);
    loopFlowCloseLoopMap(env, owner);
    owner.pendingLoopHeroSelection = true;
    let codexReveal = loopFlowGetLoopCodexReveal(owner);
    if (typeof env.deps.closeLoopRecord === "function") env.deps.closeLoopRecord(loopPath);
    yield { kind: "loopEvent", args: ["loop-rewrite-started"] };
    const kept = loopFlowCaptureLoopKeptState(env, owner);
    let loopDeepBeforeReset = loopFlowDeepPointsNow(owner);
    let loopReward = loopFlowAwardLoopProgressPoints(owner);
    let loopDeepExpectedAfterSettle = loopFlowDeepPointsNow(owner);
    yield* loopFlowAdvanceLoopCounters(env, owner, loopPath);
    loopFlowQueueLoopArrivalNotices(env, owner);
    yield { kind: "loopLog", args: [...loopFlowGetLoopSettleLogLine(env, loopReward)] };
    loopFlowResetLoopProgress(owner);
    loopFlowResetLoopBuild(env, owner);
    loopFlowResetLoopItems(env, owner, kept, codexReveal);
    loopFlowResetLoopContents(env, owner, kept);
    loopFlowApplyLoopSettings(owner);
    owner.loopDeepPoints = Math.max(loopDeepBeforeReset, loopDeepExpectedAfterSettle);
    yield* grantLoopCodexStarter(env, owner);
    owner.enemies = [];
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.runProgress = 0;
    yield { kind: "loopResetStall", args: [] };
    env.deps.clearCraftSelection();
    env.deps.applySeasonContentProgression({ silent: false });
    yield { kind: "loopPassiveReachable", args: [] };
    yield { kind: "loopPassiveVisibility", args: [] };
    let presetInvest = typeof env.deps.runPassiveTreeAutoInvest === "function" ? env.deps.runPassiveTreeAutoInvest() : { nodes: 0 };
    if (presetInvest.nodes > 0) yield { kind: "loopLog", args: [env.deps._t("🧭 새 루프 프리셋 자동 투자: {nodes}개 노드 활성화", { nodes: presetInvest.nodes }), "season-up"] };
    owner.playerHp = env.deps.getPlayerHpCap(env.deps.getPlayerStats());
    env.deps.ensureActJournalCompletionForLoop({ silent: false });
    yield { kind: "loopLog", args: [env.deps._t("🌟 [루프 포인트 1점] 획득. 밝혀낸 성좌 지형은 유지됩니다."), "season-up"] };
    yield { kind: "loopBarkNotice", args: [] };
    yield { kind: "loopCheckUnlocks", args: [] };
    yield { kind: "loopSave", args: [{ skipCloudSync: true }] };
    yield { kind: "loopCloudSave", args: ["루프 진행"] };
    yield* loopFlowRequestLoopHeroSelection(owner);
  }
  function* grantLoopCodexStarter(env, owner) {
    const reward = env.deps.grantCodexStarter(owner);
    if (reward) yield { kind: "loopCodexRewardNotice", args: [reward] };
  }

  // modules/domain/loop-gates.mjs
  function* loopFlowHandleSeasonLoopConditionMet(env, owner) {
    owner.pendingLoopReady = (owner.season || 1) < 10;
    owner.pendingLoopDecision = !owner.pendingLoopReady;
    owner.loopGateOffline = !!owner.isBackgroundCalculation;
    owner.combatHalted = true;
    env.deps.clearDefeatedEncounter();
    yield { kind: "loopLog", args: [env.deps._t("루프 {value} 달성. 이번 여정의 기록과 다음 해금 요소를 확인하세요.", { value: owner.season || 1 }), "season-up"] };
    yield { kind: "loopRefresh", args: [] };
  }
  function* loopFlowConfirmLoopReady(env, owner) {
    if (!owner.pendingLoopReady) return;
    let available = typeof env.deps.getAvailableLoopAdvancePaths === "function" ? env.deps.getAvailableLoopAdvancePaths(owner.season || 1) : [];
    if (available.length > 1) {
      owner.pendingLoopReady = false;
      owner.pendingLoopDecision = true;
      yield { kind: "loopLog", args: [env.deps._t("혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요."), "season-up"] };
      yield { kind: "loopRefresh", args: [] };
      return;
    }
    yield* loopFlowTriggerSeasonReset(env, owner);
  }
  function* loopFlowChooseLoopAdvancePath(env, owner, path) {
    let loopPath = loopFlowResolveLoopAdvancePath(env, owner, path);
    if (!loopPath) return yield { kind: "loopLog", args: [env.deps.getLoopAbyssRequirementPrompt(owner.season || 1), "attack-monster"] };
    yield* loopFlowTriggerSeasonReset(env, owner, { path: loopPath });
  }
  function* loopFlowChooseLoopAdvance(env, owner, shouldLoop) {
    if (!owner.pendingLoopDecision) return;
    if (shouldLoop) {
      yield* loopFlowTriggerSeasonReset(env, owner, { path: "chaos" });
      return;
    }
    loopFlowClearLoopGate(owner);
    yield { kind: "loopLog", args: [env.deps._t("♾️ 루프를 보류하고 혼돈 심화 등반을 이어갑니다. (혼돈 {max}부터 시작)", { max: Math.max(21, Math.floor((owner.abyssEndlessDepth || 20) + 1)) }), "season-up"] };
    env.deps.enterNextEndlessChaosDepth();
  }

  // modules/domain/loop-reset.mjs
  function createLoopReset(deps) {
    const env = { deps };
    env.WOODSMAN_ENTRANCE_DELAY_SECONDS = 3;
    return Object.freeze({
      applyLoopHeroSelection: (...args) => loopFlowApplyLoopHeroSelection(env, ...args),
      requestLoopHeroSelection: loopFlowRequestLoopHeroSelection,
      markLoopSpecialBossKill: loopFlowMarkLoopSpecialBossKill,
      addWoodsmanPendingScore: loopFlowAddWoodsmanPendingScore,
      finishWoodsmanEntrance: (...args) => loopFlowFinishWoodsmanEntrance(env, ...args),
      enterOutsideChaos: (...args) => loopFlowEnterOutsideChaos(env, ...args),
      dressWoodsmanEchoDummy: loopFlowDressWoodsmanEchoDummy,
      enterWoodsmanEchoChallenge: (...args) => loopFlowEnterWoodsmanEchoChallenge(env, ...args),
      getHeldGearLoopBlockReason: (...args) => loopFlowGetHeldGearLoopBlockReason(env, ...args),
      clearLoopItemStorage: loopFlowClearLoopItemStorage,
      triggerSeasonReset: (...args) => loopFlowTriggerSeasonReset(env, ...args),
      handleSeasonLoopConditionMet: (...args) => loopFlowHandleSeasonLoopConditionMet(env, ...args),
      confirmLoopReady: (...args) => loopFlowConfirmLoopReady(env, ...args),
      chooseLoopAdvancePath: (...args) => loopFlowChooseLoopAdvancePath(env, ...args),
      chooseLoopAdvance: (...args) => loopFlowChooseLoopAdvance(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/loop-reset-classic.mjs
  var rules = createLoopReset({
    get startMoving() {
      return startMoving;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get getZone() {
      return getZone;
    },
    get _t() {
      return _t;
    },
    get getZoneExplorationPlan() {
      return getZoneExplorationPlan;
    },
    get startEncounterRun() {
      return startEncounterRun;
    },
    get startWoodsmanCurse() {
      return startWoodsmanCurse;
    },
    get createEnemy() {
      return createEnemy;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get hasCurrentLoopAbyssRequirementClear() {
      return typeof hasCurrentLoopAbyssRequirementClear === "undefined" ? void 0 : hasCurrentLoopAbyssRequirementClear;
    },
    get getSeasonAbyssDepthCap() {
      return getSeasonAbyssDepthCap;
    },
    get hasCurrentLoopChaos20Clear() {
      return typeof hasCurrentLoopChaos20Clear === "undefined" ? void 0 : hasCurrentLoopChaos20Clear;
    },
    get getLoopAbyssRequirementPrompt() {
      return getLoopAbyssRequirementPrompt;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get snapshotWoodsmanBuildState() {
      return snapshotWoodsmanBuildState;
    },
    get resetWoodsmanCurse() {
      return resetWoodsmanCurse;
    },
    get prepareActExplorationArrival() {
      return prepareActExplorationArrival;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get ensureWoodsmanEchoRunState() {
      return ensureWoodsmanEchoRunState;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get getContentReturnZoneId() {
      return getContentReturnZoneId;
    },
    get clearWoodsmanBuildLock() {
      return clearWoodsmanBuildLock;
    },
    get getAvailableLoopAdvancePaths() {
      return typeof getAvailableLoopAdvancePaths === "undefined" ? void 0 : getAvailableLoopAdvancePaths;
    },
    get playerStall() {
      return typeof playerStall === "undefined" ? void 0 : playerStall;
    },
    get hallState() {
      return window.GameModules.equipmentHall?.state;
    },
    get hallUserId() {
      return window.GameModules.cloudAccountState.current.user?.id;
    },
    get ensureMeteorSiteState() {
      return ensureMeteorSiteState;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get getClaimedJournalPassivePointTotal() {
      return typeof getClaimedJournalPassivePointTotal === "undefined" ? void 0 : getClaimedJournalPassivePointTotal;
    },
    get rememberLoopAscendancyPlan() {
      return rememberLoopAscendancyPlan;
    },
    get clearAscendKeystoneRuntimeState() {
      return clearAscendKeystoneRuntimeState;
    },
    get defaultGame() {
      return defaultGame;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get currencyExchange() {
      return currencyExchange;
    },
    get clearBeehiveRuntimeState() {
      return clearBeehiveRuntimeState;
    },
    get abandonBeyondBoundaryRun() {
      return abandonBeyondBoundaryRun;
    },
    get syncPermanentTalentTabUnlock() {
      return typeof syncPermanentTalentTabUnlock === "undefined" ? void 0 : syncPermanentTalentTabUnlock;
    },
    get coreItems() {
      return coreItems;
    },
    get stumpCube() {
      return stumpCube;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get atlas() {
      return atlas;
    },
    get knitting() {
      return knitting;
    },
    get forgetOceanAutoDive() {
      return forgetOceanAutoDive;
    },
    get loopMutation() {
      return loopMutation;
    },
    get EXPLORATION_EVENT_NOTICES() {
      return EXPLORATION_EVENT_NOTICES;
    },
    get queueTutorialNotice() {
      return typeof queueTutorialNotice === "undefined" ? void 0 : queueTutorialNotice;
    },
    get closeLoopRecord() {
      return typeof closeLoopRecord === "undefined" ? void 0 : closeLoopRecord;
    },
    grantCodexStarter: (owner) => window.GameModules.lootRules.grantCodexStarter(owner),
    get clearCraftSelection() {
      return clearCraftSelection;
    },
    get applySeasonContentProgression() {
      return applySeasonContentProgression;
    },
    get runPassiveTreeAutoInvest() {
      return typeof runPassiveTreeAutoInvest === "undefined" ? void 0 : runPassiveTreeAutoInvest;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get ensureActJournalCompletionForLoop() {
      return ensureActJournalCompletionForLoop;
    },
    get clearDefeatedEncounter() {
      return clearDefeatedEncounter;
    },
    get enterNextEndlessChaosDepth() {
      return enterNextEndlessChaosDepth;
    }
  });
  var effects = {
    get loopCodexRewardNotice() {
      return loopSettlementUi.announceCodexStarter;
    },
    get loopLog() {
      return addLog.bind(void 0);
    },
    get loopRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get loopSave() {
      return saveGame.bind(void 0);
    },
    get loopCloudSave() {
      return typeof requestImmediateCloudSave === "function" ? requestImmediateCloudSave.bind(void 0) : () => void 0;
    },
    get loopEvent() {
      return dispatchRuntimeEvent.bind(void 0);
    },
    get loopCheckUnlocks() {
      return checkUnlocks.bind(void 0);
    },
    get loopPassiveReachable() {
      return calculateReachableNodes.bind(void 0);
    },
    get loopPassiveVisibility() {
      return refreshPassiveVisibility.bind(void 0);
    },
    get loopCloseReward() {
      return window.GameModules.playFeedback.reward.dismissForLoop.bind(window.GameModules.playFeedback.reward);
    },
    loopResetStall: () => {
      window.GameModules.state.session.progressStallTicks = 0;
    },
    loopBarkNotice: () => worldTreeBark.noticeFirstBark(),
    loopHeroRequest: (previousClassId, options) => dispatchRuntimeEvent("loop-hero-selection-requested", {
      handled: false,
      options,
      select: (classId) => applyLoopHeroSelection(classId, previousClassId)
    })
  };
  var applyLoopHeroSelection = (...args) => consumeDomainCommands(rules.applyLoopHeroSelection(game, ...args), effects);
  var requestLoopHeroSelection = (...args) => consumeDomainCommands(rules.requestLoopHeroSelection(game, ...args), effects);
  var markLoopSpecialBossKill = (...args) => rules.markLoopSpecialBossKill(game, ...args);
  var addWoodsmanPendingScore = (...args) => rules.addWoodsmanPendingScore(game, ...args);
  var finishWoodsmanEntrance = (...args) => consumeDomainCommands(rules.finishWoodsmanEntrance(game, ...args), effects);
  var enterOutsideChaos = (...args) => consumeDomainCommands(rules.enterOutsideChaos(game, ...args), effects);
  var dressWoodsmanEchoDummy = rules.dressWoodsmanEchoDummy;
  var enterWoodsmanEchoChallenge = (...args) => consumeDomainCommands(rules.enterWoodsmanEchoChallenge(game, ...args), effects);
  var getHeldGearLoopBlockReason = (...args) => rules.getHeldGearLoopBlockReason(game, ...args);
  var clearLoopItemStorage = rules.clearLoopItemStorage;
  var triggerSeasonReset = (...args) => consumeDomainCommands(rules.triggerSeasonReset(game, ...args), effects);
  var handleSeasonLoopConditionMet = (...args) => consumeDomainCommands(rules.handleSeasonLoopConditionMet(game, ...args), effects);
  var confirmLoopReady = (...args) => consumeDomainCommands(rules.confirmLoopReady(game, ...args), effects);
  var chooseLoopAdvancePath = (...args) => consumeDomainCommands(rules.chooseLoopAdvancePath(game, ...args), effects);
  var chooseLoopAdvance = (...args) => consumeDomainCommands(rules.chooseLoopAdvance(game, ...args), effects);
  safeExposeGlobals({ applyLoopHeroSelection, requestLoopHeroSelection, markLoopSpecialBossKill, addWoodsmanPendingScore, finishWoodsmanEntrance, enterOutsideChaos, dressWoodsmanEchoDummy, enterWoodsmanEchoChallenge, getHeldGearLoopBlockReason, clearLoopItemStorage, triggerSeasonReset, handleSeasonLoopConditionMet, confirmLoopReady, chooseLoopAdvancePath, chooseLoopAdvance });
})();
