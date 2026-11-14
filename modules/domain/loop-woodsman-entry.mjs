

export function loopFlowMarkLoopSpecialBossKill(owner, bossKey) {
    owner.loopProgressCurrent = owner.loopProgressCurrent || { specialBosses: [] };
    owner.loopProgressCurrent.specialBosses = Array.isArray(owner.loopProgressCurrent.specialBosses) ? owner.loopProgressCurrent.specialBosses : [];
    if (!owner.loopProgressCurrent.specialBosses.includes(bossKey)) owner.loopProgressCurrent.specialBosses.push(bossKey);
}

export function loopFlowAddWoodsmanPendingScore(owner, scoreGain) {
    let score = Math.max(0, Math.floor(scoreGain || 0));
    if (score <= 0) return;
    // 나무꾼 점수는 누적합이 아니라 '최고 기록' 기반으로 관리
    owner.woodsmanPendingScore = Math.max(Math.floor(owner.woodsmanPendingScore || 0), score);
    owner.woodsmanLifetimeScore = Math.max(Math.floor(owner.woodsmanLifetimeScore || 0), score);
}

export function* loopFlowFinishWoodsmanEntrance(env, owner) {
    if (!owner.woodsmanEntrancePending) return false;
    owner.woodsmanEntrancePending = false;
    owner.currentZoneId = env.deps.OUTSIDE_CHAOS_ZONE_ID;
    let zone = env.deps.getZone(env.deps.OUTSIDE_CHAOS_ZONE_ID);
    if (!zone || zone.type !== 'outsideChaos') return false;
    owner.moveTimer = 0;
    owner.moveTotalTime = 0;
    owner.runProgress = 0;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.enemies = [];
    owner.inEncounter = true;
    (yield { kind: 'loopLog', args: [env.deps._t('☠️ 하늘이 갈라지고 도끼날의 그림자가 전장을 뒤덮습니다.'), 'loot-unique'] });
    // 방 단위 무대: 입구와 나무꾼의 방, 두 칸의 투기장을 연다. 저주는 나무꾼이 깨어날 때 걸린다(beginRoomBossRules).
    if (env.deps.getZoneExplorationPlan(zone)) env.deps.startEncounterRun();
    else {
        env.deps.startWoodsmanCurse();
        owner.enemies = [env.deps.createEnemy(zone, { at: 0, count: 1, boss: true }, 0)];
    }
    (yield { kind: 'loopRefresh', args: [] });
    return true;
}

export function* loopFlowEnterOutsideChaos(env, owner) {
    const held = env.deps.getContentStartBlockReason();
    if (held) return (yield { kind: 'loopLog', args: [held, 'attack-monster'] });
    if ((owner.season || 1) < 10) return (yield { kind: 'loopLog', args: [env.deps._t('혼돈 밖은 루프 10 이후 개방됩니다.'), 'attack-monster'] });
    let outsideChaosRequirementMet = hasOutsideChaosRequirement(env, owner);
    if (!outsideChaosRequirementMet) return (yield { kind: 'loopLog', args: [env.deps.getLoopAbyssRequirementPrompt(owner.season || 1), 'attack-monster'] });
    env.deps.actExplorationProgress.depart(owner); // 바닥의 전리품을 잠금 사본보다 먼저 거둔다: 뒤에 거두면 다음 틱에 가방이 되돌아가 사라졌다(2026-10-20)
    owner.woodsmanBuildSnapshot = env.deps.snapshotWoodsmanBuildState();
    owner.woodsmanBuildLock = true;
    owner.currentZoneId = env.deps.OUTSIDE_CHAOS_ZONE_ID;
    owner.killsInZone = 0;
    owner.runProgress = 0;
    owner.moveTotalTime = env.WOODSMAN_ENTRANCE_DELAY_SECONDS;
    owner.moveTimer = env.WOODSMAN_ENTRANCE_DELAY_SECONDS;
    owner.isTownReturning = false;
    owner.combatHalted = false;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.enemies = [];
    owner.inEncounter = false;
    owner.woodsmanEntrancePending = true;
    env.deps.resetWoodsmanCurse();
    env.deps.prepareActExplorationArrival(); // 방 단위 무대: 기다리는 몇 초 동안 투기장의 입구에 서 있다
    (yield { kind: 'loopLog', args: [env.deps._t('☠️ 금단의 경계 너머로 발을 들였습니다. 혼돈이 몇 초간 숨을 고릅니다.'), 'loot-unique'] });
    (yield { kind: 'loopRefresh', args: [] });
}

function hasOutsideChaosRequirement(env, owner) {
    return typeof env.deps.hasCurrentLoopAbyssRequirementClear === 'function'
        ? env.deps.hasCurrentLoopAbyssRequirementClear(owner.season || 1)
        : ((env.deps.getSeasonAbyssDepthCap(owner.season || 1) <= 20)
            ? (typeof env.deps.hasCurrentLoopChaos20Clear === 'function' ? env.deps.hasCurrentLoopChaos20Clear() : !!(owner.loopProgressCurrent && owner.loopProgressCurrent.chaos20Cleared))
            : Math.max(0, Math.floor((owner.loopProgressCurrent && owner.loopProgressCurrent.bestAbyssDepth) || 0)) >= env.deps.getSeasonAbyssDepthCap(owner.season || 1));
}

export function loopFlowDressWoodsmanEchoDummy(dummy) {
    dummy.name = '나무꾼의 잔상';
    dummy.maxHp = Math.max(1, Math.floor((dummy.maxHp || 1) * 1000));
    dummy.hp = dummy.maxHp;
    dummy.echoStartHp = dummy.maxHp;
    dummy.noAttack = true;
    dummy.regenRate = 0;
    dummy.regenBank = 0;
    return dummy;
}

export function* loopFlowEnterWoodsmanEchoChallenge(env, owner) {
    const held = env.deps.getContentStartBlockReason();
    if (held) return (yield { kind: 'loopLog', args: [held, 'attack-monster'] });
    let st = env.deps.ensureChaosRealmState();
    if (!st.unlocked) return (yield { kind: 'loopLog', args: [env.deps._t('혼돈계 해금 이후 이용 가능합니다.'), 'attack-monster'] });
    if (!(Array.isArray(owner.journalEntries) && owner.journalEntries.includes('woodsman_echo'))) return (yield { kind: 'loopLog', args: [env.deps._t('나무꾼 완전 격파 이후에만 도전할 수 있습니다.'), 'attack-monster'] });
    let run = env.deps.ensureWoodsmanEchoRunState();
    run.active = true;
    run.duration = 30;
    run.timeLeft = 30;
    run.lastTickAt = env.deps.getCombatTime();
    run.totalDamage = 0;
    // 잔상 안에서 다시 시작하면 처음 시작한 곳을 지킨다. 측정이므로 미리 받은 숨결(js/combat-incidents.js breathe)은 지운다.
    if (owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID || run.returnZoneId === undefined || run.returnZoneId === null) run.returnZoneId = env.deps.getContentReturnZoneId();
    owner.incidentBreath = null;
    env.deps.actExplorationProgress.depart(owner);
    owner.currentZoneId = env.deps.WOODSMAN_ECHO_ZONE_ID;
    owner.killsInZone = 0;
    owner.runProgress = 0;
    owner.moveTimer = 0;
    owner.moveTotalTime = 0;
    owner.combatHalted = false;
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    // 방 단위 무대: 입구와 잔상의 방, 두 칸의 투기장(잔상은 createExplorationBossStage가 세운다). 30초는 잔상이 일어선 뒤부터 흐른다.
    if (env.deps.getZoneExplorationPlan(env.deps.getZone(env.deps.WOODSMAN_ECHO_ZONE_ID))) {
        owner.enemies = [];
        env.deps.startEncounterRun();
    } else owner.enemies = [loopFlowDressWoodsmanEchoDummy(env.deps.createEnemy(env.deps.getZone(env.deps.OUTSIDE_CHAOS_ZONE_ID), { at: 0, count: 1, boss: true }, 0))];
    (yield { kind: 'loopLog', args: [env.deps._t('📏 나무꾼의 잔상 도전 시작: 30초 동안 최대 피해를 기록하세요. (허수아비는 공격하지 않습니다)'), 'season-up'] });
    (yield { kind: 'loopRefresh', args: [] });
}

export function* loopFlowEndWoodsmanFightForLoop(env, owner) {
    if (owner.woodsmanBuildLock) {
        env.deps.clearWoodsmanBuildLock();
        (yield { kind: 'loopLog', args: ['☠️ 혼돈 밖 전투를 중단하고 루프를 진행합니다. 세팅 잠금이 해제되었습니다.', 'season-up'] });
    }
}
