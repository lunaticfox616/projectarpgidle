/** Inventory rules and committed server changes. No DOM, network or implicit current game. */
export class EquipmentHallRules {
    constructor(deps) {
        this.deps = deps;
        this.itemRules = [
            [item => !Number.isFinite(Number(item.id)) || deps.bagItems.isSpecial(item), '전시할 수 없는 장비입니다.'],
            [item => !['rare', 'unique'].includes(item.rarity) || !(item.baseId || item.baseName), '희귀, 고유 장비만 전시할 수 있습니다.'],
            [item => item.locked, '잠근 장비는 전시할 수 없습니다.'],
            [item => item.tradeLocked || item.hallReplica || item.hallRelistBlocked, '전당 복제품이나 거래가 막힌 장비는 전시할 수 없습니다.'],
            [item => this.hasSocketedHallJewel(item), '소켓에 주얼이나 성장 아이템을 끼운 장비는 전시할 수 없습니다.'],
            [item => typeof deps.equipmentLoadoutRuntime !== 'undefined' && deps.equipmentLoadoutRuntime.isReferenced(item), '장비 세팅에 들어 있는 장비는 전시할 수 없습니다.']
        ];
    }

    hasSocketedHallJewel(item) {
        return this.deps.equipmentSockets.jewels(item).length > 0 || this.deps.equipmentSockets.harvests(item).length > 0;
    }

    hallItemIssue(item) {
        const rule = item ? this.itemRules.find(([fails]) => fails(item)) : this.itemRules[0];
        return rule ? (0, this.deps._t)(rule[1]) : '';
    }

    take(itemKey) {
        return state => { state.inventory = (state.inventory || []).filter(row => row && row.tradeKey !== itemKey); };
    }

    /** One migrated item/local id per committed transaction. Each saved snapshot gets its own copy.
     * liveState is supplied after the replay has settled, rather than captured before the network request. */
    receive(serverItem) {
        let item = null;
        return (state, liveState) => {
            item = item || (0, this.deps.normalizeItem)({ ...JSON.parse(JSON.stringify(serverItem)), id: (0, this.deps.nextItemId)() });
            state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
            if (state.inventory.some(row => row && row.tradeKey === item.tradeKey)) return;
            state.inventory.push(state === liveState ? item : JSON.parse(JSON.stringify(item)));
        };
    }

    /** Apply the paid delta, preserving currency earned/spent while the request was pending. */
    pay(price) {
        return state => {
            if (state.currencies) state.currencies.goldenRule = Math.max(0, (Number(state.currencies.goldenRule) || 0) - price);
        };
    }
}

export function hallTradeStates(game, pendingReplay) {
    return [game, pendingReplay].filter(Boolean)
        .flatMap(state => state.woodsmanBuildLock && state.woodsmanBuildSnapshot ? [state, state.woodsmanBuildSnapshot] : [state]);
}

export function hallReplayBusyReason(replay) {
    return replay.snapshot || replay.processing || replay.failed ? '방치 전투 정산을 마친 뒤 이용해 주세요.' : '';
}

/** A loop may not discard gear while this account still holds originals in the hall. */
export function getHeldHallLoopBlockReason(hall, userId, translate) {
    const data = hall?.data;
    if (!data || !userId || hall.dataUserId !== userId) return '';
    const shown = (Array.isArray(data.mine) ? data.mine : []).filter(row => row && ['open', 'sold_out'].includes(row.status)).length;
    return shown ? translate('장비 전당에 전시한 원본 {shown}개가 남아 있습니다. 거래 → 장비 전당에서 회수한 뒤 루프를 진행하세요.', { shown }) : '';
}
