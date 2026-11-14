import { itemCardHtml } from './shop-markup.mjs';

export function pickAt(runtime, node) {
    const el = node?.closest?.('[data-shop-pick]'), root = el?.closest('[data-shop-kind]');
    const adapter = root && runtime.state.adapters.get(root.dataset.shopKind);
    return adapter ? { root, adapter, el, pick: el.dataset.shopPick } : null;
}

/** The mouse over a ware, a listing or a bag item: its floating card beside it; over anything else, none. */
export function hoverPick(runtime, event) {
    if (event.pointerType !== 'mouse' || runtime.state.press) return;
    const peek = peekAt(runtime, event.target);
    if (peek && peek.html) showFloat(runtime, peek.el, peek.html);
    else hideFloat(runtime);
}

/** What the node shows when pointed: a bag item its own card, an adapter's thing what its shopPeekHtml says. */
export function peekAt(runtime, node) {
    const item = node?.closest?.('.shop-view [data-shop-item]');
    if (item) return { el: item, html: bagPeekHtml(runtime, item) };
    const at = pickAt(runtime, node);
    return at && at.adapter.shopPeekHtml ? { el: at.el, html: at.adapter.shopPeekHtml(at.root, at.pick) } : null;
}

/** A bag item's card, with why the shop does not take it (the stall) first. */
export function bagPeekHtml(runtime, el) {
    const item = runtime.deps.game.inventory.find(entry => String(entry.id) === el.dataset.shopItem);
    if (!item) return '';
    const why = el.dataset.shopWhy ? `<p class="shop-note">${(0, runtime.deps.escapeHTML)(el.dataset.shopWhy)}</p>` : '';
    return `${why}${itemCardHtml(runtime, item)}`;
}

export function showFloat(runtime, el, html) {
    const host = el.closest('dialog') || runtime.deps.document.body;
    if (!runtime.state.floatCard || runtime.state.floatCard.parentNode !== host) {
        runtime.state.floatCard?.remove();
        runtime.state.floatCard = Object.assign(runtime.deps.document.createElement('div'), { className: 'shop-float' });
        runtime.state.floatCard.setAttribute('aria-hidden', 'true');
        host.appendChild(runtime.state.floatCard);
    }
    if (runtime.state.floatCard.shopHtml !== html) { runtime.state.floatCard.innerHTML = html; runtime.state.floatCard.shopHtml = html; }
    runtime.state.floatCard.hidden = false;
    placeFloat(runtime, runtime.state.floatCard, el.getBoundingClientRect());
}

/** Beside the pointed thing: right of it when the card fits there, else left; kept inside the screen. Screen pixels divide by the
* UI scale (uiDisplay.factor), as the carried ghost's do; whole pixels keep the dot font sharp. */
export function placeFloat(runtime, card, at) {
    const factor = runtime.deps.uiDisplay.factor || 1, gap = 8, box = card.getBoundingClientRect();
    const x = at.right + gap + box.width <= runtime.deps.window.innerWidth - gap ? at.right + gap : Math.max(gap, at.left - gap - box.width);
    const y = Math.max(gap, Math.min(at.top, runtime.deps.window.innerHeight - gap - box.height));
    card.style.transform = `translate(${Math.round(x / factor)}px,${Math.round(y / factor)}px)`;
}

export function hideFloat(runtime) { if (runtime.state.floatCard) runtime.state.floatCard.hidden = true; }
