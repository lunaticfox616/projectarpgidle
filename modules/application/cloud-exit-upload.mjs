const CLOUD_EXIT_UPLOAD_WAIT_MS = 15000;

export class CloudExitUpload {
    constructor(account, deps, links) {
        this.account = account; this.deps = deps; this.links = links;
        this.lastPushAt = 0; this.disposed = false; this.waiters = new Set();
    }

    /** The page-exit commit answered: committed, the slot takes the revision; refused (another device committed), uploads halt until the
     * account is entered again. */
    applyPageExitCloudSaveResult(text, exitSave, fingerprint) {
        if (this.disposed) return;
        if (this.account.current.busy || (this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game) !== exitSave || !text) return;
        let result = JSON.parse(text);
        result = Array.isArray(result) ? result[0] : result;
        if (!result) return;
        if (!result.committed) {
            this.account.current.syncHalted = true;
            return;
        }
        this.links.runtime.rememberCloudCommit({ revision: result.current_revision, updated_at: result.saved_at }, fingerprint);
    }

    /** Body, headers and endpoint of the page-exit upload (the same RPC as a normal sync), with the content print. */
    buildPageExitCloudRequest(config) {
        let payload = (0, this.deps.createCloudSavePayload)(this.deps.game);
        let body = JSON.stringify({ expected_revision: this.links.runtime.getLocalCloudRevision(), next_save_data: payload });
        let headers = {
            apikey: config.supabaseAnonKey,
            ...this.deps.cloudSessionGuard.requestHeaders(),
            Authorization: `Bearer ${this.account.current.session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        };
        return { body, headers, endpoint: config.supabaseUrl + '/rest/v1/rpc/commit_cloud_save', fingerprint: (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) };
    }

    /** Uploaded a moment ago, or only clocks moved since the last upload: switching apps back and forth uploads once. */
    isPageExitCloudPushRedundant(fingerprint) {
        return fingerprint === this.account.current.lastUploadedFingerprint || Date.now() - (this.account.current.lastCloudCommitAt || 0) < this.deps.CLOUD_EXIT_UPLOAD_MIN_GAP_MS;
    }

    /** Browsers refuse keepalive bodies over 64 KiB (most saves). A bigger save goes as a normal request: when the page is
     * only hidden (switching tabs or apps) it still finishes; a closed page may lose it, and the slot keeps it pending for the next
     * account entry (enterAccountSave). sendBeacon cannot carry the Supabase auth headers. */
    sendPageExitCloudSave(request, reason, exitSave) {
        if (this.disposed || !this.account.active) return;
        const context = this.links.runtime.captureCloudSaveContext();
        this.trackPageExitUpload((0, this.deps.fetch)(request.endpoint, {
            method: 'POST',
            headers: request.headers,
            body: request.body,
            keepalive: new this.deps.Blob([request.body]).size <= this.deps.CLOUD_KEEPALIVE_BODY_LIMIT
        }).then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        }).then(text => {
            if (!this.links.runtime.isCloudSaveContextCurrent(context)) return;
            this.applyPageExitCloudSaveResult(text, exitSave, request.fingerprint);
        }).catch(error => {
            let msg = String((error && error.message) || error || '');
            let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
            if (expectedAbort && reason === 'visibilitychange') {
                this.deps.console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
            } else {
                this.deps.console.warn(`cloud save on ${reason || 'page exit'} failed:`, error);
            }
        }));
    }

    trackPageExitUpload(upload) {
        const tracked = upload.finally(() => {
            if (this.account.current.exitUpload === tracked) this.account.current.exitUpload = null;
        });
        this.account.current.exitUpload = tracked;
    }

    async waitForPageExitUpload() {
        const upload = this.account.current.exitUpload;
        if (this.disposed || !upload) return;
        await new Promise((resolve, reject) => {
            let timer;
            let settled = false;
            const finish = error => {
                if (settled) return;
                settled = true;
                (0, this.deps.clearTimeout)(timer);
                this.waiters.delete(finish);
                if (error) reject(error); else resolve();
            };
            timer = (0, this.deps.setTimeout)(finish, CLOUD_EXIT_UPLOAD_WAIT_MS);
            this.waiters.add(finish);
            upload.then(() => finish(), finish);
        });
    }

    canPushOnExit(config) {
        if (this.disposed || !this.account.active) return false;
        if (this.account.current.busy || this.account.current.syncHalted || this.account.current.exitUpload) return false;
        if (typeof this.deps.canPersistLocalSave === 'function' && !(0, this.deps.canPersistLocalSave)()) return false;
        return config.enabled && !!this.account.userId() && this.links.session.hasUsableCloudSessionToken();
    }

    isPlayingOwnSlot() {
        if (typeof this.deps.isStartupOverlayOpen === 'function' && (0, this.deps.isStartupOverlayOpen)()) return false;
        if (!this.deps.gameplayStarted) return false;
        return this.links.runtime.getCloudSaveOwnerId() === this.account.userId() && (0, this.deps.getSaveSlot)().userId === this.account.userId();
    }

    pushCloudSaveOnPageExit(reason) {
        const config = this.links.session.getCloudConfig();
        if (!this.canPushOnExit(config) || !this.isPlayingOwnSlot()) return false;
        let exitPushStartedAt = Date.now();
        let exitSave = this.deps.game;
        if (exitPushStartedAt - this.lastPushAt < 1500) return false;
        try {
            if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: true })) return false;
            let request = this.buildPageExitCloudRequest(config);
            if (this.isPageExitCloudPushRedundant(request.fingerprint)) return false;
            this.sendPageExitCloudSave(request, reason, exitSave);
            this.lastPushAt = exitPushStartedAt;
            this.account.current.lastSyncAttemptAt = exitPushStartedAt;
            (0, this.deps.setCloudMessage)((0, this.deps._t)('페이지 종료 전 클라우드 저장을 시도했습니다.'));
            return true;
        } catch (error) {
            this.deps.console.warn(`cloud save on ${reason || 'page exit'} setup failed:`, error);
            return false;
        }
    }

    dispose() {
        this.disposed = true;
        for (const finish of this.waiters) finish();
        // In-flight keepalive uploads may finish remotely; disposed owners ignore their receipts.
    }
}
