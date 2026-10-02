/** 세계수 아틀라스 화면 (docs/atlas-endgame-20260930.md 3절): 방사형 노드 지도 · 지도 장치(제작 · 각인 홈) · 보관함 · 전투 HUD.
 * 패시브 보기는 js/atlas-passives-ui.js. 상태는 js/atlas.js, 런 흐름은 js/atlas-run.js가 맡고, 여기서는 고르기 · 보여주기 · 기록만 한다.
 */
const atlasUi = (() => {
    let signature = '', hudSignature = '', selectedNode = null, selectedUid = null, view = 'maps', panelObserver = null;
    const STATUS = { locked: '잠김', open: '열림', complete: '완료', bonus: '보너스' };
    /** The painted act map a node walks (data/act-exploration-maps.js terrain). */
    const terrainOf = node => (ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || '';
    const CRAFT_ORDER = ['magicBud', 'sapBud', 'formlessDew', 'blightSpore', 'pruningShears', 'goldenRule', 'deepWhetstone', 'emberBranch'];
    const ledger = () => game.atlas;
    const nodeName = id => atlas.node(id)?.name || '';
    const selectedMap = () => ledger().stash.find(map => map.uid === selectedUid) || null;
    const panelOpen = () => game.mapExploreSubtab === 'map-explore-worldtree' && game.mapSubtab === 'map-tab-zones';
    const encounterNames = types => types.map(type => ATLAS.encounters[type].name).join(' · ');

    function openPanel() {
        if (!document.getElementById('tab-map').classList.contains('active')) switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-worldtree');
        render();
    }
    function refresh() {
        signature = '';
        render();
        updateStaticUI();
    }
    function setView(next) {
        view = ['passives', 'epoch'].includes(next) ? next : 'maps';
        refresh();
    }
    function selectNode(id) {
        if (!atlas.node(id)) return;
        hideInfoTooltip(); // a tap also fires the hover card; the detail panel shows the node now
        selectedNode = id;
        const maps = ledger().stash.filter(map => map.node === id);
        if (maps.length && !maps.some(map => map.uid === selectedUid)) selectedUid = maps[0].uid;
        render();
    }
    function selectMap(uid) {
        const map = ledger().stash.find(entry => entry.uid === uid);
        if (!map) return;
        selectedUid = uid;
        selectedNode = map.node;
        render();
    }
    function craft(key) {
        const map = selectedMap();
        if (!map) return;
        const cost = [{ key, amount: 1 }];
        const reason = atlasMaps.craftReason(map, key) || (canPayCurrencyCosts(cost) ? '' : `${ORB_DB[key].name}이(가) 없습니다.`);
        if (reason) return addLog(reason, 'attack-monster');
        payCurrencyCosts(cost);
        atlasMaps.craft(map, key);
        addLog(`🗺️ ${nodeName(map.node)} 지도석에 ${ORB_DB[key].name} 사용: ${atlasMaps.crafts[key].label}`, 'loot-magic');
        queueImportantSave(200);
        refresh();
    }
    /** 각인 홈: 누르면 끼우고, 다시 누르면 뺀다. 지도를 열 때마다(자동 지도 포함) 가진 것만 하나씩 쓴다. */
    function toggleFragment(id) {
        const loadout = ledger().loadout;
        if (loadout.includes(id)) atlas.setLoadout(game, loadout.filter(entry => entry !== id));
        else if (loadout.length < atlas.slots(game)) atlas.setLoadout(game, [...loadout, id]);
        else return addLog(`각인 홈은 ${atlas.slots(game)}개입니다. 먼저 하나를 빼세요.`, 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function open() {
        const map = selectedMap();
        if (!map) return;
        const reason = atlasRun.open(map.uid);
        if (reason) return addLog(reason, 'attack-monster');
        selectedUid = null;
        refresh();
        switchTab('tab-battle');
    }
    function openPinnacle() {
        const reason = atlasRun.openPinnacle();
        if (reason) return addLog(reason, 'attack-monster');
        refresh();
        switchTab('tab-battle');
    }
    function reenter() {
        const reason = atlasRun.reenter();
        if (reason) return addLog(reason, 'attack-monster');
        refresh();
        switchTab('tab-battle');
    }
    /** 지도 닫기 asks first: the map item, its held map drops and fragments and the map's temporary loot are lost. */
    async function abandon() {
        const run = ledger().run;
        if (!run) return;
        const held = run.drops.length + run.found.length;
        const message = `${nodeName(run.map.node)} 지도를 닫을까요?\n지도석${held ? `과 맵에서 얻은 지도석 · 각인 ${held}개` : ''}를 잃고, 맵 안의 임시 전리품도 사라집니다.`;
        const ok = await requestGameConfirmation(message, { title: '지도 닫기', tone: 'danger', confirmLabel: '지도 닫기', cancelLabel: '취소', dismissOnBackdrop: false });
        if (!ok || ledger().run !== run) return;
        if (atlasRun.abandon()) addLog('🗺️ 지도를 닫았습니다. 지도석과 맵 안에서 얻은 지도석 · 각인은 사라집니다.', 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function toggleAuto(on) {
        ledger().autoMap = !!on;
        queueImportantSave(200);
        refresh();
    }

    // ---------------------------------------------------------------- chart
    /** The chart: a dot drawing of the world tree's cross-section (js/canvas-atlas-chart.js) under transparent node buttons. */
    function chartHtml() {
        return `<div class="atlas-chart" role="group" aria-label="세계수 아틀라스 노드"><canvas class="atlas-art" aria-hidden="true"></canvas>
            ${atlas.nodes.map(nodeHtml).join('')}</div>`;
    }
    const done = id => ['complete', 'bonus'].includes(atlas.status(game, id));
    /** Walked paths are gold, the way on from a completed node glows sap, the rest waits dim. */
    function linkState(a, b) {
        if (done(a) && done(b)) return 'done';
        return (done(a) || done(b)) && atlas.reachable(game, a) && atlas.reachable(game, b) ? 'lit' : 'dim';
    }
    const polarOf = point => ({ angle: Math.atan2(point.y - 50, point.x - 50), radius: Math.hypot(point.x - 50, point.y - 50) });
    /** A path between two nodes: along the ring when both sit on the same ring, straight across rings. */
    function linkModel([a, b]) {
        const from = atlas.node(a), to = atlas.node(b), p = atlas.position(from), q = atlas.position(to);
        const sameRing = from.kind === 'map' && to.kind === 'map' && ATLAS.chart.ring[from.slot] === ATLAS.chart.ring[to.slot];
        const arc = sameRing ? { radius: polarOf(p).radius, from: polarOf(p).angle, to: polarOf(q).angle } : null;
        return { from: p, to: q, arc, state: linkState(a, b) };
    }
    function chartModel() {
        const running = ledger().run && ledger().run.map.node;
        const nodes = atlas.nodes.map(node => ({ ...atlas.position(node), kind: node.kind, region: node.regionIndex,
            status: atlas.status(game, node.id), selected: node.id === selectedNode, running: node.id === running }));
        return { regions: ATLAS.regions, nodes, links: atlas.links.map(linkModel), tickets: ATLAS.pinnacle.tickets.map(key => (game.currencies[key] || 0) >= 1) };
    }
    /** Paints the drawing at about one dot per 2 CSS px of the chart's width — again whenever the panel changes size. */
    function paintChart() {
        const box = document.querySelector('#ui-atlas .atlas-chart'), canvas = box && box.querySelector('.atlas-art');
        if (!canvas || !box.clientWidth) return;
        atlasChartArt.paint(canvas, Math.max(120, Math.round(box.clientWidth / 2)), chartModel());
    }
    /** The dot drawings of the current view: the chart, the passive wheels (the epoch view has none). */
    const PAINT = { maps: () => paintChart(), passives: () => atlasPassivesUi.paint(), epoch: () => {} };
    /** Drawings follow the panel's width: repaint the current view whenever the panel resizes. */
    function watchPanel(panel) {
        if (panelObserver || typeof ResizeObserver !== 'function') return;
        panelObserver = new ResizeObserver(() => { if (panelOpen()) PAINT[view](); });
        panelObserver.observe(panel);
    }
    /** Hover card: name, tier, state and region, then what stands there (map layout and boss, guardian, the pinnacle). */
    function hint(event, id) {
        const node = atlas.node(id);
        if (!node || typeof showInfoTooltipHtml !== 'function') return;
        const region = ATLAS.regions.find(row => row.id === node.region);
        const kind = node.kind === 'map' ? terrainOf(node) : `${node.kind === 'guardian' ? '지역 수호자' : '정점'}(${terrainOf(node)})`;
        const where = region ? ` · ${region.name}` : '';
        showInfoTooltipHtml(event.clientX, event.clientY, `<div class="tooltip-title">${escapeHTML(node.name)}</div>
            <div class="tooltip-line">${atlas.effectiveTier(game, node)}등급 · ${STATUS[atlas.status(game, id)]}${where}</div>
            <div class="tooltip-line">${kind} · 보스 ${escapeHTML(node.boss)}</div>`, region ? region.tint : '#d9b066');
    }
    /** Region legend: tint, name and how much of it is done (its maps and guardian). */
    function legendHtml() {
        return `<div class="atlas-legend" aria-label="지역">${ATLAS.regions.map(region => {
            const nodes = atlas.nodes.filter(node => node.region === region.id);
            const done = nodes.filter(node => ledger().completed.includes(node.id)).length;
            return `<span style="--tint:${region.tint}"><i></i>${region.name} <small>${done}/${nodes.length}</small></span>`;
        }).join('')}</div>`;
    }
    function nodeHtml(node) {
        const { x, y } = atlas.position(node), status = atlas.status(game, node.id);
        const held = ledger().stash.filter(map => map.node === node.id).length;
        const active = ledger().run?.map.node === node.id;
        const classes = ['atlas-node', `is-${status}`, `kind-${node.kind}`, node.id === selectedNode ? 'is-selected' : '', active ? 'is-running' : ''].join(' ');
        const tier = atlas.effectiveTier(game, node);
        return `<button class="${classes}" style="--x:${x}%;--y:${y}%" data-atlas-node="${node.id}" aria-pressed="${node.id === selectedNode}"
            aria-label="${escapeHTML(node.name)} ${tier}등급 ${STATUS[status]}" onclick="atlasUi.selectNode('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><b>${tier}</b>${held ? `<i>${held}</i>` : ''}</button>`;
    }

    // ---------------------------------------------------------------- side: open map, map device, node
    function mapCardHtml(map, extra = '') {
        const fx = atlasMaps.effects(map), rule = ATLAS.rarities[map.rarity];
        const mods = map.mods.map(entry => `<li>${escapeHTML(atlasMaps.describe(entry))}</li>`).join('');
        const tags = [`${map.tier}등급`, rule.name, map.quality ? `품질 ${map.quality}%` : '', map.corrupted ? '타락' : ''].filter(Boolean).join(' · ');
        return `<div class="atlas-map-card rarity-${map.rarity}${map.corrupted ? ' is-corrupted' : ''}"><strong>${escapeHTML(nodeName(map.node))}</strong>
            <span class="atlas-map-tags">${tags}</span>${mods ? `<ul class="atlas-mods">${mods}</ul>` : '<p class="atlas-muted">옵션 없음</p>'}
            <p class="atlas-rewards">아이템 수량 +${fx.quantity}% · 희귀도 +${fx.rarity}%${fx.packExtra ? ` · 무리 +${fx.packExtra}` : ''}</p>${extra}</div>`;
    }
    function runHtml(run) {
        const total = ATLAS.portals + run.bonus.portals;
        const portals = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
        const inside = atlas.inMap(game), rooms = run.encounters.length ? `<p class="atlas-encounters">콘텐츠 방: ${encounterNames(run.encounters)}</p>` : '';
        return `<section class="atlas-device is-running" aria-label="열린 지도"><h3>열린 지도</h3>
            ${mapCardHtml(run.map, `${rooms}<p class="atlas-portals" aria-label="남은 포털 ${run.portals}">포털 ${portals}</p>
            <p class="atlas-muted">맵에서 얻은 지도석 ${run.drops.length}개 · 각인 ${run.found.length}개 · 보스를 잡으면 보관함으로</p>`)}
            <div class="atlas-actions">${inside ? '<button class="atlas-primary" onclick="switchTab(\'tab-battle\')">전투 보기</button>'
                : '<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>'}
            <button onclick="atlasUi.abandon()">지도 닫기</button></div></section>`;
    }
    function fragmentsHtml() {
        const st = ledger(), slots = atlas.slots(game);
        const chips = ATLAS.fragments.map(fragment => {
            const count = st.fragments[fragment.id] || 0, on = st.loadout.includes(fragment.id);
            return `<button class="atlas-fragment${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="atlasUi.toggleFragment('${fragment.id}')"
                ${!on && !count ? 'disabled' : ''} title="${escapeHTML(fragmentText(fragment))}"><span>${fragment.name}</span><small>${count}</small></button>`;
        }).join('');
        return `<div class="atlas-fragments" aria-label="각인 홈"><p class="atlas-muted">각인 홈 ${st.loadout.length}/${slots} · 지도를 열 때 하나씩 씀</p>${chips}</div>`;
    }
    function fragmentText(fragment) {
        if (fragment.encounter) return `${ATLAS.encounters[fragment.encounter].name} 방이 반드시 생긴다`;
        return Object.entries(fragment.effect).map(([key, value]) => `${ATLAS_PASSIVES.labels[key][0]} +${value}${ATLAS_PASSIVES.labels[key][1]}`).join(' · ');
    }
    function chancesHtml() {
        const bonus = atlasPassives.effects(game);
        const rows = atlasEncounters.types.map(type => `${ATLAS.encounters[type].name} ${ATLAS.encounters[type].chance + (bonus[type] || 0)}%`);
        return `<p class="atlas-encounters">콘텐츠 방 확률: ${rows.join(' · ')} (지도마다 ${ATLAS.encounterLimit + (bonus.encounterExtra || 0)}개까지)</p>`;
    }
    function deviceHtml() {
        const map = selectedMap(), lock = atlas.lockReason(game) || atlasRun.blockReason();
        if (!map) return `<section class="atlas-device" aria-label="지도 장치"><h3>지도 장치</h3><p class="atlas-muted">${ledger().stash.length
            ? '보관함이나 노드에서 지도석을 고르세요.' : '지도석이 없습니다. 혼돈 20 이상에서 보스를 잡거나 이번 루프의 혼돈 20을 깨면 들어옵니다.'}</p>${fragmentsHtml()}</section>`;
        const crafts = CRAFT_ORDER.map(key => craftButtonHtml(map, key)).join('');
        return `<section class="atlas-device" aria-label="지도 장치"><h3>지도 장치</h3>${mapCardHtml(map, buildMapPowerEstimateHtml(atlas.preview(game, map)))}
            <div class="atlas-crafts" aria-label="지도석 제작">${crafts}</div>${fragmentsHtml()}${chancesHtml()}
            ${lock ? `<p class="atlas-lock">${lock}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.open()" ${lock ? 'disabled' : ''}>지도 열기</button></div></section>`;
    }
    function craftButtonHtml(map, key) {
        const have = Math.floor(game.currencies[key] || 0), reason = atlasMaps.craftReason(map, key);
        return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''} title="${escapeHTML(reason || atlasMaps.crafts[key].label)}">
            <span>${window.getStyledOrbName(key)}</span><small>${atlasMaps.crafts[key].label} · ${have}</small></button>`;
    }
    const TICKET = key => ORB_DB[key].name.replace('우버 뿌리 입장권: ', '');
    function nodeDetailHtml() {
        const node = atlas.node(selectedNode);
        if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
        if (node.kind === 'pinnacle') return pinnacleHtml(node);
        const region = ATLAS.regions.find(row => row.id === node.region), status = atlas.status(game, node.id), tier = atlas.effectiveTier(game, node);
        const maps = ledger().stash.filter(map => map.node === node.id).sort((a, b) => b.tier - a.tier);
        const kind = node.kind === 'guardian' ? `<p class="atlas-guardian-note">지역 수호자 · 처치마다 뿌리 입장권(${node.ticket ? TICKET(node.ticket) : '가장 적은 것'}) · 지도석은 이 지역 ${ATLAS.guardianRules.minTier}등급 이상 보스가 떨어뜨립니다</p>` : '';
        return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${region.name} · ${STATUS[status]}</small><h3>${escapeHTML(node.name)}</h3>
            <p>${tier}등급 · ${terrainOf(node)} · 보스 ${escapeHTML(node.boss)}</p>${kind}
            <p class="atlas-muted">장비 T${atlas.lootTier(tier)}까지 · 혼돈 ${atlas.equivalentDepth(tier)} 상당</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(stashRowHtml).join('')}</div>` : '<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>'}</section>`;
    }
    /** 정점: 입장권 4종 · 씨앗 · 열기. 지도석이 아니라 입장권으로 연다. */
    function pinnacleHtml(node) {
        const tier = atlas.effectiveTier(game, node), reason = atlas.pinnacleReason(game) || atlasRun.blockReason(), busy = !!ledger().run;
        const tickets = ATLAS.pinnacle.tickets.map(key => `<span class="${(game.currencies[key] || 0) >= 1 ? 'is-on' : ''}">${TICKET(key)} ${Math.floor(game.currencies[key] || 0)}</span>`).join('');
        return `<section class="atlas-node-detail atlas-pinnacle-detail"><small>정점 · 세계수 씨앗 ${ledger().seeds}/${ATLAS.seeds.max}</small><h3>${escapeHTML(node.name)}</h3>
            <p>${tier}등급 · 투기장 · 보스 ${ATLAS.pinnacle.stages}단계</p><div class="atlas-tickets">${tickets}</div>
            <p class="atlas-muted">처치하면 세계수 씨앗 하나(최대 ${ATLAS.seeds.max}) — 씨앗마다 모든 노드 등급 +${ATLAS.seeds.tierStep}. 씨앗 ${BEYOND_BOUNDARY_UNLOCK_SEEDS}개면 경계 너머가 루프 50 전에 열립니다(관측자 처치 필요).</p>
            ${reason && !busy ? `<p class="atlas-lock">${reason}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.openPinnacle()" ${reason ? 'disabled' : ''}>정점 열기</button></div></section>`;
    }

    // ---------------------------------------------------------------- stash, result, header
    function stashRowHtml(map) {
        return `<button class="atlas-stash-row rarity-${map.rarity}" aria-pressed="${map.uid === selectedUid}" onclick="atlasUi.selectMap(${map.uid})">
            <b>${map.tier}</b><span>${escapeHTML(nodeName(map.node))}</span><small>${ATLAS.rarities[map.rarity].name}${map.mods.length ? ` · 옵션 ${map.mods.length}` : ''}${map.quality ? ` · ${map.quality}%` : ''}${map.corrupted ? ' · 타락' : ''}</small></button>`;
    }
    function stashHtml() {
        const maps = [...ledger().stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
        return `<section class="atlas-stash" aria-label="지도석 보관함"><h3>지도석 보관함 <span>${maps.length}/${ATLAS.stashCap}</span></h3>
            ${maps.length ? `<div class="atlas-stash-list">${maps.map(stashRowHtml).join('')}</div>` : '<p class="atlas-muted">비어 있습니다. 보관함은 루프마다 비워집니다.</p>'}</section>`;
    }
    function resultHtml() {
        const result = ledger().lastResult;
        if (!result) return '';
        const receipt = result.loot;
        const notes = [result.first && '첫 완료', result.bonus && '보너스 달성', result.drops && `지도석 ${result.drops}개`,
            result.fragments && `각인 ${result.fragments}개`].filter(Boolean).join(' · ');
        const currencies = receipt ? Object.entries(receipt.currencies).map(([key, n]) => `<span>${window.getStyledOrbName(key)} <b>+${n}</b></span>`).join('') : '';
        return `<details class="atlas-result"><summary>${escapeHTML(nodeName(result.nodeId))} ${result.tier}등급 ${result.outcome === 'complete' ? '완료' : '실패'}
            <span>${notes}</span></summary><div class="atlas-result-currencies">${currencies || '<span class="atlas-muted">기록된 재화 없음</span>'}</div>
            ${receipt ? `<p class="atlas-muted">장비 ${receipt.equipmentCount}개</p>` : ''}</details>`;
    }
    function headerHtml() {
        const st = ledger(), total = atlas.nodes.length, free = atlasPassives.available(game);
        const tab = (id, label) => `<button class="atlas-view${view === id ? ' is-on' : ''}" aria-pressed="${view === id}" onclick="atlasUi.setView('${id}')">${label}</button>`;
        return `<header class="atlas-head"><div><h2>세계수 아틀라스</h2><span>완료 ${st.completed.length}/${total} · 보너스 ${st.bonus.length} · 씨앗 ${st.seeds}/${ATLAS.seeds.max} · 아틀라스 포인트 ${atlas.points(game)}${free ? ` (남음 ${free})` : ''}</span></div>
            <nav class="atlas-views" aria-label="아틀라스 보기">${tab('maps', '지도')}${tab('passives', `패시브${free ? ` +${free}` : ''}`)}${tab('epoch', '시대')}</nav>
            <label class="atlas-auto" title="완료하면 같은 등급 이하에서 다음 지도석을 연다"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>자동 지도</span>
            <small>완료하면 같은 등급 이하에서 다음 지도석을 연다</small></label></header>`;
    }
    function mapsViewHtml() {
        return `<div class="atlas-main"><div class="atlas-chart-column">${legendHtml()}${chartHtml()}</div><div class="atlas-side">${ledger().run ? runHtml(ledger().run) : deviceHtml()}${nodeDetailHtml()}</div></div>
            ${resultHtml()}${stashHtml()}`;
    }
    const VIEWS = { maps: () => mapsViewHtml(), passives: () => atlasPassivesUi.html(), epoch: () => atlasEpochUi.html() };
    function render() {
        const panel = document.getElementById('ui-atlas');
        if (!panel || !panelOpen()) return;
        atlas.sync(game);
        const wallet = [...CRAFT_ORDER, ...ATLAS.pinnacle.tickets].map(key => game.currencies[key] || 0);
        const key = JSON.stringify([view, ledger(), selectedNode, selectedUid, wallet, atlasRun.blockReason(), game.currentZoneId, getPersistentBuildSignature(game)]);
        if (key === signature && panel.innerHTML) return;
        signature = key;
        const lock = atlas.lockReason(game);
        panel.innerHTML = `<div class="atlas-shell">${headerHtml()}${lock && !ledger().unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            ${VIEWS[view]()}</div>`;
        PAINT[view]();
        watchPanel(panel);
    }

    // ---------------------------------------------------------------- combat HUD and log lines
    function updateHud(zone) {
        const host = document.getElementById('ui-atlas-combat');
        if (!host) return;
        // The settlement pause still shows the cleared map; the next map's HUD waits until the hero enters it.
        const run = ledger().run, show = !!run && zone && zone.type === 'atlasMap' && !actExplorationState.current(game)?.departure;
        host.toggleAttribute('hidden', !show);
        if (!show) { hudSignature = ''; return; }
        const key = JSON.stringify([run.map.uid, run.portals, run.drops.length, run.found.length]);
        if (key === hudSignature) return;
        hudSignature = key;
        const rooms = run.encounters.length ? ` · ${encounterNames(run.encounters)}` : '';
        host.innerHTML = `<div class="atlas-hud-copy"><strong>${escapeHTML(zone.name)} <span>${run.map.tier}등급 · ${ATLAS.rarities[run.map.rarity].name}${rooms}</span></strong>
            <span>포털 ${run.portals}/${ATLAS.portals + run.bonus.portals} · 지도석 ${run.drops.length} · 각인 ${run.found.length} 보관 중</span></div>
            <div class="atlas-hud-actions"><button onclick="atlasUi.openPanel()">아틀라스</button></div>`;
    }
    const REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
    function dropsText(detail) {
        const parts = [];
        if (detail.room) parts.push(`${ATLAS.encounters[detail.room].name} 정리: ${detail.rewards.map(([key, n]) => `${ORB_DB[key].name} ${n}`).join(', ') || '보상 없음'}`);
        if (detail.maps.length) parts.push(`지도석 ${detail.maps.map(map => `${nodeName(map.node)}(${map.tier})`).join(', ')}`);
        if (detail.fragments.length) parts.push(`각인 ${detail.fragments.map(id => atlas.fragment(id).name).join(', ')}`);
        return `🗺️ ${parts.join(' · ')}`;
    }
    function logClass(detail) {
        if (detail.kind === 'failed') return 'death';
        return detail.kind === 'complete' && (detail.first || detail.bonus || detail.seed) ? 'loot-unique' : 'season-up';
    }
    function announce(detail) {
        const text = {
            complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? ' · 첫 완료' : ''}${detail.bonus ? ' · 보너스 달성' : ''}${detail.drops ? ` · 지도석 ${detail.drops}개` : ''}`
                + (detail.ticket ? ` · ${ORB_DB[detail.ticket].name}` : '') + (detail.seed ? ` · 세계수 씨앗 ${detail.seeds}/${ATLAS.seeds.max}` : '')
                + (detail.next ? ` → 다음 지도: ${nodeName(detail.next)}` : ''),
            portal: () => `🌀 ${REASON[detail.reason] || detail.reason} · 남은 포털 ${detail.portals}`,
            failed: () => `🗺️ ${REASON[detail.reason] || detail.reason} · 포털이 모두 닫혀 지도가 실패했습니다.`,
            drops: () => dropsText(detail),
            starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? ` · 지도석 ${detail.count}개` : ''}` : `🌳 이번 루프의 지도석 ${detail.count}개가 보관함에 들어왔습니다.`
        }[detail.kind];
        if (!text) return;
        addLog(text(), logClass(detail));
        if (detail.kind === 'complete' && detail.lost) addLog(`보관함이 가득 차 지도석 ${detail.lost}개를 잃었습니다.`, 'attack-monster');
        if (detail.kind === 'starter' && detail.opened) queueTutorialNotice('unlock_world_tree_atlas', '세계수 아틀라스',
            '혼돈 20 너머에서 세계수 아틀라스가 열렸습니다.\n‘지도 → 세계수 아틀라스’에서 지도석을 골라 지도 장치로 여세요. 보스를 잡으면 노드가 완료되고 이웃 노드가 열립니다.', 'tab-map', 'map-explore-worldtree');
        signature = '';
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ render, refresh, updateHud, openPanel, setView, selectNode, selectMap, hint, craft, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto });
})();
safeExposeGlobals({ atlasUi });
