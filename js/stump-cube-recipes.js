// GENERATED from modules/stump-cube-recipes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/stump-cube-recipes-equipment.mjs
  function cubeRecipeItems(group) {
    return group.map((entry) => entry.item);
  }
  function cubeRecipeBaseSlot(item) {
    return String(item && item.slot || "").replace(/[123]$/, "");
  }
  function cubeRecipeTopTier(list) {
    return Math.max(1, ...list.map((item) => Math.floor(Number(item.hiddenTier || item.itemTier) || 1)));
  }
  function cubeRecipeMakeEquipment(env, slot, tier, rarity, baseId) {
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === baseId) || env.deps.chooseItemBase(slot, tier, {});
    if (!base) return null;
    const level = env.deps.levelProgression.tierLevel(tier);
    const item = env.deps.createItemFromBase(base, rarity, tier, {
      affixTierCap: env.deps.levelProgression.affixCap(level),
      affixTierFloor: 1,
      tierWeightFalloff: env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    });
    return env.deps.levelProgression.stampItem(item, level);
  }
  function cubeRecipeEquipmentResult(env, groups, item) {
    return item ? { ok: true, consumed: groups.flat(), outputs: [{ kind: "equipment", item }] } : { ok: false, reason: env.deps._t("이 부위의 장비를 만들 수 없습니다.") };
  }
  function cubeRecipeMagicUpgrade(env, groups) {
    const gear = groups[0][0].item;
    return cubeRecipeEquipmentResult(env, groups, cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeTopTier([gear]), "rare", gear.baseId));
  }
  function cubeRecipeRareTierTarget(env, gear, state) {
    const top = cubeRecipeTopTier([gear]);
    const level = Math.max(Math.floor(Number(state.level) || 1), Math.floor(Number(gear.itemLevel) || 1));
    return Math.max(top, Math.min(top + 1, env.deps.levelProgression.maxDropTier(level)));
  }
  function cubeRecipeRareTier(env, groups, state) {
    const gear = groups[0][0].item;
    return cubeRecipeEquipmentResult(env, groups, cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeRareTierTarget(env, gear, state), "rare"));
  }
  function cubeRecipeHarvestArmour(env, groups) {
    const tier = cubeRecipeTopTier(groups.flat().map((entry) => entry.item)), item = env.deps.generateUniqueItem(tier, "갑옷", "풍작의 갑주", {});
    return cubeRecipeEquipmentResult(env, groups, item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
  }
  function cubeRecipeUniqueReroll(env, groups) {
    const gear = groups[0][0].item, tier = cubeRecipeTopTier([gear]);
    let item = null;
    for (let tries = 0; tries < 6 && (!item || item.name === gear.name); tries++) item = env.deps.generateUniqueItem(tier, cubeRecipeBaseSlot(gear), null, {});
    return cubeRecipeEquipmentResult(env, groups, item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
  }
  function cubeRecipeMaybeExceptional(env, item, chance, random) {
    const base = item && !item.exceptionalBase && Array.isArray(item.baseStats) ? item.baseStats.filter(Boolean) : [];
    if (base.length && random() < chance) env.deps.boostExceptionalBaseLine(item, base[Math.floor(random() * base.length)]);
  }
  function cubeRecipeUniqueRemake(env, [group], state, random) {
    const gear = group[0].item, tier = cubeRecipeTopTier(cubeRecipeItems(group)), item = env.deps.generateUniqueItem(tier, cubeRecipeBaseSlot(gear), gear.name, {});
    cubeRecipeMaybeExceptional(env, item, env.deps.STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE, random);
    return cubeRecipeEquipmentResult(env, [group], item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
  }
  function cubeRecipeRareExceptional(env, [group], state, random) {
    const gear = group[0].item, item = cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeTopTier(cubeRecipeItems(group)), "rare", gear.baseId);
    cubeRecipeMaybeExceptional(env, item, env.deps.STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE, random);
    return cubeRecipeEquipmentResult(env, [group], item);
  }
  function cubeRecipeSocketJewel(env, [[equipment], jewels], state, random) {
    if (!env.deps.equipmentSockets.openVoidSocket(equipment.item)) return { ok: false, reason: env.deps._t("이 장비에는 소켓을 더 뚫을 수 없습니다.") };
    const kept = jewels[Math.floor(random() * jewels.length)];
    const result = env.deps.equipmentSockets.insert(equipment.item, kept.item.id, state);
    if (!result.ok) {
      delete equipment.item.voidSocket;
      return result;
    }
    env.deps.equipmentSockets.fuse(equipment.item);
    return { ok: true, consumed: jewels.filter((entry) => entry !== kept), outputs: [{ kind: "equipment", existing: equipment.item }] };
  }

  // modules/domain/stump-cube-recipes-harvest.mjs
  function cubeRecipeMergedRoll(env, list, state, random) {
    const rolls = list.map((item) => Number(item.roll) || 1), cap = env.deps.stumpBox.rollCap(state), rule = env.deps.STUMP_CUBE_MERGE;
    const average = rolls.reduce((sum, roll) => sum + roll, 0) / rolls.length;
    const step = () => (rule.step[0] + Math.floor(random() * (rule.step[1] - rule.step[0] + 1))) / 100, luck = random();
    if (luck < rule.overChance) return { roll: average + rule.over, overCap: true };
    if (luck < rule.overChance + rule.bestChance) return { roll: Math.min(cap, Math.max(...rolls) + step()) };
    return { roll: Math.min(cap, average + step()) };
  }
  function cubeRecipeStumpMergeSpec(env, list, state, random) {
    return {
      family: "seed",
      color: list[0].color,
      ...cubeRecipeMergedRoll(env, list, state, random),
      golden: list.some((item) => item.golden === true),
      ancient: list.some((item) => item.ancient === true)
    };
  }
  function cubeRecipeStumpMerge(env, [group], state, random) {
    return { ok: true, consumed: group, outputs: [{ kind: "stump", spec: cubeRecipeStumpMergeSpec(env, cubeRecipeItems(group), state, random) }] };
  }
  function cubeRecipeStumpRecolor(env, [donors, [target]], state) {
    const item = target.item, roll = Number(item.roll) || 1;
    const spec = {
      family: "seed",
      color: donors[0].item.color,
      roll,
      overCap: roll > env.deps.stumpBox.rollCap(state),
      golden: item.golden === true,
      ancient: item.ancient === true
    };
    return { ok: true, consumed: [...donors, target], outputs: [{ kind: "stump", spec }] };
  }
  function cubeRecipeTalismanSource(group) {
    return cubeRecipeItems(group).every((item) => item.rarity === "rare") ? "radiantSealShard" : "strongSealShard";
  }
  function cubeRecipeTalismanUpgrade(env, [group], state, random) {
    return { ok: true, consumed: group, outputs: [{ kind: "stump", talisman: env.deps.talismans.roll(cubeRecipeTalismanSource(group), random) }] };
  }
  function cubeRecipeTalismanRerollLine(env, [[talisman], [vine]], state, random) {
    if (!env.deps.talismans.rerollStatLine(talisman.item, random)) return { ok: false, reason: env.deps._t("다시 쓸 일반 줄이 없는 부적입니다.") };
    return { ok: true, consumed: [vine], outputs: [{ kind: "stump", existing: talisman.item }] };
  }
  function cubeRecipeTalismanUniqueReroll(env, [group], state, random) {
    const talisman = env.deps.talismans.rollOtherUnique(cubeRecipeItems(group).map((item) => item.uniqueId), random);
    return { ok: true, consumed: group, outputs: [{ kind: "stump", talisman }] };
  }
  function cubeRecipeJewelTierRange(group) {
    const top = Math.max(1, ...cubeRecipeItems(group).map((item) => Math.floor(Number(item.hiddenTier) || 1)));
    return { min: Math.max(1, top - 1), max: top };
  }
  function cubeRecipeJewelFuse(env, [group], state, random) {
    const stats = env.deps.rollJewelCraftStats(3 + (random() < 0.35 ? 1 : 0), null, cubeRecipeJewelTierRange(group));
    if (!stats.length) return { ok: false, reason: env.deps._t("주얼 옵션을 굴리지 못했습니다.") };
    const id = env.deps.nextItemId();
    const jewel = {
      id,
      name: env.deps._t("{id} 주얼", { id: env.deps.getStatName(stats[0].id) }),
      tier: 1,
      hiddenTier: Math.max(1, ...stats.map((stat) => stat.tier || 1)),
      rarity: "rare",
      stats
    };
    return { ok: true, consumed: group, outputs: [{ kind: "jewel", item: jewel }] };
  }
  function cubeRecipeCoreRerollLine(env, [[core], [vine]], state, random) {
    if (!env.deps.coreItems.rerollLine(core.item, random)) return { ok: false, reason: env.deps._t("다시 굴릴 수 없는 코어입니다.") };
    return { ok: true, consumed: [vine], outputs: [{ kind: "core", existing: core.item }] };
  }
  function cubeRecipeCoreReroll(env, [group]) {
    return { ok: true, consumed: group, outputs: [{ kind: "core", item: env.deps.coreItems.roll() }] };
  }

  // modules/domain/stump-cube-recipes-preview.mjs
  function cubeRecipeMagicPreview(env, [[{ item }]]) {
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === item.baseId);
    return {
      label: env.deps._t("희귀 {value}", { value: base ? base.name : item.name }),
      tier: cubeRecipeTopTier([item]),
      quality: 0,
      keep: "베이스와 티어",
      change: "베이스 수치와 추가 옵션 새로 굴림",
      note: env.deps._t("품질과 제작 효과 초기화")
    };
  }
  function cubeRecipeRarePreview(env, [[{ item }]], state) {
    const tier = cubeRecipeRareTierTarget(env, item, state), capped = tier === cubeRecipeTopTier([item]);
    return {
      label: env.deps._t("희귀 장비 1개"),
      tier,
      quality: 0,
      keep: "장비 부위",
      change: "베이스와 옵션 새로 굴림",
      note: capped ? "현재 티어 상한에 도달함, 품질과 제작 효과 초기화" : "품질과 제작 효과 초기화"
    };
  }
  function cubeRecipeUniqueRemakePreview(env, [group]) {
    const item = group[0].item, unique = env.deps.UNIQUE_DB.find((row) => row.name === (env.deps.RENAMED_UNIQUES[item.name] || item.name));
    if (!unique) return {
      label: env.deps._t("새 고유 장비 1개"),
      quality: 0,
      keep: "",
      change: "현재 목록에서 고유 종류와 옵션 새로 굴림",
      note: env.deps._t("이전 고유 정보 없음, 결과 티어는 고유 종류에 따라 결정, 품질과 제작 효과 초기화")
    };
    return {
      label: item.name,
      tier: unique.reqTier || cubeRecipeTopTier(cubeRecipeItems(group)),
      quality: 0,
      keep: "고유 종류",
      change: "베이스 수치와 옵션 새로 굴림",
      note: env.deps._t("특출난 베이스 가능, 품질과 제작 효과 초기화")
    };
  }
  function cubeRecipeRareExceptionalPreview(env, [group]) {
    const item = group[0].item, base = env.deps.BASE_ITEM_DB.find((row) => row.id === item.baseId);
    return {
      label: env.deps._t("희귀 {value}", { value: base ? base.name : item.name }),
      tier: cubeRecipeTopTier(cubeRecipeItems(group)),
      quality: 0,
      keep: "베이스",
      change: "베이스 수치와 옵션 새로 굴림",
      note: env.deps._t("특출난 베이스 가능, 품질과 제작 효과 초기화")
    };
  }
  function cubeRecipeUniqueRerollPreview(env, [[{ item }]]) {
    return {
      label: env.deps._t("새 고유 장비 1개"),
      quality: 0,
      keep: "장비 부위",
      change: `T${cubeRecipeTopTier([item])} 기준으로 고유 종류와 옵션 새로 굴림`,
      note: env.deps._t("결과 티어는 고유 종류에 따라 결정, 동일 고유 가능, 품질과 제작 효과 초기화")
    };
  }
  function cubeRecipeSocketPreview(env, [[{ item }]]) {
    return {
      label: item.name,
      tier: cubeRecipeTopTier([item]),
      quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
      keep: "장비와 기존 옵션, 품질",
      change: "세 주얼 중 하나를 공허 소켓에 융합",
      note: env.deps._t("주얼 해제 불가능")
    };
  }
  function cubeRecipeMergeRange(env, list, state) {
    const cap = env.deps.stumpBox.rollCap(state), rule = env.deps.STUMP_CUBE_MERGE;
    const average = list.reduce((sum, item) => sum + (Number(item.roll) || 1), 0) / list.length;
    const [low, high] = rule.step.map((step) => Math.round(Math.min(cap, average + step / 100) * 100));
    return low === high ? String(low) : `${low}~${high}`;
  }
  function cubeRecipeMergePreview(env, [group], state) {
    const list = cubeRecipeItems(group), label = env.deps._t("{label} 씨앗", { label: env.deps.STUMP_BOX_COLORS[list[0].color].label });
    const marks = [list.some((item) => item.golden === true) ? "황금" : "", list.some((item) => item.ancient === true) ? "고대" : ""].filter(Boolean);
    return {
      label,
      quality: cubeRecipeMergeRange(env, list, state),
      qualityCap: Math.round(env.deps.stumpBox.rollCap(state) * 100),
      keep: ["색", ...marks].join(", "),
      change: "성장 경험치 초기화",
      note: env.deps._t("새 씨앗 1개로 합쳐짐")
    };
  }
  function cubeRecipeRecolorPreview(env, [donors, [{ item }]], state) {
    const label = env.deps._t("{label} 씨앗", { label: env.deps.STUMP_BOX_COLORS[donors[0].item.color].label });
    return {
      label,
      quality: Math.round((Number(item.roll) || 1) * 100),
      qualityCap: Math.round(env.deps.stumpBox.rollCap(state) * 100),
      keep: "품질",
      change: "색 바뀜, 성장 경험치 초기화"
    };
  }
  function cubeRecipeTalismanUpgradePreview(env, [group]) {
    const source = cubeRecipeTalismanSource(group), rule = env.deps.TALISMAN_UNSEAL_RULES[source], [low, high] = rule.lines;
    return {
      label: env.deps._t("새 부적 1개"),
      keep: "",
      change: `일반 부적 옵션 ${low === high ? low : `${low}~${high}`}줄 새로 굴림, 성장 초기화`,
      note: env.deps._t("{name} 등급, 고유 부적 가능", { name: env.deps._t(env.deps.ORB_DB[source].name) })
    };
  }
  function cubeRecipeTalismanLinePreview([[{ item }]]) {
    const possible = item.lines.some((line) => line.kind === "stat" && !line.wax);
    return {
      label: item.name,
      keep: "부적과 나머지 옵션, 성장",
      change: "일반 옵션 1줄의 종류와 수치 새로 굴림",
      reason: possible ? "" : "다시 쓸 일반 줄이 없는 부적입니다."
    };
  }
  function cubeRecipeJewelPreview(env, [group]) {
    const range = cubeRecipeJewelTierRange(group);
    return { label: env.deps._t("희귀 주얼 1개"), keep: "", change: env.deps._t("옵션 3~4줄 새로 굴림 (T{min}~T{max})", { min: range.min, max: range.max }) };
  }
  function cubeRecipeCurrencyPreview(env, make, groups, state) {
    const result = make(groups, state);
    if (!result.ok) return { label: "", reason: result.reason };
    const output = result.outputs[0];
    return { label: env.deps._t("{name} {amount}개", { name: env.deps._t(env.deps.ORB_DB[output.key].name), amount: output.amount }), keep: "재료의 속성", change: "재료 2개를 재화로 변환" };
  }
  function cubeRecipePreview(env, recipeId, groups, state) {
    const handler = env.PREVIEWS[recipeId];
    return handler ? handler(groups, state) : null;
  }

  // modules/domain/stump-cube-recipes-run.mjs
  function cubeRecipeRun(env, recipeId, groups, state, random = Math.random) {
    const handler = env.HANDLERS[recipeId];
    return handler ? handler(groups, state, random) : { ok: false, reason: env.deps._t("알 수 없는 조합법입니다.") };
  }

  // modules/domain/stump-cube-recipes.mjs
  function createStumpCubeRecipes(deps) {
    const env = { deps };
    env.HANDLERS = Object.freeze({
      equip_magic_upgrade: (...args) => cubeRecipeMagicUpgrade(env, ...args),
      equip_rare_tier: (...args) => cubeRecipeRareTier(env, ...args),
      equip_unique_remake: (...args) => cubeRecipeUniqueRemake(env, ...args),
      equip_unique_reroll: (...args) => cubeRecipeUniqueReroll(env, ...args),
      equip_socket_jewel: (...args) => cubeRecipeSocketJewel(env, ...args),
      equip_rare_exceptional: (...args) => cubeRecipeRareExceptional(env, ...args),
      equip_harvest_armour: (...args) => cubeRecipeHarvestArmour(env, ...args),
      stump_merge: (...args) => cubeRecipeStumpMerge(env, ...args),
      stump_recolor: (...args) => cubeRecipeStumpRecolor(env, ...args),
      talisman_upgrade: (...args) => cubeRecipeTalismanUpgrade(env, ...args),
      talisman_reroll_line: (...args) => cubeRecipeTalismanRerollLine(env, ...args),
      talisman_unique_reroll: (...args) => cubeRecipeTalismanUniqueReroll(env, ...args),
      jewel_fuse: (...args) => cubeRecipeJewelFuse(env, ...args),
      core_reroll: (...args) => cubeRecipeCoreReroll(env, ...args),
      core_reroll_line: (...args) => cubeRecipeCoreRerollLine(env, ...args),
      // 뿌리 기폭제(12번 루프 32, 2026-11-04 전: 호박석 기폭제): 결과는 재화(stump-cube.js STORERS.currency).
      root_catalyst: (groups, state) => env.deps.sapCatalysts.rootRecipe(groups, state),
      // 열매 기름(12번 루프 36): 결과는 재화.
      fruit_oil: (groups, state) => env.deps.gardenOils.fruitRecipe(groups, state),
      // 기폭제 바꾸기: 결과는 재화, 비용은 조합할 때 무작위로 정한다(result.paid).
      catalyst_exchange: (groups, state, random) => env.deps.sapCatalysts.exchangeRecipe(groups, state, random)
    });
    env.PREVIEWS = Object.freeze({
      equip_magic_upgrade: (...args) => cubeRecipeMagicPreview(env, ...args),
      equip_rare_tier: (...args) => cubeRecipeRarePreview(env, ...args),
      equip_unique_remake: (...args) => cubeRecipeUniqueRemakePreview(env, ...args),
      equip_unique_reroll: (...args) => cubeRecipeUniqueRerollPreview(env, ...args),
      equip_socket_jewel: (...args) => cubeRecipeSocketPreview(env, ...args),
      equip_rare_exceptional: (...args) => cubeRecipeRareExceptionalPreview(env, ...args),
      stump_merge: (...args) => cubeRecipeMergePreview(env, ...args),
      stump_recolor: (...args) => cubeRecipeRecolorPreview(env, ...args),
      talisman_upgrade: (...args) => cubeRecipeTalismanUpgradePreview(env, ...args),
      talisman_reroll_line: cubeRecipeTalismanLinePreview,
      talisman_unique_reroll: () => ({ label: env.deps._t("고유 부적 1개"), keep: "", change: "고유 종류와 옵션 새로 굴림, 성장 초기화" }),
      jewel_fuse: (...args) => cubeRecipeJewelPreview(env, ...args),
      core_reroll: () => ({ label: env.deps._t("새 코어 1개"), keep: "", change: env.deps._t("옵션 {lines}줄 새로 굴림", { lines: env.deps.CORE_ITEM_RULES.lines }), note: env.deps._t("완전한 코어 가능") }),
      core_reroll_line: ([[{ item }]]) => ({ label: item.name, keep: "코어와 나머지 옵션", change: "옵션 1줄의 종류와 수치 새로 굴림" }),
      root_catalyst: (groups, state) => cubeRecipeCurrencyPreview(env, env.deps.sapCatalysts.rootRecipe, groups, state),
      fruit_oil: (groups, state) => cubeRecipeCurrencyPreview(env, env.deps.gardenOils.fruitRecipe, groups, state),
      catalyst_exchange: ([[{ item }]], state) => {
        const plan = env.deps.sapCatalysts.exchangePlan(item, state);
        return plan.reason ? { label: "", reason: plan.reason } : { label: env.deps._t("{name} {value}개", { name: env.deps._t(env.deps.ORB_DB[plan.kind.key].name), value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }), keep: "", change: env.deps._t("다른 기폭제 {value}개를 덩굴 색으로 변환", { value: env.deps.STUMP_CUBE_CATALYST_EXCHANGE }) };
      }
    });
    return Object.freeze({ run: (...args) => cubeRecipeRun(env, ...args), preview: (...args) => cubeRecipePreview(env, ...args), baseSlot: cubeRecipeBaseSlot, has: (id) => !!env.HANDLERS[id] });
  }

  // modules/stump-cube-recipes-classic.mjs
  var rules = createStumpCubeRecipes({
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get chooseItemBase() {
      return chooseItemBase;
    },
    get levelProgression() {
      return levelProgression;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() {
      return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF;
    },
    get _t() {
      return _t;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get boostExceptionalBaseLine() {
      return boostExceptionalBaseLine;
    },
    get STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE() {
      return STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE;
    },
    get STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE() {
      return STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_CUBE_MERGE() {
      return STUMP_CUBE_MERGE;
    },
    get talismans() {
      return talismans;
    },
    get rollJewelCraftStats() {
      return rollJewelCraftStats;
    },
    nextItemId() {
      window.GameModules.state.session.itemIdCounter += 1;
      return window.GameModules.state.session.itemIdCounter;
    },
    get getStatName() {
      return getStatName;
    },
    get coreItems() {
      return coreItems;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get RENAMED_UNIQUES() {
      return RENAMED_UNIQUES;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get TALISMAN_UNSEAL_RULES() {
      return TALISMAN_UNSEAL_RULES;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get sapCatalysts() {
      return sapCatalysts;
    },
    get gardenOils() {
      return gardenOils;
    },
    get CORE_ITEM_RULES() {
      return CORE_ITEM_RULES;
    },
    get STUMP_CUBE_CATALYST_EXCHANGE() {
      return STUMP_CUBE_CATALYST_EXCHANGE;
    }
  });
  var stumpCubeRecipes = Object.freeze({
    ...rules,
    run: (recipeId, groups, state = game, random = Math.random) => rules.run(recipeId, groups, state, random),
    preview: (recipeId, groups, state = game) => rules.preview(recipeId, groups, state)
  });
  safeExposeGlobals({ stumpCubeRecipes });
})();
