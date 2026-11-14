// GENERATED from modules/equipment-crafting*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/equipment-craft-rules.mjs
  function craftGetSource(env, stat) {
    if (!stat) return void 0;
    if (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) return "fossil";
    if (["fossilRiftBlank", "fossilRiftAmp"].includes(stat.id)) return "fossil";
    return Object.hasOwn(env.labels, stat.craftSource) ? stat.craftSource : void 0;
  }
  function craftGetLabel(env, stat) {
    return env.labels[craftGetSource(env, stat)] || "";
  }
  function craftFilterSporeMods(env, pool, mode) {
    const ids = env.sporeStatIds[mode] || /* @__PURE__ */ new Set();
    return pool.filter((mod) => ids.has(mod.statId || mod.id));
  }
  function craftResolveAction(key, rarity) {
    if (key === "magicBud") return rarity === "normal" ? "transmute" : "alteration";
    if (key === "sapBud") return rarity === "magic" ? "regal" : "exalted";
    if (key === "formlessDew") return rarity === "normal" ? "alchemy" : "chaos";
    return { goldenRule: "divine", fairyRing: "chance", pruningShears: "annulment", blightSpore: "scour", emberBranch: "tainted" }[key] || key;
  }
  function craftGetBlockReason(env, item, source, reroll = false, retainedMarker = "") {
    if (item.corrupted) return "타락한 아이템은 제작할 수 없습니다.";
    const existing = (item.stats || []).filter((stat) => craftGetSource(env, stat) === source);
    if (!existing.length) return "";
    if (!reroll || source === "transplant") return env.deps._t("이미 {labels} 옵션이 있어 추가할 수 없습니다.", { labels: env.labels[source] });
    const locked = existing.some((stat) => stat.id !== retainedMarker && craftKeptOnReroll(item, stat));
    return locked ? env.deps._t("잠긴 {labels} 옵션이 있어 재련할 수 없습니다.", { labels: env.labels[source] }) : "";
  }
  function craftGetSporeBlockReason(env, item, action, mode) {
    if (mode === "none" || !env.sporeActions.has(action)) return "";
    const reroll = env.sporeRerolls.has(action);
    const reason = craftGetBlockReason(env, item, "spore", reroll);
    if (reason || !reroll) return reason;
    return craftGetRerollSpaceReason(item, 1, ["transmute", "alteration"].includes(action) ? craftMagicLineCap(env) : env.deps.EXPLICIT_AFFIX_LINE_CAP);
  }
  function craftKeepsKind(item) {
    return item.rarity === "unique" || !!item.fusedRelic || !!item.hallReplica;
  }
  function craftGetFossilBlockReason(env, item, fossilKey) {
    if (craftKeepsKind(item)) return env.KEEPS_KIND;
    const marker = fossilKey === "fossilRift" ? "fossilRiftBlank" : "";
    return craftGetBlockReason(env, item, "fossil", true, marker) || craftGetRerollSpaceReason(item, marker ? 2 : 1, env.deps.EXPLICIT_AFFIX_LINE_CAP, marker);
  }
  function craftGetRiftHarvestBlockReason(env, item) {
    if (craftKeepsKind(item)) return env.KEEPS_KIND;
    const reason = craftGetBlockReason(env, item, "fossil");
    return reason || (env.deps.getItemExplicitOptionCount(item) >= env.deps.EXPLICIT_AFFIX_LINE_CAP ? "옵션이 가득 차 있습니다." : "");
  }
  function craftGetFossilUseReason(env, item, fossil, season, currencies) {
    if ((season || 1) < 3) return "미궁 제작은 루프3부터 사용할 수 있습니다.";
    if (!fossil) return "존재하지 않는 화석입니다.";
    if ((currencies[fossil.key] || 0) <= 0) return env.deps._t("{name}이 부족합니다.", { name: fossil.name });
    if (!item) return "먼저 아이템을 선택하세요.";
    return craftGetFossilBlockReason(env, item, fossil.key);
  }
  function craftGetRerollSpaceReason(item, required, cap, retainedMarker = "") {
    const locked = (item.stats || []).filter((stat) => stat && stat.id !== retainedMarker && craftKeptOnReroll(item, stat));
    const occupied = locked.length + (item.chaosInfusion ? 1 : 0);
    return occupied + required > cap ? "잠금/주입 옵션 때문에 보장 옵션을 넣을 자리가 없습니다." : "";
  }
  function craftAffixKind(mod) {
    return mod && (mod.type === "prefix" || mod.type === "suffix") ? mod.type : "special";
  }
  function craftStoredAffixKind(env, item, stat) {
    if (stat && stat.isEchoMod && ["prefix", "suffix", "special"].includes(stat.echoKind)) return stat.echoKind;
    if (!stat || stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore || stat.oceanBenchOptionId) return "special";
    return craftAffixKind(env.deps.findStoredEquipmentAffix(item, stat));
  }
  function craftKeptOnReroll(item, stat) {
    return !!(stat && (stat.lockedByHoney || stat.lockedByRift));
  }
  function craftAffixCounts(env, item, skip = null) {
    const counts = { prefix: 0, suffix: 0, special: 0 };
    const lines = (item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : []);
    for (const stat of lines) if (stat && stat !== skip) counts[craftStoredAffixKind(env, item, stat)]++;
    return counts;
  }
  function craftAffixRoom(env, item, rarity = item.rarity, skip = null) {
    const rule = env.deps.EXPLICIT_AFFIX_RULES[rarity];
    if (!rule) return null;
    const used = craftAffixCounts(env, item, skip);
    return { prefix: Math.max(0, rule.prefix - used.prefix), suffix: Math.max(0, rule.suffix - used.suffix) };
  }
  function craftFitsRoom(room, mod) {
    const kind = craftAffixKind(mod);
    return !room || kind === "special" || room[kind] > 0;
  }
  function craftMagicLineCap(env) {
    return env.deps.EXPLICIT_AFFIX_RULES.magic.prefix + env.deps.EXPLICIT_AFFIX_RULES.magic.suffix;
  }
  function craftPickReplacement(env, item, pool, indexes, ...selection) {
    const [pick, choose = "random"] = selection;
    const room = craftAffixRoom(env, item), kindOf = (index) => craftStoredAffixKind(env, item, item.stats[index]);
    const freed = new Set(indexes.map(kindOf));
    const candidatesFor = (mod2) => {
      const kind = craftAffixKind(mod2);
      if (!craftFitsRoom(room, mod2) && !freed.has(kind)) return [];
      const same = indexes.filter((index) => kindOf(index) === kind);
      return same.length || !craftFitsRoom(room, mod2) ? same : indexes;
    };
    if (choose === "all") return pool.flatMap((mod2) => candidatesFor(mod2).map((index) => ({ mod: mod2, index })));
    const mod = pick(pool.filter((row) => candidatesFor(row).length));
    if (!mod) return null;
    const candidates = candidatesFor(mod);
    if (choose !== "lowest") return { mod, index: candidates[Math.floor(Math.random() * candidates.length)] };
    const tier = (index) => Number(item.stats[index].tier) || 0;
    return { mod, index: candidates.reduce((best, index) => tier(index) <= tier(best) ? index : best) };
  }
  function craftAffixHeader(env, rarity, count, used) {
    const rule = env.deps.EXPLICIT_AFFIX_RULES[rarity];
    if (!rule || !used) return { text: env.deps._t("추가 옵션 ({count}/{cap})", { count, cap: env.deps.EXPLICIT_AFFIX_LINE_CAP }), over: false };
    const cap = rarity === "magic" ? craftMagicLineCap(env) : env.deps.EXPLICIT_AFFIX_LINE_CAP;
    return {
      text: env.deps._t("추가 옵션 {count}/{cap} (접두 {prefix}/{prefixCap}, 접미 {suffix}/{suffixCap})", { count, cap, prefix: used.prefix, prefixCap: rule.prefix, suffix: used.suffix, suffixCap: rule.suffix }),
      over: used.prefix > rule.prefix || used.suffix > rule.suffix
    };
  }
  function craftBasicRule(env, action) {
    return env.basicRules[action];
  }
  function craftBasicFits(env, item, action) {
    const rule = craftBasicRule(env, action);
    return !!rule && item.rarity === rule.source && (rule.kind !== "add" || env.deps.getItemExplicitOptionCount(item) < env.deps.EXPLICIT_AFFIX_LINE_CAP);
  }
  function craftBuildLockReason(state) {
    return state && state.woodsmanBuildLock ? "☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다." : "";
  }

  // modules/domain/equipment-craft-omens.mjs
  function craftSporePool(env, item, action, mode, omen = null) {
    if (mode === "none" || !craftBasicRule(env, action)) return [];
    const base = env.rerollActions.includes(action) ? { ...item, stats: (item.stats || []).filter((stat) => craftKeptOnReroll(item, stat) || !craftOnOmenSide(env, item, stat, omen)) } : item;
    return craftFilterOmenMods(craftFilterSporeMods(env, env.deps.getOpenAffixMods(base, craftBasicRule(env, action).rarity), mode), omen);
  }
  function craftPickSporeMod(env, item, action, mode, omen = null) {
    const pool = craftSporePool(env, item, action, mode, omen);
    return pool.length ? env.deps.pickWeightedMod(pool) : null;
  }
  function craftRollSporeLine(env, item, mod, omen = null) {
    if (!mod) return null;
    const range = env.deps.getCraftTierRangeForItem(item, "spore");
    const min = omen && omen.effect === "floor" ? Math.min(range.max, Math.max(range.min, craftFloorTier(env, range.max))) : range.min;
    return { ...env.deps.rollAffixValueInTierRange(mod, min, range.max), craftSource: "spore" };
  }
  function craftOmenSpec(env, key, side) {
    const armed = env.deps.normalizeCraftOmen({ key, side });
    return armed && { ...armed, effect: env.deps.CRAFT_OMENS.effects[armed.key].effect };
  }
  function craftArmOmen(env, state, key, side) {
    if (!key) {
      state.craftOmen = null;
      return { ok: true };
    }
    if (!env.deps.CRAFT_OMENS.keys.includes(key)) return { ok: false, reason: env.deps._t("알 수 없는 뿌리입니다.") };
    if ((state.currencies[key] || 0) < 1) return { ok: false, reason: env.deps._t("{name}가 없습니다.", { name: env.deps._t(env.deps.ORB_DB[key].name) }) };
    state.craftOmen = env.deps.normalizeCraftOmen({ key, side });
    return { ok: true };
  }
  function craftOnOmenSide(env, item, stat, omen) {
    return !omen || omen.effect !== "side" || craftStoredAffixKind(env, item, stat) === omen.side;
  }
  function craftFilterOmenMods(pool, omen) {
    return !omen || omen.effect !== "side" ? pool : pool.filter((mod) => craftAffixKind(mod) === omen.side);
  }
  function craftSideReason(env, item, action, omen, sporeMode) {
    const label = omen.side === "prefix" ? "접두어" : "접미어";
    if (env.basicActions.includes(action)) return craftSideRollReason(env, item, action, omen, sporeMode);
    const lines = action === "annulment" ? env.deps.getAnnulmentRemovableStats(item).map((row) => row.stat) : [...item.stats, ...item.chaosInfusion ? [item.chaosInfusion] : []].filter((stat) => !stat.lockedByHoney && !stat.lockedByRift);
    return lines.some((stat) => craftOnOmenSide(env, item, stat, omen)) ? "" : env.deps._t("변경 가능한 {label} 옵션이 없습니다.", { label });
  }
  function craftSideRollReason(env, item, action, omen, sporeMode) {
    const label = omen.side === "prefix" ? "접두어" : "접미어";
    const kept = env.rerollActions.includes(action) ? item.stats.filter((stat) => craftKeptOnReroll(item, stat) || !craftOnOmenSide(env, item, stat, omen)) : item.stats;
    if (sporeMode !== "none" && kept.some((stat) => craftGetSource(env, stat) === "spore")) return "보존되는 수확 옵션이 있어 수확 제작을 함께 쓸 수 없습니다.";
    const pool = craftFilterOmenMods(env.deps.getOpenAffixMods({ ...item, stats: kept }, "rare"), omen);
    if (!pool.length) return env.deps._t("{label}에 새로 부여할 수 있는 옵션이나 빈자리가 없습니다.", { label });
    return sporeMode !== "none" && !craftFilterSporeMods(env, pool, sporeMode).length ? env.deps._t("{label}에 선택한 수확 계열 옵션을 부여할 수 없습니다.", { label }) : "";
  }
  function craftOmenReason(env, item, action, omen, sporeMode = "none") {
    if (!omen || !env.deps.CRAFT_OMENS.effects[omen.key].actions.includes(action)) return "이 재화에는 적용되지 않습니다.";
    if (!item) return "장비를 선택하세요.";
    if (omen.effect === "side") return craftSideReason(env, item, action, omen, sporeMode);
    if (["regal", "exalted"].includes(action) && sporeMode !== "none") return "옵션 추가 시 수확 제작과 함께 쓸 수 없습니다.";
    return "";
  }
  function craftOmenFits(env, item, action, omen, sporeMode = "none") {
    return !craftOmenReason(env, item, action, omen, sporeMode);
  }
  function craftArmedSideReason(env, state, item, action, sporeMode = "none") {
    const armed = env.deps.normalizeCraftOmen(state.craftOmen), omen = armed && craftOmenSpec(env, armed.key, armed.side);
    if (!omen || omen.effect !== "side" || !env.deps.CRAFT_OMENS.effects[omen.key].actions.includes(action) || !(state.currencies[omen.key] > 0)) return "";
    return craftOmenReason(env, item, action, omen, sporeMode);
  }
  function craftOmenFor(env, state, action, item, sporeMode = "none") {
    const armed = env.deps.normalizeCraftOmen(state.craftOmen), omen = armed && (state.currencies[armed.key] || 0) > 0 ? craftOmenSpec(env, armed.key, armed.side) : null;
    return craftOmenFits(env, item, action, omen, sporeMode) ? omen : null;
  }
  function craftSpendOmen(env, state, omen) {
    if (!omen) return "";
    state.currencies[omen.key] = Math.max(0, (state.currencies[omen.key] || 0) - 1);
    state.craftOmen = null;
    return `, ${env.deps._t(env.deps.ORB_DB[omen.key].name)}`;
  }
  function craftFloorTier(env, tier) {
    return Math.max(1, Math.ceil(tier * env.deps.CRAFT_OMENS.floorShare));
  }
  function craftRollOmenLine(env, mod, tier, omen) {
    return omen && omen.effect === "floor" ? env.deps.rollAffixValueInTierRange(mod, craftFloorTier(env, tier), tier) : env.deps.rollAffixValue(mod, tier);
  }
  function craftWeighOmenPool(env, item, pool, omen, picked = []) {
    const candidates = craftFilterOmenMods(pool, omen);
    if (!omen || omen.effect !== "weave") return candidates;
    const held = new Set([...item.stats || [], ...picked].flatMap(env.deps.getAffixTags));
    return candidates.map((mod) => env.deps.getAffixTags(mod).some((tag) => held.has(tag)) ? { ...mod, weight: (Number(mod.weight) || 1) * env.deps.CRAFT_OMENS.weaveMul } : mod);
  }
  function craftPickAddMod(env, item, omen) {
    return env.deps.pickWeightedMod(craftWeighOmenPool(env, item, env.deps.getOpenAffixMods(item, "rare"), omen));
  }
  function craftPickPruneLine(env, removable, omen) {
    const tiered = removable.filter((row) => !env.deps.isFixedEquipmentAffix(row.stat) && Number(row.stat.tier) > 0);
    if (!omen || omen.effect !== "prune" || !tiered.length) return env.deps.rndChoice(removable);
    const low = Math.min(...tiered.map((row) => Number(row.stat.tier)));
    return env.deps.rndChoice(tiered.filter((row) => Number(row.stat.tier) === low));
  }
  function craftOmenRerollOptions(env, item, tier, omen) {
    if (!omen) return {};
    const before = { ...item, stats: item.stats.slice() };
    return {
      side: omen.effect === "side" ? omen.side : "",
      rollLine: (mod) => craftRollOmenLine(env, mod, tier, omen),
      weigh: (pool, picked) => craftWeighOmenPool(env, before, pool, omen, picked)
    };
  }

  // modules/domain/equipment-craft-results.mjs
  function craftAddedLine(env, item, options) {
    if (options.guaranteedStat) return options.guaranteedStat;
    const mod = options.addedMod || craftPickAddMod(env, item, options.omen);
    return mod ? craftRollOmenLine(env, mod, env.deps.getItemCraftTier(item), options.omen) : null;
  }
  function craftApplyBasic(env, item, action, options = {}) {
    if (!env.basicActions.includes(action)) throw Error("지원하지 않는 기본 제작");
    const tier = env.deps.getItemCraftTier(item), guaranteed = options.guaranteedStat || null;
    if (craftBasicRule(env, action).kind === "add") {
      const line = craftAddedLine(env, item, options);
      if (line) item.stats.push(line);
      item.rarity = craftBasicRule(env, action).rarity;
      env.deps.updateItemName(item);
      return;
    }
    item.rarity = craftBasicRule(env, action).rarity;
    env.deps.rerollExplicitMods(item, item.rarity, tier, { guaranteedStat: guaranteed, rerollChaosInfusion: item.rarity === "rare", ...craftOmenRerollOptions(env, item, tier, options.omen) });
  }
  function craftCraftFields(env, item) {
    return JSON.parse(JSON.stringify(Object.fromEntries(env.CRAFT_FIELDS.map((key) => [key, item[key] === void 0 ? null : item[key]]))));
  }
  function craftPutCraftFields(item, fields) {
    Object.assign(item, JSON.parse(JSON.stringify(fields)));
  }
  function craftLineMark(stat) {
    return stat ? [stat.id, Number(stat.val), Math.floor(Number(stat.tier) || 0)] : null;
  }
  function craftCraftMark(fields) {
    return JSON.stringify([
      fields.rarity || null,
      fields.name || null,
      craftLineMark(fields.chaosInfusion),
      (fields.stats || []).map(craftLineMark)
    ]);
  }
  function craftSameCraftFields(env, item, fields) {
    return craftCraftMark(craftCraftFields(env, item)) === craftCraftMark(fields);
  }
  function craftFindCraftItem(state, id) {
    return (state.inventory || []).find((row) => row && row.id === id) || Object.values(state.equipment || {}).find((row) => row && row.id === id) || null;
  }
  function craftCraftBasic(env, state, item, action, options) {
    const before = options.omen && options.omen.effect === "choice" ? JSON.parse(JSON.stringify(item)) : null;
    craftApplyBasic(env, item, action, options);
    if (!before) return;
    const others = Array.from({ length: env.deps.CRAFT_OMENS.choices - 1 }, () => {
      const copy = JSON.parse(JSON.stringify(before));
      const guaranteedStat = options.guaranteedFor ? options.guaranteedFor(copy) : options.guaranteedStat;
      craftApplyBasic(env, copy, action, { ...options, addedMod: null, guaranteedStat });
      return craftCraftFields(env, copy);
    });
    state.craftChoice = { itemId: item.id, options: [craftCraftFields(env, item), ...others] };
  }
  function craftPendingChoice(env, state) {
    const choice = state.craftChoice;
    if (!choice) return null;
    const item = craftFindCraftItem(state, choice.itemId);
    if (item && craftSameCraftFields(env, item, choice.options[0])) return { item, options: choice.options };
    state.craftChoice = null;
    return null;
  }
  function craftChoiceWaitReason(env, state) {
    return craftPendingChoice(env, state) ? "성화의 뿌리로 굴린 결과 가운데 하나를 먼저 고르세요." : "";
  }
  function craftFossilCraftReason(env, state, item, fossil) {
    return craftBuildLockReason(state) || craftChoiceWaitReason(env, state) || craftGetFossilUseReason(env, item, fossil, state.season, state.currencies);
  }
  function craftPickChoice(env, state, index) {
    const pending = craftPendingChoice(env, state);
    if (!pending || !pending.options[index]) return null;
    craftPutCraftFields(pending.item, pending.options[index]);
    state.craftChoice = null;
    return pending.item;
  }
  function craftNormalizeImprint(value) {
    return value && typeof value === "object" && ["magic", "rare"].includes(value.rarity) && Array.isArray(value.stats) ? value : null;
  }
  function craftImprintBlock(env, item) {
    if (!item) return "아이템을 선택하세요.";
    if (item.corrupted) return "타락한 장비는 새기거나 되돌릴 수 없습니다.";
    return craftKeepsKind(item) ? env.KEEPS_KIND : "";
  }
  function craftEngraveReason(env, state, item) {
    const reason = craftBuildLockReason(state) || craftImprintBlock(env, item);
    if (reason) return reason;
    if (!["magic", "rare"].includes(item.rarity)) return "마법이나 희귀 장비에 새깁니다.";
    return (state.currencies[env.IMPRINT_KEY] || 0) > 0 ? "" : env.deps._t("{name}이 없습니다.", { name: env.deps._t(env.deps.ORB_DB[env.IMPRINT_KEY].name) });
  }
  function craftEngrave(env, state, item) {
    const reason = craftEngraveReason(env, state, item);
    if (reason) return { ok: false, reason };
    state.currencies[env.IMPRINT_KEY] -= 1;
    item.imprint = craftCraftFields(env, item);
    return { ok: true };
  }
  function craftRestoreReason(env, item) {
    return craftImprintBlock(env, item) || (craftNormalizeImprint(item.imprint) ? "" : "새긴 기억이 없습니다.");
  }
  function craftRestoreImprint(env, item) {
    const reason = craftRestoreReason(env, item);
    if (reason) return { ok: false, reason };
    craftPutCraftFields(item, item.imprint);
    delete item.imprint;
    return { ok: true };
  }

  // modules/domain/equipment-crafting.mjs
  function createCraftEnvironment(deps) {
    const env = { deps };
    env.labels = Object.freeze({ spore: "수확", fossil: "화석", transplant: "이식" });
    env.sporeActions = /* @__PURE__ */ new Set(["transmute", "augment", "alteration", "alchemy", "exalted", "regal", "chaos"]);
    env.sporeRerolls = /* @__PURE__ */ new Set(["transmute", "alteration", "alchemy", "chaos"]);
    env.sporeStatIds = Object.freeze(Object.fromEntries(Object.entries(env.deps.AFFIX_TAG_LISTS.spore).map(([mode, rule]) => [mode, new Set(env.deps.resolveAffixTagList(rule, env.deps.MOD_DB))])));
    env.KEEPS_KIND = "고유 장비, 융합 유물, 전당 소장품에는 쓸 수 없습니다.";
    env.basicRules = Object.freeze(Object.fromEntries([
      ["transmute", "normal", "magic", "reroll"],
      ["alteration", "magic", "magic", "reroll"],
      ["alchemy", "normal", "rare", "reroll"],
      ["chaos", "rare", "rare", "reroll"],
      ["regal", "magic", "rare", "add"],
      ["exalted", "rare", "rare", "add"]
    ].map(([action, source, rarity, kind]) => [action, Object.freeze({ source, rarity, kind })])));
    env.basicActions = Object.freeze(Object.keys(env.basicRules));
    env.rerollActions = Object.freeze(env.basicActions.filter((action) => env.basicRules[action].kind === "reroll"));
    env.CRAFT_FIELDS = Object.freeze(["rarity", "name", "stats", "chaosInfusion"]);
    env.IMPRINT_KEY = "memoryImprint";
    return env;
  }
  function createEquipmentCrafting(deps) {
    const env = createCraftEnvironment(deps);
    return Object.freeze({
      basicActions: env.basicActions,
      rerollActions: env.rerollActions,
      basicRule: (...args) => craftBasicRule(env, ...args),
      basicFits: (...args) => craftBasicFits(env, ...args),
      applyBasic: (...args) => craftApplyBasic(env, ...args),
      sporePool: (...args) => craftSporePool(env, ...args),
      pickSporeMod: (...args) => craftPickSporeMod(env, ...args),
      rollSporeLine: (...args) => craftRollSporeLine(env, ...args),
      getSource: (...args) => craftGetSource(env, ...args),
      getLabel: (...args) => craftGetLabel(env, ...args),
      filterSporeMods: (...args) => craftFilterSporeMods(env, ...args),
      resolveAction: craftResolveAction,
      getBlockReason: (...args) => craftGetBlockReason(env, ...args),
      getSporeBlockReason: (...args) => craftGetSporeBlockReason(env, ...args),
      getFossilBlockReason: (...args) => craftGetFossilBlockReason(env, ...args),
      getRiftHarvestBlockReason: (...args) => craftGetRiftHarvestBlockReason(env, ...args),
      getFossilUseReason: (...args) => craftGetFossilUseReason(env, ...args),
      affixKind: craftAffixKind,
      storedAffixKind: (...args) => craftStoredAffixKind(env, ...args),
      keptOnReroll: craftKeptOnReroll,
      affixCounts: (...args) => craftAffixCounts(env, ...args),
      affixRoom: (...args) => craftAffixRoom(env, ...args),
      fitsRoom: craftFitsRoom,
      pickReplacement: (...args) => craftPickReplacement(env, ...args),
      affixHeader: (...args) => craftAffixHeader(env, ...args),
      omenSpec: (...args) => craftOmenSpec(env, ...args),
      armOmen: (...args) => craftArmOmen(env, ...args),
      omenFits: (...args) => craftOmenFits(env, ...args),
      omenReason: (...args) => craftOmenReason(env, ...args),
      armedSideReason: (...args) => craftArmedSideReason(env, ...args),
      onOmenSide: (...args) => craftOnOmenSide(env, ...args),
      filterOmenMods: craftFilterOmenMods,
      weighOmenPool: (...args) => craftWeighOmenPool(env, ...args),
      omenFor: (...args) => craftOmenFor(env, ...args),
      spendOmen: (...args) => craftSpendOmen(env, ...args),
      pickAddMod: (...args) => craftPickAddMod(env, ...args),
      pickPruneLine: (...args) => craftPickPruneLine(env, ...args),
      craftBasic: (...args) => craftCraftBasic(env, ...args),
      pendingChoice: (...args) => craftPendingChoice(env, ...args),
      choiceWaitReason: (...args) => craftChoiceWaitReason(env, ...args),
      fossilCraftReason: (...args) => craftFossilCraftReason(env, ...args),
      pickChoice: (...args) => craftPickChoice(env, ...args),
      normalizeImprint: craftNormalizeImprint,
      engraveReason: (...args) => craftEngraveReason(env, ...args),
      engrave: (...args) => craftEngrave(env, ...args),
      restoreReason: (...args) => craftRestoreReason(env, ...args),
      restoreImprint: (...args) => craftRestoreImprint(env, ...args),
      buildLockReason: craftBuildLockReason
    });
  }

  // modules/equipment-crafting-classic.mjs
  var rules = createEquipmentCrafting({
    get _t() {
      return _t;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get getItemExplicitOptionCount() {
      return getItemExplicitOptionCount;
    },
    get findStoredEquipmentAffix() {
      return findStoredEquipmentAffix;
    },
    get EXPLICIT_AFFIX_RULES() {
      return EXPLICIT_AFFIX_RULES;
    },
    get getOpenAffixMods() {
      return getOpenAffixMods;
    },
    get pickWeightedMod() {
      return pickWeightedMod;
    },
    get getCraftTierRangeForItem() {
      return getCraftTierRangeForItem;
    },
    get rollAffixValueInTierRange() {
      return rollAffixValueInTierRange;
    },
    get normalizeCraftOmen() {
      return normalizeCraftOmen;
    },
    get CRAFT_OMENS() {
      return CRAFT_OMENS;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getAnnulmentRemovableStats() {
      return getAnnulmentRemovableStats;
    },
    get rollAffixValue() {
      return rollAffixValue;
    },
    get getAffixTags() {
      return getAffixTags;
    },
    get rndChoice() {
      return rndChoice;
    },
    get isFixedEquipmentAffix() {
      return isFixedEquipmentAffix;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get rerollExplicitMods() {
      return rerollExplicitMods;
    },
    get updateItemName() {
      return updateItemName;
    },
    get AFFIX_TAG_LISTS() {
      return AFFIX_TAG_LISTS;
    },
    get resolveAffixTagList() {
      return resolveAffixTagList;
    },
    get MOD_DB() {
      return MOD_DB;
    }
  });
  var equipmentCrafting = rules;
  safeExposeGlobals({ equipmentCrafting });
})();
