

/** A ward item with one line (row) or none (a 고유 액막이 without a line); `unique` holds a 고유 액막이's name and effect. */
export function wardMakeItem(env, row, val, tier, ...selection) {
    const [locked, unique = null] = selection;
    const allocatedId = env.deps.nextItemId();
    const item = { id: allocatedId, slot: env.R.slot, baseId: env.R.baseId, baseName: env.R.name, name: env.R.name, rarity: 'magic',
        itemTier: Math.max(1, Math.min(20, Math.floor(Number(tier) || 1))), locked: !!locked,
        baseStats: row ? [{ id: row.id, val, statName: row.name, valMin: row.min, valMax: row.max }] : [], stats: [], ...unique };
    if (typeof env.deps.normalizeItem === 'function') env.deps.normalizeItem(item);
    return item;
}

/** A new ward: one line from the pool, rolled in its range. */
export function wardCreate(env, random = Math.random, tier = 1, rollFloor = 0) {
    const row = env.deps.COLONY_WARD_POOL[Math.floor(random() * env.deps.COLONY_WARD_POOL.length)];
    const min = row.min + Math.ceil((row.max - row.min) * rollFloor);
    return wardMakeItem(env, row, min + Math.floor(random() * (row.max - min + 1)), tier);
}

/** A 고유 액막이 (U.rows, `key` or one at random): a chase unique; 두 번 맨 매듭 rolls one pool line past the usual range. */
export function wardCreateUnique(env, random = Math.random, tier = 1, key = '') {
    const row = env.U.rows.find(entry => entry.key === key) || env.U.rows[Math.floor(random() * env.U.rows.length)];
    const unique = { name: row.name, rarity: 'unique', chaseUnique: true, uniqueEffect: row.text, uniqueEffectKey: row.key, uniqueEffectParams: { ...row.params } };
    if (row.key !== 'doubleKnot') return wardMakeItem(env, null, 0, tier, false, unique);
    const line = env.deps.COLONY_WARD_POOL[Math.floor(random() * env.deps.COLONY_WARD_POOL.length)];
    const min = Math.round(line.max * row.params.min), max = Math.round(line.max * row.params.max);
    return wardMakeItem(env, { ...line, min, max }, min + Math.floor(random() * (max - min + 1)), tier, false, unique);
}

/** A ward that drops (colony waves, kills): now and then (U.chance) a 고유 액막이 instead. Crafting makes plain ones only. */
export function wardCreateDrop(env, random, tier, rollFloor = 0) { return random() < env.U.chance ? wardCreateUnique(env, random, tier) : wardCreate(env, random, tier, rollFloor); }

export function wardSalvageShards(env, item) {
    if (item && item.rarity === 'unique') return env.R.shards.max; // 고유 액막이
    const value = Math.abs(Number(((item && item.baseStats) || [])[0]?.val) || 0);
    return Math.max(env.R.shards.base, Math.min(env.R.shards.max, env.R.shards.base + Math.floor(value / env.R.shards.per)));
}

/** The salvage reward profile of a ward (js/item-rolls.js getItemSalvageRewardProfile): colony shards only. */
export function wardSalvageProfile(env, item) { return { guaranteed: { colonyShard: wardSalvageShards(env, item) }, chances: [] }; }
