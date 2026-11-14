import { clearContinueMapAfterClear } from '../combat/clear-travel.mjs';

export function* clearFinishTimeRiftEncounter(env, zone) {
    let rift = env.deps.ensureTimeRiftState();
    if (zone.riftPhase === 'past') {
        rift.altarOpen = true;
        (yield { kind: 'finishSay', args: [env.deps._t('⏳ 과거의 제단이 열렸습니다. (시간압 {pressure}) 시간의 균열에서 장비를 골라 같은 부위의 고유 1개/희귀 1개를 올리세요.', { pressure: zone.pressure }), 'loot-unique'] });
    } else (yield* clearFinishTimeRiftFusion(env, rift));
    rift.activePressure = null;
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}

export function* clearFinishTimeRiftFusion(env, rift) {
    let fusion = typeof env.deps.resolveTimeRiftFusion === 'function' ? env.deps.resolveTimeRiftFusion() : null;
    if (!fusion) return;
    rift.fusionCount = Math.max(0, Math.floor(rift.fusionCount || 0)) + 1;
    env.deps.unlockJournalEntry('time_rift_fusion');
    let gradeLabel = fusion.grade === 'perfect' ? '완벽한 융합' : (fusion.grade === 'normal' ? '보통 융합' : '불안정한 융합');
    (yield { kind: 'finishSay', args: [env.deps._t('⌛ {grade}! [{name}]{particle} 억겁의 시간을 건너 돌아왔습니다. (계승한 추가 옵션 {inherited}개{lost})', { grade: gradeLabel, name: env.deps._t(fusion.fused.name), particle: env.deps.pickParticle(fusion.fused.name, '이', '가'), inherited: fusion.inherited, lost: fusion.lost > 0 ? `, ${env.deps._t('{n}개 유실', { n: fusion.lost })}` : `, ${env.deps._t('유실 없음')}` }), 'loot-unique'] });
}
