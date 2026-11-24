// 천문도 아래 띠의 첫 카드(아틀라스 개편 D1): 고른 것. 지도는 입장 상자(포털, 장비 상자, 형체 없는 이슬, 소모, 별 효과, 각인), 보스 자리는
// 상대와 열쇠와 비용, 피나클 장치는 외부 피나클 둘, 시작 육분의는 네 시작 길, 열린 탐사는 포털과 보류한 것. 주 단추는 띠의 as-go가 그린다.
import { ledger, selectedMap, runningNode, heldLate, entryTerms, starChances, dewChoice } from './atlas-view-model.mjs';
import { gateCostChips, fragmentText } from './atlas-view-map.mjs';

export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)(text); }

export function icon(runtime, name) { return (0, runtime.deps.renderPixelIcon)(name, 'as-icon'); }

/** 고른 것의 종류: 열린 탐사(고른 것이 없거나 그 자리), 시작 육분의, 피나클 장치, 보스 자리, 지도. */
export function pickKind(runtime) {
    const id = runtime.state.selectedNode, node = runtime.deps.atlas.node(id);
    if (ledger(runtime).run && (!id || id === runningNode(runtime))) return 'run';
    if (id === 'device') return 'device';
    if (!node) return 'entry';
    return { gate: 'gate', map: 'map' }[node.kind] || 'fight';
}

/** 상태 판: 잠김, 열림, 완료(보너스도 완료로 보인다), 탐사 중. */
export function plateHtml(runtime, status) {
    const shown = status === 'bonus' ? 'complete' : status;
    return `<span class="as-plate is-${shown}">${esc(runtime, runtime.deps._t(runtime.state.STATUS[shown]))}</span>`;
}

/** 천문도 등급 판(T3): 테는 그 등급의 빛깔(싸움 등급으로 센다). */
export function tierPlateHtml(runtime, node) {
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), tone = runtime.deps.atlas.tierBand(runtime.deps.atlas.gameTier(runtime.deps.game, node)).tone;
    return `<b class="as-tier" style="--tone:${tone}">T${tier}</b>`;
}

/** 카드 머리: 앞 판(T 등급이나 종류), 이름, 곁말(권역, 지도 보스), 상태 판. */
export function headHtml(runtime, { lead, name, plate, sub = [] }) {
    const aside = sub.filter(Boolean).map(text => `<span>${(0, runtime.deps.escapeHTML)(text)}</span>`).join('');
    return `<header class="as-card-head">${lead}<h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</h3>${aside ? `<small class="as-sub">${aside}</small>` : ''}${plate}</header>`;
}

/** 칸 하나: 도트 그림, 이름, 값. 별이나 이슬이 수를 바꾸면 기준 → 지금 값. */
/** @param {any} runtime @param {string} name @param {string} label @param {number[]} pair [기준, 지금 값] */
export function statHtml(runtime, name, label, pair) {
    const [base, now] = pair;
    const value = base === now ? esc(runtime, runtime.deps._t('{count}개', { count: now })) : `<s>${esc(runtime, runtime.deps._t('{count}개', { count: base }))}</s><i aria-hidden="true">→</i>${esc(runtime, runtime.deps._t('{count}개', { count: now }))}`;
    return `<div class="as-stat${base === now ? '' : ' is-changed'}">${icon(runtime, name)}<small>${esc(runtime, runtime.deps._t(label))}</small><b>${value}</b></div>`;
}

export function chipHtml(runtime, text, cls = '') { return `<span class="as-chip ${cls}">${(0, runtime.deps.escapeHTML)(text)}</span>`; }

/** 입장 시 소모: 고른 지도 등급의 지침(가진 것이 있으면 그 희귀도 빛깔), 이슬을 쓰면 이슬(보존 확률이 있으면 함께). */
export function costHtml(runtime, node, dew, stars) {
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), map = selectedMap(runtime), _t = runtime.deps._t;
    const stone = chipHtml(runtime, _t('T{tier} 지침 {count}개', { tier, count: 1 }), map ? `is-on rarity-${map.rarity}` : 'is-missing');
    const keep = dew.on && stars.dewKeep > 0 ? _t('{chance}% 보존', { chance: stars.dewKeep }) : '';
    const dewChip = dew.on ? chipHtml(runtime, [_t('형체 없는 이슬 {count}개', { count: runtime.deps.ATLAS.dewEntry.cost }), keep].filter(Boolean).join(', '), 'is-on is-dew') : '';
    return `<p class="as-line as-cost"><small>${esc(runtime, runtime.deps._t('입장 시 소모'))}</small>${stone}${dewChip}</p>`;
}

export function dewToggleHtml(runtime, dew) {
    const off = !dew.shown || !!dew.reason;
    return `<label class="as-dew${dew.on ? ' is-on' : ''}${off ? ' is-off' : ''}"${dew.reason ? ` data-tip="${(0, runtime.deps.escapeHTML)(dew.reason)}"` : ''}><input type="checkbox" ${dew.on ? 'checked' : ''} ${off ? 'disabled' : ''} onchange="atlasUi.toggleDew()">`
        + `${icon(runtime, 'drop')}<span>${esc(runtime, runtime.deps._t('형체 없는 이슬 사용'))}</span><small>${esc(runtime, runtime.deps._t('보유 {count}개', { count: dew.held }))}</small></label>`;
}

/** 각인 홈: 홈 수만큼의 칸과 가진 각인 단추(누르면 끼우고 다시 누르면 뺀다). */
export function fragmentsHtml(runtime) {
    const st = ledger(runtime), slots = runtime.deps.atlas.slots(runtime.deps.game);
    const owned = runtime.deps.ATLAS.fragments.filter(fragment => st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
    const holes = Array.from({ length: slots }, (_, i) => `<i class="${i < st.loadout.length ? 'is-on' : ''}"></i>`).join('');
    const chips = owned.map(fragment => `<button type="button" class="as-chip as-frag${st.loadout.includes(fragment.id) ? ' is-on' : ''}" aria-pressed="${st.loadout.includes(fragment.id)}" data-tip="${(0, runtime.deps.escapeHTML)(fragmentText(runtime, fragment))}" onclick="atlasUi.toggleFragment('${fragment.id}')">`
        + `${esc(runtime, runtime.deps._t(fragment.name))} <b>${st.fragments[fragment.id] || 0}</b></button>`).join('');
    return `<p class="as-line as-frags"><small>${esc(runtime, runtime.deps._t('각인'))}</small><span class="as-holes" aria-label="${esc(runtime, runtime.deps._t('각인 홈'))}">${holes}</span>${chips || `<em>${esc(runtime, runtime.deps._t('가진 각인이 없습니다.'))}</em>`}</p>`;
}

/** 지도 카드: 머리(T 등급, 이름, 상태), 권역과 지도 보스, 입장 상자. 잠긴 지도도 기준 값을 보인다(주 단추 자리에 여는 조건). */
export function mapCardHtml(runtime, node) {
    const game = runtime.deps.game, map = selectedMap(runtime), dew = dewChoice(runtime, map), terms = entryTerms(runtime, node, dew.on);
    const chances = starChances(runtime, node, dew.on, terms.stars), list = (0, runtime.deps.escapeHTML)(chances.join(', '));
    const stars = chances.length ? `<p class="as-line as-stars" data-tip="${list}"><small>${esc(runtime, runtime.deps._t('별 효과'))}</small><span>${list}</span></p>` : '';
    const head = { lead: tierPlateHtml(runtime, node), name: node.name, plate: plateHtml(runtime, runtime.deps.atlas.status(game, node.id)), sub: [whereOf(runtime, node), (0, runtime.deps._t)('보스 {name}', { name: (0, runtime.deps._t)(node.boss) })] };
    return `<section class="as-card as-pick pick-map side-${node.side}" aria-label="${esc(runtime, runtime.deps._t(node.name))}">${headHtml(runtime, head)}
            <div class="as-card-body">${dewToggleHtml(runtime, dew)}<div class="as-stats">${statHtml(runtime, 'rift', '포털', terms.portals)}${statHtml(runtime, 'shield', '장비 상자', terms.boxes)}</div>
            ${costHtml(runtime, node, dew, terms.stars)}${fragmentsHtml(runtime)}${stars}</div></section>`;
}

/** 노드가 선 권역의 이름(천문도의 권역 표). */
export function whereOf(runtime, node) { return (0, runtime.deps._t)(runtime.deps.ATLAS.starChart.regions[node.chartRegion]?.name || ''); }

/** 보스 자리의 열쇠: 권역 보스는 입장 열쇠(중간 보스의 첫 처치) n/2와 열쇠마다 칩, 중간 보스는 처치 보상 열쇠. */
export function keysHtml(runtime, gate) {
    if (gate.key) return `<p class="as-line as-keys"><small>${esc(runtime, runtime.deps._t('처치 보상'))}</small>${chipHtml(runtime, (0, runtime.deps._t)(gate.key), 'is-key')}</p>`;
    if (!gate.keys.length) return '';
    const held = gate.keys.filter(id => ledger(runtime).completed.includes(id));
    const chips = gate.keys.map(id => chipHtml(runtime, (0, runtime.deps._t)(runtime.deps.atlas.node(id).key), held.includes(id) ? 'is-on is-key' : 'is-missing is-key')).join('');
    return `<p class="as-line as-keys"><small>${esc(runtime, runtime.deps._t('입장 열쇠 {count}/{total}', { count: held.length, total: gate.keys.length }))}</small>${chips}</p>`;
}

/** 다음 입장에 내는 것: 첫 처치 전에는 없음, 그 뒤에는 그 싸움의 비용(가진 수/필요한 수). */
export function gateCostHtml(runtime, gate) {
    if (runtime.deps.atlas.gateFree(runtime.deps.game, gate.id)) return `<p class="as-line as-cost"><small>${esc(runtime, runtime.deps._t('입장 시 소모 없음'))}</small></p>`;
    return `<p class="as-line as-cost"><small>${esc(runtime, runtime.deps._t('입장 시 소모'))}</small>${gateCostChips(runtime, runtime.deps.atlas.node(gate.fight))}</p>`;
}

/** 보스 자리 카드: 머리(패키지의 종류 판, 자리 이름, 상태), 상대(그 자리가 치르는 싸움의 보스), 열쇠, 포털, 다음 입장의 비용. */
export function gateCardHtml(runtime, gate) {
    const fight = runtime.deps.atlas.node(gate.fight), kind = gateKind(runtime, gate), status = runtime.deps.atlas.status(runtime.deps.game, gate.id);
    const head = { lead: kind ? `<b class="as-kind">${esc(runtime, runtime.deps._t(kind))}</b>` : '', name: gate.name, plate: plateHtml(runtime, status), sub: [whereOf(runtime, gate)] };
    return `<section class="as-card as-pick pick-gate side-${gate.side}" aria-label="${esc(runtime, runtime.deps._t(gate.name))}">${headHtml(runtime, head)}
            <div class="as-card-body"><div class="as-stats"><div class="as-stat as-foe">${icon(runtime, 'skull')}<small>${esc(runtime, runtime.deps._t('상대'))}</small><b>${esc(runtime, runtime.deps._t(fight.boss))}</b></div>${statHtml(runtime, 'rift', '포털', [runtime.deps.ATLAS.portals, runtime.deps.ATLAS.portals])}</div>
            ${keysHtml(runtime, gate)}${gateCostHtml(runtime, gate)}</div></section>`;
}

/** 패키지의 종류 판(중간 보스, 태양 보스, 달 보스, 위 입구, 아래 입구). */
export function gateKind(runtime, gate) { return runtime.deps.ATLAS.starChart.bosses.find(row => row.id === gate.id)?.gate || ''; }

/** 천문도에 자리가 없는 싸움(수호자 「나이테 왕」, 예전 수호자 지도석이 가는 곳): 상대와 그 지도석. 지도석으로 연다. */
export function fightCardHtml(runtime, node) {
    const head = { lead: `<b class="as-kind">${esc(runtime, runtime.deps._t('수호자'))}</b>`, name: node.name, plate: plateHtml(runtime, runtime.deps.atlas.status(runtime.deps.game, node.id)) };
    return `<section class="as-card as-pick pick-fight" aria-label="${esc(runtime, runtime.deps._t(node.name))}">${headHtml(runtime, head)}
            <div class="as-card-body"><div class="as-stats"><div class="as-stat as-foe">${icon(runtime, 'skull')}<small>${esc(runtime, runtime.deps._t('상대'))}</small><b>${esc(runtime, runtime.deps._t(node.boss))}</b></div>${statHtml(runtime, 'rift', '포털', [runtime.deps.ATLAS.portals, runtime.deps.ATLAS.portals])}</div>
            <p class="as-line as-cost"><small>${esc(runtime, runtime.deps._t('입장 시 소모'))}</small>${gateCostChips(runtime, node)}</p></div></section>`;
}

/** 외부 피나클 한 줄: 기호(I, II), 이름과 상대, 상태, 비용, 제 보스 도전 단추(닫혔으면 여는 조건이 단추 자리에). */
export function outerRowHtml(runtime, gate) {
    const game = runtime.deps.game, status = runtime.deps.atlas.status(game, gate.id), fight = runtime.deps.atlas.node(gate.fight);
    const token = runtime.deps.ATLAS.starChart.bosses.find(row => row.id === gate.id).token, reason = runtime.deps.atlas.gateReason(game, gate.id) || runtime.deps.atlasRun.blockReason();
    return `<div class="as-outer is-${status === 'bonus' ? 'complete' : status}"><b class="as-token">${(0, runtime.deps.escapeHTML)(token)}</b>
            <div class="as-outer-name"><p><strong>${esc(runtime, runtime.deps._t(gate.name))}</strong>${plateHtml(runtime, status)}</p><small>${esc(runtime, runtime.deps._t(fight.boss))}</small>${gateCostHtml(runtime, gate)}</div>
            ${goButtonHtml(runtime, { label: '보스 도전', action: `atlasUi.openGate('${gate.id}')`, reason })}</div>`;
}

export function deviceCardHtml(runtime) {
    const mark = runtime.deps.ATLAS.starChart.landmarks.device, rows = runtime.deps.atlas.nodes.filter(node => node.gate === 'outer');
    return `<section class="as-card as-pick pick-device" aria-label="${esc(runtime, runtime.deps._t(mark.name))}">${headHtml(runtime, { lead: `<b class="as-kind">${esc(runtime, runtime.deps._t('외부 피나클'))}</b>`, name: mark.name, plate: plateHtml(runtime, runtime.deps.atlasSheetUi.deviceState()) })}
            <div class="as-card-body as-outers">${rows.map(gate => outerRowHtml(runtime, gate)).join('')}</div></section>`;
}

/** 시작 육분의 카드: 켜졌는지와 네 시작 길(누르면 그 지도를 고른다). 켜기 단추는 띠의 주 단추 자리에. */
export function entryCardHtml(runtime) {
    const mark = runtime.deps.ATLAS.starChart.landmarks.entry, state = runtime.deps.atlasSheetUi.sextantState(), maps = runtime.deps.atlas.nodes.filter(node => node.parent === 'entry');
    const plate = `<span class="as-plate is-${state === 'complete' ? 'complete' : 'locked'}">${esc(runtime, runtime.deps._t(state === 'complete' ? '켜짐' : '꺼짐'))}</span>`;
    const side = node => runtime.deps.ATLAS.starChart.regions[node.side === 'interior' ? 'interior' : node.side].name;
    const routes = maps.map(node => `<button type="button" class="as-start is-${runtime.deps.atlas.status(runtime.deps.game, node.id)}" onclick="atlasUi.selectNode('${node.id}')">${tierPlateHtml(runtime, node)}`
        + `<span><strong>${esc(runtime, runtime.deps._t(node.name))}</strong><small>${esc(runtime, runtime.deps._t(side(node)))}</small></span></button>`).join('');
    return `<section class="as-card as-pick pick-entry" aria-label="${esc(runtime, runtime.deps._t(mark.name))}">${headHtml(runtime, { lead: `<b class="as-kind">${esc(runtime, runtime.deps._t('시작 길 {count}개', { count: maps.length }))}</b>`, name: mark.name, plate })}
            <div class="as-card-body as-starts">${routes}</div></section>`;
}

/** 열린 탐사 카드: 머리(등급, 싸움 이름, 탐사 중), 남은 포털 칸, 보스를 잡으면 받는 것(지침, 각인, 후반 재료). */
export function runCardHtml(runtime, run) {
    const node = runtime.deps.atlas.node(run.map.node), total = run.board ? 1 : runtime.deps.atlas.portalCap(run), late = heldLate(runtime, run), chart = node?.kind === 'map' && !run.map.memory;
    const pips = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? 'is-on' : ''}"></i>`).join('');
    const held = [esc(runtime, runtime.deps._t('지침 {count}개', { count: run.drops.length })), esc(runtime, runtime.deps._t('각인 {count}개', { count: run.found.length })), late ? (0, runtime.deps.escapeHTML)(late) : ''].filter(Boolean).join(', ');
    const boxes = chart ? statHtml(runtime, 'shield', '장비 상자', entryTerms(runtime, node, run.dew === true).boxes) : '';
    return `<section class="as-card as-pick pick-run" aria-label="${esc(runtime, runtime.deps._t('열린 지도'))}">${runHeadHtml(runtime, run, node, chart)}
            <div class="as-card-body"><div class="as-stats"><div class="as-stat as-portals">${icon(runtime, 'rift')}<small>${esc(runtime, runtime.deps._t('남은 포털'))}</small><b><span class="as-pips" aria-hidden="true">${pips}</span>${run.portals}/${total}</b></div>${boxes}</div>
            ${chart ? runStoneHtml(runtime, run) : ''}<p class="as-line as-held"><small>${esc(runtime, runtime.deps._t('보스를 잡으면 받음'))}</small><span>${held}</span></p></div></section>`;
}

/** 열린 탐사 카드의 머리: 천문도 지도는 T 등급, 다른 싸움은 열린 지도 판. 이름(원정 판은 그 이름), 권역, 탐사 중. */
export function runHeadHtml(runtime, run, node, chart) {
    const lead = chart ? tierPlateHtml(runtime, node) : `<b class="as-kind">${esc(runtime, runtime.deps._t('열린 지도'))}</b>`, name = run.board ? run.board.name : node?.name || '';
    return headHtml(runtime, { lead, name, plate: `<span class="as-plate is-running">${esc(runtime, runtime.deps._t('탐사 중'))}</span>`, sub: [node ? whereOf(runtime, node) : ''] });
}

/** 열린 지도의 지침(희귀도 빛깔과 기운), 이슬로 들어갔으면 그 표시. */
export function runStoneHtml(runtime, run) {
    const omen = run.map.omen && runtime.deps.lootOmens.describe(run.map.omen), _t = runtime.deps._t;
    const title = _t('T{tier} {rarity} 지침', { tier: run.map.tier, rarity: _t(runtime.deps.ATLAS.rarities[run.map.rarity].name) });
    return `<p class="as-line"><small>${esc(runtime, runtime.deps._t('입장 시 소모'))}</small>${chipHtml(runtime, title, `is-on rarity-${run.map.rarity}`)}${omen ? chipHtml(runtime, _t(omen.name), 'is-omen') : ''}${run.dew ? chipHtml(runtime, _t('형체 없는 이슬 {count}개', { count: runtime.deps.ATLAS.dewEntry.cost }), 'is-on is-dew') : ''}</p>`;
}

export function pickCardHtml(runtime) {
    const kind = pickKind(runtime), node = runtime.deps.atlas.node(runtime.state.selectedNode);
    if (kind === 'run') return runCardHtml(runtime, ledger(runtime).run);
    if (kind === 'device') return deviceCardHtml(runtime);
    if (kind === 'entry') return entryCardHtml(runtime);
    return { gate: gateCardHtml, fight: fightCardHtml, map: mapCardHtml }[kind](runtime, node);
}

/** 주 단추. 들어갈 수 없으면 까닭이 단추의 글 자리를 대신한다(단추는 꺼진다). */
/** @param {any} runtime @param {{ label: string, action: string, params?: object, reason?: string, extra?: string }} button */
export function goButtonHtml(runtime, { label, action, params = undefined, reason = '', extra = '' }) {
    const text = reason ? (0, runtime.deps.escapeHTML)(reason) : esc(runtime, runtime.deps._t(label, params));
    return `<button type="button" class="psd-btn is-primary atlas-primary as-go-main${reason ? ' is-refused' : ''}"${extra} onclick="${action}" ${reason ? 'disabled' : ''}>${text}</button>`;
}

/** 지도에 들어갈 수 없는 까닭: 열린 탐사, 아틀라스가 닫힘, 아직 열리지 않은 지도(기다리는 지도), 지침이 없음, 지침이 맞지 않음. */
export function mapReason(runtime, node) {
    const atlas = runtime.deps.atlas, game = runtime.deps.game, map = selectedMap(runtime);
    const lock = (game.atlas.run && atlas.runOpenReason(game)) || atlas.lockReason(game);
    if (lock) return lock;
    if (atlas.status(game, node.id) === 'locked') return (0, runtime.deps._t)('{names} 완료 뒤에 열립니다.', { names: (0, runtime.deps._t)(atlas.node(node.parent)?.name || runtime.deps.ATLAS.starChart.landmarks.entry.name) });
    if (!map) return (0, runtime.deps._t)('T{tier} 지침이 필요합니다.', { tier: atlas.effectiveTier(game, node) });
    return atlas.beginReason(game, map.uid, node.id) || runtime.deps.atlasRun.blockReason();
}

/** 천문도 밖 싸움에 들어갈 수 없는 까닭: 그 싸움의 지도석이 없거나, 지도석으로 열 수 없다. */
export function fightReason(runtime, id) {
    const map = selectedMap(runtime);
    if (!map) return (0, runtime.deps._t)('수호자 지도석이 필요합니다.');
    return runtime.deps.atlas.beginReason(runtime.deps.game, map.uid, id) || runtime.deps.atlasRun.blockReason();
}

/** 열린 탐사의 단추: 지도 안이면 전투 보기, 밖이면 다시 들어가기, 그리고 지도 닫기. */
export function runGoHtml(runtime) {
    const inside = runtime.deps.atlas.inMap(runtime.deps.game);
    const main = inside ? goButtonHtml(runtime, { label: '전투 보기', action: "switchTab('tab-battle')" })
        : goButtonHtml(runtime, { label: '다시 들어가기', action: 'atlasUi.reenter()', extra: ' data-exploration-departure' });
    return `${main}<button type="button" class="psd-btn as-go-side" onclick="atlasUi.abandon()">${esc(runtime, runtime.deps._t('지도 닫기'))}</button>`;
}

/** 띠의 주 단추 자리(휴대폰에서는 화면 아래에 붙는다): 고른 것마다 하나. 피나클 장치는 줄마다 제 단추가 있어 비운다. */
export function goHtml(runtime) {
    const kind = pickKind(runtime), id = runtime.state.selectedNode, depart = ' data-exploration-departure';
    if (kind === 'run') return `<div class="as-go">${runGoHtml(runtime)}</div>`;
    if (kind === 'device') return '';
    if (kind === 'entry') {
        const state = runtime.deps.atlasSheetUi.sextantState();
        const params = { name: (0, runtime.deps._t)(runtime.deps.ATLAS.starChart.landmarks.entry.name) };
        return state === 'complete' ? '' : `<div class="as-go">${goButtonHtml(runtime, { label: '{name} 켜기', params, action: 'atlasUi.activateSextant()', reason: runtime.deps.atlas.sextantReason(runtime.deps.game) })}</div>`;
    }
    if (kind === 'fight') return `<div class="as-go">${goButtonHtml(runtime, { label: '탐사 입장', action: 'atlasUi.open()', reason: fightReason(runtime, id), extra: depart })}</div>`;
    if (kind === 'gate') return `<div class="as-go">${goButtonHtml(runtime, { label: '보스 도전', action: `atlasUi.openGate('${id}')`, reason: runtime.deps.atlas.gateReason(runtime.deps.game, id) || runtime.deps.atlasRun.blockReason(), extra: depart })}</div>`;
    return `<div class="as-go">${goButtonHtml(runtime, { label: '탐사 입장', action: 'atlasUi.open()', reason: mapReason(runtime, runtime.deps.atlas.node(id)), extra: depart })}</div>`;
}
