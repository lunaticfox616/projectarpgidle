(function () {
    'use strict';

    let focusedItemKey = null;
    let focusedEquipmentSlot = null;
    let carryState = null;
    let pointerState = null;
    let suppressClickUntil = 0;
    let carryFrame = 0;
    let pendingPointer = null;
    let activePage = 0;
    let doubleClickCandidateKey = null;
    let lastPageSearchQuery = '';
    let touchArrange = false;

    function toggleTouchArrange(button) {
        cancelCarry();
        touchArrange = !touchArrange;
        document.getElementById('item-tab-equip').classList.toggle('touch-arrange', touchArrange);
        button.setAttribute('aria-pressed', String(touchArrange));
        button.setAttribute('aria-label', touchArrange ? '배치 완료' : '배치 모드');
        button.querySelector('span').textContent = touchArrange ? '완료' : '배치';
    }

    function getFocusedKey() {
        return focusedItemKey;
    }

    function setFocusedKey(itemKey) {
        focusedItemKey = itemKey || null;
        if (!focusedItemKey) {
            focusedEquipmentSlot = null;
            const inspector = document.getElementById('ui-equipment-inventory-inspector');
            if (inspector?.matches(':popover-open')) inspector.hidePopover();
        }
        return focusedItemKey;
    }

    function getFocusedEquipmentSlot() { return focusedEquipmentSlot; }

    // Top-layer placement uses viewport rectangles and the existing display-scale adapter.
    function positionInspector() {
        // Child dialogs own the top layer until closed, including late comparison updates.
        if (document.querySelector('dialog:modal')) return;
        const inspector = document.getElementById('ui-equipment-inventory-inspector');
        if (!focusedItemKey || !inspector) return;
        const selector = focusedEquipmentSlot
            ? `#ui-equip-list .equipment-slot[data-slot="${CSS.escape(focusedEquipmentSlot)}"]`
            : `[data-equipment-grid-key="${CSS.escape(focusedItemKey)}"]`;
        const anchor = document.querySelector(selector);
        if (!anchor?.getClientRects().length) { focus(null); return; }
        anchor.classList.toggle('is-menu-selected', !!focusedEquipmentSlot);
        if (placeDocked(inspector)) return;
        const rect = anchor.getBoundingClientRect();
        if (!inspector.matches(':popover-open')) inspector.showPopover();
        const bottom = fitInspector(inspector, rect);
        const position = getFloatingPosition(rect, inspector.getBoundingClientRect(), bottom);
        if (!position) { focus(null); return; }
        inspector.style.left = `${position.x / uiDisplay.factor}px`;
        inspector.style.top = `${position.y / uiDisplay.factor}px`;
    }

    /** 넓은 PC 창은 오른쪽 칸에 붙고(panel), 휴대폰은 아래에서 올라온다(sheet): css/equipment-window.css --eqw-dock.
     * @returns {boolean} true when the panel needs no anchoring next to the item */
    function placeDocked(inspector) {
        const dock = equipmentWindowUi.inspectorDock(inspector);
        if (dock === 'panel' && inspector.matches(':popover-open')) inspector.hidePopover();
        if (dock === 'sheet' && !inspector.matches(':popover-open')) inspector.showPopover();
        matchSheetOrder(inspector, dock === 'sheet');
        return dock === 'panel' || dock === 'sheet';
    }
    /** 단추 줄과 옵션의 차례는 그릴 때 정한다(js/equipment-window-ui.js orderedBody). 창 폭을 휴대폰 폭 너머로 바꾸면 다시 그리지 않으므로
     * 여기서 맞춘다: 카드(sheet)는 옵션 뒤에 단추 줄, 그 밖은 앞에. 이미 맞으면 아무것도 옮기지 않는다. */
    function matchSheetOrder(inspector, sheet) {
        const actions = inspector.querySelector(':scope > .equipment-grid-inspector-actions'), details = inspector.querySelector(':scope > .equipment-inspection-details');
        if (!actions || !details || (actions.compareDocumentPosition(details) === Node.DOCUMENT_POSITION_PRECEDING) === sheet) return;
        if (sheet) details.after(actions);
        else details.before(actions);
    }

    function fitInspector(inspector, rect) {
        const nav = document.getElementById('tab-header-bottom');
        const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
        const sideSpace = Math.max(rect.left - 16, innerWidth - rect.right - 16);
        let height = bottom - 16;
        if (inspector.getBoundingClientRect().width > sideSpace) height = Math.max(rect.top - 16, bottom - rect.bottom - 16);
        inspector.style.maxHeight = `${Math.max(160, height) / uiDisplay.factor}px`;
        return bottom;
    }

    /** 떠서 나오는 선택한 장비(두 칸 창, 2026-10-11): 가방을 가리지 않는 자리를 먼저 찾는다. 가방 장비를 골랐으면 가방 왼쪽(장착 칸 위),
     * 낀 장비를 골랐으면 장착 칸 왼쪽, 거기에 자리가 없으면 가방 오른쪽. 어디에도 없으면 예전처럼 고른 칸 옆. */
    function getBesidePosition(size, bottom) {
        const bag = document.querySelector('#item-tab-equip .equipment-inventory-panel');
        const side = focusedEquipmentSlot ? document.querySelector('#item-tab-equip .equipment-loadout-panel') : bag;
        if (!bag?.getClientRects().length || !side?.getClientRects().length) return null;
        const gap = 8, left = side.getBoundingClientRect().left - gap - size.width, right = bag.getBoundingClientRect().right + gap;
        const y = Math.max(gap, Math.min(bottom - size.height - gap, bag.getBoundingClientRect().top));
        if (left >= gap) return { x: left, y };
        return right + size.width <= innerWidth - gap ? { x: right, y } : null;
    }

    function getFloatingPosition(rect, size, bottom) {
        if (rect.bottom <= 0 || rect.top >= bottom) return null;
        return getBesidePosition(size, bottom) || getInspectorPosition(rect, size, bottom);
    }

    function getInspectorPosition(rect, size, bottom) {
        if (rect.bottom <= 0 || rect.top >= bottom) return null;
        const gap = 8, maxX = Math.max(gap, innerWidth - size.width - gap);
        const maxY = Math.max(gap, bottom - size.height - gap);
        let x = rect.right + gap, y = rect.top;
        if (x > maxX) {
            x = rect.left - size.width - gap;
            if (x < gap) {
                x = rect.left;
                y = rect.bottom + gap;
                if (y > maxY) y = rect.top - size.height - gap;
            }
        }
        return { x: Math.max(gap, Math.min(maxX, x)), y: Math.max(gap, Math.min(maxY, y)) };
    }

    function isCarryingKey(itemKey) {
        return !!carryState && carryState.itemKey === itemKey;
    }

    function isCarrying() {
        return !!carryState;
    }

    function getPageIndex(pageCount) {
        let count = Math.max(1, Math.floor(Number(pageCount) || 1));
        activePage = Math.max(0, Math.min(count - 1, activePage));
        return activePage;
    }

    function setPage(pageIndex) {
        let layout = equipmentInventoryGridRuntime.ensureState(game);
        let nextPage = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
        if (nextPage === activePage) return false;
        cancelCarry();
        activePage = nextPage;
        setFocusedKey(null);
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    /** Page badges count what the bag shows: the search word and also the 필터 panel's grades and kind (2026-10-19; before, only a
     * search word lit the pages, so a kind picked in a 12-page bag had to be found page by page). */
    function getPageSearchSummary(layout, rows, query) {
        let normalizedQuery = String(query || '').trim();
        let counts = Array.from({ length: layout.pageCount }, () => 0);
        rows = Array.isArray(rows) ? rows : [];
        if (!normalizedQuery && !rows.some(row => row && row.filterActive)) return { active: false, query: '', key: '', counts, totalMatches: 0, matchingPages: 0 };
        let settings = game.settings || {};
        let judged = typeof equipmentTriage === 'object' ? equipmentTriage.currentFilter() : 'all';
        let key = JSON.stringify([normalizedQuery, settings.equipmentSlotFilter || 'all', settings.inventoryViewRarities || {}, judged]);
        let matchedKeys = new Set(rows
            .filter(row => row && row.filterMatched)
            .map(row => equipmentInventoryGridRuntime.getItemKey(row.item)));
        layout.entries.forEach(entry => {
            if (!matchedKeys.has(entry.key)) return;
            let page = Math.floor(entry.row / layout.rowsPerPage);
            if (page >= 0 && page < counts.length) counts[page] += 1;
        });
        return {
            active: true,
            query: normalizedQuery,
            key,
            counts,
            totalMatches: counts.reduce((sum, count) => sum + count, 0),
            matchingPages: counts.filter(count => count > 0).length
        };
    }

    function selectFirstSearchPage(search) {
        if (!search.active || search.key === lastPageSearchQuery) return;
        lastPageSearchQuery = search.key;
        let firstMatchPage = search.counts.findIndex(count => count > 0);
        if (firstMatchPage < 0 || firstMatchPage === activePage) return;
        cancelCarry();
        activePage = firstMatchPage;
        setFocusedKey(null);
    }

    function renderPageControls(layout, rows, query) {
        let search = getPageSearchSummary(layout, rows, query);
        if (!search.active) lastPageSearchQuery = '';
        else selectFirstSearchPage(search);
        let page = getPageIndex(layout.pageCount);
        let root = document.getElementById('ui-equipment-inventory-pages');
        let label = document.getElementById('ui-inventory-page-label');
        let maxPages = typeof EQUIPMENT_INVENTORY_MAX_PAGES === 'number' ? EQUIPMENT_INVENTORY_MAX_PAGES : 12;
        let pageLabel = layout.unlockedPageCount >= maxPages
            ? `${layout.unlockedPageCount}페이지, 최대 확장`
            : `${layout.unlockedPageCount}페이지, 루프 진행으로 확장`;
        let found = search.query ? '검색 결과' : '필터에 맞는 장비';
        if (search.active) pageLabel = `${found} ${search.totalMatches}개, ${search.matchingPages}페이지`;
        if (label) {
            label.textContent = pageLabel;
            label.hidden = !search.active;
        }
        renderTemporaryStorage();
        if (!root) return page;
        root.innerHTML = Array.from({ length: layout.pageCount }, (_, index) => {
            let matchCount = search.counts[index];
            let searchClass = search.active ? (matchCount > 0 ? ' search-match' : ' search-miss') : '';
            let searchText = search.active ? `, ${found} ${matchCount}개` : '';
            let badge = matchCount > 0 ? `<small>${matchCount}</small>` : '';
            return `<button type="button" class="${index === page ? 'active' : ''}${searchClass}" onclick="equipmentInventoryInteraction.setPage(${index})" aria-pressed="${index === page ? 'true' : 'false'}" aria-label="${index + 1}페이지${searchText}" title="${index + 1}페이지${searchText}"><span>${index + 1}</span>${badge}</button>`;
        }).join('');
        keepPageInView(root, page);
        return page;
    }

    // 휴대폰에서는 쪽 단추가 옆으로 미는 한 줄이다(css/equipment-inventory-grid.css): 쪽이 바뀌면 그 단추를 가운데로 옮기고,
    // 같은 쪽을 다시 그릴 때는 사용자가 민 자리를 그대로 둔다. 창이 닫혀 폭이 0이면 다음에 보일 때 맞춘다. 첫 쪽은 처음부터 보이는 자리라
    // 0에서 시작한다(-1이면 가방을 열기 전 전투 중 다시 그릴 때마다 크기를 재느라 배치를 다시 계산했다). PC는 줄을 바꿔 다 보이니 재지 않는다.
    let pageInView = 0;
    function keepPageInView(root, page) {
        let button = root.children[page];
        if (page === pageInView || !button || !uiDisplay.matches('(max-width: 640px)') || !root.clientWidth) return;
        pageInView = page;
        let box = root.getBoundingClientRect(), at = button.getBoundingClientRect();
        if (root.scrollWidth > root.clientWidth) root.scrollLeft += at.left + at.width / 2 - (box.left + box.width / 2);
    }

    function renderTemporaryStorage() {
        let root = document.getElementById('ui-equipment-temporary-storage');
        if (!root) return;
        let items = equipmentInventoryGridRuntime.getTemporaryItems(game);
        root.hidden = items.length === 0;
        if (items.length === 0) {
            root.innerHTML = '';
            return;
        }
        let cards = items.map(item => {
            let key = equipmentInventoryGridRuntime.getItemKey(item);
            let footprint = getEquipmentInventoryFootprint(item);
            return `<button type="button" class="equipment-temporary-item rarity-${item.rarity || 'normal'}${itemInfluencesUi.influenceClasses(item)}" style="${itemInfluencesUi.influenceStyle(item)}" data-temporary-key="${escapeHTML(key)}" onclick="equipmentInventoryInteraction.restoreTemporaryItem(this.dataset.temporaryKey)"><img src="${getEquipmentGridVisualAsset(item)}" alt="" draggable="false"><span>${escapeHTML(item.name || item.baseName || '장비')}</span><small>${footprint.columns}×${footprint.rows}, 회수</small></button>`;
        }).join('');
        root.innerHTML = `<header><strong>임시 보관함</strong><span>${items.length}개</span></header><p>이전 배치에서 복구된 장비입니다. 빈칸을 확보한 뒤 눌러서 회수하세요. 루프가 끝나면 비워집니다.</p><div>${cards}</div>`;
    }

    function restoreTemporaryItem(itemKey) {
        cancelCarry();
        let result = equipmentInventoryGridRuntime.restoreTemporaryItem(itemKey, game);
        if (!result.ok) {
            notify(result.reason || '인벤토리에 회수할 공간이 없습니다.', 'warning');
            return false;
        }
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        notify(`${withObjectParticle(result.item.name || '장비')} 인벤토리로 회수했습니다.`, 'success');
        return true;
    }

    function focus(itemKey, equippedSlot = null) {
        const sameSelection = focusedItemKey === itemKey && focusedEquipmentSlot === equippedSlot;
        setFocusedKey(itemKey);
        focusedEquipmentSlot = focusedItemKey ? equippedSlot : null;
        if (!sameSelection) hideItemTooltip();
        document.querySelectorAll('[data-equipment-grid-key]').forEach(card => {
            let selected = card.dataset.equipmentGridKey === focusedItemKey;
            card.classList.toggle('selected', selected);
            card.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        document.querySelectorAll('#ui-equip-list .equipment-slot').forEach(card => {
            card.classList.toggle('is-menu-selected', card.dataset.slot === focusedEquipmentSlot);
        });
        if (typeof renderEquipmentInventoryInspector === 'function') {
            renderEquipmentInventoryInspector(game.inventory.map((item, idx) => ({ item, idx })));
        }
        if (typeof tutorialActionUi === 'object') tutorialActionUi.refresh();
    }

    function notify(message, tone) {
        if (typeof showGameToast === 'function') showGameToast(message, { tone: tone || 'info', duration: 1800 });
    }

    function clearEquipmentDropTarget() {
        document.querySelectorAll('#ui-equip-list .equipment-slot.is-equip-drop-valid,#ui-equip-list .equipment-slot.is-equip-drop-invalid').forEach(slot => {
            slot.classList.remove('is-equip-drop-valid', 'is-equip-drop-invalid');
        });
    }

    function getEquipmentSlotElement(event) {
        let direct = event && event.target && event.target.closest
            ? event.target.closest('#ui-equip-list .equipment-slot') : null;
        if (direct) return direct;
        if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
            || typeof document.elementFromPoint !== 'function') return null;
        let pointed = document.elementFromPoint(event.clientX, event.clientY);
        return pointed && pointed.closest ? pointed.closest('#ui-equip-list .equipment-slot') : null;
    }

    /** 들고 있는 장비 아래의 채팅 입력 줄(js/social.js): 거기에 놓으면 그 장비를 채팅에 붙인다(2026-10-22 사용자 "아이템을 직접 채팅창에
     * 끌어다가 놓아도 가능하게"). 위에 있는 동안 입력 줄이 빛난다. */
    function chatDropZoneAt(event) {
        if (!carryState || !Number.isFinite(event.clientX) || typeof document.elementsFromPoint !== 'function') return null;
        // 들고 있는 그림과 놓을 자리 표시 밑의 맨 위 요소만 본다: 창 뒤에 가려진 채팅 줄 위에서 놓으면 가방 안에서 옮기는 것이다
        let top = document.elementsFromPoint(event.clientX, event.clientY)
            .find(node => !(node.closest && node.closest('.equipment-grid-cursor-item,.equipment-grid-drop-preview')));
        return (top && top.closest && top.closest('.social-chat-inputbar')) || null;
    }
    function markChatDropZone(event) {
        let zone = chatDropZoneAt(event);
        document.querySelectorAll('.social-chat-inputbar.is-item-drop').forEach(node => { if (node !== zone) node.classList.remove('is-item-drop'); });
        if (zone) zone.classList.add('is-item-drop');
        return zone;
    }
    function dropOnChat(event) {
        if (!chatDropZoneAt(event) || typeof attachChatItemOf !== 'function') return false;
        suppressClickUntil = Date.now() + 350;
        event.preventDefault();
        attachChatItemOf(carryState.entry.item, carryState.sourceSlot);
        cancelCarry();
        return true;
    }

    function updateEquipmentDropTarget(event) {
        clearEquipmentDropTarget();
        if (!carryState || carryState.mode !== 'inventory') return null;
        let element = getEquipmentSlotElement(event);
        if (!element) return null;
        let slot = element.dataset.slot;
        let valid = canEquipItemToSlot(carryState.entry.item, slot);
        element.classList.add(valid ? 'is-equip-drop-valid' : 'is-equip-drop-invalid');
        return { element, slot, valid };
    }

    function getGridMetrics(grid) {
        let rect = grid.getBoundingClientRect();
        let style = getComputedStyle(grid);
        let firstCell = grid.querySelector('[data-grid-column="0"][data-grid-row="0"]');
        let rightCell = grid.querySelector('[data-grid-column="1"][data-grid-row="0"]');
        let downCell = grid.querySelector('[data-grid-column="0"][data-grid-row="1"]');
        let cellRect = firstCell && firstCell.getBoundingClientRect();
        let columnGap = (parseFloat(style.columnGap) || 0) * uiDisplay.factor;
        let rowGap = (parseFloat(style.rowGap) || 0) * uiDisplay.factor;
        let cellWidth = cellRect ? cellRect.width : parseFloat(style.gridAutoColumns) || 1;
        let cellHeight = cellRect ? cellRect.height : parseFloat(style.gridAutoRows) || cellWidth;
        let columnStep = rightCell ? rightCell.getBoundingClientRect().left - cellRect.left : cellWidth + columnGap;
        let rowStep = downCell ? downCell.getBoundingClientRect().top - cellRect.top : cellHeight + rowGap;
        return {
            rect,
            originX: cellRect ? cellRect.left - rect.left : parseFloat(style.paddingLeft) || 0,
            originY: cellRect ? cellRect.top - rect.top : parseFloat(style.paddingTop) || 0,
            cellWidth,
            cellHeight,
            columnGap,
            rowGap,
            columnStep,
            rowStep
        };
    }

    function createGhost(item, entry, metrics) {
        let ghost = document.createElement('div');
        ghost.className = `equipment-grid-cursor-item rarity-${item.rarity || 'normal'}`;
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = `${(metrics.cellWidth * entry.columns + metrics.columnGap * (entry.columns - 1)) / uiDisplay.factor}px`;
        ghost.style.height = `${(metrics.cellHeight * entry.rows + metrics.rowGap * (entry.rows - 1)) / uiDisplay.factor}px`;
        let image = document.createElement('img');
        image.src = getEquipmentGridVisualAsset(item);
        image.alt = '';
        let badge = document.createElement('span');
        badge.textContent = `${entry.columns}×${entry.rows}`;
        ghost.appendChild(image);
        ghost.appendChild(badge);
        document.body.appendChild(ghost);
        return ghost;
    }

    function getPointerPlacement(event, grid, offset, metrics) {
        let rect = grid.getBoundingClientRect();
        let localX = event.clientX - offset.x - rect.left - metrics.originX;
        let localY = event.clientY - offset.y - rect.top - metrics.originY;
        let column = Math.round(localX / metrics.columnStep);
        let row = Math.round(localY / metrics.rowStep);
        let rowCount = Math.max(0, Math.floor(Number(grid.dataset.equipmentGridRows) || 0));
        if (column < 0 || column >= equipmentInventoryGridRuntime.columns || row < 0 || row >= rowCount) return null;
        return { column, row };
    }

    function clearDropPreview(grid) {
        if (!grid) return;
        let selector = '.equipment-grid-cell.drop-valid,.equipment-grid-cell.drop-invalid';
        grid.querySelectorAll(selector).forEach(cell => {
            cell.classList.remove('drop-valid', 'drop-invalid');
        });
        grid.querySelectorAll('.equipment-grid-drop-preview').forEach(preview => { preview.hidden = true; });
    }

    function clearInteractionArtifacts() {
        document.querySelectorAll('.equipment-grid-cursor-item,.equipment-grid-drop-preview').forEach(element => element.remove());
        document.querySelectorAll('.social-chat-inputbar.is-item-drop').forEach(element => element.classList.remove('is-item-drop'));
        document.querySelectorAll('.equipment-grid-item.is-carried,.equipment-grid-item.is-dragging,.equipment-slot.is-carried').forEach(element => {
            element.classList.remove('is-carried', 'is-dragging');
        });
        document.querySelectorAll('.search-result-list.is-drag-active').forEach(grid => {
            grid.classList.remove('is-drag-active');
            clearDropPreview(grid);
        });
        clearEquipmentDropTarget();
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        if (typeof hideItemTooltip === 'function') hideItemTooltip();
    }

    function paintFootprint(grid, placement, footprint, className) {
        for (let row = placement.row; row < placement.row + footprint.rows; row++) {
            for (let column = placement.column; column < placement.column + footprint.columns; column++) {
                let target = grid.querySelector(`[data-grid-column="${column}"][data-grid-row="${row}"]`);
                if (target) target.classList.add(className);
            }
        }
    }

    function paintDropPreview(grid, placement, moveResult) {
        clearDropPreview(grid);
        if (!placement || !moveResult.entry) return;
        let targetClass = moveResult.ok ? 'drop-valid' : 'drop-invalid';
        paintFootprint(grid, moveResult.placement || placement, moveResult.entry, targetClass);
        let targetPlacement = moveResult.placement || placement;
        let preview = carryState && carryState.preview;
        if (preview) {
            preview.className = `equipment-grid-drop-preview ${targetClass}`;
            preview.style.left = `${(carryState.metrics.originX + targetPlacement.column * carryState.metrics.columnStep) / uiDisplay.factor}px`;
            preview.style.top = `${(carryState.metrics.originY + targetPlacement.row * carryState.metrics.rowStep) / uiDisplay.factor}px`;
            preview.style.width = `${(carryState.metrics.cellWidth * moveResult.entry.columns + carryState.metrics.columnGap * (moveResult.entry.columns - 1)) / uiDisplay.factor}px`;
            preview.style.height = `${(carryState.metrics.cellHeight * moveResult.entry.rows + carryState.metrics.rowGap * (moveResult.entry.rows - 1)) / uiDisplay.factor}px`;
            preview.hidden = false;
        }
    }

    function setGhostTone(moveResult) {
        if (!carryState) return;
        carryState.ghost.classList.remove('can-drop', 'cannot-drop');
        if (!moveResult || !moveResult.ok) carryState.ghost.classList.add('cannot-drop');
        else carryState.ghost.classList.add('can-drop');
    }

    function localizeMoveResult(result) {
        if (!result || !result.entry) return result;
        let rowStart = activePage * equipmentInventoryGridRuntime.rowsPerPage;
        let localized = { ...result };
        if (result.placement) localized.placement = { ...result.placement, row: result.placement.row - rowStart };
        return localized;
    }

    function updateCarry(event) {
        if (!carryState) return;
        carryState.pointer = { clientX: event.clientX, clientY: event.clientY };
        carryState.ghost.style.transform = `translate3d(${Math.round((event.clientX - carryState.offset.x) / uiDisplay.factor)}px,${Math.round((event.clientY - carryState.offset.y) / uiDisplay.factor)}px,0)`;
        let localPlacement = getPointerPlacement(event, carryState.grid, carryState.offset, carryState.metrics);
        let placement = localPlacement ? { column: localPlacement.column, row: localPlacement.row + activePage * equipmentInventoryGridRuntime.rowsPerPage } : null;
        let result = { ok: false, entry: carryState.entry };
        if (placement && carryState.mode === 'equipped') {
            result = equipmentInventoryGridRuntime.canAddInLayout(carryState.entry.item, placement.column, placement.row, carryState.layout);
        } else if (placement) {
            result = equipmentInventoryGridRuntime.canPlaceInventoryItemInLayout(carryState.itemKey, placement.column, placement.row, carryState.layout);
        }
        let previewKey = placement ? `${placement.column}:${placement.row}:${result.ok}` : 'outside';
        carryState.placement = placement;
        carryState.moveResult = result;
        setGhostTone(result);
        let equipmentTarget = updateEquipmentDropTarget(event);
        if (equipmentTarget) setGhostTone({ ok: equipmentTarget.valid });
        if (markChatDropZone(event)) setGhostTone({ ok: true });
        if (carryState.previewKey !== previewKey) paintDropPreview(carryState.grid, localPlacement, localizeMoveResult(result));
        carryState.previewKey = previewKey;
    }

    function scheduleCarryUpdate(event) {
        pendingPointer = { clientX: event.clientX, clientY: event.clientY };
        if (carryFrame) return;
        carryFrame = requestAnimationFrame(() => {
            carryFrame = 0;
            let pointer = pendingPointer;
            pendingPointer = null;
            updateCarry(pointer);
        });
    }

    function initializeCarry(event, itemElement, grid, entry, layout, options) {
        if (carryState || !itemElement || !grid || !entry) return false;
        let metrics = getGridMetrics(grid);
        let rect = itemElement.getBoundingClientRect();
        let clientX = Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2;
        let clientY = Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;
        let offset = {
            x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
            y: Math.max(0, Math.min(rect.height, clientY - rect.top))
        };
        let preview = document.createElement('div');
        preview.className = 'equipment-grid-drop-preview';
        preview.hidden = true;
        grid.appendChild(preview);
        carryState = {
            mode: options.mode,
            sourceSlot: options.sourceSlot || null,
            itemKey: entry.key,
            entry,
            layout,
            grid,
            source: itemElement,
            offset,
            metrics,
            preview,
            ghost: createGhost(entry.item, entry, metrics)
        };
        itemElement.classList.add('is-carried');
        grid.classList.add('is-drag-active');
        setFocusedKey(null);
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        updateCarry({ clientX, clientY });
        return true;
    }

    function beginCarry(event, itemElement) {
        if (carryState || !itemElement) return false;
        let grid = itemElement.closest('.search-result-list');
        let layout = equipmentInventoryGridRuntime.ensureState(game);
        let itemKey = itemElement.dataset.equipmentGridKey;
        let entry = layout.entries.find(candidate => candidate.key === itemKey);
        doubleClickCandidateKey = itemKey;
        let started = initializeCarry(event, itemElement, grid, entry, layout, { mode: 'inventory' });
        if (!started) doubleClickCandidateKey = null;
        return started;
    }

    function beginEquippedCarry(event, itemElement, slot) {
        if (carryState || !itemElement) return false;
        let item = game.equipment && game.equipment[slot];
        let grid = document.querySelector('#ui-inventory-list > .search-result-list');
        if (!item || !grid) return false;
        let footprint = getEquipmentInventoryFootprint(item);
        let itemKey = equipmentLoadoutRuntime.ensureItemIdentity(item);
        let entry = { key: itemKey, item, columns: footprint.columns, rows: footprint.rows };
        return initializeCarry(event, itemElement, grid, entry, equipmentInventoryGridRuntime.ensureState(game), {
            mode: 'equipped', sourceSlot: slot
        });
    }

    function endCarry() {
        if (!carryState) return;
        if (carryFrame) cancelAnimationFrame(carryFrame);
        carryFrame = 0;
        pendingPointer = null;
        carryState.source.classList.remove('is-carried');
        carryState.grid.classList.remove('is-drag-active');
        clearInteractionArtifacts();
        carryState = null;
        pointerState = null;
    }

    function cancelCarry() {
        doubleClickCandidateKey = null;
        endCarry();
    }

    function commitInventoryCarry(column, row) {
        let original = carryState.layout.entries.find(entry => entry.key === carryState.itemKey);
        if (!original || original.column !== column || original.row !== row) {
            doubleClickCandidateKey = null;
        }
        let result = equipmentInventoryGridRuntime.placeInventoryItem(carryState.itemKey, column, row, game);
        if (!result.ok) {
            notify(result.reason, 'warning');
            return false;
        }
        let itemKey = carryState.itemKey;
        suppressClickUntil = Date.now() + 250;
        endCarry();
        focusedItemKey = itemKey;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    function equipCarriedItemToSlot(slot) {
        if (!carryState || carryState.mode !== 'inventory') return false;
        let item = carryState.entry.item;
        if (!canEquipItemToSlot(item, slot)) {
            notify('이 장비는 해당 슬롯에 장착할 수 없습니다.', 'warning');
            return false;
        }
        doubleClickCandidateKey = null;
        let itemId = item.id;
        endCarry();
        let equipped = equipItemById(itemId, slot);
        if (!equipped) return false;
        suppressClickUntil = Date.now() + 250;
        focusedItemKey = null;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return true;
    }

    function commitCarry(column, row) {
        if (!carryState) return false;
        if (carryState.mode === 'inventory') return commitInventoryCarry(column, row);
        let slot = carryState.sourceSlot;
        suppressClickUntil = Date.now() + 250;
        endCarry();
        let moved = unequipItemToGrid(slot, column, row);
        if (!moved) notify('그 위치에는 장비를 놓을 수 없습니다.', 'warning');
        else if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return moved;
    }

    function moveFocusedTo(event, column, row) {
        if (event) event.stopPropagation();
        if (!carryState) return false;
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            updateCarry(event);
            if (!carryState.moveResult || !carryState.moveResult.ok || !carryState.placement) return false;
            return commitCarry(carryState.placement.column, carryState.placement.row);
        }
        let globalRow = row + activePage * equipmentInventoryGridRuntime.rowsPerPage;
        return commitCarry(column, globalRow);
    }

    function handleItemClick(event, itemKey) {
        if (event) event.stopPropagation();
        if (Date.now() < suppressClickUntil || carryState) return;
        doubleClickCandidateKey = itemKey;
        focus(itemKey);
    }

    function handleItemDoubleClick(event, itemKey, itemId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        let original = carryState && carryState.layout.entries.find(entry => entry.key === itemKey);
        let stationaryCarry = !!carryState && carryState.mode === 'inventory' && carryState.itemKey === itemKey
            && !!original && !!carryState.placement
            && original.column === carryState.placement.column && original.row === carryState.placement.row;
        if (doubleClickCandidateKey !== itemKey && !stationaryCarry) return false;
        if (carryState && carryState.itemKey !== itemKey) return false;
        doubleClickCandidateKey = null;
        endCarry();
        let equipped = equipItemById(itemId);
        if (!equipped) return false;
        suppressClickUntil = Date.now() + 250;
        focusedItemKey = null;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        return true;
    }

    function handleEquippedItemClick(event, slot) {
        if (event) event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        if (carryState) {
            if (carryState.mode === 'inventory') return equipCarriedItemToSlot(slot);
            return false;
        }
        const item = game.equipment[slot];
        if (!item || event?.target.closest('button')) return false;
        focus(equipmentLoadoutRuntime.ensureItemIdentity(item), slot);
        return true;
    }

    function autoArrange() {
        cancelCarry();
        let order = equipmentInventoryGridRuntime.autoArrange(game);
        if (!order) {
            notify('가방이 거의 차서 빈칸 없이 다시 놓을 수 없습니다. 그대로 두었습니다.', 'warning');
            return;
        }
        activePage = 0;
        if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
        if (typeof updateStaticUI === 'function') updateStaticUI();
        notify(order === 'recent' ? '최근 장비부터 빈칸 없이 배치했습니다.' : '최근 장비부터는 다 들어가지 않아 큰 장비부터 빈칸 없이 배치했습니다.', 'success');
    }

    /** equipmentInventoryGridRuntime packed the bag again so an item with no free cell fits instead of going to the temporary storage. */
    function notifyBagRepacked() {
        cancelCarry();
        notify('빈칸이 흩어져 새 장비가 들어가도록 가방 빈칸 정리를 했습니다.', 'info');
    }

    function startPointer(event) {
        if (event.pointerType === 'touch' && !touchArrange) return;
        if (!event.target.closest) return;
        let item = event.target.closest('.equipment-grid-item');
        let equipped = event.target.closest('#ui-equip-list .equipment-slot:not(.equipment-slot-empty)');
        if (!item && event.target.closest('button')) return;
        let source = item || equipped;
        if (!source || (event.button !== undefined && event.button !== 0)) return;
        pointerState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
            dragging: false, source, equipped: !item, origin: event };
        if (source.setPointerCapture) source.setPointerCapture(event.pointerId);
    }

    function updatePointer(event) {
        if (carryState) scheduleCarryUpdate(event);
        if (!pointerState || pointerState.pointerId !== event.pointerId) return;
        let distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
        if (!pointerState.dragging && distance < 6) return;
        if (!pointerState.dragging) {
            let { source, equipped, origin } = pointerState;
            if (equipped) beginEquippedCarry(origin, source, source.dataset.slot);
            else beginCarry(origin, source);
            if (!carryState) return;
        }
        pointerState.dragging = true;
        scheduleCarryUpdate(event);
        event.preventDefault();
    }

    /** 장착 칸 위에서 놓았다: 맞는 칸이면 끼우고, 아니면 알린다. 놓은 곳이 장착 칸이 아니면 false. */
    function dropOnEquipmentSlot(event) {
        let equipmentTarget = updateEquipmentDropTarget(event);
        if (!equipmentTarget) return false;
        suppressClickUntil = Date.now() + 350;
        event.preventDefault();
        if (equipmentTarget.valid) equipCarriedItemToSlot(equipmentTarget.slot);
        else notify('이 장비는 해당 슬롯에 장착할 수 없습니다.', 'warning');
        cancelCarry();
        return true;
    }

    function finishPointer(event) {
        if (!pointerState || pointerState.pointerId !== event.pointerId) return;
        let wasDragging = pointerState.dragging;
        pointerState = null;
        if (!wasDragging) return;
        doubleClickCandidateKey = null;
        if (carryFrame) cancelAnimationFrame(carryFrame);
        carryFrame = 0;
        pendingPointer = null;
        if (dropOnChat(event) || dropOnEquipmentSlot(event)) return;
        if (carryState) updateCarry(event);
        suppressClickUntil = Date.now() + 350;
        event.preventDefault();
        if (carryState && carryState.moveResult && carryState.moveResult.ok && carryState.placement) {
            commitCarry(carryState.placement.column, carryState.placement.row);
        } else {
            notify('그 위치에는 장비를 놓을 수 없습니다.', 'warning');
        }
        cancelCarry();
    }

    function cancelPointer(event) {
        if (!pointerState || pointerState.pointerId !== event.pointerId) return;
        pointerState = null;
        cancelCarry();
    }

    function handleKeydown(event) {
        if (event.key !== 'Escape') return;
        if (document.querySelector('dialog:modal')) return;
        if (!carryState && (!focusedItemKey || !document.getElementById('ui-equipment-inventory-inspector')?.getClientRects().length)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (carryState) {
            cancelCarry();
            notify('장비 이동을 취소했습니다.', 'info');
            return;
        }
        focus(null);
    }

    function hoverEquipment(event) {
        if (event.pointerType !== 'mouse' || focusedItemKey || carryState || pointerState) return;
        const card = event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot');
        if (!card) return;
        if (card.dataset.slot) {
            showItemTooltip(event, card.dataset.slot, true);
            return;
        }
        const index = game.inventory.findIndex(item => equipmentInventoryGridRuntime.getItemKey(item) === card.dataset.equipmentGridKey);
        if (index >= 0) showItemTooltip(event, index, false);
    }

    function leaveEquipment(event) {
        if (focusedItemKey) return;
        const card = event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot');
        if (card && !card.contains(event.relatedTarget)) dismissItemTooltipNow();
    }

    function bindPointerEvents() {
        document.addEventListener('pointerover', hoverEquipment);
        document.addEventListener('pointermove', hoverEquipment, { passive: true });
        document.addEventListener('pointerout', leaveEquipment);
        document.addEventListener('pointerdown', startPointer);
        document.addEventListener('pointermove', updatePointer, { passive: false });
        document.addEventListener('pointerup', finishPointer);
        document.addEventListener('pointercancel', cancelPointer);
        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('pointerdown', event => {
            if (document.querySelector('dialog:modal')) return;
            if (event.target.closest?.('.equipment-grid-item,#ui-equip-list .equipment-slot')) dismissItemTooltipNow();
            if (focusedItemKey && !event.target.closest('#ui-equipment-inventory-inspector,.equipment-grid-item,#ui-equip-list .equipment-slot')) focus(null);
        }, true);
        document.addEventListener('scroll', event => {
            if (focusedItemKey && !event.target.closest?.('#ui-equipment-inventory-inspector')) positionInspector();
        }, true);
        window.addEventListener('resize', positionInspector);
        document.addEventListener('dragstart', event => {
            if (event.target.closest && event.target.closest('.equipment-slot,.equipment-grid-item')) event.preventDefault();
        });
    }

    const equipmentInventoryInteraction = Object.freeze({
        getFocusedKey,
        getFocusedEquipmentSlot,
        positionInspector,
        setFocusedKey,
        isCarrying,
        isCarryingKey,
        getPageIndex,
        setPage,
        renderPageControls,
        renderTemporaryStorage,
        restoreTemporaryItem,
        focus,
        moveFocusedTo,
        handleItemClick,
        handleItemDoubleClick,
        handleEquippedItemClick,
        cancelCarry,
        autoArrange,
        toggleTouchArrange
    });

    safeExposeGlobals({ equipmentInventoryInteraction });
    window.addEventListener('project-idle:bag-repacked', notifyBagRepacked);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindPointerEvents, { once: true });
    else bindPointerEvents();
}());
