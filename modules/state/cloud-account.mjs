/** Transient account state. It is never serialized into a character save. */
export class CloudAccountState {
    constructor() {
        this.active = true;
        this.current = {
            initialized: false, configured: false, busy: false, session: null, user: null,
            linkedProviders: [], isLoaded: false, lastMessage: '설정 전', lastRemoteUpdatedAt: 0,
            lastRemoteRevision: 0, revisionSupported: null, lastSyncAttemptAt: 0,
            syncHalted: false, uploadFailureNoticed: false, tokenRefreshPromise: null,
            sessionEpoch: 0, tokenExpiryWarned: false, pendingForcedSyncOptions: null,
            pendingForcedSyncRetryTimer: null, exitUpload: null
        };
    }

    userId() {
        const id = this.current.user && this.current.user.id;
        return typeof id === 'string' && id.trim() ? id : null;
    }

    isCurrentSession(session, epoch) {
        return this.active && this.current.session === session && this.current.sessionEpoch === epoch;
    }

    isCurrentAccount(userId, epoch) {
        return this.active && this.userId() === userId && this.current.sessionEpoch === epoch;
    }

    /** Every adopted token supersedes a pending refresh; only an account change invalidates save operations. */
    resetForSession(session) {
        const nextId = session?.access_token ? session.user?.id || this.userId() : null;
        this.current.tokenRefreshPromise = null;
        if (this.userId() === nextId) return false;
        this.current.sessionEpoch++;
        this.current.busy = false;
        this.current.lastRemoteRevision = 0;
        this.current.syncHalted = false;
        this.current.uploadFailureNoticed = false;
        this.current.lastUploadedFingerprint = null;
        this.current.pendingForcedSyncOptions = null;
        return true;
    }

    clearSession() {
        this.current.session = null;
        this.current.user = null;
        this.current.isLoaded = false;
    }

    adoptSession(session, nowMs) {
        let expiresAt = Number(session.expires_at) || 0;
        if (!expiresAt && Number(session.expires_in) > 0) expiresAt = Math.floor(nowMs / 1000) + Math.floor(Number(session.expires_in));
        this.current.session = {
            access_token: session.access_token,
            refresh_token: session.refresh_token || (this.current.session && this.current.session.refresh_token) || '',
            expires_at: expiresAt,
            token_type: session.token_type || 'bearer',
            user: session.user || this.current.user || null
        };
        this.current.user = this.current.session.user;
        this.current.isLoaded = false;
        this.current.tokenExpiryWarned = false;
    }

    dispose() {
        if (!this.active) return;
        this.active = false;
        this.current.sessionEpoch++;
        this.current.tokenRefreshPromise = null;
    }
}
