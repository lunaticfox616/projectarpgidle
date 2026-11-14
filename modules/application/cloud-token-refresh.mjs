import { sendCloudRequest } from './cloud-request.mjs';

const REFRESH_LEEWAY_MS = 5 * 60 * 1000;
const EXPIRY_WARNING_MS = 10 * 60 * 1000;

export function isCloudAuthRejection(error) {
    const status = Number(error && error.status);
    return status === 400 || status === 401 || status === 403;
}

/** Owns refresh deduplication and late-reply checks. Storage/SDK/HTTP do not call back into refresh. */
export class CloudTokenRefresh {
    constructor(ports, sdk, effects) { this.ports = ports; this.sdk = sdk; this.effects = effects; this.active = true; }

    notifyExpired(message) {
        const text = message || '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
        this.effects.setMessage(text);
        if (!this.ports.state.tokenExpiryWarned) this.effects.logExpiry(text);
        this.ports.state.tokenExpiryWarned = true;
    }

    hasNewerSession(owner, epoch) {
        return this.active && this.ports.state.sessionEpoch === epoch && this.ports.getUserId() === owner.user?.id && this.hasUsableToken();
    }

    expiresAtMs() {
        const expiresAt = this.ports.state.session ? Number(this.ports.state.session.expires_at || 0) : 0;
        return expiresAt > 0 ? expiresAt * 1000 : 0;
    }

    hasUsableToken() {
        if (!this.active || !this.ports.state.session?.access_token) return false;
        const expiresAt = this.expiresAtMs();
        return !expiresAt || expiresAt > Date.now();
    }

    canRestoreCurrentSession() {
        return this.active && this.ports.state.user && this.expiresAtMs() - Date.now() > REFRESH_LEEWAY_MS;
    }

    async recover(owner, error) {
        if (!this.active || this.ports.state.session !== owner) return undefined;
        this.effects.console.warn('cloud token refresh failed:', error);
        if (!isCloudAuthRejection(error)) {
            this.effects.setMessage(this.effects.translate('클라우드 로그인 갱신을 못 했습니다(연결 상태). 잠시 뒤 다시 시도합니다.'));
            return undefined;
        }
        const adopted = await this.sdk.readNewerSession(this.ports.state.session);
        return adopted?.user?.id === owner.user?.id ? adopted : null;
    }

    async perform(owner, epoch, reason) {
        try {
            this.effects.setMessage(reason ? this.effects.translate('클라우드 로그인 갱신 중... ({reason})', { reason }) : '클라우드 로그인 갱신 중...');
            const refreshed = await sendCloudRequest(this.ports, this.ports.getConfig(), '/auth/v1/token?grant_type=refresh_token', {
                method: 'POST', useAuth: false, body: { refresh_token: owner.refresh_token }
            });
            if (!this.active) return false;
            if (this.ports.state.session !== owner) return this.hasNewerSession(owner, epoch);
            this.effects.applySession(refreshed);
            this.effects.setMessage(this.effects.translate('클라우드 로그인 세션을 자동 갱신했습니다.'));
            return true;
        } catch (error) {
            const adopted = await this.recover(owner, error);
            if (!this.active) return false;
            if (this.ports.state.session !== owner) return this.hasNewerSession(owner, epoch);
            if (adopted === undefined) return false;
            this.effects.applySession(adopted);
            if (adopted) { this.effects.setMessage(this.effects.translate('클라우드 로그인 세션을 이어받았습니다.')); return true; }
            this.notifyExpired('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            return false;
        }
    }

    async refresh(reason) {
        if (!this.active) return false;
        const owner = this.ports.state.session, epoch = this.ports.state.sessionEpoch;
        if (!owner || !owner.refresh_token) {
            this.notifyExpired('클라우드 로그인 갱신 정보가 없습니다. 다시 로그인해주세요.');
            return false;
        }
        if (this.ports.state.tokenRefreshPromise) return await this.ports.state.tokenRefreshPromise;
        const pending = this.perform(owner, epoch, reason);
        this.ports.state.tokenRefreshPromise = pending;
        try { return await pending; } finally {
            if (this.ports.state.tokenRefreshPromise === pending) this.ports.state.tokenRefreshPromise = null;
            if (this.active) this.effects.render();
        }
    }

    async ensureFresh(reason) {
        const session = this.ports.state.session;
        if (!this.active || !session || !session.access_token) return false;
        const expiresAt = this.expiresAtMs();
        if (!expiresAt) return true;
        const remaining = expiresAt - Date.now();
        if (remaining <= REFRESH_LEEWAY_MS) return await this.refresh(reason || '만료 예정');
        if (remaining <= EXPIRY_WARNING_MS && !this.ports.state.tokenExpiryWarned) this.notifyExpired('클라우드 로그인 세션이 곧 만료됩니다. 만료 전 자동 갱신 예정입니다.');
        return true;
    }

    dispose() { this.active = false; }
}
