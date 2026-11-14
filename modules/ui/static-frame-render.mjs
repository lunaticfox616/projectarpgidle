import { prepareStaticUi, syncStaticProgress, syncStaticLoopControls, renderStaticPassiveTree } from './static-frame-progress.mjs';
import { startStaticTiming, reportStaticTiming } from './static-frame-timing.mjs';
import { syncStaticTabHeader, getStaticRenderContext, syncStaticTradeButton } from './static-frame-tabs.mjs';
import { renderStaticCharacter, renderStaticTraits, renderStaticKnowledge, finishStaticPanels } from './static-frame-panels.mjs';
import { renderStaticEquipment } from './static-equipment-panel.mjs';
import { renderStaticCrafting } from './static-craft-panel.mjs';
import { renderStaticMaps } from './static-map-panels.mjs';
import { renderStaticSeason } from './static-season-panel.mjs';
import { renderStaticJournal } from './static-journal-panel.mjs';

export function performUpdateStaticUI(runtime) {

    prepareStaticUi(runtime);
    const timing = startStaticTiming(runtime), mark = timing.mark;
    syncStaticProgress(runtime);
    let pStats = (0, runtime.deps.getUiPlayerStats)();
    if ((0, runtime.deps.normalizeSupportLoadout)(true, pStats.__uiFallbackStats ? null : pStats)) pStats = (0, runtime.deps.getUiPlayerStats)();
    mark('stats');
    runtime.deps.uiStats.store(pStats);
    (0, runtime.deps.updateCombatUI)(pStats);
    mark('combatUI');
    syncStaticLoopControls(runtime);
    renderStaticPassiveTree(runtime);
    mark('tree');
    syncStaticTabHeader(runtime);
    const context = getStaticRenderContext(runtime);
    if (!context) return;
    context.pStats = pStats;
    renderStaticCharacter(runtime, context);
    renderStaticEquipment(runtime, context);
    renderStaticCrafting(runtime, context.itemsTabActive);
    syncStaticTradeButton(runtime);
    mark('midRender');
    (0, runtime.deps.renderVisibleManagementPanels)(context.renderingTabIds);
    mark('market');
    const mapTabActive = renderStaticMaps(runtime);
    mark('mapPanels');
    if (mapTabActive) runtime.deps.explorationAtlasUi.render();
    if (context.isTabRendering('tab-season')) renderStaticSeason(runtime);
    if (context.isTabRendering('tab-traits')) renderStaticTraits(runtime);
    mark('progressionTabs');
    renderStaticKnowledge(runtime, context);
    mark('codex+skills');
    renderStaticJournal(runtime, context.isTabRendering('tab-journal') ? runtime.deps.document.getElementById('ui-journal-list') : null);
    mark('journal');
    finishStaticPanels(runtime, context);
    mark('end');
    reportStaticTiming(runtime, timing);
}
