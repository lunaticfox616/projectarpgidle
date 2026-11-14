import { stripHtmlMessage } from './combat-log-markup.mjs';
import { queueCombatLogTimer, queueCombatLogFrame, syncCombatLogOwner } from './combat-log-lifetime.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

export function shouldShowMobileToast(runtime, msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    if (!usesToastPresentation(runtime)) return false;
    let text = stripHtmlMessage(runtime, msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || '');
    if (importantFailure) return true;
    let level = cls || '';
    if (level === 'season-up' || level === 'loot-unique') return true;
    return false;
}

function usesToastPresentation(runtime) {
    const isMobile = (runtime.deps.window.matchMedia && runtime.deps.uiDisplay.matches('(max-width: 900px)')) || ('ontouchstart' in runtime.deps.window);
    const logHidden = runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings.showCombatLog === false;
    return isMobile || logHidden;
}

export function getMobileToastRoot(runtime) {
    let root = runtime.deps.document.getElementById('mobile-toast-root');
    if (root) return root;
    root = runtime.deps.document.createElement('div');
    root.id = 'mobile-toast-root';
    root.style.position = 'fixed';
    root.style.left = '50%';
    root.style.bottom = 'var(--mobile-toast-bottom, 84px)'; // 전투 화면은 CSS가 HUD 판 위로 올린다(pixel-mobile.css)
    root.style.transform = 'translateX(-50%)';
    root.style.zIndex = '22000';
    root.style.pointerEvents = 'none';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '8px';
    root.style.width = 'min(calc(92vw / var(--scale-display-factor, 1)), 420px)';
    runtime.deps.document.body.appendChild(root);
    return root;
}

export function enqueueMobileToast(runtime, msg, cls) {
    runtime.state.mobileToastQueue.push({ msg: stripHtmlMessage(runtime, msg), cls: cls || '' });
    pumpMobileToastQueue(runtime);
}

/** The offline result card covers the phone screen: notices wait and are looked at again shortly after. */
export function resumeMobileToastsAfterResult(runtime) {
    runtime.state.mobileToastResultHoldTimer = null;
    pumpMobileToastQueue(runtime);
}

export function pumpMobileToastQueue(runtime) {
    // A guide card sits where these notices appear on phones: hold them until it closes (dismissTutorial pumps again).
    if (typeof runtime.deps.isTutorialOpen === 'function' && (0, runtime.deps.isTutorialOpen)()) return;
    if (runtime.deps.document.getElementById('background-combat-result-overlay')) {
        runtime.state.mobileToastResultHoldTimer = runtime.state.mobileToastResultHoldTimer || queueCombatLogTimer(runtime, runtime.handlers.resumeMobileToastsAfterResult, 600);
        return;
    }
    while (runtime.state.mobileToastActiveCount < runtime.state.MOBILE_TOAST_MAX_CONCURRENT && runtime.state.mobileToastQueue.length > 0) {
        showNextMobileToast(runtime);
    }
}

export function getMobileToastDisplayDurationMs(runtime) {
    let backlog = runtime.state.mobileToastQueue.length;
    return Math.max(650, 1700 - (backlog * 180));
}

export function showNextMobileToast(runtime) {
    if (runtime.state.mobileToastQueue.length <= 0) return;
    let entry = runtime.state.mobileToastQueue.shift();
    runtime.state.mobileToastActiveCount++;
    let root = getMobileToastRoot(runtime);
    let toast = runtime.deps.document.createElement('div');
    toast.textContent = entry.msg;
    toast.className = entry.cls === 'attack-monster' ? 'mobile-log-toast mobile-log-toast--error' : 'mobile-log-toast';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .2s ease';
    root.appendChild(toast);
    runtime.toasts.add(toast);
    queueCombatLogFrame(runtime, () => { toast.style.opacity = '1'; });
    // A tap clears it at once and the next one follows; otherwise it fades out on its own.
    listenView(runtime, toast, 'click', () => {
        syncCombatLogOwner(runtime);
        if (runtime.toasts.has(toast)) releaseMobileToast(runtime, toast, 90);
    });
    queueCombatLogTimer(runtime, () => releaseMobileToast(runtime, toast, 220), getMobileToastDisplayDurationMs(runtime));
}

/** Frees a phone toast's slot once: fade out, remove, then let the next queued toast in. */
export function releaseMobileToast(runtime, toast, fadeMs) {
    if (toast.dataset.released) return;
    toast.dataset.released = '1';
    toast.style.transition = `opacity ${fadeMs}ms ease`;
    toast.style.opacity = '0';
    queueCombatLogTimer(runtime, () => {
        releaseViewTarget(runtime, toast);
        runtime.toasts.delete(toast);
        toast.remove();
        runtime.state.mobileToastActiveCount = Math.max(0, runtime.state.mobileToastActiveCount - 1);
        queueCombatLogTimer(runtime, runtime.handlers.pumpMobileToastQueue, 0);
    }, fadeMs);
}
