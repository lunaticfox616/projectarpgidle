/** 지도 기운과 보물 무리의 규칙(data/loot-omens.js, docs/endgame-loot-20261009.md 3절). 상태를 바꾸지 않고 계산만 한다: 지도석에 붙을
 * 기운을 고르고(js/atlas.js stamp), 지도 런의 효과(startRun), 구역 필드(buildZone), 적 배율(js/atlas-maps.js applyEnemyMods), 장비 부위와
 * 드랍 변형(js/item-rolls.js getEquipmentDropSlot, js/loot.js), 처치마다 떨어질 것(js/atlas-finds.js)을 돌려준다. 난수는 인자로 받는다.
 */
import { omenRoll, omenFlowerOmens, omenRollFlowerOmen, omenOf, omenInZone, omenRunBonus, omenZoneFields, omenEnemyMods, omenJewelOdds, omenSlotWeights, omenVariantMul, omenKillDrops, omenStrayDrops, omenTreasureDrops, omenGoldenJackpot, omenIsTreasurePack, omenIsGoldenTreasure, omenDescribe, omenValidId, omenStrengthOf, omenIsItemKind } from './loot-omens-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createLootOmens(deps) {
    const env = { deps };
    env.BY_ID = new Map(env.deps.LOOT_OMENS.list.map(omen => [omen.id, omen]));
    env.ITEM_KINDS = Object.freeze({ '@jewel': state => env.deps.contentProgression.isUnlocked('jewel', state), '@seed': state => !!(state.stumpBox && state.stumpBox.acquired) });
    return Object.freeze({
        roll: (...args) => omenRoll(env, ...args),
        flowerOmens: (...args) => omenFlowerOmens(env, ...args),
        rollFlowerOmen: (...args) => omenRollFlowerOmen(env, ...args),
        of: (...args) => omenOf(env, ...args),
        inZone: (...args) => omenInZone(env, ...args),
        runBonus: (...args) => omenRunBonus(env, ...args),
        zoneFields: (...args) => omenZoneFields(env, ...args),
        enemyMods: (...args) => omenEnemyMods(env, ...args),
        jewelOdds: (...args) => omenJewelOdds(env, ...args),
        slotWeights: (...args) => omenSlotWeights(env, ...args),
        variantMul: (...args) => omenVariantMul(env, ...args),
        killDrops: (...args) => omenKillDrops(env, ...args),
        strayDrops: (...args) => omenStrayDrops(env, ...args),
        treasureDrops: (...args) => omenTreasureDrops(env, ...args),
        goldenJackpot: (...args) => omenGoldenJackpot(env, ...args),
        isTreasurePack: (...args) => omenIsTreasurePack(env, ...args),
        isGoldenTreasure: (...args) => omenIsGoldenTreasure(env, ...args),
        describe: (...args) => omenDescribe(env, ...args),
        validId: (...args) => omenValidId(env, ...args),
        strengthOf: (...args) => omenStrengthOf(env, ...args),
        isItemKind: (...args) => omenIsItemKind(env, ...args)
    });
}
