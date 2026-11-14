import { incidentRule, incidentDraw, incidentOften, incidentNote, incidentWorn, incidentTell } from '../combat/incident-common.mjs';

// ---------------------------------------------------------------- 잠든 무리
export function incidentLull(env, enemy) { return Object.assign(enemy, { asleep: true, awakeName: enemy.name, awakeOutline: enemy.encounterOutline || null,
    name: `${incidentRule(env).sleep.prefix} ${enemy.name}`, encounterOutline: incidentRule(env).sleep.outline }); }

/** 드물게 무리가 잠들어 있다(pack.sleep, 습격방에 모이지 않는다): 이름 앞에 prefix와 테. 깨기 전에는 움직이지도 공격하지도 않는다. */
export function incidentLullPack(env, pack) {
    if (incidentDraw(env, 'sleep', `${pack.key}:${pack.aliveIds[0]}`) >= incidentRule(env).sleep.chance * incidentOften(env)) return;
    pack.sleep = true;
    pack.waiting.forEach(((...args) => incidentLull(env, ...args)));
}

/** 잠든 몬스터들: 무리의 누가 다쳤거나 영웅이 wakeCells 안에 든 무리는 무리째 깨고(wakePack), 나머지는 붙잡아 둔 채 z를 띄운다. */
export function* incidentTickSleep(env, run, sleepers, now) {
    const S = incidentRule(env).sleep, hero = env.owner.gridPlayer;
    const near = enemy => !!hero && env.deps.hasGridCell(enemy) && env.deps.gridChebyshevDist(enemy.gx, enemy.gy, hero.gx, hero.gy) <= S.wakeCells;
    const woken = new Set(sleepers.filter(enemy => enemy.hp < enemy.maxHp || near(enemy)).map(enemy => enemy.explorationPack));
    for (const enemy of sleepers) if (!woken.has(enemy.explorationPack)) (yield* incidentDoze(env, enemy, now));
    for (const key of woken) (yield* incidentWakePack(env, run, key, sleepers, now));
}

/** 무리째 깬다: 싸움에 든 잠든 몬스터와 아직 영웅을 못 알아챈 몬스터 모두(안개 지도에서는 무리가 나뉘어 싸움에 들어 두 번 셌다). 사건
     * 기록은 무리마다 한 번. */
export function* incidentWakePack(env, run, key, sleepers, now) {
    const pack = run.packs.find(row => row.key === key), waiting = pack ? pack.waiting.filter(enemy => enemy.asleep) : [];
    const waking = sleepers.filter(enemy => enemy.explorationPack === key).concat(waiting), count = waking.length;
    for (let index = 0; index < count; index++) {
        if (!(index in waking)) continue;
        (yield* incidentWake(env, waking[index], now));
    }
    (yield* incidentNote(env, 'sleep'));
}

/** 깬 몬스터: 이름과 테(잠들기 전의 테, 길 잃은 몬스터의 초록 테 같은)가 돌아오고 groggyMs 동안 멍하다(머리 위에 !). */
export function* incidentWake(env, enemy, now) {
    const S = incidentRule(env).sleep;
    Object.assign(enemy, { asleep: false, name: enemy.awakeName || enemy.name, encounterOutline: enemy.awakeOutline || null });
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + S.groggyMs);
    (yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text: '!', color: S.outline, duration: 420 }] });
}

/** 자는 몬스터: 다음 틱까지 붙잡아 두고 zEveryMs마다(몬스터마다 조금씩 어긋나게) 머리 위에 z. */
export function* incidentDoze(env, enemy, now) {
    const S = incidentRule(env).sleep;
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + 400);
    if (Number(enemy.sleepZAt) > now) return;
    enemy.sleepZAt = now + S.zEveryMs + (Math.abs(enemy.id || 0) % 5) * 120;
    (yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text: 'z', color: S.zColor, duration: 900 }] });
}

/** 하품의 확률: 꿈결의 향로를 끼면 그 확률(chance). */
export function incidentYawnChance(env) {
    const incense = incidentWorn(env, 'drowsyIncense');
    return Math.max(incidentRule(env).yawn.chance * incidentOften(env), incense ? Number(incense.chance) || 0 : 0);
}

export function* incidentYawn(env, enemies, now) {
    const incense = incidentWorn(env, 'drowsyIncense'), sleepMs = incense ? incense.sleepMs : incidentRule(env).yawn.sleepMs;
    enemies.forEach(enemy => { enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, now + sleepMs); });
    (yield* incidentTell(env.deps._t('세계수가 하품을 했습니다. 이 방의 몬스터가 잠시 잠들었습니다.'), 'reward'));
    (yield* incidentNote(env, 'yawn'));
}
