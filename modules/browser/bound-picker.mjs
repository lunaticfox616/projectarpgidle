/** Caller owns the already-mounted overlay and closes it through the returned action.
 * Internal title/detail HTML has already been escaped by the rendering caller. */
export function bindGamePicker(overlay, options) {
        const document = overlay.ownerDocument;
        let closed = false;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', options.titleId);
        const close = () => {
            if (closed) return;
            closed = true;
            overlay.onclick = null;
            overlay.onkeydown = null;
            closeButton.onclick = null;
            overlay.remove();
            options.onClose?.();
            document.querySelector(options.returnSelector)?.focus({preventScroll:true});
        };
        overlay.onclick = event => { if (event.target === overlay) close(); };
        overlay.onkeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation(); close(); return;
            }
            if (event.key !== 'Tab') return;
            const controls = [...overlay.querySelectorAll('button:not(:disabled),select:not(:disabled)')]
                .filter(control => control.getClientRects().length);
            const first = controls[0], last = controls[controls.length-1];
            const target = event.shiftKey ? last : first;
            if (document.activeElement !== (event.shiftKey ? first : last)) return;
            event.preventDefault(); target.focus();
        };
        const closeButton = overlay.querySelector(options.closeSelector);
        closeButton.onclick = close;
        closeButton.focus({preventScroll:true});
        return close;
    }
