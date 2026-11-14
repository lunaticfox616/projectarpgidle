/** 폴리곤의 무게중심(그림 픽셀): 표식 자리와 지시선의 시작(사용자 11-08: 표식은 구역 가운데). */
export function centre(runtime, zone) {
    let area = 0, cx = 0, cy = 0;
    zone.forEach(([x1, y1], i) => {
        const [x2, y2] = zone[(i + 1) % zone.length], f = x1 * y2 - x2 * y1;
        area += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    });
    return [cx / (3 * area), cy / (3 * area)];
}

/** 도트 표식을 캔버스로 한 번 그려 data URL로 둔다(1칸 바깥 테두리 포함 13x13칸, 칸마다 scale px). outline: 테두리색(인장은 밝은 양피지색). */
export function glyph(runtime, name, color, scale, outline = runtime.state.OUTLINE) {
    const key = `${name}|${color}|${scale}|${outline}`;
    if (runtime.state.urls.has(key)) return runtime.state.urls.get(key);
    const rows = runtime.deps.WORLD_MAP.symbols[name] || runtime.deps.WORLD_MAP.symbols.diamond;
    const canvas = runtime.deps.document.createElement('canvas');
    canvas.width = canvas.height = 13 * scale;
    const ctx = canvas.getContext('2d');
    const cells = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([x + 1, y + 1]); }));
    ctx.fillStyle = outline;
    for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ctx.fillRect((x + dx) * scale, (y + dy) * scale, scale, scale);
    ctx.fillStyle = color;
    for (const [x, y] of cells) ctx.fillRect(x * scale, y * scale, scale, scale);
    runtime.state.urls.set(key, canvas.toDataURL());
    return runtime.state.urls.get(key);
}

/** 액트 자리: 열림은 maxZoneId까지, 완료는 그 앞, 현재는 currentZoneId. next는 바로 다음 액트(잠긴 채 '다음 액트'로, 다른 인장과 달리 빈 금빛 마름모).
* reward는 그 액트에 받을 보상이 남은 것(표식의 !). go: 두 번 누름과 설명 칸의 이동. */
export function actState(runtime, region) {
    const index = region.act - 1, maximum = runtime.deps.game.maxZoneId, act = runtime.deps.STORY_ACTS[index];
    const current = runtime.deps.game.currentZoneId === index, cleared = index < maximum;
    return { index, open: runtime.state.api.available('map-explore-hunting') && index <= maximum, cleared, current, next: index === maximum + 1, attention: false,
        reward: runtime.state.api.actRewardZoneIds().includes(index), status: (0, runtime.deps._t)(current ? '현재 위치' : cleared ? '완료' : '미완료'),
        color: current ? '#ffe39a' : cleared ? '#c9a862' : '#f2d28a', title: (0, runtime.deps._t)(act.title), kind: (0, runtime.deps.formatStoryActLabel)(act),
        description: act.subtitle ? (0, runtime.deps._t)(act.subtitle) : '', target: '', symbol: 'diamond', icon: 'act', route: 'map-explore-hunting', go: `explorationAtlasUi.hunt(${index})` };
}

/** 콘텐츠 자리: 열림은 그 길의 단추와 해금(available). 상태 글은 전처럼 입장 조건, 아니면 진행 요약. */
export function contentState(runtime, region) {
    const button = runtime.deps.document.getElementById('btn-' + region.route);
    const summary = runtime.state.api.routeSummary(region.route);
    const entryBlock = button?.dataset.entryCondition;
    const status = region.route === 'map-explore-root-boss' ? '' : entryBlock || summary.status || '';
    return { open: runtime.state.api.available(region.route), cleared: false, current: false, next: false, attention: !!summary.attention, status, entryBlock, color: region.color,
        title: (0, runtime.deps._t)(region.name), kind: runtime.deps.EXPLORATION_REGIONS.activities[region.route]?.kind || '', description: region.description ? (0, runtime.deps._t)(region.description) : '',
        target: summary.target || '', symbol: region.symbol, icon: region.icon, also: region.also || [], route: region.route, go: `explorationAtlasUi.enter('${region.route}')` };
}

/** 권역 단추: 폴리곤의 둘레 상자에 놓고 clip-path로 폴리곤만 남긴다(클릭 영역도). 바탕은 같은 지도 그림을 그 상자 자리만큼 잘라 둔 것이라
* 올리면 그 지형 조각만 밝아진다. background-position %는 상자와 그림의 너비 차에 대한 비율이라 bx/(W-bw)다. 한 번 누르면 고정, 두 번 누르면 입장. */
export function zoneHtml(runtime, entry) {
    const { region, state } = entry, { width: W, height: H, src } = runtime.deps.WORLD_MAP;
    const xs = region.zone.map(p => p[0]), ys = region.zone.map(p => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const clip = region.zone.map(([x, y]) => `${((x - bx) / bw * 100).toFixed(2)}% ${((y - by) / bh * 100).toFixed(2)}%`).join(',');
    const style = `left:${pct(runtime, bx, W)};top:${pct(runtime, by, H)};width:${pct(runtime, bw, W)};height:${pct(runtime, bh, H)};clip-path:polygon(${clip});background-image:url('${src}');`
        + `background-size:${pct(runtime, W, bw)} ${pct(runtime, H, bh)};background-position:${pct(runtime, bx, W - bw)} ${pct(runtime, by, H - bh)}`;
    const hover = `onmouseenter="worldMapUi.link('${region.id}',true)" onfocus="worldMapUi.link('${region.id}',true)"`
        + ` onmouseleave="worldMapUi.link('${region.id}',false)" onblur="worldMapUi.link('${region.id}',false)"`;
    const press = state.open ? `onclick="worldMapUi.pick('${region.id}')" ondblclick="${state.go}"` : 'aria-disabled="true"';
    return `<button class="wm-zone ${pieceClasses(runtime, entry)}" data-wm="${region.id}" aria-label="${(0, runtime.deps.escapeHTML)(state.open ? state.title : lockedLabel(runtime))}" style="${style}" ${hover} ${press}></button>`;
}

/** 지형을 두르는 테(어두운 밑테 위 금빛 점선)와 무게중심에서 여백의 이름표 자리로 가는 지시선. */
export function linesHtml(runtime, entry) {
    const { region } = entry, cls = pieceClasses(runtime, entry), points = region.zone.map(p => p.join(',')).join(' '), [cx, cy] = centre(runtime, region.zone);
    return `<polygon class="wm-outline-under ${cls}" data-wm="${region.id}" points="${points}"/><polygon class="wm-outline ${cls}" data-wm="${region.id}" points="${points}"/>`
        + `<polyline class="wm-leader ${cls}" data-wm="${region.id}" points="${cx.toFixed(1)},${cy.toFixed(1)} ${region.tag[0]},${region.tag[1]}"/>`;
}

/** 액트에서 그다음 액트로 가는 점선(사용자 11-08: 글이나 테 대신 진행 방향만): 평소엔 현재 위치의 액트(없으면 마지막으로 연 액트)에서 그다음 액트로,
* 액트에 마우스를 올리면 그 액트에서 그다음 액트로 잇는다(액트 3에 올리면 액트 4로). 마지막 액트에서는 선이 없다. */
export function nextLinkHtml(runtime, all) {
    const acts = all.filter(e => e.state.open && e.region.type === 'act');
    const from = acts.find(e => e.state.current) || acts[acts.length - 1], to = from && actAfter(runtime, from.region);
    const rest = to ? `${point(runtime, from.region)} ${point(runtime, to)}` : '';
    return `<polyline class="wm-next-link" data-rest="${rest}" points="${rest}"/>`;
}

export function aimNextLink(runtime, id, on) {
    const line = runtime.deps.document.querySelector('#ui-exploration-atlas .wm-next-link');
    if (!line) return;
    const hovered = on ? runtime.deps.WORLD_MAP.regions.find(region => region.id === id && region.type === 'act') : null;
    const to = hovered && actAfter(runtime, hovered);
    line.setAttribute('points', hovered ? (to ? `${point(runtime, hovered)} ${point(runtime, to)}` : '') : line.dataset.rest);
}

/** 표식: 권역 단추 위, 구역 가운데의 그림(클릭은 권역이 받는다). 열린 액트는 번호를 품고 받을 보상이 있으면 !을 단다. 잠긴 곳은 잉크색 인장에 밝은 테두리
* (어두운 바위 위에서도 보인다), 다음 액트만 빈 금빛 마름모. */
export function markHtml(runtime, entry) {
    const { region, state } = entry, [cx, cy] = centre(runtime, region.zone);
    const image = state.next ? glyph(runtime, 'hollow', '#f2d28a', 2) : placeIcon(runtime, state, !state.open);
    const number = region.type === 'act' && state.open ? `<b>${region.act}</b>` : '';
    return `<span class="wm-pin ${pieceClasses(runtime, entry)}" data-wm="${region.id}" style="left:${pct(runtime, cx, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, cy, runtime.deps.WORLD_MAP.height)}"><i style="background-image:url('${image}')"></i>${number}${state.reward ? bangHtml(runtime) : ''}</span>`;
}

/** 이름표: 자리(tag)는 그림 픽셀 단위라 지도 너비에 따라 소수 px이 되는데, 글이 번지지 않게 정수 px으로 반올림하고(round) 변형 대신 0 크기 상자의 flex 정렬로 가운데를 맞춘다. */
export function tagHtml(runtime, entry) {
    const { region, state } = entry, [cx] = centre(runtime, region.zone);
    const body = state.open ? `${(0, runtime.deps.escapeHTML)(state.title)}${state.status ? `<small>${(0, runtime.deps.escapeHTML)(state.status)}</small>` : ''}` : (0, runtime.deps.escapeHTML)(lockedLabel(runtime));
    const at = `left:round(nearest,${pct(runtime, region.tag[0], runtime.deps.WORLD_MAP.width)},1px);top:round(nearest,${pct(runtime, region.tag[1], runtime.deps.WORLD_MAP.height)},1px)`;
    return `<span class="wm-tag ${region.tag[0] < cx ? 'is-left' : ''} ${pieceClasses(runtime, entry)}" data-wm="${region.id}" style="${at}"><span>${body}</span></span>`;
}

/** 한 그림에서 다른 그림으로: 누른 표식의 색이 뒤집히고, 그 자리에서 원이 퍼지며 새 그림이 덮은 뒤 넘어간다. box: 덮을 상자(지도), art: 새 그림, then: 넘어가기. */
export function spreadFrom(runtime, button, box, art, then) {
    if (!box || box.querySelector('.wm-turn')) return;
    const b = button.getBoundingClientRect(), r = box.getBoundingClientRect();
    const x = ((b.left + b.width / 2 - r.left) / r.width * 100).toFixed(2), y = ((b.top + b.height / 2 - r.top) / r.height * 100).toFixed(2);
    button.classList.add('is-turning');
    const veil = runtime.deps.document.createElement('div');
    veil.className = 'wm-turn';
    veil.style.cssText = `background-image:url('${art}');--wm-turn-x:${x}%;--wm-turn-y:${y}%`;
    box.appendChild(veil);
    (0, runtime.deps.playUiFeedbackSound)('open');
    const still = typeof runtime.deps.matchMedia === 'function' && (0, runtime.deps.matchMedia)('(prefers-reduced-motion: reduce)').matches;
    // 넘어간 뒤에는 덮개와 뒤집힌 색을 걷는다: 두 화면은 다시 그려지지 않고 남아 있어서, 걷지 않으면 돌아왔을 때 옛 그림이 지도를 덮고 있었다(2026-11-10 사용자).
    const turn = { button, veil, timer: null };
    runtime.turns.add(turn);
    turn.timer = (0, runtime.deps.setTimeout)(() => {
        try { then(); }
        finally {
            runtime.turns.delete(turn);
            veil.remove();
            button.classList.remove('is-turning');
        }
        }, still ? 0 : runtime.state.TURN_MS);
}

/** 아틀라스 입구가 선 자리(지도 그림의 백분율): 아틀라스 지도의 돌아가기 단추가 같은 자리에 선다. */
export function atlasEntranceSpot(runtime) {
    const [x, y] = centre(runtime, runtime.deps.WORLD_MAP.regions.find(row => row.id === runtime.deps.WORLD_MAP.atlas.entrance).zone);
    return { x: x / runtime.deps.WORLD_MAP.width * 100, y: y / runtime.deps.WORLD_MAP.height * 100 };
}

export function actionsHtml(runtime, { region, state }) {
    if (region.type === 'act') return runtime.state.api.actActionsHtml(state.index);
    return `<button class="wm-go" onclick="${state.go}">${(0, runtime.deps._t)('이동')}</button>`;
}

/** 설명 칸(지도 왼쪽, 사용자 11-09): 고른 곳 하나의 종류(액트 번호, 보스전 같은 한 낱말), 이름, 설명, 보상 이름(갈 곳 카드에 있던 것), 추적 중인 고유,
* 콘텐츠 자리의 바로 가기(js/world-map-brief-ui.js: 세부 탭이 지금 내주는 일), 이동 단추. 표식 그림과 대상, 상태 글(화염 군주 이그니스, 이번 루프 심화 20층)은
* 두지 않고(사용자 11-09) 칸은 그 자리의 색(--wm-tone, 표식 색)을 띤다. 덩이들은 넓은 칸에서 세로로 쌓이고(단추는 바닥) 좁은 칸(css/world-map.css)에서는
* 지도 아래 한 줄로 눕는다. 바깥 .wm-side-wrap이 칸의 자리고 안쪽 .wm-side를 peek이 바꾼다. */
export function sideFor(runtime, entry) {
    const { region, state } = entry;
    const kind = state.kind ? `<small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(state.kind))}</small>` : '';
    const reward = runtime.deps.EXPLORATION_REGIONS.guides[state.route]?.reward;
    const description = reward ? (0, runtime.deps._t)('주요 보상 · {reward}', { reward: (0, runtime.deps._t)(reward) }) : state.description;
    const blocked = state.entryBlock && state.route !== 'map-tab-underworld' ? `<p>${(0, runtime.deps.escapeHTML)(state.entryBlock)}</p>` : '';
    return `<div class="wm-side" data-wm="${region.id}" style="--wm-tone:${state.color}">
            <div class="wm-side-text">${kind}<strong>${(0, runtime.deps.escapeHTML)(state.title)}</strong>${description ? `<p>${(0, runtime.deps.escapeHTML)(description)}</p>` : ''}${blocked}${runtime.state.api.rewardNamesHtml(state.route)}${runtime.state.api.trackedRewardHtml(state.route)}</div>
            ${region.type === 'content' ? runtime.deps.worldMapBrief.html(region.route) : ''}<div class="wm-side-actions atlas-hunting-action">${actionsHtml(runtime, entry)}</div></div>`;
}

/** 올린 지역을 설명 칸에만 미리 보여 준다(전체를 다시 그리지 않는다). id가 없거나 잠긴 곳이면 쉬는 지역으로 돌아간다.
* 이미 그 지역이면 그대로 둔다: 권역을 누른 뒤 설명 칸의 단추를 누르면 권역의 blur가 먼저 오는데, 그때 칸을 다시 그리면 눌리던 단추가 사라져 클릭이 죽는다(11-08). */
export function peek(runtime, id) {
    const side = runtime.deps.document.querySelector('#ui-exploration-atlas .wm-side');
    if (!side) return;
    const open = entries(runtime).filter(e => e.state.open);
    const entry = (id && open.find(e => e.region.id === id)) || resting(runtime, open);
    if (entry && side.dataset.wm !== entry.region.id) side.outerHTML = sideFor(runtime, entry);
}

/** 한 지역에 딸린 조각(권역, 테, 지시선, 표식, 이름표)을 함께 밝히고 설명 칸을 그 지역으로 바꾸며, 다음 액트로 가는 점선을 그곳에서 잇는다. */
export function link(runtime, id, on) {
    runtime.deps.document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach(piece => piece.classList.toggle('is-linked', on));
    aimNextLink(runtime, id, on);
    peek(runtime, on ? id : null);
}

/** 한 번 누름: 설명 칸에 고정. 전체를 다시 그리지 않고 표시만 바꾼다(두 번 누름의 둘째 누름이 같은 단추에 닿아야 dblclick이 온다). */
export function pick(runtime, id) {
    runtime.state.picked = id;
    runtime.deps.document.querySelectorAll('#ui-exploration-atlas .is-picked').forEach(piece => piece.classList.remove('is-picked'));
    runtime.deps.document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach(piece => piece.classList.add('is-picked'));
    peek(runtime, id);
}

/** A story zone's act on the map (region.act is the act number, the zone index + 1); false when the map has no place for it. */
export function pickAct(runtime, zoneId) {
    const region = runtime.deps.WORLD_MAP.regions.find(row => row.type === 'act' && row.act === zoneId + 1);
    if (region) pick(runtime, region.id);
    return !!region;
}

/** 지도에 없는 열린 길(군락지, 창공, 낚시, 경계 너머): 지도 아래 줄과 길잡이의 이름 탭이 같은 목록을 쓴다. */
export function offMapRoutes(runtime) {
    const onMap = new Set(runtime.deps.WORLD_MAP.regions.flatMap(region => [region.route, ...(region.also || [])]));
    return runtime.deps.EXPLORATION_REGIONS.regions.flatMap(region => region.routes).filter(route => route !== 'map-explore-hunting' && !onMap.has(route) && runtime.state.api.available(route));
}

/** 그 밖의 곳: 지도에 없는 길만. 세부 지역(액트 목록) 단추는 없다(사용자 11-09: 완전 삭제). 그 목록은 액트 설명 칸의 세부 지역 단추로 간다. */
export function othersHtml(runtime) {
    const chips = offMapRoutes(runtime).map(route => `<button class="wm-chip" onclick="explorationAtlasUi.enter('${route}')">${(0, runtime.deps.escapeHTML)(runtime.state.api.routeLabel(route))}</button>`);
    return chips.length ? `<div class="wm-others"><span>${(0, runtime.deps._t)('그 밖의 곳')}</span>${chips.join('')}</div>` : '';
}

/** 아틀라스 입구: 아틀라스가 열린 뒤에만 지도에 선다(2026-11-09 사용자: 아틀라스 해금 전에는 없어야). */
export function atlasEntranceHtml(runtime) {
    if (!runtime.state.api.available('map-explore-worldtree')) return '';
    const region = runtime.deps.WORLD_MAP.regions.find(row => row.id === runtime.deps.WORLD_MAP.atlas.entrance);
    const [x, y] = centre(runtime, region.zone);
    const icon = glyph(runtime, region.symbol, region.color, 2);
    // 한 장 시험판(js/atlas-sheet-ui.js): 입구가 진행과 준비된 지도석 수를 달고, 따로 있던 아틀라스 지도를 거치지 않고 바로 그 화면으로 간다.
    if (!runtime.deps.atlasSheetUi.on()) return `<button type="button" class="wm-atlas-entrance" style="left:${pct(runtime, x, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, y, runtime.deps.WORLD_MAP.height)}" onclick="explorationAtlasUi.showAtlasMap(true)">
            ${(0, runtime.deps._t)('아틀라스')}<i aria-hidden="true" style="background-image:url('${icon}')"></i></button>`;
    // 한 장 시험판(2026-11-10 사용자): 글과 숫자 없이 표식만. 누르면 색이 뒤집히고 표식에서 아틀라스가 퍼져 나와 그 지도로 바뀐다(turnToAtlas).
    return `<button type="button" class="wm-atlas-entrance is-icon" style="left:${pct(runtime, x, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, y, runtime.deps.WORLD_MAP.height)}" aria-label="${(0, runtime.deps._t)('아틀라스')}" data-tip="${(0, runtime.deps._t)('아틀라스')}"
            onclick="worldMapUi.turnToAtlas(this)"><i aria-hidden="true" style="background-image:url('${atlasIcon(runtime, 'pinnacle', region.color, false, true)}')"></i></button>`;
}

export function mixHex(runtime, from, to, share) {
    const parts = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), a = parts(from), b = parts(to);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * share).toString(16).padStart(2, '0')).join('');
}

export function atlasPalette(runtime, tint, locked, calm = false) {
    const look = runtime.state.ICON_LOOKS[locked ? 'locked' : calm ? 'calm' : 'plain'], base = look.base(tint);
    return { Y: look.Y, y: look.y, d: look.d, w: look.w, p: look.p, q: look.q, G: look.G, o: runtime.state.OUTLINE, k: runtime.state.OUTLINE, a: mixHex(runtime, base, '#ffffff', look.light), b: base,
        c: mixHex(runtime, base, '#000000', .42), g: mixHex(runtime, base, '#ffffff', look.gem), s: mixHex(runtime, base, '#14111a', .82) };
}

/** One atlas icon as a data URL (2 px per dot), cached like glyph. */
export function atlasIcon(runtime, name, tint = runtime.state.ATLAS_ICON_TINT, locked = false, calm = false) {
    const key = `atlas|${name}|${tint}|${locked}|${calm}`;
    if (runtime.state.urls.has(key)) return runtime.state.urls.get(key);
    const rows = runtime.deps.WORLD_MAP.atlas.icons[name] || runtime.deps.WORLD_MAP.icons[name], palette = atlasPalette(runtime, tint, locked, calm), canvas = runtime.deps.document.createElement('canvas');
    canvas.width = rows[0].length * 2;
    canvas.height = rows.length * 2;
    const ctx = canvas.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (!palette[ch]) return;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x * 2, y * 2, 2, 2);
    }));
    runtime.state.urls.set(key, canvas.toDataURL());
    return runtime.state.urls.get(key);
}

export function atlasNodeHtml(runtime, node, point, { open, lock }) {
    const status = open && !lock ? runtime.deps.atlas.status(runtime.deps.game, node.id) : 'locked', tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const label = runtime.deps.atlasUi.nodeLabel(node, tier, status);
    const tone = (Number.isFinite(tier) && runtime.deps.atlas.tierBand(tier)?.tone) || '#ece6d8';
    const tint = runtime.deps.ATLAS.regions.find(row => row.id === node.region)?.tint || '#6f5a86';
    const icon = atlasIcon(runtime, runtime.deps.WORLD_MAP.atlas.icons[node.kind] ? node.kind : 'stone', tint, status === 'locked');
    return `<button type="button" class="wm-atlas-node is-${status} kind-${node.kind}" style="${atlasAnchorStyle(runtime, point)};--wm-tier:${tone}" data-atlas-node="${node.id}"
            aria-label="${label}" data-tip="${label}" aria-disabled="${!open}" onclick="explorationAtlasUi.enterAtlasNode('${node.id}')"><span aria-hidden="true" style="background-image:url('${icon}')">${node.kind === 'map' ? tier : ''}</span></button>`;
}

export function atlasRegionRoutes(runtime, points) {
    return runtime.deps.atlas.links.filter(([from, to]) => points.has(from) && points.has(to)).map(([from, to]) => {
        const [x1, y1] = points.get(from), [x2, y2] = points.get(to);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke"/>`;
    }).join('');
}

export function atlasRegionHtml(runtime, anchor, access) {
    const region = runtime.deps.ATLAS.regions.find(row => row.id === anchor.id);
    const lore = runtime.deps.ATLAS.lore.regions[region.id];
    const nodes = runtime.deps.atlas.nodes.filter(node => node.region === region.id);
    const points = new Map(nodes.map(node => [node.id, anchor.nodes[node.slot]]));
    const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name));
    return `<div class="wm-atlas-territory" role="group" aria-label="${name}" data-atlas-region="${region.id}" style="--wm-region:${region.tint}">
            <svg class="wm-atlas-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${atlasRegionRoutes(runtime, points)}</svg>
            <button type="button" class="wm-atlas-region" style="${atlasAnchorStyle(runtime, anchor.label)}"
                data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.note))}" onclick="explorationAtlasUi.enterAtlasRegion('${region.id}')" ${access.open ? '' : 'disabled'}>${name}</button>
            ${nodes.map(node => atlasNodeHtml(runtime, node, points.get(node.id), access)).join('')}</div>`;
}

export function atlasOverviewHtml(runtime) {
    const access = { open: runtime.state.api.available('map-explore-worldtree'), lock: runtime.deps.atlas.lockReason(runtime.deps.game) };
    return `<div class="world-map wm-atlas-overview"><div class="wm-side-wrap"><div class="wm-side">
            <div class="wm-side-text"><strong>${(0, runtime.deps._t)('아틀라스')}</strong>
            <p>${(0, runtime.deps._t)('어머니 나무 이전, 고대 존재들이 남긴 다섯 권역입니다.')}</p>
            <p class="wm-atlas-legend"><span><i style="background-image:url('${atlasIcon(runtime, 'guardian')}')"></i>${(0, runtime.deps._t)('지역 수호자')}</span><span><i style="background-image:url('${atlasIcon(runtime, 'pinnacle', '#6f5a86')}')"></i>${(0, runtime.deps._t)('정점')}</span></p>
            ${access.lock ? `<p class="wm-atlas-lock">${(0, runtime.deps.escapeHTML)(access.lock)}</p>` : ''}</div>
            <div class="wm-side-actions atlas-hunting-action"><button type="button" class="wm-atlas-back" onclick="explorationAtlasUi.showAtlasMap(false)"><span aria-hidden="true">←</span> ${(0, runtime.deps._t)('세계 지도')}</button></div>
            </div></div><div class="wm-view"><div class="wm-map wm-atlas-map" role="group" aria-label="${(0, runtime.deps._t)('아틀라스')}">
            <div class="wm-art wm-atlas-art" aria-hidden="true" style="background-image:url('${runtime.deps.WORLD_MAP.atlas.src}')"></div>
            ${runtime.deps.WORLD_MAP.atlas.regions.map(region => atlasRegionHtml(runtime, region, access)).join('')}
            ${atlasNodeHtml(runtime, runtime.deps.atlas.node('pinnacle'), runtime.deps.WORLD_MAP.atlas.pinnacle, access)}</div></div></div>`;
}

/** 전체 탐험 몸통: 왼쪽 설명 칸, 오른쪽 지도, 지도 아래 그 밖의 곳(있을 때만, has-others가 설명 칸을 그 줄까지 늘인다). reader: explorationAtlasUi의 읽기 함수 묶음. */
export function overviewHtml(runtime, reader) {
    runtime.state.api = reader;
    if (runtime.state.atlasMap) return atlasOverviewHtml(runtime);
    const all = entries(runtime).filter(e => e.region.id !== runtime.deps.WORLD_MAP.atlas.entrance);
    const open = all.filter(e => e.state.open), others = othersHtml(runtime);
    if (!open.some(e => e.region.id === runtime.state.picked)) runtime.state.picked = null;
    // 잠긴 곳은 바로 다음 액트만 보인다(2026-11-09 사용자: 아직 닿지 않은 곳이 너무 많으니 차근차근 생기게): 나머지는 열릴 때 나타난다.
    const shown = all.filter(e => e.state.open || e.state.next);
    const layers = `<svg class="wm-lines" viewBox="0 0 ${runtime.deps.WORLD_MAP.width} ${runtime.deps.WORLD_MAP.height}" aria-hidden="true">${shown.map(runtime.handlers.linesHtml).join('')}${nextLinkHtml(runtime, all)}</svg>`
        + shown.map(runtime.handlers.zoneHtml).join('') + shown.map(runtime.handlers.markHtml).join('') + shown.map(runtime.handlers.tagHtml).join('');
    return `<div class="world-map${others ? ' has-others' : ''}">${open.length ? `<div class="wm-side-wrap">${sideFor(runtime, resting(runtime, open))}</div>` : ''}<div class="wm-view"><div class="wm-map" role="group" aria-label="${(0, runtime.deps._t)('세계 지도')}">`
        + `<div class="wm-art" style="background-image:url('${runtime.deps.WORLD_MAP.src}')"></div>${layers}${atlasEntranceHtml(runtime)}</div></div>${others}</div>`;
}

/** 세부 화면 위 길잡이의 자리 탭(explorationAtlasUi locationHtml): 지도의 열린 자리마다 표식 하나. 액트는 '나무' 하나에 현재 액트 번호. 눌린 자리만 이름이 펼쳐진다. */
export function placeTabsHtml(runtime, reader, route) {
    runtime.state.api = reader;
    const open = entries(runtime).filter(e => e.state.open), acts = open.filter(e => e.region.type === 'act');
    const act = acts.find(e => e.state.current) || acts[acts.length - 1];
    const tree = act ? [placeTabHtml(runtime, { ...act.state, title: (0, runtime.deps._t)('나무'), reward: acts.some(e => e.state.reward) }, route, act.region.act)] : [];
    return tree.concat(open.filter(e => e.region.type === 'content').map(e => placeTabHtml(runtime, e.state, route, ''))).join('');
}

export function placeTabHtml(runtime, state, route, number) {
    const on = state.route === route || (state.also || []).includes(route);
    return `<button class="exploration-place-tab${state.attention ? ' is-attention' : ''}" aria-pressed="${on}"${on ? '' : ` data-tip="${(0, runtime.deps.escapeHTML)(state.title)}"`} onclick="explorationAtlasUi.enter('${state.route}')">`
        + `<i style="background-image:url('${placeIcon(runtime, state)}')">${number ? `<b>${number}</b>` : ''}${state.reward ? bangHtml(runtime) : ''}</i><span>${(0, runtime.deps.escapeHTML)(state.title)}</span></button>`;
}

export function pct(runtime, value, total) { return `${(value / total * 100).toFixed(3)}%`; }

export function entries(runtime) { return runtime.deps.WORLD_MAP.regions.map(region => ({ region, state: region.type === 'act' ? actState(runtime, region) : contentState(runtime, region) })); }

export function pieceClasses(runtime, { region, state }) { return [state.open ? '' : 'is-locked', state.cleared ? 'is-cleared' : '', state.current ? 'is-current' : '', state.next ? 'is-next' : '',
        state.attention ? 'is-attention' : '', state.reward ? 'is-reward' : '', runtime.state.picked === region.id ? 'is-picked' : ''].filter(Boolean).join(' '); }

export function lockedLabel(runtime) { return (0, runtime.deps._t)('아직 닿지 않은 곳'); }

export function point(runtime, region) { return centre(runtime, region.zone).map(v => v.toFixed(1)).join(','); }

export function actAfter(runtime, region) { return runtime.deps.WORLD_MAP.regions.find(other => other.type === 'act' && other.act === region.act + 1); }

export function placeIcon(runtime, state, locked = false) { return atlasIcon(runtime, state.icon || 'act', state.color, locked, true); }

export function bangHtml(runtime) { return `<em style="background-image:url('${glyph(runtime, 'bang', '#ffd82e', 2)}')"></em>`; }

export function turnToAtlas(runtime, button) { return spreadFrom(runtime, button, button.closest('.wm-map'), runtime.deps.WORLD_MAP.atlas.src, () => runtime.deps.explorationAtlasUi.enter('map-explore-worldtree')); }

export function turnToWorld(runtime, button) { return spreadFrom(runtime, button, button.closest('.as-chart'), runtime.deps.WORLD_MAP.src, () => runtime.deps.explorationAtlasUi.open()); }

export function resting(runtime, open) { return open.find(e => e.region.id === runtime.state.picked) || open.find(e => e.state.current) || open.filter(e => e.region.type === 'act').pop() || open[0]; }

export function atlasAnchorStyle(runtime, [x, y]) { return `left:${x}%;top:${y}%`; }
