// GENERATED from modules/combat-resources*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/enemy-resources.mjs
  function damageEnemyResource(enemy, damage) {
    let remaining = Math.max(0, Math.floor(Number(damage) || 0));
    if (!enemy || remaining <= 0) return null;
    let dealt = 0;
    if ((enemy.energyShield || 0) > 0) {
      const absorbed = Math.min(Math.max(0, Math.floor(enemy.energyShield || 0)), remaining);
      enemy.energyShield = Math.max(0, Math.floor(enemy.energyShield || 0) - absorbed);
      remaining -= absorbed;
      dealt += absorbed;
    }
    if (remaining > 0) {
      const beforeHp = Math.max(0, Math.floor(enemy.hp || 0));
      enemy.hp = Math.max(0, beforeHp - remaining);
      dealt += Math.max(0, beforeHp - enemy.hp);
    }
    return dealt;
  }
  function enemyLifeAndShield(enemy) {
    return Math.max(0, Number(enemy.hp) || 0) + Math.max(0, Number(enemy.energyShield) || 0);
  }
  function enemyLifeDamagePct(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    return Math.max(0, Math.min(100, (1 - Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1)) * 100));
  }

  // modules/domain/enemy-regeneration.mjs
  var ENEMY_REGEN_COMBAT_WINDOW_MS = 2e3;
  var ENEMY_REGEN_FATIGUE_MS = 6e4;
  var ENEMY_REGEN_STEP_MS = 100;
  var regenFatigueFactor = (fatigueMs) => Math.max(0, 1 - Math.max(0, fatigueMs) / ENEMY_REGEN_FATIGUE_MS);
  function takeEnemyRegenAmount(enemy, rawRegen) {
    let wholeRegen = Math.floor(Math.max(0, rawRegen));
    const fractionalRegen = Math.max(0, rawRegen) - wholeRegen;
    enemy.regenBank = Math.max(0, Number(enemy.regenBank) || 0);
    if (fractionalRegen > 0) enemy.regenBank = Math.round((enemy.regenBank + Math.max(0.1, Math.round(fractionalRegen * 10) / 10)) * 10) / 10;
    if (enemy.regenBank >= 1) {
      wholeRegen += Math.floor(enemy.regenBank);
      enemy.regenBank = Math.round((enemy.regenBank - Math.floor(enemy.regenBank)) * 10) / 10;
    }
    return wholeRegen;
  }
  function tireEnemyRegen(enemy, now, finisherWarningMs) {
    if (enemy.isWoodsman) return 1;
    const mark = Number(enemy.regenHpMark);
    if (Number.isFinite(mark) && enemy.hp < mark) enemy.regenLastLossAt = now;
    const calm = ENEMY_REGEN_COMBAT_WINDOW_MS + (enemy.patternMode === "apex" ? finisherWarningMs : 0);
    const fighting = now - (Number(enemy.regenLastLossAt) || -Infinity) < calm;
    enemy.regenFatigueMs = fighting ? Math.min(ENEMY_REGEN_FATIGUE_MS, (Number(enemy.regenFatigueMs) || 0) + ENEMY_REGEN_STEP_MS) : 0;
    return regenFatigueFactor(enemy.regenFatigueMs);
  }
  function regenRate(enemy, stats, inputs) {
    const suppress = Math.max(0, Math.min(95, enemy.regenSuppressPct || 0));
    const curse = inputs.conditionDebuffs(enemy);
    const unique = stats?.uniqueEnemyRegenCutAndMinRoll ? Math.max(0, Number(stats.uniqueEnemyRegenCutAndMinRoll.enemyRegenRateMul || 1)) : 1;
    const talent = inputs.talentMultiplier(enemy);
    return Math.max(0, enemy.regenRate * (1 - suppress / 100) * (curse.enemyRegenRateMul || 1) * unique * talent);
  }
  function createEnemyRegeneration(inputs) {
    return (enemy, stats) => {
      const maxHp = Math.max(1, enemy.maxHp || enemy.hp || 1);
      const fatigue = tireEnemyRegen(enemy, inputs.clock(), inputs.finisherWarningMs);
      if ((enemy.regenRate || 0) > 0 && enemy.hp < maxHp && fatigue > 0) {
        const whole = takeEnemyRegenAmount(enemy, maxHp * regenRate(enemy, stats, inputs) * fatigue);
        if (whole > 0) enemy.hp = Math.min(maxHp, enemy.hp + whole);
      }
      enemy.regenHpMark = enemy.hp;
    };
  }

  // modules/common/numbers.mjs
  function clampNumber(value2, min, max) {
    return Math.max(min, Math.min(max, value2));
  }

  // modules/domain/enemy-mitigation.mjs
  var CURSE_ELEMENT_SHRED_KEYS = Object.freeze({ fire: "resFShred", cold: "resCShred", light: "resLShred", chaos: "resChaosShred", phys: "physDrShred" });
  var VOID_WEAK_TAKEN_MUL = 1.2;
  var WOODSMAN_BASE_RESIST = /* @__PURE__ */ Object.freeze({ fire: "baseResF", cold: "baseResC", light: "baseResL", chaos: "baseResChaos" });
  var RESIST_FIELDS = /* @__PURE__ */ Object.freeze({ phys: "dr", fire: "resF", cold: "resC", light: "resL", chaos: "resChaos" });
  function getEnemyElementResistance(element, tier, enemy) {
    const progress = clampNumber(((tier || 1) - 1) / 19, 0, 1), curved = progress * progress;
    const base = ["fire", "cold", "light", "chaos"].includes(element) ? 5 + Math.floor(20 * curved) : 0;
    const key = Object.hasOwn(RESIST_FIELDS, element) ? RESIST_FIELDS[element] : null;
    return enemy && key ? enemy[key] || 0 : base;
  }
  function getWoodsmanResistance(skillEle, enemy, rawMitigation) {
    let missingHpRatio = Math.max(0, Math.min(1, 1 - (enemy.hp || 0) / enemy.maxHp));
    let bonusRes = Math.floor(missingHpRatio * 28);
    const key = Object.hasOwn(WOODSMAN_BASE_RESIST, skillEle) ? WOODSMAN_BASE_RESIST[skillEle] : null;
    return key ? (enemy[key] || rawMitigation) + bonusRes : rawMitigation;
  }
  function getPhysicalMitigation(rawMitigation, pStats) {
    let cappedReduction = Math.max(0, Math.min(80, rawMitigation));
    let ignoreAmount = Math.max(0, Number(pStats.physIgnore) || 0);
    if (cappedReduction > 0) {
      cappedReduction = pStats && pStats.allowNegativePhysIgnore ? cappedReduction - ignoreAmount : Math.max(0, cappedReduction - ignoreAmount);
    }
    if (rawMitigation < 0) return rawMitigation;
    return cappedReduction;
  }
  function getPiercedResistance(skillEle, pStats, rawMitigation) {
    if (skillEle === "light" && pStats && pStats.crusaderLightningIgnoreRes) rawMitigation = 0;
    return rawMitigation - (skillEle === "light" && pStats && pStats.crusaderNoResPenOnLightning ? 0 : Math.max(0, pStats.resPen || 0));
  }
  function getUniqueElementalShred(enemy, state) {
    const deb = enemy.id && state.enemyUniqueElementalResDown && state.enemyUniqueElementalResDown[enemy.id];
    if (!deb) return 0;
    return Math.min(Math.max(0, Number(deb.max || 20)), Math.max(0, Number(deb.stacks || 0)) * Math.max(0, Number(deb.perHit || 2)));
  }
  function getUniqueChaosShred(enemy, state) {
    const deb = enemy.id && state.enemyUniqueChaosResDown && state.enemyUniqueChaosResDown[enemy.id];
    return deb ? Math.max(0, (deb.perHit || 0) * (deb.stacks || 0)) : 0;
  }
  function applyEnemyResistanceShred(skillEle, enemy, rawMitigation, state) {
    if (!enemy) return rawMitigation;
    if (["fire", "cold", "light"].includes(skillEle)) return rawMitigation - getUniqueElementalShred(enemy, state);
    if (skillEle !== "chaos") return rawMitigation;
    rawMitigation -= getUniqueChaosShred(enemy, state);
    if (enemy.chaosErosionShred) rawMitigation -= enemy.chaosErosionShred;
    return rawMitigation;
  }
  var EnemyMitigation = class {
    constructor(inputs) {
      this.inputs = inputs;
    }
    beforeWeak(skillEle, zoneTier, enemy, stats, state) {
      let raw = getEnemyElementResistance(skillEle, zoneTier, enemy);
      if (enemy && enemy.isWoodsman && enemy.maxHp > 0) raw = getWoodsmanResistance(skillEle, enemy, raw);
      raw = applyEnemyResistanceShred(skillEle, enemy, raw, state);
      if (skillEle === "phys") return getPhysicalMitigation(raw, stats);
      if (["fire", "cold", "light", "chaos"].includes(skillEle)) return this.elemental(skillEle, enemy, stats, raw);
      return Math.min(80, raw);
    }
    elemental(element, enemy, stats, raw) {
      const elemental = element !== "chaos";
      if (elemental && this.inputs.ownsKeystone("iq4")) raw = Math.max(0, raw) * this.inputs.keptResistancePct() / 100 + Math.min(0, raw);
      let effective = getPiercedResistance(element, stats, raw);
      const cap = Math.max(0, Number(enemy && enemy.maxResCap) || 80);
      if (effective > 0) effective = Math.min(cap, effective);
      const floor = elemental && this.inputs.ownsKeystone("e9") ? -300 : this.inputs.minimumResistance();
      const resistance = Math.max(floor, effective);
      return this.holyMist(element, enemy, resistance);
    }
    holyMist(element, enemy, resistance) {
      return element === "fire" && enemy?.holyMistUntil > this.inputs.clock() ? 100 - (100 - resistance) * 1.2 : resistance;
    }
    weak(enemy, mitigation2) {
      return enemy?.voidWeakUntil > this.inputs.clock() ? 100 - (100 - mitigation2) * VOID_WEAK_TAKEN_MUL : mitigation2;
    }
    effective(element, tier, enemy, stats, state) {
      return this.weak(enemy, this.beforeWeak(element, tier, enemy, stats, state));
    }
    hit(element, tier, enemy, source) {
      const { stats, curse, state } = source;
      const elementShred = Number(curse[CURSE_ELEMENT_SHRED_KEYS[element]]) || 0;
      return this.effective(element, tier, enemy, stats, state) - (curse.resShred || 0) - elementShred - this.inputs.regionAffixes.resistanceShred(stats, enemy, element);
    }
    ailing(enemy, element, isCrit, damages, source) {
      let mul = this.inputs.regionAffixes.damageMultiplier(source.stats, enemy, element, isCrit, source.state);
      if (this.inputs.ownsKeystone("ct5") && Array.isArray(enemy.ailments) && enemy.ailments.some((a) => a && (a.time || 0) > 0)) mul *= 1.2;
      return mul === 1 ? damages : damages.map((value2) => Math.floor(value2 * mul));
    }
  };
  var createEnemyMitigation = (inputs) => Object.freeze(new EnemyMitigation(inputs));

  // modules/domain/region-affix-stats.mjs
  function value(pStats, id) {
    return Math.max(0, Number(pStats && pStats.regionAffix && pStats.regionAffix[id]) || 0);
  }
  function num(raw) {
    return Number(raw) || 0;
  }
  function activeRow(enemy, type) {
    return (enemy && Array.isArray(enemy.ailments) ? enemy.ailments : []).find((row) => row && row.type === type && (row.time || 0) > 0) || null;
  }
  function hasAilment(enemy, type) {
    return !!activeRow(enemy, type);
  }
  var RegionAffixStats = class {
    constructor(definitions, rules) {
      this.ids = Object.freeze(definitions.map((row) => row.statId));
      this.rules = rules;
      Object.assign(this, { value, num, activeRow, hasAilment });
    }
    collect(sum) {
      return Object.freeze(Object.fromEntries(this.ids.map((id) => [id, Math.max(0, Number(sum(id)) || 0)])));
    }
    resistanceShred(pStats, enemy, element) {
      if (element === "light" && hasAilment(enemy, "shock")) return value(pStats, "regionShockedLightPen");
      const shred = element === "chaos" ? activeRow(enemy, "regionChaosShred") : null;
      return shred ? num(shred.stacks) * num(shred.power) : 0;
    }
    elementMultiplier(pStats, element, state) {
      if (element === "phys") return 1 + Math.floor(num(pStats.armor) / this.rules.armorStep) * value(pStats, "regionArmorToPhys") / 100;
      if (element === "chaos") return 1 + Math.max(0, num(pStats.rawResChaos) - num(pStats.maxResChaos)) * value(pStats, "regionChaosOvercap") / 100;
      const fullLife = element === "fire" && num(state.playerHp) >= num(pStats.maxHp);
      return fullLife ? 1 + value(pStats, "regionFullLifeFire") / 100 : 1;
    }
    damageMultiplier(pStats, enemy, element, isCrit, state) {
      if (!pStats || !pStats.regionAffix) return 1;
      let mul = this.elementMultiplier(pStats, element, state);
      if (hasAilment(enemy, "bleed")) mul *= 1 + value(pStats, "regionBleedingDamage") / 100;
      if (hasAilment(enemy, "ignite")) mul *= 1 + value(pStats, "regionIgnitedDamage") / 100;
      if (isCrit && hasAilment(enemy, "freeze")) mul *= 1 + value(pStats, "regionFrozenCritDamage") / 100;
      return mul;
    }
    stackChaosShred(pStats, enemy) {
      const pct = value(pStats, "regionChaosShred");
      if (pct <= 0) return;
      enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
      let row = enemy.ailments.find((a) => a && a.type === "regionChaosShred");
      if (!row) enemy.ailments.push(row = { type: "regionChaosShred", stacks: 0, power: 0, time: 0 });
      row.stacks = Math.min(this.rules.chaosShredStacks, num(row.stacks) + 1);
      row.power = Math.max(num(row.power), pct);
      row.time = this.rules.chaosShredSec;
    }
    extraAilmentChances(pStats) {
      const pct = value(pStats, "regionChillOnHit");
      return pct > 0 ? { chill: Math.min(1, pct / 100) } : void 0;
    }
    ailmentDurationMultiplier(pStats, type) {
      return type === "ignite" ? 1 + value(pStats, "regionIgniteDuration") / 100 : 1;
    }
    onBlock(pStats, now, state) {
      const pct = value(pStats, "regionBlockEmpower");
      if (pct > 0) state.regionBlockEmpower = { pct, until: now + this.rules.blockEmpowerMs };
    }
    consumeBlockEmpower(now, state) {
      const buff = state.regionBlockEmpower;
      if (!buff || num(buff.until) <= now) return 1;
      state.regionBlockEmpower = null;
      return 1 + Math.max(0, num(buff.pct)) / 100;
    }
    takenDamageMultiplier(pStats, attacker, state) {
      if (!pStats || !pStats.regionAffix) return 1;
      let pct = num(state.playerHp) <= num(pStats.maxHp) * this.rules.lowLifeRatio ? value(pStats, "regionLowLifeDR") : 0;
      if (hasAilment(attacker, "chill")) pct += value(pStats, "regionChilledAttackerDR");
      return 1 - Math.min(this.rules.takenReductionCapPct, pct) / 100;
    }
    moveBonus(now, state) {
      const buff = state.regionCritMove;
      return buff && num(buff.until) > now ? Math.max(0, num(buff.pct)) : 0;
    }
  };
  var createRegionAffixStats = (definitions, rules) => Object.freeze(new RegionAffixStats(definitions, rules));

  // modules/domain/player-recovery-caps.mjs
  function createPlayerRecoveryCaps(constants) {
    function applyLeechSoftcap(rawLeech) {
      let raw = Math.max(0, Number(rawLeech) || 0);
      if (raw <= constants.LEECH_SOFTCAP_START) return raw;
      let midSpan = Math.max(0, Math.min(raw, constants.LEECH_SOFTCAP_MID) - constants.LEECH_SOFTCAP_START);
      let highSpan = Math.max(0, raw - constants.LEECH_SOFTCAP_MID);
      return constants.LEECH_SOFTCAP_START + midSpan * constants.LEECH_SOFTCAP_MID_EFF + highSpan * constants.LEECH_SOFTCAP_HIGH_EFF;
    }
    function getLeechCaps(pStats, target) {
      let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
      let maxEnergyShield = Math.max(0, Number(pStats && pStats.energyShield) || 0);
      let leechPool = target === "energyShield" ? Math.max(1, maxEnergyShield) : maxHp;
      let instancePct = leechPercent(constants.LEECH_BASE_INSTANCE_CAP_PCT, pStats, "leechInstanceCap");
      let totalPct = leechPercent(constants.LEECH_BASE_TOTAL_CAP_PCT, pStats, "leechTotalCap");
      let ratePct = leechPercent(constants.LEECH_BASE_RATE_CAP_PCT, pStats, "leechRateCap");
      return {
        instanceCap: leechPool * instancePct / 100,
        totalCap: leechPool * totalPct / 100,
        rateCap: leechPool * ratePct / 100,
        instancePct,
        totalPct,
        ratePct
      };
    }
    function leechPercent(base, stats, field) {
      return Math.max(0, base + (Number(stats && stats[field]) || 0));
    }
    function getPlayerEnergyShieldRecoveryCap(pStats) {
      let baseCap = Math.max(0, Number(pStats && pStats.energyShield) || 0);
      let overhealPct = Math.max(0, Number(pStats && pStats.uniqueOverhealCapPct) || 0);
      return baseCap * (100 + overhealPct) / 100;
    }
    function floorIncomingDamage(amount) {
      return Math.max(0, Math.floor(Math.max(0, Number(amount) || 0)));
    }
    function hp(stats, halfLife) {
      const maxHp = Math.max(0, stats.maxHp || 0);
      return halfLife ? maxHp * 0.5 : maxHp;
    }
    function recovery(baseCap, stats, occupied) {
      const overhealPct = Math.max(0, Number(stats && stats.uniqueOverhealCapPct) || 0);
      return Math.max(1, baseCap * (100 + overhealPct) / 100 - occupied);
    }
    return Object.freeze({ softcap: applyLeechSoftcap, leech: getLeechCaps, shield: getPlayerEnergyShieldRecoveryCap, floorDamage: floorIncomingDamage, hp, recovery });
  }

  // modules/domain/player-recovery.mjs
  function getPlayerHitLeechPercent(pStats) {
    const tags = pStats.sSkill?.tags || [];
    if (tags.includes("spell")) return Math.max(0, pStats.spellLeech || 0);
    if (pStats.passiveKeystoneFlags?.soulSanctuary) return 0;
    return tags.includes("attack") ? Math.max(0, pStats.leech || 0) : 0;
  }
  function hitLeechTarget(pStats, deps) {
    let target = deps.ownsKeystone("wlk3") && pStats.energyShield > 0 ? "energyShield" : "life";
    if (pStats.passiveKeystoneFlags?.soulSanctuary && pStats.sSkill.tags.includes("spell")) target = "energyShield";
    return target;
  }
  function applyHitLeech(owner, pStats, hitDamage, chaosDamage, deps) {
    const target = hitLeechTarget(pStats, deps);
    const attackAllowed = pStats.sSkill.tags.includes("attack") && !pStats.passiveKeystoneFlags?.soulSanctuary;
    const chaosPct = attackAllowed ? pStats.uniqueChaosDamageInstantLeechPct : 0;
    let recovered = recoverInstantLeech(owner, chaosDamage * chaosPct / 100, pStats, target, deps);
    const amount = hitDamage * getPlayerHitLeechPercent(pStats) / 100;
    if (!(amount > 0)) return recovered;
    recovered += recoverInstantLeech(owner, amount * pStats.uniqueInstantLeechPct / 100, pStats, target, deps);
    if (pStats.sSkill.instantLeech) recovered += recoverInstantLeech(owner, amount, pStats, target, deps);
    else storeLeech(owner, amount, pStats, target, deps);
    return recovered;
  }
  function getActiveLeechInstances(owner) {
    owner.playerLeechInstances = Array.isArray(owner.playerLeechInstances) ? owner.playerLeechInstances : [];
    owner.playerLeechInstances = owner.playerLeechInstances.map((inst) => ({
      remaining: Math.max(0, Number(inst && inst.remaining) || 0),
      rate: Math.max(0, Number(inst && inst.rate) || 0),
      target: inst && inst.target === "energyShield" ? "energyShield" : "life"
    })).filter((inst) => inst.remaining > 0 && inst.rate > 0);
    return owner.playerLeechInstances;
  }
  function outstandingLeech(owner) {
    return getActiveLeechInstances(owner).reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
  }
  function storeLeech(owner, rawAmount, pStats, target, deps) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    let caps2 = deps.caps.leech(pStats, target === "energyShield" ? "energyShield" : "life");
    if (caps2.instanceCap <= 0 || caps2.totalCap <= 0 || caps2.rateCap <= 0) return 0;
    let instances = getActiveLeechInstances(owner);
    let outstanding = instances.reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
    let allowed = Math.max(0, caps2.totalCap - outstanding);
    let stored = Math.min(amount, caps2.instanceCap, allowed);
    if (stored <= 0) return 0;
    instances.push({
      remaining: stored,
      rate: caps2.rateCap,
      target: target === "energyShield" ? "energyShield" : "life"
    });
    owner.playerLeechInstances = instances;
    return stored;
  }
  function recoverInstantLeech(owner, rawAmount, pStats, target, deps) {
    let leechTarget = target === "energyShield" ? "energyShield" : "life";
    let instantAmount = Math.max(0, Number(rawAmount) || 0);
    if (instantAmount <= 0) return 0;
    let caps2 = deps.caps.leech(pStats, leechTarget);
    if (caps2.instanceCap <= 0) return 0;
    instantAmount = Math.min(instantAmount, caps2.instanceCap);
    if (leechTarget === "energyShield") {
      let esCap = deps.caps.shield(pStats);
      if (esCap <= 0) return 0;
      let before2 = Math.max(0, Number(owner.playerEnergyShield) || 0);
      owner.playerEnergyShield = Math.min(esCap, before2 + instantAmount);
      return Math.max(0, owner.playerEnergyShield - before2);
    }
    let hpCap = deps.lifeCap(pStats);
    let before = Math.max(0, Number(owner.playerHp) || 0);
    owner.playerHp = Math.min(hpCap, before + instantAmount);
    let recovered = Math.max(0, owner.playerHp - before);
    return recovered;
  }
  function consumeLeechTick(owner, instance, tick, limits, stats) {
    const shield = instance.target === "energyShield";
    const cap = shield ? limits.shield : limits.life;
    let gained = 0;
    let consumed = tick;
    if (!shield || cap > 0) {
      const field = shield ? "playerEnergyShield" : "playerHp";
      const before = Math.max(0, Number(owner[field]) || 0);
      owner[field] = Math.min(cap, before + tick);
      gained = Math.max(0, owner[field] - before);
      consumed = gained > 0 || !(stats && stats.leechKeepFullLife) ? tick : 0;
    }
    instance.remaining = Math.max(0, instance.remaining - consumed);
    return gained;
  }
  function tickLeech(owner, pStats, dt, deps) {
    let instances = getActiveLeechInstances(owner);
    if (instances.length === 0 || dt <= 0) return 0;
    const limits = { life: deps.lifeCap(pStats), shield: deps.caps.shield(pStats) };
    let healed = 0;
    let next = [];
    instances.forEach((inst) => {
      let tick = Math.min(inst.remaining, inst.rate * dt);
      if (tick <= 0) return;
      healed += consumeLeechTick(owner, inst, tick, limits, pStats);
      if (inst.remaining > 0) next.push(inst);
    });
    owner.playerLeechInstances = next;
    return healed;
  }
  function getActiveRecoupInstances(owner) {
    owner.playerRecoupInstances = Array.isArray(owner.playerRecoupInstances) ? owner.playerRecoupInstances : [];
    owner.playerRecoupInstances = owner.playerRecoupInstances.map((inst) => ({ remaining: Math.max(0, Number(inst && inst.remaining) || 0), rate: Math.max(0, Number(inst && inst.rate) || 0) })).filter((inst) => inst.remaining > 0 && inst.rate > 0);
    return owner.playerRecoupInstances;
  }
  function storeRecoup(owner, rawAmount, durationSec) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    let duration = Math.max(0.5, Number(durationSec) || 4);
    if (amount <= 0) return 0;
    let instances = getActiveRecoupInstances(owner);
    instances.push({ remaining: amount, rate: amount / duration });
    owner.playerRecoupInstances = instances;
    return amount;
  }
  function tickRecoup(owner, pStats, dt, deps) {
    let instances = getActiveRecoupInstances(owner);
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = deps.lifeCap(pStats);
    let healed = 0;
    let next = [];
    instances.forEach((inst) => {
      let tick = Math.min(inst.remaining, inst.rate * dt);
      if (tick <= 0) return;
      let before = Math.max(0, Number(owner.playerHp) || 0);
      owner.playerHp = Math.min(hpCap, before + tick);
      healed += Math.max(0, owner.playerHp - before);
      inst.remaining = Math.max(0, inst.remaining - tick);
      if (inst.remaining > 0) next.push(inst);
    });
    owner.playerRecoupInstances = next;
    return healed;
  }
  function createPlayerRecovery(deps) {
    return Object.freeze({
      hitTarget: (pStats) => hitLeechTarget(pStats, deps),
      hit: (owner, pStats, hitDamage, chaosDamage) => applyHitLeech(owner, pStats, hitDamage, chaosDamage, deps),
      outstanding: outstandingLeech,
      store: (owner, rawAmount, pStats, target) => storeLeech(owner, rawAmount, pStats, target, deps),
      instant: (owner, rawAmount, pStats, target) => recoverInstantLeech(owner, rawAmount, pStats, target, deps),
      tick: (owner, pStats, dt) => tickLeech(owner, pStats, dt, deps),
      recoup: storeRecoup,
      tickRecoupQueue: (owner, pStats, dt) => tickRecoup(owner, pStats, dt, deps)
    });
  }

  // modules/domain/player-wards.mjs
  function maximumWardAmount(stats, config) {
    return Math.max(1, Math.floor(Math.max(1, Number(stats.maxHp) || 1) * Math.max(0, Number(config.hpPct || 12)) / 100));
  }
  function wardCooldownMs(config) {
    return Math.max(1e3, Math.floor(Math.max(1, Number(config.cooldown || 20)) * 1e3));
  }
  function* refreshDeathWard(owner, pStats, clock) {
    let cfg = pStats && pStats.uniqueDeathWard;
    if (!cfg) {
      owner.realmDeathWard = null;
      return null;
    }
    let state = owner.realmDeathWard && typeof owner.realmDeathWard === "object" ? owner.realmDeathWard : { amount: 0, maxAmount: 0, readyAt: 0 };
    let maxAmount = maximumWardAmount(pStats, cfg);
    state.maxAmount = maxAmount;
    if ((state.amount || 0) <= 0 && clock() >= (state.readyAt || 0)) {
      state.amount = maxAmount;
      state.readyAt = 0;
      yield maxAmount;
    } else {
      state.amount = Math.min(maxAmount, Math.max(0, Math.floor(state.amount || 0)));
    }
    owner.realmDeathWard = state;
    return state;
  }
  function absorbDeathWard(state, remaining, pStats, clock) {
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(state.amount || 0)));
    state.amount = Math.max(0, Math.floor((state.amount || 0) - absorbed));
    remaining -= absorbed;
    if (state.amount <= 0) {
      let cooldownMs = wardCooldownMs(pStats.uniqueDeathWard);
      state.readyAt = clock() + cooldownMs;
    }
    return { remaining, absorbed };
  }
  function absorbStoneShield(owner, amount, clock) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let runtime = owner.talentCardRuntime;
    if (remaining <= 0 || !runtime || typeof runtime !== "object") return { remaining, absorbed: 0 };
    if ((runtime.stoneShieldExpiresAt || 0) <= clock()) {
      delete runtime.stoneShieldAmount;
      delete runtime.stoneShieldMax;
      delete runtime.stoneShieldExpiresAt;
      return { remaining, absorbed: 0 };
    }
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(Number(runtime.stoneShieldAmount) || 0)));
    runtime.stoneShieldAmount = Math.max(0, Math.floor((runtime.stoneShieldAmount || 0) - absorbed));
    return { remaining: remaining - absorbed, absorbed };
  }
  function createPlayerWards(clock) {
    return Object.freeze({
      // Consume synchronously: the restored amount is notified before the owner assignment resumes.
      refresh: (owner, stats) => refreshDeathWard(owner, stats, clock),
      absorb: (ward, remaining, stats) => absorbDeathWard(ward, remaining, stats, clock),
      stone: (owner, amount) => absorbStoneShield(owner, amount, clock)
    });
  }

  // modules/combat-resources-classic.mjs
  var applyDamageToEnemyResource = (enemy, damage) => {
    const dealt = damageEnemyResource(enemy, damage);
    if (dealt === null) return 0;
    combatIncidents.noteDamage(enemy, dealt);
    return dealt;
  };
  var getEnemyLifeAndShield = enemyLifeAndShield;
  var applyEnemyRegen = createEnemyRegeneration({
    clock: () => getCombatTime(),
    conditionDebuffs: (enemy) => getEnemyConditionDebuffFactor(enemy),
    talentMultiplier: (enemy) => typeof getTalentEnemyRegenMultiplier === "function" ? getTalentEnemyRegenMultiplier(enemy) : 1,
    finisherWarningMs: ATLAS_ENDGAME.combo.finisherWarningMs
  });
  var regionAffixes = createRegionAffixStats(REGION_AFFIX_MODS, REGION_AFFIX_EFFECTS);
  var caps = createPlayerRecoveryCaps({
    LEECH_SOFTCAP_START,
    LEECH_SOFTCAP_MID,
    LEECH_SOFTCAP_MID_EFF,
    LEECH_SOFTCAP_HIGH_EFF,
    LEECH_BASE_INSTANCE_CAP_PCT,
    LEECH_BASE_TOTAL_CAP_PCT,
    LEECH_BASE_RATE_CAP_PCT
  });
  var player = createPlayerRecovery({ caps, lifeCap: (stats) => getPlayerRecoveryHpCap(stats), ownsKeystone: (key) => hasKeystone(key) });
  var wards = createPlayerWards(() => getCombatTime());
  window.GameModules.combat.resources = Object.freeze({ lifeDamagePct: enemyLifeDamagePct, regionAffixes, caps, player, wards });
  var mitigation = createEnemyMitigation({
    clock: () => getCombatTime(),
    ownsKeystone: (key) => hasKeystone(key),
    keptResistancePct: () => ASCENDANCY_KEYSTONE_VALUES.iq4.resistanceKeptPct,
    minimumResistance: () => MIN_PENETRATED_RESISTANCE,
    regionAffixes
  });
  var getEnemyMitigationBeforeWeak = (element, tier, enemy, stats) => mitigation.beforeWeak(element, tier, enemy, stats, game);
  var getEffectiveEnemyMitigation = (element, tier, enemy, stats) => mitigation.effective(element, tier, enemy, stats, game);
  var getHitEnemyResistance = (element, tier, enemy, stats, curse) => mitigation.hit(element, tier, enemy, { stats, curse, state: game });
  var applyVoidWeakMitigation = (enemy, amount) => mitigation.weak(enemy, amount);
  var applyAilingTargetDamage = (stats, enemy, element, crit, damages) => mitigation.ailing(enemy, element, crit, damages, { stats, state: game });
  safeExposeGlobals({
    applyDamageToEnemyResource,
    getEnemyLifeAndShield,
    applyEnemyRegen,
    ENEMY_REGEN_FATIGUE_MS,
    ENEMY_REGEN_STEP_MS,
    getEnemyMitigationBeforeWeak,
    getEffectiveEnemyMitigation,
    getHitEnemyResistance,
    applyVoidWeakMitigation,
    applyAilingTargetDamage
  });
})();
