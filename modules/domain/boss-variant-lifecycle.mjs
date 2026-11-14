import { variantEligible, variantPick } from './boss-variant-catalog.mjs';

export function variantOpen(env, state) { return env.deps.contentProgression.holds('bossVariant', state); }

/** Safe to repeat after a later boss phase assigns its own name. */
export function variantDress(catalog, enemy) {
    const kind = catalog.byId.get(enemy && enemy.bossVariant);
    if (!kind) return enemy;
    if (!String(enemy.name || '').includes(kind.name)) enemy.name = `${enemy.name} (${kind.name})`;
    return Object.assign(enemy, { bossVisualTint: kind.hue, variantOutline: kind.outline });
}

export function variantApply(catalog, enemy, kind) {
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
    Object.assign(enemy, { bossVariant: kind.id, ele: kind.ele, dropMul: (Number(enemy.dropMul) || 1) * catalog.rules.reward.dropMul,
        expMul: (Number(enemy.expMul) || 1) * catalog.rules.reward.expMul });
    return variantDress(catalog, enemy);
}

export function* variantAnnounce(enemy, recalled) {
    yield { kind: 'dispatchRuntimeEvent', args: ['boss-variant', { kind: 'spawn', name: enemy.name, variant: enemy.bossVariant, recalled }] };
}

export function variantAtlasChance(owner, zone) {
    const run = zone && zone.type === 'atlasMap' && owner.atlas ? owner.atlas.run : null;
    return (Number(run && run.bonus && run.bonus.variantChance) || 0) / 100;
}

export function* variantMaybeApply(env, enemy, zone, random = Math.random) {
    if (!variantOpen(env, env.owner) || !variantEligible(enemy, zone)
        || random() >= env.catalog.rules.chance + variantAtlasChance(env.owner, zone)) return enemy;
    variantApply(env.catalog, enemy, variantPick(env.catalog, random));
    yield* variantAnnounce(enemy, false);
    return enemy;
}

export function* variantRecall(env, enemy, tier, random = Math.random) {
    const chance = env.catalog.rules.recall[tier - 1] || 0;
    if (!enemy || enemy.bossVariant || random() >= chance) return enemy;
    variantApply(env.catalog, enemy, variantPick(env.catalog, random));
    yield* variantAnnounce(enemy, true);
    return enemy;
}

export function variantLedger(state) {
    const memory = state.atlas.memory;
    if (!memory.variants || typeof memory.variants !== 'object') memory.variants = {};
    return memory.variants;
}

export function variantMemory(env, state) {
    const zone = typeof env.deps.getZone === 'function' ? env.deps.getZone(state.currentZoneId) : null;
    if (!zone || zone.type !== 'atlasMap' || !zone.atlasNode || typeof env.deps.memoryDungeon !== 'object'
        || !env.deps.memoryDungeon.open(state)) return null;
    return env.deps.memoryDungeon.give(state, zone.atlasNode, env.catalog.rules.reward.memoryTier)
        ? { node: zone.atlasNode, tier: env.catalog.rules.reward.memoryTier } : null;
}

/** Kill record, first-kill gift and optional atlas memory, followed by one notification. */
export function* variantOnKilled(env, state, enemy) {
    const kind = env.catalog.byId.get(enemy && enemy.bossVariant);
    if (!kind || !state.atlas || !state.atlas.memory) return null;
    const book = variantLedger(state), first = !(book[kind.id] > 0);
    book[kind.id] = (book[kind.id] || 0) + 1;
    if (first) env.catalog.rules.reward.firstKill.forEach(([key, amount]) => env.deps.awardCurrency(key, amount));
    const out = { kind: 'kill', name: enemy.name, variant: kind.id, first, gift: first ? env.catalog.rules.reward.firstKill : [], memory: variantMemory(env, state) };
    yield { kind: 'dispatchRuntimeEvent', args: ['boss-variant', out] };
    return out;
}
