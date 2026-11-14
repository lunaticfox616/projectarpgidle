import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
export function* clearFinishMeteorEncounter(env) {
    env.deps.grantMeteorEncounterRewards();
    let st = env.deps.ensureMeteorSiteState();
    st.entriesCleared = (st.entriesCleared || 0) + 1;
    st.activeMeteorTier = null;
    st.kind = null;
    env.deps.clearWoodsmanBuildLock();
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    env.owner.currentZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function* clearFinishOutsideChaosEncounter(env, zone) {
    // outsideChaos는 현재 단일 보스(나무꾼) 클리어 전투이므로
    // 완료 시점이면 보스 처치로 간주한다.
    env.deps.addWoodsmanPendingScore(1000000);
    let realm = env.deps.ensureChaosRealmState();
    realm.woodsmanBestDamagePct = 100;
    env.deps.unlockJournalEntry('woodsman_echo');
    env.deps.maybeUnlockChaosRealmFromWoodsman({ isBoss: true, hp: 0, maxHp: 1 }, { finalize: true });
    env.deps.markLoopSpecialBossKill('woodsman_true');
    (yield { kind: 'finishSay', args: [env.deps._t('🪓 나무꾼을 쓰러뜨렸습니다. 다음 경계가 열립니다.'), 'loot-unique'] });
    env.deps.clearWoodsmanBuildLock();
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}
