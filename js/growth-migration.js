// 기존 고정 슬롯 장비 저장 → 생장판 저장 마이그레이션.
// 한 번만 실행되며(game.growthSystemVersion), 실행 전 원본을 백업한다.
// 아이템을 삭제하거나 증발시키지 않는다: 장착/보관/제단/최근함의 모든 아이템을 변환해 보관함으로 옮긴다.

const GROWTH_SYSTEM_VERSION = 1;
const GROWTH_MIGRATION_BACKUP_KEY = 'projectIdleGrowthMigrationBackup';

function isGrowthMigrationNeeded() {
    return Math.floor(Number(game.growthSystemVersion) || 0) < GROWTH_SYSTEM_VERSION;
}

// 마이그레이션 직전 저장을 그대로 백업한다. 실패해도 마이그레이션은 계속 진행하되 로그를 남긴다.
function backupSaveBeforeGrowthMigration() {
    try {
        localStorage.setItem(GROWTH_MIGRATION_BACKUP_KEY, JSON.stringify({
            savedAt: Date.now(),
            game: createSaveSnapshot(game)
        }));
        return true;
    } catch (error) {
        console.error('growth migration backup failed:', error);
        addLog('⚠️ 생장판 전환 백업에 실패했습니다(저장공간 부족 가능). 전환은 계속 진행됩니다.', 'loot-rare');
        return false;
    }
}

function readGrowthMigrationBackup() {
    try {
        let raw = localStorage.getItem(GROWTH_MIGRATION_BACKUP_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('growth migration backup read failed:', error);
        return null;
    }
}

// 레거시 고유는 이름/효과를 유지한 채 종류·형태만 새로 받는다 (spec 15: 무작정 삭제하지 않는다).
function convertLegacyUniqueToGrowth(item) {
    convertLegacyItemToGrowthItem(item);
    if (item.rarity !== 'unique') return item;
    // 슬롯 위치 조건에 의존하던 고유는 대응하는 공간 조건으로 재해석한다.
    if (item.uniqueEffectKey === 'rightRingSummonCap') {
        item.growthEffectKey = 'boundaryStone';
        item.uniqueEffect = `${item.uniqueEffect || ''} (생장판 재해석: 외벽 면 수에 비례한 보너스)`.trim();
    }
    if (item.uniqueEffectKey === 'mirrorOppositeRing') {
        item.growthEffectKey = 'twinSpore';
        item.uniqueEffect = `${item.uniqueEffect || ''} (생장판 재해석: 좌우 대칭/사이 아이템 옵션 복사)`.trim();
    }
    return item;
}

function migrateLegacyItemList(items) {
    return (Array.isArray(items) ? items : []).filter(Boolean).map(item => {
        normalizeItem(item);
        return convertLegacyUniqueToGrowth(item);
    });
}

// 변환 불가능한 잔여 아이템에 대한 보상 토큰. 현재 변환기는 모든 슬롯을 처리하므로
// 슬롯 정보 자체가 없는 손상 데이터에만 사용된다.
function grantGrowthMigrationCompensation(count) {
    if (count <= 0) return;
    game.currencies = game.currencies || {};
    game.currencies.chaos = Math.floor(game.currencies.chaos || 0) + count;
    addLog(`🎁 변환할 수 없는 아이템 ${count}개에 대한 보상으로 카오스 오브 ${count}개를 지급했습니다.`, 'loot-rare');
}

function collectLegacyEquipmentItems() {
    let items = [];
    Object.keys(game.equipment || {}).forEach(slot => {
        let item = game.equipment[slot];
        if (item) items.push(item);
    });
    return items;
}

function runGrowthBoardMigration() {
    if (!isGrowthMigrationNeeded()) return { migrated: false };
    let legacyEquipped = collectLegacyEquipmentItems();
    let legacyInventory = Array.isArray(game.inventory) ? game.inventory.slice() : [];
    let hadLegacyItems = legacyEquipped.length > 0 || legacyInventory.some(item => item && !isGrowthItem(item));
    if (hadLegacyItems) backupSaveBeforeGrowthMigration();

    let broken = 0;
    let converted = migrateLegacyItemList(legacyEquipped.concat(legacyInventory)).filter(item => {
        if (isGrowthItem(item)) return true;
        broken++;
        return false;
    });

    game.equipment = { ...defaultGame.equipment };
    game.inventory = converted;
    // 제단 아이템도 형태를 갖춰야 회수 시 배치할 수 있다.
    let rift = (game.timeRift && typeof game.timeRift === 'object') ? game.timeRift : null;
    if (rift) {
        if (rift.altarUnique) convertLegacyUniqueToGrowth(normalizeItem(rift.altarUnique));
        if (rift.altarRare) convertLegacyUniqueToGrowth(normalizeItem(rift.altarRare));
    }
    game.recentGrowthDrops = migrateLegacyItemList(game.recentGrowthDrops);

    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
    autoPlaceMigratedGrowthItems(legacyEquipped);
    validateGrowthPlacements();
    invalidateGrowthEffects();
    grantGrowthMigrationCompensation(broken);
    game.growthSystemVersion = GROWTH_SYSTEM_VERSION;
    if (hadLegacyItems) {
        addLog(`🌱 생장판 전환 완료: 기존 장비 ${converted.length}개를 생장 아이템으로 변환했습니다. 장착 중이던 장비는 자동으로 배치를 시도했습니다.`, 'season-up');
    }
    return { migrated: true, converted: converted.length, broken: broken };
}

// 기존 장착 장비를 우선적으로 판에 올려, 전환 직후 캐릭터가 알몸이 되지 않게 한다.
// 큰 아이템부터 좌상단 우선으로 놓고, 자리가 없으면 보관함에 남긴다.
function autoPlaceMigratedGrowthItems(previouslyEquipped) {
    let ids = new Set((previouslyEquipped || []).filter(Boolean).map(item => item.id));
    let candidates = (game.inventory || [])
        .filter(item => isGrowthItem(item) && ids.has(item.id))
        .sort((a, b) => getGrowthItemSize(b) - getGrowthItemSize(a));
    let placed = 0;
    candidates.forEach(item => {
        if (tryAutoPlaceGrowthItem(item)) placed++;
    });
    return placed;
}

/** 비어 있는 첫 자리에 배치한다. 모든 회전을 시도한다. @returns {boolean} */
function tryAutoPlaceGrowthItem(item) {
    for (let y = 0; y < GROWTH_BOARD_H; y++) {
        for (let x = 0; x < GROWTH_BOARD_W; x++) {
            for (let rotation = 0; rotation < 4; rotation++) {
                if (canPlaceGrowthItem(item, x, y, rotation).ok) {
                    return placeGrowthItem(item.id, x, y, rotation).ok;
                }
            }
        }
    }
    return false;
}

safeExposeGlobals({
    GROWTH_SYSTEM_VERSION, isGrowthMigrationNeeded, runGrowthBoardMigration,
    readGrowthMigrationBackup, convertLegacyItemToGrowthItem, tryAutoPlaceGrowthItem
});
