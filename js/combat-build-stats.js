// Build-source accumulation. Each call owns its output buckets; live HP/buffs stay in combat.js.
// Source order is significant: support scaling runs after these sources, before shrine buffs.

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
    accumulateCombatKeystoneStats(bucket, game);
}

/** 고른 키스톤과 우주계 쌍둥이 키스톤 중 hasKeystone이 참인 것의 정의를 하나씩 넘긴다. */
function forEachActiveKeystoneDef(owner, visit) {
    const ids = new Set([...(owner.ascendKeystones || []), ...(owner.cosmosTwinKeystones || [])]);
    ids.forEach(id => {
        if (!hasKeystone(id, owner)) return;
        const ownerClass = getAscendKeystoneOwnerClass(id);
        const def = ownerClass ? (CLASS_KEYSTONE_DEFS[ownerClass] || []).find(node => node.id === id) : null;
        if (def) visit(def);
    });
}

/** 능력치 줄(stats)로 동작하는 키스톤(2026-10-02에 더한 전직 여섯). */
function accumulateCombatKeystoneStats(bucket, owner) {
    forEachActiveKeystoneDef(owner, def => (Array.isArray(def.stats) ? def.stats : []).forEach(line => addStatToBucket(bucket, line.stat, line.val)));
}

/** 키스톤의 고유 효과 줄(uniques). 고유 장비, 재능 개화 카드와 같은 고유 효과 엔진 키를 쓴다. */
function getActiveAscendKeystoneUniqueEffects(owner = game) {
    const out = [];
    forEachActiveKeystoneDef(owner, def => (Array.isArray(def.uniques) ? def.uniques : []).forEach(unique => {
        out.push({ key: unique.key, params: Object.assign({}, unique.params || {}), itemName: '전직 키스톤: ' + def.name, sourceSlot: 'ascendKeystone' });
    }));
    return out;
}

/** getPlayerStats의 고유 효과 목록에 전직 키스톤(맨 앞)과 재능 개화 카드(맨 뒤)의 고유 효과를 더한다(둘 다 이 한 경로로만 들어간다).
 * 엔진의 여러 키는 나중 줄이 앞 줄을 덮으므로, 키스톤을 앞에 두어 같은 효과를 주는 고유 장비의 수치가 쓰이게 한다. */
function pushBuildKeystoneUniqueEffects(target, owner = game) {
    target.unshift(...getActiveAscendKeystoneUniqueEffects(owner));
    const talent = typeof getActiveTalentKeystoneUniqueEffects === 'function' ? getActiveTalentKeystoneUniqueEffects() : [];
    talent.forEach(effect => { if (effect && effect.key) target.push(effect); });
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
            const [, item] = source;
            if (excludedSlots.has(item.slot) || excludedSlots.has('all:' + item.slot)) continue;
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
    accumulateCombatSocketJewels(result.gearExplicit, item);
}

/** 장비 소켓의 주얼: 공허 소켓 · 심연 소켓(황제의 심연띠는 증폭), 둘 다 소켓 주얼 배율을 받는다. */
function accumulateCombatSocketJewels(bucket, item) {
    const socketMultiplier = getSocketJewelMultiplier();
    if (item.voidSocket?.open && item.voidSocket.jewel) addSocketJewelStats(bucket, item.voidSocket.jewel, socketMultiplier);
    for (const socket of Array.isArray(item.abyssSockets) ? item.abyssSockets : []) {
        if (socket?.jewel) addSocketJewelStats(bucket, socket.jewel, socketMultiplier * getAbyssJewelMultiplier(item));
    }
}

// 심연 군주(워록 wlk8)와 재물욕(초월 공허)은 예전의 주얼 슬롯 추가 대신 장비 소켓 주얼의 옵션을 키운다(2026-09-30).
const SOCKET_JEWEL_BONUS = Object.freeze({ warlockLord: 0.25, greed: 0.1 });
function getSocketJewelMultiplier(owner = game) {
    const lord = owner.ascendClass === 'warlock' && hasKeystone('wlk8', owner) ? SOCKET_JEWEL_BONUS.warlockLord : 0;
    const greed = getTranscendentVoidPassiveCount('greed', owner) > 0 ? SOCKET_JEWEL_BONUS.greed : 0;
    return 1 + lord + greed;
}

function addSocketJewelStats(bucket, jewel, multiplier) {
    getJewelStats(jewel).forEach(stat => addStatToBucket(bucket, stat.id, Number((Number(stat.val || 0) * multiplier).toFixed(2))));
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

/** 황제의 심연띠: 심연 소켓 주얼 효과 증폭(고유 옵션의 굴린 값, 없으면 범위 가운데). */
function getAbyssJewelMultiplier(item) {
    if (!item || item.uniqueEffectKey !== 'abyssSocketAndJewelAmp') return 1;
    const params = item.uniqueEffectParams || {};
    const min = Number(params.ampMin || 1), max = Number(params.ampMax || 100);
    const pct = Number.isFinite(Number(params.ampPct)) ? Number(params.ampPct) : (min + max) / 2;
    return 1 + pct / 100;
}
