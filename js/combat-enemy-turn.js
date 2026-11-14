// GENERATED from modules/combat-enemy-turn*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/combat-defeat.mjs
  var DEFEAT_RECOVERY_SECONDS = 3;
  function stateGetOceanDiveDefeat(c, zone) {
    return zone.id === c.deps.OCEAN_ZONE_ID && (c.deps.isAutoOceanDive(c.deps.ensureOceanState()) || c.owner.oceanBossRunPending) ? stateDefeatInOceanDive : null;
  }
  function stateDefeatReturnZone(c, returnZoneId) {
    return returnZoneId !== void 0 && returnZoneId !== null ? returnZoneId : c.deps.getDefeatRecoveryZoneId();
  }
  var CONTENT_DEFEAT_BY_KIND = Object.freeze({
    beyondBoundary: stateDefeatBeyondBoundary,
    meteor: stateDefeatAtMeteor,
    timeRift: stateDefeatInTimeRift,
    trial: stateDefeatInTrial,
    underworld: stateDefeatOnUnderworldFloor
  });
  function stateNoteCampaignResistPenalty(c, zoneId) {
    if (!c.deps.CAMPAIGN_RESIST_PENALTY.zones.includes(zoneId)) return;
    const each = c.deps.CAMPAIGN_RESIST_PENALTY.each, total = c.deps.getCampaignResistPenalty(zoneId);
    const more = total > each ? c.deps._t(" 더 낮아졌습니다(모두 합쳐 -{total}%)", { total }) : " 낮아졌습니다";
    c.deps.queueTutorialNotice(
      `notice_resist_penalty_${zoneId}`,
      c.deps._t("모든 저항 -{total}%", { total }),
      `캠페인 패널티로 모든 원소 저항과 카오스 저항이 ${each}%${more}.
저항이 모자라면 받는 피해가 커집니다. 캐릭터 창의 저항에서 볼 수 있습니다.`,
      "tab-character"
    );
  }
  function stateHoldActRetreat(c, zone) {
    const retreat = c.owner.actRetreat;
    if (!retreat) return false;
    if (c.owner.level >= retreat.level + c.deps.ACT_RETREAT_LEVELS || zone.id !== retreat.frontierZoneId - 1) {
      c.owner.actRetreat = null;
      return false;
    }
    c.owner.currentZoneId = zone.id;
    return true;
  }
  function stateApplyActRestRecovery(c, pStats, hpCap) {
    if (c.owner.playerHp <= 0 || c.owner.playerHp >= hpCap) return;
    if (c.deps.getZone(c.owner.currentZoneId)?.type !== "act") return;
    if ((c.owner.enemies || []).some((enemy) => enemy && enemy.hp > 0)) return;
    c.owner.playerHp = Math.min(hpCap, c.owner.playerHp + pStats.maxHp * c.deps.ACT_REST_RECOVERY_PCT_PER_SEC / 100 * 0.1);
  }
  function* stateHandlePlayerDefeat(c, zone, pStats, message, options) {
    c.deps.actExplorationProgress.defeat(c.owner);
    let opts = options || {};
    c.deps.recordPlayerDefeatStart(zone, opts);
    let expLost = 0;
    c.owner.loopDeaths = Math.max(0, Math.floor(c.owner.loopDeaths || 0)) + 1;
    if (typeof c.deps.recordImmortalHeroDeathPenalty === "function") c.deps.recordImmortalHeroDeathPenalty();
    const defeatUi = { say: c.deps.addLog, get exitBeehiveRun() {
      return typeof c.deps.exitBeehiveRun === "function" ? c.deps.exitBeehiveRun : null;
    } };
    const contentDefeat = stateGetContentDefeat(c, zone);
    if (contentDefeat) expLost = contentDefeat(c, zone, message, opts, defeatUi) || 0;
    else expLost = stateApplyDeathExpPenalty(c, message, opts, defeatUi);
    c.owner.lastDeathLog = stateBuildPlayerDeathLog(c, zone, opts, expLost, pStats);
    if (c.owner.lastDeathLog.retreatZoneName) c.deps.addLog(c.deps._t("🛡️ {retreatZoneName} 물러나 레벨을 {ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.", { retreatZoneName: c.deps.withDirectionParticle(c.owner.lastDeathLog.retreatZoneName), ACT_RETREAT_LEVELS: c.deps.ACT_RETREAT_LEVELS }), "season-up");
    if (c.owner.settings.showDeathNotice !== false) yield { kind: "requestDeathReport", args: [c.owner.lastDeathLog] };
    c.owner.playerHp = c.deps.getPlayerHpCap(pStats);
    c.deps.atlasRun.defeat(zone);
    c.deps.startMoving(false);
    stateHoldAfterDefeat(c);
    c.deps.updateStaticUI();
    c.deps.queueImportantSave(160);
  }
  function stateHoldAfterDefeat(c) {
    if (c.owner.isBackgroundCalculation) return;
    c.owner.moveTimer = c.owner.moveTotalTime = Math.max(c.owner.moveTimer || 0, DEFEAT_RECOVERY_SECONDS);
  }
  function stateGetContentDefeat(c, zone) {
    if (!zone) return null;
    return stateGetRunDefeat(c, zone) || stateGetOceanDiveDefeat(c, zone) || stateGetContentKindDefeat(c, zone);
  }
  function stateGetRunDefeat(c, zone) {
    if (zone.id === c.deps.OUTSIDE_CHAOS_ZONE_ID) return stateDefeatAgainstWoodsman;
    if (zone.id === "colony_run" && c.owner.colony && c.owner.colony.inRun) return stateDefeatInColony;
    if (zone.id === "beehive_run" && c.owner.beehive && c.owner.beehive.inRun) return stateDefeatInBeehive;
    return zone.id === "grand_breach_run" ? stateDefeatInGrandBreach : null;
  }
  function stateGetContentKindDefeat(c, zone) {
    if (zone.type === "seasonBoss") return c.owner.inTicketBossFight ? stateDefeatInRootBossFight : null;
    return Object.hasOwn(CONTENT_DEFEAT_BY_KIND, zone.type) ? CONTENT_DEFEAT_BY_KIND[zone.type] : null;
  }
  function stateDefeatInOceanDive(c, zone, message, opts, ui) {
    const guardian = !!c.owner.oceanBossRunPending;
    const fallback = guardian ? "☠️ 심해 가디언에게 쓰러져 수면으로 올라왔습니다." : "☠️ 자동 재잠수로 들어간 잠수에서 쓰러졌습니다.";
    ui.say(message || fallback, "death", { noToast: !!opts.noToast });
    stateClearDefeatedEncounter(c);
    c.deps.forceSurfaceOcean(guardian ? "guardian" : "defeat");
  }
  function stateClearDefeatedEncounter(c) {
    if (c.deps.actExplorationState.current(c.owner)) c.deps.actExplorationState.retireCombat(c.owner);
    else c.owner.enemies = [];
    c.owner.encounterPlan = [];
    c.owner.encounterIndex = 0;
    c.owner.runProgress = 0;
  }
  function stateDefeatAgainstWoodsman(c, zone, message, opts, ui) {
    let woodsman = (c.owner.enemies || []).find((e) => e && e.isBoss);
    if (woodsman && woodsman.maxHp > 0) {
      let dealtRatio = Math.max(0, Math.min(0.999, 1 - woodsman.hp / woodsman.maxHp));
      let score = Math.floor(dealtRatio * 1e6);
      c.deps.addWoodsmanPendingScore(score);
      c.deps.maybeUnlockChaosRealmFromWoodsman(woodsman, { log: true, finalize: true });
      ui.say(c.deps._t("🪓 나무꾼 전투 정산 대기 점수 +{score} (루프 정산 시 반영)", { score }), "season-up");
    }
    c.deps.clearWoodsmanBuildLock();
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
  }
  function stateDefeatInColony(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 군락지 방어전에서 패배했습니다.", "death", { noToast: !!opts.noToast });
    c.deps.colonyRun.recordEnd("defeat");
    c.deps.actExplorationState.groundLoot.discardEncounter(c.owner, "colony_run");
    c.owner.colony.inRun = false;
    c.owner.colony.lootPending = false;
    c.owner.colony.bossLootCell = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, c.owner.colony.returnZoneId);
    c.owner.colony.returnZoneId = null;
    stateClearDefeatedEncounter(c);
    c.owner.killsInZone = 0;
  }
  function stateDefeatInBeehive(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 벌집 전투에서 패배했습니다. 원정이 즉시 종료됩니다.", "death", { noToast: !!opts.noToast });
    const exitRun = ui.exitBeehiveRun;
    if (exitRun) {
      exitRun("", "death");
      return;
    }
    c.owner.beehive.inRun = false;
    c.owner.beehive.awaitingClear = false;
    c.owner.beehive.pendingChoice = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, c.owner.beehive.returnZoneId);
    c.owner.beehive.returnZoneId = null;
    stateClearDefeatedEncounter(c);
    c.owner.killsInZone = 0;
  }
  function stateDefeatInGrandBreach(c, zone, message, opts, ui) {
    let v = c.owner.voidRift || (c.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let grand = v.grandRun || {};
    ui.say(message || "☠️ 대균열에서 패배했습니다. 균열이 닫히며 추방됩니다.", "death", { noToast: !!opts.noToast });
    c.deps.actExplorationState.groundLoot.discardEncounter(c.owner, "grand_breach_run");
    v.grandRun = { ...grand, inRun: false, phase: "failed" };
    stateClearDefeatedEncounter(c);
    c.owner.currentZoneId = grand.returnZoneId !== void 0 ? grand.returnZoneId : c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
  }
  function stateDefeatBeyondBoundary(c, zone, message, opts, ui) {
    let returnZoneId = c.deps.abandonBeyondBoundaryRun(c.owner);
    ui.say(message || "경계 너머 도전에 실패했습니다. 진행 중이던 단계가 종료됩니다.", "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = stateDefeatReturnZone(c, returnZoneId);
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
  }
  function stateDefeatAtMeteor(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 운석 낙하 지점에서 패배했습니다. 운석 지점이 닫힙니다.", "death", { noToast: !!opts.noToast });
    let st = c.deps.ensureMeteorSiteState();
    st.activeMeteorTier = null;
    st.kind = null;
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, returnZoneId);
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
  }
  function stateDefeatInTimeRift(c, zone, message, opts, ui) {
    Object.assign(c.deps.ensureTimeRiftState(), { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    ui.say(zone.riftPhase === "past" ? "시간의 균열(과거)에서 사망했습니다." : "시간의 균열(미래)에서 사망했습니다. 제단의 아이템이 산산조각났습니다.", "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
  }
  function stateDefeatInRootBossFight(c, zone, message, opts, ui) {
    let fallbackMessage = zone.milestonePinnacle ? "☠️ 최종 관문 도전에 실패했습니다. 장비와 방어를 정비해 다시 도전하세요." : "☠️ 뿌리 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.";
    ui.say(message || fallbackMessage, "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = 0;
    c.owner.killsInZone = 0;
    c.owner.inTicketBossFight = false;
  }
  function stateDefeatInTrial(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 시련 실패! 마을로 귀환합니다.", "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
  }
  function stateDefeatOnUnderworldFloor(c, zone, message, opts, ui) {
    const lost = stateApplyDeathExpPenalty(c, message, opts, ui);
    const uw = c.owner.underworldProgress, floor = Math.floor(Number(zone.floor) || 0);
    if (!uw || floor <= 1 || !["nextZone", "nextLoopBestPlusOne"].includes(c.owner.settings.mapCompleteAction || "nextZone")) return lost;
    uw.currentFloor = floor - 1;
    ui.say(c.deps._t("🛡️ 지하계 {value}층으로 물러나 다시 내려갑니다.", { value: floor - 1 }), "season-up");
    return lost;
  }
  function stateApplyDeathExpPenalty(c, message, opts, ui) {
    let expPenalty = Math.floor(c.deps.getExpReq(c.owner.level) * 0.1);
    ui.say(message || "☠️ 사망! 경험치 페널티 적용", "death", { noToast: !!opts.noToast });
    let expBeforePenalty = Math.max(0, Math.floor(Number(c.owner.exp) || 0));
    c.owner.exp = Math.max(0, expBeforePenalty - expPenalty);
    return expBeforePenalty - c.owner.exp;
  }
  function stateBuildPlayerDeathLog(c, zone, opts, expLost, pStats) {
    let damageSummary = c.deps.buildDeathDamageSummary(3e3);
    let primaryEntry = damageSummary[0] || null;
    let primaryElement = primaryEntry ? primaryEntry.ele : c.deps.normalizeDamageElementKey(opts.fatalElement);
    return {
      at: c.deps.getCombatTime(),
      zoneName: zone && zone.name ? zone.name : "알 수 없는 지역",
      expLost,
      primaryElement,
      fatalElement: opts.fatalElement,
      reasonText: c.deps.DEATH_REASON_TEXT[primaryElement] || c.deps.DEATH_REASON_TEXT.phys,
      damageSummary,
      ailmentDamageSummary: c.deps.buildDeathDamageSummary(3e3, { ailmentOnly: true }),
      monsterSummary: c.deps.buildDeathMonsterSummary(3e3),
      activeAilments: c.deps.snapshotPlayerAilmentsForDeathLog(),
      sourceName: opts.sourceName || "",
      retreatZoneName: c.deps.retreatAfterActDefeat(zone),
      maxLife: Math.max(1, Math.floor(c.deps.getPlayerHpCap(pStats))),
      fight: c.deps.takeDeathFightSummary()
    };
  }
  function createCombatDefeat(deps) {
    return Object.freeze({
      noteCampaignResistPenalty: (owner, zoneId) => stateNoteCampaignResistPenalty({ owner, deps }, zoneId),
      holdActRetreat: (owner, zone) => stateHoldActRetreat({ owner, deps }, zone),
      applyActRestRecovery: (owner, pStats, hpCap) => stateApplyActRestRecovery({ owner, deps }, pStats, hpCap),
      handlePlayerDefeat: (owner, zone, pStats, message, options) => stateHandlePlayerDefeat({ owner, deps }, zone, pStats, message, options),
      holdAfterDefeat: (owner) => stateHoldAfterDefeat({ owner, deps }),
      defeatInOceanDive: (owner, zone, message, opts, ui) => stateDefeatInOceanDive({ owner, deps }, zone, message, opts, ui),
      clearDefeatedEncounter: (owner) => stateClearDefeatedEncounter({ owner, deps }),
      defeatInGrandBreach: (owner, zone, message, opts, ui) => stateDefeatInGrandBreach({ owner, deps }, zone, message, opts, ui),
      defeatBeyondBoundary: (owner, zone, message, opts, ui) => stateDefeatBeyondBoundary({ owner, deps }, zone, message, opts, ui),
      defeatAtMeteor: (owner, zone, message, opts, ui) => stateDefeatAtMeteor({ owner, deps }, zone, message, opts, ui),
      defeatInTimeRift: (owner, zone, message, opts, ui) => stateDefeatInTimeRift({ owner, deps }, zone, message, opts, ui),
      defeatInRootBossFight: (owner, zone, message, opts, ui) => stateDefeatInRootBossFight({ owner, deps }, zone, message, opts, ui),
      defeatInTrial: (owner, zone, message, opts, ui) => stateDefeatInTrial({ owner, deps }, zone, message, opts, ui),
      defeatOnUnderworldFloor: (owner, zone, message, opts, ui) => stateDefeatOnUnderworldFloor({ owner, deps }, zone, message, opts, ui),
      defeatReturnZone: (owner, returnZoneId) => stateDefeatReturnZone({ owner, deps }, returnZoneId)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/domain/enemy-engagement.mjs
  function stateColonyRunEndedDuringAttacks(c, zone) {
    return zone.type === "colony" && !c.owner.colony?.inRun;
  }
  function stateGetColonyDefenseCoreTarget(c) {
    const run = c.deps.getColonyRoomRun();
    if (!c.owner.colony?.inRun || !run) return null;
    const core = c.deps.actExplorationMap.forRun(run).colonyDefense?.core;
    return core ? { ...core, isColonyCore: true } : null;
  }
  function stateNearestEnemyCombatTarget(c, enemy, initial, reach) {
    let best = initial, distance = c.deps.getGridUnitDistance(enemy, initial);
    const candidates = [c.owner.gridPlayer, ...(c.owner.summons || []).filter((unit) => unit && unit.alive && !unit.isGhost && unit.hp > 0)];
    for (const unit of candidates) {
      if (!c.deps.hasGridCell(unit)) continue;
      const next = c.deps.getGridUnitDistance(enemy, unit);
      if (next >= distance || next > reach) continue;
      best = unit;
      distance = next;
    }
    return best;
  }
  function stateGetEnemyPreferredGridTarget(c, enemy) {
    const player = c.owner.gridPlayer;
    if (!c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(player)) return player;
    const core = stateGetColonyDefenseCoreTarget(c);
    if (!core) return stateNearestEnemyCombatTarget(c, enemy, player, Infinity);
    if (!enemy.isBoss && !enemy.isSeveredWanderer && enemy.monsterVisualSetId === "colony" && enemy.monsterVisualId === "colony-borer-grub")
      return stateNearestEnemyCombatTarget(c, enemy, core, 1);
    const reach = Math.max(2, Math.min(5, Number(enemy.attackRange) || 1));
    return stateNearestEnemyCombatTarget(c, enemy, core, reach);
  }
  function stateIsEnemyInGridAttackRange(c, enemy, target) {
    target = target || c.owner.gridPlayer;
    if (!c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(target)) return true;
    let range = Number.isFinite(enemy.attackRange) ? enemy.attackRange : c.deps.COMBAT_GRID_CONFIG.bossAttackRange;
    return c.deps.getGridUnitDistance(enemy, target) <= range && c.deps.enemyAttackRules.meleeReach(enemy, target);
  }
  function stateCanBossCastFromAfar(c, enemy, target) {
    if (!enemy.isBoss || enemy.roomInvader || !c.deps.hasGridCell(enemy) || !c.deps.hasGridCell(target)) return false;
    const next = c.deps.getBossPatternPreview(enemy);
    return !!next && next.isSpecial === true && c.deps.getGridUnitDistance(enemy, target) <= c.deps.BOSS_REACH.castRange;
  }
  function stateCanEnemyAttackFromHere(c, enemy, target) {
    if (c.deps.woodsmanBattle.owns(enemy)) return true;
    return stateIsEnemyInGridAttackRange(c, enemy, target) || stateCanBossCastFromAfar(c, enemy, target || c.owner.gridPlayer);
  }
  function stateAdvanceEnemyGridApproach(c, enemy, target, slowPct) {
    if (typeof target === "number") {
      slowPct = target;
      target = c.owner.gridPlayer;
    }
    target = target || c.owner.gridPlayer;
    if (c.deps.enemyAmbush.tryBlink(enemy, target)) return;
    let slow = Math.max(0, Math.min(0.9, slowPct || 0));
    let interval = c.deps.getGridUnitStepSec(enemy) / (1 - slow);
    c.deps.advanceGridUnitMovement(enemy, target, 0.1, interval);
  }
  function stateGetSummonRespawnAt(c, summon, shortened) {
    let baseMs = Math.max(4e3, Math.floor(summon && summon.respawnMs || 8e3));
    let delayMs = shortened ? Math.floor(baseMs * 0.7) : baseMs;
    return c.deps.getCombatTime() + delayMs;
  }
  function stateGetClosestLivingSummonToPlayer(c) {
    let player = c.owner.gridPlayer;
    return (c.owner.summons || []).filter((summon) => summon && !summon.isGhost && summon.alive && summon.hp > 0).sort((a, b) => {
      let aDist = c.deps.hasGridCell(player) && c.deps.hasGridCell(a) ? c.deps.getGridUnitDistance(player, a) : Infinity;
      let bDist = c.deps.hasGridCell(player) && c.deps.hasGridCell(b) ? c.deps.getGridUnitDistance(player, b) : Infinity;
      return aDist - bDist || a.id - b.id;
    })[0] || null;
  }
  function mitigateSummonHit(summon, rawDamage, attackElement) {
    let damage = Math.max(1, Math.floor(rawDamage || 1));
    if (attackElement === "phys") {
      let armorReduction = Math.min(85, (summon.armor || 0) / ((summon.armor || 0) + damage * 8) * 100);
      damage = Math.max(1, Math.floor(damage * (1 - armorReduction / 100)));
    } else {
      let resKey = { fire: "resFire", cold: "resCold", light: "resLight", chaos: "resChaos" }[attackElement];
      let resistance = resKey ? Math.max(-60, Math.min(85, Number(summon[resKey]) || 0)) : 0;
      damage = Math.max(1, Math.floor(damage * (1 - resistance / 100)));
    }
    return Math.min(damage, summon.hp);
  }
  function stateApplyMonsterDamageToSummon(c, input) {
    const { summon, rawDamage, enemy, pStats, bossPattern } = input;
    if (summon && summon.isGhost) return 0;
    let evade = c.deps.getSummonEvadeChance(summon, enemy);
    if (c.deps.resolveEntropyEvasion(summon, evade, c.deps.getCombatTime())) return 0;
    const attackElement = c.deps.enemyAttackRules.element(enemy, bossPattern);
    const damage = mitigateSummonHit(summon, rawDamage, attackElement);
    summon.hp = Math.max(0, summon.hp - damage);
    if (damage > 0) {
      c.deps.addBattleFx("summonHit", {
        summonId: summon.id,
        damage,
        element: attackElement,
        duration: 260
      });
    }
    if (summon.hp > 0) return damage;
    summon.alive = false;
    summon.respawnAt = stateGetSummonRespawnAt(c, summon, false);
    recordSummonDeathBuff(c, pStats.uniqueSummonDeathDamageBuff);
    return damage;
  }
  function recordSummonDeathBuff(c, config) {
    if (config) {
      c.owner.summonDeathDamageBuffPct = Math.max(Number(c.owner.summonDeathDamageBuffPct || 0), Math.max(0, Number(config.pct || 40)));
      c.owner.summonDeathDamageBuffExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(config.duration || 4)) * 1e3;
    }
  }
  function stateDispatchMonsterHitTargets(c, input) {
    const { targets, damage, enemy, pStats, bossPattern } = input;
    const coreHit = targets.some((unit) => unit.isColonyCore);
    if (coreHit) stateStrikeColonyDefenseCore(c, damage);
    if (coreHit && !c.owner.colony?.inRun) return false;
    targets.filter((unit) => unit !== c.owner.gridPlayer && !unit.isColonyCore).forEach((summon) => stateApplyMonsterDamageToSummon(c, { summon, rawDamage: damage, enemy, pStats, bossPattern }));
    return targets.includes(c.owner.gridPlayer);
  }
  function stateStrikeColonyDefenseCore(c, damage) {
    const colony = c.owner.colony;
    if (!colony?.inRun || colony.coreHp <= 0) return;
    colony.coreHp = Math.max(0, colony.coreHp - Math.max(1, Math.floor(Number(damage) || 1)));
    if (colony.coreHp === 0) c.deps.failColonyDefense();
  }
  function stateGetMonsterBaseHitDamage(c, zone, seasonDepth, tierPressure, benchmarkProfile) {
    let seasonDmgScale = c.deps.getMonsterLoopGrowthScale(zone, "damage", seasonDepth, tierPressure);
    let dmg = Math.floor((2.4 + zone.tier * 3.35) * 1.15 * seasonDmgScale);
    if (benchmarkProfile) dmg = Math.floor(dmg * benchmarkProfile.damage);
    else if (zone.type === "underworld") dmg = Math.floor(dmg * 0.78 * c.deps.getUnderworldEnemyDamageMultiplier(zone));
    if (zone.type === "skyTower") dmg = Math.floor(dmg * 1.08);
    return Math.max(1, Math.floor(dmg * c.deps.getMonsterLoopPowerScale(zone, "damage")));
  }
  function stateUpdateMeteorHeartPhase(c, enemy, zone, pendingAttack) {
    if (zone.type !== "meteor" || enemy.monsterVisualId !== "meteor-heart" || enemy.patternMode !== "slam" || enemy.hp > enemy.maxHp / 2 || enemy.patternTelegraphKey || enemy.patternArea || enemy.attackCast || pendingAttack || c.deps.pendingEnemyCombatAttacks.some((row) => row.enemyId === enemy.id)) return;
    enemy.patternMode = "coreFrenzy";
    enemy.nextPatternState = null;
  }
  function statePrepareMonsterAttackShield(c, pStats) {
    if (!Number.isFinite(c.owner.playerEnergyShield)) c.owner.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    c.owner.playerEnergyShield = Math.max(0, Math.min(Math.floor(Number(c.owner.playerEnergyShield) || 0), c.deps.getPlayerEnergyShieldRecoveryCap(pStats)));
  }
  function stateApplyGuardianEnduranceReflect(c, enemy, remaining, pStats) {
    let stacks = Math.max(0, Math.min(5, Math.floor(c.owner.guardianEnduranceStacks || 0))) + 1;
    c.owner.guardianEnduranceExpiresAt = c.deps.getCombatTime() + 4e3;
    if (stacks < 5) {
      c.owner.guardianEnduranceStacks = stacks;
      return;
    }
    let reflect = Math.max(1, Math.floor((pStats.guardianReflectDamage || 1) + remaining));
    c.deps.applyDamageToEnemyResource(enemy, reflect);
    c.deps.addBattleFx("hit", { enemyId: enemy.id, color: c.deps.getElementColor("phys"), damage: reflect, duration: 260, element: "phys", syncToSwing: false });
    c.owner.guardianEnduranceStacks = 2;
    if (enemy.hp <= 0) c.deps.handleEnemyDeath(enemy, pStats);
  }
  function stateResolveObserverFatal(c, attack, zone, stats) {
    if (!attack?.observerFatal) return false;
    const sourceName = c.deps.enemyAttackRules.damageName(attack.source, attack.bossPattern);
    c.deps.recordIncomingDamage("chaos", c.owner.playerHp, sourceName);
    c.owner.playerHp = 0;
    c.deps.lose(c.owner, zone, stats, null, { fatalElement: "chaos", sourceName });
    return true;
  }
  function createEnemyEngagement(deps) {
    return Object.freeze({
      getColonyDefenseCoreTarget: (owner) => stateGetColonyDefenseCoreTarget({ owner, deps }),
      getEnemyPreferredGridTarget: (owner, enemy) => stateGetEnemyPreferredGridTarget({ owner, deps }, enemy),
      isEnemyInGridAttackRange: (owner, enemy, target) => stateIsEnemyInGridAttackRange({ owner, deps }, enemy, target),
      canEnemyAttackFromHere: (owner, enemy, target) => stateCanEnemyAttackFromHere({ owner, deps }, enemy, target),
      advanceEnemyGridApproach: (owner, enemy, target, slowPct) => stateAdvanceEnemyGridApproach({ owner, deps }, enemy, target, slowPct),
      getSummonRespawnAt: (owner, summon, shortened) => stateGetSummonRespawnAt({ owner, deps }, summon, shortened),
      getClosestLivingSummonToPlayer: (owner) => stateGetClosestLivingSummonToPlayer({ owner, deps }),
      applyMonsterDamageToSummon: (owner, input) => stateApplyMonsterDamageToSummon({ owner, deps }, input),
      dispatchMonsterHitTargets: (owner, input) => stateDispatchMonsterHitTargets({ owner, deps }, input),
      getMonsterBaseHitDamage: (owner, zone, seasonDepth, tierPressure, benchmarkProfile) => stateGetMonsterBaseHitDamage({ owner, deps }, zone, seasonDepth, tierPressure, benchmarkProfile),
      updateMeteorHeartPhase: (owner, enemy, zone, pendingAttack) => stateUpdateMeteorHeartPhase({ owner, deps }, enemy, zone, pendingAttack),
      prepareMonsterAttackShield: (owner, pStats) => statePrepareMonsterAttackShield({ owner, deps }, pStats),
      applyGuardianEnduranceReflect: (owner, enemy, remaining, pStats) => stateApplyGuardianEnduranceReflect({ owner, deps }, enemy, remaining, pStats),
      resolveObserverFatal: (owner, attack, zone, stats) => stateResolveObserverFatal({ owner, deps }, attack, zone, stats),
      colonyRunEndedDuringAttacks: (owner, zone) => stateColonyRunEndedDuringAttacks({ owner, deps }, zone)
    });
  }

  // modules/domain/combat-hazards.mjs
  function stateIsApexFight(c) {
    return c.owner.enemies.some((enemy) => enemy.hp > 0 && enemy.patternMode === "apex");
  }
  function stateGroundHazardCells(c) {
    return (c.deps.trialHazardRuntime.ground || []).flatMap((ground) => ground.cells);
  }
  function stateTrialTrapName(zone) {
    return zone.trapName || "시련 함정";
  }
  function stateIsAnyEnemyAlive(c) {
    return (c.owner.enemies || []).some((enemy) => enemy && enemy.hp > 0);
  }
  function stateCalculateTrialTrapDamage(c, zone, pStats, trapElement) {
    let resistanceKey = { fire: "resF", cold: "resC", light: "resL", chaos: "resChaos" }[trapElement];
    let baseDamage = pStats.maxHp * (0.035 + zone.tier * 5e-3) + 10 + zone.tier * 3;
    let damageMultiplier = Math.max(0.1, Number(zone.trapDamageMul) || 1);
    let scaledDamage = Math.floor(baseDamage * damageMultiplier);
    let physicalMitigation = (Number(pStats.dr) || 0) + c.deps.getArmorPhysicalReductionPct(pStats.armor, scaledDamage);
    let mitigation2 = trapElement === "phys" ? physicalMitigation : Number(pStats[resistanceKey]) || 0;
    return Math.max(10, Math.floor(scaledDamage * (1 - Math.max(-60, Math.min(85, mitigation2)) / 100)));
  }
  function stateGetBloomTrialRegenSuppressNext(zone, currentSuppress) {
    let gain = Math.max(0, Number(zone && zone.trapRegenSuppressPct) || 0) / 100;
    let requestedCap = Number(zone && zone.trapRegenSuppressCap);
    let cap = Number.isFinite(requestedCap) ? Math.max(0, Math.min(0.95, requestedCap)) : 0.95;
    return Math.min(cap, Math.max(0, Number(currentSuppress) || 0) + gain);
  }
  function stateBuildTrialHazardCells(c, zone, origin, sequence) {
    const { columns, rows } = c.deps.getCombatGridSize(), { pattern, reach } = c.deps.getTrialHazardProfile(zone);
    const cells = [], seen = /* @__PURE__ */ new Set();
    const push = (gx, gy) => {
      const key = c.deps.gridCellKey(gx, gy);
      if (!c.deps.isGridCellInBounds(gx, gy) || seen.has(key)) return;
      seen.add(key);
      cells.push({ gx, gy });
    };
    const band = (horizontal) => {
      for (let offset = -reach; offset <= reach; offset++) {
        for (let index = 0; index < (horizontal ? columns : rows); index++) {
          if (horizontal) push(index, origin.gy + offset);
          else push(origin.gx + offset, index);
        }
      }
    };
    if (pattern === "line") {
      band(sequence % 2 === 0);
      return cells;
    }
    if (pattern === "cross") {
      band(true);
      band(false);
      return cells;
    }
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        if (pattern !== "pool" || Math.abs(dx) + Math.abs(dy) <= reach) push(origin.gx + dx, origin.gy + dy);
      }
    }
    return cells;
  }
  function stateCreateTrialHazard(c, zone, now) {
    let index = Math.max(0, Math.floor(c.owner.trialHazardIndex || 0));
    let elements = Array.isArray(zone.trapElements) && zone.trapElements.length > 0 ? zone.trapElements : ["phys"];
    let element = elements[index % elements.length];
    let profile = c.deps.getTrialHazardProfile(zone);
    const terrain = c.deps.getGridPlacementTerrain();
    let cells = stateBuildTrialHazardCells(c, zone, c.owner.gridPlayer, index).filter((cell) => c.deps.canPlaceGridFootprint(/* @__PURE__ */ new Set(), cell.gx, cell.gy, { columns: 1, rows: 1 }, terrain));
    c.owner.trialHazardIndex = index + 1;
    let color = { phys: "#ffd36b", fire: "#ff754f", cold: "#86dcff", light: "#e5d35b", chaos: "#c47cff" }[element] || "#ffd36b";
    c.deps.addBattleFx("trialTrapWarning", { targetCells: cells, color, element, duration: profile.warningMs });
    const persistent = profile.persistent && !!c.deps.COMBAT_GRID_CONFIG.ground[element];
    return { cells, element, color, impactAt: now + profile.warningMs, intervalMs: profile.intervalMs, shouldAvoid: persistent, persistent };
  }
  function stateIsPlayerInsideCombatHazard(c, hazard) {
    if (!hazard || !c.deps.hasGridCell(c.owner.gridPlayer)) return false;
    let playerKey = c.deps.gridCellKey(c.owner.gridPlayer.gx, c.owner.gridPlayer.gy);
    return hazard.cells.some((cell) => c.deps.gridCellKey(cell.gx, cell.gy) === playerKey);
  }
  function stateIsTrialHazardPositionHeld(c) {
    let hazard = c.deps.trialHazardRuntime.active;
    return !!(hazard && hazard.shouldAvoid && c.deps.getCombatTime() < hazard.impactAt && !stateIsPlayerInsideCombatHazard(c, hazard));
  }
  function stateUpdateCombatHazardEscape(c, hazard, pStats, now, reason = "함정 회피") {
    if (!hazard.shouldAvoid || !stateIsPlayerInsideCombatHazard(c, hazard)) return false;
    if (c.deps.hasPlayerChannelBreakingAilment()) return true;
    if (c.deps.isPlayerAttackRecovering(now)) return true;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let interval = c.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
    let result = c.deps.advanceGridHazardEscape(c.owner.gridPlayer, hazard.cells, 0.1, interval);
    if (result.blocked || !result.moved) return true;
    c.deps.cancelCombatChannel(reason);
    let attackDelayMs = c.deps.getTacticalMoveAttackDelayMs(moveSpeed);
    c.deps.combatTacticsRuntime.attackDelayUntil = Math.max(c.deps.combatTacticsRuntime.attackDelayUntil, now + attackDelayMs);
    c.deps.addBattleFx("playerMobility", { fromCell: result.from, toCell: result.to, duration: 240 });
    return true;
  }
  function stateBossWarningApproach(c, warned) {
    if (!warned.length || !c.deps.hasGridCell(c.owner.gridPlayer)) return { hold: false, block: [] };
    const keys = new Set(warned.map((cell) => c.deps.gridCellKey(cell.gx, cell.gy)));
    return { hold: c.deps.isGridUnitInCellSet(c.owner.gridPlayer, keys), block: warned };
  }
  function stateHardHazardCells(c) {
    let cells = [];
    if (c.deps.trialHazardRuntime.active && c.deps.trialHazardRuntime.active.shouldAvoid) cells.push(...c.deps.trialHazardRuntime.active.cells);
    if (stateIsApexFight(c)) cells.push(...c.deps.getBossWarningCells(c.owner, c.deps.pendingEnemyCombatAttacks));
    return cells;
  }
  function stateUpdateCombatHazardEvasion(c, pStats) {
    if (c.owner.playerHp <= 0) return { avoiding: false, holdPosition: false };
    stateApplyTrialTrapTick(c, pStats, true);
    if (c.owner.playerHp <= 0) return { avoiding: false, holdPosition: false };
    const cells = stateHardHazardCells(c), warned = c.deps.getBossWarningCells(c.owner, c.deps.pendingEnemyCombatAttacks);
    const approach = stateIsApexFight(c) ? { hold: warned.length > 0, block: [] } : stateBossWarningApproach(c, warned);
    let holdPosition = approach.hold || stateIsTrialHazardPositionHeld(c);
    let avoiding = stateUpdateCombatHazardEscape(c, { cells, shouldAvoid: true }, pStats, c.deps.getCombatTime(), "위험 범위 회피");
    let frozen = c.owner.playerAilments.some((ail) => ail.type === "freeze" && ail.time > 0);
    return { avoiding: avoiding || frozen, holdPosition, warning: warned.length > 0, avoidCells: { hard: cells.concat(approach.block), soft: stateGroundHazardCells(c), warned: approach.block } };
  }
  function stateDealTrialTrapDamage(c, zone, pStats, hazard, trapDamage) {
    let remaining = c.deps.floorIncomingDamage(trapDamage), trapName = stateTrialTrapName(zone);
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    let energyShieldBeforeTrap = c.owner.playerEnergyShield;
    if (remaining > 0 && c.owner.playerEnergyShield > 0) {
      let absorbed = Math.min(c.owner.playerEnergyShield, remaining);
      c.owner.playerEnergyShield -= absorbed;
      remaining -= absorbed;
    }
    c.deps.triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeTrap, c.deps.getCombatTime());
    if (remaining > 0) remaining = c.deps.absorbDamageWithTalentStoneShield(remaining);
    if (remaining > 0) remaining = c.deps.absorbDamageWithRealmDeathWard(remaining, pStats);
    c.owner.playerHp = stateHpAfterTrap(c, remaining);
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    c.deps.recordIncomingDamage(hazard.element, trapDamage, trapName);
    suppressBloomRecovery(c, zone);
    stateLogTrialDamage(c, trapName, hazard, trapDamage);
    if (c.owner.playerHp <= 0) {
      c.deps.lose(c.owner, zone, pStats, c.deps._t("{trapName}에 쓰러졌습니다. 마을로 귀환합니다.", { trapName }), { fatalElement: hazard.element, sourceName: trapName, noToast: true });
    }
  }
  function suppressBloomRecovery(c, zone) {
    if (!zone.bloomTrial || !((zone.trapRegenSuppressPct || 0) > 0)) return;
    c.owner.bloomTrialRegenSuppress = stateGetBloomTrialRegenSuppressNext(zone, c.owner.bloomTrialRegenSuppress);
    c.deps.addLog(c.deps._t("혹독한 한기: 생명력 재생 억제 {round}%", { round: Math.round((c.owner.bloomTrialRegenSuppress || 0) * 100) }), "attack-monster", { noToast: true });
  }
  function stateHpAfterTrap(c, damage) {
    const hp = Math.floor(c.owner.playerHp - damage);
    return hp <= 0 && !stateIsAnyEnemyAlive(c) ? 1 : hp;
  }
  function stateLogTrialDamage(c, name, hazard, damage) {
    if (!hazard.persistent) {
      c.deps.dispatchRuntimeEvent("ground-damage", { name, element: hazard.element, damage, persistent: false });
      return;
    }
    hazard.logDamage = (hazard.logDamage || 0) + damage;
    if (c.deps.getCombatTime() < (hazard.nextLogAt || 0)) return;
    c.deps.dispatchRuntimeEvent("ground-damage", { name, element: hazard.element, damage: hazard.logDamage, persistent: true });
    hazard.logDamage = 0;
    hazard.nextLogAt = c.deps.getCombatTime() + 2e3;
  }
  function stateResolveTrialHazardImpact(c, zone, pStats, hazard, now) {
    if (hazard.persistent) {
      const rules = c.deps.COMBAT_GRID_CONFIG.ground;
      const ground = [...c.deps.trialHazardRuntime.ground || [], { ...hazard, start: now, endsAt: now + rules.durationMs }];
      c.deps.trialHazardRuntime = { nextAt: now + hazard.intervalMs, active: null, ground: ground.slice(-rules.maxAreas), nextGroundTick: now };
      return;
    }
    let playerHit = stateIsPlayerInsideCombatHazard(c, hazard);
    let barrierActive = playerHit && now < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0);
    c.deps.addBattleFx("trialTrap", {
      targetCells: hazard.cells,
      color: barrierActive ? "#c49bff" : hazard.color,
      element: hazard.element,
      duration: 760
      // eight frames of the trap's art (js/canvas-trial-traps.js): rise, hold, fall back
    });
    if (!playerHit) {
      c.deps.addBattleFx("statusText", { text: c.deps._t("함정 회피"), color: "#b8f5c4", duration: 360 });
    } else if (barrierActive) {
      c.deps.addBattleFx("statusText", { text: c.deps._t("균열 장막"), color: "#c49bff", duration: 260 });
    } else {
      stateDealTrialTrapDamage(c, zone, pStats, hazard, stateCalculateTrialTrapDamage(c, zone, pStats, hazard.element));
    }
    c.deps.trialHazardRuntime = { ...c.deps.trialHazardRuntime, nextAt: now + hazard.intervalMs, active: null };
  }
  function stateTickPersistentGround(c, zone, pStats, now) {
    const runtime = c.deps.trialHazardRuntime, rules = c.deps.COMBAT_GRID_CONFIG.ground;
    runtime.ground = (runtime.ground || []).filter((area) => now < area.endsAt);
    if (now < (runtime.nextGroundTick || 0) || !runtime.ground.length) return;
    runtime.nextGroundTick = now + rules.tickMs;
    const elements = /* @__PURE__ */ new Set();
    for (const area of runtime.ground) {
      if (elements.has(area.element) || !stateIsPlayerInsideCombatHazard(c, area)) continue;
      elements.add(area.element);
      stateApplyGroundContact(c, zone, pStats, area, now);
      if (c.owner.playerHp <= 0) return;
    }
  }
  function stateApplyGroundContact(c, zone, stats, area, now) {
    const rule = c.deps.COMBAT_GRID_CONFIG.ground[area.element];
    if (rule.ailment) c.deps.ailments.apply(c.owner, { type: rule.ailment, duration: 0.75, power: 0.5, pStats: stats });
    if (!rule.damageShare || now < (c.owner.realmInvulnerableBarrierUntil || 0)) return;
    let damage = stateCalculateTrialTrapDamage(c, zone, stats, area.element) * rule.damageShare;
    damage *= 1 - c.deps.clampNumber(stats.dotTakenDamageReducePct || 0, 0, 90) / 100;
    if (stats.uniqueArmorAppliesToDot) damage *= 1 - Math.min(0.8, stats.armor / (stats.armor + 1200));
    if (c.owner.playerAilments.some((ail) => ail.type === "shock" && ail.time > 0)) damage *= 1 + c.deps.getPlayerShockTakenDamageIncreasePct(stats) / 100;
    stateDealTrialTrapDamage(c, { ...zone, trapName: rule.name }, stats, area, Math.max(0, Math.floor(damage)));
  }
  function stateHasGroundHazard(zone) {
    return !!zone && (zone.type === "trial" || !!zone.trialHazard);
  }
  function stateSettleTrapAfterFight(c, zone, pStats, now) {
    const hazard = c.deps.trialHazardRuntime.active;
    c.deps.trialHazardRuntime.ground = [];
    c.deps.trialHazardRuntime.nextAt = Math.max(c.deps.trialHazardRuntime.nextAt, now + 500);
    if (hazard && hazard.persistent) c.deps.trialHazardRuntime.active = null;
    else if (hazard && now >= hazard.impactAt) stateResolveTrialHazardImpact(c, zone, pStats, hazard, now);
  }
  function stateApplyTrialTrapTick(c, pStats, deferEscape) {
    let zone = c.deps.getZone(c.owner.currentZoneId);
    if (!stateHasGroundHazard(zone) || c.owner.moveTimer > 0) return false;
    let now = c.deps.getCombatTime();
    if (!stateIsAnyEnemyAlive(c)) {
      stateSettleTrapAfterFight(c, zone, pStats, now);
      return false;
    }
    stateTickPersistentGround(c, zone, pStats, now);
    if (c.owner.playerHp <= 0) return false;
    scheduleTrialWarning(c, zone, now);
    let hazard = c.deps.trialHazardRuntime.active;
    if (!hazard) return false;
    if (now >= hazard.impactAt) {
      stateResolveTrialHazardImpact(c, zone, pStats, hazard, now);
      return false;
    }
    return !deferEscape && stateUpdateCombatHazardEscape(c, hazard, pStats, now);
  }
  function scheduleTrialWarning(c, zone, now) {
    if (!c.deps.trialHazardRuntime.nextAt) c.deps.trialHazardRuntime.nextAt = now + c.deps.getTrialHazardProfile(zone).initialDelayMs;
    if (!c.deps.trialHazardRuntime.active && now >= c.deps.trialHazardRuntime.nextAt) {
      c.deps.trialHazardRuntime.active = stateCreateTrialHazard(c, zone, now);
    }
  }
  function createCombatHazards(deps) {
    return Object.freeze({
      calculateTrialTrapDamage: (owner, zone, pStats, trapElement) => stateCalculateTrialTrapDamage({ owner, deps }, zone, pStats, trapElement),
      getBloomTrialRegenSuppressNext: stateGetBloomTrialRegenSuppressNext,
      buildTrialHazardCells: (owner, zone, origin, sequence) => stateBuildTrialHazardCells({ owner, deps }, zone, origin, sequence),
      createTrialHazard: (owner, zone, now) => stateCreateTrialHazard({ owner, deps }, zone, now),
      isTrialHazardPositionHeld: (owner) => stateIsTrialHazardPositionHeld({ owner, deps }),
      bossWarningApproach: (owner, warned) => stateBossWarningApproach({ owner, deps }, warned),
      updateCombatHazardEvasion: (owner, pStats) => stateUpdateCombatHazardEvasion({ owner, deps }, pStats),
      dealTrialTrapDamage: (owner, zone, pStats, hazard, trapDamage) => stateDealTrialTrapDamage({ owner, deps }, zone, pStats, hazard, trapDamage),
      resolveTrialHazardImpact: (owner, zone, pStats, hazard, now) => stateResolveTrialHazardImpact({ owner, deps }, zone, pStats, hazard, now),
      applyTrialTrapTick: (owner, pStats, deferEscape) => stateApplyTrialTrapTick({ owner, deps }, pStats, deferEscape),
      isApexFight: (owner) => stateIsApexFight({ owner, deps }),
      groundHazardCells: (owner) => stateGroundHazardCells({ owner, deps })
    });
  }

  // modules/domain/enemy-flights.mjs
  function deliveryOf(c, enemy, bossPattern) {
    return c.deps.enemyAttackRules.delivery(enemy, bossPattern);
  }
  function getEnemyCombatTargetType(c, target) {
    if (target.isColonyCore) return "colonyCore";
    return target === c.owner.gridPlayer ? "player" : "summon";
  }
  function enqueueReleasedAttack(c, enemy, target, bossPattern, delivery) {
    let sourceCell = c.deps.copyCombatGridCell(enemy);
    let targetCell = c.deps.copyCombatGridCell(target);
    if (enemy.attackCast) targetCell = enemy.attackCast.targetCell;
    if (!sourceCell || !targetCell) return false;
    let now = c.deps.getCombatTime();
    let travelMs = enemy.isBoss ? c.deps.BOSS_ATTACK_IMPACT_DELAY_MS : c.deps.getCombatTravelMs(sourceCell, targetCell);
    let targetType = getEnemyCombatTargetType(c, target);
    const attack = {
      at: now + travelMs,
      castStartAt: now,
      enemyId: enemy.id,
      source: enemy,
      sourceCell,
      targetType,
      targetId: targetType === "summon" ? target.id : null,
      targetCell,
      bossPattern: bossPattern || null,
      delivery,
      woodsmanElement: c.deps.woodsmanAttackFxElement(enemy)
    };
    const flight = c.deps.enemyAttackRules.trajectory(attack, enemy, travelMs);
    travelMs = flight.duration;
    c.deps.pendingEnemyCombatAttacks.push(attack);
    c.deps.bossMoves.begin(attack, now);
    const releaseMs = emitAttackRelease(c, enemy, bossPattern, delivery, target);
    if (delivery === "patternArea") return true;
    c.deps.addBattleFx("combatTravel", {
      owner: "enemy",
      sourceId: enemy.id,
      sourceCell,
      targetCells: [attack.targetCell],
      travelPath: flight.path,
      enemyFlight: attack,
      targetType,
      targetId: attack.targetId,
      delivery,
      element: c.deps.enemyAttackRules.element(enemy, bossPattern),
      cerberusHead: bossPattern?.cerberusHead,
      releaseDelayMs: 0,
      flightMs: travelMs,
      duration: Math.max(travelMs + 260, releaseMs)
    });
    return true;
  }
  function announceBossRelease(c, enemy, bossPattern, delivery) {
    const slam = delivery === "patternArea" && !["line", "fan"].includes(bossPattern.area.kind);
    const woodsman = c.deps.woodsmanAttackFxElement(enemy);
    c.deps.addBattleFx("bossRelease", {
      enemyId: enemy.id,
      slam,
      special: !!bossPattern?.isSpecial,
      duration: 560,
      cerberusHead: bossPattern?.cerberusHead,
      woodsman: !!woodsman,
      element: woodsman || c.deps.enemyAttackRules.element(enemy, bossPattern)
    });
  }
  function emitAttackRelease(c, enemy, bossPattern, delivery, target) {
    if (enemy.isBoss) announceBossRelease(c, enemy, bossPattern, delivery);
    const actor = c.deps.getBossStageActor(enemy);
    const remaining = actor?.attackMs ? actor.attackMs.slice(actor.impactFrame).reduce((sum, ms) => sum + ms, 0) : 0;
    const duration = Math.max(220, remaining);
    if (delivery === "instantTarget") {
      const targetCell = c.deps.copyCombatGridCell(target);
      c.deps.addBattleFx("enemyAttack", {
        enemyId: enemy.id,
        duration,
        motionMs: 220,
        targetType: target === enemy.rescue ? "rescue" : getEnemyCombatTargetType(c, target),
        targetCell
      });
      const element = c.deps.woodsmanAttackFxElement(enemy);
      if (element && targetCell) c.deps.addBattleFx("woodsmanImpact", { cells: [targetCell], element, duration: 460 });
    }
    return enemy.isBoss ? 0 : duration;
  }
  function retireReleasedAttacks(c, enemy) {
    enemy.attackTimer = 0;
    for (let i = c.deps.pendingEnemyCombatAttacks.length - 1; i >= 0; i--) {
      const row = c.deps.pendingEnemyCombatAttacks[i];
      const mine = row && (row.source ? row.source === enemy : row.enemyId === enemy.id);
      if (mine && (enemy.isBoss || row.delivery === "patternArea")) removeReleasedAttack(c, i, c.deps.getCombatTime());
    }
    if (enemy.isBoss) Object.assign(enemy, { patternArea: null, patternTelegraphKey: null, patternTelegraphStartedAt: 0, attackCast: null });
  }
  function removeReleasedAttack(c, index, now) {
    const [row] = c.deps.pendingEnemyCombatAttacks.splice(index, 1);
    c.deps.bossMoves.cut(row.bossPattern && row.bossPattern.move, now);
    for (let i = c.deps.battleFx.length - 1; i >= 0; i--) if (c.deps.battleFx[i]?.enemyFlight === row) c.deps.battleFx.splice(i, 1);
  }
  function takeReleasedAttack(c, enemyId, now) {
    let index = c.deps.pendingEnemyCombatAttacks.findIndex((row) => row && row.enemyId === enemyId);
    if (index < 0) return null;
    let attack = c.deps.pendingEnemyCombatAttacks[index];
    if (attack.source.isBoss && attack.source.hp <= 0) {
      removeReleasedAttack(c, index, now);
      return null;
    }
    if (c.deps.enemyAttackRules.cancelPending(attack, now)) {
      clearCancelledBossRecovery(attack.source, now);
      removeReleasedAttack(c, index, now);
      return null;
    }
    if (attack.at > now) return null;
    if (attack.path && !c.deps.enemyAttackRules.advanceFlight(attack, c.owner, now)) return null;
    c.deps.pendingEnemyCombatAttacks.splice(index, 1);
    if (attack.delivery === "patternArea") landBossPatternArea(c, attack, now);
    announceWoodsmanImpact(c, attack);
    return attack;
  }
  function announceWoodsmanImpact(c, attack) {
    if (!attack.woodsmanElement) return;
    const cells = attack.delivery === "patternArea" ? attack.bossPattern.area.cells : releasedAttackTargets(c, attack).map(c.deps.copyCombatGridCell).filter(Boolean);
    if (cells.length) c.deps.addBattleFx("woodsmanImpact", { cells, element: attack.woodsmanElement, duration: 460 });
  }
  function clearCancelledBossRecovery(enemy, now) {
    if (enemy.isBoss && enemy.patternMode !== "apex") enemy.apexRecoveryUntil = now;
  }
  function landBossPatternArea(c, attack, now) {
    attack.source.attackCast = null;
    const stage = c.deps.bossMoves.takeStage(attack, c.deps.pendingEnemyCombatAttacks, now);
    if (c.deps.woodsmanStumps.resolve(attack, now)) return;
    if (stage && !stage.burst) return;
    c.deps.addBattleFx("bossAreaImpact", { footprint: attack.bossPattern.area, element: attack.source.ele || "phys", duration: 560 });
  }
  function releasedAttackTargets(c, pendingAttack) {
    return pendingAttack.observerTargets || c.deps.woodsmanBattle.takeTargets(pendingAttack, c.deps.enemyAttackRules.impactTargets(pendingAttack, c.owner));
  }
  function collectAttackSources(c) {
    const sources = (c.owner.enemies || []).slice();
    c.deps.pendingEnemyCombatAttacks.forEach((row) => {
      if (row && row.at <= c.deps.getCombatTime() && row.source && !sources.some((enemy) => enemy && enemy.id === row.enemyId)) sources.push(row.source);
    });
    return sources;
  }
  function createEnemyFlights(deps) {
    return Object.freeze({
      delivery: (owner, enemy, bossPattern) => deliveryOf({ owner, deps }, enemy, bossPattern),
      queue: (owner, enemy, target, bossPattern, delivery) => enqueueReleasedAttack({ owner, deps }, enemy, target, bossPattern, delivery),
      release: (owner, enemy, bossPattern, delivery, target) => emitAttackRelease({ owner, deps }, enemy, bossPattern, delivery, target),
      retire: (owner, enemy) => retireReleasedAttacks({ owner, deps }, enemy),
      drop: (owner, index, now) => removeReleasedAttack({ owner, deps }, index, now),
      take: (owner, enemyId, now) => takeReleasedAttack({ owner, deps }, enemyId, now),
      targets: (owner, pendingAttack) => releasedAttackTargets({ owner, deps }, pendingAttack),
      sources: (owner) => collectAttackSources({ owner, deps })
    });
  }

  // modules/domain/enemy-attack-prepare.mjs
  function openEnemySource(c, e) {
    if (c.deps.engagement.colonyRunEndedDuringAttacks(c.owner, c.zone)) return "stop";
    c.deps.woodsmanBattle.prepare(e.enemy);
    if (c.owner.currentZoneId !== c.zone.id || c.owner.playerHp <= 0) return "stop";
    e.pendingAttack = c.deps.flights.take(c.owner, e.enemy.id, c.deps.getCombatTime());
    if (c.deps.engagement.resolveObserverFatal(c.owner, e.pendingAttack, c.zone, c.pStats)) return "stop";
    if (e.enemy.hp <= 0 && !e.pendingAttack) return "skip";
    if ((e.enemy.noAttack || c.deps.actExplorationState.inArrivalGrace(c.deps.actExplorationState.current(c.owner), c.deps.getCombatTime())) && !e.pendingAttack) return "skip";
  }
  function recoverEnemySource(c, e) {
    e.ailMap = {};
    (e.enemy.ailments || []).forEach((ail) => {
      if ((ail.time || 0) > 0) e.ailMap[ail.type] = Math.max(e.ailMap[ail.type] || 0, ail.power || 0);
    });
    if (!e.pendingAttack && c.deps.enemyAttackRules.interrupt(e.enemy, c.deps.getCombatTime())) return "skip";
    c.deps.applyEnemyRegen(e.enemy, c.pStats);
    e.enemy.recentHitsTimer = Math.max(0, (e.enemy.recentHitsTimer || 0) - 0.1);
    if (e.enemy.recentHitsTimer <= 0) e.enemy.recentHitsTaken = Math.max(0, (e.enemy.recentHitsTaken || 0) - 1);
  }
  function readEnemyTurn(c, e, h) {
    const step0 = openEnemySource(c, e, h);
    if (step0) return step0;
    const step1 = recoverEnemySource(c, e, h);
    if (step1) return step1;
  }
  function scaleEnemyTurn(c, e) {
    e.seasonDepth = c.deps.getSoftenedLoopDepth(c.deps.getLoopDifficultyInputs(c.zone).seasonLoops);
    e.tierPressure = c.deps.clampNumber(((c.zone.tier || 1) - 1) / 10, 0, 1);
    e.monsterBaseAttackSpeedMul = 1.1;
    e.seasonAtkScale = 1 + e.seasonDepth * (0.012 + e.tierPressure * 0.018);
    e.curseDebuffs = c.owner.enemyConditionDebuffs && c.owner.enemyConditionDebuffs[e.enemy.id] ? c.owner.enemyConditionDebuffs[e.enemy.id] : [];
    e.curseSlow = 0;
    e.enemyDmgMul = 1;
    e.curseDebuffs.forEach((deb) => {
      e.curseSlow += c.deps.getConditionDebuffDelta(deb).enemyAspdSlow || 0;
    });
    e.curseDebuffs.forEach((deb) => {
      e.enemyDmgMul *= c.deps.getConditionDebuffDelta(deb).enemyDmgMul || 1;
    });
    e.chillSlow = e.ailMap.chill ? Math.min(0.45, 0.12 + e.ailMap.chill * 0.14) : 0;
    e.chillSlow += Math.max(0, Math.min(0.5, (Number(e.enemy.skillSlowPct || 0) + c.deps.ascendancyNodeRules.mossSlowPct(e.enemy, c.deps.getCombatTime())) / 100));
    e.chillSlow = Math.min(0.65, e.chillSlow + e.curseSlow);
  }
  function deferEnemyCast(c, e) {
    if (!e.pendingAttack && c.deps.pendingEnemyCombatAttacks.some((row) => row.enemyId === e.enemy.id)) return "skip";
    if (!e.pendingAttack && c.deps.strikeRescueTarget(e.enemy)) return "skip";
    if (!e.pendingAttack && Math.max(Number(e.enemy.skillHeldUntil) || 0, Number(e.enemy.parryStaggerUntil) || 0) > c.deps.getCombatTime()) return "skip";
  }
  function waitEnemyRecovery(c, e) {
    if (!e.pendingAttack && (e.enemy.apexRecoveryUntil || 0) > c.deps.getCombatTime()) return "skip";
    if (!e.pendingAttack && c.deps.bossMoves.observer.wait(e.enemy, c.deps.getCombatTime())) return "skip";
  }
  function aimEnemyCast(c, e) {
    e.impactTargets = e.pendingAttack ? c.deps.flights.targets(c.owner, e.pendingAttack) : [c.deps.engagement.getEnemyPreferredGridTarget(c.owner, e.enemy)];
    e.attackTarget = e.impactTargets[0];
    c.deps.enemyAttackRules.noteAim(e.enemy, c.deps.engagement.getColonyDefenseCoreTarget(c.owner) ? e.attackTarget : null);
    if (!e.attackTarget) return "skip";
  }
  function approachEnemyTarget(c, e) {
    if (!e.pendingAttack && !e.enemy.patternArea && !e.enemy.attackCast && !c.deps.bossMoves.canPrepare(e.enemy, e.attackTarget)) {
      c.deps.engagement.advanceEnemyGridApproach(c.owner, e.enemy, e.attackTarget, e.chillSlow + (c.deps.enemyTimeSlowed(e.enemy) ? c.deps.TIME_SLOW_MOVE : 0));
      e.enemy.attackTimer = Math.min(Number(e.enemy.attackTimer) || 0, 1);
      return "skip";
    }
  }
  function chooseEnemyTarget(c, e, h) {
    const step0 = deferEnemyCast(c, e, h);
    if (step0) return step0;
    const step1 = waitEnemyRecovery(c, e, h);
    if (step1) return step1;
    const step2 = aimEnemyCast(c, e, h);
    if (step2) return step2;
    const step3 = approachEnemyTarget(c, e, h);
    if (step3) return step3;
  }
  function scaleEnemyAttackRate(c, e) {
    e.atkRate = (0.26 + c.zone.tier * 0.013) * e.monsterBaseAttackSpeedMul * e.seasonAtkScale * (e.enemy.isElite || e.enemy.isBoss ? 1.16 : 1) * (e.enemy.atkMul || 1) * (e.enemy.attackSpeedVar || 1) * 1.03 * (1 - e.chillSlow);
    e.benchmarkProfile = c.deps.getDifficultyBenchmarkProfile(c.zone);
    if (e.benchmarkProfile) e.atkRate *= e.benchmarkProfile.attackRate;
    else if (c.zone.type === "underworld") e.atkRate *= 0.76;
    if (c.zone.type === "skyTower") e.atkRate *= 1.05;
  }
  function advanceEnemyAttackClock(c, e) {
    if (!Number.isFinite(e.atkRate) || e.atkRate <= 0) e.atkRate = 0.12;
    if (!Number.isFinite(e.enemy.attackTimer) || e.enemy.attackTimer < 0) e.enemy.attackTimer = 0;
    if (!e.pendingAttack) e.enemy.attackTimer += 0.1 * e.atkRate;
    c.deps.engagement.updateMeteorHeartPhase(c.owner, e.enemy, c.zone, e.pendingAttack);
    if (e.enemy.isBoss && typeof c.deps.refreshBossPatternPreview === "function") c.deps.refreshBossPatternPreview(e.enemy);
    e.bossPatternTelegraphReady = !!e.pendingAttack || (e.enemy.isBoss ? c.deps.updateBossPatternTelegraph(e.enemy, c.deps.getCombatTime(), e.attackTarget, e.atkRate) : c.deps.enemyAttackRules.ready(e.enemy, c.deps.getCombatTime(), e.attackTarget));
    e.bossAttacksThisTick = 0;
  }
  function readyEnemyStrike(c, e, h) {
    scaleEnemyAttackRate(c, e, h);
    advanceEnemyAttackClock(c, e, h);
  }
  function prepareEnemyTurn(c, e, h) {
    const step0 = readEnemyTurn(c, e, h);
    if (step0) return step0;
    scaleEnemyTurn(c, e, h);
    const step2 = chooseEnemyTarget(c, e, h);
    if (step2) return step2;
    readyEnemyStrike(c, e, h);
  }

  // modules/domain/enemy-attack-strike.mjs
  function readMonsterStrike(c, e, h) {
    if (e.enemy.isBoss && e.bossAttacksThisTick >= 1) {
      e.enemy.attackTimer = Math.min(e.enemy.attackTimer, 1);
      return "break";
    }
    if (!e.bossPatternTelegraphReady) {
      e.enemy.attackTimer = Math.min(e.enemy.attackTimer, 1);
      return "break";
    }
    if (e.enemy.isBoss) e.bossAttacksThisTick++;
    h.resolvingPendingAttack = e.pendingAttack;
    h.bossPattern = h.resolvingPendingAttack ? h.resolvingPendingAttack.bossPattern : typeof c.deps.consumeBossPatternAttack === "function" ? c.deps.consumeBossPatternAttack(e.enemy) : null;
  }
  function prepareCosmosStrike(c, e, h) {
    if (!h.resolvingPendingAttack && c.zone && c.zone.type === "cosmos") {
      h.bossPattern = c.deps.applyCosmosBossAttackSetup(e.enemy, h.bossPattern, c.pStats);
    }
    if (!h.resolvingPendingAttack && c.zone && c.zone.type === "cosmos") c.deps.applyCosmosBossPlayerDebuff(e.enemy);
  }
  function prepareAstraStrike(c, e, h) {
    if (!h.resolvingPendingAttack && c.zone && c.zone.id === "cosmos_astra" && e.enemy.isBoss) c.deps.applyCosmosAstraStance(e.enemy);
  }
  function beginMonsterStrike(c, e, h) {
    const step0 = readMonsterStrike(c, e, h);
    if (step0) return step0;
    prepareCosmosStrike(c, e, h);
    prepareAstraStrike(c, e, h);
  }
  function curseFromWoodsman(c, e) {
    if (c.zone.type === "outsideChaos" && e.enemy.isWoodsman) {
      e.enemy.nextCurseAt = Number.isFinite(e.enemy.nextCurseAt) ? e.enemy.nextCurseAt : 0;
      if (c.deps.getCombatTime() >= e.enemy.nextCurseAt) {
        e.enemy.nextCurseAt = c.deps.getCombatTime() + 6500;
        let curseType = c.deps.rndChoice(["ignite", "chill", "shock", "poison", "bleed"]);
        c.deps.ailments.apply(c.owner, { type: curseType, duration: 4, power: 0.18, pStats: c.pStats, sourceHitDamage: 0, options: {
          sourceEnemyId: e.enemy.id,
          sourceEnemyName: e.enemy.name
        } });
        c.deps.addLog(c.deps._t("☠️ 알 수 없는 권능: {ailment}", { ailment: c.deps._t(curseType === "ignite" ? "점화" : curseType === "chill" ? "냉각" : curseType === "shock" ? "감전" : curseType === "poison" ? "중독" : "출혈") }), "attack-monster", { noToast: true });
      }
    }
  }
  function releaseMonsterStrike(c, e, h) {
    if (!h.resolvingPendingAttack) {
      e.enemy.attackTimer -= 1;
      let delivery = c.deps.flights.delivery(c.owner, e.enemy, h.bossPattern);
      if (delivery !== "instantTarget" && c.deps.flights.queue(c.owner, e.enemy, e.attackTarget, h.bossPattern, delivery)) return "break";
      c.deps.flights.release(c.owner, e.enemy, h.bossPattern, "instantTarget", e.attackTarget);
    } else e.pendingAttack = null;
    if (e.attackTarget === c.owner.gridPlayer) {
      if (c.deps.skillGemCombatRuntime) e.enemy.facingDirection = c.deps.skillGemCasts.facing(e.enemy, c.owner.gridPlayer);
    }
  }
  function scaleMonsterBaseHit(c, e, h) {
    h.dmg = c.deps.engagement.getMonsterBaseHitDamage(c.owner, c.zone, e.seasonDepth, e.tierPressure, e.benchmarkProfile);
    h.dmg = Math.floor(h.dmg * e.enemyDmgMul * (e.enemy.damageMul || 1));
    if (c.zone.type === "act" && c.zone.id <= 1 && (c.owner.season || 1) >= 3) h.dmg = Math.floor(h.dmg * 0.58);
    if (e.enemy.isElite) h.dmg = Math.floor(h.dmg * 1.28);
    if (e.enemy.isBoss) h.dmg = Math.floor(h.dmg * (1.14 + c.zone.tier * 0.16));
    h.dmg = Math.floor(h.dmg * c.deps.getEntryBossTuning(c.zone, e.enemy.isBoss).damage);
  }
  function scaleBossPatternHit(c, e, h) {
    if (h.bossPattern && Number.isFinite(h.bossPattern.damageMul) && h.bossPattern.damageMul !== 1) {
      h.dmg = Math.max(1, Math.floor(h.dmg * h.bossPattern.damageMul));
      if (h.bossPattern.isSpecial && c.owner.settings.showCombatLog) {
        c.deps.addLog(`⚠️ ${e.enemy.name}: ${h.bossPattern.label}`, "attack-monster", { noToast: true });
      }
    }
  }
  function dispatchOutgoingHit(c, e, h) {
    if (!e.enemy.isBoss) h.dmg = Math.floor(h.dmg * c.crowdPenalty);
    h.dmg = Math.floor(h.dmg * (c.abyssScale.dmgMul || 1) * (c.abyssScale.playerTakenMul || 1) * (e.enemy.isBoss ? c.abyssScale.bossMul || 1 : 1));
    if (!c.deps.engagement.dispatchMonsterHitTargets(c.owner, { targets: e.impactTargets, damage: h.dmg, enemy: e.enemy, pStats: c.pStats, bossPattern: h.bossPattern })) return "break";
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) {
      c.deps.addBattleFx("statusText", { text: c.deps._t("균열 장막"), color: "#c49bff", duration: 220 });
      return "continue";
    }
  }
  function rollOutgoingHit(c, e, h) {
    scaleMonsterBaseHit(c, e, h);
    scaleBossPatternHit(c, e, h);
    const step2 = dispatchOutgoingHit(c, e, h);
    if (step2) return step2;
  }
  function prepareEnemyHit(c, e, h) {
    const step0 = beginMonsterStrike(c, e, h);
    if (step0) return step0;
    curseFromWoodsman(c, e, h);
    const step2 = releaseMonsterStrike(c, e, h);
    if (step2) return step2;
    const step3 = rollOutgoingHit(c, e, h);
    if (step3) return step3;
  }

  // modules/domain/enemy-attack-damage.mjs
  function splitIncomingElements(c, e, h) {
    h.attackElement = c.deps.enemyAttackRules.element(e.enemy, h.bossPattern);
    h.physicalPortion = Math.floor(h.dmg * 0.5);
    h.elementalPortion = Math.max(0, h.dmg - h.physicalPortion);
    if (h.attackElement === "phys") {
      h.physicalPortion = h.dmg;
      h.elementalPortion = 0;
    }
    h.empowered = c.deps.loopMutation.empoweredHit(e.enemy, h.dmg);
    h.physTaken = c.deps.shiftPhysicalTakenAs(h.physicalPortion + c.deps.getEmpoweredPhysicalDamage(h.empowered), c.pStats, e.enemy);
    h.physicalPortion = h.physTaken.physical;
    h.elementalRes = ["fire", "cold", "light", "chaos"].includes(h.attackElement) ? c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, h.attackElement, e.enemy) : 0;
    h.physRes = Math.max(-60, c.pStats.dr + c.deps.getArmorPhysicalReductionPct(c.pStats.armor, h.physicalPortion));
    if (c.pStats.cosmosBalanceMitigation) {
      let balanced = c.deps.getCosmosBalancedMitigationPct(c.pStats, e.enemy, h.physRes);
      h.physRes = balanced;
      h.elementalRes = balanced;
    }
    h.hitResOf = (row) => row.ele === "phys" ? h.physRes : row.ele === h.attackElement || c.pStats.cosmosBalanceMitigation ? h.elementalRes : c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, row.ele, e.enemy);
    h.damageBreakdown = c.pStats.cosmosEqualDamageSplit ? c.deps.getCosmosEqualSplitDamageBreakdown(h.dmg + c.deps.getEmpoweredRawDamage(h.empowered), c.pStats, e.enemy) : c.deps.mitigateTakenRows(c.deps.convertTakenRowsRaw([{ ele: "phys", amount: h.physicalPortion }, { ele: h.attackElement, amount: h.elementalPortion }], c.pStats), h.hitResOf);
    h.damageBreakdown = h.damageBreakdown.concat(h.physTaken.rows, c.deps.getEmpoweredElementRows(h.empowered, c.pStats, e.enemy, h.physRes));
  }
  function elementTakenLess(stats, element) {
    if (element === "fire") return stats.fireTakenDamageReducePct || 0;
    if (element === "cold") return stats.coldTakenDamageReducePct || 0;
    if (element === "light") return stats.lightTakenDamageReducePct || 0;
    if (element === "chaos") return (stats.chaosTakenDamageReducePct || 0) + (stats.uniqueChaosTakenDamageReducePct || 0);
    return 0;
  }
  function reduceElementShares(c, e, h) {
    h.damageBreakdown = h.damageBreakdown.map((row) => {
      const less = elementTakenLess(c.pStats, row.ele);
      if (less > 0) return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * (1 - Math.max(0, Math.min(0.9, less / 100))))) };
      return row;
    }).filter((row) => row.amount > 0);
    h.takenFlatReduce = c.pStats && c.pStats.takenFlatReduce || {};
    h.damageBreakdown = h.damageBreakdown.map((row) => {
      if (!row || row.amount <= 0) return row;
      let elementFlatLess = Math.max(0, Number(h.takenFlatReduce[row.ele] || 0));
      if (elementFlatLess <= 0) return row;
      return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) - elementFlatLess)) };
    }).filter((row) => row && row.amount > 0);
  }
  function reduceCommonFlatDamage(c, e, h) {
    h.allFlatLess = Math.max(0, Number(h.takenFlatReduce.all || 0));
    while (h.allFlatLess > 0 && h.damageBreakdown.length > 0) {
      let targetIndex = h.damageBreakdown.reduce((largest, row, index) => (row.amount || 0) > (h.damageBreakdown[largest].amount || 0) ? index : largest, 0);
      let spend = Math.min(h.allFlatLess, Math.max(0, Math.floor(h.damageBreakdown[targetIndex].amount || 0)));
      if (spend <= 0) break;
      h.damageBreakdown[targetIndex].amount = Math.max(0, Math.floor((h.damageBreakdown[targetIndex].amount || 0) - spend));
      h.allFlatLess -= spend;
      h.damageBreakdown = h.damageBreakdown.filter((row) => row && row.amount > 0);
    }
  }
  function applyAshuraTakenElements(c, e, h) {
    if (c.pStats.passiveAshura && typeof c.deps.applyPassiveAshuraDamageBreakdown === "function") {
      h.damageBreakdown = c.deps.applyPassiveAshuraDamageBreakdown(h.damageBreakdown, c.owner.playerAilments, c.pStats.cycle);
    }
    if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: 1 });
  }
  function reduceIncomingElements(c, e, h) {
    reduceElementShares(c, e, h);
    reduceCommonFlatDamage(c, e, h);
    applyAshuraTakenElements(c, e, h);
  }
  function prepareDamageScaling(c, e, h) {
    h.sumBreakdown = () => h.damageBreakdown.reduce((sum, row) => sum + Math.max(0, Math.floor(row.amount || 0)), 0);
    h.scaleBreakdown = (mul) => {
      h.damageBreakdown = h.damageBreakdown.map((row) => ({ ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * mul)) })).filter((row) => row.amount > 0);
      if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: 1 });
    };
    h.scaleBreakdownToTotal = (targetTotal) => {
      targetTotal = Math.max(1, Math.floor(targetTotal || 1));
      let sourceTotal = Math.max(1, h.sumBreakdown());
      let remainingTotal = targetTotal;
      h.damageBreakdown = h.damageBreakdown.map((row, idx) => {
        let amount = idx === h.damageBreakdown.length - 1 ? remainingTotal : Math.max(0, Math.floor((row.amount || 0) / sourceTotal * targetTotal));
        remainingTotal = Math.max(0, remainingTotal - amount);
        return { ele: row.ele, amount };
      }).filter((row) => row.amount > 0);
      if (h.damageBreakdown.length === 0) h.damageBreakdown.push({ ele: h.attackElement, amount: targetTotal });
      return Math.max(1, h.sumBreakdown());
    };
  }
  function scaleDistantHit(c, e, h) {
    h.dmg = Math.max(1, h.sumBreakdown());
    h.directHitDistanceMul = c.deps.getGridDirectHitDistanceMultiplier(e.enemy, c.owner.gridPlayer);
    h.scaleBreakdown(h.directHitDistanceMul);
    h.dmg = Math.max(1, h.sumBreakdown());
    h.playerShockTakenIncreasePct = Number(c.pStats.playerShockTakenDamageIncreasePct || 0);
    if (h.playerShockTakenIncreasePct !== 0) {
      let playerShockTakenMul = Math.max(0.1, 1 + h.playerShockTakenIncreasePct / 100);
      h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * playerShockTakenMul)));
    }
  }
  function rollCriticalHit(c, e, h) {
    h.ailmentSourceDamageBeforeCrit = h.dmg;
    h.enemyCritDotBonusPct = 0;
    h.enemyCritChance = Math.max(0, (e.enemy.critChance || 0) - Math.max(0, Math.min(80, c.pStats.critResist || 0)));
    if (h.enemyCritChance > 0 && c.deps.random() < h.enemyCritChance / 100) {
      h.scaleBreakdown(c.deps.getEnemyCritTakenMul(e.enemy, c.pStats));
      h.dmg = Math.max(1, h.sumBreakdown());
      h.enemyCritDotBonusPct = 50;
    }
    if (e.enemy.hybridElement && c.deps.random() < 0.35) {
      let hybridRes = c.deps.getPlayerResistanceAfterEnemyModifiers(c.pStats, e.enemy.hybridElement, e.enemy, 0.7);
      let hybrid = Math.max(0, Math.floor(h.dmg * 0.32 * (1 - hybridRes / 100)));
      if (hybrid > 0) h.damageBreakdown.push({ ele: c.deps.normalizeDamageElementKey(e.enemy.hybridElement), amount: hybrid });
      h.dmg = Math.max(1, h.sumBreakdown());
    }
  }
  function scaleCommonTakenHit(c, e, h) {
    h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * c.deps.getWoodsmanCurseDamageTakenMul() * Math.max(0, Number(c.pStats.warriorTakenDamageMultiplier) || 1) * Math.max(0, Number(c.pStats.genericTakenDamageMultiplier) || 1))));
    if (e.enemy.isBoss) h.dmg = Math.max(1, Math.floor(h.dmg * Math.max(0, Number(c.pStats.bossTakenDamageMultiplier) || 1)));
    if (c.pStats.uniqueGuardianArmor) {
      let less = e.enemy.isBoss ? Math.max(0, Math.min(95, Number(c.pStats.uniqueGuardianArmor.bossTakenLessPct || 0))) : Math.max(0, Math.min(95, Number(c.pStats.uniqueGuardianArmor.takenLessPct || 0)));
      h.dmg = Math.max(1, Math.floor(h.dmg * (1 - less / 100)));
    }
  }
  function scalePhysicalTakenHit(c, e, h) {
    if (c.pStats.uniquePhysDrHalfTakenAsMore && h.attackElement === "phys") {
      let ratio = Math.max(0, Number(c.pStats.uniquePhysDrHalfTakenAsMore.ratio || 0.5));
      let takenMore = Math.max(0, Math.max(0, Number(c.pStats.dr) || 0) / 100 * ratio);
      h.dmg = Math.max(1, Math.floor(h.dmg * (1 + takenMore)));
    }
  }
  function scaleSituationalTakenHit(c, e, h) {
    if (c.deps.hasKeystone("g5") && c.owner.gladiatorSwiftGuardReady) {
      h.dmg = Math.max(1, Math.floor(h.dmg * Math.max(0, Number(c.pStats.swiftOpeningTakenMultiplier) || 0.7)));
      c.owner.gladiatorSwiftGuardReady = false;
    }
    h.aliveEnemies = (c.owner.enemies || []).filter((e2) => e2 && e2.hp > 0).length;
    h.dmg = c.deps.applySituationalTakenReduction(h.dmg, c.pStats, e.enemy, h.aliveEnemies);
  }
  function scaleTakenHit(c, e, h) {
    scaleCommonTakenHit(c, e, h);
    scalePhysicalTakenHit(c, e, h);
    scaleSituationalTakenHit(c, e, h);
  }
  function calculateEnemyHit(c, e, h) {
    splitIncomingElements(c, e, h);
    reduceIncomingElements(c, e, h);
    prepareDamageScaling(c, e, h);
    scaleDistantHit(c, e, h);
    rollCriticalHit(c, e, h);
    scaleTakenHit(c, e, h);
  }

  // modules/domain/enemy-attack-avoidance.mjs
  function rollMonsterEvade(c, e, h) {
    h.evadeChance = Math.max(0, c.pStats.evadeChance || 0);
    if (c.deps.hasKeystone("ct4") && c.owner.catalystEvadeBoostReady) {
      h.evadeChance *= 1.3;
      c.owner.catalystEvadeBoostReady = false;
    }
    if (c.deps.hasKeystone("h3")) h.evadeChance = 100 - Math.pow(1 - h.evadeChance / 100, 2) * 100;
  }
  function resolveMonsterEvade(c, e, h) {
    if (!(typeof c.deps.isTalentMonsterAlwaysHit === "function" && c.deps.isTalentMonsterAlwaysHit()) && c.deps.resolveEntropyEvasion(c.owner, h.evadeChance, c.deps.getCombatTime())) {
      c.deps.addBattleFx("statusText", { text: c.deps._t("회피!"), color: "#c4e2ff", duration: 260, bodyCue: true });
      c.deps.addEvasionCombatLog(null, true);
      c.deps.recordPlayerEvadeUniqueEffects(c.pStats, h.aliveEnemies, c.deps.getCombatTime());
      c.deps.ascendancyNodeRules.counter(c.pStats, e.enemy, "evade", c.deps.getCombatTime());
      if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.fullEvasion) {
        c.owner.passiveFullEvasionCritReady = true;
      }
      if (c.deps.hasKeystone("ct4")) c.owner.catalystEvadeBoostReady = true;
      return "continue";
    }
  }
  function evadeMonsterHit(c, e, h) {
    rollMonsterEvade(c, e, h);
    const step1 = resolveMonsterEvade(c, e, h);
    if (step1) return step1;
  }
  function blockMonsterHit(c, e, h) {
    c.deps.repelMeleeAttacker(e.enemy, c.pStats);
    h.blockRollCap = Math.max(0, Math.min(75, Number(c.pStats.blockChanceMax || 50)));
    h.blockRollChance = Math.max(0, Math.min(h.blockRollCap, c.pStats.blockChance || c.pStats.guardianBlockChance || 0));
    h.gladiatorBattleLuck = c.deps.hasKeystone("g9");
    h.blockRoll = c.deps.random() * 100;
    if (h.gladiatorBattleLuck) h.blockRoll = Math.min(h.blockRoll, c.deps.random() * 100);
    h.wasBlocked = h.blockRoll < h.blockRollChance;
    if (h.wasBlocked) {
      c.deps.recoverEnergyShieldOnBlock(c.pStats);
      c.deps.regionAffixEffects.onBlock(c.pStats, c.deps.getCombatTime());
      c.deps.grantTalentStoneShieldOnBlock(c.pStats);
      let blockedTakenPct = Math.max(0, Math.min(100, Number(c.pStats.uniqueBlockedDamageTakenPct) || 0));
      let blockText = blockedTakenPct <= 0 ? c.deps._t("막아냄!") : c.deps._t("막아냄, 피해 {blockedTakenPct}%", { blockedTakenPct });
      c.deps.addBattleFx("statusText", { text: blockText, color: "#ebdfc2", duration: 260, bodyCue: true });
      if (c.owner.settings.showCombatLog) c.deps.addLog(`🛡️ ${blockText}`, "loot-magic", { noToast: true, aggregateKey: `combat:block:${blockText}`, aggregateWindowMs: 450 });
      if (blockedTakenPct <= 0) return "continue";
      h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * blockedTakenPct / 100)));
      h.ailmentSourceDamageBeforeCrit = Math.max(1, Math.floor(h.ailmentSourceDamageBeforeCrit * blockedTakenPct / 100));
    }
  }
  function nullifyMonsterHit(c, e, h) {
    h.guardianNullifyChance = Math.max(0, Math.min(100, Number(c.pStats.guardianDamageNullifyChance) || 0));
    if (h.guardianNullifyChance > 0 && c.deps.random() * 100 < h.guardianNullifyChance) {
      c.deps.addBattleFx("statusText", { text: c.deps._t("무효!"), color: "#bdf7ff", duration: 300 });
      if (c.owner.settings.showCombatLog) c.deps.addLog(c.deps._t("🛡️ 절대 수호: 피해 무효!"), "loot-magic", { noToast: true, aggregateKey: "combat:block:nullify", aggregateWindowMs: 450 });
      return "continue";
    }
  }
  function rollMonsterDeflect(c, e, h) {
    h.deflected = false;
    h.deflectReducePct = 0;
    h.deflectRoll = h.wasBlocked ? 100 : c.deps.random() * 100;
    if (!h.wasBlocked && h.gladiatorBattleLuck) h.deflectRoll = Math.min(h.deflectRoll, c.deps.random() * 100);
  }
  function resolveMonsterDeflect(c, e, h) {
    if (!h.wasBlocked && h.deflectRoll < Math.max(0, Math.min(75, c.pStats.deflectChance || 0))) {
      let deflectReduce = Math.max(0, Math.min(85, 40 + Number(c.pStats.deflectDamageReduce || 0)));
      h.dmg = h.scaleBreakdownToTotal(Math.max(1, Math.floor(h.dmg * (1 - deflectReduce / 100))));
      if (c.pStats.uniqueDeflectStealth) {
        let cfg = c.pStats.uniqueDeflectStealth || {};
        c.owner.shadowStealthExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(cfg.duration || 3)) * 1e3;
      }
      h.deflected = true;
      h.deflectReducePct = Math.floor(deflectReduce);
      c.deps.ascendancyNodeRules.counter(c.pStats, e.enemy, "deflect", c.deps.getCombatTime());
    }
  }
  function deflectMonsterHit(c, e, h) {
    rollMonsterDeflect(c, e, h);
    resolveMonsterDeflect(c, e, h);
  }
  function floorMonsterHit(c, e, h) {
    if ((c.pStats.cosmosMasteryTakenLessPct || 0) > 0) {
      let masteryReduction = Math.max(0, Math.min(50, Number(c.pStats.cosmosMasteryTakenLessPct) || 0));
      h.dmg = h.scaleBreakdownToTotal(Math.max(0, Math.floor(h.dmg * (1 - masteryReduction / 100))));
    }
    h.flooredDamage = c.deps.floorIncomingDamage(h.dmg);
    if (h.flooredDamage !== h.dmg) {
      h.dmg = h.scaleBreakdownToTotal(Math.max(1, h.flooredDamage));
      h.ailmentSourceDamageBeforeCrit = Math.max(1, c.deps.floorIncomingDamage(h.ailmentSourceDamageBeforeCrit));
    }
  }
  function avoidEnemyHit(c, e, h) {
    const step0 = evadeMonsterHit(c, e, h);
    if (step0) return step0;
    const step1 = blockMonsterHit(c, e, h);
    if (step1) return step1;
    const step2 = nullifyMonsterHit(c, e, h);
    if (step2) return step2;
    deflectMonsterHit(c, e, h);
    floorMonsterHit(c, e, h);
  }

  // modules/domain/enemy-attack-redirect.mjs
  function redirectEnemyHit(c, e, h) {
    h.remaining = h.dmg;
    h.guardRedirectPct = c.deps.getSummonRedirectPct(c.pStats);
    h.soulbinderShare = c.deps.hasKeystone("sb2");
    h.closestSummon = h.soulbinderShare ? c.deps.engagement.getClosestLivingSummonToPlayer(c.owner) : null;
    h.aliveGuards = h.soulbinderShare ? h.closestSummon ? [h.closestSummon] : [] : (c.owner.summons || []).filter((s) => s && !s.isGhost && s.alive && s.hp > 0 && s.role === "guard");
    if (h.guardRedirectPct > 0 && h.aliveGuards.length > 0) redirectToGuards(c, e, h);
  }
  function redirectToGuards(c, e, h) {
    const redirect = Math.min(h.remaining, Math.floor(h.remaining * (h.guardRedirectPct / 100)));
    if (redirect <= 0) return;
    const each = Math.max(1, Math.floor(redirect / h.aliveGuards.length));
    let redirectedTotal = 0;
    h.aliveGuards.forEach((guard, idx) => {
      if (!guard.alive || guard.hp <= 0) return;
      const share = idx === h.aliveGuards.length - 1 ? Math.max(0, redirect - redirectedTotal) : each;
      const reduced = redirectedGuardDamage(c, e, h, guard, share);
      if (reduced <= 0) return;
      guard.hp = Math.max(0, guard.hp - reduced);
      c.deps.ascendancyNodeRules.storeSharedBlow(guard, reduced);
      redirectedTotal += reduced;
      if (guard.hp <= 0) defeatRedirectGuard(c, h, guard);
    });
    h.remaining = Math.max(0, h.remaining - redirectedTotal);
  }
  function redirectedGuardDamage(c, e, h, guard, share) {
    const local = h.soulbinderShare ? 100 : Math.max(0, Math.min(100, Number(guard.redirectPct || 0)));
    if (local > 0) share = Math.floor(share * (local / 100));
    if (c.deps.resolveEntropyEvasion(guard, c.deps.getSummonEvadeChance(guard, e.enemy), c.deps.getCombatTime())) share = 0;
    const resistance = guardElementResistance(guard, h.attackElement);
    let reduced = Math.max(0, Math.floor(share * (1 - Math.max(-60, resistance) / 100)));
    const armorRed = Math.min(85, (guard.armor || 0) / ((guard.armor || 0) + Math.max(1, reduced) * 8) * 100);
    reduced = Math.max(0, Math.floor(reduced * (1 - armorRed / 100)));
    return Math.max(0, Math.min(reduced, guard.hp));
  }
  function guardElementResistance(guard, element) {
    if (element === "fire") return guard.resFire || 0;
    if (element === "cold") return guard.resCold || 0;
    if (element === "light") return guard.resLight || 0;
    if (element === "chaos") return guard.resChaos || 0;
    return 0;
  }
  function defeatRedirectGuard(c, h, guard) {
    guard.alive = false;
    guard.respawnAt = c.deps.engagement.getSummonRespawnAt(c.owner, guard, h.soulbinderShare);
    if (c.pStats.uniqueSummonDeathDamageBuff) {
      const cfg = c.pStats.uniqueSummonDeathDamageBuff || {};
      c.owner.summonDeathDamageBuffPct = Math.max(Number(c.owner.summonDeathDamageBuffPct || 0), Math.max(0, Number(cfg.pct || 40)));
      c.owner.summonDeathDamageBuffExpiresAt = c.deps.getCombatTime() + Math.max(1, Number(cfg.duration || 4)) * 1e3;
    }
  }

  // modules/domain/enemy-attack-resources.mjs
  function consumeEnergyShield(c, e, h) {
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    h.playerResourceBeforeHit = Math.max(0, Number(c.owner.playerHp) || 0) + c.owner.playerEnergyShield;
    h.beforeEsForCr8 = c.owner.playerEnergyShield;
    if (h.remaining > 0 && c.owner.playerEnergyShield > 0) {
      let bypass = Math.floor(h.remaining * Math.max(0, Math.min(100, c.pStats.cosmosEnergyShieldBypassPct || 0)) / 100);
      let shieldPart = Math.max(0, h.remaining - bypass);
      let absorbed = Math.min(c.owner.playerEnergyShield, shieldPart);
      c.owner.playerEnergyShield -= absorbed;
      h.remaining = bypass + Math.max(0, shieldPart - absorbed);
    }
    c.deps.triggerUniqueEnergyShieldBreakRecharge(c.pStats, h.beforeEsForCr8, c.deps.getCombatTime());
  }
  function consumeStoneAndDeathWard(c, e, h) {
    if (h.remaining > 0) h.remaining = c.deps.absorbDamageWithTalentStoneShield(h.remaining);
    if (h.remaining > 0) h.remaining = c.deps.absorbDamageWithRealmDeathWard(h.remaining, c.pStats);
  }
  function consumeUniqueHitGuard(c, e, h) {
    if (h.remaining > 0 && c.owner.playerUniqueGuard && c.deps.getCombatTime() < (c.owner.playerUniqueGuard.expiresAt || 0) && (c.owner.playerUniqueGuard.amount || 0) > 0) {
      let absorbed = Math.min(h.remaining, Math.floor(c.owner.playerUniqueGuard.amount || 0));
      c.owner.playerUniqueGuard.amount = Math.max(0, Math.floor((c.owner.playerUniqueGuard.amount || 0) - absorbed));
      h.remaining -= absorbed;
    }
  }
  function capReceivedHit(c, e, h) {
    if (h.remaining > 0 && (c.pStats.guardianHitCapPct || 0) > 0) {
      const hitCap = Math.max(1, Math.floor((c.pStats.maxHp || 1) * c.pStats.guardianHitCapPct / 100));
      if (h.remaining > hitCap) {
        h.remaining = hitCap;
        c.deps.addBattleFx("statusText", { text: c.deps._t("성채화!"), color: "#d8c08b", duration: 300, bodyCue: true });
      }
    }
  }
  function consumeHitShields(c, e, h) {
    consumeEnergyShield(c, e, h);
    consumeStoneAndDeathWard(c, e, h);
    consumeUniqueHitGuard(c, e, h);
    capReceivedHit(c, e, h);
  }
  function losePlayerLife(c, e, h) {
    h.nextPlayerHp = Math.floor(c.owner.playerHp - h.remaining);
    if (h.nextPlayerHp <= 0 && (c.pStats.cosmosDeathResistPct || 0) > 0 && c.deps.random() * 100 < Math.max(0, c.pStats.cosmosDeathResistPct || 0)) {
      h.remaining = 0;
      h.nextPlayerHp = Math.max(1, Math.floor(c.owner.playerHp || 1));
      c.deps.addBattleFx("statusText", { text: c.deps._t("죽음 저항!"), color: "#d7b8ff", duration: 420 });
    }
    h.nextPlayerHp = c.deps.ascendancyNodeRules.onLifeDrop(c.pStats, c.owner.playerHp, h.nextPlayerHp, c.deps.getCombatTime());
    c.owner.playerHp = h.nextPlayerHp;
    if (typeof c.deps.recordPassiveKarmaLoss === "function") {
      let playerResourceAfterHit = Math.max(0, Number(c.owner.playerHp) || 0) + Math.max(0, Number(c.owner.playerEnergyShield) || 0);
      c.deps.recordPassiveKarmaLoss(e.enemy, Math.max(0, h.playerResourceBeforeHit - playerResourceAfterHit));
    }
    c.deps.trackHiddenJournalPlayerDamage(h.remaining);
  }
  function recoupReceivedHit(c, e, h) {
    if (h.remaining > 0 && c.pStats.uniqueLifeRecoupTakenDamage) {
      let cfg = c.pStats.uniqueLifeRecoupTakenDamage || {};
      c.deps.addPlayerRecoupInstance(h.remaining * Math.max(0, Number(cfg.pct || 25)) / 100, Math.max(1, Number(cfg.duration || 4)));
    }
  }
  function grantHitBarrier(c, e, h) {
    if (h.remaining > 0 && c.pStats.uniqueInvulnerableBarrierOnHit && c.deps.random() * 100 < Math.max(0, Number(c.pStats.uniqueInvulnerableBarrierOnHit.chance) || 0)) {
      let durationMs = Math.max(250, Math.floor(Math.max(0.1, Number(c.pStats.uniqueInvulnerableBarrierOnHit.duration) || 1.5) * 1e3));
      c.owner.realmInvulnerableBarrierUntil = c.deps.getCombatTime() + durationMs;
      c.deps.addBattleFx("statusText", { text: c.deps._t("무적 장막!"), color: "#c49bff", duration: 360 });
    }
  }
  function triggerCrusaderRecharge(c, e, h) {
    if (c.deps.hasKeystone("cr8") && h.beforeEsForCr8 > 0 && c.owner.playerEnergyShield <= 0 && (c.owner.crusaderEsRegenCooldownUntil || 0) <= c.deps.getCombatTime()) {
      c.owner.crusaderEsRegenUntil = c.deps.getCombatTime() + 4e3;
      c.owner.crusaderLightningAegisUntil = c.deps.getCombatTime() + 4e3;
      c.owner.crusaderEsRegenCooldownUntil = c.deps.getCombatTime() + 4e3;
    }
  }
  function reflectGuardianHit(c, e, h) {
    if (h.remaining > 0 && c.deps.hasKeystone("gd6")) c.deps.engagement.applyGuardianEnduranceReflect(c.owner, e.enemy, h.remaining, c.pStats);
  }
  function leechMonsterHit(c, e, h) {
    if ((e.enemy.leechPct || 0) > 0 && h.remaining > 0 && e.enemy.hp > 0) {
      let leeched = Math.max(1, Math.floor(h.remaining * (e.enemy.leechPct || 0) / 100));
      restoreMonsterLeech(e.enemy, leeched);
    }
  }
  function restoreMonsterLeech(enemy, amount) {
    if ((enemy.energyShield || 0) < (enemy.maxEnergyShield || 0)) enemy.energyShield = Math.min(enemy.maxEnergyShield || 0, (enemy.energyShield || 0) + amount);
    else enemy.hp = Math.min(enemy.maxHp || enemy.hp || 1, (enemy.hp || 0) + amount);
  }
  function repeatMonsterStrike(c, e) {
    if ((e.enemy.doubleStrikeChance || 0) > 0 && c.deps.random() * 100 < e.enemy.doubleStrikeChance) e.enemy.attackTimer += 1;
  }
  function triggerReceivedHit(c, e, h) {
    recoupReceivedHit(c, e, h);
    grantHitBarrier(c, e, h);
    triggerCrusaderRecharge(c, e, h);
    reflectGuardianHit(c, e, h);
    leechMonsterHit(c, e, h);
    repeatMonsterStrike(c, e, h);
  }
  function recordReceivedHit(c, e, h) {
    if ((c.pStats.delayedRegenFromTakenDamage || 0) > 0 && h.remaining > 0) {
      let recover = Math.max(0, h.remaining * c.pStats.delayedRegenFromTakenDamage);
      c.owner.delayedGuardHealPool = Math.max(0, (c.owner.delayedGuardHealPool || 0) + recover);
    }
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    c.owner.playerLastHitAt = c.deps.getCombatTime();
    if (c.deps.hasKeystone("a2")) c.owner.assassinBlurred = false;
  }
  function commitEnemyHit(c, e, h) {
    consumeHitShields(c, e, h);
    losePlayerLife(c, e, h);
    triggerReceivedHit(c, e, h);
    recordReceivedHit(c, e, h);
  }

  // modules/domain/enemy-attack-effects.mjs
  function applyHitAilment(c, e, h) {
    h.ailRoll = c.deps.random();
    if (c.deps.hasKeystone("h3")) h.ailRoll = Math.max(h.ailRoll, c.deps.random());
    h.enemyAilmentChance = Math.max(0, Number(e.enemy.ailmentChance) || 0);
    if (c.pStats.passiveAshura && typeof c.deps.getPassiveAshuraAilmentChance === "function") {
      h.enemyAilmentChance = c.deps.getPassiveAshuraAilmentChance(h.enemyAilmentChance, c.pStats.cycle);
    }
    if (h.enemyAilmentChance > 0 && h.ailRoll < h.enemyAilmentChance) {
      inflictRolledAilment(c, e, h);
    }
  }
  function inflictRolledAilment(c, e, h) {
    let ail = h.attackElement === "fire" ? "ignite" : h.attackElement === "cold" ? "chill" : h.attackElement === "light" ? "shock" : h.attackElement === "phys" ? "bleed" : "poison";
    let hitRatio = Math.max(1e-3, Math.min(0.35, h.dmg / Math.max(1, c.pStats.maxHp || 1)));
    let damageAilment = c.deps.isDamageAilmentType(ail);
    let ailPower = damageAilment ? 0.9 : Math.max(0.1, Math.min(1.5, Math.sqrt(Math.max(1, h.dmg)) * 0.01 + hitRatio * 1.8));
    c.deps.ailments.apply(c.owner, { type: ail, duration: e.enemy.isBoss ? 5 : 3, power: ailPower, pStats: c.pStats, sourceHitDamage: h.dmg, options: {
      ailmentSourceDamage: h.ailmentSourceDamageBeforeCrit,
      critDotBonusPct: h.enemyCritDotBonusPct,
      sourceEnemyId: e.enemy.id,
      sourceEnemyName: e.enemy.name
    } });
    noteRolledAilment(c, e, h, ail);
  }
  function noteRolledAilment(c, e, h, ail) {
    let ailmentLabel = c.deps._t(ail === "ignite" ? "점화" : ail === "chill" ? "냉각" : ail === "shock" ? "감전" : ail === "bleed" ? "출혈" : "중독");
    if (c.owner.settings.showCombatLog) c.deps.addLog(c.deps._t("☣️ 상태이상: {ailment} ({seconds}초)", { ailment: ailmentLabel, seconds: e.enemy.isBoss ? 5 : 3 }), "attack-monster", { element: h.attackElement });
  }
  function recoverBeforeHit(c, e, h) {
    c.deps.grantWarriorRageOnHit(c.deps.getCombatTime());
    c.deps.ascendancyNodeRules.storeArmorBlow(c.pStats, h.physicalPortion);
    if (typeof c.deps.getPreciseTalentRatio === "function" && c.deps.getPreciseTalentLevel("hero5__guardian")) {
      let missingLife = Math.max(0, c.deps.getPlayerRecoveryHpCap(c.pStats) - Math.max(0, c.owner.playerHp || 0));
      let preHitRecovery = missingLife * 0.04 * c.deps.getPreciseTalentRatio("hero5__guardian");
      if (preHitRecovery > 0) {
        c.owner.playerHp = Math.min(c.deps.getPlayerRecoveryHpCap(c.pStats), c.owner.playerHp + preHitRecovery);
      }
    }
  }
  function showReceivedHit(c, e, h) {
    h.topDamageEntry = h.damageBreakdown.filter((row) => row && row.amount > 0).sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] || { ele: h.attackElement, amount: h.dmg };
    h.damageSource = c.deps.enemyAttackRules.damageName(e.enemy, h.bossPattern);
    h.damageBreakdown.forEach((row) => c.deps.recordIncomingDamage(row.ele, row.amount, h.damageSource, {
      sourceType: "monster",
      sourceId: e.enemy.id,
      sourceName: e.enemy.name
    }));
    c.deps.addBattleFx("playerHit", {
      enemyId: e.enemy.id,
      color: c.deps.getElementColor(h.topDamageEntry.ele),
      damage: h.dmg,
      duration: 220,
      deflected: h.deflected,
      targetMaxHp: c.deps.getPlayerHpCap(c.pStats)
    });
    if (c.owner.settings.showCombatLog && h.dmg > 0) {
      let damageLog = c.deps._t("{icon} {source}의 공격으로 {amount} 피해", { icon: c.deps.getDamageElementIcon(h.topDamageEntry.ele), source: h.damageSource, amount: c.deps.formatNumberKR(h.dmg) });
      if (c.owner.settings.showDetailedDamageLog === true) {
        let breakdownText = h.damageBreakdown.filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount).map((row) => `${c.deps.getDamageElementLabel(row.ele)} ${c.deps.formatNumberKR(row.amount)}`).join(" / ");
        let deflectText = h.deflected ? c.deps._t(", 🪶비껴냄 -{deflectReducePct}%", { deflectReducePct: h.deflectReducePct }) : "";
        damageLog = c.deps._t("🩸 [{ele}] {damageSource}에게 피격 ({dmg} 피해, {breakdownText}{deflectText})", { ele: c.deps.getDamageElementLabel(h.topDamageEntry.ele), damageSource: h.damageSource, dmg: c.deps.formatNumberKR(h.dmg), breakdownText, deflectText });
      }
      c.deps.addLog(damageLog, "attack-monster", { element: h.topDamageEntry.ele });
    }
    if (c.owner.playerHp <= 0) {
      c.deps.lose(c.owner, c.zone, c.pStats, null, { fatalElement: h.topDamageEntry.ele, sourceName: h.damageSource });
      return "stop";
    }
  }

  // modules/domain/enemy-attack.mjs
  function resolveMonsterAttacks(owner, pStats, deps) {
    const c = { owner, pStats, deps };
    c.zone = c.deps.getZone(c.owner.currentZoneId);
    c.abyssScale = c.deps.getAbyssMonsterScales(c.zone);
    c.deps.engagement.prepareMonsterAttackShield(c.owner, c.pStats);
    c.aliveCount = (c.owner.enemies || []).filter((enemy) => enemy.hp > 0).length;
    c.crowdPenalty = Math.max(0.34, 1 - Math.max(0, c.aliveCount - 1) * 0.055);
    c.attackSources = c.deps.flights.sources(c.owner);
    for (const enemy of c.attackSources) {
      const e = { enemy }, prepared = prepareEnemyTurn(c, e);
      if (prepared === "stop") return;
      if (prepared) continue;
      while (e.pendingAttack || e.enemy.hp > 0 && e.enemy.attackTimer >= 1) {
        const result = resolveEnemyContact(c, e, {});
        if (result === "stop") return;
        if (result === "break") break;
      }
    }
  }
  function resolveEnemyContact(c, e, h) {
    const released = prepareEnemyHit(c, e, h);
    if (released) return released;
    calculateEnemyHit(c, e, h);
    const avoided = avoidEnemyHit(c, e, h);
    if (avoided) return avoided;
    applyHitAilment(c, e, h);
    recoverBeforeHit(c, e, h);
    redirectEnemyHit(c, e, h);
    commitEnemyHit(c, e, h);
    return showReceivedHit(c, e, h);
  }
  function createMonsterAttackResolver(deps) {
    return Object.freeze({ resolve: (owner, stats) => resolveMonsterAttacks(owner, stats, deps) });
  }

  // modules/domain/incoming-mitigation.mjs
  var CRUSADER_LIGHTNING_TAKEN_ELEMENTS = Object.freeze(["fire", "cold", "chaos"]);
  function getEnemyCritTakenMul(deps, enemy, pStats) {
    const mul = enemy.critDamageMul || deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    return 1 + Math.max(0, mul - 1) * (1 - deps.clampNumber(pStats.critTakenDamageReducePct || 0, 0, 90) / 100);
  }
  function getEmpoweredPhysicalDamage(empowered) {
    return empowered && empowered.ele === "phys" ? empowered.amount : 0;
  }
  function getEmpoweredRawDamage(empowered) {
    return empowered ? empowered.amount : 0;
  }
  function getEmpoweredElementRows(deps, empowered, pStats, enemy, balancedRes) {
    if (!empowered || empowered.ele === "phys" || pStats.cosmosEqualDamageSplit) return [];
    const resOf = (row) => pStats.cosmosBalanceMitigation ? balancedRes : getPlayerResistanceAfterEnemyModifiers(deps, pStats, row.ele, enemy);
    return mitigateTakenRows(splitCrusaderLightningTaken(deps, [{ ele: empowered.ele, amount: empowered.amount }]), resOf);
  }
  function splitCrusaderLightningTaken(deps, rows) {
    if (!deps.hasKeystone("cr4")) return rows;
    return rows.flatMap((row) => {
      if (!CRUSADER_LIGHTNING_TAKEN_ELEMENTS.includes(row.ele)) return [row];
      const shift = Math.floor(row.amount * 0.3);
      return [{ ele: row.ele, amount: row.amount - shift }, { ele: "light", amount: shift }];
    });
  }
  function splitHelmChaosTaken(rows, pStats) {
    if (!pStats.uniqueBleedBlockHelm) return rows;
    return rows.flatMap((row) => {
      if (row.ele !== "phys") return [row];
      const chaos = Math.floor(row.amount * 0.15);
      return [{ ele: "phys", amount: row.amount - chaos }, { ele: "chaos", amount: chaos }];
    });
  }
  function convertTakenRowsRaw(deps, rows, pStats) {
    return splitHelmChaosTaken(splitCrusaderLightningTaken(deps, rows), pStats);
  }
  function mitigateTakenRows(rows, resOf) {
    return rows.map((row) => ({ ele: row.ele, amount: Math.max(0, Math.floor(row.amount * (1 - resOf(row) / 100))) })).filter((row) => row.amount > 0);
  }
  function shiftPhysicalTakenAs(deps, physical, pStats, enemy) {
    const takenAs = pStats.physTakenAs || {};
    const entries = ["fire", "cold", "light", "chaos"].map((ele) => [ele, Math.max(0, Number(takenAs[ele]) || 0)]);
    const total = entries.reduce((sum, row) => sum + row[1], 0);
    const scale = total > 75 ? 75 / total : 1;
    const rows = [];
    let shiftedTotal = 0;
    for (const [ele, raw] of entries) {
      const pct = raw * scale;
      const shifted = Math.min(physical - shiftedTotal, Math.floor(physical * pct / 100));
      if (shifted <= 0) continue;
      shiftedTotal += shifted;
      rows.push({ ele, amount: shifted });
    }
    const resOf = (row) => getPlayerResistanceAfterEnemyModifiers(deps, pStats, row.ele, enemy);
    return { physical: Math.max(0, physical - shiftedTotal), rows: mitigateTakenRows(splitCrusaderLightningTaken(deps, rows), resOf) };
  }
  function playerResistanceBounds(pStats, suffix) {
    let finalResistance = Number(pStats && pStats[`res${suffix}`] || 0);
    let uncappedResistance = Number.isFinite(Number(pStats && pStats[`rawRes${suffix}`])) ? Number(pStats[`rawRes${suffix}`]) : finalResistance;
    let maxResistance = Number.isFinite(Number(pStats && pStats[`maxRes${suffix}`])) ? Number(pStats[`maxRes${suffix}`]) : 75;
    return { uncappedResistance, maxResistance };
  }
  function getPlayerResistanceAfterEnemyModifiers(deps, pStats, element, enemy, effectMultiplier) {
    const suffix = { fire: "F", cold: "C", light: "L", chaos: "Chaos" }[element];
    if (!suffix) return 0;
    const { uncappedResistance, maxResistance } = playerResistanceBounds(pStats, suffix);
    const multiplier = Math.max(0, Number(effectMultiplier == null ? 1 : effectMultiplier) || 0);
    let resistanceReduction = Math.max(0, Number(enemy && enemy.resistanceReduction || 0)) * multiplier;
    let penetration = Math.max(0, Number(enemy && enemy.penetration || 0)) * multiplier;
    let reducedResistance = Math.min(maxResistance, uncappedResistance - resistanceReduction);
    return Math.max(deps.MIN_PENETRATED_RESISTANCE, reducedResistance - penetration);
  }
  function getCosmosBalancedMitigationPct(deps, pStats, enemy, physRes) {
    let resValues = ["fire", "cold", "light", "chaos"].map((ele) => getPlayerResistanceAfterEnemyModifiers(deps, pStats, ele, enemy));
    let total = Math.max(-60, Number(physRes) || 0) + resValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return Math.max(-60, Math.min(90, total / 5));
  }
  function getCosmosEqualSplitDamageBreakdown(deps, rawDamage, pStats, enemy) {
    let total = Math.max(1, Math.floor(Number(rawDamage) || 1));
    let elements = ["phys", "fire", "cold", "light", "chaos"];
    let remaining = total, mitigationOf = {};
    let rows = elements.map((ele, idx) => {
      let portion = idx === elements.length - 1 ? remaining : Math.floor(total / elements.length);
      remaining = Math.max(0, remaining - portion);
      let mitigation2 = ele === "phys" ? Math.max(-60, (pStats.dr || 0) + deps.getArmorPhysicalReductionPct(pStats.armor || 0, portion)) : getPlayerResistanceAfterEnemyModifiers(deps, pStats, ele, enemy);
      mitigationOf[ele] = pStats.cosmosBalanceMitigation ? getCosmosBalancedMitigationPct(deps, pStats, enemy, mitigation2) : mitigation2;
      return { ele, amount: portion };
    });
    return mitigateTakenRows(convertTakenRowsRaw(deps, rows, pStats), (row) => mitigationOf[row.ele]);
  }
  function createIncomingMitigation(deps) {
    return Object.freeze({
      getEnemyCritTakenMul: getEnemyCritTakenMul.bind(null, deps),
      getEmpoweredPhysicalDamage,
      getEmpoweredRawDamage,
      getEmpoweredElementRows: getEmpoweredElementRows.bind(null, deps),
      splitCrusaderLightningTaken: splitCrusaderLightningTaken.bind(null, deps),
      splitHelmChaosTaken,
      convertTakenRowsRaw: convertTakenRowsRaw.bind(null, deps),
      mitigateTakenRows,
      shiftPhysicalTakenAs: shiftPhysicalTakenAs.bind(null, deps),
      getPlayerResistanceAfterEnemyModifiers: getPlayerResistanceAfterEnemyModifiers.bind(null, deps),
      getCosmosBalancedMitigationPct: getCosmosBalancedMitigationPct.bind(null, deps),
      getCosmosEqualSplitDamageBreakdown: getCosmosEqualSplitDamageBreakdown.bind(null, deps)
    });
  }

  // modules/domain/player-ailments.mjs
  var DURATION_STATS = Object.freeze({
    ignite: "igniteTakenDurationReducePct",
    shock: "shockTakenDurationReducePct",
    chill: "coldTakenDurationReducePct",
    freeze: "coldTakenDurationReducePct",
    poison: "poisonTakenDurationReducePct",
    bleed: "bleedTakenDurationReducePct"
  });
  var RESIST_STATS = Object.freeze({
    ignite: "ailResIgnite",
    chill: "ailResFreeze",
    freeze: "ailResFreeze",
    shock: "ailResShock",
    poison: "ailResPoison",
    bleed: "ailResBleed"
  });
  var IMMUNITIES = Object.freeze({ ignite: "immuneIgnite", chill: "immuneChill", freeze: "immuneFreeze", shock: "immuneShock", bleed: "immuneBleed" });
  var DOT_STATS = Object.freeze({ ignite: ["resF", "igniteDamageReducePct"], bleed: ["dr", "bleedDamageReducePct"], poison: ["resChaos", "poisonDamageReducePct"] });
  function getPlayerAilmentResistChance(type, stats) {
    if (!stats) return 0;
    const res = Object.hasOwn(RESIST_STATS, type) ? stats[RESIST_STATS[type]] || 0 : 0;
    const chance = Math.max(0, Math.min(1, (res + (stats.ailmentResistBonusPct || 0)) / 100));
    return stats.passiveKeystoneFlags && stats.passiveKeystoneFlags.selfExperiment ? 1 - (1 - chance) * 0.5 : chance;
  }
  function incomingDuration(c, type, duration, stats) {
    const extended = stats.passiveKeystoneFlags && stats.passiveKeystoneFlags.selfExperiment ? duration * 2 : duration;
    return extended * (1 - c.deps.clampNumber(stats[DURATION_STATS[type]] || 0, 0, 75) / 100);
  }
  function incomingSource(c, input) {
    const opts = input.options && typeof input.options === "object" ? input.options : {};
    const hit = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== void 0 ? opts.ailmentSourceDamage : input.sourceHitDamage) || 0));
    const crit = Math.max(0, Number(opts.critDotBonusPct) || 0);
    return {
      sourceHitDamage: hit,
      critDotBonusPct: crit,
      ailmentDotScore: c.deps.getDamageAilmentScore(hit, crit, 1, 1),
      sourceEnemyId: opts.sourceEnemyId === void 0 ? null : opts.sourceEnemyId,
      sourceEnemyName: opts.sourceEnemyName || ""
    };
  }
  function refreshedAilment(rows, type) {
    const existing = rows.find((row) => row.type === type);
    if (type !== "poison") return existing;
    const poisons = rows.filter((row) => row && row.type === "poison");
    return poisons.length ? poisons.reduce((a, b) => (a.time || 0) <= (b.time || 0) ? a : b, poisons[0]) : null;
  }
  function refreshAilment(c, row, input, duration, source) {
    row.time = Math.max(row.time || 0, duration);
    row.duration = row.time;
    row.power = Math.max(row.power || 0, input.power || 0.1);
    if (!c.deps.isDamageAilmentType(input.type)) return;
    const score = Math.max(0, Number(row.ailmentDotScore) || c.deps.getStoredAilmentHitDamage(row));
    if (source.ailmentDotScore >= score) Object.assign(row, source);
  }
  function storeIncomingAilment(c, input, time) {
    const { type, power } = input;
    c.owner.playerAilments = Array.isArray(c.owner.playerAilments) ? c.owner.playerAilments : [];
    const source = incomingSource(c, input), existing = refreshedAilment(c.owner.playerAilments, type);
    if (existing) refreshAilment(c, existing, input, time, source);
    else {
      const row = { type, time, duration: time, power: Math.max(0.1, power || 0.1) };
      if (c.deps.isDamageAilmentType(type)) Object.assign(row, source);
      c.owner.playerAilments.push(row);
    }
  }
  function applyPlayerAilment(c, input) {
    const { type, duration, pStats } = input;
    if (!type || duration <= 0) return;
    const time = incomingDuration(c, type, duration, pStats);
    if (Object.hasOwn(IMMUNITIES, type) && pStats[IMMUNITIES[type]]) return;
    if (c.deps.random() < getPlayerAilmentResistChance(type, pStats)) return;
    storeIncomingAilment(c, input, time);
    if (typeof c.deps.recordPassiveCycleAilmentStart === "function") c.deps.recordPassiveCycleAilmentStart(type, pStats.cycle, c.deps.getCombatTime());
  }
  function recordPlayerAilmentIncomingDamage(c, ailment, element, amount) {
    const label = c.deps.getAilmentDisplayLabel(ailment && ailment.type);
    const hasMonster = ailment && ailment.sourceEnemyId !== null && ailment.sourceEnemyId !== void 0;
    const sourceName = ailment && ailment.sourceEnemyName || label;
    c.deps.recordIncomingDamage(element, amount, sourceName, {
      sourceType: hasMonster ? "monster" : "ailment",
      sourceId: hasMonster ? ailment.sourceEnemyId : null,
      sourceName,
      ailmentType: ailment && ailment.type
    });
  }
  function takeAilmentDamageFromEnergyShield(c, damage) {
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    const absorbed = Math.min(c.owner.playerEnergyShield, Math.max(0, damage));
    if (absorbed <= 0) return damage;
    c.owner.playerEnergyShield -= absorbed;
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    return damage - absorbed;
  }
  function ailmentTickDamage(c, ailment, stats, dt) {
    let damage = c.deps.getPlayerDamageAilmentDps(ailment, stats);
    if (!(damage > 0)) return null;
    const [resist, reduction] = DOT_STATS[ailment.type];
    damage = Math.max(1, Math.floor(damage * dt * (1 - Math.max(0, Math.min(0.75, (stats[resist] || 0) / 100))) * c.deps.getWoodsmanCurseDamageTakenMul()));
    damage = Math.max(0, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (stats.dotTakenDamageReducePct || 0) / 100)))));
    return Math.max(0, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (stats[reduction] || 0) / 100)))));
  }
  function tickShieldedAilment(c, ailment, stats, damage) {
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) damage = 0;
    damage = c.deps.floorIncomingDamage(damage);
    const beforeShields = damage;
    damage = c.deps.absorbDamageWithTalentStoneShield(takeAilmentDamageFromEnergyShield(c, damage));
    damage = c.deps.absorbDamageWithRealmDeathWard(damage, stats);
    c.owner.playerHp -= damage;
    c.deps.trackHiddenJournalPlayerDamage(damage);
    recordPlayerAilmentIncomingDamage(c, ailment, ailment.type === "ignite" ? "fire" : "phys", beforeShields);
  }
  function tickPoison(c, ailment, stats, damage) {
    if (stats.poisonToHeal) {
      c.owner.playerHp = Math.min(c.deps.getPlayerRecoveryHpCap(stats), c.owner.playerHp + damage);
      return;
    }
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) damage = 0;
    damage = c.deps.floorIncomingDamage(damage);
    damage = c.deps.absorbDamageWithTalentStoneShield(damage);
    damage = c.deps.absorbDamageWithRealmDeathWard(damage, stats);
    c.owner.playerHp -= damage;
    c.deps.trackHiddenJournalPlayerDamage(damage);
    recordPlayerAilmentIncomingDamage(c, ailment, "chaos", damage);
  }
  function tickPlayerAilment(c, ailment, stats, dt) {
    if (!Object.hasOwn(DOT_STATS, ailment.type)) return;
    const damage = ailmentTickDamage(c, ailment, stats, dt);
    if (damage === null) return;
    if (ailment.type === "poison") tickPoison(c, ailment, stats, damage);
    else tickShieldedAilment(c, ailment, stats, damage);
  }
  function tickAilments(c, stats, dt) {
    c.owner.playerAilments = Array.isArray(c.owner.playerAilments) ? c.owner.playerAilments : [];
    const next = [];
    c.owner.playerAilments.forEach((ailment) => {
      const previousTime = Math.max(0, Number(ailment.time) || 0);
      ailment.time = Math.max(0, (ailment.time || 0) - dt);
      tickPlayerAilment(c, ailment, stats, dt);
      if (ailment.time > 0) next.push(ailment);
      else if (previousTime > 0 && typeof c.deps.recordPassiveCycleAilmentEnd === "function") {
        c.deps.recordPassiveCycleAilmentEnd(ailment.type, stats && stats.cycle, c.deps.getCombatTime());
      }
    });
    c.owner.playerAilments = next;
  }
  function createPlayerAilments(deps) {
    return Object.freeze({
      apply: (owner, input) => applyPlayerAilment({ owner, deps }, input),
      tick: (owner, stats, dt) => tickAilments({ owner, deps }, stats, dt),
      resist: getPlayerAilmentResistChance
    });
  }

  // modules/combat-enemy-turn-classic.mjs
  var mitigation = createIncomingMitigation({
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() {
      return ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    },
    get clampNumber() {
      return clampNumber;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get MIN_PENETRATED_RESISTANCE() {
      return MIN_PENETRATED_RESISTANCE;
    },
    get getArmorPhysicalReductionPct() {
      return getArmorPhysicalReductionPct;
    }
  });
  var ailments = createPlayerAilments({
    get clampNumber() {
      return clampNumber;
    },
    random: () => Math.random(),
    get isDamageAilmentType() {
      return isDamageAilmentType;
    },
    get getDamageAilmentScore() {
      return getDamageAilmentScore;
    },
    get getStoredAilmentHitDamage() {
      return getStoredAilmentHitDamage;
    },
    get recordPassiveCycleAilmentStart() {
      return typeof recordPassiveCycleAilmentStart === "undefined" ? void 0 : recordPassiveCycleAilmentStart;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getAilmentDisplayLabel() {
      return getAilmentDisplayLabel;
    },
    get recordIncomingDamage() {
      return recordIncomingDamage;
    },
    get getPlayerDamageAilmentDps() {
      return getPlayerDamageAilmentDps;
    },
    get getWoodsmanCurseDamageTakenMul() {
      return getWoodsmanCurseDamageTakenMul;
    },
    get floorIncomingDamage() {
      return floorIncomingDamage;
    },
    get absorbDamageWithTalentStoneShield() {
      return absorbDamageWithTalentStoneShield;
    },
    get absorbDamageWithRealmDeathWard() {
      return absorbDamageWithRealmDeathWard;
    },
    get trackHiddenJournalPlayerDamage() {
      return trackHiddenJournalPlayerDamage;
    },
    get getPlayerRecoveryHpCap() {
      return getPlayerRecoveryHpCap;
    },
    get recordPassiveCycleAilmentEnd() {
      return typeof recordPassiveCycleAilmentEnd === "undefined" ? void 0 : recordPassiveCycleAilmentEnd;
    }
  });
  var flights = createEnemyFlights({
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get BOSS_ATTACK_IMPACT_DELAY_MS() {
      return BOSS_ATTACK_IMPACT_DELAY_MS;
    },
    get getCombatTravelMs() {
      return getCombatTravelMs;
    },
    get woodsmanAttackFxElement() {
      return woodsmanAttackFxElement;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    },
    get bossMoves() {
      return bossMoves;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get getBossStageActor() {
      return getBossStageActor;
    },
    get battleFx() {
      return battleFx;
    },
    get woodsmanStumps() {
      return woodsmanStumps;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    }
  });
  var defeat = createCombatDefeat({
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get isAutoOceanDive() {
      return isAutoOceanDive;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get getDefeatRecoveryZoneId() {
      return getDefeatRecoveryZoneId;
    },
    get CAMPAIGN_RESIST_PENALTY() {
      return CAMPAIGN_RESIST_PENALTY;
    },
    get getCampaignResistPenalty() {
      return getCampaignResistPenalty;
    },
    get _t() {
      return _t;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get ACT_RETREAT_LEVELS() {
      return ACT_RETREAT_LEVELS;
    },
    get getZone() {
      return getZone;
    },
    get ACT_REST_RECOVERY_PCT_PER_SEC() {
      return ACT_REST_RECOVERY_PCT_PER_SEC;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get recordPlayerDefeatStart() {
      return recordPlayerDefeatStart;
    },
    get recordImmortalHeroDeathPenalty() {
      return typeof recordImmortalHeroDeathPenalty === "undefined" ? void 0 : recordImmortalHeroDeathPenalty;
    },
    get addLog() {
      return addLog;
    },
    get exitBeehiveRun() {
      return typeof exitBeehiveRun === "undefined" ? void 0 : exitBeehiveRun;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get atlasRun() {
      return atlasRun;
    },
    get startMoving() {
      return startMoving;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get forceSurfaceOcean() {
      return forceSurfaceOcean;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get addWoodsmanPendingScore() {
      return addWoodsmanPendingScore;
    },
    get maybeUnlockChaosRealmFromWoodsman() {
      return maybeUnlockChaosRealmFromWoodsman;
    },
    get clearWoodsmanBuildLock() {
      return clearWoodsmanBuildLock;
    },
    get colonyRun() {
      return window.GameModules.colonyRun;
    },
    get abandonBeyondBoundaryRun() {
      return abandonBeyondBoundaryRun;
    },
    get ensureMeteorSiteState() {
      return ensureMeteorSiteState;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get getExpReq() {
      return getExpReq;
    },
    get buildDeathDamageSummary() {
      return buildDeathDamageSummary;
    },
    get normalizeDamageElementKey() {
      return normalizeDamageElementKey;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get DEATH_REASON_TEXT() {
      return DEATH_REASON_TEXT;
    },
    get buildDeathMonsterSummary() {
      return buildDeathMonsterSummary;
    },
    get snapshotPlayerAilmentsForDeathLog() {
      return snapshotPlayerAilmentsForDeathLog;
    },
    get retreatAfterActDefeat() {
      return retreatAfterActDefeat;
    },
    get takeDeathFightSummary() {
      return takeDeathFightSummary;
    }
  });
  var engagement = createEnemyEngagement({
    lose,
    get getColonyRoomRun() {
      return getColonyRoomRun;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get getBossPatternPreview() {
      return getBossPatternPreview;
    },
    get BOSS_REACH() {
      return BOSS_REACH;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get enemyAmbush() {
      return enemyAmbush;
    },
    get getGridUnitStepSec() {
      return getGridUnitStepSec;
    },
    get advanceGridUnitMovement() {
      return advanceGridUnitMovement;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getSummonEvadeChance() {
      return getSummonEvadeChance;
    },
    get resolveEntropyEvasion() {
      return resolveEntropyEvasion;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get failColonyDefense() {
      return failColonyDefense;
    },
    get getMonsterLoopGrowthScale() {
      return getMonsterLoopGrowthScale;
    },
    get getUnderworldEnemyDamageMultiplier() {
      return getUnderworldEnemyDamageMultiplier;
    },
    get getMonsterLoopPowerScale() {
      return getMonsterLoopPowerScale;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    },
    get getPlayerEnergyShieldRecoveryCap() {
      return getPlayerEnergyShieldRecoveryCap;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get getElementColor() {
      return getElementColor;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get recordIncomingDamage() {
      return recordIncomingDamage;
    }
  });
  var hazards = createCombatHazards({
    lose,
    ailments,
    get trialHazardRuntime() {
      return window.GameModules.state.combat.trialHazardRuntime;
    },
    set trialHazardRuntime(value) {
      window.GameModules.state.combat.trialHazardRuntime = value;
    },
    get getArmorPhysicalReductionPct() {
      return getArmorPhysicalReductionPct;
    },
    get getCombatGridSize() {
      return getCombatGridSize;
    },
    get getTrialHazardProfile() {
      return getTrialHazardProfile;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get isGridCellInBounds() {
      return isGridCellInBounds;
    },
    get getGridPlacementTerrain() {
      return getGridPlacementTerrain;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get hasPlayerChannelBreakingAilment() {
      return hasPlayerChannelBreakingAilment;
    },
    get isPlayerAttackRecovering() {
      return isPlayerAttackRecovering;
    },
    get advanceGridHazardEscape() {
      return advanceGridHazardEscape;
    },
    get cancelCombatChannel() {
      return cancelCombatChannel;
    },
    get getTacticalMoveAttackDelayMs() {
      return getTacticalMoveAttackDelayMs;
    },
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    get isGridUnitInCellSet() {
      return isGridUnitInCellSet;
    },
    get getBossWarningCells() {
      return getBossWarningCells;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    },
    get floorIncomingDamage() {
      return floorIncomingDamage;
    },
    get triggerUniqueEnergyShieldBreakRecharge() {
      return triggerUniqueEnergyShieldBreakRecharge;
    },
    get absorbDamageWithTalentStoneShield() {
      return absorbDamageWithTalentStoneShield;
    },
    get absorbDamageWithRealmDeathWard() {
      return absorbDamageWithRealmDeathWard;
    },
    get recordIncomingDamage() {
      return recordIncomingDamage;
    },
    get addLog() {
      return addLog;
    },
    get _t() {
      return _t;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get clampNumber() {
      return clampNumber;
    },
    get getPlayerShockTakenDamageIncreasePct() {
      return getPlayerShockTakenDamageIncreasePct;
    },
    get getZone() {
      return getZone;
    }
  });
  function lose(owner, zone, stats, message, options) {
    /* @dev-only */
    if (combatTestImmortal) {
      owner.playerHp = getPlayerHpCap(stats || getPlayerStats());
      return;
    }
    /* @end-dev-only */
    return consumeDomainCommands(defeat.handlePlayerDefeat(owner, zone, stats, message, options), defeatEffects);
  }
  var defeatEffects = { requestDeathReport: (log) => window.GameModules.playFeedback.death.request(log) };
  var resolver = createMonsterAttackResolver({
    ...mitigation,
    flights,
    ailments,
    engagement,
    lose,
    get getZone() {
      return getZone;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get applyEnemyRegen() {
      return applyEnemyRegen;
    },
    get getSoftenedLoopDepth() {
      return getSoftenedLoopDepth;
    },
    get getLoopDifficultyInputs() {
      return getLoopDifficultyInputs;
    },
    get clampNumber() {
      return clampNumber;
    },
    get getConditionDebuffDelta() {
      return getConditionDebuffDelta;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    },
    get strikeRescueTarget() {
      return strikeRescueTarget;
    },
    get bossMoves() {
      return bossMoves;
    },
    get enemyTimeSlowed() {
      return enemyTimeSlowed;
    },
    get TIME_SLOW_MOVE() {
      return TIME_SLOW_MOVE;
    },
    get getDifficultyBenchmarkProfile() {
      return getDifficultyBenchmarkProfile;
    },
    get refreshBossPatternPreview() {
      return typeof refreshBossPatternPreview === "undefined" ? void 0 : refreshBossPatternPreview;
    },
    get updateBossPatternTelegraph() {
      return updateBossPatternTelegraph;
    },
    get consumeBossPatternAttack() {
      return typeof consumeBossPatternAttack === "undefined" ? void 0 : consumeBossPatternAttack;
    },
    get applyCosmosBossAttackSetup() {
      return applyCosmosBossAttackSetup;
    },
    get applyCosmosBossPlayerDebuff() {
      return applyCosmosBossPlayerDebuff;
    },
    get applyCosmosAstraStance() {
      return applyCosmosAstraStance;
    },
    get rndChoice() {
      return rndChoice;
    },
    get addLog() {
      return addLog;
    },
    get _t() {
      return _t;
    },
    get skillGemCombatRuntime() {
      return window.GameModules.state.combat.skillGemCombatRuntime;
    },
    get skillGemCasts() {
      return skillGemCasts;
    },
    get getEntryBossTuning() {
      return getEntryBossTuning;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get loopMutation() {
      return loopMutation;
    },
    get getArmorPhysicalReductionPct() {
      return getArmorPhysicalReductionPct;
    },
    get applyPassiveAshuraDamageBreakdown() {
      return typeof applyPassiveAshuraDamageBreakdown === "undefined" ? void 0 : applyPassiveAshuraDamageBreakdown;
    },
    get getGridDirectHitDistanceMultiplier() {
      return getGridDirectHitDistanceMultiplier;
    },
    get normalizeDamageElementKey() {
      return normalizeDamageElementKey;
    },
    get getWoodsmanCurseDamageTakenMul() {
      return getWoodsmanCurseDamageTakenMul;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get applySituationalTakenReduction() {
      return applySituationalTakenReduction;
    },
    get isTalentMonsterAlwaysHit() {
      return typeof isTalentMonsterAlwaysHit === "undefined" ? void 0 : isTalentMonsterAlwaysHit;
    },
    get resolveEntropyEvasion() {
      return resolveEntropyEvasion;
    },
    get addEvasionCombatLog() {
      return addEvasionCombatLog;
    },
    get recordPlayerEvadeUniqueEffects() {
      return recordPlayerEvadeUniqueEffects;
    },
    get repelMeleeAttacker() {
      return repelMeleeAttacker;
    },
    get recoverEnergyShieldOnBlock() {
      return recoverEnergyShieldOnBlock;
    },
    get regionAffixEffects() {
      return regionAffixEffects;
    },
    get grantTalentStoneShieldOnBlock() {
      return grantTalentStoneShieldOnBlock;
    },
    get floorIncomingDamage() {
      return floorIncomingDamage;
    },
    get getPassiveAshuraAilmentChance() {
      return typeof getPassiveAshuraAilmentChance === "undefined" ? void 0 : getPassiveAshuraAilmentChance;
    },
    get isDamageAilmentType() {
      return isDamageAilmentType;
    },
    get grantWarriorRageOnHit() {
      return grantWarriorRageOnHit;
    },
    get getPreciseTalentRatio() {
      return typeof getPreciseTalentRatio === "undefined" ? void 0 : getPreciseTalentRatio;
    },
    get getPreciseTalentLevel() {
      return getPreciseTalentLevel;
    },
    get getPlayerRecoveryHpCap() {
      return getPlayerRecoveryHpCap;
    },
    get getSummonRedirectPct() {
      return getSummonRedirectPct;
    },
    get getSummonEvadeChance() {
      return getSummonEvadeChance;
    },
    get triggerUniqueEnergyShieldBreakRecharge() {
      return triggerUniqueEnergyShieldBreakRecharge;
    },
    get absorbDamageWithTalentStoneShield() {
      return absorbDamageWithTalentStoneShield;
    },
    get absorbDamageWithRealmDeathWard() {
      return absorbDamageWithRealmDeathWard;
    },
    get recordPassiveKarmaLoss() {
      return typeof recordPassiveKarmaLoss === "undefined" ? void 0 : recordPassiveKarmaLoss;
    },
    get trackHiddenJournalPlayerDamage() {
      return trackHiddenJournalPlayerDamage;
    },
    get addPlayerRecoupInstance() {
      return addPlayerRecoupInstance;
    },
    get recordIncomingDamage() {
      return recordIncomingDamage;
    },
    get getElementColor() {
      return getElementColor;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get getDamageElementIcon() {
      return getDamageElementIcon;
    },
    get formatNumberKR() {
      return formatNumberKR;
    },
    get getDamageElementLabel() {
      return getDamageElementLabel;
    },
    random: () => Math.random()
  });
  var resolve = (owner, stats) => resolver.resolve(owner, stats);
  function noteCampaignResistPenalty(zoneId) {
    return defeat.noteCampaignResistPenalty(game, zoneId);
  }
  function holdActRetreat(zone) {
    return defeat.holdActRetreat(game, zone);
  }
  function applyActRestRecovery(pStats, hpCap) {
    return defeat.applyActRestRecovery(game, pStats, hpCap);
  }
  function handlePlayerDefeat(zone, pStats, message, options) {
    return lose(game, zone, pStats, message, options);
  }
  function holdAfterDefeat() {
    return defeat.holdAfterDefeat(game);
  }
  function defeatInOceanDive(zone, message, opts, ui) {
    return defeat.defeatInOceanDive(game, zone, message, opts, ui);
  }
  function clearDefeatedEncounter() {
    return defeat.clearDefeatedEncounter(game);
  }
  function defeatInGrandBreach(zone, message, opts, ui) {
    return defeat.defeatInGrandBreach(game, zone, message, opts, ui);
  }
  function defeatBeyondBoundary(zone, message, opts, ui) {
    return defeat.defeatBeyondBoundary(game, zone, message, opts, ui);
  }
  function defeatAtMeteor(zone, message, opts, ui) {
    return defeat.defeatAtMeteor(game, zone, message, opts, ui);
  }
  function defeatInTimeRift(zone, message, opts, ui) {
    return defeat.defeatInTimeRift(game, zone, message, opts, ui);
  }
  function defeatInRootBossFight(zone, message, opts, ui) {
    return defeat.defeatInRootBossFight(game, zone, message, opts, ui);
  }
  function defeatInTrial(zone, message, opts, ui) {
    return defeat.defeatInTrial(game, zone, message, opts, ui);
  }
  function defeatOnUnderworldFloor(zone, message, opts, ui) {
    return defeat.defeatOnUnderworldFloor(game, zone, message, opts, ui);
  }
  function getPlayerAilmentResistChance2(type, pStats) {
    return ailments.resist(type, pStats);
  }
  function applyPlayerAilment2(type, duration, power, ...detail) {
    const [pStats, sourceHitDamage, options] = detail;
    return ailments.apply(game, { type, duration, power, pStats, sourceHitDamage, options });
  }
  function tickAilments2(pStats, dt) {
    return ailments.tick(game, pStats, dt);
  }
  function isEnemyInGridAttackRange(enemy, target) {
    return engagement.isEnemyInGridAttackRange(game, enemy, target);
  }
  function canEnemyAttackFromHere(enemy, target) {
    return engagement.canEnemyAttackFromHere(game, enemy, target);
  }
  function advanceEnemyGridApproach(enemy, target, slowPct) {
    return engagement.advanceEnemyGridApproach(game, enemy, target, slowPct);
  }
  function getSummonRespawnAt(summon, shortened) {
    return engagement.getSummonRespawnAt(game, summon, shortened);
  }
  function getClosestLivingSummonToPlayer() {
    return engagement.getClosestLivingSummonToPlayer(game);
  }
  function applyMonsterDamageToSummon(summon, rawDamage, enemy, pStats, bossPattern) {
    return engagement.applyMonsterDamageToSummon(game, { summon, rawDamage, enemy, pStats, bossPattern });
  }
  function queueEnemyCombatAttack(enemy, target, bossPattern, delivery) {
    return flights.queue(game, enemy, target, bossPattern, delivery);
  }
  function announceEnemyAttackRelease(enemy, bossPattern, delivery, target) {
    return flights.release(game, enemy, bossPattern, delivery, target);
  }
  function retireDeadEnemyAttacks(enemy) {
    return flights.retire(game, enemy);
  }
  function dropEnemyAttack(index, now) {
    return flights.drop(game, index, now);
  }
  function settleLastEnemyAttacks(pStats) {
    if ((game.enemies || []).length > 0 || window.GameModules.state.combat.pendingEnemyCombatAttacks.length === 0) return;
    performMonsterAttacks(pStats);
  }
  function takePendingEnemyCombatAttack(enemyId, now) {
    return flights.take(game, enemyId, now);
  }
  function getEnemyCombatImpactTargets(pendingAttack) {
    return flights.targets(game, pendingAttack);
  }
  function getMonsterBaseHitDamage(zone, seasonDepth, tierPressure, benchmarkProfile) {
    return engagement.getMonsterBaseHitDamage(game, zone, seasonDepth, tierPressure, benchmarkProfile);
  }
  function performMonsterAttacks(pStats) {
    resolve(game, pStats);
  }
  function calculateTrialTrapDamage(zone, pStats, trapElement) {
    return hazards.calculateTrialTrapDamage(game, zone, pStats, trapElement);
  }
  function getBloomTrialRegenSuppressNext(zone, currentSuppress) {
    return hazards.getBloomTrialRegenSuppressNext(zone, currentSuppress);
  }
  function buildTrialHazardCells(zone, origin, sequence) {
    return hazards.buildTrialHazardCells(game, zone, origin, sequence);
  }
  function createTrialHazard(zone, now) {
    return hazards.createTrialHazard(game, zone, now);
  }
  function isTrialHazardPositionHeld() {
    return hazards.isTrialHazardPositionHeld(game);
  }
  function bossWarningApproach(warned) {
    return hazards.bossWarningApproach(game, warned);
  }
  function updateCombatHazardEvasion(pStats) {
    return hazards.updateCombatHazardEvasion(game, pStats);
  }
  function dealTrialTrapDamage(zone, pStats, hazard, trapDamage) {
    return hazards.dealTrialTrapDamage(game, zone, pStats, hazard, trapDamage);
  }
  function resolveTrialHazardImpact(zone, pStats, hazard, now) {
    return hazards.resolveTrialHazardImpact(game, zone, pStats, hazard, now);
  }
  function applyTrialTrapTick(pStats, deferEscape) {
    return hazards.applyTrialTrapTick(game, pStats, deferEscape);
  }
  function defeatReturnZone(returnZoneId) {
    return defeat.defeatReturnZone(game, returnZoneId);
  }
  function isApexFight() {
    return hazards.isApexFight(game);
  }
  function groundHazardCells() {
    return hazards.groundHazardCells(game);
  }
  /* @dev-only */
  var combatTestImmortal = false;
  function setCombatTestImmortal(on) {
    combatTestImmortal = !!on;
  }
  safeExposeGlobals({ setCombatTestImmortal });
  /* @end-dev-only */
  safeExposeGlobals({ defeatReturnZone, isApexFight, groundHazardCells, noteCampaignResistPenalty, holdActRetreat, applyActRestRecovery, handlePlayerDefeat, holdAfterDefeat, defeatInOceanDive, clearDefeatedEncounter, defeatInGrandBreach, defeatBeyondBoundary, defeatAtMeteor, defeatInTimeRift, defeatInRootBossFight, defeatInTrial, defeatOnUnderworldFloor, getPlayerAilmentResistChance: getPlayerAilmentResistChance2, applyPlayerAilment: applyPlayerAilment2, tickAilments: tickAilments2, isEnemyInGridAttackRange, canEnemyAttackFromHere, advanceEnemyGridApproach, getSummonRespawnAt, getClosestLivingSummonToPlayer, applyMonsterDamageToSummon, queueEnemyCombatAttack, announceEnemyAttackRelease, retireDeadEnemyAttacks, dropEnemyAttack, settleLastEnemyAttacks, takePendingEnemyCombatAttack, getEnemyCombatImpactTargets, getMonsterBaseHitDamage, performMonsterAttacks, calculateTrialTrapDamage, getBloomTrialRegenSuppressNext, buildTrialHazardCells, createTrialHazard, isTrialHazardPositionHeld, bossWarningApproach, updateCombatHazardEvasion, dealTrialTrapDamage, resolveTrialHazardImpact, applyTrialTrapTick });
})();
