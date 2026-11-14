// GENERATED from modules/talisman-effects*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/talisman-effects-rules.mjs
  function charmItemAt(box, cell) {
    const id = cell >= 0 ? box.board[cell] : null;
    return id === null || id === void 0 ? null : box.items.find((item) => item.id === id) || null;
  }
  function charmIsAwake(item) {
    return !!item && item.family === "talisman" && item.ripe === true;
  }
  function charmStepCell(env, cell, dir) {
    const [dx, dy] = env.STEP[dir] || env.STEP[1];
    const x = cell % env.deps.STUMP_BOX_SIZE + dx, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE) + dy;
    return x < 0 || y < 0 || x >= env.deps.STUMP_BOX_SIZE || y >= env.deps.STUMP_BOX_SIZE ? -1 : y * env.deps.STUMP_BOX_SIZE + x;
  }
  function charmAddStat(result, id, value) {
    result.stats[id] = (result.stats[id] || 0) + value;
  }
  function charmAddStats(result, rows) {
    rows.forEach(([id, value]) => charmAddStat(result, id, value));
  }
  function charmAddLines(env, result, talisman, mul, statsOnly) {
    talisman.lines.forEach((line) => {
      if (line.kind === "stat") charmAddStat(result, line.id, line.value * mul);
      else if (!statsOnly) result.conditions.push({ ...env.deps.talismans.conditionDef(line.id), value: Number((line.value * mul).toFixed(2)) });
    });
  }
  function charmAwakeNeighbors(env, box, cell, off) {
    return env.deps.stumpBox.neighbors(cell).map((next) => charmItemAt(box, next)).filter((item) => charmIsAwake(item) && !off.has(item.id));
  }
  function charmXy(env, cell) {
    return [cell % env.deps.STUMP_BOX_SIZE, Math.floor(cell / env.deps.STUMP_BOX_SIZE)];
  }
  function charmDistance(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  }
  function charmPieces(box) {
    return box.board.map((id, cell) => ({ item: charmItemAt(box, cell), cell })).filter((entry) => entry.item);
  }
  function charmNeighborPieces(env, box, cell) {
    return env.deps.stumpBox.neighbors(cell).map((next) => charmItemAt(box, next)).filter(Boolean);
  }
  function charmBoostAwake(env, result, at, mul, test) {
    charmPieces(at.box).forEach((entry) => {
      if (entry.cell !== at.cell && charmIsAwake(entry.item) && !at.off.has(entry.item.id) && test(entry.cell)) charmAddLines(env, result, entry.item, mul, true);
    });
  }
  function charmGrownPieces(env, state) {
    const suppressed = env.deps.stumpBox.evaluate(state).suppressed;
    return charmPieces(state.stumpBox).filter(({ item }) => item.family !== "talisman" && item.ripe === true && !suppressed.has(item.id));
  }
  function charmSameLine(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return ax === bx || ay === by;
  }
  function charmTwoAway(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return ax === bx && Math.abs(ay - by) === 2 || ay === by && Math.abs(ax - bx) === 2;
  }
  function charmBoundaryBonus(env, result, cell) {
    const [x, y] = charmXy(env, cell), last = env.deps.STUMP_BOX_SIZE - 1, side = x === 0 || x === last, edge = y === 0 || y === last;
    const walls = [x === 0, x === last, y === 0, y === last].filter(Boolean).length;
    if (walls) charmAddStats(result, [["resAll", 4 * walls], ["dr", 2 * walls]]);
    if (side && edge) charmAddStat(result, "pctHp", 10);
  }
  function charmAshenSun(env, result, box, cell) {
    const colors = new Set(charmNeighborPieces(env, box, cell).map((item) => item.color).filter(Boolean)).size;
    if (colors) charmAddStat(result, "firePctDmg", 8 * colors);
    if (colors >= 3) charmAddStat(result, "resPen", 5);
  }
  function charmHiveCord(result, box, cell, off) {
    const summonLines = (item) => item.lines.filter((line) => line.kind === "stat" && line.id.startsWith("summon"));
    const others = charmPieces(box).filter((entry) => entry.cell !== cell && charmIsAwake(entry.item) && !off.has(entry.item.id) && summonLines(entry.item).length);
    others.forEach(({ item }) => summonLines(item).forEach((line) => charmAddStat(result, line.id, line.value * 0.15)));
    if (others.length >= 4) charmAddStat(result, "summonCap", 1);
  }
  function charmBlueprint(env, result, box, cell) {
    const kinds = charmPieces(box).map(({ item }) => item.family === "talisman" ? "talisman" : `${item.family}:${item.color}`);
    if (kinds.length >= 6 && new Set(kinds).size === kinds.length) charmAddLines(env, result, charmItemAt(box, cell), 0.4, true);
  }
  function charmDeadStarBonus(env, result, state) {
    const chaos = Math.min(5, charmGrownPieces(env, state).filter(({ item }) => item.color === "chaos").length);
    if (chaos) charmAddStats(result, [["chaosPctDmg", 8 * chaos], ["dotPctDmg", 8 * chaos]]);
    charmAddStat(result, "pctHp", -10);
  }
  function charmRepelled(env, box, awake) {
    const off = /* @__PURE__ */ new Set();
    awake.forEach(({ item, cell }) => {
      if (item.special !== "cosmosRepulsion") return;
      charmAwakeNeighbors(env, box, cell, off).forEach((other) => {
        if (other.special !== "cosmosRepulsion") off.add(other.id);
      });
    });
    return off;
  }
  function charmSignature(box) {
    return box.board.map((id, cell) => {
      const item = id === null ? null : box.items.find((row) => row.id === id);
      if (!item) return "-";
      return item.family === "talisman" ? `${item.id}${item.ripe ? "R" : ""}${item.dir ?? ""}${item.lines.length}g${box.graft[cell]}` : `${item.id}${item.ripe ? "R" : ""}`;
    }).join("|");
  }
  function charmEvaluate(env, box, state) {
    const awake = box.board.map((id, cell) => ({ item: charmItemAt(box, cell), cell })).filter((entry) => charmIsAwake(entry.item));
    const off = charmRepelled(env, box, awake);
    const repulsion = awake.some(({ item }) => item.special === "cosmosRepulsion");
    const result = { stats: {}, conditions: [], bossFinalDmgBonusPct: 0, suppressed: off, amplified: /* @__PURE__ */ new Set() };
    awake.forEach(({ item, cell }) => {
      if (off.has(item.id)) return;
      const mul = repulsion && item.special !== "cosmosRepulsion" ? 1.25 : 1;
      if (mul > 1) result.amplified.add(item.id);
      charmAddLines(env, result, item, mul * env.deps.stumpBox.graftMultiplier(box, cell), false);
      if (env.SPECIAL_EFFECTS[item.special]) env.SPECIAL_EFFECTS[item.special](result, box, cell, off, state);
    });
    return result;
  }
  function charmSummarize(env, state) {
    const box = state.stumpBox;
    if (!box || !box.acquired || !Array.isArray(box.board)) return env.EMPTY;
    const key = charmSignature(box);
    if (env.memo.box !== box || env.memo.key !== key) env.memo = { key, box, value: charmEvaluate(env, box, state) };
    return env.memo.value;
  }

  // modules/domain/talisman-effects.mjs
  function createTalismanSpatialEffects(env) {
    return {
      farReach: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.25, (other) => charmDistance(env, cell, other) >= 3),
      voidRing: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.35, (other) => charmDistance(env, cell, other) === 1),
      twinSpore: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.2, (other) => charmTwoAway(env, cell, other)),
      stormConduit: (result, box, cell, off) => charmBoostAwake(env, result, { box, cell, off }, 0.18, (other) => charmSameLine(env, cell, other)),
      cradle: (result, box, cell) => charmAddStat(result, "dr", charmNeighborPieces(env, box, cell).length),
      bloodTithe: (result, box, cell) => {
        const count = charmNeighborPieces(env, box, cell).length;
        if (count) charmAddStats(result, [["physPctDmg", 7 * count], ["pctHp", -2 * count]]);
      },
      boundary: (result, box, cell) => charmBoundaryBonus(env, result, cell)
    };
  }
  function createTalismanGrowthEffects(env) {
    return {
      ashenSun: (...args) => charmAshenSun(env, ...args),
      triElement: (result, box, cell, off, state) => {
        const colors = new Set(charmGrownPieces(env, state).map(({ item }) => item.color));
        if (["fire", "cold", "lightning"].every((color) => colors.has(color))) charmAddStats(result, [["elementalPctDmg", 30], ["resPen", 6]]);
      },
      firstHarvest: (result, box, cell) => {
        const seeds = Math.min(3, charmPieces(box).filter(({ item }) => item.family === "seed" && item.ripe === true).length);
        if (seeds) charmAddLines(env, result, charmItemAt(box, cell), 0.1 * seeds, true);
      },
      invertedRoot: (result, box, cell, off, state) => {
        const count = Math.min(4, env.deps.stumpBox.evaluate(state).suppressed.size);
        if (count) charmAddStats(result, [["pctHp", 5 * count], ["armor", 25 * count]]);
      },
      hiveCord: charmHiveCord,
      blueprint: (...args) => charmBlueprint(env, ...args),
      deadStar: (result, box, cell, off, state) => charmDeadStarBonus(env, result, state)
    };
  }
  function createTalismanSpecialEffects(env) {
    return Object.freeze({
      gravity: (result, box, cell, off) => charmAwakeNeighbors(env, box, cell, off).forEach((item) => charmAddLines(env, result, item, 0.25, true)),
      simpleCopy: (result, box, cell, off) => {
        const target = charmItemAt(box, charmStepCell(env, cell, charmItemAt(box, cell).dir));
        if (charmIsAwake(target) && !off.has(target.id)) charmAddLines(env, result, target, 1, true);
      },
      pride: (result, box, cell) => {
        const count = env.deps.stumpBox.neighbors(cell).filter((next) => charmItemAt(box, next)).length;
        charmAddStats(result, env.PRIDE_BY_NEIGHBORS[Math.min(2, count)]);
      },
      moment: (result, box, cell) => {
        result.bossFinalDmgBonusPct = Math.max(result.bossFinalDmgBonusPct, charmItemAt(box, cell).moment || 5);
      },
      cosmosChoice: (result, box, cell) => charmAddStats(result, env.CHOICE_BY_AXIS[(charmItemAt(box, cell).dir ?? 1) % 2]),
      cosmosLightningVariance: (result) => charmAddStat(result, "cosmosLightningVariance", 1),
      ...env.WILD_EFFECTS
    });
  }
  function createTalismanEffects(deps) {
    const env = { deps };
    env.PRIDE_BY_NEIGHBORS = [[["gemLevel", 1], ["suppCap", 1]], [["suppCap", 1]], [["pctDmg", 15], ["aspd", 10]]];
    env.CHOICE_BY_AXIS = [[["gemLevel", -2], ["suppCap", 2]], [["gemLevel", 2]]];
    env.STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    env.EMPTY = Object.freeze({
      stats: Object.freeze({}),
      conditions: Object.freeze([]),
      bossFinalDmgBonusPct: 0,
      suppressed: /* @__PURE__ */ new Set(),
      amplified: /* @__PURE__ */ new Set()
    });
    env.memo = { key: null, box: null, value: null };
    env.WILD_EFFECTS = Object.freeze({ ...createTalismanSpatialEffects(env), ...createTalismanGrowthEffects(env) });
    env.SPECIAL_EFFECTS = createTalismanSpecialEffects(env);
    return Object.freeze({ summarize: (...args) => charmSummarize(env, ...args) });
  }

  // modules/talisman-effects-classic.mjs
  var rules = createTalismanEffects({
    get STUMP_BOX_SIZE() {
      return STUMP_BOX_SIZE;
    },
    get talismans() {
      return talismans;
    },
    get stumpBox() {
      return stumpBox;
    }
  });
  var talismanEffects = Object.freeze({ summarize: (state = game) => rules.summarize(state) });
  safeExposeGlobals({ talismanEffects });
})();
