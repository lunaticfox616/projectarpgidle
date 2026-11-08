// 세계 지도(2026-11-08, 사용자의 지도 그림과 편집기 좌표, data/world-map.js): 지도 탭 전체 탐험 화면의 몸통. 지형 폴리곤(zone)이 입구다.
// 올리면 그 지형 조각만 밝아지고(같은 지도 그림을 clip-path로 잘라 둔 단추, 조각 그림 없음) 금빛 점선 테가 두르며, 이름표는 지형을 가리지 않도록
// 양피지 여백(tag)에 지시선으로 빼서 뜬다. 표식은 폴리곤의 무게중심에 있고, 올린 곳, 고른 곳, 현재 위치는 표식이 커지며 빛난다(표식 둘레의 네모 테는
// 쓰지 않는다, 사용자 11-08). 한 번 누르면 지도 왼쪽의 설명 칸에 고정하고(고른 곳 하나만, 다른 지역 목록은 없다, 사용자 11-09) 두 번 누르면 그 자리로
// 들어간다. 열린 곳만 이름을 내준다: 액트는 game.maxZoneId까지, 콘텐츠는 그 길의 열림(explorationAtlasUi available). 잠긴 곳은 세피아 인장으로만 찍혀 있고
// 다음 액트는 빈 마름모. 이동은 기존 입구(explorationAtlasUi.hunt, enter, 액트 단추 묶음)가 맡고, 이 파일은 그 이름을 onclick 글로만 적는다. 세부 화면 위
// 길잡이의 자리 탭(placeTabsHtml)도 같은 표식으로 그린다. 지도는 설명 칸 오른쪽의 남은 너비를 채우고(비율 고정) 688px보다 좁으면 가로로 스크롤한다.
const worldMapUi = (() => {
    const urls = new Map();
    let picked = null;   // 설명 칸에 고정한 지역 id
    let api = null;      // explorationAtlasUi의 읽기 함수 묶음: available, routeLabel, routeSummary, actActionsHtml, trackedRewardHtml, rewardNamesHtml
    const INK = '#6b4a2a', PARCHMENT = '#f3dfb4', OUTLINE = '#1a120a';
    const pct = (value, total) => `${(value / total * 100).toFixed(3)}%`;

    /** 폴리곤의 무게중심(그림 픽셀): 표식 자리와 지시선의 시작(사용자 11-08: 표식은 구역 가운데). */
    function centre(zone) {
        let area = 0, cx = 0, cy = 0;
        zone.forEach(([x1, y1], i) => {
            const [x2, y2] = zone[(i + 1) % zone.length], f = x1 * y2 - x2 * y1;
            area += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
        });
        return [cx / (3 * area), cy / (3 * area)];
    }
    /** 도트 표식을 캔버스로 한 번 그려 data URL로 둔다(1칸 바깥 테두리 포함 13x13칸, 칸마다 scale px). outline: 테두리색(인장은 밝은 양피지색). */
    function glyph(name, color, scale, outline = OUTLINE) {
        const key = `${name}|${color}|${scale}|${outline}`;
        if (urls.has(key)) return urls.get(key);
        const rows = WORLD_MAP.symbols[name] || WORLD_MAP.symbols.diamond;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 13 * scale;
        const ctx = canvas.getContext('2d');
        const cells = [];
        rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([x + 1, y + 1]); }));
        ctx.fillStyle = outline;
        for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ctx.fillRect((x + dx) * scale, (y + dy) * scale, scale, scale);
        ctx.fillStyle = color;
        for (const [x, y] of cells) ctx.fillRect(x * scale, y * scale, scale, scale);
        urls.set(key, canvas.toDataURL());
        return urls.get(key);
    }
    /** 액트 자리: 열림은 maxZoneId까지, 완료는 그 앞, 현재는 currentZoneId. next는 바로 다음 액트(잠긴 채 '다음 액트'로, 다른 인장과 달리 빈 금빛 마름모).
     * reward는 그 액트에 받을 보상이 남은 것(표식의 !). go: 두 번 누름과 설명 칸의 이동. */
    function actState(region) {
        const index = region.act - 1, maximum = game.maxZoneId, act = STORY_ACTS[index];
        const current = game.currentZoneId === index, cleared = index < maximum;
        return { index, open: api.available('map-explore-hunting') && index <= maximum, cleared, current, next: index === maximum + 1, attention: false,
            reward: api.actRewardZoneIds().includes(index), status: _t(current ? '현재 위치' : cleared ? '완료' : '진행 중'),
            color: current ? '#ffe39a' : cleared ? '#c9a862' : '#f2d28a', title: _t(act.title), kind: formatStoryActLabel(act),
            description: act.subtitle ? _t(act.subtitle) : '', target: '', symbol: 'diamond', route: 'map-explore-hunting', go: `explorationAtlasUi.hunt(${index})` };
    }
    /** 콘텐츠 자리: 열림은 그 길의 단추와 해금(available). 상태 글은 전처럼 입장 조건, 아니면 진행 요약. */
    function contentState(region) {
        const button = document.getElementById('btn-' + region.route);
        const summary = api.routeSummary(region.route);
        const status = region.route === 'map-explore-root-boss' ? '' : button?.dataset.entryCondition || summary.status || '';
        return { open: api.available(region.route), cleared: false, current: false, next: false, attention: !!summary.attention, status, color: region.color,
            title: _t(region.name), kind: EXPLORATION_REGIONS.activities[region.route]?.kind || '', description: region.description ? _t(region.description) : '',
            target: summary.target || '', symbol: region.symbol, route: region.route, go: `explorationAtlasUi.enter('${region.route}')` };
    }
    const entries = () => WORLD_MAP.regions.map(region => ({ region, state: region.type === 'act' ? actState(region) : contentState(region) }));
    const pieceClasses = ({ region, state }) => [state.open ? '' : 'is-locked', state.cleared ? 'is-cleared' : '', state.current ? 'is-current' : '', state.next ? 'is-next' : '',
        state.attention ? 'is-attention' : '', state.reward ? 'is-reward' : '', picked === region.id ? 'is-picked' : ''].filter(Boolean).join(' ');
    const lockedLabel = () => _t('아직 닿지 않은 곳');

    /** 권역 단추: 폴리곤의 둘레 상자에 놓고 clip-path로 폴리곤만 남긴다(클릭 영역도). 바탕은 같은 지도 그림을 그 상자 자리만큼 잘라 둔 것이라
     * 올리면 그 지형 조각만 밝아진다. background-position %는 상자와 그림의 너비 차에 대한 비율이라 bx/(W-bw)다. 한 번 누르면 고정, 두 번 누르면 입장. */
    function zoneHtml(entry) {
        const { region, state } = entry, { width: W, height: H, src } = WORLD_MAP;
        const xs = region.zone.map(p => p[0]), ys = region.zone.map(p => p[1]);
        const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
        const clip = region.zone.map(([x, y]) => `${((x - bx) / bw * 100).toFixed(2)}% ${((y - by) / bh * 100).toFixed(2)}%`).join(',');
        const style = `left:${pct(bx, W)};top:${pct(by, H)};width:${pct(bw, W)};height:${pct(bh, H)};clip-path:polygon(${clip});background-image:url('${src}');`
            + `background-size:${pct(W, bw)} ${pct(H, bh)};background-position:${pct(bx, W - bw)} ${pct(by, H - bh)}`;
        const hover = `onmouseenter="worldMapUi.link('${region.id}',true)" onfocus="worldMapUi.link('${region.id}',true)"`
            + ` onmouseleave="worldMapUi.link('${region.id}',false)" onblur="worldMapUi.link('${region.id}',false)"`;
        const press = state.open ? `onclick="worldMapUi.pick('${region.id}')" ondblclick="${state.go}"` : 'aria-disabled="true"';
        return `<button class="wm-zone ${pieceClasses(entry)}" data-wm="${region.id}" aria-label="${escapeHTML(state.open ? state.title : lockedLabel())}" style="${style}" ${hover} ${press}></button>`;
    }
    /** 지형을 두르는 테(어두운 밑테 위 금빛 점선)와 무게중심에서 여백의 이름표 자리로 가는 지시선. */
    function linesHtml(entry) {
        const { region } = entry, cls = pieceClasses(entry), points = region.zone.map(p => p.join(',')).join(' '), [cx, cy] = centre(region.zone);
        return `<polygon class="wm-outline-under ${cls}" data-wm="${region.id}" points="${points}"/><polygon class="wm-outline ${cls}" data-wm="${region.id}" points="${points}"/>`
            + `<polyline class="wm-leader ${cls}" data-wm="${region.id}" points="${cx.toFixed(1)},${cy.toFixed(1)} ${region.tag[0]},${region.tag[1]}"/>`;
    }
    const point = region => centre(region.zone).map(v => v.toFixed(1)).join(',');
    const actAfter = region => WORLD_MAP.regions.find(other => other.type === 'act' && other.act === region.act + 1);
    /** 액트에서 그다음 액트로 가는 점선(사용자 11-08: 글이나 테 대신 진행 방향만): 평소엔 현재 위치의 액트(없으면 마지막으로 연 액트)에서 그다음 액트로,
     * 액트에 마우스를 올리면 그 액트에서 그다음 액트로 잇는다(액트 3에 올리면 액트 4로). 마지막 액트에서는 선이 없다. */
    function nextLinkHtml(all) {
        const acts = all.filter(e => e.state.open && e.region.type === 'act');
        const from = acts.find(e => e.state.current) || acts[acts.length - 1], to = from && actAfter(from.region);
        const rest = to ? `${point(from.region)} ${point(to)}` : '';
        return `<polyline class="wm-next-link" data-rest="${rest}" points="${rest}"/>`;
    }
    function aimNextLink(id, on) {
        const line = document.querySelector('#ui-exploration-atlas .wm-next-link');
        if (!line) return;
        const hovered = on ? WORLD_MAP.regions.find(region => region.id === id && region.type === 'act') : null;
        const to = hovered && actAfter(hovered);
        line.setAttribute('points', hovered ? (to ? `${point(hovered)} ${point(to)}` : '') : line.dataset.rest);
    }
    /** 표식: 권역 단추 위, 구역 가운데의 그림(클릭은 권역이 받는다). 열린 액트는 번호를 품고 받을 보상이 있으면 !을 단다. 잠긴 곳은 잉크색 인장에 밝은 테두리
     * (어두운 바위 위에서도 보인다), 다음 액트만 빈 금빛 마름모. */
    function markHtml(entry) {
        const { region, state } = entry, [cx, cy] = centre(region.zone);
        const image = state.open ? glyph(state.symbol, state.color, 2) : state.next ? glyph('hollow', '#f2d28a', 2) : glyph(state.symbol, INK, 2, PARCHMENT);
        const number = region.type === 'act' && state.open ? `<b>${region.act}</b>` : '';
        return `<span class="wm-pin ${pieceClasses(entry)}" data-wm="${region.id}" style="left:${pct(cx, WORLD_MAP.width)};top:${pct(cy, WORLD_MAP.height)}"><i style="background-image:url('${image}')"></i>${number}${state.reward ? bangHtml() : ''}</span>`;
    }
    /** 받을 보상의 !: 노란 도트 글자 하나(테나 바탕 없이, 사용자 11-08). 표식과 길잡이의 나무 탭이 같이 쓴다. */
    const bangHtml = () => `<em style="background-image:url('${glyph('bang', '#ffd82e', 2)}')"></em>`;
    /** 이름표: 자리(tag)는 그림 픽셀 단위라 지도 너비에 따라 소수 px이 되는데, 글이 번지지 않게 정수 px으로 반올림하고(round) 변형 대신 0 크기 상자의 flex 정렬로 가운데를 맞춘다. */
    function tagHtml(entry) {
        const { region, state } = entry, [cx] = centre(region.zone);
        if (state.next) return '';
        const body = state.open ? `${escapeHTML(state.title)}${state.status ? `<small>${escapeHTML(state.status)}</small>` : ''}` : escapeHTML(lockedLabel());
        const at = `left:round(nearest,${pct(region.tag[0], WORLD_MAP.width)},1px);top:round(nearest,${pct(region.tag[1], WORLD_MAP.height)},1px)`;
        return `<span class="wm-tag ${region.tag[0] < cx ? 'is-left' : ''} ${pieceClasses(entry)}" data-wm="${region.id}" style="${at}"><span>${body}</span></span>`;
    }

    /** 설명 칸이 쉴 때의 지역: 고른 곳, 아니면 현재 위치, 아니면 마지막으로 연 액트. */
    const resting = open => open.find(e => e.region.id === picked) || open.find(e => e.state.current) || open.filter(e => e.region.type === 'act').pop() || open[0];
    function actionsHtml({ region, state }) {
        if (region.type === 'act') return api.actActionsHtml(state.index);
        return `<button class="wm-go" onclick="${state.go}">${_t('이동')}</button>`;
    }
    /** 설명 칸(지도 왼쪽, 사용자 11-09): 고른 곳 하나의 표식, 종류와 상태, 이름, 설명, 보상 이름(갈 곳 카드에 있던 것), 추적 중인 고유, 콘텐츠 자리의
     * 바로 가기(js/world-map-brief-ui.js: 세부 탭이 지금 내주는 일), 이동 단추. 덩이들은 넓은 칸에서 세로로 쌓이고(단추는 바닥) 좁은 칸(css/world-map.css)에서는
     * 지도 아래 한 줄로 눕는다. 바깥 .wm-side-wrap이 칸의 자리고 안쪽 .wm-side를 peek이 바꾼다. */
    function sideFor(entry) {
        const { region, state } = entry;
        const line = [state.kind, state.target, state.status].filter(Boolean).map(text => escapeHTML(_t(text))).join(', ');
        return `<div class="wm-side" data-wm="${region.id}"><i style="background-image:url('${glyph(state.symbol, state.color, 3)}')"></i>
            <div class="wm-side-text"><small>${line}</small><strong>${escapeHTML(state.title)}</strong>${state.description ? `<p>${escapeHTML(state.description)}</p>` : ''}${api.rewardNamesHtml(state.route)}${api.trackedRewardHtml(state.route)}</div>
            ${region.type === 'content' ? worldMapBrief.html(region.route) : ''}<div class="wm-side-actions atlas-hunting-action">${actionsHtml(entry)}</div></div>`;
    }
    /** 올린 지역을 설명 칸에만 미리 보여 준다(전체를 다시 그리지 않는다). id가 없거나 잠긴 곳이면 쉬는 지역으로 돌아간다.
     * 이미 그 지역이면 그대로 둔다: 권역을 누른 뒤 설명 칸의 단추를 누르면 권역의 blur가 먼저 오는데, 그때 칸을 다시 그리면 눌리던 단추가 사라져 클릭이 죽는다(11-08). */
    function peek(id) {
        const side = document.querySelector('#ui-exploration-atlas .wm-side');
        if (!side) return;
        const open = entries().filter(e => e.state.open);
        const entry = (id && open.find(e => e.region.id === id)) || resting(open);
        if (entry && side.dataset.wm !== entry.region.id) side.outerHTML = sideFor(entry);
    }
    /** 한 지역에 딸린 조각(권역, 테, 지시선, 표식, 이름표)을 함께 밝히고 설명 칸을 그 지역으로 바꾸며, 다음 액트로 가는 점선을 그곳에서 잇는다. */
    function link(id, on) {
        document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach(piece => piece.classList.toggle('is-linked', on));
        aimNextLink(id, on);
        peek(on ? id : null);
    }
    /** 한 번 누름: 설명 칸에 고정. 전체를 다시 그리지 않고 표시만 바꾼다(두 번 누름의 둘째 누름이 같은 단추에 닿아야 dblclick이 온다). */
    function pick(id) {
        picked = id;
        document.querySelectorAll('#ui-exploration-atlas .is-picked').forEach(piece => piece.classList.remove('is-picked'));
        document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach(piece => piece.classList.add('is-picked'));
        peek(id);
    }
    /** 지도에 없는 열린 길(군락지, 창공, 낚시, 경계 너머): 지도 아래 줄과 길잡이의 이름 탭이 같은 목록을 쓴다. */
    function offMapRoutes() {
        const onMap = new Set(WORLD_MAP.regions.map(region => region.route));
        return EXPLORATION_REGIONS.regions.flatMap(region => region.routes).filter(route => route !== 'map-explore-hunting' && !onMap.has(route) && api.available(route));
    }
    function othersHtml() {
        const chips = (api.available('map-explore-hunting') ? [`<button class="wm-chip" onclick="explorationAtlasUi.enter('map-explore-hunting')">${_t('세부 지역')}</button>`] : [])
            .concat(offMapRoutes().map(route => `<button class="wm-chip" onclick="explorationAtlasUi.enter('${route}')">${escapeHTML(api.routeLabel(route))}</button>`));
        return chips.length ? `<div class="wm-others"><span>${_t('그 밖의 곳')}</span>${chips.join('')}</div>` : '';
    }
    /** 전체 탐험 몸통: 왼쪽 설명 칸, 오른쪽 지도, 지도 아래 그 밖의 곳. reader: explorationAtlasUi의 읽기 함수 묶음. */
    function overviewHtml(reader) {
        api = reader;
        const all = entries(), open = all.filter(e => e.state.open);
        if (!open.some(e => e.region.id === picked)) picked = null;
        const layers = `<svg class="wm-lines" viewBox="0 0 ${WORLD_MAP.width} ${WORLD_MAP.height}" aria-hidden="true">${all.map(linesHtml).join('')}${nextLinkHtml(all)}</svg>`
            + all.map(zoneHtml).join('') + all.map(markHtml).join('') + all.map(tagHtml).join('');
        return `<div class="world-map">${open.length ? `<div class="wm-side-wrap">${sideFor(resting(open))}</div>` : ''}<div class="wm-view"><div class="wm-map" role="group" aria-label="${_t('세계 지도')}">`
            + `<div class="wm-art" style="background-image:url('${WORLD_MAP.src}')"></div>${layers}</div></div>${othersHtml()}</div>`;
    }
    /** 세부 화면 위 길잡이의 자리 탭(explorationAtlasUi locationHtml): 지도의 열린 자리마다 표식 하나. 액트는 '나무' 하나에 현재 액트 번호. 눌린 자리만 이름이 펼쳐진다. */
    function placeTabsHtml(reader, route) {
        api = reader;
        const open = entries().filter(e => e.state.open), acts = open.filter(e => e.region.type === 'act');
        const act = acts.find(e => e.state.current) || acts[acts.length - 1];
        const tree = act ? [placeTabHtml({ ...act.state, title: _t('나무'), reward: acts.some(e => e.state.reward) }, route, act.region.act)] : [];
        return tree.concat(open.filter(e => e.region.type === 'content').map(e => placeTabHtml(e.state, route, ''))).join('');
    }
    function placeTabHtml(state, route, number) {
        const on = state.route === route;
        return `<button class="exploration-place-tab${state.attention ? ' is-attention' : ''}" aria-pressed="${on}"${on ? '' : ` data-tip="${escapeHTML(state.title)}"`} onclick="explorationAtlasUi.enter('${state.route}')">`
            + `<i style="background-image:url('${glyph(state.symbol, state.color, 2)}')">${number ? `<b>${number}</b>` : ''}${state.reward ? bangHtml() : ''}</i><span>${escapeHTML(state.title)}</span></button>`;
    }
    return { overviewHtml, placeTabsHtml, offMapRoutes, pick, link };
})();
safeExposeGlobals({ worldMapUi });
