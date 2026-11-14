// GENERATED from modules/atlas-endgame*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-endgame-ledger.mjs
  function atlasLateLedger(state) {
    return state.atlas.endgame;
  }
  function atlasLateDefaults() {
    return { kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] };
  }
  function atlasLateKills(state, id) {
    return atlasLateLedger(state).kills[id] || 0;
  }
  function atlasLateAwakened(state) {
    return atlasLateKills(state, "pinnacle") > 0;
  }
  function atlasLateCount(env, state, item) {
    return Number(env.WALLET[item] ? state.currencies[env.WALLET[item]] : atlasLateLedger(state).items[item]) || 0;
  }
  function atlasLateStore(env, state, item, value) {
    if (env.WALLET[item]) state.currencies[env.WALLET[item]] = value;
    else atlasLateLedger(state).items[item] = value;
  }
  function atlasLateGive(env, state, item, amount) {
    if (!(amount > 0) || !Object.hasOwn(env.E.items, item)) return 0;
    const before = atlasLateCount(env, state, item);
    atlasLateStore(env, state, item, Math.min(env.E.itemCap, before + Math.floor(amount)));
    return atlasLateCount(env, state, item) - before;
  }
  function atlasLateMoveAltarMaterials(env, state, raw) {
    const items = raw && raw.items && typeof raw.items === "object" ? raw.items : null;
    if (!items || !state.currencies) return;
    for (const [item, key] of Object.entries(env.WALLET)) {
      const held = Math.floor(Number(items[item]) || 0);
      if (held > 0) state.currencies[key] = Math.min(env.E.itemCap, (Number(state.currencies[key]) || 0) + held);
      delete items[item];
    }
  }
  function atlasLateDef(env, id) {
    return env.DEFS.get(id) || null;
  }
  function atlasLateEntryOf(row) {
    return row.kind === "league" ? [[row.item, row.need]] : row.entry;
  }
  function atlasLateWitness(env, state, name, bossAct) {
    const book = atlasLateLedger(state);
    book.witness += 1;
    book.witnessed = [...book.witnessed, [name, Number.isInteger(bossAct) ? bossAct : 9]].slice(-env.E.witness.keep);
    return book.witness % env.E.witness.per === 0 ? atlasLateGive(env, state, "ringInvite", 1) : 0;
  }
  function atlasLateCountKill(env, state, node, apostle) {
    const wasAwake = atlasLateAwakened(state);
    if (env.LATE_BOSSES.has(node.kind)) atlasLateLedger(state).kills[node.id] = atlasLateKills(state, node.id) + 1;
    if (apostle) atlasLateLedger(state).kills[apostle.id] = atlasLateKills(state, apostle.id) + 1;
    return !wasAwake && atlasLateAwakened(state);
  }

  // modules/domain/atlas-endgame-run.mjs
  function atlasLateRollApostle(env, state, node, random) {
    if (!node || node.kind !== "map" || atlasLateKills(state, "apex_gardener") < 1) return null;
    const level = atlasLateLedger(state).blight[node.region] || 0;
    if (random() * 100 >= level * env.E.blight.chancePerLevel) return null;
    const pool = env.E.apostles.filter((row) => row.regions.includes(node.region));
    return pool.length ? pool[Math.floor(random() * pool.length)].id : null;
  }
  function atlasLateEchoesFor(state, node) {
    return node && node.id === "apex_weaver" ? atlasLateLedger(state).witnessed.slice(-2).reverse() : [];
  }
  function atlasLateRunExtra(env, state, node, random) {
    return { apostle: atlasLateRollApostle(env, state, node, random), items: {}, echoes: atlasLateEchoesFor(state, node) };
  }
  function atlasLateCapped(raw, keys, cap) {
    const out = {};
    for (const key of keys) {
      const value = Math.floor(Number(raw && raw[key]) || 0);
      if (value > 0) out[key] = Math.min(cap, value);
    }
    return out;
  }
  function atlasLateValidEcho(row) {
    return Array.isArray(row) && typeof row[0] === "string" && row[0].length <= 40 && Number.isInteger(row[1]) && row[1] >= 0 && row[1] <= 9;
  }
  function atlasLateNormalizeRun(env, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      apostle: env.APOSTLES.has(source.apostle) ? source.apostle : null,
      items: atlasLateCapped(source.items, env.ITEM_IDS, env.E.itemCap * 10),
      echoes: (Array.isArray(source.echoes) ? source.echoes : []).filter(atlasLateValidEcho).slice(0, 2)
    };
  }

  // modules/domain/atlas-endgame-restore.mjs
  function atlasLateNormalize(env, raw, pinnacleDone = false) {
    const source = raw && typeof raw === "object" ? raw : {}, kills = atlasLateCapped(source.kills, env.KILL_IDS, 1e6);
    if (pinnacleDone && !kills.pinnacle) kills.pinnacle = 1;
    return {
      kills,
      items: atlasLateCapped(source.items, env.ITEM_IDS, env.E.itemCap),
      blight: atlasLateCapped(source.blight, env.deps.ATLAS.regions.map((region) => region.id), env.E.blight.max),
      witness: Math.max(0, Math.min(1e6, Math.floor(Number(source.witness) || 0))),
      witnessed: (Array.isArray(source.witnessed) ? source.witnessed : []).filter(atlasLateValidEcho).slice(-env.E.witness.keep)
    };
  }
  function atlasLateReset(env, state) {
    state.atlas.endgame = atlasLateDefaults();
    Object.values(env.WALLET).forEach((key) => {
      state.currencies[key] = 0;
    });
  }

  // modules/domain/atlas-endgame-access.mjs
  function atlasLateRoomLoop(env, row) {
    return row.room && env.deps.ATLAS.encounters[row.room] ? env.deps.ATLAS.encounters[row.room].minLoop || 0 : 0;
  }
  function atlasLateRoomHeld(env, state, row) {
    const unlock = row.room && env.deps.ATLAS.encounters[row.room]?.unlock;
    return !unlock || env.deps.contentProgression.holds(unlock, state);
  }
  function atlasLateAncientDone(state, id) {
    return atlasLateKills(state, id) > 0 || (state.atlas.completed || []).includes(id) || (state.clearedRootBosses || []).includes(id);
  }
  function atlasLateAncientGate(env, state, id) {
    const rule = env.deps.ATLAS.lore.bosses.find((row) => row.id === id);
    if (!rule || atlasLateAncientDone(state, id)) return "";
    const missing = rule.requires.filter((key) => !atlasLateAncientDone(state, key));
    const name = (key) => env.deps.ATLAS.lore.bosses.find((row) => row.id === key)?.name || env.deps.atlas.node(key)?.name || key;
    return missing.length ? env.deps._t("{names} 격파 필요", { names: missing.map((key) => env.deps._t(name(key))).join(", ") }) : "";
  }
  function atlasLateUnlocked(env, state, row) {
    if (!atlasLateAwakened(state) || (Number(state.season) || 1) < atlasLateRoomLoop(env, row) || !atlasLateRoomHeld(env, state, row)) return false;
    if (env.deps.ATLAS.lore.bosses.some((rule) => rule.id === row.id)) return !atlasLateAncientGate(env, state, row.id);
    return !(row.unlock && row.unlock.kill) || atlasLateKills(state, row.unlock.kill) > 0;
  }
  function atlasLateLockText(env, state, row) {
    if (atlasLateAwakened(state) && env.deps.ATLAS.lore.bosses.some((rule) => rule.id === row.id)) return atlasLateAncientGate(env, state, row.id);
    if (row.unlock && row.unlock.kill) return env.deps._t("{name} 처치 뒤에 열립니다.", { name: atlasLateDef(env, row.unlock.kill).stages[0].name });
    if (atlasLateAwakened(state) && atlasLateRoomLoop(env, row) > 0) return env.deps._t("{name} 해금 뒤에 열립니다.", { name: env.deps.ATLAS.encounters[row.room].name });
    return "세계수의 그림자(정점)를 쓰러뜨리면 아틀라스가 깨어나 열립니다.";
  }
  function atlasLateMissingOf(env, state, row) {
    return atlasLateEntryOf(row).filter(([item, need]) => atlasLateCount(env, state, item) < need);
  }
  function atlasLateEntryReason(env, state, id) {
    const row = atlasLateDef(env, id);
    if (!row) return "없는 보스입니다.";
    const lock = env.deps.atlas.lockReason(state);
    if (lock) return lock;
    if (state.atlas.run) return env.deps.atlas.runOpenReason(state);
    if (!atlasLateUnlocked(env, state, row)) return atlasLateLockText(env, state, row);
    const missing = atlasLateMissingOf(env, state, row);
    return missing.length ? `재료가 부족합니다: ${missing.map(([item, need]) => `${env.E.items[item].name} ${atlasLateCount(env, state, item)}/${need}`).join(", ")}` : "";
  }
  function atlasLateSpend(env, state, id) {
    for (const [item, need] of atlasLateEntryOf(atlasLateDef(env, id))) atlasLateStore(env, state, item, atlasLateCount(env, state, item) - need);
  }
  function atlasLateRefund(env, state, id) {
    for (const [item, need] of atlasLateEntryOf(atlasLateDef(env, id))) atlasLateGive(env, state, item, need);
  }

  // modules/domain/atlas-endgame-overview.mjs
  function atlasLateLoopKeptCurrencies(env, state) {
    return Object.values(env.WALLET).map((key) => [key, Math.max(0, Math.floor(Number(state.currencies[key]) || 0))]);
  }
  function atlasLateLockOf(env, state, row) {
    return atlasLateAwakened(state) && !atlasLateUnlocked(env, state, row) ? atlasLateLockText(env, state, row) : "";
  }
  function atlasLateOverview(env, state) {
    const fight = (row) => ({
      row,
      unlocked: atlasLateUnlocked(env, state, row),
      reason: atlasLateEntryReason(env, state, row.id),
      lock: atlasLateLockOf(env, state, row),
      kills: atlasLateKills(state, row.id),
      entry: atlasLateEntryOf(row).map(([item, need]) => ({ item, name: env.E.items[item].name, have: atlasLateCount(env, state, item), need }))
    });
    const book = atlasLateLedger(state);
    return {
      awakened: atlasLateAwakened(state),
      apexes: env.E.apexes.map((row) => fight({ ...row, kind: "apex" })),
      leagues: env.E.leagues.map((row) => fight({ ...row, kind: "league" })),
      blight: env.deps.ATLAS.regions.map((region) => ({ region, level: book.blight[region.id] || 0 })),
      witness: book.witness,
      witnessPer: env.E.witness.per,
      gardenerDown: atlasLateKills(state, "apex_gardener") > 0
    };
  }

  // modules/domain/atlas-endgame-boss-stage.mjs
  function atlasLateBossBoost(env, run) {
    const apostle = run && run.endgame && run.endgame.apostle;
    return apostle ? { hp: env.E.blight.hpMul, damage: env.E.blight.damageMul } : { hp: 1, damage: 1 };
  }
  function atlasLateStageName(env, row, stage, echoes) {
    if (!Number.isInteger(stage.echo)) return stage.name;
    const echo = echoes[stage.echo];
    return echo ? env.deps._t("엮인 메아리: {echo}", { echo: echo[0] }) : env.deps._t("엮인 메아리: {name}", { name: row.stages[0].name });
  }
  function atlasLateZoneExtras(env, run, node) {
    const extra = run && run.endgame || {}, apostle = env.APOSTLES.get(extra.apostle);
    if (node.kind === "map" && apostle) return { bossName: apostle.name, bossAct: apostle.bossAct, bossVisualId: null, atlasApostle: apostle.id };
    const row = atlasLateDef(env, node.id);
    if (!row) return {};
    const echoes = extra.echoes || [], names = row.stages.map((stage) => atlasLateStageName(env, row, stage, echoes));
    const out = { bossName: names[0], bossStageNames: names, atlasStages: row.id, atlasEchoes: echoes };
    const arena = env.E.arenas[node.id];
    if (arena) Object.assign(out, {
      trialHazard: { ...env.E.arenaHazard, persistent: true },
      trapElements: [arena.element],
      trapName: env.deps.COMBAT_GRID_CONFIG.ground[arena.element].name
    });
    return out;
  }
  function atlasLateApplyStageBody(env, enemy, row, art) {
    if (row.bodyVisual) return Object.assign(enemy, { monsterVisualId: row.bodyVisual, spriteVariantId: null, monsterArchetype: null, bossAssetKey: env.deps.ACT_BOSS_ASSET_KEYS[art] || null });
    enemy.monsterVisualId = null;
    enemy.bossAssetKey = env.deps.ACT_BOSS_ASSET_KEYS[art] || enemy.bossAssetKey;
    return enemy;
  }
  function atlasLateStageBodyRow(env, row, echo, body) {
    if (echo) return env.BODY_BY_BOSS.get(echo[0]) || {};
    return Number.isInteger(body.bossAct) && body.bossAct !== row.bossAct ? {} : row;
  }
  function atlasLateTuneStage(env, enemy, zone, stage) {
    const row = atlasLateDef(env, zone.atlasStages), body = row && row.stages[stage];
    if (!body) return enemy;
    const isEcho = Number.isInteger(body.echo), echo = isEcho ? (zone.atlasEchoes || [])[body.echo] : null;
    const art = echo ? echo[1] : Number.isInteger(body.bossAct) ? body.bossAct : row.bossAct;
    enemy.name = `👿 ${zone.bossStageNames[stage]}`;
    atlasLateApplyStageBody(env, enemy, body.bodyVisual ? body : atlasLateStageBodyRow(env, row, echo, body), art);
    enemy.bossVisualTint = isEcho ? 200 : null;
    enemy.patternMode = "apex";
    enemy.apexMechanic = body.mechanic;
    if (isEcho) {
      enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * env.E.witness.echoHpMul));
      enemy.hp = enemy.maxHp;
    }
    return enemy;
  }
  function atlasLatePatternState(env, mechanicId, attackNumber) {
    const rule = env.E.mechanics[mechanicId];
    if (!rule) return null;
    const n = Math.max(1, Math.floor(Number(attackNumber) || 1)), special = n % rule.every === 0;
    return {
      mode: mechanicId,
      patternMode: "apex",
      label: rule.name,
      damageMul: special ? rule.damageMul : 1,
      isSpecial: special,
      attackNumber: n,
      telegraphKind: rule.telegraph,
      warningMs: env.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs,
      recoveryMs: 0,
      ...atlasLateComboState(env, mechanicId, rule, n, special)
    };
  }
  function atlasLateComboState(env, id, rule, n, special) {
    const sequence = env.E.sequences[id];
    if (!sequence || !special) return {};
    const step = (Math.floor(n / rule.every) - 1 + 3) % 3, finisher = step === 2, combo = env.E.combo;
    return {
      label: `${rule.name}, ${["첫 수", "연계", "마무리"][step]}`,
      telegraphKind: sequence[step],
      warningMs: finisher ? combo.finisherWarningMs : combo.warningMs,
      recoveryMs: finisher ? combo.finisherRecoveryMs : combo.recoveryMs
    };
  }

  // modules/domain/atlas-endgame-spoils.mjs
  function atlasLateRoomItem(env, room) {
    if (env.E.altars[room]) return { item: env.E.altars[room].item, rate: env.E.altars[room].amount };
    const league = env.LEAGUE_BY_ROOM.get(room);
    return league ? { item: league.item, rate: league.shards } : null;
  }
  function atlasLateRolledAmount(rate, tier, random) {
    const expected = rate[0] + rate[1] * tier;
    return Math.floor(expected) + Number(random() < expected % 1);
  }
  function atlasLateLateRun(state) {
    return atlasLateAwakened(state) && state.atlas.run && state.atlas.run.endgame || null;
  }
  function atlasLateRoomItems(env, state, zone, room, random = Math.random) {
    const held = atlasLateLateRun(state), found = atlasLateRoomItem(env, room);
    if (!held || !found) return [];
    const amount = atlasLateRolledAmount(found.rate, zone.atlasTier || 1, random);
    held.items[found.item] = (held.items[found.item] || 0) + amount;
    return amount > 0 ? [[found.item, amount]] : [];
  }
  function atlasLateKeepHeld(env, state, run, out) {
    const extra = run.endgame || {};
    for (const [item, amount] of Object.entries(extra.items || {})) {
      const got = atlasLateGive(env, state, item, amount);
      if (got) out.items.push([item, got]);
    }
  }
  function atlasLateBossMaterial(env, state, node, run, out) {
    if (node.kind === "guardian" && env.E.guardianShears[node.region] && atlasLateGive(env, state, env.E.guardianShears[node.region], 1)) out.items.push([env.E.guardianShears[node.region], 1]);
    const apostle = env.APOSTLES.get(run.endgame && run.endgame.apostle);
    if (apostle && atlasLateGive(env, state, apostle.item, 1)) out.items.push([apostle.item, 1]);
  }
  function atlasLateFightSpoils(env, state, node, out, first) {
    const row = atlasLateDef(env, node.id);
    if (!row) return;
    out.rewards = row.rewards.filter(([key]) => env.deps.contentProgression.canDropCurrency(key));
    const chance = env.E.uniqueChance[row.kind] || 0;
    const uniques = [].concat(row.unique || []);
    if (uniques.length && (first || Math.random() < chance)) out.unique = uniques[Math.floor(Math.random() * uniques.length)];
  }
  function atlasLateWitnessKill(env, state, node, apostle) {
    if (apostle) return atlasLateWitness(env, state, apostle.name, apostle.bossAct);
    return env.LATE_BOSSES.has(node.kind) && node.id !== "apex_weaver" ? atlasLateWitness(env, state, node.boss, node.bossAct) : 0;
  }

  // modules/domain/atlas-endgame-blight.mjs
  function atlasLateSpreadBlight(env, state, region) {
    const book = atlasLateLedger(state).blight;
    book[region] = Math.min(env.E.blight.max, (book[region] || 0) + env.E.blight.perMap);
    return { region, level: book[region] };
  }
  function atlasLateCleanseBlight(state, region) {
    atlasLateLedger(state).blight[region] = 0;
    return { region, level: 0, cleansed: true };
  }

  // modules/domain/atlas-endgame-completion.mjs
  function* atlasLateOnComplete(env, state, node, run) {
    const out = { items: [], rewards: [], unique: null, awakened: false, invite: 0, blight: null };
    const apostle = env.APOSTLES.get(run.endgame && run.endgame.apostle) || null, first = atlasLateKills(state, node.id) < 1;
    out.awakened = atlasLateCountKill(env, state, node, apostle);
    if (!atlasLateAwakened(state)) return out;
    atlasLateKeepHeld(env, state, run, out);
    atlasLateBossMaterial(env, state, node, run, out);
    atlasLateFightSpoils(env, state, node, out, first);
    if (node.kind === "apex") yield* atlasLateApexStumpDrops(state);
    if (node.kind === "map" && atlasLateKills(state, "apex_gardener") > 0) out.blight = apostle ? atlasLateCleanseBlight(state, node.region) : atlasLateSpreadBlight(env, state, node.region);
    if (!out.awakened) out.invite = atlasLateWitnessKill(env, state, node, apostle);
    return out;
  }
  function* atlasLateApexStumpDrops(state) {
    yield { kind: "grantApexScar", args: [state] };
    yield { kind: "grantApexAncient", args: [state] };
  }

  // modules/domain/atlas-endgame-omens.mjs
  function atlasLateBearableOmens(env, state) {
    return env.deps.CRAFT_OMENS.keys.filter((key) => atlasLateKills(state, env.deps.CRAFT_OMENS.effects[key].boss) > 0);
  }
  function atlasLateBearerZone(env, zone) {
    const B = env.deps.CRAFT_OMENS.bearer;
    return Boolean(zone && (zone.type === "atlasMap" && zone.atlasTier >= B.minAtlasTier || zone.type === "abyss" && zone.depth >= B.minChaosDepth));
  }
  function atlasLateBearerChance(env, state, enemy) {
    const run = state.atlas.run, bonus = Number(run && run.bonus && run.bonus.omenBearer) || 0;
    return (enemy.isElite ? env.deps.CRAFT_OMENS.bearer.elite : env.deps.CRAFT_OMENS.bearer.normal) * (1 + bonus / 100);
  }
  function atlasLateMarkOmenBearer(env, state, enemy, zone, random = Math.random) {
    if (enemy.isBoss || enemy.isSummon || enemy.craftOmen || !atlasLateAwakened(state) || !atlasLateBearerZone(env, zone)) return;
    const omens = atlasLateBearableOmens(env, state);
    if (!omens.length || random() >= atlasLateBearerChance(env, state, enemy)) return;
    enemy.craftOmen = omens[Math.floor(random() * omens.length)];
    enemy.name = `뿌리를 품은 ${enemy.name}`;
  }
  function atlasLateTakeOmen(enemy) {
    if (!enemy.craftOmen || enemy.craftOmenTaken) return "";
    enemy.craftOmenTaken = true;
    return enemy.craftOmen;
  }

  // modules/domain/atlas-endgame.mjs
  function createAtlasEndgameEnvironment(deps) {
    const env = { deps };
    env.E = env.deps.ATLAS_ENDGAME;
    env.DEFS = new Map([...env.E.apexes.map((row) => [row.id, { ...row, kind: "apex" }]), ...env.E.leagues.map((row) => [row.id, { ...row, kind: "league" }])]);
    env.LEAGUE_BY_ROOM = new Map(env.E.leagues.map((row) => [row.room, row]));
    env.BODY_BY_BOSS = new Map([...env.E.leagues, ...env.E.apexes].filter((row) => row.bodyVisual).map((row) => [row.boss || row.stages[0].name, row]));
    env.APOSTLES = new Map(env.E.apostles.map((row) => [row.id, row]));
    env.ITEM_IDS = Object.freeze(Object.keys(env.E.items));
    env.LATE_BOSSES = /* @__PURE__ */ new Set(["guardian", "pinnacle", "apex", "league"]);
    env.WALLET = Object.freeze({ ember: env.deps.ITEM_INFLUENCES.red.currency, ichor: env.deps.ITEM_INFLUENCES.blue.currency });
    env.KILL_IDS = Object.freeze([...env.DEFS.keys(), ...env.APOSTLES.keys(), "pinnacle", ...env.deps.ATLAS.regions.map((region) => `${region.id}_g`)]);
    return env;
  }
  function createAtlasEndgameLedgerApi(env) {
    return {
      defaults: atlasLateDefaults,
      normalize: (...args) => atlasLateNormalize(env, ...args),
      normalizeRun: (...args) => atlasLateNormalizeRun(env, ...args),
      ancientDone: atlasLateAncientDone,
      ancientGate: (...args) => atlasLateAncientGate(env, ...args),
      moveAltarMaterials: (...args) => atlasLateMoveAltarMaterials(env, ...args),
      reset: (...args) => atlasLateReset(env, ...args),
      loopKeptCurrencies: (...args) => atlasLateLoopKeptCurrencies(env, ...args),
      awakened: atlasLateAwakened,
      kills: atlasLateKills,
      count: (...args) => atlasLateCount(env, ...args),
      def: (...args) => atlasLateDef(env, ...args),
      entryReason: (...args) => atlasLateEntryReason(env, ...args),
      spend: (...args) => atlasLateSpend(env, ...args),
      refund: (...args) => atlasLateRefund(env, ...args),
      runExtra: (...args) => atlasLateRunExtra(env, ...args)
    };
  }
  function createAtlasEndgameFightApi(env) {
    return {
      bossBoost: (...args) => atlasLateBossBoost(env, ...args),
      zoneExtras: (...args) => atlasLateZoneExtras(env, ...args),
      tuneStage: (...args) => atlasLateTuneStage(env, ...args),
      patternState: (...args) => atlasLatePatternState(env, ...args),
      roomItems: (...args) => atlasLateRoomItems(env, ...args),
      onComplete: (...args) => atlasLateOnComplete(env, ...args),
      overview: (...args) => atlasLateOverview(env, ...args),
      bearableOmens: (...args) => atlasLateBearableOmens(env, ...args),
      markOmenBearer: (...args) => atlasLateMarkOmenBearer(env, ...args),
      takeOmen: atlasLateTakeOmen,
      isFight: (id) => env.DEFS.has(id),
      itemName: (id) => env.E.items[id] ? env.E.items[id].name : id
    };
  }
  function createAtlasEndgame(deps) {
    const env = createAtlasEndgameEnvironment(deps);
    return Object.freeze({
      ...createAtlasEndgameLedgerApi(env),
      ...createAtlasEndgameFightApi(env)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/atlas-endgame-classic.mjs
  var rules = createAtlasEndgame({
    get ATLAS() {
      return ATLAS;
    },
    get contentProgression() {
      return contentProgression;
    },
    get _t() {
      return _t;
    },
    get atlas() {
      return atlas;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get ACT_BOSS_ASSET_KEYS() {
      return ACT_BOSS_ASSET_KEYS;
    },
    get CRAFT_OMENS() {
      return CRAFT_OMENS;
    },
    get ATLAS_ENDGAME() {
      return ATLAS_ENDGAME;
    },
    get ITEM_INFLUENCES() {
      return ITEM_INFLUENCES;
    }
  });
  var effects = {
    grantApexScar(state) {
      if (typeof stumpBox === "object") stumpBox.rollScarDrop(state);
    },
    grantApexAncient(state) {
      if (typeof stumpNursery === "object") stumpNursery.ancientFromBoss(state);
    }
  };
  var atlasEndgame = Object.freeze({
    ...rules,
    onComplete: (...args) => consumeDomainCommands(rules.onComplete(...args), effects)
  });
  safeExposeGlobals({ atlasEndgame });
})();
