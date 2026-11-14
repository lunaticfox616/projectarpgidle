// GENERATED from modules/save*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/persistence/save-values.mjs
  var OUTDATED_BUILD_ERROR_CODE = "GAME_BUILD_OUTDATED";
  function normalizeCloudUploadProfile(profile) {
    if (!profile || typeof profile !== "object") return null;
    return {
      at: Math.max(0, Math.floor(Number(profile.at) || 0)),
      serializeMs: Math.max(0, Math.floor(Number(profile.serializeMs) || 0)),
      uploadMs: Math.max(0, Math.floor(Number(profile.uploadMs) || 0)),
      totalMs: Math.max(0, Math.floor(Number(profile.totalMs) || 0)),
      payloadBytes: Math.max(0, Math.floor(Number(profile.payloadBytes) || 0))
    };
  }
  function gameBuildTime(stamp) {
    const time = typeof stamp === "string" ? Date.parse(stamp) : NaN;
    return Number.isFinite(time) && time > 0 ? time : 0;
  }
  function outdatedBuildRefusal(message) {
    return Object.assign(new Error(message), { code: OUTDATED_BUILD_ERROR_CODE });
  }
  function cloudSavePrintSource(saveData) {
    const stall = saveData.playerStall && typeof saveData.playerStall === "object" ? { ...saveData.playerStall, lastAt: 0 } : saveData.playerStall;
    return { ...saveData, saveMeta: null, talentCardRuntime: void 0, playerStall: stall };
  }
  function printOfSaveText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${text.length}:${hash >>> 0}`;
  }
  function sortSaveKeys(key, value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map((name) => [name, value[name]]));
  }
  function sanitizeForSave(value, seen = /* @__PURE__ */ new WeakSet()) {
    if (value === null || value === void 0) return value;
    if (isUnsupportedSaveValue(value)) return void 0;
    if (typeof value !== "object") return sanitizeSavePrimitive(value);
    if (seen.has(value)) return void 0;
    seen.add(value);
    if (Array.isArray(value)) {
      let out2 = [];
      for (let i = 0; i < value.length; i++) {
        let v = sanitizeForSave(value[i], seen);
        out2.push(v === void 0 ? null : v);
      }
      return out2;
    }
    let out = {};
    Object.keys(value).forEach((key) => {
      let v = sanitizeForSave(value[key], seen);
      if (v !== void 0) out[key] = v;
    });
    return out;
  }
  function isUnsupportedSaveValue(value) {
    return typeof value === "function" || typeof value === "symbol";
  }
  function sanitizeSavePrimitive(value) {
    return Number.isFinite(value) ? value : typeof value === "number" ? 0 : value;
  }
  function formatCloudTime(value, locale) {
    if (!value) return "없음";
    let date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "없음";
    return date.toLocaleString(locale);
  }

  // modules/persistence/save-codec.mjs
  var RUNTIME_ONLY_SAVE_KEYS = Object.freeze(["talentCardRuntime", "lastCombatStats", "lastCombatStatsAt"]);
  var SaveCodec = class {
    constructor(owner2, deps) {
      this.owner = owner2;
      this.deps = deps;
    }
    dropRuntimeOnlySaveFields(target) {
      RUNTIME_ONLY_SAVE_KEYS.forEach((key) => delete target[key]);
    }
    createSaveSnapshot(sourceGame) {
      let snapshot = JSON.parse(JSON.stringify(this.deps.itemSaveSlim.slimTree(sourceGame || this.owner.game || {})));
      snapshot.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(snapshot.craftingWorkspace, snapshot.currencies);
      snapshot.actExploration = this.deps.actExplorationRooms.seal(snapshot.actExploration);
      this.dropRuntimeOnlySaveFields(snapshot);
      if (!snapshot.saveMeta || typeof snapshot.saveMeta !== "object") snapshot.saveMeta = {};
      return snapshot;
    }
    serializeSaveState(sourceGame) {
      let root = sourceGame || this.owner.game || {};
      let serializable = root && typeof root === "object" ? { ...root } : {};
      serializable.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(root.craftingWorkspace, root.currencies);
      serializable.actExploration = this.deps.actExplorationRooms.seal(root.actExploration);
      this.dropRuntimeOnlySaveFields(serializable);
      return JSON.stringify(this.deps.itemSaveSlim.slimTree(serializable));
    }
    createCloudSavePayload(sourceGame) {
      return this.createSaveSnapshot(this.createCloudSaveState(sourceGame || this.owner.game || {}));
    }
    createCloudSaveState(root) {
      if (root.actExploration) return { ...root, combatLog: [], battlefieldEnemySprites: {}, dotFxThrottle: {} };
      let payload = {
        ...root,
        saveMeta: root.saveMeta && typeof root.saveMeta === "object" ? root.saveMeta : {},
        enemies: [],
        encounterPlan: [],
        encounterIndex: Math.max(0, Math.floor(Number(root.encounterIndex) || 0)),
        nextEnemyId: Math.max(1, Math.floor(Number(root.nextEnemyId) || 1)),
        combatLog: [],
        recentDamageEvents: [],
        pendingSlamEchoHits: [],
        dotFxThrottle: {},
        battlefieldEnemySprites: {},
        enemyConditionDebuffs: {},
        enemyKeystoneDebuffs: {},
        rangerWeakpointMarks: {},
        enemyUniqueChaosResDown: {},
        enemyUniqueElementalResDown: {},
        playerAilments: Array.isArray(root.playerAilments) ? root.playerAilments.slice(0, 40) : [],
        playerLeechInstances: Array.isArray(root.playerLeechInstances) ? root.playerLeechInstances.slice(0, 80) : [],
        realmDeathWard: null,
        realmInvulnerableBarrierUntil: 0
      };
      this.dropRuntimeOnlySaveFields(payload);
      return payload;
    }
    /** The everyday cloud sync's save data, in the shape of the local save and the leaving upload (serializeSaveState, createSaveSnapshot):
    * the workbench tidied, a room stage run sealed (this body alone skipped both, 2026-10-20) and the runtime-only fields dropped. The
    * "nothing changed" check compares prints of this shape (js/cloud-save-ui.js isCloudSaveUnchangedSinceUpload). */
    createCloudSyncPayload(sourceGame) {
      const payload = this.createCloudSaveState(sourceGame || this.owner.game || {});
      payload.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(payload.craftingWorkspace, payload.currencies);
      payload.actExploration = this.deps.actExplorationRooms.seal(payload.actExploration);
      this.dropRuntimeOnlySaveFields(payload);
      return this.deps.itemSaveSlim.slimTree(payload);
    }
    createCloudSaveRequestBody(userId, sourceGame) {
      return JSON.stringify({ user_id: userId, save_data: this.createCloudSyncPayload(sourceGame) });
    }
    /** Content print of a cloud save without what moves while nothing happens: saveMeta (save times), the stall clock
    * (playerStall.lastAt) and talentCardRuntime (never uploaded). Equal prints mean an upload would change nothing. */
    cloudSaveFingerprint(saveData) {
      return printOfSaveText(JSON.stringify(cloudSavePrintSource(saveData)));
    }
    /** The same print with object keys sorted. The server keeps saves as jsonb, which reorders keys, so a body read back from the server is
    * compared with this device's copy this way (js/cloud-save-ui.js pullAccountSave). Slower than cloudSaveFingerprint: once per account entry. */
    cloudSaveContentPrint(saveData) {
      return printOfSaveText(JSON.stringify(cloudSavePrintSource(saveData), sortSaveKeys));
    }
  };

  // modules/persistence/local-save-slots.mjs
  var LocalSaveSlots = class {
    constructor(deps, codec2) {
      this.deps = deps;
      this.codec = codec2;
      this.slot = { kind: "guest", key: deps.LOCAL_SAVE_KEY, userId: null };
      this.runtime = { status: "uninitialized", writable: true, sourceKey: null, backupKey: null, message: "" };
      this.runningBuild = deps.runningBuild;
    }
    accountSaveKey(userId) {
      return `${this.deps.ACCOUNT_SAVE_KEY_PREFIX}${userId}`;
    }
    /** Makes an account's slot (userId) or the guest slot (null) the one loadGame and persistLocalSave use. */
    selectSaveSlot(userId) {
      this.slot.kind = userId ? "account" : "guest";
      this.slot.userId = userId || null;
      this.slot.key = userId ? this.accountSaveKey(userId) : this.deps.LOCAL_SAVE_KEY;
    }
    getSaveSlot() {
      return { ...this.slot };
    }
    /** The guest slot's save as parsed data, whichever slot is active; null when there is none or it cannot be read. */
    readGuestSave() {
      try {
        const raw = this.deps.localStorage.getItem(this.deps.LOCAL_SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        this.deps.console.warn("guest save could not be read:", error);
        return null;
      }
    }
    /** An account's copy on this device (its slot) as parsed data, whichever slot is active; null when there is none or it cannot be read.
    * The login screen shows it for a signed-in account before the account is entered (js/startup-screen-ui.js startupShownSave). */
    readAccountSaveCopy(userId) {
      try {
        const raw = userId ? this.deps.localStorage.getItem(this.accountSaveKey(userId)) : null;
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        this.deps.console.warn("account save copy could not be read:", error);
        return null;
      }
    }
    /** Whether some account's copy is on this device. The login screen says so over an empty guest slot (js/startup-screen-ui.js startupEmptyText), since
    * a signed-out player whose session ended, or whose pre-slot save moved out of the guest slot at boot (migrateOwnedGuestSave), otherwise
    * reads "저장된 모험이 없습니다" and takes the save for lost (2026-11-08). */
    hasAccountSaveCopy() {
      try {
        return Object.keys(this.deps.localStorage).some((key) => key.startsWith(this.deps.ACCOUNT_SAVE_KEY_PREFIX) && !key.includes("_corrupt_"));
      } catch (error) {
        this.deps.console.warn("account save copies could not be listed:", error);
        return false;
      }
    }
    /** Removes the guest save (after it moved into an account), with its earlier key names and corrupt copies. */
    removeGuestSave() {
      const earlier = /^[a-z]{3}IdleSaveData_/i;
      Object.keys(this.deps.localStorage).filter((key) => key === this.deps.LOCAL_SAVE_KEY || earlier.test(key) || key.startsWith(`${this.deps.LOCAL_SAVE_KEY}_corrupt_`)).forEach((key) => this.deps.localStorage.removeItem(key));
    }
    /** Before the slots (2026-10-30) one key held whichever save was last played, so the guest slot may hold an account's save
    * (saveMeta.cloudUserId). Once, at boot: it moves into that account's slot (unless that slot already exists) and the guest slot
    * empties, so an account save never shows up as a guest save (which could be moved into another account). Returns the moved key or null. */
    migrateOwnedGuestSave() {
      try {
        const raw = this.deps.localStorage.getItem(this.deps.LOCAL_SAVE_KEY);
        const owner2 = raw ? JSON.parse(raw)?.saveMeta?.cloudUserId : null;
        if (typeof owner2 !== "string" || !owner2.trim()) return null;
        const key = this.accountSaveKey(owner2);
        if (!this.deps.localStorage.getItem(key)) this.deps.localStorage.setItem(key, raw);
        this.deps.localStorage.removeItem(this.deps.LOCAL_SAVE_KEY);
        return key;
      } catch (error) {
        this.deps.console.warn("owned guest save migration skipped:", error);
        return null;
      }
    }
    setLocalSaveRuntimeState(status, options = {}) {
      this.runtime.status = status;
      this.runtime.writable = options.writable !== false;
      this.runtime.sourceKey = options.sourceKey || null;
      this.runtime.backupKey = options.backupKey || null;
      this.runtime.message = options.message || "";
    }
    getLocalSaveStatus() {
      return { ...this.runtime };
    }
    /** Why this page must not take saveData (a device or cloud save) in, or null when it may: a later release wrote it, and may have
    * reshaped it or added things this release does not know, which loading here would drop and the next write would carry back
    * (2026-10-28: a store app trails the web by days). Everything is refused while this device's own save is from a later release
    * (loadGame 'newer-build'). The error's code is OUTDATED_BUILD_ERROR_CODE. */
    outdatedBuildError(saveData) {
      if (this.runtime.status === "newer-build") return outdatedBuildRefusal(this.runtime.message);
      return this.laterBuildSaveError(saveData);
    }
    /** The refusal for saveData written by a later release than this page's, or null; this device's save status is not read (loadGame). */
    laterBuildSaveError(saveData) {
      const saved = gameBuildTime(saveData?.saveMeta?.gameBuild), running = gameBuildTime(this.runningBuild);
      if (!running || !saved || saved <= running) return null;
      return outdatedBuildRefusal(`이 저장은 더 새 버전의 게임(${(0, this.deps.formatCloudTime)(saved)} 판)에서 저장됐습니다. 새로고침하거나 앱을 업데이트한 뒤 이어 하세요.`);
    }
    /** Throws outdatedBuildError(saveData) when there is one. */
    assertSaveFromKnownBuild(saveData) {
      const refusal = this.outdatedBuildError(saveData);
      if (refusal) throw refusal;
    }
    readLocalSaveResult() {
      try {
        let save = this.deps.localStorage.getItem(this.slot.key);
        if (save) return { status: "ok", save, sourceKey: this.slot.key };
        for (const key of this.slot.kind === "guest" ? this.getLegacySaveKeys() : []) {
          save = this.deps.localStorage.getItem(key);
          if (save) return { status: "ok", save, sourceKey: key };
        }
        return { status: "missing", save: null, sourceKey: null };
      } catch (error) {
        return { status: "unavailable", save: null, sourceKey: null, error };
      }
    }
    /** Guest saves under an earlier key name (LEGACY_SAVE_KEY_PATTERN), the newest key version first. The next save writes LOCAL_SAVE_KEY. */
    getLegacySaveKeys() {
      return Object.keys(this.deps.localStorage).map((key) => [key, this.deps.LEGACY_SAVE_KEY_PATTERN.exec(key)]).filter(([, match]) => match).sort((a, b) => Number(b[1][1]) - Number(a[1][1])).map(([key]) => key);
    }
    readLocalSaveString() {
      let result = this.readLocalSaveResult();
      if (result.status === "unavailable") throw result.error;
      return result.save;
    }
    /** Where the active slot's corrupt copies go: its key plus _corrupt_ and the time. */
    corruptSaveBackupPrefix() {
      return `${this.slot.key}_corrupt_`;
    }
    /** The active slot's corrupt save backups, newest first. */
    corruptSaveBackupKeys() {
      const prefix = this.corruptSaveBackupPrefix();
      return Object.keys(this.deps.localStorage).filter((key) => key.startsWith(prefix)).sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
    }
    /** Keeps a copy of a save that failed to load. The same corrupt save is kept once, and only the two newest copies stay (2026-10-26:
    * every page load with the corrupt save still in place wrote another full copy, until the storage quota was used up). */
    preserveCorruptLocalSave(rawSave) {
      if (!rawSave) return null;
      try {
        const kept = this.corruptSaveBackupKeys();
        const same = kept.find((key) => this.deps.localStorage.getItem(key) === rawSave);
        if (same) return same;
        kept.slice(1).forEach((key) => this.deps.localStorage.removeItem(key));
        let backupKey = `${this.corruptSaveBackupPrefix()}${Date.now()}`;
        this.deps.localStorage.setItem(backupKey, rawSave);
        return backupKey;
      } catch (error) {
        this.deps.console.error("failed to preserve corrupt local save:", error);
        return null;
      }
    }
    /** Persist a fresh save atomically before removing legacy copies; unrelated browser data stays intact. */
    resetLocalSave(snapshot) {
      this.deps.localStorage.setItem(this.slot.key, this.codec.serializeSaveState(snapshot));
      try {
        let earlier = /^[a-z]{3}IdleSaveData_/i;
        Object.keys(this.deps.localStorage).filter((key) => key !== this.slot.key && (key.startsWith(this.corruptSaveBackupPrefix()) || this.slot.kind === "guest" && earlier.test(key))).forEach((key) => this.deps.localStorage.removeItem(key));
      } catch (error) {
        this.deps.console.warn("새 진행은 저장했지만 이전 세이브 사본 정리에 실패했습니다:", error);
      }
    }
    /** Every save a release writes names that release, so an older release can tell it apart (outdatedBuildError). */
    stampGameBuild(meta2) {
      if (this.runningBuild) meta2.gameBuild = this.runningBuild;
    }
  };

  // modules/application/game-save.mjs
  var GameSave = class {
    constructor(owner2, slots2, codec2, deps) {
      this.owner = owner2;
      this.slots = slots2;
      this.codec = codec2;
      this.deps = deps;
      this.importantSaveTimer = null;
      this.disposed = false;
    }
    canPersistLocalSave(options = {}) {
      if (this.disposed) return false;
      const recovery = options.allowRecoveryWrite === true && this.slots.runtime.status !== "newer-build";
      return (this.slots.runtime.writable !== false || recovery) && !(0, this.deps.isTransientGameState)(this.owner.game) && !(typeof this.deps.backgroundCombatRuntime !== "undefined" && (this.deps.backgroundCombatRuntime.processing || this.deps.backgroundCombatRuntime.failed));
    }
    ensureSaveMeta(owner2 = this.owner.game) {
      if (!owner2.saveMeta || typeof owner2.saveMeta !== "object") owner2.saveMeta = JSON.parse(JSON.stringify(this.owner.defaultGame.saveMeta));
      const meta2 = owner2.saveMeta;
      if (!Number.isFinite(meta2.lastModifiedAt)) meta2.lastModifiedAt = 0;
      if (!(meta2.playedUntil > 0)) meta2.playedUntil = meta2.lastModifiedAt;
      if (!Number.isFinite(meta2.lastCloudSyncAt)) meta2.lastCloudSyncAt = 0;
      this.repairCloudSaveMetadata(meta2);
    }
    repairCloudSaveMetadata(meta2) {
      if (!meta2.lastCloudUploadProfile || typeof meta2.lastCloudUploadProfile !== "object") {
        meta2.lastCloudUploadProfile = null;
      }
      if (typeof meta2.cloudUserId !== "string" || !meta2.cloudUserId.trim()) {
        meta2.cloudUserId = null;
      }
      meta2.cloudRevision = Math.max(0, Math.floor(Number(meta2.cloudRevision) || 0));
      meta2.cloudPending = meta2.cloudPending === true;
    }
    refreshItemIdCounter() {
      const rift = this.owner.game.timeRift || {};
      const presets = ((this.owner.game.equipmentLoadouts || {}).presets || []).filter(Boolean).flatMap((preset) => Object.values(preset.slots || {}));
      const items = [
        this.owner.game.inventory,
        Object.values(this.owner.game.equipment || {}),
        rift.altarUnique,
        rift.altarRare,
        this.owner.game.equipmentTemporaryStorage,
        presets,
        this.deps.actExplorationLoot.reservedItems(this.owner.game),
        this.deps.actExplorationState.groundLoot.reservedItems(this.owner.game),
        this.deps.coreItems.ownedItems(this.owner.game),
        (this.owner.game.playerStall?.listings || []).map((row) => row.item)
      ].flat().filter(Boolean);
      const jewels = [this.owner.game.jewelInventory, items.flatMap((item) => this.deps.equipmentSockets.jewels(item).map((row) => row.jewel))].flat().filter(Boolean);
      this.owner.session.itemIdCounter = Math.max(0, ...items.concat(jewels).map((item) => item.id || 0));
    }
    /** The latest device time this save has seen. Moving the clock forward and back leaves it ahead of now, while lastModifiedAt is
    * overwritten by the next save; the guest save check (js/guest-save-check.js) reads it before a guest save moves into an account. */
    noteSaveClock(meta2) {
      meta2.maxSeenAt = Math.max(Number(meta2.maxSeenAt) || 0, Date.now());
    }
    /** The time play is settled up to (saveMeta.playedUntil): now, or while a hidden page or a paused app holds the game still (js/main.js
    * runForegroundCombat) the time play stopped (backgroundCombatRuntime.hiddenAtMs), so a tab closed while hidden (or dropped by the
    * browser) settles its hidden hours at the next launch instead of losing them. */
    getPlayedUntil() {
      const now = Date.now();
      if (typeof this.deps.backgroundCombatRuntime === "undefined" || typeof this.deps.document === "undefined") return now;
      const still = this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive;
      const at = Math.floor(Number(this.deps.backgroundCombatRuntime.hiddenAtMs) || 0);
      return still && at > 0 ? Math.min(at, now) : now;
    }
    /** A write that carries a change stamps two times (2026-11-10; one field held both until then, and a save made while entering the
    * game moved the away settlement's start to now, v0.3.57 to v0.3.59): lastModifiedAt, when the save was written, and playedUntil,
    * the time the next launch settles from. playedUntil stays as loaded until the launch has read it (launchSettlementPending).
    * In an account slot the write is also marked pending (cleared by the commit that carries it, js/cloud-save-ui.js rememberCloudCommit). */
    touchSaveMeta() {
      this.owner.game.saveMeta.lastModifiedAt = Date.now();
      if (typeof this.deps.backgroundCombatRuntime === "undefined" || !this.deps.backgroundCombatRuntime.launchSettlementPending) this.owner.game.saveMeta.playedUntil = this.getPlayedUntil();
      if (this.slots.slot.kind === "account") this.owner.game.saveMeta.cloudPending = true;
    }
    persistLocalSave(options = {}) {
      if (!this.canPersistLocalSave(options)) return false;
      this.ensureSaveMeta();
      this.noteSaveClock(this.owner.game.saveMeta);
      this.slots.stampGameBuild(this.owner.game.saveMeta);
      if (options.touchModifiedAt !== false) this.touchSaveMeta();
      try {
        this.deps.localStorage.setItem(this.slots.slot.key, this.codec.serializeSaveState(this.owner.game));
      } catch (error) {
        if (!this.recoverLocalSave(error)) return false;
      }
      this.slots.setLocalSaveRuntimeState("ok", { writable: true, sourceKey: this.slots.slot.key });
      this.refreshItemIdCounter();
      return true;
    }
    recoverLocalSave(error) {
      try {
        let sanitized = sanitizeForSave(this.owner.game || {});
        if (!sanitized.saveMeta || typeof sanitized.saveMeta !== "object") sanitized.saveMeta = {};
        delete sanitized.talentCardRuntime;
        this.deps.localStorage.setItem(this.slots.slot.key, JSON.stringify(sanitized));
        if (typeof this.deps.addLog === "function") (0, this.deps.addLog)((0, this.deps._t)("💾 저장 데이터 정리 후 로컬 저장을 복구했습니다."), "season-up");
      } catch (retryError) {
        this.reportLocalSaveFailure(error, retryError);
        return false;
      }
      return true;
    }
    reportLocalSaveFailure(error, retryError) {
      this.deps.console.error("local save failed:", error, retryError);
      let isQuota = retryError && (retryError.name === "QuotaExceededError" || /quota|storage/i.test(String(retryError.message || "")));
      this.slots.setLocalSaveRuntimeState("write-failed", {
        writable: false,
        message: isQuota ? "브라우저 저장공간이 부족합니다. 공간을 확보한 뒤 설정의 지금 저장을 눌러 주세요." : "기기 저장에 실패했습니다. 설정의 지금 저장으로 다시 시도해 주세요."
      });
      if (typeof this.deps.addLog === "function") (0, this.deps.addLog)(isQuota ? "⚠️ 로컬 저장 실패: 브라우저 저장공간을 확인하세요." : "⚠️ 로컬 저장 실패: 저장 데이터 형식 오류가 발생했습니다.", "loot-rare");
    }
    /** Recover an empty ordinary encounter, without restarting a completed sky allowance. */
    resumeEmptyEncounterAfterLoad(zone) {
      if (this.owner.game.actExploration || this.owner.game.settings.mapCompleteAction === "stop" || (0, this.deps.isSkyTowerAtRewardLimit)(zone)) return;
      if (this.owner.game.enemies.length === 0 && this.owner.game.encounterPlan.length === 0) this.owner.game.combatHalted = false;
    }
    normalizeLocalRuntimeAfterLoad() {
      if (!this.owner.game) return;
      if (typeof this.deps.normalizeCombatTacticsSettings === "function") {
        let tactics = (0, this.deps.normalizeCombatTacticsSettings)(this.owner.game.settings);
        this.owner.game.settings.combatTargetPriority = tactics.targetPriority;
        this.owner.game.settings.combatPositionMode = tactics.positionMode;
      }
      let zone = typeof this.deps.getZone === "function" ? (0, this.deps.getZone)(this.owner.game.currentZoneId) : null;
      if (!zone && typeof this.deps.getAutoProgressZoneId === "function") {
        this.owner.game.currentZoneId = (0, this.deps.getAutoProgressZoneId)(Math.max(0, Math.floor(this.owner.game.maxZoneId || 0)));
      }
      if (!Number.isFinite(this.owner.game.moveTimer)) this.owner.game.moveTimer = 0;
      this.resumeEmptyEncounterAfterLoad(zone);
      this.restoreRealmProtection();
    }
    restoreRealmProtection() {
      if (!this.owner.game.realmDeathWard || typeof this.owner.game.realmDeathWard !== "object") this.owner.game.realmDeathWard = null;
      else {
        this.owner.game.realmDeathWard.amount = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.amount) || 0));
        this.owner.game.realmDeathWard.maxAmount = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.maxAmount) || 0));
        this.owner.game.realmDeathWard.readyAt = Math.max(0, Math.floor(Number(this.owner.game.realmDeathWard.readyAt) || 0));
      }
      this.owner.game.realmInvulnerableBarrierUntil = Math.max(0, Math.floor(Number(this.owner.game.realmInvulnerableBarrierUntil) || 0));
    }
    loadGame() {
      let result = this.slots.readLocalSaveResult();
      if (result.status === "unavailable") {
        this.deps.console.error("local save storage is unavailable:", result.error);
        this.slots.setLocalSaveRuntimeState("unavailable", {
          writable: false,
          message: "브라우저 저장소에 접근할 수 없어 자동 저장과 클라우드 업로드를 중단했습니다."
        });
        this.owner.game = (0, this.deps.cloneDefaultGame)();
      } else if (result.status === "missing") {
        this.slots.setLocalSaveRuntimeState("missing", { writable: true });
        this.owner.game = (0, this.deps.cloneDefaultGame)();
      } else {
        try {
          const saved = JSON.parse(result.save);
          if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid save root: expected an object.");
          const refusal = this.slots.laterBuildSaveError(saved);
          if (refusal) {
            this.slots.setLocalSaveRuntimeState("newer-build", { writable: false, sourceKey: result.sourceKey, message: refusal.message });
            this.owner.game = (0, this.deps.cloneDefaultGame)();
          } else {
            this.owner.game = (0, this.deps.mergeDefaults)(saved);
            this.slots.setLocalSaveRuntimeState("ok", { writable: true, sourceKey: result.sourceKey });
          }
        } catch (error) {
          let backupKey = this.slots.preserveCorruptLocalSave(result.save);
          this.deps.console.error("local save is corrupt; automatic writes are blocked:", error);
          this.slots.setLocalSaveRuntimeState("corrupt", {
            writable: false,
            sourceKey: result.sourceKey,
            backupKey,
            message: backupKey ? `손상된 저장을 ${backupKey}에 보존했으며 자동 저장과 클라우드 업로드를 중단했습니다.` : "저장 데이터가 손상되어 자동 저장과 클라우드 업로드를 중단했습니다."
          });
          this.owner.game = (0, this.deps.cloneDefaultGame)();
        }
      }
      this.ensureSaveMeta();
      this.normalizeLocalRuntimeAfterLoad();
      this.refreshItemIdCounter();
      return this.slots.getLocalSaveStatus();
    }
    /** The boot's load (js/main.js init): the one-time move of an account save out of the guest slot, then the guest slot. */
    loadGameAtBoot() {
      this.slots.migrateOwnedGuestSave();
      return this.loadGame();
    }
    saveGame(options = {}) {
      let manual = !!options.manual;
      let allowRecoveryWrite = manual && this.slots.runtime.status === "write-failed";
      let persisted = this.persistLocalSave({ touchModifiedAt: options.touchModifiedAt !== false, allowRecoveryWrite });
      if (!persisted) {
        if (manual) this.setCloudMessage(this.slots.runtime.message || "로컬 저장이 차단되어 저장하지 못했습니다.");
        return false;
      }
      if (!options.skipCloudSync) this.syncAfterLocalSave(manual);
      (0, this.deps.updateCloudSaveUI)();
      return true;
    }
    syncAfterLocalSave(manual) {
      if (manual && typeof this.deps.syncCloudSave === "function" && this.deps.cloudState && this.deps.cloudState.configured && this.deps.cloudState.user) {
        (0, this.deps.syncCloudSave)({ automatic: false, force: true, reason: "manual-save" }).catch((error) => {
          if (typeof this.setCloudMessage === "function") this.setCloudMessage("수동 저장 클라우드 업로드 실패: " + (error && error.message ? error.message : error));
        });
      } else (0, this.deps.scheduleCloudAutoSync)();
    }
    queueImportantSave(delayMs) {
      if (this.disposed) return;
      if (!this.canPersistLocalSave()) return;
      if (typeof this.deps.isStartupOverlayOpen === "function" && (0, this.deps.isStartupOverlayOpen)()) return;
      let delay = Math.max(0, Number.isFinite(delayMs) ? delayMs : 350);
      if (this.importantSaveTimer) (0, this.deps.clearTimeout)(this.importantSaveTimer);
      this.importantSaveTimer = (0, this.deps.setTimeout)(() => {
        this.importantSaveTimer = null;
        if (typeof this.deps.isStartupOverlayOpen === "function" && (0, this.deps.isStartupOverlayOpen)()) return;
        this.saveGame({ skipCloudSync: true });
      }, delay);
    }
    setCloudMessage(message) {
      this.deps.cloudState.lastMessage = message;
      (0, this.deps.updateCloudSaveUI)();
    }
    /** Terminal shutdown must cancel delayed writes before another tab can claim the save. */
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      if (this.importantSaveTimer !== null) (0, this.deps.clearTimeout)(this.importantSaveTimer);
      this.importantSaveTimer = null;
    }
  };

  // modules/save-classic.mjs
  var formatCloudTime2 = (value) => formatCloudTime(value, i18n.locale);
  var meta = typeof document === "object" && typeof document.querySelector === "function" ? document.querySelector('meta[name="game-build"]') : null;
  var runningBuild = gameBuildTime(meta && meta.content) ? meta.content : null;
  var owner = window.GameModules.state;
  var codec = new SaveCodec(owner, {
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get itemSaveSlim() {
      return window.GameModules.itemSaveSlim;
    }
  });
  var slots = new LocalSaveSlots({
    get ACCOUNT_SAVE_KEY_PREFIX() {
      return ACCOUNT_SAVE_KEY_PREFIX;
    },
    get LEGACY_SAVE_KEY_PATTERN() {
      return LEGACY_SAVE_KEY_PATTERN;
    },
    get LOCAL_SAVE_KEY() {
      return LOCAL_SAVE_KEY;
    },
    get console() {
      return console;
    },
    get localStorage() {
      return localStorage;
    },
    runningBuild,
    formatCloudTime: formatCloudTime2
  }, codec);
  var application = new GameSave(owner, slots, codec, {
    get _t() {
      return _t;
    },
    get actExplorationLoot() {
      return actExplorationLoot;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get backgroundCombatRuntime() {
      return typeof backgroundCombatRuntime === "undefined" ? void 0 : backgroundCombatRuntime;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get cloneDefaultGame() {
      return cloneDefaultGame;
    },
    get cloudState() {
      return cloudState;
    },
    get console() {
      return console;
    },
    get coreItems() {
      return coreItems;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get getAutoProgressZoneId() {
      return typeof getAutoProgressZoneId === "undefined" ? void 0 : getAutoProgressZoneId;
    },
    get getZone() {
      return typeof getZone === "undefined" ? void 0 : getZone;
    },
    get isSkyTowerAtRewardLimit() {
      return isSkyTowerAtRewardLimit;
    },
    get isStartupOverlayOpen() {
      return typeof isStartupOverlayOpen === "undefined" ? void 0 : isStartupOverlayOpen;
    },
    get isTransientGameState() {
      return isTransientGameState;
    },
    get localStorage() {
      return localStorage;
    },
    get mergeDefaults() {
      return mergeDefaults;
    },
    get normalizeCombatTacticsSettings() {
      return typeof normalizeCombatTacticsSettings === "undefined" ? void 0 : normalizeCombatTacticsSettings;
    },
    get scheduleCloudAutoSync() {
      return scheduleCloudAutoSync;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get syncCloudSave() {
      return typeof syncCloudSave === "undefined" ? void 0 : syncCloudSave;
    },
    get updateCloudSaveUI() {
      return updateCloudSaveUI;
    }
  });
  window.GameModules.save = Object.freeze({ dispose: () => application.dispose() });
  safeExposeGlobals({
    normalizeCloudUploadProfile,
    accountSaveKey: (...args) => slots.accountSaveKey(...args),
    selectSaveSlot: (...args) => slots.selectSaveSlot(...args),
    getSaveSlot: (...args) => slots.getSaveSlot(...args),
    readGuestSave: (...args) => slots.readGuestSave(...args),
    readAccountSaveCopy: (...args) => slots.readAccountSaveCopy(...args),
    hasAccountSaveCopy: (...args) => slots.hasAccountSaveCopy(...args),
    removeGuestSave: (...args) => slots.removeGuestSave(...args),
    migrateOwnedGuestSave: (...args) => slots.migrateOwnedGuestSave(...args),
    setLocalSaveRuntimeState: (...args) => slots.setLocalSaveRuntimeState(...args),
    getLocalSaveStatus: (...args) => slots.getLocalSaveStatus(...args),
    gameBuildTime,
    outdatedBuildError: (...args) => slots.outdatedBuildError(...args),
    assertSaveFromKnownBuild: (...args) => slots.assertSaveFromKnownBuild(...args),
    canPersistLocalSave: (...args) => application.canPersistLocalSave(...args),
    readLocalSaveResult: (...args) => slots.readLocalSaveResult(...args),
    getLegacySaveKeys: (...args) => slots.getLegacySaveKeys(...args),
    readLocalSaveString: (...args) => slots.readLocalSaveString(...args),
    ensureSaveMeta: (...args) => application.ensureSaveMeta(...args),
    resetLocalSave: (...args) => slots.resetLocalSave(...args),
    refreshItemIdCounter: (...args) => application.refreshItemIdCounter(...args),
    dropRuntimeOnlySaveFields: (...args) => codec.dropRuntimeOnlySaveFields(...args),
    createSaveSnapshot: (...args) => codec.createSaveSnapshot(...args),
    serializeSaveState: (...args) => codec.serializeSaveState(...args),
    createCloudSavePayload: (...args) => codec.createCloudSavePayload(...args),
    createCloudSyncPayload: (...args) => codec.createCloudSyncPayload(...args),
    createCloudSaveRequestBody: (...args) => codec.createCloudSaveRequestBody(...args),
    cloudSaveFingerprint: (...args) => codec.cloudSaveFingerprint(...args),
    cloudSaveContentPrint: (...args) => codec.cloudSaveContentPrint(...args),
    getPlayedUntil: (...args) => application.getPlayedUntil(...args),
    touchSaveMeta: (...args) => application.touchSaveMeta(...args),
    persistLocalSave: (...args) => application.persistLocalSave(...args),
    normalizeLocalRuntimeAfterLoad: (...args) => application.normalizeLocalRuntimeAfterLoad(...args),
    loadGame: (...args) => application.loadGame(...args),
    loadGameAtBoot: (...args) => application.loadGameAtBoot(...args),
    saveGame: (...args) => application.saveGame(...args),
    queueImportantSave: (...args) => application.queueImportantSave(...args),
    formatCloudTime: formatCloudTime2,
    setCloudMessage: (...args) => application.setCloudMessage(...args),
    stampGameBuild: (...args) => slots.stampGameBuild(...args)
  });
})();
