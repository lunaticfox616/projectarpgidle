import { getPlayerExchangeError } from '../common/equipment-hall-errors.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** UI orchestration: confirmations/rendering around the hall's account-safe service. */
export class EquipmentHallActions {
    constructor(deps, state, service, view) {
        this.deps = deps; this.state = state; this.service = service; this.rules = service.rules; this.view = view;
        this.active = true; this.listeners = [];
        this.commands = Object.freeze({
            select: id => { (0, deps.hideInfoTooltip)(); view.selectPlayerHallListing(id); },
            buy: id => this.buyPlayerHallReplica(id),
            withdraw: id => this.withdrawPlayerHallListing(id),
            list: () => this.createPlayerHallListing(),
            refresh: () => this.loadPlayerExchange(),
            reset: () => view.resetPlayerHallBrowse(),
            choose: () => deps.marketUi.openHallPicker(),
            login: () => (0, deps.openStartupGate)({ accountOnly: true })
        });
        listenView(this, deps.document, 'click', event => this.onClick(event));
        for (const type of ['input', 'change']) listenView(this, deps.document, type, event => this.onFilter(event));
        for (const type of ['mouseover', 'mousemove', 'mouseout']) listenView(this, deps.document, type, event => this.onTooltip(event));
    }
    dispose() { releaseViewEvents(this); this.service.active = false; this.view.dispose(); }
    hallTarget(event, selector) {
        const target = event.target.closest?.(selector);
        return this.active && target?.closest('#map-player-hall') ? target : null;
    }
    async onClick(event) {
        const button = this.hallTarget(event, '[data-hall-action]');
        if (!button || button.disabled) return;
        const action = Object.prototype.hasOwnProperty.call(this.commands, button.dataset.hallAction) ? this.commands[button.dataset.hallAction] : null;
        if (!action) return;
        try { await action(Number(button.dataset.hallId)); }
        catch (error) {
            this.deps.console.error('hall action failed:', error);
            this.setPlayerExchangeMessage(getPlayerExchangeError(error));
        }
    }
    onFilter(event) {
        const control = this.hallTarget(event, '[data-hall-filter]');
        if (!control) return;
        if ((control.dataset.hallFilter === 'query') !== (event.type === 'input')) return;
        this.view.setPlayerHallBrowse(control.dataset.hallFilter, control.value);
    }
    onTooltip(event) {
        const anchor = this.hallTarget(event, '[data-hall-tip]');
        if (!anchor) return;
        if (event.type !== 'mouseout') this.view.showPlayerHallTooltip(event, anchor.dataset.hallTip);
        else if (!anchor.contains(event.relatedTarget)) (0, this.deps.hideInfoTooltip)();
    }
    getHallEligibleItems() { return this.service.getHallEligibleItems(); }
    async loadPlayerExchange() {
        if (!this.active) return;
        if (!this.service.isPlayerExchangeServerReady() || this.state.loading) return this.view.renderPlayerExchange();
        this.state.loading = true;
        this.state.message = '';
        this.view.renderPlayerExchange();
        try {
            await this.service.reloadPlayerExchangeData();
        } catch (error) {
            this.state.message = getPlayerExchangeError(error);
        } finally {
            this.state.loading = false;
            this.view.renderPlayerExchange();
        }
    }

    async confirmHallListing(item, quote) {
        if (typeof this.deps.requestGameConfirmation !== 'function') return true;
        let price = Math.max(0, Math.floor(Number(quote.price) || 0));
        let score = Math.max(0, Math.floor(Number(quote.score) || 0));
        return (0, this.deps.requestGameConfirmation)(
            `[${item.name}] 감정 점수 ${score.toLocaleString()}, 복제품 구매가 황금률 ${price.toLocaleString()}개\n등록 중 원본은 전당이 보관하며, 회수 전까지 최대 5명이 귀속 복제품을 구매할 수 있습니다.`,
            { title: (0, this.deps._t)('장비 전당 감정'), confirmLabel: (0, this.deps._t)('이 가격으로 전시') });
    }

    async createPlayerHallListing() {
        if (!this.active) return;
        if (this.state.loading || this.state.asking) return;
        let item = this.getHallEligibleItems().find(row => Number(row.id) === Number(this.state.selectedItemId));
        if (!item) return this.setPlayerExchangeMessage('전당에 전시할 희귀 또는 고유 장비를 선택해주세요.');
        let refusal = this.service.hallTradeRefusal('전시');
        if (refusal) return this.setPlayerExchangeMessage(refusal);
        let session = this.service.beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
        this.state.loading = true;
        this.view.renderPlayerExchange();
        try {
            let appraisal = await this.appraiseHallListing(item, session);
            if (!appraisal) return;
            // The hall requests stay in this controller and runPlayerExchangeMutation (the hall's network boundary).
            let result = await this.service.hallHoldCloud(async () => {
                this.service.checkHallSession(session);
                let response = await (0, this.deps.cloudJsonRequest)('/rest/v1/rpc/create_hall_listing', {
                    method: 'POST', expectedUserId: session.userId, onSend: () => Object.assign(progress, { sent: true, revision: this.service.getPlayerExchangeRevision() }), body: { p_item_key: appraisal.itemKey, p_expected_revision: this.service.getPlayerExchangeRevision() }
                });
                await this.service.applyPlayerExchangeServerState(response, this.rules.take(appraisal.itemKey), session.userId);
                if (this.active) (0, this.deps.updateStaticUI)();
                progress.applied = true;
                return response;
            });
            this.state.selectedItemId = null;
            this.service.hallNoteMine(result.listingId, { id: result.listingId, item: result.item, score: result.score, price: result.price,
                status: 'open', copiesSold: 0, copyCap: 5 });
            await this.finishHallTrade((0, this.deps._t)('감정 점수 {score}, 황금률 {price}개로 전시했습니다.', { score: Number(result.score).toLocaleString(), price: Number(result.price).toLocaleString() }));
        } catch (error) {
            this.state.message = this.service.hallTradeFailureMessage(error, progress);
        } finally {
            this.state.loading = false;
            this.view.renderPlayerExchange();
        }
    }

    /** Appraises item (quote_hall_item only reads the hall) and asks the player: the appraisal, or null when the listing stops here (the
     * message says why). */
    async appraiseHallListing(item, session) {
        let appraisal = await this.service.requestHallItemQuote(item, session);
        this.service.checkHallSession(session);
        let accepted = await this.confirmHallListing(item, appraisal.quote);
        this.service.checkHallSession(session);
        // The dialog waited for the player: the woodsman fight or an offline replay may have begun meanwhile.
        let refusal = accepted ? this.service.hallTradeRefusal('전시') : '감정만 완료하고 전시는 취소했습니다.';
        if (!refusal) return appraisal;
        this.state.message = refusal;
        return null;
    }

    /** A hall confirmation with playerExchangeState.asking set, so a second press opens no second dialog and starts no trade. */
    async askPlayerHall(text, options) {
        if (typeof this.deps.requestGameConfirmation !== 'function') return true;
        this.state.asking = true;
        this.view.renderPlayerExchange();
        try {
            return await (0, this.deps.requestGameConfirmation)(text, options);
        } finally {
            this.state.asking = false;
            this.view.renderPlayerExchange();
        }
    }

    async buyPlayerHallReplica(listingId) {
        if (!this.active) return;
        let listing = this.service.getPlayerHallListings().find(row => Number(row.id) === Number(listingId));
        if (!listing) return this.setPlayerExchangeMessage('전시 항목을 다시 불러와주세요.');
        let blocked = this.service.getHallBuyBlockReason(listing);
        if (blocked) return this.setPlayerExchangeMessage(blocked);
        let session = this.service.beginHallSession();
        let price = Math.max(0, Math.floor(Number(listing.price) || 0));
        if (!await this.askPlayerHall(`[${listing.item && listing.item.name || (0, this.deps._t)('장비')}]의 귀속 복제품을 황금률 ${price.toLocaleString()}개에 구매합니다.\n구매한 장비는 재판매하거나 전당에 다시 등록할 수 없습니다.`,
            { title: (0, this.deps._t)('전당 소장품 구매'), confirmLabel: (0, this.deps._t)('구매') })) return;
        await this.runPlayerExchangeMutation({ session, action: '구매', incoming: listing.item, reason: 'hall-purchase', path: '/rest/v1/rpc/buy_hall_replica',
            body: { p_listing_id: Number(listingId) }, successMessage: '전당 소장품을 구매했습니다. 이 복제품은 계정에 귀속됩니다.',
            mutation: result => {
                const receive = this.rules.receive(result.item);
                const pay = this.rules.pay(Math.max(0, Math.floor(Number(result.price ?? listing.price) || 0)));
                return (state, liveState) => { receive(state, liveState); pay(state); };
            }, done: result => this.service.hallNoteBought(listingId, result) });
    }

    /** Ending a show is final for an original a copy was bought from (HALL_RELIST_BLOCKED): the dialog says so before it goes. */
    confirmHallWithdraw(row) {
        let copied = Number(row.copiesSold || 0) > 0;
        let text = (0, this.deps._t)('[{item}] 전시를 끝내고 원본을 가방으로 돌려받습니다.{value}', { item: row.item && row.item.name || (0, this.deps._t)('장비'), value: copied ? (0, this.deps._t)('\n복제품이 팔린 원본이라 다시 전시할 수 없습니다.') : '' });
        return this.askPlayerHall(text, { title: (0, this.deps._t)('전당 전시 종료'), confirmLabel: (0, this.deps._t)('전시 종료'), ...(copied ? { tone: 'danger' } : {}) });
    }

    async withdrawPlayerHallListing(listingId) {
        if (!this.active) return;
        let data = this.service.getPlayerHallData(), mine = data && Array.isArray(data.mine) ? data.mine : [];
        let row = mine.find(entry => entry && Number(entry.id) === Number(listingId));
        if (!row) return this.setPlayerExchangeMessage('전시 항목을 다시 불러와주세요.');
        if (this.state.loading || this.state.asking) return this.setPlayerExchangeMessage('앞선 전당 작업을 마무리하는 중입니다.');
        let refusal = this.service.hallTradeRefusal('회수', row.item);
        if (refusal) return this.setPlayerExchangeMessage(refusal);
        let session = this.service.beginHallSession();
        if (row.status === 'open' && !await this.confirmHallWithdraw(row)) return;
        await this.runPlayerExchangeMutation({ session, action: '회수', incoming: row.item, reason: 'hall-withdraw', path: '/rest/v1/rpc/withdraw_hall_listing',
            body: { p_listing_id: Number(listingId) }, successMessage: '전시를 종료하고 원본 장비를 돌려받았습니다.',
            mutation: result => this.rules.receive(result.item), done: () => this.service.hallNoteMine(listingId, null) });
    }

    /** One server trade that puts an item in the bag (buy, withdraw): refused while playerHallTrade.refusal says so (asked again after any
     * dialog), else the save is pushed, the request sent with the revision it got, and the change applied (applyPlayerExchangeServerState).
     * spec: { session? (beginHallSession, taken before any dialog), action, incoming, reason, path, body, successMessage,
     *         mutation(result) → state change, done?(result) }. */
    async runPlayerExchangeMutation(spec) {
        if (this.state.loading || this.state.asking) return this.setPlayerExchangeMessage('앞선 전당 작업을 마무리하는 중입니다.');
        let refusal = this.service.hallTradeRefusal(spec.action, spec.incoming);
        if (refusal) return this.setPlayerExchangeMessage(refusal);
        let session = spec.session || this.service.beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
        this.state.loading = true;
        this.view.renderPlayerExchange();
        try {
            let result = await this.service.hallHoldCloud(async () => {
                await this.service.preparePlayerExchangeMutation(spec.reason, session);
                let response = await (0, this.deps.cloudJsonRequest)(spec.path, {
                    method: 'POST', expectedUserId: session.userId, onSend: () => Object.assign(progress, { sent: true, revision: this.service.getPlayerExchangeRevision() }), body: { ...spec.body, p_expected_revision: this.service.getPlayerExchangeRevision() }
                });
                await this.service.applyPlayerExchangeServerState(response, spec.mutation(response), session.userId);
                if (this.active) (0, this.deps.updateStaticUI)();
                progress.applied = true;
                return response;
            });
            if (spec.done) spec.done(result);
            await this.finishHallTrade(spec.successMessage + this.service.hallStorageNote(result.item && result.item.tradeKey));
        } catch (error) {
            this.state.message = this.service.hallTradeFailureMessage(error, progress);
        } finally {
            this.state.loading = false;
            this.view.renderPlayerExchange();
        }
    }

    /** After a trade the server committed and this game took: the trade stands with message, and the hall rows are read again on their
     * own. A failed reload is said beside the success; the held rows keep the trade's marks (noteBought, noteMine) until then. */
    async finishHallTrade(message) {
        this.state.message = message;
        try {
            await this.service.reloadPlayerExchangeData();
        } catch (error) {
            this.deps.console.warn('hall rows reload after a trade failed:', error);
            this.state.message = (0, this.deps._t)('{message} 전당 목록은 새로 불러오지 못했습니다({error}). 새로고침으로 다시 불러와 주세요.', { message, error: getPlayerExchangeError(error) });
        }
    }

    setPlayerExchangeMessage(message) {
        this.state.message = message;
        this.view.renderPlayerExchange();
    }
}
