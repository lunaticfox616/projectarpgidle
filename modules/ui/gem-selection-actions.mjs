import { listenView, releaseViewTarget } from './view-events.mjs';
import { actions } from './gem-selection-controls.mjs';
import { comparison } from './gem-selection-comparison.mjs';
import { application } from './gem-selection-summary.mjs';

export function close(runtime) {
    const root = runtime.deps.document.getElementById('gem-selection');
    if (root?.matches(':popover-open')) root.hidePopover();
    runtime.state.selection?.anchor.classList.remove('is-gem-selected');
    runtime.state.selection = null;
}

export function createPanel(runtime) {
    let root = runtime.deps.document.getElementById('gem-selection');
    if (root) { bindSelectionPanel(runtime, root); return root; }
    root = runtime.deps.document.createElement('section');
    root.id = 'gem-selection';
    root.setAttribute('popover', 'auto');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', (0, runtime.deps._t)('룬 상세'));
    root.innerHTML = '<div class="gem-selection-actions"></div><div class="gem-selection-content"></div>';
    // 따라 하기 안내가 룬 카드와 상세의 '장착' 단추 사이로 표시를 옮긴다.
    runtime.state.ownsPanel = true;
    bindSelectionPanel(runtime, root);
    runtime.deps.document.getElementById('tab-skills').append(root);
    return root;
}



export function open(runtime, anchor, type, name) {
    if (!runtime.active) return;
    if (type === 'support') { close(runtime); runtime.deps.gemSlotDialog.open('support', runtime.deps.game.equippedSupports.includes(name) ? name : '', name); return; }
    close(runtime);
    runtime.state.selection = { anchor, type, name, owner: runtime.deps.game };
    anchor.classList.add('is-gem-selected');
    (0, runtime.deps.hideInfoTooltip)();
    const root = createPanel(runtime);
    root.querySelector('.gem-selection-actions').innerHTML = actions(runtime, type, name, anchor);
    const content = root.querySelector('.gem-selection-content');
    (0, runtime.deps.showGemTooltip)(null, type, name, content);
    const compare = comparison(runtime, type, name, anchor);
    if (compare) content.prepend(compare);
    if (type === 'support') {
        const note = runtime.deps.document.createElement('p');
        note.className = 'gem-application-note';
        note.textContent = application(runtime, name, (0, runtime.deps.getUiPlayerStats)());
        content.prepend(note);
    }
    if (anchor.classList.contains('equipment-blocked')) {
        const warning = runtime.deps.document.createElement('p');
        warning.className = 'condition-rule-warning';
        warning.textContent = anchor.querySelector('.gem-usage-state').textContent;
        content.prepend(warning);
    }
    root.showPopover();
    position(runtime);
    root.querySelector('button:not(:disabled)').focus({ preventScroll: true });
}

export function act(runtime, event) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) { close(runtime); return; }
    const button = event.target.closest('[data-gem-action]');
    if (!button || !runtime.state.selection) return;
    const current = { type: runtime.state.selection.type, name: runtime.state.selection.name };
    close(runtime);
    runtime.state.ACTIONS[button.dataset.gemAction]?.(current, button);
}

export function quickEquip(runtime, event) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) { close(runtime); return; }
    if (!runtime.state.selection || event.target.closest('button')) return;
    const {anchor,type,name} = runtime.state.selection;
    if (!anchor.contains(event.target) || anchor.matches('.active,.equipment-blocked')) return;
    event.preventDefault();
    close(runtime);
    if (type === 'support') (0, runtime.deps.toggleSupport)(name);
    else (0, runtime.deps.changeSkill)(name);
}

/** 상세가 들어갈 자리: 창과 그 안의 탭 내용(창 테두리 안쪽)이 겹치는 곳, 하단 메뉴 띠 위. 보조 비교 줄이 붙어 상세가 길어지면서 창 테두리에
* 닿도록 내려가 탭 내용 밖으로 나왔다(2026-10-24, 첫 세션 검사). */
export function popoverBounds(runtime, anchor) {
    const nav = runtime.deps.document.getElementById('tab-header-bottom');
    const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    const whole = { left: 0, top: 0, right: runtime.deps.innerWidth, bottom: runtime.deps.innerHeight };
    const frame = anchor.closest('.ui-window-open')?.getBoundingClientRect() || whole, pane = anchor.closest('.tab-content')?.getBoundingClientRect() || whole;
    return { left: Math.max(0, frame.left, pane.left), top: Math.max(0, frame.top, pane.top), right: Math.min(runtime.deps.innerWidth, frame.right, pane.right),
        bottom: Math.min(floor, frame.bottom, pane.bottom) };
}

/** 카드 오른쪽, 안 되면 왼쪽(세로는 창 안으로 당긴다), 둘 다 안 되면 아래 · 위. */
export function popoverSpot(runtime, anchor, size, bounds) {
    const minX = bounds.left + runtime.state.POPOVER_GAP, maxX = bounds.right - runtime.state.POPOVER_GAP - size.width;
    const minY = bounds.top + runtime.state.POPOVER_GAP, maxY = bounds.bottom - runtime.state.POPOVER_GAP - size.height;
    const fitY = y => Math.max(minY, Math.min(maxY, y));
    if (anchor.right + runtime.state.POPOVER_GAP <= maxX) return { x: anchor.right + runtime.state.POPOVER_GAP, y: fitY(anchor.top) };
    if (anchor.left - runtime.state.POPOVER_GAP - size.width >= minX) return { x: anchor.left - runtime.state.POPOVER_GAP - size.width, y: fitY(anchor.top) };
    const x = Math.max(minX, Math.min(maxX, anchor.left));
    if (anchor.bottom + runtime.state.POPOVER_GAP <= maxY) return { x, y: anchor.bottom + runtime.state.POPOVER_GAP };
    return { x, y: fitY(anchor.top - runtime.state.POPOVER_GAP - size.height) };
}

/** 휴대폰: 상세는 하단 메뉴 띠 바로 위에서 올라오는 시트(가로 전체)다 — 카드 옆 자리가 없다. */
export function placeSheet(runtime, root) {
    const nav = runtime.deps.document.getElementById('tab-header-bottom');
    const floor = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    root.style.left = root.style.top = '';
    root.style.bottom = `${(runtime.deps.innerHeight - floor) / runtime.deps.uiDisplay.factor}px`;
    root.style.maxHeight = `${floor * .72 / runtime.deps.uiDisplay.factor}px`;
}

/** 상세는 룬이 든 창 안에 머문다 — 창 아래로 넘쳐 HUD 미니맵을 덮었다(검토 2026-10-01). */
export function position(runtime) {
    if (runtime.state.selection && runtime.state.selection.owner !== runtime.deps.game) { close(runtime); return; }
    if (!runtime.state.selection) return;
    const root = runtime.deps.document.getElementById('gem-selection');
    if (!root.matches(':popover-open')) return;
    if (!runtime.state.selection.anchor.isConnected || !runtime.state.selection.anchor.getClientRects().length) { close(runtime); return; }
    const sheet = runtime.deps.uiDisplay.matches('(max-width: 1080px)');
    root.classList.toggle('is-sheet', sheet);
    if (sheet) { placeSheet(runtime, root); return; }
    root.style.bottom = '';
    const bounds = popoverBounds(runtime, runtime.state.selection.anchor);
    root.style.maxHeight = `${(bounds.bottom - bounds.top - 2 * runtime.state.POPOVER_GAP) / runtime.deps.uiDisplay.factor}px`;
    const spot = popoverSpot(runtime, runtime.state.selection.anchor.getBoundingClientRect(), root.getBoundingClientRect(), bounds);
    root.style.left = `${spot.x / runtime.deps.uiDisplay.factor}px`;
    root.style.top = `${spot.y / runtime.deps.uiDisplay.factor}px`;
}

function bindSelectionPanel(runtime, root) {
    if (runtime.state.panel === root) return;
    if (runtime.state.panel) releaseViewTarget(runtime, runtime.state.panel);
    runtime.state.panel = root;
    listenView(runtime, root, 'toggle', event => {
        if (event.newState === 'closed') close(runtime);
        if (typeof runtime.deps.tutorialActionUi === 'object') runtime.deps.tutorialActionUi.refresh();
    });
    listenView(runtime, root, 'click', runtime.handlers.act);

}
