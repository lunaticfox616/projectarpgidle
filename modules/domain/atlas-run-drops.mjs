import { atlasSessionNotify } from './atlas-run-events.mjs';

/** 처치 전리품(grantEnemyLoot의 보관 안): 지도석 · 각인 드롭, 그리고 콘텐츠 방을 비운 처치면 그 방의 보상.
 * 맵 안의 지도석 · 각인은 보스를 잡을 때까지 런이, 방 보상 재화는 넓은 맵 전리품 보관이 들고 있다. */
export function* atlasSessionOnKill(env, owner, enemy) {
    const zone = env.deps.getZone(owner.currentZoneId);
    const dice = env.deps.atlasBoard.onKill(owner, enemy, zone);
    if (dice) (yield { kind: 'atlasSessionEffectQueueImportantSave', args: [220] });   // 알림 없이 쌓인다(2026-11-10 사용자)
    (yield* atlasSessionGiveBearerOmen(env, enemy));
    (yield { kind: 'atlasSessionEffectGrantAtlasFinds', args: [zone, enemy] });
    const maps = env.deps.atlas.dropFromKill(owner, zone, enemy), fragments = env.deps.atlas.fragmentFromKill(owner, zone, enemy);
    const room = zone && zone.type === 'atlasMap' && owner.atlas.run ? atlasSessionEmptyRoom(env, owner, enemy) : null;
    const rewards = room ? (yield* atlasSessionClearRoom(env, owner, zone, room, maps)) : [];
    // 깨어난 뒤에는 제단의 잉걸 · 허기의 즙과 리그 조각도(보스를 잡을 때까지 런이 들고 있다, js/atlas-endgame.js).
    const late = room ? env.deps.atlasEndgame.roomItems(owner, zone, room) : [];
    if (!maps.length && !fragments.length && !room) return;
    (yield* atlasSessionNotify(env, { kind: 'drops', maps: maps.map(map => ({ node: map.node, tier: map.tier, rarity: map.rarity })), fragments, room, rewards, late,
        golden: env.deps.atlasEncounters.isGolden(zone, room) }));
}

/** A slain omen bearer's omen (js/atlas-endgame.js markOmenBearer): into the kill's spoils, with a notice. */
export function* atlasSessionGiveBearerOmen(env, enemy) {
    const omen = env.deps.atlasEndgame.takeOmen(enemy);
    if (!omen || !(yield { kind: 'atlasSessionEffectAwardEnemyLootCurrency', args: [omen, 1] })) return;
    (yield* atlasSessionNotify(env, { kind: 'omen', key: omen }));
    (yield { kind: 'atlasSessionEffectQueueImportantSave', args: [220] });
}

/** A kill that empties an ordinary room: the room stays empty for the rest of the map; a content room names its reward. */
export function atlasSessionEmptyRoom(env, owner, enemy) {
    const pack = env.deps.atlasEncounters.emptiedPack(owner, enemy);
    if (!pack || pack.stage !== null || pack.objectId) return null;
    env.deps.atlas.markCleared(owner, pack.roomId);
    return Object.hasOwn(env.deps.ATLAS.encounters, pack.encounter || '') ? pack.encounter : null;
}

export function* atlasSessionClearRoom(env, owner, zone, room, maps) {
    const rewards = env.deps.atlasEncounters.rewards(zone, room, owner.atlas.run.bonus, Math.random);
    for (const [key, amount] of rewards) (yield { kind: 'atlasSessionEffectAwardEnemyLootCurrency', args: [key, amount] });
    if (Math.random() < env.deps.ATLAS.encounters[room].mapChance) maps.push(...env.deps.atlas.extraMap(owner));
    // 묘목장(12번 루프 39): 그 지역 색의 씨앗(그루터기 함 보관함으로, 소식은 그 함이 알린다). 묘목장 보상 패시브와
    // 황금 방이 하나씩 더 준다(js/atlas-encounters.js nurseryGifts).
    if (room === 'nursery' && typeof env.deps.stumpNursery === 'object') (yield* atlasSessionGiveNurseryGifts(env, owner, zone));
    return rewards;
}

export function* atlasSessionGiveNurseryGifts(env, owner, zone) {
    const gifts = env.deps.atlasEncounters.nurseryGifts(zone, owner.atlas.run.bonus, Math.random);
    for (let i = 0; i < gifts; i++) (yield { kind: 'atlasSessionEffectGrantNurseryGift', args: [owner, zone] });
}

/** 혼돈 20 · 심화 클리어(onChaos20Cleared): 아틀라스가 처음 열리거나 이번 루프의 첫 지도석이 들어온다. */
export function* atlasSessionOnChaos20(env, owner) {
    const opened = !owner.atlas.unlocked;
    const maps = env.deps.atlas.sync(owner);
    if (opened || maps.length) (yield* atlasSessionNotify(env, { kind: 'starter', opened, count: maps.length }));
}
