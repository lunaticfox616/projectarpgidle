import { createStumpTalismanView } from './ui/stump-talisman-view.mjs';
const stumpTalismanUi = createStumpTalismanView({
    get escapeHTML() { return escapeHTML; },
    get TALISMAN_RARITY_TONES() { return TALISMAN_RARITY_TONES; },
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; },
    get ORB_DB() { return ORB_DB; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get talismans() { return talismans; },
    get statToneText() { return statToneText; },
    get stumpBox() { return stumpBox; },
    get talismanEffects() { return talismanEffects; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; },
    get TALISMAN_UNSEAL_RULES() { return TALISMAN_UNSEAL_RULES; },
    get contentProgression() { return contentProgression; },
    get TALISMAN_SHARD_EXCHANGE() { return TALISMAN_SHARD_EXCHANGE; },
    get showGameToast() { return showGameToast; },
    get addLog() { return addLog; },
    get pickParticle() { return pickParticle; },
    get requestGameConfirmation() { return requestGameConfirmation; }
});
safeExposeGlobals({ stumpTalismanUi });
