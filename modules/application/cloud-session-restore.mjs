/** Startup restore keeps offline credentials on disk and does not silently switch the player's save slot. */
export class CloudSessionRestore {
    constructor(services, effects) { this.services = services; this.effects = effects; }

    gameSessionComesFirst() {
        const stored = this.services.storage.load();
        return !!(stored && stored.refresh_token) && !/[?#].*(access_token|code|error|state)=/i.test(this.effects.href() || '');
    }

    async restoreOAuth() {
        const { owner, sdk, account } = this.services;
        const previous = owner.current.session, epoch = owner.current.sessionEpoch;
        const client = sdk.getClient();
        if (!client || this.gameSessionComesFirst()) return false;
        account.watchSdk(client);
        try {
            const { data, error } = await client.auth.getSession();
            if (!owner.isCurrentSession(previous, epoch)) return false;
            if (error) throw error;
            const session = data && data.session;
            if (!session || !session.access_token) return false;
            return await this.finishOAuthRestore(session);
        } catch (error) {
            this.effects.console.warn('supabase oauth session restore failed:', error);
            return false;
        }
    }

    async finishOAuthRestore(session) {
        const { owner, account } = this.services;
        account.apply(session);
        const userId = owner.userId(), epoch = owner.current.sessionEpoch;
        await this.effects.refreshIdentities();
        if (!owner.isCurrentAccount(userId, epoch)) return false;
        const label = session.user && (session.user.email || session.user.id) || '알 수 없음';
        this.effects.setMessage('로그인됨: ' + label);
        return true;
    }

    async restoreStored() {
        const { owner, storage, tokens, account } = this.services;
        if (!owner.active) return false;
        const stored = storage.load();
        if (!stored || !stored.access_token) return false;
        if (!stored.refresh_token) {
            storage.clear();
            this.effects.setMessage(this.effects.translate('저장된 클라우드 세션에 갱신 토큰이 없습니다. 다시 로그인해주세요.'));
            return false;
        }
        account.resetSync(stored);
        owner.current.session = stored;
        owner.current.user = stored.user || null;
        const epoch = owner.current.sessionEpoch;
        const refreshed = await tokens.refresh('저장된 세션 복원');
        if (!owner.active || owner.current.sessionEpoch !== epoch) return false;
        if (refreshed) return true;
        if (!owner.current.session) return false;
        return this.continueOffline();
    }

    continueOffline() {
        const { owner, tokens, account } = this.services;
        if (tokens.canRestoreCurrentSession()) {
            this.effects.setMessage(this.effects.translate('클라우드 로그인 갱신은 못 했지만 기존 로그인으로 계속합니다.'));
            this.effects.syncGuard();
            return true;
        }
        account.resetSync(null);
        // The disk copy deliberately stays intact so the next startup can retry a network failure.
        owner.current.session = null;
        owner.current.user = null;
        this.effects.syncGuard();
        this.effects.setMessage(this.effects.translate('연결이 없어 저장된 로그인을 확인하지 못했습니다. 다음 실행 때 다시 시도합니다.'));
        return false;
    }
}
