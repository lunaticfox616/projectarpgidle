import { listenView, releaseViewEvents } from './view-events.mjs';

const SEEN_KEY = 'rignin-psd-seen';

/** Device-local acknowledgement and transient emphasis, separate from game saves. */
class PsdAttentionView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.observer = null;
        this.actions = null;
        this.drawer = null;
        this.seen = this.readSeen();
        this.alerts = [
            { id: 'loop', button: 'btn-combat-loop-advance', key: element => element.style.display !== 'none' ? `loop-${this.deps.game ? this.deps.game.loopCount : 0}` : '' },
            { id: 'goal', button: 'btn-combat-goal-toggle', key: element => element.classList.contains('mandatory') ? `goal-${this.goalTitle()}` : '' },
            { id: 'auto', button: 'btn-act-exploration-auto', key: element => element.classList.contains('is-opening-glow') ? 'opening' : '' }
        ];
        if (deps.document.readyState === 'loading') listenView(this, deps.document, 'DOMContentLoaded', () => this.start(), { once: true });
        else this.start();
    }

    goalTitle() { return (this.deps.document.getElementById('ui-goal-title')?.textContent || '').trim(); }

    readSeen() {
        try {
            const value = JSON.parse(this.deps.storage.getItem(SEEN_KEY) || '{}');
            return value && typeof value === 'object' ? value : {};
        } catch (error) {
            this.deps.console.warn('[psd-skin] 본 알림을 읽지 못해 처음부터 셉니다.', error);
            return {};
        }
    }

    remember(id, key) {
        this.seen[id] = key;
        try { this.deps.storage.setItem(SEEN_KEY, JSON.stringify(this.seen)); }
        catch (error) { this.deps.console.warn('[psd-skin] 본 알림을 남기지 못했습니다(이번 접속 동안만 기억합니다).', error); }
    }

    refresh() {
        if (!this.active) return;
        for (const alert of this.alerts) {
            const element = this.deps.document.getElementById(alert.button);
            if (!element) continue;
            const key = alert.key(element);
            element.classList.toggle('psd-attn', !!key && this.seen[alert.id] !== key);
        }
    }

    onPress(event) {
        const target = event.target;
        if (!(target instanceof this.deps.Element)) return;
        target.closest('.tutorial-callout')?.classList.remove('tutorial-callout');
        const alert = this.alerts.find(item => target.closest(`#${item.button}`));
        if (!alert) return;
        const key = alert.key(this.deps.document.getElementById(alert.button));
        if (key) this.remember(alert.id, key);
        this.refresh();
    }

    start() {
        if (!this.active || this.observer) return;
        const actions = this.deps.document.querySelector('.combat-zone-actions');
        if (!actions) return;
        this.actions = actions;
        this.observer = new this.deps.MutationObserver(() => { this.watchDrawer(); this.refresh(); });
        this.watchDrawer();
        listenView(this, this.deps.document, 'click', event => this.onPress(event), true);
        this.refresh();
    }

    watchDrawer() {
        const drawer = this.deps.document.getElementById('ui-goal-drawer');
        if (drawer === this.drawer && this.observing) return;
        this.observer.disconnect();
        this.drawer = drawer;
        this.observer.observe(this.actions, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
        if (drawer) this.observer.observe(drawer, { childList: true, characterData: true, subtree: true });
        this.observing = true;
    }

    dispose() {
        releaseViewEvents(this);
        this.observer?.disconnect();
        this.observer = null;
        this.actions = this.drawer = null;
    }
}

export function createPsdAttentionView(deps) {
    // Existing optional presentation: headless environments may omit DOM observers.
    if (!deps.document || !deps.MutationObserver) return Object.freeze({ dispose() {} });
    const view = new PsdAttentionView(deps);
    return Object.freeze({ dispose: () => view.dispose() });
}
