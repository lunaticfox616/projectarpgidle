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
    /** Content room names; a golden room (data/atlas.js goldenRoom) carries its prefix. */
    const encounterNames = (types, golden = []) => types.map(type => `${golden.includes(type) ? `${ATLAS.goldenRoom.prefix} ` : ''}${ATLAS.encounters[type].name}`).join(', ');

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
    function selectNode(id, reveal = false) {
        if (!atlas.node(id)) return;
        hideInfoTooltip(); // a tap also fires the hover card; the detail panel shows the node now
        selectedNode = id;
        const maps = ledger().stash.filter(map => map.node === id);
        if (maps.length && !maps.some(map => map.uid === selectedUid)) selectedUid = maps[0].uid;
        render();
        if (reveal) document.querySelector('#ui-atlas .atlas-node-detail')?.scrollIntoView({ block: 'start' });
    }
    function selectMap(uid, reveal = false) {
        const map = ledger().stash.find(entry => entry.uid === uid);
        if (!map) return;
        selectedUid = uid;
        selectedNode = map.node;
        render();
        if (reveal) revealDevice();
    }
    function revealDevice() {
        document.querySelector('#ui-atlas .atlas-device')?.scrollIntoView({ block: 'start' });
    }
    function revealStash() {
        document.querySelector('#ui-atlas .atlas-stash')?.scrollIntoView({ block: 'start' });
    }
    async function discard() {
        const map = selectedMap(), busy = atlas.runOpenReason(game);
        if (!map) return;
        if (busy) return addLog(busy, 'attack-monster');
        const name = `${nodeName(map.node)} ${map.tier}등급 ${ATLAS.rarities[map.rarity].name}`;
        const ok = await requestGameConfirmation(`${name} 지도석 1개를 버릴까요?\n지도석과 제작에 쓴 재화는 돌려받을 수 없습니다.`,
            { title: '지도석 버리기', tone: 'danger', confirmLabel: '버리기', cancelLabel: '취소', dismissOnBackdrop: false });
        if (!ok) return;
        if (selectedMap() !== map) return addLog('선택한 지도석이 바뀌어 버리기를 취소했습니다.', 'attack-monster');
        const reason = atlas.discard(game, map.uid);
        if (reason) return addLog(reason, 'attack-monster');
        selectedUid = null;
        addLog(`🗺️ ${name} 지도석 1개를 버렸습니다.`, 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function craft(key) {
        const map = selectedMap();
        if (!map) return;
        const cost = [{ key, amount: 1 }];
        const reason = atlasMaps.craftReason(map, key) || (canPayCurrencyCosts(cost) ? '' : `${withSubjectParticle(ORB_DB[key].name)} 없습니다.`);
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
    /** Closing loses the entry cost and boss-held rewards; ordinary ground loot is collected by the exit flow. */
    async function abandon() {
        const run = ledger().run;
        if (!run) return;
        const ok = await requestGameConfirmation(abandonMessage(run), { title: '지도 닫기', tone: 'danger', confirmLabel: '지도 닫기', cancelLabel: '취소', dismissOnBackdrop: false });
        if (!ok || ledger().run !== run) return;
        if (atlasRun.abandon()) addLog('🗺️ 지도를 닫았습니다.', 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function abandonMessage(run) {
        const held = run.drops.length + run.found.length, kind = atlas.node(run.map.node)?.kind;
        // 지도석 없이 연 싸움은 바친 것을 잃는다(정점은 입장권, 최종 보스와 리그 우두머리는 재료, 기억 싸움은 그 기억).
        const offering = run.board ? `보관 재화 ${atlasBoard.lossPctFor(ledger().board, run.board.boss)}%` : run.map.memory ? `보스의 기억 ${run.map.memory}단계` : kind === 'pinnacle' ? '바친 입장권' : (RUN_KIND[kind] ? '바친 재료' : '지도석');
        const lost = [offering, held ? `보류 중인 지도석과 각인 ${held}개` : '', heldLate(run)].filter(Boolean).join(', ');
        return `${run.board ? run.board.name : nodeName(run.map.node)} 지도를 닫을까요?\n손실: ${lost}\n일반 장비와 재화, 바닥 전리품은 남습니다.${run.board ? '\n다음 진입에는 심재 주사위 1개가 필요합니다.' : ''}`;
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
    /** The dot drawings of the current view: the chart, the passive wheels (the epoch and late views have none). */
    const PAINT = { maps: () => paintChart(), passives: () => atlasPassivesUi.paint(), epoch: () => {}, late: () => {}, memory: () => {}, board: () => {} };
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
        const where = region ? `, ${region.name}` : '';
        showInfoTooltipHtml(event.clientX, event.clientY, `<div class="tooltip-title">${escapeHTML(node.name)}</div>
            <div class="tooltip-line">${atlas.effectiveTier(game, node)}등급, ${STATUS[atlas.status(game, id)]}${where}</div>
            <div class="tooltip-line">${kind}, 보스 ${escapeHTML(node.boss)}</div>`, region ? region.tint : '#d9b066');
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
        // data-info-tooltip-anchor: js/ui.js의 mousemove 감시가 이 표시가 없는 곳의 툴팁을 바로 지워, 지도 이름이 뜨자마자 사라졌다(2026-10-25 사용자).
        return `<button class="${classes}" style="--x:${x}%;--y:${y}%" data-atlas-node="${node.id}" data-info-tooltip-anchor="1" aria-pressed="${node.id === selectedNode}"
            aria-label="${escapeHTML(node.name)} ${tier}등급 ${STATUS[status]}" onclick="atlasUi.selectNode('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><b>${tier}</b>${held ? `<i>${held}</i>` : ''}</button>`;
    }

    // ---------------------------------------------------------------- side: open map, map device, node
    /** 지도 기운(js/loot-omens.js): 이름, 무엇이 잘 나오는지, 세기(지도석 희귀도와 타락). 기운이 없는 예전 지도석은 빈칸. */
    function omenHtml(map) {
        const found = lootOmens.of(map);
        if (!found) return '';
        const omen = lootOmens.describe(found.omen.id);
        return `<p class="atlas-omen" style="--omen:${omen.tone}"><b>${escapeHTML(omen.name)}</b><small>세기 ×${found.strength}</small>`
            + `<span>${escapeHTML(omen.note)}</span></p>`;
    }
    function omenChipHtml(map) {
        const omen = map.omen && lootOmens.describe(map.omen);
        return omen ? `<i class="atlas-omen-chip" style="--omen:${omen.tone}">${escapeHTML(omen.name)}</i>` : '';
    }
    function mapCardHtml(map, extra = '') {
        // 지도석 없이 연 싸움(정점, 최종 보스, 리그 우두머리)은 희귀도 · 옵션 · 수량 없이 무엇인지만.
        const special = RUN_KIND[atlas.node(map.node)?.kind];
        if (special) return `<div class="atlas-map-card"><strong>${escapeHTML(nodeName(map.node))}</strong><span class="atlas-map-tags">${map.tier}등급, ${special}</span>${extra}</div>`;
        const fx = atlasMaps.effects(map), rule = ATLAS.rarities[map.rarity];
        const mods = map.mods.map(entry => `<li>${escapeHTML(atlasMaps.describe(entry))}</li>`).join('');
        const tags = [`${map.tier}등급`, rule.name, map.quality ? `품질 ${map.quality}%` : '', map.corrupted ? '타락' : '',
            fx.overTiers ? `고등급 보상 ${fx.overTiers}단계` : ''].filter(Boolean).join(', ');
        return `<div class="atlas-map-card rarity-${map.rarity}${map.corrupted ? ' is-corrupted' : ''}"><strong>${escapeHTML(nodeName(map.node))}</strong>
            <span class="atlas-map-tags">${tags}</span>${omenHtml(map)}${mods ? `<ul class="atlas-mods">${mods}</ul>` : '<p class="atlas-muted">옵션 없음</p>'}
            <p class="atlas-rewards">아이템 수량 +${fx.quantity}%, 희귀도 +${fx.rarity}%${fx.packExtra ? `, 무리 +${fx.packExtra}` : ''}</p>${extra}</div>`;
    }
    /** Late materials the open map holds until its boss falls (js/atlas-endgame.js roomItems), as "성화 잉걸 8, 공허 조각 3". */
    const heldLate = run => Object.entries((run.endgame && run.endgame.items) || {}).map(([id, n]) => `${atlasEndgame.itemName(id)} ${n}`).join(', ');
    function runHtml(run) {
        const total = run.board ? 1 : ATLAS.portals + run.bonus.portals, late = heldLate(run);
        const portals = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
        const inside = atlas.inMap(game), rooms = run.encounters.length ? `<p class="atlas-encounters">콘텐츠 방: ${encounterNames(run.encounters, run.golden || [])}</p>` : '';
        return `<section class="atlas-device is-running" aria-label="열린 지도"><h3>열린 지도</h3>
            ${mapCardHtml(run.map, `${rooms}<p class="atlas-portals" aria-label="남은 포털 ${run.portals}">포털 ${portals}</p>
            <p class="atlas-muted">맵에서 얻은 지도석 ${run.drops.length}개, 각인 ${run.found.length}개, 보스를 잡으면 보관함으로</p>
            ${late ? `<p class="atlas-muted">후반부 재료 ${late} (보스를 잡으면 받음)</p>` : ''}`)}
            <div class="atlas-actions">${inside ? '<button class="atlas-primary" onclick="switchTab(\'tab-battle\')">전투 보기</button>'
                : '<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>'}
            <button onclick="atlasUi.abandon()">지도 닫기</button></div></section>`;
    }
    function fragmentsHtml() {
        const st = ledger(), slots = atlas.slots(game);
        // 새 각인은 그 방이 열리는 루프부터 보인다(이미 가진 것과 끼운 것은 그대로, js/atlas.js fragmentOpen).
        const shown = ATLAS.fragments.filter(fragment => atlas.fragmentOpen(fragment, game.season) || st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
        const chips = shown.map(fragment => {
            const count = st.fragments[fragment.id] || 0, on = st.loadout.includes(fragment.id);
            return `<button class="atlas-fragment${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="atlasUi.toggleFragment('${fragment.id}')"
                ${!on && !count ? 'disabled' : ''} data-tip="${escapeHTML(fragmentText(fragment))}"><span>${fragment.name}</span><small>${count}</small></button>`;
        }).join('');
        return `<div class="atlas-fragments" aria-label="각인 홈"><p class="atlas-muted">각인 홈 ${st.loadout.length}/${slots}, 지도를 열 때 하나씩 씀</p>${chips}</div>`;
    }
    function fragmentText(fragment) {
        const room = fragment.encounter ? ATLAS.encounters[fragment.encounter].name : '';
        if (room) return `${room}${room.endsWith('방') ? '' : ' 방'}이 반드시 생긴다`;
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
        const altars = atlasEndgame.awakened(game) ? `<p class="atlas-encounters">제단 확률: ${rows(true)} (지도마다 ${ATLAS.altarLimit}개까지)</p>` : '';
        // 황금 방(data/atlas.js goldenRoom): 콘텐츠 방마다 이 확률로 황금 방이 된다(보상 3배와 귀한 재료).
        const golden = `황금 방 ${ATLAS.goldenRoom.chance + (bonus.goldenRoom || 0)}% (보상 ${ATLAS.goldenRoom.rewardMul}배)`;
        return `<p class="atlas-encounters">콘텐츠 방 확률: ${rows(false)} (지도마다 ${atlasEncounters.roomLimit(bonus, game.season)}개까지), ${golden}</p>${altars}`;
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
        return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''}${reason ? ` data-tip="${escapeHTML(reason)}"` : ''}>
            <span>${window.getStyledOrbName(key)}</span><small>${atlasMaps.crafts[key].label}, ${have}</small></button>`;
    }
    const TICKET = key => ORB_DB[key].name.replace('그림자 뿌리 입장권: ', '');
    function nodeDetailHtml() {
        const node = atlas.node(selectedNode);
        if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
        if (node.kind === 'pinnacle') return pinnacleHtml(node);
        const region = ATLAS.regions.find(row => row.id === node.region), status = atlas.status(game, node.id), tier = atlas.effectiveTier(game, node);
        const maps = ledger().stash.filter(map => map.node === node.id).sort((a, b) => b.tier - a.tier);
        const kind = node.kind === 'guardian' ? `<p class="atlas-guardian-note">지역 수호자, 처치마다 뿌리 입장권(${node.ticket ? TICKET(node.ticket) : '가장 적은 종류'}), 지도석은 이 지역 ${ATLAS.guardianRules.minTier}등급 이상 보스가 떨어뜨립니다</p>${itemInfluencesUi.sourceHtml('guardian')}` : '';
        return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${region.name}, ${STATUS[status]}</small><h3>${escapeHTML(node.name)}</h3>
            <p>${tier}등급, ${terrainOf(node)}, 보스 ${escapeHTML(node.boss)}</p>${kind}
            <p class="atlas-muted">장비 T${atlas.lootTier(tier)}까지, 혼돈 ${atlas.equivalentDepth(tier)} 상당</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(stashRowHtml).join('')}</div>` : '<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>'}</section>`;
    }
    /** 정점: 입장권 4종 · 씨앗 · 열기. 지도석이 아니라 입장권으로 연다. */
    function pinnacleHtml(node) {
        const tier = atlas.effectiveTier(game, node), reason = atlas.pinnacleReason(game) || atlasRun.blockReason(), busy = !!ledger().run;
        const tickets = ATLAS.pinnacle.tickets.map(key => `<span class="${(game.currencies[key] || 0) >= 1 ? 'is-on' : ''}">${TICKET(key)} ${Math.floor(game.currencies[key] || 0)}</span>`).join('');
        return `<section class="atlas-node-detail atlas-pinnacle-detail"><small>정점, 세계수 씨앗 ${ledger().seeds}/${ATLAS.seeds.max}</small><h3>${escapeHTML(node.name)}</h3>
            <p>${tier}등급, 투기장, 보스 ${ATLAS.pinnacle.stages}단계</p><div class="atlas-tickets">${tickets}</div>
            <p class="atlas-muted">${ledger().seeds >= ATLAS.seeds.max ? `세계수 씨앗 ${ATLAS.seeds.max}개를 다 모아 더는 나오지 않습니다(시대 재생 뒤 다시).` : `처치하면 세계수 씨앗 하나(최대 ${ATLAS.seeds.max}).`} 씨앗마다 모든 노드 등급 +${ATLAS.seeds.tierStep}. 씨앗 ${BEYOND_BOUNDARY_UNLOCK_SEEDS}개면 경계 너머가 루프 50 전에 열립니다(관측자 처치 필요).</p>
            ${atlasEndgame.awakened(game) ? '' : '<p class="atlas-muted">처음 쓰러뜨리면 아틀라스가 깨어나 최종 보스가 열립니다.</p>'}
            ${reason && !busy ? `<p class="atlas-lock">${reason}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.openPinnacle()" ${reason ? 'disabled' : ''}>정점 열기</button></div></section>`;
    }

    // ---------------------------------------------------------------- stash, result, header
    function stashRowHtml(map) {
        return `<button class="atlas-stash-row rarity-${map.rarity}" aria-pressed="${map.uid === selectedUid}" onclick="atlasUi.selectMap(${map.uid})">
            <b>${map.tier}</b><span>${escapeHTML(nodeName(map.node))}${omenChipHtml(map)}</span><small>${ATLAS.rarities[map.rarity].name}${map.mods.length ? `, 옵션 ${map.mods.length}` : ''}${map.quality ? `, ${map.quality}%` : ''}${map.corrupted ? ', 타락' : ''}</small></button>`;
    }
    function stashHtml() {
        const maps = [...ledger().stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
        const selected = selectedMap(), busy = atlas.runOpenReason(game), full = maps.length >= ATLAS.stashCap;
        const capacity = full ? '보관함이 가득 찼습니다.' : `빈자리 ${ATLAS.stashCap - maps.length}칸`;
        const management = selected ? `<div class="atlas-stash-management"><p><strong>선택: ${escapeHTML(nodeName(selected.node))}</strong><span>${selected.tier}등급, ${ATLAS.rarities[selected.rarity].name}${selected.quality ? `, 품질 ${selected.quality}%` : ''}${selected.corrupted ? ', 타락' : ''}</span></p>
            <button class="atlas-discard" onclick="atlasUi.discard()" ${busy ? 'disabled' : ''}>선택 지도석 버리기</button>${busy ? `<small>${busy}</small>` : ''}</div>` : '';
        return `<section class="atlas-stash" aria-label="지도석 보관함"><h3>지도석 보관함 <span>${maps.length}/${ATLAS.stashCap}</span></h3>
            <p class="atlas-stash-capacity${full ? ' is-full' : ''}" role="status">${capacity}</p>${management}
            ${maps.length ? `<div class="atlas-stash-list">${maps.map(stashRowHtml).join('')}</div>` : '<p class="atlas-muted">비어 있습니다. 보관함은 루프마다 비워집니다.</p>'}</section>`;
    }
    // 이번 판의 발견: 바닥 빛기둥과 같은 판정(js/loot.js lootMoments)으로 좋은 것부터 칩 8개까지.
    const momentClass = moment => (moment ? ` moment-${moment}` : '');
    const LEAF_RANK = 1.5;
    function itemFind(row) {
        const name = row.rarity === 'unique' ? `「${escapeHTML(row.name)}」` : escapeHTML(row.name);
        return { rank: lootMoments.rank(row.moment), html: `<span class="atlas-find rarity-${row.rarity}${momentClass(row.moment)}" data-tip="${escapeHTML(getItemSlotDisplayLabel(null, row.slot))}">${row.fresh ? '<em>새</em>' : ''}${name}</span>` };
    }
    function leafFind([id, count]) {
        const leaf = memoryLeaves.leaf(id);
        return { rank: LEAF_RANK, html: `<span class="atlas-find is-leaf">${renderPixelIcon('leaf', 'atlas-find-leaf')}${escapeHTML(leaf ? leaf.name : id)}${count > 1 ? ` <b>×${count}</b>` : ''}</span>` };
    }
    function yarnFind([id, count]) {
        return { rank: 1, html: `<span class="atlas-find">실타래 ${escapeHTML(knitting.row(id).name)} <b>×${count}</b></span>` };
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
        return [result.first && '첫 완료', result.bonus && '보너스 달성', result.drops && `지도석 ${result.drops}개`,
            result.fragments && `각인 ${result.fragments}개`, result.seed && `세계수 씨앗 +1 (${result.seeds}/${ATLAS.seeds.max})`,
            result.endgame?.awakened && '아틀라스 후반부 개방'].filter(Boolean).join(', ');
    }
    /** The atlas's own materials are outside the wallet receipt. Show the amounts actually kept at completion. */
    function resultMaterialsHtml(result) {
        const spoils = result.endgame;
        if (!spoils) return '';
        const items = [...spoils.items, ...(spoils.invite ? [['ringInvite', spoils.invite]] : [])];
        if (!items.length) return '';
        return `<div class="atlas-result-currencies"><small>후반부 재료</small>${items.map(([id, n]) =>
            `<span>${escapeHTML(atlasEndgame.itemName(id))} <b>+${n}</b></span>`).join('')}</div>`;
    }
    function receiptHtml(receipt) {
        const none = '<span class="atlas-muted">기록된 재화 없음</span>';
        if (!receipt) return `<div class="atlas-result-currencies">${none}</div>`;
        const finds = findsHtml(receipt);
        const currencies = Object.entries(receipt.currencies).map(([key, n]) => `<span>${window.getStyledOrbName(key)} <b>+${n}</b></span>`).join('');
        return `${finds ? `<div class="atlas-result-finds" aria-label="이번 판의 발견"><small>이번 판의 발견</small>${finds}</div>` : ''}
            <div class="atlas-result-currencies"><small>재화 ${Object.keys(receipt.currencies).length}종, 장비 ${receipt.equipmentCount}개</small>${currencies || none}</div>`;
    }
    function resultHtml() {
        const result = ledger().lastResult;
        if (!result) return '';
        const done = result.outcome === 'complete', recalled = result.memory?.foughtTier;
        return `<section class="atlas-result${done ? '' : ' is-failed'}" aria-label="지난 지도 결과"><h3>${escapeHTML(nodeName(result.nodeId))}${recalled ? ` (기억 ${recalled}단계)` : ''} ${result.tier}등급 ${done ? '완료' : '실패'}<span>${resultNotes(result)}</span></h3>
            ${done ? overflowHtml(result) : failureHtml(result)}${resultMemoryHtml(result)}${resultMaterialsHtml(result)}${receiptHtml(result.loot)}</section>`;
    }
    function lostRewards(result) {
        return [result.lost && `지도석 ${result.lost}개`, result.lostFragments && `각인 ${result.lostFragments}개`,
            ...(result.lostMaterials || []).map(([id, count]) => `${atlasEndgame.itemName(id)} ${count}개`)].filter(Boolean);
    }
    function overflowHtml(result) {
        const lost = lostRewards(result);
        if (!lost.length) return '';
        return `<div class="atlas-result-loss"><p>보관 한도 초과: ${escapeHTML(lost.join(', '))}는 보관하지 못했습니다.</p></div>`;
    }
    function resultMemoryHtml(result) {
        const memory = result.memory;
        if (!memory) return '';
        const record = memory.newBest ? `<p>기억 최고 기록 갱신 (${memory.foughtTier}단계)</p>` : '';
        const ticket = memory.ticket;
        if (!ticket) return record ? `<div class="atlas-result-memory">${record}</div>` : '';
        const name = atlas.node(ticket.node).boss;
        return `<div class="atlas-result-memory">${record}<p>기억 획득: ${escapeHTML(name)} ${ticket.tier}단계 +1</p>
            <button onclick="atlasUi.setView('memory');memoryDungeonUi.select('${ticket.node}',${ticket.tier})">기억 준비 보기</button></div>`;
    }
    function failureHtml(result) {
        const lost = lostRewards(result);
        return `${lost.length ? `<div class="atlas-result-loss"><p>보류 보상 손실: ${escapeHTML(lost.join(', '))}</p></div>` : ''}
            ${!ledger().run && ledger().stash.length ? '<div class="atlas-actions"><button onclick="atlasUi.revealStash()">다음 지도석 고르기</button></div>' : ''}`;
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
        if (st.run) return `열린 지도: ${nodeName(st.run.map.node)}`;
        return (!st.unlocked && atlas.lockReason(game)) || `지도석 ${st.stash.length}개, 완료 ${st.completed.length}곳`;
    }
    function headerHtml() {
        // 깨어난 아틀라스는 최종 보스와 리그 우두머리만큼 넓어진다(그 처치도 완료이자 아틀라스 포인트).
        const st = ledger(), total = atlas.nodes.length + (atlasEndgame.awakened(game) ? atlas.lateNodes.length : 0), free = atlasPassives.spendable(game);
        const stat = (label, value, tone) => `<span class="atlas-stat" style="--stat-tone:${tone}">${label} <b>${value}</b></span>`;
        const stats = stat('완료', `${st.completed.length}/${total}`, '#d9b066') + stat('보너스', st.bonus.length, '#9fd46a')
            + stat('씨앗', `${st.seeds}/${ATLAS.seeds.max}`, '#c9a0f0') + stat('포인트', `${atlas.points(game)}${free ? ` (남음 ${free})` : ''}`, '#7fd6cf');
        return `<header class="atlas-head"><span class="atlas-stats">${stats}</span>
            <label class="atlas-auto" data-tip="완료하면 같은 등급 이하에서 다음 지도석을 연다"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>자동 지도</span>
            <small>완료하면 같은 등급 이하에서 다음 지도석을 연다</small></label></header>`;
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
        if (missing) return { title: '수호자 지도석 준비됨', text: `${nodeName(missing.node)} ${missing.tier}등급`,
            action: `atlasUi.selectMap(${missing.uid},true)`, label: '수호자 준비 보기' };
        const maps = [...stash].sort((a, b) => a.tier - b.tier || a.uid - b.uid), map = selectedMap() || maps[0];
        if (map) return { title: `지도석 ${stash.length}개 준비됨`, text: `${nodeName(map.node)} ${map.tier}등급`,
            action: `atlasUi.selectMap(${map.uid},true)`, label: '지도 준비 보기' };
        return { title: '다음 지도석 모으기', text: '혼돈 20 이상 보스가 지도석을 줍니다.',
            ...huntingJourneyAction() };
    }
    function journeyState() {
        const st = ledger(), lock = atlas.lockReason(game);
        if (st.run) return { title: '열린 지도 진행 중', text: `${nodeName(st.run.map.node)}, 남은 포털 ${st.run.portals}개`,
            action: 'atlasUi.revealDevice()', label: '열린 지도 보기' };
        if (lock) return { title: '이번 루프의 입장 준비', text: lock,
            ...huntingJourneyAction() };
        if (st.seeds >= ATLAS.seeds.max) return { title: '씨앗을 모두 모았습니다', text: '',
            action: "atlasUi.setView('late')", label: '최종 보스 보기', epoch: true };
        if (ATLAS.pinnacle.tickets.every(key => game.currencies[key] >= 1)) return { title: '정점 입장권 4종 준비됨',
            text: '',
            action: "atlasUi.selectNode('pinnacle',true)", label: '정점 준비 보기' };
        return mapJourney();
    }
    function journeyHtml() {
        const next = journeyState();
        return `<section class="atlas-journey" aria-label="아틀라스 다음 목표"><div><h3>${next.title}</h3>${next.text ? `<p>${escapeHTML(next.text)}</p>` : ''}</div>
            <div class="atlas-actions"><button class="atlas-primary" onclick="${next.action}">${next.label}</button>${next.epoch ? '<button onclick="atlasUi.setView(\'epoch\')">시대 재생 비교</button>' : ''}</div></section>`;
    }
    function autoOptionsHtml() {
        const st = ledger();
        if (!st.autoMap) return '';
        const stop = game.settings.mapCompleteAction === 'stop';
        return `<section class="atlas-auto-options" aria-label="자동 지도 설정"><label><input type="checkbox" ${st.autoGuardians ? 'checked' : ''} onchange="atlasUi.toggleAutoGuardians(this.checked)">수호자 지도 포함</label>
            ${stop ? '<p>완료 후 멈춤 설정으로 자동 지도가 대기 중입니다.</p>' : ''}
            ${stop ? '<button onclick="openMapCompleteActionPicker(event)">완료 후 행동 변경</button>' : ''}</section>`;
    }
    function mapsViewHtml() {
        return `${journeyHtml()}${autoOptionsHtml()}<div class="atlas-main"><div class="atlas-chart-column">${legendHtml()}${chartHtml()}</div><div class="atlas-side">${ledger().run ? runHtml(ledger().run) : deviceHtml()}${nodeDetailHtml()}</div></div>
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
        const wallet = [...CRAFT_ORDER, ...ATLAS.pinnacle.tickets].map(key => game.currencies[key] || 0);
        if (!viewOpen(view)) view = 'maps'; // 다른 저장을 불러와 원정이 닫힌 뒤
        const key = JSON.stringify([view, ledger(), selectedNode, selectedUid, wallet, atlasRun.blockReason(), game.currentZoneId, game.maxZoneId, game.settings.mapCompleteAction, getPersistentBuildSignature(game)]);
        if (key === signature && panel.innerHTML) return;
        signature = key;
        const lock = atlas.lockReason(game);
        panel.innerHTML = `<div class="atlas-shell">${headerHtml()}${lock && !ledger().unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            ${VIEWS[view]()}</div>`;
        PAINT[view]();
        watchPanel(panel);
    }

    // ---------------------------------------------------------------- combat HUD and log lines
    /** Fights opened without a map item say what they are instead of the (always normal) rarity. */
    const RUN_KIND = { pinnacle: '정점', apex: '최종 보스', league: '리그 우두머리' };
    function hudTags(run) {
        const rooms = run.encounters.length ? `, ${encounterNames(run.encounters, run.golden || [])}` : '';
        const kind = run.map.memory ? `기억 ${run.map.memory}단계` : RUN_KIND[atlas.node(run.map.node)?.kind] || ATLAS.rarities[run.map.rarity].name;
        return `${run.map.tier}등급, ${kind}${rooms}`;
    }
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
        host.innerHTML = `<div class="atlas-hud-copy"><strong>${escapeHTML(zone.name)} <span>${hudTags(run)}</span>${omenChipHtml(run.map)}</strong>
            <span>${run.board ? '심재의 나이테, 지거나 귀환하면 지도가 끝납니다' : `포털 ${run.portals}/${ATLAS.portals + run.bonus.portals}, 지도석 ${run.drops.length}, 각인 ${run.found.length} 보관 중`}</span></div>
            <div class="atlas-hud-actions"><button onclick="atlasUi.openPanel()">아틀라스</button></div>`;
    }
    const REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
    function dropsText(detail) {
        const parts = [];
        if (detail.room) parts.push(`${detail.golden ? `${ATLAS.goldenRoom.prefix} ` : ''}${ATLAS.encounters[detail.room].name} 정리: ${detail.rewards.map(([key, n]) => `${ORB_DB[key].name} ${n}`).join(', ') || '보상 없음'}`);
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
        if (lock) return ` → 자동 지도 대기: ${lock}`;
        if (!ledger().stash.length) return ' → 지도석이 없어 원래 사냥터로 돌아갑니다.';
        return ` → ${detail.tier}등급 이하 지도석이 없어 원래 사냥터로 돌아갑니다.`;
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
        return left ? ` → 원래 사냥터로 돌아갑니다. 남은 지도석 ${left}개는 아틀라스에서 고르세요.` : '';
    }
    function announce(detail) {
        const text = {
            board: () => detail.message,
            dice: () => '나이테 길잡이에게서 심재 주사위 1개를 얻었습니다.',
            omen: () => `🔮 뿌리를 품은 몬스터에게서 ${ORB_DB[detail.key].name}를 얻었습니다.`,
            complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? ', 첫 완료' : ''}${detail.bonus ? ', 보너스 달성' : ''}${detail.drops ? `, 지도석 ${detail.drops}개` : ''}`
                + (detail.ticket ? `, ${ORB_DB[detail.ticket].name}` : '') + (detail.seed ? `, 세계수 씨앗 ${detail.seeds}/${ATLAS.seeds.max}` : '')
                + (detail.next ? ` → 다음 지도: ${nodeName(detail.next)}` : returnText(detail)),
            portal: () => `🌀 ${REASON[detail.reason] || detail.reason}, 남은 포털 ${detail.portals}`,
            failed: () => `🗺️ ${REASON[detail.reason] || detail.reason}, 포털이 모두 닫혀 지도가 실패했습니다.`,
            drops: () => dropsText(detail),
            starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? `, 지도석 ${detail.count}개` : ''}` : `🌳 이번 루프의 지도석 ${detail.count}개가 보관함에 들어왔습니다.`
        }[detail.kind];
        if (!text) return;
        addLog(text(), logClass(detail));
        if (detail.kind === 'complete' && (detail.lost || detail.lostFragments)) addLog(`보관 한도가 가득 차 ${lostRewards(detail).join(', ')}를 보관하지 못했습니다.`, 'attack-monster');
        if (detail.kind === 'starter' && detail.opened) queueTutorialNotice('unlock_world_tree_atlas', '세계수 아틀라스',
            '혼돈 20 너머에서 세계수 아틀라스가 열렸습니다.\n‘지도 → 세계수 아틀라스’에서 지도석을 골라 지도 장치로 여세요. 보스를 잡으면 노드가 완료되고 이웃 노드가 열립니다.', 'tab-map', 'map-explore-worldtree');
        signature = '';
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ render, refresh, updateHud, openPanel, setView, pages, progressLine, selectNode, selectMap, revealDevice, revealStash, hint, craft, discard, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto, toggleAutoGuardians });
})();
safeExposeGlobals({ atlasUi });
