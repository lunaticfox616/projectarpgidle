/** 세계수 아틀라스 화면 (docs/atlas-endgame-20260930.md 3절): 방사형 노드 지도 · 지도 장치(제작 · 각인 홈) · 보관함 · 전투 HUD.
 * 패시브 보기는 js/atlas-passives-ui.js. 상태는 js/atlas.js, 런 흐름은 js/atlas-run.js가 맡고, 여기서는 고르기 · 보여주기 · 기록만 한다.
 */
const atlasUi = (() => {
    let signature = '', hudSignature = '', selectedNode = null, selectedRegion = 'roots', selectedUid = null, view = 'maps', panelObserver = null, bloomedUid = null;
    const STATUS = { locked: '잠김', open: '열림', complete: '완료', bonus: '보너스' };
    /** The state word's colour on the hover card: open is the chart's gold, done is pale. */
    const STATUS_TONE = { locked: '#8d826e', open: '#f3d28c', complete: '#efe6d2', bonus: '#fff1c9' };
    /** The painted act map a node walks (data/act-exploration-maps.js terrain). */
    const terrainOf = node => (ACT_EXPLORATION_MAPS.find(map => map.act === node.act) || {}).terrain || '';
    const CRAFT_ORDER = ['magicBud', 'sapBud', 'formlessDew', 'blightSpore', 'pruningShears', 'goldenRule', 'deepWhetstone', 'emberBranch'];
    const FLOWER_COLORS = Object.keys(LOOT_OMENS.flowers);
    const flowerWallet = () => FLOWER_COLORS.flatMap(color => [stumpBox.storedFlowerCount(game, color, false), stumpBox.storedFlowerCount(game, color, true)]);
    const ledger = () => game.atlas;
    const nodeName = id => atlas.node(id)?.name || '';
    const selectedMap = () => ledger().stash.find(map => map.uid === selectedUid) || null;
    const panelOpen = () => game.mapExploreSubtab === 'map-explore-worldtree' && game.mapSubtab === 'map-tab-zones';
    /** Content room names; a golden room (data/atlas.js goldenRoom) carries its prefix. */
    const encounterNames = (types, golden = []) => types.map(type => `${golden.includes(type) ? `${ATLAS.goldenRoom.prefix} ` : ''}${ATLAS.encounters[type].name}`).join(', ');
    /** The tier's colour (흰색, 노란색, 빨간색: js/atlas.js tierBand) as the --atlas-tier the number styles read. */
    const tierStyle = tier => `--atlas-tier:${atlas.tierBand(tier).tone}`;

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
    /** 나이테 원정 쪽은 열린 뒤에만 있다(2026-10-26 사용자, atlasBoard.unlocked). */
    const viewOpen = id => id !== 'board' || atlasBoard.unlocked(game);
    function setView(next) {
        view = ['passives', 'epoch', 'late', 'memory', 'board'].includes(next) && viewOpen(next) ? next : 'maps';
        refresh();
    }
    function selectRegion(id, showMaps = false) {
        if (!ATLAS.regions.some(row => row.id === id)) return;
        if (showMaps) view = 'maps';
        selectedRegion = id;
        selectedNode = null;
        refresh();
    }
    function selectNode(id, reveal = false) {
        const node = atlas.node(id);
        if (!node) return;
        hideInfoTooltip(); // a tap also fires the hover card; the detail panel shows the node now
        if (reveal) view = 'maps';
        selectedNode = id;
        selectedRegion = node.region || 'trunk';
        const maps = ledger().stash.filter(map => map.node === id);
        if ((reveal || maps.length) && !maps.some(map => map.uid === selectedUid)) selectedUid = maps.length ? maps[0].uid : null;
        render();
        if (reveal) revealNodeDetail();
    }
    function revealNodeDetail() {
        const detail = document.querySelector('#ui-atlas .atlas-node-detail');
        if (!detail) return;
        detail.tabIndex = -1;
        detail.focus({ preventScroll: true });
        detail.scrollIntoView({ block: 'nearest' });
    }
    function selectMap(uid, reveal = false) {
        const map = ledger().stash.find(entry => entry.uid === uid);
        if (!map) return;
        selectedUid = uid;
        selectedNode = map.node;
        selectedRegion = atlas.node(map.node).region || 'trunk';
        render();
        if (reveal) revealDevice();
    }
    function revealDevice() {
        document.querySelector('#ui-atlas .atlas-device')?.scrollIntoView({ block: 'start' });
    }
    function revealStash() {
        document.querySelector('#ui-atlas .atlas-stash')?.scrollIntoView({ block: 'start' });
    }
    /** The stash in its shown order: highest tier first. */
    const sortedStash = () => [...ledger().stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
    const mapName = map => _t('{node} {tier}등급 {name}', { node: nodeName(map.node), tier: map.tier, name: ATLAS.rarities[map.rarity].name });
    /** 고른 지도석 하나. 손대지 않은 지도석은 묻지 않고(2026-11-06 사용자: 버리기가 너무 귀찮다), 제작한 것만 확인한다. 버린 뒤 다음 줄을 골라
     * 같은 단추로 이어서 버린다. */
    async function discard() {
        const map = selectedMap(), busy = atlas.runOpenReason(game);
        if (!map) return;
        if (busy) return addLog(busy, 'attack-monster');
        const name = mapName(map);
        if (!atlas.plainMap(map) && !await requestGameConfirmation(`${name} 지도석 1개를 버릴까요?\n지도석과 제작에 쓴 재화는 돌려받을 수 없습니다.`,
            { title: _t('지도석 버리기'), tone: 'danger', confirmLabel: _t('버리기'), cancelLabel: _t('취소'), dismissOnBackdrop: false })) return;
        if (selectedMap() !== map) return addLog(_t('선택한 지도석이 바뀌어 버리기를 취소했습니다.'), 'attack-monster');
        const order = sortedStash(), at = order.indexOf(map);
        const reason = atlas.discard(game, map.uid);
        if (reason) return addLog(reason, 'attack-monster');
        const next = order[at + 1] || order[at - 1];
        selectedUid = next ? next.uid : null;
        addLog(_t('🗺️ {name} 지도석 1개를 버렸습니다.', { name }), 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    const plainUpTo = tier => ledger().stash.filter(map => atlas.plainMap(map) && map.tier <= tier).length;
    /** 고른 지도석의 등급 이하에서 손대지 않은 지도석 모두(한 번만 묻는다). 마법, 희귀, 품질, 타락 지도석은 남는다. */
    async function discardLow() {
        const map = selectedMap(), busy = atlas.runOpenReason(game);
        if (!map) return;
        if (busy) return addLog(busy, 'attack-monster');
        const tier = map.tier, count = plainUpTo(tier);
        if (!count) return addLog(_t('{tier}등급 이하에 일반 지도석이 없습니다.', { tier }), 'attack-monster');
        const ok = await requestGameConfirmation(_t('{tier}등급 이하 일반 지도석 {count}개를 모두 버릴까요?\n마법, 희귀, 품질, 타락 지도석은 남습니다.', { tier, count }),
            { title: _t('지도석 정리'), tone: 'danger', confirmLabel: _t('{count}개 버리기', { count }), cancelLabel: _t('취소'), dismissOnBackdrop: false });
        if (!ok) return;
        // 묻는 사이 보관함이 바뀌었으면(새로 떨어진 지도석) 확인한 수와 다르다: 지우지 않고 다시 누르게 한다.
        if (plainUpTo(tier) !== count) return addLog(_t('보관함이 바뀌어 정리를 취소했습니다. 다시 눌러 주세요.'), 'attack-monster');
        const removed = atlas.discardPlainUpTo(game, tier);
        if (!ledger().stash.includes(map)) selectedUid = null;
        addLog(_t('🗺️ {tier}등급 이하 일반 지도석 {removed}개를 버렸습니다.', { tier, removed }), 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    /** 고른 지도석과 같은 등급 둘을 합쳐 한 등급 위 지도석 하나. 제작한 지도석이 들어가면 묻는다. */
    async function combine() {
        const map = selectedMap(), reason = map && atlas.combineReason(game, map.uid);
        if (!map) return;
        if (reason) return addLog(reason, 'attack-monster');
        const set = atlas.combineSet(game, map.uid);
        if (set.some(entry => !atlas.plainMap(entry)) && !await requestGameConfirmation(_t('제작한 지도석이 함께 합쳐집니다.\n{names}', { names: set.map(mapName).join('\n') }),
            { title: _t('지도석 합치기'), confirmLabel: _t('합치기'), cancelLabel: _t('취소'), dismissOnBackdrop: false })) return;
        // 묻는 사이 보관함이 바뀌면 합칠 셋도 바뀔 수 있다: 확인한 셋과 같을 때만 합친다.
        const now = atlas.combineSet(game, map.uid);
        if (!now || now.length !== set.length || now.some((entry, at) => entry !== set[at])) return addLog(_t('보관함이 바뀌어 합치기를 취소했습니다. 다시 눌러 주세요.'), 'attack-monster');
        const result = atlas.combine(game, map.uid);
        if (result.reason) return addLog(result.reason, 'attack-monster');
        selectedUid = result.map.uid;
        addLog(_t('🗺️ {tier}등급 지도석 {count}개를 합쳐 {name} 지도석을 얻었습니다.', { tier: map.tier, count: result.used.length, name: mapName(result.map) }), 'loot-normal');
        queueImportantSave(200);
        refresh();
    }
    function craft(key) {
        const map = selectedMap();
        if (!map) return;
        const cost = [{ key, amount: 1 }];
        const reason = atlasMaps.craftReason(map, key) || (canPayCurrencyCosts(cost) ? '' : _t('{name} 없습니다.', { name: withSubjectParticle(_t(ORB_DB[key].name)) }));
        if (reason) return addLog(reason, 'attack-monster');
        payCurrencyCosts(cost);
        atlasMaps.craft(map, key);
        addLog(_t('🗺️ {node} 지도석에 {name} 사용: {label}', { node: nodeName(map.node), name: _t(ORB_DB[key].name), label: atlasMaps.crafts[key].label }), 'loot-magic');
        queueImportantSave(200);
        refresh();
    }
    /** 꽃 하나로 지도석의 기운을 바꾼다(js/atlas.js changeOmen). 새 기운은 한 번 빛난다. */
    function applyFlower(map, color, omenId) {
        const result = atlas.changeOmen(game, map.uid, color, omenId);
        if (result.reason) return addLog(result.reason, 'attack-monster');
        addLog(_t('🗺️ {node} 지도석에 {golden}{color} 꽃 사용: {omen}', { node: nodeName(map.node), golden: omenId ? `${_t('황금')} ` : '', color: _t(STUMP_BOX_COLORS[color].label), omen: _t(lootOmens.describe(result.omen).name) }), 'loot-magic');
        playUiFeedbackSound('gemSocket');
        queueImportantSave(200);
        bloomedUid = map.uid;
        refresh();
        bloomedUid = null;
    }
    function flowerOmen(color) {
        const map = selectedMap();
        if (map) applyFlower(map, color, null);
    }
    /** 황금 꽃: 그 색 묶음의 기운을 보여 주고 고른 것으로 바꾼다. 묻는 사이 지도석이 바뀌었으면 쓰지 않는다. */
    async function goldenFlowerOmen(color) {
        const map = selectedMap();
        if (!map) return;
        const choices = lootOmens.flowerOmens(color, game, map.omen).map(omen => ({ value: omen.id, label: omen.name, detail: omen.note }));
        const picked = await requestGameChoice({ title: _t('황금 {label} 꽃', { label: STUMP_BOX_COLORS[color].label }), message: _t('지도석에 붙일 기운을 고르세요.'), choices, confirmLabel: _t('이 기운으로'), cancelLabel: _t('취소') });
        if (!picked) return;
        if (selectedMap() !== map) return addLog(_t('선택한 지도석이 바뀌어 기운 바꾸기를 취소했습니다.'), 'attack-monster');
        applyFlower(map, color, picked);
    }
    /** 각인 홈: 누르면 끼우고, 다시 누르면 뺀다. 지도를 열 때마다(자동 지도 포함) 가진 것만 하나씩 쓴다. */
    function toggleFragment(id) {
        const loadout = ledger().loadout;
        if (loadout.includes(id)) atlas.setLoadout(game, loadout.filter(entry => entry !== id));
        else if (loadout.length < atlas.slots(game)) atlas.setLoadout(game, [...loadout, id]);
        else return addLog(_t('각인 홈은 {slots}개입니다. 먼저 하나를 빼세요.', { slots: atlas.slots(game) }), 'attack-monster');
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
    /** Closing loses the entry cost and boss-held rewards; ordinary ground loot is collected by the exit flow. */
    async function abandon() {
        const run = ledger().run;
        if (!run) return;
        const ok = await requestGameConfirmation(abandonMessage(run), { title: _t('지도 닫기'), tone: 'danger', confirmLabel: _t('지도 닫기'), cancelLabel: _t('취소'), dismissOnBackdrop: false });
        if (!ok || ledger().run !== run) return;
        if (atlasRun.abandon()) addLog(_t('🗺️ 지도를 닫았습니다.'), 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function abandonMessage(run) {
        const held = run.drops.length + run.found.length, kind = atlas.node(run.map.node)?.kind;
        // 지도석 없이 연 싸움은 바친 것을 잃는다(정점은 입장권, 최종 보스와 리그 우두머리는 재료, 기억 싸움은 그 기억).
        const offering = run.board ? _t('보관 재화 {lossPctFor}%', { lossPctFor: atlasBoard.lossPctFor(ledger().board, run.board.boss) }) : run.map.memory ? _t('보스의 기억 {memory}단계', { memory: run.map.memory }) : kind === 'pinnacle' ? '바친 입장권' : (RUN_KIND[kind] ? '바친 재료' : '지도석');
        const lost = [offering, held ? _t('보류 중인 지도석과 각인 {held}개', { held }) : '', heldLate(run)].filter(Boolean).join(', ');
        return `${run.board ? run.board.name : nodeName(run.map.node)} 지도를 닫을까요?\n손실: ${lost}\n일반 장비와 재화, 바닥 전리품은 남습니다.${run.board ? _t('\n다음 진입에는 심재 주사위 1개가 필요합니다.') : ''}`;
    }
    function toggleAuto(on) {
        ledger().autoMap = !!on;
        queueImportantSave(200);
        refresh();
    }
    function toggleAutoGuardians(on) {
        ledger().autoGuardians = !!on;
        queueImportantSave(200);
        refresh();
    }

    // ---------------------------------------------------------------- chart
    const shownNodes = () => atlas.nodes.filter(node => node.region === selectedRegion || (selectedRegion === 'trunk' && node.kind === 'pinnacle'));
    function chartHtml() {
        const region = ATLAS.regions.find(row => row.id === selectedRegion), lore = ATLAS.lore.regions[selectedRegion];
        return `<section class="atlas-region-route"><h3>${escapeHTML(_t(region.name))}</h3><p class="atlas-muted">${escapeHTML(_t(lore.note))}</p>
            <div class="atlas-chart atlas-route-chart" role="group" aria-label="${escapeHTML(_t(region.name))}"><canvas class="atlas-art" aria-hidden="true"></canvas>
            ${shownNodes().map(nodeHtml).join('')}</div><p class="atlas-muted">${_t('입구에서 갈래를 선택하고 수호자를 거쳐 최초의 경계로 향합니다.')}</p></section>`;
    }
    const done = id => ['complete', 'bonus'].includes(atlas.status(game, id));
    /** Walked paths are gold, the way on from a completed node glows sap, the rest waits dim. */
    function linkState(a, b) {
        if (done(a) && done(b)) return 'done';
        return (done(a) || done(b)) && atlas.reachable(game, a) && atlas.reachable(game, b) ? 'lit' : 'dim';
    }
    /** Authored paths are directed; a locked target never lights a backwards shortcut. */
    function linkModel([a, b]) {
        return { from: atlas.position(atlas.node(a)), to: atlas.position(atlas.node(b)), state: linkState(a, b) };
    }
    function chartModel() {
        const running = ledger().run && ledger().run.map.node;
        const nodes = shownNodes().map(node => ({ ...atlas.position(node), kind: node.kind, region: node.regionIndex,
            status: atlas.status(game, node.id), selected: node.id === selectedNode, running: node.id === running }));
        return { regions: ATLAS.regions, flat: true, nodes, links: atlas.links.filter(([a,b]) => shownNodes().some(n => n.id === a) && shownNodes().some(n => n.id === b)).map(linkModel), tickets: ATLAS.pinnacle.tickets.map(key => (game.currencies[key] || 0) >= 1) };
    }
    /** Paints the drawing at about one dot per 2 CSS px of the chart's width — again whenever the panel changes size. */
    function paintChart() {
        const box = document.querySelector('#ui-atlas .atlas-chart'), canvas = box && box.querySelector('.atlas-art');
        if (!canvas || !box.clientWidth) return;
        atlasChartArt.paint(canvas, Math.max(120, Math.round(box.clientWidth / 2)), chartModel());
    }
    /** The dot drawings of the current view: the chart, the passive wheels (the epoch and late views have none). */
    const PAINT = { maps: () => (atlasSheetUi.on() ? atlasSheetUi.paint() : paintChart()), passives: () => atlasPassivesUi.paint(), epoch: () => {}, late: () => {}, memory: () => {}, board: () => {} };
    /** Drawings follow the panel's width: repaint the current view whenever the panel resizes. */
    function watchPanel(panel) {
        if (panelObserver || typeof ResizeObserver !== 'function') return;
        panelObserver = new ResizeObserver(() => { if (panelOpen()) PAINT[view](); });
        panelObserver.observe(panel);
    }
    /** Hover card (2026-11-06 사용자: 색감을 넣고, 아직 갈 수 없는 노드는 이름만): the name in its region's tint; an open node adds its tier as a chip
     * in the tier's colour, its state and region, then what stands there (map layout and boss, guardian, the pinnacle). */
    function hint(event, id) {
        const node = atlas.node(id);
        if (!node || typeof showInfoTooltipHtml !== 'function') return;
        const region = ATLAS.regions.find(row => row.id === node.region), tint = region ? region.tint : '#d9b066';
        const status = atlas.status(game, id), tier = atlas.effectiveTier(game, node);
        const title = `<div class="tooltip-title" style="color:${tint}">${escapeHTML(_t(node.name))}</div>`;
        if (status === 'locked') return showInfoTooltipHtml(event.clientX, event.clientY, title, tint);
        const kind = node.kind === 'map' ? terrainOf(node) : `${node.kind === 'guardian' ? _t('지역 수호자') : _t('정점')}(${terrainOf(node)})`;
        const where = region ? `, ${escapeHTML(_t(region.name))}` : '';
        showInfoTooltipHtml(event.clientX, event.clientY, `${title}
            <div class="tooltip-line"><span class="atlas-tip-tier" style="${tierStyle(tier)}">${_t('{tier}등급', { tier })}</span> <span style="color:${STATUS_TONE[status]}">${_t(STATUS[status])}</span>${where}</div>
            <div class="tooltip-line">${_t('{kind}, 보스 {boss}', { kind, boss: escapeHTML(node.boss) })}</div>`, tint);
    }
    /** Region legend: tint, name and how much of it is done (its maps and guardian). */
    function legendHtml() {
        return `<nav class="atlas-region-tabs" aria-label="${_t('지역')}">${ATLAS.regions.map(region => {
            const nodes = atlas.nodes.filter(node => node.region === region.id), done = nodes.filter(node => ledger().completed.includes(node.id)).length;
            const branch = { sun: '태양', moon: '달', origin: '경계' }[ATLAS.lore.regions[region.id].path];
            return `<button style="--tint:${region.tint}" aria-pressed="${region.id === selectedRegion}" onclick="atlasUi.selectRegion('${region.id}')"><small>${_t(branch)}</small>${escapeHTML(_t(region.name))}<b>${done}/${nodes.length}</b></button>`;
        }).join('')}</nav>`;
    }
    const nodeLabel = (node, tier, status) => escapeHTML(_t('{name} {tier}등급 {STATUS}', {
        name: _t(node.name), tier, STATUS: _t(STATUS[status])
    }));
    function nodeHtml(node) {
        const { x, y } = atlas.position(node), status = atlas.status(game, node.id);
        const held = ledger().stash.filter(map => map.node === node.id).length;
        const active = ledger().run?.map.node === node.id;
        const classes = ['atlas-node', `is-${status}`, `kind-${node.kind}`, node.id === selectedNode ? 'is-selected' : '', active ? 'is-running' : ''].join(' ');
        const tier = atlas.effectiveTier(game, node);
        // data-info-tooltip-anchor: js/ui.js의 mousemove 감시가 이 표시가 없는 곳의 툴팁을 바로 지워, 지도 이름이 뜨자마자 사라졌다(2026-10-25 사용자).
        return `<button class="${classes}" style="--x:${x}%;--y:${y}%;${tierStyle(tier)}" data-atlas-node="${node.id}" data-info-tooltip-anchor="1" aria-pressed="${node.id === selectedNode}"
            aria-label="${nodeLabel(node, tier, status)}" onclick="atlasUi.selectNode('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><b>${tier}</b><span class="atlas-route-name">${escapeHTML(_t(node.name))}</span>${held ? `<i>${held}</i>` : ''}</button>`;
    }

    // ---------------------------------------------------------------- side: open map, map device, node
    /** 지도 기운(js/loot-omens.js): 이름, 무엇이 잘 나오는지, 세기(지도석 희귀도와 타락). 기운이 없는 예전 지도석은 빈칸. */
    function omenHtml(map) {
        const found = lootOmens.of(map);
        if (!found) return '';
        const omen = lootOmens.describe(found.omen.id);
        return `<p class="atlas-omen${map.uid === bloomedUid ? ' is-bloomed' : ''}" style="--omen:${omen.tone}"><b>${escapeHTML(_t(omen.name))}</b><small>${_t('세기 ×{strength}', { strength: found.strength })}</small>`
            + `<span>${escapeHTML(_t(omen.note))}</span></p>`;
    }
    function omenChipHtml(map) {
        const omen = map.omen && lootOmens.describe(map.omen);
        return omen ? `<i class="atlas-omen-chip" style="--omen:${omen.tone}">${escapeHTML(_t(omen.name))}</i>` : '';
    }
    function mapCardHtml(map, extra = '') {
        // 지도석 없이 연 싸움(정점, 최종 보스, 리그 우두머리)은 희귀도 · 옵션 · 수량 없이 무엇인지만.
        const special = RUN_KIND[atlas.node(map.node)?.kind];
        if (special) return `<div class="atlas-map-card"><strong>${escapeHTML(nodeName(map.node))}</strong><span class="atlas-map-tags">${_t('{tier}등급, {special}', { tier: map.tier, special })}</span>${extra}</div>`;
        const fx = atlasMaps.effects(map), rule = ATLAS.rarities[map.rarity];
        const mods = map.mods.map(entry => `<li>${escapeHTML(atlasMaps.describe(entry))}</li>`).join('');
        const tags = [_t('{tier}등급', { tier: map.tier }), rule.name, map.quality ? _t('품질 {quality}%', { quality: map.quality }) : '', map.corrupted ? '타락' : '',
            fx.overTiers ? _t('고등급 보상 {overTiers}단계', { overTiers: fx.overTiers }) : ''].filter(Boolean).join(', ');
        return `<div class="atlas-map-card rarity-${map.rarity}${map.corrupted ? ' is-corrupted' : ''}"><strong>${escapeHTML(nodeName(map.node))}</strong>
            <span class="atlas-map-tags">${tags}</span>${omenHtml(map)}${mods ? `<ul class="atlas-mods">${mods}</ul>` : _t('<p class="atlas-muted">옵션 없음</p>')}
            <p class="atlas-rewards">아이템 수량 +${fx.quantity}%, 희귀도 +${fx.rarity}%${fx.packExtra ? _t(', 무리 +{packExtra}', { packExtra: fx.packExtra }) : ''}</p>${extra}</div>`;
    }
    /** Late materials the open map holds until its boss falls (js/atlas-endgame.js roomItems), as "성화 잉걸 8, 공허 조각 3". */
    const heldLate = run => Object.entries((run.endgame && run.endgame.items) || {}).map(([id, n]) => `${atlasEndgame.itemName(id)} ${n}`).join(', ');
    function runHtml(run) {
        const total = run.board ? 1 : ATLAS.portals + run.bonus.portals, late = heldLate(run);
        const portals = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
        const inside = atlas.inMap(game), rooms = run.encounters.length ? `<p class="atlas-encounters">콘텐츠 방: ${encounterNames(run.encounters, run.golden || [])}</p>` : '';
        return `<section class="atlas-device is-running" aria-label="${_t('열린 지도')}"><h3>${_t('열린 지도')}</h3>
            ${mapCardHtml(run.map, `${rooms}<p class="atlas-portals" aria-label="${_t('남은 포털 {portals}', { portals: run.portals })}">${_t('포털 {portals}', { portals })}</p>
            <p class="atlas-muted">${_t('맵에서 얻은 지도석 {length}개, 각인 {length2}개, 보스를 잡으면 보관함으로', { length: run.drops.length, length2: run.found.length })}</p>
            ${late ? `<p class="atlas-muted">${_t('후반부 재료 {late} (보스를 잡으면 받음)', { late })}</p>` : ''}`)}
            <div class="atlas-actions">${inside ? `<button class="atlas-primary" onclick="switchTab('tab-battle')">${_t('전투 보기')}</button>`
                : _t('<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>')}
            <button onclick="atlasUi.abandon()">${_t('지도 닫기')}</button></div></section>`;
    }
    function fragmentsHtml() {
        const st = ledger(), slots = atlas.slots(game);
        // 새 각인은 그 방이 열리는 루프부터 보인다(이미 가진 것과 끼운 것은 그대로, js/atlas.js fragmentOpen).
        const shown = ATLAS.fragments.filter(fragment => atlas.fragmentOpen(fragment, game.season) || st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
        const chips = shown.map(fragment => {
            const count = st.fragments[fragment.id] || 0, on = st.loadout.includes(fragment.id);
            return `<button class="atlas-fragment${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="atlasUi.toggleFragment('${fragment.id}')"
                ${!on && !count ? 'disabled' : ''} data-tip="${escapeHTML(fragmentText(fragment))}"><span>${_t(fragment.name)}</span><small>${count}</small></button>`;
        }).join('');
        return `<div class="atlas-fragments" aria-label="${_t('각인 홈')}"><p class="atlas-muted">${_t('각인 홈 {length}/{slots}, 지도를 열 때 하나씩 씀', { length: st.loadout.length, slots })}</p>${chips}</div>`;
    }
    function fragmentText(fragment) {
        const room = fragment.encounter ? ATLAS.encounters[fragment.encounter].name : '';
        if (room) return `${room}${room.endsWith('방') ? '' : _t(' 방')}이 반드시 생긴다`;
        const label = ([key, value]) => (ATLAS_PASSIVES.labels[key][1] === 'on' ? ATLAS_PASSIVES.labels[key][0] : `${ATLAS_PASSIVES.labels[key][0]} +${value}${ATLAS_PASSIVES.labels[key][1]}`);
        return Object.entries(fragment.effect).map(label).join(', ');
    }
    /** ' (잊힌 정원 ×2)' for a room a region favours (data/atlas.js regionChance), '' otherwise. */
    function regionChanceNote(type) {
        return Object.entries(ATLAS.encounters[type].regionChance || {})
            .map(([id, mul]) => ` (${(ATLAS.regions.find(row => row.id === id) || {}).name} ×${mul})`).join('');
    }
    function chancesHtml() {
        const bonus = atlasPassives.effects(game);
        const rows = late => atlasEncounters.types.filter(type => !!ATLAS.encounters[type].late === late && atlasEncounters.isOpen(type, game.season))
            .map(type => `${ATLAS.encounters[type].name} ${ATLAS.encounters[type].chance + (bonus[type] || 0)}%${regionChanceNote(type)}`).join(', ');
        // 제단은 아틀라스가 깨어난 뒤에만, 콘텐츠 방과 따로 생긴다(js/atlas-encounters.js roll).
        const altars = atlasEndgame.awakened(game) ? `<p class="atlas-encounters">${_t('제단 확률: {value} (지도마다 {altarLimit}개까지)', { value: rows(true), altarLimit: ATLAS.altarLimit })}</p>` : '';
        // 황금 방(data/atlas.js goldenRoom): 콘텐츠 방마다 이 확률로 황금 방이 된다(보상 3배와 귀한 재료).
        const golden = _t('황금 방 {value}% (보상 {rewardMul}배)', { value: ATLAS.goldenRoom.chance + (bonus.goldenRoom || 0), rewardMul: ATLAS.goldenRoom.rewardMul });
        return `<p class="atlas-encounters">${_t('콘텐츠 방 확률: {value} (지도마다 {roomLimit}개까지), {golden}', { value: rows(false), roomLimit: atlasEncounters.roomLimit(bonus, game.season), golden })}</p>${altars}`;
    }
    function deviceHtml() {
        const map = selectedMap(), lock = atlas.lockReason(game) || atlasRun.blockReason();
        if (!map) return `<section class="atlas-device" aria-label="${_t('지도 장치')}"><h3>${_t('지도 장치')}</h3><p class="atlas-muted">${ledger().stash.length
            ? _t('보관함이나 노드에서 지도석을 고르세요.') : _t('지도석이 없습니다. 혼돈 20 이상에서 보스를 잡거나 이번 루프의 혼돈 20을 깨면 들어옵니다.')}</p>${fragmentsHtml()}</section>`;
        const crafts = CRAFT_ORDER.map(key => craftButtonHtml(map, key)).join('');
        return `<section class="atlas-device" aria-label="${_t('지도 장치')}"><h3>${_t('지도 장치')}</h3>${mapCardHtml(map, buildMapPowerEstimateHtml(atlas.preview(game, map)))}
            <div class="atlas-crafts" aria-label="${_t('지도석 제작')}">${crafts}</div>${flowersHtml(map)}${fragmentsHtml()}${chancesHtml()}
            ${lock ? `<p class="atlas-lock">${lock}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.open()" ${lock ? 'disabled' : ''}>${_t('지도 열기')}</button></div></section>`;
    }
    function craftButtonHtml(map, key) {
        const have = Math.floor(game.currencies[key] || 0), reason = atlasMaps.craftReason(map, key);
        return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''}${reason ? ` data-tip="${escapeHTML(reason)}"` : ''}>
            <span>${window.getStyledOrbName(key)}</span><small>${_t(atlasMaps.crafts[key].label)}, ${have}</small></button>`;
    }
    /** 꽃 한 색(data/loot-omens.js flowers): 평범한 꽃의 단추와, 황금 꽃을 가졌을 때만 고르는 단추. 툴팁은 그 색으로 나올 수 있는 기운이다. */
    function flowerButtonsHtml(map, color) {
        const name = _t('{label} 꽃', { label: STUMP_BOX_COLORS[color].label }), blocked = atlas.omenChangeReason(map), names = lootOmens.flowerOmens(color, game, map.omen).map(omen => omen.name).join(', ');
        const plain = stumpBox.storedFlowerCount(game, color, false), golden = stumpBox.storedFlowerCount(game, color, true), closed = blocked || !names;
        const icon = `<img class="atlas-flower-icon" src="${stumpBox.harvestPriceIcon(stumpBox.harvestPriceKey('flower', color))}" alt="">`;
        const tip = blocked || (plain ? names : _t('{name}이 없습니다. {names}', { name, names }));
        const pick = golden ? `<button class="is-golden" onclick="atlasUi.goldenFlowerOmen('${color}')" ${closed ? 'disabled' : ''} data-tip="${escapeHTML(blocked || names)}">
            ${icon}<span>${_t('황금 {name}', { name })}<small>${_t('직접 고르기, {golden}', { golden })}</small></span></button>` : '';
        return `<div class="atlas-flower" style="--flower:${STUMP_BOX_COLORS[color].tone}"><button onclick="atlasUi.flowerOmen('${color}')" ${closed || plain < 1 ? 'disabled' : ''} data-tip="${escapeHTML(tip)}">
            ${icon}<span>${name}<small>${_t(LOOT_OMENS.flowers[color].label)}, ${plain}</small></span></button>${pick}</div>`;
    }
    /** 지도 노드의 지도석에만 기운이 있다(수호자 지도석은 없다). */
    function flowersHtml(map) {
        if (atlas.node(map.node)?.kind !== 'map') return '';
        return `<div class="atlas-flowers" aria-label="${_t('꽃으로 기운 바꾸기')}"><p>${_t('꽃으로 기운 바꾸기')}</p>${FLOWER_COLORS.map(color => flowerButtonsHtml(map, color)).join('')}</div>`;
    }
    const TICKET = key => ORB_DB[key].name.replace('그림자 뿌리 입장권: ', '');
    function nodeDetailHtml() {
        const node = atlas.node(selectedNode);
        if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
        if (node.kind === 'pinnacle') return pinnacleHtml(node);
        const region = ATLAS.regions.find(row => row.id === node.region), status = atlas.status(game, node.id), tier = atlas.effectiveTier(game, node);
        const maps = ledger().stash.filter(map => map.node === node.id).sort((a, b) => b.tier - a.tier);
        const kind = node.kind === 'guardian' ? `<p class="atlas-guardian-note">${_t('지역 수호자, 처치마다 뿌리 입장권({value}), 지도석은 이 지역 {minTier}등급 이상 보스가 떨어뜨립니다', { value: node.ticket ? TICKET(node.ticket) : _t('가장 적은 종류'), minTier: ATLAS.guardianRules.minTier })}</p>${itemInfluencesUi.sourceHtml('guardian')}` : '';
        return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${_t(region.name)}, ${STATUS[status]}</small><h3>${escapeHTML(_t(node.name))}</h3>
            <p>${_t('{tier}등급, {node}, 보스 {boss}', { tier, node: terrainOf(node), boss: escapeHTML(node.boss) })}</p>${kind}
            <p class="atlas-muted">${_t('장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당', { lootTier: atlas.lootTier(tier), equivalentDepth: atlas.equivalentDepth(tier) })}</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(stashRowHtml).join('')}</div>` : _t('<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>')}</section>`;
    }
    /** 정점: 입장권 4종 · 씨앗 · 열기. 지도석이 아니라 입장권으로 연다. */
    function pinnacleHtml(node) {
        const tier = atlas.effectiveTier(game, node), reason = atlas.pinnacleReason(game) || atlasRun.blockReason(), busy = !!ledger().run;
        const tickets = ATLAS.pinnacle.tickets.map(key => `<span class="${(game.currencies[key] || 0) >= 1 ? 'is-on' : ''}">${TICKET(key)} ${Math.floor(game.currencies[key] || 0)}</span>`).join('');
        return `<section class="atlas-node-detail atlas-pinnacle-detail"><small>${_t('정점, 세계수 씨앗 {seeds}/{max}', { seeds: ledger().seeds, max: ATLAS.seeds.max })}</small><h3>${escapeHTML(_t(node.name))}</h3>
            <p>${_t('{tier}등급, 투기장, 보스 {stages}단계', { tier, stages: ATLAS.pinnacle.stages })}</p><div class="atlas-tickets">${tickets}</div>
            <p class="atlas-muted">${ledger().seeds >= ATLAS.seeds.max ? _t('세계수 씨앗 {max}개를 다 모아 더는 나오지 않습니다(시대 재생 뒤 다시).', { max: ATLAS.seeds.max }) : _t('처치하면 세계수 씨앗 하나(최대 {max}).', { max: ATLAS.seeds.max })} 씨앗마다 모든 노드 등급 +${ATLAS.seeds.tierStep}. 씨앗 ${BEYOND_BOUNDARY_UNLOCK_SEEDS}개면 경계 너머가 루프 50 전에 열립니다(관측자 처치 필요).</p>
            ${atlasEndgame.awakened(game) ? '' : _t('<p class="atlas-muted">처음 쓰러뜨리면 아틀라스가 깨어나 최종 보스가 열립니다.</p>')}
            ${reason && !busy ? `<p class="atlas-lock">${reason}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.openPinnacle()" ${reason ? 'disabled' : ''}>${_t('정점 열기')}</button></div></section>`;
    }

    // ---------------------------------------------------------------- stash, result, header
    function stashRowHtml(map) {
        return `<button class="atlas-stash-row rarity-${map.rarity}" aria-pressed="${map.uid === selectedUid}" onclick="atlasUi.selectMap(${map.uid})">
            <b style="${tierStyle(map.tier)}">${map.tier}</b><span>${escapeHTML(nodeName(map.node))}${omenChipHtml(map)}</span><small>${_t(ATLAS.rarities[map.rarity].name)}${map.mods.length ? _t(', 옵션 {length}', { length: map.mods.length }) : ''}${map.quality ? `, ${map.quality}%` : ''}${map.corrupted ? _t(', 타락') : ''}</small></button>`;
    }
    /** 고른 지도석의 도구: 같은 등급 셋 합치기, 버리기, 그 등급 이하 일반 지도석 정리. */
    function stashToolsHtml(selected, busy) {
        const same = ledger().stash.filter(map => map.tier === selected.tier).length, reason = atlas.combineReason(game, selected.uid);
        const low = plainUpTo(selected.tier), off = busy ? 'disabled' : '';
        const why = reason && same >= ATLAS.combine.count && !busy ? `<small>${escapeHTML(reason)}</small>` : '';
        return `<div class="atlas-stash-tools"><button class="atlas-combine" onclick="atlasUi.combine()" ${reason ? 'disabled' : ''}>${_t('같은 등급 {count}개 합치기', { count: ATLAS.combine.count })} <span>${Math.min(same, ATLAS.combine.count)}/${ATLAS.combine.count}</span></button>
            <button class="atlas-discard" onclick="atlasUi.discard()" ${off}>${_t('버리기')}</button>
            <button class="atlas-discard" onclick="atlasUi.discardLow()" ${off || (low ? '' : 'disabled')}>${_t('{tier}등급 이하 일반 모두 버리기', { tier: selected.tier })} <span>${low}</span></button></div>${why}`;
    }
    function stashHtml() {
        const maps = sortedStash();
        const selected = selectedMap(), busy = atlas.runOpenReason(game), full = maps.length >= ATLAS.stashCap;
        const capacity = full ? '보관함이 가득 찼습니다.' : _t('빈자리 {value}칸', { value: ATLAS.stashCap - maps.length });
        const management = selected ? `<div class="atlas-stash-management"><p><strong>${_t('선택: {node}', { node: escapeHTML(nodeName(selected.node)) })}</strong><span><b style="${tierStyle(selected.tier)}">${selected.tier}등급</b>, ${_t(ATLAS.rarities[selected.rarity].name)}${selected.quality ? _t(', 품질 {quality}%', { quality: selected.quality }) : ''}${selected.corrupted ? _t(', 타락') : ''}</span></p>
            ${stashToolsHtml(selected, busy)}${busy ? `<small>${busy}</small>` : ''}</div>` : '';
        return `<section class="atlas-stash" aria-label="${_t('지도석 보관함')}"><h3>${_t('지도석 보관함')} <span>${maps.length}/${ATLAS.stashCap}</span></h3>
            <p class="atlas-stash-capacity${full ? ' is-full' : ''}" role="status">${capacity}</p>${management}
            ${maps.length ? `<div class="atlas-stash-list">${maps.map(stashRowHtml).join('')}</div>` : _t('<p class="atlas-muted">비어 있습니다. 보관함은 루프마다 비워집니다.</p>')}</section>`;
    }
    // 이번 판의 발견: 바닥 빛기둥과 같은 판정(js/loot.js lootMoments)으로 좋은 것부터 칩 8개까지.
    const momentClass = moment => (moment ? ` moment-${moment}` : '');
    const LEAF_RANK = 1.5;
    function itemFind(row) {
        const name = row.rarity === 'unique' ? `「${escapeHTML(_t(row.name))}」` : escapeHTML(_t(row.name));
        return { rank: lootMoments.rank(row.moment), html: `<span class="atlas-find rarity-${row.rarity}${momentClass(row.moment)}" data-tip="${escapeHTML(getItemSlotDisplayLabel(null, row.slot))}">${row.fresh ? _t('<em>새</em>') : ''}${name}</span>` };
    }
    function leafFind([id, count]) {
        const leaf = memoryLeaves.leaf(id);
        return { rank: LEAF_RANK, html: `<span class="atlas-find is-leaf">${renderPixelIcon('leaf', 'atlas-find-leaf')}${escapeHTML(leaf ? leaf.name : id)}${count > 1 ? ` <b>×${count}</b>` : ''}</span>` };
    }
    function yarnFind([id, count]) {
        return { rank: 1, html: `<span class="atlas-find">${_t('실타래 {name}', { name: escapeHTML(_t(knitting.row(id).name)) })} <b>×${count}</b></span>` };
    }
    function currencyFind([key, count]) {
        const moment = lootMoments.ofCurrency(key), src = ORB_DB[key] && ORB_DB[key].icon;
        const icon = src ? `<img class="atlas-find-icon" src="${src}" alt="" aria-hidden="true">` : '';
        return { rank: lootMoments.rank(moment), html: `<span class="atlas-find${momentClass(moment)}">${icon}${window.getStyledOrbName(key)} <b>×${count}</b></span>` };
    }
    function findsHtml(receipt) {
        const currencies = Object.entries(receipt.currencies).filter(([key]) => lootMoments.ofCurrency(key));
        const finds = [...receipt.items.map(itemFind), ...Object.entries(receipt.leaves).map(leafFind), ...Object.entries(receipt.yarns || {}).map(yarnFind), ...currencies.map(currencyFind)];
        return finds.sort((a, b) => b.rank - a.rank).slice(0, 8).map(find => find.html).join('');
    }
    function resultNotes(result) {
        return [result.first && '첫 완료', result.bonus && '보너스 달성', result.drops && _t('지도석 {drops}개', { drops: result.drops }),
            result.fragments && _t('각인 {fragments}개', { fragments: result.fragments }), result.seed && _t('세계수 씨앗 +1 ({seeds}/{max})', { seeds: result.seeds, max: ATLAS.seeds.max }),
            result.endgame?.awakened && '아틀라스 후반부 개방'].filter(Boolean).join(', ');
    }
    /** The atlas's own materials are outside the wallet receipt. Show the amounts actually kept at completion. */
    function resultMaterialsHtml(result) {
        const spoils = result.endgame;
        if (!spoils) return '';
        const items = [...spoils.items, ...(spoils.invite ? [['ringInvite', spoils.invite]] : [])];
        if (!items.length) return '';
        return `<div class="atlas-result-currencies"><small>${_t('후반부 재료')}</small>${items.map(([id, n]) =>
            `<span>${escapeHTML(atlasEndgame.itemName(id))} <b>+${n}</b></span>`).join('')}</div>`;
    }
    function receiptHtml(receipt) {
        const none = '<span class="atlas-muted">기록된 재화 없음</span>';
        if (!receipt) return `<div class="atlas-result-currencies">${none}</div>`;
        const finds = findsHtml(receipt);
        const currencies = Object.entries(receipt.currencies).map(([key, n]) => `<span>${window.getStyledOrbName(key)} <b>+${n}</b></span>`).join('');
        return `${finds ? `<div class="atlas-result-finds" aria-label="${_t('이번 판의 발견')}"><small>${_t('이번 판의 발견')}</small>${finds}</div>` : ''}
            <div class="atlas-result-currencies"><small>${_t('재화 {length}종, 장비 {equipmentCount}개', { length: Object.keys(receipt.currencies).length, equipmentCount: receipt.equipmentCount })}</small>${currencies || none}</div>`;
    }
    function resultHtml() {
        const result = ledger().lastResult;
        if (!result) return '';
        const done = result.outcome === 'complete', recalled = result.memory?.foughtTier;
        return `<section class="atlas-result${done ? '' : ' is-failed'}" aria-label="${_t('지난 지도 결과')}"><h3>${escapeHTML(nodeName(result.nodeId))}${recalled ? _t(' (기억 {recalled}단계)', { recalled }) : ''} ${result.tier}등급 ${done ? _t('완료') : _t('실패')}<span>${resultNotes(result)}</span></h3>
            ${done ? overflowHtml(result) : failureHtml(result)}${resultMemoryHtml(result)}${resultMaterialsHtml(result)}${receiptHtml(result.loot)}</section>`;
    }
    function lostRewards(result) {
        return [result.lost && _t('지도석 {lost}개', { lost: result.lost }), result.lostFragments && _t('각인 {lostFragments}개', { lostFragments: result.lostFragments }),
            ...(result.lostMaterials || []).map(([id, count]) => _t('{itemName} {count}개', { itemName: atlasEndgame.itemName(id), count }))].filter(Boolean);
    }
    function overflowHtml(result) {
        const lost = lostRewards(result);
        if (!lost.length) return '';
        return `<div class="atlas-result-loss"><p>${_t('보관 한도 초과: {lost}는 보관하지 못했습니다.', { lost: escapeHTML(lost.join(', ')) })}</p></div>`;
    }
    function resultMemoryHtml(result) {
        const memory = result.memory;
        if (!memory) return '';
        const record = memory.newBest ? `<p>${_t('기억 최고 기록 갱신 ({foughtTier}단계)', { foughtTier: memory.foughtTier })}</p>` : '';
        const ticket = memory.ticket;
        if (!ticket) return record ? `<div class="atlas-result-memory">${record}</div>` : '';
        const name = atlas.node(ticket.node).boss;
        return `<div class="atlas-result-memory">${record}<p>${_t('기억 획득: {name} {tier}단계 +1', { name: escapeHTML(name), tier: ticket.tier })}</p>
            <button onclick="atlasUi.setView('memory');memoryDungeonUi.select('${ticket.node}',${ticket.tier})">${_t('기억 준비 보기')}</button></div>`;
    }
    function failureHtml(result) {
        const lost = lostRewards(result);
        return `${lost.length ? `<div class="atlas-result-loss"><p>${_t('보류 보상 손실: {lost}', { lost: escapeHTML(lost.join(', ')) })}</p></div>` : ''}
            ${!ledger().run && ledger().stash.length ? _t('<div class="atlas-actions"><button onclick="atlasUi.revealStash()">다음 지도석 고르기</button></div>') : ''}`;
    }
    // 보기는 지도 창 위 둘째 줄(js/exploration-atlas-ui.js)이 고른다. 2026-10-25 사용자: 세계수 아틀라스를 따로 탭으로, 위 탭 일관성.
    const VIEW_TABS = Object.freeze([['maps', '지도'], ['passives', '패시브'], ['late', '최종'], ['memory', '기억'], ['epoch', '시대'], ['board', '나이테 원정']]);
    /** The views for the map window's second tab row: { select(id), items: [{ id, label, badge, on }] }. */
    function pages() {
        const free = atlasPassives.spendable(game), memories = memoryDungeon.total(game);
        const badges = { passives: free ? `+${free}` : '', memory: memories ? String(memories) : '' };
        return { select: setView, items: VIEW_TABS.filter(([id]) => viewOpen(id)).map(([id, label]) => ({ id, label, badge: badges[id], on: view === id })) };
    }
    /** The region banner's line: the open map, the lock, or the stones in hand. */
    function progressLine() {
        const st = ledger();
        if (st.run) return _t('열린 지도: {node}', { node: nodeName(st.run.map.node) });
        return (!st.unlocked && atlas.lockReason(game)) || _t('지도석 {length}개, 완료 {length2}곳', { length: st.stash.length, length2: st.completed.length });
    }
    function headerHtml() {
        // 깨어난 아틀라스는 최종 보스와 리그 우두머리만큼 넓어진다(그 처치도 완료이자 아틀라스 포인트).
        const st = ledger(), total = atlas.nodes.length + (atlasEndgame.awakened(game) ? atlas.lateNodes.length : 0), free = atlasPassives.spendable(game);
        const stat = (label, value, tone) => `<span class="atlas-stat" style="--stat-tone:${tone}">${label} <b>${value}</b></span>`;
        const stats = stat('완료', `${st.completed.length}/${total}`, '#d9b066') + stat('보너스', st.bonus.length, '#9fd46a')
            + stat('씨앗', `${st.seeds}/${ATLAS.seeds.max}`, '#c9a0f0') + stat('포인트', `${atlas.points(game)}${free ? _t(' (남음 {free})', { free }) : ''}`, '#7fd6cf');
        return `<header class="atlas-head"><span class="atlas-stats">${stats}</span>
            <label class="atlas-auto" data-tip="${_t('완료하면 같은 등급 이하에서 다음 지도석을 연다')}"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>${_t('자동 지도')}</span>
            <small>${_t('완료하면 같은 등급 이하에서 다음 지도석을 연다')}</small></label></header>`;
    }
    /** Navigation only: preparing a suggested map never spends its stone or starts combat. */
    function huntingJourneyAction() {
        const highest = Math.min(game.maxZoneId, getVisibleHuntingMapCapZoneId());
        const chaos = highest >= getAbyssZoneIdForDepth(1) || getDeepChaosEntryState().open;
        return { action: `switchMapExploreSubtab('${chaos ? 'map-explore-chaos' : 'map-explore-hunting'}')`,
            label: chaos ? '혼돈 지도 보기' : '일반 사냥터 보기' };
    }
    function mapJourney() {
        const stash = ledger().stash, guardians = stash.filter(map => atlas.node(map.node)?.kind === 'guardian');
        const missing = guardians.find(map => { const ticket = atlas.node(map.node).ticket; return !ticket || !game.currencies[ticket]; });
        if (missing) return { title: _t('수호자 지도석 준비됨'), text: _t('{node} {tier}등급', { node: nodeName(missing.node), tier: missing.tier }),
            action: `atlasUi.selectMap(${missing.uid},true)`, label: _t('수호자 준비 보기') };
        const maps = [...stash].sort((a, b) => a.tier - b.tier || a.uid - b.uid), map = selectedMap() || maps[0];
        if (map) return { title: _t('지도석 {length}개 준비됨', { length: stash.length }), text: _t('{node} {tier}등급', { node: nodeName(map.node), tier: map.tier }),
            action: `atlasUi.selectMap(${map.uid},true)`, label: _t('지도 준비 보기') };
        return { title: _t('다음 지도석 모으기'), text: _t('혼돈 20 이상 보스가 지도석을 줍니다.'),
            ...huntingJourneyAction() };
    }
    function journeyState() {
        const st = ledger(), lock = atlas.lockReason(game);
        if (st.run) return { title: _t('열린 지도 진행 중'), text: _t('{node}, 남은 포털 {portals}개', { node: nodeName(st.run.map.node), portals: st.run.portals }),
            action: 'atlasUi.revealDevice()', label: _t('열린 지도 보기') };
        if (lock) return { title: _t('이번 루프의 입장 준비'), text: lock,
            ...huntingJourneyAction() };
        if (st.seeds >= ATLAS.seeds.max) return { title: _t('씨앗을 모두 모았습니다'), text: '',
            action: "atlasUi.setView('late')", label: _t('최종 보스 보기'), epoch: true };
        if (ATLAS.pinnacle.tickets.every(key => game.currencies[key] >= 1)) return { title: _t('정점 입장권 4종 준비됨'),
            text: '',
            action: "atlasUi.selectNode('pinnacle',true)", label: _t('정점 준비 보기') };
        return mapJourney();
    }
    function journeyHtml() {
        const next = journeyState();
        return `<section class="atlas-journey" aria-label="${_t('아틀라스 다음 목표')}"><div><h3>${_t(next.title)}</h3>${next.text ? `<p>${escapeHTML(_t(next.text))}</p>` : ''}</div>
            <div class="atlas-actions"><button class="atlas-primary" onclick="${next.action}">${_t(next.label)}</button>${next.epoch ? `<button onclick="atlasUi.setView('epoch')">${_t('시대 재생 비교')}</button>` : ''}</div></section>`;
    }
    function autoOptionsHtml() {
        const st = ledger();
        if (!st.autoMap) return '';
        const stop = game.settings.mapCompleteAction === 'stop';
        return `<section class="atlas-auto-options" aria-label="${_t('자동 지도 설정')}"><label><input type="checkbox" ${st.autoGuardians ? 'checked' : ''} onchange="atlasUi.toggleAutoGuardians(this.checked)">${_t('수호자 지도 포함')}</label>
            ${stop ? _t('<p>완료 후 멈춤 설정으로 자동 지도가 대기 중입니다.</p>') : ''}
            ${stop ? _t('<button onclick="openMapCompleteActionPicker(event)">완료 후 행동 변경</button>') : ''}</section>`;
    }
    /** 한 장 시험판(js/atlas-sheet-ui.js)에 건네는 것: 고른 노드와 지도석, 열 수 없는 까닭, 이미 만든 조각(열린 지도나 정점이나 지도석 카드, 보관함 도구, 결과). */
    function sheetParts() {
        const st = ledger(), map = selectedMap(), node = atlas.node(selectedNode), busy = atlas.runOpenReason(game), block = atlasRun.blockReason();
        const card = map ? `<section class="atlas-device" aria-label="${_t('지도 장치')}">${mapCardHtml(map, buildMapPowerEstimateHtml(atlas.preview(game, map)))}
            <div class="atlas-crafts" aria-label="${_t('지도석 제작')}">${CRAFT_ORDER.map(key => craftButtonHtml(map, key)).join('')}</div>${flowersHtml(map)}${chancesHtml()}</section>` : '';
        const side = st.run ? runHtml(st.run) : node && node.kind === 'pinnacle' ? pinnacleHtml(node) : card;
        const tools = map ? `${stashToolsHtml(map, busy)}${busy ? `<small>${busy}</small>` : ''}` : '';
        return { node: selectedNode, uid: selectedUid, lock: atlas.lockReason(game) || block, block, side, tools, after: `${autoOptionsHtml()}${resultHtml()}`, mapName };
    }
    /** 노드를 곧바로 두 번 누름(js/atlas-sheet-ui.js tap): 그 노드의 지도석이 있으면 고르고 연다. */
    function openNode(id) {
        selectNode(id);
        if (selectedMap() && selectedMap().node === id && !ledger().run) open();
    }
    function mapsViewHtml() {
        if (atlasSheetUi.on()) return atlasSheetUi.html(sheetParts());
        return `${journeyHtml()}<div class="atlas-ancient-entry"><button onclick="atlasUi.setView('late')">${_t('태양과 달, 피나클')}</button></div>${autoOptionsHtml()}<div class="atlas-main"><div class="atlas-chart-column">${legendHtml()}${chartHtml()}</div><div class="atlas-side">${ledger().run ? runHtml(ledger().run) : deviceHtml()}${nodeDetailHtml()}</div></div>
            ${resultHtml()}${stashHtml()}`;
    }
    const VIEWS = { maps: () => mapsViewHtml(), passives: () => atlasPassivesUi.html(), epoch: () => atlasEpochUi.html(), late: () => atlasEndgameUi.html(),
        memory: () => memoryDungeonUi.html(), board: () => atlasBoardUi.html() };
    function render() {
        atlasEndgameUi.noticeAwakened(); // every static refresh, panel open or not (the card follows the state)
        const panel = document.getElementById('ui-atlas');
        if (!panel || !panelOpen()) return;
        atlas.sync(game);
        atlasBoard.sync(game);
        const wallet = [...[...CRAFT_ORDER, ...ATLAS.pinnacle.tickets].map(key => game.currencies[key] || 0), ...flowerWallet()];
        if (!viewOpen(view)) view = 'maps'; // 다른 저장을 불러와 원정이 닫힌 뒤
        const key = JSON.stringify([atlasSheetUi.on(), view, selectedRegion, ledger(), selectedNode, selectedUid, wallet, atlasRun.blockReason(), game.currentZoneId, game.maxZoneId, game.settings.mapCompleteAction, getPersistentBuildSignature(game)]);
        if (key === signature && panel.innerHTML) return;
        signature = key;
        const lock = atlas.lockReason(game);
        panel.innerHTML = `<div class="atlas-shell">${atlasSheetUi.on() ? (view === 'maps' ? '' : atlasSheetUi.top(false)) : headerHtml()}${lock && !ledger().unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            ${VIEWS[view]()}</div>`;
        PAINT[view]();
        watchPanel(panel);
    }

    // ---------------------------------------------------------------- combat HUD and log lines
    /** Fights opened without a map item say what they are instead of the (always normal) rarity. */
    const RUN_KIND = { pinnacle: '정점', apex: '최종 보스', league: '리그 우두머리' };
    /** The map's kind chip: its rarity in the rarity's colour, a memory step, or the fight it opens. */
    function hudKindHtml(run) {
        const special = run.map.memory ? _t('기억 {memory}단계', { memory: run.map.memory }) : RUN_KIND[atlas.node(run.map.node)?.kind];
        if (special) return `<span class="atlas-hud-chip">${escapeHTML(_t(special))}</span>`;
        return `<span class="atlas-hud-chip rarity-${run.map.rarity}">${escapeHTML(_t(ATLAS.rarities[run.map.rarity].name))}</span>`;
    }
    /** Portals left as lit pips out of the run's portals (a ring map has none: losing or leaving ends it). */
    function hudPortalsHtml(run) {
        if (run.board) return `<span class="atlas-hud-chip">${_t('포털 없음')}</span>`;
        const total = ATLAS.portals + run.bonus.portals, tip = _t('포털 {portals}/{value}', { portals: run.portals, value: total });
        const pips = Array.from({ length: total }, (_, index) => `<i${index < run.portals ? ' class="is-on"' : ''}></i>`).join('');
        return `<span class="atlas-hud-chip atlas-hud-portals" data-tip="${escapeHTML(tip)}"><small>${_t('포털')}</small>${pips}</span>`;
    }
    function updateHud(zone) {
        const host = document.getElementById('ui-atlas-combat');
        if (!host) return;
        // The settlement pause still shows the cleared map; the next map's HUD waits until the hero enters it.
        const run = ledger().run, show = !!run && zone && zone.type === 'atlasMap' && !actExplorationState.current(game)?.departure;
        host.toggleAttribute('hidden', !show);
        if (!show) { hudSignature = ''; return; }
        const key = JSON.stringify([run.map.uid, run.portals, run.encounters]);
        if (key === hudSignature) return;
        hudSignature = key;
        // 지도 이름은 위의 지역 이름과 같고, 주운 지도석과 각인 수는 싸우는 동안 볼 일이 없다(2026-11-06 사용자): 등급, 종류, 방, 징조, 포털만.
        const rooms = run.encounters.map(type => `<span class="atlas-hud-chip is-room">${escapeHTML(encounterNames([type], run.golden || []))}</span>`).join('');
        host.innerHTML = `<span class="atlas-hud-chip atlas-hud-tier" style="${tierStyle(run.map.tier)}">${_t('{tier}등급', { tier: run.map.tier })}</span>${hudKindHtml(run)}${rooms}${omenChipHtml(run.map)}${hudPortalsHtml(run)}
            <button type="button" class="combat-action-btn" onclick="atlasUi.openPanel()">${_t('아틀라스')}</button>`;
    }
    const REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
    function dropsText(detail) {
        const parts = [];
        if (detail.room) parts.push(`${detail.golden ? `${ATLAS.goldenRoom.prefix} ` : ''}${ATLAS.encounters[detail.room].name} 정리: ${detail.rewards.map(([key, n]) => `${_t(ORB_DB[key].name)} ${n}`).join(', ') || _t('보상 없음')}`);
        if (detail.maps.length) parts.push(`지도석 ${detail.maps.map(map => `${nodeName(map.node)}(${map.tier})`).join(', ')}`);
        if (detail.fragments.length) parts.push(`각인 ${detail.fragments.map(id => atlas.fragment(id).name).join(', ')}`);
        // 깨어난 뒤 제단 · 리그 방의 재료(js/atlas-endgame.js roomItems): 보스를 잡아야 보관함에 들어온다.
        if (detail.late && detail.late.length) parts.push(`${detail.late.map(([id, n]) => `${atlasEndgame.itemName(id)} ${n}`).join(', ')} (보스를 잡으면 받음)`);
        return `🗺️ ${parts.join(', ')}`;
    }
    function logClass(detail) {
        if (detail.kind === 'failed') return 'death';
        return detail.kind === 'complete' && (detail.first || detail.bonus || detail.seed) ? 'loot-unique' : 'season-up';
    }
    function autoReturnText(detail) {
        const lock = atlas.lockReason(game);
        if (lock) return _t(' → 자동 지도 대기: {lock}', { lock });
        if (!ledger().stash.length) return ' → 지도석이 없어 원래 사냥터로 돌아갑니다.';
        return _t(' → {tier}등급 이하 지도석이 없어 원래 사냥터로 돌아갑니다.', { tier: detail.tier });
    }
    /** Explain why a completed run did not chain; manual special challenges never advertise an automatic stone spend. */
    function returnText(detail) {
        if (detail.board) return ' → 심재의 나이테에서 다음 길을 고르세요.';
        if (detail.next) return '';
        if (game.settings.mapCompleteAction === 'stop') return ' → 완료 후 멈춤 설정으로 전투를 멈춥니다.';
        const special = detail.memory?.spoils || !['map', 'guardian'].includes(atlas.node(detail.nodeId).kind);
        if (special) return ' → 특수 도전을 마치고 원래 사냥터로 돌아갑니다.';
        if (ledger().autoMap) return autoReturnText(detail);
        const left = ledger().stash.length;
        return left ? _t(' → 원래 사냥터로 돌아갑니다. 남은 지도석 {left}개는 아틀라스에서 고르세요.', { left }) : '';
    }
    function announce(detail) {
        const text = {
            board: () => detail.message,
            omen: () => _t('🔮 뿌리를 품은 몬스터에게서 {name}를 얻었습니다.', { name: _t(ORB_DB[detail.key].name) }),
            complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? _t(', 첫 완료') : ''}${detail.bonus ? _t(', 보너스 달성') : ''}${detail.drops ? _t(', 지도석 {drops}개', { drops: detail.drops }) : ''}`
                + (detail.ticket ? `, ${_t(ORB_DB[detail.ticket].name)}` : '') + (detail.seed ? _t(', 세계수 씨앗 {seeds}/{max}', { seeds: detail.seeds, max: ATLAS.seeds.max }) : '')
                + (detail.next ? _t(' → 다음 지도: {next}', { next: nodeName(detail.next) }) : returnText(detail)),
            portal: () => _t('🌀 {REASON}, 남은 포털 {portals}', { REASON: REASON[detail.reason] || detail.reason, portals: detail.portals }),
            failed: () => _t('🗺️ {REASON}, 포털이 모두 닫혀 지도가 실패했습니다.', { REASON: REASON[detail.reason] || detail.reason }),
            drops: () => dropsText(detail),
            starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? _t(', 지도석 {count}개', { count: detail.count }) : ''}` : _t('🌳 이번 루프의 지도석 {count}개가 보관함에 들어왔습니다.', { count: detail.count })
        }[detail.kind];
        if (!text) return;
        addLog(text(), logClass(detail));
        if (detail.kind === 'complete' && (detail.lost || detail.lostFragments)) addLog(_t('보관 한도가 가득 차 {detail}를 보관하지 못했습니다.', { detail: lostRewards(detail).join(', ') }), 'attack-monster');
        if (detail.kind === 'starter' && detail.opened) queueTutorialNotice('unlock_world_tree_atlas', _t('세계수 아틀라스'),
            _t('혼돈 20 너머에서 세계수 아틀라스가 열렸습니다.\n‘지도 → 세계수 아틀라스’에서 지도석을 골라 지도 장치로 여세요. 보스를 잡으면 노드가 완료되고 이웃 노드가 열립니다.'), 'tab-map', 'map-explore-worldtree');
        signature = '';
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    // journey: the next-goal card's title, text, label and action (the world map's 바로 가기 row, js/world-map-brief-ui.js).
    return Object.freeze({ render, refresh, updateHud, openPanel, setView, pages, progressLine, journey: journeyState, selectRegion, selectNode, openNode, selectMap, revealDevice, revealStash, hint, nodeLabel, craft, flowerOmen, goldenFlowerOmen, discard, discardLow, combine, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto, toggleAutoGuardians });
})();
safeExposeGlobals({ atlasUi });
