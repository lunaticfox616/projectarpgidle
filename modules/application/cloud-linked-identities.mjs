/** Account identity lookups may outlive a login. Only their original account entry can receive the result. */
export class CloudLinkedIdentities {
    constructor(services, effects) { this.services = services; this.effects = effects; }

    needsLogin() {
        const state = this.services.owner.current;
        state.linkedProviders = [];
        state.identityLookupState = state.user ? 'needs_login' : 'idle';
        return [];
    }

    async syncSdk(client) {
        const session = this.services.owner.current.session;
        if (!session?.access_token || !session.refresh_token || typeof client.auth?.setSession !== 'function') return;
        try { await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }); }
        catch (error) { this.effects.console.warn('supabase session sync failed before identity lookup:', error); }
    }

    async readProviders(client) {
        if (client.auth && typeof client.auth.getUserIdentities === 'function') {
            const { data, error } = await client.auth.getUserIdentities();
            if (error) throw error;
            const identities = data && (data.identities || data.user_identities) ? (data.identities || data.user_identities) : [];
            return identities.map(it => it && (it.provider || it.identity_provider)).filter(Boolean);
        }
        return this.readLegacyProviders(client);
    }

    async readLegacyProviders(client) {
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        const identities = data && data.user && Array.isArray(data.user.identities) ? data.user.identities : [];
        return identities.map(it => it && it.provider).filter(Boolean);
    }

    async lookup() {
        const { owner, sdk } = this.services;
        if (!owner.active) return [];
        const userId = owner.userId(), epoch = owner.current.sessionEpoch;
        const client = sdk.getClient();
        if (!client || !owner.current.user) return this.needsLogin();
        try {
            return await this.readIdentityAccount(client, userId, epoch);
        } catch (error) {
            this.effects.console.warn('failed to load linked identities:', error);
            return owner.isCurrentAccount(userId, epoch) ? this.needsLogin() : [];
        }
    }

    async readIdentityAccount(client, userId, epoch) {
        const { owner, account } = this.services;
        await this.syncSdk(client);
        if (!owner.isCurrentAccount(userId, epoch)) return [];
        account.watchSdk(client);
        const result = await client.auth.getSession();
        if (!owner.isCurrentAccount(userId, epoch)) return [];
        if (result && result.error) throw result.error;
        if (!result?.data?.session?.access_token) return this.missingSession();
        return this.commitProviders(client, userId, epoch);
    }

    missingSession() {
        this.needsLogin();
        this.effects.setMessage(this.effects.translate('로그인 후 이용 가능합니다'));
        return [];
    }

    async commitProviders(client, userId, epoch) {
        const providers = await this.readProviders(client);
        if (!this.services.owner.isCurrentAccount(userId, epoch)) return [];
        const state = this.services.owner.current;
        state.linkedProviders = Array.from(new Set(providers));
        state.identityLookupState = 'ready';
        return state.linkedProviders;
    }
}
