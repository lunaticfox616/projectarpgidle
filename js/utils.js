/** UI 스킨은 도트 HUD 배치(균열 등불) 하나다. 예전 스킨(검은 성유물함 · 녹청 성당 · 핏빛 참회)은 옛 세로 칸 배치라 새 HUD를
 * 담지 못해(PC에서 생명 구슬이 화면 밖으로 밀렸다) 저장에 남아 있어도 균열 등불로 읽는다. */
function normalizeUiSkin() {
    return 'rift';
}

/** 아이콘 그림: 'pixel'(원화를 도트로 다시 찍은 사본, 기본) 또는 'painted'(원화). */
function normalizeIconArtStyle(value) {
    return value === 'painted' ? 'painted' : 'pixel';
}

const PIXEL_ICON_SOURCE_SET = new Set(typeof PIXEL_ICON_SOURCES !== 'undefined' ? PIXEL_ICON_SOURCES : []);
/** 원화 아이콘 경로 → 도트 사본(assets/px/…png, scripts/build-pixel-icons.cjs). 원화를 골랐거나 사본이 없으면 그대로. */
function pixelIconPath(path) {
    const file = String(path || '').split('?')[0];
    if (!PIXEL_ICON_SOURCE_SET.has(file) || normalizeIconArtStyle(game.settings && game.settings.iconArtStyle) === 'painted') return path;
    return 'assets/px/' + file.slice('assets/'.length).replace(/\.(png|webp)$/i, '.png');
}

/** Stored user scale in percent, independent of the current monitor's pixel ratio. */
function normalizeUiScale(value) {
    const number = Number(value);
    return [80, 90, 100, 110, 125, 150, 175, 200, 225, 250].includes(number) ? number : 100;
}

/** 글꼴: 'auto'(기본 — 소수 배율 PC 화면만 일반 글꼴), 'pixel'(도트 글꼴), 'smooth'(일반 글꼴). js/ui-display.js가 적용한다. */
function normalizeUiFont(value) {
    return value === 'pixel' || value === 'smooth' ? value : 'auto';
}


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
function getEquipmentInventoryPageCount(targetGame) {
    let state = targetGame || game;
    let loop = Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(state.loopCount) || 0) + 1);
    let earnedPages = loop < 30 ? Math.floor(loop / 5) : 6 + Math.floor((loop - 30) / 10);
    return Math.max(1, Math.min(EQUIPMENT_INVENTORY_MAX_PAGES, 1 + earnedPages));
}
function getInventoryLimit(targetGame) {
    return getEquipmentInventoryPageCount(targetGame) * EQUIPMENT_INVENTORY_CELLS_PER_PAGE;
}
function getInventoryUsedCellCount(targetGame) {
    let state = targetGame || game;
    return (Array.isArray(state.inventory) ? state.inventory : []).reduce(function (sum, item) {
        let footprint = typeof getEquipmentInventoryFootprint === 'function' ? getEquipmentInventoryFootprint(item) : { columns: 1, rows: 1 };
        return sum + Math.max(1, Math.floor(Number(footprint.columns) || 1)) * Math.max(1, Math.floor(Number(footprint.rows) || 1));
    }, 0);
}
function canStoreEquipmentItems(items, targetGame) {
    let incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
    let state = targetGame || game;
    if (typeof equipmentInventoryGridRuntime !== 'undefined') return equipmentInventoryGridRuntime.canStoreItems(incoming, state);
    let incomingCells = incoming.reduce(function (sum, item) {
        let footprint = typeof getEquipmentInventoryFootprint === 'function' ? getEquipmentInventoryFootprint(item) : { columns: 1, rows: 1 };
        return sum + Math.max(1, Math.floor(Number(footprint.columns) || 1)) * Math.max(1, Math.floor(Number(footprint.rows) || 1));
    }, 0);
    return getInventoryUsedCellCount(state) + incomingCells <= getInventoryLimit(state);
}

function getExceptionalBaseStarCount(item) {
    return ((item && item.baseStats) || []).filter(stat => stat && stat.exceptional).length;
}
function getExceptionalBaseStars(item) {
    return '✦'.repeat(getExceptionalBaseStarCount(item));
}
function getExceptionalBaseStarsHtml(item) {
    let stars = getExceptionalBaseStars(item);
    return stars ? ` <span style="color:#ffb454; font-weight:700;">${stars}</span>` : '';
}
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
    light: '번개',
    chaos: '카오스',
    aoe: '범위',
    dot: '지속',
    spell: '주문',
    slam: '강타',
    chain: '연쇄',
    summon: '소환수',
    summon_attack: '공격형 소환수',
    summon_guard: '방어형 소환수',
    shield: '방패',
    mine: '지뢰',
    potion: '포션',
    mobility: '기동',
    channeling: '채널링',
    curse: '저주',
    warcry: '함성',
    guard: '수호',
    utility: '기능'
};
const TAGGED_DAMAGE_STAT_BY_TAG = {
    attack: 'attackPctDmg',
    melee: 'meleePctDmg',
    projectile: 'projectilePctDmg',
    physical: 'physPctDmg',
    elemental: 'elementalPctDmg',
    fire: 'firePctDmg',
    cold: 'coldPctDmg',
    lightning: 'lightPctDmg',
    chaos: 'chaosPctDmg',
    aoe: 'aoePctDmg',
    slam: 'slamPctDmg',
    spell: 'spellPctDmg',
    shield: 'shieldPctDmg',
    mine: 'minePctDmg',
    potion: 'potionPctDmg',
    mobility: 'mobilityPctDmg',
    channeling: 'channelingPctDmg'
};
const COMPARE_STAT_META = {
    dps: { label: 'DPS', format: value => `${Math.floor(value)}` },
    summonDps: { label: '소환 DPS', format: value => `${Math.floor(value)}` },
    baseDmg: { label: '공격력', format: value => `${Math.floor(value)}` },
    aspd: { label: '공속', format: value => value.toFixed(2) },
    crit: { label: '치명타', format: value => `${value.toFixed(1)}%` },
    critDmg: { label: '치명타 피해', format: value => `${Math.floor(value)}%` },
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
    leech: { label: '공격 피해 흡수', format: value => `${formatValue('leech', value)}%` },
    spellLeech: { label: '주문 피해 흡수', format: value => `${formatValue('spellLeech', value)}%` },
    leechRateCap: { label: '흡혈 회복 속도', format: value => `+${formatValue('leechRateCap', value)}%p` },
    leechTotalCap: { label: '흡혈 총 회복량', format: value => `+${formatValue('leechTotalCap', value)}%p` },
    leechInstanceCap: { label: '흡혈 타격당 회복량', format: value => `+${formatValue('leechInstanceCap', value)}%p` },
    ds: { label: '연속 타격', format: value => `${Math.floor(value)}%` },
    gemLv: { label: '젬 레벨', format: value => `${Math.floor(value)}` },
    suppCap: { label: '보조 한도', format: value => `${Math.floor(value)}` },
    minDmgRoll: { label: '최소피해 보정', format: value => `${Math.floor(value)}%` },
    maxDmgRoll: { label: '최대피해 보정', format: value => `${Math.floor(value)}%` }
};

function isTierlessSupportGem(name) {
    let db = (typeof SUPPORT_GEM_DB !== 'undefined' && SUPPORT_GEM_DB) ? SUPPORT_GEM_DB[name] : null;
    return !!(db && db.noTiers);
}
function getSupportTierCap(name) {
    return isTierlessSupportGem(name) ? 1 : 3;
}
function getSupportResonanceCost(name) {
    let db = SUPPORT_GEM_DB[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || '';
    if (['flatDmg', 'critDmg', 'resPen', 'physIgnore', 'ds'].includes(stat)) return 3;
    if (['aspd', 'crit', 'dotPctDmg', 'elementalPctDmg', 'meleePctDmg', 'projectilePctDmg'].includes(stat)) return 2;
    return 1;
}
function getSupportResonanceCostAtTier(name,tier) {
    const base=getSupportResonanceCost(name),db=SUPPORT_GEM_DB[name]||{};
    if(Array.isArray(db.resonanceCosts)&&Number.isFinite(db.resonanceCosts[tier-1]))return Math.max(1,Math.floor(db.resonanceCosts[tier-1]));
    if(tier<=1)return base;
    if(tier===2)return Math.max(base+2,Math.floor(base*2.4));
    return Math.max(base+5,Math.floor(base*3.8));
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
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) {
        return numeric.toFixed(2).replace(/0$/, '');
    }
    const rounded = Math.round(numeric * 100) / 100;
    return Number.isInteger(rounded) ? rounded : String(rounded);
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
const STAT_DISPLAY_NAMES = {
        bossDamagePct: '보스 처치 피해(%)',
        eliteDamagePct: '정예 처치 피해(%)',
        firstStrikeDamagePct: '선제 타격 피해(%)',
        // 세계수 기운(12번 루프 27): 지역 전용 줄(data/region-affixes.js).
        regionPoisonSpread: '중독된 적 처치 시 주변에 중독 번짐(%)',
        regionChaosShred: '적중 시 적 카오스 저항 감소(%, 5중첩)',
        regionPoisonedLeech: '중독된 적에게 준 피해 생명력 흡수(%)',
        regionChaosOvercap: '초과 카오스 저항 1%마다 카오스 피해(%)',
        regionBlockEmpower: '막기 후 다음 공격 피해 증가(%)',
        regionArmorToPhys: '방어도 1000마다 물리 피해(%)',
        regionBleedingDamage: '출혈 중인 적에게 주는 피해 증가(%)',
        regionLowLifeDR: '생명력 절반 이하일 때 받는 피해 감소(%)',
        regionShockChain: '감전된 적 적중 시 번개 튐 확률(%)',
        regionCritMove: '치명타 후 2초간 이동 속도(%)',
        regionShockSpread: '감전된 적 처치 시 주변에 감전 번짐(%)',
        regionShockedLightPen: '감전된 적의 번개 저항 무시(%)',
        regionIgniteSpread: '점화된 적 처치 시 주변에 점화 번짐(%)',
        regionFullLifeFire: '생명력이 가득할 때 화염 피해(%)',
        regionIgniteDuration: '점화 지속 시간(%)',
        regionIgnitedDamage: '점화된 적에게 주는 피해 증가(%)',
        regionFrozenCritDamage: '동결된 적에게 치명타 피해 증가(%)',
        regionShatter: '동결된 적 처치 시 얼음 파편(적 최대 생명력 %)',
        regionChillOnHit: '적중 시 냉각 확률(%)',
        regionChilledAttackerDR: '냉각된 적에게 받는 피해 감소(%)',
        cullStrikePct: '처형 일격(생명력 % 이하 즉사)',
        oceanPressureResist: '심해 수압 내성(%)',
        oceanDepthGainPct: '심해 수심 전진 속도(%)',
        oceanOxygenAttackSavingPct: '심해 공격당 산소 소모 감소(%)',
        oceanRareFishChancePct: '심해 초희귀 어종 확률(%)',
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
        firstHitDamageMorePct: '첫 공격 피해 증폭(%)',
        projectileExtraChance: '투사체 추가 발사 확률(%)',
        attackPctDmg: '공격 피해 증가(%)',
        spellFlatDmg: '주문 내장 피해',
        spellFlatPct: '주문 내장 피해 증가(%)',
        spellPctDmg: '주문 피해(%)',
        shieldPctDmg: '방패 스킬 피해(%)',
        minePctDmg: '지뢰 피해(%)',
        potionPctDmg: '포션 투척 피해(%)',
        mobilityPctDmg: '기동 스킬 피해(%)',
        channelingPctDmg: '채널링 피해(%)',
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
        move: '이동 속도(%)', sight: '시야(칸)', sightCap: '시야 상한(칸)', chestGrade: '보급 상자 등급 확률(%)',
        crit: '치명타 확률(%)',
        critDmg: '치명타 피해(%)',
        leech: '공격 피해의 생명력 흡수(%)',
        leechRateCap: '흡혈 회복 속도 캡(최대 생명력 %/초)',
        leechTotalCap: '흡혈 총 회복량 캡(최대 생명력 %)',
        leechInstanceCap: '흡혈 타격당 회복량 캡(최대 생명력 %)',
        gemLevel: '모든 스킬 젬 레벨',
        elementalGemLevel: '원소 스킬 젬 레벨',
        fireGemLevel: '화염 스킬 젬 레벨',
        coldGemLevel: '냉기 스킬 젬 레벨',
        lightGemLevel: '번개 스킬 젬 레벨',
        chaosGemLevel: '카오스 스킬 젬 레벨',
        physGemLevel: '물리 스킬 젬 레벨',
        projectileGemLevel: '투사체 스킬 젬 레벨',
        meleeGemLevel: '근접 스킬 젬 레벨',
        slamGemLevel: '강타 스킬 젬 레벨',
        spellGemLevel: '주문 스킬 젬 레벨',
        dotGemLevel: '지속 스킬 젬 레벨',
        aoeGemLevel: '범위 스킬 젬 레벨',
        summonGemLevel: '소환수 공격 스킬 젬 레벨',
        dr: '물리 피해 감소(%)',
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
        spellLeech: '주문 피해의 생명력 흡수(%)',
        shockEffectReducePct: '감전 효과 감소(%)',
        dotTakenDamageReducePct: '받는 지속 피해 감소(%)',
        genericTakenDamageReducePct: '받는 피해 감소(%)',
        shockedEnemyHitDamageMorePct: '감전된 적 타격 피해 증폭(%)',
        shockedEnemyHitDamagePct: '감전된 적에게 주는 명중 피해 증가(%)',
        takenDamageReduceWhen2EnemiesPct: '적 2명 이상일 때 받는 피해 감소(%)',
        takenDamageReduceWhen1EnemyPct: '적 1명일 때 받는 피해 감소(%)',
        chillEffect: '냉각 효율(%)',
        shockEffect: '감전 효율(%)',
        igniteDamageMultiplierPct: '점화 효율(%)',
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
        physFlatDmg: '물리 기본 피해',
        doubleDamageChance: '확률로 2배의 피해를 줌(%)',
        slamEchoDamagePct: '여진 피해량(%)'
    };
function getStatName(statId) {
    return STAT_DISPLAY_NAMES[statId] || (P_STATS[statId] && P_STATS[statId].name) || statId;
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
        flatDmg: 0, weaponFlatDmgPct: 0, pctDmg: 0, flatHp: 0, pctHp: 0, aspd: 0, crit: 0, move: 0, sight: 0, sightCap: 0, chestGrade: 0, gemLevel: 0, elementalGemLevel: 0, fireGemLevel: 0, coldGemLevel: 0, lightGemLevel: 0, chaosGemLevel: 0, physGemLevel: 0, projectileGemLevel: 0, meleeGemLevel: 0, slamGemLevel: 0, spellGemLevel: 0, dotGemLevel: 0, aoeGemLevel: 0, suppCap: 0, runeResonancePower: 0, regenFlat: 0,
        dr: 0, physIgnore: 0, resPen: 0, resF: 0, resC: 0, resL: 0, maxResAll: 0, maxResF: 0, maxResC: 0, maxResL: 0, maxResChaos: 0, resChaos: 0, leech: 0, leechRateCap: 0, leechTotalCap: 0, leechInstanceCap: 0, leechKeepFullLife: 0, critDmg: 0, regen: 0, regenSuppress: 0, ds: 0, expGain: 0,
        minDmgRoll: 0, maxDmgRoll: 0, slamEchoChance: 0, slamEchoDamagePct: 0, doubleDamageChance: 0, blockChanceMax: 0,
        physFlatTakenReduce: 0, fireFlatTakenReduce: 0, coldFlatTakenReduce: 0, lightFlatTakenReduce: 0, chaosFlatTakenReduce: 0, allFlatTakenReduce: 0,
        physTakenAsFire: 0, physTakenAsCold: 0, physTakenAsLight: 0, physTakenAsChaos: 0,
        addedFireDamagePct: 0, addedColdDamagePct: 0, addedLightDamagePct: 0, addedChaosDamagePct: 0, addedPhysDamagePct: 0,
        fireFlatDmg: 0, coldFlatDmg: 0, lightFlatDmg: 0, chaosFlatDmg: 0, physFlatDmg: 0,
        meleePctDmg: 0, slamPctDmg: 0, projectilePctDmg: 0, physPctDmg: 0, elementalPctDmg: 0, firePctDmg: 0, coldPctDmg: 0, lightPctDmg: 0, chaosPctDmg: 0, aoePctDmg: 0, dotPctDmg: 0, spellPctDmg: 0, shieldPctDmg: 0, minePctDmg: 0, potionPctDmg: 0, mobilityPctDmg: 0, channelingPctDmg: 0, igniteChance: 0, chillChance: 0, freezeChance: 0, shockChance: 0, poisonChance: 0, bleedChance: 0, spellFlatDmg: 0, spellFlatPct: 0,
        targetAny: 0, targetProjectile: 0, targetSlam: 0, projectileExtraShots: 0, projectileExtraChance: 0,
        attackPctDmg: 0, spellLeech: 0, spellCritDmg: 0,
        strength: 0, dexterity: 0, intelligence: 0, accuracy: 0,
        mystique: 0, devotion: 0, cycle: 0, ailmentDamagePct: 0, ailmentPotencyPct: 0,
        armor: 0, evasion: 0, energyShield: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, energyShieldRegen: 0, energyShieldRechargeFaster: 0, deflectChance: 0, deflectDamageReduce: 0, blockChance: 0, blockChancePct: 0,
        ailResIgnite: 0, ailResShock: 0, ailResFreeze: 0, ailResPoison: 0, ailResBleed: 0,
        chillEffectReducePct: 0, freezeDurationReducePct: 0, shockEffectReducePct: 0, igniteDamageReducePct: 0, bleedDamageReducePct: 0, poisonDamageReducePct: 0, dotTakenDamageReducePct: 0,
        takenDamageReduceWhen2EnemiesPct: 0, takenDamageReduceWhen1EnemyPct: 0, genericTakenDamageReducePct: 0,
        shockedEnemyHitDamageMorePct: 0, shockedEnemyHitDamagePct: 0, igniteDamageMultiplierPct: 0,
        poisonDamageMultiplierPct: 0, accuracyBonusPct: 0, chillEffect: 0, shockEffect: 0,
        summonFlatDmg: 0, summonPctDmg: 0, summonAspd: 0, summonHpPct: 0, summonCrit: 0, summonCritDmg: 0, summonCap: 0, summonEfficiency: 0, summonGuardRedirectPct: 0, summonResPen: 0, summonGemLevel: 0,
        curseCap: 0, oxygenMax: 0, oxygenRegen: 0,
        oceanPressureResist: 0, oceanDepthGainPct: 0, oceanOxygenAttackSavingPct: 0, oceanRareFishChancePct: 0,
        bossDamagePct: 0, eliteDamagePct: 0, firstStrikeDamagePct: 0, cullStrikePct: 0, echoPower: 0, chaosErosion: 0, chaosErosionCap: 0,
        regionPoisonSpread: 0, regionChaosShred: 0, regionPoisonedLeech: 0, regionChaosOvercap: 0, regionBlockEmpower: 0, regionArmorToPhys: 0,
        regionBleedingDamage: 0, regionLowLifeDR: 0, regionShockChain: 0, regionCritMove: 0, regionShockSpread: 0, regionShockedLightPen: 0,
        regionIgniteSpread: 0, regionFullLifeFire: 0, regionIgniteDuration: 0, regionIgnitedDamage: 0, regionFrozenCritDamage: 0, regionShatter: 0,
        regionChillOnHit: 0, regionChilledAttackerDR: 0
    };
}
// Bucket shape is the source for direct additions. Oxygen uses its separate resource rules.
const DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket())
    .filter(key => key !== 'oxygenMax' && key !== 'oxygenRegen'));
const COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [['resF', 1, 0], ['resC', 1, 0], ['resL', 1, 0]],
    moveEvasion: [['move', 1, 0], ['evasionPct', 1, 0]],
    hpArmor: [['flatHp', 1, 0], ['armor', 2, 0]],
    aspdMove: [['aspd', 1, 0], ['move', 1, 0]],
    chaosResElemPenalty: [['resChaos', 1, 0], ['resF', -1, 0], ['resC', -1, 0], ['resL', -1, 0]],
    deflectMajor: [['deflectChance', 1, 0], ['deflectDamageReduce', 0, 3]],
    targetCount: [['targetAny', 1, 0]]
});
function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== 'string' || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) { bucket[statId] += value; return; }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
        bucket[key] += value * multiplier + flat;
    }
}

function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach(stat => {
        if (!stat) return;
        addStatToBucket(bucket, stat.id, stat.val);
        // 복합 옵션(한 줄에 두 스탯)은 추가 스탯도 함께 합산한다.
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(extra => { if (extra) addStatToBucket(bucket, extra.id, extra.val); });
    });
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

/**
 * 도감처럼 같은 기본 확률을 보강하는 보너스를 합연산한다.
 * 지역 티어·몬스터 특성처럼 드랍 환경 자체의 배율은 호출부에서 별도로 곱한다.
 * @param {number} codexBonusPct
 * @param {number} challengeBonusPct
 * @returns {number}
 */
function getAdditiveDropBonusMultiplier(codexBonusPct, challengeBonusPct) {
    let codexRatio = Math.max(0, Number(codexBonusPct) || 0) / 100;
    let challengeRatio = Math.max(0, Number(challengeBonusPct) || 0) / 100;
    return 1 + codexRatio + challengeRatio;
}

/** 도트 UI에 섞이면 안 되는 컬러 그림 글자를 뺀다. 이모지 속성이 없는 그림 기호(U+1F56E 책 등)도 U+1F000 ~ 1FAFF 묶음으로 함께 뺀다. */
function stripDecorativeEmoji(value) {
    return String(value == null ? '' : value)
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F000}-\u{1FAFF}\uFE0F\u200D]/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function dispatchRuntimeEvent(name, detail = {}) {
    if (typeof game !== 'undefined' && game && game.isBackgroundCalculation) return false;
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof window.CustomEvent !== 'function') return false;
    window.dispatchEvent(new window.CustomEvent(`project-idle:${name}`, { detail }));
    return detail.handled === true;
}








var PASSIVE_WORLD_SCALE = 1.14;
const MAX_PLAYER_LEVEL = 200;
var PASSIVE_BOUNDS = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
let game;
// window.game은 언제나 지금의 game을 가리킨다. 불러오기 · 초기화로 game이 바뀌어도 낡은 객체를 보지 않는다
// (예전에는 전문가 상태 함수가 부수 효과로 매번 맞춰 주었다 — 2026-10-01 전문가 제거). 먼저 놓인 window.game 값은 이어받는다.
{
    const preset = Object.getOwnPropertyDescriptor(window, 'game');
    if (preset && 'value' in preset) game = preset.value;
}
Object.defineProperty(window, 'game', { configurable: true, get() { return game; }, set(value) { game = value; } });
let reachableNodes = new Set();
let discoveredPassiveNodes = new Set();
let previewPassiveNodes = new Set();

safeExposeGlobals({ normalizeIconArtStyle, pixelIconPath, clampNumber, getInventoryLimit, lerpNumber, approachNumber, rndChoice, hashSeed, createSeededRng, formatValue, formatPercentMultiplier, translateSkillTag, getSkillTagList, getStatName, getRarityColor, getRarityRank, createEmptyStatBucket, addStatToBucket, applyStatsToBucket, getTaggedDamageBreakdown, getOwnedSkillGemNames, getOwnedSupportGemNames, hasSkillGemOwned, hasSupportGemOwned, dedupeList, makeSourceLine, getAdditiveDropBonusMultiplier, stripDecorativeEmoji, dispatchRuntimeEvent });

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
