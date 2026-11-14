/** One button per installed document. No listeners or DOM writes before start(). */
class ScrollTop {
    constructor({ window, document, translate }) {
        Object.assign(this, { window, document, translate, activeContext: null, button: null, disposed: false, started: false });
        this.frames = new Set();
        this.timers = new Set();
        this.hosts = new Set();
        this.install = this.install.bind(this);
        this.scroll = this.scroll.bind(this);
        this.sync = this.sync.bind(this);
        this.queueSync = this.queueSync.bind(this);
        this.toTop = this.toTop.bind(this);
    }
    start() {
        if (this.started || this.disposed) return;
        this.started = true;
        if (this.document.readyState === 'loading') this.document.addEventListener('DOMContentLoaded', this.install, { once: true });
        else this.install();
    }
    documentSurface() { return this.document.scrollingElement || this.document.documentElement; }
    currentTab() {
        return this.document.querySelector(this.document.body.classList.contains('desktop-windowed-ui')
            ? '.tab-content.ui-window-active' : '.tab-content.active:not(.merged-subtab-pane)');
    }
    eligible(tab) { return !!(tab && tab.id !== 'tab-battle' && tab.getClientRects().length > 0); }
    context(target) {
        if (!target || target === this.document || target === this.window) {
            const tab = this.currentTab();
            return this.eligible(tab) ? { tab, surface: this.documentSurface() } : null;
        }
        return this.elementContext(target);
    }
    elementContext(target) {
        if (!(target instanceof this.window.Element)) return null;
        const tab = target.matches('.tab-content') ? target : target.closest('.tab-content');
        if (!this.eligible(tab)) return null;
        const windowBody = target.matches('.ui-window-body') && target.parentElement === tab;
        if (target !== tab && !windowBody) return null;
        return target.scrollHeight > target.clientHeight + 24 ? { tab, surface: target } : null;
    }
    available() {
        if (!this.activeContext || !this.activeContext.tab.isConnected) return false;
        if (this.activeContext.tab !== this.currentTab()) return false;
        const { surface } = this.activeContext;
        return surface === this.documentSurface() || (surface.isConnected && surface.getClientRects().length > 0);
    }
    setContext(context) {
        this.activeContext = context;
        if (!context) return;
        if (this.button.parentElement !== context.tab) context.tab.appendChild(this.button);
        if (!context.tab.classList.contains('scroll-top-host')) this.hosts.add(context.tab);
        context.tab.classList.add('scroll-top-host');
    }
    sync() {
        if (!this.button || this.disposed) return;
        if (!this.available()) this.setContext(null);
        const surface = this.activeContext && this.activeContext.surface;
        this.button.toggleAttribute('hidden', !surface || Math.max(0, Number(surface.scrollTop) || 0) < 520);
    }
    scroll(event) {
        this.setContext(this.context(event.target));
        this.sync();
    }
    toTop() {
        if (!this.available()) return;
        const { surface } = this.activeContext;
        if (typeof surface.scrollTo === 'function') surface.scrollTo({ top: 0, behavior: 'smooth' });
        else surface.scrollTop = 0;
        const id = this.window.setTimeout(() => { this.timers.delete(id); this.sync(); }, 360);
        this.timers.add(id);
    }
    queueSync() {
        const id = this.window.requestAnimationFrame(() => { this.frames.delete(id); this.sync(); });
        this.frames.add(id);
    }
    install() {
        if (this.button || this.disposed) return;
        const button = this.document.createElement('button');
        Object.assign(button, { type: 'button', className: 'scroll-to-top-button', hidden: true, textContent: '↑' });
        button.dataset.tip = this.translate('맨 위로');
        button.setAttribute('aria-label', this.translate('현재 탭 맨 위로'));
        this.button = button;
        button.addEventListener('click', this.toTop);
        this.document.body.appendChild(button);
        this.document.addEventListener('scroll', this.scroll, true);
        this.document.addEventListener('click', this.queueSync, true);
        this.window.addEventListener('resize', this.sync);
        this.sync();
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.document.removeEventListener('DOMContentLoaded', this.install);
        this.document.removeEventListener('scroll', this.scroll, true);
        this.document.removeEventListener('click', this.queueSync, true);
        this.window.removeEventListener('resize', this.sync);
        this.frames.forEach(id => this.window.cancelAnimationFrame(id));
        this.timers.forEach(id => this.window.clearTimeout(id));
        this.frames.clear();
        this.timers.clear();
        this.button?.removeEventListener('click', this.toTop);
        this.button?.remove();
        this.hosts.forEach(tab => tab.classList.remove('scroll-top-host'));
        this.hosts.clear();
        this.button = null;
        this.activeContext = null;
    }
}
export function createScrollTop(env) {
    const service = new ScrollTop(env);
    return Object.freeze({ start: () => service.start(), dispose: () => service.dispose() });
}
