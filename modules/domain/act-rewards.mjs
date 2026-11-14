import { actGetRewardConfig, actIsRewardChoiceAvailable, actGetAvailableRewardZoneIds, actGetRewardChoices } from './act-reward-choices.mjs';
import { actCreateClassStarterWeapon, actBuildRewardPreviewItem } from './act-reward-items.mjs';
import { actGrantRewardEntry } from './act-reward-payouts.mjs';
import { actMarkRewardReady, actClaimRewardChoice } from './act-reward-claims.mjs';

export function createActRewards(deps) {
    const env = { deps };
    return Object.freeze({
        getActRewardConfig: (...args) => actGetRewardConfig(env, ...args),
        isActRewardChoiceAvailable: (...args) => actIsRewardChoiceAvailable(env, ...args),
        getAvailableActRewardZoneIds: (...args) => actGetAvailableRewardZoneIds(env, ...args),
        getActRewardChoices: (...args) => actGetRewardChoices(env, ...args),
        createClassStarterWeapon: (...args) => actCreateClassStarterWeapon(env, ...args),
        buildActRewardPreviewItem: (...args) => actBuildRewardPreviewItem(env, ...args),
        grantActRewardEntry: (...args) => actGrantRewardEntry(env, ...args),
        markActRewardReady: (...args) => actMarkRewardReady(env, ...args),
        claimActRewardChoice: (...args) => actClaimRewardChoice(env, ...args)
    });
}
