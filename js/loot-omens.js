// GENERATED from modules/loot-omens*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/loot-omens-rules.mjs
  function omenIsItemKind(env, key) {
    return Object.hasOwn(env.ITEM_KINDS, key);
  }
  function omenOpenKey(env, key, state) {
    return omenIsItemKind(env, key) ? env.ITEM_KINDS[key](state) : env.deps.contentProgression.canDropCurrency(key, state);
  }
  function omenAvailable(env, omen, state) {
    if ((omen.minLoop || 0) > (Number(state.season) || 1)) return false;
    if (omen.needsFallenApex && !env.deps.atlasEndgame.bearableOmens(state).length) return false;
    return omen.kind !== "drops" || omen.drops.some(([key]) => omenOpenKey(env, key, state));
  }
  function omenPickWeighted(rows, weightOf, random) {
    const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
    let roll = random() * total;
    return rows.find((row) => (roll -= weightOf(row)) < 0) || rows[rows.length - 1] || null;
  }
  function omenRoll(env, state, random) {
    const pick = omenPickWeighted(env.deps.LOOT_OMENS.list.filter((omen) => omenAvailable(env, omen, state)), (omen) => omen.weight, random);
    return pick ? pick.id : null;
  }
  function omenFlowerOmens(env, color, state, currentId) {
    return env.deps.LOOT_OMENS.flowers[color].omens.map((id) => env.BY_ID.get(id)).filter((omen) => omen.id !== currentId && omenAvailable(env, omen, state));
  }
  function omenRollFlowerOmen(env, color, state, currentId, random) {
    const pick = omenPickWeighted(omenFlowerOmens(env, color, state, currentId), (omen) => omen.weight, random);
    return pick ? pick.id : null;
  }
  function omenStrengthOf(env, map) {
    return (env.deps.LOOT_OMENS.strength[map.rarity] || 1) + (map.corrupted ? env.deps.LOOT_OMENS.strength.corrupted : 0);
  }
  function omenOf(env, map) {
    const omen = map && env.BY_ID.get(map.omen);
    return omen ? { omen, strength: omenStrengthOf(env, map) } : null;
  }
  function omenInZone(env, zone) {
    const omen = zone && zone.atlasOmen && env.BY_ID.get(zone.atlasOmen.id);
    return omen ? { omen, strength: Number(zone.atlasOmen.strength) || 1 } : null;
  }
  function omenRunBonus(env, bonus, map) {
    const found = omenOf(env, map);
    if (!found || found.omen.kind !== "bonus") return bonus;
    const out = { ...bonus };
    for (const [key, value] of Object.entries(found.omen.bonus)) out[key] = (Number(out[key]) || 0) + Math.round(value * found.strength);
    return out;
  }
  function omenZoneFields(env, map) {
    const found = omenOf(env, map);
    return found ? { atlasOmen: Object.freeze({ id: found.omen.id, strength: found.strength }) } : {};
  }
  function omenGrow(value, strength) {
    return 1 + (Number(value || 1) - 1) * strength;
  }
  function omenEnemyMods(env, zone) {
    if (!zone || zone.type !== "atlasMap") return null;
    const found = omenInZone(env, zone), gear = found && found.omen.gear, gems = found && found.omen.gemMul;
    return {
      equipmentMul: gear ? omenGrow(gear.quantity, found.strength) : 1,
      uniqueMul: env.deps.LOOT_OMENS.uniqueMul * (gear ? omenGrow(gear.unique, found.strength) : 1),
      gemMul: gems ? omenGrow(gems, found.strength) : 1
    };
  }
  function omenJewelOdds(env, zone) {
    const found = omenInZone(env, zone), odds = found && found.omen.jewel;
    return odds ? { rare: Math.min(0.9, odds.rare * found.strength), unique: Math.min(0.5, odds.unique * found.strength) } : null;
  }
  function omenSlotWeights(env, zone) {
    const found = omenInZone(env, zone), slots = found && found.omen.gear && found.omen.gear.slots;
    return slots ? Object.fromEntries(Object.entries(slots).map(([slot, value]) => [slot, omenGrow(value, found.strength)])) : null;
  }
  function omenVariantMul(env, zone, kind) {
    const found = omenInZone(env, zone), variant = found && found.omen.gear && found.omen.gear.variant;
    return variant && variant[kind] ? omenGrow(variant[kind], found.strength) : 1;
  }
  function omenDrawDrop(env, omen, state, random) {
    const rows = omen.drops.filter(([key]) => omenOpenKey(env, key, state));
    const row = omenPickWeighted(rows, (entry) => entry[1], random);
    return row ? [row[0], Math.max(1, Math.floor(row[2] || 1))] : null;
  }
  function omenRankOf(enemy) {
    return enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "regular";
  }
  function omenKillDrops(env, zone, enemy, state, random) {
    const found = omenInZone(env, zone);
    if (!found || found.omen.kind !== "drops") return [];
    const chance = env.deps.LOOT_OMENS.chance[omenRankOf(enemy)] * found.strength;
    const rolls = Math.floor(chance) + Number(random() < chance % 1) + (enemy.isBoss ? env.deps.LOOT_OMENS.bossRolls : 0);
    return Array.from({ length: rolls }, () => omenDrawDrop(env, found.omen, state, random)).filter(Boolean);
  }
  function omenStrayDrops(env, zone, enemy, state, random) {
    if (!zone || zone.type !== "atlasMap" || !(enemy.isElite || enemy.isBoss)) return [];
    const rolls = enemy.isBoss ? env.deps.LOOT_OMENS.stray.boss : Number(random() < env.deps.LOOT_OMENS.stray.elite);
    const own = omenInZone(env, zone), pool = env.deps.LOOT_OMENS.list.filter((omen) => omen.kind === "drops" && omenAvailable(env, omen, state) && (!own || omen !== own.omen));
    return Array.from({ length: rolls }, () => omenPickWeighted(pool, (row) => row.weight, random)).filter(Boolean).map((omen) => omenDrawDrop(env, omen, state, random)).filter(Boolean);
  }
  function omenTreasureDrops(env, zone, state, random, golden = false) {
    const own = omenInZone(env, zone), pool = env.deps.LOOT_OMENS.list.filter((omen2) => omen2.kind === "drops" && omenAvailable(env, omen2, state));
    const omen = own && own.omen.kind === "drops" ? own.omen : omenPickWeighted(pool, (row) => row.weight, random);
    if (!omen) return { omen: null, drops: [] };
    const rolls = golden ? env.deps.LOOT_OMENS.treasure.golden.rolls : env.deps.LOOT_OMENS.treasure.rolls;
    return { omen, drops: Array.from({ length: rolls }, () => omenDrawDrop(env, omen, state, random)).filter(Boolean) };
  }
  function omenGoldenJackpot(env, state, random) {
    const rows = env.deps.LOOT_OMENS.treasure.golden.jackpot.filter(([key]) => key === "@chase" || env.deps.contentProgression.canDropCurrency(key, state));
    const row = omenPickWeighted(rows, (entry) => entry[1], random);
    return row ? row[0] : "@chase";
  }
  function omenPackRoll(env, salt, pack) {
    return Math.abs(env.deps.hashSeed(`${salt}:${pack.key}:${pack.aliveIds[0]}`)) % 1e4 / 1e4;
  }
  function omenIsTreasurePack(env, zone, pack) {
    if (!zone || zone.type !== "atlasMap" || pack.stage !== null || pack.encounter || pack.anchor || !pack.waiting.length) return false;
    return omenPackRoll(env, "treasure", pack) < env.deps.LOOT_OMENS.treasure.packChance;
  }
  function omenIsGoldenTreasure(env, pack) {
    return omenPackRoll(env, "golden", pack) < env.deps.LOOT_OMENS.treasure.golden.chance;
  }
  function omenDescribe(env, id) {
    const omen = env.BY_ID.get(id);
    return omen ? { id: omen.id, name: omen.name, note: omen.note, tone: omen.tone, kind: omen.kind } : null;
  }
  function omenValidId(env, id) {
    return typeof id === "string" && env.BY_ID.has(id);
  }

  // modules/domain/loot-omens.mjs
  function createLootOmens(deps) {
    const env = { deps };
    env.BY_ID = new Map(env.deps.LOOT_OMENS.list.map((omen) => [omen.id, omen]));
    env.ITEM_KINDS = Object.freeze({ "@jewel": (state) => env.deps.contentProgression.isUnlocked("jewel", state), "@seed": (state) => !!(state.stumpBox && state.stumpBox.acquired) });
    return Object.freeze({
      roll: (...args) => omenRoll(env, ...args),
      flowerOmens: (...args) => omenFlowerOmens(env, ...args),
      rollFlowerOmen: (...args) => omenRollFlowerOmen(env, ...args),
      of: (...args) => omenOf(env, ...args),
      inZone: (...args) => omenInZone(env, ...args),
      runBonus: (...args) => omenRunBonus(env, ...args),
      zoneFields: (...args) => omenZoneFields(env, ...args),
      enemyMods: (...args) => omenEnemyMods(env, ...args),
      jewelOdds: (...args) => omenJewelOdds(env, ...args),
      slotWeights: (...args) => omenSlotWeights(env, ...args),
      variantMul: (...args) => omenVariantMul(env, ...args),
      killDrops: (...args) => omenKillDrops(env, ...args),
      strayDrops: (...args) => omenStrayDrops(env, ...args),
      treasureDrops: (...args) => omenTreasureDrops(env, ...args),
      goldenJackpot: (...args) => omenGoldenJackpot(env, ...args),
      isTreasurePack: (...args) => omenIsTreasurePack(env, ...args),
      isGoldenTreasure: (...args) => omenIsGoldenTreasure(env, ...args),
      describe: (...args) => omenDescribe(env, ...args),
      validId: (...args) => omenValidId(env, ...args),
      strengthOf: (...args) => omenStrengthOf(env, ...args),
      isItemKind: (...args) => omenIsItemKind(env, ...args)
    });
  }

  // modules/loot-omens-classic.mjs
  var rules = createLootOmens({
    get contentProgression() {
      return contentProgression;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get hashSeed() {
      return hashSeed;
    }
  });
  var lootOmens = rules;
  safeExposeGlobals({ lootOmens });
})();
