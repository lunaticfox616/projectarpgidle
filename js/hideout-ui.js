function getHideoutDecorUnlockLabel(decor) {
    if (!decor || !decor.unlock) return '기본';
    if (decor.unlock.journal) {
        let entry = typeof JOURNAL_DB !== 'undefined' ? JOURNAL_DB[decor.unlock.journal] : null;
        return `${entry ? entry.title : decor.unlock.journal} 기록`;
    }
    if (decor.unlock.loop) return `루프 ${decor.unlock.loop}`;
    return `액트 ${decor.unlock.act}`;
}

function renderHideoutDecorArt(decor) {
    if (decor.directionalAsset) return '<span class="hideout-directional-art" aria-hidden="true"></span>';
    return `<img src="${decor.asset}" alt="">`;
}

function renderHideoutPlacedDecor(placement) {
    let decor = HIDEOUT_DECOR_DB.find(row => row.id === placement.decorId);
    if (!decor) return '';
    let activation = decor.action ? `activateHideoutDecor('${decor.id}')` : `selectHideoutDecor('${decor.id}')`;
    let footprint = getHideoutDecorFootprint(decor.id, placement.rotation);
    let rotationLabel = normalizeHideoutRotation(placement.rotation) * 90;
    let actionLabel = decor.action && decor.action.label ? decor.action.label : '연결된 탭';
    let destination = decor.action ? `${actionLabel} 열기` : '은신처 편집';
    return `<div class="hideout-placed-decor kind-${decor.kind}" style="${getHideoutDecorStyle(placement)}" data-decor-id="${decor.id}" draggable="true" ondragstart="beginHideoutDrag(event,'${decor.id}')" onclick="${activation}" title="${escapeHTML(decor.name)} · ${escapeHTML(destination)}">
        ${renderHideoutDecorArt(decor)}<strong>${escapeHTML(decor.name)} · ${footprint.columns}×${footprint.rows}<small>${escapeHTML(destination)}</small></strong><i style="--decor-direction:${rotationLabel}deg" aria-hidden="true">➤</i><div><button type="button" onclick="event.stopPropagation();rotateHideoutDecorAndSave('${decor.id}')">회전</button><button type="button" onclick="event.stopPropagation();recoverHideoutDecor('${decor.id}')">회수</button></div>
    </div>`;
}

function renderHideoutLibraryCard(decor, state) {
    let placed = state.placements.some(row => row.decorId === decor.id);
    let selected = state.selectedDecorId === decor.id;
    let actions = placed ? `<div class="hideout-library-actions"><button type="button" onclick="event.stopPropagation();rotateHideoutDecorAndSave('${decor.id}')">회전</button><button type="button" onclick="event.stopPropagation();recoverHideoutDecor('${decor.id}')">회수</button></div>` : '';
    return `<div class="hideout-library-card ${placed ? 'placed' : ''} ${selected ? 'selected' : ''}" data-decor-id="${decor.id}" role="button" tabindex="0" draggable="true" ondragstart="beginHideoutDrag(event,'${decor.id}')" onclick="selectHideoutDecor('${decor.id}')" onkeydown="if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectHideoutDecor('${decor.id}')}">
        <img src="${decor.asset}" alt=""><span><strong>${escapeHTML(decor.name)}</strong><small>${decor.kind === 'station' ? '기능 시설' : '전리품 장식'}${placed ? ' · 배치됨' : ''}</small></span>${actions}
    </div>`;
}

function beginHideoutDrag(event, decorId) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/hideout-decor', decorId);
}

function dropHideoutDecor(event, cell) {
    event.preventDefault();
    let decorId = event.dataTransfer ? event.dataTransfer.getData('text/hideout-decor') : '';
    if (decorId && placeHideoutDecor(decorId, cell)) saveHideoutChange();
}

function saveHideoutChange() {
    if (typeof saveGame === 'function') saveGame();
}

function placeSelectedHideoutDecorAndSave(cell) {
    if (!placeSelectedHideoutDecor(cell)) return false;
    saveHideoutChange();
    return true;
}

function recoverHideoutDecor(decorId) {
    if (!removeHideoutDecor(decorId)) return false;
    saveHideoutChange();
    return true;
}

function rotateHideoutDecorAndSave(decorId) {
    if (!rotateHideoutDecor(decorId)) return false;
    saveHideoutChange();
    return true;
}

function getHideoutCellStyle(cell) {
    let gridX = cell % HIDEOUT_GRID_COLUMNS;
    let gridY = Math.floor(cell / HIDEOUT_GRID_COLUMNS);
    let x = 50 + (gridX - gridY) * 5.2;
    let y = 23.66 + (gridX + gridY) * 4.62;
    return `--cell-x:${x.toFixed(2)}%;--cell-y:${y.toFixed(2)}%;--cell-depth:${gridX + gridY}`;
}

function getHideoutDecorStyle(placement) {
    let footprint = getHideoutDecorFootprint(placement.decorId, placement.rotation);
    let decor = HIDEOUT_DECOR_DB.find(row => row.id === placement.decorId);
    let gridX = placement.cell % HIDEOUT_GRID_COLUMNS + (footprint.columns - 1) / 2;
    let gridY = Math.floor(placement.cell / HIDEOUT_GRID_COLUMNS) + (footprint.rows - 1) / 2;
    let x = 50 + (gridX - gridY) * 5.2;
    let y = 23.66 + (gridX + gridY) * 4.62;
    let depth = Math.ceil(gridX + gridY);
    let footprintSpan = footprint.columns + footprint.rows;
    let width = footprintSpan * 5.2 * 0.92;
    let height = footprintSpan * 4.62 * 0.92;
    let artScale = Number(decor && decor.renderScale) || 0.6;
    let rotation = normalizeHideoutRotation(placement.rotation);
    let flipped = rotation % 2 === 0 ? 1 : -1;
    let spriteCell = getHideoutDecorSpriteCell(rotation);
    let spriteStyle = decor && decor.directionalAsset
        ? `;--decor-sheet:url('../${decor.directionalAsset}');--decor-sprite-x:${spriteCell.column * 100}%;--decor-sprite-y:${spriteCell.row * 100}%`
        : '';
    return `--decor-x:${x.toFixed(2)}%;--decor-y:${y.toFixed(2)}%;--decor-depth:${depth};--decor-width:${width.toFixed(2)}%;--decor-height:${height.toFixed(2)}%;--decor-art-scale:${artScale};--decor-art-size:${(artScale * 100).toFixed(1)}%;--decor-flip:${flipped}${spriteStyle}`;
}

function setHideoutDecorHoverState(panel, decorId, active) {
    if (!panel || !decorId) return;
    panel.querySelectorAll(`[data-occupied-decor="${decorId}"], [data-decor-id="${decorId}"]`)
        .forEach(element => element.classList.toggle('hover-target', active));
}

function bindHideoutHoverInteractions(panel) {
    if (!panel || panel.dataset.hideoutHoverBound === 'true') return;
    panel.dataset.hideoutHoverBound = 'true';
    panel.addEventListener('pointerover', event => {
        let target = event.target.closest('[data-decor-id]');
        if (!target || target.contains(event.relatedTarget)) return;
        setHideoutDecorHoverState(panel, target.dataset.decorId, true);
    });
    panel.addEventListener('pointerout', event => {
        let target = event.target.closest('[data-decor-id]');
        if (!target || target.contains(event.relatedTarget)) return;
        setHideoutDecorHoverState(panel, target.dataset.decorId, false);
    });
}

function renderHideout() {
    let panel = document.getElementById('ui-hideout-panel');
    if (!panel || !isHideoutUnlocked(game)) return;
    let state = ensureHideoutState(game);
    let unlocked = getUnlockedHideoutDecor(game);
    let placementByCell = new Map();
    state.placements.forEach(placement => getHideoutPlacementCells(placement)
        .forEach(cell => placementByCell.set(cell, placement)));
    let cells = Array.from({ length:HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS }, (_, cell) => {
        let placement = placementByCell.get(cell);
        let reserved = cell === HIDEOUT_PLAYER_CELL;
        let anchor = placement && placement.cell === cell;
        let content = reserved ? '<span class="hideout-player-marker">대기 위치</span>' : '<span></span>';
        let occupiedDecor = placement ? ` data-occupied-decor="${placement.decorId}"` : '';
        return `<div class="hideout-cell ${placement ? 'occupied footprint' : ''} ${anchor ? 'anchor' : ''} ${reserved ? 'reserved' : ''}" style="${getHideoutCellStyle(cell)}" data-cell="${cell}"${occupiedDecor} onclick="placeSelectedHideoutDecorAndSave(${cell})" ondragover="event.preventDefault()" ondrop="dropHideoutDecor(event,${cell})">${content}</div>`;
    }).join('');
    let placedDecor = state.placements.map(renderHideoutPlacedDecor).join('');
    let library = unlocked.map(decor => renderHideoutLibraryCard(decor, state)).join('');
    let locked = HIDEOUT_DECOR_DB.filter(decor => !isHideoutRequirementMet(decor.unlock, game));
    let lockedHtml = locked.map(decor => `<div class="hideout-locked-card"><span>?</span><div><strong>미발견 장식</strong><small>${escapeHTML(getHideoutDecorUnlockLabel(decor))}</small></div></div>`).join('');
    let html = `<div class="hideout-heading"><div><span>ROOT SANCTUM</span><h2>뿌리 성소</h2><p>전투 화면과 같은 8×8 공간입니다. 귀환 설정에서 ‘은신처에서 대기’를 선택하면 캐릭터가 이곳에 머뭅니다.</p></div><div><strong>${state.placements.length}</strong> / ${unlocked.length} 배치</div></div>
        <div class="hideout-layout"><div class="hideout-scene">${cells}${placedDecor}</div><aside><h3>시설과 전리품</h3><p>항목을 선택한 뒤 빈 칸을 누르거나 직접 끌어 놓으세요. 시설을 누르면 연결된 화면으로 이동하며, 회전하면 점유 방향도 함께 바뀝니다.</p><div class="hideout-library">${library}${lockedHtml}</div></aside></div>`;
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
    bindHideoutHoverInteractions(panel);
}

safeExposeGlobals({
    renderHideout, beginHideoutDrag, dropHideoutDecor,
    placeSelectedHideoutDecorAndSave, rotateHideoutDecorAndSave, recoverHideoutDecor
});
