// GENERATED from modules/weapon-mastery*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/weapon-mastery-rules.mjs
  function masteryNeed(env, level) {
    return Math.round(env.M.curve.base * env.M.curve.growth ** (level - 1));
  }
  function masteryReachTable(env, curve) {
    const reach = [0, 0];
    for (let at = 1; at < env.M.maxLevel; at++) reach.push(reach[at] + Math.round(curve.base * curve.growth ** (at - 1)));
    return reach;
  }
  function masteryLevelOn(env, reach, xp) {
    let at = 1;
    while (at < env.M.maxLevel && xp >= reach[at + 1]) at++;
    return at;
  }
  function masteryUpgradeXp(env, xp, past) {
    const at = masteryLevelOn(env, past, xp);
    if (at >= env.M.maxLevel) return env.CAP;
    const share = (xp - past[at]) / (past[at + 1] - past[at]);
    return Math.round(env.REACH[at] + share * (env.REACH[at + 1] - env.REACH[at]));
  }
  function masteryUpgrade(env, book) {
    const past = env.PAST_REACH[book.v] || env.PAST_REACH[1];
    Object.keys(book.xp).forEach((id) => {
      const xp = Number(book.xp[id]);
      if (Number.isFinite(xp) && xp > 0) book.xp[id] = masteryUpgradeXp(env, xp, past);
    });
    book.v = env.M.curveVersion;
  }
  function masteryLedger(env, state) {
    const book = state.weaponMastery;
    if (!book || typeof book !== "object" || !book.xp || typeof book.xp !== "object" || Array.isArray(book.xp)) state.weaponMastery = { xp: {} };
    if (state.weaponMastery.v !== env.M.curveVersion) masteryUpgrade(env, state.weaponMastery);
    return state.weaponMastery;
  }
  function masteryXpOf(env, state, id) {
    const value = Number(masteryLedger(env, state).xp[id]);
    return Number.isFinite(value) && value > 0 ? Math.min(env.CAP, value) : 0;
  }
  function masteryLevelAt(env, xp) {
    return masteryLevelOn(env, env.REACH, xp);
  }
  function masteryLevel(env, state, id) {
    return masteryLevelAt(env, masteryXpOf(env, state, id));
  }
  function masteryProgress(env, state, id) {
    const xp = masteryXpOf(env, state, id), at = masteryLevelAt(env, xp);
    return { level: at, xp, into: xp - env.REACH[at], need: at >= env.M.maxLevel ? 0 : env.REACH[at + 1] - env.REACH[at] };
  }
  function masteryTotal(env, state) {
    return env.IDS.reduce((sum, id) => sum + masteryLevel(env, state, id), 0);
  }
  function masteryWielded(env, state) {
    return env.deps.getWeaponCategoryId(state.equipment && state.equipment["무기"]);
  }
  function masteryKillXp(env, enemy) {
    return enemy && enemy.isBoss ? env.M.killXp.boss : enemy && enemy.isElite ? env.M.killXp.elite : env.M.killXp.normal;
  }
  function* masteryOnKilled(env, state, enemy) {
    const id = masteryWielded(env, state);
    if (!id) return 0;
    const before = masteryLevel(env, state, id);
    masteryLedger(env, state).xp[id] = Math.min(env.CAP, masteryXpOf(env, state, id) + masteryKillXp(env, enemy));
    const after = masteryLevel(env, state, id);
    if (after <= before) return 0;
    yield { kind: "dispatchRuntimeEvent", args: ["weapon-mastery", { id, level: after, milestone: after % 10 === 0 }] };
    return after;
  }
  function masteryOpened(env, id, at) {
    return (env.M.milestones[id] || []).slice(0, Math.floor(at / 10));
  }
  function masteryPerLevel(env, at) {
    return env.M.perLevel.val * (at - 1);
  }
  function masteryLines(env, state) {
    const id = masteryWielded(env, state);
    if (!id) return [];
    const at = masteryLevel(env, state, id), rows = at > 1 ? [{ stat: env.M.perLevel.stat, val: masteryPerLevel(env, at) }] : [];
    masteryOpened(env, id, at).forEach((step) => step.forEach(([stat, val]) => rows.push({ stat, val })));
    return rows;
  }
  function masteryApplyStats(env, bucket, state) {
    masteryLines(env, state).forEach((line) => env.deps.addStatToBucket(bucket, line.stat, line.val));
  }
  function masteryOffline(env, state) {
    return env.M.totalSteps.filter((step) => masteryTotal(env, state) >= step).length * env.M.offlinePerStep;
  }
  function masteryGains(env, before, after) {
    return env.IDS.map((id) => ({ id, from: masteryLevel(env, before, id), to: masteryLevel(env, after, id) })).filter((row) => row.to > row.from);
  }

  // modules/domain/weapon-mastery.mjs
  function createWeaponMastery(deps) {
    const env = { deps };
    env.M = env.deps.WEAPON_MASTERY;
    env.IDS = Object.freeze(Object.keys(env.deps.WEAPON_CATEGORIES));
    env.REACH = masteryReachTable(env, env.M.curve);
    env.PAST_REACH = Object.fromEntries(Object.entries(env.M.pastCurves).map(([version, curve]) => [version, masteryReachTable(env, curve)]));
    env.CAP = env.REACH[env.M.maxLevel];
    return Object.freeze({
      ids: env.IDS,
      need: (...args) => masteryNeed(env, ...args),
      reach: (level) => env.REACH[level],
      level: (...args) => masteryLevel(env, ...args),
      progress: (...args) => masteryProgress(env, ...args),
      total: (...args) => masteryTotal(env, ...args),
      wielded: (...args) => masteryWielded(env, ...args),
      onKilled: (...args) => masteryOnKilled(env, ...args),
      opened: (...args) => masteryOpened(env, ...args),
      perLevel: (...args) => masteryPerLevel(env, ...args),
      lines: (...args) => masteryLines(env, ...args),
      applyStats: (...args) => masteryApplyStats(env, ...args),
      offline: (...args) => masteryOffline(env, ...args),
      gains: (...args) => masteryGains(env, ...args)
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

  // modules/weapon-mastery-classic.mjs
  var rules = createWeaponMastery({
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get addStatToBucket() {
      return addStatToBucket;
    },
    get WEAPON_MASTERY() {
      return WEAPON_MASTERY;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    }
  });
  var weaponMastery = Object.freeze({
    ...rules,
    onKilled: (state, enemy) => runRuntimeEventCommands(rules.onKilled(state, enemy), dispatchRuntimeEvent)
  });
  safeExposeGlobals({ weaponMastery });
})();
