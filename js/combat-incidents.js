// GENERATED from modules/combat-incidents*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/incident-values.mjs
  var HUNTING_ZONES = /* @__PURE__ */ new Set(["act", "abyss", "atlasMap"]);
  var NEIGHBORS = /* @__PURE__ */ Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]);

  // modules/combat/incident-common.mjs
  function incidentRule(env2) {
    return env2.deps.ACT_EXPLORATION_INCIDENTS;
  }
  function incidentDraw(env2, tag, key) {
    return Math.abs(env2.deps.hashSeed(`${tag}:${key}`)) % 1e5 / 1e5;
  }
  function incidentQuiet(env2, zone) {
    return !!env2.owner.isBackgroundCalculation || !zone || !HUNTING_ZONES.has(zone.type) || zone.type === "act" && zone.id === 0 && (env2.owner.season || 1) === 1;
  }
  function* incidentTell(text, tone, chase = false) {
    return yield { kind: "dispatchRuntimeEvent", args: ["incident", { text, tone, chase }] };
  }
  function incidentReceipt(env2, work) {
    return env2.deps.combatLootReceipts.capture(env2.owner, work);
  }
  function* incidentNote(env2, kind) {
    const row = incidentRule(env2).records.find(([key]) => key === kind), first = !(((env2.owner.records || {}).incidents || {})[kind] > 0);
    env2.deps.recordIncident(kind, env2.owner);
    if (first && row) yield* incidentTell(row[2] ? env2.deps._t("숨은 사건을 찾았습니다. 「{row}」", { row: row[1] }) : env2.deps._t("처음 만난 사건입니다. 「{row}」", { row: row[1] }), row[2] ? "chase" : "reward", row[2]);
  }
  function incidentOften(env2) {
    return env2.deps.colonyWards.incidentMul(env2.owner);
  }
  function incidentWorn(env2, key) {
    for (const item of Object.values(env2.deps.combatEquipmentStats.activeEquipment(env2.owner) || {})) {
      if (item && item.rarity === "unique" && item.uniqueEffectKey === key) return item.uniqueEffectParams || {};
    }
    return null;
  }
  function incidentRunSeed(env2, run) {
    if (!Number.isSafeInteger(run.incidentSeed)) run.incidentSeed = Math.abs(env2.deps.hashSeed(`${run.layoutId}:${env2.owner.nextEnemyId}:${env2.deps.getCombatTime()}`));
    return run.incidentSeed;
  }
  function incidentRoomKey(env2, run, room) {
    return `${run.layoutId || ""}:${incidentRunSeed(env2, run)}:${room.id}`;
  }
  function incidentFirstLook(run, room) {
    if (!Array.isArray(run.incidentRooms)) run.incidentRooms = [];
    if (run.incidentRooms.includes(room.id)) return false;
    run.incidentRooms.push(room.id);
    return true;
  }

  // modules/combat/incident-strays.mjs
  function incidentAddStray(env2, zone, pack) {
    const key = `${pack.key}:${pack.aliveIds[0]}`;
    const enemy = incidentDraw(env2, "stray", key) < incidentRule(env2).stray.chance * incidentOften(env2) ? pack.waiting.find(((...args) => incidentStrayable(env2, ...args))) : null;
    const look = enemy ? incidentStrayLook(env2, zone, key) : null;
    if (look) incidentDressStray(env2, enemy, look);
  }
  function incidentPlainLook(env2, enemy) {
    const def = env2.deps.ACT_MONSTER_VISUAL_BY_ID[enemy.spriteVariantId];
    return !!def && !def.weapon && !enemy.monsterVisualId;
  }
  function incidentStrayable(env2, enemy) {
    return !enemy.isElite && !enemy.isBoss && !enemy.craftOmen && incidentPlainLook(env2, enemy);
  }
  function incidentStrayLook(env2, zone, key) {
    const here = new Set(env2.deps.getActMonsterPool(zone)), reached = Math.min(Math.floor(Number(env2.owner.maxZoneId) || 0), env2.deps.MAP_ZONES.length - 1);
    const acts = env2.deps.MAP_ZONES.slice(0, reached + 1).filter((row) => row && row.type === "act");
    const ids = [...new Set(acts.flatMap((row) => env2.deps.getActMonsterPool(row)))].filter((id) => !here.has(id));
    return ids.length ? env2.deps.ACT_MONSTER_VISUAL_BY_ID[ids[Math.floor(incidentDraw(env2, "strayLook", key) * ids.length)]] || null : null;
  }
  function incidentDressStray(env2, enemy, look) {
    const S = incidentRule(env2).stray;
    Object.assign(enemy, {
      stray: true,
      name: `${S.prefix} ${look.name}`,
      baseMonsterName: look.name,
      spriteVariantId: look.id,
      encounterOutline: S.outline,
      expMul: (Number(enemy.expMul) || 1) * S.expMul
    });
    env2.deps.assignEnemyGridCombatProfile(enemy);
    return true;
  }

  // modules/combat/incident-sleep.mjs
  function incidentLull(env2, enemy) {
    return Object.assign(enemy, {
      asleep: true,
      awakeName: enemy.name,
      awakeOutline: enemy.encounterOutline || null,
      name: `${incidentRule(env2).sleep.prefix} ${enemy.name}`,
      encounterOutline: incidentRule(env2).sleep.outline
    });
  }
  function incidentLullPack(env2, pack) {
    if (incidentDraw(env2, "sleep", `${pack.key}:${pack.aliveIds[0]}`) >= incidentRule(env2).sleep.chance * incidentOften(env2)) return;
    pack.sleep = true;
    pack.waiting.forEach(((...args) => incidentLull(env2, ...args)));
  }
  function* incidentTickSleep(env2, run, sleepers, now) {
    const S = incidentRule(env2).sleep, hero = env2.owner.gridPlayer;
    const near = (enemy) => !!hero && env2.deps.hasGridCell(enemy) && env2.deps.gridChebyshevDist(enemy.gx, enemy.gy, hero.gx, hero.gy) <= S.wakeCells;
    const woken = new Set(sleepers.filter((enemy) => enemy.hp < enemy.maxHp || near(enemy)).map((enemy) => enemy.explorationPack));
    for (const enemy of sleepers) if (!woken.has(enemy.explorationPack)) yield* incidentDoze(env2, enemy, now);
    for (const key of woken) yield* incidentWakePack(env2, run, key, sleepers, now);
  }
  function* incidentWakePack(env2, run, key, sleepers, now) {
    const pack = run.packs.find((row) => row.key === key), waiting = pack ? pack.waiting.filter((enemy) => enemy.asleep) : [];
    const waking = sleepers.filter((enemy) => enemy.explorationPack === key).concat(waiting), count = waking.length;
    for (let index = 0; index < count; index++) {
      if (!(index in waking)) continue;
      yield* incidentWake(env2, waking[index], now);
    }
    yield* incidentNote(env2, "sleep");
  }
  function* incidentWake(env2, enemy, now) {
    const S = incidentRule(env2).sleep;
    Object.assign(enemy, { asleep: false, name: enemy.awakeName || enemy.name, encounterOutline: enemy.awakeOutline || null });
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + S.groggyMs);
    yield { kind: "addBattleFx", args: ["statusText", { enemyId: enemy.id, text: "!", color: S.outline, duration: 420 }] };
  }
  function* incidentDoze(env2, enemy, now) {
    const S = incidentRule(env2).sleep;
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + 400);
    if (Number(enemy.sleepZAt) > now) return;
    enemy.sleepZAt = now + S.zEveryMs + Math.abs(enemy.id || 0) % 5 * 120;
    yield { kind: "addBattleFx", args: ["statusText", { enemyId: enemy.id, text: "z", color: S.zColor, duration: 900 }] };
  }
  function incidentYawnChance(env2) {
    const incense = incidentWorn(env2, "drowsyIncense");
    return Math.max(incidentRule(env2).yawn.chance * incidentOften(env2), incense ? Number(incense.chance) || 0 : 0);
  }
  function* incidentYawn(env2, enemies, now) {
    const incense = incidentWorn(env2, "drowsyIncense"), sleepMs = incense ? incense.sleepMs : incidentRule(env2).yawn.sleepMs;
    enemies.forEach((enemy) => {
      enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + sleepMs);
    });
    yield* incidentTell(env2.deps._t("세계수가 하품을 했습니다. 이 방의 몬스터가 잠시 잠들었습니다."), "reward");
    yield* incidentNote(env2, "yawn");
  }

  // modules/combat/incident-critters.mjs
  function incidentMakeCritter(env2, zone, cell, rainbow) {
    const critter = env2.deps.createEnemy(zone, { at: 0, count: 1, boss: false, elite: false, storyStage: null }, 0);
    return Object.assign(incidentDressCritter(env2, critter, rainbow), cell, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
  }
  function incidentDressCritter(env2, enemy, rainbow) {
    const C = incidentRule(env2).critter, maxHp = Math.ceil(enemy.maxHp * C.hpMul);
    return Object.assign(enemy, {
      name: rainbow ? C.rainbow.name : C.name,
      spriteVariantId: C.look,
      monsterVisualId: C.look,
      monsterArchetype: null,
      realmVisual: null,
      hp: maxHp,
      maxHp,
      noAttack: true,
      critter: rainbow ? "rainbow" : "gold",
      encounterOutline: C.outline,
      expMul: (Number(enemy.expMul) || 1) * C.expMul
    });
  }
  function incidentJoinFight(env2, host, critter) {
    critter.explorationPack = host.key;
    host.aliveIds.push(critter.id);
    env2.owner.enemies.push(critter);
    return critter;
  }
  function incidentFarCorner(env2, room) {
    const hero = env2.owner.gridPlayer, corners = [[room.x0 + 1, room.y0 + 1], [room.x1 - 1, room.y0 + 1], [room.x0 + 1, room.y1 - 1], [room.x1 - 1, room.y1 - 1]];
    return corners.map(([gx, gy]) => ({ gx, gy })).sort((a, b) => env2.deps.gridChebyshevDist(b.gx, b.gy, hero.gx, hero.gy) - env2.deps.gridChebyshevDist(a.gx, a.gy, hero.gx, hero.gy))[0];
  }
  function* incidentTickCritter(env2, run, enemy, room, now) {
    const C = incidentRule(env2).critter, rainbow = enemy.critter === "rainbow";
    if (!(enemy.critterSeenAt > 0)) {
      enemy.critterSeenAt = now;
      if (run.mode !== "manual" && !env2.deps.actExplorationState.lockedEnemy(run)) env2.deps.actExplorationState.lockOn(run, enemy);
      yield* incidentTell(rainbow ? "무지갯빛 수액 슬라임이 나타났습니다." : "금빛 수액 슬라임이 나타났습니다.", rainbow ? "chase" : "reward", rainbow);
    }
    if (now - enemy.critterSeenAt >= C.fleeMs) return yield* incidentEscape(env2, run, enemy, rainbow);
    if (room && env2.deps.hasGridCell(enemy)) env2.deps.advanceGridUnitMovement(enemy, incidentFarCorner(env2, room), 0.1, C.stepSec);
    return false;
  }
  function* incidentEscape(env2, run, enemy, rainbow) {
    enemy.hp = 0;
    env2.owner.enemies = env2.owner.enemies.filter((entry) => entry.id !== enemy.id);
    if (env2.deps.actExplorationState.recordDeath(env2.owner, enemy)) env2.deps.actExplorationProgress.objects.afterDeath(run);
    yield { kind: "addBattleFx", args: ["enemyDeath", { enemyId: enemy.id, name: enemy.name, color: "#fff0a8", duration: 420 }] };
    if (rainbow || !enemy.feast) yield* incidentTell(rainbow ? "무지갯빛 수액 슬라임이 달아났습니다." : "금빛 수액 슬라임이 달아났습니다.", "warning");
    return true;
  }

  // modules/combat/incident-packs.mjs
  function incidentPlainPack(pack) {
    return pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.alert && !pack.ambush && !pack.treasure && pack.eliteIds.length === 0 && pack.waiting.length > 0;
  }
  function incidentBesidePack(env2, map, pack, taken) {
    for (const enemy of pack.waiting) for (const [dx, dy] of NEIGHBORS) {
      const cell = { gx: enemy.gx + dx, gy: enemy.gy + dy }, room = env2.deps.actExplorationRooms.roomAt(map, cell);
      if (room && room.id === pack.roomId && env2.deps.actExplorationMap.walkable(map, cell) && !env2.deps.actExplorationRooms.doorAt(map, cell) && !taken.has(env2.deps.gridCellKey(cell.gx, cell.gy))) return cell;
    }
    return null;
  }
  function incidentDressPacks(env2, zone, map, packs) {
    if (incidentQuiet(env2, zone)) return packs;
    const taken = new Set(packs.flatMap((pack) => pack.waiting.flatMap(((...args) => incidentBodyKeys(env2, ...args)))));
    for (const pack of packs.filter(incidentPlainPack)) {
      if (map.stage && map.owner && incidentAddCritter(env2, zone, map, pack, taken)) continue;
      incidentAddStray(env2, zone, pack);
      incidentLullPack(env2, pack);
    }
    return packs;
  }
  function incidentBodyKeys(env2, enemy) {
    const size = env2.deps.getGridUnitFootprint(enemy), keys = [];
    for (let dy = 0; dy < size.rows; dy++) for (let dx = 0; dx < size.columns; dx++) keys.push(env2.deps.gridCellKey(enemy.gx + dx, enemy.gy + dy));
    return keys;
  }
  function incidentAddCritter(env2, zone, map, pack, taken) {
    const C = incidentRule(env2).critter, lure = incidentWorn(env2, "critterLure"), chance = C.chance * (lure ? lure.chanceMul : 1) * incidentOften(env2), key = `${pack.key}:${pack.aliveIds[0]}`;
    const cell = incidentDraw(env2, "critter", key) < chance ? incidentBesidePack(env2, map, pack, taken) : null;
    if (!cell) return false;
    const critter = Object.assign(incidentMakeCritter(env2, zone, cell, incidentDraw(env2, "rainbow", key) < C.rainbow.chance * incidentOften(env2)), { explorationPack: pack.key });
    taken.add(env2.deps.gridCellKey(cell.gx, cell.gy));
    pack.waiting.push(critter);
    pack.aliveIds.push(critter.id);
    return true;
  }

  // modules/rendering/incident-colors.mjs
  function incidentGlazeOf(env2, enemy) {
    if (!enemy || !enemy.critter) return null;
    const C = incidentRule(env2).critter;
    if (enemy.critter !== "rainbow") return C.glaze;
    const list = C.rainbow.glazes, step = Math.floor(env2.deps.performance.now() / C.rainbow.everyMs) % list.length;
    return { color: list[step], alpha: C.rainbow.alpha };
  }

  // modules/combat/incident-feast.mjs
  function* incidentFeast(env2, run, enemies, key) {
    const C = incidentRule(env2).critter, guests = (env2.deps.getZone(env2.owner.currentZoneId) || {}).type === "atlasMap" ? [] : enemies.filter((enemy) => incidentFeastable(run, enemy));
    if (!guests.length) return false;
    guests.forEach((enemy, index) => {
      const rainbow = incidentDraw(env2, "rainbow", `feast:${key}:${index}`) < C.rainbow.chance * incidentOften(env2);
      Object.assign(incidentDressCritter(env2, enemy, rainbow), { asleep: false, feast: true, critterSeenAt: rainbow ? 0 : env2.deps.getCombatTime() });
    });
    yield* incidentTell(env2.deps._t("황금 수액 잔치가 열렸습니다. 이 방의 몬스터가 모두 금빛 수액 슬라임이 되었습니다."), "chase", true);
    yield* incidentNote(env2, "feast");
    return true;
  }
  function incidentFeastable(run, enemy) {
    const pack = !enemy.isElite && !enemy.critter && enemy.explorationPack ? run.packs.find((row) => row.key === enemy.explorationPack) : null;
    return !!pack && pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.treasure;
  }

  // modules/combat/incident-stars.mjs
  function* incidentDropStar(env2, run, room, key, { now, forced = false }) {
    const S = incidentRule(env2).star;
    if (!forced && incidentDraw(env2, "shower", key) < S.shower.chance * incidentOften(env2)) return yield* incidentStarShower(env2, run, room, key, now);
    const roll = forced || incidentDraw(env2, "star", key) < S.chance * incidentOften(env2);
    const map = roll && incidentStarRewards(env2).length ? env2.deps.actExplorationDoors.stageMap(run) : null, cell = map ? incidentStarCell(env2, map, room, key) : null;
    if (!cell) return false;
    yield { kind: "addBattleFx", args: ["fallingStar", { cell, duration: S.fallMs + S.burstMs }] };
    env2.runtime.stars.push({ run, cell, key, at: now + S.fallMs });
    return true;
  }
  function* incidentStarShower(env2, run, room, key, now) {
    const S = incidentRule(env2).star, map = incidentStarRewards(env2).length ? env2.deps.actExplorationDoors.stageMap(run) : null, cells = [];
    for (let i = 0; map && cells.length < S.shower.count && i < S.shower.count * 3; i++) {
      const cell = incidentStarCell(env2, map, room, `${key}:shower${i}`);
      if (cell && !cells.some((other) => other.gx === cell.gx && other.gy === cell.gy)) cells.push(cell);
    }
    if (!cells.length) return false;
    const count = cells.length;
    for (let index = 0; index < count; index++) {
      if (!(index in cells)) continue;
      const cell = cells[index];
      yield { kind: "addBattleFx", args: ["fallingStar", { cell, duration: S.fallMs + S.burstMs }] };
      env2.runtime.stars.push({ run, cell, key: `${key}:shower${index}`, at: now + S.fallMs, shower: true, golden: index === cells.length - 1 });
    }
    yield* incidentTell(env2.deps._t("유성우가 쏟아집니다."), "chase", true);
    return true;
  }
  function incidentStarLoot(env2, star, rows) {
    const golden = incidentRule(env2).star.shower.golden;
    return star.golden && env2.deps.contentProgression.canDropCurrency(golden[0]) ? golden : rows[Math.floor(incidentDraw(env2, "starLoot", star.key) * rows.length)];
  }
  function incidentStarCell(env2, map, room, key) {
    const hero = env2.owner.gridPlayer, w = Math.max(1, room.x1 - room.x0 - 1), h = Math.max(1, room.y1 - room.y0 - 1);
    for (let i = 0; i < 12; i++) {
      const cell = { gx: room.x0 + 1 + Math.floor(incidentDraw(env2, "starX", key + i) * w), gy: room.y0 + 1 + Math.floor(incidentDraw(env2, "starY", key + i) * h) };
      if (env2.deps.actExplorationMap.walkable(map, cell) && (!hero || env2.deps.gridChebyshevDist(cell.gx, cell.gy, hero.gx, hero.gy) > 2)) return cell;
    }
    return null;
  }
  function incidentStarRewards(env2) {
    return incidentRule(env2).star.rewards.filter(([currency]) => env2.deps.contentProgression.canDropCurrency(currency));
  }
  function* incidentLandStars(env2, run, now) {
    for (let i = env2.runtime.stars.length - 1; i >= 0; i--) {
      if (env2.runtime.stars[i].at > now) continue;
      const [star] = env2.runtime.stars.splice(i, 1), rows = incidentStarRewards(env2);
      if (star.run !== run || !rows.length) continue;
      const [currency, count] = incidentStarLoot(env2, star, rows);
      const gained = incidentReceipt(env2, () => env2.deps.keepCurrencyDrop(star.cell, currency, count)).gain > 0;
      if (star.shower) {
        if (star.golden) yield* incidentNote(env2, "shower");
        continue;
      }
      if (!gained) continue;
      yield* incidentTell(env2.deps._t("별똥별이 떨어졌습니다."), "reward");
      yield* incidentNote(env2, "star");
    }
  }

  // modules/combat/incident-challenge.mjs
  function* incidentOpenChallenge(env2, run, room, key, { now, forced = false }) {
    const C = incidentRule(env2).challenge;
    if (env2.runtime.challenge || !forced && incidentDraw(env2, "challenge", key) >= C.chance * incidentOften(env2) || !incidentChallengeRewards(env2).length) return false;
    if (!run.packs.some((pack) => pack.roomId === room.id && pack.aliveIds.length)) return false;
    env2.runtime.challenge = { run, roomId: room.id, until: now + C.seconds * 1e3, marks: C.marks.slice() };
    yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("사냥 도전 {seconds}초", { seconds: C.seconds }), color: "#ff9f6b", duration: 900, bodyCue: true }] };
    yield* incidentTell(env2.deps._t("사냥 도전: {seconds}초 안에 이 방의 몬스터를 모두 쓰러뜨리세요.", { seconds: C.seconds }), "reward");
    return true;
  }
  function incidentChallengeRewards(env2) {
    return incidentRule(env2).challenge.rewards.filter(([currency]) => env2.deps.contentProgression.canDropCurrency(currency));
  }
  function* incidentTickChallenge(env2, run, now) {
    if (env2.runtime.challenge.run !== run) {
      env2.runtime.challenge = null;
      return;
    }
    if (run.packs.filter((pack) => pack.roomId === env2.runtime.challenge.roomId).every((pack) => !pack.aliveIds.length)) return yield* incidentFinishChallenge(env2, true);
    if (now >= env2.runtime.challenge.until) return yield* incidentFinishChallenge(env2, false);
    const left = Math.ceil((env2.runtime.challenge.until - now) / 1e3);
    if (env2.runtime.challenge.marks.length && left <= env2.runtime.challenge.marks[0]) yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("{shift}초", { shift: env2.runtime.challenge.marks.shift() }), color: "#ffe9a0", duration: 600, bodyCue: true }] };
  }
  function* incidentFinishChallenge(env2, won) {
    const C = incidentRule(env2).challenge, hero = env2.owner.gridPlayer, rows = incidentChallengeRewards(env2);
    env2.runtime.challenge = null;
    if (!won) return yield* incidentTell(env2.deps._t("사냥 도전의 시간이 지났습니다."), "warning");
    incidentReceipt(env2, () => {
      for (let i = 0; i < C.picks && rows.length; i++) {
        const [currency, count] = env2.deps.rndChoice(rows);
        env2.deps.keepCurrencyDrop({ gx: hero.gx, gy: hero.gy }, currency, count);
      }
    });
    yield { kind: "addBattleFx", args: ["statusText", { text: env2.deps._t("사냥 도전 성공"), color: "#ff9f6b", duration: 900, bodyCue: true }] };
    yield* incidentTell(env2.deps._t("사냥 도전을 해냈습니다."), "reward");
    yield* incidentNote(env2, "challenge");
  }

  // modules/combat/incident-breath.mjs
  function* incidentBreathe(env2, key, now, forced = false) {
    const B = incidentRule(env2).breath;
    if (!forced && incidentDraw(env2, "breath", key) >= B.chance * incidentOften(env2)) return false;
    const kind = B.kinds[Math.floor(incidentDraw(env2, "breath-kind", key) * B.kinds.length)];
    env2.owner.incidentBreath = { kind: kind.key, until: now + B.seconds * 1e3 };
    yield { kind: "addBattleFx", args: ["statusText", { text: kind.name, color: "#b8f0c8", duration: 700, bodyCue: true }] };
    yield* incidentTell(env2.deps._t("세계수의 숨결: {seconds}초 동안 {text}.", { seconds: B.seconds, text: kind.text }), "reward");
    yield* incidentNote(env2, "breath");
    return true;
  }
  function incidentBreathKind(env2, breath) {
    return breath ? incidentRule(env2).breath.kinds.find((kind) => kind.key === breath.kind) || null : null;
  }
  function incidentBreathStats(env2, breath) {
    return (incidentBreathKind(env2, breath) || { stats: [] }).stats;
  }

  // modules/combat/incident-room.mjs
  function* incidentTickRoom(env2, run, room, now) {
    if (!room || room.role !== "battle" && room.role !== "optional") return;
    const here = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !enemy.isBoss);
    if (!here.length || !incidentFirstLook(run, room)) return;
    yield* incidentRollRoom(env2, run, room, { here, key: incidentRoomKey(env2, run, room), now });
  }
  function* incidentRollRoom(env2, run, room, { here, key, now }) {
    if (incidentDraw(env2, "feast", key) < incidentRule(env2).feast.chance * incidentOften(env2) && (yield* incidentFeast(env2, run, here, key))) return;
    yield* incidentDropStar(env2, run, room, key, { now });
    if (yield* incidentOpenChallenge(env2, run, room, key, { now })) return;
    yield* incidentBreathe(env2, key, now);
    if (incidentDraw(env2, "yawn", key) < incidentYawnChance(env2)) yield* incidentYawn(env2, here, now);
  }
  function* incidentTickTimed(env2, run, now) {
    if (env2.runtime.stars.length) yield* incidentLandStars(env2, run, now);
    if (env2.runtime.challenge) yield* incidentTickChallenge(env2, run, now);
  }
  function* incidentTick(env2) {
    const zone = env2.deps.getZone(env2.owner.currentZoneId), run = env2.deps.actExplorationState.current(env2.owner);
    if (incidentQuiet(env2, zone) || !run || !env2.owner.enemies) return;
    const map = env2.deps.actExplorationDoors.stageMap(run), room = map ? env2.deps.actExplorationDoors.room(run) : null, now = env2.deps.getCombatTime();
    const live = env2.owner.enemies.filter((enemy) => enemy && enemy.hp > 0);
    for (const enemy of live) if (enemy.critter) yield* incidentTickCritter(env2, run, enemy, room, now);
    const sleepers = live.filter((enemy) => enemy.asleep);
    if (sleepers.length) yield* incidentTickSleep(env2, run, sleepers, now);
    yield* incidentTickTimed(env2, run, now);
    if (map) yield* incidentTickRoom(env2, run, room, now);
  }

  // modules/combat/incident-rewards.mjs
  function* incidentOnKill(env2, enemy, zone) {
    if (!enemy || incidentQuiet(env2, zone)) return;
    if (!enemy.critter) {
      if (enemy.stray) {
        incidentReceipt(env2, () => env2.deps.grantEquipmentPick(enemy, zone, incidentRule(env2).stray.gear, null));
        yield* incidentNote(env2, "stray");
      }
      yield* incidentRise(env2, enemy, zone);
      return;
    }
    const rainbow = enemy.critter === "rainbow";
    incidentReceipt(env2, () => {
      incidentGrantCritterRewards(env2, enemy, zone);
      if (rainbow) incidentGrantRainbowRewards(env2, enemy, zone);
    });
    yield* incidentNote(env2, rainbow ? "rainbow" : "critter");
    if (rainbow || !enemy.feast) yield* incidentTell(rainbow ? "무지갯빛 수액 슬라임을 잡았습니다." : "금빛 수액 슬라임을 잡았습니다.", rainbow ? "chase" : "reward", rainbow);
  }
  function* incidentRise(env2, enemy, zone) {
    if (enemy.isBoss || !enemy.explorationPack || !env2.deps.hasGridCell(enemy)) return;
    const kind = incidentRiseKind(env2), run = kind ? env2.deps.actExplorationState.current(env2.owner) : null;
    const host = run ? run.packs.find((row) => row.key === enemy.explorationPack && row.stage === null && !row.objectId) : null;
    if (!host) return;
    incidentJoinFight(env2, host, incidentMakeCritter(env2, zone, { gx: enemy.gx, gy: enemy.gy }, kind !== "gold"));
    if (kind !== "lucky") return;
    yield* incidentTell(env2.deps._t("이번 루프의 {kill}번째 처치입니다.", { kill: incidentRule(env2).lucky.kill.toLocaleString(env2.deps.i18n.locale) }), "chase", true);
    yield* incidentNote(env2, "luckyKill");
  }
  function incidentRiseKind(env2) {
    if (Math.floor(Number(env2.owner.loopKills) || 0) + 1 === incidentRule(env2).lucky.kill) return "lucky";
    const touch = incidentWorn(env2, "goldenTouch");
    if (!touch || Math.random() >= touch.chance) return "";
    return Math.random() < incidentRule(env2).critter.rainbow.chance * incidentOften(env2) ? "rainbow" : "gold";
  }
  function incidentGrantCritterRewards(env2, enemy, zone) {
    const R = incidentRule(env2).critter.rewards, total = R.currencies.reduce((sum, row) => sum + row[2], 0), lure = incidentWorn(env2, "critterLure"), mul = lure ? lure.rewardMul : 1;
    for (let i = 0; i < R.picks; i++) {
      let edge = Math.random() * total;
      const row = R.currencies.find(([, , weight]) => (edge -= weight) < 0) || R.currencies[0];
      env2.deps.keepCurrencyDrop(enemy, row[0], row[1] * mul);
    }
    env2.deps.grantEquipmentPick(enemy, zone, R.gear, null);
  }
  function incidentGrantRainbowRewards(env2, enemy, zone) {
    const R = incidentRule(env2).critter.rainbow, chase = Math.random() < R.chaseShare;
    const names = chase ? env2.deps.UNIQUE_DB.filter((row) => row.ultraRare && !row.dropOnly).map((row) => row.name) : [];
    env2.deps.keepCurrencyDrop(enemy, R.currency, 1);
    const itemLevel = env2.deps.levelProgression.itemLevel(zone, enemy), cap = Math.min(env2.deps.getRealmEquipmentHiddenTierCap(zone), env2.deps.levelProgression.maxDropTier(itemLevel));
    const item = env2.deps.levelProgression.stampItem(env2.deps.generateUniqueItem(cap, null, names.length ? env2.deps.rndChoice(names) : null, zone), itemLevel);
    if (item) env2.deps.keepEquipmentDrop(enemy, item, { guaranteedKeep: true });
  }

  // modules/combat/incident-lucky-damage.mjs
  function incidentLuckyHit(env2, dealt) {
    const text = String(dealt), digit = text[0];
    if (text[text.length - 1] !== digit || ![...text].every((ch) => ch === digit)) return null;
    const luck = incidentWorn(env2, "repdigitLuck");
    return luck || digit === "7" && dealt >= incidentRule(env2).lucky.min ? { digit, length: text.length, mul: luck ? luck.rewardMul : 1 } : null;
  }
  function* incidentNoteDamage(env2, enemy, dealt) {
    if (!(dealt >= 111) || env2.owner.isBackgroundCalculation) return;
    const hit = incidentLuckyHit(env2, dealt), now = env2.deps.getCombatTime();
    if (!hit || now - env2.runtime.luckyAt < incidentRule(env2).lucky.gapMs || incidentQuiet(env2, env2.deps.getZone(env2.owner.currentZoneId))) return;
    env2.runtime.luckyAt = now;
    const rows = incidentRule(env2).lucky.rewards, [key, count] = rows[Math.min(rows.length - 1, hit.length - 3)];
    incidentReceipt(env2, () => env2.deps.keepCurrencyDrop(enemy, key, count * hit.mul));
    yield* incidentTell(env2.deps._t("행운의 숫자 {number}{particle} 나왔습니다.", { number: dealt.toLocaleString(env2.deps.i18n.locale), particle: env2.deps.pickParticle(String(hit.digit), "이", "가") }), "reward");
    yield* incidentNote(env2, "lucky");
  }

  // modules/combat/incident-preview.mjs
  function incidentTestSpawn(env2, rainbow = false) {
    const zone = env2.deps.getZone(env2.owner.currentZoneId), run = env2.deps.actExplorationState.current(env2.owner), hero = env2.owner.gridPlayer;
    const live = (env2.owner.enemies || []).find((enemy) => enemy && enemy.hp > 0 && enemy.explorationPack);
    const host = live && run ? run.packs.find((row) => row.key === live.explorationPack) : null;
    const taken = new Set((env2.owner.enemies || []).map((enemy) => env2.deps.gridCellKey(enemy.gx, enemy.gy)).concat(env2.deps.gridCellKey(hero.gx, hero.gy)));
    const cell = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1]].map(([dx, dy]) => ({ gx: hero.gx + dx, gy: hero.gy + dy })).find((c) => !taken.has(env2.deps.gridCellKey(c.gx, c.gy)) && env2.deps.canPlaceGridFootprint(taken, c.gx, c.gy, { columns: 1, rows: 1 }));
    if (!host || !cell) return false;
    incidentJoinFight(env2, host, incidentMakeCritter(env2, zone, cell, rainbow));
    return true;
  }
  function incidentTestStray(env2) {
    const enemy = (env2.owner.enemies || []).find((row) => row && row.hp > 0 && !row.critter && !row.stray && incidentStrayable(env2, row));
    const look = enemy ? incidentStrayLook(env2, env2.deps.getZone(env2.owner.currentZoneId), `test:${enemy.id}`) : null;
    return look ? incidentDressStray(env2, enemy, look) : false;
  }
  function incidentTestSleep(env2) {
    const here = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !enemy.isBoss && !enemy.critter && !enemy.asleep);
    here.forEach((enemy) => {
      incidentLull(env2, enemy).hp = enemy.maxHp;
    });
    return here.length > 0;
  }
  function* incidentTestFeast(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner), here = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !enemy.isBoss);
    return !!run && (yield* incidentFeast(env2, run, here, `test:${env2.deps.getCombatTime()}`));
  }
  function* incidentTestYawn(env2) {
    const here = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !enemy.isBoss);
    if (here.length) yield* incidentYawn(env2, here, env2.deps.getCombatTime());
    return here.length > 0;
  }
  function* incidentTestShower(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner), room = run && env2.deps.actExplorationDoors.stageMap(run) ? env2.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentStarShower(env2, run, room, `test:${env2.deps.getCombatTime()}`, env2.deps.getCombatTime()));
  }
  function* incidentTestStar(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner), room = run && env2.deps.actExplorationDoors.stageMap(run) ? env2.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentDropStar(env2, run, room, `test:${env2.deps.getCombatTime()}`, { now: env2.deps.getCombatTime(), forced: true }));
  }
  function* incidentTestBreath(env2) {
    const now = env2.deps.getCombatTime();
    return yield* incidentBreathe(env2, `test:${now}`, now, true);
  }
  function* incidentTestChallenge(env2) {
    const run = env2.deps.actExplorationState.current(env2.owner), room = run && env2.deps.actExplorationDoors.stageMap(run) ? env2.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentOpenChallenge(env2, run, room, `test:${env2.deps.getCombatTime()}`, { now: env2.deps.getCombatTime(), forced: true }));
  }

  // modules/combat/incident-state.mjs
  function createIncidentState() {
    return { luckyAt: -Infinity, stars: [], challenge: null };
  }

  // modules/combat-incidents-classic.mjs
  var deps = {
    get ACT_EXPLORATION_INCIDENTS() {
      return ACT_EXPLORATION_INCIDENTS;
    },
    get hashSeed() {
      return hashSeed;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get recordIncident() {
      return recordIncident;
    },
    get _t() {
      return _t;
    },
    get colonyWards() {
      return colonyWards;
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get createEnemy() {
      return createEnemy;
    },
    get gridChebyshevDist() {
      return gridChebyshevDist;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get advanceGridUnitMovement() {
      return advanceGridUnitMovement;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get performance() {
      return performance;
    },
    get ACT_MONSTER_VISUAL_BY_ID() {
      return ACT_MONSTER_VISUAL_BY_ID;
    },
    get getActMonsterPool() {
      return getActMonsterPool;
    },
    get MAP_ZONES() {
      return MAP_ZONES;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get getZone() {
      return getZone;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get contentProgression() {
      return contentProgression;
    },
    get keepCurrencyDrop() {
      return keepCurrencyDrop;
    },
    get rndChoice() {
      return rndChoice;
    },
    get grantEquipmentPick() {
      return grantEquipmentPick;
    },
    get i18n() {
      return i18n;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getRealmEquipmentHiddenTierCap() {
      return getRealmEquipmentHiddenTierCap;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get keepEquipmentDrop() {
      return keepEquipmentDrop;
    },
    get pickParticle() {
      return pickParticle;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    }
  };
  var env = { get owner() {
    return game;
  }, deps, runtime: createIncidentState() };
  var effects = { get dispatchRuntimeEvent() {
    return dispatchRuntimeEvent;
  }, get addBattleFx() {
    return addBattleFx;
  } };
  function runIncidentCommands(commands) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }
  var combatIncidents = Object.freeze({
    dressPacks(zone, map, packs) {
      return incidentDressPacks(env, zone, map, packs);
    },
    glazeOf(enemy) {
      return incidentGlazeOf(env, enemy);
    },
    tick() {
      return runIncidentCommands(incidentTick(env));
    },
    onKill(enemy, zone) {
      return runIncidentCommands(incidentOnKill(env, enemy, zone));
    },
    noteDamage(enemy, dealt) {
      return runIncidentCommands(incidentNoteDamage(env, enemy, dealt));
    },
    testSpawn(rainbow = false) {
      return incidentTestSpawn(env, rainbow);
    },
    testYawn() {
      return runIncidentCommands(incidentTestYawn(env));
    },
    testSleep() {
      return incidentTestSleep(env);
    },
    testFeast() {
      return runIncidentCommands(incidentTestFeast(env));
    },
    testStray() {
      return incidentTestStray(env);
    },
    testStar() {
      return runIncidentCommands(incidentTestStar(env));
    },
    testChallenge() {
      return runIncidentCommands(incidentTestChallenge(env));
    },
    testBreath() {
      return runIncidentCommands(incidentTestBreath(env));
    },
    testShower() {
      return runIncidentCommands(incidentTestShower(env));
    },
    breathKind(breath) {
      return incidentBreathKind(env, breath);
    },
    breathStats(breath) {
      return incidentBreathStats(env, breath);
    }
  });
  safeExposeGlobals({ combatIncidents });
})();
