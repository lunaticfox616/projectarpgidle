/** 세계수 아틀라스 화면 (docs/atlas-endgame-20260930.md 3절): 방사형 노드 지도 · 지도 장치 · 지도석 제작 · 보관함 · 전투 HUD.
 * 상태는 js/atlas.js, 런 흐름은 js/atlas-run.js가 맡고, 여기서는 고르기 · 보여주기 · 기록만 한다.
 */
const atlasUi = (() => {
    let signature = '', hudSignature = '', selectedNode = null, selectedUid = null;
    const STATUS = { locked: '잠김', open: '열림', complete: '완료', bonus: '보너스' };
    const STYLE = { rooms: '방과 복도', maze: '미로', descent: '하강 갱도', islands: '떠 있는 섬', gauntlet: '연속 방', arena: '투기장' };
    const CRAFT_ORDER = ['magicBud', 'sapBud', 'formlessDew', 'blightSpore', 'pruningShears', 'goldenRule', 'deepWhetstone', 'emberBranch'];
    const ledger = () => game.atlas;
    const nodeName = id => atlas.node(id)?.name || '';
    const selectedMap = () => ledger().stash.find(map => map.uid === selectedUid) || null;
    const panelOpen = () => game.mapExploreSubtab === 'map-explore-worldtree' && game.mapSubtab === 'map-tab-zones';

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
    function selectNode(id) {
        if (!atlas.node(id)) return;
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
    function open() {
        const map = selectedMap();
        if (!map) return;
        const reason = atlasRun.open(map.uid);
        if (reason) return addLog(reason, 'attack-monster');
        selectedUid = null;
        refresh();
        switchTab('tab-battle');
    }
    function reenter() { atlasRun.reenter(); refresh(); switchTab('tab-battle'); }
    function abandon() {
        if (atlasRun.abandon()) addLog('🗺️ 지도를 닫았습니다. 지도석과 맵 안의 지도석 드롭은 사라집니다.', 'attack-monster');
        queueImportantSave(200);
        refresh();
    }
    function toggleAuto(on) {
        ledger().autoMap = !!on;
        queueImportantSave(200);
        refresh();
    }

    // ---------------------------------------------------------------- chart
    function chartHtml() {
        const rings = ATLAS.chart.radii.map(r => `<circle cx="50" cy="50" r="${r}"/>`).join('');
        const half = 180 / ATLAS.regions.length;
        const sectors = ATLAS.regions.map((_, i) => {
            const from = atlas.polar(i, half, 8), to = atlas.polar(i, half, 44);
            return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
        }).join('');
        const links = atlas.links.map(([a, b]) => {
            const p = atlas.position(atlas.node(a)), q = atlas.position(atlas.node(b));
            const lit = atlas.reachable(game, a) && atlas.reachable(game, b);
            return `<line class="${lit ? 'is-lit' : ''}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
        }).join('');
        return `<div class="atlas-chart" role="group" aria-label="세계수 아틀라스 노드"><svg class="atlas-lines" viewBox="0 0 100 100" aria-hidden="true">
            <g class="atlas-rings">${rings}</g><g class="atlas-sectors">${sectors}</g><g class="atlas-links">${links}</g></svg>
            ${regionLabelsHtml()}${atlas.nodes.map(nodeHtml).join('')}<span class="atlas-core" aria-hidden="true"></span></div>`;
    }
    function regionLabelsHtml() {
        return ATLAS.regions.map((region, i) => {
            const { x, y } = atlas.polar(i, 0, ATLAS.chart.labelRadius);
            const side = x < 25 ? 'start' : (x > 75 ? 'end' : 'center');
            return `<span class="atlas-region-label" data-side="${side}" style="--x:${x}%;--y:${y}%;--tint:${region.tint}">${region.name}</span>`;
        }).join('');
    }
    function nodeHtml(node) {
        const { x, y } = atlas.position(node), status = atlas.status(game, node.id);
        const held = ledger().stash.filter(map => map.node === node.id).length;
        const active = ledger().run?.map.node === node.id;
        const classes = ['atlas-node', `is-${status}`, node.id === selectedNode ? 'is-selected' : '', active ? 'is-running' : ''].join(' ');
        return `<button class="${classes}" style="--x:${x}%;--y:${y}%" data-atlas-node="${node.id}" aria-pressed="${node.id === selectedNode}"
            aria-label="${escapeHTML(node.name)} ${node.tier}등급 ${STATUS[status]}" onclick="atlasUi.selectNode('${node.id}')"><b>${node.tier}</b>${held ? `<i>${held}</i>` : ''}</button>`;
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
        const portals = Array.from({ length: ATLAS.portals }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
        const inside = atlas.inMap(game);
        return `<section class="atlas-device is-running" aria-label="열린 지도"><h3>열린 지도</h3>
            ${mapCardHtml(run.map, `<p class="atlas-portals" aria-label="남은 포털 ${run.portals}">포털 ${portals}</p>
            <p class="atlas-muted">맵에서 얻은 지도석 ${run.drops.length}개 · 보스를 잡으면 보관함으로</p>`)}
            <div class="atlas-actions">${inside ? '<button class="atlas-primary" onclick="switchTab(\'tab-battle\')">전투 보기</button>'
                : '<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>'}
            <button onclick="atlasUi.abandon()">지도 닫기</button></div></section>`;
    }
    function deviceHtml() {
        const map = selectedMap(), lock = atlas.lockReason(game);
        if (!map) return `<section class="atlas-device" aria-label="지도 장치"><h3>지도 장치</h3><p class="atlas-muted">${ledger().stash.length
            ? '보관함이나 노드에서 지도석을 고르세요.' : '지도석이 없습니다. 혼돈 20 이상에서 보스를 잡거나 이번 루프의 혼돈 20을 깨면 들어옵니다.'}</p></section>`;
        const crafts = CRAFT_ORDER.map(key => craftButtonHtml(map, key)).join('');
        return `<section class="atlas-device" aria-label="지도 장치"><h3>지도 장치</h3>${mapCardHtml(map, buildMapPowerEstimateHtml(atlas.preview(map)))}
            <div class="atlas-crafts" aria-label="지도석 제작">${crafts}</div>
            ${lock ? `<p class="atlas-lock">${lock}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.open()" ${lock ? 'disabled' : ''}>지도 열기</button></div></section>`;
    }
    function craftButtonHtml(map, key) {
        const have = Math.floor(game.currencies[key] || 0), reason = atlasMaps.craftReason(map, key);
        return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''} title="${escapeHTML(reason || atlasMaps.crafts[key].label)}">
            <span>${window.getStyledOrbName(key)}</span><small>${atlasMaps.crafts[key].label} · ${have}</small></button>`;
    }
    function nodeDetailHtml() {
        const node = atlas.node(selectedNode);
        if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
        const region = ATLAS.regions.find(row => row.id === node.region), status = atlas.status(game, node.id);
        const maps = ledger().stash.filter(map => map.node === node.id).sort((a, b) => b.tier - a.tier);
        return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${region.name} · ${STATUS[status]}</small><h3>${escapeHTML(node.name)}</h3>
            <p>${node.tier}등급 · ${STYLE[node.style]} · 보스 ${escapeHTML(node.boss)}</p>
            <p class="atlas-muted">장비 T${atlas.lootTier(node.tier)}까지 · 혼돈 ${atlas.equivalentDepth(node.tier)} 상당</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(stashRowHtml).join('')}</div>` : '<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>'}</section>`;
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
        const result = ledger().lastResult, receipt = game.explorationLoot;
        if (!result) return '';
        const notes = [result.first && '첫 완료', result.bonus && '보너스 달성', result.drops && `지도석 ${result.drops}개`].filter(Boolean).join(' · ');
        const currencies = receipt ? Object.entries(receipt.currencies).map(([key, n]) => `<span>${window.getStyledOrbName(key)} <b>+${n}</b></span>`).join('') : '';
        return `<details class="atlas-result"><summary>${escapeHTML(nodeName(result.nodeId))} ${result.tier}등급 ${result.outcome === 'complete' ? '완료' : '실패'}
            <span>${notes}</span></summary><div class="atlas-result-currencies">${currencies || '<span class="atlas-muted">기록된 재화 없음</span>'}</div>
            ${receipt ? `<p class="atlas-muted">장비 ${receipt.equipmentCount}개</p>` : ''}</details>`;
    }
    function headerHtml() {
        const st = ledger(), total = atlas.nodes.length;
        return `<header class="atlas-head"><div><h2>세계수 아틀라스</h2><span>완료 ${st.completed.length}/${total} · 보너스 ${st.bonus.length}/${total} · 아틀라스 포인트 ${atlas.points(game)}</span></div>
            <label class="atlas-auto"><input type="checkbox" ${st.autoMap ? 'checked' : ''} onchange="atlasUi.toggleAuto(this.checked)"><span>자동 지도</span>
            <small>완료하면 같은 등급 이하에서 다음 지도석을 연다</small></label></header>`;
    }
    function render() {
        const panel = document.getElementById('ui-atlas');
        if (!panel || !panelOpen()) return;
        atlas.sync(game);
        const craftWallet = CRAFT_ORDER.map(key => game.currencies[key] || 0);
        const key = JSON.stringify([ledger(), selectedNode, selectedUid, craftWallet, game.explorationLoot, game.currentZoneId, getPersistentBuildSignature(game)]);
        if (key === signature && panel.innerHTML) return;
        signature = key;
        const lock = atlas.lockReason(game);
        panel.innerHTML = `<div class="atlas-shell">${headerHtml()}${lock && !ledger().unlocked ? `<p class="atlas-lock">${lock}</p>` : ''}
            <div class="atlas-main">${chartHtml()}<div class="atlas-side">${ledger().run ? runHtml(ledger().run) : deviceHtml()}${nodeDetailHtml()}</div></div>
            ${resultHtml()}${stashHtml()}</div>`;
    }

    // ---------------------------------------------------------------- combat HUD and log lines
    function updateHud(zone) {
        const host = document.getElementById('ui-atlas-combat');
        if (!host) return;
        const run = ledger().run, show = !!run && zone && zone.type === 'atlasMap';
        host.toggleAttribute('hidden', !show);
        if (!show) { hudSignature = ''; return; }
        const key = JSON.stringify([run.map.uid, run.portals, run.drops.length]);
        if (key === hudSignature) return;
        hudSignature = key;
        host.innerHTML = `<div class="atlas-hud-copy"><strong>${escapeHTML(zone.name)} <span>${run.map.tier}등급 · ${ATLAS.rarities[run.map.rarity].name}</span></strong>
            <span>포털 ${run.portals}/${ATLAS.portals} · 지도석 ${run.drops.length}개 보관 중</span></div>
            <div class="atlas-hud-actions"><button onclick="atlasUi.openPanel()">아틀라스</button></div>`;
    }
    const REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
    function announce(detail) {
        const text = {
            complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? ' · 첫 완료' : ''}${detail.bonus ? ' · 보너스 달성' : ''}${detail.drops ? ` · 지도석 ${detail.drops}개` : ''}`
                + (detail.next ? ` → 다음 지도: ${nodeName(detail.next)}` : ''),
            portal: () => `🌀 ${REASON[detail.reason] || detail.reason} · 남은 포털 ${detail.portals}`,
            failed: () => `🗺️ ${REASON[detail.reason] || detail.reason} · 포털이 모두 닫혀 지도가 실패했습니다.`,
            drops: () => `🗺️ 지도석 ${detail.maps.map(map => `${nodeName(map.node)}(${map.tier})`).join(', ')}`,
            starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? ` · 지도석 ${detail.count}개` : ''}` : `🌳 이번 루프의 지도석 ${detail.count}개가 보관함에 들어왔습니다.`
        }[detail.kind];
        if (!text) return;
        addLog(text(), detail.kind === 'failed' ? 'death' : (detail.kind === 'complete' && (detail.first || detail.bonus) ? 'loot-unique' : 'season-up'));
        if (detail.kind === 'complete' && detail.lost) addLog(`보관함이 가득 차 지도석 ${detail.lost}개를 잃었습니다.`, 'attack-monster');
        if (detail.kind === 'starter' && detail.opened) queueTutorialNotice('unlock_world_tree_atlas', '세계수 아틀라스',
            '혼돈 20 너머에서 세계수 아틀라스가 열렸습니다.\n‘지도 → 세계수 아틀라스’에서 지도석을 골라 지도 장치로 여세요. 보스를 잡으면 노드가 완료되고 이웃 노드가 열립니다.', 'tab-map', 'map-explore-worldtree');
        signature = '';
    }
    window.addEventListener('project-idle:atlas-map', event => announce(event.detail));
    return Object.freeze({ render, updateHud, openPanel, selectNode, selectMap, craft, open, reenter, abandon, toggleAuto });
})();
safeExposeGlobals({ atlasUi });
