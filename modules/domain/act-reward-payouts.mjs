import { hasSkillGemOwned, hasSupportGemOwned } from '../common/support-gems.mjs';
import { actGrantRewardItem } from './act-reward-items.mjs';
import { actGetSupportFallback } from './act-reward-choices.mjs';

export function* actGrantRewardEntry(env, owner, zoneId, choice) {
    if (choice.kind === 'item') return yield* grantItemEntry(env, owner, zoneId, choice);
    if (choice.kind === 'skill') return yield* grantSkillEntry(env, owner, choice);
    if (choice.kind === 'support') return yield* grantSupportEntry(env, owner, choice);
    if (choice.kind === 'points') {
        owner.passivePoints += choice.value || 0;
        yield { kind: 'actLog', args: [env.deps._t('🎁 스킬트리 포인트 +{value}', { value: choice.value || 0 }), 'loot-rare'] };
        return;
    }
    if (choice.kind === 'currency') return yield* grantCurrencyEntry(env, choice);
    if (choice.kind === 'stat') yield* grantStatEntry(env, owner, zoneId, choice);
}

function* grantItemEntry(env, owner, zoneId, choice) {
    const item = yield* actGrantRewardItem(env, owner, zoneId, choice);
    if (item) yield { kind: 'actLog', args: [env.deps._t('🎁 액트 보상으로 [{name}] 획득!', { name: env.deps._t(item.name) }), choice.rarity === 'rare' ? 'loot-rare' : 'loot-magic', { item }] };
    return !!item;
}

function* grantSkillEntry(env, owner, choice) {
    if (!hasSkillGemOwned(choice.skill, owner)) {
        owner.skills.push(choice.skill);
        owner.gemData[choice.skill] = owner.gemData[choice.skill] || { level: 1, exp: 0 };
        owner.noti.skills = true;
        yield { kind: 'actLog', args: [env.deps._t('🎁 액트 보상 룬 [{skill}] 획득!', { skill: choice.skill }), 'loot-rare'] };
    } else {
        owner.passivePoints += choice.fallbackValue || 1;
        yield { kind: 'actLog', args: [env.deps._t('🎁 이미 보유한 룬 대신 스킬트리 포인트 +{value}', { value: choice.fallbackValue || 1 }), 'loot-magic'] };
    }
}

function* grantSupportEntry(env, owner, choice) {
    if (!env.deps.SUPPORT_GEM_DB[choice.gem]) throw new Error(`Unknown act reward support rune: ${choice.gem}`);
    if (!hasSupportGemOwned(choice.gem, owner)) {
        owner.supports.push(choice.gem);
        owner.supportGemData[choice.gem] = owner.supportGemData[choice.gem] || { level: 1, exp: 0 };
        // Show newly acquired support runes even when the previous list was filtered to equipped runes.
        owner.gemFoldInactiveSupport = false;
        owner.noti.skills = true;
        yield { kind: 'actLog', args: [env.deps._t('🎁 액트 보상 보조스킬룬 [{gem}] 획득!', { gem: choice.gem }), 'loot-rare'] };
    } else {
        const fallback = actGetSupportFallback(env, choice);
        if (fallback.kind === 'points') owner.passivePoints += fallback.amount;
        else yield { kind: 'actCurrency', args: [fallback.currency, fallback.amount] };
        yield { kind: 'actLog', args: [env.deps._t('🎁 중복 보조스킬룬 대신 {label}', { label: env.deps._t(fallback.label) }), 'loot-magic'] };
    }
}

function* grantCurrencyEntry(env, choice) {
    const amount = choice.fallbackValue || choice.value || 1;
    yield { kind: 'actCurrency', args: [choice.currency, amount] };
    yield { kind: 'actLog', args: [`🎁 ${env.deps._t(env.deps.ORB_DB[choice.currency].name)} +${amount}`, 'loot-magic'] };
}

function* grantStatEntry(env, owner, zoneId, choice) {
    owner.actRewardBonuses = owner.actRewardBonuses || [];
    owner.actRewardBonuses.push({ actId: zoneId, stat: choice.stat, value: choice.value });
    yield { kind: 'actLog', args: [`🎁 ${env.deps.getStatName(choice.stat)} +${choice.value}${env.deps.P_STATS[choice.stat] && env.deps.P_STATS[choice.stat].isPct ? '%' : ''}`, 'loot-rare'] };
}
