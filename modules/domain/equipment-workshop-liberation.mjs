

export function* workshopLiberateEncroachment(env, owner, item) {
    if (!item || !item.encroached) return (yield { kind: 'workshopLog', args: [env.deps._t('잠식된 아이템을 선택하세요.'), 'attack-monster'] });
    if (item.encroached.liberated) return (yield { kind: 'workshopLog', args: [env.deps._t('이미 잠식 해방이 완료된 아이템입니다.'), 'attack-monster'] });
    let options = env.deps.rollEncroachmentLiberationOptions(item);
    if (!options || options.length <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('해방 가능한 최고 티어 옵션 후보가 없습니다.'), 'attack-monster'] });
    yield* workshopOpenEncroachment(owner, item, options);
}

export function* workshopOpenEncroachment(owner, item, options) {
    owner.pendingEncroachmentLiberation = { itemId: item.id };
    yield { kind: 'workshopShowLiberation', args: [item, options] };
}

export function* workshopCloseEncroachment(owner) {
    owner.pendingEncroachmentLiberation = null;
    yield { kind: 'workshopHideLiberation', args: [] };
}

function findEncroachmentItem(owner, itemId) {
    let item = (owner.inventory || []).find(v => v && v.id === itemId);
    if (!item) {
        let equipMatch = Object.entries(owner.equipment || {}).find(([, eq]) => eq && eq.id === itemId);
        if (equipMatch) item = equipMatch[1];
    }
    return item;
}

export function* workshopConfirmEncroachment(env, owner, pickIdx) {
    let pending = owner.pendingEncroachmentLiberation;
    if (!pending) return;
    let item = findEncroachmentItem(owner, pending.itemId);
    if (!item || !item.encroached || item.encroached.liberated) { yield* workshopCloseEncroachment(owner); return; }
    let options = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions : [];
    let idx = Math.floor(Number(pickIdx) || 0);
    if (idx < 0 || idx >= options.length) return;
    let chosen = { ...options[idx], encroachedFinal: true, encroachedCandidate: false };
    item.encroached.liberated = true;
    item.encroached.chosen = chosen;
    item.encroached.pendingOptions = [];
    yield* workshopCloseEncroachment(owner);
    (yield { kind: 'workshopLog', args: [env.deps._t('🕳️ 잠식 해방 완료: {value} +{value2} 확정', { value: env.deps._t(chosen.statName || env.deps.getStatName(chosen.id)), value2: env.deps.formatValue(chosen.id, chosen.val) }), 'loot-unique'] });
    (yield { kind: 'workshopRefresh', args: [] });
}
