

export function hitResetWoodsmanCurse(env) {
    env.owner.woodsmanCurseActive = false;
    env.owner.woodsmanCurseDamageTakenStacks = 0;
    env.owner.woodsmanCurseLastTickAt = 0;
    env.owner.woodsmanCurseNextLogStack = 0;
}

export function* hitStartWoodsmanCurse(env) {
    env.owner.woodsmanCurseActive = true;
    env.owner.woodsmanCurseDamageTakenStacks = 0;
    env.owner.woodsmanCurseLastTickAt = env.deps.getCombatTime();
    env.owner.woodsmanCurseNextLogStack = 100;
    (yield { kind: 'addLog', args: [env.deps._t('🪓 나무꾼의 저주: 전투가 끝날 때까지 매초 받는 피해가 0.01%씩 증가합니다.'), 'attack-monster'] });
}

export function* hitTickWoodsmanCurse(env) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !env.owner.woodsmanCurseActive) return;
    let now = env.deps.getCombatTime();
    env.owner.woodsmanCurseLastTickAt = Number.isFinite(env.owner.woodsmanCurseLastTickAt) && env.owner.woodsmanCurseLastTickAt > 0 ? env.owner.woodsmanCurseLastTickAt : now;
    let elapsed = now - env.owner.woodsmanCurseLastTickAt;
    if (elapsed < 1000) return;
    let ticks = Math.floor(elapsed / 1000);
    env.owner.woodsmanCurseLastTickAt += ticks * 1000;
    env.owner.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(env.owner.woodsmanCurseDamageTakenStacks || 0)) + ticks;
    yield* notifyWoodsmanCurseStacks(env);
}

function* notifyWoodsmanCurseStacks(env) {
    if ((env.owner.settings && env.owner.settings.showCombatLog !== false) && env.owner.woodsmanCurseDamageTakenStacks >= Math.max(100, Math.floor(env.owner.woodsmanCurseNextLogStack || 100))) {
        (yield { kind: 'addLog', args: [env.deps._t('🪓 나무꾼의 저주 중첩: 받는 피해 +{value}%', { value: (env.owner.woodsmanCurseDamageTakenStacks * 0.01).toFixed(2) }), 'attack-monster', { noToast: true }] });
        env.owner.woodsmanCurseNextLogStack = Math.floor(env.owner.woodsmanCurseDamageTakenStacks / 100 + 1) * 100;
    }
}

export function hitGetWoodsmanCurseDamageTakenMul(env) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !env.owner.woodsmanCurseActive) return 1;
    return 1 + Math.max(0, Math.floor(env.owner.woodsmanCurseDamageTakenStacks || 0)) * 0.0001;
}
