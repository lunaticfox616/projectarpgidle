// Presentation-only mobile workspace; ownership, slot rules and effect calculations stay in talent-cards.
(function () {
    'use strict';
    let pageIndex = 0;
    let search = '';
    let filterSignature = '';

    function renderCard(key, card) {
        const { heroId, classKey } = parseTalentComboKey(key);
        const names = getTalentCardName(heroId, classKey);
        const equipped = getTalentCardSlotIndex(key) >= 0;
        const level = Math.max(1, Math.floor(card.level || 1));
        return `<article class="talent-card${equipped ? ' equipped' : ''}">
            <div class="talent-card-head"><strong>${escapeTalentHtml(names.bloomName)}</strong><span>Lv.${level}</span></div>
            <div class="talent-card-sub">${escapeTalentHtml(names.heroLabel)} · ${escapeTalentHtml(names.classLabel)}</div>
            <div class="talent-card-effects">${getTalentCardEffectLines(heroId, classKey, level).join('<br>')}</div>
            <div class="talent-card-foot">점수 ${Math.floor(card.score || 0)} · ${level < TALENT_CARD_MAX_LEVEL ? `다음 레벨 ${TALENT_CARD_LEVEL_THRESHOLDS[level]}` : '최대 레벨'}</div>
            <button type="button" data-talent-equip="${key}" aria-pressed="${equipped}">${equipped ? '장착 해제' : '장착'}</button>
        </article>`;
    }

    function renderSlots(owned) {
        const unlocked = getUnlockedTalentSlotCount();
        return `<section class="talent-loadout-panel"><strong>장착 ${game.talentCardLoadout.filter(Boolean).length} / ${unlocked}</strong>
            <div class="talent-slot-row">${game.talentCardLoadout.map((key, index) => {
                if (!key && index < unlocked) return '<div class="talent-slot empty">빈 슬롯<span>아래 목록에서 장착</span></div>';
                if (!key || !owned[key]) return renderTalentLoadoutSlot(index, index < unlocked, key, owned);
                const { heroId, classKey } = parseTalentComboKey(key);
                const name = getTalentCardName(heroId, classKey).bloomName;
                return `<button type="button" class="talent-slot filled" data-talent-unequip="${index}" aria-label="${escapeTalentHtml(name)} 장착 해제"><strong>${escapeTalentHtml(name)}</strong><span>Lv.${owned[key].level} · 해제</span></button>`;
            }).join('')}</div></section>`;
    }

    function renderFilters(owned) {
        const options = getTalentCardDimensionRows(owned).map(row => `<option value="${row.id}"${talentCardView.filterId === row.id ? ' selected' : ''}>${escapeTalentHtml(row.label)} · ${row.count}</option>`).join('');
        return `<div class="talent-mobile-filters">
            <label>분류<select data-talent-dimension><option value="talent"${talentCardView.dimension === 'talent' ? ' selected' : ''}>재능별</option><option value="class"${talentCardView.dimension === 'class' ? ' selected' : ''}>직업별</option></select></label>
            <label>항목<select data-talent-filter><option value="">전체</option>${options}</select></label>
            <form class="talent-mobile-search"><label>재능 검색<input type="search" data-talent-search value="${escapeHTML(search)}" placeholder="이름 · 재능 · 직업" enterkeyhint="search"></label><button type="submit">검색</button></form>
        </div>`;
    }

    function renderMobileTalentTab(owned) {
        ensureTalentCardLoadout();
        const signature = JSON.stringify([talentCardView, search]);
        if (filterSignature !== signature) { pageIndex = 0; filterSignature = signature; }
        const keys = Object.keys(owned).filter(key => {
            if (!matchesTalentCardView(key)) return false;
            const { heroId, classKey } = parseTalentComboKey(key);
            return Object.values(getTalentCardName(heroId, classKey)).join(' ').toLowerCase().includes(search.toLowerCase());
        }).sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
        const pages = Math.max(1, Math.ceil(keys.length / 6));
        pageIndex = Math.min(pageIndex, pages - 1);
        document.getElementById('ui-talent-summary').innerHTML = `<strong>보유 ${Object.keys(owned).length} / ${TALENT_BLOOM_TOTAL_CARDS}</strong><span>루프 이후에도 영구 보유</span>`;
        const pager = `<nav class="talent-mobile-pager" aria-label="재능 페이지"><button type="button" data-talent-page="-1"${pageIndex === 0 ? ' disabled' : ''}>이전</button><span aria-live="polite">${pageIndex + 1} / ${pages} · ${keys.length}장</span><button type="button" data-talent-page="1"${pageIndex === pages - 1 ? ' disabled' : ''}>다음</button></nav>`;
        const cards = keys.slice(pageIndex * 6, pageIndex * 6 + 6).map(key => renderCard(key, owned[key])).join('');
        const grid = document.getElementById('ui-talent-card-grid');
        const expanded = grid.querySelector('.talent-mobile-progress')?.open;
        grid.innerHTML = renderSlots(owned) + renderFilters(owned) + pager
            + (cards || '<p class="talent-bloom-empty">표시할 재능이 없습니다. 검색·분류 조건 또는 개화 현황을 확인하세요.</p>')
            + `<details class="talent-mobile-progress" data-ui-disclosure="talent-mobile-progress"${expanded ? ' open' : ''}><summary>이번 루프 · 개화 현황</summary>${renderCurrentTalentBloomContext(owned)}<p>현재 개화 점수 ${getTalentBloomScore()}</p>${renderTalentCombinationStatus(owned)}</details>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('ui-talent-card-grid');
        root.addEventListener('change', event => {
            const target = event.target;
            if (target.hasAttribute('data-talent-dimension')) setTalentCardView(target.value);
            else if (target.hasAttribute('data-talent-filter')) setTalentCardFilter(target.value || null);
        });
        root.addEventListener('submit', event => {
            if (!event.target.matches('.talent-mobile-search')) return;
            event.preventDefault();
            search = event.target.querySelector('input').value.trim();
            renderTalentTab();
        });
        root.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button || button.disabled) return;
            if (button.hasAttribute('data-talent-equip')) equipTalentCard(button.dataset.talentEquip);
            else if (button.hasAttribute('data-talent-unequip')) unequipTalentSlot(Number(button.dataset.talentUnequip));
            else if (button.hasAttribute('data-talent-page')) { pageIndex += Number(button.dataset.talentPage); renderTalentTab(); }
        });
    }, { once: true });
    safeExposeGlobals({ renderMobileTalentTab });
}());
