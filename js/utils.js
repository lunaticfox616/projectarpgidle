// GENERATED from modules/utils*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/game-state.mjs
  var GameRuntimeState = class {
    constructor(game2, readDefaults) {
      this.game = game2;
      this.readDefaults = readDefaults;
      this.defaultDefinitions = void 0;
      this.session = null;
      this.controls = {
        startupOverlayActive: true,
        gameplayStarted: false,
        gameEntryRunning: false,
        pendingMapRevealZoneId: null,
        pendingMapRevealToken: 0,
        backgroundCombatRuntime: {
          hiddenAtMs: 0,
          snapshot: null,
          signature: "",
          processing: false,
          failed: false,
          accelerationTier: 0,
          finishRequested: false,
          offlineSettledSlots: [],
          appInactive: false,
          launchSettlementPending: false
        },
        mouseX: 0,
        mouseY: 0,
        pendingHeavyUiRefresh: false,
        crowdPauseActive: false,
        activeTutorial: null,
        activeTutorialStep: 0
      };
      this.tutorialQueue = [];
    }
    get defaultGame() {
      return this.defaultDefinitions === void 0 ? this.readDefaults() : this.defaultDefinitions;
    }
    /** Called once at the original initial-game creation point.
     * pTimer: accumulated attack charge (1 = one attack); progressStallTicks: 100 ms ticks;
     * itemIdCounter: last allocated item identity; lastTime: wall time in milliseconds. */
    startSession(game2, nowMs) {
      this.game = game2;
      this.session = { pTimer: 0, progressStallTicks: 0, itemIdCounter: 0, lastTime: nowMs };
    }
  };

  // modules/state/cloud-account.mjs
  var CloudAccountState = class {
    constructor() {
      this.active = true;
      this.current = {
        initialized: false,
        configured: false,
        busy: false,
        session: null,
        user: null,
        linkedProviders: [],
        isLoaded: false,
        lastMessage: "설정 전",
        lastRemoteUpdatedAt: 0,
        lastRemoteRevision: 0,
        revisionSupported: null,
        lastSyncAttemptAt: 0,
        syncHalted: false,
        uploadFailureNoticed: false,
        tokenRefreshPromise: null,
        sessionEpoch: 0,
        tokenExpiryWarned: false,
        pendingForcedSyncOptions: null,
        pendingForcedSyncRetryTimer: null,
        exitUpload: null
      };
    }
    userId() {
      const id = this.current.user && this.current.user.id;
      return typeof id === "string" && id.trim() ? id : null;
    }
    isCurrentSession(session, epoch) {
      return this.active && this.current.session === session && this.current.sessionEpoch === epoch;
    }
    isCurrentAccount(userId, epoch) {
      return this.active && this.userId() === userId && this.current.sessionEpoch === epoch;
    }
    /** Every adopted token supersedes a pending refresh; only an account change invalidates save operations. */
    resetForSession(session) {
      const nextId = session?.access_token ? session.user?.id || this.userId() : null;
      this.current.tokenRefreshPromise = null;
      if (this.userId() === nextId) return false;
      this.current.sessionEpoch++;
      this.current.busy = false;
      this.current.lastRemoteRevision = 0;
      this.current.syncHalted = false;
      this.current.uploadFailureNoticed = false;
      this.current.lastUploadedFingerprint = null;
      this.current.pendingForcedSyncOptions = null;
      return true;
    }
    clearSession() {
      this.current.session = null;
      this.current.user = null;
      this.current.isLoaded = false;
    }
    adoptSession(session, nowMs) {
      let expiresAt = Number(session.expires_at) || 0;
      if (!expiresAt && Number(session.expires_in) > 0) expiresAt = Math.floor(nowMs / 1e3) + Math.floor(Number(session.expires_in));
      this.current.session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || this.current.session && this.current.session.refresh_token || "",
        expires_at: expiresAt,
        token_type: session.token_type || "bearer",
        user: session.user || this.current.user || null
      };
      this.current.user = this.current.session.user;
      this.current.isLoaded = false;
      this.current.tokenExpiryWarned = false;
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      this.current.sessionEpoch++;
      this.current.tokenRefreshPromise = null;
    }
  };

  // modules/state/passive-tree-runtime.mjs
  var PassiveTreeRuntime = class {
    constructor() {
      this.worldScale = 1.14;
      this.bounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
      this.reachableNodes = /* @__PURE__ */ new Set();
      this.discoveredNodes = /* @__PURE__ */ new Set();
      this.previewNodes = /* @__PURE__ */ new Set();
    }
  };

  // modules/data/player-level-limit.mjs
  var MAX_PLAYER_LEVEL = 200;

  // modules/domain/equipment-inventory-capacity.mjs
  var EquipmentInventoryCapacity = class {
    constructor(deps) {
      this.deps = deps;
      this.getEquipmentInventoryPageCount = this.getEquipmentInventoryPageCount.bind(this);
      this.getInventoryLimit = this.getInventoryLimit.bind(this);
      this.getInventoryUsedCellCount = this.getInventoryUsedCellCount.bind(this);
      this.canStoreEquipmentItems = this.canStoreEquipmentItems.bind(this);
    }
    getEquipmentInventoryPageCount(targetGame) {
      const state2 = targetGame || this.deps.game, ledger = state2.contentProgression;
      let earnedPages;
      if (ledger && Number(ledger.version) >= this.deps.CONTENT_UNLOCK_SERIES_VERSION) {
        const owned = new Set([].concat(ledger.unlocked || [], ledger.inherited || []));
        earnedPages = this.deps.CONTENT_UNLOCK_CATALOG.filter((row) => row.series === "bagPage" && owned.has(row.id)).length;
      } else {
        const loop = Math.max(1, Math.floor(Number(state2.season) || 1), Math.floor(Number(state2.loopCount) || 0) + 1);
        earnedPages = loop < 30 ? Math.floor(loop / 5) : 6 + Math.floor((loop - 30) / 10);
      }
      return Math.max(1, Math.min(this.deps.EQUIPMENT_INVENTORY_MAX_PAGES, 1 + earnedPages));
    }
    getInventoryLimit(targetGame) {
      return this.getEquipmentInventoryPageCount(targetGame) * this.deps.EQUIPMENT_INVENTORY_CELLS_PER_PAGE;
    }
    itemCells(item) {
      const measure = this.deps.getEquipmentInventoryFootprint;
      const footprint = typeof measure === "function" ? measure(item) : { columns: 1, rows: 1 };
      return Math.max(1, Math.floor(Number(footprint.columns) || 1)) * Math.max(1, Math.floor(Number(footprint.rows) || 1));
    }
    getInventoryUsedCellCount(targetGame) {
      const state2 = targetGame || this.deps.game;
      return (Array.isArray(state2.inventory) ? state2.inventory : []).reduce((sum, item) => sum + this.itemCells(item), 0);
    }
    canStoreEquipmentItems(items, targetGame) {
      const incoming = (Array.isArray(items) ? items : [items]).filter(Boolean);
      const state2 = targetGame || this.deps.game, grid = this.deps.equipmentInventoryGridRuntime;
      if (typeof grid !== "undefined") return grid.canStoreItems(incoming, state2);
      const incomingCells = incoming.reduce((sum, item) => sum + this.itemCells(item), 0);
      return this.getInventoryUsedCellCount(state2) + incomingCells <= this.getInventoryLimit(state2);
    }
  };

  // modules/common/stat-text.mjs
  var StatText = class {
    constructor(deps) {
      this.deps = deps;
      this.translateSkillTag = this.translateSkillTag.bind(this);
      this.getSkillTagList = this.getSkillTagList.bind(this);
      this.getStatName = this.getStatName.bind(this);
      this.makeSourceLine = this.makeSourceLine.bind(this);
    }
    translateSkillTag(tag) {
      return this.deps.translate(this.deps.skillTags[tag] || tag);
    }
    getSkillTagList(skill) {
      return (skill.tags || []).map(this.translateSkillTag);
    }
    getStatName(statId) {
      return this.deps.translate(this.deps.statNames[statId] || this.deps.stats[statId] && this.deps.stats[statId].name || statId);
    }
    makeSourceLine(label, value, suffix, formatter) {
      if (!value) return null;
      const rendered = formatter ? formatter(value) : `${Math.floor(value)}${suffix || ""}`;
      return `${this.deps.translate(label)} ${value < 0 ? "" : "+"}${rendered}`;
    }
  };

  // modules/common/canvas-pixels.mjs
  function snapCanvasRectToDevicePixels(ctx, x, y, width, height) {
    let transform = ctx.getTransform();
    let scaleX = Number(transform.a);
    let scaleY = Number(transform.d);
    let axisAligned = Number.isFinite(scaleX) && Math.abs(scaleX) > 1e-3 && Number.isFinite(scaleY) && Math.abs(scaleY) > 1e-3 && Math.abs(Number(transform.b) || 0) < 1e-3 && Math.abs(Number(transform.c) || 0) < 1e-3;
    if (!axisAligned) return { x, y, width, height };
    let left = (Math.round(x * scaleX + transform.e) - transform.e) / scaleX;
    let top = (Math.round(y * scaleY + transform.f) - transform.f) / scaleY;
    let right = (Math.round((x + width) * scaleX + transform.e) - transform.e) / scaleX;
    let bottom = (Math.round((y + height) * scaleY + transform.f) - transform.f) / scaleY;
    return { x: left, y: top, width: Math.max(1 / Math.abs(scaleX), right - left), height: Math.max(1 / Math.abs(scaleY), bottom - top) };
  }
  function drawCrispCanvasText(ctx, text2, x, y, method = "fillText") {
    const label = String(text2), align = ctx.textAlign;
    const width = align === "center" || align === "right" || align === "end" ? ctx.measureText(label).width : 0;
    const at = snapCanvasRectToDevicePixels(ctx, align === "center" ? x - width / 2 : x - width, y, 0, 0);
    ctx.textAlign = "left";
    ctx[method](label, at.x, at.y);
    ctx.textAlign = align;
  }

  // modules/browser/legacy-polyfills.mjs
  function installLegacyPolyfills(dom) {
    if (!Array.prototype.includes) {
      Array.prototype.includes = function(search, start) {
        let index = start || 0;
        if (index < 0) index = Math.max(this.length + index, 0);
        for (let i = index; i < this.length; i++) {
          if (this[i] === search || search !== search && this[i] !== this[i]) return true;
        }
        return false;
      };
    }
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(search, pos) {
        let start = pos || 0;
        return this.substring(start, start + String(search).length) === String(search);
      };
    }
    if (!Math.hypot) {
      Math.hypot = function() {
        let sum = 0;
        for (let i = 0; i < arguments.length; i++) sum += arguments[i] * arguments[i];
        return Math.sqrt(sum);
      };
    }
    if (!Object.values) {
      Object.values = function(obj) {
        return Object.keys(obj).map(function(key) {
          return obj[key];
        });
      };
    }
    if (!Object.entries) {
      Object.entries = function(obj) {
        return Object.keys(obj).map(function(key) {
          return [key, obj[key]];
        });
      };
    }
    if (!Object.fromEntries) {
      Object.fromEntries = function(entries) {
        let obj = {};
        (entries || []).forEach(function(entry) {
          if (!entry || entry.length < 2) return;
          obj[entry[0]] = entry[1];
        });
        return obj;
      };
    }
    installCollectionIteration(dom);
  }
  function installCollectionIteration(dom) {
    if (typeof dom.NodeList !== "undefined" && !dom.NodeList.prototype.forEach) {
      dom.NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (typeof dom.HTMLCollection !== "undefined" && !dom.HTMLCollection.prototype.forEach) {
      dom.HTMLCollection.prototype.forEach = Array.prototype.forEach;
    }
  }

  // modules/browser/legacy-global-bridge.mjs
  var LegacyGlobalBridge = class {
    constructor(target, logger) {
      this.target = target;
      this.logger = logger;
      target.__runtimeFallbackQueues = target.__runtimeFallbackQueues || {};
      this.safeExposeGlobals = this.safeExposeGlobals.bind(this);
      this.exposeFileGlobals = this.exposeFileGlobals.bind(this);
    }
    installPublicApi(realm) {
      this.target.safeExposeGlobals = this.target.safeExposeGlobals || this.safeExposeGlobals;
      this.target.exposeFileGlobals = this.exposeFileGlobals;
      if (realm !== this.target) Object.assign(realm, {
        safeExposeGlobals: this.safeExposeGlobals,
        exposeFileGlobals: this.exposeFileGlobals
      });
    }
    flush(key) {
      const queue = this.target.__runtimeFallbackQueues && this.target.__runtimeFallbackQueues[key] || [];
      const handler = this.target[key];
      if (!queue.length || typeof handler !== "function" || handler.__placeholderGlobal === true) return;
      this.target.__runtimeFallbackQueues[key] = [];
      queue.splice(0, 20).forEach((args) => {
        try {
          this.target[key].apply(null, args || []);
        } catch (error) {
          this.logger.error(key + " queued call failed:", error);
        }
      });
    }
    safeExposeGlobals(map) {
      Object.keys(map || {}).forEach((key) => {
        const current = this.target[key], incoming = map[key];
        const canReplace = typeof current === "undefined" || current && current.__placeholderGlobal === true;
        if (!canReplace && current !== incoming) throw new Error("Duplicate global exposure: " + key);
        this.target[key] = incoming;
        if (!(incoming && incoming.__placeholderGlobal === true)) this.flush(key);
      });
    }
    // Matches former hoisted function declarations: file exports can replace earlier placeholders.
    exposeFileGlobals(map) {
      Object.keys(map).forEach((key) => {
        this.target[key] = map[key];
      });
    }
    queue(name, args) {
      const queues = this.target.__runtimeFallbackQueues = this.target.__runtimeFallbackQueues || {};
      const queue = queues[name] = queues[name] || [];
      if (queue.length < 20) queue.push(Array.prototype.slice.call(args || []));
    }
    install(name, fallback, options = {}) {
      if (typeof this.target[name] !== "undefined") return;
      const bridge2 = this;
      const handler = function(...args) {
        if (options.queue) bridge2.queue(name, args);
        return fallback.apply(this, args);
      };
      handler.__placeholderGlobal = true;
      this.target[name] = handler;
    }
  };

  // modules/browser/legacy-startup-fallbacks.mjs
  function installStartupFallbacks(bridge2, deps) {
    const target = bridge2.target;
    bridge2.install("getPlayerStats", fallbackStats);
    bridge2.install("getSkillTargets", () => []);
    if (typeof target.ENEMY_CROWD_PAUSE_LIMIT === "undefined") target.ENEMY_CROWD_PAUSE_LIMIT = 20;
    bridge2.install("isCrowdProgressPaused", () => false);
    bridge2.install("isDamageAilmentType", (type) => type === "ignite" || type === "poison" || type === "bleed");
    bridge2.install("getStoredAilmentHitDamage", storedHitDamage);
    bridge2.install("getDamageAilmentBaseDpsFromHit", ailmentBaseDps);
    bridge2.install("getEnemyDamageAilmentDps", (ail, stats) => enemyAilmentDps(target, ail, stats));
    bridge2.install("getPlayerDamageAilmentDps", (ail, stats) => playerAilmentDps(target, ail, stats));
    installStartupActions(bridge2, deps);
    bridge2.install("getGemPresentation", (name, support) => gemPresentation(deps, name, support));
  }
  function fallbackStats() {
    return {
      maxHp: 1,
      energyShield: 0,
      baseDmg: 0,
      directDps: 0,
      dps: 0,
      totalDps: 0,
      summonDps: 0,
      aspd: 1,
      crit: 0,
      critDmg: 150,
      move: 100,
      moveSpeed: 100,
      dr: 0,
      armor: 0,
      evasion: 0,
      resF: 0,
      resC: 0,
      resL: 0,
      resChaos: 0,
      regen: 0,
      regenSuppress: 0,
      leech: 0,
      ds: 0,
      igniteChance: 0,
      chillChance: 0,
      freezeChance: 0,
      shockChance: 0,
      poisonChance: 0,
      bleedChance: 0,
      blockChance: 0,
      blockChanceMax: 50,
      deflectChance: 0,
      deflectDamageReduce: 0,
      suppCap: 0,
      summonCap: 1,
      runeResonancePower: 0,
      uniqueResonanceFloor: 0,
      inquisitorResonanceBonus: 0,
      breakdowns: {},
      __uiFallbackStats: true
    };
  }
  function storedHitDamage(ail) {
    return ail ? Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0) : 0;
  }
  function ailmentBaseDps(hitDamage, _power, scale, critDotBonusPct, critDotBonusScale) {
    const source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    const baseScale = Math.max(0.01, Number(scale) || 1);
    const bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    const bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return Math.max(1, Math.floor(source * 0.9 * (baseScale + bonusPct / 100 * bonusScale)));
  }
  function enemyAilmentDps(target, ail, stats) {
    const scale = Math.max(0.01, stats && Number.isFinite(stats.dotDamageScale) ? stats.dotDamageScale : 1);
    const dps = target.getDamageAilmentBaseDpsFromHit(
      target.getStoredAilmentHitDamage(ail),
      ail ? ail.power : 0,
      scale,
      ail ? ail.critDotBonusPct : 0,
      stats ? stats.dotCritBonusScale : 1
    );
    return applyEnemyAilmentBonus(dps, ail, stats);
  }
  function applyEnemyAilmentBonus(dps, ail, stats) {
    if (ail && ail.type === "ignite") return Math.floor(dps * (1 + Math.max(0, Number(stats && stats.igniteDamageMultiplierPct) || 0) / 100));
    if (ail && ail.type === "poison") return Math.floor(dps * (1 + Math.max(0, Number(stats && stats.poisonDamageMultiplierPct) || 0) / 100));
    return dps;
  }
  function playerAilmentDps(target, ail, stats) {
    let source = target.getStoredAilmentHitDamage(ail);
    if (source <= 0 && stats && stats.maxHp) source = Math.max(1, Math.floor((stats.maxHp || 1) * 0.08));
    return target.getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, stats ? stats.dotCritBonusScale : 1);
  }
  function installStartupActions(bridge2, deps) {
    bridge2.install("startEncounterRun", () => {
      const state2 = deps.game;
      if (!state2) return;
      state2.encounterPlan = Array.isArray(state2.encounterPlan) ? state2.encounterPlan : [];
      state2.encounterIndex = Math.max(0, Math.floor(state2.encounterIndex || 0));
    }, { queue: true });
    bridge2.install("coreLoop", () => void 0);
    bridge2.install("updateStaticUI", () => void 0, { queue: true });
    bridge2.install("startMoving", () => {
      const state2 = deps.game;
      if (!state2) return;
      state2.combatHalted = false;
      state2.isTownReturning = false;
      state2.moveTimer = Math.max(0, Number(state2.moveTimer) || 0);
      state2.moveTotalTime = Math.max(0, Number(state2.moveTotalTime) || 0);
    }, { queue: true });
    bridge2.install("returnToTown", () => {
      const state2 = deps.game;
      if (!state2) return;
      state2.isTownReturning = false;
      state2.combatHalted = true;
      state2.enemies = [];
    }, { queue: true });
    for (const name of ["triggerSeasonReset", "chooseLoopAdvance", "confirmLoopReady", "enterOutsideChaos"]) {
      bridge2.install(name, () => void 0, { queue: true });
    }
  }
  function gemLevel(deps, name, isSupport) {
    try {
      const state2 = deps.game;
      const store = state2 && (isSupport ? state2.supportGemData : state2.gemData) || {};
      return Math.max(1, Math.floor(store[name] && store[name].level || 1));
    } catch (error) {
      deps.logger.error("gem presentation fallback state read failed:", error);
      return 1;
    }
  }
  function gemPresentation(deps, name, isSupport) {
    const catalog = isSupport ? deps.supports : deps.skills;
    const db = catalog && catalog[name] || {}, level = gemLevel(deps, name, isSupport);
    if (isSupport) return supportGemPresentation(db, name, level);
    const displayedLevel = db.isGem || db.levelable ? level : 0;
    return {
      baseLevel: displayedLevel,
      totalLevel: displayedLevel,
      finalLevel: displayedLevel,
      desc: db.desc || "",
      statName: name,
      skill: db,
      tags: deps.getSkillTagList(db)
    };
  }
  function supportGemPresentation(db, name, level) {
    return {
      baseLevel: level,
      totalLevel: level,
      value: Number(db.baseVal || 0),
      desc: db.desc || "",
      statName: db.name || name,
      statId: db.stat || null,
      activeTier: 1
    };
  }

  // modules/browser/runtime-events.mjs
  function dispatchBrowserRuntimeEvent(target, state2, name, detail = {}) {
    if (state2 && state2.isBackgroundCalculation) return false;
    if (!target || typeof target.dispatchEvent !== "function" || typeof target.CustomEvent !== "function") return false;
    target.dispatchEvent(new target.CustomEvent(`project-idle:${name}`, { detail }));
    return detail.handled === true;
  }

  // modules/common/numbers.mjs
  function normalizeUiSkin() {
    return "rift";
  }
  function normalizeUiScale(value) {
    const number = Number(value);
    return [80, 90, 100, 110, 125, 150, 175, 200, 225, 250].includes(number) ? number : 100;
  }
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function pixelFontSize(size, base) {
    return base * Math.max(1, Math.round(size / base));
  }
  function lerpNumber(start, end, t) {
    return start + (end - start) * t;
  }
  function approachNumber(current, target, rate, dt) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    let blend = 1 - Math.exp(-Math.max(0, rate || 0) * Math.max(0, dt || 0));
    return current + (target - current) * blend;
  }
  function rndChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  function hashSeed(value) {
    let str = String(value);
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function createSeededRng(seedValue) {
    let state2 = hashSeed(seedValue) || 1;
    return function() {
      state2 += 1831565813;
      let t = state2;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function getAdditiveDropBonusMultiplier(codexBonusPct, challengeBonusPct) {
    let codexRatio = Math.max(0, Number(codexBonusPct) || 0) / 100;
    let challengeRatio = Math.max(0, Number(challengeBonusPct) || 0) / 100;
    return 1 + codexRatio + challengeRatio;
  }

  // modules/common/formatting.mjs
  function getExceptionalBaseStarCount(item) {
    return (item && item.baseStats || []).filter((stat) => stat && stat.exceptional).length;
  }
  function getExceptionalBaseStars(item) {
    return "✦".repeat(getExceptionalBaseStarCount(item));
  }
  function getExceptionalBaseStarsHtml(item) {
    let stars = getExceptionalBaseStars(item);
    return stars ? ` <span style="color:#ffb454; font-weight:700;">${stars}</span>` : "";
  }
  var COMPARE_STAT_META = {
    dps: { label: "DPS", format: (value) => `${Math.floor(value)}` },
    summonDps: { label: "소환 DPS", format: (value) => `${Math.floor(value)}` },
    baseDmg: { label: "공격력", format: (value) => `${Math.floor(value)}` },
    aspd: { label: "공속", format: (value) => value.toFixed(2) },
    crit: { label: "치명타", format: (value) => `${value.toFixed(1)}%` },
    critDmg: { label: "치명타 피해", format: (value) => `${Math.floor(value)}%` },
    maxHp: { label: "최대 생명력", format: (value) => `${Math.floor(value)}` },
    armor: { label: "방어도", format: (value) => `${Math.floor(value)}` },
    armorReduction: { label: "방어도 피해 감소", format: (value) => `${value.toFixed(1)}%` },
    evasion: { label: "회피", format: (value) => `${Math.floor(value)}` },
    evadeChance: { label: "회피 확률", format: (value) => `${value.toFixed(1)}%` },
    energyShield: { label: "에너지 보호막", format: (value) => `${Math.floor(value)}` },
    energyShieldRegenRate: { label: "에너지 보호막 재생", format: (value) => `${value.toFixed(1)}%` },
    deflectChance: { label: "비껴내기 확률", format: (value) => `${value.toFixed(1)}%` },
    deflectDamageReduce: { label: "비껴내기 피해 감소", format: (value) => `${value.toFixed(1)}%` },
    blockChance: { label: "막기 확률", format: (value) => `${value.toFixed(1)}%` },
    blockChanceMax: { label: "막기 확률 상한", format: (value) => `${value.toFixed(1)}%` },
    moveSpeed: { label: "이동 속도", format: (value) => `${Math.floor(value)}%` },
    dr: { label: "물피감", format: (value) => `${Math.floor(value)}%` },
    physIgnore: { label: "물피감 무시", format: (value) => `${Math.floor(value)}%` },
    resPen: { label: "저항 관통", format: (value) => `${Math.floor(value)}%` },
    resF: { label: "화염 저항", format: (value) => `${Math.floor(value)}%` },
    resC: { label: "냉기 저항", format: (value) => `${Math.floor(value)}%` },
    resL: { label: "번개 저항", format: (value) => `${Math.floor(value)}%` },
    resChaos: { label: "카오스 저항", format: (value) => `${Math.floor(value)}%` },
    regen: { label: "초당 재생", format: (value) => `${formatValue("regen", value)}%` },
    leech: { label: "공격 피해 흡수", format: (value) => `${formatValue("leech", value)}%` },
    spellLeech: { label: "주문 피해 흡수", format: (value) => `${formatValue("spellLeech", value)}%` },
    leechRateCap: { label: "흡혈 회복 속도", format: (value) => `+${formatValue("leechRateCap", value)}%p` },
    leechTotalCap: { label: "흡혈 총 회복량", format: (value) => `+${formatValue("leechTotalCap", value)}%p` },
    leechInstanceCap: { label: "흡혈 관통당 회복량", format: (value) => `+${formatValue("leechInstanceCap", value)}%p` },
    ds: { label: "연속 타격", format: (value) => `${Math.floor(value)}%` },
    gemLv: { label: "룬 레벨", format: (value) => `${Math.floor(value)}` },
    suppCap: { label: "보조 한도", format: (value) => `${Math.floor(value)}` },
    minDmgRoll: { label: "최소피해 보정", format: (value) => `${Math.floor(value)}%` },
    maxDmgRoll: { label: "최대피해 보정", format: (value) => `${Math.floor(value)}%` }
  };
  function formatSupportGemEffectValue(value) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    return num.toFixed(1);
  }
  var TENTH_STAT_IDS = /* @__PURE__ */ Object.freeze(["leech", "spellLeech", "regen", "regenSuppress", "leechRateCap", "leechTotalCap", "leechInstanceCap"]);
  function isTenthStat(statId) {
    return TENTH_STAT_IDS.includes(statId);
  }
  var WHOLE_ROLL_STAT_IDS = /* @__PURE__ */ Object.freeze(["armor", "evasion", "energyShield", "armorPct", "evasionPct", "energyShieldPct", "weaponFlatDmgPct"]);
  function formatValue(statId, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    if (isTenthStat(statId)) {
      return numeric.toFixed(2).replace(/0$/, "");
    }
    const rounded = Math.round(numeric * 100) / 100;
    return Number.isInteger(rounded) ? rounded : String(rounded);
  }
  function formatSignedValue(statId, value) {
    return `${Number(value) < 0 ? "" : "+"}${formatValue(statId, value)}`;
  }
  function formatPercentMultiplier(value) {
    return `${Math.round(value * 100)}%`;
  }
  function getRarityColor(rarity) {
    if (rarity === "unique") return "#ff9f43";
    if (rarity === "rare") return "#f1c40f";
    if (rarity === "magic") return "#3498db";
    return "#d0d5da";
  }
  function getRarityRank(rarity) {
    if (rarity === "normal") return 0;
    if (rarity === "magic") return 1;
    if (rarity === "rare") return 2;
    if (rarity === "unique") return 3;
    return 99;
  }

  // modules/common/text.mjs
  function dedupeList(values) {
    return Array.from(new Set(Array.isArray(values) ? values.filter(Boolean) : []));
  }
  function getLastBatchim(word) {
    const text2 = String(word || "").replace(/[\s)\]}」』'"]+$/u, "");
    const last = text2.charAt(text2.length - 1);
    if (last >= "0" && last <= "9") return KOREAN_DIGIT_BATCHIM[Number(last)];
    const code = text2.charCodeAt(text2.length - 1) - 44032;
    return code >= 0 && code < 11172 ? code % 28 : -1;
  }
  var KOREAN_DIGIT_BATCHIM = /* @__PURE__ */ Object.freeze([21, 8, 0, 16, 0, 0, 1, 8, 8, 0]);
  function pickParticle(word, afterConsonant, afterVowel, language = "ko") {
    if (language !== "ko") return "";
    const batchim = getLastBatchim(word);
    if (batchim < 0) return `${afterConsonant}(${afterVowel})`;
    return batchim ? afterConsonant : afterVowel;
  }
  function withDirectionParticle(word, language = "ko") {
    if (language !== "ko") return String(word || "");
    const batchim = getLastBatchim(word);
    return String(word || "") + (batchim < 0 ? "(으)로" : batchim === 0 || batchim === 8 ? "로" : "으로");
  }
  function withObjectParticle(word, language = "ko") {
    return String(word || "") + pickParticle(word, "을", "를", language);
  }
  function withSubjectParticle(word, language = "ko") {
    return String(word || "") + pickParticle(word, "이", "가", language);
  }
  function speakerShortName(speaker) {
    return String(speaker || "").split(" (")[0].split(/[\s,]+/).pop();
  }
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function stripDecorativeEmoji(value) {
    return String(value == null ? "" : value).replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F000}-\u{1FAFF}\uFE0F\u200D]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // modules/common/stat-bucket.mjs
  var TAGGED_DAMAGE_STAT_BY_TAG = {
    attack: "attackPctDmg",
    melee: "meleePctDmg",
    projectile: "projectilePctDmg",
    physical: "physPctDmg",
    elemental: "elementalPctDmg",
    fire: "firePctDmg",
    cold: "coldPctDmg",
    lightning: "lightPctDmg",
    chaos: "chaosPctDmg",
    aoe: "aoePctDmg",
    slam: "slamPctDmg",
    spell: "spellPctDmg",
    shield: "shieldPctDmg",
    mine: "minePctDmg",
    potion: "potionPctDmg",
    mobility: "mobilityPctDmg",
    channeling: "channelingPctDmg"
  };
  var STAT_BUCKET_DEFAULTS = {
    flatDmg: 0,
    weaponFlatDmgPct: 0,
    pctDmg: 0,
    flatHp: 0,
    pctHp: 0,
    aspd: 0,
    crit: 0,
    move: 0,
    cooldownRecovery: 0,
    cooldownReduction: 0,
    mobilityCooldownRecovery: 0,
    mobilityCooldownReduction: 0,
    cooldownReductionCapBonus: 0,
    sight: 0,
    sightCap: 0,
    chestGrade: 0,
    gemLevel: 0,
    elementalGemLevel: 0,
    fireGemLevel: 0,
    coldGemLevel: 0,
    lightGemLevel: 0,
    chaosGemLevel: 0,
    physGemLevel: 0,
    projectileGemLevel: 0,
    meleeGemLevel: 0,
    slamGemLevel: 0,
    spellGemLevel: 0,
    dotGemLevel: 0,
    aoeGemLevel: 0,
    strGemLevel: 0,
    dexGemLevel: 0,
    intGemLevel: 0,
    suppCap: 0,
    runeResonancePower: 0,
    regenFlat: 0,
    dr: 0,
    physIgnore: 0,
    resPen: 0,
    resF: 0,
    resC: 0,
    resL: 0,
    maxResAll: 0,
    maxResF: 0,
    maxResC: 0,
    maxResL: 0,
    maxResChaos: 0,
    resChaos: 0,
    leech: 0,
    leechRateCap: 0,
    leechTotalCap: 0,
    leechInstanceCap: 0,
    leechKeepFullLife: 0,
    critDmg: 0,
    regen: 0,
    regenSuppress: 0,
    ds: 0,
    expGain: 0,
    minDmgRoll: 0,
    maxDmgRoll: 0,
    slamEchoChance: 0,
    slamEchoDamagePct: 0,
    doubleDamageChance: 0,
    blockChanceMax: 0,
    physFlatTakenReduce: 0,
    fireFlatTakenReduce: 0,
    coldFlatTakenReduce: 0,
    lightFlatTakenReduce: 0,
    chaosFlatTakenReduce: 0,
    allFlatTakenReduce: 0,
    physTakenAsFire: 0,
    physTakenAsCold: 0,
    physTakenAsLight: 0,
    physTakenAsChaos: 0,
    addedFireDamagePct: 0,
    addedColdDamagePct: 0,
    addedLightDamagePct: 0,
    addedChaosDamagePct: 0,
    addedPhysDamagePct: 0,
    fireFlatDmg: 0,
    coldFlatDmg: 0,
    lightFlatDmg: 0,
    chaosFlatDmg: 0,
    physFlatDmg: 0,
    meleePctDmg: 0,
    slamPctDmg: 0,
    projectilePctDmg: 0,
    physPctDmg: 0,
    elementalPctDmg: 0,
    firePctDmg: 0,
    coldPctDmg: 0,
    lightPctDmg: 0,
    chaosPctDmg: 0,
    aoePctDmg: 0,
    dotPctDmg: 0,
    spellPctDmg: 0,
    shieldPctDmg: 0,
    minePctDmg: 0,
    potionPctDmg: 0,
    mobilityPctDmg: 0,
    channelingPctDmg: 0,
    igniteChance: 0,
    chillChance: 0,
    freezeChance: 0,
    shockChance: 0,
    poisonChance: 0,
    bleedChance: 0,
    spellFlatDmg: 0,
    spellFlatPct: 0,
    targetAny: 0,
    targetProjectile: 0,
    targetSlam: 0,
    projectileExtraShots: 0,
    projectileExtraChance: 0,
    projectileChain: 0,
    igniteDurationPct: 0,
    chillDurationPct: 0,
    freezeDurationPct: 0,
    shockDurationPct: 0,
    poisonDurationPct: 0,
    bleedDurationPct: 0,
    skillDelayReduce: 0,
    attackPctDmg: 0,
    spellLeech: 0,
    spellCritDmg: 0,
    spellRepeatChance: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    accuracy: 0,
    mystique: 0,
    devotion: 0,
    cycle: 0,
    ailmentDamagePct: 0,
    ailmentPotencyPct: 0,
    armor: 0,
    evasion: 0,
    energyShield: 0,
    armorPct: 0,
    evasionPct: 0,
    energyShieldPct: 0,
    energyShieldRegen: 0,
    energyShieldRechargeFaster: 0,
    deflectChance: 0,
    deflectDamageReduce: 0,
    blockChance: 0,
    blockChancePct: 0,
    ailResIgnite: 0,
    ailResShock: 0,
    ailResFreeze: 0,
    ailResPoison: 0,
    ailResBleed: 0,
    chillEffectReducePct: 0,
    freezeDurationReducePct: 0,
    shockEffectReducePct: 0,
    igniteDamageReducePct: 0,
    bleedDamageReducePct: 0,
    poisonDamageReducePct: 0,
    dotTakenDamageReducePct: 0,
    takenDamageReduceWhen2EnemiesPct: 0,
    takenDamageReduceWhen1EnemyPct: 0,
    genericTakenDamageReducePct: 0,
    critTakenDamageReducePct: 0,
    igniteTakenDurationReducePct: 0,
    shockTakenDurationReducePct: 0,
    coldTakenDurationReducePct: 0,
    poisonTakenDurationReducePct: 0,
    bleedTakenDurationReducePct: 0,
    shockedEnemyHitDamageMorePct: 0,
    shockedEnemyHitDamagePct: 0,
    igniteDamageMultiplierPct: 0,
    poisonDamageMultiplierPct: 0,
    accuracyBonusPct: 0,
    chillEffect: 0,
    shockEffect: 0,
    summonFlatDmg: 0,
    summonPctDmg: 0,
    summonAspd: 0,
    summonHpPct: 0,
    summonCrit: 0,
    summonCritDmg: 0,
    summonCap: 0,
    summonEfficiency: 0,
    summonGuardRedirectPct: 0,
    summonResPen: 0,
    summonGemLevel: 0,
    curseCap: 0,
    oxygenMax: 0,
    oxygenRegen: 0,
    oceanPressureResist: 0,
    oceanDepthGainPct: 0,
    oceanRareFishChancePct: 0,
    bossDamagePct: 0,
    eliteDamagePct: 0,
    firstStrikeDamagePct: 0,
    cullStrikePct: 0,
    echoPower: 0,
    chaosErosion: 0,
    chaosErosionCap: 0,
    // 우주계 보스 유물석과 보스 부적의 줄(js/combat.js가 reward에서 읽는다): 통에 없어 addStatToBucket이 버렸다(2026-10-20).
    firstHitDamageMorePct: 0,
    cosmosAlwaysFirstHitChancePct: 0,
    uniqueInstantLeechPct: 0,
    cosmosLightningVariance: 0,
    cosmosBossDamageMorePct: 0,
    regionPoisonSpread: 0,
    regionChaosShred: 0,
    regionPoisonedLeech: 0,
    regionChaosOvercap: 0,
    regionBlockEmpower: 0,
    regionArmorToPhys: 0,
    regionBleedingDamage: 0,
    regionLowLifeDR: 0,
    regionShockChain: 0,
    regionCritMove: 0,
    regionShockSpread: 0,
    regionShockedLightPen: 0,
    regionIgniteSpread: 0,
    regionFullLifeFire: 0,
    regionIgniteDuration: 0,
    regionIgnitedDamage: 0,
    regionFrozenCritDamage: 0,
    regionShatter: 0,
    regionChillOnHit: 0,
    regionChilledAttackerDR: 0
  };
  function createEmptyStatBucket() {
    return { ...STAT_BUCKET_DEFAULTS };
  }
  var DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket()).filter((key) => key !== "oxygenMax" && key !== "oxygenRegen"));
  var COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [["resF", 1, 0], ["resC", 1, 0], ["resL", 1, 0]],
    moveEvasion: [["move", 1, 0], ["evasionPct", 1, 0]],
    hpArmor: [["flatHp", 1, 0], ["armor", 2, 0]],
    aspdMove: [["aspd", 1, 0], ["move", 1, 0]],
    chaosResElemPenalty: [["resChaos", 1, 0], ["resF", -1, 0], ["resC", -1, 0], ["resL", -1, 0]],
    deflectMajor: [["deflectChance", 1, 0], ["deflectDamageReduce", 0, 3]],
    targetCount: [["targetAny", 1, 0]]
  });
  function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== "string" || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) {
      bucket[statId] += value;
      return;
    }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
      bucket[key] += value * multiplier + flat;
    }
  }
  function addPassiveLineToBucket(bucket, statId, value, stance, weaponConditions) {
    const weaponLine = weaponConditions[statId];
    if (!weaponLine) addStatToBucket(bucket, statId, value);
    else if (weaponLine.stance === stance) addStatToBucket(bucket, weaponLine.stat, value);
  }
  function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach((stat) => {
      if (!stat) return;
      addStatToBucket(bucket, stat.id, stat.val);
      if (Array.isArray(stat.extraStats)) stat.extraStats.forEach((extra) => {
        if (extra) addStatToBucket(bucket, extra.id, extra.val);
      });
    });
  }
  function getTaggedDamageBreakdown(bucket, skill) {
    let tags = new Set(skill.tags || []);
    let randomElementPool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool.map((ele) => {
      let key = String(ele || "").toLowerCase();
      return key === "lightning" || key === "thunder" ? "light" : key;
    }).filter(Boolean) : [];
    let isRandomElementSkill = randomElementPool.length > 0;
    let parts = [];
    let total = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach((tag) => {
      if (isRandomElementSkill && ["fire", "cold", "lightning"].includes(tag)) return;
      let statId = TAGGED_DAMAGE_STAT_BY_TAG[tag];
      let value = bucket[statId] || 0;
      if (!value || !tags.has(tag)) return;
      total += value;
      parts.push({ tag, statId, value });
    });
    return { total, parts };
  }

  // modules/common/stat-labels.mjs
  var SKILL_TAG_LABELS = {
    attack: "공격",
    melee: "근접",
    projectile: "투사체",
    physical: "물리",
    elemental: "원소",
    fire: "화염",
    cold: "냉기",
    lightning: "번개",
    light: "번개",
    chaos: "카오스",
    aoe: "범위",
    single: "단일",
    pierce: "관통",
    dot: "지속",
    spell: "주문",
    slam: "강타",
    chain: "연쇄",
    summon: "소환수",
    summon_attack: "공격형 소환수",
    summon_guard: "방어형 소환수",
    summon_buff: "버프형 소환수",
    shield: "완갑",
    mine: "지뢰",
    potion: "포션",
    mobility: "기동",
    channeling: "채널링",
    curse: "저주",
    warcry: "함성",
    shout: "함성",
    dagger: "한손검",
    duration: "지속시간",
    debuff: "약화",
    guard: "수호",
    utility: "기능",
    strength: "힘",
    dexterity: "민첩",
    intelligence: "지능"
  };
  var BASE_STAT_DISPLAY_NAMES = {
    bossDamagePct: "보스 처치 피해(%)",
    eliteDamagePct: "정예 처치 피해(%)",
    firstStrikeDamagePct: "선제 타격 피해(%)",
    // 세계수 기운(12번 루프 27): 지역 전용 줄(data/region-affixes.js).
    regionPoisonSpread: "중독된 적 처치 시 주변에 중독 번짐(%)",
    regionChaosShred: "적중 시 적 카오스 저항 감소(%, 5중첩)",
    regionPoisonedLeech: "중독된 적에게 준 피해 생명력 흡수(%)",
    regionChaosOvercap: "초과 카오스 저항 1%마다 카오스 피해(%)",
    regionBlockEmpower: "막기 후 다음 공격 피해 증가(%)",
    regionArmorToPhys: "방어도 1000마다 물리 피해(%)",
    regionBleedingDamage: "출혈 중인 적에게 주는 피해 증가(%)",
    regionLowLifeDR: "생명력 절반 이하일 때 받는 피해 감소(%)",
    regionShockChain: "감전된 적 적중 시 번개 튐 확률(%)",
    regionCritMove: "치명타 후 2초간 이동 속도(%)",
    regionShockSpread: "감전된 적 처치 시 주변에 감전 번짐(%)",
    regionShockedLightPen: "감전된 적의 번개 저항 무시(%)",
    regionIgniteSpread: "점화된 적 처치 시 주변에 점화 번짐(%)",
    regionFullLifeFire: "생명력이 가득할 때 화염 피해(%)",
    regionIgniteDuration: "점화 지속 시간(%)",
    regionIgnitedDamage: "점화된 적에게 주는 피해 증가(%)",
    regionFrozenCritDamage: "동결된 적에게 치명타 피해 증가(%)",
    regionShatter: "동결된 적 처치 시 얼음 파편(적 최대 생명력 %)",
    regionChillOnHit: "적중 시 냉각 확률(%)",
    regionChilledAttackerDR: "냉각된 적에게 받는 피해 감소(%)",
    cullStrikePct: "처형 일격(생명력 % 이하 즉사)",
    oceanPressureResist: "심해 수압 내성(%)",
    oceanDepthGainPct: "심해 수심 전진 속도(%)",
    oceanRareFishChancePct: "심해 초희귀 어종 확률(%)",
    flatHp: "최대 생명력",
    pctHp: "생명력 증가(%)",
    regen: "초당 생명력 재생(%)",
    regenFlat: "초당 생명력 재생(고정)",
    flatDmg: "기본 피해",
    weaponFlatDmgPct: "무기의 기본 피해 증가(%)",
    pctDmg: "피해 증가(%)",
    meleePctDmg: "근접 피해(%)",
    slamPctDmg: "강타 피해(%)",
    projectilePctDmg: "투사체 피해(%)",
    projectileExtraShots: "투사체 추가 발사",
    firstHitDamageMorePct: "첫 공격 피해 증폭(%)",
    projectileExtraChance: "투사체 추가 발사 확률(%)",
    projectileChain: "투사체 연쇄",
    voidLinkEfficiency: "연결된 공허 소켓의 효율(%)",
    igniteDurationPct: "점화 지속시간(%)",
    chillDurationPct: "냉각 지속시간(%)",
    freezeDurationPct: "동결 지속시간(%)",
    shockDurationPct: "감전 지속시간(%)",
    poisonDurationPct: "중독 지속시간(%)",
    bleedDurationPct: "출혈 지속시간(%)",
    skillDelayReduce: "스킬 딜레이 감소(%)",
    cooldownReductionCapBonus: "재사용 대기시간 감소 한도(%)",
    attackPctDmg: "공격 피해 증가(%)",
    spellFlatDmg: "주문 내장 피해",
    spellFlatPct: "주문 내장 피해 증가(%)",
    spellPctDmg: "주문 피해(%)",
    spellRepeatChance: "연속 주문 확률(%)",
    shieldPctDmg: "완갑 착용 근접 피해(%)",
    minePctDmg: "지뢰 피해(%)",
    potionPctDmg: "포션 투척 피해(%)",
    mobilityPctDmg: "기동 스킬 피해(%)",
    channelingPctDmg: "채널링 피해(%)",
    physPctDmg: "물리 피해(%)",
    elementalPctDmg: "원소 피해(%)",
    firePctDmg: "화염 피해(%)",
    coldPctDmg: "냉기 피해(%)",
    lightPctDmg: "번개 피해(%)",
    chaosPctDmg: "카오스 피해(%)",
    aoePctDmg: "범위 피해(%)",
    dotPctDmg: "지속 피해 배율(%)",
    igniteChance: "점화 확률(%)",
    chillChance: "냉각 확률(%)",
    freezeChance: "동결 확률(%)",
    shockChance: "감전 확률(%)",
    poisonChance: "중독 확률(%)",
    bleedChance: "출혈 확률(%)",
    aspd: "공격 속도(%)",
    move: "이동 속도(%)",
    sight: "시야(칸)",
    sightCap: "시야 상한(칸)",
    chestGrade: "보급 상자 등급 확률(%)",
    // 재사용 대기시간(2026-10-21, js/skills.js getSkillCooldownMs): 이동 스킬 줄은 이동 룬에만, 나머지 둘은 대기시간이 있는 모든 스킬에.
    cooldownRecovery: "재사용 대기시간 회복 속도(%)",
    cooldownReduction: "재사용 대기시간 감소(%)",
    mobilityCooldownRecovery: "이동 스킬 재사용 대기시간 회복 속도(%)",
    mobilityCooldownReduction: "이동 스킬 재사용 대기시간 감소(%)",
    crit: "치명타 확률(%)",
    critDmg: "치명타 피해(%)",
    leech: "공격 피해의 생명력 흡수(%)",
    leechRateCap: "흡혈 회복 속도 캡(최대 생명력 %/초)",
    leechTotalCap: "흡혈 총 회복량 캡(최대 생명력 %)",
    leechInstanceCap: "흡혈 관통당 회복량 캡(최대 생명력 %)",
    gemLevel: "모든 스킬룬 레벨",
    elementalGemLevel: "원소 스킬룬 레벨",
    fireGemLevel: "화염 스킬룬 레벨",
    coldGemLevel: "냉기 스킬룬 레벨",
    lightGemLevel: "번개 스킬룬 레벨",
    chaosGemLevel: "카오스 스킬룬 레벨",
    physGemLevel: "물리 스킬룬 레벨",
    projectileGemLevel: "투사체 스킬룬 레벨",
    meleeGemLevel: "근접 스킬룬 레벨",
    slamGemLevel: "강타 스킬룬 레벨",
    spellGemLevel: "주문 스킬룬 레벨",
    dotGemLevel: "지속 스킬룬 레벨",
    aoeGemLevel: "범위 스킬룬 레벨",
    summonGemLevel: "소환수 공격 스킬룬 레벨",
    strGemLevel: "힘 스킬룬 레벨",
    dexGemLevel: "민첩 스킬룬 레벨",
    intGemLevel: "지능 스킬룬 레벨",
    runeResonancePower: "공명력",
    critTakenDamageReducePct: "받는 치명타 피해 감소(%)",
    igniteTakenDurationReducePct: "점화 지속 시간 감소(%)",
    shockTakenDurationReducePct: "감전 지속 시간 감소(%)",
    coldTakenDurationReducePct: "냉기 지속 시간 감소(%)",
    poisonTakenDurationReducePct: "중독 지속 시간 감소(%)",
    bleedTakenDurationReducePct: "출혈 지속 시간 감소(%)",
    dr: "물리 피해 감소(%)",
    physIgnore: "물리 피해 감소 무시(%)",
    ds: "연속 타격(%)",
    suppCap: "보조스킬룬 한도",
    minDmgRoll: "최소 피해 보정(%)",
    maxDmgRoll: "최대 피해 보정(%)",
    resPen: "저항 관통(%)",
    resF: "화염 저항(%)",
    resC: "냉기 저항(%)",
    resL: "번개 저항(%)",
    maxResF: "최대 화염 저항(%)",
    maxResC: "최대 냉기 저항(%)",
    maxResL: "최대 번개 저항(%)",
    maxResChaos: "최대 카오스 저항(%)",
    maxResAll: "모든 원소 최대 저항(%)",
    resAll: "모든 원소 저항(%)",
    resChaos: "카오스 저항(%)",
    regenSuppress: "재생 억제(%)",
    targetAny: "스킬 타겟 수",
    targetProjectile: "투사체 스킬 타겟 수",
    targetSlam: "강타 스킬 타겟 수",
    armor: "방어도",
    evasion: "회피",
    energyShield: "에너지 보호막",
    armorPct: "방어도(%)",
    evasionPct: "회피(%)",
    deflectChance: "비껴내기 확률(%)",
    deflectDamageReduce: "비껴내기 피해 감소(%)",
    corpseExplodeChance: "시체폭발 확률(%)",
    corpseExplodeLifePct: "시체폭발 피해(처치한 적 최대 생명력 %)",
    resonancePower: "공명력",
    ailResIgnite: "점화 저항 확률(%)",
    ailResShock: "감전 저항 확률(%)",
    ailResFreeze: "냉기 저항 확률(%)",
    ailResPoison: "중독 저항 확률(%)",
    ailResBleed: "출혈 저항 확률(%)",
    energyShieldPct: "에너지 보호막(%)",
    energyShieldRegen: "에너지 보호막 재생률(%)",
    energyShieldRechargeFaster: "보호막 재생 준비시간 감소(초)",
    targetCount: "스킬 타겟 수",
    spellCritDmg: "주문 치명타 피해 배율(%)",
    spellLeech: "주문 피해의 생명력 흡수(%)",
    shockEffectReducePct: "감전 효과 감소(%)",
    dotTakenDamageReducePct: "받는 지속 피해 감소(%)",
    genericTakenDamageReducePct: "받는 피해 감소(%)",
    shockedEnemyHitDamageMorePct: "감전된 적 타격 피해 증폭(%)",
    shockedEnemyHitDamagePct: "감전된 적에게 주는 명중 피해 증가(%)",
    takenDamageReduceWhen2EnemiesPct: "적 2명 이상일 때 받는 피해 감소(%)",
    takenDamageReduceWhen1EnemyPct: "적 1명일 때 받는 피해 감소(%)",
    chillEffect: "냉각 효율(%)",
    shockEffect: "감전 효율(%)",
    igniteDamageMultiplierPct: "점화 효율(%)",
    physFlatTakenReduce: "받는 물리 피해 감소 flat",
    fireFlatTakenReduce: "받는 화염 피해 감소 flat",
    coldFlatTakenReduce: "받는 냉기 피해 감소 flat",
    lightFlatTakenReduce: "받는 번개 피해 감소 flat",
    chaosFlatTakenReduce: "받는 카오스 피해 감소 flat",
    allFlatTakenReduce: "받는 피해 감소 flat",
    physTakenAsFire: "받는 물리 피해의 일부를 화염 피해로 받음(%)",
    physTakenAsCold: "받는 물리 피해의 일부를 냉기 피해로 받음(%)",
    physTakenAsLight: "받는 물리 피해의 일부를 번개 피해로 받음(%)",
    physTakenAsChaos: "받는 물리 피해의 일부를 카오스 피해로 받음(%)",
    addedFireDamagePct: "총 피해의 일부만큼 화염 추가 피해(%)",
    addedColdDamagePct: "총 피해의 일부만큼 냉기 추가 피해(%)",
    addedLightDamagePct: "총 피해의 일부만큼 번개 추가 피해(%)",
    addedChaosDamagePct: "총 피해의 일부만큼 카오스 추가 피해(%)",
    addedPhysDamagePct: "총 피해의 일부만큼 물리 추가 피해(%)",
    fireFlatDmg: "화염 기본 피해",
    coldFlatDmg: "냉기 기본 피해",
    lightFlatDmg: "번개 기본 피해",
    chaosFlatDmg: "카오스 기본 피해",
    physFlatDmg: "물리 기본 피해",
    doubleDamageChance: "확률로 2배의 피해를 줌(%)",
    slamEchoDamagePct: "여진 피해량(%)"
  };
  function createStatDisplayNames(weaponConditions, stanceLabels) {
    const names = { ...BASE_STAT_DISPLAY_NAMES };
    Object.entries(weaponConditions).forEach(([id, line]) => {
      names[id] = `${stanceLabels[line.stance]} 사용 시 ${names[line.stat].replace(" 증가", "")}`;
    });
    return names;
  }

  // modules/common/support-gems.mjs
  function isTierlessSupportGem(name, database) {
    let db = typeof database !== "undefined" && database ? database[name] : null;
    return !!(db && db.noTiers);
  }
  function getSupportTierCap(name, database) {
    return isTierlessSupportGem(name, database) ? 1 : 3;
  }
  function getSupportResonanceCost(name, database) {
    let db = database[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || "";
    if (["flatDmg", "critDmg", "resPen", "physIgnore", "ds"].includes(stat)) return 3;
    if (["aspd", "crit", "dotPctDmg", "elementalPctDmg", "meleePctDmg", "projectilePctDmg"].includes(stat)) return 2;
    return 1;
  }
  function getSupportResonanceCostAtTier(name, tier, database) {
    const base = getSupportResonanceCost(name, database), db = database[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[tier - 1])) return Math.max(1, Math.floor(db.resonanceCosts[tier - 1]));
    if (tier <= 1) return base;
    if (tier === 2) return Math.max(base + 2, Math.floor(base * 2.4));
    return Math.max(base + 5, Math.floor(base * 3.8));
  }
  function getSupportTierLabel(name, tier, database) {
    if (isTierlessSupportGem(name, database)) return "통합";
    return tier === 3 ? "상급" : tier === 2 ? "중급" : "하급";
  }
  function getSupportTierMultiplier(name, tier, database) {
    let db = typeof database !== "undefined" && database ? database[name] || {} : {};
    if (isTierlessSupportGem(name, database)) return Number.isFinite(Number(db.tierMul)) ? Number(db.tierMul) : 1;
    tier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
    return tier === 1 ? 1 : tier === 2 ? 1.55 : 2.2;
  }
  function getOwnedSkillGemNames(state2) {
    let source = state2 || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.skills) ? source.skills : [],
      Array.isArray(source.sealedSkills) ? source.sealedSkills : []
    ).filter((name) => !!name)));
  }
  function getOwnedSupportGemNames(state2) {
    let source = state2 || {};
    return Array.from(new Set([].concat(
      Array.isArray(source.supports) ? source.supports : [],
      Array.isArray(source.sealedSupports) ? source.sealedSupports : []
    ).filter((name) => !!name)));
  }
  function hasSkillGemOwned(name, state2) {
    return !!name && getOwnedSkillGemNames(state2).includes(name);
  }
  function hasSupportGemOwned(name, state2) {
    return !!name && getOwnedSupportGemNames(state2).includes(name);
  }

  // modules/common/dom-controls.mjs
  function writeHtmlIfChanged(node, html) {
    if (!node || node.__lastHtml === html) return false;
    node.innerHTML = node.__lastHtml = html;
    return true;
  }
  var TEXT_ENTRY_INPUT_TYPES = Object.freeze(/* @__PURE__ */ new Set(["text", "search", "email", "password", "tel", "url", "number", "date", "datetime-local", "month", "time", "week"]));
  function isTextEntryElement(target, ElementClass) {
    if (!(target instanceof ElementClass)) return false;
    if (target.closest('textarea,[contenteditable="true"]')) return true;
    const input = target.closest("input");
    return !!input && TEXT_ENTRY_INPUT_TYPES.has(input.type);
  }

  // modules/utils-classic.mjs
  installLegacyPolyfills({
    NodeList: typeof NodeList === "undefined" ? void 0 : NodeList,
    HTMLCollection: typeof HTMLCollection === "undefined" ? void 0 : HTMLCollection
  });
  var bridge = new LegacyGlobalBridge(window, console);
  var safeExposeGlobals = bridge.safeExposeGlobals;
  var exposeFileGlobals = bridge.exposeFileGlobals;
  bridge.installPublicApi(globalThis);
  var STAT_DISPLAY_NAMES = createStatDisplayNames(WEAPON_CONDITION_STATS, SKILL_RUNE_STANCE_LABELS);
  var isTextEntryTarget = (target) => isTextEntryElement(target, Element);
  var pickParticle2 = (word, consonant, vowel) => pickParticle(word, consonant, vowel, typeof i18n === "object" ? i18n.language : "ko");
  var withDirectionParticle2 = (word) => withDirectionParticle(word, typeof i18n === "object" ? i18n.language : "ko");
  var withObjectParticle2 = (word) => withObjectParticle(word, typeof i18n === "object" ? i18n.language : "ko");
  var withSubjectParticle2 = (word) => withSubjectParticle(word, typeof i18n === "object" ? i18n.language : "ko");
  var addPassiveLineToBucket2 = (bucket, id, value, stance) => addPassiveLineToBucket(bucket, id, value, stance, WEAPON_CONDITION_STATS);
  var isTierlessSupportGem2 = (name) => isTierlessSupportGem(name, typeof SUPPORT_GEM_DB !== "undefined" ? SUPPORT_GEM_DB : void 0);
  var getSupportTierCap2 = (name) => getSupportTierCap(name, typeof SUPPORT_GEM_DB !== "undefined" ? SUPPORT_GEM_DB : void 0);
  var getSupportResonanceCost2 = (name) => getSupportResonanceCost(name, SUPPORT_GEM_DB);
  var getSupportResonanceCostAtTier2 = (name, tier) => getSupportResonanceCostAtTier(name, tier, SUPPORT_GEM_DB);
  var getSupportTierLabel2 = (name, tier) => getSupportTierLabel(name, tier, typeof SUPPORT_GEM_DB !== "undefined" ? SUPPORT_GEM_DB : void 0);
  var getSupportTierMultiplier2 = (name, tier) => getSupportTierMultiplier(name, tier, typeof SUPPORT_GEM_DB !== "undefined" ? SUPPORT_GEM_DB : void 0);
  var getOwnedSkillGemNames2 = (state2) => getOwnedSkillGemNames(state2 || (typeof game !== "undefined" ? game : {}));
  var getOwnedSupportGemNames2 = (state2) => getOwnedSupportGemNames(state2 || (typeof game !== "undefined" ? game : {}));
  var hasSkillGemOwned2 = (name, state2) => hasSkillGemOwned(name, state2 || (typeof game !== "undefined" ? game : {}));
  var hasSupportGemOwned2 = (name, state2) => hasSupportGemOwned(name, state2 || (typeof game !== "undefined" ? game : {}));
  var existingNames = {
    writeHtmlIfChanged,
    isTextEntryTarget,
    normalizeUiSkin,
    normalizeUiScale,
    clampNumber,
    pixelFontSize,
    lerpNumber,
    approachNumber,
    rndChoice,
    hashSeed,
    createSeededRng,
    getAdditiveDropBonusMultiplier,
    getExceptionalBaseStarCount,
    getExceptionalBaseStars,
    getExceptionalBaseStarsHtml,
    COMPARE_STAT_META,
    formatSupportGemEffectValue,
    TENTH_STAT_IDS,
    isTenthStat,
    WHOLE_ROLL_STAT_IDS,
    formatValue,
    formatSignedValue,
    formatPercentMultiplier,
    getRarityColor,
    getRarityRank,
    dedupeList,
    getLastBatchim,
    KOREAN_DIGIT_BATCHIM,
    speakerShortName,
    escapeHTML,
    stripDecorativeEmoji,
    pickParticle: pickParticle2,
    withDirectionParticle: withDirectionParticle2,
    withObjectParticle: withObjectParticle2,
    withSubjectParticle: withSubjectParticle2,
    TAGGED_DAMAGE_STAT_BY_TAG,
    createEmptyStatBucket,
    DIRECT_STAT_BUCKET_KEYS,
    COMPOSITE_STAT_BUCKET_LINES,
    addStatToBucket,
    applyStatsToBucket,
    getTaggedDamageBreakdown,
    addPassiveLineToBucket: addPassiveLineToBucket2,
    SKILL_TAG_LABELS,
    STAT_DISPLAY_NAMES,
    isTierlessSupportGem: isTierlessSupportGem2,
    getSupportTierCap: getSupportTierCap2,
    getSupportResonanceCost: getSupportResonanceCost2,
    getSupportResonanceCostAtTier: getSupportResonanceCostAtTier2,
    getSupportTierLabel: getSupportTierLabel2,
    getSupportTierMultiplier: getSupportTierMultiplier2,
    getOwnedSkillGemNames: getOwnedSkillGemNames2,
    getOwnedSupportGemNames: getOwnedSupportGemNames2,
    hasSkillGemOwned: hasSkillGemOwned2,
    hasSupportGemOwned: hasSupportGemOwned2
  };
  Object.assign(globalThis, existingNames);
  safeExposeGlobals(existingNames);
  var presetGame = Object.getOwnPropertyDescriptor(window, "game");
  var state = new GameRuntimeState(presetGame && "value" in presetGame ? presetGame.value : void 0, () => window.defaultGame);
  safeExposeGlobals({ GameState: state, GameModules: window.GameModules || {} });
  window.GameModules.state = state;
  window.GameModules.cloudAccountState = new CloudAccountState();
  var gameDescriptor = { configurable: true, get() {
    return state.game;
  }, set(value) {
    state.game = value;
  } };
  Object.defineProperty(window, "game", gameDescriptor);
  if (globalThis !== window) Object.defineProperty(globalThis, "game", gameDescriptor);
  safeExposeGlobals({ game: state.game });
  var inventory = new EquipmentInventoryCapacity({
    get game() {
      return state.game;
    },
    get CONTENT_UNLOCK_SERIES_VERSION() {
      return CONTENT_UNLOCK_SERIES_VERSION;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get EQUIPMENT_INVENTORY_MAX_PAGES() {
      return EQUIPMENT_INVENTORY_MAX_PAGES;
    },
    get EQUIPMENT_INVENTORY_CELLS_PER_PAGE() {
      return EQUIPMENT_INVENTORY_CELLS_PER_PAGE;
    },
    get getEquipmentInventoryFootprint() {
      return typeof getEquipmentInventoryFootprint === "undefined" ? void 0 : getEquipmentInventoryFootprint;
    },
    get equipmentInventoryGridRuntime() {
      return typeof equipmentInventoryGridRuntime === "undefined" ? void 0 : equipmentInventoryGridRuntime;
    }
  });
  var text = new StatText({
    skillTags: SKILL_TAG_LABELS,
    statNames: STAT_DISPLAY_NAMES,
    get stats() {
      return P_STATS;
    },
    get translate() {
      return _t;
    }
  });
  var passiveTree = new PassiveTreeRuntime();
  var treeAccessors = {
    PASSIVE_WORLD_SCALE: { configurable: true, get() {
      return passiveTree.worldScale;
    }, set(value) {
      passiveTree.worldScale = value;
    } },
    PASSIVE_BOUNDS: { configurable: true, get() {
      return passiveTree.bounds;
    }, set(value) {
      passiveTree.bounds = value;
    } },
    reachableNodes: { configurable: true, get() {
      return passiveTree.reachableNodes;
    }, set(value) {
      passiveTree.reachableNodes = value;
    } },
    discoveredPassiveNodes: { configurable: true, get() {
      return passiveTree.discoveredNodes;
    }, set(value) {
      passiveTree.discoveredNodes = value;
    } },
    previewPassiveNodes: { configurable: true, get() {
      return passiveTree.previewNodes;
    }, set(value) {
      passiveTree.previewNodes = value;
    } }
  };
  Object.defineProperties(window, treeAccessors);
  if (globalThis !== window) Object.defineProperties(globalThis, treeAccessors);
  var utilityNames = {
    safeExposeGlobals,
    exposeFileGlobals,
    MAX_PLAYER_LEVEL,
    snapCanvasRectToDevicePixels,
    drawCrispCanvasText,
    getEquipmentInventoryPageCount: inventory.getEquipmentInventoryPageCount,
    getInventoryLimit: inventory.getInventoryLimit,
    getInventoryUsedCellCount: inventory.getInventoryUsedCellCount,
    canStoreEquipmentItems: inventory.canStoreEquipmentItems,
    translateSkillTag: text.translateSkillTag,
    getSkillTagList: text.getSkillTagList,
    getStatName: text.getStatName,
    makeSourceLine: text.makeSourceLine,
    dispatchRuntimeEvent: (name, detail) => dispatchBrowserRuntimeEvent(window, state.game, name, detail),
    get PASSIVE_WORLD_SCALE() {
      return passiveTree.worldScale;
    },
    get PASSIVE_BOUNDS() {
      return passiveTree.bounds;
    },
    get reachableNodes() {
      return passiveTree.reachableNodes;
    },
    get discoveredPassiveNodes() {
      return passiveTree.discoveredNodes;
    },
    get previewPassiveNodes() {
      return passiveTree.previewNodes;
    }
  };
  safeExposeGlobals(utilityNames);
  if (globalThis !== window) Object.assign(globalThis, utilityNames);
  window.GameModules.passiveTree = passiveTree;
  window.GameModules.inventoryCapacity = inventory;
  installStartupFallbacks(bridge, {
    get game() {
      return state.game;
    },
    get supports() {
      return typeof SUPPORT_GEM_DB === "undefined" ? void 0 : SUPPORT_GEM_DB;
    },
    get skills() {
      return typeof SKILL_DB === "undefined" ? void 0 : SKILL_DB;
    },
    getSkillTagList: text.getSkillTagList,
    logger: console
  });
})();
