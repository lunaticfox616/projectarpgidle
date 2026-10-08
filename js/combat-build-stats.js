// Build-source accumulation. Each call owns its output buckets; live HP/buffs stay in combat.js.
// Source order is significant: support scaling runs after these sources, before temporary buffs.

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
    // 키스톤 줄은 전직을 고르지 않았어도 우주계 쌍둥이 키스톤으로 들어올 수 있다.
    accumulateCombatKeystoneStats(bucket, game);
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

/** getPlayerStats의 고유 효과 목록에 전직 키스톤과 재능 개화 카드의 고유 효과를 더한다(둘 다 이 한 경로로만 들어간다).
 * 키스톤이 쓰는 키는 같은 키가 여러 번 오면 엔진이 값마다 더 좋은 쪽으로 합치므로(mergeBetterUniqueParams) 순서는 상관없다. */
function pushBuildKeystoneUniqueEffects(target, owner = game) {
    const talent = typeof getActiveTalentKeystoneUniqueEffects === 'function' ? getActiveTalentKeystoneUniqueEffects() : [];
    getActiveAscendKeystoneUniqueEffects(owner).concat(talent).forEach(effect => { if (effect && effect.key) target.push(effect); });
}

/** 작을수록 좋은 고유 효과 값(재사용 대기, 발동 최소 적 수). */
const LOWER_IS_BETTER_UNIQUE_PARAMS = new Set(['cooldown', 'cooldownSec', 'icdSec', 'minEnemies']);

/** 같은 고유 효과를 여러 곳(고유 장비, 전직 키스톤)에서 받으면 값마다 더 좋은 쪽을 쓴다. 예전에는 나중 줄이 앞 줄을 통째로 덮어
 * 더 약한 고유 장비가 키스톤 효과를 깎았다(2026-10-02 검토). 두 값은 엔진이 기본값을 채운 숫자다. */
function mergeBetterUniqueParams(previous, next) {
    if (!previous) return next;
    const merged = { ...previous };
    Object.keys(next).forEach(name => {
        merged[name] = LOWER_IS_BETTER_UNIQUE_PARAMS.has(name) ? Math.min(previous[name], next[name]) : Math.max(previous[name], next[name]);
    });
    return merged;
}

/** Investment points are converted in the same order as the final-stat calculation. season: the current loop (세계수 껍질). */
function accumulateCombatLoopStats(bucket, loopBonus, deepBonus, season) {
    const loop = loopBonus || {};
    addStatToBucket(bucket, 'flatHp', (loop.flatHp || 0) * 12);
    addStatToBucket(bucket, 'flatDmg', (loop.flatDmg || 0) * 3);
    addStatToBucket(bucket, 'aspd', (loop.aspd || 0) * 1.5);
    addStatToBucket(bucket, 'move', (loop.move || 0) * 1.0);
    accumulateCombatDeepLoopStats(bucket, deepBonus || {});
    accumulateWorldTreeBarkStats(bucket, season);
}

/** Layers of 세계수 껍질 (data/maps.js WORLD_TREE_BARK) at this loop: one per milestone loop reached. */
function getWorldTreeBarkLayers(season) {
    const loop = Math.max(1, Math.floor(Number(season) || 1));
    return WORLD_TREE_BARK.loops.filter(at => loop >= at).length;
}

/** Every bark layer: 최대 생명력 +pctHp%, 받는 피해 -taken% (summed with the other generic taken-damage reductions). */
function accumulateWorldTreeBarkStats(bucket, season) {
    const layers = getWorldTreeBarkLayers(season);
    addStatToBucket(bucket, 'pctHp', layers * WORLD_TREE_BARK.pctHp);
    addStatToBucket(bucket, 'genericTakenDamageReducePct', layers * WORLD_TREE_BARK.taken);
}

/** Deep loop levels (data/maps.js LOOP_DEEP_STATS); the multiplicative damage line is applied by combat (getLoopDeepMorePct). */
function accumulateCombatDeepLoopStats(bucket, deep) {
    LOOP_DEEP_STATS.forEach(def => { if (def.stat) addStatToBucket(bucket, def.stat, (deep[def.key] || 0) * def.per); });
}

/** Multiplicative damage % from the deep loop levels (LOOP_DEEP_STATS lines with more: 'damage'). */
function getLoopDeepMorePct(deep) {
    return LOOP_DEEP_STATS.reduce((sum, def) => sum + (def.more === 'damage' ? Math.max(0, Number((deep || {})[def.key]) || 0) * def.per : 0), 0);
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
        const included = [];
        for (const source of resolvedSources) {
            const [, item] = source;
            if (excludedSlots.has(item.slot) || excludedSlots.has('all:' + item.slot)) continue;
            accumulateCombatEquipmentItem(result, source);
            included.push(item);
        }
        accumulateUniqueEffectStatLines(result, included);
        memo?.set('combat-equipment', result);
    }
    if (!memo) return result;
    // Buckets are private scalar lookups, never enumerated or saved. Inherit the static values;
    // jewel additions and keystone conversions write only to this evaluation's own properties.
    return { ...result, gearBase: Object.create(result.gearBase), gearExplicit: Object.create(result.gearExplicit),
        equippedUniqueEffects: result.equippedUniqueEffects.slice() };
}

/** 능력치 줄로만 동작하는 고유 효과(등급 17~20 일반 고유, 2026-10-09, data/items.js). 줄은 장비의 추가 옵션처럼 더해진다.
 * context.loop: 지금 루프(game.season). context.horizontal: 능력치를 주는 장비 중 수평 베이스(계열이 있는 베이스) 수. */
const UNIQUE_EFFECT_STAT_LINES = Object.freeze({
    loopGrowth: (p, context) => {
        const loops = Math.min(Number(p.maxLoops) || 0, context.loop);
        return [{ id: 'pctHp', val: loops * (Number(p.hpPerLoop) || 0) }, { id: 'pctDmg', val: loops * (Number(p.dmgPerLoop) || 0) }];
    },
    familyBond: (p, context) => {
        const pieces = Math.min(Number(p.maxPieces) || 0, context.horizontal);
        return [{ id: 'pctDmg', val: pieces * (Number(p.dmgPer) || 0) }, { id: 'resAll', val: pieces * (Number(p.resPer) || 0) }];
    },
    // 탐험 지도 시야 상한(js/act-exploration-state.js sightRadius)과 보급 상자 등급 확률(js/exploration-object-combat.js chestRules).
    sightBeyond: p => [{ id: 'sightCap', val: Number(p.cap) || 0 }],
    chestLuck: p => [{ id: 'chestGrade', val: Number(p.gradePct) || 0 }]
});

/** The stat lines of the stat-only unique effects (UNIQUE_EFFECT_STAT_LINES) worn in this evaluation's gear (items). */
function accumulateUniqueEffectStatLines(result, items) {
    const context = { loop: Math.max(1, Math.floor(Number(game.season) || 1)),
        horizontal: items.filter(item => BASE_ITEM_DB.some(base => base.id === item.baseId && base.family)).length };
    for (const effect of result.equippedUniqueEffects) {
        if (!Object.hasOwn(UNIQUE_EFFECT_STAT_LINES, effect.key)) continue;
        applyStatsToBucket(result.gearExplicit, UNIQUE_EFFECT_STAT_LINES[effect.key](effect.params || {}, context));
    }
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

/** 장비 소켓의 주얼: 공허 · 타락 · 심연 소켓(황제의 심연띠는 심연 소켓을 증폭), 모두 소켓 주얼 배율을 받는다. */
function accumulateCombatSocketJewels(bucket, item) {
    const socketMultiplier = getSocketJewelMultiplier();
    for (const row of equipmentSockets.jewels(item)) {
        addSocketJewelStats(bucket, row.jewel, socketMultiplier * (row.kind === 'abyss' ? getAbyssJewelMultiplier(item) : 1));
    }
}

// 심연 군주(워록 wlk8)와 재물욕(초월 공허)은 예전의 주얼 슬롯 추가 대신 장비 소켓 주얼의 옵션을 키운다(2026-09-30).
const SOCKET_JEWEL_BONUS = Object.freeze({ warlockLord: 0.25, greed: 0.1 });
function getSocketJewelMultiplier(owner = game) {
    const lord = hasKeystone('wlk8', owner) ? SOCKET_JEWEL_BONUS.warlockLord : 0;
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
