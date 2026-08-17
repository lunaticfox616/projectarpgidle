const playerExchangeState = {
    section: 'ghost', data: null, loading: false, message: '', selectedItemId: null, price: 1, itemTips: new Map()
};

function isPlayerExchangeServerReady() {
    return !!(cloudState && cloudState.configured && cloudState.user && cloudState.user.id
        && cloudState.revisionSupported === true);
}

function getPlayerExchangeError(error) {
    let raw = String(error && error.message || error || '알 수 없는 오류');
    if (/PGRST202|get_player_exchange|player_trade_listings/i.test(raw)) {
        return '거래·랭킹 서버 SQL이 아직 적용되지 않았습니다.';
    }
    let messages = {
        AUTH_REQUIRED: '클라우드 로그인이 필요합니다.', CLOUD_SAVE_NOT_FOUND: '먼저 클라우드 저장을 완료해주세요.',
        CLOUD_REVISION_CONFLICT: '다른 기기에서 저장이 변경되었습니다. 클라우드 저장을 다시 불러와주세요.',
        TRADE_LISTING_LIMIT: '동시에 등록할 수 있는 판매 장비는 8개입니다.', TRADE_RATE_LIMIT: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.',
        TRADE_DAILY_LIMIT: '오늘의 거래 요청 한도에 도달했습니다.', TRADE_ITEM_NOT_FOUND: '서버 저장에서 장비를 찾지 못했습니다.',
        TRADE_ITEM_REJECTED: '잠금 또는 비정상 상태인 장비는 거래할 수 없습니다.', TRADE_ITEM_OWNERSHIP: '이 장비의 서버 소유권을 확인할 수 없습니다.',
        TRADE_LISTING_NOT_OPEN: '이미 판매되었거나 취소된 항목입니다.', TRADE_SELF_PURCHASE: '자신의 판매 항목은 구매할 수 없습니다.',
        TRADE_CURRENCY_SHORTAGE: '황금률이 부족합니다.', TRADE_INVENTORY_FULL: '인벤토리 공간이 부족합니다.',
        TRADE_NO_PROCEEDS: '수령할 판매금이 없습니다.', TRADE_CURRENCY_OVERFLOW: '황금률 보유 한도를 초과합니다.',
        RANKING_DAILY_LIMIT: '랭킹 기록은 한국 시간 기준 하루에 한 번 등록할 수 있습니다.'
    };
    let code = Object.keys(messages).find(key => raw.includes(key));
    return code ? messages[code] : raw;
}

function getTradeEligibleItems() {
    return (game.inventory || []).filter(item => item && Number.isFinite(Number(item.id)) && !item.locked && !item.tradeLocked
        && !(typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item.id)));
}

function createTradeItemKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
        throw new Error('안전한 거래 식별자를 만들 수 없는 브라우저입니다.');
    }
    let bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    let hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ensureTradeItemKey(item) {
    if (!item || typeof item !== 'object') return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.tradeKey || ''))) {
        item.tradeKey = createTradeItemKey();
    }
    return item.tradeKey;
}

function getPlayerExchangeRevision() {
    return Math.max(0, Math.floor(Number(game && game.saveMeta && game.saveMeta.cloudRevision) || 0));
}

function applyPlayerExchangeServerState(result, mutation) {
    if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error('거래 서버 응답에 저장 리비전이 없습니다.');
    mutation();
    ensureSaveMeta();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.currentRevision)));
    game.saveMeta.lastCloudSyncAt = Date.now();
    cloudState.lastRemoteRevision = game.saveMeta.cloudRevision;
    cloudState.lastRemoteUpdatedAt = game.saveMeta.lastCloudSyncAt;
    persistLocalSave({ touchModifiedAt: false });
    updateStaticUI();
}

async function preparePlayerExchangeMutation(reason) {
    if (!isPlayerExchangeServerReady()) throw new Error('거래 서버 SQL 적용과 클라우드 로그인이 필요합니다.');
    if (!saveGame({ skipCloudSync: true })) throw new Error('로컬 저장에 실패하여 거래를 중단했습니다.');
    await pushCloudSave({ touchModifiedAt: true, reason });
}

async function loadPlayerExchange() {
    if (!isPlayerExchangeServerReady() || playerExchangeState.loading) return renderPlayerExchange();
    playerExchangeState.loading = true;
    playerExchangeState.message = '';
    renderPlayerExchange();
    try {
        playerExchangeState.data = await cloudJsonRequest('/rest/v1/rpc/get_player_exchange', { method: 'POST', body: {} });
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function createPlayerTradeListing() {
    let item = getTradeEligibleItems().find(row => Number(row.id) === Number(playerExchangeState.selectedItemId));
    let priceInput = document.getElementById('player-trade-price');
    let price = Math.floor(Number(priceInput && priceInput.value) || 0);
    if (!item) return setPlayerExchangeMessage('판매할 장비를 선택해주세요.');
    if (price < 1 || price > 9999) return setPlayerExchangeMessage('가격은 황금률 1~9,999개로 설정해주세요.');
    let accepted = typeof requestGameConfirmation !== 'function' || await requestGameConfirmation(
        `[${item.name}]을 황금률 ${price}개에 등록합니다. 등록 즉시 장비가 서버 보관함으로 이동합니다.`,
        { title: 'PTP 판매 등록', confirmText: '등록' });
    if (!accepted) return;
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let itemKey = ensureTradeItemKey(item);
        await preparePlayerExchangeMutation('trade-listing');
        let result = await cloudJsonRequest('/rest/v1/rpc/create_trade_listing', {
            method: 'POST', body: { p_item_key: itemKey, p_price: price, p_expected_revision: getPlayerExchangeRevision() }
        });
        applyPlayerExchangeServerState(result, () => {
            game.inventory = (game.inventory || []).filter(row => row && row.tradeKey !== itemKey);
            playerExchangeState.selectedItemId = null;
        });
        playerExchangeState.message = '판매 항목을 등록했습니다.';
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function buyPlayerTradeListing(listingId) {
    let listing = getPlayerExchangeListings().find(row => Number(row.id) === Number(listingId));
    if (!listing) return setPlayerExchangeMessage('판매 항목을 다시 불러와주세요.');
    let accepted = typeof requestGameConfirmation !== 'function' || await requestGameConfirmation(
        `[${listing.item && listing.item.name || '장비'}]을 황금률 ${listing.price}개에 구매합니다.`,
        { title: 'PTP 장비 구매', confirmText: '구매' });
    if (!accepted) return;
    await runPlayerExchangeMutation('trade-purchase', '/rest/v1/rpc/buy_trade_listing', {
        p_listing_id: Number(listingId)
    }, result => {
        if (!(game.inventory || []).some(item => item && item.tradeKey === result.item.tradeKey)) game.inventory.push(result.item);
        game.currencies.goldenRule = Math.max(0, Math.floor(Number(result.goldenRule) || 0));
    }, '구매가 완료되었습니다.');
}

async function cancelPlayerTradeListing(listingId) {
    await runPlayerExchangeMutation('trade-cancel', '/rest/v1/rpc/cancel_trade_listing', {
        p_listing_id: Number(listingId)
    }, result => {
        if (!(game.inventory || []).some(item => item && item.tradeKey === result.item.tradeKey)) game.inventory.push(result.item);
    }, '판매 등록을 취소하고 장비를 돌려받았습니다.');
}

async function claimPlayerTradeProceeds() {
    await runPlayerExchangeMutation('trade-proceeds', '/rest/v1/rpc/claim_trade_proceeds', {}, result => {
        game.currencies.goldenRule = Math.max(0, Math.floor(Number(result.goldenRule) || 0));
    }, '판매금을 수령했습니다.');
}

async function runPlayerExchangeMutation(reason, path, body, mutation, successMessage) {
    if (playerExchangeState.loading) return;
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        await preparePlayerExchangeMutation(reason);
        let result = await cloudJsonRequest(path, {
            method: 'POST', body: { ...body, p_expected_revision: getPlayerExchangeRevision() }
        });
        applyPlayerExchangeServerState(result, () => mutation(result));
        playerExchangeState.message = successMessage;
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function submitPlayerRanking() {
    if (playerExchangeState.loading) return;
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        await preparePlayerExchangeMutation('ranking-submit');
        let stats = getPlayerStats();
        let dps = Math.max(0, Math.floor(Number(stats.totalDps) || Number(stats.dps) || 0));
        await cloudJsonRequest('/rest/v1/rpc/submit_player_ranking', {
            method: 'POST', body: { p_dps: dps, p_expected_revision: getPlayerExchangeRevision() }
        });
        playerExchangeState.message = `현재 루프와 DPS ${dps.toLocaleString()}를 갱신했습니다.`;
        await reloadPlayerExchangeData();
    } catch (error) {
        playerExchangeState.message = getPlayerExchangeError(error);
    } finally {
        playerExchangeState.loading = false;
        renderPlayerExchange();
    }
}

async function reloadPlayerExchangeData() {
    playerExchangeState.data = await cloudJsonRequest('/rest/v1/rpc/get_player_exchange', { method: 'POST', body: {} });
}

function setPlayerExchangeMessage(message) {
    playerExchangeState.message = message;
    renderPlayerExchange();
}

function switchPlayerArenaSection(section) {
    playerExchangeState.section = ['ghost', 'trade', 'ranking'].includes(section) ? section : 'ghost';
    document.querySelectorAll('.player-arena-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.arenaPanel === playerExchangeState.section));
    document.querySelectorAll('.player-arena-tab').forEach(button => button.classList.toggle('active', button.dataset.arenaTab === playerExchangeState.section));
    if (playerExchangeState.section === 'ghost' && typeof renderGhostArena === 'function') renderGhostArena();
    if (playerExchangeState.section !== 'ghost') loadPlayerExchange();
}

function getPlayerExchangeListings() {
    return Array.isArray(playerExchangeState.data && playerExchangeState.data.listings) ? playerExchangeState.data.listings : [];
}

function selectPlayerTradeItem(itemId) {
    playerExchangeState.selectedItemId = Number(itemId);
    renderPlayerExchange();
}

function setPlayerTradePrice(value) {
    playerExchangeState.price = Math.max(1, Math.min(9999, Math.floor(Number(value) || 1)));
}

function showPlayerTradeTooltip(event, tipKey) {
    let item = playerExchangeState.itemTips.get(String(tipKey));
    if (!item || typeof renderProfileItemCard !== 'function') return;
    showInfoTooltipHtml(event.clientX, event.clientY, renderProfileItemCard(item), getRarityColor(item.rarity));
}

function renderTradeItemCard(item, key, actionHtml) {
    playerExchangeState.itemTips.set(String(key), item);
    let color = getRarityColor(item.rarity);
    return `<article class="player-trade-item" style="--trade-rarity:${color}" onmouseenter="showPlayerTradeTooltip(event,'${escapeHTML(key)}')" onmousemove="showPlayerTradeTooltip(event,'${escapeHTML(key)}')" onmouseleave="hideInfoTooltip()"><div><strong>${escapeHTML(item.name || '이름 없는 장비')}</strong><small>${escapeHTML(item.slot || '')} · ${escapeHTML(item.rarity || 'normal')}</small></div>${actionHtml}</article>`;
}

function renderPlayerTradePanel() {
    if (!isPlayerExchangeServerReady()) return '<div class="player-exchange-empty">클라우드 로그인과 거래 SQL 적용 후 이용할 수 있습니다.</div>';
    playerExchangeState.itemTips.clear();
    let owned = getTradeEligibleItems();
    let picker = owned.length ? owned.map(item => renderTradeItemCard(item, `owned-${item.id}`,
        `<button class="${Number(item.id) === Number(playerExchangeState.selectedItemId) ? 'active' : ''}" onclick="selectPlayerTradeItem(${Number(item.id)})">${Number(item.id) === Number(playerExchangeState.selectedItemId) ? '선택됨' : '판매 선택'}</button>`)).join('')
        : '<div class="player-exchange-empty">거래 가능한 인벤토리 장비가 없습니다. 잠금·프리셋 장비는 제외됩니다.</div>';
    let market = getPlayerExchangeListings();
    let marketHtml = market.length ? market.map(row => renderTradeItemCard(row.item || {}, `listing-${row.id}`,
        `<div class="player-trade-price"><b>황금률 ${Number(row.price || 0).toLocaleString()}</b><span>${escapeHTML(row.sellerName || '익명')}</span><button onclick="buyPlayerTradeListing(${Number(row.id)})" ${row.isMine || playerExchangeState.loading ? 'disabled' : ''}>${row.isMine ? '내 판매' : '구매'}</button></div>`)).join('')
        : '<div class="player-exchange-empty">현재 판매 중인 장비가 없습니다.</div>';
    let mine = Array.isArray(playerExchangeState.data && playerExchangeState.data.mine) ? playerExchangeState.data.mine : [];
    let mineHtml = mine.filter(row => row.status === 'open').map(row => renderTradeItemCard(row.item || {}, `mine-${row.id}`,
        `<div class="player-trade-price"><b>황금률 ${Number(row.price || 0).toLocaleString()}</b><button onclick="cancelPlayerTradeListing(${Number(row.id)})" ${playerExchangeState.loading ? 'disabled' : ''}>회수</button></div>`)).join('') || '<div class="player-exchange-empty">등록한 판매 장비가 없습니다.</div>';
    let proceeds = Math.max(0, Math.floor(Number(playerExchangeState.data && playerExchangeState.data.unclaimedProceeds) || 0));
    let proceedsButton = proceeds > 0 ? `<button onclick="claimPlayerTradeProceeds()" ${playerExchangeState.loading ? 'disabled' : ''}>판매금 ${proceeds.toLocaleString()} 수령</button>` : '';
    return `<section class="player-exchange-card"><header><div><strong>판매 등록</strong><small>인벤토리 장비만 · 최대 8개</small></div><span>보유 황금률 ${Math.floor(game.currencies.goldenRule || 0).toLocaleString()}</span></header><div class="player-trade-register"><div class="player-trade-picker">${picker}</div><label>판매가 <input id="player-trade-price" type="number" min="1" max="9999" value="${playerExchangeState.price}" oninput="setPlayerTradePrice(this.value)"><span>황금률</span></label><button onclick="createPlayerTradeListing()" ${playerExchangeState.loading ? 'disabled' : ''}>서버 보관함에 등록</button></div></section><section class="player-exchange-card"><header><strong>전체 판매 목록</strong><button onclick="loadPlayerExchange()" ${playerExchangeState.loading ? 'disabled' : ''}>새로고침</button></header><div class="player-trade-grid">${marketHtml}</div></section><section class="player-exchange-card"><header><strong>내 판매 목록</strong>${proceedsButton}</header><div class="player-trade-grid compact">${mineHtml}</div></section>`;
}

function renderRankingRows(rows, valueKey) {
    if (!Array.isArray(rows) || rows.length <= 0) return '<div class="player-exchange-empty">등록된 기록이 없습니다.</div>';
    return rows.slice(0, 50).map((row, index) => `<div class="player-ranking-row"><b>${index + 1}</b><span><strong>${escapeHTML(row.nickname || '익명')}</strong><small>${escapeHTML(row.ascend_class || '미전직')} · ${escapeHTML(row.active_skill || '기본 공격')}</small></span><em>${valueKey === 'dps' ? Math.floor(Number(row.dps) || 0).toLocaleString() : `${Math.floor(Number(row.loop_count) || 1)} 루프`}</em></div>`).join('');
}

function renderPlayerRankingPanel() {
    if (!isPlayerExchangeServerReady()) return '<div class="player-exchange-empty">클라우드 로그인과 랭킹 SQL 적용 후 이용할 수 있습니다.</div>';
    let data = playerExchangeState.data || {};
    let submitted = data.rankingSubmittedToday === true;
    return `<section class="player-exchange-card ranking-head"><div><strong>오늘의 루프 · DPS 랭킹</strong><small>매일 00:00 KST 초기화 · 오늘 1회 등록 · 보상 없음</small></div><button onclick="submitPlayerRanking()" ${playerExchangeState.loading || submitted ? 'disabled' : ''}>${submitted ? '오늘 등록 완료' : '오늘 기록 등록'}</button></section><div class="player-ranking-columns"><section class="player-exchange-card"><header><strong>루프 순위</strong></header>${renderRankingRows(data.loopRanking, 'loop')}</section><section class="player-exchange-card"><header><strong>DPS 순위</strong></header>${renderRankingRows(data.dpsRanking, 'dps')}</section></div>`;
}

function renderPlayerExchange() {
    let tradeHost = document.getElementById('map-player-trade');
    let rankingHost = document.getElementById('map-player-ranking');
    if (!tradeHost || !rankingHost) return;
    let message = playerExchangeState.message ? `<p class="player-exchange-message">${escapeHTML(playerExchangeState.message)}</p>` : '';
    tradeHost.innerHTML = message + renderPlayerTradePanel();
    rankingHost.innerHTML = message + renderPlayerRankingPanel();
}

safeExposeGlobals({ switchPlayerArenaSection, loadPlayerExchange, renderPlayerExchange, selectPlayerTradeItem,
    setPlayerTradePrice, createPlayerTradeListing, buyPlayerTradeListing, cancelPlayerTradeListing,
    claimPlayerTradeProceeds, submitPlayerRanking, showPlayerTradeTooltip });
