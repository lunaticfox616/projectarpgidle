// GENERATED from modules/unique-hunt*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/unique-hunt-rules.mjs
  function huntGetUniqueHuntEntryKey(entry) {
    if (!entry || typeof entry.name !== "string" || !Array.isArray(entry.slots) || !entry.slots[0]) return "";
    return `${entry.slots[0]}|${entry.name}`;
  }
  function huntGetUniqueHuntEntry(env, key) {
    let targetKey = typeof key === "string" ? key : "";
    return env.deps.UNIQUE_DB.find((entry) => !entry.realmCodexOnly && huntGetUniqueHuntEntryKey(entry) === targetKey) || null;
  }
  function huntEnsureUniqueHuntState(env, targetGame) {
    let source = Array.isArray(targetGame.uniqueHuntTargets) ? targetGame.uniqueHuntTargets : [];
    let seen = /* @__PURE__ */ new Set();
    targetGame.uniqueHuntTargets = source.filter((key) => {
      if (typeof key !== "string" || seen.has(key) || !huntGetUniqueHuntEntry(env, key)) return false;
      seen.add(key);
      return true;
    }).slice(0, env.UNIQUE_HUNT_TARGET_LIMIT);
    return targetGame.uniqueHuntTargets;
  }
  function huntGetUniqueHuntTargets(env, targetGame) {
    return huntEnsureUniqueHuntState(env, targetGame).map((...args) => huntGetUniqueHuntEntry(env, ...args)).filter(Boolean);
  }
  function* huntToggleUniqueHuntTarget(env, key, targetGame) {
    let entry = huntGetUniqueHuntEntry(env, key);
    if (!entry) return { ok: false, tracked: false, reason: env.deps._t("추적할 수 없는 고유 아이템입니다.") };
    let targets = huntEnsureUniqueHuntState(env, targetGame);
    let index = targets.indexOf(key);
    if (index >= 0) {
      targetGame.uniqueHuntTargets = targets.filter((target) => target !== key);
      yield { kind: "dispatchRuntimeEvent", args: ["unique-hunt-changed", { action: "removed", key }] };
      return { ok: true, tracked: false, entry };
    }
    if (targets.length >= env.UNIQUE_HUNT_TARGET_LIMIT) {
      return { ok: false, tracked: false, reason: env.deps._t("파밍 목표는 최대 {UNIQUE_HUNT_TARGET_LIMIT}개까지 지정할 수 있습니다.", { UNIQUE_HUNT_TARGET_LIMIT: env.UNIQUE_HUNT_TARGET_LIMIT }) };
    }
    targetGame.uniqueHuntTargets = targets.concat(key);
    yield { kind: "dispatchRuntimeEvent", args: ["unique-hunt-changed", { action: "added", key }] };
    return { ok: true, tracked: true, entry };
  }
  function huntIsUniqueHuntTargetItem(env, item, targetGame) {
    if (!item || item.rarity !== "unique" || typeof item.slot !== "string" || typeof item.name !== "string") return false;
    return huntEnsureUniqueHuntState(env, targetGame).includes(`${item.slot}|${item.name}`);
  }
  function* huntCompleteUniqueHuntTarget(env, item, targetGame, notify) {
    if (!huntIsUniqueHuntTargetItem(env, item, targetGame)) return null;
    let key = `${item.slot}|${item.name}`;
    let entry = huntGetUniqueHuntEntry(env, key);
    targetGame.uniqueHuntTargets = huntEnsureUniqueHuntState(env, targetGame).filter((target) => target !== key);
    if (notify) yield { kind: "dispatchRuntimeEvent", args: ["unique-hunt-changed", { action: "completed", key }] };
    return entry;
  }

  // modules/domain/unique-hunt.mjs
  function createUniqueHunt(deps) {
    const env = { deps };
    env.UNIQUE_HUNT_TARGET_LIMIT = 3;
    return Object.freeze({
      limit: env.UNIQUE_HUNT_TARGET_LIMIT,
      ensureState: (...args) => huntEnsureUniqueHuntState(env, ...args),
      getKey: huntGetUniqueHuntEntryKey,
      getEntry: (...args) => huntGetUniqueHuntEntry(env, ...args),
      getTargets: (...args) => huntGetUniqueHuntTargets(env, ...args),
      toggle: (...args) => huntToggleUniqueHuntTarget(env, ...args),
      isTargetItem: (...args) => huntIsUniqueHuntTargetItem(env, ...args),
      complete: (...args) => huntCompleteUniqueHuntTarget(env, ...args)
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

  // modules/unique-hunt-classic.mjs
  var rules = createUniqueHunt({
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get _t() {
      return _t;
    }
  });
  var UNIQUE_HUNT_TARGET_LIMIT = rules.limit;
  var getUniqueHuntEntryKey = rules.getKey;
  var getUniqueHuntEntry = rules.getEntry;
  function ensureUniqueHuntState(targetGame = game) {
    return rules.ensureState(targetGame);
  }
  function getUniqueHuntTargets(targetGame = game) {
    return rules.getTargets(targetGame);
  }
  function toggleUniqueHuntTarget(key, targetGame = game) {
    return runRuntimeEventCommands(rules.toggle(key, targetGame), dispatchRuntimeEvent);
  }
  function isUniqueHuntTargetItem(item, targetGame = game) {
    return rules.isTargetItem(item, targetGame);
  }
  function completeUniqueHuntTarget(item, targetGame = game) {
    return runRuntimeEventCommands(rules.complete(item, targetGame, targetGame === game), dispatchRuntimeEvent);
  }
  var uniqueHuntRuntime = Object.freeze({
    limit: UNIQUE_HUNT_TARGET_LIMIT,
    ensureState: ensureUniqueHuntState,
    getKey: getUniqueHuntEntryKey,
    getEntry: getUniqueHuntEntry,
    getTargets: getUniqueHuntTargets,
    toggle: toggleUniqueHuntTarget,
    isTargetItem: isUniqueHuntTargetItem,
    complete: completeUniqueHuntTarget
  });
  safeExposeGlobals({
    UNIQUE_HUNT_TARGET_LIMIT,
    getUniqueHuntEntryKey,
    getUniqueHuntEntry,
    ensureUniqueHuntState,
    getUniqueHuntTargets,
    toggleUniqueHuntTarget,
    isUniqueHuntTargetItem,
    completeUniqueHuntTarget,
    uniqueHuntRuntime
  });
})();
