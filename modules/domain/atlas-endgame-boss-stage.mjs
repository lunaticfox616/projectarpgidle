import { atlasLateDef } from './atlas-endgame-ledger.mjs';

// ---------------------------------------------------------------- the zone and its bosses
/** Boss multipliers on top of the node's own rules: an apostle hits harder than the map boss it replaces. */
export function atlasLateBossBoost(env, run) {
    const apostle = run && run.endgame && run.endgame.apostle;
    return apostle ? { hp: env.E.blight.hpMul, damage: env.E.blight.damageMul } : { hp: 1, damage: 1 };
}

export function atlasLateStageName(env, row, stage, echoes) {
    if (!Number.isInteger(stage.echo)) return stage.name;
    const echo = echoes[stage.echo];
    return echo ? env.deps._t('엮인 메아리: {echo}', { echo: echo[0] }) : env.deps._t('엮인 메아리: {name}', { name: row.stages[0].name });
}

/** Zone fields an apostle map or a late fight adds (names, art, stage table, floor hazard). */
export function atlasLateZoneExtras(env, run, node) {
    const extra = (run && run.endgame) || {}, apostle = env.APOSTLES.get(extra.apostle);
    // 사도가 차지한 지도는 사도의 이름과 그 액트 그림이다: 지도 보스의 몸(bossVisualId)을 쓰지 않는다
    if (node.kind === 'map' && apostle) return { bossName: apostle.name, bossAct: apostle.bossAct, bossVisualId: null, atlasApostle: apostle.id };
    const row = atlasLateDef(env, node.id);
    if (!row) return {};
    const echoes = extra.echoes || [], names = row.stages.map(stage => atlasLateStageName(env, row, stage, echoes));
    const out = { bossName: names[0], bossStageNames: names, atlasStages: row.id, atlasEchoes: echoes };
    // 투기장의 장판: 시련 함정 양식으로 예고한 뒤 그 원소의 지대로 남는다(js/combat-enemy-turn.js resolveTrialHazardImpact, COMBAT_GRID_CONFIG.ground).
    const arena = env.E.arenas[node.id];
    if (arena) Object.assign(out, { trialHazard: { ...env.E.arenaHazard, persistent: true },
        trapElements: [arena.element], trapName: env.deps.COMBAT_GRID_CONFIG.ground[arena.element].name });
    return out;
}

/** The stage's picture: a league boss with its own sheet (the beehive queen) draws it, the rest an act boss's art. */
export function atlasLateApplyStageBody(env, enemy, row, art) {
    if (row.bodyVisual) return Object.assign(enemy, { monsterVisualId: row.bodyVisual, spriteVariantId: null, monsterArchetype: null, bossAssetKey: env.deps.ACT_BOSS_ASSET_KEYS[art] || null });
    enemy.monsterVisualId = null;
    enemy.bossAssetKey = env.deps.ACT_BOSS_ASSET_KEYS[art] || enemy.bossAssetKey;
    return enemy;
}

/** Whose picture a stage draws: an echo draws the witnessed boss's own sheet when it has one (2026-10-07 review: the weaver's echo
 * of the beehive queen came out as the act 9 boss), else that boss's act art. A stage of another act's boss (the apostles, the
 * deacon choir) draws that act's art (2026-10-18: they came out as the elder and the archbishop); the boss's own stages its sheet. */
export function atlasLateStageBodyRow(env, row, echo, body) {
    if (echo) return env.BODY_BY_BOSS.get(echo[0]) || {};
    return Number.isInteger(body.bossAct) && body.bossAct !== row.bossAct ? {} : row;
}

/** A late fight's stage body (js/combat-encounters.js createActExplorationPack): its own name, art and special attack; echoes are weaker copies. */
export function atlasLateTuneStage(env, enemy, zone, stage) {
    const row = atlasLateDef(env, zone.atlasStages), body = row && row.stages[stage];
    if (!body) return enemy;
    // An echo stage stays an echo (weaker, tinted) even when fewer bosses were witnessed than it has echoes (it copies the weaver then).
    const isEcho = Number.isInteger(body.echo), echo = isEcho ? (zone.atlasEchoes || [])[body.echo] : null;
    const art = echo ? echo[1] : (Number.isInteger(body.bossAct) ? body.bossAct : row.bossAct);
    enemy.name = `👿 ${zone.bossStageNames[stage]}`;
    atlasLateApplyStageBody(env, enemy, body.bodyVisual ? body : atlasLateStageBodyRow(env, row, echo, body), art);
    enemy.bossVisualTint = isEcho ? 200 : null;
    enemy.patternMode = 'apex';
    enemy.apexMechanic = body.mechanic;
    if (isEcho) { enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * env.E.witness.echoHpMul)); enemy.hp = enemy.maxHp; }
    return enemy;
}

/** Pattern state of a late boss's special (js/combat-patterns.js 'apex' mode): every n-th attack, the rest are its warning. */
export function atlasLatePatternState(env, mechanicId, attackNumber) {
    const rule = env.E.mechanics[mechanicId];
    if (!rule) return null;
    const n = Math.max(1, Math.floor(Number(attackNumber) || 1)), special = n % rule.every === 0;
    return { mode: mechanicId, patternMode: 'apex', label: rule.name,
        damageMul: special ? rule.damageMul : 1, isSpecial: special, attackNumber: n,
        telegraphKind: rule.telegraph, warningMs: env.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs, recoveryMs: 0,
        ...atlasLateComboState(env, mechanicId, rule, n, special) };
}

export function atlasLateComboState(env, id, rule, n, special) {
    const sequence = env.E.sequences[id];
    if (!sequence || !special) return {};
    const step = (Math.floor(n / rule.every) - 1 + 3) % 3, finisher = step === 2, combo = env.E.combo;
    return { label: `${rule.name}, ${['첫 수', '연계', '마무리'][step]}`, telegraphKind: sequence[step],
        warningMs: finisher ? combo.finisherWarningMs : combo.warningMs, recoveryMs: finisher ? combo.finisherRecoveryMs : combo.recoveryMs };
}
