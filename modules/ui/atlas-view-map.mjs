import { shownNodes, done, ledger, panelOpen, terrainOf, tierStyle, nodeLabel, nodeName, heldLate, encounterNames, selectedMap, TICKET, plainUpTo, sortedStash } from './atlas-view-model.mjs';

export function chartHtml(runtime) {
    const region = runtime.deps.ATLAS.regions.find(row => row.id === runtime.state.selectedRegion), lore = runtime.deps.ATLAS.lore.regions[runtime.state.selectedRegion];
    return `<section class="atlas-region-route"><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}</h3><p class="atlas-muted">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.note))}</p>
            <div class="atlas-chart atlas-route-chart" role="group" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}"><canvas class="atlas-art" aria-hidden="true"></canvas>
            ${shownNodes(runtime).map(runtime.handlers.nodeHtml).join('')}</div><p class="atlas-muted">${(0, runtime.deps._t)('입구에서 갈래를 선택하고 수호자를 거쳐 최초의 경계로 향합니다.')}</p></section>`;
}

/** Walked paths are gold, the way on from a completed node glows sap, the rest waits dim. */
export function linkState(runtime, a, b) {
    if (done(runtime, a) && done(runtime, b)) return 'done';
    return (done(runtime, a) || done(runtime, b)) && runtime.deps.atlas.reachable(runtime.deps.game, a) && runtime.deps.atlas.reachable(runtime.deps.game, b) ? 'lit' : 'dim';
}

/** Authored paths are directed; a locked target never lights a backwards shortcut. */
export function linkModel(runtime, [a, b]) {
    return { from: runtime.deps.atlas.position(runtime.deps.atlas.node(a)), to: runtime.deps.atlas.position(runtime.deps.atlas.node(b)), state: linkState(runtime, a, b) };
}

export function chartModel(runtime) {
    const running = ledger(runtime).run && ledger(runtime).run.map.node;
    const nodes = shownNodes(runtime).map(node => ({ ...runtime.deps.atlas.position(node), kind: node.kind, region: node.regionIndex,
        status: runtime.deps.atlas.status(runtime.deps.game, node.id), selected: node.id === runtime.state.selectedNode, running: node.id === running }));
    return { regions: runtime.deps.ATLAS.regions, flat: true, nodes, links: runtime.deps.atlas.links.filter(([a,b]) => shownNodes(runtime).some(n => n.id === a) && shownNodes(runtime).some(n => n.id === b)).map(runtime.handlers.linkModel), tickets: runtime.deps.ATLAS.pinnacle.tickets.map(key => (runtime.deps.game.currencies[key] || 0) >= 1) };
}

/** Paints the drawing at about one dot per 2 CSS px of the chart's width — again whenever the panel changes size. */
export function paintChart(runtime) {
    const box = runtime.deps.document.querySelector('#ui-atlas .atlas-chart'), canvas = box && box.querySelector('.atlas-art');
    if (!canvas || !box.clientWidth) return;
    runtime.deps.atlasChartArt.paint(canvas, Math.max(120, Math.round(box.clientWidth / 2)), chartModel(runtime));
}

/** Drawings follow the panel's width: repaint the current view whenever the panel resizes. */
export function watchPanel(runtime, panel) {
    if (runtime.state.panelObserver || typeof runtime.deps.ResizeObserver !== 'function') return;
    runtime.state.panelObserver = new runtime.deps.ResizeObserver(() => { if (panelOpen(runtime)) runtime.state.PAINT[runtime.state.view](); });
    runtime.state.panelObserver.observe(panel);
}

/** Hover card (2026-11-06 사용자: 색감을 넣고, 아직 갈 수 없는 노드는 이름만): the name in its region's tint; an open node adds its tier as a chip
* in the tier's colour, its state and region, then what stands there (map layout and boss, guardian, the pinnacle). */
export function hint(runtime, event, id) {
    const node = runtime.deps.atlas.node(id);
    if (!node || typeof runtime.deps.showInfoTooltipHtml !== 'function') return;
    const region = runtime.deps.ATLAS.regions.find(row => row.id === node.region), tint = region ? region.tint : '#d9b066';
    const status = runtime.deps.atlas.status(runtime.deps.game, id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const title = `<div class="tooltip-title" style="color:${tint}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</div>`;
    if (status === 'locked') return (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, title, tint);
    const kind = node.kind === 'map' ? terrainOf(runtime, node) : `${node.kind === 'guardian' ? (0, runtime.deps._t)('지역 수호자') : (0, runtime.deps._t)('정점')}(${terrainOf(runtime, node)})`;
    const where = region ? `, ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}` : '';
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, `${title}
            <div class="tooltip-line"><span class="atlas-tip-tier" style="${tierStyle(runtime, tier)}">${(0, runtime.deps._t)('{tier}등급', { tier })}</span> <span style="color:${runtime.state.STATUS_TONE[status]}">${(0, runtime.deps._t)(runtime.state.STATUS[status])}</span>${where}</div>
            <div class="tooltip-line">${(0, runtime.deps._t)('{kind}, 보스 {boss}', { kind, boss: (0, runtime.deps.escapeHTML)(node.boss) })}</div>`, tint);
}

/** Region legend: tint, name and how much of it is done (its maps and guardian). */
export function legendHtml(runtime) {
    return `<nav class="atlas-region-tabs" aria-label="${(0, runtime.deps._t)('지역')}">${runtime.deps.ATLAS.regions.map(region => {
        const nodes = runtime.deps.atlas.nodes.filter(node => node.region === region.id), done = nodes.filter(node => ledger(runtime).completed.includes(node.id)).length;
        const branch = { sun: '태양', moon: '달', origin: '경계' }[runtime.deps.ATLAS.lore.regions[region.id].path];
        return `<button style="--tint:${region.tint}" aria-pressed="${region.id === runtime.state.selectedRegion}" onclick="atlasUi.selectRegion('${region.id}')"><small>${(0, runtime.deps._t)(branch)}</small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}<b>${done}/${nodes.length}</b></button>`;
    }).join('')}</nav>`;
}

export function nodeHtml(runtime, node) {
    const { x, y } = runtime.deps.atlas.position(node), status = runtime.deps.atlas.status(runtime.deps.game, node.id);
    const held = ledger(runtime).stash.filter(map => map.node === node.id).length;
    const active = ledger(runtime).run?.map.node === node.id;
    const classes = ['atlas-node', `is-${status}`, `kind-${node.kind}`, node.id === runtime.state.selectedNode ? 'is-selected' : '', active ? 'is-running' : ''].join(' ');
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    // data-info-tooltip-anchor: js/ui.js의 mousemove 감시가 이 표시가 없는 곳의 툴팁을 바로 지워, 지도 이름이 뜨자마자 사라졌다(2026-10-25 사용자).
    return `<button class="${classes}" style="--x:${x}%;--y:${y}%;${tierStyle(runtime, tier)}" data-atlas-node="${node.id}" data-info-tooltip-anchor="1" aria-pressed="${node.id === runtime.state.selectedNode}"
            aria-label="${nodeLabel(runtime, node, tier, status)}" onclick="atlasUi.selectNode('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><b>${tier}</b><span class="atlas-route-name">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</span>${held ? `<i>${held}</i>` : ''}</button>`;
}

/** 지도 기운(js/loot-omens.js): 이름, 무엇이 잘 나오는지, 세기(지도석 희귀도와 타락). 기운이 없는 예전 지도석은 빈칸. */
export function omenHtml(runtime, map) {
    const found = runtime.deps.lootOmens.of(map);
    if (!found) return '';
    const omen = runtime.deps.lootOmens.describe(found.omen.id);
    return `<p class="atlas-omen${map.uid === runtime.state.bloomedUid ? ' is-bloomed' : ''}" style="--omen:${omen.tone}"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</b><small>${(0, runtime.deps._t)('세기 ×{strength}', { strength: found.strength })}</small>`
        + `<span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.note))}</span></p>`;
}

export function omenChipHtml(runtime, map) {
    const omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    return omen ? `<i class="atlas-omen-chip" style="--omen:${omen.tone}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</i>` : '';
}

export function mapCardHtml(runtime, map, extra = '') {
    // 지도석 없이 연 싸움(정점, 최종 보스, 리그 우두머리)은 희귀도 · 옵션 · 수량 없이 무엇인지만.
    const special = runtime.state.RUN_KIND[runtime.deps.atlas.node(map.node)?.kind];
    if (special) return `<div class="atlas-map-card"><strong>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}</strong><span class="atlas-map-tags">${(0, runtime.deps._t)('{tier}등급, {special}', { tier: map.tier, special })}</span>${extra}</div>`;
    const fx = runtime.deps.atlasMaps.effects(map), rule = runtime.deps.ATLAS.rarities[map.rarity];
    const mods = map.mods.map(entry => `<li>${(0, runtime.deps.escapeHTML)(runtime.deps.atlasMaps.describe(entry))}</li>`).join('');
    const tags = [(0, runtime.deps._t)('{tier}등급', { tier: map.tier }), rule.name, map.quality ? (0, runtime.deps._t)('품질 {quality}%', { quality: map.quality }) : '', map.corrupted ? '타락' : '',
        fx.overTiers ? (0, runtime.deps._t)('고등급 보상 {overTiers}단계', { overTiers: fx.overTiers }) : ''].filter(Boolean).join(', ');
    return `<div class="atlas-map-card rarity-${map.rarity}${map.corrupted ? ' is-corrupted' : ''}"><strong>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}</strong>
            <span class="atlas-map-tags">${tags}</span>${omenHtml(runtime, map)}${mods ? `<ul class="atlas-mods">${mods}</ul>` : (0, runtime.deps._t)('<p class="atlas-muted">옵션 없음</p>')}
            <p class="atlas-rewards">아이템 수량 +${fx.quantity}%, 희귀도 +${fx.rarity}%${fx.packExtra ? (0, runtime.deps._t)(', 무리 +{packExtra}', { packExtra: fx.packExtra }) : ''}</p>${extra}</div>`;
}

export function runHtml(runtime, run) {
    const total = run.board ? 1 : runtime.deps.ATLAS.portals + run.bonus.portals, late = heldLate(runtime, run);
    const portals = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
    const inside = runtime.deps.atlas.inMap(runtime.deps.game), rooms = run.encounters.length ? `<p class="atlas-encounters">콘텐츠 방: ${encounterNames(runtime, run.encounters, run.golden || [])}</p>` : '';
    return `<section class="atlas-device is-running" aria-label="${(0, runtime.deps._t)('열린 지도')}"><h3>${(0, runtime.deps._t)('열린 지도')}</h3>
            ${mapCardHtml(runtime, run.map, `${rooms}<p class="atlas-portals" aria-label="${(0, runtime.deps._t)('남은 포털 {portals}', { portals: run.portals })}">${(0, runtime.deps._t)('포털 {portals}', { portals })}</p>
            <p class="atlas-muted">${(0, runtime.deps._t)('맵에서 얻은 지도석 {length}개, 각인 {length2}개, 보스를 잡으면 보관함으로', { length: run.drops.length, length2: run.found.length })}</p>
            ${late ? `<p class="atlas-muted">${(0, runtime.deps._t)('후반부 재료 {late} (보스를 잡으면 받음)', { late })}</p>` : ''}`)}
            <div class="atlas-actions">${inside ? `<button class="atlas-primary" onclick="switchTab('tab-battle')">${(0, runtime.deps._t)('전투 보기')}</button>`
        : (0, runtime.deps._t)('<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>')}
            <button onclick="atlasUi.abandon()">${(0, runtime.deps._t)('지도 닫기')}</button></div></section>`;
}

export function fragmentsHtml(runtime) {
    const st = ledger(runtime), slots = runtime.deps.atlas.slots(runtime.deps.game);
    // 새 각인은 그 방이 열리는 루프부터 보인다(이미 가진 것과 끼운 것은 그대로, js/atlas.js fragmentOpen).
    const shown = runtime.deps.ATLAS.fragments.filter(fragment => runtime.deps.atlas.fragmentOpen(fragment, runtime.deps.game.season) || st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
    const chips = shown.map(fragment => {
        const count = st.fragments[fragment.id] || 0, on = st.loadout.includes(fragment.id);
        return `<button class="atlas-fragment${on ? ' is-on' : ''}" aria-pressed="${on}" onclick="atlasUi.toggleFragment('${fragment.id}')"
                ${!on && !count ? 'disabled' : ''} data-tip="${(0, runtime.deps.escapeHTML)(fragmentText(runtime, fragment))}"><span>${(0, runtime.deps._t)(fragment.name)}</span><small>${count}</small></button>`;
    }).join('');
    return `<div class="atlas-fragments" aria-label="${(0, runtime.deps._t)('각인 홈')}"><p class="atlas-muted">${(0, runtime.deps._t)('각인 홈 {length}/{slots}, 지도를 열 때 하나씩 씀', { length: st.loadout.length, slots })}</p>${chips}</div>`;
}

export function fragmentText(runtime, fragment) {
    const room = fragment.encounter ? runtime.deps.ATLAS.encounters[fragment.encounter].name : '';
    if (room) return `${room}${room.endsWith('방') ? '' : (0, runtime.deps._t)(' 방')}이 반드시 생긴다`;
    const label = ([key, value]) => (runtime.deps.ATLAS_PASSIVES.labels[key][1] === 'on' ? runtime.deps.ATLAS_PASSIVES.labels[key][0] : `${runtime.deps.ATLAS_PASSIVES.labels[key][0]} +${value}${runtime.deps.ATLAS_PASSIVES.labels[key][1]}`);
    return Object.entries(fragment.effect).map(label).join(', ');
}

/** ' (잊힌 정원 ×2)' for a room a region favours (data/atlas.js regionChance), '' otherwise. */
export function regionChanceNote(runtime, type) {
    return Object.entries(runtime.deps.ATLAS.encounters[type].regionChance || {})
        .map(([id, mul]) => ` (${(runtime.deps.ATLAS.regions.find(row => row.id === id) || {}).name} ×${mul})`).join('');
}

export function chancesHtml(runtime) {
    const bonus = runtime.deps.atlasPassives.effects(runtime.deps.game);
    const rows = late => runtime.deps.atlasEncounters.types.filter(type => !!runtime.deps.ATLAS.encounters[type].late === late && runtime.deps.atlasEncounters.isOpen(type, runtime.deps.game.season))
        .map(type => `${runtime.deps.ATLAS.encounters[type].name} ${runtime.deps.ATLAS.encounters[type].chance + (bonus[type] || 0)}%${regionChanceNote(runtime, type)}`).join(', ');
    // 제단은 아틀라스가 깨어난 뒤에만, 콘텐츠 방과 따로 생긴다(js/atlas-encounters.js roll).
    const altars = runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? `<p class="atlas-encounters">${(0, runtime.deps._t)('제단 확률: {value} (지도마다 {altarLimit}개까지)', { value: rows(true), altarLimit: runtime.deps.ATLAS.altarLimit })}</p>` : '';
    // 황금 방(data/atlas.js goldenRoom): 콘텐츠 방마다 이 확률로 황금 방이 된다(보상 3배와 귀한 재료).
    const golden = (0, runtime.deps._t)('황금 방 {value}% (보상 {rewardMul}배)', { value: runtime.deps.ATLAS.goldenRoom.chance + (bonus.goldenRoom || 0), rewardMul: runtime.deps.ATLAS.goldenRoom.rewardMul });
    return `<p class="atlas-encounters">${(0, runtime.deps._t)('콘텐츠 방 확률: {value} (지도마다 {roomLimit}개까지), {golden}', { value: rows(false), roomLimit: runtime.deps.atlasEncounters.roomLimit(bonus, runtime.deps.game.season), golden })}</p>${altars}`;
}

export function deviceHtml(runtime) {
    const map = selectedMap(runtime), lock = runtime.deps.atlas.lockReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason();
    if (!map) return `<section class="atlas-device" aria-label="${(0, runtime.deps._t)('지도 장치')}"><h3>${(0, runtime.deps._t)('지도 장치')}</h3><p class="atlas-muted">${ledger(runtime).stash.length
        ? (0, runtime.deps._t)('보관함이나 노드에서 지도석을 고르세요.') : (0, runtime.deps._t)('지도석이 없습니다. 혼돈 20 이상에서 보스를 잡거나 이번 루프의 혼돈 20을 깨면 들어옵니다.')}</p>${fragmentsHtml(runtime)}</section>`;
    const crafts = runtime.state.CRAFT_ORDER.map(key => craftButtonHtml(runtime, map, key)).join('');
    return `<section class="atlas-device" aria-label="${(0, runtime.deps._t)('지도 장치')}"><h3>${(0, runtime.deps._t)('지도 장치')}</h3>${mapCardHtml(runtime, map, (0, runtime.deps.buildMapPowerEstimateHtml)(runtime.deps.atlas.preview(runtime.deps.game, map)))}
            <div class="atlas-crafts" aria-label="${(0, runtime.deps._t)('지도석 제작')}">${crafts}</div>${flowersHtml(runtime, map)}${fragmentsHtml(runtime)}${chancesHtml(runtime)}
            ${lock ? `<p class="atlas-lock">${lock}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.open()" ${lock ? 'disabled' : ''}>${(0, runtime.deps._t)('지도 열기')}</button></div></section>`;
}

export function craftButtonHtml(runtime, map, key) {
    const have = Math.floor(runtime.deps.game.currencies[key] || 0), reason = runtime.deps.atlasMaps.craftReason(map, key);
    return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''}${reason ? ` data-tip="${(0, runtime.deps.escapeHTML)(reason)}"` : ''}>
            <span>${runtime.deps.window.getStyledOrbName(key)}</span><small>${(0, runtime.deps._t)(runtime.deps.atlasMaps.crafts[key].label)}, ${have}</small></button>`;
}

/** 꽃 한 색(data/loot-omens.js flowers): 평범한 꽃의 단추와, 황금 꽃을 가졌을 때만 고르는 단추. 툴팁은 그 색으로 나올 수 있는 기운이다. */
export function flowerButtonsHtml(runtime, map, color) {
    const name = (0, runtime.deps._t)('{label} 꽃', { label: runtime.deps.STUMP_BOX_COLORS[color].label }), blocked = runtime.deps.atlas.omenChangeReason(map), names = runtime.deps.lootOmens.flowerOmens(color, runtime.deps.game, map.omen).map(omen => omen.name).join(', ');
    const plain = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), golden = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true), closed = blocked || !names;
    const icon = `<img class="atlas-flower-icon" src="${runtime.deps.stumpBox.harvestPriceIcon(runtime.deps.stumpBox.harvestPriceKey('flower', color))}" alt="">`;
    const tip = blocked || (plain ? names : (0, runtime.deps._t)('{name}이 없습니다. {names}', { name, names }));
    const pick = golden ? `<button class="is-golden" onclick="atlasUi.goldenFlowerOmen('${color}')" ${closed ? 'disabled' : ''} data-tip="${(0, runtime.deps.escapeHTML)(blocked || names)}">
            ${icon}<span>${(0, runtime.deps._t)('황금 {name}', { name })}<small>${(0, runtime.deps._t)('직접 고르기, {golden}', { golden })}</small></span></button>` : '';
    return `<div class="atlas-flower" style="--flower:${runtime.deps.STUMP_BOX_COLORS[color].tone}"><button onclick="atlasUi.flowerOmen('${color}')" ${closed || plain < 1 ? 'disabled' : ''} data-tip="${(0, runtime.deps.escapeHTML)(tip)}">
            ${icon}<span>${name}<small>${(0, runtime.deps._t)(runtime.deps.LOOT_OMENS.flowers[color].label)}, ${plain}</small></span></button>${pick}</div>`;
}

/** 지도 노드의 지도석에만 기운이 있다(수호자 지도석은 없다). */
export function flowersHtml(runtime, map) {
    if (runtime.deps.atlas.node(map.node)?.kind !== 'map') return '';
    return `<div class="atlas-flowers" aria-label="${(0, runtime.deps._t)('꽃으로 기운 바꾸기')}"><p>${(0, runtime.deps._t)('꽃으로 기운 바꾸기')}</p>${runtime.state.FLOWER_COLORS.map(color => flowerButtonsHtml(runtime, map, color)).join('')}</div>`;
}

export function nodeDetailHtml(runtime) {
    const node = runtime.deps.atlas.node(runtime.state.selectedNode);
    if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
    if (node.kind === 'pinnacle') return pinnacleHtml(runtime, node);
    const region = runtime.deps.ATLAS.regions.find(row => row.id === node.region), status = runtime.deps.atlas.status(runtime.deps.game, node.id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const maps = ledger(runtime).stash.filter(map => map.node === node.id).sort((a, b) => b.tier - a.tier);
    const kind = node.kind === 'guardian' ? `<p class="atlas-guardian-note">${(0, runtime.deps._t)('지역 수호자, 처치마다 뿌리 입장권({value}), 지도석은 이 지역 {minTier}등급 이상 보스가 떨어뜨립니다', { value: node.ticket ? TICKET(runtime, node.ticket) : (0, runtime.deps._t)('가장 적은 종류'), minTier: runtime.deps.ATLAS.guardianRules.minTier })}</p>${runtime.deps.itemInfluencesUi.sourceHtml('guardian')}` : '';
    return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${(0, runtime.deps._t)(region.name)}, ${runtime.state.STATUS[status]}</small><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>
            <p>${(0, runtime.deps._t)('{tier}등급, {node}, 보스 {boss}', { tier, node: terrainOf(runtime, node), boss: (0, runtime.deps.escapeHTML)(node.boss) })}</p>${kind}
            <p class="atlas-muted">${(0, runtime.deps._t)('장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당', { lootTier: runtime.deps.atlas.lootTier(tier), equivalentDepth: runtime.deps.atlas.equivalentDepth(tier) })}</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(runtime.handlers.stashRowHtml).join('')}</div>` : (0, runtime.deps._t)('<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>')}</section>`;
}

/** 정점: 입장권 4종 · 씨앗 · 열기. 지도석이 아니라 입장권으로 연다. */
export function pinnacleHtml(runtime, node) {
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), reason = runtime.deps.atlas.pinnacleReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason(), busy = !!ledger(runtime).run;
    const tickets = runtime.deps.ATLAS.pinnacle.tickets.map(key => `<span class="${(runtime.deps.game.currencies[key] || 0) >= 1 ? 'is-on' : ''}">${TICKET(runtime, key)} ${Math.floor(runtime.deps.game.currencies[key] || 0)}</span>`).join('');
    return `<section class="atlas-node-detail atlas-pinnacle-detail"><small>${(0, runtime.deps._t)('정점, 세계수 씨앗 {seeds}/{max}', { seeds: ledger(runtime).seeds, max: runtime.deps.ATLAS.seeds.max })}</small><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>
            <p>${(0, runtime.deps._t)('{tier}등급, 투기장, 보스 {stages}단계', { tier, stages: runtime.deps.ATLAS.pinnacle.stages })}</p><div class="atlas-tickets">${tickets}</div>
            <p class="atlas-muted">${ledger(runtime).seeds >= runtime.deps.ATLAS.seeds.max ? (0, runtime.deps._t)('세계수 씨앗 {max}개를 다 모아 더는 나오지 않습니다(시대 재생 뒤 다시).', { max: runtime.deps.ATLAS.seeds.max }) : (0, runtime.deps._t)('처치하면 세계수 씨앗 하나(최대 {max}).', { max: runtime.deps.ATLAS.seeds.max })} 씨앗마다 모든 노드 등급 +${runtime.deps.ATLAS.seeds.tierStep}. 씨앗 ${runtime.deps.BEYOND_BOUNDARY_UNLOCK_SEEDS}개면 경계 너머가 루프 50 전에 열립니다(관측자 처치 필요).</p>
            ${runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? '' : (0, runtime.deps._t)('<p class="atlas-muted">처음 쓰러뜨리면 아틀라스가 깨어나 최종 보스가 열립니다.</p>')}
            ${reason && !busy ? `<p class="atlas-lock">${reason}</p>` : ''}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.openPinnacle()" ${reason ? 'disabled' : ''}>${(0, runtime.deps._t)('정점 열기')}</button></div></section>`;
}

export function stashRowHtml(runtime, map) {
    return `<button class="atlas-stash-row rarity-${map.rarity}" aria-pressed="${map.uid === runtime.state.selectedUid}" onclick="atlasUi.selectMap(${map.uid})">
            <b style="${tierStyle(runtime, map.tier)}">${map.tier}</b><span>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}${omenChipHtml(runtime, map)}</span><small>${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name)}${map.mods.length ? (0, runtime.deps._t)(', 옵션 {length}', { length: map.mods.length }) : ''}${map.quality ? `, ${map.quality}%` : ''}${map.corrupted ? (0, runtime.deps._t)(', 타락') : ''}</small></button>`;
}

/** 고른 지도석의 도구: 같은 등급 셋 합치기, 모두 합치기(좁은 서랍에서 버리기와 한 줄), 버리기, 그 등급 이하 일반 지도석 정리. */
export function stashToolsHtml(runtime, selected, busy) {
    const same = ledger(runtime).stash.filter(map => map.tier === selected.tier).length, reason = runtime.deps.atlas.combineReason(runtime.deps.game, selected.uid);
    const low = plainUpTo(runtime, selected.tier), off = busy ? 'disabled' : '';
    const why = reason && same >= runtime.deps.ATLAS.combine.count && !busy ? `<small>${(0, runtime.deps.escapeHTML)(reason)}</small>` : '';
    return `<div class="atlas-stash-tools"><button class="atlas-combine" onclick="atlasUi.combine()" ${reason ? 'disabled' : ''}>${(0, runtime.deps._t)('같은 등급 {count}개 합치기', { count: runtime.deps.ATLAS.combine.count })} <span>${Math.min(same, runtime.deps.ATLAS.combine.count)}/${runtime.deps.ATLAS.combine.count}</span></button>${combineAllHtml(runtime)}
            <button class="atlas-discard" onclick="atlasUi.discard()" ${off}>${(0, runtime.deps._t)('버리기')}</button>
            <button class="atlas-discard" onclick="atlasUi.discardLow()" ${off || (low ? '' : 'disabled')}>${(0, runtime.deps._t)('{tier}등급 이하 일반 모두 버리기', { tier: selected.tier })} <span>${low}</span></button></div>${why}`;
}

export function stashHtml(runtime) {
    const maps = sortedStash(runtime);
    const selected = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), full = maps.length >= runtime.deps.ATLAS.stashCap;
    const capacity = full ? '보관함이 가득 찼습니다.' : (0, runtime.deps._t)('빈자리 {value}칸', { value: runtime.deps.ATLAS.stashCap - maps.length });
    const management = selected ? `<div class="atlas-stash-management"><p><strong>${(0, runtime.deps._t)('선택: {node}', { node: (0, runtime.deps.escapeHTML)(nodeName(runtime, selected.node)) })}</strong><span><b style="${tierStyle(runtime, selected.tier)}">${selected.tier}등급</b>, ${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[selected.rarity].name)}${selected.quality ? (0, runtime.deps._t)(', 품질 {quality}%', { quality: selected.quality }) : ''}${selected.corrupted ? (0, runtime.deps._t)(', 타락') : ''}</span></p>
            ${stashToolsHtml(runtime, selected, busy)}${busy ? `<small>${busy}</small>` : ''}</div>` : `<div class="atlas-stash-management"><div class="atlas-stash-tools">${combineAllHtml(runtime)}</div></div>`;
    return `<section class="atlas-stash" aria-label="${(0, runtime.deps._t)('지도석 보관함')}"><h3>${(0, runtime.deps._t)('지도석 보관함')} <span>${maps.length}/${runtime.deps.ATLAS.stashCap}</span></h3>
            <p class="atlas-stash-capacity${full ? ' is-full' : ''}" role="status">${capacity}</p>${management}
            ${maps.length ? `<div class="atlas-stash-list">${maps.map(runtime.handlers.stashRowHtml).join('')}</div>` : (0, runtime.deps._t)('<p class="atlas-muted">비어 있습니다. 보관함은 루프마다 비워집니다.</p>')}</section>`;
}

export function combineAllHtml(runtime) {
    const used = runtime.deps.atlas.combineAllPlan(runtime.deps.game).used;
    return `<button class="atlas-combine" onclick="atlasUi.combineAll()" ${used ? '' : 'disabled'}>${(0, runtime.deps._t)('모두 합치기')} <span>${used}</span></button>`;
}
