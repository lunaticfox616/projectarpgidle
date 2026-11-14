

/** 야생 부적(루프 25+, 예전 생장 아이템 드랍 자리): 장비 드랍과 따로 굴린다. 이야기 액트 원정은 그루터기 함 드랍처럼
 * 굴리지 않는다. 알림은 그루터기 함 화면이 stump-box-changed로 남긴다. */
export function* coreRollWildTalismanDrop(env, enemy, chance) {
    if (!env.deps.talismans.wildDropsOpen(env.owner) || env.deps.actExplorationState.current(env.owner)?.act != null || env.deps.random() >= chance) return;
    const rolled = env.deps.talismans.rollWildDrop(enemy, env.deps.random);
    if (env.deps.placeFloorItem(enemy, 'talisman', rolled.talisman, rolled.overflow)) return;
    const drop = env.deps.talismans.receiveWild(env.owner, rolled);
    if (drop.item) (yield { kind: 'queueEnemyGroundLoot', args: [enemy, { item: drop.item, itemKind: 'talisman', color: env.deps.TALISMAN_RARITY_TONES[drop.item.rarity] }] });
    yield* coreAnnounceWildTalisman(env, drop);
}

/** A stored wild talisman (or its overflow shard) marks the stump box; the stump box view writes the notice. */
export function* coreAnnounceWildTalisman(env, drop) {
    if (env.owner.noti) env.owner.noti.stump = true;
    (yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-changed', { ripened: [], drop: drop.item || null, overflow: drop.currency || null }] });
}
