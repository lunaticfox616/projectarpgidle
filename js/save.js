function normalizeCloudUploadProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return {
        at: Math.max(0, Math.floor(Number(profile.at) || 0)),
        serializeMs: Math.max(0, Math.floor(Number(profile.serializeMs) || 0)),
        uploadMs: Math.max(0, Math.floor(Number(profile.uploadMs) || 0)),
        totalMs: Math.max(0, Math.floor(Number(profile.totalMs) || 0)),
        payloadBytes: Math.max(0, Math.floor(Number(profile.payloadBytes) || 0))
    };
}


// Phase-2 extracted save helpers and persistence flow.

/** The save slot this page reads and writes (2026-10-30). The guest slot (LOCAL_SAVE_KEY) lives on this device only and never goes to
 * the server. An account's slot (ACCOUNT_SAVE_KEY_PREFIX + account id) holds this device's copy of that account's server save plus
 * what it has not uploaded yet (saveMeta.cloudPending); the account mode reads and writes only that slot. userId is null for the guest. */
const saveSlot = { kind: 'guest', key: LOCAL_SAVE_KEY, userId: null };

function accountSaveKey(userId) {
    return `${ACCOUNT_SAVE_KEY_PREFIX}${userId}`;
}

/** Makes an account's slot (userId) or the guest slot (null) the one loadGame and persistLocalSave use. */
function selectSaveSlot(userId) {
    saveSlot.kind = userId ? 'account' : 'guest';
    saveSlot.userId = userId || null;
    saveSlot.key = userId ? accountSaveKey(userId) : LOCAL_SAVE_KEY;
}

function getSaveSlot() {
    return { ...saveSlot };
}

/** The guest slot's save as parsed data, whichever slot is active; null when there is none or it cannot be read. */
function readGuestSave() {
    try {
        const raw = localStorage.getItem(LOCAL_SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('guest save could not be read:', error);
        return null;
    }
}

/** Removes the guest save (after it moved into an account), with its earlier key names and corrupt copies. */
function removeGuestSave() {
    const earlier = /^[a-z]{3}IdleSaveData_/i;
    Object.keys(localStorage).filter(key => key === LOCAL_SAVE_KEY || earlier.test(key) || key.startsWith(`${LOCAL_SAVE_KEY}_corrupt_`))
        .forEach(key => localStorage.removeItem(key));
}

/** Before the slots (2026-10-30) one key held whichever save was last played, so the guest slot may hold an account's save
 * (saveMeta.cloudUserId). Once, at boot: it moves into that account's slot (unless that slot already exists) and the guest slot
 * empties, so an account save never shows up as a guest save (which could be moved into another account). Returns the moved key or null. */
function migrateOwnedGuestSave() {
    try {
        const raw = localStorage.getItem(LOCAL_SAVE_KEY);
        const owner = raw ? JSON.parse(raw)?.saveMeta?.cloudUserId : null;
        if (typeof owner !== 'string' || !owner.trim()) return null;
        const key = accountSaveKey(owner);
        if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
        localStorage.removeItem(LOCAL_SAVE_KEY);
        return key;
    } catch (error) {
        console.warn('owned guest save migration skipped:', error);
        return null;
    }
}

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

/** The release this page runs: the time of the commit it was built from (ISO), which scripts/lib/game-build.js writes into
 * <meta name="game-build"> of a release (dist/, www/). An unbuilt page (development server, smoke runtime) has 'dev' or no tag and
 * gets null: it stamps no save and refuses none. */
const RUNNING_GAME_BUILD = (() => {
    const meta = typeof document === 'object' && typeof document.querySelector === 'function' ? document.querySelector('meta[name="game-build"]') : null;
    return gameBuildTime(meta && meta.content) ? meta.content : null;
})();
const OUTDATED_BUILD_ERROR_CODE = 'GAME_BUILD_OUTDATED';

/** A game build stamp's time in ms, or 0 for anything else (no stamp, 'dev', a damaged value). */
function gameBuildTime(stamp) {
    const time = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
    return Number.isFinite(time) && time > 0 ? time : 0;
}

/** Every save a release writes names that release, so an older release can tell it apart (outdatedBuildError). */
function stampGameBuild(meta) {
    if (RUNNING_GAME_BUILD) meta.gameBuild = RUNNING_GAME_BUILD;
}

/** Why this page must not take saveData (a device or cloud save) in, or null when it may: a later release wrote it, and may have
 * reshaped it or added things this release does not know, which loading here would drop and the next write would carry back
 * (2026-10-28: a store app trails the web by days). Everything is refused while this device's own save is from a later release
 * (loadGame 'newer-build'). The error's code is OUTDATED_BUILD_ERROR_CODE. */
function outdatedBuildError(saveData) {
    if (localSaveRuntimeState.status === 'newer-build') return outdatedBuildRefusal(localSaveRuntimeState.message);
    return laterBuildSaveError(saveData);
}
/** The refusal for saveData written by a later release than this page's, or null; this device's save status is not read (loadGame). */
function laterBuildSaveError(saveData) {
    const saved = gameBuildTime(saveData?.saveMeta?.gameBuild), running = gameBuildTime(RUNNING_GAME_BUILD);
    if (!running || !saved || saved <= running) return null;
    return outdatedBuildRefusal(`이 저장은 더 새 버전의 게임(${formatCloudTime(saved)} 판)에서 저장됐습니다. 새로고침하거나 앱을 업데이트한 뒤 이어 하세요.`);
}
function outdatedBuildRefusal(message) {
    return Object.assign(new Error(message), { code: OUTDATED_BUILD_ERROR_CODE });
}
/** Throws outdatedBuildError(saveData) when there is one. */
function assertSaveFromKnownBuild(saveData) {
    const refusal = outdatedBuildError(saveData);
    if (refusal) throw refusal;
}

function canPersistLocalSave(options = {}) {
    // A save from a later release is never written over, not even to repair it from the server (applyExternalSave).
    const recovery = options.allowRecoveryWrite === true && localSaveRuntimeState.status !== 'newer-build';
    return (localSaveRuntimeState.writable !== false || recovery) && !(game && game.isBackgroundCalculation)
        && !(typeof backgroundCombatRuntime !== 'undefined' && (backgroundCombatRuntime.processing || backgroundCombatRuntime.failed));
}

function readLocalSaveResult() {
    try {
        let save = localStorage.getItem(saveSlot.key);
        if (save) return { status: 'ok', save, sourceKey: saveSlot.key };
        for (const key of saveSlot.kind === 'guest' ? getLegacySaveKeys() : []) {
            save = localStorage.getItem(key);
            if (save) return { status: 'ok', save, sourceKey: key };
        }
        return { status: 'missing', save: null, sourceKey: null };
    } catch (error) {
        return { status: 'unavailable', save: null, sourceKey: null, error };
    }
}

/** Guest saves under an earlier key name (LEGACY_SAVE_KEY_PATTERN), the newest key version first. The next save writes LOCAL_SAVE_KEY. */
function getLegacySaveKeys() {
    return Object.keys(localStorage).map(key => [key, LEGACY_SAVE_KEY_PATTERN.exec(key)]).filter(([, match]) => match)
        .sort((a, b) => Number(b[1][1]) - Number(a[1][1])).map(([key]) => key);
}

function readLocalSaveString() {
    let result = readLocalSaveResult();
    if (result.status === 'unavailable') throw result.error;
    return result.save;
}

/** Where the active slot's corrupt copies go: its key plus _corrupt_ and the time. */
function corruptSaveBackupPrefix() {
    return `${saveSlot.key}_corrupt_`;
}
/** The active slot's corrupt save backups, newest first. */
function corruptSaveBackupKeys() {
    const prefix = corruptSaveBackupPrefix();
    return Object.keys(localStorage).filter(key => key.startsWith(prefix))
        .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
}
/** Keeps a copy of a save that failed to load. The same corrupt save is kept once, and only the two newest copies stay (2026-10-26:
 * every page load with the corrupt save still in place wrote another full copy, until the storage quota was used up). */
function preserveCorruptLocalSave(rawSave) {
    if (!rawSave) return null;
    try {
        const kept = corruptSaveBackupKeys();
        const same = kept.find(key => localStorage.getItem(key) === rawSave);
        if (same) return same;
        kept.slice(1).forEach(key => localStorage.removeItem(key));
        let backupKey = `${corruptSaveBackupPrefix()}${Date.now()}`;
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
    if (typeof game.saveMeta.cloudUserId !== 'string' || !game.saveMeta.cloudUserId.trim()) {
        game.saveMeta.cloudUserId = null;
    }
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(game.saveMeta.cloudRevision) || 0));
    // cloudPending: an account slot has been written since its last commit to the server (the next account entry uploads it first).
    game.saveMeta.cloudPending = game.saveMeta.cloudPending === true;
}

/** Persist a fresh save atomically before removing legacy copies; unrelated browser data stays intact. */
function resetLocalSave(snapshot) {
    localStorage.setItem(saveSlot.key, serializeSaveState(snapshot));
    // Once the canonical save exists, legacy copies are never selected by loadGame().
    try {
        // This slot's corrupt backups, and for the guest slot its earlier key names (with their corrupt backups).
        let earlier = /^[a-z]{3}IdleSaveData_/i;
        Object.keys(localStorage).filter(key => key !== saveSlot.key && (key.startsWith(corruptSaveBackupPrefix()) || (saveSlot.kind === 'guest' && earlier.test(key))))
            .forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('새 진행은 저장했지만 이전 세이브 사본 정리에 실패했습니다:', error);
    }
}

function refreshItemIdCounter() {
    // Every owned or pending item reserves its id.
    const rift = game.timeRift || {};
    const presets = ((game.equipmentLoadouts || {}).presets || []).filter(Boolean)
        .flatMap(preset => Object.values(preset.slots || {}));
    const items = [game.inventory, Object.values(game.equipment || {}), rift.altarUnique, rift.altarRare,
        game.equipmentTemporaryStorage, presets,
        actExplorationLoot.reservedItems(game), actExplorationState.groundLoot.reservedItems(game), coreItems.ownedItems(game), (game.playerStall?.listings || []).map(row => row.item)].flat().filter(Boolean);
    const jewels=[game.jewelInventory,items.flatMap(item=>equipmentSockets.jewels(item).map(row=>row.jewel))].flat().filter(Boolean);
    itemIdCounter = Math.max(0, ...items.concat(jewels).map(item => item.id || 0));
}

/** Fields of game that live only while the game runs: the talent card runtime and the last combat tick's stat sheet and time
 * (about a tenth of a save, and stale after a load). Never saved or uploaded; old saves drop them on load (mergeDefaults). */
const RUNTIME_ONLY_SAVE_KEYS = Object.freeze(['talentCardRuntime', 'lastCombatStats', 'lastCombatStatsAt']);
function dropRuntimeOnlySaveFields(target) {
    RUNTIME_ONLY_SAVE_KEYS.forEach(key => delete target[key]);
}

function createSaveSnapshot(sourceGame) {
    let snapshot = JSON.parse(JSON.stringify(sourceGame || game || {}));
    snapshot.craftingWorkspace = craftingWorkspaceState.normalize(snapshot.craftingWorkspace, snapshot.currencies);
    snapshot.actExploration = actExplorationRooms.seal(snapshot.actExploration);
    dropRuntimeOnlySaveFields(snapshot);
    if (!snapshot.saveMeta || typeof snapshot.saveMeta !== 'object') snapshot.saveMeta = {};
    return snapshot;
}

function serializeSaveState(sourceGame) {
    // 로컬 저장은 직렬화된 문자열만 필요하다. 깊은 복제 후 다시 문자열화하면 큰 인벤토리에서
    // 같은 상태를 두 번 순회하고 대량의 임시 객체를 만들어 주기적인 GC 끊김을 유발한다.
    let root = sourceGame || game || {};
    let serializable = root && typeof root === 'object' ? { ...root } : {};
    serializable.craftingWorkspace = craftingWorkspaceState.normalize(root.craftingWorkspace, root.currencies);
    serializable.actExploration = actExplorationRooms.seal(root.actExploration);   // 방 단위 탐험: 앞선 판이 탐험만 버리고 읽는 모양으로
    dropRuntimeOnlySaveFields(serializable);
    return JSON.stringify(serializable);
}

function createCloudSavePayload(sourceGame) {
    return createSaveSnapshot(createCloudSaveState(sourceGame || game || {}));
}

function createCloudSaveState(root) {
    // Persistent exploration resumes its exact enemies, casts and debuffs on every device.
    // A shallow projection avoids copying the full roster on every cloud save.
    if(root.actExploration)return {...root,combatLog:[],battlefieldEnemySprites:{},dotFxThrottle:{}};
    // 최상위만 얕게 복사하고 런타임 필드를 덮어쓴 뒤 한 번만 문자열화한다.
    // 중첩 인벤토리/장비를 깊은 복제하지 않으므로 클라우드 자동 저장 순간의 GC 부하도 줄어든다.
    let payload = {
        ...root,
        saveMeta: root.saveMeta && typeof root.saveMeta === 'object' ? root.saveMeta : {},
        enemies: [],
        encounterPlan: [],
        encounterIndex: Math.max(0, Math.floor(Number(root.encounterIndex) || 0)),
        nextEnemyId: Math.max(1, Math.floor(Number(root.nextEnemyId) || 1)),
        combatLog: [],
        recentDamageEvents: [],
        pendingSlamEchoHits: [],
        dotFxThrottle: {},
        battlefieldEnemySprites: {},
        enemyConditionDebuffs: {},
        enemyKeystoneDebuffs: {},
        rangerWeakpointMarks: {},
        enemyUniqueChaosResDown: {},
        enemyUniqueElementalResDown: {},
        playerAilments: Array.isArray(root.playerAilments) ? root.playerAilments.slice(0, 40) : [],
        playerLeechInstances: Array.isArray(root.playerLeechInstances) ? root.playerLeechInstances.slice(0, 80) : [],
        realmDeathWard: null,
        realmInvulnerableBarrierUntil: 0
    };
    dropRuntimeOnlySaveFields(payload);
    return payload;
}

/** The everyday cloud sync's save data, in the shape of the local save and the leaving upload (serializeSaveState, createSaveSnapshot):
 * the workbench tidied, a room stage run sealed (this body alone skipped both, 2026-10-20) and the runtime-only fields dropped. The
 * "nothing changed" check compares prints of this shape (js/ui.js isCloudSaveUnchangedSinceUpload). */
function createCloudSyncPayload(sourceGame) {
    const payload=createCloudSaveState(sourceGame || game || {});
    payload.craftingWorkspace = craftingWorkspaceState.normalize(payload.craftingWorkspace, payload.currencies);
    payload.actExploration = actExplorationRooms.seal(payload.actExploration);
    dropRuntimeOnlySaveFields(payload);
    return payload;
}
function createCloudSaveRequestBody(userId, sourceGame) {
    return JSON.stringify({ user_id: userId, save_data: createCloudSyncPayload(sourceGame) });
}

/** Content print of a cloud save without what moves while nothing happens: saveMeta (save times), the stall clock
 * (playerStall.lastAt) and talentCardRuntime (never uploaded). Equal prints mean an upload would change nothing. */
function cloudSaveFingerprint(saveData) {
    const stall = saveData.playerStall && typeof saveData.playerStall === 'object' ? { ...saveData.playerStall, lastAt: 0 } : saveData.playerStall;
    const text = JSON.stringify({ ...saveData, saveMeta: null, talentCardRuntime: undefined, playerStall: stall });
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    return `${text.length}:${hash >>> 0}`;
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

/** The latest device time this save has seen. Moving the clock forward and back leaves it ahead of now, while lastModifiedAt is
 * overwritten by the next save; the guest save check (js/guest-save-check.js) reads it before a guest save moves into an account. */
function noteSaveClock(meta) {
    meta.maxSeenAt = Math.max(Number(meta.maxSeenAt) || 0, Date.now());
}

/** A save's modified time: now, or while a hidden page or a paused app holds the game still (js/main.js runForegroundCombat) the time
 * play stopped (backgroundCombatRuntime.hiddenAtMs), so a tab closed while hidden (or dropped by the browser) settles its hidden
 * hours at the next launch instead of losing them. */
function getSaveModifiedAt() {
    const now = Date.now();
    if (typeof backgroundCombatRuntime === 'undefined' || typeof document === 'undefined') return now;
    const still = document.hidden || backgroundCombatRuntime.appInactive;
    const at = Math.floor(Number(backgroundCombatRuntime.hiddenAtMs) || 0);
    return still && at > 0 ? Math.min(at, now) : now;
}

/** A write that carries a change: the save's modified time, and in an account slot the pending mark (cleared by the commit that
 * carries the change, js/ui.js rememberCloudCommit). */
function touchSaveMeta() {
    game.saveMeta.lastModifiedAt = getSaveModifiedAt();
    if (saveSlot.kind === 'account') game.saveMeta.cloudPending = true;
}

function persistLocalSave(options = {}) {
    if (!canPersistLocalSave(options)) return false;
    ensureSaveMeta();
    noteSaveClock(game.saveMeta);
    stampGameBuild(game.saveMeta);
    if (options.touchModifiedAt !== false) touchSaveMeta();
    try {
        localStorage.setItem(saveSlot.key, serializeSaveState(game));
    } catch (error) {
        try {
            let sanitized = sanitizeForSave(game || {});
            if (!sanitized.saveMeta || typeof sanitized.saveMeta !== 'object') sanitized.saveMeta = {};
            delete sanitized.talentCardRuntime;
            localStorage.setItem(saveSlot.key, JSON.stringify(sanitized));
            if (typeof addLog === 'function') addLog('💾 저장 데이터 정리 후 로컬 저장을 복구했습니다.', 'season-up');
        } catch (retryError) {
            console.error('local save failed:', error, retryError);
            let isQuota = retryError && (retryError.name === 'QuotaExceededError' || /quota|storage/i.test(String(retryError.message || '')));
            setLocalSaveRuntimeState('write-failed', {
                writable: false,
                message: isQuota ? '브라우저 저장공간이 부족합니다. 공간을 확보한 뒤 설정의 지금 저장을 눌러 주세요.' : '기기 저장에 실패했습니다. 설정의 지금 저장으로 다시 시도해 주세요.'
            });
            if (typeof addLog === 'function') addLog(isQuota ? '⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요.' : '⚠️ 로컬 저장 실패: 저장 데이터 형식 오류가 발생했습니다.', 'loot-rare');
            return false;
        }
    }
    setLocalSaveRuntimeState('ok', { writable: true, sourceKey: saveSlot.key });
    refreshItemIdCounter();
    return true;
}


/** Recover an empty ordinary encounter, without restarting a completed sky allowance. */
function resumeEmptyEncounterAfterLoad(zone) {
    if (game.actExploration || game.settings.mapCompleteAction === 'stop' || isSkyTowerAtRewardLimit(zone)) return;
    if (game.enemies.length === 0 && game.encounterPlan.length === 0) game.combatHalted = false;
}
function normalizeLocalRuntimeAfterLoad() {
    if (!game) return;
    if (typeof normalizeCombatTacticsSettings === 'function') {
        let tactics = normalizeCombatTacticsSettings(game.settings);
        game.settings.combatTargetPriority = tactics.targetPriority;
        game.settings.combatPositionMode = tactics.positionMode;
    }
    let zone = (typeof getZone === 'function') ? getZone(game.currentZoneId) : null;
    if (!zone && typeof getAutoProgressZoneId === 'function') {
        game.currentZoneId = getAutoProgressZoneId(Math.max(0, Math.floor(game.maxZoneId || 0)));
    }
    // loadGame supplies cloneDefaultGame or mergeDefaults; both own these array shapes.
    if (!Number.isFinite(game.moveTimer)) game.moveTimer = 0;
    resumeEmptyEncounterAfterLoad(zone);
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
            const saved = JSON.parse(result.save), refusal = laterBuildSaveError(saved);
            if (refusal) {
                // A later release's save stays as it is for that release: this page starts empty and writes nothing (canPersistLocalSave).
                setLocalSaveRuntimeState('newer-build', { writable: false, sourceKey: result.sourceKey, message: refusal.message });
                game = cloneDefaultGame();
            } else {
                game = mergeDefaults(saved);
                setLocalSaveRuntimeState('ok', { writable: true, sourceKey: result.sourceKey });
            }
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

/** The boot's load (js/main.js init): the one-time move of an account save out of the guest slot, then the guest slot. */
function loadGameAtBoot() {
    migrateOwnedGuestSave();
    return loadGame();
}

function saveGame(options = {}) {
    let manual = !!options.manual;
    // Only a known write failure may be retried. Unread/corrupt saves and ongoing
    // settlements must stay protected even when the player presses Save.
    let allowRecoveryWrite = manual && localSaveRuntimeState.status === 'write-failed';
    let persisted = persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false, allowRecoveryWrite });
    if (!persisted) {
        if (manual) setCloudMessage(localSaveRuntimeState.message || '로컬 저장이 차단되어 저장하지 못했습니다.');
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
    if (!canPersistLocalSave()) return;
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


safeExposeGlobals({ readLocalSaveString, readLocalSaveResult, getLocalSaveStatus, canPersistLocalSave, ensureSaveMeta, resetLocalSave, createSaveSnapshot, serializeSaveState, createCloudSavePayload, createCloudSaveRequestBody, persistLocalSave, loadGame, loadGameAtBoot, saveGame, queueImportantSave, formatCloudTime, setCloudMessage, selectSaveSlot, getSaveSlot, accountSaveKey, readGuestSave, removeGuestSave, migrateOwnedGuestSave });
