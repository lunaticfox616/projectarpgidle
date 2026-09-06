(function () {
    'use strict';
    const rarityNames = { normal: '일반', magic: '매직', rare: '희귀', unique: '고유' };

    function renderPickup() {
        const settings = game.settings;
        const grades = Object.entries(rarityNames).map(([id, name]) => `<label><input type="checkbox" id="chk-item-filter-${id}" ${settings.itemFilterRarities[id] ? 'checked' : ''} onchange="equipmentLootUi.updatePickup()">${name}</label>`).join('');
        return `<details class="loot-filter-section"><summary>습득 조건</summary>
            <label><input id="chk-item-filter-enabled" type="checkbox" ${settings.itemFilterEnabled ? 'checked' : ''} onchange="equipmentLootUi.updatePickup()">습득 조건 사용</label>
            <p class="loot-filter-note">조건 밖 장비는 획득하지 않습니다. 목표 옵션과 추적 중인 고유 장비는 우선 보관합니다.</p>
            <div class="loot-filter-grades">${grades}</div><div class="loot-filter-fields">
            <label>장비 티어 최소<input id="inp-item-filter-hidden-tier" type="number" min="1" max="20" value="${settings.itemFilterMinHiddenTier}" onchange="equipmentLootUi.updatePickup()"></label>
            <label>추가 옵션 티어 기준<input id="inp-item-filter-tier-threshold" type="number" min="1" max="20" value="${settings.itemFilterTierThreshold}" onchange="equipmentLootUi.updatePickup()"></label>
            <label>기준 이상 옵션 최소 개수<input id="inp-item-filter-tier-count" type="number" min="0" max="6" value="${settings.itemFilterMinTierCount}" onchange="equipmentLootUi.updatePickup()"></label></div>
            <label><input id="chk-item-filter-unique-new-codex" type="checkbox" ${settings.itemFilterOnlyNewCodexUnique ? 'checked' : ''} onchange="equipmentLootUi.updatePickup()">고유는 도감에 없는 것만 습득</label></details>`;
    }

    function renderRule(rule, index) {
        const options = equipmentLootPolicy.statOptions().map(stat => `<option value="${escapeHTML(stat.id)}" ${stat.id === rule.statId ? 'selected' : ''}>${escapeHTML(stat.name)}</option>`).join('');
        return `<div class="loot-target-rule" data-target-rule>
            <label>목표 옵션<select data-field="statId" aria-label="목표 옵션 ${index + 1}" onchange="equipmentLootUi.updateTargets()">${options}</select></label>
            <label>최소 수치<input data-field="minValue" type="number" step="any" min="0" value="${rule.minValue}" aria-label="최소 수치 ${index + 1}" onchange="equipmentLootUi.updateTargets()"></label>
            <label>최소 티어<input data-field="minTier" type="number" min="0" max="20" value="${rule.minTier}" aria-label="최소 티어 ${index + 1}" onchange="equipmentLootUi.updateTargets()"></label>
            <button type="button" aria-label="목표 옵션 ${index + 1} 삭제" onclick="equipmentLootUi.removeRule(${index})">삭제</button></div>`;
    }

    function renderTargets() {
        const filter = game.settings.equipmentTargets;
        const slots = ['any', ...EQUIPMENT_DROP_SLOTS].map(slot => `<option value="${escapeHTML(slot)}" ${filter.slot === slot ? 'selected' : ''}>${slot === 'any' ? '모든 장비 부위' : escapeHTML(slot)}</option>`).join('');
        return `<div class="loot-filter-section loot-target-section"><h3>노리는 옵션 · 우선 보관</h3>
            <label><input id="loot-target-enabled" type="checkbox" ${filter.enabled ? 'checked' : ''} onchange="equipmentLootUi.updateTargets()">목표 옵션 보호 사용</label>
            <p class="loot-filter-note">일치한 장비는 습득 제한·자동해체·일괄해체에서 보호합니다. 개별 해체는 가능합니다.</p>
            <div class="loot-filter-fields"><label>장비 부위<select id="loot-target-slot" onchange="equipmentLootUi.updateTargets()">${slots}</select></label>
            <label>검사할 옵션<select id="loot-target-scope" onchange="equipmentLootUi.updateTargets()"><option value="explicit" ${filter.scope === 'explicit' ? 'selected' : ''}>추가 옵션만</option><option value="all" ${filter.scope === 'all' ? 'selected' : ''}>기본·추가·지하 마법부여</option></select></label>
            <label>충족할 조건 수<input id="loot-target-count" type="number" min="1" max="${Math.max(1, filter.rules.length)}" value="${filter.minMatches}" onchange="equipmentLootUi.updateTargets()"></label></div>
            <div id="loot-target-rules">${filter.rules.map(renderRule).join('') || '<p class="loot-filter-note">노리는 옵션을 추가해 주세요.</p>'}</div>
            <button type="button" id="loot-target-add" ${filter.rules.length >= 6 ? 'disabled' : ''} onclick="equipmentLootUi.addRule()">옵션 추가</button>
            <p class="loot-filter-note">조건은 최대 6개. 조건 수 1은 하나만 일치해도 보호합니다. 수치는 옵션에 적힌 단위이며, 최소 티어 0은 제한 없음입니다. 복합 옵션도 검사하고 서로 다른 줄의 수치는 합산하지 않습니다.</p>
            <p id="loot-target-preview" role="status"></p></div>`;
    }

    function renderPanel(rarityChips) {
        const enabled = !!game.settings.autoSalvageEnabled;
        return `<div class="craft-picker-panel equipment-loot-panel" role="dialog" aria-modal="true" aria-label="장비 드랍 필터 및 해체 설정">
            <div class="craft-picker-head"><div><div class="craft-picker-title">장비 드랍 필터 · 해체</div><div class="craft-picker-desc">목표 장비를 남기고, 필요 없는 장비를 정리합니다.</div></div><button type="button" onclick="closeAutoSalvageConfigOverlay()">닫기</button></div>
            <div class="equipment-loot-body"><div id="loot-target-config">${renderTargets()}</div>
            <section class="loot-filter-section"><h3>자동해체</h3><p class="loot-filter-note">우선 보관 대상은 제외하고, 습득 조건을 통과한 장비 중 아래 등급을 해체합니다.</p>
            <div id="auto-salvage-rarity-chips" class="loot-filter-grades">${rarityChips}</div>
            <div class="loot-filter-actions"><button type="button" id="auto-salvage-toggle-btn" onclick="toggleAutoSalvage();refreshAutoSalvageConfigOverlay();">${enabled ? '자동해체 끄기' : '자동해체 켜기'}</button><span id="auto-salvage-status">현재: ${enabled ? 'ON' : 'OFF'}</span></div></section>
            ${renderPickup()}<p class="loot-filter-note">설정은 자동 저장됩니다. 기존 인벤토리 표시 필터는 목록 표시만 바꿉니다.</p></div></div>`;
    }

    function saveAndPreview() {
        queueImportantSave(200);
        const label = document.getElementById('loot-target-preview');
        if (!label) return;
        const filter = game.settings.equipmentTargets;
        const count = game.inventory.filter(item => equipmentLootPolicy.matches(item)).length;
        label.textContent = filter.enabled ? `현재 인벤토리에서 ${count}개 보호 · ${filter.minMatches}개 조건 충족 시 보관` : '목표 옵션 보호 꺼짐';
    }

    function updatePickup() {
        const root = document.getElementById('auto-salvage-config-overlay');
        if ([...root.querySelectorAll('.loot-filter-section input[type="number"]')].some(input => !input.reportValidity())) return;
        const settings = game.settings;
        settings.itemFilterEnabled = root.querySelector('#chk-item-filter-enabled').checked;
        Object.keys(rarityNames).forEach(id => { settings.itemFilterRarities[id] = root.querySelector(`#chk-item-filter-${id}`).checked; });
        settings.itemFilterMinHiddenTier = Number(root.querySelector('#inp-item-filter-hidden-tier').value);
        settings.itemFilterTierThreshold = Number(root.querySelector('#inp-item-filter-tier-threshold').value);
        settings.itemFilterMinTierCount = Number(root.querySelector('#inp-item-filter-tier-count').value);
        settings.itemFilterOnlyNewCodexUnique = root.querySelector('#chk-item-filter-unique-new-codex').checked;
        saveAndPreview();
    }

    function updateTargets() {
        const root = document.getElementById('loot-target-config');
        if ([...root.querySelectorAll('input[type="number"]')].some(input => !input.reportValidity())) return;
        const rules = [...root.querySelectorAll('[data-target-rule]')].map(row => ({
            statId: row.querySelector('[data-field="statId"]').value,
            minValue: Number(row.querySelector('[data-field="minValue"]').value),
            minTier: Number(row.querySelector('[data-field="minTier"]').value)
        }));
        if (new Set(rules.map(rule => rule.statId)).size !== rules.length) {
            document.getElementById('loot-target-preview').textContent = '같은 옵션은 한 번만 선택해 주세요. 중복 설정은 저장하지 않았습니다.';
            return;
        }
        game.settings.equipmentTargets = equipmentLootPolicy.normalizeTargets({
            enabled: root.querySelector('#loot-target-enabled').checked, slot: root.querySelector('#loot-target-slot').value,
            scope: root.querySelector('#loot-target-scope').value, minMatches: Number(root.querySelector('#loot-target-count').value), rules
        });
        saveAndPreview();
    }

    function addRule() {
        const filter = game.settings.equipmentTargets;
        if (filter.rules.length >= 6) return;
        const option = equipmentLootPolicy.statOptions().find(stat => !filter.rules.some(rule => rule.statId === stat.id));
        filter.rules.push({ statId: option.id, minValue: 0, minTier: 0 });
        document.getElementById('loot-target-config').innerHTML = renderTargets();
        saveAndPreview();
    }

    function removeRule(index) {
        const filter = game.settings.equipmentTargets;
        filter.rules.splice(index, 1);
        game.settings.equipmentTargets = equipmentLootPolicy.normalizeTargets(filter);
        document.getElementById('loot-target-config').innerHTML = renderTargets();
        saveAndPreview();
    }

    function renderHighlights(highlights) {
        if (!highlights || !highlights.items.length) return '';
        const cards = highlights.items.map(item => `<li class="loot-highlight-card"><span class="loot-highlight-reason">${escapeHTML(item.reason)}</span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.slot)} · ${escapeHTML(rarityNames[item.rarity] || item.rarity)} · ${escapeHTML(item.location)}</small></li>`).join('');
        return `<section class="loot-return-highlights"><h3>이번 사냥의 주요 획득 <small>${highlights.total}개</small></h3><ul>${cards}</ul><p>보관 중인 새 장비에서 최대 5개를 보여줍니다. 장착 장비와 방치 보관함도 포함합니다.</p></section>`;
    }

    const equipmentLootUi = Object.freeze({ renderPanel, updatePickup, updateTargets, addRule, removeRule, saveAndPreview, renderHighlights });
    safeExposeGlobals({ equipmentLootUi });
})();
