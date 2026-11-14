

export function acquireGetUniqueCodexKeyByItem(env, item) {
    if (!item || item.rarity !== 'unique') return null;
    if (typeof env.deps.bagItems === 'object' && env.deps.bagItems.isSpecial(item)) return null; // 고유 주얼과 고유 액막이는 도감에 없다
    return `${item.slot}|${item.name}`;
}

// 고유 아이템 획득 시 도감에 즉시 등록(아이템을 소모하지 않는 수집 기록 개념).
export function* acquireRegisterUniqueToCodexOnAcquire(env, owner, item) {
    let key = acquireGetUniqueCodexKeyByItem(env, item);
    if (!key) return false;
    owner.uniqueCodex ??= {};
    let existing = owner.uniqueCodex[key];
    // 이미 옵션까지 기록된 경우 첫 등록 기록을 유지한다(루프 리셋 후 정보만 남은 경우는 다시 채움).
    if (existing && existing.baseName) return false;
    owner.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    let firstTime = !existing;
    if (!firstTime) return true;
    owner.codexNewlyRegistered ??= {};
    owner.codexNewlyRegistered[key] = true;
    if (owner.noti) owner.noti.codex = true;
    if (!(yield { kind: 'acquisitionIsLiveOwner', args: [owner] })) return true; // Restore collection history without live UI effects during save migration.
    (yield { kind: 'acquisitionLog', args: [env.deps._t("📚 도감 신규 등록: <span class='loot-unique'>[{name}]</span>", { name: env.deps._t(item.name) }), 'loot-unique'] });
    if (env.deps.claimCodexCompletion(owner)) {
        yield { kind: 'acquisitionLog', args: [env.deps._t('📚 도감 완성! 다음 루프부터 루프마다 액트 1 고유 하나를 무작위로 받습니다.'), 'loot-unique'] };
    }
    return true;
}

export function* acquireRecordEquipmentAcquisition(env, owner, item) {
    env.deps.freshGearIds.push(item.id);
    if (env.deps.freshGearIds.length > 40) env.deps.freshGearIds.shift();
    env.deps.combatLootReceipts.item(owner,item);
    return (yield* acquireRecordUniqueAcquisition(env, owner, item));
}

export function* acquireRecordUniqueAcquisition(env, owner, item) {
    if (item.rarity !== 'unique') return false;
    (yield* acquireRegisterUniqueToCodexOnAcquire(env, owner, item));
    if (typeof env.deps.uniqueHuntRuntime === 'undefined') return true;
    let target = env.deps.uniqueHuntRuntime.complete(item, owner);
    if (!target) return true;
    (yield { kind: 'acquisitionLog', args: [env.deps._t("🎯 파밍 목표 획득: <span class='loot-unique'>[{name}]</span>", { name: env.deps._t(item.name) }), 'loot-unique', { item, toast: true }] });
    return true;
}
