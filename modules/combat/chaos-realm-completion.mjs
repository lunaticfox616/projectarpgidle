import { clearRecordLoopBestFloor, clearNextBestZoneOr } from '../combat/clear-progression.mjs';
import { clearContinueMapAfterClear } from '../combat/clear-travel.mjs';

export function* clearFinishChaosRealmEncounter(env, zone, mapAction) {
    let st = env.deps.ensureChaosRealmState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    clearRecordLoopBestFloor(env, 'bestChaosRealmFloor', floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    if (firstClear) {
        st.clearedFloors.push(floor);
        st.clearedFloors.sort((a, b) => a - b);
        env.deps.grantChaosRealmFloorBonus(floor);
    }
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    (yield { kind: 'finishSay', args: [env.deps._t('🌌 혼돈계 {floor}층 돌파!', { floor }), 'season-up'] });
    env.owner.currentZoneId = mapAction === 'nextLoopBestPlusOne' ? clearNextBestZoneOr(env, zone, env.deps.CHAOS_REALM_ZONE_ID) : env.deps.CHAOS_REALM_ZONE_ID;
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}
