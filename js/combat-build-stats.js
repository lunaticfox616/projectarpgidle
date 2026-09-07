// Static equipment contributions. Live HP, buffs, skills and enemy-dependent stats stay in combat.js.
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
