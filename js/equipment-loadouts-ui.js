/** The panel warning: 누락 for items that are gone, 임시 보관함 when every missing item only waits there. */
function describeLoadoutMissingWarning(missing) {
    const label = missing.every(row => row.stored) ? '임시 보관함에 있음' : '누락';
    return `${label}: ${missing.map(row => row.name).join(', ')}`;
}

function renderEquipmentLoadoutPresetSlot(preset, index, selectedSlot) {
    let inspection = equipmentLoadoutRuntime.inspect(index);
    let blocked = inspection.missing.length + inspection.incompatible.length;
    let stateClass = !preset ? ' empty' : inspection.applied ? ' applied' : blocked ? ' missing' : '';
    let meta = !preset ? '빈 세팅, 누르고 저장' : inspection.applied ? `지금 장착 중, ${inspection.count}부위`
        : inspection.missing.length > 0 ? `누락 ${inspection.missing.length}`
            : inspection.incompatible.length > 0 ? `장착 불가 ${inspection.incompatible.length}` : `${inspection.count}부위, 누르면 바꿉니다`;
    return `<button type="button" class="equipment-preset-slot${index === selectedSlot ? ' selected' : ''}${stateClass}" title="${escapeHTML(meta)}"
        aria-pressed="${index === selectedSlot}" onclick="equipmentLoadoutUi.pick(${index})"><span>${index + 1}</span>${escapeHTML(preset ? preset.name : '빈 칸')}</button>`;
}

/** The note under the 세팅 title: what keeps the selected preset from applying, else what presets do. */
function describeLoadoutPresetNote(inspection) {
    if (inspection.missing.length > 0) return describeLoadoutMissingWarning(inspection.missing);
    if (inspection.incompatible.length > 0) return `현재 장착 불가: ${inspection.incompatible.map(row => row.name).join(', ')}`;
    return '저장한 장비는 일괄 해체에서 보호';
}

/** 세팅 한 줄(2026-10-10 장비창 개편): 세팅 단추 셋, 저장, ⋯(이름 바꾸기, 비우기). 세팅을 누르면 그 세팅으로 바꾼다. */
function renderEquipmentLoadoutPresetPanel() {
    let root = document.getElementById('ui-equipment-presets');
    if (!root) return;
    let state = equipmentLoadoutRuntime.ensureState();
    let selected = state.selectedSlot;
    let preset = state.presets[selected];
    let inspection = equipmentLoadoutRuntime.inspect(selected);
    let warn = inspection.missing.length + inspection.incompatible.length > 0;
    let html = `<section class="equipment-preset-panel">
        <h4 class="eqw-title">세팅<small class="${warn ? 'is-warning' : ''}">${escapeHTML(describeLoadoutPresetNote(inspection))}</small></h4>
        <div class="equipment-preset-row">${state.presets.map((row, index) => renderEquipmentLoadoutPresetSlot(row, index, selected)).join('')}
            <button type="button" class="equipment-preset-save" onclick="equipmentLoadoutUi.save()" title="지금 장비를 ${selected + 1}번 세팅에 저장">저장</button>
            <details class="eqw-more equipment-preset-more"><summary aria-label="세팅 관리">⋯</summary><div class="eqw-more-panel">
                <button type="button" onclick="equipmentLoadoutUi.rename()" ${preset ? '' : 'disabled'}>이름 바꾸기</button>
                <button type="button" onclick="equipmentLoadoutUi.clear()" ${preset ? '' : 'disabled'}>비우기</button></div></details>
        </div>
    </section>`;
    if (root.dataset.renderHtml === html) return;
    root.innerHTML = html;
    root.dataset.renderHtml = html;
}

/** A preset button: selects it, and a saved preset that is not on yet goes on right away. */
function pickEquipmentLoadoutPreset(slotIndex) {
    selectEquipmentLoadoutPreset(slotIndex);
    let state = equipmentLoadoutRuntime.ensureState();
    if (state.presets[state.selectedSlot] && !equipmentLoadoutRuntime.inspect(state.selectedSlot).applied) applyEquipmentLoadoutPresetFromUi();
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
    addLog(`🧰 장비 세팅 [${result.preset.name}] 저장, ${result.count}부위`, 'season-up');
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
    addLog(`🧰 장비 세팅 전환: [${result.preset.name}], ${result.count}부위`, 'season-up');
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
    pick: pickEquipmentLoadoutPreset,
    save: saveEquipmentLoadoutPresetFromUi,
    apply: applyEquipmentLoadoutPresetFromUi,
    rename: renameEquipmentLoadoutPresetFromUi,
    clear: clearEquipmentLoadoutPresetFromUi
});

safeExposeGlobals({ equipmentLoadoutUi });
