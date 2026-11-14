import * as values from '../persistence/save-values.mjs';

/** Orchestrates save/load, combat normalization and existing UI/cloud effects. No account credentials are stored here. */
export class GameSave {
    constructor(owner, slots, codec, deps) {
        this.owner = owner; this.slots = slots; this.codec = codec; this.deps = deps;
        this.importantSaveTimer = null;
        this.disposed = false;
    }

    canPersistLocalSave(options = {}) {
        if (this.disposed) return false;
    // A save from a later release is never written over, not even to repair it from the server (applyExternalSave).
        const recovery = options.allowRecoveryWrite === true && this.slots.runtime.status !== 'newer-build';
        return (this.slots.runtime.writable !== false || recovery) && !(0, this.deps.isTransientGameState)(this.owner.game)
        && !(typeof this.deps.backgroundCombatRuntime !== 'undefined' && (this.deps.backgroundCombatRuntime.processing || this.deps.backgroundCombatRuntime.failed));
    }

    ensureSaveMeta(owner = this.owner.game) {
        if (!owner.saveMeta || typeof owner.saveMeta !== 'object') owner.saveMeta = JSON.parse(JSON.stringify(this.owner.defaultGame.saveMeta));
        const meta = owner.saveMeta;
        if (!Number.isFinite(meta.lastModifiedAt)) meta.lastModifiedAt = 0;
        // A save from before 2026-11-10 has one stamp for both times.
        if (!(meta.playedUntil > 0)) meta.playedUntil = meta.lastModifiedAt;
        if (!Number.isFinite(meta.lastCloudSyncAt)) meta.lastCloudSyncAt = 0;
        this.repairCloudSaveMetadata(meta);
    }

    repairCloudSaveMetadata(meta) {
        if (!meta.lastCloudUploadProfile || typeof meta.lastCloudUploadProfile !== 'object') {
            meta.lastCloudUploadProfile = null;
        }
        if (typeof meta.cloudUserId !== 'string' || !meta.cloudUserId.trim()) {
            meta.cloudUserId = null;
        }
        meta.cloudRevision = Math.max(0, Math.floor(Number(meta.cloudRevision) || 0));
        // cloudPending: an account slot has been written since its last commit to the server (the next account entry uploads it first).
        meta.cloudPending = meta.cloudPending === true;
    }

    refreshItemIdCounter() {
    // Every owned or pending item reserves its id.
        const rift = this.owner.game.timeRift || {};
        const presets = ((this.owner.game.equipmentLoadouts || {}).presets || []).filter(Boolean)
            .flatMap(preset => Object.values(preset.slots || {}));
        const items = [this.owner.game.inventory, Object.values(this.owner.game.equipment || {}), rift.altarUnique, rift.altarRare,
            this.owner.game.equipmentTemporaryStorage, presets,
            this.deps.actExplorationLoot.reservedItems(this.owner.game), this.deps.actExplorationState.groundLoot.reservedItems(this.owner.game), this.deps.coreItems.ownedItems(this.owner.game), (this.owner.game.playerStall?.listings || []).map(row => row.item)].flat().filter(Boolean);
        const jewels=[this.owner.game.jewelInventory,items.flatMap(item=>this.deps.equipmentSockets.jewels(item).map(row=>row.jewel))].flat().filter(Boolean);
        this.owner.session.itemIdCounter = Math.max(0, ...items.concat(jewels).map(item => item.id || 0));
    }

    /** The latest device time this save has seen. Moving the clock forward and back leaves it ahead of now, while lastModifiedAt is
 * overwritten by the next save; the guest save check (js/guest-save-check.js) reads it before a guest save moves into an account. */
    noteSaveClock(meta) {
        meta.maxSeenAt = Math.max(Number(meta.maxSeenAt) || 0, Date.now());
    }

    /** The time play is settled up to (saveMeta.playedUntil): now, or while a hidden page or a paused app holds the game still (js/main.js
 * runForegroundCombat) the time play stopped (backgroundCombatRuntime.hiddenAtMs), so a tab closed while hidden (or dropped by the
 * browser) settles its hidden hours at the next launch instead of losing them. */
    getPlayedUntil() {
        const now = Date.now();
        if (typeof this.deps.backgroundCombatRuntime === 'undefined' || typeof this.deps.document === 'undefined') return now;
        const still = this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive;
        const at = Math.floor(Number(this.deps.backgroundCombatRuntime.hiddenAtMs) || 0);
        return still && at > 0 ? Math.min(at, now) : now;
    }

    /** A write that carries a change stamps two times (2026-11-10; one field held both until then, and a save made while entering the
 * game moved the away settlement's start to now, v0.3.57 to v0.3.59): lastModifiedAt, when the save was written, and playedUntil,
 * the time the next launch settles from. playedUntil stays as loaded until the launch has read it (launchSettlementPending).
 * In an account slot the write is also marked pending (cleared by the commit that carries it, js/cloud-save-ui.js rememberCloudCommit). */
    touchSaveMeta() {
        this.owner.game.saveMeta.lastModifiedAt = Date.now();
        if (typeof this.deps.backgroundCombatRuntime === 'undefined' || !this.deps.backgroundCombatRuntime.launchSettlementPending) this.owner.game.saveMeta.playedUntil = this.getPlayedUntil();
        if (this.slots.slot.kind === 'account') this.owner.game.saveMeta.cloudPending = true;
    }

    persistLocalSave(options = {}) {
        if (!this.canPersistLocalSave(options)) return false;
        this.ensureSaveMeta();
        this.noteSaveClock(this.owner.game.saveMeta);
        this.slots.stampGameBuild(this.owner.game.saveMeta);
        if (options.touchModifiedAt !== false) this.touchSaveMeta();
        try {
            this.deps.localStorage.setItem(this.slots.slot.key, this.codec.serializeSaveState(this.owner.game));
        } catch (error) {
            if (!this.recoverLocalSave(error)) return false;
        }
        this.slots.setLocalSaveRuntimeState('ok', { writable: true, sourceKey: this.slots.slot.key });
        this.refreshItemIdCounter();
        return true;
    }

    recoverLocalSave(error) {
        try {
            let sanitized = values.sanitizeForSave(this.owner.game || {});
            if (!sanitized.saveMeta || typeof sanitized.saveMeta !== 'object') sanitized.saveMeta = {};
            delete sanitized.talentCardRuntime;
            this.deps.localStorage.setItem(this.slots.slot.key, JSON.stringify(sanitized));
            if (typeof this.deps.addLog === 'function') (0, this.deps.addLog)((0, this.deps._t)('💾 저장 데이터 정리 후 로컬 저장을 복구했습니다.'), 'season-up');
        } catch (retryError) {
            this.reportLocalSaveFailure(error, retryError);
            return false;
        }
        return true;
    }

    reportLocalSaveFailure(error, retryError) {
        this.deps.console.error('local save failed:', error, retryError);
        let isQuota = retryError && (retryError.name === 'QuotaExceededError' || /quota|storage/i.test(String(retryError.message || '')));
        this.slots.setLocalSaveRuntimeState('write-failed', {
            writable: false,
            message: isQuota ? '브라우저 저장공간이 부족합니다. 공간을 확보한 뒤 설정의 지금 저장을 눌러 주세요.' : '기기 저장에 실패했습니다. 설정의 지금 저장으로 다시 시도해 주세요.'
        });
        if (typeof this.deps.addLog === 'function') (0, this.deps.addLog)(isQuota ? '⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요.' : '⚠️ 로컬 저장 실패: 저장 데이터 형식 오류가 발생했습니다.', 'loot-rare');
    }

    /** Recover an empty ordinary encounter, without restarting a completed sky allowance. */
    resumeEmptyEncounterAfterLoad(zone) {
        if (this.owner.game.actExploration || this.owner.game.settings.mapCompleteAction === 'stop' || (0, this.deps.isSkyTowerAtRewardLimit)(zone)) return;
        if (this.owner.game.enemies.length === 0 && this.owner.game.encounterPlan.length === 0) this.owner.game.combatHalted = false;
    }

    normalizeLocalRuntimeAfterLoad() {
        if (!this.owner.game) return;
        if (typeof this.deps.normalizeCombatTacticsSettings === 'function') {
            let tactics = (0, this.deps.normalizeCombatTacticsSettings)(this.owner.game.settings);
            this.owner.game.settings.combatTargetPriority = tactics.targetPriority;
            this.owner.game.settings.combatPositionMode = tactics.positionMode;
        }
        let zone = (typeof this.deps.getZone === 'function') ? (0, this.deps.getZone)(this.owner.game.currentZoneId) : null;
        if (!zone && typeof this.deps.getAutoProgressZoneId === 'function') {
            this.owner.game.currentZoneId = (0, this.deps.getAutoProgressZoneId)(Math.max(0, Math.floor(this.owner.game.maxZoneId || 0)));
        }
        // loadGame supplies cloneDefaultGame or mergeDefaults; both own these array shapes.
        if (!Number.isFinite(this.owner.game.moveTimer)) this.owner.game.moveTimer = 0;
        this.resumeEmptyEncounterAfterLoad(zone);
        this.restoreRealmProtection();
    }

    restoreRealmProtection() {
        if (!this.owner.game.realmDeathWard || typeof this.owner.game.realmDeathWard !== 'object') this.owner.game.realmDeathWard = null;
        else {
            this.owner.game.realmDeathWard.amount = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.amount) || 0));
            this.owner.game.realmDeathWard.maxAmount = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.maxAmount) || 0));
            this.owner.game.realmDeathWard.readyAt = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.readyAt) || 0));
        }
        this.owner.game.realmInvulnerableBarrierUntil = Math.max(0, Math.floor(Number(this.owner.game.realmInvulnerableBarrierUntil) || 0));
    }

    loadGame() {
        let result = this.slots.readLocalSaveResult();
        if (result.status === 'unavailable') {
            this.deps.console.error('local save storage is unavailable:', result.error);
            this.slots.setLocalSaveRuntimeState('unavailable', {
                writable: false,
                message: '브라우저 저장소에 접근할 수 없어 자동 저장과 클라우드 업로드를 중단했습니다.'
            });
            this.owner.game = (0, this.deps.cloneDefaultGame)();
        } else if (result.status === 'missing') {
            this.slots.setLocalSaveRuntimeState('missing', { writable: true });
            this.owner.game = (0, this.deps.cloneDefaultGame)();
        } else {
            try {
                const saved = JSON.parse(result.save);
                if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid save root: expected an object.');
                const refusal = this.slots.laterBuildSaveError(saved);
                if (refusal) {
                // A later release's save stays as it is for that release: this page starts empty and writes nothing (canPersistLocalSave).
                    this.slots.setLocalSaveRuntimeState('newer-build', { writable: false, sourceKey: result.sourceKey, message: refusal.message });
                    this.owner.game = (0, this.deps.cloneDefaultGame)();
                } else {
                    this.owner.game = (0, this.deps.mergeDefaults)(saved);
                    this.slots.setLocalSaveRuntimeState('ok', { writable: true, sourceKey: result.sourceKey });
                }
            } catch (error) {
                let backupKey = this.slots.preserveCorruptLocalSave(result.save);
                this.deps.console.error('local save is corrupt; automatic writes are blocked:', error);
                this.slots.setLocalSaveRuntimeState('corrupt', {
                    writable: false,
                    sourceKey: result.sourceKey,
                    backupKey,
                    message: backupKey
                        ? `손상된 저장을 ${backupKey}에 보존했으며 자동 저장과 클라우드 업로드를 중단했습니다.`
                        : '저장 데이터가 손상되어 자동 저장과 클라우드 업로드를 중단했습니다.'
                });
                this.owner.game = (0, this.deps.cloneDefaultGame)();
            }
        }
        this.ensureSaveMeta();
        this.normalizeLocalRuntimeAfterLoad();
        this.refreshItemIdCounter();
        return this.slots.getLocalSaveStatus();
    }

    /** The boot's load (js/main.js init): the one-time move of an account save out of the guest slot, then the guest slot. */
    loadGameAtBoot() {
        this.slots.migrateOwnedGuestSave();
        return this.loadGame();
    }

    saveGame(options = {}) {
        let manual = !!options.manual;
        // Only a known write failure may be retried. Unread/corrupt saves and ongoing
        // settlements must stay protected even when the player presses Save.
        let allowRecoveryWrite = manual && this.slots.runtime.status === 'write-failed';
        let persisted = this.persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false, allowRecoveryWrite });
        if (!persisted) {
            if (manual) this.setCloudMessage(this.slots.runtime.message || '로컬 저장이 차단되어 저장하지 못했습니다.');
            return false;
        }
        if (!options.skipCloudSync) this.syncAfterLocalSave(manual);
        (0, this.deps.updateCloudSaveUI)();
        return true;
    }

    syncAfterLocalSave(manual) {
        if (manual && typeof this.deps.syncCloudSave === 'function' && this.deps.cloudState && this.deps.cloudState.configured && this.deps.cloudState.user) {
            (0, this.deps.syncCloudSave)({ automatic: false, force: true, reason: 'manual-save' }).catch(error => {
                if (typeof this.setCloudMessage === 'function') this.setCloudMessage('수동 저장 클라우드 업로드 실패: ' + (error && error.message ? error.message : error));
            });
        } else (0, this.deps.scheduleCloudAutoSync)();
    }

    queueImportantSave(delayMs) {
        if (this.disposed) return;
        if (!this.canPersistLocalSave()) return;
        if (typeof this.deps.isStartupOverlayOpen === 'function' && (0, this.deps.isStartupOverlayOpen)()) return;
        let delay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 350);
        if (this.importantSaveTimer) (0, this.deps.clearTimeout)(this.importantSaveTimer);
        this.importantSaveTimer = (0, this.deps.setTimeout)(() => {
            this.importantSaveTimer = null;
            if (typeof this.deps.isStartupOverlayOpen === 'function' && (0, this.deps.isStartupOverlayOpen)()) return;
            this.saveGame({ skipCloudSync: true });
        }, delay);
    }

    setCloudMessage(message) {
        this.deps.cloudState.lastMessage = message;
        (0, this.deps.updateCloudSaveUI)();
    }

    /** Terminal shutdown must cancel delayed writes before another tab can claim the save. */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        if (this.importantSaveTimer !== null) (0, this.deps.clearTimeout)(this.importantSaveTimer);
        this.importantSaveTimer = null;
    }
}
