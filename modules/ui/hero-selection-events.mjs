import { listenView } from './view-events.mjs';
import { acceptsHeroChoice } from './hero-selection-session.mjs';

export function installHeroSelectionEvents(runtime) {
    const { deps } = runtime, overlay = deps.document.getElementById('loop-hero-select-overlay');
    if (overlay) {
        listenView(runtime, overlay, 'click', event => clickChoice(runtime, event));
        listenView(runtime, overlay, 'mouseover', event => tooltipChoice(runtime, event));
        listenView(runtime, overlay, 'mousemove', event => tooltipChoice(runtime, event));
        listenView(runtime, overlay, 'mouseout', event => {
            const card = event.target.closest('[data-class-id]');
            if (card && !card.contains(event.relatedTarget)) deps.hideInfoTooltip();
        });
    }
    for (const [id, handler] of [['sel-active-hero', 'onHeroSelectionChanged'], ['sel-hero-appearance-mode', 'onHeroAppearanceModeChanged']]) {
        const select = deps.document.getElementById(id);
        if (select) listenView(runtime, select, 'change', () => runtime.handlers[handler]());
    }
    listenView(runtime, deps.window, 'project-idle:loop-hero-selection-requested', event => requestSelection(runtime, event));
    listenView(runtime, deps.window, 'project-idle:loop-hero-selection-completed', event => completeSelection(runtime, event));
}

function clickChoice(runtime, event) {
    if (!acceptsHeroChoice(runtime)) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const { handlers, deps } = runtime;
    if (button.dataset.classId) {
        deps.hideInfoTooltip();
        handlers.pressLoopHeroChoice(button.dataset.classId, button.dataset.experienced === 'true');
    } else if (button.dataset.basicElement) handlers.chooseLoopBasicSkill(button.dataset.basicElement);
    else if (button.id === 'loop-hero-select-start') handlers.chooseLoopHero(button.value);
}

function tooltipChoice(runtime, event) {
    if (!acceptsHeroChoice(runtime)) return;
    const card = event.target.closest('[data-class-id]');
    if (card) runtime.handlers.showHeroChoiceTooltip(event, card.dataset.classId, card.dataset.experienced === 'true');
}

function requestSelection(runtime, event) {
    const { deps, handlers } = runtime, detail = event?.detail;
    if (!detail || typeof detail.select !== 'function') return;
    if (handlers.isLoopHeroSelectOpen() || deps.isStartupOverlayOpen() || deps.isLoadingOverlayOpen() || deps.isDeathOverlayOpen()) return;
    detail.handled = handlers.openLoopHeroSelection(detail.select, detail.options || {});
}

function completeSelection({ deps }, event) {
    const detail = event?.detail;
    if (!detail) return;
    if (detail.changed) deps.addLog(deps._t('루프 전환 직업: {label}', { label: deps.rules.definition(detail.classId).label }), 'season-up');
    deps.switchTab('tab-character');
}
