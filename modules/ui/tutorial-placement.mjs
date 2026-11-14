import { scheduleTutorialTimer } from './tutorial-timers.mjs';


export function rectsOverlap(runtime, a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** The card still sits where it was placed for this target and the same kind of focus (a pinned spot such as the tree's
 * node cluster, or the whole target — the cluster has no screen position until the tree is first drawn). */
export function tutorialSamePlacement(runtime, placed, next) {
    return !!placed && placed.target === next.target && placed.pinned === next.pinned;
}

export function tutorialRectOf(runtime, box) {
    return { left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height };
}

export function tutorialRectFits(runtime, box) {
    const edge = runtime.state.TUTORIAL_CARD_EDGE;
    return box.left >= edge && box.top >= edge && box.left + box.width <= runtime.deps.innerWidth - edge && box.top + box.height <= runtime.deps.innerHeight - edge;
}

/** Rects of the selectors' first matches that are on screen. */
export function tutorialVisibleRects(runtime, selectors) {
    return selectors.map(selector => runtime.deps.document.querySelector(selector))
        .filter(node => node && node.getClientRects().length).map(node => node.getBoundingClientRect());
}

/** Coach card spots in order of preference (see tutorialActionUi.placeCard): beside the target's window on the free
 * battlefield, left / right of the focus, below / above it, then the CSS home. Below comes first: on phones the tree's
 * start sits low with its branches above, and a target too low for the card below gets it above. Spots stay on screen
 * and above home's bottom edge, which CSS keeps clear of the HUD orbs, the minimap and the phone tab bar. */
export function tutorialCardSpots(runtime, focus, target, home) {
    const width = home.width, height = home.height, gap = runtime.state.TUTORIAL_CARD_GAP;
    const frame = target.closest('.ui-window-open');
    const pane = frame ? frame.getBoundingClientRect() : null;
    const row = Math.max(runtime.state.TUTORIAL_CARD_EDGE, Math.min(home.bottom - height, focus.top));
    const column = Math.max(runtime.state.TUTORIAL_CARD_EDGE, Math.min(runtime.deps.innerWidth - runtime.state.TUTORIAL_CARD_EDGE - width, focus.left));
    const spots = [
        ...(pane ? [{ left: pane.left - gap - width, top: row }, { left: pane.right + gap, top: row }] : []),
        { left: focus.left - gap - width, top: row }, { left: focus.right + gap, top: row },
        { left: column, top: focus.bottom + gap }, { left: column, top: focus.top - gap - height },
        { left: home.left, top: home.top }
    ];
    return spots.map(spot => tutorialRectOf(runtime, { ...spot, width, height }))
        .filter(rect => rect.left >= runtime.state.TUTORIAL_CARD_EDGE && rect.top >= runtime.state.TUTORIAL_CARD_EDGE && rect.right <= runtime.deps.innerWidth - runtime.state.TUTORIAL_CARD_EDGE && rect.bottom <= home.bottom);
}

/** 안내가 연 창은 맨 위에서 시작해(남아 있던 스크롤에 창 머리가 잘려 보였다) 가리키는 칸이 다 보일 만큼만 내린다. */
export function revealTutorialTarget(runtime, target) {
    const scroller = tutorialScrollParent(runtime, target);
    if (scroller) scroller.scrollTop = 0;
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (scroller && scroller.classList.contains('ui-window-body')) tidyTutorialScroll(runtime, scroller, target);
}

export function tutorialScrollParent(runtime, node) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test((0, runtime.deps.getComputedStyle)(parent).overflowY)) return parent;
    }
    return null;
}

/** 창 몸통의 맨 윗줄(직계 자식)이 반쯤 잘려 보이면 칸이 다 보이는 한 그 줄을 통째로 넘긴다 — 1440×900의 스킬룬 창은 첫 룬
 * 카드가 다 보이려면 44px을 내려야 해 '현재 전투 세팅' 단추가 반으로 잘렸다(검토 2026-10-01). */
export function tidyTutorialScroll(runtime, scroller, target) {
    const offset = scroller.scrollTop, top = scroller.getBoundingClientRect().top + scroller.clientTop;
    const span = node => { const rect = node.getBoundingClientRect(); return { start: offset + rect.top - top, end: offset + rect.bottom - top }; };
    const rows = [...scroller.children].filter(node => node.getClientRects().length).map(span);
    const index = rows.findIndex(row => row.end > offset), cut = rows[index], next = rows[index + 1];
    if (!offset || !cut || cut.start >= offset || !next) return;
    const clean = Math.max(cut.end, next.start - (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(scroller).paddingTop));
    if (clean <= span(target).start) scroller.scrollTop = clean;
}

export function tutorialShown(runtime, node) {
    return !!(node && node.classList && node.getClientRects && node.getClientRects().length);
}

/** The menu buttons of the screen a card points to: the tab's own button when it is on screen; otherwise that button
 * (it lights up once its menu opens) plus the visible button that opens it — the merged launcher, 기타 or 전체. */
export function tutorialMenuButtons(runtime, tabId) {
    const own = runtime.deps.document.getElementById(`btn-${tabId}`);
    if (tutorialShown(runtime, own)) return [own];
    const group = typeof runtime.deps.getMergedTabGroup === 'function' ? (0, runtime.deps.getMergedTabGroup)(tabId) : null;
    const ids = [group ? `btn-${group[1].launcher}` : '', ...runtime.state.TUTORIAL_MENU_OPENERS];
    const opener = ids.map(id => (id ? runtime.deps.document.getElementById(id) : null)).find(runtime.handlers.tutorialShown) || null;
    return [own, opener].filter(node => node && node.classList);
}

export function clearTutorialCallout(runtime) {
    (0, runtime.deps.clearTimeout)(runtime.state.tutorialCalloutTimer);
    runtime.timers.delete(runtime.state.tutorialCalloutTimer);
    runtime.state.tutorialCalloutTimer = null;
    runtime.state.tutorialCallouts.forEach(node => node.classList.remove('tutorial-callout'));
    runtime.state.tutorialCallouts = [];
}

/** Pulses those buttons while the card is up (holdMs 0) and a little after a plain 확인 (holdMs), so a newly
 * opened screen can be found again. */
export function setTutorialCallout(runtime, tabId, holdMs) {
    clearTutorialCallout(runtime);
    runtime.state.tutorialCallouts = tabId ? tutorialMenuButtons(runtime, tabId) : [];
    runtime.state.tutorialCallouts.forEach(node => node.classList.add('tutorial-callout'));
    if (holdMs && runtime.state.tutorialCallouts.length) runtime.state.tutorialCalloutTimer = scheduleTutorialTimer(runtime, runtime.handlers.clearTutorialCallout, holdMs);
}

/** Wide screens: centre the guide card right above the player HUD (life orb and panel) so it covers neither the combat
 * log nor the minimap. Phones keep the bottom sheet from CSS. Coordinates are divided by the display zoom. */
export function placeTutorialCard(runtime) {
    const overlay = runtime.deps.document.getElementById('tutorial-overlay');
    if (!overlay || !overlay.style) return;
    const hud = runtime.deps.document.querySelector('.combat-top-status.player-hud'), orb = runtime.deps.document.getElementById('ui-hp-bar');
    const rect = hud ? hud.getBoundingClientRect() : null;
    if (!rect || !rect.width || runtime.deps.uiDisplay.matches('(max-width: 1080px)')) {
        overlay.style.removeProperty('--tutorial-anchor-left');
        overlay.style.removeProperty('--tutorial-anchor-bottom');
        return;
    }
    const factor = runtime.deps.uiDisplay.factor || 1, viewWidth = runtime.deps.window.innerWidth / factor, width = Math.min(420, viewWidth - 24);
    const top = Math.min(rect.top, orb ? orb.getBoundingClientRect().top : rect.top) / factor;
    const centred = Math.max(12, Math.min(viewWidth - width - 12, (rect.left + rect.width / 2) / factor - width / 2));
    const left = tutorialLeftClearOfWindows(runtime, centred, width, factor);
    overlay.style.setProperty('--tutorial-anchor-left', `${Math.round(left)}px`);
    overlay.style.setProperty('--tutorial-anchor-bottom', `${Math.round(runtime.deps.window.innerHeight / factor - top + 10)}px`);
}

/** An open window docked beside the HUD (equipment, skills…) keeps its content: the card slides left into the free
 * battlefield when there is room, otherwise it stays centred over the HUD. */
export function tutorialLeftClearOfWindows(runtime, left, width, factor) {
    let limit = Infinity;
    runtime.deps.document.querySelectorAll('.tab-content.ui-window.ui-window-open').forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.width && rect.left / factor < left + width && rect.right / factor > left) limit = Math.min(limit, rect.left / factor);
    });
    return limit !== Infinity && limit - width - 12 >= 12 ? Math.min(left, limit - width - 12) : left;
}
