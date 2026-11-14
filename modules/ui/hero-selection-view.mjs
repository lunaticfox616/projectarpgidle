import { syncHeroSelectionState, renderHeroSelectionControls, onHeroAppearanceModeChanged, onHeroSelectionChanged } from './hero-selection-controls.mjs';
import { applyHeroSelection, applyHeroAppearanceMode, persistHeroSelectionChange } from './hero-selection-actions.mjs';
import { isLoopHeroSelectOpen, openLoopHeroSelection, ensureInitialHeroSelection, resetHeroSelectionForSave, closeHeroSelection } from './hero-selection-session.mjs';
import { pressLoopHeroChoice, chooseLoopHero, openLoopBasicSkillPick, chooseLoopBasicSkill } from './hero-selection-choice.mjs';
import { showHeroChoiceTooltip } from './hero-selection-markup.mjs';
import { installHeroSelectionEvents } from './hero-selection-events.mjs';
import { releaseViewEvents } from './view-events.mjs';

/** The dialog owns its pending callback and chosen element; neither lives in global/application state. */
export function createHeroSelectionView(deps) {
    const runtime = { deps, owner: null, onSelect: null, basicClass: null, elements: [], active: true, handlers: {}, listeners: [] };
    const methods = { syncHeroSelectionState, renderHeroSelectionControls, onHeroAppearanceModeChanged, onHeroSelectionChanged,
        applyHeroSelection, applyHeroAppearanceMode, persistHeroSelectionChange, isLoopHeroSelectOpen, openLoopHeroSelection,
        ensureInitialHeroSelection, resetHeroSelectionForSave, pressLoopHeroChoice, chooseLoopHero, openLoopBasicSkillPick, chooseLoopBasicSkill, showHeroChoiceTooltip };
    for (const [name, handler] of Object.entries(methods)) {
        runtime.handlers[name] = (...args) => { if (runtime.active) return handler(runtime, ...args); };
    }
    installHeroSelectionEvents(runtime);
    return Object.freeze({ ...runtime.handlers,
        getHeroSelectionDef: id => deps.rules.definition(id),
        getHeroAppearanceId: () => deps.rules.appearance(deps.game),
        dispose() {
            if (!runtime.active) return;
            closeHeroSelection(runtime);
            releaseViewEvents(runtime);
        }
    });
}
