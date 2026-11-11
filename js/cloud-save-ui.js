// 계정과 서버 저장(2026-11-10에 js/ui.js에서 그대로 옮겼다): 로그인과 세션 갱신, 서버 호출(cloudJsonRequest), 시작 화면에서 게임으로 들어가는
// 길(enterGameWorld), 계정 저장 칸과 서버 저장 맞추기(enterAccountSave), 올리기와 받기, 종료할 때의 올리기. 시작 화면 그리기와 패치 노트는
// js/ui.js에 남았다. js/ui.js 바로 뒤에 읽는다.
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function getCloudConfig() {
    let raw = window.CLOUD_SAVE_CONFIG || {};
    let supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    let supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
    let enabled = raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    // 무대 시험판 창(주소에 stage=1, 로컬 전용)은 클라우드 저장을 쓰지 않는다: 시험하는 판이 계정의 저장을 고쳐 쓰지 않게.
    if (typeof stageView === 'object' && stageView.trial()) enabled = false;
    return { enabled, supabaseUrl, supabaseAnonKey };
}

function markSkipOAuthRestoreOnce() {
    try { localStorage.setItem(CLOUD_SKIP_OAUTH_RESTORE_KEY, '1'); } catch (error) { console.warn('failed to mark OAuth restore skip:', error); }
}

function consumeSkipOAuthRestoreOnce() {
    try {
        let marked = localStorage.getItem(CLOUD_SKIP_OAUTH_RESTORE_KEY) === '1';
        if (marked) localStorage.removeItem(CLOUD_SKIP_OAUTH_RESTORE_KEY);
        return marked;
    } catch (e) {
        return false;
    }
}

async function clearSupabasePersistedSession() {
    let client = getSupabaseClient();
    if (!client) return;
    try {
        await client.auth.signOut({ scope: 'local' });
    } catch (error) {
        console.warn('supabase local signout failed:', error);
    }
}

/** supabase-js가 세션을 두는 localStorage 열쇠(라이브러리 기본값: 프로젝트 참조 이름). */
function supabaseSessionStorageKey(config) {
    return `sb-${new URL(config.supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

/** 클라이언트를 만들기 전에, supabase-js가 저장해 둔 세션이 게임 것과 다른 갱신 토큰이면 지운다(2026-11-05). 라이브러리는 만들어지자마자
 * 자기 인증 감시를 걸고 그 첫 호출이 저장된 세션을 읽어 만료됐으면 갱신하는데, 게임이 그 뒤로 토큰을 두 번 넘게 바꿨으면 그 묵은 토큰이
 * 서버의 세션 사슬을 끊어 부팅 직후 로그아웃됐다. 게임 세션이 복원되면 syncSupabaseClientSession이 현재 토큰을 다시 넣는다. */
function dropStaleSupabaseStoredSession(config) {
    try {
        let stored = loadStoredCloudSession();
        if (!stored || !stored.refresh_token) return;
        let key = supabaseSessionStorageKey(config);
        let parsed = JSON.parse(localStorage.getItem(key) || 'null');
        if (parsed && parsed.refresh_token && parsed.refresh_token !== stored.refresh_token) localStorage.removeItem(key);
    } catch (error) {
        console.warn('supabase-js 저장 세션 확인 실패:', error);
    }
}

function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (supabaseClient) return supabaseClient;
    let config = getCloudConfig();
    if (!config.enabled) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('supabase-js is not loaded.');
        return null;
    }
    dropStaleSupabaseStoredSession(config);
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: false,   // 갱신은 게임만 한다(2026-11-05, syncSupabaseClientSession): 둘이 따로 갱신하면 묵은 토큰이 세션 사슬을 끊는다
            detectSessionInUrl: true,
            flowType: appPlatform.active ? 'pkce' : 'implicit'
        }
    });
    window.supabaseClient = supabaseClient;
    return supabaseClient;
}

function getOAuthRedirectUrl() {
    if (appPlatform.active) return appPlatform.redirectUrl;
    let origin = window.location.origin || '';
    let pathname = window.location.pathname || '/';
    let normalizedPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return `${origin}${normalizedPath}`;
}

async function loginWithGoogle() {
    await loginWithOAuthProvider('google');
}

async function loginWithKakao() {
    await loginWithOAuthProvider('kakao');
}

function getSocialOAuthOptions(provider) {
    let redirectTo = getOAuthRedirectUrl();
    let options = { redirectTo, ...(appPlatform.active ? { skipBrowserRedirect: true } : {}) };
    if (provider === 'kakao') {
        // 카카오 로그인에서 account_email scope를 요청하지 않습니다.
        options.scopes = 'profile_nickname';
        options.queryParams = { scope: 'profile_nickname' };
    }
    return options;
}

function sanitizeKakaoScopeInUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        let url = new URL(rawUrl);
        let scopeRaw = url.searchParams.get('scope') || '';
        let scopes = scopeRaw.split(/\s+/).map(v => v.trim()).filter(Boolean);
        let filtered = scopes.filter(scope => scope !== 'account_email');
        if (filtered.length === 0) filtered = ['profile_nickname'];
        url.searchParams.set('scope', filtered.join(' '));
        return url.toString();
    } catch (e) {
        return rawUrl;
    }
}

async function loginWithOAuthProvider(provider) {
    setStartupRegistrationMode(false);
    let client = getSupabaseClient();
    if (!client) return setCloudMessage(_t('OAuth 클라이언트를 초기화하지 못했습니다.'));
    if (cloudState.busy) return;
    cloudState.busy = true;
    setCloudMessage(_t('{provider} 로그인으로 이동 중입니다...', { provider: provider === 'google' ? 'Google' : _t('카카오') }));
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        if (provider === 'kakao') options.skipBrowserRedirect = true;
        let { data, error } = await client.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
        await openSocialOAuthResult(provider, data);
    } catch (error) {
        cloudState.busy = false;
        setCloudMessage('OAuth 로그인 시작 실패: ' + (error.message || error));
        updateCloudSaveUI();
    }
}

async function openSocialOAuthResult(provider, data) {
    if (appPlatform.active) return appPlatform.openOAuth(data.url);
    if (provider !== 'kakao') return; // The web client already redirects Google sign-in.
    let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
    if (!safeUrl) throw new Error('카카오 인증 페이지 URL을 받지 못했습니다.');
    window.location.assign(safeUrl);
}

function recoverBusyStateAfterOAuthBack() {
    if (!cloudState.busy) return;
    let href = window.location.href || '';
    let hasOAuthParams = /[?#].*(access_token|code|error|state)=/i.test(href);
    if (hasOAuthParams) return;
    cloudState.busy = false;
    setCloudMessage(_t('인증이 취소되었습니다. 다시 시도해주세요.'));
    updateCloudSaveUI();
}

/** supabase-js가 스스로 갱신했으면(getSession이 만료된 저장 토큰을 갱신할 때) 게임 세션도 그 토큰으로 맞춘다: 둘이 같은 refresh_token을 따로 갱신하다 늦은 쪽이
 * 거절되는 일을 줄인다(2026-10-27). 거절된 뒤의 이어받기는 refreshCloudSession이 따로 한다. 한 클라이언트에 한 번만 건다. */
function watchSupabaseTokenRefresh(client) {
    if (client.__rigninTokenWatch || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;
    client.__rigninTokenWatch = true;
    client.auth.onAuthStateChange((event, session) => {
        if (event !== 'TOKEN_REFRESHED' || !session || !session.access_token) return;
        if (!getActiveCloudUserId() || session.user?.id !== getActiveCloudUserId()) return;
        if (cloudState.session && cloudState.session.refresh_token === session.refresh_token) return;
        applyCloudSession(session);
    });
}

/** 부팅 때 supabase-js의 세션 복원을 건너뛸지: 클라이언트가 없거나, 게임이 저장한 세션으로 복원할 때(gameSessionComesFirst). */
function supabaseRestoreSkipped(client) {
    return !client || gameSessionComesFirst();
}

/** 부팅 복원을 게임이 저장한 세션으로 할지: 그 세션에 갱신 토큰이 있고 주소에 로그인 인자(OAuth 응답)가 없을 때. */
function gameSessionComesFirst() {
    let stored = loadStoredCloudSession();
    return !!(stored && stored.refresh_token) && !/[?#].*(access_token|code|error|state)=/i.test(window.location.href || '');
}

async function tryRestoreSupabaseOAuthSession() {
    const owner = cloudState.session, epoch = cloudState.sessionEpoch;
    let client = getSupabaseClient();
    // 게임이 저장한 세션이 있고 주소에 로그인 인자가 없으면 그 세션으로 복원한다(restoreCloudSession). getSession과 onAuthStateChange의 첫 호출은
    // 저장된 토큰이 만료됐으면 스스로 갱신하는데, 그 토큰이 게임 것보다 두 세대 이상 묵었으면 서버가 세션 사슬을 끊어 부팅 직후 로그아웃됐다
    // (2026-11-05). 감시는 게임 세션을 supabase-js에 맞춘 뒤 건다(refreshCloudLinkedIdentities).
    if (supabaseRestoreSkipped(client)) return false;
    watchSupabaseTokenRefresh(client);
    try {
        let { data, error } = await client.auth.getSession();
        if (!isCurrentCloudSession(owner, epoch)) return false;
        if (error) throw error;
        let session = data && data.session;
        if (!session || !session.access_token) return false;
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        let userLabel = session.user && (session.user.email || session.user.id) || '알 수 없음';
        setCloudMessage('로그인됨: ' + userLabel);
        return true;
    } catch (error) {
        console.warn('supabase oauth session restore failed:', error);
        return false;
    }
}

function persistCloudSession(session) {
    try {
        localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
        console.warn('failed to persist cloud session:', error);
    }
}

function clearCloudSessionStorage() {
    try {
        localStorage.removeItem(CLOUD_SESSION_STORAGE_KEY);
        getLegacyCloudSessionKeys().forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('failed to clear cloud session storage:', error);
    }
}

/** Sessions kept under an earlier key name (data/constants.js LEGACY_CLOUD_SESSION_KEY_PATTERN). */
function getLegacyCloudSessionKeys() {
    return Object.keys(localStorage).filter(key => LEGACY_CLOUD_SESSION_KEY_PATTERN.test(key));
}

/** A session saved under an earlier key name moves to CLOUD_SESSION_STORAGE_KEY once, so an update keeps the player signed in. */
function adoptLegacyCloudSession() {
    const key = getLegacyCloudSessionKeys()[0];
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (raw) localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, raw);
    localStorage.removeItem(key);
    return raw;
}

function loadStoredCloudSession() {
    try {
        let raw = localStorage.getItem(CLOUD_SESSION_STORAGE_KEY) || adoptLegacyCloudSession();
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('failed to load cloud session:', error);
        return null;
    }
}

function refreshSocialAfterCloudStateChange() {
    if (typeof syncSocialBackgroundTasks === 'function') syncSocialBackgroundTasks();
    if (typeof renderSocialTab !== 'function') return;
    // 채팅이 화면에 있으면(PC 전투 기록 창의 채팅 탭, 휴대폰 채팅 탭) 새 로그인 상태로 다시 그린다.
    if (typeof isSocialTabActive === 'function' && isSocialTabActive()) renderSocialTab();
    if (cloudState.user && typeof checkSocialChatNotification === 'function') {
        Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification refresh failed:', error));
    }
}

/** supabase-js가 저장해 둔 세션의 갱신 토큰. getSession은 만료된 토큰을 갱신해 버리므로 저장소를 바로 읽는다. */
function readSupabaseStoredRefreshToken(client) {
    try {
        let key = (client.auth && client.auth.storageKey) || supabaseSessionStorageKey(getCloudConfig());
        let parsed = JSON.parse(localStorage.getItem(key) || 'null');
        return parsed && parsed.refresh_token ? String(parsed.refresh_token) : '';
    } catch {
        return '';
    }
}

/** 게임이 받은 토큰을 supabase-js에도 넣어 둘이 같은 세대를 쥐게 한다(2026-11-05). 전에는 게임만 갱신하고 supabase-js는 자기 토큰으로
 * 따로 갱신했는데, 서버는 지금 토큰의 바로 직전 것만 봐주고 더 묵은 토큰이 오면 세션 사슬을 끊는다. 탭을 두 시간 넘게 가렸다 돌아오면
 * supabase-js가 두 세대 전 토큰을 내밀어 로그아웃됐다. 이미 같은 토큰이면 보내지 않는다(setSession은 /auth/v1/user를 한 번 읽는다).
 * 아직 만들지 않은 클라이언트는 만들지 않는다. */
function syncSupabaseClientSession() {
    let client = window.supabaseClient || supabaseClient;
    let session = cloudState.session;
    if (!client || !client.auth || typeof client.auth.setSession !== 'function' || !session || !session.access_token || !session.refresh_token) return;
    if (readSupabaseStoredRefreshToken(client) === session.refresh_token) return;
    Promise.resolve(client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }))
        .then(result => { if (result && result.error) console.warn('supabase-js 세션 맞추기 실패:', result.error); })
        .catch(error => console.warn('supabase-js 세션 맞추기 실패:', error));
}

function resetCloudAccountSync(session) {
    const nextUserId = session?.access_token ? session.user?.id || getActiveCloudUserId() : null;
    // Every adopted token supersedes an older in-flight refresh. Account changes also invalidate save reads and confirmations.
    cloudState.tokenRefreshPromise = null;
    if (getActiveCloudUserId() === nextUserId) return;
    cloudState.sessionEpoch++;
    cloudState.lastRemoteRevision = 0;
    cloudState.syncHalted = false;
    cloudState.uploadFailureNoticed = false;
    cloudState.lastUploadedFingerprint = null;
    cloudState.pendingForcedSyncOptions = null;
    cancelScheduledCloudSync();
}

/** Drops the automatic upload waiting to start (an account change, or a restore that moves the server revision itself). */
function cancelScheduledCloudSync() {
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
}

function applyCloudSession(session) {
    let previousUserId = cloudState.user && cloudState.user.id;
    resetCloudAccountSync(session);
    if (!session || !session.access_token) {
        cloudState.session = null;
        cloudState.user = null;
        cloudState.isLoaded = false;
        clearCloudSessionStorage();
        updateCloudSaveUI();
        if (previousUserId) refreshSocialAfterCloudStateChange();
        cloudSessionGuard.syncSession();
        return;
    }
    let expiresAt = Number(session.expires_at) || 0;
    if (!expiresAt && Number(session.expires_in) > 0) expiresAt = Math.floor(Date.now() / 1000) + Math.floor(Number(session.expires_in));
    cloudState.session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || (cloudState.session && cloudState.session.refresh_token) || '',
        expires_at: expiresAt,
        token_type: session.token_type || 'bearer',
        user: session.user || cloudState.user || null
    };
    cloudState.user = cloudState.session.user;
    cloudState.isLoaded = false;
    cloudState.tokenExpiryWarned = false;
    persistCloudSession(cloudState.session);
    updateCloudSaveUI();
    if (previousUserId !== (cloudState.user && cloudState.user.id)) refreshSocialAfterCloudStateChange();
    cloudSessionGuard.syncSession();   // 계정이 바뀌면 이 화면의 접속 표를 서버에 적는다(js/cloud-session-guard-ui.js)
    syncSupabaseClientSession();
}

function getCloudSessionExpiresAtMs() {
    let expiresAt = cloudState.session ? Number(cloudState.session.expires_at || 0) : 0;
    return expiresAt > 0 ? expiresAt * 1000 : 0;
}

function notifyCloudSessionExpired(message) {
    let text = message || '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
    setCloudMessage(text);
    if (!cloudState.tokenExpiryWarned && typeof addLog === 'function') addLog(`⚠️ ${text}`, 'loot-rare');
    cloudState.tokenExpiryWarned = true;
}

/** 갱신 요청을 서버가 거절했는가(토큰이 틀리거나 만료: 400 invalid_grant, 401, 403). 망 오류, 5xx, 429는 거절이 아니라 잠시 못 닿은 것이다. */
function isCloudAuthRejection(error) {
    let status = Number(error && error.status);
    return status === 400 || status === 401 || status === 403;
}

/** supabase-js(persistSession)가 들고 있는 세션. 없거나 게임과 같은 refresh_token이면 null: 게임의 갱신이
 * 거절됐을 때(400 invalid_grant) 그쪽이 먼저 갱신한 새 토큰을 이어받아 로그아웃을 피한다(2026-10-27 검토의 경쟁 기록). */
async function readSupabaseClientSession() {
    let client = getSupabaseClient();
    if (!client || !client.auth) return null;
    try {
        let { data } = await client.auth.getSession();
        let session = data && data.session;
        if (!session || !session.access_token || !session.refresh_token) return null;
        return cloudState.session && session.refresh_token === cloudState.session.refresh_token ? null : session;
    } catch (error) {
        console.warn('supabase-js 세션 읽기 실패:', error);
        return null;
    }
}

/** A rejected old refresh cannot clear a newer token or adopt another account's SDK session. */
function isCurrentCloudSession(owner, epoch) {
    return cloudState.session === owner && cloudState.sessionEpoch === epoch;
}

function hasNewerCloudSession(owner, epoch) {
    return cloudState.sessionEpoch === epoch && getActiveCloudUserId() === owner.user?.id && hasUsableCloudSessionToken();
}

async function recoverCloudSessionRefresh(owner, error) {
    if (cloudState.session !== owner) return undefined;
    console.warn('cloud token refresh failed:', error);
    if (!isCloudAuthRejection(error)) {
        setCloudMessage(_t('클라우드 로그인 갱신을 못 했습니다(연결 상태). 잠시 뒤 다시 시도합니다.'));
        return undefined;
    }
    // The SDK may have already refreshed this same account; unrelated or superseded sessions are never adopted.
    const adopted = await readSupabaseClientSession();
    return adopted?.user?.id === owner.user?.id ? adopted : null;
}

async function refreshCloudSession(reason) {
    const owner = cloudState.session, epoch = cloudState.sessionEpoch;
    if (!owner || !owner.refresh_token) {
        notifyCloudSessionExpired('클라우드 로그인 갱신 정보가 없습니다. 다시 로그인해주세요.');
        return false;
    }
    if (cloudState.tokenRefreshPromise) return await cloudState.tokenRefreshPromise;
    const pending = (async () => {
        try {
            setCloudMessage(reason ? _t('클라우드 로그인 갱신 중... ({reason})', { reason }) : '클라우드 로그인 갱신 중...');
            let refreshed = await cloudJsonRequest('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                useAuth: false,
                body: { refresh_token: owner.refresh_token }
            });
            if (cloudState.session !== owner) return hasNewerCloudSession(owner, epoch);
            applyCloudSession(refreshed);
            setCloudMessage(_t('클라우드 로그인 세션을 자동 갱신했습니다.'));
            return true;
        } catch (error) {
            const adopted = await recoverCloudSessionRefresh(owner, error);
            if (cloudState.session !== owner) return hasNewerCloudSession(owner, epoch);
            if (adopted === undefined) return false;
            applyCloudSession(adopted);
            if (adopted) { setCloudMessage(_t('클라우드 로그인 세션을 이어받았습니다.')); return true; }
            notifyCloudSessionExpired('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            return false;
        }
    })();
    cloudState.tokenRefreshPromise = pending;
    try { return await pending; } finally {
        if (cloudState.tokenRefreshPromise === pending) cloudState.tokenRefreshPromise = null;
        updateCloudSaveUI();
    }
}

async function ensureCloudSessionFresh(reason) {
    if (!cloudState.session || !cloudState.session.access_token) return false;
    let expiresAtMs = getCloudSessionExpiresAtMs();
    if (!expiresAtMs) return true;
    let remaining = expiresAtMs - Date.now();
    if (remaining <= CLOUD_TOKEN_REFRESH_LEEWAY_MS) return await refreshCloudSession(reason || '만료 예정');
    if (remaining <= CLOUD_TOKEN_EXPIRY_WARNING_MS && !cloudState.tokenExpiryWarned) notifyCloudSessionExpired('클라우드 로그인 세션이 곧 만료됩니다. 만료 전 자동 갱신 예정입니다.');
    return true;
}

/** A cloud request's headers: the anon key, the session token unless useAuth is false, and JSON for an object body. */
function cloudRequestHeaders(config, options, body) {
    // x-rignin-session: 이 화면의 접속 표(js/cloud-session-guard-ui.js). 다른 기기가 그 뒤에 접속했으면 서버가 저장과 전당 요청을 거절한다.
    let headers = { apikey: config.supabaseAnonKey, ...cloudSessionGuard.requestHeaders(options), ...(options.headers || {}) };
    if (options.useAuth !== false && cloudState.session && cloudState.session.access_token) headers.Authorization = `Bearer ${cloudState.session.access_token}`;
    if (body !== undefined && typeof body !== 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return headers;
}

async function cloudJsonRequest(path, options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) throw new Error('cloud-save-config.js 설정이 비어 있습니다.');
    if (options.useAuth !== false) {
        let fresh = await ensureCloudSessionFresh('요청 전 확인');
        if (!fresh) throw new Error(cloudState.session ? '클라우드 로그인 갱신을 못 했습니다. 연결을 확인한 뒤 다시 시도해주세요.' : '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }
    cloudSessionGuard.assertActive();
    if (options.expectedUserId && options.expectedUserId !== getActiveCloudUserId()) throw new Error('로그인 계정이 변경되어 작업을 중단했습니다.');
    const requestEpoch = cloudState.sessionEpoch;
    let body = options.body, headers = cloudRequestHeaders(config, options, body);
    // onSend: the request is about to leave (after the token and account checks above), for callers that must know it went out
    if (options.onSend) options.onSend();
    // The deadline includes reading the body, not only receiving HTTP headers. A lost reply may still mean the server committed:
    // callers keep their existing conflict/unknown-result recovery; a timed-out mutation is never retried here.
    async function readResponse() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(config.supabaseUrl + path, {
                method: options.method || 'GET', headers, signal: controller.signal,
                body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
            });
            return { response, text: await response.text() };
        } catch (error) {
            if (controller.signal.aborted) throw Object.assign(new Error(_t('서버 응답 시간이 초과되었습니다. 연결을 확인해 주세요.')), { code: 'CLOUD_REQUEST_TIMEOUT' });
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }
    let { response, text } = await readResponse();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }
    }
    if (!response.ok) {
        if (cloudState.sessionEpoch === requestEpoch) cloudSessionGuard.noteServerRefusal(data, headers['x-rignin-session']);
        throw Object.assign(new Error(describeCloudServerError(data, response.status)), { status: response.status });
    }
    return data;
}

function describeCloudServerError(data, status) {
    const message = data && (data.msg || data.error_description || data.message || data.error);
    return CLOUD_SERVER_ERROR_TEXT[message] || message || `HTTP ${status}`;
}

function collectCloudCredentials() {
    let emailEl = document.getElementById('startup-email');
    let passwordEl = document.getElementById('startup-password');
    return {
        email: emailEl ? String(emailEl.value || '').trim() : '',
        password: passwordEl ? String(passwordEl.value || '') : ''
    };
}

function hasAcceptedRequiredLegalPolicies() {
    let terms = document.getElementById('startup-terms-consent');
    let privacy = document.getElementById('startup-privacy-consent');
    return !!(terms && terms.checked && privacy && privacy.checked);
}

function requireLegalPolicyConsent() {
    if (hasAcceptedRequiredLegalPolicies()) return true;
    setCloudMessage(_t('회원가입하려면 필수 약관 두 항목에 동의해주세요.'));
    return false;
}

function setStartupRegistrationMode(active) {
    let consent = document.getElementById('startup-signup-consent');
    let signupBtn = document.getElementById('btn-startup-signup');
    if (consent) consent.hidden = !active;
    if (!signupBtn) return;
    signupBtn.innerText = active ? _t('동의하고 회원가입') : _t('회원가입');
    signupBtn.setAttribute('aria-expanded', String(active));
}

function clearCloudPasswordInput() {
    let passwordEl = document.getElementById('startup-password');
    if (passwordEl) passwordEl.value = '';
}

/** Entering the game from the start screen, in this order: the loaded save's stamp is read, the battle art loads, play starts and the
 * start screen closes, the battlefield is drawn and the loading screen closes, a save without a class asks for one, the time away is
 * settled, and only then the guide cards wake (js/tutorial-ui.js showNextTutorial waits for gameEntryRunning). Before 2026-11-10 the
 * cards woke by themselves when the start screen closed, and the save they made there moved the stamp before the settlement read it
 * (v0.3.57 to v0.3.59: no launch settled). Until the settlement reads the save's playedUntil, no save moves it
 * (launchSettlementPending, js/save.js touchSaveMeta). */
async function enterGameWorld() {
    gameEntryRunning = true;
    backgroundCombatRuntime.launchSettlementPending = true;
    try {
        advanceLoadingOverlay({ title: _t('전장을 불러오는 중...'), detail: _t('전투 로그와 캐릭터 상태를 복원하고 있습니다.'), caption: _t('진행 복원'), progress: 48 });
        await ensureBattleAssetsLoadedBeforeEntry();
        gameplayStarted = true;
        setStartupOverlayActive(false);
        if (typeof syncInitialPlayerProfile === 'function') syncInitialPlayerProfile(); // 이 계정의 캐릭터로 들어섰다(js/social.js profileSnapshotIsOwn)
        showBattlefieldOnEntry();
        await closeLoadingOnEntry();
        ensureInitialHeroSelection();
        await settleAwayOnEntry();
    } finally {
        gameEntryRunning = false;
        backgroundCombatRuntime.launchSettlementPending = false;
    }
    showNextTutorial();
}

/** The battle tab with every window closed, drawn once under the loading screen. A failure here leaves the entry going. */
function showBattlefieldOnEntry() {
    try {
        if (typeof closeAllWindows === 'function') closeAllWindows();
        if (typeof closeCommunityDock === 'function') closeCommunityDock();
        if (typeof syncBattleTabLayout === 'function') syncBattleTabLayout(false);
        switchTab('tab-battle');
        updateStaticUI();
    } catch (error) {
        console.error('main battlefield setup on enterGameWorld failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield on enterGameWorld failed:', error);
    }
}

async function closeLoadingOnEntry() {
    try {
        await finishLoadingOverlay();
    } catch (error) {
        console.error('finishLoadingOverlay on enterGameWorld failed:', error);
    }
    setLoadingOverlayState(false);
}

async function settleAwayOnEntry() {
    try {
        await startOfflineCombatReturn(Date.now());
    } catch (error) {
        console.error('offline combat replay failed:', error);
    }
}

async function continueWithCloudSession() {
    if (!cloudState.user || cloudState.busy) return;
    cloudState.busy = true;
    setLoadingOverlayState(true, {
        title: _t('계정 저장을 여는 중...'),
        detail: _t('서버 저장을 확인하고 있습니다.'),
        caption: _t('서버 확인'),
        progress: 14
    });
    setCloudMessage(_t('서버 저장을 확인하고 있습니다...'));
    updateCloudSaveUI();
    try {
        advanceLoadingOverlay({
            title: _t('계정 저장을 불러오는 중...'),
            detail: _t('서버 저장과 이 기기의 계정 저장을 맞추고 있습니다.'),
            caption: _t('계정 저장'),
            progress: 48
        });
        await enterAccountSave();
        await enterGameWorld();
    } catch (error) {
        setCloudMessage('계정 저장 열기 실패: ' + (error.message || error));
        setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        refreshSocialAfterCloudStateChange();
    }
}

/** 시작 화면의 다른 계정 사용: 계정 모드였으면 그 계정에서 나오고(leaveAccountForGuest), 이 기기의 로그인을 지운다. */
async function prepareStartupAccountSwitch() {
    if (cloudState.busy) return;
    setStartupRegistrationMode(false);
    if (getSaveSlot().kind === 'account') await leaveAccountForGuest();
    else detachCloudSessionLocally();
    setCloudMessage(_t('다른 계정으로 로그인할 수 있습니다.'));
    updateCloudSaveUI();
}

function returnFromStartupGate() {
    if (!gameplayStarted || cloudState.busy) return;
    setStartupOverlayActive(false);
    updateCloudSaveUI();
}

async function startGuestMode() {
    if (cloudState.busy) return;
    if (cloudState.user && !await requestGameConfirmation(_t('계정에서 나와 이 기기의 게스트 저장으로 시작합니다. 계정 저장은 서버와 이 기기에 남습니다.'), {
        title: _t('게스트로 시작'),
        tone: 'warning',
        confirmLabel: _t('게스트로 시작')
    })) return;
    if (cloudState.user) await leaveAccountForGuest();
    setCloudMessage(_t('게스트 모드로 시작합니다. 이 기기 저장만 사용합니다.'));
    setLoadingOverlayState(true, {
        title: _t('게스트 세션을 준비하는 중...'),
        detail: _t('현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다.'),
        caption: _t('이 기기 저장'),
        progress: 22
    });
    enterGameWorld();
}

function startupLogin() {
    setStartupRegistrationMode(false);
    cloudLogin({ source: 'startup', enterGame: true });
}

function startupSignUp() {
    let consent = document.getElementById('startup-signup-consent');
    if (consent && consent.hidden) {
        setStartupRegistrationMode(true);
        setCloudMessage(_t('회원가입을 위해 필수 약관을 확인하고 동의해주세요.'));
        return;
    }
    if (!requireLegalPolicyConsent()) return;
    cloudSignUp({ source: 'startup', enterGame: true });
}

async function refreshCloudLinkedIdentities() {
    let client = getSupabaseClient();
    if (!client || !cloudState.user) {
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = cloudState.user ? 'needs_login' : 'idle';
        return [];
    }
    try {
        if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
            try {
                await client.auth.setSession({
                    access_token: cloudState.session.access_token,
                    refresh_token: cloudState.session.refresh_token
                });
            } catch (sessionSyncError) {
                console.warn('supabase session sync failed before identity lookup:', sessionSyncError);
            }
        }
        watchSupabaseTokenRefresh(client);   // 저장된 세션을 게임 것으로 맞춘 뒤에 건다: 첫 호출이 저장된 만료 토큰을 갱신한다(2026-11-05)
        let sessionResult = await client.auth.getSession();
        if (sessionResult && sessionResult.error) throw sessionResult.error;
        let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        if (!session || !session.access_token) {
            cloudState.linkedProviders = [];
            cloudState.identityLookupState = 'needs_login';
            setCloudMessage(_t('로그인 후 이용 가능합니다'));
            return [];
        }
        let providers = [];
        if (client.auth && typeof client.auth.getUserIdentities === 'function') {
            let { data, error } = await client.auth.getUserIdentities();
            if (error) throw error;
            let identities = data && (data.identities || data.user_identities) ? (data.identities || data.user_identities) : [];
            providers = identities.map(it => it && (it.provider || it.identity_provider)).filter(Boolean);
        } else {
            let { data, error } = await client.auth.getUser();
            if (error) throw error;
            let identities = data && data.user && Array.isArray(data.user.identities) ? data.user.identities : [];
            providers = identities.map(it => it && it.provider).filter(Boolean);
        }
        cloudState.linkedProviders = Array.from(new Set(providers));
        cloudState.identityLookupState = 'ready';
        return cloudState.linkedProviders;
    } catch (error) {
        console.warn('failed to load linked identities:', error);
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = 'needs_login';
        return [];
    }
}

async function linkGoogleAccount() {
    return await linkSocialIdentityProvider('google');
}

async function linkKakaoAccount() {
    return await linkSocialIdentityProvider('kakao');
}

async function linkSocialIdentityProvider(provider) {
    if (!cloudState.user) return setCloudMessage(_t('먼저 로그인해주세요.'));
    await refreshCloudLinkedIdentities();
    let providerKey = String(provider || '').toLowerCase();
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
    let alreadyLinked = linkedProviders.some(it => String(it || '').toLowerCase() === providerKey);
    if (alreadyLinked) return setCloudMessage(_t('{provider} 계정은 이미 연동되어 있습니다.', { provider: provider === 'google' ? 'Google' : _t('카카오') }));
    let client = getSupabaseClient();
    if (!client) return setCloudMessage(_t('소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.'));
    // Supabase Dashboard > Authentication에서 Manual Identity Linking 옵션이 켜져 있어야 동작합니다.
    if (typeof client.auth.linkIdentity !== 'function') return setCloudMessage(_t('이 환경에서는 소셜 계정 연결을 지원하지 않습니다.'));
    if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
        try {
            await client.auth.setSession({
                access_token: cloudState.session.access_token,
                refresh_token: cloudState.session.refresh_token
            });
        } catch (sessionSyncError) {
            console.warn('supabase session sync failed before linkIdentity:', sessionSyncError);
        }
    }
    let sessionResult = await client.auth.getSession();
    if (sessionResult && sessionResult.error) return setCloudMessage(_t('로그인 후 이용 가능합니다'));
    let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    if (!session || !session.access_token) return setCloudMessage(_t('로그인 후 이용 가능합니다'));
    cloudState.busy = true;
    setCloudMessage(_t('{provider} 계정 연결을 시작합니다...', { provider: provider === 'google' ? 'Google' : _t('카카오') }));
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        let { data, error } = await client.auth.linkIdentity({ provider, options });
        if (error) throw error;
        await openSocialOAuthResult(provider, data);
    } catch (error) {
        setCloudMessage('소셜 계정 연결 시작 실패: ' + (error.message || error));
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function updateCloudSaveUI() {
    let pill = document.getElementById('ui-cloud-status-pill');
    let config = getCloudConfig();
    cloudState.configured = config.enabled;
    let hintEl = document.getElementById('ui-cloud-config-hint');
    let userEl = document.getElementById('ui-cloud-user');
    let localEl = document.getElementById('ui-cloud-local-save');
    let uploadProfileEl = document.getElementById('ui-cloud-upload-profile');
    let msgEl = document.getElementById('ui-cloud-message');
    let openGateBtn = document.getElementById('btn-cloud-open-gate');
    let canSync = config.enabled && !cloudState.busy && !!cloudState.user;

    if (pill) renderCloudStatusPill(pill, config);
    if (!config.enabled) {
        if (hintEl) hintEl.innerText = _t('이 버전은 클라우드 저장을 쓰지 않습니다. 진행은 이 기기에 저장됩니다.');
    } else if (cloudState.busy) {
        if (hintEl) hintEl.innerText = _t('서버와 저장을 맞추고 있습니다.');
    } else if (cloudState.user) {
        if (hintEl) hintEl.innerText = _t('서버 저장이 기준입니다. 이 기기의 변경은 자동으로 서버에 올립니다. 계정 변경은 시작 화면에서 합니다.');
    } else {
        if (hintEl) hintEl.innerText = _t('게스트 저장은 이 기기에만 있습니다. 로그인과 회원가입은 시작 화면에서 합니다.');
    }
    if (pill && cloudState.lastMessage && /실패|오류/.test(cloudState.lastMessage) && !cloudState.busy) pill.classList.add('error');

    if (openGateBtn) openGateBtn.disabled = cloudState.busy;
    ['btn-cloud-logout', 'btn-cloud-pull', 'btn-cloud-delete'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.disabled = !canSync;
    });
    renderCloudSlotStatus(canSync);
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders.map(it => String(it || '').toLowerCase()) : [];
    let isGoogleLinked = linkedProviders.includes('google');
    let isKakaoLinked = linkedProviders.includes('kakao');
    let linkGoogleBtn = document.getElementById('btn-cloud-link-google');
    let linkKakaoBtn = document.getElementById('btn-cloud-link-kakao');
    if (linkGoogleBtn) {
        linkGoogleBtn.disabled = !canSync || isGoogleLinked;
        linkGoogleBtn.innerHTML = isGoogleLinked
            ? '<span>Google 연동됨</span>'
            : '<img src="assets/ui/login-google-mark.png" alt="" width="20" height="20"><span>Google 계정 연결</span>';
    }
    if (linkKakaoBtn) {
        linkKakaoBtn.disabled = !canSync || isKakaoLinked;
        linkKakaoBtn.innerHTML = isKakaoLinked
            ? '<span>카카오 연동됨</span>'
            : '<img src="assets/ui/login-kakao.png" alt="카카오 계정 연결" width="366" height="90">';
    }
    if (userEl) userEl.innerText = cloudState.user && cloudState.user.email ? cloudState.user.email : (cloudState.user && cloudState.user.id ? cloudState.user.id : (config.enabled ? '로그인 안 됨' : '설정 필요'));
    if (localEl) localEl.innerText = formatCloudTime(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0);
    if (uploadProfileEl) uploadProfileEl.innerText = formatCloudUploadProfile(game && game.saveMeta ? game.saveMeta.lastCloudUploadProfile : null);
    let identitiesEl = document.getElementById('ui-cloud-identities');
    if (identitiesEl) {
        let providers = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
        if (!cloudState.user || cloudState.identityLookupState === 'needs_login') {
            identitiesEl.innerText = _t('로그인 필요');
        } else {
            identitiesEl.innerText = providers.length ? providers.join(', ') : _t('연결된 소셜 계정 없음');
        }
    }
    if (msgEl) msgEl.innerText = cloudState.lastMessage || _t('대기 중');
    updateStartupScreenUI();
}

/** The cloud panel's status pill: not configured, busy, signed in (with pending changes or not), or a guest. */
function renderCloudStatusPill(pill, config) {
    pill.className = 'cloud-status-pill';
    if (!config.enabled) {
        pill.innerText = _t('미설정');
    } else if (cloudState.busy) {
        pill.classList.add('syncing');
        pill.innerText = _t('처리 중');
    } else if (cloudState.user) {
        pill.classList.add('online');
        pill.innerText = _t(isCloudSaveDirty() ? '연결됨, 안 올린 변경 있음' : '연결됨');
    } else {
        pill.innerText = _t('게스트');
    }
}

/** The slot lines of the cloud panel: the server's last save time, pending changes, and the guest save move button. */
function renderCloudSlotStatus(canSync) {
    const account = !!cloudState.user && getSaveSlot().kind === 'account';
    let remoteEl = document.getElementById('ui-cloud-remote-save');
    if (remoteEl) remoteEl.innerText = account ? formatCloudTime(game && game.saveMeta ? game.saveMeta.lastCloudSyncAt : 0) : _t('없음');
    let pendingEl = document.getElementById('ui-cloud-pending');
    if (pendingEl) pendingEl.innerText = _t(cloudState.user ? (isCloudSaveDirty() ? '있음' : '없음') : '게스트 저장은 올리지 않습니다');
    let moveGuestBtn = document.getElementById('btn-cloud-move-guest');
    if (!moveGuestBtn) return;
    moveGuestBtn.hidden = !canMoveGuestSaveIntoAccount();
    moveGuestBtn.disabled = !canSync;
}

function formatCloudUploadProfile(profile) {
    let normalized = normalizeCloudUploadProfile(profile);
    if (!normalized || normalized.totalMs <= 0) return '없음';
    let sizeKb = (normalized.payloadBytes / 1024).toFixed(1);
    return _t('{totalMs}ms (직렬화 {serializeMs}ms, 전송 {uploadMs}ms, {sizeKb}KB)', { totalMs: normalized.totalMs, serializeMs: normalized.serializeMs, uploadMs: normalized.uploadMs, sizeKb });
}

function rememberCloudUploadProfile(profile, owner = game) {
    let normalized = normalizeCloudUploadProfile(profile);
    if (!normalized) return null;
    ensureSaveMeta(owner);
    normalized.at = normalized.at || Date.now();
    owner.saveMeta.lastCloudUploadProfile = normalized;
    cloudState.lastSyncProfile = normalized;
    return normalized;
}

function getCloudSaveOwnerId(snapshot = game) {
    let ownerId = snapshot && snapshot.saveMeta && snapshot.saveMeta.cloudUserId;
    return typeof ownerId === 'string' && ownerId.trim() ? ownerId : null;
}

function getActiveCloudUserId() {
    let userId = cloudState.user && cloudState.user.id;
    return typeof userId === 'string' && userId.trim() ? userId : null;
}

function markCurrentSaveCloudOwner() {
    let userId = getActiveCloudUserId();
    if (!userId) return false;
    ensureSaveMeta();
    game.saveMeta.cloudUserId = userId;
    return true;
}

/** The running game was replaced by a loaded save (a server save, or a slot just selected): restarts what depends on it, combat runtimes,
 * hero selection, passives and the screens. */
function refreshRuntimeForLoadedSave() {
    discardQueuedNotices();
    recoverRuntimeState();
    applyLoadedSaveLook();
    resetCombatRuntimesForLoadedSave();
    resetHeroSelectionForSave();
    refreshPassiveVisibility();
    refreshTabHeaderUiIfNeeded();
    calculateReachableNodes();
    normalizeSupportLoadout(false);
    try {
        updateStaticUI();
    } catch (error) {
        console.error('updateStaticUI after save load failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield after save load failed:', error);
    }
    updateCloudSaveUI();
}

/** The server save becomes this device's copy of the account save: the slot takes it with the server's revision and time and nothing
 * pending (progress this device had not uploaded is gone from here on; enterAccountSave offered it as a file first). */
function applyExternalSave(snapshot, sourceStamp) {
    assertSaveFromKnownBuild(snapshot);
    window.playerGuideUi?.dismissReplay(false);
    game = mergeDefaults(snapshot || {});
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    markCurrentSaveCloudOwner();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(cloudState.lastRemoteRevision) || 0));
    game.saveMeta.cloudPending = false;
    if (sourceStamp) {
        cloudState.lastRemoteUpdatedAt = sourceStamp;
        game.saveMeta.lastCloudSyncAt = Math.max(game.saveMeta.lastCloudSyncAt || 0, sourceStamp);
        if (!game.saveMeta.lastModifiedAt) game.saveMeta.lastModifiedAt = sourceStamp;
        if (!(game.saveMeta.playedUntil > 0)) game.saveMeta.playedUntil = game.saveMeta.lastModifiedAt;
    }
    cloudState.syncHalted = false;
    if (!persistLocalSave({ touchModifiedAt: false, allowRecoveryWrite: true })) {
        throw new Error('클라우드 저장을 로컬에 기록하지 못했습니다.');
    }
    refreshRuntimeForLoadedSave();
}

async function restoreCloudSession() {
    let stored = loadStoredCloudSession();
    if (!stored || !stored.access_token) return false;
    if (stored.refresh_token) {
        resetCloudAccountSync(stored);
        cloudState.session = stored;
        cloudState.user = stored.user || null;
        const epoch = cloudState.sessionEpoch;
        const refreshed = await refreshCloudSession('저장된 세션 복원');
        if (cloudState.sessionEpoch !== epoch) return false;
        if (refreshed) return true;
        if (!cloudState.session) return false;   // 서버가 거절해 지웠다
        // 갱신에 못 닿았지만 세션은 남겼다: 토큰이 아직 살아 있으면 그대로 쓰고, 끝났으면 이번 실행은 로그인 없이 가되
        // 저장된 세션은 두어 다음 실행 때 다시 시도한다(전: 망이 끊긴 채 켜면 로그아웃).
        if (cloudState.user && getCloudSessionExpiresAtMs() - Date.now() > CLOUD_TOKEN_REFRESH_LEEWAY_MS) {
            setCloudMessage(_t('클라우드 로그인 갱신은 못 했지만 기존 로그인으로 계속합니다.'));
            cloudSessionGuard.syncSession();   // 갱신이 성공할 때처럼 접속 표를 적고 읽기 시작한다(전: 다음 갱신까지 중복 접속을 못 막았다)
            return true;
        }
        resetCloudAccountSync(null);
        cloudState.session = null;
        cloudState.user = null;
        cloudSessionGuard.syncSession();
        setCloudMessage(_t('연결이 없어 저장된 로그인을 확인하지 못했습니다. 다음 실행 때 다시 시도합니다.'));
        return false;
    }
    clearCloudSessionStorage();
    setCloudMessage(_t('저장된 클라우드 세션에 갱신 토큰이 없습니다. 다시 로그인해주세요.'));
    return false;
}

async function fetchLatestCloudSaveRow(userId, select) {
    let rows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}&order=updated_at.desc.nullslast&limit=1`, {
        expectedUserId: userId, headers: { Accept: 'application/json' }
    });
    if (Array.isArray(rows) && rows[0]) return rows[0];
    let fallback = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${encodeURIComponent(userId)}&select=${select}`, {
        expectedUserId: userId, headers: { Accept: 'application/json' }
    });
    return (Array.isArray(fallback) ? fallback : []).filter(Boolean).sort((a, b) => {
        let at = a.updated_at ? (new Date(a.updated_at).getTime() || 0) : 0;
        let bt = b.updated_at ? (new Date(b.updated_at).getTime() || 0) : 0;
        return bt - at;
    })[0] || null;
}

/** What every server read leaves behind: revision and update time, for the account entry, the hall and the cloud panel. */
function rememberCloudRecord(record) {
    cloudState.isLoaded = true;
    cloudState.revisionSupported = true;
    cloudState.lastRemoteCheckedAt = Date.now();
    if (record && record.updated_at) cloudState.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
    cloudState.lastRemoteRevision = record ? Math.max(0, Math.floor(Number(record.revision) || 0)) : 0;
    updateCloudSaveUI();
    return record;
}

/** A summary row as a record whose save_data holds only season, loopCount and saveMeta. A full row passes through. */
function cloudSummaryRecord(row) {
    if (!row || row.save_data !== undefined) return row;
    let empty = row.season == null && row.loopCount == null && row.saveMeta == null;
    return { user_id: row.user_id, updated_at: row.updated_at, revision: row.revision, summaryOnly: true,
        save_data: empty ? null : { season: row.season, loopCount: row.loopCount, saveMeta: row.saveMeta || {} } };
}

/** The entry check's read: a few hundred bytes instead of the whole save. An odd row (no summary fields) reads the full save. */
async function fetchCloudSaveSummary() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    const context = captureCloudSaveContext();
    let row = await fetchLatestCloudSaveRow(context.userId, `user_id,updated_at,revision,${CLOUD_SAVE_SUMMARY_FIELDS}`);
    assertCloudSaveContext(context);
    let record = cloudSummaryRecord(row);
    if (row && !record.save_data) return await fetchCloudSaveRecord();
    return rememberCloudRecord(record);
}

async function fetchCloudSaveRecord() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    const context = captureCloudSaveContext();
    try {
        const record = await fetchLatestCloudSaveRow(context.userId, 'user_id,save_data,updated_at,revision');
        assertCloudSaveContext(context);
        return rememberCloudRecord(record);
    } catch (error) {
        assertCloudSaveContext(context);
        cloudState.isLoaded = false;
        updateCloudSaveUI();
        throw error;
    }
}

function getLocalCloudRevision() {
    ensureSaveMeta();
    return Math.max(0, Math.floor(Number(game.saveMeta.cloudRevision) || 0));
}

function getRemoteSaveStamp(record) {
    if (!record) return 0;
    return record.updated_at ? (new Date(record.updated_at).getTime() || 0) : ((record.save_data && record.save_data.saveMeta && record.save_data.saveMeta.lastModifiedAt) || 0);
}

function getSaveLoopNumber(snapshot) {
    let s = snapshot || {};
    let season = Math.max(1, Math.floor(Number(s.season) || 1));
    let loopCount = Math.max(0, Math.floor(Number(s.loopCount) || 0));
    return Math.max(season, loopCount + 1);
}

/** A save nobody has played yet (a fresh default): the guest save moves into an account only over such a save. */
function isLikelyBootstrapLocalSave(snapshot) {
    let s = snapshot || game || {};
    let hasProgress = false;
    if ((s.level || 1) > 1) hasProgress = true;
    if ((s.exp || 0) > 0) hasProgress = true;
    if ((s.season || 1) > 1) hasProgress = true;
    if ((s.loopCount || 0) > 0) hasProgress = true;
    if ((s.maxZoneId || 0) > 0) hasProgress = true;
    if ((s.killsInZone || 0) > 0) hasProgress = true;
    if ((s.loopKills || 0) > 0) hasProgress = true;
    if ((s.loopDeaths || 0) > 0) hasProgress = true;
    if (Array.isArray(s.inventory) && s.inventory.length > 0) hasProgress = true;
    if (s.equipment && Object.values(s.equipment).some(Boolean)) hasProgress = true;
    if (Array.isArray(s.passives) && s.passives.length > 0) hasProgress = true;
    if ((s.passivePoints || 0) > 0) hasProgress = true;
    if (Array.isArray(s.skills) && s.skills.some(name => name && name !== '기본 공격')) hasProgress = true;
    if (s.activeSkill && s.activeSkill !== '기본 공격') hasProgress = true;
    // 기본 공격의 룬은 새 게임에도 있다(defaultGame.gemData): 그 밖의 룬이 있어야 진행이다.
    if (Object.keys(s.gemData || {}).some(key => !(key in (defaultGame.gemData || {})))) hasProgress = true;
    if (Array.isArray(s.supports) && s.supports.length > 0) hasProgress = true;
    if (s.supportGemData && Object.keys(s.supportGemData).length > 0) hasProgress = true;
    if (s.currencies && Object.keys(s.currencies).some(key => (s.currencies[key] || 0) > 0)) hasProgress = true;
    return !hasProgress;
}

/** The summary decided to pull: read the whole save once (a summary is never applied). */
async function readFullCloudSaveForPull() {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) throw new Error('서버 저장을 다시 읽지 못해 불러오기를 멈췄습니다. 잠시 뒤 다시 확인합니다.');
    return record;
}

/** The server save moved past this device's copy (another device committed): nothing from here goes up until the account is entered again. */
function cloudRevisionConflictError() {
    return Object.assign(new Error('다른 기기에서 서버 저장이 바뀌어 이 기기의 진행은 올리지 않았습니다. 시작 화면에서 계정 저장으로 다시 들어가면 서버 저장으로 이어집니다.'),
        { code: CLOUD_REVISION_CONFLICT_CODE });
}

/** One commit (db/cloud-and-playtest.sql commit_cloud_save): the server takes the save only at the revision this copy was taken from. */
async function commitCloudSavePayload(payload, options = {}) {
    let rows = await cloudJsonRequest('/rest/v1/rpc/commit_cloud_save', {
        method: 'POST',
        expectedUserId: options.expectedUserId,
        headers: { 'Content-Type': 'application/json' },
        body: { expected_revision: options.expectedRevision ?? getLocalCloudRevision(), next_save_data: payload }
    });
    let result = Array.isArray(rows) ? rows[0] : rows;
    if (!result || result.committed !== true) {
        cloudState.lastRemoteRevision = Math.max(0, Math.floor(Number(result && result.current_revision) || 0));
        throw cloudRevisionConflictError();
    }
    cloudState.revisionSupported = true;
    return {
        revision: Math.max(0, Math.floor(Number(result.current_revision) || 0)),
        updated_at: result.saved_at || new Date().toISOString()
    };
}

/** A commit acknowledges the body that was sent, not progress made while its reply was on the way. Advance the revision but keep
 * later changes pending (also for page-exit replies). The slot is written so a closed page keeps both the revision and that progress. */
function rememberCloudCommit(row, fingerprint) {
    const owner = window.playerGuideUi?.liveGame() ?? game;
    ensureSaveMeta(owner);
    const meta = owner.saveMeta;
    meta.cloudRevision = Math.max(0, Math.floor(Number(row.revision) || 0));
    meta.lastCloudSyncAt = row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
    meta.cloudPending = cloudSaveFingerprint(createCloudSyncPayload(owner)) !== fingerprint;
    cloudState.lastRemoteRevision = meta.cloudRevision;
    cloudState.lastRemoteUpdatedAt = meta.lastCloudSyncAt;
    cloudState.lastCloudCommitAt = Date.now();
    cloudState.syncHalted = false;
    cloudState.uploadFailureNoticed = false;
    cloudState.lastUploadedFingerprint = fingerprint;
    persistLocalSave({ touchModifiedAt: false });
}

/** Uploads this device's copy of the account save as the next revision. The server refuses it when another device committed since
 * (commitCloudSavePayload); clocks and loop numbers decide nothing. Only the signed-in account's own slot goes up. */
async function pushCloudSave() {
    const uploadOwner = game, uploadUserId = getActiveCloudUserId();
    if (!uploadUserId) throw new Error('로그인이 필요합니다.');
    if (getCloudSaveOwnerId() !== uploadUserId || getSaveSlot().userId !== uploadUserId) throw new Error('이 계정의 저장 칸이 아니라 서버에 올리지 않았습니다.');
    if (typeof canPersistLocalSave === 'function' && !canPersistLocalSave()) {
        throw new Error(getLocalSaveStatus().message || '로컬 저장이 차단되어 클라우드 업로드를 중단했습니다.');
    }
    let t0 = Date.now();
    if (!persistLocalSave({ touchModifiedAt: false })) throw new Error('로컬 저장에 실패하여 클라우드 업로드를 중단했습니다.');
    const requestBody = createCloudSaveRequestBody(uploadUserId, uploadOwner);
    let payloadSize = requestBody.length;
    if (payloadSize > 900000 && typeof addLog === 'function') addLog(_t('☁️ 클라우드 저장 데이터 최적화 적용 ({round}KB)', { round: Math.round(payloadSize / 1024) }), 'attack-monster', { noToast: true });
    let tSerialize = Date.now();
    let request = JSON.parse(requestBody);
    let row = await commitCloudSavePayload(request.save_data, { expectedUserId: uploadUserId });
    checkCloudUploadOwner(uploadOwner, uploadUserId);
    let tUpload = Date.now();
    rememberCloudCommit(row, cloudSaveFingerprint(request.save_data));
    rememberCloudUploadProfile({ at: uploadOwner.saveMeta.lastCloudSyncAt, serializeMs: tSerialize - t0, uploadMs: tUpload - tSerialize, totalMs: tUpload - t0, payloadBytes: payloadSize }, uploadOwner);
    persistLocalSave({ touchModifiedAt: false });
    updateCloudSaveUI();
    if (!game.isGuideReplay && typeof syncPlayerProfileQuiet === 'function') syncPlayerProfileQuiet();
    return row;
}

/** The cloud record (a full row or a summary, both carry saveMeta), passed through; throws when this page is an older release than the
 * one that wrote it (js/save.js outdatedBuildError), before any pull, upload or question. */
function cloudRecordForThisBuild(record) {
    assertSaveFromKnownBuild(record && record.save_data);
    return record;
}

/** An upload may finish after logout or a different save load. Never commit that upload into the new session. */
function checkCloudUploadOwner(owner, userId) {
    if ((window.playerGuideUi?.liveGame() ?? game) !== owner || getActiveCloudUserId() !== userId) throw new Error('로그인 계정이나 게임 상태가 바뀌어 클라우드 저장을 중단했습니다.');
}

/** A save operation belongs to one live game, slot and account entry; a token refresh of that same entry is allowed. */
function captureCloudSaveContext() {
    return { owner: game, userId: getActiveCloudUserId(), slotKey: getSaveSlot().key, sessionEpoch: cloudState.sessionEpoch };
}

function assertCloudSaveContext(context) {
    checkCloudUploadOwner(context.owner, context.userId);
    if (getSaveSlot().key !== context.slotKey || cloudState.sessionEpoch !== context.sessionEpoch) throw new Error(_t('로그인 계정이나 게임 상태가 바뀌어 클라우드 저장을 중단했습니다.'));
}

/** The server save replaces this device's copy of the account save (설정의 서버 저장 다시 받기). */
async function pullCloudSave(options = {}) {
    const context = captureCloudSaveContext();
    let record = cloudRecordForThisBuild(await fetchCloudSaveRecord());
    assertCloudSaveContext(context);
    if (!record || !record.save_data) {
        setCloudMessage(_t('서버에 저장이 없습니다.'));
        return null;
    }
    applyExternalSave(record.save_data, getRemoteSaveStamp(record));
    setCloudMessage(_t('서버 저장을 이 기기에 받았습니다.'));
    if (!options.silent) addLog(_t('서버 저장을 받았습니다.'), 'loot-magic');
    return record;
}

/** Entering the account (login, sign-up, 계정 저장으로 이어하기): the server save is the truth (2026-10-30, user decision). The
 * account's slot on this device (js/save.js saveSlot) is read and compared with the server by revision alone:
 * - no server save: this device's copy (or the guest save on sign-up) becomes the first server save;
 * - the server is at this copy's revision: what the copy has not uploaded yet goes up, and play continues from the copy;
 * - the server moved on (another upload, a hall trade or a restore): its full save replaces the copy; progress the copy had not uploaded is dropped, with one
 *   log line (2026-11-01 사용자: 플레이어에게 파일을 받게 하지 않는다).
 * A matching lastModifiedAt is not evidence of our own upload: server trades preserve that client stamp while changing the body.
 * Revision mismatches always read the authoritative full body, including when our own page-exit reply was lost. */
async function enterAccountSave(options = {}) {
    const userId = getActiveCloudUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');
    const context = captureCloudSaveContext();
    const record = cloudRecordForThisBuild(await fetchCloudSaveSummary());
    assertCloudSaveContext(context);
    const previousUserId = getSaveSlot().userId || null;
    activateAccountSaveSlot(userId);
    if (!record || !record.save_data) return await createFirstCloudSave(options.signUp === true);
    const kept = await continueFromAccountCopy(userId);
    if (kept) return kept;
    return await pullAccountSave(userId, previousUserId, options);
}

/** The server moved past this device's copy: its full save replaces the copy. When the read fails, the slot that was in use comes back
 * (전: 이 기기에 사본이 없으면 빈 1레벨 캐릭터가 남았다). Progress is reported dropped only when the copy held something the server body
 * lacks: a page-exit upload whose reply was lost leaves the same content there, and the server's jsonb only reorders its keys. */
async function pullAccountSave(userId, previousUserId, options) {
    const pending = getCloudSaveOwnerId() === userId && game.saveMeta.cloudPending;
    const localPrint = pending ? cloudSaveContentPrint(createCloudSyncPayload(game)) : '';
    let full;
    try {
        full = await readFullCloudSaveForPull();
    } catch (error) {
        if (previousUserId !== userId) loadSaveSlotIntoGame(previousUserId);
        throw error;
    }
    const dropped = pending && localPrint !== cloudSaveContentPrint(full.save_data);
    applyExternalSave(full.save_data, getRemoteSaveStamp(full));
    const note = dropped ? '다른 기기에서 저장한 뒤라 서버 저장으로 이어서 합니다. 이 기기에서 올리지 못한 진행은 지웠습니다.' : '서버 저장으로 이어서 합니다.';
    setCloudMessage(note);
    if (!options.silent) addLog(note, 'loot-magic');
    return 'pulled-server';
}

/** The slot holds this account's copy at the server's revision, read and written without fault: what it has not uploaded yet goes up,
 * and play continues from it (the outcome). Otherwise null, and the server save replaces the copy (a copy that could not be written,
 * write-failed or corrupt, is repaired that way). */
async function continueFromAccountCopy(userId) {
    if (getCloudSaveOwnerId() !== userId || getLocalCloudRevision() !== cloudState.lastRemoteRevision || getLocalSaveStatus().status !== 'ok') return null;
    if (!game.saveMeta.cloudPending) {
        setCloudMessage(_t('이 기기의 계정 저장이 서버와 같아 그대로 이어서 합니다.'));
        return 'cached-current';
    }
    await pushCloudSave();
    setCloudMessage(_t('이 기기에서 아직 올리지 않았던 진행을 서버에 올렸습니다.'));
    return 'pushed-pending';
}

/** Leaves the slot in use (its last state written, when it holds a save) and loads the account's slot into the running game: its copy of
 * the server save, or a fresh default when this device has none. The guest save that stays behind is noted for the move button. */
function activateAccountSaveSlot(userId) {
    if (getSaveSlot().userId === userId) return;
    window.playerGuideUi?.dismissReplay(false);
    if (getLocalSaveStatus().status === 'ok' && canPersistLocalSave()) persistLocalSave({ touchModifiedAt: false });
    loadSaveSlotIntoGame(userId);
}

/** Loads the guest slot back into the running game (leaving an account). */
function activateGuestSaveSlot() {
    if (getSaveSlot().kind === 'guest') return;
    loadSaveSlotIntoGame(null);
}

/** Switches to a slot (an account's, or the guest's for null) and loads it into the running game, without writing the slot in use. */
function loadSaveSlotIntoGame(userId) {
    window.playerGuideUi?.dismissReplay(false);
    selectSaveSlot(userId);
    loadGame();
    applySeasonContentProgression({ silent: true });
    cloudState.guestSaveSummary = userId ? summarizeGuestSave(readGuestSave()) : null;
    refreshRuntimeForLoadedSave();
}

/** Loop and level of a guest save with progress, or null (none, or a fresh default). Read once per account entry, not per screen update. */
function summarizeGuestSave(guestSave) {
    if (!guestSave || isLikelyBootstrapLocalSave(guestSave)) return null;
    return saveProgressSummary(guestSave);
}

/** Loop and level of a save: what the move question names and what decides whether the guest save is ahead (guestSaveIsAhead). */
function saveProgressSummary(save) {
    return { loop: getSaveLoopNumber(save), level: Math.max(1, Math.floor(Number(save.level) || 1)) };
}

/** The account has no server save: the game in its slot (a fresh default, a copy whose first upload failed, or this device's guest save)
 * goes up as revision 1. Sign-up takes the guest save (the 2026-10-03 rule); a first login (a social account's first entry, an email
 * account confirmed by mail) asks, since a new account's first login is its sign-up (2026-11-08: before, the login uploaded a fresh
 * default and the settings' move button was the only way, gone after the first kill). */
async function createFirstCloudSave(signUp) {
    const guestSave = readGuestSave();
    const wanted = await wantsGuestSaveAsFirstSave(guestSave, signUp);
    const adopted = wanted && adoptGuestSaveIntoAccount(guestSave);
    markCurrentSaveCloudOwner();
    game.saveMeta.cloudRevision = 0;
    await pushCloudSave();
    if (wanted && !adopted) {   // the refusal (why the guest save stayed a guest save) is the message to keep, and to show
        showGameToast(cloudState.lastMessage, { tone: 'warning', duration: 9000 });
        return 'pushed-first';
    }
    setCloudMessage(adopted ? '게스트 저장을 이 계정의 첫 서버 저장으로 올렸습니다.' : '이 계정의 첫 서버 저장을 올렸습니다.');
    return adopted ? 'pushed-guest' : 'pushed-first';
}

/** Whether the guest save becomes the account's first server save: it has progress, the account's slot on this device is still a fresh
 * default (a copy whose first upload failed stays), and on a login the player says so (sign-up takes it without asking). */
async function wantsGuestSaveAsFirstSave(guestSave, signUp) {
    const summary = summarizeGuestSave(guestSave);
    if (!summary || !isLikelyBootstrapLocalSave(game)) return false;
    if (signUp) return true;
    const message = [
        _t('이 계정에는 아직 서버 저장이 없습니다. 이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮길까요?', summary),
        _t('옮기면 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다. 옮기지 않으면 새 모험으로 시작하고, 게스트 저장은 이 기기에 남습니다.')
    ].join('\n');
    const answer = await requestGameConfirmation(message, { title: _t('게스트 저장 옮기기'), tone: 'warning', confirmLabel: _t('옮기기'), cancelLabel: _t('새로 시작'), dismissOnBackdrop: false });
    return answer === true;   // 새로 시작 and Escape resolve null
}

/** Moves the guest save into the account's slot as this device's copy, keeping the slot's revision; the guest slot empties, so one guest
 * save never lives in two accounts. Returns false (and says why) when the check (js/guest-save-check.js) refuses it. */
function adoptGuestSaveIntoAccount(guestSave) {
    const candidate = mergeDefaults(guestSave);
    const verdict = guestSaveCheck.inspect(candidate, Date.now());
    if (!verdict.ok) {
        setCloudMessage(_t('정상 플레이로는 나올 수 없는 값이 있어 게스트 저장을 옮기지 않았습니다: {problems}', { problems: verdict.problems.join(', ') }));
        return false;
    }
    const revision = getLocalCloudRevision();
    game = candidate;
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    markCurrentSaveCloudOwner();
    game.saveMeta.cloudRevision = revision;
    game.saveMeta.cloudPending = true;
    if (!persistLocalSave({ touchModifiedAt: false, allowRecoveryWrite: true })) throw new Error('계정 저장 칸에 기록하지 못해 게스트 저장을 옮기지 않았습니다.');
    removeGuestSave();
    cloudState.guestSaveSummary = null;
    refreshRuntimeForLoadedSave();
    return true;
}

/** 설정 > 클라우드 세이브의 게스트 저장 옮기기 단추가 보이는 때: 계정 모드이고, 이 기기에 진행이 있는 게스트 저장이 있고, 계정의 저장이 아직
 * 아무것도 하지 않은 새 게임이거나 게스트 저장보다 뒤일 때(2026-11-08: 전에는 새 게임일 때만이라, 새 계정으로 들어간 뒤 자동 사냥의 첫
 * 처치만으로 단추가 사라졌고 게스트 저장을 옮길 길이 없었다). */
function canMoveGuestSaveIntoAccount() {
    return !!(cloudState.user && cloudState.guestSaveSummary && getSaveSlot().kind === 'account' && guestSaveIsAhead(cloudState.guestSaveSummary, game));
}

/** The account save a guest save (its summary) may replace: a fresh default, or one behind it, a lower loop or the same loop and a lower level. */
function guestSaveIsAhead(guest, accountSave) {
    if (isLikelyBootstrapLocalSave(accountSave)) return true;
    const account = saveProgressSummary(accountSave);
    return guest.loop > account.loop || (guest.loop === account.loop && guest.level > account.level);
}

/** The move question's text: the guest save (its summary), the account save it replaces unless that is a fresh default, and what the move means. */
function guestSaveMoveMessage(summary) {
    const lines = [_t('이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮깁니다.', summary)];
    if (!isLikelyBootstrapLocalSave(game)) lines.push(_t('이 계정의 지금 저장(루프 {loop}, 레벨 {level})은 지워집니다.', saveProgressSummary(game)));
    lines.push(_t('옮긴 뒤 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다.'));
    return lines.join('\n');
}

/** 설정 > 클라우드 세이브의 게스트 저장 옮기기: the guest save replaces the account's save (a fresh default, or one behind it) and goes up. */
async function moveGuestSaveIntoAccount() {
    if (!cloudState.user || cloudState.busy) return;
    const guestSave = readGuestSave();
    if (!canMoveGuestSaveIntoAccount() || !summarizeGuestSave(guestSave)) return setCloudMessage(_t('옮길 게스트 저장이 없거나, 이 계정의 저장이 게스트 저장보다 앞서 있어 옮길 수 없습니다.'));
    const summary = summarizeGuestSave(guestSave);
    if (!await requestGameConfirmation(guestSaveMoveMessage(summary), { title: _t('게스트 저장 옮기기'), tone: 'warning', confirmLabel: _t('옮기기') })) return;
    cloudState.busy = true;
    updateCloudSaveUI();
    try {
        if (!adoptGuestSaveIntoAccount(guestSave)) return;
        await pushCloudSave();
        setCloudMessage(_t('게스트 저장을 이 계정으로 옮겼습니다.'));
        showGameToast(_t('게스트 저장을 이 계정으로 옮겼습니다.'), 'success');
    } catch (error) {
        setCloudMessage('게스트 저장 옮기기 실패: ' + (error.message || error));
        showGameToast('게스트 저장을 옮기지 못했습니다: ' + (error.message || error), 'danger');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

/** Leave the signed-in account on this device only (the server session is not revoked) and keep using this device's save. */
function detachCloudSessionLocally() {
    markSkipOAuthRestoreOnce();
    clearSupabasePersistedSession();
    applyCloudSession(null);
    cloudState.linkedProviders = [];
    cloudState.lastRemoteUpdatedAt = 0;
}

/** Before leaving the account: what the copy has not uploaded goes up when the server can be reached (else it waits in the slot for
 * the next entry), and the slot is written as it stands. */
async function uploadPendingBeforeLeaving() {
    cloudState.busy = true;
    updateCloudSaveUI();
    try {
        if (isCloudSaveDirty()) {
            try {
                await pushCloudSave();
            } catch (error) {
                console.warn('upload before leaving the account failed:', error);
            }
        } else if (getSaveSlot().kind === 'account' && canPersistLocalSave()) persistLocalSave({ touchModifiedAt: false });
    } finally {
        cloudState.busy = false;
    }
}

/** Leaves the account on this device (다른 계정 사용, 게스트로 시작): pending changes go up, the session is dropped here (the server
 * session stays), and the guest slot comes back. */
async function leaveAccountForGuest() {
    await uploadPendingBeforeLeaving();
    detachCloudSessionLocally();
    activateGuestSaveSlot();
}

/** A deleted account (js/cloud-tools-ui.js deleteCloudAccount): its slot leaves this device too, and the start screen opens on the guest slot. */
function forgetDeletedAccountSave(userId) {
    try {
        if (userId) localStorage.removeItem(accountSaveKey(userId));
    } catch (error) {
        console.warn('deleted account slot removal failed:', error);
    }
    activateGuestSaveSlot();
    openStartupGate();
}

/** The account slot holds changes the server does not have (js/save.js persistLocalSave sets it, rememberCloudCommit clears it). */
function isCloudSaveDirty() {
    return getSaveSlot().kind === 'account' && !game?.isGuideReplay && !!game?.saveMeta?.cloudPending;
}

/** Only clocks moved since the last upload: an upload would change nothing on the server. */
function isCloudSaveUnchangedSinceUpload() {
    return !!cloudState.lastUploadedFingerprint && cloudSaveFingerprint(createCloudSyncPayload(game)) === cloudState.lastUploadedFingerprint; // 올린 본문과 같은 모양
}

function markCloudSaveUnchanged() {
    cloudState.lastSyncAttemptAt = Date.now();
    ensureSaveMeta();
    game.saveMeta.cloudPending = false;
    persistLocalSave({ touchModifiedAt: false });
}

// Hidden tabs use the page-exit upload. A superseded copy waits for a new account entry.
const cloudAutoSyncReady = () => cloudState.configured && cloudState.user && !cloudState.busy
    && !cloudState.syncHalted && !isStartupOverlayOpen() && !document.hidden;

function scheduleCloudAutoSync() {
    if (!cloudAutoSyncReady()) return;
    if (cloudState.pendingForcedSyncOptions) return schedulePendingForcedCloudSyncDrain();
    if (!isCloudSaveDirty()) return;
    if (Date.now() - cloudState.lastSyncAttemptAt < CLOUD_SYNC_MIN_INTERVAL_MS) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        if (!isCloudSaveDirty() || cloudState.syncHalted || document.hidden) return;
        if (isCloudSaveUnchangedSinceUpload()) return markCloudSaveUnchanged();
        syncCloudSave({ automatic: true }).catch(error => {
            console.warn('auto cloud sync failed:', error);
            noteAutoCloudSyncFailure(error);
        });
    }, 5000);
}

function schedulePendingForcedCloudSyncDrain() {
    if (cloudState.pendingForcedSyncRetryTimer || game.isGuideReplay) return;
    cloudState.pendingForcedSyncRetryTimer = setTimeout(() => {
        cloudState.pendingForcedSyncRetryTimer = null;
        let pendingForced = cloudState.pendingForcedSyncOptions;
        if (!pendingForced || !cloudState.configured || !cloudState.user || game.isGuideReplay) return;
        if (cloudState.busy) {
            schedulePendingForcedCloudSyncDrain();
            return;
        }
        cloudState.pendingForcedSyncOptions = null;
        syncCloudSave(pendingForced).catch(error => {
            console.warn(`queued cloud save failed (${pendingForced.reason || 'important'}):`, error);
            setCloudMessage('대기 중이던 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 500);
}

async function syncCloudSave(options = {}) {
    if (!cloudState.configured || !cloudState.user) return;
    await waitForPageExitUpload();
    if (cloudState.busy || game.isGuideReplay) {
        if (options.force === true) {
            cloudState.pendingForcedSyncOptions = { ...options, force: true, reason: options.reason || 'important' };
            setCloudMessage(_t('클라우드 업로드 대기 중... ({reason})', { reason: cloudState.pendingForcedSyncOptions.reason }));
            updateCloudSaveUI();
            schedulePendingForcedCloudSyncDrain();
        }
        return;
    }
    cloudState.busy = true;
    cloudState.lastSyncAttemptAt = Date.now();
    setCloudMessage(options.reason ? _t('클라우드 업로드 중... ({reason})', { reason: options.reason }) : (options.automatic ? '자동 클라우드 업로드 중...' : '클라우드 업로드 중...'));
    updateCloudSaveUI();
    try {
        let fresh = await ensureCloudSessionFresh(options.reason || '클라우드 저장');
        if (!fresh) return;
        if (game.isGuideReplay) {
            if (options.force === true) cloudState.pendingForcedSyncOptions ??= options;
            return;
        }
        await pushCloudSave();
        setCloudMessage(options.automatic ? '서버에 자동으로 올렸습니다.' : '서버에 올렸습니다.');
        if (!options.automatic) addLog(_t('서버에 저장을 올렸습니다.'), 'loot-magic');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        if (cloudState.pendingForcedSyncOptions) schedulePendingForcedCloudSyncDrain();
    }
}

/** An auto upload that failed. A conflict (another device committed since this copy's revision) halts every later auto upload until the
 * account is entered again, and says so once as a toast (2026-10-27 review: the losing device played on without knowing). A connection
 * failure says so once per streak: the progress stays in this device's slot and goes up when an attempt reaches the server. */
function noteAutoCloudSyncFailure(error) {
    let text = String(error && error.message || error);
    setCloudMessage('자동 서버 저장 실패: ' + text);
    if (typeof showGameToast !== 'function') return;
    if (error && error.code === CLOUD_REVISION_CONFLICT_CODE) {
        if (cloudState.syncHalted) return;
        cloudState.syncHalted = true;
        showGameToast(text, { tone: 'warning', duration: 9000 });
        return;
    }
    if (cloudState.uploadFailureNoticed) return;
    cloudState.uploadFailureNoticed = true;
    showGameToast(_t('서버에 올리지 못했습니다. 진행은 이 기기에 남아 있고, 연결되면 다시 올립니다.'), { tone: 'warning', duration: 7000 });
}

/** 부팅 복원이나 대조의 실패: 서버가 토큰을 거절했을 때(401)만 로그아웃한다. 업무 오류(400, 예: SAVE_TOO_LARGE)나 망 오류면
 * 로그인은 두고 다음 동기화 때 다시 맞춘다(2026-10-27). */
function noteCloudInitFailure(error) {
    if (Number(error && error.status) === 401) applyCloudSession(null);
    setCloudMessage((cloudState.user ? '서버 대조를 못 했습니다. 다음 동기화 때 다시 맞춥니다: ' : '클라우드 세션 복원 실패: ') + (error.message || error));
}

async function initializeCloudSave() {
    cloudState.initialized = true;
    cloudState.configured = getCloudConfig().enabled;
    if (!cloudState.configured) {
        setCloudMessage(_t('cloud-save-config.js를 설정하면 클라우드 세이브를 켤 수 있습니다.'));
        updateCloudSaveUI();
        return;
    }
    ['startup-password'].forEach(id => {
        let passwordEl = document.getElementById(id);
        if (passwordEl && !passwordEl.dataset.boundCloudEnter) {
            passwordEl.dataset.boundCloudEnter = '1';
            passwordEl.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    startupLogin();
                }
            });
        }
    });
    try {
        cloudState.busy = true;
        setCloudMessage(_t('저장된 로그인 세션을 확인하는 중입니다...'));
        updateCloudSaveUI();
        let skipOAuthRestore = consumeSkipOAuthRestoreOnce();
        let restored = false;
        if (!skipOAuthRestore) restored = await tryRestoreSupabaseOAuthSession();
        if (!restored) restored = await restoreCloudSession();
        if (restored && cloudState.user) {
            await refreshCloudLinkedIdentities();
            // 부팅 중이라 시작 화면이 열려 있다: 계정 저장은 "계정 저장으로 이어하기"를 누를 때 연다(enterAccountSave).
            setCloudMessage(_t('이전 로그인 세션을 복원했습니다. 계정 저장으로 이어 할 수 있습니다.'));
        } else if (!loadStoredCloudSession()) {
            setCloudMessage(_t('로그인하면 클라우드 저장을 사용할 수 있습니다.'));
        }
    } catch (error) {
        console.warn('cloud init failed:', error);
        noteCloudInitFailure(error);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        refreshSocialAfterCloudStateChange();
    }
}

async function cloudSignUp(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage(_t('먼저 cloud-save-config.js를 설정해주세요.'));
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage(_t('이메일과 비밀번호를 입력해주세요.'));
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: _t('계정을 생성하는 중...'),
            detail: _t('인증 정보를 등록하고 첫 클라우드 세이브를 준비하고 있습니다.'),
            caption: _t('계정 만들기'),
            progress: 12
        });
    }
    setCloudMessage(_t('회원가입을 진행 중입니다...'));
    updateCloudSaveUI();
    try {
        let result = await requestSupabaseEmailSignUp(credentials);
        if (result && result.session && result.user) {
            applyCloudSession({ ...result.session, user: result.user });
            await refreshCloudLinkedIdentities();
            clearCloudPasswordInput();
            advanceLoadingOverlay({
                title: _t('첫 세이브를 연결하는 중...'),
                detail: _t('새 계정의 첫 서버 저장을 올리고 있습니다.'),
                caption: _t('저장 연결'),
                progress: 54
            });
            await enterAccountSave({ signUp: true });
            addLog(_t('클라우드 계정을 만들고 저장을 연결했습니다.'), 'loot-magic');
            if (options.enterGame) await enterGameWorld();
        } else {
            clearCloudPasswordInput();
            setCloudMessage(_t('인증 메일을 보냈습니다. 메일에서 인증을 완료한 뒤 로그인해주세요.'));
            if (options.enterGame) setLoadingOverlayState(false);
            await showSignupEmailNotice(credentials.email, false);
        }
    } catch (error) {
        setCloudMessage('회원가입 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function requestSupabaseEmailSignUp(credentials) {
    let client = getSupabaseClient();
    if (!client || !client.auth || typeof client.auth.signUp !== 'function') throw new Error('회원가입 클라이언트를 초기화하지 못했습니다.');
    let { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { emailRedirectTo: getOAuthRedirectUrl() }
    });
    if (error) throw error;
    return data || {};
}

function showSignupEmailNotice(email, resent) {
    return requestGameDialog({
        type: 'notice',
        tone: 'success',
        kicker: _t('계정 인증'),
        title: resent ? '인증 메일을 다시 보냈습니다' : '인증 메일을 보냈습니다',
        message: `${email}\n메일의 인증 링크를 누른 뒤 이 화면으로 돌아와 로그인해주세요.`,
        confirmLabel: _t('확인')
    });
}

async function resendSignupConfirmation() {
    if (cloudState.busy) return;
    let credentials = collectCloudCredentials();
    if (!credentials.email) return setCloudMessage(_t('인증 메일을 받을 이메일을 입력해주세요.'));
    let client = getSupabaseClient();
    if (!client || !client.auth || typeof client.auth.resend !== 'function') return setCloudMessage(_t('인증 메일 재발송 기능을 초기화하지 못했습니다.'));
    cloudState.busy = true;
    setCloudMessage(_t('인증 메일을 다시 보내는 중입니다...'));
    try {
        let { error } = await client.auth.resend({
            type: 'signup',
            email: credentials.email,
            options: { emailRedirectTo: getOAuthRedirectUrl() }
        });
        if (error) throw error;
        setCloudMessage(_t('인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.'));
        await showSignupEmailNotice(credentials.email, true);
    } catch (error) {
        setCloudMessage('인증 메일 재발송 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudLogin(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage(_t('먼저 cloud-save-config.js를 설정해주세요.'));
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage(_t('이메일과 비밀번호를 입력해주세요.'));
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: _t('계정을 확인하는 중...'),
            detail: _t('인증 정보를 검증하고 연결된 클라우드 세이브를 찾고 있습니다.'),
            caption: _t('계정 확인'),
            progress: 14
        });
    }
    setCloudMessage(_t('로그인하는 중입니다...'));
    updateCloudSaveUI();
    try {
        let session = await cloudJsonRequest('/auth/v1/token?grant_type=password', {
            method: 'POST',
            useAuth: false,
            body: { email: credentials.email, password: credentials.password }
        });
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        clearCloudPasswordInput();
        advanceLoadingOverlay({
            title: _t('계정 저장을 불러오는 중...'),
            detail: _t('서버 저장과 이 기기의 계정 저장을 맞추고 있습니다.'),
            caption: _t('계정 저장'),
            progress: 58
        });
        await enterAccountSave();
        addLog(_t('클라우드 세이브 계정에 로그인했습니다.'), 'loot-magic');
        if (options.enterGame) await enterGameWorld();
    } catch (error) {
        setCloudMessage('로그인 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

/** 이 기기의 클라우드 로그인 흔적을 치운다: 세션과 사용자, 자동 저장 대기와 타이머(applyCloudSession), 원격 기록 메모.
 * 로그아웃과 계정 삭제(js/cloud-tools-ui.js forgetDeletedAccountSession)가 같이 쓴다. 서버에는 아무것도 묻지 않는다. */
function clearCloudSessionLocally() {
    applyCloudSession(null);
    cloudState.linkedProviders = [];
    cloudState.lastRemoteUpdatedAt = 0;
}

/** Tells the server the session is over (supabase-js first, then the game's own token). Failures are logged: the device forgets the
 * session either way. */
async function requestServerLogout() {
    let client = getSupabaseClient();
    if (client) {
        try { await client.auth.signOut(); } catch (oauthLogoutError) { console.warn('supabase oauth logout failed:', oauthLogoutError); }
    }
    if (cloudState.session && cloudState.session.access_token) {
        try {
            await cloudJsonRequest('/auth/v1/logout', { method: 'POST' });
        } catch (logoutError) {
            console.warn('cloud logout request failed:', logoutError);
        }
    }
}

/** 설정의 로그아웃: 안 올린 진행을 올리고(leaveAccountForGuest), 서버 세션을 끝내고, 게스트 칸으로 시작 화면을 연다. 계정 칸은 이 기기에 남는다. */
async function cloudLogout() {
    if (!cloudState.user) return setCloudMessage(_t('이미 로그아웃 상태입니다.'));
    if (cloudState.busy) return;
    if (!await requestGameConfirmation(_t('로그아웃하면 시작 화면으로 돌아갑니다. 계정 저장은 서버에 올린 뒤 이 기기에도 남겨 둡니다.'),
        { title: _t('로그아웃'), confirmLabel: _t('로그아웃') })) return;
    setCloudMessage(_t('로그아웃하는 중입니다...'));
    updateCloudSaveUI();
    await uploadPendingBeforeLeaving();
    await requestServerLogout();
    clearCloudSessionLocally();
    activateGuestSaveSlot();
    openStartupGate();
    setCloudMessage(_t('로그아웃했습니다. 이 기기 저장으로 이어 하거나 다시 로그인할 수 있습니다.'));
}

function requestImmediateCloudSave(reason) {
    if (!cloudState.configured || !cloudState.user) return false;
    if (!saveGame({ skipCloudSync: true })) return false;
    syncCloudSave({ automatic: true, force: true, reason: reason || 'important' }).catch(error => {
        console.warn(`immediate cloud save failed (${reason || 'important'}):`, error);
        setCloudMessage('즉시 클라우드 저장 실패: ' + (error.message || error));
    });
    return true;
}

/** The page-exit commit answered: committed, the slot takes the revision; refused (another device committed), uploads halt until the
 * account is entered again. */
function applyPageExitCloudSaveResult(text, exitSave, fingerprint) {
    if (cloudState.busy || (window.playerGuideUi?.liveGame() ?? game) !== exitSave || !text) return;
    let result = JSON.parse(text);
    result = Array.isArray(result) ? result[0] : result;
    if (!result) return;
    if (!result.committed) {
        cloudState.syncHalted = true;
        return;
    }
    rememberCloudCommit({ revision: result.current_revision, updated_at: result.saved_at }, fingerprint);
}

/** Body, headers and endpoint of the page-exit upload (the same RPC as a normal sync), with the content print. */
function buildPageExitCloudRequest(config) {
    let payload = createCloudSavePayload(game);
    let body = JSON.stringify({ expected_revision: getLocalCloudRevision(), next_save_data: payload });
    let headers = {
        apikey: config.supabaseAnonKey,
        ...cloudSessionGuard.requestHeaders(),
        Authorization: `Bearer ${cloudState.session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };
    return { body, headers, endpoint: config.supabaseUrl + '/rest/v1/rpc/commit_cloud_save', fingerprint: cloudSaveFingerprint(createCloudSyncPayload(game)) };
}

/** Uploaded a moment ago, or only clocks moved since the last upload: switching apps back and forth uploads once. */
function isPageExitCloudPushRedundant(fingerprint) {
    return fingerprint === cloudState.lastUploadedFingerprint || Date.now() - (cloudState.lastCloudCommitAt || 0) < CLOUD_EXIT_UPLOAD_MIN_GAP_MS;
}

/** Browsers refuse keepalive bodies over 64 KiB (most saves). A bigger save goes as a normal request: when the page is
 * only hidden (switching tabs or apps) it still finishes; a closed page may lose it, and the slot keeps it pending for the next
 * account entry (enterAccountSave). sendBeacon cannot carry the Supabase auth headers. */
function sendPageExitCloudSave(request, reason, exitSave) {
    trackPageExitUpload(fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        keepalive: new Blob([request.body]).size <= CLOUD_KEEPALIVE_BODY_LIMIT
    }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    }).then(text => {
        applyPageExitCloudSaveResult(text, exitSave, request.fingerprint);
    }).catch(error => {
        let msg = String((error && error.message) || error || '');
        let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
        if (expectedAbort && reason === 'visibilitychange') {
            console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
        } else {
            console.warn(`cloud save on ${reason || 'page exit'} failed:`, error);
        }
    }));
}

function trackPageExitUpload(upload) {
    const tracked = upload.finally(() => {
        if (cloudState.exitUpload === tracked) cloudState.exitUpload = null;
    });
    cloudState.exitUpload = tracked;
}

async function waitForPageExitUpload() {
    if (!cloudState.exitUpload) return;
    await Promise.race([cloudState.exitUpload, new Promise(resolve => setTimeout(resolve, CLOUD_EXIT_UPLOAD_WAIT_MS))]);
}

/** A session whose access token has not expired: on page exit there is no time to refresh, and an expired token only failed
 * with 401 in the console (2026-10-27). */
function hasUsableCloudSessionToken() {
    if (!cloudState.session || !cloudState.session.access_token) return false;
    let expiresAtMs = getCloudSessionExpiresAtMs();
    return !expiresAtMs || expiresAtMs > Date.now();
}

function pushCloudSaveOnPageExit(reason) {
    let config = getCloudConfig();
    if (cloudState.busy || cloudState.syncHalted || cloudState.exitUpload) return false;
    if (typeof canPersistLocalSave === 'function' && !canPersistLocalSave()) return false;
    if (!config.enabled || !cloudState.user || !cloudState.user.id || !hasUsableCloudSessionToken()) return false;
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return false;
    if (!gameplayStarted) return false;
    if (getCloudSaveOwnerId() !== getActiveCloudUserId() || getSaveSlot().userId !== getActiveCloudUserId()) return false;
    let exitPushStartedAt = Date.now();
    let exitSave = game;
    if (exitPushStartedAt - lastPageExitCloudPushAt < 1500) return false;
    try {
        if (!persistLocalSave({ touchModifiedAt: true })) return false;
        let request = buildPageExitCloudRequest(config);
        if (isPageExitCloudPushRedundant(request.fingerprint)) return false;
        sendPageExitCloudSave(request, reason, exitSave);
        lastPageExitCloudPushAt = exitPushStartedAt;
        cloudState.lastSyncAttemptAt = exitPushStartedAt;
        setCloudMessage(_t('페이지 종료 전 클라우드 저장을 시도했습니다.'));
        return true;
    } catch (error) {
        console.warn(`cloud save on ${reason || 'page exit'} setup failed:`, error);
        return false;
    }
}

/** 설정의 서버 저장 다시 받기: the server save replaces this device's copy, pending changes included. */
async function cloudPullNow() {
    if (!cloudState.user) return setCloudMessage(_t('먼저 로그인해주세요.'));
    if (cloudState.busy) return;
    if (!await requestGameConfirmation(isCloudSaveDirty()
        ? '서버 저장으로 이 기기의 계정 저장을 바꿉니다.\n이 기기에서 아직 올리지 않은 진행은 지워집니다.'
        : '서버 저장으로 이 기기의 계정 저장을 바꿉니다.', {
        title: _t('서버 저장 다시 받기'),
        tone: 'danger',
        confirmLabel: _t('다시 받기')
    })) return;
    cloudState.busy = true;
    setCloudMessage(_t('서버 저장을 받는 중입니다...'));
    updateCloudSaveUI();
    try {
        await pullCloudSave();
    } catch (error) {
        setCloudMessage('서버 저장 받기 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

exposeFileGlobals({ getCloudConfig, getSupabaseClient, loginWithGoogle, loginWithKakao, loginWithOAuthProvider, recoverBusyStateAfterOAuthBack, watchSupabaseTokenRefresh, tryRestoreSupabaseOAuthSession, loadStoredCloudSession, cancelScheduledCloudSync, applyCloudSession, refreshCloudSession, ensureCloudSessionFresh, cloudRequestHeaders, cloudJsonRequest, setStartupRegistrationMode, enterGameWorld, continueWithCloudSession, prepareStartupAccountSwitch, returnFromStartupGate, startGuestMode, startupLogin, startupSignUp, refreshCloudLinkedIdentities, linkGoogleAccount, linkKakaoAccount, updateCloudSaveUI, getActiveCloudUserId, refreshRuntimeForLoadedSave, applyExternalSave, fetchCloudSaveSummary, getLocalCloudRevision, getSaveLoopNumber, commitCloudSavePayload, rememberCloudCommit, pushCloudSave, captureCloudSaveContext, assertCloudSaveContext, pullCloudSave, enterAccountSave, pullAccountSave, canMoveGuestSaveIntoAccount, moveGuestSaveIntoAccount, leaveAccountForGuest, forgetDeletedAccountSave, isCloudSaveDirty, isCloudSaveUnchangedSinceUpload, scheduleCloudAutoSync, syncCloudSave, noteAutoCloudSyncFailure, initializeCloudSave, resendSignupConfirmation, clearCloudSessionLocally, cloudLogout, requestImmediateCloudSave, applyPageExitCloudSaveResult, buildPageExitCloudRequest, trackPageExitUpload, pushCloudSaveOnPageExit, cloudPullNow });
})();


const CLOUD_TOKEN_REFRESH_LEEWAY_MS = 5 * 60 * 1000;
const CLOUD_TOKEN_EXPIRY_WARNING_MS = 10 * 60 * 1000;

const CLOUD_SKIP_OAUTH_RESTORE_KEY = 'projectidle_cloud_skip_oauth_restore';


let supabaseClient = null;


window.addEventListener('pageshow', function(event) { recoverBusyStateAfterOAuthBack(event); startBackgroundCombatReturn(Date.now()); });
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recoverBusyStateAfterOAuthBack();
});


// 서버 오류 코드 중 플레이어가 알아야 할 것은 문구로 바꾼다(db/operations-and-ghost.sql의 commit_cloud_save, db/hall-watch-20261030.sql의 접속 표).
const CLOUD_SERVER_ERROR_TEXT = Object.freeze({
    SAVE_TOO_LARGE: '클라우드 저장이 너무 커서 서버가 받지 않았습니다(8MB). 가방과 보관함을 정리한 뒤 다시 저장해 주세요.',
    CLOUD_SESSION_SUPERSEDED: '다른 기기에서 이 계정으로 접속해 이 화면의 요청을 서버가 받지 않았습니다.'
});


// 계정에 들어갈 때의 확인은 세이브에서 루프, 저장 시각만 읽는다. 그 값만 받고(세이브 전체는 수백 KB), 전체는 불러올 때만 받는다.
const CLOUD_SAVE_SUMMARY_FIELDS = 'season:save_data->season,loopCount:save_data->loopCount,saveMeta:save_data->saveMeta';


const CLOUD_REVISION_CONFLICT_CODE = 'CLOUD_REVISION_CONFLICT';


safeExposeGlobals({ captureCloudSaveContext, assertCloudSaveContext });


let cloudSyncTimer = null;
let lastPageExitCloudPushAt = 0;


safeExposeGlobals({ resendSignupConfirmation });


/** A hidden page can come back before its leaving upload answers. Until it does, no second leaving upload goes out and the next sync
 * waits for the reply (it moves the revision): both sent from the same revision, the later one halted syncing on this device's own
 * upload (2026-11-07 리뷰). */
const CLOUD_EXIT_UPLOAD_WAIT_MS = 15000;
