// GENERATED from modules/crafting-workspace-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/crafting-catalog-summaries.mjs
  function createCatalogSummaries() {
    return {
      magicBud: "일반 → 마법, 마법 옵션 재련",
      sapBud: "마법 → 희귀, 옵션 1줄 추가",
      formlessDew: "일반 → 희귀, 희귀 옵션 재련",
      goldenRule: "옵션 수치 재설정",
      blessing: "베이스 옵션 수치 재설정",
      blightSpore: "일반 등급으로 초기화",
      pruningShears: "무작위 옵션 1줄 제거",
      fairyRing: "고유 진화, 25% 파괴",
      emberBranch: "타락 옵션 시도, 이후 제작 불가",
      burningEmberBranch: "한 번 더 타락, 25% 파괴",
      ouroboros: "장비 봉인, 루프 후 유지",
      deepWhetstone: "무기 퀄리티 강화",
      rootIron: "방어구 퀄리티 강화",
      jewelPolish: "장신구 퀄리티 강화",
      abyssCatalyst: "퀄리티 속성 변경",
      catalystFire: "품질 속성 화염, 품질 +2%",
      catalystCold: "품질 속성 냉기, 품질 +2%",
      catalystLight: "품질 속성 번개, 품질 +2%",
      catalystPhys: "품질 속성 물리, 품질 +2%",
      catalystChaos: "품질 속성 카오스, 품질 +2%",
      catalystCrit: "품질 속성 치명, 품질 +2%",
      catalystSummon: "품질 속성 소환, 품질 +2%",
      enchantedHoney: "옵션 1줄 영구 고정",
      venomStinger: "무기 공격 옵션 추가/재설정",
      voidChisel: "장신구 소켓, 공허 주얼 제작",
      oceanRerollShard: "봉인되지 않은 무작위 추가 옵션 1줄 교체",
      altarEmber: "베이스 옵션 1줄을 태양 줄로",
      altarIchor: "베이스 옵션 1줄을 허기 줄로",
      memoryImprint: "추가 옵션 새기기, 한 번 되돌리기",
      fossil: "타입별 화석으로 정제",
      fossilPrimal: "복원, 화석과 재화 획득",
      fossilAncientPrimal: "복원, 전용 화석과 고급 재화",
      fossilJagged: "물리/근접 1줄 확정, 희귀 재련",
      fossilBound: "생명/방어 1줄 확정, 희귀 재련",
      fossilGale: "속도/치명 1줄 확정, 희귀 재련",
      fossilPrismatic: "저항/원소 1줄 확정, 희귀 재련",
      fossilAbyssal: "카오스/흡혈/재생 1줄 확정, 희귀 재련",
      fossilPrimordial: "관통/카오스 1줄 확정, 희귀 재련",
      fossilBulwark: "최대 원소 저항 확정, 방어구 재련",
      fossilWedge: "투사체/치명 1줄 확정, 희귀 재련",
      fossilOld: "화석 전용 1줄 확정, 희귀 재련",
      fossilRift: "균열 표식, 추가 옵션 50% 증폭"
    };
  }

  // modules/ui/crafting-catalog-view.mjs
  function sporeShortage(ctx, mode) {
    return (0, ctx.deps._t)("{name} 없음", { name: ctx.deps.stumpBox.harvestPriceName((0, ctx.deps.getSporeCraftPriceKey)(mode)) });
  }
  function catalogCapture(ctx) {
    ctx.deps.craftingWorkspaceState.capture(ctx.deps.game);
  }
  function catalogVisible(ctx, key) {
    return !!catalogGroup(ctx, key) && ctx.deps.game.craftingWorkspace.discovered.includes(key) && ctx.deps.contentProgression.canDropCurrency(key);
  }
  function catalogGroup(ctx, key) {
    return ctx.deps.craftingWorkspaceState.group(key);
  }
  function catalogDescription(ctx, key, compact = false) {
    return esc(ctx, compact ? catalogSummary(ctx, key) : ctx.deps.ORB_DB[key].desc).replace(ctx.state.keywordPattern, (word) => `<span class="cl-keyword" data-keyword="${ctx.state.keywordTones[word]}">${word}</span>`);
  }
  function catalogActionLabel(ctx, key, state) {
    const blocked = state && !state.enabled;
    const reason = blocked ? state.reason === "방어구 전용" ? state.reason : "사용 불가" : "";
    return [key === (ctx.state.inspected || ctx.state.active) ? "선택 중" : "", reason, ctx.deps.game.currencies[key] ? "" : "보유 없음"].filter(Boolean).join(", ");
  }
  function catalogCard(ctx, key) {
    const def = ctx.deps.ORB_DB[key], amount = ctx.deps.game.currencies[key] || 0;
    const selected2 = key === (ctx.state.inspected || ctx.state.active);
    const state = ctx.state.useState(key), blocked = state && !state.enabled;
    return `<button type="button" class="cl-resource ${amount ? "" : "is-empty"} ${selected2 ? "is-selected" : ""} ${blocked ? "is-unavailable" : ""}" data-theme="${ctx.state.theme(key)}" data-resource="${key}" aria-pressed="${selected2}">
            <span class="cl-resource-head">${def.icon ? `<img src="${esc(ctx, def.icon)}" alt="">` : ""}<strong>${styledName(ctx, key)}</strong><b>${amount.toLocaleString(ctx.deps.i18n.locale)}</b></span>
            <span class="cl-resource-desc">${catalogDescription(ctx, key, true)}</span><small>${esc(ctx, catalogActionLabel(ctx, key, state))}</small></button>`;
  }
  function catalogList(ctx) {
    catalogCapture(ctx);
    const keys = Object.keys(ctx.deps.ORB_DB).filter(ctx.handlers.listed).filter((key) => (ctx.state.category === "all" || catalogGroup(ctx, key) === ctx.state.category) && (!ctx.state.ownedOnly || ctx.deps.game.currencies[key] > 0)).filter((key) => (name(ctx, key) + " " + ctx.deps.ORB_DB[key].desc).includes(ctx.state.query));
    ctx.state.dialog.querySelector(".cl-resource-list").innerHTML = keys.map(ctx.handlers.catalogCard).join("") || '<p class="cl-resource-empty">해당하는 재화가 없습니다.</p>';
    ctx.state.dialog.querySelector(".cl-resource-count").textContent = (0, ctx.deps._t)("{length}종", { length: keys.length });
  }
  function catalogSelect(ctx, key) {
    if (!listed(ctx, key)) return;
    ctx.state.inspected = key;
    catalogList(ctx);
    const detail = ctx.state.dialog.querySelector(".cl-resource-detail");
    const available = ctx.state.recipes.some((row) => row.key === key) || /^(spore|fossil)/.test(key);
    const label = ["fossil", "fossilPrimal", "fossilAncientPrimal"].includes(key) ? "정제/복원 열기" : "제작실에서 선택";
    const state = ctx.state.useState(key), blocked = state && !state.enabled;
    detail.innerHTML = `<div><strong>${styledName(ctx, key)}</strong><p>${catalogDescription(ctx, key)}</p>${blocked ? `<small class="cl-use-reason">${esc(ctx, state.reason)}</small>` : ""}</div>${available ? `<button type="button" data-apply ${blocked ? "disabled" : ""}>${label}</button>` : ""}`;
    detail.hidden = false;
    const selectedCard = ctx.state.dialog.querySelector(`[data-resource="${key}"]`);
    if (selectedCard) {
      selectedCard.focus({ preventScroll: true });
      selectedCard.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
  function catalogClose(ctx) {
    ctx.state.dialog.close();
    ctx.deps.document.getElementById(ctx.state.openerId)?.focus({ preventScroll: true });
  }
  function catalogRenderNavigation(ctx) {
    ctx.state.dialog.querySelector("#cl-catalog-title").textContent = ctx.state.craftingOnly ? (0, ctx.deps._t)("제작 재화 선택") : (0, ctx.deps._t)("재화 인벤토리");
    if (ctx.state.craftingOnly && ctx.state.category === "omen") ctx.state.category = "all";
    ctx.state.dialog.querySelectorAll("[data-category]").forEach((tab) => {
      tab.hidden = ctx.state.craftingOnly && tab.dataset.category === "omen";
      tab.setAttribute("aria-pressed", String(tab.dataset.category === ctx.state.category));
    });
  }
  function catalogOpen(ctx, available, callback, settings = {}) {
    ctx.state.recipes = available;
    ctx.state.onSelect = callback;
    ctx.state.active = settings.active || "";
    ctx.state.inspected = "";
    ctx.state.craftingOnly = !!settings.craftingOnly;
    ctx.state.useState = settings.useState;
    ctx.state.openerId = ctx.deps.document.activeElement?.id || "cl-inventory-open";
    catalogCapture(ctx);
    if (!ctx.state.dialog) catalogCreate(ctx);
    catalogRenderNavigation(ctx);
    ctx.state.query = "";
    ctx.state.dialog.querySelector('input[type="search"]').value = "";
    ctx.state.dialog.querySelector(".cl-resource-detail").hidden = true;
    catalogList(ctx);
    ctx.state.dialog.querySelector(".cl-resource-list").scrollTop = 0;
    if (!ctx.state.dialog.open) ctx.state.dialog.showModal();
    catalogSelectOpeningResource(ctx, settings.inspect);
  }
  function catalogSelectOpeningResource(ctx, key) {
    const target = key || ctx.state.active;
    if (listed(ctx, target)) catalogSelect(ctx, target);
  }
  function catalogClick(ctx, event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-close")) return catalogClose(ctx);
    if (button.hasAttribute("data-apply")) {
      if (catalogVisible(ctx, ctx.state.inspected)) {
        catalogClose(ctx);
        ctx.state.onSelect(ctx.state.inspected);
      }
      return;
    }
    if (button.dataset.resource) return catalogSelect(ctx, button.dataset.resource);
    ctx.state.category = button.dataset.category;
    ctx.state.dialog.querySelector(".cl-resource-detail").hidden = true;
    catalogRenderNavigation(ctx);
    catalogList(ctx);
  }
  function catalogCreate(ctx) {
    ctx.state.dialog = ctx.deps.document.createElement("dialog");
    ctx.state.dialog.className = "cl-catalog";
    ctx.state.dialog.setAttribute("aria-labelledby", "cl-catalog-title");
    ctx.state.dialog.innerHTML = `<header><div><small>${(0, ctx.deps._t)("보관함")}</small><h2 id="cl-catalog-title">${(0, ctx.deps._t)("재화 인벤토리")}</h2></div><div><button type="button" data-close aria-label="${(0, ctx.deps._t)("재화 목록 닫기")}">${(0, ctx.deps._t)("닫기")}</button></div></header>
            <nav aria-label="${(0, ctx.deps._t)("재화 분류")}">${ctx.state.groups.map(([key, label]) => `<button type="button" data-category="${key}" data-theme="${key}" aria-pressed="${key === ctx.state.category}">${label}</button>`).join("")}</nav>
            <div class="cl-resource-tools"><input type="search" aria-label="${(0, ctx.deps._t)("재화 검색")}" placeholder="${(0, ctx.deps._t)("이름/효과 검색")}"><label><input type="checkbox"> ${(0, ctx.deps._t)("소진한 재화도 보기")}</label><small class="cl-resource-count"></small></div>
            <div class="cl-resource-list"></div><aside class="cl-resource-detail" tabindex="-1" hidden></aside>`;
    ctx.deps.document.body.append(ctx.state.dialog);
    ctx.state.dialog.addEventListener("click", ctx.handlers.catalogClick);
    ctx.state.dialog.addEventListener("input", (event) => {
      if (event.target.type === "search") ctx.state.query = event.target.value.trim();
      else ctx.state.ownedOnly = !event.target.checked;
      catalogList(ctx);
    });
    ctx.state.dialog.addEventListener("cancel", () => ctx.deps.document.getElementById(ctx.state.openerId)?.focus({ preventScroll: true }));
  }
  function esc(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value));
  }
  function name(ctx, key) {
    return (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name).replace(/^[^가-힣A-Za-z0-9]+/u, "");
  }
  function listed(ctx, key) {
    return catalogVisible(ctx, key) && (!ctx.state.craftingOnly || !ctx.state.separateMaterials.has(key));
  }
  function styledName(ctx, key) {
    return `<span class="cl-currency-name" data-theme="${ctx.state.theme(key)}">${ctx.deps.window.getStyledOrbName(key)}</span>`;
  }
  function catalogSummary(ctx, key) {
    return ctx.state.summaries[key] || ctx.deps.ORB_DB[key].desc;
  }

  // modules/ui/crafting-catalog.mjs
  function createCraftingCatalog(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { listed, catalogCard, catalogClick, catalogGroup, catalogOpen, name, styledName, catalogDescription, catalogSummary, catalogCapture, catalogVisible, sporeShortage };
    for (const [name2, handler] of Object.entries(handlers)) ctx.handlers[name2] = handler.bind(void 0, ctx);
    initialize(ctx);
    ctx.api = { open: ctx.handlers.catalogOpen, name: ctx.handlers.name, styledName: ctx.handlers.styledName, description: ctx.handlers.catalogDescription, summary: ctx.handlers.catalogSummary, theme: ctx.state.theme, capture: ctx.handlers.catalogCapture, visible: ctx.handlers.catalogVisible, sporeShortage: ctx.handlers.sporeShortage };
    return ctx.api;
  }
  function initialize(ctx) {
    ctx.state.groups = [["all", "전체"], ["basic", "기본 재화"], ["fossil", "화석"], ["special", "특수 제작"], ["omen", "뿌리"]];
    ctx.state.separateMaterials = new Set(ctx.deps.craftingWorkspaceState.separate);
    ctx.state.craftingOnly = false;
    ctx.state.useState = void 0;
    ctx.state.dialog = void 0;
    ctx.state.onSelect = void 0;
    ctx.state.recipes = void 0;
    ctx.state.category = "all";
    ctx.state.query = "";
    ctx.state.ownedOnly = true;
    ctx.state.active = "";
    ctx.state.inspected = "";
    ctx.state.openerId = "";
    ctx.state.theme = ctx.handlers.catalogGroup;
    ctx.state.keywordTones = { 일반: "normal", 마법: "magic", 희귀: "rare", 고유: "unique", 물리: "physical", 근접: "physical", 생명: "life", 방어: "defense", 속도: "speed", 치명: "critical", 저항: "resist", 원소: "element", 카오스: "chaos", 흡혈: "life", 재생: "life", 화염: "fire", 냉기: "cold", 번개: "light", 투사체: "speed", 관통: "physical", 균열: "chaos", 타락: "life" };
    ctx.state.keywordPattern = new RegExp(Object.keys(ctx.state.keywordTones).join("|"), "g");
    ctx.state.summaries = createCatalogSummaries();
  }

  // modules/ui/crafting-stash-view.mjs
  function stashCellHtml(ctx, key, picked) {
    if (!ctx.deps.craftingCatalogUi.visible(key)) return '<span class="cl-stash-cell is-blank" aria-hidden="true"></span>';
    const amount = ctx.deps.game.currencies[key] || 0, name2 = ctx.deps.craftingCatalogUi.name(key), omen = ctx.deps.CRAFT_OMENS.keys.includes(key);
    const on = omen ? picked.omen === key : picked.recipe === key;
    const count = amount.toLocaleString(ctx.deps.i18n.locale), held2 = (0, ctx.deps._t)("보유 {currencies}", { currencies: count });
    return `<button type="button" id="cl-stash-${key}" class="cl-stash-cell${amount ? "" : " is-empty"}${on ? " is-on" : ""}" data-theme="${ctx.deps.craftingCatalogUi.theme(key)}"
            ${omen ? "data-omen" : "data-recipe"}="${key}" aria-pressed="${on}" aria-label="${esc2(ctx, name2)}, ${esc2(ctx, held2)}" data-info-tooltip-anchor="1"
            onpointerenter="craftingStashUi.tip(event,'${key}')" onpointerleave="hideInfoTooltip()"><img src="${esc2(ctx, ctx.deps.ORB_DB[key].icon)}" alt="" draggable="false">${amount ? `<b>${count}</b>` : ""}</button>`;
  }
  function stashTip(ctx, event, key) {
    if (event.pointerType !== "mouse") return;
    const amount = ctx.deps.game.currencies[key] || 0;
    const held2 = (0, ctx.deps._t)("보유 {currencies}", { currencies: amount.toLocaleString(ctx.deps.i18n.locale) });
    const html = `<div class="cl-stash-tip"><div class="tooltip-title">${ctx.deps.craftingCatalogUi.styledName(key)}</div><div class="tooltip-line cl-stash-tip-held${amount ? "" : " is-empty"}">${esc2(ctx, held2)}</div><div class="tooltip-line cl-stash-tip-effect">${ctx.deps.craftingCatalogUi.description(key, true)}</div></div>`;
    const tone = (0, ctx.deps.getComputedStyle)(event.currentTarget).getPropertyValue("--resource-tone").trim();
    (0, ctx.deps.showInfoTooltipHtml)(event.clientX, event.clientY, html, tone || "#a98546", `stash:${key}:${amount}`);
  }
  function stashGroupHtml(ctx, group, picked) {
    return `<div class="cl-stash-group" style="--cl-stash-cols:${group.cols}"><small>${esc2(ctx, (0, ctx.deps._t)(group.label))}</small>${group.keys.map((key) => stashCellHtml(ctx, key, picked)).join("")}</div>`;
  }
  function stashTabHtml(ctx, tab, current, picked) {
    const keys = tab.groups.flatMap((group) => group.keys);
    const marked = keys.includes(picked.recipe) || keys.includes(picked.omen);
    return `<button type="button" id="cl-stash-tab-${tab.id}" class="cl-stash-tab${marked ? " has-pick" : ""}" role="tab" data-stash-tab="${tab.id}"
            aria-selected="${tab === current}" aria-controls="cl-stash-page"><img src="${esc2(ctx, ctx.deps.ORB_DB[tab.icon].icon)}" alt="" draggable="false"><span>${esc2(ctx, (0, ctx.deps._t)(tab.label))}</span></button>`;
  }
  function stashHtml(ctx, picked) {
    ctx.deps.craftingCatalogUi.capture();
    const current = ctx.state.TABS.find((tab) => tab.id === ctx.state.shownTab) || stashTabOf(ctx, picked.recipe) || ctx.state.TABS[0];
    ctx.state.shownTab = current.id;
    return `<div class="cl-stash-box"><div class="cl-stash-tabs" role="tablist" aria-label="${esc2(ctx, (0, ctx.deps._t)("재화 보관함"))}">${ctx.state.TABS.map((tab) => stashTabHtml(ctx, tab, current, picked)).join("")}</div>
            <div class="cl-stash" id="cl-stash-page" role="tabpanel" aria-labelledby="cl-stash-tab-${current.id}">${current.groups.map((group) => stashGroupHtml(ctx, group, picked)).join("")}</div></div>`;
  }
  function stashShowTab(ctx, id) {
    if (ctx.state.TABS.some((tab) => tab.id === id)) ctx.state.shownTab = id;
  }
  function esc2(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value));
  }
  function stashTabOf(ctx, key) {
    return ctx.state.TABS.find((tab) => tab.groups.some((group) => group.keys.includes(key)));
  }

  // modules/ui/crafting-stash.mjs
  function createCraftingStash(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { stashHtml, stashShowTab, stashTip };
    for (const [name2, handler] of Object.entries(handlers)) ctx.handlers[name2] = handler.bind(void 0, ctx);
    initialize2(ctx);
    ctx.api = Object.freeze({ html: ctx.handlers.stashHtml, showTab: ctx.handlers.stashShowTab, tip: ctx.handlers.stashTip });
    return ctx.api;
  }
  function initialize2(ctx) {
    ctx.state.TABS = Object.freeze([
      { id: "basic", label: "기본 재화", icon: "formlessDew", groups: [
        { label: "등급", cols: 3, keys: ["magicBud", "sapBud", "formlessDew"] },
        { label: "수치", cols: 2, keys: ["goldenRule", "blessing"] },
        { label: "제거", cols: 2, keys: ["blightSpore", "pruningShears"] },
        { label: "진화", cols: 1, keys: ["fairyRing"] }
      ] },
      { id: "special", label: "특수 제작", icon: "emberBranch", groups: [
        { label: "타락", cols: 1, keys: ["emberBranch", "burningEmberBranch"] },
        { label: "고정", cols: 1, keys: ["ouroboros", "enchantedHoney"] },
        { label: "부여", cols: 2, keys: ["venomStinger", "voidChisel", "oceanRerollShard"] },
        { label: "제단", cols: 1, keys: ["altarEmber", "altarIchor"] }
      ] },
      { id: "quality", label: "퀄리티", icon: "catalystFire", groups: [
        { label: "강화", cols: 1, keys: ["deepWhetstone", "rootIron", "jewelPolish"] },
        { label: "속성", cols: 4, keys: ["abyssCatalyst", "catalystPhys", "catalystFire", "catalystCold", "catalystLight", "catalystChaos", "catalystCrit", "catalystSummon"] }
      ] },
      { id: "fossil", label: "화석", icon: "fossilJagged", groups: [
        { label: "정제", cols: 1, keys: ["fossil", "fossilPrimal", "fossilAncientPrimal"] },
        { label: "화석", cols: 5, keys: ["fossilJagged", "fossilBound", "fossilGale", "fossilPrismatic", "fossilAbyssal", "fossilPrimordial", "fossilBulwark", "fossilWedge", "fossilOld", "fossilRift"] }
      ] },
      { id: "omen", label: "뿌리", icon: "omenWeave", groups: [
        { label: "제작 뿌리", cols: 5, keys: ["omenPruning", "omenCompost", "omenWeave", "omenPyre", "omenHunger"] }
      ] }
    ]);
    ctx.state.shownTab = "";
  }

  // modules/ui/crafting-workspace-selection.mjs
  function workspaceSetGoal(ctx, target, tier, count = 2) {
    const rule = String(target).startsWith("tag:") ? { tag: target.slice(4), minCount: Number(count), minTier: Number(tier) } : { statId: target, minTier: Number(tier), minValue: 0 };
    const rules = [rule, ...(ctx.state.goal?.rules || []).slice(1)];
    ctx.state.goal = ctx.deps.equipmentLootPolicy.normalizeTargets({ enabled: true, scope: "explicit", slot: "any", minMatches: ctx.state.goalMatch === "all" ? rules.length : 1, rules });
    ctx.state.acknowledged = "";
    workspaceSaveGoals(ctx);
  }
  function workspaceSaveGoals(ctx) {
    ctx.deps.game.craftingWorkspace.goal = ctx.deps.craftingWorkspaceState.normalizeGoal({ ...ctx.state.goal.rules[0], match: ctx.state.goalMatch, extra: ctx.state.goal.rules.slice(1) });
    (0, ctx.deps.queueImportantSave)(180);
  }
  function workspaceRestoreGoal(ctx) {
    const saved = ctx.deps.game.craftingWorkspace.goal;
    ctx.state.goalMatch = saved.match || "all";
    const rules = [saved, ...saved.extra || []].map((rule) => rule.tag ? { tag: rule.tag, minCount: rule.minCount, minTier: rule.minTier } : { statId: rule.statId, minTier: rule.minTier, minValue: 0 });
    ctx.state.goal = ctx.deps.equipmentLootPolicy.normalizeTargets({ enabled: true, scope: "explicit", slot: "any", minMatches: ctx.state.goalMatch === "all" ? rules.length : 1, rules });
  }
  function workspaceGoalOptions(ctx) {
    return ctx.deps.craftingGoalOptions.get(selected(ctx), ctx.state.recipe, ctx.state.mode, workspaceUsedOmen(ctx));
  }
  function workspaceGoalTags(ctx) {
    return ctx.deps.craftingGoalOptions.tags(selected(ctx), ctx.state.recipe, ctx.state.mode, workspaceUsedOmen(ctx));
  }
  function workspaceGoalChoice(ctx, rule) {
    if (!rule) return void 0;
    return rule.tag ? workspaceGoalTags(ctx).find((row) => row.id === rule.tag) : workspaceGoalOptions(ctx).find((row) => row.id === rule.statId);
  }
  function workspaceGoalReachable(ctx, rule) {
    if (ctx.deps.equipmentLootPolicy.matches(selected(ctx), { settings: { equipmentTargets: { ...ctx.state.goal, rules: [rule], minMatches: 1 } } })) return true;
    const choice = workspaceGoalChoice(ctx, rule);
    return !!choice && rule.minTier <= choice.maxTier && (!rule.tag || rule.minCount <= choice.maxCount);
  }
  function workspaceUseState(ctx) {
    return ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game) ? ctx.state.CHOICE_WAIT : workspaceResourceState(ctx, ctx.state.recipe.key);
  }
  function workspaceResourceState(ctx, key) {
    if (!ctx.deps.contentProgression.canOpen("item-tab-craft") || !ctx.deps.contentProgression.canDropCurrency(key)) return { enabled: false, reason: (0, ctx.deps._t)("아직 해금되지 않았습니다.") };
    const locked = ctx.deps.equipmentCrafting.buildLockReason(ctx.deps.game);
    if (locked) return { enabled: false, reason: locked };
    const row = ctx.state.recipes.find((entry) => entry.key === key);
    if (!row) return null;
    if (row.kind === "fossil") return workspaceFossilState(ctx, key);
    const special = workspaceSpecialState(ctx, key);
    if (special) return special;
    if (["ouroboros", "oceanRerollShard"].includes(key)) return workspaceSelectedState(ctx, key);
    return ctx.state.adapter.useState(key, selected(ctx));
  }
  function workspaceSelectedState(ctx, key) {
    const reason = key === "oceanRerollShard" ? (0, ctx.deps.getOceanShardBlockReason)(selected(ctx)) : selected(ctx) ? "" : "아이템을 선택하세요.";
    return { enabled: !reason && ctx.deps.game.currencies[key] > 0, reason: reason || "재화 부족" };
  }
  function workspaceFossilState(ctx, key) {
    const reason = ctx.deps.equipmentCrafting.getFossilUseReason(selected(ctx), ctx.deps.FOSSIL_DB.find((entry) => entry.key === key), ctx.deps.game.season, ctx.deps.game.currencies) || workspaceFossilSlotReason(ctx, key);
    return { enabled: !reason, reason };
  }
  function workspaceSpecialState(ctx, key) {
    if (key === "burningEmberBranch") return ctx.deps.emberCorruptionUi.useState(selected(ctx));
    if (ctx.deps.itemInfluences.isAltarCurrency(key)) return ctx.deps.itemInfluencesUi.useState(key, selected(ctx));
    return ctx.deps.sapCatalysts.isCatalyst(key) ? ctx.deps.sapCatalystsUi.useState(key, selected(ctx)) : null;
  }
  function workspaceFossilSlotReason(ctx, key = ctx.state.recipe.key) {
    const item = selected(ctx);
    if (!item) return "아이템을 선택하세요.";
    const candidate = { ...item, stats: item.stats.filter((stat) => ctx.deps.equipmentCrafting.keptOnReroll(item, stat)), chaosInfusion: null };
    if (key === "fossilRift") return "";
    if (key === "fossilOld") return (0, ctx.deps.getFossilExclusivePool)(candidate).length ? "" : "화석 전용 옵션을 부여할 수 없습니다.";
    const allowed = (0, ctx.deps.getFossilGuaranteedPool)(item, ctx.deps.FOSSIL_DB.find((row) => row.key === key)).length > 0;
    if (!allowed && key === "fossilBulwark") return "방어구 전용";
    return allowed ? "" : "이 장비 부위에 부여할 수 있는 화석 옵션이 없습니다.";
  }
  function workspaceSporeReason(ctx, value) {
    if (!(0, ctx.deps.hasSporeCraftCost)(value)) return ctx.deps.craftingCatalogUi.sporeShortage(value);
    const item = selected(ctx), action = ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key, item.rarity);
    const omen = workspaceArmedOmen(ctx), spec = omen ? ctx.deps.equipmentCrafting.omenSpec(omen.key, omen.side) : null;
    const side = spec?.effect === "side" && ctx.deps.CRAFT_OMENS.effects[spec.key].actions.includes(action) ? spec : null;
    return (0, ctx.deps.getSporeCraftBlockReason)(item, action, value, side) || (side ? ctx.deps.equipmentCrafting.omenReason(item, action, side, value) : "");
  }
  function workspaceUsedOmen(ctx) {
    const item = selected(ctx);
    return item ? ctx.deps.equipmentCrafting.omenFor(ctx.deps.game, ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key, item.rarity), item, (0, ctx.deps.isSporeCraftEquipment)(item) ? ctx.state.mode : "none") : null;
  }
  function workspaceSideEffect(ctx, omen) {
    const side = omen.side === "prefix" ? "접두어" : "접미어";
    const verbs = { formlessDew: "재련", sapBud: "1줄 추가", goldenRule: "옵션 수치만 재설정", blightSpore: "모두 제거", pruningShears: "무작위 1줄 제거" };
    return (0, ctx.deps._t)("{side}만 {verbs}", { side, verbs: verbs[ctx.state.recipe.key] || (0, ctx.deps._t)("변경") });
  }
  function workspaceAutoReason(ctx) {
    if (!["reroll", "add", "fossil"].includes(ctx.state.recipe.kind)) return "이 재화는 한 번씩 사용합니다.";
    if (!ctx.state.goal.rules.length) return "목표 미설정";
    if (matches(ctx, selected(ctx))) return "이미 목표를 달성했어요.";
    const reachable = ctx.state.goal.rules.map(ctx.handlers.workspaceGoalReachable);
    if (ctx.state.goalMatch === "all" ? !reachable.every(Boolean) : !reachable.some(Boolean)) return "현재 재화로 나올 수 없는 목표입니다.";
    return "";
  }
  function esc3(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value));
  }
  function workspaceCoin(ctx, key) {
    return ctx.deps.ORB_DB[key] && ctx.deps.ORB_DB[key].icon ? `<img class="cl-inline-icon" src="${esc3(ctx, ctx.deps.ORB_DB[key].icon)}" alt="">` : "";
  }
  function selected(ctx) {
    return (0, ctx.deps.getSelectedCraftItem)();
  }
  function signature(ctx) {
    return JSON.stringify([ctx.state.current, ctx.state.goal, selected(ctx)?.stats]);
  }
  function targetGame(ctx) {
    return { settings: { equipmentTargets: ctx.state.goal } };
  }
  function matches(ctx, item) {
    return ctx.deps.equipmentLootPolicy.matches(item, targetGame(ctx));
  }
  function held(ctx) {
    return matches(ctx, selected(ctx)) && ctx.state.acknowledged !== signature(ctx);
  }
  function workspaceArmedOmen(ctx) {
    return ctx.deps.game.craftOmen && (ctx.deps.game.currencies[ctx.deps.game.craftOmen.key] || 0) > 0 ? ctx.deps.game.craftOmen : null;
  }

  // modules/ui/crafting-workspace-markup.mjs
  function workspaceAffixValue(ctx, stat, value, exactRange = false) {
    const fractional = ["resPen", "physIgnore", "leech", "spellLeech", "regen", "regenSuppress", "leechRateCap", "leechTotalCap", "leechInstanceCap"].includes(stat.id) || [stat.val, stat.valMin, stat.valMax].some((number) => Number.isFinite(number) && !Number.isInteger(number));
    return fractional ? Number(value).toFixed(exactRange ? 2 : 1).replace(/(\.\d)0$/, "$1") : (0, ctx.deps.formatValue)(stat.id, value);
  }
  function workspaceAffixRange(ctx, stat) {
    if (!Number.isFinite(stat.valMin) || !Number.isFinite(stat.valMax)) return "";
    return `[${workspaceAffixValue(ctx, stat, stat.valMin, true)} ~ ${workspaceAffixValue(ctx, stat, stat.valMax, true)}]`;
  }
  function workspaceMaxRollClass(ctx, stat) {
    const { val, valMin, valMax } = stat;
    return Number.isFinite(valMin) && Number.isFinite(valMax) && valMax > valMin && val >= valMax - 1e-9 ? " is-max" : "";
  }
  function workspaceBaseStatHtml(ctx, item, stat) {
    return `<span class="cl-base-stat${workspaceMaxRollClass(ctx, stat)}" style="--cl-affix-tone:${(0, ctx.deps.getItemStatToneColor)(stat.id)}"><span class="cl-base-name">${esc3(ctx, stat.statName || (0, ctx.deps.getStatName)(stat.id))}</span> <b class="cl-base-value">${esc3(ctx, (0, ctx.deps.formatSignedValue)(stat.id, stat.val))}</b> <span class="cl-affix-range">${esc3(ctx, workspaceAffixRange(ctx, stat))}</span>${ctx.deps.itemInfluencesUi.lineBadgeHtml(item, stat)}</span>`;
  }
  function workspaceAffixQuality(ctx, stat, changed) {
    if (!changed || (0, ctx.deps.isFixedEquipmentAffix)(stat)) return "";
    const mod = (0, ctx.deps.findStoredEquipmentAffix)(selected(ctx), stat);
    const cap = Math.min((0, ctx.deps.getItemCraftTier)(selected(ctx)), mod?.tierValues?.length || 20);
    if (stat.tier >= cap) return "is-max-tier";
    return stat.tier >= 10 ? "is-high-tier" : "";
  }
  function workspaceAffixNotes(ctx, stat, prior, feedback) {
    const { changed, hit, quality } = feedback;
    const kept = !stat.lockedByHoney && !stat.lockedByRift && ctx.deps.equipmentCrafting.keptOnReroll(selected(ctx), stat);
    return [
      stat.lockedByHoney ? "벌꿀 고정" : "",
      stat.lockedByRift ? "균열 고정" : "",
      kept ? "다음 재굴림 보존" : "",
      changed && prior ? (0, ctx.deps._t)("이전 +{prior}", { prior: workspaceAffixValue(ctx, prior, prior.val) }) : "",
      hit ? "목표 일치" : "",
      quality === "is-max-tier" ? "최고 티어" : "",
      ctx.deps.emberCorruptionUi.scaleNote(stat)
    ].filter(Boolean).map((note) => note === "목표 일치" ? '<strong class="cl-goal-match">목표 일치</strong>' : esc3(ctx, note)).join(", ");
  }
  function workspaceAffixHtml(ctx, stat, index) {
    const prior = ctx.state.last?.before.stats.find((row) => row.id === stat.id);
    const changed = ctx.state.last && JSON.stringify(prior) !== JSON.stringify((0, ctx.deps.copyCraftResultStat)(stat));
    const hit = ctx.state.goal.rules.some((rule) => ctx.deps.equipmentLootPolicy.lineMatchesRule(stat, rule));
    const quality = workspaceAffixQuality(ctx, stat, changed);
    return `<li class="cl-affix ${hit ? "is-target" : ""} ${changed ? "is-changed" : ""} ${quality}" data-affix="${index}">
            <div><span style="--cl-affix-tone:${(0, ctx.deps.getItemStatToneColor)(stat.id)}">${esc3(ctx, stat.statName || (0, ctx.deps.getStatName)(stat.id))} <span class="cl-affix-value${workspaceMaxRollClass(ctx, stat)}"><b>+${esc3(ctx, workspaceAffixValue(ctx, stat, stat.val))}</b> <span class="cl-affix-range">${esc3(ctx, workspaceAffixRange(ctx, stat))}</span></span></span>
            <span class="cl-tier">${(0, ctx.deps.getItemAffixTierHtml)(stat)}${ctx.deps.itemInfluencesUi.lineBadgeHtml(selected(ctx), stat)}</span></div>
            <small>${workspaceAffixNotes(ctx, stat, prior, { changed, hit, quality })}</small></li>`;
  }
  function workspaceWardSlotsText(ctx, item) {
    const slots = ctx.deps.colonyWards.beltRoll(item), range = ctx.deps.COLONY_WARD_RULES.beltSlots;
    return slots ? (0, ctx.deps._t)("액막이 칸 +{slots} [{min} ~ {max}]", { slots, min: range.min, max: range.max }) : "";
  }
  function workspaceItemHtml(ctx) {
    const item = selected(ctx), sources = new Set(item.stats.map((stat) => ctx.deps.equipmentCrafting.getSource(stat)));
    return `<section id="forge-item-display" class="cl-item ${matches(ctx, item) ? "goal-hit" : ""}"><div class="cl-item-head"><div class="cl-art"><img src="${esc3(ctx, (0, ctx.deps.getEquipmentGridVisualAsset)(item))}" alt="${esc3(ctx, (0, ctx.deps.getItemSlotDisplayLabel)(item))}"></div>
            <div><small>${(0, ctx.deps._t)("제작 중인 장비 &ensp; T{item}", { item: (0, ctx.deps.getItemCraftTier)(item) })}</small><h2>${esc3(ctx, (0, ctx.deps.getItemDisplayName)(item))}${ctx.api.imprintMark(item)}</h2>${ctx.deps.itemInfluencesUi.tagsHtml(item)}<span>${(0, ctx.deps._t)("{baseName} &ensp; 추가 옵션 {item}/6", { baseName: esc3(ctx, (0, ctx.deps._t)(item.baseName)), item: (0, ctx.deps.getItemExplicitOptionCount)(item) })}</span></div></div>
            <div class="cl-sources"><span class="${sources.has("spore") ? "filled" : ""}">${(0, ctx.deps._t)("수확 {value}/1", { value: sources.has("spore") ? "1" : "0" })}</span><span class="${sources.has("fossil") ? "filled" : ""}">${(0, ctx.deps._t)("화석 {value}/1", { value: sources.has("fossil") ? "1" : "0" })}</span></div>
            <div class="cl-section-title">${(0, ctx.deps._t)("추가 옵션")}</div><ul class="cl-affixes">${item.stats.map(ctx.handlers.workspaceAffixHtml).join("")}${item.chaosInfusion ? `<li class="cl-affix">${(0, ctx.deps._t)("혼돈 주입 {id} +{chaosInfusion}", { id: esc3(ctx, (0, ctx.deps.getStatName)(item.chaosInfusion.id)), chaosInfusion: esc3(ctx, workspaceAffixValue(ctx, item.chaosInfusion, item.chaosInfusion.val)) })}</li>` : ""}</ul>
            <div class="cl-base">기본 옵션 &ensp; ${[esc3(ctx, workspaceWardSlotsText(ctx, item)), ...(item.baseStats || []).map((stat) => workspaceBaseStatHtml(ctx, item, stat))].filter(Boolean).join(" / ")}</div>${workspaceImprintHtml(ctx, item)}${workspaceEncroachmentHtml(ctx, item)}${ctx.deps.emberCorruptionUi.cardHtml(item)}
            ${ctx.state.extras}</section>`;
  }
  function workspaceImprintHtml(ctx, item) {
    const have = ctx.deps.game.currencies.memoryImprint || 0, imprint = ctx.deps.equipmentCrafting.normalizeImprint(item.imprint);
    if (!have && !imprint) return "";
    return `<div class="cl-imprint" data-theme="special"><div class="cl-section-title"><span>${(0, ctx.deps._t)("{value}기억 조각칼", { value: workspaceCoin(ctx, "memoryImprint") })}</span><small>${(0, ctx.deps._t)("보유 {have}", { have })}</small></div>
            <div class="cl-imprint-actions">${workspaceImprintButton(ctx, "engrave", imprint ? "다시 새기기" : "지금 옵션 새기기", ctx.deps.equipmentCrafting.engraveReason(ctx.deps.game, item))}${imprint ? workspaceImprintButton(ctx, "restore", "새긴 옵션으로 되돌리기", ctx.deps.equipmentCrafting.restoreReason(item)) : ""}</div>
            ${imprint ? `<details><summary>${(0, ctx.deps._t)("기억 새겨짐, 새긴 옵션 {length}줄", { length: imprint.stats.length })}</summary><ul>${imprint.stats.map((stat) => `<li>${esc3(ctx, stat.statName || (0, ctx.deps.getStatName)(stat.id))} +${esc3(ctx, workspaceAffixValue(ctx, stat, stat.val))}${(0, ctx.deps.getItemAffixTierHtml)(stat)}</li>`).join("")}</ul></details>` : ""}</div>`;
  }
  function workspaceGoalHtml(ctx) {
    if (!["add", "reroll", "fossil", "value"].includes(ctx.state.recipe.kind)) return "";
    const rule = ctx.state.goal.rules[0] || { statId: "", minTier: 0 }, choice = workspaceGoalChoice(ctx, rule);
    const tiers = Array.from({ length: (choice?.maxTier || 0) + 1 }, (_, i) => i);
    return `<section class="cl-goal"><div class="cl-section-title"><span class="cl-goal-help"><button type="button" id="cl-goal-help" aria-describedby="cl-goal-tooltip">${(0, ctx.deps._t)("목표 옵션")}</button><span role="tooltip" id="cl-goal-tooltip">${(0, ctx.deps._t)("확률은 변경되지 않으며, 목표 옵션 출현 시 강조됩니다. 태그는 그 태그가 붙은 줄 수를 셉니다.")}</span></span></div><div class="cl-goal-fields ${rule.tag ? "has-count" : ""}">
            <label>${(0, ctx.deps._t)("옵션")}<select id="cl-goal-stat">${workspaceGoalTargetOptions(ctx, rule, choice)}</select></label>${workspaceGoalCountHtml(ctx, rule, choice)}
            <label>${(0, ctx.deps._t)("최소 티어")}<select id="cl-goal-tier" ${!choice ? "disabled" : ""}>${tiers.map((tier) => `<option value="${tier}" ${tier === rule.minTier ? "selected" : ""}>${tier === 0 ? (0, ctx.deps._t)("티어 무관") : (0, ctx.deps._t)("T{tier} 이상", { tier })}</option>`).join("")}</select></label></div>${workspaceExtraGoalsHtml(ctx)}</section>`;
  }
  function workspaceExtraGoalsHtml(ctx) {
    const rows = ctx.state.goal.rules.slice(1).map((rule, index) => `<li>${esc3(ctx, rule.tag ? ctx.deps.AFFIX_TAG_LABELS[rule.tag] + " " + rule.minCount + "줄" : (0, ctx.deps.getStatName)(rule.statId))}, ${rule.minTier ? "T" + rule.minTier + " 이상" : (0, ctx.deps._t)("티어 무관")} <button data-command="remove-goal:${index + 1}" aria-label="${(0, ctx.deps._t)("목표 조건 제거")}">${(0, ctx.deps._t)("제거")}</button></li>`).join("");
    const simulator = ctx.deps.contentProgression.status("craftSimulator");
    return `<ul class="cl-extra-goals">${rows}</ul><div class="cl-study-controls"><button data-command="add-goal" ${ctx.state.goal.rules.length >= 3 || !ctx.state.goal.rules.length ? "disabled" : ""}>${(0, ctx.deps._t)("조건 추가")}</button><label>${(0, ctx.deps._t)("목표 조합")} <select id="cl-goal-match"><option value="all" ${ctx.state.goalMatch === "all" ? "selected" : ""}>${(0, ctx.deps._t)("모두 충족")}</option><option value="any" ${ctx.state.goalMatch === "any" ? "selected" : ""}>${(0, ctx.deps._t)("하나 이상")}</option></select></label><button data-command="study" ${simulator.unlocked ? "" : `disabled data-tip="${esc3(ctx, simulator.reason)}"`}>${(0, ctx.deps._t)("제작 시뮬레이터{value}", { value: simulator.unlocked ? "" : (0, ctx.deps._t)(" (잠김)") })}</button></div>`;
  }
  function workspaceGoalTargetOptions(ctx, rule, choice) {
    const key = rule.tag ? "tag:" + rule.tag : rule.statId, name2 = rule.tag ? (0, ctx.deps._t)("{AFFIX_TAG_LABELS} 태그", { AFFIX_TAG_LABELS: ctx.deps.AFFIX_TAG_LABELS[rule.tag] }) : (0, ctx.deps.getStatName)(rule.statId);
    const retained = !choice && key ? `<option selected disabled value="${esc3(ctx, key)}">${(0, ctx.deps._t)("{name} (현재 목표)", { name: esc3(ctx, name2) })}</option>` : "";
    const tags = workspaceGoalTags(ctx).map((row) => `<option value="tag:${row.id}" ${"tag:" + row.id === key ? "selected" : ""}>${(0, ctx.deps._t)("{name} 태그", { name: esc3(ctx, (0, ctx.deps._t)(row.name)) })}</option>`).join("");
    const options = workspaceGoalOptions(ctx).map((row) => `<option value="${row.id}" ${row.id === key ? "selected" : ""}>${esc3(ctx, (0, ctx.deps._t)(row.name))}</option>`).join("");
    return `<option value="">${(0, ctx.deps._t)("목표 선택")}</option>${retained}${tags ? `<optgroup label="${(0, ctx.deps._t)("태그")}">${tags}</optgroup>` : ""}<optgroup label="${(0, ctx.deps._t)("옵션")}">${options}</optgroup>`;
  }
  function workspaceGoalCountHtml(ctx, rule, choice) {
    if (!rule.tag) return "";
    const counts = Array.from({ length: choice?.maxCount || rule.minCount }, (_, i) => i + 1);
    return `<label>${(0, ctx.deps._t)("최소 줄 수")}<select id="cl-goal-count" ${!choice ? "disabled" : ""}>${counts.map((count) => `<option value="${count}" ${count === rule.minCount ? "selected" : ""}>${(0, ctx.deps._t)("{count}줄 이상", { count })}</option>`).join("")}</select></label>`;
  }
  function workspaceEncroachmentHtml(ctx, item) {
    if (!item.encroached) return "";
    const stat = item.encroached.chosen;
    if (item.encroached.liberated && stat) return `<div class="cl-base">${(0, ctx.deps._t)("잠식 {statName} +{id}", { statName: esc3(ctx, stat.statName || (0, ctx.deps.getStatName)(stat.id)), id: esc3(ctx, (0, ctx.deps.formatValue)(stat.id, stat.val)) })}</div>`;
    return '<div class="cl-base">잠식 미해방 <button type="button" onclick="liberateSelectedEncroachedItem()">해방</button></div>';
  }
  function workspaceMethodsHtml(ctx, state, stopped) {
    return `<section class="cl-methods"><div class="cl-section-title">${(0, ctx.deps._t)("재화 보관함")}</div>${ctx.deps.craftingStashUi.html({ recipe: ctx.state.recipe.key, omen: workspaceArmedOmen(ctx)?.key || "" })}
            <p class="cl-method-note" data-theme="${ctx.deps.craftingCatalogUi.theme(ctx.state.recipe.key)}"><span class="cl-method-heading"><strong>${(0, ctx.deps._t)("선택 중 &ensp; {styledName}", { styledName: ctx.deps.craftingCatalogUi.styledName(ctx.state.recipe.key) })}</strong><small>${(0, ctx.deps._t)("보유 {currencies}", { currencies: ctx.deps.game.currencies[ctx.state.recipe.key] })}</small></span>${ctx.deps.craftingCatalogUi.description(ctx.state.recipe.key)}</p>${workspaceSporeHtml(ctx)}${workspaceOmenHtml(ctx)}
            <div class="cl-method-use">${workspacePrimaryButtonHtml(ctx, state, stopped)}</div></section>`;
  }
  function workspaceAddonNote(ctx, reason, effect, clear = "", shortage = false) {
    return `<p class="cl-addon-note ${shortage ? "is-shortage" : ""}" aria-live="polite">${esc3(ctx, effect)}${reason ? `<br>${esc3(ctx, reason)}` : ""}${clear}</p>`;
  }
  function workspaceSporeOption(ctx, value) {
    const key = value === "none" ? "" : (0, ctx.deps.getSporeCraftPriceKey)(value);
    const label = key ? `${ctx.state.SPORE_LABELS[value]} 계열, ${ctx.deps.stumpBox.harvestPriceName(key)} ${ctx.deps.stumpBox.harvestPriceHeld(ctx.deps.game, key)}개` : "사용 안 함";
    return `<option value="${value}" ${ctx.state.mode === value ? "selected" : ""}>${esc3(ctx, label)}</option>`;
  }
  function workspaceSporeNote(ctx) {
    if (ctx.state.mode === "none") return "";
    const reason = workspaceSporeReason(ctx, ctx.state.mode);
    const effect = (0, ctx.deps._t)("{SPORE_LABELS} 계열 옵션 1줄 보장", { SPORE_LABELS: ctx.state.SPORE_LABELS[ctx.state.mode] });
    return workspaceAddonNote(ctx, reason, effect, reason ? ` <button data-command="clear-spore">${(0, ctx.deps._t)("수확 사용 해제")}</button>` : "", !(0, ctx.deps.hasSporeCraftCost)(ctx.state.mode));
  }
  function workspaceSporeHtml(ctx) {
    if (!(0, ctx.deps.isSporeCraftEquipment)(selected(ctx)) || !["add", "reroll"].includes(ctx.state.recipe.kind)) return "";
    const available = (0, ctx.deps.getAvailableSporeCraftModes)().filter((value) => value !== "none" && (0, ctx.deps.hasSporeCraftCost)(value));
    const note = workspaceSporeNote(ctx);
    if (!available.length) return note;
    const values = ["none", ...available];
    if (!values.includes(ctx.state.mode)) values.push(ctx.state.mode);
    return `<label class="cl-spore">${(0, ctx.deps._t)("수확 함께 사용")}<select id="cl-mode">${values.map(ctx.handlers.workspaceSporeOption).join("")}</select></label>${note}`;
  }
  function workspaceOmenOptions(ctx, keys, count = () => "") {
    return keys.flatMap((key) => {
      const name2 = (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name) + count(key);
      return ctx.deps.CRAFT_OMENS.effects[key].effect === "side" ? [[`${key}:prefix`, (0, ctx.deps._t)("{name}, 접두", { name: name2 })], [`${key}:suffix`, (0, ctx.deps._t)("{name}, 접미", { name: name2 })]] : [[`${key}:prefix`, name2]];
    });
  }
  function workspaceOmenHtml(ctx) {
    const owned = ctx.deps.CRAFT_OMENS.keys.filter((key) => (ctx.deps.game.currencies[key] || 0) > 0), armed = workspaceArmedOmen(ctx);
    if (!owned.length) return "";
    const value = armed ? `${armed.key}:${armed.side}` : "";
    const options = [["", "사용 안 함"], ...workspaceOmenOptions(ctx, owned, (key) => ` (${ctx.deps.game.currencies[key]})`)];
    const note = workspaceOmenNote(ctx, armed);
    return `<label class="cl-spore" data-theme="omen"><span>${(0, ctx.deps._t)("{value}뿌리 함께 사용", { value: armed ? workspaceCoin(ctx, armed.key) : "" })}</span><select id="cl-omen">${options.map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${esc3(ctx, label)}</option>`).join("")}</select></label>${note}`;
  }
  function workspaceOmenNote(ctx, armed) {
    if (!armed) return "";
    const spec = ctx.deps.equipmentCrafting.omenSpec(armed.key, armed.side);
    const action = ctx.deps.equipmentCrafting.resolveAction(ctx.state.recipe.key, selected(ctx).rarity);
    const reason = ctx.deps.equipmentCrafting.omenReason(selected(ctx), action, spec, ctx.state.mode);
    const effect = spec.effect === "side" ? workspaceSideEffect(ctx, spec) : ctx.deps.ORB_DB[armed.key].desc;
    return workspaceAddonNote(ctx, reason, effect);
  }
  function workspaceCostText(ctx) {
    const pieces = ["재화 1개 소모"];
    if ((0, ctx.deps.isSporeCraftEquipment)(selected(ctx)) && ["add", "reroll"].includes(ctx.state.recipe.kind) && ctx.state.mode !== "none") {
      pieces.push(`${ctx.deps.stumpBox.harvestPriceName((0, ctx.deps.getSporeCraftPriceKey)(ctx.state.mode))} 1`);
    }
    const omen = workspaceUsedOmen(ctx);
    if (omen) pieces.push(`${(0, ctx.deps._t)(ctx.deps.ORB_DB[omen.key].name)} 1`);
    if (["enchantedHoney", "venomStinger", "voidChisel", "ouroboros", "oceanRerollShard"].includes(ctx.state.recipe.key)) return "";
    return pieces.join(" + ");
  }
  function workspacePreviousOptionsHtml(ctx) {
    if (!ctx.state.last) return "";
    return `<details><summary>${(0, ctx.deps._t)("이전 옵션 보기")}</summary>${ctx.state.last.before.stats.map((stat) => `<div>${esc3(ctx, stat.statName || (0, ctx.deps.getStatName)(stat.id))} +${esc3(ctx, workspaceAffixValue(ctx, stat, stat.val))}, T${stat.tier || 0} <small>${esc3(ctx, workspaceAffixRange(ctx, stat))}</small></div>`).join("")}</details>`;
  }
  function workspacePrimaryButtonHtml(ctx, state, stopped) {
    if (ctx.state.auto) return `<button data-command="stop" class="cl-primary cl-stop">${(0, ctx.deps._t)("자동 사용 중지 {runCount}/{limit}회", { runCount: ctx.state.runCount, limit: ctx.state.limit })}</button>`;
    if (stopped) return '<button data-command="ack" class="cl-primary">목표 옵션 확인</button>';
    return `<button data-command="craft" data-craft-resource="${ctx.state.recipe.key}" class="cl-primary" aria-label="${(0, ctx.deps._t)("{name} 1회 사용", { name: esc3(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB[ctx.state.recipe.key].name)) })}" ${ctx.state.busy || !state.enabled ? "disabled" : ""}>${ctx.state.busy ? (0, ctx.deps._t)("사용 중…") : (0, ctx.deps._t)("1회 사용")}</button>`;
  }
  function workspaceActionHtml(ctx, state, stopped) {
    const button = workspacePrimaryButtonHtml(ctx, state, stopped);
    if (ctx.state.auto || !["reroll", "add", "fossil"].includes(ctx.state.recipe.kind)) return button;
    return button + workspaceAutoControlsHtml(ctx, state);
  }
  function workspaceAutoControlsHtml(ctx, state) {
    const reason = workspaceAutoReason(ctx);
    return `<div class="cl-auto"><label>${(0, ctx.deps._t)("최대")} <input id="cl-limit" type="number" min="1" max="100" value="${ctx.state.limit}" aria-label="${(0, ctx.deps._t)("자동 사용 최대 횟수")}">${(0, ctx.deps._t)("회")}</label>
            <button data-command="auto" ${ctx.state.busy || !state.enabled || reason ? "disabled" : ""}><span class="px-center">${(0, ctx.deps._t)("목표까지 자동 사용")}</span></button></div>${reason && ctx.state.goal.rules.length ? `<small>${esc3(ctx, reason)}</small>` : ""}`;
  }
  function workspaceResultHtml(ctx) {
    const hit = matches(ctx, selected(ctx));
    return `<section class="cl-result ${hit ? "goal-hit" : ""}" aria-live="polite"><div><h3>${(0, ctx.deps._t)("제작 경과")}</h3>
            ${ctx.state.last?.meta.outcome ? `<p class="cl-outcome">${esc3(ctx, ctx.state.last.meta.outcome)}</p>` : ""}
            ${ctx.state.last ? ctx.deps.craftingResultUi.getMetaRows(ctx.state.last).map((text) => `<p>${esc3(ctx, text)}</p>`).join("") : ""}
            ${hit ? (0, ctx.deps._t)("<p>목표 옵션을 확보했어요</p>") : ""}${ctx.state.notice ? `<p>${esc3(ctx, ctx.state.notice)}</p>` : ""}
            ${workspacePreviousOptionsHtml(ctx)}</div>
            <div class="cl-session"><b>${(0, ctx.deps._t)("{count}회 제작", { count: ctx.state.count })}</b><small>${Object.entries(ctx.state.spent).map(([key, value]) => `${esc3(ctx, ctx.deps.ORB_DB[key]?.name || key)} ${value}`).join(", ") || (0, ctx.deps._t)("소모 없음")}</small></div></section>`;
  }
  function workspaceImprintButton(ctx, command, label, reason) {
    return `<button type="button" data-command="${command}" ${reason ? `disabled data-tip="${esc3(ctx, reason)}"` : ""}>${label}</button>`;
  }

  // modules/ui/crafting-workspace-controller.mjs
  function workspaceOpenInventory(ctx, inspect = "", craftingOnly = false) {
    if (ctx.state.auto) {
      workspaceStopAuto(ctx, "재화 인벤토리를 열어 자동 사용을 멈췄어요.");
      workspaceRender(ctx);
    }
    ctx.deps.craftingCatalogUi.open(ctx.state.recipes, ctx.handlers.workspacePickResource, { active: ctx.state.recipe.key, inspect, craftingOnly, useState: ctx.handlers.workspaceResourceState });
  }
  function workspacePickResource(ctx, key) {
    if (["fossil", "fossilPrimal", "fossilAncientPrimal"].includes(key)) {
      const materials = ctx.deps.document.getElementById("cl-materials");
      materials.open = true;
      (0, ctx.deps.renderFossilWorkbench)(selected(ctx));
      materials.scrollIntoView({ block: "nearest" });
      return;
    }
    ctx.state.recipe = ctx.state.recipes.find((row) => row.key === key);
    ctx.state.mode = ctx.deps.game.sporeCraftModes[key] || "none";
    workspaceRender(ctx);
  }
  function workspaceSyncTarget(ctx) {
    ctx.deps.craftingCatalogUi.capture();
    if (ctx.state.owner !== ctx.deps.game) {
      workspaceStopAuto(ctx, "");
      ctx.state.owner = ctx.deps.game;
      ctx.state.current = null;
      ctx.state.goal = ctx.deps.equipmentLootPolicy.normalizeTargets({});
      workspaceRestoreGoal(ctx);
    }
    const item = selected(ctx);
    if (ctx.state.current !== item) {
      workspaceStopAuto(ctx, "");
      ctx.state.current = item;
      ctx.state.last = null;
      ctx.state.acknowledged = "";
      ctx.state.count = 0;
      ctx.state.spent = {};
      if (ctx.state.goalDialog?.open) ctx.state.goalDialog.close();
      if (item) {
        ctx.state.recipe = ctx.state.recipes.find((row) => row.key === (item.rarity === "normal" ? "magicBud" : "formlessDew"));
        ctx.state.mode = ctx.deps.game.sporeCraftModes[ctx.state.recipe.key] || "none";
      }
    }
    if (item) ctx.state.last = ctx.deps.craftingResultLedger.getForItem(item) || ctx.state.last;
    return item;
  }
  function workspaceMount(ctx, controls) {
    if (controls) {
      ctx.state.adapter = controls;
      ctx.state.extras = controls.details;
    }
    if (!ctx.state.root) {
      ctx.state.root = ctx.deps.document.getElementById("crafting-workspace");
      if (ctx.state.root) workspaceWire(ctx);
    }
    return ctx.state.root;
  }
  function workspacePaintEmpty(ctx) {
    const empty = '<div class="cl-empty">' + ctx.state.adapter.emptyState() + "</div>";
    if (ctx.state.renderKey !== empty) {
      ctx.state.root.innerHTML = empty;
      ctx.state.renderKey = empty;
    }
  }
  function workspaceShown(ctx) {
    const panel = ctx.state.root.closest(".subtab-content"), pane = ctx.state.root.closest(".tab-content");
    if (!panel || !pane || !panel.classList.contains("active") || ctx.deps.document.hidden) return false;
    if (pane.classList.contains("ui-window") && ctx.deps.document.body.classList.contains("desktop-windowed-ui")) return pane.classList.contains("ui-window-open") && !pane.classList.contains("ui-window-minimized");
    return pane.classList.contains("active");
  }
  function workspaceRender(ctx, reveal = false, controls) {
    if (!workspaceMount(ctx, controls)) return;
    const item = workspaceSyncTarget(ctx);
    if (!workspaceShown(ctx)) {
      if (ctx.state.auto) workspaceStopAuto(ctx, "");
      return;
    }
    if (!item) {
      workspacePaintEmpty(ctx);
      return;
    }
    const state = workspaceUseState(ctx), stopped = held(ctx);
    const html = `<div class="cl-heading">${ctx.state.adapter.targetControls()}<button id="cl-inventory-open" data-command="inventory">${(0, ctx.deps._t)("재화 인벤토리")}</button></div>
            <div class="cl-workspace">${workspaceItemHtml(ctx)}<div class="cl-controls">${workspaceMethodsHtml(ctx, state, stopped)}${workspaceGoalHtml(ctx)}<div class="cl-action"><small>${esc3(ctx, workspaceCostText(ctx))}</small>
            ${workspaceActionHtml(ctx, state, stopped)}<span class="cl-block cl-error" role="status">${!state.enabled ? `<span class="px-center">${esc3(ctx, state.reason)}</span>` : ""}</span></div></div></div>${workspaceResultHtml(ctx)}`;
    workspaceReplaceMarkup(ctx, html, reveal);
    if (reveal) ctx.state.root.querySelector(".cl-item").classList.add("just-crafted");
    workspaceShowDialogs(ctx, reveal, stopped);
  }
  function workspaceShowDialogs(ctx, reveal, stopped) {
    const pending = ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game);
    if (pending) workspaceShowChoice(ctx, pending);
    else if (reveal && stopped) workspaceShowGoalDialog(ctx);
  }
  function workspaceReplaceMarkup(ctx, html, reveal) {
    if (html === ctx.state.renderKey && !reveal) return;
    const focusId = ctx.state.root.querySelector(":focus")?.id;
    ctx.state.root.innerHTML = html;
    ctx.state.renderKey = html;
    if (focusId) ctx.state.root.querySelector("#" + focusId)?.focus({ preventScroll: true });
  }
  function workspaceShowGoalDialog(ctx) {
    if (ctx.state.goalDialog?.open) return;
    if (!ctx.state.goalDialog) {
      ctx.state.goalDialog = ctx.deps.document.createElement("dialog");
      ctx.state.goalDialog.className = "cl-goal-dialog";
      ctx.state.goalDialog.setAttribute("aria-labelledby", "cl-goal-dialog-title");
      ctx.state.goalDialog.addEventListener("cancel", (event) => event.preventDefault());
      ctx.deps.window.addEventListener("keydown", (event) => {
        if (!ctx.state.goalDialog.open) return;
        event.stopImmediatePropagation();
        if (event.key === "Escape" || event.repeat) event.preventDefault();
      }, true);
      ctx.deps.document.body.append(ctx.state.goalDialog);
    }
    const acceptedSignature = signature(ctx), item = selected(ctx);
    ctx.state.goalDialog.innerHTML = `<header><strong class="cl-goal-match">${(0, ctx.deps._t)("목표 일치")}</strong>
            <h2 id="cl-goal-dialog-title" tabindex="-1">${esc3(ctx, (0, ctx.deps.getItemDisplayName)(item))}</h2></header>
            <ul class="cl-affixes just-crafted">${item.stats.map(ctx.handlers.workspaceAffixHtml).join("")}</ul>
            <button type="button" disabled>${(0, ctx.deps._t)("확인했어요")}</button>`;
    const confirm = ctx.state.goalDialog.querySelector("button"), readyAt = ctx.deps.performance.now() + 800;
    confirm.addEventListener("click", (event) => {
      if (confirm.disabled || ctx.deps.performance.now() < readyAt || event.detail > 1) return;
      confirm.disabled = true;
      (0, ctx.deps.setTimeout)(ctx.handlers.workspaceAcknowledgeGoal, 350, acceptedSignature);
    });
    ctx.state.goalDialog.showModal();
    ctx.state.goalDialog.querySelector("h2").focus();
    (0, ctx.deps.setTimeout)(() => {
      confirm.disabled = false;
    }, 800);
  }
  function workspaceAcknowledgeGoal(ctx, acceptedSignature) {
    if (signature(ctx) === acceptedSignature) ctx.state.acknowledged = acceptedSignature;
    ctx.state.goalDialog.close();
    workspaceRender(ctx);
    const title = ctx.state.root.querySelector(".cl-item h2");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
    }
  }
  async function workspaceCraft(ctx) {
    if (ctx.state.busy || !selected(ctx) || held(ctx) || !workspaceUseState(ctx).enabled) return false;
    ctx.state.busy = true;
    workspaceRender(ctx);
    const item = selected(ctx), before = { ...ctx.deps.game.currencies };
    const token = ctx.deps.craftingResultLedger.begin(item, { currencyKey: ctx.state.recipe.key });
    let completed = false;
    try {
      const result = await workspaceExecuteCraft(ctx);
      completed = result === true || Object.entries(before).some(([key, value]) => value > ctx.deps.game.currencies[key]);
      if (!completed) {
        ctx.state.notice = "제작 조건을 확인하세요.";
        return false;
      }
      ctx.state.last = ctx.deps.craftingResultLedger.commit(token, item);
      ctx.state.count++;
      ctx.state.notice = "";
      ctx.state.acknowledged = "";
      if (!ctx.deps.equipmentCrafting.pendingChoice(ctx.deps.game)) (0, ctx.deps.playUiFeedbackSound)("craftSuccess");
      Object.entries(before).forEach(([key, value]) => {
        const used = value - ctx.deps.game.currencies[key];
        if (used > 0) ctx.state.spent[key] = (ctx.state.spent[key] || 0) + used;
      });
      (0, ctx.deps.queueImportantSave)(180);
      return true;
    } finally {
      ctx.state.busy = false;
      workspaceRender(ctx, completed);
    }
  }
  function workspaceExecuteCraft(ctx) {
    if (ctx.state.recipe.kind === "fossil") return (0, ctx.deps.applyFossilChaosCraft)(ctx.state.recipe.key);
    const actions = { enchantedHoney: ctx.deps.applyEnchantedHoneyToSelectedItem, venomStinger: ctx.deps.applyVenomStingerToSelectedItem, voidChisel: ctx.deps.applyVoidChiselToSelectedItem, ouroboros: ctx.deps.applyWoodsmanTouchToSelectedItem, burningEmberBranch: ctx.deps.emberCorruptionUi.use };
    if (actions[ctx.state.recipe.key]) return actions[ctx.state.recipe.key]();
    if (ctx.deps.itemInfluences.isAltarCurrency(ctx.state.recipe.key)) return ctx.deps.itemInfluencesUi.use(ctx.state.recipe.key);
    if (ctx.state.recipe.key === "oceanRerollShard") return (0, ctx.deps.rerollSingleBaseOption)(selected(ctx), "oceanRerollShard", 1);
    if (ctx.deps.sapCatalysts.isCatalyst(ctx.state.recipe.key)) return ctx.deps.sapCatalystsUi.use(ctx.state.recipe.key);
    return (0, ctx.deps.useCurrency)(ctx.state.recipe.key);
  }
  function workspaceStopAuto(ctx, message) {
    ctx.state.auto = false;
    ctx.state.runId++;
    (0, ctx.deps.clearTimeout)(ctx.state.timer);
    ctx.state.timer = 0;
    ctx.state.notice = message;
  }
  function workspaceAutomaticStopReason(ctx) {
    if (ctx.deps.document.hidden || !ctx.state.root.getClientRects().length || selected(ctx) !== ctx.state.current || ctx.state.owner !== ctx.deps.game) return "화면을 벗어나 자동 사용을 중지했어요.";
    if (matches(ctx, selected(ctx))) return "목표 달성, 자동 사용을 멈췄어요.";
    if (ctx.state.runCount >= ctx.state.limit) return (0, ctx.deps._t)("설정한 {limit}회를 모두 사용했어요.", { limit: ctx.state.limit });
    const state = workspaceUseState(ctx);
    return state.enabled ? workspaceAutoReason(ctx) : state.reason;
  }
  async function workspaceAutoStep(ctx, id) {
    if (!ctx.state.auto || id !== ctx.state.runId) return;
    try {
      let reason = workspaceAutomaticStopReason(ctx);
      if (reason) {
        workspaceStopAuto(ctx, reason);
        workspaceRender(ctx);
        return;
      }
      const used = await workspaceCraft(ctx);
      if (!ctx.state.auto || id !== ctx.state.runId) return;
      if (!used) {
        workspaceStopAuto(ctx, ctx.state.notice);
        workspaceRender(ctx);
        return;
      }
      ctx.state.runCount++;
      reason = workspaceAutomaticStopReason(ctx);
      if (reason) {
        workspaceStopAuto(ctx, reason);
        workspaceRender(ctx);
        return;
      }
      workspaceRender(ctx);
      ctx.state.timer = (0, ctx.deps.setTimeout)(ctx.handlers.workspaceAutoStep, 400, id);
    } catch (error) {
      ctx.deps.console.error("Automatic crafting failed", error);
      workspaceStopAuto(ctx, (0, ctx.deps._t)("자동 사용 실패: {message}", { message: error.message }));
      workspaceRender(ctx);
    }
  }
  function workspaceStartAuto(ctx) {
    if (ctx.state.auto || ctx.state.busy || workspaceAutoReason(ctx) || !workspaceUseState(ctx).enabled) return;
    ctx.state.auto = true;
    ctx.state.runCount = 0;
    ctx.state.notice = "";
    const id = ++ctx.state.runId;
    workspaceRender(ctx);
    ctx.state.timer = (0, ctx.deps.setTimeout)(ctx.handlers.workspaceAutoStep, 400, id);
  }
  function workspaceChooseGoal(ctx, target) {
    const previous = ctx.state.goal.rules[0] || { minTier: 0 };
    const choice = workspaceGoalChoice(ctx, target.startsWith("tag:") ? { tag: target.slice(4) } : { statId: target }) || { maxTier: 0 };
    workspaceSetGoal(ctx, target, Math.min(previous.minTier, choice.maxTier), Math.min(previous.minCount || 2, choice.maxCount || 1));
  }
  function workspaceChange(ctx, event) {
    if (ctx.state.auto) workspaceStopAuto(ctx, "설정 변경으로 자동 사용을 멈췄어요.");
    if (event.target.id === "cl-limit") {
      ctx.state.limit = (0, ctx.deps.clampNumber)(Math.floor(Number(event.target.value) || 1), 1, 100);
      workspaceRender(ctx);
      return;
    }
    if (!workspaceSetMethodOption(ctx, event.target) && !workspaceSetGoalOption(ctx, event.target)) return;
    workspaceRender(ctx);
  }
  function workspaceSetMethodOption(ctx, target) {
    if (target.id === "cl-mode") {
      ctx.state.mode = target.value;
      ctx.deps.game.sporeCraftModes[ctx.state.recipe.key] = ctx.state.mode;
      return true;
    }
    if (target.id === "cl-omen") {
      workspaceArmOmen(ctx, target.value);
      return true;
    }
    return false;
  }
  function workspaceSetGoalOption(ctx, target) {
    if (target.id === "cl-goal-match") {
      ctx.state.goalMatch = target.value;
      ctx.state.goal.minMatches = ctx.state.goalMatch === "all" ? ctx.state.goal.rules.length : 1;
      workspaceSaveGoals(ctx);
    } else if (target.id === "cl-goal-stat") workspaceChooseGoal(ctx, target.value);
    else if (target.id === "cl-goal-tier") workspaceSetGoal(ctx, ctx.deps.equipmentLootPolicy.ruleKey(ctx.state.goal.rules[0]), target.value, ctx.state.goal.rules[0].minCount);
    else if (target.id === "cl-goal-count") workspaceSetGoal(ctx, ctx.deps.equipmentLootPolicy.ruleKey(ctx.state.goal.rules[0]), ctx.state.goal.rules[0].minTier, target.value);
    else return false;
    return true;
  }
  function workspaceArmOmen(ctx, value) {
    const [key, side] = value.split(":");
    ctx.state.notice = ctx.deps.equipmentCrafting.armOmen(ctx.deps.game, key, side).reason || "";
    (0, ctx.deps.queueImportantSave)(180);
  }
  function workspaceToggleOmen(ctx, key) {
    workspaceArmOmen(ctx, workspaceArmedOmen(ctx)?.key === key ? "" : `${key}:prefix`);
  }
  function workspaceEditGoals(ctx, action) {
    if (action === "add-goal") {
      if (ctx.state.goal.rules.length >= 3) return;
      const keys = new Set(ctx.state.goal.rules.map(ctx.deps.equipmentLootPolicy.ruleKey));
      const next = workspaceGoalOptions(ctx).find((row) => !keys.has(row.id));
      if (!next) return;
      ctx.state.goal.rules.unshift({ statId: next.id, minTier: 0, minValue: 0 });
    } else ctx.state.goal.rules.splice(Number(action.split(":")[1]), 1);
    ctx.state.goal.minMatches = ctx.state.goalMatch === "all" ? ctx.state.goal.rules.length : 1;
    ctx.state.acknowledged = "";
    workspaceSaveGoals(ctx);
    workspaceRender(ctx);
  }
  function workspaceShowChoice(ctx, pending) {
    if (!ctx.state.choiceDialog) {
      ctx.state.choiceDialog = ctx.deps.document.createElement("dialog");
      ctx.state.choiceDialog.className = "cl-goal-dialog cl-choice-dialog";
      ctx.state.choiceDialog.setAttribute("aria-labelledby", "cl-choice-title");
      ctx.deps.document.body.append(ctx.state.choiceDialog);
      ctx.state.choiceDialog.addEventListener("cancel", (event) => event.preventDefault());
      ctx.state.choiceDialog.addEventListener("click", ctx.handlers.workspaceChoiceClick);
    }
    if (ctx.state.choiceDialog.open) return;
    ctx.state.choiceDialog.innerHTML = `<header><small>${workspaceCoin(ctx, "omenPyre")}${esc3(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB.omenPyre.name))}</small><h2 id="cl-choice-title" tabindex="-1">${(0, ctx.deps._t)("결과 하나를 고르세요")}</h2><p>${esc3(ctx, (0, ctx.deps._t)(pending.item.baseName))}</p></header>
            <div class="cl-choice-list">${pending.options.map(ctx.handlers.workspaceChoiceHtml).join("")}</div>`;
    ctx.state.choiceDialog.showModal();
    ctx.state.choiceDialog.querySelector("h2").focus({ preventScroll: true });
  }
  function workspaceChoiceHtml(ctx, option, index) {
    const lines = [
      ...option.stats.map((stat) => `${ctx.deps.statToneText.statLine(stat.id, `${stat.statName || (0, ctx.deps.getStatName)(stat.id)} +${workspaceAffixValue(ctx, stat, stat.val)}`)}${(0, ctx.deps.getItemAffixTierHtml)(stat)}`),
      ...option.chaosInfusion ? [(0, ctx.deps._t)("혼돈 주입 {id} +{chaosInfusion}", { id: esc3(ctx, (0, ctx.deps.getStatName)(option.chaosInfusion.id)), chaosInfusion: esc3(ctx, workspaceAffixValue(ctx, option.chaosInfusion, option.chaosInfusion.val)) })] : []
    ];
    return `<section class="cl-choice"><h3>${(0, ctx.deps._t)("{value}번 결과", { value: index + 1 })}</h3><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul><button type="button" data-choice="${index}">${(0, ctx.deps._t)("이 결과로")}</button></section>`;
  }
  function workspaceChoiceClick(ctx, event) {
    const button = event.target.closest("[data-choice]");
    if (!button) return;
    const item = ctx.deps.equipmentCrafting.pickChoice(ctx.deps.game, Number(button.dataset.choice));
    ctx.state.choiceDialog.close();
    if (item) {
      ctx.state.last = ctx.deps.craftingResultLedger.amend(item) || ctx.state.last;
      (0, ctx.deps.queueImportantSave)(180);
      (0, ctx.deps.playUiFeedbackSound)("craftSuccess");
    }
    workspaceRender(ctx, !!item);
  }
  async function workspaceEngrave(ctx) {
    const item = selected(ctx);
    if (!item) return;
    const question = (0, ctx.deps._t)("{name} 1개로 지금 추가 옵션을 새깁니다.{value}", { name: ctx.deps.ORB_DB.memoryImprint.name, value: item.imprint ? (0, ctx.deps._t)("\n전에 새긴 옵션은 지워집니다.") : "" });
    if (!await (0, ctx.deps.requestGameConfirmation)(question, { title: ctx.deps.ORB_DB.memoryImprint.name, confirmLabel: (0, ctx.deps._t)("새기기") })) return;
    if (selected(ctx) === item) workspaceImprintDone(ctx, ctx.deps.equipmentCrafting.engrave(ctx.deps.game, item), "지금 옵션을 새겼습니다.");
  }
  async function workspaceRestore(ctx) {
    const item = selected(ctx);
    if (!item) return;
    if (!await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)("지금 추가 옵션이 새긴 옵션으로 바뀌고, 새긴 기억은 사라집니다."), { title: ctx.deps.ORB_DB.memoryImprint.name, confirmLabel: (0, ctx.deps._t)("되돌리기") }) || selected(ctx) !== item) return;
    const result = ctx.deps.equipmentCrafting.restoreImprint(item);
    if (result.ok) {
      ctx.deps.craftingResultLedger.clear();
      ctx.state.last = null;
    }
    workspaceImprintDone(ctx, result, "새긴 옵션으로 되돌렸습니다.");
  }
  function workspaceImprintDone(ctx, result, done) {
    ctx.state.notice = result.ok ? done : result.reason;
    if (result.ok) {
      (0, ctx.deps.addLog)(`🍃 ${ctx.deps.ORB_DB.memoryImprint.name}: ${done}`, "loot-magic");
      (0, ctx.deps.queueImportantSave)(180);
    }
    workspaceRender(ctx, result.ok);
  }
  function workspaceClearSpore(ctx) {
    ctx.state.mode = "none";
    ctx.deps.game.sporeCraftModes[ctx.state.recipe.key] = "none";
    (0, ctx.deps.queueImportantSave)(180);
    workspaceRender(ctx);
  }
  async function workspaceCommand(ctx, action) {
    if (action === "add-goal" || action?.startsWith("remove-goal:")) return workspaceEditGoals(ctx, action);
    return Object.hasOwn(ctx.state.WORKSPACE_COMMANDS, action || "") ? ctx.state.WORKSPACE_COMMANDS[action]() : void 0;
  }
  async function workspaceClick(ctx, event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.command === "stop") {
      workspaceStopAuto(ctx, "자동 사용을 중지했어요.");
      workspaceRender(ctx);
      return;
    }
    if (ctx.state.busy) return;
    if (button.dataset.stashTab) {
      ctx.deps.craftingStashUi.showTab(button.dataset.stashTab);
      workspaceRender(ctx);
      return;
    }
    if (button.dataset.command === "auto") {
      workspaceStartAuto(ctx);
      return;
    }
    if (ctx.state.auto) workspaceStopAuto(ctx, "조작 변경으로 자동 사용을 멈췄어요.");
    if (button.dataset.recipe) {
      workspacePickResource(ctx, button.dataset.recipe);
      return;
    }
    if (button.dataset.omen) {
      workspaceToggleOmen(ctx, button.dataset.omen);
      workspaceRender(ctx);
      return;
    }
    return workspaceCommand(ctx, button.dataset.command);
  }
  function workspaceWire(ctx) {
    ctx.state.root.addEventListener("change", ctx.handlers.workspaceChange);
    ctx.state.root.addEventListener("click", ctx.handlers.workspaceHandleClick);
    ctx.deps.document.addEventListener("visibilitychange", ctx.handlers.workspaceVisibilityChanged);
    ctx.deps.window.addEventListener("pagehide", () => workspaceStopAuto(ctx, ""));
  }
  async function workspaceHandleClick(ctx, event) {
    try {
      await workspaceClick(ctx, event);
    } catch (error) {
      ctx.deps.console.error("Crafting action failed", error);
      ctx.state.notice = (0, ctx.deps._t)("제작 실패: {message}", { message: error.message });
      ctx.state.busy = false;
      workspaceRender(ctx);
    }
  }
  function workspaceVisibilityChanged(ctx) {
    if (ctx.deps.document.hidden && ctx.state.auto) {
      workspaceStopAuto(ctx, "화면을 벗어나 자동 사용을 중지했어요.");
      workspaceRender(ctx);
    }
  }
  function imprintMark(ctx, item) {
    return item && item.imprint ? ' <span class="item-imprint-mark">(기억 새겨짐)</span>' : "";
  }

  // modules/ui/crafting-simulator-view.mjs
  function studyWeightHtml(ctx, row, top) {
    if (!row.allowed) return `<span class="cl-study-blocked">${esc3(ctx, row.reason)}</span>`;
    return `<span class="cl-study-weight" style="--share:${(row.share / top * 100).toFixed(1)}%"><b>${row.weight}</b><small>${(row.share * 100).toFixed(1)}%</small></span>`;
  }
  function workspaceStudyRow(ctx, row, rules, top) {
    const [kind, kindClass] = ctx.state.STUDY_KINDS[row.kind] || ctx.state.STUDY_KINDS.special, isGoal = studyGoalRow(ctx, row, rules);
    const name2 = `<span class="cl-study-name">${ctx.deps.statToneText.statLine(row.statId, row.name)}${isGoal ? (0, ctx.deps._t)('<span class="cl-study-goal">목표</span>') : ""}</span>`;
    const tier = row.maxTier ? `T1~${row.maxTier}` : "고정";
    return `<tr class="${row.allowed ? "" : "cl-pool-blocked"}${isGoal ? " is-goal" : ""}" data-search="${esc3(ctx, row.name + " " + row.tags.map((tag) => ctx.deps.AFFIX_TAG_LABELS[tag]).join(" "))}"><td>${name2}<small>${row.tags.map(ctx.handlers.studyTagHtml).join("")}</small></td><td><span class="cl-study-kind ${kindClass}">${kind}</span></td><td>${tier}</td><td>${studyWeightHtml(ctx, row, top)}</td></tr>`;
  }
  function workspaceStudyRows(ctx, rows, rules = []) {
    const top = Math.max(0, ...rows.map((row) => Number(row.share) || 0)) || 1;
    return rows.map((row) => workspaceStudyRow(ctx, row, rules, top)).join("");
  }
  function workspaceShowStudy(ctx) {
    if (!selected(ctx) || !ctx.deps.contentProgression.isUnlocked("craftSimulator")) return;
    ctx.state.studyRun++;
    if (!ctx.state.studyDialog) {
      ctx.state.studyDialog = ctx.deps.document.createElement("dialog");
      ctx.state.studyDialog.className = "cl-study-dialog";
      ctx.state.studyDialog.setAttribute("aria-labelledby", "cl-study-title");
      ctx.deps.document.body.append(ctx.state.studyDialog);
      ctx.state.studyDialog.addEventListener("close", () => ctx.state.studyRun++);
    }
    const context = { item: JSON.parse(JSON.stringify(selected(ctx))), recipe: { ...ctx.state.recipe }, mode: ctx.state.mode, rules: JSON.parse(JSON.stringify(ctx.state.goal)), omen: null };
    ctx.state.studyDialog.innerHTML = `<header><div><h2 id="cl-study-title">${(0, ctx.deps._t)("제작 시뮬레이터")}</h2><p><span class="cl-study-item" style="color:${(0, ctx.deps.getRarityColor)(context.item.rarity)}">${esc3(ctx, (0, ctx.deps._t)(context.item.name))}</span>${(0, ctx.deps._t)(", {key}{label}, 옵션 상한 {item}", { key: workspaceCoin(ctx, context.recipe.key), label: esc3(ctx, (0, ctx.deps._t)(context.recipe.label)), item: studyTierHtml(ctx, (0, ctx.deps.getItemCraftTier)(context.item)) })}</p></div><button data-study-close aria-label="${(0, ctx.deps._t)("제작 시뮬레이터 닫기")}">${(0, ctx.deps._t)("닫기")}</button></header>
            <section class="cl-study-simulator">
            ${workspaceStudyOmenHtml(ctx, context.item, context.recipe)}<div class="cl-study-controls"><button data-study-sample="1">${(0, ctx.deps._t)("1회 시뮬레이션")}</button><button data-study-sample="2000">${(0, ctx.deps._t)("목표 확률 2,000회 측정")}</button></div>
            <small data-study-reason aria-live="polite"></small><div data-study-result aria-live="polite"></div></section>
            <details open><summary data-study-summary></summary>
            <label class="cl-study-search">${(0, ctx.deps._t)("이름이나 태그 검색")} <input type="search" data-study-search></label>
            <div class="cl-pool-scroll"><table><thead><tr><th>${(0, ctx.deps._t)("옵션")}</th><th>${(0, ctx.deps._t)("종류")}</th><th>${(0, ctx.deps._t)("티어")}</th><th>${(0, ctx.deps._t)("첫 선택 가중치 / 차단 이유")}</th></tr></thead><tbody></tbody></table></div></details>`;
    ctx.state.studyDialog.querySelector("[data-study-close]").onclick = () => ctx.state.studyDialog.close();
    ctx.state.studyDialog.querySelector("[data-study-search]").oninput = ctx.handlers.workspaceFilterStudy;
    ctx.state.studyDialog.onchange = (event) => {
      if (event.target.matches("[data-study-omen]")) workspaceRefreshStudy(ctx, context);
    };
    ctx.state.studyDialog.querySelectorAll("[data-study-sample]").forEach((button) => button.onclick = () => workspaceSampleStudy(ctx, { ...context }, Number(button.dataset.studySample)));
    workspaceRefreshStudy(ctx, context);
    ctx.state.studyDialog.showModal();
  }
  function workspaceFilterStudy(ctx) {
    const query = ctx.state.studyDialog.querySelector("[data-study-search]").value.trim().toLowerCase();
    ctx.state.studyDialog.querySelectorAll("tr[data-search]").forEach((row) => row.hidden = !row.dataset.search.toLowerCase().includes(query));
  }
  function workspaceStudyButtons(ctx, context, reason) {
    ctx.state.studyDialog.querySelectorAll("[data-study-sample]").forEach((button) => button.disabled = !!reason || button.dataset.studySample !== "1" && !context.rules.rules.length);
  }
  function workspaceRefreshStudy(ctx, context) {
    ctx.state.studyRun++;
    context.omen = workspaceStudyOmen(ctx);
    const { rows, reason } = ctx.deps.craftingGoalOptions.study(context);
    ctx.state.studyDialog.querySelector("tbody").innerHTML = workspaceStudyRows(ctx, rows, context.rules.rules);
    ctx.state.studyDialog.querySelector("[data-study-summary]").textContent = `출현 후보와 차단된 옵션, ${rows.filter((row) => row.allowed).length}종 가능`;
    ctx.state.studyDialog.querySelector("[data-study-reason]").textContent = reason;
    ctx.state.studyDialog.querySelector("[data-study-result]").textContent = "";
    workspaceStudyButtons(ctx, context, reason);
    workspaceFilterStudy(ctx);
  }
  function workspaceStudyOmenHtml(ctx, item, method) {
    const action = ctx.deps.equipmentCrafting.resolveAction(method.key, item.rarity), armed = workspaceArmedOmen(ctx);
    const offered = ctx.deps.atlasEndgame.awakened(ctx.deps.game) || !!armed || ctx.deps.CRAFT_OMENS.keys.some((key) => (ctx.deps.game.currencies[key] || 0) > 0);
    const keys = offered ? ctx.deps.CRAFT_OMENS.keys.filter((key) => ctx.deps.CRAFT_OMENS.effects[key].actions.includes(action)) : [];
    if (!keys.length) return "";
    const value = armed ? `${armed.key}:${armed.side}` : "";
    return `<label class="cl-study-omen">${(0, ctx.deps._t)("뿌리")} <select data-study-omen>${[["", "뿌리 없이"], ...workspaceOmenOptions(ctx, keys)].map(([key, label]) => `<option value="${key}" ${key === value ? "selected" : ""}>${esc3(ctx, label)}</option>`).join("")}</select></label>`;
  }
  function workspaceStudyOmen(ctx) {
    const [key, side] = (ctx.state.studyDialog.querySelector("[data-study-omen]")?.value || "").split(":");
    return key ? ctx.deps.equipmentCrafting.omenSpec(key, side) : null;
  }
  function workspaceRehearse(ctx, context) {
    const { item, recipe, mode, omen } = context;
    const picks = omen && omen.effect === "choice" && ctx.deps.equipmentCrafting.omenFits(item, ctx.deps.equipmentCrafting.resolveAction(recipe.key, item.rarity), omen, mode) ? ctx.deps.CRAFT_OMENS.choices : 1;
    return Array.from({ length: picks }, () => ctx.deps.craftingGoalOptions.rehearseStudy(context));
  }
  function workspaceSampleHtml(ctx, hits, count, picks) {
    const p = hits / count, z = 1.96, den = 1 + z * z / count, centre = (p + z * z / (2 * count)) / den;
    const delta = z * Math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / den;
    return `<strong>목표 달성 ${hits}/${count}회${picks > 1 ? (0, ctx.deps._t)("({picks}개 가운데 하나라도)", { picks }) : ""}, <span class="cl-study-rate">${(p * 100).toFixed(2)}%</span></strong><p>95% 추정 범위 ${(Math.max(0, centre - delta) * 100).toFixed(2)}~${(Math.min(1, centre + delta) * 100).toFixed(2)}%, ${hits >= 5 ? (0, ctx.deps._t)("평균 약 {round}회 / 주 재화 {round2}개", { round: Math.round(1 / p), round2: Math.round(1 / p) }) : (0, ctx.deps._t)("관측이 적어 평균 비용 추정 보류")}</p>`;
  }
  async function workspaceSampleStudy(ctx, context, count) {
    if (!workspaceStudyActive(ctx, ctx.state.studyRun)) return;
    const run = ++ctx.state.studyRun, out = ctx.state.studyDialog.querySelector("[data-study-result]"), buttons = [...ctx.state.studyDialog.querySelectorAll("[data-study-sample]")];
    buttons.forEach((button) => button.disabled = true);
    let hits = 0, results = [];
    try {
      for (let i = 0; i < count; i++) {
        if (!workspaceStudyActive(ctx, run)) return;
        results = workspaceRehearse(ctx, context);
        if (results.some((result) => ctx.deps.equipmentLootPolicy.matches(result, { settings: { equipmentTargets: context.rules } }))) hits++;
        if (i % 50 === 49) {
          out.textContent = (0, ctx.deps._t)("측정 중 {value}/{count}", { value: i + 1, count });
          await new Promise((resolve) => (0, ctx.deps.setTimeout)(resolve, 0));
        }
      }
      if (!workspaceStudyActive(ctx, run)) return;
      if (count === 1) out.innerHTML = workspacePracticeHtml(ctx, results, context.rules);
      else out.innerHTML = workspaceSampleHtml(ctx, hits, count, results.length);
    } catch (error) {
      ctx.deps.console.error("Craft rehearsal failed", error);
      out.textContent = (0, ctx.deps._t)("시뮬레이션 실패: {message}", { message: error.message });
    } finally {
      if (run === ctx.state.studyRun) workspaceStudyButtons(ctx, context, ctx.deps.craftingGoalOptions.study(context).reason);
    }
  }
  function studyTagHtml(ctx, tag) {
    return `<span class="cl-study-tag"${ctx.state.STUDY_TAG_TONES[tag] ? ` style="--tone:${(0, ctx.deps.getItemStatToneColor)(ctx.state.STUDY_TAG_TONES[tag])}"` : ""}>${esc3(ctx, ctx.deps.AFFIX_TAG_LABELS[tag])}</span>`;
  }
  function studyTierHtml(ctx, tier) {
    return `<span class="tier-badge ${(0, ctx.deps.getTierClassName)(tier)}">T${tier}</span>`;
  }
  function studyGoalRow(ctx, row, rules) {
    return rules.some((rule) => rule.statId ? row.statIds.includes(rule.statId) : !!rule.tag && row.tags.includes(rule.tag));
  }
  function studyGoalLine(ctx, stat, rules) {
    return rules.some((rule) => (rule.tag ? [stat] : [stat, ...(stat.extraStats || []).map((extra) => ({ ...extra, tier: stat.tier }))]).some((line) => ctx.deps.equipmentLootPolicy.lineMatchesRule(line, rule)));
  }
  function workspaceStudyLineHtml(ctx, stat, rules) {
    return `<li${studyGoalLine(ctx, stat, rules) ? ' class="is-goal"' : ""}>${ctx.deps.statToneText.statLine(stat.id, `${stat.statName || (0, ctx.deps.getStatName)(stat.id)} +${(0, ctx.deps.formatValue)(stat.id, stat.val)}`)}${(0, ctx.deps.getItemAffixTierHtml)(stat)}</li>`;
  }
  function workspaceStudyVerdict(ctx, result, rules) {
    return !rules.rules.length ? "" : ctx.deps.equipmentLootPolicy.matches(result, { settings: { equipmentTargets: rules } }) ? '<span class="cl-study-verdict is-hit">목표 달성</span>' : '<span class="cl-study-verdict">목표 미달</span>';
  }
  function workspacePracticeHtml(ctx, results, rules) {
    const many = results.length > 1, lines = (result) => `<ul>${result.stats.map((stat) => workspaceStudyLineHtml(ctx, stat, rules.rules)).join("")}</ul>`;
    return `<strong>시뮬레이션 결과${many ? (0, ctx.deps._t)(", {length}개 가운데 고르기", { length: results.length }) : ""}</strong>${many ? "" : workspaceStudyVerdict(ctx, results[0], rules)}` + results.map((result, index) => `${many ? `<div class="cl-study-pick">${(0, ctx.deps._t)("{value}번 결과{result}", { value: index + 1, result: workspaceStudyVerdict(ctx, result, rules) })}</div>` : ""}${lines(result)}`).join("");
  }
  function workspaceStudyActive(ctx, run) {
    return run === ctx.state.studyRun && ctx.state.studyDialog.open && ctx.deps.contentProgression.isUnlocked("craftSimulator");
  }

  // modules/ui/crafting-workspace.mjs
  function createCraftingWorkspace(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { workspacePickResource, workspaceResourceState, workspaceAffixHtml, workspaceSporeOption, workspaceGoalReachable, workspaceAcknowledgeGoal, workspaceAutoStep, studyTagHtml, workspaceFilterStudy, workspaceChoiceHtml, workspaceChoiceClick, workspaceChange, workspaceHandleClick, workspaceVisibilityChanged, workspaceRender, workspaceOpenInventory, workspaceStopAuto, imprintMark };
    for (const [name2, handler] of Object.entries(handlers)) ctx.handlers[name2] = handler.bind(void 0, ctx);
    initialize3(ctx);
    ctx.api = { render: ctx.handlers.workspaceRender, openInventory: ctx.handlers.workspaceOpenInventory, stopAuto: ctx.handlers.workspaceStopAuto, imprintMark: ctx.handlers.imprintMark };
    return ctx.api;
  }
  function initialize3(ctx) {
    ctx.state.recipes = [
      ...["magicBud", "sapBud", "formlessDew", "goldenRule", "blightSpore", "blessing", "pruningShears", "fairyRing", "emberBranch", "burningEmberBranch", "deepWhetstone", "rootIron", "jewelPolish", "abyssCatalyst", "catalystPhys", "catalystFire", "catalystCold", "catalystLight", "catalystChaos", "catalystCrit", "catalystSummon", "enchantedHoney", "venomStinger", "voidChisel", "ouroboros", "oceanRerollShard", "altarEmber", "altarIchor"].map((key) => ({ key, kind: ctx.deps.equipmentCrafting.basicRule(ctx.deps.equipmentCrafting.resolveAction(key, "normal"))?.kind || { goldenRule: "value", blightSpore: "reset" }[key] || "special", label: (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name) })),
      ...ctx.deps.FOSSIL_DB.map((row) => ({ key: row.key, kind: "fossil", label: row.name }))
    ];
    ctx.state.root = void 0;
    ctx.state.current = null;
    ctx.state.owner = null;
    ctx.state.goal = void 0;
    ctx.state.recipe = ctx.state.recipes[0];
    ctx.state.mode = "none";
    ctx.state.extras = "";
    ctx.state.renderKey = "";
    ctx.state.adapter = void 0;
    ctx.state.busy = false;
    ctx.state.acknowledged = "";
    ctx.state.count = 0;
    ctx.state.spent = {};
    ctx.state.last = null;
    ctx.state.notice = "";
    ctx.state.auto = false;
    ctx.state.timer = 0;
    ctx.state.runId = 0;
    ctx.state.runCount = 0;
    ctx.state.limit = 20;
    ctx.state.goalDialog = void 0;
    ctx.state.studyDialog = void 0;
    ctx.state.choiceDialog = void 0;
    ctx.state.studyRun = 0;
    ctx.state.goalMatch = "all";
    ctx.state.CHOICE_WAIT = { enabled: false, reason: "성화의 뿌리로 굴린 결과 가운데 하나를 먼저 고르세요." };
    ctx.state.SPORE_LABELS = { fire: "화염", cold: "냉기", light: "번개", chaos: "카오스", damage: "피해" };
    ctx.state.STUDY_KINDS = { prefix: ["접두", "is-prefix"], suffix: ["접미", "is-suffix"], special: ["특수", "is-special"] };
    ctx.state.STUDY_TAG_TONES = {
      physical: "physPctDmg",
      elemental: "elementalPctDmg",
      fire: "firePctDmg",
      cold: "coldPctDmg",
      light: "lightPctDmg",
      chaos: "chaosPctDmg",
      crit: "crit",
      speed: "aspd",
      life: "pctHp",
      defense: "armor",
      resistance: "resAll",
      recovery: "regen"
    };
    ctx.state.WORKSPACE_COMMANDS = {
      "clear-spore": () => workspaceClearSpore(ctx),
      study: () => workspaceShowStudy(ctx),
      inventory: () => workspaceOpenInventory(ctx),
      craft: () => workspaceCraft(ctx),
      ack: () => workspaceShowGoalDialog(ctx),
      engrave: () => workspaceEngrave(ctx),
      restore: () => workspaceRestore(ctx)
    };
  }

  // modules/ui/crafting-result-rows.mjs
  function getSocketRows(ctx, before, after) {
    return after.sockets > before.sockets ? [(0, ctx.deps._t)("소켓 {sockets} → {sockets2}", { sockets: before.sockets, sockets2: after.sockets })] : [];
  }
  function getWardRows(ctx, before, after) {
    return before.wardSlots !== after.wardSlots ? [(0, ctx.deps._t)("액막이 칸 {wardSlots} → {wardSlots2}", { wardSlots: before.wardSlots || 0, wardSlots2: after.wardSlots || 0 })] : [];
  }
  function appendRarityRow(ctx, rows, before, after) {
    let rarityLabels = ctx.deps.ITEM_RARITY_LABELS;
    if (before.rarity !== after.rarity) rows.push(`등급 ${rarityLabels[before.rarity] || before.rarity} → ${rarityLabels[after.rarity] || after.rarity}`);
  }
  function getMetaRows(ctx, result) {
    let before = result.before;
    let after = result.after;
    let rows = [];
    appendRarityRow(ctx, rows, before, after);
    if (before.quality !== after.quality) rows.push(`품질 ${before.quality}% → ${after.quality}%`);
    if (before.baseName !== after.baseName) rows.push(`베이스 ${before.baseName || (0, ctx.deps._t)("없음")} → ${after.baseName || (0, ctx.deps._t)("없음")}`);
    if (!before.corrupted && after.corrupted) rows.push("타락됨");
    rows.push(...getSocketRows(ctx, before, after), ...getWardRows(ctx, before, after));
    if (before.uniqueEffect !== after.uniqueEffect) rows.push("고유 효과 변경");
    return rows;
  }

  // modules/ui/crafting-result-view.mjs
  function createCraftingResultView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getMetaRows };
    for (const [name2, handler] of Object.entries(handlers)) ctx.handlers[name2] = handler.bind(void 0, ctx);
    ctx.api = { getMetaRows: ctx.handlers.getMetaRows };
    return ctx.api;
  }

  // modules/ui/fossil-workbench.mjs
  function renderFossilWorkbench(deps) {
    const restoreOpen = deps.contentProgression.isUnlocked("fossilRestore");
    const materialButtons = [
      { key: "fossil", restore: false, label: (0, deps._t)("기본 화석 정제"), action: "applyFossilCraft()" },
      { key: "fossilPrimal", restore: true, label: (0, deps._t)("원시 화석 복원"), action: "restorePrimalFossil('normal')" },
      { key: "fossilAncientPrimal", restore: true, label: (0, deps._t)("원시 고대 화석 복원"), action: "restorePrimalFossil('ancient')" }
    ].filter((row) => deps.game.currencies[row.key] > 0).map((row) => {
      const locked = row.restore && !restoreOpen;
      return `<button type="button" onclick="${row.action}" ${locked ? "disabled" : ""}>${(0, deps._t)("{label}, 보유 {currencies}{value}", { label: (0, deps._t)(row.label), currencies: deps.game.currencies[row.key], value: locked ? (0, deps._t)(", 화석 복원 해금 필요") : "" })}</button>`;
    });
    ["fossil", ...deps.FOSSIL_DB.map((fossil) => fossil.key)].forEach((fossilKey) => {
      let surplusCost = typeof deps.getFossilSurplusRefiningCost === "function" ? (0, deps.getFossilSurplusRefiningCost)(fossilKey) : null;
      let owned = Math.max(0, Math.floor(deps.game.currencies[fossilKey] || 0));
      if (!surplusCost || owned <= 0) return;
      let sourceName = fossilKey === "fossil" ? "미궁 화석" : (deps.FOSSIL_DB.find((row) => row.key === fossilKey) || {}).name || fossilKey;
      materialButtons.push(`<button onclick="refineFossilSurplus('${fossilKey}')" ${!restoreOpen || owned < surplusCost ? "disabled" : ""}>${sourceName} 잉여 정제 (${owned}/${surplusCost})</button>`);
    });
    deps.document.getElementById("ui-fossil-material-actions").innerHTML = materialButtons.join("") || "<p>정제할 화석이 없습니다.</p>";
  }

  // modules/ui/crafting-views.mjs
  function createCraftingViews(deps) {
    const results = createCraftingResultView(deps);
    const fossils = renderFossilWorkbench.bind(void 0, deps);
    const catalog = createCraftingCatalog(deps);
    const stash = createCraftingStash(Object.create(deps, { craftingCatalogUi: { value: catalog } }));
    const workspace = createCraftingWorkspace(Object.create(deps, {
      craftingCatalogUi: { value: catalog },
      craftingStashUi: { value: stash },
      craftingResultUi: { value: results },
      renderFossilWorkbench: { value: fossils }
    }));
    return { catalog, stash, workspace, fossils };
  }

  // modules/crafting-workspace-ui-classic.mjs
  var views = createCraftingViews({
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get stumpBox() {
      return stumpBox;
    },
    get getSporeCraftPriceKey() {
      return getSporeCraftPriceKey;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get contentProgression() {
      return contentProgression;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get i18n() {
      return i18n;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get window() {
      return window;
    },
    get CRAFT_OMENS() {
      return CRAFT_OMENS;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get equipmentLootPolicy() {
      return equipmentLootPolicy;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get craftingGoalOptions() {
      return craftingGoalOptions;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getOceanShardBlockReason() {
      return getOceanShardBlockReason;
    },
    get FOSSIL_DB() {
      return FOSSIL_DB;
    },
    get emberCorruptionUi() {
      return emberCorruptionUi;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get itemInfluencesUi() {
      return itemInfluencesUi;
    },
    get sapCatalysts() {
      return sapCatalysts;
    },
    get sapCatalystsUi() {
      return sapCatalystsUi;
    },
    get getFossilExclusivePool() {
      return getFossilExclusivePool;
    },
    get getFossilGuaranteedPool() {
      return getFossilGuaranteedPool;
    },
    get getFossilSurplusRefiningCost() {
      return typeof getFossilSurplusRefiningCost === "function" ? getFossilSurplusRefiningCost : void 0;
    },
    get formatValue() {
      return formatValue;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getStatName() {
      return getStatName;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get isFixedEquipmentAffix() {
      return isFixedEquipmentAffix;
    },
    get findStoredEquipmentAffix() {
      return findStoredEquipmentAffix;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get copyCraftResultStat() {
      return copyCraftResultStat;
    },
    get getItemAffixTierHtml() {
      return getItemAffixTierHtml;
    },
    get colonyWards() {
      return colonyWards;
    },
    get COLONY_WARD_RULES() {
      return COLONY_WARD_RULES;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getItemExplicitOptionCount() {
      return getItemExplicitOptionCount;
    },
    get AFFIX_TAG_LABELS() {
      return AFFIX_TAG_LABELS;
    },
    get hasSporeCraftCost() {
      return hasSporeCraftCost;
    },
    get getSporeCraftBlockReason() {
      return getSporeCraftBlockReason;
    },
    get isSporeCraftEquipment() {
      return isSporeCraftEquipment;
    },
    get getAvailableSporeCraftModes() {
      return getAvailableSporeCraftModes;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get craftingResultLedger() {
      return craftingResultLedger;
    },
    get performance() {
      return performance;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get applyFossilChaosCraft() {
      return applyFossilChaosCraft;
    },
    get applyEnchantedHoneyToSelectedItem() {
      return applyEnchantedHoneyToSelectedItem;
    },
    get applyVenomStingerToSelectedItem() {
      return applyVenomStingerToSelectedItem;
    },
    get applyVoidChiselToSelectedItem() {
      return applyVoidChiselToSelectedItem;
    },
    get applyWoodsmanTouchToSelectedItem() {
      return applyWoodsmanTouchToSelectedItem;
    },
    get rerollSingleBaseOption() {
      return rerollSingleBaseOption;
    },
    get useCurrency() {
      return useCurrency;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get console() {
      return console;
    },
    get clampNumber() {
      return clampNumber;
    },
    get statToneText() {
      return statToneText;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get addLog() {
      return addLog;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get getTierClassName() {
      return getTierClassName;
    }
  });
  var craftingCatalogUi = views.catalog;
  var craftingStashUi = views.stash;
  var craftingWorkspaceUi = views.workspace;
  var renderFossilWorkbench2 = views.fossils;
  safeExposeGlobals({ craftingCatalogUi, craftingStashUi, craftingWorkspaceUi, renderFossilWorkbench: renderFossilWorkbench2 });
})();
