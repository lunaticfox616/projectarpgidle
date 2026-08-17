function renderEquipmentLoadoutPresetSlot(preset, index, selectedSlot) {
    let inspection = equipmentLoadoutRuntime.inspect(index);
    let blocked = inspection.missing.length + inspection.incompatible.length;
    let stateClass = !preset ? ' empty' : inspection.applied ? ' applied' : blocked ? ' missing' : '';
    let meta = !preset ? '빈 세팅' : inspection.applied ? `현재 적용 · ${inspection.count}부위`
        : inspection.missing.length > 0 ? `누락 ${inspection.missing.length}`
            : inspection.incompatible.length > 0 ? `장착 불가 ${inspection.incompatible.length}` : `${inspection.count}부위`;
    return `<button type="button" class="equipment-preset-slot${index === selectedSlot ? ' selected' : ''}${stateClass}"
        aria-pressed="${index === selectedSlot}" onclick="equipmentLoadoutUi.select(${index})">
        <span>${index + 1}</span><strong>${escapeHTML(preset ? preset.name : `세팅 ${index + 1}`)}</strong><small>${meta}</small>
    </button>`;
}

function renderEquipmentLoadoutPresetPanel() {
    let root = document.getElementById('ui-equipment-presets');
    if (!root) return;
    let state = equipmentLoadoutRuntime.ensureState();
    let selected = state.selectedSlot;
    let preset = state.presets[selected];
    let inspection = equipmentLoadoutRuntime.inspect(selected);
    let warning = inspection.missing.length > 0
        ? `<span class="equipment-preset-warning">누락: ${escapeHTML(inspection.missing.map(row => row.name).join(', '))}</span>`
        : inspection.incompatible.length > 0
            ? `<span class="equipment-preset-warning">현재 장착 불가: ${escapeHTML(inspection.incompatible.map(row => row.name).join(', '))}</span>`
            : '<span>프리셋에 저장된 장비는 일괄 해체에서 자동 보호됩니다.</span>';
    root.innerHTML = `<section class="equipment-preset-panel">
        <header><div><span>GEAR SETS</span><strong>장비 세팅 프리셋</strong></div><small>사냥·보스·생존 세팅을 안전하게 전환</small></header>
        <div class="equipment-preset-slots">${state.presets.map((row, index) => renderEquipmentLoadoutPresetSlot(row, index, selected)).join('')}</div>
        <div class="equipment-preset-actions">
            <button type="button" onclick="equipmentLoadoutUi.save()">현재 장비 저장</button>
            <button type="button" class="primary" onclick="equipmentLoadoutUi.apply()" ${preset ? '' : 'disabled'}>세팅 불러오기</button>
            <button type="button" onclick="equipmentLoadoutUi.rename()" ${preset ? '' : 'disabled'}>이름</button>
            <button type="button" onclick="equipmentLoadoutUi.clear()" ${preset ? '' : 'disabled'}>비우기</button>
        </div><div class="equipment-preset-note">${warning}</div>
    </section>`;
}

function selectEquipmentLoadoutPreset(slotIndex) {
    let state = equipmentLoadoutRuntime.ensureState();
    state.selectedSlot = Math.max(0, Math.min(equipmentLoadoutRuntime.limit - 1, Math.floor(Number(slotIndex) || 0)));
    renderEquipmentLoadoutPresetPanel();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
}

async function saveEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let index = state.selectedSlot;
    if (state.presets[index] && !await requestGameConfirmation(`${index + 1}번 [${state.presets[index].name}] 세팅을 현재 장비로 덮어씁니다.`, {
        title: '장비 세팅 덮어쓰기', confirmLabel: '현재 장비 저장'
    })) return false;
    let result = equipmentLoadoutRuntime.save(index);
    if (!result.ok) { addLog(result.reason, 'attack-monster'); return false; }
    addLog(`🧰 장비 세팅 [${result.preset.name}] 저장 · ${result.count}부위`, 'season-up');
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

function applyEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let result = equipmentLoadoutRuntime.apply(state.selectedSlot);
    if (!result.ok) { addLog(`장비 세팅 전환 실패: ${result.reason}`, 'attack-monster'); return false; }
    if (typeof normalizeSupportLoadout === 'function') normalizeSupportLoadout(true);
    // 장착 슬롯을 제작 대상으로 선택한 상태에서 세팅을 바꾸면 같은 슬롯의 다른 장비가
    // 조용히 제작 대상이 될 수 있다. 성공한 전환에서만 선택을 명시적으로 해제한다.
    if (typeof clearCraftSelection === 'function') clearCraftSelection();
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    addLog(`🧰 장비 세팅 전환: [${result.preset.name}] · ${result.count}부위`, 'season-up');
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

async function renameEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    if (!preset) return false;
    let name = await requestGameText('장비 세팅 이름을 입력하세요.', {
        title: '프리셋 이름', value: preset.name, maxlength: 18, confirmLabel: '변경'
    });
    if (!name || !equipmentLoadoutRuntime.rename(state.selectedSlot, name)) return false;
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    renderEquipmentLoadoutPresetPanel();
    return true;
}

async function clearEquipmentLoadoutPresetFromUi() {
    let state = equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    if (!preset || !await requestGameConfirmation(`[${preset.name}] 세팅 기록을 비웁니다. 장비는 사라지지 않습니다.`, {
        title: '장비 세팅 비우기', tone: 'danger', confirmLabel: '기록 비우기'
    })) return false;
    equipmentLoadoutRuntime.clear(state.selectedSlot);
    if (typeof queueImportantSave === 'function') queueImportantSave(100);
    updateStaticUI();
    return true;
}

const equipmentLoadoutUi = Object.freeze({
    render: renderEquipmentLoadoutPresetPanel,
    select: selectEquipmentLoadoutPreset,
    save: saveEquipmentLoadoutPresetFromUi,
    apply: applyEquipmentLoadoutPresetFromUi,
    rename: renameEquipmentLoadoutPresetFromUi,
    clear: clearEquipmentLoadoutPresetFromUi
});

safeExposeGlobals({ equipmentLoadoutUi });
