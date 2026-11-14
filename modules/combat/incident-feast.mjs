import { incidentRule, incidentDraw, incidentOften, incidentTell, incidentNote } from '../combat/incident-common.mjs';
import { incidentDressCritter } from '../combat/incident-critters.mjs';

/** 황금 수액 잔치: 그 방의 보통 몬스터가 모두 금빛 수액 슬라임이 된다(무지갯빛은 critter.rainbow.chance대로). 아틀라스 지도에서는
     * 열리지 않는다(무리가 슬라임만 남으면 그 방을 비우는 셈과 콘텐츠 방 보상이 없다). 잔치의 금빛 슬라임은 저마다 알리지 않고 처음 본
     * 때가 지금이다(무지갯빛은 따로 알리고 영웅이 잠근다). 열렸는지. */
export function* incidentFeast(env, run, enemies, key) {
    const C = incidentRule(env).critter, guests = (env.deps.getZone(env.owner.currentZoneId) || {}).type === 'atlasMap' ? [] : enemies.filter(enemy => incidentFeastable(run, enemy));
    if (!guests.length) return false;
    guests.forEach((enemy, index) => {
        const rainbow = incidentDraw(env, 'rainbow', `feast:${key}:${index}`) < C.rainbow.chance * incidentOften(env);
        Object.assign(incidentDressCritter(env, enemy, rainbow), { asleep: false, feast: true, critterSeenAt: rainbow ? 0 : env.deps.getCombatTime() });
    });
    (yield* incidentTell(env.deps._t('황금 수액 잔치가 열렸습니다. 이 방의 몬스터가 모두 금빛 수액 슬라임이 되었습니다.'), 'chase', true));
    (yield* incidentNote(env, 'feast'));
    return true;
}

/** 잔치에 드는 몬스터: 정예도 슬라임도 아니고, 방 단위 무대의 무리이되 조우, 구출, 보물, 붙박이 무리가 아니다. */
export function incidentFeastable(run, enemy) {
    const pack = !enemy.isElite && !enemy.critter && enemy.explorationPack ? run.packs.find(row => row.key === enemy.explorationPack) : null;
    return !!pack && pack.stage === null && !pack.encounter && !pack.anchor && !pack.rescue && !pack.treasure;
}
