(function () {
    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function formatOfflineHours(hours) { return `${Number(hours || 0)}시간`; }

    function upgradeRow(type, label, row, valueLabel) {
        let next = row.next;
        let button = next ? `<button type="button" onclick="handleOfflineProgressUpgrade('${type}')">${next.cost} 잔재로 강화</button>` : '<span class="offline-progress-max">최대</span>';
        return `<div class="offline-progress-upgrade"><div><strong>${label} Lv.${row.level}</strong><span>${valueLabel}</span></div>${button}</div>`;
    }

    function directiveButton(id, label, unlocked, cost) {
        if (unlocked) return `<span class="offline-progress-unlocked">${label} 해금됨</span>`;
        return `<button type="button" onclick="handleOfflineDirective('${id}')">${label} 해금 · ${cost} 잔재</button>`;
    }

    function buildOfflineProgressHtml(view) {
        if (!view) return '';
        let config = view.config || {};
        let warning = config.recognitionHours > 12 ? '<p class="offline-progress-warning">12시간 이후 업그레이드는 비용이 크게 증가합니다.</p>' : '';
        let stash = view.stash || [];
        let stashHtml = stash.length ? stash.map((item, index) => `<button class="offline-stash-item" type="button" onclick="withdrawOfflineStashItem(${index})" oncontextmenu="event.preventDefault(); salvageOfflineStashItem(${index});"><span>${escapeHtml(item.name || '장비')}</span><small>${escapeHtml(item.rarity || 'normal')}</small></button>`).join('') : '<span class="offline-progress-empty">보관된 장비가 없습니다.</span>';
        let policy = `<div class="offline-progress-policy">${view.huntDirectiveUnlocked ? `<label>사냥 <select onchange="handleOfflinePolicy('huntMode', this.value)">${['push', 'current', 'highestCleared', 'stopBeforeBoss'].map(mode => `<option value="${mode}" ${view.huntMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>` : ''}${view.safeReturnUnlocked ? `<label>연속 사망 <select onchange="handleOfflinePolicy('consecutiveDeaths', this.value)">${[3, 5, 10].map(value => `<option ${view.safetyPolicy.consecutiveDeaths === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label><input type="checkbox" ${view.safetyPolicy.stopOnNegativeExp ? 'checked' : ''} onchange="handleOfflinePolicy('stopOnNegativeExp', this.checked)"> 경험치 손실 시 중단</label>` : ''}${view.lootDirectiveUnlocked ? `<label>전리품 <select onchange="handleOfflinePolicy('lootMode', this.value)">${['rarity', 'itemLevel', 'baseTier'].map(mode => `<option value="${mode}" ${view.lootPolicy.mode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>` : ''}</div>`;
        return `<section class="offline-progress-panel"><div class="offline-progress-heading"><h2>영구 방치 성장</h2><span class="offline-progress-currency">⌛ 시간의 잔재 <strong>${view.wallet}</strong></span></div><p>완료 루프 ${view.completedLoops} · 누적 지급 ${view.lifetimeGranted}/${view.maxLifetimeGrant} · 인식 한도 ${formatOfflineHours(config.recognitionHours)} · 효율 ${Math.round((config.efficiencyRate || 0) * 100)}%</p>${warning}<div class="offline-progress-upgrades">${upgradeRow('recognition', '시간 인식', view.recognition, formatOfflineHours(view.recognition.current.hours))}${upgradeRow('efficiency', '전투 효율', view.efficiency, `${Math.round(view.efficiency.current.rate * 100)}%`)}${upgradeRow('stash', '보관함', view.stashUpgrade, `${view.stashSlots}칸`)}</div><div class="offline-progress-directives"><strong>방치 지시</strong>${directiveButton('hunt', '사냥 지시', view.huntDirectiveUnlocked, 10)}${directiveButton('safety', '안전 귀환', view.safeReturnUnlocked, 12)}${directiveButton('loot', '전리품 지시', view.lootDirectiveUnlocked, 15)}</div>${policy}<div class="offline-progress-stash"><strong>방치 보관함 ${stash.length}/${view.stashSlots}</strong><span>클릭: 회수 · 우클릭: 해체 · 루프 시 초기화</span><div class="offline-stash-list">${stashHtml}</div></div></section>`;
    }

    function refreshOfflineProgressUi() {
        if (typeof renderRecordsTab === 'function') renderRecordsTab();
        if (typeof updateStaticUI === 'function') updateStaticUI();
        if (typeof queueImportantSave === 'function') queueImportantSave(200);
    }

    function handleOfflineProgressUpgrade(type) {
        let result = purchaseOfflineProgressUpgradeDomain(type);
        if (!result.ok && typeof addLog === 'function') addLog('영구 방치 강화에 필요한 시간의 잔재가 부족합니다.', 'attack-monster');
        if (result.ok) refreshOfflineProgressUi();
        return result;
    }

    function handleOfflineDirective(id) {
        let result = purchaseOfflineDirectiveDomain(id);
        if (!result.ok && typeof addLog === 'function') addLog('방치 지시를 해금할 시간의 잔재가 부족합니다.', 'attack-monster');
        if (result.ok) refreshOfflineProgressUi();
        return result;
    }

    function handleOfflinePolicy(kind, value) {
        updateOfflineProgressPolicy(kind, value, getOfflineState());
        refreshOfflineProgressUi();
    }

    function getOfflineState() { return typeof game !== 'undefined' ? game : null; }
    function purchaseOfflineProgressUpgradeDomain(type) { return purchaseOfflineProgressUpgrade(type, getOfflineState()); }
    function purchaseOfflineDirectiveDomain(id) { return purchaseOfflineDirective(id, getOfflineState()); }

    function withdrawOfflineStashItem(index) {
        let state = getOfflineState(), stash = state && state.offlineProgress && state.offlineProgress.stash;
        if (!Array.isArray(stash) || !stash[index]) return false;
        if ((state.inventory || []).length >= getInventoryLimit()) { if (typeof addLog === 'function') addLog('인벤토리 공간이 부족합니다.', 'attack-monster'); return false; }
        state.inventory.push(stash.splice(index, 1)[0]);
        ensureOfflineProgressState(state);
        if (typeof checkUnlocks === 'function') checkUnlocks();
        refreshOfflineProgressUi();
        return true;
    }

    function salvageOfflineStashItem(index) {
        let state = getOfflineState(), stash = state && state.offlineProgress && state.offlineProgress.stash;
        if (!Array.isArray(stash) || !stash[index]) return false;
        let item = stash.splice(index, 1)[0];
        ensureOfflineProgressState(state);
        if (typeof salvageItemObject === 'function') salvageItemObject(item, false, { noDivine: true });
        refreshOfflineProgressUi();
        return true;
    }

    safeExposeGlobals({ buildOfflineProgressHtml, handleOfflineProgressUpgrade, handleOfflineDirective, handleOfflinePolicy, withdrawOfflineStashItem, salvageOfflineStashItem });
}());
