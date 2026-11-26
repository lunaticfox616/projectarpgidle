import { supportSlotNames } from '../common/support-gems.mjs';
import { inspectSupportPlacement } from '../domain/rune-support-loadout.mjs';
import { supportTierRows } from './gem-slot-actions.mjs';
import { isDoubleTap, isTouch, nearestRuneSlot, setRuneDragImage, markRuneDropTarget, leaveRuneBoard } from './rune-board-gestures.mjs';
import { boardBudget, planFailure } from './support-placement-feedback.mjs';
import { listenView } from './view-events.mjs';

const runeSelector = '#ui-support-list [data-support-rune]';
const slotSelector = '#ui-support-slots [data-board-support-index]';
const librarySelector = '#ui-support-list';
const dragType = 'application/x-support-rune';

const selection = runtime => {
    if (runtime.state.supportBoard?.owner !== runtime.deps.game) {
        const hadSelection = !!runtime.state.supportBoard?.hadSelection;
        runtime.state.supportBoard = { owner: runtime.deps.game, rune: '', index: null, worn: null, status: '', tap: null, mouseSlot: null, drag: null, hadSelection };
    }
    return runtime.state.supportBoard;
};

const placementText = (deps, plan, budget) => {
    const delta = plan.delta > 0 ? '+' + plan.delta : String(plan.delta);
    return deps._t('공명 {delta} ({used}/{cap})', { delta, used: plan.total, cap: budget.resonance });
};

const updateSlotTargets = (runtime, slots, budget) => {
    const { deps } = runtime, state = selection(runtime);
    const source = !deps.game.woodsmanBuildLock && state.worn;
    for (const button of deps.document.querySelectorAll(slotSelector)) {
        const index = Number(button.dataset.boardSupportIndex);
        const active = state.index === index;
        const plan = state.rune ? inspectSupportPlacement(deps.game, { name: state.rune, index }, budget) : null;
        const failure = plan ? planFailure(deps, plan) : '';
        const legal = plan ? !plan.invalid && !failure : canMoveToSlot(source, index, slots);
        button.classList.toggle('is-legal-support', legal);
        button.classList.toggle('is-blocked-support', !!failure);
        button.setAttribute('aria-pressed', String(active));
        const baseLabel = deps._t('보조스킬룬 {index}번 칸', { index: index + 1 }) + ', ' + deps._t(slots[index] || '빈 칸');
        const caption = failure || (plan ? placementText(deps, plan, budget) : '');
        const note = button.querySelector('.support-placement-note');
        note.textContent = caption;
        note.hidden = !caption;
        button.setAttribute('aria-label', [baseLabel, caption].filter(Boolean).join(', '));
    }
};

const canMoveToSlot = (source, index, slots) => !!source && source.index !== index && slots[index] !== undefined;

const detailTiers = (runtime, name, stats, budget, remaining) => {
    const { deps } = runtime;
    const rows = supportTierRows(runtime, name, stats);
    if (rows.length < 2) return '';
    const currentCost = rows.find(row => row.active)?.cost || 0;
    return `<div class="support-detail-tiers" role="group" aria-label="${deps._t('보조스킬룬 등급')}">${rows.map(row => {
        const short = budget.overflow ? 0 : Math.max(0, row.cost - currentCost - remaining);
        const label = deps._t('공명 {cost}', { cost: row.cost });
        const reason = tierFailure(deps, row.open, short);
        return `<button type="button" data-support-board-tier="${row.tier}" data-rune-name="${deps.escapeHTML(name)}" aria-pressed="${row.active}"${reason ? ' disabled' : ''}><b>${deps._t(row.label)}</b><small>${deps.escapeHTML(label)}</small>${reason ? `<small>${deps.escapeHTML(reason)}</small>` : ''}</button>`;
    }).join('')}</div>`;
};

const tierFailure = (deps, open, short) => {
    if (!open || deps.game.woodsmanBuildLock) return deps._t('잠김');
    return short ? deps._t('공명력 {value} 부족', { value: short }) : '';
};

const detailBody = (runtime, slots, stats, budget) => {
    const { deps } = runtime, state = selection(runtime);
    const escape = deps.escapeHTML, t = deps._t;
    const equipped = slots[state.index] || '';
    const name = state.rune || equipped;
    const message = state.status ? `<p class="support-board-status" role="status">${escape(state.status)}</p>` : '';
    if (!name) return message;
    const tier = deps.getSupportActiveTier(name), cost = deps.getSupportTierResonanceCost(name);
    const worn = deps.game.equippedSupports.includes(name), replaced = worn ? name : equipped;
    const used = deps.game.equippedSupports.reduce((sum, rune) => sum + deps.getSupportTierResonanceCost(rune), 0);
    const tradeoff = budget.definitions[name].tradeoff;
    return `<header>${deps.supportGemSigil.html(name, 'support-rune-icon', tier)}
        <div><strong>${escape(t(name))}</strong><small>${escape(t('공명 {cost}', { cost }))}</small></div>
        ${worn ? unmountButton(deps, name) : ''}
        </header><p>${escape(deps.gemSelectionUi.effectText(name, tier, stats))}</p>
        ${tradeoff ? `<p>${escape(t('대가: {tradeoff}', { tradeoff: t(tradeoff) }))}</p>` : ''}
        ${deps.gemSelectionUi.targetDetails(name, stats, replaced)}${detailTiers(runtime, name, stats, budget, worn ? budget.resonance - used : Infinity)}${message}`;
};

const unmountButton = (deps, name) => `<button type="button" data-support-board-off data-rune-name="${deps.escapeHTML(name)}"${deps.game.woodsmanBuildLock ? ' disabled' : ''}>${deps._t('장착 해제')}</button>`;

/** @param {object} [currentStats] Stats from the current refresh or a read-only selection. */
export const refreshSupportBoard = (runtime, currentStats) => {
    const { deps } = runtime, state = selection(runtime);
    const detail = deps.document.getElementById('support-board-detail');
    if (!detail) return;
    const visible = supportBoardVisible(deps, state);
    if (idleDetail(state, detail)) return;
    const stats = currentStats || deps.getUiPlayerStats();
    const budget = boardBudget(deps, stats), slots = supportSlotNames(deps.game, budget.capacity);
    if (!deps.game.supports.includes(state.rune)) state.rune = '';
    if (slots[state.index] === undefined) state.index = null;
    discardStaleSource(state, slots);
    updateSlotTargets(runtime, slots, budget);
    updateLibrarySelection(deps, state, slots);
    detail.hidden = !visible || !hasDetail(state, slots);
    const html = detail.hidden ? '' : detailBody(runtime, slots, stats, budget);
    renderDetail(detail, html);
};

const supportBoardVisible = (deps, state) => {
    const visible = deps.skillGemBoardUi.currentKind() === 'support';
    if (!visible) clearSupportSelection(state);
    return visible;
};

const discardStaleSource = (state, slots) => {
    if (state.worn && slots[state.worn.index] !== state.worn.name) { state.worn = null; state.index = null; }
};

const updateLibrarySelection = (deps, state, slots) => {
    deps.document.getElementById('ui-support-list')?.classList.toggle('is-support-detach-target', !!state.drag && state.drag.index !== null);
    for (const card of deps.document.querySelectorAll(runeSelector)) {
        card.querySelector('[data-support-rune-pick]')?.setAttribute('aria-pressed', String(card.dataset.supportRune === (state.rune || slots[state.index])));
    }
    state.hadSelection = !!(state.rune || state.index !== null || state.drag);
};

const hasDetail = (state, slots) => state.rune || slots[state.index] || state.status;
const idleDetail = (state, detail) => !state.rune && state.index === null && !state.status && !state.hadSelection && detail.hidden && !detail.dataset.renderSig;

const renderDetail = (detail, html) => {
    if (detail.dataset.renderSig === html) return;
    const tier = detail.ownerDocument.activeElement?.getAttribute('data-support-board-tier');
    detail.innerHTML = html;
    detail.dataset.renderSig = html;
    if (tier) detail.querySelector(`[data-support-board-tier="${tier}"]`)?.focus({ preventScroll: true });
};

const mountRune = (runtime, name, index, expected) => {
    const { deps } = runtime, state = selection(runtime), budget = boardBudget(deps, deps.getUiPlayerStats());
    const plan = inspectSupportPlacement(deps.game, { name, index, expected }, budget);
    state.tap = null;
    state.worn = null;
    state.mouseSlot = null;
    state.rune = name;
    state.status = planFailure(deps, plan);
    if (plan.invalid) return false;
    state.index = index;
    if (state.status || !deps.toggleSupport(name, { index, expected })) return false;
    state.rune = '';
    return true;
};

const quickMount = (runtime, name) => {
    const { deps } = runtime, state = selection(runtime);
    if (deps.game.equippedSupports.includes(name)) return;
    const budget = boardBudget(deps, deps.getUiPlayerStats()), slots = supportSlotNames(deps.game, budget.capacity);
    const index = slots.indexOf('');
    state.rune = name;
    if (index < 0) {
        state.status = deps._t('교체할 칸을 선택하세요');
        return;
    }
    mountRune(runtime, name, index, '');
};

const selectRune = (runtime, name, event) => {
    const { deps } = runtime, state = selection(runtime);
    const stats = deps.getUiPlayerStats();
    const slots = supportSlotNames(deps.game, boardBudget(deps, stats).capacity);
    state.status = '';
    state.worn = null;
    state.mouseSlot = null;
    const restriction = event.target.closest(runeSelector)?.dataset.runeRestriction;
    if (restriction) {
        Object.assign(state, { rune: name, index: null, status: restriction, tap: null });
        return stats;
    }
    if (deps.game.equippedSupports.includes(name)) {
        state.rune = '';
        state.index = slots.indexOf(name);
        return stats;
    }
    if (slots[state.index] === '' && !event.target.closest('[data-support-rune-detail]')) {
        mountRune(runtime, name, state.index, '');
        return;
    }
    state.rune = name;
    state.index = null;
    if (isDoubleTap(state, name, event)) { quickMount(runtime, name); return; }
    return stats;
};

const readSlot = slot => ({ index: Number(slot.dataset.boardSupportIndex), name: slot.dataset.boardGem || '' });
const sameSlot = (first, second) => !!first && first.index === second.index && first.name === second.name;

const moveWorn = (runtime, source, target) => {
    const { deps } = runtime, state = selection(runtime);
    state.status = planFailure(deps, {});
    const move = target ? { from: source.index, index: target.index, expected: target.name } : { from: source.index, index: null };
    if (state.status || !deps.toggleSupport(source.name, move)) return false;
    Object.assign(state, { rune: '', index: move.index, worn: null, tap: null, mouseSlot: null });
    return true;
};

const selectSlot = (runtime, slot, event) => {
    const state = selection(runtime), clicked = readSlot(slot);
    state.status = '';
    if (state.rune) return mountRune(runtime, state.rune, clicked.index, clicked.name);
    if (state.worn && state.worn.index !== clicked.index) return moveWorn(runtime, state.worn, clicked);
    state.index = clicked.index;
    state.worn = clicked.name ? clicked : null;
    if (clicked.name) captureSlotClick(runtime, clicked, event);
};

const captureSlotClick = (runtime, clicked, event) => {
    const state = selection(runtime);
    if (isDoubleTap(state, `slot:${clicked.index}:${clicked.name}`, event)) return moveWorn(runtime, clicked, null);
    if (isTouch(event)) return;
    if (event.detail === 1) state.mouseSlot = clicked;
    else if (event.detail === 2 && sameSlot(state.mouseSlot, clicked)) state.mouseSlot.confirmed = true;
};

const onBoardClick = (runtime, event) => {
    if (event.target.closest('[data-tile-seal], [data-tile-unseal]')) return;
    const rune = event.target.closest(runeSelector), slot = event.target.closest(slotSelector);
    const button = event.target.closest('[data-support-board-tier], [data-support-board-off]');
    if ((!rune && !slot && !button) || slot?.classList.contains('tutorial-action-target')) return;
    runtime.deps.hideInfoTooltip();
    const stats = rune ? selectRune(runtime, rune.dataset.supportRune, event) : undefined;
    if (slot) selectSlot(runtime, slot, event);
    if (button) useDetailControl(runtime, button);
    refreshSupportBoard(runtime, stats);
};

const useDetailControl = (runtime, button) => {
    const { deps } = runtime, state = selection(runtime);
    const name = button.dataset.runeName;
    if (!name) return;
    if (button.dataset.supportBoardTier) {
        if (deps.setSupportActiveTier(name, Number(button.dataset.supportBoardTier))) state.status = '';
    }
    else {
        const slots = supportSlotNames(deps.game, boardBudget(deps, deps.getUiPlayerStats()).capacity);
        moveWorn(runtime, { name, index: slots.indexOf(name) }, null);
    }
};

const startDrag = (runtime, event) => {
    const { deps } = runtime, state = selection(runtime);
    if (blockedDragOrigin(state, event.target)) { event.preventDefault(); return; }
    const source = dragSource(deps, event.target);
    if (!source || deps.game.woodsmanBuildLock) return;
    setRuneDragImage(event.dataTransfer, event.target.closest(`${runeSelector}, ${slotSelector}`));
    showSupportBoard(deps);
    const worn = source.index === null ? null : source;
    const drag = { ...source, loadout: deps.game.equippedSupports, assignments: deps.game.supportSlotByName };
    Object.assign(state, { drag, worn, rune: worn ? '' : source.name, index: source.index, status: '', tap: null, mouseSlot: null });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragType, source.name);
    deps.hideInfoTooltip();
    refreshSupportBoard(runtime);
};

const showSupportBoard = deps => {
    if (deps.skillGemBoardUi.currentKind() !== 'support') deps.skillGemBoardUi.pick('support');
};

const blockedDragOrigin = (state, target) => !!state.sealDragCard && target.closest(runeSelector) === state.sealDragCard;

const dragSource = (deps, target) => {
    if (target.closest('[data-tile-seal], [data-tile-unseal]')) return null;
    const slot = target.closest(slotSelector);
    if (slot) return slot.dataset.boardGem ? readSlot(slot) : null;
    const card = target.closest(runeSelector);
    return card?.draggable && !deps.game.equippedSupports.includes(card.dataset.supportRune)
        ? { name: card.dataset.supportRune, index: null } : null;
};

const onDrag = (runtime, event) => {
    const state = selection(runtime);
    if (!activeDrag(runtime, state.drag)) { finishDrag(runtime); return; }
    const slot = dropSlot(runtime, event);
    const detach = state.drag.index !== null && event.target.closest(librarySelector);
    const allowed = dropAllowed(runtime, slot, detach);
    if (allowed) event.preventDefault();
    if (event.type === 'dragover') {
        markRuneDropTarget(state, allowed ? slot : null);
        event.dataTransfer.dropEffect = allowed ? 'move' : 'none';
        return;
    }
    const landed = allowed && event.dataTransfer.getData(dragType) === state.drag.name && applyDrop(runtime, slot, detach);
    finishDrag(runtime, landed);
};

const activeDrag = (runtime, drag) => !!drag && drag.loadout === runtime.deps.game.equippedSupports
    && drag.assignments === runtime.deps.game.supportSlotByName;

const dropSlot = (runtime, event) => {
    const target = event.target;
    const explicit = target.closest(slotSelector);
    if (explicit) return explicit;
    if (!target.closest('#ui-support-slots .support-slots-row') || target.closest('.support-slot.is-lock')) return null;
    if (!event.clientX && !event.clientY) return runtime.deps.document.querySelector(`${slotSelector}.is-empty.is-legal-support`);
    return nearestRuneSlot(runtime.deps.document.querySelectorAll(slotSelector), event);
};

const dropAllowed = (runtime, slot, detach) => !runtime.deps.game.woodsmanBuildLock && (detach || slot?.classList.contains('is-legal-support'));

const applyDrop = (runtime, slot, detach) => {
    const { drag } = selection(runtime);
    if (drag.index !== null) return moveWorn(runtime, drag, detach ? null : readSlot(slot));
    const target = readSlot(slot);
    return mountRune(runtime, drag.name, target.index, target.name);
};

/** @param {boolean} [landed] Whether a verified drop committed. */
const finishDrag = (runtime, landed) => {
    const state = selection(runtime);
    if (!state.drag) return;
    markRuneDropTarget(state, null);
    Object.assign(state, { drag: null, worn: null, rune: '', mouseSlot: null, tap: null });
    if (!landed) state.index = null;
    refreshSupportBoard(runtime);
};

const onBoardDoubleClick = (runtime, event) => {
    if (isTouch(event) || event.target.closest('[data-tile-seal], [data-tile-unseal]')) return;
    const slot = event.target.closest(slotSelector), state = selection(runtime);
    if (slot) {
        const source = readSlot(slot);
        if (!state.mouseSlot?.confirmed || !sameSlot(state.mouseSlot, source)) return;
        moveWorn(runtime, source, null);
    } else {
        const card = event.target.closest(runeSelector);
        if (!card || card.dataset.runeRestriction) return;
        quickMount(runtime, card.dataset.supportRune);
    }
    refreshSupportBoard(runtime);
};

const cancelSelection = (runtime, event) => {
    if (event.key !== 'Escape' || runtime.deps.skillGemBoardUi.currentKind() !== 'support') return;
    clearSupportSelection(selection(runtime));
    refreshSupportBoard(runtime);
};

const clearSupportSelection = state => {
    markRuneDropTarget(state, null);
    Object.assign(state, { rune: '', index: null, worn: null, status: '', tap: null, mouseSlot: null, drag: null });
};

const captureDragOrigin = (runtime, event) => {
    const control = event.target.closest('[data-tile-seal], [data-tile-unseal]');
    const state = runtime.state.supportBoard;
    if (control) selection(runtime).sealDragCard = control.closest(runeSelector);
    else if (state) state.sealDragCard = null;
};

export const installSupportBoard = runtime => {
    const doc = runtime.deps.document;
    listenView(runtime, doc, 'click', event => onBoardClick(runtime, event));
    listenView(runtime, doc, 'pointerdown', event => captureDragOrigin(runtime, event), true);
    listenView(runtime, doc, 'dblclick', event => onBoardDoubleClick(runtime, event));
    listenView(runtime, doc, 'keydown', event => cancelSelection(runtime, event));
    listenView(runtime, doc, 'dragstart', event => startDrag(runtime, event));
    listenView(runtime, doc, 'dragend', () => finishDrag(runtime));
    listenView(runtime, doc, 'dragleave', event => leaveRuneBoard(runtime.state.supportBoard, event.relatedTarget, '#ui-support-slots'));
    for (const type of ['dragover', 'drop']) listenView(runtime, doc, type, event => onDrag(runtime, event));
};
