import * as values from './save-values.mjs';

/** Browser storage boundary. Keeps each account, guest save and corrupt backup in its own slot. */
export class LocalSaveSlots {
    constructor(deps, codec) {
        this.deps = deps; this.codec = codec;
        this.slot = { kind: 'guest', key: deps.LOCAL_SAVE_KEY, userId: null };
        this.runtime = { status: 'uninitialized', writable: true, sourceKey: null, backupKey: null, message: '' };
        this.runningBuild = deps.runningBuild;
    }

    accountSaveKey(userId) {
        return `${this.deps.ACCOUNT_SAVE_KEY_PREFIX}${userId}`;
    }

    /** Makes an account's slot (userId) or the guest slot (null) the one loadGame and persistLocalSave use. */
    selectSaveSlot(userId) {
        this.slot.kind = userId ? 'account' : 'guest';
        this.slot.userId = userId || null;
        this.slot.key = userId ? this.accountSaveKey(userId) : this.deps.LOCAL_SAVE_KEY;
    }

    getSaveSlot() {
        return { ...this.slot };
    }

    /** The guest slot's save as parsed data, whichever slot is active; null when there is none or it cannot be read. */
    readGuestSave() {
        try {
            const raw = this.deps.localStorage.getItem(this.deps.LOCAL_SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            this.deps.console.warn('guest save could not be read:', error);
            return null;
        }
    }

    /** An account's copy on this device (its slot) as parsed data, whichever slot is active; null when there is none or it cannot be read.
 * The login screen shows it for a signed-in account before the account is entered (js/startup-screen-ui.js startupShownSave). */
    readAccountSaveCopy(userId) {
        try {
            const raw = userId ? this.deps.localStorage.getItem(this.accountSaveKey(userId)) : null;
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            this.deps.console.warn('account save copy could not be read:', error);
            return null;
        }
    }

    /** Whether some account's copy is on this device. The login screen says so over an empty guest slot (js/startup-screen-ui.js startupEmptyText), since
 * a signed-out player whose session ended, or whose pre-slot save moved out of the guest slot at boot (migrateOwnedGuestSave), otherwise
 * reads "저장된 모험이 없습니다" and takes the save for lost (2026-11-08). */
    hasAccountSaveCopy() {
        try {
            return Object.keys(this.deps.localStorage).some(key => key.startsWith(this.deps.ACCOUNT_SAVE_KEY_PREFIX) && !key.includes('_corrupt_'));
        } catch (error) {
            this.deps.console.warn('account save copies could not be listed:', error);
            return false;
        }
    }

    /** Removes the guest save (after it moved into an account), with its earlier key names and corrupt copies. */
    removeGuestSave() {
        const earlier = /^[a-z]{3}IdleSaveData_/i;
        Object.keys(this.deps.localStorage).filter(key => key === this.deps.LOCAL_SAVE_KEY || earlier.test(key) || key.startsWith(`${this.deps.LOCAL_SAVE_KEY}_corrupt_`))
            .forEach(key => this.deps.localStorage.removeItem(key));
    }

    /** Before the slots (2026-10-30) one key held whichever save was last played, so the guest slot may hold an account's save
 * (saveMeta.cloudUserId). Once, at boot: it moves into that account's slot (unless that slot already exists) and the guest slot
 * empties, so an account save never shows up as a guest save (which could be moved into another account). Returns the moved key or null. */
    migrateOwnedGuestSave() {
        try {
            const raw = this.deps.localStorage.getItem(this.deps.LOCAL_SAVE_KEY);
            const owner = raw ? JSON.parse(raw)?.saveMeta?.cloudUserId : null;
            if (typeof owner !== 'string' || !owner.trim()) return null;
            const key = this.accountSaveKey(owner);
            if (!this.deps.localStorage.getItem(key)) this.deps.localStorage.setItem(key, raw);
            this.deps.localStorage.removeItem(this.deps.LOCAL_SAVE_KEY);
            return key;
        } catch (error) {
            this.deps.console.warn('owned guest save migration skipped:', error);
            return null;
        }
    }

    setLocalSaveRuntimeState(status, options = {}) {
        this.runtime.status = status;
        this.runtime.writable = options.writable !== false;
        this.runtime.sourceKey = options.sourceKey || null;
        this.runtime.backupKey = options.backupKey || null;
        this.runtime.message = options.message || '';
    }

    getLocalSaveStatus() {
        return { ...this.runtime };
    }

    /** Why this page must not take saveData (a device or cloud save) in, or null when it may: a later release wrote it, and may have
 * reshaped it or added things this release does not know, which loading here would drop and the next write would carry back
 * (2026-10-28: a store app trails the web by days). Everything is refused while this device's own save is from a later release
 * (loadGame 'newer-build'). The error's code is OUTDATED_BUILD_ERROR_CODE. */
    outdatedBuildError(saveData) {
        if (this.runtime.status === 'newer-build') return values.outdatedBuildRefusal(this.runtime.message);
        return this.laterBuildSaveError(saveData);
    }

    /** The refusal for saveData written by a later release than this page's, or null; this device's save status is not read (loadGame). */
    laterBuildSaveError(saveData) {
        const saved = values.gameBuildTime(saveData?.saveMeta?.gameBuild), running = values.gameBuildTime(this.runningBuild);
        if (!running || !saved || saved <= running) return null;
        return values.outdatedBuildRefusal(`이 저장은 더 새 버전의 게임(${(0, this.deps.formatCloudTime)(saved)} 판)에서 저장됐습니다. 새로고침하거나 앱을 업데이트한 뒤 이어 하세요.`);
    }

    /** Throws outdatedBuildError(saveData) when there is one. */
    assertSaveFromKnownBuild(saveData) {
        const refusal = this.outdatedBuildError(saveData);
        if (refusal) throw refusal;
    }

    readLocalSaveResult() {
        try {
            let save = this.deps.localStorage.getItem(this.slot.key);
            if (save) return { status: 'ok', save, sourceKey: this.slot.key };
            for (const key of this.slot.kind === 'guest' ? this.getLegacySaveKeys() : []) {
                save = this.deps.localStorage.getItem(key);
                if (save) return { status: 'ok', save, sourceKey: key };
            }
            return { status: 'missing', save: null, sourceKey: null };
        } catch (error) {
            return { status: 'unavailable', save: null, sourceKey: null, error };
        }
    }

    /** Guest saves under an earlier key name (LEGACY_SAVE_KEY_PATTERN), the newest key version first. The next save writes LOCAL_SAVE_KEY. */
    getLegacySaveKeys() {
        return Object.keys(this.deps.localStorage).map(key => [key, this.deps.LEGACY_SAVE_KEY_PATTERN.exec(key)]).filter(([, match]) => match)
            .sort((a, b) => Number(b[1][1]) - Number(a[1][1])).map(([key]) => key);
    }

    readLocalSaveString() {
        let result = this.readLocalSaveResult();
        if (result.status === 'unavailable') throw result.error;
        return result.save;
    }

    /** Where the active slot's corrupt copies go: its key plus _corrupt_ and the time. */
    corruptSaveBackupPrefix() {
        return `${this.slot.key}_corrupt_`;
    }

    /** The active slot's corrupt save backups, newest first. */
    corruptSaveBackupKeys() {
        const prefix = this.corruptSaveBackupPrefix();
        return Object.keys(this.deps.localStorage).filter(key => key.startsWith(prefix))
            .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
    }

    /** Keeps a copy of a save that failed to load. The same corrupt save is kept once, and only the two newest copies stay (2026-10-26:
 * every page load with the corrupt save still in place wrote another full copy, until the storage quota was used up). */
    preserveCorruptLocalSave(rawSave) {
        if (!rawSave) return null;
        try {
            const kept = this.corruptSaveBackupKeys();
            const same = kept.find(key => this.deps.localStorage.getItem(key) === rawSave);
            if (same) return same;
            kept.slice(1).forEach(key => this.deps.localStorage.removeItem(key));
            let backupKey = `${this.corruptSaveBackupPrefix()}${Date.now()}`;
            this.deps.localStorage.setItem(backupKey, rawSave);
            return backupKey;
        } catch (error) {
            this.deps.console.error('failed to preserve corrupt local save:', error);
            return null;
        }
    }

    /** Persist a fresh save atomically before removing legacy copies; unrelated browser data stays intact. */
    resetLocalSave(snapshot) {
        this.deps.localStorage.setItem(this.slot.key, this.codec.serializeSaveState(snapshot));
        // Once the canonical save exists, legacy copies are never selected by loadGame().
        try {
        // This slot's corrupt backups, and for the guest slot its earlier key names (with their corrupt backups).
            let earlier = /^[a-z]{3}IdleSaveData_/i;
            Object.keys(this.deps.localStorage).filter(key => key !== this.slot.key && (key.startsWith(this.corruptSaveBackupPrefix()) || (this.slot.kind === 'guest' && earlier.test(key))))
                .forEach(key => this.deps.localStorage.removeItem(key));
        } catch (error) {
            this.deps.console.warn('새 진행은 저장했지만 이전 세이브 사본 정리에 실패했습니다:', error);
        }
    }

    /** Every save a release writes names that release, so an older release can tell it apart (outdatedBuildError). */
    stampGameBuild(meta) {
        if (this.runningBuild) meta.gameBuild = this.runningBuild;
    }
}
