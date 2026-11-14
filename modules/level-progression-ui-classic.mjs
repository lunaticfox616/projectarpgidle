import { createLevelProgressionView } from './ui/level-progression-view.mjs';
const levelProgressionUi = createLevelProgressionView({
    get combatEquipmentStats() { return combatEquipmentStats; },
    get game() { return window.GameModules.state.game; },
    get getEquipCandidateSlots() { return getEquipCandidateSlots; },
    get getDualSlotDisplayLabel() { return getDualSlotDisplayLabel; },
    get levelProgression() { return levelProgression; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get getStatName() { return getStatName; }
});
safeExposeGlobals({ levelProgressionUi });
