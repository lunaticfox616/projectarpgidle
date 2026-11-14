// GENERATED from modules/memory-leaves*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/memory-leaves-rules.mjs
  function leafDefaults() {
    return { version: 2, seen: [] };
  }
  function leafStore(state) {
    return state.atlas.leaves;
  }
  function leafValidIds(env, ids) {
    return [...new Set(ids)].filter((id) => env.BY_ID.has(id));
  }
  function leafPositiveKeys(raw) {
    return Object.keys(raw && typeof raw === "object" ? raw : {}).filter((id) => Number.isFinite(Number(raw[id])) && Number(raw[id]) > 0);
  }
  function leafNormalize(env, raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    return { ...leafDefaults(), seen: leafValidIds(env, [
      ...Array.isArray(src.seen) ? src.seen : [],
      ...leafPositiveKeys(src.counts),
      ...leafPositiveKeys(src.woven)
    ]) };
  }
  function leafSourceMatches(source, zone, enemy) {
    if (source.node) return zone.atlasNode === source.node;
    if (source.treasure) return !!enemy.treasureCarrier;
    if (source.golden) return !!enemy.atlasGolden;
    if (source.boss) return !!enemy.isBoss;
    return !!source.any;
  }
  function leafPoolFor(env, state, zone, enemy) {
    const seen = new Set(leafStore(state).seen);
    for (const row of state.actExploration?.groundLoot || []) if (row.kind === "leaf") seen.add(row.leaf);
    const open = env.deps.MEMORY_LEAVES.list.filter((leaf) => !seen.has(leaf.id) && (leaf.minTier || 0) <= (Number(zone.atlasTier) || 0) && leafSourceMatches(leaf.source, zone, enemy));
    const special = open.filter(leafIsSpecialLeaf);
    return special.length ? special : open;
  }
  function leafRankOf(enemy) {
    return enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "regular";
  }
  function leafSpecialMul(env, enemy) {
    return enemy.treasureCarrier ? env.deps.MEMORY_LEAVES.treasureMul : enemy.atlasGolden ? env.deps.MEMORY_LEAVES.goldenMul : 1;
  }
  function leafIsSpecialLeaf(leaf) {
    return !!(leaf.source.treasure || leaf.source.golden);
  }
  function leafDropChance(env, enemy, pool) {
    return env.deps.MEMORY_LEAVES.chance[leafRankOf(enemy)] * (pool.some(leafIsSpecialLeaf) ? leafSpecialMul(env, enemy) : 1);
  }
  function leafIsAtlasKill(state, zone, enemy) {
    return !!state.atlas?.unlocked && zone?.type === "atlasMap" && !!enemy && !enemy.noLoot;
  }
  function leafRollKill(env, state, zone, enemy, random) {
    if (!leafIsAtlasKill(state, zone, enemy)) return null;
    if (leafStore(state).seen.length === env.deps.MEMORY_LEAVES.list.length) return null;
    const pool = leafPoolFor(env, state, zone, enemy), total = pool.reduce((sum, leaf) => sum + leaf.weight, 0);
    if (random() >= leafDropChance(env, enemy, pool)) return null;
    if (!total) return null;
    let roll = random() * total;
    return (pool.find((leaf) => (roll -= leaf.weight) < 0) || pool[pool.length - 1]).id;
  }
  function* leafReceive(env, state, id) {
    const leaf = env.BY_ID.get(id);
    if (!leaf || leafStore(state).seen.includes(id)) return null;
    leafStore(state).seen.push(id);
    yield { kind: "unlockLeafJournal", args: [leaf.journal, state] };
    return { id, name: leaf.name, first: true, journal: leaf.journal, bonus: leaf.bonus.label };
  }
  function leafRestoreJournal(env, state, entries) {
    if (!state.atlas || typeof state.atlas !== "object") return;
    state.atlas.leaves = leafNormalize(env, state.atlas.leaves);
    const seen = new Set(state.atlas.leaves.seen);
    for (const leaf of env.deps.MEMORY_LEAVES.list) {
      if (seen.has(leaf.id)) entries.add(leaf.journal);
      if (entries.has(leaf.journal)) seen.add(leaf.id);
    }
    state.atlas.leaves.seen = [...seen];
  }
  function leafMomentOf() {
    return "great";
  }
  function leafBonusText(leaf) {
    return leaf.bonus.label;
  }
  function leafSourceText(env, leaf) {
    const source = leaf.source, tier = leaf.minTier ? env.deps._t(", {minTier}등급 이상", { minTier: leaf.minTier }) : "";
    if (source.node) return `${env.deps.atlas.nodes.find((node) => node.id === source.node)?.name || source.node}${tier}`;
    if (source.boss) return env.deps._t("지도 보스{tier}", { tier });
    if (source.golden) return env.deps._t("황금 방{tier}", { tier });
    if (source.treasure) return env.deps._t("보물 무리{tier}", { tier });
    return env.deps._t("어느 지도나{tier}", { tier });
  }
  function leafGainedBetween(env, before, after) {
    const seen = new Set(before?.seen || []);
    const fresh = (after?.seen || []).filter((id) => !seen.has(id) && env.BY_ID.has(id)).map((id) => env.BY_ID.get(id).name);
    return { total: fresh.length, fresh };
  }

  // modules/domain/memory-leaves.mjs
  function createMemoryLeaves(deps) {
    const env = { deps };
    env.BY_ID = new Map(env.deps.MEMORY_LEAVES.list.map((leaf) => [leaf.id, leaf]));
    return Object.freeze({
      defaults: leafDefaults,
      normalize: (...args) => leafNormalize(env, ...args),
      rollKill: (...args) => leafRollKill(env, ...args),
      receive: (...args) => leafReceive(env, ...args),
      momentOf: leafMomentOf,
      bonusText: leafBonusText,
      sourceText: (...args) => leafSourceText(env, ...args),
      gainedBetween: (...args) => leafGainedBetween(env, ...args),
      restoreJournal: (...args) => leafRestoreJournal(env, ...args),
      leaf: (id) => env.BY_ID.get(id) || null,
      validId: (id) => env.BY_ID.has(id),
      list: env.deps.MEMORY_LEAVES.list
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/memory-leaves-classic.mjs
  var rules = createMemoryLeaves({
    get MEMORY_LEAVES() {
      return MEMORY_LEAVES;
    },
    get _t() {
      return _t;
    },
    get atlas() {
      return atlas;
    }
  });
  var effects = { unlockLeafJournal: (...args) => unlockJournalEntry(...args) };
  var memoryLeaves = Object.freeze({
    ...rules,
    receive: (state, id) => consumeDomainCommands(rules.receive(state, id), effects)
  });
  safeExposeGlobals({ memoryLeaves });
})();
