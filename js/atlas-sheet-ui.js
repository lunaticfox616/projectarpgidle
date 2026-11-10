/** 세계수 아틀라스 "한 장" 시험판(2026-11-10 사용자: 지도 탭과 아틀라스 구성 개선 프로토타입): 다섯 지역을 한 대륙에 펴고(왼쪽 태양 계열,
 * 오른쪽 달 계열, 가운데 최초의 경계, 꼭대기 정점) 노드를 등급 색 지도석으로 그린다. 아래 도크에 고른 노드와 각인 홈과 열기, 오른쪽 서랍에
 * 고른 지도석과 보관함. 규칙과 저장은 그대로이고(js/atlas.js), 고르기와 열기는 js/atlas-ui.js의 것을 부른다. 테스트 패널에서 끌 수 있다
 * (settings.atlasSheet === 'off'). 노드의 방 안 좌표(atlas.position)는 그대로 두고 지역마다 놓는 자리와 방향만 정한다. */
const atlasSheetUi = (() => {
    const on = () => !!game.settings && game.settings.atlasSheet !== 'off';
    /** 지역이 놓이는 띠: 옆 지역은 바깥에서 가운데로(from → from + run), 가운데 지역은 아래에서 위로 자란다. spread는 갈래가 벌어지는 폭. */
    const FLOW = {
        garden: { from: 5, run: 31, across: 30, spread: 13, tag: [1, 1, 'left'] },
        roots: { from: 5, run: 31, across: 71, spread: 13, tag: [1, 99, 'left'] },
        canopy: { from: 95, run: -31, across: 30, spread: 13, tag: [99, 1, 'right'] },
        sanctum: { from: 95, run: -31, across: 71, spread: 13, tag: [99, 99, 'right'] },
        trunk: { up: true, from: 87, run: -64, across: 50, spread: 6.5, tag: [50, 99.5, 'centre'] }
    };
    const PINNACLE_AT = { x: 50, y: 10 };
    /** 같은 노드는 늘 같은 만큼 흩어진다(이름에서 낸 수). */
    function scatter(id) {
        let h = 7;
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
        return { x: (h % 21 - 10) / 10, y: (Math.floor(h / 21) % 21 - 10) / 10 };
    }
    function place(node) {
        if (node.kind === 'pinnacle') return PINNACLE_AT;
        const local = atlas.position(node), along = (88 - local.y) / 80, side = (local.x - 50) / 28, flow = FLOW[node.region], off = scatter(node.id);
        const a = flow.from + along * flow.run, b = flow.across + side * flow.spread;
        return flow.up ? { x: b + off.x * 0.6, y: a + off.y } : { x: a + off.x, y: b + off.y };
    }
    const done = id => ['complete', 'bonus'].includes(atlas.status(game, id));
    function linkState(a, b) {
        if (done(a) && done(b)) return 'done';
        return (done(a) || done(b)) && atlas.reachable(game, a) && atlas.reachable(game, b) ? 'lit' : 'dim';
    }
    const tintOf = node => (ATLAS.regions.find(row => row.id === node.region) || { tint: '#d9b066' }).tint;
    const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
    const mix = (hex, base, share) => { const a = rgb(hex), b = rgb(base); return `rgb(${a.map((v, i) => Math.round(v * share + b[i] * (1 - share))).join(',')})`; };

    // ---------------------------------------------------------------- 그림: 땅과 길(도트, CSS 2px에 한 점)
    const ROAD = { done: '#d9b066', lit: '#9fd46a', dim: '#6a5638' };
    function paintLand(c, w, h, nodes) {
        // 지역마다 노드를 감싸는 둥근 땅 하나, 그 위에 노드 둘레의 밝은 자리
        for (const region of ATLAS.regions) {
            const spots = nodes.filter(node => node.region === region.id).map(place), xs = spots.map(p => p.x), ys = spots.map(p => p.y);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            c.fillStyle = mix(region.tint, '#120f0b', 0.2);
            c.beginPath(); c.ellipse(Math.round(cx / 100 * w), Math.round(cy / 100 * h), Math.round((Math.max(...xs) - Math.min(...xs) + 9) / 200 * w), Math.round((Math.max(...ys) - Math.min(...ys) + 13) / 200 * h), 0, 0, Math.PI * 2); c.fill();
        }
        for (const [share, radius] of [[0.2, 0.06], [0.3, 0.04]]) {
            for (const node of nodes) {
                const p = place(node);
                c.fillStyle = mix(tintOf(node), '#120f0b', share);
                c.beginPath(); c.arc(Math.round(p.x / 100 * w), Math.round(p.y / 100 * h), Math.round(w * radius * (node.kind === 'map' ? 1 : 1.25)), 0, Math.PI * 2); c.fill();
            }
        }
    }
    function paintRoad(pen, [a, b], state) {
        const { c, w, h } = pen;
        const from = place(atlas.node(a)), to = place(atlas.node(b)), bend = scatter(a + b);
        const x0 = from.x / 100 * w, y0 = from.y / 100 * h, x1 = to.x / 100 * w, y1 = to.y / 100 * h;
        const length = Math.hypot(x1 - x0, y1 - y0), mx = (x0 + x1) / 2 - (y1 - y0) / length * bend.x * 5, my = (y0 + y1) / 2 + (x1 - x0) / length * bend.x * 5;
        c.fillStyle = ROAD[state];
        const steps = Math.max(2, Math.round(length / (state === 'dim' ? 4 : 2)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, k = 1 - t;
            c.fillRect(Math.round(k * k * x0 + 2 * k * t * mx + t * t * x1), Math.round(k * k * y0 + 2 * k * t * my + t * t * y1), state === 'dim' ? 1 : 2, state === 'dim' ? 1 : 2);
        }
    }
    function paint() {
        const box = document.querySelector('#ui-atlas .as-chart'), canvas = box && box.querySelector('.as-art');
        if (!canvas || !box.clientWidth) return;
        const w = Math.max(160, Math.round(box.clientWidth / 2)), h = Math.max(100, Math.round(box.clientHeight / 2));
        canvas.width = w; canvas.height = h;
        const c = canvas.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.fillStyle = '#0c0a08'; c.fillRect(0, 0, w, h);
        paintLand(c, w, h, atlas.nodes);
        for (const state of ['dim', 'lit', 'done']) for (const [a, b] of atlas.links) if (linkState(a, b) === state) paintRoad({ c, w, h }, [a, b], state);
    }

    // ---------------------------------------------------------------- 차트: 지역 이름표와 지도석 노드
    let lastTap = { id: '', at: 0 };
    /** 한 번 누르면 고르고, 같은 노드를 곧바로 한 번 더 누르면 그 노드의 지도석으로 연다(고를 때 화면을 다시 그려서 dblclick이 오지 않는다). */
    function tap(id) {
        const now = Date.now(), again = lastTap.id === id && now - lastTap.at < 450;
        lastTap = { id, at: now };
        if (again) atlasUi.openNode(id); else atlasUi.selectNode(id);
    }
    function nodeHtml(node, picked) {
        const at = place(node), status = atlas.status(game, node.id), tier = atlas.effectiveTier(game, node);
        const held = game.atlas.stash.filter(map => map.node === node.id).length, running = game.atlas.run && game.atlas.run.map.node === node.id;
        const classes = ['as-node', `is-${status}`, `kind-${node.kind}`, node.id === picked ? 'is-selected' : '', running ? 'is-running' : '', held ? 'has-stone' : ''].filter(Boolean).join(' ');
        return `<button class="${classes}" style="--x:${at.x.toFixed(2)}%;--y:${at.y.toFixed(2)}%;--tone:${atlas.tierBand(tier).tone};--tint:${tintOf(node)}" data-atlas-node="${node.id}"
            data-info-tooltip-anchor="1" aria-pressed="${node.id === picked}" aria-label="${escapeHTML(_t(node.name))}" onclick="atlasSheetUi.tap('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><span class="as-stone"><b>${tier}</b></span>${held ? `<i>${held}</i>` : ''}`
            + `${node.id === picked ? `<em>${escapeHTML(_t(node.name))}</em>` : ''}</button>`;
    }
    function regionTagHtml(region) {
        const nodes = atlas.nodes.filter(node => node.region === region.id), cleared = nodes.filter(node => game.atlas.completed.includes(node.id)).length, [x, y, align] = FLOW[region.id].tag;
        const branch = { sun: '태양', moon: '달', origin: '경계' }[ATLAS.lore.regions[region.id].path];
        return `<span class="as-region is-${align}${y > 50 ? ' is-low' : ''}" style="--x:${x}%;--y:${y}%;--tint:${region.tint}"><small>${_t(branch)}</small>${escapeHTML(_t(region.name))}`
            + `<b>${cleared}/${nodes.length}</b><i style="--fill:${Math.round(cleared / nodes.length * 100)}%"></i></span>`;
    }
    function chartHtml(picked) {
        return `<div class="as-chart" role="group" aria-label="${_t('아틀라스 지도')}"><canvas class="as-art" aria-hidden="true"></canvas>
            ${ATLAS.regions.map(regionTagHtml).join('')}${atlas.nodes.map(node => nodeHtml(node, picked)).join('')}</div>`;
    }

    // ---------------------------------------------------------------- 윗줄: 진행 막대, 씨앗 칸, 포인트, 자동 지도
    function topHtml() {
        // 완료 수와 남은 포인트는 예전 머리줄과 같은 셈이다(js/atlas-ui.js headerHtml): 깨어난 아틀라스는 후반 싸움만큼 넓어진다.
        const st = game.atlas, total = atlas.nodes.length + (atlasEndgame.awakened(game) ? atlas.lateNodes.length : 0), points = atlas.points(game), free = atlasPassives.spendable(game);
        const seeds = Array.from({ length: ATLAS.seeds.max }, (_, i) => `<i class="${i < st.seeds ? 'is-on' : ''}"></i>`).join('');
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

    // ---------------------------------------------------------------- 오른쪽 서랍: 고른 지도석(제작), 보관함(등급 색 지도석 칸)
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
        return `<div class="atlas-sheet">${topHtml()}<div class="as-body">${chartHtml(parts.node)}${drawerHtml(parts)}</div>
            <footer class="as-dock">${nodeInfoHtml(parts.node)}${fragmentsHtml()}${goHtml(parts)}</footer></div>`;
    }
    return Object.freeze({ on, html, paint, tap });
})();
safeExposeGlobals({ atlasSheetUi });
