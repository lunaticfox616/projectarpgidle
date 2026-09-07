let talentCardView = { dimension: 'talent', filterId: null };

function setTalentCardView(dimension) {
    if (dimension !== 'talent' && dimension !== 'class') return;
    talentCardView = { dimension, filterId: null };
    renderTalentTab();
}

function setTalentCardFilter(filterId) {
    talentCardView.filterId = talentCardView.filterId === filterId ? null : filterId;
    renderTalentTab();
}

function getTalentCardDimensionRows(owned) {
    let dimension = talentCardView.dimension;
    let ids = dimension === 'talent' ? HERO_SELECTION_ORDER : Object.keys(CLASS_TEMPLATES);
    return ids.map(id => {
        let label = dimension === 'talent' ? getHeroSelectionDef(id).label : CLASS_TEMPLATES[id].name;
        let count = Object.keys(owned).filter(key => {
            let parsed = parseTalentComboKey(key);
            return dimension === 'talent' ? parsed.heroId === id : parsed.classKey === id;
        }).length;
        return { id, label, count, total: dimension === 'talent' ? Object.keys(CLASS_TEMPLATES).length : HERO_SELECTION_ORDER.length };
    });
}

function getCurrentTalentBloomContext(owned) {
    let classKey = game.ascendClass && CLASS_TEMPLATES[game.ascendClass] ? game.ascendClass : null;
    let locked = game.bloomedClassThisLoop === classKey && HERO_SELECTION_DEFS[game.bloomedTalentThisLoop];
    let pending = HERO_SELECTION_DEFS[game.pendingTalentBloomHeroId];
    let heroId = locked ? game.bloomedTalentThisLoop : (pending ? game.pendingTalentBloomHeroId : null);
    let key = heroId && classKey ? makeTalentComboKey(heroId, classKey) : null;
    let names = heroId ? getTalentCardName(heroId, classKey) : {
        heroLabel: '미선택',
        classLabel: classKey ? CLASS_TEMPLATES[classKey].name : '무직',
        bloomName: '5차 전직에서 선택'
    };
    return { heroId, classKey, key, names, card: key ? owned[key] : null };
}

function renderCurrentTalentBloomContext(owned) {
    let current = getCurrentTalentBloomContext(owned);
    let state = !current.classKey ? '직업을 선택하면 조합이 확정됩니다.'
        : (!current.heroId ? '5차 전직 도전 시 이번 루프의 재능을 선택합니다.'
            : (current.card ? `개화 완료 · Lv.${Math.max(1, Math.floor(current.card.level || 1))}` : '5차 전직 도전 중'));
    return `<section class="talent-current-combo ${current.card ? 'unlocked' : 'locked'}">
        <div><span>개화 재능</span><strong>${escapeTalentHtml(current.names.heroLabel)}</strong></div>
        <i aria-hidden="true">×</i>
        <div><span>현재 직업</span><strong>${escapeTalentHtml(current.names.classLabel)}</strong></div>
        <div class="talent-current-result"><span>개화 조합</span><strong>${escapeTalentHtml(current.names.bloomName)}</strong><small>${state}</small></div>
    </section>`;
}

function renderTalentCombinationStatus(owned) {
    let current = getCurrentTalentBloomContext(owned);
    let dimension = talentCardView.dimension;
    let focusId = talentCardView.filterId || (dimension === 'talent' ? (current.heroId || HERO_SELECTION_ORDER[0]) : current.classKey);
    if (!focusId) return '<div class="talent-combo-empty">직업을 선택하면 조합 현황을 볼 수 있습니다.</div>';
    let counterpartIds = dimension === 'talent' ? Object.keys(CLASS_TEMPLATES) : HERO_SELECTION_ORDER;
    let cells = counterpartIds.map(counterpartId => {
        let heroId = dimension === 'talent' ? focusId : counterpartId;
        let classKey = dimension === 'talent' ? counterpartId : focusId;
        let key = makeTalentComboKey(heroId, classKey);
        let card = owned[key];
        let names = getTalentCardName(heroId, classKey);
        let counterpart = dimension === 'talent' ? names.classLabel : names.heroLabel;
        let isCurrent = current.key === key;
        let classes = `talent-combo-cell ${card ? 'unlocked' : 'locked'}${isCurrent ? ' current' : ''}`;
        let tooltip = card ? ` data-info-tooltip-anchor="1" onmouseenter="showTalentCombinationTooltip(event,'${key}')" onmousemove="showTalentCombinationTooltip(event,'${key}')" onmouseleave="hideInfoTooltip()"` : '';
        return `<div class="${classes}"${tooltip}><span>${escapeTalentHtml(counterpart)}</span><strong>${escapeTalentHtml(names.bloomName)}</strong><small>${card ? `Lv.${Math.max(1, Math.floor(card.level || 1))} 개화` : '미개화'}</small></div>`;
    }).join('');
    let focusLabel = dimension === 'talent' ? getHeroSelectionDef(focusId).label : CLASS_TEMPLATES[focusId].name;
    return `<div class="talent-combo-status"><div class="talent-combo-status-head"><strong>${escapeTalentHtml(focusLabel)} 조합</strong><span>밝은 카드는 개화 완료 · 테두리는 현재 조합</span></div><div class="talent-combo-grid">${cells}</div></div>`;
}

function buildTalentCombinationTooltipHtml(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let card = owned[comboKey];
    if (!card) return '';
    let { heroId, classKey } = parseTalentComboKey(comboKey);
    let names = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(card.level || 1));
    let effects = getTalentCardEffectLines(heroId, classKey, level);
    return `<div class="tooltip-title" style="color:#fff1a8;">${escapeTalentHtml(names.bloomName)}</div>`
        + `<div class="tooltip-line" style="color:#cdb8df;">${escapeTalentHtml(names.heroLabel)} × ${escapeTalentHtml(names.classLabel)} · Lv.${level}</div>`
        + `<div class="tooltip-line">${effects.join('<br>')}</div>`;
}

function showTalentCombinationTooltip(event, comboKey) {
    if (!event || typeof showInfoTooltipHtml !== 'function') return;
    let html = buildTalentCombinationTooltipHtml(comboKey);
    if (html) showInfoTooltipHtml(event.clientX, event.clientY, html, '#dcaeff', `talent-combo:${comboKey}`);
}

function renderTalentBloomNavigator(owned) {
    let rows = getTalentCardDimensionRows(owned);
    let chips = rows.map(row => {
        let active = talentCardView.filterId === row.id;
        return `<button type="button" class="talent-bloom-filter${active ? ' active' : ''}" aria-pressed="${active}" onclick="setTalentCardFilter('${row.id}')"><strong>${escapeTalentHtml(row.label)}</strong><span>${row.count}/${row.total}</span></button>`;
    }).join('');
    return `<details class="talent-bloom-navigator" data-ui-disclosure="talent-bloom-progress" open><summary><span><strong>개화 현황</strong><small>미개화 조합과 수집 진행도를 확인합니다.</small></span><b>${Object.keys(owned).length}/${TALENT_BLOOM_TOTAL_CARDS}</b></summary><div class="talent-bloom-navigator-body">
        <div class="talent-bloom-navigator-head"><div><strong>분류</strong><span>항목을 누르면 해당 조합만 모아 봅니다.</span></div><div class="talent-bloom-view-tabs">
            <button type="button" class="${talentCardView.dimension === 'talent' ? 'active' : ''}" onclick="setTalentCardView('talent')">재능별</button>
            <button type="button" class="${talentCardView.dimension === 'class' ? 'active' : ''}" onclick="setTalentCardView('class')">직업별</button>
        </div></div><div class="talent-bloom-filter-grid">${chips}</div>${renderTalentCombinationStatus(owned)}</div></details>`;
}

function matchesTalentCardView(key) {
    if (!talentCardView.filterId) return true;
    let parsed = parseTalentComboKey(key);
    return talentCardView.dimension === 'talent'
        ? parsed.heroId === talentCardView.filterId
        : parsed.classKey === talentCardView.filterId;
}

function renderTalentLoadoutSlot(index, unlocked, key, owned) {
    if (!unlocked) return `<div class="talent-slot locked">🔒<br><span>보유 ${TALENT_CARD_SLOT_UNLOCKS[index]}장</span></div>`;
    if (!key || !owned[key]) return '<div class="talent-slot empty">빈 슬롯<br><span>카드를 눌러 장착</span></div>';
    let { heroId, classKey } = parseTalentComboKey(key);
    let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(owned[key].level || 1));
    return `<div class="talent-slot filled" onclick="unequipTalentSlot(${index})" title="클릭하여 해제"><strong>${escapeTalentHtml(bloomName)}</strong><span>${escapeTalentHtml(heroLabel)} × ${escapeTalentHtml(classLabel)} · Lv.${level}</span></div>`;
}

function renderTalentCollectionCard(key, owned) {
    let card = owned[key];
    let { heroId, classKey } = parseTalentComboKey(key);
    let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
    let level = Math.max(1, Math.floor(card.level || 1));
    let lines = getTalentCardEffectLines(heroId, classKey, level);
    let nextThreshold = level < TALENT_CARD_MAX_LEVEL ? TALENT_CARD_LEVEL_THRESHOLDS[level] : null;
    let nextText = nextThreshold !== null ? `다음 레벨 점수 ${nextThreshold}` : '최대 레벨';
    let equipped = getTalentCardSlotIndex(key) >= 0;
    return `<div class="talent-card${equipped ? ' equipped' : ''}" onclick="equipTalentCard('${key}')" title="클릭하여 ${equipped ? '해제' : '장착'}">
        <div class="talent-card-head">
            <span class="talent-card-title">${bloomName}</span>
            <span class="talent-card-level">Lv.${level}/${TALENT_CARD_MAX_LEVEL}</span>
        </div>
        <div class="talent-card-sub">재능 ${heroLabel} · 전직 ${classLabel}</div>
        <div class="talent-card-effects">${lines.join('<br>')}</div>
        <div class="talent-card-foot">${equipped ? '✅ 장착됨 · ' : ''}점수 ${Math.max(0, Math.floor(card.score || 0))} · 개화 ${Math.max(0, Math.floor(card.count || 0))}회 · ${nextText}</div>
    </div>`;

}

function renderTalentScoreSummary(count) {
    let bd = getTalentBloomScoreBreakdown();
    let curScore = getTalentBloomScore();
    return `보유 카드 <strong>${count}</strong> / ${TALENT_BLOOM_TOTAL_CARDS} · 총 개화 ${Math.max(0, Math.floor(game.talentBloomClears || 0))}회`
        + `<br><span style="font-size:0.85em; color:var(--copy-bright);">현재 개화 점수 <strong>${curScore}</strong> = 혼돈심화 ${bd.deepChaos} + 미궁 ${bd.labyrinth} + 혼돈계 ${bd.chaosFloor} + 지하계 ${bd.underFloor} + 우주계 ${bd.cosmos} + 전투력 ${bd.dpsTerm}</span>`
        + `<br><span style="font-size:0.82em; color:#9fe2b1;">🌸 한 번 획득한 개화 카드는 루프가 진행되어도 사라지지 않고 영구히 보유 · 적용됩니다.</span>`;
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
    let nextSlot = unlockedSlots < TALENT_CARD_SLOT_COUNT ? `<span style="color:var(--copy-bright);"> · 다음 슬롯: 보유 ${TALENT_CARD_SLOT_UNLOCKS[unlockedSlots]}장</span>` : '';
    let loadoutHtml = `${renderCurrentTalentBloomContext(owned)}${renderTalentBloomNavigator(owned)}<div class="talent-loadout-panel">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
            <strong>장착 슬롯</strong><span style="font-size:0.82em;">열린 슬롯 ${unlockedSlots}/${TALENT_CARD_SLOT_COUNT}${nextSlot}</span>
        </div>
        <div class="talent-slot-row">${slotHtml}</div>
    </div>`;

    if (ownedKeys.length === 0) {
        gridEl.innerHTML = loadoutHtml + `<div style="grid-column:1/-1; color:var(--copy-bright); padding:18px; text-align:center;">아직 개화한 카드가 없습니다. 지도 탭의 🌸 <strong>혹독한 겨울의 미궁</strong>(재능 개화 시련)을 클리어하면 현재 재능 × 직업 조합의 카드를 얻습니다.</div>`;
        return;
    }
    // 레벨 내림차순 정렬
    ownedKeys.sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
    let visibleKeys = ownedKeys.filter(matchesTalentCardView);
    let cardsHtml = visibleKeys.map(key => renderTalentCollectionCard(key, owned)).join('');
    gridEl.innerHTML = loadoutHtml + (cardsHtml || '<div class="talent-bloom-empty">이 항목으로 개화한 조합이 아직 없습니다.</div>');
}

safeExposeGlobals({ setTalentCardView, setTalentCardFilter, showTalentCombinationTooltip });
