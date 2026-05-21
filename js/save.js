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

function createCloudSavePayload(sourceGame) {
    let payload = createSaveSnapshot(sourceGame || game || {});
    payload.enemies = [];
    payload.encounterPlan = [];
    payload.encounterIndex = Math.max(0, Math.floor(payload.encounterIndex || 0));
    payload.nextEnemyId = Math.max(1, Math.floor(payload.nextEnemyId || 1));
    payload.combatLog = [];
    payload.recentDamageEvents = [];
    payload.pendingSlamEchoHits = [];
    payload.dotFxThrottle = {};
    payload.battlefieldEnemySprites = {};
    payload.enemyConditionDebuffs = {};
    payload.enemyKeystoneDebuffs = {};
    payload.rangerWeakpointMarks = {};
    payload.enemyUniqueChaosResDown = {};
    payload.enemyUniqueElementalResDown = {};
    payload.enemyCurseExpirePayloads = {};
    payload.playerAilments = Array.isArray(payload.playerAilments) ? payload.playerAilments.slice(0, 40) : [];
    payload.playerLeechInstances = Array.isArray(payload.playerLeechInstances) ? payload.playerLeechInstances.slice(0, 80) : [];
    return payload;
}

function sanitizeForSave(value, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    if (typeof value !== 'object') return Number.isFinite(value) ? value : (typeof value === 'number' ? 0 : value);
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
        let out = [];
        for (let i = 0; i < value.length; i++) {
            let v = sanitizeForSave(value[i], seen);
            out.push(v === undefined ? null : v);
        }
        return out;
    }
    let out = {};
    Object.keys(value).forEach(key => {
        let v = sanitizeForSave(value[key], seen);
        if (v !== undefined) out[key] = v;
    });
    return out;
}

function persistLocalSave(options = {}) {
    ensureSaveMeta();
    if (options.touchModifiedAt !== false) game.saveMeta.lastModifiedAt = Date.now();
    try {
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(createSaveSnapshot(game)));
    } catch (e) {
        try {
            let sanitized = sanitizeForSave(game || {});
            if (!sanitized.saveMeta || typeof sanitized.saveMeta !== 'object') sanitized.saveMeta = {};
            localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(sanitized));
            if (typeof addLog === 'function') addLog('💾 저장 데이터 정리 후 로컬 저장을 복구했습니다.', 'season-up');
        } catch (retryError) {
            console.error('local save failed:', e, retryError);
            let isQuota = retryError && (retryError.name === 'QuotaExceededError' || /quota|storage/i.test(String(retryError.message || '')));
            if (typeof addLog === 'function') addLog(isQuota ? '⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요.' : '⚠️ 로컬 저장 실패: 저장 데이터 형식 오류가 발생했습니다.', 'loot-rare');
        }
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
    let manual = !!options.manual;
    persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false });
    if (!options.skipCloudSync) {
        if (manual && typeof syncCloudSave === 'function' && cloudState && cloudState.configured && cloudState.user) {
            syncCloudSave({ automatic: false, force: true, reason: 'manual-save' }).catch(error => {
                if (typeof setCloudMessage === 'function') setCloudMessage('수동 저장 클라우드 업로드 실패: ' + (error && error.message ? error.message : error));
            });
        } else scheduleCloudAutoSync();
    }
    updateCloudSaveUI();
}

let importantSaveTimer = null;
function queueImportantSave(delayMs) {
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return;
    let delay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 350);
    if (importantSaveTimer) clearTimeout(importantSaveTimer);
    importantSaveTimer = setTimeout(() => {
        importantSaveTimer = null;
        if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return;
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


safeExposeGlobals({ readLocalSaveString, ensureSaveMeta, createSaveSnapshot, createCloudSavePayload, persistLocalSave, loadGame, saveGame, queueImportantSave, formatCloudTime, setCloudMessage });
