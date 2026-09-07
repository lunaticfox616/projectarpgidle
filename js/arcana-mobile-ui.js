// Mobile presentation only: placement and duplicate rules remain in endgame-progression.
const arcanaMobileUi = (() => {
    let pageIndex = 0;
    let search = '';

    function placement(copy, arcana) {
        const duplicate = arcana.deckSlots.some(uid => getArcanaCopyView(uid, arcana)?.copy.cardId === copy.cardId);
        const deck = arcana.deckSlots.map((uid, index) => `<option value="deck:${index}" ${uid || duplicate ? 'disabled' : ''}>덱 ${index + 1}${uid ? ' · 사용 중' : duplicate ? ' · 동일 카드 배치됨' : ''}</option>`);
        const equipment = ARCANA_EQUIPMENT_SLOT_KEYS.map(slot => `<option value="equipment:${slot}" ${arcana.equipmentSlots[slot] ? 'disabled' : ''}>${slot}${arcana.equipmentSlots[slot] ? ' · 사용 중' : ''}</option>`);
        return `<form class="arcana-placement"><label>배치 위치<select name="destination" required aria-label="카드 배치 위치"><option value="">위치를 선택하세요</option><optgroup label="덱 · 전역 효과">${deck.join('')}</optgroup><optgroup label="장비 · 해당 부위 각인">${equipment.join('')}</optgroup></select></label><div class="arcana-mobile-preview" aria-live="polite"></div><button type="submit">여기에 배치</button></form>`;
    }

    function render(arcana, available) {
        const matching = available.filter(copy => {
            const card = getArcanaCardDef(copy.cardId);
            return card && `${card.name} ${card.deckEffect} ${card.slotEffect}`.includes(search);
        });
        const pages = Math.max(1, Math.ceil(matching.length / 6));
        pageIndex = Math.min(pageIndex, pages - 1);
        const cards = matching.slice(pageIndex * 6, pageIndex * 6 + 6).map(copy =>
            `<div class="arcana-mobile-copy">${renderArcanaCard(copy, getArcanaCardDef(copy.cardId))}${selectedArcanaCardUid === copy.uid ? placement(copy, arcana) : ''}</div>`).join('');
        const placed = [...arcana.deckSlots.map((uid, index) => ({ uid, label: `덱 ${index + 1}`, destination: 'deck', key: index })),
            ...ARCANA_EQUIPMENT_SLOT_KEYS.map(key => ({ uid: arcana.equipmentSlots[key], label: key, destination: 'equipment', key }))].filter(row => row.uid);
        return `<section class="arcana-mobile-library"><h3>미사용 카드 <small>${available.length}장</small></h3>
            <form class="arcana-search"><input name="search" aria-label="아르카나 이름 또는 효과 검색" placeholder="이름·효과 검색" value="${escapeHTML(search)}"><button type="submit">검색</button></form>
            <nav class="arcana-mobile-pages" aria-label="아르카나 페이지"><button type="button" data-arcana-page="-1" ${pageIndex === 0 ? 'disabled' : ''}>이전</button><span>${pageIndex + 1} / ${pages} · ${matching.length}장</span><button type="button" data-arcana-page="1" ${pageIndex === pages - 1 ? 'disabled' : ''}>다음</button></nav>
            <div class="arcana-collection">${cards || '<p class="arcana-empty-copy">조건에 맞는 미사용 카드가 없습니다.</p>'}</div></section>
            <section class="arcana-mobile-loadout"><h3>배치 중 <small>덱 ${arcana.deckSlots.filter(Boolean).length}/4 · 장비 ${placed.length - arcana.deckSlots.filter(Boolean).length}/12</small></h3>${placed.map(row => renderArcanaDestination(row.uid, row.label, row.destination, row.key, arcana)).join('') || '<p class="arcana-empty-copy">아직 배치한 카드가 없습니다.</p>'}</section>`;
    }

    function bind(panel) {
        panel.onclick = event => {
            const button = event.target.closest('[data-arcana-page]');
            if (!button) return;
            pageIndex = Math.max(0, pageIndex + Number(button.dataset.arcanaPage));
            renderArcanaPanel();
            panel.querySelector('.arcana-mobile-pages')?.scrollIntoView({ block: 'nearest' });
        };
        panel.onsubmit = event => {
            event.preventDefault();
            if (event.target.matches('.arcana-search')) {
                search = event.target.elements.search.value.trim(); pageIndex = 0; renderArcanaPanel();
            } else if (event.target.matches('.arcana-placement')) {
                const [destination, target] = event.target.elements.destination.value.split(':');
                placeSelectedArcanaCard(destination, target);
            }
        };
        panel.onchange = event => {
            if (!event.target.matches('.arcana-placement select')) return;
            const [destination, target] = event.target.value.split(':');
            event.target.closest('form').querySelector('.arcana-mobile-preview').innerHTML = destination === 'equipment'
                ? renderArcanaEquipmentPreview(target, selectedArcanaCardUid) : '';
        };
    }
    function reveal(uid) {
        search = '';
        const available = ensureArcanaState(game).cards.filter(copy => !getArcanaCardPlacement(copy.uid, game));
        pageIndex = Math.max(0, Math.floor(available.findIndex(copy => copy.uid === uid) / 6));
        renderArcanaPanel();
        document.querySelector('.arcana-mobile-copy .arcana-card.selected')?.scrollIntoView({ block: 'nearest' });
    }
    return { render, bind, reveal };
})();
safeExposeGlobals({ arcanaMobileUi });
