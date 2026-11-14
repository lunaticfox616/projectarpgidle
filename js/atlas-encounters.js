// GENERATED from modules/atlas-encounters*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-encounters-rules.mjs
  function atlasEncounterRoll(env, bonus, forced, random, ...selection) {
    const [capacity = Infinity, context = false, owner] = selection;
    const { awake = false, loop = Infinity, region = null } = context && typeof context === "object" ? context : { awake: !!context };
    const fixed = [...new Set(forced)].filter((type) => Object.hasOwn(env.deps.ATLAS.encounters, type));
    const limit = atlasEncounterRoomLimit(env, bonus, loop, owner);
    const passing = (late) => atlasEncounterShuffledTypes(env.TYPES.filter((type) => !fixed.includes(type) && !!env.deps.ATLAS.encounters[type].late === late && atlasEncounterIsOpen(env, type, loop, owner)), random).filter((type) => random() * 100 < atlasEncounterChance(env, type, bonus, region));
    const altars = awake ? passing(true).slice(0, env.deps.ATLAS.altarLimit) : [];
    return [...fixed, ...passing(false).slice(0, limit), ...altars].slice(0, capacity);
  }
  function atlasEncounterRoomLimit(env, bonus, loop, owner) {
    const deepening = env.deps.ATLAS.encounterLoopBonus.filter((row) => env.deps.contentProgression.holds(row.unlock, owner, loop)).reduce((sum, row) => sum + row.extra, 0);
    return env.deps.ATLAS.encounterLimit + (Number(bonus.encounterExtra) || 0) + deepening;
  }
  function atlasEncounterChance(env, type, bonus, region) {
    const rule = env.deps.ATLAS.encounters[type];
    return (rule.chance + (bonus[type] || 0)) * (rule.regionChance && rule.regionChance[region] || 1);
  }
  function atlasEncounterIsOpen(env, type, loop, owner) {
    const rule = env.deps.ATLAS.encounters[type];
    return (rule.minLoop || 0) <= loop && (!rule.unlock || env.deps.contentProgression.holds(rule.unlock, owner, loop));
  }
  function atlasEncounterShuffledTypes(list, random) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function atlasEncounterHostRooms(map) {
    return map.rooms.filter((room) => room.role === "optional" || room.role === "battle");
  }
  function atlasEncounterScore(env, zone, type, room) {
    return Math.abs(env.deps.hashSeed(`${zone.atlasSeed}:${type}:${room.id}`));
  }
  function atlasEncounterRooms(env, zone, map) {
    const out = {};
    if (!zone || zone.type !== "atlasMap") return out;
    const pool = atlasEncounterHostRooms(map);
    for (const type of zone.atlasEncounters) {
      const free = pool.filter((room) => !out[room.id]);
      if (free.length) out[free.reduce((best, room) => atlasEncounterScore(env, zone, type, room) > atlasEncounterScore(env, zone, type, best) ? room : best).id] = type;
    }
    return out;
  }
  function atlasEncounterTuneEnemy(env, enemy, type, zone = null) {
    const rule = env.deps.ATLAS.encounters[type], mul = rule.enemy;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * mul.hp));
    enemy.hp = enemy.maxHp;
    enemy.damageMul = (Number(enemy.damageMul) || 1) * mul.damage;
    enemy.atkMul = (Number(enemy.atkMul) || 1) * mul.attack;
    enemy.expMul = (Number(enemy.expMul) || 1) * mul.exp;
    if (rule.roster) atlasEncounterDressRosterMember(env, enemy, type, zone);
    else enemy.name = `${rule.prefix} ${enemy.name}`;
    if (rule.ele) enemy.ele = rule.ele;
    if (rule.outline) Object.assign(enemy, { encounterOutline: rule.outline, encounterSparks: rule.sparks || null });
    enemy.atlasEncounter = type;
    atlasEncounterDressGolden(env, enemy, zone, type);
    return enemy;
  }
  function atlasEncounterDressRosterMember(env, enemy, type, zone) {
    const roster = env.deps.ATLAS.encounters[type].roster, pool = roster[enemy.isElite ? "elite" : "normal"];
    const offset = Math.abs(env.deps.hashSeed(`${zone?.atlasSeed || zone?.id || "atlas"}:${type}:${enemy.spawnAt}`));
    const id = pool[(offset + enemy.groupIndex) % pool.length], visual = env.deps.getRealmMonsterVisualDefinitionById(id);
    if (!visual) throw new Error(`Unknown atlas encounter monster: ${type}/${id}`);
    Object.assign(enemy, {
      name: atlasEncounterRosterName(enemy, visual.name),
      baseMonsterName: visual.name,
      monsterVisualSetId: null,
      monsterVisualId: id,
      spriteVariantId: null,
      monsterArchetype: null
    });
  }
  function atlasEncounterRosterName(enemy, name) {
    return [
      enemy.craftOmen ? "뿌리를 품은" : "",
      enemy.isElite ? enemy.traitName : "",
      name
    ].filter(Boolean).join(" ");
  }
  function atlasEncounterGolden(env, types, bonus, seed) {
    const chance = env.deps.ATLAS.goldenRoom.chance + (Number(bonus.goldenRoom) || 0);
    return types.filter((type) => !env.deps.ATLAS.encounters[type].late && Math.abs(env.deps.hashSeed(`golden:${seed}:${type}`)) % 1e3 < chance * 10);
  }
  function atlasEncounterIsGolden(zone, type) {
    return !!zone && Array.isArray(zone.atlasGolden) && zone.atlasGolden.includes(type);
  }
  function atlasEncounterDressGolden(env, enemy, zone, type) {
    if (!atlasEncounterIsGolden(zone, type)) return;
    const gold = env.deps.ATLAS.goldenRoom;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * gold.hpMul));
    enemy.hp = enemy.maxHp;
    enemy.damageMul = (Number(enemy.damageMul) || 1) * gold.damageMul;
    Object.assign(enemy, { name: `${gold.prefix} ${enemy.name}`, encounterOutline: gold.outline, encounterSparks: gold.sparks, atlasGolden: true });
  }
  function atlasEncounterHasOwnLook(env, type) {
    return !!(type && env.deps.ATLAS.encounters[type] && env.deps.ATLAS.encounters[type].roster);
  }
  function atlasEncounterEmptiedPack(env, state, enemy) {
    const run = env.deps.actExplorationState.current(state);
    const pack = !enemy.critter && run && run.packs.find((row) => row.key === enemy.explorationPack);
    if (!pack || pack.waiting.some((row) => !row.critter)) return null;
    const slimes = new Set((state.enemies || []).filter((row) => row && row.critter).map((row) => row.id).concat(pack.waiting.map((row) => row.id)));
    const others = pack.aliveIds.filter((id) => !slimes.has(id));
    return others.length === 1 && others[0] === enemy.id ? pack : null;
  }
  function atlasEncounterPickKey(env, key, rule, zone, random) {
    if (!Array.isArray(key)) return key;
    const own = rule.regionKeys && zone ? rule.regionKeys[zone.atlasRegion] : null;
    if (own && random() < env.deps.ATLAS.encounterRegionShare) return own;
    return key[Math.min(key.length - 1, Math.floor(random() * key.length))];
  }
  function atlasEncounterRewards(env, zone, type, bonus, ...selection) {
    const [random, owner] = selection;
    const rule = env.deps.ATLAS.encounters[type], gold = atlasEncounterIsGolden(zone, type);
    const mul = (1 + (bonus[`${type}Reward`] || 0) / 100) * (gold ? env.deps.ATLAS.goldenRoom.rewardMul : 1);
    const rows = rule.rewards.map(([key, base, perTier]) => [key, (base + perTier * zone.atlasTier) * mul]).concat(gold ? rule.golden || [] : []);
    return rows.map(([key, expected]) => {
      const amount = Math.floor(expected) + Number(random() < expected % 1);
      return [atlasEncounterPickKey(env, key, rule, zone, random), amount];
    }).filter(([key, amount]) => amount > 0 && env.deps.contentProgression.canDropCurrency(key, owner));
  }
  function atlasEncounterChestReward(env, zone, random, owner) {
    const rooms = (zone && Array.isArray(zone.atlasEncounters) ? zone.atlasEncounters : []).filter((type2) => env.deps.ATLAS.encounters[type2].chest);
    if (!rooms.length) return null;
    const type = rooms[Math.min(rooms.length - 1, Math.floor(random() * rooms.length))], rule = env.deps.ATLAS.encounters[type];
    const key = atlasEncounterPickKey(env, rule.chest[0], rule, zone, random);
    return env.deps.contentProgression.canDropCurrency(key, owner) ? [key, rule.chest[1]] : null;
  }
  function atlasEncounterNurseryGifts(zone, bonus, random) {
    const expected = 1 + (Number(bonus.nurseryReward) || 0) / 100, part = expected % 1;
    return Math.floor(expected) + (part ? Number(random() < part) : 0) + Number(atlasEncounterIsGolden(zone, "nursery"));
  }

  // modules/domain/atlas-encounters.mjs
  function createAtlasEncounters(deps) {
    const env = { deps };
    env.TYPES = Object.freeze(Object.keys(env.deps.ATLAS.encounters));
    return Object.freeze({
      types: env.TYPES,
      roll: (...args) => atlasEncounterRoll(env, ...args),
      roomLimit: (...args) => atlasEncounterRoomLimit(env, ...args),
      chance: (...args) => atlasEncounterChance(env, ...args),
      isOpen: (...args) => atlasEncounterIsOpen(env, ...args),
      rooms: (...args) => atlasEncounterRooms(env, ...args),
      hostRooms: atlasEncounterHostRooms,
      tuneEnemy: (...args) => atlasEncounterTuneEnemy(env, ...args),
      hasOwnLook: (...args) => atlasEncounterHasOwnLook(env, ...args),
      emptiedPack: (...args) => atlasEncounterEmptiedPack(env, ...args),
      rewards: (...args) => atlasEncounterRewards(env, ...args),
      golden: (...args) => atlasEncounterGolden(env, ...args),
      isGolden: atlasEncounterIsGolden,
      chestReward: (...args) => atlasEncounterChestReward(env, ...args),
      nurseryGifts: atlasEncounterNurseryGifts
    });
  }

  // modules/atlas-encounters-classic.mjs
  var rules = createAtlasEncounters({
    get ATLAS() {
      return ATLAS;
    },
    get contentProgression() {
      return contentProgression;
    },
    get hashSeed() {
      return hashSeed;
    },
    get getRealmMonsterVisualDefinitionById() {
      return getRealmMonsterVisualDefinitionById;
    },
    get actExplorationState() {
      return actExplorationState;
    }
  });
  var atlasEncounters = Object.freeze({
    ...rules,
    roll: (bonus, forced, random, capacity = Infinity, context = false) => rules.roll(bonus, forced, random, capacity, context, game),
    roomLimit: (bonus, loop) => rules.roomLimit(bonus, loop, game),
    isOpen: (type, loop) => rules.isOpen(type, loop, game),
    rewards: (zone, type, bonus, random) => rules.rewards(zone, type, bonus, random, game),
    chestReward: (zone, random) => rules.chestReward(zone, random, game)
  });
  safeExposeGlobals({ atlasEncounters });
})();
