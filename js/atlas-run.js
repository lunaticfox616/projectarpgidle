// GENERATED from modules/atlas-run*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-run-access.mjs
  function atlasSessionInMap(env, owner) {
    return owner.currentZoneId === env.deps.ATLAS.zoneId;
  }
  function atlasSessionInsideMap(env, owner) {
    return atlasSessionInMap(env, owner) && !env.deps.actExplorationState.current(owner)?.departure;
  }
  function atlasSessionReturnZone(env, id) {
    return Number.isInteger(id) && env.deps.getZone(id) ? id : env.deps.getDefeatRecoveryZoneId();
  }
  function atlasSessionDepartureBlock(env, owner) {
    if (owner.pendingLoopReady || owner.pendingLoopDecision) return "루프 정산 화면에서 먼저 결정하세요(루프 진행 또는 나중에 루프).";
    return env.deps.isBeehiveRunLockedForMapTravel() || owner.beyondBoundary.activeRun || owner.woodsmanBuildLock ? "진행 중인 도전을 마친 뒤 지도를 여세요." : "";
  }
  function atlasSessionLastPortal(env, owner) {
    return atlasSessionInsideMap(env, owner) && !!owner.atlas.run && owner.atlas.run.portals <= 1;
  }

  // modules/domain/atlas-run-entry.mjs
  function* atlasSessionOpen(env, owner, uid) {
    env.deps.atlas.sync(owner);
    const reason = env.deps.atlas.beginReason(owner, uid) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.begin(owner, uid, owner.currentZoneId);
    return yield* atlasSessionDepart(env, owner);
  }
  function* atlasSessionOpenPinnacle(env, owner) {
    const reason = env.deps.atlas.pinnacleReason(owner) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.beginPinnacle(owner, owner.currentZoneId);
    return yield* atlasSessionDepart(env, owner);
  }
  function* atlasSessionOpenEndgame(env, owner, id) {
    const reason = env.deps.atlasEndgame.entryReason(owner, id) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlasEndgame.spend(owner, id);
    env.deps.atlas.beginSpecial(owner, id, owner.currentZoneId);
    return yield* atlasSessionDepart(env, owner);
  }
  function* atlasSessionOpenMemory(env, owner, nodeId, tier) {
    const reason = env.deps.memoryDungeon.entryReason(owner, nodeId, tier) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.beginMemory(owner, nodeId, tier, owner.currentZoneId);
    return yield* atlasSessionDepart(env, owner);
  }
  function* atlasSessionOpenBoard(env, owner) {
    const reason = atlasSessionDepartureBlock(env, owner) || env.deps.atlas.beginBoard(owner, owner.currentZoneId);
    if (reason) return reason;
    return yield* atlasSessionDepart(env, owner);
  }
  function* atlasSessionDepart(env, owner) {
    env.deps.combatLootReceipts.reset(owner);
    yield { kind: "atlasSessionEffectChangeZone", args: [env.deps.ATLAS.zoneId] };
    if (atlasSessionInMap(env, owner)) return "";
    env.deps.atlas.cancel(owner);
    return "지도로 이동할 수 없습니다.";
  }
  function* atlasSessionReenter(env, owner) {
    const reason = owner.atlas.run ? atlasSessionDepartureBlock(env, owner) : "열린 지도가 없습니다.";
    if (reason) return reason;
    if (!atlasSessionInMap(env, owner)) yield { kind: "atlasSessionEffectChangeZone", args: [env.deps.ATLAS.zoneId] };
    return atlasSessionInMap(env, owner) ? "" : "지도로 이동할 수 없습니다.";
  }

  // modules/domain/atlas-run-events.mjs
  function* atlasSessionNotify(env, detail) {
    return yield { kind: "atlasSessionEffectDispatchRuntimeEvent", args: ["atlas-map", detail] };
  }

  // modules/domain/atlas-run-travel.mjs
  function* atlasSessionRecoverClosedMap(env, owner) {
    if (atlasSessionInMap(env, owner) && !owner.atlas.run) yield* atlasSessionTravelBack(env, owner, null);
  }
  function* atlasSessionAbandon(env, owner) {
    if (!owner.atlas.run) return false;
    const { returnZoneId } = env.deps.atlas.close(owner, "failed");
    if (atlasSessionInMap(env, owner)) yield* atlasSessionTravelBack(env, owner, returnZoneId);
    return true;
  }
  function* atlasSessionTravelBack(env, owner, returnZoneId) {
    owner.currentZoneId = atlasSessionReturnZone(env, returnZoneId);
    owner.killsInZone = 0;
    owner.enemies = [];
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.runProgress = 0;
    yield { kind: "atlasSessionEffectStartMoving", args: [false] };
  }
  function* atlasSessionHalt(env, owner) {
    env.deps.actExplorationProgress.depart(owner);
    env.deps.actExplorationProgress.stopAfterCompletion(owner);
    yield { kind: "atlasSessionEffectPrepareActExplorationArrival", args: [] };
  }
  function* atlasSessionDefeat(env, owner, zone) {
    if (zone && zone.type === "atlasMap") yield* atlasSessionSpendPortal(env, owner, "defeat");
  }
  function* atlasSessionLeave(env, owner, reason) {
    if (atlasSessionInsideMap(env, owner)) yield* atlasSessionSpendPortal(env, owner, reason);
  }
  function* atlasSessionTravel(env, owner, zone) {
    if (zone.id !== env.deps.ATLAS.zoneId) yield* atlasSessionLeave(env, owner, "travel");
    owner.currentZoneId = zone.id;
  }
  function* atlasSessionSpendPortal(env, owner, reason) {
    const portal = env.deps.atlas.usePortal(owner);
    if (!portal) return;
    yield* atlasSessionNotify(env, { kind: portal.closed ? "failed" : "portal", reason, portals: portal.portals || 0 });
    if (!portal.closed) return;
    if (atlasSessionInMap(env, owner)) owner.currentZoneId = atlasSessionReturnZone(env, portal.returnZoneId);
    owner.killsInZone = 0;
    yield { kind: "atlasSessionEffectQueueImportantSave", args: [160] };
  }

  // modules/domain/atlas-run-spoils.mjs
  function* atlasSessionGrantSpoils(env, owner, result, zone) {
    if (result.board) yield* atlasSessionGrantBoardSpoils(env, owner, result.board, zone);
    if (result.ticket) yield { kind: "atlasSessionEffectAwardCurrency", args: [result.ticket, 1] };
    for (const [key, amount] of result.rewards || []) yield { kind: "atlasSessionEffectAwardCurrency", args: [key, amount] };
    if (result.endgame) yield* atlasSessionGrantEndgameSpoils(env, result.endgame, result.tier);
    if (result.memory && result.memory.spoils) yield* atlasSessionGrantMemorySpoils(env, result.memory.spoils, result.tier, zone);
  }
  function* atlasSessionGrantBoardSpoils(env, owner, spoils, zone) {
    for (const [key, amount] of spoils.rewards) yield { kind: "atlasSessionEffectAwardCurrency", args: [key, amount] };
    for (let i = 0; i < spoils.gear; i++) {
      const item = yield { kind: "atlasSessionEffectGenerateEquipmentDrop", args: [{ isBoss: true }, { zone, minimumRarity: "rare" }] };
      if (item) yield { kind: "atlasSessionEffectAddItemToInventory", args: [item, { guaranteedKeep: true }] };
    }
    yield* atlasSessionNotify(env, { kind: "board", message: owner.atlas.board.message });
  }
  function* atlasSessionGrantMemorySpoils(env, spoils, tier, zone) {
    for (const [key, amount] of spoils.rewards) yield { kind: "atlasSessionEffectAwardCurrency", args: [key, amount] };
    const items = [];
    if (spoils.unique) items.push(env.deps.itemInfluences.swapUnique(yield { kind: "atlasSessionEffectGenerateUniqueItem", args: [tier, null, spoils.unique === "any" ? null : spoils.unique, zone || void 0] }, spoils.tier));
    if (spoils.gear) items.push(yield { kind: "atlasSessionEffectGenerateEquipmentDrop", args: [{ isBoss: true }, { zone, minimumRarity: "rare" }] });
    spoils.items = items.filter(Boolean);
    for (const item of spoils.items) yield { kind: "atlasSessionEffectAddItemToInventory", args: [item, { guaranteedKeep: true }] };
  }
  function* atlasSessionGrantEndgameSpoils(env, spoils, tier) {
    for (const [key, amount] of spoils.rewards) yield { kind: "atlasSessionEffectAwardCurrency", args: [key, amount] };
    if (!spoils.unique) return;
    const item = yield { kind: "atlasSessionEffectGenerateUniqueItem", args: [tier, null, spoils.unique] };
    if (item) yield { kind: "atlasSessionEffectAddItemToInventory", args: [item, { guaranteedKeep: true }] };
  }

  // modules/domain/atlas-run-completion.mjs
  function* atlasSessionSettle(env, owner, zone) {
    const settled = env.deps.atlas.complete(owner);
    if (settled) yield* atlasSessionGrantSpoils(env, owner, settled, zone);
    return settled;
  }
  function* atlasSessionFinish(env, owner, zone) {
    const result = yield { kind: "atlasSessionEffectCaptureAtlasCompletion", args: [owner, atlasSessionSettle(env, owner, zone)] };
    if (!result) return;
    env.deps.atlas.keepLoot(owner, owner.explorationLoot);
    owner.killsInZone = 0;
    const stop = owner.settings.mapCompleteAction === "stop";
    const next = atlasSessionNextMapForResult(env, owner, stop, result);
    const opened = !!next && !env.deps.atlas.begin(owner, next.uid, result.returnZoneId);
    if (opened) env.deps.combatLootReceipts.reset(owner);
    yield* atlasSessionNotify(env, { kind: "complete", name: zone.name, ...result, next: opened ? owner.atlas.run.map.node : null });
    owner.currentZoneId = opened ? env.deps.ATLAS.zoneId : atlasSessionReturnZone(env, result.returnZoneId);
    yield { kind: "atlasSessionEffectMarkAtlasRefresh", args: [] };
    yield { kind: "atlasSessionEffectQueueImportantSave", args: [220] };
    if (stop) return yield* atlasSessionHalt(env, owner);
    if (opened && env.deps.actExplorationProgress.deferDeparture(owner)) return;
    env.deps.actExplorationProgress.reconcileDeparture(owner);
    yield { kind: "atlasSessionEffectStartMoving", args: [false] };
  }
  function atlasSessionNextMapForResult(env, owner, stop, result) {
    const kind = env.deps.atlas.node(result.nodeId)?.kind;
    if (stop || result.board || result.memory?.spoils || !["map", "guardian"].includes(kind)) return null;
    return env.deps.atlas.nextAuto(owner, result.tier);
  }

  // modules/domain/atlas-run-drops.mjs
  function* atlasSessionOnKill(env, owner, enemy) {
    const zone = env.deps.getZone(owner.currentZoneId);
    const dice = env.deps.atlasBoard.onKill(owner, enemy, zone);
    if (dice) yield { kind: "atlasSessionEffectQueueImportantSave", args: [220] };
    yield* atlasSessionGiveBearerOmen(env, enemy);
    yield { kind: "atlasSessionEffectGrantAtlasFinds", args: [zone, enemy] };
    const maps = env.deps.atlas.dropFromKill(owner, zone, enemy), fragments = env.deps.atlas.fragmentFromKill(owner, zone, enemy);
    const room = zone && zone.type === "atlasMap" && owner.atlas.run ? atlasSessionEmptyRoom(env, owner, enemy) : null;
    const rewards = room ? yield* atlasSessionClearRoom(env, owner, zone, room, maps) : [];
    const late = room ? env.deps.atlasEndgame.roomItems(owner, zone, room) : [];
    if (!maps.length && !fragments.length && !room) return;
    yield* atlasSessionNotify(env, {
      kind: "drops",
      maps: maps.map((map) => ({ node: map.node, tier: map.tier, rarity: map.rarity })),
      fragments,
      room,
      rewards,
      late,
      golden: env.deps.atlasEncounters.isGolden(zone, room)
    });
  }
  function* atlasSessionGiveBearerOmen(env, enemy) {
    const omen = env.deps.atlasEndgame.takeOmen(enemy);
    if (!omen || !(yield { kind: "atlasSessionEffectAwardEnemyLootCurrency", args: [omen, 1] })) return;
    yield* atlasSessionNotify(env, { kind: "omen", key: omen });
    yield { kind: "atlasSessionEffectQueueImportantSave", args: [220] };
  }
  function atlasSessionEmptyRoom(env, owner, enemy) {
    const pack = env.deps.atlasEncounters.emptiedPack(owner, enemy);
    if (!pack || pack.stage !== null || pack.objectId) return null;
    env.deps.atlas.markCleared(owner, pack.roomId);
    return Object.hasOwn(env.deps.ATLAS.encounters, pack.encounter || "") ? pack.encounter : null;
  }
  function* atlasSessionClearRoom(env, owner, zone, room, maps) {
    const rewards = env.deps.atlasEncounters.rewards(zone, room, owner.atlas.run.bonus, Math.random);
    for (const [key, amount] of rewards) yield { kind: "atlasSessionEffectAwardEnemyLootCurrency", args: [key, amount] };
    if (Math.random() < env.deps.ATLAS.encounters[room].mapChance) maps.push(...env.deps.atlas.extraMap(owner));
    if (room === "nursery" && typeof env.deps.stumpNursery === "object") yield* atlasSessionGiveNurseryGifts(env, owner, zone);
    return rewards;
  }
  function* atlasSessionGiveNurseryGifts(env, owner, zone) {
    const gifts = env.deps.atlasEncounters.nurseryGifts(zone, owner.atlas.run.bonus, Math.random);
    for (let i = 0; i < gifts; i++) yield { kind: "atlasSessionEffectGrantNurseryGift", args: [owner, zone] };
  }
  function* atlasSessionOnChaos20(env, owner) {
    const opened = !owner.atlas.unlocked;
    const maps = env.deps.atlas.sync(owner);
    if (opened || maps.length) yield* atlasSessionNotify(env, { kind: "starter", opened, count: maps.length });
  }

  // modules/domain/atlas-run.mjs
  function createAtlasRun(deps) {
    const env = { deps };
    return Object.freeze({
      open: (...args) => atlasSessionOpen(env, ...args),
      openPinnacle: (...args) => atlasSessionOpenPinnacle(env, ...args),
      openEndgame: (...args) => atlasSessionOpenEndgame(env, ...args),
      openMemory: (...args) => atlasSessionOpenMemory(env, ...args),
      openBoard: (...args) => atlasSessionOpenBoard(env, ...args),
      reenter: (...args) => atlasSessionReenter(env, ...args),
      abandon: (...args) => atlasSessionAbandon(env, ...args),
      finish: (...args) => atlasSessionFinish(env, ...args),
      defeat: (...args) => atlasSessionDefeat(env, ...args),
      leave: (...args) => atlasSessionLeave(env, ...args),
      travel: (...args) => atlasSessionTravel(env, ...args),
      onKill: (...args) => atlasSessionOnKill(env, ...args),
      onChaos20: (...args) => atlasSessionOnChaos20(env, ...args),
      recoverClosedMap: (...args) => atlasSessionRecoverClosedMap(env, ...args),
      lastPortal: (...args) => atlasSessionLastPortal(env, ...args),
      blockReason: (...args) => atlasSessionDepartureBlock(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/atlas-run-classic.mjs
  var rules = createAtlasRun({
    get ATLAS() {
      return ATLAS;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getZone() {
      return getZone;
    },
    get getDefeatRecoveryZoneId() {
      return getDefeatRecoveryZoneId;
    },
    get isBeehiveRunLockedForMapTravel() {
      return isBeehiveRunLockedForMapTravel;
    },
    get atlas() {
      return atlas;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get memoryDungeon() {
      return memoryDungeon;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get atlasBoard() {
      return atlasBoard;
    },
    get atlasEncounters() {
      return atlasEncounters;
    },
    get stumpNursery() {
      return typeof stumpNursery === "undefined" ? void 0 : stumpNursery;
    }
  });
  var effects = {
    atlasSessionEffectChangeZone: (...args) => changeZone(...args),
    atlasSessionEffectStartMoving: (...args) => startMoving(...args),
    atlasSessionEffectPrepareActExplorationArrival: (...args) => prepareActExplorationArrival(...args),
    atlasSessionEffectQueueImportantSave: (...args) => queueImportantSave(...args),
    atlasSessionEffectCaptureAtlasCompletion(state, commands) {
      return combatLootReceipts.capture(state, () => consumeDomainCommands(commands, effects));
    },
    atlasSessionEffectMarkAtlasRefresh() {
      pendingHeavyUiRefresh = true;
    },
    atlasSessionEffectAwardCurrency: (...args) => awardCurrency(...args),
    atlasSessionEffectAddItemToInventory: (...args) => addItemToInventory(...args),
    atlasSessionEffectGenerateEquipmentDrop: (...args) => generateEquipmentDrop(...args),
    atlasSessionEffectGenerateUniqueItem: (...args) => generateUniqueItem(...args),
    atlasSessionEffectGrantAtlasFinds: (...args) => atlasFinds.onAtlasKill(...args),
    atlasSessionEffectGrantNurseryGift: (...args) => stumpNursery.clearGift(...args),
    atlasSessionEffectAwardEnemyLootCurrency: (...args) => awardEnemyLootCurrency(...args),
    atlasSessionEffectDispatchRuntimeEvent: (...args) => dispatchRuntimeEvent(...args)
  };
  var atlasRun = Object.freeze({
    open: (...args) => consumeDomainCommands(rules.open(game, ...args), effects),
    openPinnacle: (...args) => consumeDomainCommands(rules.openPinnacle(game, ...args), effects),
    openEndgame: (...args) => consumeDomainCommands(rules.openEndgame(game, ...args), effects),
    openMemory: (...args) => consumeDomainCommands(rules.openMemory(game, ...args), effects),
    openBoard: (...args) => consumeDomainCommands(rules.openBoard(game, ...args), effects),
    reenter: (...args) => consumeDomainCommands(rules.reenter(game, ...args), effects),
    abandon: (...args) => consumeDomainCommands(rules.abandon(game, ...args), effects),
    finish: (...args) => consumeDomainCommands(rules.finish(game, ...args), effects),
    defeat: (...args) => consumeDomainCommands(rules.defeat(game, ...args), effects),
    leave: (...args) => consumeDomainCommands(rules.leave(game, ...args), effects),
    travel: (...args) => consumeDomainCommands(rules.travel(game, ...args), effects),
    onKill: (...args) => consumeDomainCommands(rules.onKill(game, ...args), effects),
    onChaos20: (...args) => consumeDomainCommands(rules.onChaos20(game, ...args), effects),
    recoverClosedMap: (...args) => consumeDomainCommands(rules.recoverClosedMap(game, ...args), effects),
    lastPortal: (...args) => rules.lastPortal(game, ...args),
    blockReason: (...args) => rules.blockReason(game, ...args)
  });
  safeExposeGlobals({ atlasRun });
})();
