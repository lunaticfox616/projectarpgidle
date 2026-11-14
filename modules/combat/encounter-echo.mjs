

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.
export function flowEnsureWoodsmanEchoRunState(env) {
    env.owner.woodsmanEchoRun = (env.owner.woodsmanEchoRun && typeof env.owner.woodsmanEchoRun === 'object') ? env.owner.woodsmanEchoRun : {};
    let run = env.owner.woodsmanEchoRun;
    run.active = !!run.active;
    run.duration = 30;
    run.timeLeft = Math.max(0, Number(run.timeLeft || 0));
    run.lastTickAt = Math.max(0, Math.floor(run.lastTickAt || 0));
    run.totalDamage = Math.max(0, Math.floor(run.totalDamage || 0));
    run.bestDps = Math.max(0, Number(run.bestDps || 0));
    return run;
}

/** Where the echo sends the hero back: where it was started (js/state.js getContentReturnZoneId), or the auto progress zone for a run
 * saved before 2026-10-20. It went to the chaos realm every time and never asked the realm's entry (this loop's chaos 20): a new
 * loop's level 1 hero fought the realm's floor 6 there. */
function flowTakeWoodsmanEchoReturnZone(env, run) {
    const back = run.returnZoneId;
    run.returnZoneId = null;
    return back !== undefined && back !== null ? back : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
}

/** 귀환은 측정 완료가 아니다. 기록을 남기지 않고 출발한 지역의 재정비 흐름으로 돌아간다. */
export function flowLeaveWoodsmanEchoForTown(env) {
    if (env.owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID) return;
    const run = flowEnsureWoodsmanEchoRunState(env);
    run.active = false;
    run.timeLeft = 0;
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId = flowTakeWoodsmanEchoReturnZone(env, run);
}

export function* flowFinishWoodsmanEchoRun(env) {
    let run = flowEnsureWoodsmanEchoRunState(env);
    if (!run.active || env.owner.currentZoneId !== env.deps.WOODSMAN_ECHO_ZONE_ID) return;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (env.deps.getCombatTime() - run.lastTickAt) / 1000));
    let elapsed = Math.max(0.1, run.duration - run.timeLeft);
    let dps = run.totalDamage / elapsed;
    run.bestDps = Math.max(run.bestDps || 0, dps);
    run.active = false;
    run.timeLeft = 0;
    env.owner.enemies = [];
    env.owner.combatHalted = false;
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId = flowTakeWoodsmanEchoReturnZone(env, run);
    env.deps.recordWoodsmanEchoRun(run.totalDamage, dps, env.owner, elapsed);
    (yield {kind:'addLog',args:[env.deps._t('🪵 나무꾼의 잔상: 총 피해 {floor}, 최종 DPS {floor2} (최고 {floor3})', { floor: Math.floor(run.totalDamage).toLocaleString(), floor2: Math.floor(dps).toLocaleString(), floor3: Math.floor(run.bestDps).toLocaleString() }), 'season-up']});
    (yield {kind:'updateStaticUI',args:[]});
}

/** 잔상의 30초가 흐르는가. 방 단위 지도에서 잔상이 아직 제 방에서 기다리면 흐르지 않는다: 주인공이 그 방에 닿아 잔상이 일어설 때까지
 * 시계를 지금으로 당겨 둔다. */
function flowIsWoodsmanEchoClockRunning(env, run) {
    const rooms = env.deps.actExplorationState.current(env.owner);
    if (!run.active) return false;
    if (!rooms || !rooms.packs.some(pack => pack.waiting.length > 0)) return true;
    run.lastTickAt = env.deps.getCombatTime();
    return false;
}

export function* flowTickWoodsmanEchoRun(env) {
    let run = flowEnsureWoodsmanEchoRunState(env);
    if (!flowIsWoodsmanEchoClockRunning(env, run)) return;
    let now = env.deps.getCombatTime();
    run.lastTickAt = Number.isFinite(run.lastTickAt) && run.lastTickAt > 0 ? run.lastTickAt : now;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (now - run.lastTickAt) / 1000));
    run.lastTickAt = now;
    let target = (env.owner.enemies || []).find(e => e && e.hp > 0);
    if (target) run.totalDamage = Math.max(0, Math.floor((target.echoStartHp || target.maxHp || 0) - Math.max(0, target.hp || 0)));
    if (run.timeLeft <= 0) (yield* flowFinishWoodsmanEchoRun(env));
}
