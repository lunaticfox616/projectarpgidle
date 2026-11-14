export function meterHtml(ctx, label, value, cls) {
    return `<div class="fishing-meter ${cls}"><span>${label}</span><b>${Math.floor(clamp(ctx, value))}%</b>${bar(ctx, clamp(ctx, value), 100)}</div>`;
}

export function strategyEffects(ctx, def) {
    const gauge = Math.round((def.gaugeGainMul - 1) * 100), rare = Math.round((def.rareWeightMul - 1) * 100), oxygen = Math.round((def.oxygenDrainMul - 1) * 100);
    const chips = [];
    if (gauge) chips.push([(0, ctx.deps._t)('게이지 {gauge}', { gauge: signed(ctx, gauge) }), gauge > 0]);
    if (rare) chips.push([(0, ctx.deps._t)('희귀 추적 {rare}', { rare: signed(ctx, rare) }), rare > 0]);
    if (oxygen) chips.push([(0, ctx.deps._t)('산소 소모 {oxygen}', { oxygen: signed(ctx, oxygen) }), oxygen < 0]);
    return chips.length ? chips.map(([text, good]) => `<i class="${good ? 'is-good' : 'is-bad'}">${text}</i>`).join('') : '<i>변화 없음</i>';
}

export function strategyCardHtml(ctx, key, st) {
    const def = ctx.deps.OCEAN_FISHING_STRATEGIES[key], on = st.fishingStrategy === key;
    return `<button type="button" class="fishing-strategy-card${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="setOceanFishingStrategy('${key}')"${st.diving ? ' disabled' : ''}>`
        + `<span class="fishing-strategy-icon" aria-hidden="true">${def.icon}</span><strong>${esc(ctx, (0, ctx.deps._t)(def.name))}</strong>${on ? (0, ctx.deps._t)('<em>적용 중</em>') : ''}`
        + `<span class="fishing-chips">${strategyEffects(ctx, def)}</span></button>`;
}

export function reefHtml(ctx, st) {
    const owned = Math.floor(ctx.deps.game.currencies.reefFragment || 0), full = st.reefInstalled >= 10;
    return `<div class="fishing-reef"><span>${(0, ctx.deps._t)('암초')}</span>${bar(ctx, st.reefInstalled, 10)}<b>${(0, ctx.deps._t)('{reefInstalled}/10, 게이지 +{value}%', { reefInstalled: st.reefInstalled, value: st.reefInstalled * 15 })}</b>`
        + `<button type="button" onclick="installOceanReefFragment(); fishingUi.render();"${full || owned < 1 ? ' disabled' : ''}>${full ? (0, ctx.deps._t)('설치 완료') : (0, ctx.deps._t)('설치 (보유 {owned})', { owned })}</button></div>`;
}

export function gatherHtml(ctx, st) {
    const last = st.lastCatch && ctx.deps.OCEAN_FISH_DB[st.lastCatch.key];
    const catchHtml = last ? `${fishIcon(ctx, st.lastCatch.key)}<div><small>${(0, ctx.deps._t)('최근 포획')}</small><strong class="is-${last.rarity}">${st.lastCatch.guaranteed ? '✨ ' : ''}${esc(ctx, (0, ctx.deps._t)(last.name))}</strong></div>`
        : '<span class="fishing-fish is-empty"></span><div><small>최근 포획</small><strong>아직 없음</strong></div>';
    return `<div class="fishing-head"><div><h3>${(0, ctx.deps._t)('심해 어장')}</h3><p>${(0, ctx.deps._t)('심해 전투 구간마다 게이지가 오르고 100%에서 물고기를 낚습니다.')}</p></div><div class="fishing-last">${catchHtml}</div></div>`
        + `<div class="fishing-meters">${meterHtml(ctx, '낚시 게이지', st.fishingGauge, '')}${meterHtml(ctx, '희귀 조짐', st.rareFishPity, 'is-pity')}</div>`
        + `<div class="fishing-quick"><button type="button" onclick="switchMapSubtab('map-tab-ocean')">${(0, ctx.deps._t)('잠수하러 가기')}</button><button type="button" onclick="fishingUi.openWorkshop()">${(0, ctx.deps._t)('심해 제작')}</button></div>`
        + `<section class="fishing-strategy"><header><strong>${(0, ctx.deps._t)('채집 전략')}</strong><span>${st.diving ? (0, ctx.deps._t)('잠수 중에는 바꿀 수 없음') : (0, ctx.deps._t)('다음 잠수부터 적용')}</span></header>`
        + `<div class="fishing-strategy-grid">${Object.keys(ctx.deps.OCEAN_FISHING_STRATEGIES).map(key => strategyCardHtml(ctx, key, st)).join('')}</div>${reefHtml(ctx, st)}</section>`;
}

export function fishTileHtml(ctx, st, key) {
    const fish = ctx.deps.OCEAN_FISH_DB[key], total = Math.floor(st.fishCaughtTotal[key] || 0), known = total > 0;
    const rarity = (ctx.deps.OCEAN_FISH_RARITY_META[fish.rarity] || ctx.deps.OCEAN_FISH_RARITY_META.common).label;
    return `<article class="fishing-fish-tile is-${fish.rarity}${known ? '' : ' is-unknown'}"${st.lastCatch && st.lastCatch.key === key ? ' data-last="1"' : ''}>${fishIcon(ctx, key, known)}`
        + `<strong>${known ? esc(ctx, (0, ctx.deps._t)(fish.name)) : '???'}</strong><small>${rarity}, ${fish.depthTier * 100}m+</small>`
        + `<b>${known ? (0, ctx.deps._t)('보유 {floor}, 누적 {total}', { floor: Math.floor(st.fishStock[key] || 0), total }) : (0, ctx.deps._t)('미발견')}</b></article>`;
}

export function milestoneHtml(ctx, progress, row) {
    const state = row.claimed ? 'is-claimed' : (row.ready ? 'is-ready' : 'is-locked');
    const bonuses = [row.bonus.gaugeGainPct ? (0, ctx.deps._t)('게이지 +{gaugeGainPct}%', { gaugeGainPct: row.bonus.gaugeGainPct }) : '', row.bonus.rareChancePct ? (0, ctx.deps._t)('희귀 추적 +{rareChancePct}%', { rareChancePct: row.bonus.rareChancePct }) : ''].filter(Boolean);
    const reward = Object.keys(row.reward || {}).map(key => `${(ctx.deps.ORB_DB[key] || {}).name || key} ${row.reward[key]}`).concat(bonuses.map(text => (0, ctx.deps._t)('영구 {text}', { text }))).join(', ');
    const label = row.claimed ? '완료' : (row.ready ? '받기' : `${progress.discoveredCount}/${row.required}`);
    return `<div class="fishing-milestone ${state}"><span>${(0, ctx.deps._t)('{required}종', { required: row.required })}</span><div><strong>${esc(ctx, (0, ctx.deps._t)(row.label))}</strong><small>${esc(ctx, reward)}</small>`
        + `${bar(ctx, Math.min(progress.discoveredCount, row.required), row.required)}</div>`
        + `<button type="button" onclick="claimOceanFishCollectionMilestone(${row.required})"${row.ready && !row.claimed ? '' : ' disabled'}>${label}</button></div>`;
}

export function renderCollection(ctx, st, progress) {
    const summary = ctx.deps.document.getElementById('ui-fishing-collection-summary'), section = ctx.deps.document.getElementById('fishing-collection');
    const ready = progress.milestones.filter(row => row.ready && !row.claimed).length;
    if (summary) summary.textContent = `심해 도감 ${progress.discoveredCount}/${progress.totalCount}${ready ? (0, ctx.deps._t)(', 받을 보상 {ready}', { ready }) : ''}`;
    if (!section || !section.open) return;
    if (ctx.deps.uiDisplay.matches('(max-width: 1080px)') && section.dataset.mobileSelected !== 'true') return;
    (0, ctx.deps.updateGamePanelMarkup)(ctx.deps.document.getElementById('ui-fishing-collection'), `<div class="fishing-fish-grid">${Object.keys(ctx.deps.OCEAN_FISH_DB).map(key => fishTileHtml(ctx, st, key)).join('')}</div>`
            + `<div class="fishing-milestones">${progress.milestones.map(row => milestoneHtml(ctx, progress, row)).join('')}</div>`);
}

export function needsCategory(ctx, recipe) { return recipe.effect.type === 'convertCategoryMod'; }

export function categoryOf(ctx, recipe) {
    if (!needsCategory(ctx, recipe)) return undefined;
    if (ctx.state.chosen[recipe.id]) return ctx.state.chosen[recipe.id];
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)();
    return (item && ctx.state.CATEGORY_OPTIONS.find(cat => !(0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, cat))) || ctx.state.CATEGORY_OPTIONS[0];
}

export function selectedCount(ctx, recipe) {
    if (ctx.deps.SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type)) return 1;
    if (!ctx.state.batchChoice || ctx.state.batchChoice.owner !== ctx.deps.game || ctx.state.batchChoice.season !== ctx.deps.game.season || ctx.state.batchChoice.recipe !== recipe.id) {
        ctx.state.batchChoice = { owner: ctx.deps.game, season: ctx.deps.game.season, recipe: recipe.id, count: 1 };
    }
    return ctx.state.batchChoice.count;
}

export function quantityHtml(ctx, status) {
    if (status.batchLimit === 1 || (status.maxCrafts <= 1 && status.count === 1)) return '';
    const counts = [...new Set([1, ...[5, 10, 25, 50, 100].filter(n => n <= status.maxCrafts), Math.max(1, status.maxCrafts), status.count])].sort((a, b) => a - b);
    return `<label class="fishing-quantity">${(0, ctx.deps._t)('제작 횟수')}<select aria-label="${(0, ctx.deps._t)('제작 횟수')}" onchange="fishingUi.setCount(this.value)">${counts.map(count =>
        `<option value="${count}"${count === status.count ? ' selected' : ''}${count > status.maxCrafts && count !== 1 ? ' disabled' : ''}>${(0, ctx.deps._t)('{value}{count}회', { value: count === status.maxCrafts && count > 1 ? (0, ctx.deps._t)('최대 ') : '', count })}</option>`).join('')}</select></label>`;
}

export function setCount(ctx, value) {
    const id = ctx.deps.document.querySelector('#ui-sea-gift-panel [data-sea-recipe]')?.dataset.seaRecipe;
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find(row => row.id === id), count = Number(value);
    if (!recipe) return;
    const status = (0, ctx.deps.getSeaGiftRecipeStatus)(id, null, categoryOf(ctx, recipe), count);
    if (status.batchLimit === 1 || !status.valid) return;
    selectedCount(ctx, recipe);
    ctx.state.batchChoice.count = count;
    ctx.state.lastResult = null;
    render(ctx);
}

export function costHtml(ctx, recipe, st, count) {
    return Object.keys(recipe.requires).map(key => {
        const have = Math.floor(st.fishStock[key] || 0), need = recipe.requires[key] * count, fish = ctx.deps.OCEAN_FISH_DB[key];
        return `<div class="fishing-material${have >= need ? ' is-ok' : ''}" data-tip="${esc(ctx, (0, ctx.deps._t)('{value}m 이상에서 낚시', { value: fish.depthTier * 100 }))}">${fishIcon(ctx, key)}<strong>${esc(ctx, (0, ctx.deps._t)(fish.name))}</strong><span>${esc(ctx, (0, ctx.deps._t)('{have} / {need}', { have, need }))}</span></div>`;
    }).join('');
}

export function lineText(ctx, stat) {
    const tier = stat.tier ? `, T${stat.tier}` : '';
    const seal = stat.lockedByHoney || stat.lockedByRift ? (0, ctx.deps._t)(', 봉인됨') : '';
    const parts = [stat, ...(stat.extraStats || [])];
    const values = parts.map(row => {
        const name = (0, ctx.deps._t)(parts.length > 1 ? (0, ctx.deps.getStatName)(row.id) : (row.statName || (0, ctx.deps.getStatName)(row.id)));
        const value = stat.isEchoMod ? `${row.val >= 0 ? '+' : ''}${Number(Number(row.val).toFixed(3))}` : (0, ctx.deps.formatSignedValue)(row.id, row.val);
        return `${name} ${value}`;
    }).join(' / ');
    return `${values}${tier}${seal}${stat.isEchoMod ? (0, ctx.deps._t)(', 메아리') : ''}${stat.oceanBenchOptionId ? (0, ctx.deps._t)(', 심해 전용') : ''}`;
}

export function targetReason(ctx, recipe) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    return (0, ctx.deps.getSeaGiftTargetBlockReason)(item) || (0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, categoryOf(ctx, recipe));
}

export function targetHtml(ctx, recipe) {
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)(), reason = targetReason(ctx, recipe);
    const text = item ? `<strong class="item-title ${item.rarity}">${esc(ctx, (0, ctx.deps.getItemDisplayName)(item))}</strong>` : `<strong>${(0, ctx.deps._t)('가공할 장비를 선택하세요')}</strong>`;
    return `<section class="fishing-target${item ? ' is-on' : ''}"><div>${text}</div><div class="fishing-target-buttons"><button type="button" onclick="fishingUi.pickTarget('equip')">${(0, ctx.deps._t)('장착 장비')}</button><button type="button" onclick="fishingUi.pickTarget('inventory')">${(0, ctx.deps._t)('가방 장비')}</button></div>`
        + (item && reason ? `<p class="fishing-target-state is-blocked">${esc(ctx, (0, ctx.deps._t)(reason))}</p>` : '')
        + (item ? targetLinesHtml(ctx, recipe, item, reason) : '') + '</section>';
}

/** Read the same eligible rows as crafting, without rolling or temporarily editing the selected item. */
export function valuePreview(ctx, recipe, item) {
    const rows = recipe.effect.type === 'tierStepUp' ? (0, ctx.deps.getSeaGiftTierStepRows)(item) : (0, ctx.deps.getSeaGiftRerollRows)(item);
    const label = recipe.effect.type === 'tierStepUp' ? '등급 +1' : '수치 재굴림';
    return new Map(rows.map(row => [row.index, rows.length === 1 ? label : '무작위 후보']));
}

export function sealPreview(ctx, effect, item) { return new Map((0, ctx.deps.getSeaGiftEditableIndexes)(item).slice(0, effect.count).map(index => [index, '영구 봉인'])); }

export function replacementPreview(ctx, recipe, item) {
    const category = categoryOf(ctx, recipe), indexes = (0, ctx.deps.getSeaGiftEditableIndexes)(item);
    const pool = (0, ctx.deps.getAvailableMods)(item).filter(mod => !category || (0, ctx.deps.getModCategory)(mod) === category);
    return new Map(ctx.deps.equipmentCrafting.pickReplacement(item, pool, indexes, undefined, 'all').map(row => [row.index, '교체 후보']));
}

export function echoPreview(ctx, item) {
    const paths = (0, ctx.deps.getSeaGiftEchoTargets)(item, (0, ctx.deps.getSeaGiftEditableIndexes)(item));
    const labels = new Map(paths.flatMap(path => path.targetIndexes.map(index => [index, '덮어쓸 후보'])));
    paths.forEach(path => labels.set(path.sourceIndex, labels.has(path.sourceIndex) ? '원본과 교체 후보' : '복사 원본 후보'));
    labels.set(-1, '선택된 원본은 유지됩니다. 그 원본을 복사할 수 있는 다른 후보 중 1줄을 절반 효과의 메아리로 덮어씁니다.');
    return labels;
}

export function targetPreview(ctx, recipe, item) {
    if (ctx.state.VALUE_EFFECTS.has(recipe.effect.type)) return valuePreview(ctx, recipe, item);
    if (recipe.effect.type === 'lockMod') return sealPreview(ctx, recipe.effect, item);
    if (recipe.effect.type === 'convertCategoryMod') return replacementPreview(ctx, recipe, item);
    if (recipe.effect.type === 'echoMod') return echoPreview(ctx, item);
    if (recipe.effect.type === 'fixedBenchOption') {
        const index = (0, ctx.deps.getSeaGiftBenchSlot)(item);
        return new Map([[index, index < 0 ? '기존 줄을 유지하고 새 전용 옵션을 추가합니다.' : '전용 옵션 교체']]);
    }
    return null;
}

export function targetLinesHtml(ctx, recipe, item, reason) {
    const labels = reason ? null : targetPreview(ctx, recipe, item);
    if (!labels) return `<details><summary>${(0, ctx.deps._t)('현재 추가 옵션 {length}줄 보기', { length: item.stats.length })}</summary>${linesHtml(ctx, item.stats.map(ctx.handlers.lineText))}</details>`;
    const rows = item.stats.map((stat, index) => {
        const affected = labels.has(index), label = labels.get(index) || (stat.lockedByHoney || stat.lockedByRift ? '봉인 보호' : '유지');
        return `<li data-option-index="${index}" class="${affected ? 'is-affected' : 'is-kept'}${label.includes('제거') ? ' is-risk' : ''}"><b>${esc(ctx, (0, ctx.deps._t)(label))}</b><span>${index + 1}. ${esc(ctx, lineText(ctx, stat))}</span></li>`;
    }).join('');
    const summary = recipe.effect.type === 'lockMod'
        ? (0, ctx.deps._t)('봉인할 옵션: {option}', { option: lineText(ctx, item.stats[(0, ctx.deps.getSeaGiftEditableIndexes)(item)[0]]) })
        : (0, ctx.deps._t)('현재 옵션과 적용 범위');
    return `<details class="fishing-preview"><summary>${esc(ctx, summary)}</summary><ul class="fishing-lines">${rows}</ul>`
        + (labels.has(-1) ? `<p>${esc(ctx, (0, ctx.deps._t)(labels.get(-1)))}</p>` : '') + '</details>';
}

export function groupOf(ctx, recipe) { return recipe.group; }

export function currencyGuide(ctx, effect) {
    if (effect.type === 'randomCurrency') return [(0, ctx.deps._t)('제작 재화 {amount}개를 무작위로 받습니다.', { amount: effect.amount }),
        (0, ctx.deps._t)('추첨 후보: {candidates}. 여러 개를 만들면 같은 재화가 나올 수도 있습니다.', { candidates: ctx.deps.SEA_GIFT_RANDOM_ORB_KEYS.map(key => (0, ctx.deps._t)(ctx.deps.ORB_DB[key].name)).join(', ') })];
    return [(0, ctx.deps._t)('{name} {amount}개를 받습니다.', { name: (0, ctx.deps._t)((0, ctx.deps.getCurrencyInfo)(effect.key).name), amount: effect.amount }), effect.key === 'reefFragment'
            ? '채집 전략 화면에서 암초로 설치하면 낚시 게이지가 더 빨리 오릅니다.'
            : '장비 창 → 제작실에서 사용합니다. 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 바꿉니다. 잠수 장비 업그레이드에도 사용합니다.'];
}

export function benchGuide(ctx, effect) {
    const options = ctx.deps.OCEAN_WORKBENCH_OPTIONS.filter(option => !!effect.topTier === (option.id === 'oceanLeviathanCrown'));
    return [effect.topTier ? '리바이어던 전용 보스 피해 옵션을 부여합니다.' : '심해 전용 옵션 4종 중 1종을 무작위로 부여합니다.',
        (0, ctx.deps._t)('{options}. 수치는 범위 안에서 무작위입니다. 기존 미봉인 심해 옵션을 교체하며, 없으면 빈 자리에 추가합니다. 꽉 찼으면 가장 낮은 등급의 미봉인 일반 줄을 교체합니다.', { options: options.map(option => `${(0, ctx.deps._t)((0, ctx.deps.getStatName)(option.statId))} ${(0, ctx.deps.formatSignedValue)(option.statId, option.min)}~${(0, ctx.deps.formatValue)(option.statId, option.max)}`).join(' / ') })];
}

export function sealGuide(ctx) {
    return [(0, ctx.deps._t)('봉인되지 않은 첫 옵션을 영구 보호합니다. 봉인은 되돌릴 수 없습니다.'),
        '줄을 직접 지정하는 방식은 아닙니다. 이후 제작에서 해당 줄은 바뀌지 않습니다.'];
}

export function guideHtml(ctx, recipe, count) {
    const effect = count > 1 ? { ...recipe.effect, amount: recipe.effect.amount * count } : recipe.effect;
    const [summary, detail] = ctx.state.EFFECT_GUIDES[effect.type](effect, (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)());
    return `<div class="fishing-effect"><p>${esc(ctx, (0, ctx.deps._t)(summary))}</p><details><summary>${(0, ctx.deps._t)('자세히')}</summary><p class="fishing-effect-note">${esc(ctx, (0, ctx.deps._t)(detail))}</p></details></div>`;
}

export function categoryHtml(ctx, recipe) {
    const category = categoryOf(ctx, recipe);
    if (!category) return '';
    const item = (0, ctx.deps.getSelectedSeaGiftEquipmentTarget)();
    return `<label class="fishing-category-label">${(0, ctx.deps._t)('원하는 옵션 계열')}<select class="fishing-category" aria-label="${(0, ctx.deps._t)('옵션 계열')}" onchange="fishingUi.pick('${recipe.id}', this.value)">`
        + ctx.state.CATEGORY_OPTIONS.map(cat => {
        const reason = item ? (0, ctx.deps.getSeaGiftEffectBlockReason)(item, recipe.effect, cat) : '';
        return `<option value="${cat}"${cat === category ? ' selected' : ''}>${esc(ctx, (0, ctx.deps._t)(cat))}${reason ? (0, ctx.deps._t)(' (불가: {reason})', { reason: esc(ctx, (0, ctx.deps._t)(reason)) }) : ''}</option>`;
    }).join('') + '</select></label>';
}

export function recipeHtml(ctx, recipe, st) {
    const count = selectedCount(ctx, recipe), status = (0, ctx.deps.getSeaGiftRecipeStatus)(recipe.id, null, categoryOf(ctx, recipe), count);
    const needsItem = recipe.group === 'equipment';
    return `<article data-sea-recipe="${recipe.id}" class="fishing-recipe${status.ready ? ' is-ready' : ''}"><header><h4>${esc(ctx, (0, ctx.deps._t)(recipe.title))}</h4></header>`
        + `${guideHtml(ctx, recipe, count)}${categoryHtml(ctx, recipe)}${needsItem ? targetHtml(ctx, recipe) : quantityHtml(ctx, status)}`
        + `<section class="fishing-materials"><h4>${(0, ctx.deps._t)('재료 (보유 / 필요)')}</h4>${costHtml(ctx, recipe, st, count)}</section>`
        + `<div class="fishing-craft-action">${status.reason ? `<p class="is-blocked">${esc(ctx, (0, ctx.deps._t)(status.reason))}</p>` : ''}<button type="button" data-sea-craft onclick="fishingUi.craft('${recipe.id}')"${status.ready ? '' : ' disabled'}>${needsItem ? (0, ctx.deps._t)('가공하기') : (0, ctx.deps._t)('{count}회 제작', { count })}</button></div>`
        + `<div class="fishing-result" role="status" aria-live="polite">${resultHtml(ctx, recipe, status.item)}</div></article>`;
}

export function recipeListHtml(ctx, recipes, recipe) {
    return `<nav class="fishing-recipe-list" aria-label="${(0, ctx.deps._t)('제작법')}">${recipes.map(row => {
        const status = statusOf(ctx, row);
        return `<button type="button" data-recipe-choice="${row.id}" class="${row.id === recipe.id ? 'is-selected' : ''}" aria-pressed="${row.id === recipe.id}" onclick="fishingUi.choose('${row.id}')"><strong>${esc(ctx, (0, ctx.deps._t)(row.title))}</strong><small>${status.materialReady ? (0, ctx.deps._t)('재료 충분') : (0, ctx.deps._t)('재료 부족')}</small></button>`;
    }).join('')}</nav>`;
}

export function giftsHtml(ctx, st) {
    const group = ctx.deps.document.getElementById('fishing-workshop').dataset.recipeGroup;
    const recipes = ctx.deps.SEA_GIFT_RECIPES.filter(recipe => groupOf(ctx, recipe) === group);
    const recipe = recipes.find(row => row.id === ctx.state.selectedRecipes[group]) || recipes[0];
    ctx.state.selectedRecipes[group] = recipe.id;
    return `<div class="fishing-workshop-toolbar"><span>${esc(ctx, (0, ctx.deps._t)(ctx.state.GROUPS[group]))}</span><button type="button" onclick="switchMapSubtab('map-tab-ocean')">${(0, ctx.deps._t)('재료 모으기')}</button></div><div class="fishing-workshop-layout">${recipeListHtml(ctx, recipes, recipe)}${recipeHtml(ctx, recipe, st)}</div>`;
}

export function resultHtml(ctx, recipe, item) {
    if (!resultIsCurrent(ctx, recipe, item)) return '';
    if (!ctx.state.lastResult.ok) return '<strong>제작하지 못했습니다</strong><p>현재 장비에 이 제작법을 적용할 수 없습니다. 물고기는 소모되지 않았습니다.</p>';
    const spent = Object.entries(recipe.requires).map(([key, count]) => (0, ctx.deps._t)('{name} {value}마리', { name: ctx.deps.OCEAN_FISH_DB[key].name, value: count * ctx.state.lastResult.count })).join(', ');
    if (!item) return currencyResultHtml(ctx, recipe) + `<small>${(0, ctx.deps._t)('사용한 재료: {spent}', { spent: esc(ctx, spent) })}</small>`;
    const unchanged = JSON.stringify(ctx.state.lastResult.before) === JSON.stringify(ctx.state.lastResult.after);
    return `<strong>${(0, ctx.deps._t)('제작 완료: {name}', { name: esc(ctx, (0, ctx.deps._t)(ctx.state.lastResult.name)) })}</strong><p>${unchanged ? (0, ctx.deps._t)('옵션이 그대로 유지되었습니다. 물고기는 소모되었습니다.') : (0, ctx.deps._t)('바뀐 부분만 모았습니다.')}</p>`
        + changedLinesHtml(ctx, ctx.state.lastResult.before, ctx.state.lastResult.after) + `<small>${(0, ctx.deps._t)('사용한 재료: {spent}', { spent: esc(ctx, spent) })}</small>`;
}

/** Match duplicate lines once each. Added/removed options must not be paired with an unrelated line. */
export function changedLinesHtml(ctx, before, after) {
    const added = [...after.lines], removed = [], kept = [];
    before.lines.forEach(line => {
        const index = added.indexOf(line);
        if (index < 0) removed.push(line);
        else { kept.push(line); added.splice(index, 1); }
    });
    const rarity = before.rarity === after.rarity ? '' : `<p class="fishing-rarity-change">${(0, ctx.deps._t)('장비 등급: {rarity} → {rarity2}', { rarity: esc(ctx, before.rarity), rarity2: esc(ctx, after.rarity) })}</p>`;
    const changes = removed.length || added.length ? `<div class="fishing-result-compare"><section class="is-before"><h4>${(0, ctx.deps._t)('제작 전 (바뀐 줄)')}</h4>${linesHtml(ctx, removed, '기존 줄 교체 없음')}</section>`
        + `<section class="is-after"><h4>${(0, ctx.deps._t)('제작 후 (새 결과)')}</h4>${linesHtml(ctx, added, '해당 옵션 제거됨')}</section></div>` : '';
    return rarity + changes + (kept.length ? `<details class="fishing-kept"><summary>${(0, ctx.deps._t)('그대로 유지된 옵션 {length}줄', { length: kept.length })}</summary>${linesHtml(ctx, kept)}</details>` : '');
}

export function currencyResultHtml(ctx, recipe) {
    const gains = ctx.state.lastResult.gains.map(row => (0, ctx.deps._t)('{name} +{amount}, 현재 보유 {currencies}', { name: (0, ctx.deps.getCurrencyInfo)(row.key).name, amount: row.amount, currencies: ctx.deps.game.currencies[row.key] || 0 }));
    let action = '';
    if (recipe.effect.type === 'currency') {
        const reef = recipe.effect.key === 'reefFragment';
        const canOpen = reef || ctx.deps.contentProgression.canOpen('item-tab-craft');
        action = canOpen ? `<button type="button" class="fishing-result-next" onclick="fishingUi.openRewardUse('${recipe.effect.key}')">${reef ? (0, ctx.deps._t)('채집 전략에서 암초 설치하기') : (0, ctx.deps._t)('제작실에서 심해의 파편 보기')}</button>`
            : '<p>장비 제작실을 해금하면 심해의 파편을 사용할 수 있습니다.</p>';
    }
    return `<strong>${(0, ctx.deps._t)('제작 완료: {count}회', { count: ctx.state.lastResult.count })}</strong>${linesHtml(ctx, gains)}${action}`;
}

export function craft(ctx, recipeId) {
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find(row => row.id === recipeId);
    if (!recipe) return;
    const count = selectedCount(ctx, recipe), status = (0, ctx.deps.getSeaGiftRecipeStatus)(recipeId, null, categoryOf(ctx, recipe), count);
    if (!status.ready) { render(ctx); return; }
    const keys = recipe.effect.type === 'currency' ? [recipe.effect.key] : ctx.deps.SEA_GIFT_RANDOM_ORB_KEYS;
    const balances = Object.fromEntries(keys.map(key => [key, ctx.deps.game.currencies[key] || 0]));
    const before = itemSnapshot(ctx, status.item);
    const ok = (0, ctx.deps.craftSeaGift)(recipeId, null, { category: categoryOf(ctx, recipe), count });
    if (ok) (0, ctx.deps.playUiFeedbackSound)('craftSuccess');
    // 고른 횟수는 남은 재료로 만들 수 있는 만큼으로 줄인다: 다 쓰고 나면 결과 옆에 '재료 부족'이 떴다.
    if (ctx.state.batchChoice) ctx.state.batchChoice.count = Math.max(1, Math.min(ctx.state.batchChoice.count, (0, ctx.deps.getSeaGiftRecipeStatus)(recipeId, null, categoryOf(ctx, recipe), 1).maxCrafts || 1));
    ctx.state.lastResult = { recipeId, count, owner: ctx.deps.game, target: status.item, ok, before, after: itemSnapshot(ctx, status.item), name: status.item && status.item.name,
        gains: keys.filter(key => ctx.deps.game.currencies[key] > balances[key]).map(key => ({ key, amount: ctx.deps.game.currencies[key] - balances[key] })) };
    render(ctx);
    ctx.deps.document.querySelector('#ui-sea-gift-panel .fishing-result').scrollIntoView({ block: 'nearest' });
}

/** A category picked on a card: the card's ready state and button follow it. */
export function pick(ctx, recipeId, category) {
    if (ctx.state.CATEGORY_OPTIONS.includes(category)) ctx.state.chosen[recipeId] = category;
    ctx.state.lastResult = null;
    render(ctx);
}

export function choose(ctx, recipeId) {
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find(row => row.id === recipeId);
    if (!recipe) return;
    ctx.state.selectedRecipes[groupOf(ctx, recipe)] = recipeId;
    if (ctx.state.lastResult?.recipeId !== recipeId) ctx.state.lastResult = null;
    selectGroup(ctx, groupOf(ctx, recipe), false);
    ctx.deps.document.querySelector('#ui-sea-gift-panel .fishing-recipe').scrollIntoView({ block: 'start' });
}

export function selectGroup(ctx, group, clearResult = true) {
    if (!Object.hasOwn(ctx.state.GROUPS, group)) return;
    ctx.state.batchChoice = null;
    ctx.deps.document.getElementById('fishing-workshop').dataset.recipeGroup = group;
    for (const button of ctx.deps.document.querySelectorAll('[data-sea-group]')) button.setAttribute('aria-pressed', String(button.dataset.seaGroup === group));
    if (clearResult) ctx.state.lastResult = null;
    render(ctx);
    if (clearResult) ctx.deps.document.getElementById('fishing-workshop').scrollIntoView({ block: 'start' });
}

export function openRewardUse(ctx, key) {
    if (key === 'reefFragment') {
        (0, ctx.deps.switchMapSubtab)('map-tab-fishing');
        ctx.deps.document.getElementById('fishing-gather-tab').click();
        ctx.deps.document.querySelector('.fishing-reef').scrollIntoView({ block: 'center' });
        ctx.deps.document.querySelector('.fishing-reef button').focus({ preventScroll: true });
        return;
    }
    if (key !== 'oceanRerollShard' || !ctx.deps.contentProgression.canOpen('item-tab-craft')) return;
    (0, ctx.deps.switchTab)('tab-items');
    if (ctx.deps.document.body.classList.contains('desktop-windowed-ui')) (0, ctx.deps.openWindow)('tab-items');
    (0, ctx.deps.switchItemSubtab)('item-tab-craft');
    ctx.deps.craftingWorkspaceUi.openInventory(key, true);
}

export function pickTarget(ctx, kind) {
    ctx.deps.window.openCraftItemPickerOverlay(kind);
    ctx.deps.document.getElementById('craft-picker-title').textContent = (0, ctx.deps._t)('심해 제작에 쓸 장비 선택');
    ctx.deps.document.querySelector('#craft-item-picker-overlay .craft-picker-desc').textContent = (0, ctx.deps._t)('장비를 골라도 재료는 쓰지 않습니다.');
}

export function openWorkshop(ctx) {
    (0, ctx.deps.switchMapSubtab)('map-tab-fishing');
    ctx.deps.document.getElementById('fishing-workshop-tab').click();
    ctx.deps.document.getElementById('fishing-workshop').scrollIntoView({ block: 'start' });
}

export function lockedHtml(ctx) {
    return `<div class="fishing-head"><div><h3>${(0, ctx.deps._t)('낚시')}</h3><p>${(0, ctx.deps._t)('루프 {OCEAN_UNLOCK_LOOP} 이후 심해가 해금되면 낚을 수 있습니다.', { OCEAN_UNLOCK_LOOP: ctx.deps.OCEAN_UNLOCK_LOOP })}</p></div><div class="fishing-last"><span class="fishing-fish is-empty"></span><div><small>${(0, ctx.deps._t)('잠김')}</small><strong>${(0, ctx.deps._t)('봉인됨')}</strong></div></div></div>`;
}

/** Native inputs become dirty after interaction; changing HTML attributes alone does not reset their live values. */
export function syncWorkshopControls(ctx, gifts) {
    const category = gifts.querySelector('.fishing-category'), recipeId = gifts.querySelector('[data-sea-recipe]')?.dataset.seaRecipe;
    const recipe = ctx.deps.SEA_GIFT_RECIPES.find(row => row.id === recipeId);
    if (!recipe) return;
    if (category) category.value = categoryOf(ctx, recipe);
    const quantity = gifts.querySelector('.fishing-quantity select');
    if (quantity) quantity.value = selectedCount(ctx, recipe);
}

export function render(ctx) {
    const panel = ctx.deps.document.getElementById('ui-fishing-panel'), gifts = ctx.deps.document.getElementById('ui-sea-gift-panel');
    if (!panel) return;
    const st = (0, ctx.deps.ensureOceanState)();
    if (!st.unlocked) {
        (0, ctx.deps.updateGamePanelMarkup)(panel, lockedHtml(ctx));
        if (gifts) (0, ctx.deps.updateGamePanelMarkup)(gifts, '');
        return;
    }
    (0, ctx.deps.updateGamePanelMarkup)(panel, gatherHtml(ctx, st));
    renderCollection(ctx, st, (0, ctx.deps.getOceanFishCollectionProgress)(st));
    if (!gifts) return;
    (0, ctx.deps.updateGamePanelMarkup)(gifts, giftsHtml(ctx, st));
    syncWorkshopControls(ctx, gifts);
}

export function esc(ctx, value) { return (0, ctx.deps.escapeHTML)(String(value ?? '')); }

export function clamp(ctx, value) { return Math.max(0, Math.min(100, Number(value) || 0)); }

export function bar(ctx, have, need) { return `<i class="fishing-bar"><i style="width:${clamp(ctx, need > 0 ? (have / need) * 100 : 0).toFixed(1)}%"></i></i>`; }

export function signed(ctx, value) { return `${value >= 0 ? '+' : ''}${value}%`; }

export function fishIcon(ctx, key, known = true) { return `<span class="fishing-fish is-${(ctx.deps.OCEAN_FISH_DB[key] || {}).rarity || 'common'}${known ? '' : ' is-unknown'}">${(0, ctx.deps.renderPixelIcon)('fish', 'fishing-fish-icon')}</span>`; }

export function statusOf(ctx, recipe) { return (0, ctx.deps.getSeaGiftRecipeStatus)(recipe.id, null, categoryOf(ctx, recipe)); }

export function linesHtml(ctx, lines, empty = '추가 옵션 없음') { return `<ul class="fishing-lines">${lines.length ? lines.map(line => `<li>${esc(ctx, line)}</li>`).join('') : `<li>${esc(ctx, (0, ctx.deps._t)(empty))}</li>`}</ul>`; }

export function resultIsCurrent(ctx, recipe, item) { return ctx.state.lastResult && ctx.state.lastResult.owner === ctx.deps.game && ctx.state.lastResult.recipeId === recipe.id && ctx.state.lastResult.target === item
        && (!item || JSON.stringify(ctx.state.lastResult.after) === JSON.stringify(itemSnapshot(ctx, item))); }

export function itemSnapshot(ctx, item) { return item && ({ rarity: (0, ctx.deps._t)(ctx.deps.ITEM_RARITY_LABELS[item.rarity]), lines: item.stats.map(ctx.handlers.lineText) }); }
