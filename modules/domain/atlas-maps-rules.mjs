

export function atlasMapLerp(range, roll) { return range[0] + (range[1] - range[0]) * roll; }

export function atlasMapModValue(mod, roll) { return Math.round(atlasMapLerp([mod.min, mod.max], roll)); }

export function atlasMapLimits(env, map) { return env.deps.ATLAS.rarities[map.rarity]; }

export function atlasMapCountKind(env, map, kind) { return map.mods.filter(entry => env.MODS.get(entry.id)?.kind === kind).length; }

export function atlasMapCreate(env, node, tier, rarity = 'normal', random = Math.random) {
    const map = { uid: 0, node, tier, rarity: 'normal', mods: [], quality: 0, corrupted: false };
    if (rarity !== 'normal') atlasMapReroll(env, map, rarity, random);
    return map;
}

/** Kinds with room left under the rarity's prefix/suffix limits (or any kind when forced past them). */
export function atlasMapOpenKinds(env, map, forced) {
    return ['prefix', 'suffix'].filter(kind => forced || atlasMapCountKind(env, map, kind) < atlasMapLimits(env, map)[kind]);
}

export function atlasMapAddMod(env, map, random, forced = false) {
    const taken = new Set(map.mods.map(entry => entry.id));
    const kinds = new Set(atlasMapOpenKinds(env, map, forced));
    const pool = env.deps.ATLAS.mods.filter(mod => kinds.has(mod.kind) && !taken.has(mod.id));
    if (!pool.length) return false;
    map.mods.push({ id: pool[Math.floor(random() * pool.length)].id, roll: random() });
    return true;
}

export function atlasMapReroll(env, map, rarity, random, count = null) {
    map.rarity = rarity;
    map.mods = [];
    const rule = atlasMapLimits(env, map);
    const target = count ?? rule.min + Math.floor(random() * (rule.max - rule.min + 1));
    while (map.mods.length < target && atlasMapAddMod(env, map, random));
}

export function atlasMapHasRoom(env, map) { return map.mods.length < atlasMapLimits(env, map).max && atlasMapOpenKinds(env, map, false).length > 0; }

export function atlasMapCraftReason(env, map, key) {
    if (!env.CRAFTS[key]) return '지도석에 쓸 수 없는 재화입니다.';
    if (map.corrupted) return '타락한 지도석은 더 바꿀 수 없습니다.';
    return env.CRAFTS[key].can(map) ? '' : '지금 지도석 상태에는 쓸 수 없습니다.';
}

/** @returns {string} '' when applied, otherwise why not (the map is untouched). */
export function atlasMapCraft(env, map, key, random = Math.random) {
    const reason = atlasMapCraftReason(env, map, key);
    if (!reason) env.CRAFTS[key].apply(map, random);
    return reason;
}

/** 잿불가지: 무변화 · 등급 +1 · 한도를 넘는 옵션 추가 · 5~6옵션 희귀로 재구성. 어느 쪽이든 수량 보너스가 붙고 더는 바꿀 수 없다. */
export function atlasMapCorrupt(env, map, random) {
    const weights = env.deps.ATLAS.corruption, outcomes = ['none', 'tier', 'extra', 'reforge'];
    let roll = random() * outcomes.reduce((sum, key) => sum + weights[key], 0);
    const outcome = outcomes.find(key => (roll -= weights[key]) < 0) || 'none';
    map.corrupted = true;
    if (outcome === 'tier') map.tier = Math.min(env.deps.ATLAS.tierCap, map.tier + 1);
    if (outcome === 'extra') atlasMapAddMod(env, map, random, true);
    if (outcome === 'reforge') atlasMapReroll(env, map, 'rare', random, 5 + Math.floor(random() * 2));
    return outcome;
}

/** Resolved numbers for a map: zone multipliers, per-enemy mods and the reward bonuses (quantity/rarity %). */
/** Tiers past the one where loot reaches T20 (data ATLAS.overTier): each adds quantity, rarity and chase odds. */
export function atlasMapOverTiers(env, tier) { return Math.max(0, (Number(tier) || 0) - env.deps.ATLAS.overTier.from); }

/** Chase-unique odds multiplier of a zone (js/item-rolls.js generateUniqueItem): only atlas maps past ATLAS.overTier.from. */
export function atlasMapChaseMul(env, zone) { return 1 + (zone && zone.type === 'atlasMap' ? atlasMapOverTiers(env, zone.atlasTier) * env.deps.ATLAS.overTier.chase / 100 : 0); }

export function atlasMapEffects(env, map) {
    const over = atlasMapOverTiers(env, map.tier);
    const fx = { hp: 1, damage: 1, bossHp: 1, bossDamage: 1, packExtra: 0, extraElite: 0, hazard: false, groundElements: [], enemy: [],
        quantity: map.quality + (map.corrupted ? env.deps.ATLAS.corruption.bonusQuantity : 0) + over * env.deps.ATLAS.overTier.quantity,
        rarity: over * env.deps.ATLAS.overTier.rarity, overTiers: over };
    for (const entry of map.mods) {
        const mod = env.MODS.get(entry.id), effect = env.EFFECTS[entry.id];
        if (!mod || !effect) continue;
        const v = atlasMapModValue(mod, entry.roll);
        fx.quantity += Math.round(atlasMapLerp(mod.quantity, entry.roll));
        fx.rarity += Math.round(atlasMapLerp(mod.rarity, entry.roll));
        if (effect.zone) effect.zone(fx, v);
        if (effect.enemy) fx.enemy.push([entry.id, v]);
    }
    return fx;
}

/** Called for every enemy created in an atlas map (combat applyZoneEnemyMods). */
export function atlasMapApplyEnemyMods(env, enemy, zone) {
    if (!zone || zone.type !== 'atlasMap') return enemy;
    for (const [id, v] of zone.atlasEnemyMods) env.EFFECTS[id].enemy(enemy, v);
    enemy.dropMul = (Number(enemy.dropMul) || 1) * (1 + zone.atlasLootQuantity / 100);
    enemy.lootRarityMul = 1 + (zone.atlasLootRarity + (enemy.isBoss ? zone.atlasBossRarity : 0)) / 100;
    // 지도의 고유 배율과 장비 기운(js/loot-omens.js enemyMods): 장비 기대 개수와 고유 확률(js/loot.js getEquipmentDropChances,
    // getEquipmentDropRarity). 상자도 같은 배율을 받는다(js/exploration-object-combat.js chestEnemy).
    // 일반과 정예 처치는 장비가 더 나온다(data/loot-omens.js killGearMul). 보스는 따로 보상을 받는다(js/atlas-finds.js grantBossReward).
    const omen = env.deps.lootOmens.enemyMods(zone), kill = enemy.isBoss ? 1 : env.deps.LOOT_OMENS.killGearMul;
    if (omen) Object.assign(enemy, { equipmentDropMul: omen.equipmentMul * kill, uniqueChanceMul: omen.uniqueMul, gemDropMul: omen.gemMul });
    return enemy;
}

export function atlasMapDescribe(env, entry) {
    const mod = env.MODS.get(entry.id);
    return mod ? mod.text.replace('{v}', String(atlasMapModValue(mod, entry.roll))) : '';
}

export function atlasMapValidHead(env, raw, validNode) {
    if (!raw || typeof raw !== 'object' || !validNode(raw.node) || !Object.hasOwn(env.deps.ATLAS.rarities, raw.rarity)) return false;
    return Number.isSafeInteger(raw.uid) && raw.uid >= 1 && Number.isInteger(raw.tier) && raw.tier >= 1 && raw.tier <= env.deps.ATLAS.tierCap;
}

export function atlasMapValidEntry(env, entry, seen) {
    const ok = !!entry && env.MODS.has(entry.id) && Number.isFinite(entry.roll) && entry.roll >= 0 && entry.roll <= 1 && !seen.has(entry.id);
    if (ok) seen.add(entry.id);
    return ok;
}

/** 기억 던전의 지도석(js/memory-dungeon.js)은 그 단계를 지닌다: { memory } 또는 {}. */
export function atlasMapMemoryField(env, raw) {
    return typeof env.deps.memoryDungeon === 'object' && env.deps.memoryDungeon.validTier(raw.memory) ? { memory: raw.memory } : {};
}

/** Save boundary: keeps only known mods with valid rolls; returns null for anything that is not a map. */
export function atlasMapNormalize(env, raw, validNode) {
    if (!atlasMapValidHead(env, raw, validNode)) return null;
    const seen = new Set(), mods = (Array.isArray(raw.mods) ? raw.mods : []).filter(entry => atlasMapValidEntry(env, entry, seen));
    const quality = Math.max(0, Math.min(env.deps.ATLAS.quality.max, Math.floor(Number(raw.quality) || 0)));
    return { uid: raw.uid, node: raw.node, tier: raw.tier, rarity: raw.rarity, mods: mods.slice(0, 8).map(({ id, roll }) => ({ id, roll })),
        quality, corrupted: raw.corrupted === true, ...atlasMapMemoryField(env, raw), ...(env.deps.lootOmens.validId(raw.omen) ? { omen: raw.omen } : {}) };
}
