import { createColonyWardPanel } from './ui/colony-ward-panel.mjs';
const colonyWardPanel = createColonyWardPanel({
    get document() { return document; },
    get colonyWardsUi() { return colonyWardsUi; }
});
safeExposeGlobals({
    renderColonyWardView: colonyWardPanel.renderColonyWardView
});
