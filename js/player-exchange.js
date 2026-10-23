/** get_player_hall (db/equipment-hall.sql) sends the open shows with the highest appraisal, at most this many: the browse filters and
 * orders those, never the whole hall. */
const HALL_LIST_LIMIT = 80;
const HALL_SORTS = Object.freeze({ score: '감정 높은 순', priceAsc: '가격 낮은 순', priceDesc: '가격 높은 순' });
const HALL_BROWSE_DEFAULT = Object.freeze({ slot: 'all', sort: 'score', query: '' });

const playerExchangeState = {
    // dataUserId: the account the hall rows (data) were read for. tipCards: tooltip cards built on hover, cleared with itemTips.
    // selectedListingId: the show whose full card and purchase are open. asking: a hall confirmation is open (no second trade starts).
    data: null, dataUserId: null, loading: false, message: '', selectedItemId: null, itemTips: new Map(), tipCards: new Map(),
    // browse: how the list is looked through (slot 'all' or a slot name, sort a HALL_SORTS key, query a few letters of a name).
    // compare: { key, html } of the chosen show against the worn gear. uncertain: { userId, revision } of a trade whose result became
    // unknown: the account it went out under and the save revision it was sent with (isHallResultUnknown), or null.
    selectedListingId: null, asking: false, browse: { ...HALL_BROWSE_DEFAULT }, compare: null, uncertain: null
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
        HALL_ACCOUNT_HELD: '운영 검토 중인 계정이라 전당에 등록하거나 살 수 없습니다.',
        HALL_ACCOUNT_CHANGED: '작업 중에 로그인 계정이 바뀌어 이 기기에는 반영하지 않았습니다. 클라우드 저장을 다시 불러와 주세요.',
        HALL_SESSION_CHANGED: '작업 중에 로그인 계정이나 게임 상태가 바뀌어 전당에 보내지 않았습니다. 다시 시도해 주세요.',
        HALL_RESULT_UNKNOWN: '전당 서버의 응답을 받지 못해 거래 결과를 확인할 수 없습니다. 같은 거래를 다시 하지 말고 클라우드 저장을 다시 불러와 확인해 주세요.'
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

/** The account and game a hall action began with. Any await of the action can end with another account signed in or the game
 * replaced (a cloud load, an offline replay settling): checkHallSession runs right after each one and before every request, so no
 * save push or hall request goes out for an account or game the player did not start with. Once the server committed, only the
 * account is checked (applyPlayerExchangeServerState), since a settled replay's game rightly takes the result. */
function beginHallSession() {
    return { userId: cloudState.user && cloudState.user.id, owner: game };
}

function checkHallSession(session) {
    const userId = cloudState.user && cloudState.user.id;
    if (!session.userId || userId !== session.userId || game !== session.owner) throw new Error('HALL_SESSION_CHANGED');
}

/** The hall rows read for the account signed in now, or null: rows read for another account are neither shown nor traded on. */
function getPlayerHallData() {
    const userId = cloudState.user && cloudState.user.id;
    return userId && playerExchangeState.dataUserId === userId ? playerExchangeState.data : null;
}

/** What keeps the hall's trades whole (2026-10-22). The woodsman fight puts the bag back every tick (js/combat.js
 * enforceWoodsmanBuildLock) and the offline replay replaces the game when it settles (js/ui.js commitBackgroundCombat): a trade made
 * meanwhile came back (a listing) or vanished (a withdrawal) while the server kept it. combat.js asks loopBlockReason before a loop. */
const playerHallTrade = (() => {
    /** Why a trade must not start now, or ''. action names it in the sentence ('전시', '회수', '구매'); incoming is the item it puts in the
     * bag (the server counts items, not cells, so a full bag used to send it to the temporary storage without a word). */
    function hallTradeRefusal(action, incoming) {
        if (isHallResultUnknown()) return getPlayerExchangeError('HALL_RESULT_UNKNOWN');
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
            // The server can return a show written by an older game. Migrate the received copy once, without changing its stored
            // server snapshot or ownership flags; all pending local states receive the same migrated item and fresh local id.
            item = item || normalizeItem({ ...JSON.parse(JSON.stringify(serverItem)), id: ++itemIdCounter });
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

    /** After a purchase: the held row of that show is marked collected with the server's copy count, so its button stays shut also when
     * the reload after it fails (the server refuses a second purchase anyway: HALL_ALREADY_COLLECTED). */
    function hallNoteBought(listingId, result) {
        const data = getPlayerHallData();
        if (!data || !Array.isArray(data.listings)) return;
        data.listings = data.listings.map(row => (Number(row.id) !== Number(listingId) ? row
            : { ...row, alreadyCollected: true, copiesSold: Math.max(Number(row.copiesSold) || 0, Number(result.copiesSold) || 0) }));
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
        take: hallTakeItem, receive: hallReceiveItem, pay: hallPayPrice, storageNote: hallStorageNote, noteMine: hallNoteMine, noteBought: hallNoteBought,
        loopBlockReason: hallLoopBlockReason, mineLabel: hallMineLabel });
})();

/** Applies a change the server committed: mutation(state) on every state playerHallTrade.states gives, then the revision it gave. A
 * running offline replay is waited for first: it replaces the game with a result built from a snapshot taken before this change, so the
 * change and its revision go on the game the replay leaves, never on the one it throws away. A replay that has not started yet (the
 * page is hidden) gets the change in its snapshot, so neither the change nor the offline progress is lost. */
async function applyPlayerExchangeServerState(result, mutation, userId) {
    if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error('전당 서버 응답에 저장 리비전이 없습니다.');
    await playerHallTrade.waitClear(() => backgroundCombatRuntime.processing, Infinity);
    // userId: the account the request went out under. Another account signed in since: this game is not that account's, the server
    // keeps the trade, and writing it here would put it (and that revision) into another account's game. Only signed out: this is
    // still that player's game, and dropping the trade here would lose a withdrawn original once the local save is kept.
    if (userId !== undefined && cloudState.user && cloudState.user.id !== userId) throw new Error('HALL_ACCOUNT_CHANGED');
    playerHallTrade.states().forEach(state => mutation(state));
    ensureSaveMeta();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.currentRevision)));
    game.saveMeta.lastCloudSyncAt = Date.now();
    cloudState.lastRemoteRevision = game.saveMeta.cloudRevision;
    cloudState.lastRemoteUpdatedAt = game.saveMeta.lastCloudSyncAt;
    persistLocalSave({ touchModifiedAt: false });
    updateStaticUI();
}

async function preparePlayerExchangeMutation(reason, session) {
    if (!isPlayerExchangeServerReady()) throw new Error(cloudState && cloudState.user ? '장비 전당 서버를 준비 중입니다.' : '클라우드 로그인이 필요합니다.');
    checkHallSession(session);
    if (!saveGame({ skipCloudSync: true })) throw new Error('로컬 저장에 실패하여 전당 작업을 중단했습니다.');
    await pushCloudSave({ touchModifiedAt: true, reason });
    checkHallSession(session);
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

async function requestHallItemQuote(item, session) {
    let itemKey = ensureHallItemKey(item);
    let quote = await playerHallTrade.holdCloud(async () => {
        await preparePlayerExchangeMutation('hall-appraisal', session);
        return cloudJsonRequest('/rest/v1/rpc/quote_hall_item', {
            method: 'POST', expectedUserId: session.userId, body: { p_item_key: itemKey, p_expected_revision: getPlayerExchangeRevision() }
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
    if (playerExchangeState.loading || playerExchangeState.asking) return;
    let item = getHallEligibleItems().find(row => Number(row.id) === Number(playerExchangeState.selectedItemId));
    if (!item) return setPlayerExchangeMessage('전당에 전시할 희귀 또는 고유 장비를 선택해주세요.');
    let refusal = playerHallTrade.refusal('전시');
    if (refusal) return setPlayerExchangeMessage(refusal);
    let session = beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let appraisal = await appraiseHallListing(item, session);
        if (!appraisal) return;
        // The hall requests stay in this controller and runPlayerExchangeMutation (the hall's network boundary).
        let result = await playerHallTrade.holdCloud(async () => {
            checkHallSession(session);
            let response = await cloudJsonRequest('/rest/v1/rpc/create_hall_listing', {
                method: 'POST', expectedUserId: session.userId, onSend: () => Object.assign(progress, { sent: true, revision: getPlayerExchangeRevision() }), body: { p_item_key: appraisal.itemKey, p_expected_revision: getPlayerExchangeRevision() }
            });
            await applyPlayerExchangeServerState(response, playerHallTrade.take(appraisal.itemKey), session.userId);
            progress.applied = true;
            return response;
        });
        playerExchangeState.selectedItemId = null;
        playerHallTrade.noteMine(result.listingId, { id: result.listingId, item: result.item, score: result.score, price: result.price,
            status: 'open', copiesSold: 0, copyCap: 5 });
        await finishHallTrade(`감정 점수 ${Number(result.score).toLocaleString()}, 황금률 ${Number(result.price).toLocaleString()}개로 전시했습니다.`);
    } catch (error) {
        playerExchangeState.message = hallTradeFailureMessage(error, progress);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

/** Appraises item (quote_hall_item only reads the hall) and asks the player: the appraisal, or null when the listing stops here (the
 * message says why). */
async function appraiseHallListing(item, session) {
    let appraisal = await requestHallItemQuote(item, session);
    checkHallSession(session);
    let accepted = await confirmHallListing(item, appraisal.quote);
    checkHallSession(session);
    // The dialog waited for the player: the woodsman fight or an offline replay may have begun meanwhile.
    let refusal = accepted ? playerHallTrade.refusal('전시') : '감정만 완료하고 전시는 취소했습니다.';
    if (!refusal) return appraisal;
    playerExchangeState.message = refusal;
    return null;
}

/** Why listing is not on sale to this account at all, or '' (the server checks each again). */
function getHallListingClosedReason(listing) {
    if (listing.isMine) return getPlayerExchangeError('HALL_SELF_PURCHASE');
    if (listing.alreadyCollected) return getPlayerExchangeError('HALL_ALREADY_COLLECTED');
    let soldOut = Number(listing.copiesSold || 0) >= Number(listing.copyCap || 5);
    // get_player_hall lists open shows only (no status field); a full one is closed until the next reload.
    return soldOut ? getPlayerExchangeError('HALL_LISTING_NOT_ACTIVE') : '';
}

/** Why listing cannot be bought now, or '': another hall trade or its dialog under way, the listing closed to this account, too little
 * 황금률, or playerHallTrade.refusal (woodsman fight, offline replay, bag room). Answered before a dialog or a request; the server stays
 * the judge of price, ownership, copies and revision. */
function getHallBuyBlockReason(listing) {
    if (playerExchangeState.loading || playerExchangeState.asking) return '앞선 전당 작업을 마무리하는 중입니다.';
    let closed = getHallListingClosedReason(listing);
    if (closed) return closed;
    let price = Math.max(0, Math.floor(Number(listing.price) || 0));
    if (Math.floor(Number(game.currencies.goldenRule) || 0) < price) return getPlayerExchangeError('HALL_CURRENCY_SHORTAGE');
    return playerHallTrade.refusal('구매', listing.item);
}

/** A hall confirmation with playerExchangeState.asking set, so a second press opens no second dialog and starts no trade. */
async function askPlayerHall(text, options) {
    if (typeof requestGameConfirmation !== 'function') return true;
    playerExchangeState.asking = true;
    renderPlayerExchange();
    try {
        return await requestGameConfirmation(text, options);
    } finally {
        playerExchangeState.asking = false;
        renderPlayerExchange();
    }
}

async function buyPlayerHallReplica(listingId) {
    let listing = getPlayerHallListings().find(row => Number(row.id) === Number(listingId));
    if (!listing) return setPlayerExchangeMessage('전시 항목을 다시 불러와주세요.');
    let blocked = getHallBuyBlockReason(listing);
    if (blocked) return setPlayerExchangeMessage(blocked);
    let session = beginHallSession();
    let price = Math.max(0, Math.floor(Number(listing.price) || 0));
    if (!await askPlayerHall(`[${listing.item && listing.item.name || '장비'}]의 귀속 복제품을 황금률 ${price.toLocaleString()}개에 구매합니다.\n구매한 장비는 재판매하거나 전당에 다시 등록할 수 없습니다.`,
        { title: '전당 소장품 구매', confirmLabel: '구매' })) return;
    await runPlayerExchangeMutation({ session, action: '구매', incoming: listing.item, reason: 'hall-purchase', path: '/rest/v1/rpc/buy_hall_replica',
        body: { p_listing_id: Number(listingId) }, successMessage: '전당 소장품을 구매했습니다. 이 복제품은 계정에 귀속됩니다.',
        mutation: result => {
            const receive = playerHallTrade.receive(result.item);
            const pay = playerHallTrade.pay(Math.max(0, Math.floor(Number(result.price ?? listing.price) || 0)));
            return state => { receive(state); pay(state); };
        }, done: result => playerHallTrade.noteBought(listingId, result) });
}

/** Ending a show is final for an original a copy was bought from (HALL_RELIST_BLOCKED): the dialog says so before it goes. */
function confirmHallWithdraw(row) {
    let copied = Number(row.copiesSold || 0) > 0;
    let text = `[${row.item && row.item.name || '장비'}] 전시를 끝내고 원본을 가방으로 돌려받습니다.${copied ? '\n복제품이 팔린 원본이라 다시 전시할 수 없습니다.' : ''}`;
    return askPlayerHall(text, { title: '전당 전시 종료', confirmLabel: '전시 종료', ...(copied ? { tone: 'danger' } : {}) });
}

async function withdrawPlayerHallListing(listingId) {
    let data = getPlayerHallData(), mine = data && Array.isArray(data.mine) ? data.mine : [];
    let row = mine.find(entry => entry && Number(entry.id) === Number(listingId));
    if (!row) return setPlayerExchangeMessage('전시 항목을 다시 불러와주세요.');
    if (playerExchangeState.loading || playerExchangeState.asking) return setPlayerExchangeMessage('앞선 전당 작업을 마무리하는 중입니다.');
    let refusal = playerHallTrade.refusal('회수', row.item);
    if (refusal) return setPlayerExchangeMessage(refusal);
    let session = beginHallSession();
    if (row.status === 'open' && !await confirmHallWithdraw(row)) return;
    await runPlayerExchangeMutation({ session, action: '회수', incoming: row.item, reason: 'hall-withdraw', path: '/rest/v1/rpc/withdraw_hall_listing',
        body: { p_listing_id: Number(listingId) }, successMessage: '전시를 종료하고 원본 장비를 돌려받았습니다.',
        mutation: result => playerHallTrade.receive(result.item), done: () => playerHallTrade.noteMine(listingId, null) });
}

/** One server trade that puts an item in the bag (buy, withdraw): refused while playerHallTrade.refusal says so (asked again after any
 * dialog), else the save is pushed, the request sent with the revision it got, and the change applied (applyPlayerExchangeServerState).
 * spec: { session? (beginHallSession, taken before any dialog), action, incoming, reason, path, body, successMessage,
 *         mutation(result) → state change, done?(result) }. */
async function runPlayerExchangeMutation(spec) {
    if (playerExchangeState.loading || playerExchangeState.asking) return setPlayerExchangeMessage('앞선 전당 작업을 마무리하는 중입니다.');
    let refusal = playerHallTrade.refusal(spec.action, spec.incoming);
    if (refusal) return setPlayerExchangeMessage(refusal);
    let session = spec.session || beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let result = await playerHallTrade.holdCloud(async () => {
            await preparePlayerExchangeMutation(spec.reason, session);
            let response = await cloudJsonRequest(spec.path, {
                method: 'POST', expectedUserId: session.userId, onSend: () => Object.assign(progress, { sent: true, revision: getPlayerExchangeRevision() }), body: { ...spec.body, p_expected_revision: getPlayerExchangeRevision() }
            });
            await applyPlayerExchangeServerState(response, spec.mutation(response), session.userId);
            progress.applied = true;
            return response;
        });
        if (spec.done) spec.done(result);
        await finishHallTrade(spec.successMessage + playerHallTrade.storageNote(result.item && result.item.tradeKey));
    } catch (error) {
        playerExchangeState.message = hallTradeFailureMessage(error, progress);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

/** After a trade the server committed and this game took: the trade stands with message, and the hall rows are read again on their
 * own. A failed reload is said beside the success; the held rows keep the trade's marks (noteBought, noteMine) until then. */
async function finishHallTrade(message) {
    playerExchangeState.message = message;
    try {
        await reloadPlayerExchangeData();
    } catch (error) {
        console.warn('hall rows reload after a trade failed:', error);
        playerExchangeState.message = `${message} 전당 목록은 새로 불러오지 못했습니다(${getPlayerExchangeError(error)}). 새로고침으로 다시 불러와 주세요.`;
    }
}

/** The words for a hall trade that did not finish. A request that went out and was neither refused by the server (a known code) nor
 * taken into this game may have gone through: hall trades stop while isHallResultUnknown says so. progress: { sent, applied, userId,
 * revision (the save revision the request was sent with, set when it went out) }. */
function hallTradeFailureMessage(error, progress) {
    let raw = String(error && error.message || error || '');
    // A 4xx answer is the server refusing: nothing went through.
    const refused = error && error.status >= 400 && error.status < 500;
    if (progress.sent && !progress.applied && !refused && !/HALL_[A-Z_]+|CLOUD_[A-Z_]+|AUTH_REQUIRED/.test(raw)) {
        console.warn('hall trade result unknown:', error);
        playerExchangeState.uncertain = { userId: progress.userId, revision: progress.revision, at: Date.now() };
        return getPlayerExchangeError('HALL_RESULT_UNKNOWN');
    }
    return getPlayerExchangeError(error);
}

/** True while a hall trade's result is unknown for the account signed in now. Only a save revision above the one the request was sent
 * with ends it: a cloud load after the trade went through, or a successful push (which the server's revision check refuses after a
 * committed trade). lastCloudSyncAt does not: it is stamped before the network on page exit and moved by merged snapshots. Another
 * game object alone (an offline replay settling) does not either. Other accounts are not held. */
function isHallResultUnknown() {
    let held = playerExchangeState.uncertain, userId = cloudState.user && cloudState.user.id;
    // A server read after the failure that still shows the revision the request was sent with: the trade did not go through.
    const unchanged = cloudState.lastRemoteCheckedAt > held?.at && cloudState.lastRemoteRevision === held.revision;
    return !!held && held.userId === userId && !unchanged && !(Number(game.saveMeta && game.saveMeta.cloudRevision) > held.revision);
}

async function reloadPlayerExchangeData() {
    let userId = cloudState.user && cloudState.user.id;
    let data = await cloudJsonRequest('/rest/v1/rpc/get_player_hall', { method: 'POST', expectedUserId: userId, body: {} });
    // Another account signed in while the rows came: they belong to the old account and are dropped.
    if (!userId || (cloudState.user && cloudState.user.id) !== userId) return;
    // Existing shows keep their server price, score and identity. Their detached display items follow current equipment names and
    // base rules, so the card agrees with the item receive() will put in the bag without rewriting the server's listing.
    const displayed = { ...data };
    for (const key of ['listings', 'mine']) {
        if (!Array.isArray(data && data[key])) continue;
        displayed[key] = data[key].map(row => row && row.item ? { ...row, item: normalizeItem(JSON.parse(JSON.stringify(row.item))) } : row);
    }
    playerExchangeState.data = displayed;
    playerExchangeState.dataUserId = userId;
}

function setPlayerExchangeMessage(message) {
    playerExchangeState.message = message;
    renderPlayerExchange();
}

function getPlayerHallListings() {
    let data = getPlayerHallData();
    return Array.isArray(data && data.listings) ? data.listings : [];
}

function selectPlayerHallItem(itemId) {
    playerExchangeState.selectedItemId = Number(itemId);
    renderPlayerExchange();
}

/** Opens a show's full card and purchase above the list: a phone has no hover tooltip, so the options were bought unseen. */
function selectPlayerHallListing(listingId) {
    playerExchangeState.selectedListingId = Number(listingId);
    renderPlayerExchange();
    document.querySelector('#map-player-hall .hall-detail')?.scrollIntoView({ block: 'nearest' });
}

/** A hall item's full card: the profile card (js/social.js) fed its own snapshot, built once per render for key. A raw save item left
 * out the requirement, grade, oil and ember lines that card reads from the snapshot. '' when key was not drawn this render. */
function getPlayerHallItemCard(key) {
    let item = playerExchangeState.itemTips.get(String(key));
    if (!item || typeof renderProfileItemCard !== 'function') return '';
    if (!playerExchangeState.tipCards.has(String(key))) {
        playerExchangeState.tipCards.set(String(key), renderProfileItemCard(typeof buildItemSnapshot === 'function' ? buildItemSnapshot(item) : item));
    }
    return playerExchangeState.tipCards.get(String(key));
}

function showPlayerHallTooltip(event, tipKey) {
    if (uiDisplay.matches('(max-width: 700px)')) return;
    let item = playerExchangeState.itemTips.get(String(tipKey)), card = getPlayerHallItemCard(tipKey);
    if (card) showInfoTooltipHtml(event.clientX, event.clientY, card, getRarityColor(item.rarity));
}

function hallTipAttrs(key) {
    let arg = escapeHTML(key);
    return `onmouseenter="showPlayerHallTooltip(event,'${arg}')" onmousemove="showPlayerHallTooltip(event,'${arg}')" onmouseleave="hideInfoTooltip()"`;
}

/** An item's name with its slot, rarity and tier, and metaHtml under them. */
function hallItemText(item, metaHtml) {
    let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
    return `<span class="hall-item-text"><strong>${escapeHTML(item.name || '이름 없는 장비')}</strong><small>${escapeHTML(weaponCategorySlotLabel(item, item.slot || ''))}, ${item.rarity === 'unique' ? '고유' : '희귀'}, T${tier}</small>${metaHtml || ''}</span>`;
}

function renderHallItemCard(item, key, actionHtml, metaHtml) {
    playerExchangeState.itemTips.set(String(key), item);
    return `<article class="player-trade-item hall-item" style="--trade-rarity:${getRarityColor(item.rarity)}" ${hallTipAttrs(key)}>${hallItemText(item, metaHtml)}${actionHtml}</article>`;
}

/** A show in the hall list: pressed, its card and purchase open above the list (renderHallListingDetail). */
function renderHallListingCard(row) {
    let item = row.item || {}, key = `hall-${row.id}`, selected = Number(row.id) === Number(playerExchangeState.selectedListingId);
    playerExchangeState.itemTips.set(key, item);
    let state = hallListingCaption(row);
    let meta = `<small class="hall-appraisal">감정 ${Number(row.score || 0).toLocaleString()}, 전시자 명예 +${Number(row.honorPerCopy || 0)}</small>`;
    return `<button type="button" class="player-trade-item hall-item hall-pick${selected ? ' is-selected' : ''}" style="--trade-rarity:${getRarityColor(item.rarity)}"
        aria-pressed="${selected}" onclick="hideInfoTooltip();selectPlayerHallListing(${Number(row.id)})" ${hallTipAttrs(key)}>${hallItemText(item, meta)}
        <span class="player-trade-price"><b>황금률 ${Number(row.price || 0).toLocaleString()}</b><span>${escapeHTML(row.curatorName || '익명')}, ${state}</span></span></button>`;
}

function hallListingCaption(row) {
    if (getHallListingClosedReason(row)) return row.isMine ? '내 전시품' : row.alreadyCollected ? '소장 완료' : '전시 닫힘';
    return `${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)} 소장`;
}

/** The chosen show: its full card with the comparison against the worn gear, its price and the purchase, with why it cannot be bought
 * when it cannot. visibleRows: the browsed list, to say when the chosen show is hidden by it. */
function renderHallListingDetail(visibleRows) {
    let id = playerExchangeState.selectedListingId;
    if (id === null) return getPlayerHallListings().length ? '<p class="hall-detail-empty">전시품을 누르면 옵션과 현재 장비 비교를 보고 살 수 있습니다.</p>' : '';
    let row = getPlayerHallListings().find(entry => Number(entry.id) === Number(id));
    if (!row) return '<p class="hall-detail-empty">고른 전시품은 전시가 끝났거나 지금 받은 목록에 없습니다.</p>';
    let key = `hall-${row.id}`;
    playerExchangeState.itemTips.set(key, row.item || {});
    return `<div class="hall-detail"><div class="hall-detail-card">${getPlayerHallItemCard(key)}${hallCompareHtml(row)}</div>${hallDealHtml(row, visibleRows.includes(row))}</div>`;
}

/** The chosen show's terms: who shows it and its copies, a word when the browse hides it (visible false), its price, why it cannot be
 * bought when it cannot, and the purchase. */
function hallDealHtml(row, visible) {
    let blocked = getHallBuyBlockReason(row), price = Math.max(0, Math.floor(Number(row.price) || 0));
    let hidden = visible ? '' : '<small>지금 목록 조건에서는 보이지 않는 전시품입니다.</small>';
    let note = blocked ? `<p class="hall-detail-note" role="status">${escapeHTML(blocked)}</p>` : '';
    return `<div class="hall-detail-deal"><small>${escapeHTML(row.curatorName || '익명')}의 전시, 소장 ${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)}</small>${hidden}
        <b>황금률 ${price.toLocaleString()}</b>${note}<button type="button" onclick="buyPlayerHallReplica(${Number(row.id)})" ${blocked ? 'disabled' : ''}>귀속 복제품 구매</button></div>`;
}

/** The chosen show against the gear worn now (js/shop-view-ui.js ratingHtml, the bag analysis' verdict), worked out for that one show
 * only and kept while the show and the build (getPersistentBuildSignature) stay: a redraw does not run the stats again, and a changed
 * build or another show never shows the old verdict. */
function hallCompareHtml(row) {
    let key = `${row.id}|${getPersistentBuildSignature(game, false)}`, held = playerExchangeState.compare;
    if (held && held.key === key) return held.html;
    let rating;
    try {
        rating = shopView.ratingHtml(row.item || {}) || '<p class="hall-compare-note">지금은 착용할 수 없어 비교하지 않습니다.</p>';
    } catch (error) {
        console.warn('hall compare failed:', error);
        rating = '<p class="hall-compare-note">현재 장비와 비교하지 못했습니다.</p>';
    }
    let html = `<div class="hall-compare"><small>현재 장비와 비교</small>${rating}</div>`;
    playerExchangeState.compare = { key, html };
    return html;
}

/** The listing button names the chosen gear, or says what is missing (a trade under way, three shows up, nothing chosen). */
function renderHallRegisterButton(activeCount) {
    let item = getHallEligibleItems().find(row => Number(row.id) === Number(playerExchangeState.selectedItemId));
    let busy = playerExchangeState.loading || playerExchangeState.asking;
    let reason = busy ? '처리 중' : activeCount >= 3 ? '전시 3칸이 모두 찼습니다' : item ? '' : '전시할 장비를 고르세요';
    return `<button onclick="createPlayerHallListing()" ${reason ? 'disabled' : ''}>${reason || `[${escapeHTML(item.name || '장비')}] 서버 감정 후 전시`}</button>`;
}

function renderHallPicker() {
    let owned = getHallEligibleItems();
    if (!owned.length) return '<div class="player-exchange-empty"><span class="px-center">전시할 수 있는 희귀, 고유 장비가 없습니다. 잠근 장비, 프리셋 장비, 어느 소켓이든 주얼을 끼운 장비, 전당 소장품, 복제 이력이 있는 장비는 제외됩니다.</span></div>';
    return owned.map(item => renderHallItemCard(item, `owned-${item.id}`,
        `<button class="${Number(item.id) === Number(playerExchangeState.selectedItemId) ? 'active' : ''}" onclick="selectPlayerHallItem(${Number(item.id)})">${Number(item.id) === Number(playerExchangeState.selectedItemId) ? '선택됨' : '전당 등록 선택'}</button>`)).join('');
}

/** The shows the browse lets through, in its order: the server's (appraisal) or by price, ties by id so the order holds between draws. */
function getHallBrowsedListings() {
    let { slot, sort, query } = playerExchangeState.browse, words = query.trim().toLowerCase();
    let rows = getPlayerHallListings().filter(row => hallListingMatches(row, slot, words));
    if (sort === 'score') return rows;
    let direction = sort === 'priceAsc' ? 1 : -1;
    return rows.slice().sort((a, b) => (Number(a.price) - Number(b.price)) * direction || Number(a.id) - Number(b.id));
}

function hallListingMatches(row, slot, words) {
    let item = row.item || {};
    if (slot !== 'all' && item.slot !== slot) return false;
    return !words || `${item.name || ''} ${item.baseName || ''}`.toLowerCase().includes(words);
}

/** One browse setting from the toolbar (inline handlers): only the view under the toolbar is drawn again, so the search keeps focus. */
function setPlayerHallBrowse(key, value) {
    let text = String(value ?? '');
    let valid = (key === 'slot' && text !== '') || (key === 'sort' && Object.prototype.hasOwnProperty.call(HALL_SORTS, text))
        || (key === 'query' && text.length <= 40);
    if (!valid) return;
    playerExchangeState.browse = { ...playerExchangeState.browse, [key]: text };
    let host = document.getElementById('hall-market-view');
    if (host) host.innerHTML = renderHallMarketView();
}

function resetPlayerHallBrowse() {
    playerExchangeState.browse = { ...HALL_BROWSE_DEFAULT };
    renderPlayerExchange();
}

/** The search, the slot (only slots on show, and the chosen one) and the order; nothing while the hall shows nothing. */
function renderHallBrowseTools() {
    let listings = getPlayerHallListings(), { slot, sort, query } = playerExchangeState.browse;
    if (!listings.length) return '';
    let slots = [...new Set(listings.map(row => row.item && row.item.slot).filter(Boolean).concat(slot === 'all' ? [] : [slot]))]
        .sort((a, b) => a.localeCompare(b, 'ko'));
    let option = (value, label, chosen) => `<option value="${escapeHTML(value)}" ${chosen ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    let slotOptions = option('all', '전체 부위', slot === 'all') + slots.map(name => option(name, weaponCategorySlotLabel(null, name), name === slot)).join('');
    let sortOptions = Object.entries(HALL_SORTS).map(([value, label]) => option(value, label, value === sort)).join('');
    return `<div class="hall-browse"><input type="search" class="hall-browse-search" value="${escapeHTML(query)}" maxlength="40" placeholder="이름 검색"
        aria-label="전시품 이름 검색" oninput="setPlayerHallBrowse('query',this.value)"><select aria-label="부위" onchange="setPlayerHallBrowse('slot',this.value)">${slotOptions}</select>
        <select aria-label="정렬" onchange="setPlayerHallBrowse('sort',this.value)">${sortOptions}</select></div>`;
}

/** The chosen show's card, how many shows the browse lets through, and those shows (or why none, with a way back to all). */
function renderHallMarketView() {
    let all = getPlayerHallListings(), rows = getHallBrowsedListings();
    let list = !all.length ? '<div class="player-exchange-empty"><span class="px-center">현재 전시 중인 소장품이 없습니다.</span></div>'
        : rows.length ? rows.map(row => renderHallListingCard(row)).join('')
        : '<div class="player-exchange-empty"><span class="px-center">조건에 맞는 전시품이 없습니다.<button type="button" onclick="resetPlayerHallBrowse()">필터 초기화</button></span></div>';
    let limit = all.length >= HALL_LIST_LIMIT ? `, 감정 상위 ${HALL_LIST_LIMIT}개 안에서 찾습니다` : '';
    let count = all.length ? `<p class="hall-browse-count">${all.length}개 중 ${rows.length}개${limit}</p>` : '';
    return `${renderHallListingDetail(rows)}${count}<div class="player-trade-grid">${list}</div>`;
}

function renderMyHallListings() {
    let data = getPlayerHallData(), mine = Array.isArray(data && data.mine) ? data.mine : [];
    if (!mine.length) return '<div class="player-exchange-empty"><span class="px-center">보관 중인 전시 원본이 없습니다.</span></div>';
    return mine.map(row => renderHallItemCard(row.item || {}, `mine-${row.id}`,
        `<div class="player-trade-price"><b>${playerHallTrade.mineLabel(row)}</b><span>${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)} 소장</span><button onclick="withdrawPlayerHallListing(${Number(row.id)})" ${playerExchangeState.loading || playerExchangeState.asking ? 'disabled' : ''}>${row.status === 'open' ? '전시 종료' : '원본 회수'}</button></div>`,
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
    let data = getPlayerHallData() || {};
    let activeCount = (Array.isArray(data.mine) ? data.mine : [])
        .filter(row => ['open', 'sold_out'].includes(row.status)).length;
    let busy = playerExchangeState.loading || playerExchangeState.asking;
    return `<section class="player-exchange-card hall-summary"><header><div><strong>장비 전당</strong><small>희귀/고유 원본 전시, 서버 감정가, 귀속 복제품 최대 5개</small></div><span>명예 ${Number(data.honor || 0).toLocaleString()}, 소장 ${Number(data.collectionCount || 0).toLocaleString()}</span></header><p>희귀는 베이스 종류/티어와 옵션 티어/롤, 고유는 옵션 롤과 타락 결과까지 서버가 감정합니다. 판매자는 재화 대신 구매자마다 명예를 얻고 구매 비용은 전부 소각됩니다.</p></section>`
        + `<section class="player-exchange-card"><header><div><strong>전시 등록 ${activeCount}/3</strong><small>원본은 전시 종료 시 직접 회수할 수 있습니다.</small></div></header><div class="player-trade-register"><div class="player-trade-picker">${renderHallPicker()}</div>${renderHallRegisterButton(activeCount)}</div></section>`
        + `<section class="player-exchange-card"><header><strong>전당 소장품</strong><span class="hall-market-tools"><span>보유 황금률 ${Math.floor(game.currencies.goldenRule || 0).toLocaleString()}</span><button onclick="loadPlayerExchange()" ${busy ? 'disabled' : ''}>새로고침</button></span></header>${renderHallBrowseTools()}<div id="hall-market-view">${renderHallMarketView()}</div></section>`
        + `<section class="player-exchange-card"><header><strong>내 전시 원본</strong><span>공유 ${Number(data.copiesShared || 0).toLocaleString()}회</span></header><div class="player-trade-grid compact">${renderMyHallListings()}</div></section>`;
}

function renderPlayerExchange() {
    let hallHost = document.getElementById('map-player-hall');
    if (!hallHost) return;
    let message = playerExchangeState.message ? `<p class="player-exchange-message">${escapeHTML(playerExchangeState.message)}</p>` : '';
    hallHost.innerHTML = message + renderPlayerHallPanel();
}

safeExposeGlobals({ loadPlayerExchange, renderPlayerExchange, selectPlayerHallItem, selectPlayerHallListing,
    createPlayerHallListing, buyPlayerHallReplica, withdrawPlayerHallListing, setPlayerHallBrowse, resetPlayerHallBrowse,
    showPlayerHallTooltip, playerHallTrade });
