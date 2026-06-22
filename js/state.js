// Central runtime namespace/state bridge (phase 2).
// Keeps global compatibility while giving each module a stable anchor.
window.GameModules = window.GameModules || {};
window.GameState = window.GameState || {
  get game() { return window.game; },
  set game(v) { window.game = v; },
  get defaultGame() { return window.defaultGame; }
};
window.GameModules.state = window.GameState;

// Phase-3 extracted world/season progression helpers.
function formatStoryActLabel(storyAct) {
    if (!storyAct) return '액트 ?';
    return storyAct.displayAct === '엔드게임' ? '엔드게임' : `액트 ${storyAct.displayAct}`;
}
function getStoryActByZoneId(zoneId) {
    if (!Number.isFinite(zoneId)) return null;
    return STORY_ACTS[zoneId] || null;
}
function getStoryActByOrder(order) {
    return STORY_ACTS.find(act => act.order === order) || null;
}
function getActZoneDisplayName(zoneId) {
    let act = getStoryActByZoneId(zoneId);
    if (!act) return `액트 ${zoneId + 1}`;
    return `${formatStoryActLabel(act)}: ${act.title}`;
}

const ACT_ZONE_COUNT = STORY_ACTS.length;
const LAST_STORY_ZONE_ID = ACT_ZONE_COUNT - 1;
const ABYSS_START_ZONE_ID = ACT_ZONE_COUNT;
const OUTSIDE_CHAOS_ZONE_ID = 'outside_chaos_woodsman';
const CHAOS_REALM_ZONE_ID = 'chaos_realm';
const SKY_TOWER_ZONE_ID = 'sky_tower';
const WOODSMAN_ECHO_ZONE_ID = 'woodsman_echo_challenge';
const UNDERWORLD_ZONE_ID = 'underworld_core';

const MAP_ZONES = STORY_ACTS.map((act, idx) => ({
    id: idx,
    name: getActZoneDisplayName(idx),
    type: 'act',
    tier: act.tier,
    maxKills: act.maxKills,
    ele: act.ele,
    storyActId: act.id,
    storyOrder: act.order
}));

const abyssTiers = [8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];
for (let i = 1; i <= 20; i++) MAP_ZONES.push({ id: ABYSS_START_ZONE_ID + (i - 1), name: "혼돈 " + i, type: "abyss", tier: abyssTiers[i - 1], maxKills: 1, ele: "chaos", depth: i });


const CHAOS_REALM_DEFAULT_BONUSES = { pctDmg: 0, move: 0, pctHp: 0, resChaos: 0, resPen: 0, crit: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, critDmg: 0, aspd: 0 };
const ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL = 1.198;
const ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR = 0.0385;
const CHAOS_REALM_AFFIX_POOL = [
    { id: 'elemental_wall', name: '원소 장벽', desc: '화염/냉기/번개 저항 대폭 증가' },
    { id: 'iron_bark', name: '철갑 껍질', desc: '방어도와 물리 피해 감소 증가' },
    { id: 'mirage_step', name: '환영 보법', desc: '회피 대폭 증가' },
    { id: 'soul_shell', name: '혼백 보호막', desc: '생명력 100%만큼 에너지 보호막 보유' },
    { id: 'projectile_dampening', name: '투사체 굴절', desc: '투사체 피해 반감' },
    { id: 'spell_dampening', name: '주문 왜곡', desc: '주문 피해 반감' },
    { id: 'blood_drinker', name: '흡혈', desc: '적 공격 시 생명력 흡수' },
    { id: 'bloodless', name: '무혈', desc: '플레이어 흡혈 효율 대폭 감소' },
    { id: 'curse_blade', name: '저주를 검', desc: '저주를 공격력/관통으로 전환' },
    { id: 'curse_immune', name: '저주 면역', desc: '저주 적용 불가' },
    { id: 'phys_dampening', name: '물리 반감', desc: '물리 최종 피해 반감' },
    { id: 'deadly_crit', name: '치명적 본능', desc: '치명타 확률/피해 증가' },
    { id: 'multi_strike', name: '연속타격', desc: '추가 타격 확률' },
    { id: 'deep_penetration', name: '심층 관통', desc: '저항 관통 증가' }
];
function createDefaultChaosRealmState() {
    return {
        unlocked: false,
        highestFloor: 0,
        currentFloor: 1,
        clearedFloors: [],
        woodsmanBestDamagePct: 0,
        permanentBonuses: { ...CHAOS_REALM_DEFAULT_BONUSES }
    };
}
function ensureChaosRealmState() {
    let st = (game && game.chaosRealm && typeof game.chaosRealm === 'object') ? game.chaosRealm : (game.chaosRealm = createDefaultChaosRealmState());
    st.unlocked = !!st.unlocked;
    st.highestFloor = Math.max(0, Math.floor(st.highestFloor || 0));
    st.currentFloor = Math.max(1, Math.floor(st.currentFloor || 1));
    st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    st.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(st.woodsmanBestDamagePct) || 0));
    st.permanentBonuses = { ...CHAOS_REALM_DEFAULT_BONUSES, ...(st.permanentBonuses || {}) };
    Object.keys(CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { st.permanentBonuses[key] = Math.max(0, Number(st.permanentBonuses[key]) || 0); });
    if (st.unlocked && st.highestFloor < 1) st.highestFloor = 1;
    return st;
}
function getChaosRealmTier(floor) {
    let safeFloor = Math.max(1, Math.floor(floor || 1));
    return 30 + Math.floor((safeFloor - 1) * 0.85) + Math.floor(Math.max(0, safeFloor - 10) * 0.18);
}
function getChaosRealmAffixCount(floor) {
    let safeFloor = Math.max(1, Math.floor(floor || 1));
    if (safeFloor >= 35) return 5 + Math.floor((safeFloor - 35) / 20);
    if (safeFloor >= 20) return 4;
    if (safeFloor >= 10) return 3;
    if (safeFloor >= 5) return 2;
    return 1;
}
function getChaosRealmAffixScale(floor) {
    return 1 + Math.floor(Math.max(1, Math.floor(floor || 1)) / 10) * 0.25;
}
function getChaosRealmAffixes(floor) {
    let safeFloor = Math.max(1, Math.floor(floor || 1));
    let count = Math.min(CHAOS_REALM_AFFIX_POOL.length, getChaosRealmAffixCount(safeFloor));
    let start = Math.abs(hashSeed('chaosRealm:' + safeFloor)) % CHAOS_REALM_AFFIX_POOL.length;
    let out = [];
    for (let i = 0; i < CHAOS_REALM_AFFIX_POOL.length && out.length < count; i++) {
        let affix = CHAOS_REALM_AFFIX_POOL[(start + (i * 5)) % CHAOS_REALM_AFFIX_POOL.length];
        if (!out.some(row => row.id === affix.id)) out.push({ ...affix, scale: getChaosRealmAffixScale(safeFloor) });
    }
    return out;
}

function hasCurrentLoopChaos20Clear() {
    return !!(game && game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared)
        || (Array.isArray(game && game.abyssClearedDepths) && game.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
}
function canEnterChaosRealm() {
    return !!ensureChaosRealmState().unlocked && hasCurrentLoopChaos20Clear();
}
function canEnterUnderworld() {
    let st = ensureChaosRealmState();
    let hasCerberusClear = Array.isArray(game && game.clearedRootBosses) && game.clearedRootBosses.includes('s6_beast_cerberus');
    let deepMax = getHighestUnlockedEndlessChaosDepth();
    let labFloor = Math.max(1, Math.floor((game && game.labyrinthUnlockedMaxFloor) || (game && game.labyrinthFloor) || 1));
    return !!st.unlocked && hasCurrentLoopChaos20Clear() && hasCerberusClear && deepMax >= 30 && labFloor >= 100;
}
function isUnderworldUnlockedPermanent() {
    let st = ensureChaosRealmState();
    let hasCerberusClear = Array.isArray(game && game.clearedRootBosses) && game.clearedRootBosses.includes('s6_beast_cerberus');
    let deepMax = getHighestUnlockedEndlessChaosDepth();
    let labFloor = Math.max(1, Math.floor((game && game.labyrinthUnlockedMaxFloor) || (game && game.labyrinthFloor) || 1));
    return !!st.unlocked && hasCerberusClear && deepMax >= 30 && labFloor >= 100;
}


const OCEAN_CURRENT_POOL = [
    { id: 'cold_current', name: '냉수층', desc: '냉기 저항 감소' },
    { id: 'warm_current', name: '온수층', desc: '화염 저항 감소' },
    { id: 'riptide', name: '역류', desc: '이동속도 추가 감소' },
    { id: 'bioluminescence', name: '발광 생물군', desc: '명중 디버프 강화' },
    { id: 'still_water', name: '정체수', desc: '산소 소모 증가' },
    { id: 'school_of_fish', name: '물고기 떼', desc: '낚시 게이지 충전 증가' }
];
function getOceanCurrentAffixes(depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let count = Math.min(OCEAN_CURRENT_POOL.length, 1 + Math.floor(safeTier / 3));
    let start = Math.abs(hashSeed('oceanCurrent:' + safeTier)) % OCEAN_CURRENT_POOL.length;
    let out = [];
    for (let i = 0; i < OCEAN_CURRENT_POOL.length && out.length < count; i++) {
        let affix = OCEAN_CURRENT_POOL[(start + (i * 3)) % OCEAN_CURRENT_POOL.length];
        if (!out.some(row => row.id === affix.id)) out.push({ ...affix });
    }
    return out;
}
function createDefaultOceanState() {
    return {
        unlocked: false,
        depthM: 0,
        checkpointM: 0,
        oxygenMax: 100,
        oxygenCur: 100,
        pressureLevel: 0,
        fishingGauge: 0,
        reefInstalled: 0,
        fishStock: {},
        diving: false,
        lastTickAt: 0,
        bossClearM: 0
    };
}
function ensureOceanState() {
    let st = (game && game.ocean && typeof game.ocean === 'object') ? game.ocean : (game.ocean = createDefaultOceanState());
    st.unlocked = !!st.unlocked;
    st.depthM = Math.max(0, Math.floor(st.depthM || 0));
    st.checkpointM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.bossClearM = Math.max(0, Math.floor(st.bossClearM || 0));
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, Number.isFinite(st.oxygenCur) ? st.oxygenCur : st.oxygenMax));
    st.pressureLevel = Math.max(0, Math.floor(st.pressureLevel || 0));
    st.fishingGauge = Math.max(0, Math.min(100, Number(st.fishingGauge) || 0));
    st.reefInstalled = Math.max(0, Math.min(10, Math.floor(st.reefInstalled || 0)));
    st.fishStock = (st.fishStock && typeof st.fishStock === 'object') ? st.fishStock : {};
    st.diving = !!st.diving;
    st.drowning = !!st.drowning;
    st.drownSec = Math.max(0, Number(st.drownSec) || 0);
    if (!st.unlocked && (game.season || 1) >= OCEAN_UNLOCK_LOOP) st.unlocked = true;
    return st;
}
function canEnterOceanDepth() {
    return !!ensureOceanState().unlocked;
}
function getOceanOxygenMax() {
    // 산소 최대치는 플레이어 스펙과 무관한 고정 수치입니다.
    return 100;
}
function getOceanOxygenDrainPerSec() {
    // 기본 시간당 감소량은 고정이되, 이동 속도가 높을수록 더 빠르게 감소합니다.
    let base = 1;
    let moveSpeed = 100;
    try { if (typeof getPlayerStats === 'function') moveSpeed = Number(getPlayerStats().moveSpeed) || 100; } catch (e) { console.warn('failed to read movement speed for map progress:', e); }
    let moveRatio = Math.max(0.5, Math.min(4, moveSpeed / 100));
    return Math.max(0.1, base * moveRatio);
}
function getOceanOxygenPerAttackCost() {
    // 공격 1회마다 소모되는 고정 산소량입니다.
    return 0.5;
}
function getOceanDepthTier(depthM) {
    return Math.floor(Math.max(0, Math.floor(depthM || 0)) / 100);
}
function getOceanPendingBossBoundary(st) {
    // 500m 단위마다 보스가 막아서며, 그 보스를 잡아야 체크포인트가 그 지점으로 갱신됩니다.
    let depthM = Math.max(0, Math.floor(st.depthM || 0));
    let boundary = Math.floor(depthM / 500) * 500;
    if (boundary <= 0) return 0;
    if (boundary <= Math.max(0, Math.floor(st.bossClearM || 0))) return 0;
    return boundary;
}
function getOceanMoveSpeedDepthBonus() {
    // 이동 속도가 빠를수록 산소 소모는 늘지만, 그만큼 한 번에 더 깊이 전진할 수 있도록 보정합니다.
    let moveSpeed = 100;
    try { if (typeof getPlayerStats === 'function') moveSpeed = Number(getPlayerStats().moveSpeed) || 100; } catch (e) { console.warn('failed to read movement speed for map progress:', e); }
    let bonusRatio = Math.max(0, (moveSpeed - 100) / 100);
    return 1 + Math.min(1, bonusRatio * 0.5);
}
function getOceanFishingGaugeGainMul() {
    let st = ensureOceanState();
    return 1 + Math.max(0, Math.min(10, st.reefInstalled || 0)) * 0.15;
}

function createDefaultSkyTowerState() {
    return {
        unlocked: false,
        highestFloor: 1,
        currentFloor: 1,
        clearedThisLoop: 0,
        clearedFloors: [],
        loopSeason: 1,
        condensedPower: 0,
        skyStone: { crafted: false, level: 0 },
        gemBoosts: {}
    };
}
function ensureSkyTowerState() {
    let st = (game && game.skyTower && typeof game.skyTower === 'object') ? game.skyTower : (game.skyTower = createDefaultSkyTowerState());
    let currentSeason = Math.max(1, Math.floor((game && game.season) || 1));
    st.unlocked = !!st.unlocked;
    st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 1));
    st.currentFloor = Math.max(1, Math.min(st.highestFloor, Math.floor(st.currentFloor || 1)));
    st.loopSeason = Math.max(1, Math.floor(st.loopSeason || currentSeason));
    if (st.loopSeason !== currentSeason) {
        st.loopSeason = currentSeason;
        st.clearedThisLoop = 0;
    }
    st.clearedThisLoop = Math.max(0, Math.min(getSkyTowerLoopClearLimit(), Math.floor(st.clearedThisLoop || 0)));
    st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0));
    st.skyStone = (st.skyStone && typeof st.skyStone === 'object') ? st.skyStone : { crafted: false, level: 0 };
    st.skyStone.level = Math.max(0, Math.min(getSkyStoneMaxLevel(), Math.floor(st.skyStone.level || 0)));
    st.skyStone.crafted = !!st.skyStone.crafted || st.skyStone.level > 0;
    st.gemBoosts = (st.gemBoosts && typeof st.gemBoosts === 'object') ? st.gemBoosts : {};
    Object.keys(st.gemBoosts).forEach(name => {
        let lv = Math.max(0, Math.min(getSkyTowerGemBoostMaxLevel(), Math.floor(st.gemBoosts[name] || 0)));
        if (lv > 0) st.gemBoosts[name] = lv;
        else delete st.gemBoosts[name];
    });
    if (!st.unlocked && (currentSeason > 15 || (currentSeason >= 15 && hasCurrentLoopChaos20Clear()))) st.unlocked = true;
    return st;
}
function getSkyTowerLoopClearLimit() { return 25; }
function getSkyTowerRemainingClears() {
    let st = ensureSkyTowerState();
    return Math.max(0, getSkyTowerLoopClearLimit() - Math.max(0, Math.floor(st.clearedThisLoop || 0)));
}
function hasCurrentLoopChaosAccess() {
    if (hasCurrentLoopChaos20Clear()) return true;
    if (typeof game === 'undefined' || !game) return false;
    let maxZone = Number.isFinite(game.maxZoneId) ? game.maxZoneId : 0;
    if (maxZone >= ABYSS_START_ZONE_ID) return true;
    if (Array.isArray(game.abyssClearedDepths) && game.abyssClearedDepths.length > 0) return true;
    let currentDepth = typeof game.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(game.currentZoneId) : 0;
    return currentDepth >= 1;
}
function maybeUnlockSkyTowerFromChaos20() {
    let st = ensureSkyTowerState();
    if (!st.unlocked && (game.season || 1) >= 15 && hasCurrentLoopChaos20Clear()) {
        st.unlocked = true;
        if (typeof addLog === 'function') addLog('☁️ 창공의 탑이 열렸습니다. 이후 루프에서는 혼돈 입성부터 도전할 수 있습니다.', 'loot-unique');
        return true;
    }
    return false;
}
function canEnterSkyTower() {
    let st = ensureSkyTowerState();
    return !!st.unlocked && hasCurrentLoopChaosAccess();
}
function getSkyTowerTier(floor) {
    let safeFloor = Math.max(1, Math.floor(floor || 1));
    return 48 + Math.floor((safeFloor - 1) * 0.38);
}
function getSkyTowerRewardAmount(floor) {
    let safeFloor = Math.max(1, Math.floor(floor || 1));
    return 3 + Math.floor(safeFloor / 5);
}
function getSkyStoneMaxLevel() { return 15; }
function getSkyStoneReductionPct() {
    let st = ensureSkyTowerState();
    return Math.max(0, Math.min(75, Math.floor(((st.skyStone || {}).level || 0) * 5)));
}
function getSkyStoneNextCost() {
    let st = ensureSkyTowerState();
    let lv = Math.max(0, Math.floor(((st.skyStone || {}).level || 0)));
    return 20 + lv * 10 + Math.floor(lv * lv * 2);
}
function getSkyTowerGemBoostMaxLevel() { return 3; }
function getSkyTowerGemBoostLevel(skillName) {
    let st = ensureSkyTowerState();
    return Math.max(0, Math.min(getSkyTowerGemBoostMaxLevel(), Math.floor((st.gemBoosts || {})[skillName] || 0)));
}
function getSkyTowerGemBoostCost(skillName) {
    let lv = getSkyTowerGemBoostLevel(skillName);
    return [60, 120, 240][lv] || 999999;
}

function getAbyssDepthFromZoneId(id) {
    if (!Number.isFinite(id) || id < ABYSS_START_ZONE_ID) return 0;
    return Math.max(1, Math.floor(id - ABYSS_START_ZONE_ID + 1));
}

function getAbyssZoneIdForDepth(depth) {
    return ABYSS_START_ZONE_ID + Math.max(1, Math.floor(depth || 1)) - 1;
}

function getAbyssZoneTier(depth) {
    let safeDepth = Math.max(1, Math.floor(depth || 1));
    return abyssTiers[Math.min(20, safeDepth) - 1] || abyssTiers[abyssTiers.length - 1] || 20;
}












function getStarWedgeUnlockReady() {
    return (game.season || 1) >= STAR_WEDGE_UNLOCK_LOOP && (game.maxZoneId || 0) >= STAR_WEDGE_UNLOCK_ACT;
}

function getZone(id) {
    if (id === 'cosmos_challenge') {
        let cosmos = (game && game.cosmosAtlas && typeof game.cosmosAtlas === 'object') ? game.cosmosAtlas : {};
        let c = (cosmos.activeChallenge && typeof cosmos.activeChallenge === 'object') ? cosmos.activeChallenge : null;
        if (c) {
            return {
                id: 'cosmos_challenge',
                name: `우주계 ${c.name || '행성'}`,
                type: 'cosmos',
                tier: Math.max(1, Math.floor(c.tier || 1)),
                maxKills: 1,
                ele: c.ele || 'chaos',
                cosmosNodeId: c.nodeId || null,
                cosmosTag: c.tag || '',
                gravity: Math.max(1, Number(c.gravity || 1)),
                sizeClass: Math.max(1, Math.floor(c.sizeClass || 1)),
                theme: c.theme || ''
            };
        }
    }
    if (id === 'beehive_run') {
        let step = Math.max(1, Math.floor((game && game.beehive && game.beehive.branchStep) || 1));
        let entryDepth = Math.max(21, Math.floor((game && game.beehive && game.beehive.entryDeepChaosDepth) || 21));
        return { id: 'beehive_run', name: `벌집 심층 ${step}갈래`, type: 'beehive', tier: entryDepth, maxKills: 1, ele: 'chaos', entryDeepChaosDepth: entryDepth };
    }
    if (id === 'colony_run') {
        let wave = Math.max(1, Math.floor((game && game.colony && game.colony.wave) || 1));
        let depth = Math.max(21, Math.floor((game && game.colony && game.colony.entryDeepChaosDepth) || 21));
        return { id: 'colony_run', name: `군락지 방어 ${wave}웨이브`, type: 'colony', tier: depth + Math.floor(wave / 2), maxKills: 1, ele: 'chaos', entryDeepChaosDepth: depth };
    }
    if (id === 'grand_breach_run') {
        let kills = Math.max(0, Math.floor((((game || {}).voidRift || {}).grandRun || {}).kills || 0));
        let bonusTier = Math.min(6, Math.floor(kills / 25));
        return { id: 'grand_breach_run', name: '대균열', type: 'grandBreach', tier: 14 + bonusTier, maxKills: 9999, ele: 'chaos' };
    }
    if (id === OUTSIDE_CHAOS_ZONE_ID) return { id: OUTSIDE_CHAOS_ZONE_ID, name: '혼돈 밖', type: 'outsideChaos', tier: 25, maxKills: 1, ele: 'chaos' };
    if (id === CHAOS_REALM_ZONE_ID) {
        let realm = ensureChaosRealmState();
        let floor = Math.max(1, Math.floor(realm.currentFloor || 1));
        return { id: CHAOS_REALM_ZONE_ID, name: `혼돈계 ${floor}층`, type: 'chaosRealm', tier: getChaosRealmTier(floor), maxKills: 1, ele: 'chaos', floor: floor, affixes: getChaosRealmAffixes(floor) };
    }
    if (id === SKY_TOWER_ZONE_ID) {
        let st = ensureSkyTowerState();
        let floor = Math.max(1, Math.floor(st.currentFloor || 1));
        return { id: SKY_TOWER_ZONE_ID, name: `창공의 탑 ${floor}층`, type: 'skyTower', tier: getSkyTowerTier(floor), maxKills: 1, ele: 'chaos', floor: floor };
    }
    if (id === WOODSMAN_ECHO_ZONE_ID) return { id: WOODSMAN_ECHO_ZONE_ID, name: '나무꾼의 잔상', type: 'woodsmanEcho', tier: getChaosRealmTier(30), maxKills: 1, ele: 'chaos' };
    if (id === UNDERWORLD_ZONE_ID) {
        let uw = (game && game.underworldProgress) || {};
        let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
        return { id: UNDERWORLD_ZONE_ID, name: `지하계 ${floor}층`, type: 'underworld', tier: getChaosRealmTier(30), maxKills: 1, ele: 'chaos', floor: floor };
    }
    if (typeof id === 'string') {
        if (id.startsWith('trial_')) return TRIAL_ZONES.find(t => t.id === id);
        let seasonBossZone = SEASON_BOSS_ZONES.find(t => t.id === id);
        if (seasonBossZone) return seasonBossZone;
    }
    if (id === METEOR_FALL_ZONE_ID) {
        let star = (game && game.starWedge) || {};
        let allowBeyond20 = !!star.skyRiftAllCosmos;
        let tierCap = allowBeyond20 ? 40 : 20;
        let tier = Math.max(8, Math.min(tierCap, Math.floor(star.activeMeteorTier || star.skyRiftMinTier || 13)));
        return {
            id: METEOR_FALL_ZONE_ID,
            name: '운석 낙하 지점',
            type: 'meteor',
            tier: tier,
            maxKills: 1,
            ele: 'chaos'
        };
    }
    if (id === OCEAN_ZONE_ID) {
        let ocean = ensureOceanState();
        let depthM = Math.max(0, Math.floor(ocean.depthM || 0));
        let depthTier = getOceanDepthTier(depthM);
        let bossBoundary = getOceanPendingBossBoundary(ocean);
        let isBossWave = bossBoundary > 0;
        return { id: OCEAN_ZONE_ID, name: isBossWave ? `심해 ${depthM}m (수압 경계 보스)` : `심해 ${depthM}m`, type: 'oceanDepth', tier: getChaosRealmTier(21) + depthTier, maxKills: 1, ele: 'chaos', depthM: depthM, depthTier: depthTier, currents: getOceanCurrentAffixes(depthTier), oceanBossWave: isBossWave, oceanBossBoundary: bossBoundary };
    }
    if (id === LABYRINTH_ZONE_ID) {
        let floor = Math.max(1, game.labyrinthFloor || 1);
        let baseTier = Math.min(20, 7 + Math.floor(floor / 3));
        let over50 = Math.max(0, floor - 50);
        let over100 = Math.max(0, floor - 100);
        let extraTier = Math.floor(over50 / 5) + Math.floor(over100 / 3);
        return { id: LABYRINTH_ZONE_ID, name: `고대 미궁 ${floor}층`, type: 'labyrinth', tier: baseTier + extraTier, maxKills: 1, ele: 'chaos', floor: floor };
    }
    if (Number.isFinite(id) && id >= ABYSS_START_ZONE_ID) {
        let depth = getAbyssDepthFromZoneId(id);
        let displayDepth = depth;
        let baseZone = MAP_ZONES[Math.min(id, getAbyssZoneIdForDepth(20))];
        return {
            ...(baseZone || {}),
            id: id,
            name: displayDepth > 20 ? `혼돈 심화 ${displayDepth}` : `혼돈 ${displayDepth}`,
            type: 'abyss',
            tier: getAbyssZoneTier(displayDepth),
            maxKills: 1,
            ele: 'chaos',
            depth: displayDepth,
            baseDepth: Math.min(20, depth),
            isEndlessDepth: displayDepth > 20
        };
    }
    return MAP_ZONES[id];
}







function getSeasonAbyssDepthCap(seasonValue) {
    let season = Math.max(1, Math.floor(seasonValue || 1));
    return season <= 9 ? (10 + (season - 1)) : (20 + (season - 10));
}

function getLoopAbyssRequirementText(seasonValue) {
    let cap = getSeasonAbyssDepthCap(seasonValue);
    return `루프 조건: ${cap > 20 ? '혼돈 심화' : '혼돈'} ${cap} 클리어`;
}

function hasCurrentLoopAbyssRequirementClear(seasonValue) {
    let cap = getSeasonAbyssDepthCap(seasonValue || (game && game.season) || 1);
    if (cap <= 20) return hasCurrentLoopChaos20Clear();
    let bestDepth = Math.max(0, Math.floor((game && game.loopProgressCurrent && game.loopProgressCurrent.bestAbyssDepth) || 0));
    return bestDepth >= cap;
}

function getSeasonFinalZoneId(seasonValue) {
    return LAST_STORY_ZONE_ID + getSeasonAbyssDepthCap(seasonValue);
}

function getCurrentSeasonFinalZoneId() {
    return getSeasonFinalZoneId(game.season || 1);
}

function getVisibleHuntingMapCapZoneId() {
    return Math.min(getCurrentSeasonFinalZoneId(), getAbyssZoneIdForDepth(20));
}

function getHighestUnlockedEndlessChaosDepth() {
    let depths = [];
    if (Array.isArray(game && game.abyssUnlockedDepths)) {
        depths = game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21);
    }
    let currentDepth = Math.floor((game && game.abyssEndlessDepth) || 0);
    if (currentDepth >= 21) depths.push(currentDepth);
    return depths.length > 0 ? Math.max(...depths) : 0;
}

function getAutoProgressZoneId(fallbackZoneId) {
    if ((game.season || 1) >= 10 && hasCurrentLoopChaos20Clear()) {
        if (getAbyssDepthFromZoneId(fallbackZoneId) === 20) {
            game.abyssEndlessDepth = 21;
            return getAbyssZoneIdForDepth(21);
        }
        let highestDepth = getHighestUnlockedEndlessChaosDepth();
        if (highestDepth >= 21) return getAbyssZoneIdForDepth(highestDepth);
    }
    return fallbackZoneId;
}



function getAbyssPassiveState() {
    if (!game.abyssPassives || typeof game.abyssPassives !== 'object') {
        game.abyssPassives = { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 };
    }
    return game.abyssPassives;
}

function getAbyssPassiveSpent() {
    let state = getAbyssPassiveState();
    return ABYSS_PASSIVE_NODES.reduce((sum, node) => sum + (Math.max(0, Math.floor(state[node.key] || 0)) * Math.max(1, Math.floor(node.cost || 1))), 0);
}

function getAbyssPassiveFreePoints() {
    return Math.max(0, Math.floor(game.abyssPassivePoints || 0) - getAbyssPassiveSpent());
}

function tryAllocateAbyssPassive(nodeKey) {
    if ((game.season || 1) < 1) return;
    let node = ABYSS_PASSIVE_NODES.find(row => row.key === nodeKey);
    if (!node) return;
    let state = getAbyssPassiveState();
    if ((state[node.key] || 0) >= node.max) return addLog('해당 심연 노드는 이미 최대 단계입니다.', 'attack-monster');
    let pointCost = Math.max(1, Math.floor(node.cost || 1));
    if (getAbyssPassiveFreePoints() < pointCost) return addLog(`혼돈 패시브 포인트가 부족합니다. (필요: ${pointCost})`, 'attack-monster');
    state[node.key] = (state[node.key] || 0) + 1;
    addLog(`🌌 혼돈 패시브 [${node.name}] ${state[node.key]}/${node.max} (소모 ${pointCost})`, 'season-up', { noToast: true });
    updateStaticUI();
}

function getAbyssMonsterScales(zone) {
    let state = getAbyssPassiveState();
    let active = zone && zone.type === 'abyss';
    if (!active) return { dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1, playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0, bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1 };
    let depth = zone && zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 1;
    // 심화 혼돈(21+) 기록은 심화 구간에서만 난이도에 반영한다.
    // 새 루프의 혼돈 1~20에 과거 심화층 배율이 섞이면 난이도가 비정상적으로 급등한다.
    let endlessDepth = depth <= 20 ? depth : Math.max(depth, Math.floor(game.abyssEndlessDepth || depth));
    let endlessOver = Math.max(0, endlessDepth - 20);
    let endlessMul = 1;
    if (endlessOver > 0) {
        let steepBand = Math.min(10, endlessOver);
        let smoothBand = Math.max(0, endlessOver - 10);
        endlessMul = Math.pow(ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, steepBand) * Math.pow(1.06, smoothBand);
    }
    let postLoopOver = Math.max(0, Math.floor((game.season || 1) - 10));
    let postLoopDifficultyMul = postLoopOver > 0 ? (1 + postLoopOver * 0.05 + endlessOver * 0.022) : 1;
    return {
        dmgMul: (1 + (state.power || 0) * 0.02) * postLoopDifficultyMul,
        hpMul: (1 + (state.tenacity || 0) * 0.02) * endlessMul * (postLoopOver > 0 ? (1 + postLoopOver * 0.04) : 1),
        hordeMul: (1 + (state.horde || 0) * 0.03) * (1 + (state.magnifier || 0) * 0.2),
        dropMul: Math.max(0.2, 1 + ((state.power || 0) + (state.frailty || 0) + (state.resistance || 0) - (state.horde || 0)) * 0.01),
        expMul: Math.max(0.2, 1 + ((state.tenacity || 0) * 0.01) - ((state.horde || 0) * 0.02) + ((state.weakness || 0) * 0.02)),
        playerTakenMul: (1 + (state.frailty || 0) * 0.01) * (1 + Math.min(10, endlessOver) * ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR + Math.max(0, endlessOver - 10) * 0.012 + postLoopOver * 0.03),
        playerDamageMul: Math.max(0.2, 1 - (state.weakness || 0) * 0.01),
        resistBonus: (state.resistance || 0),
        eliteBonus: (state.elite || 0) * 0.02,
        bossMul: (1 - (state.coreRaid || 0) * 0.10) * (1 + (state.arrogance || 0) * 0.20),
        bossExtraCurrencyChance: (state.arrogance || 0) * 0.05,
        mapProgressMul: Math.max(0.35, 1 - (state.magnifier || 0) * 0.5),
        mapLengthMul: 1 + (state.magnifier || 0)
    };
}

function applySeasonContentProgression(options) {
    let opts = options || {};
    game.unlockedSeasonContents = Array.isArray(game.unlockedSeasonContents) ? game.unlockedSeasonContents : [];
    game.seenSeasonContentNotices = Array.isArray(game.seenSeasonContentNotices) ? game.seenSeasonContentNotices : [];
    let maxSeason = Math.max(1, Math.min(20, game.season || 1));
    for (let s = 1; s <= maxSeason; s++) {
        let key = `season_${s}`;
        if (!game.unlockedSeasonContents.includes(key)) game.unlockedSeasonContents.push(key);
        if (!opts.silent && !game.seenSeasonContentNotices.includes(key) && SEASON_CONTENT_ROADMAP[s]) {
            let def = SEASON_CONTENT_ROADMAP[s];
            addLog(`🧩 루프 ${s} [${def.title}] 이정표 개방`, 'season-up');
            (def.features || []).slice(0, 2).forEach(line => addLog(`   - ${line}`, 'loot-magic'));
            game.seenSeasonContentNotices.push(key);
        }
    }
    let finalZone = getCurrentSeasonFinalZoneId();
    game.maxZoneId = clampNumber(Number.isFinite(game.maxZoneId) ? game.maxZoneId : 0, 0, finalZone);
    if (typeof game.currentZoneId !== 'string') {
        let currentZone = Number.isFinite(game.currentZoneId) ? game.currentZoneId : 0;
        let deepChaosZone = (game.season || 1) >= 10 && getAbyssDepthFromZoneId(currentZone) > 20;
        game.currentZoneId = deepChaosZone ? currentZone : clampNumber(currentZone, 0, finalZone);
    }
}

function getLoop10StatCost(statKey) {
    game.loop10BonusStats = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    let lv = Math.max(0, Math.floor(game.loop10BonusStats[statKey] || 0));
    return 1 + Math.floor(lv / 3);
}

function allocateLoop10BonusStat(statKey) {
    if ((game.season || 1) < 10) return;
    let cost = getLoop10StatCost(statKey);
    if ((game.seasonPoints || 0) < cost) return addLog(`루프 포인트가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.loop10BonusStats = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    game.loop10BonusStats[statKey] = Math.max(0, Math.floor(game.loop10BonusStats[statKey] || 0)) + 1;
    game.seasonPoints -= cost;
    addLog(`🧬 루프10 강화: ${getStatName(statKey)} 투자 +1 (비용 ${cost})`, 'season-up');
    updateStaticUI();
}

function enterNextEndlessChaosDepth() {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun)) {
        if (typeof warnBeehiveMapTravelBlocked === 'function') return warnBeehiveMapTravelBlocked();
        return;
    }
    if ((game.season || 1) < 10) return;
    game.abyssEndlessDepth = Math.max(20, Math.floor(game.abyssEndlessDepth || 20) + 1);
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    if (!game.abyssUnlockedDepths.includes(game.abyssEndlessDepth)) game.abyssUnlockedDepths.push(game.abyssEndlessDepth);
    game.currentZoneId = getAbyssZoneIdForDepth(game.abyssEndlessDepth);
    game.killsInZone = 0;
    game.combatHalted = false;
    game.runProgress = 0;
    addLog(`♾️ 혼돈 심화 ${game.abyssEndlessDepth}층 진입`, 'season-up');
    startMoving(true);
    updateStaticUI();
}

function enterUnlockedEndlessDepth(depth) {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun)) {
        if (typeof warnBeehiveMapTravelBlocked === 'function') return warnBeehiveMapTravelBlocked();
        return;
    }
    if ((game.season || 1) < 10) return;
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    depth = Math.max(20, Math.floor(depth || 20));
    if (!game.abyssUnlockedDepths.includes(depth)) return addLog('아직 도달하지 않은 심화 층수입니다.', 'attack-monster');
    game.abyssEndlessDepth = depth;
    game.currentZoneId = getAbyssZoneIdForDepth(depth);
    game.killsInZone = 0;
    game.combatHalted = false;
    game.runProgress = 0;
    addLog(`🧭 기록된 혼돈 심화 ${depth}층으로 이동`, 'season-up');
    startMoving(true);
    updateStaticUI();
}

function getLoopDeepStatCost(statKey) {
    game.loopDeepStats = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    let lv = Math.max(0, Math.floor(game.loopDeepStats[statKey] || 0));
    return 1 + Math.floor(lv / 2);
}

function allocateLoopDeepStat(statKey) {
    if ((game.season || 1) < 10) return;
    let cost = getLoopDeepStatCost(statKey);
    if ((game.loopDeepPoints || 0) < cost) return addLog(`심화 루프 포인트가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.loopDeepStats = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    game.loopDeepStats[statKey] = Math.max(0, Math.floor(game.loopDeepStats[statKey] || 0)) + 1;
    game.loopDeepPoints -= cost;
    addLog(`🧬 심화 루프 강화: ${getStatName(statKey)} Lv.${game.loopDeepStats[statKey]} (비용 ${cost})`, 'season-up');
    updateStaticUI();
}

const CLASS_TEMPLATES = {
    warrior: { name: '워리어', desc: '강력한 물리 압박과 방어 관통', m1: 'physPctDmg', m2: 'physIgnore', d: 'dr' },
    gladiator: { name: '글래디에이터', desc: '빠른 공격속도와 연속 타격', m1: 'meleePctDmg', m2: 'ds', d: 'aspd' },
    assassin: { name: '어쌔신', desc: '치명타 확률과 막대한 치명타 피해', m1: 'crit', m2: 'critDmg', d: 'chaosPctDmg' },
    ranger: { name: '레인저', desc: '신속한 이동과 투사체 장악', m1: 'projectilePctDmg', m2: 'move', d: 'crit' },
    elementalist: { name: '엘리멘탈리스트', desc: '원소 피해와 원소 저항 특화', m1: 'elementalPctDmg', m2: 'resAll', d: 'regen' },
    warlock: { name: '워록', desc: '혼돈 피해와 생명력 흡수', m1: 'chaosPctDmg', m2: 'dotPctDmg', d: 'pctHp' },
    guardian: { name: '가디언', desc: '방어도와 생명력으로 버티는 성벽', m1: 'armor', m2: 'flatHp', d: 'dr' },
    inquisitor: { name: '인퀴지터', desc: '원소 치명타 및 보조 스킬 전문', m1: 'elementalPctDmg', m2: 'critDmg', d: 'suppCap' },
    soulbinder: { name: '소울바인더', desc: '소환계열 특화', m1: 'dotPctDmg', m2: 'energyShield', d: 'regen' },
    catalyst: { name: '카탈리스트', desc: '상태 이상 및 지속 피해 특화', m1: 'elementalPctDmg', m2: 'chaosPctDmg', d: 'resPen' },
    hunter: { name: '헌터', desc: '치명타 및 단일 개체 특화', m1: 'projectilePctDmg', m2: 'critDmg', d: 'crit' },
    crusader: { name: '크루세이더', desc: '번개 피해 및 방어도 에너지 보호막 혼합 특화', m1: 'meleePctDmg', m2: 'resAll', d: 'dr' }
};

const CLASS_KEYSTONE_PICK_LIMIT = 5;
const CLASS_KEYSTONE_DEFS = {
    warrior: [
        { id: 'w1', name: '강철 태세', desc: '물리 피해 15% 증폭, 방어도 15% 증가', req: null },
        { id: 'w2', name: '전장의 리듬', desc: '치명타 및 연속 공격 발생 시 각각 2초간 공격속도 +8% (각각 최대 5중첩)', req: null },
        { id: 'w3', name: '쌍수 훈련', desc: '방패 슬롯에 무기 장착 가능', req: null },
        { id: 'w4', name: '갑주 분쇄', desc: '물리 피해 감소 무시가 마이너스까지 적용될 수 있음', req: 'w1' },
        { id: 'w5', name: '격노 순환', desc: '피격 시 5초간 물리 피해 +5% (최대 5중첩, 곱연산)', req: 'w2' },
        { id: 'w6', name: '거인의 힘', desc: '쌍수 상태에서, 각 무기의 효과 50% 증가', req: 'w3' },
        { id: 'w7', name: '불굴의 진군', desc: '생명력 50% 이하 시 받는 피해 15% 감폭, 주는 피해 15% 증폭', reqAny: ['w2', 'w4'] },
        { id: 'w8', name: '파괴 본능', desc: '생명력이 50% 이상으로 회복/흡수되지 않음, 치명타 확률/치명타 피해 배율/연속타격/공격 속도/이동 속도 +15%, 최종 피해 +15%', req: 'w7' },
        { id: 'w9', name: '전쟁광', desc: '모든 주는 피해 40% 증폭, 받는 피해 10% 증폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    gladiator: [
        { id: 'g1', name: '결투 태세', desc: '물리 피해 12% 증폭, 물리가 아닌 피해 20% 감폭', req: null },
        { id: 'g2', name: '연참 호흡', desc: '연속 타격 발생 시 3초간 공격 속도 +3%, 회피 +3% (최대 12중첩)', req: null },
        { id: 'g3', name: '노련함', desc: '치명타가 아닌 타격 시 다음 타격 치명타 확률 +5%p, 치명타 발동 시 초기화', req: null },
        { id: 'g4', name: '난투 본능', desc: '적이 3기 이상 주변에 있으면 받는 피해 15% 감폭, 주는 피해 15% 증폭', req: 'g1' },
        { id: 'g5', name: '속공 전개', desc: '이동 후 첫 타격 피해 30% 증폭 및 첫 받는 피해 30% 감폭', req: 'g2' },
        { id: 'g6', name: '마무리 타격', desc: '공격 후 적 생명력 20% 미만 즉시 처치(보스 10%)', req: 'g3' },
        { id: 'g7', name: '투기 순환', desc: '회피 비례 연속 타격 증가, 방어도 비례 치명타 확률 증가', reqAny: ['g4', 'g5'] },
        { id: 'g8', name: '검투의 화신', desc: '연속 타격 +100%, 보스 대상 주고/받는 피해 18% 증폭, 재생 50% 감폭, ES 재생 없음', req: 'g7' },
        { id: 'g9', name: '실전 특화', desc: '막기 확률 및 비껴내기 확률 판정에 행운 적용(2회 굴려 유리한 값 선택)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    assassin: [
        { id: 'a1', name: '냉혹한 집중', desc: '치명타 피해 배율 +66%, 치명타 확률 -6%p', req: null },
        { id: 'a2', name: '그림자 질주', desc: '이동 시 흐릿함 상태 부여: 이동 속도 +20%, 치명타 피해 배율 +25%, 회피 20% 증폭. 피해를 받으면 해제', req: null },
        { id: 'a3', name: '독점 약점', desc: '치명타 발생 시 5초간 대상 받는 피해 +6% (개별 대상, 최대 10중첩, 적 상태이상에 표시)', req: null },
        { id: 'a4', name: '암전 절개', desc: '물리 피해 감소 무시 +25%, 저항 관통 +25%, 피해 8% 감폭', req: 'a1' },
        { id: 'a5', name: '사형 선고', desc: '모든 공격이 치명타로 간주됩니다. 치명타로 간주된 비-치명타 공격도 치명타 효과와 치명타 피해 배율 보너스를 받습니다.', req: 'a3' },
        { id: 'a6', name: '유리 심장', desc: '현재 생명력 66% 초과 시 치명타 피해 배율 20% 증폭, 이하 시 회피 20% 증폭', req: 'a2' },
        { id: 'a7', name: '살의 폭주', desc: '적이 1명일 경우 치명타가 연속 타격 1회 추가로 부여, 치명타 피해 배율 -200%', reqAny: ['a4', 'a5'] },
        { id: 'a8', name: '종말의 송곳니', desc: '치명타 피해 배율이 2배, 피해 25% 감폭', req: 'a7' },
        { id: 'a9', name: '암영 극의', desc: '치명타 피해 배율 20% 증폭 및 회피 20% 증폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    ranger: [
        { id: 'r1', name: '사냥꾼 보법', desc: '이동 속도 15% 증폭, 방어도/에너지 보호막 0', req: null },
        { id: 'r2', name: '가속 시위', desc: '공격 속도 10% 증폭, 투사체 스킬 피해 10% 감폭', req: null },
        { id: 'r3', name: '탄도 감각', desc: '투사체 스킬 타겟 수 +2, 투사체 스킬 최소 피해 보정 -10%', req: null },
        { id: 'r4', name: '질풍 동조', desc: '이동 속도 10%당 공격 속도 +1%', req: 'r1' },
        { id: 'r5', name: '급소 표식', desc: '같은 적 3회 연속 적중마다 적 최대 체력의 1% 추가 물리 피해', req: 'r2' },
        { id: 'r6', name: '궤적 관통', desc: '관통 스킬 타겟 수 +1, 관통 스킬 피해 10% 감폭, 타겟마다 3% 증폭', req: 'r3' },
        { id: 'r7', name: '추적 본능', desc: '피격되지 않은 시간 1초마다 치명타 확률 +5%p (피격 시 초기화)', reqAny: ['r4', 'r5'] },
        { id: 'r8', name: '폭풍 사냥', desc: '공격 속도와 이동 속도 상호 7% 효율 보정, 최대 생명력 -15%', req: 'r7' },
        { id: 'r9', name: '극한의 속사', desc: '공격 속도 소프트캡 기준치 +2', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    elementalist: [
        { id: 'e1', name: '원소 공명', desc: '원소 최종 피해 15% 증폭, 물리 피해 없음', req: null },
        { id: 'e2', name: '분광 외피', desc: '모든 원소 저항 +15%, 원소 저항 최대치 +3%, 카오스 저항 -10%', req: null },
        { id: 'e3', name: '마력 순환', desc: '에너지 보호막 재생이 끊기지 않음, 최대 생명력 -15%', req: null },
        { id: 'e4', name: '융해 결합', desc: '모든 스킬이 화염/냉기/번개 33% 영향 스킬로 변화', req: 'e1' },
        { id: 'e5', name: '공허 결합', desc: '카오스 저항이 가장 높은 원소 저항의 50%만큼 상승, 카오스 저항만큼 원소 최종 피해 증가', req: 'e2' },
        { id: 'e6', name: '원소 침식', desc: '저항 관통 +20%, 치명타 피해 배율 -25%', req: 'e3' },
        { id: 'e7', name: '삼원 폭주', desc: '화/냉/번 동시 사용 시 최종 피해 5% 증폭, 상태이상 강도는 최종 피해의 2배에 비례', req: 'e4' },
        { id: 'e8', name: '원소 과부하', desc: '치명타 공격마다 원소 과부하 중첩 획득: 중첩당 원소 최종 피해 +4%, 치명타 확률 -1%p (무한 중첩). 비-치명타 공격 시 모든 중첩을 잃음', req: 'e7' },
        { id: 'e9', name: '절대 관통', desc: '원소 저항 관통 +100%, 원소 저항 관통이 -300%까지 확장됨', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    warlock: [
        { id: 'wlk1', name: '심연 각인', desc: '모든 피해가 카오스 피해가 됨. 카오스 피해 20% 증폭', req: null },
        { id: 'wlk2', name: '부패 증식', desc: '지속 피해 배율 20% 증폭, 즉발 피해 10% 감폭', req: null },
        { id: 'wlk3', name: '금단 대가', desc: '에너지 보호막 재생 불가, 흡수가 에너지 보호막에 대신 적용', req: null },
        { id: 'wlk4', name: '암흑 치환', desc: '각 원소 저항 최대치 초과분의 25%만큼 카오스 저항 증가', req: 'wlk1' },
        { id: 'wlk5', name: '전염 가속', desc: 'DOT 틱 속도 +50%, 지속시간 -50%', req: 'wlk2' },
        { id: 'wlk6', name: '공허 특이점', desc: '저항 관통 +21%, 치명타 불가, 치명타 확률이 저항 관통으로 전환. 공격 피해가 100%~(100+저항 관통+치명타 피해 배율)% 사이에서 무작위로 결정됨', req: 'wlk3' },
        { id: 'wlk7', name: '피의 계약', desc: '에너지 보호막 50% 이상에서 피해 25% 증폭. 공격 시 가능하면 생명력 4%를 소모해 해당 공격의 피해 1.5배', reqAny: ['wlk4', 'wlk6'] },
        { id: 'wlk8', name: '심연 군주', desc: '주얼 슬롯 2칸 추가, 카오스 피해 25% 증폭, 생명력 회복 효과 50% 감폭', req: 'wlk7' },
        { id: 'wlk9', name: '시체 역병', desc: '저주 최대치 +1. 카오스 피해로 적 처치 시 50% 확률로 시체 폭발(적 최대 생명력의 20%를 카오스 피해로 주변에). 모든 카오스 피해 적중 시 적에게 위축 부여(최대 10중첩, 1중첩당 받는 카오스 피해 +8%)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],

    soulbinder: [
        { id: 'sb1', name: '영혼 결속', desc: '소환수 기본 피해 15% 증폭', req: null },
        { id: 'sb2', name: '나눠갖기', desc: '소환수가 플레이어가 받는 피해의 50%를 대신 받음', req: null },
        { id: 'sb3', name: '야생성', desc: '소환수 흡혈 +3%', req: null },
        { id: 'sb4', name: '무리', desc: '소환수 한도 +1, 소환수 공격 속도 15% 증폭', req: 'sb1' },
        { id: 'sb5', name: '홀로서기', desc: '소환수의 기본 공격력과 공격적인 추가 스탯만 플레이어가 가짐, 소환수 생명력 등 방어적인 소환 옵션은 전이되지 않으며 소환수는 공격하지 않음', req: 'sb2' },
        { id: 'sb6', name: '꿰뚫는 이', desc: '저항 관통 +16%, 플레이어 저항 관통이 소환수 공격에도 100% 적용', req: 'sb3' },
        { id: 'sb7', name: '상호 보완', desc: '플레이어 공격력(타격당 기본 피해)의 50%를 소환수 타격에 더하고, 소환수 공격력의 50%를 플레이어 타격에 더함', reqAny: ['sb4', 'sb3'] },
        { id: 'sb8', name: '군주', desc: '소환수 한도 +3', req: 'sb7' },
        { id: 'sb9', name: '대군 소환', desc: '소환수 한도가 1.5배가 됩니다(내림)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    catalyst: [
        { id: 'ct1', name: '과잉 촉매', desc: '상태이상 지속 피해 유발 기준 피해가 실제 타격의 2배로 계산', req: null },
        { id: 'ct2', name: '약품 내성', desc: '지속 피해 배율의 10%만큼 모든 저항 상승, 1%만큼 최대 저항 상승(내림). 가장 높은 비-제한 원소 저항이 주는 상태이상 저항 +100% (공동 최고 저항은 모두 적용)', req: null },
        { id: 'ct3', name: '확산 반응', desc: '상태이상에 걸린 적이 사망 시 남은 상태이상을 모든 주변 적에게 확산', req: null },
        { id: 'ct4', name: '연막 포션', desc: '영구 은신: 이동 속도 +20%, 치명타 피해 배율 +25%, 회피 20% 증폭. 회피 성공 시 다음 타격에만 회피 30% 증폭', req: 'ct1' },
        { id: 'ct5', name: '감염 추적', desc: '적이 상태이상일 때 주는 피해 20% 증폭', req: 'ct2' },
        { id: 'ct6', name: '중첩 독성', desc: '중독/점화/출혈 최대 중첩 +1, 상태이상 피해 100% 증폭, 상태이상 지속 시간 50% 감폭', req: 'ct3' },
        { id: 'ct7', name: '완벽한 배합', desc: '모든 공격이 항상 치명타, 치명타 확률의 100% 및 치명타 피해 배율의 20%가 지속 피해 배율로 전환, 치명타에 치명타 피해 배율 대신 지속 피해 배율의 20% 적용', reqAny: ['ct4', 'ct5'] },
        { id: 'ct8', name: '파열 용해', desc: '중독/점화/출혈 최대 중첩 +2, 최대 중첩 시 1초 쿨로 누적 피해 즉시 폭발', req: 'ct6' },
        { id: 'ct9', name: '급성 발현', desc: '점화/중독/출혈의 피해 간격 및 지속 시간 50% 감폭(같은 피해를 더 빠르게 폭발)', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    hunter: [
        { id: 'h1', name: '단일 조준', desc: '투사체 피해 10% 증폭, 타겟이 하나면 25% 증폭', req: null },
        { id: 'h2', name: '약점 노출', desc: '공격 시 적에게 약점 노출 부여, 노출된 적이 받는 피해 20% 증가', req: null },
        { id: 'h3', name: '행운 발걸음', desc: '이동 속도의 20%를 회피로 전환, 회피 판정에 행운, 피격/상태이상 판정에 불운', req: null },
        { id: 'h4', name: '연쇄 관통', desc: '타겟이 하나면 공격이 100% 관통(초과 피해 100% 연쇄 관통)', req: 'h1' },
        { id: 'h5', name: '급소 격발', desc: '치명타 피해 배율 +250%, 치명타 확률 -25', req: 'h2' },
        { id: 'h6', name: '사거리 장악', desc: '투사체 스킬 타겟 수 +1, 투사체 추가 발사 +1', req: 'h3' },
        { id: 'h7', name: '고독 사냥', desc: '타겟 수 1로 고정, 줄어든 타겟 5개까지 각 연속 타격 +100%p, 이후 각 +50%p', reqAny: ['h4', 'h5'] },
        { id: 'h8', name: '절멸 사격', desc: '연속타격 불가, 연속타격 확률을 치명타 확률로 전환, 초과 치명타/다중 치명타 허용 (최대 1000%)', req: 'h7' },
        { id: 'h9', name: '일격필살', desc: '공격 속도가 1로 고정되며, 공격 속도 증가가 모두 피해량 증폭으로 전환됨', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    crusader: [
        { id: 'cr1', name: '신성화', desc: '신성화 효과: 생명력 재생 +1.5%, 생명력 재생 속도 +40%', req: null },
        { id: 'cr2', name: '천뢰 교리', desc: '화염/냉기 피해 증가를 번개에도 100% 적용, 번개 피해가 번개 저항 무시, 번개에는 저항 관통 미적용', req: null },
        { id: 'cr3', name: '신성한 검', desc: '무기를 신성한 검으로 간주(무기 옵션 무효), ES 100당 번개 기본 피해 +(플레이어 레벨 x1)', req: null },
        { id: 'cr4', name: '전하 보루', desc: '받는 화염/냉기/카오스 피해의 30%를 번개로 전환, 최대 번개 저항 +3%', req: 'cr1' },
        { id: 'cr5', name: '이중 재생', desc: '생명력 재생이 ES에도 적용, 생명력 재생 +3%, 최대 생명력 +10%, 방어도/ES +30%', req: 'cr2' },
        { id: 'cr6', name: '천벌 단죄', desc: '번개 피해의 최종 최대 피해 보정 1.5배', req: 'cr3' },
        { id: 'cr7', name: '상호 전환', desc: '총 방어도의 50%를 ES로, 총 ES의 50%를 방어도로 전환, ES 재충전 시작 50% 가속', reqAny: ['cr4', 'cr5'] },
        { id: 'cr8', name: '번개 불사', desc: 'ES 0 시 4초간 ES 100% 재생, 동안 번개 피해 +50% (쿨 4초, 중첩불가)', req: 'cr7' },
        { id: 'cr9', name: '축복받은 무구', desc: '신성한 검 상태에서도 무기의 효과가 무효화되지 않음', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],

    guardian: [
        { id: 'gd1', name: '요새의 맹세', desc: '방어도 10% 증폭, 방어도의 10%만큼 일반 피해 증가', req: null },
        { id: 'gd2', name: '생명 성채', desc: '최대 생명력 20% 증폭', req: null },
        { id: 'gd3', name: '수호 재생', desc: '생명력 재생 회복 속도 20% 증가, 에너지 보호막 재생 속도 20% 감폭', req: null },
        { id: 'gd4', name: '철벽 전환', desc: '회피/에너지 보호막 0, 그 합의 60%를 방어도로 전환', req: 'gd1' },
        { id: 'gd5', name: '불침 보루', desc: '받는 최종 피해 15% 감폭, 주는 피해 12% 감폭', req: 'gd2' },
        { id: 'gd6', name: '인내 장전', desc: '피격 시 4초간 방어도 +11% (최대 5중첩, 곱연산), 5중첩 소모 반사 피해 후 2중첩 유지', req: 'gd3' },
        { id: 'gd7', name: '최후 저지선', desc: '생명력 40% 이하 시 받는 피해 20% 감폭/주는 피해 20% 증폭, 상태이상 제거(쿨 5초)', reqAny: ['gd4', 'gd5'] },
        { id: 'gd8', name: '절대 수호', desc: '피해를 막아내 무효로 할 확률 25%, 모든 상태 이상 저항 확률 +50%', req: 'gd7' },
        { id: 'gd9', name: '거대화', desc: '최대 생명력 20% 증폭', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ],
    inquisitor: [
        { id: 'iq1', name: '교리 집행', desc: '원소 피해가 현재 사용 중인 총 공명력의 50%만큼 증폭', req: null },
        { id: 'iq2', name: '심판 렌즈', desc: '치명타 피해 배율 +75%, 치명타 확률 -8%p', req: null },
        { id: 'iq3', name: '성서 확장', desc: '보조 젬 한도 +1, 공명력 +10, 봉인된 젬 4개당 공명력 1 증가, 공격 속도 6% 감폭', req: null },
        { id: 'iq4', name: '순백 판결', desc: '적 원소 저항을 0으로 간주 (원소 관통 적용)', req: 'iq1' },
        { id: 'iq5', name: '계시 관통', desc: '저항 관통 +20%, 물리 피해 없음', req: 'iq2' },
        { id: 'iq6', name: '신성한 희생', desc: '모든 원소/보조 젬 레벨 +1, 공명력 25당 보조 젬 한도 +1, 최대 생명력 -25%', req: 'iq3' },
        { id: 'iq7', name: '이단 심문', desc: '사용 중인 공명력에 따라 치명타 피해 배율 증가', reqAny: ['iq4', 'iq5'] },
        { id: 'iq8', name: '절대 교리', desc: '저항 관통이 원소 피해 증가에도 적용', req: 'iq7' },
        { id: 'iq9', name: '무한한 권능', desc: '보조 젬 한도 무제한. 보조 젬 한도 +1당 공명력 +15', fifthJobOnly: true /* 5차 전직(재능 개화) 외 다른 선행 키스톤 조건 없음 */ }
    ]
};

const SEASON_NODES = {
    s_root: { name: '시작의 축복', desc: '경험치 +20%', stat: 'expGain', val: 20, req: null },
    s_dmg: { name: '전사의 혼', desc: '피해 +30%', stat: 'pctDmg', val: 30, req: 's_root' },
    s_hp: { name: '거인의 혼', desc: '생명력 +30%', stat: 'pctHp', val: 30, req: 's_root' },
    s_crit: { name: '정밀 타격', desc: '치명타 +10%', stat: 'crit', val: 10, req: 's_dmg' },
    s_dot: { name: '부패 확장', desc: '지속 피해 배율 +12%', stat: 'dotPctDmg', val: 12, req: 's_dmg' },
    s_leech: { name: '질주의 피', desc: '이동 속도 +8%', stat: 'move', val: 8, req: 's_hp' },
    s_guard: { name: '철벽 맥', desc: '물리 피해 감소 +8%', stat: 'dr', val: 8, req: 's_hp' },
    s_speed: { name: '가속 박동', desc: '공격 속도 +8%', stat: 'aspd', val: 8, req: 's_dmg' },
    s_rend: { name: '갑주 균열', desc: '물리 피해 감소 무시 +5%', stat: 'physIgnore', val: 5, req: 's_crit' },
    s_breach: { name: '저항 균열', desc: '저항 관통 +5%', stat: 'resPen', val: 5, req: 's_crit' },
    s_momentum: { name: '전투 탄성', desc: '연속 타격 +10%', stat: 'ds', val: 10, req: ['s_speed', 's_leech'] },
    s_focus: { name: '살의 응축', desc: '치명타 피해 +35%', stat: 'critDmg', val: 35, req: ['s_speed', 's_leech'] },
    s_vital: { name: '생명의 잔향', desc: '최대 생명력 +80', stat: 'flatHp', val: 80, req: 's_guard' },
    s_blood: { name: '혈류 순환', desc: '초당 재생 +1.2%', stat: 'regen', val: 1.2, req: 's_guard' },
    s_skirmish: { name: '기동 사수', desc: '투사체 피해 +22%', stat: 'projectilePctDmg', val: 22, req: 's_leech' },
    s_fury: { name: '난전 갈증', desc: '근접 피해 +22%', stat: 'meleePctDmg', val: 22, req: 's_leech' },
    s_bruise: { name: '골절 충격', desc: '물리 피해 +24%', stat: 'physPctDmg', val: 24, req: 's_rend' },
    s_prism: { name: '분광 붕괴', desc: '원소 피해 +24%', stat: 'elementalPctDmg', val: 24, req: 's_breach' },
    s_ruin: { name: '공허 침식', desc: '카오스 피해 +24%', stat: 'chaosPctDmg', val: 24, req: 's_breach' },
    s_king: { name: '군주의 압제', desc: '물리 피해 감소 무시 +10%', stat: 'physIgnore', val: 10, req: ['s_fury', 's_bruise'] },
    s_cataclysm: { name: '대균열의 끝', desc: '저항 관통 +10%', stat: 'resPen', val: 10, req: ['s_prism', 's_ruin'] },
    s_floor: { name: '확정 타격', desc: '최소 피해 보정 +8%', stat: 'minDmgRoll', val: 8, req: 's_focus' },
    s_ceil: { name: '극한 상한', desc: '최대 피해 보정 +8%', stat: 'maxDmgRoll', val: 8, req: 's_cataclysm' }
};
const SEASON_NODE_ROWS = [
    ['s_root'],
    ['s_dmg', 's_hp'],
    ['s_crit', 's_dot', 's_speed'],
    ['s_guard', 's_leech'],
    ['s_rend', 's_breach', 's_momentum', 's_focus'],
    ['s_vital', 's_blood', 's_skirmish', 's_fury'],
    ['s_bruise', 's_prism', 's_ruin'],
    ['s_king', 's_cataclysm'],
    ['s_floor', 's_ceil']
];

const JEWEL_INVENTORY_LIMIT = 40;
const JEWEL_RARITY_ORDER = ['normal', 'magic', 'rare', 'unique'];






const P_STATS = {
    flatHp: { name: '최대 생명력', tiers: [1, 2], s: 15, m: 45 },
    pctHp: { name: '생명력(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    regen: { name: '초당 재생(%)', tiers: [1, 2], s: 0.1, m: 0.3, isPct: true },
    regenSuppress: { name: '재생 억제(%)', tiers: [3], k: 0.5, isPct: true },
    flatDmg: { name: '기본 피해', tiers: [1, 2], s: 2, m: 8 },
    pctDmg: { name: '피해(%)', tiers: [2, 3], m: 5, k: 15, isPct: true },
    meleePctDmg: { name: '근접 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    slamPctDmg: { name: '강타 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    projectilePctDmg: { name: '투사체 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    physPctDmg: { name: '물리 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    elementalPctDmg: { name: '원소 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    firePctDmg: { name: '화염 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    coldPctDmg: { name: '냉기 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    lightPctDmg: { name: '번개 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    chaosPctDmg: { name: '카오스 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    aoePctDmg: { name: '범위 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    dotPctDmg: { name: '지속 피해 배율(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    igniteChance: { name: '점화 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    chillChance: { name: '냉각 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    freezeChance: { name: '동결 확률(%)', tiers: [2, 3], m: 5, k: 10, isPct: true },
    shockChance: { name: '감전 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    poisonChance: { name: '중독 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    bleedChance: { name: '출혈 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    spellFlatDmg: { name: '주문 내장 피해', tiers: [1, 2, 3], s: 5, m: 12, k: 22 },
    spellFlatPct: { name: '주문 내장 피해 증가(%)', tiers: [2, 3], m: 6, k: 14, isPct: true },
    projectileExtraShots: { name: '투사체 추가 발사', tiers: [2, 3], m: 1, k: 3 },
    aspd: { name: '공격 속도(%)', tiers: [1, 2, 3], s: 1.5, m: 4, k: 8, isPct: true },
    move: { name: '이동 속도(%)', tiers: [1, 2], s: 1.5, m: 4, isPct: true },
    crit: { name: '치명타 확률(%)', tiers: [2, 3], m: 1.5, k: 4, isPct: true },
    critDmg: { name: '치명타 피해 배율(%)', tiers: [3], s: 12.5, m: 12.5, k: 25, isPct: true },
    leech: { name: '생명력 흡수(%)', tiers: [2, 3], m: 0.3, k: 1.0, isPct: true },
    leechRateCap: { name: '흡혈 회복 속도 캡(%)', tiers: [2, 3], m: 0.4, k: 1.0, isPct: true },
    leechTotalCap: { name: '흡혈 총 회복량 캡(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    leechInstanceCap: { name: '흡혈 타격당 회복량 캡(%)', tiers: [2, 3], m: 1, k: 3, isPct: true },
    gemLevel: { name: '스킬 젬 레벨', tiers: [3], k: 1 },
    elementalGemLevel: { name: '원소 스킬 젬 레벨', tiers: [3], k: 1 },
    fireGemLevel: { name: '화염 스킬 젬 레벨', tiers: [3], k: 1 },
    coldGemLevel: { name: '냉기 스킬 젬 레벨', tiers: [3], k: 1 },
    lightGemLevel: { name: '번개 스킬 젬 레벨', tiers: [3], k: 1 },
    chaosGemLevel: { name: '카오스 스킬 젬 레벨', tiers: [3], k: 1 },
    physGemLevel: { name: '물리 스킬 젬 레벨', tiers: [3], k: 1 },
    projectileGemLevel: { name: '투사체 스킬 젬 레벨', tiers: [3], k: 1 },
    meleeGemLevel: { name: '근접 스킬 젬 레벨', tiers: [3], k: 1 },
    slamGemLevel: { name: '강타 스킬 젬 레벨', tiers: [3], k: 1 },
    spellGemLevel: { name: '주문 스킬 젬 레벨', tiers: [3], k: 1 },
    blockChance: { name: '막기 확률(+%p)', tiers: [2, 3], m: 1, k: 4, isPct: true },
    blockChancePct: { name: '막기 확률(%) 증가', tiers: [2, 3], m: 12, k: 36, isPct: true },
    baseBlockChance: { name: '베이스 막기 확률(+%p)', tiers: [3], k: 1, isPct: true },
    maxResChaos: { name: '최대 카오스 저항(%)', tiers: [3], k: 1, isPct: true },
    maxResAll: { name: '모든 원소 최대 저항(%)', tiers: [3], k: 1, isPct: true },
    dotGemLevel: { name: '지속 피해 스킬 젬 레벨', tiers: [3], k: 1 },
    aoeGemLevel: { name: '범위 스킬 젬 레벨', tiers: [3], k: 1 },
    dr: { name: '물리 피해 감소(%)', tiers: [3], k: 4, isPct: true },
    armor: { name: '방어도', tiers: [1, 2, 3], s: 12, m: 28, k: 56 },
    evasion: { name: '회피', tiers: [1, 2, 3], s: 12, m: 28, k: 56 },
    energyShield: { name: '에너지 보호막', tiers: [1, 2, 3], s: 10, m: 24, k: 48 },
    armorPct: { name: '방어도(%)', tiers: [2, 3], m: 5, k: 12, isPct: true },
    evasionPct: { name: '회피(%)', tiers: [2, 3], m: 5, k: 12, isPct: true },
    deflectChance: { name: '비껴내기 확률(%)', tiers: [1, 2, 3], s: 4, m: 6, k: 8, isPct: true },
    deflectMajor: { name: '비껴내기 확률 + 피해 감소', tiers: [3], k: 6, isPct: true },
    deflectDamageReduce: { name: '비껴내기 피해 감소(%)', tiers: [3], k: 3, isPct: true },
    ailResIgnite: { name: '점화 저항 확률(%)', tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResShock: { name: '감전 저항 확률(%)', tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResFreeze: { name: '냉기 저항 확률(%)', tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResPoison: { name: '중독 저항 확률(%)', tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResBleed: { name: '출혈 저항 확률(%)', tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    energyShieldPct: { name: '에너지 보호막(%)', tiers: [2, 3], m: 5, k: 12, isPct: true },
    energyShieldRegen: { name: '에너지 보호막 회복속도(%)', tiers: [3], k: 8, isPct: true },
    moveEvasion: { name: '이동 속도 + 회피(%)', tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    hpArmor: { name: '생명력 + 방어도', tiers: [1, 2, 3], s: 18, m: 48, k: 96 },
    aspdMove: { name: '공격 속도 + 이동 속도(%)', tiers: [1, 2, 3], s: 2, m: 5, k: 9, isPct: true },
    chaosResElemPenalty: { name: '카오스 저항 + 모든 원소 저항 감소(%)', tiers: [2, 3], m: 6, k: 12, isPct: true },
    maxResF: { name: '최대 화염 저항(%)', tiers: [3], k: 1, isPct: true },
    maxResC: { name: '최대 냉기 저항(%)', tiers: [3], k: 1, isPct: true },
    maxResL: { name: '최대 번개 저항(%)', tiers: [3], k: 1, isPct: true },
    physIgnore: { name: '물리 피해 감소 무시(%)', tiers: [2, 3], m: 3, k: 6, isPct: true },
    slamEchoChance: { name: '강타 여진 발생 확률(%)', tiers: [3], k: 8, isPct: true },
    ds: { name: '연속 타격(%)', tiers: [3], k: 8, isPct: true },
    suppCap: { name: '보조 스킬 젬 한도', tiers: [3], k: 1 },
    resPen: { name: '저항 관통(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    resF: { name: '화염 저항(%)', tiers: [2], m: 5, isPct: true },
    resC: { name: '냉기 저항(%)', tiers: [2], m: 5, isPct: true },
    resL: { name: '번개 저항(%)', tiers: [2], m: 5, isPct: true },
    resAll: { name: '모든 원소 저항(%)', tiers: [3], k: 4, isPct: true },
    resChaos: { name: '카오스 저항(%)', tiers: [3], k: 4, isPct: true },
    expGain: { name: '경험치 획득(%)', tiers: [2, 3], m: 5, k: 12, isPct: true },
    minDmgRoll: { name: '최소 피해 보정(%)', tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true },
    maxDmgRoll: { name: '최대 피해 보정(%)', tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true },
    summonFlatDmg: { name: '소환수 기본 피해', tiers: [1, 2, 3], s: 3, m: 7, k: 14 },
    summonPctDmg: { name: '소환수 피해(%)', tiers: [1, 2, 3], s: 5, m: 10, k: 18, isPct: true },
    summonAspd: { name: '소환수 공격 속도(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 14, isPct: true },
    summonHpPct: { name: '소환수 생명력(%)', tiers: [1, 2, 3], s: 4, m: 9, k: 16, isPct: true },
    summonCrit: { name: '소환수 치명타 확률(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    summonCritDmg: { name: '소환수 치명타 피해 배율(%)', tiers: [2, 3], m: 6, k: 15, isPct: true },
    summonCap: { name: '소환수 최대 한도', tiers: [3], k: 1 },
    summonEfficiency: { name: '소환수 효율(%)', tiers: [2, 3], m: 4, k: 10, isPct: true },
    summonGuardRedirectPct: { name: '방어형 소환수 피해 대리(%)', tiers: [3], k: 4, isPct: true },
    summonResPen: { name: '소환수 저항 관통(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    summonGemLevel: { name: '소환수 공격 스킬 젬 레벨', tiers: [3], k: 1 },
    igniteDamageMultiplierPct: { name: '점화 피해 증가(%)', tiers: [2, 3], m: 4, k: 10, isPct: true },
    poisonDamageMultiplierPct: { name: '중독 피해 증가(%)', tiers: [2, 3], m: 4, k: 10, isPct: true }
};

Object.keys(SKILL_DB).forEach(name => {
    let skill = SKILL_DB[name];
    if (!skill || !skill.isGem) return;
    if (Number.isFinite(skill.baseDmg)) skill.baseDmg = Number((skill.baseDmg * 1.62).toFixed(3));
    if (Number.isFinite(skill.dmgScale) && skill.dmgScale > 0) skill.dmgScale = Number((skill.dmgScale * 1.9).toFixed(4));
});

const SUPPORT_GEM_DB = {
    '가속': { baseVal: 1, scale: 0.5, stat: 'aspd', name: '공격 속도', isPct: true, resonanceCosts: [6, 12, 21], desc: '공격 속도를 올립니다.' },
    '가벼운 발걸음': { baseVal: 1, scale: 1.0, stat: 'move', name: '이동 속도', isPct: true, resonanceCosts: [3, 9, 18], desc: '맵 진행 속도를 높입니다.' },
    '날카로움': { baseVal: 0.2, scale: 0.3, stat: 'crit', name: '치명타 확률', isPct: true, resonanceCosts: [6, 12, 21], desc: '치명타 확률을 올립니다.' },
    '근접 물리 피해': { baseVal: 5, scale: 2.0, stat: 'meleePctDmg', name: '근접 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '근접 태그가 달린 스킬의 피해를 높입니다.' },
    '투사체 강화': { baseVal: 5, scale: 2.0, stat: 'projectilePctDmg', name: '투사체 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '투사체 태그 스킬을 강화합니다.' },
    '원소 집중': { baseVal: 5, scale: 2.0, stat: 'elementalPctDmg', name: '원소 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '원소 태그 스킬을 강화합니다.' },
    '화염 주입': { baseVal: 5, scale: 2.0, stat: 'firePctDmg', name: '화염 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '화염 스킬의 피해를 높입니다.' },
    '냉기 증폭': { baseVal: 5, scale: 2.0, stat: 'coldPctDmg', name: '냉기 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '냉기 스킬의 피해를 높입니다.' },
    '번개 전도': { baseVal: 5, scale: 2.0, stat: 'lightPctDmg', name: '번개 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '번개 스킬의 피해를 높입니다.' },
    '혼돈 전환': { baseVal: 5, scale: 2.0, stat: 'chaosPctDmg', name: '카오스 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '카오스 스킬의 피해를 높입니다.' },
    '범위 확장': { baseVal: 5, scale: 2.0, stat: 'aoePctDmg', name: '범위 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '범위 태그 스킬의 피해를 높입니다.' },
    '지속 확산': { baseVal: 6, scale: 2.2, stat: 'dotPctDmg', name: '지속 피해 배율', isPct: true, resonanceCosts: [6, 12, 21], desc: 'dot 태그 스킬의 지속 피해 배율을 올립니다.' },
    '무자비': { baseVal: 10, scale: 3.0, stat: 'critDmg', name: '치명타 피해', isPct: true, resonanceCosts: [9, 21, 33], desc: '치명타 배율을 높입니다.' },
    '생명력 흡수': { baseVal: 0.5, scale: 0.1, stat: 'leech', name: '생명력 흡수', isPct: true, resonanceCosts: [3, 9, 18], desc: '공격 시 흡혈을 부여합니다.' },
    '연속타격': { baseVal: 5, scale: 1.0, stat: 'ds', name: '연속 타격 확률', isPct: true, resonanceCosts: [9, 21, 33], desc: '한 번 더 타격할 확률을 부여합니다.' },
    '방어 상승': { baseVal: 2, scale: 0.5, stat: 'dr', name: '물리 피해 감소', isPct: true, resonanceCosts: [3, 9, 18], desc: '물리 피해 감소를 올립니다.' },
    '갑주 파쇄': { baseVal: 3, scale: 0.8, stat: 'physIgnore', name: '물피감 무시', isPct: true, resonanceCosts: [9, 21, 33], desc: '물리 공격이 적의 물리 피해 감소를 더 깊게 파고듭니다.' },
    '저항 침식': { baseVal: 3, scale: 0.8, stat: 'resPen', name: '저항 관통', isPct: true, resonanceCosts: [9, 21, 33], desc: '원소/카오스 공격이 적의 저항을 꿰뚫습니다.' },
    '활력': { baseVal: 0.2, scale: 0.1, stat: 'regen', name: '초당 생명력 재생', isPct: true, resonanceCosts: [3, 9, 18], desc: '초당 생명력 재생을 제공합니다.' },
    '재생 억제': { baseVal: 0.1, scale: 0.03, stat: 'regenSuppress', name: '재생 억제', isPct: true, resonanceCosts: [3, 9, 18], desc: '공격 시 적의 생명력 재생을 해당 수치(%)만큼 감소시킵니다.' },
    '정밀 하한': { baseVal: 2, scale: 0.8, stat: 'minDmgRoll', name: '최소 피해 보정', isPct: true, resonanceCosts: [3, 9, 18], desc: '무기 피해 하한을 올려 딜 편차를 줄입니다.' },
    '과충전 상한': { baseVal: 2, scale: 0.8, stat: 'maxDmgRoll', name: '최대 피해 보정', isPct: true, resonanceCosts: [3, 9, 18], desc: '무기 피해 상한을 올려 고점 피해를 확장합니다.' },
    '화염 장막': { baseVal: 4, scale: 1.2, stat: 'resF', name: '화염 저항', isPct: true, resonanceCosts: [3, 9, 18], desc: '화염 저항을 강화합니다.' },
    '냉기 장막': { baseVal: 4, scale: 1.2, stat: 'resC', name: '냉기 저항', isPct: true, resonanceCosts: [3, 9, 18], desc: '냉기 저항을 강화합니다.' },
    '번개 장막': { baseVal: 4, scale: 1.2, stat: 'resL', name: '번개 저항', isPct: true, resonanceCosts: [3, 9, 18], desc: '번개 저항을 강화합니다.' },
    '공허 장막': { baseVal: 3, scale: 1.0, stat: 'resChaos', name: '카오스 저항', isPct: true, resonanceCosts: [3, 9, 18], desc: '카오스 저항을 강화합니다.' },
    '물리 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '물리 플랫 피해', isPct: false, resonanceCosts: [9, 21, 33], desc: '물리 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '화염 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '화염 플랫 피해', isPct: false, resonanceCosts: [9, 21, 33], desc: '화염 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '냉기 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '냉기 플랫 피해', isPct: false, resonanceCosts: [9, 21, 33], desc: '냉기 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '번개 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '번개 플랫 피해', isPct: false, resonanceCosts: [9, 21, 33], desc: '번개 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '카오스 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '카오스 플랫 피해', isPct: false, resonanceCosts: [9, 21, 33], desc: '카오스 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '사역 피해 증폭': { baseVal: 6, scale: 2.4, stat: 'summonPctDmg', name: '소환수 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '소환수의 공격 피해를 높입니다.' },
    '사역 가속': { baseVal: 4, scale: 1.6, stat: 'summonAspd', name: '소환수 공격 속도', isPct: true, resonanceCosts: [6, 12, 21], desc: '소환수의 공격 속도를 높입니다.' },
    '사역 예리함': { baseVal: 1, scale: 0.45, stat: 'summonCrit', name: '소환수 치명타 확률', isPct: true, resonanceCosts: [6, 12, 21], desc: '소환수의 치명타 확률을 올립니다.' },
    '사역 무자비': { baseVal: 12, scale: 4.0, stat: 'summonCritDmg', name: '소환수 치명타 피해 배율', isPct: true, resonanceCosts: [9, 21, 33], desc: '소환수의 치명타 피해 배율을 올립니다.' },
    '사역 생명력': { baseVal: 8, scale: 2.8, stat: 'summonHpPct', name: '소환수 생명력', isPct: true, resonanceCosts: [3, 9, 18], desc: '소환수의 최대 생명력을 높입니다.' },
    '수액 골렘 소환': { baseVal: 25, scale: 0, stat: 'summonGuardRedirectPct', name: '방어형 소환수 피해 대리', isPct: true, noTiers: true, tierMul: 1.4, resonanceCosts: [9], desc: '방어형 소환수 보조 젬. 하급/중급/상급 구분이 없는 통합형 보조 젬입니다. 장착 시 수액 골렘을 소환하고, 살아있는 동안 플레이어가 받을 최종 히트 피해의 일부를 대신 받습니다. 지속 피해는 기본적으로 대리하지 않습니다.', tags: ['summon', 'summon_guard', 'physical'] }
};

const MOD_DB = [
    { id: 'flatDmg', type: 'prefix', statName: '기본 피해', slots: ['무기', '반지', '목걸이', '허리띠', '장갑'], base: 3, step: 3 },
    { id: 'weaponFlatDmgPct', type: 'prefix', statName: '무기의 기본 피해 증가(%)', slots: ['무기'], base: 6, step: 4 },
    { id: 'pctDmg', type: 'prefix', statName: '피해 증가(%)', slots: ['무기', '반지', '목걸이'], base: 5, step: 4 },
    { id: 'meleePctDmg', type: 'prefix', statName: '근접 피해(%)', slots: ['무기', '장갑', '목걸이', '허리띠'], base: 5, step: 4 },
    { id: 'projectilePctDmg', type: 'prefix', statName: '투사체 피해(%)', slots: ['무기', '반지', '장갑', '목걸이'], base: 5, step: 4 },
    { id: 'physPctDmg', type: 'prefix', statName: '물리 피해(%)', slots: ['무기', '허리띠', '반지', '방패'], base: 5, step: 4 },
    { id: 'elementalPctDmg', type: 'prefix', statName: '원소 피해(%)', slots: ['무기', '반지', '목걸이'], base: 5, step: 4 },
    { id: 'firePctDmg', type: 'prefix', statName: '화염 피해(%)', slots: ['무기', '반지', '목걸이', '방패'], base: 4, step: 3 },
    { id: 'coldPctDmg', type: 'prefix', statName: '냉기 피해(%)', slots: ['무기', '반지', '목걸이', '방패'], base: 4, step: 3 },
    { id: 'lightPctDmg', type: 'prefix', statName: '번개 피해(%)', slots: ['무기', '반지', '목걸이', '방패'], base: 4, step: 3 },
    { id: 'chaosPctDmg', type: 'prefix', statName: '카오스 피해(%)', slots: ['무기', '반지', '목걸이', '장갑', '방패'], base: 4, step: 3 },
    { id: 'aoePctDmg', type: 'prefix', statName: '범위 피해(%)', slots: ['무기', '투구', '목걸이', '갑옷'], base: 4, step: 3 },
    { id: 'dotPctDmg', type: 'prefix', statName: '지속 피해 배율(%)', slots: ['무기', '반지', '목걸이'], base: 4, step: 3 },
    { id: 'summonFlatDmg', type: 'prefix', statName: '소환수 기본 피해', slots: ['무기'], base: 4, step: 4 },
    { id: 'summonPctDmg', type: 'prefix', statName: '소환수 피해(%)', slots: ['무기', '반지'], base: 6, step: 4 },
    { id: 'summonHpPct', type: 'prefix', statName: '소환수 생명력(%)', slots: ['무기', '반지'], base: 6, step: 4 },
    { id: 'summonAspd', type: 'suffix', statName: '소환수 공격 속도(%)', slots: ['무기'], base: 3, step: 2 },
    { id: 'summonCrit', type: 'suffix', statName: '소환수 치명타 확률(%)', slots: ['무기', '반지'], base: 1, step: 1 },
    { id: 'summonCritDmg', type: 'suffix', statName: '소환수 치명타 피해 배율(%)', slots: ['무기', '반지'], base: 8, step: 4 },
    { id: 'summonEfficiency', type: 'suffix', statName: '소환수 효율(%)', slots: ['무기', '반지'], base: 4, step: 3 },
    { id: 'summonCap', type: 'special', statName: '소환수 최대 한도', slots: ['반지'], base: 1, step: 0, weight: 0.35 },
    { id: 'summonResPen', type: 'suffix', statName: '소환수 저항 관통(%)', slots: ['무기'], base: 2, step: 2, weight: 0.7 },
    { id: 'summonWeaponGemLevel', statId: 'summonGemLevel', type: 'special', statName: '소환수 공격 스킬 젬 레벨', slots: ['무기'], tierValues: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], weight: 0.15 },
    { id: 'summonRingGemLevel', statId: 'summonGemLevel', type: 'special', statName: '소환수 공격 스킬 젬 레벨', slots: ['반지'], tierValues: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], weight: 0.15 },
    { id: 'spellFlatDmg', type: 'prefix', statName: '주문 내장 피해', slots: ['무기', '목걸이'], base: 8, step: 6 },
    { id: 'spellFlatPct', type: 'suffix', statName: '주문 내장 피해 증가(%)', slots: ['무기', '목걸이', '방패'], base: 6, step: 4 },
    { id: 'flatHp', type: 'prefix', statName: '최대 생명력', slots: ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'], base: 15, step: 10 },
    { id: 'armor', type: 'prefix', statName: '방어도', slots: ['투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'], base: 12, step: 10 },
    { id: 'evasion', type: 'prefix', statName: '회피', slots: ['투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'], base: 12, step: 10 },
    { id: 'energyShield', type: 'prefix', statName: '에너지 보호막', slots: ['투구', '갑옷', '장갑', '신발', '방패'], base: 9, step: 8 },
    { id: 'armorPct', type: 'suffix', statName: '방어도 증가(%)', slots: ['투구', '갑옷', '장갑', '신발', '방패'], base: 6, step: 4 },
    { id: 'evasionPct', type: 'suffix', statName: '회피 증가(%)', slots: ['투구', '갑옷', '장갑', '신발', '방패'], base: 6, step: 4 },
    { id: 'deflectChance', type: 'suffix', statName: '비껴내기 확률(%)', slots: ['투구', '갑옷', '장갑', '신발', '방패'], base: 1, step: 1 },
    { id: 'energyShieldPct', type: 'suffix', statName: '에너지 보호막 증가(%)', slots: ['투구', '갑옷', '장갑', '신발', '방패'], base: 6, step: 4 },
    { id: 'pctHp', type: 'suffix', statName: '생명력 증가(%)', slots: ['갑옷', '허리띠'], base: 4, step: 3 },
    { id: 'aspd', type: 'suffix', statName: '공격 속도(%)', slots: ['무기', '반지', '목걸이', '허리띠', '장갑'], base: 2, step: 2 },
    { id: 'crit', type: 'suffix', statName: '치명타 확률(%)', slots: ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'], base: 0.5, step: 0.5 },
    { id: 'move', type: 'suffix', statName: '이동 속도(%)', slots: ['신발'], base: 4, step: 2 },
    { id: 'gemLevel', type: 'special', statName: '모든 스킬 젬 레벨', slots: ['목걸이'], base: 1, step: 0 },
    { id: 'physIgnore', type: 'suffix', statName: '물리 피해 감소 무시(%)', slots: ['무기', '장갑', '목걸이'], base: 1, step: 0.9 },
    { id: 'resF', type: 'suffix', statName: '화염 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠', '방패'], base: 5, step: 3 },
    { id: 'resC', type: 'suffix', statName: '냉기 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠', '방패'], base: 5, step: 3 },
    { id: 'resL', type: 'suffix', statName: '번개 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠', '방패'], base: 5, step: 3 },
    { id: 'resAll', type: 'suffix', statName: '모든 원소 저항(%)', slots: ['반지', '목걸이', '갑옷', '방패'], base: 3, step: 2 },
    { id: 'resChaos', type: 'suffix', statName: '카오스 저항(%)', slots: ['반지', '방패'], base: 2, step: 1.4 },
    { id: 'resPen', type: 'suffix', statName: '저항 관통(%)', slots: ['무기', '반지', '목걸이'], base: 0, step: 0.8 },
    { id: 'regen', type: 'suffix', statName: '초당 재생(%)', slots: ['갑옷', '허리띠', '목걸이', '방패'], base: 0.2, step: 0.1 },
    { id: 'regenFlat', type: 'suffix', statName: '생명력 재생(고정)', slots: ['갑옷', '목걸이', '반지', '허리띠', '방패'], base: 20, step: 12 },
    { id: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['허리띠'], base: 0.3, step: 0.06 },
    { id: 'regenSuppressGloves', statId: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['장갑'], base: 0.05, step: 0.07 },
    { id: 'regenSuppressAmulet', statId: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['목걸이'], base: 0.1, step: 0 },
    { id: 'targetAny', type: 'special', statName: '스킬 타겟 수', slots: ['장갑'], base: 1, step: 0, weight: 0.45 },
    { id: 'targetProjectile', type: 'special', statName: '투사체 스킬 타겟 수', slots: ['무기'], base: 1, step: 0, weight: 0.45 },
    { id: 'projectileExtraShots', type: 'special', statName: '투사체 추가 발사', slots: ['무기'], base: 1, step: 1, weight: 0.4 },
    { id: 'targetSlam', type: 'special', statName: '강타 스킬 타겟 수', slots: ['무기'], base: 1, step: 0, weight: 0.45 },
    { id: 'leech', type: 'suffix', statName: '생명력 흡수(%)', slots: ['무기', '장갑', '반지'], base: 0.08, step: 0.08 },
    { id: 'leechRateCap', type: 'suffix', statName: '흡혈 회복 속도 캡(%)', slots: ['무기', '장갑', '목걸이'], base: 0.4, step: 0.2 },
    { id: 'leechTotalCap', type: 'suffix', statName: '흡혈 총 회복량 캡(%)', slots: ['갑옷', '허리띠', '목걸이'], base: 2, step: 1 },
    { id: 'leechInstanceCap', type: 'suffix', statName: '흡혈 타격당 회복량 캡(%)', slots: ['무기', '반지', '장갑'], base: 1, step: 0.5 },
    { id: 'dr', type: 'suffix', statName: '물리 피해 감소(%)', slots: ['갑옷', '허리띠', '투구'], base: 2, step: 2 },
    { id: 'critDmg', type: 'suffix', statName: '치명타 피해 배율(%)', slots: ['무기', '목걸이', '투구'], base: 10, step: 6 },
    { id: 'ds', type: 'suffix', statName: '연속 타격(%)', slots: ['장갑', '무기'], base: 5, step: 3 },
    { id: 'minDmgRollWeapon', statId: 'minDmgRoll', type: 'suffix', statName: '최소 피해 보정(%)', slots: ['무기'], base: 4, step: 2 },
    { id: 'maxDmgRollWeapon', statId: 'maxDmgRoll', type: 'suffix', statName: '최대 피해 보정(%)', slots: ['무기'], base: 4, step: 2 },
    { id: 'suppCap', type: 'special', statName: '보조 스킬 젬 한도', slots: ['목걸이'], base: 1, step: 0 },
    { id: 'shieldBlockPct', statId: 'blockChancePct', type: 'suffix', statName: '막기 확률(%) 증가', slots: ['방패'], base: 12, step: 8 },
    { id: 'shieldBlockFlat', statId: 'blockChance', type: 'suffix', statName: '막기 확률(+%p)', slots: ['방패'], base: 1, step: 0.8 },
    { id: 'shieldMaxResF', statId: 'maxResF', type: 'special', statName: '최대 화염 저항(%)', slots: ['방패'], base: 1, step: 0.3, weight: 0.35 },
    { id: 'shieldMaxResC', statId: 'maxResC', type: 'special', statName: '최대 냉기 저항(%)', slots: ['방패'], base: 1, step: 0.3, weight: 0.35 },
    { id: 'shieldMaxResL', statId: 'maxResL', type: 'special', statName: '최대 번개 저항(%)', slots: ['방패'], base: 1, step: 0.3, weight: 0.35 },
    { id: 'shieldMaxResChaos', statId: 'maxResChaos', type: 'special', statName: '최대 카오스 저항(%)', slots: ['방패'], base: 1, step: 0.15, weight: 0.25 },
    { id: 'shieldMaxResAll', statId: 'maxResAll', type: 'special', statName: '모든 원소 최대 저항(%)', slots: ['방패'], tierValues: [[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,2]], weight: 0.15 },
    { id: 'shieldSpellGemLevel', statId: 'spellGemLevel', type: 'special', statName: '모든 주문 스킬 젬 레벨', slots: ['방패'], base: 1, step: 0.7, weight: 0.3 }
];

const FOSSIL_DB = [
    { key: 'fossilJagged', name: '톱니 화석', desc: '카오스 재련 + 물리/근접 계열 옵션 1개 확정', guaranteedStats: ['physPctDmg', 'meleePctDmg', 'flatDmg', 'physIgnore'] },
    { key: 'fossilBound', name: '속박 화석', desc: '카오스 재련 + 생명/방어 계열 옵션 1개 확정', guaranteedStats: ['flatHp', 'pctHp', 'dr'] },
    { key: 'fossilGale', name: '돌풍 화석', desc: '카오스 재련 + 속도/치명 계열 옵션 1개 확정', guaranteedStats: ['aspd', 'crit', 'move'] },
    { key: 'fossilPrismatic', name: '프리즘 화석', desc: '카오스 재련 + 저항/원소 계열 옵션 1개 확정', guaranteedStats: ['resAll', 'resF', 'resC', 'resL', 'elementalPctDmg', 'resPen'] },
    { key: 'fossilAbyssal', name: '심연 화석', desc: '카오스 재련 + 카오스/흡혈/재생 계열 옵션 1개 확정', guaranteedStats: ['chaosPctDmg', 'leech', 'regen'] },
    { key: 'fossilPrimordial', name: '태고 화석', desc: '원시 고대 화석 복원 전용 + 관통/카오스 계열 옵션 1개 확정', guaranteedStats: ['physIgnore', 'resPen', 'chaosPctDmg', 'critDmg'], ancientPrimalOnly: true },
    { key: 'fossilBulwark', name: '🛡️ 방패 화석', desc: '카오스 재련 + 최대 화염/냉기/번개 저항 계열 1개 확정', guaranteedStats: ['maxResF', 'maxResC', 'maxResL'] },
    { key: 'fossilWedge', name: '🗡️ 쐐기 화석', desc: '카오스 재련 + 투사체/치명 계열 1개 확정', guaranteedStats: ['projectileExtraShots', 'projectilePctDmg', 'crit'] },
    { key: 'fossilOld', name: '📜 오래된 화석', desc: '카오스 재련 + 화석 전용 옵션 1개 확정', guaranteedStats: [] },
    { key: 'fossilRift', name: '🌀 균열 화석', desc: '카오스 재련 + 균열 표식(제거 불가) + 나머지 추가 옵션 50% 증폭', guaranteedStats: [] }
];

const FOSSIL_EXCLUSIVE_MODS = [
    { id: 'fossilVoidHeart', statId: 'chaosPctDmg', type: 'special', statName: '심연 맥동 (카오스 피해%)', slots: ['무기', '목걸이', '반지'], base: 6, step: 2.5, fixedVal: 55, fossilExclusive: true },
    { id: 'fossilWarMarch', statId: 'move', type: 'special', statName: '군단 진군 (이동 속도%)', slots: ['신발', '허리띠'], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: 'fossilSoulWard', statId: 'resAll', type: 'special', statName: '영혼 수호 (모든 원소 저항%)', slots: ['갑옷', '투구', '허리띠'], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: 'fossilGemPulse', statId: 'gemLevel', type: 'special', statName: '룬 맥동 (스킬 젬 레벨)', slots: ['목걸이'], base: 1, step: 0, fixedVal: 1, fossilExclusive: true },
    { id: 'fossilSupportLink', statId: 'suppCap', type: 'special', statName: '결속 잔향 (보조 젬 한도)', slots: ['목걸이'], base: 1, step: 0, fixedVal: 1, fossilExclusive: true },
    { id: 'fossilArmorRift', statId: 'physIgnore', type: 'special', statName: '전쟁 균열 (물피감 무시%)', slots: ['무기', '장갑', '목걸이'], base: 2, step: 0.8, fixedVal: 18.4, fossilExclusive: true },
    { id: 'fossilPrismNeedle', statId: 'resPen', type: 'special', statName: '프리즘 송곳 (저항 관통%)', slots: ['무기', '목걸이', '반지'], base: 2, step: 0.7, fixedVal: 16.6, fossilExclusive: true },
    { id: 'fossilBoundFloor', statId: 'minDmgRoll', type: 'special', statName: '결속 하한 (최소 피해 보정%)', slots: ['무기', '장갑'], base: 2, step: 0.6, fixedVal: 13.8, fossilExclusive: true },
    { id: 'fossilSkyCeil', statId: 'maxDmgRoll', type: 'special', statName: '천공 상한 (최대 피해 보정%)', slots: ['무기', '장갑'], base: 2, step: 0.6, fixedVal: 13.8, fossilExclusive: true }
];
const UNDERWORLD_RUNE_DB = [
    { no: 1, id: 'uw_rune_1', name: '초생', stat: 'flatHp', val: 30 },
    { no: 2, id: 'uw_rune_2', name: '절단', stat: 'flatDmg', val: 8 },
    { no: 3, id: 'uw_rune_3', name: '강벽', stat: 'armor', val: 30 },
    { no: 4, id: 'uw_rune_4', name: '경풍', stat: 'evasion', val: 30 },
    { no: 5, id: 'uw_rune_5', name: '영갑', stat: 'energyShield', val: 30 },
    { no: 6, id: 'uw_rune_6', name: '화관', stat: 'resF', val: 3 },
    { no: 7, id: 'uw_rune_7', name: '설관', stat: 'resC', val: 3 },
    { no: 8, id: 'uw_rune_8', name: '뢰관', stat: 'resL', val: 3 },
    { no: 9, id: 'uw_rune_9', name: '공식', stat: 'resChaos', val: 1.5 },
    { no: 10, id: 'uw_rune_10', name: '균결', stat: 'resAll', val: 1 },
    { no: 11, id: 'uw_rune_11', name: '혈전', stat: 'physPctDmg', val: 12 },
    { no: 12, id: 'uw_rune_12', name: '염전', stat: 'firePctDmg', val: 12 },
    { no: 13, id: 'uw_rune_13', name: '빙전', stat: 'coldPctDmg', val: 12 },
    { no: 14, id: 'uw_rune_14', name: '뢰전', stat: 'lightPctDmg', val: 12 },
    { no: 15, id: 'uw_rune_15', name: '허전', stat: 'chaosPctDmg', val: 12 },
    { no: 16, id: 'uw_rune_16', name: '비화', stat: 'corpseExplodeChance', val: 5 },
    { no: 17, id: 'uw_rune_17', name: '분화', stat: 'corpseExplodeLifePct', val: 8 },
    { no: 18, id: 'uw_rune_18', name: '극염', stat: 'maxResF', val: 1 },
    { no: 19, id: 'uw_rune_19', name: '극한', stat: 'maxResC', val: 1 },
    { no: 20, id: 'uw_rune_20', name: '극뢰', stat: 'maxResL', val: 1 },
    { no: 21, id: 'uw_rune_21', name: '천공', stat: 'resPen', val: 5 },
    { no: 22, id: 'uw_rune_22', name: '심절', stat: 'physIgnore', val: 5 },
    { no: 23, id: 'uw_rune_23', name: '공율', stat: 'resonancePower', val: 10 },
    { no: 24, id: 'uw_rune_24', name: '추동', stat: 'move', val: 3 },
    { no: 25, id: 'uw_rune_25', name: '속결', stat: 'aspd', val: 3 },
    { no: 26, id: 'uw_rune_26', name: '예각', stat: 'crit', val: 1 },
    { no: 27, id: 'uw_rune_27', name: '쇄광', stat: 'critDmg', val: 3 },
    { no: 28, id: 'uw_rune_28', name: '연격', stat: 'ds', val: 2 },
    { no: 29, id: 'uw_rune_29', name: '저류', stat: 'minDmgRoll', val: 2 },
    { no: 30, id: 'uw_rune_30', name: '고조', stat: 'maxDmgRoll', val: 2 }
];

const BASE_ITEM_DB = [
    { id: 'rusted_blade', slot: '무기', name: '녹슨 검', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 4 }] },
    { id: 'apprentice_familiar_wand', slot: '무기', name: '견습 사역봉', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 5 }, { id: 'summonPctDmg', base: 10 }, { id: 'summonEfficiency', base: 4 }] },
    { id: 'hunter_axe', slot: '무기', name: '사냥꾼의 도끼', reqTier: 3, baseStats: [{ id: 'flatDmg', base: 8 }, { id: 'crit', base: 3 }] },
    { id: 'pact_familiar_wand', slot: '무기', name: '계약 사역봉', reqTier: 4, baseStats: [{ id: 'flatDmg', base: 8 }, { id: 'summonPctDmg', base: 14 }, { id: 'summonEfficiency', base: 6 }] },
    { id: 'abyss_spear', slot: '무기', name: '심연의 창', reqTier: 7, baseStats: [{ id: 'flatDmg', base: 14 }, { id: 'aspd', base: 6 }] },
    { id: 'bloodletter_blade', slot: '무기', name: '혈각 검', reqTier: 10, baseStats: [{ id: 'flatDmg', base: 21 }, { id: 'crit', base: 5 }] },
    { id: 'gale_fang_spear', slot: '무기', name: '질풍 송곳창', reqTier: 10, baseStats: [{ id: 'flatDmg', base: 22 }, { id: 'aspd', base: 8 }] },
    { id: 'executioner_blade', slot: '무기', name: '처형자의 검', reqTier: 14, baseStats: [{ id: 'flatDmg', base: 31 }, { id: 'crit', base: 8 }] },
    { id: 'tempest_pike', slot: '무기', name: '폭풍 장창', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 34 }, { id: 'aspd', base: 10 }] },
    { id: 'windlash_bow', slot: '무기', name: '돌풍 장궁', reqTier: 5, baseStats: [{ id: 'flatDmg', base: 11 }, { id: 'projectilePctDmg', base: 10 }] },
    { id: 'stormbolt_launcher', slot: '무기', name: '폭전 발사기', reqTier: 10, baseStats: [{ id: 'flatDmg', base: 22 }, { id: 'projectilePctDmg', base: 18 }, { id: 'projectileExtraShots', base: 1 }] },
    { id: 'starfall_ballista', slot: '무기', name: '유성 발리스타', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 32 }, { id: 'projectilePctDmg', base: 26 }, { id: 'projectileExtraShots', base: 2 }] },
    { id: 'needle_recurve', slot: '무기', name: '바늘 리커브', reqTier: 8, baseStats: [{ id: 'flatDmg', base: 17 }, { id: 'projectilePctDmg', base: 14 }] },
    { id: 'spiritbound_wand', slot: '무기', name: '영혼 결속봉', reqTier: 8, baseStats: [{ id: 'flatDmg', base: 13 }, { id: 'summonPctDmg', base: 22 }, { id: 'summonEfficiency', base: 10 }] },
    { id: 'seeker_railgun', slot: '무기', name: '추적 레일건', reqTier: 12, baseStats: [{ id: 'flatDmg', base: 26 }, { id: 'projectilePctDmg', base: 22 }, { id: 'projectileExtraShots', base: 2 }] },
    { id: 'tempest_volley', slot: '무기', name: '폭풍 연사궁', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 35 }, { id: 'projectilePctDmg', base: 30 }, { id: 'projectileExtraShots', base: 3 }] },
    { id: 'nova_rod', slot: '무기', name: '노바 로드', reqTier: 5, baseStats: [{ id: 'flatDmg', base: 7 }, { id: 'spellFlatDmg', base: 20 }] },
    { id: 'rift_scepter', slot: '무기', name: '균열 홀', reqTier: 10, baseStats: [{ id: 'flatDmg', base: 12 }, { id: 'spellFlatDmg', base: 38 }, { id: 'spellFlatPct', base: 12 }] },
    { id: 'void_archon_staff', slot: '무기', name: '공허 대현자 지팡이', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 18 }, { id: 'spellFlatDmg', base: 58 }, { id: 'spellFlatPct', base: 22 }] },
    { id: 'ember_wand', slot: '무기', name: '잿불 완드', reqTier: 8, baseStats: [{ id: 'flatDmg', base: 10 }, { id: 'spellFlatDmg', base: 30 }] },
    { id: 'echo_focus', slot: '무기', name: '메아리 초점봉', reqTier: 12, baseStats: [{ id: 'flatDmg', base: 14 }, { id: 'spellFlatDmg', base: 46 }, { id: 'spellFlatPct', base: 16 }] },
    { id: 'ritual_familiar_staff', slot: '무기', name: '의식 사역마 지팡이', reqTier: 12, baseStats: [{ id: 'flatDmg', base: 18 }, { id: 'summonPctDmg', base: 30 }, { id: 'summonEfficiency', base: 14 }] },
    { id: 'abyss_chant_staff', slot: '무기', name: '심연 창가 지팡이', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 20 }, { id: 'spellFlatDmg', base: 64 }, { id: 'spellFlatPct', base: 26 }] },
    { id: 'archon_familiar_staff', slot: '무기', name: '아콘 사역마 지팡이', reqTier: 16, baseStats: [{ id: 'flatDmg', base: 24 }, { id: 'summonPctDmg', base: 40 }, { id: 'summonEfficiency', base: 18 }] },
    { id: 'cloth_hood', slot: '투구', name: '천 후드', reqTier: 1, baseStats: [{ id: 'flatHp', base: 12 }, { id: 'energyShield', base: 36 }] },
    { id: 'war_helm', slot: '투구', name: '전투 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'armor', base: 105 }, { id: 'dr', base: 2 }] },
    { id: 'bastion_helm', slot: '투구', name: '보루 투구', reqTier: 8, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 170 }, { id: 'dr', base: 3 }] },
    { id: 'void_crown', slot: '투구', name: '공허 왕관', reqTier: 8, baseStats: [{ id: 'flatHp', base: 50 }, { id: 'energyShield', base: 170 }, { id: 'resChaos', base: 6 }] },
    { id: 'gilded_barbute', slot: '투구', name: '도금 바르부트', reqTier: 4, baseStats: [{ id: 'flatHp', base: 30 }, { id: 'armor', base: 58 }, { id: 'energyShield', base: 58 }] },
    { id: 'warded_sallet', slot: '투구', name: '수호 살렛', reqTier: 8, baseStats: [{ id: 'flatHp', base: 52 }, { id: 'armor', base: 94 }, { id: 'energyShield', base: 92 }] },
    { id: 'leather_vest', slot: '갑옷', name: '가죽 갑옷', reqTier: 1, baseStats: [{ id: 'flatHp', base: 20 }, { id: 'evasion', base: 74 }] },
    { id: 'plate_mail', slot: '갑옷', name: '판금 갑옷', reqTier: 4, baseStats: [{ id: 'flatHp', base: 42 }, { id: 'armor', base: 220 }, { id: 'dr', base: 3 }] },
    { id: 'fortress_plate', slot: '갑옷', name: '요새 판갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 60 }, { id: 'armor', base: 285 }, { id: 'dr', base: 4 }] },
    { id: 'astral_plate', slot: '갑옷', name: '별빛 흉갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 70 }, { id: 'armor', base: 120 }, { id: 'evasion', base: 120 }, { id: 'resAll', base: 6 }] },
    { id: 'templar_mail', slot: '갑옷', name: '성전사 판금', reqTier: 4, baseStats: [{ id: 'flatHp', base: 46 }, { id: 'armor', base: 120 }, { id: 'energyShield', base: 96 }] },
    { id: 'consecrated_cuirass', slot: '갑옷', name: '축성 흉갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 66 }, { id: 'armor', base: 158 }, { id: 'energyShield', base: 138 }] },
    { id: 'hide_gloves', slot: '장갑', name: '가죽 장갑', reqTier: 1, baseStats: [{ id: 'aspd', base: 2 }, { id: 'evasion', base: 18 }] },
    { id: 'grip_gauntlets', slot: '장갑', name: '강철 건틀릿', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'flatHp', base: 16 }, { id: 'armor', base: 55 }] },
    { id: 'storm_touch', slot: '장갑', name: '폭풍 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 7 }, { id: 'crit', base: 5 }, { id: 'evasion', base: 53 }, { id: 'energyShield', base: 53 }] },
    { id: 'ward_gauntlets', slot: '장갑', name: '보호 건틀릿', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'armor', base: 30 }, { id: 'energyShield', base: 28 }] },
    { id: 'bastion_grips', slot: '장갑', name: '보루 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 52 }, { id: 'energyShield', base: 50 }] },
    { id: 'rag_boots', slot: '신발', name: '헝겊 장화', reqTier: 1, baseStats: [{ id: 'move', base: 5 }, { id: 'energyShield', base: 27 }] },
    { id: 'ranger_boots', slot: '신발', name: '추적자 장화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'flatHp', base: 14 }, { id: 'evasion', base: 65 }] },
    { id: 'deadeye_boots', slot: '신발', name: '명사수 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'evasion', base: 105 }, { id: 'crit', base: 4 }] },
    { id: 'phase_boots', slot: '신발', name: '위상 장화', reqTier: 8, baseStats: [{ id: 'move', base: 16 }, { id: 'energyShield', base: 120 }, { id: 'resC', base: 8 }] },
    { id: 'ranger_guard_helm', slot: '투구', name: '유격 수호 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'armor', base: 42 }, { id: 'evasion', base: 42 }] },
    { id: 'mistwatch_hood', slot: '투구', name: '안개감시 두건', reqTier: 8, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 68 }, { id: 'evasion', base: 70 }] },
    { id: 'phantom_guard_helm', slot: '투구', name: '환영 수호투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 96 }, { id: 'evasion', base: 98 }, { id: 'resC', base: 8 }] },
    { id: 'nightward_crown', slot: '투구', name: '밤수호 관', reqTier: 15, baseStats: [{ id: 'flatHp', base: 78 }, { id: 'armor', base: 124 }, { id: 'evasion', base: 128 }, { id: 'resAll', base: 5 }] },
    { id: 'phase_sentinel_helm', slot: '투구', name: '위상 감시 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 24 }, { id: 'evasion', base: 38 }, { id: 'energyShield', base: 38 }] },
    { id: 'mistweave_circlet', slot: '투구', name: '안개서린 서클릿', reqTier: 8, baseStats: [{ id: 'flatHp', base: 40 }, { id: 'evasion', base: 64 }, { id: 'energyShield', base: 66 }] },
    { id: 'moonphase_visor', slot: '투구', name: '월상 바이저', reqTier: 12, baseStats: [{ id: 'flatHp', base: 56 }, { id: 'evasion', base: 90 }, { id: 'energyShield', base: 94 }, { id: 'resL', base: 8 }] },
    { id: 'starlit_mask', slot: '투구', name: '성광 가면', reqTier: 15, baseStats: [{ id: 'flatHp', base: 74 }, { id: 'evasion', base: 118 }, { id: 'energyShield', base: 122 }, { id: 'resAll', base: 5 }] },
    { id: 'warded_greaves', slot: '신발', name: '수호 경갑', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'armor', base: 46 }, { id: 'energyShield', base: 42 }] },
    { id: 'bastion_striders', slot: '신발', name: '보루 보행화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 72 }, { id: 'energyShield', base: 66 }] },
    { id: 'obsidian_helm', slot: '투구', name: '흑요 투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 230 }, { id: 'resF', base: 10 }] },
    { id: 'guardian_helm', slot: '투구', name: '수호 투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 58 }, { id: 'armor', base: 230 }, { id: 'dr', base: 4 }] },
    { id: 'moonveil_hood', slot: '투구', name: '월광 두건', reqTier: 12, baseStats: [{ id: 'flatHp', base: 54 }, { id: 'evasion', base: 180 }, { id: 'resC', base: 10 }] },
    { id: 'oracle_circlet', slot: '투구', name: '예언자 서클릿', reqTier: 12, baseStats: [{ id: 'flatHp', base: 48 }, { id: 'energyShield', base: 240 }, { id: 'resL', base: 10 }] },
    { id: 'saint_circlet', slot: '투구', name: '성자 서클릿', reqTier: 12, baseStats: [{ id: 'flatHp', base: 70 }, { id: 'armor', base: 126 }, { id: 'energyShield', base: 132 }, { id: 'resL', base: 8 }] },
    { id: 'dread_plate', slot: '갑옷', name: '공포 판갑', reqTier: 15, baseStats: [{ id: 'flatHp', base: 92 }, { id: 'armor', base: 430 }, { id: 'dr', base: 4 }] },
    { id: 'windrunner_coat', slot: '갑옷', name: '질풍 외투', reqTier: 15, baseStats: [{ id: 'flatHp', base: 84 }, { id: 'evasion', base: 365 }, { id: 'move', base: 12 }] },
    { id: 'astral_robe', slot: '갑옷', name: '성운 로브', reqTier: 15, baseStats: [{ id: 'flatHp', base: 76 }, { id: 'energyShield', base: 420 }, { id: 'resChaos', base: 10 }] },
    { id: 'cathedral_plate', slot: '갑옷', name: '대성당 판갑', reqTier: 12, baseStats: [{ id: 'flatHp', base: 84 }, { id: 'armor', base: 196 }, { id: 'energyShield', base: 186 }, { id: 'resC', base: 10 }] },
    { id: 'seraphim_aegis', slot: '갑옷', name: '세라핌 수호갑', reqTier: 15, baseStats: [{ id: 'flatHp', base: 102 }, { id: 'armor', base: 238 }, { id: 'energyShield', base: 232 }, { id: 'resAll', base: 8 }] },
    { id: 'warhands', slot: '장갑', name: '전쟁장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 145 }, { id: 'flatHp', base: 24 }] },
    { id: 'shadewrap_grips', slot: '장갑', name: '그림자 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 6 }, { id: 'evasion', base: 105 }, { id: 'crit', base: 6 }] },
    { id: 'arcane_mitts', slot: '장갑', name: '비전 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 5 }, { id: 'energyShield', base: 135 }, { id: 'resL', base: 8 }] },
    { id: 'saint_mitts', slot: '장갑', name: '성자 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'armor', base: 78 }, { id: 'energyShield', base: 74 }, { id: 'resL', base: 6 }] },
    { id: 'iron_tread', slot: '신발', name: '강철 발걸음', reqTier: 15, baseStats: [{ id: 'move', base: 18 }, { id: 'armor', base: 230 }, { id: 'flatHp', base: 36 }] },
    { id: 'hawkstride_boots', slot: '신발', name: '매걸음 장화', reqTier: 12, baseStats: [{ id: 'move', base: 16 }, { id: 'evasion', base: 145 }, { id: 'crit', base: 5 }] },
    { id: 'ghost_stride', slot: '신발', name: '유령 걸음', reqTier: 15, baseStats: [{ id: 'move', base: 18 }, { id: 'evasion', base: 185 }, { id: 'crit', base: 6 }] },
    { id: 'ether_steps', slot: '신발', name: '에테르 스텝', reqTier: 15, baseStats: [{ id: 'move', base: 18 }, { id: 'energyShield', base: 220 }, { id: 'resAll', base: 8 }] },
    { id: 'skirmish_mail', slot: '갑옷', name: '척후 갑피', reqTier: 4, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 88 }, { id: 'evasion', base: 90 }] },
    { id: 'windplate_coat', slot: '갑옷', name: '풍갑 외투', reqTier: 8, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 122 }, { id: 'evasion', base: 124 }] },
    { id: 'sentinel_scale', slot: '갑옷', name: '감시자 비늘갑', reqTier: 12, baseStats: [{ id: 'flatHp', base: 80 }, { id: 'armor', base: 156 }, { id: 'evasion', base: 162 }, { id: 'resF', base: 10 }] },
    { id: 'nightwatch_harness', slot: '갑옷', name: '야경 흉갑', reqTier: 15, baseStats: [{ id: 'flatHp', base: 98 }, { id: 'armor', base: 194 }, { id: 'evasion', base: 202 }, { id: 'resAll', base: 7 }] },
    { id: 'veilwoven_vest', slot: '갑옷', name: '장막 직조 조끼', reqTier: 4, baseStats: [{ id: 'flatHp', base: 38 }, { id: 'evasion', base: 84 }, { id: 'energyShield', base: 70 }] },
    { id: 'mirage_link_robe', slot: '갑옷', name: '신기루 결속 로브', reqTier: 8, baseStats: [{ id: 'flatHp', base: 56 }, { id: 'evasion', base: 116 }, { id: 'energyShield', base: 104 }] },
    { id: 'moonlace_raiment', slot: '갑옷', name: '월영 예복', reqTier: 12, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'evasion', base: 148 }, { id: 'energyShield', base: 142 }, { id: 'resC', base: 10 }] },
    { id: 'starseam_dress', slot: '갑옷', name: '성봉 의장', reqTier: 15, baseStats: [{ id: 'flatHp', base: 90 }, { id: 'evasion', base: 182 }, { id: 'energyShield', base: 178 }, { id: 'resAll', base: 7 }] },
    { id: 'ranger_bulwark_gloves', slot: '장갑', name: '유격 방벽 장갑', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'armor', base: 22 }, { id: 'evasion', base: 24 }] },
    { id: 'windguard_grips', slot: '장갑', name: '풍수 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 38 }, { id: 'evasion', base: 40 }] },
    { id: 'sentinel_claws', slot: '장갑', name: '감시자 갈퀴장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'armor', base: 56 }, { id: 'evasion', base: 58 }, { id: 'crit', base: 5 }] },
    { id: 'nightwatch_grasps', slot: '장갑', name: '야경 장악장갑', reqTier: 15, baseStats: [{ id: 'aspd', base: 8 }, { id: 'armor', base: 74 }, { id: 'evasion', base: 78 }, { id: 'crit', base: 6 }] },
    { id: 'phasebound_gloves', slot: '장갑', name: '위상 결속 장갑', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'evasion', base: 24 }, { id: 'energyShield', base: 20 }] },
    { id: 'mist_bind_mitts', slot: '장갑', name: '안개결속 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'evasion', base: 40 }, { id: 'energyShield', base: 36 }] },
    { id: 'moonphase_mitts', slot: '장갑', name: '월상 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'evasion', base: 58 }, { id: 'energyShield', base: 54 }, { id: 'resL', base: 6 }] },
    { id: 'starlight_grips', slot: '장갑', name: '성광 장갑', reqTier: 15, baseStats: [{ id: 'aspd', base: 8 }, { id: 'evasion', base: 76 }, { id: 'energyShield', base: 72 }, { id: 'resAll', base: 4 }] },
    { id: 'skirmish_greaves', slot: '신발', name: '척후 각반', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'armor', base: 34 }, { id: 'evasion', base: 36 }] },
    { id: 'windguard_boots', slot: '신발', name: '풍수 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 54 }, { id: 'evasion', base: 56 }] },
    { id: 'sentinel_stride', slot: '신발', name: '감시자 장화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'armor', base: 74 }, { id: 'evasion', base: 78 }, { id: 'resF', base: 8 }] },
    { id: 'nightwatch_steps', slot: '신발', name: '야경 보행화', reqTier: 15, baseStats: [{ id: 'move', base: 19 }, { id: 'armor', base: 96 }, { id: 'evasion', base: 102 }, { id: 'resAll', base: 5 }] },
    { id: 'phase_treader', slot: '신발', name: '위상 추적화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'evasion', base: 34 }, { id: 'energyShield', base: 30 }] },
    { id: 'mistwalk_boots', slot: '신발', name: '안개걸음 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'evasion', base: 56 }, { id: 'energyShield', base: 52 }] },
    { id: 'moonstride_boots', slot: '신발', name: '월영 보행화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'evasion', base: 78 }, { id: 'energyShield', base: 74 }, { id: 'resC', base: 8 }] },
    { id: 'starseeker_steps', slot: '신발', name: '성추적 보행화', reqTier: 15, baseStats: [{ id: 'move', base: 19 }, { id: 'evasion', base: 102 }, { id: 'energyShield', base: 98 }, { id: 'resAll', base: 5 }] },
    { id: 'saint_steps', slot: '신발', name: '성자 보행화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'armor', base: 98 }, { id: 'energyShield', base: 94 }, { id: 'resF', base: 8 }] },
    { id: 'archon_barbute', slot: '투구', name: '아콘 바르부트', reqTier: 15, baseStats: [{ id: 'flatHp', base: 86 }, { id: 'armor', base: 162 }, { id: 'energyShield', base: 172 }, { id: 'resAll', base: 6 }] },
    { id: 'archon_fists', slot: '장갑', name: '아콘 장갑', reqTier: 15, baseStats: [{ id: 'aspd', base: 8 }, { id: 'armor', base: 104 }, { id: 'energyShield', base: 102 }, { id: 'resAll', base: 4 }] },
    { id: 'archon_strides', slot: '신발', name: '아콘 스텝', reqTier: 15, baseStats: [{ id: 'move', base: 19 }, { id: 'armor', base: 126 }, { id: 'energyShield', base: 122 }, { id: 'resAll', base: 5 }] },
    { id: 'bone_amulet', slot: '목걸이', name: '뼈 목걸이', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }, { id: 'flatHp', base: 8 }] },
    { id: 'sage_amulet', slot: '목걸이', name: '현자의 목걸이', reqTier: 5, baseStats: [{ id: 'crit', base: 4 }, { id: 'resAll', base: 4 }] },
    { id: 'star_pendant', slot: '목걸이', name: '성좌 펜던트', reqTier: 9, baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'pctDmg', base: 8 }] },
    { id: 'copper_ring', slot: '반지', name: '구리 반지', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }] },
    { id: 'summoner_loop', slot: '반지', name: '소환사의 고리', reqTier: 4, baseStats: [{ id: 'summonPctDmg', base: 10 }, { id: 'summonEfficiency', base: 5 }] },
    { id: 'opal_ring', slot: '반지', name: '오팔 반지', reqTier: 5, baseStats: [{ id: 'pctDmg', base: 6 }] },
    { id: 'sapphire_band', slot: '반지', name: '푸른 띠 반지', reqTier: 9, baseStats: [{ id: 'resAll', base: 6 }, { id: 'crit', base: 3 }] },
    { id: 'void_loop_ring', slot: '반지', name: '공허 고리', reqTier: 12, baseStats: [{ id: 'resChaos', base: 4 }, { id: 'chaosPctDmg', base: 7 }] },
    { id: 'eclipse_ring', slot: '반지', name: '식월 반지', reqTier: 15, baseStats: [{ id: 'resAll', base: 8 }, { id: 'resChaos', base: 5 }, { id: 'crit', base: 5 }] },
    { id: 'rope_belt', slot: '허리띠', name: '로프 허리띠', reqTier: 1, baseStats: [{ id: 'flatHp', base: 16 }] },
    { id: 'war_belt', slot: '허리띠', name: '전사의 허리띠', reqTier: 5, baseStats: [{ id: 'flatHp', base: 32 }, { id: 'dr', base: 2 }] },
    { id: 'stygian_vise', slot: '허리띠', name: '심연의 혁대', reqTier: 9, baseStats: [{ id: 'flatHp', base: 55 }, { id: 'resChaos', base: 8 }] },
    { id: 'blood_girdle', slot: '허리띠', name: '혈석 허리띠', reqTier: 12, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'dr', base: 3 }, { id: 'resChaos', base: 10 }] },
    { id: 'warlord_girdle', slot: '허리띠', name: '장군의 허리띠', reqTier: 15, baseStats: [{ id: 'flatHp', base: 88 }, { id: 'dr', base: 4 }, { id: 'resChaos', base: 12 }] },
    { id: 'nightmare_bind', slot: '허리띠', name: '악몽 결속대', reqTier: 15, baseStats: [{ id: 'flatHp', base: 92 }, { id: 'resAll', base: 7 }, { id: 'resChaos', base: 12 }] },
    { id: 'root_blade_fang', slot: '무기', name: '뿌리 송곳', reqTier: 6, baseStats: [{ id: 'flatDmg', base: 20 }, { id: 'physIgnore', base: 4 }, { id: 'leech', base: 0.8 }], dropOnly: { type: 'act' } },
    { id: 'beehive_stinger_mail', slot: '갑옷', name: '벌침 갑피', reqTier: 12, baseStats: [{ id: 'flatHp', base: 88 }, { id: 'resChaos', base: 10 }, { id: 'evasion', base: 295 }, { id: 'venomStingerBonus', base: 10 }], dropOnly: { type: 'beehive' } },
    { id: 'grand_breach_shard_helm', slot: '투구', name: '대균열 파편투구', reqTier: 16, baseStats: [{ id: 'flatHp', base: 95 }, { id: 'resAll', base: 9 }, { id: 'dr', base: 4 }, { id: 'energyShield', base: 96 }, { id: 'resPen', base: 6 }], dropOnly: { id: 'grand_breach_run' } },
    { id: 'laby_1_greaves', slot: '신발', name: '미궁 수호 각반', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 130 }, { id: 'dr', base: 2 }], dropOnly: { type: 'labyrinth', minFloor: 1 } },
    { id: 'laby_10_crown', slot: '투구', name: '미궁 심층 관', reqTier: 12, baseStats: [{ id: 'flatHp', base: 76 }, { id: 'resAll', base: 8 }, { id: 'armor', base: 230 }, { id: 'regen', base: 0.8 }], dropOnly: { type: 'labyrinth', minFloor: 10 } },
    { id: 'laby_20_robe', slot: '갑옷', name: '미궁 절정 로브', reqTier: 16, baseStats: [{ id: 'energyShield', base: 180 }, { id: 'resChaos', base: 10 }, { id: 'spellFlatPct', base: 10 }], dropOnly: { type: 'labyrinth', minFloor: 20 } },
    { id: 'laby_30_ring', slot: '반지', name: '미궁 군주의 반지', reqTier: 20, baseStats: [{ id: 'resAll', base: 10 }, { id: 'crit', base: 8 }, { id: 'resPen', base: 6 }], dropOnly: { type: 'labyrinth', minFloor: 30 } },
    { id: 'trial_emblem_gloves', slot: '장갑', name: '시련 문양 건틀릿', reqTier: 15, baseStats: [{ id: 'aspd', base: 9 }, { id: 'dr', base: 3 }, { id: 'armor', base: 190 }, { id: 'critDmg', base: 20 }], dropOnly: { type: 'trial' } },

    { id: 'beehive_queen_veil', slot: '투구', name: '여왕벌 면사포', reqTier: 14, baseStats: [{ id: 'flatHp', base: 82 }, { id: 'evasion', base: 138 }, { id: 'resChaos', base: 12 }, { id: 'venomStingerBonus', base: 12 }], dropOnly: { type: 'beehive' } },
    { id: 'trial_warden_boots', slot: '신발', name: '시련 감시자 장화', reqTier: 17, baseStats: [{ id: 'move', base: 20 }, { id: 'armor', base: 128 }, { id: 'dr', base: 4 }, { id: 'resPen', base: 5 }], dropOnly: { type: 'trial' } },
    { id: 'riftglass_robe', slot: '갑옷', name: '균열유리 로브', reqTier: 18, baseStats: [{ id: 'energyShield', base: 256 }, { id: 'resChaos', base: 14 }, { id: 'spellFlatPct', base: 14 }, { id: 'flatHp', base: -40 }], dropOnly: { id: 'grand_breach_run' } },
    { id: 'meteor_trace_greaves', slot: '신발', name: '운석 자취 경갑', reqTier: 19, baseStats: [{ id: 'move', base: 22 }, { id: 'evasion', base: 150 }, { id: 'crit', base: 8 }, { id: 'resL', base: 14 }], dropOnly: { type: 'meteor' } },
    { id: 'runic_bastion_helm', slot: '투구', name: '룬 철벽투구', reqTier: 9, baseStats: [{ id: 'flatHp', base: 46 }, { id: 'armor', base: 92 }] },
    { id: 'thornweave_coat', slot: '갑옷', name: '가시결 외투', reqTier: 9, baseStats: [{ id: 'flatHp', base: 58 }, { id: 'evasion', base: 116 }] },
    { id: 'stormbind_mitts', slot: '장갑', name: '뇌격 결속 장갑', reqTier: 10, baseStats: [{ id: 'aspd', base: 7 }, { id: 'resL', base: 9 }, { id: 'energyShield', base: 112 }] },
    { id: 'sunstride_boots', slot: '신발', name: '태양 질주화', reqTier: 10, baseStats: [{ id: 'move', base: 15 }, { id: 'resF', base: 9 }, { id: 'evasion', base: 120 }] },
    { id: 'moonbound_ring', slot: '반지', name: '월인 반지', reqTier: 10, baseStats: [{ id: 'resC', base: 9 }, { id: 'crit', base: 4 }] },
    { id: 'familiar_loop', slot: '반지', name: '사역마 고리', reqTier: 6, baseStats: [{ id: 'summonPctDmg', base: 12 }, { id: 'summonHpPct', base: 10 }] },
    { id: 'beastcall_band', slot: '반지', name: '야수 부름 반지', reqTier: 11, baseStats: [{ id: 'summonEfficiency', base: 12 }, { id: 'summonCrit', base: 4 }] },
    { id: 'overlord_ring', slot: '반지', name: '군주 반지', reqTier: 15, baseStats: [{ id: 'summonPctDmg', base: 18 }, { id: 'summonCap', base: 1 }] },
    { id: 'graveknot_belt', slot: '허리띠', name: '묘결 속박대', reqTier: 10, baseStats: [{ id: 'flatHp', base: 60 }, { id: 'resChaos', base: 9 }] },
    { id: 'echo_lance', slot: '무기', name: '메아리 창', reqTier: 11, baseStats: [{ id: 'flatDmg', base: 24 }, { id: 'aspd', base: 7 }] },
    { id: 'spirit_call_wand', slot: '무기', name: '정령 소환봉', reqTier: 6, baseStats: [{ id: 'flatDmg', base: 10 }, { id: 'summonPctDmg', base: 18 }, { id: 'summonEfficiency', base: 8 }] },
    { id: 'gravebind_scepter', slot: '무기', name: '묘지 결속 홀', reqTier: 10, baseStats: [{ id: 'flatDmg', base: 16 }, { id: 'summonPctDmg', base: 26 }, { id: 'summonHpPct', base: 18 }] },
    { id: 'astral_familiar_staff', slot: '무기', name: '성운 사역마 지팡이', reqTier: 15, baseStats: [{ id: 'flatDmg', base: 22 }, { id: 'summonPctDmg', base: 36 }, { id: 'summonCritDmg', base: 24 }] },
    { id: 'ember_circlet', slot: '투구', name: '잿불 서클릿', reqTier: 11, baseStats: [{ id: 'energyShield', base: 126 }, { id: 'resF', base: 10 }] },
    { id: 'tidal_vest', slot: '갑옷', name: '조류의 흉갑', reqTier: 11, baseStats: [{ id: 'flatHp', base: 66 }, { id: 'resC', base: 10 }, { id: 'armor', base: 145 }, { id: 'evasion', base: 150 }] },
    { id: 'gale_treads', slot: '신발', name: '질풍 발굽', reqTier: 11, baseStats: [{ id: 'move', base: 16 }, { id: 'evasion', base: 94 }] },
    { id: 'buckler_scrap', slot: '방패', name: '고철 버클러', reqTier: 1, baseStats: [{ id: 'armor', base: 38 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'iron_buckler', slot: '방패', name: '철 버클러', reqTier: 4, baseStats: [{ id: 'armor', base: 62 }, { id: 'baseBlockChance', base: 5.4 }] },
    { id: 'woven_guard', slot: '방패', name: '직조 가드', reqTier: 4, baseStats: [{ id: 'evasion', base: 62 }, { id: 'baseBlockChance', base: 6.0 }] },
    { id: 'aegis_focus', slot: '방패', name: '아이기스 포커스', reqTier: 4, baseStats: [{ id: 'energyShield', base: 66 }, { id: 'baseBlockChance', base: 6.5 }] },
    { id: 'scale_guard', slot: '방패', name: '비늘 방패', reqTier: 4, baseStats: [{ id: 'armor', base: 58 }, { id: 'evasion', base: 56 }, { id: 'baseBlockChance', base: 5.0 }] },
    { id: 'ward_kite', slot: '방패', name: '수호 카이트', reqTier: 4, baseStats: [{ id: 'armor', base: 56 }, { id: 'energyShield', base: 54 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'mist_guard', slot: '방패', name: '안개 수호패', reqTier: 4, baseStats: [{ id: 'evasion', base: 54 }, { id: 'energyShield', base: 52 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'tower_wall', slot: '방패', name: '타워 월', reqTier: 8, baseStats: [{ id: 'armor', base: 96 }, { id: 'baseBlockChance', base: 4.2 }] },
    { id: 'mirage_guard', slot: '방패', name: '신기루 가드', reqTier: 8, baseStats: [{ id: 'evasion', base: 94 }, { id: 'baseBlockChance', base: 5.4 }] },
    { id: 'ether_focus', slot: '방패', name: '에테르 초점패', reqTier: 8, baseStats: [{ id: 'energyShield', base: 102 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'drake_scale_guard', slot: '방패', name: '용비늘 방패', reqTier: 8, baseStats: [{ id: 'armor', base: 86 }, { id: 'evasion', base: 84 }, { id: 'baseBlockChance', base: 4.6 }] },
    { id: 'temple_kite', slot: '방패', name: '사원 카이트', reqTier: 8, baseStats: [{ id: 'armor', base: 84 }, { id: 'energyShield', base: 82 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'veil_guard', slot: '방패', name: '장막 수호패', reqTier: 8, baseStats: [{ id: 'evasion', base: 84 }, { id: 'energyShield', base: 80 }, { id: 'baseBlockChance', base: 4.8 }] },
    { id: 'citadel_wall', slot: '방패', name: '성채 방벽', reqTier: 12, baseStats: [{ id: 'armor', base: 126 }, { id: 'baseBlockChance', base: 3.8 }] },
    { id: 'phase_bulwark', slot: '방패', name: '위상 불워크', reqTier: 12, baseStats: [{ id: 'evasion', base: 122 }, { id: 'baseBlockChance', base: 3.8 }] },
    { id: 'starlit_focus', slot: '방패', name: '성광 초점패', reqTier: 12, baseStats: [{ id: 'energyShield', base: 132 }, { id: 'baseBlockChance', base: 3.2 }] },
    { id: 'runic_scale_guard', slot: '방패', name: '룬비늘 방패', reqTier: 12, baseStats: [{ id: 'armor', base: 112 }, { id: 'evasion', base: 108 }, { id: 'baseBlockChance', base: 4.0 }] },
    { id: 'relic_kite', slot: '방패', name: '유물 카이트', reqTier: 12, baseStats: [{ id: 'armor', base: 110 }, { id: 'energyShield', base: 106 }, { id: 'baseBlockChance', base: 3.8 }] },
    { id: 'moon_barrier', slot: '방패', name: '월영 배리어', reqTier: 12, baseStats: [{ id: 'evasion', base: 108 }, { id: 'energyShield', base: 104 }, { id: 'baseBlockChance', base: 3.4 }] },
    { id: 'adamant_wall', slot: '방패', name: '금강 방벽', reqTier: 16, baseStats: [{ id: 'armor', base: 158 }, { id: 'baseBlockChance', base: 3.2 }] },
    { id: 'nightveil_guard', slot: '방패', name: '밤장막 가드', reqTier: 16, baseStats: [{ id: 'evasion', base: 154 }, { id: 'baseBlockChance', base: 3.4 }] },
    { id: 'archon_focus', slot: '방패', name: '아콘 초점패', reqTier: 16, baseStats: [{ id: 'energyShield', base: 166 }, { id: 'baseBlockChance', base: 3.0 }] },
    { id: 'bastion_aegis', slot: '방패', name: '보루 이지스', reqTier: 16, baseStats: [{ id: 'armor', base: 142 }, { id: 'evasion', base: 136 }, { id: 'baseBlockChance', base: 3.4 }] },
    { id: 'sanctum_aegis', slot: '방패', name: '성소 이지스', reqTier: 16, baseStats: [{ id: 'armor', base: 140 }, { id: 'energyShield', base: 134 }, { id: 'baseBlockChance', base: 3.1 }] },
    { id: 'astral_barrier', slot: '방패', name: '성운 배리어', reqTier: 16, baseStats: [{ id: 'evasion', base: 136 }, { id: 'energyShield', base: 132 }, { id: 'baseBlockChance', base: 2.9 }] }
    ,{ id: 'chaos_realm_fang', slot: '무기', name: '혼돈계 균열 송곳', reqTier: 18, realmBase: 'chaos', baseStats: [{ id: 'flatDmg', base: 42 }, { id: 'chaosPctDmg', base: 24 }, { id: 'resChaos', base: 8 }] }
    ,{ id: 'chaos_realm_coil', slot: '반지', name: '혼돈계 소용돌이 반지', reqTier: 18, realmBase: 'chaos', baseStats: [{ id: 'chaosPctDmg', base: 18 }, { id: 'resChaos', base: 10 }] }
    ,{ id: 'underworld_bastion', slot: '갑옷', name: '지하계 철벽 흉갑', reqTier: 20, realmBase: 'underworld', baseStats: [{ id: 'flatHp', base: 120 }, { id: 'armor', base: 260 }, { id: 'dr', base: 8 }] }
    ,{ id: 'underworld_chain', slot: '허리띠', name: '지하계 결속 허리띠', reqTier: 20, realmBase: 'underworld', baseStats: [{ id: 'flatHp', base: 110 }, { id: 'resAll', base: 10 }, { id: 'resChaos', base: 12 }] }
    ,{ id: 'cosmos_prism_lance', slot: '무기', name: '우주계 프리즘 랜스', reqTier: 22, realmBase: 'cosmos', baseStats: [{ id: 'flatDmg', base: 52 }, { id: 'elementalPctDmg', base: 28 }, { id: 'resPen', base: 9 }] }
    ,{ id: 'cosmos_core_amulet', slot: '목걸이', name: '우주계 핵성 목걸이', reqTier: 22, realmBase: 'cosmos', baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'suppCap', base: 1 }, { id: 'resAll', base: 10 }] }
];


const HERO_SELECTION_ORDER = Object.keys(HERO_SELECTION_DEFS);

let cloudState = {
    initialized: false,
    configured: false,
    busy: false,
    session: null,
    user: null,
    linkedProviders: [],
    isLoaded: false,
    lastMessage: '설정 전',
    lastRemoteUpdatedAt: 0,
    lastRemoteLoop: 0,
    lastSyncAttemptAt: 0,
    lastSyncedLocalModifiedAt: 0,
    pendingAutoSyncDirty: false,
    tokenRefreshPromise: null,
    tokenExpiryWarned: false,
    pendingForcedSyncOptions: null,
    pendingForcedSyncRetryTimer: null
};
let startupOverlayActive = true;
let gameplayStarted = false;
let loadingOverlayTimer = null;
let loadingOverlayProgress = 0;
let pendingMapRevealZoneId = null;
let pendingMapRevealToken = 0;
let lastRenderedMapListHtml = '';
let lastRenderedChaosMapListHtml = '';

safeExposeGlobals({ formatStoryActLabel, getStoryActByZoneId, getStoryActByOrder, getActZoneDisplayName, getStarWedgeUnlockReady, getAbyssDepthFromZoneId, getAbyssZoneIdForDepth, getZone, getSeasonAbyssDepthCap, getLoopAbyssRequirementText, hasCurrentLoopAbyssRequirementClear, getSeasonFinalZoneId, getCurrentSeasonFinalZoneId, getVisibleHuntingMapCapZoneId, getHighestUnlockedEndlessChaosDepth, getAutoProgressZoneId, getAbyssPassiveState, getAbyssPassiveSpent, getAbyssPassiveFreePoints, tryAllocateAbyssPassive, getAbyssMonsterScales, applySeasonContentProgression, getLoop10StatCost, allocateLoop10BonusStat, enterNextEndlessChaosDepth, enterUnlockedEndlessDepth, getLoopDeepStatCost, allocateLoopDeepStat, SKY_TOWER_ZONE_ID, createDefaultSkyTowerState, ensureSkyTowerState, getSkyTowerLoopClearLimit, getSkyTowerRemainingClears, hasCurrentLoopChaosAccess, maybeUnlockSkyTowerFromChaos20, canEnterSkyTower, getSkyTowerTier, getSkyTowerRewardAmount, getSkyStoneMaxLevel, getSkyStoneReductionPct, getSkyStoneNextCost, getSkyTowerGemBoostMaxLevel, getSkyTowerGemBoostLevel, getSkyTowerGemBoostCost, OCEAN_CURRENT_POOL, getOceanCurrentAffixes, createDefaultOceanState, ensureOceanState, canEnterOceanDepth, getOceanOxygenMax, getOceanOxygenDrainPerSec, getOceanDepthTier, getOceanFishingGaugeGainMul });

// Phase-4 extracted default state schema.

const EXPERT_DEFS = {
  mycologist:{name:'균사학자',icon:'🍄',desc:'홀씨와 화석을 다루며 장비 옵션을 변형하고 복원한다.',unlocks:[{level:1,title:'균사학 입문',desc:'기본 홀씨 제작 해금'},{level:2,title:'원소 변환',desc:'추가 홀씨 제작 해금 : 장비의 화염/냉기/번개 저항 옵션을 원하는 다른 원소 저항으로 변환'},{level:3,title:'원소 전이',desc:'추가 홀씨 제작 해금 :  장비의 화염/냉기/번개 피해 옵션을 원하는 다른 원소 피해로 전환'},{level:4,title:'원시 화석',desc:'원시 화석 드랍 해금 및 화석 복원 가능'},{level:5,title:'고대 화석 발견',desc:'원시 고대 화석 드랍 해금'},{level:6,title:'화석 전용 옵션',desc:'화석 전용 옵션을 가진 아이템 드랍 해금'},{level:7,title:'부패 홀씨',desc:'특정 원소 태그를 가진 옵션 1개를 무작위 제거 가능'},{level:8,title:'복원 보상 확장',desc:'화석 복원 결과에 카오스오브 이상의 재화 추가'},{level:9,title:'균열 홀씨',desc:'화석 전용 옵션이 붙은 장비를 보조하는 균열 홀씨 제작식 해금'},{level:10,title:'고급 홀씨 제작',desc:'상위 홀씨 제작식 해금'},{level:11,title:'제거 대상 감지',desc:'부패 홀씨 제작비용 할인'},{level:12,title:'복원 대성공',desc:'화석 복원 시 낮은 확률로 추가 보상 획득'},{level:13,title:'완벽한 화석 조각',desc:'완벽한 화석 조각 해금'},{level:14,title:'완벽한 화석 드랍',desc:'완벽한 화석 완제품 드랍 해금'},{level:15,title:'홀씨 고정법',desc:'벌꿀 고정 제작에 홀씨 사용 가능'}]},
  gemEngraver:{name:'젬 각인사',icon:'💎',desc:'젬 구매, 각인, 퀄리티, 각성 젬을 다룬다.',unlocks:[{level:1,title:'컨디션 가공',desc:'컨디션 젬은 처음부터 3개 후보 중 1개 선택'},{level:2,title:'공격 젬 창공 가공',desc:'창공의 힘으로 공격 스킬 젬에 기본 각인 부여 가능'},{level:3,title:'추가 공격 각인',desc:'공격 스킬 젬 창공 각인 종류 추가 해금'},{level:4,title:'증폭 각인',desc:'공격 스킬 젬의 기본 효과를 강화하는 증폭 각인 해금'},{level:5,title:'보조 젬 창공 가공',desc:'창공의 힘으로 보조 젬 등급/레벨 가공 가능'},{level:6,title:'고급 공격 각인',desc:'관통/분쇄 계열 공격 스킬 젬 각인 해금'},{level:7,title:'유동성 증가',desc:'공격 스킬 젬 창공 각인 자유 해제 가능'},{level:8,title:'젬 퀄리티',desc:'군주의 핵을 사용한 젬 퀄리티 기능 해금'},{level:9,title:'조율 각인',desc:'젬의 보조 태그를 조율하는 각인 종류 해금'},{level:10,title:'젬 상점 강화',desc:'암거래/젬 구매 후보 품질 향상'},{level:11,title:'순환 각인',desc:'컨디션 젬의 쿨타임을 줄여 주는 순환 각인 해금'},{level:12,title:'각성 잔향',desc:'각성 젬 관련 재료인 각성 잔향 드랍 해금'},{level:13,title:'각성 젬 드랍',desc:'매우 낮은 확률로 각성 젬 드랍 가능'},{level:14,title:'각성 각인',desc:'특별한 효과의 특수 각인 해금'},{level:15,title:'각성 후보 변환',desc:'일반 젬을 각성 젬 후보로 변환 시도 가능'}]},
  astronomer:{name:'천문학자',icon:'☄️',desc:'운석 게이지, 이상 현상, 별쐐기, 소행성 지도, 별자리를 관측한다.',unlocks:[{level:1,title:'운석 게이지',desc:'전투/맵핑 중 운석 게이지 축적 시작'},{level:2,title:'별가루',desc:'별가루 드랍 해금'},{level:3,title:'이상 현상 관측',desc:'낮은 확률로 이상 현상 관측 발생'},{level:4,title:'별쐐기 낙하',desc:'별쐐기 낙하 이벤트 해금'},{level:5,title:'별쐐기 리롤',desc:'별쐐기 관련 옵션 리롤 기능 해금'},{level:6,title:'소행성 지도',desc:'매 판 특성이 랜덤인 소행성 지도 해금'},{level:7,title:'소행성 특성',desc:'소행성 지도에 랜덤 특성 부여'},{level:8,title:'별자리 관측',desc:'별자리 관측 기능 해금'},{level:9,title:'영원성',desc:'별자리 관측이 루프 후에도 유지됨'},{level:10,title:'게이지 이월',desc:'운석 게이지 초과분 일부 이월'},{level:11,title:'희귀 이상 현상',desc:'공허 정렬, 이중 유성우 등 희귀 이상 현상 해금'},{level:12,title:'영원 별쐐기',desc:'별쐐기를 루프 후에도 고정하는 특수 재화 해금'},{level:13,title:'소행성 특성 추가',desc:'소행성 지도에 추가 랜덤 특성 등장 가능'},{level:14,title:'전문가 연동',desc:'소행성 지도에서 다른 전문가 재화 보상 등장 가능'},{level:15,title:'고등 별자리 관측',desc:'더 높은 등급의 별자리 효과 관측 가능'}]},
  beekeeper:{name:'양봉업자',icon:'🐝',desc:'꽃가루, 벌집, 벌꿀, 독벌침, 밀랍, 벌 이벤트를 관리한다.',unlocks:[{level:1,title:'꽃가루 채집',desc:'꽃가루 드랍 해금'},{level:2,title:'마력깃든 벌꿀',desc:'마력깃든 벌꿀 드랍 해금'},{level:3,title:'카오스오브',desc:'벌집 보상풀에 카오스오브 추가'},{level:4,title:'독벌침',desc:'독벌침 드랍 해금'},{level:5,title:'신성한오브',desc:'벌집 보상풀에 매우 낮은 확률로 신성한오브 추가'},{level:6,title:'벌꿀/독벌침 교환',desc:'마력깃든 벌꿀 및 독벌침 <-> 재화 양방 교환 기능 해금'},{level:7,title:'벌집 심층 보상',desc:'벌집 심층 보상풀 확장'},{level:8,title:'밀랍',desc:'밀랍 재화 해금 - 부적 및 주얼에 밀랍 옵션 부여 가능'},{level:9,title:'밀랍 제거',desc:'부여된 옵션 제거 가능'},{level:10,title:'벌 이벤트',desc:'맵핑 중 일정 확률로 꽃가루를 자동 소모하여 벌 소환 이벤트 발생 가능'},{level:11,title:'호박벌 이벤트',desc:'보상이 더 좋은 호박벌 소환 이벤트 해금'},{level:12,title:'독침벌 이벤트',desc:'위험도가 높지만 독벌침 확률이 높은 독침벌 이벤트 해금'},{level:13,title:'금은보화',desc:'벌집 보상풀에 재화가 나올 확률이 조금 상승'},{level:14,title:'여왕벌 이벤트',desc:'낮은 확률로 대형 보상을 주는 여왕벌 이벤트 해금'},{level:15,title:'중첩',desc:'벌집 보상풀에 낮은 확률로 중첩 보상 등장'}]}
};



const EXPERT_FAVOR_OPTIONS = {
  mycologist: [
    { id:'myco_chill_freeze', level:1, name:'가루약: 냉각/동결 완화', effect:{ chillEffectReducePct:50, freezeDurationReducePct:50 } },
    { id:'myco_shock', level:3, name:'가루약: 감전 완화', effect:{ shockEffectReducePct:30 } },
    { id:'myco_ignite', level:5, name:'가루약: 점화 완화', effect:{ igniteDamageReducePct:30 } },
    { id:'myco_bleed', level:7, name:'가루약: 출혈 완화', effect:{ bleedDamageReducePct:30 } },
    { id:'myco_poison', level:9, name:'가루약: 중독 완화', effect:{ poisonDamageReducePct:30 } }
  ],
  gemEngraver: [
    { id:'gem_dot_taken', level:1, name:'젬 코팅: 지속 피해 저항', effect:{ dotTakenDamageReducePct:12 } },
    { id:'gem_crowd_taken', level:4, name:'젬 코팅: 다수전 방호', effect:{ takenDamageReduceWhen2EnemiesPct:8 } },
    { id:'gem_duel_taken', level:7, name:'젬 코팅: 단일전 방호', effect:{ takenDamageReduceWhen1EnemyPct:4 } }
  ],
  astronomer: [
    { id:'astro_ignite', level:1, name:'렌즈: 점화 강화', effect:{ igniteChance:25, igniteDamageMultiplierPct:10 } },
    { id:'astro_accuracy', level:3, name:'렌즈: 정확도 보정', effect:{ accuracyBonusPct:10 } },
    { id:'astro_minroll', level:5, name:'렌즈: 최소 피해 보정', effect:{ minDmgRoll:6 } },
    { id:'astro_projectile', level:7, name:'렌즈: 투사체 피해', effect:{ projectilePctDmg:12 } },
    { id:'astro_crit', level:9, name:'렌즈: 치명타 확률', effect:{ crit:1.5 } },
    { id:'astro_critdmg', level:11, name:'렌즈: 치명타 피해', effect:{ critDmg:12.5 } }
  ],
  beekeeper: [
    { id:'bee_speed_regen', level:1, name:'로열젤리: 가속 재생', effect:{ aspd:10, regen:2 } },
    { id:'bee_crit_es', level:4, name:'로열젤리: 치명/보호막', effect:{ crit:1, energyShieldPct:10 } },
    { id:'bee_critdmg_eva', level:7, name:'로열젤리: 치피/회피', effect:{ critDmg:12.5, evasionPct:10 } },
    { id:'bee_dmg_armor', level:10, name:'로열젤리: 피해/방어도', effect:{ pctDmg:15, armorPct:10 } }
  ]
};
function getExpertFavorOptions(expertId){ return (EXPERT_FAVOR_OPTIONS[expertId]||[]).slice(); }
function getSelectedExpertFavor(expertId){ let st=ensureExpertiseState(); st.favors=(st.favors&&typeof st.favors==='object')?st.favors:{}; return st.favors[expertId]||null; }
function setSelectedExpertFavor(expertId, optionId){ let st=ensureExpertiseState(); st.favors=(st.favors&&typeof st.favors==='object')?st.favors:{}; let lv=getExpertLevel(expertId); let opt=(EXPERT_FAVOR_OPTIONS[expertId]||[]).find(v=>v.id===optionId && lv>=v.level); if(!opt) return false; st.favors[expertId]=optionId; return true; }
function getExpertFavorEffectTotals(){ let st=ensureExpertiseState(); st.favors=(st.favors&&typeof st.favors==='object')?st.favors:{}; let out={}; Object.keys(EXPERT_FAVOR_OPTIONS).forEach(expertId=>{ let picked=st.favors[expertId]; let opt=(EXPERT_FAVOR_OPTIONS[expertId]||[]).find(v=>v.id===picked); if(!opt) return; Object.entries(opt.effect||{}).forEach(([k,v])=>{ out[k]=(out[k]||0)+Number(v||0); }); }); return out; }

const EXPERT_EXP_RULES = {
  mycologist: { loopCap: 250, actions: { spore_craft: { exp: 2, cap: 80 }, fossil_refine: { exp: 3, cap: 80 }, fossil_craft: { exp: 3, cap: 80 }, fossil_restore: { exp: 5, cap: 80 }, labyrinth_new_floor: { exp: 10, cap: 60 }, loop_base: { exp: 60 } } },
  gemEngraver: { loopCap: 250, actions: { boss_core_upgrade: { exp: 3, cap: 80 }, sky_core_upgrade: { exp: 3, cap: 80 }, engrave_slot_expand: { exp: 5, cap: 60 }, engrave_apply: { exp: 1, cap: 100 }, support_gem_upgrade: { exp: 1, cap: 100 }, loop_base: { exp: 60 } } },
  astronomer: { loopCap: 250, actions: { meteor_clear: { exp: 5, cap: 80 }, starwedge_craft: { exp: 5, cap: 80 }, starwedge_reroll: { exp: 1, cap: 100 }, anomaly_observe: { exp: 5, cap: 80 }, loop_base: { exp: 60 } } },
  beekeeper: { loopCap: 250, actions: { bee_branch_choice: { exp: 1, cap: 100 }, bee_clear: { exp: 10, cap: 80 }, bee_currency_craft: { exp: 3, cap: 80 }, bee_resource_use: { exp: 2, cap: 80 }, loop_base: { exp: 60 } } }
};

const EXPERT_TREE_NODES = [
  { id: 'common_reward_gain', branch: 'common', name: '숙련된 손길', desc: '모든 전문가 재화 획득량 증가', max: 5, cost: 1, effect: { expertCurrencyGainPct: 3 } },
  { id: 'common_cost_reduce', branch: 'common', name: '반복 작업', desc: '모든 전문가 제작/사용 비용 감소', max: 5, cost: 1, effect: { expertCostReducePct: 2 } },
  { id: 'common_rare_bonus', branch: 'common', name: '예리한 감별', desc: '전문가 희귀 보상 확률 증가', max: 5, cost: 1, effect: { expertRareChancePct: 2 } },
  { id: 'myco_spore_gain', branch: 'mycologist', name: '균사 증식', desc: '홀씨 획득량 증가', max: 5, cost: 1, effect: { mycoSporeGainPct: 5 } },
  { id: 'myco_fossil_drop', branch: 'mycologist', name: '화석 감별', desc: '화석 드랍률 증가', max: 5, cost: 1, effect: { fossilDropPct: 4 } },
  { id: 'myco_restore_reward', branch: 'mycologist', name: '복원술', desc: '화석 복원 보상 증가', max: 5, cost: 1, effect: { fossilRestoreRewardPct: 5 } },
  { id: 'myco_spore_cost', branch: 'mycologist', name: '전이 배양', desc: '홀씨 사용 비용 감소', max: 3, cost: 1, effect: { sporeCostReducePct: 6 } },
  { id: 'myco_keystone_restore', branch: 'mycologist', name: '핵심: 복원 전문가', desc: '화석 복원 대성공 확률 증가', max: 1, cost: 3, effect: { fossilRestoreGreatChancePct: 10 }, requireBranchPoints: 10 },
  { id: 'gem_gain', branch: 'gemEngraver', name: '젬 발견술', desc: '젬 획득량 증가', max: 5, cost: 1, effect: { gemGainPct: 5 } },
  { id: 'gem_inscription_cost', branch: 'gemEngraver', name: '각인 보존', desc: '각인 비용 감소', max: 5, cost: 1, effect: { inscriptionCostReducePct: 4 } },
  { id: 'gem_quality_cost', branch: 'gemEngraver', name: '품질 세공', desc: '젬 퀄리티 강화 비용 감소', max: 5, cost: 1, effect: { gemQualityCostReducePct: 4 } },
  { id: 'gem_awakened_drop', branch: 'gemEngraver', name: '각성 공명', desc: '각성 젬 드랍률 증가', max: 3, cost: 1, effect: { awakenedGemDropPct: 4 } },
  { id: 'gem_keystone_awakened', branch: 'gemEngraver', name: '핵심: 각성 추적', desc: '각성 젬 장기 미획득 확률 보정 증가', max: 1, cost: 3, effect: { awakenedPityBonusPct: 15 }, requireBranchPoints: 10 },
  { id: 'astro_meteor_gain', branch: 'astronomer', name: '천체 계산', desc: '운석 게이지 획득량 증가', max: 5, cost: 1, effect: { meteorGaugeGainPct: 5 } },
  { id: 'astro_anomaly_chance', branch: 'astronomer', name: '관측 숙련', desc: '이상 현상 관측 확률 증가', max: 5, cost: 1, effect: { anomalyChancePct: 3 } },
  { id: 'astro_starwedge_chance', branch: 'astronomer', name: '별쐐기 탐지', desc: '별쐐기 낙하 확률 증가', max: 5, cost: 1, effect: { starWedgeDropPct: 3 } },
  { id: 'astro_reroll_cost', branch: 'astronomer', name: '궤도 단축', desc: '별쐐기 리롤 비용 감소', max: 3, cost: 1, effect: { starWedgeRerollCostReducePct: 6 } },
  { id: 'astro_keystone_constellation', branch: 'astronomer', name: '핵심: 별자리 고정', desc: '별자리 후보 중 1개를 잠금 가능', max: 1, cost: 3, effect: { constellationLock: 1 }, requireBranchPoints: 10 },
  { id: 'bee_pollen_gain', branch: 'beekeeper', name: '꽃가루 채집', desc: '꽃가루 획득량 증가', max: 5, cost: 1, effect: { pollenGainPct: 5 } },
  { id: 'bee_hive_reward', branch: 'beekeeper', name: '벌집 확장', desc: '벌집 보상 수량 증가', max: 5, cost: 1, effect: { beehiveRewardPct: 4 } },
  { id: 'bee_honey_gain', branch: 'beekeeper', name: '꿀 농축', desc: '마력깃든 벌꿀 획득량 증가', max: 5, cost: 1, effect: { honeyGainPct: 5 } },
  { id: 'bee_wax_cost', branch: 'beekeeper', name: '밀랍 정제', desc: '밀랍 제작 비용 감소', max: 3, cost: 1, effect: { waxCostReducePct: 6 } },
  { id: 'bee_keystone_queen', branch: 'beekeeper', name: '핵심: 왕실 벌집', desc: '여왕벌 이벤트 보상 강화', max: 1, cost: 3, effect: { queenBeeRewardBonusPct: 20 }, requireBranchPoints: 10 }
];
const EXPERT_IDS = ['mycologist','gemEngraver','astronomer','beekeeper'];
const EXPERT_EXP_GUIDES = {
  mycologist: [
    '홀씨를 사용해 장비 옵션을 제작/변환/제거하면 경험치 획득',
    '화석 제작, 화석 카오스 재련, 원시/고대 화석 복원',
    '고대 미궁에서 새 최고층을 돌파하면 큰 경험치 획득',
    '루프 진행 시 기본 경험치 +60'
  ],
  gemEngraver: [
    '군주의 핵/창공의 힘으로 공격 젬 핵 강화',
    '창공 각인 슬롯 확장, 각인 부여/해제 관련 작업',
    '젬 퀄리티 강화, 보조 젬 창공 가공/등급·레벨 가공',
    '각성 젬 변환 및 각성 각인 작업',
    '루프 진행 시 기본 경험치 +60'
  ],
  astronomer: [
    '운석 낙하 지점 클리어',
    '이상 현상 관측',
    '별쐐기 제작/완성/리롤/영원 고정 작업',
    '별자리·소행성 지도 등 천문 콘텐츠 이용',
    '루프 진행 시 기본 경험치 +60'
  ],
  beekeeper: [
    '벌집 갈림길 선택 및 벌집 클리어',
    '꽃가루로 벌집 열쇠/독벌침/벌꿀/밀랍 제작',
    '밀랍/벌꿀/독벌침 등 벌 재화 사용',
    '맵핑 중 벌 이벤트 및 여왕벌 이벤트',
    '루프 진행 시 기본 경험치 +60'
  ]
};
function ensureExpertiseState(){
  let runtimeGame = (typeof game !== 'undefined' && game && typeof game === 'object') ? game : ((window.game && typeof window.game === 'object') ? window.game : JSON.parse(JSON.stringify(defaultGame)));
  game = runtimeGame;
  window.game = runtimeGame;
  let st = (runtimeGame.expertise && typeof runtimeGame.expertise === 'object') ? runtimeGame.expertise : (runtimeGame.expertise = {});
  st.levels=st.levels||{};
  st.exp=st.exp||{};
  st.nodes=st.nodes||{};
  st.unlockHistory=(st.unlockHistory&&typeof st.unlockHistory==='object')?st.unlockHistory:{};
  st.unlockedExperts=Array.isArray(st.unlockedExperts)?st.unlockedExperts:[];
  st.favors=(st.favors&&typeof st.favors==='object')?st.favors:{};
  EXPERT_IDS.forEach(id=>{
    st.levels[id]=Math.max(1,Math.min(30,Math.floor(st.levels[id]||1)));
    st.exp[id]=Math.max(0,Math.floor(st.exp[id]||0));
    st.unlockHistory[id]=Array.isArray(st.unlockHistory[id])?st.unlockHistory[id].filter(row=>row&&Number.isFinite(row.level)&&typeof row.title==='string'):[];
    let historyLevels=new Set(st.unlockHistory[id].map(row=>row.level));
    getExpertUnlocks(id).filter(row=>row.level<=st.levels[id]).forEach(row=>{
      if(!historyLevels.has(row.level)){ st.unlockHistory[id].push({level:row.level,title:row.title,desc:row.desc||'',at:0}); historyLevels.add(row.level); }
    });
  });
  st.expertPointBonus=Math.max(0,Math.floor(st.expertPointBonus||0));
  st.awakenedPity=Math.max(0,Math.floor(st.awakenedPity||0));
  st.loopExpCaps=st.loopExpCaps||{};
  const currentSeason = Math.max(1, Math.floor(runtimeGame.season || 1));
  if (!Number.isFinite(st.loopExpCaps.season)) st.loopExpCaps.season = currentSeason;
  if (st.loopExpCaps.season !== currentSeason) st.loopExpCaps = { season: currentSeason, total: {}, bySource: {} };
  return st;
}
function getExpertLevel(id){return ensureExpertiseState().levels[id]||1;}
function getExpertExp(id){return ensureExpertiseState().exp[id]||0;}
function getExpertExpReq(level){ return Math.floor(35 + level*18 + Math.pow(level,1.45)*8);}
function addExpertUnlockHistory(id, unlock, isNew){ let st=game.expertise||(game.expertise={}); st.unlockHistory=(st.unlockHistory&&typeof st.unlockHistory==='object')?st.unlockHistory:{}; if(!unlock) return; st.unlockHistory[id]=Array.isArray(st.unlockHistory[id])?st.unlockHistory[id]:[]; if(st.unlockHistory[id].some(row=>row&&row.level===unlock.level)) return; st.unlockHistory[id].push({level:unlock.level,title:unlock.title,desc:unlock.desc||'',at:isNew?Date.now():0}); st.unlockHistory[id].sort((a,b)=>a.level-b.level); if(isNew){ game.noti.expertise=true; if(typeof addLog==='function'){ let def=EXPERT_DEFS[id]||{name:id,icon:'🧠'}; addLog(`${def.icon||'🧠'} ${def.name} Lv.${unlock.level} 해금: ${unlock.title}`, 'season-up'); } } }
function getExpertUnlockHistory(id){ let st=ensureExpertiseState(); return Array.isArray(st.unlockHistory[id])?st.unlockHistory[id]:[]; }
function addExpertExp(id,amount,sourceKey,options){ let st=ensureExpertiseState(); if(!EXPERT_IDS.includes(id)) return false; if(!st.unlockedExperts.includes(id)) st.unlockedExperts.push(id); if(!game.unlocks.expertise) game.unlocks.expertise=true; let ignoreLoopCaps = !!(options && options.ignoreLoopCaps); st.loopExpCaps.total = st.loopExpCaps.total || {}; st.loopExpCaps.bySource = st.loopExpCaps.bySource || {}; st.loopExpCaps.total[id] = st.loopExpCaps.total[id] || 0; st.loopExpCaps.bySource[id] = st.loopExpCaps.bySource[id] || {}; let rule=((EXPERT_EXP_RULES[id]||{}).actions||{})[sourceKey||'']; let totalCap=Math.max(1, Math.floor(((EXPERT_EXP_RULES[id]||{}).loopCap)||250)); let sourceCap=Math.max(1, Math.floor((rule&&rule.cap)||80)); let key=sourceKey||'generic'; let usedSource=st.loopExpCaps.bySource[id][key]||0; let left=ignoreLoopCaps ? Number.POSITIVE_INFINITY : Math.max(0, Math.min(totalCap-st.loopExpCaps.total[id], sourceCap-usedSource)); let gain=Math.max(0, Math.min(left, Math.floor(amount||0))); if (gain<=0) return false; let lv=getExpertLevel(id); if(lv>=30) return false; let beforeLv=lv; st.exp[id]+=gain; if(!ignoreLoopCaps){ st.loopExpCaps.total[id]+=gain; st.loopExpCaps.bySource[id][key]=usedSource+gain; } while(st.exp[id]>=getExpertExpReq(lv) && lv<30){ st.exp[id]-=getExpertExpReq(lv); lv++; st.levels[id]=lv; } if(lv>beforeLv){ getExpertUnlocks(id).filter(u=>u.level>beforeLv&&u.level<=lv).forEach(u=>addExpertUnlockHistory(id,u,true)); } return true;}
function grantExpertExpByAction(id, actionKey){ let action=((((EXPERT_EXP_RULES[id]||{}).actions)||{})[actionKey]); if(!action) return false; return addExpertExp(id, action.exp, actionKey); }
function getExpertUnlocks(id){ return (EXPERT_DEFS[id]||{}).unlocks||[];}
function getCurrentExpertUnlock(id){ let lv=getExpertLevel(id); return getExpertUnlocks(id).filter(u=>u.level<=lv).slice(-1)[0]||null;}
function getNextExpertUnlock(id){ let lv=getExpertLevel(id); return getExpertUnlocks(id).find(u=>u.level>lv)||null;}
function getExpertPointTotal(){ let st=ensureExpertiseState(); return EXPERT_IDS.reduce((s,id)=>s+Math.max(0,getExpertLevel(id)-15),0)+(st.expertPointBonus||0);}
function getExpertPointSpent(){ let st=ensureExpertiseState(); return Object.entries(st.nodes).reduce((s,[id,l])=>{ let n=EXPERT_TREE_NODES.find(v=>v.id===id); return s+(n?Math.max(0,Math.floor(l||0))*n.cost:0)},0);}
function getExpertPointFree(){ return Math.max(0, getExpertPointTotal()-getExpertPointSpent());}
function getExpertBranchSpent(branch){ let st=ensureExpertiseState(); return Object.entries(st.nodes).reduce((s,[id,l])=>{ let n=EXPERT_TREE_NODES.find(v=>v.id===id); return s+(n&&n.branch===branch?Math.max(0,Math.floor(l||0))*n.cost:0)},0);}
function getExpertNodeEffectValue(statKey){ let st=ensureExpertiseState(); if(!statKey) return 0; return Object.entries(st.nodes).reduce((sum,[id,l])=>{ let n=EXPERT_TREE_NODES.find(v=>v.id===id); if(!n) return sum; let lv=Math.max(0,Math.floor(l||0)); if(lv<=0) return sum; let perLv=Number(((n.effect||{})[statKey])||0); return sum+(perLv*lv); },0);}
// Combined expert cost reduction = common '반복 작업'(expertCostReducePct) + a domain-specific node, capped at 75%. Returns a 0..0.75 fraction.
function getExpertCombinedCostReduction(specificStatKey){ let common=Math.max(0,getExpertNodeEffectValue('expertCostReducePct')); let specific=specificStatKey?Math.max(0,getExpertNodeEffectValue(specificStatKey)):0; return Math.min(75, common+specific)/100; }
// Awakened-gem pity: '핵심: 각성 추적'(awakenedPityBonusPct) adds chance per consecutive eligible drop that did not roll an awakened gem.
function getExpertAwakenedPity(){ return Math.max(0, Math.floor(ensureExpertiseState().awakenedPity||0)); }
function bumpExpertAwakenedPity(rolledAwakened){ let st=ensureExpertiseState(); st.awakenedPity = rolledAwakened ? 0 : (getExpertAwakenedPity()+1); return st.awakenedPity; }
function getAwakenedDropChance(baseChance){ let base=Math.max(0,Number(baseChance||0)); let bonusPct=Math.max(0,getExpertNodeEffectValue('awakenedPityBonusPct')); if(bonusPct<=0) return base; return Math.min(0.25, base + getExpertAwakenedPity()*(bonusPct/100)*0.01); }
function canAllocateExpertNode(nodeId){ let st=ensureExpertiseState(); let n=EXPERT_TREE_NODES.find(v=>v.id===nodeId); if(!n)return false; let cur=Math.max(0,Math.floor(st.nodes[nodeId]||0)); if(cur>=n.max) return false; if(getExpertPointFree()<n.cost) return false; if(n.requireBranchPoints && getExpertBranchSpent(n.branch)<n.requireBranchPoints) return false; return true;}
function allocateExpertNode(nodeId){ if(!canAllocateExpertNode(nodeId)) return false; let st=ensureExpertiseState(); st.nodes[nodeId]=Math.max(0,Math.floor(st.nodes[nodeId]||0))+1; return true;}
function isExpertKeystoneNode(n){ return !!(n && n.requireBranchPoints); }
function getExpertBranchNonKeystoneSpent(branch){ let st=ensureExpertiseState(); return Object.entries(st.nodes).reduce((s,[id,l])=>{ let n=EXPERT_TREE_NODES.find(v=>v.id===id); return s+(n&&n.branch===branch&&!isExpertKeystoneNode(n)?Math.max(0,Math.floor(l||0))*n.cost:0);},0);}
function wouldExpertKeystoneBreak(branch, nonKeystoneSpentAfter){ let st=ensureExpertiseState(); return EXPERT_TREE_NODES.some(n=>n.branch===branch&&isExpertKeystoneNode(n)&&Math.max(0,Math.floor(st.nodes[n.id]||0))>0&&nonKeystoneSpentAfter<n.requireBranchPoints);}
function canUntrainExpertNode(nodeId){ let st=ensureExpertiseState(); let n=EXPERT_TREE_NODES.find(v=>v.id===nodeId); if(!n) return false; if(Math.max(0,Math.floor(st.nodes[nodeId]||0))<=0) return false; if(!isExpertKeystoneNode(n) && wouldExpertKeystoneBreak(n.branch, getExpertBranchNonKeystoneSpent(n.branch)-n.cost)) return false; return true;}
function untrainExpertNode(nodeId){ if(!canUntrainExpertNode(nodeId)) return false; let st=ensureExpertiseState(); let next=Math.max(0,Math.floor(st.nodes[nodeId]||0))-1; if(next<=0) delete st.nodes[nodeId]; else st.nodes[nodeId]=next; return true;}
function resetExpertTree(){ ensureExpertiseState().nodes={}; }
function setExpertiseLoopCapsForSeason(season){
  let st = (game.expertise&&typeof game.expertise==='object') ? game.expertise : (game.expertise = {});
  st.loopExpCaps = { season: Math.max(1, Math.floor(season || 1)), total: {}, bySource: {} };
  return st.loopExpCaps;
}
function resetExpertiseLoopCaps(){
  return setExpertiseLoopCapsForSeason(Math.max(1, Math.floor(game.season || 1)));
}

function hasPermanentTalentTabUnlock(state) {
    if (!state || typeof state !== 'object') return false;
    if (Math.max(0, Math.floor(Number(state.talentBloomClears) || 0)) > 0) return true;
    if (Array.isArray(state.talentBloomCombos) && state.talentBloomCombos.length > 0) return true;
    if (Array.isArray(state.bloomedClasses) && state.bloomedClasses.length > 0) return true;
    if (state.talentCards && typeof state.talentCards === 'object' && Object.keys(state.talentCards).length > 0) return true;
    return false;
}

function syncPermanentTalentTabUnlock(state) {
    if (!state || typeof state !== 'object') return state;
    if (!hasPermanentTalentTabUnlock(state)) return state;
    state.unlocks = (state.unlocks && typeof state.unlocks === 'object') ? state.unlocks : {};
    state.unlocks.talent = true;
    return state;
}

function grantLoopBaseExpertExp(){
  ensureExpertiseState();
  let gained = [];
  EXPERT_IDS.forEach(id => {
    if (!ensureExpertiseState().unlockedExperts.includes(id)) return;
    let beforeLv = getExpertLevel(id);
    let loopBaseRule = ((((EXPERT_EXP_RULES[id] || {}).actions) || {}).loop_base) || {};
    if (addExpertExp(id, loopBaseRule.exp || 0, 'loop_base', { ignoreLoopCaps: true })) {
      let def = EXPERT_DEFS[id] || { name: id };
      gained.push(`${def.name} +${loopBaseRule.exp || 0}${getExpertLevel(id) > beforeLv ? ` (Lv.${getExpertLevel(id)})` : ''}`);
    }
  });
  if (gained.length > 0 && typeof addLog === 'function') addLog(`🧠 루프 기본 전문가 경험치: ${gained.join(' / ')}`, 'season-up');
  return gained;
}
function hasExpertTreeUnlocked(){ return getExpertPointTotal() > 0; }

const defaultGame = {
    saveVersion: 16,
    loopChallenge: null,
    loopChallengeHistory: [],
    level: 1,
    exp: 0,
    season: 1,
    loopCount: 0,
    woodsmanDefeatAttempts: 0,
    woodsmanSimulatorSeenLoop: false,
    woodsmanEntrancePending: false,
    woodsmanCurseActive: false,
    woodsmanCurseDamageTakenStacks: 0,
    woodsmanCurseLastTickAt: 0,
    woodsmanCurseNextLogStack: 0,
    currentZoneId: 0,
    maxZoneId: 0,
    killsInZone: 0,
    loopDeaths: 0,
    loopKills: 0,
    settings: {
        showCombatScene: true,
        showCombatLog: true,
        combatLogAggregate: true,
        combatLogRateLimit: true,
        showSpawnLog: true,
        showExpLog: true,
        showLootLog: true,
        showCrowdPauseLog: true,
        showDeathNotice: true,
        showMobileBattlePip: true,
        pauseGameOnOverlay: false,
        damageNumberFormat: 'comma',
        showExpComma: true,
        showHpComma: true,
        showEnemyHpComma: true,
        showCharacterComma: true,
        themeMode: 'dark',
        leftPaneCollapsed: false,
        combatLogCollapsed: false,
        autoSalvageEnabled: false,
        autoSalvageRarities: { normal: true, magic: true, rare: false, unique: false },
        inventoryViewRarities: { normal: true, magic: true, rare: true, unique: true },
        itemFilterEnabled: false,
        itemFilterRarities: { normal: true, magic: true, rare: true, unique: true },
        itemFilterTierThreshold: 10,
        itemFilterMinTierCount: 0,
        itemFilterMinHiddenTier: 1,
        itemFilterOnlyNewCodexUnique: false,
        autoEnterMeteor: false,
        autoEnterGrandBreach: false,
        jewelAutoSalvageEnabled: false,
        jewelAutoSalvageRarities: { normal: false, magic: false, rare: false, unique: false },
        mapCompleteAction: 'nextZone',
        townReturnAction: 'retry',
        notiFilters: { char: true, season: true, items: true, skills: true, map: true, codex: true, traits: true, talisman: true, cube: true, jewel: true, journal: true, currency: true, fossil: true, ascend: true, loop: true }
    },
    selectedHeroId: 'hero1',
    appearanceHeroId: null,
    discoveredHeroIds: [],
    heroSelectionInitialized: false,
    heroFreeSwitchUnlocked: false,
    talentBloomClears: 0,
    talentBloomCombos: [],
    bloomedClasses: [],
    talentCards: {},
    talentCardLoadout: [null, null, null, null, null, null],
    bloomTrialRegenSuppress: 0,
    pendingLoopHeroSelection: false,
    unlockedMonsterSkins: {},
    selectedMonsterSkin: null,
    passivePoints: 0,
    playerHp: 100,
    playerEnergyShield: 0,
    moveTimer: 0,
    moveTotalTime: 0,
    isTownReturning: false,
    combatHalted: false,
    inTicketBossFight: false,
    runProgress: 0,
    encounterIndex: 0,
    encounterPlan: [],
    enemies: [],
    playerAilments: [],
    playerLeechInstances: [],
    nextEnemyId: 1,
    summons: [],
    summonSeq: 1,
    passives: [],
    discoveredPassives: [],
    passiveLayoutVersion: PASSIVE_LAYOUT_VERSION,
    passiveStarEvolution: false,
    skills: ['기본 공격'],
    activeSkill: '기본 공격',
    equippedSummonSkills: [],
    summonSkillCounts: {},
    summonLoadoutInitialized: false,
    gemData: { '기본 공격': { level: 1, exp: 0 } },
    supports: [],
    sealedSkills: [],
    sealedSupports: [],
    resonancePower: 10,
    equippedSupports: [],
    supportGemData: {},
    itemSubtab: 'item-tab-equip',
    skillSubtab: 'skill-tab-equip',
    skillAutoRules: [],
    conditionGemUnlocked: false,
    conditionGemPool: [],
    conditionGemLevels: {},
    pendingConditionGemChoices: null,
    clearedRootBosses: [],
    mapSubtab: 'map-tab-zones',
    mapExploreSubtab: 'map-explore-hunting',
    gemFoldInactiveAttack: false,
    gemFoldInactiveSupport: false,
    autoRepeatSeasonBoss: false,
    talismanUnlocked: false,
    talismanBoardUnlock: 3,
    talismanUnlockedCells: [],
    talismanInventory: [],
    talismanBoard: [],
    talismanPlacements: {},
    talismanSelectedId: null,
    talismanUnseal: null,
    talismanUnlockPickMode: false,
    equipment: { '무기': null, '투구': null, '갑옷': null, '방패': null, '장갑1': null, '장갑2': null, '신발': null, '목걸이': null, '반지1': null, '반지2': null, '허리띠': null },
    inventory: [],
    inventoryExpandLevel: 0,
    jewelInventoryExpandLevel: 0,
    chaosInfuserUnlocked: false,
    abyssPassivePoints: 0,
    abyssClearedDepths: [],
    abyssPassives: { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 },
    currencies: { transmute: 0, augment: 0, alteration: 0, alchemy: 0, exalted: 0, regal: 0, chaos: 0, divine: 0, scour: 0, blessing: 0, bossKeyFlame: 0, bossKeyFrost: 0, bossKeyStorm: 0, beastKeyCerberus: 0, bossCore: 0, fossil: 0, fossilPrimal: 0, fossilAncientPrimal: 0, fossilPrimordial: 0, fossilJagged: 0, fossilBound: 0, fossilGale: 0, fossilPrismatic: 0, fossilAbyssal: 0, fossilBulwark: 0, fossilWedge: 0, fossilOld: 0, fossilRift: 0, deepWhetstone: 0, rootIron: 0, jewelPolish: 0, uberRootTicketFlame: 0, uberRootTicketFrost: 0, uberRootTicketStorm: 0, uberRootTicketChaos: 0, runeShard: 0, skyEssence: 0, tainted: 0, jewelCore: 0, jewelShard: 0, sealShard: 0, strongSealShard: 0, radiantSealShard: 0, meteorShard: 0, astralCore: 0, incompleteStarWedge: 0, starWedge: 0 , hiveKey: 0, colonyTrace: 0, colonyShard: 0, hiveTrace: 0, enchantedHoney: 0, venomStinger: 0, pollen: 0, beeswax: 0, starDust: 0, awakenedEcho: 0, voidChisel: 0, sporeFire: 0, sporeCold: 0, sporeLight: 0, underCopper: 0, underSilver: 0, underGold: 0, condensedSkyPower: 0 },
    ascendClass: null,
    ascendPoints: 0,
    ascendKeystonePoints: 0,
    ascendRank: 0,
    ascendNodes: [],
    ascendKeystones: [],
    completedTrials: [],
    unlockedTrials: [],
    seasonPoints: 0,
    loopDeepPoints: 0,
    woodsmanPendingScore: 0,
    woodsmanLifetimeScore: 0,
    woodsmanSettledScore: 0,
    woodsmanEchoRun: { active: false, timeLeft: 0, duration: 30, lastTickAt: 0, totalDamage: 0, bestDps: 0 },
    seasonNodes: [],
    seasonNodeLevels: {},
    labyrinthFloor: 1,
    jewelInventory: [],
    jewelSlots: [null, null],
    jewelSlotAmplify: [0, 0],
    beehive: { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0 },
    colony: { inRun: false, wave: 0, kills: 0, requiredKills: 0, rewardPending: false, wardInventory: [], wardEquipped: [null,null,null,null], wardSlots: 1, wardSlotVersion: 1 },
    voidRift: { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 },
    sporeCraftModes: {},
    shrineState: { active: null, nextRollAt: 0 },
    shrineBuff: null,
    challengeContract: { enemyPower: false, fragileArmor: false, shortHunt: false, greedPact: false, enabled: false },
    blackMarket: { nextRefreshAt: 0, extraSlots: 0, offers: [] },
    loop10ChaosStayEnabled: false,
    loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
    abyssEndlessDepth: 20,
    abyssUnlockedDepths: [20],
    loopDeepStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 },
    loopProgressBase: { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] },
    loopProgressCurrent: { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 },
    chaosRealm: createDefaultChaosRealmState(),
    skyTower: createDefaultSkyTowerState(),
    underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null], enhanceLvByNo: {}, bonusLinesByNo: {} },
    underworldProgress: { highestFloor: 1, currentFloor: 1 },
    ocean: createDefaultOceanState(),
    coreCube: { unlocked: false, everUnlocked: false, relockUntilDrop: false, unlockNoticeSeen: false, selectedFace: 0, blurred45: 0, powers: {}, faces: [null, null, null, null, null, null], completed: false, isCompleting: false, revealedOptions: [], optionMechanism: null, lastPower: null },
    pendingLoopDecision: false,
    pendingLoopReady: false,

    skyGemEnhancements: {},
    recentDamageEvents: [],
    lastDeathLog: null,
    unlockedSeasonContents: ['season_1'],
    seenSeasonContentNotices: ['season_1'],
    seenTutorials: [],
    journalEntries: ['prologue'],
    journalBonuses: [],
    journalBonusClaims: {},
    claimableActRewards: [],
    claimedActRewards: [],
    actRewardBonuses: [],
    seasonChaseUniqueDropped: false,
    seasonChaseUniqueDrops: [],
    gemEnhanceUnlocked: false,
    gemEnhanceTargetSkill: null,
    uniqueCodex: {},
    codexNewlyRegistered: {},
    codexCollapsedSlots: {},
    codexSubtab: 'main',
    codexSelectedSlot: '무기',
    uniqueCodexCompletedRewardClaimed: false,
    starWedge: {
        unlocked: false,
        unlockNoticeSeen: false,
        skyRiftGauge: 0,
        skyRiftReady: false,
        skyRiftMinTier: null,
        skyRiftAllCosmos: false,
        activeMeteorTier: null,
        meteorReturnZoneId: null,
        lastAnomalyAt: 0,
        skyRiftCarryGauge: 0,
        constellationBuff: null,
        entriesCleared: 0,
        firstClearDone: false,
        wedges: [],
        sockets: [],
        nodeMutations: {},
        selectedWedgeId: null
    },
    saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null },
    unlocks: { char: false, season: false, items: false, map: false, skills: false, codex: false, traits: false, talent: false, talisman: false, cube: false, expertise: false, jewel: false },
    noti: { char: false, season: false, items: false, skills: false, map: false, codex: false, traits: false, talisman: false, cube: false, expertise: false, jewel: false, journal: false, currency: false, fossil: false, ascend: false, loop: false },
    expertise: { levels: { mycologist:1, gemEngraver:1, astronomer:1, beekeeper:1 }, exp: { mycologist:0, gemEngraver:0, astronomer:0, beekeeper:0 }, nodes: {}, unlockedExperts: [], unlockHistory: {}, favors: {}, expertPointBonus: 0, loopExpCaps: {} }
};


safeExposeGlobals({ defaultGame, hasPermanentTalentTabUnlock, syncPermanentTalentTabUnlock });

// Phase-4 extracted progression math helpers.
function getExpReq(level) {
    let lv = Math.max(1, Math.floor(level || 1));
    if (lv <= 10) return Math.floor((24 + Math.pow(lv, 1.34) * 14) * 4);
    if (lv <= 20) return Math.floor((24 + Math.pow(lv, 1.34) * 14) * 2);
    let base20 = Math.floor(24 + Math.pow(20, 1.34) * 14);
    if (lv <= 50) return Math.floor(base20 + 90 * Math.pow(lv - 20, 1.42));
    let base50 = Math.floor(base20 + 90 * Math.pow(30, 1.42));
    if (lv <= 100) return Math.floor(base50 + 252 * Math.pow(lv - 50, 1.55));
    let base100 = Math.floor(base50 + 252 * Math.pow(50, 1.55));
    let delta = lv - 100;
    return base100 + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
}
function getGemReqExp(level) { return Math.floor(100 * Math.pow(1.3, level - 1)); }
function normalizeGemRecord(raw) {
    if (!raw || typeof raw !== 'object') return { level: 1, exp: 0, bossCoreLevel: 0, skyCoreLevel: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    let bossCoreLevel = Number.isFinite(raw.bossCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.bossCoreLevel))) : 0;
    let skyCoreLevel = Number.isFinite(raw.skyCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.skyCoreLevel))) : 0;
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level: level, exp: exp, bossCoreLevel: bossCoreLevel, skyCoreLevel: skyCoreLevel, skyEnhanceCap: skyEnhanceCap, unlockedTier: unlockedTier, activeTier: activeTier, quality: quality, awakened: awakened };
}


safeExposeGlobals({ getExpReq, getGemReqExp, normalizeGemRecord, EXPERT_DEFS, EXPERT_EXP_GUIDES, EXPERT_TREE_NODES, ensureExpertiseState, getExpertLevel, getExpertExp, addExpertExp, getExpertUnlocks, getExpertUnlockHistory, getCurrentExpertUnlock, getNextExpertUnlock, getExpertPointTotal, getExpertPointSpent, getExpertPointFree, getExpertBranchSpent, getExpertNodeEffectValue, getExpertCombinedCostReduction, getAwakenedDropChance, bumpExpertAwakenedPity, canAllocateExpertNode, allocateExpertNode, canUntrainExpertNode, untrainExpertNode, resetExpertTree, hasExpertTreeUnlocked, resetExpertiseLoopCaps, EXPERT_EXP_RULES, grantExpertExpByAction, grantLoopBaseExpertExp, EXPERT_FAVOR_OPTIONS, getExpertFavorOptions, getSelectedExpertFavor, setSelectedExpertFavor, getExpertFavorEffectTotals });
