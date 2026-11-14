import { ascendNodeFillSap, ascendNodeMitigatedBlow } from './ascendancy-rule-defense.mjs';
import { ascendNodeValue, ascendNodeLiving } from './ascendancy-rule-values.mjs';

/** 전투 틱마다: 식은 땅과 이끼를 치우고, 때가 된 이중 폭발을 터뜨린다(적중 없이 기다리던 굴림은 버린다). 주인공이 움직였는지 보고(뿌리 갑주),
 * 폭풍의 눈의 번개를 떨어뜨린다. */
export function* ascendNodeTick(env, owner, pStats, now) {
    env.cracks = env.cracks.filter(crack => crack.until > now);
    env.mosses = env.mosses.filter(moss => moss.until > now);
    ascendNodeNoteStillness(env, owner, now);
    ascendNodeFillSap(env, owner, pStats);
    if (env.deps.hasKeystone('sa8', owner) && now >= env.stormAt) yield* ascendNodeStrikeStorm(env, owner, pStats, now);
    if (!env.echoes.length) return;
    const due = env.echoes.filter(echo => echo.at && echo.at <= now);
    env.echoes = env.echoes.filter(echo => !due.includes(echo) && (echo.at || now - echo.rolledAt < env.ECHO_WAIT_MS));
    for (const echo of due) yield* ascendNodeBurst(env, owner, echo, pStats);
}

/** 뿌리 갑주(gw6): 주인공의 자리가 바뀌거나 이동 스킬로 움직이는 중이면 다시 센다. */
export function ascendNodeNoteStillness(env, owner, now) {
    const at = owner.gridPlayer || {};
    const moving = typeof env.deps.mobilitySkill === 'object' && env.deps.mobilitySkill.moving();
    if (moving || env.still.gx !== at.gx || env.still.gy !== at.gy) env.still = { gx: at.gx, gy: at.gy, since: now };
}

/** 폭풍의 눈(sa8): calmCells칸 안의 적마다 기본 타격 피해의 stormPct%로 번개가 떨어지고 감전 판정을 한다. */
export function* ascendNodeStrikeStorm(env, owner, pStats, now) {
    env.stormAt = now + ascendNodeValue(env, 'sa8').stormEveryMs;
    if (!owner.gridPlayer) return;
    const shockStats = { ...pStats, sSkill: { ...(pStats.sSkill || {}), ele: 'light' } };
    const targets = (owner.enemies || []).filter(enemy => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy) && env.deps.getGridUnitDistance(owner.gridPlayer, enemy) <= ascendNodeValue(env, 'sa8').calmCells);
    for (const enemy of targets) {
        const dealt = env.deps.applyDamageToEnemyResource(enemy, ascendNodeMitigatedBlow(env, owner, pStats, enemy, 'light', ascendNodeValue(env, 'sa8').stormPct));
        (yield { kind: 'ascendancyFx', args: ['hit', { enemyId: enemy.id, color: env.deps.getElementColor('light'), damage: dealt, duration: 240, element: 'light', syncToSwing: false }] });
        if (enemy.hp > 0) env.deps.applyEnemyAilmentFromHit(enemy, shockStats, dealt, false);
        else env.deps.handleEnemyDeath(enemy, pStats);
    }
}

/** 두 번째 폭발: 처음 맞은 적과 그 둘레 한 칸의 적이 처음 받은 피해(가까운 적중 가운데 큰 값)를 한 번 더 받는다. */
export function* ascendNodeBurst(env, owner, echo, pStats) {
    const element = echo.hits[0].element;
    const first = (owner.enemies || []).find(enemy => ascendNodeLiving(enemy) && enemy.id === echo.hits[0].enemyId);
    if (first) (yield { kind: 'ascendancyFx', args: ['statusText', { enemyId: first.id, text: env.deps._t('이중 폭발'), color: '#ffb36b', duration: 700 }] });
    const targets = (owner.enemies || []).filter(enemy => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy));
    for (const enemy of targets) {
        const damage = echo.hits.reduce((best, hit) => (env.deps.getGridUnitDistance(hit, enemy) <= 1 ? Math.max(best, hit.damage) : best), 0);
        if (damage <= 0) continue;
        const dealt = env.deps.applyDamageToEnemyResource(enemy, damage);
        (yield { kind: 'ascendancyFx', args: ['hit', { enemyId: enemy.id, color: env.deps.getElementColor(element), damage: dealt, duration: 260, element, syncToSwing: false }] });
        if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
    }
}
