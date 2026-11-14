// format: explicit account state and dependency ports; no ambient game/global state.
export class SocialFormat {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["socialEscape","socialComma","getSocialNicknameStorageKey","socialClassLabel","socialSafeColor","socialRarityColor"].forEach(name => { this[name] = this[name].bind(this); });
    }

    socialEscape(text) {
        if (typeof this.deps.escapeHTML === 'function') return this.deps.escapeHTML(String(text == null ? '' : text));
        return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    socialComma(n) { return (Math.floor(Number(n) || 0)).toLocaleString('en-US'); }

    getSocialNicknameStorageKey(userId) {
        return userId ? `${this.data.SOCIAL_NICK_KEY}:${userId}` : '';
    }

    socialClassLabel(ascendClass) {
        if (ascendClass && typeof this.deps.CLASS_TEMPLATES !== 'undefined' && this.deps.CLASS_TEMPLATES[ascendClass]) return this.deps.CLASS_TEMPLATES[ascendClass].name;
        return '미전직';
    }

    socialSafeColor(c, fallback) {
        fallback = fallback || '#cfe0f5';
        return (typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s]+\))$/.test(c)) ? c : fallback;
    }

    socialRarityColor(rarity) {
        return this.socialSafeColor(typeof this.deps.getRarityColor === 'function' ? this.deps.getRarityColor(rarity) : null, '#cfe0f5');
    }
}
