// GENERATED from modules/atlas*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-graph.mjs
  function atlasCoreLateNode(row, kind, name) {
    return Object.freeze({
      id: row.id,
      kind,
      region: null,
      regionIndex: -1,
      slot: -1,
      name,
      tier: row.tier,
      boss: row.stages[0].name || row.boss,
      arena: true,
      act: row.act,
      bossAct: row.bossAct,
      ele: row.ele,
      rules: Object.freeze({ stages: row.stages.length, hpMul: row.hpMul, damageMul: row.damageMul })
    });
  }
  function atlasCorePosition(env, node) {
    const point = node.kind === "pinnacle" ? [50, 50] : node.kind === "guardian" ? env.deps.ATLAS.lore.guardian : env.deps.ATLAS.lore.points[node.slot];
    return { x: point[0], y: point[1] };
  }
  function atlasCoreEffectiveTier(env, state, node) {
    return Math.min(env.deps.ATLAS.tierCap, node.tier + state.atlas.seeds * env.deps.ATLAS.seeds.tierStep);
  }
  function atlasCoreHasTickets(env, state) {
    return env.deps.ATLAS.pinnacle.tickets.every((key) => (state.currencies[key] || 0) >= 1);
  }
  function atlasCoreCompleted(state, id) {
    return state.atlas.completed.includes(id);
  }
  function atlasCoreStatus(env, state, id) {
    if (state.atlas.bonus.includes(id)) return "bonus";
    if (atlasCoreCompleted(state, id)) return "complete";
    const node = env.BY_ID.get(id);
    if (node && node.kind === "pinnacle") return atlasCoreHasTickets(env, state) ? "open" : "locked";
    return node && (env.deps.ATLAS.lore.entryNodes.includes(id) || (env.NEIGHBOURS.get(id) || []).some((other) => atlasCoreCompleted(state, other))) ? "open" : "locked";
  }
  function atlasCoreReachable(env, state, id) {
    return atlasCoreStatus(env, state, id) !== "locked";
  }
  function atlasCorePoints(env, state) {
    return state.atlas.completed.length + state.atlas.bonus.length + env.deps.atlasEpoch.points(state);
  }
  function atlasCoreBestTier(env, state) {
    return Math.max(0, ...state.atlas.completed.map((id) => env.BY_ID.get(id)).filter((node) => env.NODES.includes(node)).map((node) => atlasCoreEffectiveTier(env, state, node)));
  }

  // modules/domain/atlas-bonuses.mjs
  function atlasCoreZERO(env) {
    return Object.fromEntries([...env.deps.atlasPassives.effectKeys].map((key) => [key, 0]));
  }
  function atlasCoreFragmentEffects(env, ids) {
    return ids.map((id) => env.FRAGMENTS.get(id).effect).filter(Boolean);
  }
  function atlasCoreBonusOf(env, state, fragmentIds = []) {
    return { ...atlasCoreZERO(env), ...env.deps.atlasPassives.sum(state.atlas.passives, [...atlasCoreFragmentEffects(env, fragmentIds), ...env.deps.atlasEpoch.effects(state)]) };
  }
  function atlasCoreSlots(env, state) {
    return env.deps.ATLAS.fragmentRules.slots + atlasCoreBonusOf(env, state).slots;
  }
  function atlasCoreNormalizeBonus(env, raw) {
    const bonus = atlasCoreZERO(env);
    for (const key of Object.keys(bonus)) {
      const value = Number(raw && raw[key]);
      bonus[key] = Number.isFinite(value) ? Math.max(0, Math.min(1e3, value)) : 0;
    }
    return bonus;
  }

  // modules/domain/atlas-restore-values.mjs
  function atlasCoreFragmentIds(env, value, limit) {
    return (Array.isArray(value) ? value : []).filter((id) => env.FRAGMENTS.has(id)).slice(0, limit);
  }
  function atlasCoreRoomIds(value) {
    return [...new Set(Array.isArray(value) ? value : [])].filter((id) => typeof id === "string" && id.length <= 64).slice(0, 100);
  }
  function atlasCoreRoomTypes(env, value) {
    return [...new Set(Array.isArray(value) ? value : [])].filter((type) => Object.hasOwn(env.deps.ATLAS.encounters, type));
  }
  function atlasCoreNormalizeRun(env, raw, validMap) {
    const map = raw && validMap(raw.map);
    if (!map) return null;
    const bonus = atlasCoreNormalizeBonus(env, raw.bonus), portals = Math.floor(Number(raw.portals));
    return {
      map,
      portals: portals >= 1 && portals <= env.deps.ATLAS.portals + bonus.portals ? portals : 1,
      drops: (Array.isArray(raw.drops) ? raw.drops : []).map(validMap).filter(Boolean).slice(0, env.deps.ATLAS.stashCap),
      found: atlasCoreFragmentIds(env, raw.found, env.deps.ATLAS.fragmentRules.held),
      fragments: atlasCoreFragmentIds(env, raw.fragments, env.deps.ATLAS.fragments.length),
      spent: atlasCoreFragmentIds(env, raw.spent, env.deps.ATLAS.fragments.length),
      cleared: atlasCoreRoomIds(raw.cleared),
      bonus,
      encounters: atlasCoreRoomTypes(env, raw.encounters),
      golden: atlasCoreRoomTypes(env, raw.golden),
      returnZoneId: Number.isInteger(raw.returnZoneId) && raw.returnZoneId >= 0 ? raw.returnZoneId : null,
      endgame: env.deps.atlasEndgame.normalizeRun(raw.endgame),
      objects: env.deps.actExplorationState.objects.restoreAtlas(raw.objects)
    };
  }
  function atlasCoreNormalizeMemory(env, raw) {
    return typeof env.deps.memoryDungeon === "object" ? env.deps.memoryDungeon.normalize(raw) : { tickets: {}, best: {}, variants: {} };
  }
  function atlasCoreNormalizeFragments(env, raw) {
    const counts = {};
    for (const id of env.FRAGMENTS.keys()) {
      const value = Math.floor(Number(raw && raw[id]));
      if (value > 0) counts[id] = Math.min(env.deps.ATLAS.fragmentRules.cap, value);
    }
    return counts;
  }
  function atlasCoreNodeList(env, value, allowed) {
    return [...new Set(Array.isArray(value) ? value : [])].filter((id) => env.BY_ID.has(id) && allowed(id));
  }
  function atlasCoreFnv1a(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function atlasCoreRenamedId(text, table) {
    return typeof text === "string" && text.length <= 32 ? table[atlasCoreFnv1a(text)] : void 0;
  }
  function atlasCoreRenameSavedIds(env, root, table = env.deps.ATLAS.renamed) {
    const seen = /* @__PURE__ */ new WeakSet(), stack = [root];
    while (stack.length) {
      const value = stack.pop();
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      for (const key of Object.keys(value)) atlasCoreRenameSavedEntry(value, key, table, stack);
    }
  }
  function atlasCoreRenameSavedEntry(value, key, table, stack) {
    const fresh = atlasCoreRenamedId(value[key], table);
    if (fresh) value[key] = fresh;
    else stack.push(value[key]);
    const freshKey = !Array.isArray(value) && atlasCoreRenamedId(key, table);
    if (freshKey && !Object.hasOwn(value, freshKey)) {
      value[freshKey] = value[key];
      delete value[key];
    }
  }

  // modules/domain/atlas-receipts.mjs
  function atlasCoreNormalizeTally(raw) {
    const count = (key) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(raw && raw[key]) || 0)));
    return { maps: count("maps"), treasure: count("treasure"), golden: count("golden") };
  }
  function atlasCoreNormalizeLoot(env, raw) {
    if (!raw || typeof raw !== "object") return null;
    const currencies = {};
    for (const [key, value] of Object.entries(raw.currencies || {})) {
      const amount = Math.floor(Number(value));
      if (Object.hasOwn(env.deps.ORB_DB, key) && amount > 0) currencies[key] = Math.min(Number.MAX_SAFE_INTEGER, amount);
    }
    return {
      currencies,
      equipmentCount: Math.max(0, Math.min(1e6, Math.floor(Number(raw.equipmentCount) || 0))),
      items: env.deps.combatLootReceipts.cleanItems(raw.items),
      leaves: env.deps.combatLootReceipts.cleanLeaves(raw.leaves),
      yarns: env.deps.combatLootReceipts.cleanYarns(raw.yarns)
    };
  }
  function atlasCoreNormalizeResultMaterials(env, raw, cap) {
    return (Array.isArray(raw) ? raw : []).filter((row) => Array.isArray(row) && Object.hasOwn(env.deps.ATLAS_ENDGAME.items, row[0]) && Number.isFinite(row[1]) && row[1] > 0).slice(0, Object.keys(env.deps.ATLAS_ENDGAME.items).length).map(([id, amount]) => [id, Math.min(cap, Math.floor(amount))]);
  }
  function atlasCoreNormalizeResultEndgame(env, raw) {
    if (!raw || typeof raw !== "object") return null;
    const count = (value) => Math.max(0, Math.min(env.deps.ATLAS_ENDGAME.itemCap, Math.floor(Number(value) || 0)));
    return { items: atlasCoreNormalizeResultMaterials(env, raw.items, env.deps.ATLAS_ENDGAME.itemCap), invite: count(raw.invite), awakened: raw.awakened === true };
  }
  function atlasCoreNormalizeResultMemoryTicket(env, raw) {
    if (!raw || !env.BY_ID.has(raw.node) || !env.deps.memoryDungeon.validTier(raw.tier)) return null;
    return { node: raw.node, tier: raw.tier };
  }
  function atlasCoreCompletedMemoryResult(env, map, settled) {
    return atlasCoreNormalizeResultMemory(env, { foughtTier: map.memory, newBest: settled.spoils?.best, ticket: settled.ticket }, false);
  }
  function atlasCoreNormalizeResultMemory(env, raw, failed) {
    if (!raw || typeof raw !== "object") return null;
    const foughtTier = env.deps.memoryDungeon.validTier(raw.foughtTier) ? raw.foughtTier : 0;
    const ticket = failed ? null : atlasCoreNormalizeResultMemoryTicket(env, raw.ticket);
    if (!foughtTier && !ticket) return null;
    return { foughtTier, newBest: !failed && foughtTier > 0 && raw.newBest === true, ticket };
  }
  function atlasCoreNormalizeResult(env, raw) {
    if (!raw || !env.BY_ID.has(raw.nodeId) || !["complete", "failed"].includes(raw.outcome)) return null;
    const count = (value) => Math.max(0, Math.min(env.deps.ATLAS.stashCap, Math.floor(Number(value) || 0)));
    const failed = raw.outcome === "failed";
    return {
      nodeId: raw.nodeId,
      tier: Math.max(1, Math.min(env.deps.ATLAS.tierCap, Math.floor(Number(raw.tier) || 1))),
      outcome: raw.outcome,
      first: raw.first === true,
      bonus: raw.bonus === true,
      drops: count(raw.drops),
      lost: count(raw.lost),
      fragments: count(raw.fragments),
      lostFragments: Math.min(env.deps.ATLAS.fragmentRules.held, count(raw.lostFragments)),
      lostMaterials: failed ? atlasCoreNormalizeResultMaterials(env, raw.lostMaterials, env.deps.ATLAS_ENDGAME.itemCap * 10) : [],
      seed: !failed && raw.seed === true,
      seeds: Math.min(env.deps.ATLAS.seeds.max, count(raw.seeds)),
      endgame: failed ? null : atlasCoreNormalizeResultEndgame(env, raw.endgame),
      loot: atlasCoreNormalizeLoot(env, raw.loot),
      memory: atlasCoreNormalizeResultMemory(env, raw.memory, failed)
    };
  }

  // modules/domain/atlas-state.mjs
  function atlasCoreDefaults(env) {
    return {
      version: 1,
      unlocked: false,
      completed: [],
      bonus: [],
      passives: [],
      seeds: 0,
      stash: [],
      fragments: {},
      loadout: [],
      nextUid: 1,
      run: null,
      lastResult: null,
      autoMap: false,
      autoGuardians: true,
      starterSeason: 0,
      epoch: { count: 0, essence: 0, perks: {} },
      endgame: env.deps.atlasEndgame.defaults(),
      memory: { tickets: {}, best: {}, variants: {} },
      leaves: env.deps.memoryLeaves.defaults(),
      board: env.deps.atlasBoard.defaults(),
      tally: atlasCoreNormalizeTally(null)
    };
  }

  // modules/domain/atlas-access.mjs
  function atlasCoreOpensNow(env, state) {
    return state.atlas.unlocked || Math.floor(state.season || 1) >= env.deps.ATLAS.unlockLoop && env.deps.hasCurrentLoopChaos20Clear(state);
  }
  function atlasCoreLockReason(env, state) {
    if (!atlasCoreOpensNow(env, state)) return env.deps._t("루프 {loop}부터 혼돈 20을 클리어하면 세계수 아틀라스가 열립니다.", { loop: env.deps.ATLAS.unlockLoop });
    if (!env.deps.hasCurrentLoopChaos20Clear(state)) return env.deps._t("이번 루프에서 혼돈 20을 클리어해야 지도를 열 수 있습니다.");
    return "";
  }
  function atlasCoreRunOpenReason(state) {
    return state.atlas.run ? "열린 지도를 먼저 마치거나 닫으세요." : "";
  }
  function atlasCoreBeginReason(env, state, uid) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    return state.atlas.stash.some((map) => map.uid === uid) ? "" : "보관함에 없는 지도석입니다.";
  }
  function atlasCorePinnacleReason(env, state) {
    const reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    return atlasCoreHasTickets(env, state) ? "" : "뿌리 입장권 4종(화염, 냉기, 번개, 카오스)이 하나씩 필요합니다. 지역 수호자가 떨어뜨립니다.";
  }

  // modules/domain/atlas-map-drops.mjs
  function atlasCoreNodeForTier(env, state, tier, random) {
    const open = env.MAP_NODES.filter((node) => atlasCoreReachable(env, state, node.id));
    if (!open.length) return null;
    const tiers = open.map((node) => atlasCoreEffectiveTier(env, state, node)), wanted = Math.min(env.deps.ATLAS.tierCap, Math.max(1, tier));
    const below = tiers.filter((t) => t <= wanted), target = below.length ? Math.max(...below) : Math.min(...tiers);
    const pool = open.filter((node, i) => tiers[i] === target);
    return pool[Math.floor(random() * pool.length)];
  }
  function atlasCoreRollMap(env, state, tier, random, bonus) {
    const node = atlasCoreNodeForTier(env, state, tier, random);
    if (!node) return null;
    const drops = env.deps.ATLAS.drops, roll = random(), better = 1 + bonus.mapRarity / 100;
    const rarity = roll < drops.rare * better ? "rare" : roll < (drops.rare + drops.magic) * better ? "magic" : "normal";
    return atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), rarity, random), random, bonus);
  }
  function atlasCoreStamp(env, state, map, random, bonus) {
    if (random() < env.deps.ATLAS.drops.qualityChance + bonus.mapQuality / 100) map.quality = 1 + Math.floor(random() * env.deps.ATLAS.drops.quality);
    if (env.BY_ID.get(map.node)?.kind === "map") map.omen = env.deps.lootOmens.roll(state, random);
    map.uid = state.atlas.nextUid++;
    return map;
  }
  function atlasCoreGuardianDrop(env, state, map, random, bonus) {
    const node = env.BY_ID.get(map.node), guardian = env.BY_ID.get(`${node.region}_g`), rules2 = env.deps.ATLAS.guardianRules;
    if (node.kind !== "map" || map.tier < rules2.minTier || !atlasCoreReachable(env, state, guardian.id)) return [];
    if (random() >= rules2.dropChance * (1 + bonus.bossMap / 100)) return [];
    return [atlasCoreStamp(env, state, env.deps.atlasMaps.create(guardian.id, atlasCoreEffectiveTier(env, state, guardian), "normal", random), random, bonus)];
  }
  function atlasCorePreferredDrops(env, state, maps, room) {
    if (room <= 0) return [];
    if (maps.length <= room) return maps.slice();
    const priority = (map) => env.BY_ID.get(map.node)?.kind === "guardian" ? Number(atlasCoreCompleted(state, map.node)) : 2;
    return [...maps].sort((a, b) => priority(a) - priority(b)).slice(0, room);
  }

  // modules/domain/atlas-inventory.mjs
  function atlasCoreStore(env, state, maps) {
    const room = Math.max(0, env.deps.ATLAS.stashCap - state.atlas.stash.length);
    state.atlas.stash.push(...atlasCorePreferredDrops(env, state, maps, room));
    return Math.min(room, maps.length);
  }
  function atlasCoreAddFragments(env, state, ids) {
    let stored = 0;
    for (const id of ids) {
      const before = state.atlas.fragments[id] || 0;
      state.atlas.fragments[id] = Math.min(env.deps.ATLAS.fragmentRules.cap, before + 1);
      stored += state.atlas.fragments[id] - before;
    }
    return stored;
  }
  function atlasCoreDiscard(state, uid) {
    const reason = atlasCoreRunOpenReason(state);
    if (reason) return reason;
    const index = state.atlas.stash.findIndex((map) => map.uid === uid);
    if (index < 0) return "보관함에 없는 지도석입니다.";
    state.atlas.stash.splice(index, 1);
    return "";
  }
  function atlasCoreIsMapStone(env, map) {
    return env.BY_ID.get(map && map.node)?.kind === "map";
  }
  function atlasCorePlainMap(env, map) {
    return atlasCoreIsMapStone(env, map) && map.rarity === "normal" && !map.quality && !map.corrupted;
  }
  function atlasCoreDiscardPlainUpTo(env, state, tier) {
    if (atlasCoreRunOpenReason(state)) return 0;
    const before = state.atlas.stash.length;
    state.atlas.stash = state.atlas.stash.filter((map) => !(atlasCorePlainMap(env, map) && map.tier <= tier));
    return before - state.atlas.stash.length;
  }

  // modules/domain/atlas-unlock.mjs
  function atlasCoreSync(env, state, random = Math.random) {
    if (!env.deps.hasCurrentLoopChaos20Clear(state) || !atlasCoreOpensNow(env, state)) return [];
    state.atlas.unlocked = true;
    const season = Math.max(1, Math.floor(state.season || 1));
    if (state.atlas.starterSeason === season) return [];
    state.atlas.starterSeason = season;
    const bonus = atlasCoreBonusOf(env, state), tier = Math.max(1, atlasCoreBestTier(env, state) - env.deps.ATLAS.starter.belowBest);
    const maps = Array.from({ length: env.deps.ATLAS.starter.count + bonus.starter }, () => atlasCoreRollMap(env, state, tier, random, bonus)).filter(Boolean);
    atlasCoreStore(env, state, maps);
    return maps;
  }

  // modules/domain/atlas-loadout.mjs
  function atlasCoreSetLoadout(env, state, ids) {
    state.atlas.loadout = [...new Set(ids)].filter((id) => env.FRAGMENTS.has(id)).slice(0, atlasCoreSlots(env, state));
  }
  function atlasCoreActiveFragments(env, state, rooms = Infinity) {
    let free = rooms;
    return state.atlas.loadout.slice(0, atlasCoreSlots(env, state)).filter((id) => (state.atlas.fragments[id] || 0) > 0 && (!env.FRAGMENTS.get(id).encounter || free-- > 0));
  }
  function atlasCoreUseFragments(env, state, rooms, random) {
    const keep = atlasCoreBonusOf(env, state).fragmentKeep / 100, used = atlasCoreActiveFragments(env, state, rooms), spent = [];
    for (const id of used) {
      if (random() < keep) continue;
      state.atlas.fragments[id] -= 1;
      spent.push(id);
    }
    return { used, spent };
  }

  // modules/domain/atlas-zone.mjs
  function atlasCoreEquivalentDepth(env, tier) {
    return env.deps.ATLAS.difficulty.baseDepth + (tier - 1) * env.deps.ATLAS.difficulty.depthPerTier;
  }
  function atlasCoreZone(env, state) {
    const run = state.atlas && state.atlas.run;
    if (!run) return null;
    if (!env.zones.has(run)) env.zones.set(run, atlasCoreBuildZone(env, run));
    return env.zones.get(run);
  }
  function atlasCoreRulesOf(env, node) {
    return node.rules || env.BOSS_RULES[node.kind];
  }
  function atlasCoreExplorationSpec(env, map) {
    const node = env.BY_ID.get(map.node), spec = { style: "act", act: node.act, seed: `atlas:${map.uid}`, bossStages: atlasCoreRulesOf(env, node).stages };
    return node.arena || map.memory ? { ...spec, arena: true } : spec;
  }
  function atlasCoreEncounterRooms(env, map) {
    return env.deps.atlasEncounters.hostRooms(env.deps.actExplorationMap.forRun({ source: atlasCoreExplorationSpec(env, map) })).length;
  }
  function atlasCoreChestRules(bonus) {
    return { grade: Number(bonus.chestGrade) || 0, extra: Number(bonus.chestExtra) || 0, min: Number(bonus.chestMinGrade) > 0 ? 1 : 0 };
  }
  function atlasCoreBuildZone(env, run) {
    const { map, bonus } = run, node = env.BY_ID.get(map.node), fx = env.deps.atlasMaps.effects(map), depth = atlasCoreEquivalentDepth(env, map.tier);
    const more = (key) => 1 + bonus[key] / 100, boss = atlasCoreRulesOf(env, node), boost = env.deps.atlasEndgame.bossBoost(run), memory = env.deps.memoryDungeon.boost(map);
    return {
      id: env.deps.ATLAS.zoneId,
      name: env.deps.memoryDungeon.zoneName(map, node),
      type: "atlasMap",
      tier: env.deps.getAbyssZoneTier(depth),
      maxKills: 1,
      ele: node.ele,
      areaLevel: env.deps.ATLAS.areaLevel.base + (map.tier - 1) * env.deps.ATLAS.areaLevel.perTier,
      // 루프 인플레이션 대신 등급이 정한 고정 루프 · 깊이 (combat getLoopDifficultyInputs · state getAbyssMonsterScales).
      fixedSeason: depth - env.deps.ATLAS.difficulty.loopBehindDepth,
      equivalentDepth: depth,
      equivalentChaosDepth: depth,
      mapHpMul: fx.hp * more("monsterLife"),
      mapDamageMul: fx.damage * more("monsterDamage"),
      bossMods: {
        hpMul: fx.bossHp * more("bossLife") * boss.hpMul * boost.hp * memory.hp,
        damageMul: fx.bossDamage * more("bossLife") * boss.damageMul * boost.damage * memory.damage
      },
      // 불타는 땅: 불길 웅덩이(옵션 문구 그대로 불 원소로 터진다).
      ...fx.hazard ? { trialHazard: { ...env.deps.ATLAS.burningGround, persistent: true }, trapElements: fx.groundElements } : {},
      atlasNode: node.id,
      atlasRegion: node.region,
      atlasTier: map.tier,
      atlasMapRarity: map.rarity,
      atlasEnemyMods: fx.enemy,
      atlasEncounters: run.encounters,
      // 황금 방(data/atlas.js goldenRoom)과 보급 상자 규칙(열매 갈래의 황금 수확, 보급 각인).
      atlasGolden: run.golden,
      atlasChest: atlasCoreChestRules(bonus),
      atlasLootQuantity: fx.quantity + bonus.quantity,
      atlasLootRarity: fx.rarity + bonus.rarity,
      atlasBossRarity: bonus.bossRarity,
      packExtra: fx.packExtra + bonus.packSize,
      atlasExtraElite: fx.extraElite + bonus.extraElite / 100,
      atlasSeed: map.uid,
      bossName: node.boss,
      bossAct: node.bossAct,
      bossVisualId: run.board ? null : node.bossVisualId,
      atlasCleared: run.cleared,
      atlasKind: node.kind,
      memoryTier: map.memory || 0,
      exploration: atlasCoreExplorationSpec(env, map),
      ...env.deps.atlasEndgame.zoneExtras(run, node),
      ...env.deps.lootOmens.zoneFields(map),
      ...run.board ? {
        name: `${env.deps.ATLAS_BOARD.text.title}: ${run.board.name}`,
        boardBoss: run.board.boss,
        bossName: run.board.boss ? env.deps.ATLAS_BOARD.text.boss.name : node.boss,
        mapHpMul: 1 + run.board.risk * 0.12,
        mapDamageMul: 1 + run.board.risk * 0.05,
        atlasLootQuantity: 0,
        atlasLootRarity: 0
      } : {}
    };
  }
  function atlasCorePreview(env, state, map) {
    return atlasCoreBuildZone(env, { map, bonus: atlasCoreBonusOf(env, state, atlasCoreActiveFragments(env, state)), encounters: [], golden: [] });
  }
  function atlasCoreLootTier(tier) {
    return Math.min(20, 14 + Math.ceil(tier / 3));
  }

  // modules/domain/atlas-entry.mjs
  function atlasCoreBegin(env, state, uid, returnZoneId, random = Math.random) {
    const reason = atlasCoreBeginReason(env, state, uid);
    if (reason) return reason;
    const [map] = state.atlas.stash.splice(state.atlas.stash.findIndex((entry) => entry.uid === uid), 1);
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return "";
  }
  function atlasCoreStartRun(env, state, map, returnZoneId, random) {
    const rooms = atlasCoreEncounterRooms(env, map), { used, spent } = atlasCoreUseFragments(env, state, rooms, random), bonus = env.deps.lootOmens.runBonus(atlasCoreBonusOf(env, state, used), map);
    const forced = used.map((id) => env.FRAGMENTS.get(id).encounter).filter(Boolean);
    const encounters = env.deps.atlasEncounters.roll(bonus, forced, random, rooms, {
      awake: env.deps.atlasEndgame.awakened(state),
      loop: state.season,
      region: (env.BY_ID.get(map.node) || {}).region
    });
    state.atlas.run = {
      map,
      portals: env.deps.ATLAS.portals + bonus.portals,
      drops: [],
      found: [],
      fragments: used,
      spent,
      cleared: [],
      bonus,
      encounters,
      golden: env.deps.atlasEncounters.golden(encounters, bonus, map.uid),
      returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null,
      endgame: env.deps.atlasEndgame.runExtra(state, env.BY_ID.get(map.node), random)
    };
  }
  function atlasCoreBeginSpecial(env, state, nodeId, returnZoneId, random = Math.random) {
    const node = env.BY_ID.get(nodeId);
    if (!node || !node.rules) return "없는 싸움입니다.";
    const map = env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), "normal", random);
    map.uid = state.atlas.nextUid++;
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return "";
  }
  function atlasCoreBeginBoard(env, state, returnZoneId) {
    const board = env.deps.atlasBoard.plan(state), reason = atlasCoreLockReason(env, state);
    if (reason) return reason;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    if (!board) return "주사위를 굴려 지도 칸에 도착하세요.";
    const map = env.deps.atlasMaps.create(board.node, board.tier);
    map.uid = state.atlas.nextUid++;
    state.atlas.run = {
      map,
      portals: 1,
      drops: [],
      found: [],
      fragments: [],
      spent: [],
      cleared: [],
      bonus: atlasCoreZERO(env),
      encounters: [],
      golden: [],
      returnZoneId: Number.isInteger(returnZoneId) ? returnZoneId : null,
      endgame: env.deps.atlasEndgame.normalizeRun(null),
      board
    };
    return "";
  }
  function atlasCoreBeginPinnacle(env, state, returnZoneId, random = Math.random) {
    const reason = atlasCorePinnacleReason(env, state);
    if (reason) return reason;
    for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] -= 1;
    const map = env.deps.atlasMaps.create(env.PINNACLE.id, atlasCoreEffectiveTier(env, state, env.PINNACLE), "normal", random);
    map.uid = state.atlas.nextUid++;
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    return "";
  }
  function atlasCoreBeginMemory(env, state, nodeId, tier, ...selection) {
    const [returnZoneId, random = Math.random] = selection;
    const reason = env.deps.memoryDungeon.entryReason(state, nodeId, tier);
    if (reason) return reason;
    env.deps.memoryDungeon.spend(state, nodeId, tier);
    const node = env.BY_ID.get(nodeId), map = env.deps.atlasMaps.create(node.id, env.deps.memoryDungeon.mapTier(state, node, tier), "normal", random);
    Object.assign(map, { uid: state.atlas.nextUid++, memory: tier });
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    state.atlas.run.endgame.apostle = null;
    return "";
  }

  // modules/domain/atlas-combining.mjs
  function atlasCoreTierBand(env, tier) {
    return env.deps.ATLAS.tierBands.find((band) => tier <= band.max);
  }
  function atlasCoreCombineSet(env, state, uid) {
    const picked = state.atlas.stash.find((map) => map.uid === uid);
    if (!picked || !atlasCoreIsMapStone(env, picked)) return null;
    const others = state.atlas.stash.filter((map) => map !== picked && map.tier === picked.tier && atlasCoreIsMapStone(env, map)).sort((a, b) => Number(atlasCorePlainMap(env, b)) - Number(atlasCorePlainMap(env, a)) || a.uid - b.uid).slice(0, env.deps.ATLAS.combine.count - 1);
    return others.length === env.deps.ATLAS.combine.count - 1 ? [picked, ...others] : null;
  }
  function atlasCoreCombineReason(env, state, uid) {
    const busy = atlasCoreRunOpenReason(state), set = atlasCoreCombineSet(env, state, uid), picked = state.atlas.stash.find((map) => map.uid === uid);
    if (busy) return busy;
    if (!picked) return env.deps._t("보관함에 없는 지도석입니다.");
    if (!atlasCoreIsMapStone(env, picked)) return env.deps._t("수호자 지도석은 합칠 수 없습니다.");
    if (picked.tier >= env.deps.ATLAS.tierCap) return env.deps._t("가장 높은 등급이라 합칠 수 없습니다.");
    if (!set) return env.deps._t("{tier}등급 지도석이 {count}개 있어야 합칩니다.", { tier: picked.tier, count: env.deps.ATLAS.combine.count });
    return atlasCoreTierOpen(env, state, picked.tier + 1) ? "" : env.deps._t("{tier}등급 노드가 아직 열리지 않았습니다.", { tier: picked.tier + 1 });
  }
  function atlasCoreTierOpen(env, state, tier) {
    return tier <= env.deps.ATLAS.tierCap && env.MAP_NODES.some((node) => atlasCoreReachable(env, state, node.id) && atlasCoreEffectiveTier(env, state, node) >= tier);
  }
  function atlasCoreForgeUp(env, state, used, random) {
    const tier = used[0].tier + 1, node = atlasCoreNodeForTier(env, state, tier, random);
    const map = atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, tier, "normal", random), random, atlasCoreBonusOf(env, state));
    state.atlas.stash = state.atlas.stash.filter((entry) => !used.includes(entry));
    state.atlas.stash.push(map);
    return map;
  }
  function atlasCoreCombine(env, state, uid, random = Math.random) {
    const reason = atlasCoreCombineReason(env, state, uid);
    if (reason) return { reason };
    const used = atlasCoreCombineSet(env, state, uid);
    return { used, map: atlasCoreForgeUp(env, state, used, random) };
  }
  function atlasCoreBatchable(env, map) {
    return atlasCoreIsMapStone(env, map) && !map.corrupted;
  }
  function atlasCoreBatchRank(map) {
    return map.rarity === "rare" ? 3 : map.rarity === "magic" ? 2 : map.quality ? 1 : 0;
  }
  function atlasCoreTally(counts, tier) {
    counts[tier] = (counts[tier] || 0) + 1;
  }
  function atlasCoreCombineAllPlan(env, state) {
    const plan = { steps: [], used: 0, made: {} }, own = {}, plain = {};
    if (atlasCoreRunOpenReason(state)) return plan;
    for (const map of state.atlas.stash.filter((...args) => atlasCoreBatchable(env, ...args))) {
      atlasCoreTally(own, map.tier);
      if (!atlasCoreBatchRank(map)) atlasCoreTally(plain, map.tier);
    }
    for (let tier = Math.min(...Object.keys(own).map(Number)); tier < env.deps.ATLAS.tierCap; tier++) {
      const sets = Math.floor(((own[tier] || 0) + (plan.made[tier] || 0)) / env.deps.ATLAS.combine.count);
      if (sets && atlasCoreTierOpen(env, state, tier + 1)) atlasCorePlanStep(env, plan, tier, sets, plain);
    }
    plan.made = Object.fromEntries(Object.entries(plan.made).filter(([, count]) => count > 0));
    return plan;
  }
  function atlasCorePlanStep(env, plan, tier, sets, plain) {
    const take = sets * env.deps.ATLAS.combine.count, fresh = plan.made[tier] || 0, fromFresh = Math.min(fresh, Math.max(0, take - (plain[tier] || 0)));
    plan.used += take - fromFresh;
    plan.made[tier] = fresh - fromFresh;
    plan.made[tier + 1] = (plan.made[tier + 1] || 0) + sets;
    plan.steps.push({ tier, sets });
  }
  function atlasCoreCombineAll(env, state, random = Math.random) {
    const count = env.deps.ATLAS.combine.count, fresh = /* @__PURE__ */ new Set(), order = (map) => fresh.has(map) ? 0.5 : atlasCoreBatchRank(map);
    let used = 0;
    for (const { tier, sets } of atlasCoreCombineAllPlan(env, state).steps) {
      const pool = state.atlas.stash.filter((map) => map.tier === tier && atlasCoreBatchable(env, map)).sort((a, b) => order(a) - order(b) || (a.quality || 0) - (b.quality || 0) || a.uid - b.uid);
      for (let at = 0; at < sets; at++) {
        const set = pool.slice(at * count, (at + 1) * count);
        used += set.filter((map) => !fresh.has(map)).length;
        set.forEach((map) => fresh.delete(map));
        fresh.add(atlasCoreForgeUp(env, state, set, random));
      }
    }
    return { used, made: [...fresh] };
  }
  function atlasCoreOmenChangeReason(env, map) {
    if (env.BY_ID.get(map.node)?.kind !== "map") return "지도 노드의 지도석에만 기운이 붙습니다.";
    return map.corrupted ? "타락한 지도석은 더 바꿀 수 없습니다." : "";
  }
  function atlasCoreChangeOmen(env, state, uid, color, ...selection) {
    const [omenId = null, random = Math.random] = selection;
    const map = state.atlas.stash.find((entry) => entry.uid === uid);
    if (!map) return { reason: env.deps._t("보관함에 없는 지도석입니다.") };
    const reason = atlasCoreOmenChangeReason(env, map);
    if (reason) return { reason };
    const open = env.deps.lootOmens.flowerOmens(color, state, map.omen).some((omen) => omen.id === omenId);
    const next = omenId ? open ? omenId : null : env.deps.lootOmens.rollFlowerOmen(color, state, map.omen, random);
    if (!next) return { reason: env.deps._t("이 꽃으로 바꿀 수 있는 기운이 없습니다.") };
    if (!env.deps.stumpBox.payFlower(state, color, !!omenId)) return { reason: env.deps._t("{value}{label} 꽃이 없습니다.", { value: omenId ? env.deps._t("보관함에 황금 ") : "", label: env.deps.STUMP_BOX_COLORS[color].label }) };
    map.omen = next;
    return { omen: next };
  }

  // modules/domain/atlas-boss-rewards.mjs
  function atlasCoreGuardianTicket(env, state, node) {
    if (node.ticket) return node.ticket;
    return env.deps.ATLAS.pinnacle.tickets.reduce((low, key) => (state.currencies[key] || 0) < (state.currencies[low] || 0) ? key : low);
  }
  function atlasCoreBossSpoils(env, state, node) {
    if (node.kind === "guardian") return { ticket: atlasCoreGuardianTicket(env, state, node) };
    if (node.kind !== "pinnacle") return {};
    const seed = state.atlas.seeds < env.deps.ATLAS.seeds.max;
    if (seed) state.atlas.seeds += 1;
    return { seed, seeds: state.atlas.seeds, rewards: env.deps.ATLAS.pinnacle.rewards };
  }

  // modules/domain/atlas-completion.mjs
  function atlasCoreCancel(env, state) {
    const run = state.atlas.run;
    if (!run) return;
    if (run.board) {
      state.atlas.run = null;
      return;
    }
    if (run.map.memory) env.deps.memoryDungeon.refund(state, run.map);
    else if (run.map.node === env.PINNACLE.id) for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] += 1;
    else if (env.deps.atlasEndgame.isFight(run.map.node)) env.deps.atlasEndgame.refund(state, run.map.node);
    else state.atlas.stash.unshift(run.map);
    atlasCoreAddFragments(env, state, run.spent);
    state.atlas.run = null;
  }
  function atlasCoreCompleteBoard(env, state, run) {
    const board = env.deps.atlasBoard.complete(state, run.board);
    if (!board) return null;
    state.atlas.run = null;
    state.atlas.lastResult = {
      nodeId: run.map.node,
      tier: run.map.tier,
      outcome: "complete",
      first: false,
      bonus: false,
      drops: 0,
      lost: 0,
      fragments: 0,
      lostFragments: 0,
      lostMaterials: [],
      memory: null
    };
    return { ...state.atlas.lastResult, board, returnZoneId: run.returnZoneId };
  }
  function atlasCoreComplete(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board) return atlasCoreCompleteBoard(env, state, run);
    const id = run.map.node, recalled = !!run.map.memory, first = !recalled && !atlasCoreCompleted(state, id);
    if (first) state.atlas.completed.push(id);
    const bonus = !recalled && run.map.rarity === "rare" && !state.atlas.bonus.includes(id);
    if (bonus) state.atlas.bonus.push(id);
    const stored = atlasCoreStore(env, state, run.drops), fragments = atlasCoreAddFragments(env, state, run.found);
    state.atlas.run = null;
    state.atlas.tally.maps += 1;
    state.atlas.lastResult = {
      nodeId: id,
      tier: run.map.tier,
      outcome: "complete",
      first,
      bonus,
      drops: stored,
      lost: run.drops.length - stored,
      fragments,
      lostFragments: run.found.length - fragments,
      lostMaterials: []
    };
    const node = env.BY_ID.get(id), memory = env.deps.memoryDungeon.settle(state, node, run.map, Math.random, run.bonus);
    const endgame = recalled ? null : env.deps.atlasEndgame.onComplete(state, node, run);
    const spoils = recalled ? {} : atlasCoreBossSpoils(env, state, node);
    Object.assign(state.atlas.lastResult, {
      seed: spoils.seed === true,
      seeds: state.atlas.seeds,
      endgame: atlasCoreNormalizeResultEndgame(env, endgame),
      memory: atlasCoreCompletedMemoryResult(env, run.map, memory)
    });
    return { ...state.atlas.lastResult, ...spoils, endgame, memory, returnZoneId: run.returnZoneId };
  }
  function atlasCoreMarkCleared(state, roomId) {
    const run = state.atlas.run;
    if (run && !run.cleared.includes(roomId)) run.cleared.push(roomId);
  }
  function atlasCoreKeepLoot(env, state, receipt) {
    if (state.atlas.lastResult && receipt) state.atlas.lastResult.loot = atlasCoreNormalizeLoot(env, receipt);
  }
  function atlasCoreUsePortal(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    run.portals = run.board ? 0 : Math.max(0, run.portals - 1);
    if (run.portals > 0) return { closed: false, portals: run.portals };
    return { closed: true, ...atlasCoreClose(env, state, "failed") };
  }
  function atlasCoreClose(env, state, outcome) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board && outcome === "failed") env.deps.atlasBoard.fail(state, run.board);
    state.atlas.run = null;
    state.atlas.lastResult = {
      nodeId: run.map.node,
      tier: run.map.tier,
      outcome,
      first: false,
      bonus: false,
      drops: 0,
      lost: run.drops.length,
      fragments: 0,
      lostFragments: run.found.length,
      lostMaterials: atlasCoreNormalizeResultMaterials(env, Object.entries(run.endgame.items), env.deps.ATLAS_ENDGAME.itemCap * 10),
      seed: false,
      seeds: state.atlas.seeds,
      endgame: null,
      memory: atlasCoreNormalizeResultMemory(env, { foughtTier: run.map.memory }, true)
    };
    atlasCoreKeepLoot(env, state, state.explorationLoot);
    return { returnZoneId: run.returnZoneId };
  }

  // modules/domain/atlas-auto.mjs
  function atlasCoreNextAuto(env, state, tierCap) {
    if (!state.atlas.autoMap || atlasCoreLockReason(env, state)) return null;
    const score = (map) => [map.tier, Number(!atlasCoreCompleted(state, map.node)), env.RARITY_RANK[map.rarity], -map.uid];
    const better = (a, b) => {
      const x = score(a), y = score(b);
      const i = x.findIndex((v, k) => v !== y[k]);
      return i >= 0 && x[i] > y[i];
    };
    const eligible = (map) => {
      const kind = env.BY_ID.get(map.node)?.kind;
      return map.tier <= tierCap && (kind === "map" || kind === "guardian" && state.atlas.autoGuardians !== false);
    };
    return state.atlas.stash.filter(eligible).reduce((best, map) => !best || better(map, best) ? map : best, null);
  }

  // modules/domain/atlas-kill-drops.mjs
  function atlasCoreIsBoardRun(state) {
    return !!state.atlas.run?.board;
  }
  function atlasCoreDropTier(env, tier, random, bonus) {
    const drops = env.deps.ATLAS.drops, roll = random(), up = drops.tierUp + bonus.mapTierUp / 100;
    if (roll < up) return tier + 1;
    return roll < up + drops.tierSame ? tier : tier - 1 - Math.floor(random() * 3);
  }
  function atlasCoreDropFromKill(env, state, zone, enemy, random = Math.random) {
    if (atlasCoreIsBoardRun(state)) return [];
    if (!zone || !enemy || atlasCoreLockReason(env, state)) return [];
    if (zone.type === "atlasMap" && state.atlas.run) return atlasCoreDropInMap(env, state, zone, enemy, random);
    return atlasCoreDropOutside(env, state, zone, enemy, random);
  }
  function atlasCoreDropOutside(env, state, zone, enemy, random) {
    const drops = env.deps.ATLAS.drops;
    if (zone.type !== "abyss" || !enemy.isBoss || !(zone.depth >= drops.outsideDepth) || random() >= drops.outsideBoss) return [];
    const map = atlasCoreRollMap(env, state, 1 + Math.floor(random() * drops.outsideTier), random, atlasCoreBonusOf(env, state));
    return map && atlasCoreStore(env, state, [map]) ? [map] : [];
  }
  function atlasCoreDropInMap(env, state, zone, enemy, random) {
    const run = state.atlas.run, drops = env.deps.ATLAS.drops, bonus = run.bonus;
    const base = enemy.isBoss ? 1 : enemy.isElite ? drops.elite : drops.regular;
    const chance = base * (1 + zone.atlasLootQuantity / 100) * (1 + bonus.mapDrop / 100);
    const extra = Number(!!enemy.isBoss && random() < drops.bossExtra + bonus.bossMap / 100);
    const count = Math.floor(chance) + Number(random() < chance % 1) + extra;
    const maps = Array.from({ length: count }, () => atlasCoreRollMap(env, state, atlasCoreDropTier(env, run.map.tier, random, bonus), random, bonus)).filter(Boolean);
    if (enemy.isBoss) maps.push(...atlasCoreGuardianDrop(env, state, run.map, random, bonus));
    if (maps.length) run.drops = atlasCorePreferredDrops(env, state, [...run.drops, ...maps], env.deps.ATLAS.stashCap);
    return maps;
  }
  function atlasCoreRewardMaps(env, state, rule, random = Math.random) {
    const bonus = atlasCoreBonusOf(env, state), tier = Math.min(env.deps.ATLAS.tierCap, Math.max(1, atlasCoreBestTier(env, state)) + (rule.tierUp || 0));
    const maps = Array.from({ length: rule.count }, () => {
      const node = atlasCoreNodeForTier(env, state, tier, random);
      return node && atlasCoreStamp(env, state, env.deps.atlasMaps.create(node.id, atlasCoreEffectiveTier(env, state, node), rule.rarity, random), random, bonus);
    }).filter(Boolean);
    return maps.slice(0, atlasCoreStore(env, state, maps));
  }
  function atlasCoreExtraMap(env, state, random = Math.random) {
    const run = state.atlas.run, map = run && atlasCoreRollMap(env, state, run.map.tier, random, run.bonus);
    if (map && run.drops.length < env.deps.ATLAS.stashCap) run.drops.push(map);
    return map ? [map] : [];
  }
  function atlasCoreFragmentOpen(env, fragment, loop, owner) {
    const room = fragment.encounter ? env.deps.ATLAS.encounters[fragment.encounter] : null;
    if (room && room.unlock && !env.deps.contentProgression.holds(room.unlock, owner, Number(loop) || 1)) return false;
    return (Number(loop) || 1) >= Math.max(fragment.minLoop || 0, room && room.minLoop || 0);
  }
  function atlasCoreFragmentFromKill(env, state, zone, enemy, random = Math.random) {
    if (atlasCoreIsBoardRun(state)) return [];
    const run = state.atlas.run, rules2 = env.deps.ATLAS.fragmentRules;
    if (!run || !zone || zone.type !== "atlasMap" || run.found.length >= rules2.held) return [];
    const base = enemy.isBoss ? rules2.boss : enemy.isElite ? rules2.elite : 0;
    if (random() >= base * (1 + run.bonus.fragmentDrop / 100)) return [];
    const pool = env.deps.ATLAS.fragments.filter((fragment) => atlasCoreFragmentOpen(env, fragment, state.season, state));
    const id = pool[Math.floor(random() * pool.length)].id;
    run.found.push(id);
    return [id];
  }

  // modules/domain/atlas-restore.mjs
  function atlasCoreNormalize(env, state) {
    atlasCoreRenameSavedIds(env, [state.atlas, state.actExploration, state.enemies]);
    const raw = state.atlas && typeof state.atlas === "object" ? state.atlas : {};
    env.deps.atlasEndgame.moveAltarMaterials(state, raw.endgame);
    const journeyUnlocked = !!(state.worldTreeJourney && state.worldTreeJourney.unlocked === true);
    delete state.worldTreeJourney;
    const uids = /* @__PURE__ */ new Set(), validMap = (entry) => {
      const map = env.deps.atlasMaps.normalize(entry, (id) => env.BY_ID.has(id));
      if (!map || uids.has(map.uid)) return null;
      uids.add(map.uid);
      return map;
    };
    const done = atlasCoreNodeList(env, raw.completed, () => true), bonus = atlasCoreNodeList(env, raw.bonus, (id) => done.includes(id)), run = atlasCoreNormalizeRun(env, raw.run, validMap);
    const epoch = env.deps.atlasEpoch.normalize(raw.epoch), epochPoints = env.deps.atlasEpoch.points({ atlas: { epoch } });
    const next = {
      ...atlasCoreDefaults(env),
      unlocked: raw.unlocked === true || journeyUnlocked,
      completed: done,
      bonus,
      passives: env.deps.atlasPassives.normalize(raw.passives, done.length + bonus.length + epochPoints),
      epoch,
      stash: (Array.isArray(raw.stash) ? raw.stash : []).map(validMap).filter((map) => map && env.NODES.includes(env.BY_ID.get(map.node)) && map.node !== env.PINNACLE.id).slice(0, env.deps.ATLAS.stashCap),
      fragments: atlasCoreNormalizeFragments(env, raw.fragments),
      run,
      lastResult: atlasCoreNormalizeResult(env, raw.lastResult),
      endgame: env.deps.atlasEndgame.normalize(raw.endgame, done.includes(env.PINNACLE.id)),
      memory: atlasCoreNormalizeMemory(env, raw.memory),
      leaves: env.deps.memoryLeaves.normalize(raw.leaves),
      board: env.deps.atlasBoard.normalize(raw.board),
      tally: atlasCoreNormalizeTally(raw.tally),
      seeds: Math.max(0, Math.min(env.deps.ATLAS.seeds.max, Math.floor(Number(raw.seeds) || 0))),
      autoMap: raw.autoMap === true,
      autoGuardians: raw.autoGuardians !== false,
      starterSeason: Math.max(0, Math.floor(Number(raw.starterSeason) || 0))
    };
    const savedNext = Math.floor(Number(raw.nextUid));
    next.nextUid = Math.min(Number.MAX_SAFE_INTEGER, Math.max(Number.isSafeInteger(savedNext) ? savedNext : 1, ...[...uids].map((uid) => uid + 1), 1));
    state.atlas = next;
    atlasCoreRestoreBoardRun(env, raw, state);
    atlasCoreSetLoadout(env, state, Array.isArray(raw.loadout) ? raw.loadout : []);
    return next;
  }
  function atlasCoreRestoreBoardRun(env, raw, state) {
    const next = state.atlas;
    if (!raw.run?.board || !next.run) return;
    const board = env.deps.atlasBoard.normalizeRun(raw.run.board, state);
    if (board && board.node === next.run.map.node && board.tier === next.run.map.tier) {
      next.run.board = board;
      next.run.portals = 1;
    } else next.run = null;
  }

  // modules/domain/atlas-reset.mjs
  function atlasCoreOnLoopReset(env, state) {
    const run = state.atlas.run;
    if (run && run.map.memory) env.deps.memoryDungeon.refund(state, run.map);
    else if (run && env.deps.atlasEndgame.isFight(run.map.node)) env.deps.atlasEndgame.refund(state, run.map.node);
    Object.assign(state.atlas, { stash: [], fragments: {}, run: null, lastResult: null });
    for (const [key, amount] of env.deps.atlasEpoch.supply(state)) state.currencies[key] = (state.currencies[key] || 0) + amount;
  }
  function atlasCoreTravelReason(env, state, id) {
    return id === env.deps.ATLAS.zoneId && !state.atlas.run ? "지도 장치에서 지도석을 열어야 들어갈 수 있습니다." : "";
  }

  // modules/domain/atlas.mjs
  function createAtlasMapNodes(deps) {
    return deps.ATLAS.regions.flatMap((region, regionIndex) => deps.ATLAS.nodes[region.id].map((row, slot) => Object.freeze({
      id: `${region.id}_${slot}`,
      kind: "map",
      region: region.id,
      regionIndex,
      slot,
      name: row[0],
      tier: row[1],
      boss: row[2],
      act: row[3],
      bossAct: row[4],
      bossVisualId: deps.ATLAS_BOSS_BODIES.includes(`atlas-${region.id}-${slot}`) ? `atlas-${region.id}-${slot}` : null,
      ele: region.ele
    })));
  }
  function createAtlasGuardians(deps) {
    return deps.ATLAS.regions.map((region, regionIndex) => {
      const [name, ticket, bossAct, bossVisualId] = deps.ATLAS.guardians[region.id];
      return Object.freeze({
        id: `${region.id}_g`,
        kind: "guardian",
        region: region.id,
        regionIndex,
        slot: 9,
        name,
        tier: deps.ATLAS.guardianRules.tier,
        boss: name,
        arena: true,
        act: region.act,
        bossAct,
        bossVisualId,
        ele: region.ele,
        ticket
      });
    });
  }
  function createAtlasPinnacle(deps) {
    return Object.freeze({
      id: "pinnacle",
      kind: "pinnacle",
      region: null,
      regionIndex: -1,
      slot: -1,
      name: deps.ATLAS.pinnacle.name,
      tier: deps.ATLAS.guardianRules.tier,
      boss: deps.ATLAS.pinnacle.boss,
      arena: true,
      act: deps.ATLAS.pinnacle.act,
      bossAct: deps.ATLAS.pinnacle.bossAct,
      bossVisualId: deps.ATLAS.pinnacle.bossVisualId,
      ele: "chaos"
    });
  }
  function createAtlasEnvironment(deps) {
    const env = { deps };
    env.MAP_NODES = createAtlasMapNodes(deps);
    env.GUARDIANS = createAtlasGuardians(deps);
    env.PINNACLE = createAtlasPinnacle(deps);
    env.NODES = Object.freeze([...env.MAP_NODES, ...env.GUARDIANS, env.PINNACLE]);
    env.LATE_NODES = Object.freeze([
      ...env.deps.ATLAS_ENDGAME.apexes.map((row) => atlasCoreLateNode(row, "apex", row.domain)),
      ...env.deps.ATLAS_ENDGAME.leagues.map((row) => atlasCoreLateNode(row, "league", `${row.name}: ${row.boss}`))
    ]);
    env.BY_ID = new Map([...env.NODES, ...env.LATE_NODES].map((node) => [node.id, node]));
    env.LINKS = env.deps.ATLAS.lore.links;
    env.NEIGHBOURS = new Map(env.NODES.map((node) => [node.id, env.LINKS.filter(([, to]) => to === node.id).map(([from]) => from)]));
    env.FRAGMENTS = new Map(env.deps.ATLAS.fragments.map((fragment) => [fragment.id, fragment]));
    env.RARITY_RANK = { normal: 0, magic: 1, rare: 2 };
    env.zones = /* @__PURE__ */ new WeakMap();
    env.BOSS_RULES = { map: { hpMul: 1, damageMul: 1, stages: 1 }, guardian: { ...env.deps.ATLAS.guardianRules, stages: 1 }, pinnacle: env.deps.ATLAS.pinnacle };
    return env;
  }
  function createAtlasGraphApi(env) {
    return {
      nodes: env.NODES,
      links: env.LINKS,
      renameSavedIds: (...args) => atlasCoreRenameSavedIds(env, ...args),
      node: (id) => env.BY_ID.get(id) || null,
      neighbours: (id) => env.NEIGHBOURS.get(id) || [],
      fragment: (id) => env.FRAGMENTS.get(id) || null,
      pinnacle: env.PINNACLE,
      position: (...args) => atlasCorePosition(env, ...args),
      defaults: (...args) => atlasCoreDefaults(env, ...args),
      lockReason: (...args) => atlasCoreLockReason(env, ...args),
      runOpenReason: atlasCoreRunOpenReason,
      status: (...args) => atlasCoreStatus(env, ...args),
      reachable: (...args) => atlasCoreReachable(env, ...args),
      points: (...args) => atlasCorePoints(env, ...args),
      bestTier: (...args) => atlasCoreBestTier(env, ...args),
      sync: (...args) => atlasCoreSync(env, ...args)
    };
  }
  function createAtlasEntryApi(env) {
    return {
      effectiveTier: (...args) => atlasCoreEffectiveTier(env, ...args),
      hasTickets: (...args) => atlasCoreHasTickets(env, ...args),
      pinnacleReason: (...args) => atlasCorePinnacleReason(env, ...args),
      beginPinnacle: (...args) => atlasCoreBeginPinnacle(env, ...args),
      beginSpecial: (...args) => atlasCoreBeginSpecial(env, ...args),
      beginMemory: (...args) => atlasCoreBeginMemory(env, ...args),
      beginBoard: (...args) => atlasCoreBeginBoard(env, ...args),
      lateNodes: env.LATE_NODES,
      slots: (...args) => atlasCoreSlots(env, ...args),
      setLoadout: (...args) => atlasCoreSetLoadout(env, ...args),
      beginReason: (...args) => atlasCoreBeginReason(env, ...args),
      begin: (...args) => atlasCoreBegin(env, ...args)
    };
  }
  function createAtlasInventoryApi(env) {
    return {
      discard: atlasCoreDiscard,
      discardPlainUpTo: (...args) => atlasCoreDiscardPlainUpTo(env, ...args),
      plainMap: (...args) => atlasCorePlainMap(env, ...args),
      tierBand: (...args) => atlasCoreTierBand(env, ...args),
      combineSet: (...args) => atlasCoreCombineSet(env, ...args),
      combineReason: (...args) => atlasCoreCombineReason(env, ...args),
      combine: (...args) => atlasCoreCombine(env, ...args),
      combineAllPlan: (...args) => atlasCoreCombineAllPlan(env, ...args),
      combineAll: (...args) => atlasCoreCombineAll(env, ...args),
      omenChangeReason: (...args) => atlasCoreOmenChangeReason(env, ...args),
      changeOmen: (...args) => atlasCoreChangeOmen(env, ...args)
    };
  }
  function createAtlasRunApi(env) {
    return {
      cancel: (...args) => atlasCoreCancel(env, ...args),
      complete: (...args) => atlasCoreComplete(env, ...args),
      markCleared: atlasCoreMarkCleared,
      keepLoot: (...args) => atlasCoreKeepLoot(env, ...args),
      usePortal: (...args) => atlasCoreUsePortal(env, ...args),
      close: (...args) => atlasCoreClose(env, ...args),
      nextAuto: (...args) => atlasCoreNextAuto(env, ...args),
      dropFromKill: (...args) => atlasCoreDropFromKill(env, ...args),
      extraMap: (...args) => atlasCoreExtraMap(env, ...args),
      fragmentFromKill: (...args) => atlasCoreFragmentFromKill(env, ...args),
      fragmentOpen: (...args) => atlasCoreFragmentOpen(env, ...args),
      zone: (...args) => atlasCoreZone(env, ...args),
      preview: (...args) => atlasCorePreview(env, ...args),
      lootTier: atlasCoreLootTier,
      equivalentDepth: (...args) => atlasCoreEquivalentDepth(env, ...args),
      normalize: (...args) => atlasCoreNormalize(env, ...args),
      onLoopReset: (...args) => atlasCoreOnLoopReset(env, ...args),
      travelReason: (...args) => atlasCoreTravelReason(env, ...args),
      rewardMaps: (...args) => atlasCoreRewardMaps(env, ...args),
      inMap: (state) => state.currentZoneId === env.deps.ATLAS.zoneId
    };
  }
  function createAtlas(deps) {
    const env = createAtlasEnvironment(deps);
    return Object.freeze({
      ...createAtlasGraphApi(env),
      ...createAtlasEntryApi(env),
      ...createAtlasInventoryApi(env),
      ...createAtlasRunApi(env)
    });
  }

  // modules/atlas-classic.mjs
  var rules = createAtlas({
    get ATLAS() {
      return ATLAS;
    },
    get atlasEpoch() {
      return atlasEpoch;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    get atlasBoard() {
      return atlasBoard;
    },
    get atlasPassives() {
      return atlasPassives;
    },
    get hasCurrentLoopChaos20Clear() {
      return hasCurrentLoopChaos20Clear;
    },
    get _t() {
      return _t;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get lootOmens() {
      return lootOmens;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get atlasEncounters() {
      return atlasEncounters;
    },
    get memoryDungeon() {
      return typeof memoryDungeon === "undefined" ? void 0 : memoryDungeon;
    },
    get ATLAS_ENDGAME() {
      return ATLAS_ENDGAME;
    },
    get contentProgression() {
      return contentProgression;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get getAbyssZoneTier() {
      return getAbyssZoneTier;
    },
    get ATLAS_BOARD() {
      return ATLAS_BOARD;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get ATLAS_BOSS_BODIES() {
      return ATLAS_BOSS_BODIES;
    }
  });
  var atlas = Object.freeze({
    ...rules,
    fragmentOpen: (fragment, loop) => rules.fragmentOpen(fragment, loop, game)
  });
  safeExposeGlobals({ atlas });
})();
