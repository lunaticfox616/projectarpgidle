import { readyRows, view_parentsOpen, unseenIds, stateOf, headHtml, canvasHtml, overviewHtml, nowLeft } from './unlock-tree-markup.mjs';
import { goalHtml, detailHtml } from './unlock-tree-detail.mjs';
import { listenView } from './view-events.mjs';
import { syncUnlockOwner, releaseUnlockPanel, beginUnlockGesture } from './unlock-tree-lifetime.mjs';

export function settleSelection(runtime) {
    if (!runtime.state.unlockBoard.has(runtime.state.view_selectedId)) {
        const ready = readyRows(runtime);
        runtime.state.view_selectedId = (ready.find(def => !def.rail) || ready[0] || runtime.state.unlockBoard.rows.find(def => def.id === runtime.state.UNLOCK_FAMILIES[0].root)).id;
    }
    return runtime.deps.CONTENT_UNLOCK_CATALOG.find(def => def.id === runtime.state.view_selectedId);
}

export function readMarks(runtime) {
    const owned = new Set(runtime.state.unlockBoard.rows.filter(def => runtime.deps.contentProgression.isUnlocked(def.id)).map(def => def.id));
    const open = new Set(runtime.state.unlockBoard.rows.filter(def => view_parentsOpen(runtime, def)).map(def => def.id));
    const marks = { lit: new Set(), fresh: new Set(), unseen: unseenIds(runtime) };
    if (runtime.state.view_shownOwned) {
        owned.forEach(id => { if (!runtime.state.view_shownOwned.has(id)) marks.lit.add(id); });
        open.forEach(id => { if (!runtime.state.view_shownOpenParents.has(id) && !owned.has(id)) marks.fresh.add(id); });
    }
    runtime.state.view_shownOwned = owned;
    runtime.state.view_shownOpenParents = open;
    return marks;
}

export function readPlans(runtime, id) {
    const goalId = runtime.deps.game.contentProgression.plannedUnlockId;
    const goal = goalId ? runtime.deps.window.GameModules.unlockPlan.read(goalId) : null;
    runtime.state.view_plannedPath = new Set(goal?.valid ? goal.ids : []);
    return { plan: runtime.deps.window.GameModules.unlockPlan.read(id), goal };
}

export function render(runtime) {
    syncUnlockOwner(runtime);
    const root = runtime.deps.document.getElementById('content-unlock-panel');
    if (!root || !runtime.deps.game.contentProgression) return;
    bindPanel(runtime, root);
    const selected = settleSelection(runtime), { plan, goal } = readPlans(runtime, selected.id);
    const states = runtime.state.unlockBoard.rows.map(def => stateOf(runtime, def)).join();
    const key = JSON.stringify([runtime.deps.i18n.language, runtime.deps.game.season, runtime.deps.contentProgression.balance(), states, runtime.state.view_selectedId, plan, goal, (runtime.deps.game.seenUnlocks || []).length, root.clientHeight, root.clientWidth]);
    if (runtime.state.view_shownKey === key && root.childNodes.length) return;
    runtime.state.view_shownKey = key;
    const keep = root.querySelector('.unlocks-scroll')?.scrollLeft || 0, keepTop = root.querySelector('.unlocks-scroll')?.scrollTop || 0;
    (0, runtime.deps.captureUiDisclosureState)(root);
    root.innerHTML = `${headHtml(runtime)}${goalHtml(runtime, goal)}<div class="unlocks-view"><div class="unlocks-scroll"><div class="unlocks-canvas"></div></div>
            <div class="unlock-fade is-left"></div><div class="unlock-fade is-right"></div><div class="unlock-corner">${(0, runtime.deps._t)('루프')}</div>
            <button type="button" class="unlock-edge is-left" data-unlock-edge="-1"></button><button type="button" class="unlock-edge is-right" data-unlock-edge="1"></button>
            <button type="button" class="unlock-to-now" data-unlock-now="1">${(0, runtime.deps._t)('지금으로')}</button></div><aside class="unlock-detail" aria-label="${(0, runtime.deps._t)('고른 해금')}">${detailHtml(runtime, selected, plan)}</aside>`;
    (0, runtime.deps.restoreUiDisclosureState)(root);
    fillBoard(runtime, root, keep, keepTop);
}

export function fillBoard(runtime, root, keep, keepTop) {
    runtime.state.stopGesture?.();
    const view = root.querySelector('.unlocks-view'), height = view.clientHeight;
    if (!height) return; // 창이 닫혀 있다: 열려서 크기가 생기면 다시 그린다(bindPanel).
    const L = runtime.state.view_layoutNow = runtime.state.unlockBoard.layout(height), marks = readMarks(runtime);
    const canvas = root.querySelector('.unlocks-canvas'), scroller = root.querySelector('.unlocks-scroll');
    canvas.style.width = `${L.board.width}px`;
    canvas.style.height = `${L.fullHeight}px`;   // 창이 낮으면 판이 더 높다: 끌어서 위아래로 본다(startPan)
    canvas.innerHTML = canvasHtml(runtime, L, marks, L.fullHeight);
    root.querySelector('.unlock-over-slot').innerHTML = overviewHtml(runtime, L);
    scroller.scrollLeft = runtime.state.view_centerNow || runtime.state.view_shownSeason !== runtime.deps.game.season ? nowLeft(runtime, scroller) : keep;
    scroller.scrollTop = keepTop;
    if (scroller.clientWidth) { runtime.state.view_centerNow = false; runtime.state.view_shownSeason = runtime.deps.game.season; }
    syncOverlays(runtime, root);
    if (runtime.state.view_revealId) scrollToNode(runtime, root, runtime.state.view_revealId);
    runtime.state.view_revealId = '';
}

export function syncOverlays(runtime, root) {
    const scroller = root.querySelector('.unlocks-scroll'), win = root.querySelector('.unlock-over-win');
    if (!scroller || !win || !runtime.state.view_layoutNow) return;
    const total = runtime.state.view_layoutNow.board.width, left = scroller.scrollLeft, width = scroller.clientWidth;
    win.style.left = `${(left / total * 100).toFixed(2)}%`;
    win.style.width = `${(width / total * 100).toFixed(2)}%`;
    const spots = readyRows(runtime).map(def => runtime.state.view_layoutNow.pos.get(def.id));
    const paint = (selector, count, label) => {
        const el = root.querySelector(selector);
        el.textContent = label(count);
        el.classList.toggle('is-on', count > 0);
    };
    paint('.unlock-edge.is-left', spots.filter(at => at.left < left).length, count => (0, runtime.deps._t)('◀ 가능 {count}', { count }));
    paint('.unlock-edge.is-right', spots.filter(at => at.right > left + width).length, count => (0, runtime.deps._t)('가능 {count} ▶', { count }));
    root.querySelectorAll('.unlock-rail').forEach(el => el.classList.toggle('is-stuck', Number(el.dataset.cardEnd) < left));
    root.querySelector('.unlock-fade.is-left').classList.toggle('is-on', left > 2);
    root.querySelector('.unlock-fade.is-right').classList.toggle('is-on', left + width < total - 2);
}

export function scrollToNode(runtime, root, id) {
    const scroller = root.querySelector('.unlocks-scroll'), at = runtime.state.view_layoutNow?.pos.get(id);
    if (at && scroller) scroller.scrollTo({ left: at.cx - scroller.clientWidth / 2, top: at.y - scroller.clientHeight / 2, behavior: 'smooth' });
}

export function select(runtime, id) {
    syncUnlockOwner(runtime);
    if (!runtime.state.unlockBoard.has(id)) return;
    runtime.state.view_selectedId = id;
    if (!Array.isArray(runtime.deps.game.seenUnlocks)) runtime.deps.game.seenUnlocks = [];
    if (!runtime.deps.game.seenUnlocks.includes(id)) runtime.deps.game.seenUnlocks.push(id);
    runtime.state.view_revealId = id;
    render(runtime);
}

export function jumpOffscreen(runtime, root, direction) {
    const scroller = root.querySelector('.unlocks-scroll'), seenFrom = scroller.scrollLeft, seenTo = seenFrom + scroller.clientWidth;
    const list = readyRows(runtime).map(def => runtime.state.view_layoutNow.pos.get(def.id)).filter(at => (direction < 0 ? at.left < seenFrom : at.right > seenTo)).sort((a, b) => a.left - b.left);
    if (list.length) select(runtime, (direction < 0 ? list[list.length - 1] : list[0]).def.id);
}

export function cycleReady(runtime) {
    const list = readyRows(runtime).sort((a, b) => runtime.state.view_layoutNow.pos.get(a.id).left - runtime.state.view_layoutNow.pos.get(b.id).left);
    if (!list.length) return;
    runtime.state.view_jump = (runtime.state.view_jump + 1) % list.length;
    select(runtime, list[runtime.state.view_jump].id);
}

export function pin(runtime, id) {
    const target = runtime.deps.game.contentProgression.plannedUnlockId === id ? '' : id;
    const keepFocus = runtime.deps.document.activeElement?.matches?.('[data-unlock-goal], [data-unlock-goal-clear]');
    if (!runtime.deps.contentProgression.planTarget(target)) return;
    render(runtime);
    if (keepFocus) runtime.deps.document.querySelector('#content-unlock-panel .unlock-pin')?.focus({ preventScroll: true });
    (0, runtime.deps.saveGame)({ skipCloudSync: false });
}

export function markPath(runtime, root, id) {
    root.querySelectorAll('.is-path').forEach(el => el.classList.remove('is-path'));
    if (!id) return;
    const path = new Set(), waiting = [id];
    while (waiting.length) {
        const step = waiting.pop();
        path.add(step);
        waiting.push(...runtime.deps.contentProgression.parents(runtime.deps.CONTENT_UNLOCK_CATALOG.find(def => def.id === step)));
    }
    root.querySelectorAll('.unlocks-canvas [data-unlock-select]').forEach(el => { if (path.has(el.dataset.unlockSelect)) el.classList.add('is-path'); });
    root.querySelectorAll('polyline[data-to]').forEach(el => {
        if (!path.has(el.dataset.to) || !path.has(el.dataset.from)) return;
        el.classList.add('is-path');
        el.parentNode.appendChild(el);
    });
}

export function handleClick(runtime, event) {
    const control = event.target.closest?.('#content-unlock-panel button');
    if (!control) return;
    if (syncUnlockOwner(runtime)) { render(runtime); return; }
    const root = runtime.deps.document.getElementById('content-unlock-panel'), data = control.dataset;
    if (data.unlockGoal) { pin(runtime, data.unlockGoal); return; }
    if (data.unlockGoalClear) { pin(runtime, runtime.deps.game.contentProgression.plannedUnlockId); return; }
    if (data.unlockSelect) { select(runtime, data.unlockSelect); return; }
    if (data.unlockNext) { cycleReady(runtime); return; }
    if (data.unlockEdge) { jumpOffscreen(runtime, root, Number(data.unlockEdge)); return; }
    if (data.unlockNow) { const scroller = root.querySelector('.unlocks-scroll'); scroller.scrollTo({ left: nowLeft(runtime, scroller), behavior: 'smooth' }); }
}

export function startPan(runtime, event, root) {
    if (event.pointerType !== 'mouse' || event.target.closest('button')) return;
    const scroller = root.querySelector('.unlocks-scroll'), scale = runtime.deps.uiDisplay.factor || 1, from = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    const pan = move => {
        scroller.scrollLeft = from.left - (move.clientX - from.x) / scale;
        scroller.scrollTop = from.top - (move.clientY - from.y) / scale;
    };
    beginUnlockGesture(runtime, event, scroller, pan);
    scroller.classList.add('is-panning');
}

export function startOverview(runtime, event, root) {
    const box = root.querySelector('.unlock-over'), scroller = root.querySelector('.unlocks-scroll');
    const go = move => {
        const rect = box.getBoundingClientRect();
        scroller.scrollLeft = (move.clientX - rect.left) / rect.width * runtime.state.view_layoutNow.board.width - scroller.clientWidth / 2;
    };
    go(event);
    beginUnlockGesture(runtime, event, scroller, go);
}

export function onPointerDown(runtime, event, root) {
    if (syncUnlockOwner(runtime)) { render(runtime); return; }
    if (event.button) return;
    if (event.target.closest?.('.unlock-over')) { startOverview(runtime, event, root); return; }
    if (event.target.closest?.('.unlocks-scroll')) startPan(runtime, event, root);
}

export function onWheel(runtime, event, root) {
    if (!event.target.closest?.('.unlocks-view')) return;
    event.preventDefault();
    root.querySelector('.unlocks-scroll').scrollLeft += event.deltaY || event.deltaX;
}

export function bindPanel(runtime, root) {
    if (runtime.state.panel === root) return;
    releaseUnlockPanel(runtime);
    runtime.state.panel = root;
    listenView(runtime, root, 'pointerover', event => {
        const node = event.target.closest?.('.unlocks-canvas [data-unlock-select]');
        markPath(runtime, root, node ? node.dataset.unlockSelect : '');
    });
    listenView(runtime, root, 'pointerleave', () => markPath(runtime, root, ''));
        listenView(runtime, root, 'pointerdown', event => runtime.handlers.onPointerDown(event, root));
    listenView(runtime, root, 'wheel', event => onWheel(runtime, event, root), { passive: false });
    listenView(runtime, root, 'scroll', () => syncOverlays(runtime, root), true);
        runtime.state.observer = new runtime.deps.ResizeObserver(() => { if (runtime.active && runtime.state.panel === root && root.clientWidth) runtime.handlers.render(); });
    runtime.state.observer.observe(root);
}
