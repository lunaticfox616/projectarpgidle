import { summarizeCloudRow, readCloudTimestamp, readLoopNumber, isUnplayedSave, revisionConflictError } from '../persistence/cloud-save-values.mjs';
const CLOUD_SAVE_SUMMARY_FIELDS = 'season:save_data->season,loopCount:save_data->loopCount,saveMeta:save_data->saveMeta';

export class CloudSaveRepository {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links;  }

    async fetchLatestCloudSaveRow(userId, select) {
        let rows = await this.links.requests.request(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}&order=updated_at.desc.nullslast&limit=1`, {
            expectedUserId: userId, headers: { Accept: 'application/json' }
        });
        if (Array.isArray(rows) && rows[0]) return rows[0];
        let fallback = await this.links.requests.request(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}`, {
            expectedUserId: userId, headers: { Accept: 'application/json' }
        });
        return (Array.isArray(fallback) ? fallback : []).filter(Boolean).sort((a, b) => {
            let at = a.updated_at ? (new Date(a.updated_at).getTime() || 0) : 0;
            let bt = b.updated_at ? (new Date(b.updated_at).getTime() || 0) : 0;
            return bt - at;
        })[0] || null;
    }

    /** What every server read leaves behind: revision and update time, for the account entry, the hall and the cloud panel. */
    rememberCloudRecord(record) {
        this.account.current.isLoaded = true;
        this.account.current.revisionSupported = true;
        this.account.current.lastRemoteCheckedAt = Date.now();
        if (record && record.updated_at) this.account.current.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
        this.account.current.lastRemoteRevision = record ? Math.max(0, Math.floor(Number(record.revision) || 0)) : 0;
        (0, this.deps.updateCloudSaveUI)();
        return record;
    }

    /** A summary row as a record whose save_data holds only season, loopCount and saveMeta. A full row passes through. */
    cloudSummaryRecord(row) { return summarizeCloudRow(row); }

    /** The entry check's read: a few hundred bytes instead of the whole save. An odd row (no summary fields) reads the full save. */
    async fetchCloudSaveSummary() {
        if (!this.account.current.user || !this.account.current.user.id) throw new Error('로그인이 필요합니다.');
        const context = this.links.runtime.captureCloudSaveContext();
        let row = await this.fetchLatestCloudSaveRow(context.userId, `user_id,updated_at,revision,${CLOUD_SAVE_SUMMARY_FIELDS}`);
        this.links.runtime.assertCloudSaveContext(context);
        let record = this.cloudSummaryRecord(row);
        if (row && !record.save_data) return await this.fetchCloudSaveRecord();
        return this.rememberCloudRecord(record);
    }

    async fetchCloudSaveRecord() {
        if (!this.account.current.user || !this.account.current.user.id) throw new Error('로그인이 필요합니다.');
        const context = this.links.runtime.captureCloudSaveContext();
        try {
            const record = await this.fetchLatestCloudSaveRow(context.userId, 'user_id,save_data,updated_at,revision');
            this.links.runtime.assertCloudSaveContext(context);
            return this.rememberCloudRecord(record);
        } catch (error) {
            this.links.runtime.assertCloudSaveContext(context);
            this.account.current.isLoaded = false;
            (0, this.deps.updateCloudSaveUI)();
            throw error;
        }
    }

    getRemoteSaveStamp(record) { return readCloudTimestamp(record); }

    getSaveLoopNumber(snapshot) { return readLoopNumber(snapshot); }

    /** A save nobody has played yet (a fresh default): the guest save moves into an account only over such a save. */
    isLikelyBootstrapLocalSave(snapshot) { return isUnplayedSave(snapshot || this.deps.game, this.deps.defaultGame); }

    /** The summary decided to pull: read the whole save once (a summary is never applied). */
    async readFullCloudSaveForPull() {
        let record = await this.fetchCloudSaveRecord();
        if (!record || !record.save_data) throw new Error('서버 저장을 다시 읽지 못해 불러오기를 멈췄습니다. 잠시 뒤 다시 확인합니다.');
        return record;
    }

    /** The server save moved past this device's copy (another device committed): nothing from here goes up until the account is entered again. */
    cloudRevisionConflictError() { return revisionConflictError(); }

    /** One commit (db/cloud-and-playtest.sql commit_cloud_save): the server takes the save only at the revision this copy was taken from. */
    async commitCloudSavePayload(payload, options = {}) {
        const context = this.links.runtime.captureCloudSaveContext();
        let rows = await this.links.requests.request('/rest/v1/rpc/commit_cloud_save', {
            method: 'POST',
            expectedUserId: options.expectedUserId,
            headers: { 'Content-Type': 'application/json' },
            body: { expected_revision: options.expectedRevision ?? this.links.runtime.getLocalCloudRevision(), next_save_data: payload }
        });
        this.links.runtime.assertCloudSaveContext(context);
        let result = Array.isArray(rows) ? rows[0] : rows;
        if (!result || result.committed !== true) {
            this.account.current.lastRemoteRevision = Math.max(0, Math.floor(Number(result && result.current_revision) || 0));
            throw this.cloudRevisionConflictError();
        }
        this.account.current.revisionSupported = true;
        return {
            revision: Math.max(0, Math.floor(Number(result.current_revision) || 0)),
            updated_at: result.saved_at || new Date().toISOString()
        };
    }
}
