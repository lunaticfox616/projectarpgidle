// GENERATED from modules/item-influences*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/item-influences-rules.mjs
  function influenceSlotOf(item) {
    return String(item && item.slot || "").replace(/[123]$/, "");
  }
  function influencePick(list, random) {
    return list[Math.floor(random() * list.length)];
  }
  function influenceInfluenceKeys(env, item) {
    if (!item) return [];
    const keys = env.ALTARS.filter((key) => (item.baseStats || []).some((stat) => stat && stat.altar === key));
    if (env.EXPLICIT.includes(item.influence)) keys.push(item.influence);
    if (item.swappedUnique === true) keys.push("swapped");
    return keys;
  }
  function influenceIsModForInfluence(mod, influence) {
    return !mod.influences || mod.influences.includes(influence);
  }
  function influenceLineInfluence(env, stat) {
    return stat && env.MOD_INFLUENCE.get(stat.sourceModId) || null;
  }
  function influenceStackOf(env, key) {
    return env.deps.ITEM_INFLUENCES[key] && env.deps.ITEM_INFLUENCES[key].stack || null;
  }
  function influenceCanTake(env, item, key) {
    const held = influenceInfluenceKeys(env, item).filter((other) => other !== "swapped" && other !== key);
    return !held.length || !!influenceStackOf(env, key) && held.every((other) => influenceStackOf(env, other) === influenceStackOf(env, key));
  }
  function influenceHeldReason(env, item, key) {
    if (influenceCanTake(env, item, key)) return "";
    const held = influenceInfluenceKeys(env, item).find((other) => other !== "swapped" && other !== key);
    return env.deps._t("{label}에는 {name} 줄을 새길 수 없습니다.", { label: env.deps.ITEM_INFLUENCES[held].label, name: env.deps.ITEM_INFLUENCES[key].name });
  }
  function influenceIsAltarCurrency(env, key) {
    return Object.hasOwn(env.CURRENCY_ALTAR, key);
  }
  function influenceAltarOfCurrency(env, key) {
    return env.CURRENCY_ALTAR[key] || null;
  }
  function influenceAltarLines(env, altar, item) {
    return (env.deps.ALTAR_INFLUENCE_LINES[altar] || {})[influenceSlotOf(item)] || null;
  }
  function influenceReplaceIndex(env, item, altar) {
    const lines = Array.isArray(item.baseStats) ? item.baseStats : [];
    const own = lines.findIndex((stat) => stat && stat.altar === altar);
    if (own >= 0) return own;
    const open = lines.map((stat, index) => ({ stat, index })).filter(({ stat }) => stat && !stat.altar && !stat.exceptional && !env.DEFENSE.has(stat.id));
    return open.length ? open[open.length - 1].index : -1;
  }
  function influenceAltarUseReason(env, item, altar) {
    if (!item) return "아이템을 선택하세요.";
    if (!influenceAltarLines(env, altar, item)) return "투구, 갑옷, 장갑, 신발, 완갑, 허리띠에만 새깁니다.";
    if (item.rarity === "unique") return "고유 장비에는 새길 수 없습니다.";
    if (item.corrupted || item.fusedRelic || item.hallReplica) return "이 장비는 옵션을 바꿀 수 없습니다.";
    return influenceReplaceIndex(env, item, altar) < 0 ? "바꿀 베이스 옵션이 없습니다." : influenceHeldReason(env, item, altar);
  }
  function influenceRollTier(env, item, random) {
    const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
    const floor = Math.max(1, cap - env.deps.ITEM_INFLUENCE_RULES.tierSpread);
    return floor + Math.floor(random() * (cap - floor + 1));
  }
  function influenceRollAltarLine(env, item, altar, index, random) {
    const kept = new Set(item.baseStats.filter((stat, at) => stat && at !== index).map((stat) => stat.id));
    const lines = influenceAltarLines(env, altar, item), open = lines.filter((line2) => !kept.has(line2.statId));
    const line = influencePick(open.length ? open : lines, random), tier = influenceRollTier(env, item, random);
    const [min, max] = line.tierValues[tier - 1];
    const step = Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01;
    const val = Number((min + Math.floor(random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
    return { id: line.statId, val, valMin: min, valMax: max, tier, statName: env.deps.getStatName(line.statId), altar };
  }
  function influenceApplyAltar(env, item, altar, random = Math.random) {
    if (influenceAltarUseReason(env, item, altar)) return null;
    const index = influenceReplaceIndex(env, item, altar), old = item.baseStats[index];
    const line = influenceRollAltarLine(env, item, altar, index, random);
    line.replaced = old.altar ? old.replaced : { id: old.id, statName: old.statName || env.deps.getStatName(old.id) };
    item.baseStats[index] = line;
    return line;
  }
  function influenceUseAltarCurrency(env, state, item, currencyKey, random = Math.random) {
    const altar = influenceAltarOfCurrency(env, currencyKey);
    const reason = env.deps.equipmentCrafting.buildLockReason(state) || (altar ? influenceAltarUseReason(env, item, altar) : "제단 재화가 아닙니다.");
    if (reason) return { ok: false, reason };
    if ((Number(state.currencies[currencyKey]) || 0) < 1) return { ok: false, reason: env.deps._t("재화 부족") };
    state.currencies[currencyKey] -= 1;
    return { ok: true, line: influenceApplyAltar(env, item, altar, random) };
  }
  function influenceBossInfluence(zone) {
    if (!zone) return null;
    if (zone.atlasKind === "guardian") return "guardian";
    return zone.atlasApostle ? "blight" : null;
  }
  function influenceEnsureExclusiveLine(env, item, random) {
    if ((item.stats || []).some((stat) => influenceLineInfluence(env, stat))) return;
    const pool = env.deps.getAvailableMods(item).filter((mod2) => env.MOD_INFLUENCE.get(mod2.id) === item.influence);
    if (!pool.length) return;
    const mod = influencePick(pool, random), kind = env.deps.equipmentCrafting.affixKind(mod), room = env.deps.equipmentCrafting.affixRoom(item);
    const same = (item.stats || []).filter((stat) => env.deps.equipmentCrafting.storedAffixKind(item, stat) === kind && !env.deps.equipmentCrafting.keptOnReroll(item, stat));
    if (!same.length && !(room && room[kind] > 0)) return;
    if (same.length) item.stats.splice(item.stats.indexOf(influencePick(same, random)), 1);
    const cap = Math.max(1, Math.min(20, Math.floor(Number(item.affixTierCap) || 1)));
    item.stats.push(env.deps.rollAffixValueInTierRange(mod, Math.max(1, cap - env.deps.ITEM_INFLUENCE_RULES.tierSpread), cap));
  }
  function influenceStampInfluence(env, item, influence, random = Math.random) {
    if (!item || !env.EXPLICIT.includes(influence) || item.rarity === "unique" || !influenceCanTake(env, item, influence)) return item;
    item.influence = influence;
    if (item.rarity === "magic" || item.rarity === "rare") influenceEnsureExclusiveLine(env, item, random);
    return item;
  }
  function influenceFieldInfluence(env, zone, random) {
    const influence = influenceBossInfluence(zone);
    return influence && random() < env.deps.ITEM_INFLUENCE_RULES.fieldChance ? influence : null;
  }
  function influenceOnDrop(env, item, enemy, zone, random = Math.random) {
    if (!item || item.rarity === "unique") return item;
    const influence = enemy && enemy.atlasInfluence || influenceFieldInfluence(env, zone, random);
    if (influence) influenceStampInfluence(env, item, influence, random);
    const altar = enemy ? env.ROOM_ALTAR[enemy.atlasEncounter] : null;
    if (altar && random() < env.deps.ITEM_INFLUENCE_RULES.altarDropChance) influenceApplyAltar(env, item, altar, random);
    return item;
  }
  function influenceNormalizeInfluences(env, item) {
    if (!item || typeof item !== "object") return;
    if (!env.EXPLICIT.includes(item.influence)) delete item.influence;
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach((stat) => {
      if (stat && stat.altar && !env.ALTARS.includes(stat.altar)) delete stat.altar;
    });
    if (item.swappedUnique !== true) delete item.swappedUnique;
  }
  function influenceTagsOf(env, statId) {
    return (typeof env.deps.STAT_AFFIX_TAGS === "object" && env.deps.STAT_AFFIX_TAGS[statId] || []).filter((tag) => env.SPECIFIC_TAGS.has(tag));
  }
  function influencePickSwapLine(env, item, random) {
    const own = new Set(item.stats.map((stat) => stat.id)), tags = new Set(item.stats.flatMap((stat) => influenceTagsOf(env, stat.id)));
    const open = env.deps.SWAPPED_UNIQUE_LINES.filter((line) => !own.has(line.statId));
    const near = open.filter((line) => influenceTagsOf(env, line.statId).some((tag) => tags.has(tag)));
    return (near.length ? influencePick(near, random) : influencePick(open, random)) || null;
  }
  function influenceRollRank(stat) {
    const min = Number(stat.valMin), max = Number(stat.valMax), val = Number(stat.val);
    return [min, max, val].every(Number.isFinite) && max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0.5;
  }
  function influenceSwapLine(env, line, old) {
    const raw = line.min + (line.max - line.min) * influenceRollRank(old);
    const val = Number.isInteger(line.min) && Number.isInteger(line.max) ? Math.round(raw) : Math.round(raw * 100) / 100;
    return {
      id: line.statId,
      val,
      valMin: line.min,
      valMax: line.max,
      tier: 0,
      statName: env.deps.getStatName(line.statId),
      swapped: true,
      replaced: { id: old.id, statName: old.statName || env.deps.getStatName(old.id) }
    };
  }
  function influenceSwapChance(env, memoryTier) {
    const chances = env.deps.MEMORY_DUNGEON.swap || [];
    const at = Math.max(0, Math.min(chances.length - 1, Math.floor(Number(memoryTier) || 1) - 1));
    return Number(chances[at]) || 0;
  }
  function influenceSwapUnique(env, item, memoryTier, random = Math.random) {
    if (!item || item.rarity !== "unique" || !(item.stats || []).length || random() >= influenceSwapChance(env, memoryTier)) return item;
    const line = influencePickSwapLine(env, item, random);
    if (!line) return item;
    const index = Math.floor(random() * item.stats.length);
    item.stats[index] = influenceSwapLine(env, line, item.stats[index]);
    item.swappedUnique = true;
    return item;
  }

  // modules/domain/item-influences.mjs
  function createItemInfluences(deps) {
    const env = { deps };
    env.ALTARS = Object.freeze(Object.keys(env.deps.ALTAR_INFLUENCE_LINES));
    env.EXPLICIT = Object.freeze(Object.keys(env.deps.ITEM_INFLUENCES).filter((key) => env.deps.ITEM_INFLUENCES[key].line === "explicit"));
    env.CURRENCY_ALTAR = Object.freeze(Object.fromEntries(env.ALTARS.map((key) => [env.deps.ITEM_INFLUENCES[key].currency, key])));
    env.ROOM_ALTAR = Object.freeze(Object.fromEntries(env.ALTARS.map((key) => [env.deps.ITEM_INFLUENCES[key].room, key])));
    env.MOD_INFLUENCE = new Map(env.deps.INFLUENCE_AFFIX_MODS.map((mod) => [mod.id, mod.influences[0]]));
    env.DEFENSE = /* @__PURE__ */ new Set(["armor", "evasion", "energyShield"]);
    env.SPECIFIC_TAGS = /* @__PURE__ */ new Set([
      "fire",
      "cold",
      "light",
      "chaos",
      "physical",
      "crit",
      "speed",
      "dot",
      "projectile",
      "melee",
      "aoe",
      "summon",
      "life",
      "defense",
      "resistance",
      "recovery",
      "penetration",
      "attribute"
    ]);
    return Object.freeze({
      influenceKeys: (...args) => influenceInfluenceKeys(env, ...args),
      canTake: (...args) => influenceCanTake(env, ...args),
      isModForInfluence: influenceIsModForInfluence,
      lineInfluence: (...args) => influenceLineInfluence(env, ...args),
      isAltarCurrency: (...args) => influenceIsAltarCurrency(env, ...args),
      altarOfCurrency: (...args) => influenceAltarOfCurrency(env, ...args),
      altarUseReason: (...args) => influenceAltarUseReason(env, ...args),
      applyAltar: (...args) => influenceApplyAltar(env, ...args),
      useAltarCurrency: (...args) => influenceUseAltarCurrency(env, ...args),
      bossInfluence: influenceBossInfluence,
      stampInfluence: (...args) => influenceStampInfluence(env, ...args),
      onDrop: (...args) => influenceOnDrop(env, ...args),
      normalizeInfluences: (...args) => influenceNormalizeInfluences(env, ...args),
      swapChance: (...args) => influenceSwapChance(env, ...args),
      swapUnique: (...args) => influenceSwapUnique(env, ...args)
    });
  }

  // modules/item-influences-classic.mjs
  var rules = createItemInfluences({
    get ITEM_INFLUENCES() {
      return ITEM_INFLUENCES;
    },
    get _t() {
      return _t;
    },
    get ALTAR_INFLUENCE_LINES() {
      return ALTAR_INFLUENCE_LINES;
    },
    get ITEM_INFLUENCE_RULES() {
      return ITEM_INFLUENCE_RULES;
    },
    get getStatName() {
      return getStatName;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getAvailableMods() {
      return getAvailableMods;
    },
    get rollAffixValueInTierRange() {
      return rollAffixValueInTierRange;
    },
    get STAT_AFFIX_TAGS() {
      return typeof STAT_AFFIX_TAGS === "undefined" ? void 0 : STAT_AFFIX_TAGS;
    },
    get SWAPPED_UNIQUE_LINES() {
      return SWAPPED_UNIQUE_LINES;
    },
    get MEMORY_DUNGEON() {
      return MEMORY_DUNGEON;
    },
    get INFLUENCE_AFFIX_MODS() {
      return INFLUENCE_AFFIX_MODS;
    }
  });
  var itemInfluences = rules;
  safeExposeGlobals({ itemInfluences });
})();
