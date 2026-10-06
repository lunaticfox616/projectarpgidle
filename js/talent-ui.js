// 카드는 전직마다 한 장(2026-10-02 재능 정리)이라 보기는 직업별 하나다: filterId는 직업 id(그 직업의 전직 카드 셋).
let talentCardView = { filterId: null };

function setTalentCardFilter(filterId) {
    talentCardView.filterId = talentCardView.filterId === filterId ? null : filterId;
    renderTalentTab();
}

/** 전직을 직업 순서로(state.js getAscendancyOrder). 그 함수가 없는 좁은 실행 환경에서는 정의 순서. */
function getTalentAscendancyOrder() {
    return typeof getAscendancyOrder === 'function' ? getAscendancyOrder().filter(id => CLASS_TEMPLATES[id]) : Object.keys(CLASS_TEMPLATES);
}

/** 직업마다 카드 몇 장을 모았는지(직업 순서). */
function getTalentCardClassRows(owned) {
    return Object.entries(ASCENDANCIES_BY_PLAYER_CLASS).map(([classId, ascendIds]) => {
        const keys = ascendIds.map(getTalentBloomCardKeyForAscendancy).filter(Boolean);
        return { id: classId, label: PLAYER_CLASS_DEFS[classId].label, count: keys.filter(key => owned[key]).length, total: keys.length };
    });
}

function getCurrentTalentBloomContext(owned) {
    let classKey = game.ascendClass && CLASS_TEMPLATES[game.ascendClass] ? game.ascendClass : null;
    let heroId = classKey ? getTalentBloomHeroIdForAscendancy(classKey) : null;
    let key = classKey ? getTalentBloomCardKeyForAscendancy(classKey) : null;
    let names = key ? getTalentCardName(heroId, classKey) : { heroLabel: '직업 재능', classLabel: '미전직', bloomName: '전직을 고르면 정해짐' };
    return { heroId, classKey, key, names, card: key ? owned[key] : null };
}

function renderCurrentTalentBloomContext(owned) {
    let current = getCurrentTalentBloomContext(owned);
    let state = !current.key ? '전직을 고르면 카드가 정해집니다.'
        : (current.card ? `개화 완료, Lv.${Math.max(1, Math.floor(current.card.level || 1))}` : '개화 시련을 클리어하면 얻습니다.');
    return `<section class="talent-current-combo ${current.card ? 'unlocked' : 'locked'}">
        <div><span>직업 재능</span><strong>${escapeTalentHtml(current.names.heroLabel)}</strong></div>
        <i aria-hidden="true">×</i>
        <div><span>현재 전직</span><strong>${escapeTalentHtml(current.names.classLabel)}</strong></div>
        <div class="talent-current-result"><span>개화 카드</span><strong>${escapeTalentHtml(current.names.bloomName)}</strong><small>${state}</small></div>
    </section>`;
}

/** 고른 직업(없으면 지금 전직의 직업)의 전직 카드 셋. */
function renderTalentCombinationStatus(owned) {
    let current = getCurrentTalentBloomContext(owned);
    let focusId = talentCardView.filterId || (current.classKey ? getTalentBloomClassOfAscendancy(current.classKey) : null) || Object.keys(ASCENDANCIES_BY_PLAYER_CLASS)[0];
    let cells = ASCENDANCIES_BY_PLAYER_CLASS[focusId].map(classKey => {
        let key = getTalentBloomCardKeyForAscendancy(classKey);
        let card = key ? owned[key] : null;
        let names = getTalentCardName(getTalentBloomHeroIdForAscendancy(classKey), classKey);
        let classes = `talent-combo-cell ${card ? 'unlocked' : 'locked'}${current.key === key ? ' current' : ''}`;
        let tooltip = card ? ` data-info-tooltip-anchor="1" onmouseenter="showTalentCombinationTooltip(event,'${key}')" onmousemove="showTalentCombinationTooltip(event,'${key}')" onmouseleave="hideInfoTooltip()"` : '';
        return `<div class="${classes}"${tooltip}><span>${escapeTalentHtml(names.classLabel)}</span><strong>${escapeTalentHtml(names.bloomName)}</strong><small>${card ? `Lv.${Math.max(1, Math.floor(card.level || 1))} 개화` : '미개화'}</small></div>`;
    }).join('');
    return `<div class="talent-combo-status"><div class="talent-combo-status-head"><strong>${escapeTalentHtml(PLAYER_CLASS_DEFS[focusId].label)} 카드</strong><span>밝은 카드는 개화 완료, 테두리는 지금 전직</span></div><div class="talent-combo-grid">${cells}</div></div>`;
}

/** A card's effect lines in the option colours (2026-10-06: they were one gold, one cream and one blue line): the labels keep
 * their colour, stat effects take their stat's colour, prose and unique effects colour their keywords. */
function renderTalentCardEffectLines(heroId, classKey, level) {
    const parts = getTalentCardEffectParts(heroId, classKey, level);
    if (!parts) return [];
    const item = part => (part.stat ? statToneText.statLine(part.stat, part.text) : statToneText.html(part.text));
    const lines = [];
    if (parts.surface) lines.push(`<span style="color:#ffd36b;">⭐ [표면]</span> ${statToneText.html(parts.surface)}`);
    if (parts.applied.length) lines.push(`<span style="color:#ffe7a8;">[현재 Lv.${parts.level}]</span> ${parts.applied.map(item).join(', ')}`);
    if (parts.hidden.length) lines.push(`<span style="color:#9fe0ff;">[이면]</span> ${parts.hidden.map(item).join(', ')}`);
    return lines;
}

function buildTalentCombinationTooltipHtml(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let card = owned[comboKey];
    if (!card) return '';
    let { heroId, classKey } = parseTalentComboKey(comboKey);
    let names = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(card.level || 1));
    let effects = renderTalentCardEffectLines(heroId, classKey, level);
    return `<div class="tooltip-title" style="color:#fff1a8;">${escapeTalentHtml(names.bloomName)}</div>`
        + `<div class="tooltip-line" style="color:#cdb8df;">${escapeTalentHtml(names.heroLabel)} × ${escapeTalentHtml(names.classLabel)} Lv.${level}</div>`
        + `<div class="tooltip-line">${effects.join('<br>')}</div>`;
}

function showTalentCombinationTooltip(event, comboKey) {
    if (!event || typeof showInfoTooltipHtml !== 'function') return;
    let html = buildTalentCombinationTooltipHtml(comboKey);
    if (html) showInfoTooltipHtml(event.clientX, event.clientY, html, '#dcaeff', `talent-combo:${comboKey}`);
}

function renderTalentBloomNavigator(owned) {
    let rows = getTalentCardClassRows(owned);
    let chips = rows.map(row => {
        let active = talentCardView.filterId === row.id;
        return `<button type="button" class="talent-bloom-filter${active ? ' active' : ''}" aria-pressed="${active}" onclick="setTalentCardFilter('${row.id}')"><strong>${escapeTalentHtml(row.label)}</strong><span>${row.count}/${row.total}</span></button>`;
    }).join('');
    return `<details class="talent-bloom-navigator" data-ui-disclosure="talent-bloom-progress" open><summary><span><strong>개화 현황</strong><small>직업마다 전직 카드 셋</small></span><b>${Object.keys(owned).length}/${TALENT_BLOOM_TOTAL_CARDS}</b></summary><div class="talent-bloom-navigator-body">
        <div class="talent-bloom-navigator-head"><div><strong>직업</strong><span>누르면 그 직업의 카드만 봅니다.</span></div></div><div class="talent-bloom-filter-grid">${chips}</div>${renderTalentCombinationStatus(owned)}</div></details>`;
}

function matchesTalentCardView(key) {
    if (!talentCardView.filterId) return true;
    return (ASCENDANCIES_BY_PLAYER_CLASS[talentCardView.filterId] || []).includes(parseTalentComboKey(key).classKey);
}

function renderTalentLoadoutSlot(index, unlocked, key, owned) {
    if (!unlocked) return `<div class="talent-slot locked">잠김<br><span>보유 ${TALENT_CARD_SLOT_UNLOCKS[index]}장</span></div>`;
    if (!key || !owned[key]) return '<div class="talent-slot empty">빈 슬롯<br><span>카드를 눌러 장착</span></div>';
    let { heroId, classKey } = parseTalentComboKey(key);
    let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(owned[key].level || 1));
    return `<div class="talent-slot filled" onclick="unequipTalentSlot(${index})" aria-label="${escapeTalentHtml(bloomName)} 장착 해제" data-info-tooltip-anchor="1" onmouseenter="showTalentCombinationTooltip(event,'${key}')" onmousemove="showTalentCombinationTooltip(event,'${key}')" onmouseleave="hideInfoTooltip()"><strong>${escapeTalentHtml(bloomName)}</strong><span>${escapeTalentHtml(heroLabel)} × ${escapeTalentHtml(classLabel)} Lv.${level}</span></div>`;
}

function renderTalentCollectionCard(key, owned) {
    let card = owned[key];
    let { heroId, classKey } = parseTalentComboKey(key);
    let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(card.level || 1));
    let lines = renderTalentCardEffectLines(heroId, classKey, level);
    let nextThreshold = level < TALENT_CARD_MAX_LEVEL ? TALENT_CARD_LEVEL_THRESHOLDS[level] : null;
    let nextText = nextThreshold !== null ? `다음 레벨 점수 ${nextThreshold}` : '최대 레벨';
    let equipped = getTalentCardSlotIndex(key) >= 0;
    return `<div class="talent-card${equipped ? ' equipped' : ''}" onclick="equipTalentCard('${key}')" title="클릭하여 ${equipped ? '해제' : '장착'}">
        <div class="talent-card-head">
            <span class="talent-card-title">${bloomName}</span>
            <span class="talent-card-level">Lv.${level}/${TALENT_CARD_MAX_LEVEL}</span>
        </div>
        <div class="talent-card-sub">재능 ${heroLabel}, 전직 ${classLabel}</div>
        <div class="talent-card-effects">${lines.join('<br>')}</div>
        <div class="talent-card-foot">${equipped ? '장착됨, ' : ''}점수 ${Math.max(0, Math.floor(card.score || 0))}, 개화 ${Math.max(0, Math.floor(card.count || 0))}회, ${nextText}</div>
    </div>`;

}

function renderTalentScoreSummary(count) {
    let bd = getTalentBloomScoreBreakdown();
    let curScore = getTalentBloomScore();
    return `보유 카드 <strong>${count}</strong> / ${TALENT_BLOOM_TOTAL_CARDS}, 총 개화 ${Math.max(0, Math.floor(game.talentBloomClears || 0))}회`
        + `<br><span style="font-size:12px; color:var(--copy-bright);">현재 개화 점수 <strong>${curScore}</strong> = 혼돈심화 ${bd.deepChaos} + 미궁 ${bd.labyrinth} + 혼돈계 ${bd.chaosFloor} + 지하계 ${bd.underFloor} + 우주계 ${bd.cosmos} + 전투력 ${bd.dpsTerm}</span>`
        + `<br><span style="font-size:12px; color:#9fe2b1;">개화 카드는 루프가 지나도 사라지지 않습니다.</span>`;
}

function renderTalentTab() {
    let summaryEl = document.getElementById('ui-talent-summary');
    let gridEl = document.getElementById('ui-talent-card-grid');
    if (!summaryEl || !gridEl) return;
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let ownedKeys = Object.keys(owned);
    if (uiDisplay.matches('(max-width: 1080px)')) { renderMobileTalentTab(owned); return; }
    summaryEl.innerHTML = renderTalentScoreSummary(ownedKeys.length);

    // 장착 슬롯 영역
    ensureTalentCardLoadout();
    let loadout = game.talentCardLoadout;
    let unlockedSlots = getUnlockedTalentSlotCount();
    let slotHtml = '';
    for (let i = 0; i < TALENT_CARD_SLOT_COUNT; i++) {
        let unlocked = i < unlockedSlots;
        let key = loadout[i];
        slotHtml += renderTalentLoadoutSlot(i, unlocked, key, owned);
    }
    let nextSlot = unlockedSlots < TALENT_CARD_SLOT_COUNT ? `<span style="color:var(--copy-bright);">, 다음 슬롯: 보유 ${TALENT_CARD_SLOT_UNLOCKS[unlockedSlots]}장</span>` : '';
    let loadoutHtml = `${renderCurrentTalentBloomContext(owned)}${renderTalentBloomNavigator(owned)}<div class="talent-loadout-panel">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
            <strong>장착 슬롯</strong><span style="font-size:12px;">열린 슬롯 ${unlockedSlots}/${TALENT_CARD_SLOT_COUNT}${nextSlot}</span>
        </div>
        <div class="talent-slot-row">${slotHtml}</div>
    </div>`;

    if (ownedKeys.length === 0) {
        gridEl.innerHTML = loadoutHtml + `<div style="grid-column:1/-1; color:var(--copy-bright); padding:18px; text-align:center;">아직 개화한 카드가 없습니다. 지도 탭의 <strong>혹독한 겨울의 미궁</strong>(재능 개화 시련)을 클리어하면 지금 전직의 카드를 얻습니다.</div>`;
        return;
    }
    // 레벨 내림차순 정렬
    ownedKeys.sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
    let visibleKeys = ownedKeys.filter(matchesTalentCardView);
    let cardsHtml = visibleKeys.map(key => renderTalentCollectionCard(key, owned)).join('');
    gridEl.innerHTML = loadoutHtml + (cardsHtml || '<div class="talent-bloom-empty">이 항목으로 개화한 조합이 아직 없습니다.</div>');
}

safeExposeGlobals({ setTalentCardFilter, showTalentCombinationTooltip, renderTalentCardEffectLines });
