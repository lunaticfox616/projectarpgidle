// Phase-2 extracted passive tree canvas draw block.

let passiveEffectLabelRects = [];
const PASSIVE_VOID_RANGES = Object.freeze([['andromeda', '#79cbbd'], ['asteroidBelt', '#dfbf79']]);

/** 반경이 있는 초월 공허(안드로메다 · 소행성대)의 범위를 트리 위 고리로 보여 준다. */
function syncPassiveVoidRanges(world) {
    const wanted = new Set();
    const radii = { andromeda: TRANSCENDENT_ANDROMEDA_RADIUS, asteroidBelt: TRANSCENDENT_ASTEROID_RADIUS };
    PASSIVE_VOID_RANGES.forEach(([id, color]) => passiveRouting.transcendentNodeIds(game, id).forEach(nodeId => {
        const node = PASSIVE_TREE.nodes[nodeId], key = `${nodeId}:${id}`;
        wanted.add(key);
        if (!node || Array.from(world.querySelectorAll('.passive-void-range')).some(range => range.dataset.rangeKey === key)) return;
        const radius = radii[id], el = document.createElement('div');
        el.className = 'passive-void-range';
        el.dataset.rangeKey = key;
        el.style.cssText = `left:${node.x}px;top:${node.y}px;width:${radius * 2}px;height:${radius * 2}px`;
        el.innerHTML = `<svg viewBox="${-radius} ${-radius} ${radius * 2} ${radius * 2}" aria-hidden="true"><circle r="${radius}" fill="${color}" fill-opacity=".06" stroke="${color}" stroke-width="1.3" stroke-opacity=".7" vector-effect="non-scaling-stroke"/></svg>`;
        world.prepend(el);
    }));
    world.querySelectorAll('.passive-void-range').forEach(el => {
        if (!wanted.has(el.dataset.rangeKey)) el.remove();
    });
}

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

/** 첫 스킬트리 안내(js/tutorial-ui.js)가 떠 있는 동안 지금 1포인트로 찍을 수 있는 노드마다 금빛 고리가 숨 쉰다 — 6~8px 노드는
 * 연결선 강조만으로 어디를 누를지 보이지 않았다(검토 2026-10-01). 고리는 CSS 겹판에 두어 캔버스를 매 프레임 다시 그리지 않고,
 * 겹판이 배율로 커지므로 크기를 배율로 나눠 화면에서 늘 같은 크기로 보인다. 안내 카드는 screenRect() 옆에 선다. */
const passiveTreeGuide = (() => {
    const RING_PX = 30;
    let active = false;
    let cache = { key: '', nodes: [] };
    /** Called once when the tree is first drawn with rings after show(true): only then do the nodes have screen positions. */
    let onDrawn = null;

    function nodes() {
        if (!active || !(game.passivePoints > 0)) return [];
        const key = `${(game.passives || []).length}|${[...reachableNodes].join(',')}`;
        if (cache.key === key) return cache.nodes;
        const ids = [...reachableNodes].filter(id => getPassiveActivationPath(id).length === 1);
        cache = { key, nodes: ids.map(id => PASSIVE_TREE.nodes[id]).filter(Boolean) };
        return cache.nodes;
    }

    function ringFor(world, node) {
        const found = [...world.querySelectorAll('.passive-guide-ring')].find(el => el.dataset.guideNode === node.id);
        if (found) return found;
        const el = document.createElement('div');
        el.className = 'passive-guide-ring';
        el.dataset.guideNode = node.id;
        world.appendChild(el);
        return el;
    }

    /** 고리를 지금 노드 · 배율에 맞춘다(syncPassiveTreeOverlay가 그릴 때마다 부른다). */
    function sync(world) {
        const list = nodes(), ids = new Set(list.map(node => node.id));
        world.querySelectorAll('.passive-guide-ring').forEach(el => { if (!ids.has(el.dataset.guideNode)) el.remove(); });
        list.forEach(node => {
            const size = Math.max(RING_PX, getPassiveNodeVisualRadius(node) * 2 * camZoom + 14) / camZoom;
            ringFor(world, node).style.cssText = `left:${node.x - size / 2}px;top:${node.y - size / 2}px;width:${size}px;height:${size}px;--guide-px:${1 / camZoom}px`;
        });
    }

    /** 노드 둘레(고리 · 노드 중 큰 쪽)의 화면 사각형. 시작점은 아래 직업 이름까지 넣는다. */
    function nodeExtent(node, box, root) {
        const viewW = passiveCanvasMetrics.width || box.width, viewH = passiveCanvasMetrics.height || box.height;
        const x = box.left + (viewW / 2 + camX + node.x * camZoom) * box.width / viewW;
        const y = box.top + (viewH / 2 + camY + node.y * camZoom) * box.height / viewH;
        const r = Math.max(RING_PX / 2, getPassiveNodeVisualRadius(node) * camZoom) + 6;
        return { left: x - r, top: y - r, right: x + r, bottom: y + r + (node === root ? 22 : 0) };
    }

    /** 고리 노드와 시작점을 감싸는 화면 사각형. 캔버스 밖으로 밀려났으면 null. */
    function screenRect() {
        const list = nodes(), canvas = document.getElementById('tree-canvas'), root = getPassiveTreeRootNode();
        if (!list.length || !canvas) return null;
        const box = canvas.getBoundingClientRect();
        const extents = [...list, root].filter(Boolean).map(node => nodeExtent(node, box, root));
        const left = Math.min(...extents.map(e => e.left)), top = Math.min(...extents.map(e => e.top));
        const right = Math.max(...extents.map(e => e.right)), bottom = Math.max(...extents.map(e => e.bottom));
        const inside = left >= box.left && top >= box.top && right <= box.right && bottom <= box.bottom;
        return inside ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
    }

    /** syncPassiveTreeOverlay가 트리를 그릴 때마다 부른다. 켠 뒤 카메라가 맞춰진 트리에 고리가 처음 보이면 알린다(안내 카드가 노드
     * 옆으로 간다) — 탭을 열면 카메라를 맞추기(40ms 뒤) 전에 한 번 그려질 수 있다. */
    function drawn(world) {
        sync(world);
        if (!onDrawn || !passiveCameraInitialized || !screenRect()) return;
        const notify = onDrawn;
        onDrawn = null;
        notify();
    }

    /** @param {boolean} on @param {Function} [whenDrawn] once the rings are on a drawn tree */
    function show(on, whenDrawn) {
        active = !!on;
        onDrawn = active && whenDrawn ? whenDrawn : null;
        const parts = ensurePassiveTreeOverlay();
        if (parts) sync(parts.world);
    }

    return Object.freeze({ show, drawn, screenRect });
})();
safeExposeGlobals({ passiveTreeGuide });

/** The CSS hover ring of one node (overlay world units: grows with the zoom like the canvas). */
function syncPassiveHoverRing(world, node, hoverCurrent, wanted) {
    const key = `node:${node.id}`;
    wanted.add(key);
    let el = world.querySelector(`[data-passive-overlay-key="${key}"]`);
    if (!el) {
        el = document.createElement('div');
        el.className = 'passive-overlay-node';
        el.dataset.passiveOverlayKey = key;
        world.appendChild(el);
    }
    const size = Math.max(1, (getPassiveNodeVisualRadius(node) + (hoverCurrent ? 9 : 7.5)) * 2);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.setProperty('--passive-ring-alpha', String(Math.max(0.35, getNodeRevealAmount(node))));
    el.classList.toggle('hover-current', hoverCurrent);
    el.classList.toggle('hover-linked', !hoverCurrent);
}

function syncPassiveTreeOverlay(displayWidth, displayHeight, visibleNodes, hoveredLinkedIds, hoveredPathNodeIds) {
    const parts = updatePassiveTreeOverlayTransform(displayWidth, displayHeight);
    if (!parts) return;
    const world = parts.world;
    syncPassiveVoidRanges(world);
    passiveTreeGuide.drawn(world);
    const wanted = new Set();
    if (hoverNode) visibleNodes.forEach(node => {
        if (getPassiveVisibility(node.id) === 'hidden' || isPassiveImageSlotNode(node)) return;
        const hoverCurrent = hoverNode.id === node.id;
        if (hoverCurrent || hoveredLinkedIds.has(node.id) || hoveredPathNodeIds.has(node.id)) syncPassiveHoverRing(world, node, hoverCurrent, wanted);
    });
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
        ctx.font = `${fontSize}px 'Galmuri11', 'Malgun Gothic', sans-serif`;
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
        gemLevel: '룬레벨', suppCap: '보조스킬룬한도', expGain: '경험치',
        fireGemLevel: '화염룬레벨', coldGemLevel: '냉기룬레벨', lightGemLevel: '번개룬레벨', chaosGemLevel: '카오스룬레벨', physGemLevel: '물리룬레벨',
        projectileGemLevel: '투사체룬레벨', meleeGemLevel: '근접룬레벨', slamGemLevel: '강타룬레벨', spellGemLevel: '주문룬레벨', dotGemLevel: '지속룬레벨', aoeGemLevel: '범위룬레벨', elementalGemLevel: '원소룬레벨',
        strGemLevel: '힘룬레벨', dexGemLevel: '민첩룬레벨', intGemLevel: '지능룬레벨', runeResonancePower: '공명력'
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
    if (game.settings.passiveTreeShowLabels === false) return;
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
    ctx.font = `${fontSize}px 'Galmuri11', 'Malgun Gothic', sans-serif`;
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

/** The nodes a hover would allocate (tooltip cost, "이 노드까지 할당 시" preview, drawn path). An Andromeda free node is itself alone, at one point
 * (js/passives.js getPassiveActivationPath): the tooltip counted the way to the nearest owned node (2026-10-20 review: "9포인트 필요"
 * for a node taken at one point). */
function getHoverAllocationNodeIds(hoveredNodeId) {
    if (hoveredNodeId && passiveRouting.freeNodes(PASSIVE_TREE, game).has(String(hoveredNodeId))) return new Set([hoveredNodeId]);
    return getHoveredPassivePathNodeIds(hoveredNodeId);
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

function getHoveredPassiveLinkedIds(hoverId) {
    const ids = new Set();
    if (!hoverId) return ids;
    ids.add(hoverId);
    (passiveRenderCache.edges || []).forEach(edge => {
        if (edge.from === hoverId) ids.add(edge.to);
        else if (edge.to === hoverId) ids.add(edge.from);
    });
    return ids;
}

function createPassiveDrawFrame() {
    const hoverId = hoverNode && hoverNode.id ? hoverNode.id : null;
    const allocated = new Set(game.passives || []);
    return {
        hoverId,
        allocated,
        isActive: id => allocated.has(id),
        blackHoles: new Set(passiveRouting.transcendentNodeIds(game, 'blackHole')),
        linkedIds: getHoveredPassiveLinkedIds(hoverId),
        pathIds: getHoverAllocationNodeIds(hoverId),
        rootId: getPassiveTreeRootNodeId()
    };
}

function getPassiveHoverLinkLayer(a, b, frame) {
    if (a.id === frame.hoverId || b.id === frame.hoverId) return 'hover';
    if (frame.pathIds.has(a.id) && frame.pathIds.has(b.id)) return 'path';
    if (frame.linkedIds.has(a.id) && frame.linkedIds.has(b.id)) return 'chain';
    return null;
}

function getPassiveNodeSearchLook(node) {
    const search = typeof getPassiveNodeSearchMatch === 'function' ? getPassiveNodeSearchMatch(node) : null;
    if (!search || !search.active) return { dimmed: false, searchHit: false };
    return { dimmed: !search.matches, searchHit: !!search.matches };
}

function getPassiveNodeLook(node, frame) {
    const look = getPassiveNodeSearchLook(node);
    look.active = frame.allocated.has(node.id);
    look.reachable = reachableNodes.has(node.id);
    look.anchor = frame.blackHoles.has(node.id);
    look.alpha = getNodeRevealAmount(node) * (look.dimmed ? 0.28 : 1);
    look.radius = getPassiveNodeVisualRadius(node);
    return look;
}

/** 블랙홀 초월 공허: 시작점 없이도 길이 이어지는 연결 거점이라 점선 고리로 표시한다. */
function drawPassiveNodeStatusRing(ctx, node, look) {
    if (look.dimmed || !look.anchor) return;
    ctx.save();
    ctx.globalAlpha = look.alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, look.radius + 9, 0, Math.PI * 2);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(188,132,255,0.95)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
}

/** Every node in full at every zoom: its cached picture (js/canvas-passive-tree-art.js). Returns the nodes that also need a label,
 * a search ring or an anchor mark, drawn after the pictures (drawPassiveNodeExtras). */
function drawPassiveTreeNodes(ctx, nodes, frame, dpr) {
    const extras = [];
    nodes.forEach(node => {
        const visibility = getPassiveVisibility(node.id);
        if (visibility === 'hidden') return;
        const look = getPassiveNodeLook(node, frame);
        passiveTreeArt.drawNode(ctx, node, look, frame, dpr);
        if (look.anchor || look.searchHit || (!look.dimmed && camZoom >= PASSIVE_EFFECT_LABEL_MIN_ZOOM)) extras.push({ node, look, visibility });
    });
    ctx.globalAlpha = 1;
    return extras;
}

function drawPassiveNodeExtras(ctx, extras) {
    extras.forEach(({ node, look, visibility }) => {
        drawPassiveNodeStatusRing(ctx, node, look);
        if (!look.dimmed) drawPassiveNodeEffectLabel(ctx, node, look.radius, look.active, look.reachable, visibility);
        if (look.searchHit) drawPassiveSearchHighlight(ctx, node, look.radius, getPassiveStatAccent(node.stat));
    });
}

// Far views paint every node once into a bitmap of the tree at the current zoom and move it as one picture while the camera pans; it is
// painted again when the zoom, allocations, search or loaded art change. Above this zoom few nodes are in view and they draw one by one.
// The bitmap is skipped past PASSIVE_NODE_LAYER_MAX_PX a side (phones at high pixel ratio) to keep memory small.
const PASSIVE_NODE_LAYER_MAX_ZOOM = 0.34;
const PASSIVE_NODE_LAYER_MAX_PX = 2600;
let passiveNodeLayer = { key: '', canvas: null, extras: [], boundsFor: null, bounds: null };

function getPassiveTreeBounds() {
    if (passiveNodeLayer.boundsFor === passiveRenderCache.nodes) return passiveNodeLayer.bounds;
    const xs = passiveRenderCache.nodes.map(node => node.x), ys = passiveRenderCache.nodes.map(node => node.y);
    const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    passiveNodeLayer = { ...passiveNodeLayer, key: '', boundsFor: passiveRenderCache.nodes, bounds };
    return bounds;
}

function getPassiveNodeLayerKey(frame, dpr) {
    const search = getPassiveTreeSearchState();
    const art = ['passiveTreeIcons', 'passiveTreeNotableIcons', 'passiveTreeKeystoneIcons', 'passiveTreeFrames']
        .map(key => (getPassiveTreeArtImage(key) ? 1 : 0)).join('');
    return [camZoom, dpr, passiveRenderCache.stateSignature, frame.rootId, search.search, search.filter, art].join('|');
}

/** The tree's node extent at this zoom, wide enough for the largest picture (a start medallion at its smallest on-screen size). */
function getPassiveNodeLayerRect(bounds) {
    const margin = Math.max(90, 16 / camZoom);
    return { minX: bounds.minX - margin, minY: bounds.minY - margin, width: bounds.maxX - bounds.minX + margin * 2, height: bounds.maxY - bounds.minY + margin * 2 };
}

function renderPassiveNodeLayer(frame, dpr, bounds, key) {
    const scale = camZoom * dpr, canvas = passiveNodeLayer.canvas || document.createElement('canvas');
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(bounds.height * scale);
    const layer = canvas.getContext('2d');
    layer.setTransform(scale, 0, 0, scale, -bounds.minX * scale, -bounds.minY * scale);
    const extras = drawPassiveTreeNodes(layer, passiveRenderCache.nodes, frame, dpr);
    passiveNodeLayer = { ...passiveNodeLayer, key, canvas, extras };
}

/** The nodes for this frame: the far-view bitmap when it fits, else each visible node. Returns the extras to draw on top. */
function drawPassiveNodesInView(ctx, visibleNodes, frame, dpr) {
    const bounds = getPassiveNodeLayerRect(getPassiveTreeBounds());
    const fits = camZoom <= PASSIVE_NODE_LAYER_MAX_ZOOM && passiveRevealBursts.length === 0
        && Math.max(bounds.width, bounds.height) * camZoom * dpr <= PASSIVE_NODE_LAYER_MAX_PX;
    if (!fits) return drawPassiveTreeNodes(ctx, visibleNodes, frame, dpr);
    const key = getPassiveNodeLayerKey(frame, dpr);
    if (passiveNodeLayer.key !== key) renderPassiveNodeLayer(frame, dpr, bounds, key);
    ctx.drawImage(passiveNodeLayer.canvas, bounds.minX, bounds.minY, bounds.width, bounds.height);
    return passiveNodeLayer.extras;
}

// Class names under the six starts keep the overview readable; the player's own class is gold.
function drawPassiveClassStartLabels(ctx, nodes, frame) {
    const starts = nodes.filter(node => node.kind === 'start' && node.title && getPassiveVisibility(node.id) !== 'hidden');
    if (!starts.length) return;
    ctx.save();
    ctx.font = `${13 / camZoom}px 'Galmuri11', 'Malgun Gothic', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 / camZoom;
    ctx.strokeStyle = 'rgba(5,4,4,0.92)';
    starts.forEach(node => {
        const y = node.y + getPassiveNodeVisualRadius(node) * 1.45 + 4 / camZoom;
        ctx.fillStyle = node.id === frame.rootId ? '#e9be67' : '#b3a283';
        ctx.strokeText(node.title, node.x, y);
        ctx.fillText(node.title, node.x, y);
    });
    ctx.restore();
}

function getPassiveCanvasSize(canvas) {
    return {
        dpr: Math.max(1, passiveCanvasMetrics.dpr || window.devicePixelRatio || 1),
        width: passiveCanvasMetrics.width || Math.max(1, canvas.clientWidth || 1),
        height: passiveCanvasMetrics.height || Math.max(1, canvas.clientHeight || 1)
    };
}

function drawPassiveTree() {
    cleanupPassiveBursts();
    ensurePassiveRenderCache();

    const canvas = document.getElementById('tree-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = getPassiveCanvasSize(canvas);

    // transform 누적 방지: 매 렌더 시작 시 setTransform으로 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

    const viewport = getPassiveWorldViewport(size.width, size.height);
    const visibleNodes = passiveRenderCache.nodes.filter(node => isNodeInViewport(node, viewport, 120));
    passiveTreeArt.drawBackdrop(ctx, size.width, size.height);

    ctx.save();
    // setTransform 이후 카메라 zoom/translate 적용
    ctx.translate(size.width / 2 + camX, size.height / 2 + camY);
    ctx.scale(camZoom, camZoom);
    const frame = createPassiveDrawFrame();
    passiveTreeArt.drawGround(ctx);
    passiveTreeArt.drawMotifs(ctx, viewport);
    passiveTreeArt.drawLinks(ctx, frame);
    // 노드 효과 라벨은 화면 좌표상 서로 겹치지 않는 것만 그린다.
    passiveEffectLabelRects = [];
    drawPassiveNodeExtras(ctx, drawPassiveNodesInView(ctx, visibleNodes, frame, size.dpr));
    drawPassiveClassStartLabels(ctx, visibleNodes, frame);
    ctx.restore();

    // reachable/hover rings are maintained in the CSS overlay.
    syncPassiveTreeOverlay(size.width, size.height, visibleNodes, frame.linkedIds, frame.pathIds);
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
        atlasLate: { badgeClass: 'item-source-badge item-source-badge--atlas-late', toneClass: 'item-source-tone--atlas-late', label: '아틀라스 한정' },
        seasonBoss: { badgeClass: 'item-source-badge item-source-badge--root-boss', toneClass: 'item-source-tone--root-boss', label: '보스 한정' },
        skyTower: { badgeClass: 'item-source-badge item-source-badge--sky-tower', toneClass: 'item-source-tone--sky-tower', label: '창공의 탑 한정' },
        colony: { badgeClass: 'item-source-badge item-source-badge--colony', toneClass: 'item-source-tone--colony', label: '군락지 한정' },
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

/** 장착 칸 이름: 칸이 좁아(약 68px) "마법의 녹…"처럼 등급 수식어만 남았다 — 등급은 글자색이 말해 주니 바탕 이름을 쓴다.
 * 고유 · 특수 이름 장비는 그 이름이 곧 정체라 그대로(전체 이름은 title과 툴팁). */
function paperdollItemLabel(item) {
    if (item.rarity === 'unique' || !item.baseName) return item.name || item.baseName || '장비';
    return item.baseName;
}

/** 세 번째 반지 칸(초월 공허 '세 번째 손가락')이 열려 있는가. */
const isThirdRingOpen = () => typeof getTranscendentVoidPassiveCount === 'function' && getTranscendentVoidPassiveCount('thirdFinger', game) > 0;
/** 세 번째 손가락이 없는데 세 번째 반지 칸에 남은 반지: 흐리게(효과가 꺼져 있다, js/combat-equipment-stats.js). */
const thirdRingOffClass = slot => (slot === '반지3' && !isThirdRingOpen() ? ' is-off' : '');
/** 장착 칸 목록: 세 번째 반지 칸은 세 번째 손가락이 있을 때, 또는 그 칸에 반지가 남아 있을 때만(꺼진 채, 두 번 눌러 뺀다). */
function getPaperdollSlots(equipment = game.equipment) {
    const slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
    return isThirdRingOpen() || (equipment || {})['반지3'] ? [...slots, '반지3'] : slots;
}
/** 장착 칸을 그리고 배치를 고른다(css/equipment-window.css): 세 번째 반지는 코어 칸이 없으면 그 자리, 코어가 있으면 신발 아래 줄. */
function setPaperdollHtml(targetId, html) {
    const list = document.getElementById(targetId);
    writeHtmlIfChanged(list, html);
    list.classList.toggle('has-ring3', !!list.querySelector('.slot-반지3'));
    list.classList.toggle('has-core', !!list.querySelector('.slot-코어'));
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
    getPaperdollSlots().forEach(slot => {
        let item = game.equipment[slot];
        let displaySlot = getItemSlotDisplayLabel(null, slot.replace(/[123]$/, ''));
        let selected = isCraftSelectionEquipAvailableLocal() && getCraftSelectionRefLocal() === slot;
        if (item) {
            let click = forCrafting
                ? `selectForCrafting('${slot}', true)`
                : `equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')`;
            let doubleClick = `event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}', ${forCrafting ? 'true' : 'false'})`;
            // 장비창 장착 칸에는 단추가 없다(2026-10-10 개편): 빼기는 두 번 누르기, 끌어 놓기, 선택한 장비의 단추.
            let footer = forCrafting
                ? `<button class="equipment-slot-action" onclick="event.stopPropagation(); selectForCrafting('${slot}', true)">제작 선택</button>`
                : '';
            let sourceMeta = getDropOnlyItemSourceMeta(item);
            let sourceTone = (sourceMeta ? sourceMeta.toneClass : '') + thirdRingOffClass(slot);
            let preview = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${slot}', true)`;
            html += `<div class="slot-box equipment-slot slot-${slot} rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${sourceTone}${itemInfluencesUi.influenceClasses(item)}" style="${itemInfluencesUi.influenceStyle(item)}" data-slot="${slot}" data-item-tooltip-anchor="1" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
                <div class="equipment-slot-head"><span>${displaySlot}</span>${equipmentSocketsUi.pipsHtml(item)}</div><div class="equipment-slot-visual"><img src="${getEquipmentGridVisualAsset(item)}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="item-title equipment-slot-name ${item.rarity}" title="${escapeHTML(item.name)}">${hi(paperdollItemLabel(item))}</div>
                ${footer}
            </div>`;
        } else {
            let emptyClick = forCrafting ? '' : ` onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"`;
            html += `<div class="slot-box equipment-slot equipment-slot-empty slot-${slot}" data-slot="${slot}"${emptyClick}>
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual empty"><img src="${getEquipmentGridVisualAsset({ slot: slot.replace(/[123]$/, ''), baseId: `empty-${slot}` })}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="equipment-empty-mark">＋</div>
                <div class="equipment-empty-label">비어 있음</div>
            </div>`;
        }
    });
    if (targetId === 'ui-equip-list') html += coreItemsUi.slotHtml() + colonyWardsUi.slotsHtml();
    setPaperdollHtml(targetId, html);
    if (targetId === 'ui-equip-list') equipmentAuxUi.render();
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
    let rarityLabel = ITEM_RARITY_LABELS[item.rarity] || ITEM_RARITY_LABELS.normal;
    // Opus 4차 검수: 비교 수치를 먼저 한 개만 표시. 잠금·세팅·특수와 다른 비교 수치는 툴팁/ARIA에 남긴다.
    const gains = triageResult ? [[triageResult.dpsGainPct, 'atk', '공격'], [triageResult.ehpGainPct, 'def', '생존']].filter(row => row[0] >= 1) : [];
    const status = item.locked ? '잠금' : presetProtected ? '장비 세팅에 포함' : '';
    const gain = gains[0];
    const badges = gain ? `<span class="is-${gain[1]}" title="${gain[2]} +${gain[0]}%">+${Math.round(gain[0])}%</span>`
        : status ? `<span title="${status}">${item.locked ? '잠금' : '세팅'}</span>` : '';
    const details = [item.locked && '잠금', presetProtected && '장비 세팅에 포함', triageResult && triageResult.special && '특수 효과',
        ...gains.map(row => `${row[2]} +${row[0]}%`)].filter(Boolean).join(', ');
    let label = [`${rarityLabel} ${item.name || item.baseName || '장비'}`, getItemSlotDisplayLabel(item), `${footprint.columns}×${footprint.rows}`, details].filter(Boolean).join(', ');
    let preview = `if(window.matchMedia('(hover: hover)').matches&&!equipmentInventoryInteraction.isCarrying())showItemTooltip(event,${idx},false)`;
    return `<button type="button" class="equipment-grid-item rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${carried ? 'is-carried' : ''} ${filterClass} ${sourceMeta ? sourceMeta.toneClass : ''}${itemInfluencesUi.influenceClasses(item)}"
        style="grid-column:${footprint.column + 1}/span ${footprint.columns};grid-row:${footprint.row + 1}/span ${footprint.rows};--item-grid-columns:${footprint.columns};--item-grid-rows:${footprint.rows};${itemInfluencesUi.influenceStyle(item)}" data-equipment-grid-key="${escapeHTML(itemKey)}"
        aria-pressed="${selected ? 'true' : 'false'}" aria-label="${escapeHTML(label)}"
        onclick="equipmentInventoryInteraction.handleItemClick(event,this.dataset.equipmentGridKey,${idx})"
        ondblclick="equipmentInventoryInteraction.handleItemDoubleClick(event,this.dataset.equipmentGridKey,${item.id})"
        onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
        <img class="equipment-grid-item-art" src="${asset}" alt="" aria-hidden="true" draggable="false">${equipmentWindowUi.newDotHtml(item)}
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
            cells.push(`<button type="button" tabindex="-1" class="equipment-grid-cell${hiddenClass}" style="grid-column:${column + 1};grid-row:${row + 1};" data-grid-column="${column}" data-grid-row="${row}" aria-label="${column + 1}열 ${row + 1}행으로 이동" onclick="equipmentInventoryInteraction.moveFocusedTo(event,${column},${row})"></button>`);
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

function renderEquipmentInspectorActions(item, slot, presetProtected) {
    let primaryAction = slot ? `equipmentInventoryInteraction.focus(null);unequipItem('${slot}')` : `equipmentInventoryInteraction.cancelCarry();equipItemById(${item.id})`;
    let craftAction = slot ? `equipmentInventoryInteraction.focus(null);switchItemSubtab('item-tab-craft');selectForCrafting('${slot}',true)` : `equipmentInventoryInteraction.focus(null);craftSelectInventoryItemById(${item.id})`;
    // 단추 줄(2026-10-10 개편): 장착, 잠금, 제작실, 해체, 그다음 주입, 소켓, 기름. 주얼, 코어, 액막이는 제작실부터 받지 않는다(js/bag-items.js).
    let craft = !bagItems.isSpecial(item) && contentProgression.canOpen('item-tab-craft') ? `<button data-content-action="craft" onclick="${craftAction}"><span class="px-center">제작실</span></button>` : '';
    let tools = bagItems.isSpecial(item) ? '' : `${chaosInfusionUi.actionHtml(item, slot)}${equipmentSocketsUi.actionHtml(item, slot)}${gardenOilsUi.actionHtml(item, slot)}`;
    return `<button class="equipment-card-primary" onclick="${primaryAction}"><span class="px-center">${slot ? '장착 해제' : bagItems.isJewel(item) ? '끼우기' : '장착'}</span></button>
        ${slot ? craft : renderEquipmentInventoryProtectionActions(item, presetProtected, craft)}${tools}`;
}

function renderEquipmentInventoryProtectionActions(item, presetProtected, middle = '') {
    let salvageTitle = presetProtected ? '장비 세팅 프리셋에서 제거한 뒤 해체할 수 있습니다.' : '장비를 해체합니다.';
    return `<button class="${item.locked ? 'is-locked' : ''}" onclick="toggleItemLockById(${item.id})"><span class="px-center">${item.locked ? '잠금해제' : '잠금'}</span></button>${middle}
        <button class="equipment-card-danger" title="${salvageTitle}" onclick="equipmentInventoryInteraction.cancelCarry();salvageItemById(${item.id})" ${item.locked || presetProtected ? 'disabled' : ''}><span class="px-center">${presetProtected ? '보호됨' : '해체'}</span></button>`;
}

function renderEquipmentInventoryInspector(rows) {
    equipmentInspectionUi.decorateLoadout();
    let root = document.getElementById('ui-equipment-inventory-inspector');
    if (!root) return;
    let visibleItems = (Array.isArray(rows) ? rows : []).map(row => row.item).filter(Boolean);
    let focusedKey = equipmentInventoryInteraction.getFocusedKey();
    let slot = equipmentInventoryInteraction.getFocusedEquipmentSlot();
    let item = slot ? game.equipment[slot] : visibleItems.find(row => equipmentInventoryGridRuntime.getItemKey(row) === focusedKey);
    if (item && equipmentInventoryGridRuntime.getItemKey(item) !== focusedKey) item = null;
    if (!item) {
        equipmentInventoryInteraction.setFocusedKey(null);
        let message = visibleItems.length ? '가방에서 장비를 고르면 여기서 비교합니다.' : '표시할 장비가 없습니다.';
        let emptyHtml = equipmentWindowUi.emptyHtml(message);
        if (root.__lastHtml !== emptyHtml) root.innerHTML = root.__lastHtml = emptyHtml;
        return;
    }
    equipmentInventoryInteraction.setFocusedKey(equipmentInventoryGridRuntime.getItemKey(item));
    let presetProtected = typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item);
    let flags = [presetProtected ? '세팅 보호' : '', item.locked ? '잠금' : ''].filter(Boolean).join(', ');
    // 선택한 장비(2026-10-10 개편, js/equipment-window-ui.js): 그림과 이름, 지금 장착, 바꾸면 증감표, 단추, 툴팁.
    let html = equipmentWindowUi.inspectorHtml(item, slot, renderEquipmentInspectorActions(item, slot, presetProtected), flags);
    equipmentInspectionUi.render(root, item, slot, html);
    equipmentInventoryInteraction.positionInspector();
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
    let lockIcon = item.locked ? ' (잠금)' : '';
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
        let dpsSlot = triageResult.dpsSlot ? `, ${String(triageResult.dpsSlot).replace(/[12]$/, '')} 교체 기준` : '';
        let ehpSlot = triageResult.ehpSlot ? `, ${String(triageResult.ehpSlot).replace(/[12]$/, '')} 교체 기준` : '';
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
    let rarityLabel = ITEM_RARITY_LABELS[item.rarity] || item.rarity || ITEM_RARITY_LABELS.normal;
    return `<div class="item-card equipment-item-card rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${sourceTone}${itemInfluencesUi.influenceClasses(item)}" style="${itemInfluencesUi.influenceStyle(item)}" role="group" tabindex="0" data-item-tooltip-anchor="1" onclick="${cardClick}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${cardClick};}" onmouseenter="showItemTooltip(event, ${idx}, false)" onmousemove="showItemTooltip(event, ${idx}, false)" onmouseleave="hideItemTooltip(event)">
        ${typeof renderInventoryItemVisual === 'function' ? renderInventoryItemVisual(item, 'equipment', 'equipment-card-visual') : ''}
        <div class="equipment-card-main">
            <div class="equipment-card-topline"><span class="equipment-card-slot">${hi(typeof getItemSlotDisplayLabel === 'function' ? getItemSlotDisplayLabel(item) : item.slot)}</span>${presetBadge}<span class="equipment-card-rarity">${rarityLabel}</span>${lockIcon}</div>
            <div class="item-title equipment-card-name ${item.rarity}">${hi(item.name)}${exceptionalStars}${sourceBadge}${recordedTag}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}${craftingWorkspaceUi.imprintMark(item)}</div>
            ${itemInfluencesUi.tagsHtml(item)}<div class="item-base-line equipment-card-base">${hi(item.baseName)}</div>
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
