if (!Array.prototype.includes) {
    Array.prototype.includes = function(search, start) {
        let index = start || 0;
        if (index < 0) index = Math.max(this.length + index, 0);
        for (let i = index; i < this.length; i++) {
            if (this[i] === search || (search !== search && this[i] !== this[i])) return true;
        }
        return false;
    };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(search, pos) {
        let start = pos || 0;
        return this.substring(start, start + String(search).length) === String(search);
    };
}
if (!Math.hypot) {
    Math.hypot = function() {
        let sum = 0;
        for (let i = 0; i < arguments.length; i++) sum += arguments[i] * arguments[i];
        return Math.sqrt(sum);
    };
}
if (!Object.values) {
    Object.values = function(obj) {
        return Object.keys(obj).map(function(key) { return obj[key]; });
    };
}
if (!Object.entries) {
    Object.entries = function(obj) {
        return Object.keys(obj).map(function(key) { return [key, obj[key]]; });
    };
}
if (!Object.fromEntries) {
    Object.fromEntries = function(entries) {
        let obj = {};
        (entries || []).forEach(function(entry) {
            if (!entry || entry.length < 2) return;
            obj[entry[0]] = entry[1];
        });
        return obj;
    };
}
if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}
if (typeof HTMLCollection !== 'undefined' && !HTMLCollection.prototype.forEach) {
    HTMLCollection.prototype.forEach = Array.prototype.forEach;
}

// TODO: expose shared utility functions incrementally.

// Phase-3 extracted shared utility/stat formatting helpers.
function clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); }
function getInventoryLimit() { return 30 + (Math.max(0, Math.floor(game.inventoryExpandLevel || 0)) * 5); }
function getJewelInventoryLimit() { return JEWEL_INVENTORY_LIMIT + (Math.max(0, Math.floor(game.jewelInventoryExpandLevel || 0)) * 5); }
function getJewelMarketExpandCost() { return 1 + Math.max(0, Math.floor(game.jewelInventoryExpandLevel || 0)); }
function lerpNumber(start, end, t) { return start + (end - start) * t; }
function approachNumber(current, target, rate, dt) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    let blend = 1 - Math.exp(-Math.max(0, rate || 0) * Math.max(0, dt || 0));
    return current + (target - current) * blend;
}
function rndChoice(list) { return list[Math.floor(Math.random() * list.length)]; }
function hashSeed(value) {
    let str = String(value);
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function createSeededRng(seedValue) {
    let state = hashSeed(seedValue) || 1;
    return function() {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const SKILL_TAG_LABELS = {
    attack: '공격',
    melee: '근접',
    projectile: '투사체',
    physical: '물리',
    elemental: '원소',
    fire: '화염',
    cold: '냉기',
    lightning: '번개',
    chaos: '카오스',
    aoe: '범위',
    dot: '지속',
    slam: '강타',
    chain: '연쇄'
};
const TAGGED_DAMAGE_STAT_BY_TAG = {
    melee: 'meleePctDmg',
    projectile: 'projectilePctDmg',
    physical: 'physPctDmg',
    elemental: 'elementalPctDmg',
    fire: 'firePctDmg',
    cold: 'coldPctDmg',
    lightning: 'lightPctDmg',
    chaos: 'chaosPctDmg',
    aoe: 'aoePctDmg',
    slam: 'slamPctDmg'
};
const COMPARE_STAT_META = {
    dps: { label: 'DPS', format: value => `${Math.floor(value)}` },
    baseDmg: { label: '공격력', format: value => `${Math.floor(value)}` },
    aspd: { label: '공속', format: value => value.toFixed(2) },
    crit: { label: '치명타', format: value => `${value.toFixed(1)}%` },
    critDmg: { label: '치피배', format: value => `${Math.floor(value)}%` },
    maxHp: { label: '최대 생명력', format: value => `${Math.floor(value)}` },
    moveSpeed: { label: '이동 속도', format: value => `${Math.floor(value)}%` },
    dr: { label: '물피감', format: value => `${Math.floor(value)}%` },
    physIgnore: { label: '물피감 무시', format: value => `${Math.floor(value)}%` },
    resPen: { label: '저항 관통', format: value => `${Math.floor(value)}%` },
    resF: { label: '화염 저항', format: value => `${Math.floor(value)}%` },
    resC: { label: '냉기 저항', format: value => `${Math.floor(value)}%` },
    resL: { label: '번개 저항', format: value => `${Math.floor(value)}%` },
    resChaos: { label: '카오스 저항', format: value => `${Math.floor(value)}%` },
    regen: { label: '초당 재생', format: value => `${formatValue('regen', value)}%` },
    leech: { label: '흡혈', format: value => `${formatValue('leech', value)}%` },
    ds: { label: '연속 타격', format: value => `${Math.floor(value)}%` },
    gemLv: { label: '젬 레벨', format: value => `${Math.floor(value)}` },
    suppCap: { label: '보조 한도', format: value => `${Math.floor(value)}` },
    minDmgRoll: { label: '최소피해 보정', format: value => `${Math.floor(value)}%` },
    maxDmgRoll: { label: '최대피해 보정', format: value => `${Math.floor(value)}%` }
};
function formatValue(statId, value) {
    if (['leech', 'regen', 'regenSuppress'].includes(statId)) return Number(value).toFixed(1);
    return Math.floor(value);
}
function formatPercentMultiplier(value) {
    return `${Math.round(value * 100)}%`;
}
function translateSkillTag(tag) {
    return SKILL_TAG_LABELS[tag] || tag;
}
function getSkillTagList(skill) {
    return (skill.tags || []).map(translateSkillTag);
}
function getStatName(statId) {
    const names = {
        flatHp: '최대 생명력',
        pctHp: '생명력 증가(%)',
        regen: '초당 생명력 재생(%)',
        flatDmg: '기본 피해',
        pctDmg: '피해 증가(%)',
        meleePctDmg: '근접 피해(%)',
        slamPctDmg: '강타 피해(%)',
        projectilePctDmg: '투사체 피해(%)',
        physPctDmg: '물리 피해(%)',
        elementalPctDmg: '원소 피해(%)',
        firePctDmg: '화염 피해(%)',
        coldPctDmg: '냉기 피해(%)',
        lightPctDmg: '번개 피해(%)',
        chaosPctDmg: '카오스 피해(%)',
        aoePctDmg: '범위 피해(%)',
        dotPctDmg: '지속 피해 배율(%)',
        aspd: '공격 속도(%)',
        move: '이동 속도(%)',
        crit: '치명타 확률(%)',
        critDmg: '치명타 피해(%)',
        leech: '생명력 흡수(%)',
        gemLevel: '모든 스킬 젬 레벨',
        dr: '받는 피해 감소(%)',
        physIgnore: '물리 피해 감소 무시(%)',
        ds: '연속 타격(%)',
        suppCap: '보조 스킬 젬 한도',
        minDmgRoll: '최소 피해 보정(%)',
        maxDmgRoll: '최대 피해 보정(%)',
        resPen: '저항 관통(%)',
        resF: '화염 저항(%)',
        resC: '냉기 저항(%)',
        resL: '번개 저항(%)',
        resAll: '모든 원소 저항(%)',
        resChaos: '카오스 저항(%)',
        regenSuppress: '재생 억제(%)',
        targetAny: '스킬 타겟 수',
        targetProjectile: '투사체 스킬 타겟 수',
        targetSlam: '강타 스킬 타겟 수',
        armor: '방어도',
        evasion: '회피',
        energyShield: '에너지 보호막',
        armorPct: '방어도 증가(%)',
        evasionPct: '회피 증가(%)',
        energyShieldPct: '에너지 보호막 증가(%)'
    };
    return names[statId] || (P_STATS[statId] && P_STATS[statId].name) || statId;
}
function getRarityColor(rarity) {
    if (rarity === 'unique') return '#ff9f43';
    if (rarity === 'rare') return '#f1c40f';
    if (rarity === 'magic') return '#3498db';
    return '#d0d5da';
}
function getRarityRank(rarity) {
    if (rarity === 'normal') return 0;
    if (rarity === 'magic') return 1;
    if (rarity === 'rare') return 2;
    if (rarity === 'unique') return 3;
    return 99;
}

function createEmptyStatBucket() {
    return {
        flatDmg: 0, pctDmg: 0, flatHp: 0, pctHp: 0, aspd: 0, crit: 0, move: 0, gemLevel: 0, suppCap: 0,
        dr: 0, physIgnore: 0, resPen: 0, resF: 0, resC: 0, resL: 0, resChaos: 0, leech: 0, critDmg: 0, regen: 0, regenSuppress: 0, ds: 0, expGain: 0,
        minDmgRoll: 0, maxDmgRoll: 0,
        meleePctDmg: 0, slamPctDmg: 0, projectilePctDmg: 0, physPctDmg: 0, elementalPctDmg: 0, firePctDmg: 0, coldPctDmg: 0, lightPctDmg: 0, chaosPctDmg: 0, aoePctDmg: 0, dotPctDmg: 0,
        targetAny: 0, targetProjectile: 0, targetSlam: 0,
        armor: 0, evasion: 0, energyShield: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0
    };
}
function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (!statId || !Number.isFinite(value)) return;
    if (statId === 'flatDmg') bucket.flatDmg += value;
    else if (statId === 'pctDmg') bucket.pctDmg += value;
    else if (statId === 'meleePctDmg') bucket.meleePctDmg += value;
    else if (statId === 'slamPctDmg') bucket.slamPctDmg += value;
    else if (statId === 'projectilePctDmg') bucket.projectilePctDmg += value;
    else if (statId === 'physPctDmg') bucket.physPctDmg += value;
    else if (statId === 'elementalPctDmg') bucket.elementalPctDmg += value;
    else if (statId === 'firePctDmg') bucket.firePctDmg += value;
    else if (statId === 'coldPctDmg') bucket.coldPctDmg += value;
    else if (statId === 'lightPctDmg') bucket.lightPctDmg += value;
    else if (statId === 'chaosPctDmg') bucket.chaosPctDmg += value;
    else if (statId === 'aoePctDmg') bucket.aoePctDmg += value;
    else if (statId === 'dotPctDmg') bucket.dotPctDmg += value;
    else if (statId === 'flatHp') bucket.flatHp += value;
    else if (statId === 'pctHp') bucket.pctHp += value;
    else if (statId === 'aspd') bucket.aspd += value;
    else if (statId === 'crit') bucket.crit += value;
    else if (statId === 'move') bucket.move += value;
    else if (statId === 'gemLevel') bucket.gemLevel += value;
    else if (statId === 'dr') bucket.dr += value;
    else if (statId === 'physIgnore') bucket.physIgnore += value;
    else if (statId === 'resPen') bucket.resPen += value;
    else if (statId === 'leech') bucket.leech += value;
    else if (statId === 'critDmg') bucket.critDmg += value;
    else if (statId === 'regen') bucket.regen += value;
    else if (statId === 'regenSuppress') bucket.regenSuppress += value;
    else if (statId === 'suppCap') bucket.suppCap += value;
    else if (statId === 'minDmgRoll') bucket.minDmgRoll += value;
    else if (statId === 'maxDmgRoll') bucket.maxDmgRoll += value;
    else if (statId === 'resF') bucket.resF += value;
    else if (statId === 'resC') bucket.resC += value;
    else if (statId === 'resL') bucket.resL += value;
    else if (statId === 'resAll') { bucket.resF += value; bucket.resC += value; bucket.resL += value; }
    else if (statId === 'resChaos') bucket.resChaos += value;
    else if (statId === 'ds') bucket.ds += value;
    else if (statId === 'expGain') bucket.expGain += value;
    else if (statId === 'targetAny') bucket.targetAny += value;
    else if (statId === 'targetProjectile') bucket.targetProjectile += value;
    else if (statId === 'targetSlam') bucket.targetSlam += value;
    else if (statId === 'armor') bucket.armor += value;
    else if (statId === 'evasion') bucket.evasion += value;
    else if (statId === 'energyShield') bucket.energyShield += value;
    else if (statId === 'armorPct') bucket.armorPct += value;
    else if (statId === 'evasionPct') bucket.evasionPct += value;
    else if (statId === 'energyShieldPct') bucket.energyShieldPct += value;
}
function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach(stat => addStatToBucket(bucket, stat.id, stat.val));
}
function getTaggedDamageBreakdown(bucket, skill) {
    let tags = new Set(skill.tags || []);
    let parts = [];
    let total = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        let statId = TAGGED_DAMAGE_STAT_BY_TAG[tag];
        let value = bucket[statId] || 0;
        if (!value || !tags.has(tag)) return;
        total += value;
        parts.push({ tag: tag, statId: statId, value: value });
    });
    return { total: total, parts: parts };
}
function makeSourceLine(label, value, suffix, formatter) {
    if (!value) return null;
    let rendered = formatter ? formatter(value) : `${Math.floor(value)}${suffix || ''}`;
    return `${label} +${rendered}`;
}








var PASSIVE_WORLD_SCALE = 1.14;
const MAX_PLAYER_LEVEL = 200;
var PASSIVE_BOUNDS = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
let game;
let reachableNodes = new Set();
let discoveredPassiveNodes = new Set();
let previewPassiveNodes = new Set();

safeExposeGlobals({ clampNumber, getInventoryLimit, getJewelInventoryLimit, getJewelMarketExpandCost, lerpNumber, approachNumber, rndChoice, hashSeed, createSeededRng, formatValue, formatPercentMultiplier, translateSkillTag, getSkillTagList, getStatName, getRarityColor, getRarityRank, createEmptyStatBucket, addStatToBucket, applyStatsToBucket, getTaggedDamageBreakdown, makeSourceLine });

function safeExposeGlobals(map) {
    Object.keys(map || {}).forEach(function (key) {
        if (typeof window[key] === "undefined") window[key] = map[key];
    });
}
window.safeExposeGlobals = window.safeExposeGlobals || safeExposeGlobals;
