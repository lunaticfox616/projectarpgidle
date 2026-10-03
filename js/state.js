/**
 * @typedef {object} ActExplorationPendingLoot
 * @property {number} version Schema version (8).
 * @property {'pending'|'claimed'|'lost'} phase
 * @property {Record<string,number>} currencies Already resolved canonical currency gains.
 * @property {Array<{id:number,name:string,slot:string,baseStats:Array<{id:string,val:number}>,stats:Array<{id:string,val:number}>}>} equipment
 * @property {Array<{id:number,name:string,lines:Array<{id:string,value:number}>}>} cores Core items, unavailable until claimed.
 * @property {Array<{item:ActExplorationPendingLoot['equipment'][number],rewards:Record<string,number>}>} salvagedEquipment Last recoverable equipment, unavailable until clear. Rewards are original salvage costs.
 * @property {Array<{id:number,name:string,rarity:string,stats:Array<{id:string,val:number}>}>} jewels
 * @property {Array<{kind:'attack',name:string,awakened:boolean}|{kind:'support',name:string,tier:number}>} gems Exact drop unlocks, not snapshots of live leveled records.
 */
/**
 * @typedef {object} ActExplorationRun Saved authored act exploration, null in special arenas.
 * @property {number} version Schema version (1).
 * @property {number} act Story act 1..10; zoneId is act minus one.
 * @property {number} zoneId
 * @property {string} layoutId Authored preset identity, never randomised at restore.
 * @property {'active'|'cleared'|'failed'} status
 * @property {boolean} completionApplied Existing story/zone completion has been applied once.
 * @property {null|{zoneId:number,remainingMs:number}} departure Already-selected automatic exit after presentation; never another reward claim.
 * @property {ActExplorationPendingLoot} loot Already resolved rewards, inaccessible until boss completion.
 * @property {number} motionTimeMs Last processed 20 ms exploration movement step, in combat time.
 * @property {'north'|'south'|'east'|'west'} motionDirection Current walking direction.
 * @property {null|{from:{gx:number,gy:number},to:{gx:number,gy:number},startedAt:number,elapsed:number,duration:number}} motion Saved movement in milliseconds; the hit cell changes halfway.
 * @property {'direct'|'full'|'manual'} mode
 * @property {{gx:number,gy:number}|null} destination Integer map tile.
 * @property {number[]} discovered Row-major tile indices, including visible wall borders.
 * @property {string[]} visitedRooms Internal room ids (not player-facing room names).
 * @property {Array<{key:string,roomId:string,stage:number|null,aliveIds:number[],eliteIds:number[],waiting:Enemy[]}>} packs
 * Waiting records move into game.enemies at engagement. aliveIds includes both owners;
 * dead ids are removed once by the death handler. Boss stages are zero-based and sequential.
 */
// Central runtime namespace/state bridge (phase 2).
function getPassiveEquipmentRestriction(item, state = game) {
    if (!item) return '';
    const rule = PASSIVE_EQUIPMENT_RESTRICTIONS.find(entry =>
        entry.slot === item.slot && (state.passives || []).includes(entry.nodeId));
    return rule ? rule.reason : '';
}

/** Return prohibited equipment to owned inventory, including overflow recovery, without discarding items. */
function enforcePassiveEquipmentRestrictions(state = game) {
    let moved = 0;
    Object.entries(state.equipment).forEach(([slot, item]) => {
        if (!getPassiveEquipmentRestriction(item, state)) return;
        if (!state.inventory.includes(item)) state.inventory.push(item);
        state.equipment[slot] = null;
        moved++;
    });
    return moved;
}

// Keeps global compatibility while giving each module a stable anchor.
window.GameModules = window.GameModules || {};
window.GameState = window.GameState || {
  get game() { return window.game; },
  set game(v) { window.game = v; },
  get defaultGame() { return window.defaultGame; }
};
window.GameModules.state = window.GameState;

// Transient notices: domains enqueue data; the foreground UI decides when to present it.
let tutorialQueue = [];
// 같은 안내의 두 이름: 새 캐릭터의 시작 안내(tutorial_first_*)를 본 사람에게 루프 2의 탭 해금 안내(unlock_*)가 '처음 얻었습니다'를
// 다시 띄웠다(검토 5차).
const TUTORIAL_SEEN_ALIASES = Object.freeze({ unlock_items: 'tutorial_first_gear', unlock_char: 'tutorial_first_passive' });
/** target: a sub-tab id, or { subtabId, contentId, openLabel } for unlock cards (contentUnlockUi.announceContent). */
function queueTutorialNotice(key, title, body, tabId, target) {
    if (game.isBackgroundCalculation) return;
    game.seenTutorials = game.seenTutorials || [];
    if (game.seenTutorials.includes(key) || game.seenTutorials.includes(TUTORIAL_SEEN_ALIASES[key])) return;
    game.seenTutorials.push(key);
    const extra = target && typeof target === 'object' ? target : { subtabId: target };
    tutorialQueue.push({ ...extra, key, title, body, tabId: tabId || null, subtabId: extra.subtabId || null });
}
/** A notice about content bought in 해금 (talent, …): before it is bought, the card says where to buy it and
 * points at 해금 — a card aimed at a closed screen would be dropped unseen. bodies = { open, locked }. */
function queueContentNotice(key, title, contentId, bodies, route) {
    const opened = typeof contentProgression !== 'object' || contentProgression.isUnlocked(contentId);
    queueTutorialNotice(key, title, opened ? bodies.open : bodies.locked, opened ? route : 'tab-unlocks');
}

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
function getUnderworldTier(floor) {
    let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
    let deepFloor = UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
    let tierGain = Math.max(0, safeFloor - deepFloor) * UNDERWORLD_DIFFICULTY_CONFIG.tierGainPerFloorAfterDeep;
    return getChaosRealmTier(30) + tierGain;
}
function getUnderworldGravityActionMultiplier(floor, reductionPct) {
    let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
    let reduction = Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
    let baseSlow = Math.min(0.75, 0.12 + Math.max(0, safeFloor - 1) * 0.018) * (1 - reduction);
    let deepFloors = Math.max(0, safeFloor - UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor);
    let deepMultiplier = Math.pow(1 - UNDERWORLD_DIFFICULTY_CONFIG.gravityActionLossPerFloorAfterDeep, deepFloors);
    return Math.max(0.0001, (1 - baseSlow) * deepMultiplier);
}
/** Base HP loss per 100 ms, before conditional talent mitigation and temporary shields. */
function getUnderworldLifeDrainPerTick(maxHp, floor, reductionPct) {
    if (floor < 15) return 0;
    const fraction = floor >= 40 ? 0.02 : (floor >= 30 ? 0.015 : 0.01);
    const mitigation = 1 - Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
    return Math.max(1, Math.floor((maxHp || 1) * fraction * mitigation));
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

function hasCurrentLoopChaos20Clear(source) {
    let state = source || game;
    return !!(state && state.loopProgressCurrent && state.loopProgressCurrent.chaos20Cleared)
        || (Array.isArray(state && state.abyssClearedDepths) && state.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
}
function canEnterChaosRealm() {
    return !!ensureChaosRealmState().unlocked && hasCurrentLoopChaos20Clear();
}
function getUnderworldEntryLockReason(source) {
    let state = source || game;
    let chaosRealm = state && state.chaosRealm;
    if (!(chaosRealm && chaosRealm.unlocked)) return '혼돈계 해금 필요';
    if (!hasCurrentLoopChaos20Clear(state)) return '이번 루프 혼돈 20 클리어 필요';
    let rootBosses = Array.isArray(state && state.clearedRootBosses) ? state.clearedRootBosses : [];
    if (!rootBosses.includes('s6_beast_cerberus')) return '케르베로스 처치 필요';
    let deepMax = getHighestUnlockedEndlessChaosDepth(state);
    if (deepMax < 30) return `혼돈 심화 30층 필요 (현재 ${deepMax})`;
    let labFloor = Math.max(1, Math.floor((state && state.labyrinthUnlockedMaxFloor) || (state && state.labyrinthFloor) || 1));
    if (labFloor < 100) return `고대 미궁 100층 필요 (현재 ${labFloor})`;
    return '';
}
function canEnterUnderworld() {
    return getUnderworldEntryLockReason(game) === '';
}
function isUnderworldUnlockReady(source) {
    let state = source || game;
    let progress = state && state.underworldProgress;
    let runes = state && state.underworldRunes;
    let hasProgress = Math.max(1, Math.floor((progress && progress.highestFloor) || 1)) > 1
        || !!(progress && progress.floor10Cleared)
        || Math.max(0, Math.floor((runes && runes.unlockedSlots) || 0)) > 0;
    if (hasProgress) return true;
    let chaosRealm = state && state.chaosRealm;
    let rootBosses = Array.isArray(state && state.clearedRootBosses) ? state.clearedRootBosses : [];
    let labFloor = Math.max(1, Math.floor((state && state.labyrinthUnlockedMaxFloor) || (state && state.labyrinthFloor) || 1));
    return !!(chaosRealm && chaosRealm.unlocked) && rootBosses.includes('s6_beast_cerberus')
        && getHighestUnlockedEndlessChaosDepth(state) >= 30 && labFloor >= 100;
}
function isCosmosContentUnlockReady(source) {
    let state = source || game;
    let atlas = state && state.cosmosAtlas;
    let hasAtlasProgress = !!(atlas && atlas.unlocked)
        || (Array.isArray(atlas && atlas.cleared) && atlas.cleared.length > 0)
        || (Array.isArray(atlas && atlas.bossClears) && atlas.bossClears.length > 0);
    if (hasAtlasProgress) return true;
    let journal = Array.isArray(state && state.journalEntries) ? state.journalEntries : [];
    let underworld = state && state.underworldProgress;
    let highestFloor = Math.max(1, Math.floor((underworld && underworld.highestFloor) || 1));
    return journal.includes('woodsman') && highestFloor >= 30;
}

function isMapPrimaryContentUnlockReady(contentId, source) {
    let state = source || game;
    if (contentId === 'map-tab-zones') return true;
    if (contentId === 'map-tab-pvp') return state.season >= MAP_PRIMARY_CONTENTS.find(entry => entry.id === contentId).unlockLoop;
    if (contentId === 'map-tab-chaos-realm') return !!(state && state.chaosRealm && state.chaosRealm.unlocked);
    if (contentId === 'map-tab-sky') return !!(state && state.skyTower && state.skyTower.unlocked);
    if (contentId === 'map-tab-underworld') return isUnderworldUnlockReady(state);
    if (contentId === 'map-tab-cosmos') return isCosmosContentUnlockReady(state);
    if (contentId === 'map-tab-ocean' || contentId === 'map-tab-fishing') {
        return !!(state && state.ocean && state.ocean.unlocked) || Math.max(1, Math.floor((state && state.season) || 1)) >= OCEAN_UNLOCK_LOOP;
    }
    return false;
}

function isMapPrimaryContentUnlocked(source, contentId) {
    let unlocked = Array.isArray(source && source.unlockedMapContents) ? source.unlockedMapContents : [];
    if (contentId === 'map-tab-pvp' && !isMapPrimaryContentUnlockReady(contentId, source)) return false;
    return unlocked.includes(contentId);
}

function reconcileMapPrimaryContentUnlocks(source) {
    if (!source || typeof source !== 'object') return [];
    let validIds = new Set(MAP_PRIMARY_CONTENTS.map(def => def.id));
    let savedIds = Array.isArray(source.unlockedMapContents) ? source.unlockedMapContents : [];
    let unlocked = new Set(savedIds.filter(id => validIds.has(id)));
    if (!isMapPrimaryContentUnlockReady('map-tab-pvp', source)) unlocked.delete('map-tab-pvp');
    let newlyUnlocked = [];
    MAP_PRIMARY_CONTENTS.forEach(def => {
        if (unlocked.has(def.id) || !isMapPrimaryContentUnlockReady(def.id, source)) return;
        unlocked.add(def.id);
        newlyUnlocked.push(def.id);
    });
    source.unlockedMapContents = MAP_PRIMARY_CONTENTS.map(def => def.id).filter(id => unlocked.has(id));
    return newlyUnlocked;
}

function getMapPrimaryContentEntryCondition(contentId, source) {
    let state = source || game;
    if (!isMapPrimaryContentUnlocked(state, contentId)) return '';
    if (contentId === 'map-tab-chaos-realm' && !hasCurrentLoopChaos20Clear(state)) return '혼돈 20 필요';
    if (contentId === 'map-tab-sky' && !hasCurrentLoopChaosAccess(state)) return '혼돈 진입 필요';
    if (contentId === 'map-tab-underworld') return getUnderworldEntryLockReason(state);
    return '';
}


const OCEAN_PERMANENT_UPGRADE_DEFS = {
    oxygenMax: { label: '산소 최대치', maxLevel: 20, valuePerLevel: 10, unit: '', desc: '잠수 시작 산소와 최대 산소가 증가합니다.' },
    oxygenSaving: { label: '산소 소모 감소', maxLevel: 20, valuePerLevel: 3, unit: '%', desc: '잠수 중 시간 경과로 소모되는 산소가 감소합니다.' },
    pressureResist: { label: '수압 패널티 감소', maxLevel: 20, valuePerLevel: 4, unit: '%', desc: '심해 수압으로 인한 공속/피해/이속 감소가 완화됩니다.' }
};
const OCEAN_PERMANENT_UPGRADE_KEYS = Object.keys(OCEAN_PERMANENT_UPGRADE_DEFS);
const OCEAN_STATE_FISH_KEYS = Object.freeze(Object.keys(OCEAN_FISH_DB));
const OCEAN_COLLECTION_REQUIRED_COUNTS = Object.freeze(OCEAN_FISH_COLLECTION_MILESTONES.map(row => row.required));
const OCEAN_NORMALIZED_FISHING_STATES = new WeakSet();

const OCEAN_CURRENT_POOL = [
    { id: 'cold_current', name: '냉수층', desc: '냉기 적 출현 · 냉기 저항 -12' },
    { id: 'warm_current', name: '온수층', desc: '화염 적 출현 · 화염 저항 -12' },
    { id: 'riptide', name: '역류', desc: '이동 속도 15% 감폭' },
    { id: 'bioluminescence', name: '발광 생물군', desc: '정확도 18% 감폭' },
    { id: 'still_water', name: '정체수', desc: '산소 시간 소모 35% 증가' },
    { id: 'school_of_fish', name: '물고기 떼', desc: '낚시 게이지 획득 50% 증가' }
];
function getOceanCurrentAffixes(depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let count = Math.min(OCEAN_CURRENT_POOL.length, 1 + Math.floor(safeTier / 3));
    let start = Math.abs(hashSeed('oceanCurrent:' + safeTier)) % OCEAN_CURRENT_POOL.length;
    let out = [];
    for (let i = 0; i < OCEAN_CURRENT_POOL.length && out.length < count; i++) {
        let affix = OCEAN_CURRENT_POOL[(start + (i * 5)) % OCEAN_CURRENT_POOL.length];
        if (!out.some(row => row.id === affix.id)) out.push({ ...affix });
    }
    return out;
}
function hasOceanCurrent(zone, currentId) {
    return !!(zone && Array.isArray(zone.currents) && zone.currents.some(current => current && current.id === currentId));
}
function getColonyWaveEnemyCount(wave) {
    return Math.max(12, Math.min(36, 10 + Math.max(1, Math.floor(wave || 1)) * 2));
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
        fishingStrategy: 'balanced',
        rareFishPity: 0,
        reefInstalled: 0,
        fishStock: {},
        fishCaughtTotal: {},
        claimedCollectionMilestones: [],
        lastCatch: null,
        diving: false,
        lastTickAt: 0,
        bossClearM: 0,
        permanentUpgrades: { oxygenMax: 0, oxygenSaving: 0, pressureResist: 0 }
    };
}
function getOceanPermanentUpgradeLevel(key) {
    let upgrades = (game && game.ocean && game.ocean.permanentUpgrades && typeof game.ocean.permanentUpgrades === 'object') ? game.ocean.permanentUpgrades : {};
    let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return 0;
    return Math.max(0, Math.min(def.maxLevel, Math.floor(upgrades[key] || 0)));
}
function getOceanPermanentUpgradeEffect(key) {
    let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return 0;
    return getOceanPermanentUpgradeLevel(key) * def.valuePerLevel;
}
function ensureOceanPermanentUpgrades(st) {
    st.permanentUpgrades = (st.permanentUpgrades && typeof st.permanentUpgrades === 'object') ? st.permanentUpgrades : {};
    OCEAN_PERMANENT_UPGRADE_KEYS.forEach(key => {
        st.permanentUpgrades[key] = Math.max(0, Math.min(OCEAN_PERMANENT_UPGRADE_DEFS[key].maxLevel, Math.floor(st.permanentUpgrades[key] || 0)));
    });
}
const normalizeOceanFishingProgress = function (st) {
    st.fishStock = (st.fishStock && typeof st.fishStock === 'object' && !Array.isArray(st.fishStock)) ? st.fishStock : {};
    let hasCaughtHistory = !!(st.fishCaughtTotal && typeof st.fishCaughtTotal === 'object' && !Array.isArray(st.fishCaughtTotal));
    let caught = hasCaughtHistory ? st.fishCaughtTotal : st.fishStock;
    if (!hasCaughtHistory) st.fishCaughtTotal = {};
    OCEAN_STATE_FISH_KEYS.forEach(key => {
        let stock = Math.max(0, Math.floor(Number(st.fishStock[key]) || 0));
        let total = Math.max(0, Math.floor(Number(caught[key]) || 0));
        st.fishStock[key] = stock;
        st.fishCaughtTotal[key] = Math.max(stock, total);
    });
    let claims = st.claimedCollectionMilestones;
    let validClaims = Array.isArray(claims) && claims.every((value, index) => Number.isInteger(value)
        && OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value) && claims.indexOf(value) === index);
    if (!validClaims) {
        let sourceClaims = Array.isArray(claims) ? claims : [];
        st.claimedCollectionMilestones = Array.from(new Set(sourceClaims.map(value => Math.floor(value || 0))))
            .filter(value => OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value));
    }
    if (!st.lastCatch || !OCEAN_FISH_DB[st.lastCatch.key]) st.lastCatch = null;
    else {
        st.lastCatch.at = Math.max(0, Math.floor(st.lastCatch.at || 0));
        st.lastCatch.guaranteed = !!st.lastCatch.guaranteed;
    }
    OCEAN_NORMALIZED_FISHING_STATES.add(st);
};

function mergeOceanState(savedOcean) {
    let source = savedOcean && typeof savedOcean === 'object' && !Array.isArray(savedOcean) ? savedOcean : {};
    let merged = { ...createDefaultOceanState(), ...source };
    merged.permanentUpgrades = { ...createDefaultOceanState().permanentUpgrades, ...(source.permanentUpgrades || {}) };
    ensureOceanPermanentUpgrades(merged);
    if (!Object.prototype.hasOwnProperty.call(source, 'fishCaughtTotal')) merged.fishCaughtTotal = null;
    normalizeOceanFishingProgress(merged);
    return merged;
}

function ensureOceanState() {
    let st = (game && game.ocean && typeof game.ocean === 'object') ? game.ocean : (game.ocean = createDefaultOceanState());
    st.unlocked = !!st.unlocked;
    // 수심은 짧은 프레임 간격에도 누적되어야 한다. 여기서 매번 정수로 내리면
    // 0.1~0.3m씩 들어오는 시간 기반 진행이 전부 사라지고 전투 종료 보너스만 보인다.
    st.depthM = Math.max(0, Number(st.depthM) || 0);
    st.checkpointM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.bossClearM = Math.max(0, Math.floor(st.bossClearM || 0));
    ensureOceanPermanentUpgrades(st);
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, Number.isFinite(st.oxygenCur) ? st.oxygenCur : st.oxygenMax));
    st.pressureLevel = Math.max(0, Math.floor(st.pressureLevel || 0));
    st.fishingGauge = Math.max(0, Math.min(100, Number(st.fishingGauge) || 0));
    st.fishingStrategy = OCEAN_FISHING_STRATEGIES[st.fishingStrategy] ? st.fishingStrategy : 'balanced';
    st.rareFishPity = Math.max(0, Math.min(100, Number(st.rareFishPity) || 0));
    st.reefInstalled = Math.max(0, Math.min(10, Math.floor(st.reefInstalled || 0)));
    if (!OCEAN_NORMALIZED_FISHING_STATES.has(st)) normalizeOceanFishingProgress(st);
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
    // 산소 최대치는 영구 심해 업그레이드로만 증가합니다.
    return 100 + getOceanPermanentUpgradeEffect('oxygenMax');
}
function getOceanOxygenSavingPct() {
    return Math.max(0, Math.min(60, getOceanPermanentUpgradeEffect('oxygenSaving')));
}
function getOceanPressureResistUpgradePct() {
    return Math.max(0, Math.min(80, getOceanPermanentUpgradeEffect('pressureResist')));
}
function getOceanOxygenDrainPerSec() {
    // 산소 소모는 시간 기반입니다. 이동 속도는 더 이상 산소 소모를 늘리지 않습니다
    // (이속이 높을수록 도달 수심이 오히려 줄어들던 역설을 제거).
    let base = 0.5 * (1 - getOceanOxygenSavingPct() / 100);
    // 수압 과부하: 깊이 내려갈수록 산소 소모가 가속됩니다(최대 +100%). 수압 저항 영구 업그레이드로 완화됩니다.
    let depthTier = getOceanDepthTier((game && game.ocean && game.ocean.depthM) || 0);
    let pressureResistPct = Math.max(0, Math.min(80, getOceanPressureResistUpgradePct()));
    let pressureDrainMul = 1 + Math.min(1.0, depthTier * 0.07) * (1 - pressureResistPct / 100);
    if (getOceanCurrentAffixes(depthTier).some(current => current.id === 'still_water')) pressureDrainMul *= 1.35;
    return Math.max(0.1, base * pressureDrainMul);
}
function getOceanOxygenPerAttackCost() {
    // 산소는 잠수 시간으로만 소모한다. 타격당 비용은 공속 10 빌드를 같은 DPS의
    // 느린 빌드보다 열 배 불리하게 만들어 심해 진행 자체를 막았으므로 폐지했다.
    return 0;
}
function getOceanDepthTier(depthM) {
    return Math.floor(Math.max(0, Math.floor(depthM || 0)) / 100);
}
function getOceanBossBoundaryInterval() {
    // 심해 가디언(보스)이 등장하는 수심 간격(m).
    return 500;
}
function getOceanPendingBossBoundary(st) {
    // 다음 보스 경계에 도달했고 아직 처치하지 않았다면 그 경계 수심을 반환한다(없으면 0).
    if (!st) return 0;
    let interval = getOceanBossBoundaryInterval();
    let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
    let nextBoundary = Math.floor(cleared / interval) * interval + interval;
    return (Math.floor(Math.max(0, Number(st.depthM) || 0)) >= nextBoundary) ? nextBoundary : 0;
}
function getOceanMoveSpeedDepthBonus() {
    // 이동 속도가 빠를수록 한 번에 더 깊이 전진합니다(산소 소모와는 무관, 최대 +50%).
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
function hasCurrentLoopChaosAccess(source) {
    let state = source || game;
    if (hasCurrentLoopChaos20Clear(state)) return true;
    if (!state) return false;
    let maxZone = Number.isFinite(state.maxZoneId) ? state.maxZoneId : 0;
    if (maxZone >= ABYSS_START_ZONE_ID) return true;
    if (Array.isArray(state.abyssClearedDepths) && state.abyssClearedDepths.length > 0) return true;
    let currentDepth = typeof state.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(state.currentZoneId) : 0;
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

function getTimeRiftEquivalentChaosDepth(pressure) {
    let safePressure = Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, Math.floor(Number(pressure) || 1)));
    return TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS[safePressure - 1];
}

function getTimeRiftDifficultyTier(pressure) {
    let equivalentDepth = getTimeRiftEquivalentChaosDepth(pressure);
    return getAbyssZoneTier(1) + equivalentDepth - 1;
}












function getMeteorSiteUnlockReady() {
    return (game.season || 1) >= METEOR_SITE_UNLOCK_LOOP && (game.maxZoneId || 0) >= METEOR_SITE_UNLOCK_ACT;
}

function getClearedSkyTowerFloor(source) {
    const tower = source && source.skyTower && typeof source.skyTower === 'object' ? source.skyTower : {};
    const cleared = Array.isArray(tower.clearedFloors) ? tower.clearedFloors : [];
    const recorded = cleared.reduce((highest, floor) => Math.max(highest, Math.floor(Number(floor) || 0)), 0);
    return Math.max(recorded, Math.max(0, Math.floor(Number(tower.highestFloor) || 1) - 1));
}

function getPinnacleRequirementProgress(requirement, source) {
    const target = Math.max(1, Math.floor(Number(requirement && requirement.target) || 1));
    if (!source || !requirement) return { met: false, current: 0, target, label: '진행 정보 없음' };
    if (requirement.kind === 'underworldFloor') {
        const progress = source.underworldProgress && typeof source.underworldProgress === 'object' ? source.underworldProgress : {};
        const current = Math.max(0, Math.floor(Number(progress.highestFloor) || 1) - 1);
        return { met: current >= target, current, target, label: `지하계 ${current}/${target}층` };
    }
    if (requirement.kind === 'oceanDepth') {
        const ocean = source.ocean && typeof source.ocean === 'object' ? source.ocean : {};
        const current = Math.max(0, Math.floor(Number(ocean.bossClearM) || 0));
        return { met: current >= target, current, target, label: `심해 가디언 ${current}/${target}m` };
    }
    if (requirement.kind === 'skyFloor') {
        const current = getClearedSkyTowerFloor(source);
        return { met: current >= target, current, target, label: `창공의 탑 ${current}/${target}층` };
    }
    return { met: false, current: 0, target, label: '알 수 없는 선행 조건' };
}

/**
 * @param {Readonly<object>} zone
 * @param {Readonly<object>} source
 * @returns {{met:boolean,label:string,current?:number,target?:number}}
 */
function getSeasonBossProgressGate(zone, source) {
    const state = source || game;
    if (!zone || !state) return { met: false, label: '진행 정보 없음' };
    if (Array.isArray(zone.requiresRivals)) {
        const progress = state.loopProgressCurrent && typeof state.loopProgressCurrent === 'object' ? state.loopProgressCurrent : {};
        const cleared = new Set(Array.isArray(progress.specialBosses) ? progress.specialBosses : []);
        const current = zone.requiresRivals.filter(id => cleared.has(id)).length;
        return { met: current >= zone.requiresRivals.length, current, target: zone.requiresRivals.length, label: `이번 루프 선행 결투 ${current}/${zone.requiresRivals.length}` };
    }
    if (Array.isArray(zone.requiresCosmosBosses)) {
        const atlas = state.cosmosAtlas && typeof state.cosmosAtlas === 'object' ? state.cosmosAtlas : {};
        const cleared = new Set(Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
        const current = zone.requiresCosmosBosses.filter(id => cleared.has(id)).length;
        return { met: current >= zone.requiresCosmosBosses.length, current, target: zone.requiresCosmosBosses.length, label: `이번 루프 은하 보스 ${current}/${zone.requiresCosmosBosses.length}` };
    }
    if (zone.pinnacleRequirement) return getPinnacleRequirementProgress(zone.pinnacleRequirement, state);
    if (Array.isArray(zone.requiresPinnacles)) {
        const cleared = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
        const current = zone.requiresPinnacles.filter(id => cleared.has(id)).length;
        return { met: current >= zone.requiresPinnacles.length, current, target: zone.requiresPinnacles.length, label: `수호자 격파 ${current}/${zone.requiresPinnacles.length}` };
    }
    return { met: true, label: '' };
}

function normalizeCosmosDirectiveSnapshot(source) {
    if (!source || typeof source !== 'object') return null;
    const definitions = Array.isArray(globalThis.COSMOS_EXPEDITION_DIRECTIVE_DB)
        ? globalThis.COSMOS_EXPEDITION_DIRECTIVE_DB : [];
    const requestedId = String(source.id || 'survey');
    const canonical = definitions.find(row => row && row.id === requestedId)
        || definitions.find(row => row && row.id === 'survey');
    const directive = canonical || source;
    return {
        id: String(directive.id || 'survey'),
        name: String(directive.name || '안정 관측').slice(0, 40),
        enemyHpMul: Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1)),
        enemyDamageMul: Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1)),
        enemyAttackSpeedMul: Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1)),
        rewardMul: Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1)),
        jackpotChance: Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0)),
        jackpotBonusMul: Math.max(0, Math.min(5, Number(directive.jackpotBonusMul) || 0)),
        rare: directive.rare === true
    };
}

function createCosmosChallengeZone(state) {
    const cosmos = state && state.cosmosAtlas && typeof state.cosmosAtlas === 'object' ? state.cosmosAtlas : {};
    const challenge = cosmos.activeChallenge && typeof cosmos.activeChallenge === 'object' ? cosmos.activeChallenge : null;
    if (!challenge) return null;
    const galaxy = Math.max(0, Math.min(5, Math.floor(Number(challenge.galaxy) || 0)));
    return {
        id: 'cosmos_challenge', name: `우주계 ${challenge.name || '행성'}`, type: 'cosmos',
        tier: Math.max(1, Math.floor(challenge.tier || 1)),
        lootTier: Math.max(1, Math.floor(Number(challenge.lootTier) || (Math.max(1, galaxy) - 1) * 5 + 1)),
        maxKills: 1, ele: challenge.ele || 'chaos', cosmosNodeId: challenge.nodeId || null,
        cosmosGalaxy: galaxy, cosmosTag: challenge.tag || '', cosmosMechanicId: challenge.mechanicId || '',
        recommendedDps: Math.max(0, Math.floor(Number(challenge.recommendedDps) || 0)),
        recommendedEhp: Math.max(0, Math.floor(Number(challenge.recommendedEhp) || 0)),
        gravity: Math.max(1, Number(challenge.gravity || 1)),
        sizeClass: Math.max(1, Math.floor(challenge.sizeClass || 1)), theme: challenge.theme || '',
        cosmosDirective: normalizeCosmosDirectiveSnapshot(challenge.directive),
        cosmosHabitat: challenge.habitat
    };
}

function getBeyondBoundaryTierProfile(tierValue) {
    const tier = clampNumber(Math.floor(Number(tierValue) || 1), 1, BEYOND_BOUNDARY_TIER_CAP);
    const difficultyTier = tier + BEYOND_BOUNDARY_DIFFICULTY_OFFSET;
    const mutatorIds = BEYOND_BOUNDARY_MUTATOR_DB.filter(row => tier >= row.tier).map(row => row.id);
    let hpMul = Math.pow(BEYOND_BOUNDARY_HP_GROWTH, difficultyTier - 1);
    let damageMul = Math.pow(BEYOND_BOUNDARY_DAMAGE_GROWTH, difficultyTier - 1);
    let attackSpeedMul = 1;
    if (mutatorIds.includes('hardened')) hpMul *= 1.2;
    if (mutatorIds.includes('onslaught')) { damageMul *= 1.15; attackSpeedMul = 1.1; }
    return {
        tier, difficultyTier, hpMul, damageMul, attackSpeedMul, mutatorIds,
        drBonus: mutatorIds.includes('iron') ? 10 : 0,
        penetrationBonus: mutatorIds.includes('piercing') ? 10 : 0,
        regenRate: mutatorIds.includes('renewal') ? 0.0025 : 0
    };
}

function createBeyondBoundaryZone(state) {
    const boundary = state && state.beyondBoundary && typeof state.beyondBoundary === 'object'
        ? state.beyondBoundary : {};
    const run = boundary.activeRun && typeof boundary.activeRun === 'object' ? boundary.activeRun : null;
    const selectedTier = run ? run.tier : boundary.selectedTier;
    const profile = getBeyondBoundaryTierProfile(selectedTier);
    const focusId = run ? run.rewardFocusId : boundary.selectedRewardFocusId;
    const intensityId = run ? run.intensityId : boundary.selectedIntensityId;
    const focus = BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === focusId)
        || BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
    const intensity = BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === intensityId)
        || BEYOND_BOUNDARY_INTENSITY_DB[0];
    const wave = run ? clampNumber(Math.floor(Number(run.wave) || 1), 1, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER) : 1;
    return {
        id: BEYOND_BOUNDARY_ZONE_ID, name: `경계 너머 ${profile.tier}단계 · ${wave}/${BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER}`,
        type: 'beyondBoundary', tier: getUnderworldTier(30) + Math.floor((profile.difficultyTier - 1) / 2),
        maxKills: 1, ele: 'chaos', difficultyBenchmark: 'underworld30',
        boundaryTier: profile.tier, boundaryWave: wave,
        boundaryDifficultyTier: profile.difficultyTier,
        boundaryFinalWave: wave === BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER,
        boundaryHpMul: profile.hpMul * (focus.hpMul || 1) * intensity.hpMul,
        boundaryDamageMul: profile.damageMul * (focus.damageMul || 1) * intensity.damageMul,
        boundaryAttackSpeedMul: profile.attackSpeedMul * (focus.attackSpeedMul || 1) * intensity.attackSpeedMul,
        boundaryDrBonus: profile.drBonus,
        boundaryPenetrationBonus: profile.penetrationBonus + (focus.penetrationBonus || 0),
        boundaryRegenRate: profile.regenRate,
        boundaryRewardMul: 1 + Math.min(1.5, (profile.tier - 1) * 0.02),
        boundaryRewardFocusId: focus.id, boundaryIntensityId: intensity.id,
        boundaryCompletionRewardMul: intensity.rewardMul,
        boundaryMutatorIds: profile.mutatorIds
    };
}

/** Queen spawning and the map preview share this profile; wave scaling applies once.
 * @param {typeof defaultGame} state Normalized game state; read only.
 */
function createBeehiveZone(state) {
    const hive = state.beehive;
    const step = Math.max(1, Math.min(10, Math.floor(hive.branchStep || 1)));
    const entryDepth = Math.max(21, Math.floor(hive.entryDeepChaosDepth || 21));
    const empower = Math.max(0, Math.min(30, Math.floor(hive.enemyEmpower || 0)));
    const waveHpMul = 1.4 + (step - 1) * 0.16 + empower * 0.16;
    const waveAttackRateMul = 1.1 + empower * 0.025;
    const waveDamageMul = 1.2 + empower * 0.02;
    // Entry recommendations must already cover the final queen, not the current wave.
    const queenHpMul = (1 + 9 * 0.16 + empower * 0.22) * 2.6;
    return {
        id: 'beehive_run', name: `벌집 심층 ${step}갈래`, type: 'beehive', tier: entryDepth,
        maxKills: 1, ele: 'chaos', entryDeepChaosDepth: entryDepth, waveHpMul, waveAttackRateMul, waveDamageMul,
        bossMods: { hpMul: queenHpMul, atkMul: 1.35 + empower * 0.02,
            damageMul: 1.35 + empower * 0.025, critChanceBonus: 6, penetration: 8, patternMode: 'burst' }
    };
}

/** The idle preview represents a fresh entry; active runs retain their paid entry depth. */
function createColonyZone(state) {
    const colony = state.colony;
    const wave = colony.inRun ? Math.max(1,Math.floor(colony.wave||1)) : 1;
    const depth = colony.inRun ? Math.max(21,Math.floor(colony.entryDeepChaosDepth||21))
        : Math.max(21,Math.min(state.abyssEndlessDepth||21,state.loopProgressCurrent.bestAbyssDepth||21));
    return { id:'colony_run', name:`군락지 방어 ${wave}웨이브`, type:'colony', tier:depth+Math.floor(wave/2),
        maxKills:1, ele:'chaos', entryDeepChaosDepth:depth };
}

function getUnderworldZone(floor) {
    return { id: UNDERWORLD_ZONE_ID, name: `지하계 ${floor}층`, type: 'underworld', tier: getUnderworldTier(floor), maxKills: 1, ele: 'chaos', floor, ...contentMaps.underworld(floor) };
}
function getZone(id) {
    if (id === ATLAS.zoneId) return atlas.zone(game);
    if (id === 'cosmos_challenge') {
        const challengeZone = createCosmosChallengeZone(game);
        if (challengeZone) return challengeZone;
    }
    if (id === BEYOND_BOUNDARY_ZONE_ID) return createBeyondBoundaryZone(game);
    if (id === 'beehive_run') return createBeehiveZone(game);
    if (id === 'colony_run') return createColonyZone(game);
    if (id === 'grand_breach_run') {
        return {
            id: 'grand_breach_run', name: '대균열', type: 'grandBreach', tier: 14, maxKills: 9999, ele: 'chaos',
            bossMods: { hpMul: 4, atkMul: 1.25, damageMul: 1.5, patternMode: 'intro' }
        };
    }
    if (id === OUTSIDE_CHAOS_ZONE_ID) return { id: OUTSIDE_CHAOS_ZONE_ID, name: '혼돈 밖', type: 'outsideChaos', tier: 25, maxKills: 1, ele: 'chaos', fixedDifficultyMul: 1 };
    if (id === CHAOS_REALM_ZONE_ID) {
        let realm = ensureChaosRealmState();
        let floor = Math.max(1, Math.floor(realm.currentFloor || 1));
        return { id: CHAOS_REALM_ZONE_ID, name: `혼돈계 ${floor}층`, type: 'chaosRealm', tier: getChaosRealmTier(floor), maxKills: 1, ele: 'chaos', floor: floor, affixes: getChaosRealmAffixes(floor), ...contentMaps.chaosRealm(floor) };
    }
    if (id === SKY_TOWER_ZONE_ID) {
        let st = ensureSkyTowerState();
        let floor = Math.max(1, Math.floor(st.currentFloor || 1));
        return { id: SKY_TOWER_ZONE_ID, name: `창공의 탑 ${floor}층`, type: 'skyTower', tier: getSkyTowerTier(floor), maxKills: 1, ele: 'chaos', floor: floor, ...contentMaps.skyTower(floor) };
    }
    if (id === WOODSMAN_ECHO_ZONE_ID) return { id: WOODSMAN_ECHO_ZONE_ID, name: '나무꾼의 잔상', type: 'woodsmanEcho', tier: getChaosRealmTier(30), maxKills: 1, ele: 'chaos' };
    if (id === TIME_RIFT_PAST_ZONE_ID || id === TIME_RIFT_FUTURE_ZONE_ID) {
        let rift = ensureTimeRiftState();
        let phase = id === TIME_RIFT_PAST_ZONE_ID ? 'past' : 'future';
        // 시간압이 유일한 난이도 손잡이 — 루프 인플레이션 대신 fixedDifficultyMul로만 세진다.
        let activePressure = game.currentZoneId === id && rift.activePressure ? rift.activePressure : rift.pressure;
        let equivalentChaosDepth = getTimeRiftEquivalentChaosDepth(activePressure);
        let difficultyTier = getTimeRiftDifficultyTier(activePressure);
        // 과거 시간압 1은 혼돈 1과 같은 기준이며, 미래는 같은 시간압에서도 조금 더 어렵다.
        let pressureMul = phase === 'past' ? 1 : 1.18;
        return { id: id, name: `시간의 균열 · ${phase === 'past' ? '과거' : '미래'} (시간압 ${activePressure})`, type: 'timeRift', riftPhase: phase, tier: difficultyTier, maxKills: 1, ele: 'chaos', loopScaleExempt: true, fixedDifficultyMul: pressureMul, pressure: activePressure, equivalentChaosDepth: equivalentChaosDepth, ...contentMaps.timeRift(phase, activePressure) };
    }
    if (id === UNDERWORLD_ZONE_ID) {
        let uw = (game && game.underworldProgress) || {};
        let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
        return getUnderworldZone(floor);
    }
    if (typeof id === 'string') {
        if (id.startsWith('trial_')) return contentMaps.trialCorridor(TRIAL_ZONES.find(t => t.id === id));
        let seasonBossZone = SEASON_BOSS_ZONES.find(t => t.id === id);
        if (seasonBossZone) return contentMaps.withArena(seasonBossZone, contentMaps.bossBiome(seasonBossZone));
    }
    if (id === METEOR_FALL_ZONE_ID) {
        let star = (game && game.meteorSite) || {};
        let allowBeyond20 = !!star.skyRiftAllCosmos;
        let tierCap = allowBeyond20 ? 40 : 20;
        let tier = star.activeMeteorTier || Math.max(8, Math.min(tierCap, Math.floor(star.skyRiftMinTier || 13)));
        return {
            id: METEOR_FALL_ZONE_ID,
            name: '운석 낙하 지점',
            type: 'meteor',
            tier: tier,
            maxKills: 1,
            ele: 'chaos',
            bossMods: { hpMul: 2.2, atkMul: 1.1, damageMul: 1.4, patternMode: 'slam' }, exploration: contentMaps.arena('meteor', 'ruins')
        };
    }
    if (id === OCEAN_ZONE_ID) {
        let ocean = ensureOceanState();
        let depthM = Math.max(0, Math.floor(ocean.depthM || 0));
        let depthTier = getOceanDepthTier(depthM);
        return { id: OCEAN_ZONE_ID, name: `심해 ${depthM}m`, type: 'oceanDepth', tier: getChaosRealmTier(21) + depthTier, maxKills: 1, ele: 'chaos', depthM: depthM, depthTier: depthTier, currents: getOceanCurrentAffixes(depthTier) };
    }
    if (id === LABYRINTH_ZONE_ID) {
        let floor = Math.max(1, game.labyrinthFloor || 1);
        let baseTier = Math.min(20, 7 + Math.floor(floor / 3));
        let over50 = Math.max(0, floor - 50);
        let over100 = Math.max(0, floor - 100);
        let extraTier = Math.floor(over50 / 5) + Math.floor(over100 / 3);
        return { id: LABYRINTH_ZONE_ID, name: `고대 미궁 ${floor}층`, type: 'labyrinth', tier: baseTier + extraTier, maxKills: 1, ele: 'chaos', floor: floor, exploration: contentMaps.labyrinth(floor) };
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
            isEndlessDepth: displayDepth > 20, ...contentMaps.chaos(displayDepth)
        };
    }
    return MAP_ZONES[id];
}

// 시간의 균열 런타임 상태(shape 소유자). 제단 아이템은 인벤토리에서 빠져 이곳에 보관된다.
function ensureTimeRiftState() {
    if (!game.timeRift || typeof game.timeRift !== 'object') game.timeRift = {};
    let st = game.timeRift;
    st.pressure = Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, Math.floor(st.pressure || 1)));
    st.activePressure = Number.isFinite(st.activePressure) ? Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, Math.floor(st.activePressure))) : null;
    st.altarOpen = !!st.altarOpen;
    st.altarUnique = (st.altarUnique && typeof st.altarUnique === 'object') ? st.altarUnique : null;
    st.altarRare = (st.altarRare && typeof st.altarRare === 'object') ? st.altarRare : null;
    st.fusionCount = Math.max(0, Math.floor(st.fusionCount || 0));
    return st;
}

// 시간압별 융합 등급 확률. perfect(유실 0)/normal(유실 1)/unstable(유실 2), 합계 1.
function getTimeRiftFusionOdds(pressure) {
    let p = Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, Math.floor(pressure || 1)));
    let perfect = Math.min(0.75, TIME_RIFT_FUSION_ODDS.perfectBase + TIME_RIFT_FUSION_ODDS.perfectPerPressure * (p - 1));
    let unstable = Math.max(TIME_RIFT_FUSION_ODDS.unstableMin, TIME_RIFT_FUSION_ODDS.unstableBase - TIME_RIFT_FUSION_ODDS.unstablePerPressure * (p - 1));
    let normal = Math.max(0, 1 - perfect - unstable);
    return { perfect: perfect, normal: normal, unstable: unstable };
}

function getSeasonAbyssDepthCap(seasonValue) {
    let season = Math.max(1, Math.floor(seasonValue || 1));
    if (season > 30) return LOOP_GATE_ABYSS_DEPTH_CAP + (season - 30);
    let uncapped = season <= 9 ? (10 + (season - 1)) : (20 + (season - 10));
    return Math.min(LOOP_GATE_ABYSS_DEPTH_CAP, uncapped);
}

function getLoopAbyssRequirementText(seasonValue) {
    let cap = getSeasonAbyssDepthCap(seasonValue);
    let base = `루프 조건: ${cap > 20 ? '혼돈 심화' : '혼돈'} ${cap} 클리어`;
    if (Math.max(1, Math.floor(seasonValue || 1)) < LOOP_GATE_ALT_START_SEASON) return base;
    return `${base} · 선택 루프: 혼돈 루프 또는 우주계 ${LOOP_GATE_ALT_COSMOS_PLANET_NAME} 행성 돌파 후 우주계 루프 (이번 루프 기준)`;
}

function hasCurrentLoopChaosRequirementClear(seasonValue) {
    let season = Math.max(1, Math.floor(seasonValue || (game && game.season) || 1));
    let cap = getSeasonAbyssDepthCap(season);
    let progress = (game && game.loopProgressCurrent) || {};
    // Ordinary chaos clears reset each loop; the early target is 10–18, not 20.
    if (cap < 20) return (game.abyssClearedDepths || []).some(depth => depth >= cap);
    return cap === 20
        ? hasCurrentLoopChaos20Clear()
        : Math.max(0, Math.floor(progress.bestAbyssDepth || 0)) >= cap;
}

function hasCurrentLoopCosmosRequirementClear(seasonValue) {
    let season = Math.max(1, Math.floor(seasonValue || (game && game.season) || 1));
    if (season < LOOP_GATE_ALT_START_SEASON) return false;
    let progress = (game && game.loopProgressCurrent) || {};
    return Array.isArray(progress.cosmosPlanets) && progress.cosmosPlanets.includes(LOOP_GATE_ALT_COSMOS_PLANET_ID);
}

function hasCurrentLoopAbyssRequirementClear(seasonValue) {
    return hasCurrentLoopChaosRequirementClear(seasonValue) || hasCurrentLoopCosmosRequirementClear(seasonValue);
}

function getAvailableLoopAdvancePaths(seasonValue) {
    let paths = [];
    if (hasCurrentLoopChaosRequirementClear(seasonValue)) paths.push('chaos');
    if (hasCurrentLoopCosmosRequirementClear(seasonValue)) paths.push('cosmos');
    return paths;
}

function markLoopCosmosPlanetClear(nodeId) {
    if (!nodeId || !game || (game.season || 1) < LOOP_GATE_ALT_START_SEASON) return false;
    game.loopProgressCurrent = game.loopProgressCurrent || {};
    let planets = Array.isArray(game.loopProgressCurrent.cosmosPlanets) ? game.loopProgressCurrent.cosmosPlanets : [];
    let fresh = !planets.includes(nodeId);
    if (fresh) planets.push(nodeId);
    game.loopProgressCurrent.cosmosPlanets = planets;
    // True once per loop, when this loop's clear of the alternative planet is first recorded.
    return fresh && nodeId === LOOP_GATE_ALT_COSMOS_PLANET_ID;
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

function getHighestUnlockedEndlessChaosDepth(source) {
    let state = source || game;
    let depths = [];
    if (Array.isArray(state && state.abyssUnlockedDepths)) {
        depths = state.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21);
    }
    let currentDepth = Math.floor((state && state.abyssEndlessDepth) || 0);
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



// 세계수 아틀라스 지도는 등급이 정한 혼돈 깊이 · 루프에서 같은 배율을 받는다(js/atlas.js buildZone).
function getAbyssMonsterScales(zone) {
    if (zone && zone.type === 'atlasMap') return getChaosDepthScales(zone.equivalentDepth, zone.fixedSeason);
    if (!zone || zone.type !== 'abyss') return { dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1, playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0, bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1 };
    let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    // 심화 혼돈(21+) 기록은 심화 구간에서만 난이도에 반영한다.
    // 새 루프의 혼돈 1~20에 과거 심화층 배율이 섞이면 난이도가 비정상적으로 급등한다.
    let endlessDepth = depth <= 20 ? depth : Math.max(depth, Math.floor(game.abyssEndlessDepth || depth));
    return getChaosDepthScales(endlessDepth, game.season || 1);
}

/** Monster scales at a chaos depth (21+ = deep chaos) in a given loop. */
function getChaosDepthScales(endlessDepth, season) {
    let endlessOver = Math.max(0, endlessDepth - 20);
    let endlessMul = 1;
    if (endlessOver > 0) {
        let steepBand = Math.min(10, endlessOver);
        let smoothBand = Math.max(0, endlessOver - 10);
        endlessMul = Math.pow(ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, steepBand) * Math.pow(1.06, smoothBand);
    }
    // 루프 30 이후에는 원시 스탯 인플레이션을 동결한다 — 이후의 도전은 스탯 상승이 아니라
    // 루프 조건 세분화(대체 경로, data/maps.js LOOP_GATE_*)로 제공한다.
    let postLoopOver = Math.min(20, Math.max(0, Math.floor(season - 10)));
    let postLoopDifficultyMul = postLoopOver > 0 ? (1 + postLoopOver * 0.05 + endlessOver * 0.022) : 1;
    return {
        dmgMul: postLoopDifficultyMul,
        hpMul: endlessMul * (postLoopOver > 0 ? (1 + postLoopOver * 0.04) : 1),
        hordeMul: 1,
        dropMul: 1,
        expMul: 1,
        playerTakenMul: 1 + Math.min(10, endlessOver) * ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR + Math.max(0, endlessOver - 10) * 0.012 + postLoopOver * 0.03,
        playerDamageMul: 1,
        resistBonus: 0,
        eliteBonus: 0,
        bossMul: 1,
        bossExtraCurrencyChance: 0,
        mapProgressMul: 1,
        mapLengthMul: 1
    };
}

const ENDLESS_CONTENT_DROP_MULTIPLIER_CAP = 2.25;
const UNDERWORLD_DROP_RATE_MULTIPLIER = 0.5;

/**
 * 콘텐츠 자체의 기본 전리품 빈도 보정이다. 플레이어·티어 보너스와 분리한다.
 * 룬·광석처럼 유지해야 하는 보상은 해당 드랍 규칙에서 이 배율을 적용하지 않는다.
 * @param {{type?:string}|null} zone
 * @returns {number}
 */
function getContentDropRateMultiplier(zone) {
    return zone && zone.type === 'underworld' ? UNDERWORLD_DROP_RATE_MULTIPLIER : 1;
}

/**
 * 무한 등반 콘텐츠는 층수와 몬스터 수가 함께 늘어나므로, 플레이어 보너스까지
 * 곱해진 최종 드랍 배율에는 공통 상한을 둔다. 원본 드랍 확률은 변경하지 않는다.
 * @param {{type?:string}|null} zone
 * @param {number} multiplier
 * @returns {number}
 */
function capEndlessContentDropMultiplier(zone, multiplier) {
    let value = Math.max(0, Number(multiplier) || 0);
    if (!zone || !['abyss', 'chaosRealm', 'labyrinth', 'underworld', 'beyondBoundary'].includes(zone.type)) return value;
    return Math.min(ENDLESS_CONTENT_DROP_MULTIPLIER_CAP, value);
}

/** @param {{silent: boolean}} options Explicit foreground/background announcement policy. */
function applySeasonContentProgression(options) {
    const opts = options;
    game.unlockedSeasonContents = Array.isArray(game.unlockedSeasonContents) ? game.unlockedSeasonContents : [];
    game.seenSeasonContentNotices = Array.isArray(game.seenSeasonContentNotices) ? game.seenSeasonContentNotices : [];
    let roadmapMaxLoop = Math.max(...Object.keys(SEASON_CONTENT_ROADMAP).map(Number));
    let maxSeason = Math.max(1, Math.min(roadmapMaxLoop, game.season || 1));
    for (let s = 1; s <= maxSeason; s++) {
        let key = `season_${s}`;
        if (!game.unlockedSeasonContents.includes(key)) game.unlockedSeasonContents.push(key);
        if (!opts.silent && !game.contentProgression && !game.seenSeasonContentNotices.includes(key) && SEASON_CONTENT_ROADMAP[s]) {
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
    enterAutomaticMapInterruptionAfterClear(null); // a ready grand breach or meteor postponed by the map's loot goes first
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
    if (!contentProgression.isUnlocked('deepTree')) return;
    if ((game.season || 1) < 10) return;
    let cost = getLoopDeepStatCost(statKey);
    if ((game.loopDeepPoints || 0) < cost) return addLog(`심화 루프 포인트가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.loopDeepStats = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    game.loopDeepStats[statKey] = Math.max(0, Math.floor(game.loopDeepStats[statKey] || 0)) + 1;
    game.loopDeepPoints -= cost;
    addLog(`🧬 심화 루프 강화: ${getStatName(statKey)} Lv.${game.loopDeepStats[statKey]} (비용 ${cost})`, 'season-up');
    updateStaticUI();
}

// 전직 정의(CLASS_TEMPLATES · CLASS_KEYSTONE_PICK_LIMIT · CLASS_KEYSTONE_DEFS)는 data/ascendancies.js로 옮겼다(2026-10-02).

/** 직업마다 고를 수 있는 전직 셋(data/ascendancies.js, 2026-10-02 전직 18종). 모르는 직업이면 전부. */
function getAscendanciesForClass(classId) {
    const list = ASCENDANCIES_BY_PLAYER_CLASS[classId];
    return list ? list.slice() : Object.keys(CLASS_TEMPLATES);
}
/** 전직 18종을 직업 순서로(재능 개화 화면 등). */
function getAscendancyOrder() {
    return Object.values(ASCENDANCIES_BY_PLAYER_CLASS).flat();
}
function isAscendancyOfClass(ascendId, classId) {
    return getAscendanciesForClass(classId).includes(ascendId);
}

/** 모든 전직 키스톤(이름 찾기 등). */
function getAllAscendKeystoneDefs() {
    let out = [];
    Object.keys(CLASS_KEYSTONE_DEFS || {}).forEach(cls => {
        (CLASS_KEYSTONE_DEFS[cls] || []).forEach(node => { if (node && node.id) out.push(node); });
    });
    return out;
}
/** 우주계 쌍둥이 주얼(주베누비아의 균형 / 주벤샤말의 심판)이 부여하는 키스톤: 지금 직업이 고를 수 있는 전직 셋의 키스톤(2026-10-02).
 * 받은 키스톤은 그 셋 중 어느 전직을 골랐든 켜진다(js/combat.js hasKeystone). */
function pickRandomAscendKeystoneId(classId = game.selectedClassId) {
    const allowed = new Set(getAscendanciesForClass(classId));
    let defs = Object.keys(CLASS_KEYSTONE_DEFS).filter(cls => allowed.has(cls)).flatMap(cls => CLASS_KEYSTONE_DEFS[cls] || []);
    if (!defs.length) defs = getAllAscendKeystoneDefs();
    if (!defs.length) return null;
    return defs[Math.floor(Math.random() * defs.length)].id;
}
/** 루프 초기화 직전의 전직 배치(전직, 노드 순서, 키스톤 순서)를 기억하고 비울 키스톤 목록을 돌려준다(전직 고르기의
 * '지난 루프처럼'). 이번 루프에 전직을 고르지 않았으면 예전 기억을 그대로 둔다. */
function rememberLoopAscendancyPlan(state = game) {
    const keystones = Array.isArray(state.ascendKeystones) ? state.ascendKeystones.slice() : [];
    if (state.ascendClass && CLASS_TEMPLATES[state.ascendClass]) {
        state.lastLoopAscendPlan = { ascendClass: state.ascendClass, nodes: (state.ascendNodes || []).slice(), keystones: keystones.slice() };
    }
    return keystones;
}
function getAscendKeystoneName(id) {
    if (!id) return '';
    let node = getAllAscendKeystoneDefs().find(n => n && n.id === id);
    return node ? node.name : id;
}
safeExposeGlobals({ getAscendanciesForClass, getAscendancyOrder, isAscendancyOfClass, getAllAscendKeystoneDefs, pickRandomAscendKeystoneId, getAscendKeystoneName, rememberLoopAscendancyPlan });

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

// 원점은 아래쪽에 두고 두 성장 축이 원의 양쪽으로 갈라졌다가 위쪽에서
// 다시 합쳐지도록 배치한다. 데이터/선행 조건은 그대로 유지하고 시각 순서만 고정한다.
const SEASON_OUROBOROS_RING_NODES = [
    's_root', 's_hp', 's_guard', 's_vital', 's_blood', 's_leech',
    's_skirmish', 's_fury', 's_momentum', 's_focus', 's_floor',
    's_ceil', 's_cataclysm', 's_ruin', 's_prism', 's_breach',
    's_king', 's_bruise', 's_rend', 's_crit', 's_dot', 's_speed', 's_dmg'
];
const SEASON_INNER_NODES = {
    si_worldheart: { name: '세계심장', desc: '완성된 순환이 생명력을 증폭합니다.', stat: 'pctHp', val: 36, req: null, inner: true },
    si_cataclysm: { name: '내면의 대격변', desc: '마법진의 힘이 모든 피해를 증폭합니다.', stat: 'pctDmg', val: 45, req: null, inner: true },
    si_aegis: { name: '영원의 방벽', desc: '순환의 비늘이 받는 충격을 줄입니다.', stat: 'dr', val: 10, req: null, inner: true },
    si_convergence: { name: '운명의 수렴', desc: '되풀이된 전투가 치명타를 완성합니다.', stat: 'critDmg', val: 50, req: null, inner: true },
    si_quicksilver: { name: '끝없는 박동', desc: '우로보로스의 맥동이 공격을 가속합니다.', stat: 'aspd', val: 14, req: null, inner: true },
    si_origin: { name: '기원의 기억', desc: '모든 순환의 기억에서 경험을 얻습니다.', stat: 'expGain', val: 30, req: null, inner: true }
};

function getSeasonPassiveNodeDef(id) {
    return SEASON_NODES[id] || SEASON_INNER_NODES[id] || null;
}

function getAllSeasonPassiveNodeIds() {
    return Object.keys(SEASON_NODES).concat(Object.keys(SEASON_INNER_NODES));
}

function getSeasonPassiveUnlockLoop(id) {
    if (SEASON_INNER_NODES[id]) return 1;
    const rowIndex = SEASON_NODE_ROWS.findIndex(row => row.includes(id));
    return rowIndex >= 4 ? 5 : 1;
}

const JEWEL_INVENTORY_LIMIT = 40;
const JEWEL_RARITY_ORDER = ['normal', 'magic', 'rare', 'unique'];






const P_STATS = {
    // 범용 스탯: 힘(생명력/물리), 민첩(회피/정확도), 지능(ES/원소), 정확도(적 회피 수치 상쇄).
    strength: { name: '힘', tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    dexterity: { name: '민첩', tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    intelligence: { name: '지능', tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    accuracy: { name: '정확도', tiers: [1, 2, 3], s: 40, m: 90, k: 180 },
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
    spellPctDmg: { name: '주문 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    shieldPctDmg: { name: '방패 스킬 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    minePctDmg: { name: '지뢰 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    potionPctDmg: { name: '포션 스킬 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    mobilityPctDmg: { name: '기동 스킬 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    channelingPctDmg: { name: '채널링 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    mystique: { name: '신비', tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    devotion: { name: '헌신', tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    cycle: { name: '순환', tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    ailmentDamagePct: { name: '상태이상 피해(%)', tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    ailmentPotencyPct: { name: '상태이상 위력(%)', tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    igniteChance: { name: '점화 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    chillChance: { name: '냉각 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    freezeChance: { name: '동결 확률(%)', tiers: [2, 3], m: 5, k: 10, isPct: true },
    shockChance: { name: '감전 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    poisonChance: { name: '중독 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    bleedChance: { name: '출혈 확률(%)', tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    spellFlatDmg: { name: '주문 내장 피해', tiers: [1, 2, 3], s: 5, m: 12, k: 22 },
    spellFlatPct: { name: '주문 내장 피해 증가(%)', tiers: [2, 3], m: 6, k: 14, isPct: true },
    projectileExtraShots: { name: '투사체 추가 발사', tiers: [2, 3], m: 1, k: 3 },
    targetProjectile: { name: '투사체 스킬 타겟 수', tiers: [3], k: 1 },
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
    poisonDamageMultiplierPct: { name: '중독 피해 증가(%)', tiers: [2, 3], m: 4, k: 10, isPct: true },
    accuracyBonusPct: { name: '정확도 보정(%)', isPct: true },
    doubleDamageChance: { name: '두 배 피해 확률(%)', isPct: true },
    blockChanceMax: { name: '막기 확률 최대치(+%p)', isPct: true },
    takenDamageReduceWhen1EnemyPct: { name: '주변 적이 1명일 때 받는 피해 감소(%)', isPct: true },
    takenDamageReduceWhen2EnemiesPct: { name: '주변 적이 2명 이상일 때 받는 피해 감소(%)', isPct: true },
    physTakenAsFire: { name: '받는 물리 피해의 화염 전환(%)', isPct: true },
    physTakenAsCold: { name: '받는 물리 피해의 냉기 전환(%)', isPct: true },
    physTakenAsLight: { name: '받는 물리 피해의 번개 전환(%)', isPct: true },
    physTakenAsChaos: { name: '받는 물리 피해의 카오스 전환(%)', isPct: true },
    addedFireDamagePct: { name: '추가 화염 피해(%)', isPct: true },
    addedColdDamagePct: { name: '추가 냉기 피해(%)', isPct: true },
    addedLightDamagePct: { name: '추가 번개 피해(%)', isPct: true },
    addedChaosDamagePct: { name: '추가 카오스 피해(%)', isPct: true },
    addedPhysDamagePct: { name: '추가 물리 피해(%)', isPct: true },
    shockedEnemyHitDamageMorePct: { name: '감전된 적 명중 피해 증폭(%)', isPct: true },
    energyShieldRechargeFaster: { name: '에너지 보호막 재충전 대기시간 감소(초)' }
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
    '범위 확장': { baseVal: 5, scale: 2.0, stat: 'aoePctDmg', name: '범위 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '범위 태그 스킬의 피해를 높입니다.' },
    '지속 확산': { baseVal: 6, scale: 2.2, stat: 'dotPctDmg', name: '지속 피해 배율', isPct: true, resonanceCosts: [6, 12, 21], desc: '지속 피해 태그 스킬의 지속 피해 배율을 올립니다.' },
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
    '수액 골렘 소환': { baseVal: 25, scale: 0, stat: 'summonGuardRedirectPct', name: '방어형 소환수 피해 대리', isPct: true, noTiers: true, tierMul: 1.4, resonanceCosts: [9], desc: '방어형 소환수 보조 젬. 하급/중급/상급 구분이 없는 통합형 보조 젬입니다. 장착 시 수액 골렘을 소환하고, 살아있는 동안 플레이어가 받을 최종 히트 피해의 일부를 대신 받습니다. 지속 피해는 기본적으로 대리하지 않습니다.', tags: ['summon', 'summon_guard', 'physical'] },
    '잔향': { baseVal: 8, scale: 3.0, stat: 'echoPower', name: '잔향', isPct: false, resonanceCosts: [9, 21, 33], desc: '적중 시 일정 확률로 잔향을 남겨 추가 피해를 입힙니다. 같은 적에게 여러 번 중첩될 수 있지만, 적 1기에 걸린 잔향의 남은 타격 수 합계는 최대 12회로 제한됩니다.' },
    '화염 주입': { baseVal: 5, scale: 2.0, stat: 'firePctDmg', name: '화염 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '화염 스킬의 피해를 높입니다.' },
    '냉기 증폭': { baseVal: 5, scale: 2.0, stat: 'coldPctDmg', name: '냉기 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '냉기 스킬의 피해를 높입니다.' },
    '번개 전도': { baseVal: 5, scale: 2.0, stat: 'lightPctDmg', name: '번개 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '번개 스킬의 피해를 높입니다.' },
    '혼돈 전환': { baseVal: 5, scale: 2.0, stat: 'chaosPctDmg', name: '카오스 피해', isPct: true, resonanceCosts: [3, 9, 18], desc: '카오스 스킬의 피해를 높입니다.' },
    '화염 공명': { baseVal: 8, scale: 1.5, stat: 'firePctDmg', name: '화염 피해', isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: 'firePctDmg', desc: '자신의 화염 피해 증가 수치에 비례해 화염 피해를 추가로 증폭합니다.' },
    '냉기 공명': { baseVal: 8, scale: 1.5, stat: 'coldPctDmg', name: '냉기 피해', isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: 'coldPctDmg', desc: '자신의 냉기 피해 증가 수치에 비례해 냉기 피해를 추가로 증폭합니다.' },
    '번개 공명': { baseVal: 8, scale: 1.5, stat: 'lightPctDmg', name: '번개 피해', isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: 'lightPctDmg', desc: '자신의 번개 피해 증가 수치에 비례해 번개 피해를 추가로 증폭합니다.' },
    '혼돈 공명': { baseVal: 8, scale: 1.5, stat: 'chaosPctDmg', name: '카오스 피해', isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: 'chaosPctDmg', desc: '자신의 카오스 피해 증가 수치에 비례해 카오스 피해를 추가로 증폭합니다.' },
    '카오스 잠식': { baseVal: 1, scale: 0.05, stat: 'chaosErosion', name: '카오스 잠식', isPct: false, resonanceCosts: [9, 21, 33], capStat: 'chaosErosionCap', capBase: 20, capGrowAfterLevel: 20, capPerLevel: 1, desc: '카오스 피해로 적중할 때마다 적의 카오스 저항을 깎아 잠식시킵니다(중첩). 잠식 한도는 기본 20이며, 20레벨을 넘기면 레벨당 1.1씩 한도가 늘어납니다. 적이 죽거나 교체되면 잠식은 초기화됩니다.' },
    '분쇄의 일격': { baseVal: 9, scale: 2.8, stat: 'slamPctDmg', name: '강타 피해', isPct: true, resonanceCosts: [9, 21, 33], desc: '강타 태그 스킬의 피해를 강하게 증폭하는 상급 보조 젬입니다.' },
    '비전 증폭': { baseVal: 9, scale: 2.6, stat: 'spellFlatPct', name: '주문 내장 피해 증가', isPct: true, resonanceCosts: [9, 21, 33], desc: '주문 태그 스킬의 내장 피해 증가를 강하게 끌어올리는 상급 보조 젬입니다.' },
    '방패 공명': { baseVal: 7, scale: 2.4, stat: 'shieldPctDmg', name: '방패 스킬 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '방패 태그 스킬의 피해를 높입니다.' },
    '지뢰 증폭': { baseVal: 8, scale: 2.5, stat: 'minePctDmg', name: '지뢰 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '지뢰 태그 스킬의 피해를 높입니다.' },
    '연금 촉매': { baseVal: 7, scale: 2.3, stat: 'potionPctDmg', name: '포션 투척 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '포션 태그 스킬의 피해를 높입니다.' },
    '기동 타격': { baseVal: 6, scale: 2.0, stat: 'mobilityPctDmg', name: '기동 스킬 피해', isPct: true, resonanceCosts: [6, 12, 21], desc: '기동 태그 스킬의 피해를 높입니다.' },
    '집중 유지': { baseVal: 9, scale: 2.8, stat: 'channelingPctDmg', name: '채널링 피해', isPct: true, resonanceCosts: [9, 21, 33], desc: '이동을 포기하고 유지하는 채널링 스킬의 피해를 높입니다.' }
};

const MOD_DB = [
    {"id":"flatDmg","type":"prefix","statName":"기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,15],[16,20],[21,25],[26,32],[33,38],[39,45],[46,52],[53,60],[61,68],[69,77],[78,86],[87,95],[96,104],[105,114],[115,124],[125,134],[135,144],[145,155]],"valueStep":1},
    {"id":"weaponFlatDmgPct","type":"prefix","statName":"무기의 기본 피해 증가(%)","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"pctDmg","type":"prefix","statName":"피해 증가(%)","slots":["무기","반지","목걸이"],"affixBalanceVersion":2,"tierValues":[[9,11],[12,15],[16,19],[20,24],[25,28],[29,32],[33,36],[37,40],[41,45],[46,49],[50,53],[54,57],[58,62],[63,66],[67,70],[71,74],[75,78],[79,83],[84,87],[88,91]],"valueStep":1},
    {"id":"meleePctDmg","type":"prefix","statName":"근접 피해(%)","slots":["무기","장갑","목걸이","허리띠"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,17],[18,23],[24,28],[29,34],[35,39],[40,45],[46,50],[51,55],[56,61],[62,66],[67,72],[73,77],[78,82],[83,88],[89,93],[94,98],[99,104],[105,109],[110,115]],"valueStep":1},
    {"id":"projectilePctDmg","type":"prefix","statName":"투사체 피해(%)","slots":["무기","반지","장갑","목걸이"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,17],[18,23],[24,28],[29,34],[35,39],[40,45],[46,50],[51,55],[56,61],[62,66],[67,72],[73,77],[78,82],[83,88],[89,93],[94,98],[99,104],[105,109],[110,115]],"valueStep":1},
    {"id":"physPctDmg","type":"prefix","statName":"물리 피해(%)","slots":["무기","허리띠","반지","방패"],"affixBalanceVersion":2,"tierValues":[[11,13],[14,19],[20,24],[25,30],[31,36],[37,41],[42,47],[48,52],[53,58],[59,64],[65,69],[70,75],[76,81],[82,86],[87,92],[93,97],[98,103],[104,109],[110,114],[115,120]],"valueStep":1},
    {"id":"elementalPctDmg","type":"prefix","statName":"원소 피해(%)","slots":["무기","반지","목걸이"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,17],[18,22],[23,27],[28,33],[34,38],[39,43],[44,48],[49,53],[54,58],[59,64],[65,69],[70,74],[75,79],[80,84],[85,89],[90,94],[95,99],[100,104],[105,110]],"valueStep":1},
    {"id":"firePctDmg","type":"prefix","statName":"화염 피해(%)","slots":["무기","반지","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[12,14],[15,20],[21,26],[27,32],[33,38],[39,45],[46,51],[52,57],[58,63],[64,69],[70,75],[76,81],[82,87],[88,93],[94,99],[100,106],[107,112],[113,118],[119,124],[125,130]],"valueStep":1},
    {"id":"coldPctDmg","type":"prefix","statName":"냉기 피해(%)","slots":["무기","반지","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[12,14],[15,20],[21,26],[27,32],[33,38],[39,45],[46,51],[52,57],[58,63],[64,69],[70,75],[76,81],[82,87],[88,93],[94,99],[100,106],[107,112],[113,118],[119,124],[125,130]],"valueStep":1},
    {"id":"lightPctDmg","type":"prefix","statName":"번개 피해(%)","slots":["무기","반지","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[12,14],[15,20],[21,26],[27,32],[33,38],[39,45],[46,51],[52,57],[58,63],[64,69],[70,75],[76,81],[82,87],[88,93],[94,99],[100,106],[107,112],[113,118],[119,124],[125,130]],"valueStep":1},
    {"id":"chaosPctDmg","type":"prefix","statName":"카오스 피해(%)","slots":["무기","반지","목걸이","장갑","방패"],"affixBalanceVersion":2,"tierValues":[[12,14],[15,20],[21,26],[27,32],[33,38],[39,45],[46,51],[52,57],[58,63],[64,69],[70,75],[76,81],[82,87],[88,93],[94,99],[100,106],[107,112],[113,118],[119,124],[125,130]],"valueStep":1},
    {"id":"aoePctDmg","type":"prefix","statName":"범위 피해(%)","slots":["무기","투구","목걸이","갑옷"],"affixBalanceVersion":2,"tierValues":[[11,13],[14,19],[20,24],[25,30],[31,36],[37,41],[42,47],[48,52],[53,58],[59,64],[65,69],[70,75],[76,81],[82,86],[87,92],[93,97],[98,103],[104,109],[110,114],[115,120]],"valueStep":1},
    {"id":"dotPctDmg","type":"prefix","statName":"지속 피해 배율(%)","slots":["무기","반지","목걸이"],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,26],[27,29],[30,32],[33,35],[36,38],[39,41],[42,44],[45,47],[48,50],[51,53],[54,56],[57,59],[60,62],[63,65]],"valueStep":1},
    {"id":"summonFlatDmg","type":"prefix","statName":"소환수 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[8,10],[11,14],[15,18],[19,22],[23,26],[27,30],[31,34],[35,38],[39,42],[43,46],[47,50],[51,54],[55,58],[59,62],[63,66],[67,70],[71,74],[75,78],[79,82],[83,86]],"valueStep":1},
    {"id":"summonPctDmg","type":"prefix","statName":"소환수 피해(%)","slots":["무기","반지"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"summonHpPct","type":"prefix","statName":"소환수 생명력(%)","slots":["무기","반지"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"summonAspd","type":"suffix","statName":"소환수 공격 속도(%)","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18],[19,20],[21,22],[23,24],[25,26],[27,28],[29,30],[31,32],[33,34],[35,36],[37,38],[39,40],[41,42],[43,44]],"valueStep":1},
    {"id":"summonCrit","type":"suffix","statName":"소환수 치명타 확률(%)","slots":["무기","반지"],"affixBalanceVersion":2,"tierValues":[[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12],[13,13],[14,14],[15,15],[16,16],[17,17],[18,18],[19,19],[20,20],[21,21]],"valueStep":1},
    {"id":"summonCritDmg","type":"suffix","statName":"소환수 치명타 피해 배율(%)","slots":["무기","반지"],"affixBalanceVersion":2,"tierValues":[[12,14],[15,18],[19,22],[23,26],[27,30],[31,34],[35,38],[39,42],[43,46],[47,50],[51,54],[55,58],[59,62],[63,66],[67,70],[71,74],[75,78],[79,82],[83,86],[87,90]],"valueStep":1},
    {"id":"summonEfficiency","type":"suffix","statName":"소환수 효율(%)","slots":["무기","반지"],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,26],[27,29],[30,32],[33,35],[36,38],[39,41],[42,44],[45,47],[48,50],[51,53],[54,56],[57,59],[60,62],[63,65]],"valueStep":1},
    {"id":"summonCap","type":"special","statName":"소환수 최대 한도","slots":["반지"],"weight":0.35,"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"summonResPen","type":"suffix","statName":"소환수 저항 관통(%)","slots":["무기"],"weight":0.7,"affixBalanceVersion":2,"tierValues":[[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43]],"valueStep":1},
    {"id":"summonWeaponGemLevel","statId":"summonGemLevel","type":"special","statName":"소환수 공격 스킬 젬 레벨","slots":["무기"],"tierValues":[1,1,2,2,3,3,4,4,5,5],"weight":0.15,"affixBalanceVersion":2,"valueStep":1},
    {"id":"summonRingGemLevel","statId":"summonGemLevel","type":"special","statName":"소환수 공격 스킬 젬 레벨","slots":["반지"],"tierValues":[1],"weight":0.15,"affixBalanceVersion":2,"fixedValue":true,"valueStep":1},
    {"id":"spellFlatDmg","type":"prefix","statName":"주문 내장 피해","slots":["무기","목걸이"],"affixBalanceVersion":2,"tierValues":[[16,20],[21,25],[26,34],[35,44],[45,56],[57,69],[70,84],[85,99],[100,115],[116,132],[133,150],[151,169],[170,188],[189,208],[209,229],[230,250],[251,272],[273,294],[295,317],[318,340]],"valueStep":1},
    {"id":"spellFlatPct","type":"suffix","statName":"주문 내장 피해 증가(%)","slots":["무기","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"flatHp","type":"prefix","statName":"최대 생명력","slots":["무기","투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[25,31],[32,41],[42,51],[52,61],[62,71],[72,81],[82,91],[92,101],[102,111],[112,121],[122,131],[132,141],[142,151],[152,161],[162,171],[172,181],[182,191],[192,201],[202,211],[212,221]],"valueStep":1},
    {"id":"strength","type":"suffix","statName":"힘","slots":["무기","투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[14,17],[18,23],[24,29],[30,35],[36,41],[42,47],[48,53],[54,59],[60,65],[66,71],[72,77],[78,83],[84,89],[90,95],[96,101],[102,107],[108,113],[114,119],[120,125],[126,131]],"valueStep":1},
    {"id":"dexterity","type":"suffix","statName":"민첩","slots":["무기","투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[14,17],[18,23],[24,29],[30,35],[36,41],[42,47],[48,53],[54,59],[60,65],[66,71],[72,77],[78,83],[84,89],[90,95],[96,101],[102,107],[108,113],[114,119],[120,125],[126,131]],"valueStep":1},
    {"id":"intelligence","type":"suffix","statName":"지능","slots":["무기","투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[14,17],[18,23],[24,29],[30,35],[36,41],[42,47],[48,53],[54,59],[60,65],[66,71],[72,77],[78,83],[84,89],[90,95],[96,101],[102,107],[108,113],[114,119],[120,125],[126,131]],"valueStep":1},
    {"id":"accuracy","type":"suffix","statName":"정확도","slots":["무기","장갑","반지","목걸이"],"affixBalanceVersion":2,"tierValues":[[150,186],[187,246],[247,306],[307,366],[367,426],[427,486],[487,546],[547,606],[607,666],[667,726],[727,786],[787,846],[847,906],[907,966],[967,1026],[1027,1086],[1087,1146],[1147,1206],[1207,1266],[1267,1326]],"valueStep":1},
    {"id":"armor","type":"prefix","statName":"방어도","slots":["투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[22,28],[29,38],[39,48],[49,58],[59,68],[69,78],[79,88],[89,98],[99,108],[109,118],[119,128],[129,138],[139,148],[149,158],[159,168],[169,178],[179,188],[189,198],[199,208],[209,218]],"valueStep":1},
    {"id":"evasion","type":"prefix","statName":"회피","slots":["투구","갑옷","장갑","신발","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[22,28],[29,38],[39,48],[49,58],[59,68],[69,78],[79,88],[89,98],[99,108],[109,118],[119,128],[129,138],[139,148],[149,158],[159,168],[169,178],[179,188],[189,198],[199,208],[209,218]],"valueStep":1},
    {"id":"energyShield","type":"prefix","statName":"에너지 보호막","slots":["투구","갑옷","장갑","신발","방패"],"affixBalanceVersion":2,"tierValues":[[17,21],[22,29],[30,37],[38,45],[46,53],[54,61],[62,69],[70,77],[78,85],[86,93],[94,101],[102,109],[110,117],[118,125],[126,133],[134,141],[142,149],[150,157],[158,165],[166,173]],"valueStep":1},
    {"id":"armorPct","type":"suffix","statName":"방어도 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"evasionPct","type":"suffix","statName":"회피 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"deflectChance","type":"suffix","statName":"비껴내기 확률(%)","slots":["투구","갑옷","장갑","신발","방패"],"affixBalanceVersion":2,"tierValues":[[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12],[13,13],[14,14],[15,15],[16,16],[17,17],[18,18],[19,19],[20,20],[21,21]],"valueStep":1},
    {"id":"energyShieldPct","type":"suffix","statName":"에너지 보호막 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"affixBalanceVersion":2,"tierValues":[[10,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,40],[41,44],[45,48],[49,52],[53,56],[57,60],[61,64],[65,68],[69,72],[73,76],[77,80],[81,84],[85,88]],"valueStep":1},
    {"id":"pctHp","type":"suffix","statName":"생명력 증가(%)","slots":["갑옷","허리띠"],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,26],[27,29],[30,32],[33,35],[36,38],[39,41],[42,44],[45,47],[48,50],[51,53],[54,56],[57,59],[60,62],[63,65]],"valueStep":1},
    {"id":"aspd","type":"suffix","statName":"공격 속도(%)","slots":["무기","반지","목걸이","허리띠","장갑"],"affixBalanceVersion":2,"tierValues":[[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43]],"valueStep":1},
    {"id":"crit","type":"suffix","statName":"치명타 확률(%)","slots":["무기","투구","갑옷","장갑","신발","목걸이","반지","허리띠"],"affixBalanceVersion":2,"tierValues":[[1,1.3],[1.31,1.8],[1.81,2.2],[2.21,2.7],[2.71,3.2],[3.21,3.7],[3.71,4.2],[4.21,4.7],[4.71,5.2],[5.21,5.7],[5.71,6.2],[6.21,6.8],[6.81,7.3],[7.31,7.8],[7.81,8.3],[8.31,8.8],[8.81,9.3],[9.31,9.8],[9.81,10.3],[10.31,10.8]],"valueStep":0.01},
    {"id":"move","type":"suffix","statName":"이동 속도(%)","slots":["신발"],"affixBalanceVersion":2,"tierValues":[[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43],[44,45]],"valueStep":1},
    {"id":"gemLevel","type":"special","statName":"모든 스킬 젬 레벨","slots":["목걸이"],"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"physIgnore","type":"suffix","statName":"물리 피해 감소 무시(%)","slots":["무기","장갑","목걸이"],"affixBalanceVersion":2,"tierValues":[[1.9,2.4],[2.41,3.3],[3.31,4.2],[4.21,5.1],[5.11,6],[6.01,6.9],[6.91,7.8],[7.81,8.7],[8.71,9.6],[9.61,10.5],[10.51,11.4],[11.41,12.3],[12.31,13.2],[13.21,14.1],[14.11,15],[15.01,15.9],[15.91,16.8],[16.81,17.7],[17.71,18.6],[18.61,19.5]],"valueStep":0.01},
    {"id":"resF","type":"suffix","statName":"화염 저항(%)","slots":["반지","목걸이","갑옷","투구","신발","장갑","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[3,4],[5,6],[7,9],[10,11],[12,13],[14,16],[17,18],[19,20],[21,22],[23,25],[26,27],[28,29],[30,31],[32,34],[35,36],[37,38],[39,40],[41,43],[44,45],[46,48]],"valueStep":1},
    {"id":"resC","type":"suffix","statName":"냉기 저항(%)","slots":["반지","목걸이","갑옷","투구","신발","장갑","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[3,4],[5,6],[7,9],[10,11],[12,13],[14,16],[17,18],[19,20],[21,22],[23,25],[26,27],[28,29],[30,31],[32,34],[35,36],[37,38],[39,40],[41,43],[44,45],[46,48]],"valueStep":1},
    {"id":"resL","type":"suffix","statName":"번개 저항(%)","slots":["반지","목걸이","갑옷","투구","신발","장갑","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[3,4],[5,6],[7,9],[10,11],[12,13],[14,16],[17,18],[19,20],[21,22],[23,25],[26,27],[28,29],[30,31],[32,34],[35,36],[37,38],[39,40],[41,43],[44,45],[46,48]],"valueStep":1},
    {"id":"resAll","type":"suffix","statName":"모든 원소 저항(%)","slots":["반지","목걸이","갑옷","방패"],"affixBalanceVersion":2,"tierValues":[[1,1],[2,3],[4,4],[5,6],[7,8],[9,9],[10,11],[12,12],[13,14],[15,15],[16,17],[18,18],[19,20],[21,21],[22,23],[24,24],[25,26],[27,27],[28,29],[30,32]],"valueStep":1},
    {"id":"resChaos","type":"suffix","statName":"카오스 저항(%)","slots":["반지","방패"],"affixBalanceVersion":2,"tierValues":[[1,1],[2,3],[4,4],[5,6],[7,7],[8,9],[10,10],[11,11],[12,13],[14,14],[15,16],[17,17],[18,18],[19,20],[21,21],[22,23],[24,24],[25,26],[27,27],[28,30]],"valueStep":1},
    {"id":"resPen","type":"suffix","statName":"저항 관통(%)","slots":["무기","반지","목걸이"],"affixBalanceVersion":2,"tierValues":[[0.8,1.2],[1.21,2],[2.01,2.8],[2.81,3.6],[3.61,4.4],[4.41,5.2],[5.21,6],[6.01,6.8],[6.81,7.6],[7.61,8.4],[8.41,9.2],[9.21,10],[10.01,10.8],[10.81,11.6],[11.61,12.4],[12.41,13.2],[13.21,14],[14.01,14.8],[14.81,15.6],[15.61,16.4]],"valueStep":0.01},
    {"id":"regen","type":"suffix","statName":"초당 재생(%)","slots":["갑옷","허리띠","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[0.3,0.3],[0.31,0.4],[0.41,0.5],[0.51,0.6],[0.61,0.7],[0.71,0.8],[0.81,0.9],[0.91,1],[1.01,1.1],[1.11,1.2],[1.21,1.3],[1.31,1.4],[1.41,1.5],[1.51,1.6],[1.61,1.7],[1.71,1.8],[1.81,1.9],[1.91,2],[2.01,2.1],[2.11,2.2]],"valueStep":0.01},
    {"id":"regenFlat","type":"suffix","statName":"생명력 재생(고정)","slots":["갑옷","목걸이","반지","허리띠","방패"],"affixBalanceVersion":2,"tierValues":[[32,39],[40,51],[52,63],[64,75],[76,87],[88,99],[100,111],[112,123],[124,135],[136,147],[148,159],[160,171],[172,183],[184,195],[196,207],[208,219],[220,231],[232,243],[244,255],[256,267]],"valueStep":1},
    {"id":"regenSuppress","type":"suffix","statName":"재생 억제(%)","slots":["허리띠"],"affixBalanceVersion":2,"tierValues":[[0.36,0.39],[0.4,0.45],[0.46,0.51],[0.52,0.57],[0.58,0.63],[0.64,0.69],[0.7,0.75],[0.76,0.81],[0.82,0.87],[0.88,0.93],[0.94,0.99],[1,1.05],[1.06,1.11],[1.12,1.17],[1.18,1.23],[1.24,1.29],[1.3,1.35],[1.36,1.41],[1.42,1.47],[1.48,1.53]],"valueStep":0.01},
    {"id":"regenSuppressGloves","statId":"regenSuppress","type":"suffix","statName":"재생 억제(%)","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[0.12,0.16],[0.17,0.23],[0.24,0.3],[0.31,0.37],[0.38,0.44],[0.45,0.51],[0.52,0.58],[0.59,0.65],[0.66,0.72],[0.73,0.79],[0.8,0.86],[0.87,0.93],[0.94,1],[1.01,1.07],[1.08,1.14],[1.15,1.21],[1.22,1.28],[1.29,1.35],[1.36,1.42],[1.43,1.49]],"valueStep":0.01},
    {"id":"regenSuppressAmulet","statId":"regenSuppress","type":"suffix","statName":"재생 억제(%)","slots":["목걸이"],"affixBalanceVersion":2,"tierValues":[[0.1,0.1]],"fixedValue":true,"valueStep":0.01},
    {"id":"targetAny","type":"special","statName":"스킬 타겟 수","slots":["장갑"],"weight":0.45,"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"targetProjectile","type":"special","statName":"투사체 스킬 타겟 수","slots":["무기"],"weight":0.45,"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"projectileExtraShots","type":"special","statName":"투사체 추가 발사 확률(%)","slots":["무기"],"weight":0.4,"affixBalanceVersion":2,"tierValues":[[100,125],[126,175],[176,225],[226,275],[276,325],[326,375],[376,425],[426,475],[476,525],[526,575],[576,625],[626,675],[676,725],[726,775],[776,825],[826,875],[876,925],[926,975],[976,1025],[1026,1100]],"statId":"projectileExtraChance","valueStep":1},
    {"id":"targetSlam","type":"special","statName":"강타 스킬 타겟 수","slots":["무기"],"weight":0.45,"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"leech","type":"suffix","statName":"공격 피해의 생명력 흡수(%)","slots":["무기","장갑","반지"],"affixBalanceVersion":2,"tierValues":[[0.16,0.2],[0.21,0.28],[0.29,0.36],[0.37,0.44],[0.45,0.52],[0.53,0.6],[0.61,0.68],[0.69,0.76],[0.77,0.84],[0.85,0.92],[0.93,1],[1.01,1.08],[1.09,1.16],[1.17,1.24],[1.25,1.32],[1.33,1.4],[1.41,1.48],[1.49,1.56],[1.57,1.64],[1.65,1.72]],"valueStep":0.01},
    {"id":"leechRateCap","type":"suffix","statName":"흡혈 회복 속도 캡(%)","slots":["무기","장갑","목걸이"],"affixBalanceVersion":2,"tierValues":[[0.6,0.7],[0.71,0.9],[0.91,1.1],[1.11,1.3],[1.31,1.5],[1.51,1.7],[1.71,1.9],[1.91,2.1],[2.11,2.3],[2.31,2.5],[2.51,2.7],[2.71,2.9],[2.91,3.1],[3.11,3.3],[3.31,3.5],[3.51,3.7],[3.71,3.9],[3.91,4.1],[4.11,4.3],[4.31,4.5]],"valueStep":0.01},
    {"id":"leechTotalCap","type":"suffix","statName":"흡혈 총 회복량 캡(%)","slots":["갑옷","허리띠","목걸이"],"affixBalanceVersion":2,"tierValues":[[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12],[13,13],[14,14],[15,15],[16,16],[17,17],[18,18],[19,19],[20,20],[21,21],[22,22]],"valueStep":1},
    {"id":"leechInstanceCap","type":"suffix","statName":"흡혈 타격당 회복량 캡(%)","slots":["무기","반지","장갑"],"affixBalanceVersion":2,"tierValues":[[1.5,1.8],[1.81,2.2],[2.21,2.7],[2.71,3.2],[3.21,3.7],[3.71,4.2],[4.21,4.7],[4.71,5.2],[5.21,5.7],[5.71,6.2],[6.21,6.8],[6.81,7.3],[7.31,7.8],[7.81,8.3],[8.31,8.8],[8.81,9.3],[9.31,9.8],[9.81,10.3],[10.31,10.8],[10.81,11.3]],"valueStep":0.01},
    {"id":"dr","type":"suffix","statName":"물리 피해 감소(%)","slots":["갑옷","허리띠","투구"],"affixBalanceVersion":2,"tierValues":[[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43]],"valueStep":1},
    {"id":"critDmg","type":"suffix","statName":"치명타 피해 배율(%)","slots":["무기","목걸이","투구"],"affixBalanceVersion":2,"tierValues":[[16,19],[20,25],[26,31],[32,37],[38,43],[44,49],[50,55],[56,61],[62,67],[68,73],[74,79],[80,85],[86,91],[92,97],[98,103],[104,109],[110,115],[116,121],[122,127],[128,133]],"valueStep":1},
    {"id":"ds","type":"suffix","statName":"연속 타격(%)","slots":["장갑","무기"],"affixBalanceVersion":2,"tierValues":[[8,9],[10,12],[13,15],[16,18],[19,21],[22,24],[25,27],[28,30],[31,33],[34,36],[37,39],[40,42],[43,45],[46,48],[49,51],[52,54],[55,57],[58,60],[61,63],[64,66]],"valueStep":1},
    {"id":"minDmgRollWeapon","statId":"minDmgRoll","type":"suffix","statName":"최소 피해 보정(%)","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43],[44,45]],"valueStep":1},
    {"id":"maxDmgRollWeapon","statId":"maxDmgRoll","type":"suffix","statName":"최대 피해 보정(%)","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19],[20,21],[22,23],[24,25],[26,27],[28,29],[30,31],[32,33],[34,35],[36,37],[38,39],[40,41],[42,43],[44,45]],"valueStep":1},
    {"id":"suppCap","type":"special","statName":"보조 스킬 젬 한도","slots":["목걸이"],"affixBalanceVersion":2,"tierValues":[[1,1]],"fixedValue":true,"valueStep":1},
    {"id":"shieldBlockPct","statId":"blockChancePct","type":"suffix","statName":"막기 확률(%) 증가","slots":["방패"],"affixBalanceVersion":2,"tierValues":[[20,24],[25,32],[33,40],[41,48],[49,56],[57,64],[65,72],[73,80],[81,88],[89,96],[97,104],[105,112],[113,120],[121,128],[129,136],[137,144],[145,152],[153,160],[161,168],[169,176]],"valueStep":1},
    {"id":"shieldBlockFlat","statId":"blockChance","type":"suffix","statName":"막기 확률(+%p)","slots":["방패"],"affixBalanceVersion":2,"tierValues":[[1.8,2.2],[2.21,3],[3.01,3.8],[3.81,4.6],[4.61,5.4],[5.41,6.2],[6.21,7],[7.01,7.8],[7.81,8.6],[8.61,9.4],[9.41,10.2],[10.21,11],[11.01,11.8],[11.81,12.6],[12.61,13.4],[13.41,14.2],[14.21,15],[15.01,15.8],[15.81,16.6],[16.61,17.4]],"valueStep":0.01},
    {"id":"shieldMaxResF","statId":"maxResF","type":"special","statName":"최대 화염 저항(%)","slots":["방패"],"weight":0.35,"affixBalanceVersion":2,"tierValues":[[1.3,1.4],[1.41,1.7],[1.71,2],[2.01,2.3],[2.31,2.6],[2.61,2.9],[2.91,3.2],[3.21,3.5],[3.51,3.8],[3.81,4.1],[4.11,4.4],[4.41,4.7],[4.71,5],[5.01,5.3],[5.31,5.6],[5.61,5.9],[5.91,6.2],[6.21,6.5],[6.51,6.8],[6.81,7.1]],"valueStep":0.01},
    {"id":"shieldMaxResC","statId":"maxResC","type":"special","statName":"최대 냉기 저항(%)","slots":["방패"],"weight":0.35,"affixBalanceVersion":2,"tierValues":[[1.3,1.4],[1.41,1.7],[1.71,2],[2.01,2.3],[2.31,2.6],[2.61,2.9],[2.91,3.2],[3.21,3.5],[3.51,3.8],[3.81,4.1],[4.11,4.4],[4.41,4.7],[4.71,5],[5.01,5.3],[5.31,5.6],[5.61,5.9],[5.91,6.2],[6.21,6.5],[6.51,6.8],[6.81,7.1]],"valueStep":0.01},
    {"id":"shieldMaxResL","statId":"maxResL","type":"special","statName":"최대 번개 저항(%)","slots":["방패"],"weight":0.35,"affixBalanceVersion":2,"tierValues":[[1.3,1.4],[1.41,1.7],[1.71,2],[2.01,2.3],[2.31,2.6],[2.61,2.9],[2.91,3.2],[3.21,3.5],[3.51,3.8],[3.81,4.1],[4.11,4.4],[4.41,4.7],[4.71,5],[5.01,5.3],[5.31,5.6],[5.61,5.9],[5.91,6.2],[6.21,6.5],[6.51,6.8],[6.81,7.1]],"valueStep":0.01},
    {"id":"shieldMaxResChaos","statId":"maxResChaos","type":"special","statName":"최대 카오스 저항(%)","slots":["방패"],"weight":0.25,"affixBalanceVersion":2,"tierValues":[[1.1,1.1],[1.11,1.3],[1.31,1.4],[1.41,1.6],[1.61,1.8],[1.81,1.9],[1.91,2],[2.01,2.2],[2.21,2.3],[2.31,2.5],[2.51,2.6],[2.61,2.8],[2.81,3],[3.01,3.1],[3.11,3.3],[3.31,3.4],[3.41,3.5],[3.51,3.7],[3.71,3.9],[3.91,4]],"valueStep":0.01},
    {"id":"shieldMaxResAll","statId":"maxResAll","type":"special","statName":"모든 원소 최대 저항(%)","slots":["방패"],"tierValues":[[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1],[1,2]],"weight":0.15,"affixBalanceVersion":2,"valueStep":1},
    {"id":"shieldSpellGemLevel","statId":"spellGemLevel","type":"special","statName":"모든 주문 스킬 젬 레벨","slots":["방패"],"weight":0.3,"affixBalanceVersion":2,"tierValues":[[1.7,2.1],[2.11,2.8],[2.81,3.5],[3.51,4.2],[4.21,4.9],[4.91,5.6],[5.61,6.3],[6.31,7],[7.01,7.7],[7.71,8.4],[8.41,9.1],[9.11,9.8],[9.81,10.5],[10.51,11.2],[11.21,11.9],[11.91,12.6],[12.61,13.3],[13.31,14],[14.01,14.7],[14.71,15.4]],"valueStep":0.01},
    {"id":"weaponPhysFlatDmg","statId":"physFlatDmg","type":"prefix","statName":"물리 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[8,9],[10,13],[14,17],[18,22],[23,27],[28,34],[35,41],[42,48],[49,56],[57,64],[65,73],[74,82],[83,91],[92,101],[102,111],[112,121],[122,132],[133,143],[144,154],[155,165]],"valueStep":1},
    {"id":"weaponFireFlatDmg","statId":"fireFlatDmg","type":"prefix","statName":"화염 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[14,18],[19,23],[24,31],[32,41],[42,52],[53,65],[66,78],[79,93],[94,108],[109,124],[125,141],[142,159],[160,177],[178,196],[197,215],[216,235],[236,255],[256,276],[277,298],[299,320]],"valueStep":1},
    {"id":"weaponColdFlatDmg","statId":"coldFlatDmg","type":"prefix","statName":"냉기 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[14,18],[19,23],[24,31],[32,41],[42,52],[53,65],[66,78],[79,93],[94,108],[109,124],[125,141],[142,159],[160,177],[178,196],[197,215],[216,235],[236,255],[256,276],[277,298],[299,320]],"valueStep":1},
    {"id":"weaponLightFlatDmg","statId":"lightFlatDmg","type":"prefix","statName":"번개 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[14,18],[19,23],[24,31],[32,41],[42,52],[53,65],[66,78],[79,93],[94,108],[109,124],[125,141],[142,159],[160,177],[178,196],[197,215],[216,235],[236,255],[256,276],[277,298],[299,320]],"valueStep":1},
    {"id":"weaponChaosFlatDmg","statId":"chaosFlatDmg","type":"prefix","statName":"카오스 기본 피해","slots":["무기"],"affixBalanceVersion":2,"tierValues":[[14,18],[19,23],[24,31],[32,41],[42,52],[53,65],[66,78],[79,93],[94,108],[109,124],[125,141],[142,159],[160,177],[178,196],[197,215],[216,235],[236,255],[256,276],[277,298],[299,320]],"valueStep":1},
    {"id":"ringPhysFlatDmg","statId":"physFlatDmg","type":"prefix","statName":"물리 기본 피해","slots":["반지"],"affixBalanceVersion":2,"tierValues":[[7,7],[8,9],[10,11],[12,14],[15,17],[18,20],[21,23],[24,27],[28,31],[32,35],[36,39],[40,44],[45,48],[49,53],[54,58],[59,63],[64,68],[69,74],[75,79],[80,85]],"valueStep":1},
    {"id":"ringFireFlatDmg","statId":"fireFlatDmg","type":"prefix","statName":"화염 기본 피해","slots":["반지"],"affixBalanceVersion":2,"tierValues":[[10,11],[12,13],[14,17],[18,20],[21,24],[25,29],[30,34],[35,39],[40,44],[45,50],[51,56],[57,62],[63,68],[69,74],[75,81],[82,88],[89,95],[96,102],[103,109],[110,120]],"valueStep":1},
    {"id":"ringColdFlatDmg","statId":"coldFlatDmg","type":"prefix","statName":"냉기 기본 피해","slots":["반지"],"affixBalanceVersion":2,"tierValues":[[10,11],[12,13],[14,17],[18,20],[21,24],[25,29],[30,34],[35,39],[40,44],[45,50],[51,56],[57,62],[63,68],[69,74],[75,81],[82,88],[89,95],[96,102],[103,109],[110,120]],"valueStep":1},
    {"id":"ringLightFlatDmg","statId":"lightFlatDmg","type":"prefix","statName":"번개 기본 피해","slots":["반지"],"affixBalanceVersion":2,"tierValues":[[10,11],[12,13],[14,17],[18,20],[21,24],[25,29],[30,34],[35,39],[40,44],[45,50],[51,56],[57,62],[63,68],[69,74],[75,81],[82,88],[89,95],[96,102],[103,109],[110,120]],"valueStep":1},
    {"id":"ringChaosFlatDmg","statId":"chaosFlatDmg","type":"prefix","statName":"카오스 기본 피해","slots":["반지"],"affixBalanceVersion":2,"tierValues":[[10,11],[12,13],[14,17],[18,20],[21,24],[25,29],[30,34],[35,39],[40,44],[45,50],[51,56],[57,62],[63,68],[69,74],[75,81],[82,88],[89,95],[96,102],[103,109],[110,120]],"valueStep":1},
    {"id":"glovePhysFlatDmg","statId":"physFlatDmg","type":"prefix","statName":"물리 기본 피해","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[8,8],[9,11],[12,13],[14,16],[17,20],[21,24],[25,28],[29,33],[34,38],[39,43],[44,48],[49,54],[55,59],[60,65],[66,72],[73,78],[79,84],[85,91],[92,98],[99,105]],"valueStep":1},
    {"id":"gloveFireFlatDmg","statId":"fireFlatDmg","type":"prefix","statName":"화염 기본 피해","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[12,13],[14,16],[17,20],[21,25],[26,30],[31,37],[38,43],[44,50],[51,57],[58,65],[66,73],[74,82],[83,91],[92,100],[101,109],[110,119],[120,129],[130,139],[140,149],[150,160]],"valueStep":1},
    {"id":"gloveColdFlatDmg","statId":"coldFlatDmg","type":"prefix","statName":"냉기 기본 피해","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[12,13],[14,16],[17,20],[21,25],[26,30],[31,37],[38,43],[44,50],[51,57],[58,65],[66,73],[74,82],[83,91],[92,100],[101,109],[110,119],[120,129],[130,139],[140,149],[150,160]],"valueStep":1},
    {"id":"gloveLightFlatDmg","statId":"lightFlatDmg","type":"prefix","statName":"번개 기본 피해","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[12,13],[14,16],[17,20],[21,25],[26,30],[31,37],[38,43],[44,50],[51,57],[58,65],[66,73],[74,82],[83,91],[92,100],[101,109],[110,119],[120,129],[130,139],[140,149],[150,160]],"valueStep":1},
    {"id":"gloveChaosFlatDmg","statId":"chaosFlatDmg","type":"prefix","statName":"카오스 기본 피해","slots":["장갑"],"affixBalanceVersion":2,"tierValues":[[12,13],[14,16],[17,20],[21,25],[26,30],[31,37],[38,43],[44,50],[51,57],[58,65],[66,73],[74,82],[83,91],[92,100],[101,109],[110,119],[120,129],[130,139],[140,149],[150,160]],"valueStep":1},
    {"id":"compoundArmor","statId":"armor","type":"prefix","statName":"방어도 + 방어도 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"compound":[{"statId":"armorPct","statName":"방어도 증가(%)","tierValues":[[3,3.7],[3.71,4.9],[4.91,6.1],[6.11,7.3],[7.31,8.5],[8.51,9.7],[9.71,10.9],[10.91,12.1],[12.11,13.3],[13.31,14.5],[14.51,15.7],[15.71,16.9],[16.91,18.1],[18.11,19.3],[19.31,20.5],[20.51,21.7],[21.71,22.9],[22.91,24.1],[24.11,25.3],[25.31,26.5]],"affixBalanceVersion":2,"valueStep":0.01}],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,26],[27,29],[30,32],[33,35],[36,38],[39,41],[42,44],[45,47],[48,50],[51,53],[54,56],[57,59],[60,62],[63,65]],"valueStep":1},
    {"id":"compoundEvasion","statId":"evasion","type":"prefix","statName":"회피 + 회피 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"compound":[{"statId":"evasionPct","statName":"회피 증가(%)","tierValues":[[3,3.7],[3.71,4.9],[4.91,6.1],[6.11,7.3],[7.31,8.5],[8.51,9.7],[9.71,10.9],[10.91,12.1],[12.11,13.3],[13.31,14.5],[14.51,15.7],[15.71,16.9],[16.91,18.1],[18.11,19.3],[19.31,20.5],[20.51,21.7],[21.71,22.9],[22.91,24.1],[24.11,25.3],[25.31,26.5]],"affixBalanceVersion":2,"valueStep":0.01}],"affixBalanceVersion":2,"tierValues":[[7,8],[9,11],[12,14],[15,17],[18,20],[21,23],[24,26],[27,29],[30,32],[33,35],[36,38],[39,41],[42,44],[45,47],[48,50],[51,53],[54,56],[57,59],[60,62],[63,65]],"valueStep":1},
    {"id":"compoundEnergyShield","statId":"energyShield","type":"prefix","statName":"에너지 보호막 + 보호막 증가(%)","slots":["투구","갑옷","장갑","신발","방패"],"compound":[{"statId":"energyShieldPct","statName":"에너지 보호막 증가(%)","tierValues":[[3,3.7],[3.71,4.9],[4.91,6.1],[6.11,7.3],[7.31,8.5],[8.51,9.7],[9.71,10.9],[10.91,12.1],[12.11,13.3],[13.31,14.5],[14.51,15.7],[15.71,16.9],[16.91,18.1],[18.11,19.3],[19.31,20.5],[20.51,21.7],[21.71,22.9],[22.91,24.1],[24.11,25.3],[25.31,26.5]],"affixBalanceVersion":2,"valueStep":0.01}],"affixBalanceVersion":2,"tierValues":[[5.1,6.5],[6.51,8.9],[8.91,11.3],[11.31,13.7],[13.71,16.1],[16.11,18.5],[18.51,20.9],[20.91,23.3],[23.31,25.7],[25.71,28.1],[28.11,30.5],[30.51,32.9],[32.91,35.3],[35.31,37.7],[37.71,40.1],[40.11,42.5],[42.51,44.9],[44.91,47.3],[47.31,49.7],[49.71,52.1]],"valueStep":0.01},
    {"id":"compoundWeaponDmg","statId":"flatDmg","type":"prefix","statName":"기본 피해 + 무기의 기본 피해 증가(%)","slots":["무기"],"compound":[{"statId":"weaponFlatDmgPct","statName":"무기의 기본 피해 증가(%)","tierValues":[[3,3.7],[3.71,4.9],[4.91,6.1],[6.11,7.3],[7.31,8.5],[8.51,9.7],[9.71,10.9],[10.91,12.1],[12.11,13.3],[13.31,14.5],[14.51,15.7],[15.71,16.9],[16.91,18.1],[18.11,19.3],[19.31,20.5],[20.51,21.7],[21.71,22.9],[22.91,24.1],[24.11,25.3],[25.31,26.5]],"affixBalanceVersion":2,"valueStep":0.01}],"affixBalanceVersion":2,"tierValues":[[4,4],[5,6],[7,9],[10,12],[13,15],[16,19],[20,22],[23,27],[28,31],[32,36],[37,40],[41,46],[47,51],[52,57],[58,62],[63,68],[69,74],[75,80],[81,86],[87,93]],"valueStep":1},
    {"id":"ringFlatDmg","statId":"flatDmg","type":"prefix","statName":"기본 피해","slots":["반지"],"tierValues":[[6,6],[7,8],[9,10],[11,13],[14,16],[17,19],[20,22],[23,26],[27,29],[30,33],[34,37],[38,41],[42,46],[47,50],[51,55],[56,59],[60,64],[65,69],[70,74],[75,80]],"affixBalanceVersion":2,"valueStep":1},
    {"id":"gloveFlatDmg","statId":"flatDmg","type":"prefix","statName":"기본 피해","slots":["장갑"],"tierValues":[[6,6],[7,9],[10,12],[13,15],[16,18],[19,22],[23,26],[27,31],[32,35],[36,40],[41,45],[46,51],[52,56],[57,62],[63,68],[69,74],[75,80],[81,87],[88,93],[94,100]],"affixBalanceVersion":2,"valueStep":1},
    {"id":"accessoryFlatDmg","statId":"flatDmg","type":"prefix","statName":"기본 피해","slots":["목걸이","허리띠"],"tierValues":[[6,6],[7,8],[9,11],[12,14],[15,17],[18,21],[22,24],[25,28],[29,32],[33,37],[38,41],[42,46],[47,51],[52,56],[57,61],[62,67],[68,72],[73,78],[79,84],[85,90]],"affixBalanceVersion":2,"valueStep":1},
    {"id":"attackPctDmg","type":"prefix","statName":"공격 피해 증가(%)","slots":["무기","장갑","목걸이"],"tierValues":[[10,12],[13,17],[18,23],[24,28],[29,34],[35,39],[40,45],[46,50],[51,55],[56,61],[62,66],[67,72],[73,77],[78,82],[83,88],[89,93],[94,98],[99,104],[105,109],[110,115]],"affixBalanceVersion":2,"valueStep":1},
    {"id":"spellPctDmg","type":"prefix","statName":"주문 피해 증가(%)","slots":["무기","목걸이","방패"],"tierValues":[[10,12],[13,17],[18,23],[24,28],[29,34],[35,39],[40,45],[46,50],[51,55],[56,61],[62,66],[67,72],[73,77],[78,82],[83,88],[89,93],[94,98],[99,104],[105,109],[110,115]],"affixBalanceVersion":2,"valueStep":1},
    {"id":"spellLeech","type":"suffix","statName":"주문 피해의 생명력 흡수(%)","slots":["무기","목걸이","방패"],"affixBalanceVersion":2,"tierValues":[[0.16,0.16],[0.17,0.24],[0.25,0.32],[0.33,0.4],[0.41,0.48],[0.49,0.56],[0.57,0.64],[0.65,0.72],[0.73,0.8],[0.81,0.88],[0.89,0.96],[0.97,1.04],[1.05,1.12],[1.13,1.2],[1.21,1.28],[1.29,1.36],[1.37,1.44],[1.45,1.52],[1.53,1.6],[1.61,1.72]],"valueStep":0.01}
];

const FOSSIL_DB = [
    { key: 'fossilJagged', name: '톱니 화석', desc: '물리/근접 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['physPctDmg', 'meleePctDmg', 'flatDmg', 'physIgnore'] },
    { key: 'fossilBound', name: '속박 화석', desc: '생명/방어 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['flatHp', 'pctHp', 'dr', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct'] },
    { key: 'fossilGale', name: '돌풍 화석', desc: '속도/치명 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['aspd', 'crit', 'move'] },
    { key: 'fossilPrismatic', name: '프리즘 화석', desc: '저항/원소 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['resAll', 'resF', 'resC', 'resL', 'elementalPctDmg', 'resPen'] },
    { key: 'fossilAbyssal', name: '심연 화석', desc: '카오스/흡혈/재생 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['chaosPctDmg', 'leech', 'regen'] },
    { key: 'fossilPrimordial', name: '태고 화석', desc: '원시 고대 화석 복원으로 얻습니다. 관통/카오스 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['physIgnore', 'resPen', 'chaosPctDmg', 'critDmg'], ancientPrimalOnly: true },
    { key: 'fossilBulwark', name: '방패 화석', desc: '최대 화염/냉기/번개 저항 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다. 방어구 전용: 투구/갑옷/장갑/신발/방패.', guaranteedStats: ['maxResF', 'maxResC', 'maxResL'] },
    { key: 'fossilWedge', name: '쐐기 화석', desc: '투사체/치명 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: ['projectileExtraChance', 'projectilePctDmg', 'crit'] },
    { key: 'fossilOld', name: '오래된 화석', desc: '화석 전용 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.', guaranteedStats: [] },
    { key: 'fossilRift', name: '균열 화석', desc: '희귀 아이템의 옵션을 다시 굴리고, 제거할 수 없는 균열 표식과 나머지 추가 옵션 50% 증폭 효과를 부여합니다.', guaranteedStats: [] }
];

/**
 * @typedef {'spore'|'fossil'|'transplant'} EquipmentCraftSource
 * Explicit equipment affixes may store craftSource. Missing means ordinary/unknown legacy origin.
 * Compound substats belong to the parent affix. Rift fossil's blank+amplifier form one effect.
 */
const FOSSIL_EXCLUSIVE_MODS = [
    { id: 'fossilVoidHeart', statId: 'chaosPctDmg', type: 'special', statName: '심연 맥동 (카오스 피해%)', slots: ['무기', '목걸이', '반지'], base: 6, step: 2.5, fixedVal: 55, fossilExclusive: true },
    { id: 'fossilWarMarch', statId: 'move', type: 'special', statName: '군단 진군 (이동 속도%)', slots: ['신발', '허리띠'], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: 'fossilSoulWard', statId: 'resAll', type: 'special', statName: '영혼 수호 (모든 원소 저항%)', slots: ['갑옷', '투구', '허리띠'], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: 'fossilGemPulse', statId: 'gemLevel', type: 'special', statName: '룬 맥동 (스킬 젬 레벨)', slots: ['목걸이'], base: 1, step: 0, fixedVal: 1, fixedValue: true, fossilExclusive: true },
    { id: 'fossilSupportLink', statId: 'suppCap', type: 'special', statName: '결속 잔향 (보조 젬 한도)', slots: ['목걸이'], base: 1, step: 0, fixedVal: 1, fixedValue: true, fossilExclusive: true },
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

// Weapon flat damage was rebased on 2026-09-11: +20% at T1, rising to +140% at T20.
// Values are baked into definitions; legacyDamageBase exists only for old-save conversion.
const BASE_ITEM_DB = [
    { id: 'rusted_blade', slot: '무기', name: '녹슨 검', reqTier: 1, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 5, legacyDamageBase: 4 }] },
    { id: 'apprentice_familiar_wand', slot: '무기', name: '견습 사역봉', reqTier: 1, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 6, legacyDamageBase: 5 }, { id: 'summonPctDmg', base: 10 }, { id: 'summonEfficiency', base: 4 }] },
    { id: 'hunter_axe', slot: '무기', name: '사냥꾼의 도끼', reqTier: 3, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 11, legacyDamageBase: 9 }, { id: 'crit', base: 3 }] },
    { id: 'pact_familiar_wand', slot: '무기', name: '계약 사역봉', reqTier: 4, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 11, legacyDamageBase: 9 }, { id: 'summonPctDmg', base: 14 }, { id: 'summonEfficiency', base: 6 }] },
    { id: 'abyss_spear', slot: '무기', name: '심연의 창', reqTier: 7, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 20, legacyDamageBase: 14 }, { id: 'aspd', base: 6 }] },
    { id: 'bloodletter_blade', slot: '무기', name: '혈각 검', reqTier: 10, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 38, legacyDamageBase: 24 }, { id: 'crit', base: 5 }] },
    { id: 'gale_fang_spear', slot: '무기', name: '질풍 송곳창', reqTier: 10, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 38, legacyDamageBase: 24 }, { id: 'aspd', base: 8 }] },
    { id: 'executioner_blade', slot: '무기', name: '처형자의 검', reqTier: 14, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 71, legacyDamageBase: 38 }, { id: 'crit', base: 8 }] },
    { id: 'tempest_pike', slot: '무기', name: '폭풍 장창', reqTier: 15, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 82, legacyDamageBase: 42 }, { id: 'aspd', base: 10 }] },
    { id: 'windlash_bow', slot: '무기', name: '돌풍 장궁', reqTier: 5, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 14, legacyDamageBase: 11 }, { id: 'projectilePctDmg', base: 10 }] },
    { id: 'stormbolt_launcher', slot: '무기', name: '폭전 발사기', reqTier: 10, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 35, legacyDamageBase: 22 }, { id: 'projectilePctDmg', base: 18 }, { id: 'projectileExtraChance', base: 50 }] },
    { id: 'starfall_ballista', slot: '무기', name: '유성 발리스타', reqTier: 15, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 72, legacyDamageBase: 37 }, { id: 'projectilePctDmg', base: 26 }, { id: 'projectileExtraChance', base: 100 }] },
    { id: 'needle_recurve', slot: '무기', name: '바늘 리커브', reqTier: 8, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 26, legacyDamageBase: 18 }, { id: 'projectilePctDmg', base: 14 }] },
    { id: 'spiritbound_wand', slot: '무기', name: '영혼 결속봉', reqTier: 8, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 23, legacyDamageBase: 16 }, { id: 'summonPctDmg', base: 22 }, { id: 'summonEfficiency', base: 10 }] },
    { id: 'seeker_railgun', slot: '무기', name: '추적 레일건', reqTier: 12, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 48, legacyDamageBase: 28 }, { id: 'projectilePctDmg', base: 22 }, { id: 'projectileExtraChance', base: 100 }] },
    { id: 'tempest_volley', slot: '무기', name: '폭풍 연사궁', reqTier: 15, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 69, legacyDamageBase: 35 }, { id: 'projectilePctDmg', base: 30 }, { id: 'projectileExtraChance', base: 150 }] },
    { id: 'nova_rod', slot: '무기', name: '노바 로드', reqTier: 5, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 9, legacyDamageBase: 7 }, { id: 'spellFlatDmg', base: 26, legacyDamageBase: 20 }] },
    { id: 'rift_scepter', slot: '무기', name: '균열 홀', reqTier: 10, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 22, legacyDamageBase: 14 }, { id: 'spellFlatDmg', base: 60, legacyDamageBase: 38 }, { id: 'spellFlatPct', base: 12 }] },
    { id: 'void_archon_staff', slot: '무기', name: '공허 대현자 지팡이', reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 47, legacyDamageBase: 24 }, { id: 'spellFlatDmg', base: 114, legacyDamageBase: 58 }, { id: 'spellFlatPct', base: 22 }] },
    { id: 'ember_wand', slot: '무기', name: '잿불 완드', reqTier: 8, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 16, legacyDamageBase: 11 }, { id: 'spellFlatDmg', base: 44, legacyDamageBase: 30 }] },
    { id: 'echo_focus', slot: '무기', name: '메아리 초점봉', reqTier: 12, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 29, legacyDamageBase: 17 }, { id: 'spellFlatDmg', base: 80, legacyDamageBase: 46 }, { id: 'spellFlatPct', base: 16 }] },
    { id: 'ritual_familiar_staff', slot: '무기', name: '의식 사역마 지팡이', reqTier: 12, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 41, legacyDamageBase: 24 }, { id: 'summonPctDmg', base: 30 }, { id: 'summonEfficiency', base: 14 }] },
    { id: 'abyss_chant_staff', slot: '무기', name: '심연 창가 지팡이', reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 39, legacyDamageBase: 20 }, { id: 'spellFlatDmg', base: 125, legacyDamageBase: 64 }, { id: 'spellFlatPct', base: 26 }] },
    { id: 'archon_familiar_staff', slot: '무기', name: '아콘 사역마 지팡이', reqTier: 20, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 101, legacyDamageBase: 42 }, { id: 'summonPctDmg', base: 40 }, { id: 'summonEfficiency', base: 18 }] },
    { id: 'doomcleaver_blade', slot: '무기', name: '파멸 대검', reqTier: 17, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 113, legacyDamageBase: 53 }, { id: 'crit', base: 11 }] },
    { id: 'apocalypse_greatblade', slot: '무기', name: '멸세 대검', reqTier: 20, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 154, legacyDamageBase: 64 }, { id: 'crit', base: 14 }] },
    { id: 'cyclone_glaive', slot: '무기', name: '회오리 글레이브', reqTier: 17, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 117, legacyDamageBase: 55 }, { id: 'aspd', base: 13 }] },
    { id: 'tempestlord_lance', slot: '무기', name: '태풍군주 창', reqTier: 20, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 158, legacyDamageBase: 66 }, { id: 'aspd', base: 16 }] },
    { id: 'meteor_repeater', slot: '무기', name: '유성 연사 발리스타', reqTier: 20, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 132, legacyDamageBase: 55 }, { id: 'projectilePctDmg', base: 34 }, { id: 'projectileExtraChance', base: 150 }] },
    { id: 'genesis_void_staff', slot: '무기', name: '창세 공허 지팡이', reqTier: 20, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 82, legacyDamageBase: 34 }, { id: 'spellFlatDmg', base: 187, legacyDamageBase: 78 }, { id: 'spellFlatPct', base: 30 }] },
    // 플라스크(연금술사가 던지는 병): 포션 스킬 · 범위 피해. 향로(사제가 휘두르는 사슬 향로): 번개(신성) 피해 · 초당 재생.
    { id: 'cracked_flask', slot: '무기', name: '금 간 플라스크', reqTier: 1, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 6, legacyDamageBase: 5 }, { id: 'potionPctDmg', base: 10 }] },
    { id: 'catalyst_flask', slot: '무기', name: '촉매 플라스크', reqTier: 5, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 14, legacyDamageBase: 11 }, { id: 'potionPctDmg', base: 14 }, { id: 'poisonChance', base: 5 }] },
    { id: 'volatile_flask', slot: '무기', name: '휘발 플라스크', reqTier: 10, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 35, legacyDamageBase: 22 }, { id: 'potionPctDmg', base: 20 }, { id: 'aoePctDmg', base: 10 }] },
    { id: 'alchemist_retort', slot: '무기', name: '연금 증류병', reqTier: 15, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 66, legacyDamageBase: 34 }, { id: 'potionPctDmg', base: 28 }, { id: 'aoePctDmg', base: 14 }] },
    { id: 'philosopher_flask', slot: '무기', name: '현자의 플라스크', reqTier: 20, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 127, legacyDamageBase: 53 }, { id: 'potionPctDmg', base: 36 }, { id: 'aoePctDmg', base: 18 }] },
    { id: 'tin_censer', slot: '무기', name: '양철 향로', reqTier: 1, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 5, legacyDamageBase: 4 }, { id: 'regen', base: 0.2 }] },
    { id: 'incense_censer', slot: '무기', name: '분향 향로', reqTier: 5, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 14, legacyDamageBase: 11 }, { id: 'lightPctDmg', base: 8 }, { id: 'regen', base: 0.3 }] },
    { id: 'ember_censer', slot: '무기', name: '잉걸 향로', reqTier: 10, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 36, legacyDamageBase: 23 }, { id: 'lightPctDmg', base: 14 }, { id: 'regen', base: 0.4 }] },
    { id: 'chapel_censer', slot: '무기', name: '성당 향로', reqTier: 15, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 70, legacyDamageBase: 36 }, { id: 'lightPctDmg', base: 20 }, { id: 'regen', base: 0.5 }] },
    { id: 'sunrise_censer', slot: '무기', name: '해돋이 향로', reqTier: 20, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: 'flatDmg', base: 140, legacyDamageBase: 58 }, { id: 'lightPctDmg', base: 28 }, { id: 'regen', base: 0.6 }] },
    // 무기 대분류 구멍 메우기(2026-10-03): 곡도 14 · 17 · 20단계(힘과 민첩, 치명타 · 공격 속도), 대검 1 · 4 · 10단계(힘, 치명타),
    // 단궁 1단계(민첩, 투사체). 액트 1부터 여섯 대분류가 다 떨어지고, 곡도도 20단계까지 제 대분류 안에서 승급한다.
    { id: 'crescent_scimitar', slot: '무기', name: '초승 곡도', reqTier: 14, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 62, legacyDamageBase: 33 }, { id: 'crit', base: 8 }, { id: 'aspd', base: 5 }] },
    { id: 'blackiron_scimitar', slot: '무기', name: '흑철 곡도', reqTier: 17, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 100, legacyDamageBase: 47 }, { id: 'crit', base: 11 }, { id: 'aspd', base: 7 }] },
    { id: 'eclipse_scimitar', slot: '무기', name: '월식 곡도', reqTier: 20, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 134, legacyDamageBase: 56 }, { id: 'crit', base: 14 }, { id: 'aspd', base: 9 }] },
    { id: 'dull_greatsword', slot: '무기', name: '무딘 대검', reqTier: 1, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 6, legacyDamageBase: 5 }, { id: 'crit', base: 2 }] },
    { id: 'iron_greatsword', slot: '무기', name: '무쇠 대검', reqTier: 4, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 12, legacyDamageBase: 10 }, { id: 'crit', base: 4 }] },
    { id: 'warden_greatsword', slot: '무기', name: '파수꾼 대검', reqTier: 10, requirementWeights: { strength: 1 }, baseStats: [{ id: 'flatDmg', base: 38, legacyDamageBase: 24 }, { id: 'crit', base: 6 }] },
    { id: 'hunting_shortbow', slot: '무기', name: '사냥 단궁', reqTier: 1, requirementWeights: { dexterity: 1 }, baseStats: [{ id: 'flatDmg', base: 6, legacyDamageBase: 5 }, { id: 'projectilePctDmg', base: 6 }] },
    { id: 'cloth_hood', slot: '투구', name: '천 후드', reqTier: 1, baseStats: [{ id: 'flatHp', base: 12 }, { id: 'energyShield', base: 36 }] },
    { id: 'war_helm', slot: '투구', name: '전투 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'armor', base: 105 }, { id: 'dr', base: 2 }] },
    { id: 'bastion_helm', slot: '투구', name: '보루 투구', reqTier: 8, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 170 }, { id: 'dr', base: 3 }] },
    { id: 'void_crown', slot: '투구', name: '공허 왕관', reqTier: 8, baseStats: [{ id: 'flatHp', base: 50 }, { id: 'energyShield', base: 170 }, { id: 'resChaos', base: 6 }] },
    { id: 'gilded_barbute', slot: '투구', name: '도금 바르부트', reqTier: 8, baseStats: [{ id: 'flatHp', base: 30 }, { id: 'armor', base: 58 }, { id: 'energyShield', base: 58 }] },
    { id: 'warded_sallet', slot: '투구', name: '수호 살렛', reqTier: 8, baseStats: [{ id: 'flatHp', base: 52 }, { id: 'armor', base: 94 }, { id: 'energyShield', base: 92 }] },
    { id: 'leather_vest', slot: '갑옷', name: '가죽 갑옷', reqTier: 1, baseStats: [{ id: 'flatHp', base: 20 }, { id: 'evasion', base: 74 }] },
    { id: 'plate_mail', slot: '갑옷', name: '판금 갑옷', reqTier: 4, baseStats: [{ id: 'flatHp', base: 42 }, { id: 'armor', base: 220 }, { id: 'dr', base: 3 }] },
    { id: 'fortress_plate', slot: '갑옷', name: '요새 판갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 60 }, { id: 'armor', base: 285 }, { id: 'dr', base: 4 }] },
    { id: 'astral_plate', slot: '갑옷', name: '별빛 흉갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 70 }, { id: 'armor', base: 120 }, { id: 'evasion', base: 120 }, { id: 'resAll', base: 6 }] },
    { id: 'templar_mail', slot: '갑옷', name: '성전사 판금', reqTier: 8, baseStats: [{ id: 'flatHp', base: 46 }, { id: 'armor', base: 120 }, { id: 'energyShield', base: 96 }] },
    { id: 'consecrated_cuirass', slot: '갑옷', name: '축성 흉갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 66 }, { id: 'armor', base: 158 }, { id: 'energyShield', base: 138 }] },
    { id: 'hide_gloves', slot: '장갑', name: '가죽 장갑', reqTier: 1, baseStats: [{ id: 'aspd', base: 2 }, { id: 'evasion', base: 18 }] },
    { id: 'grip_gauntlets', slot: '장갑', name: '강철 건틀릿', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'flatHp', base: 16 }, { id: 'armor', base: 55 }] },
    { id: 'storm_touch', slot: '장갑', name: '폭풍 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 7 }, { id: 'crit', base: 5 }, { id: 'evasion', base: 53 }, { id: 'energyShield', base: 53 }] },
    { id: 'ward_gauntlets', slot: '장갑', name: '보호 건틀릿', reqTier: 8, baseStats: [{ id: 'aspd', base: 4 }, { id: 'armor', base: 30 }, { id: 'energyShield', base: 28 }] },
    { id: 'bastion_grips', slot: '장갑', name: '보루 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 52 }, { id: 'energyShield', base: 50 }] },
    { id: 'rag_boots', slot: '신발', name: '헝겊 장화', reqTier: 1, baseStats: [{ id: 'move', base: 5 }, { id: 'energyShield', base: 27 }] },
    { id: 'ranger_boots', slot: '신발', name: '추적자 장화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'flatHp', base: 14 }, { id: 'evasion', base: 65 }] },
    { id: 'deadeye_boots', slot: '신발', name: '명사수 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'evasion', base: 105 }, { id: 'crit', base: 4 }] },
    { id: 'phase_boots', slot: '신발', name: '위상 장화', reqTier: 8, baseStats: [{ id: 'move', base: 16 }, { id: 'energyShield', base: 120 }, { id: 'resC', base: 8 }] },
    { id: 'ranger_guard_helm', slot: '투구', name: '유격 수호 투구', reqTier: 8, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'armor', base: 42 }, { id: 'evasion', base: 42 }] },
    { id: 'mistwatch_hood', slot: '투구', name: '안개감시 두건', reqTier: 8, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 68 }, { id: 'evasion', base: 70 }] },
    { id: 'phantom_guard_helm', slot: '투구', name: '환영 수호투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 96 }, { id: 'evasion', base: 98 }, { id: 'resC', base: 8 }] },
    { id: 'nightward_crown', slot: '투구', name: '밤수호 관', reqTier: 16, baseStats: [{ id: 'flatHp', base: 78 }, { id: 'armor', base: 124 }, { id: 'evasion', base: 128 }, { id: 'resAll', base: 5 }] },
    { id: 'phase_sentinel_helm', slot: '투구', name: '위상 감시 투구', reqTier: 8, baseStats: [{ id: 'flatHp', base: 24 }, { id: 'evasion', base: 38 }, { id: 'energyShield', base: 38 }] },
    { id: 'mistweave_circlet', slot: '투구', name: '안개서린 서클릿', reqTier: 8, baseStats: [{ id: 'flatHp', base: 40 }, { id: 'evasion', base: 64 }, { id: 'energyShield', base: 66 }] },
    { id: 'moonphase_visor', slot: '투구', name: '월상 바이저', reqTier: 12, baseStats: [{ id: 'flatHp', base: 56 }, { id: 'evasion', base: 90 }, { id: 'energyShield', base: 94 }, { id: 'resL', base: 8 }] },
    { id: 'starlit_mask', slot: '투구', name: '성광 가면', reqTier: 16, baseStats: [{ id: 'flatHp', base: 74 }, { id: 'evasion', base: 118 }, { id: 'energyShield', base: 122 }, { id: 'resAll', base: 5 }] },
    { id: 'warded_greaves', slot: '신발', name: '수호 경갑', reqTier: 8, baseStats: [{ id: 'move', base: 10 }, { id: 'armor', base: 46 }, { id: 'energyShield', base: 42 }] },
    { id: 'bastion_striders', slot: '신발', name: '보루 보행화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 72 }, { id: 'energyShield', base: 66 }] },
    { id: 'obsidian_helm', slot: '투구', name: '흑요 투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 230 }, { id: 'resF', base: 10 }] },
    { id: 'guardian_helm', slot: '투구', name: '수호 투구', reqTier: 12, baseStats: [{ id: 'flatHp', base: 58 }, { id: 'armor', base: 230 }, { id: 'dr', base: 4 }] },
    { id: 'moonveil_hood', slot: '투구', name: '월광 두건', reqTier: 12, baseStats: [{ id: 'flatHp', base: 54 }, { id: 'evasion', base: 180 }, { id: 'resC', base: 10 }] },
    { id: 'oracle_circlet', slot: '투구', name: '예언자 서클릿', reqTier: 12, baseStats: [{ id: 'flatHp', base: 48 }, { id: 'energyShield', base: 240 }, { id: 'resL', base: 10 }] },
    { id: 'saint_circlet', slot: '투구', name: '성자 서클릿', reqTier: 12, baseStats: [{ id: 'flatHp', base: 70 }, { id: 'armor', base: 126 }, { id: 'energyShield', base: 132 }, { id: 'resL', base: 8 }] },
    { id: 'dread_plate', slot: '갑옷', name: '공포 판갑', reqTier: 16, baseStats: [{ id: 'flatHp', base: 92 }, { id: 'armor', base: 430 }, { id: 'dr', base: 4 }] },
    { id: 'windrunner_coat', slot: '갑옷', name: '질풍 외투', reqTier: 16, baseStats: [{ id: 'flatHp', base: 84 }, { id: 'evasion', base: 365 }, { id: 'move', base: 12 }] },
    { id: 'astral_robe', slot: '갑옷', name: '성운 로브', reqTier: 16, baseStats: [{ id: 'flatHp', base: 76 }, { id: 'energyShield', base: 420 }, { id: 'resChaos', base: 10 }] },
    { id: 'cathedral_plate', slot: '갑옷', name: '대성당 판갑', reqTier: 12, baseStats: [{ id: 'flatHp', base: 84 }, { id: 'armor', base: 196 }, { id: 'energyShield', base: 186 }, { id: 'resC', base: 10 }] },
    { id: 'seraphim_aegis', slot: '갑옷', name: '세라핌 수호갑', reqTier: 16, baseStats: [{ id: 'flatHp', base: 102 }, { id: 'armor', base: 238 }, { id: 'energyShield', base: 232 }, { id: 'resAll', base: 8 }] },
    { id: 'warhands', slot: '장갑', name: '전쟁장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 145 }, { id: 'flatHp', base: 24 }] },
    { id: 'shadewrap_grips', slot: '장갑', name: '그림자 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 6 }, { id: 'evasion', base: 105 }, { id: 'crit', base: 6 }] },
    { id: 'arcane_mitts', slot: '장갑', name: '비전 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 5 }, { id: 'energyShield', base: 135 }, { id: 'resL', base: 8 }] },
    { id: 'saint_mitts', slot: '장갑', name: '성자 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'armor', base: 78 }, { id: 'energyShield', base: 74 }, { id: 'resL', base: 6 }] },
    { id: 'iron_tread', slot: '신발', name: '강철 발걸음', reqTier: 16, baseStats: [{ id: 'move', base: 18 }, { id: 'armor', base: 230 }, { id: 'flatHp', base: 36 }] },
    { id: 'hawkstride_boots', slot: '신발', name: '매걸음 장화', reqTier: 12, baseStats: [{ id: 'move', base: 16 }, { id: 'evasion', base: 145 }, { id: 'crit', base: 5 }] },
    { id: 'ghost_stride', slot: '신발', name: '유령 걸음', reqTier: 16, baseStats: [{ id: 'move', base: 18 }, { id: 'evasion', base: 185 }, { id: 'crit', base: 6 }] },
    { id: 'ether_steps', slot: '신발', name: '에테르 스텝', reqTier: 16, baseStats: [{ id: 'move', base: 18 }, { id: 'energyShield', base: 220 }, { id: 'resAll', base: 8 }] },
    { id: 'skirmish_mail', slot: '갑옷', name: '척후 갑피', reqTier: 8, baseStats: [{ id: 'flatHp', base: 44 }, { id: 'armor', base: 88 }, { id: 'evasion', base: 90 }] },
    { id: 'windplate_coat', slot: '갑옷', name: '풍갑 외투', reqTier: 8, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'armor', base: 122 }, { id: 'evasion', base: 124 }] },
    { id: 'sentinel_scale', slot: '갑옷', name: '감시자 비늘갑', reqTier: 12, baseStats: [{ id: 'flatHp', base: 80 }, { id: 'armor', base: 156 }, { id: 'evasion', base: 162 }, { id: 'resF', base: 10 }] },
    { id: 'nightwatch_harness', slot: '갑옷', name: '야경 흉갑', reqTier: 16, baseStats: [{ id: 'flatHp', base: 98 }, { id: 'armor', base: 194 }, { id: 'evasion', base: 202 }, { id: 'resAll', base: 7 }] },
    { id: 'veilwoven_vest', slot: '갑옷', name: '장막 직조 조끼', reqTier: 8, baseStats: [{ id: 'flatHp', base: 38 }, { id: 'evasion', base: 84 }, { id: 'energyShield', base: 70 }] },
    { id: 'mirage_link_robe', slot: '갑옷', name: '신기루 결속 로브', reqTier: 8, baseStats: [{ id: 'flatHp', base: 56 }, { id: 'evasion', base: 116 }, { id: 'energyShield', base: 104 }] },
    { id: 'moonlace_raiment', slot: '갑옷', name: '월영 예복', reqTier: 12, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'evasion', base: 148 }, { id: 'energyShield', base: 142 }, { id: 'resC', base: 10 }] },
    { id: 'starseam_dress', slot: '갑옷', name: '성봉 의장', reqTier: 16, baseStats: [{ id: 'flatHp', base: 90 }, { id: 'evasion', base: 182 }, { id: 'energyShield', base: 178 }, { id: 'resAll', base: 7 }] },
    { id: 'ranger_bulwark_gloves', slot: '장갑', name: '유격 방벽 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 4 }, { id: 'armor', base: 22 }, { id: 'evasion', base: 24 }] },
    { id: 'windguard_grips', slot: '장갑', name: '풍수 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'armor', base: 38 }, { id: 'evasion', base: 40 }] },
    { id: 'sentinel_claws', slot: '장갑', name: '감시자 갈퀴장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'armor', base: 56 }, { id: 'evasion', base: 58 }, { id: 'crit', base: 5 }] },
    { id: 'nightwatch_grasps', slot: '장갑', name: '야경 장악장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'armor', base: 74 }, { id: 'evasion', base: 78 }, { id: 'crit', base: 6 }] },
    { id: 'phasebound_gloves', slot: '장갑', name: '위상 결속 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 4 }, { id: 'evasion', base: 24 }, { id: 'energyShield', base: 20 }] },
    { id: 'mist_bind_mitts', slot: '장갑', name: '안개결속 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'evasion', base: 40 }, { id: 'energyShield', base: 36 }] },
    { id: 'moonphase_mitts', slot: '장갑', name: '월상 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'evasion', base: 58 }, { id: 'energyShield', base: 54 }, { id: 'resL', base: 6 }] },
    { id: 'starlight_grips', slot: '장갑', name: '성광 장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'evasion', base: 76 }, { id: 'energyShield', base: 72 }, { id: 'resAll', base: 4 }] },
    { id: 'skirmish_greaves', slot: '신발', name: '척후 각반', reqTier: 8, baseStats: [{ id: 'move', base: 10 }, { id: 'armor', base: 34 }, { id: 'evasion', base: 36 }] },
    { id: 'windguard_boots', slot: '신발', name: '풍수 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 54 }, { id: 'evasion', base: 56 }] },
    { id: 'sentinel_stride', slot: '신발', name: '감시자 장화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'armor', base: 74 }, { id: 'evasion', base: 78 }, { id: 'resF', base: 8 }] },
    { id: 'nightwatch_steps', slot: '신발', name: '야경 보행화', reqTier: 16, baseStats: [{ id: 'move', base: 19 }, { id: 'armor', base: 96 }, { id: 'evasion', base: 102 }, { id: 'resAll', base: 5 }] },
    { id: 'phase_treader', slot: '신발', name: '위상 추적화', reqTier: 8, baseStats: [{ id: 'move', base: 10 }, { id: 'evasion', base: 34 }, { id: 'energyShield', base: 30 }] },
    { id: 'mistwalk_boots', slot: '신발', name: '안개걸음 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'evasion', base: 56 }, { id: 'energyShield', base: 52 }] },
    { id: 'moonstride_boots', slot: '신발', name: '월영 보행화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'evasion', base: 78 }, { id: 'energyShield', base: 74 }, { id: 'resC', base: 8 }] },
    { id: 'starseeker_steps', slot: '신발', name: '성추적 보행화', reqTier: 16, baseStats: [{ id: 'move', base: 19 }, { id: 'evasion', base: 102 }, { id: 'energyShield', base: 98 }, { id: 'resAll', base: 5 }] },
    { id: 'saint_steps', slot: '신발', name: '성자 보행화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'armor', base: 98 }, { id: 'energyShield', base: 94 }, { id: 'resF', base: 8 }] },
    { id: 'archon_barbute', slot: '투구', name: '아콘 바르부트', reqTier: 16, baseStats: [{ id: 'flatHp', base: 86 }, { id: 'armor', base: 162 }, { id: 'energyShield', base: 172 }, { id: 'resAll', base: 6 }] },
    { id: 'archon_fists', slot: '장갑', name: '아콘 장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'armor', base: 104 }, { id: 'energyShield', base: 102 }, { id: 'resAll', base: 4 }] },
    { id: 'archon_strides', slot: '신발', name: '아콘 스텝', reqTier: 16, baseStats: [{ id: 'move', base: 19 }, { id: 'armor', base: 126 }, { id: 'energyShield', base: 122 }, { id: 'resAll', base: 5 }] },
    { id: 'bone_amulet', slot: '목걸이', name: '뼈 목걸이', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }, { id: 'flatHp', base: 8 }] },
    { id: 'sage_amulet', slot: '목걸이', name: '현자의 목걸이', reqTier: 5, baseStats: [{ id: 'crit', base: 4 }, { id: 'resAll', base: 4 }] },
    { id: 'star_pendant', slot: '목걸이', name: '성좌 펜던트', reqTier: 9, baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'pctDmg', base: 8 }] },
    { id: 'valor_amulet', slot: '목걸이', name: '용맹의 목걸이', reqTier: 8, baseStats: [{ id: 'flatDmg', base: 2 }, { id: 'flatHp', base: 24 }, { id: 'crit', base: 5 }] },
    { id: 'sageking_charm', slot: '목걸이', name: '현왕의 부적', reqTier: 11, baseStats: [{ id: 'crit', base: 5 }, { id: 'resAll', base: 6 }, { id: 'pctDmg', base: 8 }] },
    { id: 'constellation_core', slot: '목걸이', name: '성좌핵 목걸이', reqTier: 14, baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'pctDmg', base: 12 }, { id: 'resAll', base: 6 }] },
    { id: 'copper_ring', slot: '반지', name: '구리 반지', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }] },
    { id: 'summoner_loop', slot: '반지', name: '소환사의 고리', reqTier: 4, baseStats: [{ id: 'summonPctDmg', base: 10 }, { id: 'summonEfficiency', base: 5 }] },
    { id: 'opal_ring', slot: '반지', name: '오팔 반지', reqTier: 5, baseStats: [{ id: 'pctDmg', base: 6 }] },
    { id: 'sapphire_band', slot: '반지', name: '푸른 띠 반지', reqTier: 9, baseStats: [{ id: 'resAll', base: 6 }, { id: 'crit', base: 3 }] },
    { id: 'void_loop_ring', slot: '반지', name: '공허 고리', reqTier: 12, baseStats: [{ id: 'resChaos', base: 4 }, { id: 'chaosPctDmg', base: 7 }] },
    { id: 'eclipse_ring', slot: '반지', name: '식월 반지', reqTier: 15, baseStats: [{ id: 'resAll', base: 8 }, { id: 'resChaos', base: 5 }, { id: 'crit', base: 5 }] },
    { id: 'mirror_ring', slot: '반지', name: '거울 반지', reqTier: 20, dropOnly: { id: 'mirror_ring_unique' }, baseStats: [] },
    { id: 'engraved_ring', slot: '반지', name: '각인 반지', reqTier: 7, baseStats: [{ id: 'flatDmg', base: 3 }, { id: 'pctDmg', base: 9 }] },
    { id: 'judgment_signet', slot: '반지', name: '심판 인장 반지', reqTier: 13, baseStats: [{ id: 'flatDmg', base: 5 }, { id: 'pctDmg', base: 13 }, { id: 'critDmg', base: 12 }] },
    { id: 'beastlord_ring', slot: '반지', name: '야수왕 반지', reqTier: 15, baseStats: [{ id: 'summonEfficiency', base: 16 }, { id: 'summonCrit', base: 6 }, { id: 'summonCap', base: 1 }] },
    { id: 'rope_belt', slot: '허리띠', name: '로프 허리띠', reqTier: 1, baseStats: [{ id: 'flatHp', base: 16 }] },
    { id: 'war_belt', slot: '허리띠', name: '전사의 허리띠', reqTier: 5, baseStats: [{ id: 'flatHp', base: 32 }, { id: 'dr', base: 2 }] },
    { id: 'stygian_vise', slot: '허리띠', name: '심연의 혁대', reqTier: 9, baseStats: [{ id: 'flatHp', base: 55 }, { id: 'resChaos', base: 8 }] },
    { id: 'blood_girdle', slot: '허리띠', name: '혈석 허리띠', reqTier: 12, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'dr', base: 3 }, { id: 'resChaos', base: 10 }] },
    { id: 'warlord_girdle', slot: '허리띠', name: '장군의 허리띠', reqTier: 15, baseStats: [{ id: 'flatHp', base: 88 }, { id: 'dr', base: 4 }, { id: 'resChaos', base: 12 }] },
    { id: 'nightmare_bind', slot: '허리띠', name: '악몽 결속대', reqTier: 15, baseStats: [{ id: 'flatHp', base: 92 }, { id: 'resAll', base: 7 }, { id: 'resChaos', base: 12 }] },
    { id: 'root_blade_fang', slot: '무기', name: '뿌리 송곳', reqTier: 6, dropOnly: { type: 'act' }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 27, legacyDamageBase: 20 }, { id: 'physIgnore', base: 4 }, { id: 'leech', base: 0.8 }] },
    { id: 'beehive_stinger_mail', slot: '갑옷', name: '벌침 갑피', reqTier: 12, dropOnly: { type: 'beehive' }, baseStats: [{ id: 'flatHp', base: 88 }, { id: 'resChaos', base: 10 }, { id: 'evasion', base: 295 }, { id: 'venomStingerBonus', base: 10 }] },
    { id: 'grand_breach_shard_helm', slot: '투구', name: '대균열 파편투구', reqTier: 16, dropOnly: { id: 'grand_breach_run' }, baseStats: [{ id: 'flatHp', base: 95 }, { id: 'resAll', base: 9 }, { id: 'dr', base: 4 }, { id: 'energyShield', base: 96 }, { id: 'resPen', base: 6 }] },
    { id: 'laby_1_greaves', slot: '신발', name: '미궁 수호 각반', reqTier: 8, dropOnly: { type: 'labyrinth', minFloor: 1 }, baseStats: [{ id: 'move', base: 14 }, { id: 'armor', base: 130 }, { id: 'dr', base: 2 }] },
    { id: 'laby_10_crown', slot: '투구', name: '미궁 심층 관', reqTier: 12, dropOnly: { type: 'labyrinth', minFloor: 10 }, baseStats: [{ id: 'flatHp', base: 76 }, { id: 'resAll', base: 8 }, { id: 'armor', base: 230 }, { id: 'regen', base: 0.8 }] },
    { id: 'laby_20_robe', slot: '갑옷', name: '미궁 절정 로브', reqTier: 16, dropOnly: { type: 'labyrinth', minFloor: 20 }, baseStats: [{ id: 'energyShield', base: 180 }, { id: 'resChaos', base: 10 }, { id: 'spellFlatPct', base: 10 }] },
    { id: 'laby_30_ring', slot: '반지', name: '미궁 군주의 반지', reqTier: 20, dropOnly: { type: 'labyrinth', minFloor: 30 }, baseStats: [{ id: 'resAll', base: 10 }, { id: 'crit', base: 8 }, { id: 'resPen', base: 6 }] },
    { id: 'trial_emblem_gloves', slot: '장갑', name: '시련 문양 건틀릿', reqTier: 15, dropOnly: { type: 'trial' }, baseStats: [{ id: 'aspd', base: 9 }, { id: 'dr', base: 3 }, { id: 'armor', base: 190 }, { id: 'critDmg', base: 20 }] },
    { id: 'beehive_queen_veil', slot: '투구', name: '여왕벌 면사포', reqTier: 14, dropOnly: { type: 'beehive' }, baseStats: [{ id: 'flatHp', base: 82 }, { id: 'evasion', base: 138 }, { id: 'resChaos', base: 12 }, { id: 'venomStingerBonus', base: 12 }] },
    { id: 'trial_warden_boots', slot: '신발', name: '시련 감시자 장화', reqTier: 17, dropOnly: { type: 'trial' }, baseStats: [{ id: 'move', base: 20 }, { id: 'armor', base: 128 }, { id: 'dr', base: 4 }, { id: 'resPen', base: 5 }] },
    { id: 'riftglass_robe', slot: '갑옷', name: '균열유리 로브', reqTier: 18, dropOnly: { id: 'grand_breach_run' }, baseStats: [{ id: 'energyShield', base: 256 }, { id: 'resChaos', base: 14 }, { id: 'spellFlatPct', base: 14 }, { id: 'flatHp', base: -40 }] },
    { id: 'meteor_trace_greaves', slot: '신발', name: '운석 자취 경갑', reqTier: 19, dropOnly: { type: 'meteor' }, baseStats: [{ id: 'move', base: 22 }, { id: 'evasion', base: 150 }, { id: 'crit', base: 8 }, { id: 'resL', base: 14 }] },
    { id: 'runic_bastion_helm', slot: '투구', name: '룬 철벽투구', reqTier: 8, baseStats: [{ id: 'flatHp', base: 46 }, { id: 'armor', base: 92 }] },
    { id: 'thornweave_coat', slot: '갑옷', name: '가시결 외투', reqTier: 8, baseStats: [{ id: 'flatHp', base: 58 }, { id: 'evasion', base: 116 }] },
    { id: 'stormbind_mitts', slot: '장갑', name: '뇌격 결속 장갑', reqTier: 12, baseStats: [{ id: 'aspd', base: 7 }, { id: 'resL', base: 9 }, { id: 'energyShield', base: 112 }] },
    { id: 'sunstride_boots', slot: '신발', name: '태양 질주화', reqTier: 12, baseStats: [{ id: 'move', base: 15 }, { id: 'resF', base: 9 }, { id: 'evasion', base: 120 }] },
    { id: 'moonbound_ring', slot: '반지', name: '월인 반지', reqTier: 10, baseStats: [{ id: 'resC', base: 9 }, { id: 'crit', base: 4 }] },
    { id: 'nightveil_hood', slot: '투구', name: '야행 두건', reqTier: 8, baseStats: [{ id: 'flatHp', base: 42 }, { id: 'evasion', base: 132 }] },
    { id: 'spirit_weave_robe', slot: '갑옷', name: '정수 직조 로브', reqTier: 12, baseStats: [{ id: 'flatHp', base: 64 }, { id: 'energyShield', base: 300 }] },
    { id: 'ironclad_treads', slot: '신발', name: '강철 보행화', reqTier: 12, baseStats: [{ id: 'move', base: 15 }, { id: 'armor', base: 150 }, { id: 'flatHp', base: 26 }] },
    { id: 'warding_sash', slot: '허리띠', name: '수호의 띠', reqTier: 11, baseStats: [{ id: 'flatHp', base: 62 }, { id: 'resAll', base: 6 }] },
    { id: 'familiar_loop', slot: '반지', name: '사역마 고리', reqTier: 6, baseStats: [{ id: 'summonPctDmg', base: 12 }, { id: 'summonHpPct', base: 10 }] },
    { id: 'beastcall_band', slot: '반지', name: '야수 부름 반지', reqTier: 11, baseStats: [{ id: 'summonEfficiency', base: 12 }, { id: 'summonCrit', base: 4 }] },
    { id: 'overlord_ring', slot: '반지', name: '군주 반지', reqTier: 15, baseStats: [{ id: 'summonPctDmg', base: 18 }, { id: 'summonCap', base: 1 }] },
    { id: 'graveknot_belt', slot: '허리띠', name: '묘결 속박대', reqTier: 10, baseStats: [{ id: 'flatHp', base: 60 }, { id: 'resChaos', base: 9 }] },
    { id: 'echo_lance', slot: '무기', name: '메아리 창', reqTier: 11, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 46, legacyDamageBase: 28 }, { id: 'aspd', base: 7 }] },
    { id: 'spirit_call_wand', slot: '무기', name: '정령 소환봉', reqTier: 6, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 16, legacyDamageBase: 12 }, { id: 'summonPctDmg', base: 18 }, { id: 'summonEfficiency', base: 8 }] },
    { id: 'gravebind_scepter', slot: '무기', name: '묘지 결속 홀', reqTier: 10, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 25, legacyDamageBase: 16 }, { id: 'summonPctDmg', base: 26 }, { id: 'summonHpPct', base: 18 }] },
    { id: 'astral_familiar_staff', slot: '무기', name: '성운 사역마 지팡이', reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: 'flatDmg', base: 43, legacyDamageBase: 22 }, { id: 'summonPctDmg', base: 36 }, { id: 'summonCritDmg', base: 24 }] },
    { id: 'ember_circlet', slot: '투구', name: '잿불 서클릿', reqTier: 12, baseStats: [{ id: 'energyShield', base: 126 }, { id: 'resF', base: 10 }] },
    { id: 'tidal_vest', slot: '갑옷', name: '조류의 흉갑', reqTier: 12, baseStats: [{ id: 'flatHp', base: 66 }, { id: 'resC', base: 10 }, { id: 'armor', base: 145 }, { id: 'evasion', base: 150 }] },
    { id: 'gale_treads', slot: '신발', name: '질풍 발굽', reqTier: 12, baseStats: [{ id: 'move', base: 16 }, { id: 'evasion', base: 94 }] },
    { id: 'buckler_scrap', slot: '방패', name: '고철 버클러', reqTier: 1, baseStats: [{ id: 'armor', base: 46 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'iron_buckler', slot: '방패', name: '철 버클러', reqTier: 4, baseStats: [{ id: 'armor', base: 78 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'woven_guard', slot: '방패', name: '직조 가드', reqTier: 4, baseStats: [{ id: 'evasion', base: 78 }, { id: 'baseBlockChance', base: 6 }] },
    { id: 'aegis_focus', slot: '방패', name: '아이기스 포커스', reqTier: 4, baseStats: [{ id: 'energyShield', base: 82 }, { id: 'baseBlockChance', base: 6.5 }] },
    { id: 'scale_guard', slot: '방패', name: '비늘 방패', reqTier: 8, baseStats: [{ id: 'armor', base: 70 }, { id: 'evasion', base: 68 }, { id: 'baseBlockChance', base: 5 }] },
    { id: 'ward_kite', slot: '방패', name: '수호 카이트', reqTier: 8, baseStats: [{ id: 'armor', base: 68 }, { id: 'energyShield', base: 66 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'mist_guard', slot: '방패', name: '안개 수호패', reqTier: 8, baseStats: [{ id: 'evasion', base: 66 }, { id: 'energyShield', base: 64 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'tower_wall', slot: '방패', name: '타워 월', reqTier: 8, baseStats: [{ id: 'armor', base: 124 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'mirage_guard', slot: '방패', name: '신기루 가드', reqTier: 8, baseStats: [{ id: 'evasion', base: 122 }, { id: 'baseBlockChance', base: 6 }] },
    { id: 'ether_focus', slot: '방패', name: '에테르 초점패', reqTier: 8, baseStats: [{ id: 'energyShield', base: 132 }, { id: 'baseBlockChance', base: 6.5 }] },
    { id: 'drake_scale_guard', slot: '방패', name: '용비늘 방패', reqTier: 8, baseStats: [{ id: 'armor', base: 102 }, { id: 'evasion', base: 100 }, { id: 'baseBlockChance', base: 5 }] },
    { id: 'temple_kite', slot: '방패', name: '사원 카이트', reqTier: 8, baseStats: [{ id: 'armor', base: 100 }, { id: 'energyShield', base: 98 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'veil_guard', slot: '방패', name: '장막 수호패', reqTier: 8, baseStats: [{ id: 'evasion', base: 98 }, { id: 'energyShield', base: 96 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'citadel_wall', slot: '방패', name: '성채 방벽', reqTier: 12, baseStats: [{ id: 'armor', base: 168 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'phase_bulwark', slot: '방패', name: '위상 불워크', reqTier: 12, baseStats: [{ id: 'evasion', base: 165 }, { id: 'baseBlockChance', base: 6 }] },
    { id: 'starlit_focus', slot: '방패', name: '성광 초점패', reqTier: 12, baseStats: [{ id: 'energyShield', base: 178 }, { id: 'baseBlockChance', base: 6.5 }] },
    { id: 'runic_scale_guard', slot: '방패', name: '룬비늘 방패', reqTier: 12, baseStats: [{ id: 'armor', base: 132 }, { id: 'evasion', base: 128 }, { id: 'baseBlockChance', base: 5 }] },
    { id: 'relic_kite', slot: '방패', name: '유물 카이트', reqTier: 12, baseStats: [{ id: 'armor', base: 130 }, { id: 'energyShield', base: 126 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'moon_barrier', slot: '방패', name: '월영 배리어', reqTier: 12, baseStats: [{ id: 'evasion', base: 128 }, { id: 'energyShield', base: 124 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'adamant_wall', slot: '방패', name: '금강 방벽', reqTier: 16, baseStats: [{ id: 'armor', base: 225 }, { id: 'baseBlockChance', base: 5.5 }] },
    { id: 'nightveil_guard', slot: '방패', name: '밤장막 가드', reqTier: 16, baseStats: [{ id: 'evasion', base: 220 }, { id: 'baseBlockChance', base: 6 }] },
    { id: 'archon_focus', slot: '방패', name: '아콘 초점패', reqTier: 16, baseStats: [{ id: 'energyShield', base: 238 }, { id: 'baseBlockChance', base: 6.5 }] },
    { id: 'bastion_aegis', slot: '방패', name: '보루 이지스', reqTier: 16, baseStats: [{ id: 'armor', base: 168 }, { id: 'evasion', base: 162 }, { id: 'baseBlockChance', base: 5 }] },
    { id: 'sanctum_aegis', slot: '방패', name: '성소 이지스', reqTier: 16, baseStats: [{ id: 'armor', base: 166 }, { id: 'energyShield', base: 160 }, { id: 'baseBlockChance', base: 5.8 }] },
    { id: 'astral_barrier', slot: '방패', name: '성운 배리어', reqTier: 16, baseStats: [{ id: 'evasion', base: 162 }, { id: 'energyShield', base: 158 }, { id: 'baseBlockChance', base: 5.2 }] },
    { id: 'parry_round_t1', slot: '방패', name: '결투 원형방패', reqTier: 1, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 14 }, { id: 'baseBlockChance', base: 10 }] },
    { id: 'parry_iron_t4', slot: '방패', name: '응수 철방패', reqTier: 4, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 30 }, { id: 'baseBlockChance', base: 11 }] },
    { id: 'parry_rune_t8', slot: '방패', name: '파수 룬방패', reqTier: 8, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 52 }, { id: 'baseBlockChance', base: 12 }] },
    { id: 'parry_sentinel_t12', slot: '방패', name: '감시자의 방패', reqTier: 12, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 76 }, { id: 'baseBlockChance', base: 13 }] },
    { id: 'parry_seraph_t16', slot: '방패', name: '세라프 방패', reqTier: 16, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 102 }, { id: 'baseBlockChance', base: 14 }] },
    { id: 'parry_astral_t20', slot: '방패', name: '성계 응수방패', reqTier: 20, shieldStyle: 'parry', baseStats: [{ id: 'armor', base: 132 }, { id: 'baseBlockChance', base: 15 }, { id: 'resAll', base: 3 }] },
    { id: 'chaos_realm_fang', slot: '무기', name: '혼돈계 균열 송곳', reqTier: 18, realmBase: 'chaos', dropOnly: { minTier: 15 }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 93, legacyDamageBase: 42 }, { id: 'chaosPctDmg', base: 24 }, { id: 'resChaos', base: 8 }] },
    { id: 'chaos_realm_coil', slot: '반지', name: '혼돈계 소용돌이 반지', reqTier: 18, realmBase: 'chaos', dropOnly: { minTier: 15 }, baseStats: [{ id: 'chaosPctDmg', base: 18 }, { id: 'resChaos', base: 10 }] },
    { id: 'underworld_bastion', slot: '갑옷', name: '지하계 철벽 흉갑', reqTier: 20, realmBase: 'underworld', dropOnly: { minTier: 15 }, baseStats: [{ id: 'flatHp', base: 120 }, { id: 'armor', base: 260 }, { id: 'dr', base: 8 }] },
    { id: 'underworld_chain', slot: '허리띠', name: '지하계 결속 허리띠', reqTier: 20, realmBase: 'underworld', dropOnly: { minTier: 15 }, baseStats: [{ id: 'flatHp', base: 110 }, { id: 'resAll', base: 10 }, { id: 'resChaos', base: 12 }] },
    { id: 'cosmos_prism_lance', slot: '무기', name: '우주계 프리즘 랜스', reqTier: 22, realmBase: 'cosmos', dropOnly: { minTier: 20 }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: 'flatDmg', base: 125, legacyDamageBase: 52 }, { id: 'elementalPctDmg', base: 28 }, { id: 'resPen', base: 9 }] },
    { id: 'cosmos_core_amulet', slot: '목걸이', name: '우주계 핵성 목걸이', reqTier: 22, realmBase: 'cosmos', dropOnly: { minTier: 20 }, baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'suppCap', base: 1 }, { id: 'resAll', base: 10 }] },
    { id: 'gen__armor_t1', slot: '투구', name: '무쇠 투구', reqTier: 1, baseStats: [{ id: 'flatHp', base: 7 }, { id: 'armor', base: 26 }] },
    { id: 'gen__armor_t16', slot: '투구', name: '금강 투구', reqTier: 16, baseStats: [{ id: 'flatHp', base: 83 }, { id: 'armor', base: 307 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__armor_t20', slot: '투구', name: '불멸 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 103 }, { id: 'armor', base: 383 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_t1', slot: '투구', name: '들바람 투구', reqTier: 1, baseStats: [{ id: 'flatHp', base: 5 }, { id: 'evasion', base: 17 }] },
    { id: 'gen__evasion_t4', slot: '투구', name: '질풍 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 21 }, { id: 'evasion', base: 66 }] },
    { id: 'gen__evasion_t16', slot: '투구', name: '광풍 투구', reqTier: 16, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'evasion', base: 240 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__evasion_t20', slot: '투구', name: '표풍 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 90 }, { id: 'evasion', base: 300 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__energyShield_t4', slot: '투구', name: '마정 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'energyShield', base: 93 }] },
    { id: 'gen__energyShield_t16', slot: '투구', name: '성휘 투구', reqTier: 16, baseStats: [{ id: 'flatHp', base: 64 }, { id: 'energyShield', base: 320 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__energyShield_t20', slot: '투구', name: '천상 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 80 }, { id: 'energyShield', base: 400 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_evasion_t20', slot: '투구', name: '신월 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 104 }, { id: 'armor', base: 165 }, { id: 'evasion', base: 171 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_energyShield_t20', slot: '투구', name: '성왕 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 115 }, { id: 'armor', base: 216 }, { id: 'energyShield', base: 229 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_energyShield_t20', slot: '투구', name: '월식 투구', reqTier: 20, baseStats: [{ id: 'flatHp', base: 99 }, { id: 'evasion', base: 157 }, { id: 'energyShield', base: 163 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_t1_1', slot: '갑옷', name: '무쇠 갑옷', reqTier: 1, baseStats: [{ id: 'flatHp', base: 11 }, { id: 'armor', base: 55 }] },
    { id: 'gen__armor_t12', slot: '갑옷', name: '흑요 갑옷', reqTier: 12, baseStats: [{ id: 'flatHp', base: 78 }, { id: 'armor', base: 368 }] },
    { id: 'gen__armor_t20_1', slot: '갑옷', name: '불멸 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 123 }, { id: 'armor', base: 573 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_t4_1', slot: '갑옷', name: '질풍 갑옷', reqTier: 4, baseStats: [{ id: 'flatHp', base: 34 }, { id: 'evasion', base: 90 }] },
    { id: 'gen__evasion_t12', slot: '갑옷', name: '월광 갑옷', reqTier: 12, baseStats: [{ id: 'flatHp', base: 71 }, { id: 'evasion', base: 241 }] },
    { id: 'gen__evasion_t20_1', slot: '갑옷', name: '표풍 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 112 }, { id: 'evasion', base: 487 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__energyShield_t1', slot: '갑옷', name: '수정 갑옷', reqTier: 1, baseStats: [{ id: 'flatHp', base: 6 }, { id: 'energyShield', base: 27 }] },
    { id: 'gen__energyShield_t4_1', slot: '갑옷', name: '마정 갑옷', reqTier: 4, baseStats: [{ id: 'flatHp', base: 23 }, { id: 'energyShield', base: 109 }] },
    { id: 'gen__energyShield_t8', slot: '갑옷', name: '공명 갑옷', reqTier: 8, baseStats: [{ id: 'flatHp', base: 47 }, { id: 'energyShield', base: 218 }] },
    { id: 'gen__energyShield_t20_1', slot: '갑옷', name: '천상 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 101 }, { id: 'energyShield', base: 560 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_evasion_t20_1', slot: '갑옷', name: '신월 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 131 }, { id: 'armor', base: 259 }, { id: 'evasion', base: 269 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_energyShield_t20_1', slot: '갑옷', name: '성왕 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 136 }, { id: 'armor', base: 317 }, { id: 'energyShield', base: 309 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_energyShield_t20_1', slot: '갑옷', name: '월식 갑옷', reqTier: 20, baseStats: [{ id: 'flatHp', base: 120 }, { id: 'evasion', base: 243 }, { id: 'energyShield', base: 237 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_t1_2', slot: '장갑', name: '무쇠 장갑', reqTier: 1, baseStats: [{ id: 'aspd', base: 2 }, { id: 'flatHp', base: 4 }, { id: 'armor', base: 14 }] },
    { id: 'gen__armor_t8', slot: '장갑', name: '흑철 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'flatHp', base: 20 }, { id: 'armor', base: 100 }] },
    { id: 'gen__armor_t16_1', slot: '장갑', name: '금강 장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'flatHp', base: 32 }, { id: 'armor', base: 193 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__armor_t20_2', slot: '장갑', name: '불멸 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'flatHp', base: 40 }, { id: 'armor', base: 242 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_t4_2', slot: '장갑', name: '질풍 장갑', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'evasion', base: 42 }] },
    { id: 'gen__evasion_t8', slot: '장갑', name: '야행 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'evasion', base: 73 }] },
    { id: 'gen__evasion_t16_1', slot: '장갑', name: '광풍 장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'evasion', base: 140 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__evasion_t20_2', slot: '장갑', name: '표풍 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'evasion', base: 175 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__energyShield_t1_1', slot: '장갑', name: '수정 장갑', reqTier: 1, baseStats: [{ id: 'aspd', base: 2 }, { id: 'energyShield', base: 11 }] },
    { id: 'gen__energyShield_t4_2', slot: '장갑', name: '마정 장갑', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'energyShield', base: 45 }] },
    { id: 'gen__energyShield_t8_1', slot: '장갑', name: '공명 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 6 }, { id: 'energyShield', base: 90 }] },
    { id: 'gen__energyShield_t16_1', slot: '장갑', name: '성휘 장갑', reqTier: 16, baseStats: [{ id: 'aspd', base: 8 }, { id: 'energyShield', base: 180 }, { id: 'resAll', base: 6 }] },
    { id: 'gen__energyShield_t20_2', slot: '장갑', name: '천상 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'energyShield', base: 225 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_evasion_t20_2', slot: '장갑', name: '신월 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'armor', base: 99 }, { id: 'evasion', base: 104 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_energyShield_t20_2', slot: '장갑', name: '성왕 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'armor', base: 139 }, { id: 'energyShield', base: 136 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_energyShield_t20_2', slot: '장갑', name: '월식 장갑', reqTier: 20, baseStats: [{ id: 'aspd', base: 9 }, { id: 'evasion', base: 101 }, { id: 'energyShield', base: 96 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_t1_3', slot: '신발', name: '무쇠 장화', reqTier: 1, baseStats: [{ id: 'move', base: 6 }, { id: 'flatHp', base: 2 }, { id: 'armor', base: 14 }] },
    { id: 'gen__armor_t4', slot: '신발', name: '강철 장화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'flatHp', base: 9 }, { id: 'armor', base: 55 }] },
    { id: 'gen__armor_t8_1', slot: '신발', name: '흑철 장화', reqTier: 8, baseStats: [{ id: 'move', base: 14 }, { id: 'flatHp', base: 19 }, { id: 'armor', base: 109 }] },
    { id: 'gen__armor_t20_3', slot: '신발', name: '불멸 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'flatHp', base: 48 }, { id: 'armor', base: 307 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_t1_1', slot: '신발', name: '들바람 장화', reqTier: 1, baseStats: [{ id: 'move', base: 6 }, { id: 'flatHp', base: 4 }, { id: 'evasion', base: 16 }] },
    { id: 'gen__evasion_t20_3', slot: '신발', name: '표풍 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'flatHp', base: 70 }, { id: 'evasion', base: 247 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__energyShield_t4_3', slot: '신발', name: '마정 장화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'energyShield', base: 67 }] },
    { id: 'gen__energyShield_t12', slot: '신발', name: '예지 장화', reqTier: 12, baseStats: [{ id: 'move', base: 17 }, { id: 'energyShield', base: 177 }] },
    { id: 'gen__energyShield_t20_3', slot: '신발', name: '천상 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'energyShield', base: 293 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_evasion_t20_3', slot: '신발', name: '신월 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'armor', base: 128 }, { id: 'evasion', base: 136 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_energyShield_t20_3', slot: '신발', name: '성왕 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'armor', base: 168 }, { id: 'energyShield', base: 163 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_energyShield_t20_3', slot: '신발', name: '월식 장화', reqTier: 20, baseStats: [{ id: 'move', base: 23 }, { id: 'evasion', base: 136 }, { id: 'energyShield', base: 131 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_t20_4', slot: '방패', name: '불멸 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 5.5 }, { id: 'armor', base: 300 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_t1_2', slot: '방패', name: '들바람 방패', reqTier: 1, baseStats: [{ id: 'baseBlockChance', base: 6 }, { id: 'evasion', base: 24 }] },
    { id: 'gen__evasion_t20_4', slot: '방패', name: '표풍 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 6 }, { id: 'evasion', base: 292 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__energyShield_t1_2', slot: '방패', name: '수정 방패', reqTier: 1, baseStats: [{ id: 'baseBlockChance', base: 6.5 }, { id: 'energyShield', base: 25 }] },
    { id: 'gen__energyShield_t20_4', slot: '방패', name: '천상 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 6.5 }, { id: 'energyShield', base: 315 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_evasion_t20_4', slot: '방패', name: '신월 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 5 }, { id: 'armor', base: 220 }, { id: 'evasion', base: 212 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__armor_energyShield_t20_4', slot: '방패', name: '성왕 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 5.8 }, { id: 'armor', base: 218 }, { id: 'energyShield', base: 210 }, { id: 'resAll', base: 9 }] },
    { id: 'gen__evasion_energyShield_t20_4', slot: '방패', name: '월식 방패', reqTier: 20, baseStats: [{ id: 'baseBlockChance', base: 5.2 }, { id: 'evasion', base: 212 }, { id: 'energyShield', base: 206 }, { id: 'resAll', base: 9 }] }
];


const HERO_SELECTION_ORDER = Object.keys(HERO_SELECTION_DEFS);
const PLAYER_CLASS_ORDER = Object.keys(PLAYER_CLASS_DEFS);

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
    lastRemoteRevision: 0,
    lastRemoteResetRevision: 0,
    revisionSupported: null,
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
let loadingOverlayProgress = 0;
let pendingMapRevealZoneId = null;
let pendingMapRevealToken = 0;
let lastRenderedMapListHtml = '';
let lastRenderedChaosMapListHtml = '';

safeExposeGlobals({
    getUnderworldGravityActionMultiplier, getUnderworldEntryLockReason,
    isCosmosContentUnlockReady,
    isMapPrimaryContentUnlockReady, isMapPrimaryContentUnlocked,
    reconcileMapPrimaryContentUnlocks, getMapPrimaryContentEntryCondition
});
safeExposeGlobals({ formatStoryActLabel, getStoryActByZoneId, getStoryActByOrder, getActZoneDisplayName, getMeteorSiteUnlockReady, getAbyssDepthFromZoneId, getAbyssZoneIdForDepth, getZone, getSeasonAbyssDepthCap, getLoopAbyssRequirementText, hasCurrentLoopAbyssRequirementClear, hasCurrentLoopChaosRequirementClear, hasCurrentLoopCosmosRequirementClear, getAvailableLoopAdvancePaths, markLoopCosmosPlanetClear, getSeasonFinalZoneId, getCurrentSeasonFinalZoneId, getVisibleHuntingMapCapZoneId, getHighestUnlockedEndlessChaosDepth, getAutoProgressZoneId, getAbyssMonsterScales, getContentDropRateMultiplier, capEndlessContentDropMultiplier, applySeasonContentProgression, getLoop10StatCost, allocateLoop10BonusStat, enterNextEndlessChaosDepth, enterUnlockedEndlessDepth, getLoopDeepStatCost, allocateLoopDeepStat, SKY_TOWER_ZONE_ID, createDefaultSkyTowerState, ensureSkyTowerState, getSkyTowerLoopClearLimit, getSkyTowerRemainingClears, hasCurrentLoopChaosAccess, maybeUnlockSkyTowerFromChaos20, canEnterSkyTower, getSkyTowerTier, getSkyTowerRewardAmount, getSkyStoneMaxLevel, getSkyStoneReductionPct, getSkyStoneNextCost, getSkyTowerGemBoostMaxLevel, getSkyTowerGemBoostLevel, getSkyTowerGemBoostCost, OCEAN_PERMANENT_UPGRADE_DEFS, OCEAN_PERMANENT_UPGRADE_KEYS, OCEAN_CURRENT_POOL, getOceanCurrentAffixes, createDefaultOceanState, mergeOceanState, getOceanPermanentUpgradeLevel, getOceanPermanentUpgradeEffect, ensureOceanState, canEnterOceanDepth, getOceanOxygenMax, getOceanOxygenSavingPct, getOceanPressureResistUpgradePct, getOceanOxygenDrainPerSec, getOceanOxygenPerAttackCost, getOceanDepthTier, getOceanFishingGaugeGainMul });

// Phase-4 extracted default state schema.

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


const COMBAT_TACTIC_TARGET_PRIORITIES = Object.freeze(['nearest', 'weakest', 'dangerous', 'dense']);
const COMBAT_TACTIC_POSITION_MODES = Object.freeze(['auto', 'pressure', 'keepRange']);

function normalizeCombatTacticsSettings(settings) {
    let target = settings && COMBAT_TACTIC_TARGET_PRIORITIES.includes(settings.combatTargetPriority)
        ? settings.combatTargetPriority : 'nearest';
    let position = settings && COMBAT_TACTIC_POSITION_MODES.includes(settings.combatPositionMode)
        ? settings.combatPositionMode : 'auto';
    return { targetPriority: target, positionMode: position };
}

function hasCombatTacticsUnlockProgress(state) {
    if (!state || typeof state !== 'object') return false;
    let journal = Array.isArray(state.journalUnlocked) ? state.journalUnlocked : [];
    let claimed = Array.isArray(state.claimedActRewards) ? state.claimedActRewards : [];
    return journal.includes('act_3') || claimed.includes(2) || Math.floor(Number(state.maxZoneId) || 0) >= 3;
}

function ensureCombatTacticsUnlockState(state) {
    if (!state || state.combatTacticsUnlocked || !hasCombatTacticsUnlockProgress(state)) return false;
    state.combatTacticsUnlocked = true;
    return true;
}

function isFreePassiveStartNodeId(nodeId) {
    if (String(nodeId) === 'n0') return true;
    const authoredNodes = typeof PASSIVE_TREE_V22 !== 'undefined' && PASSIVE_TREE_V22
        ? PASSIVE_TREE_V22.nodes : null;
    const node = authoredNodes && authoredNodes[String(nodeId)];
    return !!(node && node.kind === 'start');
}

function getPaidPassiveNodeIds(nodeIds) {
    return (Array.isArray(nodeIds) ? nodeIds : []).filter(nodeId => !isFreePassiveStartNodeId(nodeId));
}

// Shared transaction state belongs below both persistence and the UI scheduler.
let backgroundCombatRuntime = { hiddenAtMs: 0, snapshot: null, signature: '', processing: false, failed: false, accelerationTier: 0, finishRequested: false, offlineConsumed: false, appInactive: false };

/**
 * @typedef {{statId:string,minValue:number,minTier:number}} EquipmentTargetRule
 * @typedef {{enabled:boolean,slot:string,scope:('explicit'|'all'),minMatches:number,rules:EquipmentTargetRule[]}} EquipmentTargetFilter
 * minTier 0 means any tier; minValue uses the displayed stat unit. Each rule matches one option line.
 */
/**
 * Permanent content ledger. Purchased IDs retain order; inherited IDs cost no points.
 * highestLoop records earned progress; legacy preserves pre-ledger early map access.
 * paidCosts records actual prices, preserving 1P purchases made before version 6.
 * @typedef {{version:number, highestLoop:number, unlocked:string[], paidCosts:Record<string, number>, inherited:string[], automatic:string[], grandfathered:string[], legacy?:boolean}} ContentProgressionState
 */
/**
 * 그루터기 함(js/stump-box.js). acquired/via/starter are one-time receipts. items live in storage unless an id sits
 * on the 5×5 board (row-major, null = empty); xp counts kills toward the family's need (data/stump-box.js) and ripe
 * marks a grown item. Suppression, resonance and stats are recomputed from the board, never saved.
 * @typedef {{id:number, family:('seed'|'sap'), color:('fire'|'cold'|'lightning'|'chaos'), path:(null|'flower'|'fruit'), xp:number, ripe:boolean, roll:number}} StumpBoxItem
 * @typedef {{version:number, acquired:boolean, via:(null|string), starter:{seed:boolean, sap:boolean}, nextId:number, items:StumpBoxItem[], board:Array<number|null>, graft:number[]}} StumpBoxState
 */
/**
 * G1 expedition ledger. Rewards in history are already in the wallet, never claimable again.
 * @typedef {{version:number,galaxy?:number,loop:number,phase:string,stage:number,goal:string,legSize:number,signal:string,seed:number,plan:string[][],queue:string[],history:Array<{id:string,dust:number,stage:number}>,dust:number,decisions:Record<string,string>,habitats?:string[],failedNode?:string}} CosmosRouteState
 * Board seed fixes the route across reloads; retryAt is a wall-clock UTC timestamp in ms. Older routes have no galaxy (G1).
 * @typedef {{seed:number,selected:number,goal:string,decisions:Record<string,string>,habitats:string[],retryAt:number}} CosmosRouteBoard
 */
const defaultGame = {
    // 세계수 아틀라스 (js/atlas.js normalize): unlocked/completed/bonus/autoMap survive loops; stash/run reset each loop.
    // stash: map items {uid,node,tier,rarity,mods:[{id,roll}],quality,corrupted}; run: the open map {map,portals,drops,returnZoneId}.
    // passives: atlas passive ids (js/atlas-passives.js); fragments: {id: count} per loop; loadout: fragment ids the device uses.
    // seeds: world-tree seeds 0..4 (pinnacle); epoch: {count, essence, perks} of the atlas rebirth layer (js/atlas-epoch.js).
    // endgame: the awakened late atlas (js/atlas-endgame.js) — kills, materials, blight, witness; survives loops, not the epoch.
    atlas: { version: 1, unlocked: false, completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, loadout: [], nextUid: 1, run: null, lastResult: null, autoMap: false, starterSeason: 0, epoch: { count: 0, essence: 0, perks: {} },
        endgame: { kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] } },
    // Last map's committed combat receipts; display only, never a claimable reward.
    explorationLoot: null,
    cosmosRoute: null,
    // Transient gravity pulse: {nextPulseAt: combat ms, steps: 0..2}; reset at load/exit.
    cosmosGravity: null,
    cosmosRouteBoard: { seed: 1, selected: 0, goal: 'dust', decisions: { 1: 'survey', 3: 'survey' }, habitats: ['swarm', 'guard', 'storm'], retryAt: 0 },
    combatTimeMs: 0,
    saveVersion: 18,
    // Permanent ledger: income follows CONTENT_UNLOCK_POINTS_PER_LOOP, starting at loop two.
    contentProgression: { version: 7, highestLoop: 1, unlocked: [], paidCosts: {}, inherited: [], automatic: [], grandfathered: [] },
    loopChallenge: null,
    loopChallengeHistory: [],
    level: 1,
    exp: 0,
    season: 1,
    loopCount: 0,
    combatTacticsUnlocked: false,
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
    loopStarterGemGranted: false,
    starterGemTutorialPending: null,
    settings: {
        // PC와 모바일 메뉴 편집은 서로의 순서·배치를 덮어쓰지 않는다.
        tabLayouts: {
            desktop: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] },
            mobile: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] }
        },
        showCombatScene: true,
        cameraShake: true,
        uiSounds: true,
        showCombatLog: true,
        showDetailedDamageLog: false,
        combatLogAggregate: true,
        combatLogRateLimit: true,
        showSpawnLog: true,
        showExpLog: true,
        showLootLog: true,
        showCrowdPauseLog: true,
        showDeathNotice: true,
        showActJournal: true,
        showMobileBattlePip: true,
        pauseGameOnOverlay: true,
        twoRowTabs: false,
        damageNumberFormat: 'comma',
        showExpComma: true,
        showHpComma: true,
        showEnemyHpComma: true,
        showCharacterComma: true,
        uiScale: 100,
        uiSkin: 'rift',
        iconArtStyle: 'pixel',
        highContrast: false,
        /** PC 단축키 중 기본값과 다른 것만: { 동작 id: KeyboardEvent.code | '' } (data/hotkeys.js) */
        hotkeyOverrides: {},
        heroAppearanceMode: 'loop',
        leftPaneCollapsed: false,
        combatLogCollapsed: false,
        mobileCombatLogExpanded: false,
        autoEquipEmptySlots: true,
        collapsePastLoopMilestones: true,
        autoSalvageEnabled: false,
        autoSalvageRarities: { normal: true, magic: true, rare: false, unique: false },
        inventoryViewRarities: { normal: true, magic: true, rare: true, unique: true },
        equipmentMobilePane: 'inventory',
        itemFilterEnabled: false,
        itemFilterRarities: { normal: true, magic: true, rare: true, unique: true },
        itemFilterTierThreshold: 10,
        itemFilterMinTierCount: 0,
        itemFilterMinHiddenTier: 1,
        itemFilterOnlyNewCodexUnique: false,
        equipmentTargets: { enabled: false, slot: 'any', scope: 'explicit', minMatches: 1, rules: [] },
        autoEnterMeteor: false,
        autoEnterGrandBreach: false,
        // 자동 환생(js/loop-automation-ui.js): 관문을 채우면 몇 초 뒤 다음 루프로, 다음 직업은 'ask' | 'keep'.
        autoLoop: false, autoLoopClass: 'ask',
        mapCompleteAction: 'nextZone',
        actExplorationMode: 'direct',
        // 탐험 자동 이동(미니맵 단추 · 단축키). 끄면 이동 명령으로만 움직이고 새 탐험도 직접 이동으로 시작한다.
        autoMove: true,
        disableItemAutomationAfterLoop: true,
        postLoopMapCompleteAction: 'nextLoopBestPlusOne',
        townReturnAction: 'retry',
        combatTargetPriority: 'nearest',
        combatPositionMode: 'auto',
        passiveTreeShowLabels: false,
        passiveTreeVisualStyleVersion: 2,
        passiveInvestmentSummaryCollapsed: true,
        passiveTreePlanner: { layoutVersion: PASSIVE_LAYOUT_VERSION, activeSlot: 0, autoInvest: false, presets: [null, null, null] },
        tabNotiEnabled: true,
        socialChatNotifications: true,
        chatMessageSize: 'medium',
        notiFilters: { char: true, season: true, items: true, skills: true, map: true, codex: true, traits: true, cube: true, jewel: true, journal: true, currency: true, fossil: true, ascend: true, loop: true, social: true }
    },
    selectedHeroId: 'hero1',
    selectedClassId: 'archer',
    classTalentAlignmentVersion: 1,
    talentSelectionInitialized: false,
    appearanceClassId: null,
    discoveredClassIds: [],
    heroSelectionInitialized: false,
    classFreeSwitchUnlocked: false,
    talentBloomClears: 0,
    talentBloomCombos: [],
    bloomedClasses: [],
    bloomLoopSpecGranted: null,
    bloomedClassThisLoop: null,
    bloomedTalentThisLoop: null,
    pendingTalentBloomHeroId: null,
    bloomBossDefeated: false,
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
    actExploration: null,
    enemies: [],
    playerAilments: [],
    playerLeechInstances: [],
    realmDeathWard: null,
    realmInvulnerableBarrierUntil: 0,
    nextEnemyId: 1,
    summons: [],
    summonSeq: 1,
    passives: [],
    passiveAttributePreference: 'strength',
    passiveAttributeChoices: {},
    passiveSpecialization: {
        revelation: 'combat',
        keystoneChoices: { wisdom_leap_element: 'fire' },
        cycleBuffs: [],
        fanaticism: { skillName: '', stacks: 0 },
        karma: { byEnemy: {}, buff: null }
    },
    voidPassives: {},
    retiredVoidPassives: {},
    discoveredPassives: [],
    passiveLayoutVersion: PASSIVE_LAYOUT_VERSION,
    passiveStarEvolution: false,
    passiveStarEvolutionSource: null,
    skills: ['기본 공격'],
    activeSkill: '기본 공격',
    mobilitySkill: '', // 이동 스킬 칸 (js/mobility-skill.js): a gem tagged 'mobility', worn next to the main gem
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
    beyondBoundary: {
        version: BEYOND_BOUNDARY_STATE_VERSION, unlocked: false, unlockNoticeSeen: false,
        highestTier: 1, selectedTier: 1, selectedSealId: 'edge', completions: 0, bestTier: 0,
        selectedRewardFocusId: 'armory', selectedIntensityId: 'plain',
        seals: { edge:{ level:0, xp:0 }, ward:{ level:0, xp:0 }, stride:{ level:0, xp:0 } },
        activeRun: null
    },
    clearedRootBosses: [],
    timeRift: { pressure: 1, activePressure: null, altarOpen: false, altarUnique: null, altarRare: null, fusionCount: 0 },
    mapSubtab: 'map-tab-zones',
    unlockedMapContents: ['map-tab-zones'],
    mapExploreSubtab: 'map-explore-hunting',
    gemFoldInactiveAttack: false,
    gemFoldInactiveSupport: false,
    gemResearchExpanded: {},
    autoRepeatSeasonBoss: false,
    equipment: { '무기': null, '투구': null, '갑옷': null, '방패': null, '장갑1': null, '장갑2': null, '신발': null, '목걸이': null, '반지1': null, '반지2': null, '반지3': null, '허리띠': null },
    equipmentLoadouts: { identityVersion: 1, selectedSlot: 0, presets: [null, null, null] },
    equipmentInventoryPlacements: {},
    // 그루터기 함 아래 3×3 조합창: 재료를 가리키기만 한다(js/stump-cube.js).
    stumpCube: { slots: [] },
    equipmentTemporaryStorage: [],
    inventory: [],
    jewelInventoryExpandLevel: 0,
    chaosInfuserUnlocked: false,
    abyssClearedDepths: [],
    craftingWorkspace: { discovered: [], pins: ['formlessDew','sapBud','goldenRule','blightSpore'], goal: { statId: '', minTier: 0 } },
    currencies: { timeRemnant: 0, magicBud: 0, sapBud: 0, formlessDew: 0, goldenRule: 0, emberBranch: 0, ouroboros: 0, blightSpore: 0, pruningShears: 0, fairyRing: 0, blessing: 0, bossKeyFlame: 0, bossKeyFrost: 0, bossKeyStorm: 0, beastKeyCerberus: 0, bossCore: 0, fossil: 0, fossilPrimal: 0, fossilAncientPrimal: 0, fossilPrimordial: 0, fossilJagged: 0, fossilBound: 0, fossilGale: 0, fossilPrismatic: 0, fossilAbyssal: 0, fossilBulwark: 0, fossilWedge: 0, fossilOld: 0, fossilRift: 0, deepWhetstone: 0, rootIron: 0, jewelPolish: 0, abyssCatalyst: 0, uberRootTicketFlame: 0, uberRootTicketFrost: 0, uberRootTicketStorm: 0, uberRootTicketChaos: 0, runeShard: 0, skyEssence: 0, gemShard: 0, jewelCore: 0, jewelShard: 0, sealShard: 0, strongSealShard: 0, radiantSealShard: 0, hiveKey: 0, colonyTrace: 0, colonyShard: 0, enchantedHoney: 0, venomStinger: 0, pollen: 0, beeswax: 0, starDust: 0, awakenedEcho: 0, voidChisel: 0, sporeFire: 0, sporeCold: 0, sporeLight: 0, underCopper: 0, underSilver: 0, underGold: 0 },
        offlineProgress: { version: 1, recognitionLevel: 0, efficiencyLevel: 0, stashLevel: 0, huntDirectiveUnlocked: false, safeReturnUnlocked: false, lootDirectiveUnlocked: false, rewardedThroughLoop: 0, lifetimeGranted: 0, huntMode: 'push', safetyPolicy: { consecutiveDeaths: 5, noKillMinutes: 10, stopOnNegativeExp: false, stopWhenStorageFull: false }, lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' }, stash: [], protectedOverflow: [] },
    ascendClass: null,
    lastLoopAscendPlan: null,
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
    beehive: { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0 },
    colony: { inRun: false, wave: 0, highestWave: 0, kills: 0, requiredKills: 0, rewardPending: false, wardInventory: [], wardEquipped: [null,null,null,null], wardSlots: 1, wardSlotVersion: 1 },
    // grandRun is created on entry. rewardVoidChisel: number|null is the actual paid integer,
    // null before settlement or for legacy receipts; retained until the next entry/loop reset.
    voidRift: { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, grandBreachCleared: false, activeKills: 0, requiredKills: 0 },
    sporeCraftModes: {},
    shrineState: { activeId: null, spawnCell: null, pity: 0, spawned: 0, claimed: 0 },
    shrineBuff: null,
    salvageRecovery: { entries: [], sequence: 0 },
    blackMarket: { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {}, preferredSlot: 'any', insight: 0, manualRefreshes: 0 },
    // NPC escrow: UTC millisecond clocks and independent visitors, with integer proceeds per currency.
    // listings: {id, item, price: integer currency units, currency, slot, listedAt: UTC ms}[]; escrow owns listed gear.
    // proceeds/budProceeds/goldProceeds: unclaimed integer dew/buds/gold; rng: saved uint32; sequence: increasing listing ID.
    playerStall: { version: 8, sequence: 0, offerSequence: 0, eventSequence: 0, saleSequence: 0, nextOfferAt: 0, lastAt: 0, nextVisitAt: 0, rng: 1357911, proceeds: 0, budProceeds: 0, goldProceeds: 0, listings: [], history: [], sales: [] },
    loop10ChaosStayEnabled: false,
    loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
    abyssEndlessDepth: 20,
    abyssUnlockedDepths: [20],
    loopDeepStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 },
    loopProgressBase: { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] },
    // Floor records count cleared floors; null in migrated saves means this loop was not recorded.
    loopProgressCurrent: { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] },
    cosmosLoopCount: 0,
    lastLoopAdvancePath: null,
    chaosRealm: createDefaultChaosRealmState(),
    skyTower: createDefaultSkyTowerState(),
    underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null], enhanceLvByNo: {}, bonusLinesByNo: {} },
    underworldProgress: { highestFloor: 1, currentFloor: 1 },
    ocean: createDefaultOceanState(),
    /** @type {StumpBoxState} */
    stumpBox: { version: 1, acquired: false, via: null, starter: { seed: false, sap: false }, nextId: 1, items: [], board: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        graft: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    cores: { equipped: null, owned: [] },
    pendingLoopDecision: false,
    pendingLoopReady: false,
    // The pending loop gate was reached in offline/background replay (js/loop-automation-ui.js does not auto-advance it).
    loopGateOffline: false,

    skyGemEnhancements: {},
    recentDamageEvents: [],
    // fatalElement is the last attack's dominant element, distinct from recent primaryElement.
    // Older logs have no fatalElement; save migration keeps that uncertainty as null.
    lastDeathLog: null,
    // Auto progression retreated after a defeat in story act frontierZoneId at this level (null = not retreating).
    // Cleared once the level rose by ACT_RETREAT_LEVELS or a map outside the retreat act finishes (js/combat.js holdActRetreat).
    actRetreat: null,
    unlockedSeasonContents: ['season_1'],
    seenSeasonContentNotices: ['season_1'],
    seenTutorials: [],
    journalEntries: ['prologue'],
    journalBonuses: [],
    journalBonusClaims: {},
    hiddenJournalBossRun: null,
    claimableActRewards: [],
    claimedActRewards: [],
    actRewardBonuses: [],
    seasonChaseUniqueDropped: false,
    seasonChaseUniqueDrops: [],
    gemEnhanceUnlocked: false,
    gemEnhanceTargetSkill: null,
    gemEngraveSelectedSlot: 0,
    uniqueCodex: {},
    uniqueHuntTargets: [],
    equipmentDropProgress: 0, // Drought credit; normal 1 / elite 4 / boss 16, reset on an equipment drop.
    codexNewlyRegistered: {},
    codexCollapsedSlots: {},
    codexSubtab: 'main',
    codexSelectedSlot: '무기',
    uniqueCodexCompletedRewardClaimed: false,
    // 운석 낙하 지점(2026-10-01 별쐐기 저장에서 분리): 하늘 균열 게이지 · 들어갈 단계 · 돌아갈 사냥터 · 별자리 관측.
    meteorSite: {
        unlocked: false,
        skyRiftGauge: 0,
        skyRiftReady: false,
        skyRiftMinTier: null,
        skyRiftAllCosmos: false,
        activeMeteorTier: null,
        meteorReturnZoneId: null,
        lastAnomalyAt: 0,
        skyRiftCarryGauge: 0,
        constellationBuff: null,
        entriesCleared: 0
    },
    // cloudResetRevision: last explicit account reset's server revision (0 for pre-reset saves).
    saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null, cloudUserId: null, cloudRevision: 0, cloudResetRevision: 0, maxSeenAt: 0 },
    unlocks: { char: false, season: false, items: false, map: false, skills: false, codex: false, traits: false, talent: false, jewel: false, stump: false },
    noti: { char: false, season: false, items: false, skills: false, map: false, codex: false, traits: false, jewel: false, journal: false, currency: false, fossil: false, ascend: false, loop: false, social: false, stump: false },
    mapAlarmSeen: {},
    mapAlarmMainSeen: {}
};


safeExposeGlobals({
    defaultGame, hasPermanentTalentTabUnlock, syncPermanentTalentTabUnlock,
    getBeyondBoundaryTierProfile,
    COMBAT_TACTIC_TARGET_PRIORITIES, COMBAT_TACTIC_POSITION_MODES,
    normalizeCombatTacticsSettings, hasCombatTacticsUnlockProgress, ensureCombatTacticsUnlockState,
    isFreePassiveStartNodeId, getPaidPassiveNodeIds
});

// Phase-4 extracted progression math helpers.
function getExpReq(level) {
    let lv = Math.max(1, Math.floor(level || 1));
    const requirements = LEVEL_PROGRESSION.playerExperienceRequired;
    if (lv <= 100) return requirements[lv - 1];
    let delta = lv - 100;
    return requirements[99] + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
}
function getGemReqExp(level) { return LEVEL_PROGRESSION.gemExperienceRequired[Math.max(1, Math.min(20, Math.floor(level || 1))) - 1]; }
// Save boundary: retain failures through the current stage's guaranteed attempt.
function normalizeGemCoreFailures(value, level) {
    return level === GEM_CORE_FORGE.maxLevel || !Number.isFinite(value) ? 0
        : Math.min(GEM_CORE_FORGE.pityBonusPct.findIndex(bonus => GEM_CORE_FORGE.successPct[level] + bonus >= 100), Math.max(0, Math.floor(value)));
}
function normalizeGemRecord(raw) {
    if (!raw || typeof raw !== 'object') return { level: 1, exp: 0, bossCoreLevel: 0, skyCoreLevel: 0, bossCoreFailures: 0, skyCoreFailures: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    let bossCoreLevel = Number.isFinite(raw.bossCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.bossCoreLevel))) : 0;
    let skyCoreLevel = Number.isFinite(raw.skyCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.skyCoreLevel))) : 0;
    const bossCoreFailures = normalizeGemCoreFailures(raw.bossCoreFailures, bossCoreLevel);
    const skyCoreFailures = normalizeGemCoreFailures(raw.skyCoreFailures, skyCoreLevel);
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level: level, exp: exp, bossCoreLevel: bossCoreLevel, skyCoreLevel: skyCoreLevel, bossCoreFailures, skyCoreFailures, skyEnhanceCap: skyEnhanceCap, unlockedTier: unlockedTier, activeTier: activeTier, quality: quality, awakened: awakened };
}


safeExposeGlobals({ getExpReq, getGemReqExp, normalizeGemRecord });
