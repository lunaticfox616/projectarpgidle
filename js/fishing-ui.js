// GENERATED from modules/fishing-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/fishing-panel.mjs
  function meterHtml(ctx, label, value, cls) {
    return `<div class="fishing-meter ${cls}"><span>${label}</span><b>${Math.floor(clamp(ctx, value))}%</b>${bar(ctx, clamp(ctx, value), 100)}</div>`;
  }
  function strategyEffects(ctx, def) {
    const gauge = Math.round((def.gaugeGainMul - 1) * 100), rare = Math.round((def.rareWeightMul - 1) * 100), oxygen = Math.round((def.oxygenDrainMul - 1) * 100);
    const chips = [];
    if (gauge) chips.push([(0, ctx.deps._t)("게이지 {gauge}", { gauge: signed(ctx, gauge) }), gauge > 0]);
    if (rare) chips.push([(0, ctx.deps._t)("희귀 추적 {rare}", { rare: signed(ctx, rare) }), rare > 0]);
    if (oxygen) chips.push([(0, ctx.deps._t)("산소 소모 {oxygen}", { oxygen: signed(ctx, oxygen) }), oxygen < 0]);
    return chips.length ? chips.map(([text, good]) => `<i class="${good ? "is-good" : "is-bad"}">${text}</i>`).join("") : "<i>변화 없음</i>";
  }
  function strategyCardHtml(ctx, key, st) {
    const def = ctx.deps.OCEAN_FISHING_STRATEGIES[key], on = st.fishingStrategy === key;
    return `<button type="button" class="fishing-strategy-card${on ? " is-on" : ""}" aria-pressed="${on}" onclick="setOceanFishingStrategy('${key}')"${st.diving ? " disabled" : ""}><span class="fishing-strategy-icon" aria-hidden="true">${def.icon}</span><strong>${esc(ctx, (0, ctx.deps._t)(def.name))}</strong>${on ? (0, ctx.deps._t)("<em>적용 중</em>") : ""}<span class="fishing-chips">${strategyEffects(ctx, def)}</span></button>`;
  }
  function reefHtml(ctx, st) {
    const owned = Math.floor(ctx.deps.game.currencies.reefFragment || 0), full = st.reefInstalled >= 10;
    return `<div class="fishing-reef"><span>${(0, ctx.deps._t)("암초")}</span>${bar(ctx, st.reefInstalled, 10)}<b>${(0, ctx.deps._t)("{reefInstalled}/10, 게이지 +{value}%", { reefInstalled: st.reefInstalled, value: st.reefInstalled * 15 })}</b><button type="button" onclick="installOceanReefFragment(); fishingUi.render();"${full || owned < 1 ? " disabled" : ""}>${full ? (0, ctx.deps._t)("설치 완료") : (0, ctx.deps._t)("설치 (보유 {owned})", { owned })}</button></div>`;
  }
  function gatherHtml(ctx, st) {
    const last = st.lastCatch && ctx.deps.OCEAN_FISH_DB[st.lastCatch.key];
    const catchHtml = last ? `${fishIcon(ctx, st.lastCatch.key)}<div><small>${(0, ctx.deps._t)("최근 포획")}</small><strong class="is-${last.rarity}">${st.lastCatch.guaranteed ? "✨ " : ""}${esc(ctx, (0, ctx.deps._t)(last.name))}</strong></div>` : '<span class="fishing-fish is-empty"></span><div><small>최근 포획</small><strong>아직 없음</strong></div>';
    return `<div class="fishing-head"><div><h3>${(0, ctx.deps._t)("심해 어장")}</h3><p>${(0, ctx.deps._t)("심해 전투 구간마다 게이지가 오르고 100%에서 물고기를 낚습니다.")}</p></div><div class="fishing-last">${catchHtml}</div></div><div class="fishing-meters">${meterHtml(ctx, "낚시 게이지", st.fishingGauge, "")}${meterHtml(ctx, "희귀 조짐", st.rareFishPity, "is-pity")}</div><div class="fishing-quick"><button type="button" onclick="switchMapSubtab('map-tab-ocean')">${(0, ctx.deps._t)("잠수하러 가기")}</button><button type="button" onclick="fishingUi.openWorkshop()">${(0, ctx.deps._t)("심해 제작")}</button></div><section class="fishing-strategy"><header><strong>${(0, ctx.deps._t)("채집 전략")}</strong><span>${st.diving ? (0, ctx.deps._t)("잠수 중에는 바꿀 수 없음") : (0, ctx.deps._t)("다음 잠수부터 적용")}</span></header><div class="fishing-strategy-grid">${Object.keys(ctx.deps.OCEAN_FISHING_STRATEGIES).map((key) => strategyCardHtml(ctx, key, st)).join("")}</div>${reefHtml(ctx, st)}</section>`;
  }
  function fishTileHtml(ctx, st, key) {
    const fish = ctx.deps.OCEAN_FISH_DB[key], total = Math.floor(st.fishCaughtTotal[key] || 0), known = total > 0;
    const rarity = (ctx.deps.OCEAN_FISH_RARITY_META[fish.rarity] || ctx.deps.OCEAN_FISH_RARITY_META.common).label;
    return `<article class="fishing-fish-tile is-${fish.rarity}${known ? "" : " is-unknown"}"${st.lastCatch && st.lastCatch.key === key ? ' data-last="1"' : ""}>${fishIcon(ctx, key, known)}<strong>${known ? esc(ctx, (0, ctx.deps._t)(fish.name)) : "???"}</strong><small>${rarity}, ${fish.depthTier * 100}m+</small><b>${known ? (0, ctx.deps._t)("보유 {floor}, 누적 {total}", { floor: Math.floor(st.fishStock[key] || 0), total }) : (0, ctx.deps._t)("미발견")}</b></article>`;
  }
  function milestoneHtml(ctx, progress, row) {
    const state = row.claimed ? "is-claimed" : row.ready ? "is-ready" : "is-locked";
    const bonuses = [row.bonus.gaugeGainPct ? (0, ctx.deps._t)("게이지 +{gaugeGainPct}%", { gaugeGainPct: row.bonus.gaugeGainPct }) : "", row.bonus.rareChancePct ? (0, ctx.deps._t)("희귀 추적 +{rareChancePct}%", { rareChancePct: row.bonus.rareChancePct }) : ""].filter(Boolean);
    const reward = Object.keys(row.reward || {}).map((key) => `${(ctx.deps.ORB_DB[key] || {}).name || key} ${row.reward[key]}`).concat(bonuses.map((text) => (0, ctx.deps._t)("영구 {text}", { text }))).join(", ");
    const label = row.claimed ? "완료" : row.ready ? "받기" : `${progress.discoveredCount}/${row.required}`;
    return `<div class="fishing-milestone ${state}"><span>${(0, ctx.deps._t)("{required}종", { required: row.required })}</span><div><strong>${esc(ctx, (0, ctx.deps._t)(row.label))}</strong><small>${esc(ctx, reward)}</small>${bar(ctx, Math.min(progress.discoveredCount, row.required), row.required)}</div><button type="button" onclick="claimOceanFishCollectionMilestone(${row.required})"${row.ready && !row.claimed ? "" : " disabled"}>${label}</button></div>`;
  }
  function renderCollection(ctx, st, progress) {
    const summary = ctx.deps.document.getElementById("ui-fishing-collection-summary"), section = ctx.deps.document.getElementById("fishing-collection");
    const ready = progress.milestones.filter((row) => row.ready && !row.claimed).length;
    if (summary) summary.textContent = `심해 도감 ${progress.discoveredCount}/${progress.totalCount}${ready ? (0, ctx.deps._t)(", 받을 보상 {ready}", { ready }) : ""}`;
    if (!section || !section.open) return;
    if (ctx.deps.uiDisplay.matches("(max-width: 1080px)") && section.dataset.mobileSelected !== "true") return;
    (0, ctx.deps.updateGamePanelMarkup)(ctx.deps.document.getElementById("ui-fishing-collection"), `<div class="fishing-fish-grid">${Object.keys(ctx.deps.OCEAN_FISH_DB).map((key) => fishTileHtml(ctx, st, key)).join("")}</div><div class="fishing-milestones">${progress.milestones.map((row) => milestoneHtml(ctx, progress, row)).join("")}</div>`);
  }
  function needsCategory(ctx, recipe) {
    return recipe.effect.type === "convertCategoryMod";
  }
  function categoryOf(ctx, recipe) {
    if (!needsCategory(ctx, recipe)) return void 0;
    if (ctx.state.chosen[recipe.id]) return ctx.state.chosen[recipe.id];
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)();
    return item && ctx.state.CATEGORY_OPTIONS.find((cat) => !(0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, cat)) || ctx.state.CATEGORY_OPTIONS[0];
  }
  function selectedCount(ctx, recipe) {
    if (ctx.deps.SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type)) return 1;
    if (!ctx.state.batchChoice || ctx.state.batchChoice.owner !== ctx.deps.game || ctx.state.batchChoice.season !== ctx.deps.game.season || ctx.state.batchChoice.recipe !== recipe.id) {
      ctx.state.batchChoice = { owner: ctx.deps.game, season: ctx.deps.game.season, recipe: recipe.id, count: 1 };
    }
    return ctx.state.batchChoice.count;
  }
  function quantityHtml(ctx, status) {
    if (status.batchLimit === 1 || status.maxCrafts <= 1 && status.count === 1) return "";
    const counts = [.../* @__PURE__ */ new Set([1, ...[5, 10, 25, 50, 100].filter((n) => n <= status.maxCrafts), Math.max(1, status.maxCrafts), status.count])].sort((a, b) => a - b);
    return `<label class="fishing-quantity">${(0, ctx.deps._t)("제작 횟수")}<select aria-label="${(0, ctx.deps._t)("제작 횟수")}" onchange="fishingUi.setCount(this.value)">${counts.map((count) => `<option value="${count}"${count === status.count ? " selected" : ""}${count > status.maxCrafts && count !== 1 ? " disabled" : ""}>${(0, ctx.deps._t)("{value}{count}회", { value: count === status.maxCrafts && count > 1 ? (0, ctx.deps._t)("최대 ") : "", count })}</option>`).join("")}</select></label>`;
  }
  function setCount(ctx, value) {
    const id = ctx.deps.document.querySelector("#ui-sea-gift-panel [data-sea-recipe]")?.dataset.seaRecipe;
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find((row) => row.id === id), count = Number(value);
    if (!recipe) return;
    const status = (0, ctx.deps.getSeaGiftRecipeStatus)(id, null, categoryOf(ctx, recipe), count);
    if (status.batchLimit === 1 || !status.valid) return;
    selectedCount(ctx, recipe);
    ctx.state.batchChoice.count = count;
    ctx.state.lastResult = null;
    render(ctx);
  }
  function costHtml(ctx, recipe, st, count) {
    return Object.keys(recipe.requires).map((key) => {
      const have = Math.floor(st.fishStock[key] || 0), need = recipe.requires[key] * count, fish = ctx.deps.OCEAN_FISH_DB[key];
      return `<div class="fishing-material${have >= need ? " is-ok" : ""}" data-tip="${esc(ctx, (0, ctx.deps._t)("{value}m 이상에서 낚시", { value: fish.depthTier * 100 }))}">${fishIcon(ctx, key)}<strong>${esc(ctx, (0, ctx.deps._t)(fish.name))}</strong><span>${esc(ctx, (0, ctx.deps._t)("{have} / {need}", { have, need }))}</span></div>`;
    }).join("");
  }
  function lineText(ctx, stat) {
    const tier = stat.tier ? `, T${stat.tier}` : "";
    const seal = stat.lockedByHoney || stat.lockedByRift ? (0, ctx.deps._t)(", 봉인됨") : "";
    const parts = [stat, ...stat.extraStats || []];
    const values = parts.map((row) => {
      const name = (0, ctx.deps._t)(parts.length > 1 ? (0, ctx.deps.getStatName)(row.id) : row.statName || (0, ctx.deps.getStatName)(row.id));
      const value = stat.isEchoMod ? `${row.val >= 0 ? "+" : ""}${Number(Number(row.val).toFixed(3))}` : (0, ctx.deps.formatSignedValue)(row.id, row.val);
      return `${name} ${value}`;
    }).join(" / ");
    return `${values}${tier}${seal}${stat.isEchoMod ? (0, ctx.deps._t)(", 메아리") : ""}${stat.oceanBenchOptionId ? (0, ctx.deps._t)(", 심해 전용") : ""}`;
  }
  function targetReason(ctx, recipe) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    return (0, ctx.deps.getSeaGiftTargetBlockReason)(item) || (0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, categoryOf(ctx, recipe));
  }
  function targetHtml(ctx, recipe) {
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)(), reason = targetReason(ctx, recipe);
    const text = item ? `<strong class="item-title ${item.rarity}">${esc(ctx, (0, ctx.deps.getItemDisplayName)(item))}</strong>` : `<strong>${(0, ctx.deps._t)("가공할 장비를 선택하세요")}</strong>`;
    return `<section class="fishing-target${item ? " is-on" : ""}"><div>${text}</div><div class="fishing-target-buttons"><button type="button" onclick="fishingUi.pickTarget('equip')">${(0, ctx.deps._t)("장착 장비")}</button><button type="button" onclick="fishingUi.pickTarget('inventory')">${(0, ctx.deps._t)("가방 장비")}</button></div>` + (item && reason ? `<p class="fishing-target-state is-blocked">${esc(ctx, (0, ctx.deps._t)(reason))}</p>` : "") + (item ? targetLinesHtml(ctx, recipe, item, reason) : "") + "</section>";
  }
  function valuePreview(ctx, recipe, item) {
    const rows = recipe.effect.type === "tierStepUp" ? (0, ctx.deps.getSeaGiftTierStepRows)(item) : (0, ctx.deps.getSeaGiftRerollRows)(item);
    const label = recipe.effect.type === "tierStepUp" ? "등급 +1" : "수치 재굴림";
    return new Map(rows.map((row) => [row.index, rows.length === 1 ? label : "무작위 후보"]));
  }
  function sealPreview(ctx, effect, item) {
    return new Map((0, ctx.deps.getSeaGiftEditableIndexes)(item).slice(0, effect.count).map((index) => [index, "영구 봉인"]));
  }
  function replacementPreview(ctx, recipe, item) {
    const category = categoryOf(ctx, recipe), indexes = (0, ctx.deps.getSeaGiftEditableIndexes)(item);
    const pool = (0, ctx.deps.getAvailableMods)(item).filter((mod) => !category || (0, ctx.deps.getModCategory)(mod) === category);
    return new Map(ctx.deps.equipmentCrafting.pickReplacement(item, pool, indexes, void 0, "all").map((row) => [row.index, "교체 후보"]));
  }
  function echoPreview(ctx, item) {
    const paths = (0, ctx.deps.getSeaGiftEchoTargets)(item, (0, ctx.deps.getSeaGiftEditableIndexes)(item));
    const labels = new Map(paths.flatMap((path) => path.targetIndexes.map((index) => [index, "덮어쓸 후보"])));
    paths.forEach((path) => labels.set(path.sourceIndex, labels.has(path.sourceIndex) ? "원본과 교체 후보" : "복사 원본 후보"));
    labels.set(-1, "선택된 원본은 유지됩니다. 그 원본을 복사할 수 있는 다른 후보 중 1줄을 절반 효과의 메아리로 덮어씁니다.");
    return labels;
  }
  function targetPreview(ctx, recipe, item) {
    if (ctx.state.VALUE_EFFECTS.has(recipe.effect.type)) return valuePreview(ctx, recipe, item);
    if (recipe.effect.type === "lockMod") return sealPreview(ctx, recipe.effect, item);
    if (recipe.effect.type === "convertCategoryMod") return replacementPreview(ctx, recipe, item);
    if (recipe.effect.type === "echoMod") return echoPreview(ctx, item);
    if (recipe.effect.type === "fixedBenchOption") {
      const index = (0, ctx.deps.getSeaGiftBenchSlot)(item);
      return /* @__PURE__ */ new Map([[index, index < 0 ? "기존 줄을 유지하고 새 전용 옵션을 추가합니다." : "전용 옵션 교체"]]);
    }
    return null;
  }
  function targetLinesHtml(ctx, recipe, item, reason) {
    const labels = reason ? null : targetPreview(ctx, recipe, item);
    if (!labels) return `<details><summary>${(0, ctx.deps._t)("현재 추가 옵션 {length}줄 보기", { length: item.stats.length })}</summary>${linesHtml(ctx, item.stats.map(ctx.handlers.lineText))}</details>`;
    const rows = item.stats.map((stat, index) => {
      const affected = labels.has(index), label = labels.get(index) || (stat.lockedByHoney || stat.lockedByRift ? "봉인 보호" : "유지");
      return `<li data-option-index="${index}" class="${affected ? "is-affected" : "is-kept"}${label.includes("제거") ? " is-risk" : ""}"><b>${esc(ctx, (0, ctx.deps._t)(label))}</b><span>${index + 1}. ${esc(ctx, lineText(ctx, stat))}</span></li>`;
    }).join("");
    const summary = recipe.effect.type === "lockMod" ? (0, ctx.deps._t)("봉인할 옵션: {option}", { option: lineText(ctx, item.stats[(0, ctx.deps.getSeaGiftEditableIndexes)(item)[0]]) }) : (0, ctx.deps._t)("현재 옵션과 적용 범위");
    return `<details class="fishing-preview"><summary>${esc(ctx, summary)}</summary><ul class="fishing-lines">${rows}</ul>` + (labels.has(-1) ? `<p>${esc(ctx, (0, ctx.deps._t)(labels.get(-1)))}</p>` : "") + "</details>";
  }
  function groupOf(ctx, recipe) {
    return recipe.group;
  }
  function currencyGuide(ctx, effect) {
    if (effect.type === "randomCurrency") return [
      (0, ctx.deps._t)("제작 재화 {amount}개를 무작위로 받습니다.", { amount: effect.amount }),
      (0, ctx.deps._t)("추첨 후보: {candidates}. 여러 개를 만들면 같은 재화가 나올 수도 있습니다.", { candidates: ctx.deps.SEA_GIFT_RANDOM_ORB_KEYS.map((key) => (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name)).join(", ") })
    ];
    return [(0, ctx.deps._t)("{name} {amount}개를 받습니다.", { name: (0, ctx.deps._t)((0, ctx.deps.getCurrencyInfo)(effect.key).name), amount: effect.amount }), effect.key === "reefFragment" ? "채집 전략 화면에서 암초로 설치하면 낚시 게이지가 더 빨리 오릅니다." : "장비 창 → 제작실에서 사용합니다. 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 바꿉니다. 잠수 장비 업그레이드에도 사용합니다."];
  }
  function benchGuide(ctx, effect) {
    const options = ctx.deps.OCEAN_WORKBENCH_OPTIONS.filter((option) => !!effect.topTier === (option.id === "oceanLeviathanCrown"));
    return [
      effect.topTier ? "리바이어던 전용 보스 피해 옵션을 부여합니다." : "심해 전용 옵션 4종 중 1종을 무작위로 부여합니다.",
      (0, ctx.deps._t)("{options}. 수치는 범위 안에서 무작위입니다. 기존 미봉인 심해 옵션을 교체하며, 없으면 빈 자리에 추가합니다. 꽉 찼으면 가장 낮은 등급의 미봉인 일반 줄을 교체합니다.", { options: options.map((option) => `${(0, ctx.deps._t)((0, ctx.deps.getStatName)(option.statId))} ${(0, ctx.deps.formatSignedValue)(option.statId, option.min)}~${(0, ctx.deps.formatValue)(option.statId, option.max)}`).join(" / ") })
    ];
  }
  function sealGuide(ctx) {
    return [
      (0, ctx.deps._t)("봉인되지 않은 첫 옵션을 영구 보호합니다. 봉인은 되돌릴 수 없습니다."),
      "줄을 직접 지정하는 방식은 아닙니다. 이후 제작에서 해당 줄은 바뀌지 않습니다."
    ];
  }
  function guideHtml(ctx, recipe, count) {
    const effect = count > 1 ? { ...recipe.effect, amount: recipe.effect.amount * count } : recipe.effect;
    const [summary, detail] = ctx.state.EFFECT_GUIDES[effect.type](effect, (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)());
    return `<div class="fishing-effect"><p>${esc(ctx, (0, ctx.deps._t)(summary))}</p><details><summary>${(0, ctx.deps._t)("자세히")}</summary><p class="fishing-effect-note">${esc(ctx, (0, ctx.deps._t)(detail))}</p></details></div>`;
  }
  function categoryHtml(ctx, recipe) {
    const category = categoryOf(ctx, recipe);
    if (!category) return "";
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)();
    return `<label class="fishing-category-label">${(0, ctx.deps._t)("원하는 옵션 계열")}<select class="fishing-category" aria-label="${(0, ctx.deps._t)("옵션 계열")}" onchange="fishingUi.pick('${recipe.id}', this.value)">` + ctx.state.CATEGORY_OPTIONS.map((cat) => {
      const reason = item ? (0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, cat) : "";
      return `<option value="${cat}"${cat === category ? " selected" : ""}>${esc(ctx, (0, ctx.deps._t)(cat))}${reason ? (0, ctx.deps._t)(" (불가: {reason})", { reason: esc(ctx, (0, ctx.deps._t)(reason)) }) : ""}</option>`;
    }).join("") + "</select></label>";
  }
  function recipeHtml(ctx, recipe, st) {
    const count = selectedCount(ctx, recipe), status = (0, ctx.deps.getSeaGiftRecipeStatus)(recipe.id, null, categoryOf(ctx, recipe), count);
    const needsItem = recipe.group === "equipment";
    return `<article data-sea-recipe="${recipe.id}" class="fishing-recipe${status.ready ? " is-ready" : ""}"><header><h4>${esc(ctx, (0, ctx.deps._t)(recipe.title))}</h4></header>${guideHtml(ctx, recipe, count)}${categoryHtml(ctx, recipe)}${needsItem ? targetHtml(ctx, recipe) : quantityHtml(ctx, status)}<section class="fishing-materials"><h4>${(0, ctx.deps._t)("재료 (보유 / 필요)")}</h4>${costHtml(ctx, recipe, st, count)}</section><div class="fishing-craft-action">${status.reason ? `<p class="is-blocked">${esc(ctx, (0, ctx.deps._t)(status.reason))}</p>` : ""}<button type="button" data-sea-craft onclick="fishingUi.craft('${recipe.id}')"${status.ready ? "" : " disabled"}>${needsItem ? (0, ctx.deps._t)("가공하기") : (0, ctx.deps._t)("{count}회 제작", { count })}</button></div><div class="fishing-result" role="status" aria-live="polite">${resultHtml(ctx, recipe, status.item)}</div></article>`;
  }
  function recipeListHtml(ctx, recipes, recipe) {
    return `<nav class="fishing-recipe-list" aria-label="${(0, ctx.deps._t)("제작법")}">${recipes.map((row) => {
      const status = statusOf(ctx, row);
      return `<button type="button" data-recipe-choice="${row.id}" class="${row.id === recipe.id ? "is-selected" : ""}" aria-pressed="${row.id === recipe.id}" onclick="fishingUi.choose('${row.id}')"><strong>${esc(ctx, (0, ctx.deps._t)(row.title))}</strong><small>${status.materialReady ? (0, ctx.deps._t)("재료 충분") : (0, ctx.deps._t)("재료 부족")}</small></button>`;
    }).join("")}</nav>`;
  }
  function giftsHtml(ctx, st) {
    const group = ctx.deps.document.getElementById("fishing-workshop").dataset.recipeGroup;
    const recipes = ctx.deps.SEA_GIFT_RECIPES.filter((recipe2) => groupOf(ctx, recipe2) === group);
    const recipe = recipes.find((row) => row.id === ctx.state.selectedRecipes[group]) || recipes[0];
    ctx.state.selectedRecipes[group] = recipe.id;
    return `<div class="fishing-workshop-toolbar"><span>${esc(ctx, (0, ctx.deps._t)(ctx.state.GROUPS[group]))}</span><button type="button" onclick="switchMapSubtab('map-tab-ocean')">${(0, ctx.deps._t)("재료 모으기")}</button></div><div class="fishing-workshop-layout">${recipeListHtml(ctx, recipes, recipe)}${recipeHtml(ctx, recipe, st)}</div>`;
  }
  function resultHtml(ctx, recipe, item) {
    if (!resultIsCurrent(ctx, recipe, item)) return "";
    if (!ctx.state.lastResult.ok) return "<strong>제작하지 못했습니다</strong><p>현재 장비에 이 제작법을 적용할 수 없습니다. 물고기는 소모되지 않았습니다.</p>";
    const spent = Object.entries(recipe.requires).map(([key, count]) => (0, ctx.deps._t)("{name} {value}마리", { name: ctx.deps.OCEAN_FISH_DB[key].name, value: count * ctx.state.lastResult.count })).join(", ");
    if (!item) return currencyResultHtml(ctx, recipe) + `<small>${(0, ctx.deps._t)("사용한 재료: {spent}", { spent: esc(ctx, spent) })}</small>`;
    const unchanged = JSON.stringify(ctx.state.lastResult.before) === JSON.stringify(ctx.state.lastResult.after);
    return `<strong>${(0, ctx.deps._t)("제작 완료: {name}", { name: esc(ctx, (0, ctx.deps._t)(ctx.state.lastResult.name)) })}</strong><p>${unchanged ? (0, ctx.deps._t)("옵션이 그대로 유지되었습니다. 물고기는 소모되었습니다.") : (0, ctx.deps._t)("바뀐 부분만 모았습니다.")}</p>` + changedLinesHtml(ctx, ctx.state.lastResult.before, ctx.state.lastResult.after) + `<small>${(0, ctx.deps._t)("사용한 재료: {spent}", { spent: esc(ctx, spent) })}</small>`;
  }
  function changedLinesHtml(ctx, before, after) {
    const added = [...after.lines], removed = [], kept = [];
    before.lines.forEach((line) => {
      const index = added.indexOf(line);
      if (index < 0) removed.push(line);
      else {
        kept.push(line);
        added.splice(index, 1);
      }
    });
    const rarity = before.rarity === after.rarity ? "" : `<p class="fishing-rarity-change">${(0, ctx.deps._t)("장비 등급: {rarity} → {rarity2}", { rarity: esc(ctx, before.rarity), rarity2: esc(ctx, after.rarity) })}</p>`;
    const changes = removed.length || added.length ? `<div class="fishing-result-compare"><section class="is-before"><h4>${(0, ctx.deps._t)("제작 전 (바뀐 줄)")}</h4>${linesHtml(ctx, removed, "기존 줄 교체 없음")}</section><section class="is-after"><h4>${(0, ctx.deps._t)("제작 후 (새 결과)")}</h4>${linesHtml(ctx, added, "해당 옵션 제거됨")}</section></div>` : "";
    return rarity + changes + (kept.length ? `<details class="fishing-kept"><summary>${(0, ctx.deps._t)("그대로 유지된 옵션 {length}줄", { length: kept.length })}</summary>${linesHtml(ctx, kept)}</details>` : "");
  }
  function currencyResultHtml(ctx, recipe) {
    const gains = ctx.state.lastResult.gains.map((row) => (0, ctx.deps._t)("{name} +{amount}, 현재 보유 {currencies}", { name: (0, ctx.deps.getCurrencyInfo)(row.key).name, amount: row.amount, currencies: ctx.deps.game.currencies[row.key] || 0 }));
    let action = "";
    if (recipe.effect.type === "currency") {
      const reef = recipe.effect.key === "reefFragment";
      const canOpen = reef || ctx.deps.contentProgression.canOpen("item-tab-craft");
      action = canOpen ? `<button type="button" class="fishing-result-next" onclick="fishingUi.openRewardUse('${recipe.effect.key}')">${reef ? (0, ctx.deps._t)("채집 전략에서 암초 설치하기") : (0, ctx.deps._t)("제작실에서 심해의 파편 보기")}</button>` : "<p>장비 제작실을 해금하면 심해의 파편을 사용할 수 있습니다.</p>";
    }
    return `<strong>${(0, ctx.deps._t)("제작 완료: {count}회", { count: ctx.state.lastResult.count })}</strong>${linesHtml(ctx, gains)}${action}`;
  }
  function craft(ctx, recipeId) {
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find((row) => row.id === recipeId);
    if (!recipe) return;
    const count = selectedCount(ctx, recipe), status = (0, ctx.deps.getSeaGiftRecipeStatus)(recipeId, null, categoryOf(ctx, recipe), count);
    if (!status.ready) {
      render(ctx);
      return;
    }
    const keys = recipe.effect.type === "currency" ? [recipe.effect.key] : ctx.deps.SEA_GIFT_RANDOM_ORB_KEYS;
    const balances = Object.fromEntries(keys.map((key) => [key, ctx.deps.game.currencies[key] || 0]));
    const before = itemSnapshot(ctx, status.item);
    const ok = (0, ctx.deps.craftSeaGift)(recipeId, null, { category: categoryOf(ctx, recipe), count });
    if (ok) (0, ctx.deps.playUiFeedbackSound)("craftSuccess");
    if (ctx.state.batchChoice) ctx.state.batchChoice.count = Math.max(1, Math.min(ctx.state.batchChoice.count, (0, ctx.deps.getSeaGiftRecipeStatus)(recipeId, null, categoryOf(ctx, recipe), 1).maxCrafts || 1));
    ctx.state.lastResult = {
      recipeId,
      count,
      owner: ctx.deps.game,
      target: status.item,
      ok,
      before,
      after: itemSnapshot(ctx, status.item),
      name: status.item && status.item.name,
      gains: keys.filter((key) => ctx.deps.game.currencies[key] > balances[key]).map((key) => ({ key, amount: ctx.deps.game.currencies[key] - balances[key] }))
    };
    render(ctx);
    ctx.deps.document.querySelector("#ui-sea-gift-panel .fishing-result").scrollIntoView({ block: "nearest" });
  }
  function pick(ctx, recipeId, category) {
    if (ctx.state.CATEGORY_OPTIONS.includes(category)) ctx.state.chosen[recipeId] = category;
    ctx.state.lastResult = null;
    render(ctx);
  }
  function choose(ctx, recipeId) {
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find((row) => row.id === recipeId);
    if (!recipe) return;
    ctx.state.selectedRecipes[groupOf(ctx, recipe)] = recipeId;
    if (ctx.state.lastResult?.recipeId !== recipeId) ctx.state.lastResult = null;
    selectGroup(ctx, groupOf(ctx, recipe), false);
    ctx.deps.document.querySelector("#ui-sea-gift-panel .fishing-recipe").scrollIntoView({ block: "start" });
  }
  function selectGroup(ctx, group, clearResult = true) {
    if (!Object.hasOwn(ctx.state.GROUPS, group)) return;
    ctx.state.batchChoice = null;
    ctx.deps.document.getElementById("fishing-workshop").dataset.recipeGroup = group;
    for (const button of ctx.deps.document.querySelectorAll("[data-sea-group]")) button.setAttribute("aria-pressed", String(button.dataset.seaGroup === group));
    if (clearResult) ctx.state.lastResult = null;
    render(ctx);
    if (clearResult) ctx.deps.document.getElementById("fishing-workshop").scrollIntoView({ block: "start" });
  }
  function openRewardUse(ctx, key) {
    if (key === "reefFragment") {
      (0, ctx.deps.switchMapSubtab)("map-tab-fishing");
      ctx.deps.document.getElementById("fishing-gather-tab").click();
      ctx.deps.document.querySelector(".fishing-reef").scrollIntoView({ block: "center" });
      ctx.deps.document.querySelector(".fishing-reef button").focus({ preventScroll: true });
      return;
    }
    if (key !== "oceanRerollShard" || !ctx.deps.contentProgression.canOpen("item-tab-craft")) return;
    (0, ctx.deps.switchTab)("tab-items");
    if (ctx.deps.document.body.classList.contains("desktop-windowed-ui")) (0, ctx.deps.openWindow)("tab-items");
    (0, ctx.deps.switchItemSubtab)("item-tab-craft");
    ctx.deps.craftingWorkspaceUi.openInventory(key, true);
  }
  function pickTarget(ctx, kind) {
    ctx.deps.window.openCraftItemPickerOverlay(kind);
    ctx.deps.document.getElementById("craft-picker-title").textContent = (0, ctx.deps._t)("심해 제작에 쓸 장비 선택");
    ctx.deps.document.querySelector("#craft-item-picker-overlay .craft-picker-desc").textContent = (0, ctx.deps._t)("장비를 골라도 재료는 쓰지 않습니다.");
  }
  function openWorkshop(ctx) {
    (0, ctx.deps.switchMapSubtab)("map-tab-fishing");
    ctx.deps.document.getElementById("fishing-workshop-tab").click();
    ctx.deps.document.getElementById("fishing-workshop").scrollIntoView({ block: "start" });
  }
  function lockedHtml(ctx) {
    return `<div class="fishing-head"><div><h3>${(0, ctx.deps._t)("낚시")}</h3><p>${(0, ctx.deps._t)("루프 {OCEAN_UNLOCK_LOOP} 이후 심해가 해금되면 낚을 수 있습니다.", { OCEAN_UNLOCK_LOOP: ctx.deps.OCEAN_UNLOCK_LOOP })}</p></div><div class="fishing-last"><span class="fishing-fish is-empty"></span><div><small>${(0, ctx.deps._t)("잠김")}</small><strong>${(0, ctx.deps._t)("봉인됨")}</strong></div></div></div>`;
  }
  function syncWorkshopControls(ctx, gifts) {
    const category = gifts.querySelector(".fishing-category"), recipeId = gifts.querySelector("[data-sea-recipe]")?.dataset.seaRecipe;
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find((row) => row.id === recipeId);
    if (!recipe) return;
    if (category) category.value = categoryOf(ctx, recipe);
    const quantity = gifts.querySelector(".fishing-quantity select");
    if (quantity) quantity.value = selectedCount(ctx, recipe);
  }
  function render(ctx) {
    const panel = ctx.deps.document.getElementById("ui-fishing-panel"), gifts = ctx.deps.document.getElementById("ui-sea-gift-panel");
    if (!panel) return;
    const st = (0, ctx.deps.ensureOceanState)();
    if (!st.unlocked) {
      (0, ctx.deps.updateGamePanelMarkup)(panel, lockedHtml(ctx));
      if (gifts) (0, ctx.deps.updateGamePanelMarkup)(gifts, "");
      return;
    }
    (0, ctx.deps.updateGamePanelMarkup)(panel, gatherHtml(ctx, st));
    renderCollection(ctx, st, (0, ctx.deps.getOceanFishCollectionProgress)(st));
    if (!gifts) return;
    (0, ctx.deps.updateGamePanelMarkup)(gifts, giftsHtml(ctx, st));
    syncWorkshopControls(ctx, gifts);
  }
  function esc(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value ?? ""));
  }
  function clamp(ctx, value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }
  function bar(ctx, have, need) {
    return `<i class="fishing-bar"><i style="width:${clamp(ctx, need > 0 ? have / need * 100 : 0).toFixed(1)}%"></i></i>`;
  }
  function signed(ctx, value) {
    return `${value >= 0 ? "+" : ""}${value}%`;
  }
  function fishIcon(ctx, key, known = true) {
    return `<span class="fishing-fish is-${(ctx.deps.OCEAN_FISH_DB[key] || {}).rarity || "common"}${known ? "" : " is-unknown"}">${(0, ctx.deps.renderPixelIcon)("fish", "fishing-fish-icon")}</span>`;
  }
  function statusOf(ctx, recipe) {
    return (0, ctx.deps.getSeaGiftRecipeStatus)(recipe.id, null, categoryOf(ctx, recipe));
  }
  function linesHtml(ctx, lines, empty = "추가 옵션 없음") {
    return `<ul class="fishing-lines">${lines.length ? lines.map((line) => `<li>${esc(ctx, line)}</li>`).join("") : `<li>${esc(ctx, (0, ctx.deps._t)(empty))}</li>`}</ul>`;
  }
  function resultIsCurrent(ctx, recipe, item) {
    return ctx.state.lastResult && ctx.state.lastResult.owner === ctx.deps.game && ctx.state.lastResult.recipeId === recipe.id && ctx.state.lastResult.target === item && (!item || JSON.stringify(ctx.state.lastResult.after) === JSON.stringify(itemSnapshot(ctx, item)));
  }
  function itemSnapshot(ctx, item) {
    return item && { rarity: (0, ctx.deps._t)(ctx.deps.ITEM_RARITY_LABELS[item.rarity]), lines: item.stats.map(ctx.handlers.lineText) };
  }

  // modules/ui/fishing-view.mjs
  function createFishingView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { lineText, benchGuide, sealGuide, currencyGuide, render, craft, pick, choose, selectGroup, setCount, openRewardUse, pickTarget, openWorkshop };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ render: ctx.handlers.render, craft: ctx.handlers.craft, pick: ctx.handlers.pick, choose: ctx.handlers.choose, selectGroup: ctx.handlers.selectGroup, setCount: ctx.handlers.setCount, openRewardUse: ctx.handlers.openRewardUse, pickTarget: ctx.handlers.pickTarget, openWorkshop: ctx.handlers.openWorkshop });
    return ctx.api;
  }
  function initialize(ctx) {
    ctx.state.CATEGORY_OPTIONS = Object.freeze(["공격", "방어/생명", "속도/치명", "저항"]);
    ctx.state.VALUE_EFFECTS = /* @__PURE__ */ new Set(["safeReroll", "tierStepUp"]);
    ctx.state.GROUPS = Object.freeze({ supply: "재화 제작", equipment: "장비 가공" });
    ctx.state.chosen = {};
    ctx.state.selectedRecipes = {};
    ctx.state.lastResult = null;
    ctx.state.batchChoice = null;
    ctx.state.EFFECT_GUIDES = Object.freeze({
      safeReroll: () => ["무작위 1줄의 수치를 다듬습니다. 낮게 나오면 기존 값을 유지합니다.", "같은 등급 안에서 굴립니다. 부수치까지 하나라도 낮으면 줄 전체를 유지하며, 물고기는 소모됩니다."],
      tierStepUp: () => ["무작위 1줄의 등급을 1단계 올립니다.", "최고 등급 줄과 봉인된 줄은 제외합니다. 옵션 종류는 그대로이고 수치만 새 등급 범위에서 굴립니다."],
      convertCategoryMod: () => ["무작위 1줄을 선택한 계열로 교체합니다. 기존 옵션은 사라집니다.", "봉인된 줄은 제외합니다. 바꿀 줄이나 새 옵션의 정확한 종류를 지정할 수 없습니다."],
      echoMod: () => ["가장 높은 등급의 옵션을 절반 효과로 복사해 다른 1줄을 덮어씁니다.", "원본은 유지합니다. 봉인과 접두·접미 제한을 지키며, 메아리 줄이 있으면 다시 복사할 수 없습니다."],
      fixedBenchOption: ctx.handlers.benchGuide,
      lockMod: ctx.handlers.sealGuide,
      currency: ctx.handlers.currencyGuide,
      randomCurrency: ctx.handlers.currencyGuide
    });
  }

  // modules/ui/ocean-dive-panel.mjs
  function currencyIcon(ctx, key) {
    const src = ctx.deps.ORB_DB[key] && ctx.deps.ORB_DB[key].icon;
    if (src) return `<img src="${src}" alt="" aria-hidden="true">`;
    return ctx.state.GLYPHS[key] ? (0, ctx.deps.renderPixelIcon)(ctx.state.GLYPHS[key], `dive-glyph is-${ctx.state.GLYPHS[key]}`) : "";
  }
  function drainPerSec(ctx, st) {
    return (0, ctx.deps.getOceanOxygenDrainPerSec)() * Math.max(0.1, Number((0, ctx.deps.getOceanFishingStrategyDef)(st).oxygenDrainMul) || 1);
  }
  function actionsHtml(ctx, st) {
    const workshop = `<button type="button" onclick="fishingUi.openWorkshop()">${(0, ctx.deps._t)("심해 제작")}</button>`;
    if (!st.diving) return `<button type="button" class="dive-go" data-exploration-departure onclick="oceanDiveUi.startDive()">${(0, ctx.deps._t)("잠수 시작")}<small>${(0, ctx.deps._t)("{checkpointM}m부터", { checkpointM: st.checkpointM })}</small></button>${shallowHtml(ctx, st)}${autoHtml(ctx, st)}${workshop}`;
    const back = ctx.deps.game.currentZoneId === ctx.deps.OCEAN_ZONE_ID ? "" : `<button type="button" class="dive-go" data-exploration-departure onclick="changeZone(OCEAN_ZONE_ID)">${(0, ctx.deps._t)("심해로 돌아가기")}</button>`;
    return `${back}<button type="button"${back ? "" : surfaceGuard(ctx, st)} onclick="oceanDiveUi.surfaceDive()">${(0, ctx.deps._t)("수면으로 복귀")}</button>${autoHtml(ctx, st)}${workshop}`;
  }
  function surfaceGuard(ctx, st) {
    return (0, ctx.deps._t)(' data-exploration-departure data-departure-title="수면으로 올라갈까요?" data-departure-message="{checkpointM}m 체크포인트 뒤의 진행은 사라집니다. 이미 얻은 물고기와 재화는 유지됩니다."', { checkpointM: st.checkpointM }) + ' data-departure-confirm="올라가기" data-departure-cancel="계속 잠수"';
  }
  function shallowHtml(ctx, st) {
    const lift = (0, ctx.deps.getOceanShallowLiftM)(st);
    return lift === null ? "" : `<button type="button" class="dive-go" data-exploration-departure onclick="oceanDiveUi.startDive(true)">${(0, ctx.deps._t)("얕게 잠수")}<small>${(0, ctx.deps._t)("{lift}m부터", { lift })}</small></button>`;
  }
  function autoHtml(ctx, st) {
    const on = ctx.deps.game.settings.autoRediveOcean === true, stopped = on && (0, ctx.deps.isOceanAutoRediveHalted)(st);
    return `<button type="button" class="dive-auto${stopped ? " is-stopped" : ""}" aria-pressed="${on}" onclick="oceanDiveUi.toggleAutoRedive()">${(0, ctx.deps._t)("자동 재잠수")}<small>${stopped ? (0, ctx.deps._t)("멈춤") : on ? (0, ctx.deps._t)("켜짐") : (0, ctx.deps._t)("꺼짐")}</small></button>`;
  }
  function headHtml(ctx, st) {
    const actions = actionsHtml(ctx, st), four = (actions.match(/<button/g) || []).length >= 4;
    return `<div class="dive-head${four ? " has-four" : ""}"><span class="dive-emblem">${(0, ctx.deps.renderPixelIcon)("drop", "dive-emblem-icon")}</span><div class="dive-title"><h3>${(0, ctx.deps._t)("심해 잠수")}</h3>${(0, ctx.deps.buildMapPowerEstimateHtml)((0, ctx.deps.getZone)(ctx.deps.OCEAN_ZONE_ID))}</div><div class="dive-actions">${actions}</div></div>`;
  }
  function depthHtml(ctx, st) {
    const interval = (0, ctx.deps.getOceanBossBoundaryInterval)(), depth = Math.floor(st.depthM || 0);
    const guard = (Math.floor(Math.max(0, st.bossClearM || 0) / interval) + 1) * interval, start = guard - interval;
    const at = (value) => share(ctx, value - start, interval).toFixed(1);
    const nums = [["depth", "현재 수심", `${depth}m`], ["check", "체크포인트", `${st.checkpointM}m`], ["guard", "가디언까지", `${Math.max(0, guard - depth)}m`]].map(([key, label, value]) => `<span class="is-${key}"><small>${label}</small><b>${value}</b></span>`).join("");
    return `<div class="dive-depth"><div class="dive-depth-nums">${nums}</div><div class="dive-depth-bar" aria-hidden="true" style="--lifts:${Math.max(1, Math.round(interval / 100))}"><i style="width:${at(depth)}%"></i><em style="left:${at(st.checkpointM)}%"></em></div><div class="dive-depth-ends"><span>${start}m</span><span>${(0, ctx.deps._t)("{guard}m 가디언", { guard })}</span></div></div>`;
  }
  function oxygenHtml(ctx, st) {
    const left = share(ctx, st.oxygenCur, st.oxygenMax), drain = drainPerSec(ctx, st), secs = drain > 0 ? Math.floor(st.oxygenCur / drain) : 0;
    return `<div class="dive-oxygen${left <= 20 ? " is-low" : ""}"><div><span>${(0, ctx.deps._t)("산소")}</span><b>${Math.round(left)}%</b><small>${(0, ctx.deps._t)("{ceil} / {oxygenMax}, 약 {secs}초 남음", { ceil: Math.ceil(st.oxygenCur), oxygenMax: st.oxygenMax, secs })}</small></div><div class="dive-oxygen-bar" role="meter" aria-label="${(0, ctx.deps._t)("남은 산소")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(left)}"><i style="width:${left.toFixed(1)}%"></i></div></div>`;
  }
  function chipsHtml(ctx, st) {
    const currents = ((0, ctx.deps.getZone)(ctx.deps.OCEAN_ZONE_ID).currents || []).map((current) => `<span><b>${esc2(ctx, (0, ctx.deps._t)(current.name))}</b>${ctx.deps.statToneText.html((0, ctx.deps._t)(current.desc))}</span>`).join("");
    return `<div class="dive-chips"><span class="is-pressure"><b>${(0, ctx.deps._t)("수압")}</b>${(0, ctx.deps._t)("{depthM}단계", { depthM: (0, ctx.deps.getOceanDepthTier)(st.depthM) })}</span>${currents}</div>`;
  }
  function costHtml2(ctx, cost) {
    return Object.keys(cost).filter((key) => cost[key] > 0).map((key) => {
      const owned = Math.max(0, Math.floor(ctx.deps.game.currencies[key] || 0));
      return `<span class="${owned < cost[key] ? "is-short" : "is-ready"}">${currencyIcon(ctx, key)}${esc2(ctx, (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name))}<b>${owned}/${cost[key]}</b></span>`;
    }).join("");
  }
  function upgradeHtml(ctx, key) {
    const def = ctx.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key], level = (0, ctx.deps.getOceanPermanentUpgradeLevel)(key), cost = (0, ctx.deps.getOceanPermanentUpgradeCost)(key);
    const now = (0, ctx.deps.getOceanPermanentUpgradeEffect)(key), next = cost ? `<span class="is-next">${(0, ctx.deps._t)("다음")} <b>+${now + def.valuePerLevel}${def.unit}</b></span>` : "";
    const button = cost ? `<button type="button" onclick="oceanDiveUi.buyDiveUpgrade('${key}')"${(0, ctx.deps.canPayOceanUpgradeCost)(cost) ? "" : " disabled"}>${(0, ctx.deps._t)("강화")}</button>` : '<button type="button" disabled>최대</button>';
    return `<div class="dive-upgrade${cost ? "" : " is-max"}"><header><strong>${esc2(ctx, (0, ctx.deps._t)(def.label))}</strong><b>Lv.${level}/${def.maxLevel}</b></header><span class="dive-upgrade-bar"><i style="width:${share(ctx, level, def.maxLevel).toFixed(1)}%"></i></span><p><span>${(0, ctx.deps._t)("지금")} <b>+${now}${def.unit}</b></span>${next}</p>${cost ? `<div class="dive-costs">${costHtml2(ctx, cost)}</div>` : ""}${button}</div>`;
  }
  function rulesHtml(ctx, st) {
    const rows = [
      ["descent", "하강", (0, ctx.deps._t)("몬스터를 쓰러뜨린 만큼 내려갑니다. 정예는 {eliteKillMul}배입니다.", { eliteKillMul: ctx.deps.OCEAN_COMBAT_DIVE.eliteKillMul })],
      ["check", "체크포인트", "100m마다 열리고, 다음 잠수는 여기서 시작합니다. 가디언 앞에 멈췄으면 얕게 잠수로 지난 가디언 자리부터 내려갈 수 있습니다."],
      ["guard", "가디언", (0, ctx.deps._t)("{value}m마다 길을 막고, 닿으면 남은 무리를 두고 바로 가디언 방으로 갑니다. 쓰러뜨려야 더 내려가고, 가디언에게 쓰러지면 잠수가 끝납니다.", { value: (0, ctx.deps.getOceanBossBoundaryInterval)() })],
      ["oxygen", "산소", (0, ctx.deps._t)("초당 {st} 줄어들고, 철갑 패각충과 정예, 가디언이 부른 졸개를 쓰러뜨리면 공기 방울로 찹니다. 다 떨어지면 익사 피해를 받다가 수면으로 올라와 잠수를 시작한 사냥터로 돌아오고, 체크포인트 뒤 진행은 사라집니다.", { st: drainPerSec(ctx, st).toFixed(2) })],
      ["pressure", "수압", "100m마다 1단계 오릅니다. 공격 속도, 피해, 이동 속도가 줄고 산소가 더 빨리 줄어듭니다."],
      ["auto", "자동 재잠수", (0, ctx.deps._t)("켜 두면 산소가 떨어지거나 가디언에게 쓰러져 떠오른 뒤, 사냥터 하나를 깨고 다시 잠수합니다. 가디언 앞에 막혔으면 지난 가디언 자리부터 내려가 물고기를 모읍니다. 무리에게 쓰러지거나, 리프트도 가디언 처치도 물고기도 없이 {missLimit}번 떠오르면 멈춥니다. 새 루프의 첫 잠수와 자리를 비운 동안의 정산에서는 다시 잠수하지 않습니다.", { missLimit: ctx.deps.OCEAN_AUTO_REDIVE.missLimit })]
    ];
    return `<details class="dive-rules"><summary>${(0, ctx.deps._t)("잠수 규칙")}</summary><ul>${rows.map(([key, label, text]) => `<li class="is-${key}"><b>${label}</b>${text}</li>`).join("")}</ul></details>`;
  }
  function render2(ctx) {
    const panel = ctx.deps.document.getElementById("ui-ocean-panel");
    if (!panel) return;
    const st = (0, ctx.deps.ensureOceanState)();
    if (!st.unlocked) {
      (0, ctx.deps.updateGamePanelMarkup)(panel, `<div class="dive-head"><span class="dive-emblem">${(0, ctx.deps.renderPixelIcon)("drop", "dive-emblem-icon")}</span><div class="dive-title"><h3>${(0, ctx.deps._t)("심해 잠수")}</h3><small>${(0, ctx.deps._t)("루프 {OCEAN_UNLOCK_LOOP}부터", { OCEAN_UNLOCK_LOOP: ctx.deps.OCEAN_UNLOCK_LOOP })}</small></div></div>`);
      return;
    }
    (0, ctx.deps.updateGamePanelMarkup)(panel, `${headHtml(ctx, st)}${depthHtml(ctx, st)}${oxygenHtml(ctx, st)}${chipsHtml(ctx, st)}<section class="dive-upgrades"><header><strong>${(0, ctx.deps._t)("잠수 장비 강화")}</strong><small>${(0, ctx.deps._t)("영구 유지")}</small></header><div class="dive-upgrade-grid" style="--dive-upgrade-count:${ctx.deps.OCEAN_PERMANENT_UPGRADE_KEYS.length}">${ctx.deps.OCEAN_PERMANENT_UPGRADE_KEYS.map(ctx.handlers.upgradeHtml).join("")}</div></section>${rulesHtml(ctx, st)}`);
  }
  function startDive(ctx, shallow) {
    if (!(0, ctx.deps.enterOceanDive)({ shallow: shallow === true })) return;
    (0, ctx.deps.changeZone)(ctx.deps.OCEAN_ZONE_ID);
    (0, ctx.deps.updateStaticUI)();
  }
  function surfaceDive(ctx) {
    const inOcean = ctx.deps.game.currentZoneId === ctx.deps.OCEAN_ZONE_ID, back = (0, ctx.deps.forceSurfaceOcean)("manual");
    if (inOcean) (0, ctx.deps.changeZone)(back);
    (0, ctx.deps.updateStaticUI)();
  }
  function toggleAutoRedive(ctx) {
    const on = ctx.deps.game.settings.autoRediveOcean !== true;
    (0, ctx.deps.setOceanAutoRedive)(on);
    (0, ctx.deps.addLog)(`🌊 ${(0, ctx.deps._t)("심해 자동 재잠수")} ${(0, ctx.deps._t)(on ? "켜짐" : "꺼짐")}`, "season-up");
    (0, ctx.deps.queueImportantSave)(200);
    render2(ctx);
  }
  function buyDiveUpgrade(ctx, key) {
    (0, ctx.deps.upgradeOceanPermanent)(key);
    render2(ctx);
    ctx.deps.fishingUi.render();
  }
  function esc2(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value ?? ""));
  }
  function share(ctx, value, max) {
    return Math.max(0, Math.min(100, (Number(value) || 0) / Math.max(1, Number(max) || 1) * 100));
  }

  // modules/ui/ocean-dive-view.mjs
  function createOceanDiveView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { upgradeHtml, render: render2, startDive, surfaceDive, toggleAutoRedive, buyDiveUpgrade };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize2(ctx);
    ctx.api = Object.freeze({ render: ctx.handlers.render, startDive: ctx.handlers.startDive, surfaceDive: ctx.handlers.surfaceDive, toggleAutoRedive: ctx.handlers.toggleAutoRedive, buyDiveUpgrade: ctx.handlers.buyDiveUpgrade });
    return ctx.api;
  }
  function initialize2(ctx) {
    ctx.state.GLYPHS = Object.freeze({ skyEssence: "cloud", oceanRerollShard: "shard", reefFragment: "coral", bossCore: "gem" });
  }

  // modules/ui/ocean-views.mjs
  function createOceanViews(deps) {
    const fishing = createFishingView(deps);
    const dive = createOceanDiveView(Object.create(deps, { fishingUi: { value: fishing } }));
    return { fishing, dive };
  }

  // modules/fishing-ui-classic.mjs
  var views = createOceanViews({
    get _t() {
      return _t;
    },
    get OCEAN_FISHING_STRATEGIES() {
      return OCEAN_FISHING_STRATEGIES;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get OCEAN_FISH_DB() {
      return OCEAN_FISH_DB;
    },
    get OCEAN_FISH_RARITY_META() {
      return OCEAN_FISH_RARITY_META;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get document() {
      return document;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get updateGamePanelMarkup() {
      return updateGamePanelMarkup;
    },
    get getSelectedSeaGiftEquipmentTarget() {
      return getSelectedSeaGiftEquipmentTarget;
    },
    get getSeaGiftEffectBlockReason() {
      return getSeaGiftEffectBlockReason;
    },
    get SEA_GIFT_ITEM_EFFECT_TYPES() {
      return SEA_GIFT_ITEM_EFFECT_TYPES;
    },
    get SEA_GIFT_RECIPES() {
      return SEA_GIFT_RECIPES;
    },
    get getSeaGiftRecipeStatus() {
      return getSeaGiftRecipeStatus;
    },
    get getStatName() {
      return getStatName;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get getSeaGiftTargetBlockReason() {
      return getSeaGiftTargetBlockReason;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getSeaGiftTierStepRows() {
      return getSeaGiftTierStepRows;
    },
    get getSeaGiftRerollRows() {
      return getSeaGiftRerollRows;
    },
    get getSeaGiftEditableIndexes() {
      return getSeaGiftEditableIndexes;
    },
    get getAvailableMods() {
      return getAvailableMods;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getModCategory() {
      return getModCategory;
    },
    get getSeaGiftEchoTargets() {
      return getSeaGiftEchoTargets;
    },
    get getSeaGiftBenchSlot() {
      return getSeaGiftBenchSlot;
    },
    get SEA_GIFT_RANDOM_ORB_KEYS() {
      return SEA_GIFT_RANDOM_ORB_KEYS;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get OCEAN_WORKBENCH_OPTIONS() {
      return OCEAN_WORKBENCH_OPTIONS;
    },
    get formatValue() {
      return formatValue;
    },
    get contentProgression() {
      return contentProgression;
    },
    get craftSeaGift() {
      return craftSeaGift;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get switchTab() {
      return switchTab;
    },
    get openWindow() {
      return openWindow;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get craftingWorkspaceUi() {
      return craftingWorkspaceUi;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get window() {
      return window;
    },
    get OCEAN_UNLOCK_LOOP() {
      return OCEAN_UNLOCK_LOOP;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get getOceanFishCollectionProgress() {
      return getOceanFishCollectionProgress;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get getOceanOxygenDrainPerSec() {
      return getOceanOxygenDrainPerSec;
    },
    get getOceanFishingStrategyDef() {
      return getOceanFishingStrategyDef;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get getOceanShallowLiftM() {
      return getOceanShallowLiftM;
    },
    get isOceanAutoRediveHalted() {
      return isOceanAutoRediveHalted;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get getZone() {
      return getZone;
    },
    get getOceanBossBoundaryInterval() {
      return getOceanBossBoundaryInterval;
    },
    get getOceanDepthTier() {
      return getOceanDepthTier;
    },
    get statToneText() {
      return statToneText;
    },
    get OCEAN_PERMANENT_UPGRADE_DEFS() {
      return OCEAN_PERMANENT_UPGRADE_DEFS;
    },
    get getOceanPermanentUpgradeLevel() {
      return getOceanPermanentUpgradeLevel;
    },
    get getOceanPermanentUpgradeCost() {
      return getOceanPermanentUpgradeCost;
    },
    get getOceanPermanentUpgradeEffect() {
      return getOceanPermanentUpgradeEffect;
    },
    get canPayOceanUpgradeCost() {
      return canPayOceanUpgradeCost;
    },
    get OCEAN_COMBAT_DIVE() {
      return OCEAN_COMBAT_DIVE;
    },
    get OCEAN_AUTO_REDIVE() {
      return OCEAN_AUTO_REDIVE;
    },
    get OCEAN_PERMANENT_UPGRADE_KEYS() {
      return OCEAN_PERMANENT_UPGRADE_KEYS;
    },
    get enterOceanDive() {
      return enterOceanDive;
    },
    get changeZone() {
      return changeZone;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get forceSurfaceOcean() {
      return forceSurfaceOcean;
    },
    get setOceanAutoRedive() {
      return setOceanAutoRedive;
    },
    get addLog() {
      return addLog;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get upgradeOceanPermanent() {
      return upgradeOceanPermanent;
    }
  });
  var fishingUi = views.fishing;
  var oceanDiveUi = views.dive;
  safeExposeGlobals({ fishingUi, oceanDiveUi });
})();
