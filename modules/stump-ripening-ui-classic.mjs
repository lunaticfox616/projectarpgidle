import { createStumpRipeningView } from './ui/stump-ripening-view.mjs';
const stumpRipeningUi = createStumpRipeningView({
    get escapeHTML() { return escapeHTML; },
    get stumpBox() { return stumpBox; },
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; },
    get STUMP_BOX_RIPENING() { return STUMP_BOX_RIPENING; },
    get STUMP_BOX_ANCIENT() { return STUMP_BOX_ANCIENT; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get STUMP_BOX_SCAR() { return STUMP_BOX_SCAR; },
    get withObjectParticle() { return withObjectParticle; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get stumpCube() { return stumpCube; },
    get showGameToast() { return showGameToast; },
    get STUMP_CUBE_MERGE() { return STUMP_CUBE_MERGE; },
    get contentProgression() { return contentProgression; },
    get STUMP_BOX_TALISMAN_CODEX() { return STUMP_BOX_TALISMAN_CODEX; },
    get TALISMAN_UNIQUE_DB() { return TALISMAN_UNIQUE_DB; },
    get TALISMAN_WILD_UNIQUE_DB() { return TALISMAN_WILD_UNIQUE_DB; },
    get addLog() { return addLog; }
});
safeExposeGlobals({ stumpRipeningUi });
