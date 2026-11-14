// GENERATED from modules/stump-cube-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);

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

  // modules/ui/stump-book-motion.mjs
  function afterStumpBookMotion(runtime, animation, next) {
    const epoch = runtime.state.bookOpening, owner = runtime.deps.game, dialog = runtime.state.bookDialog;
    for (const previous of runtime.state.bookAnimations) {
      if (previous.effect?.target !== animation.effect?.target) continue;
      runtime.state.bookAnimations.delete(previous);
      previous.cancel();
    }
    runtime.state.bookAnimations.add(animation);
    animation.finished.then(() => {
      if (!runtime.state.bookAnimations.has(animation)) return;
      if (runtime.active && epoch === runtime.state.bookOpening && owner === runtime.deps.game && dialog === runtime.state.bookDialog) next();
    }, (error) => {
      runtime.state.bookAnimations.delete(animation);
      if (error?.name !== "AbortError") runtime.deps.window.console.error("[stump recipe book] animation failed", error);
    });
  }
  function stopStumpBookMotion(runtime) {
    runtime.state.bookOpening += 1;
    for (const animation of runtime.state.bookAnimations) animation.cancel();
    runtime.state.bookAnimations.clear();
    runtime.state.bookTurning = null;
  }
  function syncStumpCubeOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return false;
    stopStumpBookMotion(runtime);
    if (runtime.state.pickerPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
    if (runtime.state.resultPanel?.isConnected) runtime.deps.selectionDialog.close("stump-cube-result");
    runtime.state.bookDialog?.close();
    Object.assign(runtime.state, { owner: runtime.deps.game, pickerSelection: null, pickerItems: [], lastResult: null, pickerPanel: null, resultPanel: null });
    return true;
  }

  // modules/ui/stump-cube-items.mjs
  function isStumpKind(runtime, kind) {
    return kind === "stump" || kind === "wallet";
  }
  function esc(runtime, text) {
    return (0, runtime.deps.escapeHTML)(String(text));
  }
  function itemName(runtime, kind, item) {
    if (kind === "currency") return (0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].name);
    return isStumpKind(runtime, kind) ? runtime.deps.stumpBox.label(item) : String(item.name || runtime.state.KIND_LABELS[kind]);
  }
  function itemTone(runtime, kind, item) {
    if (kind === "stump" && item.albino) return runtime.deps.STUMP_BOX_RIPENING.albino.tone;
    if (isStumpKind(runtime, kind) && item.color) return runtime.deps.STUMP_BOX_COLORS[item.color].tone;
    if (kind === "stump" && item.family === "scar") return runtime.deps.STUMP_BOX_SCAR.tone;
    return (0, runtime.deps.getRarityColor)(item.rarity || "normal");
  }

  // modules/ui/stump-cube-picker.mjs
  function storedItemMeta(runtime, kind, item) {
    if (kind === "stump" && item.color) return (0, runtime.deps._t)("품질 {round}%, {value}", { round: Math.round(item.roll * 100), value: runtime.deps.stumpBox.isMature(item) ? (0, runtime.deps._t)("성장 완료") : (0, runtime.deps._t)("성장 전") });
    const rarity = runtime.deps.ITEM_RARITY_LABELS[item.rarity] || "";
    if (kind === "equipment") return equipmentMeta(runtime, item, rarity);
    if (kind === "core") return item.perfect ? "완전한 코어" : (0, runtime.deps._t)("{rarity} 코어", { rarity });
    if (kind === "currency") return (0, runtime.deps._t)("{amount}개 획득", { amount: item.amount });
    return rarity || runtime.state.KIND_LABELS[kind];
  }
  function equipmentMeta(runtime, item, rarity) {
    return (0, runtime.deps._t)("{rarity} T{item}, 품질 {max}%", { rarity, item: (0, runtime.deps.getItemCraftTier)(item), max: Math.max(0, Math.floor(Number(item.quality) || 0)) });
  }
  function firstOption(runtime, kind, item) {
    if (kind === "core") return item.lines[0] ? runtime.deps.coreItems.describe(item.lines[0]) : "";
    if (kind === "stump") return stumpFirstOption(runtime, item);
    if (kind === "currency" || kind === "wallet") return "";
    return firstStatOption(runtime, kind, item);
  }
  function stumpFirstOption(runtime, item) {
    if (item.family === "talisman") return item.uniqueEffect || (item.lines[0] ? runtime.deps.talismans.describeLine(item.lines[0]) : "");
    if (item.albino) {
      const line = runtime.deps.STUMP_BOX_RIPENING.albino.variants[runtime.deps.stumpBox.yieldKind(item)][item.color][0];
      return runtime.deps.stumpBox.lineText(line.stat, line.value);
    }
    const gain = runtime.deps.stumpBox.yieldOf(item);
    return gain ? gain.text.replace("{v}", String(Math.round(gain.value * runtime.deps.stumpBox.qualityOf(item) * runtime.deps.stumpBox.goldenMul(item) * 100) / 100)) : "";
  }
  function firstStatOption(runtime, kind, item) {
    const stat = kind === "jewel" ? (0, runtime.deps.getJewelStats)(item)[0] : (item.stats || [])[0] || (item.baseStats || [])[0];
    if (!stat) return "";
    const key = stat.id || stat.stat;
    return `${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(key))} ${(0, runtime.deps.formatSignedValue)(key, stat.val)}`;
  }
  function renderMaterialDetail(runtime, panel) {
    const detail = panel.querySelector(".stump-cube-material-detail");
    detail.style.setProperty("--cube-tone", runtime.state.pickerSelection ? itemTone(runtime, runtime.state.pickerSelection.kind, runtime.state.pickerSelection.item) : "#8c7043");
    if (!runtime.state.pickerSelection) {
      detail.innerHTML = '<p class="selection-overlay-help">재료를 골라 옵션을 확인하세요.</p>';
      return;
    }
    const { kind, item } = runtime.state.pickerSelection;
    detail.innerHTML = `<div class="stump-cube-material-head"><img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false"><span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span></div><div class="stump-cube-material-options equipment-inspection-tooltip"></div><button type="button" class="stump-cube-material-add" onclick="stumpCubeUi.pickCubeItem()">조합창에 넣기</button>`;
    const body = detail.querySelector(".stump-cube-material-options");
    renderItemDetails(runtime, body, kind, item);
  }
  function renderItemDetails(runtime, body, kind, item, snapshot = false) {
    if (kind === "wallet") body.innerHTML = `<h3>${esc(runtime, itemName(runtime, kind, item))}</h3>`;
    else if (kind === "stump") body.innerHTML = runtime.deps.statToneText.markup(runtime.deps.stumpBoxUi.itemTipHtml(item, snapshot));
    else if (kind === "currency") body.innerHTML = `<h3>${esc(runtime, (0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].name))}</h3><p>${runtime.deps.statToneText.html((0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].desc) || "")}</p>`;
    else (0, runtime.deps.showItemTooltip)(null, null, false, item, { target: body });
  }
  function currentResult(runtime) {
    if (runtime.state.lastResult && (runtime.state.lastResult.state !== runtime.deps.game || runtime.state.lastResult.season !== runtime.deps.game.season)) runtime.state.lastResult = null;
    return runtime.state.lastResult;
  }
  function resultCardHtml(runtime, { kind, item }, index) {
    const option = firstOption(runtime, kind, item);
    return `<button type="button" class="stump-cube-result-card" onclick="stumpCubeUi.inspectCubeResult(${index})" style="--cube-tone:${itemTone(runtime, kind, item)}">${resultArtHtml(runtime, kind, item)}<span><strong>${esc(runtime, itemName(runtime, kind, item))}</strong><span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span>${option ? `<span>${runtime.deps.statToneText.html(option)}</span>` : ""}<small>결과 자세히 보기</small></span></button>`;
  }
  function resultArtHtml(runtime, kind, item) {
    if (kind === "currency") {
      const icon = runtime.deps.ORB_DB[item.currency].icon;
      return icon ? `<img src="${icon}" alt="" draggable="false">` : "";
    }
    return `<img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false">`;
  }
  function resultHtml(runtime) {
    const result = currentResult(runtime);
    if (!result) return "";
    return `<section class="stump-cube-result" aria-label="${(0, runtime.deps._t)("최근 조합 결과")}"><h4>${(0, runtime.deps._t)("방금 만든 결과")}</h4>${result.outputs.map(runtime.handlers.resultCardHtml).join("")}</section>`;
  }
  function inspectCubeResult(runtime, index) {
    const row = currentResult(runtime)?.outputs[index];
    if (!row) return;
    const { kind, item } = row;
    const panel = runtime.deps.selectionDialog.show({
      id: "stump-cube-result",
      title: (0, runtime.deps._t)("조합 결과"),
      panelClass: "stump-cube-result-panel",
      body: `<div class="stump-cube-material-head">${resultArtHtml(runtime, kind, item)}<span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span></div><div class="stump-cube-material-options equipment-inspection-tooltip"></div><p class="selection-overlay-help">제작 직후의 결과입니다.</p>`
    });
    runtime.state.resultPanel = panel;
    renderItemDetails(runtime, panel.querySelector(".stump-cube-material-options"), kind, item, true);
  }
  function candidateHtml(runtime, kind, item, index) {
    const name = itemName(runtime, kind, item), selected = runtime.state.pickerSelection?.item === item, option = firstOption(runtime, kind, item);
    return `<button type="button" class="stump-cube-candidate${selected ? " is-selected" : ""}" data-cube-candidate="${index}" onclick="stumpCubeUi.selectCubeItem(${index})" ondblclick="stumpCubeUi.pickCubeItem()" aria-pressed="${selected}" style="--cube-tone:${itemTone(runtime, kind, item)}"><img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false"><span class="stump-cube-candidate-copy"><strong>${esc(runtime, name)}</strong><span class="stump-cube-candidate-meta">${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span>${option ? `<span class="stump-cube-candidate-option">${runtime.deps.statToneText.html(option)}</span>` : ""}</span></button>`;
  }
  function pickerBodyHtml(runtime) {
    const tabs = runtime.deps.stumpCube.KINDS.filter((kind) => kind !== "wallet" || kind === runtime.state.pickerKind || pickerCount(runtime, kind) > 0).map((kind) => `<button type="button" class="${kind === runtime.state.pickerKind ? "is-on" : ""}" aria-pressed="${kind === runtime.state.pickerKind}" onclick="stumpCubeUi.openCubePicker('${kind}')">${runtime.state.KIND_LABELS[kind]} ${pickerCount(runtime, kind)}</button>`).join("");
    runtime.state.pickerItems = runtime.deps.stumpCube.candidates(runtime.state.pickerKind);
    if (runtime.state.pickerSelection && !runtime.state.pickerItems.includes(runtime.state.pickerSelection.item)) runtime.state.pickerSelection = null;
    const list = runtime.state.pickerItems.map((item, index) => candidateHtml(runtime, runtime.state.pickerKind, item, index)).join("");
    return `<div class="stump-cube-picker-tabs">${tabs}</div><div class="stump-cube-picker-layout">
            <div class="stump-cube-candidates">${list || (0, runtime.deps._t)('<p class="selection-overlay-help">넣을 수 있는 아이템이 없습니다.</p>')}</div>
            <section class="stump-cube-material-detail" aria-label="${(0, runtime.deps._t)("고른 재료 정보")}"></section></div>`;
  }
  function candidateMeta(runtime, kind, item) {
    return kind === "wallet" ? (0, runtime.deps._t)("화폐화 {walletCount}개", { walletCount: runtime.deps.stumpBox.walletCount(runtime.deps.game, item.walletKey) }) : storedItemMeta(runtime, kind, item);
  }
  function pickerCount(runtime, kind) {
    return kind === "wallet" ? runtime.deps.stumpBox.walletTotal(runtime.deps.game) : runtime.deps.stumpCube.candidates(kind).length;
  }

  // modules/ui/stump-cube-markup.mjs
  function costHtml(runtime, cost) {
    const rows = Object.entries(cost || {}).map(([key, need]) => {
      const have = Math.floor(runtime.deps.game.currencies[key] || 0);
      return `${(0, runtime.deps.getStyledOrbName)(key)} ${need} <span class="${have < need ? "is-bad" : "stump-cube-have"}">${(0, runtime.deps._t)("(보유 {have})", { have })}</span>`;
    });
    return rows.length ? rows.join(", ") : "비용 없음";
  }
  function recipeTones(runtime) {
    if (runtime.state.recipeTone) return runtime.state.recipeTone;
    const tones = new Map([
      ...runtime.state.KIND_TONES,
      ...["unique", "rare", "magic"].map((key) => [runtime.deps.ITEM_RARITY_LABELS[key], (0, runtime.deps.getRarityColor)(key)]),
      ...Object.values(runtime.deps.STUMP_BOX_COLORS).map((row) => [row.label, row.tone])
    ]);
    const words = [...tones.keys()].sort((a, b) => b.length - a.length);
    runtime.state.recipeTone = { tones, pattern: new RegExp(`(${words.join("|")})|(\\d+(?:%|개)?)`, "g") };
    return runtime.state.recipeTone;
  }
  function recipeToneHtml(runtime, text) {
    const { tones, pattern } = recipeTones(runtime);
    return esc(runtime, text).replace(pattern, (match, word) => word ? `<span class="stump-ink is-tone" style="--ink:${tones.get(word)}">${match}</span>` : `<span class="stump-ink is-tone is-num">${match}</span>`);
  }
  function bookCostHtml(runtime, cost) {
    const rows = Object.entries(cost || {}).map(([key, need]) => {
      const have = Math.floor(runtime.deps.game.currencies[key] || 0);
      return `${esc(runtime, (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name))} ${need} <span class="${have < need ? "is-short" : ""}">${(0, runtime.deps._t)("(보유 {have})", { have })}</span>`;
    });
    return rows.length ? rows.join(", ") : "비용 없음";
  }
  function entryHtml(runtime, entry) {
    const wallet = entry.kind === "wallet", name = `${itemName(runtime, entry.kind, entry.item)}${wallet ? (0, runtime.deps._t)(" (화폐화)") : ""}`, cell = entry.y * runtime.deps.stumpCube.SIZE + entry.x;
    return `<button type="button" class="stump-cube-item${entry.w * entry.h > 1 ? " is-multi" : ""}${wallet ? " is-wallet" : ""}" data-stump-action="cube-cell" data-cell="${cell}" data-stump-drop-cube="${cell}" data-stump-drag-cube="${cell}" data-cube-w="${entry.w}" data-cube-h="${entry.h}" style="grid-column:${track(runtime, entry.x, entry.w)};grid-row:${track(runtime, entry.y, entry.h)};--cube-tone:${itemTone(runtime, entry.kind, entry.item)}" ${(0, runtime.deps._t)('data-tip="{name}, 누르면 꺼냅니다" aria-label="{name2} 꺼내기">', { name: esc(runtime, name), name2: esc(runtime, name) })}<img src="${runtime.state.ICONS[entry.kind](entry.item)}" alt="" draggable="false"></button>`;
  }
  function gridHtml(runtime, list) {
    const cells = Array.from({ length: runtime.deps.stumpCube.SIZE * runtime.deps.stumpCube.SIZE }, (_, cell) => `<button type="button" class="stump-cube-cell" data-stump-action="cube-open" data-stump-drop-cube="${cell}" style="grid-column:${track(runtime, cell % runtime.deps.stumpCube.SIZE)};grid-row:${track(runtime, Math.floor(cell / runtime.deps.stumpCube.SIZE))}" ${(0, runtime.deps._t)('aria-label="빈 칸, 재료 넣기">')}</button>`).join("");
    return `<div class="stump-cube-grid" role="grid" aria-label="${(0, runtime.deps._t)("조합창 {SIZE}×{SIZE2}", { SIZE: runtime.deps.stumpCube.SIZE, SIZE2: runtime.deps.stumpCube.SIZE })}">${cells}${list.map(runtime.handlers.entryHtml).join("")}</div>`;
  }
  function previewFactsHtml(runtime, outcome) {
    const badges = [];
    if (outcome.tier !== void 0) badges.push(`T${outcome.tier}`);
    if (outcome.quality !== void 0) badges.push(`품질 ${outcome.quality}%`);
    if (outcome.qualityCap !== void 0) badges.push(`현재 상한 ${outcome.qualityCap}%`);
    return `<strong class="stump-cube-preview-name">${esc(runtime, (0, runtime.deps._t)(outcome.label))}</strong>` + (badges.length ? `<p class="stump-cube-preview-meta">${runtime.deps.statToneText.html(badges.join(", "))}</p>` : "") + (outcome.keep ? `<p><b>${(0, runtime.deps._t)("유지")}</b> ${runtime.deps.statToneText.html(outcome.keep)}</p>` : "") + (outcome.change ? `<p><b>${(0, runtime.deps._t)("변경")}</b> ${runtime.deps.statToneText.html(outcome.change)}</p>` : "") + (outcome.note ? `<p class="stump-cube-preview-note">${runtime.deps.statToneText.html((0, runtime.deps._t)(outcome.note))}</p>` : "");
  }
  function statusHtml(runtime, found, list, matched) {
    if (!list.length) return "";
    if (list.some((entry) => entry.item.locked)) return '<p class="stump-line is-bad">잠긴 재료를 조합창에서 꺼내 주세요.</p>';
    if (!found) return missingRecipesHtml(runtime, matched);
    const lacking = runtime.deps.stumpCube.missingCost(found.recipe).length > 0;
    return `<div class="stump-cube-status"><p class="stump-cube-preview-title">${(0, runtime.deps._t)("예상 결과")} <span>${esc(runtime, (0, runtime.deps._t)(found.recipe.name))}</span></p>` + previewFactsHtml(runtime, found) + (found.reason ? `<p class="stump-line is-bad">${esc(runtime, found.reason)}</p>` : "") + `<p class="stump-line${lacking ? " is-bad" : ""}">${found.recipe.costText ? recipeToneHtml(runtime, found.recipe.costText) : costHtml(runtime, found.recipe.cost)}</p></div>`;
  }
  function sharedMaterialValue(runtime, { rule, picked }, key) {
    return (rule.same || []).includes(key) ? picked[0]?.item[key] : void 0;
  }
  function missingFamilyLabel(runtime, family, ripe, path) {
    if (family !== "seed") return family === "talisman" ? "부적" : "흉터";
    const label = [].concat(path || []).map((kind) => runtime.deps.STUMP_BOX_STAGES[kind].label).join("/");
    return ripe ? label || "성장 완료 씨앗" : "씨앗류";
  }
  function missingMaterialLabel(runtime, row) {
    const { rule } = row, name = sharedMaterialValue(runtime, row, "name");
    if (name) return name;
    const rarity = rule.rarity ? [].concat(rule.rarity).map((key) => runtime.deps.ITEM_RARITY_LABELS[key]).join("/") + " " : "";
    if (rule.kind !== "stump") return rule.socketable ? "소켓 가능한 장신구" : rarity + runtime.state.KIND_LABELS[rule.kind];
    const family = sharedMaterialValue(runtime, row, "family") || rule.family, path = sharedMaterialValue(runtime, row, "path") || rule.path;
    const color = sharedMaterialValue(runtime, row, "color");
    const names = [].concat(family).map((key) => missingFamilyLabel(runtime, key, rule.ripe, path));
    return (color ? runtime.deps.STUMP_BOX_COLORS[color].label + " " : "") + rarity + names.join("/");
  }
  function missingRecipesHtml(runtime, matched) {
    const hints = runtime.deps.stumpCube.missingRecipes().slice(0, 3);
    if (!hints.length) return `<p class="stump-status">${matched ? (0, runtime.deps._t)("결과 미확인") : (0, runtime.deps._t)("맞는 조합법 없음")}</p>`;
    return '<ul class="stump-cube-missing">' + hints.map((hint) => `<li><strong>${esc(runtime, (0, runtime.deps._t)(hint.recipe.name))}</strong><span>${hint.missing.map((row) => `${runtime.deps.statToneText.html(missingMaterialLabel(runtime, row))} <b class="stump-cube-shortage">${(0, runtime.deps._t)("{count}개 부족", { count: row.count })}</b>`).join(", ")}</span></li>`).join("") + "</ul>";
  }
  function recipeBookHtml(runtime) {
    const shown = runtime.deps.stumpCube.revealed(runtime.deps.game), hidden = runtime.deps.STUMP_CUBE_RECIPES.length - shown.length;
    const rows = shown.map((recipe) => `<li style="--recipe-tone:${runtime.state.GROUP_TONES[recipe.group] || "#e6c67f"}"><span class="stump-book-entry-head"><span class="stump-book-group">${esc(runtime, recipe.group)}</span><strong>${recipeToneHtml(runtime, recipe.name)}</strong></span>` + bookLineHtml(runtime, "재료", recipeToneHtml(runtime, recipe.need)) + bookLineHtml(runtime, "결과", recipeToneHtml(runtime, recipe.result) + bookCapHtml(runtime, recipe)) + (recipe.note ? `<small class="stump-book-note">${keepBracketsHtml(runtime, recipeToneHtml(runtime, recipe.note))}${bookTierCapHtml(runtime, recipe)}</small>` : "") + bookCostLineHtml(runtime, recipe) + "</li>").join("");
    const more = hidden ? `<li class="is-hidden">${(0, runtime.deps._t)("아직 모르는 조합법 {hidden}개 (새 재료가 성장 완료되거나 해금되면 공개)", { hidden })}</li>` : "";
    return `<ul class="stump-book-list stump-book-page">${rows}${more}</ul>`;
  }
  function bookCostLineHtml(runtime, recipe) {
    if (recipe.costText) return bookLineHtml(runtime, "비용", recipeToneHtml(runtime, recipe.costText));
    return Object.keys(recipe.cost || {}).length ? bookLineHtml(runtime, "비용", bookCostHtml(runtime, recipe.cost)) : "";
  }
  function keepBracketsHtml(runtime, html) {
    return html.replace(/\([^()]*\)/g, (part) => part.replace(/<[^>]+>/g, "").length <= 18 ? `<span class="stump-book-keep">${part}</span>` : part);
  }
  function bookCapHtml(runtime, recipe) {
    return recipe.id === "stump_merge" ? (0, runtime.deps._t)(" (상한 {value})", { value: recipeToneHtml(runtime, Math.round(runtime.deps.stumpBox.rollCap(runtime.deps.game) * 100) + "%") }) : "";
  }
  function bookTierCapHtml(runtime, recipe) {
    return recipe.id === "equip_rare_tier" ? ` T${runtime.deps.levelProgression.maxDropTier(Math.floor(Number(runtime.deps.game.level) || 1))}` : "";
  }
  function cubeGridHtml(runtime) {
    return gridHtml(runtime, runtime.deps.stumpCube.entries());
  }
  function cubeHtml(runtime) {
    const list = runtime.deps.stumpCube.entries(), found = runtime.deps.stumpCube.preview(), matched = runtime.deps.stumpCube.match();
    return statusHtml(runtime, found, list, matched) + quickFillHtml(runtime) + resultHtml(runtime);
  }
  function quickFillRecipes(runtime) {
    const current = runtime.deps.stumpCube.match()?.recipe.id;
    return runtime.deps.stumpCube.readyCubeSets().map((row) => row.recipe).filter((recipe) => recipe.id !== current);
  }
  function quickFillHtml(runtime) {
    const recipes = quickFillRecipes(runtime);
    if (!recipes.length) return "";
    return '<div class="stump-cube-quick" role="group" aria-label="바로 넣기"><span>바로 넣기</span>' + recipes.map((recipe) => `<button type="button" data-stump-action="cube-quick" data-recipe="${recipe.id}" style="--recipe-tone:${runtime.state.GROUP_TONES[recipe.group] || "#e6c67f"}">${esc(runtime, (0, runtime.deps._t)(recipe.name))}</button>`).join("") + "</div>";
  }
  function cubeSignature(runtime) {
    syncStumpCubeOwner(runtime);
    const found = runtime.deps.stumpCube.preview(), matched = runtime.deps.stumpCube.match(), revealed = runtime.deps.stumpCube.revealed(runtime.deps.game);
    const costs = Object.keys(matched && matched.recipe.cost || {});
    return JSON.stringify([
      runtime.deps.stumpCube.entries().map((entry) => [entry.kind, entry.id, entry.x, entry.y, entry.item]),
      found,
      costs.map((key) => [key, runtime.deps.game.currencies[key] || 0]),
      !!runtime.deps.game.woodsmanBuildLock,
      runtime.deps.stumpBox.rollCap(runtime.deps.game),
      revealed.map((recipe) => recipe.id),
      currentResult(runtime)?.outputs,
      quickFillRecipes(runtime).map((recipe) => recipe.id)
    ]);
  }
  function track(runtime, at, span = 1) {
    return `${at * 2 + 1} / span ${span * 2 - 1}`;
  }
  function bookLineHtml(runtime, label, html) {
    return `<span class="stump-book-line"><b>${label}</b><span>${keepBracketsHtml(runtime, html)}</span></span>`;
  }

  // modules/ui/stump-recipe-book.mjs
  function playBookFrames(runtime, frames) {
    const keys = frames.map((frame, at) => ({ backgroundPositionX: bookFramePos(runtime, frame), offset: at / frames.length, easing: "step-end" }));
    keys.push({ backgroundPositionX: bookFramePos(runtime, frames[frames.length - 1]), offset: 1 });
    return runtime.state.bookDialog.querySelector(".stump-book-art").animate(keys, { duration: frames.length * runtime.state.BOOK_FRAME_MS, fill: "forwards" });
  }
  function bookButtonHtml(runtime) {
    return `<button type="button" class="stump-recipe-book" data-stump-action="recipe-book" aria-haspopup="dialog"><img src="assets/ui/grove/recipe-book.png" alt="" draggable="false"><span>${(0, runtime.deps._t)("조합법 {bookCount}", { bookCount: bookCount(runtime) })}</span></button>`;
  }
  function bookMarkup(runtime) {
    return `<div class="stump-book-volume"><div class="stump-book-art" aria-hidden="true"></div><div class="stump-book-cover" aria-hidden="true"></div><div class="stump-book-text"><div class="stump-book-flow">${recipeBookHtml(runtime)}</div></div><button type="button" class="stump-book-turn is-prev" aria-label="앞 장" data-book-turn="-1">◀</button><button type="button" class="stump-book-turn is-next" aria-label="다음 장" data-book-turn="1">▶</button><button type="button" class="stump-book-close" aria-label="책 덮기" data-book-close>✕</button></div>`;
  }
  function ensureBookDialog(runtime) {
    if (runtime.state.bookDialog) return runtime.state.bookDialog;
    runtime.state.bookDialog = runtime.deps.document.createElement("dialog");
    runtime.state.bookDialog.className = "stump-book";
    runtime.state.bookDialog.setAttribute("aria-label", (0, runtime.deps._t)("조합법"));
    listenView(runtime, runtime.state.bookDialog, "click", runtime.handlers.onBookClick);
    listenView(runtime, runtime.state.bookDialog, "cancel", (event) => {
      event.preventDefault();
      closeRecipeBook(runtime);
    });
    runtime.deps.document.body.appendChild(runtime.state.bookDialog);
    return runtime.state.bookDialog;
  }
  function onBookClick(runtime, event) {
    const turn = event.target.closest("[data-book-turn]");
    if (turn) return turnBookPage(runtime, Number(turn.dataset.bookTurn));
    if (event.target === runtime.state.bookDialog || event.target.closest("[data-book-close]")) closeRecipeBook(runtime);
  }
  function bookSteps(runtime, flow) {
    const gap = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(flow).columnGap) || 0, step = flow.clientWidth + gap;
    return { step, count: Math.max(1, Math.ceil((flow.scrollWidth + gap) / step - 0.01)) };
  }
  function turnBookPage(runtime, delta) {
    const flow = runtime.state.bookDialog?.querySelector(".stump-book-flow");
    if (!flow || runtime.state.bookTurning) return;
    const { step, count } = bookSteps(runtime, flow);
    const next = Math.max(0, Math.min(count - 1, runtime.state.bookSpread + delta));
    const show = () => {
      runtime.state.bookSpread = next;
      flow.style.transform = `translateX(${-runtime.state.bookSpread * step}px)`;
      markBookTurns(runtime, count);
      runtime.state.bookDialog.classList.remove("is-turning");
      runtime.state.bookTurning = null;
    };
    if (!delta || next === runtime.state.bookSpread || bookStill(runtime)) return show();
    (0, runtime.deps.playUiFeedbackSound)("uiSelect");
    runtime.state.bookDialog.classList.add("is-turning");
    runtime.state.bookTurning = playBookFrames(runtime, delta > 0 ? runtime.state.BOOK_TURN : [7, 6, 5, 4]);
    afterStumpBookMotion(runtime, runtime.state.bookTurning, show);
  }
  function paginateBook(runtime) {
    const flow = runtime.state.bookDialog.querySelector(".stump-book-flow"), all = flow.querySelector(".stump-book-page");
    const height = flow.clientHeight, gap = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(all).rowGap) || 0, pages = [];
    let used = Infinity;
    for (const row of [...all.children]) {
      const h = row.offsetHeight;
      if (used + gap + h > height) {
        pages.push([]);
        used = -gap;
      }
      pages[pages.length - 1].push(row);
      used += gap + h;
    }
    flow.replaceChildren(...pages.map((rows) => {
      const page = runtime.deps.document.createElement("ul");
      page.className = all.className;
      page.append(...rows);
      return page;
    }));
  }
  function markBookTurns(runtime, count) {
    runtime.state.bookDialog.querySelector(".is-prev").disabled = runtime.state.bookSpread === 0;
    runtime.state.bookDialog.querySelector(".is-next").disabled = runtime.state.bookSpread >= count - 1;
  }
  function openRecipeBook(runtime, button) {
    if (!runtime.active) return;
    syncStumpCubeOwner(runtime);
    stopStumpBookMotion(runtime);
    const dialog = ensureBookDialog(runtime);
    dialog.innerHTML = bookMarkup(runtime);
    runtime.state.bookSpread = 0;
    runtime.state.bookOpening += 1;
    runtime.state.bookTurning = null;
    runtime.state.bookButton = button;
    dialog.classList.remove("is-open", "is-turning", "is-closing");
    dialog.classList.add("is-closed");
    dialog.showModal();
    (0, runtime.deps.playUiFeedbackSound)("stumpFrameSwitch");
    paginateBook(runtime);
    turnBookPage(runtime, 0);
    if (bookStill(runtime)) return dialog.classList.replace("is-closed", "is-open");
    afterStumpBookMotion(runtime, flyBook(runtime, false), () => {
      afterStumpBookMotion(runtime, playBookFrames(runtime, runtime.state.BOOK_OPEN), () => dialog.classList.replace("is-closed", "is-open"));
    });
  }
  function flyBook(runtime, back) {
    const volume = runtime.state.bookDialog.querySelector(".stump-book-volume"), box = volume.getBoundingClientRect();
    const button = runtime.state.bookButton?.isConnected ? runtime.state.bookButton : runtime.deps.document.querySelector("#tab-stump .stump-recipe-book");
    const from = button?.offsetParent ? button.querySelector("img") || button : null;
    const cover = volume.querySelector(".stump-book-cover").getBoundingClientRect();
    const start = from ? from.getBoundingClientRect() : { left: cover.left, top: cover.top, width: cover.width * 0.2, height: cover.height * 0.2 };
    const scale = Math.max(0.05, start.width / cover.width);
    const dx = start.left + start.width / 2 - (cover.left + cover.width / 2), dy = start.top + start.height / 2 - (cover.top + cover.height / 2);
    const origin = `${cover.left + cover.width / 2 - box.left}px ${cover.top + cover.height / 2 - box.top}px`;
    const away = { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: origin, opacity: back ? 0 : 1 };
    const home = { transform: "translate(0, 0) scale(1)", transformOrigin: origin, opacity: 1 };
    return volume.animate(
      back ? [home, away] : [away, home],
      { duration: runtime.state.BOOK_GROW_MS, easing: back ? "cubic-bezier(.6, 0, .8, .3)" : "cubic-bezier(.2, .7, .2, 1)", fill: "both" }
    );
  }
  function closeRecipeBook(runtime) {
    if (!runtime.state.bookDialog?.open || runtime.state.bookDialog.classList.contains("is-closing")) return;
    stopStumpBookMotion(runtime);
    const closing = runtime.state.bookOpening, done = () => {
      if (closing !== runtime.state.bookOpening) return;
      runtime.state.bookDialog.close();
      runtime.state.bookDialog.classList.remove("is-open", "is-closed", "is-turning", "is-closing");
    };
    if (bookStill(runtime)) return done();
    runtime.state.bookTurning?.cancel();
    runtime.state.bookTurning = null;
    runtime.state.bookDialog.classList.remove("is-open", "is-turning");
    runtime.state.bookDialog.classList.add("is-closed", "is-closing");
    afterStumpBookMotion(runtime, playBookFrames(runtime, [...runtime.state.BOOK_OPEN].reverse()), () => {
      afterStumpBookMotion(runtime, flyBook(runtime, true), done);
    });
  }
  function bookCount(runtime) {
    return `${runtime.deps.stumpCube.revealed(runtime.deps.game).length}/${runtime.deps.STUMP_CUBE_RECIPES.length}`;
  }
  function bookFramePos(runtime, frame) {
    return `${frame / (runtime.state.BOOK_STRIP - 1) * 100}%`;
  }
  function bookStill(runtime) {
    return runtime.deps.uiDisplay.matches("(prefers-reduced-motion: reduce)") || !runtime.state.bookDialog.querySelector(".stump-book-art").animate;
  }

  // modules/ui/stump-cube-actions.mjs
  function selectCubeItem(runtime, index) {
    if (syncStumpCubeOwner(runtime)) return;
    const item = runtime.state.pickerItems[index];
    if (!item || !runtime.deps.stumpCube.candidates(runtime.state.pickerKind).includes(item)) {
      (0, runtime.deps.showGameToast)((0, runtime.deps._t)("재료 상태가 바뀌었습니다. 다시 선택해 주세요."), { tone: "warning" });
      return openCubePicker(runtime, runtime.state.pickerKind);
    }
    runtime.state.pickerSelection = { kind: runtime.state.pickerKind, item };
    const panel = runtime.deps.document.getElementById(runtime.state.OVERLAY_ID)?.querySelector(".selection-overlay-panel");
    if (!panel) return;
    panel.querySelectorAll("[data-cube-candidate]").forEach((button) => {
      const selected = Number(button.dataset.cubeCandidate) === index;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderMaterialDetail(runtime, panel);
  }
  function openCubePicker(runtime, kind) {
    syncStumpCubeOwner(runtime);
    if (!runtime.deps.selectionDialog.isOpen(runtime.state.OVERLAY_ID) || kind && kind !== runtime.state.pickerKind) runtime.state.pickerSelection = null;
    if (runtime.deps.stumpCube.KINDS.includes(kind)) runtime.state.pickerKind = kind;
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.OVERLAY_ID, title: (0, runtime.deps._t)("조합창에 넣을 재료"), panelClass: "stump-cube-picker-panel", body: pickerBodyHtml(runtime) });
    runtime.state.pickerPanel = panel;
    renderMaterialDetail(runtime, panel);
  }
  function closeCubePicker(runtime) {
    runtime.state.pickerSelection = null;
    runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
  }
  function refreshCube(runtime) {
    if (runtime.deps.selectionDialog.isOpen(runtime.state.OVERLAY_ID)) openCubePicker(runtime, runtime.state.pickerKind);
    runtime.deps.stumpBoxUi.refreshStumpTabNow();
  }
  function pickCubeItem(runtime) {
    if (!runtime.active || syncStumpCubeOwner(runtime)) return;
    const selected = runtime.state.pickerSelection;
    const usable = selected && runtime.deps.stumpCube.candidates(selected.kind).includes(selected.item);
    const reason = usable ? runtime.deps.stumpCube.put(runtime.deps.game, selected.kind, selected.item) : "재료 상태가 바뀌었습니다. 다시 선택해 주세요.";
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    runtime.state.pickerSelection = null;
    refreshCube(runtime);
  }
  function takeOutCubeCell(runtime, cell) {
    if (runtime.deps.stumpCube.takeOut(runtime.deps.game, cell)) refreshCube(runtime);
  }
  function moveCubeItem(runtime, from, to) {
    const reason = runtime.deps.stumpCube.move(runtime.deps.game, from, to);
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    refreshCube(runtime);
  }
  function putStumpItem(runtime, id, cell) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    const reason = item ? runtime.deps.stumpCube.put(runtime.deps.game, "stump", item, cell) : "재료 상태가 바뀌었습니다. 다시 선택해 주세요.";
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    refreshCube(runtime);
    return !reason;
  }
  function putWalletUnit(runtime, key) {
    const piece = runtime.deps.stumpCube.candidates("wallet").find((row) => row.walletKey === key);
    const reason = piece ? runtime.deps.stumpCube.put(runtime.deps.game, "wallet", piece) : "조합창에 더 넣을 수 없습니다.";
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    refreshCube(runtime);
  }
  function quickFillCube(runtime, recipeId) {
    const reason = runtime.deps.stumpCube.fillCubeRecipe(runtime.deps.game, recipeId);
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    refreshCube(runtime);
  }
  function transmuteCube(runtime) {
    const result = runtime.deps.stumpCube.transmute();
    (0, runtime.deps.playUiFeedbackSound)(result.ok ? "craftSuccess" : "craftFailure");
    if (!result.ok) return (0, runtime.deps.showGameToast)(result.reason, { tone: "warning" });
    runtime.state.lastResult = { state: runtime.deps.game, season: runtime.deps.game.season, outputs: JSON.parse(JSON.stringify(result.outputs)) };
    const names = result.outputs.map((row) => itemName(runtime, row.kind, row.item)).join(", ");
    const paid = Object.entries(result.paid).map(([key, need]) => (0, runtime.deps._t)("{name} {need}개", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name), need })).join(", ");
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧩 조합창 {recipe}: {names}{paid}", { recipe: (0, runtime.deps._t)(result.recipe.name), names, paid: paid ? ` ${(0, runtime.deps._t)("({cost} 사용)", { cost: paid })}` : "" }), "loot-rare");
    result.outputs.filter((row) => row.kind === "core" && row.item && row.item.perfect).forEach((row) => (0, runtime.deps.dispatchRuntimeEvent)("incident", { text: (0, runtime.deps._t)("체이싱 코어를 획득했습니다. 「{name}」", { name: row.item.name }), tone: "chase", chase: true }));
    (0, runtime.deps.queueImportantSave)(300);
    (0, runtime.deps.updateStaticUI)();
    refreshCube(runtime);
  }
  function putBagItem(runtime, item, cell) {
    if (!runtime.deps.stumpBoxUi.frameShowsCube()) return false;
    const usable = runtime.deps.stumpCube.candidates("equipment").includes(item);
    const reason = usable ? runtime.deps.stumpCube.put(runtime.deps.game, "equipment", item, cell) : "조합창에 넣을 수 없는 장비입니다.";
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    refreshCube(runtime);
    return true;
  }

  // modules/ui/stump-cube-view.mjs
  function createStumpCubeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { entryHtml, resultCardHtml, onBookClick, cubeHtml, cubeGridHtml, cubeSignature, openCubePicker, closeCubePicker, selectCubeItem, pickCubeItem, inspectCubeResult, takeOutCubeCell, moveCubeItem, transmuteCube, recipeToneHtml, putStumpItem, putWalletUnit, quickFillCube, putBagItem, bookButtonHtml, openRecipeBook };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = StumpCubeViewApi(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.owner = runtime.deps.game;
    runtime.state.bookAnimations = /* @__PURE__ */ new Set();
    runtime.state.OVERLAY_ID = "stump-cube-picker";
    runtime.state.KIND_LABELS = { equipment: "장비", stump: "그루터기", jewel: "주얼", core: "코어", wallet: "화폐화" };
    runtime.state.pickerKind = "equipment";
    runtime.state.pickerItems = [];
    runtime.state.pickerSelection = null;
    runtime.state.lastResult = null;
    runtime.state.ICONS = Object.freeze({
      equipment: (item) => (0, runtime.deps.getEquipmentGridVisualAsset)(item),
      stump: (item) => runtime.deps.stumpBox.iconPath(item),
      wallet: (item) => runtime.deps.stumpBox.iconPath(item),
      jewel: (item) => (0, runtime.deps.getInventoryItemVisualAsset)(item, "jewel"),
      core: (item) => runtime.deps.coreItems.icon(item)
    });
    runtime.state.GROUP_TONES = Object.freeze({ 장비: "#e6c67f", 그루터기: "#9fd46a", 부적: "#c9a0f0", 주얼: "#7fd6cf", 코어: "#f0a35a" });
    runtime.state.KIND_TONES = Object.freeze([
      ["장신구", "#e6c67f"],
      ["장비", "#e6c67f"],
      ["씨앗", "#9fd46a"],
      ["꽃", "#f0a8c8"],
      ["열매", "#e8955a"],
      ["덩굴", "#7cc9a0"],
      ["뿌리", "#d0a070"],
      ["부적", "#c9a0f0"],
      ["주얼", "#7fd6cf"],
      ["코어", "#f0a35a"],
      ["기폭제", "#f3d28c"],
      ["기름", "#f3d28c"]
    ]);
    runtime.state.recipeTone = null;
    runtime.state.bookDialog = null;
    runtime.state.bookSpread = 0;
    runtime.state.bookOpening = 0;
    runtime.state.bookButton = null;
    runtime.state.bookTurning = null;
    runtime.state.BOOK_GROW_MS = 360;
    runtime.state.BOOK_FRAME_MS = 104;
    runtime.state.BOOK_STRIP = 8;
    runtime.state.BOOK_OPEN = [0, 1, 2, 3, 4];
    runtime.state.BOOK_TURN = [5, 6, 7, 4];
  }
  function StumpCubeViewApi(runtime) {
    return Object.freeze({
      cubeHtml: runtime.handlers.cubeHtml,
      cubeGridHtml: runtime.handlers.cubeGridHtml,
      cubeSignature: runtime.handlers.cubeSignature,
      openCubePicker: runtime.handlers.openCubePicker,
      closeCubePicker: runtime.handlers.closeCubePicker,
      selectCubeItem: runtime.handlers.selectCubeItem,
      pickCubeItem: runtime.handlers.pickCubeItem,
      inspectCubeResult: runtime.handlers.inspectCubeResult,
      takeOutCubeCell: runtime.handlers.takeOutCubeCell,
      moveCubeItem: runtime.handlers.moveCubeItem,
      transmuteCube: runtime.handlers.transmuteCube,
      recipeToneHtml: runtime.handlers.recipeToneHtml,
      putStumpItem: runtime.handlers.putStumpItem,
      putWalletUnit: runtime.handlers.putWalletUnit,
      quickFillCube: runtime.handlers.quickFillCube,
      putBagItem: runtime.handlers.putBagItem,
      bookButtonHtml: runtime.handlers.bookButtonHtml,
      openRecipeBook: runtime.handlers.openRecipeBook,
      dispose: () => disposeStumpCubeView(runtime)
    });
  }
  function disposeStumpCubeView(runtime) {
    releaseViewEvents(runtime);
    stopStumpBookMotion(runtime);
    if (runtime.state.pickerPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
    if (runtime.state.resultPanel?.isConnected) runtime.deps.selectionDialog.close("stump-cube-result");
    runtime.state.bookDialog?.close();
    runtime.state.bookDialog?.remove();
    runtime.state.bookDialog = runtime.state.pickerPanel = runtime.state.resultPanel = null;
  }

  // modules/stump-cube-ui-classic.mjs
  var stumpCubeUi = createStumpCubeView({
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_BOX_RIPENING() {
      return STUMP_BOX_RIPENING;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get STUMP_BOX_SCAR() {
      return STUMP_BOX_SCAR;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getStyledOrbName() {
      return getStyledOrbName;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get stumpCube() {
      return stumpCube;
    },
    get statToneText() {
      return statToneText;
    },
    get STUMP_BOX_STAGES() {
      return STUMP_BOX_STAGES;
    },
    get STUMP_CUBE_RECIPES() {
      return STUMP_CUBE_RECIPES;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get coreItems() {
      return coreItems;
    },
    get talismans() {
      return talismans;
    },
    get getJewelStats() {
      return getJewelStats;
    },
    get getStatName() {
      return getStatName;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get document() {
      return document;
    },
    get showGameToast() {
      return showGameToast;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get addLog() {
      return addLog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get parseFloat() {
      return parseFloat;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get getInventoryItemVisualAsset() {
      return getInventoryItemVisualAsset;
    }
  });
  safeExposeGlobals({ stumpCubeUi });
})();
