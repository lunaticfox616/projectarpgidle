/**
 * 짧은 글 툴팁(2026-10-31 사용자: 브라우저 기본 툴팁을 모두 커스텀으로, 앞으로도 같은 실수가 없게). 요소에 data-tip="글"을 달면 마우스를
 * 올렸을 때, 터치는 길게 눌렀을 때 #info-tooltip으로 보여 준다. 글이 비면 띄우지 않고, 막힌 단추의 글은 못 하는 까닭이라 붉게 칠한다.
 * title 속성은 쓰지 않는다(scripts/check-runtime-architecture.js가 막고, 검사가 못 보는 경로로 들어온 것은 여기서 data-tip으로 옮긴다).
 * 보이는 글을 되풀이하는 툴팁은 달지 않고, 아이템 툴팁이 뜨는 칸 안에도 달지 않는다(두 툴팁이 겹친다).
 */
(() => {
    const SHOW_DELAY_MS = 120, HOLD_MS = 450, HOLD_SLOP_PX = 10;
    const HOST = '[data-tip]:not([data-tip=""])';
    let host = null, timer = 0, shown = false, pressed = false, x = 0, y = 0;

    const plainTipHost = event => (event.target.closest ? event.target.closest(HOST) : null);
    /** A title the ratchet could not see (an attribute name passed as data, say) still shows as ours. */
    function adoptStrayTitle(event) {
        const stray = event.target.closest ? event.target.closest('[title]') : null;
        if (!stray) return;
        console.warn('title 속성 대신 data-tip을 쓴다:', stray);
        stray.dataset.tip = stray.title;
        stray.removeAttribute('title');
    }
    function paintPlainTip() {
        timer = 0;
        if (!host || !host.isConnected) return;
        const refused = host.matches(':disabled, [aria-disabled="true"]');
        const html = `<div class="tooltip-line plain-tip${refused ? ' is-refused' : ''}">${escapeHTML(host.dataset.tip)}</div>`;
        showInfoTooltipHtml(x, y, html, refused ? '#b5654a' : '#a98546');
        shown = true;
    }
    function hidePlainTip() {
        clearTimeout(timer);
        timer = 0;
        if (shown) hideInfoTooltip();
        shown = false;
    }
    function forgetPlainTip() {
        hidePlainTip();
        host = null;
        pressed = false;
    }
    function armPlainTip(next, event, delay) {
        hidePlainTip();
        pressed = false;
        host = next;
        x = event.clientX;
        y = event.clientY;
        timer = setTimeout(paintPlainTip, delay);
    }
    function onPlainTipOver(event) {
        if (event.pointerType === 'touch') return;
        adoptStrayTitle(event);
        const next = plainTipHost(event);
        // A repaint under the pointer gives a new element, maybe with new numbers: the tip follows it without a flicker, and a press keeps it closed.
        if (next && host && (next.dataset.tip === host.dataset.tip || !host.isConnected)) {
            host = next;
            if (!timer && !pressed) paintPlainTip();
            return;
        }
        if (next) armPlainTip(next, event, SHOW_DELAY_MS);
        else forgetPlainTip();
    }
    /** A press closes the tip, as the browser's own did; it comes back only after the pointer leaves the element. */
    function onPlainTipDown(event) {
        if (event.pointerType !== 'touch') {
            hidePlainTip();
            pressed = true;
            return;
        }
        const next = plainTipHost(event);
        if (next) armPlainTip(next, event, HOLD_MS);
        else forgetPlainTip();
    }
    function onPlainTipMove(event) {
        if (event.pointerType === 'touch') {
            if (Math.hypot(event.clientX - x, event.clientY - y) > HOLD_SLOP_PX) forgetPlainTip();
            return;
        }
        x = event.clientX;
        y = event.clientY;
    }
    function onPlainTipUp(event) {
        if (event.pointerType === 'touch') forgetPlainTip();
    }

    const quiet = { capture: true, passive: true };
    document.addEventListener('pointerover', onPlainTipOver, quiet);
    document.addEventListener('pointerdown', onPlainTipDown, quiet);
    document.addEventListener('pointermove', onPlainTipMove, quiet);
    document.addEventListener('pointerup', onPlainTipUp, quiet);
    document.addEventListener('pointercancel', onPlainTipUp, quiet);
    document.documentElement.addEventListener('pointerleave', forgetPlainTip);
})();
