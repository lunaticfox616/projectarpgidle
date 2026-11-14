// Player-facing server errors retain the existing RPC contract.
const SERVER_ERROR_TEXT = Object.freeze({
    SAVE_TOO_LARGE: '클라우드 저장이 너무 커서 서버가 받지 않았습니다(8MB). 가방과 보관함을 정리한 뒤 다시 저장해 주세요.',
    CLOUD_SESSION_SUPERSEDED: '다른 기기에서 이 계정으로 접속해 이 화면의 요청을 서버가 받지 않았습니다.'
});

export function readCloudConfig(raw, trial) {
    raw = raw || {};
    const supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    const supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
    const enabled = !trial && raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    return { enabled, supabaseUrl, supabaseAnonKey };
}

export function cloudRequestHeaders(config, options, body, session, guardHeaders) {
    const headers = { apikey: config.supabaseAnonKey, ...guardHeaders, ...(options.headers || {}) };
    if (options.useAuth !== false && session && session.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    if (body !== undefined && typeof body !== 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return headers;
}

export function describeCloudServerError(data, status) {
    const message = data && (data.msg || data.error_description || data.message || data.error);
    return SERVER_ERROR_TEXT[message] || message || `HTTP ${status}`;
}

export function requireCloudConfig(config) {
    if (!config.enabled) throw new Error('cloud-save-config.js 설정이 비어 있습니다.');
    return config;
}

function assertCloudRequestAccount(ports, options) {
    const changedUser = options.expectedUserId && options.expectedUserId !== ports.getUserId();
    const changedEntry = options.expectedSessionEpoch !== undefined && options.expectedSessionEpoch !== ports.state.sessionEpoch;
    if (changedUser || changedEntry) throw new Error('로그인 계정이 변경되어 작업을 중단했습니다.');
}

/** Shared send boundary. In particular, token refresh does NOT call the authenticated request entry again. */
export async function sendCloudRequest(ports, config, path, options) {
    requireCloudConfig(config);
    ports.guard.assertActive();
    assertCloudRequestAccount(ports, options);
    const epoch = ports.state.sessionEpoch;
    const body = options.body;
    const headers = cloudRequestHeaders(config, options, body, ports.state.session, ports.guard.requestHeaders(options));
    if (options.onSend) options.onSend(); // Only after account and session checks; used by unknown-result recovery.
    const result = await ports.transport.read(config.supabaseUrl + path, {
        method: options.method || 'GET', headers,
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    });
    if (!result.ok) {
        if (ports.state.sessionEpoch === epoch) ports.guard.noteServerRefusal(result.data, headers['x-rignin-session']);
        throw Object.assign(new Error(describeCloudServerError(result.data, result.status)), { status: result.status });
    }
    return result.data;
}

export class CloudAccountRequests {
    constructor(ports, tokens) { this.ports = ports; this.tokens = tokens; }

    async request(path, options = {}) {
        const config = requireCloudConfig(this.ports.getConfig());
        if (options.useAuth !== false) {
            const fresh = await this.tokens.ensureFresh('요청 전 확인');
            if (!fresh) throw new Error(this.ports.state.session ? '클라우드 로그인 갱신을 못 했습니다. 연결을 확인한 뒤 다시 시도해주세요.' : '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        }
        return sendCloudRequest(this.ports, config, path, options);
    }

    headers(config, options, body) {
        return cloudRequestHeaders(config, options, body, this.ports.state.session, this.ports.guard.requestHeaders(options));
    }
}
