import { TALENT_CARD_MAX_LEVEL_REF } from './tick-values.mjs';

export function* tickProcessPendingSlamEchoHits(env) {
    let now = env.deps.getCombatTime();
    let list = Array.isArray(env.owner.pendingSlamEchoHits) ? env.owner.pendingSlamEchoHits : [];
    let next = [];
    for (let i = 0, length = list.length; i < length; i++) {
        if (!(i in list)) continue;
        yield* tickProcessSlamEchoRow(env, list[i], now, next);
    }
    env.owner.pendingSlamEchoHits = next;
}

function* tickProcessSlamEchoRow(env, row, now, next) {
    if (!row || !row.enemyId || !row.at) return;
    if (row.at > now) { next.push(row); return; }
    let enemy = (env.owner.enemies || []).find(e => e && e.id === row.enemyId && e.hp > 0);
    if (!enemy) return;
    yield* tickApplySlamEchoHit(env, row, enemy);
}

function* tickApplySlamEchoHit(env, row, enemy) {
    let bonus = Math.max(1, Math.floor(row.damage || 0));
    env.deps.applyDamageToEnemyResource(enemy, bonus);
    yield { kind: 'addBattleFx', args: ['hit', { enemyId: enemy.id, color: env.deps.getElementColor(row.element || 'phys'), damage: bonus, duration: 220, syncToSwing: false }] };
    if (env.owner.settings && env.owner.settings.showCombatLog !== false) yield { kind: 'addLog', args: [env.deps._t('🌋 여진으로 {name}에게 {bonus} 추가 피해', { name: env.deps.i18n.enemyName(enemy.name), bonus: env.deps.formatNumberKR(bonus) }), 'attack-player', { noToast: true }] };
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, env.deps.getPlayerStats());
}

// 8 심문궁: 누적된 표식 피해를 5초 후 폭발(누적의 12%, 쿨타임 6초).
export function* tickProcessTalentInquisitorMarks(env) {
    let store = env.owner.talentInquisitorMarks;
    if (!store || typeof store !== 'object') return;
    let now = env.deps.getCombatTime();
    let lv = (typeof env.deps.isTalentCardActive === 'function') ? env.deps.isTalentCardActive('hero1__inquisitor') : 0;
    const timing = { now, lv };
    for (const id of Object.keys(store)) yield* tickProcessInquisitorMark(env, store, id, timing);
}

function* tickProcessInquisitorMark(env, store, id, timing) {
    let mk = store[id];
    if (!mk) { delete store[id]; return; }
    let enemy = env.deps.getAliveEnemyByRuntimeKey(id);
    if (!enemy) { delete store[id]; return; }
    if (mk.explodeAt && timing.now >= mk.explodeAt) yield* tickExplodeInquisitorMark(env, mk, enemy, timing);
}

function* tickExplodeInquisitorMark(env, mk, enemy, { now, lv }) {
    let dmg = Math.max(1, Math.floor((mk.accumulated || 0) * 0.12 * Math.max(1, lv) / TALENT_CARD_MAX_LEVEL_REF));
    env.deps.applyDamageToEnemyResource(enemy, dmg);
    yield { kind: 'addBattleFx', args: ['hit', { enemyId: enemy.id, color: env.deps.getElementColor('phys'), damage: dmg, duration: 240, syncToSwing: false }] };
    if (env.owner.settings && env.owner.settings.showCombatLog !== false) yield { kind: 'addLog', args: [env.deps._t('⚖️ 심판 표식 폭발로 {name}에게 {dmg} 피해', { name: env.deps.i18n.enemyName(enemy.name), dmg: env.deps.formatNumberKR(dmg) }), 'attack-player', { noToast: true }] };
    mk.accumulated = 0; mk.explodeAt = 0; mk.cooldownUntil = now + 6000;
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, env.deps.getPlayerStats());
}
