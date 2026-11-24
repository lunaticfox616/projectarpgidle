import { meteorEnsureMeteorSiteState } from './meteor-progress-state.mjs';

export function* meteorGrantMeteorEquipmentReward(env) {
    const item = (yield { kind: 'progressGenerateEquipment', args: [{ isBoss: true }, { minimumRarity: 'rare', zone: env.deps.getZone(env.deps.METEOR_FALL_ZONE_ID) }] });
    return item && (yield { kind: 'progressStoreEquipment', args: [item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true }] }) ? item : null;
}

/** 운석 낙하 정산: 단계 20, 40에서 희귀 이상 장비가 하나씩 늘어난다. 고유 '낙성의 발자취'는 지역 전용 드롭으로 따로 떨어진다.
 * 운석 파편 · 별쐐기 재료(6단계)와 별가루(7단계)는 없어졌다. 예전에 관측한 별자리(meteorSite.constellationBuff)는 그대로 남는다. */
export function* meteorGrantMeteorEncounterRewards(env, owner) {
    let st = meteorEnsureMeteorSiteState(env, owner);
    let encounterTier = Math.max(1, Math.floor(st.activeMeteorTier || 1));
    const count = env.deps.getZone(env.deps.METEOR_FALL_ZONE_ID).rewardEquipmentCount;
    for (let i = 0; i < count; i++) {
        const item = yield* meteorGrantMeteorEquipmentReward(env);
        (yield { kind: 'progressLog', args: [env.deps._t('☄️ 운석 {tier}단계 정산 ({index}/{count}){item}', { tier: encounterTier, index: i + 1, count, item: item ? `, [${(yield { kind: 'progressItemName', args: [item] })}]` : '' }), 'loot-rare', item ? { item } : {}] });
    }
    (yield { kind: 'progressJournal', args: ['meteor_fall'] });
}
