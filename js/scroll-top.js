(() => {
    const SCROLL_TOP_THRESHOLD = 520;
    let activeContext = null;
    let button = null;

    function getDocumentScrollSurface() {
        return document.scrollingElement || document.documentElement;
    }

    function getCurrentTab() {
        if (document.body.classList.contains('desktop-windowed-ui')) {
            return document.querySelector('.tab-content.ui-window-active');
        }
        return document.querySelector('.tab-content.active:not(.merged-subtab-pane)');
    }

    function isEligibleTab(tab) {
        return !!(tab && tab.id !== 'tab-battle' && tab.getClientRects().length > 0);
    }

    function getTabScrollContext(target) {
        if (!target || target === document || target === window) {
            let tab = getCurrentTab();
            return isEligibleTab(tab) ? { tab, surface:getDocumentScrollSurface() } : null;
        }
        if (!(target instanceof Element)) return null;
        let tab = target.matches('.tab-content') ? target : target.closest('.tab-content');
        if (!isEligibleTab(tab)) return null;
        let windowBody = target.matches('.ui-window-body') && target.parentElement === tab;
        if (target !== tab && !windowBody) return null;
        return target.scrollHeight > target.clientHeight + 24 ? { tab, surface:target } : null;
    }

    function isActiveContextAvailable() {
        if (!activeContext || !activeContext.tab.isConnected) return false;
        if (activeContext.tab !== getCurrentTab()) return false;
        let surface = activeContext.surface;
        if (surface === getDocumentScrollSurface()) return true;
        return surface.isConnected && surface.getClientRects().length > 0;
    }

    function setActiveContext(context) {
        activeContext = context;
        if (context && button.parentElement !== context.tab) context.tab.appendChild(button);
        if (context) context.tab.classList.add('scroll-top-host');
    }

    function syncScrollTopButton() {
        if (!button) return;
        if (!isActiveContextAvailable()) setActiveContext(null);
        let surface = activeContext && activeContext.surface;
        button.hidden = !surface || Math.max(0, Number(surface.scrollTop) || 0) < SCROLL_TOP_THRESHOLD;
    }

    function onScrollableSurfaceScroll(event) {
        setActiveContext(getTabScrollContext(event.target));
        syncScrollTopButton();
    }

    function scrollActiveSurfaceToTop() {
        if (!isActiveContextAvailable()) return;
        let surface = activeContext.surface;
        if (surface && typeof surface.scrollTo === 'function') surface.scrollTo({ top:0, behavior:'smooth' });
        else if (surface) surface.scrollTop = 0;
        window.setTimeout(syncScrollTopButton, 360);
    }

    function queueScrollTopButtonSync() {
        window.requestAnimationFrame(syncScrollTopButton);
    }

    function installScrollTopButton() {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'scroll-to-top-button';
        button.hidden = true;
        button.textContent = '↑';
        button.title = '맨 위로';
        button.setAttribute('aria-label', '현재 탭 맨 위로');
        button.addEventListener('click', scrollActiveSurfaceToTop);
        document.body.appendChild(button);
        document.addEventListener('scroll', onScrollableSurfaceScroll, true);
        document.addEventListener('click', queueScrollTopButtonSync, true);
        window.addEventListener('resize', syncScrollTopButton);
        syncScrollTopButton();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installScrollTopButton, { once:true });
    else installScrollTopButton();
})();
