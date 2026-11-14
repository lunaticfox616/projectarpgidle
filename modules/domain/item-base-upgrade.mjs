import { itemFlowGetSelectedCraftItem } from './item-craft-selection.mjs';
import { itemFlowGetBaseUpgradeCandidates } from './item-base-candidates.mjs';
import { itemFlowGetBaseUpgradeCost } from './item-base-chain.mjs';
import { itemFlowRollUpgradedBaseStats } from './item-base-rolls.mjs';

export function itemFlowBuildGoldenRuleSpendPrompt(owner, message) {
    let owned = Math.max(0, Math.floor((owner.currencies && owner.currencies.goldenRule) || 0));
    return `${message}\n\n현재 보유: 황금률 ${owned}개`;
}

export function* itemFlowUpgradeSelectedItemBase(env, owner) {
    let item = itemFlowGetSelectedCraftItem(env, owner);
    if (!item) return (yield { kind: 'itemLog', args: [env.deps._t('먼저 제작 대상 장비를 선택하세요.'), 'attack-monster'] });
    let currentBase = env.deps.BASE_ITEM_DB.find(base => base && base.id === item.baseId) || env.deps.BASE_ITEM_DB.find(base => base && base.name === item.baseName && base.slot === item.slot);
    if (!currentBase) return (yield { kind: 'itemLog', args: [env.deps._t('현재 베이스 정보를 찾을 수 없습니다.'), 'attack-monster'] });
    const refusal = itemFlowGetBaseUpgradeRefusal(item, currentBase);
    if (refusal) return (yield { kind: 'itemLog', args: [env.deps._t(refusal), 'attack-monster'] });
    let candidates = itemFlowGetBaseUpgradeCandidates(env, currentBase);
    let nextBase = candidates[0];
    if (!nextBase) return (yield { kind: 'itemLog', args: [env.deps._t('해당 계열의 다음 베이스가 없습니다.'), 'attack-monster'] });
    let cost = itemFlowGetBaseUpgradeCost(env, nextBase);
    owner.pendingBaseUpgrade = { itemId: item.id, nextBaseId: nextBase.id };
    yield { kind: 'itemShowBaseUpgrade', args: [currentBase, nextBase, cost] };
}

export function* itemFlowCloseBaseUpgradeOverlay(owner) {
    owner.pendingBaseUpgrade = null;
    yield { kind: 'itemCloseBaseUpgrade', args: [] };
}

export function itemFlowGetBaseUpgradeRefusal(item, currentBase = null) {
    if (currentBase && currentBase.realmBase) return '계 전용 베이스 장비는 베이스 업그레이드로 변경할 수 없습니다.';
    if (item.hallReplica) return '전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.';
    return item.corrupted ? '타락한 아이템은 더 이상 제작할 수 없습니다.' : '';
}

export function itemFlowGetBaseUpgradeShortfall(env, owner, cost) {
    if ((owner.currencies.formlessDew || 0) < cost.formlessDew) return env.deps._t('형체 없는 이슬이 부족합니다. (필요: {formlessDew})', { formlessDew: cost.formlessDew });
    return (owner.currencies.goldenRule || 0) < cost.goldenRule ? env.deps._t('황금률이 부족합니다. (필요: {goldenRule})', { goldenRule: cost.goldenRule }) : '';
}

export function* itemFlowConfirmSelectedItemBaseUpgrade(env, owner) {
    let pending = owner.pendingBaseUpgrade;
    if (!pending) return;
    if (owner.woodsmanBuildLock) return (yield { kind: 'itemLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.'), 'attack-monster'] });
    const item = findPendingUpgradeItem(owner, pending.itemId);
    if (!item) { (yield* itemFlowCloseBaseUpgradeOverlay(owner)); return (yield { kind: 'itemLog', args: [env.deps._t('대상 장비를 찾을 수 없습니다.'), 'attack-monster'] }); }
    const refusal = itemFlowGetBaseUpgradeRefusal(item);
    if (refusal) { (yield* itemFlowCloseBaseUpgradeOverlay(owner)); return (yield { kind: 'itemLog', args: [env.deps._t(refusal), 'attack-monster'] }); }
    let currentBase = env.deps.BASE_ITEM_DB.find(base => base && base.id === item.baseId) || null;
    let nextBase = env.deps.BASE_ITEM_DB.find(base => base && base.id === pending.nextBaseId);
    if (!nextBase) return (yield* itemFlowCloseBaseUpgradeOverlay(owner));
    let cost = itemFlowGetBaseUpgradeCost(env, nextBase);
    const shortfall = itemFlowGetBaseUpgradeShortfall(env, owner, cost);
    if (shortfall) return (yield { kind: 'itemLog', args: [shortfall, 'attack-monster'] });
    applyBaseUpgrade(env, owner, item, nextBase, cost);
    (yield { kind: 'itemLog', args: [baseUpgradeLog(env, currentBase, nextBase, cost), 'loot-magic'] });
    (yield* itemFlowCloseBaseUpgradeOverlay(owner));
    (yield { kind: 'itemRefresh', args: [] });
}

function applyBaseUpgrade(env, owner, item, nextBase, cost) {
    owner.currencies.formlessDew -= cost.formlessDew;
    owner.currencies.goldenRule = Math.max(0, (owner.currencies.goldenRule || 0) - cost.goldenRule);
    item.baseId = nextBase.id;
    item.baseName = nextBase.name;
    env.deps.updateItemName(item); // 마법의, 희귀한은 그대로 두고 베이스 이름만 바뀐다(고유는 제 이름).
    item.itemTier = Math.max(item.itemTier || 1, nextBase.reqTier || 1);
    itemFlowRollUpgradedBaseStats(env, item, nextBase);
}

function findPendingUpgradeItem(owner, itemId) {
    const item = (owner.inventory || []).find(v => v && v.id === itemId);
    if (item) return item;
    const equipped = Object.entries(owner.equipment || {}).find(([, value]) => value && value.id === itemId);
    return equipped ? equipped[1] : undefined;
}

function baseUpgradeLog(env, currentBase, nextBase, cost) {
    return env.deps._t('🛠️ 베이스 업그레이드: {from} → {to} (형체 없는 이슬 {dew}{rule})', {
        from: env.deps._t((currentBase && currentBase.name) || '기존'), to: env.deps._t(nextBase.name),
        dew: cost.formlessDew, rule: cost.goldenRule ? ` + ${env.deps._t('황금률')} ${cost.goldenRule}` : ''
    });
}
