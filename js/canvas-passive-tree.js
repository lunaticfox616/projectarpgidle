// Phase-2 extracted passive tree canvas draw block.
function drawPassiveTree() {
    cleanupPassiveBursts();
    ensurePassiveRenderCache();

    const canvas = document.getElementById('tree-canvas');
    if (!canvas || canvas.offsetParent === null) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.max(1, passiveCanvasMetrics.dpr || window.devicePixelRatio || 1);
    const displayWidth = passiveCanvasMetrics.width || Math.max(1, canvas.clientWidth || 1);
    const displayHeight = passiveCanvasMetrics.height || Math.max(1, canvas.clientHeight || 1);
    const lightweightMode = !!isDragging;

    // transform 누적 방지: 매 렌더 시작 시 setTransform으로 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const viewport = getPassiveWorldViewport(displayWidth, displayHeight);
    const visibleNodes = passiveRenderCache.nodes.filter(node => isNodeInViewport(node, viewport, 120));
    const visibleGlowNodes = passiveRenderCache.glowNodes.filter(node => isNodeInViewport(node, viewport, 180));
    const visibleEdges = passiveRenderCache.activeEdges.filter(edge => isEdgeInViewport(edge, viewport, 120));

    // 화면 배경
    const screenBg = ctx.createLinearGradient(0, 0, 0, displayHeight);
    screenBg.addColorStop(0, '#090c12');
    screenBg.addColorStop(0.45, '#06080d');
    screenBg.addColorStop(1, '#030407');
    ctx.fillStyle = screenBg;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.save();
    // setTransform 이후 카메라 zoom/translate 적용
    ctx.translate(displayWidth / 2 + camX, displayHeight / 2 + camY);
    ctx.scale(camZoom, camZoom);

    // 월드 배경 성운/별
    if (!lightweightMode) drawPassiveStarfield(ctx, PASSIVE_BOUNDS);

    // 중심 오라
    const rootGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 520);
    rootGlow.addColorStop(0, 'rgba(182,148,83,0.12)');
    rootGlow.addColorStop(0.35, 'rgba(67,89,126,0.08)');
    rootGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rootGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 560, 0, Math.PI * 2);
    ctx.fill();

    if (!lightweightMode) drawPassiveEvolutionAura(ctx);

    // 탐험 밝혀짐 후광
    visibleGlowNodes.forEach(node => {
        if (!isPassiveNodeAvailable(node)) return;
        const visibility = getPassiveVisibility(node.id);
        if (visibility === 'hidden') return;

        const discovered = discoveredPassiveNodes.has(node.id) || (game.passives || []).includes(node.id);
        const preview = visibility === 'preview';
        const radius = getPassiveNodeVisualRadius(node);

        if (!discovered && !preview) return;

        const haloR = discovered ? (radius * 7.5) : (radius * 4.6);
        if (lightweightMode) return;
        const g = ctx.createRadialGradient(node.x, node.y, radius * 0.4, node.x, node.y, haloR);
        if (discovered) {
            g.addColorStop(0, 'rgba(227,194,124,0.16)');
            g.addColorStop(0.18, 'rgba(114,151,204,0.12)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            g.addColorStop(0, 'rgba(105,133,160,0.08)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
        }

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
        ctx.fill();
    });

    // 리빌 펄스
    if (!lightweightMode) passiveRevealBursts.forEach(burst => {
        const progress = clampNumber((performance.now() - burst.startTime) / burst.duration, 0, 1);
        const radius = burst.radius * progress;
        const alpha = 1 - progress;

        ctx.beginPath();
        ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245,223,173,${alpha * 0.42})`;
        ctx.lineWidth = 8;
        ctx.shadowColor = `rgba(245,223,173,${alpha * 0.28})`;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    let hoveredLinkedIds = new Set();
    if (hoverNode && hoverNode.id) {
        hoveredLinkedIds.add(hoverNode.id);
        visibleEdges.forEach(edge => {
            if (edge.from === hoverNode.id) hoveredLinkedIds.add(edge.to);
            else if (edge.to === hoverNode.id) hoveredLinkedIds.add(edge.from);
        });
    }

    // 링크
    visibleEdges.forEach(edge => {
        const a = edge.a;
        const b = edge.b;
        if (!isPassiveNodeAvailable(a) || !isPassiveNodeAvailable(b)) return;

        const visibleA = getPassiveVisibility(a.id);
        const visibleB = getPassiveVisibility(b.id);
        if (visibleA === 'hidden' || visibleB === 'hidden') return;
        const alpha = Math.min(getNodeRevealAmount(a), getNodeRevealAmount(b));
        const activeA = (game.passives || []).includes(a.id);
        const activeB = (game.passives || []).includes(b.id);
        const activeLink = activeA && activeB;
        const reachableLink = reachableNodes.has(a.id) || reachableNodes.has(b.id);
        const previewLink = visibleA === 'preview' || visibleB === 'preview';
        const hoveredLink = hoverNode && (a.id === hoverNode.id || b.id === hoverNode.id);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (hoveredLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(141,188,230,0.95)',
                innerStroke: 'rgba(222,244,255,0.9)',
                width: 4.8,
                shadow: lightweightMode ? 'transparent' : 'rgba(151,206,255,0.38)',
                blur: lightweightMode ? 0 : 15
            });
        } else if (activeLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(130,95,44,0.95)',
                innerStroke: 'rgba(244,223,171,0.88)',
                width: 5,
                shadow: lightweightMode ? 'transparent' : 'rgba(244,223,171,0.22)',
                blur: lightweightMode ? 0 : 12
            });
        } else if (reachableLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(79,109,130,0.72)',
                innerStroke: 'rgba(145,186,214,0.28)',
                width: 2.4,
                shadow: lightweightMode ? 'transparent' : 'rgba(118,165,194,0.12)',
                blur: lightweightMode ? 0 : 7
            });
        } else if (previewLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(67,85,98,0.24)',
                innerStroke: 'rgba(108,130,145,0.10)',
                width: 1.5
            });
        } else {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(43,53,63,0.55)',
                innerStroke: 'rgba(92,107,120,0.10)',
                width: 1.6
            });
        }

        ctx.restore();
    });

    // 노드
    visibleNodes.forEach(node => {
        const visibility = getPassiveVisibility(node.id);
        if (visibility === 'hidden') return;
        const revealAlpha = getNodeRevealAmount(node);
        const active = (game.passives || []).includes(node.id);
        const reachable = reachableNodes.has(node.id);
        const radius = getPassiveNodeVisualRadius(node) + ((hoverNode && hoverNode.id === node.id) ? 1.5 : 0);
        const palette = getPassiveNodePalette(node, active, reachable, visibility);

        drawPassiveNodeShape(ctx, node, radius, palette, active, reachable, visibility, revealAlpha, lightweightMode);

        if (!active && reachable) {
            ctx.save();
            ctx.globalAlpha = revealAlpha;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(155,220,255,0.56)';
            ctx.lineWidth = 1.25;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (hoverNode && hoveredLinkedIds.has(node.id) && hoverNode.id !== node.id) {
            ctx.save();
            ctx.globalAlpha = Math.max(0.35, revealAlpha * 0.9);
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 7.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(151,205,255,0.78)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.restore();
        }
    });

    // 미개척 안개는 과도한 블랙아웃을 피하기 위해 최소 수준으로만 적용
    const fogX = PASSIVE_BOUNDS.minX - 1000;
    const fogY = PASSIVE_BOUNDS.minY - 1000;
    const fogW = PASSIVE_BOUNDS.maxX - PASSIVE_BOUNDS.minX + 2000;
    const fogH = PASSIVE_BOUNDS.maxY - PASSIVE_BOUNDS.minY + 2000;
    ctx.save();
    ctx.fillStyle = PASSIVE_STYLE.fog;
    ctx.fillRect(fogX, fogY, fogW, fogH);
    ctx.restore();

    ctx.restore();


}

function handleEquipmentSlotDoubleClick(slot, forCrafting) {
    if (forCrafting) {
        selectForCrafting(slot, true);
        return;
    }
    unequipItem(slot);
}

function handleInventoryCardDoubleClick(itemId, mode) {
    if (mode !== 'equip') return;
    equipItemById(itemId);
}

function renderPaperdoll(targetId, forCrafting) {
    let html = '';
    ['무기', '투구', '목걸이', '장갑2', '갑옷', '장갑1', '반지1', '허리띠', '반지2', '신발'].forEach(slot => {
        let item = game.equipment[slot];
        let displaySlot = slot.replace(/[12]/, '');
        let selected = isCraftSelectionEquip() && getCraftSelectionRef() === slot;
        if (item) {
            let statsHtml = (item.baseStats || []).concat(item.stats || []).slice(0, 2).map(stat => `${stat.statName} +${formatValue(stat.id, stat.val)}`).join('<br>');
            let click = forCrafting ? `selectForCrafting('${slot}', true)` : '';
            let doubleClick = `event.stopPropagation(); handleEquipmentSlotDoubleClick('${slot}', ${forCrafting ? 'true' : 'false'})`;
            let footer = forCrafting ? `<button style="font-size:0.7em; padding:2px;" onclick="event.stopPropagation(); selectForCrafting('${slot}', true)">선택</button>` : `<button style="font-size:0.7em; padding:2px;" onclick="event.stopPropagation(); unequipItem('${slot}')">해제</button>`;
            html += `<div class="slot-box slot-${slot} ${selected ? 'selected' : ''}" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"><div class="item-title ${item.rarity}" style="font-size:0.9em; margin-bottom:2px;">[${displaySlot}] ${item.name}</div><div class="item-stats" style="font-size:0.74em; margin-bottom:4px;">${statsHtml}</div>${footer}</div>`;
        } else {
            html += `<div class="slot-box slot-${slot}" style="color:#3d3d5c; text-align:center; font-size:0.8em;">[${displaySlot}]<br>비어있음</div>`;
        }
    });
    document.getElementById(targetId).innerHTML = html;
}

function renderInventoryCard(item, idx, mode) {
    let selected = !isCraftSelectionEquip() && getCraftSelectionRef() === item.id;
    let lockIcon = item.locked ? ' 🔒' : '';
    let lockBtnLabel = item.locked ? '잠금해제' : '잠금';
    let lines = [];
    (item.baseStats || []).forEach(stat => lines.push(`<span style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</span>`));
    (item.stats || []).slice(0, 3).forEach(stat => lines.push(`<span>${stat.statName} +${formatValue(stat.id, stat.val)}</span>`));
    if ((item.stats || []).length === 0) lines.push(`<span style="color:#7f8c8d">추가 옵션 없음</span>`);
    let actions = '';
    if (mode === 'equip') actions = `<div class="item-actions"><button style="flex:1" onclick="event.stopPropagation(); equipItemById(${item.id})">${isDualSlotItem(item.slot) ? '장착(선택)' : '장착'}</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button><button style="background:#7f8c8d; border-color:#555;" onclick="event.stopPropagation(); salvageItemById(${item.id})">해체</button>${item.rarity === 'unique' ? `<button style="background:#6b4d2f; border-color:#9a6f43;" onclick="event.stopPropagation(); storeUniqueToCodexByItemId(${item.id})">도감</button>` : ''}</div>`;
    else if (mode === 'fossil') actions = `<div class="item-actions"><button style="flex:1; background:#35506a;" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">화석 대상</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button></div>`;
    else actions = `<div class="item-actions"><button style="flex:1" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">선택</button><button style="background:#35506a;" onclick="event.stopPropagation(); equipItemById(${item.id})">${isDualSlotItem(item.slot) ? '장착(선택)' : '장착'}</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button><button style="background:#7f8c8d; border-color:#555;" onclick="event.stopPropagation(); salvageItemById(${item.id})">해체</button></div>`;
    let doubleClick = mode === 'equip' ? ` ondblclick="event.stopPropagation(); handleInventoryCardDoubleClick(${item.id}, 'equip')"` : '';
    return `<div class="item-card ${selected ? 'selected' : ''}" onclick="selectForCrafting(${item.id}, false)"${doubleClick} onmouseenter="showItemTooltip(event, ${idx}, false)" onmouseleave="hideItemTooltip()"><div><div class="item-title ${item.rarity}">[${item.slot}] ${item.name}${lockIcon}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}</div><div class="item-base-line">${item.baseName}</div><div class="item-stats">${lines.join('<br>')}</div></div>${actions}</div>`;
}

function triggerMapUnlockReveal(zoneId) {
    if (!Number.isFinite(zoneId) || zoneId < 0) return;
    pendingMapRevealZoneId = zoneId;
    pendingMapRevealToken += 1;
    let token = pendingMapRevealToken;
    setTimeout(() => {
        if (pendingMapRevealToken !== token) return;
        pendingMapRevealZoneId = null;
        updateStaticUI();
    }, 1200);
}


Object.assign(window, { drawPassiveTree });
