import { oceanGetOceanFishingStrategyDef, oceanGetOceanFishCollectionProgress, oceanGetOceanFishCollectionBonus, oceanSetOceanFishingStrategy, oceanClaimOceanFishCollectionMilestone } from './ocean-progress-collection.mjs';
import { oceanAdvanceOceanDiveFromKill } from './ocean-progress-fishing.mjs';
import { oceanGetOceanPermanentUpgradeCost, oceanCanPayOceanUpgradeCost, oceanUpgradeOceanPermanent, oceanInstallOceanReefFragment } from './ocean-progress-upgrades.mjs';
import { oceanEnterOceanDive, oceanGetOceanShallowLiftM } from './ocean-progress-entry.mjs';
import { oceanForceSurfaceOcean, oceanRecordOceanSurface, oceanForgetOceanAutoDive, oceanSetOceanAutoRedive } from './ocean-progress-surface.mjs';
import { oceanTickOceanOxygen } from './ocean-progress-oxygen.mjs';
import { oceanTickOceanDepth, oceanApplyOceanKill, oceanGetOceanKillAirSec } from './ocean-progress-depth.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createOceanProgress(deps) {
    const env = { deps };

    return Object.freeze({
        getOceanFishingStrategyDef: (...args) => oceanGetOceanFishingStrategyDef(env, ...args),
        getOceanFishCollectionProgress: (...args) => oceanGetOceanFishCollectionProgress(env, ...args),
        getOceanFishCollectionBonus: (...args) => oceanGetOceanFishCollectionBonus(env, ...args),
        setOceanFishingStrategy: (...args) => oceanSetOceanFishingStrategy(env, ...args),
        claimOceanFishCollectionMilestone: (...args) => oceanClaimOceanFishCollectionMilestone(env, ...args),
        advanceOceanDiveFromKill: (...args) => oceanAdvanceOceanDiveFromKill(env, ...args),
        getOceanPermanentUpgradeCost: (...args) => oceanGetOceanPermanentUpgradeCost(env, ...args),
        canPayOceanUpgradeCost: oceanCanPayOceanUpgradeCost,
        upgradeOceanPermanent: (...args) => oceanUpgradeOceanPermanent(env, ...args),
        installOceanReefFragment: (...args) => oceanInstallOceanReefFragment(env, ...args),
        enterOceanDive: (...args) => oceanEnterOceanDive(env, ...args),
        getOceanShallowLiftM: (...args) => oceanGetOceanShallowLiftM(env, ...args),
        forceSurfaceOcean: (...args) => oceanForceSurfaceOcean(env, ...args),
        recordOceanSurface: (...args) => oceanRecordOceanSurface(env, ...args),
        forgetOceanAutoDive: oceanForgetOceanAutoDive,
        setOceanAutoRedive: (...args) => oceanSetOceanAutoRedive(env, ...args),
        tickOceanOxygen: (...args) => oceanTickOceanOxygen(env, ...args),
        tickOceanDepth: (...args) => oceanTickOceanDepth(env, ...args),
        applyOceanKill: (...args) => oceanApplyOceanKill(env, ...args),
        getOceanKillAirSec: (...args) => oceanGetOceanKillAirSec(env, ...args)
    });
}
