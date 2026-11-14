// GENERATED from modules/garden-oils*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/garden-oils-rules.mjs
  function oilOpen(env, state) {
    return env.deps.contentProgression.holds("garden", state);
  }
  function oilPools(env) {
    if (env.poolCache) return env.poolCache;
    const bucket = env.deps.createEmptyStatBucket();
    const majors = Object.values(env.deps.PASSIVE_TREE.nodes).filter((node) => node && node.kind === "major" && Array.isArray(node.effects) && node.effects.length > 0 && node.effects.every((effect) => Object.hasOwn(bucket, effect.stat)));
    env.poolCache = Object.fromEntries(Object.entries(env.G.pools).map(([color, archetypes]) => [
      color,
      majors.filter((node) => archetypes.includes(node.archetype)).sort((a, b) => a.id.localeCompare(b.id))
    ]));
    return env.poolCache;
  }
  function oilColorsOf(env, bowl) {
    return (Array.isArray(bowl) ? bowl : []).map((key) => (env.BY_KEY.get(key) || {}).color).filter(Boolean);
  }
  function oilOffers(env, state, bowl) {
    const colors = oilColorsOf(env, bowl).sort();
    if (colors.length !== env.G.perAnoint) return [];
    const pure = new Set(colors).size === 1, picked = [];
    let seed = Math.abs(env.deps.hashSeed(`oil:${Number(state.season) || 1}:${colors.join(",")}`)) >>> 0 || 1;
    const random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296;
    for (const color of colors) {
      const pool = oilPools(env)[color].filter((node) => (!pure || (node.powerBand || 0) >= env.G.pureBand) && !picked.includes(node));
      if (pool.length) picked.push(pool[Math.floor(random() * pool.length)]);
    }
    return picked.slice(0, env.G.offers);
  }
  function oilNeeds(bowl) {
    return (Array.isArray(bowl) ? bowl : []).reduce((out, key) => ({ ...out, [key]: (out[key] || 0) + 1 }), {});
  }
  function oilAnointReason(env, state, item, bowl) {
    if (!oilOpen(env, state)) return "시든 정원 해금 뒤에 바를 수 있습니다.";
    if (!item || item.slot !== "목걸이") return "목걸이에만 바를 수 있습니다.";
    if (oilColorsOf(env, bowl).length !== env.G.perAnoint) return env.deps._t("기름 {perAnoint}개를 고르세요.", { perAnoint: env.G.perAnoint });
    const short = Object.entries(oilNeeds(bowl)).find(([key, need]) => (state.currencies[key] || 0) < need);
    return short ? env.deps._t("{name} 부족합니다.", { name: env.deps.withSubjectParticle(env.BY_KEY.get(short[0]).name) }) : "";
  }
  function oilMajorOf(env, id) {
    const node = id ? env.deps.PASSIVE_TREE.nodes[id] : null;
    return node && node.kind === "major" ? node : null;
  }
  function oilNodesOf(env, item) {
    return item && item.anoint ? [oilMajorOf(env, item.anoint.nodeId), oilMajorOf(env, item.anoint.second)] : [null, null];
  }
  function oilNodeOf(env, item) {
    return oilNodesOf(env, item)[0];
  }
  function oilSlotCount(env, state) {
    return env.deps.contentProgression.holds("oilSecond", state) ? 2 : 1;
  }
  function oilSlotReason(env, state, item, nodeId, slot) {
    if (slot !== 0 && (slot !== 1 || oilSlotCount(env, state) < 2)) return "둘째 자리는 기름 둘째 자리 해금 뒤에 열립니다.";
    const [first, second] = oilNodesOf(env, item), other = slot === 0 ? second : first;
    if (slot === 1 && !first) return "첫째 자리부터 바르세요.";
    return other && other.id === nodeId ? "같은 노드를 두 자리에 새길 수 없습니다." : "";
  }
  function oilAnoint(env, state, item, bowl, ...selection) {
    const [nodeId, slot = 0] = selection;
    const reason = oilAnointReason(env, state, item, bowl) || oilSlotReason(env, state, item, nodeId, slot);
    if (reason) return { ok: false, reason };
    const node = oilOffers(env, state, bowl).find((row) => row.id === nodeId);
    if (!node) return { ok: false, reason: env.deps._t("그 노드는 이 조합에 없습니다.") };
    Object.entries(oilNeeds(bowl)).forEach(([key, need]) => {
      state.currencies[key] -= need;
    });
    const [first, second] = oilNodesOf(env, item);
    item.anoint = slot === 1 ? { nodeId: first.id, second: node.id } : { nodeId: node.id, ...second ? { second: second.id } : {} };
    return { ok: true, node };
  }
  function oilLines(env, item) {
    return oilNodesOf(env, item).filter(Boolean).flatMap((node) => node.effects.map((effect) => ({
      id: effect.stat,
      val: effect.val,
      statName: env.deps._t("[기름] {stat}", { stat: env.deps.getStatName(effect.stat) }),
      anointLine: true
    })));
  }
  function oilNormalize(env, item) {
    if (!item || !item.anoint) return;
    const [first, second] = item.slot === "목걸이" ? oilNodesOf(env, item) : [null, null];
    if (!first) delete item.anoint;
    else item.anoint = second && second.id !== first.id ? { nodeId: first.id, second: second.id } : { nodeId: first.id };
  }
  function oilKillDrops(env, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== "witheredGarden" || enemy.isBoss) return [];
    if (random() >= env.G.killDrops[enemy.isElite ? "elite" : "normal"]) return [];
    return [[env.KEYS[Math.min(env.KEYS.length - 1, Math.floor(random() * env.KEYS.length))], 1]];
  }
  function oilFruitRecipe(env, [group], state) {
    if (!oilOpen(env, state)) return { ok: false, reason: env.deps._t("시든 정원 해금 뒤에 만들 수 있습니다.") };
    const oil = env.BY_COLOR.get(group[0] && group[0].item && group[0].item.color);
    return oil ? { ok: true, consumed: group, outputs: [{ kind: "currency", key: oil.key, amount: 1 }] } : { ok: false, reason: env.deps._t("이 색의 기름은 없습니다.") };
  }

  // modules/domain/garden-oils.mjs
  function createGardenOils(deps) {
    const env = { deps };
    env.G = env.deps.GARDEN_OILS;
    env.BY_KEY = new Map(env.G.oils.map((oil) => [oil.key, oil]));
    env.BY_COLOR = new Map(env.G.oils.map((oil) => [oil.color, oil]));
    env.KEYS = Object.freeze(env.G.oils.map((oil) => oil.key));
    env.poolCache = null;
    return Object.freeze({
      keys: env.KEYS,
      open: (...args) => oilOpen(env, ...args),
      offers: (...args) => oilOffers(env, ...args),
      anointReason: (...args) => oilAnointReason(env, ...args),
      slotReason: (...args) => oilSlotReason(env, ...args),
      slotCount: (...args) => oilSlotCount(env, ...args),
      anoint: (...args) => oilAnoint(env, ...args),
      nodeOf: (...args) => oilNodeOf(env, ...args),
      nodesOf: (...args) => oilNodesOf(env, ...args),
      lines: (...args) => oilLines(env, ...args),
      normalize: (...args) => oilNormalize(env, ...args),
      killDrops: (...args) => oilKillDrops(env, ...args),
      fruitRecipe: (...args) => oilFruitRecipe(env, ...args),
      oil: (key) => env.BY_KEY.get(key) || null
    });
  }

  // modules/garden-oils-classic.mjs
  var rules = createGardenOils({
    get contentProgression() {
      return contentProgression;
    },
    get createEmptyStatBucket() {
      return createEmptyStatBucket;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get hashSeed() {
      return hashSeed;
    },
    get _t() {
      return _t;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    },
    get getStatName() {
      return getStatName;
    },
    get GARDEN_OILS() {
      return GARDEN_OILS;
    }
  });
  var gardenOils = rules;
  safeExposeGlobals({ gardenOils });
})();
