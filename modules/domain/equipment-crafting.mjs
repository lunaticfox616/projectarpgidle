// One crafting rule owner: provenance, slot limits, omens, outcome selection and imprints.
// Callers supply item/state; ordinary payment, persistence and UI remain outside this service.
import { craftBasicRule, craftBasicFits, craftGetSource, craftGetLabel, craftFilterSporeMods, craftResolveAction, craftGetBlockReason, craftGetSporeBlockReason, craftGetFossilBlockReason, craftGetRiftHarvestBlockReason, craftGetFossilUseReason, craftAffixKind, craftStoredAffixKind, craftKeptOnReroll, craftAffixCounts, craftAffixRoom, craftFitsRoom, craftPickReplacement, craftAffixHeader, craftBuildLockReason } from './equipment-craft-rules.mjs';
import { craftApplyBasic, craftCraftBasic, craftPendingChoice, craftChoiceWaitReason, craftFossilCraftReason, craftPickChoice, craftNormalizeImprint, craftEngraveReason, craftEngrave, craftRestoreReason, craftRestoreImprint } from './equipment-craft-results.mjs';
import { craftSporePool, craftPickSporeMod, craftRollSporeLine, craftOmenSpec, craftArmOmen, craftOmenFits, craftOmenReason, craftArmedSideReason, craftOnOmenSide, craftFilterOmenMods, craftWeighOmenPool, craftOmenFor, craftSpendOmen, craftPickAddMod, craftPickPruneLine } from './equipment-craft-omens.mjs';

/** Build shared tables once per service, before any item mutation or random roll. */
function createCraftEnvironment(deps) {
    const env = { deps };
    env.labels = Object.freeze({ spore: '수확', fossil: '화석', transplant: '이식' });
    env.sporeActions = new Set(['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos']);
    env.sporeRerolls = new Set(['transmute', 'alteration', 'alchemy', 'chaos']);
    env.sporeStatIds = Object.freeze(Object.fromEntries(Object.entries(env.deps.AFFIX_TAG_LISTS.spore)
    .map(([mode, rule]) => [mode, new Set(env.deps.resolveAffixTagList(rule, env.deps.MOD_DB))])));
    env.KEEPS_KIND = '고유 장비, 융합 유물, 전당 소장품에는 쓸 수 없습니다.';
    env.basicRules = Object.freeze(Object.fromEntries([
    ['transmute','normal','magic','reroll'],['alteration','magic','magic','reroll'],
    ['alchemy','normal','rare','reroll'],['chaos','rare','rare','reroll'],
    ['regal','magic','rare','add'],['exalted','rare','rare','add']
].map(([action,source,rarity,kind])=>[action,Object.freeze({source,rarity,kind})])));
    env.basicActions = Object.freeze(Object.keys(env.basicRules));
    env.rerollActions = Object.freeze(env.basicActions.filter(action=>env.basicRules[action].kind==='reroll'));
    env.CRAFT_FIELDS = Object.freeze(['rarity', 'name', 'stats', 'chaosInfusion']);
    env.IMPRINT_KEY = 'memoryImprint';
    return env;
}

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createEquipmentCrafting(deps) {
    const env = createCraftEnvironment(deps);
    return Object.freeze({
        basicActions: env.basicActions,
        rerollActions: env.rerollActions,
        basicRule: (...args) => craftBasicRule(env, ...args),
        basicFits: (...args) => craftBasicFits(env, ...args),
        applyBasic: (...args) => craftApplyBasic(env, ...args),
        sporePool: (...args) => craftSporePool(env, ...args),
        pickSporeMod: (...args) => craftPickSporeMod(env, ...args),
        rollSporeLine: (...args) => craftRollSporeLine(env, ...args),
        getSource: (...args) => craftGetSource(env, ...args),
        getLabel: (...args) => craftGetLabel(env, ...args),
        filterSporeMods: (...args) => craftFilterSporeMods(env, ...args),
        resolveAction: craftResolveAction,
        getBlockReason: (...args) => craftGetBlockReason(env, ...args),
        getSporeBlockReason: (...args) => craftGetSporeBlockReason(env, ...args),
        getFossilBlockReason: (...args) => craftGetFossilBlockReason(env, ...args),
        getRiftHarvestBlockReason: (...args) => craftGetRiftHarvestBlockReason(env, ...args),
        getFossilUseReason: (...args) => craftGetFossilUseReason(env, ...args),
        affixKind: craftAffixKind,
        storedAffixKind: (...args) => craftStoredAffixKind(env, ...args),
        keptOnReroll: craftKeptOnReroll,
        affixCounts: (...args) => craftAffixCounts(env, ...args),
        affixRoom: (...args) => craftAffixRoom(env, ...args),
        fitsRoom: craftFitsRoom,
        pickReplacement: (...args) => craftPickReplacement(env, ...args),
        affixHeader: (...args) => craftAffixHeader(env, ...args),
        omenSpec: (...args) => craftOmenSpec(env, ...args),
        armOmen: (...args) => craftArmOmen(env, ...args),
        omenFits: (...args) => craftOmenFits(env, ...args),
        omenReason: (...args) => craftOmenReason(env, ...args),
        armedSideReason: (...args) => craftArmedSideReason(env, ...args),
        onOmenSide: (...args) => craftOnOmenSide(env, ...args),
        filterOmenMods: craftFilterOmenMods,
        weighOmenPool: (...args) => craftWeighOmenPool(env, ...args),
        omenFor: (...args) => craftOmenFor(env, ...args),
        spendOmen: (...args) => craftSpendOmen(env, ...args),
        pickAddMod: (...args) => craftPickAddMod(env, ...args),
        pickPruneLine: (...args) => craftPickPruneLine(env, ...args),
        craftBasic: (...args) => craftCraftBasic(env, ...args),
        pendingChoice: (...args) => craftPendingChoice(env, ...args),
        choiceWaitReason: (...args) => craftChoiceWaitReason(env, ...args),
        fossilCraftReason: (...args) => craftFossilCraftReason(env, ...args),
        pickChoice: (...args) => craftPickChoice(env, ...args),
        normalizeImprint: craftNormalizeImprint,
        engraveReason: (...args) => craftEngraveReason(env, ...args),
        engrave: (...args) => craftEngrave(env, ...args),
        restoreReason: (...args) => craftRestoreReason(env, ...args),
        restoreImprint: (...args) => craftRestoreImprint(env, ...args),
        buildLockReason: craftBuildLockReason
    });
}
