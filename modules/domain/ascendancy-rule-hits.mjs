import { ascendNodeTagged, ascendNodeValue, ascendNodeLiving } from './ascendancy-rule-values.mjs';
import { ascendNodeImageCount, ascendNodeArmorBreak } from './ascendancy-rule-reads.mjs';

/** 주인공의 적중 뒤(js/combat-support-runes.js dealHit): 갑주 분쇄 중첩, 한 적을 계속 베는 시간, 강타가 가른 땅, 이중 폭발에 실을 적중.
 * 새 규칙: 잔상이 함께 베고, 바람 화살이 옆 적에게 튀고, 냉기 타격이 이끼를 깐다. */
export function* ascendNodeAfterHit(env, owner, pStats, enemy, ...selection) {
    const [dealt, now] = selection;
    if (!(dealt > 0) || !env.deps.hasGridCell(enemy)) return;
    const element = enemy.lastHitElement || 'phys';
    if (element === 'phys' && env.deps.hasKeystone('w4', owner)) ascendNodeStackArmorBreak(env, owner, enemy, now);
    if (env.deps.hasKeystone('bz5', owner)) ascendNodeKeepFocus(env, owner, enemy, now);
    if (env.deps.hasKeystone('jg1', owner) && ascendNodeTagged(pStats.sSkill, 'slam')) env.cracks.push({ gx: enemy.gx, gy: enemy.gy, until: now + ascendNodeValue(env, 'jg1').crackMs });
    if (env.currentEcho) ascendNodeNoteEchoHit(env, env.currentEcho, enemy, dealt, element, now);
    yield* ascendNodeAfterHitRedesigned(env, owner, pStats, enemy, dealt, element, now);
}

export function* ascendNodeAfterHitRedesigned(env, owner, pStats, enemy, ...selection) {
    const [dealt, element, now] = selection;
    if (ascendNodeImageCount(env, now) > 0) yield* ascendNodeReleaseImages(env, enemy, dealt, element, now);
    if (env.gale.active && !env.gale.splashed) yield* ascendNodeSplashGale(env, owner, pStats, enemy, dealt, element);
    if (element === 'cold' && env.deps.hasKeystone('gw1', owner)) ascendNodeLayMoss(env, enemy, now);
}

/** 잔상(bd2): 모인 잔상이 이번 적중에 하나마다 그 피해의 perImagePct%로 한 번 더 치고 사라진다. 그 적의 쓰러짐은 이 적중을 부른 쪽이 본다. */
export function* ascendNodeReleaseImages(env, enemy, dealt, element, now) {
    const blow = Math.max(1, Math.floor(dealt * ascendNodeValue(env, 'bd2').perImagePct / 100 * ascendNodeImageCount(env, now)));
    env.images = { count: 0, until: 0 };
    const extra = env.deps.applyDamageToEnemyResource(enemy, blow);
    (yield { kind: 'ascendancyFx', args: ['hit', { enemyId: enemy.id, color: '#cfe6ff', damage: extra, duration: 260, element, syncToSwing: false }] });
    (yield { kind: 'ascendancyFx', args: ['statusText', { enemyId: enemy.id, text: env.deps._t('잔상'), color: '#cfe6ff', duration: 600 }] });
}

/** 바람 화살(sa3): 이 공격의 첫 적중이 둘레 splashCells칸의 가장 가까운 다른 적 하나에게 같은 피해로 튄다. */
export function* ascendNodeSplashGale(env, owner, pStats, enemy, ...selection) {
    const [dealt, element] = selection;
    env.gale = { ...env.gale, splashed: true };
    const near = (owner.enemies || []).filter(other => other !== enemy && ascendNodeLiving(other) && env.deps.hasGridCell(other) && env.deps.getGridUnitDistance(enemy, other) <= ascendNodeValue(env, 'sa3').splashCells)
        .sort((a, b) => env.deps.getGridUnitDistance(enemy, a) - env.deps.getGridUnitDistance(enemy, b))[0];
    if (!near) return;
    const hit = env.deps.applyDamageToEnemyResource(near, dealt);
    (yield { kind: 'ascendancyFx', args: ['hit', { enemyId: near.id, color: '#bfefff', damage: hit, duration: 240, element, syncToSwing: false }] });
    if (near.hp <= 0) env.deps.handleEnemyDeath(near, pStats);
}

/** 서리 이끼(gw1): 냉기 타격이 맞힌 칸에 mossMs 동안 이끼가 깔린다(같은 칸은 시간만 새로). */
export function ascendNodeLayMoss(env, enemy, now) {
    env.mosses = env.mosses.filter(moss => moss.gx !== enemy.gx || moss.gy !== enemy.gy);
    env.mosses.push({ gx: enemy.gx, gy: enemy.gy, until: now + ascendNodeValue(env, 'gw1').mossMs });
}

export function ascendNodeStackArmorBreak(env, owner, enemy, now) {
    const v = ascendNodeValue(env, 'w4'), stacks = ascendNodeArmorBreak(env, owner, enemy, 'phys', now) / v.perHit;
    enemy.armorBreak = { stacks: Math.min(v.maxStacks, stacks + 1), until: now + v.durationMs };
}

/** 멈추지 않는 칼날(bz5): 같은 적을 focusMs 넘게 이어 베면 처치 때와 같은 흡혈 효율 창이 열려 있다. 1초 쉬면 다시 센다. */
export function ascendNodeKeepFocus(env, owner, enemy, now) {
    if (env.focus.enemyId !== enemy.id || now - env.focus.last > 1000) env.focus = { enemyId: enemy.id, since: now, last: now };
    env.focus.last = now;
    if (now - env.focus.since >= ascendNodeValue(env, 'bz5').focusMs) owner.uniqueLeechEfficiencyUntil = Math.max(Number(owner.uniqueLeechEfficiencyUntil) || 0, now + 1000);
}

export function ascendNodeNoteEchoHit(env, echo, enemy, dealt, ...selection) {
    const [element, now] = selection;
    if (!echo.at) echo.at = now + ascendNodeValue(env, 'bm4').delayMs;
    echo.hits.push({ enemyId: enemy.id, gx: enemy.gx, gy: enemy.gy, damage: dealt, element });
}
