const playerExchangeState = {
    // dataUserId: the account the hall rows (data) were read for. tipCards: tooltip cards built on hover, cleared with itemTips.
    data: null, dataUserId: null, loading: false, message: '', selectedItemId: null, itemTips: new Map(), tipCards: new Map()
};

function isPlayerExchangeServerReady() {
    return !!(cloudState && cloudState.configured && cloudState.user && cloudState.user.id
        && cloudState.revisionSupported === true);
}

function getPlayerExchangeError(error) {
    let raw = String(error && error.message || error || '알 수 없는 오류');
    if (/PGRST202|function[^\n]*get_player_hall[^\n]*does not exist|relation[^\n]*hall_listings[^\n]*does not exist/i.test(raw)) {
        return '장비 전당 서버를 준비 중입니다. 잠시 후 다시 열어주세요.';
    }
    let messages = {
        AUTH_REQUIRED: '클라우드 로그인이 필요합니다.', CLOUD_SAVE_NOT_FOUND: '먼저 클라우드 저장을 완료해주세요.',
        CLOUD_REVISION_CONFLICT: '다른 기기에서 저장이 변경되었습니다. 클라우드 저장을 다시 불러와주세요.',
        HALL_LISTING_LIMIT: '전당에는 동시에 장비를 3개까지만 전시할 수 있습니다.',
        HALL_RATE_LIMIT: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.', HALL_LISTING_DAILY_LIMIT: '오늘의 전당 등록 한도에 도달했습니다.',
        HALL_DAILY_LIMIT: '오늘의 전당 구매 한도에 도달했습니다.',
        HALL_ITEM_NOT_FOUND: '서버 저장에서 장비를 찾지 못했습니다.', HALL_ITEM_REJECTED: '전당 등록 규칙에 맞지 않는 장비입니다.',
        HALL_ITEM_KEY_CONFLICT: '같은 서버 식별자를 가진 장비가 둘 이상 발견되어 등록을 중단했습니다.',
        HALL_RELIST_BLOCKED: '한 번이라도 복제된 원본은 전당에 다시 등록할 수 없습니다.',
        HALL_SOCKET_NOT_EMPTY: '소켓에 주얼을 끼운 장비는 전당에 등록할 수 없습니다.', HALL_ITEM_OWNERSHIP: '장비의 서버 소유권을 확인할 수 없습니다.',
        HALL_LISTING_NOT_ACTIVE: '전시가 종료되었거나 회수된 장비입니다.', HALL_SELF_PURCHASE: '자신이 전시한 장비는 구매할 수 없습니다.',
        HALL_ALREADY_COLLECTED: '같은 전시품은 계정당 한 번만 구매할 수 있습니다.', HALL_CURRENCY_SHORTAGE: '황금률이 부족합니다.',
        HALL_INVENTORY_FULL: '가방에 빈칸이 부족합니다. 가방을 정리한 뒤 다시 시도해 주세요.',
        HALL_ITEM_OUT_OF_RANGE: '게임에서 나올 수 없는 수치가 있는 장비는 전당에 등록할 수 없습니다.',
        HALL_ACCOUNT_HELD: '운영 검토 중인 계정이라 전당에 등록하거나 살 수 없습니다.'
    };
    let code = Object.keys(messages).find(key => raw.includes(key));
    return code ? messages[code] : raw;
}

// Any socket counts (void and corruption sockets too): a listed item must never take a jewel with it.
function hasSocketedHallJewel(item) {
    return equipmentSockets.jewels(item).length > 0;
}

function getHallEligibleItems() {
    return (game.inventory || []).filter(item => item && Number.isFinite(Number(item.id))
        && ['rare', 'unique'].includes(item.rarity) && (item.baseId || item.baseName) && !item.locked && !item.tradeLocked
        && !item.hallReplica && !item.hallRelistBlocked && !hasSocketedHallJewel(item)
        && !(typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item))).filter(item => !bagItems.isSpecial(item));
}

function createHallItemKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
        throw new Error('안전한 전당 식별자를 만들 수 없는 브라우저입니다.');
    }
    let bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    let hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ensureHallItemKey(item) {
    if (!item || typeof item !== 'object') return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.tradeKey || ''))) {
        item.tradeKey = createHallItemKey();
    }
    return item.tradeKey;
}

function getPlayerExchangeRevision() {
    return Math.max(0, Math.floor(Number(game && game.saveMeta && game.saveMeta.cloudRevision) || 0));
}

/** What keeps the hall's trades whole (2026-10-22). The woodsman fight puts the bag back every tick (js/combat.js
 * enforceWoodsmanBuildLock) and the offline replay replaces the game when it settles (js/ui.js commitBackgroundCombat): a trade made
 * meanwhile came back (a listing) or vanished (a withdrawal) while the server kept it. combat.js asks loopBlockReason before a loop. */
const playerHallTrade = (() => {
    /** Why a trade must not start now, or ''. action names it in the sentence ('전시', '회수', '구매'); incoming is the item it puts in the
     * bag (the server counts items, not cells, so a full bag used to send it to the temporary storage without a word). */
    function hallTradeRefusal(action, incoming) {
        if (game.woodsmanBuildLock) return `☠️ 나무꾼 전투 중에는 ${action}할 수 없습니다.`;
        const replay = typeof shopView === 'object' ? shopView.busyReason() : '';
        if (replay) return replay;
        return incoming && !canStoreEquipmentItems([incoming], game) ? getPlayerExchangeError('HALL_INVENTORY_FULL') : '';
    }

    /** Waits while busy() holds, looking every 250 ms, for at most limitMs. @returns {Promise<boolean>} true once it no longer holds */
    async function hallWaitClear(busy, limitMs) {
        const until = Date.now() + limitMs;
        while (busy() && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 250));
        return !busy();
    }

    /** Runs trade holding the cloud save (cloudState.busy): an auto save starting meanwhile raced the hall's own push and request, and
     * one of them failed as if another device had saved. A save already running is waited for, 10 seconds at most. */
    async function hallHoldCloud(trade) {
        if (!await hallWaitClear(() => cloudState.busy, 10000)) throw new Error('클라우드 저장이 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.');
        cloudState.busy = true;
        try {
            return await trade();
        } finally {
            cloudState.busy = false;
        }
    }

    /** The game states a result has to reach: the live game and an offline replay snapshot still waiting to run (the replay builds the
     * next game from it), each with its woodsman fight snapshot while that lock holds (the lock puts the bag back from it every tick). */
    function hallTradeStates() {
        return [game, backgroundCombatRuntime.snapshot].filter(Boolean)
            .flatMap(state => (state.woodsmanBuildLock && state.woodsmanBuildSnapshot ? [state, state.woodsmanBuildSnapshot] : [state]));
    }

    /** The listed item leaves the bag of a state (by its server key). */
    function hallTakeItem(itemKey) {
        return state => { state.inventory = (state.inventory || []).filter(row => row && row.tradeKey !== itemKey); };
    }

    /** A withdrawn original or a bought replica comes into the bag of a state, once (by its server key). It takes a fresh local id when
     * it lands: the server's ids (9100000000000 + listing, 9200000000000 + purchase) pushed the save's id counter (js/save.js
     * refreshItemIdCounter) into the range later hall items get, and two items could share an id. tradeKey stays the server's key. */
    function hallReceiveItem(serverItem) {
        let item = null;
        return state => {
            item = item || { ...serverItem, id: ++itemIdCounter };
            state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
            if (state.inventory.some(row => row && row.tradeKey === item.tradeKey)) return;
            state.inventory.push(state === game ? item : JSON.parse(JSON.stringify(item)));
        };
    }

    /** The price leaves the 황금률 held now (a woodsman snapshot holds no wallet). Copying the server's number lost the 황금률 picked up,
     * or gave back what was spent, while the purchase was on its way. */
    function hallPayPrice(price) {
        return state => {
            if (state.currencies) state.currencies.goldenRule = Math.max(0, (Number(state.currencies.goldenRule) || 0) - price);
        };
    }

    /** ' 가방에 자리가 없어 임시 보관함에 넣었습니다.' when the received item no longer fit (the bag filled while the request was on its way). */
    function hallStorageNote(tradeKey) {
        if (!tradeKey) return '';
        equipmentInventoryGridRuntime.ensureState(game);
        return (game.equipmentTemporaryStorage || []).some(row => row && row.tradeKey === tradeKey) ? ' 가방에 자리가 없어 임시 보관함에 넣었습니다.' : '';
    }

    /** Keeps the held 내 전시 rows right after this device lists (row) or withdraws (row null), also when the reload after it fails: the
     * loop waits on them (hallLoopBlockReason). */
    function hallNoteMine(listingId, row) {
        const userId = cloudState.user && cloudState.user.id;
        const held = playerExchangeState.dataUserId === userId && playerExchangeState.data ? playerExchangeState.data : { listings: [], mine: [] };
        const mine = (Array.isArray(held.mine) ? held.mine : []).filter(entry => entry && Number(entry.id) !== Number(listingId));
        playerExchangeState.data = { ...held, mine: row ? [row, ...mine] : mine };
        playerExchangeState.dataUserId = userId;
    }

    /** Why the loop must wait for the hall, or '': originals on show (open or sold out) in the hall rows this device holds for the
     * account. The loop empties the bag but not the hall, so a withdrawal after it carried the gear into the next loop (the stall waits
     * for the same reason, js/player-stall.js loopBlockReason). The rows are known once the hall was opened or used this session. */
    function hallLoopBlockReason() {
        const data = playerExchangeState.data, userId = cloudState && cloudState.user && cloudState.user.id;
        if (!data || !userId || playerExchangeState.dataUserId !== userId) return '';
        const shown = (Array.isArray(data.mine) ? data.mine : []).filter(row => row && ['open', 'sold_out'].includes(row.status)).length;
        return shown ? `장비 전당에 전시한 원본 ${shown}개가 남아 있습니다. 장비 → 장비 전당에서 회수한 뒤 루프를 진행하세요.` : '';
    }

    /** My listing's price box: its price while on show, '복제 한도 완료' once every copy went, '전시 닫힘' when it closed before that
     * (an operator's hold closes open listings, db/anti-cheat.sql admin_set_cheat_hold). */
    function hallMineLabel(row) {
        if (row.status !== 'sold_out') return `황금률 ${Number(row.price || 0).toLocaleString()}`;
        return Number(row.copiesSold || 0) >= Number(row.copyCap || 5) ? '복제 한도 완료' : '전시 닫힘';
    }

    return Object.freeze({ refusal: hallTradeRefusal, waitClear: hallWaitClear, holdCloud: hallHoldCloud, states: hallTradeStates,
        take: hallTakeItem, receive: hallReceiveItem, pay: hallPayPrice, storageNote: hallStorageNote, noteMine: hallNoteMine,
        loopBlockReason: hallLoopBlockReason, mineLabel: hallMineLabel });
})();

/** Applies a change the server committed: mutation(state) on every state playerHallTrade.states gives, then the revision it gave. A
 * running offline replay is waited for first: it replaces the game with a result built from a snapshot taken before this change, so the
 * change and its revision go on the game the replay leaves, never on the one it throws away. A replay that has not started yet (the
 * page is hidden) gets the change in its snapshot, so neither the change nor the offline progress is lost. */
async function applyPlayerExchangeServerState(result, mutation) {
    if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error('전당 서버 응답에 저장 리비전이 없습니다.');
    await playerHallTrade.waitClear(() => backgroundCombatRuntime.processing, Infinity);
    playerHallTrade.states().forEach(state => mutation(state));
    ensureSaveMeta();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.currentRevision)));
    game.saveMeta.lastCloudSyncAt = Date.now();
    cloudState.lastRemoteRevision = game.saveMeta.cloudRevision;
    cloudState.lastRemoteUpdatedAt = game.saveMeta.lastCloudSyncAt;
    persistLocalSave({ touchModifiedAt: false });
    updateStaticUI();
}

async function preparePlayerExchangeMutation(reason) {
    if (!isPlayerExchangeServerReady()) throw new Error(cloudState && cloudState.user ? '장비 전당 서버를 준비 중입니다.' : '클라우드 로그인이 필요합니다.');
    if (!saveGame({ skipCloudSync: true })) throw new Error('로컬 저장에 실패하여 전당 작업을 중단했습니다.');
    await pushCloudSave({ touchModifiedAt: true, reason });
}

async function loadPlayerExchange() {
    if (!isPlayerExchangeServerReady() || playerExchangeState.loading) return renderPlayerExchange();
    playerExchangeState.loading = true;
    playerExchangeState.message = '';
    renderPlayerExchange();
    try {
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function requestHallItemQuote(item) {
    let itemKey = ensureHallItemKey(item);
    let quote = await playerHallTrade.holdCloud(async () => {
        await preparePlayerExchangeMutation('hall-appraisal');
        return cloudJsonRequest('/rest/v1/rpc/quote_hall_item', {
            method: 'POST', body: { p_item_key: itemKey, p_expected_revision: getPlayerExchangeRevision() }
        });
    });
    return { itemKey, quote };
}

async function confirmHallListing(item, quote) {
    if (typeof requestGameConfirmation !== 'function') return true;
    let price = Math.max(0, Math.floor(Number(quote.price) || 0));
    let score = Math.max(0, Math.floor(Number(quote.score) || 0));
    return requestGameConfirmation(
        `[${item.name}] 감정 점수 ${score.toLocaleString()}, 복제품 구매가 황금률 ${price.toLocaleString()}개\n등록 중 원본은 전당이 보관하며, 회수 전까지 최대 5명이 귀속 복제품을 구매할 수 있습니다.`,
        { title: '장비 전당 감정', confirmLabel: '이 가격으로 전시' });
}

async function createPlayerHallListing() {
    if (playerExchangeState.loading) return;
    let item = getHallEligibleItems().find(row => Number(row.id) === Number(playerExchangeState.selectedItemId));
    if (!item) return setPlayerExchangeMessage('전당에 전시할 희귀 또는 고유 장비를 선택해주세요.');
    let refusal = playerHallTrade.refusal('전시');
    if (refusal) return setPlayerExchangeMessage(refusal);
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let appraisal = await requestHallItemQuote(item);
        if (!await confirmHallListing(item, appraisal.quote)) {
            playerExchangeState.message = '감정만 완료하고 전시는 취소했습니다.';
            return;
        }
        // The dialog waited for the player: the woodsman fight or an offline replay may have begun meanwhile.
        refusal = playerHallTrade.refusal('전시');
        if (refusal) {
            playerExchangeState.message = refusal;
            return;
        }
        let result = await playerHallTrade.holdCloud(async () => {
            let response = await cloudJsonRequest('/rest/v1/rpc/create_hall_listing', {
                method: 'POST', body: { p_item_key: appraisal.itemKey, p_expected_revision: getPlayerExchangeRevision() }
            });
            await applyPlayerExchangeServerState(response, playerHallTrade.take(appraisal.itemKey));
            return response;
        });
        playerExchangeState.selectedItemId = null;
        playerHallTrade.noteMine(result.listingId, { id: result.listingId, item: result.item, score: result.score, price: result.price,
            status: 'open', copiesSold: 0, copyCap: 5 });
        playerExchangeState.message = `감정 점수 ${Number(result.score).toLocaleString()}, 황금률 ${Number(result.price).toLocaleString()}개로 전시했습니다.`;
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function buyPlayerHallReplica(listingId) {
    let listing = getPlayerHallListings().find(row => Number(row.id) === Number(listingId));
    if (!listing) return setPlayerExchangeMessage('전시 항목을 다시 불러와주세요.');
    let refusal = playerHallTrade.refusal('구매', listing.item);
    if (refusal) return setPlayerExchangeMessage(refusal);
    let accepted = typeof requestGameConfirmation !== 'function' || await requestGameConfirmation(
        `[${listing.item && listing.item.name || '장비'}]의 귀속 복제품을 황금률 ${Number(listing.price).toLocaleString()}개에 구매합니다.\n구매한 장비는 재판매하거나 전당에 다시 등록할 수 없습니다.`,
        { title: '전당 소장품 구매', confirmLabel: '구매' });
    if (!accepted) return;
    await runPlayerExchangeMutation({ action: '구매', incoming: listing.item, reason: 'hall-purchase', path: '/rest/v1/rpc/buy_hall_replica',
        body: { p_listing_id: Number(listingId) }, successMessage: '전당 소장품을 구매했습니다. 이 복제품은 계정에 귀속됩니다.',
        mutation: result => {
            const receive = playerHallTrade.receive(result.item);
            const pay = playerHallTrade.pay(Math.max(0, Math.floor(Number(result.price ?? listing.price) || 0)));
            return state => { receive(state); pay(state); };
        } });
}

async function withdrawPlayerHallListing(listingId) {
    let mine = playerExchangeState.data && Array.isArray(playerExchangeState.data.mine) ? playerExchangeState.data.mine : [];
    let row = mine.find(entry => entry && Number(entry.id) === Number(listingId));
    await runPlayerExchangeMutation({ action: '회수', incoming: row && row.item, reason: 'hall-withdraw', path: '/rest/v1/rpc/withdraw_hall_listing',
        body: { p_listing_id: Number(listingId) }, successMessage: '전시를 종료하고 원본 장비를 돌려받았습니다.',
        mutation: result => playerHallTrade.receive(result.item), done: () => playerHallTrade.noteMine(listingId, null) });
}

/** One server trade that puts an item in the bag (buy, withdraw): refused while playerHallTrade.refusal says so (asked again after any
 * dialog), else the save is pushed, the request sent with the revision it got, and the change applied (applyPlayerExchangeServerState).
 * spec: { action, incoming, reason, path, body, successMessage, mutation(result) → state change, done?(result) }. */
async function runPlayerExchangeMutation(spec) {
    if (playerExchangeState.loading) return;
    let refusal = playerHallTrade.refusal(spec.action, spec.incoming);
    if (refusal) return setPlayerExchangeMessage(refusal);
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let result = await playerHallTrade.holdCloud(async () => {
            await preparePlayerExchangeMutation(spec.reason);
            let response = await cloudJsonRequest(spec.path, {
                method: 'POST', body: { ...spec.body, p_expected_revision: getPlayerExchangeRevision() }
            });
            await applyPlayerExchangeServerState(response, spec.mutation(response));
            return response;
        });
        playerExchangeState.message = spec.successMessage + playerHallTrade.storageNote(result.item && result.item.tradeKey);
        if (spec.done) spec.done(result);
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function reloadPlayerExchangeData() {
    let userId = cloudState.user && cloudState.user.id;
    playerExchangeState.data = await cloudJsonRequest('/rest/v1/rpc/get_player_hall', { method: 'POST', body: {} });
    playerExchangeState.dataUserId = userId;
}

function setPlayerExchangeMessage(message) {
    playerExchangeState.message = message;
    renderPlayerExchange();
}

function getPlayerHallListings() {
    return Array.isArray(playerExchangeState.data && playerExchangeState.data.listings) ? playerExchangeState.data.listings : [];
}

function selectPlayerHallItem(itemId) {
    playerExchangeState.selectedItemId = Number(itemId);
    renderPlayerExchange();
}

/** The hall card's tooltip: the profile card (js/social.js) fed its own snapshot, built once per render. A raw save item left out the
 * requirement, grade, oil and ember lines that card reads from the snapshot. */
function showPlayerHallTooltip(event, tipKey) {
    let item = playerExchangeState.itemTips.get(String(tipKey));
    if (!item || typeof renderProfileItemCard !== 'function') return;
    let card = playerExchangeState.tipCards.get(String(tipKey));
    if (!card) {
        card = renderProfileItemCard(typeof buildItemSnapshot === 'function' ? buildItemSnapshot(item) : item);
        playerExchangeState.tipCards.set(String(tipKey), card);
    }
    showInfoTooltipHtml(event.clientX, event.clientY, card, getRarityColor(item.rarity));
}

function renderHallItemCard(item, key, actionHtml, metaHtml) {
    playerExchangeState.itemTips.set(String(key), item);
    let color = getRarityColor(item.rarity);
    let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
    return `<article class="player-trade-item hall-item" style="--trade-rarity:${color}" onmouseenter="showPlayerHallTooltip(event,'${escapeHTML(key)}')" onmousemove="showPlayerHallTooltip(event,'${escapeHTML(key)}')" onmouseleave="hideInfoTooltip()"><div><strong>${escapeHTML(item.name || '이름 없는 장비')}</strong><small>${escapeHTML(item.slot || '')}, ${item.rarity === 'unique' ? '고유' : '희귀'}, T${tier}</small>${metaHtml || ''}</div>${actionHtml}</article>`;
}

function renderHallListingAction(row) {
    let disabled = row.isMine || row.alreadyCollected || playerExchangeState.loading;
    let buttonText = row.isMine ? '내 전시품' : (row.alreadyCollected ? '소장 완료' : '구매');
    return `<div class="player-trade-price"><b>황금률 ${Number(row.price || 0).toLocaleString()}</b><span>${escapeHTML(row.curatorName || '익명')}, ${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)}</span><button onclick="buyPlayerHallReplica(${Number(row.id)})" ${disabled ? 'disabled' : ''}>${buttonText}</button></div>`;
}

function renderHallPicker() {
    let owned = getHallEligibleItems();
    if (!owned.length) return '<div class="player-exchange-empty"><span class="px-center">전시할 수 있는 희귀, 고유 장비가 없습니다. 잠근 장비, 프리셋 장비, 어느 소켓이든 주얼을 끼운 장비, 전당 소장품, 복제 이력이 있는 장비는 제외됩니다.</span></div>';
    return owned.map(item => renderHallItemCard(item, `owned-${item.id}`,
        `<button class="${Number(item.id) === Number(playerExchangeState.selectedItemId) ? 'active' : ''}" onclick="selectPlayerHallItem(${Number(item.id)})">${Number(item.id) === Number(playerExchangeState.selectedItemId) ? '선택됨' : '전당 등록 선택'}</button>`)).join('');
}

function renderHallMarket() {
    let listings = getPlayerHallListings();
    if (!listings.length) return '<div class="player-exchange-empty"><span class="px-center">현재 전시 중인 소장품이 없습니다.</span></div>';
    return listings.map(row => renderHallItemCard(row.item || {}, `hall-${row.id}`, renderHallListingAction(row),
        `<small class="hall-appraisal">감정 ${Number(row.score || 0).toLocaleString()}, 전시자 명예 +${Number(row.honorPerCopy || 0)}</small>`)).join('');
}

function renderMyHallListings() {
    let mine = Array.isArray(playerExchangeState.data && playerExchangeState.data.mine) ? playerExchangeState.data.mine : [];
    if (!mine.length) return '<div class="player-exchange-empty"><span class="px-center">보관 중인 전시 원본이 없습니다.</span></div>';
    return mine.map(row => renderHallItemCard(row.item || {}, `mine-${row.id}`,
        `<div class="player-trade-price"><b>${playerHallTrade.mineLabel(row)}</b><span>${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)} 소장</span><button onclick="withdrawPlayerHallListing(${Number(row.id)})" ${playerExchangeState.loading ? 'disabled' : ''}>전시 종료/회수</button></div>`,
        `<small class="hall-appraisal">감정 ${Number(row.score || 0).toLocaleString()}</small>`)).join('');
}

/** 전당을 못 여는 까닭: 로그인 전이면 로그인 단추, 로그인했는데 서버가 준비 전이면 기다려 달라는 말. */
function playerHallUnavailableHtml() {
    if (cloudState && cloudState.user) return '<div class="player-exchange-empty"><span class="px-center">장비 전당 서버를 준비 중입니다. 잠시 후 다시 열어주세요.</span></div>';
    return '<div class="player-exchange-empty"><span class="px-center">장비 전당은 클라우드 로그인 후 이용할 수 있습니다.<button type="button" onclick="openStartupGate({ accountOnly: true })">로그인 화면 열기</button></span></div>';
}

function renderPlayerHallPanel() {
    if (!isPlayerExchangeServerReady()) return playerHallUnavailableHtml();
    playerExchangeState.itemTips.clear();
    playerExchangeState.tipCards.clear();
    let data = playerExchangeState.data || {};
    let activeCount = (Array.isArray(data.mine) ? data.mine : [])
        .filter(row => ['open', 'sold_out'].includes(row.status)).length;
    return `<section class="player-exchange-card hall-summary"><header><div><strong>장비 전당</strong><small>희귀/고유 원본 전시, 서버 감정가, 귀속 복제품 최대 5개</small></div><span>명예 ${Number(data.honor || 0).toLocaleString()}, 소장 ${Number(data.collectionCount || 0).toLocaleString()}</span></header><p>희귀는 베이스 종류/티어와 옵션 티어/롤, 고유는 옵션 롤과 타락 결과까지 서버가 감정합니다. 판매자는 재화 대신 구매자마다 명예를 얻고 구매 비용은 전부 소각됩니다.</p></section><section class="player-exchange-card"><header><div><strong>전시 등록 ${activeCount}/3</strong><small>원본은 전시 종료 시 직접 회수할 수 있습니다.</small></div><span>보유 황금률 ${Math.floor(game.currencies.goldenRule || 0).toLocaleString()}</span></header><div class="player-trade-register"><div class="player-trade-picker">${renderHallPicker()}</div><button onclick="createPlayerHallListing()" ${playerExchangeState.loading || activeCount >= 3 ? 'disabled' : ''}>서버 감정 후 전시</button></div></section><section class="player-exchange-card"><header><strong>전당 소장품</strong><button onclick="loadPlayerExchange()" ${playerExchangeState.loading ? 'disabled' : ''}>새로고침</button></header><div class="player-trade-grid">${renderHallMarket()}</div></section><section class="player-exchange-card"><header><strong>내 전시 원본</strong><span>공유 ${Number(data.copiesShared || 0).toLocaleString()}회</span></header><div class="player-trade-grid compact">${renderMyHallListings()}</div></section>`;
}

function renderPlayerExchange() {
    let hallHost = document.getElementById('map-player-hall');
    if (!hallHost) return;
    let message = playerExchangeState.message ? `<p class="player-exchange-message">${escapeHTML(playerExchangeState.message)}</p>` : '';
    hallHost.innerHTML = message + renderPlayerHallPanel();
}

safeExposeGlobals({ loadPlayerExchange, renderPlayerExchange, selectPlayerHallItem,
    createPlayerHallListing, buyPlayerHallReplica, withdrawPlayerHallListing,
    showPlayerHallTooltip, playerHallTrade });
