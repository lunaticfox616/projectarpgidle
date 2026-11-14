import { createUnlockPlan } from './domain/unlock-plan.mjs';

const rules = createUnlockPlan({
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get contentProgression() { return contentProgression; },
    get CONTENT_UNLOCK_POINT_AWARDS() { return CONTENT_UNLOCK_POINT_AWARDS; }
});
window.GameModules.unlockPlan = Object.freeze({ trace: rules.trace, read: (id, owner = game) => rules.read(id, owner) });
