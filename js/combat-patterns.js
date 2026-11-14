// GENERATED from modules/combat-patterns*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/boss-pattern-values.mjs
  var BOSS_PATTERN_NAMES = /* @__PURE__ */ Object.freeze({
    intro: "세 가지 특수기",
    burst: "연속 참격",
    slam: "파쇄 강타",
    ramp: "격앙",
    cosmos: "성좌 순환",
    coreFrenzy: "핵 폭주",
    cosmosBoss: "은하 고유 기믹",
    apex: "후반부 보스 고유 기믹",
    rootGrinder: "회전 톱날"
  });
  var BOSS_PATTERN_DESCRIPTIONS = /* @__PURE__ */ Object.freeze({
    intro: "때때로 예고한 칸에 특수기를 씁니다. 생명력이 적을수록 자주 쓰고, 보스마다 세 가지(갈래 사격, 연쇄 폭발, 이중 파동 등) 가운데 하나를 고르며 같은 특수기를 잇달아 쓰지 않습니다. 예고가 뜨면 이동 스킬을 눌러 범위를 벗어날 수 있습니다.",
    burst: "때때로 연속 참격으로 피해가 30% 증가합니다. 생명력이 적을수록 자주 씁니다.",
    slam: "때때로 파쇄 강타로 피해가 55% 증가합니다. 생명력이 적을수록 자주 씁니다.",
    ramp: "생명력이 낮아질수록 최대 3단계까지 격앙하여 공격 피해가 증가합니다. 때때로 영웅 자리에 충격파를 내고, 생명력이 적을수록 자주 냅니다.",
    cosmos: "연속 참격/파쇄 강타/격앙을 차례로 순환합니다.",
    coreFrenzy: "연속 참격, 파쇄 강타, 격앙을 차례로 씁니다.",
    cosmosBoss: "은하 보스마다 고유한 공격 순서와 파훼 조건을 사용합니다.",
    apex: "아틀라스 후반부 보스는 단계마다 이름이 붙은 특수기를 정해진 횟수마다 예고한 뒤 씁니다.",
    rootGrinder: "공격마다 예고한 칸을 톱날로 여러 번 갈아 냅니다. 칸에 머무르는 동안 계속 맞습니다."
  });
  var BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS = /* @__PURE__ */ Object.freeze({
    intro: 1.15,
    burst: 1.3,
    slam: 1.55,
    ramp: 1.21,
    cosmos: 1.34,
    coreFrenzy: 1.34
  });
  var SPECIAL_ODDS = /* @__PURE__ */ Object.freeze({ full: 0.22, empty: 0.8 });
  var SHAPE_REST = 4;
  var PITY = 5;
  var OWN_PATTERN_MODES = /* @__PURE__ */ new Set(["cosmosBoss", "apex", "rootGrinder"]);
  var SPECIAL_RECOVERY_MS = /* @__PURE__ */ Object.freeze({ intro: 600, burst: 450, slam: 750, ramp: 350 });
  var CORE_FRENZY_RECOVERY_SHARE = 0.5;

  // modules/combat/boss-pattern-rules.mjs
  function bossGetBossPatternPeakDamageMultiplier(mode) {
    return BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS[String(mode || "")] || 1;
  }
  function bossGetMaximumBossPatternDamageMultiplier() {
    return Math.max(...Object.values(BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS));
  }
  function bossGetBossPatternModesForLoop(loopValue) {
    const loop = Math.max(1, Math.floor(Number(loopValue) || 1));
    if (loop < 6) return ["intro"];
    if (loop === 6) return ["ramp"];
    if (loop === 7) return ["ramp", "burst"];
    return ["ramp", "burst", "slam"];
  }
  function bossGetMaximumBossPatternDamageMultiplierForLoop(loopValue) {
    const modes = bossGetBossPatternModesForLoop(loopValue);
    if (modes.length === 0) return 1;
    return Math.max(...modes.map(bossGetBossPatternPeakDamageMultiplier));
  }
  function bossNormalizeAttackCount(enemy) {
    return Math.max(0, Math.floor(Number(enemy && enemy.patternAttackCount) || 0));
  }
  function bossGetRampStage(enemy) {
    let maxHp = Math.max(1, Number(enemy && enemy.maxHp) || 1);
    let hp = Math.max(0, Math.min(maxHp, Number(enemy && enemy.hp) || 0));
    let missingRatio = 1 - hp / maxHp;
    if (missingRatio >= 0.72) return 3;
    if (missingRatio >= 0.42) return 2;
    if (missingRatio >= 0.18) return 1;
    return 0;
  }
  function bossRecoveryOf(state) {
    return state.recoveryMs ?? (state.isSpecial && !OWN_PATTERN_MODES.has(state.patternMode) && state.patternMode !== "cosmos" ? (SPECIAL_RECOVERY_MS[state.mode] || 0) * (state.patternMode === "coreFrenzy" ? CORE_FRENZY_RECOVERY_SHARE : 1) : 0);
  }
  function bossGetBossPatternModeLabel(mode) {
    return BOSS_PATTERN_NAMES[String(mode || "")] || "";
  }
  function bossGetBossPatternDescription(mode) {
    return BOSS_PATTERN_DESCRIPTIONS[String(mode || "")] || "";
  }
  function bossWarningDuration(env2, state) {
    return state.warningMs || env2.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs;
  }
  function bossKeepsOldClock(state) {
    return OWN_PATTERN_MODES.has(state.patternMode) || state.patternMode === "cosmos";
  }

  // modules/common/numbers.mjs
  function hashSeed(value) {
    let str = String(value);
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // modules/combat/boss-special-plan.mjs
  function bossRollShare(enemy, attackNumber, salt) {
    return (hashSeed(`${enemy.id}|${attackNumber}|${salt}`) >>> 0) / 4294967296;
  }
  function bossPickSpecialShape(enemy, attackNumber, count) {
    const used = enemy.specialShapeUsedAt || {}, rested = [];
    for (let index = 0; index < count; index++) if (!(attackNumber - (used[index] ?? -99) <= SHAPE_REST)) rested.push(index);
    const pool = rested.length ? rested : [[...Array(count).keys()].sort((a, b) => (used[a] ?? -99) - (used[b] ?? -99))[0]];
    return pool[Math.floor(bossRollShare(enemy, attackNumber, "shape") * pool.length)];
  }
  function bossSpecialOdds(enemy) {
    const share = Math.max(0, Math.min(1, (Number(enemy.hp) || 0) / Math.max(1, Number(enemy.maxHp) || 1)));
    return SPECIAL_ODDS.empty + (SPECIAL_ODDS.full - SPECIAL_ODDS.empty) * share;
  }
  function bossPlanBossSpecial(enemy, attackNumber, shapeCount) {
    const kept = enemy.specialPlan;
    if (kept && kept.attackNumber === attackNumber) return kept;
    const last = Number(enemy.lastSpecialAttack) || 0, resting = attackNumber < 2 || last > 0 && attackNumber - last <= 1;
    const special = !resting && (attackNumber - last > PITY || bossRollShare(enemy, attackNumber, "special") < bossSpecialOdds(enemy));
    enemy.specialPlan = { attackNumber, special, shape: special ? bossPickSpecialShape(enemy, attackNumber, Math.max(1, shapeCount)) : -1 };
    return enemy.specialPlan;
  }
  function bossNoteBossSpecial(enemy, state) {
    if (!state.isSpecial || !Number.isFinite(state.shapeIndex)) return;
    enemy.lastSpecialAttack = state.attackNumber;
    if (state.shapeIndex >= 0) enemy.specialShapeUsedAt = { ...enemy.specialShapeUsedAt || {}, [state.shapeIndex]: state.attackNumber };
  }
  function bossStyleSpecialPlan(env2, enemy, attackNumber, family) {
    const shapes = env2.deps.bossMoves.familyShapes(enemy, family), plan = bossPlanBossSpecial(enemy, attackNumber, shapes.length);
    return plan.special ? { ...plan, ...env2.deps.bossMoves.shapeLook(enemy, shapes[plan.shape]) } : plan;
  }

  // modules/combat/boss-pattern-states.mjs
  function bossBuildSlamPatternState(env2, mode, attackNumber, cosmosPattern, enemy) {
    let plan = mode === "intro" ? bossPlanBossSpecial(enemy, attackNumber, env2.deps.bossMoves.introCount(enemy)) : bossStyleSpecialPlan(env2, enemy, attackNumber, "area");
    let special = cosmosPattern || plan.special;
    let intro = mode === "intro" && special ? env2.deps.bossMoves.intro(enemy, Math.max(0, plan.shape) + 1) : null;
    if (mode === "slam" && !cosmosPattern && special) intro = plan;
    return { mode, ...bossSlamLook(env2, mode, special, intro, cosmosPattern), isSpecial: special, shapeIndex: cosmosPattern ? -1 : plan.shape, attackNumber };
  }
  function bossSlamLook(env2, mode, special, intro, cosmosPattern) {
    if (!special) return { label: env2.deps._t("무거운 일격"), damageMul: 1, telegraphKind: "ring" };
    return {
      label: intro ? intro.label : BOSS_PATTERN_NAMES[mode],
      damageMul: bossGetBossPatternPeakDamageMultiplier(cosmosPattern ? "cosmos" : mode),
      telegraphKind: intro ? intro.telegraphKind : "ring"
    };
  }
  function bossBuildRampPatternState(env2, enemy, attackNumber, cosmosPattern) {
    let stage = bossGetRampStage(enemy);
    let cosmosStage = cosmosPattern ? Math.max(1, stage) : stage;
    const plan = bossStyleSpecialPlan(env2, enemy, attackNumber, "area");
    return {
      mode: "ramp",
      label: cosmosStage > 0 ? env2.deps._t("격앙 {value}", { value: "ⅠⅡⅢ"[Math.min(2, cosmosStage - 1)] }) : "격앙 전조",
      damageMul: cosmosPattern ? 1.12 : 1 + stage * 0.07,
      isSpecial: cosmosPattern || plan.special,
      telegraphKind: cosmosPattern ? "pulse" : plan.telegraphKind || "pulse",
      shapeIndex: cosmosPattern ? -1 : plan.shape,
      stage,
      attackNumber
    };
  }
  function bossBuildPatternState(env2, mode, enemy, attackNumber, cosmosPattern) {
    if (mode === "burst") return bossBuildBurstPatternState(env2, enemy, attackNumber, cosmosPattern);
    if (mode === "slam" || mode === "intro") {
      return bossBuildSlamPatternState(env2, mode, attackNumber, cosmosPattern, enemy);
    }
    if (mode === "ramp") return bossBuildRampPatternState(env2, enemy, attackNumber, cosmosPattern);
    return null;
  }
  function bossBuildBurstPatternState(env2, enemy, attackNumber, cosmosPattern) {
    const plan = bossStyleSpecialPlan(env2, enemy, attackNumber, "ray"), special = cosmosPattern || plan.special;
    return {
      mode: "burst",
      label: special ? plan.label || "연속 참격" : "빠른 베기",
      damageMul: special ? cosmosPattern ? 1.18 : bossGetBossPatternPeakDamageMultiplier("burst") : 1,
      isSpecial: special,
      telegraphKind: cosmosPattern ? "fan" : plan.telegraphKind || "fan",
      shapeIndex: cosmosPattern ? -1 : plan.shape,
      attackNumber
    };
  }

  // modules/combat/core-values.mjs
  var BOSS_ATTACK_IMPACT_DELAY_MS = 500;

  // modules/combat/boss-pattern-lifecycle.mjs
  function bossGetOwnPatternState(env2, mode, enemy, attackNumber) {
    if (mode === "rootGrinder") return env2.deps.roomInvaders.patternState(attackNumber);
    if (mode === "cosmosBoss") {
      return typeof env2.deps.cosmosBossPattern === "function" ? env2.deps.cosmosBossPattern(enemy.cosmosBossId, attackNumber) : null;
    }
    return env2.deps.authoredAtlas ? env2.deps.authoredAtlas.patternState(enemy.apexMechanic, attackNumber) : null;
  }
  function bossAuthoredBossPattern(env2, enemy, attackNumber) {
    return env2.deps.bossMoves.observer.pattern(enemy, attackNumber) || env2.deps.bossMoves.shiftPattern(enemy, attackNumber);
  }
  function bossGetBossPatternPreview(env2, enemy) {
    if (env2.deps.woodsmanBattle.owns(enemy)) return env2.deps.woodsmanBattle.preview(enemy);
    if (!enemy || !enemy.isBoss || !enemy.patternMode) return null;
    let attackNumber = bossNormalizeAttackCount(enemy) + 1;
    return bossAuthoredBossPattern(env2, enemy, attackNumber) || bossModePatternState(env2, enemy, attackNumber);
  }
  function bossModePatternState(env2, enemy, attackNumber) {
    let mode = String(enemy.patternMode);
    if (OWN_PATTERN_MODES.has(mode)) return bossGetOwnPatternState(env2, mode, enemy, attackNumber);
    if (mode === "cosmos" || mode === "coreFrenzy") {
      let cycle = ["burst", "slam", "ramp"];
      let resolvedMode = cycle[(attackNumber - 1) % cycle.length];
      let state2 = bossBuildPatternState(env2, resolvedMode, enemy, attackNumber, true);
      if (!state2) return null;
      state2.patternMode = mode;
      state2.label = `${BOSS_PATTERN_NAMES[mode]}, ${state2.label}`;
      return state2;
    }
    let state = bossBuildPatternState(env2, mode, enemy, attackNumber, false);
    if (state) state.patternMode = mode;
    return state;
  }
  function bossConsumeBossPatternAttack(env2, enemy) {
    let state = bossGetBossPatternPreview(env2, enemy);
    if (!state) return null;
    if (enemy.patternArea) state.area = enemy.patternArea;
    bossNoteBossSpecial(enemy, state);
    env2.deps.enemyAttackRules.cerberusAttack(enemy, state);
    env2.deps.bossMoves.plan(state, enemy);
    const recovery = bossRecoveryOf(state);
    if (recovery) {
      const impactDelay = state.move ? state.move.stages.at(-1).ms : BOSS_ATTACK_IMPACT_DELAY_MS;
      enemy.apexRecoveryUntil = env2.deps.getCombatTime() + impactDelay + recovery;
    }
    state.castStartedAt = enemy.patternTelegraphStartedAt;
    enemy.patternAttackCount = bossNormalizeAttackCount(enemy) + 1;
    enemy.nextPatternState = bossGetBossPatternPreview(env2, enemy);
    enemy.patternTelegraphKey = null;
    enemy.patternTelegraphStartedAt = 0;
    enemy.patternArea = null;
    return state;
  }
  function bossRefreshBossPatternPreview(env2, enemy) {
    if (!enemy) return null;
    enemy.nextPatternState = bossGetBossPatternPreview(env2, enemy);
    return enemy.nextPatternState;
  }

  // modules/combat/boss-pattern-warning.mjs
  function bossClearBossTelegraph(env2, enemy) {
    env2.deps.bossMoves.cancelShift(enemy);
    enemy.patternTelegraphKey = null;
    enemy.patternTelegraphStartedAt = 0;
    enemy.patternArea = null;
  }
  function bossWarningMayStart(env2, state, charge, chargePerSec) {
    if (state.mode === "woodsman") return charge >= 1;
    if (bossKeepsOldClock(state) || !(chargePerSec > 0)) return charge >= 0.5;
    return (1 - charge) / chargePerSec * 1e3 <= bossWarningDuration(env2, state);
  }
  function bossReleaseAfterWarning(enemy, state, charge) {
    if (bossKeepsOldClock(state)) return charge >= 1;
    enemy.attackTimer = Math.max(charge, 1);
    return true;
  }
  function bossUpdateBossPatternTelegraph(env2, enemy, now, target, chargePerSec) {
    if (!enemy || !enemy.isBoss) return true;
    let state = enemy.nextPatternState || bossGetBossPatternPreview(env2, enemy);
    if (!state || !state.isSpecial) {
      bossClearBossTelegraph(env2, enemy);
      return true;
    }
    let charge = Math.max(0, Number(enemy.attackTimer) || 0);
    let key = bossPatternWarningKey(state);
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env2.deps.getCombatTime();
    if (env2.deps.bossMoves.needsWarning(enemy, state, key)) {
      if (!bossBeginWarning(env2, enemy, state, { target, key, timestamp, charge, chargePerSec })) return false;
    }
    return bossFinishBossWarning(env2, enemy, state, timestamp, charge);
  }
  function bossPatternWarningKey(state) {
    return `${state.patternMode || state.mode}:${state.attackNumber}`;
  }
  function bossBeginWarning(env2, enemy, state, warning) {
    const { target, key, timestamp, charge, chargePerSec } = warning;
    if (!bossWarningMayStart(env2, state, charge, chargePerSec)) {
      bossClearBossTelegraph(env2, enemy);
      return false;
    }
    enemy.patternTelegraphKey = key;
    enemy.patternTelegraphStartedAt = timestamp;
    if (!target) return true;
    if (state.mode === "woodsman") {
      enemy.patternArea = env2.deps.woodsmanBattle.warning(enemy, state, target, timestamp);
      return false;
    }
    enemy.patternArea = bossBossWarningArea(env2, enemy, state, target, timestamp);
    return true;
  }
  function bossBossWarningArea(env2, enemy, state, target, now) {
    const observer = env2.deps.bossMoves.observer.area(enemy, state, target);
    if (observer) return observer;
    const shift = env2.deps.bossMoves.prepareShift(enemy, state, target, now);
    if (shift) return shift;
    const profile = env2.deps.COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind], from = env2.deps.getClosestGridUnitCell(target, enemy);
    return { ...env2.deps.getSkillStageFootprint("", {}, { aimCell: target, gridProfile: profile }, from), source: from };
  }
  function bossFinishBossWarning(env2, enemy, state, now, charge) {
    if (!env2.deps.bossMoves.updateShift(enemy, now)) {
      bossClearBossTelegraph(env2, enemy);
      return false;
    }
    env2.deps.bossMoves.observer.followSeal(enemy, state, now);
    if (now - enemy.patternTelegraphStartedAt < bossWarningDuration(env2, state)) return false;
    return bossReleaseAfterWarning(enemy, state, charge);
  }
  function bossGetBossWarningCells(env2, state, pending = []) {
    const enemies = (state.enemies || []).filter((enemy) => enemy.hp > 0 && !enemy.noAttack && !(enemy.ailments || []).some((ail) => ["freeze", "stun", "silence"].includes(ail.type) && ail.time > 0));
    const areas = enemies.map((enemy) => enemy.patternArea).filter(Boolean).map((area) => area.woodsman ? { cells: env2.deps.woodsmanBattle.warningCells(area.woodsman, env2.deps.getCombatTime()) } : area);
    pending.forEach((attack) => {
      if (attack.delivery !== "patternArea") return;
      const move = attack.bossPattern.move;
      areas.push(move?.kind === "woodsman" ? { cells: env2.deps.woodsmanBattle.warningCells(move.cast, env2.deps.getCombatTime(), move.releasedAt) } : attack.bossPattern.area);
    });
    return areas.flatMap((area) => area.cells);
  }

  // modules/combat-patterns-classic.mjs
  var deps = {
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get bossMoves() {
      return bossMoves;
    },
    get _t() {
      return _t;
    },
    get roomInvaders() {
      return roomInvaders;
    },
    get cosmosBossPattern() {
      return globalThis.getCosmosBossPatternState;
    },
    get authoredAtlas() {
      return globalThis.atlasEndgame;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getClosestGridUnitCell() {
      return getClosestGridUnitCell;
    },
    get getSkillStageFootprint() {
      return getSkillStageFootprint;
    }
  };
  var env = { deps };
  var bossPatternBridge = {
    getBossWarningCells(state, pending) {
      return bossGetBossWarningCells(env, state, pending);
    },
    getBossPatternPreview(enemy) {
      return bossGetBossPatternPreview(env, enemy);
    },
    consumeBossPatternAttack(enemy) {
      return bossConsumeBossPatternAttack(env, enemy);
    },
    refreshBossPatternPreview(enemy) {
      return bossRefreshBossPatternPreview(env, enemy);
    },
    getBossPatternModeLabel(mode) {
      return bossGetBossPatternModeLabel(mode);
    },
    getBossPatternDescription(mode) {
      return bossGetBossPatternDescription(mode);
    },
    getBossPatternPeakDamageMultiplier(mode) {
      return bossGetBossPatternPeakDamageMultiplier(mode);
    },
    getMaximumBossPatternDamageMultiplier() {
      return bossGetMaximumBossPatternDamageMultiplier();
    },
    getBossPatternModesForLoop(loopValue) {
      return bossGetBossPatternModesForLoop(loopValue);
    },
    getMaximumBossPatternDamageMultiplierForLoop(loopValue) {
      return bossGetMaximumBossPatternDamageMultiplierForLoop(loopValue);
    },
    updateBossPatternTelegraph(enemy, now, target, chargePerSec) {
      return bossUpdateBossPatternTelegraph(env, enemy, now, target, chargePerSec);
    }
  };
  safeExposeGlobals(bossPatternBridge);
})();
