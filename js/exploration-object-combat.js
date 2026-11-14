// GENERATED from modules/exploration-object-combat*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-object-rules.mjs
  function objectDistance(a, b) {
    return Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
  }
  function objectEntries(run) {
    return run.objects?.entries || [];
  }
  function objectCancel(run) {
    if (run?.objects) run.objects.pendingId = null;
  }
  function objectInteractive(env, run) {
    return run && !run.arrival && run.status === "active" && !run.completionApplied && !env.owner.isBackgroundCalculation && !env.owner.combatHalted && env.owner.playerHp > 0 && env.owner.moveTimer <= 0;
  }

  // modules/combat/exploration-object-setup.mjs
  function* objectInitialize(env, run, zone) {
    if (!["act", "abyss", "atlasMap"].includes(zone.type) || env.deps.actExplorationState.packRooms(env.deps.actExplorationMap.forRun(run)).length < 2) return;
    const atlasMap = zone.type === "atlasMap", saved = atlasMap && env.owner.atlas.run?.objects;
    if (saved && (yield* objectRestoreSaved(env, run, saved))) return;
    run.objects = env.deps.state.create(run, objectConfiguration(env, run, zone));
    objectRemember(env, run);
  }
  function* objectRestoreSaved(env, run, saved) {
    run.objects = JSON.parse(JSON.stringify(saved));
    run.objects.pendingId = null;
    try {
      env.deps.state.validate(run);
      return true;
    } catch (error) {
      yield { kind: "reportObjectRestoreFailure", args: ["atlas map objects left behind:", error.message] };
      run.objects = void 0;
      return false;
    }
  }
  function objectSavedFacing(env, zone) {
    const saved = zone?.type === "atlasMap" ? env.owner.atlas.run?.objects : null;
    return Number.isInteger(saved?.rotation) ? saved.rotation : null;
  }
  function objectConfiguration(env, run, zone) {
    return {
      seed: Math.floor(env.deps.random() * 4294967296),
      loop: env.owner.season || 1,
      allowEvent: zone.type !== "atlasMap",
      excludedRooms: run.packs.filter((p) => p.encounter).map((p) => p.roomId),
      quantity: Math.min(4, 1 + Math.max(0, zone.atlasLootQuantity || 0) / 100),
      rarity: Math.min(500, Math.max(0, zone.atlasLootRarity || 0)),
      chest: objectChestRules(env, zone)
    };
  }
  function objectChestRules(env, zone) {
    const luck = Math.max(0, Number(env.deps.getPlayerStats().chestGrade) || 0), atlasRules = zone.atlasChest || null;
    if (!luck) return atlasRules;
    return { extra: 0, min: 0, ...atlasRules, grade: (Number(atlasRules && atlasRules.grade) || 0) + luck };
  }
  function objectRemember(env, run) {
    if (run.zoneId === env.deps.ATLAS.zoneId && env.owner.atlas.run) env.owner.atlas.run.objects = JSON.parse(JSON.stringify(run.objects));
  }

  // modules/combat/exploration-object-rewards.mjs
  function* objectReward(env, run, row) {
    if (row.phase === "spent") return;
    const prop = ["pot", "crate"].includes(row.kind), rng = env.deps.state.random(run.objects.seed + Math.abs(env.deps.hashSeed(row.id)) >>> 0);
    const drop = env.deps.state.solid({ ...row, phase: "spent" }) ? objectSpillCell(env, run, row) : row;
    const enemy = objectChestEnemy(env, run, drop);
    const items = prop ? objectRollPropItems(env, run, enemy, rng) : objectRollItems(env, run, row, enemy, rng);
    row.phase = "spent";
    row.remainingMs = 0;
    if (run.objects.pendingId === row.id) {
      objectCancel(run);
      run.destination = null;
    }
    objectRemember(env, run);
    env.deps.combatLootReceipts.capture(env.owner, () => objectPay(env, run, row, { prop, items, enemy, rng }));
    yield { kind: "dispatchRuntimeEvent", args: ["exploration-object", {
      kind: "reward",
      name: env.deps.state.name(row),
      objectKind: row.kind,
      grade: row.grade,
      cell: { gx: row.gx, gy: row.gy }
    }] };
    if (!env.owner.isBackgroundCalculation) yield { kind: "queueImportantSave", args: [220] };
  }
  function objectChestEnemy(env, run, cell) {
    const mods = env.deps.lootOmens.enemyMods(env.deps.getZone(run.zoneId));
    const enemy = { id: 0, gx: cell.gx, gy: cell.gy, isBoss: false, isElite: false };
    return mods ? Object.assign(enemy, { equipmentDropMul: mods.equipmentMul, uniqueChanceMul: mods.uniqueMul }) : enemy;
  }
  function objectSpillCell(env, run, row) {
    const map = env.deps.actExplorationMap.forRun(run), solid = env.deps.state.solidCells(run);
    const hero = env.owner.gridPlayer, free = env.deps.actExplorationMap.neighbors(map, row).filter((c) => !solid.has(`${c.gx},${c.gy}`));
    const behind = (c) => Number(c.gy < row.gy);
    free.sort((a, b) => behind(a) - behind(b) || Number(objectDistance(a, hero) === 0) - Number(objectDistance(b, hero) === 0) || objectDistance(a, hero) - objectDistance(b, hero));
    return free[0] || row;
  }
  function objectRollItems(env, run, row, enemy, rng) {
    const grade = env.deps.state.grade(row) || { rolls: 0, guaranteed: 0, rare: 0, variantScale: 1 };
    const quantity = run.objects.quantity * (enemy.equipmentDropMul || 1), count = Math.floor(quantity) + Number(rng() < quantity % 1) + grade.rolls, items = [];
    const zone = env.deps.getZone(run.zoneId), always = env.deps.state.isEvent(row) || !env.deps.contentProgression.canDropCurrency("magicBud");
    for (let i = 0; i < count; i++) {
      if (!always && i >= grade.guaranteed && rng() >= 0.45) continue;
      const rare = i < grade.rare || rng() < Math.min(0.65, 0.18 + run.objects.rarity / 1e3);
      const drop = env.deps.equipmentDropVariants.expand(env.deps.generateEquipmentDrop(enemy, { zone, minimumRarity: rare ? "rare" : "magic" }), { rng, scale: grade.variantScale });
      items.push(...drop.items);
    }
    return items;
  }
  function objectRollPropItems(env, run, enemy, rng) {
    if (rng() >= Math.min(1, env.deps.EXPLORATION_PROP_LOOT.itemChance * run.objects.quantity * (enemy.equipmentDropMul || 1))) return [];
    const item = env.deps.generateEquipmentDrop(enemy, { zone: env.deps.getZone(run.zoneId) });
    return item ? [item] : [];
  }
  function objectPay(env, run, row, drop) {
    const { prop, items, enemy, rng } = drop;
    for (const item of items) env.deps.keepEquipmentDrop(enemy, item);
    objectPayChestContent(env, run, row, enemy, rng);
    if (prop && rng() >= env.deps.EXPLORATION_PROP_LOOT.currencyChance) return;
    const key = env.deps.contentProgression.canDropCurrency("magicBud") ? "magicBud" : "formlessDew";
    if (!env.deps.contentProgression.canDropCurrency(key)) return;
    const base = prop ? 1 : env.deps.state.isEvent(row) ? 3 : env.deps.state.grade(row).currency;
    const scaled = base * run.objects.quantity, amount = Math.floor(scaled) + Number(rng() < scaled % 1);
    env.deps.keepCurrencyDrop(enemy, key, amount);
  }
  function objectPayChestContent(env, run, row, enemy, rng) {
    const zone = env.deps.getZone(run.zoneId);
    if (row.grade !== "gold" || !zone || zone.type !== "atlasMap") return;
    const find = env.deps.atlasEncounters.chestReward(zone, rng);
    if (find) env.deps.keepCurrencyDrop(enemy, find[0], find[1]);
  }

  // modules/combat/exploration-object-waves.mjs
  function objectSpawnCells(env, run, row, count) {
    const map = env.deps.actExplorationMap.forRun(run), room = map.rooms.find((r) => r.id === row.roomId);
    const occupied = env.deps.getGridBlockedCells();
    const cells = [];
    for (let y = -room.radiusY; y <= room.radiusY; y++) for (let x = -room.radiusX; x <= room.radiusX; x++) {
      const c = { gx: room.gx + x, gy: room.gy + y };
      if (env.deps.actExplorationMap.walkable(map, c, true) && objectDistance(c, env.owner.gridPlayer) > 1 && !occupied.has(`${c.gx},${c.gy}`)) cells.push(c);
    }
    return cells.sort((a, b) => objectDistance(a, row) - objectDistance(b, row)).slice(0, count);
  }
  function objectWaveSize(run, row) {
    return row.kind === "nest" ? 3 : row.kind === "ambush" ? 4 + run.objects.seed % 2 : 3 + run.objects.seed % 2;
  }
  function objectWavePlan(env, run, row, zone) {
    if (!["nest", "ambush"].includes(row.kind) || !["act", "abyss"].includes(zone.type)) return null;
    const act = zone.type === "act" ? run.act : run.source?.style === "act" ? run.source.act : null;
    if (!Number.isInteger(act) || !Object.hasOwn(env.deps.MONSTER_COMBAT_ROLES.objectEncounters, act)) throw Error("탐험 사건의 액트 생태가 잘못되었습니다.");
    const recipe = env.deps.MONSTER_COMBAT_ROLES.objectEncounters[act];
    return {
      at: Math.abs(env.deps.hashSeed(`${run.objects.seed}:${row.id}:${row.wave}:${run.zoneId}:object-wave`)) % 100,
      roster: row.kind === "nest" ? recipe.nest[row.wave] : recipe.ambush
    };
  }
  function objectWaveMarker(row, index, plan) {
    const marker = { at: plan ? plan.at : row.wave * 11 + index, count: 1, boss: false, elite: false, storyStage: null };
    if (plan) marker.packVisualId = plan.roster[index];
    return marker;
  }
  function objectCreateWave(env, run, row, zone, plan) {
    return Array.from({ length: objectWaveSize(run, row) }, (_, index) => env.deps.createEnemy(zone, objectWaveMarker(row, index, plan), index));
  }
  function* objectSpawn(env, run, row) {
    const count = objectWaveSize(run, row);
    const cells = objectSpawnCells(env, run, row, count);
    if (cells.length < count) {
      row.remainingMs = 200;
      return;
    }
    const key = `${row.id}:${row.wave + 1}`, zone = env.deps.getZone(run.zoneId), plan = objectWavePlan(env, run, row, zone);
    const enemies = objectCreateWave(env, run, row, zone, plan);
    enemies.forEach((enemy, index) => Object.assign(
      enemy,
      cells[index],
      { explorationPack: key, gridMoveTimer: 0, regenBank: 0, spawnStamp: env.deps.getBattleSpawnStamp() }
    ));
    if (plan) env.deps.explorationPackFormation.placeRanks(enemies, { front: env.owner.gridPlayer });
    run.packs.push({ key, roomId: row.roomId, stage: null, waiting: [], aliveIds: enemies.map((e) => e.id), eliteIds: [], objectId: row.id, objectWave: row.wave + 1 });
    env.owner.enemies.push(...enemies);
    row.wave++;
    row.phase = "active";
    row.remainingMs = 0;
    yield { kind: "dispatchRuntimeEvent", args: ["exploration-object", { kind: "spawn", name: env.deps.state.labels[row.kind] }] };
  }

  // modules/combat/exploration-progress-rules.mjs
  function progressRunMode(env, run, state = env.owner) {
    if (run.mode !== "manual" || !state.isBackgroundCalculation) return run.mode;
    return state.settings.actExplorationMode === "full" ? "full" : "direct";
  }

  // modules/combat/exploration-object-events.mjs
  function* objectRequest(env, id) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (!objectInteractive(env, run)) return false;
    const row = objectEntries(run).find((e) => e.id === id && e.phase === "ready" && e.kind !== "ambush");
    if (!row || !env.deps.state.visible(run, row)) return false;
    if (objectDistance(env.owner.gridPlayer, row) <= 1) {
      env.deps.actExplorationState.lockOn(run, null);
      yield* objectUse(env, run, row);
      return true;
    }
    if (!env.deps.actExplorationState.selectDestination(run, row, { object: true })) return false;
    run.objects.pendingId = id;
    return true;
  }
  function* objectUse(env, run, row) {
    objectCancel(run);
    run.destination = null;
    if (env.deps.state.isEvent(row)) {
      row.phase = "warning";
      row.remainingMs = env.deps.state.warningMs[row.kind];
      objectRemember(env, run);
    } else yield* objectReward(env, run, row);
  }
  function* objectStep(env, run, elapsedMs) {
    if (!run.objects || run.status !== "active" || env.owner.combatHalted || env.owner.playerHp <= 0) return;
    yield* objectManualStep(env, run);
    yield* objectAutoStep(env, run);
    for (const row of objectEntries(run).filter(env.deps.state.isEvent)) yield* objectAdvanceEvent(env, run, row, elapsedMs);
  }
  function* objectManualStep(env, run) {
    if (env.owner.isBackgroundCalculation && run.objects.pendingId) {
      objectCancel(run);
      run.destination = null;
    }
    const pending = objectEntries(run).find((e) => e.id === run.objects.pendingId);
    if (pending && !env.owner.isBackgroundCalculation && objectDistance(env.owner.gridPlayer, pending) <= 1) yield* objectUse(env, run, pending);
  }
  function* objectAutoStep(env, run) {
    if (progressRunMode(env, run) === "manual" || run.destination || env.deps.state.active(run) || env.owner.enemies.some((e) => e.hp > 0)) return;
    const row = env.deps.state.autoTarget(run);
    if (row && objectDistance(env.owner.gridPlayer, row) <= 1) yield* objectUse(env, run, row);
  }
  function* objectAdvanceEvent(env, run, row, elapsedMs) {
    if (row.phase === "ready" && row.kind === "ambush" && objectDistance(env.owner.gridPlayer, row) <= 2 && env.deps.state.visible(run, row)) {
      row.phase = "warning";
      row.remainingMs = env.deps.state.warningMs.ambush;
    }
    if (row.phase === "warning") {
      row.remainingMs = Math.max(0, row.remainingMs - elapsedMs);
      if (!row.remainingMs) yield* objectSpawn(env, run, row);
    }
    yield* objectFinishWave(env, run, row);
  }
  function* objectFinishWave(env, run, row) {
    if (row.phase === "active" && !run.packs.some((p) => p.objectId === row.id && p.aliveIds.length)) {
      if (row.kind === "nest" && row.wave < 2) {
        row.phase = "warning";
        row.remainingMs = env.deps.state.warningMs.nest;
      } else yield* objectReward(env, run, row);
    }
  }
  function* objectAfterDeath(env, run) {
    if (!run || run.completionApplied || run.status === "failed") return;
    for (const row of objectEntries(run).filter(env.deps.state.isEvent)) if (row.phase === "active") yield* objectAdvanceEvent(env, run, row, 0);
    if (!env.deps.state.active(run) && run.packs.filter((p) => p.stage !== null).every((p) => !p.aliveIds.length)) run.status = "cleared";
  }
  function* objectArea(env, cells) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (!run || run.status !== "active" || !cells?.length) return;
    if (env.owner.playerHp <= 0 || env.owner.combatHalted) return;
    const map = env.deps.actExplorationMap.forRun(run), hit = new Set(cells.filter((c) => env.deps.actExplorationMap.walkable(map, c, true)).map((c) => `${c.gx},${c.gy}`));
    for (const row of objectEntries(run).filter((row2) => ["pot", "crate"].includes(row2.kind) && row2.phase === "ready").filter((row2) => hit.has(`${row2.gx},${row2.gy}`))) yield* objectReward(env, run, row);
  }
  function* objectStage(env, row) {
    if (row.delivery.startsWith("projectile")) return;
    const footprint = row.options.attackFootprint;
    if (!["arc", "nova", "blast", "cone", "line"].includes(footprint?.kind)) return;
    if (footprint.kind === "blast" && !footprint.radius) return;
    let cells = footprint.cells;
    if (row.wave) {
      const wave = row.wave, start = row.at - (row.options.stageDelayMs || 0);
      const radius = Math.min(wave.reach, Math.max(0, env.deps.getCombatTime() - start) / wave.msPerCell);
      cells = cells.filter((c) => env.deps.getGridWaveDrawnDistance(wave, c, env.deps.getCombatTime()) <= radius);
    } else if (row.whirl) cells = cells.map((c) => ({ gx: c.gx + env.owner.gridPlayer.gx - row.sourceCell.gx, gy: c.gy + env.owner.gridPlayer.gy - row.sourceCell.gy }));
    yield* objectArea(env, cells);
  }
  function* objectSettleProjected(env, run, row, kill) {
    if (env.deps.state.isEvent(row)) {
      const zone = env.deps.getZone(run.zoneId);
      for (let wave = row.kind === "nest" ? 2 : 1; wave > 0; wave--, row.wave++) {
        const plan = objectWavePlan(env, run, row, zone);
        const enemies = plan ? objectCreateWave(env, run, row, zone, plan) : null;
        run.packs.push({ key: `${row.id}:${row.wave + 1}`, roomId: row.roomId, stage: null, waiting: [], aliveIds: [], eliteIds: [], objectId: row.id, objectWave: row.wave + 1 });
        for (let index = 0; index < objectWaveSize(run, row); index++) kill(Object.assign(enemies ? enemies[index] : env.deps.createEnemy(zone, objectWaveMarker(row, index, plan), index), { gx: row.gx, gy: row.gy }));
      }
    }
    yield* objectReward(env, run, row);
  }

  // modules/exploration-object-combat-classic.mjs
  var deps = {
    random: () => Math.random(),
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get ATLAS() {
      return ATLAS;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get MONSTER_COMBAT_ROLES() {
      return MONSTER_COMBAT_ROLES;
    },
    get hashSeed() {
      return hashSeed;
    },
    get createEnemy() {
      return createEnemy;
    },
    get getZone() {
      return getZone;
    },
    get getBattleSpawnStamp() {
      return getBattleSpawnStamp;
    },
    get explorationPackFormation() {
      return explorationPackFormation;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get lootOmens() {
      return lootOmens;
    },
    get contentProgression() {
      return contentProgression;
    },
    get equipmentDropVariants() {
      return equipmentDropVariants;
    },
    get generateEquipmentDrop() {
      return generateEquipmentDrop;
    },
    get EXPLORATION_PROP_LOOT() {
      return EXPLORATION_PROP_LOOT;
    },
    get keepEquipmentDrop() {
      return keepEquipmentDrop;
    },
    get keepCurrencyDrop() {
      return keepCurrencyDrop;
    },
    get atlasEncounters() {
      return atlasEncounters;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getGridWaveDrawnDistance() {
      return getGridWaveDrawnDistance;
    },
    state: actExplorationState.objects
  };
  var effects = { get queueImportantSave() {
    return queueImportantSave;
  }, get dispatchRuntimeEvent() {
    return dispatchRuntimeEvent;
  }, get reportObjectRestoreFailure() {
    return console.warn;
  } };
  function present(iterator) {
    let step = iterator.next();
    while (!step.done) {
      const command = step.value;
      step = iterator.next(effects[command.kind](...command.args));
    }
    return step.value;
  }
  actExplorationProgress.objects = {
    initialize(run, zone) {
      return present(objectInitialize({ owner: game, deps }, run, zone));
    },
    savedFacing(zone) {
      return objectSavedFacing({ owner: game, deps }, zone);
    },
    request(id) {
      return present(objectRequest({ owner: game, deps }, id));
    },
    cancel(run) {
      return objectCancel(run);
    },
    step(run, elapsedMs) {
      return present(objectStep({ owner: game, deps }, run, elapsedMs));
    },
    afterDeath(run) {
      return present(objectAfterDeath({ owner: game, deps }, run));
    },
    area(cells) {
      return present(objectArea({ owner: game, deps }, cells));
    },
    stage(row) {
      return present(objectStage({ owner: game, deps }, row));
    },
    settleProjected(run, row, kill) {
      return present(objectSettleProjected({ owner: game, deps }, run, row, kill));
    }
  };
})();
