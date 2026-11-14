/** Transient server arena data; never written into the player's saved game. */
export class GhostArenaState {
    constructor() {
        this.active = true;
        this.epoch = null;
        this.current = {
            loading: false, data: null, message: '', result: null, selectedProfile: null,
            friendlyBusy: false, friendlyResult: null, duel: null, duelMode: '',
            userId: null, loadedAt: 0, failedAt: 0
        };
    }

    /** A new session of the same account also invalidates responses from its earlier login. */
    syncAccount(context) {
        if (this.current.userId === context.userId && this.epoch === context.epoch) return false;
        const switched = this.epoch !== null;
        this.epoch = context.epoch;
        this.current.userId = context.userId;
        if (!switched) return false;
        Object.assign(this.current, {
            loading: false, friendlyBusy: false, data: null, message: '', result: null,
            selectedProfile: null, friendlyResult: null, duel: null, duelMode: '', loadedAt: 0, failedAt: 0
        });
        return true;
    }

    serverReady() { return Number(this.current.data && this.current.data.combatProtocolVersion) >= 4; }

    loadDue(now = Date.now()) {
        if (this.current.loading || this.current.friendlyBusy) return false;
        if (this.current.failedAt && now - this.current.failedAt < 30000) return false;
        return !this.current.data || now - this.current.loadedAt > 60000;
    }

    dispose() { this.active = false; this.current.loading = false; this.current.friendlyBusy = false; }
}
