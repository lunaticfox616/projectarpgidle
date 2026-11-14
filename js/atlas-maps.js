// GENERATED from modules/atlas-maps*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-maps-rules.mjs
  function atlasMapLerp(range, roll) {
    return range[0] + (range[1] - range[0]) * roll;
  }
  function atlasMapModValue(mod, roll) {
    return Math.round(atlasMapLerp([mod.min, mod.max], roll));
  }
  function atlasMapLimits(env, map) {
    return env.deps.ATLAS.rarities[map.rarity];
  }
  function atlasMapCountKind(env, map, kind) {
    return map.mods.filter((entry) => env.MODS.get(entry.id)?.kind === kind).length;
  }
  function atlasMapCreate(env, node, tier, rarity = "normal", random = Math.random) {
    const map = { uid: 0, node, tier, rarity: "normal", mods: [], quality: 0, corrupted: false };
    if (rarity !== "normal") atlasMapReroll(env, map, rarity, random);
    return map;
  }
  function atlasMapOpenKinds(env, map, forced) {
    return ["prefix", "suffix"].filter((kind) => forced || atlasMapCountKind(env, map, kind) < atlasMapLimits(env, map)[kind]);
  }
  function atlasMapAddMod(env, map, random, forced = false) {
    const taken = new Set(map.mods.map((entry) => entry.id));
    const kinds = new Set(atlasMapOpenKinds(env, map, forced));
    const pool = env.deps.ATLAS.mods.filter((mod) => kinds.has(mod.kind) && !taken.has(mod.id));
    if (!pool.length) return false;
    map.mods.push({ id: pool[Math.floor(random() * pool.length)].id, roll: random() });
    return true;
  }
  function atlasMapReroll(env, map, rarity, random, count = null) {
    map.rarity = rarity;
    map.mods = [];
    const rule = atlasMapLimits(env, map);
    const target = count ?? rule.min + Math.floor(random() * (rule.max - rule.min + 1));
    while (map.mods.length < target && atlasMapAddMod(env, map, random)) ;
  }
  function atlasMapHasRoom(env, map) {
    return map.mods.length < atlasMapLimits(env, map).max && atlasMapOpenKinds(env, map, false).length > 0;
  }
  function atlasMapCraftReason(env, map, key) {
    if (!env.CRAFTS[key]) return "지도석에 쓸 수 없는 재화입니다.";
    if (map.corrupted) return "타락한 지도석은 더 바꿀 수 없습니다.";
    return env.CRAFTS[key].can(map) ? "" : "지금 지도석 상태에는 쓸 수 없습니다.";
  }
  function atlasMapCraft(env, map, key, random = Math.random) {
    const reason = atlasMapCraftReason(env, map, key);
    if (!reason) env.CRAFTS[key].apply(map, random);
    return reason;
  }
  function atlasMapCorrupt(env, map, random) {
    const weights = env.deps.ATLAS.corruption, outcomes = ["none", "tier", "extra", "reforge"];
    let roll = random() * outcomes.reduce((sum, key) => sum + weights[key], 0);
    const outcome = outcomes.find((key) => (roll -= weights[key]) < 0) || "none";
    map.corrupted = true;
    if (outcome === "tier") map.tier = Math.min(env.deps.ATLAS.tierCap, map.tier + 1);
    if (outcome === "extra") atlasMapAddMod(env, map, random, true);
    if (outcome === "reforge") atlasMapReroll(env, map, "rare", random, 5 + Math.floor(random() * 2));
    return outcome;
  }
  function atlasMapOverTiers(env, tier) {
    return Math.max(0, (Number(tier) || 0) - env.deps.ATLAS.overTier.from);
  }
  function atlasMapChaseMul(env, zone) {
    return 1 + (zone && zone.type === "atlasMap" ? atlasMapOverTiers(env, zone.atlasTier) * env.deps.ATLAS.overTier.chase / 100 : 0);
  }
  function atlasMapEffects(env, map) {
    const over = atlasMapOverTiers(env, map.tier);
    const fx = {
      hp: 1,
      damage: 1,
      bossHp: 1,
      bossDamage: 1,
      packExtra: 0,
      extraElite: 0,
      hazard: false,
      groundElements: [],
      enemy: [],
      quantity: map.quality + (map.corrupted ? env.deps.ATLAS.corruption.bonusQuantity : 0) + over * env.deps.ATLAS.overTier.quantity,
      rarity: over * env.deps.ATLAS.overTier.rarity,
      overTiers: over
    };
    for (const entry of map.mods) {
      const mod = env.MODS.get(entry.id), effect = env.EFFECTS[entry.id];
      if (!mod || !effect) continue;
      const v = atlasMapModValue(mod, entry.roll);
      fx.quantity += Math.round(atlasMapLerp(mod.quantity, entry.roll));
      fx.rarity += Math.round(atlasMapLerp(mod.rarity, entry.roll));
      if (effect.zone) effect.zone(fx, v);
      if (effect.enemy) fx.enemy.push([entry.id, v]);
    }
    return fx;
  }
  function atlasMapApplyEnemyMods(env, enemy, zone) {
    if (!zone || zone.type !== "atlasMap") return enemy;
    for (const [id, v] of zone.atlasEnemyMods) env.EFFECTS[id].enemy(enemy, v);
    enemy.dropMul = (Number(enemy.dropMul) || 1) * (1 + zone.atlasLootQuantity / 100);
    enemy.lootRarityMul = 1 + (zone.atlasLootRarity + (enemy.isBoss ? zone.atlasBossRarity : 0)) / 100;
    const omen = env.deps.lootOmens.enemyMods(zone), kill = enemy.isBoss ? 1 : env.deps.LOOT_OMENS.killGearMul;
    if (omen) Object.assign(enemy, { equipmentDropMul: omen.equipmentMul * kill, uniqueChanceMul: omen.uniqueMul, gemDropMul: omen.gemMul });
    return enemy;
  }
  function atlasMapDescribe(env, entry) {
    const mod = env.MODS.get(entry.id);
    return mod ? mod.text.replace("{v}", String(atlasMapModValue(mod, entry.roll))) : "";
  }
  function atlasMapValidHead(env, raw, validNode) {
    if (!raw || typeof raw !== "object" || !validNode(raw.node) || !Object.hasOwn(env.deps.ATLAS.rarities, raw.rarity)) return false;
    return Number.isSafeInteger(raw.uid) && raw.uid >= 1 && Number.isInteger(raw.tier) && raw.tier >= 1 && raw.tier <= env.deps.ATLAS.tierCap;
  }
  function atlasMapValidEntry(env, entry, seen) {
    const ok = !!entry && env.MODS.has(entry.id) && Number.isFinite(entry.roll) && entry.roll >= 0 && entry.roll <= 1 && !seen.has(entry.id);
    if (ok) seen.add(entry.id);
    return ok;
  }
  function atlasMapMemoryField(env, raw) {
    return typeof env.deps.memoryDungeon === "object" && env.deps.memoryDungeon.validTier(raw.memory) ? { memory: raw.memory } : {};
  }
  function atlasMapNormalize(env, raw, validNode) {
    if (!atlasMapValidHead(env, raw, validNode)) return null;
    const seen = /* @__PURE__ */ new Set(), mods = (Array.isArray(raw.mods) ? raw.mods : []).filter((entry) => atlasMapValidEntry(env, entry, seen));
    const quality = Math.max(0, Math.min(env.deps.ATLAS.quality.max, Math.floor(Number(raw.quality) || 0)));
    return {
      uid: raw.uid,
      node: raw.node,
      tier: raw.tier,
      rarity: raw.rarity,
      mods: mods.slice(0, 8).map(({ id, roll }) => ({ id, roll })),
      quality,
      corrupted: raw.corrupted === true,
      ...atlasMapMemoryField(env, raw),
      ...env.deps.lootOmens.validId(raw.omen) ? { omen: raw.omen } : {}
    };
  }

  // modules/domain/atlas-maps.mjs
  function createAtlasZoneEffects() {
    return {
      monsterLife: { zone: (fx, v) => {
        fx.hp *= 1 + v / 100;
      } },
      monsterDamage: { zone: (fx, v) => {
        fx.damage *= 1 + v / 100;
      } },
      bossEmpowered: { zone: (fx, v) => {
        fx.bossHp *= 1 + v / 100;
        fx.bossDamage *= 1 + v / 100;
      } },
      extraElites: { zone: (fx, v) => {
        fx.extraElite = v / 100;
      } },
      packSize: { zone: (fx, v) => {
        fx.packExtra = v;
      } },
      burningGround: { zone: (fx) => {
        fx.hazard = true;
        fx.groundElements.push("fire");
      } },
      frozenGround: { zone: (fx) => {
        fx.hazard = true;
        fx.groundElements.push("cold");
      } },
      corrosiveGround: { zone: (fx) => {
        fx.hazard = true;
        fx.groundElements.push("chaos");
      } },
      shockedGround: { zone: (fx) => {
        fx.hazard = true;
        fx.groundElements.push("light");
      } }
    };
  }
  function createAtlasEnemyEffects() {
    return {
      monsterSpeed: { enemy: (enemy, v) => {
        enemy.attackSpeedVar *= 1 + v / 100;
      } },
      monsterResist: { enemy: (enemy, v) => {
        for (const key of ["resF", "resC", "resL"]) enemy[key] = Math.min(95, enemy[key] + v);
      } },
      monsterArmour: { enemy: (enemy, v) => {
        enemy.dr = Math.min(90, enemy.dr + v);
      } },
      monsterCrit: { enemy: (enemy, v) => {
        enemy.critChance += v;
      } },
      monsterEvasion: { enemy: (enemy, v) => {
        enemy.evasionChance = Math.min(95, (Number(enemy.evasionChance) || 0) + v);
      } },
      lessLeech: { enemy: (enemy, v) => {
        enemy.leechEffMul = (Number.isFinite(enemy.leechEffMul) ? enemy.leechEffMul : 1) * (1 - v / 100);
      } },
      penetration: { enemy: (enemy, v) => {
        enemy.penetration = (Number(enemy.penetration) || 0) + v;
      } },
      doubleStrike: { enemy: (enemy, v) => {
        enemy.doubleStrikeChance = Math.min(100, (Number(enemy.doubleStrikeChance) || 0) + v);
      } },
      energyShield: { enemy: (enemy, v) => {
        enemy.maxEnergyShield = (Number(enemy.maxEnergyShield) || 0) + Math.floor(enemy.maxHp * v / 100);
        enemy.energyShield = enemy.maxEnergyShield;
      } },
      curseImmune: { enemy: (enemy) => {
        enemy.curseImmune = true;
      } }
    };
  }
  function createAtlasMapCrafts(env) {
    return Object.freeze({
      magicBud: { label: "변환과 변경", can: (map) => map.rarity !== "rare", apply: (map, random) => atlasMapReroll(env, map, "magic", random) },
      sapBud: {
        label: "옵션 추가",
        can: (map) => map.rarity === "magic" || map.rarity === "rare" && atlasMapHasRoom(env, map),
        apply: (map, random) => {
          map.rarity = "rare";
          atlasMapAddMod(env, map, random);
        }
      },
      formlessDew: { label: "희귀 재굴림", can: (map) => map.rarity !== "magic", apply: (map, random) => atlasMapReroll(env, map, "rare", random) },
      blightSpore: { label: "정화", can: (map) => map.rarity !== "normal", apply: (map) => {
        map.rarity = "normal";
        map.mods = [];
      } },
      pruningShears: {
        label: "옵션 삭제",
        can: (map) => map.mods.length > 0,
        apply: (map, random) => {
          map.mods.splice(Math.floor(random() * map.mods.length), 1);
        }
      },
      goldenRule: { label: "수치 재굴림", can: (map) => map.mods.length > 0, apply: (map, random) => map.mods.forEach((entry) => {
        entry.roll = random();
      }) },
      deepWhetstone: {
        label: `품질 +${env.deps.ATLAS.quality.step}%`,
        can: (map) => map.quality < env.deps.ATLAS.quality.max,
        apply: (map) => {
          map.quality = Math.min(env.deps.ATLAS.quality.max, map.quality + env.deps.ATLAS.quality.step);
        }
      },
      emberBranch: { label: "타락", can: () => true, apply: (map, random) => atlasMapCorrupt(env, map, random) }
    });
  }
  function createAtlasMaps(deps) {
    const env = { deps };
    env.MODS = new Map(env.deps.ATLAS.mods.map((mod) => [mod.id, mod]));
    env.EFFECTS = Object.freeze({ ...createAtlasZoneEffects(), ...createAtlasEnemyEffects() });
    env.CRAFTS = createAtlasMapCrafts(env);
    return Object.freeze({
      create: (...args) => atlasMapCreate(env, ...args),
      craft: (...args) => atlasMapCraft(env, ...args),
      craftReason: (...args) => atlasMapCraftReason(env, ...args),
      crafts: env.CRAFTS,
      corrupt: (...args) => atlasMapCorrupt(env, ...args),
      effects: (...args) => atlasMapEffects(env, ...args),
      applyEnemyMods: (...args) => atlasMapApplyEnemyMods(env, ...args),
      describe: (...args) => atlasMapDescribe(env, ...args),
      normalize: (...args) => atlasMapNormalize(env, ...args),
      reroll: (...args) => atlasMapReroll(env, ...args),
      chaseMul: (...args) => atlasMapChaseMul(env, ...args),
      mod: (id) => env.MODS.get(id) || null
    });
  }

  // modules/atlas-maps-classic.mjs
  var rules = createAtlasMaps({
    get ATLAS() {
      return ATLAS;
    },
    get lootOmens() {
      return lootOmens;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get memoryDungeon() {
      return typeof memoryDungeon === "undefined" ? void 0 : memoryDungeon;
    }
  });
  var atlasMaps = rules;
  safeExposeGlobals({ atlasMaps });
})();
