/** Direct shard crafting is separate from fish recipes. The caller owns presentation and saving. */
function shardBlockReason(deps, owner, item) {
    if (!item) return '아이템을 선택하세요.';
    if (!Array.isArray(item.stats) || item.stats.length === 0) return '재굴림할 수 있는 옵션 줄이 없습니다.';
    const locked = deps.equipmentCrafting.buildLockReason(owner);
    if (locked) return locked;
    if (item.corrupted) return '타락한 아이템은 더 이상 제작할 수 없습니다.';
    if (item.fusedRelic) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
    return item.rarity === 'unique' ? '고유 장비에는 쓸 수 없습니다.' : '';
}

function* shardReroll(deps, owner, item, payment) {
    const blocked = shardBlockReason(deps, owner, item);
    if (blocked) {
        yield { kind: 'oceanCraftLog', args: [blocked, 'attack-monster'] };
        return false;
    }
    const key = payment.currency || 'oceanRerollShard';
    const cost = Math.max(0, Math.floor(payment.amount || 1));
    if ((owner.currencies[key] || 0) < cost) {
        yield { kind: 'oceanCraftLog', args: [deps._t('재화가 부족합니다.'), 'attack-monster'] };
        return false;
    }
    const editable = item.stats.map((stat, i) => (stat && !stat.lockedByHoney && !stat.lockedByRift) ? i : -1).filter(i => i >= 0);
    if (editable.length === 0) {
        yield { kind: 'oceanCraftLog', args: [deps._t('재굴림할 수 있는 옵션 줄이 없습니다.'), 'attack-monster'] };
        return false;
    }
    const choice = deps.equipmentCrafting.pickReplacement(item, deps.getAvailableMods(item), editable, mods => deps.pickRandomMods(mods, 1)[0]);
    if (!choice) {
        yield { kind: 'oceanCraftLog', args: [deps._t('이 장비에서 새로 굴릴 수 있는 옵션이 없습니다.'), 'attack-monster'] };
        return false;
    }
    const maxTier = Math.max(1, Math.floor(deps.getItemCraftTier(item) || 1));
    owner.currencies[key] = (owner.currencies[key] || 0) - cost;
    item.stats[choice.index] = deps.rollAffixValue(choice.mod, maxTier, { roundInteger: true });
    deps.updateItemName(item);
    yield { kind: 'oceanShardApplied', args: [item] };
    return true;
}

export function createOceanShard(deps) {
    return Object.freeze({
        blockReason: (owner, item) => shardBlockReason(deps, owner, item),
        reroll: (owner, item, currency, amount) => shardReroll(deps, owner, item, { currency, amount })
    });
}
