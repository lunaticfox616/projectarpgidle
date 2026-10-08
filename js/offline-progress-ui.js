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
        return `<button type="button" onclick="handleOfflineDirective('${id}')">${label} 해금 (${cost} 잔재)</button>`;
    }

    const HUNT_MODE_LABELS = { push: '밀어붙이기', current: '지금 지역 반복', highestCleared: '최고 기록 다음 층', stopBeforeBoss: '보스 앞에서 멈춤' };
    const LOOT_MODE_LABELS = { rarity: '희귀도', itemLevel: '아이템 레벨', baseTier: '바탕 등급' };
    const percent = rate => `${Math.round((rate || 0) * 100)}%`;
    function modeSelect(kind, labels, current) {
        return `<select onchange="handleOfflinePolicy('${kind}', this.value)">${Object.entries(labels).map(([mode, label]) => `<option value="${mode}" ${current === mode ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
    }

    /** 방치 효율 2(data/offline-progress.js): 잔재 강화에 더해지는 출처와 상한. */
    function efficiencyHtml(config) {
        let parts = [`잔재 강화 ${percent(config.baseEfficiencyRate)}`].concat((config.efficiencySources || []).map(row => `${escapeHtml(row.label)} ${percent(row.rate)}`));
        let capped = config.efficiencyRate < (config.efficiencySources || []).reduce((sum, row) => sum + row.rate, config.baseEfficiencyRate || 0) - 1e-9;
        return `<p class="offline-progress-efficiency">효율 <strong>${percent(config.efficiencyRate)}</strong> = ${parts.join(' + ')}${capped ? ` (상한 ${percent(OFFLINE_PROGRESS_EFFICIENCY_CAP)})` : ''}</p>
            <p class="offline-progress-hint">잔재 밖에서도 오릅니다: 고요한 시대(아틀라스 시대 특전), 무기 숙련 합계, 세계수 연대기 나이테.</p>`;
    }

    function buildOfflineProgressHtml(view) {
        if (!view) return '';
        let config = view.config || {};
        let warning = config.recognitionHours > 12 ? '<p class="offline-progress-warning">12시간 이후 업그레이드는 비용이 크게 증가합니다.</p>' : '';
        let stash = view.stash || [];
        let stashHtml = stash.length ? stash.map((item, index) => `<button class="offline-stash-item" type="button" onclick="withdrawOfflineStashItem(${index})" oncontextmenu="event.preventDefault(); salvageOfflineStashItem(${index});"><span>${escapeHtml(item.name || '장비')}</span><small>${escapeHtml(item.rarity || 'normal')}</small></button>`).join('') : '<span class="offline-progress-empty">보관된 장비가 없습니다.</span>';
        let policy = `<div class="offline-progress-policy">${view.huntDirectiveUnlocked ? `<label>사냥 ${modeSelect('huntMode', HUNT_MODE_LABELS, view.huntMode)}</label>` : ''}${view.safeReturnUnlocked ? `<label>연속 사망 <select onchange="handleOfflinePolicy('consecutiveDeaths', this.value)">${[3, 5, 10].map(value => `<option ${view.safetyPolicy.consecutiveDeaths === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label><input type="checkbox" ${view.safetyPolicy.stopOnNegativeExp ? 'checked' : ''} onchange="handleOfflinePolicy('stopOnNegativeExp', this.checked)"> 경험치 손실 시 중단</label>` : ''}${view.lootDirectiveUnlocked ? `<label>전리품 ${modeSelect('lootMode', LOOT_MODE_LABELS, view.lootPolicy.mode)}</label>` : ''}</div>`;
        return `<section class="offline-progress-panel"><div class="offline-progress-heading"><h2>영구 방치 성장</h2><span class="offline-progress-currency">시간의 잔재 <strong>${view.wallet}</strong></span></div><p>완료 루프 ${view.completedLoops}, 누적 지급 ${view.lifetimeGranted}/${view.maxLifetimeGrant}, 인식 한도 ${formatOfflineHours(config.recognitionHours)}</p>${efficiencyHtml(config)}${warning}<div class="offline-progress-upgrades">${upgradeRow('recognition', '시간 인식', view.recognition, formatOfflineHours(view.recognition.current.hours))}${upgradeRow('efficiency', '전투 효율', view.efficiency, `${Math.round(view.efficiency.current.rate * 100)}%`)}${upgradeRow('stash', '보관함', view.stashUpgrade, `${view.stashSlots}칸`)}</div><div class="offline-progress-directives"><strong>방치 지시</strong>${directiveButton('hunt', '사냥 지시', view.huntDirectiveUnlocked, 10)}${directiveButton('safety', '안전 귀환', view.safeReturnUnlocked, 12)}${directiveButton('loot', '전리품 지시', view.lootDirectiveUnlocked, 15)}</div>${policy}<div class="offline-progress-stash"><strong>방치 보관함 ${stash.length}/${view.stashSlots}</strong><span>누르면 회수, 우클릭하면 해체, 루프마다 비워집니다</span><div class="offline-stash-list">${stashHtml}</div></div></section>`;
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
        let item = stash[index];
        if (!canStoreEquipmentItems([item], state)) { if (typeof addLog === 'function') addLog('인벤토리 공간이 부족합니다.', 'attack-monster'); return false; }
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
