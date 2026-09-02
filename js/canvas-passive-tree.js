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
            if (typeof isPassiveImageSlotNode === 'function' && isPassiveImageSlotNode(node)) return;
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
        igniteDamageMultiplierPct: '점화효율', chillEffect: '냉각효율', shockEffect: '감전효율',
        shockedEnemyHitDamagePct: '감전명중피해',
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

// 상시 문구를 직접 켠 경우에도 가까운 배율에서만 표시한다. 검색과 호버 정보는 별도 UI가 맡는다.
const PASSIVE_EFFECT_LABEL_MIN_ZOOM = 0.62;

function drawPassiveNodeEffectLabel(ctx, node, radius, active, reachable, visibility) {
    if (game && game.settings && game.settings.passiveTreeShowLabels === false) return;
    if (!node || visibility === 'hidden' || camZoom < PASSIVE_EFFECT_LABEL_MIN_ZOOM) return;
    const important = node.kind === 'major' || node.kind === 'hub' || node.kind === 'apex' || node.kind === 'transcendent';
    const hovered = !!(hoverNode && hoverNode.id === node.id);
    if (!hovered && !reachable && !(active && important)) return;

    const label = getPassiveNodeEffectShortLabel(node);
    if (!label) return;
    const accent = getPassiveStatAccent(node.stat);
    // 월드 좌표 크기 = 목표 화면 크기 / 배율. 나눗셈 하한을 표시 최소 배율까지 낮춰야
    // 축소했을 때 글자가 화면에서 작아지지 않는다(예전에는 하한 0.55와 상한 15px이
    // 서로 싸워서 0.46 근처에서 이미 읽기 힘들 만큼 작아졌다).
    const zoomForScale = Math.max(PASSIVE_EFFECT_LABEL_MIN_ZOOM, camZoom);
    const fontSize = Math.max(9, Math.min(46, 10.5 / zoomForScale));
    const padX = 4.5 / zoomForScale;
    const padY = 2.5 / zoomForScale;
    const placeLeft = node.x < -80;
    const gap = 6 / zoomForScale;
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
    ctx.lineWidth = Math.max(0.7, 1 / zoomForScale);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y - h / 2, w, h, 4 / zoomForScale);
    else ctx.rect(x, y - h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent.text || '#dce6f2';
    ctx.fillText(label, placeLeft ? x + w - padX : x + padX, y);
    ctx.restore();
}

function getHoveredPassivePathNodeIds(hoveredNodeId) {
    if (!hoveredNodeId) return new Set();
    const cacheKey = String(hoveredNodeId);
    const cached = passiveRenderCache && passiveRenderCache.hoverPath;
    if (cached && cached.nodeId === cacheKey && cached.stateSignature === passiveRenderCache.stateSignature) return cached.path;
    const adj = passiveRenderCache && passiveRenderCache.adjacency;
    if (!(adj instanceof Map) || adj.size === 0) return new Set([hoveredNodeId]);
    let owned = typeof getPassiveConnectionNodeIds === 'function'
        ? getPassiveConnectionNodeIds()
        : new Set((game.passives || []).filter(Boolean));
    owned.add(typeof getPassiveTreeRootNodeId === 'function' ? getPassiveTreeRootNodeId() : 'n0');
    let queue = [hoveredNodeId];
    let queueIndex = 0;
    let prev = new Map([[hoveredNodeId, null]]);
    let target = owned.has(hoveredNodeId) ? hoveredNodeId : null;
    while (queueIndex < queue.length && !target) {
        let cur = queue[queueIndex++];
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
    passiveRenderCache.hoverPath = { nodeId: cacheKey, stateSignature: passiveRenderCache.stateSignature, path };
    return path;
}

function drawPassiveAstralBackdrop(ctx, lightweightMode) {
    ctx.save();
    ctx.lineWidth = lightweightMode ? 2 : 3;
    ctx.strokeStyle = 'rgba(105,126,140,0.07)';
    [720, 1440, 2160, 2880].forEach(radius => {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.lineWidth = lightweightMode ? 1.4 : 2.2;
    ctx.strokeStyle = 'rgba(178,143,83,0.055)';
    for (let index = 0; index < 6; index++) {
        const angle = -Math.PI / 2 + index * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 260, Math.sin(angle) * 260);
        ctx.lineTo(Math.cos(angle) * 3400, Math.sin(angle) * 3400);
        ctx.stroke();
    }
    if (!lightweightMode) {
        ctx.strokeStyle = 'rgba(205,174,112,0.09)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 235, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-118, -118, 236, 236);
    }
    ctx.restore();
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
    const PASSIVE_TREE_SIMPLIFY_ZOOM = 0.24;
    const PASSIVE_TREE_ULTRA_SIMPLIFY_ZOOM = 0.18;
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
    screenBg.addColorStop(0, '#0a0d11');
    screenBg.addColorStop(0.45, '#05080b');
    screenBg.addColorStop(1, '#020304');
    ctx.fillStyle = screenBg;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.save();
    // setTransform 이후 카메라 zoom/translate 적용
    ctx.translate(displayWidth / 2 + camX, displayHeight / 2 + camY);
    ctx.scale(camZoom, camZoom);

    drawPassiveAstralBackdrop(ctx, lightweightMode);

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

    const allocatedNodeIds = new Set(game.passives || []);
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
        const activeA = allocatedNodeIds.has(a.id) || (typeof isPassiveNodeVirtuallyLearned === 'function' && isPassiveNodeVirtuallyLearned(a.id));
        const activeB = allocatedNodeIds.has(b.id) || (typeof isPassiveNodeVirtuallyLearned === 'function' && isPassiveNodeVirtuallyLearned(b.id));
        const activeLink = activeA && activeB;
        const reachableLink = reachableNodes.has(a.id) || reachableNodes.has(b.id);
        const previewLink = visibleA === 'preview' || visibleB === 'preview';
        const crossBranchLink = Boolean(a.treeBranchRoot && b.treeBranchRoot && a.treeBranchRoot !== b.treeBranchRoot);
        const sameDepthLink = Number(a.depth) === Number(b.depth);

        ctx.save();
        ctx.globalAlpha = alpha;

        if (ultraZoomedOutMode) {
            drawPassiveLink(ctx, a, b, {
                stroke: activeLink ? 'rgba(160,130,82,0.78)' : (crossBranchLink ? 'rgba(80,98,115,0.2)' : 'rgba(80,98,115,0.5)'),
                width: activeLink ? 2.6 : (crossBranchLink ? 0.7 : (sameDepthLink ? 0.9 : 1.1))
            });
        } else if (hoveredLink || linkedHoverChain || onHoveredPath) {
            drawPassiveLink(ctx, a, b, {
                stroke: hoveredLink ? 'rgba(238,248,255,0.98)' : (onHoveredPath ? 'rgba(255,216,120,0.95)' : 'rgba(112,165,214,0.82)'),
                width: hoveredLink ? 3 : (onHoveredPath ? 2.6 : 2.2)
            });
        } else if (activeLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: 'rgba(226,194,129,0.9)',
                width: 2.4
            });
        } else if (reachableLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: crossBranchLink ? 'rgba(116,128,137,0.3)' : 'rgba(157,170,179,0.66)',
                width: crossBranchLink ? 0.8 : (sameDepthLink ? 1 : 1.3)
            });
        } else if (previewLink) {
            drawPassiveLink(ctx, a, b, {
                stroke: crossBranchLink ? 'rgba(67,85,98,0.1)' : 'rgba(67,85,98,0.24)',
                width: crossBranchLink ? 0.6 : (sameDepthLink ? 0.8 : 1)
            });
        } else {
            drawPassiveLink(ctx, a, b, {
                stroke: crossBranchLink ? 'rgba(65,72,78,0.2)' : (sameDepthLink ? 'rgba(79,87,94,0.42)' : 'rgba(94,102,109,0.56)'),
                width: crossBranchLink ? 0.5 : (sameDepthLink ? 0.7 : 0.9)
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
        const virtualActive = !hiddenSilhouette && typeof isPassiveNodeVirtuallyLearned === 'function' && isPassiveNodeVirtuallyLearned(node.id);
        const active = !hiddenSilhouette && (allocatedNodeIds.has(node.id) || virtualActive);
        const effectDisabled = !hiddenSilhouette && typeof isPassiveNodeEffectDisabled === 'function' && isPassiveNodeEffectDisabled(node.id);
        const reachable = !hiddenSilhouette && reachableNodes.has(node.id);
        const radius = getPassiveNodeVisualRadius(node) + ((hoverNode && hoverNode.id === node.id) ? 1.5 : 0);
        const palette = getPassiveNodePalette(node, active, reachable, visibility);
        const searchDimmed = searchInfo.active && !searchInfo.matches;
        const nodeAlpha = revealAlpha * (searchDimmed ? 0.28 : 1);
        const framedNode = typeof isPassiveFramedNode === 'function' && isPassiveFramedNode(node);
        const detailedArt = !hiddenSilhouette && !searchDimmed && !ultraZoomedOutMode;
        const artOpacity = nodeAlpha * (active ? 1 : (reachable ? 0.94 : 0.86));
        const imageSlot = detailedArt && typeof isPassiveImageSlotNode === 'function'
            && typeof getPassiveNodeSlotImage === 'function'
            && isPassiveImageSlotNode(node) && !!getPassiveNodeSlotImage(node);
        const imageFramed = detailedArt && framedNode && !imageSlot && !!getPassiveNodeFrameImage(node);

        drawPassiveNodeShape(ctx, node, radius, palette, active, reachable, visibility, nodeAlpha, {
            lightweight: lightweightMode || zoomedOutMode || hiddenSilhouette || searchDimmed,
            imageFramed,
            imageSlot
        });
        if (imageFramed) drawPassiveNodeFrameArt(ctx, node, radius, active, artOpacity);
        if (detailedArt) drawPassiveNodeImageArt(ctx, node, radius, artOpacity);
        if (!searchDimmed && (virtualActive || effectDisabled)) {
            ctx.save();
            ctx.globalAlpha = nodeAlpha;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + (virtualActive ? 7 : 5), 0, Math.PI * 2);
            ctx.setLineDash(virtualActive ? [5, 4] : [2, 4]);
            ctx.strokeStyle = virtualActive ? 'rgba(188,132,255,0.95)' : 'rgba(255,122,122,0.88)';
            ctx.lineWidth = virtualActive ? 2.2 : 1.7;
            ctx.stroke();
            ctx.restore();
        }
        if (!searchDimmed) drawPassiveNodeEffectLabel(ctx, node, radius, active, reachable, visibility);
        if (searchInfo.active && searchInfo.matches) drawPassiveSearchHighlight(ctx, node, radius, palette);

        // reachable/hover rings are maintained in the CSS overlay below.
    });

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
            let click = forCrafting
                ? `selectForCrafting('${slot}', true)`
                : `equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')`;
            let doubleClick = `event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}', ${forCrafting ? 'true' : 'false'})`;
            let footer = forCrafting
                ? `<button class="equipment-slot-action" onclick="event.stopPropagation(); selectForCrafting('${slot}', true)">제작 선택</button>`
                : `<button class="equipment-slot-action" onclick="event.stopPropagation(); unequipItem('${slot}')">장착 해제</button>`;
            let sourceMeta = getDropOnlyItemSourceMeta(item);
            let sourceTone = sourceMeta ? sourceMeta.toneClass : '';
            html += `<div class="slot-box equipment-slot slot-${slot} rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${sourceTone}" data-slot="${slot}" data-item-tooltip-anchor="1" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="showItemTooltip(event, '${slot}', true)" onmousemove="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip(event)">
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual"><img src="${getEquipmentGridVisualAsset(item)}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="item-title equipment-slot-name ${item.rarity}">${hi(item.name)}</div>
                ${footer}
            </div>`;
        } else {
            let emptyClick = forCrafting ? '' : ` onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"`;
            html += `<div class="slot-box equipment-slot equipment-slot-empty slot-${slot}" data-slot="${slot}"${emptyClick}>
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual empty"><img src="${getEquipmentGridVisualAsset({ slot: displaySlot, baseId: `empty-${displaySlot}` })}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="equipment-empty-mark">＋</div>
                <div class="equipment-empty-label">비어 있음</div>
            </div>`;
        }
    });
    document.getElementById(targetId).innerHTML = html;
}

function renderEquipmentGridItem(item, idx, triageResult, placement, filterState) {
    let size = getEquipmentInventoryFootprint(item);
    let footprint = placement || { column: 0, row: 0, columns: size.columns, rows: size.rows };
    let asset = getEquipmentGridVisualAsset(item);
    let sourceMeta = getDropOnlyItemSourceMeta(item);
    let presetProtected = typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item);
    let itemKey = placement ? placement.key : equipmentInventoryGridRuntime.getItemKey(item);
    let selected = equipmentInventoryInteraction.getFocusedKey() === itemKey;
    let carried = equipmentInventoryInteraction.isCarryingKey(itemKey);
    let filterClass = filterState && filterState.filterActive
        ? (filterState.filterMatched ? 'is-filter-match' : 'is-filter-muted') : '';
    let rarityLabel = ({ normal: '일반', magic: '매직', rare: '레어', unique: '고유' })[item.rarity] || '일반';
    let badges = `${item.locked ? '<span>잠금</span>' : ''}${presetProtected ? '<span>세팅</span>' : ''}`;
    if (triageResult && triageResult.dpsGainPct >= 1) badges += `<span>공격 +${triageResult.dpsGainPct}%</span>`;
    if (triageResult && triageResult.ehpGainPct >= 1) badges += `<span>생존 +${triageResult.ehpGainPct}%</span>`;
    if (triageResult && triageResult.special) badges += '<span>특수</span>';
    let label = `${rarityLabel} ${item.name || item.baseName || '장비'} · ${footprint.columns}×${footprint.rows}`;
    return `<button type="button" class="equipment-grid-item rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${carried ? 'is-carried' : ''} ${filterClass} ${sourceMeta ? sourceMeta.toneClass : ''}"
        style="grid-column:${footprint.column + 1}/span ${footprint.columns};grid-row:${footprint.row + 1}/span ${footprint.rows};--item-grid-columns:${footprint.columns};--item-grid-rows:${footprint.rows};" data-equipment-grid-key="${escapeHTML(itemKey)}"
        aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHTML(label)}"
        onclick="equipmentInventoryInteraction.handleItemClick(event,this.dataset.equipmentGridKey,${idx})"
        ondblclick="equipmentInventoryInteraction.handleItemDoubleClick(event,this.dataset.equipmentGridKey,${item.id})"
        onmouseenter="if(!equipmentInventoryInteraction.isCarrying())showItemTooltip(event,${idx},false)" onmousemove="if(!equipmentInventoryInteraction.isCarrying())showItemTooltip(event,${idx},false)" onmouseleave="hideItemTooltip(event)">
        <img src="${asset}" alt="" aria-hidden="true" draggable="false"><span class="equipment-grid-item-name">${escapeHTML(item.name || item.baseName || '장비')}</span>
        <span class="equipment-grid-item-badges">${badges}</span>
    </button>`;
}

function renderEquipmentGridCells(layout, visibleKeys) {
    let hiddenOccupied = new Set();
    layout.entries.filter(entry => !visibleKeys.has(entry.key)).forEach(entry => {
        for (let row = entry.row; row < entry.row + entry.rows; row++) {
            for (let column = entry.column; column < entry.column + entry.columns; column++) hiddenOccupied.add(`${column}:${row}`);
        }
    });
    let cells = [];
    for (let row = 0; row < layout.rows; row++) {
        for (let column = 0; column < layout.columns; column++) {
            let hiddenClass = hiddenOccupied.has(`${column}:${row}`) ? ' occupied-filtered' : '';
            cells.push(`<button type="button" class="equipment-grid-cell${hiddenClass}" style="grid-column:${column + 1};grid-row:${row + 1};" data-grid-column="${column}" data-grid-row="${row}" aria-label="${column + 1}열 ${row + 1}행으로 이동" onclick="equipmentInventoryInteraction.moveFocusedTo(event,${column},${row})"></button>`);
        }
    }
    return cells.join('');
}

function renderEquipmentInventoryGrid(layout, rows) {
    let byKey = new Map(layout.entries.map(entry => [entry.key, entry]));
    let visibleKeys = new Set(rows.map(row => equipmentInventoryGridRuntime.getItemKey(row.item)));
    let itemHtml = rows.map(row => {
        let key = equipmentInventoryGridRuntime.getItemKey(row.item);
        let placement = byKey.get(key);
        if (!placement) return '';
        let triageResult = window.equipmentTriage ? window.equipmentTriage.getResult(row.item) : null;
        return renderEquipmentGridItem(row.item, row.idx, triageResult, placement, row);
    }).join('');
    return renderEquipmentGridCells(layout, visibleKeys) + itemHtml;
}

function renderEquipmentInventoryInspector(rows) {
    let root = document.getElementById('ui-equipment-inventory-inspector');
    if (!root) return;
    let visibleItems = (Array.isArray(rows) ? rows : []).map(row => row.item).filter(Boolean);
    let focusedKey = equipmentInventoryInteraction.getFocusedKey();
    let item = visibleItems.find(row => equipmentInventoryGridRuntime.getItemKey(row) === focusedKey) || null;
    if (!item) {
        equipmentInventoryInteraction.setFocusedKey(null);
        let message = visibleItems.length ? '장비를 선택하면 세부 작업을 할 수 있습니다.' : '표시할 장비가 없습니다.';
        let emptyHtml = `<div class="equipment-grid-inspector-empty">${message}</div>`;
        if (root.__lastHtml !== emptyHtml) root.innerHTML = root.__lastHtml = emptyHtml;
        return;
    }
    equipmentInventoryInteraction.setFocusedKey(equipmentInventoryGridRuntime.getItemKey(item));
    let footprint = getEquipmentInventoryFootprint(item);
    let presetProtected = typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item);
    let salvageDisabled = item.locked || presetProtected;
    let salvageTitle = presetProtected ? '장비 세팅 프리셋에서 제거한 뒤 해체할 수 있습니다.' : '장비를 해체합니다.';
    let rarityLabel = ({ normal: '일반', magic: '매직', rare: '레어', unique: '고유' })[item.rarity] || '일반';
    let html = `<div class="equipment-grid-inspector-copy rarity-${item.rarity || 'normal'}">
        <img src="${getEquipmentGridVisualAsset(item)}" alt=""><div><span>${rarityLabel} · ${escapeHTML(item.slot || '장비')} · ${footprint.columns}×${footprint.rows}칸</span>
        <strong class="${item.rarity || 'normal'}">${escapeHTML(item.name || item.baseName || '장비')}</strong><small>${escapeHTML(item.baseName || '')}${presetProtected ? ' · 세팅 보호' : ''}${item.locked ? ' · 잠금' : ''}</small></div>
    </div><div class="equipment-grid-inspector-actions">
        <button class="equipment-card-primary" onclick="equipmentInventoryInteraction.cancelCarry();equipItemById(${item.id})">장착</button>
        <button onclick="craftSelectInventoryItemById(${item.id})">제작</button>
        <button class="${item.locked ? 'is-locked' : ''}" onclick="toggleItemLockById(${item.id})">${item.locked ? '잠금해제' : '잠금'}</button>
        <button class="equipment-card-danger" title="${salvageTitle}" onclick="equipmentInventoryInteraction.cancelCarry();salvageItemById(${item.id})" ${salvageDisabled ? 'disabled' : ''}>${presetProtected ? '보호됨' : '해체'}</button>
    </div>`;
    if (root.__lastHtml !== html) root.innerHTML = root.__lastHtml = html;
}

safeExposeGlobals({ renderEquipmentInventoryGrid, renderEquipmentInventoryInspector });

function renderInventoryCard(item, idx, mode, triageResult) {
    if (mode === 'equip') return renderEquipmentGridItem(item, idx, triageResult);
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
    let presetProtected = typeof equipmentLoadoutRuntime !== 'undefined'
        && equipmentLoadoutRuntime.isReferenced(item);
    let presetBadge = presetProtected ? '<span class="equipment-preset-protected">세팅 보호</span>' : '';
    // 장비 칸 단순화: 카드에는 옵션을 나열하지 않고 이름/베이스/등급만 보여준다.
    // 전체 옵션은 호버 시 커스텀 툴팁(showItemTooltip)에서 확인한다.
    let explicitCount = typeof getItemExplicitOptionCount === 'function'
        ? getItemExplicitOptionCount(item)
        : ((item.stats || []).length + (item.chaosInfusion ? 1 : 0));
    let optionSummary = explicitCount > 0 ? `추가 옵션 ${explicitCount}` : '추가 옵션 없음';
    let metaChips = `<span class="equipment-meta-chip">${optionSummary}</span>`;
    if (triageResult) {
        let dpsSlot = triageResult.dpsSlot ? ` · ${String(triageResult.dpsSlot).replace(/[12]$/, '')} 교체 기준` : '';
        let ehpSlot = triageResult.ehpSlot ? ` · ${String(triageResult.ehpSlot).replace(/[12]$/, '')} 교체 기준` : '';
        if (triageResult.dpsGainPct >= 1) metaChips += `<span class="equipment-meta-chip equipment-triage-chip triage-damage" title="${escapeHTML(`현재 세팅${dpsSlot}`)}">공격 +${triageResult.dpsGainPct}%</span>`;
        if (triageResult.ehpGainPct >= 1) metaChips += `<span class="equipment-meta-chip equipment-triage-chip triage-defense" title="${escapeHTML(`현재 세팅${ehpSlot}`)}">생존 +${triageResult.ehpGainPct}%</span>`;
        if (triageResult.kind === 'keep') metaChips += '<span class="equipment-meta-chip equipment-triage-chip triage-keep">현 세팅 유지</span>';
        if (triageResult.special) metaChips += '<span class="equipment-meta-chip equipment-triage-chip triage-special">특수</span>';
    }
    let salvageTitle = presetProtected ? '장비 세팅 프리셋에서 제거한 뒤 해체할 수 있습니다.'
        : (typeof getItemSalvagePreviewText === 'function' ? getItemSalvagePreviewText(item, false) : '장비를 해체합니다.');
    let salvageDisabled = item.locked || presetProtected;
    let actions = '';
    if (mode === 'fossil') actions = `<div class="item-actions equipment-card-actions"><button class="equipment-card-primary" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">화석 대상</button><button class="${item.locked ? 'is-locked' : ''}" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button></div>`;
    else actions = `<div class="item-actions equipment-card-actions"><button class="equipment-card-primary" onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">선택</button><button onclick="event.stopPropagation(); equipItemById(${item.id})">장착</button><button class="${item.locked ? 'is-locked' : ''}" onclick="event.stopPropagation(); toggleItemLockById(${item.id})">${lockBtnLabel}</button><button class="equipment-card-danger" title="${salvageTitle}" onclick="event.stopPropagation(); salvageItemById(${item.id})" ${salvageDisabled ? 'disabled' : ''}>${presetProtected ? '보호됨' : '해체'}</button></div>`;
    let cardClick = `selectForCrafting(${item.id}, false)`;
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
    let rarityLabel = ({ normal: '일반', magic: '매직', rare: '레어', unique: '고유' })[item.rarity] || item.rarity || '일반';
    return `<div class="item-card equipment-item-card rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${sourceTone}" role="group" tabindex="0" data-item-tooltip-anchor="1" onclick="${cardClick}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${cardClick};}" onmouseenter="showItemTooltip(event, ${idx}, false)" onmousemove="showItemTooltip(event, ${idx}, false)" onmouseleave="hideItemTooltip(event)">
        ${typeof renderInventoryItemVisual === 'function' ? renderInventoryItemVisual(item, 'equipment', 'equipment-card-visual') : ''}
        <div class="equipment-card-main">
            <div class="equipment-card-topline"><span class="equipment-card-slot">${hi(typeof getItemSlotDisplayLabel === 'function' ? getItemSlotDisplayLabel(item) : item.slot)}</span>${presetBadge}<span class="equipment-card-rarity">${rarityLabel}</span>${lockIcon}</div>
            <div class="item-title equipment-card-name ${item.rarity}">${hi(item.name)}${exceptionalStars}${sourceBadge}${recordedTag}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}</div>
            <div class="item-base-line equipment-card-base">${hi(item.baseName)}</div>
            <div class="item-stats equipment-card-meta${triageResult ? ' has-triage' : ''}">${metaChips}</div>
        </div>
        ${actions}
    </div>`;
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
