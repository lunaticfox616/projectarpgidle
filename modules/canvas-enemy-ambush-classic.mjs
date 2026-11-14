import { createEnemyAmbushView } from './rendering/enemy-ambush.mjs';

const native = createEnemyAmbushView({
    get ELITE_AMBUSH() { return ELITE_AMBUSH; },
    get stageAssetRetry() { return stageAssetRetry; },
    get enemyAmbush() { return enemyAmbush; },
    get battleFx() { return battleFx; },
    get clampNumber() { return clampNumber; },
    get stageActors() { return stageActors; }
});
const enemyAmbushView = Object.freeze({
    alphaOf: native.alphaOf,
    draw: native.draw
});
safeExposeGlobals({ enemyAmbushView });
