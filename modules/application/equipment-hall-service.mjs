import { getPlayerExchangeError } from '../common/equipment-hall-errors.mjs';
import { hallTradeStates, hallReplayBusyReason } from '../domain/equipment-hall.mjs';

/** Account/revision boundary for hall requests. Reads the current owner after every await. */
export class EquipmentHallService {
    constructor(deps, state, rules) { this.deps = deps; this.state = state; this.rules = rules; this.active = true; }
    getHallEligibleItems() { return (this.deps.game.inventory || []).filter(item => !this.rules.hallItemIssue(item)); }
    isPlayerExchangeServerReady() {
        return !!(this.deps.cloudState && this.deps.cloudState.configured && this.deps.cloudState.user && this.deps.cloudState.user.id
            && this.deps.cloudState.revisionSupported === true);
    }

    createHallItemKey() {
        if (typeof this.deps.crypto !== 'undefined' && typeof this.deps.crypto.randomUUID === 'function') return this.deps.crypto.randomUUID();
        if (typeof this.deps.crypto === 'undefined' || typeof this.deps.crypto.getRandomValues !== 'function') {
            throw new Error('안전한 전당 식별자를 만들 수 없는 브라우저입니다.');
        }
        let bytes = new Uint8Array(16);
        this.deps.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        let hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    ensureHallItemKey(item) {
        if (!item || typeof item !== 'object') return null;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.tradeKey || ''))) {
            item.tradeKey = this.createHallItemKey();
        }
        return item.tradeKey;
    }

    getPlayerExchangeRevision() {
        return Math.max(0, Math.floor(Number(this.deps.game && this.deps.game.saveMeta && this.deps.game.saveMeta.cloudRevision) || 0));
    }

    /** The account and game a hall action began with. Any await of the action can end with another account signed in or the game
     * replaced (a cloud load, an offline replay settling): checkHallSession runs right after each one and before every request, so no
     * save push or hall request goes out for an account or game the player did not start with. Once the server committed, only the
     * account is checked (applyPlayerExchangeServerState), since a settled replay's game rightly takes the result. */
    beginHallSession() {
        return { userId: this.deps.cloudState.user && this.deps.cloudState.user.id, owner: this.deps.game };
    }

    checkHallSession(session) {
        const userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
        if (!this.active || !session.userId || userId !== session.userId || this.deps.game !== session.owner) throw new Error('HALL_SESSION_CHANGED');
    }

    /** The hall rows read for the account signed in now, or null: rows read for another account are neither shown nor traded on. */
    getPlayerHallData() {
        const userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
        return userId && this.state.dataUserId === userId ? this.state.data : null;
    }

    /** Applies a change the server committed: mutation(state, liveState) on every state hallTradeStates gives, then the revision it gave. A
     * running offline replay is waited for first: it replaces the game with a result built from a snapshot taken before this change, so the
     * change and its revision go on the game the replay leaves, never on the one it throws away. A replay that has not started yet (the
     * page is hidden) gets the change in its snapshot, so neither the change nor the offline progress is lost. */
    async applyPlayerExchangeServerState(result, mutation, userId) {
        if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error('전당 서버 응답에 저장 리비전이 없습니다.');
        await this.hallWaitClear(() => this.deps.backgroundCombatRuntime.processing, Infinity);
        // userId: the account the request went out under. Another account signed in since: this game is not that account's, the server
        // keeps the trade, and writing it here would put it (and that revision) into another account's game. Only signed out: this is
        // still that player's game, and dropping the trade here would lose a withdrawn original once the local save is kept.
        if (userId !== undefined && this.deps.cloudState.user && this.deps.cloudState.user.id !== userId) throw new Error('HALL_ACCOUNT_CHANGED');
        hallTradeStates(this.deps.game, this.deps.backgroundCombatRuntime.snapshot).forEach(state => mutation(state, this.deps.game));
        (0, this.deps.ensureSaveMeta)();
        this.deps.game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.currentRevision)));
        this.deps.game.saveMeta.lastCloudSyncAt = Date.now();
        this.deps.cloudState.lastRemoteRevision = this.deps.game.saveMeta.cloudRevision;
        this.deps.cloudState.lastRemoteUpdatedAt = this.deps.game.saveMeta.lastCloudSyncAt;
        (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }

    async preparePlayerExchangeMutation(reason, session) {
        if (!this.isPlayerExchangeServerReady()) throw new Error(this.deps.cloudState && this.deps.cloudState.user ? '장비 전당 서버를 준비 중입니다.' : '클라우드 로그인이 필요합니다.');
        this.checkHallSession(session);
        if (!(0, this.deps.saveGame)({ skipCloudSync: true })) throw new Error('로컬 저장에 실패하여 전당 작업을 중단했습니다.');
        await (0, this.deps.pushCloudSave)({ touchModifiedAt: true, reason });
        this.checkHallSession(session);
    }

    async requestHallItemQuote(item, session) {
        let itemKey = this.ensureHallItemKey(item);
        let quote = await this.hallHoldCloud(async () => {
            await this.preparePlayerExchangeMutation('hall-appraisal', session);
            return (0, this.deps.cloudJsonRequest)('/rest/v1/rpc/quote_hall_item', {
                method: 'POST', expectedUserId: session.userId, body: { p_item_key: itemKey, p_expected_revision: this.getPlayerExchangeRevision() }
            });
        });
        return { itemKey, quote };
    }

    /** Why listing is not on sale to this account at all, or '' (the server checks each again). */
    getHallListingClosedReason(listing) {
        if (listing.isMine) return getPlayerExchangeError('HALL_SELF_PURCHASE');
        if (listing.alreadyCollected) return getPlayerExchangeError('HALL_ALREADY_COLLECTED');
        let soldOut = Number(listing.copiesSold || 0) >= Number(listing.copyCap || 5);
        // get_player_hall lists open shows only (no status field); a full one is closed until the next reload.
        return soldOut ? getPlayerExchangeError('HALL_LISTING_NOT_ACTIVE') : '';
    }

    /** Why listing cannot be bought now, or '': another hall trade or its dialog under way, the listing closed to this account, too little
     * 황금률, or hallTradeRefusal (woodsman fight, offline replay, bag room). Answered before a dialog or a request; the server stays
     * the judge of price, ownership, copies and revision. */
    getHallBuyBlockReason(listing) {
        if (this.state.loading || this.state.asking) return '앞선 전당 작업을 마무리하는 중입니다.';
        let closed = this.getHallListingClosedReason(listing);
        if (closed) return closed;
        let price = Math.max(0, Math.floor(Number(listing.price) || 0));
        if (Math.floor(Number(this.deps.game.currencies.goldenRule) || 0) < price) return getPlayerExchangeError('HALL_CURRENCY_SHORTAGE');
        return this.hallTradeRefusal('구매', listing.item);
    }

    /** The words for a hall trade that did not finish. A request that went out and was neither refused by the server (a known code) nor
     * taken into this game may have gone through: hall trades stop while isHallResultUnknown says so. progress: { sent, applied, userId,
     * revision (the save revision the request was sent with, set when it went out) }. */
    hallTradeFailureMessage(error, progress) {
        let raw = String(error && error.message || error || '');
        // A 4xx answer is the server refusing: nothing went through.
        const refused = error && error.status >= 400 && error.status < 500;
        if (progress.sent && !progress.applied && !refused && !/HALL_[A-Z_]+|CLOUD_[A-Z_]+|AUTH_REQUIRED/.test(raw)) {
            this.deps.console.warn('hall trade result unknown:', error);
            this.state.uncertain = { userId: progress.userId, revision: progress.revision, at: Date.now() };
            return getPlayerExchangeError('HALL_RESULT_UNKNOWN');
        }
        return getPlayerExchangeError(error);
    }

    /** True while a hall trade's result is unknown for the account signed in now. Only a save revision above the one the request was sent
     * with ends it: a cloud load after the trade went through, or a successful push (which the server's revision check refuses after a
     * committed trade). lastCloudSyncAt does not: it is stamped before the network on page exit and moved by merged snapshots. Another
     * game object alone (an offline replay settling) does not either. Other accounts are not held. */
    isHallResultUnknown() {
        let held = this.state.uncertain, userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
        // A server read after the failure that still shows the revision the request was sent with: the trade did not go through.
        const unchanged = this.deps.cloudState.lastRemoteCheckedAt > held?.at && this.deps.cloudState.lastRemoteRevision === held.revision;
        return !!held && held.userId === userId && !unchanged && !(Number(this.deps.game.saveMeta && this.deps.game.saveMeta.cloudRevision) > held.revision);
    }

    async reloadPlayerExchangeData() {
        let userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
        let data = await (0, this.deps.cloudJsonRequest)('/rest/v1/rpc/get_player_hall', { method: 'POST', expectedUserId: userId, body: {} });
        // Another account signed in while the rows came: they belong to the old account and are dropped.
        if (!userId || (this.deps.cloudState.user && this.deps.cloudState.user.id) !== userId) return;
        // Existing shows keep their server price, score and identity. Their detached display items follow current equipment names and
        // base rules, so the card agrees with the item receive() will put in the bag without rewriting the server's listing.
        const displayed = { ...data };
        for (const key of ['listings', 'mine']) {
            if (!Array.isArray(data && data[key])) continue;
            displayed[key] = data[key].map(row => row && row.item ? { ...row, item: (0, this.deps.normalizeItem)(JSON.parse(JSON.stringify(row.item))) } : row);
        }
        this.state.data = displayed;
        this.state.dataUserId = userId;
    }

    getPlayerHallListings() {
        let data = this.getPlayerHallData();
        return Array.isArray(data && data.listings) ? data.listings : [];
    }

    /** Why a trade must not start now, or ''. action names it in the sentence ('전시', '회수', '구매'); incoming is the item it puts in the
     * bag (the server counts items, not cells, so a full bag used to send it to the temporary storage without a word). */
    hallTradeRefusal(action, incoming) {
        if (this.isHallResultUnknown()) return getPlayerExchangeError('HALL_RESULT_UNKNOWN');
        if (this.deps.game.woodsmanBuildLock) return (0, this.deps._t)('☠️ 나무꾼 전투 중에는 {action}할 수 없습니다.', { action });
        const replay = hallReplayBusyReason(this.deps.backgroundCombatRuntime);
        if (replay) return replay;
        return incoming && !(0, this.deps.canStoreEquipmentItems)([incoming], this.deps.game) ? getPlayerExchangeError('HALL_INVENTORY_FULL') : '';
    }

    /** Waits while busy() holds, looking every 250 ms, for at most limitMs. @returns {Promise<boolean>} true once it no longer holds */
    async hallWaitClear(busy, limitMs) {
        const until = Date.now() + limitMs;
        while (busy() && Date.now() < until) await new Promise(resolve => (0, this.deps.setTimeout)(resolve, 250));
        return !busy();
    }

    /** Runs trade holding the cloud save (cloudState.busy): an auto save starting meanwhile raced the hall's own push and request, and
     * one of them failed as if another device had saved. A save already running is waited for, 10 seconds at most. */
    async hallHoldCloud(trade) {
        if (!await this.hallWaitClear(() => this.deps.cloudState.busy, 10000)) throw new Error('클라우드 저장이 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.');
        this.deps.cloudState.busy = true;
        try {
            return await trade();
        } finally {
            this.deps.cloudState.busy = false;
        }
    }

    /** ' 가방에 자리가 없어 임시 보관함에 넣었습니다.' when the received item no longer fit (the bag filled while the request was on its way). */
    hallStorageNote(tradeKey) {
        if (!tradeKey) return '';
        this.deps.equipmentInventoryGridRuntime.ensureState(this.deps.game);
        return (this.deps.game.equipmentTemporaryStorage || []).some(row => row && row.tradeKey === tradeKey) ? ' 가방에 자리가 없어 임시 보관함에 넣었습니다.' : '';
    }

    /** Keeps the held 내 전시 rows right after this device lists (row) or withdraws (row null), also when the reload after it fails: the
     * loop waits on them (hallLoopBlockReason). */
    hallNoteMine(listingId, row) {
        const userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
        const held = this.state.dataUserId === userId && this.state.data ? this.state.data : { listings: [], mine: [] };
        const mine = (Array.isArray(held.mine) ? held.mine : []).filter(entry => entry && Number(entry.id) !== Number(listingId));
        this.state.data = { ...held, mine: row ? [row, ...mine] : mine };
        this.state.dataUserId = userId;
    }

    /** After a purchase: the held row of that show is marked collected with the server's copy count, so its button stays shut also when
     * the reload after it fails (the server refuses a second purchase anyway: HALL_ALREADY_COLLECTED). */
    hallNoteBought(listingId, result) {
        const data = this.getPlayerHallData();
        if (!data || !Array.isArray(data.listings)) return;
        data.listings = data.listings.map(row => (Number(row.id) !== Number(listingId) ? row
            : { ...row, alreadyCollected: true, copiesSold: Math.max(Number(row.copiesSold) || 0, Number(result.copiesSold) || 0) }));
    }
}
