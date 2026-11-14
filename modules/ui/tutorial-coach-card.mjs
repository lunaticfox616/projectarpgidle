import { tutorialMarkup } from './tutorial-notice-markup.mjs';
import { listenView } from './view-events.mjs';
import { tutorialSamePlacement, tutorialCardSpots, rectsOverlap, tutorialVisibleRects, tutorialRectFits, tutorialRectOf } from './tutorial-placement.mjs';

export function coachRefreshText(runtime) {
    if (!runtime.state.coachActive || !runtime.state.coachCard) return;
    const { guide, step } = runtime.state.coachActive;
    const count = runtime.state.coachCard.querySelector('[data-step]');
    runtime.state.coachCard.setAttribute('aria-label', (0, runtime.deps._t)('플레이 안내'));
    runtime.state.coachCard.querySelector('strong').textContent = (0, runtime.deps._t)(guide.title);
    count.hidden = !step?.total || step.total < 2;
    count.textContent = count.hidden ? '' : (0, runtime.deps._t)('{step} / {total}단계', { step: step.number, total: step.total });
    runtime.state.coachCard.querySelector('p').innerHTML = tutorialMarkup(runtime, (0, runtime.deps._t)(step?.body || guide.body));
    runtime.state.coachCard.querySelector('[data-open]').textContent = (0, runtime.deps._t)('이어 하기');
    runtime.state.coachCard.querySelector('[data-skip]').textContent = (0, runtime.deps._t)('안내 닫기');
}

export function coachEnsureCard(runtime) {
    if (runtime.state.coachCard) {
        if (!runtime.state.coachCard.isConnected) runtime.deps.document.body.appendChild(runtime.state.coachCard);
        return;
    }
    const card = runtime.deps.document.createElement('aside');
    card.id = 'tutorial-action-card';
    card.className = 'tutorial-action-card';
    card.setAttribute('aria-label', (0, runtime.deps._t)('플레이 안내'));
    card.innerHTML = '<small data-step hidden></small><strong></strong><p id="tutorial-action-description" aria-live="polite"></p>'
        + '<div><button type="button" data-open hidden></button><button type="button" data-skip></button></div>';
    listenView(runtime, card.querySelector('[data-open]'), 'click', runtime.handlers.coachOpenTarget);
    listenView(runtime, card.querySelector('[data-skip]'), 'click', () => runtime.handlers.coachFinish(false, runtime.state.coachActive?.notice.replay));
    runtime.deps.document.body.appendChild(card);
    runtime.state.coachCard = card;
}

export function coachDockCard(runtime, target, step) {
    const anchor = target && coachInlineGuideAnchor(runtime, target, step);
    if (!anchor || !coachCanDockCard(runtime, anchor, step)) {
        coachFloatCard(runtime);
        return false;
    }
    const card = runtime.state.coachCard;
    if (card.classList.contains('is-docked') && runtime.state.coachDockAnchor === anchor && card.isConnected) return true;
    card.classList.add('is-docked');
    if (step.inline) anchor.after(card);
    else anchor.before(card);
    runtime.state.coachDockAnchor = anchor;
    coachRest(runtime);
    return true;
}

export function coachCanDockCard(runtime, anchor, step) {
    return step.dock || runtime.deps.uiDisplay.matches('(max-width: 1080px)')
        || !!anchor.closest('dialog[open], #gem-slot-dialog, #gem-engrave-slot-overlay');
}

export function coachFloatCard(runtime) {
    if (!runtime.state.coachCard.classList.contains('is-docked')) return;
    runtime.state.coachCard.classList.remove('is-docked');
    runtime.deps.document.body.appendChild(runtime.state.coachCard);
    runtime.state.coachDockAnchor = null;
    coachRest(runtime);
}

export function coachInlineGuideAnchor(runtime, target, step) {
    if (!step) return null;
    if (step.inline) return runtime.deps.document.querySelector(step.inline);
    return target?.closest('#passive-mobile-detail [data-passive-confirm], .cl-method-use, .cl-action, .npc-dialog-shop, .shop-deal-actions, #stump-placement-preview .stump-actions');
}

export function coachLeftGuideContext(runtime, action) {
    return action.contextual && action.guide.view && !action.guide.view();
}

export function coachRevealStep(runtime, action, target, docked) {
    if (action.revealedStep === action.step) return;
    action.revealedStep = action.step;
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (docked) runtime.state.coachCard.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function coachPlaceCard(runtime, target, fresh) {
    const guide = runtime.state.coachActive.guide, pinned = guide.focus ? guide.focus(target) : null;
    const focus = pinned || target.getBoundingClientRect(), avoid = coachAvoidRects(runtime, focus, target, fresh);
    const placed = { target, pinned: !!pinned };
    if (!fresh && tutorialSamePlacement(runtime, runtime.state.coachPlacedFor, placed) && coachKeepsClear(runtime, avoid)) return;
    const home = coachHomeRect(runtime);
    const spot = tutorialCardSpots(runtime, focus, target, home).find(rect => !avoid.some(other => rectsOverlap(runtime, rect, other)));
    runtime.state.coachPlacedFor = placed;
    // 둘 곳이 없으면(휴대폰에서 룬 상세가 화면을 채울 때) 잠시 비켜 선다. 표시는 가리키는 칸에 남는다.
    runtime.state.coachCard.classList.toggle('is-covered', !spot);
    if (!spot) return;
    const factor = runtime.deps.uiDisplay.factor || 1, style = runtime.state.coachCard.style;
    style.left = `${spot.left / factor}px`;
    style.top = `${spot.top / factor}px`;
    style.right = style.bottom = 'auto';
}

export function coachAvoidRects(runtime, focus, target, withTooltips) {
    const rects = tutorialVisibleRects(runtime, runtime.state.coachActive.guide.keepClear || []);
    const popover = target.closest(':popover-open');
    if (popover) rects.push(popover.getBoundingClientRect());
    if (focus.height <= runtime.deps.innerHeight / 2) rects.push(focus);
    if (withTooltips) rects.push(...tutorialVisibleRects(runtime, runtime.state.TUTORIAL_TOOLTIPS));
    rects.push(...tutorialVisibleRects(runtime, ['.guide-replay-bar']));
    return rects;
}

export function coachKeepsClear(runtime, avoid) {
    const box = runtime.state.coachCard.getBoundingClientRect();
    if (runtime.state.coachCard.classList.contains('is-covered') || box.top < 0 || box.bottom > runtime.deps.innerHeight) return false;
    return !avoid.some(rect => rectsOverlap(runtime, box, rect));
}

export function coachHomeRect(runtime) {
    const style = runtime.state.coachCard.style;
    style.left = style.top = style.right = style.bottom = '';
    return runtime.state.coachCard.getBoundingClientRect();
}

export function coachRest(runtime) {
    runtime.state.coachPlacedFor = null;
    runtime.state.coachCard.classList.remove('is-covered');
    coachHomeRect(runtime);
}

export function coachHushHover(runtime) {
    coachUnhush(runtime);
    if (!(0, runtime.deps.matchMedia)('(hover: hover)').matches) return;
    const at = { x: runtime.deps.mouseX, y: runtime.deps.mouseY };
    const wake = event => {
        if (event.type !== 'pointermove' || event.clientX !== at.x || event.clientY !== at.y) coachUnhush(runtime);
    };
    runtime.state.coachHush = { at, wake };
    runtime.state.TUTORIAL_HUSH_WAKERS.forEach(type => runtime.deps.window.addEventListener(type, wake, true));
}

export function coachUnhush(runtime) {
    if (!runtime.state.coachHush) return;
    runtime.state.TUTORIAL_HUSH_WAKERS.forEach(type => runtime.deps.window.removeEventListener(type, runtime.state.coachHush.wake, true));
    runtime.state.coachHush = null;
}

export function coachHushesTooltipAt(runtime, x, y) {
    return !!runtime.state.coachHush && x === runtime.state.coachHush.at.x && y === runtime.state.coachHush.at.y;
}

export function coachClearTooltipSpot(runtime, spot, x, y) {
    const card = runtime.state.coachCard;
    if (!runtime.state.coachActive || card.hidden || (0, runtime.deps.getComputedStyle)(card).visibility !== 'visible') return spot;
    const box = card.getBoundingClientRect();
    const left = x - spot.width - 18, top = y - spot.height - 18;
    const sides = [spot, { ...spot, left }, { ...spot, top }, { ...spot, left, top }, { ...spot, left: x + 18 }, { ...spot, top: y + 18 }];
    return sides.find(side => tutorialRectFits(runtime, side) && !rectsOverlap(runtime, box, tutorialRectOf(runtime, side))) || spot;
}

export function coachFindTarget(runtime, selectors) {
    for (const selector of [].concat(selectors)) {
        const found = [...runtime.deps.document.querySelectorAll(selector)].find(el => el.getClientRects().length);
        if (found) return found;
    }
    return null;
}

export function coachSetGuideTarget(runtime, target) {
    if (target === runtime.state.coachHighlighted) return;
    coachClearHighlight(runtime);
    if (!target) return;
    target.classList.add('tutorial-action-target');
    const describedBy = target.getAttribute('aria-describedby') || '';
    target.setAttribute('aria-describedby', (describedBy + ' tutorial-action-description').trim());
    runtime.state.coachHighlighted = target;
}

export function coachClearHighlight(runtime) {
    const target = runtime.state.coachHighlighted;
    if (!target) return;
    target.classList.remove('tutorial-action-target');
    const ids = (target.getAttribute('aria-describedby') || '').split(' ').filter(id => id !== 'tutorial-action-description');
    if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
    else target.removeAttribute('aria-describedby');
    runtime.state.coachHighlighted = null;
}
