// GENERATED from modules/social*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/data/social.mjs
  var social_exports = {};
  __export(social_exports, {
    CHAT_SETTINGS_ID: () => CHAT_SETTINGS_ID,
    PROFILE_CORE_TONE: () => PROFILE_CORE_TONE,
    PROFILE_OFF_STYLE: () => PROFILE_OFF_STYLE,
    PROFILE_STAT_GROUPS: () => PROFILE_STAT_GROUPS,
    PROFILE_STAT_ICONS: () => PROFILE_STAT_ICONS,
    PROFILE_STAT_KEYS: () => PROFILE_STAT_KEYS,
    PROFILE_STAT_TONES: () => PROFILE_STAT_TONES,
    PROFILE_STUMP_CELLS: () => PROFILE_STUMP_CELLS,
    PROFILE_TALISMAN_RARITY: () => PROFILE_TALISMAN_RARITY,
    PROFILE_TALISMAN_STATES: () => PROFILE_TALISMAN_STATES,
    SOCIAL_BG_NOTI_POLL_MS: () => SOCIAL_BG_NOTI_POLL_MS,
    SOCIAL_BLOCKED_KEY: () => SOCIAL_BLOCKED_KEY,
    SOCIAL_CHAT_ERROR_TEXTS: () => SOCIAL_CHAT_ERROR_TEXTS,
    SOCIAL_CHAT_FORGET_MS: () => SOCIAL_CHAT_FORGET_MS,
    SOCIAL_CHAT_FULL_SYNC_MS: () => SOCIAL_CHAT_FULL_SYNC_MS,
    SOCIAL_CHAT_LIMIT: () => SOCIAL_CHAT_LIMIT,
    SOCIAL_CHAT_LIVE_HIDDEN_MS: () => SOCIAL_CHAT_LIVE_HIDDEN_MS,
    SOCIAL_CHAT_LIVE_MISSES: () => SOCIAL_CHAT_LIVE_MISSES,
    SOCIAL_CHAT_LIVE_POLL_MS: () => SOCIAL_CHAT_LIVE_POLL_MS,
    SOCIAL_CHAT_LIVE_SETTLE_MS: () => SOCIAL_CHAT_LIVE_SETTLE_MS,
    SOCIAL_CHAT_POLL_MS: () => SOCIAL_CHAT_POLL_MS,
    SOCIAL_CHAT_RETENTION_MS: () => SOCIAL_CHAT_RETENTION_MS,
    SOCIAL_CHAT_TOAST_GAP_MS: () => SOCIAL_CHAT_TOAST_GAP_MS,
    SOCIAL_CHAT_TOAST_MS: () => SOCIAL_CHAT_TOAST_MS,
    SOCIAL_EQUIP_SLOTS: () => SOCIAL_EQUIP_SLOTS,
    SOCIAL_HEARTBEAT_MS: () => SOCIAL_HEARTBEAT_MS,
    SOCIAL_ITEM_ARRAY_LIMITS: () => SOCIAL_ITEM_ARRAY_LIMITS,
    SOCIAL_ITEM_TOKEN_RE: () => SOCIAL_ITEM_TOKEN_RE,
    SOCIAL_LAST_SEEN_CHAT_KEY: () => SOCIAL_LAST_SEEN_CHAT_KEY,
    SOCIAL_LEGACY_ITEM_LINE_LIMIT: () => SOCIAL_LEGACY_ITEM_LINE_LIMIT,
    SOCIAL_MAX_ITEMS_PER_MSG: () => SOCIAL_MAX_ITEMS_PER_MSG,
    SOCIAL_MSG_MAX: () => SOCIAL_MSG_MAX,
    SOCIAL_NICK_KEY: () => SOCIAL_NICK_KEY,
    SOCIAL_NICK_MAX: () => SOCIAL_NICK_MAX,
    SOCIAL_NICK_MIN: () => SOCIAL_NICK_MIN,
    SOCIAL_NICK_RE: () => SOCIAL_NICK_RE,
    SOCIAL_ONLINE_POLL_MS: () => SOCIAL_ONLINE_POLL_MS,
    SOCIAL_ONLINE_WINDOW_S: () => SOCIAL_ONLINE_WINDOW_S,
    SOCIAL_PROFILE_SYNC_DELAY_MS: () => SOCIAL_PROFILE_SYNC_DELAY_MS,
    SOCIAL_RECENT_WINDOW_S: () => SOCIAL_RECENT_WINDOW_S,
    SOCIAL_SEND_MAX_PER_MIN: () => SOCIAL_SEND_MAX_PER_MIN,
    SOCIAL_SEND_MIN_INTERVAL_MS: () => SOCIAL_SEND_MIN_INTERVAL_MS,
    SOCIAL_TALISMAN_LINE_LIMIT: () => SOCIAL_TALISMAN_LINE_LIMIT,
    profileOwn: () => profileOwn,
    socialChatMaxId: () => socialChatMaxId
  });
  var SOCIAL_NICK_KEY = "arpg_social_nickname";
  var SOCIAL_LAST_SEEN_CHAT_KEY = "arpg_social_last_seen_chat_id";
  var SOCIAL_CHAT_LIMIT = 50;
  var SOCIAL_CHAT_POLL_MS = 4e3;
  var SOCIAL_ONLINE_POLL_MS = 3e4;
  var SOCIAL_CHAT_FULL_SYNC_MS = 5 * 60 * 1e3;
  var SOCIAL_CHAT_FORGET_MS = 60 * 1e3;
  var SOCIAL_CHAT_LIVE_POLL_MS = 6e4;
  var SOCIAL_CHAT_LIVE_HIDDEN_MS = 6e4;
  var SOCIAL_CHAT_LIVE_MISSES = 2;
  var SOCIAL_CHAT_LIVE_SETTLE_MS = 1e4;
  var SOCIAL_BG_NOTI_POLL_MS = 15e3;
  var SOCIAL_CHAT_TOAST_MS = 3600;
  var SOCIAL_CHAT_TOAST_GAP_MS = 4e3;
  var SOCIAL_MSG_MAX = 300;
  var SOCIAL_NICK_MIN = 2;
  var SOCIAL_NICK_MAX = 16;
  var SOCIAL_SEND_MIN_INTERVAL_MS = 1500;
  var SOCIAL_SEND_MAX_PER_MIN = 12;
  var SOCIAL_MAX_ITEMS_PER_MSG = 3;
  var SOCIAL_TALISMAN_LINE_LIMIT = 5;
  var SOCIAL_LEGACY_ITEM_LINE_LIMIT = 8;
  var SOCIAL_ITEM_ARRAY_LIMITS = Object.freeze({ baseStats: 8, stats: 12, extraStats: 4, jewelStats: 8, sockets: 8, anoint: 2, ember: 2 });
  var SOCIAL_PROFILE_SYNC_DELAY_MS = 700;
  var SOCIAL_HEARTBEAT_MS = 3e4;
  var SOCIAL_ONLINE_WINDOW_S = 300;
  var SOCIAL_RECENT_WINDOW_S = 1800;
  var SOCIAL_CHAT_RETENTION_MS = 3 * 24 * 60 * 60 * 1e3;
  var SOCIAL_ITEM_TOKEN_RE = /⟦(\d+)⟧/g;
  var SOCIAL_NICK_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-]+$/;
  var SOCIAL_EQUIP_SLOTS = ["무기", "투구", "목걸이", "장갑1", "갑옷", "방패", "반지1", "허리띠", "반지2", "신발", "장갑2"];
  var SOCIAL_BLOCKED_KEY = "arpg_social_blocked_users";
  var PROFILE_STAT_KEYS = Object.freeze([
    ["dps", "log:attack"],
    ["summonDps", "log:attack"],
    ["baseDmg", "log:attack"],
    ["aspd", "tree:precision"],
    ["crit", "tree:precision"],
    ["critDmg", "log:attack"],
    ["maxHp", "tree:life"],
    ["energyShield", "tree:arcane"],
    ["armor", "log:phys"],
    ["evasion", "tree:wind"],
    ["deflectChance", "tree:shield"],
    ["blockChance", "tree:shield"],
    ["dr", "log:phys"],
    ["regen", "tree:life"],
    ["resF", "log:fire"],
    ["resC", "log:cold"],
    ["resL", "log:light"],
    ["resChaos", "log:chaos"]
  ]);
  var PROFILE_STAT_ICONS = new Map(PROFILE_STAT_KEYS);
  var PROFILE_STAT_GROUPS = Object.freeze([
    ["공격", ["dps", "summonDps", "baseDmg", "aspd", "crit", "critDmg"]],
    ["방어", ["maxHp", "energyShield", "armor", "evasion", "deflectChance", "blockChance", "dr", "regen"]],
    ["저항", ["resF", "resC", "resL", "resChaos"]]
  ]);
  var PROFILE_STAT_TONES = Object.freeze({
    dps: "#ffcf6e",
    summonDps: "#ffcf6e",
    baseDmg: "#ffcf9f",
    aspd: "#fff3a8",
    crit: "#ffd6f2",
    critDmg: "#ffd6f2",
    maxHp: "#ff6b6b",
    regen: "#ff9c9c",
    energyShield: "#7fd3ff",
    armor: "#d2b98c",
    dr: "#d2b98c",
    evasion: "#8fe08f",
    deflectChance: "#8fe08f",
    blockChance: "#b8c4cc",
    resF: "#ff8a50",
    resC: "#6cb8ff",
    resL: "#ffd54f",
    resChaos: "#c39bff"
  });
  var SOCIAL_CHAT_ERROR_TEXTS = [
    [/SPAM_TOO_FAST/, "메시지를 너무 빠르게 보냈습니다."],
    [/SPAM_RATE_LIMIT/, "너무 많이 보냈습니다. 잠시 후 다시 시도해주세요."],
    [/SPAM_DUPLICATE/, "같은 메시지를 연속으로 보낼 수 없습니다."],
    [/SPAM_REPEAT/, "같은 메시지를 5분 안에 세 번 보낼 수 없습니다."],
    [/SPAM_FLOOD/, "같은 글자를 너무 많이 반복했습니다."],
    [/CHAT_ACCOUNT_HELD/, "운영 검토 중인 계정이라 채팅을 보낼 수 없습니다."],
    // 관리자 보류(db/anti-cheat.sql 5절)
    [/CHAT_MUTED/, (msg) => msg.replace(/^[\s\S]*?CHAT_MUTED:\s*/, "")],
    // 서버 문구에 남은 시간이 있다: "채팅이 금지된 상태입니다. N분 뒤 풀립니다."
    [/CHAT_PROFANITY/, "비속어가 들어 있어 보낼 수 없습니다."],
    [/CHAT_LINK/, "링크는 보낼 수 없습니다."],
    [/CHAT_PAYLOAD_INVALID/, `아이템 링크는 메시지마다 ${SOCIAL_MAX_ITEMS_PER_MSG}개까지입니다.`],
    [/CHAT_NICKNAME_MISMATCH|CHAT_UPDATE_FORBIDDEN/, "채팅 닉네임은 프로필 닉네임과 같아야 합니다."],
    [/char_length|_body_check|violates check/, `메시지는 1~${SOCIAL_MSG_MAX}자여야 합니다.`],
    [/row-level security/i, "닉네임 확인에 실패했습니다. 잠시 후 다시 보내 주세요."]
  ];
  var socialChatMaxId = (rows) => rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
  var PROFILE_TALISMAN_STATES = Object.freeze({
    awake: "",
    asleep: "",
    suppressed: "비활성화: 척력 인접",
    amplified: "척력으로 효과 +25%",
    stored: ""
  });
  var PROFILE_OFF_STYLE = ' style="color:#8d867a;"';
  var PROFILE_TALISMAN_RARITY = Object.freeze({ magic: "마법", rare: "희귀", unique: "고유" });
  var profileOwn = (table, key) => Object.prototype.hasOwnProperty.call(table, key) ? table[key] : "";
  var PROFILE_CORE_TONE = "#6d8fa8";
  var PROFILE_STUMP_CELLS = 25;
  var CHAT_SETTINGS_ID = "chat-settings-overlay";

  // modules/state/social-session.mjs
  var INITIAL_SOCIAL_STATE = {
    nickname: "",
    nicknameUserId: null,
    sessionEpoch: null,
    identityCheckedUserId: null,
    identityCheckPromise: null,
    chatPollTimer: null,
    onlinePollTimer: null,
    heartbeatTimer: null,
    bgNotificationTimer: null,
    chatLoading: false,
    chatSending: false,
    chatSendRequest: null,
    chatInitialized: false,
    chatMessages: [],
    lastChatFullSyncAt: 0,
    lastChatPollAt: 0,
    lastChatNoticeAt: 0,
    chatChannel: null,
    chatChannelUserId: null,
    chatChannelSession: null,
    chatRealtime: null,
    chatLive: false,
    chatLiveMisses: 0,
    chatLiveSince: 0,
    chatLiveHiddenTimer: null,
    onlineLoading: false,
    lastOnlineLoadAt: 0,
    lastOnlineLoadWasList: false,
    onlineChatTimer: null,
    lastChatRenderKey: "",
    lastOnlineRenderKey: "",
    profileUploadPromise: null,
    profileUploadUserId: null,
    profileSyncTimer: null,
    profileBootSyncUserId: null,
    /** The last profile write this session: account, nickname and snapshot without its clock (an identical one is not sent again),
     * and the account and nickname whose row it wrote (a chat line needs that row, not a fresh 27 KB profile before every line). */
    profileSentKey: "",
    profileRowFor: "",
    onlineSupported: true,
    pendingChatItems: [],
    sendTimestamps: [],
    lastSentBody: "",
    scrollChatToLatestOnNextRender: true,
    lastNotifiedChatId: null,
    lastChatToastAt: 0,
    // 채팅 칸을 그린 계정(restoreChatDraft): 칸을 다시 그릴 때 쓰던 글은 같은 계정일 때만 되살린다.
    chatDraftUserId: null,
    chatTips: {},
    profileTips: {},
    pickTips: {},
    currentProfile: null,
    currentProfileUserId: null,
    profileRequest: null,
    profileTab: "equipment",
    bgNotiLoading: false
  };
  var SocialSessionState = class {
    constructor() {
      this.disposed = false;
      this.current = JSON.parse(JSON.stringify(INITIAL_SOCIAL_STATE));
    }
  };

  // modules/browser/social-lifecycle.mjs
  var SocialLifecycle = class {
    constructor(deps, state2, services) {
      this.deps = deps;
      this.state = state2;
      this.services = services;
      this.started = false;
      this.startupTimer = null;
      this.mount = this.mount.bind(this);
    }
    mount() {
      if (!this.started) return;
      this.services.styles.injectSocialStyles();
      this.services.tooltip.ensureSocialTooltip();
    }
    start() {
      if (this.started || !this.deps.document) return;
      this.started = true;
      this.state.disposed = false;
      const { document: document2 } = this.deps;
      if (document2.readyState === "loading") document2.addEventListener("DOMContentLoaded", this.mount, { once: true });
      else this.mount();
      this.startupTimer = this.deps.setTimeout(() => {
        this.startupTimer = null;
        if (this.started) this.services.background.syncSocialBackgroundTasks();
      }, 15e3);
      document2.addEventListener("visibilitychange", this.services.realtime.syncLiveChat);
    }
    dispose() {
      this.started = false;
      this.state.disposed = true;
      this.deps.clearTimeout(this.startupTimer);
      this.startupTimer = null;
      this.deps.document?.removeEventListener("DOMContentLoaded", this.mount);
      this.deps.document?.removeEventListener("visibilitychange", this.services.realtime.syncLiveChat);
      this.services.reset.stopHeartbeat();
      this.services.reset.stopSocialNotificationPolling();
      this.services.reset.closeLiveChat();
      this.services.reset.resetSocialSessionViews();
    }
  };

  // modules/ui/social-session.mjs
  var SocialSession = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["socialLoggedInUserId", "socialCloudReady", "socialSessionContext", "isSocialSessionCurrent", "releaseSocialRequest"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    socialLoggedInUserId() {
      return typeof this.deps.cloudState !== "undefined" && this.deps.cloudState && this.deps.cloudState.user && this.deps.cloudState.user.id ? this.deps.cloudState.user.id : null;
    }
    socialCloudReady() {
      return !this.state.disposed && !!this.socialLoggedInUserId() && typeof this.deps.cloudJsonRequest === "function";
    }
    socialSessionContext() {
      return { userId: this.socialLoggedInUserId(), epoch: typeof this.deps.cloudState !== "undefined" ? this.deps.cloudState.sessionEpoch || 0 : 0 };
    }
    isSocialSessionCurrent(context) {
      let current = this.socialSessionContext();
      return !this.state.disposed && !!context.userId && context.userId === current.userId && context.epoch === current.epoch;
    }
    releaseSocialRequest(key, context) {
      if (this.state.current[key] === context) this.state.current[key] = false;
    }
  };

  // modules/ui/social-format.mjs
  var SocialFormat = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["socialEscape", "socialComma", "getSocialNicknameStorageKey", "socialClassLabel", "socialSafeColor", "socialRarityColor"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    socialEscape(text) {
      if (typeof this.deps.escapeHTML === "function") return this.deps.escapeHTML(String(text == null ? "" : text));
      return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    }
    socialComma(n) {
      return Math.floor(Number(n) || 0).toLocaleString("en-US");
    }
    getSocialNicknameStorageKey(userId) {
      return userId ? `${this.data.SOCIAL_NICK_KEY}:${userId}` : "";
    }
    socialClassLabel(ascendClass) {
      if (ascendClass && typeof this.deps.CLASS_TEMPLATES !== "undefined" && this.deps.CLASS_TEMPLATES[ascendClass]) return this.deps.CLASS_TEMPLATES[ascendClass].name;
      return "미전직";
    }
    socialSafeColor(c, fallback) {
      fallback = fallback || "#cfe0f5";
      return typeof c === "string" && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s]+\))$/.test(c) ? c : fallback;
    }
    socialRarityColor(rarity) {
      return this.socialSafeColor(typeof this.deps.getRarityColor === "function" ? this.deps.getRarityColor(rarity) : null, "#cfe0f5");
    }
  };

  // modules/ui/social-reset.mjs
  var SocialReset = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["resetSocialSessionViews", "closePlayerProfile", "stopChatPolling", "stopHeartbeat", "stopSocialNotificationPolling", "closeLiveChat", "hideSocialTip"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    resetSocialSessionViews() {
      this.stopChatPolling();
      this.deps.clearTimeout(this.state.current.profileSyncTimer);
      Object.assign(this.state.current, {
        chatMessages: [],
        chatTips: {},
        profileTips: {},
        pickTips: {},
        chatInitialized: false,
        chatLoading: false,
        chatSending: false,
        chatSendRequest: null,
        onlineLoading: false,
        bgNotiLoading: false,
        onlineRefreshAgain: false,
        lastChatFullSyncAt: 0,
        lastChatPollAt: 0,
        lastChatNoticeAt: 0,
        lastOnlineLoadAt: 0,
        lastOnlineLoadWasList: false,
        lastChatRenderKey: "",
        lastOnlineRenderKey: "",
        lastNotifiedChatId: null,
        profileSentKey: "",
        profileRowFor: "",
        profileSyncTimer: null,
        profileUploadPromise: null,
        profileUploadUserId: null
      });
      if (typeof this.deps.game !== "undefined" && this.deps.game && this.deps.game.noti) this.deps.game.noti.social = false;
      if (typeof this.deps.document === "undefined") return;
      this.closePlayerProfile();
      for (let id of ["social-chat-list", "social-online", "social-chat-online", "social-profile-body", "social-tooltip"]) {
        let element = this.deps.document.getElementById(id);
        if (element) {
          element.innerHTML = "";
          delete element.dataset.counts;
        }
      }
      let settings = this.deps.document.getElementById(this.data.CHAT_SETTINGS_ID);
      if (settings) settings.remove();
    }
    stopHeartbeat() {
      if (!this.state.current.heartbeatTimer) return;
      this.deps.clearInterval(this.state.current.heartbeatTimer);
      this.state.current.heartbeatTimer = null;
    }
    stopSocialNotificationPolling() {
      if (!this.state.current.bgNotificationTimer) return;
      this.deps.clearInterval(this.state.current.bgNotificationTimer);
      this.state.current.bgNotificationTimer = null;
    }
    closeLiveChat() {
      this.deps.clearTimeout(this.state.current.chatLiveHiddenTimer);
      this.state.current.chatLiveHiddenTimer = null;
      this.state.current.chatLive = false;
      let channel = this.state.current.chatChannel, client = this.state.current.chatRealtime;
      if (!channel) return;
      this.state.current.chatChannel = null;
      this.state.current.chatChannelUserId = null;
      this.state.current.chatChannelSession = null;
      if (client) {
        Promise.resolve(client.removeChannel(channel)).catch((error) => this.deps.console.warn("채팅 실시간 연결 해제 실패:", error));
      }
    }
    stopChatPolling() {
      if (this.state.current.chatPollTimer) this.deps.clearInterval(this.state.current.chatPollTimer);
      if (this.state.current.onlinePollTimer) this.deps.clearInterval(this.state.current.onlinePollTimer);
      this.deps.clearTimeout(this.state.current.onlineChatTimer);
      this.state.current.chatPollTimer = null;
      this.state.current.onlinePollTimer = null;
      this.state.current.onlineChatTimer = null;
    }
    hideSocialTip() {
      let t = this.deps.document.getElementById("social-tooltip");
      if (t) t.style.display = "none";
    }
    closePlayerProfile() {
      this.hideSocialTip();
      this.state.current.profileRequest = null;
      this.state.current.currentProfile = null;
      this.state.current.currentProfileUserId = null;
      this.state.current.profileTips = {};
      let m = this.deps.document.getElementById("social-profile-modal");
      if (m) m.style.display = "none";
    }
  };

  // modules/ui/social-identity.mjs
  var SocialIdentity = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["syncSocialIdentityUser", "getMyNickname", "setMyNicknameLocal"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    syncSocialIdentityUser() {
      let { userId, epoch } = this.services.session.socialSessionContext();
      if (this.state.current.nicknameUserId === userId && this.state.current.sessionEpoch === epoch) return userId;
      this.services.reset.resetSocialSessionViews();
      this.state.current.sessionEpoch = epoch;
      this.state.current.nickname = "";
      this.state.current.nicknameUserId = userId || null;
      this.state.current.identityCheckedUserId = null;
      this.state.current.identityCheckPromise = null;
      this.state.current.profileBootSyncUserId = null;
      this.state.current.pendingChatItems = [];
      try {
        if (typeof this.deps.localStorage !== "undefined" && typeof this.deps.localStorage.removeItem === "function") this.deps.localStorage.removeItem(this.data.SOCIAL_NICK_KEY);
      } catch (error) {
        this.deps.console.warn("이전 소셜 닉네임 캐시 정리 실패:", error);
      }
      return userId;
    }
    getMyNickname() {
      let userId = this.syncSocialIdentityUser();
      if (!userId) return "";
      if (this.state.current.nickname) return this.state.current.nickname;
      try {
        let key = this.services.format.getSocialNicknameStorageKey(userId);
        let stored = key && this.deps.localStorage.getItem(key);
        if (stored) this.state.current.nickname = stored;
      } catch (error) {
        this.deps.console.warn("소셜 닉네임 캐시 읽기 실패:", error);
      }
      return this.state.current.nickname || "";
    }
    setMyNicknameLocal(name) {
      let userId = this.syncSocialIdentityUser();
      this.state.current.nickname = userId ? name || "" : "";
      if (!userId) return;
      try {
        let key = this.services.format.getSocialNicknameStorageKey(userId);
        if (this.state.current.nickname) this.deps.localStorage.setItem(key, this.state.current.nickname);
        else if (typeof this.deps.localStorage.removeItem === "function") this.deps.localStorage.removeItem(key);
      } catch (error) {
        this.deps.console.warn("소셜 닉네임 캐시 저장 실패:", error);
      }
    }
  };

  // modules/ui/social-profile-values.mjs
  var SocialProfileValues = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["profileAnointSnapshot", "profileItemCategory", "profileItemTag", "profileSnapshotRows", "profileStatLabel", "profileStatTone", "profileValue", "profileJewelValue"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    profileItemCategory(item) {
      return item.slot === "무기" && typeof this.deps.getWeaponCategoryName === "function" ? this.deps.getWeaponCategoryName(item) || void 0 : void 0;
    }
    profileItemTag(item) {
      return this.deps.weaponCategorySlotLabel(item, item.category || String(item.slot || "").replace(/[123]$/, ""));
    }
    profileStatLabel(st) {
      return st.statName || (typeof this.deps.getStatName === "function" ? this.deps.getStatName(st.id) : st.id) || st.id;
    }
    profileStatTone(id) {
      return this.services.format.socialSafeColor(typeof this.deps.window.getItemStatToneColor === "function" ? this.deps.window.getItemStatToneColor(id) : null, "#cfe0f5");
    }
    profileValue(id, value) {
      return typeof this.deps.formatValue === "function" ? this.deps.formatValue(id, value) : value;
    }
    profileSnapshotRows(rows, limit) {
      return Array.isArray(rows) ? rows.slice(0, limit) : [];
    }
    profileJewelValue(id, value) {
      if (typeof this.deps.formatJewelStatValue === "function") return this.deps.formatJewelStatValue(id, value);
      return this.profileValue(id, value);
    }
    profileAnointSnapshot(item) {
      const nodes = typeof this.deps.gardenOils === "object" ? this.deps.gardenOils.nodesOf(item).filter(Boolean) : [];
      return nodes.length ? nodes.map((node) => ({
        title: node.title,
        text: node.effects.map((effect) => `${this.deps.getStatName(effect.stat)} ${effect.val >= 0 ? "+" : ""}${this.deps.formatValue(effect.stat, effect.val)}`).join(", ")
      })) : void 0;
    }
  };

  // modules/ui/social-snapshot.mjs
  var SocialSnapshot = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["snapStat", "snapStatMarks", "snapAffixKind", "buildItemSnapshot", "buildItemMetaSnapshot", "profileItemLevel", "buildRequirementSnapshot", "buildSocketSnapshots", "buildJewelKeystoneSnapshot", "buildJewelSnapshot", "buildTalismanSnapshot", "talismanStateFor", "statsWithoutBarkZone", "buildProfileStats", "buildSkillSnapshot", "buildProfileIdentity", "buildProfileGear", "buildCoreSnapshot", "buildCoreCard", "buildStumpSnapshot", "buildStumpCellSnapshot", "buildStumpItemCard", "buildStumpItemSnapshot", "stumpItemNote", "buildProfileSnapshot"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    snapStat(st) {
      let o = {
        id: st.id || st.stat,
        val: st.val,
        statName: st.statName,
        tier: st.tier,
        valMin: st.valMin,
        valMax: st.valMax,
        baseRollMin: st.baseRollMin,
        baseRollMax: st.baseRollMax
      };
      return Object.assign(o, this.snapStatMarks(st));
    }
    snapStatMarks(st) {
      let marks = {
        exceptional: !!st.exceptional,
        honey: !!st.lockedByHoney,
        wax: !!st.waxBonus,
        petite: !!st.petite && !st.waxBonus,
        ember: st.emberScale,
        fixed: typeof this.deps.isFixedEquipmentAffix === "function" && this.deps.isFixedEquipmentAffix(st),
        source: typeof this.deps.equipmentCrafting === "object" ? this.deps.equipmentCrafting.getLabel(st) : ""
      };
      return Object.fromEntries(Object.entries(marks).filter(([, value]) => value));
    }
    snapAffixKind(item, st) {
      const kind = typeof this.deps.equipmentCrafting === "object" ? this.deps.equipmentCrafting.storedAffixKind(item, st) : "special";
      return kind === "prefix" || kind === "suffix" ? { kind } : {};
    }
    buildItemSnapshot(item, slotOverride) {
      if (!item) return null;
      const snap = this.itemIdentitySnapshot(item, slotOverride);
      snap.baseStats = (item.baseStats || []).slice(0, 8).map(this.snapStat);
      snap.stats = (item.stats || []).slice(0, 12).map((st) => {
        const stat = this.snapStat(st);
        if (Array.isArray(st.extraStats)) stat.extraStats = st.extraStats.slice(0, 4).map(this.snapStat);
        return Object.assign(stat, this.snapAffixKind(item, st));
      });
      this.applyHallSnapshot(snap, item);
      this.applySpecialItemSnapshot(snap, item);
      return Object.assign(snap, this.buildItemMetaSnapshot(item));
    }
    itemIdentitySnapshot(item, slotOverride) {
      let slot = slotOverride || item.slot || "";
      return {
        slot,
        category: this.services.profileValues.profileItemCategory(item),
        name: item.name || "",
        rarity: item.rarity || "normal",
        baseName: item.baseName || "",
        uniqueEffect: item.uniqueEffect || "",
        // 베이스 수치를 키우는 고유(implicitAmp)의 방어도와 회피(itemTooltipRules.defenseView)가 절반으로 나오지 않게.
        uniqueEffectKey: item.uniqueEffectKey,
        uniqueEffectParams: item.uniqueEffectParams,
        corrupted: !!item.corrupted
      };
    }
    applyHallSnapshot(snap, item) {
      if (item.hallReplica) {
        snap.hallReplica = true;
        snap.hallCuratorName = item.hallCuratorName || "";
        snap.hallAppraisalScore = Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0));
      }
      if (item.hallRelistBlocked) snap.hallRelistBlocked = true;
    }
    applySpecialItemSnapshot(snap, item) {
      if (item.loopSealed) snap.loopSealed = true;
      if (item.fusedRelic) {
        snap.fusedRelic = true;
        snap.fusionGrade = item.fusionGrade || "";
        snap.fusedRareName = item.fusedRareName || "";
      }
      if (item.chaosInfusion) snap.chaosInfusion = Object.assign(this.snapStat(item.chaosInfusion), this.snapAffixKind(item, item.chaosInfusion));
      if (item.encroached) {
        snap.encroached = {
          liberated: !!item.encroached.liberated,
          chosen: item.encroached.liberated && item.encroached.chosen ? this.snapStat(item.encroached.chosen) : null
        };
      }
    }
    buildItemMetaSnapshot(item) {
      let chain = typeof this.deps.getItemBaseChainInfo === "function" ? this.deps.getItemBaseChainInfo(item) : null;
      return {
        baseId: item.baseId,
        // 인형 배치의 장비 그림(profileItemArt)
        wardSlots: typeof this.deps.colonyWards === "object" ? this.deps.colonyWards.beltRoll(item) : void 0,
        // 허리띠의 액막이 칸 수(profileWardSlotsHtml)
        baseStep: chain && chain.total > 1 ? [chain.step, chain.total] : void 0,
        itemLevel: this.profileItemLevel(item),
        grade: typeof this.deps.getItemCraftTier === "function" ? this.deps.getItemCraftTier(item) : void 0,
        requirements: this.buildRequirementSnapshot(item),
        sockets: this.buildSocketSnapshots(item),
        ember: item.burned ? (item.emberLines || []).slice(0, 2).map(this.snapStat) : void 0,
        anoint: this.services.profileValues.profileAnointSnapshot(item)
      };
    }
    profileItemLevel(item) {
      if (item.itemLevel) return Math.floor(Number(item.itemLevel)) || void 0;
      if (typeof this.deps.levelProgression !== "object") return void 0;
      return Math.floor(Number(this.deps.levelProgression.tierLevel(item.hiddenTier || item.itemTier)) || 0) || void 0;
    }
    buildRequirementSnapshot(item) {
      if (typeof this.deps.levelProgression !== "object" || typeof this.deps.levelProgression.requirements !== "function") return void 0;
      let required = this.deps.levelProgression.requirements(item);
      return { level: required.level, attributes: required.attributes };
    }
    buildSocketSnapshots(item) {
      let unlocked = typeof this.deps.contentProgression === "object" && this.deps.contentProgression.isUnlocked("jewel");
      let rows = unlocked && typeof this.deps.equipmentSockets === "object" ? this.deps.equipmentSockets.list(item) : [];
      if (!rows.length) return void 0;
      return rows.map((row) => ({ label: this.deps.equipmentSockets.label(row), jewel: this.buildJewelSnapshot(row.jewel) }));
    }
    buildJewelKeystoneSnapshot(jewel) {
      if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return void 0;
      let id = jewel.cosmosKeystone;
      let owner = typeof this.deps.getAscendKeystoneOwnerClass === "function" ? this.deps.getAscendKeystoneOwnerClass(id) : null;
      let ascend = owner && typeof this.deps.CLASS_TEMPLATES !== "undefined" && this.deps.CLASS_TEMPLATES[owner] ? this.deps.CLASS_TEMPLATES[owner].name : "";
      let active = (Array.isArray(this.deps.game.cosmosTwinKeystones) ? this.deps.game.cosmosTwinKeystones : []).includes(id);
      return { name: typeof this.deps.getAscendKeystoneName === "function" ? this.deps.getAscendKeystoneName(id) : String(id), ascend, active };
    }
    buildJewelSnapshot(jewel) {
      if (!jewel) return null;
      let stats = [];
      try {
        if (typeof this.deps.getJewelStats === "function") this.deps.getJewelStats(jewel).forEach((st) => stats.push(this.snapStat(st)));
      } catch (error) {
        this.deps.console.warn("[social] jewel snapshot unavailable:", error.message);
      }
      return {
        kind: "jewel",
        name: jewel.name || "주얼",
        rarity: jewel.rarity || "normal",
        stats: stats.slice(0, 8),
        uniqueEffect: this.deps.getJewelUniqueEffectText(jewel) || void 0,
        keystone: this.buildJewelKeystoneSnapshot(jewel)
      };
    }
    buildTalismanSnapshot(t) {
      if (!t || !Array.isArray(t.lines)) return null;
      let lines = t.lines.map((line) => ({ text: this.deps.talismans.describeLine(line), condition: line.kind === "condition" }));
      if (t.special === "moment") lines.push({ text: this.deps._t("보스에게 주는 최종 피해 +{moment}%, 생명력 5% 이하 보스 처형", { moment: t.moment }), condition: true });
      return { kind: "talisman", name: t.name || "부적", rarity: t.rarity || "magic", uniqueEffect: t.uniqueEffect || void 0, lines, state: this.talismanStateFor(t) };
    }
    talismanStateFor(item) {
      if (this.deps.game.stumpBox.board.indexOf(item.id) < 0) return "stored";
      if (!this.deps.stumpBox.isMature(item)) return "asleep";
      let summary = this.deps.talismanEffects.summarize();
      if (summary.suppressed.has(item.id)) return "suppressed";
      return summary.amplified.has(item.id) ? "amplified" : "awake";
    }
    statsWithoutBarkZone() {
      if (!this.deps.getWorldTreeBarkEffect().on) return this.deps.getPlayerStats();
      return this.deps.previewBuildStats((clone) => {
        Object.assign(clone.worldTreeBark, { damage: 0, taken: 0, move: 0 });
      }).after;
    }
    buildProfileStats() {
      let s = typeof this.deps.getPlayerStats === "function" ? this.statsWithoutBarkZone() : null;
      if (!s) return { stats: [], power: 0 };
      let rows = this.data.PROFILE_STAT_KEYS.filter(([key]) => key !== "summonDps" || Number(s.summonDps) > 0).map(([key]) => ({ key, label: key === "dps" ? "직접 DPS" : this.deps.COMPARE_STAT_META[key].label, value: this.deps.COMPARE_STAT_META[key].format(Number(s[key]) || 0) }));
      let power = Math.floor(Number(s.totalDps) || (Number(s.dps) || 0) + (Number(s.summonDps) || 0));
      return { stats: rows, power };
    }
    buildSkillSnapshot(state2) {
      let gem = (name) => ({ name, level: Math.max(1, Math.floor(Number(state2.gemData?.[name]?.level) || 1)), quality: Math.max(0, Math.floor(Number(state2.gemData?.[name]?.quality) || 0)) });
      let support = (name) => ({ name, level: Math.max(1, Math.floor(Number(state2.supportGemData?.[name]?.level) || 1)) });
      let summon = (name) => ({ ...gem(name), count: Math.max(1, Math.floor(Number(state2.summonSkillCounts?.[name]) || 1)) });
      return {
        active: state2.activeSkill ? gem(state2.activeSkill) : null,
        supports: (state2.equippedSupports || []).filter(Boolean).slice(0, 8).map(support),
        mobility: state2.mobilitySkill ? gem(state2.mobilitySkill) : null,
        summons: (state2.equippedSummonSkills || []).filter(Boolean).slice(0, 6).map(summon)
      };
    }
    buildProfileIdentity(state2) {
      let classDef = typeof this.deps.PLAYER_CLASS_DEFS !== "undefined" ? this.deps.PLAYER_CLASS_DEFS[state2.selectedClassId] : null;
      return { classId: state2.selectedClassId || "", heroClassName: classDef ? classDef.label : "", ascendClass: state2.ascendClass || "", className: this.services.format.socialClassLabel(state2.ascendClass) };
    }
    buildProfileGear(state2) {
      let equipment = [];
      let eq = state2.equipment || {};
      Object.keys(eq).filter((slot) => !this.deps.bagItems.isSpecial(eq[slot])).forEach((slot) => {
        let snap = this.buildItemSnapshot(eq[slot], slot);
        if (snap) equipment.push(snap);
      });
      return { equipment: equipment.slice(0, 16), core: this.buildCoreSnapshot(state2), stump: this.buildStumpSnapshot(state2) };
    }
    buildCoreSnapshot(state2) {
      let core = (state2.equipment || {})["코어"];
      if (!core || typeof this.deps.coreItems !== "object" || !this.deps.contentProgression.isUnlocked("cube", state2)) return void 0;
      return this.buildCoreCard(core);
    }
    buildCoreCard(core) {
      return { kind: "core", name: core.name, lines: (core.lines || []).map((line) => this.deps.coreItems.describe(line)) };
    }
    buildStumpSnapshot(state2) {
      let box = state2.stumpBox;
      if (!box || !box.acquired || typeof this.deps.stumpBox !== "object" || box.board.every((id) => id === null)) return void 0;
      let result = this.deps.stumpBox.evaluate(state2);
      return { cells: box.board.map((id, cell) => this.buildStumpCellSnapshot(state2, result, id, cell)) };
    }
    buildStumpCellSnapshot(state2, result, id, cell) {
      if (!this.deps.stumpBox.isOpen(state2, cell)) return null;
      let rank = this.deps.stumpBox.graftRank(state2.stumpBox, cell);
      let row = rank ? { graft: rank, graftPct: rank * this.deps.STUMP_BOX_GRAFT.pctPerRank } : {};
      let card = id === null ? null : this.buildStumpItemCard(this.deps.stumpBox.itemById(state2, id), result);
      if (card) row.item = card;
      return row;
    }
    buildStumpItemCard(item, result) {
      let card = !item ? null : item.family === "talisman" ? this.buildTalismanSnapshot(item) : this.buildStumpItemSnapshot(item, result);
      if (!card) return null;
      return Object.assign(card, { stage: this.deps.stumpBox.stageOf(item), ripe: this.deps.stumpBox.isMature(item), xp: Math.floor(item.xp), need: this.deps.stumpBox.need(item) });
    }
    buildStumpItemSnapshot(item, result) {
      let gain = this.deps.stumpBox.yieldOf(item), suppressed = result.suppressed.has(item.id);
      let value = result.values[item.id] ?? (gain ? gain.value * this.deps.stumpBox.qualityOf(item) * this.deps.stumpBox.goldenMul(item) : 0);
      return {
        kind: "stump",
        family: item.family,
        color: item.color,
        name: this.deps.stumpBox.label(item),
        quality: Math.round(item.roll * 100),
        yieldText: gain ? gain.text.replace("{v}", String(Math.round(value * 10) / 10)) : "",
        suppressed,
        resonant: !suppressed && this.deps.stumpBox.isMature(item) && !!result.synergy[item.id],
        note: this.stumpItemNote(item, result),
        extra: this.deps.stumpBox.extraLinesOf(item, result).map((line) => ({ id: line.stat, text: this.deps.stumpBox.lineText(line.stat, line.value) })),
        golden: this.deps.stumpBox.goldenMul(item) > 1
      };
    }
    stumpItemNote(item, result) {
      let note = this.deps.stumpBox.boardNote(item, result);
      return note ? note.text : "";
    }
    buildProfileSnapshot() {
      let state2 = typeof this.deps.game !== "undefined" && this.deps.game ? this.deps.game : {};
      let numbers = { stats: [], power: 0 };
      try {
        numbers = this.buildProfileStats();
      } catch (e) {
        this.deps.console.warn("프로필 스탯 계산 실패:", e);
      }
      return {
        version: 8,
        nickname: this.services.identity.getMyNickname(),
        level: state2.level || 1,
        ...this.buildProfileIdentity(state2),
        loop: typeof this.deps.getSaveLoopNumber === "function" ? this.deps.getSaveLoopNumber(state2) : 0,
        ...numbers,
        ...this.buildProfileGear(state2),
        skills: this.buildSkillSnapshot(state2),
        updatedAt: Date.now()
      };
    }
  };

  // modules/ui/social-stats-markup.mjs
  var SocialStatsMarkup = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["profileStatIconHtml", "profileStatName", "profileStatValue", "profileStatRowHtml", "profileStatsHtml", "profilePowerHtml"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    profileStatIconHtml(key) {
      let [sheet, name] = String(this.data.PROFILE_STAT_ICONS.get(key) || "").split(":");
      if (sheet === "log") return `<span class="combat-log-icon combat-log-icon--${name}" aria-hidden="true"></span>`;
      let cell = sheet === "tree" && typeof this.deps.window.GameModules.passiveScene.nodes.iconAtlasCell === "object" ? this.deps.window.GameModules.passiveScene.nodes.iconAtlasCell[name] : null;
      if (!cell) return '<span class="social-stat-icon is-none" aria-hidden="true"></span>';
      return `<span class="social-stat-icon" style="background-position:${-(cell[0] * 22 + 3)}px ${-(cell[1] * 22 + 3)}px;" aria-hidden="true"></span>`;
    }
    profileStatName(label) {
      return String(label || "").replace(/^[^\p{L}\p{N}]+/u, "");
    }
    profileStatValue(value) {
      let text = String(value == null ? "" : value);
      return /^-?\d{4,}$/.test(text) ? Number(text).toLocaleString("en-US") : text;
    }
    profileStatRowHtml(s) {
      let tone = this.data.PROFILE_STAT_TONES[s.key];
      return `<div class="social-stat-item"><span class="social-stat-label">${this.profileStatIconHtml(s.key)}${this.services.format.socialEscape(this.profileStatName(s.label))}</span><span class="social-stat-value"${tone ? ` style="color:${tone};"` : ""}>${this.services.format.socialEscape(this.profileStatValue(s.value))}</span></div>`;
    }
    profileStatsHtml(stats) {
      let rows = stats.filter((s) => s && s.label != null);
      if (!rows.length) return '<div class="social-profile-empty">스탯 정보 없음</div>';
      let grouped = new Set(this.data.PROFILE_STAT_GROUPS.flatMap(([, keys]) => keys));
      let groups = this.data.PROFILE_STAT_GROUPS.map(([title, keys]) => [title, keys.map((key) => rows.find((s) => s.key === key)).filter(Boolean)]).concat([["기타", rows.filter((s) => !grouped.has(s.key))]]).filter(([, list]) => list.length);
      if (groups.length === 1) return `<div class="social-stat-grid">${rows.map(this.profileStatRowHtml).join("")}</div>`;
      return groups.map(([title, list]) => `<div class="social-stat-group"><h4>${title}</h4><div class="social-stat-grid${title === "저항" ? " is-pair" : ""}">${list.map(this.profileStatRowHtml).join("")}</div></div>`).join("");
    }
    profilePowerHtml(p) {
      if (!p.power) return "";
      return `<div class="social-profile-power"><span>${p.version >= 8 ? this.deps._t("총 DPS") : this.deps._t("전투력")}</span><b>${this.services.format.socialComma(p.power)}</b></div>`;
    }
  };

  // modules/ui/social-upload.mjs
  var SocialUpload = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["getProfileUploadError", "profileSnapshotIsOwn", "profileWriteFor", "profileRowWrite", "performPlayerProfileUpload", "profileUploadFailure", "uploadPlayerProfile", "flushPlayerProfileQuiet", "syncPlayerProfileQuiet", "syncInitialPlayerProfile", "reportProfileSyncFailure", "updatePastChatNicknames"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getProfileUploadError(error) {
      let message = String(error && error.message || error);
      let translated = error instanceof Error ? error : new Error(message);
      if (/NICK_COOLDOWN/.test(message)) {
        translated = new Error("닉네임은 하루에 한 번만 변경할 수 있습니다.");
        translated.socialCode = "nickname_cooldown";
      }
      if (/NICK_INVALID/.test(message)) {
        translated = new Error(`닉네임은 ${this.data.SOCIAL_NICK_MIN}~${this.data.SOCIAL_NICK_MAX}자의 한글, 영문, 숫자, _ - 만 쓸 수 있습니다.`);
        translated.socialCode = "nickname_invalid";
      }
      if (/NICK_PROFANITY/.test(message)) {
        translated = new Error("닉네임에 비속어를 쓸 수 없습니다.");
        translated.socialCode = "nickname_invalid";
      }
      if (/PROFILE_TOO_LARGE/.test(message)) translated = new Error("공개 프로필이 너무 커서 서버가 받지 않았습니다.");
      if (translated === error && /duplicate|unique|nickname/i.test(message)) {
        translated = new Error("이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.");
        translated.socialCode = "nickname_conflict";
      }
      return translated;
    }
    profileSnapshotIsOwn() {
      if (!this.deps.gameplayStarted || this.deps.startupOverlayActive) return false;
      let owner = this.deps.game.saveMeta ? this.deps.game.saveMeta.cloudUserId : null;
      return !!owner && owner === this.services.session.socialLoggedInUserId();
    }
    profileWriteFor(options, userId, nickname2) {
      let snapshot2 = this.profileSnapshotIsOwn() ? this.services.snapshot.buildProfileSnapshot() : null;
      if (!options.silent || options.required || options.fromNicknameChange) return this.profileRowWrite(userId, nickname2, snapshot2);
      if (!snapshot2) return null;
      let data = { ...snapshot2, nickname: void 0 };
      return {
        key: `${userId}

${JSON.stringify({ ...data, updatedAt: 0 })}`,
        row: false,
        path: `/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}`,
        request: { method: "PATCH", headers: { Prefer: "return=minimal" }, body: { profile_data: data } }
      };
    }
    profileRowWrite(userId, nickname2, snapshot2) {
      return {
        key: `${userId}
${nickname2}
${snapshot2 ? JSON.stringify({ ...snapshot2, updatedAt: 0 }) : ""}`,
        row: true,
        path: "/rest/v1/player_profiles",
        request: {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          // last_seen / nickname_updated_at 은 DB 기본값·트리거·하트비트가 관리한다.
          body: snapshot2 ? { user_id: userId, nickname: nickname2, profile_data: snapshot2 } : { user_id: userId, nickname: nickname2 }
        }
      };
    }
    async performPlayerProfileUpload(options, context, nickname2) {
      if (!this.services.session.isSocialSessionCurrent(context)) return false;
      let userId = context.userId;
      try {
        let write = this.profileWriteFor(options, userId, nickname2);
        if (!write) return false;
        if (write.key === this.state.current.profileSentKey) return true;
        await this.deps.cloudJsonRequest(write.path, write.request);
        if (!this.services.session.isSocialSessionCurrent(context)) return false;
        this.state.current.profileSentKey = write.key;
        if (write.row) this.state.current.profileRowFor = `${userId}
${nickname2}`;
        return true;
      } catch (error) {
        if (!this.services.session.isSocialSessionCurrent(context)) return false;
        return this.profileUploadFailure(options, error);
      }
    }
    profileUploadFailure(options, error) {
      let translated = this.getProfileUploadError(error);
      if (options.fromNicknameChange || options.required) throw translated;
      if (!options.silent) this.deps.console.warn("프로필 업로드 실패:", error);
      return false;
    }
    async uploadPlayerProfile(options = {}) {
      if (!this.services.session.socialCloudReady()) {
        if (options.required) throw new Error("클라우드 로그인 상태를 확인할 수 없습니다.");
        return false;
      }
      let userId = this.services.identity.syncSocialIdentityUser();
      let context = this.services.session.socialSessionContext();
      let nickname2 = this.services.identity.getMyNickname();
      if (!nickname2) {
        if (options.required) throw new Error("먼저 닉네임을 설정해주세요.");
        return false;
      }
      let inFlight = this.state.current.profileUploadPromise;
      if (inFlight && this.state.current.profileUploadUserId === userId) {
        if (options.silent) return inFlight;
        try {
          await inFlight;
        } catch (error) {
          this.deps.console.warn("이전 프로필 갱신 실패:", error);
        }
      }
      let task = this.performPlayerProfileUpload(options, context, nickname2);
      this.state.current.profileUploadPromise = task;
      this.state.current.profileUploadUserId = userId;
      try {
        return await task;
      } finally {
        this.releaseProfileUpload(task);
      }
    }
    releaseProfileUpload(task) {
      if (this.state.current.profileUploadPromise !== task) return;
      this.state.current.profileUploadPromise = null;
      this.state.current.profileUploadUserId = null;
    }
    async flushPlayerProfileQuiet() {
      this.state.current.profileSyncTimer = null;
      if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname() || !this.profileSnapshotIsOwn()) return false;
      let context = this.services.session.socialSessionContext();
      let inFlight = this.state.current.profileUploadPromise;
      if (inFlight) {
        try {
          await inFlight;
        } catch (error) {
          this.deps.console.warn("이전 공개 프로필 갱신 실패:", error);
        }
      }
      if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return false;
      return this.uploadPlayerProfile({ silent: true });
    }
    syncPlayerProfileQuiet() {
      if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname()) return false;
      if (this.state.current.profileSyncTimer && typeof this.deps.clearTimeout === "function") this.deps.clearTimeout(this.state.current.profileSyncTimer);
      if (typeof this.deps.setTimeout !== "function") {
        Promise.resolve(this.flushPlayerProfileQuiet()).catch((error) => this.deps.console.warn("공개 프로필 자동 갱신 실패:", error));
        return true;
      }
      this.state.current.profileSyncTimer = this.deps.setTimeout(() => {
        Promise.resolve(this.flushPlayerProfileQuiet()).catch((error) => this.deps.console.warn("공개 프로필 자동 갱신 실패:", error));
      }, this.data.SOCIAL_PROFILE_SYNC_DELAY_MS);
      return true;
    }
    syncInitialPlayerProfile() {
      let userId = this.services.session.socialLoggedInUserId();
      if (!userId || !this.services.identity.getMyNickname() || this.state.current.profileBootSyncUserId === userId || !this.profileSnapshotIsOwn()) return;
      this.state.current.profileBootSyncUserId = userId;
      this.syncPlayerProfileQuiet();
    }
    reportProfileSyncFailure(error) {
      if (error && error.socialCode === "nickname_conflict") this.services.identity.setMyNicknameLocal("");
      this.deps.showGameToast("프로필 갱신 실패: " + String(error && error.message || error), "danger");
    }
    async updatePastChatNicknames(name) {
      try {
        await this.deps.cloudJsonRequest(`/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { nickname: name }
        });
      } catch (e) {
        this.deps.console.warn("과거 채팅 닉네임 갱신 실패:", e);
      }
    }
  };

  // modules/ui/social-nickname.mjs
  var SocialNickname = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["socialNicknameInput", "restoreNicknameFromServer"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    socialNicknameInput(input, current) {
      if (input == null || String(input).trim() === current) return "";
      let name = String(input).trim();
      let error = "";
      if (name.length < this.data.SOCIAL_NICK_MIN || name.length > this.data.SOCIAL_NICK_MAX) error = this.deps._t("닉네임은 {SOCIAL_NICK_MIN}~{SOCIAL_NICK_MAX}자여야 합니다.", { SOCIAL_NICK_MIN: this.data.SOCIAL_NICK_MIN, SOCIAL_NICK_MAX: this.data.SOCIAL_NICK_MAX });
      else if (!this.data.SOCIAL_NICK_RE.test(name)) error = this.deps._t("닉네임에는 한글, 영문, 숫자, - , _ 만 사용할 수 있습니다.");
      if (error) this.deps.showGameToast(error, "warning");
      return error ? "" : name;
    }
    async restoreNicknameFromServer(force = false) {
      if (!this.services.session.socialCloudReady()) return "";
      let userId = this.services.identity.syncSocialIdentityUser();
      let context = this.services.session.socialSessionContext();
      if (!force && this.state.current.identityCheckedUserId === userId) return this.services.identity.getMyNickname();
      if (this.state.current.identityCheckPromise) return this.state.current.identityCheckPromise;
      let task = (async () => {
        try {
          let rows = await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname`, {});
          let serverNickname = Array.isArray(rows) && rows[0] ? String(rows[0].nickname || "") : "";
          if (!this.services.session.isSocialSessionCurrent(context)) return "";
          if (serverNickname) {
            this.services.identity.setMyNicknameLocal(serverNickname);
            this.state.current.profileRowFor = `${userId}
${serverNickname}`;
          }
          this.state.current.identityCheckedUserId = userId;
          return this.services.identity.getMyNickname();
        } catch (error) {
          if (!this.services.session.isSocialSessionCurrent(context)) return "";
          this.deps.console.warn("서버 닉네임 복원 실패:", error);
          return this.services.identity.getMyNickname();
        }
      })();
      this.state.current.identityCheckPromise = task;
      try {
        return await task;
      } finally {
        if (this.state.current.identityCheckPromise === task) this.state.current.identityCheckPromise = null;
      }
    }
  };

  // modules/ui/social-chat-status.mjs
  var SocialChatStatus = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["isSocialTabActive", "isSocialPageHidden", "isSocialChatNotificationEnabled", "socialChatPollDue", "getLastSeenChatId", "setLastSeenChatId", "socialAdminView"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getLastSeenChatId() {
      try {
        let v = this.deps.localStorage.getItem(this.data.SOCIAL_LAST_SEEN_CHAT_KEY);
        if (v == null || v === "") return null;
        let n = Number(v);
        return Number.isFinite(n) ? n : null;
      } catch (error) {
        this.deps.console.warn("[social] last-seen chat read failed:", error.message);
        return null;
      }
    }
    setLastSeenChatId(id) {
      let n = Number(id);
      if (!Number.isFinite(n)) return;
      let cur = this.getLastSeenChatId();
      if (cur != null && n <= cur) return;
      try {
        this.deps.localStorage.setItem(this.data.SOCIAL_LAST_SEEN_CHAT_KEY, String(n));
      } catch (error) {
        this.deps.console.warn("[social] last-seen chat write failed:", error.message);
      }
    }
    isSocialTabActive() {
      return typeof this.deps.messageFrames === "object" && this.deps.messageFrames.isTabVisible("chat");
    }
    isSocialChatNotificationEnabled() {
      return !(typeof this.deps.game !== "undefined" && this.deps.game && this.deps.game.settings && this.deps.game.settings.socialChatNotifications === false);
    }
    isSocialPageHidden() {
      return typeof this.deps.document !== "undefined" && this.deps.document.hidden === true;
    }
    socialChatPollDue(lastAt) {
      return !this.state.current.chatLive || Date.now() - lastAt >= this.data.SOCIAL_CHAT_LIVE_POLL_MS;
    }
    socialAdminView() {
      return typeof this.deps.location === "object" && new this.deps.URLSearchParams(this.deps.location.search).get("admin") === "1";
    }
  };

  // modules/ui/social-presence-markup.mjs
  var SocialPresenceMarkup = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["renderChatOnlineCount", "renderOnlineCounts", "renderSocialOnlineResult", "renderOnlineUsers", "getSocialPresenceState"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getSocialPresenceState(lastSeen, now = Date.now()) {
      let seenAt = new Date(lastSeen).getTime();
      if (!Number.isFinite(seenAt)) return "";
      let ageSeconds = Math.max(0, now - seenAt) / 1e3;
      if (ageSeconds <= this.data.SOCIAL_ONLINE_WINDOW_S) return "active";
      return ageSeconds <= this.data.SOCIAL_RECENT_WINDOW_S ? "recent" : "";
    }
    renderChatOnlineCount(active, recent) {
      let badge = this.deps.document.getElementById("social-chat-online");
      if (!badge) return;
      badge.hidden = !this.state.current.onlineSupported || active + recent <= 0;
      let key = `${active}|${recent}|${this.deps.i18n.language}`;
      if (badge.dataset.counts === key) return;
      badge.dataset.counts = key;
      badge.innerHTML = `<span><i class="social-presence-dot active" aria-hidden="true"></i>${active}</span><span><i class="social-presence-dot recent" aria-hidden="true"></i>${recent}</span>`;
      badge.setAttribute("aria-label", this.deps._t("지금 접속 {active}명, 30분 안에 다녀간 사람 {recent}명", { active, recent }));
    }
    renderOnlineCounts(counts) {
      this.renderChatOnlineCount(Math.max(0, Math.floor(Number(counts.active) || 0)), Math.max(0, Math.floor(Number(counts.recent) || 0)));
    }
    renderSocialOnlineResult(result) {
      if (result && result.counts) this.renderOnlineCounts(result.counts);
      else this.renderOnlineUsers(result);
    }
    renderOnlineUsers(users, now = Date.now()) {
      let visible = (users || []).map((user) => ({ user, state: this.getSocialPresenceState(user.last_seen, now) })).filter((row) => row.state);
      this.renderChatOnlineCount(visible.filter((row) => row.state === "active").length, visible.filter((row) => row.state !== "active").length);
      let host = this.deps.document.getElementById("social-online");
      if (!host) return;
      if (!this.state.current.onlineSupported) {
        host.style.display = "none";
        return;
      }
      host.style.display = "block";
      let myId = this.services.session.socialLoggedInUserId();
      let key = visible.length ? visible.map((row) => `${row.user.user_id}:${row.user.nickname || ""}:${row.state}`).join(",") : "empty";
      if (key === this.state.current.lastOnlineRenderKey) return;
      this.state.current.lastOnlineRenderKey = key;
      let activeCount = visible.filter((row) => row.state === "active").length;
      let recentCount = visible.length - activeCount;
      let chips = visible.length ? visible.map((row) => {
        let u = row.user;
        let me = u.user_id === myId;
        return `<button type="button" class="social-online-chip ${row.state}${me ? " me" : ""}" onclick="openPlayerProfile('${this.services.format.socialEscape(u.user_id)}')"><span class="social-presence-dot ${row.state}" aria-hidden="true"></span><span>${this.services.format.socialEscape(u.nickname || "익명")}</span>${me ? this.deps._t("<em>나</em>") : ""}</button>`;
      }).join("") : `<span class="social-online-empty">${this.deps._t("지금은 조용합니다.")}</span>`;
      host.innerHTML = `<div class="social-online-title"><span>${this.deps._t("접속 상태")}</span><span class="social-presence-summary"><span><i class="social-presence-dot active"></i>${activeCount}</span><span><i class="social-presence-dot recent"></i>${recentCount}</span></span></div><div class="social-online-list">${chips}</div>`;
    }
  };

  // modules/ui/social-presence.mjs
  var SocialPresence = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["sendPresenceHeartbeat", "ensureHeartbeat", "loadOnlineUsers", "onlineUsersQuery", "shapeOnlineUsers", "noteOnlineLoadError", "refreshOnlineUsers"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
      this.onlineChat = Object.freeze({ due: this.onlineChatDue.bind(this), refresh: this.scheduleOnlineChatRefresh.bind(this) });
    }
    async sendPresenceHeartbeat() {
      if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname() || !this.state.current.onlineSupported) return;
      let context = this.services.session.socialSessionContext();
      try {
        await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { last_seen: (/* @__PURE__ */ new Date()).toISOString() }
        });
      } catch (e) {
        if (this.services.session.isSocialSessionCurrent(context) && /last_seen/i.test(String(e && e.message || e))) this.state.current.onlineSupported = false;
      }
    }
    ensureHeartbeat() {
      if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname()) return;
      if (this.state.current.heartbeatTimer) return;
      this.state.current.heartbeatTimer = this.deps.setInterval(() => {
        if (this.services.session.socialCloudReady() && this.services.identity.getMyNickname() && !this.services.chatStatus.isSocialPageHidden()) this.sendPresenceHeartbeat();
      }, this.data.SOCIAL_HEARTBEAT_MS);
      this.sendPresenceHeartbeat();
    }
    async loadOnlineUsers(countsOnly) {
      if (!this.services.session.socialCloudReady() || !this.state.current.onlineSupported) return [];
      let context = this.services.session.socialSessionContext();
      let countsPath = !!countsOnly && this.state.current.onlineCountsSupported !== false;
      let result;
      try {
        result = await this.deps.cloudJsonRequest(...this.onlineUsersQuery(countsPath));
      } catch (e) {
        if (!this.services.session.isSocialSessionCurrent(context)) return [];
        if (!this.noteOnlineLoadError(String(e && e.message || e), countsPath)) return [];
        countsPath = false;
        try {
          result = await this.deps.cloudJsonRequest(...this.onlineUsersQuery(false));
        } catch {
          return [];
        }
      }
      return this.shapeOnlineUsers(result, countsPath);
    }
    onlineUsersQuery(countsPath) {
      if (countsPath) return ["/rest/v1/rpc/get_online_counts", { method: "POST", body: {} }];
      let cutoff = new Date(Date.now() - this.data.SOCIAL_RECENT_WINDOW_S * 1e3).toISOString();
      return [`/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`, {}];
    }
    shapeOnlineUsers(result, countsPath) {
      if (countsPath) return { counts: result && typeof result === "object" ? result : {} };
      return Array.isArray(result) ? result : [];
    }
    noteOnlineLoadError(text, countsPath) {
      if (/last_seen/i.test(text)) this.state.current.onlineSupported = false;
      if (!countsPath || !/schema cache|could not find|does not exist/i.test(text)) return false;
      this.state.current.onlineCountsSupported = false;
      return true;
    }
    async refreshOnlineUsers(force = false) {
      if (!this.services.session.socialCloudReady() || !this.state.current.onlineSupported || this.services.chatStatus.isSocialPageHidden()) return;
      let listOpen = !!this.deps.document.getElementById("social-online");
      if (!this.onlineChat.due(listOpen, force)) return;
      if (this.state.current.onlineLoading) {
        this.state.current.onlineRefreshAgain = !!this.deps.document.getElementById("social-online");
        return;
      }
      let context = this.services.session.socialSessionContext();
      this.state.current.onlineLoading = context;
      this.state.current.lastOnlineLoadAt = Date.now();
      this.state.current.lastOnlineLoadWasList = listOpen;
      try {
        let result = await this.loadOnlineUsers(!listOpen);
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.services.presenceMarkup.renderSocialOnlineResult(result);
      } catch (error) {
        this.deps.console.warn("[social] online-user refresh failed:", error.message);
      } finally {
        this.services.session.releaseSocialRequest("onlineLoading", context);
      }
      if (this.state.current.onlineRefreshAgain) {
        this.state.current.onlineRefreshAgain = false;
        this.onlineChat.refresh(true);
      }
    }
    onlineChatDue(listOpen, force) {
      return force || listOpen && !this.state.current.lastOnlineLoadWasList || Date.now() - this.state.current.lastOnlineLoadAt >= this.data.SOCIAL_ONLINE_POLL_MS;
    }
    scheduleOnlineChatRefresh(force) {
      if (this.state.current.onlineChatTimer && !force) return;
      this.deps.clearTimeout(this.state.current.onlineChatTimer);
      let wait = force ? 0 : Math.max(0, this.state.current.lastOnlineLoadAt + this.data.SOCIAL_ONLINE_POLL_MS - Date.now());
      this.state.current.onlineChatTimer = this.deps.setTimeout(() => {
        this.state.current.onlineChatTimer = null;
        this.refreshOnlineUsers(force);
      }, wait);
    }
  };

  // modules/ui/social-blocking.mjs
  var SocialBlocking = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["getBlockedUsers", "getBlockedUserIds", "isUserBlocked", "setUserBlocked"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getBlockedUsers() {
      try {
        let list = JSON.parse(this.deps.localStorage.getItem(this.data.SOCIAL_BLOCKED_KEY) || "[]");
        return Array.isArray(list) ? list.map((entry) => entry && typeof entry === "object" ? { id: String(entry.id || ""), name: String(entry.name || "") } : { id: String(entry || ""), name: "" }).filter((entry) => entry.id && entry.id !== "null") : [];
      } catch {
        return [];
      }
    }
    getBlockedUserIds() {
      return this.getBlockedUsers().map((entry) => entry.id);
    }
    isUserBlocked(userId) {
      return !!userId && this.getBlockedUserIds().includes(String(userId));
    }
    setUserBlocked(userId, blocked, name) {
      let list = this.getBlockedUsers().filter((entry) => entry.id !== String(userId));
      if (blocked) list.push({ id: String(userId), name: String(name || "").slice(0, 16) });
      try {
        this.deps.localStorage.setItem(this.data.SOCIAL_BLOCKED_KEY, JSON.stringify(list.slice(-200)));
      } catch (error) {
        this.deps.console.warn("[social] blocked-user write failed:", error.message);
      }
    }
  };

  // modules/ui/social-notice-view.mjs
  var SocialNoticeView = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["refreshSocialNotificationDots", "noteIncomingChats", "showChatToast", "getSocialChatNotificationPreview"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    refreshSocialNotificationDots() {
      if (typeof this.deps.updateTabNotificationDots === "function") this.deps.updateTabNotificationDots();
    }
    getSocialChatNotificationPreview(row) {
      let body = String(row && row.body || "").replace(new RegExp(this.data.SOCIAL_ITEM_TOKEN_RE.source, "g"), "[아이템]").replace(/\s+/g, " ").trim();
      if (!body) body = row && row.payload ? "아이템을 공유했습니다." : "새 메시지가 도착했습니다.";
      return body.length > 54 ? `${body.slice(0, 54)}…` : body;
    }
    noteIncomingChats(rows) {
      let latest = rows.reduce((max, row) => Math.max(max, Number(row && row.id) || 0), 0);
      if (!Number.isFinite(latest) || latest <= 0) return;
      if (this.services.chatStatus.getLastSeenChatId() == null) {
        this.services.chatStatus.setLastSeenChatId(latest);
        return;
      }
      if (!this.services.chatStatus.isSocialChatNotificationEnabled()) {
        this.services.chatStatus.setLastSeenChatId(latest);
        this.deps.game.noti.social = false;
        this.refreshSocialNotificationDots();
        return;
      }
      let incoming = rows.find((row) => row && row.user_id !== this.services.session.socialLoggedInUserId() && !this.services.blocking.isUserBlocked(row.user_id));
      if (!incoming) {
        this.services.chatStatus.setLastSeenChatId(latest);
        return;
      }
      this.deps.game.noti.social = true;
      this.refreshSocialNotificationDots();
      let incomingId = Number(incoming.id);
      if (this.state.current.lastNotifiedChatId === incomingId) return;
      this.state.current.lastNotifiedChatId = incomingId;
      this.showChatToast(incoming);
    }
    showChatToast(row) {
      let now = Date.now();
      if (typeof this.deps.showGameToast !== "function" || now - this.state.current.lastChatToastAt < this.data.SOCIAL_CHAT_TOAST_GAP_MS) return;
      this.state.current.lastChatToastAt = now;
      this.deps.showGameToast(this.deps._t("새 채팅, {who}: {preview}", { who: String(row.nickname || this.deps._t("플레이어")), preview: this.getSocialChatNotificationPreview(row) }), { tone: "info", duration: this.data.SOCIAL_CHAT_TOAST_MS });
    }
  };

  // modules/ui/social-notifications.mjs
  var SocialNotifications = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["socialChatNoticeQuery", "checkSocialChatNotification", "pollSocialChatNotification", "ensureSocialNotificationPolling"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    socialChatNoticeQuery(seen) {
      let cutoff = encodeURIComponent(new Date(Date.now() - this.data.SOCIAL_CHAT_RETENTION_MS).toISOString());
      let base = `/rest/v1/chat_messages?select=id,user_id,nickname,body&created_at=gte.${cutoff}&order=id.desc&limit=1`;
      if (seen == null) return base;
      let after = Math.max(seen, Number(this.state.current.lastNotifiedChatId) || 0);
      return `${base}&id=gt.${after}&user_id=neq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`;
    }
    async checkSocialChatNotification() {
      if (!this.services.session.socialCloudReady() || this.state.current.bgNotiLoading) return;
      if (this.services.chatStatus.isSocialTabActive()) return;
      if (!this.deps.game?.noti) return;
      let context = this.services.session.socialSessionContext();
      this.state.current.bgNotiLoading = context;
      this.state.current.lastChatNoticeAt = Date.now();
      try {
        let rows = await this.deps.cloudJsonRequest(this.socialChatNoticeQuery(this.services.chatStatus.getLastSeenChatId()), {});
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        rows = Array.isArray(rows) ? rows : [];
        if (rows.length) this.services.noticeView.noteIncomingChats(rows);
      } catch (error) {
        this.deps.console.warn("[social] notification query failed; next poll will retry:", error.message);
      } finally {
        this.services.session.releaseSocialRequest("bgNotiLoading", context);
      }
    }
    pollSocialChatNotification() {
      let due = this.services.chatStatus.isSocialChatNotificationEnabled() ? this.services.chatStatus.socialChatPollDue(this.state.current.lastChatNoticeAt) : Date.now() - this.state.current.lastChatNoticeAt >= this.data.SOCIAL_CHAT_LIVE_POLL_MS;
      if (!this.services.chatStatus.isSocialPageHidden() && due) return this.checkSocialChatNotification();
    }
    ensureSocialNotificationPolling() {
      if (!this.services.session.socialCloudReady() || this.state.current.bgNotificationTimer) return;
      this.state.current.bgNotificationTimer = this.deps.setInterval(this.pollSocialChatNotification, this.data.SOCIAL_BG_NOTI_POLL_MS);
      Promise.resolve(this.checkSocialChatNotification()).catch((error) => this.deps.console.warn("social notification refresh failed:", error));
    }
  };

  // modules/ui/social-chat-data.mjs
  var SocialChatData = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["loadChatMessages", "isSocialChatMessageCurrent", "mergeSocialChatMessages", "checkSendRateLimit", "isForgottenSocialChat", "noteLiveChatGap"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    noteLiveChatGap(rows, fullSync, wasReady) {
      if (fullSync || !wasReady || !this.state.current.chatLive || Date.now() - this.state.current.chatLiveSince < this.data.SOCIAL_CHAT_LIVE_SETTLE_MS) return;
      let listed = new Set(this.state.current.chatMessages.map((row) => String(row.id)));
      if (!rows.some((row) => row.user_id !== this.services.session.socialLoggedInUserId() && !listed.has(String(row.id)))) return;
      if (++this.state.current.chatLiveMisses < this.data.SOCIAL_CHAT_LIVE_MISSES) return;
      this.state.current.chatLive = false;
      this.deps.console.warn("채팅 실시간 수신이 새 채팅을 놓쳐 이 세션은 예전 조회 주기로 돌아갑니다(db/social.sql의 supabase_realtime 발행 확인).");
    }
    async loadChatMessages(afterId = null, now = Date.now()) {
      if (!this.services.session.socialCloudReady()) return [];
      let cutoff = new Date(now - this.data.SOCIAL_CHAT_RETENTION_MS).toISOString();
      let incremental = afterId != null && Number.isFinite(Number(afterId));
      let cursor = incremental ? `&id=gt.${encodeURIComponent(String(afterId))}` : "";
      let order = incremental ? "id.asc" : "created_at.desc";
      let rows = await this.deps.cloudJsonRequest(`/rest/v1/chat_messages?select=id,user_id,nickname,body,payload,created_at&created_at=gte.${encodeURIComponent(cutoff)}${cursor}&order=${order}&limit=${this.data.SOCIAL_CHAT_LIMIT}`, {});
      let current = Array.isArray(rows) ? rows.filter((row) => this.isSocialChatMessageCurrent(row, now)) : [];
      return incremental ? current : current.reverse();
    }
    isSocialChatMessageCurrent(row, now = Date.now()) {
      let createdAt = new Date(row && row.created_at).getTime();
      return Number.isFinite(createdAt) && createdAt > now - this.data.SOCIAL_CHAT_RETENTION_MS;
    }
    mergeSocialChatMessages(current, incoming, now = Date.now()) {
      let byId = /* @__PURE__ */ new Map();
      (current || []).concat(incoming || []).forEach((row) => {
        if (row && Number.isFinite(Number(row.id)) && this.isSocialChatMessageCurrent(row, now)) byId.set(String(row.id), row);
      });
      return Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id)).slice(-this.data.SOCIAL_CHAT_LIMIT);
    }
    checkSendRateLimit() {
      let now = Date.now();
      this.state.current.sendTimestamps = this.state.current.sendTimestamps.filter((t) => now - t < 6e4);
      let last = this.state.current.sendTimestamps[this.state.current.sendTimestamps.length - 1] || 0;
      if (now - last < this.data.SOCIAL_SEND_MIN_INTERVAL_MS) return "메시지를 너무 빠르게 보냈습니다. 잠시 후 다시 시도해주세요.";
      if (this.state.current.sendTimestamps.length >= this.data.SOCIAL_SEND_MAX_PER_MIN) return this.deps._t("1분에 최대 {SOCIAL_SEND_MAX_PER_MIN}개까지 보낼 수 있습니다. 잠시 후 다시 시도해주세요.", { SOCIAL_SEND_MAX_PER_MIN: this.data.SOCIAL_SEND_MAX_PER_MIN });
      return true;
    }
    isForgottenSocialChat(row, now) {
      let forgotten = this.state.current.chatForgotten;
      if (!forgotten) return false;
      return now < forgotten.until && Number(row.id) <= forgotten.through || (forgotten.ids.get(String(row.id)) || 0) > now;
    }
  };

  // modules/ui/social-special-cards.mjs
  var SocialSpecialCards = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["renderProfileJewelCard", "profileJewelHeadHtml", "profileJewelTierHtml", "profileJewelLineHtml", "renderProfileTalismanCard", "profileTalismanLineHtml", "profileTalismanTone", "profileGrowthText", "profileGraftText", "renderProfileCoreCard", "renderProfileStumpCard", "profileStumpExtraHtml", "profileStumpTone", "renderSimpleCard"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    renderProfileJewelCard(jewel) {
      let color = this.services.format.socialRarityColor(jewel.rarity);
      let lines = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).map(this.profileJewelLineHtml).join("");
      return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${this.services.format.socialEscape(jewel.name || "주얼")}</div>${this.profileJewelHeadHtml(jewel)}${lines || this.deps._t('<div class="social-item-stat" style="color:var(--copy-muted);">옵션 정보 없음</div>')}</div>`;
    }
    profileJewelHeadHtml(jewel) {
      let unique = jewel.uniqueEffect ? `<div class="social-item-unique">${this.deps._t("✨ 고유 효과: {uniqueEffect}", { uniqueEffect: this.services.format.socialEscape(jewel.uniqueEffect) })}</div>` : "";
      let key = jewel.keystone;
      let keystone = key && key.name ? `<div class="social-item-stat" style="color:${key.active ? "#8fe7b0" : "#ffd68a"};">🔯 배정 키스톤: ${this.services.format.socialEscape(key.name)}${key.ascend ? `(${this.services.format.socialEscape(key.ascend)})` : ""}${key.active ? this.deps._t(", 할당 중") : this.deps._t(", 짝 주얼의 키스톤과 같으면 할당")}</div>` : "";
      return unique + keystone + this.profileJewelTierHtml(jewel);
    }
    profileJewelTierHtml(jewel) {
      if (jewel.rarity === "unique") return '<div class="social-item-base">고유 고정 옵션, 티어 평가 제외</div>';
      let core = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).filter((st) => st && !st.petite);
      if (!core.length) return "";
      let average = core.reduce((sum, st) => sum + Math.max(1, Math.floor(Number(st.tier) || 1)), 0) / core.length;
      return `<div class="social-item-base">${this.deps._t("옵션 평균 티어: T{average}", { average: average.toFixed(1) })}</div>`;
    }
    profileJewelLineHtml(st) {
      if (!st || st.id == null) return "";
      let tone = this.services.format.socialSafeColor(typeof this.deps.window.getJewelStatToneColor === "function" ? this.deps.window.getJewelStatToneColor(st.id) : null, "#cfe0f5");
      let marks = (st.wax ? '<span style="color:#ffd98a;">밀랍 </span>' : "") + (st.petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : "");
      let tier = Number.isFinite(Number(st.tier)) && !st.petite ? ` <span style="color:#ffd68a;">T${Math.floor(Number(st.tier))}</span>` : "";
      let min = this.services.profileValues.profileJewelValue(st.id, st.valMin ?? st.val), max = this.services.profileValues.profileJewelValue(st.id, st.valMax ?? st.val);
      return `<div class="social-item-stat"><span style="color:${tone};">${marks}${this.services.format.socialEscape(this.services.profileValues.profileStatLabel({ id: st.id }))}: +${this.services.format.socialEscape(this.services.profileValues.profileJewelValue(st.id, st.val))}${tier}</span> <span class="social-roll">${this.deps._t("(고정 범위 {min}~{max})", { min: this.services.format.socialEscape(min), max: this.services.format.socialEscape(max) })}</span></div>`;
    }
    renderProfileTalismanCard(t) {
      if (!Array.isArray(t.lines)) return this.renderSimpleCard(t);
      let tone = this.profileTalismanTone(t), off = t.state !== "awake" && t.state !== "amplified";
      let effect = t.uniqueEffect ? `<div class="social-item-unique"${off ? this.data.PROFILE_OFF_STYLE : ""}>${this.services.format.socialEscape(t.uniqueEffect)}${off ? this.deps._t(" (비활성)") : ""}</div>` : "";
      let lines = t.lines.slice(0, this.data.SOCIAL_TALISMAN_LINE_LIMIT).filter((line) => line && typeof line.text === "string").map((line) => this.profileTalismanLineHtml(line, off)).join("");
      let growth = this.profileGrowthText(t);
      let notes = [this.data.profileOwn(this.data.PROFILE_TALISMAN_STATES, t.state), this.profileGraftText(t)].filter(Boolean).map((text) => `<div class="social-item-base">${this.services.format.socialEscape(text)}</div>`).join("");
      return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${this.services.format.socialEscape(t.name || "부적")}</div>${growth ? `<div class="social-item-base">${this.services.format.socialEscape(growth)}</div>` : ""}<div class="social-item-base" style="color:${tone};">${this.deps._t("{PROFILE_TALISMAN_RARITY} 부적", { PROFILE_TALISMAN_RARITY: this.data.profileOwn(this.data.PROFILE_TALISMAN_RARITY, t.rarity) || this.deps._t("마법") })}</div>${effect}${lines}${notes}</div>`;
    }
    profileTalismanLineHtml(line, off) {
      let style = off ? this.data.PROFILE_OFF_STYLE : line && line.condition ? ' style="color:#d7b8ff;"' : "";
      return `<div class="social-item-stat"${style}>${this.services.format.socialEscape(line && line.text)}${off ? this.deps._t(" (비활성)") : ""}</div>`;
    }
    profileTalismanTone(t) {
      return this.services.format.socialSafeColor(typeof this.deps.TALISMAN_RARITY_TONES === "object" ? this.data.profileOwn(this.deps.TALISMAN_RARITY_TONES, t.rarity) : null, this.services.format.socialRarityColor(t.rarity));
    }
    profileGrowthText(item) {
      let need = Math.floor(Number(item.need) || 0);
      return item.ripe || need <= 0 ? "" : this.deps._t("경험치 {floor} / {need}", { floor: Math.floor(Number(item.xp) || 0), need });
    }
    profileGraftText(item) {
      let rank = Math.floor(Number(item.graft) || 0);
      return rank > 0 ? this.deps._t("접붙이기 {rank}단계, +{floor}%", { rank, floor: Math.floor(Number(item.graftPct) || 0) }) : "";
    }
    renderProfileCoreCard(core) {
      let lines = (Array.isArray(core.lines) ? core.lines : []).slice(0, this.deps.CORE_ITEM_RULES.lines).filter((line) => typeof line === "string").map((line) => `<div class="social-item-stat">${this.services.format.socialEscape(line)}</div>`).join("");
      return `<div class="social-item-card" style="border-color:${this.data.PROFILE_CORE_TONE};"><div class="social-item-title">${this.services.format.socialEscape(core.name || "코어")}</div>${lines}</div>`;
    }
    renderProfileStumpCard(item) {
      let tone = this.profileStumpTone(item), scar = item.family === "scar";
      let gain = item.yieldText ? `${item.yieldText}${item.ripe && !item.suppressed ? "" : this.deps._t(" (비활성)")}` : "";
      let head = [scar ? "" : this.deps._t("품질 {floor}%{value}", { floor: Math.floor(Number(item.quality) || 0), value: item.golden === true ? this.deps._t(", 황금") : "" }), this.profileGrowthText(item), gain];
      let rows = (list) => list.filter(Boolean).map((text) => `<div class="social-item-base">${this.services.format.socialEscape(text)}</div>`).join("");
      return `<div class="social-item-card" style="border-color:${tone};"><div class="social-item-title" style="color:${tone};">${this.services.format.socialEscape(item.name || "그루터기 아이템")}</div>` + rows(head) + this.profileStumpExtraHtml(item) + rows([item.note, this.profileGraftText(item)]) + "</div>";
    }
    profileStumpExtraHtml(item) {
      let rows = Array.isArray(item.extra) ? item.extra.slice(0, 40) : [];
      return rows.filter((row) => row && typeof row.text === "string").map((row) => `<div class="social-item-stat" style="color:${this.services.profileValues.profileStatTone(row.id)};">${this.services.format.socialEscape(row.text)}</div>`).join("");
    }
    profileStumpTone(item) {
      if (item.kind === "talisman") return this.profileTalismanTone(item);
      if (item.family === "scar" && typeof this.deps.STUMP_BOX_SCAR === "object") return this.deps.STUMP_BOX_SCAR.tone;
      let color = typeof this.deps.STUMP_BOX_COLORS === "object" ? this.data.profileOwn(this.deps.STUMP_BOX_COLORS, item.color) : "";
      return this.services.format.socialSafeColor(color && color.tone, "#9d927d");
    }
    renderSimpleCard(snap) {
      let color = this.services.format.socialRarityColor(snap.rarity);
      let lines = (Array.isArray(snap.stats) ? snap.stats : []).slice(0, this.data.SOCIAL_LEGACY_ITEM_LINE_LIMIT).filter((st) => st && st.id != null).map((st) => `<div class="social-item-stat" style="color:${this.services.profileValues.profileStatTone(st.id)};">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(st))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, st.val))}</div>`).concat((Array.isArray(snap.effects) ? snap.effects : []).slice(0, this.data.SOCIAL_LEGACY_ITEM_LINE_LIMIT).filter((effect) => typeof effect === "string").map((effect) => `<div class="social-item-stat" style="color:#d7b8ff;">${this.services.format.socialEscape(effect)}</div>`)).join("");
      return `<div class="social-item-card" style="border-color:${color};"><div class="social-item-title" style="color:${color};">${this.services.format.socialEscape(snap.name)}</div>` + (lines || '<div class="social-item-stat" style="color:var(--copy-muted);">옵션 없음</div>') + "</div>";
    }
  };

  // modules/ui/social-item-cards.mjs
  var SocialItemCards = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["renderProfileItemCard", "profileEquipmentView", "profileSharedAffix", "renderProfileKindCard", "profileItemTitleHtml", "profileItemHallHtml", "profileBaseLineHtml", "profileLevelLineHtml", "profileRequirementText", "profileItemUniqueHtml", "profileItemSocketsHtml", "profileJewelSummary", "profileItemFusionHtml", "profileItemOptionsHtml", "profileAffixHeaderText", "profileExplicitStats", "profileBaseOptionsHtml", "profileWardSlotsHtml", "profileBaseStatHtml", "profileDefenseLinesHtml", "profileExplicitLineHtml", "profileAffixParts", "profileAffixSuffixHtml", "profileTierHtml", "profileRollBound", "profileRollRangeHtml", "profileExceptionalMark", "profileEmberScaleHtml", "profileItemAnointHtml", "profileItemEmberHtml", "profileItemEncroachHtml"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    renderProfileItemCard(item) {
      if (!item) return "";
      if (item.kind) return this.renderProfileKindCard(item);
      item = this.profileEquipmentView(item);
      let color = this.services.format.socialRarityColor(item.rarity);
      return `<div class="social-item-card" style="border-color:${color};">${this.profileItemTitleHtml(item, color)}${this.profileItemHallHtml(item)}${this.profileBaseLineHtml(item)}${this.profileLevelLineHtml(item)}${this.profileItemUniqueHtml(item)}${this.profileItemSocketsHtml(item)}${this.profileItemFusionHtml(item)}${this.profileItemOptionsHtml(item)}</div>`;
    }
    profileEquipmentView(item) {
      return {
        ...item,
        baseStats: this.services.profileValues.profileSnapshotRows(item.baseStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.baseStats),
        stats: this.services.profileValues.profileSnapshotRows(item.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.stats).map(this.profileSharedAffix),
        chaosInfusion: item.chaosInfusion ? this.profileSharedAffix(item.chaosInfusion) : item.chaosInfusion,
        emberLines: this.services.profileValues.profileSnapshotRows(item.emberLines, this.data.SOCIAL_ITEM_ARRAY_LIMITS.ember).map(this.profileSharedAffix),
        encroached: item.encroached ? { ...item.encroached, chosen: this.profileSharedAffix(item.encroached.chosen) } : item.encroached
      };
    }
    profileSharedAffix(stat) {
      if (!stat || typeof stat !== "object") return stat;
      return { ...stat, extraStats: this.services.profileValues.profileSnapshotRows(stat.extraStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.extraStats) };
    }
    renderProfileKindCard(item) {
      if (item.kind === "jewel") return this.services.specialCards.renderProfileJewelCard(item);
      if (item.kind === "talisman") return this.services.specialCards.renderProfileTalismanCard(item);
      if (item.kind === "core") return this.services.specialCards.renderProfileCoreCard(item);
      return item.kind === "stump" ? this.services.specialCards.renderProfileStumpCard(item) : this.services.specialCards.renderSimpleCard(item);
    }
    profileItemTitleHtml(item, color) {
      let stars = typeof this.deps.getExceptionalBaseStars === "function" && Array.isArray(item.baseStats) ? this.deps.getExceptionalBaseStars(item) : "";
      let badges = (item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : "") + (item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : "") + (item.loopSealed ? ' <span style="color:#7fd99a;">🌿봉인</span>' : "");
      return `<div class="social-item-title" style="color:${color};">${item.slot ? `[${this.services.format.socialEscape(this.services.profileValues.profileItemTag(item))}] ` : ""}${this.services.format.socialEscape(item.name)}${stars ? ` <span style="color:#ffb454;">${stars}</span>` : ""}${badges}</div>`;
    }
    profileItemHallHtml(item) {
      if (item.hallReplica) {
        return `<div class="social-item-stat" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${this.services.format.socialEscape(item.hallCuratorName || "익명")}, ${this.deps._t("감정 {max}, 제작과 재등록 불가", { max: Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString() })}</div>`;
      }
      return item.hallRelistBlocked ? '<div class="social-item-stat" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>' : "";
    }
    profileBaseLineHtml(item) {
      if (!item.baseName) return "";
      let info = Array.isArray(item.baseStep) ? { step: Math.floor(Number(item.baseStep[0]) || 0), total: Math.floor(Number(item.baseStep[1]) || 0) } : null;
      let step = info ? ` <span class="${this.deps.getBaseStepClassName(info)}">[${info.step}/${info.total}]</span>` : "";
      return `<div class="social-item-base">${this.deps._t("베이스: {baseName}{step}", { baseName: this.services.format.socialEscape(item.baseName), step })}</div>`;
    }
    profileLevelLineHtml(item) {
      let level = Math.floor(Number(item.itemLevel) || 0), grade = Math.floor(Number(item.grade) || 0);
      let gradeHtml = grade && typeof this.deps.getTierBadgeHtml === "function" ? this.deps._t(" 등급 {grade}", { grade: this.deps.getTierBadgeHtml(grade, "T") }) : "";
      let requirement = this.profileRequirementText(item.requirements);
      return (level ? `<div class="social-item-base">${this.deps._t("아이템 Lv.{level}{grade}", { level, grade: gradeHtml })}</div>` : "") + (requirement ? `<div class="social-item-base">${this.services.format.socialEscape(requirement)}</div>` : "");
    }
    profileRequirementText(req) {
      if (!req || typeof req !== "object") return "";
      let attributes = ["strength", "dexterity", "intelligence"].map((key) => [key, req.attributes && req.attributes[key]]).filter(([, value]) => Number(value) > 0).map(([key, value]) => `${this.services.profileValues.profileStatLabel({ id: key })} ${Math.floor(Number(value))}`);
      return [this.deps._t("요구 Lv.{max}", { max: Math.max(1, Math.floor(Number(req.level) || 1)) }), ...attributes].join(", ");
    }
    profileItemUniqueHtml(item) {
      return item.uniqueEffect ? `<div class="social-item-unique">${this.deps._t("✨ 고유 효과: {uniqueEffect}", { uniqueEffect: this.services.format.socialEscape(item.uniqueEffect) })}</div>` : "";
    }
    profileItemSocketsHtml(item) {
      return this.services.profileValues.profileSnapshotRows(item.sockets, this.data.SOCIAL_ITEM_ARRAY_LIMITS.sockets).filter((row) => row && row.jewel).map((row) => `<div class="social-item-socket">◆ ${this.services.format.socialEscape(row.label)}: <span style="color:${this.services.format.socialRarityColor(row.jewel.rarity)};">${this.services.format.socialEscape(row.jewel.name)}</span>${this.services.format.socialEscape(this.profileJewelSummary(row.jewel))}</div>`).join("");
    }
    profileJewelSummary(jewel) {
      let lines = this.services.profileValues.profileSnapshotRows(jewel.stats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.jewelStats).filter((st) => st && st.id != null).map((st) => `${st.petite ? this.deps._t("쁘띠 ") : ""}${this.services.profileValues.profileStatLabel({ id: st.id })} +${this.services.profileValues.profileJewelValue(st.id, st.val)}`);
      return lines.length ? `, ${lines.join(", ")}` : "";
    }
    profileItemFusionHtml(item) {
      if (!item.fusedRelic) return "";
      let gradeLabel = item.fusionGrade === "perfect" ? "완벽한 융합" : item.fusionGrade === "unstable" ? "불안정한 융합" : "보통 융합";
      return `<div class="social-item-stat" style="color:#8fd8ff;">⌛ ${gradeLabel}${item.fusedRareName ? this.deps._t(", [{fusedRareName}]의 기억", { fusedRareName: this.services.format.socialEscape(item.fusedRareName) }) : ""}</div>`;
    }
    profileItemOptionsHtml(item) {
      let explicit = this.profileExplicitStats(item);
      let empty = typeof this.deps.colonyWards === "object" && this.deps.colonyWards.isWard(item) ? "장비창의 액막이 칸에 끼웁니다" : "일반 아이템: 추가 옵션 없음";
      let html = explicit.length ? `<div class="social-item-section">${this.profileAffixHeaderText(item, explicit)}</div>${explicit.map(this.profileExplicitLineHtml).join("")}` : `<div class="social-item-stat" style="color:var(--copy-muted);">${empty}</div>`;
      return this.profileBaseOptionsHtml(item) + html + this.profileItemEncroachHtml(item) + this.profileItemAnointHtml(item) + this.profileItemEmberHtml(item);
    }
    profileAffixHeaderText(item, explicit) {
      const kinds = explicit.map((st) => st.kind).filter(Boolean);
      const used = kinds.length ? { prefix: kinds.filter((kind) => kind === "prefix").length, suffix: kinds.filter((kind) => kind === "suffix").length } : null;
      return typeof this.deps.equipmentCrafting === "object" ? this.deps.equipmentCrafting.affixHeader(item.rarity, explicit.length, used).text : this.deps._t("추가 옵션 ({length}/6)", { length: explicit.length });
    }
    profileExplicitStats(item) {
      let rows = (Array.isArray(item.stats) ? item.stats : []).filter((st) => st && st.id != null);
      if (item.chaosInfusion && item.chaosInfusion.id != null) rows.push({ ...item.chaosInfusion, statName: this.deps._t("[주입] {chaosInfusion}", { chaosInfusion: this.services.profileValues.profileStatLabel(item.chaosInfusion) }) });
      return typeof this.deps.itemTooltipRules === "object" ? rows.sort(this.deps.itemTooltipRules.compareStats) : rows;
    }
    profileBaseOptionsHtml(item) {
      let base = (Array.isArray(item.baseStats) ? item.baseStats : []).filter((st) => st && st.id != null);
      if (!base.length) return "";
      let defenseIds = typeof this.deps.itemTooltipRules === "object" ? this.deps.itemTooltipRules.DEFENSE_IDS : [];
      let lines = base.filter((st) => !defenseIds.includes(st.id)).map(this.profileBaseStatHtml).join("");
      return `<div class="social-item-section">${this.deps._t("베이스 옵션")}</div>${this.profileWardSlotsHtml(item)}${lines}${this.profileDefenseLinesHtml(item, base)}`;
    }
    profileWardSlotsHtml(item) {
      const range = this.deps.COLONY_WARD_RULES.beltSlots, slots = Math.floor(Number(item.wardSlots));
      if (!(slots >= range.min && slots <= range.max)) return "";
      return `<div class="social-item-stat"><span style="color:#c8b6ff;">${this.deps._t("액막이 칸")} </span><span style="color:#e6dcc6;">+${slots}</span> <span class="social-roll">(${range.min}~${range.max})</span></div>`;
    }
    profileBaseStatHtml(st) {
      let tone = this.services.profileValues.profileStatTone(st.id);
      return `<div class="social-item-stat"><span style="color:${tone};">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(st))} </span><span style="color:${st.exceptional ? "#ffb454" : tone};">+${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, st.val))}</span>${this.profileRollRangeHtml(st, true)}${this.profileExceptionalMark(st)}</div>`;
    }
    profileDefenseLinesHtml(item, base) {
      if (typeof this.deps.itemTooltipRules !== "object") return "";
      let view = this.deps.itemTooltipRules.defenseView(item);
      return this.deps.itemTooltipRules.DEFENSE_IDS.map((id) => {
        let total = Math.floor(view[id]), baseValue = Math.floor(view.base[id]);
        if (!(total > 0) && !(baseValue > 0)) return "";
        let src = base.find((st) => st.id === id) || { id };
        let value = total === baseValue ? `${baseValue}</span>` : `${total}</span> <span style="color:var(--copy-bright);">(${baseValue})</span>`;
        return `<div class="social-item-stat">${this.services.format.socialEscape(this.services.profileValues.profileStatLabel({ id }))}: <span style="color:${src.exceptional ? "#ffb454" : this.services.profileValues.profileStatTone(id)};">${value}${src.val != null ? this.profileRollRangeHtml(src, true) : ""}${this.profileExceptionalMark(src)}</div>`;
      }).join("");
    }
    profileExplicitLineHtml(st) {
      let parts = this.profileAffixParts(st), suffix = this.profileAffixSuffixHtml(st), html = "";
      for (let i = 0; i < parts.length; i += 2) {
        html += `<div class="social-item-stat${i ? " is-continued" : ""}">${parts.slice(i, i + 2).join(", ")}${i ? "" : suffix}</div>`;
      }
      return html;
    }
    profileAffixParts(st) {
      let extras = this.services.profileValues.profileSnapshotRows(st.extraStats, this.data.SOCIAL_ITEM_ARRAY_LIMITS.extraStats).filter((ex) => ex && ex.id != null);
      let label = (part) => extras.length ? this.services.profileValues.profileStatLabel({ id: part.id }) : this.services.profileValues.profileStatLabel(part);
      return [st].concat(extras).map((part) => `<span style="color:${this.services.profileValues.profileStatTone(part.id)};">${this.services.format.socialEscape(label(part))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(part.id, part.val))}</span>`);
    }
    profileAffixSuffixHtml(st) {
      let source = st.source ? ` <span class="equipment-craft-source">${this.services.format.socialEscape(st.source)}</span>` : "";
      let honey = st.honey ? ' <span class="item-affix-lock item-affix-lock--honey">🍯 벌꿀 고정</span>' : "";
      return `${this.profileRollRangeHtml(st, false)}${this.profileTierHtml(st)}${source}${honey}${this.profileEmberScaleHtml(st)}`;
    }
    profileTierHtml(st) {
      if (st.fixed) return ' <span class="tier-badge tier-badge-fixed">[T0]</span>';
      return st.tier !== void 0 && typeof this.deps.getTierBadgeHtml === "function" ? ` ${this.deps.getTierBadgeHtml(Math.floor(Number(st.tier)), "T")}` : "";
    }
    profileRollBound(value, fallback) {
      return Number.isFinite(Number(value)) ? Number(value) : Number(fallback);
    }
    profileRollRangeHtml(st, estimate) {
      let min = this.profileRollBound(st.valMin, st.baseRollMin), max = this.profileRollBound(st.valMax, st.baseRollMax);
      if (estimate && (!Number.isFinite(min) || !Number.isFinite(max))) {
        min = Number((Number(st.val || 0) * 0.8).toFixed(2));
        max = Number((Number(st.val || 0) * 1.2).toFixed(2));
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
      return ` <span class="social-roll">(${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, Math.min(min, max)))}~${this.services.format.socialEscape(this.services.profileValues.profileValue(st.id, Math.max(min, max)))})</span>`;
    }
    profileExceptionalMark(st) {
      return st.exceptional ? ' <span style="color:#ffb454;font-weight:700;">✦+20%</span>' : "";
    }
    profileEmberScaleHtml(st) {
      const pct = Math.round(((Number(st.ember) || 1) - 1) * 100);
      return pct ? ` <span style="color:${pct > 0 ? this.deps.EMBER_CORRUPTION_TONE : "#9aa3ad"};font-weight:700;">🔥${pct > 0 ? "+" : ""}${pct}%</span>` : "";
    }
    profileItemAnointHtml(item) {
      return this.services.profileValues.profileSnapshotRows(item.anoint, this.data.SOCIAL_ITEM_ARRAY_LIMITS.anoint).filter((row) => row && row.title).map((row) => `<div class="social-item-stat" style="color:#cfe0a0;">${this.deps._t("🌿 기름: {title} ({text})", { title: this.services.format.socialEscape(row.title), text: this.services.format.socialEscape(row.text || "") })}</div>`).join("");
    }
    profileItemEmberHtml(item) {
      if (!Array.isArray(item.ember)) return "";
      const lines = this.services.profileValues.profileSnapshotRows(item.ember, this.data.SOCIAL_ITEM_ARRAY_LIMITS.ember).filter((line) => line && line.id != null).map((line) => `<div class="social-item-stat" style="color:${this.deps.EMBER_CORRUPTION_TONE};">${this.deps._t("[잿불] {line} +{id}", { line: this.services.format.socialEscape(this.services.profileValues.profileStatLabel(line)), id: this.services.format.socialEscape(this.services.profileValues.profileValue(line.id, line.val)) })}</div>`).join("");
      return `<div class="social-item-section" style="color:${this.deps.EMBER_CORRUPTION_TONE};">${this.deps._t("🔥 타오른 장비 (다시 태울 수 없음)")}</div>${lines}`;
    }
    profileItemEncroachHtml(item) {
      let encroached = item.encroached;
      if (!encroached) return "";
      let chosen = encroached.liberated && encroached.chosen;
      let line = chosen && chosen.id != null ? `<div class="social-item-stat" style="color:#d7b8ff;">[잠식] ${this.services.format.socialEscape(this.services.profileValues.profileStatLabel(chosen))} +${this.services.format.socialEscape(this.services.profileValues.profileValue(chosen.id, chosen.val))}${this.profileTierHtml({ tier: Number(chosen.tier) || 10 })}</div>` : '<div class="social-item-stat" style="color:#8d7bb3;">해방 전에는 효과 없음, 모든 제작으로도 변하지 않음</div>';
      return `<div class="social-item-section" style="color:#b084ff;">${this.deps._t("잠식 특수 옵션")}</div>${line}`;
    }
  };

  // modules/ui/social-chat-markup.mjs
  var SocialChatMarkup = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["renderChatBody", "renderChatItemLink", "formatChatTime", "scrollSocialChatToLatest", "renderChatMessages"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    renderChatBody(m) {
      let body = String(m.body || "");
      let items = m.payload && Array.isArray(m.payload.items) ? m.payload.items.slice(0, this.data.SOCIAL_MAX_ITEMS_PER_MSG) : [];
      if (!items.length || body.indexOf("⟦") === -1) return this.services.format.socialEscape(body);
      let out = "", lastIndex = 0;
      let re = new RegExp(this.data.SOCIAL_ITEM_TOKEN_RE.source, "g");
      let match;
      while ((match = re.exec(body)) !== null) {
        out += this.services.format.socialEscape(body.slice(lastIndex, match.index));
        let n = parseInt(match[1], 10);
        let snap = items[n];
        out += snap ? this.renderChatItemLink(`${m.id}:${n}`, snap) : this.services.format.socialEscape(match[0]);
        lastIndex = match.index + match[0].length;
      }
      out += this.services.format.socialEscape(body.slice(lastIndex));
      return out;
    }
    renderChatItemLink(key, snap) {
      let name = this.services.format.socialEscape(snap && snap.name), card = "", color = "";
      try {
        card = this.services.itemCards.renderProfileItemCard(snap);
        color = this.services.format.socialRarityColor(snap.rarity);
      } catch (error) {
        this.deps.console.warn("채팅 아이템 카드를 그리지 못했습니다:", error);
      }
      if (!card) return `<span class="social-item-link">[${name}]</span>`;
      this.state.current.chatTips[key] = card;
      return `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${this.services.format.socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${this.services.format.socialEscape(key)}')">[${name}]</span>`;
    }
    formatChatTime(iso) {
      let d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return "";
      let mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
      let hh = String(d.getHours()).padStart(2, "0"), mi = String(d.getMinutes()).padStart(2, "0");
      return `${mm}/${dd} ${hh}:${mi}`;
    }
    scrollSocialChatToLatest(listEl) {
      if (!listEl) return;
      let apply = () => {
        if (listEl.isConnected === false) return;
        listEl.scrollTop = listEl.scrollHeight;
      };
      apply();
      if (typeof this.deps.requestAnimationFrame === "function") this.deps.requestAnimationFrame(apply);
      if (typeof this.deps.setTimeout === "function") this.deps.setTimeout(apply, 50);
    }
    renderChatMessages(messages, forceScroll) {
      let listEl = this.deps.document.getElementById("social-chat-list");
      if (!listEl) return;
      let myId = this.services.session.socialLoggedInUserId();
      let maxId = messages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
      if (maxId > 0) this.services.chatStatus.setLastSeenChatId(maxId);
      if (this.deps.game?.noti) this.deps.game.noti.social = false;
      this.services.noticeView.refreshSocialNotificationDots();
      let blocked = new Set(this.services.blocking.getBlockedUserIds());
      messages = messages.filter((m) => !blocked.has(String(m.user_id)));
      let shouldScroll = this.shouldScrollChat(listEl, forceScroll);
      let key = messages.map((m) => `${m.id}:${m.nickname}`).join(",");
      if (key === this.state.current.lastChatRenderKey) {
        if (shouldScroll) this.scrollSocialChatToLatest(listEl);
        this.state.current.scrollChatToLatestOnNextRender = false;
        return;
      }
      this.state.current.lastChatRenderKey = key;
      if (!messages.length) {
        listEl.innerHTML = `<div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>${this.deps._t("아직 조용합니다")}</strong><small>${this.deps._t("첫 메시지를 남겨보세요.")}</small></div>`;
        this.state.current.scrollChatToLatestOnNextRender = false;
        return;
      }
      this.state.current.chatTips = {};
      let admin = this.services.chatStatus.socialAdminView();
      listEl.innerHTML = messages.map((m) => {
        let mine = m.user_id === myId;
        let nickname2 = String(m.nickname || "익명");
        return `<article class="social-chat-msg${mine ? " mine" : ""}"><header class="social-chat-head"><button type="button" class="social-chat-author" onclick="openPlayerProfile('${this.services.format.socialEscape(m.user_id)}')"><span class="social-chat-nick">${this.services.format.socialEscape(nickname2)}</span></button>${mine ? this.deps._t('<span class="social-chat-self">나</span>') : ""}<time class="social-chat-time">${this.formatChatTime(m.created_at)}</time>${admin ? `<button type="button" class="social-chat-delete" data-chat-delete="${this.services.format.socialEscape(m.id)}" onclick="deleteChatMessage(this)">${this.deps._t("지우기")}</button>` : ""}</header><div class="social-chat-body">${this.renderChatBody(m)}</div></article>`;
      }).join("");
      if (shouldScroll) this.scrollSocialChatToLatest(listEl);
      this.state.current.scrollChatToLatestOnNextRender = false;
    }
    shouldScrollChat(listEl, forceScroll) {
      const nearBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 60;
      return !!forceScroll || this.state.current.scrollChatToLatestOnNextRender || nearBottom;
    }
  };

  // modules/ui/social-polling.mjs
  var SocialPolling = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["forgetSocialChatMessages", "applySocialChatPoll", "refreshChatPanel", "startChatPolling"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    forgetSocialChatMessages(ids) {
      let before = this.state.current.chatMessages || [], gone = new Set((ids || []).map(String)), now = Date.now();
      let forgotten = this.state.current.chatForgotten || (this.state.current.chatForgotten = { ids: /* @__PURE__ */ new Map(), through: 0, until: 0 });
      forgotten.ids.forEach((until, id) => {
        if (until <= now) forgotten.ids.delete(id);
      });
      if (ids) gone.forEach((id) => forgotten.ids.set(id, now + this.data.SOCIAL_CHAT_FORGET_MS));
      else Object.assign(forgotten, { through: this.data.socialChatMaxId(before), until: now + this.data.SOCIAL_CHAT_FORGET_MS });
      this.state.current.chatMessages = ids ? before.filter((row) => !gone.has(String(row.id))) : [];
      if (this.state.current.chatMessages.length === before.length || this.state.current.chatForgetQueued) return;
      this.state.current.chatForgetQueued = true;
      this.deps.setTimeout(() => {
        this.state.current.chatForgetQueued = false;
        if (this.state.current.chatInitialized && this.services.chatStatus.isSocialTabActive()) this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, false);
      }, 0);
    }
    applySocialChatPoll(incoming, knownRows, fullSync, now) {
      let retained = fullSync ? this.state.current.chatMessages.filter((row) => !knownRows.has(String(row.id))) : this.state.current.chatMessages;
      this.state.current.chatMessages = this.services.chatData.mergeSocialChatMessages(retained, incoming, now);
      this.state.current.chatInitialized = true;
      if (fullSync) this.state.current.lastChatFullSyncAt = now;
    }
    async refreshChatPanel(forceScroll) {
      if (!this.services.session.socialCloudReady() || this.state.current.chatLoading) return;
      let context = this.services.session.socialSessionContext();
      this.state.current.chatLoading = context;
      try {
        let now = Date.now();
        let fullSync = !this.state.current.chatInitialized || now - this.state.current.lastChatFullSyncAt >= this.data.SOCIAL_CHAT_FULL_SYNC_MS;
        let knownId = this.data.socialChatMaxId(this.state.current.chatMessages), wasReady = this.state.current.chatInitialized;
        let knownRows = new Set(this.state.current.chatMessages.map((row) => String(row.id)));
        this.state.current.lastChatPollAt = now;
        let incoming = (await this.services.chatData.loadChatMessages(fullSync ? null : knownId, now)).filter((row) => !this.services.chatData.isForgottenSocialChat(row, now));
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.services.chatData.noteLiveChatGap(incoming, fullSync, wasReady);
        this.applySocialChatPoll(incoming, knownRows, fullSync, now);
        this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, forceScroll);
        if (wasReady && this.data.socialChatMaxId(incoming) > knownId) this.services.presence.onlineChat.refresh(false);
      } catch (e) {
        this.deps.console.warn("채팅 로드 실패:", e);
      } finally {
        this.services.session.releaseSocialRequest("chatLoading", context);
      }
    }
    startChatPolling() {
      this.services.reset.stopChatPolling();
      if (!this.services.session.socialCloudReady()) return;
      this.refreshChatPanel(true);
      this.services.presence.refreshOnlineUsers(true);
      this.state.current.chatPollTimer = this.deps.setInterval(() => {
        if (!this.services.chatStatus.isSocialTabActive()) {
          this.services.reset.stopChatPolling();
          return;
        }
        if (!this.services.chatStatus.isSocialPageHidden() && this.services.chatStatus.socialChatPollDue(this.state.current.lastChatPollAt)) this.refreshChatPanel(false);
      }, this.data.SOCIAL_CHAT_POLL_MS);
      this.state.current.onlinePollTimer = this.deps.setInterval(() => {
        if (!this.services.chatStatus.isSocialTabActive()) {
          this.services.reset.stopChatPolling();
          return;
        }
        if (!this.services.chatStatus.isSocialPageHidden()) this.services.presence.refreshOnlineUsers();
      }, this.data.SOCIAL_ONLINE_POLL_MS);
    }
  };

  // modules/ui/social-realtime.mjs
  var SocialRealtime = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["socialAccessToken", "socialChatRealtime", "receiveLiveChat", "showLiveChat", "onLiveChatStatus", "openLiveChat", "syncLiveChat", "wantsLiveChat", "releaseIdleLiveChat"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    socialAccessToken() {
      return typeof this.deps.cloudState !== "undefined" && this.deps.cloudState && this.deps.cloudState.session && this.deps.cloudState.session.access_token || "";
    }
    socialChatRealtime() {
      if (this.state.current.chatRealtime) return this.state.current.chatRealtime;
      let base = typeof this.deps.window !== "undefined" ? this.deps.window.supabaseClient : null;
      if (!base || !base.supabaseUrl || !base.supabaseKey || !this.deps.window.supabase || typeof this.deps.window.supabase.createClient !== "function") return null;
      this.state.current.chatRealtime = this.deps.window.supabase.createClient(base.supabaseUrl, base.supabaseKey, {
        accessToken: async () => this.socialAccessToken() || null,
        realtime: { disconnectOnEmptyChannelsAfterMs: 0 }
        // 채널을 놓으면 소켓도 바로 닫는다(동시 연결 수)
      });
      return this.state.current.chatRealtime;
    }
    receiveLiveChat(row) {
      if (!row || !Number.isFinite(Number(row.id)) || !this.services.chatData.isSocialChatMessageCurrent(row)) return;
      this.state.current.chatLiveMisses = 0;
      this.state.current.chatLive = true;
      if (!this.services.chatData.isForgottenSocialChat(row, Date.now())) this.state.current.chatMessages = this.services.chatData.mergeSocialChatMessages(this.state.current.chatMessages, [row]);
      this.showLiveChat(row);
    }
    showLiveChat(row) {
      if (!this.services.chatStatus.isSocialTabActive()) {
        if (typeof this.deps.game !== "undefined" && this.deps.game && this.deps.game.noti) this.services.noticeView.noteIncomingChats([row]);
        return;
      }
      if (this.state.current.chatInitialized) this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, false);
      if (row.user_id !== this.services.session.socialLoggedInUserId()) this.services.presence.onlineChat.refresh(false);
    }
    onLiveChatStatus(status) {
      if (status === "SUBSCRIBED") {
        this.state.current.chatLive = this.state.current.chatLiveMisses < this.data.SOCIAL_CHAT_LIVE_MISSES;
        this.state.current.chatLiveSince = Date.now();
        this.state.current.lastChatPollAt = 0;
        this.state.current.lastChatNoticeAt = 0;
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") this.state.current.chatLive = false;
    }
    openLiveChat() {
      if (this.state.current.chatChannel || !this.socialAccessToken()) return;
      let client = this.socialChatRealtime();
      if (!client) return;
      this.state.current.chatChannelUserId = this.services.session.socialLoggedInUserId();
      let context = this.services.session.socialSessionContext();
      this.state.current.chatChannelSession = context;
      let channel = client.channel("social-chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (change) => {
        if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
        try {
          this.receiveLiveChat(change && change.new);
        } catch (error) {
          this.deps.console.warn("실시간 채팅 한 줄을 처리하지 못했습니다:", error);
        }
      }).on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (change) => {
        if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
        let id = change && change.old && change.old.id;
        if (id != null) this.services.polling.forgetSocialChatMessages([id]);
      });
      this.state.current.chatChannel = channel;
      Promise.resolve(client.realtime.setAuth(this.socialAccessToken())).then(() => {
        if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
        channel.subscribe((status) => {
          if (this.state.current.chatChannel === channel && this.services.session.isSocialSessionCurrent(context)) this.onLiveChatStatus(status);
        });
      }).catch((error) => {
        if (this.state.current.chatChannel === channel) this.services.reset.closeLiveChat();
        this.deps.console.warn("채팅 실시간 연결 준비 실패:", error);
      });
    }
    syncLiveChat() {
      if (!this.services.session.socialCloudReady() || this.state.current.chatChannel && !this.services.session.isSocialSessionCurrent(this.state.current.chatChannelSession)) this.services.reset.closeLiveChat();
      if (!this.services.session.socialCloudReady()) return;
      if (this.services.chatStatus.isSocialPageHidden() || !this.wantsLiveChat()) {
        if (this.state.current.chatChannel && !this.state.current.chatLiveHiddenTimer) this.state.current.chatLiveHiddenTimer = this.deps.setTimeout(this.releaseIdleLiveChat, this.data.SOCIAL_CHAT_LIVE_HIDDEN_MS);
        return;
      }
      this.deps.clearTimeout(this.state.current.chatLiveHiddenTimer);
      this.state.current.chatLiveHiddenTimer = null;
      this.openLiveChat();
    }
    wantsLiveChat() {
      return this.services.chatStatus.isSocialTabActive() || this.services.chatStatus.isSocialChatNotificationEnabled();
    }
    releaseIdleLiveChat() {
      this.state.current.chatLiveHiddenTimer = null;
      if (this.services.chatStatus.isSocialPageHidden() || !this.wantsLiveChat()) this.services.reset.closeLiveChat();
    }
  };

  // modules/ui/social-background.mjs
  var SocialBackground = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["syncSocialChatNotificationSetting", "syncSocialBackgroundTasks", "syncSocialChatPolling"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    syncSocialChatNotificationSetting() {
      if (typeof this.deps.game !== "undefined" && this.deps.game && this.deps.game.noti && !this.services.chatStatus.isSocialChatNotificationEnabled()) {
        this.deps.game.noti.social = false;
        this.services.noticeView.refreshSocialNotificationDots();
      }
      this.services.realtime.syncLiveChat();
      Promise.resolve(this.services.notifications.checkSocialChatNotification()).catch((error) => this.deps.console.warn("social notification setting sync failed:", error));
    }
    syncSocialBackgroundTasks() {
      this.services.identity.syncSocialIdentityUser();
      this.services.realtime.syncLiveChat();
      if (!this.services.session.socialCloudReady()) {
        this.services.reset.stopHeartbeat();
        this.services.reset.stopSocialNotificationPolling();
        this.services.reset.stopChatPolling();
        return;
      }
      this.services.notifications.ensureSocialNotificationPolling();
      if (this.services.identity.getMyNickname()) {
        this.services.presence.ensureHeartbeat();
        this.services.upload.syncInitialPlayerProfile();
      } else this.services.reset.stopHeartbeat();
      if (this.state.current.identityCheckedUserId !== this.services.session.socialLoggedInUserId()) {
        Promise.resolve(this.services.nickname.restoreNicknameFromServer()).then((nickname2) => {
          if (nickname2 && this.services.session.socialCloudReady()) {
            this.services.presence.ensureHeartbeat();
            this.services.upload.syncInitialPlayerProfile();
          }
        }).catch((error) => this.deps.console.warn("소셜 계정 정보 동기화 실패:", error));
      }
    }
    syncSocialChatPolling() {
      this.services.realtime.syncLiveChat();
      if (!this.services.session.socialCloudReady() || !this.services.chatStatus.isSocialTabActive()) {
        this.services.reset.stopChatPolling();
        return;
      }
      if (!this.state.current.chatPollTimer) this.services.polling.startChatPolling();
    }
  };

  // modules/ui/social-composer-controls.mjs
  var SocialComposerControls = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["updateChatSendButton"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    updateChatSendButton() {
      const button = this.deps.document.getElementById("social-chat-send");
      if (!button) return;
      button.disabled = this.state.current.chatSending || !this.services.session.socialCloudReady() || !this.services.identity.getMyNickname();
      button.textContent = this.state.current.chatSending ? this.deps._t("전송 중") : this.deps._t("전송");
      button.setAttribute("aria-busy", String(this.state.current.chatSending));
    }
  };

  // modules/ui/social-attachments.mjs
  var SocialAttachments = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["getChatAttachSnapshot", "buildChatItemSnapshot", "chatItemLabel", "toChatBody", "insertChatItemLabel", "attachChatSnapshot", "attachChatItem", "attachChatItemOf", "removePendingChatItem", "renderPendingChatItems", "updateChatCounter"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getChatAttachSnapshot(source, key) {
      let state2 = typeof this.deps.game !== "undefined" && this.deps.game ? this.deps.game : {};
      if (source === "equip") return this.buildChatItemSnapshot((state2.equipment || {})[key], key);
      if (source === "inv") return this.buildChatItemSnapshot((state2.inventory || [])[Number(key)]);
      if (source === "stump" && state2.stumpBox) return this.services.snapshot.buildStumpItemCard(this.deps.stumpBox.itemById(state2, Number(key)), this.deps.stumpBox.evaluate(state2));
      return null;
    }
    buildChatItemSnapshot(item, slot) {
      if (!item) return null;
      if (this.deps.bagItems.isJewel(item)) return this.services.snapshot.buildJewelSnapshot(item);
      if (this.deps.bagItems.isCore(item)) return this.services.snapshot.buildCoreCard(item);
      return this.services.snapshot.buildItemSnapshot(item, this.deps.colonyWards.isWard(item) ? void 0 : slot);
    }
    chatItemLabel(snap) {
      return `[${String(snap && snap.name || "아이템")}]`;
    }
    toChatBody(text, pending) {
      let body = String(text || ""), items = [];
      pending.forEach((snap) => {
        let label = this.chatItemLabel(snap), at = body.indexOf(label);
        if (at < 0) return;
        body = body.slice(0, at) + `⟦${items.length}⟧` + body.slice(at + label.length);
        items.push(snap);
      });
      return { body, items };
    }
    insertChatItemLabel(inputEl, label) {
      let value = String(inputEl.value || ""), start = inputEl.selectionStart ?? value.length, end = inputEl.selectionEnd ?? start;
      let before = value.slice(0, start), gap = before && !/\s$/.test(before) ? " " : "";
      inputEl.value = `${before}${gap}${label} ${value.slice(end)}`;
      let caret = before.length + gap.length + label.length + 1;
      inputEl.focus();
      inputEl.setSelectionRange(caret, caret);
    }
    attachChatSnapshot(snap) {
      if (this.state.current.pendingChatItems.length >= this.data.SOCIAL_MAX_ITEMS_PER_MSG) {
        this.deps.showGameToast(this.deps._t("메시지당 최대 {SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.", { SOCIAL_MAX_ITEMS_PER_MSG: this.data.SOCIAL_MAX_ITEMS_PER_MSG }), "warning");
        return false;
      }
      this.state.current.pendingChatItems.push(snap);
      let inputEl = this.deps.document.getElementById("social-chat-input");
      if (inputEl) this.insertChatItemLabel(inputEl, this.chatItemLabel(snap));
      this.renderPendingChatItems();
      this.updateChatCounter();
      return true;
    }
    attachChatItem(source, idx) {
      let snap = this.getChatAttachSnapshot(source, idx);
      if (snap) this.attachChatSnapshot(snap);
    }
    attachChatItemOf(item, slot) {
      if (!this.services.identity.getMyNickname()) return this.deps.showGameToast(this.deps._t("닉네임을 정하면 아이템을 채팅에 붙일 수 있습니다."), "warning");
      let snap = this.buildChatItemSnapshot(item, slot);
      if (!snap) return this.deps.showGameToast(this.deps._t("이 아이템은 채팅에 붙일 수 없습니다."), "warning");
      this.attachChatSnapshot(snap);
    }
    removePendingChatItem(idx) {
      let [snap] = this.state.current.pendingChatItems.splice(idx, 1);
      let inputEl = this.deps.document.getElementById("social-chat-input");
      if (inputEl && snap) inputEl.value = String(inputEl.value || "").replace(this.chatItemLabel(snap), "").replace(/ {2,}/g, " ").trim();
      this.renderPendingChatItems();
      this.updateChatCounter();
    }
    renderPendingChatItems() {
      let host = this.deps.document.getElementById("social-pending-items");
      if (!host) return;
      if (!this.state.current.pendingChatItems.length) {
        host.innerHTML = "";
        host.style.display = "none";
        return;
      }
      host.style.display = "flex";
      host.innerHTML = this.state.current.pendingChatItems.map((it, i) => {
        let color = this.services.format.socialRarityColor(it.rarity);
        return `<span class="social-pending-chip" style="border-color:${color};color:${color};">${this.services.format.socialEscape(this.chatItemLabel(it))}<button onclick="removePendingChatItem(${i})" aria-label="${this.deps._t("첨부 취소")}" data-tip="${this.deps._t("첨부 취소")}">✕</button></span>`;
      }).join("");
    }
    updateChatCounter() {
      let inputEl = this.deps.document.getElementById("social-chat-input");
      let counterEl = this.deps.document.getElementById("social-chat-counter");
      if (!inputEl || !counterEl) return;
      let len = this.toChatBody(inputEl.value, this.state.current.pendingChatItems).body.length;
      counterEl.textContent = `${len}/${this.data.SOCIAL_MSG_MAX}`;
      counterEl.style.color = len > this.data.SOCIAL_MSG_MAX ? "#e88" : "var(--copy-muted)";
    }
  };

  // modules/ui/social-screen.mjs
  var SocialScreen = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["getSocialRenderRoot", "takeChatDraft", "restoreChatDraft", "renderSocialTab", "chatSettingsBody", "renderBlockedUsersRow", "openChatSettings", "refreshChatSettings"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    getSocialRenderRoot(host) {
      let root = host.querySelector(":scope > .social-root");
      if (!root) {
        root = this.deps.document.createElement("div");
        root.className = "social-root";
        host.appendChild(root);
      }
      return root;
    }
    takeChatDraft() {
      let input = this.deps.document.getElementById("social-chat-input");
      if (!input || !input.value || this.state.current.chatDraftUserId !== this.services.session.socialLoggedInUserId()) return null;
      return { text: String(input.value), start: input.selectionStart, end: input.selectionEnd, focused: this.deps.document.activeElement === input };
    }
    restoreChatDraft(draft) {
      this.state.current.chatDraftUserId = this.services.session.socialLoggedInUserId();
      let input = this.deps.document.getElementById("social-chat-input");
      if (!draft || !input) return;
      input.value = draft.text;
      if (!draft.focused || input.disabled) return;
      input.focus({ preventScroll: true });
      if (typeof input.setSelectionRange === "function" && Number.isFinite(draft.start)) input.setSelectionRange(draft.start, draft.end);
    }
    renderSocialTab() {
      let host = this.deps.document.getElementById("tab-social");
      if (!host) return;
      let root = this.getSocialRenderRoot(host);
      let loggedIn = this.services.session.socialCloudReady();
      let nickname2 = this.services.identity.getMyNickname();
      this.services.background.syncSocialBackgroundTasks();
      if (!loggedIn) {
        this.renderCloudNotice(root);
        this.services.reset.stopChatPolling();
        return;
      }
      let draft = this.takeChatDraft();
      root.innerHTML = `
            ${nickname2 ? "" : this.deps._t('<div class="social-notice social-nickname-notice">닉네임을 정하면 채팅할 수 있습니다. <button type="button" onclick="promptAndSetNickname()">닉네임 정하기</button></div>')}
            <div class="social-chat-wrap">
                <span id="social-chat-online" class="social-chat-online" hidden></span>
                <div id="social-chat-list" class="social-chat-list"><div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>${this.deps._t("대화를 불러오는 중")}</strong></div></div>
                <div id="social-pending-items" class="social-pending-items" style="display:none;"></div>
                <div class="social-chat-inputbar">
                    <button class="social-attach-btn" onclick="openItemPicker()" data-tip="${this.deps._t("아이템 첨부")}" aria-label="${this.deps._t("아이템 첨부")}" ${nickname2 ? "" : "disabled"}><span aria-hidden="true">＋</span> ${this.deps._t("첨부")}</button>
                    <div class="social-chat-input-shell">
                        <input id="social-chat-input" name="social-chat-message" type="text" maxlength="${this.data.SOCIAL_MSG_MAX}" placeholder="${nickname2 ? this.deps._t("메시지를 입력하세요…") : this.deps._t("먼저 닉네임을 설정하세요")}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" onkeydown="onSocialChatKeydown(event)" oninput="updateChatCounter()" ${nickname2 ? "" : "disabled"}>
                        <span id="social-chat-counter" class="social-chat-counter">0/${this.data.SOCIAL_MSG_MAX}</span>
                    </div>
                    <button id="social-chat-send" class="social-send-btn" onclick="sendChatMessage()" ${nickname2 ? "" : "disabled"}>${this.deps._t("전송")}</button>
                </div>
            </div>`;
      this.restoreChatDraft(draft);
      this.state.current.lastChatRenderKey = "";
      this.state.current.lastOnlineRenderKey = "";
      this.state.current.scrollChatToLatestOnNextRender = true;
      this.services.attachments.renderPendingChatItems();
      this.services.attachments.updateChatCounter();
      this.services.composerControls.updateChatSendButton();
      this.services.presence.ensureHeartbeat();
      this.services.polling.startChatPolling();
      this.services.nickname.restoreNicknameFromServer().then((restored) => {
        if (!this.state.disposed && restored !== nickname2) this.renderSocialTab();
      });
    }
    renderCloudNotice(root) {
      let checkingCloud = typeof this.deps.cloudState !== "undefined" && this.deps.cloudState && (this.deps.cloudState.busy || this.deps.cloudState.initialized === false);
      root.innerHTML = checkingCloud ? `<div class="social-notice social-notice-loading"><strong>${this.deps._t("클라우드 세션을 연결하는 중입니다.")}</strong><br>${this.deps._t("연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.")}</div>` : `<div class="social-notice social-empty-state"><span class="social-empty-sigil" aria-hidden="true">✦</span><strong>${this.deps._t("클라우드 커뮤니티")}</strong><p>${this.deps._t("로그인하면 채팅과 프로필을 바로 쓸 수 있습니다.")}</p><button type="button" onclick="closeCommunityDock(); openStartupGate({ accountOnly: true })">${this.deps._t("로그인 화면 열기")}</button></div>`;
    }
    chatSettingsBody() {
      if (!this.services.session.socialCloudReady()) {
        return `<div class="chat-settings"><p class="social-notice">로그인하면 닉네임, 공개 프로필, 접속자 목록을 쓸 수 있습니다.</p><button type="button" onclick="selectionDialog.close('${this.data.CHAT_SETTINGS_ID}'); closeCommunityDock(); openStartupGate({ accountOnly: true })">${this.deps._t("로그인 화면 열기")}</button></div>`;
      }
      let nickname2 = this.services.identity.getMyNickname();
      return `<div class="chat-settings">
            <div class="chat-settings-row"><span>${this.deps._t("닉네임")}</span><strong>${nickname2 ? this.services.format.socialEscape(nickname2) : this.deps._t("<em>미설정</em>")}</strong>
                <button type="button" onclick="promptAndSetNickname()">${nickname2 ? this.deps._t("바꾸기") : this.deps._t("정하기")}</button></div>
            <div class="chat-settings-row"><span>${this.deps._t("공개 프로필")}</span>
                <button type="button" onclick="openMyProfilePreview()">${this.deps._t("보기")}</button>
                <button type="button" onclick="syncPlayerProfile()" data-tip="${this.deps._t("지금 장비와 능력치를 공개 프로필에 올립니다")}">${this.deps._t("동기화")}</button></div>
            ${this.renderBlockedUsersRow()}
            <div id="social-online" class="social-online" style="display:none;"></div>
        </div>`;
    }
    renderBlockedUsersRow() {
      let blocked = this.services.blocking.getBlockedUsers();
      if (!blocked.length) return "";
      let chips = blocked.map((entry) => `<button type="button" data-user-id="${this.services.format.socialEscape(entry.id)}" onclick="unblockUser(this.dataset.userId)">${this.deps._t("{name} 풀기", { name: this.services.format.socialEscape(entry.name || entry.id.slice(0, 8)) })}</button>`).join("");
      return `<div class="chat-settings-row"><span>${this.deps._t("차단한 사람")}</span>${chips}</div>`;
    }
    openChatSettings() {
      this.deps.selectionDialog.show({ id: this.data.CHAT_SETTINGS_ID, title: this.deps._t("채팅 설정"), panelClass: "chat-settings-panel", body: this.chatSettingsBody() });
      if (!this.services.session.socialCloudReady()) return;
      this.state.current.lastOnlineRenderKey = "";
      this.services.presence.refreshOnlineUsers(true);
    }
    refreshChatSettings() {
      if (this.deps.selectionDialog.isOpen(this.data.CHAT_SETTINGS_ID)) this.openChatSettings();
    }
  };

  // modules/ui/social-screen-actions.mjs
  var SocialScreenActions = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["syncPlayerProfile", "promptAndSetNickname", "finishSocialNicknameChange", "unblockUser"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    async syncPlayerProfile() {
      let context = this.services.session.socialSessionContext();
      if (!this.services.session.socialCloudReady()) return this.deps.showGameToast(this.deps._t("먼저 클라우드 로그인이 필요합니다."), "warning");
      await this.services.nickname.restoreNicknameFromServer(true);
      if (!this.services.session.isSocialSessionCurrent(context)) return;
      if (!this.services.identity.getMyNickname()) await this.promptAndSetNickname();
      if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return;
      try {
        await this.services.upload.uploadPlayerProfile({ required: true });
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.deps.showGameToast(this.deps._t("공개 프로필을 최신 상태로 갱신했습니다."), "success");
      } catch (error) {
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.services.upload.reportProfileSyncFailure(error);
        this.services.screen.renderSocialTab();
      }
    }
    async promptAndSetNickname() {
      let context = this.services.session.socialSessionContext();
      if (!this.services.session.socialCloudReady()) {
        this.deps.showGameToast(this.deps._t("채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)"), "warning");
        return;
      }
      let current = this.services.identity.getMyNickname();
      let input = await this.deps.requestGameText({
        title: this.deps._t("닉네임 설정"),
        message: `사용할 닉네임을 입력하세요. (${this.data.SOCIAL_NICK_MIN}~${this.data.SOCIAL_NICK_MAX}자, 한글/영문/숫자/-/_)
닉네임은 하루에 한 번만 변경할 수 있습니다.`,
        value: current || "",
        maxLength: this.data.SOCIAL_NICK_MAX,
        placeholder: this.deps._t("닉네임"),
        confirmLabel: this.deps._t("닉네임 적용")
      });
      if (!this.services.session.isSocialSessionCurrent(context)) return;
      let name = this.services.nickname.socialNicknameInput(input, current);
      if (!name) return;
      let prev = this.services.identity.getMyNickname();
      this.services.identity.setMyNicknameLocal(name);
      try {
        await this.services.upload.uploadPlayerProfile({ fromNicknameChange: true });
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        await this.services.upload.updatePastChatNicknames(name);
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        if (typeof this.deps.addLog === "function") this.deps.addLog(this.deps._t("🪪 닉네임이 {name} 설정되었습니다.", { name: this.deps.withDirectionParticle(`"${name}"`) }), "season-up");
        this.finishSocialNicknameChange();
      } catch (e) {
        this.restoreNicknameAfterFailure(context, prev, e);
      }
    }
    restoreNicknameAfterFailure(context, previous, error) {
      if (!this.services.session.isSocialSessionCurrent(context)) return;
      this.services.identity.setMyNicknameLocal(previous);
      this.deps.showGameToast(String(error && error.message || error), "danger");
      this.services.screen.renderSocialTab();
    }
    finishSocialNicknameChange() {
      this.state.current.chatInitialized = false;
      this.state.current.chatMessages = [];
      this.state.current.lastChatRenderKey = "";
      this.services.screen.renderSocialTab();
      this.services.screen.refreshChatSettings();
      this.services.polling.refreshChatPanel(false);
    }
    unblockUser(userId) {
      this.services.blocking.setUserBlocked(userId, false);
      this.state.current.lastChatRenderKey = "";
      this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages || [], false);
      this.services.screen.refreshChatSettings();
      this.deps.showGameToast(this.deps._t("차단을 풀었습니다."), "info");
    }
  };

  // modules/ui/social-chat-send.mjs
  var SocialChatSend = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["translateSpamError", "prepareChatSender", "chatRowReady", "isStaleNicknameError", "adoptServerNickname", "withStaleNicknameRetry", "clearSubmittedChatDraft", "reportChatSendFailure", "finishSocialChatSend", "sendChatMessage", "onSocialChatKeydown"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    translateSpamError(msg) {
      let hit = this.data.SOCIAL_CHAT_ERROR_TEXTS.find(([pattern]) => pattern.test(msg));
      if (!hit) return msg;
      return typeof hit[1] === "function" ? hit[1](msg) : hit[1];
    }
    async prepareChatSender(senderId) {
      let context = this.services.session.socialSessionContext();
      await this.services.nickname.restoreNicknameFromServer();
      if (!this.services.session.isSocialSessionCurrent(context)) throw new Error("전송 중 계정이 변경되었습니다.");
      if (!this.services.identity.getMyNickname()) await this.services.screenActions.promptAndSetNickname();
      if (!this.services.session.isSocialSessionCurrent(context)) throw new Error("전송 중 계정이 변경되었습니다.");
      if (!this.services.identity.getMyNickname()) return false;
      if (!this.chatRowReady(senderId)) await this.services.nickname.restoreNicknameFromServer(true);
      if (!this.chatRowReady(senderId)) await this.services.upload.uploadPlayerProfile({ required: true });
      if (!this.services.session.isSocialSessionCurrent(context)) throw new Error("전송 중 계정이 변경되었습니다.");
      return true;
    }
    chatRowReady(userId) {
      return this.state.current.profileRowFor === `${userId}
${this.services.identity.getMyNickname()}`;
    }
    isStaleNicknameError(error) {
      let code = error && error.socialCode;
      return code === "nickname_cooldown" || code === "nickname_conflict" || /row-level security/i.test(String(error && error.message || error));
    }
    async adoptServerNickname(userId) {
      let before = this.services.identity.getMyNickname();
      let after = await this.services.nickname.restoreNicknameFromServer(true);
      if (this.services.session.socialLoggedInUserId() !== userId || !after || after === before) return false;
      this.services.screen.refreshChatSettings();
      return true;
    }
    async withStaleNicknameRetry(userId, sendOnce) {
      let context = this.services.session.socialSessionContext();
      try {
        return await sendOnce();
      } catch (error) {
        if (!this.services.session.isSocialSessionCurrent(context)) throw error;
        if (!this.isStaleNicknameError(error) || !await this.adoptServerNickname(userId)) throw error;
        return sendOnce();
      }
    }
    clearSubmittedChatDraft(inputEl, draft, items) {
      let input = this.deps.document.getElementById("social-chat-input") || inputEl;
      if (input.value !== draft || this.state.current.pendingChatItems.length !== items.length) return;
      if (!items.every((item, index) => this.state.current.pendingChatItems[index] === item)) return;
      input.value = "";
      this.state.current.pendingChatItems = [];
      this.services.attachments.renderPendingChatItems();
      this.services.attachments.updateChatCounter();
    }
    reportChatSendFailure(error, context) {
      if (!this.services.session.isSocialSessionCurrent(context)) return;
      if (error?.socialCode === "nickname_conflict") this.services.identity.setMyNicknameLocal("");
      this.deps.showGameToast("메시지 전송 실패: " + this.translateSpamError(String(error && error.message || error)), "danger");
    }
    finishSocialChatSend(context) {
      if (this.state.current.chatSendRequest !== context) return;
      this.state.current.chatSendRequest = null;
      this.state.current.chatSending = false;
      this.services.composerControls.updateChatSendButton();
    }
    canSubmitChat(body, items) {
      if (!body && !items.length) return;
      if (body.length > this.data.SOCIAL_MSG_MAX) {
        this.deps.showGameToast(this.deps._t("메시지는 최대 {SOCIAL_MSG_MAX}자까지 입력할 수 있습니다.", { SOCIAL_MSG_MAX: this.data.SOCIAL_MSG_MAX }), "warning");
        return;
      }
      if (body && body === this.state.current.lastSentBody && !items.length) {
        this.deps.showGameToast(this.deps._t("같은 메시지를 연속으로 보낼 수 없습니다."), "warning");
        return;
      }
      let rate = this.services.chatData.checkSendRateLimit();
      if (rate !== true) {
        this.deps.showGameToast(rate, "warning");
        return false;
      }
      return true;
    }
    async sendChatMessage() {
      if (!this.services.session.socialCloudReady()) {
        this.deps.showGameToast(this.deps._t("먼저 클라우드 로그인이 필요합니다."), "warning");
        return;
      }
      if (this.state.current.chatSending) return;
      let inputEl = this.deps.document.getElementById("social-chat-input");
      if (!inputEl) return;
      let draft = inputEl.value;
      let pending = this.state.current.pendingChatItems.slice(0, this.data.SOCIAL_MAX_ITEMS_PER_MSG);
      let { body, items } = this.services.attachments.toChatBody(draft.trim(), pending);
      if (!this.canSubmitChat(body, items)) return;
      let payload = items.length ? { items } : null;
      let senderId = this.services.session.socialLoggedInUserId();
      let context = this.services.session.socialSessionContext();
      this.state.current.chatSendRequest = context;
      this.state.current.chatSending = true;
      try {
        this.services.composerControls.updateChatSendButton();
        let sent = await this.withStaleNicknameRetry(senderId, async () => {
          if (!await this.prepareChatSender(senderId) || !this.services.session.isSocialSessionCurrent(context)) return false;
          await Promise.all([this.deps.cloudJsonRequest("/rest/v1/chat_messages", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: { user_id: senderId, nickname: this.services.identity.getMyNickname(), body: body || "🔗", payload }
          }), this.services.presence.sendPresenceHeartbeat()]);
          return true;
        });
        if (!sent || !this.services.session.isSocialSessionCurrent(context)) return;
        this.clearSubmittedChatDraft(inputEl, draft, pending);
        this.state.current.sendTimestamps.push(Date.now());
        this.state.current.lastSentBody = body;
        await this.services.polling.refreshChatPanel(true);
        this.services.presence.onlineChat.refresh(true);
      } catch (e) {
        this.reportChatSendFailure(e, context);
      } finally {
        this.finishSocialChatSend(context);
      }
    }
    onSocialChatKeydown(event) {
      if (!event || event.isComposing || event.keyCode === 229 || event.repeat) return;
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      this.sendChatMessage();
    }
  };

  // modules/ui/social-profile-view.mjs
  var SocialProfileView = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["ensureProfileModal", "openMyProfilePreview", "renderProfileIdentityChips", "renderProfileGemRow", "renderProfileSkills", "showProfileItemDetail", "renderProfileEquipPaperdoll", "profileEmptySlotHtml", "profileCoreArt", "profileItemArt", "profileSlotHtml", "profileJewelRows", "renderProfileJewels", "renderProfileTalismans", "profileStumpFilled", "renderProfileStump", "profileStumpCellHtml", "profileStumpIconSuffix", "profileStumpIconHtml", "profileStumpBarHtml", "profileMiniCardHtml", "profileTabList", "profileTabsHtml", "renderProfileItemsArea", "switchProfileTab", "renderProfileData", "canDuelFromProfile", "renderProfileActionsRow", "toggleProfileBlock", "showFetchedProfile", "openPlayerProfile"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    ensureProfileModal() {
      let modal = this.deps.document.getElementById("social-profile-modal");
      if (modal) return modal;
      modal = this.deps.document.createElement("div");
      modal.id = "social-profile-modal";
      modal.className = "social-modal-overlay";
      modal.style.display = "none";
      modal.onclick = (e) => {
        if (e.target === modal) this.services.reset.closePlayerProfile();
      };
      modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closePlayerProfile()" aria-label="${this.deps._t("닫기")}">✕</button><div class="social-modal-content"><div id="social-profile-body"></div></div></div>`;
      this.deps.document.body.appendChild(modal);
      return modal;
    }
    async openMyProfilePreview() {
      this.deps.selectionDialog.close(this.data.CHAT_SETTINGS_ID);
      if (!this.services.session.socialCloudReady()) {
        this.deps.showGameToast(this.deps._t("프로필을 보려면 먼저 클라우드 로그인이 필요합니다."), "warning");
        return;
      }
      let context = this.services.session.socialSessionContext();
      await this.services.nickname.restoreNicknameFromServer(true);
      if (!this.services.session.isSocialSessionCurrent(context)) return;
      if (!this.services.identity.getMyNickname()) await this.services.screenActions.promptAndSetNickname();
      if (!this.services.session.isSocialSessionCurrent(context) || !this.services.identity.getMyNickname()) return;
      try {
        await this.services.upload.uploadPlayerProfile({ required: true });
      } catch (error) {
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        this.services.upload.reportProfileSyncFailure(error);
        return;
      }
      if (this.services.session.isSocialSessionCurrent(context)) this.openPlayerProfile(context.userId);
    }
    renderProfileIdentityChips(p) {
      let chips = [`Lv.${p.level || 1}`, p.heroClassName, p.className || "미전직", this.deps._t("루프 {loop}", { loop: this.services.format.socialComma(p.loop || 0) })];
      return chips.filter(Boolean).map((chip) => `<span class="social-profile-chip">${this.services.format.socialEscape(chip)}</span>`).join("");
    }
    renderProfileGemRow(label, gem, extra) {
      if (!gem || !gem.name) return "";
      let quality = gem.quality ? this.deps._t(" 품질 {quality}", { quality: this.services.format.socialEscape(gem.quality) }) : "";
      return `<div class="social-skill-row"><span class="social-skill-label">${this.services.format.socialEscape(label)}</span><strong>${this.services.format.socialEscape(gem.name)}</strong><span class="social-skill-level">Lv.${this.services.format.socialEscape(gem.level || 1)}${quality}${extra || ""}</span></div>`;
    }
    renderProfileSkills(skills) {
      if (!skills || !skills.active) return "";
      let rows = [this.renderProfileGemRow("주 스킬", skills.active)].concat((skills.supports || []).map((gem) => this.renderProfileGemRow("보조", gem))).concat([this.renderProfileGemRow("이동", skills.mobility)]).concat((skills.summons || []).map((gem) => this.renderProfileGemRow("소환", gem, Math.floor(Number(gem.count)) > 1 ? this.deps._t(" {floor}마리", { floor: Math.floor(Number(gem.count)) }) : "")));
      return `<div class="social-skill-list">${rows.join("")}</div>`;
    }
    showProfileItemDetail(html) {
      let box = this.deps.document.querySelector("#social-profile-modal .social-modal-box");
      if (!box) return false;
      let layer = box.querySelector(":scope > .social-item-detail");
      if (!layer) {
        layer = this.deps.document.createElement("div");
        layer.className = "social-item-detail";
        layer.onclick = (event) => {
          if (event.target === layer || event.target.closest("[data-item-detail-close]")) layer.hidden = true;
        };
        box.appendChild(layer);
      }
      layer.innerHTML = `<div class="social-item-detail-card">${html}<button type="button" data-item-detail-close>${this.deps._t("닫기")}</button></div>`;
      layer.hidden = false;
      return true;
    }
    renderProfileEquipPaperdoll(p) {
      let bySlot = new Map((p.equipment || []).filter((it) => it && it.slot).map((it) => [it.slot, it]));
      let core = p.core && typeof p.core === "object" && p.core.name ? { ...p.core, kind: "core" } : null;
      if (!bySlot.size && !core) return '<div class="social-profile-empty">장착한 장비 없음</div>';
      let filled = (slot) => this.profileSlotHtml(slot, bySlot.get(slot), this.services.profileValues.profileItemTag(bySlot.get(slot)));
      let cards = this.data.SOCIAL_EQUIP_SLOTS.map((slot) => bySlot.has(slot) ? filled(slot) : this.profileEmptySlotHtml(slot));
      if (bySlot.has("반지3")) cards.push(filled("반지3"));
      if (core) cards.push(this.profileSlotHtml("코어", core, "코어"));
      return `<div class="social-doll">${cards.join("")}</div>`;
    }
    profileEmptySlotHtml(slot) {
      return `<div class="social-slot is-empty slot-${slot}"><span class="social-slot-tag">${this.services.format.socialEscape(this.deps.weaponCategorySlotLabel(null, slot.replace(/[123]$/, "")))}</span></div>`;
    }
    profileCoreArt(core) {
      const names = this.deps.CORE_ITEM_RULES.groupNames;
      const prefix = `${this.deps.CORE_ITEM_RULES.perfect.prefix} `;
      const name = String(core && core.name || "");
      const plainName = name.startsWith(prefix) ? name.slice(prefix.length) : name;
      const group = Object.keys(names).find((key) => plainName.startsWith(names[key]));
      return this.deps.ITEM_VISUAL_ASSET_DB.coreAssets[group || "empty"];
    }
    profileItemArt(it) {
      if (it.kind === "core") return this.profileCoreArt(it);
      if (typeof this.deps.getEquipmentGridVisualAsset !== "function") return "";
      let base = !it.baseId && typeof this.deps.BASE_ITEM_DB !== "undefined" ? this.deps.BASE_ITEM_DB.find((row) => row.name === it.baseName) : null;
      return this.deps.getEquipmentGridVisualAsset({ slot: it.slot, rarity: it.rarity, name: it.name, baseName: it.baseName, baseId: it.baseId || base && base.id });
    }
    profileSlotHtml(slot, it, tag) {
      let key = `eq:${slot}`;
      this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard(it);
      let color = it.kind === "core" ? this.data.PROFILE_CORE_TONE : this.services.format.socialRarityColor(it.rarity);
      let art = this.profileItemArt(it);
      return `<div class="social-slot slot-${slot}" style="--r:${color};" role="button" tabindex="0" aria-label="${this.services.format.socialEscape(`[${tag}] ${it.name}`)}" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">${art ? `<img src="${this.services.format.socialEscape(art)}" alt="" draggable="false">` : ""}<span class="social-slot-tag">${this.services.format.socialEscape(tag)}</span></div>`;
    }
    profileJewelRows(p) {
      let rows = [];
      (p.equipment || []).forEach((item) => (item && Array.isArray(item.sockets) ? item.sockets : []).forEach((row) => {
        if (row && row.jewel) rows.push({ jewel: row.jewel, where: `[${this.services.profileValues.profileItemTag(item)}] ${row.label}` });
      }));
      return rows.length ? rows : (p.jewels || []).filter(Boolean).map((jewel) => ({ jewel, where: "" }));
    }
    renderProfileJewels(p) {
      return `<div class="social-mini-grid">${this.profileJewelRows(p).map((row, i) => this.profileMiniCardHtml(`jw:${i}`, row.jewel, row.jewel.name || "주얼", row.where)).join("")}</div>`;
    }
    renderProfileTalismans(p) {
      return `<div class="social-mini-grid">${(p.talismans || []).filter(Boolean).map((t, i) => this.profileMiniCardHtml(`tl:${i}`, t, t.name || "부적", "")).join("")}</div>`;
    }
    profileStumpFilled(stump) {
      return !!stump && Array.isArray(stump.cells) && stump.cells.some((row) => row && row.item);
    }
    renderProfileStump(stump) {
      return `<div class="social-stump-board">${stump.cells.slice(0, this.data.PROFILE_STUMP_CELLS).map(this.profileStumpCellHtml).join("")}</div>`;
    }
    profileStumpCellHtml(row, cell) {
      if (!row || typeof row !== "object") return '<span class="social-stump-cell is-locked"></span>';
      let rank = Math.floor(Number(row.graft) || 0);
      let mark = rank > 0 ? `<span class="social-stump-graft">${rank}</span>` : "";
      let item = row.item;
      if (!item || typeof item !== "object") return `<span class="social-stump-cell">${mark}</span>`;
      let key = `st:${cell}`;
      this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard({ ...item, graft: row.graft, graftPct: row.graftPct });
      let state2 = (item.suppressed || item.state === "suppressed" ? " is-suppressed" : "") + (item.resonant ? " is-resonant" : "");
      return `<span class="social-stump-cell is-filled${state2}" style="--stump-tone:${this.services.specialCards.profileStumpTone(item)};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">${this.profileStumpIconHtml(item)}${this.profileStumpBarHtml(item)}${mark}</span>`;
    }
    profileStumpIconSuffix(item) {
      if (item.stage === "scar" || item.stage === "scarAsleep") return "";
      let tint = item.kind === "talisman" ? this.data.profileOwn(this.data.PROFILE_TALISMAN_RARITY, item.rarity) && item.rarity : typeof this.deps.STUMP_BOX_COLORS === "object" && this.data.profileOwn(this.deps.STUMP_BOX_COLORS, item.color) && item.color;
      return tint ? `-${tint}` : null;
    }
    profileStumpIconHtml(item) {
      let stage = typeof this.deps.STUMP_BOX_STAGES === "object" ? this.data.profileOwn(this.deps.STUMP_BOX_STAGES, item.stage) : "", suffix = this.profileStumpIconSuffix(item);
      return stage && suffix !== null ? `<img src="assets/items/stump-pixel-v1/${stage.icon}${suffix}.png" alt="" draggable="false">` : "";
    }
    profileStumpBarHtml(item) {
      let need = Number(item.need) || 0;
      if (item.ripe || need <= 0) return "";
      return `<span class="social-stump-bar"><i style="width:${Math.max(0, Math.min(100, Math.round((Number(item.xp) || 0) / need * 100)))}%"></i></span>`;
    }
    profileMiniCardHtml(key, snap, name, sub) {
      this.state.current.profileTips[key] = this.services.itemCards.renderProfileItemCard(snap);
      let color = this.services.format.socialRarityColor(snap && snap.rarity);
      return `<div class="social-mini-card" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">${this.services.format.socialEscape(name)}${sub ? `<small>${this.services.format.socialEscape(sub)}</small>` : ""}</div>`;
    }
    profileTabList(p) {
      let tabs = [["equipment", "장비"]];
      if (p.skills && p.skills.active) tabs.push(["skills", "스킬"]);
      if (this.profileJewelRows(p).length) tabs.push(["jewels", "주얼"]);
      if (this.profileStumpFilled(p.stump)) tabs.push(["stump", "그루터기 함"]);
      else if ((p.talismans || []).length) tabs.push(["stump", "부적"]);
      return tabs;
    }
    profileTabsHtml(p) {
      return this.profileTabList(p).map(([cat, label], i) => `<button data-cat="${cat}"${i ? "" : ' class="active"'} onclick="switchProfileTab('${cat}')">${label}</button>`).join("");
    }
    renderProfileItemsArea() {
      let p = this.state.current.currentProfile;
      if (!p) return "";
      this.state.current.profileTips = {};
      let cat = this.state.current.profileTab;
      if (cat === "skills") return this.renderProfileSkills(p.skills);
      if (cat === "jewels") return this.renderProfileJewels(p);
      if (cat === "stump") return this.profileStumpFilled(p.stump) ? this.renderProfileStump(p.stump) : this.renderProfileTalismans(p);
      return this.renderProfileEquipPaperdoll(p);
    }
    switchProfileTab(cat) {
      this.state.current.profileTab = cat;
      this.services.reset.hideSocialTip();
      let tabsEl = this.deps.document.getElementById("social-profile-tabs");
      if (tabsEl) Array.from(tabsEl.children).forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-cat") === cat));
      let areaEl = this.deps.document.getElementById("social-profile-items");
      if (areaEl) areaEl.innerHTML = this.renderProfileItemsArea();
    }
    renderProfileData(profile) {
      let body = this.deps.document.getElementById("social-profile-body");
      if (!body) return;
      if (!profile) {
        body.innerHTML = `<div class="social-profile-empty">${this.deps._t("공개 프로필을 찾을 수 없습니다.")}<br>${this.deps._t("프로필 생성 또는 동기화가 완료되지 않았을 수 있어요.")}</div>`;
        return;
      }
      this.state.current.currentProfile = profile;
      this.state.current.profileTab = "equipment";
      let p = profile;
      let stats = Array.isArray(p.stats) ? p.stats : [];
      let updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
      let updated = updatedAt && Number.isFinite(updatedAt.getTime()) ? updatedAt.toLocaleString(this.deps.i18n.locale) : "";
      let actions = this.renderProfileActionsRow();
      body.innerHTML = `
            <div class="social-profile-header">
                <div class="social-profile-id">
                    <div class="social-profile-name">${this.services.format.socialEscape(p.nickname || "익명")}</div>
                    <div class="social-profile-sub">${this.renderProfileIdentityChips(p)}</div>
                    ${updated ? `<div class="social-profile-updated">${this.deps._t("갱신: {updated}", { updated: this.services.format.socialEscape(updated) })}</div>` : ""}
                </div>
                ${this.services.statsMarkup.profilePowerHtml(p)}
            </div>
            ${actions}
            <div class="social-profile-cols">
                <section class="social-profile-col social-profile-card">
                    <h3>${this.deps._t("능력치")}</h3>
                    ${this.services.statsMarkup.profileStatsHtml(stats)}
                </section>
                <section class="social-profile-col social-profile-card">
                    <h3>${this.deps._t("장착 구성")}</h3>
                    <div id="social-profile-tabs" class="social-profile-tabs">${this.profileTabsHtml(p)}</div>
                    <div id="social-profile-items">${this.renderProfileItemsArea()}</div>
                </section>
            </div>`;
    }
    canDuelFromProfile() {
      let target = this.state.current.currentProfileUserId;
      if (!target || target === this.services.session.socialLoggedInUserId()) return false;
      return this.deps.contentProgression.canOpen("map-tab-pvp") && this.deps.isMapPrimaryContentUnlocked(this.deps.game, "map-tab-pvp");
    }
    renderProfileActionsRow() {
      let target = this.state.current.currentProfileUserId;
      if (!target || target === this.services.session.socialLoggedInUserId()) return "";
      let duel = this.canDuelFromProfile() ? '<button type="button" onclick="fightCurrentProfileGhost()">친선전</button>' : "";
      return `<div class="social-profile-actions">${duel}<button type="button" onclick="toggleProfileBlock()">${this.services.blocking.isUserBlocked(target) ? this.deps._t("차단 해제") : this.deps._t("차단")}</button><select id="social-report-reason" aria-label="${this.deps._t("신고 사유")}"><option value="욕설">${this.deps._t("욕설")}</option><option value="도배">${this.deps._t("도배")}</option><option value="사칭">${this.deps._t("사칭")}</option><option value="기타">${this.deps._t("기타")}</option></select><button type="button" onclick="reportCurrentProfile()">신고</button></div>`;
    }
    toggleProfileBlock() {
      let target = this.state.current.currentProfileUserId;
      if (!target || target === this.services.session.socialLoggedInUserId()) return;
      let blocked = !this.services.blocking.isUserBlocked(target);
      this.services.blocking.setUserBlocked(target, blocked, this.state.current.currentProfile && this.state.current.currentProfile.nickname);
      this.state.current.lastChatRenderKey = "";
      this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages || [], false);
      let tab = this.state.current.profileTab;
      if (this.state.current.currentProfile) {
        this.renderProfileData(this.state.current.currentProfile);
        if (tab) this.switchProfileTab(tab);
      }
      this.deps.showGameToast(blocked ? "이 사람의 채팅을 이 기기에서 숨깁니다." : "차단을 풀었습니다.", "info");
    }
    showFetchedProfile(rows) {
      let row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return this.renderProfileData(null);
      let profile = { ...row.profile_data || {}, nickname: row.nickname || "" };
      this.renderProfileData(profile);
    }
    async openPlayerProfile(userId) {
      if (!userId) return;
      this.deps.selectionDialog.close(this.data.CHAT_SETTINGS_ID);
      if (!this.services.session.socialCloudReady()) {
        this.deps.showGameToast(this.deps._t("프로필을 보려면 먼저 클라우드 로그인이 필요합니다."), "warning");
        return;
      }
      this.state.current.currentProfileUserId = String(userId);
      let context = this.services.session.socialSessionContext();
      this.state.current.profileRequest = context;
      let modal = this.ensureProfileModal();
      modal.style.display = "flex";
      let body = this.deps.document.getElementById("social-profile-body");
      if (body) body.innerHTML = `<div class="social-profile-empty">${this.deps._t("불러오는 중…")}</div>`;
      try {
        let rows = await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname,profile_data,updated_at`, {});
        if (this.isProfileRequestCurrent(context)) this.showFetchedProfile(rows);
      } catch (e) {
        if (body && this.isProfileRequestCurrent(context)) body.innerHTML = `<div class="social-profile-empty">${this.deps._t("불러오기 실패: {e}", { e: this.services.format.socialEscape(String(e && e.message || e)) })}</div>`;
      }
    }
    isProfileRequestCurrent(context) {
      return this.state.current.profileRequest === context && this.services.session.isSocialSessionCurrent(context);
    }
  };

  // modules/ui/social-tooltip.mjs
  var SocialTooltip = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["ensureSocialTooltip", "tipMapByScope", "showSocialTip", "moveSocialTip", "openTipModal"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    ensureSocialTooltip() {
      let tip = this.deps.document.getElementById("social-tooltip");
      if (tip) return tip;
      tip = this.deps.document.createElement("div");
      tip.id = "social-tooltip";
      tip.className = "social-tooltip";
      tip.style.display = "none";
      this.deps.document.body.appendChild(tip);
      return tip;
    }
    tipMapByScope(scope) {
      return scope === "chat" ? this.state.current.chatTips : scope === "pick" ? this.state.current.pickTips : this.state.current.profileTips;
    }
    showSocialTip(event, scope, key) {
      let html = this.tipMapByScope(scope)[key];
      if (!html) return;
      let tip = this.ensureSocialTooltip();
      tip.innerHTML = html;
      tip.style.display = "block";
      this.moveSocialTip(event);
    }
    moveSocialTip(event) {
      let tip = this.deps.document.getElementById("social-tooltip");
      if (!tip || tip.style.display === "none") return;
      let pad = 16, w = tip.offsetWidth * this.deps.uiDisplay.factor, h = tip.offsetHeight * this.deps.uiDisplay.factor;
      let x = event.clientX + pad, y = event.clientY + pad;
      if (x + w > this.deps.window.innerWidth - 8) x = event.clientX - w - pad;
      if (x < 8) x = 8;
      if (y + h > this.deps.window.innerHeight - 8) y = this.deps.window.innerHeight - h - 8;
      if (y < 8) y = 8;
      tip.style.left = x / this.deps.uiDisplay.factor + "px";
      tip.style.top = y / this.deps.uiDisplay.factor + "px";
    }
    openTipModal(scope, key) {
      let html = this.tipMapByScope(scope)[key];
      if (!html) return;
      this.services.reset.hideSocialTip();
      if (scope === "profile" && this.services.profileView.showProfileItemDetail(html)) return;
      let modal = this.services.profileView.ensureProfileModal();
      modal.style.display = "flex";
      let body = this.deps.document.getElementById("social-profile-body");
      if (body) body.innerHTML = `<div class="social-equip-grid">${html}</div>`;
    }
  };

  // modules/ui/social-styles.mjs
  var SOCIAL_STYLES = `@layer components {
        .social-notice{color:var(--copy-bright);font-size:12px;line-height:1.5;}
        .social-notice{background:rgba(20,34,56,0.6);border:1px solid #24344f;border-radius:8px;padding:12px;margin-top:8px;}
        .social-notice-loading{border-color:#386383;background:linear-gradient(110deg,rgba(20,46,67,.72),rgba(17,29,48,.72));box-shadow:inset 3px 0 #64b5e5;}
        .social-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:10px 0;}
        .social-profile-summary{display:grid;gap:1px;min-width:0;}.social-profile-summary>span{color:var(--copy-muted);font-size:12px;}.social-profile-summary>strong{overflow:hidden;color:#e8d7b6;text-overflow:ellipsis;white-space:nowrap;}.social-profile-summary em{color:#d58478;font-style:normal;}
        .social-toolbar-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;}
        .social-online{background:rgba(13,15,13,.72);border:1px solid #40392e;border-radius:5px;padding:8px 10px;margin-bottom:8px;}
        .social-online-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--copy-bright);font-size:12px;font-weight:700;margin-bottom:6px;}
        .social-presence-summary{display:flex;gap:8px;color:var(--copy-muted);font-weight:500;}.social-presence-summary>span{display:inline-flex;align-items:center;gap:4px;}
        .social-presence-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#767169;box-shadow:0 0 0 1px rgba(0,0,0,.7);}.social-presence-dot.active{background:#62b36f;box-shadow:0 0 6px rgba(98,179,111,.38);}.social-presence-dot.recent{background:#c8a64f;}
        .social-online-list{display:flex;flex-wrap:wrap;gap:6px;}
        .social-online-chip{display:inline-flex;align-items:center;gap:6px;min-height:26px;font-size:12px;background:#11130f;border:1px solid #3d382e;border-radius:3px;padding:2px 8px;color:#ddd5c8;cursor:pointer;}.social-online-chip em{padding-left:5px;border-left:1px solid #454036;color:#bfa36d;font-size:12px;font-style:normal;}
        .social-online-chip.active{border-color:#3f6744;}
        .social-online-chip.recent{border-color:#6b5b32;color:#c8bfaa;opacity:.88;}
        .social-online-chip:hover{filter:brightness(1.18);}
        .social-online-chip.me{border-color:#8b6838;box-shadow:inset 0 0 0 1px rgba(213,174,105,.08);}
        .social-online-empty{color:var(--copy-muted);font-size:12px;}
        .social-chat-wrap{position:relative;display:flex;flex-direction:column;gap:8px;}
        .social-chat-online{position:absolute;top:5px;right:10px;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:1px 7px;font-size:12px;line-height:1.4;color:var(--copy-muted);background:rgba(10,12,10,.82);border:1px solid #3d382e;border-radius:9px;pointer-events:none;}
        .social-chat-online>span{display:inline-flex;align-items:center;gap:4px;}
        .social-chat-online[hidden]{display:none;}
        .social-chat-online:not([hidden]) + .social-chat-list{margin-top:28px;} /* 접속 인원 칸 자리는 목록 밖에: 목록의 padding은 PC 창과 휴대폰 규칙에 덮였고, 스크롤과 함께 올라가 맨 위 줄의 시각을 가렸다. */
        .social-chat-list{height:calc(46vh / var(--scale-display-factor, 1));min-height:240px;overflow-y:auto;background:linear-gradient(170deg,#0d1420,#111c2c);border:1px solid #24344f;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}
        .social-chat-empty{display:grid;justify-items:center;gap:5px;color:var(--copy-muted);text-align:center;margin:auto;font-size:12px;}.social-chat-empty>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid #5b4a31;border-radius:50%;color:#d6b572;font-size:18px;}.social-chat-empty strong{color:#cfc5b5;}.social-chat-empty small{font-size:12px;}
        .social-chat-list>.social-chat-msg:first-child{margin-top:auto;} /* 메시지가 적을 때는 아래에 모인다(2026-10-30 사용자 요청). 넘치면 auto 여백이 0이 되어 그대로 스크롤된다. */
        .social-chat-msg{max-width:82%;align-self:flex-start;background:#141713;border:1px solid #343229;border-radius:6px;padding:7px 9px;}
        .social-chat-msg.mine{align-self:flex-end;background:#1b1914;border-color:#5b4930;}
        .social-chat-head{display:flex;align-items:center;gap:6px;min-width:0;}.social-chat-author{display:inline-flex;align-items:center;min-width:0;padding:0;border:0;background:none;color:inherit;cursor:pointer;}.social-chat-self{padding:1px 4px;border:1px solid #675132;border-radius:2px;color:#c9aa70;font-size:12px;}
        .social-chat-nick{overflow:hidden;color:#d6b572;font-weight:700;font-size:12px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}
        .social-chat-nick:hover{text-decoration:underline;}
        .social-chat-time{margin-left:auto;color:var(--copy-muted);font-size:12px;white-space:nowrap;}.social-chat-delete{flex:none;min-height:0;padding:0 6px;font-size:12px;line-height:16px;color:#f0b4a0;background:#2a1714;border:1px solid #6a3a30;border-radius:3px;cursor:pointer;}
        .social-chat-body{color:var(--copy-bright);margin:4px 0 0;white-space:pre-wrap;word-break:break-word;font-size:var(--font-size-chat,12px);line-height:1.5;}
        .social-chat-inputbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:stretch;}
        .social-chat-input-shell{position:relative;min-width:0;}
        .social-chat-input-shell input{box-sizing:border-box;width:100%;height:100%;min-height:44px;padding:8px 52px 8px 11px;background:#0e1726;border:1px solid #2a3e5c;border-radius:7px;color:#ffffff;}
        .social-chat-inputbar button{box-sizing:border-box;min-width:0;min-height:44px;margin:0;padding:7px 11px;white-space:nowrap;line-height:1;}
        .social-attach-btn{background:#16243a;border:1px solid #2f5180;color:#ffffff;cursor:pointer;}
        .social-attach-btn span{font-size:15px;line-height:0;}
        .social-chat-inputbar .social-send-btn{min-width:58px;background:linear-gradient(180deg,#315b7c,#203d58);border-color:#4d7898;color:var(--copy-bright);}
        .social-chat-counter{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--copy-muted);pointer-events:none;text-align:right;}
        .social-pending-items{display:flex;flex-wrap:wrap;gap:6px;}
        .social-pending-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#0f1a28;border:1px solid;border-radius:14px;padding:2px 6px 2px 9px;}
        .social-pending-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:0 2px;font-size:12px;}
        .social-item-link{display:inline;font-size:12px;font-weight:700;border:0;padding:0;margin:0 1px;background:none;cursor:pointer;}
        .social-item-link:hover{text-decoration:underline;text-underline-offset:2px;}
        .social-modal-overlay{position:fixed;inset:0;background:rgba(4,8,14,0.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
        .social-modal-box{position:relative;width:min(760px,calc(96vw / var(--scale-display-factor, 1)));max-height:calc(90vh / var(--scale-display-factor, 1));display:flex;flex-direction:column;overflow:hidden;background:var(--color-surface);border:1px solid var(--color-line-strong);border-radius:var(--radius-lg);color:var(--color-text);}
        .social-modal-content{flex:1 1 auto;overflow-y:auto;padding:20px;min-height:0;overscroll-behavior:contain;}
        /* position 계열에 !important: ui-premium.css 의 고특이도 전역 버튼 규칙(position:relative)이
           덮어쓰면 X버튼이 왼쪽 위 일반 흐름으로 배치되어 한 줄을 차지하는 문제가 재발한다. */
        .social-modal-close{position:absolute !important;top:10px !important;right:12px !important;left:auto !important;z-index:3;box-sizing:border-box;width:36px;height:36px;min-height:0;padding:0;display:flex;align-items:center;justify-content:center;background:var(--color-surface-raised);border:1px solid var(--color-line);color:var(--color-text);border-radius:50%;cursor:pointer;font-size:12px;line-height:1;}
        .social-modal-close:hover{background:var(--color-control);}
        .social-profile-empty{color:var(--copy-muted);text-align:center;padding:24px;}
        .social-profile-header{border-bottom:1px solid var(--color-line);padding-bottom:12px;margin-bottom:14px;padding-right:34px;}
        .social-profile-name{font-size:1.4em;font-weight:800;color:var(--color-accent);}
        .social-profile-sub{color:var(--copy-bright);margin-top:4px;}
        .social-profile-updated{color:var(--copy-muted);font-size:12px;margin-top:4px;}
        .social-profile-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;}
        .social-profile-col{min-width:0;}.social-profile-cols{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px;}
        @media(max-width:640px){.social-profile-cols{grid-template-columns:1fr;}}
        .social-profile-col h3{color:var(--copy-bright);font-size:1em;margin:0 0 8px;}
        .social-profile-tabs{display:flex;gap:6px;margin-bottom:8px;}
        .social-profile-tabs button{flex:1;min-width:0;min-height:40px;padding:6px 4px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:7px;color:var(--color-text);cursor:pointer;font-size:12px;}
        .social-profile-tabs button.active{background:var(--color-control);border-color:var(--color-accent);color:var(--color-text);font-weight:700;}
        @media(max-width:420px){
            .social-chat-inputbar{grid-template-columns:44px minmax(0,1fr) 64px;gap:5px;}
            .social-chat-inputbar button{padding:7px 8px;font-size:12px;}
            .social-attach-btn{font-size:0!important;}
            .social-attach-btn span{font-size:16px!important;}
            .social-send-btn{min-width:52px!important;}
        }
        .social-stat-grid{display:grid;grid-template-columns:1fr;gap:4px;}
        .social-stat-item{display:flex;justify-content:space-between;gap:10px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:6px;padding:5px 9px;}
        .social-stat-label{display:inline-flex;align-items:center;color:var(--copy-bright);font-size:12px;}
        .social-stat-label .combat-log-icon,.social-stat-icon{flex:0 0 auto;width:16px;height:16px;margin-right:6px;}
        .social-stat-icon{display:inline-block;background:url('assets/ui/passive-tree-icons-v5.png') no-repeat;background-size:110px 198px;}
        .social-stat-icon.is-none{background:none;}
        .social-stat-value{color:var(--color-text);font-weight:700;font-size:12px;}
        .social-mini-grid{display:flex;flex-direction:column;gap:6px;}
        .social-mini-card{background:var(--color-surface-raised);border:1px solid;border-left-width:3px;border-radius:7px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .social-mini-card:hover{background:var(--color-control);}
        .social-paperdoll{margin:0;}
        .social-paperdoll .social-slot{min-height:62px;display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:center;text-align:center;padding:6px 5px;border-radius:8px;cursor:pointer;background:var(--color-surface-raised);}
        .social-paperdoll .social-slot.empty{cursor:default;border:1px dashed var(--color-line);}
        .social-paperdoll .social-slot-tag{font-size:12px;color:var(--copy-muted);font-weight:700;}
        .social-paperdoll .social-slot-name{font-size:12px;font-weight:700;line-height:1.15;word-break:break-all;}
        .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
        .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
        .social-item-title{font-weight:700;font-size:12px;}
        .social-item-base{color:var(--copy-muted);font-size:12px;margin:2px 0 4px;}
        .social-item-unique{color:#d7b8ff;font-size:12px;margin:3px 0;}
        .social-item-stat{color:var(--copy-bright);font-size:12px;line-height:1.4;}
        .social-item-stat.base{color:#f1c40f;}
        .social-roll{color:var(--copy-muted);font-size:12px;}
        .social-tooltip{position:fixed;z-index:10001;max-width:320px;pointer-events:none;display:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));}
        .social-tooltip .social-item-card{background:#0c1421;border-width:1px;border-left-width:3px;}
        }`;
  var SocialStyles = class {
    constructor(deps, state2, data, services) {
      this.deps = deps;
      this.state = state2;
      this.data = data;
      this.services = services;
      ["injectSocialStyles"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
    }
    injectSocialStyles() {
      if (this.deps.document.getElementById("social-styles")) return;
      let style = this.deps.document.createElement("style");
      style.id = "social-styles";
      style.textContent = SOCIAL_STYLES;
      this.deps.document.head.appendChild(style);
    }
  };

  // modules/social-classic.mjs
  var state = new SocialSessionState();
  var session = new SocialSession({
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get cloudState() {
      return typeof cloudState === "undefined" ? void 0 : cloudState;
    }
  }, state, social_exports, {});
  var format = new SocialFormat({
    get CLASS_TEMPLATES() {
      return typeof CLASS_TEMPLATES === "undefined" ? void 0 : CLASS_TEMPLATES;
    },
    get escapeHTML() {
      return typeof escapeHTML === "undefined" ? void 0 : escapeHTML;
    },
    get getRarityColor() {
      return typeof getRarityColor === "undefined" ? void 0 : getRarityColor;
    }
  }, state, social_exports, {});
  var reset = new SocialReset({
    get clearInterval() {
      return typeof clearInterval === "undefined" ? void 0 : windowClearInterval;
    },
    get clearTimeout() {
      return typeof clearTimeout === "undefined" ? void 0 : windowClearTimeout;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get game() {
      return window.GameModules.state.game;
    }
  }, state, social_exports, {});
  var identity = new SocialIdentity({
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get localStorage() {
      return typeof localStorage === "undefined" ? void 0 : localStorage;
    }
  }, state, social_exports, { session, reset, format });
  var profileValues = new SocialProfileValues({
    get formatJewelStatValue() {
      return typeof formatJewelStatValue === "undefined" ? void 0 : formatJewelStatValue;
    },
    get formatValue() {
      return typeof formatValue === "undefined" ? void 0 : formatValue;
    },
    get gardenOils() {
      return typeof gardenOils === "undefined" ? void 0 : gardenOils;
    },
    get getStatName() {
      return typeof getStatName === "undefined" ? void 0 : getStatName;
    },
    get getWeaponCategoryName() {
      return typeof getWeaponCategoryName === "undefined" ? void 0 : getWeaponCategoryName;
    },
    get weaponCategorySlotLabel() {
      return typeof weaponCategorySlotLabel === "undefined" ? void 0 : weaponCategorySlotLabel;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  }, state, social_exports, { format });
  var snapshot = new SocialSnapshot({
    get console() {
      return console;
    },
    get CLASS_TEMPLATES() {
      return typeof CLASS_TEMPLATES === "undefined" ? void 0 : CLASS_TEMPLATES;
    },
    get COMPARE_STAT_META() {
      return typeof COMPARE_STAT_META === "undefined" ? void 0 : COMPARE_STAT_META;
    },
    get PLAYER_CLASS_DEFS() {
      return typeof PLAYER_CLASS_DEFS === "undefined" ? void 0 : PLAYER_CLASS_DEFS;
    },
    get STUMP_BOX_GRAFT() {
      return typeof STUMP_BOX_GRAFT === "undefined" ? void 0 : STUMP_BOX_GRAFT;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get bagItems() {
      return typeof bagItems === "undefined" ? void 0 : bagItems;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get coreItems() {
      return typeof coreItems === "undefined" ? void 0 : coreItems;
    },
    get equipmentCrafting() {
      return typeof equipmentCrafting === "undefined" ? void 0 : equipmentCrafting;
    },
    get equipmentSockets() {
      return typeof equipmentSockets === "undefined" ? void 0 : equipmentSockets;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getAscendKeystoneName() {
      return typeof getAscendKeystoneName === "undefined" ? void 0 : getAscendKeystoneName;
    },
    get getAscendKeystoneOwnerClass() {
      return typeof getAscendKeystoneOwnerClass === "undefined" ? void 0 : getAscendKeystoneOwnerClass;
    },
    get getItemBaseChainInfo() {
      return typeof getItemBaseChainInfo === "undefined" ? void 0 : getItemBaseChainInfo;
    },
    get getItemCraftTier() {
      return typeof getItemCraftTier === "undefined" ? void 0 : getItemCraftTier;
    },
    get getJewelStats() {
      return typeof getJewelStats === "undefined" ? void 0 : getJewelStats;
    },
    get getJewelUniqueEffectText() {
      return typeof getJewelUniqueEffectText === "undefined" ? void 0 : getJewelUniqueEffectText;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get getSaveLoopNumber() {
      return typeof getSaveLoopNumber === "undefined" ? void 0 : getSaveLoopNumber;
    },
    get getWorldTreeBarkEffect() {
      return typeof getWorldTreeBarkEffect === "undefined" ? void 0 : getWorldTreeBarkEffect;
    },
    get isFixedEquipmentAffix() {
      return typeof isFixedEquipmentAffix === "undefined" ? void 0 : isFixedEquipmentAffix;
    },
    get levelProgression() {
      return typeof levelProgression === "undefined" ? void 0 : levelProgression;
    },
    get previewBuildStats() {
      return typeof previewBuildStats === "undefined" ? void 0 : previewBuildStats;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get talismanEffects() {
      return typeof talismanEffects === "undefined" ? void 0 : talismanEffects;
    },
    get talismans() {
      return typeof talismans === "undefined" ? void 0 : talismans;
    }
  }, state, social_exports, { profileValues, format, identity });
  var statsMarkup = new SocialStatsMarkup({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  }, state, social_exports, { format });
  var upload = new SocialUpload({
    get clearTimeout() {
      return typeof clearTimeout === "undefined" ? void 0 : windowClearTimeout;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get gameplayStarted() {
      return typeof gameplayStarted === "undefined" ? void 0 : gameplayStarted;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get startupOverlayActive() {
      return typeof startupOverlayActive === "undefined" ? void 0 : startupOverlayActive;
    }
  }, state, social_exports, { session, snapshot, identity });
  var nickname = new SocialNickname({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    }
  }, state, social_exports, { session, identity });
  var chatStatus = new SocialChatStatus({
    get console() {
      return console;
    },
    get URLSearchParams() {
      return typeof URLSearchParams === "undefined" ? void 0 : URLSearchParams;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get localStorage() {
      return typeof localStorage === "undefined" ? void 0 : localStorage;
    },
    get location() {
      return typeof location === "undefined" ? void 0 : location;
    },
    get messageFrames() {
      return typeof messageFrames === "undefined" ? void 0 : messageFrames;
    }
  }, state, social_exports, {});
  var presenceMarkup = new SocialPresenceMarkup({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get i18n() {
      return typeof i18n === "undefined" ? void 0 : i18n;
    }
  }, state, social_exports, { session, format });
  var presence = new SocialPresence({
    get console() {
      return console;
    },
    get clearTimeout() {
      return typeof clearTimeout === "undefined" ? void 0 : windowClearTimeout;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get setInterval() {
      return typeof setInterval === "undefined" ? void 0 : windowSetInterval;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    }
  }, state, social_exports, { session, identity, chatStatus, presenceMarkup });
  var blocking = new SocialBlocking({
    get console() {
      return console;
    },
    get localStorage() {
      return typeof localStorage === "undefined" ? void 0 : localStorage;
    }
  }, state, social_exports, {});
  var noticeView = new SocialNoticeView({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get updateTabNotificationDots() {
      return typeof updateTabNotificationDots === "undefined" ? void 0 : updateTabNotificationDots;
    }
  }, state, social_exports, { session, chatStatus, blocking });
  var notifications = new SocialNotifications({
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get setInterval() {
      return typeof setInterval === "undefined" ? void 0 : windowSetInterval;
    }
  }, state, social_exports, { session, chatStatus, noticeView });
  var chatData = new SocialChatData({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    }
  }, state, social_exports, { session });
  var specialCards = new SocialSpecialCards({
    get CORE_ITEM_RULES() {
      return typeof CORE_ITEM_RULES === "undefined" ? void 0 : CORE_ITEM_RULES;
    },
    get STUMP_BOX_COLORS() {
      return typeof STUMP_BOX_COLORS === "undefined" ? void 0 : STUMP_BOX_COLORS;
    },
    get STUMP_BOX_SCAR() {
      return typeof STUMP_BOX_SCAR === "undefined" ? void 0 : STUMP_BOX_SCAR;
    },
    get TALISMAN_RARITY_TONES() {
      return typeof TALISMAN_RARITY_TONES === "undefined" ? void 0 : TALISMAN_RARITY_TONES;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  }, state, social_exports, { format, profileValues });
  var itemCards = new SocialItemCards({
    get COLONY_WARD_RULES() {
      return typeof COLONY_WARD_RULES === "undefined" ? void 0 : COLONY_WARD_RULES;
    },
    get EMBER_CORRUPTION_TONE() {
      return typeof EMBER_CORRUPTION_TONE === "undefined" ? void 0 : EMBER_CORRUPTION_TONE;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get equipmentCrafting() {
      return typeof equipmentCrafting === "undefined" ? void 0 : equipmentCrafting;
    },
    get getBaseStepClassName() {
      return typeof getBaseStepClassName === "undefined" ? void 0 : getBaseStepClassName;
    },
    get getExceptionalBaseStars() {
      return typeof getExceptionalBaseStars === "undefined" ? void 0 : getExceptionalBaseStars;
    },
    get getTierBadgeHtml() {
      return typeof getTierBadgeHtml === "undefined" ? void 0 : getTierBadgeHtml;
    },
    get itemTooltipRules() {
      return typeof itemTooltipRules === "undefined" ? void 0 : itemTooltipRules;
    }
  }, state, social_exports, { format, profileValues, specialCards });
  var chatMarkup = new SocialChatMarkup({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get requestAnimationFrame() {
      return typeof requestAnimationFrame === "undefined" ? void 0 : windowRequestAnimationFrame;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    }
  }, state, social_exports, { format, itemCards, session, chatStatus, noticeView, blocking });
  var polling = new SocialPolling({
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get setInterval() {
      return typeof setInterval === "undefined" ? void 0 : windowSetInterval;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    }
  }, state, social_exports, { chatStatus, chatMarkup, chatData, session, presence, reset });
  var realtime = new SocialRealtime({
    get clearTimeout() {
      return typeof clearTimeout === "undefined" ? void 0 : windowClearTimeout;
    },
    get cloudState() {
      return typeof cloudState === "undefined" ? void 0 : cloudState;
    },
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get setTimeout() {
      return typeof setTimeout === "undefined" ? void 0 : windowSetTimeout;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  }, state, social_exports, { chatData, session, chatStatus, noticeView, chatMarkup, presence, reset, polling });
  var background = new SocialBackground({
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get game() {
      return window.GameModules.state.game;
    }
  }, state, social_exports, { chatStatus, noticeView, notifications, realtime, session, identity, upload, nickname, presence, reset, polling });
  var composerControls = new SocialComposerControls({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    }
  }, state, social_exports, { session, identity });
  var attachments = new SocialAttachments({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get bagItems() {
      return typeof bagItems === "undefined" ? void 0 : bagItems;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    }
  }, state, social_exports, { snapshot, identity, format });
  var screen = new SocialScreen({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get cloudState() {
      return typeof cloudState === "undefined" ? void 0 : cloudState;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get selectionDialog() {
      return typeof selectionDialog === "undefined" ? void 0 : selectionDialog;
    }
  }, state, social_exports, { session, identity, nickname, presence, background, composerControls, attachments, polling, reset, format, blocking });
  var screenActions = new SocialScreenActions({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get requestGameText() {
      return typeof requestGameText === "undefined" ? void 0 : requestGameText;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get withDirectionParticle() {
      return typeof withDirectionParticle === "undefined" ? void 0 : withDirectionParticle;
    }
  }, state, social_exports, { session, identity, upload, nickname, screen, polling, blocking, chatMarkup });
  var chatSend = new SocialChatSend({
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    }
  }, state, social_exports, { session, identity, upload, screenActions, nickname, screen, attachments, composerControls, presence, chatData, polling });
  var profileView = new SocialProfileView({
    get BASE_ITEM_DB() {
      return typeof BASE_ITEM_DB === "undefined" ? void 0 : BASE_ITEM_DB;
    },
    get CORE_ITEM_RULES() {
      return typeof CORE_ITEM_RULES === "undefined" ? void 0 : CORE_ITEM_RULES;
    },
    get ITEM_VISUAL_ASSET_DB() {
      return typeof ITEM_VISUAL_ASSET_DB === "undefined" ? void 0 : ITEM_VISUAL_ASSET_DB;
    },
    get STUMP_BOX_COLORS() {
      return typeof STUMP_BOX_COLORS === "undefined" ? void 0 : STUMP_BOX_COLORS;
    },
    get STUMP_BOX_STAGES() {
      return typeof STUMP_BOX_STAGES === "undefined" ? void 0 : STUMP_BOX_STAGES;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get cloudJsonRequest() {
      return typeof cloudJsonRequest === "undefined" ? void 0 : cloudJsonRequest;
    },
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getEquipmentGridVisualAsset() {
      return typeof getEquipmentGridVisualAsset === "undefined" ? void 0 : getEquipmentGridVisualAsset;
    },
    get i18n() {
      return typeof i18n === "undefined" ? void 0 : i18n;
    },
    get isMapPrimaryContentUnlocked() {
      return typeof isMapPrimaryContentUnlocked === "undefined" ? void 0 : isMapPrimaryContentUnlocked;
    },
    get selectionDialog() {
      return typeof selectionDialog === "undefined" ? void 0 : selectionDialog;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get weaponCategorySlotLabel() {
      return typeof weaponCategorySlotLabel === "undefined" ? void 0 : weaponCategorySlotLabel;
    }
  }, state, social_exports, { reset, session, identity, upload, screenActions, nickname, format, profileValues, itemCards, specialCards, statsMarkup, blocking, chatMarkup });
  var tooltip = new SocialTooltip({
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  }, state, social_exports, { reset, profileView });
  var styles = new SocialStyles({
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    }
  }, state, social_exports, {});
  var legacyNames = {
    SOCIAL_NICK_KEY,
    SOCIAL_LAST_SEEN_CHAT_KEY,
    SOCIAL_CHAT_LIMIT,
    SOCIAL_CHAT_POLL_MS,
    SOCIAL_ONLINE_POLL_MS,
    SOCIAL_CHAT_FULL_SYNC_MS,
    SOCIAL_CHAT_FORGET_MS,
    SOCIAL_CHAT_LIVE_POLL_MS,
    SOCIAL_CHAT_LIVE_HIDDEN_MS,
    SOCIAL_CHAT_LIVE_MISSES,
    SOCIAL_CHAT_LIVE_SETTLE_MS,
    SOCIAL_BG_NOTI_POLL_MS,
    SOCIAL_CHAT_TOAST_MS,
    SOCIAL_CHAT_TOAST_GAP_MS,
    SOCIAL_MSG_MAX,
    SOCIAL_NICK_MIN,
    SOCIAL_NICK_MAX,
    SOCIAL_SEND_MIN_INTERVAL_MS,
    SOCIAL_SEND_MAX_PER_MIN,
    SOCIAL_MAX_ITEMS_PER_MSG,
    SOCIAL_TALISMAN_LINE_LIMIT,
    SOCIAL_LEGACY_ITEM_LINE_LIMIT,
    SOCIAL_ITEM_ARRAY_LIMITS,
    SOCIAL_PROFILE_SYNC_DELAY_MS,
    SOCIAL_HEARTBEAT_MS,
    SOCIAL_ONLINE_WINDOW_S,
    SOCIAL_RECENT_WINDOW_S,
    SOCIAL_CHAT_RETENTION_MS,
    SOCIAL_ITEM_TOKEN_RE,
    SOCIAL_NICK_RE,
    SOCIAL_EQUIP_SLOTS,
    SOCIAL_BLOCKED_KEY,
    PROFILE_STAT_KEYS,
    PROFILE_STAT_ICONS,
    PROFILE_STAT_GROUPS,
    PROFILE_STAT_TONES,
    SOCIAL_CHAT_ERROR_TEXTS,
    socialChatMaxId,
    PROFILE_TALISMAN_STATES,
    PROFILE_OFF_STYLE,
    PROFILE_TALISMAN_RARITY,
    profileOwn,
    PROFILE_CORE_TONE,
    PROFILE_STUMP_CELLS,
    CHAT_SETTINGS_ID,
    socialLoggedInUserId: session.socialLoggedInUserId,
    socialCloudReady: session.socialCloudReady,
    getMyNickname: identity.getMyNickname,
    socialClassLabel: format.socialClassLabel,
    buildItemSnapshot: snapshot.buildItemSnapshot,
    profileSnapshotIsOwn: upload.profileSnapshotIsOwn,
    uploadPlayerProfile: upload.uploadPlayerProfile,
    syncPlayerProfileQuiet: upload.syncPlayerProfileQuiet,
    syncInitialPlayerProfile: upload.syncInitialPlayerProfile,
    syncPlayerProfile: screenActions.syncPlayerProfile,
    promptAndSetNickname: screenActions.promptAndSetNickname,
    restoreNicknameFromServer: nickname.restoreNicknameFromServer,
    sendPresenceHeartbeat: presence.sendPresenceHeartbeat,
    refreshOnlineUsers: presence.refreshOnlineUsers,
    isSocialTabActive: chatStatus.isSocialTabActive,
    checkSocialChatNotification: notifications.checkSocialChatNotification,
    syncSocialChatNotificationSetting: background.syncSocialChatNotificationSetting,
    syncSocialBackgroundTasks: background.syncSocialBackgroundTasks,
    syncLiveChat: realtime.syncLiveChat,
    unblockUser: screenActions.unblockUser,
    sendChatMessage: chatSend.sendChatMessage,
    getChatAttachSnapshot: attachments.getChatAttachSnapshot,
    attachChatSnapshot: attachments.attachChatSnapshot,
    attachChatItem: attachments.attachChatItem,
    attachChatItemOf: attachments.attachChatItemOf,
    removePendingChatItem: attachments.removePendingChatItem,
    updateChatCounter: attachments.updateChatCounter,
    renderChatMessages: chatMarkup.renderChatMessages,
    forgetSocialChatMessages: polling.forgetSocialChatMessages,
    refreshChatPanel: polling.refreshChatPanel,
    startChatPolling: polling.startChatPolling,
    stopChatPolling: reset.stopChatPolling,
    syncSocialChatPolling: background.syncSocialChatPolling,
    onSocialChatKeydown: chatSend.onSocialChatKeydown,
    ensureSocialTooltip: tooltip.ensureSocialTooltip,
    showSocialTip: tooltip.showSocialTip,
    moveSocialTip: tooltip.moveSocialTip,
    hideSocialTip: reset.hideSocialTip,
    openTipModal: tooltip.openTipModal,
    renderProfileItemCard: itemCards.renderProfileItemCard,
    closePlayerProfile: reset.closePlayerProfile,
    openMyProfilePreview: profileView.openMyProfilePreview,
    switchProfileTab: profileView.switchProfileTab,
    renderProfileActionsRow: profileView.renderProfileActionsRow,
    toggleProfileBlock: profileView.toggleProfileBlock,
    openPlayerProfile: profileView.openPlayerProfile,
    renderSocialTab: screen.renderSocialTab,
    openChatSettings: screen.openChatSettings,
    injectSocialStyles: styles.injectSocialStyles,
    get socialState() {
      return state.current;
    }
  };
  var stateDescriptor = { configurable: true, get: () => state.current, set: (value) => {
    state.current = value;
  } };
  Object.defineProperty(window, "socialState", stateDescriptor);
  if (globalThis !== window) Object.defineProperty(globalThis, "socialState", stateDescriptor);
  safeExposeGlobals(legacyNames);
  if (globalThis !== window) Object.assign(globalThis, legacyNames);
  var lifecycle = new SocialLifecycle({ document, console, setTimeout: windowSetTimeout, clearTimeout: windowClearTimeout }, state, { reset, styles, tooltip, background, realtime });
  window.GameModules.social = { state, lifecycle, session, format, reset, identity, profileValues, snapshot, statsMarkup, upload, nickname, chatStatus, presenceMarkup, presence, blocking, noticeView, notifications, chatData, specialCards, itemCards, chatMarkup, polling, realtime, background, composerControls, attachments, screen, screenActions, chatSend, profileView, tooltip, styles };
  lifecycle.start();
})();
