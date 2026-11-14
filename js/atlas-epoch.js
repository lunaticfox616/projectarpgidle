// GENERATED from modules/atlas-epoch*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-epoch-rules.mjs
  function atlasEraLedger(state) {
    return state.atlas.epoch;
  }
  function atlasEraRank(state, id) {
    return atlasEraLedger(state).perks[id] || 0;
  }
  function atlasEraMapNodes(env, state) {
    return state.atlas.completed.filter((id) => (env.deps.atlas.node(id) || {}).kind === "map").length;
  }
  function atlasEraReason(env, state) {
    if (state.atlas.seeds < env.deps.ATLAS.seeds.max) return env.deps._t("세계수 씨앗 {max}개가 필요합니다(지금 {seeds}개). 정점을 쓰러뜨리면 하나씩 얻습니다.", { max: env.deps.ATLAS.seeds.max, seeds: state.atlas.seeds });
    return env.deps.atlas.runOpenReason(state);
  }
  function atlasEraEssenceFor(env, state) {
    const rule = env.deps.ATLAS.epoch.essence;
    return rule.base + Math.floor(atlasEraMapNodes(env, state) / rule.perCompleted) + Math.floor(state.atlas.bonus.length / rule.perBonus) + state.atlas.seeds * rule.perSeed;
  }
  function atlasEraRebirth(env, state) {
    const why = atlasEraReason(env, state);
    if (why) return why;
    const epoch = atlasEraLedger(state), gained = atlasEraEssenceFor(env, state);
    epoch.count += 1;
    epoch.essence += gained;
    Object.assign(state.atlas, { completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, lastResult: null, starterSeason: 0 });
    env.deps.atlasEndgame.reset(state);
    env.deps.atlas.setLoadout(state, state.atlas.loadout);
    return "";
  }
  function atlasEraCost(env, state, id) {
    return (atlasEraRank(state, id) + 1) * env.deps.ATLAS.epoch.costStep;
  }
  function atlasEraBuyReason(env, state, id) {
    const perk = env.PERKS.get(id);
    if (!perk) return "없는 특전입니다.";
    if (atlasEraRank(state, id) >= perk.max) return "이미 가장 높은 단계입니다.";
    return atlasEraLedger(state).essence >= atlasEraCost(env, state, id) ? "" : env.deps._t("세계수 정수가 부족합니다(필요 {state}).", { state: atlasEraCost(env, state, id) });
  }
  function atlasEraBuy(env, state, id) {
    const why = atlasEraBuyReason(env, state, id);
    if (why) return why;
    atlasEraLedger(state).essence -= atlasEraCost(env, state, id);
    atlasEraLedger(state).perks[id] = atlasEraRank(state, id) + 1;
    return "";
  }
  function atlasEraEffects(env, state) {
    return env.deps.ATLAS.epoch.perks.filter((perk) => perk.effect && atlasEraRank(state, perk.id)).map((perk) => Object.fromEntries(Object.entries(perk.effect).map(([key, value]) => [key, value * atlasEraRank(state, perk.id)])));
  }
  function atlasEraPoints(env, state) {
    return env.deps.ATLAS.epoch.perks.reduce((sum, perk) => sum + (perk.points || 0) * atlasEraRank(state, perk.id), 0);
  }
  function atlasEraOffline(env, state) {
    return env.deps.ATLAS.epoch.perks.reduce((sum, perk) => sum + (perk.offline || 0) * atlasEraRank(state, perk.id), 0);
  }
  function atlasEraSupply(env, state) {
    const perk = env.PERKS.get("supply"), level = atlasEraRank(state, "supply");
    return level ? perk.supply.map(([key, amount]) => [key, amount * level]) : [];
  }
  function atlasEraNormalize(env, raw) {
    const source = raw && typeof raw === "object" ? raw : {}, perks = {};
    for (const perk of env.deps.ATLAS.epoch.perks) {
      const value = Math.floor(Number(source.perks && source.perks[perk.id]) || 0);
      if (value > 0) perks[perk.id] = Math.min(perk.max, value);
    }
    const count = (value) => Math.max(0, Math.min(1e6, Math.floor(Number(value) || 0)));
    return { count: count(source.count), essence: count(source.essence), perks };
  }

  // modules/domain/atlas-epoch.mjs
  function createAtlasEpoch(deps) {
    const env = { deps };
    env.PERKS = new Map(env.deps.ATLAS.epoch.perks.map((perk) => [perk.id, perk]));
    return Object.freeze({ perks: env.PERKS, rank: atlasEraRank, reason: (...args) => atlasEraReason(env, ...args), essenceFor: (...args) => atlasEraEssenceFor(env, ...args), rebirth: (...args) => atlasEraRebirth(env, ...args), cost: (...args) => atlasEraCost(env, ...args), buyReason: (...args) => atlasEraBuyReason(env, ...args), buy: (...args) => atlasEraBuy(env, ...args), effects: (...args) => atlasEraEffects(env, ...args), points: (...args) => atlasEraPoints(env, ...args), offline: (...args) => atlasEraOffline(env, ...args), supply: (...args) => atlasEraSupply(env, ...args), normalize: (...args) => atlasEraNormalize(env, ...args) });
  }

  // modules/atlas-epoch-classic.mjs
  var rules = createAtlasEpoch({
    get atlas() {
      return atlas;
    },
    get ATLAS() {
      return ATLAS;
    },
    get _t() {
      return _t;
    },
    get atlasEndgame() {
      return atlasEndgame;
    }
  });
  var atlasEpoch = rules;
  safeExposeGlobals({ atlasEpoch });
})();
