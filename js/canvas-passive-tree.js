// Phase-2 extracted passive tree canvas draw block.

let passiveEffectLabelRects = [];

function isCraftSelectionEquipAvailableLocal() {
    return typeof isCraftSelectionEquip === 'function' && isCraftSelectionEquip();
}

function getCraftSelectionRefLocal() {
    return typeof getCraftSelectionRef === 'function' ? getCraftSelectionRef() : null;
}

function ensurePassiveTreeOverlay() {
    let overlay = document.getElementById('passive-tree-overlay');
    const container = document.getElementById('tree-container');
    if (!overlay && container) {
        overlay = document.createElement('div');
        overlay.id = 'passive-tree-overlay';
        overlay.className = 'passive-tree-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="passive-tree-overlay-world"></div>';
        container.appendChild(overlay);
    }
    if (!overlay) return null;
    let world = overlay.querySelector('.passive-tree-overlay-world');
    if (!world) {
        world = document.createElement('div');
        world.className = 'passive-tree-overlay-world';
        overlay.appendChild(world);
    }
    return { overlay, world };
}

function updatePassiveTreeOverlayTransform(displayWidth, displayHeight) {
    const parts = ensurePassiveTreeOverlay();
    if (!parts) return null;
    parts.world.style.transform = `translate3d(${displayWidth / 2 + camX}px, ${displayHeight / 2 + camY}px, 0) scale(${camZoom})`;
    return parts;
}

function syncPassiveTreeOverlay(displayWidth, displayHeight, visibleNodes, hoveredLinkedIds, hoveredPathNodeIds, ultraZoomedOutMode) {
    const parts = updatePassiveTreeOverlayTransform(displayWidth, displayHeight);
    if (!parts) return;
    const world = parts.world;
    const wanted = new Set();
    if (!ultraZoomedOutMode) {
        visibleNodes.forEach(node => {
            const visibility = getPassiveVisibility(node.id);
            if (visibility === 'hidden') return;
            const hoverCurrent = !!(hoverNode && hoverNode.id === node.id);
            const hoverLinked = !!(hoverNode && hoverNode.id !== node.id && (hoveredLinkedIds.has(node.id) || hoveredPathNodeIds.has(node.id)));
            if (hoverCurrent || hoverLinked) {
                const key = `node:${node.id}`;
                wanted.add(key);
                let el = world.querySelector(`[data-passive-overlay-key="${key}"]`);
                if (!el) {
                    el = document.createElement('div');
                    el.className = 'passive-overlay-node';
                    el.dataset.passiveOverlayKey = key;
                    world.appendChild(el);
                }
                const radius = getPassiveNodeVisualRadius(node) + (hoverCurrent ? 9 : (hoverLinked ? 7.5 : 5.5));
                const size = Math.max(1, radius * 2);
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
                el.style.width = `${size}px`;
                el.style.height = `${size}px`;
                el.style.setProperty('--passive-ring-alpha', String(Math.max(0.35, getNodeRevealAmount(node))));
                el.classList.toggle('hover-current', hoverCurrent);
                el.classList.toggle('hover-linked', hoverLinked);
            }
        });
    }
    Array.from(world.querySelectorAll('.passive-overlay-node')).forEach(el => {
        if (!wanted.has(el.dataset.passiveOverlayKey)) el.remove();
    });
}

function spawnPassiveRevealBurstOverlay(burst) {
    if (!burst) return;
    const canvas = document.getElementById('tree-canvas');
    const displayWidth = passiveCanvasMetrics.width || (canvas ? canvas.clientWidth : 0);
    const displayHeight = passiveCanvasMetrics.height || (canvas ? canvas.clientHeight : 0);
    const parts = updatePassiveTreeOverlayTransform(displayWidth, displayHeight);
    if (!parts) return;
    const el = document.createElement('div');
    el.className = 'passive-reveal-burst';
    const radius = Math.max(1, burst.radius || 1);
    el.style.left = `${burst.x || 0}px`;
    el.style.top = `${burst.y || 0}px`;
    el.style.width = `${radius * 2}px`;
    el.style.height = `${radius * 2}px`;
    el.style.animationDuration = `${Math.max(100, burst.duration || 900)}ms`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    parts.world.appendChild(el);
}



function drawPassiveSearchHighlight(ctx, node, radius, accent) {
    ctx.save();
    const ringColor = accent && accent.activeOuter ? accent.activeOuter : '#ffffff';
    const textColor = accent && accent.text ? accent.text : '#ffffff';
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(1.4, 2.2 / Math.max(0.35, camZoom));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 타이틀이 지정된 노드는 깔끔한 고유명을, 그 외에는 stat 이름을 쓴다.
    // stat 이름의 '(%)'·'(초)'·끝의 '증가' 접미사는 타이틀 노드와 통일성을 위해 표시에서만 정리한다.
    const label = String(getPassiveNodeDisplayName(node) || '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/\s*증가$/, '')
        .trim();
    if (label && camZoom >= 0.18) {
        const fontSize = Math.max(10, Math.min(22, 12 / Math.max(0.32, camZoom)));
        ctx.font = `700 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const y = node.y - radius - 14;
        const padX = 6 / Math.max(0.42, camZoom);
        const h = fontSize + 5;
        const w = ctx.measureText(label).width + padX * 2;
        ctx.fillStyle = 'rgba(6,10,16,0.82)';
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1 / Math.max(0.45, camZoom);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(node.x - w / 2, y - h, w, h, 5 / Math.max(0.45, camZoom));
        else ctx.rect(node.x - w / 2, y - h, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.fillText(label, node.x, y - 3);
    }
    ctx.restore();
}


function getPassiveNodeEffectShortLabel(node) {
    if (!node) return '';
    const stat = node.stat || '';
    const shortByStat = {
        flatHp: '생명력', pctHp: '생명(%)', regen: '재생', leech: '흡혈',
        flatDmg: '피해', pctDmg: '피해(%)', meleePctDmg: '근접(%)', physPctDmg: '물리피해(%)', aoePctDmg: '범위피해(%)', projectilePctDmg: '투사체피해(%)',
        firePctDmg: '화염피해(%)', coldPctDmg: '냉기피해(%)', lightPctDmg: '번개피해(%)', chaosPctDmg: '카오스피해(%)', elementalPctDmg: '원소피해(%)', dotPctDmg: '지속피해(%)', spellFlatPct: '주문내장(%)',
        slamPctDmg: '강타피해(%)', slamEchoChance: '여진확률', projectileExtraShots: '투사체추가',
        crit: '치명타 확률', critDmg: '치명타 피해', aspd: '공격 속도', move: '이동 속도', ds: '연속타격',
        armor: '방어도', armorPct: '방어도(%)', evasion: '회피', evasionPct: '회피(%)', energyShield: '보호막', energyShieldPct: '보호막(%)', energyShieldRegen: '보호막재생',
        deflectChance: '비껴내기', deflectMajor: '비껴내기', dr: '피감', blockChance: '막기', blockChancePct: '막기증폭',
        resF: '화염저항', resC: '냉기저항', resL: '번개저항', resAll: '모든원소저항', resChaos: '카오스저항', resPen: '저항관통',
        maxResF: '화염최대', maxResC: '냉기최대', maxResL: '번개최대', maxResChaos: '카오스최대', chaosResElemPenalty: '카오스저항+',
        igniteChance: '점화확률', chillChance: '냉각확률', freezeChance: '동결확률', shockChance: '감전확률', poisonChance: '중독확률', bleedChance: '출혈확률',
        ailResIgnite: '점화저항', ailResShock: '감전저항', ailResFreeze: '동결저항', ailResPoison: '중독저항', ailResBleed: '출혈저항',
        regenSuppress: '재생억제', physIgnore: '물리무시', minDmgRoll: '최소보정', maxDmgRoll: '최대보정',
        leechRateCap: '흡혈속도캡', leechTotalCap: '흡혈총량캡', leechInstanceCap: '흡혈캡',
        moveEvasion: '이속 및 회피', hpArmor: '생명력 및 방어도', aspdMove: '공속 및 이속',
        summonPctDmg: '소환피해(%)', summonHpPct: '소환생명(%)', summonCritDmg: '소환치피', summonFlatDmg: '소환피해', summonCrit: '소환치명', summonAspd: '소환공속',
        gemLevel: '젬레벨', suppCap: '보조젬한도', expGain: '경험치',
        fireGemLevel: '화염젬레벨', coldGemLevel: '냉기젬레벨', lightGemLevel: '번개젬레벨', chaosGemLevel: '카오스젬레벨', physGemLevel: '물리젬레벨',
        projectileGemLevel: '투사체젬레벨', meleeGemLevel: '근접젬레벨', slamGemLevel: '강타젬레벨', spellGemLevel: '주문젬레벨', dotGemLevel: '지속젬레벨', aoeGemLevel: '범위젬레벨', elementalGemLevel: '원소젬레벨'
    };
    // 큐레이션된 짧은 라벨은 단어 중간에서 잘리지 않도록 그대로 사용한다.
    if (shortByStat[stat]) return shortByStat[stat];
    let label = getStatName(stat) || getPassiveEffectLabel(node) || '';
    label = String(label)
        .replace(/\([^)]*\)/g, '')
        .replace(/[+\-]?\d+(?:\.\d+)?\s*%?/g, '')
        .replace(/[·:：]/g, ' ')
        .replace(/증가|확률|획득|피해량|효과/g, '')
        .replace(/\s+/g, '')
        .trim();
    if (!label) label = getPassiveNodeDisplayName(node) || '';
    return label.length > 6 ? label.slice(0, 6) : label;
}

function drawPassiveNodeEffectLabel(ctx, node, radius, active, reachable, visibility, zoomedOutMode) {
    if (!node || visibility === 'hidden' || zoomedOutMode || camZoom < 0.46) return;
    const important = node.kind === 'major' || node.kind === 'hub' || node.kind === 'apex' || node.kind === 'transcendent';
    const hovered = !!(hoverNode && hoverNode.id === node.id);
    if (!hovered && !reachable && !(active && important)) return;

    const label = getPassiveNodeEffectShortLabel(node);
    if (!label) return;
    const accent = getPassiveStatAccent(node.stat);
    const fontSize = Math.max(9, Math.min(15, 10.5 / Math.max(0.55, camZoom)));
    const padX = 4.5 / Math.max(0.6, camZoom);
    const padY = 2.5 / Math.max(0.6, camZoom);
    const placeLeft = node.x < -80;
    const gap = 6 / Math.max(0.7, camZoom);
    const anchorX = node.x + (placeLeft ? -(radius + gap) : (radius + gap));
    const y = node.y + fontSize * 0.38;

    ctx.save();
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textAlign = placeLeft ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + padX * 2;
    const h = fontSize + padY * 2;
    const x = placeLeft ? anchorX - w : anchorX;
    const rect = { x: x - 2, y: y - h / 2 - 2, w: w + 4, h: h + 4 };
    const collides = passiveEffectLabelRects.some(other => !(
        rect.x + rect.w < other.x || other.x + other.w < rect.x
        || rect.y + rect.h < other.y || other.y + other.h < rect.y
    ));
    if (collides && !hovered) {
        ctx.restore();
        return;
    }
    passiveEffectLabelRects.push(rect);
    ctx.globalAlpha = active ? 0.98 : (reachable ? 0.9 : 0.76);
    ctx.fillStyle = 'rgba(5,9,15,0.78)';
    ctx.strokeStyle = active ? accent.activeOuter : (reachable ? accent.reachOuter : 'rgba(150,175,200,0.5)');
    ctx.lineWidth = Math.max(0.7, 1 / Math.max(0.55, camZoom));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y - h / 2, w, h, 4 / Math.max(0.65, camZoom));
    else ctx.rect(x, y - h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent.text || '#dce6f2';
    ctx.fillText(label, placeLeft ? x + w - padX : x + padX, y);
    ctx.restore();
}

function getHoveredPassivePathNodeIds(hoveredNodeId) {
    if (!hoveredNodeId) return new Set();
    let edges = passiveRenderCache && Array.isArray(passiveRenderCache.edges) ? passiveRenderCache.edges : [];
    if (!edges.length) return new Set([hoveredNodeId]);
    let adj = new Map();
    edges.forEach(edge => {
        if (!adj.has(edge.from)) adj.set(edge.from, []);
        if (!adj.has(edge.to)) adj.set(edge.to, []);
        adj.get(edge.from).push(edge.to);
        adj.get(edge.to).push(edge.from);
    });
    let owned = new Set((game.passives || []).filter(Boolean));
    owned.add('n0');
    let queue = [hoveredNodeId];
    let prev = new Map([[hoveredNodeId, null]]);
    let target = owned.has(hoveredNodeId) ? hoveredNodeId : null;
    while (queue.length && !target) {
        let cur = queue.shift();
        let nextList = adj.get(cur) || [];
        for (let next of nextList) {
            if (prev.has(next)) continue;
            prev.set(next, cur);
            if (owned.has(next)) { target = next; break; }
            queue.push(next);
        }
    }
    let path = new Set([hoveredNodeId]);
    if (!target) return path;
    let cur = target;
    while (cur !== null && cur !== undefined) {
        path.add(cur);
        cur = prev.get(cur);
    }
    return path;
}
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
    const PASSIVE_TREE_SIMPLIFY_ZOOM = 0.31;
    const PASSIVE_TREE_ULTRA_SIMPLIFY_ZOOM = 0.24;
    const zoomedOutMode = camZoom <= PASSIVE_TREE_SIMPLIFY_ZOOM;
    const ultraZoomedOutMode = camZoom <= PASSIVE_TREE_ULTRA_SIMPLIFY_ZOOM;

    // transform 누적 방지: 매 렌더 시작 시 setTransform으로 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const viewport = getPassiveWorldViewport(displayWidth, displayHeight);
    const visibleNodes = passiveRenderCache.nodes.filter(node => isNodeInViewport(node, viewport, 120));
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
    if (!lightweightMode && !zoomedOutMode) drawPassiveStarfield(ctx, PASSIVE_BOUNDS);

    // 중심 오라
    const passiveRoot = PASSIVE_TREE.nodes.n0 || { x: 0, y: 0 };
    const rootGlow = ctx.createRadialGradient(passiveRoot.x, passiveRoot.y, 0, passiveRoot.x, passiveRoot.y, 520);
    rootGlow.addColorStop(0, 'rgba(182,148,83,0.12)');
    rootGlow.addColorStop(0.35, 'rgba(67,89,126,0.08)');
    rootGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rootGlow;
    ctx.beginPath();
    ctx.arc(passiveRoot.x, passiveRoot.y, 560, 0, Math.PI * 2);
    ctx.fill();

    if (!lightweightMode && !zoomedOutMode) drawPassiveEvolutionAura(ctx);

    // 리빌 펄스는 CSS overlay에서 animationend까지 GPU compositor로 처리한다.

    let hoveredLinkedIds = new Set();
    let hoveredPathNodeIds = getHoveredPassivePathNodeIds(hoverNode && hoverNode.id);
    if (hoverNode && hoverNode.id) {
        hoveredLinkedIds.add(hoverNode.id);
        (passiveRenderCache.edges || []).forEach(edge => {
            if (edge.from === hoverNode.id) hoveredLinkedIds.add(edge.to);
            else if (edge.to === hoverNode.id) hoveredLinkedIds.add(edge.from);
        });
    }

    // 링크
    drawPassiveBranchUnderlay(ctx, visibleEdges, lightweightMode);

    visibleEdges.forEach(edge => {
        const a = edge.a;
        const b = edge.b;
        if (!isPassiveNodeAvailable(a) || !isPassiveNodeAvailable(b)) return;

        const hoveredLink = hoverNode && (a.id === hoverNode.id || b.id === hoverNode.id);
        const linkedHoverChain = hoverNode && hoveredLinkedIds.has(a.id) && hoveredLinkedIds.has(b.id);
        const onHoveredPath = hoverNode && hoveredPathNodeIds.has(a.id) && hoveredPathNodeIds.has(b.id);
        const hoverRelatedEdge = hoveredLink || linkedHoverChain || onHoveredPath;

        const visibleA = getPassiveVisibility(a.id);
        const visibleB = getPassiveVisibility(b.id);
        if ((visibleA === 'hidden' || visibleB === 'hidden') && !hoverRelatedEdge) return;
        const alpha = Math.min(getNodeRevealAmount(a), getNodeRevealAmount(b));
        const activeA = (game.passives || []).includes(a.id);
        const activeB = (game.passives || []).includes(b.id);
        const activeLink = activeA && activeB;
        const reachableLink = reachableNodes.has(a.id) || reachableNodes.has(b.id);
        const previewLink = visibleA === 'preview' || visibleB === 'preview';

        ctx.save();
        ctx.globalAlpha = alpha;

        if (ultraZoomedOutMode) {
            drawPassiveLink(ctx, a, b, {
                stroke: activeLink ? 'rgba(160,130,82,0.78)' : 'rgba(80,98,115,0.5)',
                innerStroke: activeLink ? 'rgba(240,220,170,0.32)' : 'rgba(130,150,168,0.12)',
                width: activeLink ? 3.2 : 1.6
            });
        } else if (hoveredLink || linkedHoverChain || onHoveredPath) {
            drawPassiveLink(ctx, a, b, {
                stroke: hoveredLink ? 'rgba(238,248,255,0.98)' : (onHoveredPath ? 'rgba(255,216,120,0.95)' : 'rgba(112,165,214,0.82)'),
                innerStroke: hoveredLink ? 'rgba(255,255,255,0.96)' : (onHoveredPath ? 'rgba(255,244,196,0.82)' : 'rgba(198,228,255,0.58)'),
                width: hoveredLink ? 5.4 : (onHoveredPath ? 4.8 : 3.8),
                shadow: lightweightMode ? 'transparent' : (hoveredLink ? 'rgba(238,248,255,0.38)' : (onHoveredPath ? 'rgba(255,216,120,0.42)' : 'rgba(151,206,255,0.38)')),
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

    // 노드 효과 라벨은 화면 좌표상 서로 겹치지 않는 것만 그린다.
    passiveEffectLabelRects = [];
    // 노드
    visibleNodes.forEach(node => {
        const visibility = getPassiveVisibility(node.id);
        const hiddenSilhouette = visibility === 'hidden' && zoomedOutMode;
        if (visibility === 'hidden' && !hiddenSilhouette) return;
        const searchInfo = (typeof getPassiveNodeSearchMatch === 'function') ? getPassiveNodeSearchMatch(node) : { active: false, matches: true };
        const revealAlpha = hiddenSilhouette ? (searchInfo.active && searchInfo.matches ? 0.18 : 0.12) : getNodeRevealAmount(node);
        const active = !hiddenSilhouette && (game.passives || []).includes(node.id);
        const reachable = !hiddenSilhouette && reachableNodes.has(node.id);
        const radius = getPassiveNodeVisualRadius(node) + ((hoverNode && hoverNode.id === node.id) ? 1.5 : 0);
        const palette = getPassiveNodePalette(node, active, reachable, visibility);
        const searchDimmed = searchInfo.active && !searchInfo.matches;
        const nodeAlpha = revealAlpha * (searchDimmed ? 0.28 : 1);

        drawPassiveNodeShape(ctx, node, radius, palette, active, reachable, visibility, nodeAlpha, lightweightMode || hiddenSilhouette || searchDimmed);
        if (!searchDimmed) drawPassiveNodeEffectLabel(ctx, node, radius, active, reachable, visibility, zoomedOutMode);
        if (searchInfo.active && searchInfo.matches) drawPassiveSearchHighlight(ctx, node, radius, palette);

        // reachable/hover rings are maintained in the CSS overlay below.
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

    syncPassiveTreeOverlay(displayWidth, displayHeight, visibleNodes, hoveredLinkedIds, hoveredPathNodeIds, ultraZoomedOutMode);
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


function getDropOnlyItemSourceMeta(item) {
    if (!item) return null;
    let base = BASE_ITEM_DB.find(row => row && ((item.baseId && row.id === item.baseId) || (row.slot === String(item.slot || '').replace(/[12]/, '') && row.name === item.baseName)));
    let unique = UNIQUE_DB.find(row => row && row.name === item.name && Array.isArray(row.slots) && row.slots.includes(String(item.slot || '').replace(/[12]/, '')));
    let dropOnly = (base && base.dropOnly) ? base.dropOnly : ((unique && unique.dropOnly) ? unique.dropOnly : null);
    let sourceKey = dropOnly ? (dropOnly.type || dropOnly.id || null) : null;
    if (!sourceKey && base && base.realmBase) sourceKey = `realm_${base.realmBase}`;
    let map = {
        beehive: { badgeClass: 'item-source-badge item-source-badge--beehive', toneClass: 'item-source-tone--beehive', label: '벌집 한정' },
        trial: { badgeClass: 'item-source-badge item-source-badge--trial', toneClass: 'item-source-tone--trial', label: '시련 한정' },
        rift: { badgeClass: 'item-source-badge item-source-badge--rift', toneClass: 'item-source-tone--rift', label: '균열 한정' },
        meteor: { badgeClass: 'item-source-badge item-source-badge--meteor', toneClass: 'item-source-tone--meteor', label: '운석 한정' },
        labyrinth: { badgeClass: 'item-source-badge item-source-badge--ancient-labyrinth', toneClass: 'item-source-tone--ancient-labyrinth', label: '고대 미궁 한정' },
        ancient_labyrinth: { badgeClass: 'item-source-badge item-source-badge--ancient-labyrinth', toneClass: 'item-source-tone--ancient-labyrinth', label: '고대 미궁 한정' },
        grand_breach_run: { badgeClass: 'item-source-badge item-source-badge--rift', toneClass: 'item-source-tone--rift', label: '대균열 한정' },
        realm_chaos: { badgeClass: 'item-source-badge item-source-badge--realm-chaos', toneClass: 'item-source-tone--realm-chaos', label: '혼돈계 한정' },
        realm_underworld: { badgeClass: 'item-source-badge item-source-badge--realm-underworld', toneClass: 'item-source-tone--realm-underworld', label: '지하계 한정' },
        realm_cosmos: { badgeClass: 'item-source-badge item-source-badge--realm-cosmos', toneClass: 'item-source-tone--realm-cosmos', label: '우주계 한정' }
    };
    return sourceKey ? (map[sourceKey] || null) : null;
}

function getEquipSearchQueryLocal() {
    try {
        if (typeof getSearchFilterState === 'function') {
            let sf = getSearchFilterState();
            if (sf && typeof sf.equip === 'string') return sf.equip;
        }
        let d = game && game.settings && game.settings.searchFilters;
        return d && typeof d.equip === 'string' ? d.equip : '';
    } catch (error) {
        console.error('equipment search query failed:', error);
        return '';
    }
}

function highlightEquipTextLocal(text, query) {
    let raw = String(text || '');
    let q = String(query || '').trim().toLowerCase();
    if (!q) return escapeHTML(raw);
    let tokens = q.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
    if (tokens.length <= 0) return escapeHTML(raw);
    let lower = raw.toLowerCase();
    let ranges = [];
    tokens.forEach(tok => {
        let from = 0;
        while (from < lower.length) {
            let idx = lower.indexOf(tok, from);
            if (idx < 0) break;
            ranges.push([idx, idx + tok.length]);
            from = idx + Math.max(1, tok.length);
        }
    });
    if (ranges.length <= 0) return escapeHTML(raw);
    ranges.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    let merged = [];
    ranges.forEach(([s,e]) => {
        let last = merged[merged.length - 1];
        if (!last || s > last[1]) merged.push([s,e]);
        else last[1] = Math.max(last[1], e);
    });
    let out = '';
    let cur = 0;
    merged.forEach(([s,e]) => {
        if (s > cur) out += escapeHTML(raw.slice(cur, s));
        out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${escapeHTML(raw.slice(s, e))}</mark>`;
        cur = e;
    });
    if (cur < raw.length) out += escapeHTML(raw.slice(cur));
    return out;
}

function renderPaperdoll(targetId, forCrafting) {
    let html = '';
    let query = getEquipSearchQueryLocal();
    let hi = (text) => {
        try {
            if (typeof highlightSearchText === 'function') return highlightSearchText(text, query);
        } catch (error) {
            console.error('equipment search highlight failed:', error);
        }
        return highlightEquipTextLocal(text, query);
    };
    ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'].forEach(slot => {
        let item = game.equipment[slot];
        let displaySlot = slot.replace(/[12]/, '');
        let selected = isCraftSelectionEquipAvailableLocal() && getCraftSelectionRefLocal() === slot;
        if (item) {
            let displayStats = (item.baseStats || []).concat(item.stats || [], item.underEnchant ? [item.underEnchant] : []);
            if (item.chaosInfusion) displayStats.push({ ...item.chaosInfusion, statName: `[주입] ${item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)}` });
            if (typeof getImmutableItemSpecialStats === 'function') displayStats = displayStats.concat(getImmutableItemSpecialStats(item));
            else if (item.encroached && !item.encroached.liberated) displayStats.push({ id: 'encroached', val: 0, statName: '[잠식] 해방 전' });
            let shieldBaseSummaryIds = new Set(['armor', 'evasion', 'energyShield', 'baseBlockChance']);
            let summaryStats = slot === '방패' ? displayStats.filter(stat => stat && !shieldBaseSummaryIds.has(stat.id)) : displayStats;
            let statLines = summaryStats.slice(0, 2).map(stat => `${hi(stat.statName || getStatName(stat.id))} +${formatValue(stat.id, stat.val)}`);
            if (slot === '방패') {
                let baseArmor = displayStats.filter(s => s && s.id === 'armor').reduce((a, b) => a + Number(b.val || 0), 0);
                let baseEvasion = displayStats.filter(s => s && s.id === 'evasion').reduce((a, b) => a + Number(b.val || 0), 0);
                let baseEs = displayStats.filter(s => s && s.id === 'energyShield').reduce((a, b) => a + Number(b.val || 0), 0);
                let armorPct = displayStats.filter(s => s && s.id === 'armorPct').reduce((a, b) => a + Number(b.val || 0), 0);
                let evasionPct = displayStats.filter(s => s && s.id === 'evasionPct').reduce((a, b) => a + Number(b.val || 0), 0);
                let esPct = displayStats.filter(s => s && s.id === 'energyShieldPct').reduce((a, b) => a + Number(b.val || 0), 0);
                let baseBlock = displayStats.filter(s => s && s.id === 'baseBlockChance').reduce((a, b) => a + Number(b.val || 0), 0);
                let blockPct = displayStats.filter(s => s && s.id === 'blockChancePct').reduce((a, b) => a + Number(b.val || 0), 0);
                let blockFlat = displayStats.filter(s => s && s.id === 'blockChance').reduce((a, b) => a + Number(b.val || 0), 0);
                if (baseArmor > 0) statLines.push(`${hi('방어도')} ${Math.floor(baseArmor * (1 + armorPct / 100))} (${Math.floor(baseArmor)})`);
                if (baseEvasion > 0) statLines.push(`${hi('회피')} ${Math.floor(baseEvasion * (1 + evasionPct / 100))} (${Math.floor(baseEvasion)})`);
                if (baseEs > 0) statLines.push(`${hi('에너지 보호막')} ${Math.floor(baseEs * (1 + esPct / 100))} (${Math.floor(baseEs)})`);
                if (baseBlock > 0) statLines.push(`${hi('막기 확률')} ${(baseBlock * (1 + blockPct / 100) + blockFlat).toFixed(1)}% (${baseBlock.toFixed(1)}%)`);
            }
            statLines = statLines.slice(0, 2);
            let statsHtml = statLines.join('<br>');
            let canSelectFromEquipTab = !forCrafting && targetId === 'ui-equip-list';
            let click = (forCrafting || canSelectFromEquipTab) ? `selectForCrafting('${slot}', true)` : '';
            let doubleClick = `event.stopPropagation(); handleEquipmentSlotDoubleClick('${slot}', ${forCrafting ? 'true' : 'false'})`;
            let footer = forCrafting ? `<button style="font-size:0.7em; padding:2px;" onclick="event.stopPropagation(); selectForCrafting('${slot}', true)">선택</button>` : `<button style="font-size:0.7em; padding:2px;" onclick="event.stopPropagation(); unequipItem('${slot}')">해제</button>`;
            let sourceMeta = getDropOnlyItemSourceMeta(item);
            let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${sourceMeta.label}</span>` : '';
            let sourceTone = sourceMeta ? sourceMeta.toneClass : '';
            let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
            html += `<div class="slot-box slot-${slot} ${selected ? 'selected' : ''} ${sourceTone}" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"><div class="item-title ${item.rarity}" style="font-size:0.9em; margin-bottom:2px;">[${displaySlot}] ${item.name}${exceptionalStars}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${sourceBadge}</div><div class="item-stats" style="font-size:0.74em; margin-bottom:4px;">${statsHtml}</div>${footer}</div>`;
        } else {
            html += `<div class="slot-box slot-${slot}" style="color:#3d3d5c; text-align:center; font-size:0.8em;">[${displaySlot}]<br>비어있음</div>`;
        }
    });
    document.getElementById(targetId).innerHTML = html;
}

function renderInventoryCard(item, idx, mode) {
    let selected = !isCraftSelectionEquipAvailableLocal() && getCraftSelectionRefLocal() === item.id;
    let query = getEquipSearchQueryLocal();
    let hi = (text) => {
        try {
            if (typeof highlightSearchText === 'function') return highlightSearchText(text, query);
        } catch (error) {
            console.error('inventory search highlight failed:', error);
        }
        return highlightEquipTextLocal(text, query);
    };
    let lockIcon = item.locked ? ' 🔒' : '';
    let lockBtnLabel = item.locked ? '잠금해제' : '잠금';
    // 장비 칸 단순화: 카드에는 옵션을 나열하지 않고 이름/베이스/등급만 보여준다.
    // 전체 옵션은 호버 시 커스텀 툴팁(showItemTooltip)에서 확인한다.
    let explicitCount = typeof getItemExplicitOptionCount === 'function'
        ? getItemExplicitOptionCount(item)
        : ((item.stats || []).length + (item.chaosInfusion ? 1 : 0));
    let metaBits = [];
    if (explicitCount > 0) metaBits.push(`추가 옵션 ${explicitCount}`);
    if (item.underEnchant) metaBits.push('인챈트');
    if (item.chaosInfusion) metaBits.push('혼돈 주입');
    if (item.encroached && !item.encroached.liberated) metaBits.push('잠식 · 해방 전');
    if (item.fusedRelic) metaBits.push('융합 유물');
    let metaLine = `<span style="color:#8fa7be;">${metaBits.length ? metaBits.join(' · ') : '추가 옵션 없음'} · <span style="color:#7f96ad;">호버 시 상세</span></span>`;
    let actions = '';
    if (mode === 'equip') actions = `<div class="item-actions"><button style="flex:1" onclick="event.stopPropagation(); equipItemById(${item.id})">장착</button><button style="background:#35506a; border-color:#3f6486;" onclick="event.stopPropagation(); craftSelectInventoryItemById(${item.id})">제작</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button><button style="background:#7f8c8d; border-color:#555;" onclick="event.stopPropagation(); salvageItemById(${item.id})">해체</button></div>`;
    else if (mode === 'fossil') actions = `<div class="item-actions"><button style="flex:1; background:#35506a;" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">화석 대상</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button></div>`;
    else actions = `<div class="item-actions"><button style="flex:1" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">선택</button><button style="background:#35506a;" onclick="event.stopPropagation(); equipItemById(${item.id})">장착</button><button style="background:${item.locked ? '#7a5d1f' : '#4f6277'}; border-color:${item.locked ? '#b8893a' : '#465664'};" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button><button style="background:#7f8c8d; border-color:#555;" onclick="event.stopPropagation(); salvageItemById(${item.id})">해체</button></div>`;
    let doubleClick = mode === 'equip' ? ` ondblclick="event.stopPropagation(); handleInventoryCardDoubleClick(${item.id}, 'equip')"` : '';
    let recordedTag = '';
    if (item.rarity === 'unique') {
        let key = `${item.slot}|${item.name}`;
        let codex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
        if (codex[key]) recordedTag = ' <span style="color:#4cd964; font-weight:700;">[기록됨]</span>';
    }
    let sourceMeta = getDropOnlyItemSourceMeta(item);
    let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${sourceMeta.label}</span>` : '';
    let sourceTone = sourceMeta ? sourceMeta.toneClass : '';
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    return `<div class="item-card ${selected ? 'selected' : ''} ${sourceTone}" onclick="selectForCrafting(${item.id}, false)"${doubleClick} onmouseenter="showItemTooltip(event, ${idx}, false)" onmouseleave="hideItemTooltip()"><div><div class="item-title ${item.rarity}">[${hi(item.slot)}] ${hi(item.name)}${exceptionalStars}${sourceBadge}${recordedTag}${lockIcon}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}</div><div class="item-base-line">${hi(item.baseName)}</div><div class="item-stats">${metaLine}</div></div>${actions}</div>`;
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


Object.assign(window, { drawPassiveTree, syncPassiveTreeOverlay, spawnPassiveRevealBurstOverlay, updatePassiveTreeOverlayTransform });
