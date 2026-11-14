import { voidRuleRollFairyRingOnVoid } from './void-passive-changes.mjs';
import { voidRuleGetVoidPassiveCraft } from './void-passive-state.mjs';
import { voidRuleRollMagicBudOnVoid, voidRuleRerollTranscendentVoidPassive } from './void-passive-rolls.mjs';
import { voidRuleSyncPaleBlueDotPassivePoints } from './void-passive-connections.mjs';

/** 요정의 고리는 잃을 것이 있는 공허 패시브(옵션 또는 초월)에만 쓴다 — 빈 소켓에 쓰면 실패해도 잃는 게 없는 공짜 도박이 되고,
 * 검토 4차에서 아무 변화 없이 재화만 사라진 것처럼 보였다. */
export function* voidRuleRollFairyRingOnCraftedVoid(env, owner, entry, nodeId) {
    if (!entry.transcendent && !(entry.stats || []).length) {
        return { text: env.deps._t('요정의 고리는 옵션이 있는 공허 패시브에만 쓸 수 있습니다. 마법의 새싹으로 먼저 옵션을 굴리세요.'), tone: 'attack-monster' };
    }
    if (entry.fairyLocked) return { text: env.deps._t('이 소켓에는 이번 루프에 요정의 고리를 다시 쓸 수 없습니다.'), tone: 'attack-monster' };
    owner.currencies.fairyRing--;
    yield* voidRuleRollFairyRingOnVoid(env, owner, entry, nodeId);
    if (!entry.transcendent) entry.fairyLocked = true;   // 실패: 이번 루프 동안 이 소켓은 잠긴다. 루프가 끝나면 game.voidPassives와 함께 풀린다.
    return entry.transcendent
        ? { text: env.deps._t('🌌 공허 패시브 초월: {replace}', { replace: (yield { kind: 'voidTranscendentLabel', args: [entry.transcendent] }) }), tone: 'loot-unique' }
        : { text: env.deps._t('💥 요정의 고리: 초월에 실패해 공허 패시브의 옵션이 지워졌습니다.'), tone: 'attack-monster' };
}

function currencyUseReason(env, owner, node, currencyKey) {
    if (!node || node.kind !== 'void') return env.deps._t('공허 패시브에만 사용할 수 있습니다.');
    if (!(owner.passives || []).includes(node.id)) return env.deps._t('먼저 공허 패시브를 활성화해야 합니다.');
    if (!['magicBud', 'fairyRing', 'goldenRule'].includes(currencyKey)) return env.deps._t('공허 패시브에는 마법의 새싹, 요정의 고리, 황금률만 사용할 수 있습니다.');
    if ((owner.currencies[currencyKey] || 0) <= 0) return env.deps._t('재화가 부족합니다.');
    return '';
}

export function* voidRuleApplyVoidPassiveCurrency(env, owner, nodeId, currencyKey) {
    if (owner.woodsmanBuildLock) return (yield { kind: 'voidLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] });
    let node = env.deps.PASSIVE_TREE.nodes[nodeId];
    const reason = currencyUseReason(env, owner, node, currencyKey);
    if (reason) return (yield { kind: 'voidLog', args: [reason, 'attack-monster'] });
    let entry = voidRuleGetVoidPassiveCraft(env, owner, node.id);
    if (currencyKey === 'fairyRing') {
        const outcome = yield* voidRuleRollFairyRingOnCraftedVoid(env, owner, entry, node.id);
        (yield { kind: 'voidLog', args: [outcome.text, outcome.tone] });
        yield* env.deps.unlockPassiveStarEvolution(owner);
        (yield { kind: 'voidRefresh', args: [] });
        (yield { kind: 'voidSave', args: [200] });
        return;
    }
    if (currencyKey === 'goldenRule') {
        if (!entry.transcendent || !env.deps.TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min)))) return (yield { kind: 'voidLog', args: [env.deps._t('황금률은 수치가 있는 초월 공허 패시브에만 사용할 수 있습니다.'), 'attack-monster'] });
        owner.currencies.goldenRule--;
        let previousTranscendent = entry.transcendent;
        entry.transcendent = voidRuleRerollTranscendentVoidPassive(env, entry.transcendent);
        voidRuleSyncPaleBlueDotPassivePoints(env, owner, previousTranscendent, entry.transcendent);
        (yield { kind: 'voidLog', args: [env.deps._t('✨ 초월 공허 패시브 수치 재굴림: {replace}', { replace: (yield { kind: 'voidTranscendentLabel', args: [entry.transcendent] }) }), 'loot-unique'] });
        (yield { kind: 'voidRefresh', args: [] });
        (yield { kind: 'voidSave', args: [200] });
        return;
    }
    if (entry.transcendent) return (yield { kind: 'voidLog', args: [env.deps._t('초월 공허 패시브에는 마법의 새싹을 사용할 수 없습니다.'), 'attack-monster'] });
    owner.currencies[currencyKey]--;
    voidRuleRollMagicBudOnVoid(env, entry);
    (yield { kind: 'voidLog', args: [env.deps._t('🕳️ 공허 패시브에 {name} 사용: {replace}', { name: env.deps._t(env.deps.ORB_DB[currencyKey].name), replace: (yield { kind: 'voidEffectLabel', args: [node.id] }) }), 'loot-magic'] });
    (yield { kind: 'voidRefresh', args: [] });
    (yield { kind: 'voidSave', args: [200] });
}
