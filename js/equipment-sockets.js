// 장비 소켓(2026-09-30, 주얼 창을 대신함): 주얼은 장비의 소켓에만 낀다. 심연 소켓은 고유 장비의 효과 그대로다.
// 공허 소켓(2026-10-07 사용자 요청, 예전에는 장신구에 늘 뚫려 있었다): 장신구(반지, 목걸이, 허리띠)에만 생긴다. 주얼을 해금한 뒤
// 드물게 뚫린 채 떨어지고(data/items.js SOCKETED_ACCESSORY_DROP_CHANCE), 공허의 끌 1개로 뚫는다. 그 전부터 갖고 있던 장신구는
// 처음부터 있던 소켓을 기록으로 남겨 그대로 쓴다(js/save-migrations.js keepLegacyAccessorySockets).
// 타락 소켓(2026-10-05, 2026-10-07): 잿불가지 타락이 어느 부위에나 소켓을 하나 연다(item.corruptionSocket, 장비당 최대 1개).
// 장신구가 아닌 부위에는 이것이 유일한 소켓이다. 주얼을 해금한 뒤에만 나오는 결과다(js/passives.js canApplyTaintedOutcome).
// 뺀 주얼은 가방으로 돌아간다(가방에 자리가 없으면 뺄 수 없다, js/bag-items.js). 능력치 합산은 combat-build-stats.js, 화면은 equipment-sockets-ui.js.
// 주얼을 읽는 곳은 모두 jewels(item)을 써서 소켓 종류가 늘어도 빠지는 곳이 없게 한다.
// 융합(2026-10-30 사용자, 그루터기 조합 장신구 주얼 융합): 공허 소켓의 주얼이 장비에 녹아 붙는다(voidSocket.fused). 뺄 수 없고,
// 장비가 해체되거나 바뀌면 함께 없어진다.
// 수확물 소켓(2026-11-03 사용자, data/items.js HARVEST_SOCKET_UNIQUES): 몇몇 고유의 소켓은 그루터기 함의 다 자란 꽃, 열매, 덩굴, 뿌리를 받는다.
// 장신구 고유는 늘 뚫린 공허 소켓 하나가 주얼이나 그 종류를(voidSocket.harvest), 풍작의 갑주는 종류마다 소켓 하나를(harvestSockets) 갖는다.
// 수확물은 그 사이 함을 떠나 소켓에 살고, 빼면 함 보관함으로 돌아간다(가득 차면 뺄 수 없다). 장비가 없어질 때는 가득 차도 함으로 돌아간다.
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

    /** The grown kinds a unique's sockets take ('flower', 'fruit', 'vine', 'root'), or [] for any other item. */
    const harvestKinds = item => (item && item.rarity === 'unique' && HARVEST_SOCKET_UNIQUES[item.uniqueEffectKey]) || [];
    /** A harvest unique's sockets exist from the start: the accessories' void socket is always open, the armour has one per kind. */
    function ensureHarvestSockets(item) {
        const kinds = harvestKinds(item);
        if (!kinds.length) return;
        if (isAccessory(item)) {
            if (!hasVoidSocket(item) && !item.fusedRelic) item.voidSocket = { ...(item.voidSocket || {}), open: true, jewel: (item.voidSocket && item.voidSocket.jewel) || null };
        } else if (!Array.isArray(item.harvestSockets)) item.harvestSockets = kinds.map(accepts => ({ accepts, harvest: null }));
    }

    /** Save boundary (2026-11-04, 호박석이 뿌리가 되고 덩굴이 생겼다): a socketed old 호박석 becomes a 뿌리, and the harvest armour's sockets
     * follow today's kinds in their order (data/items.js HARVEST_SOCKET_UNIQUES), each keeping what it holds. A held item no kind takes
     * keeps a socket of its own, so nothing is lost. Idempotent. */
    function migrateHarvest(item) {
        if (!item || typeof item !== 'object') return;
        if (item.voidSocket && item.voidSocket.harvest) item.voidSocket.harvest = stumpBox.currentSocketItem(item.voidSocket.harvest);
        if (!Array.isArray(item.harvestSockets)) return;
        const old = item.harvestSockets.filter(Boolean).map(socket => ({ accepts: socket.accepts === 'amber' ? 'root' : socket.accepts,
            harvest: socket.harvest ? stumpBox.currentSocketItem(socket.harvest) : null }));
        const kept = harvestKinds(item).map(accepts => old.find(socket => socket.accepts === accepts) || { accepts, harvest: null });
        item.harvestSockets = kept.concat(old.filter(socket => socket.harvest && !kept.includes(socket)));
    }

    /** Sockets as stored, without creating any: void, the corruption socket, abyss sockets, then harvest sockets. A jewel or a grown
     * item left in a void record is listed even when the record lost its open flag, so no reader can let it go with the item.
     * accepts: the grown kinds the socket takes besides (void) or instead of (harvest) a jewel. */
    function voidRows(item) {
        const record = item.voidSocket || {}, jewel = record.jewel || null, harvest = record.harvest || null;
        if (!hasVoidSocket(item) && !jewel && !harvest) return [];
        return [{ kind: 'void', index: 0, jewel, harvest, accepts: isAccessory(item) ? harvestKinds(item) : [], fused: record.fused === true }];
    }
    function storedRows(item) {
        const rows = voidRows(item);
        if (item.corruptionSocket) rows.push({ kind: 'corrupt', index: 0, jewel: item.corruptionSocket.jewel || null, harvest: null, accepts: [] });
        const abyss = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
        abyss.forEach((socket, index) => rows.push({ kind: 'abyss', index, jewel: (socket && socket.jewel) || null, harvest: null, accepts: [] }));
        const harvest = Array.isArray(item.harvestSockets) ? item.harvestSockets : [];
        harvest.forEach((socket, index) => rows.push({ kind: 'harvest', index, jewel: null, harvest: (socket && socket.harvest) || null,
            accepts: socket && socket.accepts ? [socket.accepts] : [] }));
        return rows;
    }

    /** Every socket of the item in display order: void, corruption, the abyss sockets of socketed uniques, the harvest armour's. */
    function list(item) {
        if (!item) return [];
        ensureAbyssSockets(item);
        ensureHarvestSockets(item);
        return storedRows(item);
    }

    /** The jewels sitting in the item's sockets ({kind, index, jewel}); reads only, never opens a socket. */
    function jewels(item) {
        return item ? storedRows(item).filter(row => row.jewel) : [];
    }
    /** The grown items sitting in the item's sockets ({kind, index, harvest}); reads only. */
    function harvests(item) {
        return item ? storedRows(item).filter(row => row.harvest) : [];
    }
    /** A socket a jewel may go into: empty, and not one of the harvest armour's. */
    const takesJewel = row => !row.jewel && !row.harvest && row.kind !== 'harvest';

    /**
     * Before an item is destroyed (salvage, a chance orb, a cube recipe): every socketed jewel goes back to the bag, past a full bag
     * into the temporary storage, and every socketed grown item back to the stump box, past a full storage, so neither is lost.
     * @returns {number} jewels returned
     */
    function returnJewels(item, state = game) {
        const rows = jewels(item).filter(row => !row.fused);
        rows.forEach(row => {
            bagItems.put(bagItems.asJewel(row.jewel), state, true);
            socketRecord(item, row.kind, row.index).jewel = null;
        });
        harvests(item).forEach(row => {
            stumpBox.returnFromSocket(state, row.harvest, true);
            socketRecord(item, row.kind, row.index).harvest = null;
        });
        return rows.length;
    }

    function count(item) {
        return item ? storedRows(item).length : 0;
    }

    function label(row) {
        if (row.kind === 'harvest') return _t('{label} 소켓', { label: STUMP_BOX_STAGES[row.accepts[0]].label });
        if (row.kind === 'void') return row.fused ? '융합 소켓' : '공허 소켓';
        return row.kind === 'corrupt' ? '타락 소켓' : _t('심연 소켓 {value}', { value: row.index + 1 });
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

    /** The void socket's jewel becomes part of the item: it can no longer come out. */
    function fuse(item) {
        if (item.voidSocket && item.voidSocket.jewel) item.voidSocket.fused = true;
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
        if (!isAccessory(item)) return { ok: false, reason: _t('공허 소켓은 반지, 목걸이, 허리띠에만 뚫을 수 있습니다. 다른 장비는 타락으로만 소켓이 생깁니다.') };
        if (!canChisel(item)) return { ok: false, reason: _t('이 장비에는 공허 소켓을 더 뚫을 수 없습니다.') };
        if ((state.currencies.voidChisel || 0) <= 0) return { ok: false, reason: _t('공허의 끌이 부족합니다.') };
        state.currencies.voidChisel -= 1;
        openVoidSocket(item);
        return { ok: true };
    }

    function socketRecord(item, kind, index) {
        if (kind === 'abyss') return (Array.isArray(item.abyssSockets) && item.abyssSockets[index]) || null;
        if (kind === 'harvest') return (Array.isArray(item.harvestSockets) && item.harvestSockets[index]) || null;
        if (kind === 'corrupt') return item.corruptionSocket || null;
        return voidRecord(item);
    }

    /** The open void socket's record, or a closed record that still holds a jewel or a grown item (so it can come out), or null. */
    function voidRecord(item) {
        if (hasVoidSocket(item)) return item.voidSocket;
        return item.voidSocket && (item.voidSocket.jewel || item.voidSocket.harvest) ? item.voidSocket : null;
    }
    /** The socket `at` ({ kind, index }, the one something was dropped on) when it fits, else the first that fits. */
    const pickSocket = (rows, fits, at) => (at && rows.find(row => fits(row) && row.kind === at.kind && row.index === at.index)) || rows.find(fits);

    /** Moves a bag jewel into the item's socket `at` when that is empty, else into the first empty one. */
    function insert(item, jewelId, state = game, at = null) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const jewel = bagItems.jewels(state).find(row => row.id === jewelId), empty = pickSocket(list(item), takesJewel, at);
        if (!jewel) return { ok: false, reason: _t('가방에 없는 주얼입니다.') };
        if (!empty) return { ok: false, reason: _t('빈 소켓이 없습니다.') };
        bagItems.take(jewel, state);
        socketRecord(item, empty.kind, empty.index).jewel = jewel;
        return { ok: true, jewel };
    }

    /** Moves a stored grown flower, fruit, vine or root (stump box id) into a socket of this unique that takes its kind. */
    function insertHarvest(item, stumpId, state = game, at = null) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const grown = stumpBox.socketable(state, stumpId);
        if (!grown) return { ok: false, reason: _t('그루터기 함 보관함의 다 자란 꽃, 열매, 덩굴, 뿌리만 넣을 수 있습니다.') };
        const kind = stumpBox.yieldKind(grown);
        const empty = pickSocket(list(item), row => !row.jewel && !row.harvest && row.accepts.includes(kind), at);
        if (!empty) return { ok: false, reason: `${STUMP_BOX_STAGES[kind].label}${pickParticle(STUMP_BOX_STAGES[kind].label, '을', '를')} 넣을 빈 소켓이 없습니다.` };
        stumpBox.takeForSocket(state, grown);
        socketRecord(item, empty.kind, empty.index).harvest = grown;
        return { ok: true, harvest: grown };
    }

    function removeHarvest(record, state) {
        if (!stumpBox.returnFromSocket(state, record.harvest)) return { ok: false, reason: _t('그루터기 함 보관함에 자리가 없습니다.') };
        const harvest = record.harvest;
        record.harvest = null;
        return { ok: true, harvest };
    }
    /** Takes a jewel back to the bag, or a grown item back to the stump box storage (neither when it is full). */
    function remove(item, kind, index, state = game) {
        if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
        const record = item ? socketRecord(item, kind, index) : null;
        if (record && record.harvest) return removeHarvest(record, state);
        if (!record || !record.jewel) return { ok: false, reason: _t('빈 소켓입니다.') };
        if (record.fused) return { ok: false, reason: _t('융합된 주얼은 뺄 수 없습니다.') };
        const jewel = record.jewel;
        if (!bagItems.put(bagItems.asJewel(jewel), state)) return { ok: false, reason: _t('가방에 자리가 없습니다.') };
        record.jewel = null;
        return { ok: true, jewel };
    }

    return Object.freeze({ isSocketable, isAccessory, hasVoidSocket, list, jewels, harvests, harvestKinds, migrateHarvest, takesJewel, returnJewels, count, label, canChisel, openVoidSocket, fuse,
        rollDropSocket, keepLegacySocket, canAddCorruptionSocket, addCorruptionSocket, chisel, insert, insertHarvest, remove });
})();
safeExposeGlobals({ equipmentSockets });
