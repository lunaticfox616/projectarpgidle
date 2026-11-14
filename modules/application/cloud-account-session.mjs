/** Session adoption commits state and persistence before notifying existing UI/session-monitor boundaries. */
export class CloudAccountSession {
    constructor(owner, storage, sdk, effects) {
        this.owner = owner; this.storage = storage; this.sdk = sdk; this.effects = effects;
    }

    resetSync(session) {
        if (this.owner.resetForSession(session)) this.effects.cancelScheduledSync();
    }

    apply(session) {
        if (!this.owner.active) return;
        const previousId = this.owner.current.user && this.owner.current.user.id;
        this.resetSync(session);
        if (!session || !session.access_token) {
            this.owner.clearSession();
            this.storage.clear();
            this.effects.render();
            if (previousId) this.effects.refreshSocial();
            this.effects.syncGuard();
            return;
        }
        this.owner.adoptSession(session, Date.now());
        this.storage.persist(this.owner.current.session);
        this.effects.render();
        if (previousId !== (this.owner.current.user && this.owner.current.user.id)) this.effects.refreshSocial();
        this.effects.syncGuard();
        this.sdk.sync(this.owner.current.session);
    }

    watchSdk(client) {
        this.sdk.watch(client, session => {
            if (!this.owner.active || !this.owner.userId() || session.user?.id !== this.owner.userId()) return;
            if (this.owner.current.session && this.owner.current.session.refresh_token === session.refresh_token) return;
            this.apply(session);
        });
    }
}
