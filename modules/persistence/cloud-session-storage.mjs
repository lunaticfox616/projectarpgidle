const SKIP_OAUTH_RESTORE_KEY = 'projectidle_cloud_skip_oauth_restore';

/** Owns the existing session keys. This migration neither changes credentials nor the save format. */
export class CloudSessionStorage {
    constructor(deps, keys) { this.deps = deps; this.keys = keys; }

    legacyKeys() {
        return Object.keys(this.deps.storage).filter(key => this.keys.legacyPattern.test(key));
    }

    adoptLegacy() {
        const key = this.legacyKeys()[0];
        if (!key) return null;
        const raw = this.deps.storage.getItem(key);
        if (raw) this.deps.storage.setItem(this.keys.current, raw);
        this.deps.storage.removeItem(key);
        return raw;
    }

    load() {
        try {
            const raw = this.deps.storage.getItem(this.keys.current) || this.adoptLegacy();
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            this.deps.console.warn('failed to load cloud session:', error);
            return null;
        }
    }

    persist(session) {
        try { this.deps.storage.setItem(this.keys.current, JSON.stringify(session)); }
        catch (error) { this.deps.console.warn('failed to persist cloud session:', error); }
    }

    clear() {
        try {
            this.deps.storage.removeItem(this.keys.current);
            this.legacyKeys().forEach(key => this.deps.storage.removeItem(key));
        } catch (error) { this.deps.console.warn('failed to clear cloud session storage:', error); }
    }

    markSkipOAuthRestoreOnce() {
        try { this.deps.storage.setItem(SKIP_OAUTH_RESTORE_KEY, '1'); }
        catch (error) { this.deps.console.warn('failed to mark OAuth restore skip:', error); }
    }

    consumeSkipOAuthRestoreOnce() {
        try {
            const marked = this.deps.storage.getItem(SKIP_OAUTH_RESTORE_KEY) === '1';
            if (marked) this.deps.storage.removeItem(SKIP_OAUTH_RESTORE_KEY);
            return marked;
        } catch (error) {
            this.deps.console.warn('failed to read OAuth restore skip:', error);
            return false;
        }
    }

    sdkKey(config) {
        return `sb-${new this.deps.URL(config.supabaseUrl).hostname.split('.')[0]}-auth-token`;
    }

    /** Remove only the SDK's obsolete token chain before constructing its auth watcher. */
    dropStaleSdkSession(config) {
        try {
            const stored = this.load();
            if (!stored || !stored.refresh_token) return;
            const key = this.sdkKey(config);
            const parsed = JSON.parse(this.deps.storage.getItem(key) || 'null');
            if (parsed && parsed.refresh_token && parsed.refresh_token !== stored.refresh_token) this.deps.storage.removeItem(key);
        } catch (error) { this.deps.console.warn('supabase-js 저장 세션 확인 실패:', error); }
    }

    /** Reading storage does not trigger the SDK's implicit token refresh. */
    sdkRefreshToken(client, config) {
        try {
            const key = (client.auth && client.auth.storageKey) || this.sdkKey(config);
            const parsed = JSON.parse(this.deps.storage.getItem(key) || 'null');
            return parsed && parsed.refresh_token ? String(parsed.refresh_token) : '';
        } catch (error) {
            this.deps.console.warn('supabase-js 저장 세션 읽기 실패:', error);
            return '';
        }
    }
}
