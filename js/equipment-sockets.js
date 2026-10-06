// 장비 소켓(2026-09-30, 주얼 창을 대신함): 주얼은 장비의 소켓에만 낀다. 심연 소켓은 고유 장비의 효과 그대로다.
// 공허 소켓(2026-10-07 사용자 요청, 예전에는 장신구에 늘 뚫려 있었다): 장신구(반지, 목걸이, 허리띠)에만 생긴다. 주얼을 해금한 뒤
// 드물게 뚫린 채 떨어지고(data/items.js SOCKETED_ACCESSORY_DROP_CHANCE), 공허의 끌 1개로 뚫는다. 그 전부터 갖고 있던 장신구는
// 처음부터 있던 소켓을 기록으로 남겨 그대로 쓴다(js/save-migrations.js keepLegacyAccessorySockets).
// 타락 소켓(2026-10-05, 2026-10-07): 잿불가지 타락이 어느 부위에나 소켓을 하나 연다(item.corruptionSocket, 장비당 최대 1개).
// 장신구가 아닌 부위에는 이것이 유일한 소켓이다. 주얼을 해금한 뒤에만 나오는 결과다(js/passives.js canApplyTaintedOutcome).
// 뺀 주얼은 보관함으로 돌아간다(보관함이 가득 차면 뺄 수 없다). 능력치 합산은 combat-build-stats.js, 화면은 equipment-sockets-ui.js.
// 주얼을 읽는 곳은 모두 jewels(item)을 써서 소켓 종류가 늘어도 빠지는 곳이 없게 한다.
const equipmentSockets = (() => {
    const ACCESSORY_SLOTS = new Set(['반지', '목걸이', '허리띠']);
    const SOCKETABLE_SLOTS = new Set(['무기', '투구', '갑옷', '방패', '장갑', '신발', '반지', '목걸이', '허리띠']);
    const LOCK_REASON = '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';

    function baseSlot(item) {
        return String((item && item.slot) || '').replace(/[123]$/, '');
    }

    function isSocketable(item) {
        return !!item && SOCKETABLE_SLOTS.has(baseSlot(item));
    }

    /** Rings, amulets and belts: the only slots a void socket opens on. */
    function isAccessory(item) {
        return ACCESSORY_SLOTS.has(baseSlot(item));
    }

    function hasVoidSocket(item) {
        return isSocketable(item) && !!(item.voidSocket && item.voidSocket.open);
    }

    const jewelsUnlocked = () => typeof contentProgression === 'object' && contentProgression.isUnlocked('jewel');

    /** Sockets as stored, without creating any: void, the corruption socket, then abyss sockets. A jewel left in a void record is
     * listed even when the record lost its open flag, so no reader can let it go with the item. */
    function storedRows(item) {
        const voidJewel = (item.voidSocket && item.voidSocket.jewel) || null;
        const rows = hasVoidSocket(item) || voidJewel ? [{ kind: 'void', index: 0, jewel: voidJewel }] : [];
        if (item.corruptionSocket) rows.push({ kind: 'corrupt', index: 0, jewel: item.corruptionSocket.jewel || null });
        const abyss = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
        abyss.forEach((socket, index) => rows.push({ kind: 'abyss', index, jewel: (socket && socket.jewel) || null }));
        return rows;
    }

    /** Every socket of the item in display order: its void socket, the corruption socket, then the abyss sockets of socketed uniques. */
    function list(item) {
        if (!item) return [];
        ensureAbyssSockets(item);
        return storedRows(item);
    }

    /** The jewels sitting in the item's sockets ({kind, index, jewel}); reads only, never opens a socket. */
    function jewels(item) {
        return item ? storedRows(item).filter(row => row.jewel) : [];
    }

    /**
     * Before an item is destroyed (salvage, a chance orb): every socketed jewel goes back to the jewel store, past its limit if
     * need be, the way protected rare drops do — the player's jewel is never lost with the item.
     * @returns {number} jewels returned
     */
    function returnJewels(item, state = game) {
        const rows = jewels(item);
        state.jewelInventory = state.jewelInventory || [];
        rows.forEach(row => {
            state.jewelInventory.push(row.jewel);
            socketRecord(item, row.kind, row.index).jewel = null;
        });
        return rows.length;
    }

    function count(item) {
        return item ? storedRows(item).length : 0;
    }

    function label(row) {
        if (row.kind === 'void') return '공허 소켓';
        return row.kind === 'corrupt' ? '타락 소켓' : `심연 소켓 ${row.index + 1}`;
    }

    /** A corruption may open one socket on any socketable item: beside an accessory's void socket, or the only socket elsewhere. */
    function canAddCorruptionSocket(item) {
        return isSocketable(item) && !item.corruptionSocket && !item.fusedRelic;
    }

    function addCorruptionSocket(item) {
        if (!canAddCorruptionSocket(item)) return false;
        item.corruptionSocket = { jewel: null };
        return true;
    }

    function canChisel(item) {
        return isAccessory(item) && !hasVoidSocket(item) && !item.fusedRelic;
    }

    /** Opens the void socket; the caller has already paid for it (the chisel here, the cube recipe in stump-cube.js) or it dropped so. */
    function openVoidSocket(item) {
        if (!canChisel(item)) return false;
        item.voidSocket = { open: true, jewel: null };
        return true;
    }

    /** A dropped accessory comes with its void socket open on SOCKETED_ACCESSORY_DROP_CHANCE of drops, once jewels are unlocked. */
    function rollDropSocket(item) {
        if (!isAccessory(item) || !jewelsUnlocked() || Math.random() >= SOCKETED_ACCESSORY_DROP_CHANCE) return false;
        return openVoidSocket(item);
    }

    /** Before 2026-10-07 every accessory had a void socket of its own: an old save's accessory keeps it as an open record (once). */
    function keepLegacySocket(item) {
        if (!item || typeof item !== 'object' || !isAccessory(item) || hasVoidSocket(item)) return false;
        item.voidSocket = { open: true, jewel: (item.voidSocket && item.voidSocket.jewel) || null };
        return true;
    }

    function chisel(item, state = game) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        if (!isAccessory(item)) return { ok: false, reason: '공허 소켓은 반지, 목걸이, 허리띠에만 뚫을 수 있습니다. 다른 장비는 타락으로만 소켓이 생깁니다.' };
        if (!canChisel(item)) return { ok: false, reason: '이 장비에는 공허 소켓을 더 뚫을 수 없습니다.' };
        if ((state.currencies.voidChisel || 0) <= 0) return { ok: false, reason: '공허의 끌이 부족합니다.' };
        state.currencies.voidChisel -= 1;
        openVoidSocket(item);
        return { ok: true };
    }

    function socketRecord(item, kind, index) {
        if (kind === 'abyss') return (Array.isArray(item.abyssSockets) && item.abyssSockets[index]) || null;
        if (kind === 'corrupt') return item.corruptionSocket || null;
        return voidRecord(item);
    }

    /** The open void socket's record, or a closed record that still holds a jewel (so it can come out), or null. */
    function voidRecord(item) {
        if (hasVoidSocket(item)) return item.voidSocket;
        return item.voidSocket && item.voidSocket.jewel ? item.voidSocket : null;
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

    return Object.freeze({ isSocketable, isAccessory, hasVoidSocket, list, jewels, returnJewels, count, label, canChisel, openVoidSocket,
        rollDropSocket, keepLegacySocket, canAddCorruptionSocket, addCorruptionSocket, chisel, insert, remove });
})();
safeExposeGlobals({ equipmentSockets });
