// 세계수 연대기 보기(js/chronicle.js): 기록 창의 연대기 칸(나이테 그림, 장마다 진행과 다음 할 일)과 새 나이테 알림.
const chronicleUi = (() => {
    const C = CHRONICLE;
    const esc = value => escapeHTML(String(value));
    /** Concentric rings, innermost first: wound rings in amber, the rest as faint grooves. */
    function ringsSvg(wound, share) {
        const circles = Array.from({ length: C.rings }, (_, index) => {
            const on = index < wound;
            return `<circle cx="60" cy="60" r="${17 + index * 4.4}" fill="none" stroke="${on ? '#e0aa45' : 'rgba(190, 168, 120, .3)'}"
                stroke-width="${on ? 3 : 1.4}"/>`;
        }).join('');
        return `<svg class="chronicle-rings" viewBox="0 0 120 120" role="img" aria-label="나이테 ${wound}개">${circles}
            <text x="60" y="64" text-anchor="middle">${Math.floor(share * 100)}%</text></svg>`;
    }
    // 장마다 그 수집의 색(2026-10-09 사용자 "기록 색감이 하나도 없이 빠져 있음"): 이름, 수, 막대가 그 색이고 아직 0이면 흐리다.
    const TONES = Object.freeze({ codex: '#ff9f43', mastery: '#e8c27a', talismans: '#c98cff', journal: '#ffd36b', depth: '#b78bff', loops: '#7fd88a',
        harvest: '#9fd46a', fishing: '#5ab8f0', variants: '#ff6f59', memory: '#78d7ff', epochs: '#f0c86f' });
    // These only open existing views. Entry, crafting, rewards and the chronicle's full completion stay with their owners.
    const TARGETS = Object.freeze({
        codex: { route: 'tab-codex', select: () => uniqueCodexUi.setSubtab('main') },
        mastery: { route: 'tab-records', section: '.records-mastery' },
        talismans: { route: 'tab-stump', content: 'talisman', more: 'talisman', section: '#stump-box-more .stump-codex' },
        journal: { route: 'tab-journal' },
        depth: { route: 'tab-map', content: 'deepChaos' },
        loops: { route: 'tab-records', section: '.records-loop-history' },
        harvest: { route: 'tab-stump', more: 'harvest', section: '#stump-box-more' },
        fishing: { route: 'tab-map', content: 'fishing' },
        variants: { route: 'map-explore-worldtree', atlas: 'memory', ready: () => bossVariants.open(game), section: '#ui-atlas .boss-variant-records' },
        memory: { route: 'map-explore-worldtree', atlas: 'memory', ready: () => memoryDungeon.open(game), select: () => memoryDungeonUi.setFilter('records', true) },
        epochs: { route: 'map-explore-worldtree', atlas: 'epoch' }
    });
    function targetReady(id) {
        if (!Object.hasOwn(TARGETS, id)) return false;
        const target = TARGETS[id];
        if (target.content && !contentProgression.isUnlocked(target.content)) return false;
        if (target.ready && !target.ready()) return false;
        return contentProgression.canOpen(target.route);
    }
    function revealSection(selector) {
        const section = document.querySelector(selector);
        if (!section) return;
        if (section.tagName === 'DETAILS') section.open = true;
        section.setAttribute('tabindex', '-1');
        section.focus({ preventScroll: true });
        section.scrollIntoView({ block: 'start' });
    }
    /** Recheck the current unlocks at the click boundary; a stale chapter cannot open locked content. */
    function open(id) {
        if (!targetReady(id)) return false;
        const target = TARGETS[id];
        if (target.atlas) { atlasUi.openPanel(); atlasUi.setView(target.atlas); }
        else if (target.content) contentUnlockUi.open(target.content);
        else switchTab(target.route, { keepWindowOpen: true });
        if (target.select) target.select();
        if (target.more) stumpBoxUi.revealMoreTab(target.more);
        if (target.section) revealSection(target.section);
        return true;
    }
    function chapterHtml(row) {
        const fill = Math.floor(row.share * 100), done = row.share >= 1, state = done ? ' is-done' : row.count > 0 ? ' is-started' : '';
        const action = targetReady(row.id) ? `<button type="button" class="chronicle-open" aria-label="${esc(row.name)} 보기" onclick="chronicleUi.open('${row.id}')">보기</button>` : '';
        return `<li class="chronicle-chapter${state}" style="--chapter-tone:${TONES[row.id] || '#e8c27a'}"><div><strong>${esc(row.name)}</strong><span>${row.count}/${row.goal}</span>${action}</div>
            <div class="mastery-bar"><i style="width:${fill}%"></i></div>${done ? '' : `<small>${esc(row.hint)}</small>`}</li>`;
    }
    /** The records window's chronicle section. Winds any ring earned since the last check first. */
    function sectionHtml() {
        chronicle.check(game);
        const view = chronicle.completion(game), wound = chronicle.rings(game);
        const nextAt = wound < C.rings ? Math.ceil((wound + 1) * 100 / C.rings) : 0;
        return `<details class="records-fold records-chronicle" open><summary>세계수 연대기<span>나이테 ${wound}/${C.rings}, 방치 효율 <b class="records-gain">+${wound}%p</b></span></summary>
            <div class="records-fold-body chronicle-body">${ringsSvg(wound, view.share)}<div><p class="records-fold-hint">흩어진 수집을 한데 모은 완성도입니다.
            10%마다 나이테가 하나 감기고 나이테마다 방치 효율 +1%p.${nextAt ? ` 다음 나이테는 ${nextAt}%.` : ''}</p>
            <ul class="chronicle-chapters">${view.rows.filter(row => row.count > 0 || targetReady(row.id)).map(chapterHtml).join('')}</ul></div></div></details>`;
    }
    function announce(detail) {
        const rings = Array.isArray(detail.rings) ? detail.rings : [];
        if (!rings.length) return;
        addLog(`🌳 세계수 연대기에 나이테가 감겼습니다(${rings.join(', ')}번째). 방치 효율 +${rings.length}%p.`, 'loot-unique', { toast: true });
    }
    window.addEventListener('project-idle:chronicle-ring', event => announce(event.detail || {}));
    return Object.freeze({ sectionHtml, open });
})();
safeExposeGlobals({ chronicleUi });
