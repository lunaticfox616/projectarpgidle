// Phase-2 extracted save helpers and persistence flow.
const localSaveRuntimeState = {
    status: 'uninitialized',
    writable: true,
    sourceKey: null,
    backupKey: null,
    message: ''
};

function setLocalSaveRuntimeState(status, options = {}) {
    localSaveRuntimeState.status = status;
    localSaveRuntimeState.writable = options.writable !== false;
    localSaveRuntimeState.sourceKey = options.sourceKey || null;
    localSaveRuntimeState.backupKey = options.backupKey || null;
    localSaveRuntimeState.message = options.message || '';
}

function getLocalSaveStatus() {
    return { ...localSaveRuntimeState };
}

function canPersistLocalSave() {
    return localSaveRuntimeState.writable !== false;
}

function readLocalSaveResult() {
    try {
        let save = localStorage.getItem(LOCAL_SAVE_KEY);
        if (save) return { status: 'ok', save, sourceKey: LOCAL_SAVE_KEY };
        for (let i = 0; i < LEGACY_SAVE_KEYS.length; i++) {
            save = localStorage.getItem(LEGACY_SAVE_KEYS[i]);
            if (save) return { status: 'ok', save, sourceKey: LEGACY_SAVE_KEYS[i] };
        }
        return { status: 'missing', save: null, sourceKey: null };
    } catch (error) {
        return { status: 'unavailable', save: null, sourceKey: null, error };
    }
}

function readLocalSaveString() {
    let result = readLocalSaveResult();
    if (result.status === 'unavailable') throw result.error;
    return result.save;
}

function preserveCorruptLocalSave(rawSave) {
    if (!rawSave) return null;
    let backupKey = `${LOCAL_SAVE_KEY}_corrupt_${Date.now()}`;
    try {
        localStorage.setItem(backupKey, rawSave);
        return backupKey;
    } catch (error) {
        console.error('failed to preserve corrupt local save:', error);
        return null;
    }
}

function ensureSaveMeta() {
    if (!game.saveMeta || typeof game.saveMeta !== 'object') game.saveMeta = JSON.parse(JSON.stringify(defaultGame.saveMeta));
    if (!Number.isFinite(game.saveMeta.lastModifiedAt)) game.saveMeta.lastModifiedAt = 0;
    if (!Number.isFinite(game.saveMeta.lastCloudSyncAt)) game.saveMeta.lastCloudSyncAt = 0;
    if (!game.saveMeta.lastCloudUploadProfile || typeof game.saveMeta.lastCloudUploadProfile !== 'object') {
        game.saveMeta.lastCloudUploadProfile = null;
    }
}

function refreshItemIdCounter() {
    // 시간의 균열 제단에 보관 중인 아이템도 id 공간을 점유한다 — 누락하면 재로드 후 id가 재사용되어
    // 제단 아이템이 돌아왔을 때 id 기반 인벤토리 조작이 다른 아이템을 가리킬 수 있다.
    let rift = (game && game.timeRift && typeof game.timeRift === 'object') ? game.timeRift : {};
    let altarIds = [rift.altarUnique, rift.altarRare].filter(Boolean).map(item => item.id || 0);
    itemIdCounter = Math.max(0, ...(game.inventory || []).map(item => item.id || 0), ...Object.values(game.equipment || {}).filter(Boolean).map(item => item.id || 0), ...altarIds);
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
    payload.realmDeathWard = null;
    payload.realmInvulnerableBarrierUntil = 0;
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
    if (!canPersistLocalSave() && options.allowRecoveryWrite !== true) return false;
    ensureSaveMeta();
    if (options.touchModifiedAt !== false) game.saveMeta.lastModifiedAt = Date.now();
    try {
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(createSaveSnapshot(game)));
    } catch (error) {
        try {
            let sanitized = sanitizeForSave(game || {});
            if (!sanitized.saveMeta || typeof sanitized.saveMeta !== 'object') sanitized.saveMeta = {};
            localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(sanitized));
            if (typeof addLog === 'function') addLog('💾 저장 데이터 정리 후 로컬 저장을 복구했습니다.', 'season-up');
        } catch (retryError) {
            console.error('local save failed:', error, retryError);
            let isQuota = retryError && (retryError.name === 'QuotaExceededError' || /quota|storage/i.test(String(retryError.message || '')));
            setLocalSaveRuntimeState('write-failed', {
                writable: false,
                message: isQuota ? '브라우저 저장공간 부족으로 자동 저장을 중단했습니다.' : '로컬 저장 실패로 자동 저장을 중단했습니다.'
            });
            if (typeof addLog === 'function') addLog(isQuota ? '⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요.' : '⚠️ 로컬 저장 실패: 저장 데이터 형식 오류가 발생했습니다.', 'loot-rare');
            return false;
        }
    }
    setLocalSaveRuntimeState('ok', { writable: true, sourceKey: LOCAL_SAVE_KEY });
    refreshItemIdCounter();
    return true;
}


function normalizeLocalRuntimeAfterLoad() {
    if (!game) return;
    let zone = (typeof getZone === 'function') ? getZone(game.currentZoneId) : null;
    if (!zone && typeof getAutoProgressZoneId === 'function') {
        game.currentZoneId = getAutoProgressZoneId(Math.max(0, Math.floor(game.maxZoneId || 0)));
    }
    if (!Array.isArray(game.enemies)) game.enemies = [];
    if (!Array.isArray(game.encounterPlan)) game.encounterPlan = [];
    if (!Number.isFinite(game.moveTimer)) game.moveTimer = 0;
    if (game.enemies.length === 0 && game.encounterPlan.length === 0) game.combatHalted = false;
    if (!game.realmDeathWard || typeof game.realmDeathWard !== 'object') game.realmDeathWard = null;
    else {
        game.realmDeathWard.amount = Math.max(0, Math.floor(Number(game.realmDeathWard.amount) || 0));
        game.realmDeathWard.maxAmount = Math.max(0, Math.floor(Number(game.realmDeathWard.maxAmount) || 0));
        game.realmDeathWard.readyAt = Math.max(0, Math.floor(Number(game.realmDeathWard.readyAt) || 0));
    }
    game.realmInvulnerableBarrierUntil = Math.max(0, Math.floor(Number(game.realmInvulnerableBarrierUntil) || 0));
}

function loadGame() {
    let result = readLocalSaveResult();
    if (result.status === 'unavailable') {
        console.error('local save storage is unavailable:', result.error);
        setLocalSaveRuntimeState('unavailable', {
            writable: false,
            message: '브라우저 저장소에 접근할 수 없어 자동 저장과 클라우드 업로드를 중단했습니다.'
        });
        game = cloneDefaultGame();
    } else if (result.status === 'missing') {
        setLocalSaveRuntimeState('missing', { writable: true });
        game = cloneDefaultGame();
    } else {
        try {
            game = mergeDefaults(JSON.parse(result.save));
            setLocalSaveRuntimeState('ok', { writable: true, sourceKey: result.sourceKey });
        } catch (error) {
            let backupKey = preserveCorruptLocalSave(result.save);
            console.error('local save is corrupt; automatic writes are blocked:', error);
            setLocalSaveRuntimeState('corrupt', {
                writable: false,
                sourceKey: result.sourceKey,
                backupKey,
                message: backupKey
                    ? `손상된 저장을 ${backupKey}에 보존했으며 자동 저장과 클라우드 업로드를 중단했습니다.`
                    : '저장 데이터가 손상되어 자동 저장과 클라우드 업로드를 중단했습니다.'
            });
            game = cloneDefaultGame();
        }
    }
    ensureSaveMeta();
    normalizeLocalRuntimeAfterLoad();
    refreshItemIdCounter();
    return getLocalSaveStatus();
}

function saveGame(options = {}) {
    let manual = !!options.manual;
    let persisted = persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false });
    if (!persisted) {
        if (manual && typeof setCloudMessage === 'function') setCloudMessage(localSaveRuntimeState.message || '로컬 저장이 차단되어 저장하지 못했습니다.');
        return false;
    }
    if (!options.skipCloudSync) {
        if (manual && typeof syncCloudSave === 'function' && cloudState && cloudState.configured && cloudState.user) {
            syncCloudSave({ automatic: false, force: true, reason: 'manual-save' }).catch(error => {
                if (typeof setCloudMessage === 'function') setCloudMessage('수동 저장 클라우드 업로드 실패: ' + (error && error.message ? error.message : error));
            });
        } else scheduleCloudAutoSync();
    }
    updateCloudSaveUI();
    return true;
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


safeExposeGlobals({ readLocalSaveString, readLocalSaveResult, getLocalSaveStatus, canPersistLocalSave, ensureSaveMeta, createSaveSnapshot, createCloudSavePayload, persistLocalSave, loadGame, saveGame, queueImportantSave, formatCloudTime, setCloudMessage });
