/** application/world-notices: native owner; state is read from the supplied current-game port. */
export class WorldNotices {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.queueContentNotice = this.queueContentNotice.bind(this);
        this.queueTutorialNotice = this.queueTutorialNotice.bind(this);
        this.isTransientGameState = this.isTransientGameState.bind(this);
    }

    queueContentNotice(key, title, contentId, bodies, route) {
        const opened = typeof this.deps.contentProgression !== 'object' || this.deps.contentProgression.isUnlocked(contentId);
        if (opened) { this.queueTutorialNotice(key, title, bodies.open, route); return; }
        this.queueTutorialNotice(key, title, bodies.locked, 'tab-unlocks');
    }

    queueTutorialNotice(key, title, body, tabId, target) {
        if (this.isTransientGameState(this.deps.game)) return;
        const opening = typeof this.deps.contentProgression === 'object' ? this.deps.contentProgression.opening : null;
        const extra = target && typeof target === 'object' ? target : { subtabId: target };
        const inline = extra.inline || opening?.inlineNotice(this.deps.game, key);
        if (inline && !opening.canOpen(this.deps.game, tabId)) return;
        const notice = { ...extra, key, title, body, tabId };
        this.deps.tutorialHistory.enqueue(this.deps.game, notice);
        if (inline) {
            this.deps.tutorialHistory.archivePending(this.deps.game, key);
        }
    }

    isTransientGameState(owner) { return !!(owner?.isBackgroundCalculation || owner?.isGuideReplay); }
}
