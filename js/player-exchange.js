const playerExchangeState = {
    section: 'ghost', data: null, loading: false, message: '', selectedItemId: null, itemTips: new Map()
};

function isPlayerExchangeServerReady() {
    return !!(cloudState && cloudState.configured && cloudState.user && cloudState.user.id
        && cloudState.revisionSupported === true);
}

function getPlayerExchangeError(error) {
    let raw = String(error && error.message || error || '알 수 없는 오류');
    if (/PGRST202|function[^\n]*get_player_hall[^\n]*does not exist|relation[^\n]*hall_listings[^\n]*does not exist/i.test(raw)) {
        return '장비 전당 서버 SQL이 아직 적용되지 않았습니다.';
    }
    let messages = {
        AUTH_REQUIRED: '클라우드 로그인이 필요합니다.', CLOUD_SAVE_NOT_FOUND: '먼저 클라우드 저장을 완료해주세요.',
        CLOUD_REVISION_CONFLICT: '다른 기기에서 저장이 변경되었습니다. 클라우드 저장을 다시 불러와주세요.',
        HALL_LISTING_LIMIT: '전당에는 동시에 장비를 3개까지만 전시할 수 있습니다.',
        HALL_RATE_LIMIT: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.', HALL_LISTING_DAILY_LIMIT: '오늘의 전당 등록 한도에 도달했습니다.',
        HALL_DAILY_LIMIT: '오늘의 전당 구매 한도에 도달했습니다.',
        HALL_ITEM_NOT_FOUND: '서버 저장에서 장비를 찾지 못했습니다.', HALL_ITEM_REJECTED: '희귀·고유 장비만 전당에 등록할 수 있습니다.',
        HALL_ITEM_KEY_CONFLICT: '같은 서버 식별자를 가진 장비가 둘 이상 발견되어 등록을 중단했습니다.',
        HALL_RELIST_BLOCKED: '한 번이라도 복제된 원본은 전당에 다시 등록할 수 없습니다.',
        HALL_SOCKET_NOT_EMPTY: '심연 주얼이 장착된 장비는 전당에 등록할 수 없습니다.', HALL_ITEM_OWNERSHIP: '장비의 서버 소유권을 확인할 수 없습니다.',
        HALL_LISTING_NOT_ACTIVE: '전시가 종료되었거나 회수된 장비입니다.', HALL_SELF_PURCHASE: '자신이 전시한 장비는 구매할 수 없습니다.',
        HALL_ALREADY_COLLECTED: '같은 전시품은 계정당 한 번만 구매할 수 있습니다.', HALL_CURRENCY_SHORTAGE: '황금률이 부족합니다.',
        HALL_INVENTORY_FULL: '인벤토리 공간이 부족합니다.', RANKING_DAILY_LIMIT: '랭킹 기록은 한국 시간 기준 하루에 한 번 등록할 수 있습니다.'
    };
    let code = Object.keys(messages).find(key => raw.includes(key));
    return code ? messages[code] : raw;
}

function hasSocketedHallJewel(item) {
    return Array.isArray(item && item.abyssSockets) && item.abyssSockets.some(socket => socket && socket.jewel);
}

function getHallEligibleItems() {
    return (game.inventory || []).filter(item => item && Number.isFinite(Number(item.id))
        && ['rare', 'unique'].includes(item.rarity) && (item.baseId || item.baseName) && !item.locked && !item.tradeLocked
        && !item.hallReplica && !item.hallRelistBlocked && !hasSocketedHallJewel(item)
        && !(typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item.id)));
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

function applyPlayerExchangeServerState(result, mutation) {
    if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error('전당 서버 응답에 저장 리비전이 없습니다.');
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
    if (!isPlayerExchangeServerReady()) throw new Error('전당 서버 SQL 적용과 클라우드 로그인이 필요합니다.');
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
    await preparePlayerExchangeMutation('hall-appraisal');
    let quote = await cloudJsonRequest('/rest/v1/rpc/quote_hall_item', {
        method: 'POST', body: { p_item_key: itemKey, p_expected_revision: getPlayerExchangeRevision() }
    });
    return { itemKey, quote };
}

async function confirmHallListing(item, quote) {
    if (typeof requestGameConfirmation !== 'function') return true;
    let price = Math.max(0, Math.floor(Number(quote.price) || 0));
    let score = Math.max(0, Math.floor(Number(quote.score) || 0));
    return requestGameConfirmation(
        `[${item.name}] 감정 점수 ${score.toLocaleString()} · 복제품 구매가 황금률 ${price.toLocaleString()}개\n등록 중 원본은 전당이 보관하며, 회수 전까지 최대 5명이 귀속 복제품을 구매할 수 있습니다.`,
        { title: '장비 전당 감정', confirmText: '이 가격으로 전시' });
}

async function createPlayerHallListing() {
    if (playerExchangeState.loading) return;
    let item = getHallEligibleItems().find(row => Number(row.id) === Number(playerExchangeState.selectedItemId));
    if (!item) return setPlayerExchangeMessage('전당에 전시할 희귀 또는 고유 장비를 선택해주세요.');
    playerExchangeState.loading = true;
    renderPlayerExchange();
    try {
        let appraisal = await requestHallItemQuote(item);
        if (!await confirmHallListing(item, appraisal.quote)) {
            playerExchangeState.message = '감정만 완료하고 전시는 취소했습니다.';
            return;
        }
        let result = await cloudJsonRequest('/rest/v1/rpc/create_hall_listing', {
            method: 'POST', body: { p_item_key: appraisal.itemKey, p_expected_revision: getPlayerExchangeRevision() }
        });
        applyPlayerExchangeServerState(result, () => {
            game.inventory = (game.inventory || []).filter(row => row && row.tradeKey !== appraisal.itemKey);
            playerExchangeState.selectedItemId = null;
        });
        playerExchangeState.message = `감정 점수 ${Number(result.score).toLocaleString()} · 황금률 ${Number(result.price).toLocaleString()}개로 전시했습니다.`;
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
    let accepted = typeof requestGameConfirmation !== 'function' || await requestGameConfirmation(
        `[${listing.item && listing.item.name || '장비'}]의 귀속 복제품을 황금률 ${Number(listing.price).toLocaleString()}개에 구매합니다.\n구매한 장비는 재판매하거나 전당에 다시 등록할 수 없습니다.`,
        { title: '전당 소장품 구매', confirmText: '구매' });
    if (!accepted) return;
    await runPlayerExchangeMutation('hall-purchase', '/rest/v1/rpc/buy_hall_replica', {
        p_listing_id: Number(listingId)
    }, result => {
        if (!(game.inventory || []).some(item => item && item.tradeKey === result.item.tradeKey)) game.inventory.push(result.item);
        game.currencies.goldenRule = Math.max(0, Math.floor(Number(result.goldenRule) || 0));
    }, '전당 소장품을 구매했습니다. 이 복제품은 계정에 귀속됩니다.');
}

async function withdrawPlayerHallListing(listingId) {
    await runPlayerExchangeMutation('hall-withdraw', '/rest/v1/rpc/withdraw_hall_listing', {
        p_listing_id: Number(listingId)
    }, result => {
        if (!(game.inventory || []).some(item => item && item.tradeKey === result.item.tradeKey)) game.inventory.push(result.item);
    }, '전시를 종료하고 원본 장비를 돌려받았습니다.');
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
    playerExchangeState.data = await cloudJsonRequest('/rest/v1/rpc/get_player_hall', { method: 'POST', body: {} });
}

function setPlayerExchangeMessage(message) {
    playerExchangeState.message = message;
    renderPlayerExchange();
}

function switchPlayerArenaSection(section) {
    playerExchangeState.section = ['ghost', 'hall', 'ranking'].includes(section) ? section : 'ghost';
    document.querySelectorAll('.player-arena-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.arenaPanel === playerExchangeState.section));
    document.querySelectorAll('.player-arena-tab').forEach(button => button.classList.toggle('active', button.dataset.arenaTab === playerExchangeState.section));
    if (playerExchangeState.section === 'ghost' && typeof renderGhostArena === 'function') renderGhostArena();
    if (playerExchangeState.section !== 'ghost') loadPlayerExchange();
}

function getPlayerHallListings() {
    return Array.isArray(playerExchangeState.data && playerExchangeState.data.listings) ? playerExchangeState.data.listings : [];
}

function selectPlayerHallItem(itemId) {
    playerExchangeState.selectedItemId = Number(itemId);
    renderPlayerExchange();
}

function showPlayerHallTooltip(event, tipKey) {
    let item = playerExchangeState.itemTips.get(String(tipKey));
    if (!item || typeof renderProfileItemCard !== 'function') return;
    showInfoTooltipHtml(event.clientX, event.clientY, renderProfileItemCard(item), getRarityColor(item.rarity));
}

function renderHallItemCard(item, key, actionHtml, metaHtml) {
    playerExchangeState.itemTips.set(String(key), item);
    let color = getRarityColor(item.rarity);
    let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
    return `<article class="player-trade-item hall-item" style="--trade-rarity:${color}" onmouseenter="showPlayerHallTooltip(event,'${escapeHTML(key)}')" onmousemove="showPlayerHallTooltip(event,'${escapeHTML(key)}')" onmouseleave="hideInfoTooltip()"><div><strong>${escapeHTML(item.name || '이름 없는 장비')}</strong><small>${escapeHTML(item.slot || '')} · ${item.rarity === 'unique' ? '고유' : '희귀'} · T${tier}</small>${metaHtml || ''}</div>${actionHtml}</article>`;
}

function renderHallListingAction(row) {
    let disabled = row.isMine || row.alreadyCollected || playerExchangeState.loading;
    let buttonText = row.isMine ? '내 전시품' : (row.alreadyCollected ? '소장 완료' : '구매');
    return `<div class="player-trade-price"><b>황금률 ${Number(row.price || 0).toLocaleString()}</b><span>${escapeHTML(row.curatorName || '익명')} · ${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)}</span><button onclick="buyPlayerHallReplica(${Number(row.id)})" ${disabled ? 'disabled' : ''}>${buttonText}</button></div>`;
}

function renderHallPicker() {
    let owned = getHallEligibleItems();
    if (!owned.length) return '<div class="player-exchange-empty">전시 가능한 희귀·고유 장비가 없습니다. 잠금·프리셋·심연 주얼 장착·복제 이력 장비는 제외됩니다.</div>';
    return owned.map(item => renderHallItemCard(item, `owned-${item.id}`,
        `<button class="${Number(item.id) === Number(playerExchangeState.selectedItemId) ? 'active' : ''}" onclick="selectPlayerHallItem(${Number(item.id)})">${Number(item.id) === Number(playerExchangeState.selectedItemId) ? '선택됨' : '전당 등록 선택'}</button>`)).join('');
}

function renderHallMarket() {
    let listings = getPlayerHallListings();
    if (!listings.length) return '<div class="player-exchange-empty">현재 전시 중인 소장품이 없습니다.</div>';
    return listings.map(row => renderHallItemCard(row.item || {}, `hall-${row.id}`, renderHallListingAction(row),
        `<small class="hall-appraisal">감정 ${Number(row.score || 0).toLocaleString()} · 전시자 명예 +${Number(row.honorPerCopy || 0)}</small>`)).join('');
}

function renderMyHallListings() {
    let mine = Array.isArray(playerExchangeState.data && playerExchangeState.data.mine) ? playerExchangeState.data.mine : [];
    if (!mine.length) return '<div class="player-exchange-empty">보관 중인 전시 원본이 없습니다.</div>';
    return mine.map(row => renderHallItemCard(row.item || {}, `mine-${row.id}`,
        `<div class="player-trade-price"><b>${row.status === 'sold_out' ? '복제 한도 완료' : `황금률 ${Number(row.price || 0).toLocaleString()}`}</b><span>${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)} 소장</span><button onclick="withdrawPlayerHallListing(${Number(row.id)})" ${playerExchangeState.loading ? 'disabled' : ''}>전시 종료·회수</button></div>`,
        `<small class="hall-appraisal">감정 ${Number(row.score || 0).toLocaleString()}</small>`)).join('');
}

function renderPlayerHallPanel() {
    if (!isPlayerExchangeServerReady()) return '<div class="player-exchange-empty">클라우드 로그인과 전당 SQL 적용 후 이용할 수 있습니다.</div>';
    playerExchangeState.itemTips.clear();
    let data = playerExchangeState.data || {};
    let activeCount = (Array.isArray(data.mine) ? data.mine : [])
        .filter(row => ['open', 'sold_out'].includes(row.status)).length;
    return `<section class="player-exchange-card hall-summary"><header><div><strong>장비 전당</strong><small>희귀·고유 원본 전시 · 서버 감정가 · 귀속 복제품 최대 5개</small></div><span>명예 ${Number(data.honor || 0).toLocaleString()} · 소장 ${Number(data.collectionCount || 0).toLocaleString()}</span></header><p>희귀는 베이스 종류·티어와 옵션 티어/롤, 고유는 옵션 롤과 타락 결과까지 서버가 감정합니다. 판매자는 재화 대신 구매자마다 명예를 얻고 구매 비용은 전부 소각됩니다.</p></section><section class="player-exchange-card"><header><div><strong>전시 등록 ${activeCount}/3</strong><small>원본은 전시 종료 시 직접 회수할 수 있습니다.</small></div><span>보유 황금률 ${Math.floor(game.currencies.goldenRule || 0).toLocaleString()}</span></header><div class="player-trade-register"><div class="player-trade-picker">${renderHallPicker()}</div><button onclick="createPlayerHallListing()" ${playerExchangeState.loading || activeCount >= 3 ? 'disabled' : ''}>서버 감정 후 전시</button></div></section><section class="player-exchange-card"><header><strong>전당 소장품</strong><button onclick="loadPlayerExchange()" ${playerExchangeState.loading ? 'disabled' : ''}>새로고침</button></header><div class="player-trade-grid">${renderHallMarket()}</div></section><section class="player-exchange-card"><header><strong>내 전시 원본</strong><span>공유 ${Number(data.copiesShared || 0).toLocaleString()}회</span></header><div class="player-trade-grid compact">${renderMyHallListings()}</div></section>`;
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
    let hallHost = document.getElementById('map-player-hall');
    let rankingHost = document.getElementById('map-player-ranking');
    if (!hallHost || !rankingHost) return;
    let message = playerExchangeState.message ? `<p class="player-exchange-message">${escapeHTML(playerExchangeState.message)}</p>` : '';
    hallHost.innerHTML = message + renderPlayerHallPanel();
    rankingHost.innerHTML = message + renderPlayerRankingPanel();
}

safeExposeGlobals({ switchPlayerArenaSection, loadPlayerExchange, renderPlayerExchange, selectPlayerHallItem,
    createPlayerHallListing, buyPlayerHallReplica, withdrawPlayerHallListing, submitPlayerRanking,
    showPlayerHallTooltip });
