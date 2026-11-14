// GENERATED from modules/chronicle*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/chronicle-rules.mjs
  function chronicleList(value) {
    return Array.isArray(value) ? value : [];
  }
  function chronicleKeysOf(value) {
    return value && typeof value === "object" ? Object.keys(value).filter((key) => value[key]) : [];
  }
  function chronicleCount(value, goal) {
    return { count: Math.max(0, Math.floor(Number(value) || 0)), goal };
  }
  function chronicleCompletedLoops(state) {
    const loops = Math.max(0, Math.floor(Number(state.loopCount) || 0));
    return loops > 0 ? loops : Math.max(0, Math.floor(Number(state.season) || 1) - 1);
  }
  function chronicleChapters(env, state) {
    return env.C.chapters.map((row) => {
      const read = env.COUNTERS[row.id](state), goal = row.goal || read.goal || 1;
      return { ...row, count: Math.min(read.count, goal), goal, share: Math.min(1, read.count / goal) };
    });
  }
  function chronicleCompletion(env, state) {
    const rows = chronicleChapters(env, state), weight = rows.reduce((sum, row) => sum + row.weight, 0);
    const share = rows.reduce((sum, row) => sum + row.weight * row.share, 0) / weight;
    return { rows, share, earned: Math.min(env.C.rings, Math.floor(share * env.C.rings + 1e-9)) };
  }
  function chronicleLedger(env, state) {
    if (!state.chronicle || typeof state.chronicle !== "object") state.chronicle = { rings: 0 };
    const rings = Math.floor(Number(state.chronicle.rings) || 0);
    state.chronicle.rings = Math.max(0, Math.min(env.C.rings, rings));
    return state.chronicle;
  }
  function chronicleRings(env, state) {
    return chronicleLedger(env, state).rings;
  }
  function* chronicleCheck(env, state) {
    const book = chronicleLedger(env, state), earned = chronicleCompletion(env, state).earned;
    if (earned <= book.rings) return [];
    const fresh = Array.from({ length: earned - book.rings }, (_, index) => book.rings + index + 1);
    book.rings = earned;
    yield { kind: "dispatchRuntimeEvent", args: ["chronicle-ring", { rings: fresh, total: earned }] };
    return fresh;
  }
  function chronicleOffline(env, state) {
    return chronicleRings(env, state) * env.C.offlinePerRing;
  }

  // modules/domain/chronicle.mjs
  function createChronicle(deps) {
    const env = { deps };
    env.C = env.deps.CHRONICLE;
    env.journalIds = new Set(env.deps.JOURNAL_ENTRY_ORDER.filter((id) => !env.deps.JOURNAL_DB[id].discoveryOnly));
    env.COUNTERS = Object.freeze({
      codex: (state) => chronicleCount(chronicleKeysOf(state.uniqueCodex).filter((key) => env.deps.UNIQUE_CODEX_KEYS.has(key)).length, env.deps.UNIQUE_CODEX_KEYS.size),
      mastery: (state) => chronicleCount(env.deps.weaponMastery.total(state), env.deps.weaponMastery.ids.length * env.deps.WEAPON_MASTERY.maxLevel),
      talismans: (state) => chronicleCount(chronicleList(state.stumpBox && state.stumpBox.codex).length, env.deps.TALISMAN_UNIQUE_DB.length + env.deps.TALISMAN_WILD_UNIQUE_DB.length),
      journal: (state) => chronicleCount(chronicleList(state.journalEntries).filter((id) => env.journalIds.has(id)).length, env.journalIds.size),
      depth: (state) => chronicleCount(Math.max(0, (Number(state.records && state.records.best && state.records.best.abyssDepth) || 0) - 20), null),
      loops: (state) => chronicleCount(chronicleCompletedLoops(state), null),
      harvest: (state) => chronicleCount(
        chronicleList(state.stumpBox && state.stumpBox.harvest && state.stumpBox.harvest.grown).length,
        env.deps.STUMP_BOX_HARVEST.rows.length * Object.keys(env.deps.STUMP_BOX_COLORS).length
      ),
      fishing: (state) => chronicleCount(
        chronicleKeysOf(state.ocean && state.ocean.fishCaughtTotal).filter((key) => Object.hasOwn(env.deps.OCEAN_FISH_DB, key)).length,
        Object.keys(env.deps.OCEAN_FISH_DB).length
      ),
      variants: (state) => chronicleCount(
        state.atlas && state.atlas.memory ? env.deps.bossVariants.records(state).filter((row) => row.kills > 0).length : 0,
        env.deps.BOSS_VARIANTS.kinds.length
      ),
      memory: (state) => chronicleCount(Math.max(0, ...Object.values(state.atlas && state.atlas.memory && state.atlas.memory.best || {}).map(Number)), null),
      epochs: (state) => chronicleCount(state.atlas && state.atlas.epoch ? state.atlas.epoch.count : 0, null)
    });
    return Object.freeze({
      chapters: (...args) => chronicleChapters(env, ...args),
      completion: (...args) => chronicleCompletion(env, ...args),
      rings: (...args) => chronicleRings(env, ...args),
      check: (...args) => chronicleCheck(env, ...args),
      offline: (...args) => chronicleOffline(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/runtime-event-commands.mjs
  function runRuntimeEventCommands(commands, dispatch) {
    return consumeDomainCommands(commands, { dispatchRuntimeEvent: dispatch });
  }

  // modules/chronicle-classic.mjs
  var rules = createChronicle({
    get CHRONICLE() {
      return CHRONICLE;
    },
    get JOURNAL_ENTRY_ORDER() {
      return JOURNAL_ENTRY_ORDER;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get UNIQUE_CODEX_KEYS() {
      return UNIQUE_CODEX_KEYS;
    },
    get weaponMastery() {
      return weaponMastery;
    },
    get WEAPON_MASTERY() {
      return WEAPON_MASTERY;
    },
    get TALISMAN_UNIQUE_DB() {
      return TALISMAN_UNIQUE_DB;
    },
    get TALISMAN_WILD_UNIQUE_DB() {
      return TALISMAN_WILD_UNIQUE_DB;
    },
    get STUMP_BOX_HARVEST() {
      return STUMP_BOX_HARVEST;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get OCEAN_FISH_DB() {
      return OCEAN_FISH_DB;
    },
    get bossVariants() {
      return bossVariants;
    },
    get BOSS_VARIANTS() {
      return BOSS_VARIANTS;
    }
  });
  var chronicle = Object.freeze({
    ...rules,
    check: (state) => runRuntimeEventCommands(rules.check(state), dispatchRuntimeEvent)
  });
  safeExposeGlobals({ chronicle });
})();
