import { voidRuleActiveChameleonEntry, voidRuleGetChameleonChoices, voidRuleEnsureVoidPassiveState } from './void-passive-state.mjs';
import { voidRuleRollTranscendentDef, voidRuleRollTranscendentVoidPassive } from './void-passive-rolls.mjs';
import { voidRuleSyncPaleBlueDotPassivePoints, voidRuleIsRoutingTranscendent, voidRuleRefreshPassiveConnectivity } from './void-passive-connections.mjs';

/** 카멜레온(초월 공허)을 고른 초월로 바꾼다(2026-10-20 사용자: "선택해서 변환 가능하게"). 값은 새로 굴리고, 한 번 바꾸면 카멜레온이
 * 아니다. 스킬트리 포인트(창백한 푸른 점)와 연결(블랙홀, 안드로메다)은 바로 정산한다. '' when done, otherwise why not. */
export function* voidRuleConvertChameleonVoidPassive(env, owner, nodeId, targetId) {
    if (owner.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';
    const entry = voidRuleActiveChameleonEntry(env, owner, nodeId);
    if (!entry) return '활성화한 카멜레온 공허 패시브만 바꿀 수 있습니다.';
    const def = voidRuleGetChameleonChoices(env, owner, nodeId).find(row => row.id === targetId);
    if (!def) return '고를 수 없는 초월입니다.';
    const previous = entry.transcendent;
    entry.transcendent = voidRuleRollTranscendentDef(def);
    voidRuleSyncPaleBlueDotPassivePoints(env, owner, previous, entry.transcendent);
    if (voidRuleIsRoutingTranscendent(entry.transcendent)) yield* voidRuleRefreshPassiveConnectivity(env, owner);
    (yield { kind: 'voidInvalidateStats', args: [] });
    return '';
}

/** 요정의 고리: 25%로 초월, 아니면 옵션 없는 공허가 된다. 태양은 직전 옵션을 지킨다(3배로 적용).
 * 포인트(창백한 푸른 점)나 연결(블랙홀 · 안드로메다)을 바꾸는 초월은 바로 정산한다. */
export function* voidRuleRollFairyRingOnVoid(env, owner, entry, nodeId) {
    const previous = entry.transcendent;
    entry.transcendent = Math.random() < 0.75 ? null : voidRuleRollTranscendentVoidPassive(env, owner, nodeId);
    if (!entry.transcendent || entry.transcendent.id !== 'sun') entry.stats = [];
    voidRuleSyncPaleBlueDotPassivePoints(env, owner, previous, entry.transcendent);
    if (voidRuleIsRoutingTranscendent(previous) || voidRuleIsRoutingTranscendent(entry.transcendent)) yield* voidRuleRefreshPassiveConnectivity(env, owner);
    entry.rarity = entry.transcendent ? 'transcendent' : 'normal';
}

export function* voidRuleRecordImmortalHeroDeathPenalty(env, owner) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    let changed = false;
    Object.values(state).forEach(entry => {
        let tr = entry && entry.transcendent;
        if (!tr || tr.id !== 'immortalHero') return;
        let before = Math.max(0, Math.floor(Number(tr.value) || 0));
        tr.value = Math.max(0, before - 30);
        changed = changed || tr.value !== before;
    });
    if (changed && (yield { kind: 'voidCanLog', args: [] })) (yield { kind: 'voidLog', args: [env.deps._t('🛡️ 불멸의 영웅 효과가 사망으로 생명력 -30 감소했습니다.'), 'death'] });
    return changed;
}
