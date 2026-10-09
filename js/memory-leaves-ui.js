/** 기억의 잎 도감(기록 창 도감의 세 번째 탭, js/unique-codex-ui.js가 탭을 고른다). 지역별로 잎 카드를 늘어놓는다: 잎 문양, 이름,
 * 모은 수 막대, 보상, 떨어지는 곳, 다 모으면 엮기 단추. 아직 못 본 잎은 이름과 보상을 가리고 떨어지는 곳만 보인다(처음 주울 때 드러남).
 * 잎을 줍는 소식('memory-leaf', js/atlas-finds.js)은 기록과 배너로 알린다. 규칙은 js/memory-leaves.js.
 */
const memoryLeavesUi = (() => {
    const GROUPS = Object.freeze([...ATLAS.regions.map(region => ({ id: region.id, name: region.name, tint: region.tint,
        test: leaf => leaf.source.region === region.id })),
        { id: 'special', name: '보스와 특별한 곳', tint: '#b89a5a', test: leaf => !!(leaf.source.boss || leaf.source.golden || leaf.source.treasure) },
        { id: 'any', name: '어느 지도나', tint: '#7f9a8a', test: leaf => !!leaf.source.any }]);
    let lastHtml = '';
    const leaves = () => (game.atlas && game.atlas.leaves) || memoryLeaves.defaults();
    const esc = value => escapeHTML(String(value ?? ''));

    function cardHtml(leaf, tint) {
        const st = leaves(), seen = st.seen.includes(leaf.id), count = st.counts[leaf.id] || 0, woven = st.woven[leaf.id] || 0;
        const ready = count >= leaf.set, share = Math.min(100, count / leaf.set * 100).toFixed(1);
        const body = seen ? `<strong>${esc(leaf.name)}</strong><span class="leaf-reward">${esc(memoryLeaves.rewardText(leaf))}</span>`
            : '<strong class="is-hidden">아직 못 본 잎</strong><span class="leaf-reward is-hidden">엮으면 무엇이 될까</span>';
        const button = ready ? `<button type="button" class="leaf-weave" data-leaf-weave="${leaf.id}">엮기</button>` : '';
        return `<article class="leaf-card${seen ? '' : ' is-unseen'}${ready ? ' is-ready' : ''}" style="--leaf-tint:${tint}">`
            + `<span class="leaf-glyph" aria-hidden="true">${renderPixelIcon('leaf', 'leaf-icon')}</span><div class="leaf-body">${body}`
            + `<span class="leaf-count"><b>${count}</b>/${leaf.set}${woven ? `<small>엮음 ${woven}</small>` : ''}</span>`
            + `<span class="leaf-bar"><i style="width:${share}%"></i></span><small class="leaf-source">${esc(memoryLeaves.sourceText(leaf))}</small></div>${button}</article>`;
    }
    function groupHtml(group) {
        const cards = memoryLeaves.list.filter(group.test).map(leaf => cardHtml(leaf, group.tint)).join('');
        return cards ? `<section class="leaf-group" style="--leaf-tint:${group.tint}"><h4>${esc(group.name)}</h4><div class="leaf-grid">${cards}</div></section>` : '';
    }
    function headHtml() {
        const st = leaves(), total = memoryLeaves.list.length, ready = memoryLeaves.list.filter(leaf => (st.counts[leaf.id] || 0) >= leaf.set).length;
        const woven = Object.values(st.woven).reduce((sum, n) => sum + n, 0);
        return `<header class="leaf-head"><div class="leaf-head-title"><h3>기억의 잎</h3><small>아틀라스 지도에서 떨어지고, 같은 잎을 모아 엮으면 보상이 됩니다.</small></div>`
            + `<div class="leaf-stats"><span><small>본 잎</small><b>${st.seen.length}/${total}</b></span>`
            + `<span><small>엮을 수 있음</small><b class="${ready ? 'is-ready' : ''}">${ready}</b></span><span><small>엮은 횟수</small><b>${woven}</b></span></div></header>`;
    }
    function weaveFromLeafBook(id) {
        const result = memoryLeaves.weaveLeafSet(game, id);
        if (!result.ok) { addLog(result.reason, 'attack-monster', { toast: true }); return; }
        const parts = [...result.granted.currencies.map(([key, n]) => `${window.getStyledOrbName(key)} +${n}`),
            ...result.granted.items.map(item => `<span class='loot-${item.rarity}'>[${escapeHTML(item.name)}]</span>`),
            ...(result.granted.maps.length ? [`지도석 ${result.granted.maps.length}개`] : [])];
        addLog(`🍃 「${escapeHTML(result.leaf.name)}」을 엮었습니다: ${parts.join(', ') || '보관할 자리가 없었습니다'}`, 'loot-unique', { toast: true });
        updateStaticUI();
        queueImportantSave(200);
    }
    function render() {
        const root = document.getElementById('ui-leaf-book');
        if (!root) return;
        const html = headHtml() + GROUPS.map(groupHtml).join('');
        if (html !== lastHtml) { root.innerHTML = html; lastHtml = html; }
    }
    /** A leaf picked up: a notice (js/ui-feedback.js) and codex dot for a first sighting or a full set, and a log line (always for those two). */
    function announceLeaf(result) {
        const notable = result.first || result.complete;
        if (notable) {
            game.noti.codex = true;
            showGameToast(result.complete ? `기억의 잎을 다 모았습니다. 「${result.name}」` : `새 기억의 잎을 발견했습니다. 「${result.name}」`,
                { tone: 'leaf', duration: 3600 });
        }
        if (notable || game.settings.showLootLog) logLeaf(result, notable);
    }
    function logLeaf(result, notable) {
        const label = result.first ? '새 기억의 잎' : '기억의 잎', ready = result.complete ? ', 도감에서 엮을 수 있습니다' : '';
        addLog(`🍃 ${label} 「${escapeHTML(result.name)}」 ${result.count}/${result.set}${ready}`, notable ? 'loot-unique' : 'loot-rare');
    }
    addEventListener('project-idle:memory-leaf', ({ detail }) => announceLeaf(detail));
    // 엮기 단추: 그리기 밖에서 한 번만 잇는다(그리기가 엮기를 부르지 않게).
    document.getElementById('ui-leaf-book')?.addEventListener('click', event => {
        const button = event.target.closest('[data-leaf-weave]');
        if (button) weaveFromLeafBook(button.dataset.leafWeave);
    });
    return Object.freeze({ render });
})();
safeExposeGlobals({ memoryLeavesUi });
