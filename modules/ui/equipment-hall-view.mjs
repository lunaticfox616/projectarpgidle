import { HALL_LIST_LIMIT, HALL_SORTS, HALL_BROWSE_DEFAULT } from '../state/equipment-hall.mjs';

/** Hall selection/markup. Network actions are wired by the composition entry. */
export class EquipmentHallView {
    constructor(deps, state, service) {
        this.deps = deps; this.state = state; this.service = service; this.active = true;
        this.renderMyHallStand = this.renderMyHallStand.bind(this);
    }
    dispose() { this.active = false; this.state.itemTips.clear(); this.state.tipCards.clear(); this.state.compare = null; }
    selectPlayerHallItem(itemId) {
        this.state.selectedItemId = Number(itemId);
        this.renderPlayerExchange();
    }

    /** Opens a show's full card and purchase above the list: a phone has no hover tooltip, so the options were bought unseen. */
    selectPlayerHallListing(listingId) {
        this.state.selectedListingId = Number(listingId);
        this.renderPlayerExchange();
        this.deps.document.querySelector('#map-player-hall .hall-detail')?.scrollIntoView({ block: 'nearest' });
    }

    /** A hall item's full card: the profile card (js/social.js) fed its own snapshot, built once per render for key. A raw save item left
     * out the requirement, grade, oil and ember lines that card reads from the snapshot. '' when key was not drawn this render. */
    getPlayerHallItemCard(key) {
        let item = this.state.itemTips.get(String(key));
        if (!item || typeof this.deps.renderProfileItemCard !== 'function') return '';
        if (!this.state.tipCards.has(String(key))) {
            this.state.tipCards.set(String(key), (0, this.deps.renderProfileItemCard)(typeof this.deps.buildItemSnapshot === 'function' ? (0, this.deps.buildItemSnapshot)(item) : item));
        }
        return this.state.tipCards.get(String(key));
    }

    showPlayerHallTooltip(event, tipKey) {
        if (this.deps.uiDisplay.matches('(max-width: 700px)')) return;
        let item = this.state.itemTips.get(String(tipKey)), card = this.getPlayerHallItemCard(tipKey);
        if (card) (0, this.deps.showInfoTooltipHtml)(event.clientX, event.clientY, card, (0, this.deps.getRarityColor)(item.rarity));
    }

    hallTipAttrs(key) {
        let arg = (0, this.deps.escapeHTML)(key);
        // data-info-tooltip-anchor: without it js/ui.js's mousemove guard hid the card on every move (2026-10-25)
        return `data-info-tooltip-anchor="1" data-hall-tip="${arg}"`;
    }

    /** 전시장 칸: 장비 그림과 그 밑의 받침, 희귀도 빛(css/player-exchange.css). */
    hallNicheHtml(item) {
        return `<span class="hall-niche" aria-hidden="true">${(0, this.deps.renderInventoryItemVisual)(item, 'equipment', 'hall-niche-art')}</span>`;
    }

    /** An item's name with its slot, rarity and tier, and metaHtml under them. */
    hallItemText(item, metaHtml) {
        let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
        return `<span class="hall-item-text"><strong>${(0, this.deps.escapeHTML)((0, this.deps._t)(item.name) || '이름 없는 장비')}</strong><small>${(0, this.deps.escapeHTML)((0, this.deps.weaponCategorySlotLabel)(item, item.slot || ''))}, ${item.rarity === 'unique' ? (0, this.deps._t)('고유') : (0, this.deps._t)('희귀')}, T${tier}</small>${metaHtml || ''}</span>`;
    }

    renderHallItemCard(item, key, actionHtml, metaHtml) {
        this.state.itemTips.set(String(key), item);
        return `<article class="player-trade-item hall-item" style="--trade-rarity:${(0, this.deps.getRarityColor)(item.rarity)}" ${this.hallTipAttrs(key)}>${this.hallNicheHtml(item)}${this.hallItemText(item, metaHtml)}${actionHtml}</article>`;
    }

    /** A show in the hall list: pressed, its card and purchase open above the list (renderHallListingDetail). */
    renderHallListingCard(row) {
        let item = row.item || {}, key = `hall-${row.id}`, selected = Number(row.id) === Number(this.state.selectedListingId);
        this.state.itemTips.set(key, item);
        let state = this.hallListingCaption(row);
        let meta = `<small class="hall-appraisal">${(0, this.deps._t)('감정 {score}, 전시자 명예 +{honorPerCopy}', { score: Number(row.score || 0).toLocaleString(), honorPerCopy: Number(row.honorPerCopy || 0) })}</small>`;
        return `<button type="button" class="player-trade-item hall-item hall-pick${selected ? ' is-selected' : ''}" style="--trade-rarity:${(0, this.deps.getRarityColor)(item.rarity)}"
            aria-pressed="${selected}" data-hall-action="select" data-hall-id="${Number(row.id)}" ${this.hallTipAttrs(key)}>${this.hallNicheHtml(item)}${this.hallItemText(item, meta)}
            <span class="player-trade-price"><b>${(0, this.deps._t)('황금률 {price}', { price: Number(row.price || 0).toLocaleString() })}</b><span>${(0, this.deps.escapeHTML)(row.curatorName || '익명')}, ${state}</span></span></button>`;
    }

    hallListingCaption(row) {
        if (this.service.getHallListingClosedReason(row)) return row.isMine ? '내 전시품' : row.alreadyCollected ? '소장 완료' : '전시 닫힘';
        return (0, this.deps._t)('{copiesSold}/{copyCap} 소장', { copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) });
    }

    /** The chosen show: its full card with the comparison against the worn gear, its price and the purchase, with why it cannot be bought
     * when it cannot. visibleRows: the browsed list, to say when the chosen show is hidden by it. */
    renderHallListingDetail(visibleRows) {
        let id = this.state.selectedListingId;
        if (id === null) return '';
        let row = this.service.getPlayerHallListings().find(entry => Number(entry.id) === Number(id));
        if (!row) return '<p class="hall-detail-empty">고른 전시품은 전시가 끝났거나 지금 받은 목록에 없습니다.</p>';
        let key = `hall-${row.id}`;
        this.state.itemTips.set(key, row.item || {});
        return `<div class="hall-detail"><div class="hall-detail-card">${this.getPlayerHallItemCard(key)}${this.hallCompareHtml(row)}</div>${this.hallDealHtml(row, visibleRows.includes(row))}</div>`;
    }

    /** The chosen show's terms: who shows it and its copies, a word when the browse hides it (visible false), its price, why it cannot be
     * bought when it cannot, and the purchase. */
    hallDealHtml(row, visible) {
        let blocked = this.service.getHallBuyBlockReason(row), price = Math.max(0, Math.floor(Number(row.price) || 0));
        let hidden = visible ? '' : '<small>지금 목록 조건에서는 보이지 않는 전시품입니다.</small>';
        let note = blocked ? `<p class="hall-detail-note" role="status">${(0, this.deps.escapeHTML)(blocked)}</p>` : '';
        return `<div class="hall-detail-deal"><small>${(0, this.deps.escapeHTML)(row.curatorName || '익명')}의 전시, 소장 ${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)}</small>${hidden}
            <b>${(0, this.deps._t)('황금률 {price}', { price: price.toLocaleString() })}</b>${note}<button type="button" data-hall-action="buy" data-hall-id="${Number(row.id)}" ${blocked ? 'disabled' : ''}>${(0, this.deps._t)('귀속 복제품 구매')}</button></div>`;
    }

    /** The chosen show against the gear worn now (js/shop-view-ui.js ratingHtml, the bag analysis' verdict), worked out for that one show
     * only and kept while the show and the build (getPersistentBuildSignature) stay: a redraw does not run the stats again, and a changed
     * build or another show never shows the old verdict. */
    hallCompareHtml(row) {
        let key = `${row.id}|${(0, this.deps.getPersistentBuildSignature)(this.deps.game, false)}`, held = this.state.compare;
        if (held && held.key === key) return held.html;
        let rating;
        try {
            rating = this.deps.shopView.ratingHtml(row.item || {}) || '<p class="hall-compare-note">지금은 착용할 수 없어 비교하지 않습니다.</p>';
        } catch (error) {
            this.deps.console.warn('hall compare failed:', error);
            rating = '<p class="hall-compare-note">현재 장비와 비교하지 못했습니다.</p>';
        }
        let html = `<div class="hall-compare"><small>${(0, this.deps._t)('현재 장비와 비교')}</small>${rating}</div>`;
        this.state.compare = { key, html };
        return html;
    }

    /** 내 전시(2026-11-06): three display stands in one row. My shows first (with their withdraw), then the chosen gear with its listing
     * button and 다른 장비 고르기, then 등록 (opens the bag picker, js/market-ui.js openHallPicker) and empty stands up to three shows. */
    renderHallStands(data, activeCount) {
        let mine = Array.isArray(data.mine) ? data.mine : [], busy = this.state.loading || this.state.asking;
        let item = this.service.getHallEligibleItems().find(row => Number(row.id) === Number(this.state.selectedItemId));
        let stands = mine.map(this.renderMyHallStand);
        if (item && activeCount < 3) stands.push(`<div class="hall-stand is-chosen">${this.renderHallItemCard(item, `owned-${item.id}`, '')}<div class="hall-stand-actions">${this.renderHallRegisterButton(activeCount)}<button type="button" data-hall-action="choose" ${busy ? 'disabled' : ''}>${(0, this.deps._t)('다른 장비 고르기')}</button></div></div>`);
        for (let open = activeCount + (item ? 1 : 0), first = true; open < 3; open += 1, first = false) {
            stands.push(first ? `<button type="button" class="hall-stand is-empty is-register" data-hall-action="choose" ${busy ? 'disabled' : ''}><b>+</b>${(0, this.deps._t)('등록')}</button>`
                : `<div class="hall-stand is-empty" aria-hidden="true">${(0, this.deps._t)('빈 전시대')}</div>`);
        }
        return `<div class="hall-stands">${stands.join('')}</div>`;
    }

    /** The listing button, or what is missing (a trade under way, three shows up, nothing chosen). */
    renderHallRegisterButton(activeCount) {
        let item = this.service.getHallEligibleItems().find(row => Number(row.id) === Number(this.state.selectedItemId));
        let busy = this.state.loading || this.state.asking;
        let reason = busy ? '처리 중' : activeCount >= 3 ? '전시 3칸이 모두 찼습니다' : item ? '' : '전시할 장비를 고르세요';
        return `<button class="hall-list-confirm" data-hall-action="list" ${reason ? 'disabled' : ''}>${reason ? (0, this.deps._t)(reason) : (0, this.deps._t)('서버 감정 후 전시')}</button>`; // 이름은 위 카드에 있다
    }

    /** The shows the browse lets through, in its order: the server's (appraisal) or by price, ties by id so the order holds between draws. */
    getHallBrowsedListings() {
        let { slot, sort, query } = this.state.browse, words = query.trim().toLowerCase();
        let rows = this.service.getPlayerHallListings().filter(row => this.hallListingMatches(row, slot, words));
        if (sort === 'score') return rows;
        let direction = sort === 'priceAsc' ? 1 : -1;
        return rows.slice().sort((a, b) => (Number(a.price) - Number(b.price)) * direction || Number(a.id) - Number(b.id));
    }

    hallListingMatches(row, slot, words) {
        let item = row.item || {};
        if (slot !== 'all' && item.slot !== slot) return false;
        return !words || `${item.name || ''} ${item.baseName || ''}`.toLowerCase().includes(words);
    }

    /** One browse setting from the toolbar (inline handlers): only the view under the toolbar is drawn again, so the search keeps focus. */
    setPlayerHallBrowse(key, value) {
        let text = String(value ?? '');
        let valid = (key === 'slot' && text !== '') || (key === 'sort' && Object.prototype.hasOwnProperty.call(HALL_SORTS, text))
            || (key === 'query' && text.length <= 40);
        if (!valid) return;
        this.state.browse = { ...this.state.browse, [key]: text };
        let host = this.deps.document.getElementById('hall-market-view');
        if (host) host.innerHTML = this.renderHallMarketView();
    }

    resetPlayerHallBrowse() {
        this.state.browse = { ...HALL_BROWSE_DEFAULT };
        this.renderPlayerExchange();
    }

    /** The search, the slot (only slots on show, and the chosen one) and the order; nothing while the hall shows nothing. */
    renderHallBrowseTools() {
        let listings = this.service.getPlayerHallListings(), { slot, sort, query } = this.state.browse;
        if (!listings.length) return '';
        let slots = [...new Set(listings.map(row => row.item && row.item.slot).filter(Boolean).concat(slot === 'all' ? [] : [slot]))]
            .sort((a, b) => a.localeCompare(b, this.deps.i18n.locale));
        let option = (value, label, chosen) => `<option value="${(0, this.deps.escapeHTML)(value)}" ${chosen ? 'selected' : ''}>${(0, this.deps.escapeHTML)(label)}</option>`;
        let slotOptions = option('all', '전체 부위', slot === 'all') + slots.map(name => option(name, (0, this.deps.weaponCategorySlotLabel)(null, name), name === slot)).join('');
        let sortOptions = Object.entries(HALL_SORTS).map(([value, label]) => option(value, label, value === sort)).join('');
        return `<div class="hall-browse"><input type="search" class="hall-browse-search" value="${(0, this.deps.escapeHTML)(query)}" maxlength="40" placeholder="${(0, this.deps._t)('이름 검색')}"
            aria-label="${(0, this.deps._t)('전시품 이름 검색')}" data-hall-filter="query"><select aria-label="${(0, this.deps._t)('부위')}" data-hall-filter="slot">${slotOptions}</select>
            <select aria-label="${(0, this.deps._t)('정렬')}" data-hall-filter="sort">${sortOptions}</select></div>`;
    }

    /** The chosen show's card, how many shows the browse lets through, and those shows (or why none, with a way back to all). */
    renderHallMarketView() {
        let all = this.service.getPlayerHallListings(), rows = this.getHallBrowsedListings();
        let list = !all.length ? '<div class="player-exchange-empty"><span class="px-center">현재 전시 중인 소장품이 없습니다.</span></div>'
            : rows.length ? rows.map(row => this.renderHallListingCard(row)).join('')
            : '<div class="player-exchange-empty"><span class="px-center">조건에 맞는 전시품이 없습니다.<button type="button" data-hall-action="reset">필터 초기화</button></span></div>';
        let limit = all.length >= HALL_LIST_LIMIT ? (0, this.deps._t)(', 감정 상위 {HALL_LIST_LIMIT}개 안에서 찾습니다', { HALL_LIST_LIMIT }) : '';
        let hint = this.state.selectedListingId === null ? `<span>${(0, this.deps._t)('전시품을 누르면 옵션과 현재 장비 비교를 보고 살 수 있습니다.')}</span>` : '';
        let count = all.length ? `<p class="hall-browse-count"><span>${(0, this.deps._t)('{length}개 중 {length2}개{limit}', { length: all.length, length2: rows.length, limit })}</span>${hint}</p>` : '';
        return `${this.renderHallListingDetail(rows)}${count}<div class="player-trade-grid">${list}</div>`;
    }

    /** One of my shows on its stand: the card, its state, copies and withdraw. */
    renderMyHallStand(row) {
        return `<div class="hall-stand is-mine">${this.renderHallItemCard(row.item || {}, `mine-${row.id}`,
            `<div class="player-trade-price"><b>${this.hallMineLabel(row)}</b><span>${(0, this.deps._t)('{copiesSold}/{copyCap} 소장', { copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) })}</span><button data-hall-action="withdraw" data-hall-id="${Number(row.id)}" ${this.state.loading || this.state.asking ? 'disabled' : ''}>${row.status === 'open' ? (0, this.deps._t)('전시 종료') : (0, this.deps._t)('원본 회수')}</button></div>`,
            `<small class="hall-appraisal">${(0, this.deps._t)('감정 {score}', { score: Number(row.score || 0).toLocaleString() })}</small>`)}</div>`;
    }

    /** 전당의 머리(2026-11-02 사용자: 색감, 전당이라는 웅장함; 2026-11-06 "공간효율"): 두 기둥 사이의 얇은 띠에 이름, 규칙(? 툴팁), 명예, 소장, 공유,
     * 황금률 현판을 한 줄로. */
    hallHeroHtml(plaques) {
        const cells = plaques.map(([label, value]) => `<div class="hall-plaque"><span>${(0, this.deps._t)(label)}</span><b>${Number(value || 0).toLocaleString(this.deps.i18n.locale)}</b></div>`).join('');
        const rule = `<button type="button" class="hall-rule-tip" data-tip="${(0, this.deps.escapeHTML)((0, this.deps._t)('희귀, 고유 원본을 전시하면 귀속 복제품이 최대 5개 나갑니다. 희귀는 베이스 종류/티어와 옵션 티어/롤, 고유는 옵션 롤과 타락 결과까지 서버가 감정합니다. 판매자는 재화 대신 구매자마다 명예를 얻고 구매 비용은 전부 소각됩니다.'))}" aria-label="${(0, this.deps.escapeHTML)((0, this.deps._t)('장비 전당 규칙'))}">?</button>`;
        return `<header class="hall-hero"><div class="hall-hero-title"><h2>${(0, this.deps._t)('장비 전당')}</h2>${rule}</div>${cells ? `<div class="hall-plaques">${cells}</div>` : ''}</header>`;
    }

    /** 전당을 못 여는 까닭: 로그인 전이면 로그인 단추, 로그인했는데 서버가 준비 전이면 기다려 달라는 말. */
    playerHallUnavailableHtml() {
        return this.hallHeroHtml([]) + this.playerHallUnavailableNote();
    }

    playerHallUnavailableNote() {
        if (this.deps.cloudState && this.deps.cloudState.user) return '<div class="player-exchange-empty"><span class="px-center">장비 전당 서버를 준비 중입니다. 잠시 후 다시 열어주세요.</span></div>';
        return '<div class="player-exchange-empty"><span class="px-center">장비 전당은 클라우드 로그인 후 이용할 수 있습니다.<button type="button" data-hall-action="login">로그인 화면 열기</button></span></div>';
    }

    renderPlayerHallPanel() {
        if (!this.service.isPlayerExchangeServerReady()) return this.playerHallUnavailableHtml();
        this.state.itemTips.clear();
        this.state.tipCards.clear();
        let data = this.service.getPlayerHallData() || {};
        let activeCount = (Array.isArray(data.mine) ? data.mine : [])
            .filter(row => ['open', 'sold_out'].includes(row.status)).length;
        let busy = this.state.loading || this.state.asking;
        const plaques = [['명예', data.honor], ['소장', data.collectionCount], ['공유', data.copiesShared], ['보유 황금률', this.deps.game.currencies.goldenRule]];
        return this.hallHeroHtml(plaques)
            + `<section class="player-exchange-card is-register"><header><div><strong>${(0, this.deps._t)('내 전시 {activeCount}/3', { activeCount })}</strong><small>${(0, this.deps._t)('원본은 전시 종료 시 직접 회수할 수 있습니다.')}</small></div></header>${this.renderHallStands(data, activeCount)}</section>`
            + `<section class="player-exchange-card is-market"><header><strong>${(0, this.deps._t)('전당 소장품')}</strong>${this.renderHallBrowseTools()}<span class="hall-market-tools"><button data-hall-action="refresh" ${busy ? 'disabled' : ''}>${(0, this.deps._t)('새로고침')}</button></span></header><div id="hall-market-view">${this.renderHallMarketView()}</div></section>`;
    }

    renderPlayerExchange() {
        if (!this.active) return;
        let hallHost = this.deps.document.getElementById('map-player-hall');
        if (!hallHost) return;
        let message = this.state.message ? `<p class="player-exchange-message">${(0, this.deps.escapeHTML)(this.state.message)}</p>` : '';
        hallHost.innerHTML = message + this.renderPlayerHallPanel();
    }

    /** My listing's price box: its price while on show, '복제 한도 완료' once every copy went, '전시 닫힘' when it closed before that
     * (an operator's hold closes open listings, db/anti-cheat.sql admin_set_cheat_hold). */
    hallMineLabel(row) {
        if (row.status !== 'sold_out') return (0, this.deps._t)('황금률 {price}', { price: Number(row.price || 0).toLocaleString() });
        return Number(row.copiesSold || 0) >= Number(row.copyCap || 5) ? '복제 한도 완료' : '전시 닫힘';
    }
}
