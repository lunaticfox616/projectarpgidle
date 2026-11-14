import { createStumpNursery } from './domain/stump-nursery.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';

const rules = createStumpNursery({
    get contentProgression() { return contentProgression; },
    get stumpBox() { return stumpBox; },
    get STUMP_BOX_RIPENING() { return STUMP_BOX_RIPENING; },
    get getZone() { return getZone; },
    get STUMP_NURSERY() { return STUMP_NURSERY; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; }
});
const stumpNursery = Object.freeze({ ...rules,
    onKilled: (...args) => runRuntimeEventCommands(rules.onKilled(...args), dispatchRuntimeEvent),
    clearGift: (...args) => runRuntimeEventCommands(rules.clearGift(...args), dispatchRuntimeEvent),
    ancientFromBoss: (...args) => runRuntimeEventCommands(rules.ancientFromBoss(...args), dispatchRuntimeEvent)
});
safeExposeGlobals({ stumpNursery });
