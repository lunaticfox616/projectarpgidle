

export function telemetryCreatePlaytestSessionId(env) {
    if (typeof env.deps.crypto !== 'undefined' && typeof env.deps.crypto.randomUUID === 'function') return env.deps.crypto.randomUUID();
    let bytes = new Uint8Array(16);
    if (typeof env.deps.crypto !== 'undefined' && typeof env.deps.crypto.getRandomValues === 'function') env.deps.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    let hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 오류 보고와 문의에 붙는 버전. 배포 표식(scripts/build-web.js가 적는 app-deploy)이 있으면 그것, 개발 중('dev')이면 app-build.
 * 2026-10-27까지 app-build만 보내 모든 보고의 버전이 9월 값에 멈춰 있었다. */
export function telemetryGetPlaytestBuildVersion(env) {
    let deploy = env.deps.document.querySelector('meta[name="app-deploy"]');
    let stamp = deploy ? String(deploy.content || '').trim() : '';
    if (stamp && stamp !== 'dev') return stamp;
    let meta = env.deps.document.querySelector('meta[name="app-build"]');
    return meta ? String(meta.content || 'unknown') : 'unknown';
}

export function telemetryGetPlaytestPlatform(env) {
    let mobile = typeof env.deps.matchMedia === 'function' && env.deps.matchMedia('(max-width: 1080px)').matches;
    return mobile ? 'mobile' : 'desktop';
}

export function telemetryGetPlaytestUserId(env) {
    let id = typeof env.deps.cloudState !== 'undefined' && env.deps.cloudState.user && env.deps.cloudState.user.id;
    return typeof id === 'string' && id ? id : null;
}

export function telemetryGetPlaytestUtcDay(env) {
    return new env.deps.Date().toISOString().slice(0, 10);
}
