// blocking: explicit account state and dependency ports; no ambient game/global state.
export class SocialBlocking {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["getBlockedUsers","getBlockedUserIds","isUserBlocked","setUserBlocked"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getBlockedUsers() {
        try {
            let list = JSON.parse(this.deps.localStorage.getItem(this.data.SOCIAL_BLOCKED_KEY) || '[]');
            return Array.isArray(list) ? list.map(entry => entry && typeof entry === 'object' ? { id: String(entry.id || ''), name: String(entry.name || '') } : { id: String(entry || ''), name: '' }).filter(entry => entry.id && entry.id !== 'null') : [];
        } catch { return []; }
    }

    getBlockedUserIds() { return this.getBlockedUsers().map(entry => entry.id); }

    isUserBlocked(userId) { return !!userId && this.getBlockedUserIds().includes(String(userId)); }

    setUserBlocked(userId, blocked, name) {
        let list = this.getBlockedUsers().filter(entry => entry.id !== String(userId));
        if (blocked) list.push({ id: String(userId), name: String(name || '').slice(0, 16) });
        try { this.deps.localStorage.setItem(this.data.SOCIAL_BLOCKED_KEY, JSON.stringify(list.slice(-200))); }
        catch (error) { this.deps.console.warn('[social] blocked-user write failed:', error.message); }
    }
}
