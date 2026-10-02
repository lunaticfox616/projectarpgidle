// 선택 창 틀(2026-10-03): 코어, 주얼 보관함과 소켓, 혼돈 주입, 조합창 재료, 홀씨 모드 창이 함께 쓴다.
// 틀(제목, 닫기 단추, 바깥 누르기)과 동작(Esc, 창 안의 포커스, 닫을 때 연 단추로 되돌리기, 같은 창 다시 그리기)만 맡고
// 창 안의 내용은 각 화면이 그린다. 모양은 .selection-overlay 계열 CSS 그대로다. 단축키는 hotkeys-ui.js가 이 창을 보고 멈춘다.
const selectionDialog = (() => {
    const PANEL = '.selection-overlay-panel';
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const openers = new Map();
    let listening = false;

    function topOverlay() {
        const all = document.querySelectorAll('.selection-overlay');
        return all[all.length - 1] || null;
    }

    function focusables(panel) {
        return Array.from(panel.querySelectorAll(FOCUSABLE));
    }

    function isIdleFocus(element) {
        return !element || element === document.body;
    }

    /** A redraw keeps the panel's scroll and the focused control's place. It takes focus only from inside or from nowhere. */
    function remember(overlay) {
        const panel = overlay && overlay.querySelector(PANEL);
        if (!panel) return null;
        const active = document.activeElement;
        return { scroll: panel.scrollTop, index: focusables(panel).indexOf(active), takeFocus: isIdleFocus(active) || panel.contains(active) };
    }

    function frameHtml({ id, title, panelClass = '', body }) {
        return `<div class="selection-overlay-panel ${panelClass}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1">
            <div class="selection-overlay-header"><div class="selection-overlay-title" id="${id}-title">${title}</div>
                <button type="button" data-selection-close>닫기</button></div>
            ${body}</div>`;
    }

    function create(id) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'selection-overlay';
        overlay.onclick = event => {
            if (event.target === overlay || event.target.closest('[data-selection-close]')) close(id);
        };
        openers.set(id, document.activeElement);
        listen();
        return overlay;
    }

    function settle(overlay, memory) {
        const panel = overlay.querySelector(PANEL);
        if (!panel) return null;
        if (memory) panel.scrollTop = memory.scroll;
        if (!memory || memory.takeFocus) (focusables(panel)[memory ? memory.index : -1] || panel).focus({ preventScroll: true });
        return panel;
    }

    /** Opens the dialog, or redraws the open one in place. title and body are HTML the caller has escaped. Returns the panel. */
    function show(options) {
        const existing = document.getElementById(options.id);
        const memory = remember(existing);
        const overlay = existing || create(options.id);
        overlay.innerHTML = frameHtml(options);
        if (!existing) document.body.append(overlay);
        return settle(overlay, memory);
    }

    function close(id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        const active = document.activeElement;
        const opener = isIdleFocus(active) || overlay.contains(active) ? openers.get(id) : null;
        openers.delete(id);
        overlay.remove();
        if (!isIdleFocus(opener) && opener.isConnected) opener.focus({ preventScroll: true });
    }

    function listen() {
        if (listening) return;
        listening = true;
        // window의 캡처 단계에서 받는다: 장비 칸 선택 해제나 기타 메뉴 닫기처럼 document에서 Esc를 받는 처리보다 이 창이 위에 있다.
        window.addEventListener('keydown', onKeydown, true);
    }

    function onKeydown(event) {
        const overlay = topOverlay();
        if (!overlay || document.querySelector('dialog:modal') || !['Escape', 'Tab'].includes(event.key)) return;
        event.stopPropagation();
        if (event.key === 'Tab') return trapTab(event, overlay);
        event.preventDefault();
        close(overlay.id);
    }

    /** Tab and Shift+Tab go round inside the panel. Focus that slipped outside comes back in. */
    function trapTab(event, overlay) {
        const panel = overlay.querySelector(PANEL);
        const items = focusables(panel), active = document.activeElement;
        const first = items[0] || panel, last = items[items.length - 1] || panel;
        const inside = panel.contains(active);
        const wraps = !inside || (event.shiftKey ? active === first || active === panel : active === last);
        if (!wraps) return;
        event.preventDefault();
        (event.shiftKey && inside ? last : first).focus({ preventScroll: true });
    }

    return Object.freeze({ show, close, isOpen: id => !!document.getElementById(id) });
})();
safeExposeGlobals({ selectionDialog });
