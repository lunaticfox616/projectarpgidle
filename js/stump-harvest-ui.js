// GENERATED from modules/stump-harvest-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/stump-harvest-markup.mjs
  function esc(runtime, text) {
    return (0, runtime.deps.escapeHTML)(String(text));
  }
  function tone(runtime, color) {
    return runtime.deps.STUMP_BOX_COLORS[color].tone;
  }
  function journalCell(runtime, row, color, grown) {
    const key = `${row}-${color}`, on = grown.has(key), name = `${runtime.deps.STUMP_BOX_COLORS[color].label} ${rowLabel(runtime, row)}`;
    return `<span class="stump-harvest-cell${on ? " is-on" : ""}" style="--stump-tone:${tone(runtime, color)}" data-tip="${esc(runtime, on ? name : (0, runtime.deps._t)("{name} (미수확)", { name }))}"><img src="assets/items/stump-pixel-v1/${key}.png" alt="${esc(runtime, name)}" draggable="false"></span>`;
  }
  function journalRow(runtime, row, grown) {
    return `<div class="stump-harvest-row"><span>${rowLabel(runtime, row)}</span>${runtime.state.COLORS.map((color) => journalCell(runtime, row, color, grown)).join("")}</div>`;
  }
  function unlockWhen(runtime, row, open) {
    const when = row.when;
    if (when.harvestRows) return (0, runtime.deps._t)("수확 일지 {harvestRows}줄", { harvestRows: when.harvestRows });
    if (when.harvestCells) return (0, runtime.deps._t)("수확 일지 {harvestCells}칸", { harvestCells: when.harvestCells });
    if (when.harvestRow) return (0, runtime.deps._t)("수확 일지 {harvestRow} 줄", { harvestRow: rowLabel(runtime, when.harvestRow) });
    if (when.content) return "해금 탭";
    if (when.loop) return (0, runtime.deps._t)("루프 {loop}", { loop: when.loop });
    const page = runtime.deps.JOURNAL_DB[when.journal];
    return open || !page.hidden ? (0, runtime.deps._t)("저널 '{title}'", { title: page.title }) : "숨은 저널";
  }
  function unlockRow(runtime, row, open) {
    return `<li class="${open ? "is-on" : ""}"><span class="stump-unlock-mark" aria-label="${open ? (0, runtime.deps._t)("열림") : (0, runtime.deps._t)("잠김")}"></span><span class="stump-unlock-when">${esc(runtime, unlockWhen(runtime, row, open))}</span><span class="stump-unlock-arrow" aria-hidden="true">→</span><strong class="stump-unlock-reward">${esc(runtime, (0, runtime.deps._t)(row.label))}</strong></li>`;
  }
  function unlocksHtml(runtime) {
    const open = new Set(runtime.deps.stumpBox.openUnlocks(runtime.deps.game).map((row) => row.id));
    return `<div class="stump-unlocks-head" aria-hidden="true"><span>조건</span><span>보상</span></div><ul class="stump-unlocks">${runtime.deps.STUMP_BOX_UNLOCKS.map((row) => unlockRow(runtime, row, open.has(row.id))).join("")}</ul>`;
  }
  function journalHtml(runtime) {
    const grown = new Set(runtime.deps.game.stumpBox.harvest.grown);
    return `<div class="stump-harvest-grid">${runtime.state.ROWS.map((row) => journalRow(runtime, row, grown)).join("")}</div><p class="stump-hint">한 줄을 채우면 보상을 받습니다.</p>`;
  }
  function walletCell(runtime, row, color, canPut) {
    const key = `${row}-${color}`, name = `${runtime.deps.STUMP_BOX_COLORS[color].label} ${rowLabel(runtime, row)}`, { real, wallet } = runtime.deps.stumpBox.harvestHoldings(runtime.deps.game, key);
    const button = canPut && wallet > 0, tag = button ? "button" : "span", attrs = button ? ` type="button" data-stump-action="wallet-put" data-key="${key}"` : "";
    return `<${tag} class="stump-harvest-cell stump-wallet-cell${real + wallet ? " is-on" : ""}"${attrs} style="--stump-tone:${tone(runtime, color)}" data-tip="${esc(runtime, (0, runtime.deps._t)("{name} {real}+{wallet} (실제 아이템+화폐화)", { name, real, wallet }))}"><img src="assets/items/stump-pixel-v1/${key}.png" alt="${esc(runtime, name)}" draggable="false"><b>${real + wallet}</b></${tag}>`;
  }
  function walletHtml(runtime, canPut) {
    return `<div class="stump-harvest-grid stump-wallet-grid">${runtime.state.ROWS.map((row) => `<div class="stump-harvest-row"><span>${rowLabel(runtime, row)}</span>${runtime.state.COLORS.map((color) => walletCell(runtime, row, color, canPut)).join("")}</div>`).join("")}</div>`;
  }
  function pendingRewardCount(runtime) {
    return runtime.deps.stumpBox.pendingGifts(runtime.deps.game).length + runtime.deps.stumpBox.pendingPouches(runtime.deps.game).length;
  }
  function rewardButtonHtml(runtime) {
    const count = pendingRewardCount(runtime);
    return count ? `<button type="button" class="stump-reward-button" data-stump-action="rewards">${(0, runtime.deps._t)("받을 보상 {count}", { count })}</button>` : "";
  }
  function rewardChoice(runtime, attrs, color, note) {
    return `<button type="button" class="stump-reward-choice" ${attrs} style="--stump-tone:${tone(runtime, color)}"><img src="assets/items/stump-pixel-v1/seed-${color}.png" alt="" draggable="false"><span>${esc(runtime, (0, runtime.deps._t)("{label} 씨앗", { label: runtime.deps.STUMP_BOX_COLORS[color].label }))}</span><small>${note}</small></button>`;
  }
  function giftSection(runtime, row) {
    const quality = (0, runtime.deps._t)("품질 {round}%", { round: Math.round(runtime.deps.STUMP_BOX_HARVEST.giftRoll * 100) });
    const choices = runtime.state.COLORS.map((color) => rewardChoice(runtime, `data-reward-gift="${row}" data-color="${color}"`, color, quality)).join("");
    return `<section class="stump-reward"><h4>${(0, runtime.deps._t)("{row} 줄 완성 보상", { row: rowLabel(runtime, row) })}</h4><p>${(0, runtime.deps._t)("수확 일지의 {row} {length}색을 모두 성장 완료한 보상입니다. 색을 하나 고르세요.", { row: rowLabel(runtime, row), length: runtime.state.COLORS.length })}</p><div class="stump-reward-choices">${choices}</div></section>`;
  }
  function pouchReason(runtime, id) {
    const row = runtime.deps.STUMP_BOX_UNLOCKS.find((entry) => entry.id === id), page = row && runtime.deps.JOURNAL_DB[row.when.journal];
    return page ? (0, runtime.deps._t)("저널 '{title}' 획득 보상입니다.", { title: page.title }) : "저널 획득 보상입니다.";
  }
  function pouchSection(runtime, id) {
    const choices = runtime.deps.stumpBox.pouchOffers(runtime.deps.game, id).map((offer, index) => rewardChoice(
      runtime,
      `data-reward-pouch="${esc(runtime, id)}" data-index="${index}"`,
      offer.color,
      (0, runtime.deps._t)("품질 {round}%", { round: Math.round(offer.roll * 100) })
    )).join("");
    return `<section class="stump-reward"><h4>${(0, runtime.deps._t)("씨앗 주머니")}</h4><p>${(0, runtime.deps._t)("{id} 3개 중 1개를 고르세요.", { id: esc(runtime, pouchReason(runtime, id)) })}</p><div class="stump-reward-choices is-three">${choices}</div></section>`;
  }
  function rewardsBody(runtime) {
    const sections = runtime.deps.stumpBox.pendingGifts(runtime.deps.game).map(runtime.handlers.giftSection).concat(runtime.deps.stumpBox.pendingPouches(runtime.deps.game).map(runtime.handlers.pouchSection));
    return sections.join("") || '<p class="selection-overlay-help">받을 보상이 없습니다.</p>';
  }
  function rowLabel(runtime, row) {
    return runtime.deps.STUMP_BOX_STAGES[row].label;
  }

  // modules/ui/stump-harvest-actions.mjs
  function openRewards(runtime) {
    if (!runtime.active) return;
    const fresh = runtime.deps.stumpBox.pendingPouches(runtime.deps.game).some((id) => !runtime.deps.game.stumpBox.pouches.offers[id]);
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.REWARD_DIALOG, title: (0, runtime.deps._t)("받을 보상"), panelClass: "stump-reward-panel", body: rewardsBody(runtime) });
    if (fresh) (0, runtime.deps.queueImportantSave)(300);
    const overlay = panel && panel.parentElement;
    runtime.state.rewardOwner = runtime.deps.game;
    if (overlay && overlay !== runtime.state.rewardOverlay) {
      if (runtime.state.rewardOverlay) releaseViewTarget(runtime, runtime.state.rewardOverlay);
      runtime.state.rewardOverlay = overlay;
      listenView(runtime, overlay, "click", runtime.handlers.onRewardClick);
    }
  }
  function onRewardClick(runtime, event) {
    if (!runtime.active || runtime.state.rewardOwner !== runtime.deps.game) {
      if (runtime.state.rewardOverlay?.isConnected) runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
      return;
    }
    const gift = event.target.closest("[data-reward-gift]"), pouch = event.target.closest("[data-reward-pouch]");
    if (gift) runtime.deps.stumpBoxUi.claimReward("gift", gift.dataset.rewardGift, gift.dataset.color);
    else if (pouch) runtime.deps.stumpBoxUi.claimReward("pouch", pouch.dataset.rewardPouch, Number(pouch.dataset.index));
    else return;
    if (pendingRewardCount(runtime)) openRewards(runtime);
    else runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
  }
  function describeUnlock(runtime, row) {
    const text = runtime.state.UNLOCK_TEXTS.find(([test]) => test(row));
    return `${text ? text[1](row) : row.label} (${unlockWhen(runtime, row, true)})`;
  }
  function announceUnlocks(runtime) {
    if (runtime.deps.game.isBackgroundCalculation || !runtime.deps.game.stumpBox.acquired) return;
    const seen = runtime.deps.game.seenTutorials = runtime.deps.game.seenTutorials || [];
    const fresh = runtime.deps.stumpBox.openUnlocks(runtime.deps.game).filter((row) => !seen.includes(`unlock_stump_${row.id}`));
    if (!fresh.length) return;
    fresh.slice(1).forEach((row) => seen.push(`unlock_stump_${row.id}`));
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.queueTutorialNotice)(`unlock_stump_${fresh[0].id}`, (0, runtime.deps._t)("그루터기 함 해금"), `${fresh.map(runtime.handlers.describeUnlock).join("\n")}
‘그루터기 함’의 함 해금에서 볼 수 있습니다.`, "tab-stump");
  }
  function announceRecipes(runtime) {
    if (runtime.deps.game.isBackgroundCalculation || !runtime.deps.game.stumpBox.acquired) return;
    const found = runtime.deps.stumpCube.learn(runtime.deps.game);
    if (!found.length) return;
    const names = found.map((recipe) => (0, runtime.deps._t)(recipe.name)).join(", ");
    runtime.deps.game.noti.stump = true;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧩 새 조합법: {names}", { names }), "loot-rare");
    (0, runtime.deps.showGameToast)((0, runtime.deps._t)("새 조합법: {names}", { names }), { tone: "success" });
  }
  function announceGraftJournal(runtime) {
    const points = runtime.deps.stumpBox.graftJournalPoints(runtime.deps.game);
    if (!runtime.deps.stumpBox.graftOpen(runtime.deps.game) || points <= 0) return;
    (0, runtime.deps.queueTutorialNotice)(
      "unlock_stump_graft_journal",
      (0, runtime.deps._t)("저널 접붙이기 점수"),
      (0, runtime.deps._t)("정점 보스와 버려진 날의 저널이 접붙이기 점수를 더합니다(정점 +3, 버려진 날 +2, 지금 +{points}).", { points }),
      "tab-stump"
    );
  }
  function announceRegress(runtime, detail) {
    runtime.deps.stumpRipeningUi.regressLog(detail);
    if (detail.count) (0, runtime.deps.addLog)((0, runtime.deps._t)("🌱 그루터기 함: 봉인 칸 밖의 아이템 {count}개가 루프와 함께 사라졌습니다.", { count: detail.count }), "season-up");
  }
  function graftRankAt(runtime, row) {
    return runtime.deps.STUMP_BOX_UNLOCKS.slice(0, runtime.deps.STUMP_BOX_UNLOCKS.indexOf(row) + 1).reduce((sum, next) => sum + (next.graftRanks || 0), runtime.deps.STUMP_BOX_GRAFT.maxRank);
  }

  // modules/ui/stump-harvest-view.mjs
  function createStumpHarvestView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { giftSection, pouchSection, onRewardClick, describeUnlock, walletHtml, journalHtml, unlocksHtml, rewardButtonHtml, openRewards, announceUnlocks, announceRecipes, announceGraftJournal };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = StumpHarvestViewApi(runtime);
    installStumpHarvestViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.COLORS = Object.keys(runtime.deps.STUMP_BOX_COLORS);
    runtime.state.ROWS = runtime.deps.STUMP_BOX_HARVEST.rows;
    runtime.state.REWARD_DIALOG = "stump-reward-dialog";
    runtime.state.UNLOCK_TEXTS = Object.freeze([
      [(row) => row.storage, (row) => (0, runtime.deps._t)("보관함 +{storage}칸", { storage: row.storage })],
      [(row) => row.bulkCompost, () => "일괄 거름 사용: 보관함의 씨앗을 한 번에 거름으로 사용"],
      [(row) => row.breeding, () => "번식: 루프가 바뀔 때 성장 완료된 열매마다 보관함에 씨앗 1개(가끔 다른 색, 황금)"],
      [(row) => row.pouch, () => "씨앗 주머니: 무작위 씨앗 3개 중 1개 선택"],
      [(row) => row.devour, () => "봉인 칸 1, 포식: 봉인 칸의 아이템은 루프가 바뀌어도 사라지지 않음. 불씨의 흉터 1개 지급(봉인 칸에서 루프가 바뀔 때 주변 1칸 흡수)"],
      [(row) => row.rootMemory, (row) => (0, runtime.deps._t)("뿌리 기억: 봉인 칸 +{sealSlots}", { sealSlots: row.sealSlots })],
      [(row) => row.sealSlots, (row) => (0, runtime.deps._t)("봉인 칸 +{sealSlots}: 루프가 바뀌어도 그 칸의 아이템은 사라지지 않음", { sealSlots: row.sealSlots })],
      [(row) => row.qualityCap, (row) => `품질 상한 ${Math.round(row.qualityCap * 100)}%${row.graftRanks ? (0, runtime.deps._t)(", 접붙이기 {row}단계", { row: graftRankAt(runtime, row) }) : ""}`]
    ]);
  }
  function installStumpHarvestViewEvents(runtime) {
    if (typeof runtime.deps.window !== "undefined" && typeof runtime.deps.window.addEventListener === "function") {
      listenView(runtime, runtime.deps.window, "project-idle:stump-box-regressed", (event) => announceRegress(runtime, event.detail || {}));
    }
  }
  function StumpHarvestViewApi(runtime) {
    return Object.freeze({
      walletHtml: runtime.handlers.walletHtml,
      journalHtml: runtime.handlers.journalHtml,
      unlocksHtml: runtime.handlers.unlocksHtml,
      rewardButtonHtml: runtime.handlers.rewardButtonHtml,
      openRewards: runtime.handlers.openRewards,
      announceUnlocks: runtime.handlers.announceUnlocks,
      announceRecipes: runtime.handlers.announceRecipes,
      announceGraftJournal: runtime.handlers.announceGraftJournal,
      describeUnlock: runtime.handlers.describeUnlock,
      dispose: () => disposeStumpHarvestView(runtime)
    });
  }
  function disposeStumpHarvestView(runtime) {
    releaseViewEvents(runtime);
    if (runtime.state.rewardOverlay?.isConnected) runtime.deps.selectionDialog.close(runtime.state.REWARD_DIALOG);
    runtime.state.rewardOverlay = null;
  }

  // modules/stump-harvest-ui-classic.mjs
  var stumpHarvestUi = createStumpHarvestView({
    get escapeHTML() {
      return escapeHTML;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get _t() {
      return _t;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get stumpBox() {
      return stumpBox;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get STUMP_BOX_UNLOCKS() {
      return STUMP_BOX_UNLOCKS;
    },
    get STUMP_BOX_HARVEST() {
      return STUMP_BOX_HARVEST;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    },
    get stumpCube() {
      return stumpCube;
    },
    get addLog() {
      return addLog;
    },
    get showGameToast() {
      return showGameToast;
    },
    get stumpRipeningUi() {
      return stumpRipeningUi;
    },
    get STUMP_BOX_STAGES() {
      return STUMP_BOX_STAGES;
    },
    get STUMP_BOX_GRAFT() {
      return STUMP_BOX_GRAFT;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  });
  safeExposeGlobals({ stumpHarvestUi });
})();
