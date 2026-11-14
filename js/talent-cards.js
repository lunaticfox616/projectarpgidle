// GENERATED from modules/talent-cards*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/talent-card-levels.mjs
  var TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
  var TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;

  // modules/data/talent-card-settings.mjs
  var TALENT_BLOOM_DPS_BASE = 1e3;
  var TALENT_CARD_SLOT_UNLOCKS = [1, 2, 4, 6, 9, 12];
  var TALENT_CARD_SLOT_COUNT = TALENT_CARD_SLOT_UNLOCKS.length;

  // modules/ui/talent-card-labels.mjs
  var TALENT_STAT_LABELS = {
    pctDmg: "피해 증가",
    physPctDmg: "물리 피해",
    meleePctDmg: "근접 피해",
    projectilePctDmg: "투사체 피해",
    elementalPctDmg: "원소 피해",
    firePctDmg: "화염 피해",
    coldPctDmg: "냉기 피해",
    lightPctDmg: "번개 피해",
    chaosPctDmg: "카오스 피해",
    dotPctDmg: "지속 피해 배율",
    summonPctDmg: "소환수 피해",
    aoePctDmg: "범위 피해",
    slamPctDmg: "강타 피해",
    weaponFlatDmgPct: "무기 기본 피해",
    crit: "치명타 확률",
    critDmg: "치명타 피해",
    aspd: "공격 속도",
    ds: "연속 타격",
    move: "이동 속도",
    pctHp: "생명력 증가",
    armorPct: "방어도",
    evasionPct: "회피",
    energyShieldPct: "에너지 보호막",
    resPen: "저항 관통",
    leech: "생명력 흡수",
    dr: "받는 피해 감소",
    physIgnore: "물리 피해 감소 무시",
    regen: "생명력 재생",
    regenSuppress: "재생 억제",
    blockChance: "막기 확률",
    blockChancePct: "기본 막기 확률 증가",
    blockChanceMax: "막기 확률 최대치",
    deflectDamageReduce: "비껴내기 피해 감소",
    resAll: "모든 원소 저항",
    resChaos: "카오스 저항",
    igniteChance: "점화 확률",
    poisonChance: "중독 확률",
    bleedChance: "출혈 확률",
    shockChance: "감전 확률",
    freezeChance: "동결 확률",
    chillChance: "한기 확률",
    ailResIgnite: "점화 저항 확률",
    ailResShock: "감전 저항 확률",
    ailResFreeze: "동결 저항 확률",
    ailResPoison: "중독 저항 확률",
    ailResBleed: "출혈 저항 확률",
    summonAspd: "소환수 공격 속도",
    summonHpPct: "소환수 생명력",
    summonResPen: "소환수 저항 관통",
    summonCritDmg: "소환수 치명타 피해",
    summonCrit: "소환수 치명타 확률",
    summonEfficiency: "소환수 효율",
    addedFireDamagePct: "추가 화염 피해",
    addedColdDamagePct: "추가 냉기 피해",
    addedLightDamagePct: "추가 번개 피해"
  };
  var TALENT_UNIQ_LABELS = {
    projectilePatternMode: (deps, p) => deps._t("투사체 패턴: {value}", { value: typeof deps.PROJECTILE_PATTERN_MODE_DB !== "undefined" && deps.PROJECTILE_PATTERN_MODE_DB[p.mode] ? deps.PROJECTILE_PATTERN_MODE_DB[p.mode].label : p.mode }),
    cosmosPenetration: (deps, p) => deps._t("저항 관통 +{pen}%", { pen: p.pen }),
    poisonDamageMorePct: (deps, p) => deps._t("중독 피해 +{pct}%", { pct: p.pct }),
    igniteDamageMorePct: (deps, p) => deps._t("점화 피해 +{pct}%", { pct: p.pct }),
    hitShockedEnemyDamageMorePct: (deps, p) => deps._t("감전된 적에게 주는 피해 +{pct}%", { pct: p.pct }),
    alwaysShock: (deps) => deps._t("타격마다 감전 판정을 한 번 더 함"),
    stackingElementalResDownOnHit: (deps, p) => deps._t("원소 타격마다 그 적의 원소 저항 -{perHit}%(최대 -{max}%)", { perHit: p.perHit, max: p.max }),
    hitApplyChaosResDown: (deps, p) => deps._t("타격 시 적 카오스 저항 -{perHit}%(최대 {maxStacks}중첩)", { perHit: p.perHit, maxStacks: p.maxStacks }),
    realmAllResDownOnHit: (deps, p) => deps._t("타격 시 적 모든 저항 -{perHit}%(최대 {max}%, {duration}초)", { perHit: p.perHit, max: p.max, duration: p.duration }),
    minRollEqualsMaxRoll: (deps) => deps._t("항상 최대 피해로 적중"),
    maxRollBonusHit: (deps) => deps._t("피해 굴림이 130% 이상이면 그 피해의 50%로 한 번 더 침"),
    instantLeechAndDoubleDamage: (deps, p) => deps._t("흡혈의 {instantLeechPct}%를 바로 회복, {doubleDamageChance}% 확률로 피해 2배", { instantLeechPct: p.instantLeechPct, doubleDamageChance: p.doubleDamageChance }),
    projectileDoubleStrikePct: (deps, p) => deps._t("투사체 연속 타격 확률 +{pct}%", { pct: p.pct }),
    projectileExtraShotBonus: (deps, p) => deps._t("투사체 추가 발사 +{shots}", { shots: p.shots }),
    lifePctAsEnergyShield: (deps, p) => deps._t("최대 생명력의 {pct}%를 에너지 보호막으로", { pct: p.pct }),
    overhealCapPct: (deps, p) => deps._t("생명력과 에너지 보호막 초과 회복 +{pct}%", { pct: p.pct }),
    hpToPhysPct: (deps) => deps._t("최대 생명력이 물리 피해를 강화"),
    labyrinthShackles: (deps) => deps._t("이동 속도가 피해로 전환"),
    grandBreachCrown: (deps, p) => deps._t("에너지 보호막 +{esPct}%, 에너지 보호막의 {spellFromEsPct}%를 주문 피해로", { esPct: p.esPct, spellFromEsPct: p.spellFromEsPct }),
    guardianArmor: (deps, p) => deps._t("몬스터에게 받는 피해 -{takenLessPct}%(보스 -{bossTakenLessPct}%)", { takenLessPct: p.takenLessPct, bossTakenLessPct: p.bossTakenLessPct }),
    curseCrown: (deps, p) => deps._t("저주 한도 +{extraCurseCap}, 저주마다 피해 +{finalDmgPerCursePct}%", { extraCurseCap: p.extraCurseCap, finalDmgPerCursePct: p.finalDmgPerCursePct }),
    genericTakenDamageReducePct: (deps, p) => deps._t("받는 피해 -{pct}%", { pct: p.pct }),
    chaosTakenDamageReducePct: (deps, p) => deps._t("받는 카오스 피해 -{pct}%", { pct: p.pct }),
    uniqueTakenReduceWhen1Enemy: (deps, p) => deps._t("적이 하나일 때 받는 피해 -{pct}%", { pct: p.pct }),
    uniqueTakenReduceWhen2Enemies: (deps, p) => deps._t("적이 둘 이상일 때 받는 피해 -{pct}%", { pct: p.pct }),
    lifeRecoupTakenDamage: (deps, p) => deps._t("받은 피해의 {pct}%를 {duration}초간 생명력으로 회수", { pct: p.pct, duration: p.duration }),
    realmAllMaxRes: (deps, p) => deps._t("모든 최대 저항 +{maxRes}%", { maxRes: p.maxRes }),
    immuneBleed: (deps) => deps._t("출혈에 걸리지 않음"),
    immuneFreeze: (deps) => deps._t("빙결에 걸리지 않음"),
    immuneIgnite: (deps) => deps._t("점화에 걸리지 않음"),
    uniqueBlockChance: (deps, p) => deps._t("막기 확률 +{chance}%", { chance: p.chance }),
    blockedDamageTakenPct: (deps, p) => deps._t("막기 시 피해의 {pct}%를 받음", { pct: p.pct }),
    dragonVeinGuard: (deps, p) => deps._t("타격 시 {chance}% 확률로 {duration}초 동안 최대 생명력 {hpPct}%의 보호막", { chance: p.chance, duration: p.duration, hpPct: p.hpPct }),
    leechEfficiencyOnKill: (deps, p) => deps._t("처치 시 {duration}초간 흡혈 효율 +{efficiencyPct}%", { duration: p.duration, efficiencyPct: p.efficiencyPct }),
    cosmosSustain: (deps, p) => deps._t("생명력 재생 +{regen}%, 흡혈 +{leech}%", { regen: p.regen, leech: p.leech }),
    realmRegenRateAndRegen: (deps, p) => deps._t("재생 속도 +{regenRatePct}%, 생명력 재생 +{regen}%", { regenRatePct: p.regenRatePct, regen: p.regen }),
    corpseExplodeOnKill: (deps, p) => deps._t("처치 시 {chance}% 확률로 시체 폭발(생명력 {lifePct}%)", { chance: p.chance, lifePct: p.lifePct }),
    meteorFootsteps: (deps, p) => deps._t("치명타 시 {chance}% 확률로 모든 적에게 그 피해의 {damagePct}%", { chance: p.chance, damagePct: p.damagePct }),
    queenBeeSummonOnHit: (deps, p) => deps._t("타격 시 {chance}% 확률로 벌 소환(최대 {maxBees})", { chance: p.chance, maxBees: p.maxBees }),
    shockTracerGreaves: (deps, p) => deps._t("감전된 적을 맞히면 그 피해의 {strikeDamagePct}%로 한 번 더 침, 감전에 걸리지 않음", { strikeDamagePct: p.strikeDamagePct }),
    frostSentinelBoots: (deps) => deps._t("한기와 빙결에 걸리지 않음"),
    realmKillMoveStacks: (deps, p) => deps._t("처치 시 이동 속도 +{movePerStack}%(최대 {maxStacks}중첩)", { movePerStack: p.movePerStack, maxStacks: p.maxStacks }),
    overkillSplash: (deps) => deps._t("적을 처치하고 남은 피해가 다른 적 모두에게 튐"),
    summonDeathDamageBuff: (deps, p) => deps._t("소환수 사망 시 피해 +{pct}%({duration}초)", { pct: p.pct, duration: p.duration }),
    summonCritAspdStacks: (deps, p) => deps._t("소환수 치명타 시 공격 속도 +{aspd}%(최대 {maxStacks}중첩)", { aspd: p.aspd, maxStacks: p.maxStacks }),
    summonCapBonus: (deps, p) => deps._t("소환수 한도 +{cap}", { cap: p.cap }),
    summonEfficiencyBonus: (deps, p) => deps._t("소환수 효율 +{pct}%", { pct: p.pct }),
    projectileTargetBonus: (deps, p) => deps._t("투사체 대상 +{target}", { target: p.target }),
    dsAndTargetAnyBonus: (deps, p) => (p.ds ? deps._t("연속 타격 +{ds}%, ", { ds: p.ds }) : "") + deps._t("공격 대상 +{target}", { target: p.target }),
    esAmpAndRecoverOnCrit: (deps, p) => deps._t("에너지 보호막 +{ampPct}%, 치명타 시 에너지 보호막 {recoverPctOnCrit}% 회복", { ampPct: p.ampPct, recoverPctOnCrit: p.recoverPctOnCrit }),
    warcryResonanceBelt: (deps, p) => deps._t("활성 함성마다 피해 +{perWarcryAmpPct}%", { perWarcryAmpPct: p.perWarcryAmpPct }),
    // 2026-10-02 전직 18종의 새 카드
    uniqueMinDmgRoll: (deps, p) => deps._t("최소 피해 보정 +{pct}%", { pct: p.pct }),
    underdogNonMaxRollMorePct: (deps, p) => deps._t("최대가 아닌 피해 굴림의 피해 {pct}% 증폭", { pct: p.pct }),
    cosmosSpeedBurst: (deps, p) => deps._t("이동 속도 +{move}%, 공격 속도 +{aspd}%", { move: p.move, aspd: p.aspd }),
    uniqueDeflectDamageReduce: (deps, p) => deps._t("비껴내기 피해 감소 +{pct}%", { pct: p.pct }),
    instakillNormalOnHitPct: (deps, p) => deps._t("타격 시 {pct}% 확률로 일반 몬스터 즉시 처치", { pct: p.pct }),
    cosmosFinalDmg: (deps, p) => deps._t("피해 +{pct}%", { pct: p.pct }),
    realmPoisonDuration: (deps, p) => deps._t("중독 지속 시간 +{durationPct}%", { durationPct: p.durationPct })
  };
  function formatTalentUniqueLabel(key, params, deps) {
    const label = TALENT_UNIQ_LABELS[key];
    return label ? label(deps, params || {}) : key;
  }

  // modules/domain/talent-card-definitions.mjs
  function bloomGetTalentBloomClassOfAscendancy(env, ascendId) {
    return Object.keys(env.deps.ASCENDANCIES_BY_PLAYER_CLASS).find((classId) => env.deps.ASCENDANCIES_BY_PLAYER_CLASS[classId].includes(ascendId)) || null;
  }
  function bloomGetTalentBloomHeroIdForAscendancy(env, ascendId) {
    const classDef = env.deps.PLAYER_CLASS_DEFS[bloomGetTalentBloomClassOfAscendancy(env, ascendId)];
    return classDef && env.deps.HERO_SELECTION_DEFS[classDef.recommendedTalentHeroId] ? classDef.recommendedTalentHeroId : null;
  }
  function bloomGetTalentBloomCardKeyForAscendancy(env, ascendId) {
    const heroId = bloomGetTalentBloomHeroIdForAscendancy(env, ascendId);
    const key = heroId ? bloomMakeTalentComboKey(heroId, ascendId) : null;
    return key && env.deps.TALENT_BLOOM_CARD_DEFS[key] ? key : null;
  }
  function bloomGetTalentBloomCardKeys(env) {
    return Object.values(env.deps.ASCENDANCIES_BY_PLAYER_CLASS).flat().map((...args) => bloomGetTalentBloomCardKeyForAscendancy(env, ...args)).filter(Boolean);
  }
  function bloomGetTalentCardDef(env, heroId, classKey) {
    let key = bloomMakeTalentComboKey(heroId, classKey);
    if (typeof env.deps.TALENT_BLOOM_CARD_DEFS !== "undefined" && env.deps.TALENT_BLOOM_CARD_DEFS[key]) return env.deps.TALENT_BLOOM_CARD_DEFS[key];
    return null;
  }
  function bloomGetTalentCardRuntimeDefinition(env, comboKey) {
    let { heroId, classKey } = bloomParseTalentComboKey(comboKey);
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    return def && def.surface && def.surface.runtime ? def.surface.runtime : null;
  }
  function bloomParseTalentComboKey(comboKey) {
    let parts = String(comboKey || "").split("__");
    return { heroId: parts[0] || "hero1", classKey: parts[1] || "none" };
  }
  function bloomMakeTalentComboKey(heroId, classKey) {
    return `${heroId || "hero1"}__${classKey || "none"}`;
  }
  function bloomGetTalentPreciseRule(env, comboKey) {
    if (typeof env.deps.TALENT_PRECISE_CARD_RULES === "undefined") return null;
    return env.deps.TALENT_PRECISE_CARD_RULES[String(comboKey || "")] || null;
  }
  function bloomTalentHiddenList(def) {
    if (!def || !def.hidden) return [];
    if (Array.isArray(def.hidden)) return def.hidden;
    return [def.hidden];
  }
  function bloomTalentHiddenVal(h, lv) {
    let base = h.lv10 !== void 0 ? (Number(h.lv10) || 0) * lv / TALENT_CARD_MAX_LEVEL : (Number(h.perLevel) || 0) * lv;
    return Math.round(base * 100) / 100;
  }
  function bloomGetTalentCardStatBonuses(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    if (!def) return [];
    let out = [];
    bloomTalentHiddenList(def).forEach((h) => {
      if (h && h.stat) out.push({ stat: h.stat, val: bloomTalentHiddenVal(h, lv), kind: "hidden" });
    });
    let rule = bloomGetTalentPreciseRule(env, bloomMakeTalentComboKey(heroId, classKey));
    Object.entries(rule && rule.stats || {}).forEach(([stat, valueAtLevel10]) => {
      out.push({ stat, val: (Number(valueAtLevel10) || 0) * lv / TALENT_CARD_MAX_LEVEL, kind: "surface" });
    });
    return out;
  }
  function bloomGetTalentCardUniqEffects(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    let rule = bloomGetTalentPreciseRule(env, bloomMakeTalentComboKey(heroId, classKey));
    if (!def || !rule || !Array.isArray(rule.uniques)) return [];
    let cardName = def.name || `${heroId} ${classKey}`;
    return rule.uniques.map((u) => {
      if (!u || !u.key) return null;
      let params = Object.assign({}, u.params || {});
      if (u.perLevelParams) Object.keys(u.perLevelParams).forEach((p) => {
        params[p] = (u.perLevelParams[p] || 0) * lv;
      });
      let cardId = bloomMakeTalentComboKey(heroId, classKey);
      return {
        key: u.key,
        params,
        itemName: "개화 키스톤: " + cardName,
        sourceSlot: "talentKeystone",
        cardId,
        talentCardId: cardId
      };
    }).filter(Boolean);
  }

  // modules/ui/talent-card-text.mjs
  function bloomGetTalentStatLabel(env, stat) {
    if (TALENT_STAT_LABELS[stat]) return TALENT_STAT_LABELS[stat];
    if (typeof env.deps.P_STATS !== "undefined" && env.deps.P_STATS[stat] && env.deps.P_STATS[stat].name) return env.deps.P_STATS[stat].name;
    if (typeof env.deps.getStatName === "function") return env.deps.getStatName(stat);
    return stat;
  }
  function bloomGetTalentRuntimeAppliedText(env, runtime, level) {
    if (!runtime || !runtime.key) return "";
    let levelRatio = level / TALENT_CARD_MAX_LEVEL;
    if (runtime.key === "mistral") return mistralAppliedText(env, runtime, levelRatio);
    if (runtime.key === "stoneShield") return stoneShieldAppliedText(env, runtime, levelRatio);
    if (runtime.key === "moonReturn") return env.deps._t("단일 적에게 원 피해의 {damagePct}% 추가 타격", { damagePct: runtime.damagePct });
    if (runtime.key === "ailmentWhitelist") return "적에게 점화와 중독만 걸 수 있음";
    if (runtime.key === "instantWarcry") return runtime.latestEffectOnly ? "함성 시전 시간 0초, 마지막 함성 하나의 고유 효과만 유효, 활성 함성 수는 모두 셈" : "함성 시전 시간 0초";
    return "";
  }
  function mistralAppliedText(env, runtime, levelRatio) {
    const aspd = Math.round((Number(runtime.aspdPerStackAtLevel10) || 0) * levelRatio * 100) / 100;
    const move = Math.round((Number(runtime.movePerStackAtLevel10) || 0) * levelRatio * 100) / 100;
    return env.deps._t("중첩마다 공격 속도 +{aspd}%, 이동 속도 +{move}%(최대 {maxStacks}중첩)", { aspd, move, maxStacks: runtime.maxStacks });
  }
  function stoneShieldAppliedText(env, runtime, levelRatio) {
    const pct = Math.round((Number(runtime.maxHpPctAtLevel10) || 0) * levelRatio * 100) / 100;
    return env.deps._t("막기 시 최대 생명력의 {pct}% 돌 보호막", { pct });
  }
  function bloomGetTalentPreciseAppliedParts(env, comboKey, surface, level) {
    let applied = [];
    let rule = bloomGetTalentPreciseRule(env, comboKey);
    Object.entries(rule && rule.stats || {}).forEach(([stat, levelTenValue]) => {
      let value = Math.round((Number(levelTenValue) || 0) * level / TALENT_CARD_MAX_LEVEL * 100) / 100;
      applied.push({ text: `${bloomGetTalentStatLabel(env, stat)} ${value >= 0 ? "+" : ""}${value}%`, stat });
    });
    (rule && rule.uniques || []).forEach((unique) => {
      if (!unique || !unique.key) return;
      let params = Object.assign({}, unique.params || {});
      if (unique.perLevelParams) Object.keys(unique.perLevelParams).forEach((key) => {
        params[key] = (Number(unique.perLevelParams[key]) || 0) * level;
      });
      applied.push({ text: bloomGetTalentUniqLabel(env, unique.key, params), stat: null });
    });
    let runtimeText = bloomGetTalentRuntimeAppliedText(env, surface.runtime, level);
    if (runtimeText) applied.push({ text: runtimeText, stat: null });
    return applied;
  }
  function bloomGetTalentCardEffectParts(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    if (!def) return null;
    let applied = def.surface ? bloomGetTalentPreciseAppliedParts(env, bloomMakeTalentComboKey(heroId, classKey), def.surface, lv) : [];
    let hidden = bloomTalentHiddenList(def).filter((h) => h && h.stat).map((h) => ({ text: `${bloomGetTalentStatLabel(env, h.stat)} +${bloomTalentHiddenVal(h, lv)}%`, stat: h.stat }));
    return { level: lv, surface: def.surface && def.surface.desc || "", applied, hidden };
  }
  function bloomGetTalentUniqLabel(env, key, p) {
    return formatTalentUniqueLabel(key, p, env.deps);
  }
  function bloomGetTalentCardName(env, heroId, classKey) {
    let heroLabel = typeof env.deps.getHeroSelectionDef === "function" ? env.deps.getHeroSelectionDef(heroId).label : heroId;
    let classLabel = typeof env.deps.CLASS_TEMPLATES !== "undefined" && env.deps.CLASS_TEMPLATES[classKey] ? env.deps.CLASS_TEMPLATES[classKey].name : "미전직";
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    let bloomName = def && def.name ? def.name : `${heroLabel} ${classLabel}`;
    return { heroLabel, classLabel, bloomName };
  }

  // modules/ui/talent-card-presentation.mjs
  function createTalentCardPresentation(deps) {
    const env = { deps };
    return {
      getTalentCardEffectParts: (...args) => bloomGetTalentCardEffectParts(env, ...args),
      getTalentCardName: (...args) => bloomGetTalentCardName(env, ...args)
    };
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/domain/talent-card-progress.mjs
  function bloomGetTalentBloomScore(env, owner) {
    const { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm } = bloomGetTalentBloomScoreBreakdown(env, owner);
    return deepChaos + labyrinth + chaosFloor + underFloor + cosmos + dpsTerm;
  }
  function bloomGetTalentBloomScoreBreakdown(env, owner) {
    let deepChaos = Math.max(0, Math.floor(Number(owner.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(owner.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = typeof env.deps.ensureChaosRealmState === "function" ? Math.max(0, Math.floor(Number(env.deps.ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(owner.underworldProgress && owner.underworldProgress.highestFloor) || 0));
    const cosmos = cosmosProgressScore(owner);
    const dpsTerm = woodsmanProgressScore(owner);
    return { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm };
  }
  function cosmosProgressScore(owner) {
    return owner.cosmosAtlas && Array.isArray(owner.cosmosAtlas.cleared) ? owner.cosmosAtlas.cleared.length + (owner.cosmosAtlas.bossClears || []).length : 0;
  }
  function woodsmanProgressScore(owner) {
    const bestDps = Math.max(0, Number(owner.woodsmanEchoRun && owner.woodsmanEchoRun.bestDps || 0));
    const dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return Math.max(0, dpsTerm);
  }
  function bloomGetTalentCardLevel(score) {
    let s = Math.max(0, Math.floor(Number(score) || 0));
    let level = 1;
    for (let i = 0; i < TALENT_CARD_LEVEL_THRESHOLDS.length; i++) {
      if (s >= TALENT_CARD_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(TALENT_CARD_MAX_LEVEL, level);
  }
  function bloomRecordTalentBloomCard(env, owner, comboKey) {
    if (!owner.talentCards || typeof owner.talentCards !== "object") owner.talentCards = {};
    let score = bloomGetTalentBloomScore(env, owner);
    let card = owner.talentCards[comboKey] || { score: 0, level: 1, count: 0 };
    card.count = Math.max(0, Math.floor(card.count || 0)) + 1;
    if (score > (card.score || 0)) card.score = score;
    let prevLevel = Math.max(1, Math.floor(card.level || 1));
    card.level = bloomGetTalentCardLevel(card.score);
    owner.talentCards[comboKey] = card;
    return { card, leveledUp: card.level > prevLevel, score };
  }

  // modules/domain/talent-card-slots.mjs
  function bloomGetOwnedTalentCardCount(owner) {
    return owner.talentCards && typeof owner.talentCards === "object" ? Object.keys(owner.talentCards).length : 0;
  }
  function bloomEnsureTalentCardLoadout(owner) {
    if (!Array.isArray(owner.talentCardLoadout)) owner.talentCardLoadout = [];
    while (owner.talentCardLoadout.length < TALENT_CARD_SLOT_COUNT) owner.talentCardLoadout.push(null);
    if (owner.talentCardLoadout.length > TALENT_CARD_SLOT_COUNT) owner.talentCardLoadout.length = TALENT_CARD_SLOT_COUNT;
    let owned = owner.talentCards && typeof owner.talentCards === "object" ? owner.talentCards : {};
    for (let i = 0; i < owner.talentCardLoadout.length; i++) {
      if (owner.talentCardLoadout[i] && !owned[owner.talentCardLoadout[i]]) owner.talentCardLoadout[i] = null;
    }
    return owner.talentCardLoadout;
  }
  function bloomGetUnlockedTalentSlotCount(owner) {
    let owned = bloomGetOwnedTalentCardCount(owner);
    let count = 0;
    for (let i = 0; i < TALENT_CARD_SLOT_UNLOCKS.length; i++) if (owned >= TALENT_CARD_SLOT_UNLOCKS[i]) count++;
    return count;
  }
  function bloomGetTalentCardSlotIndex(owner, comboKey) {
    let loadout = bloomEnsureTalentCardLoadout(owner);
    return loadout.indexOf(comboKey);
  }

  // modules/domain/talent-card-mechanics.mjs
  function bloomIsTalentCardActive(env, owner, comboKey) {
    let owned = owner.talentCards && typeof owner.talentCards === "object" ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
      if (loadout[i] === comboKey && owned[comboKey]) return Math.max(1, Math.floor(owned[comboKey].level || 1));
    }
    return bloomGetGrantedBloomMechanics(env, owner).has(comboKey) ? TALENT_CARD_MAX_LEVEL : 0;
  }
  function bloomCollectGrantedBloomMechanics(env, owner) {
    const keys = /* @__PURE__ */ new Set();
    if (typeof env.deps.forEachActiveKeystoneDef === "function") env.deps.forEachActiveKeystoneDef(owner, (def) => {
      if (def.bloomMechanic) keys.add(def.bloomMechanic);
    });
    const rows = typeof env.deps.collectSocketedJewels === "function" && typeof env.deps.UNIQUE_JEWEL_DB !== "undefined" ? env.deps.collectSocketedJewels(owner.equipment) : [];
    rows.forEach((row) => {
      const unique = row.jewel && row.jewel.uniqueId ? env.deps.UNIQUE_JEWEL_DB.find((entry) => entry.id === row.jewel.uniqueId) : null;
      if (unique && unique.bloomMechanic) keys.add(unique.bloomMechanic);
    });
    return keys;
  }
  function bloomRefreshGrantedBloomMechanics(env, owner) {
    const keys = bloomCollectGrantedBloomMechanics(env, owner);
    env.talentGrantedMechanicsByOwner.set(owner, keys);
    return keys;
  }
  function bloomGetGrantedBloomMechanics(env, owner) {
    return owner && typeof owner === "object" ? env.talentGrantedMechanicsByOwner.get(owner) || bloomRefreshGrantedBloomMechanics(env, owner) : /* @__PURE__ */ new Set();
  }

  // modules/domain/talent-card-runtime.mjs
  function bloomGetTalentCardRuntimeState(owner) {
    if (!owner.talentCardRuntime || typeof owner.talentCardRuntime !== "object") owner.talentCardRuntime = {};
    return owner.talentCardRuntime;
  }
  function bloomGetTalentMistralStackCount(env, owner, now) {
    if (!bloomIsTalentCardActive(env, owner, "hero1__ranger")) return 0;
    let runtime = bloomGetTalentCardRuntimeState(owner);
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    if ((runtime.mistralExpiresAt || 0) > timestamp) {
      let config = bloomGetTalentCardRuntimeDefinition(env, "hero1__ranger");
      return Math.max(0, Math.min(config.maxStacks, Math.floor(Number(runtime.mistralStacks) || 0)));
    }
    delete runtime.mistralStacks;
    delete runtime.mistralExpiresAt;
    return 0;
  }
  function bloomRecordTalentMistralAttack(env, owner, now) {
    if (!bloomIsTalentCardActive(env, owner, "hero1__ranger")) return 0;
    let config = bloomGetTalentCardRuntimeDefinition(env, "hero1__ranger");
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    let runtime = bloomGetTalentCardRuntimeState(owner);
    runtime.mistralStacks = Math.min(config.maxStacks, bloomGetTalentMistralStackCount(env, owner, timestamp) + 1);
    runtime.mistralExpiresAt = timestamp + config.durationMs;
    return runtime.mistralStacks;
  }
  function bloomGrantTalentStoneShield(env, owner, maxHp, now) {
    let level = bloomIsTalentCardActive(env, owner, "hero2__guardian");
    if (level <= 0) return null;
    let config = bloomGetTalentCardRuntimeDefinition(env, "hero2__guardian");
    let capacity = Math.max(1, Math.floor(Math.max(0, Number(maxHp) || 0) * config.maxHpPctAtLevel10 * level / TALENT_CARD_MAX_LEVEL / 100));
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    let runtime = bloomGetTalentCardRuntimeState(owner);
    runtime.stoneShieldAmount = capacity;
    runtime.stoneShieldMax = capacity;
    runtime.stoneShieldExpiresAt = timestamp + config.durationMs;
    return { amount: capacity, expiresAt: runtime.stoneShieldExpiresAt };
  }
  function bloomGetTalentMoonReturnConfig(env, owner, targets) {
    if (!bloomIsTalentCardActive(env, owner, "hero4__hunter") || !Array.isArray(targets)) return null;
    let alive = (owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
    if (alive.length !== 1 || !targets.some((row) => row && row.enemy === alive[0])) return null;
    let config = bloomGetTalentCardRuntimeDefinition(env, "hero4__hunter");
    return { targetId: alive[0].id, damageMultiplier: Math.max(0, Number(config.damagePct) || 0) / 100 };
  }
  function bloomCanTalentCardApplyEnemyAilment(env, owner, type) {
    if (!bloomIsTalentCardActive(env, owner, "hero10__catalyst")) return true;
    let ailmentType = String(type || "").toLowerCase();
    let standardTypes = ["ignite", "poison", "bleed", "chill", "freeze", "shock", "scorch", "brittle", "sap", "flamedecay"];
    if (!standardTypes.includes(ailmentType)) return true;
    let config = bloomGetTalentCardRuntimeDefinition(env, "hero10__catalyst");
    return config.allowed.includes(ailmentType);
  }
  function bloomGetActiveTalentRuntimeConfig(env, owner, comboKey) {
    let level = bloomIsTalentCardActive(env, owner, comboKey);
    let config = level > 0 ? bloomGetTalentCardRuntimeDefinition(env, comboKey) : null;
    return config ? { config, level, levelRatio: level / TALENT_CARD_MAX_LEVEL } : null;
  }
  function bloomIsTalentInstantWarcryActive(env, owner) {
    return !!bloomGetActiveTalentRuntimeConfig(env, owner, "hero2__warrior");
  }
  function bloomClearTalentCardRuntimeState(owner) {
    delete owner.talentCardRuntime;
  }
  function bloomTalentOnPlayerAttack(env, owner) {
    if (!owner.talentRuntime || typeof owner.talentRuntime !== "object") owner.talentRuntime = {};
    let rt = owner.talentRuntime;
    bloomRecordTalentMistralAttack(env, owner);
    if (bloomIsTalentCardActive(env, owner, "hero1__gladiator")) {
      rt.fletcherCount = Math.floor(rt.fletcherCount || 0) % 3 + 1;
      rt.fletcherBoost = rt.fletcherCount >= 3 ? 1.33 : 1;
    } else {
      rt.fletcherBoost = 1;
    }
  }
  function bloomGetTalentAlwaysHit(env, owner) {
    return bloomIsTalentCardActive(env, owner, "hero3__gladiator") > 0;
  }
  function bloomGetTalentAttackDamageMul(env, owner) {
    let rt = owner.talentRuntime && typeof owner.talentRuntime === "object" ? owner.talentRuntime : {};
    let mul = 1;
    if (bloomIsTalentCardActive(env, owner, "hero1__gladiator") && rt.fletcherBoost) mul *= rt.fletcherBoost;
    return mul;
  }

  // modules/domain/talent-card-loadout.mjs
  function* bloomEquipTalentCard(env, owner, comboKey) {
    let owned = owner.talentCards && typeof owner.talentCards === "object" ? owner.talentCards : {};
    if (!owned[comboKey]) return;
    let loadout = bloomEnsureTalentCardLoadout(owner);
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    if (unlocked <= 0) {
      yield { kind: "talentLog", args: [env.deps._t("🔒 아직 장착 슬롯이 열리지 않았습니다."), "attack-monster"] };
      return;
    }
    let existing = loadout.indexOf(comboKey);
    if (existing >= 0) {
      loadout[existing] = null;
      yield* bloomAfterTalentLoadoutChange(owner);
      return;
    }
    let target = -1;
    for (let i = 0; i < unlocked; i++) {
      if (!loadout[i]) {
        target = i;
        break;
      }
    }
    if (target < 0) target = unlocked - 1;
    loadout[target] = comboKey;
    yield* bloomAfterTalentLoadoutChange(owner);
  }
  function* bloomAfterTalentLoadoutChange(owner) {
    bloomClearTalentCardRuntimeState(owner);
    yield { kind: "talentRefresh", args: [] };
    yield { kind: "talentSave", args: [200] };
  }

  // modules/domain/talent-card-stats.mjs
  function bloomGetActiveTalentCardStatBonuses(env, owner, tick) {
    let owned = owner.talentCards && typeof owner.talentCards === "object" ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
      let key = loadout[i];
      if (!key || !owned[key]) continue;
      let { heroId, classKey } = bloomParseTalentComboKey(key);
      let level = Math.max(1, Math.floor(owned[key].level || 1));
      bloomGetTalentCardStatBonuses(env, heroId, classKey, level).forEach((b) => out.push({ id: b.stat, val: b.val }));
    }
    bloomPushGrantedBloomMechanicStats(env, owner, out);
    appendMistralStats(env, owner, tick, out);
    return out;
  }
  function appendMistralStats(env, owner, tick, out) {
    let mistralLevel = bloomIsTalentCardActive(env, owner, "hero1__ranger");
    let mistralRuntime = bloomGetTalentCardRuntimeDefinition(env, "hero1__ranger");
    let mistralStacks = bloomReadTalentMistralStacks(env, owner, tick);
    if (mistralLevel > 0 && mistralRuntime && mistralStacks > 0) {
      let ratio = mistralLevel / TALENT_CARD_MAX_LEVEL;
      out.push({ id: "aspd", val: mistralStacks * mistralRuntime.aspdPerStackAtLevel10 * ratio });
      out.push({ id: "move", val: mistralStacks * mistralRuntime.movePerStackAtLevel10 * ratio });
    }
  }
  function bloomReadTalentMistralStacks(env, owner, tick) {
    return tick ? tick.get("mistralStacks") : bloomGetTalentMistralStackCount(env, owner);
  }
  function bloomPushGrantedBloomMechanicStats(env, owner, out) {
    bloomGetGrantedBloomMechanics(env, owner).forEach((key) => {
      const rule = bloomGetTalentPreciseRule(env, key);
      Object.entries(rule && rule.stats || {}).forEach(([stat, value]) => out.push({ id: stat, val: Number(value) || 0 }));
    });
  }
  function bloomGetActiveTalentStatMap(env, owner) {
    let map = {};
    bloomGetActiveTalentCardStatBonuses(env, owner).forEach((b) => {
      map[b.id] = (map[b.id] || 0) + b.val;
    });
    return map;
  }
  function bloomGetActiveTalentKeystoneUniqueEffects(env, owner) {
    let owned = owner.talentCards && typeof owner.talentCards === "object" ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
      let key = loadout[i];
      if (!key || !owned[key]) continue;
      let { heroId, classKey } = bloomParseTalentComboKey(key);
      out.push(...bloomGetTalentCardUniqEffects(env, heroId, classKey, owned[key].level));
    }
    bloomGetGrantedBloomMechanics(env, owner).forEach((key) => {
      let { heroId, classKey } = bloomParseTalentComboKey(key);
      out.push(...bloomGetTalentCardUniqEffects(env, heroId, classKey, TALENT_CARD_MAX_LEVEL));
    });
    return out;
  }

  // modules/domain/talent-cards.mjs
  function createTalentCards(deps) {
    const env = { deps };
    env.talentGrantedMechanicsByOwner = /* @__PURE__ */ new WeakMap();
    return Object.freeze({
      getTalentBloomHeroIdForAscendancy: (...args) => bloomGetTalentBloomHeroIdForAscendancy(env, ...args),
      getTalentBloomCardKeyForAscendancy: (...args) => bloomGetTalentBloomCardKeyForAscendancy(env, ...args),
      getTalentBloomCardKeys: (...args) => bloomGetTalentBloomCardKeys(env, ...args),
      parseTalentComboKey: bloomParseTalentComboKey,
      getTalentBloomScore: (...args) => bloomGetTalentBloomScore(env, ...args),
      getTalentBloomScoreBreakdown: (...args) => bloomGetTalentBloomScoreBreakdown(env, ...args),
      getTalentCardLevel: (...args) => bloomGetTalentCardLevel(...args),
      recordTalentBloomCard: (...args) => bloomRecordTalentBloomCard(env, ...args),
      ensureTalentCardLoadout: (...args) => bloomEnsureTalentCardLoadout(...args),
      getUnlockedTalentSlotCount: (...args) => bloomGetUnlockedTalentSlotCount(...args),
      getTalentCardSlotIndex: (...args) => bloomGetTalentCardSlotIndex(...args),
      equipTalentCard: (...args) => bloomEquipTalentCard(env, ...args),
      getActiveTalentCardStatBonuses: (...args) => bloomGetActiveTalentCardStatBonuses(env, ...args),
      getTalentMistralStackCount: (...args) => bloomGetTalentMistralStackCount(env, ...args),
      grantTalentStoneShield: (...args) => bloomGrantTalentStoneShield(env, ...args),
      getTalentMoonReturnConfig: (...args) => bloomGetTalentMoonReturnConfig(env, ...args),
      canTalentCardApplyEnemyAilment: (...args) => bloomCanTalentCardApplyEnemyAilment(env, ...args),
      isTalentInstantWarcryActive: (...args) => bloomIsTalentInstantWarcryActive(env, ...args),
      clearTalentCardRuntimeState: bloomClearTalentCardRuntimeState,
      isTalentCardActive: (...args) => bloomIsTalentCardActive(env, ...args),
      refreshGrantedBloomMechanics: (...args) => bloomRefreshGrantedBloomMechanics(env, ...args),
      getGrantedBloomMechanics: (...args) => bloomGetGrantedBloomMechanics(env, ...args),
      talentOnPlayerAttack: (...args) => bloomTalentOnPlayerAttack(env, ...args),
      getTalentAlwaysHit: (...args) => bloomGetTalentAlwaysHit(env, ...args),
      getTalentAttackDamageMul: (...args) => bloomGetTalentAttackDamageMul(env, ...args),
      getActiveTalentStatMap: (...args) => bloomGetActiveTalentStatMap(env, ...args),
      getActiveTalentKeystoneUniqueEffects: (...args) => bloomGetActiveTalentKeystoneUniqueEffects(env, ...args)
    });
  }

  // modules/talent-cards-classic.mjs
  var dependencies = {
    get ASCENDANCIES_BY_PLAYER_CLASS() {
      return ASCENDANCIES_BY_PLAYER_CLASS;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get TALENT_BLOOM_CARD_DEFS() {
      return typeof TALENT_BLOOM_CARD_DEFS === "undefined" ? void 0 : TALENT_BLOOM_CARD_DEFS;
    },
    get TALENT_PRECISE_CARD_RULES() {
      return typeof TALENT_PRECISE_CARD_RULES === "undefined" ? void 0 : TALENT_PRECISE_CARD_RULES;
    },
    get ensureChaosRealmState() {
      return typeof ensureChaosRealmState === "undefined" ? void 0 : ensureChaosRealmState;
    },
    get _t() {
      return _t;
    },
    get PROJECTILE_PATTERN_MODE_DB() {
      return typeof PROJECTILE_PATTERN_MODE_DB === "undefined" ? void 0 : PROJECTILE_PATTERN_MODE_DB;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get forEachActiveKeystoneDef() {
      return typeof forEachActiveKeystoneDef === "undefined" ? void 0 : forEachActiveKeystoneDef;
    },
    get collectSocketedJewels() {
      return typeof collectSocketedJewels === "undefined" ? void 0 : collectSocketedJewels;
    },
    get UNIQUE_JEWEL_DB() {
      return typeof UNIQUE_JEWEL_DB === "undefined" ? void 0 : UNIQUE_JEWEL_DB;
    },
    get P_STATS() {
      return typeof P_STATS === "undefined" ? void 0 : P_STATS;
    },
    get getStatName() {
      return typeof getStatName === "undefined" ? void 0 : getStatName;
    },
    get getHeroSelectionDef() {
      return typeof getHeroSelectionDef === "undefined" ? void 0 : getHeroSelectionDef;
    },
    get CLASS_TEMPLATES() {
      return typeof CLASS_TEMPLATES === "undefined" ? void 0 : CLASS_TEMPLATES;
    }
  };
  var rules = createTalentCards(dependencies);
  var presentation = createTalentCardPresentation(dependencies);
  var effects = {
    // Resolve optional browser consumers only when their command is reached.
    // The native iterator owns ordering; it never imports or calls UI/save functions.
    get talentLog() {
      return typeof addLog === "function" ? addLog.bind(void 0) : () => void 0;
    },
    get talentRefresh() {
      return typeof updateStaticUI === "function" ? updateStaticUI.bind(void 0) : () => void 0;
    },
    get talentSave() {
      return typeof queueImportantSave === "function" ? queueImportantSave.bind(void 0) : () => void 0;
    }
  };
  var getTalentBloomHeroIdForAscendancy = rules.getTalentBloomHeroIdForAscendancy;
  var getTalentBloomCardKeyForAscendancy = rules.getTalentBloomCardKeyForAscendancy;
  var getTalentBloomCardKeys = rules.getTalentBloomCardKeys;
  var parseTalentComboKey = rules.parseTalentComboKey;
  var getTalentBloomScore = (...args) => rules.getTalentBloomScore(game, ...args);
  var getTalentBloomScoreBreakdown = (...args) => rules.getTalentBloomScoreBreakdown(game, ...args);
  var getTalentCardLevel = rules.getTalentCardLevel;
  var recordTalentBloomCard = (...args) => rules.recordTalentBloomCard(game, ...args);
  var getTalentCardEffectParts = presentation.getTalentCardEffectParts;
  var getTalentCardName = presentation.getTalentCardName;
  var ensureTalentCardLoadout = (...args) => rules.ensureTalentCardLoadout(game, ...args);
  var getUnlockedTalentSlotCount = (...args) => rules.getUnlockedTalentSlotCount(game, ...args);
  var getTalentCardSlotIndex = (...args) => rules.getTalentCardSlotIndex(game, ...args);
  var equipTalentCard = (...args) => consumeDomainCommands(rules.equipTalentCard(game, ...args), effects);
  var getActiveTalentCardStatBonuses = (...args) => rules.getActiveTalentCardStatBonuses(game, ...args);
  var getTalentMistralStackCount = (...args) => rules.getTalentMistralStackCount(game, ...args);
  var grantTalentStoneShield = (...args) => rules.grantTalentStoneShield(game, ...args);
  var getTalentMoonReturnConfig = (...args) => rules.getTalentMoonReturnConfig(game, ...args);
  var canTalentCardApplyEnemyAilment = (...args) => rules.canTalentCardApplyEnemyAilment(game, ...args);
  var isTalentInstantWarcryActive = (...args) => rules.isTalentInstantWarcryActive(game, ...args);
  var clearTalentCardRuntimeState = (...args) => rules.clearTalentCardRuntimeState(game, ...args);
  var isTalentCardActive = (comboKey, owner = game) => rules.isTalentCardActive(owner, comboKey);
  var refreshGrantedBloomMechanics = (owner = game) => rules.refreshGrantedBloomMechanics(owner);
  var getGrantedBloomMechanics = (owner = game) => rules.getGrantedBloomMechanics(owner);
  var talentOnPlayerAttack = (...args) => rules.talentOnPlayerAttack(game, ...args);
  var getTalentAlwaysHit = (...args) => rules.getTalentAlwaysHit(game, ...args);
  var getTalentAttackDamageMul = (...args) => rules.getTalentAttackDamageMul(game, ...args);
  var getActiveTalentStatMap = (...args) => rules.getActiveTalentStatMap(game, ...args);
  var getActiveTalentKeystoneUniqueEffects = (...args) => rules.getActiveTalentKeystoneUniqueEffects(game, ...args);
  var TALENT_BLOOM_TOTAL_CARDS = typeof ASCENDANCIES_BY_PLAYER_CLASS === "object" && typeof PLAYER_CLASS_DEFS === "object" ? getTalentBloomCardKeys().length : Object.keys(TALENT_BLOOM_CARD_DEFS).length;
  safeExposeGlobals({ getTalentBloomHeroIdForAscendancy, getTalentBloomCardKeyForAscendancy, getTalentBloomCardKeys, parseTalentComboKey, getTalentBloomScore, getTalentBloomScoreBreakdown, getTalentCardLevel, recordTalentBloomCard, getTalentCardEffectParts, getTalentCardName, ensureTalentCardLoadout, getUnlockedTalentSlotCount, getTalentCardSlotIndex, equipTalentCard, getActiveTalentCardStatBonuses, getTalentMistralStackCount, grantTalentStoneShield, getTalentMoonReturnConfig, canTalentCardApplyEnemyAilment, isTalentInstantWarcryActive, clearTalentCardRuntimeState, isTalentCardActive, refreshGrantedBloomMechanics, getGrantedBloomMechanics, talentOnPlayerAttack, getTalentAlwaysHit, getTalentAttackDamageMul, getActiveTalentStatMap, getActiveTalentKeystoneUniqueEffects, TALENT_CARD_LEVEL_THRESHOLDS, TALENT_CARD_MAX_LEVEL, TALENT_BLOOM_DPS_BASE, TALENT_CARD_SLOT_UNLOCKS, TALENT_CARD_SLOT_COUNT, TALENT_BLOOM_TOTAL_CARDS });
})();
