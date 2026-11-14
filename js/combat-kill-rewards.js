// GENERATED from modules/combat-kill-rewards*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/kill-loot-format.mjs
  var beeLabels = { pollen: "꽃가루", venomStinger: "독벌침", enchantedHoney: "마력 깃든 벌꿀", beeswax: "밀랍" };
  var beeEvents = {
    queen: (env) => [env.deps._t("👑 여왕벌 이벤트! 꽃가루 +{pollen}, 벌꿀 +1, 밀랍 +2", { pollen: 25 }), "loot-unique"],
    sting: (env) => [env.deps._t("🐝 독침벌 무리 이벤트! 독벌침 +1"), "loot-rare"],
    bumble: (env) => [env.deps._t("🐝 호박벌 이벤트! 꽃가루 +15, 밀랍 +1"), "loot-rare"],
    worker: (env) => [env.deps._t("🐝 벌 이벤트! 꽃가루 +8"), "loot-magic"]
  };
  var formats = {
    equipmentLog: (env, { item }) => [env.deps._t("🛡️ <span class='loot-{rarity}'>[{name}]</span> 획득!", { rarity: item.rarity, name: env.deps._t(item.name) }), "", { item }],
    echo: (env) => [env.deps._t("🌌 각성 잔향 +1"), "loot-unique"],
    currencyLog: currencyLine,
    beeLoot: (env, note) => [`🐝 ${beeLabels[note.key]} +${note.amount}`, "loot-normal"],
    beeEvent: (env, note) => beeEvents[note.kind](env),
    hiveKey: (env) => [env.deps._t("🗝️ 벌집 입장권 열쇠를 발견했습니다."), "loot-rare"],
    trace: (env) => [env.deps._t("🧭 군락지 흔적을 발견했습니다."), "loot-magic", { noToast: true }],
    fossil: (env) => [env.deps._t("🌌 희귀 화석 [심연 화석]을 발견했습니다!"), "loot-unique"]
  };
  function currencyLine(env, note) {
    const name = typeof env.deps.getStyledOrbName === "function" ? env.deps.getStyledOrbName(note.key) : env.deps.ORB_DB[note.key] && env.deps._t(env.deps.ORB_DB[note.key].name) || note.key;
    return [`🪙 ${name} +${note.amount}`, note.key === "goldenRule" || note.key === "sapBud" ? "loot-unique" : "loot-magic"];
  }
  function lootLogArguments(env, note) {
    const format = formats[note.action];
    return format ? format(env, note) : null;
  }
  function lootJewelColor(jewel) {
    return jewel.rarity === "unique" ? "#dca6ff" : "#78cfff";
  }

  // modules/ui/kill-loot-feedback.mjs
  function lootShowEquipmentDelivery(env, enemy, item, result) {
    if (result.celebrate && !env.deps.battleFxSuppressed) celebrateLoot(env, enemy, item, result.highlight);
    if (result.receipt) lootQueueGroundReceipt(env, enemy, result.receipt);
  }
  function lootQueueGroundReceipt(env, enemy, receipt) {
    if (env.owner.isBackgroundCalculation || env.deps.battleFxSuppressed) return;
    const item = receipt.item;
    const loot2 = { ...receipt, zoneId: env.owner.currentZoneId, sourceCell: { gx: enemy.gx, gy: enemy.gy } };
    if (item) loot2.item = {
      name: item.name,
      baseId: item.baseId,
      slot: item.slot,
      rarity: item.rarity,
      family: item.family,
      lines: item.lines
    };
    env.deps.addBattleFx("lootPickup", { enemyId: enemy.id, loot: loot2, duration: 1200 });
    celebrateLoot(env, enemy, item, receipt.highlight);
  }
  function celebrateLoot(env, enemy, item, highlight) {
    if (highlight) env.deps.addBattleFx("lootCelebration", {
      enemyId: enemy.id,
      ...highlight,
      itemName: item.name,
      tier: item.rarity,
      groundLoot: true,
      duration: 1800
    });
  }
  var notices = {
    equipmentDelivery: (env, note) => lootShowEquipmentDelivery(env, note.enemy, note.item, note.result),
    receipt: (env, note) => lootQueueGroundReceipt(env, note.enemy, note.receipt),
    jewelReceipt: (env, note) => lootQueueGroundReceipt(env, note.enemy, { item: note.jewel, itemKind: "jewel", color: lootJewelColor(note.jewel) }),
    yarn: (env, note) => env.deps.receiveKnittingYarn(note.id)
  };
  function lootConsumeNotices(env, iterator) {
    let step = iterator.next();
    while (!step.done) {
      const note = step.value;
      if (note.event) env.deps.dispatchRuntimeEvent(note.event, note.detail);
      else notices[note.action](env, note);
      step = iterator.next();
    }
    return step.value;
  }
  function lootConsumeFloorPickup(env, iterator) {
    let step = iterator.next();
    while (!step.done) {
      const notice = step.value;
      if (notice.action === "talisman") env.deps.announceWildTalisman(notice.detail);
      else if (notice.action === "leaf") env.deps.atlasFinds.receiveMemoryLeaf(notice.detail);
      else if (notice.action === "yarn") env.deps.receiveKnittingYarn(notice.detail);
      else env.deps.dispatchRuntimeEvent(notice.event, notice.detail);
      step = iterator.next();
    }
    return step.value;
  }
  function lootConsumeRoll(env, iterator, say) {
    const ui = { unlocks: env.deps.checkUnlocks };
    for (const note of iterator) {
      if (note.action === "unlocks") ui.unlocks();
      else if (note.event) env.deps.dispatchRuntimeEvent(note.event, note.detail);
      else logOrPresentNotice(env, note, say);
    }
  }
  function logOrPresentNotice(env, note, say) {
    const args = lootLogArguments(env, note);
    if (!args) return notices[note.action](env, note);
    if (note.action === "equipmentLog" || note.action === "beeEvent") env.deps.addLog(...args);
    else if (!note.deferred) say(...args);
  }
  function lootAnnounceColonyWard(env, ward, say) {
    if (!ward) return;
    const line = ward.baseStats[0];
    if (ward.rarity !== "unique") return say(env.deps._t("🛡️ 군락지 액막이 부적 획득: {statName} +{id}", {
      statName: env.deps.colonyWardsUi.statName(line.id),
      id: env.deps.formatValue(line.id, line.val)
    }), "loot-rare", { item: ward, itemKind: "talisman" });
    say(env.deps._t("🛡️ 군락지 고유 액막이 획득: [{name}]", { name: ward.name }), "loot-unique", { item: ward, itemKind: "talisman" });
    if (!env.owner.isBackgroundCalculation) env.deps.dispatchRuntimeEvent("incident", {
      text: env.deps._t("체이싱 고유 장비를 획득했습니다. 「{name}」", { name: ward.name }),
      tone: "chase",
      chase: true
    });
  }

  // modules/combat/kill-experience.mjs
  function killGetEnemyExperienceReward(env, enemy, pStats, kind = "experience") {
    const zone = env.deps.getZone(env.owner.currentZoneId), abyssScale = env.deps.getAbyssMonsterScales(zone);
    const abyssDepth = zone.type === "abyss" ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return env.deps.progressionRules.reward(enemy, pStats, kind, { state: env.owner, zone, abyssScale, abyssDepth });
  }
  function killGrantWornGemExp(env, amount, stats) {
    return env.deps.progressionRules.wornGems(
      env.owner,
      stats,
      amount,
      { main: env.deps.mobilitySkill.mainGem(), mobility: env.deps.mobilitySkill.equipped() }
    );
  }
  function* killGrantExpAndGem(env, enemy, pStats) {
    let gemLeveled = false;
    const experience = (kind, scale = 1) => [enemy, ...enemy.cerberusRewards || []].reduce(
      (sum, part) => sum + Math.floor(killGetEnemyExperienceReward(env, part, pStats, kind) * scale),
      0
    );
    const exp = experience("experience");
    env.owner.exp += exp;
    if (env.owner.settings.showExpLog && exp > 0) yield { kind: "addLog", args: [env.deps._t("✨ 경험치 +{exp}", { exp }), "exp-txt"] };
    const gemExp = experience("gemExperience", 0.45), progression2 = env.deps.progressionRules;
    for (const name of killGrantWornGemExp(env, gemExp, pStats)) {
      gemLeveled = true;
      yield { kind: "addLog", args: [env.deps._t(env.deps.SKILL_DB[name]?.isGem ? "✨ 룬 [{name}] 레벨업!" : "✨ 스킬 [{name}] 레벨업!", { name: env.deps._t(name) }), "loot-unique"] };
    }
    for (const name of progression2.summonGems(env.owner, gemExp)) {
      gemLeveled = true;
      yield { kind: "addLog", args: [env.deps._t("✦ 소환수 룬 [{name}] 레벨업!", { name }), "loot-unique"] };
    }
    for (const name of progression2.supportGems(env.owner, gemExp)) {
      gemLeveled = true;
      yield { kind: "addLog", args: [env.deps._t("🟢 룬 [{name}] 레벨업!", { name }), "loot-rare"] };
    }
    let leveledUp = false;
    for (const level of progression2.levels(env.owner)) {
      leveledUp = true;
      killAwardLevelPassivePoint(env);
      env.owner.playerHp = env.deps.getPlayerHpCap(env.deps.getPlayerStats());
      yield { kind: "addLog", args: [env.deps._t("🎉 레벨업! (Lv.{level})", { level }), "level-up"] };
      yield { kind: "checkUnlocks", args: [] };
    }
    if (leveledUp) yield* finishKillLevelUp(env);
    return gemLeveled;
  }
  function* finishKillLevelUp(env) {
    const autoInvest = typeof env.deps.runPassiveTreeAutoInvest === "function" ? yield { kind: "runPassiveTreeAutoInvest", args: [] } : { nodes: 0 };
    if (autoInvest.nodes > 0) yield { kind: "addLog", args: [env.deps._t("🧭 프리셋 자동 투자: {nodes}개 노드 활성화", { nodes: autoInvest.nodes }), "season-up"] };
    yield { kind: "addBattleFx", args: ["levelUp", { level: env.owner.level, duration: 1050, color: "#ffe59a" }] };
    yield { kind: "queueImportantSave", args: [250] };
  }
  function killAwardLevelPassivePoint(env) {
    env.deps.progressionRules.awardPoint(env.owner, env.deps.contentProgression.canOpen("tab-char"));
  }

  // modules/data/rift-kill-values.mjs
  var GRAND_BREACH_BASE_ROLE = /* @__PURE__ */ Object.freeze({ hp: 1, speed: 1, damage: 1, penetration: 0, chaosRes: 0, ailment: 0 });
  var GRAND_BREACH_ROLE_TUNING = /* @__PURE__ */ Object.freeze({
    "breach-scout": /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 0.82, speed: 1.22 }),
    "breach-reflux": /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, damage: 1.15, penetration: 4 }),
    "breach-veil": /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.25, chaosRes: 12 }),
    "breach-venom": /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.2, ailment: 0.12 })
  });

  // modules/combat/rift-kill-state.mjs
  function killApplyGrandBreachMobTuning(zone, enemy) {
    if (!zone || zone.id !== "grand_breach_run" || !enemy || enemy.isBoss) return;
    const role = GRAND_BREACH_ROLE_TUNING[enemy.monsterVisualId] || GRAND_BREACH_BASE_ROLE;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 5 * role.hp));
    enemy.atkMul *= 1.25;
    enemy.damageMul *= 1.25 * role.damage;
    enemy.attackSpeedVar *= role.speed;
    enemy.penetration += role.penetration;
    enemy.resChaos = Math.min(95, enemy.resChaos + role.chaosRes);
    enemy.ailmentChance += role.ailment;
    enemy.hp = enemy.maxHp;
  }
  function killIsMapProgressHeld(env, zone, rift) {
    if (zone?.type === "colony") return true;
    return killIsVoidRiftCombatZone(zone) && rift.active && !env.deps.actExplorationState.current(env.owner);
  }
  function killIsVoidRiftCombatZone(zone) {
    return !!zone && zone.type === "abyss";
  }
  function killApplyVoidRiftMobTuning(enemy) {
    if (!enemy || enemy.isBoss) return;
    enemy.maxHp = Math.max(1, Math.floor((enemy.maxHp || 1) * 2));
    enemy.hp = enemy.maxHp;
    enemy.atkMul = (enemy.atkMul || 1) * 1.25;
    enemy.damageMul = (enemy.damageMul || 1) * 1.3;
    enemy.expMul = (enemy.expMul || 1) * 2;
  }
  function* killRollRandomVoidRiftOnKill(env, enemy, zone) {
    if ((env.owner.season || 1) < 9 || !killIsVoidRiftCombatZone(zone)) return;
    const v = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (v.active) {
      if (enemy.fromVoidRift) v.defeatedCount = Math.max(0, Math.floor(v.defeatedCount || 0)) + 1;
      return;
    }
    if (Math.random() >= (enemy.isElite ? 3335e-7 : 75e-6)) return;
    Object.assign(v, { active: true, activeKills: 0, requiredKills: 0, pendingWave: true, totalToSpawn: 6 + Math.floor(Math.random() * 4), spawnedCount: 0, defeatedCount: 0, spawnTick: 0 });
    yield { kind: "killSay", args: ["🕳️ 공허의 구멍이 랜덤으로 열렸습니다!", "attack-monster", { noToast: true }] };
  }

  // modules/combat/kill-state.mjs
  function killClearDotFxThrottleForEnemy(env, enemyId) {
    if (!Number.isFinite(enemyId)) return;
    let fxState = env.owner.dotFxThrottle;
    if (!fxState || typeof fxState !== "object") return;
    let prefix = `${enemyId}:`;
    Object.keys(fxState).forEach((key) => {
      if (key && key.startsWith(prefix)) delete fxState[key];
    });
  }
  function* killGrantLoopStarterWeaponOnFirstKill(env, enemy) {
    if (env.owner.loopStarterWeaponGranted) return;
    env.owner.loopStarterWeaponGranted = true;
    const item = env.deps.createClassStarterWeapon(env.owner.selectedClassId);
    if (!item) return;
    if (!(env.owner.seenTutorials || []).includes(env.deps.basicSkills.weaponGuide)) env.owner.starterWeaponTutorialPending = item.id;
    if (enemy) yield { kind: "keepEquipmentDrop", args: [enemy, item, { guaranteedKeep: true }] };
    else env.deps.addItemToInventory(item, { guaranteedKeep: true });
  }
  function killResolveEnemyDeath(env, enemy) {
    if (!enemy || !Number.isFinite(enemy.id)) return null;
    const liveRef = (env.owner.enemies || []).find((entry) => entry && entry.id === enemy.id);
    if (!liveRef || liveRef.hp > 0) return null;
    enemy = liveRef;
    if (env.owner.currentZoneId === env.deps.WOODSMAN_ECHO_ZONE_ID) {
      const run = env.deps.ensureWoodsmanEchoRunState();
      run.totalDamage = Math.max(run.totalDamage, Math.floor(enemy.echoStartHp || enemy.maxHp));
      env.deps.finishWoodsmanEchoRun();
      return null;
    }
    return enemy;
  }
  function killTickTalentKillRuntime(env, enemy) {
    if (env.owner.talentInquisitorMarks) delete env.owner.talentInquisitorMarks[enemy.id];
    if (typeof env.deps.isTalentCardActive !== "function" || !env.deps.isTalentCardActive("hero2__gladiator")) return;
    env.owner.talentRuntime = env.owner.talentRuntime && typeof env.owner.talentRuntime === "object" ? env.owner.talentRuntime : {};
    env.owner.talentRuntime.colosseumKills = (env.owner.talentRuntime.colosseumKills || 0) + 1;
    if (env.owner.talentRuntime.colosseumKills >= 5) {
      env.owner.talentRuntime.colosseumKills = 0;
      env.owner.talentRuntime.colosseumReady = true;
    }
  }

  // modules/combat/ocean-guardian-state.mjs
  function killCallOceanGuardianAtBoundary(env) {
    if (env.owner.currentZoneId !== env.deps.OCEAN_ZONE_ID || env.owner.combatHalted || !(env.owner.playerHp > 0)) return;
    const st = env.deps.ensureOceanState();
    if (!st.diving || env.deps.getOceanPendingBossBoundary(st) <= 0) return;
    if (env.owner.moveTimer > 0) killRelayOceanArrivalToGuardian(env);
    else if (killIsOceanSectionRunning(env)) env.deps.startMoving(false);
  }
  function* killNoteOceanKill(env, enemy, zone) {
    if (!zone || zone.type !== "oceanDepth") return;
    const seconds = env.deps.applyOceanKill(enemy);
    if (!(seconds > 0)) return;
    yield { kind: "addBattleFx", args: ["statusText", { text: env.deps._t("🫧 산소 +{seconds}초", { seconds }), color: "#8fd8ff", duration: 620 }] };
    yield { kind: "addBattleFx", args: ["oceanAir", { enemyId: enemy.id, cell: { gx: enemy.gx, gy: enemy.gy }, duration: 2e3 }] };
  }
  function* killCallOceanGuardianAdds(env) {
    const guardian = killGetOceanGuardianInFight(env);
    if (!guardian) return;
    const rule = env.deps.OCEAN_COMBAT_DIVE.guardianAdds, now = env.deps.getCombatTime();
    if (!(guardian.oceanAddsAt > 0)) guardian.oceanAddsAt = now + rule.everyMs;
    if (now < guardian.oceanAddsAt) return;
    guardian.oceanAddsAt = now + rule.everyMs;
    const alive = env.owner.enemies.filter((enemy) => enemy && enemy.hp > 0 && enemy.oceanAirAdd).length;
    const called = yield* killSpawnOceanGuardianAdds(env, guardian, Math.min(rule.count, rule.max - alive));
    if (called > 0 && env.owner.settings.showSpawnLog !== false) yield { kind: "killSay", args: [env.deps._t("🫧 심해 가디언이 졸개 {called}마리를 불렀습니다. 쓰러뜨리면 공기 방울이 나옵니다.", { called }), "attack-monster", { noToast: true }] };
  }
  function killGetOceanGuardianInFight(env) {
    if (env.owner.currentZoneId !== env.deps.OCEAN_ZONE_ID || !env.owner.oceanBossRunPending || env.owner.combatHalted || !(env.owner.playerHp > 0)) return null;
    const guardian = (env.owner.enemies || []).find((enemy) => enemy && enemy.isBoss && enemy.hp > 0);
    return guardian && env.deps.hasGridCell(guardian) ? guardian : null;
  }
  function* killSpawnOceanGuardianAdds(env, guardian, count) {
    const zone = env.deps.getZone(env.deps.OCEAN_ZONE_ID), blocked = env.deps.getGridBlockedCells();
    let called = 0;
    for (; called < count; called++) {
      const cell = env.deps.findFreeGridCell(blocked, guardian);
      if (!cell) break;
      const enemy = env.deps.createEnemy(zone, { at: 90, elite: false, boss: false }, 40 + called);
      Object.assign(enemy, cell, { gridMoveTimer: 0.25, attackTimer: 0, oceanAirAdd: true, spawnStamp: env.deps.getBattleSpawnStamp() });
      blocked.add(env.deps.gridCellKey(cell.gx, cell.gy));
      env.owner.enemies.push(enemy);
      yield { kind: "addBattleFx", args: ["enemySpawn", { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 320, boss: false }] };
    }
    return called;
  }
  function killRelayOceanArrivalToGuardian(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (run && run.arrival && !(run.source && run.source.arena)) env.deps.prepareActExplorationArrival();
  }
  function killIsOceanSectionRunning(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (run) return !(run.source && run.source.arena) && run.status === "active";
    const plan = env.owner.encounterPlan || [];
    if (!plan.length || plan.some((marker) => marker && marker.boss)) return false;
    return env.owner.encounterIndex < plan.length || (env.owner.enemies || []).some((enemy) => enemy && enemy.hp > 0);
  }

  // modules/combat/kill-grand-breach.mjs
  function* killGrantGrandBreachClearRewards(env, kills, enemy = env.owner.gridPlayer) {
    const rewards = killGetGrandBreachRewardSummary(kills);
    rewards.voidChisel = (yield { kind: "keepCurrencyDrop", args: [enemy, "voidChisel", rewards.voidChisel] }).gain;
    rewards.jewelShard = rewards.jewelShard > 0 ? (yield { kind: "keepCurrencyDrop", args: [enemy, "jewelShard", rewards.jewelShard] }).gain : 0;
    return rewards;
  }
  function killGrandBreachClearRewardText(env, rewards) {
    const pieces = [env.deps._t("균열 몬스터 {kills}처치 정산", { kills: rewards.kills })];
    if (rewards.voidChisel) pieces.push(`공허의 끌 +${rewards.voidChisel}`);
    if (rewards.jewelShard) pieces.push(`주얼 결정 +${rewards.jewelShard}`);
    return pieces.join(", ");
  }
  function* killFinishGrandBreachOnBossKill(env, enemy, zone) {
    const grand = env.owner.voidRift.grandRun;
    if (!zone || zone.id !== "grand_breach_run" || !enemy.isBoss || !grand || !grand.inRun || grand.phase !== "boss") return;
    const v = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    const rewards = yield* killGrantGrandBreachClearRewards(env, grand.kills, enemy);
    env.deps.actExplorationState.groundLoot.releaseEncounter(grand, enemy);
    grand.rewardVoidChisel = rewards.voidChisel;
    grand.rewardJewelShard = rewards.jewelShard;
    grand.phase = "loot";
    v.grandBreachCleared = true;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    env.deps.markLoopSpecialBossKill("void_grand_breach");
    env.deps.unlockJournalEntry("void_grand_breach");
    yield { kind: "killSay", args: [env.deps._t("🌌 대균열 보스를 격파했습니다! {rewards}. 바닥 전리품을 모두 획득하면 귀환합니다.", { rewards: killGrandBreachClearRewardText(env, rewards) }), "level-up"] };
    yield* killFinishGrandBreachLootCollection(env, zone);
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* killGrandBreachFloorLeft(env) {
    const floor = env.deps.actExplorationState.current(env.owner);
    if (floor?.groundLoot.length && env.owner.isBackgroundCalculation) yield { kind: "collectExplorationFloorLoot", args: [env.deps.actExplorationState.groundLoot.takeAll(floor)] };
    return !!floor?.groundLoot.length;
  }
  function* killFinishGrandBreachLootCollection(env, zone) {
    const grand = env.owner.voidRift.grandRun;
    if (!grand?.inRun || grand.phase !== "loot") return;
    if (yield* killGrandBreachFloorLeft(env)) return;
    if (!env.deps.actExplorationProgress.beginCompletion(zone)) return;
    grand.inRun = false;
    grand.phase = "done";
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId = grand.returnZoneId !== void 0 && grand.returnZoneId !== null ? grand.returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    yield { kind: "queueImportantSave", args: [200] };
  }
  function killGetGrandBreachRewardSummary(kills) {
    let safeKills = Math.max(0, Math.floor(Number(kills) || 0));
    return {
      kills: safeKills,
      voidChisel: 2 + Math.floor(safeKills / 10),
      jewelShard: Math.min(3, Math.floor(safeKills / 15))
    };
  }

  // modules/combat/kill-counters.mjs
  function* killCountKillForContent(env, enemy, zone, pStats) {
    if (enemy.isBoss) killMarkBossKillForContent(env, enemy, zone, pStats);
    killCountGrandBreachSurvivalKill(env, enemy, zone);
    yield* killNoteOceanKill(env, enemy, zone);
    env.deps.combatIncidents.onKill(enemy, zone);
    env.owner.loopKills = Math.max(0, Math.floor(env.owner.loopKills || 0)) + 1;
    if (env.owner.isBackgroundCalculation) killCountBackgroundKillMix(env, enemy);
  }
  function killMarkBossKillForContent(env, enemy, zone, pStats) {
    env.deps.completeHiddenJournalBossRun(enemy, zone, pStats);
    if (zone && zone.type === "trial" && zone.bloomTrial) env.owner.bloomBossDefeated = true;
  }
  function killCountGrandBreachSurvivalKill(env, enemy, zone) {
    const grand = env.owner.voidRift.grandRun;
    if (zone?.id !== "grand_breach_run" || !grand?.inRun || grand.phase !== "survival" || enemy.isBoss) return;
    const progress = env.deps.getGrandBreachProgress(grand.gauge);
    if (progress.complete) {
      grand.phase = "bossPending";
      return;
    }
    grand.kills = killGetGrandBreachRewardSummary(grand.kills).kills + 1;
    const gain = enemy.isElite ? env.deps.GRAND_BREACH_ENCOUNTER.eliteGaugeGain : env.deps.GRAND_BREACH_ENCOUNTER.normalGaugeGain;
    const next = env.deps.getGrandBreachProgress(progress.gauge + gain);
    grand.gauge = next.gauge;
    if (next.complete) grand.phase = "bossPending";
  }
  function killCountBackgroundKillMix(env, enemy) {
    const mix = env.owner.backgroundKillMix && typeof env.owner.backgroundKillMix === "object" ? env.owner.backgroundKillMix : env.owner.backgroundKillMix = { normal: 0, elite: 0, boss: 0 };
    const bucket = enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "normal";
    mix[bucket] = Math.max(0, Math.floor(mix[bucket] || 0)) + 1;
  }

  // modules/combat/kill-dot-transfer.mjs
  function* killTransferSkillDotOnDeath(env, enemy) {
    let dotState = enemy && enemy.dotState;
    let skill = dotState && env.deps.SKILL_DB[dotState.skillName];
    let config = skill && skill.dotTransferOnDeath;
    if (!config || dotState.timeLeft <= 0) return;
    let target = (env.owner.enemies || []).find((entry) => entry && entry.id !== enemy.id && entry.hp > 0);
    if (!target) return;
    transferRemainingDot(target, dotState, config);
    yield { kind: "addConfirmedSkillEffect", args: ["confirmedTransfer", { skillName: dotState.skillName, sourceCell: env.deps.copyCombatGridCell(enemy) }, target, dotState.ele] };
    yield { kind: "addBattleFx", args: ["statusText", {
      enemyId: target.id,
      text: env.deps._t("지속 피해 이전"),
      color: "#b98cff",
      duration: 700,
      dedupeKey: `dot-transfer:${enemy.id}:${target.id}`
    }] };
  }
  function transferRemainingDot(target, dotState, config) {
    let scale = Math.max(0, Number(config.remainingDamagePct) || 0) / 100;
    let transferred = { ...dotState, rawTickDamage: Math.max(1, Math.floor(dotState.rawTickDamage * scale)) };
    if (!target.dotState || transferred.rawTickDamage >= target.dotState.rawTickDamage) target.dotState = transferred;
    target.dotStacks = Math.max(target.dotStacks || 0, transferred.stacks || 1);
  }

  // modules/combat/kill-unique-effects.mjs
  function killApplyUniqueKillEffects(env, pStats) {
    if (!pStats) return;
    if (pStats.uniqueKillMoveStacks) killStackUniqueKillMove(env, pStats.uniqueKillMoveStacks);
    if (pStats.uniqueLeechEfficiencyOnKill) {
      env.owner.uniqueLeechEfficiencyUntil = env.deps.getCombatTime() + Math.max(1e3, Math.floor((pStats.uniqueLeechEfficiencyOnKill.duration || 8) * 1e3));
    }
  }
  function killStackUniqueKillMove(env, rule) {
    const now = env.deps.getCombatTime();
    const state = env.owner.uniqueKillMoveStacksState || { stacks: 0, expiresAt: 0, lastProcAt: 0 };
    if ((state.lastProcAt || 0) + Math.floor((rule.cooldownSec || 1) * 1e3) <= now) {
      state.stacks = Math.min(Math.max(1, Math.floor(rule.maxStacks || 20)), Math.max(0, Math.floor(state.stacks || 0)) + 1);
      state.lastProcAt = now;
    }
    state.expiresAt = now + Math.floor((rule.duration || 20) * 1e3);
    env.owner.uniqueKillMoveStacksState = state;
  }
  function killGetOverkillSplash(enemy, pStats) {
    const left = Number(enemy.lastOverkillDamage);
    return pStats && pStats.uniqueOverkillSplash && Number.isFinite(left) && left > 0 ? Math.max(1, Math.floor(left)) : 0;
  }
  function killGetRangerWeakpointBonus(env, enemy, hitDamage) {
    const v = env.deps.ASCENDANCY_KEYSTONE_VALUES.r5, maxHp = enemy.maxHp || enemy.hp || 1;
    if (!enemy.isBoss) return Math.max(1, Math.floor(maxHp * v.lifePct / 100));
    return Math.max(1, Math.floor(maxHp * v.bossLifePct / 100), Math.floor((hitDamage || 0) * v.bossHitMul));
  }

  // modules/combat/kill-colony-wave.mjs
  function* killAdvanceColonyWaveOnKill(env, zone, enemy) {
    if (!zone || zone.id !== "colony_run" || !env.owner.colony || !env.owner.colony.inRun) return;
    killReleaseColonyBossLootOnKill(env, enemy);
    env.owner.colony.kills = Math.max(0, Math.floor((env.owner.colony.kills || 0) + 1));
    if ((env.owner.colony.kills || 0) >= Math.max(1, Math.floor(env.owner.colony.requiredKills || 1))) yield* killCompleteColonyWave(env, zone, enemy);
  }
  function killReleaseColonyBossLootOnKill(env, enemy) {
    if (env.owner.colony.wave % 5 === 0 && enemy?.isBoss) env.owner.colony.bossLootCell = { gx: enemy.gx, gy: enemy.gy };
    if (env.owner.colony.bossLootCell) env.deps.actExplorationState.groundLoot.releaseEncounter(env.owner.colony, env.owner.colony.bossLootCell);
  }
  function killGrantColonyWaveCurrencies(env, completedWave) {
    const shards = 1 + Math.floor(completedWave / 3);
    env.deps.awardCurrency("colonyShard", shards);
    if (Math.random() < 0.35) env.deps.awardCurrency("formlessDew", 1, "drop");
    if (completedWave % 10 === 0) env.deps.awardCurrency("colonyTrace", 1);
    return shards;
  }
  function killRepairColonyDefenseCore(env) {
    const run = env.deps.getColonyRoomRun(), colony = env.owner.colony;
    if (!run || !env.deps.actExplorationMap.forRun(run).colonyDefense || colony.coreMaxHp <= 0) return;
    colony.coreHp = Math.min(colony.coreMaxHp, colony.coreHp + Math.max(1, Math.floor(colony.coreMaxHp * 0.1)));
  }
  function* killCompleteColonyWave(env, zone, lastEnemy) {
    if (!env.owner.colony?.inRun) return;
    const completedWave = Math.max(1, Math.floor(env.owner.colony.wave || 1));
    const shardReward = killGrantColonyWaveCurrencies(env, completedWave);
    yield { kind: "announceColonyWard", args: [env.deps.colonyWards.rollColonyWave(completedWave, zone, Math.random, lastEnemy)] };
    killReleaseCompletedColonyWaveLoot(env, completedWave, lastEnemy);
    env.owner.colony.wave = Math.max(1, Math.floor((env.owner.colony.wave || 1) + 1));
    env.owner.colony.highestWave = Math.max(Math.floor(env.owner.colony.highestWave || 1), env.owner.colony.wave);
    if (env.owner.colony.highestWave >= 11) env.deps.unlockJournalEntry("colony_wave_10");
    env.owner.colony.kills = 0;
    env.owner.colony.requiredKills = env.deps.getColonyWaveEnemyCount(env.owner.colony.wave);
    killRepairColonyDefenseCore(env);
    if (!env.deps.getColonyRoomRun() && !env.owner.colony.lootPending) env.deps.spawnColonyWave();
    yield { kind: "killSay", args: [env.deps._t("🪲 군락지 {completedWave}웨이브 완료. 군락지 편린 +{shardReward}{value}", { completedWave, shardReward, value: completedWave % 10 === 0 ? env.deps._t(", 군락지 흔적 +1") : "" }), "loot-magic"] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function killReleaseCompletedColonyWaveLoot(env, completedWave, lastEnemy) {
    if (completedWave % 5 === 0) {
      env.deps.actExplorationState.groundLoot.releaseEncounter(env.owner.colony, env.owner.colony.bossLootCell || lastEnemy);
      env.owner.colony.lootPending = true;
    }
    env.owner.colony.bossLootCell = null;
  }

  // modules/combat/kill-refresh.mjs
  function* killFlagHeavyUiAfterKill(env, enemy, zone, gemLeveled, currencyDropVersionBefore) {
    const currencyChanged = Math.max(0, Math.floor(env.owner.currencyDropVersion || 0)) !== currencyDropVersionBefore;
    const colonyStateChanged = Boolean(zone && zone.id === "colony_run" && env.owner.colony && env.owner.colony.inRun);
    const badge = ["char", "skills", "items", "map"].some((key) => env.owner.noti[key]);
    if ([enemy.isBoss, enemy.isElite, currencyChanged, gemLeveled, colonyStateChanged, badge].some(Boolean)) yield { kind: "requestHeavyUiRefresh", args: [] };
  }

  // modules/combat/core-hit-results.mjs
  function* coreExplodeCorpse(env, enemy, splash, detail) {
    const { label, noun = "피해" } = detail;
    let reached = [];
    const enemies = env.owner.enemies || [], count = enemies.length;
    for (let index = 0; index < count; index++) {
      if (!(index in enemies)) continue;
      const target = enemies[index];
      if (!target || target.id === enemy.id || target.hp <= 0) continue;
      env.deps.applyDamageToEnemyResource(target, splash);
      reached.push(target.name);
      if (target.hp <= 0) yield { kind: "corpseDeath", args: [target] };
    }
    if (reached.length === 0) return "";
    return yield { kind: "corpseExplosionLine", args: [reached, splash, label, noun] };
  }

  // modules/combat/kill-progression.mjs
  function hitRecordKillProgress(env, enemy) {
    if (typeof env.deps.stumpBox === "object") env.deps.stumpBox.onEnemyKilled(env.owner, enemy, hitLayStumpDrop(env, enemy));
    if (typeof env.deps.bossVariants === "object") env.deps.combatLootReceipts.capture(env.owner, () => env.deps.bossVariants.onKilled(env.owner, enemy));
    if (typeof env.deps.stumpNursery === "object") env.deps.stumpNursery.onKilled(env.owner, enemy);
    if (typeof env.deps.weaponMastery === "object") env.deps.weaponMastery.onKilled(env.owner, enemy);
  }
  function hitLayStumpDrop(env, enemy) {
    const spec = env.deps.stumpBox.rollKillDrop(env.owner, enemy);
    return spec && env.deps.placeFloorItem(enemy, "stump", spec) ? null : spec;
  }

  // modules/domain/player-combat-effects.mjs
  function stealEliteTrait(owner, enemy, stats, clock) {
    if (!enemy || !enemy.isElite || !stats || !stats.uniqueStealEliteTrait) return;
    const trait = enemy.trait || null;
    if (!trait) return;
    const durationMs = Math.max(1e3, Math.floor(Number(stats.uniqueStealEliteTrait.duration || 30) * 1e3));
    owner.uniqueEliteTraitBuff = { trait: { ...trait }, expiresAt: clock() + durationMs };
    return trait;
  }

  // modules/combat/player-stat-events.mjs
  function* playerGrantEliteTraitOnKill(env, enemy, stats) {
    const trait = stealEliteTrait(env.owner, enemy, stats, env.deps.getCombatTime);
    if (!trait) return;
    if (env.owner.settings && env.owner.settings.showCombatLog !== false) yield {
      kind: "addLog",
      args: [env.deps._t("🩸 정예 특성 흡수: {name}", { name: env.deps._t(trait.name || "정예 특성") }), "loot-unique", { noToast: true }]
    };
  }

  // modules/combat/kill-death.mjs
  function* killHandleEnemyDeath(env, enemy, pStats) {
    enemy = killResolveEnemyDeath(env, enemy);
    if (!enemy) return;
    env.deps.woodsmanStumps.clear(enemy);
    if (env.deps.woodsmanStumps.retireAdd(enemy)) return;
    env.deps.playerStatCache.beginEvent();
    retireKilledEnemy(env, enemy, pStats);
    yield* killTransferSkillDotOnDeath(env, enemy);
    const zone = env.deps.getZone(env.owner.currentZoneId);
    yield* killCountKillForContent(env, enemy, zone, pStats);
    yield* killGrantLoopStarterWeaponOnFirstKill(env, enemy);
    killTickTalentKillRuntime(env, enemy);
    yield* announceKilledEnemy(env, enemy);
    yield* playerGrantEliteTraitOnKill(env, enemy, pStats);
    const gemLeveled = yield* killGrantExpAndGem(env, enemy, pStats);
    const currencyDropVersionBefore = Math.max(0, Math.floor(env.owner.currencyDropVersion || 0));
    yield { kind: "grantEnemyLoot", args: [enemy] };
    hitRecordKillProgress(env, enemy);
    if (env.deps.actExplorationState.recordDeath(env.owner, enemy)) env.deps.actExplorationProgress.objects.afterDeath(env.deps.actExplorationState.current(env.owner));
    env.deps.gainSkyRiftGaugeFromCombat(zone, enemy);
    env.deps.applyAilmentEffectsOnDeath(enemy, pStats);
    yield* killRollRandomVoidRiftOnKill(env, enemy, zone);
    yield* killExplodeCorpsesOnKill(env, enemy, pStats);
    killApplyUniqueKillEffects(env, pStats);
    yield* splashOverkill(env, enemy, pStats);
    clearKilledEnemyRuntime(env, enemy);
    advanceBeehiveAfterKill(env, zone);
    yield* killAdvanceColonyWaveOnKill(env, zone, enemy);
    yield* killFinishGrandBreachOnBossKill(env, enemy, zone);
    yield* settleRemainingDeaths(env, pStats);
    yield* killFlagHeavyUiAfterKill(env, enemy, zone, gemLeveled, currencyDropVersionBefore);
    env.deps.playerStatCache.endEvent();
  }
  function retireKilledEnemy(env, enemy, pStats) {
    env.owner.enemies = env.owner.enemies.filter((entry) => entry.id !== enemy.id);
    env.deps.combatSupports.retire(enemy);
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.erosionLegacy) {
      const inherited = Math.floor(Math.max(0, Number(enemy.chaosErosionShred) || 0) * 0.5);
      if (inherited > 0) env.owner.passiveChaosErosionTransfer = inherited;
    }
  }
  function* announceKilledEnemy(env, enemy) {
    yield { kind: "addBattleFx", args: ["enemyDeath", {
      enemyId: enemy.id,
      name: enemy.name,
      color: env.deps.getElementColor(enemy.ele),
      // Reviving bosses keep their standing fade until the story animation ends.
      duration: enemy.isBoss ? env.deps.STAGE_STORY_ART.revives[enemy.bossAssetKey]?.total || 1600 : enemy.isElite ? 500 : 340,
      boss: !!enemy.isBoss,
      elite: !!enemy.isElite
    }] };
  }
  function* splashOverkill(env, enemy, pStats) {
    const damage = killGetOverkillSplash(enemy, pStats);
    if (!(damage > 0)) return;
    const victims = env.owner.enemies || [], count = victims.length;
    for (let index = 0; index < count; index++) {
      if (!(index in victims)) continue;
      const target = victims[index];
      if (!target || target.id === enemy.id || target.hp <= 0) continue;
      env.deps.applyDamageToEnemyResource(target, damage);
      if (target.hp <= 0) yield { kind: "settleDeath", args: [target, pStats] };
    }
  }
  function clearKilledEnemyRuntime(env, enemy) {
    if (env.owner.enemyWitherStacks && typeof env.owner.enemyWitherStacks === "object") delete env.owner.enemyWitherStacks[enemy.id];
    killClearDotFxThrottleForEnemy(env, enemy.id);
  }
  function advanceBeehiveAfterKill(env, zone) {
    if (zone && zone.id === "beehive_run" && env.owner.beehive && env.owner.beehive.inRun && env.deps.countBeehiveWaveAlive() === 0) {
      if (typeof env.deps.onBeehiveWaveCleared === "function") env.deps.onBeehiveWaveCleared();
    }
  }
  function* settleRemainingDeaths(env, pStats) {
    const defeated = (env.owner.enemies || []).filter((entry) => entry && entry.hp <= 0);
    for (const enemy of defeated) yield { kind: "settleDeath", args: [enemy, pStats] };
  }
  function* killExplodeCorpsesOnKill(env, enemy, pStats) {
    yield* killExplodeRuneCorpse(env, enemy, pStats);
    yield* killExplodeUniqueCorpse(env, enemy, pStats);
    yield* killExplodePlagueCorpse(env, enemy, pStats);
  }
  function* killExplodeRuneCorpse(env, enemy, pStats) {
    if (!pStats || !((pStats.runeCorpseExplodeChance || 0) > 0) || Math.random() >= killCorpseExplosionChance(pStats.runeCorpseExplodeChance)) return;
    const splash = killCorpseExplosionSplash(enemy, pStats.runeCorpseExplodeLifePct);
    const line = yield* killSettleCorpseExplosion(env, enemy, splash, { label: "룬 시체 폭발", pStats });
    yield* killLogCorpseExplosion(env, line);
  }
  function* killExplodeUniqueCorpse(env, enemy, pStats) {
    if (!pStats || !pStats.uniqueCorpseExplode) return;
    const ignited = env.deps.hasKeystone("bm7") && (enemy.ailments || []).some((row) => row && row.type === "ignite" && (row.time || 0) > 0);
    if (!ignited && Math.random() >= killCorpseExplosionChance(pStats.uniqueCorpseExplode.chance)) return;
    const splash = killCorpseExplosionSplash(enemy, pStats.uniqueCorpseExplode.lifePct);
    const line = yield* killSettleCorpseExplosion(env, enemy, splash, { label: env.deps.hasKeystone("bm7") ? "대폭발" : "종말의 논리 시체 폭발", pStats });
    yield { kind: "addBattleFx", args: ["hit", { enemyId: enemy.id, color: "#c56cff", damage: splash, duration: 360, element: "chaos", syncToSwing: true }] };
    yield* killLogCorpseExplosion(env, line);
  }
  function* killExplodePlagueCorpse(env, enemy, pStats) {
    if (!env.deps.hasKeystone("wlk9") || !(enemy.lastHitElement === "chaos" || env.deps.hasKeystone("wlk1")) || Math.random() >= 0.5) return;
    const splash = Math.max(1, Math.floor((enemy.maxHp || enemy.hp || 0) * 0.2));
    const line = yield* killSettleCorpseExplosion(env, enemy, splash, { label: "시체 역병", pStats, noun: "카오스 피해" });
    yield { kind: "addBattleFx", args: ["hit", { enemyId: enemy.id, color: "#9b59ff", damage: splash, duration: 360, element: "chaos", syncToSwing: true }] };
    yield* killLogCorpseExplosion(env, line);
  }
  function killCorpseExplosionSplash(enemy, lifePct) {
    return Math.max(1, Math.floor((enemy.maxHp || 0) * (Math.max(0, Number(lifePct || 0)) / 100)));
  }
  function killCorpseExplosionChance(pct) {
    return Math.max(0, Math.min(1, Number(pct || 0) / 100));
  }
  function* killSettleCorpseExplosion(env, enemy, splash, detail) {
    const { label, pStats, noun } = detail;
    const commands = coreExplodeCorpse(env, enemy, splash, { label, noun });
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      if (command.kind === "corpseDeath") {
        yield { kind: "settleDeath", args: [command.args[0], pStats] };
        step = commands.next();
      } else step = commands.next(yield command);
    }
    return step.value;
  }
  function* killLogCorpseExplosion(env, line) {
    if (line && env.owner.settings.showCombatLog) yield { kind: "killSay", args: [line, "attack-player"] };
  }

  // modules/combat/clear-interruption.mjs
  function killEnterAutomaticMeteorEncounter(env) {
    env.deps.prepareMeteorEncounterEntry(env.owner.currentZoneId);
    env.owner.currentZoneId = env.deps.METEOR_FALL_ZONE_ID;
  }
  function killOnChaos20Cleared(env) {
    env.deps.maybeUnlockSkyTowerFromChaos20();
    env.deps.atlasRun.onChaos20();
  }
  function* killEnterAutomaticMapInterruptionAfterClear(env, clearedZone) {
    let star = env.owner.meteorSite || {};
    const locks = killMapInterruptionLocks(env);
    if (killMeteorInterruptionReady(env.owner, star, locks, clearedZone)) {
      killEnterAutomaticMeteorEncounter(env);
      yield { kind: "addLog", args: [env.deps._t("☄️ 자동입장: 하늘 균열 100% 충전으로 운석 낙하 지점에 진입합니다."), "season-up"] };
      return true;
    }
    if (typeof env.deps.autoEnterGrandBreachIfReady === "function" && env.deps.autoEnterGrandBreachIfReady()) return true;
    return killAutoRediveOceanAfterClear(env, clearedZone);
  }
  function killMapInterruptionLocks(env) {
    const beehive = typeof env.deps.isBeehiveRunLockedForMapTravel === "function" ? env.deps.isBeehiveRunLockedForMapTravel() : !!(env.owner.beehive && env.owner.beehive.inRun);
    const grand = !!(env.owner.voidRift && env.owner.voidRift.grandRun && env.owner.voidRift.grandRun.inRun);
    return { beehive, grand };
  }
  function killMeteorInterruptionReady(state, star, locks, zone) {
    return state.settings && state.settings.autoEnterMeteor && !locks.beehive && !locks.grand && star.unlocked && star.skyRiftReady && (!zone || zone.type !== "meteor");
  }
  function killAutoRediveOceanAfterClear(env, clearedZone) {
    if (!killCanAutoRediveOcean(env, env.deps.ensureOceanState()) || !killIsOceanRediveMoment(env, clearedZone)) return false;
    if (!env.deps.enterOceanDive({ auto: true, shallow: true })) return false;
    env.owner.killsInZone = 0;
    return true;
  }
  function killCanAutoRediveOcean(env, st) {
    if (!env.owner.settings.autoRediveOcean || env.owner.isBackgroundCalculation || !st.unlocked || st.diving) return false;
    return ["oxygen", "guardian"].includes(st.lastSurfaceReason) && !env.deps.isOceanAutoRediveHalted(st);
  }
  function killIsOceanRediveMoment(env, clearedZone) {
    if (!clearedZone || !["act", "abyss"].includes(clearedZone.type) || env.owner.settings.townReturnAction === "stop") return false;
    if (killIsColonyOrGrandBreachRunning(env) || env.owner.playerHp < env.deps.getPlayerHpCap(env.deps.getPlayerStats()) * 0.9) return false;
    return !env.deps.getZoneTravelBlockReason(env.deps.OCEAN_ZONE_ID) && !env.deps.getContentStartBlockReason();
  }
  function killIsColonyOrGrandBreachRunning(env) {
    return !!(env.owner.colony && env.owner.colony.inRun) || !!(env.owner.voidRift && env.owner.voidRift.grandRun && env.owner.voidRift.grandRun.inRun);
  }

  // modules/combat/approach-destination.mjs
  function killResolvePlayerApproachTarget(env, alive) {
    let target = alive.find((enemy) => enemy.id === env.deps.combatTacticsRuntime.approachTargetId);
    if (!target) target = env.deps.findNearestGridEnemy(env.owner.gridPlayer, alive);
    env.deps.combatTacticsRuntime.approachTargetId = target ? target.id : null;
    return target;
  }

  // modules/ui/combat-log-format.mjs
  function coreFormatNumberKR(env, value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString(env.deps.i18n.locale);
  }
  function coreCorpseExplosionLine(env, reached, splash, label, noun) {
    const who = reached.length === 1 ? reached[0] : env.deps._t("적 {length}마리", { length: reached.length });
    return env.deps._t("💥 {label} {who}에게 {splash} {noun}", {
      label: env.deps.withDirectionParticle(label),
      who,
      splash: coreFormatNumberKR(env, splash),
      noun
    });
  }

  // modules/combat/clear-progression.mjs
  function clearEnsureLoopProgressCurrent(env) {
    env.owner.loopProgressCurrent = env.owner.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, cosmosPlanets: [] };
    return env.owner.loopProgressCurrent;
  }
  function clearRecordLoopBestFloor(env, key, floor) {
    const progress = clearEnsureLoopProgressCurrent(env);
    progress[key] = Math.max(Math.floor(progress[key] || 0), floor);
  }
  function clearNextBestZoneOr(env, zone, fallback) {
    let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
    return nextZone !== null ? nextZone : fallback;
  }
  function clearEnsureNextEndlessChaosDepthUnlocked(env, depth) {
    let clearedDepth = Math.max(1, Math.floor(depth || 1));
    if ((env.owner.season || 1) < 10 || clearedDepth < 20) return 0;
    env.owner.abyssUnlockedDepths = Array.isArray(env.owner.abyssUnlockedDepths) ? env.owner.abyssUnlockedDepths : [20];
    let nextDepth = Math.max(21, clearedDepth + 1);
    if (!env.owner.abyssUnlockedDepths.includes(nextDepth)) env.owner.abyssUnlockedDepths.push(nextDepth);
    env.owner.abyssUnlockedDepths = Array.from(new Set(env.owner.abyssUnlockedDepths.map((v) => Math.floor(v || 0)).filter((v) => v >= 20))).sort((a, b) => a - b);
    return nextDepth;
  }
  function clearResolveNextLoopBestPlusOneZone(env, zone) {
    clearEnsureLoopProgressCurrent(env);
    let currentLoopAbyssDepth = clearBestAbyssDepth(env, zone);
    if (clearCanResumeClimb(zone, "abyss") && currentLoopAbyssDepth >= 20) {
      return env.deps.getAutoProgressZoneId(env.deps.getAbyssZoneIdForDepth(Math.max(21, currentLoopAbyssDepth + 1)));
    }
    if (clearCanResumeClimb(zone, "labyrinth") && Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestLabyrinthFloor || 0)) >= 1) {
      env.owner.labyrinthFloor = Math.max(1, Math.floor(env.owner.loopProgressCurrent.bestLabyrinthFloor || 1) + 1);
      return env.deps.LABYRINTH_ZONE_ID;
    }
    if (clearCanResumeClimb(zone, "chaosRealm") && Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestChaosRealmFloor || 0)) >= 1) {
      return clearResumeChaosRealm(env);
    }
    return null;
  }
  function clearBestAbyssDepth(env, zone) {
    const currentDepth = zone && zone.type === "abyss" ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestAbyssDepth || 0), currentDepth);
  }
  function clearCanResumeClimb(zone, kind) {
    return zone && (zone.type === kind || zone.type === "meteor");
  }
  function clearResumeChaosRealm(env) {
    let st = env.deps.ensureChaosRealmState();
    st.currentFloor = Math.min(Math.max(1, Math.floor(st.highestFloor || 1)), Math.max(1, Math.floor(env.owner.loopProgressCurrent.bestChaosRealmFloor || 1) + 1));
    return env.deps.CHAOS_REALM_ZONE_ID;
  }

  // modules/combat/trial-completion.mjs
  function* clearGrantGuaranteedTrialSkillGem(env) {
    let skill = env.deps.pickSkillRuneReward(env.deps.gemDropRewards.attackRunes());
    env.deps.gemDropRewards.grant(env.owner, { kind: "attack", name: skill, awakened: false }, 0);
    yield { kind: "addLog", args: [env.deps._t("✨ 전직 시련 보상: 공격 룬 <span class='loot-magic'>[{skill}]</span> 획득!", { skill }), "loot-magic"] };
    return true;
  }
  function clearGetTrialSkillGemRewardChance(zone, isFirstClear) {
    if (isFirstClear) return 1;
    return Math.max(0, Math.min(1, Number(zone && zone.repeatGemChance) || 0));
  }
  function* clearFinishTrialEncounter(env, zone) {
    if (zone.bloomTrial) return yield* clearFinishBloomTrial(env, zone);
    let isFirstClear = !env.owner.completedTrials.includes(zone.id);
    if (isFirstClear) env.owner.completedTrials.push(zone.id);
    if (Math.random() < clearGetTrialSkillGemRewardChance(zone, isFirstClear)) yield* clearGrantGuaranteedTrialSkillGem(env);
    if (isFirstClear) yield* clearGrantTrialKeystonePoint(env);
    yield* clearGrantTrialAscendPoints(env, zone, isFirstClear);
    if (!env.owner.unlocks.traits) env.owner.unlocks.traits = true;
    env.owner.noti.traits = true;
    if (zone.id === "trial_1" && isFirstClear) {
      yield { kind: "queueTutorialNotice", args: ["unlock_first_ascend", env.deps._t("1차 전직"), env.deps._t("1차 전직 시련을 통과했습니다.\n‘스킬트리 → 전직’에서 전직을 고르고 전직 노드를 할당하세요."), "tab-traits"] };
    }
    yield { kind: "finishUnlocks", args: [] };
    if (zone.id !== "trial_4") {
      if (isFirstClear) yield { kind: "finishSay", args: [env.deps._t("👑 [{name}] 통과! 전직 포인트 2점 획득!", { name: env.deps._t(zone.name) }), "loot-unique"] };
      else yield { kind: "finishSay", args: [env.deps._t("🔁 [{name}] 재도전 완료 (전직 포인트 보상 없음)", { name: env.deps._t(zone.name) }), "attack-monster", { noToast: true }] };
    }
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.owner.inTicketBossFight = false;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* clearFinishBloomTrial(env, zone) {
    if (!env.owner.bloomBossDefeated) {
      yield { kind: "finishSay", args: [env.deps._t("❄️ 개화 미궁의 수호자를 아직 쓰러뜨리지 못했습니다. 전투를 다시 구성합니다."), "attack-monster", { noToast: true }] };
      env.deps.startEncounterRun();
      return;
    }
    env.deps.handleTalentBloomClear(zone);
  }
  function* clearGrantTrialKeystonePoint(env) {
    env.owner.ascendKeystonePoints = Math.max(0, Math.floor(env.owner.ascendKeystonePoints || 0)) + 1;
    yield { kind: "finishSay", args: [env.deps._t("💠 키스톤 포인트 +1 (현재 {ascendKeystonePoints})", { ascendKeystonePoints: env.owner.ascendKeystonePoints }), "loot-unique"] };
  }
  function* clearGrantTrialAscendPoints(env, zone, isFirstClear) {
    if (zone.id === "trial_4") {
      env.owner.ascendPoints += isFirstClear ? 1 : 0;
      if (isFirstClear) {
        env.owner.ascendRank = Math.max(env.owner.ascendRank || 0, 4);
        yield { kind: "finishSay", args: [env.deps._t("👑 [{name}] 통과! 4차 전직 핵심 노드 선택권 +1 획득!", { name: env.deps._t(zone.name) }), "loot-unique"] };
      }
      return;
    }
    if (isFirstClear) env.owner.ascendPoints += 2;
    env.owner.ascendRank = Math.max(env.owner.ascendRank || 0, zone.id === "trial_3" ? 3 : zone.id === "trial_2" ? 2 : 1);
  }

  // modules/combat/clear-travel.mjs
  function* clearContinueMapAfterClear(env, zone) {
    if (env.deps.isSkyTowerAtRewardLimit(zone)) {
      env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
      env.owner.moveTimer = 0;
      return;
    }
    if (env.owner.settings.mapCompleteAction === "stop") {
      env.owner.combatHalted = true;
      env.owner.moveTimer = 0;
      env.owner.enemies = [];
      env.owner.encounterPlan = [];
      env.owner.encounterIndex = 0;
      env.owner.runProgress = 0;
      return;
    }
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
  }
  function* clearDepartAfterZoneClear(env, zone, mapAction) {
    if (mapAction === "repeatZone") env.owner.currentZoneId = zone.id;
    else if (mapAction === "nextLoopBestPlusOne") {
      let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
      env.owner.currentZoneId = nextZone !== null ? nextZone : env.deps.getAutoProgressZoneId(Math.max(env.owner.currentZoneId, env.owner.maxZoneId));
    } else if (mapAction === "stop") {
      env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
      yield { kind: "finishRedraw", args: [] };
      yield { kind: "queueImportantSave", args: [180] };
      return;
    } else if (!env.deps.holdActRetreat(zone)) env.owner.currentZoneId = env.deps.getAutoProgressZoneId(Math.max(env.owner.currentZoneId, env.owner.maxZoneId));
    if (env.deps.actExplorationProgress.deferDeparture(env.owner)) {
      yield { kind: "finishUnlocks", args: [] };
      yield { kind: "finishRedraw", args: [] };
      yield { kind: "queueImportantSave", args: [220] };
      return;
    }
    env.deps.actExplorationProgress.reconcileDeparture(env.owner);
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    yield { kind: "finishUnlocks", args: [] };
    if ((env.owner.settings.townReturnAction || "retry") === "stop") {
      env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
    } else env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }

  // modules/combat/underworld-completion.mjs
  function* clearFinishUnderworldEncounter(env, zone, mapAction) {
    let { uw, floor } = clearAdvanceUnderworldFloor(env, zone, mapAction);
    if (!env.owner.underworldRunes || typeof env.owner.underworldRunes !== "object") env.owner.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] };
    yield* clearGrantUnderworldFloorMilestone(env, floor, uw);
    yield { kind: "finishSay", args: [env.deps._t("🕳️ 지하계 {floor}층 돌파! {highestFloor}층까지 하강 가능합니다.", { floor, highestFloor: uw.highestFloor }), "season-up"] };
    env.owner.killsInZone = 0;
    env.owner.currentZoneId = mapAction === "nextLoopBestPlusOne" ? clearNextBestZoneOr(env, zone, env.deps.UNDERWORLD_ZONE_ID) : env.deps.UNDERWORLD_ZONE_ID;
    yield* clearContinueMapAfterClear(env, zone);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }
  function clearAdvanceUnderworldFloor(env, zone, mapAction) {
    let uw = env.owner.underworldProgress && typeof env.owner.underworldProgress === "object" ? env.owner.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    env.owner.underworldProgress = uw;
    let floor = Math.max(1, Math.floor(zone.floor || uw.currentFloor || 1));
    env.owner.loopProgressCurrent.bestUnderworldFloor = Math.max(env.owner.loopProgressCurrent.bestUnderworldFloor || 0, floor);
    uw.highestFloor = Math.max(Math.floor(uw.highestFloor || 1), floor + 1);
    uw.currentFloor = ["repeatZone", "stop"].includes(mapAction) ? floor : Math.min(uw.highestFloor, floor + 1);
    if (floor >= 10) uw.floor10Cleared = true;
    return { uw, floor };
  }
  function* clearGrantUnderworldFloorMilestone(env, floor, progress) {
    const reward = env.deps.underworldMilestoneReward(floor);
    if (!reward) return;
    if (!reward.rune) return yield* clearGrantUnderworldDeepFloorReward(env, floor, progress);
    let runeState = env.owner.underworldRunes;
    let prevSlots = Math.max(0, Math.floor(runeState.unlockedSlots || 0));
    let prevMaxRuneNo = Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0));
    runeState.unlockedSlots = Math.min(6, Math.max(prevSlots, reward.slots));
    runeState.unlockedRunesMaxNumber = Math.min(30, Math.max(prevMaxRuneNo, reward.rune.no));
    const lines = [];
    if (runeState.unlockedRunesMaxNumber > prevMaxRuneNo) {
      runeState.obtainedRunes.push(reward.rune.no);
      lines.push(`${reward.rune.name} 지하석 1개`);
    }
    if (runeState.unlockedSlots > prevSlots) lines.push(`지하석 슬롯 ${runeState.unlockedSlots}/6`);
    if (lines.length) yield { kind: "dispatchRuntimeEvent", args: ["underworld-milestone", { floor, text: env.deps._t("🧿 지하계 {floor}층 보상: {lines}", { floor, lines: lines.join(", ") }) }] };
  }
  function* clearGrantUnderworldDeepFloorReward(env, floor, progress) {
    const reward = env.deps.underworldMilestoneReward(floor);
    const paid = Math.max(env.deps.UNDERWORLD_DEEP_FLOOR_REWARD.fromFloor, Math.floor(Number(progress.deepRewardFloor) || 0));
    if (!reward || floor <= paid) return;
    progress.deepRewardFloor = floor;
    const { runeShard: shards, underGold: gold } = reward.currencies;
    env.deps.awardCurrency("runeShard", shards);
    env.deps.awardCurrency("underGold", gold);
    yield { kind: "dispatchRuntimeEvent", args: ["underworld-milestone", { floor, text: env.deps._t("🧿 지하계 {floor}층 보상: 지하석 조각 {shards}, 금 {gold}", { floor, shards, gold }) }] };
  }

  // modules/combat/boundary-payouts.mjs
  function clearGetBeyondBoundaryCompletionRewardContext(env, result) {
    let focus = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find((row) => row.id === result.rewardFocusId) || env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    if (!env.deps.getBeyondBoundaryRewardFocusStatus(focus.id).available) {
      focus = env.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    }
    let intensity = env.deps.BEYOND_BOUNDARY_INTENSITY_DB.find((row) => row.id === result.intensityId) || env.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
    let tier = Math.max(1, Math.floor(Number(result.tier) || 1));
    let liveZone = env.deps.getZone(env.deps.BEYOND_BOUNDARY_ZONE_ID) || {};
    let zone = {
      ...liveZone,
      tier: env.deps.getUnderworldTier(30) + Math.floor((tier - 1) / 2),
      boundaryTier: tier,
      name: env.deps._t("경계 너머 {tier}단계 완료 보상", { tier })
    };
    return { focus, intensity, tier, zone, rewardChanged: focus.id !== result.rewardFocusId };
  }
  function clearRollBeyondBoundaryRewardCount(rewardMul) {
    let multiplier = Math.max(1, Number(rewardMul) || 1);
    return 1 + (Math.random() < Math.min(0.9, multiplier - 1) ? 1 : 0);
  }
  function* clearGrantBeyondBoundaryEquipmentRewards(env, context) {
    if (context.rewardChanged) yield { kind: "addLog", args: [env.deps._t("선택한 보상이 잠겨 있어 이번 도전 보상을 장비로 지급합니다."), "loot-rare"] };
    let count = clearRollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let names = [];
    for (let index = 0; index < count; index++) {
      let item = env.deps.generateEquipmentDrop({ isBoss: true }, { minimumRarity: "rare", zone: context.zone });
      if (!item || !env.deps.addItemToInventory(item, { guaranteedKeep: true })) continue;
      names.push(item.name);
      yield { kind: "addLog", args: [env.deps._t("경계 완료 보상: [{name}]", { name: env.deps._t(item.name) }), "loot-rare", { item }] };
    }
    return env.deps._t("{length}개의 희귀 이상 장비", { length: names.length });
  }
  function* clearGrantBeyondBoundaryJewelRewards(env, context) {
    let count = clearRollBeyondBoundaryRewardCount(context.intensity.rewardMul);
    let stored = 0;
    for (let index = 0; index < count; index++) {
      let jewel = env.deps.generateJewelDrop(context.zone);
      if (!env.deps.bagItems.put(env.deps.bagItems.asJewel(jewel))) {
        env.deps.salvageJewelObject(jewel, true);
        continue;
      }
      stored++;
      yield { kind: "addLog", args: [env.deps._t("경계 완료 보상: [{name}]", { name: env.deps._t(jewel.name) }), "loot-rare", { item: jewel, itemKind: "jewel" }] };
    }
    let shards = Math.max(1, Math.round((3 + env.deps.getBeyondBoundaryPayoutTier(context.tier) / 5) * context.intensity.rewardMul));
    env.deps.awardCurrency("jewelShard", shards);
    return env.deps._t("주얼 {stored}개, 주얼 결정 {shards}개", { stored, shards });
  }
  function clearGrantBeyondBoundaryGemRewards(env, context) {
    let amount = Math.max(1, Math.round((3 + env.deps.getBeyondBoundaryPayoutTier(context.tier) / 10) * context.intensity.rewardMul));
    env.deps.awardCurrency("awakenedEcho", amount);
    return env.deps._t("각성 잔향 {amount}개", { amount });
  }
  function clearGrantBeyondBoundaryCurrencyRewards(env, context) {
    let tier = env.deps.getBeyondBoundaryPayoutTier(context.tier);
    let multiplier = context.intensity.rewardMul;
    let buds = Math.max(1, Math.round((3 + tier / 10) * multiplier));
    let dew = Math.max(1, Math.round((2 + tier / 20) * multiplier));
    let sap = tier >= 10 ? 1 + Math.floor(tier / 50) : 0;
    env.deps.awardCurrency("magicBud", buds);
    env.deps.awardCurrency("formlessDew", dew);
    if (sap > 0) env.deps.awardCurrency("sapBud", sap);
    return `마법의 새싹 ${buds}개, 형체 없는 이슬 ${dew}개${sap ? env.deps._t(", 수액 새싹 {sap}개", { sap }) : ""}`;
  }
  function* clearGrantBeyondBoundaryFocusedReward(env, result) {
    let context = clearGetBeyondBoundaryCompletionRewardContext(env, result);
    let summary = context.focus.id === "armory" ? yield* clearGrantBeyondBoundaryEquipmentRewards(env, context) : context.focus.id === "jewel" ? yield* clearGrantBeyondBoundaryJewelRewards(env, context) : context.focus.id === "gem" ? clearGrantBeyondBoundaryGemRewards(env, context) : clearGrantBeyondBoundaryCurrencyRewards(env, context);
    return { focusId: context.focus.id, intensityId: context.intensity.id, summary };
  }

  // modules/combat/boundary-completion.mjs
  function* clearFinishBeyondBoundaryEncounter(env, zone, mapAction) {
    let result = env.deps.completeBeyondBoundaryEncounter(env.owner);
    if (!result.ok) return;
    env.owner.killsInZone = 0;
    if (!result.completed) {
      yield { kind: "finishSay", args: [env.deps._t("경계 너머 {tier}단계, {wave}/{BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER} 조우로 전진합니다.", { tier: result.tier, wave: result.wave, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER: env.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER }), "season-up"] };
      env.deps.startMoving(false);
    } else yield* clearFinishBeyondBoundaryTier(env, result, mapAction);
    yield { kind: "finishUnlocks", args: [] };
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [180] };
  }
  function* clearFinishBeyondBoundaryTier(env, result, mapAction) {
    let seal = env.deps.BEYOND_BOUNDARY_SEAL_DB.find((row) => row.id === result.sealId);
    let levelText = result.sealResult.levelsGained > 0 ? env.deps._t(", 인장 {level}레벨", { level: result.sealResult.level }) : "";
    let focusedReward = yield* clearGrantBeyondBoundaryFocusedReward(env, result);
    let sealMaxed = !!seal && result.sealResult.levelsGained === 0 && result.sealResult.level >= seal.maxLevel;
    let sealText = sealMaxed ? env.deps._t("{name} 최대 레벨(경험치 없음)", { name: seal.name }) : env.deps._t("{value} 경험치 +{rewardXp}{levelText}", { value: seal ? seal.name : env.deps._t("경계 인장"), rewardXp: result.rewardXp, levelText });
    yield { kind: "finishSay", args: [env.deps._t("경계 너머 {tier}단계 돌파, {sealText}, {summary}", { tier: result.tier, sealText, summary: focusedReward.summary }), "loot-unique"] };
    env.owner.currentZoneId = result.returnZoneId !== null && result.returnZoneId !== void 0 ? result.returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    if (mapAction === "stop") {
      env.deps.actExplorationProgress.depart(env.owner);
      env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
      env.deps.prepareActExplorationArrival();
    } else env.deps.startMoving(false);
  }

  // modules/combat/special-completion.mjs
  function* clearFinishMeteorEncounter(env) {
    env.deps.grantMeteorEncounterRewards();
    let st = env.deps.ensureMeteorSiteState();
    st.entriesCleared = (st.entriesCleared || 0) + 1;
    st.activeMeteorTier = null;
    st.kind = null;
    env.deps.clearWoodsmanBuildLock();
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    env.owner.currentZoneId = returnZoneId !== void 0 && returnZoneId !== null ? returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* clearFinishOutsideChaosEncounter(env, zone) {
    env.deps.addWoodsmanPendingScore(1e6);
    let realm = env.deps.ensureChaosRealmState();
    realm.woodsmanBestDamagePct = 100;
    env.deps.unlockJournalEntry("woodsman_echo");
    env.deps.maybeUnlockChaosRealmFromWoodsman({ isBoss: true, hp: 0, maxHp: 1 }, { finalize: true });
    env.deps.markLoopSpecialBossKill("woodsman_true");
    yield { kind: "finishSay", args: [env.deps._t("🪓 나무꾼을 쓰러뜨렸습니다. 다음 경계가 열립니다."), "loot-unique"] };
    env.deps.clearWoodsmanBuildLock();
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }

  // modules/combat/ocean-completion.mjs
  function* clearFinishOceanEncounter(env, zone) {
    let oceanSt = env.deps.ensureOceanState();
    if (oceanSt.unlocked && oceanSt.diving) yield* clearAdvanceOceanAfterClear(env, zone, oceanSt);
    env.owner.currentZoneId = env.deps.OCEAN_ZONE_ID;
    env.owner.killsInZone = 0;
    env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* clearAdvanceOceanAfterClear(env, zone, oceanSt) {
    if (!env.owner.oceanBossRunPending) return env.deps.advanceOceanDiveFromKill(zone);
    let pendingBoundary = env.deps.getOceanPendingBossBoundary(oceanSt);
    if (pendingBoundary > 0) {
      oceanSt.bossClearM = pendingBoundary;
      oceanSt.pressureLevel = env.deps.getOceanDepthTier(oceanSt.depthM);
      env.deps.awardCurrency("reefFragment", 3);
      yield { kind: "finishSay", args: [env.deps._t("🌊 수심 {pendingBoundary}m의 심해 가디언을 처치했습니다! 더 깊은 곳으로 길이 열립니다. (암초 조각 +3)", { pendingBoundary }), "loot-unique"] };
      if (pendingBoundary >= 500) env.deps.unlockJournalEntry("ocean_500");
    }
    env.owner.oceanBossRunPending = false;
  }

  // modules/combat/chaos-realm-completion.mjs
  function* clearFinishChaosRealmEncounter(env, zone, mapAction) {
    let st = env.deps.ensureChaosRealmState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    clearRecordLoopBestFloor(env, "bestChaosRealmFloor", floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    if (firstClear) {
      st.clearedFloors.push(floor);
      st.clearedFloors.sort((a, b) => a - b);
      env.deps.grantChaosRealmFloorBonus(floor);
    }
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ["repeatZone", "stop"].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    yield { kind: "finishSay", args: [env.deps._t("🌌 혼돈계 {floor}층 돌파!", { floor }), "season-up"] };
    env.owner.currentZoneId = mapAction === "nextLoopBestPlusOne" ? clearNextBestZoneOr(env, zone, env.deps.CHAOS_REALM_ZONE_ID) : env.deps.CHAOS_REALM_ZONE_ID;
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }

  // modules/combat/tower-completion.mjs
  function* clearFinishSkyTowerEncounter(env, zone, mapAction) {
    let st = env.deps.ensureSkyTowerState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    let remainingBefore = env.deps.getSkyTowerRemainingClears();
    const kind = remainingBefore === 0 ? "practice" : st.clearedFloors.includes(floor) ? "repeat" : "first";
    const reward = remainingBefore > 0 ? yield* clearClearSkyTowerFloor(env, st, floor, mapAction) : 0;
    if (remainingBefore === 0) yield { kind: "finishSay", args: [env.deps._t("☁️ 창공의 탑 {floor}층 연습 완료.", { floor }), "season-up"] };
    st.lastResult = { season: env.owner.season, floor, kind, condensedPower: reward };
    env.owner.killsInZone = 0;
    env.owner.currentZoneId = env.deps.SKY_TOWER_ZONE_ID;
    yield* clearContinueMapAfterClear(env, zone);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }
  function* clearClearSkyTowerFloor(env, st, floor, mapAction) {
    env.owner.loopProgressCurrent.bestSkyFloor = Math.max(env.owner.loopProgressCurrent.bestSkyFloor || 0, floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    let reward = firstClear ? clearFirstSkyTowerClear(env, st, floor, mapAction) : clearRepeatSkyTowerClear(env, st, floor, mapAction);
    if (reward > 0) st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + reward;
    st.clearedThisLoop = Math.min(env.deps.getSkyTowerLoopClearLimit(), Math.max(0, Math.floor(st.clearedThisLoop || 0)) + 1);
    let rewardText = firstClear ? env.deps._t("최초 클리어 보상: 응축된 창공의 정수 +{reward}", { reward }) : reward > 0 ? env.deps._t("반복 클리어 보상: 응축된 창공의 정수 +{reward}", { reward }) : "반복 클리어: 응축된 창공의 정수 미발견";
    yield { kind: "finishSay", args: [env.deps._t("☁️ 창공의 탑 {floor}층 돌파! {rewardText}, 이번 루프 잔여 클리어 {skyTowerRemainingClears}/{skyTowerLoopClearLimit}", { floor, rewardText, skyTowerRemainingClears: env.deps.getSkyTowerRemainingClears(), skyTowerLoopClearLimit: env.deps.getSkyTowerLoopClearLimit() }), reward > 0 ? "loot-unique" : "season-up"] };
    return reward;
  }
  function clearFirstSkyTowerClear(env, st, floor, mapAction) {
    let reward = env.deps.getSkyTowerRewardAmount(floor);
    st.clearedFloors.push(floor);
    st.clearedFloors = Array.from(new Set(st.clearedFloors.map((v) => Math.floor(v || 0)).filter((v) => v >= 1))).sort((a, b) => a - b);
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ["repeatZone", "stop"].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    if (floor >= 10) env.deps.unlockJournalEntry("sky_tower_10");
    return reward;
  }
  function clearRepeatSkyTowerClear(env, st, floor, mapAction) {
    let reward = 0;
    if (Math.random() < 0.16) reward = Math.max(1, Math.floor(env.deps.getSkyTowerRewardAmount(floor) * 0.35));
    const highest = Math.max(1, Math.floor(st.highestFloor || 1));
    st.currentFloor = Math.max(1, Math.min(highest, ["repeatZone", "stop"].includes(mapAction) ? floor : floor + 1));
    return reward;
  }

  // modules/combat/time-rift-completion.mjs
  function* clearFinishTimeRiftEncounter(env, zone) {
    let rift = env.deps.ensureTimeRiftState();
    if (zone.riftPhase === "past") {
      rift.altarOpen = true;
      yield { kind: "finishSay", args: [env.deps._t("⏳ 과거의 제단이 열렸습니다. (시간압 {pressure}) 시간의 균열에서 장비를 골라 같은 부위의 고유 1개/희귀 1개를 올리세요.", { pressure: zone.pressure }), "loot-unique"] };
    } else yield* clearFinishTimeRiftFusion(env, rift);
    rift.activePressure = null;
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }
  function* clearFinishTimeRiftFusion(env, rift) {
    let fusion = typeof env.deps.resolveTimeRiftFusion === "function" ? env.deps.resolveTimeRiftFusion() : null;
    if (!fusion) return;
    rift.fusionCount = Math.max(0, Math.floor(rift.fusionCount || 0)) + 1;
    env.deps.unlockJournalEntry("time_rift_fusion");
    let gradeLabel = fusion.grade === "perfect" ? "완벽한 융합" : fusion.grade === "normal" ? "보통 융합" : "불안정한 융합";
    yield { kind: "finishSay", args: [env.deps._t("⌛ {grade}! [{name}]{particle} 억겁의 시간을 건너 돌아왔습니다. (계승한 추가 옵션 {inherited}개{lost})", { grade: gradeLabel, name: env.deps._t(fusion.fused.name), particle: env.deps.pickParticle(fusion.fused.name, "이", "가"), inherited: fusion.inherited, lost: fusion.lost > 0 ? `, ${env.deps._t("{n}개 유실", { n: fusion.lost })}` : `, ${env.deps._t("유실 없음")}` }), "loot-unique"] };
  }

  // modules/combat/pinnacle-payouts.mjs
  function* clearGrantPinnacleSignatureUnique(env, zone, firstClear) {
    const definition = env.deps.UNIQUE_DB.find((unique) => unique.name === zone.signatureUnique);
    const repeatChance = definition && definition.dropOnly ? Number(definition.dropOnly.bossDropChance) || 0 : 0;
    if (!definition || Math.random() >= (firstClear ? 1 : repeatChance)) return null;
    const item = env.deps.generateUniqueItem(definition.reqTier, null, definition.name);
    if (env.deps.addItemToInventory(item, { guaranteedKeep: true })) yield { kind: "finishSay", args: [env.deps._t("👑 [{name}] 획득!", { name: item.name }), "loot-unique", { item }] };
    return item;
  }
  function* clearGrantMilestonePinnacleClearRewards(env, zone, firstClear) {
    if (!zone || !zone.milestonePinnacle) return;
    if (zone.journalId && firstClear && typeof env.deps.unlockJournalEntry === "function") env.deps.unlockJournalEntry(zone.journalId);
    yield* clearGrantPinnacleSignatureUnique(env, zone, firstClear);
    if (!firstClear) {
      yield { kind: "addLog", args: [env.deps._t("♜ [{name}] 재도전 완료, 최초 격파 보상은 이미 획득했습니다.", { name: env.deps._t(zone.name) }), "season-up"] };
      return;
    }
    const rewardText = clearPinnacleFirstCurrency(env, zone);
    const prefix = zone.pinnacleCapstone ? "👁️ 모든 경계의 관측을 끝냈습니다." : "♜ 새로운 최종 관문을 정복했습니다.";
    yield { kind: "addLog", args: [env.deps._t("{prefix} [{name}] 최초 격파{rewardText}", { prefix, name: env.deps._t(zone.name), rewardText }), "loot-unique"] };
  }
  function clearPinnacleFirstCurrency(env, zone) {
    const reward = zone.firstClearReward && typeof zone.firstClearReward === "object" ? zone.firstClearReward : null;
    if (!reward) return "";
    const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
    if (reward.key && amount > 0) env.deps.awardCurrency(reward.key, amount);
    const rewardName = env.deps.ORB_DB[reward.key] ? env.deps._t(env.deps.ORB_DB[reward.key].name) : "";
    return rewardName ? `, ${rewardName} +${amount}` : "";
  }
  function* clearGrantSeasonBossRewards(env, zone, firstRootBossClear) {
    if (zone.milestonePinnacle) return yield* clearGrantMilestonePinnacleClearRewards(env, zone, firstRootBossClear);
    if (zone.cosmosCapstone) return yield* clearGrantCosmosCapstoneRewards(env, zone, firstRootBossClear);
    let grantsClearCurrency = zone.capstoneRival ? firstRootBossClear : Math.random() < 0.5;
    if (grantsClearCurrency) env.deps.awardCurrency(zone.reward || "bossCore", 1, "drop");
    if (Math.random() < env.deps.ROOT_BOSS_UNIQUE_RULES.chance) {
      let bossUnique = env.deps.generateUniqueItem(zone.tier || 12, null, clearPickRootBossUniqueName(env, zone));
      env.deps.addItemToInventory(bossUnique);
      yield { kind: "finishSay", args: [env.deps._t("👑 [{name}] 획득!", { name: env.deps._t(bossUnique.name) }), "loot-unique", { item: bossUnique }] };
    }
  }
  function clearPickRootBossUniqueName(env, zone) {
    return zone.signatureUnique && Math.random() < env.deps.ROOT_BOSS_UNIQUE_RULES.signatureShare ? zone.signatureUnique : null;
  }
  function* clearGrantCosmosCapstoneRewards(env, zone, firstRootBossClear) {
    if (zone.journalId && firstRootBossClear && typeof env.deps.unlockJournalEntry === "function") env.deps.unlockJournalEntry(zone.journalId);
    yield { kind: "finishSay", args: [env.deps._t("🌌 잔향체가 흩어졌습니다. 다섯 별의 메아리가 마침내 잠잠해집니다."), "loot-unique"] };
    env.deps.awardCurrency(zone.reward || "goldenRule", 2, "drop");
    yield* clearRollCosmosAstraUniqueDrop(env, zone);
  }
  function* clearRollCosmosAstraUniqueDrop(env, zone, randomFn) {
    if (!zone || !zone.cosmosCapstone) return null;
    const definition = env.deps.UNIQUE_DB.find((unique) => unique && unique.dropOnly && unique.dropOnly.id === zone.id && Number.isFinite(Number(unique.dropOnly.bossDropChance)));
    if (!definition) return null;
    const chance = Math.max(0, Math.min(1, Number(definition.dropOnly.bossDropChance)));
    const roll = typeof randomFn === "function" ? randomFn : Math.random;
    if (roll() >= chance) return null;
    const item = env.deps.generateUniqueItem(zone.tier || definition.reqTier || 1, null, definition.name);
    if (!item || !env.deps.addItemToInventory(item, { guaranteedKeep: true })) return null;
    yield { kind: "addLog", args: [env.deps._t("👑 [{name}] 획득!", { name: env.deps._t(item.name) }), "loot-unique", { item }] };
    return item;
  }

  // modules/combat/season-boss-completion.mjs
  function* clearFinishSeasonBossEncounter(env, zone) {
    let firstRootBossClear = !(env.owner.clearedRootBosses || []).includes(zone.id);
    env.owner.clearedRootBosses = Array.isArray(env.owner.clearedRootBosses) ? env.owner.clearedRootBosses : [];
    if (firstRootBossClear) env.owner.clearedRootBosses.push(zone.id);
    if (zone.rivalBlade) yield* clearNoteRivalBladeKill(env, zone, firstRootBossClear);
    yield* clearGrantSeasonBossRewards(env, zone, firstRootBossClear);
    yield { kind: "finishSay", args: [env.deps._t("🗝️ [{name}] 토벌 완료!", { name: env.deps._t(zone.name) }), "loot-unique"] };
    yield* clearDepartSeasonBoss(env, zone);
    yield { kind: "finishUnlocks", args: [] };
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* clearNoteRivalBladeKill(env, zone, firstRootBossClear) {
    env.deps.markLoopSpecialBossKill(zone.id);
    if (zone.journalId && firstRootBossClear && typeof env.deps.unlockJournalEntry === "function") env.deps.unlockJournalEntry(zone.journalId);
    if (zone.capstoneRival) return yield { kind: "finishSay", args: [env.deps._t("🗡️ 완성작이 무릎 꿇었습니다. 버려진 날이 벼려진 날을 이겼습니다."), "loot-unique"] };
    let killedRivals = env.owner.loopProgressCurrent && Array.isArray(env.owner.loopProgressCurrent.specialBosses) ? env.owner.loopProgressCurrent.specialBosses : [];
    let remaining = env.deps.SEASON_BOSS_ZONES.filter((rival) => rival.rivalBlade && !rival.capstoneRival && !killedRivals.includes(rival.id)).length;
    if (remaining > 0) yield { kind: "finishSay", args: [env.deps._t("🗡️ 버려진 날 격파! 이번 루프에 남은 날: {remaining}개 (모두 꺾으면 「완성작」이 나타납니다)", { remaining }), "season-up"] };
    else yield { kind: "finishSay", args: [env.deps._t("🗡️ 다섯 날이 모두 꺾였습니다. 「일곱 번째 날 - 완성작」이 결투를 기다립니다."), "loot-unique"] };
  }
  function* clearDepartSeasonBoss(env, zone) {
    let shouldRepeat = !!env.owner.autoRepeatSeasonBoss && !zone.milestonePinnacle;
    let keyLeft = zone.key ? env.owner.currencies[zone.key] || 0 : 0;
    if (shouldRepeat && keyLeft > 0) {
      env.owner.currencies[zone.key]--;
      env.owner.currentZoneId = zone.id;
      env.owner.killsInZone = 0;
      env.owner.inTicketBossFight = true;
      yield { kind: "finishSay", args: [env.deps._t("🔁 입장권 1개 소모, [{name}] 자동 재도전 시작! (남은 열쇠 {value})", { name: env.deps._t(zone.name), value: env.owner.currencies[zone.key] || 0 }), "season-up"] };
      env.deps.startMoving(true);
      return;
    }
    if (shouldRepeat && keyLeft <= 0) yield { kind: "finishSay", args: [env.deps._t("🔁 반복 도전이 켜져 있지만 입장권이 없어 자동 재도전을 중단합니다."), "attack-monster"] };
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.owner.inTicketBossFight = false;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
  }

  // modules/data/clear-values.mjs
  var LABYRINTH_FOSSIL_NOTE_NAMES = /* @__PURE__ */ Object.freeze({ fossil: "기본 화석", fossilPrimal: "원시 화석", fossilAncientPrimal: "원시 고대 화석" });
  var ACT_CLEAR_JOURNAL_ENTRIES = /* @__PURE__ */ new Map(["act_1", "act_2", "act_3", "act_4", "act_5", "act_6", "act_7", "act_8", "act_9", "act_10"].map((entry, id) => [id, entry]));

  // modules/combat/labyrinth-completion.mjs
  function* clearFinishLabyrinthEncounter(env, zone, mapAction) {
    let clearedFloor = Math.max(1, Math.floor(env.owner.labyrinthFloor || zone.floor || 1));
    const currenciesBefore = { ...env.owner.currencies };
    if (clearedFloor >= 10) env.deps.unlockJournalEntry("labyrinth_10");
    clearRecordLoopBestFloor(env, "bestLabyrinthFloor", clearedFloor);
    env.owner.labyrinthUnlockedMaxFloor = Math.max(env.owner.labyrinthUnlockedMaxFloor || 1, clearedFloor + 1);
    env.owner.labyrinthFloor = ["repeatZone", "stop"].includes(mapAction) ? clearedFloor : clearedFloor + 1;
    clearRollLabyrinthSealShards(env, clearedFloor);
    env.owner.labyrinthLastResult = clearLabyrinthFloorResult(env, clearedFloor, currenciesBefore);
    yield { kind: "finishSay", args: [env.deps._t("🏛️ 미궁 {clearedFloor}층 돌파!{fossilSummary}", { clearedFloor, fossilSummary: clearLabyrinthFossilNote(env, env.owner.labyrinthLastResult.currencies) }), "season-up"] };
    if (mapAction === "nextLoopBestPlusOne") {
      let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
      if (nextZone !== null) env.owner.currentZoneId = nextZone;
    }
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function clearLabyrinthFloorResult(env, clearedFloor, before) {
    const last = env.owner.labyrinthLastResult, dropped = last?.pending && last.season === env.owner.season && last.floor === clearedFloor ? last.currencies : {};
    const currencies = { ...dropped };
    for (const key of Object.keys(env.deps.ORB_DB)) {
      const gain = (env.owner.currencies[key] || 0) - (before[key] || 0);
      if (gain > 0) currencies[key] = (currencies[key] || 0) + gain;
    }
    return { season: env.owner.season, floor: clearedFloor, pending: false, currencies };
  }
  function clearLabyrinthFossilNote(env, currencies) {
    const typedName = (key) => env.deps.FOSSIL_DB.find((fossil) => fossil.key === key && !fossil.ancientPrimalOnly)?.name;
    const found = Object.keys(currencies).map((key) => LABYRINTH_FOSSIL_NOTE_NAMES[key] || typedName(key)).filter(Boolean).map((name) => `${env.deps._t(name)} +1`);
    if (!found.length && !env.deps.contentProgression.isUnlocked("fossil")) return "";
    return ` [${found.join(" / ") || env.deps._t("화석 없음")}]`;
  }
  function clearRollLabyrinthSealShards(env, clearedFloor) {
    if ((env.owner.season || 1) < 6) return;
    if (Math.random() < 0.025) env.deps.awardCurrency("sealShard", 1, "drop");
    if (Math.random() < 75e-4) env.deps.awardCurrency("strongSealShard", 1, "drop");
    if (clearedFloor >= 30 && Math.random() < 16e-4) env.deps.awardCurrency("radiantSealShard", 1, "drop");
  }

  // modules/combat/cosmos-completion.mjs
  function* clearFinishCosmosEncounter(env, zone, mapAction) {
    const atlas = env.deps.cosmosAtlas;
    if (atlas) yield* atlas.rewards.exploreSelectedCosmosNode(zone.cosmosNodeId || null);
    if (atlas && (yield* atlas.encounters.continueCosmosChallengeAfterClear(mapAction))) {
      yield { kind: "finishRedraw", args: [] };
      yield { kind: "queueImportantSave", args: [200] };
      return;
    }
    if (env.owner.cosmosAtlas && typeof env.owner.cosmosAtlas === "object") env.owner.cosmosAtlas.activeChallenge = null;
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    if (mapAction === "stop") env.owner.combatHalted = true;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    if (mapAction !== "stop") env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }

  // modules/combat/zone-completion.mjs
  function* clearFinishZoneClear(env, zone, mapAction) {
    if (zone.type === "abyss") yield* clearMarkChaosDepthClear(env, zone);
    if (zone.type === "act") yield* clearMarkActZoneClear(env, zone);
    if (clearIsSeasonFinalZoneClear(env, zone)) return yield* clearFinishSeasonFinalZone(env, zone, mapAction);
    if (zone.type === "abyss" && !env.owner.unlockedTrials.includes("trial_3")) yield* clearUnlockTrial3FromChaos(env, zone);
    yield* clearUnlockNextZoneAfterClear(env, zone);
    env.owner.killsInZone = 0;
    clearNoteBestChaosDepth(env, zone, clearEnsureLoopProgressCurrent(env));
    if (env.owner.beehive && env.owner.beehive.inRun) mapAction = "repeatZone";
    yield* clearDepartAfterZoneClear(env, zone, mapAction);
  }
  function clearNoteBestChaosDepth(env, zone, progress) {
    if (zone.type !== "abyss") return;
    let d = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    if (d >= 20) progress.bestAbyssDepth = Math.max(Math.floor(progress.bestAbyssDepth || 0), d);
  }
  function* clearMarkChaosDepthClear(env, zone) {
    let depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    if (depth === 5 && !env.owner.woodsmanSimulatorSeenLoop) {
      env.owner.woodsmanSimulatorSeenLoop = true;
      env.owner.chaosInfuserUnlocked = true;
      env.deps.unlockJournalEntry("woodsman");
      yield { kind: "queueTutorialNotice", args: ["woodsman_simulator_loop", env.deps._t("나무꾼의 시뮬레이터"), env.deps._t("“다음은 더 나은 세계를 바라지.”\n정체를 드러낸 존재는 진짜 나무꾼이 아닌 시뮬레이터였다.\n더 깊은 혼돈을 돌파해야 루프가 열린다."), "tab-season"] };
    }
    let capDepth = 20;
    env.owner.abyssClearedDepths = Array.isArray(env.owner.abyssClearedDepths) ? env.owner.abyssClearedDepths : [];
    if (depth <= capDepth && !env.owner.abyssClearedDepths.includes(depth)) {
      env.owner.abyssClearedDepths.push(depth);
    }
    clearEnsureNextEndlessChaosDepthUnlocked(env, depth);
    if (depth >= 20) {
      clearEnsureLoopProgressCurrent(env).chaos20Cleared = true;
      killOnChaos20Cleared(env);
    }
  }
  function* clearMarkActZoneClear(env, zone) {
    if (zone.id <= 9) env.deps.markActRewardReady(zone.id);
    env.deps.worldTreeBark.noteActTenClear(zone);
    if (typeof env.deps.recordActClear === "function") env.deps.recordActClear(zone.id);
    yield* clearSayActClearStory(env, zone);
    const journalEntry = ACT_CLEAR_JOURNAL_ENTRIES.get(zone.id);
    if (journalEntry) env.deps.unlockJournalEntry(journalEntry);
    if (zone.id === 2) yield { kind: "finishSyncOpened", args: [] };
    if (zone.id === 9 && Math.max(0, Math.floor(env.owner.loopDeaths || 0)) <= 0) env.deps.unlockJournalEntry("immortal");
  }
  function* clearSayActClearStory(env, zone) {
    if (zone.id < env.owner.maxZoneId) return;
    let storyAct = env.deps.getStoryActByZoneId(zone.id);
    if (storyAct && storyAct.clearText) yield { kind: "finishSay", args: [`📜 ${storyAct.clearText}`, "season-up"] };
  }
  function clearIsSeasonFinalZoneClear(env, zone) {
    let clearedAbyssDepth = zone.type === "abyss" ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return zone.id === env.deps.getCurrentSeasonFinalZoneId() || zone.type === "abyss" && clearedAbyssDepth >= env.deps.getSeasonAbyssDepthCap(env.owner.season || 1);
  }
  function* clearFinishSeasonFinalZone(env, zone, mapAction) {
    if ((env.owner.season || 1) >= 10 && zone.type === "abyss") return yield* clearFinishEndlessChaosClear(env, zone, mapAction);
    env.deps.handleSeasonLoopConditionMet();
  }
  function* clearFinishEndlessChaosClear(env, zone, mapAction) {
    let depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    env.owner.abyssUnlockedDepths = Array.isArray(env.owner.abyssUnlockedDepths) ? env.owner.abyssUnlockedDepths : [20];
    let nowEndless = Math.max(20, depth);
    clearEnsureNextEndlessChaosDepthUnlocked(env, nowEndless);
    env.owner.abyssEndlessDepth = nowEndless;
    let hadCurrentSeasonLoopRequirementBeforeClear = clearRecordEndlessChaosClear(env, depth);
    if (mapAction === "repeatZone") return yield* clearRepeatEndlessChaosDepth(env, zone);
    if (mapAction === "nextLoopBestPlusOne" || depth >= 21 && hadCurrentSeasonLoopRequirementBeforeClear) {
      env.deps.enterNextEndlessChaosDepth(zone);
      return;
    }
    env.deps.handleSeasonLoopConditionMet();
  }
  function clearRecordEndlessChaosClear(env, depth) {
    const progress = clearEnsureLoopProgressCurrent(env);
    let seasonAbyssCap = env.deps.getSeasonAbyssDepthCap(env.owner.season || 1);
    let bestAbyssDepthBeforeClear = Math.max(0, Math.floor(progress.bestAbyssDepth || 0));
    let hadCurrentSeasonLoopRequirementBeforeClear = seasonAbyssCap <= 20 ? typeof env.deps.hasCurrentLoopChaos20Clear === "function" ? env.deps.hasCurrentLoopChaos20Clear() : !!progress.chaos20Cleared : bestAbyssDepthBeforeClear >= seasonAbyssCap;
    if (depth >= 20) progress.bestAbyssDepth = Math.max(bestAbyssDepthBeforeClear, depth);
    progress.chaos20Cleared = true;
    killOnChaos20Cleared(env);
    return hadCurrentSeasonLoopRequirementBeforeClear;
  }
  function* clearRepeatEndlessChaosDepth(env, zone) {
    env.owner.currentZoneId = zone.id;
    env.owner.killsInZone = 0;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    yield { kind: "finishUnlocks", args: [] };
    if ((env.owner.settings.townReturnAction || "retry") === "stop") {
      env.owner.combatHalted = true;
      env.owner.enemies = [];
      env.owner.encounterPlan = [];
      env.owner.encounterIndex = 0;
      env.owner.runProgress = 0;
    } else env.deps.startMoving(false);
    yield { kind: "finishRedraw", args: [] };
    yield { kind: "queueImportantSave", args: [220] };
  }
  function* clearUnlockTrial3FromChaos(env, zone) {
    let shouldUnlockTrial3 = zone.name === "혼돈 5" || Math.random() < 0.15;
    if (!shouldUnlockTrial3) return;
    env.owner.unlockedTrials.push("trial_3");
    env.owner.noti.map = true;
    yield { kind: "finishSay", args: [zone.name === "혼돈 5" ? "✨ [시련의 증표] 혼돈 5 보스 확정 드랍! 3차 전직 시련 개방!" : "✨ [시련의 증표] 획득! 3차 전직 시련 개방!", "loot-unique"] };
  }
  function* clearUnlockNextZoneAfterClear(env, zone) {
    let targetUnlockZone = Math.min(env.deps.getCurrentSeasonFinalZoneId(), zone.id + 1);
    let clearedAtFrontier = zone.id >= env.owner.maxZoneId;
    if (!(clearedAtFrontier && env.owner.maxZoneId < targetUnlockZone)) return;
    env.owner.maxZoneId = targetUnlockZone;
    if (typeof env.deps.npcShop === "object") env.deps.npcShop.syncAllRunes();
    env.owner.noti.map = true;
    yield { kind: "finishReveal", args: [env.owner.maxZoneId] };
    let clearedStoryAct = env.deps.getStoryActByZoneId(zone.id);
    if (clearedStoryAct && clearedStoryAct.unlockText) yield { kind: "finishSay", args: [`🧭 ${clearedStoryAct.unlockText}`, "season-up"] };
    let unlockedZone = env.deps.getZone(env.owner.maxZoneId);
    yield { kind: "finishSay", args: [env.deps._t("🗺️ 신규 사냥터 [{zone}] 개방!", { zone: unlockedZone ? env.deps._t(unlockedZone.name) : env.deps._t("구역 {n}", { n: env.owner.maxZoneId }) }), "season-up"] };
    env.deps.noteCampaignResistPenalty(env.owner.maxZoneId);
  }

  // modules/combat/encounter-completion.mjs
  var encounterFinishByKind = /* @__PURE__ */ Object.freeze({
    beyondBoundary: clearFinishBeyondBoundaryEncounter,
    meteor: clearFinishMeteorEncounter,
    outsideChaos: clearFinishOutsideChaosEncounter,
    oceanDepth: clearFinishOceanEncounter,
    chaosRealm: clearFinishChaosRealmEncounter,
    skyTower: clearFinishSkyTowerEncounter,
    timeRift: clearFinishTimeRiftEncounter,
    trial: clearFinishTrialEncounter,
    seasonBoss: clearFinishSeasonBossEncounter,
    labyrinth: clearFinishLabyrinthEncounter,
    underworld: clearFinishUnderworldEncounter,
    cosmos: clearFinishCosmosEncounter
  });
  function* clearFinishEncounterRun(env) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    if (yield* clearFinishSpecialEncounterEarly(env, zone)) return;
    if (!env.deps.actExplorationProgress.beginCompletion(zone)) return;
    yield { kind: "dispatchRuntimeEvent", args: ["encounter-finished", {
      zoneId: zone.id,
      zoneType: zone.type,
      contentContext: env.deps.getEncounterTelemetryContext(zone),
      background: !!env.owner.isBackgroundCalculation
    }] };
    let mapAction = env.owner.settings.mapCompleteAction;
    env.owner.killsInZone++;
    if (zone.type === "atlasMap") return env.deps.atlasRun.finish(zone);
    yield { kind: "captureFinishFeedback", args: [] };
    const finishKind = encounterFinishByKind[zone.type];
    if (finishKind) return yield* finishKind(env, zone, mapAction);
    if (env.owner.killsInZone >= zone.maxKills) return yield* clearFinishZoneClear(env, zone, mapAction);
    yield { kind: "checkUnlocks", args: [] };
    env.deps.startMoving(false);
    yield { kind: "updateStaticUI", args: [] };
  }
  function* clearFinishSpecialEncounterEarly(env, zone) {
    if (zone?.type === "woodsmanEcho") {
      env.deps.finishWoodsmanEchoRun();
      return true;
    }
    if (zone?.id === "grand_breach_run" && env.owner.voidRift?.grandRun?.phase === "loot") {
      yield* killFinishGrandBreachLootCollection(env, zone);
      return true;
    }
    return false;
  }

  // modules/state/gem-records.mjs
  function normalizeGemCoreFailures(value, level, rules) {
    const most = Math.ceil(rules.pityMaxOfBase / rules.pityStepOfBase);
    return level === rules.maxLevel || !Number.isFinite(value) ? 0 : Math.min(most, Math.max(0, Math.floor(value)));
  }
  function normalizeRuneEnhanceLevel(raw, rules) {
    const old = (key) => Number.isFinite(raw[key]) ? Math.min(5, Math.max(0, Math.floor(raw[key]))) : 0;
    const level = Number.isFinite(raw.enhanceLevel) ? Math.floor(raw.enhanceLevel) : old("bossCoreLevel") + old("skyCoreLevel");
    return Math.min(rules.maxLevel, Math.max(0, level));
  }
  function normalizeGemRecord(raw, rules) {
    if (!raw || typeof raw !== "object") return { level: 1, exp: 0, enhanceLevel: 0, enhanceFailures: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    const enhanceLevel = normalizeRuneEnhanceLevel(raw, rules);
    const enhanceFailures = normalizeGemCoreFailures(raw.enhanceFailures, enhanceLevel, rules);
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level, exp, enhanceLevel, enhanceFailures, skyEnhanceCap, unlockedTier, activeTier, quality, awakened };
  }

  // modules/domain/experience.mjs
  function playerExperienceRequired(level, rules) {
    const lv = Math.max(1, Math.floor(level || 1));
    const requirements = rules.playerExperienceRequired;
    const delta = lv - 100;
    const base = lv <= 100 ? requirements[lv - 1] : requirements[99] + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
    const premium = rules.playerExperienceDensityPremium;
    const ramp = Math.max(0, Math.min(1, (lv - premium.startLevel) / (premium.fullLevel - premium.startLevel)));
    return Math.floor(base * (1 + premium.increase * ramp));
  }
  function gemExperienceRequired(level, rules) {
    return rules.gemExperienceRequired[Math.max(1, Math.min(20, Math.floor(level || 1))) - 1];
  }
  function gainGemExperience(gem, amount, rules) {
    if (amount <= 0 || gem.level >= 20) return 0;
    const previousLevel = gem.level;
    gem.exp += amount;
    while (gem.level < 20 && gem.exp >= gemExperienceRequired(gem.level, rules)) {
      gem.exp -= gemExperienceRequired(gem.level, rules);
      gem.level++;
    }
    if (gem.level === 20) gem.exp = 0;
    return gem.level - previousLevel;
  }

  // modules/domain/kill-progression.mjs
  var KillProgression = class {
    constructor(rules) {
      this.rules = rules;
    }
    /** kind is experience or gemExperience; world contains the current state and resolved zone/depth scales. */
    reward(enemy, stats, kind, world) {
      const { state, zone, abyssScale, abyssDepth } = world, levels = this.rules.levels;
      const level = levels.monsterLevel(zone, enemy);
      let exp = Math.floor(levels.monsterExperience(level) * levels.loopExperienceMultiplier(state.season, state.level, level));
      if (enemy.isElite) exp = Math.floor(exp * 1.8);
      if (enemy.isBoss) exp = Math.floor(exp * 6);
      exp = Math.floor(exp * (enemy.expMul || 1));
      exp = Math.floor(exp * (1 + stats.expGain / 100) * (abyssScale.expMul || 1));
      if (abyssDepth > 1) exp = Math.floor(exp * Math.max(0.68, 1 - (abyssDepth - 1) * 0.012));
      return Math.max(0, Math.floor(exp * levels.rewardMultiplier(zone, enemy, state.level, kind)));
    }
    /** Resolve worn slots at the call boundary: an active mobility cast must not hide the actual main gem. */
    wornGems(state, stats, amount, slots) {
      const mainSkill = slots.main === state.activeSkill ? stats.sSkill : this.rules.skills[slots.main] || {};
      const worn = new Set([(mainSkill.isGem || mainSkill.levelable) && slots.main, slots.mobility].filter(Boolean));
      state.gemData = state.gemData || {};
      return [...worn].filter((name) => this.normalizedGem(state, name, amount));
    }
    normalizedGem(state, name, amount) {
      state.gemData[name] = normalizeGemRecord(state.gemData[name], this.rules.forge);
      return gainGemExperience(state.gemData[name], amount, this.rules.experience) > 0;
    }
    /** Consume fully and emit each level notification before asking for the next entry.
     * Capture the list length as the original forEach did; duplicate equipped names retain their original behavior. */
    *summonGems(state, amount) {
      state.equippedSummonSkills = Array.isArray(state.equippedSummonSkills) ? state.equippedSummonSkills : [];
      const names = state.equippedSummonSkills, count = names.length;
      for (let i = 0; i < count; i++) {
        if (!(i in names)) continue;
        const name = names[i], def = this.rules.skills[name] || {};
        if (!Array.isArray(def.tags) || !def.tags.includes("summon")) continue;
        state.gemData = state.gemData || {};
        if (this.normalizedGem(state, name, amount)) yield name;
      }
    }
    *supportGems(state, amount) {
      const names = state.equippedSupports || [], count = names.length;
      for (let i = 0; i < count; i++) {
        if (!(i in names)) continue;
        const name = names[i], gem = state.supportGemData[name];
        if (gem && gainGemExperience(gem, amount, this.rules.experience) > 0) yield name;
      }
    }
    /** Each yielded level is already applied. Finish its point/heal/unlock effects before advancing again.
     * The 50-level guard and max-level XP discard match the old settlement, including saved overflow. */
    *levels(state) {
      let required = playerExperienceRequired(state.level, this.rules.experience), guard = 0;
      while (state.level < this.rules.maxLevel && state.exp >= required && guard < 50) {
        state.exp -= required;
        state.level++;
        yield state.level;
        required = playerExperienceRequired(state.level, this.rules.experience);
        guard++;
      }
      if (state.level >= this.rules.maxLevel) state.exp = 0;
    }
    awardPoint(state, unlocked) {
      if (state.season >= 2 || unlocked) state.passivePoints++;
      if (unlocked) state.noti.char = true;
    }
  };
  var createKillProgression = (rules) => Object.freeze(new KillProgression(rules));

  // modules/domain/exploration-ground-loot.mjs
  var groundLootKind = (row) => row.kind || (typeof row.currency === "string" ? "currency" : "equipment");

  // modules/domain/loot-delivery.mjs
  var LootDelivery = class {
    constructor(deps) {
      this.deps = deps;
    }
    floorFor(state, enemy) {
      const run = this.deps.exploration.current(state);
      return run && !run.arrival && !run.completionApplied && run.status !== "failed" && !state.isBackgroundCalculation && this.deps.hasGridCell(enemy) ? run : null;
    }
    /** Hold encounter payouts, except uniques/guaranteed drops which must survive a failed run. */
    holdEquipment(state, enemy, item, options, { highlight, guaranteed }) {
      if (guaranteed || item.rarity === "unique") return false;
      return this.deps.floor.reserve({
        gx: enemy.gx,
        gy: enemy.gy,
        item,
        highlight: !!highlight,
        guaranteed,
        filterOnPickup: !options?.ignoreFilter,
        ignoreAutoSalvage: !!options?.ignoreAutoSalvage
      }, state);
    }
    keepEquipment(state, enemy, item, options) {
      const highlight = this.deps.policy.highlight(item, state);
      const keep = this.deps.previewEquipmentPickup(item, options) === "kept";
      const guaranteed = this.deps.isGuaranteedEquipmentPickup(item, options);
      if (keep && this.holdEquipment(state, enemy, item, options, { highlight, guaranteed })) return { status: "floor" };
      const run = this.floorFor(state, enemy);
      if (run && keep) {
        this.deps.floor.place(run, enemy, item, { highlight: !!highlight, guaranteed });
        return { status: "floor", celebrate: true, highlight };
      }
      if (!this.deps.addItemToInventory(item, options)) return { status: null };
      return { status: "kept", receipt: { item, itemKind: "equipment", highlight } };
    }
    placeItem(state, enemy, kind, { item, overflow }) {
      if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind, item, overflow }, state)) return true;
      const run = this.floorFor(state, enemy);
      if (!run || kind === "jewel" && this.deps.bagItems.salvagedOnDrop(item)) return false;
      this.deps.floor.placeItem(run, enemy, kind, item, overflow);
      return true;
    }
    placeRune(state, enemy, gem) {
      if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind: "rune", gem }, state)) return true;
      const run = this.floorFor(state, enemy);
      if (!run) return false;
      this.deps.floor.placeRune(run, enemy, gem);
      return true;
    }
    keepCurrency(state, enemy, key, amount) {
      const award = this.deps.resolveCurrencyAward(key, amount, "drop");
      if (award.refused || award.gain <= 0) return { gain: 0, floor: false };
      if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, currency: award.key, count: award.gain }, state))
        return { gain: award.gain, floor: true };
      const run = this.floorFor(state, enemy);
      if (run) {
        this.deps.floor.placeCurrency(run, enemy, award.key, award.gain);
        return { gain: award.gain, floor: true };
      }
      this.deps.commitCurrencyGain(award.key, award.gain);
      return { gain: award.gain, floor: false, receipt: { currency: award.key, count: award.gain } };
    }
    awardCurrency(state, key, amount, source = "reward") {
      const award = this.deps.resolveCurrencyAward(key, amount, source);
      if (award.refused || award.gain <= 0) return 0;
      if (!this.deps.floor.reserve({ gx: state.gridPlayer.gx, gy: state.gridPlayer.gy, currency: award.key, count: award.gain }, state))
        this.deps.commitCurrencyGain(award.key, award.gain);
      return award.gain;
    }
    /** Held and lying runes affect the next roll without granting skills before pickup. */
    reservedRuneState(state) {
      const held = this.deps.floor.encounterOwner(state)?.pendingLoot || [];
      const lying = this.deps.exploration.current(state)?.groundLoot || [];
      const waiting = [...held, ...lying].filter((row) => row.kind === "rune");
      if (!waiting.length) return state;
      const owner = {
        ...state,
        skills: [...state.skills],
        supports: [...state.supports],
        gemData: { ...state.gemData },
        supportGemData: { ...state.supportGemData }
      };
      for (const row of waiting) Object.assign(owner, this.deps.gems.prepare(owner, [row.gem]));
      return owner;
    }
    receiveStump(state, row) {
      const { item, compost } = this.deps.stumpBox.receiveDrop(state, row.item);
      if (state.noti) state.noti.stump = true;
      return { ripened: compost ? compost.ripened : [], drop: item, compost };
    }
    receiveRune(state, row) {
      this.deps.gems.grant(state, row.gem, row.gem.kind === "support" ? this.deps.gems.resonanceCap(state, this.deps.getPlayerStats()) : 0);
      this.deps.statCache.invalidate();
      return { kind: row.gem.kind, gem: row.gem, deferred: true };
    }
    receiveYarn(state, id) {
      const result = this.deps.knitting.receive(state, id);
      if (!result) return null;
      this.deps.receipts.yarn(state, id);
      return result;
    }
    rollYarn(state, enemy, zone) {
      const id = this.deps.knitting.rollKill(state, zone, enemy);
      if (!id) return null;
      this.deps.knitting.markDrop(state, id);
      if (this.deps.floor.reserve({ gx: enemy.gx, gy: enemy.gy, kind: "yarn", yarn: id }, state)) return null;
      const run = this.floorFor(state, enemy);
      if (!run) return id;
      this.deps.floor.placeYarn(run, enemy, id);
      return null;
    }
    /** Resume only after presenting each notice: listeners may update state before the next reward. */
    *collect(state, rows) {
      const currencies = rows.filter((row) => groundLootKind(row) === "currency");
      currencies.forEach((row) => this.deps.commitCurrencyGain(row.currency, row.count));
      const length = rows.length;
      for (let index = 0; index < length; index++) if (index in rows) yield* this.receiveRow(state, rows[index]);
      const fresh = rows.filter((row) => groundLootKind(row) === "equipment" && this.deps.moments.isNewUnique(row.item, state)).map((row) => row.item.id);
      const kept = rows.filter((row) => groundLootKind(row) === "equipment" && this.deps.addItemToInventory(row.item, {
        ignoreFilter: !row.filterOnPickup,
        ignoreAutoSalvage: !!row.ignoreAutoSalvage,
        guaranteedKeep: row.guaranteed
      })).map((row) => row.item);
      if (kept.length || currencies.length) yield { event: "floor-loot-collected", detail: {
        items: kept,
        fresh: fresh.filter((id) => kept.some((item) => item.id === id)),
        currencies: currencies.map((row) => ({ key: row.currency, count: row.count }))
      } };
      return kept.length + currencies.length;
    }
    *receiveRow(state, row) {
      const kind = groundLootKind(row);
      if (kind === "core") {
        if (this.deps.coreItems.keep(row.item, state)) yield { event: "core-item-received", detail: row.item };
      } else if (kind === "talisman") {
        yield { action: "talisman", detail: this.deps.talismans.receiveWild(state, { talisman: row.item, overflow: row.overflow }) };
      } else if (kind === "leaf") {
        yield { action: "leaf", detail: row.leaf };
      } else yield* this.receiveNamedRow(state, row, kind);
    }
    *receiveNamedRow(state, row, kind) {
      if (kind === "jewel") yield { event: "jewel-drop-received", detail: this.deps.receiveJewelDrop(row.item) };
      else if (kind === "stump") yield { event: "stump-box-changed", detail: this.receiveStump(state, row) };
      else if (kind === "rune") yield { event: "gem-loot-received", detail: this.receiveRune(state, row) };
      else if (kind === "yarn") yield { action: "yarn", detail: row.yarn };
    }
  };
  var createLootDelivery = (deps) => new LootDelivery(deps);

  // modules/domain/enemy-drop-rolls.mjs
  var EnemyDropRolls = class {
    constructor(tables, deps) {
      this.tables = tables;
      this.deps = deps;
    }
    currencyAndGear(enemy, zone, chance) {
      let drops2 = this.deps.currencies(enemy), gear = this.deps.equipment(zone, enemy, chance);
      for (let tries = 1; enemy.roomInvader && !drops2.length && !gear.count; tries++) {
        drops2 = this.deps.currencies(enemy);
        gear = this.deps.equipment(zone, enemy, tries >= this.tables.ROOM_INVADER.emptyRollRetries ? Math.max(1, chance) : chance);
      }
      return { drops: drops2, gear };
    }
    attackRune(awakening, boss) {
      const name = this.deps.chooseSkill(this.deps.gems.attackRunes({ includeDropOnly: true, boss }));
      return { kind: "attack", name, awakened: !!awakening && this.deps.random() < 0.035 };
    }
    rune(state, awakening, boss) {
      if (!this.deps.content.isUnlocked("support", state) || this.deps.random() < 0.5)
        return { kind: "attack", gem: this.attackRune(awakening, boss) };
      const names = Object.keys(this.tables.SUPPORT_GEM_DB);
      if (!names.length) return { kind: "support", gem: null };
      const name = this.deps.choose(names);
      return { kind: "support", name, gem: this.deps.gems.nextSupport(this.deps.delivery.reservedRuneState(state), name) };
    }
    guardianFossils(state, enemy, zone) {
      if (zone?.type !== "labyrinth" || !enemy.isBoss || enemy.roomInvader) return null;
      const floor = Math.max(1, Math.floor(state.labyrinthFloor || zone.floor || 1));
      return { floor, keys: this.fossils(state, floor) };
    }
    fossils(state, floor) {
      const open = this.deps.content.isUnlocked("fossil", state) ? 1 : 0;
      const chances = this.deps.fossilChances(floor, open, open);
      const typed = this.deps.choose(this.tables.FOSSIL_DB.filter((row) => !row.ancientPrimalOnly));
      const primal = this.deps.content.isUnlocked("fossilRestore", state);
      return [
        ["fossil", chances.base],
        [typed.key, chances.typed],
        ["fossilPrimal", primal ? chances.primal : 0],
        ["fossilAncientPrimal", primal ? chances.ancient : 0],
        ["fossilAbyssal", chances.abyssal]
      ].filter(([, chance]) => this.deps.random() < chance).map(([key]) => key);
    }
  };
  var createEnemyDropRolls = (tables, deps) => new EnemyDropRolls(tables, deps);

  // modules/domain/kill-loot.mjs
  var isDeepChaosLootZone = (zone) => !!zone && zone.type === "abyss" && Math.max(0, Math.floor(zone.depth || 0)) >= 21;
  var KillLoot = class {
    constructor(delivery2, rolls, deps) {
      this.delivery = delivery2;
      this.rolls = rolls;
      this.deps = deps;
    }
    *equipment(state, enemy, zone, minimumRarity, slot) {
      const drop = this.deps.variants.expand(this.deps.generateEquipment(enemy, { minimumRarity, zone, slot }));
      const options = enemy.roomInvader ? { guaranteedKeep: true } : void 0, kept = [];
      const length = drop.items.length;
      for (let index = 0; index < length; index++) {
        const item = drop.items[index];
        if ((yield* this.keepEquipment(state, enemy, item, options)) === "kept") kept.push(item);
      }
      return kept;
    }
    *keepEquipment(state, enemy, item, options) {
      const result = this.delivery.keepEquipment(state, enemy, item, options);
      if (result.celebrate || result.receipt) yield { action: "equipmentDelivery", enemy, item, result };
      return result.status;
    }
    *rootWeapon(state, enemy, zone) {
      if (!this.deps.rootWeapon(enemy) || this.deps.random() >= this.deps.rootChance) return [];
      return yield* this.equipment(state, enemy, zone, null, "무기");
    }
    *equipmentLoot(state, enemy, zone, roll) {
      const kept = [];
      for (let index = 0; index < roll.count; index++)
        kept.push(...yield* this.equipment(state, enemy, zone, index === 0 ? roll.minimumRarity : null));
      state.equipmentDropProgress = roll.nextProgress;
      kept.push(...yield* this.rootWeapon(state, enemy, zone), ...this.deps.wards.rollFieldDrop(enemy, zone));
      return kept[0] || null;
    }
    *realmUnique(state, enemy, zone) {
      const item = this.deps.realmUnique(zone, enemy);
      return item && (yield* this.keepEquipment(state, enemy, item, { guaranteedKeep: true })) ? item : null;
    }
    context(state, enemy, zone) {
      const greed = this.deps.supports.blessingGreed(state);
      enemy.greedDropMul = greed ? 1 + greed.dropPct / 100 : 1;
      return {
        multiplier: this.deps.contentMultiplier(zone) * enemy.greedDropMul,
        awakening: this.deps.content.isUnlocked("gemAwakening", state),
        deferred: !!this.deps.floor.encounterOwner(state)
      };
    }
    *roll(state, enemy) {
      const zone = this.deps.zone(state.currentZoneId) || this.deps.zone(0), context = this.context(state, enemy, zone);
      yield* this.echo(state, enemy, context);
      yield* this.rune(state, enemy, context);
      const chances = this.deps.chances(zone, enemy), { drops: drops2, gear } = this.rolls.currencyAndGear(enemy, zone, chances.equipment);
      for (const drop of drops2) yield* this.currency(state, enemy, drop, context);
      const item = yield* this.equipmentLoot(state, enemy, zone, gear);
      yield* this.realmUnique(state, enemy, zone);
      if (item && state.settings.showLootLog) yield { action: "equipmentLog", item };
      this.deps.wildTalisman(enemy, chances.talisman);
      yield* this.jewel(state, enemy, context.multiplier);
      const mapping = !!zone && zone.type === "abyss";
      yield* this.beeLoot(state, enemy, mapping, context);
      if (zone?.type === "atlasMap" && this.deps.atlasPassives.has(state, "beeEvents")) yield* this.beeEvent(state, enemy);
      yield* this.hiveKey(state, enemy, mapping, context);
      yield* this.colonyTrace(state, zone, context);
      const yarn = this.delivery.rollYarn(state, enemy, zone);
      if (yarn) yield { action: "yarn", id: yarn };
      yield* this.guardianFossils(state, enemy, zone, context);
    }
    *echo(state, enemy, context) {
      if (!(this.deps.content.canDropCurrency("awakenedEcho", state) && context.awakening && (enemy.isBoss || enemy.isElite))) return;
      if (this.deps.random() >= (enemy.isBoss ? 0.045 : 4e-3) * context.multiplier) return;
      this.delivery.awardCurrency(state, "awakenedEcho", 1);
      if (state.settings.showLootLog) yield { action: "echo", deferred: context.deferred };
    }
    *rune(state, enemy, context) {
      if (!(this.deps.random() < (enemy.isBoss ? 0.09 : enemy.isElite ? 0.018 : 3e-3) * context.multiplier * this.deps.gemMultiplier(enemy))) return;
      const reward = this.deps.runeReward(context.awakening, !!enemy.isBoss);
      if (reward.gem && this.delivery.placeRune(state, enemy, reward.gem)) return;
      if (this.deps.floor.encounterOwner(state)) return;
      if (reward.gem) {
        const cap = reward.kind === "support" ? this.deps.gems.resonanceCap(state, this.deps.stats()) : 0;
        this.deps.gems.grant(state, reward.gem, cap);
        yield { action: "unlocks" };
      }
      yield { event: "gem-loot-received", detail: reward };
    }
    *currency(state, enemy, drop, context) {
      if (!drop || !drop[0]) return;
      if (drop[0] === "core") {
        const core = this.deps.cores.roll();
        if (this.delivery.placeItem(state, enemy, "core", { item: core })) return;
        this.deps.cores.keep(core, state);
        yield { action: "receipt", enemy, receipt: { item: core, itemKind: "core" } };
        yield { event: "core-item-received", detail: core };
        return;
      }
      const result = yield* this.keepCurrency(state, enemy, drop[0], drop[1]);
      if (result.gain > 0 && !result.floor && state.settings.showLootLog)
        yield { action: "currencyLog", key: drop[0], amount: result.gain, deferred: context.deferred };
    }
    *keepCurrency(state, enemy, key, count) {
      const result = this.delivery.keepCurrency(state, enemy, key, count);
      if (result.receipt) yield { action: "receipt", enemy, receipt: result.receipt };
      return result;
    }
    *jewel(state, enemy, multiplier) {
      if (!(this.deps.content.isUnlocked("jewel", state) && (state.season || 1) >= 5 && (enemy.isElite || enemy.isBoss) && this.deps.random() < 56e-4 * multiplier)) return;
      const jewel = this.deps.generateJewel(this.deps.zone(state.currentZoneId) || { type: "act", storyOrder: 1 });
      if (this.delivery.placeItem(state, enemy, "jewel", { item: jewel })) return;
      const receipt = this.deps.receiveJewel(jewel);
      if (receipt.stored) yield { action: "jewelReceipt", enemy, jewel };
      yield { event: "jewel-drop-received", detail: receipt };
    }
    *beeLoot(state, enemy, mapping, context) {
      if (!(state.beehive?.unlockedPermanent && mapping && !enemy.isBoss)) return;
      const gains = [];
      const pollen = yield* this.pollen(state, enemy);
      if (pollen) gains.push(pollen);
      if (enemy.isElite) gains.push(...this.eliteBeeLoot(state));
      if (state.settings.showLootLog) for (const gain of gains) yield { action: "beeLoot", ...gain, deferred: context.deferred };
    }
    *pollen(state, enemy) {
      if (this.deps.random() >= 0.015) return null;
      const amount = enemy.isElite ? 2 : 1;
      return (yield* this.keepCurrency(state, enemy, "pollen", amount)).floor ? null : { key: "pollen", amount };
    }
    eliteBeeLoot(state) {
      const gains = [];
      for (const [key, chance] of [["venomStinger", 48e-4], ["enchantedHoney", 64e-5], ["beeswax", 32e-4]]) {
        if (this.deps.random() >= chance) continue;
        this.delivery.awardCurrency(state, key, 1);
        gains.push({ key, amount: 1 });
      }
      return gains;
    }
    *beeEvent(state, enemy) {
      if (!enemy || enemy.isBoss || (state.currencies.pollen || 0) < 10) return;
      if (this.deps.random() >= (enemy.isElite ? 0.012 : 25e-4)) return;
      state.currencies.pollen = Math.max(0, (state.currencies.pollen || 0) - 10);
      yield* this.beeEventRewards(this.deps.random());
    }
    *beeEventRewards(roll) {
      if (roll < 0.08) {
        this.deps.awardCurrency("pollen", 25);
        this.deps.awardCurrency("enchantedHoney", 1);
        this.deps.awardCurrency("beeswax", 2);
        yield { action: "beeEvent", kind: "queen" };
      } else if (roll < 0.28) {
        this.deps.awardCurrency("venomStinger", 1);
        if (this.deps.random() < 0.35) this.deps.awardCurrency("beeswax", 1);
        yield { action: "beeEvent", kind: "sting" };
      } else if (roll < 0.55) {
        this.deps.awardCurrency("pollen", 15);
        this.deps.awardCurrency("beeswax", 1);
        yield { action: "beeEvent", kind: "bumble" };
      } else {
        this.deps.awardCurrency("pollen", 8);
        yield { action: "beeEvent", kind: "worker" };
      }
    }
    *hiveKey(state, enemy, mapping, context) {
      if (!((state.season || 1) >= 8 && mapping && this.deps.random() < (enemy.isBoss ? 5e-3 : enemy.isElite ? 15e-4 : 2e-4))) return;
      this.delivery.awardCurrency(state, "hiveKey", 1);
      if (state.settings.showLootLog) yield { action: "hiveKey", deferred: context.deferred };
    }
    *colonyTrace(state, zone, context) {
      const deep = isDeepChaosLootZone(zone);
      if (!((state.season || 1) >= 15 && (deep || state.currentZoneId === "beehive_run" || state.currentZoneId === "grand_breach_run"))) return;
      const chance = deep ? 75e-5 : state.currentZoneId === "grand_breach_run" ? 1125e-6 : 5e-4;
      if (this.deps.random() >= chance) return;
      this.delivery.awardCurrency(state, "colonyTrace", 1);
      yield { action: "trace", deferred: context.deferred };
    }
    *guardianFossils(state, enemy, zone, context) {
      const rolled = this.rolls.guardianFossils(state, enemy, zone);
      if (!rolled) return;
      const { floor, keys } = rolled;
      for (const key of keys) yield* this.keepCurrency(state, enemy, key, 1);
      if (keys.includes("fossilAbyssal")) yield { action: "fossil", deferred: context.deferred };
      const currencies = {};
      for (const key of keys) currencies[key] = (currencies[key] || 0) + 1;
      state.labyrinthLastResult = { season: state.season, floor, pending: true, currencies };
    }
  };
  var createKillLoot = (delivery2, rolls, deps) => new KillLoot(delivery2, rolls, deps);

  // modules/combat-kill-rewards-classic.mjs
  var progression = createKillProgression({
    levels: levelProgression,
    skills: SKILL_DB,
    experience: LEVEL_PROGRESSION,
    forge: GEM_CORE_FORGE,
    maxLevel: MAX_PLAYER_LEVEL
  });
  var delivery = createLootDelivery({
    get exploration() {
      return actExplorationState;
    },
    get floor() {
      return actExplorationState.groundLoot;
    },
    get policy() {
      return equipmentLootPolicy;
    },
    get moments() {
      return lootMoments;
    },
    get bagItems() {
      return bagItems;
    },
    get coreItems() {
      return coreItems;
    },
    get talismans() {
      return talismans;
    },
    get stumpBox() {
      return stumpBox;
    },
    get gems() {
      return gemDropRewards;
    },
    get knitting() {
      return knitting;
    },
    get receipts() {
      return combatLootReceipts;
    },
    get statCache() {
      return playerStatCache;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get previewEquipmentPickup() {
      return previewEquipmentPickup;
    },
    get isGuaranteedEquipmentPickup() {
      return isGuaranteedEquipmentPickup;
    },
    get addItemToInventory() {
      return addItemToInventory;
    },
    get receiveJewelDrop() {
      return receiveJewelDrop;
    },
    get resolveCurrencyAward() {
      return resolveCurrencyAward;
    },
    get commitCurrencyGain() {
      return commitCurrencyGain;
    }
  });
  var drops = createEnemyDropRolls({ ROOM_INVADER, SUPPORT_GEM_DB, FOSSIL_DB }, {
    delivery,
    random: () => Math.random(),
    choose: (rows) => rndChoice(rows),
    get content() {
      return contentProgression;
    },
    get gems() {
      return gemDropRewards;
    },
    get chooseSkill() {
      return pickSkillRuneReward;
    },
    get currencies() {
      return getCurrencyDrops;
    },
    get equipment() {
      return rollEquipmentDrop;
    },
    get fossilChances() {
      return getLabyrinthFossilDropChances;
    }
  });
  var loot = createKillLoot(delivery, drops, {
    random: () => Math.random(),
    get variants() {
      return equipmentDropVariants;
    },
    get generateEquipment() {
      return generateEquipmentDrop;
    },
    get rootWeapon() {
      return getRootMonsterWeapon;
    },
    get rootChance() {
      return ROOT_MONSTER_RULES.weaponDropChance;
    },
    get wards() {
      return colonyWards;
    },
    get realmUnique() {
      return generateRealmBossUniqueDrop;
    },
    get zone() {
      return getZone;
    },
    get supports() {
      return window.GameModules.combat.supports;
    },
    get contentMultiplier() {
      return getContentDropRateMultiplier;
    },
    get content() {
      return contentProgression;
    },
    get floor() {
      return actExplorationState.groundLoot;
    },
    get chances() {
      return getEquipmentDropChances;
    },
    get wildTalisman() {
      return rollWildTalismanDrop;
    },
    get atlasPassives() {
      return atlasPassives;
    },
    get gemMultiplier() {
      return getEnemyGemDropMul;
    },
    get runeReward() {
      return rollEnemyGemReward;
    },
    get gems() {
      return gemDropRewards;
    },
    get stats() {
      return getPlayerStats;
    },
    get cores() {
      return coreItems;
    },
    get generateJewel() {
      return generateJewelDrop;
    },
    get receiveJewel() {
      return receiveJewelDrop;
    },
    get awardCurrency() {
      return awardCurrency;
    }
  });
  safeExposeGlobals({ rollEnemyGemReward: (awakening, boss) => drops.rune(game, awakening, boss), receiveKnittingYarn: (id) => {
    const result = delivery.receiveYarn(game, id);
    if (result) dispatchRuntimeEvent("knitting-yarn", result);
  } });
  var rewardDeps = {
    get getZone() {
      return getZone;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get getEncounterTelemetryContext() {
      return getEncounterTelemetryContext;
    },
    get atlasRun() {
      return atlasRun;
    },
    get startMoving() {
      return startMoving;
    },
    get finishWoodsmanEchoRun() {
      return finishWoodsmanEchoRun;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get getAutoProgressZoneId() {
      return getAutoProgressZoneId;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get CHAOS_REALM_ZONE_ID() {
      return CHAOS_REALM_ZONE_ID;
    },
    get isSkyTowerAtRewardLimit() {
      return isSkyTowerAtRewardLimit;
    },
    get holdActRetreat() {
      return holdActRetreat;
    },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() {
      return BEYOND_BOUNDARY_REWARD_FOCUS_DB;
    },
    get getBeyondBoundaryRewardFocusStatus() {
      return getBeyondBoundaryRewardFocusStatus;
    },
    get BEYOND_BOUNDARY_INTENSITY_DB() {
      return BEYOND_BOUNDARY_INTENSITY_DB;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get getUnderworldTier() {
      return getUnderworldTier;
    },
    get _t() {
      return _t;
    },
    get generateEquipmentDrop() {
      return generateEquipmentDrop;
    },
    get addItemToInventory() {
      return addItemToInventory;
    },
    get generateJewelDrop() {
      return generateJewelDrop;
    },
    get bagItems() {
      return bagItems;
    },
    get salvageJewelObject() {
      return salvageJewelObject;
    },
    get getBeyondBoundaryPayoutTier() {
      return getBeyondBoundaryPayoutTier;
    },
    get awardCurrency() {
      return awardCurrency;
    },
    get completeBeyondBoundaryEncounter() {
      return completeBeyondBoundaryEncounter;
    },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() {
      return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER;
    },
    get BEYOND_BOUNDARY_SEAL_DB() {
      return BEYOND_BOUNDARY_SEAL_DB;
    },
    get prepareActExplorationArrival() {
      return prepareActExplorationArrival;
    },
    get grantMeteorEncounterRewards() {
      return grantMeteorEncounterRewards;
    },
    get ensureMeteorSiteState() {
      return ensureMeteorSiteState;
    },
    get clearWoodsmanBuildLock() {
      return clearWoodsmanBuildLock;
    },
    get addWoodsmanPendingScore() {
      return addWoodsmanPendingScore;
    },
    get unlockJournalEntry() {
      return typeof unlockJournalEntry === "undefined" ? void 0 : unlockJournalEntry;
    },
    get maybeUnlockChaosRealmFromWoodsman() {
      return maybeUnlockChaosRealmFromWoodsman;
    },
    get markLoopSpecialBossKill() {
      return markLoopSpecialBossKill;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get advanceOceanDiveFromKill() {
      return advanceOceanDiveFromKill;
    },
    get getOceanPendingBossBoundary() {
      return getOceanPendingBossBoundary;
    },
    get getOceanDepthTier() {
      return getOceanDepthTier;
    },
    get grantChaosRealmFloorBonus() {
      return grantChaosRealmFloorBonus;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get getSkyTowerRemainingClears() {
      return getSkyTowerRemainingClears;
    },
    get SKY_TOWER_ZONE_ID() {
      return SKY_TOWER_ZONE_ID;
    },
    get getSkyTowerLoopClearLimit() {
      return getSkyTowerLoopClearLimit;
    },
    get getSkyTowerRewardAmount() {
      return getSkyTowerRewardAmount;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get resolveTimeRiftFusion() {
      return typeof resolveTimeRiftFusion === "undefined" ? void 0 : resolveTimeRiftFusion;
    },
    get pickParticle() {
      return pickParticle;
    },
    get pickSkillRuneReward() {
      return pickSkillRuneReward;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get startEncounterRun() {
      return startEncounterRun;
    },
    get handleTalentBloomClear() {
      return handleTalentBloomClear;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get ROOT_BOSS_UNIQUE_RULES() {
      return ROOT_BOSS_UNIQUE_RULES;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get FOSSIL_DB() {
      return FOSSIL_DB;
    },
    get contentProgression() {
      return contentProgression;
    },
    get UNDERWORLD_ZONE_ID() {
      return UNDERWORLD_ZONE_ID;
    },
    get underworldMilestoneReward() {
      return window.GameModules.state.underworldMilestoneReward;
    },
    get UNDERWORLD_DEEP_FLOOR_REWARD() {
      return UNDERWORLD_DEEP_FLOOR_REWARD;
    },
    get cosmosAtlas() {
      return window.GameModules.cosmosAtlas;
    },
    get markActRewardReady() {
      return markActRewardReady;
    },
    get worldTreeBark() {
      return worldTreeBark;
    },
    get recordActClear() {
      return typeof recordActClear === "undefined" ? void 0 : recordActClear;
    },
    get getStoryActByZoneId() {
      return getStoryActByZoneId;
    },
    get getCurrentSeasonFinalZoneId() {
      return getCurrentSeasonFinalZoneId;
    },
    get getSeasonAbyssDepthCap() {
      return getSeasonAbyssDepthCap;
    },
    get handleSeasonLoopConditionMet() {
      return handleSeasonLoopConditionMet;
    },
    get enterNextEndlessChaosDepth() {
      return enterNextEndlessChaosDepth;
    },
    get hasCurrentLoopChaos20Clear() {
      return typeof hasCurrentLoopChaos20Clear === "undefined" ? void 0 : hasCurrentLoopChaos20Clear;
    },
    get npcShop() {
      return typeof npcShop === "undefined" ? void 0 : npcShop;
    },
    get noteCampaignResistPenalty() {
      return noteCampaignResistPenalty;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get progressionRules() {
      return progression;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get runPassiveTreeAutoInvest() {
      return typeof runPassiveTreeAutoInvest === "undefined" ? void 0 : runPassiveTreeAutoInvest;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get createClassStarterWeapon() {
      return createClassStarterWeapon;
    },
    get basicSkills() {
      return basicSkills;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get ensureWoodsmanEchoRunState() {
      return ensureWoodsmanEchoRunState;
    },
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get combatIncidents() {
      return combatIncidents;
    },
    get completeHiddenJournalBossRun() {
      return completeHiddenJournalBossRun;
    },
    get getGrandBreachProgress() {
      return getGrandBreachProgress;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get getColonyRoomRun() {
      return getColonyRoomRun;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get colonyWards() {
      return colonyWards;
    },
    get getColonyWaveEnemyCount() {
      return getColonyWaveEnemyCount;
    },
    get spawnColonyWave() {
      return spawnColonyWave;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get prepareMeteorEncounterEntry() {
      return prepareMeteorEncounterEntry;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get maybeUnlockSkyTowerFromChaos20() {
      return maybeUnlockSkyTowerFromChaos20;
    },
    get isBeehiveRunLockedForMapTravel() {
      return typeof isBeehiveRunLockedForMapTravel === "undefined" ? void 0 : isBeehiveRunLockedForMapTravel;
    },
    get autoEnterGrandBreachIfReady() {
      return typeof autoEnterGrandBreachIfReady === "undefined" ? void 0 : autoEnterGrandBreachIfReady;
    },
    get enterOceanDive() {
      return enterOceanDive;
    },
    get isOceanAutoRediveHalted() {
      return isOceanAutoRediveHalted;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get applyOceanKill() {
      return applyOceanKill;
    },
    get OCEAN_COMBAT_DIVE() {
      return OCEAN_COMBAT_DIVE;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get findFreeGridCell() {
      return findFreeGridCell;
    },
    get createEnemy() {
      return createEnemy;
    },
    get getBattleSpawnStamp() {
      return getBattleSpawnStamp;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get getElementColor() {
      return getElementColor;
    },
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    get findNearestGridEnemy() {
      return findNearestGridEnemy;
    },
    get woodsmanStumps() {
      return woodsmanStumps;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    get combatSupports() {
      return window.GameModules.combat.supports;
    },
    get STAGE_STORY_ART() {
      return STAGE_STORY_ART;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get weaponMastery() {
      return typeof weaponMastery === "undefined" ? void 0 : weaponMastery;
    },
    get bossVariants() {
      return typeof bossVariants === "undefined" ? void 0 : bossVariants;
    },
    get stumpNursery() {
      return typeof stumpNursery === "undefined" ? void 0 : stumpNursery;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get placeFloorItem() {
      return placeFloorItem;
    },
    get gainSkyRiftGaugeFromCombat() {
      return gainSkyRiftGaugeFromCombat;
    },
    get applyAilmentEffectsOnDeath() {
      return applyAilmentEffectsOnDeath;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get countBeehiveWaveAlive() {
      return countBeehiveWaveAlive;
    },
    get onBeehiveWaveCleared() {
      return typeof onBeehiveWaveCleared === "undefined" ? void 0 : onBeehiveWaveCleared;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get i18n() {
      return i18n;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    }
  };
  var rewardEnv = { get owner() {
    return game;
  }, deps: rewardDeps };
  var completionEffects = {
    get addLog() {
      return addLog;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get collectExplorationFloorLoot() {
      return collectExplorationFloorLoot;
    },
    showGameToast(...args) {
      return window.showGameToast(...args);
    },
    renderCosmosAtlas() {
      return window.GameModules.cosmosAtlas.view.renderCosmosAtlas();
    },
    finishSyncOpened() {
      return contentUnlockUi.syncOpened();
    }
  };
  function runCompletionCommands(commands, feedback) {
    let step = commands.next();
    while (!step.done) {
      const { kind, args } = step.value;
      if (kind === "captureFinishFeedback") {
        feedback = { say: addLog, redraw: updateStaticUI, unlocks: checkUnlocks, get reveal() {
          return triggerMapUnlockReveal;
        } };
        step = commands.next();
      } else if (["finishSay", "finishRedraw", "finishUnlocks", "finishReveal"].includes(kind)) {
        const method = kind.slice(6).toLowerCase();
        step = commands.next(feedback[method](...args));
      } else step = commands.next(completionEffects[kind](...args));
    }
    return step.value;
  }
  function ensureNextEndlessChaosDepthUnlocked(depth) {
    return clearEnsureNextEndlessChaosDepthUnlocked(rewardEnv, depth);
  }
  function getTrialSkillGemRewardChance(zone, isFirstClear) {
    return clearGetTrialSkillGemRewardChance(zone, isFirstClear);
  }
  function grantUnderworldFloorMilestone(floor, progress) {
    return runCompletionCommands(clearGrantUnderworldFloorMilestone(rewardEnv, floor, progress));
  }
  function finishEncounterRun() {
    return runCompletionCommands(clearFinishEncounterRun(rewardEnv));
  }
  function finishBeyondBoundaryEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishBeyondBoundaryEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishMeteorEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishMeteorEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishOutsideChaosEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishOutsideChaosEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishOceanEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishOceanEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishChaosRealmEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishChaosRealmEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishSkyTowerEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishSkyTowerEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishTimeRiftEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishTimeRiftEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishTimeRiftFusion(rift, ui) {
    return runCompletionCommands(clearFinishTimeRiftFusion(rewardEnv, rift), ui);
  }
  function finishTrialEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishTrialEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishSeasonBossEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishSeasonBossEncounter(rewardEnv, zone, mapAction), ui);
  }
  function grantSeasonBossRewards(zone, firstRootBossClear, ui) {
    return runCompletionCommands(clearGrantSeasonBossRewards(rewardEnv, zone, firstRootBossClear), ui);
  }
  function departSeasonBoss(zone, ui) {
    return runCompletionCommands(clearDepartSeasonBoss(rewardEnv, zone), ui);
  }
  function finishLabyrinthEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishLabyrinthEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishUnderworldEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishUnderworldEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishCosmosEncounter(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishCosmosEncounter(rewardEnv, zone, mapAction), ui);
  }
  function finishZoneClear(zone, mapAction, ui) {
    return runCompletionCommands(clearFinishZoneClear(rewardEnv, zone, mapAction), ui);
  }
  var settlementEffects = {
    get addLog() {
      return addLog;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get addConfirmedSkillEffect() {
      return addConfirmedSkillEffect;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get runPassiveTreeAutoInvest() {
      return runPassiveTreeAutoInvest;
    },
    get keepEquipmentDrop() {
      return keepEquipmentDrop;
    },
    get keepCurrencyDrop() {
      return keepCurrencyDrop;
    },
    get collectExplorationFloorLoot() {
      return collectExplorationFloorLoot;
    },
    get grantEnemyLoot() {
      return grantEnemyLoot;
    },
    requestHeavyUiRefresh() {
      pendingHeavyUiRefresh = true;
    },
    corpseExplosionLine(...args) {
      return coreCorpseExplosionLine(rewardEnv, ...args);
    }
  };
  function runSettlementCommands(commands, overrides) {
    const stack = [{ commands, say: overrides ? overrides.say : addLog }];
    let result;
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const step = frame.commands.next(result);
      result = void 0;
      if (step.done) {
        stack.pop();
        result = step.value;
        continue;
      }
      const { kind, args } = step.value;
      if (kind === "settleDeath") stack.push({ commands: killHandleEnemyDeath(rewardEnv, ...args), say: addLog });
      else if (kind === "killSay") result = frame.say(...args);
      else if (kind === "announceColonyWard") result = lootAnnounceColonyWard(lootUiEnv, args[0], frame.say);
      else result = settlementEffects[kind](...args);
    }
    return result;
  }
  function getEnemyExperienceReward(enemy, pStats, kind = "experience") {
    return killGetEnemyExperienceReward(rewardEnv, enemy, pStats, kind);
  }
  function grantExpAndGem(enemy, pStats) {
    return runSettlementCommands(killGrantExpAndGem(rewardEnv, enemy, pStats));
  }
  function awardLevelPassivePoint() {
    return killAwardLevelPassivePoint(rewardEnv);
  }
  function applyGrandBreachMobTuning(zone, enemy) {
    return killApplyGrandBreachMobTuning(zone, enemy);
  }
  function isMapProgressHeld(zone, rift) {
    return killIsMapProgressHeld(rewardEnv, zone, rift);
  }
  function isVoidRiftCombatZone(zone) {
    return killIsVoidRiftCombatZone(zone);
  }
  function applyVoidRiftMobTuning(enemy) {
    return killApplyVoidRiftMobTuning(enemy);
  }
  function clearDotFxThrottleForEnemy(enemyId) {
    return killClearDotFxThrottleForEnemy(rewardEnv, enemyId);
  }
  function grantLoopStarterWeaponOnFirstKill(enemy) {
    return runSettlementCommands(killGrantLoopStarterWeaponOnFirstKill(rewardEnv, enemy));
  }
  function resolveEnemyDeath(enemy) {
    return killResolveEnemyDeath(rewardEnv, enemy);
  }
  function countKillForContent(enemy, zone, pStats) {
    return runSettlementCommands(killCountKillForContent(rewardEnv, enemy, zone, pStats));
  }
  function tickTalentKillRuntime(enemy) {
    return killTickTalentKillRuntime(rewardEnv, enemy);
  }
  function rollRandomVoidRiftOnKill(enemy, zone, say) {
    return runSettlementCommands(killRollRandomVoidRiftOnKill(rewardEnv, enemy, zone), { say });
  }
  function explodeCorpsesOnKill(enemy, pStats, say) {
    return runSettlementCommands(killExplodeCorpsesOnKill(rewardEnv, enemy, pStats), { say });
  }
  function applyUniqueKillEffects(pStats) {
    return killApplyUniqueKillEffects(rewardEnv, pStats);
  }
  function getOverkillSplash(enemy, pStats) {
    return killGetOverkillSplash(enemy, pStats);
  }
  function advanceColonyWaveOnKill(zone, say, enemy) {
    return runSettlementCommands(killAdvanceColonyWaveOnKill(rewardEnv, zone, enemy), { say });
  }
  function finishGrandBreachOnBossKill(enemy, zone, say) {
    return runSettlementCommands(killFinishGrandBreachOnBossKill(rewardEnv, enemy, zone), { say });
  }
  function flagHeavyUiAfterKill(enemy, zone, gemLeveled, currencyDropVersionBefore) {
    return runSettlementCommands(killFlagHeavyUiAfterKill(rewardEnv, enemy, zone, gemLeveled, currencyDropVersionBefore));
  }
  function transferSkillDotOnDeath(enemy) {
    return runSettlementCommands(killTransferSkillDotOnDeath(rewardEnv, enemy));
  }
  function getRangerWeakpointBonus(enemy, hitDamage) {
    return killGetRangerWeakpointBonus(rewardEnv, enemy, hitDamage);
  }
  function onChaos20Cleared() {
    return killOnChaos20Cleared(rewardEnv);
  }
  function enterAutomaticMapInterruptionAfterClear(clearedZone) {
    return runSettlementCommands(killEnterAutomaticMapInterruptionAfterClear(rewardEnv, clearedZone));
  }
  function callOceanGuardianAtBoundary() {
    return killCallOceanGuardianAtBoundary(rewardEnv);
  }
  function noteOceanKill(enemy, zone) {
    return runSettlementCommands(killNoteOceanKill(rewardEnv, enemy, zone));
  }
  function callOceanGuardianAdds(say) {
    return runSettlementCommands(killCallOceanGuardianAdds(rewardEnv), { say });
  }
  function autoRediveOceanAfterClear(clearedZone) {
    return killAutoRediveOceanAfterClear(rewardEnv, clearedZone);
  }
  function resolvePlayerApproachTarget(alive) {
    return killResolvePlayerApproachTarget(rewardEnv, alive);
  }
  function getGrandBreachRewardSummary(kills) {
    return killGetGrandBreachRewardSummary(kills);
  }
  function handleEnemyDeath(enemy, pStats) {
    return runSettlementCommands(killHandleEnemyDeath(rewardEnv, enemy, pStats));
  }
  var lootUiEnv = { get owner() {
    return game;
  }, deps: {
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get battleFxSuppressed() {
      return battleFxSuppressed;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get receiveKnittingYarn() {
      return receiveKnittingYarn;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get announceWildTalisman() {
      return announceWildTalisman;
    },
    get atlasFinds() {
      return atlasFinds;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get addLog() {
      return addLog;
    },
    get colonyWardsUi() {
      return colonyWardsUi;
    },
    get formatValue() {
      return formatValue;
    },
    get getStyledOrbName() {
      return typeof getStyledOrbName === "undefined" ? void 0 : getStyledOrbName;
    }
  } };
  function keepEquipmentDrop(enemy, item, options) {
    const result = delivery.keepEquipment(game, enemy, item, options);
    lootShowEquipmentDelivery(lootUiEnv, enemy, item, result);
    return result.status;
  }
  function receiveStumpDropRow(row) {
    dispatchRuntimeEvent("stump-box-changed", delivery.receiveStump(game, row));
  }
  function receiveDeferredRune(row) {
    dispatchRuntimeEvent("gem-loot-received", delivery.receiveRune(game, row));
  }
  function placeFloorItem(enemy, kind, item, overflow) {
    return delivery.placeItem(game, enemy, kind, { item, overflow });
  }
  function explorationFloorFor(enemy) {
    return delivery.floorFor(game, enemy);
  }
  function keepCurrencyDrop(enemy, currencyKey, amount) {
    const result = delivery.keepCurrency(game, enemy, currencyKey, amount);
    if (result.receipt) queueEnemyGroundLoot(enemy, result.receipt);
    return { gain: result.gain, floor: result.floor };
  }
  function grantEquipmentPick(enemy, zone, minimumRarity, slot) {
    return lootConsumeNotices(lootUiEnv, loot.equipment(game, enemy, zone, minimumRarity, slot));
  }
  function grantRootWeaponPick(enemy, zone) {
    return lootConsumeNotices(lootUiEnv, loot.rootWeapon(game, enemy, zone));
  }
  function rollCurrencyAndGear(enemy, zone, itemChance) {
    return drops.currencyAndGear(enemy, zone, itemChance);
  }
  function grantEnemyLoot(enemy) {
    return combatLootReceipts.capture(game, () => {
      for (const part of enemy.cerberusRewards || []) rollLootForEnemy({ ...part, gx: enemy.gx, gy: enemy.gy }, addLog);
      atlasRun.onKill(enemy);
      roomInvaders.grantExtraLoot(enemy);
      return rollLootForEnemy(enemy, addLog);
    });
  }
  function awardEnemyLootCurrency(key, amount, source = "reward") {
    return delivery.awardCurrency(game, key, amount, source);
  }
  function rollEnemyAttackGem(awakening, boss) {
    return drops.attackRune(awakening, boss);
  }
  function ownedAndReservedRuneState() {
    return delivery.reservedRuneState(game);
  }
  function rollKnittingYarn(enemy, zone) {
    const id = delivery.rollYarn(game, enemy, zone);
    if (id) receiveKnittingYarn(id);
  }
  function queueEnemyGroundLoot(enemy, receipt) {
    return lootQueueGroundReceipt(lootUiEnv, enemy, receipt);
  }
  function getJewelLootColor(jewel) {
    return lootJewelColor(jewel);
  }
  function collectExplorationFloorLoot(rows) {
    return lootConsumeFloorPickup(lootUiEnv, delivery.collect(game, rows));
  }
  function rollLootForEnemy(enemy, say = addLog) {
    return lootConsumeRoll(lootUiEnv, loot.roll(game, enemy), say);
  }
  safeExposeGlobals({ handleEnemyDeath, getEnemyExperienceReward, grantExpAndGem, awardLevelPassivePoint, applyGrandBreachMobTuning, isMapProgressHeld, isVoidRiftCombatZone, applyVoidRiftMobTuning, queueEnemyGroundLoot, getJewelLootColor, keepEquipmentDrop, collectExplorationFloorLoot, receiveStumpDropRow, receiveDeferredRune, placeFloorItem, explorationFloorFor, keepCurrencyDrop, grantEquipmentPick, grantRootWeaponPick, rollCurrencyAndGear, grantEnemyLoot, awardEnemyLootCurrency, rollEnemyAttackGem, ownedAndReservedRuneState, rollLootForEnemy, rollKnittingYarn, clearDotFxThrottleForEnemy, grantLoopStarterWeaponOnFirstKill, resolveEnemyDeath, countKillForContent, tickTalentKillRuntime, rollRandomVoidRiftOnKill, explodeCorpsesOnKill, applyUniqueKillEffects, getOverkillSplash, advanceColonyWaveOnKill, finishGrandBreachOnBossKill, flagHeavyUiAfterKill, transferSkillDotOnDeath, getRangerWeakpointBonus, ensureNextEndlessChaosDepthUnlocked, onChaos20Cleared, enterAutomaticMapInterruptionAfterClear, callOceanGuardianAtBoundary, noteOceanKill, callOceanGuardianAdds, autoRediveOceanAfterClear, resolvePlayerApproachTarget, getTrialSkillGemRewardChance, getGrandBreachRewardSummary, grantUnderworldFloorMilestone, finishEncounterRun, finishBeyondBoundaryEncounter, finishMeteorEncounter, finishOutsideChaosEncounter, finishOceanEncounter, finishChaosRealmEncounter, finishSkyTowerEncounter, finishTimeRiftEncounter, finishTimeRiftFusion, finishTrialEncounter, finishSeasonBossEncounter, grantSeasonBossRewards, departSeasonBoss, finishLabyrinthEncounter, finishUnderworldEncounter, finishCosmosEncounter, finishZoneClear });
})();
