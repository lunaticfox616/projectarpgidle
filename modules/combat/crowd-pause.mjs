

export function* hitSyncCrowdPauseState(env) {
    let paused = hitIsCrowdProgressPaused(env);
    if (paused === env.runtime.crowdPauseActive) return paused;
    env.runtime.crowdPauseActive = paused;
    if (env.owner.settings.showCrowdPauseLog !== false) {
        if (paused) (yield { kind: 'addLog', args: [env.deps._t('⛔ 적이 {ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 맵 진행이 멈췄습니다. 적 수를 줄이면 다시 전진합니다.', { ENEMY_CROWD_PAUSE_LIMIT: env.deps.ENEMY_CROWD_PAUSE_LIMIT }), 'attack-monster'] });
        else (yield { kind: 'addLog', args: [env.deps._t('🧭 적 숫자가 줄어 맵 진행을 재개합니다.'), 'loot-normal'] });
    }
    return paused;
}

export function hitIsCrowdProgressPaused(env) {
    if (env.owner.moveTimer > 0) return false;
    // 방 단위 무대: 방 안의 몬스터를 다 잡아야 문이 열린다. 따로 멈출 진행이 없으니 무리가 많다는 알림도 내지 않는다.
    if (env.deps.actExplorationDoors.stageMap(env.deps.actExplorationState.current(env.owner))) return false;
    return (env.owner.enemies || []).filter(enemy => enemy.hp > 0).length >= env.deps.ENEMY_CROWD_PAUSE_LIMIT;
}
