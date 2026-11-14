import { createEmptyStatBucket, addStatToBucket, applyStatsToBucket } from '../common/stat-bucket.mjs';
// Explicit owner and per-evaluation memo: accumulation never swaps the live game or performs equipment validation.
// Only caller-owned buckets are mutated; authored lines, rounding and source order are preserved.
class CombatBuildStats {
    constructor(deps) { this.deps = deps; }
    accumulateCombatSeasonStats(bucket, nodeIds, levels) {
        const nodeLevels = levels && typeof levels === 'object' ? levels : {};
        nodeIds.forEach(id => {
            const node = this.deps.seasonNode(id);
            if (!node) return;
            const level = Math.max(1, Math.floor(nodeLevels[id] || 1));
            const value = Number((node.val * (1 + Math.max(0, level - 1) * 0.2)).toFixed(4));
            addStatToBucket(bucket, node.stat, value);
        });
    }

    accumulateCombatAscendStats(bucket, nodeIds, ascendClass, owner) {
        // 키스톤 줄은 전직을 고르지 않았어도 우주계 쌍둥이 키스톤으로 들어올 수 있다.
        this.accumulateCombatKeystoneStats(bucket, owner);
        if (!ascendClass) return;
        const tree = this.deps.classTree(ascendClass);
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

    forEachActiveKeystoneDef(owner, visit) {
        const ids = new Set([...(owner.ascendKeystones || []), ...(owner.cosmosTwinKeystones || [])]);
        ids.forEach(id => {
            if (!this.deps.keystoneActive(id, owner)) return;
            const ownerClass = this.deps.keystoneClass(id);
            const def = ownerClass ? (this.deps.CLASS_KEYSTONE_DEFS[ownerClass] || []).find(node => node.id === id) : null;
            if (def) visit(def);
        });
    }

    accumulateCombatKeystoneStats(bucket, owner) {
        this.forEachActiveKeystoneDef(owner, def => (Array.isArray(def.stats) ? def.stats : []).forEach(line => addStatToBucket(bucket, line.stat, line.val)));
    }

    getActiveAscendKeystoneUniqueEffects(owner) {
        const out = [];
        this.forEachActiveKeystoneDef(owner, def => (Array.isArray(def.uniques) ? def.uniques : []).forEach(unique => {
            out.push({ key: unique.key, params: Object.assign({}, unique.params || {}), itemName: '전직 키스톤: ' + def.name, sourceSlot: 'ascendKeystone' });
        }));
        return out;
    }

    pushBuildKeystoneUniqueEffects(target, owner, talent) {
        this.getActiveAscendKeystoneUniqueEffects(owner).concat(talent).forEach(effect => { if (effect && effect.key) target.push(effect); });
    }

    mergeBetterUniqueParams(previous, next) {
        if (!previous) return next;
        const merged = { ...previous };
        Object.keys(next).forEach(name => {
            merged[name] = LOWER_IS_BETTER_UNIQUE_PARAMS.has(name) ? Math.min(previous[name], next[name]) : Math.max(previous[name], next[name]);
        });
        return merged;
    }

    accumulateCombatLoopStats(bucket, loopBonus, deepBonus, season, owner) {
        const loop = loopBonus || {};
        addStatToBucket(bucket, 'flatHp', (loop.flatHp || 0) * 12);
        addStatToBucket(bucket, 'flatDmg', (loop.flatDmg || 0) * 3);
        addStatToBucket(bucket, 'aspd', (loop.aspd || 0) * 1.5);
        addStatToBucket(bucket, 'move', (loop.move || 0) * 1.0);
        this.accumulateCombatDeepLoopStats(bucket, deepBonus || {});
        this.accumulateWorldTreeBarkStats(bucket, season, owner);
    }

    accumulateWorldTreeBarkStats(bucket, season, owner) {
        const layers = this.deps.barkLayers(season), effect = this.getWorldTreeBarkEffect(owner);
        addStatToBucket(bucket, 'pctHp', layers * this.deps.WORLD_TREE_BARK.pctHp);
        addStatToBucket(bucket, 'genericTakenDamageReducePct', layers * this.deps.WORLD_TREE_BARK.taken + effect.takenPct);
        addStatToBucket(bucket, 'move', effect.movePct);
    }

    isWorldTreeBarkZone(zone, owner) {
        if (!zone || !['act', 'abyss'].includes(zone.type) || !this.deps.barkLayers(owner.season)) return false;
        return Number(zone.id) < this.deps.barkReach(owner) && Number(zone.id) >= Math.max(0, Math.floor(owner.maxZoneId || 0));
    }

    getWorldTreeBarkEffect(owner) {
        if (!this.isWorldTreeBarkZone(this.deps.zone(owner.currentZoneId), owner)) return WORLD_TREE_BARK_NO_EFFECT;
        const total = key => Math.max(0, Math.floor(Number(owner.worldTreeBark[key]) || 0)) * this.deps.WORLD_TREE_BARK.stats.find(def => def.key === key).per;
        return { on: true, damagePct: total('damage'), takenPct: total('taken'), movePct: total('move') };
    }

    accumulateCombatDeepLoopStats(bucket, deep) {
        this.deps.LOOP_DEEP_STATS.forEach(def => { if (def.stat) addStatToBucket(bucket, def.stat, (deep[def.key] || 0) * def.per); });
    }

    getLoopDeepMorePct(deep) {
        return this.deps.LOOP_DEEP_STATS.reduce((sum, def) => sum + (def.more === 'damage' ? Math.max(0, Number((deep || {})[def.key]) || 0) * def.per : 0), 0);
    }

    accumulateCombatRuneStats(bucket, runeState = {}) {
        const result = { runeCorpseExplodeChance: 0, runeCorpseExplodeLifePct: 0, runeResonancePower: 0 };
        if (!Array.isArray(this.deps.UNDERWORLD_RUNE_DB)) return result;
        const state = runeState || {};
        const cap = Math.max(0, Math.min(6, Math.floor(state.unlockedSlots || 0)));
        const equipped = Array.isArray(state.equippedRunes) ? state.equippedRunes.slice(0, cap) : [];
        equipped.forEach(no => this.accumulateCombatRuneEntry(bucket, result, state, no));
        return result;
    }

    accumulateCombatRuneEntry(bucket, result, state, no) {
        const number = Math.floor(Number(no) || 0);
        if (number <= 0) return;
        const rune = this.deps.UNDERWORLD_RUNE_DB.find(row => row.no === number);
        if (!rune) return;
        const level = Math.max(0, Math.floor(state.enhanceLvByNo?.[number] || 0));
        const value = Number(rune.val || 0) * (1 + level * 0.01);
        const special = { corpseExplodeChance: 'runeCorpseExplodeChance', corpseExplodeLifePct: 'runeCorpseExplodeLifePct', resonancePower: 'runeResonancePower' };
        if (Object.hasOwn(special, rune.stat)) result[special[rune.stat]] += value;
        else addStatToBucket(bucket, rune.stat, value);
        const lines = state.bonusLinesByNo?.[number];
        if (Array.isArray(lines)) lines.forEach(line => { if (line && line.stat) addStatToBucket(bucket, line.stat, Number(line.val || 0)); });
    }

    getBonusResonancePower(runePower, reward, passive, gear) {
        return runePower + Math.max(0, Number(reward.runeResonancePower) || 0) + Math.max(0, Number(passive.runeResonancePower) || 0) + Math.max(0, Number(gear.runeResonancePower) || 0);
    }

    addConstellationBuffStat(reward, owner) {
        const constellation = owner.meteorSite && owner.meteorSite.constellationBuff;
        if (constellation && constellation.stat) addStatToBucket(reward, constellation.stat, constellation.val || 0);
    }

    /** The caller has already added the constellation and applied passive conversions, in that order. */
    readRequirementAttributes(buckets) {
        const total = stat => Math.max(0, Object.values(buckets).reduce((sum, bucket) => sum + (bucket[stat] || 0), 0));
        return { strength: total('strength'), dexterity: total('dexterity'), intelligence: total('intelligence') };
    }

    /** memo is for one unchanged build/equipment view. Its buckets remain prototypes, not flattened or serialized data. */
    getCombatEquipmentContributions(resolvedSources, excludedSlots, owner, memo) {
        let result = memo?.get('combat-equipment');
        if (!result) {
            result = { gearBase: createEmptyStatBucket(), gearExplicit: createEmptyStatBucket(),
                localDefenseTotals: { armor: 0, evasion: 0, energyShield: 0 }, globalDefensePct: { armor: 0, evasion: 0, energyShield: 0 }, shieldArmorForDamage: 0,
                shieldBaseBlockChance: 0, shieldBlockChancePct: 0, shieldBlockChanceFlat: 0,
                equippedUniqueEffects: [] };
            const included = [];
            for (const source of resolvedSources) {
                const [, item] = source;
                if (excludedSlots.has(item.slot) || excludedSlots.has('all:' + item.slot)) continue;
                this.accumulateCombatEquipmentItem(result, source, owner);
                included.push(item);
            }
            this.accumulateUniqueEffectStatLines(result, included, owner);
            memo?.set('combat-equipment', result);
        }
        if (!memo) return result;
        // Buckets are private scalar lookups, never enumerated or saved. Inherit the static values;
        // jewel additions and keystone conversions write only to this evaluation's own properties.
        return { ...result, gearBase: Object.create(result.gearBase), gearExplicit: Object.create(result.gearExplicit),
            equippedUniqueEffects: result.equippedUniqueEffects.slice() };
    }

    countRipeStumpGrowth(owner) {
        const box = owner.stumpBox;
        if (!box || !Array.isArray(box.board) || !Array.isArray(box.items)) return 0;
        const onBoard = new Set(box.board.filter(id => id !== null));
        return box.items.filter(item => onBoard.has(item.id) && item.ripe === true && item.family === 'seed').length;
    }

    uniqueEffectContext(items, owner) {
        const anointNodes = item => (item.anoint ? [item.anoint.nodeId, item.anoint.second].filter(Boolean).length : 0);
        return {
            loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
            horizontal: items.filter(item => this.deps.BASE_ITEM_DB.some(base => base.id === item.baseId && base.family)).length,
            uniques: items.filter(item => item.rarity === 'unique').length,
            rares: items.filter(item => item.rarity === 'rare').length,
            empty: UNIQUE_EFFECT_GEAR_SLOTS.filter(slot => !items.includes((owner.equipment || {})[slot])).length,
            wards: this.deps.colonyWards ? this.deps.colonyWards.openSlots(owner).filter(slot => this.deps.colonyWards.isWard((owner.equipment || {})[slot])).length : 0,
            corrupted: items.filter(item => item.corrupted === true).length,
            quality: items.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.quality) || 0)), 0),
            anoints: items.reduce((sum, item) => sum + anointNodes(item), 0),
            stumpMature: this.countRipeStumpGrowth(owner)
        };
    }

    accumulateUniqueEffectStatLines(result, items, owner) {
        const effects = result.equippedUniqueEffects.filter(effect => Object.hasOwn(UNIQUE_EFFECT_STAT_LINES, effect.key));
        if (!effects.length) return;
        const context = this.uniqueEffectContext(items, owner);
        for (const effect of effects) {
            for (const line of UNIQUE_EFFECT_STAT_LINES[effect.key](effect.params || {}, context)) {
                // 막기 확률 +%p는 방패 줄처럼 더한다(장비 버킷의 blockChance는 막기 공식이 읽지 않는다).
                if (line.id === 'blockChance') result.shieldBlockChanceFlat += line.val;
                else addStatToBucket(result.gearExplicit, line.id, line.val);
            }
        }
    }

    accumulateCombatEquipmentItem(result, [slotKey, item, resolved], owner) {
        for (const [sourceSlot, source] of [[slotKey, item], [resolved.mirrorSourceSlot, resolved.mirrorSourceItem]]) {
            if (source?.rarity === 'unique' && source.uniqueEffectKey) {
                result.equippedUniqueEffects.push({ key: source.uniqueEffectKey, params: source.uniqueEffectParams || null,
                    itemName: source.name || '', sourceSlot });
            }
        }
        applyStatsToBucket(result.gearBase, resolved.baseStats);
        applyStatsToBucket(result.gearExplicit, resolved.explicitStats);
        this.accumulateCombatItemDefenses(result, slotKey, item, resolved);
        this.accumulateCombatSocketJewels(result, item, owner);
    }

    accumulateCombatSocketJewels(result, item, owner) {
        const socketMultiplier = this.getSocketJewelMultiplier(owner);
        for (const row of this.deps.equipmentSockets.jewels(item)) {
            this.addSocketJewelStats(result, row.jewel, socketMultiplier * (row.kind === 'abyss' ? this.getAbyssJewelMultiplier(item) : 1));
        }
        for (const row of this.deps.equipmentSockets.harvests(item)) {
            this.deps.stumpBox.socketLines(row.harvest).forEach(line => addStatToBucket(result.gearExplicit, line.stat, line.value));
        }
    }

    getSocketJewelMultiplier(owner) {
        const lord = this.deps.keystoneActive('wlk8', owner) ? SOCKET_JEWEL_BONUS.warlockLord : 0;
        const greed = this.deps.voidPassiveCount('greed', owner) > 0 ? SOCKET_JEWEL_BONUS.greed : 0;
        return 1 + lord + greed;
    }

    addSocketJewelStats(result, jewel, multiplier) {
        this.deps.jewelStats(jewel).forEach(stat => {
            const value = Number((Number(stat.val || 0) * multiplier).toFixed(2));
            addStatToBucket(result.gearExplicit, stat.id, value);
            this.addGlobalDefensePct(result.globalDefensePct, stat.id, value);
        });
    }

    addGlobalDefensePct(target, statId, value) {
        if (Object.hasOwn(DEFENSE_PCT_KINDS, statId)) target[DEFENSE_PCT_KINDS[statId]] += value;
    }

    accumulateCombatItemDefenses(result, slotKey, item, resolved) {
        const base = { armor: 0, evasion: 0, energyShield: 0 };
        const flat = { ...base }, pct = { ...base };
        resolved.baseStats.forEach(stat => {
            if (!stat) return;
            if (Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0);
            // 대검의 기본 막기는 주 무기 칸에서만: 완갑 칸에 낀 보조 대검까지 세면 쌍수 대검이 막기 완갑보다 높았다
            const offhandWeapon = slotKey === '방패' && item.slot === '무기';
            if (stat.id === 'baseBlockChance' && !offhandWeapon) result.shieldBaseBlockChance += Number(stat.val || 0);
        });
        const addExplicit = stat => this.accumulateCombatDefenseLine(result, flat, pct, stat);
        resolved.explicitStats.forEach(stat => {
            if (!stat) return;
            addExplicit(stat);
            if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(addExplicit);
        });
        const armor = (base.armor + flat.armor) * (1 + pct.armor / 100);
        for (const kind of Object.keys(base)) if (base[kind] + flat[kind] <= 0) result.globalDefensePct[kind] += pct[kind];
        result.localDefenseTotals.armor += armor;
        result.localDefenseTotals.evasion += (base.evasion + flat.evasion) * (1 + pct.evasion / 100);
        result.localDefenseTotals.energyShield += (base.energyShield + flat.energyShield) * (1 + pct.energyShield / 100);
        if (slotKey === '방패' && item.slot === '방패') result.shieldArmorForDamage = Math.max(0, armor);
    }

    accumulateCombatDefenseLine(result, flat, pct, stat) {
        if (!stat) return;
        const value = Number(stat.val || 0);
        if (Object.hasOwn(flat, stat.id)) flat[stat.id] += value;
        const percentKey = { armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' }[stat.id];
        if (Object.hasOwn(pct, percentKey)) pct[percentKey] += value;
        if (stat.id === 'baseBlockChance') result.shieldBaseBlockChance += value;
        if (stat.id === 'blockChancePct') result.shieldBlockChancePct += value;
        if (stat.id === 'blockChance') result.shieldBlockChanceFlat += value;
    }

    getAbyssJewelMultiplier(item) {
        if (!item || item.uniqueEffectKey !== 'abyssSocketAndJewelAmp') return 1;
        const params = item.uniqueEffectParams || {};
        const min = Number(params.ampMin || 1), max = Number(params.ampMax || 100);
        const pct = Number.isFinite(Number(params.ampPct)) ? Number(params.ampPct) : (min + max) / 2;
        return 1 + pct / 100;
    }
}

const LOWER_IS_BETTER_UNIQUE_PARAMS = new Set(['cooldown', 'cooldownSec', 'icdSec', 'minEnemies']);


const WORLD_TREE_BARK_NO_EFFECT = Object.freeze({ on: false, damagePct: 0, takenPct: 0, movePct: 0 });


/** count × per of two stats, count at most max (params of the "per thing" unique effects). */
const perCountLines = (count, max, lines) => lines.map(([id, per]) => ({ id, val: Math.min(Number(max) || 0, count) * (Number(per) || 0) }));

/** 능력치 줄로만 동작하는 고유 효과(등급 17~20 일반 고유와 리그 우두머리 고유, 2026-10-09, data/items.js). 줄은 장비의 추가 옵션처럼
 * 더해진다. context(uniqueEffectContext): 지금 루프, 능력치를 주는 장비 중 수평 베이스 수, 타락한 장비 수, 장비 품질 합, 목걸이에
 * 새긴 노드 수, 그루터기 함 판의 다 자란 씨앗 수. */
const UNIQUE_EFFECT_STAT_LINES = Object.freeze({
    loopGrowth: (p, context) => perCountLines(context.loop, p.maxLoops, [['pctHp', p.hpPerLoop], ['pctDmg', p.dmgPerLoop]]),
    familyBond: (p, context) => perCountLines(context.horizontal, p.maxPieces, [['pctDmg', p.dmgPer], ['resAll', p.resPer]]),
    // 탐험 지도 시야 상한(js/act-exploration-state.js sightRadius)과 보급 상자 등급 확률(js/exploration-object-combat.js chestRules).
    sightBeyond: p => [{ id: 'sightCap', val: Number(p.cap) || 0 }],
    // 되감긴 모래시계: 재사용 대기시간 감소 상한(js/skills.js getSkillCooldownMs, 기본 60%)을 올린다.
    cooldownReductionCap: p => [{ id: 'cooldownReductionCapBonus', val: Number(p.pct) || 0 }],
    chestLuck: p => [{ id: 'chestGrade', val: Number(p.gradePct) || 0 }],
    // 리그 우두머리 고유: 잿불 터(타락), 수액 상처(품질), 시든 정원(목걸이 기름), 묘목장(그루터기 함).
    emberHeart: (p, context) => perCountLines(context.corrupted, p.max, [['pctDmg', p.dmgPer], ['resF', p.resPer]]),
    amberTime: (p, context) => perCountLines(Math.floor(context.quality / (Number(p.qualityStep) || 10)), p.max, [['pctDmg', p.dmgPer], ['pctHp', p.hpPer]]),
    witheredEcho: (p, context) => perCountLines(context.anoints, p.max, [['pctDmg', p.dmgPer], ['resChaos', p.resPer]]),
    nurseryBloom: (p, context) => perCountLines(context.stumpMature, p.max, [['pctHp', p.hpPer], ['pctDmg', p.dmgPer]]),
    // 체이싱 고유(2026-10-20): 착용한 고유 장비(달을 벤 초승달), 희귀 장비(세계수의 첫 껍질), 장착한 액막이(고요한 맹세), 빈 장비
    // 칸(비워 둔 자리)의 수만큼.
    uniqueChorus: (p, context) => perCountLines(context.uniques, p.max, [['pctDmg', p.dmgPer], ['aspd', p.aspdPer]]),
    rareBark: (p, context) => perCountLines(context.rares, p.max, [['pctHp', p.hpPer], ['resAll', p.resPer]]),
    wardVow: (p, context) => perCountLines(context.wards, p.max, [['blockChance', p.blockPer], ['dr', p.drPer]]),
    emptyPlaces: (p, context) => perCountLines(context.empty, p.max, [['pctDmg', p.dmgPer], ['pctHp', p.hpPer]])
});
/** The gear slots the empty count looks at: the paperdoll's eleven (a third ring slot, opened by a void passive, is left out). */
const UNIQUE_EFFECT_GEAR_SLOTS = Object.freeze(['무기', '투구', '갑옷', '방패', '장갑1', '장갑2', '신발', '목걸이', '반지1', '반지2', '허리띠']);


// 심연 군주(워록 wlk8)와 재물욕(초월 공허)은 예전의 주얼 슬롯 추가 대신 장비 소켓 주얼의 옵션을 키운다(2026-09-30).
const SOCKET_JEWEL_BONUS = Object.freeze({ warlockLord: 0.25, greed: 0.1 });


/** 방어도, 회피, 에너지 보호막(%) 줄이 주인공의 그 방어 합계를 올리는 경우: 주얼의 줄, 그리고 그 방어가 없는 장비의 줄. 장비의 줄은 그
 * 장비의 방어에만 붙어(accumulateCombatItemDefenses), 바탕에 그 방어가 없는 고유 장비 30줄(심층 제련검, 룬 심장 목걸이 등)과 주얼의
 * 줄은 아무것도 올리지 않았다(2026-10-17). */
const DEFENSE_PCT_KINDS = Object.freeze({ armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' });


export function createCombatBuildStats(deps) {
    const runtime = new CombatBuildStats(deps);
    return Object.freeze({
        accumulateCombatSeasonStats: runtime.accumulateCombatSeasonStats.bind(runtime),
        accumulateCombatAscendStats: runtime.accumulateCombatAscendStats.bind(runtime),
        forEachActiveKeystoneDef: runtime.forEachActiveKeystoneDef.bind(runtime),
        pushBuildKeystoneUniqueEffects: runtime.pushBuildKeystoneUniqueEffects.bind(runtime),
        mergeBetterUniqueParams: runtime.mergeBetterUniqueParams.bind(runtime),
        accumulateCombatLoopStats: runtime.accumulateCombatLoopStats.bind(runtime),
        accumulateWorldTreeBarkStats: runtime.accumulateWorldTreeBarkStats.bind(runtime),
        isWorldTreeBarkZone: runtime.isWorldTreeBarkZone.bind(runtime),
        getWorldTreeBarkEffect: runtime.getWorldTreeBarkEffect.bind(runtime),
        getLoopDeepMorePct: runtime.getLoopDeepMorePct.bind(runtime),
        accumulateCombatRuneStats: runtime.accumulateCombatRuneStats.bind(runtime),
        getBonusResonancePower: runtime.getBonusResonancePower.bind(runtime),
        addConstellationBuffStat: runtime.addConstellationBuffStat.bind(runtime),
        readRequirementAttributes: runtime.readRequirementAttributes.bind(runtime),
        getCombatEquipmentContributions: runtime.getCombatEquipmentContributions.bind(runtime),
        getSocketJewelMultiplier: runtime.getSocketJewelMultiplier.bind(runtime),
        addGlobalDefensePct: runtime.addGlobalDefensePct.bind(runtime),
        getAbyssJewelMultiplier: runtime.getAbyssJewelMultiplier.bind(runtime)
    });
}
