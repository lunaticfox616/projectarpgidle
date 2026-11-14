import { createCharacterStatsView } from './ui/character-stats-view.mjs';
const characterStatsView = createCharacterStatsView({
    get calculatePlayerEhpProfile() { return typeof calculatePlayerEhpProfile === 'function' ? calculatePlayerEhpProfile : undefined; },
    get getAilmentDisplayLabel() { return getAilmentDisplayLabel; },
    get escapeHTML() { return escapeHTML; },
    get setTextById() { return setTextById; },
    get formatSettingNumber() { return formatSettingNumber; },
    get getSummonEquipCapFromStats() { return getSummonEquipCapFromStats; },
    get getSummonCapMaximum() { return typeof getSummonCapMaximum === 'undefined' ? undefined : getSummonCapMaximum; },
    get document() { return document; },
    get _t() { return _t; },
    get formatCappedResistanceValue() { return formatCappedResistanceValue; },
    get game() { return window.GameModules.state.game; },
    get formatValue() { return formatValue; },
    get HERO_SELECTION_DEFS() { return HERO_SELECTION_DEFS; },
    get getAscendKeystoneName() { return getAscendKeystoneName; }
});
safeExposeGlobals({
    renderCharacterStats: characterStatsView.renderCharacterStats,
    renderCharacterEhpSummary: characterStatsView.renderCharacterEhpSummary,
    renderCharacterPassiveSpecialStats: characterStatsView.renderCharacterPassiveSpecialStats
});
