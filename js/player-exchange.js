// GENERATED from modules/player-exchange*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/state/equipment-hall.mjs
  var HALL_LIST_LIMIT = 80;
  var HALL_SORTS = Object.freeze({ score: "감정 높은 순", priceAsc: "가격 낮은 순", priceDesc: "가격 높은 순" });
  var HALL_BROWSE_DEFAULT = Object.freeze({ slot: "all", sort: "score", query: "" });
  function createEquipmentHallState() {
    return {
      data: null,
      dataUserId: null,
      loading: false,
      message: "",
      selectedItemId: null,
      itemTips: /* @__PURE__ */ new Map(),
      tipCards: /* @__PURE__ */ new Map(),
      selectedListingId: null,
      asking: false,
      browse: { ...HALL_BROWSE_DEFAULT },
      compare: null,
      // { userId, revision, at } holds further trades until a server revision resolves an uncertain result.
      uncertain: null
    };
  }

  // modules/domain/equipment-hall.mjs
  var EquipmentHallRules = class {
    constructor(deps2) {
      this.deps = deps2;
      this.itemRules = [
        [(item) => !Number.isFinite(Number(item.id)) || deps2.bagItems.isSpecial(item), "전시할 수 없는 장비입니다."],
        [(item) => !["rare", "unique"].includes(item.rarity) || !(item.baseId || item.baseName), "희귀, 고유 장비만 전시할 수 있습니다."],
        [(item) => item.locked, "잠근 장비는 전시할 수 없습니다."],
        [(item) => item.tradeLocked || item.hallReplica || item.hallRelistBlocked, "전당 복제품이나 거래가 막힌 장비는 전시할 수 없습니다."],
        [(item) => this.hasSocketedHallJewel(item), "소켓에 주얼이나 성장 아이템을 끼운 장비는 전시할 수 없습니다."],
        [(item) => typeof deps2.equipmentLoadoutRuntime !== "undefined" && deps2.equipmentLoadoutRuntime.isReferenced(item), "장비 세팅에 들어 있는 장비는 전시할 수 없습니다."]
      ];
    }
    hasSocketedHallJewel(item) {
      return this.deps.equipmentSockets.jewels(item).length > 0 || this.deps.equipmentSockets.harvests(item).length > 0;
    }
    hallItemIssue(item) {
      const rule = item ? this.itemRules.find(([fails]) => fails(item)) : this.itemRules[0];
      return rule ? (0, this.deps._t)(rule[1]) : "";
    }
    take(itemKey) {
      return (state2) => {
        state2.inventory = (state2.inventory || []).filter((row) => row && row.tradeKey !== itemKey);
      };
    }
    /** One migrated item/local id per committed transaction. Each saved snapshot gets its own copy.
     * liveState is supplied after the replay has settled, rather than captured before the network request. */
    receive(serverItem) {
      let item = null;
      return (state2, liveState) => {
        item = item || (0, this.deps.normalizeItem)({ ...JSON.parse(JSON.stringify(serverItem)), id: (0, this.deps.nextItemId)() });
        state2.inventory = Array.isArray(state2.inventory) ? state2.inventory : [];
        if (state2.inventory.some((row) => row && row.tradeKey === item.tradeKey)) return;
        state2.inventory.push(state2 === liveState ? item : JSON.parse(JSON.stringify(item)));
      };
    }
    /** Apply the paid delta, preserving currency earned/spent while the request was pending. */
    pay(price) {
      return (state2) => {
        if (state2.currencies) state2.currencies.goldenRule = Math.max(0, (Number(state2.currencies.goldenRule) || 0) - price);
      };
    }
  };
  function hallTradeStates(game, pendingReplay) {
    return [game, pendingReplay].filter(Boolean).flatMap((state2) => state2.woodsmanBuildLock && state2.woodsmanBuildSnapshot ? [state2, state2.woodsmanBuildSnapshot] : [state2]);
  }
  function hallReplayBusyReason(replay) {
    return replay.snapshot || replay.processing || replay.failed ? "방치 전투 정산을 마친 뒤 이용해 주세요." : "";
  }

  // modules/common/equipment-hall-errors.mjs
  function getPlayerExchangeError(error) {
    let raw = String(error && error.message || error || "알 수 없는 오류");
    if (/PGRST202|function[^\n]*get_player_hall[^\n]*does not exist|relation[^\n]*hall_listings[^\n]*does not exist/i.test(raw)) {
      return "장비 전당 서버를 준비 중입니다. 잠시 후 다시 열어주세요.";
    }
    let messages = {
      AUTH_REQUIRED: "클라우드 로그인이 필요합니다.",
      CLOUD_SAVE_NOT_FOUND: "먼저 클라우드 저장을 완료해주세요.",
      CLOUD_REVISION_CONFLICT: "다른 기기에서 저장이 변경되었습니다. 클라우드 저장을 다시 불러와주세요.",
      HALL_LISTING_LIMIT: "전당에는 동시에 장비를 3개까지만 전시할 수 있습니다.",
      HALL_RATE_LIMIT: "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.",
      HALL_LISTING_DAILY_LIMIT: "오늘의 전당 등록 한도에 도달했습니다.",
      HALL_DAILY_LIMIT: "오늘의 전당 구매 한도에 도달했습니다.",
      HALL_ITEM_NOT_FOUND: "서버 저장에서 장비를 찾지 못했습니다.",
      HALL_ITEM_REJECTED: "전당 등록 규칙에 맞지 않는 장비입니다.",
      HALL_ITEM_NAME_REJECTED: "장비 이름에 비속어가 있어 전당에 올릴 수 없습니다.",
      HALL_ITEM_KEY_CONFLICT: "같은 서버 식별자를 가진 장비가 둘 이상 발견되어 등록을 중단했습니다.",
      HALL_RELIST_BLOCKED: "한 번이라도 복제된 원본은 전당에 다시 등록할 수 없습니다.",
      HALL_SOCKET_NOT_EMPTY: "소켓에 주얼을 끼운 장비는 전당에 등록할 수 없습니다.",
      HALL_ITEM_OWNERSHIP: "장비의 서버 소유권을 확인할 수 없습니다.",
      HALL_LISTING_NOT_ACTIVE: "전시가 종료되었거나 회수된 장비입니다.",
      HALL_SELF_PURCHASE: "자신이 전시한 장비는 구매할 수 없습니다.",
      HALL_ALREADY_COLLECTED: "같은 전시품은 계정당 한 번만 구매할 수 있습니다.",
      HALL_CURRENCY_SHORTAGE: "황금률이 부족합니다.",
      HALL_INVENTORY_FULL: "가방에 빈칸이 부족합니다. 가방을 정리한 뒤 다시 시도해 주세요.",
      HALL_ITEM_OUT_OF_RANGE: "게임에서 나올 수 없는 수치가 있는 장비는 전당에 등록할 수 없습니다.",
      HALL_ACCOUNT_HELD: "운영 검토 중인 계정이라 전당에 등록하거나 살 수 없습니다.",
      HALL_ACCOUNT_CHANGED: "작업 중에 로그인 계정이 바뀌어 이 기기에는 반영하지 않았습니다. 클라우드 저장을 다시 불러와 주세요.",
      HALL_SESSION_CHANGED: "작업 중에 로그인 계정이나 게임 상태가 바뀌어 전당에 보내지 않았습니다. 다시 시도해 주세요.",
      HALL_RESULT_UNKNOWN: "전당 서버의 응답을 받지 못해 거래 결과를 확인할 수 없습니다. 같은 거래를 다시 하지 말고 클라우드 저장을 다시 불러와 확인해 주세요."
    };
    let code = Object.keys(messages).find((key) => raw.includes(key));
    return code ? messages[code] : raw;
  }

  // modules/application/equipment-hall-service.mjs
  var EquipmentHallService = class {
    constructor(deps2, state2, rules2) {
      this.deps = deps2;
      this.state = state2;
      this.rules = rules2;
      this.active = true;
    }
    getHallEligibleItems() {
      return (this.deps.game.inventory || []).filter((item) => !this.rules.hallItemIssue(item));
    }
    isPlayerExchangeServerReady() {
      return !!(this.deps.cloudState && this.deps.cloudState.configured && this.deps.cloudState.user && this.deps.cloudState.user.id && this.deps.cloudState.revisionSupported === true);
    }
    createHallItemKey() {
      if (typeof this.deps.crypto !== "undefined" && typeof this.deps.crypto.randomUUID === "function") return this.deps.crypto.randomUUID();
      if (typeof this.deps.crypto === "undefined" || typeof this.deps.crypto.getRandomValues !== "function") {
        throw new Error("안전한 전당 식별자를 만들 수 없는 브라우저입니다.");
      }
      let bytes = new Uint8Array(16);
      this.deps.crypto.getRandomValues(bytes);
      bytes[6] = bytes[6] & 15 | 64;
      bytes[8] = bytes[8] & 63 | 128;
      let hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    ensureHallItemKey(item) {
      if (!item || typeof item !== "object") return null;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.tradeKey || ""))) {
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
      if (!this.active || !session.userId || userId !== session.userId || this.deps.game !== session.owner) throw new Error("HALL_SESSION_CHANGED");
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
      if (!result || !Number.isFinite(Number(result.currentRevision))) throw new Error("전당 서버 응답에 저장 리비전이 없습니다.");
      await this.hallWaitClear(() => this.deps.backgroundCombatRuntime.processing, Infinity);
      if (userId !== void 0 && this.deps.cloudState.user && this.deps.cloudState.user.id !== userId) throw new Error("HALL_ACCOUNT_CHANGED");
      hallTradeStates(this.deps.game, this.deps.backgroundCombatRuntime.snapshot).forEach((state2) => mutation(state2, this.deps.game));
      (0, this.deps.ensureSaveMeta)();
      this.deps.game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.currentRevision)));
      this.deps.game.saveMeta.lastCloudSyncAt = Date.now();
      this.deps.cloudState.lastRemoteRevision = this.deps.game.saveMeta.cloudRevision;
      this.deps.cloudState.lastRemoteUpdatedAt = this.deps.game.saveMeta.lastCloudSyncAt;
      (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }
    async preparePlayerExchangeMutation(reason, session) {
      if (!this.isPlayerExchangeServerReady()) throw new Error(this.deps.cloudState && this.deps.cloudState.user ? "장비 전당 서버를 준비 중입니다." : "클라우드 로그인이 필요합니다.");
      this.checkHallSession(session);
      if (!(0, this.deps.saveGame)({ skipCloudSync: true })) throw new Error("로컬 저장에 실패하여 전당 작업을 중단했습니다.");
      await (0, this.deps.pushCloudSave)({ touchModifiedAt: true, reason });
      this.checkHallSession(session);
    }
    async requestHallItemQuote(item, session) {
      let itemKey = this.ensureHallItemKey(item);
      let quote = await this.hallHoldCloud(async () => {
        await this.preparePlayerExchangeMutation("hall-appraisal", session);
        return (0, this.deps.cloudJsonRequest)("/rest/v1/rpc/quote_hall_item", {
          method: "POST",
          expectedUserId: session.userId,
          body: { p_item_key: itemKey, p_expected_revision: this.getPlayerExchangeRevision() }
        });
      });
      return { itemKey, quote };
    }
    /** Why listing is not on sale to this account at all, or '' (the server checks each again). */
    getHallListingClosedReason(listing) {
      if (listing.isMine) return getPlayerExchangeError("HALL_SELF_PURCHASE");
      if (listing.alreadyCollected) return getPlayerExchangeError("HALL_ALREADY_COLLECTED");
      let soldOut = Number(listing.copiesSold || 0) >= Number(listing.copyCap || 5);
      return soldOut ? getPlayerExchangeError("HALL_LISTING_NOT_ACTIVE") : "";
    }
    /** Why listing cannot be bought now, or '': another hall trade or its dialog under way, the listing closed to this account, too little
     * 황금률, or hallTradeRefusal (woodsman fight, offline replay, bag room). Answered before a dialog or a request; the server stays
     * the judge of price, ownership, copies and revision. */
    getHallBuyBlockReason(listing) {
      if (this.state.loading || this.state.asking) return "앞선 전당 작업을 마무리하는 중입니다.";
      let closed = this.getHallListingClosedReason(listing);
      if (closed) return closed;
      let price = Math.max(0, Math.floor(Number(listing.price) || 0));
      if (Math.floor(Number(this.deps.game.currencies.goldenRule) || 0) < price) return getPlayerExchangeError("HALL_CURRENCY_SHORTAGE");
      return this.hallTradeRefusal("구매", listing.item);
    }
    /** The words for a hall trade that did not finish. A request that went out and was neither refused by the server (a known code) nor
     * taken into this game may have gone through: hall trades stop while isHallResultUnknown says so. progress: { sent, applied, userId,
     * revision (the save revision the request was sent with, set when it went out) }. */
    hallTradeFailureMessage(error, progress) {
      let raw = String(error && error.message || error || "");
      const refused = error && error.status >= 400 && error.status < 500;
      if (progress.sent && !progress.applied && !refused && !/HALL_[A-Z_]+|CLOUD_[A-Z_]+|AUTH_REQUIRED/.test(raw)) {
        this.deps.console.warn("hall trade result unknown:", error);
        this.state.uncertain = { userId: progress.userId, revision: progress.revision, at: Date.now() };
        return getPlayerExchangeError("HALL_RESULT_UNKNOWN");
      }
      return getPlayerExchangeError(error);
    }
    /** True while a hall trade's result is unknown for the account signed in now. Only a save revision above the one the request was sent
     * with ends it: a cloud load after the trade went through, or a successful push (which the server's revision check refuses after a
     * committed trade). lastCloudSyncAt does not: it is stamped before the network on page exit and moved by merged snapshots. Another
     * game object alone (an offline replay settling) does not either. Other accounts are not held. */
    isHallResultUnknown() {
      let held = this.state.uncertain, userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
      const unchanged = this.deps.cloudState.lastRemoteCheckedAt > held?.at && this.deps.cloudState.lastRemoteRevision === held.revision;
      return !!held && held.userId === userId && !unchanged && !(Number(this.deps.game.saveMeta && this.deps.game.saveMeta.cloudRevision) > held.revision);
    }
    async reloadPlayerExchangeData() {
      let userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
      let data = await (0, this.deps.cloudJsonRequest)("/rest/v1/rpc/get_player_hall", { method: "POST", expectedUserId: userId, body: {} });
      if (!userId || (this.deps.cloudState.user && this.deps.cloudState.user.id) !== userId) return;
      const displayed = { ...data };
      for (const key of ["listings", "mine"]) {
        if (!Array.isArray(data && data[key])) continue;
        displayed[key] = data[key].map((row) => row && row.item ? { ...row, item: (0, this.deps.normalizeItem)(JSON.parse(JSON.stringify(row.item))) } : row);
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
      if (this.isHallResultUnknown()) return getPlayerExchangeError("HALL_RESULT_UNKNOWN");
      if (this.deps.game.woodsmanBuildLock) return (0, this.deps._t)("☠️ 나무꾼 전투 중에는 {action}할 수 없습니다.", { action });
      const replay = hallReplayBusyReason(this.deps.backgroundCombatRuntime);
      if (replay) return replay;
      return incoming && !(0, this.deps.canStoreEquipmentItems)([incoming], this.deps.game) ? getPlayerExchangeError("HALL_INVENTORY_FULL") : "";
    }
    /** Waits while busy() holds, looking every 250 ms, for at most limitMs. @returns {Promise<boolean>} true once it no longer holds */
    async hallWaitClear(busy, limitMs) {
      const until = Date.now() + limitMs;
      while (busy() && Date.now() < until) await new Promise((resolve) => (0, this.deps.setTimeout)(resolve, 250));
      return !busy();
    }
    /** Runs trade holding the cloud save (cloudState.busy): an auto save starting meanwhile raced the hall's own push and request, and
     * one of them failed as if another device had saved. A save already running is waited for, 10 seconds at most. */
    async hallHoldCloud(trade) {
      if (!await this.hallWaitClear(() => this.deps.cloudState.busy, 1e4)) throw new Error("클라우드 저장이 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.");
      this.deps.cloudState.busy = true;
      try {
        return await trade();
      } finally {
        this.deps.cloudState.busy = false;
      }
    }
    /** ' 가방에 자리가 없어 임시 보관함에 넣었습니다.' when the received item no longer fit (the bag filled while the request was on its way). */
    hallStorageNote(tradeKey) {
      if (!tradeKey) return "";
      this.deps.equipmentInventoryGridRuntime.ensureState(this.deps.game);
      return (this.deps.game.equipmentTemporaryStorage || []).some((row) => row && row.tradeKey === tradeKey) ? " 가방에 자리가 없어 임시 보관함에 넣었습니다." : "";
    }
    /** Keeps the held 내 전시 rows right after this device lists (row) or withdraws (row null), also when the reload after it fails: the
     * loop waits on them (hallLoopBlockReason). */
    hallNoteMine(listingId, row) {
      const userId = this.deps.cloudState.user && this.deps.cloudState.user.id;
      const held = this.state.dataUserId === userId && this.state.data ? this.state.data : { listings: [], mine: [] };
      const mine = (Array.isArray(held.mine) ? held.mine : []).filter((entry) => entry && Number(entry.id) !== Number(listingId));
      this.state.data = { ...held, mine: row ? [row, ...mine] : mine };
      this.state.dataUserId = userId;
    }
    /** After a purchase: the held row of that show is marked collected with the server's copy count, so its button stays shut also when
     * the reload after it fails (the server refuses a second purchase anyway: HALL_ALREADY_COLLECTED). */
    hallNoteBought(listingId, result) {
      const data = this.getPlayerHallData();
      if (!data || !Array.isArray(data.listings)) return;
      data.listings = data.listings.map((row) => Number(row.id) !== Number(listingId) ? row : { ...row, alreadyCollected: true, copiesSold: Math.max(Number(row.copiesSold) || 0, Number(result.copiesSold) || 0) });
    }
  };

  // modules/ui/equipment-hall-view.mjs
  var EquipmentHallView = class {
    constructor(deps2, state2, service2) {
      this.deps = deps2;
      this.state = state2;
      this.service = service2;
      this.active = true;
      this.renderMyHallStand = this.renderMyHallStand.bind(this);
    }
    dispose() {
      this.active = false;
      this.state.itemTips.clear();
      this.state.tipCards.clear();
      this.state.compare = null;
    }
    selectPlayerHallItem(itemId) {
      this.state.selectedItemId = Number(itemId);
      this.renderPlayerExchange();
    }
    /** Opens a show's full card and purchase above the list: a phone has no hover tooltip, so the options were bought unseen. */
    selectPlayerHallListing(listingId) {
      this.state.selectedListingId = Number(listingId);
      this.renderPlayerExchange();
      this.deps.document.querySelector("#map-player-hall .hall-detail")?.scrollIntoView({ block: "nearest" });
    }
    /** A hall item's full card: the profile card (js/social.js) fed its own snapshot, built once per render for key. A raw save item left
     * out the requirement, grade, oil and ember lines that card reads from the snapshot. '' when key was not drawn this render. */
    getPlayerHallItemCard(key) {
      let item = this.state.itemTips.get(String(key));
      if (!item || typeof this.deps.renderProfileItemCard !== "function") return "";
      if (!this.state.tipCards.has(String(key))) {
        this.state.tipCards.set(String(key), (0, this.deps.renderProfileItemCard)(typeof this.deps.buildItemSnapshot === "function" ? (0, this.deps.buildItemSnapshot)(item) : item));
      }
      return this.state.tipCards.get(String(key));
    }
    showPlayerHallTooltip(event, tipKey) {
      if (this.deps.uiDisplay.matches("(max-width: 700px)")) return;
      let item = this.state.itemTips.get(String(tipKey)), card = this.getPlayerHallItemCard(tipKey);
      if (card) (0, this.deps.showInfoTooltipHtml)(event.clientX, event.clientY, card, (0, this.deps.getRarityColor)(item.rarity));
    }
    hallTipAttrs(key) {
      let arg = (0, this.deps.escapeHTML)(key);
      return `data-info-tooltip-anchor="1" data-hall-tip="${arg}"`;
    }
    /** 전시장 칸: 장비 그림과 그 밑의 받침, 희귀도 빛(css/player-exchange.css). */
    hallNicheHtml(item) {
      return `<span class="hall-niche" aria-hidden="true">${(0, this.deps.renderInventoryItemVisual)(item, "equipment", "hall-niche-art")}</span>`;
    }
    /** An item's name with its slot, rarity and tier, and metaHtml under them. */
    hallItemText(item, metaHtml) {
      let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
      return `<span class="hall-item-text"><strong>${(0, this.deps.escapeHTML)((0, this.deps._t)(item.name) || "이름 없는 장비")}</strong><small>${(0, this.deps.escapeHTML)((0, this.deps.weaponCategorySlotLabel)(item, item.slot || ""))}, ${item.rarity === "unique" ? (0, this.deps._t)("고유") : (0, this.deps._t)("희귀")}, T${tier}</small>${metaHtml || ""}</span>`;
    }
    renderHallItemCard(item, key, actionHtml, metaHtml) {
      this.state.itemTips.set(String(key), item);
      return `<article class="player-trade-item hall-item" style="--trade-rarity:${(0, this.deps.getRarityColor)(item.rarity)}" ${this.hallTipAttrs(key)}>${this.hallNicheHtml(item)}${this.hallItemText(item, metaHtml)}${actionHtml}</article>`;
    }
    /** A show in the hall list: pressed, its card and purchase open above the list (renderHallListingDetail). */
    renderHallListingCard(row) {
      let item = row.item || {}, key = `hall-${row.id}`, selected = Number(row.id) === Number(this.state.selectedListingId);
      this.state.itemTips.set(key, item);
      let state2 = this.hallListingCaption(row);
      let meta = `<small class="hall-appraisal">${(0, this.deps._t)("감정 {score}, 전시자 명예 +{honorPerCopy}", { score: Number(row.score || 0).toLocaleString(), honorPerCopy: Number(row.honorPerCopy || 0) })}</small>`;
      return `<button type="button" class="player-trade-item hall-item hall-pick${selected ? " is-selected" : ""}" style="--trade-rarity:${(0, this.deps.getRarityColor)(item.rarity)}"
            aria-pressed="${selected}" data-hall-action="select" data-hall-id="${Number(row.id)}" ${this.hallTipAttrs(key)}>${this.hallNicheHtml(item)}${this.hallItemText(item, meta)}
            <span class="player-trade-price"><b>${(0, this.deps._t)("황금률 {price}", { price: Number(row.price || 0).toLocaleString() })}</b><span>${(0, this.deps.escapeHTML)(row.curatorName || "익명")}, ${state2}</span></span></button>`;
    }
    hallListingCaption(row) {
      if (this.service.getHallListingClosedReason(row)) return row.isMine ? "내 전시품" : row.alreadyCollected ? "소장 완료" : "전시 닫힘";
      return (0, this.deps._t)("{copiesSold}/{copyCap} 소장", { copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) });
    }
    /** The chosen show: its full card with the comparison against the worn gear, its price and the purchase, with why it cannot be bought
     * when it cannot. visibleRows: the browsed list, to say when the chosen show is hidden by it. */
    renderHallListingDetail(visibleRows) {
      let id = this.state.selectedListingId;
      if (id === null) return "";
      let row = this.service.getPlayerHallListings().find((entry) => Number(entry.id) === Number(id));
      if (!row) return '<p class="hall-detail-empty">고른 전시품은 전시가 끝났거나 지금 받은 목록에 없습니다.</p>';
      let key = `hall-${row.id}`;
      this.state.itemTips.set(key, row.item || {});
      return `<div class="hall-detail"><div class="hall-detail-card">${this.getPlayerHallItemCard(key)}${this.hallCompareHtml(row)}</div>${this.hallDealHtml(row, visibleRows.includes(row))}</div>`;
    }
    /** The chosen show's terms: who shows it and its copies, a word when the browse hides it (visible false), its price, why it cannot be
     * bought when it cannot, and the purchase. */
    hallDealHtml(row, visible) {
      let blocked = this.service.getHallBuyBlockReason(row), price = Math.max(0, Math.floor(Number(row.price) || 0));
      let hidden = visible ? "" : "<small>지금 목록 조건에서는 보이지 않는 전시품입니다.</small>";
      let note = blocked ? `<p class="hall-detail-note" role="status">${(0, this.deps.escapeHTML)(blocked)}</p>` : "";
      return `<div class="hall-detail-deal"><small>${(0, this.deps.escapeHTML)(row.curatorName || "익명")}의 전시, 소장 ${Number(row.copiesSold || 0)}/${Number(row.copyCap || 5)}</small>${hidden}
            <b>${(0, this.deps._t)("황금률 {price}", { price: price.toLocaleString() })}</b>${note}<button type="button" data-hall-action="buy" data-hall-id="${Number(row.id)}" ${blocked ? "disabled" : ""}>${(0, this.deps._t)("귀속 복제품 구매")}</button></div>`;
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
        this.deps.console.warn("hall compare failed:", error);
        rating = '<p class="hall-compare-note">현재 장비와 비교하지 못했습니다.</p>';
      }
      let html = `<div class="hall-compare"><small>${(0, this.deps._t)("현재 장비와 비교")}</small>${rating}</div>`;
      this.state.compare = { key, html };
      return html;
    }
    /** 내 전시(2026-11-06): three display stands in one row. My shows first (with their withdraw), then the chosen gear with its listing
     * button and 다른 장비 고르기, then 등록 (opens the bag picker, js/market-ui.js openHallPicker) and empty stands up to three shows. */
    renderHallStands(data, activeCount) {
      let mine = Array.isArray(data.mine) ? data.mine : [], busy = this.state.loading || this.state.asking;
      let item = this.service.getHallEligibleItems().find((row) => Number(row.id) === Number(this.state.selectedItemId));
      let stands = mine.map(this.renderMyHallStand);
      if (item && activeCount < 3) stands.push(`<div class="hall-stand is-chosen">${this.renderHallItemCard(item, `owned-${item.id}`, "")}<div class="hall-stand-actions">${this.renderHallRegisterButton(activeCount)}<button type="button" data-hall-action="choose" ${busy ? "disabled" : ""}>${(0, this.deps._t)("다른 장비 고르기")}</button></div></div>`);
      for (let open = activeCount + (item ? 1 : 0), first = true; open < 3; open += 1, first = false) {
        stands.push(first ? `<button type="button" class="hall-stand is-empty is-register" data-hall-action="choose" ${busy ? "disabled" : ""}><b>+</b>${(0, this.deps._t)("등록")}</button>` : `<div class="hall-stand is-empty" aria-hidden="true">${(0, this.deps._t)("빈 전시대")}</div>`);
      }
      return `<div class="hall-stands">${stands.join("")}</div>`;
    }
    /** The listing button, or what is missing (a trade under way, three shows up, nothing chosen). */
    renderHallRegisterButton(activeCount) {
      let item = this.service.getHallEligibleItems().find((row) => Number(row.id) === Number(this.state.selectedItemId));
      let busy = this.state.loading || this.state.asking;
      let reason = busy ? "처리 중" : activeCount >= 3 ? "전시 3칸이 모두 찼습니다" : item ? "" : "전시할 장비를 고르세요";
      return `<button class="hall-list-confirm" data-hall-action="list" ${reason ? "disabled" : ""}>${reason ? (0, this.deps._t)(reason) : (0, this.deps._t)("서버 감정 후 전시")}</button>`;
    }
    /** The shows the browse lets through, in its order: the server's (appraisal) or by price, ties by id so the order holds between draws. */
    getHallBrowsedListings() {
      let { slot, sort, query } = this.state.browse, words = query.trim().toLowerCase();
      let rows = this.service.getPlayerHallListings().filter((row) => this.hallListingMatches(row, slot, words));
      if (sort === "score") return rows;
      let direction = sort === "priceAsc" ? 1 : -1;
      return rows.slice().sort((a, b) => (Number(a.price) - Number(b.price)) * direction || Number(a.id) - Number(b.id));
    }
    hallListingMatches(row, slot, words) {
      let item = row.item || {};
      if (slot !== "all" && item.slot !== slot) return false;
      return !words || `${item.name || ""} ${item.baseName || ""}`.toLowerCase().includes(words);
    }
    /** One browse setting from the toolbar (inline handlers): only the view under the toolbar is drawn again, so the search keeps focus. */
    setPlayerHallBrowse(key, value) {
      let text = String(value ?? "");
      let valid = key === "slot" && text !== "" || key === "sort" && Object.prototype.hasOwnProperty.call(HALL_SORTS, text) || key === "query" && text.length <= 40;
      if (!valid) return;
      this.state.browse = { ...this.state.browse, [key]: text };
      let host = this.deps.document.getElementById("hall-market-view");
      if (host) host.innerHTML = this.renderHallMarketView();
    }
    resetPlayerHallBrowse() {
      this.state.browse = { ...HALL_BROWSE_DEFAULT };
      this.renderPlayerExchange();
    }
    /** The search, the slot (only slots on show, and the chosen one) and the order; nothing while the hall shows nothing. */
    renderHallBrowseTools() {
      let listings = this.service.getPlayerHallListings(), { slot, sort, query } = this.state.browse;
      if (!listings.length) return "";
      let slots = [...new Set(listings.map((row) => row.item && row.item.slot).filter(Boolean).concat(slot === "all" ? [] : [slot]))].sort((a, b) => a.localeCompare(b, this.deps.i18n.locale));
      let option = (value, label, chosen) => `<option value="${(0, this.deps.escapeHTML)(value)}" ${chosen ? "selected" : ""}>${(0, this.deps.escapeHTML)(label)}</option>`;
      let slotOptions = option("all", "전체 부위", slot === "all") + slots.map((name) => option(name, (0, this.deps.weaponCategorySlotLabel)(null, name), name === slot)).join("");
      let sortOptions = Object.entries(HALL_SORTS).map(([value, label]) => option(value, label, value === sort)).join("");
      return `<div class="hall-browse"><input type="search" class="hall-browse-search" value="${(0, this.deps.escapeHTML)(query)}" maxlength="40" placeholder="${(0, this.deps._t)("이름 검색")}"
            aria-label="${(0, this.deps._t)("전시품 이름 검색")}" data-hall-filter="query"><select aria-label="${(0, this.deps._t)("부위")}" data-hall-filter="slot">${slotOptions}</select>
            <select aria-label="${(0, this.deps._t)("정렬")}" data-hall-filter="sort">${sortOptions}</select></div>`;
    }
    /** The chosen show's card, how many shows the browse lets through, and those shows (or why none, with a way back to all). */
    renderHallMarketView() {
      let all = this.service.getPlayerHallListings(), rows = this.getHallBrowsedListings();
      let list = !all.length ? '<div class="player-exchange-empty"><span class="px-center">현재 전시 중인 소장품이 없습니다.</span></div>' : rows.length ? rows.map((row) => this.renderHallListingCard(row)).join("") : '<div class="player-exchange-empty"><span class="px-center">조건에 맞는 전시품이 없습니다.<button type="button" data-hall-action="reset">필터 초기화</button></span></div>';
      let limit = all.length >= HALL_LIST_LIMIT ? (0, this.deps._t)(", 감정 상위 {HALL_LIST_LIMIT}개 안에서 찾습니다", { HALL_LIST_LIMIT }) : "";
      let hint = this.state.selectedListingId === null ? `<span>${(0, this.deps._t)("전시품을 누르면 옵션과 현재 장비 비교를 보고 살 수 있습니다.")}</span>` : "";
      let count = all.length ? `<p class="hall-browse-count"><span>${(0, this.deps._t)("{length}개 중 {length2}개{limit}", { length: all.length, length2: rows.length, limit })}</span>${hint}</p>` : "";
      return `${this.renderHallListingDetail(rows)}${count}<div class="player-trade-grid">${list}</div>`;
    }
    /** One of my shows on its stand: the card, its state, copies and withdraw. */
    renderMyHallStand(row) {
      return `<div class="hall-stand is-mine">${this.renderHallItemCard(
        row.item || {},
        `mine-${row.id}`,
        `<div class="player-trade-price"><b>${this.hallMineLabel(row)}</b><span>${(0, this.deps._t)("{copiesSold}/{copyCap} 소장", { copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) })}</span><button data-hall-action="withdraw" data-hall-id="${Number(row.id)}" ${this.state.loading || this.state.asking ? "disabled" : ""}>${row.status === "open" ? (0, this.deps._t)("전시 종료") : (0, this.deps._t)("원본 회수")}</button></div>`,
        `<small class="hall-appraisal">${(0, this.deps._t)("감정 {score}", { score: Number(row.score || 0).toLocaleString() })}</small>`
      )}</div>`;
    }
    /** 전당의 머리(2026-11-02 사용자: 색감, 전당이라는 웅장함; 2026-11-06 "공간효율"): 두 기둥 사이의 얇은 띠에 이름, 규칙(? 툴팁), 명예, 소장, 공유,
     * 황금률 현판을 한 줄로. */
    hallHeroHtml(plaques) {
      const cells = plaques.map(([label, value]) => `<div class="hall-plaque"><span>${(0, this.deps._t)(label)}</span><b>${Number(value || 0).toLocaleString(this.deps.i18n.locale)}</b></div>`).join("");
      const rule = `<button type="button" class="hall-rule-tip" data-tip="${(0, this.deps.escapeHTML)((0, this.deps._t)("희귀, 고유 원본을 전시하면 귀속 복제품이 최대 5개 나갑니다. 희귀는 베이스 종류/티어와 옵션 티어/롤, 고유는 옵션 롤과 타락 결과까지 서버가 감정합니다. 판매자는 재화 대신 구매자마다 명예를 얻고 구매 비용은 전부 소각됩니다."))}" aria-label="${(0, this.deps.escapeHTML)((0, this.deps._t)("장비 전당 규칙"))}">?</button>`;
      return `<header class="hall-hero"><div class="hall-hero-title"><h2>${(0, this.deps._t)("장비 전당")}</h2>${rule}</div>${cells ? `<div class="hall-plaques">${cells}</div>` : ""}</header>`;
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
      let activeCount = (Array.isArray(data.mine) ? data.mine : []).filter((row) => ["open", "sold_out"].includes(row.status)).length;
      let busy = this.state.loading || this.state.asking;
      const plaques = [["명예", data.honor], ["소장", data.collectionCount], ["공유", data.copiesShared], ["보유 황금률", this.deps.game.currencies.goldenRule]];
      return this.hallHeroHtml(plaques) + `<section class="player-exchange-card is-register"><header><div><strong>${(0, this.deps._t)("내 전시 {activeCount}/3", { activeCount })}</strong><small>${(0, this.deps._t)("원본은 전시 종료 시 직접 회수할 수 있습니다.")}</small></div></header>${this.renderHallStands(data, activeCount)}</section><section class="player-exchange-card is-market"><header><strong>${(0, this.deps._t)("전당 소장품")}</strong>${this.renderHallBrowseTools()}<span class="hall-market-tools"><button data-hall-action="refresh" ${busy ? "disabled" : ""}>${(0, this.deps._t)("새로고침")}</button></span></header><div id="hall-market-view">${this.renderHallMarketView()}</div></section>`;
    }
    renderPlayerExchange() {
      if (!this.active) return;
      let hallHost = this.deps.document.getElementById("map-player-hall");
      if (!hallHost) return;
      let message = this.state.message ? `<p class="player-exchange-message">${(0, this.deps.escapeHTML)(this.state.message)}</p>` : "";
      hallHost.innerHTML = message + this.renderPlayerHallPanel();
    }
    /** My listing's price box: its price while on show, '복제 한도 완료' once every copy went, '전시 닫힘' when it closed before that
     * (an operator's hold closes open listings, db/anti-cheat.sql admin_set_cheat_hold). */
    hallMineLabel(row) {
      if (row.status !== "sold_out") return (0, this.deps._t)("황금률 {price}", { price: Number(row.price || 0).toLocaleString() });
      return Number(row.copiesSold || 0) >= Number(row.copyCap || 5) ? "복제 한도 완료" : "전시 닫힘";
    }
  };

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/equipment-hall-actions.mjs
  var EquipmentHallActions = class {
    constructor(deps2, state2, service2, view2) {
      this.deps = deps2;
      this.state = state2;
      this.service = service2;
      this.rules = service2.rules;
      this.view = view2;
      this.active = true;
      this.listeners = [];
      this.commands = Object.freeze({
        select: (id) => {
          (0, deps2.hideInfoTooltip)();
          view2.selectPlayerHallListing(id);
        },
        buy: (id) => this.buyPlayerHallReplica(id),
        withdraw: (id) => this.withdrawPlayerHallListing(id),
        list: () => this.createPlayerHallListing(),
        refresh: () => this.loadPlayerExchange(),
        reset: () => view2.resetPlayerHallBrowse(),
        choose: () => deps2.marketUi.openHallPicker(),
        login: () => (0, deps2.openStartupGate)({ accountOnly: true })
      });
      listenView(this, deps2.document, "click", (event) => this.onClick(event));
      for (const type of ["input", "change"]) listenView(this, deps2.document, type, (event) => this.onFilter(event));
      for (const type of ["mouseover", "mousemove", "mouseout"]) listenView(this, deps2.document, type, (event) => this.onTooltip(event));
    }
    dispose() {
      releaseViewEvents(this);
      this.service.active = false;
      this.view.dispose();
    }
    hallTarget(event, selector) {
      const target = event.target.closest?.(selector);
      return this.active && target?.closest("#map-player-hall") ? target : null;
    }
    async onClick(event) {
      const button = this.hallTarget(event, "[data-hall-action]");
      if (!button || button.disabled) return;
      const action = Object.prototype.hasOwnProperty.call(this.commands, button.dataset.hallAction) ? this.commands[button.dataset.hallAction] : null;
      if (!action) return;
      try {
        await action(Number(button.dataset.hallId));
      } catch (error) {
        this.deps.console.error("hall action failed:", error);
        this.setPlayerExchangeMessage(getPlayerExchangeError(error));
      }
    }
    onFilter(event) {
      const control = this.hallTarget(event, "[data-hall-filter]");
      if (!control) return;
      if (control.dataset.hallFilter === "query" !== (event.type === "input")) return;
      this.view.setPlayerHallBrowse(control.dataset.hallFilter, control.value);
    }
    onTooltip(event) {
      const anchor = this.hallTarget(event, "[data-hall-tip]");
      if (!anchor) return;
      if (event.type !== "mouseout") this.view.showPlayerHallTooltip(event, anchor.dataset.hallTip);
      else if (!anchor.contains(event.relatedTarget)) (0, this.deps.hideInfoTooltip)();
    }
    getHallEligibleItems() {
      return this.service.getHallEligibleItems();
    }
    async loadPlayerExchange() {
      if (!this.active) return;
      if (!this.service.isPlayerExchangeServerReady() || this.state.loading) return this.view.renderPlayerExchange();
      this.state.loading = true;
      this.state.message = "";
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
      if (typeof this.deps.requestGameConfirmation !== "function") return true;
      let price = Math.max(0, Math.floor(Number(quote.price) || 0));
      let score = Math.max(0, Math.floor(Number(quote.score) || 0));
      return (0, this.deps.requestGameConfirmation)(
        `[${item.name}] 감정 점수 ${score.toLocaleString()}, 복제품 구매가 황금률 ${price.toLocaleString()}개
등록 중 원본은 전당이 보관하며, 회수 전까지 최대 5명이 귀속 복제품을 구매할 수 있습니다.`,
        { title: (0, this.deps._t)("장비 전당 감정"), confirmLabel: (0, this.deps._t)("이 가격으로 전시") }
      );
    }
    async createPlayerHallListing() {
      if (!this.active) return;
      if (this.state.loading || this.state.asking) return;
      let item = this.getHallEligibleItems().find((row) => Number(row.id) === Number(this.state.selectedItemId));
      if (!item) return this.setPlayerExchangeMessage("전당에 전시할 희귀 또는 고유 장비를 선택해주세요.");
      let refusal = this.service.hallTradeRefusal("전시");
      if (refusal) return this.setPlayerExchangeMessage(refusal);
      let session = this.service.beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
      this.state.loading = true;
      this.view.renderPlayerExchange();
      try {
        let appraisal = await this.appraiseHallListing(item, session);
        if (!appraisal) return;
        let result = await this.service.hallHoldCloud(async () => {
          this.service.checkHallSession(session);
          let response = await (0, this.deps.cloudJsonRequest)("/rest/v1/rpc/create_hall_listing", {
            method: "POST",
            expectedUserId: session.userId,
            onSend: () => Object.assign(progress, { sent: true, revision: this.service.getPlayerExchangeRevision() }),
            body: { p_item_key: appraisal.itemKey, p_expected_revision: this.service.getPlayerExchangeRevision() }
          });
          await this.service.applyPlayerExchangeServerState(response, this.rules.take(appraisal.itemKey), session.userId);
          if (this.active) (0, this.deps.updateStaticUI)();
          progress.applied = true;
          return response;
        });
        this.state.selectedItemId = null;
        this.service.hallNoteMine(result.listingId, {
          id: result.listingId,
          item: result.item,
          score: result.score,
          price: result.price,
          status: "open",
          copiesSold: 0,
          copyCap: 5
        });
        await this.finishHallTrade((0, this.deps._t)("감정 점수 {score}, 황금률 {price}개로 전시했습니다.", { score: Number(result.score).toLocaleString(), price: Number(result.price).toLocaleString() }));
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
      let refusal = accepted ? this.service.hallTradeRefusal("전시") : "감정만 완료하고 전시는 취소했습니다.";
      if (!refusal) return appraisal;
      this.state.message = refusal;
      return null;
    }
    /** A hall confirmation with playerExchangeState.asking set, so a second press opens no second dialog and starts no trade. */
    async askPlayerHall(text, options) {
      if (typeof this.deps.requestGameConfirmation !== "function") return true;
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
      let listing = this.service.getPlayerHallListings().find((row) => Number(row.id) === Number(listingId));
      if (!listing) return this.setPlayerExchangeMessage("전시 항목을 다시 불러와주세요.");
      let blocked = this.service.getHallBuyBlockReason(listing);
      if (blocked) return this.setPlayerExchangeMessage(blocked);
      let session = this.service.beginHallSession();
      let price = Math.max(0, Math.floor(Number(listing.price) || 0));
      if (!await this.askPlayerHall(
        `[${listing.item && listing.item.name || (0, this.deps._t)("장비")}]의 귀속 복제품을 황금률 ${price.toLocaleString()}개에 구매합니다.
구매한 장비는 재판매하거나 전당에 다시 등록할 수 없습니다.`,
        { title: (0, this.deps._t)("전당 소장품 구매"), confirmLabel: (0, this.deps._t)("구매") }
      )) return;
      await this.runPlayerExchangeMutation({
        session,
        action: "구매",
        incoming: listing.item,
        reason: "hall-purchase",
        path: "/rest/v1/rpc/buy_hall_replica",
        body: { p_listing_id: Number(listingId) },
        successMessage: "전당 소장품을 구매했습니다. 이 복제품은 계정에 귀속됩니다.",
        mutation: (result) => {
          const receive = this.rules.receive(result.item);
          const pay = this.rules.pay(Math.max(0, Math.floor(Number(result.price ?? listing.price) || 0)));
          return (state2, liveState) => {
            receive(state2, liveState);
            pay(state2);
          };
        },
        done: (result) => this.service.hallNoteBought(listingId, result)
      });
    }
    /** Ending a show is final for an original a copy was bought from (HALL_RELIST_BLOCKED): the dialog says so before it goes. */
    confirmHallWithdraw(row) {
      let copied = Number(row.copiesSold || 0) > 0;
      let text = (0, this.deps._t)("[{item}] 전시를 끝내고 원본을 가방으로 돌려받습니다.{value}", { item: row.item && row.item.name || (0, this.deps._t)("장비"), value: copied ? (0, this.deps._t)("\n복제품이 팔린 원본이라 다시 전시할 수 없습니다.") : "" });
      return this.askPlayerHall(text, { title: (0, this.deps._t)("전당 전시 종료"), confirmLabel: (0, this.deps._t)("전시 종료"), ...copied ? { tone: "danger" } : {} });
    }
    async withdrawPlayerHallListing(listingId) {
      if (!this.active) return;
      let data = this.service.getPlayerHallData(), mine = data && Array.isArray(data.mine) ? data.mine : [];
      let row = mine.find((entry) => entry && Number(entry.id) === Number(listingId));
      if (!row) return this.setPlayerExchangeMessage("전시 항목을 다시 불러와주세요.");
      if (this.state.loading || this.state.asking) return this.setPlayerExchangeMessage("앞선 전당 작업을 마무리하는 중입니다.");
      let refusal = this.service.hallTradeRefusal("회수", row.item);
      if (refusal) return this.setPlayerExchangeMessage(refusal);
      let session = this.service.beginHallSession();
      if (row.status === "open" && !await this.confirmHallWithdraw(row)) return;
      await this.runPlayerExchangeMutation({
        session,
        action: "회수",
        incoming: row.item,
        reason: "hall-withdraw",
        path: "/rest/v1/rpc/withdraw_hall_listing",
        body: { p_listing_id: Number(listingId) },
        successMessage: "전시를 종료하고 원본 장비를 돌려받았습니다.",
        mutation: (result) => this.rules.receive(result.item),
        done: () => this.service.hallNoteMine(listingId, null)
      });
    }
    /** One server trade that puts an item in the bag (buy, withdraw): refused while playerHallTrade.refusal says so (asked again after any
     * dialog), else the save is pushed, the request sent with the revision it got, and the change applied (applyPlayerExchangeServerState).
     * spec: { session? (beginHallSession, taken before any dialog), action, incoming, reason, path, body, successMessage,
     *         mutation(result) → state change, done?(result) }. */
    async runPlayerExchangeMutation(spec) {
      if (this.state.loading || this.state.asking) return this.setPlayerExchangeMessage("앞선 전당 작업을 마무리하는 중입니다.");
      let refusal = this.service.hallTradeRefusal(spec.action, spec.incoming);
      if (refusal) return this.setPlayerExchangeMessage(refusal);
      let session = spec.session || this.service.beginHallSession(), progress = { sent: false, applied: false, userId: session.userId };
      this.state.loading = true;
      this.view.renderPlayerExchange();
      try {
        let result = await this.service.hallHoldCloud(async () => {
          await this.service.preparePlayerExchangeMutation(spec.reason, session);
          let response = await (0, this.deps.cloudJsonRequest)(spec.path, {
            method: "POST",
            expectedUserId: session.userId,
            onSend: () => Object.assign(progress, { sent: true, revision: this.service.getPlayerExchangeRevision() }),
            body: { ...spec.body, p_expected_revision: this.service.getPlayerExchangeRevision() }
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
        this.deps.console.warn("hall rows reload after a trade failed:", error);
        this.state.message = (0, this.deps._t)("{message} 전당 목록은 새로 불러오지 못했습니다({error}). 새로고침으로 다시 불러와 주세요.", { message, error: getPlayerExchangeError(error) });
      }
    }
    setPlayerExchangeMessage(message) {
      this.state.message = message;
      this.view.renderPlayerExchange();
    }
  };

  // modules/player-exchange-classic.mjs
  var state = createEquipmentHallState();
  var deps = {
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get marketUi() {
      return marketUi;
    },
    get openStartupGate() {
      return openStartupGate;
    },
    get _t() {
      return _t;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get buildItemSnapshot() {
      return typeof buildItemSnapshot === "undefined" ? void 0 : buildItemSnapshot;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get cloudJsonRequest() {
      return cloudJsonRequest;
    },
    get cloudState() {
      return cloudState;
    },
    get console() {
      return console;
    },
    get crypto() {
      return typeof crypto === "undefined" ? void 0 : crypto;
    },
    get document() {
      return document;
    },
    get ensureSaveMeta() {
      return ensureSaveMeta;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getPersistentBuildSignature() {
      return getPersistentBuildSignature;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get i18n() {
      return i18n;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get persistLocalSave() {
      return persistLocalSave;
    },
    get pushCloudSave() {
      return pushCloudSave;
    },
    get renderInventoryItemVisual() {
      return renderInventoryItemVisual;
    },
    get renderProfileItemCard() {
      return typeof renderProfileItemCard === "undefined" ? void 0 : renderProfileItemCard;
    },
    get requestGameConfirmation() {
      return typeof requestGameConfirmation === "undefined" ? void 0 : requestGameConfirmation;
    },
    get saveGame() {
      return saveGame;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get shopView() {
      return shopView;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get weaponCategorySlotLabel() {
      return weaponCategorySlotLabel;
    }
  };
  var rules = new EquipmentHallRules({
    get equipmentSockets() {
      return equipmentSockets;
    },
    get bagItems() {
      return bagItems;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get _t() {
      return _t;
    },
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter
  });
  var service = new EquipmentHallService(deps, state, rules);
  var view = new EquipmentHallView(deps, state, service);
  var actions = new EquipmentHallActions(deps, state, service, view);
  window.GameModules.equipmentHall = { state, dispose: () => actions.dispose() };
  safeExposeGlobals({
    hallItemIssue: rules.hallItemIssue.bind(rules),
    loadPlayerExchange: actions.loadPlayerExchange.bind(actions),
    selectPlayerHallItem: view.selectPlayerHallItem.bind(view),
    renderPlayerExchange: view.renderPlayerExchange.bind(view)
  });
})();
