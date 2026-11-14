// GENERATED from modules/talisman-combat*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/talisman-conditions.mjs
  function hexLifePct(env2, pStats) {
    return (Number(env2.owner.playerHp) || 0) / Math.max(1, Number(pStats.maxHp) || 1) * 100;
  }
  function hexConditionMet(env2, when, pStats) {
    if (when === "lowLife") return hexLifePct(env2, pStats) <= env2.deps.TALISMAN_HEX_RULES.lowLifePct;
    if (when === "fullLife") return hexLifePct(env2, pStats) >= env2.deps.TALISMAN_HEX_RULES.fullLifePct;
    const alive = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
    if (when === "boss") return alive.some((enemy) => enemy.isBoss);
    return when === "crowd" && alive.length >= env2.deps.TALISMAN_HEX_RULES.crowdCount;
  }
  function hexStrongest(env2, kindTest) {
    const byId = /* @__PURE__ */ new Map();
    env2.deps.talismanEffects.summarize().conditions.forEach((line) => {
      if (kindTest(line.kind) && !(byId.get(line.id)?.value >= line.value)) byId.set(line.id, line);
    });
    return [...byId.values()];
  }
  function hexStrength(line) {
    return line.delta ? line.value / 100 : line.value / Math.max(1e-9, line.max);
  }
  function hexToEffect(env2, line) {
    return { buff: { name: "talisman:" + line.id, type: line.kind }, delta: env2.deps.talismans.conditionDelta(line) };
  }
  function hexInstantWarcry(env2) {
    return typeof env2.deps.isTalentInstantWarcryActive === "function" && env2.deps.isTalentInstantWarcryActive();
  }
  function hexAlwaysOn(line, pStats, quake) {
    return quake && line.kind === "warcry" || !!pStats.cosmosGuardianAlways && line.kind === "guard";
  }
  function hexEffects(env2, pStats) {
    if (pStats.uniqueClosedEyes) return env2.memo.lastActive = [];
    const quake = hexInstantWarcry(env2);
    const lines = hexStrongest(env2, (kind) => kind !== "curse").filter((line) => hexAlwaysOn(line, pStats, quake) || hexConditionMet(env2, line.when, pStats));
    const warcries = lines.filter((line) => line.kind === "warcry");
    const applied = quake ? lines.filter((line) => line.kind !== "warcry").concat(warcries.sort((a, b) => hexStrength(b) - hexStrength(a)).slice(0, 1)) : lines;
    const out = applied.map((line) => hexToEffect(env2, line));
    const resonance = Number(pStats.uniqueWarcryResonancePct) || 0;
    if (resonance > 0 && warcries.length) out.push({ buff: { name: "talisman:resonance", type: "warcry" }, delta: { pctDmg: warcries.length * resonance } });
    return env2.memo.lastActive = out;
  }
  function hexActive(env2) {
    return env2.memo.lastActive;
  }
  function hexHexTarget(env2) {
    return (env2.owner.enemies || []).find((enemy) => enemy && enemy.hp > 0 && !enemy.curseImmune) || null;
  }
  function hexApplyHex(env2, target, line, pStats, now) {
    const manual = pStats.uniqueConditionManual || {};
    const permanent = typeof env2.deps.getPreciseTalentLevel === "function" && env2.deps.getPreciseTalentLevel("hero5__warlock");
    const durationMs = Math.floor(env2.deps.TALISMAN_HEX_RULES.durationMs * (1 + Math.max(0, Number(manual.durationPct) || 0) / 100));
    const name = "talisman:" + line.id;
    const list = (env2.owner.enemyConditionDebuffs[target.id] || []).filter((row) => row && row.name !== name);
    list.push({ name, delta: env2.deps.talismans.conditionDelta(line), expiresAt: permanent ? Number.MAX_SAFE_INTEGER : now + durationMs, durationMs });
    env2.owner.enemyConditionDebuffs[target.id] = list.slice(-Math.max(1, Math.floor(pStats.curseCap || 1)));
  }
  function hexHexInterval(env2, pStats) {
    const manualPct = Math.max(0, Number((pStats.uniqueConditionManual || {}).cdrPct) || 0);
    return env2.deps.getSkillCooldownMs(env2.deps.TALISMAN_HEX_RULES.intervalMs, pStats, { extraReductionPct: manualPct, reductionCapPct: 90, floorMs: 1e3 });
  }
  function hexApplyHexes(env2, pStats, now) {
    if (pStats.uniqueClosedEyes) return;
    const lines = hexStrongest(env2, (kind) => kind === "curse");
    const target = lines.length ? hexHexTarget(env2) : null;
    if (!target) return;
    env2.owner.enemyConditionDebuffs = env2.owner.enemyConditionDebuffs || {};
    const interval = hexHexInterval(env2, pStats);
    lines.forEach((line) => {
      const wait = (env2.memo.readyAt.get(line.id) || 0) - now;
      if (wait > 0 && wait <= interval) return;
      env2.memo.readyAt.set(line.id, now + interval);
      hexApplyHex(env2, target, line, pStats, now);
    });
  }
  function createTalismanCombatOwner(bindings) {
    const env2 = { get owner() {
      return bindings.owner;
    }, deps: bindings.deps, memo: { readyAt: /* @__PURE__ */ new Map(), lastActive: [] } };
    return Object.freeze({
      effects(stats) {
        return hexEffects(env2, stats);
      },
      active() {
        return hexActive(env2);
      },
      applyHexes(stats, now) {
        return hexApplyHexes(env2, stats, now);
      },
      conditionMet(when, stats) {
        return hexConditionMet(env2, when, stats);
      }
    });
  }

  // modules/talisman-combat-classic.mjs
  var deps = {
    get TALISMAN_HEX_RULES() {
      return TALISMAN_HEX_RULES;
    },
    get talismanEffects() {
      return talismanEffects;
    },
    get talismans() {
      return talismans;
    },
    get isTalentInstantWarcryActive() {
      return typeof isTalentInstantWarcryActive === "undefined" ? void 0 : isTalentInstantWarcryActive;
    },
    get getPreciseTalentLevel() {
      return typeof getPreciseTalentLevel === "undefined" ? void 0 : getPreciseTalentLevel;
    },
    get getSkillCooldownMs() {
      return getSkillCooldownMs;
    }
  };
  var env = { get owner() {
    return game;
  }, deps };
  var talismanCombat = createTalismanCombatOwner(env);
  safeExposeGlobals({ talismanCombat });
})();
