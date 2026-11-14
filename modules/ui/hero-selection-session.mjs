import { heroChoicesHtml, loopHeroMutationHtml, renderLoopHeroChoiceDetail } from './hero-selection-markup.mjs';
import { persistHeroSelectionChange } from './hero-selection-actions.mjs';

export function isLoopHeroSelectOpen({ deps }) {
    return !!deps.document.getElementById('loop-hero-select-overlay')?.classList.contains('active');
}

export function openLoopHeroSelection(runtime, onSelect, options = {}) {
    const { deps } = runtime, doc = deps.document;
    const overlay = doc.getElementById('loop-hero-select-overlay'), grid = doc.getElementById('loop-hero-select-grid');
    if (!overlay || !grid) {
        deps.console.error('직업 선택 화면을 열 수 없습니다: 필수 DOM이 없습니다.');
        return false;
    }
    runtime.owner = deps.game;
    runtime.onSelect = typeof onSelect === 'function' ? onSelect : null;
    runtime.basicClass = null;
    runtime.elements = [];
    renderHeroSelectionHeading(runtime, options);
    grid.classList.remove('is-basic-pick');
    grid.innerHTML = heroChoicesHtml(runtime);
    renderLoopHeroChoiceDetail(runtime, null);
    overlay.classList.add('active');
    grid.parentElement.scrollTo(0, 0);
    return true;
}

function renderHeroSelectionHeading(runtime, options) {
    const { deps } = runtime, doc = deps.document;
    const kicker = doc.getElementById('loop-hero-select-kicker'), title = doc.getElementById('loop-hero-select-title');
    const body = doc.getElementById('loop-hero-select-body');
    if (kicker) kicker.innerText = options.kicker || deps._t('다음 루프');
    if (title) title.innerText = options.title || deps._t('다음 루프 직업 선택');
    if (body) body.innerHTML = deps.escapeHTML(options.body || deps._t('이번 루프에서 사용할 직업을 선택하세요.')) + loopHeroMutationHtml(runtime);
}

/** Input belongs to the save which opened the dialog. A query must not silently adopt another save. */
export function acceptsHeroChoice(runtime) {
    if (!runtime.active || !runtime.owner) return false;
    if (runtime.owner === runtime.deps.game) return true;
    resetHeroSelectionForSave(runtime);
    return false;
}

export function closeHeroSelection(runtime) {
    runtime.deps.document.getElementById('loop-hero-select-overlay')?.classList.remove('active');
    runtime.deps.document.getElementById('loop-hero-select-grid')?.classList.remove('is-basic-pick');
    runtime.owner = null;
    runtime.onSelect = null;
    runtime.basicClass = null;
    runtime.elements = [];
}

export function finishLoopHeroChoice(runtime, classId) {
    if (!acceptsHeroChoice(runtime)) return;
    const callback = runtime.onSelect;
    closeHeroSelection(runtime);
    if (typeof callback === 'function') callback(classId);
    runtime.deps.session.lastTime = runtime.deps.Date.now();
}

export function ensureInitialHeroSelection(runtime) {
    if (runtime.deps.game.heroSelectionInitialized) return true;
    if (isLoopHeroSelectOpen(runtime)) {
        if (runtime.owner === runtime.deps.game) return true;
        closeHeroSelection(runtime);
    }
    const { deps } = runtime, owner = deps.game;
    return openLoopHeroSelection(runtime, id => finishInitialChoice(runtime, owner, id), {
        kicker: deps._t('첫 루프'), title: deps._t('시작 직업 선택'), body: deps._t('첫 루프에서 사용할 직업을 선택하세요.')
    });
}

function finishInitialChoice(runtime, owner, id) {
    const { deps } = runtime;
    if (!runtime.active || owner !== deps.game) return;
    deps.rules.markInitialized(owner);
    const stats = deps.getUiPlayerStats();
    deps.rules.initialize(owner, stats, deps.getPlayerHpCap(stats));
    deps.updateCombatUI(stats);
    deps.addLog(deps._t('시작 직업을 선택했습니다: {blindLabel}', { blindLabel: deps.PLAYER_CLASS_DEFS[id].blindLabel }), 'season-up');
    persistHeroSelectionChange(runtime, '시작 직업 선택');
    deps.openingJourney.afterStartPick();
}

/** Discard callbacks/element selection on save replacement; a new character gets its own fresh picker. */
export function resetHeroSelectionForSave(runtime) {
    const wasOpen = isLoopHeroSelectOpen(runtime);
    closeHeroSelection(runtime);
    if (wasOpen && !runtime.deps.game.heroSelectionInitialized) ensureInitialHeroSelection(runtime);
}
