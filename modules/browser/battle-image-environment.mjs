const CUSTOM_HERO_SHEET_STORAGE_KEY = 'projectidle_custom_hero_sheet';

export function getCustomHeroSheetDataUrl(inputs) {
    try {
        let saved = inputs.localStorage.getItem(CUSTOM_HERO_SHEET_STORAGE_KEY);
        if (!saved || typeof saved !== 'string') return null;
        return saved.startsWith('data:image/') ? saved : null;
    } catch {
        return null;
    }
}

export function isLocalFileProtocol(inputs) {
    return typeof inputs.window !== 'undefined' && inputs.window.location && inputs.window.location.protocol === 'file:';
}

export function isLocalRuntimeHost(inputs) {
    if (typeof inputs.window === 'undefined' || !inputs.window.location) return false;
    if (inputs.window.location.protocol === 'file:') return true;
    let host = String(inputs.window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
