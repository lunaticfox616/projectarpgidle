/** Owns scheduled uploads without depending on the upload/auth workflows. */
export class CloudSaveTimers {
    constructor(owner, browser) {
        this.owner = owner; this.browser = browser;
        this.automatic = null; this.disposed = false;
    }

    scheduleAutomatic(callback) {
        if (this.disposed) return;
        if (this.automatic !== null) this.browser.clearTimeout(this.automatic);
        this.automatic = this.browser.setTimeout(() => {
            this.automatic = null;
            callback();
        }, 5000);
    }

    scheduleForced(callback) {
        if (this.disposed || this.owner.current.pendingForcedSyncRetryTimer) return;
        this.owner.current.pendingForcedSyncRetryTimer = this.browser.setTimeout(() => {
            this.owner.current.pendingForcedSyncRetryTimer = null;
            callback();
        }, 500);
    }

    cancel() {
        if (this.automatic !== null) this.browser.clearTimeout(this.automatic);
        if (this.owner.current.pendingForcedSyncRetryTimer) this.browser.clearTimeout(this.owner.current.pendingForcedSyncRetryTimer);
        this.automatic = null;
        this.owner.current.pendingForcedSyncRetryTimer = null;
    }

    dispose() {
        this.disposed = true;
        this.cancel();
    }
}
