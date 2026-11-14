// GENERATED from modules/stump-cube*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/stump-cube-geometry.mjs
  function cubeCoveredCells(env, x, y, w, h) {
    if (x + w > env.SIZE || y + h > env.SIZE) return null;
    const cells = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push((y + dy) * env.SIZE + x + dx);
    return cells;
  }
  function cubeSpotFits(env, taken, x, y, ...selection) {
    const [w, h] = selection;
    const cells = cubeCoveredCells(env, x, y, w, h);
    return !!cells && !cells.some((cell) => taken.has(cell));
  }

  // modules/domain/stump-cube-state.mjs
  function cubeEmpty() {
    return { slots: [], known: null };
  }
  function cubeInGrid(env, value) {
    return Number.isInteger(value) && value >= 0 && value < env.SIZE;
  }
  function cubeValidSlot(env, raw) {
    return !!raw && env.KINDS.includes(raw.kind) && (typeof raw.id === "string" || Number.isSafeInteger(raw.id)) && cubeInGrid(env, raw.x) && cubeInGrid(env, raw.y);
  }
  function cubeNormalize(env, raw) {
    const slots = (raw && Array.isArray(raw.slots) ? raw.slots : []).filter((...args) => cubeValidSlot(env, ...args)).slice(0, env.SIZE * env.SIZE).filter((slot, at, all) => all.findIndex((other) => other.kind === slot.kind && other.id === slot.id) === at).map(({ kind, id, x, y }) => ({ kind, id, x, y }));
    const known = raw && Array.isArray(raw.known) ? env.deps.STUMP_CUBE_RECIPES.map((recipe) => recipe.id).filter((id) => raw.known.includes(id)) : null;
    return { slots, known };
  }
  function cubeOf(state) {
    if (!state.stumpCube || !Array.isArray(state.stumpCube.slots)) state.stumpCube = cubeEmpty();
    return state.stumpCube;
  }

  // modules/domain/stump-cube-materials.mjs
  function cubeIdentity(env, kind, item) {
    return kind === "equipment" ? env.deps.equipmentLoadoutRuntime.ensureItemIdentity(item) : item.id;
  }
  function cubeStumpItem(env, state, id) {
    const box = state.stumpBox;
    if (!box || !Array.isArray(box.items) || env.deps.stumpBox.isPlaced(state, id)) return null;
    return box.items.find((item) => item.id === id) || null;
  }
  function cubeUsable(env, kind, item, keepLocked = false) {
    if (!item || !keepLocked && item.locked) return false;
    return kind !== "equipment" || !env.deps.equipmentLoadoutRuntime.isReferenced(item);
  }
  function cubeFootprint(env, kind, item) {
    if (kind !== "equipment") return { w: 1, h: 1 };
    const size = env.deps.getEquipmentInventoryFootprint(item);
    return { w: Math.min(env.SIZE, size.columns), h: Math.min(env.SIZE, size.rows) };
  }
  function cubeReadContents(env, state) {
    const taken = /* @__PURE__ */ new Set(), list = [];
    const slots = (state.stumpCube?.slots || []).filter((slot) => {
      const item = env.FINDERS[slot.kind](state, slot.id);
      if (!cubeUsable(env, slot.kind, item, true)) return false;
      const { w, h } = cubeFootprint(env, slot.kind, item), cells = cubeCoveredCells(env, slot.x, slot.y, w, h);
      if (!cells || cells.some((cell) => taken.has(cell))) return false;
      cells.forEach((cell) => taken.add(cell));
      list.push({ kind: slot.kind, id: slot.id, item, x: slot.x, y: slot.y, w, h });
      return true;
    });
    return { slots, list };
  }
  function cubeEntries(env, state) {
    const cube = cubeOf(state), contents = cubeReadContents(env, state);
    cube.slots = contents.slots;
    return contents.list;
  }

  // modules/domain/stump-cube-discovery.mjs
  function cubeIsRevealed(env, recipe, state) {
    const rule = recipe.reveal || {};
    if (rule.hidden) return false;
    if (rule.content && !env.deps.contentProgression.isUnlocked(rule.content, state)) return false;
    if (rule.loop && (Number(state.season) || 1) < rule.loop) return false;
    return !rule.harvest || rule.harvest.some((kind) => env.deps.stumpBox.hasHarvested(state, kind));
  }
  function cubeRevealed(env, state) {
    return env.deps.STUMP_CUBE_RECIPES.filter((recipe) => cubeIsRevealed(env, recipe, state));
  }
  function cubeLearn(env, state) {
    const cube = cubeOf(state), open = cubeRevealed(env, state), known = cube.known;
    cube.known = env.deps.STUMP_CUBE_RECIPES.map((recipe) => recipe.id).filter((id) => (known || []).includes(id) || open.some((recipe) => recipe.id === id));
    return known ? open.filter((recipe) => !known.includes(recipe.id)) : [];
  }

  // modules/domain/stump-cube-matching.mjs
  function cubeOneOf(value, allowed) {
    return allowed === void 0 || [].concat(allowed).includes(value);
  }
  function cubeFitsRipeness(rule, entry) {
    return rule.ripe ? entry.item.ripe === true : entry.kind !== "wallet" && !(rule.ripe === false && entry.item.ripe === true);
  }
  function cubeMaterialKind(entry) {
    return entry.kind === "wallet" ? "stump" : entry.kind;
  }
  function cubeFitsRule(env, rule, entry) {
    if (cubeMaterialKind(entry) !== rule.kind || !cubeOneOf(entry.item.family, rule.family) || !cubeOneOf(entry.item.rarity, rule.rarity) || !cubeOneOf(entry.item.path, rule.path)) return false;
    if (!cubeOneOf(entry.item.uniqueEffectKey, rule.uniqueKey)) return false;
    if (!cubeFitsRipeness(rule, entry)) return false;
    return !rule.socketable || env.deps.equipmentSockets.canChisel(entry.item);
  }
  function cubePickAlike(env, rule, fitting) {
    if (!rule.same) return fitting.slice(0, rule.count);
    const sets = /* @__PURE__ */ new Map();
    fitting.forEach((entry) => {
      const key = rule.same.map((name) => env.SAME_KEYS[name](entry)).join("|");
      sets.set(key, [...sets.get(key) || [], entry]);
    });
    return [...sets.values()].reduce((best, set) => set.length > best.length ? set : best, []).slice(0, rule.count);
  }
  function cubeClashes(env, rule, picked, groups) {
    return !!rule.unlike && picked.some((entry) => groups.flat().some((other) => env.SAME_KEYS[rule.unlike](other) === env.SAME_KEYS[rule.unlike](entry)));
  }
  function cubeAssign(env, recipe, list, partial = false) {
    const rest = list.slice(), groups = [];
    for (const rule of recipe.inputs) {
      const picked = cubePickAlike(env, rule, rest.filter((entry) => cubeFitsRule(env, rule, entry)));
      if (!partial && picked.length !== rule.count) return null;
      if (cubeClashes(env, rule, picked, groups)) return null;
      picked.forEach((entry) => rest.splice(rest.indexOf(entry), 1));
      groups.push(picked);
    }
    return rest.length ? null : groups;
  }
  function cubeMatch(env, state) {
    const list = cubeEntries(env, state);
    if (!list.length || list.some((entry) => !cubeUsable(env, entry.kind, entry.item))) return null;
    for (const recipe of env.deps.STUMP_CUBE_RECIPES) {
      const groups = cubeAssign(env, recipe, list);
      if (groups) return { recipe, groups };
    }
    return null;
  }
  function cubeMissingRecipes(env, state) {
    const list = cubeReadContents(env, state).list;
    if (!list.length || list.some((entry) => !cubeUsable(env, entry.kind, entry.item))) return [];
    return cubeRevealed(env, state).flatMap((recipe) => {
      const groups = cubeAssign(env, recipe, list, true);
      if (!groups) return [];
      const missing = recipe.inputs.map((rule, inputIndex) => ({ rule, inputIndex, picked: groups[inputIndex], count: rule.count - groups[inputIndex].length })).filter((row) => row.count > 0);
      return missing.length ? [{ recipe, missing, missingCount: missing.reduce((sum, row) => sum + row.count, 0) }] : [];
    }).sort((a, b) => a.missingCount - b.missingCount);
  }
  function cubePreview(env, state) {
    const list = cubeReadContents(env, state).list;
    if (!list.length || list.some((entry) => !cubeUsable(env, entry.kind, entry.item))) return null;
    for (const recipe of cubeRevealed(env, state)) {
      const groups = cubeAssign(env, recipe, list);
      if (groups) return { recipe, ...env.deps.stumpCubeRecipes.preview(recipe.id, groups, state) };
    }
    return null;
  }
  function cubeMissingCost(recipe, state) {
    return Object.entries(recipe.cost || {}).filter(([key, need]) => (state.currencies[key] || 0) < need).map(([key]) => key);
  }

  // modules/domain/stump-cube-placement.mjs
  function cubeFreeSpot(env, list, w, h, at) {
    const taken = new Set(list.flatMap((entry) => cubeCoveredCells(env, entry.x, entry.y, entry.w, entry.h)));
    if (Number.isInteger(at) && cubeSpotFits(env, taken, at % env.SIZE, Math.floor(at / env.SIZE), w, h)) return { x: at % env.SIZE, y: Math.floor(at / env.SIZE) };
    for (let y = 0; y < env.SIZE; y++) {
      for (let x = 0; x < env.SIZE; x++) {
        if (cubeSpotFits(env, taken, x, y, w, h)) return { x, y };
      }
    }
    return null;
  }
  function cubePut(env, state, kind, item, at) {
    if (!env.KINDS.includes(kind) || !cubeUsable(env, kind, item)) return "넣을 수 없는 아이템입니다.";
    const id = cubeIdentity(env, kind, item), list = cubeEntries(env, state);
    if (env.FINDERS[kind](state, id) !== item) return "보관 중인 아이템만 넣을 수 있습니다.";
    if (list.some((entry) => entry.kind === kind && entry.id === id)) return "이미 조합창에 있습니다.";
    const { w, h } = cubeFootprint(env, kind, item), spot = cubeFreeSpot(env, list, w, h, at);
    if (!spot) return "조합창에 자리가 없습니다.";
    cubeOf(state).slots.push({ kind, id, x: spot.x, y: spot.y });
    return "";
  }
  function cubeEntryAt(env, list, cell) {
    const x = cell % env.SIZE, y = Math.floor(cell / env.SIZE);
    return list.find((entry) => x >= entry.x && x < entry.x + entry.w && y >= entry.y && y < entry.y + entry.h) || null;
  }
  function cubeTakeOut(env, state, cell) {
    const hit = cubeEntryAt(env, cubeEntries(env, state), cell);
    if (!hit) return false;
    cubeOf(state).slots = cubeOf(state).slots.filter((slot) => !(slot.kind === hit.kind && slot.id === hit.id));
    return true;
  }
  function cubePlanMove(env, list, from, to) {
    const hit = cubeEntryAt(env, list, from), x = to % env.SIZE, y = Math.floor(to / env.SIZE);
    if (!hit || !(to >= 0 && to < env.SIZE * env.SIZE)) return null;
    const others = list.filter((entry) => entry !== hit);
    if (cubeSpotFits(env, new Set(others.flatMap((entry) => cubeCoveredCells(env, entry.x, entry.y, entry.w, entry.h))), x, y, hit.w, hit.h)) return { hit, x, y, other: null };
    const other = cubeEntryAt(env, others, to);
    return other && cubeSameSpot(other, hit, x, y) ? { hit, x, y, other } : null;
  }
  function cubeSameSpot(other, hit, x, y) {
    return other.x === x && other.y === y && other.w === hit.w && other.h === hit.h;
  }
  function cubeCanMove(env, state, from, to) {
    return !!cubePlanMove(env, cubeReadContents(env, state).list, from, to);
  }
  function cubeMove(env, state, from, to) {
    const plan = cubePlanMove(env, cubeEntries(env, state), from, to);
    if (!plan) return "그 자리에는 들어가지 않습니다.";
    const slotOf = (entry) => cubeOf(state).slots.find((slot) => slot.kind === entry.kind && slot.id === entry.id);
    if (plan.other) Object.assign(slotOf(plan.other), { x: plan.hit.x, y: plan.hit.y });
    Object.assign(slotOf(plan.hit), { x: plan.x, y: plan.y });
    return "";
  }
  function cubeClear(state) {
    cubeOf(state).slots = [];
  }

  // modules/domain/stump-cube-transmute.mjs
  function cubeStoreStump(env, state, output) {
    return output.talisman ? env.deps.stumpBox.addTalisman(state, output.talisman, true) : env.deps.stumpBox.createItem(state, output.spec, true);
  }
  function cubeTransmuteRefusal(env, found, state) {
    if (state.woodsmanBuildLock) return env.LOCK_REASON;
    if (!found) return "맞는 조합법이 없습니다.";
    const lacking = cubeMissingCost(found.recipe, state);
    return lacking.length ? env.deps._t("{name} 부족합니다.", { name: env.deps.withSubjectParticle(env.deps.ORB_DB[lacking[0]].name) }) : "";
  }
  function cubeHasLockedInput(env, state) {
    return cubeReadContents(env, state).list.some((entry) => entry.item.locked);
  }
  function* cubeTransmute(env, state, random = Math.random) {
    if (cubeHasLockedInput(env, state)) return { ok: false, reason: env.deps._t("잠긴 아이템은 조합할 수 없습니다.") };
    const found = cubeMatch(env, state), reason = cubeTransmuteRefusal(env, found, state);
    if (reason) return { ok: false, reason };
    const result = env.deps.stumpCubeRecipes.run(found.recipe.id, found.groups, state, random);
    if (!result.ok) return result;
    result.consumed.forEach((entry) => env.REMOVERS[entry.kind](state, entry.item));
    Object.entries(found.recipe.cost || {}).forEach(([key, need]) => {
      state.currencies[key] -= need;
    });
    Object.entries(result.paid || {}).forEach(([key, need]) => {
      state.currencies[key] -= need;
    });
    const made = [];
    for (const output of result.outputs) {
      made.push({ kind: output.kind, item: output.existing || (yield* cubeStoreOutput(env, state, output)) });
    }
    cubeClear(state);
    made.filter((row) => row.item && row.kind !== "currency").forEach((row) => cubePut(env, state, row.kind, row.item));
    env.deps.stumpBox.invalidatePlacementUndo(state);
    return { ok: true, recipe: found.recipe, outputs: made, paid: result.paid || {} };
  }
  function* cubeStoreOutput(env, state, output) {
    if (output.kind === "equipment") {
      yield { kind: "storeCubeEquipment", args: [output.item] };
      return output.item;
    }
    if (output.kind === "currency") {
      yield { kind: "awardCubeCurrency", args: [output.key, output.amount] };
      return { name: `${env.deps._t(env.deps.ORB_DB[output.key].name)} ${output.amount}`, currency: output.key, amount: output.amount };
    }
    return env.STORERS[output.kind](state, output);
  }

  // modules/domain/stump-cube-candidates.mjs
  function cubeStoredUsable(env, kind, state) {
    const pools = {
      equipment: () => (state.inventory || []).filter((item) => !env.deps.bagItems.isSpecial(item)),
      stump: () => (state.stumpBox && state.stumpBox.items || []).filter((item) => !env.deps.stumpBox.isPlaced(state, item.id)),
      jewel: () => env.deps.bagItems.jewels(state),
      core: () => env.deps.bagItems.cores(state),
      wallet: () => env.deps.stumpBox.walletPieces(state, env.SIZE * env.SIZE)
    };
    return pools[kind]().filter((item) => cubeUsable(env, kind, item));
  }
  function cubeCandidates(env, kind, state) {
    const inside = new Set(cubeEntries(env, state).filter((entry) => entry.kind === kind).map((entry) => entry.id));
    const free = cubeStoredUsable(env, kind, state).filter((item) => !inside.has(kind === "equipment" ? env.deps.equipmentLoadoutRuntime.getItemIdentity(item) : item.id));
    return kind === "wallet" ? free.filter((piece, at) => free.findIndex((other) => other.walletKey === piece.walletKey) === at) : free;
  }

  // modules/domain/stump-cube-autofill.mjs
  function cubeCubeSpendOrder(a, b) {
    const kept = (entry) => entry.kind === "wallet" ? -1 : entry.item.golden || entry.item.ancient ? 1 : 0;
    return kept(a) - kept(b) || (Number(a.item.roll) || 0) - (Number(b.item.roll) || 0) || (Number(a.item.quality) || 0) - (Number(b.item.quality) || 0);
  }
  function cubePickCubeRow(env, rule, fitting) {
    if (!rule.same) return fitting.length >= rule.count ? fitting.slice(0, rule.count) : null;
    const groups = /* @__PURE__ */ new Map();
    for (const entry of fitting) {
      const key = rule.same.map((name) => env.SAME_KEYS[name](entry)).join("|"), group = groups.get(key) || [];
      group.push(entry);
      if (group.length === rule.count) return group;
      groups.set(key, group);
    }
    return null;
  }
  function cubePackCubeSet(env, set) {
    const placed = [];
    for (const entry of set.map((row) => ({ ...row, ...cubeFootprint(env, row.kind, row.item) })).sort((a, b) => b.w * b.h - a.w * a.h)) {
      const spot = cubeFreeSpot(env, placed, entry.w, entry.h);
      if (!spot) return null;
      placed.push({ ...entry, ...spot });
    }
    return placed;
  }
  function cubeReadyCubeSet(env, recipe, stock) {
    const rest = stock.filter((entry) => !entry.item.albino), set = [];
    for (const rule of recipe.inputs) {
      const picked = cubePickCubeRow(env, rule, rest.filter((entry) => cubeFitsRule(env, rule, entry)));
      if (!picked) return null;
      picked.forEach((entry) => {
        rest.splice(rest.indexOf(entry), 1);
        set.push(entry);
      });
    }
    return cubePackCubeSet(env, set);
  }
  function cubeReadyCubeSets(env, state) {
    const stock = env.KINDS.flatMap((kind) => cubeStoredUsable(env, kind, state).map((item) => ({ kind, item }))).sort(cubeCubeSpendOrder);
    return cubeRevealed(env, state).filter((recipe) => !recipe.inputs.some((rule) => rule.unlike)).map((recipe) => ({ recipe, set: cubeReadyCubeSet(env, recipe, stock) })).filter((row) => row.set);
  }
  function cubeFillCubeRecipe(env, state, recipeId) {
    const ready = cubeReadyCubeSets(env, state).find((row) => row.recipe.id === recipeId);
    if (!ready) return "이 조합법의 재료가 모자랍니다.";
    cubeClear(state);
    cubeOf(state).slots = ready.set.map((entry) => ({ kind: entry.kind, id: cubeIdentity(env, entry.kind, entry.item), x: entry.x, y: entry.y }));
    return "";
  }

  // modules/domain/stump-cube-merge.mjs
  function cubeAutoMergeSets(env, state, filter = "all") {
    const byColor = /* @__PURE__ */ new Map();
    cubeCandidates(env, "stump", state).filter((item) => cubeFitsRule(env, env.MERGE_RULE, { kind: "stump", item }) && !item.golden && !item.ancient && (filter === "all" || item.color === filter)).sort((a, b) => a.roll - b.roll || a.id - b.id).forEach((item) => byColor.set(item.color, [...byColor.get(item.color) || [], item]));
    return [...byColor.values()].flatMap((list) => Array.from(
      { length: Math.floor(list.length / env.MERGE_RULE.count) },
      (_, at) => list.slice(at * env.MERGE_RULE.count, (at + 1) * env.MERGE_RULE.count)
    ));
  }
  function cubeAutoMerge(env, state, filter = "all", random = Math.random) {
    if (state.woodsmanBuildLock) return { ok: false, reason: env.LOCK_REASON };
    const sets = cubeAutoMergeSets(env, state, filter);
    if (!sets.length) return { ok: false, reason: env.deps._t("같은 색 씨앗 3개가 보관함에 없습니다.") };
    const items = sets.map((set) => {
      const result = env.deps.stumpCubeRecipes.run("stump_merge", [set.map((item) => ({ kind: "stump", item }))], state, random);
      result.consumed.forEach((entry) => env.REMOVERS.stump(state, entry.item));
      return cubeStoreStump(env, state, result.outputs[0]);
    });
    env.deps.stumpBox.invalidatePlacementUndo(state);
    return { ok: true, items };
  }

  // modules/domain/stump-cube.mjs
  function createCubeEnvironment(deps) {
    const env = { deps };
    env.KINDS = ["equipment", "stump", "jewel", "core", "wallet"];
    env.SIZE = env.deps.STUMP_CUBE_SIZE;
    env.LOCK_REASON = "☠️ 나무꾼 전투 중에는 조합할 수 없습니다.";
    env.FINDERS = Object.freeze({
      equipment: (state, id) => (state.inventory || []).find((item) => item && !env.deps.bagItems.isSpecial(item) && env.deps.equipmentLoadoutRuntime.getItemIdentity(item) === id) || null,
      stump: (...args) => cubeStumpItem(env, ...args),
      jewel: (state, id) => env.deps.bagItems.jewels(state).find((item) => item.id === id) || null,
      core: (state, id) => env.deps.bagItems.cores(state).find((item) => item.id === id) || null,
      wallet: (state, id) => env.deps.stumpBox.walletPieceById(state, id)
    });
    env.SAME_KEYS = Object.freeze({
      slot: (entry) => env.deps.stumpCubeRecipes.baseSlot(entry.item),
      color: (entry) => entry.item.color,
      family: (entry) => entry.item.family,
      // 고유 이름: 같은 고유 2개 다시 빚기(2026-10-10).
      name: (entry) => entry.item.name,
      // 베이스: 같은 베이스 희귀 3개 특출 베이스(2026-10-30).
      base: (entry) => entry.item.baseId
    });
    env.REMOVERS = Object.freeze({
      equipment: (state, item) => {
        env.deps.equipmentSockets.returnJewels(item, state);
        state.inventory = state.inventory.filter((row) => row !== item);
      },
      stump: (state, item) => {
        state.stumpBox.items = state.stumpBox.items.filter((row) => row !== item);
      },
      jewel: (state, item) => {
        env.deps.bagItems.take(item, state);
      },
      core: (state, item) => {
        env.deps.bagItems.take(item, state);
      },
      wallet: (state, item) => {
        env.deps.stumpBox.spendWallet(state, item.walletKey);
      }
    });
    env.STORERS = Object.freeze({
      stump: (...args) => cubeStoreStump(env, ...args),
      jewel: (state, output) => {
        env.deps.bagItems.put(env.deps.bagItems.asJewel(output.item), state, true);
        return output.item;
      },
      core: (state, output) => {
        env.deps.bagItems.addCore(output.item, state);
        return output.item;
      }
    });
    env.MERGE_RULE = env.deps.STUMP_CUBE_RECIPES.find((recipe) => recipe.id === "stump_merge").inputs[0];
    return env;
  }
  function createStumpCube(deps) {
    const env = createCubeEnvironment(deps);
    return Object.freeze({
      SIZE: env.SIZE,
      KINDS: env.KINDS,
      empty: cubeEmpty,
      normalize: (...args) => cubeNormalize(env, ...args),
      of: cubeOf,
      entries: (...args) => cubeEntries(env, ...args),
      put: (...args) => cubePut(env, ...args),
      takeOut: (...args) => cubeTakeOut(env, ...args),
      canMove: (...args) => cubeCanMove(env, ...args),
      move: (...args) => cubeMove(env, ...args),
      clear: cubeClear,
      match: (...args) => cubeMatch(env, ...args),
      missingRecipes: (...args) => cubeMissingRecipes(env, ...args),
      preview: (...args) => cubePreview(env, ...args),
      missingCost: cubeMissingCost,
      transmute: (...args) => cubeTransmute(env, ...args),
      candidates: (...args) => cubeCandidates(env, ...args),
      footprint: (...args) => cubeFootprint(env, ...args),
      isRevealed: (...args) => cubeIsRevealed(env, ...args),
      revealed: (...args) => cubeRevealed(env, ...args),
      learn: (...args) => cubeLearn(env, ...args),
      readyCubeSets: (...args) => cubeReadyCubeSets(env, ...args),
      fillCubeRecipe: (...args) => cubeFillCubeRecipe(env, ...args),
      autoMergeSets: (...args) => cubeAutoMergeSets(env, ...args),
      autoMerge: (...args) => cubeAutoMerge(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/stump-cube-classic.mjs
  var rules = createStumpCube({
    get STUMP_CUBE_RECIPES() {
      return STUMP_CUBE_RECIPES;
    },
    get contentProgression() {
      return contentProgression;
    },
    get stumpBox() {
      return stumpBox;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get stumpCubeRecipes() {
      return stumpCubeRecipes;
    },
    get _t() {
      return _t;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get bagItems() {
      return bagItems;
    },
    get STUMP_CUBE_SIZE() {
      return STUMP_CUBE_SIZE;
    }
  });
  var effects = Object.freeze({
    storeCubeEquipment: (item) => addItemToInventory(item, { guaranteedKeep: true, skipAutoEquip: true }),
    awardCubeCurrency: (key, amount) => awardCurrency(key, amount)
  });
  var stumpCube = Object.freeze({
    ...rules,
    isRevealed: (recipe, state = game) => rules.isRevealed(recipe, state),
    revealed: (state = game) => rules.revealed(state),
    learn: (state = game) => rules.learn(state),
    entries: (state = game) => rules.entries(state),
    clear: (state = game) => rules.clear(state),
    match: (state = game) => rules.match(state),
    missingRecipes: (state = game) => rules.missingRecipes(state),
    preview: (state = game) => rules.preview(state),
    missingCost: (recipe, state = game) => rules.missingCost(recipe, state),
    transmute: (state = game, random = Math.random) => consumeDomainCommands(rules.transmute(state, random), effects),
    candidates: (kind, state = game) => rules.candidates(kind, state),
    readyCubeSets: (state = game) => rules.readyCubeSets(state),
    autoMergeSets: (state = game, filter = "all") => rules.autoMergeSets(state, filter),
    autoMerge: (state = game, filter = "all", random = Math.random) => rules.autoMerge(state, filter, random)
  });
  safeExposeGlobals({ stumpCube });
})();
