// GENERATED from modules/battle-ground-loot-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/ground-loot-presentation.mjs
  var ARM_ROWS = Object.freeze({ wide: { up: 6, right: 2, left: 2, down: 3 }, narrow: { up: 3, right: 1, left: 1, down: 2 } });
  var LEAF_ART = "pixel:leaf";
  var YARN_ART = "assets/ui/currency/yarn.png";
  var GroundLootPresentation = class {
    constructor(deps) {
      this.deps = deps;
      for (const name of ["isMajor", "importance"]) this[name] = this[name].bind(this);
      this.floorReceipt = {
        currency: (row) => ({ currency: row.currency, count: row.count }),
        equipment: (row) => ({ item: row.item, itemKind: "equipment", highlight: row.highlight, unidentified: row.item.rarity === "unique" }),
        jewel: (row) => ({ item: row.item, itemKind: "jewel", color: this.deps.getJewelLootColor(row.item) }),
        core: (row) => ({ item: row.item, itemKind: "core" }),
        talisman: (row) => ({ item: row.item, itemKind: "talisman", color: this.deps.TALISMAN_RARITY_TONES[row.item.rarity] }),
        stump: (row) => ({ stump: row.item, itemKind: "stump", color: this.deps.STUMP_BOX_COLORS[row.item.color].tone }),
        leaf: (row) => ({ leaf: row.leaf, itemKind: "leaf", color: this.deps.MEMORY_LEAVES.tone }),
        yarn: (row) => ({ yarn: row.yarn, itemKind: "yarn", color: "#d7bb82" }),
        gem: (row) => ({ gem: row.gem, itemKind: "gem", color: this.deps.getRarityColor("rare") }),
        rune: (row) => ({ gem: row.gem.name, itemKind: "gem", color: this.deps.getRarityColor("rare") })
      };
    }
    momentOf(receipt) {
      return this.deps.lootMoments.ofReceipt(receipt);
    }
    isMajor(receipt) {
      return this.deps.lootMoments.rank(this.momentOf(receipt)) >= 2;
    }
    importance(receipt) {
      return this.deps.lootMoments.rank(this.momentOf(receipt)) * 100 + this.deps.getRarityRank(receipt.item?.rarity || "normal");
    }
    pileTier(lead, rarity) {
      const rank = this.deps.lootMoments.rank(this.momentOf(lead));
      if (rank >= 3) return "jackpot";
      if (rank === 2) return "major";
      return rank === 1 && this.fxOn("beams", "good") || this.deps.getRarityRank(rarity) >= 2 ? "rare" : "plain";
    }
    fxOn(group, key) {
      return !(this.deps.viewSettings().lootFx && this.deps.viewSettings().lootFx[group] && this.deps.viewSettings().lootFx[group][key] === false);
    }
    notice(kind, text, tone, duration) {
      if (this.fxOn("notices", kind)) this.deps.showGameToast(text, { tone, duration });
    }
    pileKind(lead, currency) {
      return currency ? "currency" : lead.leaf ? "leaf" : "equipment";
    }
    leadArt(lead) {
      return lead.yarn ? YARN_ART : lead.leaf ? LEAF_ART : lead.stump ? this.deps.stumpBox.dropIcon(lead.stump) : lead.gem ? this.deps.getSkillGemArtPath(lead.gem) : this.deps.getInventoryItemVisualAsset(lead.item, lead.itemKind);
    }
    leadName(lead) {
      return lead.stump ? this.deps.stumpBox.dropName(lead.stump) : lead.yarn ? this.deps._t("실타래 {name}", { name: this.deps.knitting.row(lead.yarn).name }) : lead.leaf ? this.deps.memoryLeaves.leaf(lead.leaf).name : lead.gem ? this.deps._t("[{gem}] 룬", { gem: lead.gem }) : this.shownName(lead);
    }
    shownName(receipt) {
      return receipt.unidentified ? `미확인 ${receipt.item.baseName || this.deps.getItemSlotDisplayLabel(receipt.item, "고유")}` : receipt.item.name;
    }
    currencyRow(label, receipt) {
      label.innerHTML = this.deps.styledCurrency(receipt.currency) + (receipt.count > 1 ? " ×" + receipt.count : "");
      label.dataset.currency = receipt.currency;
      const tone = label.querySelector(".orb-tone");
      if (tone) label.style.setProperty("--loot-color", tone.style.getPropertyValue("--orb-tone"));
    }
    nameRow(receipt, index) {
      const label = this.deps.document.createElement("span");
      label.className = "battle-loot-name";
      if (this.isMajor(receipt)) label.classList.add("is-major");
      if (receipt.settled) label.classList.add("is-settled");
      label.style.setProperty("--row", String(receipt.settled === false ? 0 : index));
      label.dataset.rarity = receipt.item?.rarity || "normal";
      label.dataset.moment = this.momentOf(receipt) || "";
      label.style.setProperty("--loot-color", receipt.color || this.deps.getRarityColor(label.dataset.rarity));
      if (receipt.currency) this.currencyRow(label, receipt);
      else label.textContent = this.leadName(receipt);
      if (receipt.leaf) label.dataset.rarity = "leaf";
      this.deps.itemInfluencesUi.markFrame(label, receipt.item);
      return label;
    }
    labelArms(receipts, narrow) {
      const limits = narrow ? ARM_ROWS.narrow : ARM_ROWS.wide;
      const arms = { up: [], right: [], left: [], down: [] };
      receipts.forEach((receipt, index) => {
        const sides = arms.right.length <= arms.left.length ? ["right", "left"] : ["left", "right"];
        const side = ["up", ...sides, "down"].find((name) => arms[name].length < limits[name]);
        if (side) arms[side].push(this.nameRow(receipt, index));
      });
      return ["up", "right", "left", "down"].filter((side) => arms[side].length).map((side) => {
        const arm = this.deps.document.createElement("div");
        arm.className = side === "up" ? "battle-loot-labels" : `battle-loot-labels is-${side}`;
        arms[side].forEach((row) => arm.append(row));
        return arm;
      });
    }
    appearance(marker, receipts, narrow) {
      const lead = receipts[0], item = lead.item, currency = lead.currency && this.deps.getCurrencyInfo(lead.currency);
      marker.dataset.rarity = item?.rarity || "normal";
      marker.dataset.kind = this.pileKind(lead, currency);
      marker.dataset.tier = this.pileTier(lead, marker.dataset.rarity);
      marker.dataset.lead = currency ? currency.name : this.leadName(lead);
      marker.classList.toggle("is-unidentified", !!lead.unidentified);
      if (currency) marker.dataset.currency = lead.currency;
      const arms = this.labelArms(receipts, narrow);
      marker.style.setProperty("--loot-color", arms[0].firstElementChild.style.getPropertyValue("--loot-color"));
      const flight = this.deps.document.createElement("div");
      flight.className = "battle-loot-flight";
      flight.append(this.lootArt(currency ? currency.icon : this.leadArt(lead), item));
      marker.append(flight, ...arms);
      return flight;
    }
    lootArt(src, item) {
      if (src === LEAF_ART) {
        const leaf = this.deps.document.createElement("span");
        leaf.className = "battle-loot-item battle-loot-leaf";
        leaf.innerHTML = this.deps.renderPixelIcon("leaf", "battle-loot-leaf-icon");
        return leaf;
      }
      if (!src) {
        const glyph = this.deps.document.createElement("span");
        glyph.className = "battle-loot-item battle-loot-glyph";
        return glyph;
      }
      const art = this.deps.document.createElement("img");
      art.className = "battle-loot-item";
      art.alt = "";
      art.src = src;
      if (item?.slot === "무기") art.classList.add("weapon");
      return art;
    }
    beam(marker, receipt, height) {
      if (!this.isMajor(receipt) || !this.fxOn("beams", marker.dataset.tier === "jackpot" ? "jackpot" : "great")) return;
      marker.dataset.beam = "true";
      const pillar = this.deps.document.createElement("div");
      pillar.className = "battle-loot-beam";
      marker.prepend(pillar);
      marker.style.setProperty("--beam-height", Math.min(152, height * 0.36) + "px");
      if (marker.dataset.tier === "jackpot") {
        marker.style.setProperty("--beam-color", "#ff5e6c");
        marker.style.setProperty("--beam-core", "#ffe7a3");
        const rays = this.deps.document.createElement("div");
        rays.className = "battle-loot-rays";
        marker.prepend(rays);
        return;
      }
      if (receipt.currency === "burningEmberBranch") {
        marker.style.setProperty("--beam-color", this.deps.EMBER_CORRUPTION_TONE);
        marker.style.setProperty("--beam-core", "#ffe2b8");
      }
      if (receipt.currency !== "goldenRule") return;
      marker.style.setProperty("--beam-color", "#f7d66a");
      marker.style.setProperty("--beam-core", "#fff7d1");
    }
    floorReceipts(pile, fresh) {
      return pile.rows.map((row) => ({ ...this.floorReceipt[this.deps.floorLoot.kindOf(row)](row), row, settled: !fresh.includes(row) })).sort((a, b) => this.importance(b) - this.importance(a));
    }
    restAngle(receipt) {
      return (receipt.item?.slot === "무기" ? 54 : -16) + "deg";
    }
    fineNote(item) {
      const lines = item.rarity === "rare" ? this.deps.lootMoments.fineLines(item) : 0;
      return lines >= this.deps.LOOT_OMENS.fineRare.good ? this.deps._t(", 좋은 옵션 {lines}줄", { lines }) : "";
    }
  };

  // modules/ui/ground-loot-layout.mjs
  var EDGE_PAD = 4;
  var EDGE_GRIP = 12;
  function edgeShift(x, half, width) {
    const atEdge = x < EDGE_PAD + EDGE_GRIP || x > width - EDGE_PAD - EDGE_GRIP;
    const reach = atEdge ? Infinity : Math.max(0, half - EDGE_GRIP), left = x - half, right = x + half;
    const want = left < EDGE_PAD ? EDGE_PAD - left : right > width - EDGE_PAD ? width - EDGE_PAD - right : 0;
    return Math.round(Math.max(-reach, Math.min(reach, want)));
  }
  function setStyle(marker, name, value) {
    if (marker.style.getPropertyValue(name) !== value) marker.style.setProperty(name, value);
  }
  function armWidth(marker, side) {
    return marker.querySelector(`.battle-loot-labels.${side}`)?.offsetWidth || 0;
  }
  function measure(marker, labels) {
    marker.classList.remove("cuts-left", "cuts-right");
    const row = labels.firstElementChild?.offsetHeight || 20;
    const down = marker.querySelector(".battle-loot-labels.is-down");
    marker.dataset.labelRow = String(row);
    marker.dataset.labelHeight = String(labels.offsetHeight || labels.children.length * (row + 2));
    setStyle(marker, "--up-height", marker.dataset.labelHeight + "px");
    marker.dataset.labelHalf = String(labels.offsetWidth / 2);
    marker.dataset.downHalf = String(down ? down.offsetWidth / 2 : 0);
    marker.dataset.leftWidth = String(armWidth(marker, "is-left"));
    marker.dataset.rightWidth = String(armWidth(marker, "is-right"));
  }
  function hideCutSides(marker, x, width) {
    const left = x - 26, right = x + 26;
    marker.classList.toggle("cuts-left", left - Number(marker.dataset.leftWidth) < 0 || left > width);
    marker.classList.toggle("cuts-right", right < 0 || right + Number(marker.dataset.rightWidth) > width);
  }
  function place(marker, point, view, entries) {
    const x = Math.round(point.x), y = Math.round(point.y);
    setStyle(marker, "left", x + "px");
    setStyle(marker, "top", y + "px");
    const labels = marker.querySelector(".battle-loot-labels");
    if (!labels) return;
    if (marker.hidden) return;
    if (!marker.dataset.labelRow) measure(marker, labels);
    const half = Number(marker.dataset.labelHalf), shift = edgeShift(x, half, view.width);
    const height = Number(marker.dataset.labelHeight);
    const above = EDGE_PAD - (y - 30 - height), below = y + 24 + height - (view.height - EDGE_PAD);
    const under = y >= 0 && above > 0 && below < above;
    marker.classList.toggle("is-under", under);
    hideCutSides(marker, x, view.width);
    setStyle(marker, "--label-shift", shift + "px");
    setStyle(marker, "--down-shift", edgeShift(x, Number(marker.dataset.downHalf), view.width) + "px");
    stackLabel(marker, { x, y, half, shift, height, under, floor: view.height - EDGE_PAD, row: Number(marker.dataset.labelRow) }, entries);
  }
  function needsPlacement(marker, point) {
    return marker.style.left !== Math.round(point.x) + "px" || marker.style.top !== Math.round(point.y) + "px" || !marker.hidden && !marker.dataset.labelRow;
  }
  function projectEntries(entries, projection, box) {
    const projected = [];
    let changed = false;
    for (const entry of entries.values()) {
      const point = originFor(entry.cell, projection), marker = entry.marker;
      const off = point.x < -64 || point.y < -64 || point.x > box.width + 64 || point.y > box.height + 64;
      if (marker.hidden !== off) {
        marker.hidden = off;
        changed = true;
        if (!off) delete marker.dataset.labelRow;
      }
      projected.push({ marker, point });
      if (needsPlacement(marker, point)) changed = true;
    }
    if (!changed) return;
    entries.forEach((entry) => {
      delete entry.marker.dataset.labelTop;
    });
    projected.forEach(({ marker, point }) => place(marker, point, box, entries));
  }
  function stackLabel(marker, box, entries) {
    const centre = box.x + box.shift;
    const others = [...entries.keys()].filter((other) => other !== marker && other.dataset.labelTop);
    const overlaps = (top) => others.some((other) => {
      const otherTop = Number(other.dataset.labelTop);
      return top < otherTop + Number(other.dataset.labelHeight) + 2 && otherTop < top + box.height + 2 && Math.abs(Number(other.dataset.labelCentre) - centre) < box.half + Number(other.dataset.labelHalf) + 4;
    });
    const base = box.under ? box.y + 24 : box.y - 30 - box.height, step = box.under ? 1 : -1;
    const fits = (top) => box.under ? top + box.height <= box.floor : top >= EDGE_PAD;
    let lift = 0;
    while (lift < box.row * 5 && fits(base + step * (lift + box.row + 2)) && overlaps(base + step * lift)) lift += box.row + 2;
    marker.dataset.labelTop = String(base + step * lift);
    marker.dataset.labelCentre = String(centre);
    setStyle(marker, "--label-lift", lift + "px");
  }
  function armBoxes(marker) {
    const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
    const lift = parseFloat(marker.style.getPropertyValue("--label-lift")) || 0;
    const shift = parseFloat(marker.style.getPropertyValue("--label-shift")) || 0;
    const downShift = parseFloat(marker.style.getPropertyValue("--down-shift")) || 0;
    const under = marker.classList.contains("is-under"), upHeight = Number(marker.dataset.labelHeight) || 0;
    return [...marker.children].filter((arm) => String(arm.className).startsWith("battle-loot-labels") && !arm.hidden).map((arm) => {
      const w = arm.offsetWidth, h = arm.offsetHeight || arm.children.length * 25;
      const side = arm.className.replace("battle-loot-labels", "").trim();
      if (side === "is-right") return { arm, side, left: x + 26, right: x + 26 + w, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
      if (side === "is-left") return { arm, side, left: x - 26 - w, right: x - 26, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
      if (side === "is-down") {
        const top2 = under ? y + 26 + lift + upHeight : y + 24;
        return { arm, side, left: x - w / 2 + downShift, right: x + w / 2 + downShift, top: top2, bottom: top2 + h };
      }
      const top = under ? y + 24 + lift : y - 30 - lift - h;
      return { arm, side: "up", left: x - w / 2 + shift, right: x + w / 2 + shift, top, bottom: top + h };
    });
  }
  function yieldCrowdedArms(marker, entries) {
    const taken = [...entries.keys()].filter((other) => other !== marker).flatMap(armBoxes);
    const hits = (box) => taken.some((other) => box.left < other.right && other.left < box.right && box.top < other.bottom && other.top < box.bottom);
    armBoxes(marker).filter((box) => box.side !== "up" && hits(box)).forEach((box) => {
      box.arm.hidden = true;
    });
  }
  function originFor(cell, projection) {
    const point = projection.cellToScreen(cell.gx, cell.gy);
    return { x: point.x, y: point.y + projection.actorGroundOffsetY };
  }

  // modules/ui/ground-loot-motion.mjs
  function fly(flight, marker, point, config) {
    const dx = point.x - parseFloat(marker.style.left), dy = point.y - parseFloat(marker.style.top);
    const frames = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map((t) => ({
      offset: t,
      transform: `translate(${dx * (1 - t)}px,${dy * (1 - t) - 4 * t * (1 - t) * Math.min(65, 35 + Math.hypot(dx, dy) * 0.2)}px)`
    }));
    const duration = config.reduced ? 1 : config.drop.flightMs + Math.abs(dx) % config.drop.flightSpreadMs;
    flight.animate(frames, { duration, fill: "backwards" });
    const art = flight.firstElementChild, rest = config.getComputedStyle(art).transform;
    art.animate([{ transform: rest + " rotate(-45deg) scale(.75)" }, { transform: rest }], { duration, fill: "backwards" });
    return duration;
  }
  function landingPop(art, tier) {
    const shadow = "drop-shadow(1px 2px 1px #14130f)", flash = tier === "plain" ? 1 : 2;
    art.animate([
      { translate: "0 0", scale: "1.3 .76", filter: `${shadow} brightness(${flash})` },
      { translate: "0 -7px", scale: ".9 1.12", offset: 0.38 },
      { translate: "0 0", scale: "1 1", filter: `${shadow} brightness(1)` }
    ], { duration: 280, easing: "ease-out" });
  }

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

  // modules/ui/ground-loot-view.mjs
  var GroundLootView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.presentation = new GroundLootPresentation(deps);
      this.ground = void 0;
      this.air = void 0;
      this.foreground = void 0;
      this.canvas = void 0;
      this.geometry = "";
      this.zone = void 0;
      this.epoch = void 0;
      this.seen = /* @__PURE__ */ new WeakSet();
      this.entries = /* @__PURE__ */ new Map();
      this.motes = /* @__PURE__ */ new Set();
      this.dropQueue = [];
      this.dropQueueEnd = 0;
      this.floorPiles = /* @__PURE__ */ new Map();
      this.landedFloorIds = /* @__PURE__ */ new Set();
      this.talismanKeys = /* @__PURE__ */ new WeakMap();
      this.nextTalismanKey = 0;
      this.flyers = /* @__PURE__ */ new Map();
      this.reported = /* @__PURE__ */ new Set();
      this.reveals = /* @__PURE__ */ new Map();
      this.stateIdentity = void 0;
      this.runIdentity = void 0;
      for (const name of ["reduced", "narrow", "displayLimit", "later", "remove", "clear", "mount", "canvasBox", "resize", "room", "spawn", "launch", "land", "absorb", "absorbMote", "receive", "pendingDrops", "consume", "revealUnique", "floorRowKey", "pickFloor", "drawPile", "floorMarker", "launchFlyer", "syncFlyers", "addFloorPile", "syncFloor", "visible", "prepare", "hasPresentation", "prepared", "actorContext", "onIncident", "onAtlasFind", "onFloorCollected"]) this[name] = this[name].bind(this);
    }
    start() {
      listenView(this, this.deps.eventTarget, "project-idle:incident", this.onIncident);
      listenView(this, this.deps.eventTarget, "project-idle:atlas-find", this.onAtlasFind);
      listenView(this, this.deps.eventTarget, "project-idle:floor-loot-collected", this.onFloorCollected);
      listenView(this, this.deps.document, "visibilitychange", () => {
        if (this.deps.document.hidden) this.clear();
      });
    }
    dispose() {
      if (!this.active) return;
      releaseViewEvents(this);
      this.unmount();
      this.landedFloorIds.clear();
      this.talismanKeys = /* @__PURE__ */ new WeakMap();
      this.seen = /* @__PURE__ */ new WeakSet();
      this.reported.clear();
      this.stateIdentity = this.runIdentity = void 0;
    }
    unmount() {
      this.clear();
      for (const node of [this.ground, this.air, this.foreground]) node?.remove();
      this.ground = this.air = this.foreground = this.canvas = void 0;
      this.geometry = "";
    }
    refreshContext(run) {
      const state = this.deps.stateIdentity(), zone = this.deps.viewRegion();
      const epoch = this.deps.battleVisualState.lootEpoch;
      if (this.stateIdentity === state && this.runIdentity === run && this.zone === zone && this.epoch === epoch) return;
      const replaced = this.stateIdentity !== state || this.runIdentity !== run;
      this.clear();
      this.stateIdentity = state;
      this.runIdentity = run;
      this.zone = zone;
      this.epoch = epoch;
      this.seen = /* @__PURE__ */ new WeakSet();
      if (replaced) {
        this.talismanKeys = /* @__PURE__ */ new WeakMap();
        this.nextTalismanKey = 0;
        this.landedFloorIds.clear();
        this.dropQueueEnd = 0;
      }
    }
    reduced() {
      return this.deps.uiDisplay.reducedEffects();
    }
    narrow() {
      return this.canvasBox(this.canvas).width < 600;
    }
    displayLimit() {
      return this.narrow() ? 16 : 24;
    }
    later(entry, action, delay) {
      const state = this.deps.stateIdentity(), run = this.deps.viewRun();
      const timer = this.deps.setTimeout(() => {
        entry.timers.delete(timer);
        if (this.active && this.deps.stateIdentity() === state && this.deps.viewRun() === run) action();
      }, delay);
      entry.timers.add(timer);
    }
    remove(entry) {
      entry.timers.forEach(this.deps.clearTimeout);
      entry.timers.clear();
      entry.marker.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      entry.marker.remove();
      this.entries.delete(entry.marker);
    }
    clear() {
      this.entries.forEach(this.remove);
      this.floorPiles.clear();
      this.flyers.clear();
      this.dropQueue.length = 0;
      this.motes.forEach((mote) => {
        mote.getAnimations().forEach((animation) => animation.cancel());
        mote.remove();
      });
      this.motes.clear();
      this.reveals.forEach((timer, label) => {
        this.deps.clearTimeout(timer);
        label.remove();
      });
      this.reveals.clear();
      if (this.foreground) {
        this.foreground.width = 1;
        this.foreground.height = 1;
        this.foreground.hidden = true;
      }
    }
    mount(source) {
      this.canvas = source;
      this.ground = this.deps.document.createElement("div");
      this.ground.className = "battle-loot-layer";
      this.air = this.deps.document.createElement("div");
      this.air.className = "battle-loot-air";
      this.foreground = this.deps.document.createElement("canvas");
      this.foreground.className = "battle-loot-foreground";
      [this.ground, this.foreground, this.air].forEach((node) => this.canvas.parentElement.append(node));
      [this.foreground, this.air].forEach((node) => node.setAttribute("aria-hidden", "true"));
    }
    canvasBox(source) {
      if (source.id === "battlefield-canvas" && typeof this.deps.battleCanvasBox === "object") return this.deps.battleCanvasBox.read(source);
      const hidden = source.offsetParent === null;
      return { width: hidden ? 0 : source.clientWidth, height: hidden ? 0 : source.clientHeight, left: source.offsetLeft, top: source.offsetTop };
    }
    resize() {
      const box = this.canvasBox(this.canvas), next = [box.left, box.top, box.width, box.height].join(":");
      if (this.geometry === next) return;
      this.geometry = next;
      this.entries.forEach((entry) => {
        delete entry.marker.dataset.labelRow;
      });
      const rect = { left: box.left + "px", top: box.top + "px", width: box.width + "px", height: box.height + "px" };
      [this.ground, this.foreground, this.air].forEach((node) => Object.assign(node.style, rect));
      this.ground.style.setProperty("--loot-width", box.width + "px");
    }
    room(important) {
      if (this.entries.size < this.displayLimit()) return true;
      const oldest = [...this.entries.values()].find((entry) => !entry.floor && entry.marker.dataset.beam !== "true");
      if (!oldest && !important) return false;
      this.remove(oldest || this.entries.values().next().value);
      return true;
    }
    spawn(receipts, cell, projection) {
      const important = receipts.some(this.presentation.isMajor);
      if (!this.room(important)) return;
      const marker = this.deps.document.createElement("div");
      marker.className = "battle-loot-drop";
      marker.setAttribute("aria-hidden", "true");
      const point = originFor(cell, projection);
      marker.dataset.gx = String(cell.gx);
      marker.dataset.gy = String(cell.gy);
      marker.style.setProperty("--rest-angle", (receipts[0].item?.slot === "무기" ? 54 : -16) + "deg");
      const flight = this.presentation.appearance(marker, receipts, this.narrow());
      this.presentation.beam(marker, receipts[0], this.canvasBox(this.canvas).height);
      this.ground.append(marker);
      place(marker, point, this.canvasBox(this.canvas), this.entries);
      yieldCrowdedArms(marker, this.entries);
      const entry = { marker, cell: { gx: cell.gx, gy: cell.gy }, timers: /* @__PURE__ */ new Set() };
      this.entries.set(marker, entry);
      this.launch(entry, flight, point);
      this.later(entry, () => this.absorb(entry), important ? 3300 : 2400);
    }
    launch(entry, flight, point, tier = entry.marker.dataset.tier) {
      this.later(entry, () => this.land(entry, tier), fly(flight, entry.marker, point, { reduced: this.reduced(), drop: this.deps.GROUND_LOOT_DROP, getComputedStyle: this.deps.getComputedStyle }));
    }
    land(entry, tier) {
      entry.marker.classList.add("landed");
      const contact = this.deps.document.createElement("span");
      contact.className = "battle-loot-contact";
      entry.marker.append(contact);
      if (tier !== "plain" && typeof this.deps.playLootDropSound === "function") this.deps.playLootDropSound(tier === "major" || tier === "jackpot");
      if (!this.reduced()) landingPop(entry.marker.querySelector(".battle-loot-item"), tier);
      this.later(entry, () => contact.remove(), 550);
    }
    absorb(entry) {
      const marker = entry.marker;
      const from = { x: parseFloat(marker.style.left), y: parseFloat(marker.style.top) };
      const to = { x: this.deps.battleVisualState.playerPos.x, y: this.deps.battleVisualState.playerPos.y - 24 };
      marker.classList.add("collected");
      if (!this.reduced()) {
        for (let trail = 0; trail < 3; trail++) this.absorbMote(from, to, marker.style.getPropertyValue("--loot-color"), trail);
      }
      this.later(entry, () => this.remove(entry), 200);
    }
    absorbMote(from, to, color, trail) {
      if (this.motes.size >= 48) return;
      const mote = this.deps.document.createElement("span");
      mote.className = "battle-loot-mote";
      mote.style.setProperty("--loot-color", color);
      mote.style.left = from.x + "px";
      mote.style.top = from.y + "px";
      this.air.append(mote);
      this.motes.add(mote);
      const dx = to.x - from.x, dy = to.y - from.y;
      const frames = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map((t) => ({
        offset: t,
        transform: `translate(${dx * t}px,${dy * t - Math.sin(t * Math.PI) * 24}px) rotate(${Math.atan2(dy - Math.cos(t * Math.PI) * 24 * Math.PI, dx) * 180 / Math.PI}deg) scale(${(1 - 0.7 * t) * (1 - trail * 0.18)})`,
        opacity: (1 - 0.35 * t) * (1 - trail * 0.28)
      }));
      const animation = mote.animate(frames, { duration: 540, delay: trail * 32, fill: "both", easing: "cubic-bezier(.42,0,.76,.5)" });
      const state = this.deps.stateIdentity(), run = this.deps.viewRun();
      animation.onfinish = () => {
        const shown = this.motes.delete(mote);
        mote.remove();
        if (shown && this.active && trail === 0 && this.deps.stateIdentity() === state && this.deps.viewRun() === run) this.receive(to, color);
      };
    }
    receive(to, color) {
      if (this.motes.size >= 48 || this.reduced()) return;
      const flash = this.deps.document.createElement("span");
      flash.className = "battle-loot-receive";
      flash.style.left = to.x + "px";
      flash.style.top = to.y + "px";
      flash.style.setProperty("--loot-color", color);
      this.air.append(flash);
      this.motes.add(flash);
      flash.addEventListener("animationend", () => {
        flash.remove();
        this.motes.delete(flash);
      }, { once: true });
    }
    pendingDrops(now) {
      return this.deps.battleFx.filter((fx) => {
        if (!fx.loot || this.seen.has(fx) || fx.start > now) return false;
        this.seen.add(fx);
        return now - fx.start <= 500 && fx.loot.zoneId === this.deps.viewRegion();
      });
    }
    consume(now, projection) {
      const pending = this.pendingDrops(now).sort((a, b) => this.presentation.importance(b.loot) - this.presentation.importance(a.loot));
      for (const fx of pending) {
        if (!this.deps.hasGridCell(fx.loot.sourceCell) || fx.loot.currency && !(fx.loot.count > 0)) continue;
        const turn = Math.max(now, Math.min(this.dropQueueEnd, now + this.deps.GROUND_LOOT_DROP.queueCapMs));
        this.dropQueueEnd = turn + this.deps.GROUND_LOOT_DROP.gapMs;
        this.dropQueue.push({ receipt: fx.loot, turn });
      }
      while (this.dropQueue.length && this.dropQueue[0].turn <= now) {
        const { receipt } = this.dropQueue.shift();
        this.spawn([receipt], receipt.sourceCell, projection);
      }
    }
    revealUnique(item, fresh) {
      const jackpot = this.deps.lootMoments.ofItem(item) === "jackpot";
      if (typeof this.deps.playLootDropSound === "function") this.deps.playLootDropSound(true);
      if (jackpot) this.presentation.notice("chase", this.deps._t("체이싱 고유 장비를 획득했습니다. 「{name}」", { name: item.name }), "chase", 6e3);
      if (fresh) this.presentation.notice("codex", this.deps._t("도감에 고유 장비를 등록했습니다. 「{name}」", { name: item.name }), "unique", 4500);
      if (!this.air || !this.deps.battleVisualState.playerPos) return;
      const label = this.deps.document.createElement("span");
      label.className = `battle-loot-reveal${jackpot ? " is-jackpot" : ""}${fresh ? " is-new" : ""}`;
      label.textContent = `「${item.name}」`;
      if (fresh) label.prepend(Object.assign(this.deps.document.createElement("b"), { textContent: "새 고유" }));
      label.style.left = this.deps.battleVisualState.playerPos.x + "px";
      label.style.top = this.deps.battleVisualState.playerPos.y - 40 + "px";
      this.air.append(label);
      const timer = this.deps.setTimeout(() => {
        this.reveals.delete(label);
        label.remove();
      }, 2400);
      this.reveals.set(label, timer);
    }
    floorRowKey(row) {
      if (["talisman", "stump", "leaf", "yarn", "gem", "rune"].includes(row.kind)) {
        if (!this.talismanKeys.has(row)) this.talismanKeys.set(row, `talisman#${++this.nextTalismanKey}`);
        return this.talismanKeys.get(row);
      }
      return row.item ? `item#${row.item.id}` : `${row.currency}@${row.gx},${row.gy}`;
    }
    pickFloor(event, entry) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.active || !entry.floor || !entry.marker.isConnected) return;
      if (entry.run !== this.deps.viewRun() || entry.state !== this.deps.stateIdentity()) return;
      this.deps.actExplorationProgress.collectPile(entry.cell);
    }
    drawPile(entry, receipts) {
      const marker = entry.marker, lead = this.floorRowKey(receipts[0].row);
      if (entry.lead === lead) {
        marker.querySelectorAll(":scope > .battle-loot-labels").forEach((arm) => arm.remove());
        marker.append(...this.presentation.labelArms(receipts, this.narrow()));
        return;
      }
      entry.lead = lead;
      marker.replaceChildren();
      marker.style.setProperty("--rest-angle", this.presentation.restAngle(receipts[0]));
      this.presentation.appearance(marker, receipts, this.narrow());
      this.presentation.beam(marker, receipts[0], this.canvasBox(this.canvas).height);
    }
    floorMarker(entry, pile, projection, fresh) {
      const marker = entry.marker, receipts = this.presentation.floorReceipts(pile, fresh);
      delete marker.dataset.labelRow;
      this.drawPile(entry, receipts);
      const names = receipts.map((receipt) => receipt.currency ? `${this.deps.getCurrencyInfo(receipt.currency).name} ×${receipt.count}` : this.presentation.leadName(receipt));
      marker.setAttribute("aria-label", `줍기: ${names.slice(0, 3).join(", ")}${names.length > 3 ? this.deps._t(" 외 {value}개", { value: names.length - 3 }) : ""}`);
      place(marker, originFor(entry.cell, projection), this.canvasBox(this.canvas), this.entries);
      yieldCrowdedArms(marker, this.entries);
      if (fresh.length) {
        const lead = this.presentation.floorReceipts({ rows: fresh }, fresh)[0];
        this.land(entry, this.presentation.pileTier(lead, lead.item?.rarity || "normal"));
      } else marker.classList.add("landed");
    }
    launchFlyer(key, row, projection) {
      const marker = this.deps.document.createElement("div");
      marker.className = "battle-loot-drop";
      marker.setAttribute("aria-hidden", "true");
      const receipt = this.presentation.floorReceipts({ rows: [row] }, [row])[0];
      marker.style.setProperty("--rest-angle", this.presentation.restAngle(receipt));
      const flight = this.presentation.appearance(marker, [receipt], this.narrow());
      marker.querySelectorAll(".battle-loot-labels").forEach((arm) => arm.remove());
      marker.dataset.labelRow = "0";
      this.ground.append(marker);
      const point = originFor(row, projection);
      place(marker, point, this.canvasBox(this.canvas), this.entries);
      const entry = { marker, cell: { gx: row.gx, gy: row.gy }, timers: /* @__PURE__ */ new Set(), floor: true };
      this.entries.set(marker, entry);
      this.flyers.set(key, entry);
      fly(flight, marker, point, { reduced: this.reduced(), drop: this.deps.GROUND_LOOT_DROP, getComputedStyle: this.deps.getComputedStyle });
    }
    syncFlyers(run, now, projection) {
      const airborne = new Map((run ? this.deps.floorLoot.inAir(run, now) : []).map((row) => [this.floorRowKey(row), row]));
      airborne.forEach((row, key) => {
        if (!this.flyers.has(key)) this.launchFlyer(key, row, projection);
      });
      this.flyers.forEach((entry, key) => {
        if (!airborne.has(key)) {
          this.flyers.delete(key);
          this.remove(entry);
        }
      });
    }
    addFloorPile(key, pile) {
      const marker = this.deps.document.createElement("div");
      marker.className = "battle-loot-drop is-floor";
      marker.setAttribute("role", "button");
      marker.tabIndex = 0;
      marker.dataset.gx = String(pile.gx);
      marker.dataset.gy = String(pile.gy);
      const entry = {
        marker,
        cell: { gx: pile.gx, gy: pile.gy },
        timers: /* @__PURE__ */ new Set(),
        floor: true,
        ids: "",
        run: this.deps.viewRun(),
        state: this.deps.stateIdentity()
      };
      marker.addEventListener("click", (event) => this.pickFloor(event, entry));
      marker.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") this.pickFloor(event, entry);
      });
      this.ground.append(marker);
      this.entries.set(marker, entry);
      this.floorPiles.set(key, entry);
      return entry;
    }
    syncFloor(projection) {
      const run = this.deps.viewRun(), now = this.deps.getCombatTime();
      this.syncFlyers(run, now, projection);
      const piles = run ? this.deps.floorLoot.piles(run, now) : [];
      const live = /* @__PURE__ */ new Set(), liveRows = /* @__PURE__ */ new Set();
      for (const pile of piles) {
        pile.rows.forEach((row) => liveRows.add(this.floorRowKey(row)));
        const key = `${pile.gx},${pile.gy}`, ids = pile.rows.map((row) => `${this.floorRowKey(row)}:${row.count || 1}`).join(",");
        live.add(key);
        const existing = this.floorPiles.get(key), entry = existing || this.addFloorPile(key, pile);
        if (entry.ids === ids) continue;
        const fresh = pile.rows.filter((row) => !this.landedFloorIds.has(this.floorRowKey(row)));
        this.floorMarker(entry, pile, projection, fresh);
        entry.ids = ids;
        pile.rows.forEach((row) => this.landedFloorIds.add(this.floorRowKey(row)));
      }
      for (const id of this.landedFloorIds) if (!liveRows.has(id)) this.landedFloorIds.delete(id);
      for (const [key, entry] of this.floorPiles) {
        if (live.has(key)) continue;
        this.floorPiles.delete(key);
        entry.floor = false;
        entry.marker.removeAttribute("role");
        entry.marker.tabIndex = -1;
        this.absorb(entry);
      }
    }
    visible(source) {
      const box = this.canvasBox(source);
      return box.width > 0 && box.height > 0 && !this.deps.document.hidden && !this.deps.viewBackground();
    }
    hasIncomingDrops(run) {
      return this.deps.battleFx.some((fx) => fx.loot) || !!(run && run.groundLoot && run.groundLoot.length);
    }
    prepare(source, now, projection) {
      if (!this.active) return false;
      if (!this.visible(source)) {
        this.clear();
        return false;
      }
      const run = this.deps.viewRun();
      this.refreshContext(run);
      if (this.canvas && this.canvas !== source) this.unmount();
      if (!this.canvas && !this.hasIncomingDrops(run)) return false;
      if (!this.canvas) this.mount(source);
      this.resize();
      projectEntries(this.entries, projection, this.canvasBox(this.canvas));
      this.consume(now, projection);
      this.syncFloor(projection);
      return this.hasPresentation();
    }
    hasPresentation() {
      if (this.entries.size || this.motes.size) return true;
      if (!this.foreground.hidden) {
        this.foreground.hidden = true;
        this.foreground.width = 1;
        this.foreground.height = 1;
      }
      return false;
    }
    prepared(source, now, projection) {
      try {
        return this.prepare(source, now, projection);
      } catch (error) {
        const message = String(error && error.message);
        if (!this.reported.has(message)) {
          this.reported.add(message);
          this.deps.console.error("ground loot layer failed:", error);
        }
        this.clear();
        return false;
      }
    }
    actorContext(source, ctx, now, projection) {
      if (!this.prepared(source, now, projection)) return ctx;
      this.foreground.hidden = false;
      if (this.foreground.width !== this.canvas.width || this.foreground.height !== this.canvas.height) {
        this.foreground.width = this.canvas.width;
        this.foreground.height = this.canvas.height;
      }
      const next = this.foreground.getContext("2d");
      next.resetTransform();
      next.clearRect(0, 0, this.foreground.width, this.foreground.height);
      next.setTransform(ctx.getTransform());
      next.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      next.imageSmoothingQuality = ctx.imageSmoothingQuality;
      return next;
    }
    onIncident({ detail }) {
      return this.presentation.notice(detail.chase ? "chase" : "treasure", detail.text, detail.tone, detail.chase ? 6e3 : 3200);
    }
    onAtlasFind({ detail }) {
      if (detail.kind !== "treasure") return;
      if (detail.golden) this.presentation.notice("chase", "황금 보물을 발견했습니다.", "chase", 6e3);
      else this.presentation.notice("treasure", "보물을 발견했습니다.", "reward", 3600);
      if (this.deps.viewSettings().showLootLog) this.deps.addLog(this.deps._t("💰 {name}: 보물 {count}개", { name: this.deps._t(detail.name), count: detail.count }), detail.golden ? "loot-unique" : "loot-rare");
    }
    onFloorCollected({ detail }) {
      const fresh = new Set(detail.fresh || []);
      detail.items.filter((item) => item.rarity === "unique").forEach((item) => this.revealUnique(item, fresh.has(item.id)));
      if (!this.deps.viewSettings().showLootLog) return;
      detail.currencies.forEach(({ key, count }) => this.deps.addLog(
        `🪙 ${this.deps.styledCurrency(key)} +${count}`,
        this.deps.lootMoments.rank(this.deps.lootMoments.ofCurrency(key)) >= 1 ? "loot-unique" : "loot-magic"
      ));
      detail.items.forEach((item) => this.deps.addLog(this.deps._t("🛡️ <span class='loot-{rarity}'>[{name}]</span> 획득!{item}", { rarity: item.rarity, name: this.deps._t(item.name), item: this.presentation.fineNote(item) }), "", { item }));
    }
  };
  function createGroundLootView(deps) {
    const owner = new GroundLootView(deps);
    owner.start();
    return Object.freeze({ actorContext: owner.actorContext, dispose: () => owner.dispose() });
  }

  // modules/battle-ground-loot-ui-classic.mjs
  var battleGroundLoot = createGroundLootView({
    get EMBER_CORRUPTION_TONE() {
      return typeof EMBER_CORRUPTION_TONE === "undefined" ? void 0 : EMBER_CORRUPTION_TONE;
    },
    get GROUND_LOOT_DROP() {
      return typeof GROUND_LOOT_DROP === "undefined" ? void 0 : GROUND_LOOT_DROP;
    },
    get LOOT_OMENS() {
      return typeof LOOT_OMENS === "undefined" ? void 0 : LOOT_OMENS;
    },
    get MEMORY_LEAVES() {
      return typeof MEMORY_LEAVES === "undefined" ? void 0 : MEMORY_LEAVES;
    },
    get STUMP_BOX_COLORS() {
      return typeof STUMP_BOX_COLORS === "undefined" ? void 0 : STUMP_BOX_COLORS;
    },
    get TALISMAN_RARITY_TONES() {
      return typeof TALISMAN_RARITY_TONES === "undefined" ? void 0 : TALISMAN_RARITY_TONES;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get actExplorationProgress() {
      return typeof actExplorationProgress === "undefined" ? void 0 : actExplorationProgress;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get battleCanvasBox() {
      return window.GameModules.battlefieldPresentation?.canvasBox;
    },
    get battleFx() {
      return typeof battleFx === "undefined" ? void 0 : battleFx;
    },
    get battleVisualState() {
      return typeof battleVisualState === "undefined" ? void 0 : battleVisualState;
    },
    clearTimeout: clearTimeout.bind(window),
    get console() {
      return typeof console === "undefined" ? void 0 : console;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get floorLoot() {
      return actExplorationState.groundLoot;
    },
    get getCombatTime() {
      return typeof getCombatTime === "undefined" ? void 0 : getCombatTime;
    },
    getComputedStyle: getComputedStyle.bind(window),
    get getCurrencyInfo() {
      return typeof getCurrencyInfo === "undefined" ? void 0 : getCurrencyInfo;
    },
    get getInventoryItemVisualAsset() {
      return typeof getInventoryItemVisualAsset === "undefined" ? void 0 : getInventoryItemVisualAsset;
    },
    get getItemSlotDisplayLabel() {
      return typeof getItemSlotDisplayLabel === "undefined" ? void 0 : getItemSlotDisplayLabel;
    },
    get getJewelLootColor() {
      return typeof getJewelLootColor === "undefined" ? void 0 : getJewelLootColor;
    },
    get getRarityColor() {
      return typeof getRarityColor === "undefined" ? void 0 : getRarityColor;
    },
    get getRarityRank() {
      return typeof getRarityRank === "undefined" ? void 0 : getRarityRank;
    },
    get getSkillGemArtPath() {
      return typeof getSkillGemArtPath === "undefined" ? void 0 : getSkillGemArtPath;
    },
    get hasGridCell() {
      return typeof hasGridCell === "undefined" ? void 0 : hasGridCell;
    },
    get itemInfluencesUi() {
      return typeof itemInfluencesUi === "undefined" ? void 0 : itemInfluencesUi;
    },
    get knitting() {
      return typeof knitting === "undefined" ? void 0 : knitting;
    },
    get lootMoments() {
      return typeof lootMoments === "undefined" ? void 0 : lootMoments;
    },
    get memoryLeaves() {
      return typeof memoryLeaves === "undefined" ? void 0 : memoryLeaves;
    },
    get playLootDropSound() {
      return typeof playLootDropSound === "undefined" ? void 0 : playLootDropSound;
    },
    get renderPixelIcon() {
      return typeof renderPixelIcon === "undefined" ? void 0 : renderPixelIcon;
    },
    setTimeout: setTimeout.bind(window),
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get styledCurrency() {
      return window.getStyledOrbName;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    },
    viewBackground: () => game.isBackgroundCalculation,
    viewRegion: () => game.currentZoneId,
    viewRun: () => actExplorationState.current(game),
    viewSettings: () => game.settings,
    eventTarget: window,
    stateIdentity: () => game
  });
  window.GameModules.groundLootView = battleGroundLoot;
  safeExposeGlobals({ battleGroundLoot });
})();
