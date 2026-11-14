// GENERATED from modules/cosmos-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/cosmos-directives.mjs
  function cosmosRulePickWeightedCosmosDirective(candidates, rng) {
    const total = candidates.reduce((sum, row) => sum + Math.max(0, Number(row.weight) || 0), 0);
    if (total <= 0) return null;
    let roll = rng() * total;
    for (const row of candidates) {
      roll -= Math.max(0, Number(row.weight) || 0);
      if (roll <= 0) return row;
    }
    return candidates[candidates.length - 1] || null;
  }
  function cosmosRuleGetCosmosExpeditionDirectiveChoices(env, nodeId, cycle) {
    const rows = Array.isArray(env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB) ? env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB.filter(Boolean) : [];
    const safe = rows.find((row) => row.id === "survey");
    if (!safe) return [];
    const choices = [safe];
    const candidates = rows.filter((row) => row.id !== safe.id && Number(row.weight) > 0);
    const rng = env.deps.createSeededRng(`cosmos-expedition:${String(nodeId || "unknown")}:${Math.max(0, Math.floor(Number(cycle) || 0))}`);
    while (choices.length < 3 && candidates.length > 0) {
      const picked = cosmosRulePickWeightedCosmosDirective(candidates, rng);
      if (!picked) break;
      choices.push(picked);
      candidates.splice(candidates.indexOf(picked), 1);
    }
    return choices;
  }
  function cosmosRuleResolveCosmosMechanic(env, tag, seed) {
    const rows = Array.isArray(env.deps.COSMOS_MECHANIC_DB) ? env.deps.COSMOS_MECHANIC_DB : [];
    if (rows.length === 0) return null;
    const normalizedTag = String(tag || "").trim();
    const tagged = rows.find((row) => Array.isArray(row.tags) && row.tags.includes(normalizedTag));
    if (tagged) return tagged;
    const index = Math.abs(Math.floor(Number(seed) || 0)) % rows.length;
    return rows[index];
  }

  // modules/data/cosmos-boss-mechanics.mjs
  var COSMOS_GALAXY_BOSS_MECHANICS = Object.freeze({
    "planet-46": Object.freeze({
      id: "orbitalCollision",
      name: "궤도 충돌",
      specialEvery: 4,
      damageMul: 1.42,
      damageScale: 0.32,
      elementRule: "physical",
      telegraphKind: "lane",
      summary: "네 번째 공격마다 방어도로 줄일 수 있는 강한 물리 충돌을 일으킵니다.",
      counter: "방어도/막기 또는 물리 피해 전환을 준비하세요."
    }),
    "planet-47": Object.freeze({
      id: "abyssalTide",
      name: "심해의 역류",
      specialEvery: 4,
      damageMul: 1.18,
      elementRule: "chaos",
      telegraphKind: "wave",
      shieldRestorePct: 8,
      hpScale: 0.62,
      damageScale: 0.3,
      summary: "네 번째 공격마다 카오스 역류와 함께 잃은 성간 보호막을 회복합니다.",
      counter: "카오스 EHP와 지속 화력으로 보호막 회복을 다시 돌파하세요."
    }),
    "planet-48": Object.freeze({
      id: "twinBalance",
      name: "쌍성의 균형",
      specialEvery: 2,
      damageMul: 1.3,
      elementRule: "alternatingWeakest",
      telegraphKind: "split",
      hpScale: 1.1,
      damageScale: 0.32,
      summary: "물리 타격과 가장 취약한 속성 타격을 번갈아 사용합니다.",
      counter: "한 방어만 높이기보다 물리/속성 EHP의 최저점을 보완하세요."
    }),
    "planet-49": Object.freeze({
      id: "finalJudgment",
      name: "최저항 심판",
      specialEvery: 3,
      damageMul: 1.45,
      damageScale: 0.27,
      elementRule: "weakestResistance",
      telegraphKind: "beam",
      debuffType: "cosmos_res_down",
      hpScale: 1.15,
      summary: "세 번째 공격마다 가장 낮은 저항을 읽어 해당 속성으로 심판합니다.",
      counter: "최저 저항을 보완하고 저항 감소에 버틸 초과 저항을 확보하세요."
    }),
    "planet-45": Object.freeze({
      id: "cometCharge",
      name: "혜성 돌진",
      specialEvery: 4,
      damageMul: 1.7,
      damageScale: 0.31,
      elementRule: "physical",
      telegraphKind: "charge",
      moveCounterPct: 35,
      hpScale: 1.2,
      summary: "네 번째 공격마다 강한 돌진을 사용하며 이동 속도로 충격을 흘릴 수 있습니다.",
      counter: "이동 속도 170%에서 돌진의 추가 피해를 최대 35%까지 줄입니다."
    })
  });

  // modules/domain/cosmos-boss-patterns.mjs
  function cosmosRuleGetCosmosGalaxyBossMechanic(env, nodeId) {
    return COSMOS_GALAXY_BOSS_MECHANICS[String(nodeId || "")] || null;
  }
  function cosmosRuleGetCosmosBossPatternState(env, nodeId, attackNumber) {
    const mechanic = cosmosRuleGetCosmosGalaxyBossMechanic(env, nodeId);
    if (!mechanic) return null;
    const count = Math.max(1, Math.floor(Number(attackNumber) || 1));
    const special = count % mechanic.specialEvery === 0;
    return {
      mode: mechanic.id,
      patternMode: "cosmosBoss",
      label: special ? mechanic.name : env.deps._t("{name} 전조", { name: mechanic.name }),
      damageMul: special ? mechanic.damageMul : 1,
      isSpecial: special,
      telegraphKind: mechanic.telegraphKind,
      elementRule: mechanic.elementRule,
      ...cosmosSpecialModifiers(mechanic, special),
      attackNumber: count
    };
  }
  function cosmosSpecialModifiers(mechanic, special) {
    return {
      shieldRestorePct: special ? Number(mechanic.shieldRestorePct || 0) : 0,
      debuffType: special ? mechanic.debuffType || null : null,
      moveCounterPct: special ? Number(mechanic.moveCounterPct || 0) : 0
    };
  }

  // modules/domain/cosmos-difficulty.mjs
  function cosmosRuleCalculateCosmosDifficultyTarget(env, input) {
    const { combatTier, sizeClass, gravity } = cosmosDifficultyDimensions(input);
    const tierProgress = Math.max(0, Math.min(1, (combatTier - 1) / 18));
    const seasonDepth = 24.5;
    const baseHp = (56 + combatTier * 30) * 1.15 * (1 + seasonDepth * (env.deps.MONSTER_LOOP_GROWTH.fixed.hp.base + tierProgress * env.deps.MONSTER_LOOP_GROWTH.fixed.hp.tier)) * (1 + tierProgress * 9) * 3.22;
    const cosmosHpPressure = (1 + (sizeClass - 1) * 0.1 + (gravity - 1) * 0.13) * 1.35;
    const { directiveHpMul, directiveDamageMul, directiveSpeedMul } = cosmosDifficultyDirective(input);
    const bossHp = baseHp * (1.8 + combatTier * 0.6) * (1 + tierProgress * 4) * 0.92 * cosmosHpPressure * directiveHpMul * (input && input.isGalaxyBoss ? 1.35 : 1);
    const tierPressure = Math.max(0, Math.min(1, (combatTier - 1) / 10));
    const baseHit = (2.4 + combatTier * 3.35) * 1.15 * (1 + seasonDepth * (env.deps.MONSTER_LOOP_GROWTH.fixed.damage.base + tierPressure * env.deps.MONSTER_LOOP_GROWTH.fixed.damage.tier)) * (1.14 + combatTier * 0.16) * 1.34;
    const cosmosDamagePressure = (1 + (sizeClass - 1) * 0.025 + (gravity - 1) * 0.055) * 1.1;
    const peakBossHitPressure = env.deps.getMaximumBossPatternDamageMultiplier() * env.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    const clearTimeSec = input && input.isGalaxyBoss ? 55 : 40;
    return {
      dps: Math.max(1, Math.round(bossHp / clearTimeSec)),
      ehp: Math.max(1, Math.round(baseHit * cosmosDamagePressure * peakBossHitPressure * directiveDamageMul * Math.max(1, Math.sqrt(directiveSpeedMul)))),
      element: String(input && input.element || "chaos"),
      clearTimeSec,
      basis: "bossPeakHit"
    };
  }
  function cosmosRuleEvaluateCosmosReadiness(env, target, player) {
    const dpsRatio = cosmosReadinessRatio(player, target, "dps");
    const ehpRatio = cosmosReadinessRatio(player, target, "ehp");
    const minRatio = Math.min(dpsRatio, ehpRatio);
    if (minRatio >= 1.2) return { id: "comfortable", label: env.deps._t("안정"), dpsRatio, ehpRatio, minRatio };
    if (minRatio >= 0.9) return { id: "ready", label: env.deps._t("적정"), dpsRatio, ehpRatio, minRatio };
    if (minRatio >= 0.65) return { id: "risky", label: env.deps._t("위험"), dpsRatio, ehpRatio, minRatio };
    return { id: "blocked", label: env.deps._t("성장 필요"), dpsRatio, ehpRatio, minRatio };
  }
  function cosmosDifficultyDimensions(input) {
    const combatTier = Math.max(1, Math.floor(Number(input && input.combatTier) || 1));
    const sizeClass = Math.max(1, Math.min(5, Math.floor(Number(input && input.sizeClass) || 1)));
    const gravity = Math.max(1, Number(input && input.gravity) || 1);
    return { combatTier, sizeClass, gravity };
  }
  function cosmosDifficultyDirective(input) {
    const directive = input && input.directive && typeof input.directive === "object" ? input.directive : {};
    const directiveHpMul = Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    const directiveDamageMul = Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    const directiveSpeedMul = Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    return { directiveHpMul, directiveDamageMul, directiveSpeedMul };
  }
  function cosmosReadinessRatio(player, target, key) {
    return Math.max(0, Number(player && player[key]) || 0) / Math.max(1, Number(target && target[key]) || 1);
  }

  // modules/domain/cosmos-rules.mjs
  function createCosmosRules(deps) {
    const env = { deps };
    return Object.freeze({ getCosmosExpeditionDirectiveChoices: (...args) => cosmosRuleGetCosmosExpeditionDirectiveChoices(env, ...args), resolveCosmosMechanic: (...args) => cosmosRuleResolveCosmosMechanic(env, ...args), getCosmosGalaxyBossMechanic: (...args) => cosmosRuleGetCosmosGalaxyBossMechanic(env, ...args), getCosmosBossPatternState: (...args) => cosmosRuleGetCosmosBossPatternState(env, ...args), calculateCosmosDifficultyTarget: (...args) => cosmosRuleCalculateCosmosDifficultyTarget(env, ...args), evaluateCosmosReadiness: (...args) => cosmosRuleEvaluateCosmosReadiness(env, ...args) });
  }

  // modules/cosmos-rules-classic.mjs
  var rules = createCosmosRules({
    get COSMOS_EXPEDITION_DIRECTIVE_DB() {
      return globalThis.COSMOS_EXPEDITION_DIRECTIVE_DB;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get COSMOS_MECHANIC_DB() {
      return globalThis.COSMOS_MECHANIC_DB;
    },
    get _t() {
      return _t;
    },
    get MONSTER_LOOP_GROWTH() {
      return MONSTER_LOOP_GROWTH;
    },
    get getMaximumBossPatternDamageMultiplier() {
      return getMaximumBossPatternDamageMultiplier;
    },
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() {
      return ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    }
  });
  var getCosmosExpeditionDirectiveChoices = rules.getCosmosExpeditionDirectiveChoices;
  var resolveCosmosMechanic = rules.resolveCosmosMechanic;
  var getCosmosGalaxyBossMechanic = rules.getCosmosGalaxyBossMechanic;
  var getCosmosBossPatternState = rules.getCosmosBossPatternState;
  var calculateCosmosDifficultyTarget = rules.calculateCosmosDifficultyTarget;
  var evaluateCosmosReadiness = rules.evaluateCosmosReadiness;
  safeExposeGlobals({ getCosmosExpeditionDirectiveChoices, resolveCosmosMechanic, getCosmosGalaxyBossMechanic, getCosmosBossPatternState, calculateCosmosDifficultyTarget, evaluateCosmosReadiness });
})();
