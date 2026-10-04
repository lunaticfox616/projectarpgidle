// 그루터기 함: 끌어 옮기기와 마우스 툴팁(2026-10-04 사용자 요청, 장비 창 js/equipment-inventory-grid-ui.js와 같은 손맛).
// 마우스 · 펜은 6px 움직이면 끌기가 시작되고, 손가락은 0.28초 누르고 있어야 시작된다(그 전에 움직이면 화면이 스크롤된다).
// 판의 칸(빈 칸이면 옮기고, 찬 칸이면 자리를 바꾼다)이나 보관함에 놓는다. 판정 · 다시 그리기 · 툴팁 내용은 stumpBoxUi가 맡고
// (dropOnCell · dropOnStorage · tipFor), 이 모듈은 포인터 상태와 끌리는 그림, 놓을 자리 표시만 다룬다.
(function () {
    'use strict';
    const DRAG_PX = 6, HOLD_MS = 280, TOUCH_SLOP_PX = 10;
    let press = null, drag = null, swallowClick = false, frame = 0, pending = null;

    function stumpTarget(event) { return event.target && event.target.closest ? event.target.closest('#tab-stump') && event.target : null; }

    // ── 누르기 → 끌기 ──────────────────────────────────────
    function clearPress() {
        if (!press) return;
        clearTimeout(press.timer);
        press.source.classList.remove('is-held');
        press = null;
    }
    /** Touch shows tooltips only through the ? button; any other press closes it (a mouse closes it by moving away). */
    function closeTouchTooltip(event, target) {
        if (event.pointerType !== 'mouse' && !(target && target.closest('[data-stump-tip="rules"]'))) hideInfoTooltip();
    }
    function startPress(event) {
        swallowClick = false;
        if (press || drag || event.button > 0 || event.isPrimary === false) return;
        const target = stumpTarget(event);
        closeTouchTooltip(event, target);
        const source = target && target.closest('[data-stump-drag]');
        if (source) holdSource(event, source);
    }
    function holdSource(event, source) {
        const touch = event.pointerType === 'touch';
        press = { pointerId: event.pointerId, id: Number(source.dataset.stumpDrag), source, x: event.clientX, y: event.clientY, armed: !touch, timer: 0 };
        if (touch) press.timer = setTimeout(() => { if (press) { press.armed = true; press.source.classList.add('is-held'); } }, HOLD_MS);
    }
    function ghostFor(source) {
        const ghost = document.createElement('div');
        ghost.className = 'stump-drag-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        const image = source.querySelector('img');
        if (image) ghost.appendChild(image.cloneNode(false));
        ghost.style.setProperty('--stump-tone', source.style.getPropertyValue('--stump-tone') || 'transparent');
        document.body.appendChild(ghost);
        return ghost;
    }
    function beginDrag(event) {
        drag = { id: press.id, source: press.source, ghost: ghostFor(press.source), zone: null };
        clearPress();
        drag.source.classList.add('is-dragging');
        document.getElementById('tab-stump')?.classList.add('is-stump-dragging');
        hideInfoTooltip();
        follow(event);
    }
    function movePress(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
        if (!press.armed) {
            // A finger that moves before the hold ends is scrolling the page.
            if (distance > TOUCH_SLOP_PX) clearPress();
            return;
        }
        if (distance >= DRAG_PX) beginDrag(event);
    }

    // ── 끄는 중 ────────────────────────────────────────────
    function zoneAt(x, y) {
        const hit = document.elementFromPoint(x, y);
        return hit && hit.closest ? hit.closest('#tab-stump [data-stump-drop-cell], #tab-stump [data-stump-drop-storage]') : null;
    }
    /** Whether dropping here would do anything: another open cell, or storage for an item that is on the board. */
    function zoneAccepts(zone) {
        if (zone.dataset.stumpDropStorage) return game.stumpBox.board.includes(drag.id);
        const cell = Number(zone.dataset.stumpDropCell);
        return stumpBox.isOpen(game, cell) && game.stumpBox.board[cell] !== drag.id;
    }
    function markZone(zone) {
        if (drag.zone === zone) return;
        drag.zone?.classList.remove('is-drop-ok', 'is-drop-bad');
        drag.zone = zone;
        if (zone) zone.classList.add(zoneAccepts(zone) ? 'is-drop-ok' : 'is-drop-bad');
    }
    function follow(point) {
        if (!drag) return;
        const scale = uiDisplay.factor || 1;
        drag.ghost.style.transform = `translate3d(${Math.round(point.clientX / scale)}px,${Math.round(point.clientY / scale)}px,0)`;
        markZone(zoneAt(point.clientX, point.clientY));
    }
    function scheduleFollow(event) {
        pending = { clientX: event.clientX, clientY: event.clientY };
        if (frame) return;
        frame = requestAnimationFrame(() => { frame = 0; follow(pending); });
    }
    function endDrag() {
        if (!drag) return;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        drag.zone?.classList.remove('is-drop-ok', 'is-drop-bad');
        drag.source.classList.remove('is-dragging');
        drag.ghost.remove();
        document.getElementById('tab-stump')?.classList.remove('is-stump-dragging');
        drag = null;
    }
    function finishDrag(event) {
        const id = drag.id, zone = zoneAt(event.clientX, event.clientY);
        endDrag();
        // The release makes one click on whatever is under the pointer; only that click is swallowed.
        swallowClick = true;
        setTimeout(() => { swallowClick = false; }, 0);
        if (!zone) return;
        if (zone.dataset.stumpDropStorage) stumpBoxUi.dropOnStorage(id);
        else stumpBoxUi.dropOnCell(id, Number(zone.dataset.stumpDropCell));
    }

    // ── 포인터 이벤트 ──────────────────────────────────────
    function onPointerMove(event) {
        if (drag) {
            event.preventDefault();
            scheduleFollow(event);
            return;
        }
        movePress(event);
    }
    function onPointerUp(event) {
        if (drag) {
            event.preventDefault();
            finishDrag(event);
            return;
        }
        if (press && press.pointerId === event.pointerId) clearPress();
    }
    function onPointerCancel() {
        clearPress();
        endDrag();
    }
    /** Once a finger has held long enough the page must not scroll under the drag. */
    function onTouchMove(event) {
        if (drag || (press && press.armed)) event.preventDefault();
    }
    /** A drag ends with a click on whatever is under the finger; that click must not also select or move. */
    function onClickCapture(event) {
        if (swallowClick && stumpTarget(event)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    function onKeydown(event) {
        if (event.key !== 'Escape' || !drag) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        endDrag();
    }

    // ── 마우스 툴팁 ────────────────────────────────────────
    function onHover(event) {
        if (event.pointerType !== 'mouse' || drag || press) return;
        const target = stumpTarget(event), anchor = target && target.closest('[data-stump-tip]');
        if (!anchor) return;
        const tip = stumpBoxUi.tipFor(anchor);
        if (tip) showInfoTooltipHtml(event.clientX, event.clientY, tip.html, tip.tone);
        else hideInfoTooltip();
    }
    function onLeave(event) {
        const target = stumpTarget(event), anchor = target && target.closest('[data-stump-tip]');
        if (anchor && !anchor.contains(event.relatedTarget)) hideInfoTooltip();
    }
    /** Keyboard users reach the rules by focusing the ? button (pressing it is handled by stumpBoxUi). */
    function onRulesFocus(event) {
        const target = stumpTarget(event), button = target && target.closest('[data-stump-tip="rules"]');
        if (!button || !button.matches(':focus-visible')) return;
        const rect = button.getBoundingClientRect(), tip = stumpBoxUi.tipFor(button);
        showInfoTooltipHtml(rect.left, rect.bottom, tip.html, tip.tone);
    }
    function onRulesBlur(event) {
        const target = stumpTarget(event);
        if (target && target.closest('[data-stump-tip="rules"]')) hideInfoTooltip();
    }

    function bind() {
        document.addEventListener('pointerdown', startPress);
        document.addEventListener('pointermove', onPointerMove, { passive: false });
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerCancel);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('keydown', onKeydown, true);
        document.addEventListener('pointerover', onHover);
        document.addEventListener('pointermove', onHover, { passive: true });
        document.addEventListener('pointerout', onLeave);
        document.addEventListener('focusin', onRulesFocus);
        document.addEventListener('focusout', onRulesBlur);
        document.addEventListener('contextmenu', event => { if (press || drag) event.preventDefault(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();
}());
