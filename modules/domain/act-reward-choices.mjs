import { hasSkillGemOwned, hasSupportGemOwned } from '../common/support-gems.mjs';
import { actIsFirstStarterReward } from './act-reward-items.mjs';

export function actGetRewardConfig(env, owner, zoneId) {
    const config = env.deps.ACT_REWARD_DB[zoneId];
    if (!config) return null;
    if (config.firstLoop && owner.season === 1) return config.firstLoop;
    if (config.lockedChoices && !config.choices.some(choice => actIsRewardChoiceAvailable(env, owner, choice))) {
        return { ...config, body: config.lockedBody, choices: config.lockedChoices };
    }
    return config;
}

export function actGetSupportFallback(env, choice) {
    const amount = Math.max(1, Math.floor(Number(choice && choice.fallbackValue) || 1));
    if (choice && choice.fallbackKind === 'points') {
        return { kind: 'points', amount, currency: null, label: env.deps._t('스킬트리 포인트 +{amount}', { amount }) };
    }
    const currency = (choice && choice.currency) || 'magicBud';
    const currencyDef = env.deps.ORB_DB[currency];
    if (!currencyDef) throw new Error(`Unknown support reward fallback currency: ${currency}`);
    return { kind: 'currency', amount, currency, label: env.deps._t('{name} {amount}개', { name: currencyDef.name, amount }) };
}

export function actIsRewardChoiceAvailable(env, owner, choice) {
    if (choice.kind === 'points' && owner.season === 1) return env.deps.contentProgression.canOpen('tab-char', owner);
    if (choice.kind === 'support' || choice.stat === 'suppCap') return env.deps.contentProgression.isUnlocked('support', owner);
    if (choice.kind === 'currency') return env.deps.contentProgression.canDropCurrency(choice.currency, owner);
    return true;
}

export function actGetAvailableRewardZoneIds(env, owner) {
    return (owner.claimableActRewards || []).filter(id =>
        actGetRewardConfig(env, owner, id)?.choices.some(choice => actIsRewardChoiceAvailable(env, owner, choice)));
}

export function actGetRewardChoices(env, owner, zoneId) {
    const config = actGetRewardConfig(env, owner, zoneId);
    if (!config) return [];
    return config.choices.map(choice => enrichChoice(env, owner, zoneId, choice));
}

function enrichChoice(env, owner, zoneId, choice) {
    const enriched = { ...choice };
    if (choice.kind === 'skill' && hasSkillGemOwned(choice.skill, owner)) {
        enriched.desc = env.deps._t('{desc} 이미 보유 중이면 스킬트리 포인트 +{fallbackValue}로 바뀝니다.', { desc: env.deps._t(choice.desc), fallbackValue: choice.fallbackValue || 1 });
    }
    if (choice.kind === 'support' && hasSupportGemOwned(choice.gem, owner)) {
        const fallback = actGetSupportFallback(env, choice);
        enriched.desc = env.deps._t('{desc} 이미 보유 중이면 {label}로 바뀝니다.', { desc: env.deps._t(choice.desc), label: fallback.label });
    }
    if (choice.kind === 'item' && choice.slot === '무기') Object.assign(enriched, describeRewardWeapon(env, owner));
    if (choice.kind === 'item' && actIsFirstStarterReward(owner, zoneId)) {
        enriched.label = enriched.label.replace('미확인 ', '');
        enriched.fixedStarter = true;
    }
    // Labels can change when another rune is acquired while the reward window is open.
    enriched.claimKey = JSON.stringify([choice.kind, choice.slot, choice.rarity, choice.skill, choice.gem,
        choice.stat, choice.value, choice.currency, choice.fallbackKind, choice.fallbackValue, enriched.weaponCategory]);
    return enriched;
}

function describeRewardWeapon(env, owner) {
    const category = env.deps.HANA_WEAPON_COMBOS.classWeapons[owner.selectedClassId];
    return env.deps.WEAPON_CATEGORIES[category] ? { weaponCategory: category, label: env.deps._t('미확인 {name}', { name: env.deps.WEAPON_CATEGORIES[category].name }) } : {};
}
