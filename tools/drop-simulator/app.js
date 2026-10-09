// 드랍 시뮬레이터 화면(scripts/drop-simulator-server.js가 띄운다). 서버가 실제 게임 코드로 굴린 지도 줄과 집계를 그린다. 게임에서는 불러오지 않는다.
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const RARITY = { normal: '일반', magic: '마법', rare: '희귀', unique: '고유' };
    const KIND_LABEL = { gear: '장비', drops: '처치 드랍', bonus: '지도 효과' };
    let catalog = null;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const fixed = (value, digits = 2) => Number(value || 0).toFixed(digits);
    const omenOf = id => catalog.omens.find(omen => omen.id === id) || null;
    const leafOf = id => catalog.leaves.find(leaf => leaf.id === id) || null;

    async function loadCatalog() {
        catalog = await (await fetch('/api/catalog')).json();
        const select = $('omen-select');
        for (const kind of Object.keys(KIND_LABEL)) {
            const group = document.createElement('optgroup');
            group.label = KIND_LABEL[kind];
            catalog.omens.filter(omen => omen.kind === kind).forEach(omen => group.append(new Option(omen.name, omen.id)));
            select.append(group);
        }
    }

    // ---------------------------------------------------------------- chips
    const momentClass = moment => (moment ? ` moment-${moment}` : '');
    function equipmentChip(drop) {
        const flags = [drop.corrupted ? '타락' : '', drop.exceptional ? '특출' : '', drop.socket ? '소켓' : '', drop.chase ? '체이싱' : ''].filter(Boolean);
        const art = drop.art ? `<img src="/${esc(drop.art)}" alt="">` : '<span class="glyph"></span>';
        return `<span class="sim-chip is-${drop.rarity}${momentClass(drop.moment)}" title="${esc(drop.baseName)} T${drop.tier}, ${esc(drop.slot)}">${art}${esc(drop.name)}`
            + `${flags.length ? ` <i>${flags.join(', ')}</i>` : ''}</span>`;
    }
    function currencyChip(key, count) {
        const info = catalog.currencies[key] || { name: key, icon: null, moment: null };
        const art = info.icon ? `<img src="/${esc(info.icon)}" alt="">` : '<span class="glyph"></span>';
        return `<span class="sim-chip${momentClass(info.moment)}">${art}${esc(info.name)} <b>×${count}</b></span>`;
    }
    function leafChip(id, count, first) {
        const leaf = leafOf(id);
        return `<span class="sim-chip is-leaf${first ? ' moment-great' : ''}" title="${esc(leaf ? `${leaf.set}장, ${leaf.reward}` : '')}">`
            + `<span class="glyph"></span>${esc(leaf ? leaf.name : id)}${count > 1 ? ` <b>×${count}</b>` : ''}${first ? ' <i>새 잎</i>' : ''}</span>`;
    }
    function otherChip(drop) {
        if (drop.kind === 'jewel') return `<span class="sim-chip is-${drop.rarity}${momentClass(drop.moment)}"><span class="glyph"></span>${esc(drop.name)}</span>`;
        if (drop.kind === 'talisman') return `<span class="sim-chip${momentClass(drop.moment)}"><span class="glyph"></span>야생 부적 ${esc(drop.name || drop.currency)}</span>`;
        return `<span class="sim-chip"><span class="glyph"></span>${drop.gemKind === 'attack' ? '공격' : '보조'} 젬 ${esc(drop.name || '잔향')}</span>`;
    }
    function lootHtml(map) {
        const leaves = (map.leaves && map.leaves.gained) || {}, first = (map.leaves && map.leaves.first) || [];
        const chips = [
            ...map.drops.filter(drop => drop.kind === 'equipment').sort((a, b) => rank(b) - rank(a)).map(equipmentChip),
            ...map.drops.filter(drop => drop.kind !== 'equipment').map(otherChip),
            ...Object.entries(leaves).map(([id, n]) => leafChip(id, n, first.includes(id))),
            ...Object.entries(map.currencies).sort((a, b) => currencyRank(b[0]) - currencyRank(a[0]) || b[1] - a[1]).map(([key, n]) => currencyChip(key, n)),
            ...(map.maps.length ? [`<span class="sim-chip is-map"><span class="glyph"></span>지도석 <b>×${map.maps.length}</b></span>`] : []),
            ...Object.entries(map.fragments).map(([id, n]) => `<span class="sim-chip"><span class="glyph"></span>${esc(catalog.fragments[id] || id)} <b>×${n}</b></span>`)
        ];
        return chips.length ? chips.join('') : '<span class="sim-empty">아무것도 없음</span>';
    }
    const MOMENT_RANK = { jackpot: 3, great: 2, good: 1 };
    const rank = drop => (MOMENT_RANK[drop.moment] || 0) * 10 + ['normal', 'magic', 'rare', 'unique'].indexOf(drop.rarity);
    const currencyRank = key => MOMENT_RANK[(catalog.currencies[key] || {}).moment] || 0;
    function mapHtml(map, index) {
        const omen = map.map.omen, node = catalog.nodes[map.map.node] || map.map.node;
        const rooms = map.map.encounters.length ? `<span class="sim-room">방 ${map.map.encounters.length}${map.map.golden.length ? ', 황금 방' : ''}</span>` : '';
        const treasure = map.counts.treasure ? `<span class="sim-room${map.counts.golden ? ' is-golden' : ''}">${map.counts.golden ? '황금 보물' : '보물 무리'} ${map.counts.treasure}</span>` : '';
        return `<article class="sim-map"><header><b>#${index + 1} ${esc(node)}</b><small>${map.map.tier}등급, ${RARITY[map.map.rarity]}</small>`
            + `${omen ? `<span class="sim-omen" style="--omen:${omen.tone}">${esc(omen.name)} ×${map.map.omenStrength}</span>` : ''}${rooms}${treasure}`
            + `<small>처치 ${map.counts.regular + map.counts.elite + map.counts.boss}, 상자 ${map.counts.objects}</small></header><div class="sim-loot">${lootHtml(map)}</div></article>`;
    }

    // ---------------------------------------------------------------- summary and side
    function stat(label, value, note, tone = '') {
        return `<div class="sim-stat${tone ? ` is-${tone}` : ''}"><small>${label}</small><b>${value}</b>${note ? `<em>${note}</em>` : ''}</div>`;
    }
    function renderSummary(result) {
        const r = result.report, unique = r.totals['equipment:unique'] || 0;
        $('sim-summary').innerHTML = [
            stat('판마다 종류', fixed(r.kindsPerMap, 1), `${r.maps}판 동안 ${r.distinctKinds}종`),
            stat('다음 판과 겹침', `${Math.round(r.overlapNext * 100)}%`, '낮을수록 판마다 다름'),
            stat('큰 발견', fixed(r.momentsPerMap.great), unique ? `판마다, 고유 ${fixed(unique)}` : '판마다', 'great'),
            stat('대박', fixed(r.momentsPerMap.jackpot, 3), r.momentsPerMap.jackpot ? `${Math.round(1 / r.momentsPerMap.jackpot)}판에 한 번꼴` : '판마다', 'jackpot'),
            stat('보물 무리', fixed(r.treasurePerMap), '판마다'),
            stat('기억의 잎', fixed(r.leavesPerMap), `본 잎 ${r.leafSeen}/${catalog.leaves.length}`, 'leaf'),
            stat('재화 종류', fixed(r.currencyKindsPerMap, 1), '판마다'),
            stat('계산', `${(result.elapsedMs / 1000).toFixed(1)}초`, `등급 ${result.options.tier}, 루프 ${result.options.loop}`)
        ].join('');
    }
    function barsHtml(rows, max) {
        return rows.map(([label, value, tone]) => `<div class="sim-bar${tone ? ` is-${tone}` : ''}"><span title="${esc(label)}">${esc(label)}</span>`
            + `<i style="width:${Math.max(1, value / Math.max(max, 1e-9) * 100).toFixed(1)}%"></i><b>${fixed(value)}</b></div>`).join('');
    }
    function renderKinds(report) {
        const rows = ['normal', 'magic', 'rare', 'unique'].map(rarity => [`장비 ${RARITY[rarity]}`, report.totals[`equipment:${rarity}`] || 0, rarity === 'unique' ? 'unique' : ''])
            .concat([['주얼', report.totals.jewel || 0], ['야생 부적', report.totals.talisman || 0], ['젬', report.totals.gem || 0], ['기억의 잎', report.leavesPerMap, 'leaf']]);
        $('sim-kinds').innerHTML = barsHtml(rows, Math.max(...rows.map(row => row[1])));
    }
    function renderCurrencies(report) {
        const rows = Object.entries(report.currencies).slice(0, 30).map(([key, value]) => [(catalog.currencies[key] || {}).name || key, value]);
        $('sim-currencies').innerHTML = rows.length ? barsHtml(rows, Math.max(...rows.map(row => row[1]))) : '<span class="sim-empty">없음</span>';
    }
    function renderOmens(rows) {
        const body = rows.map(row => {
            const omen = omenOf(row.id);
            return `<tr><td>${omen ? `<span class="sim-omen" style="--omen:${omen.tone}">${esc(omen.name)}</span>` : '기운 없음'}</td><td>${row.maps}</td>`
                + `<td>${fixed(row.drops, 1)}</td><td>${fixed(row.currency, 1)}</td><td>${fixed(row.leaves)}</td></tr>`;
        }).join('');
        $('sim-omens').innerHTML = `<table class="sim-table"><thead><tr><th>기운</th><th>판</th><th>아이템</th><th>재화</th><th>잎</th></tr></thead><tbody>${body}</tbody></table>`;
    }
    function kindLabel(kind) {
        const [type, ...rest] = kind.split(':'), id = rest.join(':');
        const labels = { currency: () => (catalog.currencies[id] || {}).name || id, unique: () => `고유 ${id}`, leaf: () => `잎 ${(leafOf(id) || {}).name || id}`,
            map: () => `${RARITY[id] || id} 지도석`, fragment: () => catalog.fragments[id] || id, jewel: () => `주얼 ${id}`, talisman: () => `야생 부적 ${id}`,
            gem: () => (id.startsWith('attack') ? '공격 젬' : '보조 젬'), equipment: () => ({ corrupted: '타락 장비', exceptional: '특출 장비', socket: '소켓 장비' })[id] || `장비 ${RARITY[id] || id}` };
        return (labels[type] || (() => kind))();
    }
    function renderFirst(report) {
        $('sim-first').innerHTML = report.firstSeen.map(row => `<li><span>${row.map}판째</span><b>${esc(kindLabel(row.kind))}</b></li>`).join('');
    }
    function render(result) {
        renderSummary(result);
        $('sim-map-list').innerHTML = result.maps.map(mapHtml).join('');
        renderKinds(result.report);
        renderCurrencies(result.report);
        renderOmens(result.omens);
        renderFirst(result.report);
    }

    // ---------------------------------------------------------------- input
    async function run(event) {
        if (event) event.preventDefault();
        const form = $('sim-form'), data = Object.fromEntries(new FormData(form));
        const buttons = form.querySelectorAll('button');
        buttons.forEach(button => { button.disabled = true; });
        $('sim-status').textContent = `${data.maps}판 굴리는 중`;
        try {
            const response = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || response.statusText);
            render(result);
            $('sim-status').textContent = `${result.report.maps}판 완료, 시드 ${result.options.seed}`;
        } catch (error) {
            $('sim-status').textContent = `오류: ${error.message}`;
        } finally {
            buttons.forEach(button => { button.disabled = false; });
        }
    }
    $('sim-form').addEventListener('submit', run);
    $('reroll').addEventListener('click', () => {
        const seed = $('sim-form').elements.seed;
        seed.value = String(Math.floor(Math.random() * 1e6) + 1);
        run();
    });
    loadCatalog().then(() => run()).catch(error => { $('sim-status').textContent = `오류: ${error.message}`; });
})();
