// GENERATED from modules/talismans*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/talismans-rules.mjs
  function talismanRoundTo(value, step) {
    return Number((Math.round(value / step) * step).toFixed(2));
  }
  function talismanNormalizeLine(env, raw) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
    const value = Number(raw.value);
    if (!Number.isFinite(value) || Math.abs(value) > 1e4) return null;
    if (raw.kind === "condition") return env.conditionPool.has(raw.id) ? { kind: "condition", id: raw.id, value } : null;
    return raw.wax === true ? { kind: "stat", id: raw.id, value, wax: true } : { kind: "stat", id: raw.id, value };
  }
  function talismanUniqueFields(raw) {
    const out = {};
    if (raw.rarity === "unique" && typeof raw.uniqueId === "string") out.uniqueId = raw.uniqueId;
    if (typeof raw.uniqueEffect === "string" && raw.uniqueEffect) out.uniqueEffect = raw.uniqueEffect.slice(0, 160);
    return out;
  }
  function talismanSpecialFields(env, raw, special) {
    if (!special) return {};
    const out = { special };
    if (special === "moment") out.moment = Math.min(15, Math.max(5, Math.round(Number(raw.moment) || 5)));
    if (env.DIRECTIONAL.has(special)) out.dir = [0, 1, 2, 3].includes(raw.dir) ? raw.dir : 1;
    return out;
  }
  function talismanIsTalismanShape(env, raw) {
    return !!raw && typeof raw === "object" && Array.isArray(raw.lines) && env.RARITIES.includes(raw.rarity);
  }
  function talismanKeptLines(env, raw) {
    const lines = raw.lines.map((...args) => talismanNormalizeLine(env, ...args)).filter(Boolean);
    const waxLine = lines.find((line) => line.wax);
    return lines.filter((line) => !line.wax).slice(0, 3).concat(waxLine ? [waxLine] : []);
  }
  function talismanNormalizeTalisman(env, raw) {
    if (!talismanIsTalismanShape(env, raw)) return null;
    const lines = talismanKeptLines(env, raw);
    const special = raw.rarity === "unique" && env.SPECIALS.has(raw.special) ? raw.special : null;
    if (!lines.length && !special) return null;
    const talisman = { name: String(raw.name || "부적").slice(0, 40), rarity: raw.rarity, lines, ...talismanUniqueFields(raw), ...talismanSpecialFields(env, raw, special) };
    if (lines.some((line) => line.wax)) talisman.waxed = true;
    return talisman;
  }
  function talismanRollValue(def, mul, random) {
    return talismanRoundTo((def.min + random() * (def.max - def.min)) * mul, def.step || 1);
  }
  function talismanPick(list, random) {
    return list[Math.floor(random() * list.length)];
  }
  function talismanPickWeighted(list, random) {
    const total = list.reduce((sum, def) => sum + (def.weight ?? 1), 0);
    let roll = random() * total;
    return list.find((def) => (roll -= def.weight ?? 1) < 0) || list[list.length - 1];
  }
  function talismanRollLine(env, rule, taken, random) {
    const conditional = random() < rule.conditionChance;
    const pool = (conditional ? env.deps.TALISMAN_CONDITION_POOL : env.deps.TALISMAN_STAT_POOL).filter((def2) => !taken.has(def2.id));
    const def = talismanPick(pool, random);
    taken.add(def.id);
    return { kind: conditional ? "condition" : "stat", id: def.id, value: talismanRollValue(def, rule.mul, random) };
  }
  function talismanLineName(env, line) {
    const def = line.kind === "condition" ? env.conditionPool.get(line.id) : null;
    if (def) return def.name || { guard: "수호", warcry: "함성", curse: "저주" }[def.kind];
    return env.deps.getStatName(line.id).replace(/\(%\)$/, "");
  }
  function talismanRollNormal(env, source, random = Math.random) {
    const rule = env.deps.TALISMAN_UNSEAL_RULES[source];
    const [low, high] = rule.lines;
    const count = low + Math.floor(random() * (high - low + 1));
    const taken = /* @__PURE__ */ new Set();
    const lines = Array.from({ length: count }, () => talismanRollLine(env, rule, taken, random));
    return { name: env.deps._t("{lines} 부적", { lines: talismanLineName(env, lines[0]) }), rarity: count >= 2 ? "rare" : "magic", lines };
  }
  function talismanUniqueLines(env, def, random) {
    if (def.special === "temperance") {
      const taken = /* @__PURE__ */ new Set();
      return Array.from({ length: 3 }, () => talismanRollLine(env, { conditionChance: 0, mul: 1 }, taken, random));
    }
    if (def.special === "elementFocus") {
      const [gem, damage, resist] = env.deps.TALISMAN_ELEMENT_FOCUS[def.elem];
      return [
        { kind: "stat", id: gem, value: 1 + Math.floor(random() * 3) },
        { kind: "stat", id: damage, value: 5 + Math.floor(random() * 11) },
        { kind: "stat", id: resist, value: 5 + Math.floor(random() * 11) }
      ];
    }
    return (def.lines || []).map(([id, value]) => ({ kind: "stat", id, value }));
  }
  function talismanRollUnique(env, def, random = Math.random) {
    const talisman = { name: def.name, rarity: "unique", uniqueId: def.id, lines: talismanUniqueLines(env, def, random) };
    if (def.special) talisman.special = def.special;
    if (def.uniqueEffect) talisman.uniqueEffect = def.uniqueEffect;
    if (def.special === "moment") talisman.moment = def.momentMin + Math.floor(random() * (def.momentMax - def.momentMin + 1));
    if (env.DIRECTIONAL.has(def.special)) talisman.dir = 1;
    return talisman;
  }
  function talismanFromCosmos(env, row) {
    return talismanNormalizeTalisman(env, {
      name: row.name,
      rarity: "unique",
      uniqueId: row.id,
      special: row.special,
      uniqueEffect: row.uniqueEffect,
      dir: 1,
      lines: (row.stats || []).map((stat) => ({ kind: "stat", id: stat.stat, value: Number(stat.value) || 0 }))
    });
  }
  function talismanRoll(env, source, random = Math.random) {
    const rule = env.deps.TALISMAN_UNSEAL_RULES[source];
    return random() < rule.uniqueChance ? talismanRollUnique(env, talismanPick(env.deps.TALISMAN_UNIQUE_DB, random), random) : talismanRollNormal(env, source, random);
  }
  function talismanRerollStatLine(env, item, random = Math.random) {
    const lines = item.lines.filter((line) => line.kind === "stat" && !line.wax);
    if (!lines.length) return null;
    const old = talismanPick(lines, random);
    const taken = new Set(item.lines.map((line) => line.id));
    const next = talismanRollLine(env, { conditionChance: 0, mul: env.deps.TALISMAN_UNSEAL_RULES.strongSealShard.mul }, taken, random);
    item.lines[item.lines.indexOf(old)] = next;
    return next;
  }
  function talismanRollOtherUnique(env, excludedIds, random = Math.random) {
    const source = excludedIds.some((id) => env.wildIds.has(id)) ? env.deps.TALISMAN_WILD_UNIQUE_DB : env.deps.TALISMAN_UNIQUE_DB;
    const pool = source.filter((def) => !excludedIds.includes(def.id));
    return talismanRollUnique(env, talismanPickWeighted(pool.length ? pool : source, random), random);
  }
  function talismanKillKind(enemy) {
    return enemy && enemy.isBoss ? "boss" : enemy && enemy.isElite ? "elite" : "normal";
  }
  function talismanWildDropsOpen(env, state) {
    return env.deps.contentProgression.isUnlocked("talisman", state) && env.deps.stumpBox.of(state).acquired && env.deps.contentProgression.holds("wildTalisman", state);
  }
  function talismanRollWild(env, kind, random = Math.random) {
    return random() < env.deps.TALISMAN_WILD_DROPS.uniqueChance[kind] ? talismanRollUnique(env, talismanPickWeighted(env.deps.TALISMAN_WILD_UNIQUE_DB, random), random) : talismanRollNormal(env, env.deps.TALISMAN_WILD_DROPS.rule[kind], random);
  }
  function talismanRollWildDrop(env, enemy, random = Math.random) {
    const kind = talismanKillKind(enemy);
    return { talisman: talismanRollWild(env, kind, random), overflow: env.deps.TALISMAN_WILD_DROPS.overflow[kind] };
  }
  function talismanReceiveWild(env, state, drop) {
    const item = env.deps.stumpBox.addTalisman(state, drop.talisman);
    if (item) return { item };
    state.currencies[drop.overflow] = (state.currencies[drop.overflow] || 0) + 1;
    return { currency: drop.overflow };
  }
  function talismanDropWild(env, state, enemy, random = Math.random) {
    return talismanReceiveWild(env, state, talismanRollWildDrop(env, enemy, random));
  }
  function talismanUnsealRefusal(env, source, state) {
    if (!env.deps.TALISMAN_UNSEAL_RULES[source]) return "알 수 없는 편린입니다.";
    if (!env.deps.stumpBox.of(state).acquired) return "그루터기 함을 먼저 얻어야 합니다.";
    if (!env.deps.contentProgression.isUnlocked("talisman", state)) return "해금 목록에서 부적을 먼저 여세요.";
    if ((state.currencies[source] || 0) < env.deps.TALISMAN_UNSEAL_RULES[source].cost) return "편린이 부족합니다.";
    return env.deps.stumpBox.storageFull(state) ? "그루터기 함 보관함이 가득 찼습니다." : "";
  }
  function talismanUnseal(env, source, state, random = Math.random) {
    const reason = talismanUnsealRefusal(env, source, state);
    if (reason) return { ok: false, reason };
    state.currencies[source] -= env.deps.TALISMAN_UNSEAL_RULES[source].cost;
    return { ok: true, item: env.deps.stumpBox.addTalisman(state, talismanRoll(env, source, random)) };
  }
  function talismanExchange(env, index, state) {
    const row = env.deps.TALISMAN_SHARD_EXCHANGE[index];
    if (!row || (state.currencies[row.from] || 0) < row.cost) return { ok: false, reason: env.deps._t("교환할 편린이 부족합니다.") };
    state.currencies[row.from] -= row.cost;
    state.currencies[row.to] = (state.currencies[row.to] || 0) + 1;
    return { ok: true, row };
  }
  function talismanTalismanItem(env, state, id) {
    const item = env.deps.stumpBox.itemById(state, id);
    return item && item.family === "talisman" ? item : null;
  }
  function talismanWaxSource(item) {
    return item.lines.filter((line) => line.kind === "stat" && !line.wax && line.value > 0).sort((a, b) => Math.abs(a.value) - Math.abs(b.value))[0] || null;
  }
  function talismanWaxPreview(env, item) {
    const source = item && !item.waxed ? talismanWaxSource(item) : null;
    if (!source) return null;
    const raw = source.value * env.deps.TALISMAN_WAX_COPY_PCT / 100;
    return { kind: "stat", id: source.id, value: Number(raw.toFixed(Math.abs(raw) < 1 ? 2 : 1)), wax: true };
  }
  function talismanWax(env, id, state) {
    const item = talismanTalismanItem(env, state, id), line = talismanWaxPreview(env, item);
    if (!line) return { ok: false, reason: env.deps._t("밀랍을 바를 수 있는 부적이 아닙니다.") };
    if (!env.deps.stumpBox.editable(state)) return { ok: false, reason: env.deps._t("지금은 그루터기 함을 바꿀 수 없습니다.") };
    if ((state.currencies.beeswax || 0) < 1) return { ok: false, reason: env.deps._t("밀랍이 부족합니다.") };
    state.currencies.beeswax -= 1;
    item.lines.push(line);
    item.waxed = true;
    return { ok: true, line };
  }
  function talismanTurn(env, id, state) {
    const item = talismanTalismanItem(env, state, id);
    if (!item || !env.DIRECTIONAL.has(item.special) || !env.deps.stumpBox.editable(state)) return false;
    item.dir = ((item.dir ?? 1) + 1) % 4;
    return true;
  }
  function talismanScaleEffect(env, key, base, power) {
    const [, form, fixed] = env.deps.TALISMAN_CONDITION_EFFECTS[key] || [];
    if (fixed === "fixed") return base;
    const scaled = form === "mulUp" || form === "mulDown" ? 1 + (base - 1) * power / 100 : base * power / 100;
    return Number(scaled.toFixed(4));
  }
  function talismanConditionDelta(env, line) {
    const def = env.conditionPool.get(line.id);
    if (def.delta) return Object.fromEntries(Object.entries(def.delta).map(([key, base]) => [key, talismanScaleEffect(env, key, base, line.value)]));
    if (def.kind !== "curse") return { [def.stat]: line.value };
    return { [def.effect]: env.HEX_FORMS[def.form](line.value) };
  }
  function talismanRound1(value) {
    return Math.round(value * 10) / 10;
  }
  function talismanSigned(value) {
    return `${value < 0 ? "−" : "+"}${talismanRound1(Math.abs(value))}`;
  }
  function talismanEffectText(env, key, value) {
    const [label, form] = env.deps.TALISMAN_CONDITION_EFFECTS[key] || [key, "pct"];
    return label ? env.EFFECT_FORMATS[form](label, value) : "";
  }
  function talismanDescribeDelta(env, delta) {
    return Object.entries(delta || {}).map(([key, value]) => talismanEffectText(env, key, value)).filter(Boolean).join(", ");
  }
  function talismanDescribeCondition(env, line) {
    const def = env.conditionPool.get(line.id);
    if (!def.delta) return def.text.replace("{v}", line.value);
    const head = def.kind === "curse" ? env.deps._t("{value}초마다 적 하나에 {name}(위력 {value2}%): {value3}초 동안", { value: env.deps.TALISMAN_HEX_RULES.intervalMs / 1e3, name: def.name, value2: line.value, value3: env.deps.TALISMAN_HEX_RULES.durationMs / 1e3 }) : env.deps._t("{TALISMAN_CONDITION_WHEN} {name}(위력 {value}%):", { TALISMAN_CONDITION_WHEN: env.deps.TALISMAN_CONDITION_WHEN[def.when], name: def.name, value: line.value });
    return `${head} ${talismanDescribeDelta(env, talismanConditionDelta(env, line))}`;
  }
  function talismanDescribeLine(env, line) {
    if (line.kind === "condition") return talismanDescribeCondition(env, line);
    return `${env.deps.getStatName(line.id)} +${env.deps.formatValue(line.id, line.value)}${line.wax ? env.deps._t(" (밀랍)") : ""}`;
  }

  // modules/domain/talismans.mjs
  function createTalismanFormats(env) {
    return Object.freeze({
      pct: (label, v) => `${label} ${talismanSigned(v)}%`,
      fraction: (label, v) => `${label} ${talismanSigned(v * 100)}%`,
      count: (label, v) => `${label} +${v}`,
      flag: (label) => label,
      seconds: (label, v) => env.deps._t("{label} {v}초", { label, v: talismanSigned(v) }),
      minus: (label, v) => `${label} −${talismanRound1(v)}`,
      mulUp: (label, m) => `${label} +${talismanRound1((m - 1) * 100)}%`,
      mulDown: (label, m) => `${label} −${talismanRound1((1 - m) * 100)}%`,
      fractionUp: (label, v) => `${label} +${talismanRound1(v * 100)}%p`,
      fractionDown: (label, v) => `${label} −${talismanRound1(v * 100)}%`
    });
  }
  function createTalismanEnvironment(deps) {
    const env = { deps };
    env.statPool = new Map(env.deps.TALISMAN_STAT_POOL.map((def) => [def.id, def]));
    env.conditionPool = new Map(env.deps.TALISMAN_CONDITION_POOL.map((def) => [def.id, def]));
    env.uniquePool = new Map([...env.deps.TALISMAN_UNIQUE_DB, ...env.deps.TALISMAN_WILD_UNIQUE_DB].map((def) => [def.id, def]));
    env.wildIds = new Set(env.deps.TALISMAN_WILD_UNIQUE_DB.map((def) => def.id));
    env.RARITIES = ["magic", "rare", "unique"];
    env.SPECIALS = /* @__PURE__ */ new Set([
      "gravity",
      "simpleCopy",
      "temperance",
      "pride",
      "moment",
      "elementFocus",
      "cosmosChoice",
      "cosmosLightningVariance",
      "cosmosRepulsion",
      ...env.deps.TALISMAN_WILD_UNIQUE_DB.map((def) => def.special).filter(Boolean)
    ]);
    env.DIRECTIONAL = /* @__PURE__ */ new Set(["simpleCopy", "cosmosChoice"]);
    env.DIRECTION_NAMES = ["위", "오른쪽", "아래", "왼쪽"];
    env.HEX_FORMS = Object.freeze({ mulUp: (v) => 1 + v / 100, mulDown: (v) => 1 - v / 100, flat: (v) => v });
    env.EFFECT_FORMATS = createTalismanFormats(env);
    return env;
  }
  function createTalismans(deps) {
    const env = createTalismanEnvironment(deps);
    return Object.freeze({
      normalizeTalisman: (...args) => talismanNormalizeTalisman(env, ...args),
      rollNormal: (...args) => talismanRollNormal(env, ...args),
      rollUnique: (...args) => talismanRollUnique(env, ...args),
      roll: (...args) => talismanRoll(env, ...args),
      rerollStatLine: (...args) => talismanRerollStatLine(env, ...args),
      rollOtherUnique: (...args) => talismanRollOtherUnique(env, ...args),
      fromCosmos: (...args) => talismanFromCosmos(env, ...args),
      unseal: (...args) => talismanUnseal(env, ...args),
      exchange: (...args) => talismanExchange(env, ...args),
      wax: (...args) => talismanWax(env, ...args),
      waxPreview: (...args) => talismanWaxPreview(env, ...args),
      turn: (...args) => talismanTurn(env, ...args),
      describeLine: (...args) => talismanDescribeLine(env, ...args),
      wildDropsOpen: (...args) => talismanWildDropsOpen(env, ...args),
      rollWild: (...args) => talismanRollWild(env, ...args),
      rollWildDrop: (...args) => talismanRollWildDrop(env, ...args),
      receiveWild: (...args) => talismanReceiveWild(env, ...args),
      dropWild: (...args) => talismanDropWild(env, ...args),
      isWild: (id) => env.wildIds.has(id),
      conditionDelta: (...args) => talismanConditionDelta(env, ...args),
      describeDelta: (...args) => talismanDescribeDelta(env, ...args),
      isDirectional: (item) => !!item && env.DIRECTIONAL.has(item.special),
      directionName: (dir) => env.DIRECTION_NAMES[dir] || env.DIRECTION_NAMES[1],
      conditionDef: (id) => env.conditionPool.get(id),
      uniqueDef: (id) => env.uniquePool.get(id),
      statDef: (id) => env.statPool.get(id)
    });
  }

  // modules/talismans-classic.mjs
  var rules = createTalismans({
    get TALISMAN_CONDITION_POOL() {
      return TALISMAN_CONDITION_POOL;
    },
    get TALISMAN_STAT_POOL() {
      return TALISMAN_STAT_POOL;
    },
    get getStatName() {
      return getStatName;
    },
    get TALISMAN_UNSEAL_RULES() {
      return TALISMAN_UNSEAL_RULES;
    },
    get _t() {
      return _t;
    },
    get TALISMAN_ELEMENT_FOCUS() {
      return TALISMAN_ELEMENT_FOCUS;
    },
    get TALISMAN_UNIQUE_DB() {
      return TALISMAN_UNIQUE_DB;
    },
    get TALISMAN_WILD_UNIQUE_DB() {
      return TALISMAN_WILD_UNIQUE_DB;
    },
    get contentProgression() {
      return contentProgression;
    },
    get stumpBox() {
      return stumpBox;
    },
    get TALISMAN_WILD_DROPS() {
      return TALISMAN_WILD_DROPS;
    },
    get TALISMAN_SHARD_EXCHANGE() {
      return TALISMAN_SHARD_EXCHANGE;
    },
    get TALISMAN_WAX_COPY_PCT() {
      return TALISMAN_WAX_COPY_PCT;
    },
    get TALISMAN_CONDITION_EFFECTS() {
      return TALISMAN_CONDITION_EFFECTS;
    },
    get TALISMAN_HEX_RULES() {
      return TALISMAN_HEX_RULES;
    },
    get TALISMAN_CONDITION_WHEN() {
      return TALISMAN_CONDITION_WHEN;
    },
    get formatValue() {
      return formatValue;
    }
  });
  var talismans = Object.freeze({
    ...rules,
    wildDropsOpen: (state = game) => rules.wildDropsOpen(state),
    unseal: (source, state = game, random = Math.random) => rules.unseal(source, state, random),
    exchange: (index, state = game) => rules.exchange(index, state),
    wax: (id, state = game) => rules.wax(id, state),
    turn: (id, state = game) => rules.turn(id, state)
  });
  safeExposeGlobals({ talismans });
})();
