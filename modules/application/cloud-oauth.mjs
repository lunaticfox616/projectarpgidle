

export class CloudOAuth {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links;  }

    getOAuthRedirectUrl() {
        if (this.deps.appPlatform.active) return this.deps.appPlatform.redirectUrl;
        let origin = this.deps.window.location.origin || '';
        let pathname = this.deps.window.location.pathname || '/';
        let normalizedPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
        return `${origin}${normalizedPath}`;
    }

    async loginWithGoogle() {
        await this.loginWithOAuthProvider('google');
    }

    async loginWithKakao() {
        await this.loginWithOAuthProvider('kakao');
    }

    providerLabel(provider) {
        return provider === 'google' ? 'Google' : (0, this.deps._t)('카카오');
    }

    getSocialOAuthOptions(provider) {
        let redirectTo = this.getOAuthRedirectUrl();
        let options = { redirectTo, ...(this.deps.appPlatform.active ? { skipBrowserRedirect: true } : {}) };
        if (provider === 'kakao') {
            // 카카오 로그인에서 account_email scope를 요청하지 않습니다.
            options.scopes = 'profile_nickname';
            options.queryParams = { scope: 'profile_nickname' };
        }
        return options;
    }

    sanitizeKakaoScopeInUrl(rawUrl) {
        if (!rawUrl) return rawUrl;
        try {
            let url = new this.deps.URL(rawUrl);
            let scopeRaw = url.searchParams.get('scope') || '';
            let scopes = scopeRaw.split(/\s+/).map(v => v.trim()).filter(Boolean);
            let filtered = scopes.filter(scope => scope !== 'account_email');
            if (filtered.length === 0) filtered = ['profile_nickname'];
            url.searchParams.set('scope', filtered.join(' '));
            return url.toString();
        } catch {
            this.deps.console.warn('Invalid Kakao redirect URL; retaining the SDK result.');
            return rawUrl;
        }
    }

    async loginWithOAuthProvider(provider) {
        if (!this.account.active) return;
        this.links.form.setStartupRegistrationMode(false);
        let client = this.links.session.getSupabaseClient();
        if (!client) return (0, this.deps.setCloudMessage)((0, this.deps._t)('OAuth 클라이언트를 초기화하지 못했습니다.'));
        if (this.account.current.busy) return;
        const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('{provider} 로그인으로 이동 중입니다...', { provider: this.providerLabel(provider) }));
        this.links.view.render();
        try {
            let options = this.getSocialOAuthOptions(provider);
            if (provider === 'kakao') options.skipBrowserRedirect = true;
            let { data, error } = await client.auth.signInWithOAuth({ provider, options });
            if (!this.account.isCurrentAccount(userId, epoch)) return;
            if (error) throw error;
            await this.openSocialOAuthResult(provider, data);
        } catch (error) {
            if (!this.account.isCurrentAccount(userId, epoch)) return;
            this.account.current.busy = false;
            (0, this.deps.setCloudMessage)('OAuth 로그인 시작 실패: ' + (error.message || error));
            this.links.view.render();
        }
    }

    async openSocialOAuthResult(provider, data) {
        if (!this.account.active) return;
        if (this.deps.appPlatform.active) return this.deps.appPlatform.openOAuth(data.url);
        if (provider !== 'kakao') return; // The web client already redirects Google sign-in.
        let safeUrl = this.sanitizeKakaoScopeInUrl(data && data.url);
        if (!safeUrl) throw new Error('카카오 인증 페이지 URL을 받지 못했습니다.');
        this.deps.window.location.assign(safeUrl);
    }

    recoverBusyStateAfterOAuthBack() {
        if (!this.account.active) return;
        if (!this.account.current.busy) return;
        let href = this.deps.window.location.href || '';
        let hasOAuthParams = /[?#].*(access_token|code|error|state)=/i.test(href);
        if (hasOAuthParams) return;
        this.account.current.busy = false;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('인증이 취소되었습니다. 다시 시도해주세요.'));
        this.links.view.render();
    }

    async linkGoogleAccount() {
        return await this.linkSocialIdentityProvider('google');
    }

    async linkKakaoAccount() {
        return await this.linkSocialIdentityProvider('kakao');
    }

    async linkSocialIdentityProvider(provider) {
        if (!this.account.active) return;
        if (!this.account.current.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)('먼저 로그인해주세요.'));
        const userId = this.account.userId(), epoch = this.account.current.sessionEpoch;
        await this.links.identities.lookup();
        if (!this.account.isCurrentAccount(userId, epoch)) return;
        let providerKey = String(provider || '').toLowerCase();
        let linkedProviders = this.account.current.linkedProviders;
        let alreadyLinked = linkedProviders.some(it => String(it || '').toLowerCase() === providerKey);
        if (alreadyLinked) return (0, this.deps.setCloudMessage)((0, this.deps._t)('{provider} 계정은 이미 연동되어 있습니다.', { provider: this.providerLabel(provider) }));
        let client = this.links.session.getSupabaseClient();
        if (!client) return (0, this.deps.setCloudMessage)((0, this.deps._t)('소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.'));
        // Supabase Dashboard > Authentication에서 Manual Identity Linking 옵션이 켜져 있어야 동작합니다.
        if (typeof client.auth.linkIdentity !== 'function') return (0, this.deps.setCloudMessage)((0, this.deps._t)('이 환경에서는 소셜 계정 연결을 지원하지 않습니다.'));
        await this.beginIdentityLink(client, provider, { userId, epoch });
    }

    async beginIdentityLink(client, provider, context) {
        this.account.current.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('{provider} 계정 연결을 시작합니다...', { provider: this.providerLabel(provider) }));
        this.links.view.render();
        try {
            const ready = await this.links.sdk.prepareIdentityLink(client, this.account.current.session);
            if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
            if (!ready) {
                this.account.current.busy = false;
                (0, this.deps.setCloudMessage)((0, this.deps._t)('로그인 후 이용 가능합니다'));
                this.links.view.render();
                return;
            }
            let options = this.getSocialOAuthOptions(provider);
            let { data, error } = await client.auth.linkIdentity({ provider, options });
            if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
            if (error) throw error;
            await this.openSocialOAuthResult(provider, data);
        } catch (error) {
            if (!this.account.isCurrentAccount(context.userId, context.epoch)) return;
            (0, this.deps.setCloudMessage)('소셜 계정 연결 시작 실패: ' + (error.message || error));
            this.account.current.busy = false;
            this.links.view.render();
        }
    }
}
