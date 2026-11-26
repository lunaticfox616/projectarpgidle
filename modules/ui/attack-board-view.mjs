import { isDoubleTap, isTouch, nearestRuneSlot, setRuneDragImage, markRuneDropTarget, leaveRuneBoard } from './rune-board-gestures.mjs';
import { listenView } from './view-events.mjs';

const runeSelector = '#ui-skills-list [data-attack-rune]';
const slotSelector = '#ui-skill-board [data-board-pick]';
const slotGroup = '.skill-board-main, .skill-board-mobility, .skill-board-summons';
const lockSelector = '[data-tile-seal], [data-tile-unseal]';
const dragType = 'application/x-skill-rune';

const attackSelection = runtime => {
    if (runtime.state.attackBoard?.owner !== runtime.deps.game) {
        runtime.state.attackBoard = { owner: runtime.deps.game, name: '', drag: '', tap: null, message: '' };
    }
    return runtime.state.attackBoard;
};

const fits = (deps, name, kind) => {
    const natural = deps.skillGemBoardUi.kindOf(name);
    return natural === kind || (natural === 'mobility' && kind === 'active' && deps.isMobilityRuneAttackWorn(deps.game));
};

const eligible = (deps, name) => deps.game.skills.includes(name) && !deps.game.woodsmanBuildLock && deps.canUseSkillWithCurrentEquipment(name);

export const refreshAttackBoard = runtime => {
    const { deps } = runtime, state = attackSelection(runtime);
    const root = deps.document.getElementById('skill-tab-equip');
    if (!root) return;
    if (state.name && !eligible(deps, state.name)) resetSelection(state);
    const name = state.name;
    if (idleBoard(root, state)) return;
    root.toggleAttribute('data-attack-rune-selecting', !!name);
    for (const card of root.querySelectorAll(runeSelector)) {
        const icon = card.querySelector('[data-attack-rune-pick]');
        const pressed = String(card.dataset.attackRune === name);
        if (icon.getAttribute('aria-pressed') !== pressed) icon.setAttribute('aria-pressed', pressed);
    }
    for (const slot of root.querySelectorAll(slotSelector)) {
        slot.classList.toggle('is-rune-drop-target', !!name && acceptsRune(deps, name, slot));
    }
    showBoardMessage(root, state.message);
};

const showBoardMessage = (root, message) => {
    const status = root.querySelector('#attack-board-status');
    if (!status || (status.textContent === message && status.hidden === !message)) return;
    status.textContent = message;
    status.hidden = !message;
};

const idleBoard = (root, state) => !state.name && !state.message && !root.hasAttribute('data-attack-rune-selecting') && !root.querySelector('#attack-board-status:not([hidden])');

const chooseName = (runtime, name) => {
    const { deps } = runtime, state = attackSelection(runtime);
    state.name = name;
    state.message = '';
    deps.gemSelectionUi.close();
    deps.hideInfoTooltip();
};

const alreadyIn = (deps, name, kind) => {
    if (kind === 'active') return deps.game.activeSkill === name;
    if (kind === 'mobility') return deps.game.mobilitySkill === name;
    return deps.game.equippedSummonSkills.includes(name);
};

const acceptsRune = (deps, name, slot) => fits(deps, name, slot.dataset.boardPick) && !alreadyIn(deps, name, slot.dataset.boardPick);

const slotMismatch = (deps, name, kind, old) => {
    if (!fits(deps, name, kind)) return deps._t('룬 종류와 맞지 않는 칸입니다.');
    if (kind === 'summon' && old !== name && alreadyIn(deps, name, kind)) return deps._t('다른 칸에 장착 중');
    return '';
};

const equip = (runtime, name, kind, old = '') => {
    const { deps } = runtime, state = attackSelection(runtime);
    if (!eligible(deps, name)) return false;
    state.message = slotMismatch(deps, name, kind, old);
    if (state.message) return false;
    if (!alreadyIn(deps, name, kind)) deps.changeSkill(name, kind, kind === 'summon' ? old : '');
    if (!alreadyIn(deps, name, kind)) return false;
    Object.assign(state, { name: '', drag: '', tap: null, message: '' });
    return true;
};

const quickEquip = (runtime, name) => {
    const { deps } = runtime, state = attackSelection(runtime);
    const kind = deps.skillGemBoardUi.kindOf(name);
    // Leave the default routing to the existing mobility action when the boots are active.
    const dest = kind === 'mobility' && deps.isMobilityRuneAttackWorn(deps.game)
        && !deps.mobilitySkill.isMobilityGem(deps.game.activeSkill) ? 'active' : kind;
    if (equip(runtime, name, dest)) return;
    if (!state.message) state.message = deps._t('교체할 칸을 선택하세요');
};

const runeCard = event => event.target.closest(runeSelector);
const slotButton = event => event.target.closest(slotSelector);

// Prefer the column the pointer is over. In the gutters, use the nearest visible slot.
const dropSlot = event => {
    if (event.target.closest('[data-board-engrave]')) return null;
    const direct = slotButton(event);
    if (direct) return direct;
    const region = event.target.closest(slotGroup) || event.target.closest('#ui-skill-board');
    if (!region) return null;
    const slots = region.querySelectorAll('[data-board-pick]');
    if (slots.length <= 1) return slots[0] || null;
    return nearestRuneSlot(slots, event);
};

const resetSelection = state => {
    markRuneDropTarget(state, null);
    Object.assign(state, { name: '', drag: '', tap: null, message: '' });
};

const clearSelection = runtime => {
    resetSelection(attackSelection(runtime));
    refreshAttackBoard(runtime);
};

const selectedSlotAt = (event, state) => {
    if (!state.name) return null;
    const slot = slotButton(event) || (!event.target.closest('button') && dropSlot(event));
    return slot && !slot.classList.contains('tutorial-action-target') ? slot : null;
};

const onClick = (runtime, event) => {
    const state = attackSelection(runtime), card = runeCard(event);
    if (event.target.closest('[data-picker-kind]')) {
        clearSelection(runtime);
        return;
    }
    const slot = selectedSlotAt(event, state);
    if (slot) {
        event.stopPropagation();
        equip(runtime, state.name, slot.dataset.boardPick, slot.dataset.boardGem);
        refreshAttackBoard(runtime);
        return;
    }
    if (!card || event.target.closest(lockSelector + ', [data-attack-rune-detail]') || card.classList.contains('tutorial-action-target')) return;
    const name = card.dataset.attackRune;
    if (!eligible(runtime.deps, name)) {
        resetSelection(state);
        state.message = card.querySelector('.rune-card-restriction')?.textContent || '';
        refreshAttackBoard(runtime);
        return;
    }
    event.stopPropagation();
    chooseName(runtime, name);
    if (isDoubleTap(state, name, event)) quickEquip(runtime, name);
    refreshAttackBoard(runtime);
};

const onDoubleClick = (runtime, event) => {
    const card = runeCard(event);
    if (!card || event.target.closest(lockSelector) || card.classList.contains('tutorial-action-target')) return;
    const name = card.dataset.attackRune;
    if (!eligible(runtime.deps, name)) return;
    if (isTouch(event)) return;
    quickEquip(runtime, name);
    refreshAttackBoard(runtime);
};

const startDrag = (runtime, event) => {
    const card = runeCard(event);
    if (!card) return;
    const name = card.dataset.attackRune;
    if (attackSelection(runtime).lockPointer || !eligible(runtime.deps, name)) { event.preventDefault(); return; }
    setRuneDragImage(event.dataTransfer, card);
    chooseName(runtime, name);
    attackSelection(runtime).drag = name;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragType, name);
    refreshAttackBoard(runtime);
};

const onDragOver = (runtime, event) => {
    const state = attackSelection(runtime);
    if (!state.drag) return;
    const slot = dropSlot(event);
    const allowed = slot?.classList.contains('is-rune-drop-target');
    markRuneDropTarget(state, allowed ? slot : null);
    const message = slot && !allowed ? slotMismatch(runtime.deps, state.drag, slot.dataset.boardPick, slot.dataset.boardGem) || runtime.deps._t('장착 중') : '';
    if (state.message !== message) {
        state.message = message;
        showBoardMessage(event.currentTarget, message);
    }
    event.dataTransfer.dropEffect = allowed ? 'move' : 'none';
    if (!allowed) return;
    event.preventDefault();
};

const onDrop = (runtime, event) => {
    const state = attackSelection(runtime);
    if (!state.drag || event.dataTransfer.getData(dragType) !== state.drag) return;
    const slot = dropSlot(event);
    markRuneDropTarget(state, null);
    if (!slot || !acceptsRune(runtime.deps, state.drag, slot)) return;
    event.preventDefault();
    equip(runtime, state.drag, slot.dataset.boardPick, slot.dataset.boardGem);
    refreshAttackBoard(runtime);
};

export const installAttackBoard = runtime => {
    const board = runtime.deps.document.getElementById('skill-tab-equip');
    if (!board) return;
    listenView(runtime, board, 'pointerdown', event => {
        attackSelection(runtime).lockPointer = !!event.target.closest(lockSelector);
    }, true);
    listenView(runtime, board, 'click', event => onClick(runtime, event), true);
    listenView(runtime, board, 'dblclick', event => onDoubleClick(runtime, event));
    listenView(runtime, board, 'keydown', event => {
        if (event.key === 'Escape' && attackSelection(runtime).name) clearSelection(runtime);
    });
    listenView(runtime, board, 'dragstart', event => startDrag(runtime, event));
    listenView(runtime, board, 'dragover', event => onDragOver(runtime, event));
    listenView(runtime, board, 'drop', event => onDrop(runtime, event));
    listenView(runtime, board, 'dragleave', event => {
        const state = runtime.state.attackBoard;
        leaveRuneBoard(state, event.relatedTarget, '#ui-skill-board');
        if (state?.drag && state.message && !board.contains(event.relatedTarget)) {
            state.message = '';
            showBoardMessage(board, '');
        }
    });
    listenView(runtime, board, 'dragend', () => { if (runtime.state.attackBoard?.drag) clearSelection(runtime); });
};
