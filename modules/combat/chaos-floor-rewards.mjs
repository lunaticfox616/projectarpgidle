import { enemyLifeDamagePct } from '../domain/enemy-resources.mjs';

export function* buildMaybeUnlockChaosRealmFromWoodsman(env, enemy, options) {
    if (!enemy || !enemy.isBoss) return;
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    if (!zone || zone.id !== env.deps.OUTSIDE_CHAOS_ZONE_ID) return;
    let st = env.deps.ensureChaosRealmState();
    let pct = enemyLifeDamagePct(enemy);
    st.woodsmanBestDamagePct = Math.max(st.woodsmanBestDamagePct || 0, pct);
    yield* finalizeChaosUnlock(env, st, options);
    if (options && options.log) {
        (yield { kind: 'addLog', args: [env.deps._t('🪓 나무꾼 피해율 기록: {woodsmanBestDamagePct}% / 해금 조건 10%', { woodsmanBestDamagePct: st.woodsmanBestDamagePct.toFixed(1) }), st.woodsmanBestDamagePct >= 10 ? 'season-up' : 'attack-monster'] });
    }
}

function* finalizeChaosUnlock(env, st, options) {
    if (!options || !options.finalize || st.unlocked || !(st.woodsmanBestDamagePct >= 10)) return;
    st.unlocked = true;
    st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 0));
    env.owner.noti.map = true;
    yield { kind: 'addLog', args: [env.deps._t('🌌 나무꾼의 경계가 갈라지며 혼돈계가 해금되었습니다.'), 'loot-unique'] };
}

export function* buildGrantChaosRealmFloorBonus(env, floor) {
    let st = env.deps.ensureChaosRealmState();
    let b = st.permanentBonuses;
    b.pctDmg += 0.5;
    b.move += 0.5;
    if (floor % 3 === 0) b.pctHp += 1;
    if (floor % 5 === 0) b.resChaos += 1;
    if (floor % 10 === 0) b.crit += 1;
    if (floor % 15 === 0) { b.armorPct += 10; b.evasionPct += 10; b.energyShieldPct += 10; }
    if (floor % 25 === 0) { b.critDmg += 5; b.aspd += 5; }
    const message = yield { kind: 'chaosFloorBonusMessage', args: [floor] };
    yield { kind: 'addLog', args: [message, 'loot-unique'] };
}
