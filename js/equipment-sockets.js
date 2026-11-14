// GENERATED from modules/equipment-sockets*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/bag-item-shape.mjs
  var JEWEL = "주얼";
  var isJewel = (item) => !!item && item.slot === JEWEL;
  var asJewel = (jewel) => Object.assign(jewel, { slot: JEWEL, baseStats: jewel.baseStats || [], locked: !!jewel.locked });
  var jewels = (state) => (state.inventory || []).filter(isJewel);

  // modules/domain/bag-storage.mjs
  function putBagItem(item, state, force, placement) {
    const result = placement.findAddPlacement(item, state);
    if (!result || !result.ok) {
      if (!force) return false;
      state.equipmentTemporaryStorage = [...Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage : [], item];
      return true;
    }
    const key = placement.ensureItemIdentity(item);
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    state.inventory.push(item);
    state.equipmentInventoryPlacements = { ...state.equipmentInventoryPlacements || {}, [key]: result.placement };
    return true;
  }
  function takeBagItem(item, state) {
    const index = (state.inventory || []).indexOf(item);
    if (index >= 0) state.inventory.splice(index, 1);
    return index >= 0;
  }

  // modules/domain/equipment-sockets.mjs
  var ACCESSORY_SLOTS = /* @__PURE__ */ new Set(["반지", "목걸이", "허리띠"]);
  var SOCKETABLE_SLOTS = /* @__PURE__ */ new Set(["무기", "투구", "갑옷", "방패", "장갑", "신발", "반지", "목걸이", "허리띠"]);
  var LOCK_REASON = "☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.";
  var EquipmentSockets = class {
    constructor(tables, deps) {
      this.tables = tables;
      this.deps = deps;
    }
    getAbyssSocketCapacity(item) {
      if (!item || item.rarity !== "unique") return 0;
      if (item.uniqueEffectKey === "abyssSocketOnItem") return Math.max(1, Math.min(2, Math.floor(item.uniqueEffectParams && item.uniqueEffectParams.max || 2)));
      if (item.uniqueEffectKey === "abyssSocketAndJewelAmp") return Math.max(1, Math.min(2, Math.floor(item.uniqueEffectParams && item.uniqueEffectParams.socketsMax || 2)));
      return 0;
    }
    ensureAbyssSockets(item) {
      const cap = this.getAbyssSocketCapacity(item);
      if (!item || cap <= 0) return;
      if (Array.isArray(item.abyssSockets) && item.abyssSockets.length > 0) return;
      const params = item.uniqueEffectParams || {};
      const min = Math.max(1, Math.floor(Number(params.min || params.socketsMin || 1)));
      const max = Math.max(min, Math.min(cap, Math.floor(Number(params.max || params.socketsMax || cap))));
      const count = min + Math.floor(this.deps.random() * (max - min + 1));
      item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
    }
    baseSlot(item) {
      return String(item && item.slot || "").replace(/[123]$/, "");
    }
    isSocketable(item) {
      return !!item && SOCKETABLE_SLOTS.has(this.baseSlot(item));
    }
    /** Rings, amulets and belts: the only slots a void socket opens on. */
    isAccessory(item) {
      return ACCESSORY_SLOTS.has(this.baseSlot(item));
    }
    hasVoidSocket(item) {
      return this.isSocketable(item) && !!(item.voidSocket && item.voidSocket.open);
    }
    /** The grown kinds a unique's sockets take ('flower', 'fruit', 'vine', 'root'), or [] for any other item. */
    harvestKinds(item) {
      return item && item.rarity === "unique" && this.tables.harvestUniques[item.uniqueEffectKey] || [];
    }
    /** A harvest unique's sockets exist from the start: the accessories' void socket is always open, the armour has one per kind. */
    ensureHarvestSockets(item) {
      const kinds = this.harvestKinds(item);
      if (!kinds.length) return;
      if (this.isAccessory(item)) {
        if (!this.hasVoidSocket(item) && !item.fusedRelic) item.voidSocket = { ...item.voidSocket || {}, open: true, jewel: item.voidSocket && item.voidSocket.jewel || null };
      } else if (!Array.isArray(item.harvestSockets)) item.harvestSockets = kinds.map((accepts) => ({ accepts, harvest: null }));
    }
    /** Save boundary (2026-11-04, 호박석이 뿌리가 되고 덩굴이 생겼다): a socketed old 호박석 becomes a 뿌리, and the harvest armour's sockets
     * follow today's kinds in their order (data/items.js this.tables.harvestUniques), each keeping what it holds. A held item no kind takes
     * keeps a socket of its own, so nothing is lost. Idempotent. */
    migrateHarvest(item) {
      if (!item || typeof item !== "object") return;
      if (item.voidSocket && item.voidSocket.harvest) item.voidSocket.harvest = this.deps.stumpBox.currentSocketItem(item.voidSocket.harvest);
      if (!Array.isArray(item.harvestSockets)) return;
      const old = item.harvestSockets.filter(Boolean).map((socket) => ({
        accepts: socket.accepts === "amber" ? "root" : socket.accepts,
        harvest: socket.harvest ? this.deps.stumpBox.currentSocketItem(socket.harvest) : null
      }));
      const kept = this.harvestKinds(item).map((accepts) => old.find((socket) => socket.accepts === accepts) || { accepts, harvest: null });
      item.harvestSockets = kept.concat(old.filter((socket) => socket.harvest && !kept.includes(socket)));
    }
    /** Sockets as stored, without creating any: void, the corruption socket, abyss sockets, then harvest sockets. A jewel or a grown
     * item left in a void record is listed even when the record lost its open flag, so no reader can let it go with the item.
     * accepts: the grown kinds the socket takes besides (void) or instead of (harvest) a jewel. */
    voidRows(item) {
      const record = item.voidSocket || {}, jewel = record.jewel || null, harvest = record.harvest || null;
      if (!this.hasVoidSocket(item) && !jewel && !harvest) return [];
      return [{ kind: "void", index: 0, jewel, harvest, accepts: this.isAccessory(item) ? this.harvestKinds(item) : [], fused: record.fused === true }];
    }
    storedRows(item) {
      const rows = this.voidRows(item);
      if (item.corruptionSocket) rows.push({ kind: "corrupt", index: 0, jewel: item.corruptionSocket.jewel || null, harvest: null, accepts: [] });
      const abyss = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
      abyss.forEach((socket, index) => rows.push({ kind: "abyss", index, jewel: socket && socket.jewel || null, harvest: null, accepts: [] }));
      const harvest = Array.isArray(item.harvestSockets) ? item.harvestSockets : [];
      harvest.forEach((socket, index) => rows.push({
        kind: "harvest",
        index,
        jewel: null,
        harvest: socket && socket.harvest || null,
        accepts: socket && socket.accepts ? [socket.accepts] : []
      }));
      return rows;
    }
    /** Every socket of the item in display order: void, corruption, the abyss sockets of socketed uniques, the harvest armour's. */
    list(item) {
      if (!item) return [];
      this.ensureAbyssSockets(item);
      this.ensureHarvestSockets(item);
      return this.storedRows(item);
    }
    /** The this.jewels sitting in the item's sockets ({kind, index, jewel}); reads only, never opens a socket. */
    jewels(item) {
      return item ? this.storedRows(item).filter((row) => row.jewel) : [];
    }
    /** The grown items sitting in the item's sockets ({kind, index, harvest}); reads only. */
    harvests(item) {
      return item ? this.storedRows(item).filter((row) => row.harvest) : [];
    }
    /** A socket a jewel may go into: empty, and not one of the harvest armour's. */
    takesJewel(row) {
      return !row.jewel && !row.harvest && row.kind !== "harvest";
    }
    /**
     * Before an item is destroyed (salvage, a chance orb, a cube recipe): every socketed jewel goes back to the bag, past a full bag
     * into the temporary storage, and every socketed grown item back to the stump box, past a full storage, so neither is lost.
     * @returns {number} this.jewels returned
     */
    returnJewels(item, state) {
      const rows = this.jewels(item).filter((row) => !row.fused);
      rows.forEach((row) => {
        putBagItem(asJewel(row.jewel), state, true, this.deps.placement);
        this.socketRecord(item, row.kind, row.index).jewel = null;
      });
      this.harvests(item).forEach((row) => {
        this.deps.stumpBox.returnFromSocket(state, row.harvest, true);
        this.socketRecord(item, row.kind, row.index).harvest = null;
      });
      return rows.length;
    }
    count(item) {
      return item ? this.storedRows(item).length : 0;
    }
    label(row) {
      if (row.kind === "harvest") return this.deps.translate("{label} 소켓", { label: this.tables.stages[row.accepts[0]].label });
      if (row.kind === "void") return row.fused ? "융합 소켓" : "공허 소켓";
      return row.kind === "corrupt" ? "타락 소켓" : this.deps.translate("심연 소켓 {value}", { value: row.index + 1 });
    }
    /** A corruption may open one socket on any socketable item: beside an accessory's void socket, or the only socket elsewhere. */
    canAddCorruptionSocket(item) {
      return this.isSocketable(item) && !item.corruptionSocket && !item.fusedRelic;
    }
    addCorruptionSocket(item) {
      if (!this.canAddCorruptionSocket(item)) return false;
      item.corruptionSocket = { jewel: null };
      return true;
    }
    canChisel(item) {
      return this.isAccessory(item) && !this.hasVoidSocket(item) && !item.fusedRelic;
    }
    /** Opens the void socket; the caller has already paid for it (the this.chisel here, the cube recipe in stump-cube.js) or it dropped so. */
    openVoidSocket(item) {
      if (!this.canChisel(item)) return false;
      item.voidSocket = { open: true, jewel: null };
      return true;
    }
    /** The void socket's jewel becomes part of the item: it can no longer come out. */
    fuse(item) {
      if (item.voidSocket && item.voidSocket.jewel) item.voidSocket.fused = true;
    }
    /** A dropped accessory comes with its void socket open on this.tables.dropChance of drops, once this.jewels are unlocked. */
    rollDropSocket(item, owner) {
      if (!this.isAccessory(item) || !this.deps.jewelsUnlocked(owner) || this.deps.random() >= this.tables.dropChance) return false;
      return this.openVoidSocket(item);
    }
    /** Before 2026-10-07 every accessory had a void socket of its own: an old save's accessory keeps it as an open record (once). */
    keepLegacySocket(item) {
      if (!item || typeof item !== "object" || !this.isAccessory(item) || this.hasVoidSocket(item)) return false;
      item.voidSocket = { open: true, jewel: item.voidSocket && item.voidSocket.jewel || null };
      return true;
    }
    chisel(item, state) {
      if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
      if (!this.isAccessory(item)) return { ok: false, reason: this.deps.translate("공허 소켓은 반지, 목걸이, 허리띠에만 뚫을 수 있습니다. 다른 장비는 타락으로만 소켓이 생깁니다.") };
      if (!this.canChisel(item)) return { ok: false, reason: this.deps.translate("이 장비에는 공허 소켓을 더 뚫을 수 없습니다.") };
      if ((state.currencies.voidChisel || 0) <= 0) return { ok: false, reason: this.deps.translate("공허의 끌이 부족합니다.") };
      state.currencies.voidChisel -= 1;
      this.openVoidSocket(item);
      return { ok: true };
    }
    socketRecord(item, kind, index) {
      if (kind === "abyss") return Array.isArray(item.abyssSockets) && item.abyssSockets[index] || null;
      if (kind === "harvest") return Array.isArray(item.harvestSockets) && item.harvestSockets[index] || null;
      if (kind === "corrupt") return item.corruptionSocket || null;
      return this.voidRecord(item);
    }
    /** The open void socket's record, or a closed record that still holds a jewel or a grown item (so it can come out), or null. */
    voidRecord(item) {
      if (this.hasVoidSocket(item)) return item.voidSocket;
      return item.voidSocket && (item.voidSocket.jewel || item.voidSocket.harvest) ? item.voidSocket : null;
    }
    /** The socket `at` ({ kind, index }, the one something was dropped on) when it fits, else the first that fits. */
    pickSocket(rows, fits, at) {
      return at && rows.find((row) => fits(row) && row.kind === at.kind && row.index === at.index) || rows.find(fits);
    }
    /** Moves a bag jewel into the item's socket `at` when that is empty, else into the first empty one. */
    insert(item, jewelId, state, at = null) {
      if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
      const jewel = jewels(state).find((row) => row.id === jewelId), empty = this.pickSocket(this.list(item), this.takesJewel, at);
      if (!jewel) return { ok: false, reason: this.deps.translate("가방에 없는 주얼입니다.") };
      if (!empty) return { ok: false, reason: this.deps.translate("빈 소켓이 없습니다.") };
      takeBagItem(jewel, state);
      this.socketRecord(item, empty.kind, empty.index).jewel = jewel;
      return { ok: true, jewel };
    }
    /** Moves a stored grown flower, fruit, vine or root (stump box id) into a socket of this unique that takes its kind. */
    insertHarvest(item, stumpId, state, at = null) {
      if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
      const grown = this.deps.stumpBox.socketable(state, stumpId);
      if (!grown) return { ok: false, reason: this.deps.translate("그루터기 함 보관함의 다 자란 꽃, 열매, 덩굴, 뿌리만 넣을 수 있습니다.") };
      const kind = this.deps.stumpBox.yieldKind(grown);
      const empty = this.pickSocket(this.list(item), (row) => !row.jewel && !row.harvest && row.accepts.includes(kind), at);
      if (!empty) return { ok: false, reason: `${this.tables.stages[kind].label}${this.deps.particle(this.tables.stages[kind].label, "을", "를")} 넣을 빈 소켓이 없습니다.` };
      this.deps.stumpBox.takeForSocket(state, grown);
      this.socketRecord(item, empty.kind, empty.index).harvest = grown;
      return { ok: true, harvest: grown };
    }
    removeHarvest(record, state) {
      if (!this.deps.stumpBox.returnFromSocket(state, record.harvest)) return { ok: false, reason: this.deps.translate("그루터기 함 보관함에 자리가 없습니다.") };
      const harvest = record.harvest;
      record.harvest = null;
      return { ok: true, harvest };
    }
    /** Takes a jewel back to the bag, or a grown item back to the stump box storage (neither when it is full). */
    remove(item, kind, index, state) {
      if (state.woodsmanBuildLock) return { ok: false, reason: LOCK_REASON };
      const record = item ? this.socketRecord(item, kind, index) : null;
      if (record && record.harvest) return this.removeHarvest(record, state);
      if (!record || !record.jewel) return { ok: false, reason: this.deps.translate("빈 소켓입니다.") };
      if (record.fused) return { ok: false, reason: this.deps.translate("융합된 주얼은 뺄 수 없습니다.") };
      const jewel = record.jewel;
      if (!putBagItem(asJewel(jewel), state, false, this.deps.placement)) return { ok: false, reason: this.deps.translate("가방에 자리가 없습니다.") };
      record.jewel = null;
      return { ok: true, jewel };
    }
  };
  function createEquipmentSockets(tables, deps) {
    const sockets2 = new EquipmentSockets(tables, deps);
    return Object.freeze(Object.fromEntries(["isSocketable", "isAccessory", "hasVoidSocket", "list", "jewels", "harvests", "harvestKinds", "migrateHarvest", "takesJewel", "returnJewels", "count", "label", "canChisel", "openVoidSocket", "fuse", "rollDropSocket", "keepLegacySocket", "canAddCorruptionSocket", "addCorruptionSocket", "chisel", "insert", "insertHarvest", "remove", "getAbyssSocketCapacity", "ensureAbyssSockets"].map((name) => [name, sockets2[name].bind(sockets2)])));
  }

  // modules/equipment-sockets-classic.mjs
  var sockets = createEquipmentSockets({
    get harvestUniques() {
      return HARVEST_SOCKET_UNIQUES;
    },
    get dropChance() {
      return SOCKETED_ACCESSORY_DROP_CHANCE;
    },
    get stages() {
      return STUMP_BOX_STAGES;
    }
  }, {
    translate: (...args) => _t(...args),
    particle: (...args) => pickParticle(...args),
    random: () => Math.random(),
    jewelsUnlocked: (owner) => typeof contentProgression === "object" && contentProgression.isUnlocked("jewel", owner),
    get stumpBox() {
      return stumpBox;
    },
    placement: {
      findAddPlacement: (item, state) => equipmentInventoryGridRuntime.findAddPlacement(item, state),
      ensureItemIdentity: (item) => equipmentLoadoutRuntime.ensureItemIdentity(item)
    }
  });
  var equipmentSockets = Object.freeze({
    ...sockets,
    rollDropSocket: (item, owner = game) => sockets.rollDropSocket(item, owner),
    returnJewels: (item, state = game) => sockets.returnJewels(item, state),
    chisel: (item, state = game) => sockets.chisel(item, state),
    insert: (item, id, state = game, at = null) => sockets.insert(item, id, state, at),
    insertHarvest: (item, id, state = game, at = null) => sockets.insertHarvest(item, id, state, at),
    remove: (item, kind, index, state = game) => sockets.remove(item, kind, index, state)
  });
  safeExposeGlobals({ equipmentSockets });
})();
