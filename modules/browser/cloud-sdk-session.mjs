/** SDK client and auth subscriptions have one owner; game auth refresh stays in the application. */
export class CloudSdkSession {
    constructor(deps, storage) {
        this.deps = deps;
        this.storage = storage;
        this.client = null;
        this.subscriptions = new Map();
        this.active = true;
    }

    existing() { return this.deps.window.supabaseClient || this.client; }

    getClient() {
        if (!this.active) return null;
        const existing = this.existing();
        if (existing) return existing;
        const config = this.deps.getConfig();
        if (!config.enabled) return null;
        const sdk = this.deps.window.supabase;
        if (!sdk || typeof sdk.createClient !== 'function') {
            this.deps.console.warn('supabase-js is not loaded.');
            return null;
        }
        this.storage.dropStaleSdkSession(config);
        this.client = sdk.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: false, // Only the game refreshes: old parallel chains can revoke the session.
                detectSessionInUrl: true,
                flowType: this.deps.appPlatform.active ? 'pkce' : 'implicit'
            }
        });
        this.deps.window.supabaseClient = this.client;
        return this.client;
    }

    async clearPersistedSession() {
        const client = this.getClient();
        if (!client) return;
        try { await client.auth.signOut({ scope: 'local' }); }
        catch (error) { this.deps.console.warn('supabase local signout failed:', error); }
    }

    watch(client, onSession) {
        if (!this.active || this.subscriptions.has(client) || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;
        const result = client.auth.onAuthStateChange((event, session) => {
            if (!this.active || event !== 'TOKEN_REFRESHED' || !session || !session.access_token) return;
            onSession(session);
        });
        this.subscriptions.set(client, result?.data?.subscription);
    }

    canSync(client, session) {
        return this.active && client?.auth && typeof client.auth.setSession === 'function' && session?.access_token && session.refresh_token;
    }

    /** Do not create a client here or refresh again when storage already has the same token. */
    sync(session) {
        const client = this.existing();
        if (!this.canSync(client, session)) return;
        if (this.storage.sdkRefreshToken(client, this.deps.getConfig()) === session.refresh_token) return;
        Promise.resolve(client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }))
            .then(result => { if (result && result.error) this.deps.console.warn('supabase-js 세션 맞추기 실패:', result.error); })
            .catch(error => this.deps.console.warn('supabase-js 세션 맞추기 실패:', error));
    }

    /** Adopt only a newer SDK token; the application also checks its account and epoch. */
    async readNewerSession(current) {
        const client = this.getClient();
        if (!client || !client.auth) return null;
        try {
            const { data } = await client.auth.getSession();
            if (!this.active) return null;
            return this.newerTokenSession(data && data.session, current);
        } catch (error) {
            this.deps.console.warn('supabase-js 세션 읽기 실패:', error);
            return null;
        }
    }

    newerTokenSession(session, current) {
        if (!session || !session.access_token || !session.refresh_token) return null;
        return current && session.refresh_token === current.refresh_token ? null : session;
    }

    async prepareIdentityLink(client, current) {
        if (!this.active) return false;
        if (this.canSync(client, current)) {
            try { await client.auth.setSession({ access_token: current.access_token, refresh_token: current.refresh_token }); }
            catch (error) { this.deps.console.warn('supabase session sync failed before linkIdentity:', error); }
        }
        if (!this.active) return false;
        const { data, error } = await client.auth.getSession();
        return this.active && !error && !!data?.session?.access_token;
    }

    dispose() {
        if (!this.active) return;
        this.active = false;
        for (const subscription of this.subscriptions.values()) subscription?.unsubscribe();
        this.subscriptions.clear();
    }
}
