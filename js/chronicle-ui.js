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
    function chapterHtml(row) {
        const fill = Math.floor(row.share * 100), done = row.share >= 1;
        return `<li class="chronicle-chapter${done ? ' is-done' : ''}"><div><strong>${esc(row.name)}</strong><span>${row.count}/${row.goal}</span></div>
            <div class="mastery-bar"><i style="width:${fill}%"></i></div>${done ? '' : `<small>${esc(row.hint)}</small>`}</li>`;
    }
    /** The records window's chronicle section. Winds any ring earned since the last check first. */
    function sectionHtml() {
        chronicle.check(game);
        const view = chronicle.completion(game), wound = chronicle.rings(game);
        const nextAt = wound < C.rings ? Math.ceil((wound + 1) * 100 / C.rings) : 0;
        return `<details class="records-fold records-chronicle" open><summary>세계수 연대기<span>나이테 ${wound}/${C.rings}, 방치 효율 +${wound}%p</span></summary>
            <div class="records-fold-body chronicle-body">${ringsSvg(wound, view.share)}<div><p class="records-fold-hint">흩어진 수집을 한데 모은 완성도입니다.
            10%마다 나이테가 하나 감기고 나이테마다 방치 효율 +1%p.${nextAt ? ` 다음 나이테는 ${nextAt}%.` : ''}</p>
            <ul class="chronicle-chapters">${view.rows.map(chapterHtml).join('')}</ul></div></div></details>`;
    }
    function announce(detail) {
        const rings = Array.isArray(detail.rings) ? detail.rings : [];
        if (!rings.length) return;
        addLog(`🌳 세계수 연대기에 나이테가 감겼습니다(${rings.join(', ')}번째). 방치 효율 +${rings.length}%p.`, 'loot-unique', { toast: true });
    }
    window.addEventListener('project-idle:chronicle-ring', event => announce(event.detail || {}));
    return Object.freeze({ sectionHtml });
})();
safeExposeGlobals({ chronicleUi });
