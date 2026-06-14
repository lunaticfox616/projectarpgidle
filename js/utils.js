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
    chain: '연쇄',
    summon: '소환수',
    summon_attack: '공격형 소환수',
    summon_guard: '방어형 소환수'
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
    armor: { label: '방어도', format: value => `${Math.floor(value)}` },
    armorReduction: { label: '방어도 피해 감소', format: value => `${value.toFixed(1)}%` },
    evasion: { label: '회피', format: value => `${Math.floor(value)}` },
    evadeChance: { label: '회피 확률', format: value => `${value.toFixed(1)}%` },
    energyShield: { label: '에너지 보호막', format: value => `${Math.floor(value)}` },
    energyShieldRegenRate: { label: '에너지 보호막 재생', format: value => `${value.toFixed(1)}%` },
    deflectChance: { label: '비껴내기 확률', format: value => `${value.toFixed(1)}%` },
    deflectDamageReduce: { label: '비껴내기 피해 감소', format: value => `${value.toFixed(1)}%` },
    blockChance: { label: '막기 확률', format: value => `${value.toFixed(1)}%` },
    blockChanceMax: { label: '막기 확률 상한', format: value => `${value.toFixed(1)}%` },
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
    leechRateCap: { label: '흡혈 회복 속도', format: value => `+${formatValue('leechRateCap', value)}%p` },
    leechTotalCap: { label: '흡혈 총 회복량', format: value => `+${formatValue('leechTotalCap', value)}%p` },
    leechInstanceCap: { label: '흡혈 타격당 회복량', format: value => `+${formatValue('leechInstanceCap', value)}%p` },
    ds: { label: '연속 타격', format: value => `${Math.floor(value)}%` },
    gemLv: { label: '젬 레벨', format: value => `${Math.floor(value)}` },
    suppCap: { label: '보조 한도', format: value => `${Math.floor(value)}` },
    minDmgRoll: { label: '최소피해 보정', format: value => `${Math.floor(value)}%` },
    maxDmgRoll: { label: '최대피해 보정', format: value => `${Math.floor(value)}%` }
};

function getTalismanMomentRoll(talisman, options = {}) {
    if (!talisman || talisman.special !== 'moment') return 0;
    let min = Math.floor(Number.isFinite(Number(talisman.bossFinalDmgMin)) ? Number(talisman.bossFinalDmgMin) : 5);
    let max = Math.floor(Number.isFinite(Number(talisman.bossFinalDmgMax)) ? Number(talisman.bossFinalDmgMax) : 15);
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let current = Number(talisman.bossFinalDmgRoll);
    if (!Number.isFinite(current)) current = Number(talisman.bossFinalDmgValue);
    if (!Number.isFinite(current) && options && options.rollIfMissing === false) return min;
    if (!Number.isFinite(current)) current = min + Math.floor(Math.random() * (max - min + 1));
    current = Math.max(min, Math.min(max, Math.floor(current)));
    talisman.bossFinalDmgRoll = current;
    talisman.bossFinalDmgValue = current;
    talisman.value = current;
    return current;
}


function isTierlessSupportGem(name) {
    let db = (typeof SUPPORT_GEM_DB !== 'undefined' && SUPPORT_GEM_DB) ? SUPPORT_GEM_DB[name] : null;
    return !!(db && db.noTiers);
}
function getSupportTierCap(name) {
    return isTierlessSupportGem(name) ? 1 : 3;
}
function getSupportTierLabel(name, tier) {
    if (isTierlessSupportGem(name)) return '통합';
    return tier === 3 ? '상급' : (tier === 2 ? '중급' : '하급');
}
function getSupportTierMultiplier(name, tier) {
    let db = (typeof SUPPORT_GEM_DB !== 'undefined' && SUPPORT_GEM_DB) ? (SUPPORT_GEM_DB[name] || {}) : {};
    if (isTierlessSupportGem(name)) return Number.isFinite(Number(db.tierMul)) ? Number(db.tierMul) : 1;
    tier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
    return tier === 1 ? 1 : (tier === 2 ? 1.55 : 2.2);
}
function formatSupportGemEffectValue(value) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    return num.toFixed(1);
}

function formatValue(statId, value) {
    if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) return Number(value).toFixed(1);
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
        regenFlat: '초당 생명력 재생(고정)',
        flatDmg: '기본 피해',
        weaponFlatDmgPct: '무기의 기본 피해 증가(%)',
        pctDmg: '피해 증가(%)',
        meleePctDmg: '근접 피해(%)',
        slamPctDmg: '강타 피해(%)',
        projectilePctDmg: '투사체 피해(%)',
        projectileExtraShots: '투사체 추가 발사',
        spellFlatDmg: '주문 내장 피해',
        spellFlatPct: '주문 내장 피해 증가(%)',
        physPctDmg: '물리 피해(%)',
        elementalPctDmg: '원소 피해(%)',
        firePctDmg: '화염 피해(%)',
        coldPctDmg: '냉기 피해(%)',
        lightPctDmg: '번개 피해(%)',
        chaosPctDmg: '카오스 피해(%)',
        aoePctDmg: '범위 피해(%)',
        dotPctDmg: '지속 피해 배율(%)',
        igniteChance: '점화 확률(%)',
        chillChance: '냉각 확률(%)',
        freezeChance: '동결 확률(%)',
        shockChance: '감전 확률(%)',
        poisonChance: '중독 확률(%)',
        bleedChance: '출혈 확률(%)',
        aspd: '공격 속도(%)',
        move: '이동 속도(%)',
        crit: '치명타 확률(%)',
        critDmg: '치명타 피해(%)',
        leech: '생명력 흡수(%)',
        leechRateCap: '흡혈 회복 속도 캡(최대 생명력 %/초)',
        leechTotalCap: '흡혈 총 회복량 캡(최대 생명력 %)',
        leechInstanceCap: '흡혈 타격당 회복량 캡(최대 생명력 %)',
        gemLevel: '모든 스킬 젬 레벨',
        summonGemLevel: '소환수 공격 스킬 젬 레벨',
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
        maxResF: '최대 화염 저항(%)',
        maxResC: '최대 냉기 저항(%)',
        maxResL: '최대 번개 저항(%)',
        maxResChaos: '최대 카오스 저항(%)',
        maxResAll: '모든 원소 최대 저항(%)',
        resAll: '모든 원소 저항(%)',
        resChaos: '카오스 저항(%)',
        regenSuppress: '재생 억제(%)',
        targetAny: '스킬 타겟 수',
        targetProjectile: '투사체 스킬 타겟 수',
        targetSlam: '강타 스킬 타겟 수',
        armor: '방어도',
        evasion: '회피',
        energyShield: '에너지 보호막',
        armorPct: '방어도(%)',
        evasionPct: '회피(%)',
        deflectChance: '비껴내기 확률(%)',
        deflectDamageReduce: '비껴내기 피해 감소(%)',
        corpseExplodeChance: '시체폭발 확률(%)',
        corpseExplodeLifePct: '시체폭발 피해(처치한 적 최대 생명력 %)',
        resonancePower: '공명력',
        ailResIgnite: '점화 저항 확률(%)',
        ailResShock: '감전 저항 확률(%)',
        ailResFreeze: '냉기 저항 확률(%)',
        ailResPoison: '중독 저항 확률(%)',
        ailResBleed: '출혈 저항 확률(%)',
        energyShieldPct: '에너지 보호막(%)',
        energyShieldRegen: '에너지 보호막 재생률(%)',
        energyShieldRechargeFaster: '보호막 재생 준비시간 감소(초)',
        targetCount: '스킬 타겟 수',
        spellCritDmg: '주문 치명타 피해 배율(%)',
        spellLeech: '주문 흡혈(%)',
        shockEffectReducePct: '감전 효과 감소(%)',
        dotTakenDamageReducePct: '받는 지속 피해 감소(%)',
        genericTakenDamageReducePct: '받는 피해 감소(%)',
        shockedEnemyHitDamageMorePct: '감전된 적 타격 피해 증가(%)',
        takenDamageReduceWhen2EnemiesPct: '적 2명 이상일 때 받는 피해 감소(%)',
        takenDamageReduceWhen1EnemyPct: '적 1명일 때 받는 피해 감소(%)',
        shockEffect: '감전 효과(%)',
        physFlatTakenReduce: '받는 물리 피해 감소 flat',
        fireFlatTakenReduce: '받는 화염 피해 감소 flat',
        coldFlatTakenReduce: '받는 냉기 피해 감소 flat',
        lightFlatTakenReduce: '받는 번개 피해 감소 flat',
        chaosFlatTakenReduce: '받는 카오스 피해 감소 flat',
        allFlatTakenReduce: '받는 피해 감소 flat',
        physTakenAsFire: '받는 물리 피해의 일부를 화염 피해로 받음(%)',
        physTakenAsCold: '받는 물리 피해의 일부를 냉기 피해로 받음(%)',
        physTakenAsLight: '받는 물리 피해의 일부를 번개 피해로 받음(%)',
        physTakenAsChaos: '받는 물리 피해의 일부를 카오스 피해로 받음(%)',
        addedFireDamagePct: '총 피해의 일부만큼 화염 추가 피해(%)',
        addedColdDamagePct: '총 피해의 일부만큼 냉기 추가 피해(%)',
        addedLightDamagePct: '총 피해의 일부만큼 번개 추가 피해(%)',
        addedChaosDamagePct: '총 피해의 일부만큼 카오스 추가 피해(%)',
        addedPhysDamagePct: '총 피해의 일부만큼 물리 추가 피해(%)',
        fireFlatDmg: '화염 기본 피해',
        coldFlatDmg: '냉기 기본 피해',
        lightFlatDmg: '번개 기본 피해',
        chaosFlatDmg: '카오스 기본 피해',
        doubleDamageChance: '확률로 2배의 피해를 줌(%)',
        slamEchoDamagePct: '여진 피해량(%)'
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
        flatDmg: 0, weaponFlatDmgPct: 0, pctDmg: 0, flatHp: 0, pctHp: 0, aspd: 0, crit: 0, move: 0, gemLevel: 0, elementalGemLevel: 0, fireGemLevel: 0, coldGemLevel: 0, lightGemLevel: 0, chaosGemLevel: 0, physGemLevel: 0, projectileGemLevel: 0, meleeGemLevel: 0, slamGemLevel: 0, spellGemLevel: 0, dotGemLevel: 0, aoeGemLevel: 0, suppCap: 0, regenFlat: 0,
        dr: 0, physIgnore: 0, resPen: 0, resF: 0, resC: 0, resL: 0, maxResF: 0, maxResC: 0, maxResL: 0, maxResChaos: 0, resChaos: 0, leech: 0, leechRateCap: 0, leechTotalCap: 0, leechInstanceCap: 0, critDmg: 0, regen: 0, regenSuppress: 0, ds: 0, expGain: 0,
        minDmgRoll: 0, maxDmgRoll: 0, slamEchoChance: 0, slamEchoDamagePct: 0, doubleDamageChance: 0, blockChanceMax: 0,
        physFlatTakenReduce: 0, fireFlatTakenReduce: 0, coldFlatTakenReduce: 0, lightFlatTakenReduce: 0, chaosFlatTakenReduce: 0, allFlatTakenReduce: 0,
        physTakenAsFire: 0, physTakenAsCold: 0, physTakenAsLight: 0, physTakenAsChaos: 0,
        addedFireDamagePct: 0, addedColdDamagePct: 0, addedLightDamagePct: 0, addedChaosDamagePct: 0, addedPhysDamagePct: 0,
        fireFlatDmg: 0, coldFlatDmg: 0, lightFlatDmg: 0, chaosFlatDmg: 0,
        meleePctDmg: 0, slamPctDmg: 0, projectilePctDmg: 0, physPctDmg: 0, elementalPctDmg: 0, firePctDmg: 0, coldPctDmg: 0, lightPctDmg: 0, chaosPctDmg: 0, aoePctDmg: 0, dotPctDmg: 0, igniteChance: 0, chillChance: 0, freezeChance: 0, poisonChance: 0, bleedChance: 0, spellFlatDmg: 0, spellFlatPct: 0,
        targetAny: 0, targetProjectile: 0, targetSlam: 0, projectileExtraShots: 0,
        armor: 0, evasion: 0, energyShield: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, energyShieldRegen: 0, energyShieldRechargeFaster: 0, deflectChance: 0, deflectDamageReduce: 0, blockChance: 0, blockChancePct: 0,
        ailResIgnite: 0, ailResShock: 0, ailResFreeze: 0, ailResPoison: 0, ailResBleed: 0,
        chillEffectReducePct: 0, freezeDurationReducePct: 0, shockEffectReducePct: 0, igniteDamageReducePct: 0, bleedDamageReducePct: 0, poisonDamageReducePct: 0, dotTakenDamageReducePct: 0,
        takenDamageReduceWhen2EnemiesPct: 0, takenDamageReduceWhen1EnemyPct: 0, genericTakenDamageReducePct: 0, shockedEnemyHitDamageMorePct: 0, igniteDamageMultiplierPct: 0, poisonDamageMultiplierPct: 0, accuracyBonusPct: 0, shockEffect: 0,
        summonFlatDmg: 0, summonPctDmg: 0, summonAspd: 0, summonHpPct: 0, summonCrit: 0, summonCritDmg: 0, summonCap: 0, summonEfficiency: 0, summonGuardRedirectPct: 0, summonResPen: 0, summonGemLevel: 0
    };
}
function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (!statId || !Number.isFinite(value)) return;
    if (statId === 'flatDmg') bucket.flatDmg += value;
    else if (statId === 'weaponFlatDmgPct') bucket.weaponFlatDmgPct += value;
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
    else if (statId === 'igniteChance') bucket.igniteChance += value;
    else if (statId === 'chillChance') bucket.chillChance += value;
    else if (statId === 'freezeChance') bucket.freezeChance += value;
    else if (statId === 'shockChance') bucket.shockChance += value;
    else if (statId === 'poisonChance') bucket.poisonChance += value;
    else if (statId === 'bleedChance') bucket.bleedChance += value;
    else if (statId === 'spellFlatDmg') bucket.spellFlatDmg += value;
    else if (statId === 'spellFlatPct') bucket.spellFlatPct += value;
    else if (statId === 'flatHp') bucket.flatHp += value;
    else if (statId === 'pctHp') bucket.pctHp += value;
    else if (statId === 'aspd') bucket.aspd += value;
    else if (statId === 'crit') bucket.crit += value;
    else if (statId === 'move') bucket.move += value;
    else if (statId === 'gemLevel') bucket.gemLevel += value;
    else if (statId === 'elementalGemLevel') bucket.elementalGemLevel += value;
    else if (statId === 'fireGemLevel') bucket.fireGemLevel += value;
    else if (statId === 'coldGemLevel') bucket.coldGemLevel += value;
    else if (statId === 'lightGemLevel') bucket.lightGemLevel += value;
    else if (statId === 'chaosGemLevel') bucket.chaosGemLevel += value;
    else if (statId === 'physGemLevel') bucket.physGemLevel += value;
    else if (statId === 'projectileGemLevel') bucket.projectileGemLevel += value;
    else if (statId === 'meleeGemLevel') bucket.meleeGemLevel += value;
    else if (statId === 'slamGemLevel') bucket.slamGemLevel += value;
    else if (statId === 'spellGemLevel') bucket.spellGemLevel += value;
    else if (statId === 'dotGemLevel') bucket.dotGemLevel += value;
    else if (statId === 'aoeGemLevel') bucket.aoeGemLevel += value;
    else if (statId === 'dr') bucket.dr += value;
    else if (statId === 'physIgnore') bucket.physIgnore += value;
    else if (statId === 'resPen') bucket.resPen += value;
    else if (statId === 'leech') bucket.leech += value;
    else if (statId === 'leechRateCap') bucket.leechRateCap += value;
    else if (statId === 'leechTotalCap') bucket.leechTotalCap += value;
    else if (statId === 'leechInstanceCap') bucket.leechInstanceCap += value;
    else if (statId === 'critDmg') bucket.critDmg += value;
    else if (statId === 'regen') bucket.regen += value;
    else if (statId === 'regenSuppress') bucket.regenSuppress += value;
    else if (statId === 'regenFlat') bucket.regenFlat += value;
    else if (statId === 'suppCap') bucket.suppCap += value;
    else if (statId === 'minDmgRoll') bucket.minDmgRoll += value;
    else if (statId === 'maxDmgRoll') bucket.maxDmgRoll += value;
    else if (statId === 'resF') bucket.resF += value;
    else if (statId === 'maxResF') bucket.maxResF += value;
    else if (statId === 'maxResC') bucket.maxResC += value;
    else if (statId === 'maxResL') bucket.maxResL += value;
    else if (statId === 'maxResChaos') bucket.maxResChaos += value;
    else if (statId === 'maxResAll') { bucket.maxResF += value; bucket.maxResC += value; bucket.maxResL += value; }
    else if (statId === 'resC') bucket.resC += value;
    else if (statId === 'resL') bucket.resL += value;
    else if (statId === 'resAll') { bucket.resF += value; bucket.resC += value; bucket.resL += value; }
    else if (statId === 'resChaos') bucket.resChaos += value;
    else if (statId === 'ds') bucket.ds += value;
    else if (statId === 'slamEchoChance') bucket.slamEchoChance += value;

    else if (statId === 'chillEffectReducePct') bucket.chillEffectReducePct += value;
    else if (statId === 'freezeDurationReducePct') bucket.freezeDurationReducePct += value;
    else if (statId === 'shockEffectReducePct') bucket.shockEffectReducePct += value;
    else if (statId === 'igniteDamageReducePct') bucket.igniteDamageReducePct += value;
    else if (statId === 'bleedDamageReducePct') bucket.bleedDamageReducePct += value;
    else if (statId === 'poisonDamageReducePct') bucket.poisonDamageReducePct += value;
    else if (statId === 'dotTakenDamageReducePct') bucket.dotTakenDamageReducePct += value;
    else if (statId === 'takenDamageReduceWhen2EnemiesPct') bucket.takenDamageReduceWhen2EnemiesPct += value;
    else if (statId === 'takenDamageReduceWhen1EnemyPct') bucket.takenDamageReduceWhen1EnemyPct += value;
    else if (statId === 'genericTakenDamageReducePct') bucket.genericTakenDamageReducePct += value;
    else if (statId === 'shockedEnemyHitDamageMorePct') bucket.shockedEnemyHitDamageMorePct += value;
    else if (statId === 'igniteDamageMultiplierPct') bucket.igniteDamageMultiplierPct += value;
    else if (statId === 'poisonDamageMultiplierPct') bucket.poisonDamageMultiplierPct += value;
    else if (statId === 'accuracyBonusPct') bucket.accuracyBonusPct += value;
    else if (statId === 'summonFlatDmg') bucket.summonFlatDmg += value;
    else if (statId === 'summonPctDmg') bucket.summonPctDmg += value;
    else if (statId === 'summonAspd') bucket.summonAspd += value;
    else if (statId === 'summonHpPct') bucket.summonHpPct += value;
    else if (statId === 'summonCrit') bucket.summonCrit += value;
    else if (statId === 'summonCritDmg') bucket.summonCritDmg += value;
    else if (statId === 'summonCap') bucket.summonCap += value;
    else if (statId === 'summonEfficiency') bucket.summonEfficiency += value;
    else if (statId === 'summonGuardRedirectPct') bucket.summonGuardRedirectPct += value;
    else if (statId === 'summonResPen') bucket.summonResPen += value;
    else if (statId === 'summonGemLevel') bucket.summonGemLevel += value;

    else if (statId === 'moveEvasion') { bucket.move += value; bucket.evasionPct += value; }
    else if (statId === 'hpArmor') { bucket.flatHp += value; bucket.armor += value * 2; }
    else if (statId === 'aspdMove') { bucket.aspd += value; bucket.move += value; }
    else if (statId === 'chaosResElemPenalty') { bucket.resChaos += value; bucket.resF -= value; bucket.resC -= value; bucket.resL -= value; }
    else if (statId === 'expGain') bucket.expGain += value;
    else if (statId === 'targetAny') bucket.targetAny += value;
    else if (statId === 'targetProjectile') bucket.targetProjectile += value;
    else if (statId === 'projectileExtraShots') bucket.projectileExtraShots += value;
    else if (statId === 'targetSlam') bucket.targetSlam += value;
    else if (statId === 'armor') bucket.armor += value;
    else if (statId === 'evasion') bucket.evasion += value;
    else if (statId === 'energyShield') bucket.energyShield += value;
    else if (statId === 'armorPct') bucket.armorPct += value;
    else if (statId === 'evasionPct') bucket.evasionPct += value;
    else if (statId === 'deflectChance') bucket.deflectChance += value;
    else if (statId === 'deflectMajor') { bucket.deflectChance += value; bucket.deflectDamageReduce += 3; }
    else if (statId === 'deflectDamageReduce') bucket.deflectDamageReduce += value;
    else if (statId === 'blockChance') bucket.blockChance += value;
    else if (statId === 'blockChancePct') bucket.blockChancePct += value;
    else if (statId === 'ailResBleed') bucket.ailResBleed += value;
    else if (statId === 'ailResPoison') bucket.ailResPoison += value;
    else if (statId === 'ailResFreeze') bucket.ailResFreeze += value;
    else if (statId === 'ailResShock') bucket.ailResShock += value;
    else if (statId === 'ailResIgnite') bucket.ailResIgnite += value;
    else if (statId === 'energyShieldPct') bucket.energyShieldPct += value;
    else if (statId === 'energyShieldRegen') bucket.energyShieldRegen += value;
    else if (statId === 'energyShieldRechargeFaster') bucket.energyShieldRechargeFaster += value;
    else if (statId === 'targetCount') bucket.targetAny += value;
    else if (statId === 'spellCritDmg') bucket.critDmg += value;
    else if (statId === 'spellLeech') bucket.leech += value;
    else if (statId === 'shockEffect') bucket.shockEffect += value;
    else if (statId === 'blockChanceMax') bucket.blockChanceMax += value;
    else if (statId === 'slamEchoDamagePct') bucket.slamEchoDamagePct += value;
    else if (statId === 'doubleDamageChance') bucket.doubleDamageChance += value;
    else if (statId === 'physFlatTakenReduce') bucket.physFlatTakenReduce += value;
    else if (statId === 'fireFlatTakenReduce') bucket.fireFlatTakenReduce += value;
    else if (statId === 'coldFlatTakenReduce') bucket.coldFlatTakenReduce += value;
    else if (statId === 'lightFlatTakenReduce') bucket.lightFlatTakenReduce += value;
    else if (statId === 'chaosFlatTakenReduce') bucket.chaosFlatTakenReduce += value;
    else if (statId === 'allFlatTakenReduce') bucket.allFlatTakenReduce += value;
    else if (statId === 'physTakenAsFire') bucket.physTakenAsFire += value;
    else if (statId === 'physTakenAsCold') bucket.physTakenAsCold += value;
    else if (statId === 'physTakenAsLight') bucket.physTakenAsLight += value;
    else if (statId === 'physTakenAsChaos') bucket.physTakenAsChaos += value;
    else if (statId === 'addedFireDamagePct') bucket.addedFireDamagePct += value;
    else if (statId === 'addedColdDamagePct') bucket.addedColdDamagePct += value;
    else if (statId === 'addedLightDamagePct') bucket.addedLightDamagePct += value;
    else if (statId === 'addedChaosDamagePct') bucket.addedChaosDamagePct += value;
    else if (statId === 'addedPhysDamagePct') bucket.addedPhysDamagePct += value;
    else if (statId === 'fireFlatDmg') bucket.fireFlatDmg += value;
    else if (statId === 'coldFlatDmg') bucket.coldFlatDmg += value;
    else if (statId === 'lightFlatDmg') bucket.lightFlatDmg += value;
    else if (statId === 'chaosFlatDmg') bucket.chaosFlatDmg += value;

    else if (statId === 'summonFlatDmg') bucket.summonFlatDmg += value;
    else if (statId === 'summonPctDmg') bucket.summonPctDmg += value;
    else if (statId === 'summonAspd') bucket.summonAspd += value;
    else if (statId === 'summonHpPct') bucket.summonHpPct += value;
    else if (statId === 'summonCrit') bucket.summonCrit += value;
    else if (statId === 'summonCritDmg') bucket.summonCritDmg += value;
    else if (statId === 'summonCap') bucket.summonCap += value;
    else if (statId === 'summonEfficiency') bucket.summonEfficiency += value;
    else if (statId === 'summonGuardRedirectPct') bucket.summonGuardRedirectPct += value;
    else if (statId === 'summonResPen') bucket.summonResPen += value;
    else if (statId === 'summonGemLevel') bucket.summonGemLevel += value;
}

function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach(stat => addStatToBucket(bucket, stat.id, stat.val));
}
function getTaggedDamageBreakdown(bucket, skill) {
    let tags = new Set(skill.tags || []);
    let randomElementPool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool.map(ele => { let key = String(ele || '').toLowerCase(); return key === 'lightning' || key === 'thunder' ? 'light' : key; }).filter(Boolean) : [];
    let isRandomElementSkill = randomElementPool.length > 0;
    let parts = [];
    let total = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        if (isRandomElementSkill && ['fire', 'cold', 'lightning'].includes(tag)) return;
        let statId = TAGGED_DAMAGE_STAT_BY_TAG[tag];
        let value = bucket[statId] || 0;
        if (!value || !tags.has(tag)) return;
        total += value;
        parts.push({ tag: tag, statId: statId, value: value });
    });
    return { total: total, parts: parts };
}

function getOwnedSkillGemNames(state) {
    let source = state || (typeof game !== 'undefined' ? game : {});
    return Array.from(new Set([].concat(
        Array.isArray(source.skills) ? source.skills : [],
        Array.isArray(source.sealedSkills) ? source.sealedSkills : []
    ).filter(name => !!name)));
}
function getOwnedSupportGemNames(state) {
    let source = state || (typeof game !== 'undefined' ? game : {});
    return Array.from(new Set([].concat(
        Array.isArray(source.supports) ? source.supports : [],
        Array.isArray(source.sealedSupports) ? source.sealedSupports : []
    ).filter(name => !!name)));
}
function hasSkillGemOwned(name, state) {
    return !!name && getOwnedSkillGemNames(state).includes(name);
}
function hasSupportGemOwned(name, state) {
    return !!name && getOwnedSupportGemNames(state).includes(name);
}
function dedupeList(values) {
    return Array.from(new Set(Array.isArray(values) ? values.filter(Boolean) : []));
}

function makeSourceLine(label, value, suffix, formatter) {
    if (!value) return null;
    let rendered = formatter ? formatter(value) : `${Math.floor(value)}${suffix || ''}`;
    return `${label} +${rendered}`;
}

function dispatchRuntimeEvent(name, detail = {}) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof window.CustomEvent !== 'function') return false;
    window.dispatchEvent(new window.CustomEvent(`project-idle:${name}`, { detail }));
    return detail.handled === true;
}








var PASSIVE_WORLD_SCALE = 1.14;
const MAX_PLAYER_LEVEL = 200;
var PASSIVE_BOUNDS = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
let game;
let reachableNodes = new Set();
let discoveredPassiveNodes = new Set();
let previewPassiveNodes = new Set();

safeExposeGlobals({ clampNumber, getInventoryLimit, getJewelInventoryLimit, getJewelMarketExpandCost, lerpNumber, approachNumber, rndChoice, hashSeed, createSeededRng, formatValue, formatPercentMultiplier, translateSkillTag, getSkillTagList, getStatName, getRarityColor, getRarityRank, createEmptyStatBucket, addStatToBucket, applyStatsToBucket, getTaggedDamageBreakdown, getOwnedSkillGemNames, getOwnedSupportGemNames, hasSkillGemOwned, hasSupportGemOwned, dedupeList, makeSourceLine, dispatchRuntimeEvent });

window.__runtimeFallbackQueues = window.__runtimeFallbackQueues || {};

function flushRuntimeFallbackQueue(key) {
    let queue = (window.__runtimeFallbackQueues && window.__runtimeFallbackQueues[key]) || [];
    if (!queue.length || typeof window[key] !== "function" || window[key].__placeholderGlobal === true) return;
    window.__runtimeFallbackQueues[key] = [];
    queue.splice(0, 20).forEach(function (args) {
        try { window[key].apply(null, args || []); } catch (e) { console.error(key + " queued call failed:", e); }
    });
}

function safeExposeGlobals(map) {
    Object.keys(map || {}).forEach(function (key) {
        let current = window[key];
        let incoming = map[key];
        let canReplace = typeof current === "undefined" || (current && current.__placeholderGlobal === true);
        if (!canReplace && current !== incoming) {
            throw new Error("Duplicate global exposure: " + key);
        }
        window[key] = incoming;
        if (!(incoming && incoming.__placeholderGlobal === true)) flushRuntimeFallbackQueue(key);
    });
}
window.safeExposeGlobals = window.safeExposeGlobals || safeExposeGlobals;

if (typeof window.getPlayerStats === "undefined") {
    window.getPlayerStats = function getPlayerStatsFallback() {
        return {
            maxHp: 1, energyShield: 0, baseDmg: 0, directDps: 0, dps: 0, totalDps: 0, summonDps: 0,
            aspd: 1, crit: 0, critDmg: 150, move: 100, moveSpeed: 100, dr: 0, armor: 0, evasion: 0,
            resF: 0, resC: 0, resL: 0, resChaos: 0, regen: 0, regenSuppress: 0, leech: 0, ds: 0,
            igniteChance: 0, chillChance: 0, freezeChance: 0, shockChance: 0, poisonChance: 0, bleedChance: 0,
            blockChance: 0, blockChanceMax: 50, deflectChance: 0, deflectDamageReduce: 0,
            suppCap: 0, summonCap: 1, runeResonancePower: 0, uniqueResonanceFloor: 0, inquisitorResonanceBonus: 0, breakdowns: {}, __uiFallbackStats: true
        };
    };
    window.getPlayerStats.__placeholderGlobal = true;
}

if (typeof window.getSkillTargets === "undefined") {
    window.getSkillTargets = function getSkillTargetsFallback() {
        return [];
    };
    window.getSkillTargets.__placeholderGlobal = true;
}
if (typeof window.ENEMY_CROWD_PAUSE_LIMIT === "undefined") {
    window.ENEMY_CROWD_PAUSE_LIMIT = 20;
}

if (typeof window.isCrowdProgressPaused === "undefined") {
    window.isCrowdProgressPaused = function isCrowdProgressPausedFallback() {
        return false;
    };
    window.isCrowdProgressPaused.__placeholderGlobal = true;
}
if (typeof window.isDamageAilmentType === "undefined") {
    window.isDamageAilmentType = function isDamageAilmentTypeFallback(type) {
        return type === "ignite" || type === "poison" || type === "bleed";
    };
    window.isDamageAilmentType.__placeholderGlobal = true;
}

if (typeof window.getStoredAilmentHitDamage === "undefined") {
    window.getStoredAilmentHitDamage = function getStoredAilmentHitDamageFallback(ail) {
        if (!ail) return 0;
        return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
    };
    window.getStoredAilmentHitDamage.__placeholderGlobal = true;
}

if (typeof window.getDamageAilmentBaseDpsFromHit === "undefined") {
    window.getDamageAilmentBaseDpsFromHit = function getDamageAilmentBaseDpsFromHitFallback(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
        let source = Math.max(0, Number(hitDamage) || 0);
        if (source <= 0) return 0;
        let baseScale = Math.max(0.01, Number(scale) || 1);
        let bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
        let bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
        return Math.max(1, Math.floor(source * 0.90 * (baseScale + (bonusPct / 100) * bonusScale)));
    };
    window.getDamageAilmentBaseDpsFromHit.__placeholderGlobal = true;
}

if (typeof window.getEnemyDamageAilmentDps === "undefined") {
    window.getEnemyDamageAilmentDps = function getEnemyDamageAilmentDpsFallback(ail, pStats) {
        let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
        let dps = window.getDamageAilmentBaseDpsFromHit(window.getStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
        if (ail && ail.type === "ignite") dps = Math.floor(dps * (1 + Math.max(0, Number(pStats && pStats.igniteDamageMultiplierPct) || 0) / 100));
        if (ail && ail.type === "poison") dps = Math.floor(dps * (1 + Math.max(0, Number(pStats && pStats.poisonDamageMultiplierPct) || 0) / 100));
        return dps;
    };
    window.getEnemyDamageAilmentDps.__placeholderGlobal = true;
}

if (typeof window.getPlayerDamageAilmentDps === "undefined") {
    window.getPlayerDamageAilmentDps = function getPlayerDamageAilmentDpsFallback(ail, pStats) {
        let source = window.getStoredAilmentHitDamage(ail);
        if (source <= 0 && pStats && pStats.maxHp) source = Math.max(1, Math.floor((pStats.maxHp || 1) * 0.08));
        return window.getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
    };
    window.getPlayerDamageAilmentDps.__placeholderGlobal = true;
}
function queueRuntimeFallbackCall(name, args) {
    window.__runtimeFallbackQueues = window.__runtimeFallbackQueues || {};
    let queue = window.__runtimeFallbackQueues[name] = window.__runtimeFallbackQueues[name] || [];
    if (queue.length < 20) queue.push(Array.prototype.slice.call(args || []));
}

function installRuntimeFunctionFallback(name, fallback, options = {}) {
    if (typeof window[name] === "undefined") {
        window[name] = function runtimeFunctionFallbackWrapper() {
            if (options.queue) queueRuntimeFallbackCall(name, arguments);
            return fallback.apply(this, arguments);
        };
        window[name].__placeholderGlobal = true;
    }
}

installRuntimeFunctionFallback("startEncounterRun", function startEncounterRunFallback() {
    let state = (typeof window !== "undefined" && window.game) ? window.game : (typeof game === "object" ? game : null);
    if (state) {
        state.encounterPlan = Array.isArray(state.encounterPlan) ? state.encounterPlan : [];
        state.encounterIndex = Math.max(0, Math.floor(state.encounterIndex || 0));
    }
}, { queue: true });
installRuntimeFunctionFallback("coreLoop", function coreLoopFallback() {});
installRuntimeFunctionFallback("updateStaticUI", function updateStaticUIFallback() {}, { queue: true });
installRuntimeFunctionFallback("startMoving", function startMovingFallback(force) {
    let state = (typeof window !== "undefined" && window.game) ? window.game : (typeof game === "object" ? game : null);
    if (state) {
        state.combatHalted = false;
        state.isTownReturning = false;
        state.moveTimer = Math.max(0, Number(state.moveTimer) || 0);
        state.moveTotalTime = Math.max(0, Number(state.moveTotalTime) || 0);
    }
}, { queue: true });
installRuntimeFunctionFallback("returnToTown", function returnToTownFallback() {
    let state = (typeof window !== "undefined" && window.game) ? window.game : (typeof game === "object" ? game : null);
    if (state) {
        state.isTownReturning = false;
        state.combatHalted = true;
        state.enemies = [];
    }
}, { queue: true });
installRuntimeFunctionFallback("triggerSeasonReset", function triggerSeasonResetFallback() {}, { queue: true });
installRuntimeFunctionFallback("chooseLoopAdvance", function chooseLoopAdvanceFallback() {
    // The real handler consumes pendingLoopDecision. Keep the flag intact while this queued fallback waits.
}, { queue: true });
installRuntimeFunctionFallback("confirmLoopReady", function confirmLoopReadyFallback() {
    // The real handler consumes pendingLoopReady. Keep the flag intact while this queued fallback waits.
}, { queue: true });
installRuntimeFunctionFallback("enterOutsideChaos", function enterOutsideChaosFallback() {}, { queue: true });
installRuntimeFunctionFallback("getConditionGemStatDelta", function getConditionGemStatDeltaFallback() {
    return {};
});

installRuntimeFunctionFallback("getGemPresentation", function getGemPresentationFallback(name, isSupport) {
    let db = isSupport
        ? ((typeof SUPPORT_GEM_DB !== "undefined" && SUPPORT_GEM_DB && SUPPORT_GEM_DB[name]) || {})
        : ((typeof SKILL_DB !== "undefined" && SKILL_DB && SKILL_DB[name]) || {});
    let level = 1;
    try {
        let store = isSupport ? ((window.game && window.game.supportGemData) || {}) : ((window.game && window.game.gemData) || {});
        level = Math.max(1, Math.floor((store[name] && store[name].level) || 1));
    } catch (error) {
        console.error('gem presentation fallback state read failed:', error);
    }
    if (isSupport) {
        return {
            baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || "",
            statName: db.name || name, statId: db.stat || null, activeTier: 1
        };
    }
    return {
        baseLevel: db.isGem || db.levelable ? level : 0, totalLevel: db.isGem || db.levelable ? level : 0, finalLevel: db.isGem || db.levelable ? level : 0,
        desc: db.desc || "", statName: name, skill: db, tags: (typeof getSkillTagList === "function" ? getSkillTagList(db) : (Array.isArray(db.tags) ? db.tags : []))
    };
});
