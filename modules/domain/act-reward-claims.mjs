import { actGetAvailableRewardZoneIds, actGetRewardChoices, actIsRewardChoiceAvailable } from './act-reward-choices.mjs';
import { actGrantRewardEntry } from './act-reward-payouts.mjs';

export function* actMarkRewardReady(env, owner, zoneId) {
    if (zoneId < 0 || zoneId > 9) return;
    owner.claimableActRewards = owner.claimableActRewards || [];
    owner.claimedActRewards = owner.claimedActRewards || [];
    if (owner.claimedActRewards.includes(zoneId) || owner.claimableActRewards.includes(zoneId)) return;
    owner.claimableActRewards.push(zoneId);
    // A locked reward retains its claim without presenting unusable choices.
    if (!actGetAvailableRewardZoneIds(env, owner).includes(zoneId)) return;
    owner.noti.map = true;
    yield { kind: 'actLog', args: [env.deps._t('🎁 [{name}] 클리어 보상을 받을 수 있습니다.', { name: env.deps.MAP_ZONES[zoneId].name }), 'loot-rare'] };
    yield { kind: 'actPromptReward', args: [zoneId] };
}

export function* actClaimRewardChoice(env, owner, zoneId, choiceIndex, displayedChoice) {
    if (owner.woodsmanBuildLock) return yield { kind: 'actLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] };
    if (!owner.claimableActRewards.includes(zoneId)) return;
    const choices = actGetRewardChoices(env, owner, zoneId);
    const choice = choices[choiceIndex];
    if (!choice || !actIsRewardChoiceAvailable(env, owner, choice)) return;
    if (displayedChoice !== undefined && displayedChoice !== encodeURIComponent(choice.claimKey)) return yield { kind: 'actOpenReward', args: [zoneId] };
    if ((yield* actGrantRewardEntry(env, owner, zoneId, choice)) === false) {
        return yield { kind: 'actLog', args: [env.deps._t('액트 보상을 지급하지 못했습니다. 보상은 유지됩니다.'), 'system'] };
    }
    yield { kind: 'actAutoInvest', args: [] };
    owner.claimableActRewards = owner.claimableActRewards.filter(id => id !== zoneId);
    if (!owner.claimedActRewards.includes(zoneId)) owner.claimedActRewards.push(zoneId);
    yield { kind: 'actCloseReward', args: [] };
    yield { kind: 'actCheckUnlocks', args: [] };
    yield { kind: 'actNormalizeSupports', args: [true] };
    yield { kind: 'actRefresh', args: [] };
    yield { kind: 'actSave', args: [180] };
}
