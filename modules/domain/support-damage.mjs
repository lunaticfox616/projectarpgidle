// Support-owned damage records only. The combat executor owns damage, kills, rewards and visual effects.
export function rememberSupportHit(enemy, stats, damage, readClock) {
    if (damage <= 0) return;
    enemy.supportDeathSource = stats;
    const fx = stats.sSkill.supportEffects?.dot;
    if (!fx || enemy.hp <= 0) return;
    const now = readClock(), rows = enemy.supportDots || [];
    rows.push({ remaining: damage * fx.damagePct / 100, pending: 0, until: now + fx.durationMs, at: now, stats, element: stats.sSkill.ele });
    enemy.supportDots = rows;
}

function advanceDot(row, now) {
    const end = Math.min(now, row.until), span = row.until - row.at;
    if (end <= row.at || span <= 0) return null;
    const damage = row.remaining * (end - row.at) / span;
    row.remaining -= damage;
    row.at = end;
    row.pending = (row.pending || 0) + damage;
    const whole = Math.floor(row.pending);
    row.pending -= whole;
    return whole;
}

/** Consume immediately, applying each yielded hit and its deaths before requesting the next.
 * The snapshot excludes newly spawned enemies; live HP checks include preceding corpse effects.
 * now, at and until are combat milliseconds. Fractional damage stays in the existing pending bank. */
export function* supportDotContacts(enemies, now) {
    for (const enemy of enemies.slice()) {
        for (const row of enemy.supportDots || []) {
            if (enemy.hp <= 0) break;
            const damage = advanceDot(row, now);
            if (damage !== null) yield { enemy, row, damage };
        }
        enemy.supportDots = (enemy.supportDots || []).filter(row => row.until > now && row.remaining > 0);
    }
}

function* corpseTargets(enemy, enemies, distance) {
    for (const other of enemies) {
        if (other.hp <= 0 || distance(enemy, other) > 2) continue;
        yield other;
    }
}

/** The caller applies mitigation and each death between targets. Roll once only when a corpse rule exists. */
export function planCorpseExplosion(enemy, enemies, inputs) {
    const stats = enemy.supportDeathSource, fx = stats?.sSkill?.supportEffects?.corpse;
    if (!fx || inputs.random() * 100 >= fx.chancePct) return null;
    const source = { ...stats, sSkill: { ...stats.sSkill, supportEffects: { ...stats.sSkill.supportEffects, corpse: null } } };
    return { source, lifePct: fx.lifePct, targets: corpseTargets(enemy, enemies.slice(), inputs.distance) };
}
