// Underworld controls stay mounted while live resources and combat estimates change.
const underworldRuneUi = (() => {
    let closePicker = null;
    function mountOverlay(overlay, returnSelector) {
        overlay.querySelector('.underworld-rune-overlay-title').id = 'underworld-rune-title';
        closePicker = bindGamePicker(overlay, {titleId:'underworld-rune-title',
            closeSelector:'.underworld-rune-overlay-head button', returnSelector, onClose:hideInfoTooltip});
    }
    function closeOverlay() {
        if (closePicker) closePicker();
        closePicker = null;
    }

    function validSlot(state, index) {
        return Number.isInteger(index) && index >= 0 && index < Math.min(6, state.unlockedSlots);
    }
    const updateMarkup = updateGamePanelMarkup;
    /** 지하석 그림(assets/items/underworld-stones, 2026-10-25 Codex): 번호마다 한 장, 도트 하나가 1px이고 줄여서 부드럽게 그린다. */
    const iconHtml = no => {
        const value = Number(no), def = Number.isInteger(value) && value > 0 ? getUnderworldRuneDef(value) : null;
        return def ? `<img class="underworld-stone-icon" src="assets/items/underworld-stones/uw_rune_${def.no}.png" alt="" draggable="false" decoding="async">` : '';
    };

    function progressLabel(state) {
        const slots = Math.max(0, Math.floor(state.unlockedSlots || 0));
        const max = Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0));
        if (!max) return '지하계 10층 격파 시 첫 지하석과 슬롯 해금';
        return `${slots}/6 슬롯, 지하석 ${max === 1 ? '1' : `1~${max}`} 해금`;
    }

    function ownedNumbers(state) {
        return [...new Set([...state.obtainedRunes, ...state.equippedRunes.slice(0, state.unlockedSlots)]
            .filter(no => no && getUnderworldRuneDef(no)))].sort((a, b) => a - b);
    }

    function growthCost(level, reroll) {
        return reroll ? {underCopper:180+level*110,underSilver:95+level*80,underGold:36+level*34}
            : {underCopper:260+level*220,underSilver:150+level*150,underGold:55+level*58,runeShard:120+level*90};
    }

    const COST_NAMES = Object.freeze({underCopper:'구리',underSilver:'은',underGold:'금',runeShard:'지하석 조각'});
    /** 재화 이름과 수를 제 색으로(css/map-tones.css). */
    const costHtml = cost => Object.entries(cost).map(([key, value]) => `<i class="is-${key}">${COST_NAMES[key]} ${value}</i>`).join(', ');
    function costText(cost) {
        return Object.entries(cost).map(([key, value]) => `${COST_NAMES[key]} ${value}`).join(', ');
    }

    function growthChoice(state, no, reroll) {
        const def = getUnderworldRuneDef(no), level = state.enhanceLvByNo[no] || 0;
        const cost = growthCost(level, reroll);
        const missing = Object.entries(cost).some(([key, amount]) => (game.currencies[key] || 0) < amount);
        const effect = `${getStatName(def.stat)} +${formatValue(def.stat, def.val*(1+level*0.01))}${P_STATS[def.stat]?.isPct ? '%' : ''}`;
        return {value:no,label:`${def.name}, 지하석 ${no}, +${level}${reroll ? '' : ` → +${level+1}`}`,
            detail:`${effect}\n${costText(cost)}${missing ? _t('\n재료 부족') : ''}`};
    }

    async function chooseGrowth(reroll) {
        if (!assertBuildEditable()) return null;
        const state = ensureUnderworldRuneState();
        const numbers = ownedNumbers(state).filter(no => reroll ? state.enhanceLvByNo[no] >= 5 : (state.enhanceLvByNo[no] || 0) < 15);
        if (!numbers.length) {
            addLog(reroll ? '보유 또는 장착한 +5 이상 지하석이 필요합니다.' : '강화 가능한 보유/장착 지하석이 없습니다. (최대 +15)', 'attack-monster');
            return null;
        }
        const levels = new Map(numbers.map(no => [no,state.enhanceLvByNo[no] || 0]));
        const no = await requestGameChoice({title:reroll ? '지하석 보너스 리롤' : '지하석 강화',
            message:_t('같은 번호의 모든 지하석에 적용됩니다.'),confirmLabel:reroll ? '옵션 리롤' : '지하석 강화',
            choices:numbers.map(no => growthChoice(state,no,reroll))});
        if (no === null) return null;
        return validateGrowthChoice(state, no, levels.get(no), reroll);
    }

    function validateGrowthChoice(state, no, level, reroll) {
        if (!assertBuildEditable()) return null;
        if (game.underworldRunes !== state || !ownedNumbers(state).includes(no) || (state.enhanceLvByNo[no] || 0) !== level) {
            addLog(_t('지하석 상태가 변경되었습니다. 다시 선택하세요.'), 'attack-monster'); return null;
        }
        const cost = growthCost(level, reroll);
        if (Object.entries(cost).some(([key, value]) => (game.currencies[key] || 0) < value)) {
            addLog(_t('재료 부족, {cost}', { cost: costText(cost) }), 'attack-monster'); return null;
        }
        return {state,no,level,cost};
    }

    // 지하계 층 보상(js/combat-kill-rewards.js grantUnderworldFloorMilestone): 도메인은 이벤트만 내고 기록은 여기서 남긴다.
    window.addEventListener('project-idle:underworld-milestone', ({ detail }) => addLog(detail.text, 'loot-unique'));

    // ── 지하계 지도 화면: 탐사, 지하석, 장비 가공 쪽(2026-10-25 사용자: 지하석 체계를 다듬고 장비 인챈트가 무슨 효과인지 보이게,
    // 위 탭 스타일 맞춤). 쪽은 지도 창 위 둘째 줄(js/exploration-atlas-ui.js)이 고르고, 단추는 예전 동작(js/ui.js)을 그대로 부른다.
    const PAGES = Object.freeze([['entry', '탐사'], ['stones', '지하석'], ['gear', '장비 가공']]);
    let page = 'entry';
    function pages() {
        const select = id => { page = PAGES.some(([key]) => key === id) ? id : 'entry'; render(); };
        return {select, items: PAGES.map(([id, label]) => ({id, label, on: page === id}))};
    }
    const held = key => Math.max(0, Math.floor(Number((game.currencies || {})[key]) || 0));
    // 능력치 이름의 '(%)'는 값 뒤 %로 옮긴다(피해 증가 +8~24%).
    const statName = stat => getStatName(stat).replace(/\s*\(%\)$/, '');
    const pct = stat => (P_STATS[stat]?.isPct || /\(%\)$/.test(getStatName(stat)) ? '%' : '');
    const statText = (stat, value) => `${statName(stat)} +${formatValue(stat, value)}${pct(stat)}`;
    const rangeText = (stat, min, max) => `${formatValue(stat, min)}${max === min ? '' : `~${formatValue(stat, max)}`}${pct(stat)}`;
    const RESOURCES = Object.freeze([['runeShard', '지하석 조각'], ['underCopper', '구리'], ['underSilver', '은'], ['underGold', '금']]);
    const resourcesHtml = keys => `<div class="underworld-resource-strip">${RESOURCES.filter(([key]) => keys.includes(key))
        .map(([key, name]) => `<span class="is-${key}">${name} <b>${held(key)}</b></span>`).join('')}</div>`;
    /** 장비 인챈트 한 줄의 비용(data/constants.js UNDERWORLD_ENCHANT_POOLS의 세기). */
    function enchantCost(strength) {
        return {underCopper: Math.max(4, strength * 6), underSilver: Math.max(2, strength * 3), underGold: Math.max(1, strength - 1)};
    }
    /** 한계돌파 비용 [구리, 은, 금](data/constants.js UNDERWORLD_LIMIT_BREAK). */
    function limitBreakCost(slot) {
        const kind = slot.includes('반지') || slot === '목걸이' || slot === '허리띠' ? 'accessory' : slot === '무기' ? 'weapon' : 'armour';
        return UNDERWORLD_LIMIT_BREAK.costs[kind];
    }

    function render() {
        const list = document.getElementById('ui-underworld-list'), panel = document.getElementById('ui-underworld-panel');
        if (!list || !panel) return;
        captureUiDisclosureState(panel);
        updateMarkup(list, page === 'entry' ? entryCardHtml() : '');
        updateMarkup(panel, ({entry: entryPageHtml, stones: stonesPageHtml, gear: gearPageHtml})[page]());
        restoreUiDisclosureState(panel);
    }
    function entryCardHtml() {
        const progress = game.underworldProgress || {}, floor = Math.max(1, Math.floor(progress.currentFloor || 1));
        const highest = Math.max(1, Math.floor(progress.highestFloor || 1)), block = getUnderworldEntryBlock(game), off = block ? 'disabled' : '';
        const lock = block ? `<div class="underworld-entry-block"><small class="underworld-lock">${escapeHTML(block.label)}</small>
            ${contentUnlockUi.progressButton(block.route, '조건을 채울 곳 보기')}</div>` : '';
        const other = floor === highest ? '' : `<button type="button" data-exploration-departure onclick="enterUnderworldFloor(${floor})" ${off}>${_t('{floor}층 입장', { floor })}</button>`;
        return `<section class="underworld-entry-card ${game.currentZoneId === UNDERWORLD_ZONE_ID ? 'current' : ''}"><div class="underworld-entry-copy">`
            + `<span>${_t('최고층 도전 기준, 현재 선택 {floor}층', { floor })}</span><strong>${_t('최고 개방 {highest}층', { highest })}</strong><div>${buildMapPowerEstimateHtml(getUnderworldZone(highest))}</div>${lock}</div>`
            + `<div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterUnderworldFloor(${highest})" ${off}>${_t('최고층 {highest} 입장', { highest })}</button>`
            + `${other}<button type="button" data-exploration-departure onclick="enterUnderworldPrompt()" ${off}>${_t('다른 층…')}</button></div></section>`;
    }
    function entryPageHtml() {
        const tickets = [['uberRootTicketFlame', '화염', 'is-fire'], ['uberRootTicketFrost', '냉기', 'is-cold'], ['uberRootTicketStorm', '번개', 'is-light'], ['uberRootTicketChaos', '카오스', 'is-chaos']];
        return `<div class="underworld-lower-grid">${skyStoneHtml()}<section class="underworld-upgrade-card underworld-reward-card">${nextRewardHtml()}`
            + `<div class="underworld-ticket-strip"><small>${_t('그림자 뿌리 입장권')}</small>${tickets.map(([key, name, tone]) => `<span class="has-stat ${tone}">${name} <b>${held(key)}</b></span>`).join('')}</div></section></div>`;
    }
    function nextRewardHtml() {
        const state = ensureUnderworldRuneState(), rule = UNDERWORLD_DEEP_FLOOR_REWARD;
        const nextNo = Math.min(30, Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0))) + 1;
        const paid = Math.max(rule.fromFloor, Math.floor(game.underworldProgress.deepRewardFloor || 0));
        const floor = nextNo <= 30 ? nextNo * 10 : rule.fromFloor + (Math.floor((paid - rule.fromFloor) / rule.every) + 1) * rule.every;
        const reward = window.GameModules.state.underworldMilestoneReward(floor);
        const slots = reward.slots > state.unlockedSlots ? `<span>${_t('지하석 슬롯 {slots}/6', { slots: reward.slots })}</span>` : '';
        const stone = reward.rune ? `<div class="underworld-next-stone">${iconHtml(reward.rune.no)}<div><strong>${_t('{name} 지하석 1개', { name: escapeHTML(_t(reward.rune.name)) })}</strong>
            <small>${getUnderworldRuneEffectHtml(reward.rune.no)}</small><span>${_t('지하석 1~{no} 해금', { no: reward.rune.no })}</span>${slots}</div></div>` : '';
        const materials = RESOURCES.filter(([key]) => reward.currencies[key]).map(([key, name]) => `<span class="is-${key}">${name} <b>${_t('{currencies}개', { currencies: reward.currencies[key] })}</b></span>`).join('');
        return `<div><strong>${_t('{floor}층 보상', { floor })}</strong>${stone}<div class="underworld-ticket-strip">${materials}</div><small>${_t('15층부터 지속 피해')}</small></div>`;
    }
    function skyStoneHtml() {
        const tower = ensureSkyTowerState(), level = Math.max(0, Math.floor((tower.skyStone || {}).level || 0));
        const maxed = level >= getSkyStoneMaxLevel(), cost = getSkyStoneNextCost();
        return `<section class="underworld-upgrade-card"><div><strong>창공석 ${level > 0 ? `+${level}` : _t('미제작')}</strong><span>${_t('지하계 중력 패널티 감소 {skyStoneReductionPct}% / 75%', { skyStoneReductionPct: getSkyStoneReductionPct() })}</span></div>`
            + `<div><span>${_t('응축된 창공의 정수 {floor}', { floor: Math.floor(tower.condensedPower || 0) })}</span><button onclick="upgradeSkyStone()" ${maxed ? 'disabled' : ''}>${level > 0 ? _t('강화') : _t('제작')}, ${maxed ? _t('최대') : cost}</button></div></section>`;
    }

    function stonesPageHtml() {
        const state = ensureUnderworldRuneState(), counts = getUnderworldRuneCountMap(state.obtainedRunes);
        const owned = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const chips = Object.keys(counts).map(Number).sort((a, b) => a - b).map(no => {
            const tip = `showUnderworldRuneTooltip(event,${no})`;
            return `<button type="button" class="underworld-rune-chip" onclick="${tip}" data-info-tooltip-anchor="1" onmouseenter="${tip}" onmousemove="${tip}" onmouseleave="hideInfoTooltip()">${iconHtml(no)}<span>${getUnderworldRuneDef(no)?.name || _t('지하석{no}', { no })}</span><b>×${counts[no]}</b></button>`;
        }).join('');
        return `<div class="underworld-panel-head"><div><strong>${_t('지하석')}</strong><span>${progressLabel(state)}</span></div>${resourcesHtml(RESOURCES.map(([key]) => key))}</div>`
            + `<section class="underworld-rune-console"><div class="underworld-rune-slots">${slotsHtml(state)}</div></section>${stoneActionsHtml(state)}`
            + `<section class="underworld-inventory-card"><strong>${_t('보유 지하석 {owned}개', { owned })}</strong><div class="underworld-rune-inventory">${chips || _t('<span class="core-cube-muted">없음</span>')}</div></section>`;
    }
    function slotsHtml(state) {
        return Array.from({length: 6}, (_, index) => {
            const no = state.equippedRunes[index], unlocked = index < Math.max(0, Math.floor(state.unlockedSlots || 0)), def = no ? getUnderworldRuneDef(no) : null;
            const label = unlocked ? (def ? def.name : '비어 있음') : '잠김', art = unlocked ? iconHtml(no) : '';
            const effect = unlocked ? (def ? getUnderworldRuneEffectHtml(no) : '눌러서 장착') : _t('{value}층 격파', { value: (index + 1) * 10 });
            return `<button type="button" class="underworld-rune-slot ${unlocked ? 'unlocked' : 'locked'}" ${slotAttrs(no, index, unlocked)}><span class="underworld-rune-slot-no">${index + 1}</span>`
                + `<span class="underworld-rune-slot-art">${art}</span><strong>${label}</strong><small>${effect}</small></button>`;
        }).join('');
    }
    function slotAttrs(no, index, unlocked) {
        if (!unlocked) return 'disabled';
        const tip = no ? `showUnderworldRuneTooltip(event,${no})` : '';
        return `onclick="openUnderworldRuneOverlay(${index})" data-info-tooltip-anchor="1" onmouseenter="${tip}" onmousemove="${tip}" onmouseleave="hideInfoTooltip()"`;
    }
    function stoneActionsHtml(state) {
        const blocked = held('runeShard') < 10 || !state.unlockedRunesMaxNumber || game.woodsmanBuildLock;
        const actions = [['craftUnderworldRune()', '가공', '해금된 번호 가운데 하나', costHtml({runeShard: 10}), blocked],
            ['openUnderworldRuneUpgradeOverlay()', '승급', '같은 번호 3개를 다음 번호 1개로', '<i class="is-runeShard">지하석 조각, 번호만큼(최소 5)</i>', false],
            ['enhanceUnderworldRune()', '강화', '능력치 +1%씩, 5, 10, 15단계에 보너스 옵션', _t('{n}부터', { n: costHtml(growthCost(0, false)) }), false],
            ['rerollUnderworldRuneBonus()', '보너스 다시', '+5 이상 지하석의 보너스 옵션을 다시 굴림', _t('{n}부터', { n: costHtml(growthCost(0, true)) }), false]];
        return `<div class="underworld-action-grid underworld-stone-actions">${actions.map(([call, title, effect, cost, off]) =>
            `<button onclick="${call}" ${off ? 'disabled' : ''}><strong>${title}</strong><span>${effect}</span><small>${cost}</small></button>`).join('')}</div>`;
    }

    function gearPageHtml() {
        const cards = Object.entries(UNDERWORLD_ENCHANT_POOLS).map(([slot, pool]) => enchantCardHtml(slot, pool)).join('');
        return `<div class="underworld-panel-head"><div><strong>${_t('장비 인챈트')}</strong><span>${_t('장착한 장비에 지하계 옵션 한 줄, 다시 하면 그 줄이 바뀝니다')}</span></div>`
            + `${resourcesHtml(['underCopper', 'underSilver', 'underGold'])}</div><div class="underworld-enchant-grid">${cards}</div>${limitBreakHtml()}`;
    }
    function enchantCardHtml(slot, pool) {
        const item = game.equipment && game.equipment[slot], now = item && item.underEnchant;
        const rows = pool.map(([stat, min, max, strength]) => {
            const cost = enchantCost(strength);
            return `<li class="has-stat" style="--stat-tone:${getItemStatToneColor(stat)}"><span>${statName(stat)} +${rangeText(stat, min, max)}</span><small><i class="is-underCopper">${cost.underCopper}</i>/<i class="is-underSilver">${cost.underSilver}</i>/<i class="is-underGold">${cost.underGold}</i></small></li>`;
        }).join('');
        return `<article class="underworld-enchant-card"><header><strong>${slot}</strong><span>${item ? escapeHTML(getItemDisplayName(item)) : _t('장비 없음')}</span></header>`
            + `<p class="${now ? 'is-on' : ''}">${now ? _t('지금 {id}', { id: statText(now.id, now.val) }) : _t('인챈트 없음')}</p>`
            + `<ul><li class="is-head"><span>${_t('나올 수 있는 효과')}</span><small><i class="is-underCopper">${_t('구리')}</i>/<i class="is-underSilver">${_t('은')}</i>/<i class="is-underGold">${_t('금')}</i></small></li>${rows}</ul>`
            + `<button type="button" onclick="applyUnderworldEnchant('${slot}')" ${item ? '' : 'disabled'}>${_t('인챈트')}</button></article>`;
    }
    function limitBreakHtml() {
        const rule = UNDERWORLD_LIMIT_BREAK;
        const costs = [['무기', 'weapon'], ['방어구', 'armour'], ['장신구', 'accessory']]
            .map(([name, key]) => `<span>${name} ${costHtml({underCopper: rule.costs[key][0], underSilver: rule.costs[key][1], underGold: rule.costs[key][2]})}</span>`).join('');
        const ready = Object.entries(game.equipment || {}).filter(([, item]) => item && Math.floor(item.quality || 0) === rule.quality && !item.qualityLockedByLimitBreak);
        const buttons = ready.length ? ready.map(([slot, item]) => `<button type="button" onclick="attemptUnderworldLimitBreak('${slot}')">${slot}, ${escapeHTML(getItemDisplayName(item))}</button>`).join('')
            : `<span>${_t('퀄리티 {quality}%인 장착 장비가 없습니다', { quality: rule.quality })}</span>`;
        return `<section class="underworld-upgrade-card underworld-limit-break"><div><strong>${_t('한계돌파')}</strong>`
            + `<span>${_t('퀄리티 {quality}% 장비의 퀄리티가 −{swing}~+{swing2}%(최대 {cap}%), 그 뒤로 고정', { quality: rule.quality, swing: rule.swing, swing2: rule.swing, cap: rule.cap })}</span>`
            + `<div class="underworld-ticket-strip">${costs}</div></div><div class="underworld-limit-targets">${buttons}</div></section>`;
    }

    return {updateMarkup,progressLabel,chooseGrowth,mountOverlay,closeOverlay,validSlot,pages,render,enchantCost,limitBreakCost,iconHtml};
})();
safeExposeGlobals({underworldRuneUi});
