let salvageRecoveryReturnFocus = null;

function getSalvageRecoveryCurrencyText(rewards) {
    let rows = Object.entries(rewards || {}).filter(([, amount]) => Number(amount) > 0);
    if (rows.length === 0) return '반환 재화 없음';
    return rows.map(([key, amount]) => `${(ORB_DB[key] && ORB_DB[key].name) || key} ${Math.floor(amount)}개`).join(' · ');
}

function getSalvageRecoveryRarityLabel(rarity) {
    return ({ normal: '일반', magic: '마법', rare: '희귀', unique: '고유' })[rarity] || '일반';
}

function getSalvageRecoveryUnavailableText(availability) {
    if (!availability || availability.canRestore) return '복구 가능';
    let missing = getSalvageRecoveryCurrencyText(availability.missing);
    return Object.keys(availability.missing || {}).length > 0 ? `부족: ${missing}` : availability.reason;
}

function renderSalvageRecoveryEntry(entry) {
    let item = entry.item;
    let availability = salvageRecoveryRuntime.getAvailability(entry.id);
    let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier || item.tier) || 1));
    let cost = getSalvageRecoveryCurrencyText(entry.rewards);
    let status = getSalvageRecoveryUnavailableText(availability);
    let disabled = availability.canRestore ? '' : 'disabled';
    return `<article class="salvage-recovery-entry rarity-${item.rarity}" data-item-tooltip-anchor="1" tabindex="0" role="group" aria-label="${escapeHTML(item.name)}"
        onmouseenter="salvageRecoveryUi.showTooltip(event,${entry.id})" onmousemove="salvageRecoveryUi.showTooltip(event,${entry.id})" onmouseleave="salvageRecoveryUi.hideTooltip(event)" onfocus="salvageRecoveryUi.showTooltip(event,${entry.id})" onblur="salvageRecoveryUi.hideTooltip(event)">
        <div class="salvage-recovery-item-head"><strong>${escapeHTML(item.name)}</strong><span>${getSalvageRecoveryRarityLabel(item.rarity)}</span></div>
        <div class="salvage-recovery-meta">${escapeHTML(item.slot)} · T${tier}</div>
        <div class="salvage-recovery-cost"><span>반환 비용</span><strong>${escapeHTML(cost)}</strong></div>
        <button type="button" onclick="salvageRecoveryUi.restore(${entry.id})" ${disabled} title="${escapeHTML(status)}">${availability.canRestore ? '재화 반환 후 복구' : escapeHTML(status)}</button>
    </article>`;
}

function renderSalvageRecoveryPanel() {
    let entries = salvageRecoveryRuntime.getEntries();
    let list = entries.length > 0
        ? `<div class="salvage-recovery-grid">${entries.map(renderSalvageRecoveryEntry).join('')}</div>`
        : '<div class="salvage-recovery-empty"><strong>복구할 장비가 없습니다.</strong><span>이번 루프에서 해체한 최근 장비가 여기에 최대 8개까지 남습니다.</span></div>';
    return `<div class="craft-picker-panel salvage-recovery-panel" role="dialog" aria-modal="true" aria-labelledby="salvage-recovery-title">
        <div class="craft-picker-head"><div><div class="craft-picker-title" id="salvage-recovery-title">♻️ 해체 복구함</div><div class="craft-picker-desc">해체로 실제 획득한 재화를 그대로 반환해 장비를 되살립니다. 최근 8개만 같은 루프 동안 보관됩니다.</div></div><button type="button" data-recovery-close onclick="salvageRecoveryUi.close()">닫기</button></div>
        ${list}
    </div>`;
}

function refreshSalvageRecoveryShortcut() {
    let button = document.getElementById('btn-salvage-recovery');
    if (!button) return;
    let count = salvageRecoveryRuntime.getEntries().length;
    button.innerHTML = count > 0 ? `해체 복구 <strong>${count}</strong>` : '해체 복구';
    button.classList.toggle('has-items', count > 0);
    button.setAttribute('aria-label', count > 0 ? `해체 복구함, 복구 가능 장비 ${count}개` : '해체 복구함, 비어 있음');
}

function refreshSalvageRecoveryOverlay() {
    let overlay = document.getElementById('salvage-recovery-overlay');
    if (overlay) overlay.innerHTML = renderSalvageRecoveryPanel();
    refreshSalvageRecoveryShortcut();
}

function closeSalvageRecoveryOverlay() {
    let overlay = document.getElementById('salvage-recovery-overlay');
    if (!overlay) return;
    hideItemTooltip();
    overlay.remove();
    if (salvageRecoveryReturnFocus && salvageRecoveryReturnFocus.isConnected) salvageRecoveryReturnFocus.focus();
    salvageRecoveryReturnFocus = null;
}

function openSalvageRecoveryOverlay() {
    closeSalvageRecoveryOverlay();
    salvageRecoveryReturnFocus = document.activeElement;
    let overlay = document.createElement('div');
    overlay.id = 'salvage-recovery-overlay';
    overlay.className = 'craft-picker-overlay salvage-recovery-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeSalvageRecoveryOverlay(); };
    overlay.onkeydown = event => { if (event.key === 'Escape') closeSalvageRecoveryOverlay(); };
    overlay.innerHTML = renderSalvageRecoveryPanel();
    document.body.appendChild(overlay);
    let closeButton = overlay.querySelector('[data-recovery-close]');
    if (closeButton) closeButton.focus();
}

function restoreSalvageRecoveryEntry(entryId) {
    hideItemTooltip();
    let result = salvageRecoveryRuntime.restore(entryId);
    if (!result.restored) {
        addLog(`♻️ 장비 복구 실패: ${result.reason}`, 'attack-monster');
        refreshSalvageRecoveryOverlay();
        return false;
    }
    addLog(`♻️ 해체 장비 복구: <span class='loot-${result.item.rarity}'>[${result.item.name}]</span> · ${getSalvageRecoveryCurrencyText(result.returned)} 반환`, 'loot-rare', { item: result.item });
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    updateStaticUI();
    refreshSalvageRecoveryOverlay();
    return true;
}

function showSalvageRecoveryTooltip(event, entryId) {
    let entry = salvageRecoveryRuntime.getEntries().find(row => row.id === Number(entryId));
    if (entry) showItemTooltip(event, null, false, entry.item, `salvage-recovery:${entry.id}`);
}

function hideSalvageRecoveryTooltip(event) {
    hideItemTooltip(event);
}

const salvageRecoveryUi = Object.freeze({
    open: openSalvageRecoveryOverlay,
    close: closeSalvageRecoveryOverlay,
    restore: restoreSalvageRecoveryEntry,
    refresh: refreshSalvageRecoveryOverlay,
    refreshShortcut: refreshSalvageRecoveryShortcut,
    showTooltip: showSalvageRecoveryTooltip,
    hideTooltip: hideSalvageRecoveryTooltip
});

// 전투 중 자동해체 이벤트로 열린 복구함 DOM을 갈아끼우면 포커스와 스크롤이 튄다.
// 열린 목록은 사용자가 닫았다 다시 열 때 갱신하고, 단축 버튼의 개수만 즉시 반영한다.
window.addEventListener('project-idle:salvage-recovery-changed', refreshSalvageRecoveryShortcut);
safeExposeGlobals({ salvageRecoveryUi });
