/** The account screen's page listeners are detached with the application, not left on the window. */
export class CloudAccountPageEvents {
    constructor(deps) {
        this.deps = deps;
        this.onShow = event => { deps.recoverOAuth(event); deps.resumeCombat(Date.now()); };
        this.onVisibility = () => { if (!deps.document.hidden) deps.recoverOAuth(); };
        deps.window.addEventListener('pageshow', this.onShow);
        deps.document.addEventListener('visibilitychange', this.onVisibility);
    }

    dispose() {
        this.deps.window.removeEventListener('pageshow', this.onShow);
        this.deps.document.removeEventListener('visibilitychange', this.onVisibility);
    }
}
