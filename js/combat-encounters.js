// GENERATED from modules/combat-encounters*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/exploration-pack-rules.mjs
  function packExplorationPackKey(room, stage) {
    return room.id + ":" + (stage === null ? "pack" : stage);
  }
  function packExplorationWavesAllowed(c, zone, map) {
    return !!map.stage && !roomPackKind(zone) && !(zone.type === "act" && zone.id === 0 && (c.owner.season || 1) === 1);
  }
  function packIsExplorationWaveRoom(map, room) {
    return room.role === "elite" || ["battle", "optional"].includes(room.role) && map.doors.filter((door) => door.room === room.index).length === 1;
  }
  function packOwnsNoPack(room, rescueRoom) {
    return room.role === "entry" || room.role === "path" || room === rescueRoom;
  }
  function packStartsWithRescue(c, zone, map) {
    return zone.type === "act" && zone.id === 0 && !!map.stage && (c.owner.season || 1) === 1 && !c.owner.loopStarterWeaponGranted;
  }
  var RESCUE_STRIKE = Object.freeze({ rate: 0.42, windUp: 0.9, maxStrikes: 4, fxMs: 260, pair: 2, share: 0.55, gap: 2 });
  function packChainRoomsOf(map) {
    return map.route.slice(1).map((id) => map.rooms.find((room) => room.id === id));
  }
  var SEALED_ROOM_ZONES = Object.freeze(["colony", "grandBreach"]);
  function packEmptiedExplorationPack(room) {
    return { key: packExplorationPackKey(room, null), roomId: room.id, stage: null, waiting: [], aliveIds: [], eliteIds: [] };
  }
  function packExplorationPackSpawnAt(c, zone, key, stage) {
    if (stage !== null) return 0;
    return Math.abs(c.deps.hashSeed(`${zone.atlasSeed || zone.id}:${key}`)) % 100;
  }
  function packMarkExplorationPackShape(pack, encounter, shape, formation2) {
    if (encounter) pack.encounter = encounter;
    if (shape.anchor) pack.anchor = { ...shape.anchor };
    if (shape.extra) pack.extra = shape.extra;
    if (shape.wave) pack.wave = shape.wave;
    if (formation2 && formation2.rescue) pack.rescue = true;
  }
  function packMarkExplorationAlertPack(c, pack) {
    const rule = c.deps.ACT_EXPLORATION_ALERT;
    if (pack.stage !== null || pack.encounter || pack.anchor || pack.rescue || pack.eliteIds.length || !pack.waiting.length || !(c.owner.season >= rule.fromLoop)) return;
    if (Math.abs(c.deps.hashSeed(`alert:${pack.key}:${pack.aliveIds[0]}`)) % 1e3 / 1e3 >= rule.chance) return;
    pack.alert = true;
    for (const enemy of pack.waiting) Object.assign(enemy, { alert: true, name: `${rule.prefix} ${enemy.name}`, encounterOutline: rule.outline });
  }
  function packMarkExplorationAmbushRooms(c, zone, map, packs) {
    if (!map.stage || zone.type === "act" && zone.id === 0 && (c.owner.season || 1) === 1) return packs;
    for (const room of map.rooms.filter((row) => row.role === "battle" || row.role === "optional")) {
      for (const pack of packAmbushRoomPacks(c, room, packs)) {
        pack.ambush = true;
        pack.waiting.forEach((enemy) => {
          enemy.encounterOutline = c.deps.ACT_EXPLORATION_AMBUSH.outline;
        });
      }
    }
    return packs;
  }
  function packAmbushRoomPacks(c, room, packs) {
    const own = packs.filter((pack) => pack.roomId === room.id && pack.stage === null && !pack.anchor && !pack.rescue && !pack.alert && !pack.sleep && !pack.treasure);
    const main = own.find((pack) => pack.key === room.id + ":pack");
    if (!main || main.encounter || !main.aliveIds.length || own.some((pack) => pack.eliteIds.length || pack.waiting.some((enemy) => enemy.critter))) return [];
    return Math.abs(c.deps.hashSeed(`ambush:${main.key}:${main.aliveIds[0]}`)) % 1e3 / 1e3 < c.deps.ACT_EXPLORATION_AMBUSH.chance ? own : [];
  }
  function packRollExplorationRoomWaves(c, zone, map, packs) {
    const rule = c.deps.ACT_EXPLORATION_WAVES, waves = {};
    if (!packExplorationWavesAllowed(c, zone, map)) return waves;
    for (const room of map.rooms.filter((row) => packIsExplorationWaveRoom(map, row))) {
      const roll = packExplorationWaveRoll(c, room, packs);
      if (roll === null || roll >= rule.chance) continue;
      const total = packWeightedWaveCount(roll / rule.chance, rule.counts);
      waves[room.id] = { left: total, total, at: null };
    }
    return waves;
  }
  function packExplorationWaveRoll(c, room, packs) {
    const own = packs.filter((pack) => pack.roomId === room.id), main = own.find((pack) => pack.key === room.id + ":pack");
    if (!main || main.encounter || !main.aliveIds.length || own.some((pack) => pack.rescue || pack.ambush)) return null;
    return Math.abs(c.deps.hashSeed(`waves:${main.key}:${main.aliveIds[0]}`)) % 1e3 / 1e3;
  }
  function packWeightedWaveCount(u, rows) {
    let left = u * rows.reduce((sum, row) => sum + row[1], 0);
    for (const [value, weight] of rows) {
      left -= weight;
      if (left < 0) return value;
    }
    return rows[rows.length - 1][0];
  }
  function packIsAtlasExtraEliteRoom(c, zone, room) {
    if (!zone.atlasExtraElite || room.role === "boss") return false;
    return Math.abs(c.deps.hashSeed(zone.atlasSeed + ":" + room.id)) % 1e3 / 1e3 < zone.atlasExtraElite;
  }
  function packShouldSealEncounterRun(plan, zone) {
    return !!plan.rooms && SEALED_ROOM_ZONES.includes(zone.type) && !(zone.type === "colony" && plan.source?.arena);
  }
  function packStarterRescueRoom(c, zone, map) {
    if (!packStartsWithRescue(c, zone, map)) return null;
    return map.route.map((id) => map.rooms.find((room) => room.id === id)).find((room) => room.role === "battle") || null;
  }
  function packCountEncounterMarkers(c, zone) {
    const profile = c.deps.getZoneEncounterProfile(zone);
    if (zone.type === "beyondBoundary") return zone.boundaryFinalWave ? 3 + (profile.bossAdds > 0 ? 1 : 0) : 3;
    return zone.type === "cosmos" ? profile.markerCount + 1 : profile.markerCount;
  }
  var ROOM_PACK_KINDS = Object.freeze({
    beehive: "hive",
    colony: "colony",
    grandBreach: "breach",
    cosmos: "markers",
    oceanDepth: "markers",
    beyondBoundary: "markers",
    meteor: "markers"
  });
  var roomPackKind = (zone) => zone.exploration && (zone.exploration.chain || zone.type === "grandBreach" || zone.type === "colony") ? ROOM_PACK_KINDS[zone.type] || null : null;

  // modules/domain/exploration-pack-create.mjs
  function packCreateExplorationPackEnemy(c, zone, marker, index, role) {
    const enemy = c.deps.createEnemy(role && role.zone || zone, role ? { ...marker, ...role.marker } : marker, index);
    if (role) role.dress(enemy);
    return enemy;
  }
  function packTuneExplorationEncounterEnemy(c, enemy, encounter, zone) {
    if (!encounter) return;
    c.deps.atlasEncounters.tuneEnemy(enemy, encounter, zone);
    if (c.deps.atlasEncounters.hasOwnLook(encounter)) c.deps.assignEnemyGridCombatProfile(enemy);
  }
  function packCreateActExplorationPack(c, zone, room, stage, { encounter = null, formation: formation2 = null } = {}) {
    const shape = c.deps.formation.prepare(zone, room, stage, encounter, formation2), { key, at, cells, elite } = shape, waiting = [];
    const cast = formation2 && formation2.cast || [];
    const roster = c.deps.formation.roster(zone, stage, encounter, shape, formation2);
    cells.forEach((cell, index) => {
      const marker = { at, count: 1, boss: stage !== null, elite: elite && index === 0, storyStage: stage, ownLook: c.deps.atlasEncounters.hasOwnLook(encounter), packVisualId: roster[index] };
      const enemy = packCreateExplorationPackEnemy(c, zone, marker, index, cast[index]);
      packTuneExplorationEncounterEnemy(c, enemy, encounter, zone);
      if (stage !== null && zone.atlasStages) c.deps.atlasEndgame.tuneStage(enemy, zone, stage);
      if (stage !== null && zone.memoryTier) c.deps.memoryDungeon.tuneBoss(enemy, zone.memoryTier);
      if (stage !== null && typeof c.deps.bossVariants === "object") c.deps.bossVariants.dress(enemy);
      Object.assign(enemy, cell, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0, explorationPack: key });
      waiting.push(enemy);
    });
    c.deps.formation.placeRanks(waiting, formation2);
    const pack = { key, roomId: room.id, stage, waiting, aliveIds: waiting.map((enemy) => enemy.id), eliteIds: waiting.filter((enemy) => enemy.isElite).map((enemy) => enemy.id) };
    packMarkExplorationPackShape(pack, encounter, shape, formation2);
    packMarkExplorationAlertPack(c, pack);
    c.deps.atlasFinds.dressTreasurePack(zone, pack);
    return pack;
  }

  // modules/domain/exploration-pack-placement.mjs
  function packFillRoomPack(c, map, room, pack, { enemies, places }) {
    const bosses = enemies.filter((enemy) => enemy.isBoss), rest = enemies.filter((enemy) => !enemy.isBoss);
    const cells = places || (bosses.length ? c.deps.formation.around(room, rest.length) : c.deps.formation.spots(room, rest.length));
    rest.forEach((enemy, index) => Object.assign(enemy, cells[index]));
    for (const enemy of enemies) Object.assign(enemy, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0, explorationPack: pack.key });
    Object.assign(pack, { waiting: enemies, aliveIds: enemies.map((enemy) => enemy.id), eliteIds: enemies.filter((enemy) => enemy.isElite).map((enemy) => enemy.id) });
    if (bosses.length) packPlaceExplorationBoss(c, map, room, { waiting: bosses });
    return pack;
  }
  function packCreateRoomPackOf(c, map, room, enemies, places) {
    const final = room.role === "boss", pack = packFillRoomPack(c, map, room, { key: packExplorationPackKey(room, final ? 0 : null), roomId: room.id, stage: final ? 0 : null }, { enemies, places });
    if (final && !enemies.some((enemy) => enemy.isBoss)) pack.quiet = true;
    return pack;
  }
  function packPlaceExplorationBoss(c, map, room, pack) {
    for (const enemy of pack.waiting) {
      c.deps.fitBossFootprint(enemy);
      if (!packPlaceExplorationBossAt(c, map, room, enemy) && enemy.footprint) {
        delete enemy.footprint;
        packPlaceExplorationBossAt(c, map, room, enemy);
      }
    }
    return pack;
  }
  function packPlaceExplorationBossAt(c, map, room, enemy) {
    const gate = map.gate, size = c.deps.getGridUnitFootprint(enemy), core = Math.min(2, size.columns);
    const cell = { gx: room.gx - (gate.gx > room.gx ? core - 1 : 0) - Math.ceil((size.columns - core) / 2), gy: room.gy - (gate.gy > room.gy ? size.rows - 1 : 0) };
    const cells = Array.from({ length: size.columns * size.rows }, (_, i) => ({ gx: cell.gx + i % size.columns, gy: cell.gy + Math.floor(i / size.columns) }));
    if (!cells.every((cell2) => c.deps.actExplorationMap.walkable(map, cell2))) return false;
    Object.assign(enemy, cell);
    return true;
  }
  function packExplorationWaveCells(c, map, room, count) {
    const blocked = c.deps.getGridBlockedCells(), hero = c.owner.gridPlayer, key = (at) => c.deps.gridCellKey(at.gx, at.gy);
    map.doors.filter((door) => door.room === room.index).forEach((door) => door.cells.concat(door.landings).forEach((at) => blocked.add(key(at))));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add(c.deps.gridCellKey(hero.gx + dx, hero.gy + dy));
    const wanted = c.deps.arranger.forMap(map).cells(room, 0, count) || c.deps.formation.spots(room, count);
    return wanted.map((cell) => {
      const spot = c.deps.findFreeGridCell(blocked, cell) || cell;
      blocked.add(key(spot));
      return spot;
    });
  }
  function packPlaceBeehiveRoomWave(c, run, enemies, step, isBoss) {
    const map = c.deps.actExplorationMap.forRun(run), roomId = isBoss ? map.route[map.route.length - 1] : map.route[Math.min(step, map.route.length - 2)];
    const room = map.rooms.find((row) => row.id === roomId), pack = run.packs.find((row) => row.roomId === roomId);
    const cells = c.deps.formation.spots(room, enemies.length);
    enemies.forEach((enemy, index) => Object.assign(enemy, cells[index], { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0, explorationPack: pack.key }));
    if (!isBoss) {
      const entry = c.deps.arranger.forMap(map).front(room), flank = [0, -1, 1][(step - 1) % 3];
      const dx = entry.gx - room.gx, dy = entry.gy - room.gy;
      const [fx, fy] = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      c.deps.formation.placeRanks(enemies, { front: { gx: room.gx + 3 * (fx - fy * flank), gy: room.gy + 3 * (fy + fx * flank) } });
    }
    Object.assign(pack, { waiting: enemies, aliveIds: enemies.map((enemy) => enemy.id), eliteIds: enemies.filter((enemy) => enemy.isElite).map((enemy) => enemy.id) });
    if (isBoss) packPlaceExplorationBoss(c, map, room, pack);
  }

  // modules/combat/encounter-rooms.mjs
  function* flowReleaseExplorationWave(env, log) {
    const pending = waitingRoomWave(env);
    if (!pending) return;
    const { run, map, room, wave } = pending;
    const now = env.deps.getCombatTime();
    if (wave.at === null) {
      wave.at = now + env.deps.ACT_EXPLORATION_WAVES.delayMs;
      return;
    }
    if (now < wave.at) return;
    const zone = env.deps.getZone(env.owner.currentZoneId), number = wave.total - wave.left + 1, count = env.deps.formation.count(zone, null, {});
    const pack = packCreateActExplorationPack(env, zone, room, null, { encounter: null, formation: { wave: number, cells: packExplorationWaveCells(env, map, room, count) } });
    run.packs.push(pack);
    Object.assign(wave, { left: wave.left - 1, at: null });
    for (const enemy of pack.waiting) yield { kind: "addBattleFx", args: ["enemySpawn", { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 420, boss: false }] };
    if (env.owner.settings.showSpawnLog !== false) yield { kind: "waveLog", logger: log, args: [env.deps._t("⚠️ 무리가 더 몰려옵니다({number}/{total})", { number, total: wave.total }), "attack-monster"] };
  }
  function waitingRoomWave(env) {
    const run = env.deps.actExplorationState.current(env.owner), map = run && run.status === "active" ? env.deps.actExplorationDoors.stageMap(run) : null;
    const room = map ? env.deps.actExplorationRooms.roomAt(map, env.owner.gridPlayer) : null, wave = room && env.deps.actExplorationDoors.waveDue(run, room) ? run.waves[room.id] : null;
    return wave ? { run, map, room, wave } : null;
  }
  function* flowStrikeRescueTarget(enemy) {
    const npc = enemy.rescue;
    if (!npc) return false;
    if (enemy.hp < enemy.maxHp || !Number.isFinite(npc.gx) || !(npc.patient || npc.strikes < RESCUE_STRIKE.maxStrikes)) {
      delete enemy.rescue;
      return false;
    }
    enemy.attackTimer = (Number(enemy.attackTimer) || 0) + 0.1 * RESCUE_STRIKE.rate;
    if (enemy.attackTimer < 1) return true;
    enemy.attackTimer -= 1;
    npc.strikes++;
    yield { kind: "announceEnemyAttackRelease", args: [enemy, null, "instantTarget", npc] };
    yield { kind: "addBattleFx", args: ["npcStruck", { gx: npc.gx, gy: npc.gy, duration: RESCUE_STRIKE.fxMs }] };
    return true;
  }
  function flowBeginRoomBossRules(env, zone) {
    if (zone && zone.type === "outsideChaos" && !env.owner.woodsmanCurseActive) env.deps.startWoodsmanCurse();
  }
  function flowTuneBeehiveWaveEnemy(env, enemy, zone, isBoss, empower) {
    if (isBoss) {
      enemy.name = "👑 벌집 여왕";
      enemy.ele = "chaos";
      enemy.ailmentChance += 0.12;
      enemy.traitName = env.deps._t("독침 여왕 (군체 강화 {floor})", { floor: Math.floor(empower || 0) });
      return enemy;
    }
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * zone.waveHpMul));
    enemy.atkMul *= zone.waveAttackRateMul;
    enemy.damageMul *= zone.waveDamageMul;
    const role = enemy.monsterVisualId;
    if (role === "hive-drone") {
      enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
      enemy.damageMul *= 1.12;
    } else if (role === "hive-scout") {
      enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 0.78));
      enemy.attackSpeedVar *= 1.25;
    } else if (role === "hive-nurse") {
      enemy.maxHp = Math.floor(enemy.maxHp * 1.12);
      enemy.regenRate += 3e-3;
      env.deps.giveEnemyEnergyShield(enemy, 20);
    } else if (role === "hive-guard") {
      enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
      enemy.dr = Math.min(90, enemy.dr + 6);
    } else if (role === "hive-royal") {
      enemy.maxHp = Math.floor(enemy.maxHp * 1.15);
      enemy.penetration += 8;
      enemy.attackSpeedVar *= 1.12;
    }
    enemy.hp = enemy.maxHp;
    return enemy;
  }
  function flowGetBeehiveRoomRun(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    return run && run.rooms && env.owner.currentZoneId === "beehive_run" ? run : null;
  }
  function flowCountBeehiveWaveAlive(env) {
    const fighting = (env.owner.enemies || []).length, run = flowGetBeehiveRoomRun(env);
    if (!run) return fighting;
    return fighting + run.packs.filter((pack) => pack.stage === null || env.owner.beehive.queenActive).reduce((sum, pack) => sum + pack.waiting.length, 0);
  }

  // modules/domain/exploration-pack-content.mjs
  var CERBERUS_STAGES = Object.freeze([
    Object.freeze({ heads: ["cold", "fire"], boss: "fire", atk: 1.7, crit: 0 }),
    Object.freeze({ heads: ["phys"], boss: "phys", atk: 1.7, crit: 14, headCrit: 10 }),
    Object.freeze({ heads: [], boss: "phys", atk: 2.1, crit: 14, hybrid: "chaos" })
  ]);
  function packCreateMarkerEnemies(c, zone, marker) {
    const count = marker.count || 1;
    if (marker.boss) {
      const adds = Array.from({ length: count - 1 }, (_, index) => c.deps.createEnemy(zone, { ...marker, boss: false, elite: true }, index));
      return adds.concat(c.deps.createEnemy(zone, { ...marker, count: 1, storyStage: c.owner.killsInZone }, count));
    }
    const escort = zone.type === "cosmos" && zone.cosmosHabitat === "guard" && marker.elite && count === 2;
    return Array.from({ length: count }, (_, index) => c.deps.createEnemy(
      zone,
      escort && index === 0 ? { ...marker, packVisualId: "cosmos-ooze" } : marker,
      index
    ));
  }
  function packCreateMarkerRoomPacks(c, zone, map) {
    const markers = c.deps.generateEncounterPlan(zone), rooms = packChainRoomsOf(map), last = rooms.length - 1, groups = rooms.map(() => []), arranger = c.deps.arranger.forMap(map);
    const guard = zone.type === "cosmos" && zone.cosmosHabitat === "guard";
    markers.forEach((marker, index) => groups[index === markers.length - 1 ? last : Math.min(index, last - 1)].push(marker));
    const packs = rooms.map((room, index) => {
      if (!groups[index].length && index !== last) return packEmptiedExplorationPack(room);
      const enemies = groups[index].flatMap((marker) => packCreateMarkerEnemies(c, zone, marker));
      const pack = packCreateRoomPackOf(c, map, room, enemies, index === last ? null : arranger.cells(room, 0, enemies.length));
      if (guard && groups[index].length === 1 && !groups[index][0].boss && groups[index][0].elite && enemies.length === 2)
        c.deps.formation.placeRanks(enemies, { front: arranger.front(room) });
      return pack;
    });
    if (zone.type === "meteor") mixMeteorRooms();
    if (zone.type === "oceanDepth") mixOceanRooms();
    return packs;
    function mixMeteorRooms() {
      const [first, second] = packs;
      if (first?.stage !== null || second?.stage !== null) return;
      const guard2 = first.waiting.find((enemy) => enemy.monsterVisualId === "meteor-melt") || first.waiting.find((enemy) => !enemy.isElite && !enemy.isBoss);
      const shooter = second.waiting.find((enemy) => enemy.isElite && enemy.monsterVisualId === "meteor-sentinel");
      if (!guard2 || !shooter) return;
      swapRoomEnemies(first, second, guard2, shooter);
    }
    function mixOceanRooms() {
      const ordinary = packs.filter((pack) => pack.waiting.length > 1 && !pack.waiting.some((enemy) => enemy.isBoss));
      const receivers = ordinary.filter((pack) => pack.waiting.every((enemy) => !enemy.isElite && enemy.attackKind === "melee"));
      const donors = ordinary.filter((pack) => pack.waiting.every((enemy) => enemy.isElite && enemy.monsterVisualId === "ocean-oracle"));
      for (const first of receivers) {
        const second = donors.find((pack) => pack.waiting.filter((enemy) => enemy.monsterVisualId === "ocean-oracle").length > 1);
        if (!second) break;
        const guard2 = first.waiting.find((enemy) => enemy.monsterVisualId === "ocean-crab") || first.waiting[0];
        const shooter = second.waiting.find((enemy) => enemy.monsterVisualId === "ocean-oracle");
        swapRoomEnemies(first, second, guard2, shooter);
      }
    }
    function swapRoomEnemies(first, second, guard2, shooter) {
      const guardCell = { gx: guard2.gx, gy: guard2.gy }, shooterCell = { gx: shooter.gx, gy: shooter.gy };
      first.waiting[first.waiting.indexOf(guard2)] = shooter;
      second.waiting[second.waiting.indexOf(shooter)] = guard2;
      Object.assign(shooter, guardCell, { explorationPack: first.key });
      Object.assign(guard2, shooterCell, { explorationPack: second.key });
      [first, second].forEach((pack) => {
        pack.aliveIds = pack.waiting.map((enemy) => enemy.id);
        pack.eliteIds = pack.waiting.filter((enemy) => enemy.isElite).map((enemy) => enemy.id);
        c.deps.formation.placeRanks(pack.waiting, { front: arranger.front(rooms[packs.indexOf(pack)]) });
      });
    }
  }
  function packCreateBeehiveRoomPacks(c, zone, map) {
    return map.rooms.filter((room) => room.role !== "entry").map((room) => room.role === "boss" ? packPlaceExplorationBoss(c, map, room, packCreateActExplorationPack(c, zone, room, 0, {})) : packEmptiedExplorationPack(room));
  }
  function packCreateColonyDefenseRoomPacks(c, zone, map) {
    if (!map.colonyDefense) return packCreateBeehiveRoomPacks(c, zone, map);
    return map.rooms.filter((room) => room.role === "boss").map((room) => packCreateRoomPackOf(c, map, room, []));
  }
  function packCreateGrandBreachRoomPacks(c, zone, map) {
    const throne = map.rooms.find((room) => room.role === "boss");
    const bossPack = packPlaceExplorationBoss(c, map, throne, packCreateActExplorationPack(c, zone, throne, 0, {}));
    if (map.grandBreach) return [bossPack];
    const breach = packChainRoomsOf(map)[0], rule = c.deps.GRAND_BREACH_ENCOUNTER;
    const opening = Array.from({ length: rule.openingPack }, (_, index) => c.deps.createEnemy(zone, { elite: index % 4 === 0 && index / 4 < rule.eliteLimit, boss: false }, index));
    return [packCreateRoomPackOf(c, map, breach, opening), bossPack];
  }
  function packCerberusStageCast(c, stage) {
    const dressCerberus = (enemy, ele, body = false) => {
      const visual = body ? "s6_beast_cerberus" : ele === "phys" ? "cerberus-fang" : "cerberus-head";
      Object.assign(enemy, { monsterVisualId: visual, spriteVariantId: null, bossAssetKey: null, monsterVisualSetId: null, ele });
      c.deps.assignEnemyGridCombatProfile(enemy);
      if (enemy.isBoss && enemy.attackKind === "melee") enemy.attackSpeedVar *= 0.8;
    };
    const rule = CERBERUS_STAGES[stage];
    const heads = rule.heads.map((ele, i) => ({ marker: { boss: false, elite: true, storyStage: null }, dress: (enemy) => {
      Object.assign(enemy, { name: c.deps._t("👿 케르베로스 머리 {value}", { value: rule.heads.length + 1 - i }), ele });
      enemy.atkMul *= 1.55;
      enemy.penetration += 12;
      enemy.critChance += rule.headCrit || 0;
    } }));
    return heads.concat({ marker: { boss: true }, dress: (enemy) => {
      Object.assign(enemy, { name: "👿 야수왕 케르베로스", ele: rule.boss, hybridElement: rule.hybrid || enemy.hybridElement });
      dressCerberus(enemy, rule.boss, stage === 2);
      enemy.atkMul *= rule.atk;
      enemy.penetration += 18;
      enemy.critChance += rule.crit;
    } });
  }
  function packCreateExplorationBossStage(c, zone, map, room, stage) {
    if (zone.type === "woodsmanEcho") return packPlaceExplorationBoss(c, map, room, packCreateActExplorationPack(c, zone, room, stage, {
      encounter: null,
      formation: { cells: [{ gx: room.gx, gy: room.gy }], cast: [{ zone: c.deps.getZone(c.deps.OUTSIDE_CHAOS_ZONE_ID), marker: { at: 0, boss: true }, dress: c.deps.dressWoodsmanEchoDummy }] }
    }));
    if (zone.id !== "s6_beast_cerberus") return packPlaceExplorationBoss(c, map, room, packCreateActExplorationPack(c, zone, room, stage, {}));
    const cast = packCerberusStageCast(c, stage), cells = cast.map(() => ({ gx: room.gx, gy: room.gy }));
    const pack = packCreateActExplorationPack(c, zone, room, stage, { encounter: null, formation: { cells, cast } });
    c.deps.actExplorationState.joinCerberus(pack, [], map);
    return packPlaceExplorationBoss(c, map, room, pack);
  }

  // modules/domain/exploration-packs.mjs
  function packGetZoneExplorationPlan(c, zone) {
    if (!zone) return null;
    if (zone.type === "act") return c.deps.actExplorationMap.layout(zone.id + 1) ? { act: zone.id + 1, bossStages: c.deps.STORY_ACTS[zone.id].maxKills } : null;
    return zone.exploration ? { source: zone.exploration, zoneId: zone.id, bossStages: zone.exploration.bossStages || 1 } : null;
  }
  function packCreateActExplorationEncounter(c, zone, exploration) {
    const plan = exploration === false ? null : packGetZoneExplorationPlan(c, zone);
    if (!plan && exploration === true) throw Error("일반 액트나 전용 맵이 있는 콘텐츠에서만 탐험을 시작할 수 있습니다.");
    if (!plan) return null;
    plan.rotation = c.deps.actExplorationProgress.objects.savedFacing(zone) ?? c.deps.rollExplorationFacing();
    if (c.deps.actExplorationDoors.session()) plan.rooms = c.deps.actExplorationDoors.planKey(zone, plan);
    const run = c.deps.actExplorationState.create(plan, packCreateExplorationPacks(c, zone, c.deps.actExplorationMap.forRun(plan), plan.bossStages), c.deps.getCombatTime());
    run.waves = packRollExplorationRoomWaves(c, zone, c.deps.actExplorationMap.forRun(run), run.packs);
    if (packShouldSealEncounterRun(plan, zone)) run.sealed = true;
    run.mode = c.deps.actExplorationProgress.startMode(c.owner.settings);
    c.deps.actExplorationProgress.objects.initialize(run, zone);
    return run;
  }
  function packCreateExplorationPacks(c, zone, map, bossStages) {
    const own = roomPackKind(zone);
    if (own) return ROOM_BUILDERS[own](c, zone, map);
    const packs = [], encounters = c.deps.atlasEncounters.rooms(zone, map), arranger = c.deps.arranger.forMap(map);
    const { counts, patrol } = c.deps.formation.plan(zone, map), rescueRoom = packStarterRescueRoom(c, zone, map);
    for (const room of map.rooms) {
      if (packOwnsNoPack(room, rescueRoom)) continue;
      const encounter = encounters[room.id] || null;
      if (room.role !== "boss") {
        packs.push(zone.atlasCleared?.includes(room.id) ? packEmptiedExplorationPack(room) : packCreateActExplorationPack(c, zone, room, null, { encounter, formation: packArrangedRoomFormation(c, arranger, zone, room, { encounter, formation: counts.get(room.id) }) }));
        continue;
      }
      for (let stage = 0; stage < bossStages; stage++) packs.push(packCreateExplorationBossStage(c, zone, map, room, stage));
    }
    const dressed = c.deps.combatIncidents.dressPacks(zone, map, packs.concat(
      packCreateAddedExplorationPacks(c, zone, map, { patrol, arranger, keep: rescueRoom }),
      packCreateStarterRescuePack(c, zone, map, rescueRoom)
    ));
    return packMarkExplorationAmbushRooms(c, zone, map, dressed);
  }
  function packCreateStarterRescuePack(c, zone, map, room) {
    if (!room) return [];
    const post = c.deps.actExplorationRooms.npcPost(room), inside = (gx) => gx >= room.x0 && gx <= room.x1;
    const cells = [post.gx + RESCUE_STRIKE.gap, post.gx - RESCUE_STRIKE.gap].filter(inside).slice(0, RESCUE_STRIKE.pair).map((gx) => ({ gx, gy: post.gy }));
    const pack = packCreateActExplorationPack(c, zone, room, null, { encounter: null, formation: { cells, rescue: true } });
    const patient = !(c.owner.seenTutorials || []).includes("opening_attack");
    pack.waiting.forEach((enemy) => Object.assign(enemy, {
      rescue: { gx: post.gx, gy: post.gy, strikes: 0, patient },
      attackTimer: RESCUE_STRIKE.windUp,
      hp: Math.round(enemy.hp * RESCUE_STRIKE.share),
      maxHp: Math.round(enemy.maxHp * RESCUE_STRIKE.share),
      damageMul: enemy.damageMul * RESCUE_STRIKE.share
    }));
    return [pack];
  }
  function packArrangedRoomFormation(c, arranger, zone, room, { encounter, formation: formation2 }) {
    const cells = arranger.cells(room, 0, c.deps.formation.count(zone, encounter, formation2));
    return cells ? { ...formation2, cells, front: arranger.front(room) } : formation2;
  }
  function packCreateAddedExplorationPacks(c, zone, map, { patrol, arranger, keep }) {
    const packs = patrol && patrol.roomId !== keep?.id ? [packCreateActExplorationPack(c, zone, map.rooms.find((room) => room.id === patrol.roomId), null, { encounter: null, formation: patrol })] : [];
    return map.stage ? packs.concat(packCreateStageExtraPacks(c, zone, map, arranger, keep)) : packs;
  }
  function packCreateStageExtraPacks(c, zone, map, arranger, keep) {
    const rule = c.deps.STAGE_ROOMS.extraPacks, packs = [];
    for (const room of c.deps.actExplorationState.packRooms(map).filter((row) => row !== keep)) {
      const more = rule.always + (c.deps.random() < rule.chance ? 1 : 0);
      for (let extra = 1; extra <= more; extra++) {
        packs.push(packCreateActExplorationPack(c, zone, room, null, { encounter: null, formation: { extra, cells: arranger.cells(room, extra, c.deps.formation.count(zone, null, { extra })), front: arranger.front(room) } }));
      }
    }
    return packs;
  }
  var ROOM_BUILDERS = Object.freeze({
    hive: packCreateBeehiveRoomPacks,
    colony: packCreateColonyDefenseRoomPacks,
    breach: packCreateGrandBreachRoomPacks,
    markers: packCreateMarkerRoomPacks
  });

  // modules/combat/encounter-session.mjs
  function* flowStartEncounterRun(env, exploration) {
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    const opened = flowOpenEncounterExploration(env, zone, exploration), explorationRun = opened.run;
    let returnedToGridStart = opened.returning;
    env.runtime.pTimer = 0;
    env.deps.resetCombatTacticsRuntime();
    env.deps.resetCombatChannelRuntime();
    env.runtime.progressStallTicks = 0;
    env.owner.runProgress = 0;
    env.owner.encounterIndex = 0;
    env.owner.bloomBossDefeated = false;
    if (typeof env.deps.clearTalentCardRuntimeState === "function") env.deps.clearTalentCardRuntimeState();
    yield { kind: "dispatchRuntimeEvent", args: ["encounter-started", {
      zoneId: zone.id,
      zoneType: zone.type,
      contentContext: env.deps.getEncounterTelemetryContext(zone),
      background: !!env.owner.isBackgroundCalculation
    }] };
    yield { kind: "resetBattleRuntimeVisuals", args: [] };
    env.owner.actExploration = explorationRun;
    env.deps.resetPlayerGridPosition();
    if (returnedToGridStart) {
      yield { kind: "addBattleFx", args: ["playerReturnWarp", { duration: 720, cell: env.deps.copyCombatGridCell(env.owner.gridPlayer) }] };
    }
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    env.deps.primeTrialHazardTimer(zone);
    env.owner.encounterPlan = explorationRun ? [] : env.deps.generateEncounterPlan(zone);
    env.owner.enemies = [];
    flowBeginEncounterZoneRules(env, zone, explorationRun);
  }
  function flowBeginEncounterZoneRules(env, zone, explorationRun) {
    if (zone && zone.type === "outsideChaos" && !explorationRun) env.deps.startWoodsmanCurse();
    else env.deps.resetWoodsmanCurse();
    if (zone && zone.type === "oceanDepth") flowBeginOceanRunRules(env, zone, explorationRun);
  }
  function flowBeginOceanRunRules(env, zone, explorationRun) {
    if (!explorationRun) {
      if (env.owner.oceanBossRunPending) env.owner.runProgress = env.deps.OCEAN_GUARDIAN_BOARD_START_PROGRESS;
      return;
    }
    env.owner.oceanBossRunPending = !!explorationRun.source.arena;
    flowSeatOceanGuardianArena(env, zone, explorationRun);
  }
  function flowSeatOceanGuardianArena(env, zone, run) {
    if (zone && zone.type === "oceanDepth" && run && run.source && run.source.arena) env.deps.actExplorationDoors.startAtGate(run);
  }
  function flowPrepareActExplorationArrival(env) {
    const zone = env.deps.getZone(env.owner.currentZoneId);
    if (!zone || zone.id !== env.owner.currentZoneId || !packGetZoneExplorationPlan(env, zone)) return;
    const run = packCreateActExplorationEncounter(env, zone);
    run.arrival = true;
    env.owner.actExploration = run;
    env.deps.resetPlayerGridPosition();
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    flowSeatOceanGuardianArena(env, zone, run);
  }
  function flowOpenEncounterExploration(env, zone, exploration) {
    const arrival = flowTakeActExplorationArrival(env, zone, exploration);
    const returning = !arrival && env.deps.hasGridCell(env.owner.gridPlayer) && env.deps.getGridUnitDistance(env.owner.gridPlayer, env.deps.COMBAT_GRID_CONFIG.playerSpawn) > 0;
    return { run: arrival || packCreateActExplorationEncounter(env, zone, exploration), returning };
  }
  function flowTakeActExplorationArrival(env, zone, exploration) {
    const run = env.owner.actExploration;
    if (exploration === false || !run || !run.arrival || run.zoneId !== zone.id) return null;
    delete run.arrival;
    return run;
  }
  function* flowEnsureEncounterRun(env) {
    if (env.deps.actExplorationState.current(env.owner)) return;
    if (waveOwnsProgressPlan()) return;
    if (env.owner.combatHalted && env.deps.isSkyTowerAtRewardLimit(env.deps.getZone(env.owner.currentZoneId))) {
      flowPrepareActExplorationArrival(env);
      return;
    }
    if (env.owner.moveTimer <= 0 && (!env.owner.encounterPlan || env.owner.encounterPlan.length === 0)) yield* flowStartEncounterRun(env);
    function waveOwnsProgressPlan() {
      if (env.owner.currentZoneId === "colony_run") return !!env.owner.colony?.inRun;
      return env.owner.currentZoneId === "beehive_run" && env.deps.isBeehiveRunLockedForMapTravel();
    }
  }
  function flowIsRegularAutoProgressZone(zone) {
    if (!zone) return false;
    if (zone.id === "beehive_run" || zone.id === "colony_run" || zone.id === "grand_breach_run") return false;
    if (typeof zone.id === "string" && zone.id.includes("_boss_")) return false;
    return ["act", "abyss", "trial", "meteor", "labyrinth", "chaosRealm", "skyTower"].includes(zone.type);
  }
  function* flowReconcileMapProgressRuntimeState(env) {
    if (env.deps.actExplorationState.current(env.owner)) return false;
    if (typeof env.deps.reconcileBeehiveRunState === "function") env.deps.reconcileBeehiveRunState();
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    if (!flowIsRegularAutoProgressZone(zone)) return false;
    const changed = clearStaleProgressFlags(env, zone);
    if (env.owner.combatHalted) return changed;
    const started = yield* restartEmptyProgressPlan(env);
    return changed || started;
  }
  function clearStaleProgressFlags(env, zone) {
    let changed = false;
    let explicitStop = env.deps.isCombatProgressStopped(zone);
    if (env.owner.inTicketBossFight) {
      env.owner.inTicketBossFight = false;
      changed = true;
    }
    if (env.owner.combatHalted && !explicitStop) {
      env.owner.combatHalted = false;
      changed = true;
    }
    return changed;
  }
  function* restartEmptyProgressPlan(env) {
    let changed = false;
    if (env.owner.moveTimer <= 0 && env.owner.runProgress <= 0) {
      let hasPlan = Array.isArray(env.owner.encounterPlan) && env.owner.encounterPlan.length > 0;
      let liveEnemies = (env.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0).length;
      if (liveEnemies > 0 && !hasPlan && Math.max(0, Math.floor(env.owner.encounterIndex || 0)) === 0) {
        env.owner.enemies = [];
        changed = true;
      }
      if (!hasPlan) {
        yield* flowStartEncounterRun(env);
        changed = true;
      }
    }
    return changed;
  }

  // modules/combat/encounter-echo.mjs
  function flowEnsureWoodsmanEchoRunState(env) {
    env.owner.woodsmanEchoRun = env.owner.woodsmanEchoRun && typeof env.owner.woodsmanEchoRun === "object" ? env.owner.woodsmanEchoRun : {};
    let run = env.owner.woodsmanEchoRun;
    run.active = !!run.active;
    run.duration = 30;
    run.timeLeft = Math.max(0, Number(run.timeLeft || 0));
    run.lastTickAt = Math.max(0, Math.floor(run.lastTickAt || 0));
    run.totalDamage = Math.max(0, Math.floor(run.totalDamage || 0));
    run.bestDps = Math.max(0, Number(run.bestDps || 0));
    return run;
  }
  function flowTakeWoodsmanEchoReturnZone(env, run) {
    const back = run.returnZoneId;
    run.returnZoneId = null;
    return back !== void 0 && back !== null ? back : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
  }
  function flowLeaveWoodsmanEchoForTown(env) {
    if (env.owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID) return;
    const run = flowEnsureWoodsmanEchoRunState(env);
    run.active = false;
    run.timeLeft = 0;
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId = flowTakeWoodsmanEchoReturnZone(env, run);
  }
  function* flowFinishWoodsmanEchoRun(env) {
    let run = flowEnsureWoodsmanEchoRunState(env);
    if (!run.active || env.owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID) return;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (env.deps.getCombatTime() - run.lastTickAt) / 1e3));
    let elapsed = Math.max(0.1, run.duration - run.timeLeft);
    let dps = run.totalDamage / elapsed;
    run.bestDps = Math.max(run.bestDps || 0, dps);
    run.active = false;
    run.timeLeft = 0;
    env.owner.enemies = [];
    env.owner.combatHalted = false;
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId = flowTakeWoodsmanEchoReturnZone(env, run);
    env.deps.recordWoodsmanEchoRun(run.totalDamage, dps, env.owner, elapsed);
    yield { kind: "addLog", args: [env.deps._t("🪵 나무꾼의 잔상: 총 피해 {floor}, 최종 DPS {floor2} (최고 {floor3})", { floor: Math.floor(run.totalDamage).toLocaleString(), floor2: Math.floor(dps).toLocaleString(), floor3: Math.floor(run.bestDps).toLocaleString() }), "season-up"] };
    yield { kind: "updateStaticUI", args: [] };
  }
  function flowIsWoodsmanEchoClockRunning(env, run) {
    const rooms = env.deps.actExplorationState.current(env.owner);
    if (!run.active) return false;
    if (!rooms || !rooms.packs.some((pack) => pack.waiting.length > 0)) return true;
    run.lastTickAt = env.deps.getCombatTime();
    return false;
  }
  function* flowTickWoodsmanEchoRun(env) {
    let run = flowEnsureWoodsmanEchoRunState(env);
    if (!flowIsWoodsmanEchoClockRunning(env, run)) return;
    let now = env.deps.getCombatTime();
    run.lastTickAt = Number.isFinite(run.lastTickAt) && run.lastTickAt > 0 ? run.lastTickAt : now;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (now - run.lastTickAt) / 1e3));
    run.lastTickAt = now;
    let target = (env.owner.enemies || []).find((e) => e && e.hp > 0);
    if (target) run.totalDamage = Math.max(0, Math.floor((target.echoStartHp || target.maxHp || 0) - Math.max(0, target.hp || 0)));
    if (run.timeLeft <= 0) yield* flowFinishWoodsmanEchoRun(env);
  }

  // modules/combat/clear-interruption.mjs
  function killEnterAutomaticMeteorEncounter(env) {
    env.deps.prepareMeteorEncounterEntry(env.owner.currentZoneId);
    env.owner.currentZoneId = env.deps.METEOR_FALL_ZONE_ID;
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

  // modules/combat/encounter-travel.mjs
  function* flowStartMoving(env, isTown) {
    env.deps.cosmosRouteRuntime.reconcileDeparture(env.owner);
    env.deps.holdZoneBoundRuns();
    let returnDepartureCell = isTown && env.deps.hasGridCell(env.owner.gridPlayer) ? env.deps.copyCombatGridCell(env.owner.gridPlayer) : null;
    env.deps.actExplorationProgress.depart(env.owner);
    yield { kind: "dispatchRuntimeEvent", args: ["movement-started", { background: !!env.owner.isBackgroundCalculation }] };
    env.runtime.pTimer = 0;
    env.deps.resetCombatTacticsRuntime();
    env.deps.resetCombatChannelRuntime();
    env.runtime.progressStallTicks = 0;
    if (typeof env.deps.clearTalentCardRuntimeState === "function") env.deps.clearTalentCardRuntimeState();
    yield { kind: "resetBattleRuntimeVisuals", args: [] };
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    if (!isTown && env.deps.hasKeystone("a2")) env.owner.assassinBlurred = true;
    let ms = env.deps.getPlayerStats().moveSpeed;
    if (!Number.isFinite(ms) || ms <= 0) ms = 100;
    let time = Math.max(0.5, 1.2 * (100 / ms));
    env.owner.moveTotalTime = time;
    env.owner.moveTimer = time;
    if (returnDepartureCell) {
      yield { kind: "addBattleFx", args: ["playerReturnDepart", {
        duration: Math.max(500, Math.round(time * 1e3)),
        cell: returnDepartureCell
      }] };
    }
    env.owner.isTownReturning = !!isTown;
    env.owner.combatHalted = false;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    env.owner.playerAilments = [];
    env.owner.playerLeechInstances = [];
    env.owner.gladiatorSwiftOpeningReady = true;
    env.owner.gladiatorSwiftGuardReady = true;
    env.owner.woodsmanEntrancePending = false;
    env.deps.resetWoodsmanCurse();
    closeDepartedVoidRift(env.owner.voidRift);
    flowPrepareActExplorationArrival(env);
  }
  function closeDepartedVoidRift(v) {
    if (v && v.active) {
      v.active = false;
      v.pendingWave = false;
      v.totalToSpawn = 0;
      v.spawnedCount = 0;
      v.defeatedCount = 0;
      v.spawnTick = 0;
    }
  }
  function* flowAdvanceActExplorationDeparture(env) {
    const run = env.deps.actExplorationState.current(env.owner), departure = run?.departure;
    if (!departure) return false;
    departure.remainingMs = env.owner.isBackgroundCalculation ? 0 : Math.max(0, departure.remainingMs - 100);
    if (departure.remainingMs > 0) return true;
    const zone = env.deps.getZone(env.owner.currentZoneId);
    env.owner.currentZoneId = departure.zoneId;
    env.deps.actExplorationProgress.depart(env.owner);
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    if (env.owner.settings.townReturnAction === "stop") {
      env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
      flowPrepareActExplorationArrival(env);
    } else yield* flowStartMoving(env, false);
    yield { kind: "dispatchRuntimeEvent", args: ["exploration-departed", { background: !!env.owner.isBackgroundCalculation }] };
    return true;
  }
  function* flowFinishTownReturnAction(env) {
    let action = env.owner.settings && env.owner.settings.townReturnAction || "retry";
    if (action !== "stop") return false;
    env.owner.combatHalted = true;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    yield { kind: "updateStaticUI", args: [] };
    return true;
  }
  function* flowReturnToTown(env) {
    if (env.owner.isTownReturning && env.owner.moveTimer > 0) return;
    const returningFromRun = ["grand_breach_run", "colony_run"].includes(env.owner.currentZoneId);
    const run = env.owner.currentZoneId === "grand_breach_run" ? env.owner.voidRift.grandRun : env.owner.colony;
    if (returningFromRun) env.owner.currentZoneId = run?.returnZoneId ?? env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    flowLeaveWoodsmanEchoForTown(env);
    env.deps.atlasRun.leave("마을 귀환");
    env.deps.cosmosRouteRuntime.leave(env.owner);
    let pStats = env.deps.getPlayerStats();
    env.owner.playerHp = env.deps.getPlayerHpCap(pStats);
    env.owner.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    env.owner.playerLeechInstances = [];
    env.runtime.pTimer = 0;
    yield { kind: "addLog", args: [env.deps._t("⛺ 마을 귀환"), "season-up"] };
    yield* flowStartMoving(env, true);
    yield { kind: "updateStaticUI", args: [] };
    if (returningFromRun) yield { kind: "queueImportantSave", args: [200] };
  }
  function* flowReturnToTownByRule(env) {
    if (!env.deps.atlasRun.lastPortal()) yield* flowReturnToTown(env);
  }
  function* flowRunReturnRules(env, pStats, now = env.deps.getCombatTime()) {
    const action = env.deps.CONDITION_PATTERN_ACTION_DB.find((row) => row.id === "return_town");
    const wait = env.runtime.returnRuleReadyAt - now;
    if (!env.owner.combatTacticsUnlocked || wait > 0 && wait <= action.cooldownMs) return;
    const rules = (env.owner.skillAutoRules || []).filter((rule) => rule && rule.enabled && rule.actionType === "return_town");
    if (!rules.some((rule) => env.deps.evaluateConditionPatternRule(rule, pStats, env.owner, now))) return;
    env.runtime.returnRuleReadyAt = now + action.cooldownMs;
    yield* flowReturnToTownByRule(env);
  }

  // modules/combat/encounter-breach.mjs
  var grandBreachRoomPortals = (room) => [{ gx: room.x0 + 1, gy: room.y0 + 1 }, { gx: room.x1 - 1, gy: room.y0 + 1 }, { gx: Math.round(room.gx), gy: room.y1 - 1 }];
  function* flowGetGrandBreachArena(env, zone) {
    if (!env.deps.actExplorationState.current(env.owner) && !zone.exploration) return null;
    if (!env.deps.actExplorationState.current(env.owner)) yield* flowStartEncounterRun(env);
    const run = env.deps.actExplorationState.current(env.owner), map = env.deps.actExplorationMap.forRun(run);
    if (map.grandBreach) return { run, map, arena: map.grandBreach.arena, portals: map.grandBreach.riftCells, inside: true, singleRoom: true };
    const breach = packChainRoomsOf(map)[0];
    const woke = !run.packs.some((pack) => pack.roomId === breach.id && pack.waiting.length);
    return { run, map, arena: breach, portals: grandBreachRoomPortals(breach), inside: woke && env.deps.actExplorationRooms.roomAt(map, env.owner.gridPlayer) === breach };
  }
  function flowRetireGrandBreachHordeAttacks(env) {
    for (let i = env.runtime.pendingEnemyCombatAttacks.length - 1; i >= 0; i--) env.deps.dropEnemyAttack(i, env.deps.getCombatTime());
  }
  function flowPlaceGrandBreachBoss(env, battlefield, boss) {
    const { run, map } = battlefield;
    flowRetireGrandBreachHordeAttacks(env);
    env.owner.enemies = [];
    for (const pack of run.packs) Object.assign(pack, { waiting: [], aliveIds: [], eliteIds: [] });
    packFillRoomPack(env, map, map.rooms.find((room) => room.role === "boss"), run.packs.find((pack) => pack.stage === 0), { enemies: [boss] });
    delete run.sealed;
  }
  function flowSpawnVoidBreachReinforcement(env, zone, rift) {
    const alive = env.owner.enemies.filter((e) => e.hp > 0);
    if (!rift.pendingWave || rift.spawnedCount >= rift.totalToSpawn || alive.length >= 8 || alive.filter((e) => e.fromVoidRift).length >= 4) return false;
    rift.spawnTick++;
    if (rift.spawnTick < 4) return false;
    rift.spawnTick = 0;
    const index = rift.spawnedCount;
    const marker = { at: Math.max(5, Math.min(95, 10 + index * 8)), elite: env.deps.random() < 0.18, boss: false };
    const enemy = env.deps.createEnemy(zone, marker, index + 1);
    enemy.fromVoidRift = true;
    env.deps.applyVoidRiftMobTuning(enemy);
    env.owner.enemies.push(enemy);
    env.deps.ensureCombatGridRuntime();
    rift.spawnedCount++;
    return true;
  }
  function flowGrandBreachSpawnCell(env, deployment, offset, blocked) {
    const { portals, arena, radius } = deployment;
    for (let step = 0; step < portals.length; step++) {
      const portal = portals[(offset + step) % portals.length], cell = env.deps.findFreeGridCell(blocked, portal);
      if (!cell) continue;
      if (arena && (cell.gx < arena.x0 || cell.gx > arena.x1 || cell.gy < arena.y0 || cell.gy > arena.y1)) continue;
      if (radius && Math.max(Math.abs(cell.gx - portal.gx), Math.abs(cell.gy - portal.gy)) > radius) continue;
      return cell;
    }
    return null;
  }
  function flowSpawnGrandBreachEnemy(env, zone, deployment, blocked, { elite, index }) {
    const cell = flowGrandBreachSpawnCell(env, deployment, index % deployment.portals.length, blocked);
    if (!cell) return false;
    const enemy = env.deps.createEnemy(zone, { elite, boss: false }, index);
    Object.assign(enemy, cell, { gridMoveTimer: 0.25, attackTimer: 0, spawnStamp: env.deps.getBattleSpawnStamp() });
    blocked.add(env.deps.gridCellKey(cell.gx, cell.gy));
    env.owner.enemies.push(enemy);
    return true;
  }
  function flowGrandBreachWaveSize(env, run, config, alive) {
    const stage = env.deps.getGrandBreachProgress(run.gauge).stage;
    return Math.min(alive.length === 0 ? config.openingPack : config.refillPack, config.capacities[stage] - alive.length);
  }
  function flowDeployGrandBreachWave(env, zone, deployment, { config, alive, count }) {
    const blocked = env.deps.getGridBlockedCells();
    let elites = alive.filter((e) => e.isElite).length;
    for (let i = 0; i < count; i++) {
      const elite = elites < config.eliteLimit && i % 4 === 0;
      if (!flowSpawnGrandBreachEnemy(env, zone, deployment, blocked, { elite, index: i })) break;
      elites += Number(elite);
    }
  }
  function flowPlanGrandBreachRefill(env, run, battlefield, previous) {
    if (!battlefield?.singleRoom) {
      delete run.refillPlan;
      return;
    }
    const pairs = env.deps.GRAND_BREACH_ENCOUNTER.arena.portalPairs[env.deps.getGrandBreachProgress(run.gauge).stage];
    const turn = previous && previous.turn < Number.MAX_SAFE_INTEGER ? previous.turn + 1 : 0;
    run.refillPlan = { portalIndices: [...pairs[turn % pairs.length]], at: run.nextRefillAt, turn };
  }
  function flowGrandBreachWaveDeployment(env, battlefield, plan, radius) {
    const portals = battlefield?.portals || env.deps.GRAND_BREACH_ENCOUNTER.portals;
    return { portals: plan ? plan.portalIndices.map((index) => portals[index]) : portals, arena: battlefield?.arena, radius };
  }
  function flowRefillGrandBreachWave(env, zone, run, now, battlefield) {
    if (!flowGrandBreachRefillReady(env, run, now)) return;
    const config = battlefield?.singleRoom ? env.deps.GRAND_BREACH_ENCOUNTER.arena : env.deps.GRAND_BREACH_ENCOUNTER;
    const alive = env.owner.enemies.filter((e) => e.hp > 0);
    const count = flowGrandBreachWaveSize(env, run, config, alive);
    const plan = battlefield?.singleRoom ? run.refillPlan : null;
    const deployment = flowGrandBreachWaveDeployment(env, battlefield, plan, config.spawnRadius);
    if (count > 0) flowDeployGrandBreachWave(env, zone, deployment, { config, alive, count });
    run.nextRefillAt = now + config.intervalMs;
    flowPlanGrandBreachRefill(env, run, battlefield, plan);
  }
  function flowGrandBreachRefillReady(env, run, now) {
    return run.phase === "survival" && !env.deps.getGrandBreachProgress(run.gauge).complete && now >= (run.nextRefillAt || 0);
  }
  function flowGrandBreachSurvivalReady(run, battlefield) {
    if (run.phase !== "survival" || !battlefield || run.survivalStarted) return true;
    run.survivalStarted = battlefield.singleRoom || battlefield.inside;
    return run.survivalStarted;
  }
  function flowSummonGrandBreachLord(env, zone, run, battlefield) {
    delete run.refillPlan;
    const boss = env.deps.createEnemy(zone, { boss: true, count: 1 }, 0), soul = Math.max(0, Math.floor(run.kills || 0));
    flowTuneGrandBreachLord(env, boss, soul);
    if (battlefield) flowPlaceGrandBreachBoss(env, battlefield, boss);
    else {
      flowRetireGrandBreachHordeAttacks(env);
      env.owner.enemies = [boss];
    }
    run.phase = "boss";
    return soul;
  }
  function flowGrandBreachTimeUp(env, run, now) {
    if (!Number.isFinite(run.survivalEndsAt)) run.survivalEndsAt = now + env.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1e3;
    return now >= run.survivalEndsAt;
  }
  function* flowFailGrandBreachTimeUp(env, zone) {
    delete env.owner.voidRift.grandRun.refillPlan;
    env.deps.actExplorationProgress.defeat(env.owner);
    env.deps.defeatInGrandBreach(zone, env.deps._t("⌛ {value}분 안에 균열 군주를 부르지 못해 대균열이 닫혔습니다.", { value: env.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds / 60 }), {});
    env.deps.actExplorationProgress.depart(env.owner);
    yield { kind: "resetBattleRuntimeVisuals", args: [] };
    env.owner.combatHalted = false;
    env.runtime.pendingHeavyUiRefresh = true;
    yield { kind: "queueImportantSave", args: [200] };
  }
  function* flowTickGrandBreachRun(env, zone) {
    const g = activeGrandBreach(env.owner);
    if (!g) return;
    let now = env.deps.getCombatTime();
    const battlefield = yield* flowGetGrandBreachArena(env, zone);
    env.deps.expireConditionEffects(now);
    if (!flowGrandBreachSurvivalReady(g, battlefield)) return;
    if (g.phase === "survival") {
      if (env.deps.getGrandBreachProgress(g.gauge).complete) g.phase = "bossPending";
      else if (flowGrandBreachTimeUp(env, g, now)) {
        yield* flowFailGrandBreachTimeUp(env, zone);
        return;
      } else flowRefillGrandBreachWave(env, zone, g, now, battlefield);
    }
    if (g.phase === "bossPending") {
      const soul = flowSummonGrandBreachLord(env, zone, g, battlefield);
      yield { kind: "addLog", args: [env.deps._t("🕳️ 균열 몬스터 {soul}처치! 균열 군주가 출현합니다. 군주의 힘과 격파 보상은 처치 수에 따라 증가합니다.", { soul }), "loot-unique"] };
    }
  }
  function activeGrandBreach(owner) {
    let v = owner.voidRift || (owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun;
    if (g && (g.phase !== "survival" || !g.inRun)) delete g.refillPlan;
    return g && g.inRun ? g : null;
  }
  function flowTuneGrandBreachLord(env, boss, kills) {
    const pressure = Math.min(6, Math.floor(Math.max(0, kills) / 10));
    boss.name = "👿 균열 군주";
    boss.ele = "chaos";
    boss.maxHp = Math.max(1, Math.floor(boss.maxHp * (1 + pressure * 0.06)));
    boss.hp = boss.maxHp;
    boss.damageMul *= 1 + pressure * 0.05;
    boss.penetration += pressure * 2;
    boss.traitName = env.deps._t("공허 압박 {pressure}단계 (균열 몬스터 {kills}처치)", { pressure, kills });
    return boss;
  }

  // modules/combat/encounter-progress.mjs
  function* flowSpawnEncounterMarker(env, marker) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    let count = marker.count || 1;
    if (!env.deps.hasGridCell(env.owner.gridPlayer)) env.deps.resetPlayerGridPosition();
    let blockedCells = env.deps.getGridBlockedCells();
    if (marker.boss) {
      for (let i = 0; i < Math.max(0, count - 1); i++) {
        let enemy = env.deps.createEnemy(zone, { ...marker, boss: false, elite: true }, i);
        env.deps.assignEnemyGridSpawn(enemy, blockedCells);
        enemy.spawnStamp = env.deps.getBattleSpawnStamp();
        env.owner.enemies.push(enemy);
        yield { kind: "addBattleFx", args: ["enemySpawn", { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 360, boss: false }] };
      }
      let bossEnemy = env.deps.createEnemy(zone, { ...marker, count: 1, storyStage: env.owner.killsInZone }, count);
      env.deps.assignEnemyGridSpawn(bossEnemy, blockedCells);
      bossEnemy.spawnStamp = env.deps.getBattleSpawnStamp();
      env.owner.enemies.push(bossEnemy);
      yield { kind: "addBattleFx", args: ["enemySpawn", { enemyId: bossEnemy.id, color: env.deps.getElementColor(bossEnemy.ele), duration: 460, boss: true }] };
      if (env.owner.settings.showSpawnLog !== false) {
        yield { kind: "addLog", args: [env.deps._t("👑 '{replace}' 등장.", { replace: bossEnemy.name.replace(/^👿\s*/, "") }), "loot-unique"] };
      }
    } else {
      for (let i = 0; i < count; i++) {
        let enemy = env.deps.createEnemy(zone, marker, i);
        env.deps.assignEnemyGridSpawn(enemy, blockedCells);
        enemy.spawnStamp = env.deps.getBattleSpawnStamp();
        env.owner.enemies.push(enemy);
        yield { kind: "addBattleFx", args: ["enemySpawn", { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 320, boss: false }] };
      }
      if (env.owner.settings.showSpawnLog !== false) yield { kind: "addLog", args: [env.deps._t("⚠️ 적 {count}마리 참전", { count }), marker.elite ? "loot-rare" : "attack-monster"] };
    }
  }
  function flowGetMapProgressGainMultiplier(zone) {
    return zone && zone.type === "seasonBoss" ? 2 : 1;
  }
  function* flowTickOwnClockRun(env, zone) {
    if (zone.id === "grand_breach_run") yield* flowTickGrandBreachRun(env, zone);
    else if (zone.type === "woodsmanEcho") yield* flowTickWoodsmanEchoRun(env);
    else return false;
    return !env.deps.actExplorationState.current(env.owner);
  }
  function* flowAdvanceMapProgress(env, pStats) {
    if (env.owner.moveTimer > 0) return;
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    if (holdsMapProgress(env.owner, zone)) return;
    if (zone && (yield* flowTickOwnClockRun(env, zone))) return;
    yield* flowEnsureEncounterRun(env);
    if (env.deps.actExplorationProgress.advance(pStats)) return;
    if (env.owner.runProgress >= 100) return;
    if (env.deps.isCrowdProgressPaused()) return;
    const gain = mapProgressGain(env, zone, pStats);
    env.owner.runProgress = Math.min(100, env.owner.runProgress + gain);
    yield* spawnDueMarkers(env);
  }
  function* spawnDueMarkers(env) {
    while (env.owner.encounterIndex < env.owner.encounterPlan.length && env.owner.runProgress >= env.owner.encounterPlan[env.owner.encounterIndex].at) {
      yield* flowSpawnEncounterMarker(env, env.owner.encounterPlan[env.owner.encounterIndex]);
      env.owner.encounterIndex++;
    }
  }
  function holdsMapProgress(owner, zone) {
    if (zone && zone.type === "outsideChaos" && owner.woodsmanEntrancePending) return true;
    return !!(zone && zone.id === "beehive_run" && owner.beehive && owner.beehive.inRun);
  }
  function mapProgressGain(env, zone, pStats) {
    let abyssScale = env.deps.getAbyssMonsterScales(zone);
    let enemyCount = (env.owner.enemies || []).filter((enemy) => enemy.hp > 0).length;
    let zoneType = zone ? zone.type : "act";
    let baseGain = { trial: 0.26, abyss: 0.42, skyTower: 0.072 }[zoneType] ?? 0.36;
    let crowdPenalty = enemyCount > 0 ? Math.max(0.4, 1 - enemyCount * 0.13) : 0.94;
    let emptyTravelMultiplier = enemyCount === 0 ? env.deps.EMPTY_TRAVEL_PROGRESS_MULTIPLIER : 1;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    return baseGain * 0.5 * (moveSpeed / 100) * crowdPenalty * emptyTravelMultiplier * (abyssScale.mapProgressMul || 1) * flowGetMapProgressGainMultiplier(zone);
  }

  // modules/domain/exploration-pack-formation.mjs
  var offsets = [[0, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [0, -1], [-1, 1], [1, 0]];
  function packFormationCells(room, count, turns) {
    return offsets.slice(0, count).map(([dx, dy]) => {
      for (let turn = 0; turn < turns; turn++) [dx, dy] = [-dy, dx];
      return { gx: room.gx + dx, gy: room.gy + dy };
    });
  }
  function packFormationRoomCount(deps2, zone, stage, encounter, shape) {
    if (stage !== null) return 1;
    const extra = (zone.packExtra || 0) + (encounter ? deps2.ATLAS.encounters[encounter].packExtra : 0);
    return shape.count || Math.min(9, 3 + extra);
  }
  function packFormationOuterOffsets(room) {
    const list = [], reach = (cell) => Math.max(Math.abs(cell[0]), Math.abs(cell[1]));
    for (let dy = -room.radiusY; dy <= room.radiusY; dy++) for (let dx = -room.radiusX; dx <= room.radiusX; dx++) list.push([dx, dy]);
    return list.filter((cell) => reach(cell) > 1).sort((a, b) => reach(a) - reach(b));
  }
  var packFormationSpots = (room, count) => packFormationCells(room, Math.min(count, offsets.length), 0).concat(count > offsets.length ? packFormationAround(room, count - offsets.length) : []);
  var packFormationAround = (room, count) => packFormationOuterOffsets(room).slice(0, count).map(([dx, dy]) => ({ gx: room.gx + dx, gy: room.gy + dy }));
  function packFormationPackIdentity(room, stage, shape, patrol) {
    if (patrol) return { key: room.id + ":patrol", plain: true };
    if (shape.extra) return { key: `${room.id}:extra${shape.extra}`, plain: true };
    if (shape.wave) return { key: `${room.id}:wave${shape.wave}`, plain: true };
    return { key: packExplorationPackKey(room, stage), plain: false };
  }
  function packFormationPrepare(deps2, zone, room, stage, { encounter, formation: formation2 }) {
    const shape = formation2 || {}, patrol = Object.hasOwn(shape, "anchor"), { key, plain } = packFormationPackIdentity(room, stage, shape, patrol), at = packExplorationPackSpawnAt({ deps: deps2 }, zone, key, stage);
    const elite = !plain && (room.role === "elite" || !!encounter || packIsAtlasExtraEliteRoom({ deps: deps2 }, zone, room));
    return { key, at, elite, anchor: shape.anchor, extra: shape.extra, wave: shape.wave, cells: shape.cells || packFormationCells(shape.center || room, packFormationRoomCount(deps2, zone, stage, encounter, shape), at % 4) };
  }
  function packFormationRoomCenter(deps2, map, room) {
    const dx = room.gx - map.entry.gx, dy = room.gy - map.entry.gy;
    if (Math.abs(dx) + Math.abs(dy) > 6) return room;
    const center = { gx: room.gx, gy: room.gy };
    if (Math.abs(dx) > Math.abs(dy)) center.gx += Math.sign(dx);
    else center.gy += Math.sign(dy);
    return offsets.every(([x, y]) => deps2.actExplorationMap.walkable(map, { gx: center.gx + x, gy: center.gy + y })) ? center : room;
  }
  function packFormationFillRooms(rooms, counts, budget) {
    while (budget > 0) {
      const eligible = rooms.filter((room) => counts.get(room.id).count < 9);
      if (!eligible.length) break;
      for (const room of eligible) {
        if (!budget) break;
        counts.get(room.id).count++;
        budget--;
      }
    }
  }
  function packFormationGrowLargeRoom(rooms, counts, budget, base) {
    const spacious = rooms.filter((room) => room.role === "battle" && room.radiusX >= 2 && room.radiusY >= 2).sort((a, b) => b.radiusX * b.radiusY - a.radiusX * a.radiusY);
    if (!spacious.length || budget <= 0) return budget;
    const extra = Math.min(budget, Math.max(0, Math.min(8, base + 3) - base));
    counts.get(spacious[0].id).count += extra;
    return budget - extra;
  }
  function packFormationPlan(deps2, zone, map) {
    if (!["act", "abyss"].includes(zone.type)) return { counts: /* @__PURE__ */ new Map(), patrol: null };
    const rooms = deps2.actExplorationState.packRooms(map), base = Math.min(9, 3 + (zone.packExtra || 0));
    const counts = new Map(rooms.map((room) => [room.id, { count: base, center: packFormationRoomCenter(deps2, map, room) }])), patrol = deps2.actExplorationMap.roadGroup(map);
    const budget = Math.round(rooms.length * base * 0.28) - (patrol ? patrol.cells.length : 0);
    const remainder = packFormationGrowLargeRoom(rooms, counts, budget, base);
    const varied = [...rooms].sort((a, b) => packExplorationPackSpawnAt({ deps: deps2 }, zone, a.id, null) - packExplorationPackSpawnAt({ deps: deps2 }, zone, b.id, null));
    packFormationFillRooms(varied, counts, remainder);
    return { counts, patrol };
  }
  var packFormationCount = (deps2, zone, encounter, shape) => packFormationRoomCount(deps2, zone, null, encounter, shape || {});
  function packFormationRosterPair(deps2, zone, seed) {
    const pool = deps2.getActMonsterPool(zone);
    const melee = pool.filter((id) => deps2.getMonsterVisualAttackKind(id) === "melee"), ranged = pool.filter((id) => deps2.getMonsterVisualAttackKind(id) === "ranged");
    const front = melee.length ? melee : pool, back = ranged.length ? ranged : pool;
    return [front[seed % front.length], back[Math.floor(seed / 7) % back.length]];
  }
  function packFormationOrdinarySlots(deps2, zone, shape) {
    return shape.cells.map((_, index) => index).filter((index) => {
      if (shape.elite && index === 0) return false;
      const seed = Math.abs(deps2.getEnemySeeds(zone, { at: shape.at }, index).variantSeed);
      return seed % deps2.WISP_ENEMY_RULES.spawnOneIn !== 0 && !deps2.getRootMonsterVisualDefinition(seed);
    });
  }
  function packFormationEncounterOrdinaryRoster(deps2, zone, encounter, shape) {
    const desired = deps2.ATLAS.encounters[encounter]?.ordinaryRoster;
    if (zone.type !== "atlasMap" || !desired) return [];
    const slots = packFormationOrdinarySlots(deps2, zone, shape);
    const roster = [], count = Math.min(slots.length, desired.length);
    if (!count) return roster;
    if (count === 1) {
      const seed = Math.abs(deps2.hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:ordinaryPair`));
      roster[slots[0]] = desired[seed % desired.length];
      return roster;
    }
    for (let index = 0; index < count; index++) {
      const slot = slots[Math.round(index * (slots.length - 1) / (count - 1))];
      roster[slot] = desired[Math.round(index * (desired.length - 1) / (count - 1))];
    }
    return roster;
  }
  function packFormationLabyrinthRoomRoster(deps2, zone, shape) {
    const slots = packFormationOrdinarySlots(deps2, zone, shape), roster = [];
    if (!slots.length) return roster;
    const seed = Math.abs(deps2.hashSeed(`${zone.exploration.seed}:${shape.key}:roster`)), pair = packFormationRosterPair(deps2, zone, seed);
    const pattern = Math.floor(seed / 13) % 2 ? [0, 1, 1] : [0, 1, 0];
    slots.forEach((slot, index) => {
      roster[slot] = pair[slots.length === 1 ? seed % 2 : pattern[index % pattern.length]];
    });
    return roster;
  }
  function packFormationOrdinaryRoomRoster(deps2, zone, shape) {
    if (zone.type === "labyrinth") return packFormationLabyrinthRoomRoster(deps2, zone, shape);
    const seed = Math.abs(deps2.hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:roster`)), pair = packFormationRosterPair(deps2, zone, seed);
    const pattern = [[0, 0, 1], [0, 0, 1], [0, 0, 0, 1], [0, 1, 1]][seed % 4];
    return shape.cells.map((_, index) => pair[pattern[index % pattern.length]]);
  }
  function packFormationRoster(deps2, zone, stage, encounter, { shape, formation: formation2 }) {
    if (stage !== null || formation2?.cast || formation2?.rescue) return [];
    if (!["act", "abyss", "atlasMap", "labyrinth"].includes(zone.type) || deps2.getRealmMonsterVisualSet(zone)) return [];
    if (encounter) return packFormationEncounterOrdinaryRoster(deps2, zone, encounter, shape);
    return packFormationOrdinaryRoomRoster(deps2, zone, shape);
  }
  function packFormationPlaceRanks(waiting, formation2) {
    if (!formation2?.front || formation2.cast || formation2.rescue) return;
    const front = formation2.front, depth = (cell) => Math.abs(cell.gx - front.gx) + Math.abs(cell.gy - front.gy);
    const cells = waiting.map(({ gx, gy }) => ({ gx, gy })).sort((a, b) => depth(a) - depth(b));
    const rank = (enemy) => enemy.attackKind === "ranged" ? 10 + enemy.attackRange : -enemy.attackRange;
    [...waiting].sort((a, b) => rank(a) - rank(b)).forEach((enemy, index) => Object.assign(enemy, cells[index]));
  }
  function createExplorationPackFormation(deps2) {
    return Object.freeze({
      prepare: (zone, room, stage, encounter, formation2) => packFormationPrepare(deps2, zone, room, stage, { encounter, formation: formation2 }),
      plan: (zone, map) => packFormationPlan(deps2, zone, map),
      spots: packFormationSpots,
      around: packFormationAround,
      count: (zone, encounter, shape) => packFormationCount(deps2, zone, encounter, shape),
      roster: (zone, stage, encounter, shape, formation2) => packFormationRoster(deps2, zone, stage, encounter, { shape, formation: formation2 }),
      placeRanks: packFormationPlaceRanks
    });
  }

  // modules/domain/exploration-pack-layout.mjs
  var SHAPES = Object.freeze({
    cluster: [[0, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [0, -1], [-1, 1], [1, 0]],
    line: [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0], [3, 0], [-3, 0], [4, 0], [-4, 0]],
    column: [[0, 0], [0, 1], [0, -1], [0, 2], [0, -2], [1, 0], [-1, 0], [1, 1], [-1, -1]],
    loose: [[0, 0], [-2, 0], [0, 1], [2, -1], [-2, -1], [2, 1], [0, -1], [-2, 1], [2, 0]]
  });
  function packLayoutWeightedPick(deps2, rows) {
    let roll = deps2.random() * rows.reduce((sum, row) => sum + row.weight, 0);
    return rows.find((row) => (roll -= row.weight) < 0) || rows[0];
  }
  function packLayoutFarSign(deps2, map, room) {
    const back = map.hops[room.index][map.entry.index];
    if (back && back.side === "east") return -1;
    if (back && back.side === "west") return 1;
    return deps2.random() < 0.5 ? 1 : -1;
  }
  function packLayoutOpenRoom(deps2, map, room) {
    return { room, layout: packLayoutWeightedPick(deps2, deps2.STAGE_ROOMS.layouts), sign: packLayoutFarSign(deps2, map, room), taken: /* @__PURE__ */ new Set() };
  }
  function packLayoutSpotCentre(state, slot) {
    const room = state.room, [fx, fy] = state.layout.spots[slot % state.layout.spots.length];
    return { gx: room.gx + Math.round(fx * state.sign * Math.max(0, room.radiusX - 3)), gy: room.gy + Math.round(fy * Math.max(0, room.radiusY - 2)) };
  }
  var packLayoutRingAround = (at, ring) => {
    const out = [];
    for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) out.push({ gx: at.gx + dx, gy: at.gy + dy });
    return out;
  };
  function packLayoutFreeCellNear(state, want) {
    const room = state.room, inner = (cell) => cell.gx > room.x0 && cell.gx < room.x1 && cell.gy > room.y0 && cell.gy < room.y1;
    for (let ring = 0; ring <= room.radiusX * 2; ring++) {
      const cell = packLayoutRingAround(want, ring).find((spot) => inner(spot) && !state.taken.has(spot.gx + "," + spot.gy));
      if (cell) {
        state.taken.add(cell.gx + "," + cell.gy);
        return cell;
      }
    }
    return want;
  }
  function packLayoutPackCells(deps2, state, slot, count) {
    const centre = packLayoutSpotCentre(state, slot), shape = SHAPES[packLayoutWeightedPick(deps2, deps2.STAGE_ROOMS.packShapes).id];
    return Array.from({ length: count }, (_, index) => {
      const [dx, dy] = shape[index] || [0, 0];
      return packLayoutFreeCellNear(state, { gx: centre.gx + dx, gy: centre.gy + dy });
    });
  }
  function packLayoutForMap(deps2, map) {
    const states = /* @__PURE__ */ new Map();
    const stateOf = (room) => states.get(room.id) || states.set(room.id, packLayoutOpenRoom(deps2, map, room)).get(room.id);
    return { cells: (room, slot, count) => map.stage ? packLayoutPackCells(deps2, stateOf(room), slot, count) : null, front: (room) => packLayoutApproach(map, room) };
  }
  function packLayoutApproach(map, room) {
    return map.hops[room.index][map.entry.index]?.landing || map.entry;
  }
  function createStageRoomArranger(deps2) {
    return Object.freeze({
      forMap: (map) => packLayoutForMap(deps2, map)
    });
  }

  // modules/combat-encounters-classic.mjs
  var deps = {
    get getElementColor() {
      return getElementColor;
    },
    get startWoodsmanCurse() {
      return startWoodsmanCurse;
    },
    get giveEnemyEnergyShield() {
      return giveEnemyEnergyShield;
    },
    get resetCombatTacticsRuntime() {
      return resetCombatTacticsRuntime;
    },
    get resetCombatChannelRuntime() {
      return resetCombatChannelRuntime;
    },
    get clearTalentCardRuntimeState() {
      return typeof clearTalentCardRuntimeState === "undefined" ? void 0 : clearTalentCardRuntimeState;
    },
    get getEncounterTelemetryContext() {
      return getEncounterTelemetryContext;
    },
    get resetPlayerGridPosition() {
      return resetPlayerGridPosition;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get restoreAndRecallSummons() {
      return restoreAndRecallSummons;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get primeTrialHazardTimer() {
      return primeTrialHazardTimer;
    },
    get resetWoodsmanCurse() {
      return resetWoodsmanCurse;
    },
    get OCEAN_GUARDIAN_BOARD_START_PROGRESS() {
      return OCEAN_GUARDIAN_BOARD_START_PROGRESS;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get isSkyTowerAtRewardLimit() {
      return isSkyTowerAtRewardLimit;
    },
    get isBeehiveRunLockedForMapTravel() {
      return isBeehiveRunLockedForMapTravel;
    },
    get reconcileBeehiveRunState() {
      return typeof reconcileBeehiveRunState === "undefined" ? void 0 : reconcileBeehiveRunState;
    },
    get isCombatProgressStopped() {
      return isCombatProgressStopped;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get holdZoneBoundRuns() {
      return settleDepartedRuns;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get prepareMeteorEncounterEntry() {
      return prepareMeteorEncounterEntry;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get autoEnterGrandBreachIfReady() {
      return typeof autoEnterGrandBreachIfReady === "undefined" ? void 0 : autoEnterGrandBreachIfReady;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get isOceanAutoRediveHalted() {
      return isOceanAutoRediveHalted;
    },
    get enterOceanDive() {
      return enterOceanDive;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get getAutoProgressZoneId() {
      return getAutoProgressZoneId;
    },
    get atlasRun() {
      return atlasRun;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get CONDITION_PATTERN_ACTION_DB() {
      return CONDITION_PATTERN_ACTION_DB;
    },
    get evaluateConditionPatternRule() {
      return evaluateConditionPatternRule;
    },
    get assignEnemyGridSpawn() {
      return assignEnemyGridSpawn;
    },
    get getBattleSpawnStamp() {
      return getBattleSpawnStamp;
    },
    get isCrowdProgressPaused() {
      return isCrowdProgressPaused;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get EMPTY_TRAVEL_PROGRESS_MULTIPLIER() {
      return EMPTY_TRAVEL_PROGRESS_MULTIPLIER;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get recordWoodsmanEchoRun() {
      return recordWoodsmanEchoRun;
    },
    get dropEnemyAttack() {
      return dropEnemyAttack;
    },
    get applyVoidRiftMobTuning() {
      return applyVoidRiftMobTuning;
    },
    get ensureCombatGridRuntime() {
      return ensureCombatGridRuntime;
    },
    get getGrandBreachProgress() {
      return getGrandBreachProgress;
    },
    get defeatInGrandBreach() {
      return abandonTimedBreach;
    },
    get expireConditionEffects() {
      return expireConditionEffects;
    },
    get ACT_EXPLORATION_ALERT() {
      return ACT_EXPLORATION_ALERT;
    },
    get ACT_EXPLORATION_AMBUSH() {
      return ACT_EXPLORATION_AMBUSH;
    },
    get ACT_EXPLORATION_WAVES() {
      return ACT_EXPLORATION_WAVES;
    },
    get ATLAS() {
      return ATLAS;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get WISP_ENEMY_RULES() {
      return WISP_ENEMY_RULES;
    },
    get _t() {
      return _t;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get atlasEncounters() {
      return atlasEncounters;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get atlasFinds() {
      return atlasFinds;
    },
    get bossVariants() {
      return typeof bossVariants === "undefined" ? void 0 : bossVariants;
    },
    get combatIncidents() {
      return combatIncidents;
    },
    get createEnemy() {
      return createEnemy;
    },
    get dressWoodsmanEchoDummy() {
      return dressWoodsmanEchoDummy;
    },
    get findFreeGridCell() {
      return findFreeGridCell;
    },
    get fitBossFootprint() {
      return fitBossFootprint;
    },
    get generateEncounterPlan() {
      return generateEncounterPlan;
    },
    get getActMonsterPool() {
      return getActMonsterPool;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getEnemySeeds() {
      return getEnemySeeds;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get getMonsterVisualAttackKind() {
      return getMonsterVisualAttackKind;
    },
    get getRealmMonsterVisualSet() {
      return getRealmMonsterVisualSet;
    },
    get getRootMonsterVisualDefinition() {
      return getRootMonsterVisualDefinition;
    },
    get getZone() {
      return getZone;
    },
    get getZoneEncounterProfile() {
      return getZoneEncounterProfile;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get hashSeed() {
      return hashSeed;
    },
    get memoryDungeon() {
      return memoryDungeon;
    },
    get rollExplorationFacing() {
      return rollExplorationFacing;
    },
    random: () => Math.random()
  };
  var formation = createExplorationPackFormation(deps);
  Object.defineProperties(deps, { formation: { value: formation }, arranger: { value: createStageRoomArranger(deps) } });
  function countEncounterMarkers(zone) {
    return packCountEncounterMarkers({ owner: game, deps }, zone);
  }
  function chainRoomsOf(map) {
    return packChainRoomsOf(map);
  }
  function fillRoomPack(map, room, pack, enemies, places) {
    return packFillRoomPack({ owner: game, deps }, map, room, pack, { enemies, places });
  }
  function placeBeehiveRoomWave(run, enemies, step, isBoss) {
    return packPlaceBeehiveRoomWave({ owner: game, deps }, run, enemies, step, isBoss);
  }
  function createActExplorationPack(zone, room, stage, encounter = null, formation2 = null) {
    return packCreateActExplorationPack({ owner: game, deps }, zone, room, stage, { encounter, formation: formation2 });
  }
  function getZoneExplorationPlan(zone) {
    return packGetZoneExplorationPlan({ owner: game, deps }, zone);
  }
  function createActExplorationEncounter(zone, exploration) {
    return packCreateActExplorationEncounter({ owner: game, deps }, zone, exploration);
  }
  function createExplorationPacks(zone, map, bossStages) {
    return packCreateExplorationPacks({ owner: game, deps }, zone, map, bossStages);
  }
  safeExposeGlobals({ explorationPackFormation: formation });
  var presentation = {
    get addLog() {
      return addLog;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get announceEnemyAttackRelease() {
      return announceEnemyAttackRelease;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get resetBattleRuntimeVisuals() {
      return resetBattleRuntimeVisuals;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    }
  };
  function settleDepartedRuns() {
    return holdZoneBoundRuns(addLog);
  }
  function abandonTimedBreach(zone, message, options) {
    return defeatInGrandBreach(zone, message, options, { say: addLog });
  }
  function runEncounterPresentation(iterator) {
    let step = iterator.next();
    while (!step.done) {
      const command = step.value;
      const result = command.kind === "waveLog" ? command.logger(...command.args) : presentation[command.kind](...command.args);
      step = iterator.next(result);
    }
    return step.value;
  }
  var returnRuleReadyAt = 0;
  var runtime = {
    get pTimer() {
      return window.GameModules.state.session.pTimer;
    },
    set pTimer(value) {
      window.GameModules.state.session.pTimer = value;
    },
    get progressStallTicks() {
      return window.GameModules.state.session.progressStallTicks;
    },
    set progressStallTicks(value) {
      window.GameModules.state.session.progressStallTicks = value;
    },
    get returnRuleReadyAt() {
      return returnRuleReadyAt;
    },
    set returnRuleReadyAt(value) {
      returnRuleReadyAt = value;
    },
    get pendingHeavyUiRefresh() {
      return pendingHeavyUiRefresh;
    },
    set pendingHeavyUiRefresh(value) {
      pendingHeavyUiRefresh = value;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    }
  };
  function releaseExplorationWave(log) {
    return runEncounterPresentation(flowReleaseExplorationWave({ owner: game, deps, runtime }, log));
  }
  function strikeRescueTarget(enemy) {
    return runEncounterPresentation(flowStrikeRescueTarget(enemy));
  }
  function beginRoomBossRules(zone) {
    return flowBeginRoomBossRules({ owner: game, deps, runtime }, zone);
  }
  function tuneBeehiveWaveEnemy(enemy, zone, isBoss, empower) {
    return flowTuneBeehiveWaveEnemy({ owner: game, deps, runtime }, enemy, zone, isBoss, empower);
  }
  function getGrandBreachArena(zone) {
    return runEncounterPresentation(flowGetGrandBreachArena({ owner: game, deps, runtime }, zone));
  }
  function getBeehiveRoomRun() {
    return flowGetBeehiveRoomRun({ owner: game, deps, runtime });
  }
  function countBeehiveWaveAlive() {
    return flowCountBeehiveWaveAlive({ owner: game, deps, runtime });
  }
  function startEncounterRun(exploration) {
    return runEncounterPresentation(flowStartEncounterRun({ owner: game, deps, runtime }, exploration));
  }
  function beginOceanRunRules(zone, explorationRun) {
    return flowBeginOceanRunRules({ owner: game, deps, runtime }, zone, explorationRun);
  }
  function startMoving(isTown) {
    return runEncounterPresentation(flowStartMoving({ owner: game, deps, runtime }, isTown));
  }
  function prepareActExplorationArrival() {
    return flowPrepareActExplorationArrival({ owner: game, deps, runtime });
  }
  function advanceActExplorationDeparture() {
    return runEncounterPresentation(flowAdvanceActExplorationDeparture({ owner: game, deps, runtime }));
  }
  function finishTownReturnAction() {
    return runEncounterPresentation(flowFinishTownReturnAction({ owner: game, deps, runtime }));
  }
  function returnToTown() {
    return runEncounterPresentation(flowReturnToTown({ owner: game, deps, runtime }));
  }
  function runReturnRules(pStats, now = getCombatTime()) {
    return runEncounterPresentation(flowRunReturnRules({ owner: game, deps, runtime }, pStats, now));
  }
  function ensureEncounterRun() {
    return runEncounterPresentation(flowEnsureEncounterRun({ owner: game, deps, runtime }));
  }
  function isRegularAutoProgressZone(zone) {
    return flowIsRegularAutoProgressZone(zone);
  }
  function reconcileMapProgressRuntimeState() {
    return runEncounterPresentation(flowReconcileMapProgressRuntimeState({ owner: game, deps, runtime }));
  }
  function spawnEncounterMarker(marker) {
    return runEncounterPresentation(flowSpawnEncounterMarker({ owner: game, deps, runtime }, marker));
  }
  function advanceMapProgress(pStats) {
    return runEncounterPresentation(flowAdvanceMapProgress({ owner: game, deps, runtime }, pStats));
  }
  function ensureWoodsmanEchoRunState() {
    return flowEnsureWoodsmanEchoRunState({ owner: game, deps, runtime });
  }
  function finishWoodsmanEchoRun() {
    return runEncounterPresentation(flowFinishWoodsmanEchoRun({ owner: game, deps, runtime }));
  }
  function spawnVoidBreachReinforcement(zone, rift) {
    return flowSpawnVoidBreachReinforcement({ owner: game, deps, runtime }, zone, rift);
  }
  function tickGrandBreachRun(zone) {
    return runEncounterPresentation(flowTickGrandBreachRun({ owner: game, deps, runtime }, zone));
  }
  function rollExplorationFacing() {
    return Math.floor(Math.random() * actExplorationMap.ROTATIONS);
  }
  safeExposeGlobals({ chainRoomsOf, createActExplorationPack, releaseExplorationWave, getZoneExplorationPlan, createActExplorationEncounter, createExplorationPacks, strikeRescueTarget, countEncounterMarkers, fillRoomPack, beginRoomBossRules, tuneBeehiveWaveEnemy, getGrandBreachArena, getBeehiveRoomRun, placeBeehiveRoomWave, countBeehiveWaveAlive, startEncounterRun, beginOceanRunRules, startMoving, prepareActExplorationArrival, advanceActExplorationDeparture, finishTownReturnAction, returnToTown, runReturnRules, ensureEncounterRun, isRegularAutoProgressZone, reconcileMapProgressRuntimeState, spawnEncounterMarker, advanceMapProgress, ensureWoodsmanEchoRunState, finishWoodsmanEchoRun, spawnVoidBreachReinforcement, tickGrandBreachRun, rollExplorationFacing });
})();
