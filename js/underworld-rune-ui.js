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

    function costText(cost) {
        const names = {underCopper:'구리',underSilver:'은',underGold:'금',runeShard:'지하석 조각'};
        return Object.entries(cost).map(([key, value]) => `${names[key]} ${value}`).join(', ');
    }

    function growthChoice(state, no, reroll) {
        const def = getUnderworldRuneDef(no), level = state.enhanceLvByNo[no] || 0;
        const cost = growthCost(level, reroll);
        const missing = Object.entries(cost).some(([key, amount]) => (game.currencies[key] || 0) < amount);
        const effect = `${getStatName(def.stat)} +${formatValue(def.stat, def.val*(1+level*0.01))}${P_STATS[def.stat]?.isPct ? '%' : ''}`;
        return {value:no,label:`${def.name}, 지하석 ${no}, +${level}${reroll ? '' : ` → +${level+1}`}`,
            detail:`${effect}\n${costText(cost)}${missing ? '\n재료 부족' : ''}`};
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
            message:'같은 번호의 모든 지하석에 적용됩니다.',confirmLabel:reroll ? '옵션 리롤' : '지하석 강화',
            choices:numbers.map(no => growthChoice(state,no,reroll))});
        if (no === null) return null;
        return validateGrowthChoice(state, no, levels.get(no), reroll);
    }

    function validateGrowthChoice(state, no, level, reroll) {
        if (!assertBuildEditable()) return null;
        if (game.underworldRunes !== state || !ownedNumbers(state).includes(no) || (state.enhanceLvByNo[no] || 0) !== level) {
            addLog('지하석 상태가 변경되었습니다. 다시 선택하세요.', 'attack-monster'); return null;
        }
        const cost = growthCost(level, reroll);
        if (Object.entries(cost).some(([key, value]) => (game.currencies[key] || 0) < value)) {
            addLog(`재료 부족, ${costText(cost)}`, 'attack-monster'); return null;
        }
        return {state,no,level,cost};
    }

    // 지하계 층 보상(js/combat.js grantUnderworldFloorMilestone): 도메인은 이벤트만 내고 기록은 여기서 남긴다.
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
        .map(([key, name]) => `<span>${name} <b>${held(key)}</b></span>`).join('')}</div>`;
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
        const highest = Math.max(1, Math.floor(progress.highestFloor || 1)), open = canEnterUnderworld(), off = open ? '' : 'disabled';
        const lock = open ? '' : `<small class="underworld-lock">${escapeHTML(getUnderworldEntryLockReason(game))}</small>`;
        const other = floor === highest ? '' : `<button type="button" data-exploration-departure onclick="enterUnderworldFloor(${floor})" ${off}>${floor}층 입장</button>`;
        return `<section class="underworld-entry-card ${game.currentZoneId === UNDERWORLD_ZONE_ID ? 'current' : ''}"><div class="underworld-entry-copy">`
            + `<span>최고층 도전 기준, 현재 선택 ${floor}층</span><strong>도달 최고 ${highest}층</strong><div>${buildMapPowerEstimateHtml(getUnderworldZone(highest))}</div>${lock}</div>`
            + `<div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterUnderworldFloor(${highest})" ${off}>최고층 ${highest} 입장</button>`
            + `${other}<button type="button" data-exploration-departure onclick="enterUnderworldPrompt()" ${off}>다른 층…</button></div></section>`;
    }
    function entryPageHtml() {
        const tickets = [['uberRootTicketFlame', '화염'], ['uberRootTicketFrost', '냉기'], ['uberRootTicketStorm', '번개'], ['uberRootTicketChaos', '카오스']];
        return `<div class="underworld-lower-grid">${skyStoneHtml()}<section class="underworld-upgrade-card underworld-reward-card"><div><strong>층 보상</strong>`
            + `<span>${progressLabel(ensureUnderworldRuneState())}</span><span>15층부터 지속 피해</span></div>`
            + `<div class="underworld-ticket-strip"><small>그림자 뿌리 입장권</small>${tickets.map(([key, name]) => `<span>${name} <b>${held(key)}</b></span>`).join('')}</div></section></div>`;
    }
    function skyStoneHtml() {
        const tower = ensureSkyTowerState(), level = Math.max(0, Math.floor((tower.skyStone || {}).level || 0));
        const maxed = level >= getSkyStoneMaxLevel(), cost = getSkyStoneNextCost();
        return `<section class="underworld-upgrade-card"><div><strong>창공석 ${level > 0 ? `+${level}` : '미제작'}</strong><span>지하계 중력 패널티 감소 ${getSkyStoneReductionPct()}% / 75%</span></div>`
            + `<div><span>응축된 창공의 정수 ${Math.floor(tower.condensedPower || 0)}</span><button onclick="upgradeSkyStone()" ${maxed ? 'disabled' : ''}>${level > 0 ? '강화' : '제작'}, ${maxed ? '최대' : cost}</button></div></section>`;
    }

    function stonesPageHtml() {
        const state = ensureUnderworldRuneState(), counts = getUnderworldRuneCountMap(state.obtainedRunes);
        const owned = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const chips = Object.keys(counts).map(Number).sort((a, b) => a - b).map(no => {
            const tip = `showUnderworldRuneTooltip(event,${no})`;
            return `<button type="button" class="underworld-rune-chip" onclick="${tip}" data-info-tooltip-anchor="1" onmouseenter="${tip}" onmousemove="${tip}" onmouseleave="hideInfoTooltip()">${getUnderworldRuneDef(no)?.name || `지하석${no}`}×${counts[no]}</button>`;
        }).join('');
        return `<div class="underworld-panel-head"><div><strong>지하석</strong><span>${progressLabel(state)}</span></div>${resourcesHtml(RESOURCES.map(([key]) => key))}</div>`
            + `<section class="underworld-rune-console"><div class="underworld-rune-slots">${slotsHtml(state)}</div></section>${stoneActionsHtml(state)}`
            + `<section class="underworld-inventory-card"><strong>보유 지하석 ${owned}개</strong><div class="underworld-rune-inventory">${chips || '<span class="core-cube-muted">없음</span>'}</div></section>`;
    }
    function slotsHtml(state) {
        return Array.from({length: 6}, (_, index) => {
            const no = state.equippedRunes[index], unlocked = index < Math.max(0, Math.floor(state.unlockedSlots || 0)), def = no ? getUnderworldRuneDef(no) : null;
            const label = unlocked ? (def ? def.name : '비어 있음') : '잠김';
            const effect = unlocked ? (def ? getUnderworldRuneEffectHtml(no) : '눌러서 장착') : `${(index + 1) * 10}층 격파`;
            const tip = no ? `showUnderworldRuneTooltip(event,${no})` : '';
            const attrs = unlocked ? `onclick="openUnderworldRuneOverlay(${index})" data-info-tooltip-anchor="1" onmouseenter="${tip}" onmousemove="${tip}" onmouseleave="hideInfoTooltip()"` : 'disabled';
            return `<button type="button" class="underworld-rune-slot ${unlocked ? 'unlocked' : 'locked'}" ${attrs}><span class="underworld-rune-slot-no">${index + 1}</span><strong>${label}</strong><small>${effect}</small></button>`;
        }).join('');
    }
    function stoneActionsHtml(state) {
        const blocked = held('runeShard') < 10 || !state.unlockedRunesMaxNumber || game.woodsmanBuildLock;
        const actions = [['craftUnderworldRune()', '가공', '해금된 번호 가운데 하나', '지하석 조각 10', blocked],
            ['openUnderworldRuneUpgradeOverlay()', '승급', '같은 번호 3개를 다음 번호 1개로', '지하석 조각, 번호만큼(최소 5)', false],
            ['enhanceUnderworldRune()', '강화', '능력치 +1%씩, 5, 10, 15단계에 보너스 옵션', `${costText(growthCost(0, false))}부터`, false],
            ['rerollUnderworldRuneBonus()', '보너스 다시', '+5 이상 지하석의 보너스 옵션을 다시 굴림', `${costText(growthCost(0, true))}부터`, false]];
        return `<div class="underworld-action-grid underworld-stone-actions">${actions.map(([call, title, effect, cost, off]) =>
            `<button onclick="${call}" ${off ? 'disabled' : ''}><strong>${title}</strong><span>${effect}</span><small>${cost}</small></button>`).join('')}</div>`;
    }

    function gearPageHtml() {
        const cards = Object.entries(UNDERWORLD_ENCHANT_POOLS).map(([slot, pool]) => enchantCardHtml(slot, pool)).join('');
        return `<div class="underworld-panel-head"><div><strong>장비 인챈트</strong><span>장착한 장비에 지하계 옵션 한 줄, 다시 하면 그 줄이 바뀝니다</span></div>`
            + `${resourcesHtml(['underCopper', 'underSilver', 'underGold'])}</div><div class="underworld-enchant-grid">${cards}</div>${limitBreakHtml()}`;
    }
    function enchantCardHtml(slot, pool) {
        const item = game.equipment && game.equipment[slot], now = item && item.underEnchant;
        const rows = pool.map(([stat, min, max, strength]) => {
            const cost = enchantCost(strength);
            return `<li><span>${statName(stat)} +${rangeText(stat, min, max)}</span><small>${cost.underCopper}/${cost.underSilver}/${cost.underGold}</small></li>`;
        }).join('');
        return `<article class="underworld-enchant-card"><header><strong>${slot}</strong><span>${item ? escapeHTML(item.name) : '장비 없음'}</span></header>`
            + `<p class="${now ? 'is-on' : ''}">${now ? `지금 ${statText(now.id, now.val)}` : '인챈트 없음'}</p>`
            + `<ul><li class="is-head"><span>나올 수 있는 효과</span><small>구리/은/금</small></li>${rows}</ul>`
            + `<button type="button" onclick="applyUnderworldEnchant('${slot}')" ${item ? '' : 'disabled'}>인챈트</button></article>`;
    }
    function limitBreakHtml() {
        const rule = UNDERWORLD_LIMIT_BREAK;
        const costs = [['무기', 'weapon'], ['방어구', 'armour'], ['장신구', 'accessory']]
            .map(([name, key]) => `<span>${name} 구리 ${rule.costs[key][0]}, 은 ${rule.costs[key][1]}, 금 ${rule.costs[key][2]}</span>`).join('');
        const ready = Object.entries(game.equipment || {}).filter(([, item]) => item && Math.floor(item.quality || 0) === rule.quality && !item.qualityLockedByLimitBreak);
        const buttons = ready.length ? ready.map(([slot, item]) => `<button type="button" onclick="attemptUnderworldLimitBreak('${slot}')">${slot}, ${escapeHTML(item.name)}</button>`).join('')
            : `<span>퀄리티 ${rule.quality}%인 장착 장비가 없습니다</span>`;
        return `<section class="underworld-upgrade-card underworld-limit-break"><div><strong>한계돌파</strong>`
            + `<span>퀄리티 ${rule.quality}% 장비의 퀄리티가 −${rule.swing}~+${rule.swing}%(최대 ${rule.cap}%), 그 뒤로 고정</span>`
            + `<div class="underworld-ticket-strip">${costs}</div></div><div class="underworld-limit-targets">${buttons}</div></section>`;
    }

    return {updateMarkup,progressLabel,chooseGrowth,mountOverlay,closeOverlay,validSlot,pages,render,enchantCost,limitBreakCost};
})();
safeExposeGlobals({underworldRuneUi});
