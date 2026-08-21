(() => {
    const SCROLL_TOP_THRESHOLD = 520;
    let activeScrollSurface = null;
    let button = null;

    function getDocumentScrollSurface() {
        return document.scrollingElement || document.documentElement;
    }

    function getScrollSurface(target) {
        if (!target || target === document || target === window) return getDocumentScrollSurface();
        if (!(target instanceof Element)) return getDocumentScrollSurface();
        return target.scrollHeight > target.clientHeight + 24 ? target : getDocumentScrollSurface();
    }

    function getActiveScrollSurface() {
        let documentSurface = getDocumentScrollSurface();
        if (activeScrollSurface === documentSurface) return documentSurface;
        if (activeScrollSurface && activeScrollSurface.isConnected
            && activeScrollSurface.getClientRects().length > 0) return activeScrollSurface;
        activeScrollSurface = documentSurface;
        return documentSurface;
    }

    function syncScrollTopButton() {
        if (!button) return;
        let surface = getActiveScrollSurface();
        button.hidden = Math.max(0, Number(surface && surface.scrollTop) || 0) < SCROLL_TOP_THRESHOLD;
    }

    function onScrollableSurfaceScroll(event) {
        activeScrollSurface = getScrollSurface(event.target);
        syncScrollTopButton();
    }

    function scrollActiveSurfaceToTop() {
        let surface = getActiveScrollSurface();
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
        button.setAttribute('aria-label', '현재 화면 맨 위로');
        button.addEventListener('click', scrollActiveSurfaceToTop);
        document.body.appendChild(button);
        activeScrollSurface = getDocumentScrollSurface();
        document.addEventListener('scroll', onScrollableSurfaceScroll, true);
        document.addEventListener('click', queueScrollTopButtonSync, true);
        window.addEventListener('resize', syncScrollTopButton);
        syncScrollTopButton();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installScrollTopButton, { once:true });
    else installScrollTopButton();
})();
