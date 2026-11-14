import { createAtlasEndgame } from './domain/atlas-endgame.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createAtlasEndgame({
    get ATLAS() { return ATLAS; },
    get contentProgression() { return contentProgression; },
    get _t() { return _t; },
    get atlas() { return atlas; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get ACT_BOSS_ASSET_KEYS() { return ACT_BOSS_ASSET_KEYS; },
    get CRAFT_OMENS() { return CRAFT_OMENS; },
    get ATLAS_ENDGAME() { return ATLAS_ENDGAME; },
    get ITEM_INFLUENCES() { return ITEM_INFLUENCES; }
});
const effects = {
    grantApexScar(state) {
        if (typeof stumpBox === 'object') stumpBox.rollScarDrop(state);
    },
    grantApexAncient(state) {
        if (typeof stumpNursery === 'object') stumpNursery.ancientFromBoss(state);
    }
};
const atlasEndgame = Object.freeze({
    ...rules,
    onComplete: (...args) => consumeDomainCommands(rules.onComplete(...args), effects)
});
safeExposeGlobals({ atlasEndgame });
