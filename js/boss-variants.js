// GENERATED from modules/boss-variants*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/boss-variant-catalog.mjs
  var FIXED_ZONE_TYPES = /* @__PURE__ */ new Set(["outsideChaos", "beyondBoundary"]);
  function createBossVariantCatalog(rules) {
    return {
      rules,
      byId: new Map(rules.kinds.map((kind) => [kind.id, kind])),
      ids: Object.freeze(rules.kinds.map((kind) => kind.id))
    };
  }
  function variantEligible(enemy, zone) {
    return !!enemy && enemy.isBoss && !enemy.bossVariant && !!zone && !FIXED_ZONE_TYPES.has(zone.type) && !zone.milestonePinnacle && zone.id !== "cosmos_astra";
  }
  function variantPick(catalog2, random) {
    const pool = catalog2.rules.kinds;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
  function variantKind(catalog2, id) {
    return catalog2.byId.get(id) || null;
  }
  function variantNormalizeKills(catalog2, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return Object.fromEntries(catalog2.ids.map((id) => [id, Math.max(0, Math.min(1e6, Math.floor(Number(source[id]) || 0)))]).filter(([, count]) => count > 0));
  }
  function variantRecords(catalog2, state) {
    return catalog2.ids.map((id) => ({ kind: catalog2.byId.get(id), kills: (state.atlas.memory.variants || {})[id] || 0 }));
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

  // modules/domain/boss-variant-lifecycle.mjs
  function variantOpen(env2, state) {
    return env2.deps.contentProgression.holds("bossVariant", state);
  }
  function variantDress(catalog2, enemy) {
    const kind = catalog2.byId.get(enemy && enemy.bossVariant);
    if (!kind) return enemy;
    if (!String(enemy.name || "").includes(kind.name)) enemy.name = `${enemy.name} (${kind.name})`;
    return Object.assign(enemy, { bossVisualTint: kind.hue, variantOutline: kind.outline });
  }
  function variantApply(catalog2, enemy, kind) {
    for (const [key, mul] of Object.entries(kind.mul)) {
      const base = Number(enemy[key]);
      enemy[key] = (Number.isFinite(base) ? base : 1) * mul;
    }
    for (const [key, add] of Object.entries(kind.add)) enemy[key] = (Number(enemy[key]) || 0) + add;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp));
    enemy.hp = enemy.maxHp;
    if (kind.shieldPct > 0) {
      enemy.maxEnergyShield = Math.max(Number(enemy.maxEnergyShield) || 0, Math.floor(enemy.maxHp * kind.shieldPct / 100));
      enemy.energyShield = enemy.maxEnergyShield;
    }
    Object.assign(enemy, {
      bossVariant: kind.id,
      ele: kind.ele,
      dropMul: (Number(enemy.dropMul) || 1) * catalog2.rules.reward.dropMul,
      expMul: (Number(enemy.expMul) || 1) * catalog2.rules.reward.expMul
    });
    return variantDress(catalog2, enemy);
  }
  function* variantAnnounce(enemy, recalled) {
    yield { kind: "dispatchRuntimeEvent", args: ["boss-variant", { kind: "spawn", name: enemy.name, variant: enemy.bossVariant, recalled }] };
  }
  function variantAtlasChance(owner, zone) {
    const run = zone && zone.type === "atlasMap" && owner.atlas ? owner.atlas.run : null;
    return (Number(run && run.bonus && run.bonus.variantChance) || 0) / 100;
  }
  function* variantMaybeApply(env2, enemy, zone, random = Math.random) {
    if (!variantOpen(env2, env2.owner) || !variantEligible(enemy, zone) || random() >= env2.catalog.rules.chance + variantAtlasChance(env2.owner, zone)) return enemy;
    variantApply(env2.catalog, enemy, variantPick(env2.catalog, random));
    yield* variantAnnounce(enemy, false);
    return enemy;
  }
  function* variantRecall(env2, enemy, tier, random = Math.random) {
    const chance = env2.catalog.rules.recall[tier - 1] || 0;
    if (!enemy || enemy.bossVariant || random() >= chance) return enemy;
    variantApply(env2.catalog, enemy, variantPick(env2.catalog, random));
    yield* variantAnnounce(enemy, true);
    return enemy;
  }
  function variantLedger(state) {
    const memory = state.atlas.memory;
    if (!memory.variants || typeof memory.variants !== "object") memory.variants = {};
    return memory.variants;
  }
  function variantMemory(env2, state) {
    const zone = typeof env2.deps.getZone === "function" ? env2.deps.getZone(state.currentZoneId) : null;
    if (!zone || zone.type !== "atlasMap" || !zone.atlasNode || typeof env2.deps.memoryDungeon !== "object" || !env2.deps.memoryDungeon.open(state)) return null;
    return env2.deps.memoryDungeon.give(state, zone.atlasNode, env2.catalog.rules.reward.memoryTier) ? { node: zone.atlasNode, tier: env2.catalog.rules.reward.memoryTier } : null;
  }
  function* variantOnKilled(env2, state, enemy) {
    const kind = env2.catalog.byId.get(enemy && enemy.bossVariant);
    if (!kind || !state.atlas || !state.atlas.memory) return null;
    const book = variantLedger(state), first = !(book[kind.id] > 0);
    book[kind.id] = (book[kind.id] || 0) + 1;
    if (first) env2.catalog.rules.reward.firstKill.forEach(([key, amount]) => env2.deps.awardCurrency(key, amount));
    const out = { kind: "kill", name: enemy.name, variant: kind.id, first, gift: first ? env2.catalog.rules.reward.firstKill : [], memory: variantMemory(env2, state) };
    yield { kind: "dispatchRuntimeEvent", args: ["boss-variant", out] };
    return out;
  }

  // modules/boss-variants-classic.mjs
  var catalog = createBossVariantCatalog(BOSS_VARIANTS);
  var env = { get owner() {
    return game;
  }, catalog, deps: {
    get contentProgression() {
      return contentProgression;
    },
    get getZone() {
      return typeof getZone === "undefined" ? void 0 : getZone;
    },
    get memoryDungeon() {
      return typeof memoryDungeon === "undefined" ? void 0 : memoryDungeon;
    },
    get awardCurrency() {
      return awardCurrency;
    }
  } };
  var bossVariants = Object.freeze({
    open(state) {
      return variantOpen(env, state);
    },
    maybeApply(enemy, zone, random) {
      return runRuntimeEventCommands(variantMaybeApply(env, enemy, zone, random), dispatchRuntimeEvent);
    },
    recall(enemy, tier, random) {
      return runRuntimeEventCommands(variantRecall(env, enemy, tier, random), dispatchRuntimeEvent);
    },
    dress(enemy) {
      return variantDress(catalog, enemy);
    },
    apply(enemy, kind) {
      return variantApply(catalog, enemy, kind);
    },
    onKilled(state, enemy) {
      return runRuntimeEventCommands(variantOnKilled(env, state, enemy), dispatchRuntimeEvent);
    },
    normalizeKills(raw) {
      return variantNormalizeKills(catalog, raw);
    },
    records(state) {
      return variantRecords(catalog, state);
    },
    kind(id) {
      return variantKind(catalog, id);
    }
  });
  safeExposeGlobals({ bossVariants });
})();
