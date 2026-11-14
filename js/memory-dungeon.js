// GENERATED from modules/memory-dungeon*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/memory-dungeon-ledger.mjs
  function memoryArenaDefaults() {
    return { tickets: {}, best: {}, variants: {} };
  }
  function memoryArenaLedger(state) {
    return state.atlas.memory;
  }
  function memoryArenaEmptyRow(env) {
    return Array(env.M.tiers).fill(0);
  }
  function memoryArenaCount(state, nodeId, tier) {
    return (memoryArenaLedger(state).tickets[nodeId] || [])[tier - 1] || 0;
  }
  function memoryArenaGive(env, state, nodeId, tier, force = false) {
    const book = memoryArenaLedger(state), row = book.tickets[nodeId] || memoryArenaEmptyRow(env);
    if (row[tier - 1] >= (force ? env.refundCap : env.M.ticketCap)) return false;
    row[tier - 1] += 1;
    book.tickets[nodeId] = row;
    return true;
  }
  function memoryArenaTake(state, nodeId, tier) {
    const row = memoryArenaLedger(state).tickets[nodeId];
    row[tier - 1] -= 1;
    if (row.every((value) => value <= 0)) delete memoryArenaLedger(state).tickets[nodeId];
  }
  function memoryArenaSpend(state, nodeId, tier) {
    return memoryArenaTake(state, nodeId, tier);
  }
  function memoryArenaRefund(env, state, map) {
    return memoryArenaGive(env, state, map.node, map.memory, true);
  }
  function memoryArenaTotal(state) {
    return Object.values(memoryArenaLedger(state).tickets).reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
  }

  // modules/domain/memory-dungeon-access.mjs
  function memoryArenaOpen(env, state) {
    return env.deps.contentProgression.holds("memoryDungeon", state);
  }
  function memoryArenaValidTier(env, value) {
    return Number.isInteger(value) && value >= 1 && value <= env.M.tiers;
  }
  function memoryArenaMaxTier(env, state) {
    return env.deps.contentProgression.holds("memoryDeep", state) ? env.M.tiers : env.M.highTiers.from - 1;
  }
  function memoryArenaEntryReason(env, state, nodeId, tier) {
    if (!memoryArenaOpen(env, state)) return "기억 던전 해금 뒤에 열립니다.";
    if (!env.deps.atlas.node(nodeId) || !memoryArenaValidTier(env, tier)) return "없는 기억입니다.";
    if (tier > memoryArenaMaxTier(env, state)) return env.deps._t("{tier}단계는 기억 던전 4, 5 해금 뒤에 도전할 수 있습니다.", { tier });
    const lock = env.deps.atlas.lockReason(state);
    if (lock) return lock;
    if (state.atlas.run) return env.deps.atlas.runOpenReason(state);
    return memoryArenaCount(state, nodeId, tier) > 0 ? "" : "그 단계의 기억이 없습니다.";
  }
  function memoryArenaMapTier(env, state, node, tier) {
    return Math.min(env.deps.ATLAS.tierCap, env.deps.atlas.effectiveTier(state, node) + env.M.fight.tierStep * tier);
  }

  // modules/domain/memory-dungeon-restore.mjs
  function memoryArenaNormalizeRow(env, raw) {
    const row = memoryArenaEmptyRow(env).map((zero, index) => Math.max(0, Math.min(env.refundCap, Math.floor(Number(Array.isArray(raw) ? raw[index] : 0) || 0))));
    return row.some((value) => value > 0) ? row : null;
  }
  function memoryArenaNormalizeTickets(env, raw) {
    const out = {};
    for (const [id, row] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
      const kept = env.deps.atlas.node(id) ? memoryArenaNormalizeRow(env, row) : null;
      if (kept) out[id] = kept;
    }
    return out;
  }
  function memoryArenaNormalizeBest(env, raw) {
    return Object.fromEntries(Object.entries(raw && typeof raw === "object" ? raw : {}).filter(([id, tier]) => env.deps.atlas.node(id) && memoryArenaValidTier(env, tier)));
  }
  function memoryArenaNormalizeVariants(env, raw) {
    return typeof env.deps.bossVariants === "object" ? env.deps.bossVariants.normalizeKills(raw) : {};
  }
  function memoryArenaNormalize(env, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return { tickets: memoryArenaNormalizeTickets(env, source.tickets), best: memoryArenaNormalizeBest(env, source.best), variants: memoryArenaNormalizeVariants(env, source.variants) };
  }

  // modules/domain/memory-dungeon-fight.mjs
  function memoryArenaBoost(env, map) {
    const tier = map && map.memory;
    return memoryArenaValidTier(env, tier) ? { hp: env.M.fight.hpMul[tier - 1], damage: env.M.fight.damageMul[tier - 1] } : { hp: 1, damage: 1 };
  }
  function memoryArenaZoneName(env, map, node) {
    return memoryArenaValidTier(env, map.memory) ? env.deps._t("{name}: 기억 {memory}단계", { name: node.name, memory: map.memory }) : node.name;
  }
  function memoryArenaTuneBoss(env, enemy, tier) {
    enemy.name = `${enemy.name}의 기억`;
    enemy.bossVisualTint = env.M.fight.tint;
    if (!enemy.apexMechanic) Object.assign(enemy, { patternMode: "apex", apexMechanic: env.M.fight.mechanic });
    if (typeof env.deps.bossVariants === "object") env.deps.bossVariants.recall(enemy, tier);
    return enemy;
  }

  // modules/domain/memory-dungeon-rewards.mjs
  function memoryArenaMemoryDropMul(bonus) {
    return 1 + (Number(bonus.memoryDrop) || 0) / 100;
  }
  function memoryArenaRollTicket(env, state, node, map, ...selection) {
    const [random, bonus] = selection;
    const tier = memoryArenaValidTier(env, map.memory) ? map.memory + 1 : 1;
    if (!memoryArenaOpen(env, state) || tier > memoryArenaMaxTier(env, state)) return null;
    const chance = tier > 1 ? env.M.ladder[tier - 2] : (env.M.ticketDrop[node.kind] || 0) * memoryArenaMemoryDropMul(bonus);
    return random() < chance && memoryArenaGive(env, state, node.id, tier) ? { node: node.id, name: node.boss, tier } : null;
  }
  function memoryArenaOwnUnique(env, node, random = null) {
    const list = [].concat((env.deps.atlasEndgame.def(node.id) || {}).unique || []);
    if (!list.length) return null;
    return random ? list[Math.floor(random() * list.length)] : list.join(" 또는 ");
  }
  function memoryArenaRewardExpectations(env, tier, mapTierValue) {
    const scale = Math.max(env.M.rewardScale.min, Math.min(env.M.rewardScale.max, mapTierValue / env.M.rewardTier));
    return [...env.M.rewards.map(([key, base, perTier]) => [key, base + perTier * tier]), ["burningEmberBranch", env.M.burning[tier - 1]]].map(([key, expected]) => [key, expected * scale]);
  }
  function memoryArenaRolledRewards(env, state, tier, mapTierValue, random) {
    return memoryArenaRewardExpectations(env, tier, mapTierValue).map(([key, expected]) => [key, Math.floor(expected) + Number(random() < expected % 1)]).filter(([key, amount]) => amount > 0 && env.deps.contentProgression.canDropCurrency(key, state));
  }
  function memoryArenaSpoils(env, state, node, tier, random) {
    const own = memoryArenaOwnUnique(env, node, random), book = memoryArenaLedger(state), best = (book.best[node.id] || 0) < tier;
    if (best) book.best[node.id] = tier;
    const unique = random() < env.M.uniqueChance[own ? "own" : "other"][tier - 1] ? own || "any" : null;
    return { tier, rewards: memoryArenaRolledRewards(env, state, tier, memoryArenaMapTier(env, state, node, tier), random), unique, gear: tier >= env.M.gearFrom, best };
  }
  function memoryArenaSettle(env, state, node, map, ...selection) {
    const [random = Math.random, bonus = {}] = selection;
    const fight = memoryArenaValidTier(env, map.memory) ? memoryArenaSpoils(env, state, node, map.memory, random) : null;
    return { ticket: memoryArenaRollTicket(env, state, node, map, random, bonus), spoils: fight };
  }

  // modules/domain/memory-dungeon-preview.mjs
  function memoryArenaNextMemoryPreview(env, state, node, tier) {
    if (tier >= env.M.tiers) return null;
    const nextTier = tier + 1, have = memoryArenaCount(state, node.id, nextTier);
    const reason = nextTier > memoryArenaMaxTier(env, state) ? env.deps._t("{nextTier}단계 기억은 기억 던전 4, 5 해금 뒤에 얻을 수 있습니다.", { nextTier }) : have >= env.M.ticketCap ? env.deps._t("다음 단계 기억의 보관 한도 {ticketCap}개에 도달했습니다.", { ticketCap: env.M.ticketCap }) : "";
    return { tier: nextTier, chance: reason ? 0 : env.M.ladder[tier - 1], reason, have, cap: env.M.ticketCap };
  }
  function memoryArenaPreview(env, state, nodeId, tier) {
    const node = env.deps.atlas.node(nodeId);
    if (!node || !memoryArenaValidTier(env, tier)) return null;
    const map = env.deps.atlasMaps.create(nodeId, memoryArenaMapTier(env, state, node, tier), "normal", () => 0), own = memoryArenaOwnUnique(env, node);
    map.memory = tier;
    const rewards = memoryArenaRewardExpectations(env, tier, map.tier).filter(([key, expected]) => expected > 0 && env.deps.contentProgression.canDropCurrency(key, state)).map(([key, expected]) => ({ key, min: Math.floor(expected), max: Math.ceil(expected), extraChance: expected % 1 }));
    return {
      node,
      tier,
      have: memoryArenaCount(state, nodeId, tier),
      map,
      best: memoryArenaLedger(state).best[nodeId] || 0,
      reason: memoryArenaEntryReason(env, state, nodeId, tier),
      rewards,
      unique: { name: own, chance: env.M.uniqueChance[own ? "own" : "other"][tier - 1], swapChance: env.M.swap[tier - 1] },
      gear: tier >= env.M.gearFrom,
      next: memoryArenaNextMemoryPreview(env, state, node, tier)
    };
  }
  function memoryArenaOverview(env, state) {
    const book = memoryArenaLedger(state), ids = /* @__PURE__ */ new Set([...Object.keys(book.tickets), ...Object.keys(book.best)]);
    return [...ids].map((id) => {
      const node = env.deps.atlas.node(id), row = book.tickets[id] || memoryArenaEmptyRow(env);
      return {
        node,
        counts: row.slice(),
        best: memoryArenaLedger(state).best[id] || 0,
        unique: memoryArenaOwnUnique(env, node),
        tiers: row.map((have, index) => ({ tier: index + 1, have, mapTier: memoryArenaMapTier(env, state, node, index + 1), reason: memoryArenaEntryReason(env, state, id, index + 1) }))
      };
    }).sort((a, b) => b.counts.findLastIndex((value) => value > 0) - a.counts.findLastIndex((value) => value > 0) || a.node.boss.localeCompare(b.node.boss));
  }

  // modules/domain/memory-dungeon.mjs
  function createMemoryDungeon(deps) {
    const env = { deps };
    env.M = env.deps.MEMORY_DUNGEON;
    env.refundCap = env.M.ticketCap + 1;
    return Object.freeze({
      defaults: memoryArenaDefaults,
      normalize: (...args) => memoryArenaNormalize(env, ...args),
      open: (...args) => memoryArenaOpen(env, ...args),
      validTier: (...args) => memoryArenaValidTier(env, ...args),
      maxTier: (...args) => memoryArenaMaxTier(env, ...args),
      count: memoryArenaCount,
      total: memoryArenaTotal,
      give: (...args) => memoryArenaGive(env, ...args),
      entryReason: (...args) => memoryArenaEntryReason(env, ...args),
      spend: memoryArenaSpend,
      refund: (...args) => memoryArenaRefund(env, ...args),
      mapTier: (...args) => memoryArenaMapTier(env, ...args),
      boost: (...args) => memoryArenaBoost(env, ...args),
      zoneName: (...args) => memoryArenaZoneName(env, ...args),
      tuneBoss: (...args) => memoryArenaTuneBoss(env, ...args),
      settle: (...args) => memoryArenaSettle(env, ...args),
      overview: (...args) => memoryArenaOverview(env, ...args),
      preview: (...args) => memoryArenaPreview(env, ...args)
    });
  }

  // modules/memory-dungeon-classic.mjs
  var rules = createMemoryDungeon({
    get contentProgression() {
      return contentProgression;
    },
    get atlas() {
      return atlas;
    },
    get _t() {
      return _t;
    },
    get ATLAS() {
      return ATLAS;
    },
    get bossVariants() {
      return typeof bossVariants === "undefined" ? void 0 : bossVariants;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get MEMORY_DUNGEON() {
      return MEMORY_DUNGEON;
    }
  });
  var memoryDungeon = rules;
  safeExposeGlobals({ memoryDungeon });
})();
