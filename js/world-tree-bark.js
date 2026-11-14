// GENERATED from modules/world-tree-bark*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/world-tree-bark-rules.mjs
  function barkProgressStatDef(env, key) {
    return env.deps.WORLD_TREE_BARK.stats.find((def) => def.key === key);
  }
  function barkProgressBarkSpent(env, owner) {
    return env.deps.WORLD_TREE_BARK.stats.reduce((sum, def) => sum + Math.max(0, Math.floor(Number((owner.worldTreeBark || {})[def.key]) || 0)), 0);
  }
  function barkProgressBarkPoints(env, owner) {
    const earned = env.deps.getWorldTreeBarkEarned(owner), spent = barkProgressBarkSpent(env, owner);
    return { earned, spent, free: Math.max(0, earned - spent) };
  }
  function barkProgressBarkHasFreePoints(env, owner) {
    return barkProgressBarkPoints(env, owner).free > 0;
  }
  function barkProgressBarkAllocationRefusal(owner) {
    return owner.woodsmanBuildLock ? "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다." : "";
  }
  function barkProgressAllocateBarkPoints(env, owner, key, delta) {
    const def = barkProgressStatDef(env, key);
    if (!def || barkProgressBarkAllocationRefusal(owner)) return 0;
    const now = Math.max(0, Math.floor(Number(owner.worldTreeBark[key]) || 0));
    const room = def.max === null ? Infinity : def.max - now;
    const moved = delta > 0 ? Math.min(delta, room, barkProgressBarkPoints(env, owner).free) : Math.max(delta, -now);
    owner.worldTreeBark[key] = now + moved;
    return moved;
  }
  function barkProgressResetBarkPoints(env, owner) {
    if (barkProgressBarkAllocationRefusal(owner)) return false;
    env.deps.WORLD_TREE_BARK.stats.forEach((def) => {
      owner.worldTreeBark[def.key] = 0;
    });
    return true;
  }
  function* barkProgressNoteActTenClear(env, owner, zone) {
    if (zone.id !== env.deps.WORLD_TREE_BARK.points.actTenZoneId || owner.isBackgroundCalculation) return;
    const loop = env.deps.ensureRecordsState(owner).currentLoop, bark = owner.worldTreeBark;
    if (loop.actClears[zone.id] !== void 0) return;
    const minutes = (Number(loop.activeMs) || 0) / 6e4, have = Array.isArray(bark.timeGoals) ? bark.timeGoals : [];
    const fresh = env.deps.WORLD_TREE_BARK.points.actTenMinutes.filter((goal) => minutes <= goal && !have.includes(goal));
    if (!fresh.length) return;
    bark.timeGoals = [...have, ...fresh];
    yield { kind: "barkNotify", args: ["bark-points", { gain: fresh.length * env.deps.WORLD_TREE_BARK.points.actTenGoal, why: env.deps._t("액트 10을 {min}분 안에 돌파", { min: Math.min(...fresh) }) }] };
  }
  function* barkProgressRewardPinnacleFirstKill(env, entryId) {
    if (!env.deps.PINNACLE_FIRST_KILL_JOURNALS.includes(entryId)) return;
    yield { kind: "barkGrantCurrency", args: ["ouroboros", 1] };
    yield { kind: "barkNotify", args: ["bark-points", { gain: env.deps.WORLD_TREE_BARK.points.pinnacle, why: "정점 보스 첫 처치" }] };
  }
  function barkProgressNextLoopBarkLine(env, nextLoop) {
    const rule = env.deps.WORLD_TREE_BARK.points;
    if (nextLoop < rule.startLoop) return "";
    return env.deps._t("껍질 포인트 +{value}", { value: nextLoop === rule.startLoop ? rule.start : rule.perLoop });
  }
  function* barkProgressNoticeFirstBark(env, owner) {
    if (owner.season === env.deps.WORLD_TREE_BARK.points.startLoop) yield { kind: "barkTutorial", args: ["world_tree_bark", env.deps._t("세계수 껍질"), env.deps._t("첫 껍질이 자랐습니다.\n껍질 포인트를 나누면 지나온 앞 구간을 빠르게 지나갑니다.\n루프 패시브 창에서 나누세요."), "tab-season"] };
  }

  // modules/domain/world-tree-bark.mjs
  function createWorldTreeBark(deps) {
    const env = { deps };
    return Object.freeze({ barkPoints: (...args) => barkProgressBarkPoints(env, ...args), barkHasFreePoints: (...args) => barkProgressBarkHasFreePoints(env, ...args), barkAllocationRefusal: barkProgressBarkAllocationRefusal, allocateBarkPoints: (...args) => barkProgressAllocateBarkPoints(env, ...args), resetBarkPoints: (...args) => barkProgressResetBarkPoints(env, ...args), noteActTenClear: (...args) => barkProgressNoteActTenClear(env, ...args), rewardPinnacleFirstKill: (...args) => barkProgressRewardPinnacleFirstKill(env, ...args), nextLoopBarkLine: (...args) => barkProgressNextLoopBarkLine(env, ...args), noticeFirstBark: (...args) => barkProgressNoticeFirstBark(env, ...args) });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/world-tree-bark-classic.mjs
  var rules = createWorldTreeBark({
    get WORLD_TREE_BARK() {
      return WORLD_TREE_BARK;
    },
    get getWorldTreeBarkEarned() {
      return getWorldTreeBarkEarned;
    },
    get ensureRecordsState() {
      return ensureRecordsState;
    },
    get _t() {
      return _t;
    },
    get PINNACLE_FIRST_KILL_JOURNALS() {
      return PINNACLE_FIRST_KILL_JOURNALS;
    }
  });
  var effects = {
    barkNotify: (...args) => dispatchRuntimeEvent(...args),
    barkGrantCurrency: (...args) => commitCurrencyGain(...args),
    barkTutorial: (...args) => queueTutorialNotice(...args)
  };
  var worldTreeBark = Object.freeze({
    ...rules,
    noteActTenClear: (zone) => consumeDomainCommands(rules.noteActTenClear(game, zone), effects),
    rewardPinnacleFirstKill: (entryId) => consumeDomainCommands(rules.rewardPinnacleFirstKill(entryId), effects),
    noticeFirstBark: () => consumeDomainCommands(rules.noticeFirstBark(game), effects)
  });
  safeExposeGlobals({ worldTreeBark });
})();
