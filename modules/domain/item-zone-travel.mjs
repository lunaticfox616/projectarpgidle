import { itemFlowGetHeldRunBlockReason } from './item-run-admission.mjs';
import { itemFlowGetTimeRiftFutureEntryReason } from './item-rift-altar.mjs';

export function itemFlowPrepareMeteorEncounterEntry(env, owner, returnZoneId = Number.isInteger(owner.currentZoneId) ? owner.currentZoneId : null) {
    let st = env.deps.ensureMeteorSiteState();
    st.kind = st.kind || env.deps.rollMeteorKind();
    st.activeMeteorTier = Math.max(8, env.deps.getSkyRiftGaugeEffectiveTier({tier:st.skyRiftMinTier || 13}, st));
    st.meteorReturnZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : null;
    st.skyRiftReady = false;
    st.skyRiftGauge = Math.max(0, Math.floor(st.skyRiftCarryGauge || 0));
    st.skyRiftCarryGauge = 0;
    st.skyRiftMinTier = null;
}

export function itemFlowGetZoneTravelBlockReason(env, owner, id) {
    const atlasReason = env.deps.atlas.travelReason(owner, id);
    if (atlasReason) return atlasReason;
    if (env.deps.getZone(id)?.type === 'trial' && !env.deps.contentProgression.isUnlocked('battleTrials')) {
        return '루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.';
    }
    if (owner.pendingLoopReady) {
        return '⏸️ 루프 진행 대기 중에는 사냥터로 이동할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.';
    }
    if (id === env.deps.LABYRINTH_ZONE_ID) {
        if (owner.season < 3) return '고대 미궁은 루프3부터 개방됩니다.';
        if (owner.maxZoneId < 5) return '액트 5를 먼저 클리어해야 미궁에 입장할 수 있습니다.';
    }
    return null;
}

export function* itemFlowChangeZone(env, owner, id) {
    const blockReason = itemFlowGetZoneTravelBlockReason(env, owner, id);
    if (blockReason) return (yield { kind: 'itemLog', args: [blockReason, 'attack-monster'] });
    const held = heldTravelReason(env, owner, id);
    if (held) return (yield { kind: 'itemLog', args: [held, 'attack-monster'] });
    owner.inTicketBossFight = false;
    if (typeof id === 'number' && id > owner.maxZoneId) return;
    const meteorReason = prepareMeteorTravel(env, owner, id);
    if (meteorReason) return (yield { kind: 'itemLog', args: [meteorReason, 'attack-monster'] });
    let zone = env.deps.getZone(id);
    if (!zone) return (yield { kind: 'itemLog', args: [env.deps._t('이동할 수 없는 지역입니다.'), 'attack-monster'] });
    const entryReason = prepareContentTravel(env, owner, id, zone);
    if (entryReason) return (yield { kind: 'itemLog', args: [entryReason, 'attack-monster'] });
    prepareAbyssTravel(env, owner, id);
    env.deps.atlasRun.travel(zone);
    owner.killsInZone = 0;
    (yield { kind: 'itemLog', args: [env.deps._t('🗺️ {name} 이동', { name: env.deps._t(zone.name) }), "season-up"] });
    // 지도 선택은 귀환 완료가 아니라 새 전투로 출발하는 이동이다.
    (yield { kind: 'itemStartMoving', args: [false] });
    (yield { kind: 'itemRefresh', args: [] });
}

function heldTravelReason(env, owner, id) {
    const boundary = env.deps.ensureBeyondBoundaryState(owner);
    const held = id === env.deps.BEYOND_BOUNDARY_ZONE_ID && boundary.activeRun ? '' : itemFlowGetHeldRunBlockReason(env, owner);
    if (held) return held;
    if (id === env.deps.BEYOND_BOUNDARY_ZONE_ID && !boundary.activeRun)
        return env.deps._t('경계 너머 화면에서 단계와 성장시킬 인장을 선택해 도전을 시작하세요.');
    return null;
}

function prepareMeteorTravel(env, owner, id) {
    if (id !== env.deps.METEOR_FALL_ZONE_ID) return null;
    const st = env.deps.ensureMeteorSiteState();
    if (!st.unlocked) return env.deps._t('운석 낙하 지점은 아직 잠겨 있습니다.');
    if (!st.skyRiftReady) return env.deps._t('하늘의 균열 게이지가 100%가 되어야 입장 가능합니다.');
    itemFlowPrepareMeteorEncounterEntry(env, owner);
    return null;
}

// Keep ticket, rift and chaos admissions in their original order; some steps mutate entry state.
function prepareContentTravel(env, owner, id, zone) {
    if (zone.type === 'seasonBoss') {
        const reason = prepareSeasonBossTravel(env, owner, zone);
        if (reason) return reason;
    }
    if (zone.type === 'timeRift') {
        const reason = prepareRiftTravel(env, owner, zone);
        if (reason) return reason;
    }
    return id === env.deps.CHAOS_REALM_ZONE_ID ? prepareChaosTravel(env) : null;
}

function prepareSeasonBossTravel(env, owner, zone) {
    if ((owner.season || 1) < (zone.reqSeason || 2)) {
        return zone.rivalBlade ? '버려진 날붙이들은 루프 31부터 당신을 찾아옵니다.'
            : (zone.milestonePinnacle ? '아틀라스 최종 관문은 루프 31부터 모습을 드러냅니다.' : '아직 뿌리 보스가 잠겨 있습니다.');
    }
    const gate = env.deps.getSeasonBossProgressGate(zone, owner);
    if (!gate.met) return env.deps._t('🔒 {label} 조건을 먼저 달성해야 합니다.', { label: env.deps._t(gate.label) });
    if (!zone.milestonePinnacle) {
        if ((owner.currencies[zone.key] || 0) <= 0) return env.deps._t('입장 열쇠({name})가 필요합니다.', { name: env.deps._t(env.deps.ORB_DB[zone.key].name) });
        owner.currencies[zone.key]--;
    }
    owner.inTicketBossFight = true;
    return null;
}

function prepareRiftTravel(env, owner, zone) {
    const rift = env.deps.ensureTimeRiftState();
    if ((owner.season || 1) < env.deps.TIME_RIFT_UNLOCK_LOOP) return env.deps._t('시간의 균열은 루프 {TIME_RIFT_UNLOCK_LOOP}부터 열립니다.', { TIME_RIFT_UNLOCK_LOOP: env.deps.TIME_RIFT_UNLOCK_LOOP });
    const mismatch = zone.riftPhase === 'future' ? itemFlowGetTimeRiftFutureEntryReason(env, owner, rift) : null;
    if (mismatch) return mismatch;
    rift.activePressure = rift.pressure;
    return null;
}

function prepareChaosTravel(env) {
    const realm = env.deps.ensureChaosRealmState();
    if (!realm.unlocked) return env.deps._t('혼돈계는 나무꾼에게 10% 이상 피해를 준 전투 종료 시 해금됩니다.');
    if (!env.deps.canEnterChaosRealm()) return env.deps._t('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.');
    const maxFloor = Math.max(1, Math.floor(realm.highestFloor || 1));
    realm.currentFloor = Math.max(1, Math.min(maxFloor, Math.floor(realm.currentFloor || 1)));
    return null;
}

function prepareAbyssTravel(env, owner, id) {
    if (typeof id === 'number' && id >= env.deps.ABYSS_START_ZONE_ID) {
        let depth = Math.max(1, Math.floor(env.deps.getAbyssDepthFromZoneId(id) || 1));
        owner.abyssEndlessDepth = depth;
        owner.abyssUnlockedDepths = Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths : [20];
        if (depth >= 20 && !owner.abyssUnlockedDepths.includes(depth)) owner.abyssUnlockedDepths.push(depth);
    }
}
