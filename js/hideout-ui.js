function getHideoutDecorUnlockLabel(decor) {
    if (!decor || !decor.unlock) return '기본';
    if (decor.unlock.journal) {
        let entry = typeof JOURNAL_DB !== 'undefined' ? JOURNAL_DB[decor.unlock.journal] : null;
        return `${entry ? entry.title : decor.unlock.journal} 기록`;
    }
    if (decor.unlock.loop) return `루프 ${decor.unlock.loop}`;
    return `액트 ${decor.unlock.act}`;
}

function renderHideoutPlacedDecor(placement) {
    let decor = HIDEOUT_DECOR_DB.find(row => row.id === placement.decorId);
    if (!decor) return '';
    let action = decor.action ? `<button type="button" onclick="event.stopPropagation();activateHideoutDecor('${decor.id}')">사용</button>` : '';
    return `<div class="hideout-placed-decor kind-${decor.kind}" draggable="true" ondragstart="beginHideoutDrag(event,'${decor.id}')" onclick="selectHideoutDecor('${decor.id}')" ondblclick="activateHideoutDecor('${decor.id}')">
        <img src="${decor.asset}" alt=""><strong>${escapeHTML(decor.name)}</strong><div>${action}<button type="button" onclick="event.stopPropagation();removeHideoutDecor('${decor.id}')">회수</button></div>
    </div>`;
}

function renderHideoutLibraryCard(decor, state) {
    let placed = state.placements.some(row => row.decorId === decor.id);
    let selected = state.selectedDecorId === decor.id;
    return `<button type="button" class="hideout-library-card ${placed ? 'placed' : ''} ${selected ? 'selected' : ''}" draggable="true" ondragstart="beginHideoutDrag(event,'${decor.id}')" onclick="selectHideoutDecor('${decor.id}')">
        <img src="${decor.asset}" alt=""><span><strong>${escapeHTML(decor.name)}</strong><small>${decor.kind === 'station' ? '기능 시설' : '전리품 장식'}${placed ? ' · 배치됨' : ''}</small></span>
    </button>`;
}

function beginHideoutDrag(event, decorId) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/hideout-decor', decorId);
}

function dropHideoutDecor(event, cell) {
    event.preventDefault();
    let decorId = event.dataTransfer ? event.dataTransfer.getData('text/hideout-decor') : '';
    if (decorId) placeHideoutDecor(decorId, cell);
}

function renderHideout() {
    let panel = document.getElementById('ui-hideout-panel');
    if (!panel || !isHideoutUnlocked(game)) return;
    let state = ensureHideoutState(game);
    let unlocked = getUnlockedHideoutDecor(game);
    let placementByCell = new Map(state.placements.map(row => [row.cell, row]));
    let cells = Array.from({ length:HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS }, (_, cell) => {
        let placement = placementByCell.get(cell);
        return `<div class="hideout-cell ${placement ? 'occupied' : ''}" data-cell="${cell}" onclick="placeSelectedHideoutDecor(${cell})" ondragover="event.preventDefault()" ondrop="dropHideoutDecor(event,${cell})">${placement ? renderHideoutPlacedDecor(placement) : '<span></span>'}</div>`;
    }).join('');
    let library = unlocked.map(decor => renderHideoutLibraryCard(decor, state)).join('');
    let locked = HIDEOUT_DECOR_DB.filter(decor => !isHideoutRequirementMet(decor.unlock, game));
    let lockedHtml = locked.map(decor => `<div class="hideout-locked-card"><span>?</span><div><strong>미발견 장식</strong><small>${escapeHTML(getHideoutDecorUnlockLabel(decor))}</small></div></div>`).join('');
    let html = `<div class="hideout-heading"><div><span>ROOT SANCTUM</span><h2>뿌리 성소</h2><p>기능 시설은 두 번 클릭하거나 ‘사용’을 누르면 해당 화면으로 이동합니다.</p></div><div><strong>${state.placements.length}</strong> / ${unlocked.length} 배치</div></div>
        <div class="hideout-layout"><div class="hideout-scene">${cells}</div><aside><h3>시설과 전리품</h3><p>항목을 선택한 뒤 빈 칸을 누르거나 직접 끌어 놓으세요. 이미 찬 칸이면 서로 교환됩니다.</p><div class="hideout-library">${library}${lockedHtml}</div></aside></div>`;
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
}

safeExposeGlobals({ renderHideout, beginHideoutDrag, dropHideoutDecor });
