// Phase-2 extracted save helpers and persistence flow.
function readLocalSaveString() {
    try {
        let save = localStorage.getItem(LOCAL_SAVE_KEY);
        if (save) return save;
        for (let i = 0; i < LEGACY_SAVE_KEYS.length; i++) {
            save = localStorage.getItem(LEGACY_SAVE_KEYS[i]);
            if (save) return save;
        }
    } catch (e) {}
    return null;
}

function ensureSaveMeta() {
    if (!game.saveMeta || typeof game.saveMeta !== 'object') game.saveMeta = JSON.parse(JSON.stringify(defaultGame.saveMeta));
    if (!Number.isFinite(game.saveMeta.lastModifiedAt)) game.saveMeta.lastModifiedAt = 0;
    if (!Number.isFinite(game.saveMeta.lastCloudSyncAt)) game.saveMeta.lastCloudSyncAt = 0;
}

function refreshItemIdCounter() {
    itemIdCounter = Math.max(0, ...(game.inventory || []).map(item => item.id || 0), ...Object.values(game.equipment || {}).filter(Boolean).map(item => item.id || 0));
}

function createSaveSnapshot(sourceGame) {
    let snapshot = JSON.parse(JSON.stringify(sourceGame || game || {}));
    if (!snapshot.saveMeta || typeof snapshot.saveMeta !== 'object') snapshot.saveMeta = {};
    return snapshot;
}

function persistLocalSave(options = {}) {
    ensureSaveMeta();
    if (options.touchModifiedAt !== false) game.saveMeta.lastModifiedAt = Date.now();
    try {
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(createSaveSnapshot(game)));
    } catch (e) {
        console.error('local save failed:', e);
        if (typeof addLog === 'function') addLog('⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요.', 'loot-rare');
    }
    refreshItemIdCounter();
}

function loadGame() {
    try {
        let save = readLocalSaveString();
        if (save) game = mergeDefaults(JSON.parse(save));
        else game = cloneDefaultGame();
        ensureSaveMeta();
        refreshItemIdCounter();
    } catch (e) {
        game = cloneDefaultGame();
        refreshItemIdCounter();
    }
}

function saveGame(options = {}) {
    persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false });
    if (!options.skipCloudSync) scheduleCloudAutoSync();
    updateCloudSaveUI();
}

let importantSaveTimer = null;
function queueImportantSave(delayMs) {
    let delay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 350);
    if (importantSaveTimer) clearTimeout(importantSaveTimer);
    importantSaveTimer = setTimeout(() => {
        importantSaveTimer = null;
        saveGame({ skipCloudSync: true });
    }, delay);
}

function formatCloudTime(value) {
    if (!value) return '없음';
    let date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '없음';
    return date.toLocaleString('ko-KR');
}

function setCloudMessage(message) {
    cloudState.lastMessage = message;
    updateCloudSaveUI();
}


safeExposeGlobals({ readLocalSaveString, ensureSaveMeta, createSaveSnapshot, persistLocalSave, loadGame, saveGame, queueImportantSave, formatCloudTime, setCloudMessage });
