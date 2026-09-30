// 장비 소켓(2026-09-30, 주얼 창을 대신함): 주얼은 장비의 소켓에만 낀다. 반지 · 목걸이 · 허리띠에는 공허 소켓이 처음부터
// 뚫려 있고, 다른 부위는 공허의 끌 1개로 한 칸을 뚫는다. 심연 소켓은 고유 장비의 효과 그대로다.
// 뺀 주얼은 보관함으로 돌아간다(보관함이 가득 차면 뺄 수 없다). 능력치 합산은 combat-build-stats.js, 화면은 equipment-sockets-ui.js.
const equipmentSockets = (() => {
    const BUILT_IN_SLOTS = new Set(['반지', '목걸이', '허리띠']);
    const SOCKETABLE_SLOTS = new Set(['무기', '투구', '갑옷', '방패', '장갑', '신발', '반지', '목걸이', '허리띠']);
    const LOCK_REASON = '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';

    function baseSlot(item) {
        return String((item && item.slot) || '').replace(/[123]$/, '');
    }

    function isSocketable(item) {
        return !!item && SOCKETABLE_SLOTS.has(baseSlot(item));
    }

    function hasBuiltInSocket(item) {
        return BUILT_IN_SLOTS.has(baseSlot(item));
    }

    function hasVoidSocket(item) {
        return isSocketable(item) && (hasBuiltInSocket(item) || !!(item.voidSocket && item.voidSocket.open));
    }

    /** Every socket of the item in display order: its void socket, then the abyss sockets of socketed uniques. */
    function list(item) {
        if (!item) return [];
        const rows = hasVoidSocket(item) ? [{ kind: 'void', index: 0, jewel: (item.voidSocket && item.voidSocket.jewel) || null }] : [];
        ensureAbyssSockets(item);
        const abyss = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
        abyss.forEach((socket, index) => rows.push({ kind: 'abyss', index, jewel: (socket && socket.jewel) || null }));
        return rows;
    }

    function canChisel(item) {
        return isSocketable(item) && !hasVoidSocket(item) && !item.fusedRelic;
    }

    function chisel(item, state = game) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        if (!canChisel(item)) return { ok: false, reason: '이 장비에는 공허 소켓을 더 뚫을 수 없습니다.' };
        if ((state.currencies.voidChisel || 0) <= 0) return { ok: false, reason: '공허의 끌이 부족합니다.' };
        state.currencies.voidChisel -= 1;
        item.voidSocket = { open: true, jewel: null };
        return { ok: true };
    }

    // A built-in socket exists before any jewel was ever placed, so its record is created on first use.
    function socketRecord(item, kind, index) {
        if (kind === 'abyss') return (Array.isArray(item.abyssSockets) && item.abyssSockets[index]) || null;
        if (!hasVoidSocket(item)) return null;
        if (!item.voidSocket || !item.voidSocket.open) item.voidSocket = { open: true, jewel: null };
        return item.voidSocket;
    }

    /** Moves a stored jewel into the item's first empty socket. */
    function insert(item, jewelId, state = game) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const store = state.jewelInventory || [];
        const index = store.findIndex(jewel => jewel && jewel.id === jewelId);
        const empty = list(item).find(row => !row.jewel);
        if (index < 0) return { ok: false, reason: '보관함에 없는 주얼입니다.' };
        if (!empty) return { ok: false, reason: '빈 소켓이 없습니다.' };
        const [jewel] = store.splice(index, 1);
        socketRecord(item, empty.kind, empty.index).jewel = jewel;
        return { ok: true, jewel };
    }

    function remove(item, kind, index, state = game) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const record = item ? socketRecord(item, kind, index) : null;
        if (!record || !record.jewel) return { ok: false, reason: '빈 소켓입니다.' };
        state.jewelInventory = state.jewelInventory || [];
        if (state.jewelInventory.length >= getJewelInventoryLimit()) return { ok: false, reason: '주얼 보관함이 가득 찼습니다.' };
        const jewel = record.jewel;
        record.jewel = null;
        state.jewelInventory.push(jewel);
        return { ok: true, jewel };
    }

    return Object.freeze({ isSocketable, hasBuiltInSocket, hasVoidSocket, list, canChisel, chisel, insert, remove });
})();
safeExposeGlobals({ equipmentSockets });
