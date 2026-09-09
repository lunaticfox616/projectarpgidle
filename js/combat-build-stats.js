// Build-source accumulation. Each call owns its output buckets; live HP/buffs stay in combat.js.
// Source order is significant: support scaling runs after these sources, before shrine/flask buffs.

/** Adds allocated loop passives to the caller-owned bucket without changing progression. */
function accumulateCombatSeasonStats(bucket, nodeIds, levels) {
    const nodeLevels = levels && typeof levels === 'object' ? levels : {};
    nodeIds.forEach(id => {
        const node = getSeasonPassiveNodeDef(id);
        if (!node) return;
        const level = Math.max(1, Math.floor(nodeLevels[id] || 1));
        const value = Number((node.val * (1 + Math.max(0, level - 1) * 0.2)).toFixed(4));
        addStatToBucket(bucket, node.stat, value);
    });
}

/** Ascendancy nodes may contain one stat or multiple lines; keep their authored order. */
function accumulateCombatAscendStats(bucket, nodeIds, ascendClass) {
    if (!ascendClass) return;
    const tree = getClassTreeDef(ascendClass);
    nodeIds.forEach(id => {
        const node = tree[id];
        if (!node) return;
        if (Array.isArray(node.stats)) {
            node.stats.forEach(line => addStatToBucket(bucket, line.stat, line.val));
            return;
        }
        addStatToBucket(bucket, node.stat, node.val);
    });
}

/** Investment points are converted in the same order as the final-stat calculation. */
function accumulateCombatLoopStats(bucket, loopBonus, deepBonus) {
    const loop = loopBonus || {};
    addStatToBucket(bucket, 'flatHp', (loop.flatHp || 0) * 12);
    addStatToBucket(bucket, 'flatDmg', (loop.flatDmg || 0) * 3);
    addStatToBucket(bucket, 'aspd', (loop.aspd || 0) * 1.5);
    addStatToBucket(bucket, 'move', (loop.move || 0) * 1.0);
    accumulateCombatDeepLoopStats(bucket, deepBonus || {});
}

function accumulateCombatDeepLoopStats(bucket, deep) {
    addStatToBucket(bucket, 'flatHp', (deep.flatHp || 0) * 10);
    addStatToBucket(bucket, 'flatDmg', (deep.flatDmg || 0) * 2);
    addStatToBucket(bucket, 'aspd', (deep.aspd || 0) * 1.2);
    addStatToBucket(bucket, 'move', (deep.move || 0) * 0.8);
    addStatToBucket(bucket, 'dr', (deep.dr || 0) * 0.5);
    addStatToBucket(bucket, 'crit', (deep.crit || 0) * 0.6);
}

/** Rune-only proc values stay separate from ordinary stats, including bonus-line behavior. */
function accumulateCombatRuneStats(bucket, runeState = {}) {
    const result = { runeCorpseExplodeChance: 0, runeCorpseExplodeLifePct: 0, runeResonancePower: 0 };
    if (!Array.isArray(UNDERWORLD_RUNE_DB)) return result;
    const state = runeState || {};
    const cap = Math.max(0, Math.min(6, Math.floor(state.unlockedSlots || 0)));
    const equipped = Array.isArray(state.equippedRunes) ? state.equippedRunes.slice(0, cap) : [];
    equipped.forEach(no => accumulateCombatRuneEntry(bucket, result, state, no));
    return result;
}

function accumulateCombatRuneEntry(bucket, result, state, no) {
    const number = Math.floor(Number(no) || 0);
    if (number <= 0) return;
    const rune = UNDERWORLD_RUNE_DB.find(row => row.no === number);
    if (!rune) return;
    const level = Math.max(0, Math.floor(state.enhanceLvByNo?.[number] || 0));
    const value = Number(rune.val || 0) * (1 + level * 0.01);
    const special = { corpseExplodeChance: 'runeCorpseExplodeChance', corpseExplodeLifePct: 'runeCorpseExplodeLifePct', resonancePower: 'runeResonancePower' };
    if (Object.hasOwn(special, rune.stat)) result[special[rune.stat]] += value;
    else addStatToBucket(bucket, rune.stat, value);
    const lines = state.bonusLinesByNo?.[number];
    if (Array.isArray(lines)) lines.forEach(line => { if (line && line.stat) addStatToBucket(bucket, line.stat, Number(line.val || 0)); });
}

function getCombatEquipmentContributions(resolvedSources, excludedSlots) {
    const memo = getBackgroundBuildMemo(game);
    let result = memo?.get('combat-equipment');
    if (!result) {
        result = { gearBase: createEmptyStatBucket(), gearExplicit: createEmptyStatBucket(),
            localDefenseTotals: { armor: 0, evasion: 0, energyShield: 0 }, shieldArmorForDamage: 0,
            shieldBaseBlockChance: 0, shieldBlockChancePct: 0, shieldBlockChanceFlat: 0,
            equippedUniqueEffects: [] };
        for (const source of resolvedSources) {
            const [, item, resolved] = source;
            if (excludedSlots.has(item.slot) && !resolved.growthItem) continue;
            if (excludedSlots.has('all:' + item.slot)) continue;
            accumulateCombatEquipmentItem(result, source);
        }
        memo?.set('combat-equipment', result);
    }
    if (!memo) return result;
    // Buckets are private scalar lookups, never enumerated or saved. Inherit the static values;
    // jewel additions and keystone conversions write only to this evaluation's own properties.
    return { ...result, gearBase: Object.create(result.gearBase), gearExplicit: Object.create(result.gearExplicit),
        equippedUniqueEffects: result.equippedUniqueEffects.slice() };
}

function accumulateCombatEquipmentItem(result, [slotKey, item, resolved]) {
    for (const [sourceSlot, source] of [[slotKey, item], [resolved.mirrorSourceSlot, resolved.mirrorSourceItem]]) {
        if (source?.rarity === 'unique' && source.uniqueEffectKey) {
            result.equippedUniqueEffects.push({ key: source.uniqueEffectKey, params: source.uniqueEffectParams || null,
                itemName: source.name || '', sourceSlot });
        }
    }
    applyStatsToBucket(result.gearBase, resolved.baseStats);
    applyStatsToBucket(result.gearExplicit, resolved.explicitStats);
    accumulateCombatItemDefenses(result, slotKey, item, resolved);
    if (item.voidSocket?.open && item.voidSocket.jewel) {
        getJewelStats(item.voidSocket.jewel).forEach(stat => addStatToBucket(result.gearExplicit, stat.id, stat.val));
    }
    accumulateCombatAbyssJewels(result.gearExplicit, item);
}

function accumulateCombatItemDefenses(result, slotKey, item, resolved) {
    const base = { armor: 0, evasion: 0, energyShield: 0 };
    const flat = { ...base }, pct = { ...base };
    resolved.baseStats.forEach(stat => {
        if (!stat) return;
        if (Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0);
        if (stat.id === 'baseBlockChance') result.shieldBaseBlockChance += Number(stat.val || 0);
    });
    const addExplicit = stat => accumulateCombatDefenseLine(result, flat, pct, stat);
    resolved.explicitStats.forEach(stat => {
        if (!stat) return;
        addExplicit(stat);
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(addExplicit);
    });
    const armor = (base.armor + flat.armor) * (1 + pct.armor / 100);
    result.localDefenseTotals.armor += armor;
    result.localDefenseTotals.evasion += (base.evasion + flat.evasion) * (1 + pct.evasion / 100);
    result.localDefenseTotals.energyShield += (base.energyShield + flat.energyShield) * (1 + pct.energyShield / 100);
    if (slotKey === '방패' && item.slot === '방패') result.shieldArmorForDamage = Math.max(0, armor);
}

function accumulateCombatDefenseLine(result, flat, pct, stat) {
    if (!stat) return;
    const value = Number(stat.val || 0);
    if (Object.hasOwn(flat, stat.id)) flat[stat.id] += value;
    const percentKey = { armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' }[stat.id];
    if (Object.hasOwn(pct, percentKey)) pct[percentKey] += value;
    if (stat.id === 'baseBlockChance') result.shieldBaseBlockChance += value;
    if (stat.id === 'blockChancePct') result.shieldBlockChancePct += value;
    if (stat.id === 'blockChance') result.shieldBlockChanceFlat += value;
}

function accumulateCombatAbyssJewels(bucket, item) {
    if (!Array.isArray(item.abyssSockets)) return;
    let multiplier = 1;
    if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
        const params = item.uniqueEffectParams || {};
        const min = Number(params.ampMin || 1), max = Number(params.ampMax || 100);
        const pct = Number.isFinite(Number(params.ampPct)) ? Number(params.ampPct) : (min + max) / 2;
        multiplier = 1 + pct / 100;
    }
    for (const socket of item.abyssSockets) {
        if (!socket?.jewel) continue;
        getJewelStats(socket.jewel).forEach(stat =>
            addStatToBucket(bucket, stat.id, Number((stat.val * multiplier).toFixed(2))));
    }
}
