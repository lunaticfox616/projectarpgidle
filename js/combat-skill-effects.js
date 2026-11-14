// GENERATED from modules/combat-skill-effects*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/skill-effect-values.mjs
  function effectGetSkillRepeatDamageMultiplier(env2, skill, hitIndex, nativeRepeats) {
    if (hitIndex <= 0) return 1;
    if (hitIndex < nativeRepeats) {
      let repeatPct = Number(skill && skill.repeatHitDamagePct);
      return Number.isFinite(repeatPct) ? Math.max(0, repeatPct) / 100 : 1;
    }
    return Math.max(0, Number(skill && skill.extraProjectileDamagePct) || env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
  }
  function effectReadRepelMeleeParams(ep) {
    return { cells: Math.max(1, Math.floor(Number(ep.cells) || 1)), cooldownMs: Math.max(0, Number(ep.cooldownSec ?? 1.5)) * 1e3 };
  }
  function effectReadPursuitMovePct(ep) {
    return Math.max(0, Number(ep.pct) || 40);
  }
  function effectGetTrialHazardProfile(zone) {
    let source = zone && zone.trialHazard ? zone.trialHazard : {};
    return {
      pattern: ["line", "pool", "cross", "block"].includes(source.pattern) ? source.pattern : "line",
      reach: Math.max(1, Math.floor(Number(source.reach) || 1)),
      warningMs: Math.max(800, Math.min(3e3, Number(source.warningMs) || 1700)),
      intervalMs: Math.max(2400, Math.min(12e3, Number(source.intervalMs) || 6e3)),
      initialDelayMs: Math.max(1e3, Math.min(6e3, Number(source.initialDelayMs) || 2200)),
      persistent: source.persistent === true
    };
  }
  function effectGetFlameDecayIgniteTakenMultiplier(pStats) {
    let skill = pStats && pStats.sSkill;
    let per100 = Math.max(0, Number(skill && skill.igniteTakenHpScalePer100) || 0);
    if (per100 <= 0) return 1;
    let uncapped = 1 + Math.max(0, Number(pStats && pStats.maxHp) || 0) / 100 * per100;
    let cap = Math.max(1, Number(skill && skill.igniteTakenMaxMultiplier) || Infinity);
    return Math.min(uncapped, cap);
  }
  function effectGetPassiveAilmentDurationMultiplier(type, pStats) {
    const table = pStats && pStats.ailmentDurationPct;
    return 1 + (table && table[type] || 0) / 100;
  }

  // modules/combat/trial-hazard-state.mjs
  function hitPrimeTrialHazardTimer(env2, zone) {
    if (!zone || !zone.bloomTrial) env2.owner.bloomTrialRegenSuppress = 0;
    if (!zone || zone.type !== "trial" && !zone.trialHazard) {
      env2.runtime.trialHazardRuntime = { nextAt: 0, active: null };
      env2.owner.trialHazardIndex = 0;
      return;
    }
    env2.owner.trialHazardIndex = 0;
    env2.runtime.trialHazardRuntime = {
      nextAt: env2.deps.getCombatTime() + effectGetTrialHazardProfile(zone).initialDelayMs,
      active: null
    };
  }

  // modules/combat/talent-bloom-rewards.mjs
  function hitResolveTalentBloomHeroId(env2) {
    const heroId = typeof env2.deps.getTalentBloomHeroIdForAscendancy === "function" ? env2.deps.getTalentBloomHeroIdForAscendancy(env2.owner.ascendClass) : null;
    if (heroId) return heroId;
    if (env2.deps.HERO_SELECTION_DEFS[env2.owner.pendingTalentBloomHeroId]) return env2.owner.pendingTalentBloomHeroId;
    return env2.deps.HERO_SELECTION_DEFS[env2.owner.selectedHeroId] ? env2.owner.selectedHeroId : "hero1";
  }
  function* hitUnlockLoopBloomSpecialization(env2, heroId, classKey, classLabel, firstEverBloomOfClass) {
    if (!classKey || classKey === "none" || env2.owner.bloomLoopSpecGranted === classKey) return false;
    env2.owner.bloomLoopSpecGranted = classKey;
    env2.owner.bloomedClassThisLoop = classKey;
    env2.owner.bloomedTalentThisLoop = heroId;
    env2.owner.ascendPoints = Math.max(0, Math.floor(env2.owner.ascendPoints || 0)) + 2;
    env2.owner.ascendKeystonePoints = Math.max(0, Math.floor(env2.owner.ascendKeystonePoints || 0)) + 1;
    env2.owner.ascendRank = Math.max(env2.owner.ascendRank || 0, 5);
    if (firstEverBloomOfClass && typeof env2.deps.queueTutorialNotice === "function") {
      yield { kind: "queueTutorialNotice", args: ["unlock_fifth_node", env2.deps._t("5차 특화 노드"), env2.deps._t("이번 루프에 처음 피운 개화 조합으로 5차 특화 노드가 열렸습니다.\n‘스킬트리 → 전직’에서 재능과 전직 특화 노드를 확인하세요."), "tab-traits"] };
    }
    yield { kind: "addLog", args: [env2.deps._t("[{classLabel}] 5차 특화 개방: 전직 포인트 +2, 키스톤 포인트 +1", { classLabel }), "loot-unique"] };
    return true;
  }
  function* hitAwardTalentBloomCard(env2, comboKey, heroLabel, classLabel) {
    if (typeof env2.deps.recordTalentBloomCard !== "function") return;
    let result = env2.deps.recordTalentBloomCard(comboKey);
    if (!env2.owner.unlocks) env2.owner.unlocks = {};
    let firstUnlock = !env2.owner.unlocks.talent;
    env2.owner.unlocks.talent = true;
    env2.owner.noti.talent = true;
    if (firstUnlock && typeof env2.deps.queueTutorialNotice === "function") {
      yield { kind: "queueContentNotice", args: ["unlock_talent_tab", "재능 개화", "talent", {
        open: "재능 개화 카드를 얻었습니다.\n‘재능’에서 가진 카드와 효과를 확인하세요.",
        locked: "재능 개화 카드를 얻었습니다.\n‘해금’에서 재능을 열면 카드와 효과를 관리할 수 있습니다."
      }, "tab-talent"] };
    }
    yield { kind: "addLog", args: [env2.deps._t("개화 카드 [{hero} × {cls}] Lv.{level} (점수 {score}){up}", { hero: heroLabel, cls: classLabel, level: result.card.level, score: result.score, up: result.leveledUp ? `, ${env2.deps._t("레벨 상승")}` : "" }), "loot-unique"] };
    yield { kind: "dispatchRuntimeEvent", args: ["talent-tab-refresh-requested"] };
  }
  function* hitHandleTalentBloomClear(env2) {
    consumeBloomKeys(env2.owner);
    let heroId = hitResolveTalentBloomHeroId(env2), classKey = env2.owner.ascendClass || "none";
    let comboKey = `${heroId}__${classKey}`;
    let isNewCombo = recordBloomCombo(env2.owner, comboKey);
    let heroLabel = env2.deps.HERO_SELECTION_DEFS[heroId]?.label || heroId;
    let classLabel = env2.deps.CLASS_TEMPLATES[classKey]?.name || "미전직";
    yield { kind: "addLog", args: [env2.deps._t("재능 개화 성공: [{hero} × {cls}]{fresh}", { hero: heroLabel, cls: classLabel, fresh: isNewCombo ? `, ${env2.deps._t("신규 조합")}` : "" }), "loot-unique"] };
    let firstEverBloomOfClass = recordBloomClass(env2.owner, classKey);
    yield* hitUnlockLoopBloomSpecialization(env2, heroId, classKey, classLabel, firstEverBloomOfClass);
    yield* hitAwardTalentBloomCard(env2, comboKey, heroLabel, classLabel);
    env2.owner.currentZoneId = env2.deps.getAutoProgressZoneId(env2.owner.maxZoneId);
    env2.owner.killsInZone = 0;
    env2.owner.inTicketBossFight = false;
    env2.deps.startMoving(false);
    yield { kind: "updateStaticUI", args: [] };
    yield { kind: "queueImportantSave", args: [200] };
  }
  function consumeBloomKeys(owner) {
    owner.currencies.chaosKey = Math.max(0, Math.floor(owner.currencies.chaosKey || 0) - 1);
    owner.currencies.coreKey = Math.max(0, Math.floor(owner.currencies.coreKey || 0) - 1);
    owner.bloomTrialRegenSuppress = 0;
  }
  function recordBloomCombo(owner, comboKey) {
    owner.pendingTalentBloomHeroId = null;
    owner.talentBloomClears = Math.max(0, Math.floor(owner.talentBloomClears || 0)) + 1;
    owner.talentBloomCombos = Array.isArray(owner.talentBloomCombos) ? owner.talentBloomCombos : [];
    const isNew = !owner.talentBloomCombos.includes(comboKey);
    if (isNew) owner.talentBloomCombos.push(comboKey);
    return isNew;
  }
  function recordBloomClass(owner, classKey) {
    owner.bloomedClasses = Array.isArray(owner.bloomedClasses) ? owner.bloomedClasses : [];
    const first = classKey !== "none" && !owner.bloomedClasses.includes(classKey);
    if (first) owner.bloomedClasses.push(classKey);
    return first;
  }

  // modules/combat/skill-dot-state.mjs
  function hitGetDotStackMultiplier(env2, stacks) {
    let safeStacks = Math.max(1, Math.min(env2.deps.DOT_STACK_MAX, Math.floor(stacks || 1)));
    return Math.pow(1 + env2.deps.DOT_STACK_GROWTH_PER_STACK, safeStacks - 1);
  }
  function hitApplyEnemyDotFromHit(env2, enemy, hitDamage, pStats) {
    if (!enemy || enemy.hp <= 0) return;
    let prev = enemy.dotState && typeof enemy.dotState === "object" ? enemy.dotState : null;
    let state = dotStateAfterHit(env2, prev, hitDamage, pStats);
    enemy.dotState = state;
    applyDotSlowAndDecay(env2, enemy, pStats, state.stacks);
    enemy.dotStacks = state.stacks;
  }
  function dotStateAfterHit(env2, prev, hitDamage, pStats) {
    let skill = pStats && pStats.sSkill;
    let nextStacks = dotStacksAfterHit(env2, prev, skill);
    let nextRawTickDamage = dotDamageAfterHit(env2, hitDamage, pStats, skill, nextStacks);
    let { tickInterval, duration } = dotTiming(env2, pStats);
    return {
      stacks: nextStacks,
      rawTickDamage: Math.max(nextRawTickDamage, prev && prev.rawTickDamage || 0),
      tickInterval,
      tickTimer: prev && Number.isFinite(prev.tickTimer) ? Math.min(prev.tickTimer, tickInterval) : tickInterval,
      timeLeft: duration,
      ele: skill && skill.ele || "chaos",
      skillName: env2.owner.activeSkill || "dot"
    };
  }
  function dotStacksAfterHit(env2, prev, skill) {
    let nextStacks = Math.min(env2.deps.DOT_STACK_MAX, Math.max(0, prev && prev.stacks || 0) + 1);
    let skillStackCap = Math.max(1, Math.floor(Number(skill && skill.dotStackCap) || env2.deps.DOT_STACK_MAX));
    return Math.min(skillStackCap, nextStacks);
  }
  function dotDamageAfterHit(env2, hitDamage, pStats, skill, nextStacks) {
    let skillStackGrowth = Math.max(0, Number(skill && skill.dotStackDamagePct) || 0) / 100;
    let stackMultiplier = skillStackGrowth > 0 ? Math.pow(1 + skillStackGrowth, nextStacks - 1) : hitGetDotStackMultiplier(env2, nextStacks);
    let dotDamageScale = Math.max(0.01, pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1);
    let baseTick = Math.max(1, Math.floor(Math.max(1, hitDamage) * env2.deps.DOT_TICK_FROM_HIT_RATIO * dotDamageScale));
    return Math.max(1, Math.floor(baseTick * stackMultiplier));
  }
  function dotTiming(env2, pStats) {
    let tickInterval = env2.deps.DOT_TICK_INTERVAL * Math.max(0.05, pStats && Number.isFinite(pStats.dotTickIntervalMultiplier) ? pStats.dotTickIntervalMultiplier : 1);
    let duration = env2.deps.DOT_EFFECT_DURATION * Math.max(0.05, pStats && Number.isFinite(pStats.dotDurationMultiplier) ? pStats.dotDurationMultiplier : 1);
    return { tickInterval, duration };
  }
  function applyDotSlowAndDecay(env2, enemy, pStats, nextStacks) {
    enemy.skillSlowPct = Math.min(95, Math.max(0, Number(pStats && pStats.sSkill && pStats.sSkill.dotStackSlowPct) || 0) * nextStacks);
    if (pStats && pStats.sSkill && pStats.sSkill.flameDecayDebuff) hitSyncEnemyFlameDecayAilment(env2, enemy, enemy.dotState, pStats);
  }
  function hitSyncEnemyFlameDecayAilment(env2, enemy, dotState, pStats) {
    if (!enemy || !dotState || dotState.skillName !== "화염 부패") return;
    if (typeof env2.deps.canTalentCardApplyEnemyAilment === "function" && !env2.deps.canTalentCardApplyEnemyAilment("flameDecay")) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let damage = flameDecayDamage(env2, enemy, dotState, pStats);
    let row = enemy.ailments.find((ail) => ail && ail.type === "flameDecay");
    let payload = flameDecayPayload(dotState, pStats, damage);
    if (row) Object.assign(row, payload);
    else enemy.ailments.push(payload);
  }
  function flameDecayDamage(env2, enemy, dotState, pStats) {
    let zone = env2.deps.getZone(env2.owner.currentZoneId) || env2.deps.getZone(0);
    let zoneTier = zone && zone.tier || 1;
    let abyssPlayerMul = env2.deps.getAbyssMonsterScales(zone).playerDamageMul || 1;
    let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || env2.deps.DOT_TICK_INTERVAL);
    let decayEle = dotState.ele || "fire";
    let enemyRes = env2.deps.getEffectiveEnemyMitigation(decayEle, zoneTier, enemy, pStats);
    let dps = Math.floor(Math.max(1, Math.floor((dotState.rawTickDamage || 1) / tickInterval * (1 - enemyRes / 100) * abyssPlayerMul)) * env2.deps.loopMutation.takenMul(enemy, decayEle));
    return { dps, tickInterval, enemyRes, abyssPlayerMul };
  }
  function flameDecayPayload(dotState, pStats, damage) {
    return {
      type: "flameDecay",
      time: Math.max(0, dotState.timeLeft || 0),
      power: Math.max(0, dotState.stacks || 1),
      flameDecayDps: damage.dps,
      rawTickDamage: Math.max(0, Number(dotState.rawTickDamage || 0)),
      tickInterval: damage.tickInterval,
      enemyRes: damage.enemyRes,
      abyssPlayerMul: damage.abyssPlayerMul,
      igniteTakenMultiplier: Math.max(1, Number(pStats && pStats.flameDecayIgniteTakenMultiplier) || effectGetFlameDecayIgniteTakenMultiplier(pStats))
    };
  }

  // modules/data/skill-combat-values.mjs
  var ELEMENTAL_HIT_AILMENTS = ["ignite", "chill", "freeze", "shock"];
  var CHAOS_BOSS_ELEMENTS = /* @__PURE__ */ Object.freeze(["fire", "cold", "light", "chaos"]);
  var FLAME_DECAY_BURST = /* @__PURE__ */ Object.freeze({ radius: 2, pct: 70, spread: 3, settleMs: 100 });
  var SKILL_PERIODIC_CHAIN_CAP = 12;
  var WOODSMAN_PHASE_OLD_FINAL_PROGRESS = 0.75;
  var WOODSMAN_PHASE_NEW_FINAL_PROGRESS = 0.95;
  var WOODSMAN_ELEMENTS = /* @__PURE__ */ Object.freeze(["phys", "fire", "cold", "light", "chaos"]);
  var COSMOS_ASTRA_STANCES = [
    { name: "하말리스의 메아리: 견고", ele: "phys", drAdd: 20, armorMul: 1.7 },
    { name: "디프다르의 메아리: 흡수", ele: "chaos", regenMul: 8, resChaosAdd: 22 },
    { name: "주베누비아의 메아리: 균형", ele: "phys", resAllAdd: 18, drAdd: 8 },
    { name: "주벤샤말의 메아리: 심판", ele: "light", penetrationAdd: 26, critChanceAdd: 18, atkMulMul: 1.15 },
    { name: "에니프론의 메아리: 충격", ele: "fire", atkMulMul: 1.75, attackSpeedVarMul: 1.4 }
  ];
  var COSMOS_ASTRA_STANCE_CYCLE_MS = 4500;

  // modules/combat/flame-decay.mjs
  function hitIsFlameDecayLit(enemy) {
    const dot = enemy && enemy.dotState;
    return !!dot && dot.skillName === "화염 부패" && dot.timeLeft > 0;
  }
  function* hitApplySkillDotFromHit(env2, enemy, hitDamage, pStats) {
    if (pStats.sSkill && pStats.sSkill.flameDecayDebuff && (yield* hitDetonateFlameDecay(env2, enemy, hitDamage, pStats))) return;
    hitApplyEnemyDotFromHit(env2, enemy, hitDamage, pStats);
    hitMarkFlameDecayLit(env2, enemy, hitDamage);
  }
  function hitMarkFlameDecayLit(env2, enemy, hitDamage) {
    if (enemy.dotState && !enemy.dotState.appliedAt) Object.assign(enemy.dotState, { appliedAt: env2.deps.getCombatTime(), burstDamage: Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100) });
  }
  function hitClearFlameDecay(enemy) {
    enemy.dotState = null;
    enemy.dotStacks = 0;
    enemy.skillSlowPct = 0;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter((ail) => ail && ail.type !== "flameDecay") : [];
  }
  function* hitBurstFlameDecay(env2, enemy, burstDamage, pStats) {
    const reach = (cell) => Math.abs(cell.gx - enemy.gx) + Math.abs(cell.gy - enemy.gy) <= FLAME_DECAY_BURST.radius;
    const near = (env2.owner.enemies || []).filter((other) => other && other !== enemy && other.hp > 0 && env2.deps.hasGridCell(other) && env2.deps.getGridUnitCells(other).some(reach)).sort((a, b) => env2.deps.getGridUnitDistance(enemy, a) - env2.deps.getGridUnitDistance(enemy, b));
    for (const other of near) {
      const damage = env2.deps.applyDamageToEnemyResource(other, hitFlameDecayMitigated(env2, other, burstDamage, pStats));
      yield { kind: "addBattleFx", args: ["hit", { enemyId: other.id, damage, element: "fire", color: env2.deps.getElementColor("fire"), duration: 240, noLine: true }] };
    }
    enemy.flameDecayBurstAt = env2.deps.getCombatTime();
    return near;
  }
  function* hitDetonateFlameDecay(env2, enemy, hitDamage, pStats) {
    if (!env2.deps.hasGridCell(enemy) || !hitIsFlameDecayLit(enemy) || env2.deps.getCombatTime() - (enemy.dotState.appliedAt || 0) < FLAME_DECAY_BURST.settleMs) return false;
    const dot = enemy.dotState, burst = Math.max(1, Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100));
    const ticks = Math.floor(dot.timeLeft / Math.max(0.02, Number(dot.tickInterval) || env2.deps.DOT_TICK_INTERVAL));
    hitClearFlameDecay(enemy);
    const damage = env2.deps.applyDamageToEnemyResource(enemy, hitFlameDecayMitigated(env2, enemy, ticks * (dot.rawTickDamage || 0) + burst, pStats));
    yield { kind: "addBattleFx", args: ["hit", { enemyId: enemy.id, damage, element: "fire", color: env2.deps.getElementColor("fire"), duration: 240, noLine: true }] };
    const spread = (yield* hitBurstFlameDecay(env2, enemy, burst, pStats)).filter((other) => other.hp > 0 && !hitIsFlameDecayLit(other)).slice(0, FLAME_DECAY_BURST.spread);
    for (const other of spread) {
      hitApplyEnemyDotFromHit(env2, other, hitDamage, pStats);
      hitMarkFlameDecayLit(env2, other, hitDamage);
    }
    enemy.flameDecaySpread = spread.map((other) => other.id);
    return true;
  }
  function* hitBurstFlameDecayOnDeath(env2, enemy, pStats) {
    if (!hitIsFlameDecayLit(enemy) || !env2.deps.hasGridCell(enemy)) return;
    const burst = Math.max(1, Math.floor(enemy.dotState.burstDamage || 0));
    hitClearFlameDecay(enemy);
    if (burst > 1) yield* hitBurstFlameDecay(env2, enemy, burst, pStats);
  }
  function hitFlameDecayMitigated(env2, enemy, damage, pStats) {
    return Math.floor(Math.max(1, Math.floor(damage * (1 - env2.deps.getEffectiveEnemyMitigation("fire", (env2.deps.getZone(env2.owner.currentZoneId) || {}).tier || 1, enemy, pStats) / 100))) * env2.deps.loopMutation.takenMul(enemy, "fire"));
  }

  // modules/combat/skill-conditional-damage.mjs
  function* hitGetSkillConditionalDamageMultiplier(env2, skill, enemy, onCue) {
    const ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let multiplier = yield* activeAilmentMultiplier(env2, skill, ailments, onCue);
    multiplier *= yield* consumedAilmentMultiplier(env2, skill, ailments, onCue);
    const missingPct = 1 - Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    multiplier *= 1 + missingPct * Math.max(0, Number(skill.missingLifeDamagePct) || 0) / 100;
    multiplier *= yield* fullLifeMultiplier(env2, skill, enemy, onCue);
    multiplier *= yield* distanceMultiplier(env2, skill, enemy, onCue);
    return multiplier * crowdMultiplier(env2, skill);
  }
  function* activeAilmentMultiplier(env2, skill, ailments, onCue) {
    const active = skill.activeAilmentDamageMore;
    if (!active || !ailments.some((ail) => ail && ail.type === active.type && (ail.time || 0) > 0)) return 1;
    const pct = Math.max(0, Number(active.pct) || 0);
    if (typeof onCue === "function") yield { kind: "deliverSkillCue", args: [onCue, {
      key: `ailment-${active.type}`,
      text: env2.deps._t("{type} 연계: 피해 {pct}% 증폭", { type: env2.deps.getAilmentDisplayLabel(active.type), pct }),
      color: env2.deps.getElementColor(skill.ele)
    }] };
    return 1 + pct / 100;
  }
  function* consumedAilmentMultiplier(env2, skill, ailments, onCue) {
    const configs = skill.consumeAilmentDamageMore || [], count = configs.length;
    let consumed = false, multiplier = 1;
    for (let i = 0; i < count; i++) {
      if (!(i in configs)) continue;
      const config = configs[i];
      if (consumed) continue;
      const index = ailments.findIndex((ail) => ail && ail.type === config.type && (ail.time || 0) > 0);
      if (index < 0) continue;
      const pct = Math.max(0, Number(config.pct) || 0);
      multiplier *= 1 + pct / 100;
      ailments.splice(index, 1);
      consumed = true;
      yield* consumedAilmentCue(env2, skill, { type: config.type, pct }, onCue);
    }
    return multiplier;
  }
  function* consumedAilmentCue(env2, skill, consumed, onCue) {
    if (typeof onCue !== "function") return;
    yield { kind: "deliverSkillCue", args: [onCue, {
      key: `consume-${consumed.type}`,
      text: env2.deps._t("{type} 소모: 피해 {pct}% 증폭", {
        type: env2.deps.getAilmentDisplayLabel(consumed.type),
        pct: consumed.pct
      }),
      color: env2.deps.getElementColor(skill.ele)
    }] };
  }
  function* fullLifeMultiplier(env2, skill, enemy, onCue) {
    if (!((enemy.hp || 0) >= Math.max(1, enemy.maxHp || 1))) return 1;
    const pct = Math.max(0, Number(skill.fullLifeDamageMorePct) || 0);
    if (pct > 0 && typeof onCue === "function") yield { kind: "deliverSkillCue", args: [onCue, {
      key: "full-life",
      text: env2.deps._t("선제: 피해 {pct}% 증폭", { pct }),
      color: "#ffd27a"
    }] };
    return 1 + pct / 100;
  }
  function* distanceMultiplier(env2, skill, enemy, onCue) {
    if (!env2.owner.gridPlayer || !env2.deps.hasGridCell(enemy)) return 1;
    const distance = env2.deps.getGridUnitDistance(env2.owner.gridPlayer, enemy);
    const bonus = Math.max(0, distance - 1) * Math.max(0, Number(skill.distanceDamageMorePerCellPct) || 0);
    const cap = Math.max(0, Number(skill.distanceDamageMoreCapPct) || 0);
    const applied = Math.min(cap, bonus);
    if (cap > 0 && applied >= cap && typeof onCue === "function") yield { kind: "deliverSkillCue", args: [onCue, {
      key: "max-distance",
      text: env2.deps._t("최대 거리: 피해 {cap}% 증폭", { cap }),
      color: "#bdeaff"
    }] };
    return 1 + applied / 100;
  }
  function crowdMultiplier(env2, skill) {
    const nearbyEnemies = (env2.owner.enemies || []).filter((row) => row && row.hp > 0).length;
    const bonus = Math.max(0, nearbyEnemies - 1) * Math.max(0, Number(skill.crowdDamageMorePerEnemyPct) || 0);
    const cap = Math.max(0, Number(skill.crowdDamageMoreCapPct) || 0);
    return 1 + Math.min(cap, bonus) / 100;
  }

  // modules/combat/skill-grid-control.mjs
  function hitGetSkillGridPullGeometry(env2, skill, options) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill?.pullTowardImpactCells || skill?.pullTowardPlayerCells) || 0)));
    let center = skill?.pullTowardImpactCells ? options.attackFootprint?.center : env2.owner.gridPlayer;
    return { cells, center };
  }
  function* hitPushEnemyAwayOnHit(env2, enemy, skill) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill && skill.pushAwayCells) || 0)));
    if (cells <= 0 || !hitCanPushEnemy(env2, enemy) || !env2.deps.hasGridCell(env2.owner.gridPlayer)) return false;
    let moved = false;
    for (let step = 0; step < cells; step++) {
      const cell = env2.deps.findGridRetreatCell(enemy, env2.owner.gridPlayer, 99, null);
      if (!cell) break;
      Object.assign(enemy, cell);
      moved = true;
    }
    if (moved) yield { kind: "addBattleFx", args: ["statusText", { enemyId: enemy.id, text: env2.deps._t("밀려남"), color: "#f0c993", duration: 300 }] };
    return moved;
  }
  function* hitRepelMeleeAttacker(env2, enemy, pStats) {
    const repel = pStats.uniqueRepelMelee;
    if (!repel || enemy.attackKind !== "melee" || !(enemy.hp > 0)) return;
    const now = env2.deps.getCombatTime();
    if (now < (Number(enemy.repelledAt) || -Infinity) + repel.cooldownMs) return;
    if (yield* hitPushEnemyAwayOnHit(env2, enemy, { pushAwayCells: repel.cells })) enemy.repelledAt = now;
  }
  function* hitLaunchEnemyOnHit(env2, enemy, skill) {
    let ms = Math.max(0, Math.floor(Number(skill && skill.launchMs) || 0));
    if (ms <= 0 || enemy.isBoss) return false;
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, env2.deps.getCombatTime() + ms);
    yield { kind: "addBattleFx", args: ["statusText", { enemyId: enemy.id, text: env2.deps._t("띄움"), color: "#f0c993", duration: 300 }] };
    return true;
  }
  function* hitDisplaceEnemyOnHit(env2, enemy, skill, options) {
    if (options.skipGridControl || !enemy || enemy.hp <= 0) return;
    yield* hitPushEnemyAwayOnHit(env2, enemy, skill);
    yield* hitLaunchEnemyOnHit(env2, enemy, skill);
  }
  function* hitApplySkillGridControlOnHit(env2, enemy, skill, options = {}) {
    yield* hitDisplaceEnemyOnHit(env2, enemy, skill, options);
    let { cells, center } = hitGetSkillGridPullGeometry(env2, skill, options);
    if (cells <= 0 || options.skipGridControl || !enemy || enemy.hp <= 0 || !center || !env2.deps.hasGridCell(enemy)) return false;
    let moved = pullEnemyTowardCell(env2, enemy, center, cells);
    if (moved) yield { kind: "addBattleFx", args: ["statusText", { enemyId: enemy.id, text: env2.deps._t("중력 견인"), color: "#c5a8ff", duration: 300 }] };
    return moved;
  }
  function pullEnemyTowardCell(env2, enemy, center, cells) {
    let moved = false;
    for (let step = 0; step < cells; step++) {
      if (!env2.deps.gridStepToward(enemy, center.gx, center.gy, env2.deps.getGridBlockedCells(enemy))) break;
      moved = true;
    }
    return moved;
  }
  function hitCanPushEnemy(env2, enemy) {
    return !enemy.isBoss && !env2.deps.isEnemyPetrified(enemy) && env2.deps.hasGridCell(enemy);
  }

  // modules/domain/ailment-probabilities.mjs
  function effectGetAilmentTypeFromElement(ele) {
    if (ele === "fire") return "ignite";
    if (ele === "cold") return "chill";
    if (ele === "light") return "shock";
    if (ele === "chaos") return "poison";
    return "bleed";
  }
  var ailmentChanceTypes = /* @__PURE__ */ Object.freeze(["ignite", "chill", "freeze", "shock", "poison", "bleed"]);
  function effectGetPlayerAilmentChance(pStats, type) {
    const base = ailmentChanceTypes.includes(type) ? pStats[type + "Chance"] || 0 : 0;
    return Math.max(0, Math.min(1, base / 100));
  }
  function effectGetPassiveBleedMultiplier(pStats) {
    return pStats?.passiveKeystoneFlags?.bloodCradle ? 0.7 : 1;
  }
  function effectGetPlayerAilmentProcChance(pStats, type, isCrit, forcedChance) {
    const multiplier = type === "bleed" ? effectGetPassiveBleedMultiplier(pStats) : 1;
    const base = Number.isFinite(forcedChance) ? forcedChance * multiplier : effectGetPlayerAilmentChance(pStats, type);
    const supportChance = type === "ignite" ? (pStats.sSkill?.supportEffects?.ignite?.chancePct || 0) / 100 : 0;
    return Math.max(0, Math.min(1, base + supportChance + (isCrit ? 0.25 * multiplier : 0)));
  }
  function effectGetFreezeApplyChanceFromHitRatio(hitRatio, enemyMaxHp) {
    let ratio = Math.max(0, Number(hitRatio) || 0);
    let hp = Math.max(1, Number(enemyMaxHp) || 1);
    let hpFactor = Math.max(0.18, 1 / Math.log10(hp + 10));
    return Math.max(0.01, Math.min(0.7, ratio * 1.8 * hpFactor));
  }

  // modules/domain/ailment-hit-scaling.mjs
  function effectGetSkillAilmentStats(pStats, hitElement, curseFx) {
    let skill = pStats.sSkill || {};
    let bonus = skill.ailmentChanceBonus || {};
    let curseChance = curseFx && curseFx.ailmentChanceAdd ? curseFx.ailmentChanceAdd : {};
    return {
      ...pStats,
      igniteChance: combinedAilmentChance(pStats, bonus, curseChance, "ignite"),
      chillChance: combinedAilmentChance(pStats, bonus, curseChance, "chill"),
      freezeChance: combinedAilmentChance(pStats, bonus, curseChance, "freeze"),
      shockChance: combinedAilmentChance(pStats, bonus, curseChance, "shock"),
      poisonChance: combinedAilmentChance(pStats, bonus, curseChance, "poison"),
      bleedChance: (pStats.bleedChance || 0) + ((bonus.bleed || 0) + (curseChance.bleed || 0) * 100) * effectGetPassiveBleedMultiplier(pStats),
      sSkill: { ...skill, ele: hitElement }
    };
  }
  function combinedAilmentChance(pStats, bonus, curseChance, type) {
    return (pStats[type + "Chance"] || 0) + (bonus[type] || 0) + (curseChance[type] || 0) * 100;
  }
  function effectGetPlayerShockTakenDamageIncreasePct(pStats, power) {
    void power;
    let base = 22;
    let reduction = Math.max(0, Math.min(0.95, Number(pStats && pStats.shockEffectReducePct || 0) / 100));
    let value = Math.max(0, base * (1 - reduction));
    return pStats && pStats.uniqueShockInvertTaken ? -value : value;
  }
  function effectGetEnemyShockTakenDamageIncreasePct(ail, pStats) {
    if (!ail || ail.type !== "shock" || (ail.time || 0) <= 0) return 0;
    let power = Math.max(0, Number(ail.power || 0));
    let base = Math.min(35, 8 + power * 12);
    let bonus = Math.max(0, Number(pStats && pStats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
  }
  function effectGetActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) {
    if (!enemy || !Array.isArray(enemy.ailments)) return 0;
    return enemy.ailments.reduce((best, ail) => Math.max(best, effectGetEnemyShockTakenDamageIncreasePct(ail, pStats)), 0);
  }
  function effectGetShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats) {
    let isShocked = enemy && Array.isArray(enemy.ailments) && enemy.ailments.some((ail) => ail && ail.type === "shock" && (ail.time || 0) > 0);
    let bonus = Math.max(0, Number(pStats && pStats.shockedEnemyHitDamagePct) || 0);
    if (!isShocked || bonus <= 0) return 1;
    let existingIncrease = Math.max(0, Number(pStats && pStats.damageIncreasePct) || 0);
    return (100 + existingIncrease + bonus) / (100 + existingIncrease);
  }
  function effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) {
    let baseScale = Math.max(0.01, Number(scale) || 1);
    let bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    let bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return baseScale + bonusPct / 100 * bonusScale;
  }
  function effectGetDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) {
    let source = Math.max(0, Number(sourceDamage) || 0);
    return source * effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
  }

  // modules/domain/ailment-dot-damage.mjs
  function hitIsDamageAilmentType(type) {
    return type === "ignite" || type === "poison" || type === "bleed";
  }
  function hitGetStoredAilmentHitDamage(ail) {
    if (!ail) return 0;
    return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
  }
  function hitGetDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
    let source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    let mul = effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
    return Math.max(1, Math.floor(source * 0.9 * mul));
  }
  function hitGetEnemyDamageAilmentDps(env2, ail, pStats) {
    let dps = enemyAilmentBaseDps(ail, pStats);
    dps = scaledEnemyAilmentDps(dps, ail, pStats);
    if (ail && (ail.talentDamageMorePct || 0) > 0) dps = Math.floor(dps * (1 + ail.talentDamageMorePct / 100));
    if (typeof env2.deps.getTalentDotDamageMultiplier === "function") dps = Math.floor(dps * env2.deps.getTalentDotDamageMultiplier());
    if (ail && ail.type === "bleed") dps = Math.floor(dps * effectGetPassiveBleedMultiplier(pStats));
    return dps;
  }
  function enemyAilmentBaseDps(ail, pStats) {
    let dotDamageScale = Math.max(0.01, pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1);
    return hitGetDamageAilmentBaseDpsFromHit(hitGetStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
  }
  function scaledEnemyAilmentDps(dps, ail, pStats) {
    const damageStat = { ignite: "igniteDamageMultiplierPct", poison: "poisonDamageMultiplierPct" }[ail?.type];
    dps = Math.floor(dps * (1 + (Math.max(0, Number(pStats?.[damageStat]) || 0) + Math.max(0, Number(pStats?.ailmentDamagePct) || 0)) / 100));
    if (ail && pStats && ail.type === pStats.mystiqueAilmentType) {
      dps = Math.floor(dps * (1 + Math.max(0, Number(pStats.mystiqueAilmentDamagePct) || 0) / 100));
    }
    return dps;
  }
  function hitGetPlayerDamageAilmentDps(env2, ail, pStats) {
    let source = hitGetStoredAilmentHitDamage(ail);
    let dps = source > 0 ? hitGetDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, 1) : hitGetPlayerDamageAilmentFallbackDps(env2, ail ? ail.type : null, ail ? ail.power : 0, pStats);
    if (pStats && pStats.uniqueArmorAppliesToDot) {
      let armor = Math.max(0, Number(pStats.armor) || 0);
      let armorRed = Math.min(0.8, armor / (armor + 1200));
      dps = Math.max(0, Math.floor(dps * (1 - armorRed)));
    }
    return dps;
  }
  function hitGetPlayerDamageAilmentFallbackDps(env2, type, power, pStats) {
    let stats = pStats || (typeof env2.deps.getPlayerStats === "function" ? env2.deps.getPlayerStats() : null);
    let maxHp = Math.max(1, Math.floor(stats && stats.maxHp || 0));
    if (maxHp <= 1) return 0;
    let p = Math.max(0.1, Number(power || 0.1));
    let perTick = fallbackAilmentTickDamage(type, p, maxHp);
    return perTick > 0 ? perTick * 10 : 0;
  }
  function fallbackAilmentTickDamage(type, p, maxHp) {
    let perTick = 0;
    if (type === "ignite") perTick = Math.max(1, Math.floor(maxHp * (35e-4 + p * 4e-3)));
    else if (type === "poison") perTick = Math.max(1, Math.floor(maxHp * (3e-3 + p * 34e-4)));
    else if (type === "bleed") perTick = Math.max(1, Math.floor(maxHp * (32e-4 + p * 32e-4)));
    return perTick;
  }

  // modules/combat/ailment-spread.mjs
  function hitGetEnemyDamageAilmentMaxStacks(env2, type, pStats) {
    if (type === "bleed" && effectGetPassiveBleedMultiplier(pStats) < 1) return 5;
    let cap = 1;
    if (env2.deps.hasKeystone("ct6")) cap += 1;
    if (env2.deps.hasKeystone("ct8")) cap += 2;
    if (type === "poison") cap += Math.max(0, Math.floor(Number(pStats && pStats.uniquePoisonExtraStacks) || 0));
    return Math.max(1, cap);
  }
  function hitCloneEnemyAilmentForSpread(env2, ail, pStats) {
    if (!ail || (ail.time || 0) <= 0) return null;
    const spreadableTypes = ["ignite", "poison", "bleed", "chill", "shock", "freeze"];
    if (!spreadableTypes.includes(ail.type)) return null;
    let copy = { type: ail.type, time: Math.max(0, Number(ail.time) || 0), power: Math.max(0, Number(ail.power) || 0) };
    if (hitIsDamageAilmentType(ail.type)) copySpreadDamage(env2, copy, ail, pStats);
    return copy;
  }
  function copySpreadDamage(env2, copy, ail, pStats) {
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env2, ail.type, pStats);
    if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(ail.stacks || 1));
    copy.stacks = Math.max(1, Math.min(maxStacks, Math.floor(ail.stacks || 1)));
    copy.sourceHitDamage = hitGetStoredAilmentHitDamage(ail);
    copy.critDotBonusPct = Math.max(0, Number(ail.critDotBonusPct) || 0);
    copy.ailmentDotScore = Math.max(0, Number(ail.ailmentDotScore) || 0);
    copy.talentDamageMorePct = Math.max(0, Number(ail.talentDamageMorePct) || 0);
  }
  function hitMergeEnemyAilment(env2, target, incoming, pStats) {
    if (!target || !incoming || (incoming.time || 0) <= 0) return false;
    if (typeof env2.deps.canTalentCardApplyEnemyAilment === "function" && !env2.deps.canTalentCardApplyEnemyAilment(incoming.type)) return false;
    target.ailments = Array.isArray(target.ailments) ? target.ailments : [];
    let row = target.ailments.find((ail) => ail && ail.type === incoming.type);
    if (!row) {
      target.ailments.push({ ...incoming });
      return true;
    }
    extendAilmentDurationAndPower(row, incoming);
    if (hitIsDamageAilmentType(incoming.type)) mergeAilmentDamage(env2, row, incoming, pStats);
    return true;
  }
  function extendAilmentDurationAndPower(row, incoming) {
    row.time = Math.max(row.time || 0, incoming.time || 0);
    row.power = Math.max(row.power || 0, incoming.power || 0);
  }
  function mergedDamageStacks(env2, row, incoming, pStats) {
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env2, incoming.type, pStats);
    if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1));
    return Math.max(1, Math.min(maxStacks, Math.max(Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1))));
  }
  function mergeAilmentDamage(env2, row, incoming, pStats) {
    row.stacks = mergedDamageStacks(env2, row, incoming, pStats);
    let rowScore = Math.max(0, Number(row.ailmentDotScore) || hitGetStoredAilmentHitDamage(row));
    let incomingScore = Math.max(0, Number(incoming.ailmentDotScore) || hitGetStoredAilmentHitDamage(incoming));
    if (incomingScore >= rowScore) {
      row.sourceHitDamage = hitGetStoredAilmentHitDamage(incoming);
      row.critDotBonusPct = Math.max(0, Number(incoming.critDotBonusPct) || 0);
      row.ailmentDotScore = incomingScore;
      row.talentDamageMorePct = Math.max(0, Number(incoming.talentDamageMorePct) || 0);
    }
  }
  function* hitSpreadSkillAilmentOnHit(env2, source, skill, pStats) {
    let config = skill.ailmentSpreadOnHit;
    if (!config || Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0))) return;
    let ailment = (source.ailments || []).find((ail) => ail && ail.type === config.type && (ail.time || 0) > 0);
    let copy = hitCloneEnemyAilmentForSpread(env2, ailment, pStats);
    if (!copy) return;
    let targets = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.id !== source.id && enemy.hp > 0);
    const selected = targets.slice(0, Math.max(1, Math.floor(config.targets || 1))), count = selected.length;
    for (let i = 0; i < count; i++) {
      if (!(i in selected)) continue;
      const target = selected[i];
      hitMergeEnemyAilment(env2, target, copy, pStats);
      yield { kind: "addBattleFx", args: ["statusText", {
        enemyId: target.id,
        text: env2.deps._t("{type} 전파", { type: env2.deps.getAilmentDisplayLabel(config.type) }),
        color: env2.deps.getElementColor(skill.ele),
        duration: 650,
        dedupeKey: `ailment-spread:${source.id}:${target.id}`,
        dedupeWindowMs: 650
      }] };
    }
  }

  // modules/combat/skill-periodics.mjs
  function hitQueueSkillPeriodicHit(enemy, config, damage, ele, visual) {
    if (!config || enemy.hp <= 0 || !periodicProcSucceeds(config)) return;
    enemy.skillPeriodics = Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : [];
    let queuedHits = enemy.skillPeriodics.reduce((sum, fx) => sum + Math.max(0, fx.hitsLeft || 0), 0);
    let allowedHits = Math.max(0, SKILL_PERIODIC_CHAIN_CAP - queuedHits);
    if (allowedHits <= 0) return;
    enemy.skillPeriodics.push(periodicHitEntry(config, damage, ele, visual, allowedHits));
  }
  function periodicHitEntry(config, damage, ele, visual, allowedHits) {
    let hits = Math.min(Math.max(1, Math.floor(config.hits || 1)), allowedHits);
    let interval = Math.max(0.05, Number(config.interval) || 1);
    return {
      hitsLeft: hits,
      visual,
      interval,
      timer: interval,
      damage: Math.max(1, Math.floor(damage * Math.max(0, Number(config.damagePct) || 0) / 100)),
      ele: config.ele || ele || "phys"
    };
  }
  function periodicProcSucceeds(config) {
    return !(Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0)));
  }
  function hitApplySkillPeriodicOnHit(env2, enemy, skill, damage, skillName) {
    hitQueueSkillPeriodicHit(enemy, skill.periodicOnHit, damage, skill.ele, { skillName, sourceCell: env2.deps.copyCombatGridCell(env2.owner.gridPlayer) });
  }
  function* hitAddConfirmedSkillEffect(env2, kind, visual, target, element) {
    if (!visual?.skillName || !env2.deps.hasGridCell(target) || !env2.deps.hasGridCell(visual.sourceCell)) return;
    yield { kind: "addBattleFx", args: ["combatTravel", {
      owner: "player",
      delivery: kind,
      skillName: visual.skillName,
      sourceCell: visual.sourceCell,
      targetCells: [env2.deps.getGridUnitCenter(target)],
      element,
      duration: kind === "confirmedPeriodic" ? 180 : 220
    }] };
  }
  function hitApplySupportEchoOnHit(enemy, pStats, damage) {
    let echoPower = pStats.echoPower || 0;
    if (echoPower <= 0) return;
    let config = {
      chance: Math.min(0.6, 0.2 + echoPower / 100),
      hits: 2 + Math.floor(echoPower / 20),
      interval: 0.45,
      damagePct: 15 + echoPower * 0.6
    };
    hitQueueSkillPeriodicHit(enemy, config, damage, pStats.sSkill && pStats.sSkill.ele);
  }
  function* hitTickEnemySkillPeriodicEffects(env2, pStats, dt) {
    let zone = env2.deps.getZone(env2.owner.currentZoneId);
    let zoneTier = zone && zone.tier || 1;
    const enemies = env2.owner.enemies || [], count = enemies.length;
    for (let i = 0; i < count; i++) {
      if (!(i in enemies)) continue;
      yield* tickEnemyPeriodics(env2, enemies[i], pStats, { dt, zoneTier });
    }
  }
  function* tickEnemyPeriodics(env2, enemy, pStats, tick) {
    const effects2 = enemy && enemy.hp > 0 && Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : null;
    if (!effects2 || effects2.length <= 0) return;
    const count = effects2.length;
    for (let i = 0; i < count; i++) {
      if (!(i in effects2)) continue;
      yield* tickPeriodicEffect(env2, enemy, effects2[i], pStats, tick);
    }
    enemy.skillPeriodics = effects2.filter((fx) => fx.hitsLeft > 0 && enemy.hp > 0);
    if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, pStats);
  }
  function* tickPeriodicEffect(env2, enemy, effect, pStats, tick) {
    if (effect.hitsLeft <= 0 || enemy.hp <= 0) return;
    effect.timer -= tick.dt;
    while (effect.timer <= 0 && effect.hitsLeft > 0 && enemy.hp > 0) {
      effect.timer += effect.interval;
      effect.hitsLeft--;
      const mitigation = env2.deps.getEffectiveEnemyMitigation(effect.ele, tick.zoneTier, enemy, pStats);
      const periodicMul = env2.deps.ascendancyNodeRules.dotMultiplier(env2.deps.getCombatTime());
      env2.deps.applyDamageToEnemyResource(enemy, Math.floor(Math.max(1, Math.floor(effect.damage * (1 - mitigation / 100) * periodicMul)) * env2.deps.loopMutation.takenMul(enemy, effect.ele)));
      yield* hitAddConfirmedSkillEffect(env2, "confirmedPeriodic", effect.visual, enemy, effect.ele);
    }
  }

  // modules/combat/skill-erosion.mjs
  function hitApplySupportChaosErosionOnHit(enemy, pStats, hitElement) {
    let erosionPerHit = pStats.chaosErosion || 0;
    if (erosionPerHit <= 0 || hitElement !== "chaos" || !enemy || enemy.hp <= 0) return;
    let cap = pStats.chaosErosionCap || 20;
    enemy.chaosErosionShred = Math.min(cap, (enemy.chaosErosionShred || 0) + erosionPerHit);
  }
  function hitTransferPassiveChaosErosionToTarget(env2, enemy, pStats) {
    let flags = pStats && pStats.passiveKeystoneFlags;
    let pending = Math.max(0, Number(env2.owner.passiveChaosErosionTransfer) || 0);
    if (!flags || !flags.erosionLegacy || pending <= 0 || !enemy || enemy.hp <= 0) return false;
    enemy.chaosErosionShred = Math.min(pStats.chaosErosionCap || 40, (enemy.chaosErosionShred || 0) + pending);
    env2.owner.passiveChaosErosionTransfer = 0;
    return true;
  }

  // modules/combat/kill-progression.mjs
  function hitRecordKillProgress(env2, enemy) {
    if (typeof env2.deps.stumpBox === "object") env2.deps.stumpBox.onEnemyKilled(env2.owner, enemy, hitLayStumpDrop(env2, enemy));
    if (typeof env2.deps.bossVariants === "object") env2.deps.combatLootReceipts.capture(env2.owner, () => env2.deps.bossVariants.onKilled(env2.owner, enemy));
    if (typeof env2.deps.stumpNursery === "object") env2.deps.stumpNursery.onKilled(env2.owner, enemy);
    if (typeof env2.deps.weaponMastery === "object") env2.deps.weaponMastery.onKilled(env2.owner, enemy);
  }
  function hitLayStumpDrop(env2, enemy) {
    const spec = env2.deps.stumpBox.rollKillDrop(env2.owner, enemy);
    return spec && env2.deps.placeFloorItem(enemy, "stump", spec) ? null : spec;
  }

  // modules/domain/account-reward-stats.mjs
  function hitApplyAccountRewardStats(env2, reward) {
    env2.deps.coreItems.stats().forEach((stat) => env2.deps.addStatToBucket(reward, stat.id, stat.val));
    if (typeof env2.deps.stumpBox === "object") env2.deps.stumpBox.applyStats(reward, env2.owner);
    if (typeof env2.deps.weaponMastery === "object") env2.deps.weaponMastery.applyStats(reward, env2.owner);
  }

  // modules/combat/ailment-death.mjs
  function* hitApplyAilmentEffectsOnDeath(env2, enemy, pStats) {
    yield* hitBurstFlameDecayOnDeath(env2, enemy, pStats);
    yield* hitSpreadCatalystAilmentsOnDeath(env2, enemy, pStats);
    env2.deps.regionAffixEffects.onEnemyDeath(enemy, pStats);
  }
  function* hitSpreadCatalystAilmentsOnDeath(env2, enemy, pStats) {
    if (!env2.deps.hasKeystone("ct3")) return;
    if (!enemy || !Array.isArray(enemy.ailments)) return;
    let ailments = enemy.ailments.map((ail) => hitCloneEnemyAilmentForSpread(env2, ail, pStats)).filter(Boolean);
    if (ailments.length <= 0) return;
    let targets = catalystSpreadTargets(env2, enemy);
    if (targets.length <= 0) return;
    targets.forEach((target) => ailments.forEach((ail) => hitMergeEnemyAilment(env2, target, ail, pStats)));
    if (env2.owner.settings && env2.owner.settings.showCombatLog) yield { kind: "addLog", args: [env2.deps._t("🧪 확산 반응: 남은 상태이상이 주변 적 {length}마리에게 퍼졌습니다.", { length: targets.length }), "attack-player", { rateKey: "catalyst:spread", minIntervalMs: 500 }] };
  }
  function catalystSpreadTargets(env2, enemy) {
    let sourceGroup = Number.isFinite(enemy.groupIndex) ? enemy.groupIndex : 0;
    return (env2.owner.enemies || []).filter((target) => target && target.id !== enemy.id && target.hp > 0).sort((a, b) => {
      let ga = Math.abs((Number.isFinite(a.groupIndex) ? a.groupIndex : 0) - sourceGroup);
      let gb = Math.abs((Number.isFinite(b.groupIndex) ? b.groupIndex : 0) - sourceGroup);
      if (ga !== gb) return ga - gb;
      return (a.id || 0) - (b.id || 0);
    });
  }

  // modules/combat/ailment-hit-gates.mjs
  function hitPassHitAilmentGates(env2, hit, sourceType, forceChance, manifestation) {
    const { pStats } = hit;
    let appliedType = typeof env2.deps.getTalentAilmentReplacement === "function" ? env2.deps.getTalentAilmentReplacement(sourceType) : sourceType;
    if (hitHitAilmentForbidden(env2, pStats, appliedType, sourceType, hit.element)) return null;
    if (!hitRollHitAilmentProc(hit, sourceType, forceChance)) return null;
    let mystiquePotency = sourceType === pStats.mystiqueAilmentType ? 1 + Math.max(0, Number(pStats.mystiqueAilmentPotencyPct) || 0) / 100 : 1;
    let manifestationPotency = manifestation ? 0.5 : 1;
    let effectiveHitRatio = hit.hitRatio * mystiquePotency * manifestationPotency;
    if (sourceType === "freeze" && Math.random() >= effectGetFreezeApplyChanceFromHitRatio(effectiveHitRatio, hit.enemy.maxHp || 1)) return null;
    return { appliedType, mystiquePotency, manifestationPotency };
  }
  function hitRollHitAilmentProc(hit, sourceType, forceChance) {
    const { enemy, pStats, isCrit } = hit;
    let tryProc = effectGetPlayerAilmentProcChance(pStats, sourceType, isCrit, forceChance);
    if (Math.random() >= tryProc) return false;
    let resKey = "ailRes" + sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
    let ailResPen = pStats && pStats.ailmentResistPenPct || 0;
    let resistChance = Math.max(0, Math.min(0.95, ((enemy[resKey] || 0) - ailResPen) / 100));
    return !(Math.random() < resistChance);
  }
  function hitIsElementalAilmentHit(element, sourceType, appliedType) {
    return ["fire", "cold", "light"].includes(element) || ELEMENTAL_HIT_AILMENTS.includes(sourceType) || ELEMENTAL_HIT_AILMENTS.includes(appliedType);
  }
  function hitHitAilmentForbidden(env2, pStats, appliedType, sourceType, element) {
    let passiveFlags = pStats && pStats.passiveKeystoneFlags || {};
    if (passiveFlags.threeBranchLight && hitIsElementalAilmentHit(element, sourceType, appliedType)) return true;
    if (passiveFlags.singleMystique && appliedType !== pStats.mystiqueAilmentType) return true;
    if (passiveFlags.blackDistill && ELEMENTAL_HIT_AILMENTS.includes(appliedType)) return true;
    return typeof env2.deps.canTalentCardApplyEnemyAilment === "function" && !env2.deps.canTalentCardApplyEnemyAilment(appliedType);
  }

  // modules/combat/ailment-hit-payload.mjs
  function hitGetHitAilmentPower(hit, type, damageAilment, gate) {
    const { pStats } = hit;
    let power = damageAilment ? 0.9 : Math.max(0.05, Math.min(1.5, (hit.hitPower + hit.hitRatio * 1.8) * gate.mystiquePotency * gate.manifestationPotency));
    if (type === "chill") {
      let chillEfficiency = 1 + Math.max(0, Number(pStats && pStats.chillEffectBonusPct) || 0) / 100;
      power = Math.min(1.5, power * chillEfficiency);
    }
    return power;
  }
  function hitFillDamageAilmentPayload(hit, payload, at) {
    const { pStats } = hit;
    let damageMorePct = hitGetHitAilmentDamageMorePct(hit, at.type, at.gate.appliedType);
    payload.sourceHitDamage = Math.floor(hit.ailmentPowerSourceDamage * at.gate.mystiquePotency * at.gate.manifestationPotency);
    payload.critDotBonusPct = hit.critDotBonusPct;
    payload.ailmentDotScore = effectGetDamageAilmentScore(
      payload.sourceHitDamage,
      hit.critDotBonusPct,
      pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1,
      pStats && Number.isFinite(pStats.dotCritBonusScale) ? pStats.dotCritBonusScale : 1
    ) * (1 + damageMorePct / 100);
    payload.talentDamageMorePct = damageMorePct;
  }
  function hitGetHitAilmentDamageMorePct(hit, type, appliedType) {
    const { pStats, opts } = hit;
    let damageMorePct = Math.max(0, Number(opts.ailmentDamageMorePct && opts.ailmentDamageMorePct[type]) || 0);
    let passiveFlags = pStats && pStats.passiveKeystoneFlags || {};
    if (passiveFlags.explosiveDistill && hitIsDamageAilmentType(appliedType)) damageMorePct += 75;
    if (passiveFlags.taintedWarhead && ["ignite", "poison", "bleed"].includes(appliedType)) damageMorePct += 50;
    return damageMorePct;
  }
  function hitRefreshAilmentRow(env2, row, payload, at) {
    row.time = Math.max(row.time || 0, at.dur);
    row.duration = row.time;
    row.power = Math.max(row.power || 0, at.power);
    if (!at.damageAilment) return;
    let rowScore = Math.max(0, Number(row.ailmentDotScore) || hitGetStoredAilmentHitDamage(row));
    let incomingScore = payload.ailmentDotScore;
    if (incomingScore >= rowScore) {
      row.sourceHitDamage = payload.sourceHitDamage;
      row.critDotBonusPct = at.critDotBonusPct;
      row.ailmentDotScore = incomingScore;
      row.talentDamageMorePct = Math.max(0, Number(payload.talentDamageMorePct) || 0);
      row.talentNitroAmplified = !!payload.talentNitroAmplified;
    }
    let maxStacks = hitGetEnemyDamageAilmentMaxStacks(env2, at.type, at.pStats);
    row.stacks = Math.max(1, Math.min(maxStacks, Math.floor((row.stacks || 1) + 1)));
  }
  function hitGetAilmentDurationMultiplier(env2, type, damageAilment, pStats) {
    let durationMul = damageAilment ? Math.max(0.05, pStats && Number.isFinite(pStats.dotDurationMultiplier) ? pStats.dotDurationMultiplier : 1) : 1;
    if (type === "poison" && pStats && (pStats.uniquePoisonDurationPct || 0) > 0) durationMul *= 1 + Math.max(0, Number(pStats.uniquePoisonDurationPct) || 0) / 100;
    return durationMul * effectGetPassiveAilmentDurationMultiplier(type, pStats) * env2.deps.regionAffixEffects.ailmentDurationMultiplier(pStats, type);
  }

  // modules/combat/ailment-hit-application.mjs
  function hitApplyHitAilment(env2, hit, sourceType, forceChance, manifestation) {
    const gate = hitPassHitAilmentGates(env2, hit, sourceType, forceChance, manifestation);
    if (!gate) return false;
    const { enemy, pStats } = hit;
    let type = gate.appliedType;
    let damageAilment = hitIsDamageAilmentType(type);
    let power = hitGetHitAilmentPower(hit, type, damageAilment, gate);
    let row = enemy.ailments.find((a) => a.type === type);
    let durationMul = hitGetAilmentDurationMultiplier(env2, type, damageAilment, pStats);
    let dur = env2.deps.combatSupports.igniteDuration(pStats, type, (damageAilment ? 3 : type === "freeze" ? 0.8 + hit.hitRatio * 4 : 2 + hit.hitRatio * 10) * durationMul);
    let payload = { type, time: dur, duration: dur, power, stacks: 1 };
    if (damageAilment) hitFillDamageAilmentPayload(hit, payload, { type, gate });
    if (typeof env2.deps.decorateTalentAilmentPayload === "function") env2.deps.decorateTalentAilmentPayload(type, payload, pStats);
    if (row && typeof env2.deps.enhanceTalentAilmentReapplication === "function") env2.deps.enhanceTalentAilmentReapplication(enemy, row, type, pStats);
    if (row) hitRefreshAilmentRow(env2, row, payload, { type, dur, power, damageAilment, critDotBonusPct: hit.critDotBonusPct, pStats });
    else enemy.ailments.push(payload);
    env2.deps.trackHiddenJournalAilment(type, enemy);
    if (typeof env2.deps.afterTalentAilmentApplied === "function") env2.deps.afterTalentAilmentApplied(enemy, sourceType);
    return true;
  }
  function hitApplyGroveColdPoison(env2, hit, ele) {
    if (ele !== "cold" || !env2.deps.hasKeystone("gw2")) return;
    hitApplyHitAilment(env2, { ...hit, ailmentPowerSourceDamage: Math.floor(hit.ailmentPowerSourceDamage * env2.deps.ASCENDANCY_KEYSTONE_VALUES.gw2.coldPoisonPct / 100) }, "poison");
  }
  function hitApplyEnemyAilmentFromHit(env2, enemy, pStats, input) {
    if (!enemy || enemy.hp <= 0) return;
    let ele = pStats.sSkill && pStats.sSkill.ele || "phys";
    let primaryType = effectGetAilmentTypeFromElement(ele);
    const hit = createAilmentHit(env2, enemy, pStats, { ...input, element: ele });
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    applyHitAilmentTypes(env2, hit, primaryType);
    burstFullCatalystAilments(env2, enemy, pStats);
  }
  function createAilmentHit(env2, enemy, pStats, input) {
    const { hitDamage, isCrit, options, element } = input;
    let opts = options && typeof options === "object" ? options : {};
    let ailmentPowerSourceDamage = ailmentPowerFromDamage(env2, pStats, hitDamage, opts);
    let critDotBonusPct = criticalDotBonus(opts, isCrit);
    let hitRatio = Math.max(1e-3, Math.min(0.35, ailmentPowerSourceDamage / Math.max(1, enemy.maxHp || 1)));
    let hitPower = Math.sqrt(Math.max(1, ailmentPowerSourceDamage)) * 0.01;
    return { enemy, pStats, isCrit, opts, element, hitRatio, hitPower, ailmentPowerSourceDamage, critDotBonusPct };
  }
  function ailmentPowerFromDamage(env2, pStats, hitDamage, opts) {
    let sourceHitDamage = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== void 0 ? opts.ailmentSourceDamage : hitDamage) || 0));
    let catalystAilmentMul = env2.deps.hasKeystone("ct1") ? 2 : 1;
    return Math.max(0, Math.floor(sourceHitDamage * Math.max(0.01, Number(pStats && pStats.ailmentPowerMultiplier) || 1) * catalystAilmentMul));
  }
  function criticalDotBonus(opts, isCrit) {
    return Math.max(0, Number(opts.critDotBonusPct !== void 0 ? opts.critDotBonusPct : isCrit ? 50 : 0) || 0);
  }
  function applyHitAilmentTypes(env2, hit, primaryType) {
    const { pStats, opts, element: ele } = hit;
    const applyAilmentType = (type, forceChance, manifestation) => hitApplyHitAilment(env2, hit, type, forceChance, manifestation);
    applyAilmentType(primaryType, opts.primaryAilmentChance);
    if (ele === "cold" && !(typeof env2.deps.shouldTalentSkipColdFreeze === "function" && env2.deps.shouldTalentSkipColdFreeze())) applyAilmentType("freeze");
    hitApplyGroveColdPoison(env2, hit, ele);
    if (pStats.passiveForbiddenManifestation) {
      ["ignite", "chill", "shock", "poison", "bleed"].forEach((type) => {
        if (type !== primaryType) applyAilmentType(type, void 0, true);
      });
    }
    Object.entries(opts.additionalAilmentChances || {}).forEach(([type, chance]) => {
      if (type !== primaryType) applyAilmentType(type, chance);
    });
  }
  function activeDamageAilment(ail) {
    return !!ail && hitIsDamageAilmentType(ail.type) && !((ail.time || 0) <= 0);
  }
  function burstFullCatalystAilments(env2, enemy, pStats) {
    if (!env2.deps.hasKeystone("ct8")) return;
    const now = env2.deps.getCombatTime();
    if (!((env2.owner.catalystBurstReadyAt || 0) <= now)) return;
    const ready = (enemy.ailments || []).some((ail) => activeDamageAilment(ail) && (ail.stacks || 1) >= hitGetEnemyDamageAilmentMaxStacks(env2, ail.type, pStats));
    if (!ready) return;
    let burst = 0;
    (enemy.ailments || []).forEach((ail) => {
      if (!activeDamageAilment(ail)) return;
      const dps = hitGetEnemyDamageAilmentDps(env2, ail, pStats);
      burst += Math.max(0, Math.floor(dps * Math.min(2, ail.time || 0)));
      ail.time = 0;
    });
    if (burst > 0) {
      env2.deps.applyDamageToEnemyResource(enemy, burst);
      env2.owner.catalystBurstReadyAt = now + 1e3;
    }
  }

  // modules/combat/ailment-ticks.mjs
  function* hitTickEnemyAilments(env2, pStats, dt) {
    const zone = env2.deps.getZone(env2.owner.currentZoneId);
    const zoneTier = zone && zone.tier || 1;
    const abyssPlayerMul = env2.deps.getAbyssMonsterScales(zone).playerDamageMul || 1;
    const enemies = env2.owner.enemies || [], count = enemies.length;
    for (let i = 0; i < count; i++) {
      if (!(i in enemies)) continue;
      yield* tickEnemyAilments(env2, enemies[i], pStats, { dt, zoneTier, abyssPlayerMul });
    }
    yield* hitTickEnemySkillPeriodicEffects(env2, pStats, dt);
  }
  function* tickEnemyAilments(env2, enemy, pStats, tick) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    if (enemy.ailments.length <= 0) return;
    env2.deps.enemyAttackRules.interrupt(enemy, env2.deps.getCombatTime());
    const next = [];
    const poisonHeld = env2.deps.ascendancyNodeRules.poisonHeld(enemy);
    const dotMul = env2.deps.ascendancyNodeRules.dotMultiplier(env2.deps.getCombatTime());
    const step = { ...tick, poisonHeld, dotMul };
    const ailments = enemy.ailments, count = ailments.length;
    for (let i = 0; i < count; i++) {
      if (!(i in ailments)) continue;
      const ail = ailments[i];
      yield* tickAilment(env2, enemy, ail, pStats, step);
      if (ail.time > 0) next.push(ail);
    }
    enemy.ailments = next;
    if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, pStats);
  }
  function* tickAilment(env2, enemy, ail, pStats, tick) {
    const previousTime = Math.max(0, Number(ail.time) || 0);
    ail.time = Math.max(0, (ail.time || 0) - env2.deps.ascendancyNodeRules.ailmentStep(ail, tick.poisonHeld, tick.dt));
    const type = ail.type;
    if (ail.time > 0 && hitIsDamageAilmentType(type)) {
      const { ele, dealt } = applyAilmentTickDamage(env2, enemy, ail, pStats, tick);
      yield* ailmentHitEffect(env2, enemy, type, ele, dealt);
    }
    storeExpiredAilment(env2, enemy, ail, pStats, previousTime);
    if (type === "poison" && enemy.hp <= 0) enemy.lastHitElement = "chaos";
  }
  function applyAilmentTickDamage(env2, enemy, ail, pStats, tick) {
    const type = ail.type;
    const ele = type === "ignite" ? "fire" : type === "poison" ? "chaos" : "phys";
    const enemyRes = env2.deps.getEffectiveEnemyMitigation(ele, tick.zoneTier, enemy, pStats);
    const dps = hitGetEnemyDamageAilmentDps(env2, ail, pStats);
    const igniteMul = type === "ignite" && (enemy.ailments || []).some((row) => row && row.type === "flameDecay" && (row.time || 0) > 0) ? effectGetFlameDecayIgniteTakenMultiplier(pStats) : 1;
    const stackMul = Math.max(1, Math.floor(ail.stacks || 1));
    const damage = dps > 0 ? Math.floor(Math.max(1, Math.floor(dps * stackMul * tick.dt * (1 - enemyRes / 100) * tick.abyssPlayerMul * igniteMul * tick.dotMul)) * env2.deps.loopMutation.takenMul(enemy, ele)) : 0;
    return { ele, dealt: env2.deps.applyDamageToEnemyResource(enemy, damage) };
  }
  function* ailmentHitEffect(env2, enemy, type, ele, dealt) {
    const state = env2.owner.dotFxThrottle || (env2.owner.dotFxThrottle = {});
    const key = `${enemy.id}:${type}`;
    const now = env2.deps.getCombatTime(), previous = Number(state[key] || 0);
    if (dealt > 0 && now - previous >= 240) {
      state[key] = now;
      yield { kind: "addBattleFx", args: ["hit", {
        enemyId: enemy.id,
        color: env2.deps.getElementColor(ele),
        damage: dealt,
        duration: 160,
        element: ele,
        noLine: true,
        dot: true
      }] };
    }
  }
  function storeExpiredAilment(env2, enemy, ail, pStats, previousTime) {
    if (!(previousTime > 0 && ail.time <= 0 && typeof env2.deps.storeExpiredTalentAilmentSeed === "function")) return;
    const remaining = hitGetEnemyDamageAilmentDps(env2, ail, pStats) * previousTime * Math.max(1, ail.stacks || 1);
    env2.deps.storeExpiredTalentAilmentSeed(enemy, ail, remaining);
  }

  // modules/combat/skill-dot-ticks.mjs
  function* hitTickEnemyDotEffects(env2, pStats, dt) {
    const zone = env2.deps.getZone(env2.owner.currentZoneId);
    const zoneTier = zone && zone.tier || 1;
    const abyssPlayerMul = env2.deps.getAbyssMonsterScales(zone).playerDamageMul || 1;
    const enemies = env2.owner.enemies || [], count = enemies.length;
    for (let i = 0; i < count; i++) {
      if (!(i in enemies)) continue;
      yield* tickSkillDot(env2, enemies[i], pStats, { dt, zoneTier, abyssPlayerMul });
    }
  }
  function* tickSkillDot(env2, enemy, pStats, tick) {
    if (!enemy || enemy.hp <= 0) return;
    const dot = enemy.dotState && typeof enemy.dotState === "object" ? enemy.dotState : null;
    if (!dot) return;
    const interval = advanceSkillDot(env2, enemy, dot, pStats, tick.dt);
    yield* resolveSkillDotTicks(env2, enemy, dot, pStats, { ...tick, interval });
    if (dot.timeLeft <= 0 || enemy.hp <= 0) clearExpiredSkillDot(enemy);
  }
  function advanceSkillDot(env2, enemy, dot, pStats, dt) {
    dot.timeLeft = Math.max(0, (dot.timeLeft || 0) - dt);
    const interval = Math.max(0.02, Number(dot.tickInterval) || env2.deps.DOT_TICK_INTERVAL);
    hitSyncEnemyFlameDecayAilment(env2, enemy, dot, pStats);
    dot.tickTimer = (dot.tickTimer || interval) - dt;
    return interval;
  }
  function* resolveSkillDotTicks(env2, enemy, dot, pStats, tick) {
    while (dot.tickTimer <= 0 && dot.timeLeft > 0 && enemy.hp > 0) {
      dot.tickTimer += tick.interval;
      if (yield* applySkillDotTick(env2, enemy, dot, pStats, tick)) break;
    }
  }
  function* applySkillDotTick(env2, enemy, dot, pStats, tick) {
    const ele = dot.ele || "chaos";
    const enemyRes = env2.deps.getEffectiveEnemyMitigation(ele, tick.zoneTier, enemy, pStats);
    let damage = Math.max(1, Math.floor((dot.rawTickDamage || 1) * (1 - enemyRes / 100)));
    damage = Math.floor(Math.max(1, Math.floor(damage * tick.abyssPlayerMul)) * env2.deps.loopMutation.takenMul(enemy, ele));
    const dealt = env2.deps.applyDamageToEnemyResource(enemy, damage);
    yield { kind: "addBattleFx", args: ["hit", {
      enemyId: enemy.id,
      color: env2.deps.getElementColor(ele),
      damage: dealt,
      duration: 240,
      element: ele,
      noLine: true,
      dot: true
    }] };
    if (enemy.hp <= 0) {
      if (ele === "chaos") enemy.lastHitElement = "chaos";
      env2.deps.handleEnemyDeath(enemy, pStats);
      return true;
    }
    return false;
  }
  function clearExpiredSkillDot(enemy) {
    enemy.dotState = null;
    enemy.dotStacks = 0;
    enemy.skillSlowPct = 0;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter((ail) => ail && ail.type !== "flameDecay") : [];
  }

  // modules/combat/crowd-pause.mjs
  function* hitSyncCrowdPauseState(env2) {
    let paused = hitIsCrowdProgressPaused(env2);
    if (paused === env2.runtime.crowdPauseActive) return paused;
    env2.runtime.crowdPauseActive = paused;
    if (env2.owner.settings.showCrowdPauseLog !== false) {
      if (paused) yield { kind: "addLog", args: [env2.deps._t("⛔ 적이 {ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 맵 진행이 멈췄습니다. 적 수를 줄이면 다시 전진합니다.", { ENEMY_CROWD_PAUSE_LIMIT: env2.deps.ENEMY_CROWD_PAUSE_LIMIT }), "attack-monster"] };
      else yield { kind: "addLog", args: [env2.deps._t("🧭 적 숫자가 줄어 맵 진행을 재개합니다."), "loot-normal"] };
    }
    return paused;
  }
  function hitIsCrowdProgressPaused(env2) {
    if (env2.owner.moveTimer > 0) return false;
    if (env2.deps.actExplorationDoors.stageMap(env2.deps.actExplorationState.current(env2.owner))) return false;
    return (env2.owner.enemies || []).filter((enemy) => enemy.hp > 0).length >= env2.deps.ENEMY_CROWD_PAUSE_LIMIT;
  }

  // modules/combat/woodsman-curse.mjs
  function hitResetWoodsmanCurse(env2) {
    env2.owner.woodsmanCurseActive = false;
    env2.owner.woodsmanCurseDamageTakenStacks = 0;
    env2.owner.woodsmanCurseLastTickAt = 0;
    env2.owner.woodsmanCurseNextLogStack = 0;
  }
  function* hitStartWoodsmanCurse(env2) {
    env2.owner.woodsmanCurseActive = true;
    env2.owner.woodsmanCurseDamageTakenStacks = 0;
    env2.owner.woodsmanCurseLastTickAt = env2.deps.getCombatTime();
    env2.owner.woodsmanCurseNextLogStack = 100;
    yield { kind: "addLog", args: [env2.deps._t("🪓 나무꾼의 저주: 전투가 끝날 때까지 매초 받는 피해가 0.01%씩 증가합니다."), "attack-monster"] };
  }
  function* hitTickWoodsmanCurse(env2) {
    let zone = env2.deps.getZone(env2.owner.currentZoneId);
    if (!zone || zone.type !== "outsideChaos" || !env2.owner.woodsmanCurseActive) return;
    let now = env2.deps.getCombatTime();
    env2.owner.woodsmanCurseLastTickAt = Number.isFinite(env2.owner.woodsmanCurseLastTickAt) && env2.owner.woodsmanCurseLastTickAt > 0 ? env2.owner.woodsmanCurseLastTickAt : now;
    let elapsed = now - env2.owner.woodsmanCurseLastTickAt;
    if (elapsed < 1e3) return;
    let ticks = Math.floor(elapsed / 1e3);
    env2.owner.woodsmanCurseLastTickAt += ticks * 1e3;
    env2.owner.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(env2.owner.woodsmanCurseDamageTakenStacks || 0)) + ticks;
    yield* notifyWoodsmanCurseStacks(env2);
  }
  function* notifyWoodsmanCurseStacks(env2) {
    if (env2.owner.settings && env2.owner.settings.showCombatLog !== false && env2.owner.woodsmanCurseDamageTakenStacks >= Math.max(100, Math.floor(env2.owner.woodsmanCurseNextLogStack || 100))) {
      yield { kind: "addLog", args: [env2.deps._t("🪓 나무꾼의 저주 중첩: 받는 피해 +{value}%", { value: (env2.owner.woodsmanCurseDamageTakenStacks * 0.01).toFixed(2) }), "attack-monster", { noToast: true }] };
      env2.owner.woodsmanCurseNextLogStack = Math.floor(env2.owner.woodsmanCurseDamageTakenStacks / 100 + 1) * 100;
    }
  }
  function hitGetWoodsmanCurseDamageTakenMul(env2) {
    let zone = env2.deps.getZone(env2.owner.currentZoneId);
    if (!zone || zone.type !== "outsideChaos" || !env2.owner.woodsmanCurseActive) return 1;
    return 1 + Math.max(0, Math.floor(env2.owner.woodsmanCurseDamageTakenStacks || 0)) * 1e-4;
  }

  // modules/combat/cosmos-astra-stance.mjs
  function* hitApplyCosmosAstraStance(env2, enemy) {
    if (!enemy || !enemy.astraBase) return;
    let base = enemy.astraBase;
    let idx = Math.floor(env2.deps.getCombatTime() / COSMOS_ASTRA_STANCE_CYCLE_MS) % COSMOS_ASTRA_STANCES.length;
    let stance = COSMOS_ASTRA_STANCES[idx];
    if (enemy.astraStanceIdx !== idx) {
      enemy.astraStanceIdx = idx;
      yield { kind: "addLog", args: [env2.deps._t("🌌 아스트라의 표식이 바뀝니다: {name}", { name: env2.deps._t(stance.name) }), "attack-monster", { noToast: true }] };
    }
    applyStanceDefenses(enemy, base, stance);
    applyStanceOffense(enemy, base, stance);
  }
  function applyStanceDefenses(enemy, base, stance) {
    enemy.ele = stance.ele || enemy.ele;
    enemy.dr = Math.min(90, base.dr + (stance.drAdd || 0));
    enemy.armor = Math.floor(base.armor * (stance.armorMul || 1));
    enemy.evasion = Math.floor(base.evasion * (stance.evasionMul || 1));
    let resAdd = stance.resAllAdd || 0;
    enemy.resF = Math.min(95, base.resF + resAdd);
    enemy.resC = Math.min(95, base.resC + resAdd);
    enemy.resL = Math.min(95, base.resL + resAdd);
    enemy.resChaos = Math.min(95, base.resChaos + resAdd + (stance.resChaosAdd || 0));
  }
  function applyStanceOffense(enemy, base, stance) {
    enemy.penetration = base.penetration + (stance.penetrationAdd || 0);
    enemy.critChance = base.critChance + (stance.critChanceAdd || 0);
    enemy.atkMul = base.atkMul * (stance.atkMulMul || 1);
    enemy.attackSpeedVar = base.attackSpeedVar * (stance.attackSpeedVarMul || 1);
    enemy.regenRate = base.regenRate * (stance.regenMul || 1);
  }

  // modules/domain/boss-regen-readiness.mjs
  function hitGetMapBossRequiredDps(env2, bossHp, clearTimeSec, regenRate) {
    const duration = Math.max(1, Number(clearTimeSec) || 1);
    const recoveryPerSecond = Math.max(0, Number(regenRate) || 0) * (1e3 / env2.deps.ENEMY_REGEN_STEP_MS);
    const fatigueSec = env2.deps.ENEMY_REGEN_FATIGUE_MS / 1e3;
    const averageRegen = duration <= fatigueSec ? 1 - duration / (2 * fatigueSec) : fatigueSec / (2 * duration);
    return bossHp / duration + bossHp * recoveryPerSecond * averageRegen;
  }

  // modules/combat/encounter-telemetry.mjs
  var contextReaders = /* @__PURE__ */ Object.freeze({
    beehive: (owner) => ({ branch: Math.max(1, Math.floor(Number(owner.beehive && owner.beehive.branchStep) || 1)) }),
    colony: (owner) => ({ wave: Math.max(1, Math.floor(Number(owner.colony && owner.colony.wave) || 1)) }),
    timeRift: (owner, zone) => ({ phase: zone.riftPhase || "unknown", pressure: Math.max(0, Math.floor(Number(zone.pressure) || 0)) }),
    meteor: (owner, zone) => ({ meteorTier: Math.max(0, Math.floor(Number(zone.meteorTier || zone.tier) || 0)) }),
    trial: (owner, zone) => ({ trialId: String(zone.id || "") }),
    oceanDepth: (owner) => ({ depth: Math.max(0, Math.floor(Number(owner.ocean && owner.ocean.depthM) || 0)) }),
    grandBreach: (owner) => ({ phase: String(owner.voidRift && owner.voidRift.grandRun && owner.voidRift.grandRun.phase || "horde") })
  });
  function effectGetEncounterTelemetryContext(env2, zone) {
    if (!zone) return {};
    const context = { tier: Math.max(0, Math.floor(Number(zone.tier) || 0)) };
    if (env2.owner.voidRift && env2.owner.voidRift.active) context.mode = "voidBreach";
    if (Object.hasOwn(contextReaders, zone.type)) Object.assign(context, contextReaders[zone.type](env2.owner, zone));
    return context;
  }

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/woodsman-phases.mjs
  function effectGetWoodsmanPhaseProgress(env2, enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    let rawProgress = clampNumber(1 - (enemy.hp || 0) / enemy.maxHp, 0, 1);
    if (rawProgress <= env2.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS) {
      return rawProgress * (env2.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS / env2.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS);
    }
    let finalWindow = 1 - env2.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS;
    let finalProgress = (rawProgress - env2.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS) / finalWindow;
    return clampNumber(env2.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS + finalProgress * (1 - env2.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS), 0, 1);
  }
  function effectWoodsmanElementAt(env2, progress) {
    return env2.deps.WOODSMAN_ELEMENTS[Math.max(0, Math.floor(progress / 0.05)) % env2.deps.WOODSMAN_ELEMENTS.length];
  }
  function effectWoodsmanAttackFxElement(env2, enemy) {
    return enemy.isWoodsman && env2.owner.currentZoneId === env2.deps.OUTSIDE_CHAOS_ZONE_ID ? effectWoodsmanElementAt(env2, effectGetWoodsmanPhaseProgress(env2, enemy)) : null;
  }

  // modules/combat/zone-encounter-profiles.mjs
  var encounterProfiles = /* @__PURE__ */ Object.freeze({
    beyondBoundary: encounterForBeyondBoundary,
    cosmos: encounterForCosmos,
    chaosRealm: buildGetChaosRealmEncounterProfile,
    skyTower: encounterForSkyTower,
    underworld: buildGetUnderworldEncounterProfile,
    meteor: encounterForMeteor,
    trial: encounterForTrial,
    timeRift: encounterForTimeRift,
    seasonBoss: encounterForSeasonBoss,
    labyrinth: buildGetLabyrinthEncounterProfile,
    abyss: buildGetAbyssEncounterProfile,
    oceanDepth: encounterForOceanDepth
  });
  function buildGetZoneEncounterProfile(env2, zone) {
    if (Object.hasOwn(encounterProfiles, zone.type)) return encounterProfiles[zone.type](env2, zone);
    let minPack = 1;
    let zoneIdNum = Number.isFinite(zone.id) ? zone.id : Number(zone.tier) || 1;
    let maxPack = Math.min(3, 1 + Math.floor((zoneIdNum + 2) / 3));
    return {
      markerCount: 3 + Math.floor(zone.tier * 0.8),
      minPack,
      maxPack,
      eliteChance: 0.05 + zone.tier * 0.015,
      bossAdds: zone.tier >= 4 ? 1 : 0,
      label: env2.deps._t("{minPack}-{maxPack}기", { minPack, maxPack })
    };
  }
  function encounterForBeyondBoundary(env2, zone) {
    let difficulty = Math.max(1, Math.floor(Number(zone.boundaryDifficultyTier) || Number(zone.boundaryTier) || 1));
    let displayTier = Math.max(1, Math.floor(Number(zone.boundaryTier) || 1));
    return {
      markerCount: Math.min(8, 3 + Math.floor(difficulty / 20)),
      minPack: 2,
      maxPack: Math.min(7, 3 + Math.floor(difficulty / 12)),
      eliteChance: Math.min(0.65, 0.2 + difficulty * 8e-3),
      bossAdds: Math.min(4, Math.floor(difficulty / 15)),
      label: env2.deps._t("경계 너머 {displayTier}단계", { displayTier })
    };
  }
  function encounterForCosmos(env2, zone) {
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    let markerCount = Math.max(4, Math.min(12, 4 + sizeClass + Math.floor((gravity - 1) * 4)));
    let minPack = Math.max(2, Math.min(6, 2 + Math.floor(sizeClass / 2)));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor((gravity - 1) * 2)));
    return env2.deps.cosmosRouteRuntime.encounterProfile(zone, { markerCount, minPack, maxPack, eliteChance: Math.min(0.75, 0.16 + sizeClass * 0.05), bossAdds: 2 + Math.floor(sizeClass / 2), label: zone.name || "우주계" });
  }
  function encounterForSkyTower(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(9, 2 + Math.floor(floor / 10));
    let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 18));
    return { markerCount: 40 + Math.floor(floor / 3), minPack, maxPack: Math.max(minPack, maxPack), eliteChance: Math.min(0.5, 0.18 + floor * 6e-3), bossAdds: 2 + Math.floor(floor / 12), label: env2.deps._t("창공의 탑 {floor}층", { floor }) };
  }
  function encounterForMeteor(env2) {
    return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 0.5, bossAdds: 0, label: env2.deps._t("운석") };
  }
  function encounterForTrial(env2) {
    return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: env2.deps._t("시련") };
  }
  function encounterForTimeRift(env2, zone) {
    let pressure = Math.max(1, Math.floor(zone.pressure || 1));
    return { markerCount: 3 + Math.floor(pressure / 3), minPack: 2, maxPack: Math.min(6, 3 + Math.floor(pressure / 4)), eliteChance: Math.min(0.8, 0.3 + pressure * 0.05), bossAdds: 1 + Math.floor(pressure / 5), label: env2.deps._t("시간의 균열 (시간압 {pressure})", { pressure }) };
  }
  function encounterForSeasonBoss(env2) {
    return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: env2.deps._t("보스") };
  }
  function encounterForOceanDepth(env2, zone) {
    let depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    let minPack = Math.min(6, 2 + Math.floor(depthTier / 4));
    let maxPack = Math.min(8, minPack + 2);
    return {
      markerCount: 4 + Math.floor(depthTier * 0.5),
      minPack,
      maxPack,
      eliteChance: Math.min(0.4, 0.08 + depthTier * 0.01),
      bossAdds: 0,
      label: zone.name || "심해"
    };
  }
  function buildGetChaosRealmEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    return {
      markerCount: Math.min(16, 4 + Math.floor(floor / 8)),
      minPack: 2,
      maxPack: Math.min(8, 3 + Math.floor(floor / 6)),
      eliteChance: 0.35,
      bossAdds: Math.min(6, 2 + Math.floor(floor / 12)),
      label: env2.deps._t("혼돈계 {floor}층", { floor })
    };
  }
  function buildGetUnderworldEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 3 + Math.floor(floor / 12));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor(floor / 20)));
    return {
      markerCount: Math.min(16, 5 + Math.floor(floor / 8)),
      minPack,
      maxPack,
      eliteChance: Math.min(0.55, 0.2 + floor * 0.012),
      bossAdds: Math.min(6, 2 + Math.floor(floor / 20)),
      label: env2.deps._t("지하계 {floor}층", { floor })
    };
  }
  function buildGetLabyrinthEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 2 + Math.floor(floor / 10));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2));
    return {
      markerCount: Math.min(18, 5 + Math.floor(floor / 5)),
      minPack,
      maxPack,
      eliteChance: Math.min(0.46, 0.14 + floor * 9e-3),
      bossAdds: floor % 5 === 0 ? 2 : 1,
      label: env2.deps._t("미궁 {floor}층", { floor })
    };
  }
  function buildGetAbyssEncounterProfile(env2, zone) {
    let scale = env2.deps.getAbyssMonsterScales(zone);
    let depth = Math.max(1, Math.floor(zone.depth || env2.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    let minPack = Math.max(1, Math.floor((2 + Math.floor(zone.tier / 7)) * (scale.hordeMul || 1)));
    let maxPack = Math.max(minPack, Math.floor(Math.min(10, 4 + Math.floor(zone.tier * 0.42)) * (scale.hordeMul || 1)));
    let markerCount = Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (scale.mapLengthMul || 1)));
    let bossAdds = 2 + Math.floor(zone.tier / 4);
    if (depth >= 21) {
      minPack = Math.min(7, minPack);
      maxPack = Math.max(minPack, Math.min(11, maxPack));
      markerCount = Math.min(20, markerCount);
      bossAdds = Math.min(7, bossAdds);
    }
    return {
      markerCount,
      minPack,
      maxPack,
      eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (scale.eliteBonus || 0)),
      bossAdds,
      label: env2.deps._t("{minPack}-{maxPack}기", { minPack, maxPack })
    };
  }

  // modules/combat/encounter-plans.mjs
  function effectGetEncounterDifficultyValue(zone) {
    if (!zone) return 1;
    if (Number.isFinite(zone.floor)) return Math.max(1, Math.floor(zone.floor));
    if (Number.isFinite(zone.depthTier)) return Math.max(1, Math.floor(zone.depthTier));
    if (Number.isFinite(zone.pressure)) return Math.max(1, Math.floor(zone.pressure));
    return Math.max(1, Math.floor(Number(zone.tier) || Number(zone.id) || 1));
  }
  function effectGetFrequentSpawnEncounterProfile(env2, zone) {
    let profile = { ...buildGetZoneEncounterProfile(env2, zone) };
    let difficulty = effectGetEncounterDifficultyValue(zone);
    if (difficulty >= 8 && profile.markerCount > 0) {
      let ramp = clampNumber((difficulty - 8) / 24, 0, 1);
      let markerCap = 20;
      let baseMarkerCount = profile.markerCount;
      if (profile.markerCount < markerCap) {
        let targetMarkers = Math.round(profile.markerCount * (1.35 + ramp * 1.35));
        profile.markerCount = clampNumber(targetMarkers, profile.markerCount + 1, markerCap);
      }
      if (profile.markerCount > baseMarkerCount) {
        let packMul = 1 - ramp * 0.25;
        profile.minPack = Math.max(1, Math.floor(profile.minPack * packMul));
        profile.maxPack = Math.max(profile.minPack, Math.floor(profile.maxPack * packMul));
      }
    }
    if (zone.type === "underworld") profile.markerCount = Math.max(1, Math.floor(profile.markerCount * 0.5));
    return profile;
  }
  function effectGenerateChaosRealmEncounterPlan(env2, zone) {
    const profile = buildGetZoneEncounterProfile(env2, zone);
    return [
      { at: 28, count: profile.minPack + 1, elite: true },
      { at: 62, count: profile.maxPack, elite: true },
      { at: 100, count: 1 + profile.bossAdds, boss: true }
    ];
  }
  function effectGenerateMeteorEncounterPlan(zone) {
    const tier = Math.max(1, Math.floor(zone.tier || 1));
    return [
      { at: 36, count: 4 + Math.min(2, Math.floor(tier / 20)) },
      { at: 76, count: 2 + Number(tier >= 40), elite: true },
      { at: 100, count: 1 + Math.min(2, Math.floor(tier / 20)), boss: true }
    ];
  }
  function effectGenerateEncounterPlan(env2, zone) {
    if (zone.type === "beyondBoundary") return boundaryEncounterPlan(env2, zone);
    if (zone.type === "cosmos") return cosmosEncounterPlan(env2, zone);
    if (zone.type === "meteor") return effectGenerateMeteorEncounterPlan(zone);
    if (zone.type === "trial") return [{ at: 18, count: 1, elite: true }, { at: 54, count: 2, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.type === "seasonBoss") return [{ at: 100, count: 1, boss: true }];
    if (zone.type === "outsideChaos") return [{ at: 100, count: 1, boss: true }];
    if (zone.type === "chaosRealm") return effectGenerateChaosRealmEncounterPlan(env2, zone);
    if (zone.type === "oceanDepth") return oceanEncounterPlan(env2, zone);
    return ordinaryEncounterPlan(env2, zone);
  }
  function boundaryEncounterPlan(env2, zone) {
    let profile = buildGetZoneEncounterProfile(env2, zone);
    if (zone.boundaryFinalWave) {
      let plan = [{ at: 28, count: profile.minPack, elite: true }, { at: 65, count: profile.maxPack, elite: true }];
      if (profile.bossAdds > 0) plan.push({ at: 86, count: profile.bossAdds, elite: true });
      plan.push({ at: 100, count: 1, boss: true });
      return plan;
    }
    return [{ at: 24, count: profile.minPack }, { at: 58, count: profile.maxPack, elite: true }, { at: 100, count: profile.minPack + 1, elite: true }];
  }
  function cosmosEncounterPlan(env2, zone) {
    let p = buildGetZoneEncounterProfile(env2, zone);
    let plan = [];
    for (let i = 1; i <= p.markerCount; i++) {
      plan.push({
        at: Math.min(98, Math.floor(100 / (p.markerCount + 1) * i)),
        count: p.minPack + Math.floor(Math.random() * Math.max(1, p.maxPack - p.minPack + 1)),
        elite: Math.random() < p.eliteChance
      });
    }
    plan.push({ at: 100, count: 1, boss: true });
    return plan;
  }
  function oceanEncounterPlan(env2, zone) {
    let oceanSt = env2.deps.ensureOceanState();
    if (typeof env2.deps.getOceanPendingBossBoundary === "function" && env2.deps.getOceanPendingBossBoundary(oceanSt) > 0) {
      env2.owner.oceanBossRunPending = true;
      return [{ at: 100, count: 1, boss: true }];
    }
    env2.owner.oceanBossRunPending = false;
    let profile = buildGetZoneEncounterProfile(env2, zone);
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
      let at = clampNumber(Math.floor((i + 1) / (profile.markerCount + 1) * 96), 6, 94);
      let count = profile.minPack + Math.floor(Math.random() * Math.max(1, profile.maxPack - profile.minPack + 1));
      markers.push({ at, count, elite: Math.random() < profile.eliteChance });
    }
    markers.sort((a, b) => a.at - b.at);
    return markers;
  }
  function ordinaryEncounterPlan(env2, zone) {
    let profile = effectGetFrequentSpawnEncounterProfile(env2, zone);
    let rng = zone.type === "act" ? env2.deps.createSeededRng(`act:${zone.id}`) : Math.random;
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
      let at = Math.floor((i + 1) / (profile.markerCount + 1) * 96 + (rng() * 8 - 4));
      let spread = profile.maxPack - profile.minPack;
      let count = profile.minPack + Math.floor(Math.pow(rng(), 0.78) * (spread + 1));
      markers.push({
        at: clampNumber(at, 6, 94),
        count: clampNumber(count, profile.minPack, profile.maxPack),
        elite: rng() < profile.eliteChance
      });
    }
    markers.push({ at: 100, count: 1 + profile.bossAdds, boss: true });
    markers.sort((a, b) => a.at - b.at);
    return markers;
  }

  // modules/data/enemy-entry-tuning.mjs
  var ENTRY_BOSS_EASING = /* @__PURE__ */ Object.freeze({
    underworld: /* @__PURE__ */ Object.freeze([/* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.74 })]),
    skyTower: /* @__PURE__ */ Object.freeze([
      /* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.3 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.85, damage: 0.45 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.89, damage: 0.6 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.92, damage: 0.75 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.96, damage: 0.9 })
    ])
  });
  var UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER = 0.85;
  var UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER = 0.82;

  // modules/domain/enemy-content-difficulty.mjs
  function buildIsUnderworldEntryBenchmark(zone) {
    return !!zone && zone.difficultyBenchmark === "underworld1";
  }
  function buildGetDifficultyBenchmarkProfile(zone) {
    const benchmark = String(zone && zone.difficultyBenchmark || "");
    if (benchmark === "rival31") return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === "underworld1") return { hp: 5, damage: 0.78, attackRate: 0.76, clearTimeSec: 24 };
    if (benchmark === "underworld30") return { hp: 5 * (1 + 29 * 0.045), damage: 0.78, attackRate: 0.76, clearTimeSec: 30 };
    if (benchmark === "ocean1000") return { hp: 5 * (1 + 10 * 0.05), damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === "sky30") return { hp: 4.2 * (1 + 29 * 0.035), damage: 1.08, attackRate: 1.05, clearTimeSec: 30 };
    if (benchmark === "cosmosFinal") return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 45 };
    return null;
  }
  function buildGetEntryBossTuning(zone, isBoss) {
    if (!isBoss || !zone) return { hp: 1, damage: 1 };
    if (buildIsUnderworldEntryBenchmark(zone)) {
      return { hp: UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, damage: UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER };
    }
    const floors = Object.hasOwn(ENTRY_BOSS_EASING, zone.type) ? ENTRY_BOSS_EASING[zone.type] : [];
    return floors[Math.max(1, Math.floor(Number(zone.floor) || 1)) - 1] || { hp: 1, damage: 1 };
  }
  function buildGetUnderworldEnemyDamageMultiplier(env2, zone) {
    if (!zone || zone.type !== "underworld") return 1;
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    let mediumStart = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.flatDamageThroughFloor;
    let deepStart = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamageThroughFloor;
    let deepEnd = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
    let mediumFloors = Math.min(Math.max(0, floor - mediumStart), deepStart - mediumStart);
    let deepFloors = Math.min(Math.max(0, floor - deepStart), deepEnd - deepStart);
    return 1 + mediumFloors * env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamagePerFloor + deepFloors * env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamagePerFloor;
  }
  function buildResolveMapEstimateContentScale(env2, zone) {
    const benchmark = buildGetDifficultyBenchmarkProfile(zone);
    if (benchmark) return benchmarkContentScale(zone, benchmark);
    let scale = { hp: 1, damage: 1, clearTimeSec: 24 };
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    if (zone.type === "act") scale.clearTimeSec = 18;
    if (zone.type === "chaosRealm") scale.hp = 5 * (1 + (floor - 1) * 0.06);
    if (zone.type === "underworld") {
      scale.hp = 5 * (1 + (floor - 1) * 0.045);
      scale.damage = 0.78 * buildGetUnderworldEnemyDamageMultiplier(env2, zone);
    }
    if (zone.type === "oceanDepth") scale.hp = 5 * (1 + Math.max(0, Math.floor(zone.depthTier || 0)) * 0.05);
    applyChallengeEstimateScale(env2, zone, scale);
    return scale;
  }
  function benchmarkContentScale(zone, benchmark) {
    return {
      hp: benchmark.hp * (zone.type === "beyondBoundary" ? Math.max(1, Number(zone.boundaryHpMul) || 1) : 1),
      damage: benchmark.damage * (zone.type === "beyondBoundary" ? Math.max(1, Number(zone.boundaryDamageMul) || 1) : 1),
      clearTimeSec: benchmark.clearTimeSec
    };
  }
  function applyChallengeEstimateScale(env2, zone, scale) {
    if (zone.type === "timeRift" || zone.type === "seasonBoss") scale.clearTimeSec = 30;
    if (zone.type === "beehive") scale.clearTimeSec = 30;
    if (zone.type === "colony") {
      scale.hp = 3.4;
      scale.damage = 1.45;
    }
    if (zone.type === "grandBreach") scale.clearTimeSec = 35;
    if (zone.type === "cosmos") {
      const galaxyBoss = typeof env2.deps.getCosmosGalaxyBossMechanic === "function" && !!env2.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId);
      scale.clearTimeSec = galaxyBoss ? 55 : 40;
    }
  }

  // modules/domain/enemy-loop-difficulty.mjs
  function buildGetSoftenedLoopDepth(depth) {
    let d = Math.max(0, depth || 0);
    const knee = 19;
    if (d <= knee) return d;
    return knee + (d - knee) * 0.5;
  }
  function buildGetLoopDifficultyInputs(env2, zone) {
    const fixed = buildGetFixedLoopDifficultyInputs(zone);
    if (fixed) return fixed;
    let exempt = !!zone && (zone.type === "trial" || zone.type === "outsideChaos" || !!zone.loopScaleExempt);
    if (exempt) return { exempt: true, seasonLoops: 0, loopCount: 0 };
    let cap = buildGetLoopScaleCap(env2, zone);
    return {
      exempt: false,
      seasonLoops: Math.min(cap, Math.max(0, (env2.owner.season || 1) - 1)),
      loopCount: Math.min(cap, Math.max(0, Math.floor(env2.owner.loopCount || 0)))
    };
  }
  function buildGetLoopScaleCap(env2, zone) {
    if (!zone) return Infinity;
    if (zone.type === "act") return env2.deps.ACT_LOOP_SCALE_CAP;
    if (zone.type === "abyss") return env2.deps.ACT_LOOP_SCALE_CAP + env2.deps.getAbyssDepthFromZoneId(zone.id) * env2.deps.CHAOS_LOOP_RAMP_PER_DEPTH;
    return zone.type === "cosmos" ? 30 : Infinity;
  }
  function buildGetFixedLoopDifficultyInputs(zone) {
    if (buildGetDifficultyBenchmarkProfile(zone)) return { exempt: false, seasonLoops: 30, loopCount: 30 };
    if (!zone || !Number.isFinite(zone.fixedSeason)) return null;
    const loops = Math.max(0, Math.floor(zone.fixedSeason) - 1);
    return { exempt: false, seasonLoops: loops, loopCount: loops };
  }
  function buildGetMonsterLoopGrowthScale(env2, zone, kind, seasonDepth, tierShare) {
    const growth = (zone && zone.type === "cosmos" ? env2.deps.MONSTER_LOOP_GROWTH.fixed : env2.deps.MONSTER_LOOP_GROWTH)[kind];
    return 1 + seasonDepth * (growth.base + tierShare * growth.tier);
  }
  function buildIsCosmosLadderZone(zone) {
    return !!zone && (zone.type === "cosmos" || zone.difficultyBenchmark === "cosmosFinal");
  }
  function buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress) {
    if (buildIsCosmosLadderZone(zone)) {
      return buildGetMonsterLoopGrowthScale(env2, zone, "hp", buildGetSoftenedLoopDepth(loopInputs.seasonLoops), tierProgress) * buildGetLoopHpScale(loopInputs.loopCount) * buildGetMonsterLoopPowerScale(env2, zone, "hp");
    }
    if (loopInputs.exempt) return buildGetMonsterLoopPowerScale(env2, zone, "hp");
    return buildInterpolateLoopCurve(env2.deps.MONSTER_LOOP_HP_CURVE, loopInputs.seasonLoops + 1);
  }
  function buildGetBossHpEase(env2, tier, loopMul) {
    const loopShare = loopMul > 1 ? (1 + (loopMul - 1) * env2.deps.BOSS_LOOP_HP_SHARE) / loopMul : 1;
    return loopShare * buildInterpolateLoopCurve(env2.deps.BOSS_TIER_HP_EASE, Number(tier) || 1);
  }
  function buildGetEliteLoopHpMultiplier(zone, loopCount) {
    const share = buildGetSoftenedLoopDepth(loopCount) * 0.05;
    return 1.4 + (buildIsCosmosLadderZone(zone) ? share : Math.min(0.3, share));
  }
  function buildGetMonsterLoopPowerScale(env2, zone, kind) {
    const inputs = buildGetLoopDifficultyInputs(env2, zone);
    const loop = inputs.exempt ? Math.max(1, Math.floor(env2.owner.season || 1)) : inputs.seasonLoops + 1;
    return buildInterpolateLoopCurve(env2.deps.MONSTER_LOOP_POWER_SCALE[kind], loop);
  }
  function buildInterpolateLoopCurve(points, loop) {
    if (!Array.isArray(points) || !points.length) return 1;
    if (loop <= points[0][0]) return points[0][1];
    const next = points.findIndex((point) => loop <= point[0]);
    if (next < 0) return points[points.length - 1][1];
    const [x0, y0] = points[next - 1], [x1, y1] = points[next];
    return y0 + (y1 - y0) * (loop - x0) / (x1 - x0);
  }
  function buildGetLoopHpScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
      { upTo: 1, rate: 0.12 },
      { upTo: 10, rate: 0.1 },
      { upTo: 20, rate: 0.08 },
      { upTo: 40, rate: 0.04 },
      { upTo: 100, rate: 0.018 },
      { upTo: Infinity, rate: 6e-3 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
      scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
      prevBound = band.upTo;
      if (loop <= band.upTo) break;
    }
    return scale;
  }

  // modules/combat/map-threat-estimate.mjs
  function effectGetMapBossPatternMultiplier(env2, bossMods, zone) {
    let fixedMode = String(bossMods && bossMods.patternMode || "");
    let cosmosBossMechanic = fixedMode === "cosmosBoss" && typeof env2.deps.getCosmosGalaxyBossMechanic === "function" ? env2.deps.getCosmosGalaxyBossMechanic(zone && zone.cosmosNodeId) : null;
    return cosmosBossMechanic ? Math.max(1, Number(cosmosBossMechanic.damageMul) || 1) : fixedMode ? env2.deps.getBossPatternPeakDamageMultiplier(fixedMode) : env2.deps.getMaximumBossPatternDamageMultiplierForLoop(env2.owner.season || 1);
  }
  function effectGetMapEstimateDamageElements(env2, zone) {
    const cosmosBoss = zone && zone.type === "cosmos" && typeof env2.deps.getCosmosGalaxyBossMechanic === "function" ? env2.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    const fixed = cosmosBoss && cosmosDamageElements(cosmosBoss.elementRule);
    if (fixed) return fixed;
    return zone && zone.ele === "chaos" ? ["fire", "cold", "light", "chaos"] : ["phys", "fire", "cold", "light", "chaos"];
  }
  function cosmosDamageElements(rule) {
    if (rule === "physical") return ["phys"];
    if (rule === "chaos") return ["chaos"];
    if (rule === "weakestResistance") return ["fire", "cold", "light", "chaos"];
    if (rule === "alternatingWeakest") return ["phys", "fire", "cold", "light", "chaos"];
    return null;
  }
  function effectGetMapEstimateAffixPressure(env2, zone) {
    const sourceFloor = zone && (zone.bloomTrialAffixFloor || zone.type === "chaosRealm" && zone.floor);
    const floor = Math.max(0, Math.floor(Number(sourceFloor) || 0));
    const result = { penetration: 0, critChance: 0, critDamageMul: env2.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER, attackRateMul: 1, doubleStrikeChance: 0 };
    if (floor <= 0 || typeof env2.deps.getChaosRealmAffixes !== "function") return result;
    env2.deps.getChaosRealmAffixes(floor).forEach((affix) => {
      const scale = Number(affix.scale) || (typeof env2.deps.getChaosRealmAffixScale === "function" ? env2.deps.getChaosRealmAffixScale(floor) : 1);
      if (affix.id === "curse_blade") {
        result.attackRateMul *= 1.18 + floor * 6e-3;
        result.penetration += Math.floor(8 * scale);
      }
      if (affix.id === "deadly_crit") {
        result.critChance += Math.floor(18 * scale);
        result.critDamageMul = Math.max(result.critDamageMul, 1.95 + floor * 0.01);
      }
      if (affix.id === "multi_strike") result.doubleStrikeChance = Math.max(result.doubleStrikeChance, Math.min(45, 18 + floor * 0.6));
      if (affix.id === "deep_penetration") result.penetration += Math.floor(18 * scale);
    });
    return result;
  }
  function effectGetMapEstimateThreatProfile(env2, zone, bossMods, input) {
    const { baseHit, seasonDepth, tier } = input;
    const affix = effectGetMapEstimateAffixPressure(env2, zone);
    const contentAttackRateMul = contentAttackRate(zone);
    const critChance = Math.max(0, ((env2.owner.season || 1) >= 2 ? 16 : 0) + Number(bossMods.critChanceBonus || 0) + affix.critChance);
    const critDamageMul = Math.max(env2.deps.ENEMY_CRITICAL_DAMAGE_MULTIPLIER, affix.critDamageMul);
    const peakHit = baseHit * effectGetMapBossPatternMultiplier(env2, bossMods, zone) * (critChance > 0 ? critDamageMul : 1);
    const attackRate = estimatedAttackRate(zone, bossMods, { seasonDepth, tier, affix, contentAttackRateMul });
    const followUpHits = Math.max(0, Math.min(2, attackRate * 2.5 - 1.5));
    const averageCritMul = 1 + Math.min(1, critChance / 100) * (critDamageMul - 1);
    return {
      peakHit,
      threatWindow: peakHit + baseHit * averageCritMul * (followUpHits + affix.doubleStrikeChance / 100),
      resistancePressure: estimatedResistancePressure(env2.owner, zone, bossMods, affix)
    };
  }
  function contentAttackRate(zone) {
    const benchmark = buildGetDifficultyBenchmarkProfile(zone);
    return benchmark ? benchmark.attackRate : zone.type === "underworld" ? 0.76 : zone.type === "skyTower" ? 1.05 : 1;
  }
  function estimatedAttackRate(zone, bossMods, input) {
    const { seasonDepth, tier, affix, contentAttackRateMul } = input;
    const tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    return (0.26 + tier * 0.013) * 1.1 * (1 + seasonDepth * (0.012 + tierPressure * 0.018)) * 1.16 * 1.18 * Math.max(0.1, Number(bossMods.atkMul || 1)) * Math.max(0.1, Number(bossMods.attackSpeedMul || 1)) * affix.attackRateMul * contentAttackRateMul * (zone.type === "beyondBoundary" ? Math.max(1, Number(zone.boundaryAttackSpeedMul) || 1) : 1);
  }
  function estimatedResistancePressure(owner, zone, bossMods, affix) {
    return ((owner.season || 1) >= 4 ? 14 : 0) + Math.max(0, Number(bossMods.penetration || 0)) + affix.penetration + (zone.type === "beyondBoundary" ? Math.max(0, Number(zone.boundaryPenetrationBonus) || 0) : 0);
  }
  function effectGetMapEstimateZonePenalties(zone) {
    const underworldGravityFloor = Math.max(0, Math.floor(Number(
      zone.type === "underworld" ? zone.floor : zone.underworldPenaltyFloor
    ) || 0));
    return {
      underworldGravityFloor,
      underworldLifeDrainFloor: zone.type === "underworld" ? underworldGravityFloor : 0,
      underworldGravityIgnoresReduction: false,
      oceanPressureDepthTier: Math.max(0, Math.floor(Number(zone.oceanPressureDepthTier) || 0))
    };
  }
  function effectGetMapEstimateThreatMods(bossMods, cosmosTrait) {
    return cosmosTrait ? {
      ...bossMods,
      penetration: Number(bossMods.penetration || 0) + Number(cosmosTrait.penetration || 0),
      atkMul: Number(bossMods.atkMul || 1) * Number(cosmosTrait.atkMul || 1),
      attackSpeedMul: Number(bossMods.attackSpeedMul || 1) * Number(cosmosTrait.attackSpeedVarMul || 1)
    } : bossMods;
  }

  // modules/combat/atlas-pack-estimate.mjs
  function effectGetAtlasPackReadiness(env2, zone, baseHp, bossEstimate) {
    if (zone.type !== "atlasMap") return bossEstimate;
    const pack = 3 + zone.packExtra;
    const tier = env2.deps.levelProgression.combatZone(zone).tier;
    const loops = buildGetLoopDifficultyInputs(env2, zone);
    const depth = buildGetSoftenedLoopDepth(loops.seasonLoops);
    const rank = { hp: buildGetEliteLoopHpMultiplier(zone, loops.loopCount), hit: 1.28, crit: 10, rate: 1.16, pressure: 8 };
    const loop = env2.owner.season || 1;
    const hp = baseHp * buildResolveMapEstimateContentScale(env2, zone).hp * 0.92 * rank.hp * (zone.mapHpMul || 1);
    const affix = effectGetMapEstimateAffixPressure(env2, zone);
    const hit = env2.deps.getMonsterBaseHitDamage(zone, depth, clampNumber((tier - 1) / 10, 0, 1), null) * rank.hit * (zone.mapDamageMul || 1);
    const critChance = (loop >= 2 ? rank.crit : 0) + affix.critChance;
    const peak = hit * (critChance > 0 ? affix.critDamageMul : 1);
    const rate = (0.26 + tier * 0.013) * 1.1 * (1 + depth * (0.012 + clampNumber((tier - 1) / 10, 0, 1) * 0.018)) * rank.rate * 1.03 * affix.attackRateMul;
    const hits = Math.max(1, Math.ceil(rate * 2.5)) * pack;
    return {
      ...bossEstimate,
      dps: Math.max(bossEstimate.dps, Math.round(hp * pack / bossEstimate.clearTimeSec)),
      peakHit: Math.max(bossEstimate.peakHit, Math.round(peak)),
      ehp: Math.max(bossEstimate.ehp, Math.round(peak + hit * (hits - 1) * (1 + Math.min(1, critChance / 100) * (affix.critDamageMul - 1)))),
      resistancePressure: (loop >= 4 ? rank.pressure : 0) + affix.penetration,
      basis: "packThreatWindow"
    };
  }

  // modules/combat/enemy-spawn-values.mjs
  var COSMOS_TRAIT_ARCHETYPES = /* @__PURE__ */ Object.freeze({
    critResist: (trait, c) => {
      trait.name = c.name;
      trait.critResistPct = Math.floor((c.isBoss ? 42 : 26) * c.power);
      trait.critDamageResistPct = Math.floor((c.isBoss ? 38 : 22) * c.power);
    },
    critDamageResist: (trait, c) => {
      trait.name = c.name;
      trait.critDamageResistPct = Math.floor((c.isBoss ? 58 : 36) * c.power);
      trait.dr = Math.floor((c.isBoss ? 10 : 6) * c.power);
      trait.armorMul = 1 + (c.isBoss ? 0.85 : 0.55) * c.power;
    },
    comboGuard: (trait, c) => {
      trait.name = c.name;
      trait.hitRateGuard = Math.min(0.28, (c.isBoss ? 0.12 : 0.08) * c.power);
      trait.comboTakenLessPct = Math.min(70, Math.floor((c.isBoss ? 38 : 24) * c.power));
    },
    heavySlow: (trait, c) => {
      trait.name = c.name;
      trait.atkMul = 1 + (c.isBoss ? 0.62 : 0.38) * c.power;
      trait.damageMul = 1 + (c.isBoss ? 0.28 : 0.16) * c.power;
      trait.attackSpeedVarMul = Math.max(0.42, 1 - (c.isBoss ? 0.32 : 0.22) * c.power);
      trait.penetration = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    fast: (trait, c) => {
      trait.name = c.name;
      trait.attackSpeedVarMul = 1 + (c.isBoss ? 0.55 : 0.34) * c.power;
      trait.critChanceBonus = Math.floor((c.isBoss ? 12 : 7) * c.power);
      trait.evasionChance = Math.floor((c.isBoss ? 18 : 10) * c.power);
    },
    energyShield: (trait, c) => {
      const esPct = Math.min(100, Math.max(50, Math.floor(50 + Math.abs(c.seed || 0) % 51 + (c.isBoss ? 18 : 0))));
      trait.name = `${c.name} ${esPct}%`;
      trait.energyShieldPct = esPct;
      trait.resAll = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    evasion: (trait, c) => {
      trait.name = c.name;
      trait.evasionMul = 1 + (c.isBoss ? 1.65 : 1.05) * c.power;
      trait.evasionChance = Math.min(72, Math.floor((c.isBoss ? 42 : 28) * c.power));
    },
    armor: (trait, c) => {
      trait.name = c.name;
      trait.armorMul = 1 + (c.isBoss ? 2.2 : 1.35) * c.power;
      trait.armorGuard = Math.min(0.72, (c.isBoss ? 0.36 : 0.24) * c.power);
      trait.dr = Math.floor((c.isBoss ? 14 : 8) * c.power);
    }
  });
  var COSMOS_BOSS_DEBUFF_SETS = /* @__PURE__ */ Object.freeze({
    critResist: ["cosmos_res_down", "cosmos_aspd_down"],
    critDamageResist: ["cosmos_regen_down", "cosmos_res_down"],
    comboGuard: ["cosmos_aspd_down", "cosmos_leech_down"],
    heavySlow: ["cosmos_res_down", "cosmos_regen_down"],
    fast: ["cosmos_aspd_down", "cosmos_leech_down"],
    energyShield: ["cosmos_regen_down", "cosmos_leech_down"],
    evasion: ["cosmos_aspd_down", "cosmos_res_down"],
    armor: ["cosmos_leech_down", "cosmos_regen_down"]
  });

  // modules/combat/cosmos-enemy-traits.mjs
  function buildGetCosmosExclusiveEnemyTrait(env2, zone, isElite, isBoss, seed) {
    if (!zone || zone.type !== "cosmos") return null;
    const power = cosmosTraitPower(zone, isElite, isBoss);
    const mechanic = env2.deps.cosmosRouteRuntime.mechanic(zone, isBoss, seed);
    if (!mechanic) return null;
    const archetype = mechanic.id;
    const trait = cosmosTraitRecord(archetype, isElite, isBoss);
    if (Object.hasOwn(COSMOS_TRAIT_ARCHETYPES, archetype)) COSMOS_TRAIT_ARCHETYPES[archetype](trait, { name: env2.deps._t("우주계: {name}", { name: mechanic.name }), isBoss, power, seed });
    if (isBoss) {
      trait.bossDebuffs = (Object.hasOwn(COSMOS_BOSS_DEBUFF_SETS, archetype) ? COSMOS_BOSS_DEBUFF_SETS[archetype] : ["cosmos_res_down"]).slice();
      trait.debuffPower = Math.min(1.7, power);
    }
    return trait;
  }
  function cosmosTraitPower(zone, isElite, isBoss) {
    const sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    const gravity = Math.max(1, Number(zone.gravity || 1));
    const rankPower = isBoss ? 1.45 : isElite ? 1 : 0.72;
    return rankPower * (1 + Math.max(0, sizeClass - 1) * 0.06 + Math.max(0, gravity - 1) * 0.04);
  }
  function cosmosTraitRecord(archetype, isElite, isBoss) {
    return {
      id: `cosmos_${archetype}`,
      name: "",
      expMul: 1 + (isBoss ? 0.16 : isElite ? 0.08 : 0.03),
      dropMul: 1 + (isBoss ? 0.12 : isElite ? 0.06 : 0.02),
      bossDebuffs: []
    };
  }

  // modules/combat/cosmos-enemy-modifiers.mjs
  function buildApplyCosmosDirectiveModifiers(env2, modifiers, zone) {
    const directive = zone && zone.cosmosDirective && typeof zone.cosmosDirective === "object" ? zone.cosmosDirective : null;
    if (!directive) return modifiers;
    modifiers.hpMul *= Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    modifiers.damageMul *= Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    modifiers.attackSpeedMul *= Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    const name = String(directive.name || "").trim();
    if (name) modifiers.traitName = env2.deps._t("{traitName}, 탐사:{name}", { traitName: modifiers.traitName, name });
    return modifiers;
  }
  function buildGetCosmosEnemyModifiers(env2, zone, isElite, isBoss) {
    if (!zone || zone.type !== "cosmos") return null;
    const { mod, tag, bossMul } = cosmosModifierBase(env2, zone, isElite, isBoss);
    applyCosmosTagModifiers(mod, tag);
    applyGalaxyEnvironment(env2, mod, zone);
    mod.hpMul = Math.max(0.5, mod.hpMul * bossMul * buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss));
    mod.damageMul = Math.max(0.5, mod.damageMul * (isBoss ? 1.1 : 1));
    applyGalaxyBossModifiers(env2, mod, zone, isBoss);
    return buildApplyCosmosDirectiveModifiers(env2, env2.deps.cosmosRouteRuntime.modifyEncounter(mod, zone, isBoss), zone);
  }
  function cosmosModifierBase(env2, zone, isElite, isBoss) {
    let tag = String(zone.cosmosTag || "").trim();
    let sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizePressure = Math.max(0, sizeClass - 1);
    let gravityHarness = env2.deps.cosmosGravityHarness;
    let gravityPressure = Math.max(0, gravity - 1) * Math.max(0.5, 1 - gravityHarness * 0.01);
    let bossMul = isBoss ? 1.35 : isElite ? 1.12 : 1;
    let mod = {
      hpMul: 1 + sizePressure * 0.1 + gravityPressure * 0.13,
      damageMul: 1 + sizePressure * 0.025 + gravityPressure * 0.055,
      atkMul: 1 + gravityPressure * 0.035,
      attackSpeedMul: Math.max(0.72, 1 - gravityPressure * 0.018 + sizePressure * 0.012),
      dr: Math.floor(sizePressure * 2 + gravityPressure * 3),
      resAll: Math.floor(gravityPressure * 4),
      armorMul: 1 + sizePressure * 0.09 + gravityPressure * 0.08,
      evasionMul: 1 + Math.max(0, 3 - sizeClass) * 0.035,
      critChanceBonus: 0,
      penetration: Math.floor(gravityPressure * 2),
      regenMul: 1,
      ailmentChanceBonus: 0,
      firstHitGuard: 0,
      patternMode: null,
      traitName: env2.deps._t("우주계:{tag} {sizeClass}등급/{gravity}g", { tag: tag || "stellar", sizeClass, gravity: gravity.toFixed(1) })
    };
    return { mod, tag, bossMul };
  }
  var tagMods = {
    gateway: { resAll: 3, firstHitGuard: 0.08 },
    arcane: { resChaos: 8, penetration: 3 },
    cold: { resC: 14, attackSpeedMul: 0.94, ailmentChanceBonus: 0.04 },
    fire: { resF: 14, damageMul: 0.09, ailmentChanceBonus: 0.03 },
    hunt: { attackSpeedMul: 1.08, critChanceBonus: 5 },
    venom: { resChaos: 10, regenMul: 1.25, ailmentChanceBonus: 0.05 },
    relic: { armorMul: 1.16, dr: 4 },
    guard: { dr: 7, firstHitGuard: 0.14 },
    speed: { attackSpeedMul: 1.18, evasionMul: 1.18 },
    projectile: { penetration: 5, damageMul: 0.04 },
    map: { resAll: 5, evasionMul: 1.08 },
    seed: { regenMul: 1.45 },
    shield: { firstHitGuard: 0.2, resAll: 5 },
    loop: { attackSpeedMul: 1.08, hpMul: 0.08 },
    wealth: { dropMul: 1.08 },
    mirror: { evasionMul: 1.14, firstHitGuard: 0.1 },
    vital: { hpMul: 0.18, regenMul: 1.35 },
    crit: { critChanceBonus: 9 },
    belt: { armorMul: 1.12, resAll: 4 },
    gate: { penetration: 4, resChaos: 8 },
    bind: { attackSpeedMul: 0.92, dr: 5 },
    reflect: { firstHitGuard: 0.18, resAll: 4 },
    aoe: { damageMul: 0.1, hpMul: 0.08 },
    curse: { resChaos: 14, ailmentChanceBonus: 0.06 },
    charge: { atkMul: 0.12, penetration: 4 },
    chaos: { resChaos: 16, damageMul: 0.08 },
    warp: { attackSpeedMul: 1.12, evasionMul: 1.1 },
    asteroid: { armorMul: 1.08, dropMul: 1.04 },
    boss: { hpMul: 0.35, damageMul: 0.18, dr: 8, resAll: 8, penetration: 6, critChanceBonus: 7, firstHitGuard: 0.22, patternMode: "cosmos" }
  };
  function applyCosmosTagModifiers(mod, tag) {
    let extra = tagMods[tag] || {};
    Object.keys(extra).forEach((key) => {
      if (key === "patternMode") mod.patternMode = extra[key];
      else if (key === "traitName") mod.traitName = extra[key];
      else if (key === "attackSpeedMul" || key === "armorMul" || key === "evasionMul" || key === "regenMul" || key === "dropMul") mod[key] = (mod[key] || 1) * extra[key];
      else mod[key] = (mod[key] || 0) + extra[key];
    });
  }
  function applyGalaxyEnvironment(env2, mod, zone) {
    const galaxyEnvironment = Array.isArray(env2.deps.cosmosGalaxyEnvironment) ? env2.deps.cosmosGalaxyEnvironment.find((row) => row && row.galaxy === Math.floor(zone.cosmosGalaxy || 0)) : null;
    Object.keys(galaxyEnvironment || {}).forEach((key) => {
      if (["name", "summary", "counter", "galaxy"].includes(key)) return;
      if (key === "hybridElement") mod.hybridElement = galaxyEnvironment[key];
      else if (key === "energyShieldPct") mod.energyShieldPct = Math.max(mod.energyShieldPct || 0, galaxyEnvironment[key]);
      else if (["attackSpeedMul", "armorMul", "evasionMul"].includes(key)) mod[key] = (mod[key] || 1) * galaxyEnvironment[key];
      else mod[key] = (mod[key] || 0) + galaxyEnvironment[key];
    });
  }
  function applyGalaxyBossModifiers(env2, mod, zone, isBoss) {
    const galaxyBossMechanic = isBoss && typeof env2.deps.getCosmosGalaxyBossMechanic === "function" ? env2.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    if (galaxyBossMechanic) {
      mod.hpMul += 0.22;
      mod.damageMul += 0.08;
      mod.hpMul *= Math.max(0.5, Number(galaxyBossMechanic.hpScale || 1));
      mod.damageMul *= Math.max(0.2, Number(galaxyBossMechanic.damageScale || 1));
      mod.dr += 5;
      mod.resAll += 5;
      mod.penetration += 4;
      mod.critChanceBonus += 5;
      mod.patternMode = "cosmosBoss";
      mod.traitName = env2.deps._t("은하 보스: {name}", { name: galaxyBossMechanic.name });
    }
  }
  function buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss) {
    if (isBoss) return 1;
    const galaxy = Math.max(1, Math.min(5, Math.floor(Number(zone && zone.cosmosGalaxy) || 1)));
    const galaxyMultiplier = 4 + (galaxy - 1) * 0.125;
    return galaxyMultiplier * (isElite ? 1.35 : 1);
  }

  // modules/combat/encounter-elements.mjs
  function effectGetChaosBossElements(env2, zone) {
    if (!zone || zone.type !== "abyss") return null;
    const depth = Math.max(1, Math.floor(zone.depth || env2.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    return [env2.deps.CHAOS_BOSS_ELEMENTS[depth % 4], env2.deps.CHAOS_BOSS_ELEMENTS[(depth + 1) % 4]];
  }
  function effectPickEnemyElement(env2, zone, pool, isBoss) {
    if (env2.deps.hasOceanCurrent(zone, "cold_current")) return "cold";
    if (env2.deps.hasOceanCurrent(zone, "warm_current")) return "fire";
    const own = isBoss && env2.deps.BOSS_BODY_ELEMENTS[zone.bossVisualId];
    if (own) return own;
    const chaosBoss = isBoss ? effectGetChaosBossElements(env2, zone) : null;
    return chaosBoss ? chaosBoss[0] : env2.deps.rndChoice(pool);
  }

  // modules/combat/map-boss-estimate.mjs
  function effectEstimateMapZonePowerRequirements(env2, zone) {
    const supportedTypes = ["act", "abyss", "labyrinth", "underworld", "chaosRealm", "oceanDepth", "skyTower", "seasonBoss", "timeRift", "meteor", "beehive", "colony", "grandBreach", "trial", "cosmos", "beyondBoundary", "atlasMap"];
    if (!zone || !supportedTypes.includes(zone.type)) return null;
    let tier = Math.max(1, Number(env2.deps.levelProgression.combatZone(zone).tier) || 1);
    let loopInputs = buildGetLoopDifficultyInputs(env2, zone);
    let seasonDepth = buildGetSoftenedLoopDepth(loopInputs.seasonLoops);
    let tierProgress = clampNumber((tier - 1) / 18, 0, 1);
    let hp = effectGetMapEstimateMonsterHp(env2, zone, tier, loopInputs, tierProgress);
    let abyssScale = env2.deps.getAbyssMonsterScales(zone);
    let contentScale = buildResolveMapEstimateContentScale(env2, zone);
    const { bossMods, cosmosTrait } = effectGetMapEstimateBossMods(env2, zone);
    const entryTuning = buildGetEntryBossTuning(zone, true);
    const parts = { hp, tier, tierProgress, loopInputs, seasonDepth, abyssScale, contentScale, bossMods, cosmosTrait, entryTuning };
    let bossHp = effectGetMapEstimateBossHp(env2, zone, parts);
    let bossHit = effectGetMapEstimateBossHit(env2, zone, parts);
    const threat = effectGetMapEstimateThreatProfile(env2, zone, effectGetMapEstimateThreatMods(bossMods, cosmosTrait), { baseHit: bossHit, seasonDepth, tier });
    return effectGetAtlasPackReadiness(env2, zone, hp, {
      dps: Math.max(1, Math.round(env2.deps.getMapBossRequiredDps(bossHp, contentScale.clearTimeSec, zone.boundaryRegenRate))),
      ehp: Math.max(1, Math.round(threat.threatWindow)),
      peakHit: Math.max(1, Math.round(threat.peakHit)),
      resistancePressure: threat.resistancePressure,
      elements: effectGetChaosBossElements(env2, zone) || effectGetMapEstimateDamageElements(env2, zone),
      playerDpsMultiplier: 1,
      ...effectGetMapEstimateZonePenalties(zone),
      zoneId: zone.id,
      element: String(zone.ele || "phys"),
      clearTimeSec: contentScale.clearTimeSec,
      basis: "bossThreatWindow"
    });
  }
  function effectGetMapEstimateMonsterHp(env2, zone, tier, loopInputs, tierProgress) {
    let hp = (56 + tier * 30) * 1.15 * (1 + tierProgress * 9) * buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress);
    if (loopInputs.exempt) hp *= Number(zone.fixedDifficultyMul) || 1;
    return hp;
  }
  function effectGetMapEstimateBossMods(env2, zone) {
    let bossMods = zone.bossMods && typeof zone.bossMods === "object" ? zone.bossMods : {};
    if (zone.type === "cosmos") bossMods = buildGetCosmosEnemyModifiers(env2, zone, false, true) || bossMods;
    let cosmosTrait = zone.type === "cosmos" ? buildGetCosmosExclusiveEnemyTrait(env2, zone, false, true, env2.deps.hashSeed(zone.cosmosNodeId || zone.id)) : null;
    return { bossMods, cosmosTrait };
  }
  function effectGetMapEstimateBossHp(env2, zone, p) {
    const { hp, tier, tierProgress, loopInputs, contentScale, bossMods, cosmosTrait } = p;
    const k = effectGetMapEstimateBossHpFactors(zone, p);
    let bossHp = hp * (1.8 + tier * 0.6) * (1 + tierProgress * 4) * buildGetBossHpEase(env2, tier, buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress)) * k.abyssHp * k.abyssBoss * 0.92 * contentScale.hp * k.modHp * k.mapHp * k.traitHp;
    let estimateEnergyShieldPct = Math.max(Number(bossMods.energyShieldPct || 0), Number(cosmosTrait && cosmosTrait.energyShieldPct || 0));
    if (estimateEnergyShieldPct > 0) bossHp *= 1 + estimateEnergyShieldPct / 100;
    bossHp *= p.entryTuning.hp;
    if (zone.type === "trial" && zone.id === "trial_3") bossHp *= 0.85;
    return bossHp;
  }
  function effectGetMapEstimateBossHit(env2, zone, p) {
    const { tier, seasonDepth, contentScale } = p;
    let tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    const k = effectGetMapEstimateBossHitFactors(zone, p);
    let bossHit = (2.4 + tier * 3.35) * 1.15 * buildGetMonsterLoopGrowthScale(env2, zone, "damage", seasonDepth, tierPressure) * (1.14 + tier * 0.16) * 1.34 * k.abyssDmg * k.abyssTaken * k.abyssBoss * contentScale.damage * k.modDmg * k.mapDmg * k.traitDmg;
    if (zone.type === "act" && Number(zone.id) <= 1 && (env2.owner.season || 1) >= 3) bossHit *= 0.58;
    bossHit *= p.entryTuning.damage * buildGetMonsterLoopPowerScale(env2, zone, "damage");
    return bossHit;
  }
  function effectGetMapEstimateBossHpFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return {
      abyssHp: abyssScale.hpMul || 1,
      abyssBoss: abyssScale.bossMul || 1,
      modHp: bossMods.hpMul || 1,
      mapHp: zone.mapHpMul || 1,
      traitHp: cosmosTrait && cosmosTrait.hpMul ? cosmosTrait.hpMul : 1
    };
  }
  function effectGetMapEstimateBossHitFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return {
      abyssDmg: abyssScale.dmgMul || 1,
      abyssTaken: abyssScale.playerTakenMul || 1,
      abyssBoss: abyssScale.bossMul || 1,
      modDmg: bossMods.damageMul || 1,
      mapDmg: zone.mapDamageMul || 1,
      traitDmg: cosmosTrait && cosmosTrait.damageMul ? cosmosTrait.damageMul : 1
    };
  }

  // modules/combat-skill-effects-classic.mjs
  var deps = {
    get DOT_STACK_MAX() {
      return DOT_STACK_MAX;
    },
    get DOT_STACK_GROWTH_PER_STACK() {
      return DOT_STACK_GROWTH_PER_STACK;
    },
    get DOT_TICK_FROM_HIT_RATIO() {
      return DOT_TICK_FROM_HIT_RATIO;
    },
    get DOT_TICK_INTERVAL() {
      return DOT_TICK_INTERVAL;
    },
    get DOT_EFFECT_DURATION() {
      return DOT_EFFECT_DURATION;
    },
    get canTalentCardApplyEnemyAilment() {
      return typeof canTalentCardApplyEnemyAilment === "undefined" ? void 0 : canTalentCardApplyEnemyAilment;
    },
    get getZone() {
      return getZone;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get loopMutation() {
      return loopMutation;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get getElementColor() {
      return getElementColor;
    },
    get getAilmentDisplayLabel() {
      return getAilmentDisplayLabel;
    },
    get findGridRetreatCell() {
      return findGridRetreatCell;
    },
    get gridStepToward() {
      return gridStepToward;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get isEnemyPetrified() {
      return isEnemyPetrified;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get getTalentAilmentReplacement() {
      return typeof getTalentAilmentReplacement === "undefined" ? void 0 : getTalentAilmentReplacement;
    },
    get regionAffixEffects() {
      return regionAffixEffects;
    },
    get combatSupports() {
      return window.GameModules.combat.supports;
    },
    get decorateTalentAilmentPayload() {
      return typeof decorateTalentAilmentPayload === "undefined" ? void 0 : decorateTalentAilmentPayload;
    },
    get enhanceTalentAilmentReapplication() {
      return typeof enhanceTalentAilmentReapplication === "undefined" ? void 0 : enhanceTalentAilmentReapplication;
    },
    get trackHiddenJournalAilment() {
      return trackHiddenJournalAilment;
    },
    get afterTalentAilmentApplied() {
      return typeof afterTalentAilmentApplied === "undefined" ? void 0 : afterTalentAilmentApplied;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get shouldTalentSkipColdFreeze() {
      return typeof shouldTalentSkipColdFreeze === "undefined" ? void 0 : shouldTalentSkipColdFreeze;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get storeExpiredTalentAilmentSeed() {
      return typeof storeExpiredTalentAilmentSeed === "undefined" ? void 0 : storeExpiredTalentAilmentSeed;
    },
    get getTalentDotDamageMultiplier() {
      return typeof getTalentDotDamageMultiplier === "undefined" ? void 0 : getTalentDotDamageMultiplier;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get coreItems() {
      return coreItems;
    },
    get addStatToBucket() {
      return addStatToBucket;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get weaponMastery() {
      return typeof weaponMastery === "undefined" ? void 0 : weaponMastery;
    },
    get bossVariants() {
      return typeof bossVariants === "undefined" ? void 0 : bossVariants;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get stumpNursery() {
      return typeof stumpNursery === "undefined" ? void 0 : stumpNursery;
    },
    get placeFloorItem() {
      return placeFloorItem;
    },
    get getTalentBloomHeroIdForAscendancy() {
      return typeof getTalentBloomHeroIdForAscendancy === "undefined" ? void 0 : getTalentBloomHeroIdForAscendancy;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get queueTutorialNotice() {
      return typeof queueTutorialNotice === "undefined" ? void 0 : queueTutorialNotice;
    },
    get recordTalentBloomCard() {
      return typeof recordTalentBloomCard === "undefined" ? void 0 : recordTalentBloomCard;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get getAutoProgressZoneId() {
      return getAutoProgressZoneId;
    },
    get startMoving() {
      return startMoving;
    },
    get ENEMY_CROWD_PAUSE_LIMIT() {
      return ENEMY_CROWD_PAUSE_LIMIT;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get ENEMY_REGEN_STEP_MS() {
      return ENEMY_REGEN_STEP_MS;
    },
    get ENEMY_REGEN_FATIGUE_MS() {
      return ENEMY_REGEN_FATIGUE_MS;
    },
    get ACT_LOOP_SCALE_CAP() {
      return ACT_LOOP_SCALE_CAP;
    },
    get BOSS_LOOP_HP_SHARE() {
      return BOSS_LOOP_HP_SHARE;
    },
    get BOSS_TIER_HP_EASE() {
      return BOSS_TIER_HP_EASE;
    },
    get CHAOS_LOOP_RAMP_PER_DEPTH() {
      return CHAOS_LOOP_RAMP_PER_DEPTH;
    },
    get MONSTER_LOOP_GROWTH() {
      return MONSTER_LOOP_GROWTH;
    },
    get MONSTER_LOOP_HP_CURVE() {
      return MONSTER_LOOP_HP_CURVE;
    },
    get MONSTER_LOOP_POWER_SCALE() {
      return MONSTER_LOOP_POWER_SCALE;
    },
    get UNDERWORLD_DIFFICULTY_CONFIG() {
      return UNDERWORLD_DIFFICULTY_CONFIG;
    },
    get _t() {
      return _t;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get cosmosGalaxyEnvironment() {
      return globalThis.COSMOS_GALAXY_ENVIRONMENT_DB;
    },
    get cosmosGravityHarness() {
      return typeof window.getCosmosMasteryValue === "function" ? Math.max(0, Number(window.getCosmosMasteryValue("gravityHarness")) || 0) : 0;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get CHAOS_BOSS_ELEMENTS() {
      return CHAOS_BOSS_ELEMENTS;
    },
    get hasOceanCurrent() {
      return hasOceanCurrent;
    },
    get BOSS_BODY_ELEMENTS() {
      return BOSS_BODY_ELEMENTS;
    },
    get rndChoice() {
      return rndChoice;
    },
    get getCosmosGalaxyBossMechanic() {
      return typeof getCosmosGalaxyBossMechanic === "undefined" ? void 0 : getCosmosGalaxyBossMechanic;
    },
    get getBossPatternPeakDamageMultiplier() {
      return getBossPatternPeakDamageMultiplier;
    },
    get getMaximumBossPatternDamageMultiplierForLoop() {
      return getMaximumBossPatternDamageMultiplierForLoop;
    },
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() {
      return ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    },
    get getChaosRealmAffixes() {
      return typeof getChaosRealmAffixes === "undefined" ? void 0 : getChaosRealmAffixes;
    },
    get getChaosRealmAffixScale() {
      return typeof getChaosRealmAffixScale === "undefined" ? void 0 : getChaosRealmAffixScale;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get getMapBossRequiredDps() {
      return getMapBossRequiredDps;
    },
    get hashSeed() {
      return hashSeed;
    },
    get getMonsterBaseHitDamage() {
      return getMonsterBaseHitDamage;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get getOceanPendingBossBoundary() {
      return typeof getOceanPendingBossBoundary === "undefined" ? void 0 : getOceanPendingBossBoundary;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() {
      return PROJECTILE_BONUS_SHOT_DAMAGE_PCT;
    },
    get WOODSMAN_PHASE_NEW_FINAL_PROGRESS() {
      return WOODSMAN_PHASE_NEW_FINAL_PROGRESS;
    },
    get WOODSMAN_PHASE_OLD_FINAL_PROGRESS() {
      return WOODSMAN_PHASE_OLD_FINAL_PROGRESS;
    },
    get WOODSMAN_ELEMENTS() {
      return WOODSMAN_ELEMENTS;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    }
  };
  var runtime = {
    get trialHazardRuntime() {
      return window.GameModules.state.combat.trialHazardRuntime;
    },
    set trialHazardRuntime(value) {
      window.GameModules.state.combat.trialHazardRuntime = value;
    },
    get crowdPauseActive() {
      return crowdPauseActive;
    },
    set crowdPauseActive(value) {
      crowdPauseActive = value;
    }
  };
  var env = { get owner() {
    return game;
  }, deps, runtime };
  function getChaosBossElements(zone) {
    return effectGetChaosBossElements(env, zone);
  }
  function pickEnemyElement(zone, pool, isBoss) {
    return effectPickEnemyElement(env, zone, pool, isBoss);
  }
  function estimateMapZonePowerRequirements(zone) {
    return effectEstimateMapZonePowerRequirements(env, zone);
  }
  function getAtlasPackReadiness(zone, baseHp, bossEstimate) {
    return effectGetAtlasPackReadiness(env, zone, baseHp, bossEstimate);
  }
  function generateEncounterPlan(zone) {
    return effectGenerateEncounterPlan(env, zone);
  }
  function getTrialHazardProfile(zone) {
    return effectGetTrialHazardProfile(zone);
  }
  function getSkillAilmentStats(pStats, hitElement, curseFx) {
    return effectGetSkillAilmentStats(pStats, hitElement, curseFx);
  }
  function getSkillRepeatDamageMultiplier(skill, hitIndex, nativeRepeats) {
    return effectGetSkillRepeatDamageMultiplier(env, skill, hitIndex, nativeRepeats);
  }
  function readRepelMeleeParams(ep) {
    return effectReadRepelMeleeParams(ep);
  }
  function readPursuitMovePct(ep) {
    return effectReadPursuitMovePct(ep);
  }
  function getAilmentTypeFromElement(ele) {
    return effectGetAilmentTypeFromElement(ele);
  }
  function getPlayerAilmentChance(pStats, type) {
    return effectGetPlayerAilmentChance(pStats, type);
  }
  function getPassiveBleedMultiplier(pStats) {
    return effectGetPassiveBleedMultiplier(pStats);
  }
  function getPlayerShockTakenDamageIncreasePct(pStats, power) {
    return effectGetPlayerShockTakenDamageIncreasePct(pStats, power);
  }
  function getEnemyShockTakenDamageIncreasePct(ail, pStats) {
    return effectGetEnemyShockTakenDamageIncreasePct(ail, pStats);
  }
  function getActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) {
    return effectGetActiveEnemyShockTakenDamageIncreasePct(enemy, pStats);
  }
  function getShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats) {
    return effectGetShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats);
  }
  function getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) {
    return effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
  }
  function getDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) {
    return effectGetDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale);
  }
  function getFlameDecayIgniteTakenMultiplier(pStats) {
    return effectGetFlameDecayIgniteTakenMultiplier(pStats);
  }
  function getWoodsmanPhaseProgress(enemy) {
    return effectGetWoodsmanPhaseProgress(env, enemy);
  }
  function woodsmanAttackFxElement(enemy) {
    return effectWoodsmanAttackFxElement(env, enemy);
  }
  function getEncounterTelemetryContext(zone) {
    return effectGetEncounterTelemetryContext(env, zone);
  }
  var effects = {
    deliverSkillCue(callback, cue) {
      return callback(cue);
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get addLog() {
      return addLog;
    },
    get queueTutorialNotice() {
      return typeof queueTutorialNotice === "undefined" ? void 0 : queueTutorialNotice;
    },
    get queueContentNotice() {
      return queueContentNotice;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    }
  };
  function runSkillCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      step = commands.next(effects[command.kind](...command.args));
    }
    return step.value;
  }
  function resetBattleRuntimeVisuals() {
    window.GameModules.battleVisuals.runtime.reset();
    window.GameModules.state.combat.pendingSkillStageHits = [];
    window.GameModules.state.combat.pendingEnemyCombatAttacks = [];
    window.GameModules.state.combat.nextPlayerDamageTextGroupId = 1;
    crowdPauseActive = false;
    window.GameModules.state.combat.trialHazardRuntime = { nextAt: 0, active: null };
  }
  function primeTrialHazardTimer(zone) {
    return hitPrimeTrialHazardTimer(env, zone);
  }
  function handleTalentBloomClear(zone) {
    return runSkillCommands(hitHandleTalentBloomClear(env, zone));
  }
  function getDotStackMultiplier(stacks) {
    return hitGetDotStackMultiplier(env, stacks);
  }
  function applySkillDotFromHit(enemy, hitDamage, pStats) {
    return runSkillCommands(hitApplySkillDotFromHit(env, enemy, hitDamage, pStats));
  }
  function detonateFlameDecay(enemy, hitDamage, pStats) {
    return runSkillCommands(hitDetonateFlameDecay(env, enemy, hitDamage, pStats));
  }
  function getSkillConditionalDamageMultiplier(skill, enemy, onCue) {
    return runSkillCommands(hitGetSkillConditionalDamageMultiplier(env, skill, enemy, onCue));
  }
  function pushEnemyAwayOnHit(enemy, skill) {
    return runSkillCommands(hitPushEnemyAwayOnHit(env, enemy, skill));
  }
  function repelMeleeAttacker(enemy, pStats) {
    return runSkillCommands(hitRepelMeleeAttacker(env, enemy, pStats));
  }
  function launchEnemyOnHit(enemy, skill) {
    return runSkillCommands(hitLaunchEnemyOnHit(env, enemy, skill));
  }
  function applySkillGridControlOnHit(enemy, skill, options = {}) {
    return runSkillCommands(hitApplySkillGridControlOnHit(env, enemy, skill, options));
  }
  function spreadSkillAilmentOnHit(source, skill, pStats) {
    return runSkillCommands(hitSpreadSkillAilmentOnHit(env, source, skill, pStats));
  }
  function applySkillPeriodicOnHit(enemy, skill, damage, skillName) {
    return hitApplySkillPeriodicOnHit(env, enemy, skill, damage, skillName);
  }
  function addConfirmedSkillEffect(kind, visual, target, element) {
    return runSkillCommands(hitAddConfirmedSkillEffect(env, kind, visual, target, element));
  }
  function applySupportEchoOnHit(enemy, pStats, damage) {
    return hitApplySupportEchoOnHit(enemy, pStats, damage);
  }
  function applySupportChaosErosionOnHit(enemy, pStats, hitElement) {
    return hitApplySupportChaosErosionOnHit(enemy, pStats, hitElement);
  }
  function transferPassiveChaosErosionToTarget(enemy, pStats) {
    return hitTransferPassiveChaosErosionToTarget(env, enemy, pStats);
  }
  function cloneEnemyAilmentForSpread(ail, pStats) {
    return hitCloneEnemyAilmentForSpread(env, ail, pStats);
  }
  function mergeEnemyAilment(target, incoming, pStats) {
    return hitMergeEnemyAilment(env, target, incoming, pStats);
  }
  function recordKillProgress(enemy) {
    return hitRecordKillProgress(env, enemy);
  }
  function layStumpDrop(enemy) {
    return hitLayStumpDrop(env, enemy);
  }
  function applyAccountRewardStats(reward) {
    return hitApplyAccountRewardStats(env, reward);
  }
  function applyAilmentEffectsOnDeath(enemy, pStats) {
    return runSkillCommands(hitApplyAilmentEffectsOnDeath(env, enemy, pStats));
  }
  function getPlayerDamageAilmentFallbackDps(type, power, pStats) {
    return hitGetPlayerDamageAilmentFallbackDps(env, type, power, pStats);
  }
  function applyEnemyAilmentFromHit(enemy, pStats, hitDamage, isCrit, options) {
    return hitApplyEnemyAilmentFromHit(env, enemy, pStats, { hitDamage, isCrit, options });
  }
  function tickEnemyAilments2(pStats, dt) {
    return runSkillCommands(hitTickEnemyAilments(env, pStats, dt));
  }
  function tickEnemyDotEffects(pStats, dt) {
    return runSkillCommands(hitTickEnemyDotEffects(env, pStats, dt));
  }
  function syncCrowdPauseState() {
    return runSkillCommands(hitSyncCrowdPauseState(env));
  }
  function resetWoodsmanCurse() {
    return hitResetWoodsmanCurse(env);
  }
  function startWoodsmanCurse() {
    return runSkillCommands(hitStartWoodsmanCurse(env));
  }
  function tickWoodsmanCurse() {
    return runSkillCommands(hitTickWoodsmanCurse(env));
  }
  function getWoodsmanCurseDamageTakenMul() {
    return hitGetWoodsmanCurseDamageTakenMul(env);
  }
  function applyCosmosAstraStance(enemy) {
    return runSkillCommands(hitApplyCosmosAstraStance(env, enemy));
  }
  function isCrowdProgressPaused() {
    return hitIsCrowdProgressPaused(env);
  }
  function isDamageAilmentType(type) {
    return hitIsDamageAilmentType(type);
  }
  function getStoredAilmentHitDamage(ail) {
    return hitGetStoredAilmentHitDamage(ail);
  }
  function getDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
    return hitGetDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale);
  }
  function getEnemyDamageAilmentDps(ail, pStats) {
    return hitGetEnemyDamageAilmentDps(env, ail, pStats);
  }
  function getPlayerDamageAilmentDps(ail, pStats) {
    return hitGetPlayerDamageAilmentDps(env, ail, pStats);
  }
  function getMapBossRequiredDps(bossHp, clearTimeSec, regenRate) {
    return hitGetMapBossRequiredDps(env, bossHp, clearTimeSec, regenRate);
  }
  function flameDecayMitigated(enemy, damage, pStats) {
    return hitFlameDecayMitigated(env, enemy, damage, pStats);
  }
  function canPushEnemy(enemy) {
    return hitCanPushEnemy(env, enemy);
  }
  var api = { getChaosBossElements, pickEnemyElement, estimateMapZonePowerRequirements, getAtlasPackReadiness, generateEncounterPlan, resetBattleRuntimeVisuals, getTrialHazardProfile, primeTrialHazardTimer, handleTalentBloomClear, getDotStackMultiplier, applySkillDotFromHit, detonateFlameDecay, getSkillAilmentStats, getSkillConditionalDamageMultiplier, getSkillRepeatDamageMultiplier, pushEnemyAwayOnHit, repelMeleeAttacker, readRepelMeleeParams, readPursuitMovePct, launchEnemyOnHit, applySkillGridControlOnHit, spreadSkillAilmentOnHit, applySkillPeriodicOnHit, addConfirmedSkillEffect, applySupportEchoOnHit, applySupportChaosErosionOnHit, transferPassiveChaosErosionToTarget, getAilmentTypeFromElement, getPlayerAilmentChance, getPassiveBleedMultiplier, getPlayerShockTakenDamageIncreasePct, getEnemyShockTakenDamageIncreasePct, getActiveEnemyShockTakenDamageIncreasePct, getShockedEnemyHitDamageIncreaseMultiplier, getDamageAilmentEffectiveDotScale, getDamageAilmentScore, cloneEnemyAilmentForSpread, mergeEnemyAilment, recordKillProgress, layStumpDrop, applyAccountRewardStats, applyAilmentEffectsOnDeath, getFlameDecayIgniteTakenMultiplier, getPlayerDamageAilmentFallbackDps, applyEnemyAilmentFromHit, tickEnemyAilments: tickEnemyAilments2, tickEnemyDotEffects, syncCrowdPauseState, resetWoodsmanCurse, startWoodsmanCurse, tickWoodsmanCurse, getWoodsmanCurseDamageTakenMul, getWoodsmanPhaseProgress, woodsmanAttackFxElement, getEncounterTelemetryContext, applyCosmosAstraStance, isCrowdProgressPaused, isDamageAilmentType, getStoredAilmentHitDamage, getDamageAilmentBaseDpsFromHit, getEnemyDamageAilmentDps, getPlayerDamageAilmentDps, ELEMENTAL_HIT_AILMENTS, CHAOS_BOSS_ELEMENTS, FLAME_DECAY_BURST, SKILL_PERIODIC_CHAIN_CAP, WOODSMAN_PHASE_OLD_FINAL_PROGRESS, WOODSMAN_PHASE_NEW_FINAL_PROGRESS, WOODSMAN_ELEMENTS, COSMOS_ASTRA_STANCES, COSMOS_ASTRA_STANCE_CYCLE_MS, getMapBossRequiredDps, flameDecayMitigated, canPushEnemy };
  safeExposeGlobals(api);
})();
