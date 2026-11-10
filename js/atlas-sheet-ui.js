/** 세계수 아틀라스 "한 장" 시험판(2026-11-10 사용자: 지도 탭과 아틀라스 구성 개선 프로토타입): 아틀라스 지도의 원화와 표식(data/world-map.js atlas,
 * js/world-map-ui.js atlasIcon) 위에서 바로 고르고 연다. 원화 위에 길과 지도석 노드, 아래 도크에 고른 노드와 각인 홈과 열기, 오른쪽 서랍에 고른
 * 지도석과 보관함. 규칙과 저장은 그대로이고(js/atlas.js), 고르기와 열기는 js/atlas-ui.js의 것을 부른다. 테스트 패널에서 끌 수 있다
 * (settings.atlasSheet === 'off'). 돌아와서 처음 보는 완료는 한 번 밝혀진다: 새 길이 그어지고, 새로 열린 곳과 수호자의 봉인, 새 씨앗이 빛난다. */
const atlasSheetUi = (() => {
    const on = () => !!game.settings && game.settings.atlasSheet !== 'off';
    const anchorOf = id => WORLD_MAP.atlas.regions.find(row => row.id === id);
    /** 원화 위의 자리(백분율): 권역의 칸 0~8과 수호자(칸 9), 정점. */
    function place(node) {
        const [x, y] = node.kind === 'pinnacle' ? WORLD_MAP.atlas.pinnacle : anchorOf(node.region).nodes[node.slot];
        return { x, y };
    }
    const done = id => ['complete', 'bonus'].includes(atlas.status(game, id));
    function linkState(a, b) {
        if (done(a) && done(b)) return 'done';
        return (done(a) || done(b)) && atlas.reachable(game, a) && atlas.reachable(game, b) ? 'lit' : 'dim';
    }
    const tintOf = node => (ATLAS.regions.find(row => row.id === node.region) || { tint: '#6f5a86' }).tint;

    // ---------------------------------------------------------------- 처음 보는 완료(이 접속 동안만 기억한다. 저장에는 아무것도 남기지 않는다)
    let seen = null, fresh = { done: new Set(), open: new Set(), seeds: 0, at: 0 };
    const openIds = () => atlas.nodes.filter(node => atlas.status(game, node.id) === 'open').map(node => node.id);
    /** 그리기 전에 한 번: 지난번에 본 것과 견주어 새 완료, 새로 열린 곳, 새 씨앗을 가려 둔다. 다른 저장을 불러왔거나 처음 열 때는 조용히 지금을 기억한다. */
    function noteFresh() {
        const st = game.atlas, now = { owner: st, done: new Set(st.completed), open: new Set(openIds()), seeds: st.seeds };
        const same = seen && seen.owner === st;
        const newly = key => new Set(same ? [...now[key]].filter(id => !seen[key].has(id)) : []);
        const found = { done: newly('done'), open: newly('open'), seeds: same ? Math.max(0, now.seeds - seen.seeds) : 0, at: Date.now() };
        seen = now;
        if (!found.done.size && !found.seeds) return; // 열린 곳만 달라진 것(입장권)은 밝히지 않는다
        fresh = found;
        playUiFeedbackSound('uiConfirm');
    }
    const REVEAL_MS = 900;
    const revealing = () => Date.now() - fresh.at < REVEAL_MS + 600;

    // ---------------------------------------------------------------- 길: 원화 위의 선(걸은 길은 금빛, 다음 길은 수액빛, 나머지는 어두운 점선)
    const ROAD = { done: '#f3d28c', lit: '#b7f08a', dim: '#1c1626' };
    function strokeRoad(c, ends, state, share) {
        const [from, to] = ends;
        c.strokeStyle = ROAD[state];
        c.globalAlpha = state === 'dim' ? 0.55 : 1;
        c.lineWidth = state === 'dim' ? 1 : 2;
        c.setLineDash(state === 'dim' ? [2, 4] : []);
        c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share); c.stroke();
    }
    /** 새로 깬 노드에 닿은 길은 그 노드에서부터 자란다(progress 0~1). */
    function paintRoad(c, at, [a, b], progress) {
        const state = linkState(a, b), grows = state !== 'dim' && (fresh.done.has(a) || fresh.done.has(b)) && progress < 1;
        const ends = fresh.done.has(b) && !fresh.done.has(a) ? [at(b), at(a)] : [at(a), at(b)];
        if (grows) strokeRoad(c, ends, 'dim', 1);
        strokeRoad(c, ends, state, grows ? progress : 1);
    }
    function paintRoads(canvas, progress) {
        const w = canvas.width, h = canvas.height, c = canvas.getContext('2d');
        const at = id => { const p = place(atlas.node(id)); return { x: Math.round(p.x / 100 * w), y: Math.round(p.y / 100 * h) }; };
        c.clearRect(0, 0, w, h);
        for (const state of ['dim', 'lit', 'done']) for (const link of atlas.links) if (linkState(link[0], link[1]) === state) paintRoad(c, at, link, progress);
        c.globalAlpha = 1;
    }
    let frame = 0;
    function paint() {
        const box = document.querySelector('#ui-atlas .as-chart'), canvas = box && box.querySelector('.as-art');
        if (!canvas || !box.clientWidth) return;
        canvas.width = box.clientWidth; canvas.height = box.clientHeight;
        cancelAnimationFrame(frame);
        const growAtlasRoads = () => {
            const progress = Math.min(1, (Date.now() - fresh.at) / REVEAL_MS);
            if (!canvas.isConnected) return;
            paintRoads(canvas, progress);
            if (progress < 1) frame = requestAnimationFrame(growAtlasRoads);
        };
        growAtlasRoads();
    }

    // ---------------------------------------------------------------- 차트: 권역 이름표와 지도석 노드
    let lastTap = { id: '', at: 0 };
    /** 한 번 누르면 고르고, 같은 노드를 곧바로 한 번 더 누르면 그 노드의 지도석으로 연다(고를 때 화면을 다시 그려서 dblclick이 오지 않는다). */
    function tap(id) {
        const now = Date.now(), again = lastTap.id === id && now - lastTap.at < 450;
        lastTap = { id, at: now };
        if (again) atlasUi.openNode(id); else atlasUi.selectNode(id);
    }
    function nodeClasses(node, status, picked) {
        const held = game.atlas.stash.some(map => map.node === node.id), running = game.atlas.run && game.atlas.run.map.node === node.id, live = revealing();
        return ['as-node', `is-${status}`, `kind-${node.kind}`, node.id === picked ? 'is-selected' : '', running ? 'is-running' : '', held ? 'has-stone' : '',
            live && fresh.done.has(node.id) ? 'is-fresh' : '', live && fresh.open.has(node.id) ? 'is-unsealed' : ''].filter(Boolean).join(' ');
    }
    function nodeHtml(node, picked) {
        const at = place(node), status = atlas.status(game, node.id), tier = atlas.effectiveTier(game, node), tint = tintOf(node);
        const held = game.atlas.stash.filter(map => map.node === node.id).length;
        const icon = worldMapUi.atlasIcon(WORLD_MAP.atlas.icons[node.kind] ? node.kind : 'stone', tint, status === 'locked');
        return `<button class="${nodeClasses(node, status, picked)}" style="--x:${at.x}%;--y:${at.y}%;--tone:${atlas.tierBand(tier).tone};--tint:${tint}" data-atlas-node="${node.id}"
            data-info-tooltip-anchor="1" aria-pressed="${node.id === picked}" aria-label="${atlasUi.nodeLabel(node, tier, status)}" onclick="atlasSheetUi.tap('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><span class="as-stone" style="background-image:url('${icon}')">${node.kind === 'map' ? tier : ''}</span>`
            + `${held ? `<i>${held}</i>` : ''}${node.id === picked ? `<em>${escapeHTML(_t(node.name))}</em>` : ''}</button>`;
    }
    /** 이름표 자리: 원화의 자리(data/world-map.js atlas label)를 쓰되, 돌아가기 단추가 선 위쪽 가운데는 비킨다. */
    const TAG_AT = { canopy: [66, 7] };
    function regionTagHtml(region) {
        const nodes = atlas.nodes.filter(node => node.region === region.id), cleared = nodes.filter(node => game.atlas.completed.includes(node.id)).length, [x, y] = TAG_AT[region.id] || anchorOf(region.id).label;
        return `<span class="as-region" style="--x:${x}%;--y:${y}%;--tint:${region.tint}"><span>${escapeHTML(_t(region.name))}</span>`
            + `<i style="--fill:${Math.round(cleared / nodes.length * 100)}%"></i><b>${cleared}/${nodes.length}</b></span>`;
    }
    /** 세계 지도로 돌아가는 단추: 세계 지도에서 아틀라스 입구가 선 바로 그 자리(2026-11-10 사용자). 누르면 입구와 같은 전환이 거꾸로 돈다. */
    function homeHtml() {
        const at = worldMapUi.atlasEntranceSpot();
        return `<button type="button" class="as-home" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%" aria-label="${_t('세계 지도')}" data-tip="${_t('세계 지도')}"
            onclick="worldMapUi.turnToWorld(this)"><i aria-hidden="true" style="background-image:url('${worldMapUi.atlasIcon('tree', '#e2a94a')}')"></i></button>`;
    }
    function chartHtml(picked) {
        return `<div class="as-chart" role="group" aria-label="${_t('아틀라스 지도')}" style="aspect-ratio:${WORLD_MAP.width}/${WORLD_MAP.height};background-image:url('${WORLD_MAP.atlas.src}')">
            <canvas class="as-art" aria-hidden="true"></canvas>${homeHtml()}${ATLAS.regions.map(regionTagHtml).join('')}${atlas.nodes.map(node => nodeHtml(node, picked)).join('')}</div>`;
    }

    // ---------------------------------------------------------------- 윗줄: 세계 지도로, 진행 막대, 씨앗 칸, 포인트, 자동 지도
    /** 아틀라스의 모든 쪽이 쓰는 윗줄(js/atlas-ui.js render). chart: 지도 쪽을 그리는 중인가(처음 보는 완료는 지도 쪽에서만 밝힌다). */
    function top(chart) {
        if (chart) noteFresh();
        // 완료 수와 남은 포인트는 예전 머리줄과 같은 셈이다(js/atlas-ui.js headerHtml): 깨어난 아틀라스는 후반 싸움만큼 넓어진다.
        const st = game.atlas, total = atlas.nodes.length + (atlasEndgame.awakened(game) ? atlas.lateNodes.length : 0), points = atlas.points(game), free = atlasPassives.spendable(game);
        const firstNew = st.seeds - fresh.seeds, live = revealing();
        const seeds = Array.from({ length: ATLAS.seeds.max }, (_, i) => `<i class="${i < st.seeds ? 'is-on' : ''}${live && i >= firstNew && i < st.seeds ? ' is-fresh' : ''}"></i>`).join('');
        return `<header class="as-top"><span class="as-progress" style="--fill:${Math.round(st.completed.length / total * 100)}%"><b>${_t('완료')} ${st.completed.length}/${total}</b></span>
            <span class="as-seeds" aria-label="${_t('씨앗')} ${st.seeds}/${ATLAS.seeds.max}">${_t('씨앗')}${seeds}</span>
            <span class="as-points">${_t('보너스')} <b>${st.bonus.length}</b></span><span class="as-points">${_t('포인트')} <b>${points}</b>${free > 0 ? ` <em>+${free}</em>` : ''}</span>
            <label class="as-auto"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${_t('자동 지도')}</span></label></header>`;
    }

    // ---------------------------------------------------------------- 아래 도크: 고른 노드, 각인 홈(가진 것만), 열기
    const terrainOf = node => (ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || '';
    function nodeInfoHtml(picked) {
        const node = atlas.node(picked);
        if (!node) return `<div class="as-info"><p class="atlas-muted">${_t('노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.')}</p></div>`;
        const tier = atlas.effectiveTier(game, node), status = atlas.status(game, node.id), region = ATLAS.regions.find(row => row.id === node.region);
        const where = region ? _t(region.name) : _t('정점');
        const detail = status === 'locked' && node.kind !== 'pinnacle' ? '' : `<p>${_t('{tier}등급, {node}, 보스 {boss}', { tier, node: terrainOf(node), boss: escapeHTML(node.boss) })}</p>
            <p class="atlas-muted">${_t('장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당', { lootTier: atlas.lootTier(tier), equivalentDepth: atlas.equivalentDepth(tier) })}</p>`;
        return `<div class="as-info" style="--tint:${tintOf(node)};--tone:${atlas.tierBand(tier).tone}"><small>${escapeHTML(where)}</small><h3><b>${tier}</b>${escapeHTML(_t(node.name))}</h3>${detail}</div>`;
    }
    function fragmentsHtml() {
        const st = game.atlas, slots = atlas.slots(game);
        const owned = ATLAS.fragments.filter(fragment => st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
        const chips = owned.map(fragment => {
            const loaded = st.loadout.includes(fragment.id);
            return `<button class="as-fragment${loaded ? ' is-on' : ''}" aria-pressed="${loaded}" onclick="atlasUi.toggleFragment('${fragment.id}')"><span>${_t(fragment.name)}</span><small>${st.fragments[fragment.id] || 0}</small></button>`;
        }).join('');
        const holes = Array.from({ length: slots }, (_, i) => `<i class="${i < st.loadout.length ? 'is-on' : ''}"></i>`).join('');
        return `<div class="as-fragments"><p>${_t('각인 홈')} ${holes}</p><div>${chips || `<span class="atlas-muted">${_t('가진 각인이 없습니다.')}</span>`}</div></div>`;
    }
    const departHtml = (label, action, reason) => `${reason ? `<small>${escapeHTML(reason)}</small>` : ''}<button class="atlas-primary" data-exploration-departure onclick="${action}" ${reason ? 'disabled' : ''}>${_t(label)}</button>`;
    function stoneGoHtml(map, lock) {
        return `<span class="as-loaded rarity-${map.rarity}" style="--tone:${atlas.tierBand(map.tier).tone}"><b>${map.tier}</b>${_t(ATLAS.rarities[map.rarity].name)}</span>${departHtml('지도 열기', 'atlasUi.open()', lock)}`;
    }
    /** 도크 오른쪽: 열린 지도로 돌아가기, 정점 열기, 고른 지도석으로 열기, 고른 것이 없으면 무엇을 고를지. */
    function goHtml(parts) {
        const st = game.atlas, node = atlas.node(parts.node), map = st.stash.find(entry => entry.uid === parts.uid);
        let body = `<small>${st.stash.length ? _t('보관함이나 노드에서 지도석을 고르세요.') : _t('지도석이 없습니다.')}</small><button class="atlas-primary" disabled>${_t('지도 열기')}</button>`;
        if (st.run) body = departHtml('열린 지도로', 'atlasUi.reenter()', '');
        else if (node && node.kind === 'pinnacle') body = departHtml('정점 열기', 'atlasUi.openPinnacle()', atlas.pinnacleReason(game) || parts.block);
        else if (map) body = stoneGoHtml(map, parts.lock);
        return `<div class="as-go">${body}</div>`;
    }

    // ---------------------------------------------------------------- 오른쪽 서랍: 보관함(등급 색 지도석 칸), 고른 지도석(제작)
    function stoneHtml(map, parts) {
        const mine = !parts.node || map.node === parts.node, omen = map.omen && lootOmens.describe(map.omen);
        return `<button class="as-tile rarity-${map.rarity}${mine ? '' : ' is-other'}${map.corrupted ? ' is-corrupted' : ''}" style="--tone:${atlas.tierBand(map.tier).tone}" aria-pressed="${map.uid === parts.uid}"
            data-tip="${escapeHTML(parts.mapName(map))}" onclick="atlasUi.selectMap(${map.uid})"><b>${map.tier}</b>${omen ? `<i style="--omen:${omen.tone}"></i>` : ''}</button>`;
    }
    function drawerHtml(parts) {
        const maps = [...game.atlas.stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
        const tiles = maps.length ? `<div class="as-tiles">${maps.map(map => stoneHtml(map, parts)).join('')}</div>` : `<p class="atlas-muted">${_t('비어 있습니다. 보관함은 루프마다 비워집니다.')}</p>`;
        return `<aside class="as-drawer"><section class="as-stash"><h3>${_t('지도석 보관함')} <span>${maps.length}/${ATLAS.stashCap}</span></h3>${tiles}${parts.tools}</section>${parts.side}${parts.after}</aside>`;
    }

    /** parts: js/atlas-ui.js가 건네는 고른 것과 이미 만든 조각들(node, uid, lock, block, side, tools, after, mapName). */
    function html(parts) {
        return `<div class="atlas-sheet"><div class="as-body">${chartHtml(parts.node)}${drawerHtml(parts)}</div>
            <footer class="as-dock">${nodeInfoHtml(parts.node)}${fragmentsHtml()}${goHtml(parts)}</footer></div>`;
    }
    /** 세계 지도의 아틀라스 입구에 붙는 말(js/world-map-ui.js): 진행과 준비된 지도석 수. */
    function entranceNote() {
        const st = game.atlas, total = atlas.nodes.length + (atlasEndgame.awakened(game) ? atlas.lateNodes.length : 0);
        return { progress: `${st.completed.length}/${total}`, stones: st.stash.length };
    }
    return Object.freeze({ on, html, top, paint, tap, entranceNote });
})();
safeExposeGlobals({ atlasSheetUi });
