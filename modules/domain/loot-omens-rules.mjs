

export function omenIsItemKind(env, key) { return Object.hasOwn(env.ITEM_KINDS, key); }

/** Whether one drop key can reach this hero now: a currency its unlocks allow, or an open item kind. */
export function omenOpenKey(env, key, state) {
    return omenIsItemKind(env, key) ? env.ITEM_KINDS[key](state) : env.deps.contentProgression.canDropCurrency(key, state);
}

/** An omen can land on a map when its loop has come and, for a drops omen, one of its drops can reach the hero. */
export function omenAvailable(env, omen, state) {
    if ((omen.minLoop || 0) > (Number(state.season) || 1)) return false;
    if (omen.needsFallenApex && !env.deps.atlasEndgame.bearableOmens(state).length) return false;
    return omen.kind !== 'drops' || omen.drops.some(([key]) => omenOpenKey(env, key, state));
}

export function omenPickWeighted(rows, weightOf, random) {
    const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
    let roll = random() * total;
    return rows.find(row => (roll -= weightOf(row)) < 0) || rows[rows.length - 1] || null;
}

/** @returns {string|null} the omen id a new map stone carries */
export function omenRoll(env, state, random) {
    const pick = omenPickWeighted(env.deps.LOOT_OMENS.list.filter(omen => omenAvailable(env, omen, state)), omen => omen.weight, random);
    return pick ? pick.id : null;
}

/** 그 꽃 색의 묶음에서 지금 이 지도석에 붙을 수 있는 기운들(data/loot-omens.js flowers). 지금 기운은 빼서, 꽃을 쓰면 반드시 바뀐다. */
export function omenFlowerOmens(env, color, state, currentId) {
    return env.deps.LOOT_OMENS.flowers[color].omens.map(id => env.BY_ID.get(id)).filter(omen => omen.id !== currentId && omenAvailable(env, omen, state));
}

/** @returns {string|null} the omen a plain flower of this colour rolls */
export function omenRollFlowerOmen(env, color, state, currentId, random) {
    const pick = omenPickWeighted(omenFlowerOmens(env, color, state, currentId), omen => omen.weight, random);
    return pick ? pick.id : null;
}

export function omenStrengthOf(env, map) { return (env.deps.LOOT_OMENS.strength[map.rarity] || 1) + (map.corrupted ? env.deps.LOOT_OMENS.strength.corrupted : 0); }

/** A map stone's omen and strength, or null (an old stone, or a guardian or arena map). */
export function omenOf(env, map) {
    const omen = map && env.BY_ID.get(map.omen);
    return omen ? { omen, strength: omenStrengthOf(env, map) } : null;
}

/** A zone's omen (js/atlas.js buildZone put atlasOmen on it), or null. */
export function omenInZone(env, zone) {
    const omen = zone && zone.atlasOmen && env.BY_ID.get(zone.atlasOmen.id);
    return omen ? { omen, strength: Number(zone.atlasOmen.strength) || 1 } : null;
}

/** A bonus omen adds its effect × strength to the run's atlas effects (js/atlas.js startRun). */
export function omenRunBonus(env, bonus, map) {
    const found = omenOf(env, map);
    if (!found || found.omen.kind !== 'bonus') return bonus;
    const out = { ...bonus };
    for (const [key, value] of Object.entries(found.omen.bonus)) out[key] = (Number(out[key]) || 0) + Math.round(value * found.strength);
    return out;
}

export function omenZoneFields(env, map) {
    const found = omenOf(env, map);
    return found ? { atlasOmen: Object.freeze({ id: found.omen.id, strength: found.strength }) } : {};
}

export function omenGrow(value, strength) { return 1 + (Number(value || 1) - 1) * strength; }

/** Per-enemy multipliers in an atlas map (js/atlas-maps.js applyEnemyMods, and the chest stand-in in js/exploration-object-combat.js):
 * equipment count from a gear omen, unique chance from the map-wide uniqueMul times a gear omen's. Null outside atlas maps. */
export function omenEnemyMods(env, zone) {
    if (!zone || zone.type !== 'atlasMap') return null;
    const found = omenInZone(env, zone), gear = found && found.omen.gear, gems = found && found.omen.gemMul;
    return { equipmentMul: gear ? omenGrow(gear.quantity, found.strength) : 1,
        uniqueMul: env.deps.LOOT_OMENS.uniqueMul * (gear ? omenGrow(gear.unique, found.strength) : 1), gemMul: gems ? omenGrow(gems, found.strength) : 1 };
}

/** A jewels omen's odds for this map's '@jewel' draws ({rare, unique} × strength), or null for the ordinary odds. */
export function omenJewelOdds(env, zone) {
    const found = omenInZone(env, zone), odds = found && found.omen.jewel;
    return odds ? { rare: Math.min(0.9, odds.rare * found.strength), unique: Math.min(0.5, odds.unique * found.strength) } : null;
}

/** Slot weights for an equipment drop in this zone (unlisted slots weigh 1), or null without a slot omen. */
export function omenSlotWeights(env, zone) {
    const found = omenInZone(env, zone), slots = found && found.omen.gear && found.omen.gear.slots;
    return slots ? Object.fromEntries(Object.entries(slots).map(([slot, value]) => [slot, omenGrow(value, found.strength)])) : null;
}

/** Multiplier of one drop variant ('duplicate', 'bundle', 'corrupted') in this zone. */
export function omenVariantMul(env, zone, kind) {
    const found = omenInZone(env, zone), variant = found && found.omen.gear && found.omen.gear.variant;
    return variant && variant[kind] ? omenGrow(variant[kind], found.strength) : 1;
}

/** One draw from a drops omen's list: [key, count], only keys that can reach the hero. */
export function omenDrawDrop(env, omen, state, random) {
    const rows = omen.drops.filter(([key]) => omenOpenKey(env, key, state));
    const row = omenPickWeighted(rows, entry => entry[1], random);
    return row ? [row[0], Math.max(1, Math.floor(row[2] || 1))] : null;
}

export function omenRankOf(enemy) { return enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular'; }

/** What a kill in this zone gives from a drops omen: [[key, count], ...]. The boss rolls bossRolls more times. */
export function omenKillDrops(env, zone, enemy, state, random) {
    const found = omenInZone(env, zone);
    if (!found || found.omen.kind !== 'drops') return [];
    const chance = env.deps.LOOT_OMENS.chance[omenRankOf(enemy)] * found.strength;
    const rolls = Math.floor(chance) + Number(random() < chance % 1) + (enemy.isBoss ? env.deps.LOOT_OMENS.bossRolls : 0);
    return Array.from({ length: rolls }, () => omenDrawDrop(env, found.omen, state, random)).filter(Boolean);
}

/** Stray draws: an elite (stray.elite chance, once) or the boss (stray.boss times) also draws from one other drops omen. */
export function omenStrayDrops(env, zone, enemy, state, random) {
    if (!zone || zone.type !== 'atlasMap' || !(enemy.isElite || enemy.isBoss)) return [];
    const rolls = enemy.isBoss ? env.deps.LOOT_OMENS.stray.boss : Number(random() < env.deps.LOOT_OMENS.stray.elite);
    const own = omenInZone(env, zone), pool = env.deps.LOOT_OMENS.list.filter(omen => omen.kind === 'drops' && omenAvailable(env, omen, state) && (!own || omen !== own.omen));
    return Array.from({ length: rolls }, () => omenPickWeighted(pool, row => row.weight, random)).filter(Boolean)
        .map(omen => omenDrawDrop(env, omen, state, random)).filter(Boolean);
}

/** A treasure burst: rolls draws from one drops omen that can reach the hero (the map's own when it is one); golden treasure rolls more. */
export function omenTreasureDrops(env, zone, state, random, golden = false) {
    const own = omenInZone(env, zone), pool = env.deps.LOOT_OMENS.list.filter(omen => omen.kind === 'drops' && omenAvailable(env, omen, state));
    const omen = own && own.omen.kind === 'drops' ? own.omen : omenPickWeighted(pool, row => row.weight, random);
    if (!omen) return { omen: null, drops: [] };
    const rolls = golden ? env.deps.LOOT_OMENS.treasure.golden.rolls : env.deps.LOOT_OMENS.treasure.rolls;
    return { omen, drops: Array.from({ length: rolls }, () => omenDrawDrop(env, omen, state, random)).filter(Boolean) };
}

/** The jackpot of a golden treasure: a currency key that can reach the hero, or '@chase' (a chase unique). */
export function omenGoldenJackpot(env, state, random) {
    const rows = env.deps.LOOT_OMENS.treasure.golden.jackpot.filter(([key]) => key === '@chase' || env.deps.contentProgression.canDropCurrency(key, state));
    const row = omenPickWeighted(rows, entry => entry[1], random);
    return row ? row[0] : '@chase';
}

export function omenPackRoll(env, salt, pack) { return (Math.abs(env.deps.hashSeed(`${salt}:${pack.key}:${pack.aliveIds[0]}`)) % 10000) / 10000; }

/** Whether an ordinary pack of an atlas map carries treasure: fixed per pack from its key and first enemy, no Math.random draw. */
export function omenIsTreasurePack(env, zone, pack) {
    if (!zone || zone.type !== 'atlasMap' || pack.stage !== null || pack.encounter || pack.anchor || !pack.waiting.length) return false;
    return omenPackRoll(env, 'treasure', pack) < env.deps.LOOT_OMENS.treasure.packChance;
}

/** Whether a treasure pack holds golden treasure (a second fixed roll of the same pack). */
export function omenIsGoldenTreasure(env, pack) { return omenPackRoll(env, 'golden', pack) < env.deps.LOOT_OMENS.treasure.golden.chance; }

/** @returns {{id:string,name:string,note:string,tone:string,kind:string}|null} */
export function omenDescribe(env, id) {
    const omen = env.BY_ID.get(id);
    return omen ? { id: omen.id, name: omen.name, note: omen.note, tone: omen.tone, kind: omen.kind } : null;
}

export function omenValidId(env, id) { return typeof id === 'string' && env.BY_ID.has(id); }
