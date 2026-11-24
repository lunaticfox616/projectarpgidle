import { atlasSessionNotify } from './atlas-run-events.mjs';

/** 수호자의 뿌리 입장권, 정점의 보상은 지도가 끝난 뒤라 바로 지갑으로 간다. 일반 지도의 장비 상자는 그 자리에서 연다. */
export function* atlasSessionGrantSpoils(env, owner, result, zone) {
    if (result.board) (yield* atlasSessionGrantBoardSpoils(env, owner, result.board, zone));
    (yield* atlasSessionGrantChartSpoils(env, owner, result, zone));
    if (result.ticket) (yield { kind: 'atlasSessionEffectAwardCurrency', args: [result.ticket, 1] });
    for (const [key, amount] of result.rewards || []) (yield { kind: 'atlasSessionEffectAwardCurrency', args: [key, amount] });
    if (result.endgame) (yield* atlasSessionGrantEndgameSpoils(env, result.endgame, result.tier));
    if (result.memory && result.memory.spoils) (yield* atlasSessionGrantMemorySpoils(env, result.memory.spoils, result.tier, zone));
}

/** 천문도 일반 지도의 몫: 장비 상자와 달의 별(dewChance)이 찾은 형체 없는 이슬(별이 준 지침은 완료가 이미 보관함에 넣었다). */
export function* atlasSessionGrantChartSpoils(env, owner, result, zone) {
    if (result.gearBoxes) (yield* atlasSessionOpenGearBoxes(env, owner, result, zone));
    const dew = result.stars ? result.stars.dew : 0;
    if (dew) (yield { kind: 'atlasSessionEffectAwardCurrency', args: ['formlessDew', dew] });
}

/** 장비 상자(개편 A2, B): 지도 보스 보상을 상자 수만큼 굴리고(첫 상자가 그 지도 보스의 보상이다, js/atlas-finds.js openGearBoxes, 런의
 * 지도석 uid로 정한 굴림, 상급 상자는 희귀도 바닥 한 단계 위), 그 상자들만의 영수증(combatLootReceipts.captureApart, 지도 영수증 밖이면
 * null)을 결과 카드에 남긴다. */
export function* atlasSessionOpenGearBoxes(env, owner, result, zone) {
    const opened = (yield { kind: 'atlasSessionEffectOpenGearBoxes', args: [owner, zone, { count: result.gearBoxes, fine: result.gearFine || 0, seed: result.boxSeed }] });
    env.deps.atlas.keepBoxes(owner, opened);
}

export function* atlasSessionGrantBoardSpoils(env, owner, spoils, zone) {
    for (const [key, amount] of spoils.rewards) (yield { kind: 'atlasSessionEffectAwardCurrency', args: [key, amount] });
    for (let i = 0; i < spoils.gear; i++) {
        const item = (yield { kind: 'atlasSessionEffectGenerateEquipmentDrop', args: [{ isBoss: true }, { zone, minimumRarity: 'rare' }] });
        if (item) (yield { kind: 'atlasSessionEffectAddItemToInventory', args: [item, { guaranteedKeep: true }] });
    }
    (yield* atlasSessionNotify(env, { kind: 'board', message: owner.atlas.board.message }));
}

/** 기억 싸움의 보상: 재화는 지갑으로, 고유와 희귀 장비 하나는 가방으로(가득 차도 남긴다). 장비는 그 투기장의 지역을 기억한다
 * (루프 27부터 세계수 기운). 받은 장비는 기록이 이름을 쓰도록 spoils.items에 남긴다. */
export function* atlasSessionGrantMemorySpoils(env, spoils, tier, zone) {
    for (const [key, amount] of spoils.rewards) (yield { kind: 'atlasSessionEffectAwardCurrency', args: [key, amount] });
    const items = [];
    // 뒤바뀐 고유: 기억의 단계만큼 줄 하나가 바뀐 채로 나온다(js/item-influences.js swapUnique).
    if (spoils.unique) items.push(env.deps.itemInfluences.swapUnique((yield { kind: 'atlasSessionEffectGenerateUniqueItem', args: [tier, null, spoils.unique === 'any' ? null : spoils.unique, zone || undefined] }), spoils.tier));
    if (spoils.gear) items.push((yield { kind: 'atlasSessionEffectGenerateEquipmentDrop', args: [{ isBoss: true }, { zone, minimumRarity: 'rare' }] }));
    spoils.items = items.filter(Boolean);
    for (const item of spoils.items) (yield { kind: 'atlasSessionEffectAddItemToInventory', args: [item, { guaranteedKeep: true }] });
}

/** 후반부 보스의 보상: 재화는 지갑으로, 고유 장비는 가방으로(가득 차도 남긴다). */
export function* atlasSessionGrantEndgameSpoils(env, spoils, tier) {
    for (const [key, amount] of spoils.rewards) (yield { kind: 'atlasSessionEffectAwardCurrency', args: [key, amount] });
    if (!spoils.unique) return;
    const item = (yield { kind: 'atlasSessionEffectGenerateUniqueItem', args: [tier, null, spoils.unique] });
    if (item) (yield { kind: 'atlasSessionEffectAddItemToInventory', args: [item, { guaranteedKeep: true }] });
}
