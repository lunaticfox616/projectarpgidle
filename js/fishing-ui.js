/** 낚시(지도 창의 낚시, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 4순위). 설명 문장과 회색 "재료 부족" 단추가 줄지어 있던 화면이다.
 * 어장: 최근 포획 물고기, 낚시 게이지와 희귀 조짐 막대(0%에도 빈 막대가 보인다), 채집 전략 카드(효과 칩), 암초 막대.
 * 도감: 물고기 칸(희귀도 색의 도트 물고기, 미발견은 그림자와 깊이), 발견 보상 줄(진행 막대와 받기).
 * 바다의 선물: 목적별 제작법 선택 → 실제 변경 범위와 재료 확인 → 1회 제작 결과. 비용/추첨은 도메인만 처리한다.
 * 규칙과 계산은 js/passives.js(ensureOceanState, craftSeaGift, getSeaGiftRecipeStatus, setOceanFishingStrategy …). */
const fishingUi = (() => {
    const CATEGORY_OPTIONS = Object.freeze(['공격', '방어/생명', '속도/치명', '저항']);
    const CATEGORY_EFFECTS = new Set(['guaranteedTaggedMod', 'taggedReroll', 'convertCategoryMod']);
    const VALUE_EFFECTS = new Set(['taggedReroll', 'safeReroll', 'twinReroll', 'tierStepUp']);
    const GROUPS = Object.freeze({ supply: '재화 만들기', forge: '수치 다듬기', chase: '옵션 추가와 변경' });
    const chosen = {}; // the category picked on each recipe card, kept across redraws
    const selectedRecipes = {};
    let lastResult = null;
    let materialsOnly = false;
    let batchChoice = null;
    const TITLES = Object.freeze({
        reefBundle: '암초 조각 2개', tidalCharm: '심해의 파편 1개', glowfinEssence: '심해의 파편 2개',
        tidalFortune: '무작위 재화 1개 (장어)', glowingFortune: '무작위 재화 1개 (송어)',
        abyssalCache: '무작위 재화 2개 (등불고기)', tidelordCache: '무작위 재화 2개 (비단잉어)', leviathanCache: '무작위 재화 3개',
        purifyingOffering: '한 계열의 수치 1줄 재굴림', safeReroll: '수치 하락 없이 1줄 재굴림', twinCurrentReroll: '최대 2줄 수치 재굴림',
        tierStepUp: '옵션 1줄 등급 올리기', tidelordRefine: '한 계열 전체 등급 올리기',
        abyssalGift: '무작위 옵션 1줄 부여', categoryShift: '옵션 1줄 계열 바꾸기', echoMod: '좋은 옵션을 절반 효과로 복사',
        sealOffering: '첫 번째 옵션 봉인', leviathanBoon: '계열 옵션 부여, 등급 보정 +2',
        crushDepthScar: '심해 전용 옵션 부여', doubleSealForge: '앞 2줄 봉인 + 다음 줄 교체',
        voidPureRefine: '희귀 장비로 승급', leviathanRemnant: '계열 옵션 부여 + 낮은 등급 줄 제거', leviathanSigil: '리바이어던 전용 옵션 부여'
    });

    const esc = value => escapeHTML(String(value ?? ''));
    const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
    const bar = (have, need) => `<i class="fishing-bar"><i style="width:${clamp(need > 0 ? (have / need) * 100 : 0).toFixed(1)}%"></i></i>`;
    const signed = value => `${value >= 0 ? '+' : ''}${value}%`;
    const fishIcon = (key, known = true) => `<span class="fishing-fish is-${(OCEAN_FISH_DB[key] || {}).rarity || 'common'}${known ? '' : ' is-unknown'}">${renderPixelIcon('fish', 'fishing-fish-icon')}</span>`;

    // ── 어장 ───────────────────────────────────────────────────────
    function meterHtml(label, value, cls) {
        return `<div class="fishing-meter ${cls}"><span>${label}</span><b>${Math.floor(clamp(value))}%</b>${bar(clamp(value), 100)}</div>`;
    }
    function strategyEffects(def) {
        const gauge = Math.round((def.gaugeGainMul - 1) * 100), rare = Math.round((def.rareWeightMul - 1) * 100), oxygen = Math.round((def.oxygenDrainMul - 1) * 100);
        const chips = [];
        if (gauge) chips.push([`게이지 ${signed(gauge)}`, gauge > 0]);
        if (rare) chips.push([`희귀 추적 ${signed(rare)}`, rare > 0]);
        if (oxygen) chips.push([`산소 소모 ${signed(oxygen)}`, oxygen < 0]);
        return chips.length ? chips.map(([text, good]) => `<i class="${good ? 'is-good' : 'is-bad'}">${text}</i>`).join('') : '<i>변화 없음</i>';
    }
    function strategyCardHtml(key, st) {
        const def = OCEAN_FISHING_STRATEGIES[key], on = st.fishingStrategy === key;
        return `<button type="button" class="fishing-strategy-card${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="setOceanFishingStrategy('${key}')"${st.diving ? ' disabled' : ''}>`
            + `<span class="fishing-strategy-icon" aria-hidden="true">${def.icon}</span><strong>${esc(def.name)}</strong>${on ? '<em>적용 중</em>' : ''}`
            + `<span class="fishing-chips">${strategyEffects(def)}</span></button>`;
    }
    function reefHtml(st) {
        const owned = Math.floor(game.currencies.reefFragment || 0), full = st.reefInstalled >= 10;
        return `<div class="fishing-reef"><span>암초</span>${bar(st.reefInstalled, 10)}<b>${st.reefInstalled}/10, 게이지 +${st.reefInstalled * 15}%</b>`
            + `<button type="button" onclick="installOceanReefFragment(); fishingUi.render();"${full || owned < 1 ? ' disabled' : ''}>${full ? '설치 완료' : `설치 (보유 ${owned})`}</button></div>`;
    }
    function gatherHtml(st) {
        const last = st.lastCatch && OCEAN_FISH_DB[st.lastCatch.key];
        const catchHtml = last ? `${fishIcon(st.lastCatch.key)}<div><small>최근 포획</small><strong class="is-${last.rarity}">${st.lastCatch.guaranteed ? '✨ ' : ''}${esc(last.name)}</strong></div>`
            : '<span class="fishing-fish is-empty"></span><div><small>최근 포획</small><strong>아직 없음</strong></div>';
        return `<div class="fishing-head"><div><h3>심해 어장</h3><p>심해 전투 구간마다 게이지가 오르고 100%에서 물고기를 낚습니다.</p></div><div class="fishing-last">${catchHtml}</div></div>`
            + `<div class="fishing-meters">${meterHtml('낚시 게이지', st.fishingGauge, '')}${meterHtml('희귀 조짐', st.rareFishPity, 'is-pity')}</div>`
            + `<div class="fishing-quick"><button type="button" onclick="switchMapSubtab('map-tab-ocean')">잠수하러 가기</button><button type="button" onclick="fishingUi.openWorkshop()">심해 제작 (바다의 선물)</button></div>`
            + `<section class="fishing-strategy"><header><strong>채집 전략</strong><span>${st.diving ? '잠수 중에는 바꿀 수 없음' : '다음 잠수부터 적용'}</span></header>`
            + `<div class="fishing-strategy-grid">${Object.keys(OCEAN_FISHING_STRATEGIES).map(key => strategyCardHtml(key, st)).join('')}</div>${reefHtml(st)}</section>`;
    }

    // ── 도감 ───────────────────────────────────────────────────────
    function fishTileHtml(st, key) {
        const fish = OCEAN_FISH_DB[key], total = Math.floor(st.fishCaughtTotal[key] || 0), known = total > 0;
        const rarity = (OCEAN_FISH_RARITY_META[fish.rarity] || OCEAN_FISH_RARITY_META.common).label;
        return `<article class="fishing-fish-tile is-${fish.rarity}${known ? '' : ' is-unknown'}"${st.lastCatch && st.lastCatch.key === key ? ' data-last="1"' : ''}>${fishIcon(key, known)}`
            + `<strong>${known ? esc(fish.name) : '???'}</strong><small>${rarity}, ${fish.depthTier * 100}m+</small>`
            + `<b>${known ? `보유 ${Math.floor(st.fishStock[key] || 0)}, 누적 ${total}` : '미발견'}</b></article>`;
    }
    function milestoneHtml(progress, row) {
        const state = row.claimed ? 'is-claimed' : (row.ready ? 'is-ready' : 'is-locked');
        const bonuses = [row.bonus.gaugeGainPct ? `게이지 +${row.bonus.gaugeGainPct}%` : '', row.bonus.rareChancePct ? `희귀 추적 +${row.bonus.rareChancePct}%` : ''].filter(Boolean);
        const reward = Object.keys(row.reward || {}).map(key => `${(ORB_DB[key] || {}).name || key} ${row.reward[key]}`).concat(bonuses.map(text => `영구 ${text}`)).join(', ');
        const label = row.claimed ? '완료' : (row.ready ? '받기' : `${progress.discoveredCount}/${row.required}`);
        return `<div class="fishing-milestone ${state}"><span>${row.required}종</span><div><strong>${esc(row.label)}</strong><small>${esc(reward)}</small>`
            + `${bar(Math.min(progress.discoveredCount, row.required), row.required)}</div>`
            + `<button type="button" onclick="claimOceanFishCollectionMilestone(${row.required})"${row.ready && !row.claimed ? '' : ' disabled'}>${label}</button></div>`;
    }
    function renderCollection(st, progress) {
        const summary = document.getElementById('ui-fishing-collection-summary'), section = document.getElementById('fishing-collection');
        const ready = progress.milestones.filter(row => row.ready && !row.claimed).length;
        if (summary) summary.textContent = `심해 도감 ${progress.discoveredCount}/${progress.totalCount}${ready ? `, 받을 보상 ${ready}` : ''}`;
        if (!section || !section.open) return;
        if (uiDisplay.matches('(max-width: 1080px)') && section.dataset.mobileSelected !== 'true') return;
        updateGamePanelMarkup(document.getElementById('ui-fishing-collection'), `<div class="fishing-fish-grid">${Object.keys(OCEAN_FISH_DB).map(key => fishTileHtml(st, key)).join('')}</div>`
            + `<div class="fishing-milestones">${progress.milestones.map(row => milestoneHtml(progress, row)).join('')}</div>`);
    }

    // ── 바다의 선물 ────────────────────────────────────────────────
    function needsCategory(recipe) {
        return CATEGORY_EFFECTS.has(recipe.effect.type) || (recipe.effect.type === 'lockMod' && !!recipe.effect.bonusTaggedReroll);
    }
    function categoryOf(recipe) {
        if (!needsCategory(recipe)) return undefined;
        if (chosen[recipe.id]) return chosen[recipe.id];
        const item = getSelectedSeaGiftEquipmentTarget();
        return (item && CATEGORY_OPTIONS.find(cat => !getSeaGiftEffectBlockReason(item, recipe.effect, cat))) || CATEGORY_OPTIONS[0];
    }
    const statusOf = recipe => getSeaGiftRecipeStatus(recipe.id, null, categoryOf(recipe));
    function selectedCount(recipe) {
        if (SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type)) return 1;
        if (!batchChoice || batchChoice.owner !== game || batchChoice.season !== game.season || batchChoice.recipe !== recipe.id) {
            batchChoice = { owner: game, season: game.season, recipe: recipe.id, count: 1 };
        }
        return batchChoice.count;
    }
    function quantityHtml(status) {
        if (status.batchLimit === 1 || (status.maxCrafts <= 1 && status.count === 1)) return '';
        const counts = [...new Set([1, ...[5, 10, 25, 50, 100].filter(n => n <= status.maxCrafts), Math.max(1, status.maxCrafts), status.count])].sort((a, b) => a - b);
        return `<label class="fishing-quantity">제작 횟수<select aria-label="제작 횟수" onchange="fishingUi.setCount(this.value)">${counts.map(count =>
            `<option value="${count}"${count === status.count ? ' selected' : ''}${count > status.maxCrafts && count !== 1 ? ' disabled' : ''}>${count === status.maxCrafts && count > 1 ? '최대 ' : ''}${count}회</option>`).join('')}</select></label>`;
    }
    function setCount(value) {
        const id = document.querySelector('#ui-sea-gift-panel [data-sea-recipe]')?.dataset.seaRecipe;
        const recipe = SEA_GIFT_RECIPES.find(row => row.id === id), count = Number(value);
        if (!recipe) return;
        const status = getSeaGiftRecipeStatus(id, null, categoryOf(recipe), count);
        if (status.batchLimit === 1 || !status.valid) return;
        selectedCount(recipe);
        batchChoice.count = count;
        lastResult = null;
        render();
    }
    function costHtml(recipe, st, count) {
        return Object.keys(recipe.requires).map(key => {
            const have = Math.floor(st.fishStock[key] || 0), need = recipe.requires[key] * count, fish = OCEAN_FISH_DB[key];
            return `<div class="fishing-material${have >= need ? ' is-ok' : ''}">${fishIcon(key)}<div><strong>${esc(fish.name)}</strong>`
                + `<small>${fish.depthTier * 100}m 이상에서 낚시</small></div><div><span>보유 ${have} / 필요 ${need}</span>`
                + `<b>${have >= need ? '재료 충분' : `${need - have}마리 부족`}</b></div></div>`;
        }).join('');
    }
    function lineText(stat) {
        const tier = stat.tier ? `, T${stat.tier}` : '';
        const seal = stat.lockedByHoney || stat.lockedByRift ? ', 봉인됨' : '';
        const parts = [stat, ...(stat.extraStats || [])];
        const values = parts.map(row => {
            const name = parts.length > 1 ? getStatName(row.id) : (row.statName || getStatName(row.id));
            const value = stat.isEchoMod ? `${row.val >= 0 ? '+' : ''}${Number(Number(row.val).toFixed(3))}` : formatSignedValue(row.id, row.val);
            return `${name} ${value}`;
        }).join(' / ');
        return `${values}${tier}${seal}${stat.isEchoMod ? ', 메아리' : ''}${stat.oceanBenchOptionId ? ', 심해 전용' : ''}`;
    }
    const linesHtml = (lines, empty = '추가 옵션 없음') => `<ul class="fishing-lines">${lines.length ? lines.map(line => `<li>${esc(line)}</li>`).join('') : `<li>${esc(empty)}</li>`}</ul>`;
    function targetReason(recipe) {
        const item = getSelectedCraftItem();
        return getSeaGiftTargetBlockReason(item) || getSeaGiftEffectBlockReason(item, recipe.effect, categoryOf(recipe));
    }
    function targetHtml(recipe) {
        const item = getSelectedSeaGiftEquipmentTarget(), reason = targetReason(recipe);
        const text = item ? `<strong class="item-title ${item.rarity}">[${esc(getItemSlotDisplayLabel(item, '장비'))}] ${esc(item.name)}</strong>` : '<strong>가공할 장비를 선택하세요</strong>';
        return `<section class="fishing-target${item ? ' is-on' : ''}"><div><small>이 장비에 적용</small>${text}</div>`
            + `<div class="fishing-target-buttons"><button type="button" onclick="fishingUi.pickTarget('equip')">장착 장비</button><button type="button" onclick="fishingUi.pickTarget('inventory')">가방 장비</button></div>`
            + `<p class="fishing-target-state${reason ? ' is-blocked' : ''}">${esc(reason || '이 제작법을 적용할 수 있습니다.')}</p>`
            + (item ? targetLinesHtml(recipe, item, reason) : '') + '</section>';
    }
    /** Read the same eligible rows as crafting, without rolling or temporarily editing the selected item. */
    function valuePreview(recipe, item) {
        const effect = recipe.effect;
        const rows = effect.type === 'tierStepUp' ? getSeaGiftTierStepRows(item) : getSeaGiftRerollRows(item, categoryOf(recipe));
        const all = effect.allMatching || rows.length === 1 || (effect.type === 'twinReroll' && rows.length <= 2);
        const label = effect.type === 'tierStepUp' ? '등급 +1' : (effect.tierBoost ? '등급과 수치 재굴림' : '수치 재굴림');
        const labels = new Map(rows.map(row => [row.index, all ? label : '무작위 후보']));
        labels.set(-1, '일반 추가 옵션의 종류를 유지하며 수치를 굴립니다. 메아리와 전용 고정 옵션은 대상에서 제외됩니다.');
        return labels;
    }
    function sealPreview(effect, item) {
        const indexes = getSeaGiftEditableIndexes(item);
        const labels = new Map(indexes.slice(0, effect.count).map(index => [index, '영구 봉인']));
        if (effect.bonusTaggedReroll) labels.set(indexes[effect.count], '계열 교체');
        return labels;
    }
    function replacementPreview(recipe, item) {
        const category = categoryOf(recipe), indexes = getSeaGiftEditableIndexes(item);
        const pool = getAvailableMods(item).filter(mod => !category || getModCategory(mod) === category);
        const choices = recipe.effect.type === 'convertCategoryMod'
            ? equipmentCrafting.pickReplacement(item, pool, indexes, undefined, 'all')
            : chooseSeaGiftGuaranteedLine(item, pool, indexes.map(index => ({ index, stat: item.stats[index] })), recipe.effect, 'all');
        const labels = new Map(choices.filter(row => row.index >= 0).map(row => [row.index, '교체 후보']));
        choices.filter(row => row.removeIndex >= 0).forEach(row => {
            labels.set(row.removeIndex, labels.has(row.removeIndex) ? '교체와 제거 후보' : '추가 제거 후보');
        });
        const route = choices.some(row => row.index < 0) ? '새 옵션 1줄을 빈 자리에 추가합니다.' : '표시된 교체 후보 중 1줄이 새 옵션으로 바뀝니다.';
        labels.set(-1, route + (recipe.effect.bonusRemoveMod ? ' 그 뒤 별도로 표시된 제거 후보 중 1줄도 사라집니다. 새 옵션에 따라 대상이 달라질 수 있습니다.' : ''));
        return labels;
    }
    function echoPreview(item) {
        const paths = getSeaGiftEchoTargets(item, getSeaGiftEditableIndexes(item));
        const labels = new Map(paths.flatMap(path => path.targetIndexes.map(index => [index, '덮어쓸 후보'])));
        paths.forEach(path => labels.set(path.sourceIndex, labels.has(path.sourceIndex) ? '원본과 교체 후보' : '복사 원본 후보'));
        labels.set(-1, '선택된 원본은 유지됩니다. 그 원본을 복사할 수 있는 다른 후보 중 1줄을 절반 효과의 메아리로 덮어씁니다.');
        return labels;
    }
    function targetPreview(recipe, item) {
        if (VALUE_EFFECTS.has(recipe.effect.type)) return valuePreview(recipe, item);
        if (recipe.effect.type === 'lockMod') return sealPreview(recipe.effect, item);
        if (['guaranteedMod', 'guaranteedTaggedMod', 'convertCategoryMod'].includes(recipe.effect.type)) return replacementPreview(recipe, item);
        if (recipe.effect.type === 'echoMod') return echoPreview(item);
        if (recipe.effect.type === 'fixedBenchOption') {
            const index = getSeaGiftBenchSlot(item);
            return new Map([[index, index < 0 ? '기존 줄을 유지하고 새 전용 옵션을 추가합니다.' : '전용 옵션 교체']]);
        }
        if (recipe.effect.type === 'upgradeRarity') return new Map([[-1, '기존 줄은 유지하며, 4줄이 될 때까지 붙일 수 있는 옵션을 추가합니다.']]);
        return null;
    }
    function targetLinesHtml(recipe, item, reason) {
        const labels = reason ? null : targetPreview(recipe, item);
        if (!labels) return `<details><summary>현재 추가 옵션 ${item.stats.length}줄 보기</summary>${linesHtml(item.stats.map(lineText))}</details>`;
        const rows = item.stats.map((stat, index) => {
            const affected = labels.has(index), label = labels.get(index) || (stat.lockedByHoney || stat.lockedByRift ? '봉인 보호' : '유지');
            return `<li data-option-index="${index}" class="${affected ? 'is-affected' : 'is-kept'}${label.includes('제거') ? ' is-risk' : ''}"><b>${esc(label)}</b><span>${index + 1}. ${esc(lineText(stat))}</span></li>`;
        }).join('');
        return `<div class="fishing-preview"><h4>이 장비의 적용 범위</h4><ul class="fishing-lines">${rows}</ul>`
            + (labels.has(-1) ? `<p>${esc(labels.get(-1))}</p>` : '') + '</div>';
    }
    function groupOf(recipe) {
        if (!SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type)) return 'supply';
        return VALUE_EFFECTS.has(recipe.effect.type) ? 'forge' : 'chase';
    }
    function currencyGuide(effect) {
        if (effect.type === 'randomCurrency') return [`제작 재화 ${effect.amount}개를 무작위로 받습니다.`,
            `추첨 후보: ${SEA_GIFT_RANDOM_ORB_KEYS.map(key => ORB_DB[key].name).join(', ')}. 여러 개를 만들면 같은 재화가 나올 수도 있습니다.`];
        return [`${getCurrencyInfo(effect.key).name} ${effect.amount}개를 받습니다.`, effect.key === 'reefFragment'
            ? '채집 전략 화면에서 암초로 설치하면 낚시 게이지가 더 빨리 오릅니다.'
            : '장비 창 → 제작실에서 사용합니다. 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 바꿉니다. 잠수 장비 업그레이드에도 사용합니다.'];
    }
    function guaranteedGuide(effect) {
        const kind = effect.type === 'guaranteedTaggedMod' ? '선택한 계열에서' : '이 장비에 붙을 수 있는 종류 중에서';
        const tier = effect.tierBoost ? ` 새 줄은 장비 제작 단계부터 최대 ${effect.tierBoost}단계 위까지 무작위로 정해집니다.` : '';
        return [`${kind} 무작위 옵션 1줄을 부여합니다.${tier}`,
            '빈 자리에 추가하고, 추가할 수 없으면 같은 접두/접미 종류의 낮은 등급 미봉인 줄을 바꿉니다.'
            + (effect.bonusRemoveMod ? ' 이어서 다른 미봉인 일반 옵션 중 가장 낮은 등급 1줄도 제거합니다. 원하는 옵션도 없어질 수 있습니다.' : '')];
    }
    function benchGuide(effect) {
        const options = OCEAN_WORKBENCH_OPTIONS.filter(option => !!effect.topTier === (option.id === 'oceanLeviathanCrown'));
        return [effect.topTier ? '리바이어던 전용 보스 피해 옵션을 부여합니다.' : '심해 전용 옵션 4종 중 1종을 무작위로 부여합니다.',
            options.map(option => `${getStatName(option.statId)} ${formatSignedValue(option.statId, option.min)}~${formatValue(option.statId, option.max)}`).join(' / ')
            + '. 수치는 범위 안에서 무작위입니다. 기존 미봉인 심해 옵션을 교체하며, 없으면 빈 자리에 추가합니다. 꽉 찼으면 가장 낮은 등급의 미봉인 일반 줄을 교체합니다.'];
    }
    function sealGuide(effect, item) {
        const count = effect.count, indexes = item ? getSeaGiftEditableIndexes(item).slice(0, count) : [];
        return [`봉인되지 않은 옵션을 위에서부터 ${count}줄 영구 봉인합니다. 봉인한 줄은 이후 재굴림에서 보호됩니다.`,
            (indexes.length ? `봉인될 줄: ${indexes.map(index => `${index + 1}번 ${lineText(item.stats[index])}`).join(' / ')}. ` : '줄을 직접 지정하는 방식은 아닙니다. ')
            + (effect.bonusTaggedReroll ? '봉인 후 남는 첫 번째 줄은 선택한 계열의 무작위 옵션으로 교체합니다.' : '봉인은 되돌릴 수 없습니다.')];
    }
    const EFFECT_GUIDES = Object.freeze({
        safeReroll: () => ['무작위 1줄의 수치를 같은 등급 안에서 다시 굴립니다.', '복합 옵션의 부수치까지 비교하여 하나라도 낮게 나오면 그 줄 전체를 유지합니다. 값이 그대로여도 물고기는 소모됩니다.'],
        twinReroll: () => ['무작위 최대 2줄의 수치를 같은 등급 안에서 다시 굴립니다.', '가능한 줄이 1줄이면 그 줄만 굴립니다. 옵션 종류는 유지되지만 수치는 낮아질 수 있습니다.'],
        tierStepUp: () => ['최고 등급이 아닌 무작위 1줄을 한 단계 높은 등급으로 다시 굴립니다.', '옵션 종류는 유지되고 수치는 새 등급 범위 안에서 무작위로 정해집니다.'],
        taggedReroll: effect => [effect.allMatching ? '선택한 계열의 가공 가능한 모든 줄을 한 단계 높은 등급으로 다시 굴립니다. 최고 등급 줄은 등급만 유지하고 수치를 다시 굴립니다.' : '선택한 계열 중 무작위 1줄의 수치를 같은 등급 안에서 다시 굴립니다.', '옵션 종류와 다른 계열의 줄은 유지됩니다. 새 수치는 무작위이며 낮아질 수도 있습니다.'],
        convertCategoryMod: () => ['봉인되지 않은 무작위 1줄을 선택한 계열의 무작위 옵션으로 바꿉니다.', '기존 옵션은 사라집니다. 바꿀 줄이나 새 옵션의 정확한 종류를 직접 고를 수는 없습니다.'],
        echoMod: () => ['미봉인 옵션 중 가장 높은 등급에서 복사할 자리가 있는 한 줄을 고릅니다. 복합 옵션의 부수치까지 모두 절반으로 복사합니다.', '복사본은 다른 미봉인 줄 하나를 무작위로 덮어씁니다. 기존 옵션이 사라지며, 이미 메아리 줄이 있으면 사용할 수 없습니다.'],
        upgradeRarity: () => ['장비를 희귀 등급으로 올리고, 추가 옵션이 4줄이 될 때까지 붙일 수 있는 옵션을 추가합니다.', '기존 옵션은 유지됩니다. 새 옵션의 종류와 수치는 무작위입니다. 이미 희귀 이상이면 사용할 수 없습니다.'],
        guaranteedMod: guaranteedGuide, guaranteedTaggedMod: guaranteedGuide, fixedBenchOption: benchGuide, lockMod: sealGuide,
        currency: currencyGuide, randomCurrency: currencyGuide
    });
    function guideHtml(recipe, count) {
        const effect = count > 1 ? { ...recipe.effect, amount: recipe.effect.amount * count } : recipe.effect;
        const [summary, detail] = EFFECT_GUIDES[effect.type](effect, getSelectedSeaGiftEquipmentTarget());
        return `<div class="fishing-effect"><strong>어떻게 바뀌나요?</strong><p>${esc(summary)}</p><p class="fishing-effect-note">${esc(detail)}</p></div>`;
    }
    function categoryHtml(recipe) {
        const category = categoryOf(recipe);
        if (!category) return '';
        const item = getSelectedSeaGiftEquipmentTarget();
        return `<label class="fishing-category-label">원하는 옵션 계열<select class="fishing-category" aria-label="옵션 계열" onchange="fishingUi.pick('${recipe.id}', this.value)">`
            + CATEGORY_OPTIONS.map(cat => {
                const reason = item ? getSeaGiftEffectBlockReason(item, recipe.effect, cat) : '';
                return `<option value="${cat}"${cat === category ? ' selected' : ''}>${cat}${reason ? ` (불가: ${esc(reason)})` : ''}</option>`;
            }).join('') + '</select></label>';
    }
    function recipeHtml(recipe, st) {
        const count = selectedCount(recipe), status = getSeaGiftRecipeStatus(recipe.id, null, categoryOf(recipe), count);
        const needsItem = SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type);
        const title = count > 1 ? `${recipe.effect.type === 'currency' ? getCurrencyInfo(recipe.effect.key).name : '무작위 재화'} ${recipe.effect.amount * count}개` : TITLES[recipe.id];
        return `<article data-sea-recipe="${recipe.id}" class="fishing-recipe${status.ready ? ' is-ready' : ''}"><header><small>${needsItem ? '선택한 장비를 가공' : '장비 선택 없이 제작'}</small><h4>${esc(title)}</h4></header>`
            + `${quantityHtml(status)}${categoryHtml(recipe)}${needsItem ? targetHtml(recipe) : ''}${guideHtml(recipe, count)}`
            + `<section class="fishing-materials"><h4>사용할 물고기</h4>${costHtml(recipe, st, count)}</section>`
            + `<div class="fishing-craft-action"><p${status.ready ? '' : ' class="is-blocked"'}>${esc(status.reason || '준비 완료, 누르면 물고기를 씁니다.')}</p>`
            + `<button type="button" data-sea-craft onclick="fishingUi.craft('${recipe.id}')"${status.ready ? '' : ' disabled'}>${count}회 제작</button></div>`
            + `<div class="fishing-result" role="status" aria-live="polite">${resultHtml(recipe, status.item)}</div></article>`;
    }
    function recipeListHtml(recipes, recipe) {
        return `<nav class="fishing-recipe-list" aria-label="제작법">${recipes.map(row => {
            const status = statusOf(row), cost = Object.entries(row.requires).map(([key, count]) => `${OCEAN_FISH_DB[key].name} ${count}`).join(' + ');
            return `<button type="button" data-recipe-choice="${row.id}" class="${row.id === recipe.id ? 'is-selected' : ''}" aria-pressed="${row.id === recipe.id}" onclick="fishingUi.choose('${row.id}')">`
                + `<strong>${esc(TITLES[row.id])}</strong><span>${esc(cost)}</span><small>${esc(status.reason || '제작 가능')}</small></button>`;
        }).join('')}</nav>`;
    }
    function giftsHtml(st) {
        const group = document.getElementById('fishing-workshop').dataset.recipeGroup;
        const all = SEA_GIFT_RECIPES.filter(recipe => groupOf(recipe) === group);
        const stocked = all.filter(row => statusOf(row).materialReady);
        const recipes = materialsOnly ? all.filter(row => stocked.includes(row) || resultIsCurrent(row, statusOf(row).item)) : all;
        const recipe = recipes.find(row => row.id === selectedRecipes[group]) || recipes[0];
        if (recipe) selectedRecipes[group] = recipe.id;
        const picker = `<label class="fishing-recipe-picker">제작법<select aria-label="심해 제작법" onchange="fishingUi.choose(this.value)">`
            + recipes.map(row => `<option value="${row.id}"${row.id === recipe.id ? ' selected' : ''}>[${esc(statusOf(row).reason || '제작 가능')}] ${esc(TITLES[row.id])}</option>`).join('') + '</select></label>';
        return `<p class="fishing-workshop-intro">낚은 물고기로 재화를 만들거나 장비를 다듬으세요. 제작법을 고르면 소모 재료와 바뀌는 내용을 확인할 수 있습니다.</p>`
            + `<div class="fishing-workshop-toolbar"><span>${GROUPS[group]}, 재료 충분 ${stocked.length}/${all.length}개</span><button type="button" onclick="switchMapSubtab('map-tab-ocean')">재료 모으러 잠수</button></div>`
            + `<label class="fishing-filter"><input type="checkbox" onchange="fishingUi.filterMaterials(this.checked)"${materialsOnly ? ' checked' : ''}>재료가 충분한 제작법만 보기</label>`
            + (recipe ? `${picker}<div class="fishing-workshop-layout">${recipeListHtml(recipes, recipe)}${recipeHtml(recipe, st)}</div>`
                : '<div class="fishing-empty"><p>이 종류에는 재료가 충분한 제작법이 없습니다.</p><button type="button" onclick="fishingUi.filterMaterials(false)">모든 제작법과 부족한 재료 보기</button></div>');
    }
    const resultIsCurrent = (recipe, item) => lastResult && lastResult.owner === game && lastResult.recipeId === recipe.id && lastResult.target === item
        && (!item || JSON.stringify(lastResult.after) === JSON.stringify(itemSnapshot(item)));
    function resultHtml(recipe, item) {
        if (!resultIsCurrent(recipe, item)) return '';
        if (!lastResult.ok) return '<strong>제작하지 못했습니다</strong><p>현재 장비에 이 제작법을 적용할 수 없습니다. 물고기는 소모되지 않았습니다.</p>';
        const spent = Object.entries(recipe.requires).map(([key, count]) => `${OCEAN_FISH_DB[key].name} ${count * lastResult.count}마리`).join(', ');
        if (!item) return currencyResultHtml(recipe) + `<small>사용한 재료: ${esc(spent)}</small>`;
        const unchanged = JSON.stringify(lastResult.before) === JSON.stringify(lastResult.after);
        return `<strong>제작 완료: ${esc(lastResult.name)}</strong><p>${unchanged ? '옵션이 그대로 유지되었습니다. 물고기는 소모되었습니다.' : '바뀐 부분만 모았습니다.'}</p>`
            + changedLinesHtml(lastResult.before, lastResult.after) + `<small>사용한 재료: ${esc(spent)}</small>`;
    }
    /** Match duplicate lines once each. Added/removed options must not be paired with an unrelated line. */
    function changedLinesHtml(before, after) {
        const added = [...after.lines], removed = [], kept = [];
        before.lines.forEach(line => {
            const index = added.indexOf(line);
            if (index < 0) removed.push(line);
            else { kept.push(line); added.splice(index, 1); }
        });
        const rarity = before.rarity === after.rarity ? '' : `<p class="fishing-rarity-change">장비 등급: ${esc(before.rarity)} → ${esc(after.rarity)}</p>`;
        const changes = removed.length || added.length ? `<div class="fishing-result-compare"><section class="is-before"><h4>제작 전 (바뀐 줄)</h4>${linesHtml(removed, '기존 줄 교체 없음')}</section>`
            + `<section class="is-after"><h4>제작 후 (새 결과)</h4>${linesHtml(added, '해당 옵션 제거됨')}</section></div>` : '';
        return rarity + changes + (kept.length ? `<details class="fishing-kept"><summary>그대로 유지된 옵션 ${kept.length}줄</summary>${linesHtml(kept)}</details>` : '');
    }
    function currencyResultHtml(recipe) {
        const gains = lastResult.gains.map(row => `${getCurrencyInfo(row.key).name} +${row.amount}, 현재 보유 ${game.currencies[row.key] || 0}`);
        let action = '';
        if (recipe.effect.type === 'currency') {
            const reef = recipe.effect.key === 'reefFragment';
            const canOpen = reef || contentProgression.canOpen('item-tab-craft');
            action = canOpen ? `<button type="button" class="fishing-result-next" onclick="fishingUi.openRewardUse('${recipe.effect.key}')">${reef ? '채집 전략에서 암초 설치하기' : '제작실에서 심해의 파편 보기'}</button>`
                : '<p>장비 제작실을 해금하면 심해의 파편을 사용할 수 있습니다.</p>';
        }
        return `<strong>제작 완료: ${lastResult.count}회</strong>${linesHtml(gains)}${action}`;
    }
    const itemSnapshot = item => item && ({ rarity: ITEM_RARITY_LABELS[item.rarity], lines: item.stats.map(lineText) });
    function craft(recipeId) {
        const recipe = SEA_GIFT_RECIPES.find(row => row.id === recipeId);
        if (!recipe) return;
        const count = selectedCount(recipe), status = getSeaGiftRecipeStatus(recipeId, null, categoryOf(recipe), count);
        if (!status.ready) { render(); return; }
        const keys = recipe.effect.type === 'currency' ? [recipe.effect.key] : SEA_GIFT_RANDOM_ORB_KEYS;
        const balances = Object.fromEntries(keys.map(key => [key, game.currencies[key] || 0]));
        const before = itemSnapshot(status.item);
        const ok = craftSeaGift(recipeId, null, { category: categoryOf(recipe), count });
        lastResult = { recipeId, count, owner: game, target: status.item, ok, before, after: itemSnapshot(status.item), name: status.item && status.item.name,
            gains: keys.filter(key => game.currencies[key] > balances[key]).map(key => ({ key, amount: game.currencies[key] - balances[key] })) };
        render();
        document.querySelector('#ui-sea-gift-panel .fishing-result').scrollIntoView({ block: 'nearest' });
    }
    /** A category picked on a card: the card's ready state and button follow it. */
    function pick(recipeId, category) {
        if (CATEGORY_OPTIONS.includes(category)) chosen[recipeId] = category;
        lastResult = null;
        render();
    }
    function choose(recipeId) {
        const recipe = SEA_GIFT_RECIPES.find(row => row.id === recipeId);
        if (!recipe) return;
        selectedRecipes[groupOf(recipe)] = recipeId;
        if (lastResult?.recipeId !== recipeId) lastResult = null;
        if (!statusOf(recipe).materialReady && !resultIsCurrent(recipe, statusOf(recipe).item)) materialsOnly = false;
        selectGroup(groupOf(recipe), false);
        document.querySelector('#ui-sea-gift-panel .fishing-recipe').scrollIntoView({ block: 'start' });
    }
    function selectGroup(group, clearResult = true) {
        if (!Object.hasOwn(GROUPS, group)) return;
        batchChoice = null;
        document.getElementById('fishing-workshop').dataset.recipeGroup = group;
        document.querySelector('.sea-gift-group-picker select').value = group;
        if (clearResult) lastResult = null;
        render();
    }
    function filterMaterials(enabled) {
        materialsOnly = !!enabled;
        render();
    }
    function openRewardUse(key) {
        if (key === 'reefFragment') {
            switchMapSubtab('map-tab-fishing');
            document.getElementById('fishing-gather-tab').click();
            document.querySelector('.fishing-reef').scrollIntoView({ block: 'center' });
            document.querySelector('.fishing-reef button').focus({ preventScroll: true });
            return;
        }
        if (key !== 'oceanRerollShard' || !contentProgression.canOpen('item-tab-craft')) return;
        switchTab('tab-items');
        if (document.body.classList.contains('desktop-windowed-ui')) openWindow('tab-items');
        switchItemSubtab('item-tab-craft');
        craftingWorkspaceUi.openInventory(false, key, true);
    }
    function pickTarget(kind) {
        window.openCraftItemPickerOverlay(kind);
        document.getElementById('craft-picker-title').textContent = '심해 제작에 쓸 장비 선택';
        document.querySelector('#craft-item-picker-overlay .craft-picker-desc').textContent = '장비를 골라도 재료는 쓰지 않습니다.';
    }
    function openWorkshop() {
        switchMapSubtab('map-tab-fishing');
        document.getElementById('fishing-workshop-tab').click();
        document.getElementById('fishing-workshop').scrollIntoView({ block: 'start' });
    }

    function lockedHtml() {
        return `<div class="fishing-head"><div><h3>낚시</h3><p>루프 ${OCEAN_UNLOCK_LOOP} 이후 심해가 해금되면 낚을 수 있습니다.</p></div><div class="fishing-last"><span class="fishing-fish is-empty"></span><div><small>잠김</small><strong>봉인됨</strong></div></div></div>`;
    }
    /** Native inputs become dirty after interaction; changing HTML attributes alone does not reset their live values. */
    function syncWorkshopControls(gifts) {
        gifts.querySelector('.fishing-filter input').checked = materialsOnly;
        const picker = gifts.querySelector('.fishing-recipe-picker select'), category = gifts.querySelector('.fishing-category');
        const recipeId = gifts.querySelector('[data-sea-recipe]')?.dataset.seaRecipe;
        if (picker) picker.value = recipeId;
        if (category) category.value = categoryOf(SEA_GIFT_RECIPES.find(row => row.id === recipeId));
        const quantity = gifts.querySelector('.fishing-quantity select');
        if (quantity) quantity.value = selectedCount(SEA_GIFT_RECIPES.find(row => row.id === recipeId));
    }
    function render() {
        const panel = document.getElementById('ui-fishing-panel'), gifts = document.getElementById('ui-sea-gift-panel');
        if (!panel) return;
        const st = ensureOceanState();
        if (!st.unlocked) {
            updateGamePanelMarkup(panel, lockedHtml());
            if (gifts) updateGamePanelMarkup(gifts, '');
            return;
        }
        updateGamePanelMarkup(panel, gatherHtml(st));
        renderCollection(st, getOceanFishCollectionProgress(st));
        if (!gifts) return;
        updateGamePanelMarkup(gifts, giftsHtml(st));
        syncWorkshopControls(gifts);
    }
    return Object.freeze({ render, craft, pick, choose, selectGroup, setCount, filterMaterials, openRewardUse, pickTarget, openWorkshop });
})();

safeExposeGlobals({ fishingUi });
