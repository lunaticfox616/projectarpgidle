const REQUEST_TIMEOUT_MS = 30000;

export const cloudRequestDisposedError = () => Object.assign(new Error('Cloud request owner has been disposed.'), { code: 'CLOUD_REQUEST_DISPOSED' });

/** Parse the API's optional JSON body. Text errors remain valid server responses. */
export function readCloudResponseData(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

/** Raw HTTP only: no game, auth refresh, retry, UI, or save ownership. */
export class CloudJsonTransport {
    constructor(deps) { this.deps = deps; this.active = true; this.pending = new Map(); }

    async read(url, options) {
        if (!this.active) throw cloudRequestDisposedError();
        const controller = new this.deps.AbortController();
        const timer = this.deps.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        this.pending.set(controller, timer);
        try {
            const response = await this.deps.fetch(url, { ...options, signal: controller.signal });
            const text = await response.text(); // The same deadline includes the body, not only the headers.
            if (!this.active) throw cloudRequestDisposedError();
            return { ok: response.ok, status: response.status, data: readCloudResponseData(text) };
        } catch (error) {
            if (!this.active) throw cloudRequestDisposedError();
            if (controller.signal.aborted) throw Object.assign(new Error(this.deps.translate('서버 응답 시간이 초과되었습니다. 연결을 확인해 주세요.')), { code: 'CLOUD_REQUEST_TIMEOUT' });
            throw error;
        } finally {
            this.deps.clearTimeout(timer);
            this.pending.delete(controller);
        }
    }

    /** A cancelled mutation may have committed remotely. Never retry it in this transport. */
    dispose() {
        if (!this.active) return;
        this.active = false;
        for (const [controller, timer] of this.pending) {
            this.deps.clearTimeout(timer);
            controller.abort();
        }
        this.pending.clear();
    }
}
