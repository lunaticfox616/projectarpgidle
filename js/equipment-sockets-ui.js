// GENERATED from modules/equipment-sockets-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/equipment-socket-actions.mjs
  function jewelLines(runtime, jewel) {
    return (0, runtime.deps.getJewelStats)(jewel).map((stat) => `${(0, runtime.deps.isJewelPetiteStat)(stat) ? (0, runtime.deps._t)("쁘띠 ") : ""}${(0, runtime.deps.getStatName)(stat.id)} +${(0, runtime.deps.formatJewelStatValue)(stat.id, stat.val)}`);
  }
  function jewelHtml(runtime, jewel) {
    const lines = jewelLines(runtime, jewel).map((line) => `<li>${(0, runtime.deps.escapeHTML)(line)}</li>`).join("");
    const text = (0, runtime.deps.getJewelUniqueEffectText)(jewel), effect = text ? `<p class="socket-jewel-effect">${(0, runtime.deps.escapeHTML)(text)}</p>` : "";
    return `<strong class="${(0, runtime.deps.getJewelRarityClass)(jewel.rarity)}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(jewel.name || "주얼"))}</strong>${effect}<ul class="socket-jewel-lines">${lines || (0, runtime.deps._t)("<li>옵션 없음</li>")}</ul>`;
  }
  function actionHtml(runtime, item, slot) {
    if (!item || !runtime.deps.contentProgression.isUnlocked("jewel")) return "";
    const sockets = runtime.deps.equipmentSockets.list(item);
    const canOpen = (runtime.deps.game.currencies.voidChisel || 0) > 0 && runtime.deps.equipmentSockets.canChisel(item);
    if (!sockets.length && !canOpen) return "";
    const label = sockets.length ? (0, runtime.deps._t)("소켓 {length}/{length2}", { length: sockets.filter(runtime.handlers.contentOf).length, length2: sockets.length }) : "소켓 뚫기";
    const ref = slot ? `'${slot}',true` : `${item.id},false`;
    return `<button type="button" data-content-action="sockets" onclick="equipmentInventoryInteraction.focus(null);equipmentSocketsUi.open(${ref})"><span class="px-center">${label}</span></button>`;
  }
  function hostItem(runtime, host) {
    const [kind, key] = String(host).split(":");
    return kind === "slot" ? (runtime.deps.game.equipment || {})[key] || null : runtime.deps.game.inventory.find((item) => String(item.id) === key) || null;
  }
  function contentOf(runtime, row) {
    if (row.jewel) return { name: row.jewel.name || "주얼", art: runtime.deps.bagItems.jewelArt(row.jewel) };
    return row.harvest ? { name: runtime.deps.stumpBox.shortName(row.harvest), art: runtime.deps.stumpBox.iconPath(row.harvest) } : null;
  }
  function socketBadgeHtml(runtime, row, host) {
    const content = contentOf(runtime, row), art = content ? `<img src="${content.art}" alt="" aria-hidden="true" draggable="false">` : "";
    const name = content ? `${runtime.state.socketLabel(row)}: ${content.name}` : (0, runtime.deps._t)("빈 {row}", { row: runtime.state.socketLabel(row) });
    return `<span class="item-socket ${socketClass(runtime, row)}" role="button" aria-label="${(0, runtime.deps.escapeHTML)(name)}"
            data-socket-kind="${row.kind}" data-socket-index="${row.index}" onpointerdown="event.stopPropagation()" ondblclick="event.stopPropagation()"
            onclick="equipmentSocketsUi.socketClick(event,'${host}','${row.kind}',${row.index})">${art}</span>`;
  }
  function badgesHtml(runtime, item, host) {
    if (!item || !runtime.deps.contentProgression.isUnlocked("jewel")) return "";
    const sockets = runtime.deps.equipmentSockets.list(item);
    return sockets.length ? `<span class="item-sockets" data-socket-host="${host}">${sockets.map((row) => socketBadgeHtml(runtime, row, host)).join("")}</span>` : "";
  }
  function socketChanged(runtime, message) {
    (0, runtime.deps.addLog)(message, "loot-magic");
    (0, runtime.deps.hideItemTooltip)();
    (0, runtime.deps.updateStaticUI)();
  }
  function removedMessage(runtime, item, result) {
    if (result.jewel) return `💠 [${item.name}]에서 [${result.jewel.name}]${(0, runtime.deps.pickParticle)(result.jewel.name, "을", "를")} 뺐습니다.`;
    const name = runtime.deps.stumpBox.shortName(result.harvest);
    return `🌱 [${item.name}]에서 [${name}]${(0, runtime.deps.pickParticle)(name, "을", "를")} 빼 그루터기 함 보관함에 넣었습니다.`;
  }
  function socketClick(runtime, event, host, kind, index) {
    event.stopPropagation();
    const item = hostItem(runtime, host), row = item && runtime.deps.equipmentSockets.list(item).find((entry) => entry.kind === kind && entry.index === index);
    if (!row) return;
    if (!contentOf(runtime, row)) {
      const [where, key] = host.split(":");
      return where === "slot" ? open(runtime, key, true) : open(runtime, Number(key), false);
    }
    const result = runtime.deps.equipmentSockets.remove(item, kind, index);
    if (!result.ok) return (0, runtime.deps.addLog)(result.reason, "attack-monster", { toast: true });
    (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    socketChanged(runtime, removedMessage(runtime, item, result));
  }
  function dropJewel(runtime, jewel, host, at) {
    const item = hostItem(runtime, host);
    if (!item || !runtime.deps.bagItems.isJewel(jewel)) return false;
    const result = runtime.deps.equipmentSockets.insert(item, jewel.id, runtime.deps.game, at);
    if (!result.ok) {
      (0, runtime.deps.addLog)(result.reason, "attack-monster", { toast: true });
      return true;
    }
    (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    socketChanged(runtime, (0, runtime.deps._t)("💠 [{name}]에 [{name2}] 장착", { name: item.name, name2: result.jewel.name }));
    return true;
  }
  function harvestHtml(runtime, grown) {
    const lines = harvestLines(runtime, grown).map((line) => `<li>${(0, runtime.deps.escapeHTML)(line)}</li>`).join("");
    return `<strong class="socket-harvest-name">${(0, runtime.deps.escapeHTML)(runtime.deps.stumpBox.shortName(grown))}</strong><ul class="socket-jewel-lines">${lines}</ul>`;
  }
  function tooltipHtml(runtime, item) {
    const sockets = runtime.deps.contentProgression.isUnlocked("jewel") ? runtime.deps.equipmentSockets.list(item) : [];
    return sockets.map((row) => {
      if (row.jewel) return `<div class="tooltip-line tooltip-socket-line">◆ ${runtime.state.socketLabel(row)}: <span class="${(0, runtime.deps.getJewelRarityClass)(row.jewel.rarity)}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.jewel.name || "주얼"))}</span>, ${(0, runtime.deps.escapeHTML)(jewelLines(runtime, row.jewel).join(", "))}</div>`;
      if (row.harvest) return `<div class="tooltip-line tooltip-socket-line is-harvest">◆ ${runtime.state.socketLabel(row)}: ${(0, runtime.deps.escapeHTML)(runtime.deps.stumpBox.shortName(row.harvest))}, ${(0, runtime.deps.escapeHTML)(harvestLines(runtime, row.harvest).join(", "))}</div>`;
      return `<div class="tooltip-line tooltip-socket-line is-empty">◇ 빈 ${runtime.state.socketLabel(row)}${row.accepts.length ? ` (${takesText(runtime, row)})` : ""}</div>`;
    }).join("");
  }
  function socketRowHtml(runtime, row) {
    const filled = contentOf(runtime, row), body = row.jewel ? jewelHtml(runtime, row.jewel) : row.harvest ? harvestHtml(runtime, row.harvest) : `<span>빈 소켓${row.accepts.length ? ` (${takesText(runtime, row)})` : ""}</span>`;
    return `<div class="socket-row${filled ? "" : " is-empty"}${row.kind === "corrupt" ? " is-corrupt" : ""}${row.accepts.length ? " takes-harvest" : ""}"><span class="socket-row-label">${runtime.state.socketLabel(row)}</span>
            <div class="socket-row-jewel">${body}</div>
            ${filled && !row.fused ? `<button type="button" onclick="equipmentSocketsUi.remove('${row.kind}',${row.index})">${(0, runtime.deps._t)("빼기")}</button>` : ""}</div>`;
  }
  function socketsHtml(runtime, item) {
    const rows = runtime.deps.equipmentSockets.list(item).map(runtime.handlers.socketRowHtml).join("");
    const chisels = runtime.deps.game.currencies.voidChisel || 0;
    const chisel2 = runtime.deps.equipmentSockets.canChisel(item) ? `<button type="button" class="socket-chisel" onclick="equipmentSocketsUi.chisel()" ${chisels > 0 ? "" : "disabled"}>${(0, runtime.deps._t)("공허의 끌로 소켓 뚫기 (보유 {chisels})", { chisels })}</button>` : "";
    const bonus = Math.round(((0, runtime.deps.getSocketJewelMultiplier)() - 1) * 100);
    const bonusNote = bonus > 0 ? `<p class="selection-overlay-help">${(0, runtime.deps._t)("소켓 주얼 옵션 +{bonus}% (심연 군주, 재물욕)", { bonus })}</p>` : "";
    return `${rows || (0, runtime.deps._t)('<p class="selection-overlay-help">이 장비에는 아직 소켓이 없습니다.</p>')}${chisel2}${bonusNote}`;
  }
  function storeHtml(runtime, item) {
    const store = runtime.deps.bagItems.jewels();
    const canInsert = runtime.deps.equipmentSockets.list(item).some(runtime.deps.equipmentSockets.takesJewel);
    const cards = store.map((jewel) => `<article class="socket-jewel-card">${jewelHtml(runtime, jewel)}<div class="socket-jewel-actions">
            ${canInsert ? `<button type="button" onclick="equipmentSocketsUi.insert(${jewel.id})">${(0, runtime.deps._t)("끼우기")}</button>` : ""}
            <button type="button" onclick="equipmentSocketsUi.salvage(${jewel.id})">${(0, runtime.deps._t)("해체 +{jewel}", { jewel: (0, runtime.deps.getJewelSalvageShardGain)(jewel) })}</button></div></article>`).join("");
    const shards = runtime.deps.game.currencies.jewelShard || 0;
    return `<div class="selection-overlay-section-title">${(0, runtime.deps._t)("가방의 주얼 {length}개", { length: store.length })}</div>
            <div class="socket-jewel-list">${cards || (0, runtime.deps._t)('<p class="selection-overlay-help">가방에 주얼이 없습니다. 정예와 보스가 가끔 떨어뜨립니다.</p>')}</div>
            <div class="socket-store-footer"><span>${(0, runtime.deps._t)("주얼 결정 {shards}", { shards })}</span><button type="button" onclick="equipmentSocketsUi.refine()" ${shards >= runtime.state.REFINE_COST ? "" : "disabled"}>${(0, runtime.deps._t)("주얼 뽑기 (결정 {REFINE_COST})", { REFINE_COST: runtime.state.REFINE_COST })}</button></div>`;
  }
  function harvestStoreHtml(runtime, item) {
    const rows = runtime.deps.equipmentSockets.list(item), kinds = [...new Set(rows.flatMap((row) => row.accepts))];
    if (!kinds.length) return "";
    const open2 = new Set(rows.filter((row) => !contentOf(runtime, row)).flatMap((row) => row.accepts));
    const store = runtime.deps.stumpBox.socketCandidates(runtime.deps.game, kinds);
    const cards = store.map((grown) => `<article class="socket-jewel-card is-harvest">${harvestHtml(runtime, grown)}<div class="socket-jewel-actions">
            ${open2.has(runtime.deps.stumpBox.yieldKind(grown)) ? `<button type="button" onclick="equipmentSocketsUi.insertHarvest(${grown.id})">${(0, runtime.deps._t)("끼우기")}</button>` : ""}</div></article>`).join("");
    const names = kinds.map((kind) => runtime.deps.STUMP_BOX_STAGES[kind].label).join(", ");
    return `<div class="selection-overlay-section-title">${(0, runtime.deps._t)("그루터기 함의 {names} {length}개", { names, length: store.length })}</div>
            <div class="socket-jewel-list">${cards || `<p class="selection-overlay-help">그루터기 함 보관함에 다 자란 ${names}${(0, runtime.deps.pickParticle)(names, "이", "가")} 없습니다.</p>`}</div>`;
  }
  function render(runtime) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    if (!item) return close(runtime);
    runtime.deps.selectionDialog.show({
      id: runtime.state.OVERLAY_ID,
      title: (0, runtime.deps._t)("소켓: [{item}] {item2}", { item: (0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(item)), item2: (0, runtime.deps.escapeHTML)((0, runtime.deps.getItemDisplayName)(item)) }),
      panelClass: "equipment-socket-panel",
      body: `${socketsHtml(runtime, item)}
            ${harvestStoreHtml(runtime, item)}${takesNoJewel(runtime, item) ? "" : storeHtml(runtime, item)}`
    });
  }
  function open(runtime, ref, isEquip) {
    if ((0, runtime.deps.selectForCrafting)(ref, isEquip)) render(runtime);
  }
  function close(runtime) {
    runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
  }
  function report(runtime, result, message) {
    if (!result.ok) return (0, runtime.deps.addLog)(result.reason, "attack-monster");
    (0, runtime.deps.addLog)(message, "loot-magic");
    (0, runtime.deps.updateStaticUI)();
    render(runtime);
  }
  function insert(runtime, jewelId) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    if (!item) return;
    const result = runtime.deps.equipmentSockets.insert(item, jewelId);
    if (result.ok) (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    report(runtime, result, result.ok ? (0, runtime.deps._t)("💠 [{name}]에 [{name2}] 장착", { name: item.name, name2: result.jewel.name }) : "");
  }
  function insertHarvest(runtime, stumpId) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    if (!item) return;
    const result = runtime.deps.equipmentSockets.insertHarvest(item, stumpId);
    if (result.ok) (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    report(runtime, result, result.ok ? (0, runtime.deps._t)("🌱 [{name}]에 [{shortName}] 장착", { name: item.name, shortName: runtime.deps.stumpBox.shortName(result.harvest) }) : "");
  }
  function remove(runtime, kind, index) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    if (!item) return;
    const result = runtime.deps.equipmentSockets.remove(item, kind, index);
    report(runtime, result, result.ok ? removedMessage(runtime, item, result) : "");
  }
  function chisel(runtime) {
    const item = (0, runtime.deps.getSelectedCraftItem)();
    if (!item) return;
    report(runtime, runtime.deps.equipmentSockets.chisel(item), (0, runtime.deps._t)("🕳️ [{name}]에 공허 소켓을 뚫었습니다.", { name: item.name }));
  }
  async function salvage(runtime, jewelId) {
    if (await (0, runtime.deps.salvageJewel)(jewelId)) render(runtime);
  }
  function refine(runtime) {
    (0, runtime.deps.drawJewelRefine)();
    render(runtime);
  }
  function socketClass(runtime, row) {
    return [`is-${row.kind}`, ...row.accepts.map((kind) => `takes-${kind}`), contentOf(runtime, row) ? "is-filled" : "", row.fused ? "is-fused" : ""].filter(Boolean).join(" ");
  }
  function harvestLines(runtime, grown) {
    return runtime.deps.stumpBox.socketLines(grown).map((line) => runtime.deps.stumpBox.lineText(line.stat, line.value));
  }
  function takesText(runtime, row) {
    return [row.kind === "harvest" ? "" : "주얼", ...row.accepts.map((kind) => runtime.deps.STUMP_BOX_STAGES[kind].label)].filter(Boolean).join(", ");
  }
  function takesNoJewel(runtime, item) {
    const rows = runtime.deps.equipmentSockets.list(item);
    return rows.length > 0 && rows.every((row) => row.kind === "harvest");
  }

  // modules/ui/equipment-socket-view.mjs
  function createEquipmentSocketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { contentOf, socketRowHtml, actionHtml, badgesHtml, socketClick, dropJewel, tooltipHtml, open, close, insert, insertHarvest, remove, chisel, salvage, refine };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ actionHtml: runtime.handlers.actionHtml, badgesHtml: runtime.handlers.badgesHtml, socketClick: runtime.handlers.socketClick, dropJewel: runtime.handlers.dropJewel, tooltipHtml: runtime.handlers.tooltipHtml, open: runtime.handlers.open, close: runtime.handlers.close, insert: runtime.handlers.insert, insertHarvest: runtime.handlers.insertHarvest, remove: runtime.handlers.remove, chisel: runtime.handlers.chisel, salvage: runtime.handlers.salvage, refine: runtime.handlers.refine });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.OVERLAY_ID = "equipment-socket-overlay";
    runtime.state.REFINE_COST = 12;
    runtime.state.socketLabel = runtime.deps.equipmentSockets.label;
  }

  // modules/equipment-sockets-ui-classic.mjs
  var equipmentSocketsUi = createEquipmentSocketView({
    get getJewelStats() {
      return getJewelStats;
    },
    get isJewelPetiteStat() {
      return isJewelPetiteStat;
    },
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get formatJewelStatValue() {
      return formatJewelStatValue;
    },
    get getJewelUniqueEffectText() {
      return getJewelUniqueEffectText;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getJewelRarityClass() {
      return getJewelRarityClass;
    },
    get contentProgression() {
      return contentProgression;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get bagItems() {
      return bagItems;
    },
    get stumpBox() {
      return stumpBox;
    },
    get addLog() {
      return addLog;
    },
    get hideItemTooltip() {
      return hideItemTooltip;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get pickParticle() {
      return pickParticle;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get getSocketJewelMultiplier() {
      return getSocketJewelMultiplier;
    },
    get getJewelSalvageShardGain() {
      return getJewelSalvageShardGain;
    },
    get STUMP_BOX_STAGES() {
      return STUMP_BOX_STAGES;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get selectForCrafting() {
      return selectForCrafting;
    },
    get salvageJewel() {
      return salvageJewel;
    },
    get drawJewelRefine() {
      return drawJewelRefine;
    }
  });
  safeExposeGlobals({ equipmentSocketsUi });
})();
