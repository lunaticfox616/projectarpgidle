// Owns only browser subscriptions. Account/session checks remain in the social services.
export class SocialLifecycle {
    constructor(deps, state, services) {
        this.deps = deps;
        this.state = state;
        this.services = services;
        this.started = false;
        this.startupTimer = null;
        this.mount = this.mount.bind(this);
    }

    mount() {
        if (!this.started) return;
        this.services.styles.injectSocialStyles();
        this.services.tooltip.ensureSocialTooltip();
    }

    start() {
        if (this.started || !this.deps.document) return;
        this.started = true;
        this.state.disposed = false;
        const { document } = this.deps;
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', this.mount, { once: true });
        else this.mount();
        this.startupTimer = this.deps.setTimeout(() => {
            this.startupTimer = null;
            if (this.started) this.services.background.syncSocialBackgroundTasks();
        }, 15000);
        document.addEventListener('visibilitychange', this.services.realtime.syncLiveChat);
    }

    dispose() {
        this.started = false;
        this.state.disposed = true;
        this.deps.clearTimeout(this.startupTimer);
        this.startupTimer = null;
        this.deps.document?.removeEventListener('DOMContentLoaded', this.mount);
        this.deps.document?.removeEventListener('visibilitychange', this.services.realtime.syncLiveChat);
        this.services.reset.stopHeartbeat();
        this.services.reset.stopSocialNotificationPolling();
        this.services.reset.closeLiveChat();
        this.services.reset.resetSocialSessionViews();
    }
}
