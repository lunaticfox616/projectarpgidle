const SPECIAL_BATTLE_BACKDROP_SOURCES = Object.freeze({
    bgMeteor: 'assets/background/refined-20260910/bgMeteor.webp',
    bgSkyTower: 'assets/background/refined-20260910/bgSkyTower.webp',
    bgUnderworld: 'assets/background/refined-20260910/bgUnderworld.webp',
    bgOceanDepth: 'assets/background/refined-20260910/bgOceanDepth.webp',
    bgCosmos: 'assets/background/refined-20260910/bgCosmos.webp',
    // 웨이브 콘텐츠 판(2026-10-06, scripts/build-board-backdrops.cjs): 원소에 맞는 액트 판을 빌리던 벌집 원정과 군락지의 전용 판.
    // 액트 판 그림과 같은 912×624, 9×8 칸이 (240,144)부터 48px.
    bgBeehive: 'assets/background/boards-20261006/bgBeehive.png',
    bgColony: 'assets/background/boards-20261006/bgColony.png'
});
// 9×8 칸에 맞춰 그린 특수 판 그림: js/ui.js drawGridAlignedBackdrop이 액트 판처럼 칸에 맞춰 놓는다(나머지 특수 그림은 화면을 덮는다).
const GRID_ALIGNED_SPECIAL_BACKDROPS = Object.freeze(['bgUnderworld', 'bgMeteor', 'bgBeehive', 'bgColony']);
const SPECIAL_BATTLE_BACKDROP_RETRY_MS = 5000;
const FIXED_BATTLE_BACKDROP_KEYS = Object.freeze({labyrinth:'bgAct5',meteor:'bgMeteor',beehive:'bgBeehive',colony:'bgColony'});

const specialBattleBackdropLoads = new Map();

function getBattleBackdropKeyForZone(zone) {
    if (!zone) return 'bgAct1';
    if (zone.type === 'skyTower' || zone.pinnacleTrack === 'sky') return 'bgSkyTower';
    if (zone.type === 'underworld' || zone.pinnacleTrack === 'underworld') return 'bgUnderworld';
    if (zone.type === 'oceanDepth' || zone.pinnacleTrack === 'ocean') return 'bgOceanDepth';
    if (zone.type === 'cosmos' || zone.cosmosCapstone || zone.pinnacleTrack === 'convergence') return 'bgCosmos';
    if (zone.type === 'chaosRealm') {
        let floor = Math.max(1, Number(zone.floor || zone.stage || zone.id || 1) || 1);
        return floor % 20 === 0 ? 'bgChaos18' : `bgChaos${(floor - 1) % 18}`;
    }
    if (zone.type === 'act') return `bgAct${Math.max(1, Math.min(10, (Number(zone.id) || 0) + 1))}`;
    if (FIXED_BATTLE_BACKDROP_KEYS[zone.type]) return FIXED_BATTLE_BACKDROP_KEYS[zone.type];
    if (['abyss', 'seasonBoss'].includes(zone.type)) return 'bgAct10';
    if (zone.ele === 'fire') return 'bgAct2';
    if (zone.ele === 'cold') return 'bgAct3';
    if (zone.ele === 'light') return 'bgAct4';
    if (zone.ele === 'chaos') return 'bgAct9';
    return 'bgAct1';
}

/**
 * @param {string} key
 * @returns {Promise<HTMLImageElement|null>|null}
 */
function requestSpecialBattleBackdrop(key) {
    let src = SPECIAL_BATTLE_BACKDROP_SOURCES[key];
    if (!src || typeof Image === 'undefined') return null;
    battleAssets.backdrops = battleAssets.backdrops || {};
    if (battleAssets.backdrops[key]) return Promise.resolve(battleAssets.backdrops[key]);
    let cached = specialBattleBackdropLoads.get(key);
    if (cached && cached.image) {
        battleAssets.backdrops[key] = cached.image;
        return Promise.resolve(cached.image);
    }
    if (cached && cached.promise) return cached.promise;
    if (cached && cached.failedAt && Date.now() - cached.failedAt < SPECIAL_BATTLE_BACKDROP_RETRY_MS) return null;
    let entry = cached || { image: null, promise: null, failedAt: 0 };
    let image = new Image();
    if (typeof isLocalFileProtocol === 'function' && !isLocalFileProtocol()) image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = 'high';
    entry.promise = new Promise(resolve => {
        image.onload = () => {
            entry.image = image;
            entry.promise = null;
            entry.failedAt = 0;
            battleAssets.backdrops[key] = image;
            if (typeof renderBattlefield === 'function') renderBattlefield();
            resolve(image);
        };
        image.onerror = () => {
            entry.promise = null;
            entry.failedAt = Date.now();
            console.warn('special battle backdrop load failed:', key, src);
            resolve(null);
        };
    });
    specialBattleBackdropLoads.set(key, entry);
    image.src = src;
    return entry.promise;
}

safeExposeGlobals({ getBattleBackdropKeyForZone, requestSpecialBattleBackdrop, GRID_ALIGNED_SPECIAL_BACKDROPS });
