// Slot navigation is view state; flask charge, quality and discovery stay in combat.
const flaskUi = (() => {
    let selectedSlot = 0;
    function bind(host) {
        const slots = Array.from(host.querySelectorAll('.flask-paperdoll > .flask-slot-box'));
        if (!uiDisplay.matches('(max-width: 1080px)') || !slots.length) return;
        let navigation = host.querySelector('.flask-mobile-slots');
        if (navigation) return;
        selectedSlot = Math.min(selectedSlot, slots.length - 1);
        navigation = document.createElement('label'); navigation.className = 'flask-mobile-slots';
        navigation.textContent = '관리할 슬롯';
        const select = document.createElement('select'); select.setAttribute('aria-label', '관리할 플라스크 슬롯');
        slots.forEach((slot, index) => {
            const option = document.createElement('option'); option.value = String(index);
            option.textContent = `${slot.querySelector('.flask-slot-label').textContent} · ${slot.querySelector('.flask-slot-name').textContent}`;
            select.appendChild(option); slot.dataset.flaskSelected = String(index === selectedSlot);
        });
        select.value = String(selectedSlot);
        select.onchange = () => {
            selectedSlot = Number(select.value);
            slots.forEach((slot, index) => { slot.dataset.flaskSelected = String(index === selectedSlot); });
        };
        navigation.appendChild(select); host.querySelector('.flask-paperdoll').before(navigation);
    }

    function picker(body, selectedCategory, render) {
        const label = document.createElement('label'); label.className = 'flask-mobile-category'; label.textContent = '효과 계열';
        const select = document.createElement('select'); select.setAttribute('aria-label', '플라스크 효과 계열');
        FLASK_UTILITY_CATEGORIES.forEach(category => {
            const option = document.createElement('option'); option.value = category.category;
            option.textContent = `${category.label} · ${category.statSuffix}`; select.appendChild(option);
        });
        select.value = selectedCategory || FLASK_UTILITY_CATEGORIES[0].category;
        label.appendChild(select); const cards = document.createElement('div'); body.append(label, cards);
        const refresh = () => { cards.replaceChildren(); render(cards, FLASK_UTILITY_CATEGORIES.filter(category => category.category === select.value)); };
        select.onchange = refresh; refresh();
    }
    function renderUtilityChoices(body, idx, makeOptionButton, categories) {
        const st = ensureFlaskState();
        const lvl = Math.max(1, Math.floor(game.level || 1));
        const found = ensureFlaskFoundKeys();
        const maxUtilSlots = getMaxFlaskUtilitySlotCount();
        const current = FLASK_UTILITY_POOL[st.utils[idx]?.key];
        categories.forEach(cat => {
            body.insertAdjacentHTML('beforeend', `<div class="selection-overlay-section-title">${cat.label}</div>`);
            let grid = document.createElement('div');
            grid.className = 'selection-overlay-grid';
            FLASK_UTILITY_TIER_REQ_LEVELS.forEach((reqLevel, tierIdx) => {
                let key = `${cat.category}${tierIdx + 1}`;
                let def = FLASK_UTILITY_POOL[key];
                let usedElsewhere = st.utils.some((u, i) => i < maxUtilSlots && u && FLASK_UTILITY_POOL[u.key] && FLASK_UTILITY_POOL[u.key].category === cat.category && i !== idx);
                let levelLocked = lvl < reqLevel;
                let undiscovered = !levelLocked && !found.includes(key);
                const selected = st.utils[idx]?.key === key;
                grid.appendChild(makeOptionButton({
                    name: def.name,
                    desc: `${def.desc} · ${def.maxCharges}회 · 충전 ${getFlaskEffectiveChargesPerKills(def.chargesPerKills)}처치`,
                    locked: usedElsewhere || levelLocked || undiscovered,
                    lockLabel: levelLocked ? `Lv.${reqLevel} 필요` : (undiscovered ? '미발견' : (usedElsewhere ? '다른 슬롯 장착 중' : '')),
                    selected,
                    compare: selected ? '현재 장착' : (current ? `${current.name}에서 교체` : '빈 슬롯에 장착'),
                    onSelect: () => equipUtilityFlask(idx, key)
                }));
            });
            body.appendChild(grid);
        });
    }
    return { bind, picker, renderUtilityChoices };
})();
safeExposeGlobals({ flaskUi });
