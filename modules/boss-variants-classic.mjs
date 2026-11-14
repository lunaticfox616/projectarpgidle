import { createBossVariantCatalog, variantKind, variantNormalizeKills, variantRecords } from './domain/boss-variant-catalog.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';
import { variantOpen, variantDress, variantApply, variantMaybeApply, variantRecall, variantOnKilled } from './domain/boss-variant-lifecycle.mjs';

// Keep the original catalog identity and public API until consumers use the native application owner.
const catalog = createBossVariantCatalog(BOSS_VARIANTS);
const env = { get owner() { return game; }, catalog, deps: {
    get contentProgression() { return contentProgression; },
    get getZone() { return typeof getZone === 'undefined' ? undefined : getZone; },
    get memoryDungeon() { return typeof memoryDungeon === 'undefined' ? undefined : memoryDungeon; },
    get awardCurrency() { return awardCurrency; }
} };

const bossVariants = Object.freeze({
    open(state) { return variantOpen(env, state); },
    maybeApply(enemy, zone, random) { return runRuntimeEventCommands(variantMaybeApply(env, enemy, zone, random), dispatchRuntimeEvent); },
    recall(enemy, tier, random) { return runRuntimeEventCommands(variantRecall(env, enemy, tier, random), dispatchRuntimeEvent); },
    dress(enemy) { return variantDress(catalog, enemy); },
    apply(enemy, kind) { return variantApply(catalog, enemy, kind); },
    onKilled(state, enemy) { return runRuntimeEventCommands(variantOnKilled(env, state, enemy), dispatchRuntimeEvent); },
    normalizeKills(raw) { return variantNormalizeKills(catalog, raw); },
    records(state) { return variantRecords(catalog, state); },
    kind(id) { return variantKind(catalog, id); }
});
safeExposeGlobals({ bossVariants });
