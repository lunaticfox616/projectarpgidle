/** 낚시(지도 창의 낚시, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 4순위). 설명 문장과 회색 "재료 부족" 단추가 줄지어 있던 화면이다.
 * 어장: 최근 포획 물고기, 낚시 게이지와 희귀 조짐 막대(0%에도 빈 막대가 보인다), 채집 전략 카드(효과 칩), 암초 막대.
 * 도감: 물고기 칸(희귀도 색의 도트 물고기, 미발견은 그림자와 깊이), 발견 보상 줄(진행 막대와 받기).
 * 바다의 선물: 장비 가공 대상, 갈래별 제작법(재료 물고기와 보유/필요, 만들 수 있으면 금빛). 효과 설명은 장비 가공과 심연의 비전만 둔다.
 * 규칙과 계산은 js/passives.js(ensureOceanState, craftSeaGift, getSeaGiftRecipeStatus, setOceanFishingStrategy …). */
const fishingUi = (() => {
    const CATEGORY_OPTIONS = Object.freeze(['공격', '방어/생명', '속도/치명', '저항']);
    const CHASE_FISH = new Set(['tidelordKoi', 'prismaticHorror', 'kingLeviathan']);
    const CATEGORY_EFFECTS = new Set(['guaranteedTaggedMod', 'taggedReroll', 'convertCategoryMod']);
    const GROUPS = Object.freeze([['supply', '재화 정제', true], ['forge', '장비 가공', true], ['chase', '심연의 비전', false]]);

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
        const workshop = "document.getElementById('fishing-workshop-tab')?.click(); document.getElementById('fishing-workshop').scrollIntoView({ block: 'start' })";
        return `<div class="fishing-head"><div><h3>심해 어장</h3><p>심해 전투 구간마다 게이지가 오르고 100%에서 물고기를 낚습니다.</p></div><div class="fishing-last">${catchHtml}</div></div>`
            + `<div class="fishing-meters">${meterHtml('낚시 게이지', st.fishingGauge, '')}${meterHtml('희귀 조짐', st.rareFishPity, 'is-pity')}</div>`
            + `<div class="fishing-quick"><button type="button" onclick="switchMapSubtab('map-tab-ocean')">잠수하러 가기</button><button type="button" onclick="${workshop}">바다의 선물 제작</button></div>`
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
    function costHtml(recipe, st) {
        return Object.keys(recipe.requires).map(key => {
            const have = Math.floor(st.fishStock[key] || 0), need = recipe.requires[key];
            return `<span class="fishing-cost${have >= need ? ' is-ok' : ''}">${fishIcon(key, (st.fishCaughtTotal[key] || 0) > 0)}${esc(OCEAN_FISH_DB[key].name)} <b>${have}/${need}</b></span>`;
        }).join('');
    }
    function recipeHtml(recipe, st, group) {
        const status = getSeaGiftRecipeStatus(recipe.id), parsed = recipe.desc.match(/^【([^】]+)】\s*(.*)$/);
        const title = parsed ? parsed[1] : recipe.desc, note = parsed && group !== 'supply' ? parsed[2] : '';
        const select = needsCategory(recipe) ? `<select class="fishing-category" aria-label="옵션 계열">${CATEGORY_OPTIONS.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select>` : '';
        return `<article data-sea-recipe="${recipe.id}" class="fishing-recipe${status.ready ? ' is-ready' : ''}"><div class="fishing-recipe-copy"><strong>${esc(title)}</strong>`
            + `${note ? `<small>${esc(note)}</small>` : ''}<span class="fishing-costs">${costHtml(recipe, st)}</span></div>`
            + `<div class="fishing-recipe-actions">${select}<button type="button" onclick="fishingUi.craft('${recipe.id}')"${status.ready ? '' : ' disabled'}>${status.reason || '제작'}</button></div></article>`;
    }
    function targetHtml() {
        const item = getSelectedSeaGiftEquipmentTarget(), selected = getSelectedCraftItem();
        const text = item ? `<strong class="item-title ${item.rarity || 'normal'}">[${esc(getItemSlotDisplayLabel(item, '장비'))}] ${esc(item.name)}</strong><span>추가 옵션 ${(item.stats || []).length}줄</span>`
            : `<strong>${selected ? '장비가 아닌 대상' : '대상 없음'}</strong><span>${selected ? '장비만 가공할 수 있습니다' : '장비 가공에 쓸 장비를 고르세요'}</span>`;
        return `<div class="fishing-target${item ? ' is-on' : ''}"><div><small>장비 가공 대상</small>${text}</div>`
            + `<div><button type="button" onclick="openCraftItemPickerOverlay('equip')">장착 장비</button><button type="button" onclick="openCraftItemPickerOverlay('inventory')">인벤토리</button></div></div>`;
    }
    function groupOf(recipe) {
        if (Object.keys(recipe.requires).some(key => CHASE_FISH.has(key))) return 'chase';
        return SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type) ? 'forge' : 'supply';
    }
    function giftsHtml(st) {
        const groups = GROUPS.map(([key, title, open]) => {
            const recipes = SEA_GIFT_RECIPES.filter(recipe => groupOf(recipe) === key);
            const ready = recipes.filter(recipe => getSeaGiftRecipeStatus(recipe.id).ready).length;
            return `<details class="fishing-group" data-ui-disclosure="sea-gift-${key}"${open ? ' open' : ''}><summary><strong>${title}</strong>`
                + `${ready ? `<em>제작 가능 ${ready}</em>` : ''}<b>${recipes.length}</b></summary><div class="fishing-recipes">${recipes.map(recipe => recipeHtml(recipe, st, key)).join('')}</div></details>`;
        }).join('');
        return `${targetHtml()}<div class="fishing-groups">${groups}</div>`;
    }
    /** Keeps the open groups, chosen categories and focus: the first draw writes everything, later ones patch the target and each recipe. */
    function paintGifts(panel, html) {
        if (!panel.firstElementChild) { panel.innerHTML = html; panel.__fishingHtml = html; return; }
        if (panel.__fishingHtml === html) return;
        const next = document.createElement('template');
        next.innerHTML = html;
        panel.querySelector('.fishing-target').outerHTML = next.content.querySelector('.fishing-target').outerHTML;
        next.content.querySelectorAll('[data-sea-recipe]').forEach(card => {
            const current = panel.querySelector(`[data-sea-recipe="${card.dataset.seaRecipe}"]`);
            const copy = current.querySelector('.fishing-recipe-copy'), button = current.querySelector('.fishing-recipe-actions button'), nextButton = card.querySelector('.fishing-recipe-actions button');
            copy.innerHTML = card.querySelector('.fishing-recipe-copy').innerHTML;
            current.className = card.className;
            button.disabled = nextButton.disabled;
            button.textContent = nextButton.textContent;
        });
        next.content.querySelectorAll('.fishing-group > summary').forEach((summary, index) => { panel.querySelectorAll('.fishing-group > summary')[index].innerHTML = summary.innerHTML; });
        panel.__fishingHtml = html;
    }
    function craft(recipeId) {
        const recipe = SEA_GIFT_RECIPES.find(row => row.id === recipeId);
        if (!recipe) return;
        const select = document.querySelector(`[data-sea-recipe="${recipeId}"] .fishing-category`);
        if (needsCategory(recipe)) craftSeaGift(recipeId, null, { category: select ? select.value : CATEGORY_OPTIONS[0] });
        else craftSeaGift(recipeId);
        render();
    }

    function lockedHtml() {
        return `<div class="fishing-head"><div><h3>낚시</h3><p>루프 ${OCEAN_UNLOCK_LOOP} 이후 심해가 해금되면 낚을 수 있습니다.</p></div><div class="fishing-last"><span class="fishing-fish is-empty"></span><div><small>잠김</small><strong>봉인됨</strong></div></div></div>`;
    }
    function render() {
        const panel = document.getElementById('ui-fishing-panel'), gifts = document.getElementById('ui-sea-gift-panel');
        if (!panel) return;
        const st = ensureOceanState();
        if (!st.unlocked) {
            updateGamePanelMarkup(panel, lockedHtml());
            if (gifts) gifts.innerHTML = '';
            return;
        }
        updateGamePanelMarkup(panel, gatherHtml(st));
        renderCollection(st, getOceanFishCollectionProgress(st));
        if (!gifts) return;
        const initialize = !gifts.firstElementChild;
        captureUiDisclosureState(gifts);
        paintGifts(gifts, giftsHtml(st));
        if (initialize) restoreUiDisclosureState(gifts);
    }
    return Object.freeze({ render, craft });
})();

safeExposeGlobals({ fishingUi });
