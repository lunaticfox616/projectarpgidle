import { PLAYER_HIT_SCALE_LABELS } from '../combat/core-values.mjs';

export function coreFormatNumberKR(env, value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString(env.deps.i18n.locale);
}

/** The damage owner has already applied each hit and its death callback. */
export function coreCorpseExplosionLine(env, reached, splash, label, noun) {
    const who = reached.length === 1 ? reached[0] : env.deps._t('적 {length}마리', { length: reached.length });
    return env.deps._t('💥 {label} {who}에게 {splash} {noun}', {
        label: env.deps.withDirectionParticle(label), who, splash: coreFormatNumberKR(env, splash), noun
    });
}

export function* coreAddEvasionCombatLog(env, target, isPlayer) {
    if (env.owner.settings && env.owner.settings.showCombatLog === false) return;
    let targetName = String(target && target.name ? target.name : '적');
    let isWoodsman = !isPlayer && coreEvasionIsWoodsman(target, targetName);
    const message = coreEvasionLine(env, targetName, isPlayer, isWoodsman);
    let aggregateKey = isPlayer ? 'combat:evasion:player' : (isWoodsman ? 'combat:evasion:woodsman' : `combat:evasion:enemy:${targetName}`);
    (yield { kind: 'addLog', args: [message, isPlayer ? 'loot-magic' : 'attack-monster', {
        noToast: true,
        aggregateKey: aggregateKey,
        aggregateWindowMs: 450
    }] });
}

function coreEvasionIsWoodsman(target, name) {
    return name.includes('나무꾼') || (target && target.zoneType === 'outsideChaos');
}

function coreEvasionLine(env, targetName, isPlayer, isWoodsman) {
    if (isPlayer) return env.deps._t('🌀 플레이어 회피');
    return isWoodsman ? env.deps._t('🪓 나무꾼 회피') : env.deps._t('🌀 {name} 회피', { name: targetName });
}

/** Who a player hit landed on: the one enemy's name, or how many when it spread over several. */
export function coreGetPlayerHitTargetLabel(env, summary) {
    let count = summary.uniqueTargets.size;
    return count >= 2 ? env.deps._t('적 {count}마리', { count }) : (summary.targetName || '적');
}

/** Damage scales for the detailed hit line: the flat life bonus, then the regen and fire resistance multipliers the skill shows. */
export function coreGetPlayerHitScaleText(env, pStats) {
    let scales = pStats.damageScales || {};
    let hidden = Array.isArray(pStats.sSkill.hideCombatScales) ? pStats.sSkill.hideCombatScales : [];
    let labels = PLAYER_HIT_SCALE_LABELS.filter(([key]) => !hidden.includes(key) && (scales[key] || 1) > 1.0001)
        .map(([key, label]) => `${label}x${(scales[key] || 1).toFixed(2)}`);
    if ((scales.hpFlatBonus || 0) > 0) labels.unshift(env.deps._t('생명력추가+{floor}', { floor: Math.floor(scales.hpFlatBonus) }));
    return labels.length > 0 ? env.deps._t('계수 {labels}', { labels: labels.join(', ') }) : '';
}

/** DoT stack note for the detailed hit line: the deepest stack among the hit enemies and its multiplier. */
export function coreGetPlayerHitDotStackText(env, targets) {
    let deepest = targets.reduce((max, row) => Math.max(max, (row.enemy && row.enemy.dotStacks) || 0), 0);
    return deepest > 0 ? env.deps._t('도트중첩 {deepest}/{DOT_STACK_MAX} ({deepest2}x)', { deepest, DOT_STACK_MAX: env.deps.DOT_STACK_MAX, deepest2: env.deps.getDotStackMultiplier(deepest).toFixed(2) }) : '';
}

/** Instant leech for the detailed hit line: two decimals below 1, one below 10, whole numbers above. */
export function coreFormatPlayerHitLeech(value) {
    if (value < 1) return value.toFixed(2);
    return value < 10 ? value.toFixed(1).replace(/\.0$/, '') : `${Math.floor(value)}`;
}

/** The detailed hit line's extra parts (설정의 상세 피해 기록), in reading order. */
export function coreGetPlayerHitDetailParts(env, summary, hit) {
    let parts = [];
    if (summary.totalHits >= 2) parts.push(`${summary.totalHits}히트`);
    if (hit.isDotSkill) parts.push('직격', coreGetPlayerHitDotStackText(env, hit.targets));
    parts.push(coreGetPlayerHitScaleText(env, hit.pStats));
    if (hit.instantLeechRecovered > 0) parts.push(`즉시흡수 +${coreFormatPlayerHitLeech(hit.instantLeechRecovered)}`);
    return parts.filter(Boolean);
}

/** The player's hit line: skill, target and total damage ("이중 베기로 썩은 잔뿌리에게 1,033 피해"), the counterpart of the monster's
 * "○○의 공격으로 N 피해". 2026-10-06 user: "플레이어가 준 피해도 누구한테 준건지 표시됐으면 좋겠고". A critical hit keeps the line
 * colour and hands its number to the log, which colours only that ("치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"). Repeats merge
 * per target, crits apart. null when there is nothing to write (log off, or 0 damage: review 5). */
export function coreGetPlayerHitCombatLog(env, summary, hit) {
    if (!env.owner.settings.showCombatLog || summary.totalDamage <= 0) return null;
    let amount = coreFormatNumberKR(env, summary.totalDamage);
    let line = env.deps._t('{icon} {skill} {target}에게 {amount} 피해', { icon: env.deps.getDamageElementIcon(hit.swingElement), skill: env.deps.withDirectionParticle(env.deps._t(hit.skillName)), target: coreGetPlayerHitTargetLabel(env, summary), amount });
    if (env.owner.settings.showDetailedDamageLog === true) line = [line, ...coreGetPlayerHitDetailParts(env, summary, hit)].join(' / ');
    let kind = hit.isCrit ? 'combat:hit-crit' : 'combat:hit';
    let target = summary.uniqueTargets.size === 1 ? [...summary.uniqueTargets][0] : 'many';
    return { line, options: { logIcon: 'attack', critValue: hit.isCrit ? amount : '', rateKey: kind,
        minIntervalMs: hit.isCrit ? 120 : 180, aggregateKey: `${kind}:${target}`, aggregateWindowMs: 500 } };
}
