const OUTDATED_BUILD_ERROR_CODE = 'GAME_BUILD_OUTDATED';

export function normalizeCloudUploadProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return {
        at: Math.max(0, Math.floor(Number(profile.at) || 0)),
        serializeMs: Math.max(0, Math.floor(Number(profile.serializeMs) || 0)),
        uploadMs: Math.max(0, Math.floor(Number(profile.uploadMs) || 0)),
        totalMs: Math.max(0, Math.floor(Number(profile.totalMs) || 0)),
        payloadBytes: Math.max(0, Math.floor(Number(profile.payloadBytes) || 0))
    };
}

/** A game build stamp's time in ms, or 0 for anything else (no stamp, 'dev', a damaged value). */
export function gameBuildTime(stamp) {
    const time = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
    return Number.isFinite(time) && time > 0 ? time : 0;
}

export function outdatedBuildRefusal(message) {
    return Object.assign(new Error(message), { code: OUTDATED_BUILD_ERROR_CODE });
}

export function cloudSavePrintSource(saveData) {
    const stall = saveData.playerStall && typeof saveData.playerStall === 'object' ? { ...saveData.playerStall, lastAt: 0 } : saveData.playerStall;
    return { ...saveData, saveMeta: null, talentCardRuntime: undefined, playerStall: stall };
}

export function printOfSaveText(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    return `${text.length}:${hash >>> 0}`;
}

/** JSON.stringify replacer: every object is written with its keys in sorted order (the same order on both sides of a comparison). */
export function sortSaveKeys(key, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map(name => [name, value[name]]));
}

export function sanitizeForSave(value, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (isUnsupportedSaveValue(value)) return undefined;
    if (typeof value !== 'object') return sanitizeSavePrimitive(value);
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
        let out = [];
        for (let i = 0; i < value.length; i++) {
            let v = sanitizeForSave(value[i], seen);
            out.push(v === undefined ? null : v);
        }
        return out;
    }
    let out = {};
    Object.keys(value).forEach(key => {
        let v = sanitizeForSave(value[key], seen);
        if (v !== undefined) out[key] = v;
    });
    return out;
}

function isUnsupportedSaveValue(value) {
    return typeof value === 'function' || typeof value === 'symbol';
}

function sanitizeSavePrimitive(value) {
    return Number.isFinite(value) ? value : (typeof value === 'number' ? 0 : value);
}

export function formatCloudTime(value, locale) {
    if (!value) return '없음';
    let date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '없음';
    return date.toLocaleString(locale);
}
