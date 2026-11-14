// GENERATED from modules/ember-corruption*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/ember-corruption-rules.mjs
  function emberBurnReason(env, item) {
    if (!item) return "아이템을 선택하세요.";
    if (!env.SLOTS.includes(item.slot)) return "장비에만 쓸 수 있습니다.";
    return item.burned ? "이미 한 번 타오른 장비입니다." : "";
  }
  function emberScalableLines(item) {
    return (Array.isArray(item.stats) ? item.stats : []).filter((stat) => stat && Number.isFinite(Number(stat.val)) && Number(stat.val) !== 0 && !stat.lockedByHoney && !stat.lockedByRift && !String(stat.id).startsWith("fossilRift"));
  }
  function emberLinePool(env, item) {
    const taken = new Set((item.emberLines || []).map((line) => line.id));
    return env.deps.EMBER_CORRUPTION_LINES.filter((row) => row.slots.includes(item.slot) && !taken.has(row.id));
  }
  function emberOutcomes(env, item) {
    return env.deps.EMBER_BURN_OUTCOMES[item.rarity === "unique" ? "unique" : "other"].filter(([kind]) => !env.CAN[kind] || env.CAN[kind](item));
  }
  function emberPick(env, item, random) {
    const rows = emberOutcomes(env, item);
    let roll = random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
      if (roll < weight) return kind;
      roll -= weight;
    }
    return "nothing";
  }
  function emberRescale(value, mul) {
    return Number.isInteger(value) ? Math.round(value * mul) : Math.round(value * mul * 100) / 100;
  }
  function emberBakeLines(env, item, random) {
    const { min, max } = env.deps.EMBER_CORRUPTION_RULES.scale, shares = [];
    for (const stat of emberScalableLines(item)) {
      const mul = Math.round((min + random() * (max - min)) * 100) / 100;
      stat.val = emberRescale(Number(stat.val), mul);
      (stat.extraStats || []).filter((extra) => Number.isFinite(Number(extra.val))).forEach((extra) => {
        extra.val = emberRescale(Number(extra.val), mul);
      });
      stat.emberScale = mul;
      shares.push(mul);
    }
    return shares.reduce((sum, mul) => sum + mul, 0) / Math.max(1, shares.length);
  }
  function emberMakeLine(env, row, val) {
    return { id: row.id, val, valMin: row.min, valMax: row.max, statName: env.deps.getStatName(row.id), emberLine: true };
  }
  function emberAddLines(env, item, count, random) {
    const pool = emberLinePool(env, item), added = [];
    while (added.length < count && pool.length) {
      const row = pool.splice(Math.floor(random() * pool.length), 1)[0];
      added.push(emberMakeLine(env, row, row.min + Math.floor(random() * (row.max - row.min + 1))));
    }
    item.emberLines = [...item.emberLines || [], ...added];
    return added;
  }
  function emberShareText(share) {
    return `${share >= 1 ? "+" : ""}${Math.round((share - 1) * 100)}%`;
  }
  function emberLinesText(env, lines) {
    return lines.map((line) => `${line.statName} +${env.deps.formatValue(line.id, line.val)}`).join(", ");
  }
  function emberResult(kind, text, extra) {
    return { kind, text, lines: [], share: 1, ...extra };
  }
  function emberBurn(env, item, random = Math.random) {
    const kind = emberPick(env, item, random);
    item.burned = true;
    item.corrupted = true;
    return env.APPLY[kind](item, random);
  }
  function emberAshGrowth(env, item) {
    return env.deps.EMBER_CORRUPTION_RULES.ashGrowth[item && item.rarity === "unique" ? "unique" : "other"];
  }
  function emberNormalize(env, item) {
    const lines = (Array.isArray(item.emberLines) ? item.emberLines : []).map((line) => {
      const row = line && env.BY_ID.get(line.id), val = Math.floor(Number(line && line.val));
      return row && row.slots.includes(item.slot) && Number.isFinite(val) ? emberMakeLine(env, row, Math.max(row.min, Math.min(row.max, val))) : null;
    }).filter(Boolean);
    const unique = lines.filter((line, index) => lines.findIndex((other) => other.id === line.id) === index).slice(0, 2);
    if (unique.length) item.emberLines = unique;
    else delete item.emberLines;
    if (item.burned === true) item.corrupted = true;
    else delete item.burned;
  }
  function emberKillDrops(env, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== "emberField" || enemy.isBoss) return [];
    const kind = enemy.isElite ? "elite" : "normal";
    return env.deps.EMBER_KILL_DROPS.filter((row) => random() < row[kind]).map((row) => [row.key, 1]);
  }

  // modules/domain/ember-corruption.mjs
  function createEmberEnvironment(deps) {
    const env = { deps };
    env.SLOTS = Object.freeze([...new Set(env.deps.EMBER_CORRUPTION_LINES.flatMap((row) => row.slots))]);
    env.BY_ID = new Map(env.deps.EMBER_CORRUPTION_LINES.map((row) => [row.id, row]));
    env.CAN = Object.freeze({
      scale: (item) => emberScalableLines(item).length > 0,
      twoLines: (item) => emberLinePool(env, item).length >= 2,
      scaleAndLine: (item) => emberScalableLines(item).length > 0 && emberLinePool(env, item).length > 0,
      quality: (item) => Math.floor(Number(item.quality) || 0) < env.deps.EMBER_CORRUPTION_RULES.quality
    });
    env.APPLY = Object.freeze({
      ash: () => emberResult("ash", "장비가 타서 재가 되었습니다."),
      scale: (item, random) => {
        const share = emberBakeLines(env, item, random);
        return emberResult("scale", env.deps._t("옵션 수치가 다시 구워졌습니다(평균 {share}).", { share: emberShareText(share) }), { share });
      },
      twoLines: (item, random) => {
        const lines = emberAddLines(env, item, 2, random);
        return emberResult("twoLines", env.deps._t("타락 전용 줄이 생겼습니다: {lines}", { lines: emberLinesText(env, lines) }), { lines });
      },
      scaleAndLine: (item, random) => {
        const share = emberBakeLines(env, item, random), lines = emberAddLines(env, item, 1, random);
        return emberResult("scaleAndLine", env.deps._t("옵션 수치가 다시 구워지고(평균 {share}) 타락 전용 줄이 생겼습니다: {lines}", { share: emberShareText(share), lines: emberLinesText(env, lines) }), { share, lines });
      },
      quality: (item) => {
        const before = Math.floor(Number(item.quality) || 0);
        item.quality = env.deps.EMBER_CORRUPTION_RULES.quality;
        return emberResult("quality", env.deps._t("품질이 {before}% → {quality}%로 올랐습니다.", { before, quality: item.quality }));
      },
      nothing: () => emberResult("nothing", "불길이 잦아들었습니다. 변화가 없습니다.")
    });
    return env;
  }
  function createEmberCorruption(deps) {
    const env = createEmberEnvironment(deps);
    return Object.freeze({
      burnReason: (...args) => emberBurnReason(env, ...args),
      outcomes: (...args) => emberOutcomes(env, ...args),
      burn: (...args) => emberBurn(env, ...args),
      ashGrowth: (...args) => emberAshGrowth(env, ...args),
      normalize: (...args) => emberNormalize(env, ...args),
      killDrops: (...args) => emberKillDrops(env, ...args),
      linePool: (...args) => emberLinePool(env, ...args),
      scalableLines: emberScalableLines
    });
  }

  // modules/ember-corruption-classic.mjs
  var rules = createEmberCorruption({
    get EMBER_CORRUPTION_LINES() {
      return EMBER_CORRUPTION_LINES;
    },
    get EMBER_BURN_OUTCOMES() {
      return EMBER_BURN_OUTCOMES;
    },
    get EMBER_CORRUPTION_RULES() {
      return EMBER_CORRUPTION_RULES;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    },
    get EMBER_KILL_DROPS() {
      return EMBER_KILL_DROPS;
    },
    get _t() {
      return _t;
    }
  });
  var emberCorruption = rules;
  safeExposeGlobals({ emberCorruption });
})();
