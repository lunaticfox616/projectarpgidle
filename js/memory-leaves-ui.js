/** 기억의 잎 발견 도감. 읽기 버튼은 기존 저널 리더만 열며 보상을 다시 지급하지 않는다. */
const memoryLeavesUi = (() => {
    const GROUPS = [...ATLAS.regions.map(region => ({ id: region.id, name: region.name, tint: region.tint,
        test: leaf => leaf.source.region === region.id })),
        { id: 'special', name: '보스와 특별한 곳', tint: '#b89a5a', test: leaf => !!(leaf.source.boss || leaf.source.golden || leaf.source.treasure) },
        { id: 'any', name: '어느 지도나', tint: '#7f9a8a', test: leaf => !!leaf.source.any }];
    let lastHtml = '';
    const esc = value => escapeHTML(String(value ?? ''));
    function cardHtml(leaf, tint) {
        const seen = game.atlas.leaves.seen.includes(leaf.id);
        const body = seen ? `<strong>${esc(leaf.name)}</strong><span class="leaf-reward">${esc(leaf.bonus.label)}</span>`
            : '<strong class="is-hidden">아직 못 본 잎</strong>';
        const button = seen ? `<button type="button" class="leaf-read" data-leaf-read="${leaf.journal}">기억 읽기</button>` : '';
        return `<article class="leaf-card${seen ? '' : ' is-unseen'}" style="--leaf-tint:${tint}">`
            + `<span class="leaf-glyph" aria-hidden="true">${renderPixelIcon('leaf', 'leaf-icon')}</span><div class="leaf-body">${body}`
            + `<small class="leaf-source">${esc(memoryLeaves.sourceText(leaf))}</small>`
            + `<span class="leaf-count">${seen ? '저널에 기록됨' : '미발견'}</span></div>${button}</article>`;
    }
    function groupHtml(group) {
        const cards = memoryLeaves.list.filter(group.test).map(leaf => cardHtml(leaf, group.tint)).join('');
        return cards ? `<section class="leaf-group" style="--leaf-tint:${group.tint}"><h4>${esc(group.name)}</h4><div class="leaf-grid">${cards}</div></section>` : '';
    }
    function render() {
        const root = document.getElementById('ui-leaf-book');
        if (!root) return;
        const header = `<header class="leaf-head"><div class="leaf-head-title"><h3>기억의 잎</h3>`
            + '<small>처음 발견하면 저널과 영구 효과가 남습니다.</small></div>'
            + `<div class="leaf-stats"><span><small>발견한 기억</small><b>${game.atlas.leaves.seen.length}/${memoryLeaves.list.length}</b></span></div></header>`;
        const html = header + GROUPS.map(groupHtml).join('');
        if (html !== lastHtml) { root.innerHTML = html; lastHtml = html; }
    }
    function announceLeaf(result) {
        game.noti.journal = true;
        game.noti.codex = true;
        if (game.isBackgroundCalculation) return;
        if (game.settings.lootFx?.notices?.leaf !== false) {
            showGameToast(`기억의 잎을 발견했습니다. 「${result.name}」`, { tone: 'leaf', duration: 3600 });
        }
        queueImportantSave(200);
    }
    addEventListener('project-idle:memory-leaf', ({ detail }) => announceLeaf(detail));
    document.getElementById('ui-leaf-book')?.addEventListener('click', event => {
        const button = event.target.closest('[data-leaf-read]');
        if (button) storyJournalUi.openEntry(button.dataset.leafRead);
    });
    return Object.freeze({ render });
})();
safeExposeGlobals({ memoryLeavesUi });
