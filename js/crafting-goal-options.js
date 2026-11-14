// GENERATED from modules/crafting-goal-options*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/crafting-goal-options-rules.mjs
  function craftGoalResultRarity(env, item, recipe) {
    return env.deps.equipmentCrafting.basicRule(env.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity))?.rarity || "rare";
  }
  function craftGoalKeptStats(env, item, recipe, omen = null) {
    if (recipe.kind === "add") return item.stats || [];
    return (item.stats || []).filter((stat) => env.deps.equipmentCrafting.keptOnReroll(item, stat) || stat.unremovable || stat.encroachedFinal || !env.deps.equipmentCrafting.onOmenSide(item, stat, omen));
  }
  function craftGoalRollPool(env, item, recipe, mode, omen) {
    const kept = craftGoalKeptStats(env, item, recipe, omen);
    const occupied = kept.length + (item.chaosInfusion ? 1 : 0);
    const magic = craftGoalResultRarity(env, item, recipe) === "magic", cap = magic ? env.deps.EXPLICIT_AFFIX_RULES.magic.prefix + env.deps.EXPLICIT_AFFIX_RULES.magic.suffix : env.deps.EXPLICIT_AFFIX_LINE_CAP;
    if (occupied >= cap) return [];
    let pool = env.deps.equipmentCrafting.filterOmenMods(env.deps.getOpenAffixMods({ ...item, stats: kept }, magic ? "magic" : "rare"), omen);
    const maxRolled = Math.max(kept.length, cap === 2 ? 2 : 5) - occupied;
    if (recipe.kind === "reroll" && maxRolled <= 0 && mode === "none") return [];
    pool = craftGoalFilterSpore(env, pool, item, recipe, mode, maxRolled);
    if (recipe.kind === "fossil") {
      pool = craftGoalFossilPool(env, item, recipe, pool, maxRolled);
    }
    return pool;
  }
  function craftGoalFilterSpore(env, pool, item, recipe, ...selection) {
    const [mode, maxRolled] = selection;
    if (!env.deps.isSporeCraftEquipment(item) || mode === "none") return pool;
    if (recipe.kind === "add" || recipe.kind === "reroll" && maxRolled <= 1) return env.deps.equipmentCrafting.filterSporeMods(pool, mode);
    return pool;
  }
  function craftGoalFossilPool(env, item, recipe, pool, maxRolled) {
    if (env.deps.equipmentCrafting.getFossilBlockReason(item, recipe.key)) return [];
    if (recipe.key === "fossilRift") return env.deps.EXPLICIT_AFFIX_LINE_CAP - craftGoalKeptStats(env, item, recipe).filter((stat) => stat.id !== "fossilRiftBlank").length - (item.chaosInfusion ? 1 : 0) > 2 ? pool : [];
    const candidate = { ...item, stats: craftGoalKeptStats(env, item, recipe), chaosInfusion: null };
    const guaranteed = recipe.key === "fossilOld" ? env.deps.getFossilExclusivePool(candidate).map((mod) => ({ ...mod, fixedValue: true })) : env.deps.getFossilGuaranteedPool(item, env.deps.FOSSIL_DB.find((row) => row.key === recipe.key));
    if (!guaranteed.length) return [];
    return maxRolled <= 1 ? guaranteed : [...pool, ...guaranteed];
  }
  function craftGoalEligible(env, item, recipe) {
    if (!item || !["add", "reroll", "fossil", "value"].includes(recipe.kind)) return false;
    if (item.rarity === "unique" || item.corrupted || item.fusedRelic) return false;
    if (recipe.kind === "fossil") return env.deps.FOSSIL_DB.some((row) => row.key === recipe.key);
    if (!Object.hasOwn(env.deps.ORB_DB, recipe.key)) return false;
    const action = env.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity);
    return env.deps.equipmentCrafting.basicFits(item, action);
  }
  function craftGoalGet(env, item, recipe, mode, omen = null) {
    if (!craftGoalEligible(env, item, recipe)) return [];
    if (recipe.kind === "value") return [];
    const pool = craftGoalRollPool(env, item, recipe, mode, omen), cap = env.deps.getItemCraftTier(item);
    const rows = pool.flatMap((mod) => [mod, ...mod.compound || []].map((stat) => ({
      id: stat.statId || stat.id,
      name: env.deps.getStatName(stat.statId || stat.id),
      maxTier: stat.fixedValue ? 0 : Math.min(cap, stat.tierValues?.length || 20)
    })));
    const unique = /* @__PURE__ */ new Map();
    rows.forEach((row) => {
      if (!unique.has(row.id) || unique.get(row.id).maxTier < row.maxTier) unique.set(row.id, row);
    });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, env.deps.locale));
  }
  function craftGoalTags(env, item, recipe, mode, omen = null) {
    if (!craftGoalEligible(env, item, recipe) || recipe.kind === "value") return [];
    const pool = craftGoalRollPool(env, item, recipe, mode, omen), kept = craftGoalKeptStats(env, item, recipe, omen), cap = env.deps.getItemCraftTier(item);
    return Object.keys(env.deps.AFFIX_TAG_LABELS).map((tag) => {
      const rows = pool.filter((mod) => env.deps.getAffixTags(mod).includes(tag)), held = kept.filter((stat) => env.deps.getAffixTags(stat).includes(tag));
      const tiers = [...rows.map((mod) => mod.fixedValue ? 0 : Math.min(cap, mod.tierValues?.length || 20)), ...held.map((stat) => Number(stat.tier) || 0)];
      const rollable = new Set(rows.map((mod) => mod.statId || mod.id)).size;
      return { id: tag, name: env.deps.AFFIX_TAG_LABELS[tag], rollable, maxTier: Math.max(0, ...tiers), maxCount: Math.min(env.deps.EXPLICIT_AFFIX_LINE_CAP, held.length + rollable) };
    }).filter((row) => row.rollable > 0);
  }
  function craftGoalMaxTierFor(env, item, mod) {
    return mod.fixedValue ? 0 : Math.min(env.deps.getItemCraftTier(item), mod.tierValues?.length || 20);
  }
  function craftGoalCatalogue(env, item, recipe, mode, omen = null) {
    if (!craftGoalEligible(env, item, recipe) || recipe.kind === "value") return [];
    const pool = craftGoalRollPool(env, item, recipe, mode, omen), ids = new Set(pool.map((mod) => mod.id));
    const candidates = env.deps.buildAvailableModPool(item).map((row) => row.mod);
    const all = [...new Map([...candidates, ...pool].map((mod) => [mod.id, mod])).values()];
    const kept = craftGoalKeptStats(env, item, recipe, omen), occupied = new Set(kept.flatMap(env.deps.getExplicitModStatIds));
    const room = env.deps.equipmentCrafting.affixRoom({ ...item, stats: kept }, craftGoalResultRarity(env, item, recipe));
    const weights = recipe.kind === "fossil" ? env.deps.weighFossilTagMods(pool, recipe.key) : env.deps.equipmentCrafting.weighOmenPool(item, pool, omen);
    const weightOf = (mod) => Math.max(0.01, Number(mod.weight) || 1), total = weights.reduce((sum, mod) => sum + weightOf(mod), 0);
    return all.map((mod) => {
      const allowed = ids.has(mod.id), maxTier = craftGoalMaxTierFor(env, item, mod);
      const reason = craftGoalCatalogueBlockReason(env, mod, { occupied, room, omen });
      const weighted = weights.find((row) => row.id === mod.id), weight = weighted ? weightOf(weighted) : 0;
      return {
        id: mod.id,
        statId: mod.statId || mod.id,
        statIds: env.deps.getExplicitModStatIds(mod),
        name: mod.statName || env.deps.getStatName(mod.statId || mod.id),
        kind: env.deps.equipmentCrafting.affixKind(mod),
        tags: env.deps.getAffixTags(mod),
        maxTier,
        weight,
        share: total ? weight / total : 0,
        allowed,
        reason: allowed ? "" : reason
      };
    }).sort((a, b) => Number(b.allowed) - Number(a.allowed) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, env.deps.locale));
  }
  function craftGoalCatalogueBlockReason(env, mod, { occupied, room, omen }) {
    if (!env.deps.equipmentCrafting.filterOmenMods([mod], omen).length) return "선택한 뿌리의 대상 아님";
    if (env.deps.getExplicitModStatIds(mod).some((id) => occupied.has(id))) return "보존 옵션과 중복";
    return !env.deps.equipmentCrafting.fitsRoom(room, mod) ? "접두나 접미 자리 부족" : "선택한 제작의 후보 아님";
  }
  function craftGoalStudy(env, context) {
    const { item, recipe, mode, omen } = context;
    return { rows: craftGoalCatalogue(env, item, recipe, mode, omen), reason: craftGoalRehearsalReason(env, item, recipe, mode, omen) };
  }
  function craftGoalRehearsalSideReason(env, item, action, mode, omen) {
    return env.deps.equipmentCrafting.omenReason(item, action, omen, mode) || env.deps.equipmentCrafting.getSporeBlockReason(item, action, mode);
  }
  function craftGoalRehearsalReason(env, item, recipe, mode = "none", omen = null) {
    if (!craftGoalEligible(env, item, recipe) || !env.deps.equipmentCrafting.basicActions.includes(env.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity))) return "이 재화의 제작 연습은 아직 지원하지 않습니다.";
    const action = env.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity);
    if (omen && omen.effect === "side") return craftGoalRehearsalSideReason(env, item, action, mode, omen);
    return env.deps.equipmentCrafting.getSporeBlockReason(item, action, mode) || (!craftGoalRollPool(env, item, recipe, mode, omen).length ? "부여 가능한 옵션이 없습니다." : "") || craftGoalSporeGapReason(env, item, action, mode);
  }
  function craftGoalSporeGapReason(env, item, action, mode) {
    const spore = mode !== "none" && env.deps.isSporeCraftEquipment(item);
    return spore && !env.deps.equipmentCrafting.sporePool(item, action, mode).length ? "선택한 수확 계열에서 새로 붙을 수 있는 옵션이 없습니다." : "";
  }
  function craftGoalRehearse(env, item, recipe, mode = "none", omen = null) {
    const reason = craftGoalRehearsalReason(env, item, recipe, mode, omen);
    if (reason) throw Error(reason);
    const result = JSON.parse(JSON.stringify(item)), action = env.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity);
    let guaranteedStat = null;
    const used = env.deps.equipmentCrafting.omenFits(item, action, omen, mode) ? omen : null;
    if (mode !== "none" && env.deps.isSporeCraftEquipment(item)) {
      const mod = env.deps.equipmentCrafting.pickSporeMod(item, action, mode, omen);
      if (!mod) throw Error("보장할 수확 옵션이 없습니다.");
      guaranteedStat = env.deps.equipmentCrafting.rollSporeLine(item, mod, used);
    }
    env.deps.equipmentCrafting.applyBasic(result, action, { guaranteedStat, omen: used });
    return result;
  }
  function craftGoalRehearseStudy(env, context) {
    const { item, recipe, mode, omen } = context;
    return craftGoalRehearse(env, item, recipe, mode, omen);
  }

  // modules/domain/crafting-goal-options.mjs
  function createCraftingGoalOptions(deps) {
    const env = { deps };
    return Object.freeze({ get: (...args) => craftGoalGet(env, ...args), tags: (...args) => craftGoalTags(env, ...args), catalogue: (...args) => craftGoalCatalogue(env, ...args), rehearsalReason: (...args) => craftGoalRehearsalReason(env, ...args), rehearse: (...args) => craftGoalRehearse(env, ...args), study: (...args) => craftGoalStudy(env, ...args), rehearseStudy: (...args) => craftGoalRehearseStudy(env, ...args) });
  }

  // modules/crafting-goal-options-classic.mjs
  var rules = createCraftingGoalOptions({
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get EXPLICIT_AFFIX_RULES() {
      return EXPLICIT_AFFIX_RULES;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get getOpenAffixMods() {
      return getOpenAffixMods;
    },
    get isSporeCraftEquipment() {
      return isSporeCraftEquipment;
    },
    get getFossilExclusivePool() {
      return getFossilExclusivePool;
    },
    get getFossilGuaranteedPool() {
      return getFossilGuaranteedPool;
    },
    get FOSSIL_DB() {
      return FOSSIL_DB;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get getStatName() {
      return getStatName;
    },
    get locale() {
      return i18n.locale;
    },
    get AFFIX_TAG_LABELS() {
      return AFFIX_TAG_LABELS;
    },
    get getAffixTags() {
      return getAffixTags;
    },
    get buildAvailableModPool() {
      return buildAvailableModPool;
    },
    get getExplicitModStatIds() {
      return getExplicitModStatIds;
    },
    get weighFossilTagMods() {
      return weighFossilTagMods;
    }
  });
  var craftingGoalOptions = rules;
  safeExposeGlobals({ craftingGoalOptions });
})();
