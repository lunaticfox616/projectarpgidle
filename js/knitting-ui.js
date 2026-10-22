/** Discovered-only thread storage. No hidden-card placeholders or total catalogue count. */
const knittingUi = (() => {
    let ownedOnly = false, lastHtml = '', lastResult = '', shownSeason = 0;
    const esc = value => escapeHTML(String(value));
    const currentResult = () => shownSeason === game.season ? lastResult : '';
    function card(row) {
        const st = game.knitting, count = st.counts[row.id] || 0, done = st.knitted[row.id] || 0;
        const ready = count >= row.set, reason = ready ? knitting.reason(game, row.id) : '';
        return `<article class="knit-card${ready ? ' is-ready' : ''}"><div class="knit-card-head"><strong>${esc(row.name)}</strong>`
            + `<span>${count} / ${row.set}</span></div><p>${esc(row.label)}</p><small>${esc(row.found)}${done ? ` / 뜨개질 ${done}회` : ''}</small>`
            + `<div class="knit-progress" role="progressbar" aria-label="${esc(row.name)} 수집" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${Math.max(count, row.set)}"><i style="width:${Math.min(100, count / row.set * 100)}%"></i></div>`
            + (ready ? `<div class="knit-card-foot"><button type="button" data-knit="${row.id}"${reason ? ' disabled' : ''}>뜨개질</button></div>` : '')
            + (reason && ready ? `<p class="knit-warning">${esc(reason)}</p>` : '') + '</article>';
    }
    function header(seen, ready) {
        return `<header class="knit-head"><div><h3>실타래 보관함</h3><p>보유 수량은 루프마다 초기화됩니다. 발견과 뜨개질 기록은 남습니다.</p></div>${ready ? `<strong>완성 ${ready}</strong>` : ''}</header>`
            + (seen.length > 6 ? `<div class="knit-toolbar"><button type="button" data-knit-filter="all" aria-pressed="${!ownedOnly}">발견 기록 ${seen.length}</button><button type="button" data-knit-filter="owned" aria-pressed="${ownedOnly}">보유한 실타래</button></div>` : '');
    }
    function render() {
        const panel = document.getElementById('item-tab-knitting'), button = document.getElementById('btn-item-tab-knitting');
        if (!panel || !button) return;
        const opened = contentProgression.isUnlocked('knitting');
        button.style.display = opened ? '' : 'none';
        if (!opened || game.itemSubtab !== 'item-tab-knitting') return;
        const seen = knitting.visible(game), rows = ownedOnly && seen.length > 6 ? seen.filter(row => game.knitting.counts[row.id] > 0) : seen;
        const ready = seen.filter(row => (game.knitting.counts[row.id] || 0) >= row.set).length;
        const html = header(seen, ready)
            + `<div class="knit-result" role="status" aria-live="polite">${esc(currentResult())}</div><div class="knit-grid">`
            + (rows.map(card).join('') || '<p class="knit-empty">아직 모은 실타래가 없습니다. 사냥터에서 발견하면 여기에 기록됩니다.</p>') + '</div>';
        if (html !== lastHtml) { panel.innerHTML = html; lastHtml = html; }
    }
    function resultText(made) {
        const parts = made.currencies.map(([key, n]) => `${ORB_DB[key].name} ${n}개`);
        if (made.item) parts.push(made.item.name + ' 1개');
        if (made.mapReward) parts.push(`희귀 지도석 ${made.mapReward.maps.length}개`);
        for (const id of made.yarns) parts.push(knitting.row(id).name + ' 1개');
        return parts.join(', ');
    }
    function knit(id) {
        shownSeason = game.season;
        try {
            const result = knittingRewards.knit(id);
            lastResult = result.ok ? `${result.row.name} → ${resultText(result.made)}` : result.reason;
            if (result.ok) {
                queueImportantSave(0);
                if (result.made.item) recordEquipmentAcquisition(result.made.item);
                result.made.currencies.forEach(([key, n]) => notifyCurrencyAcquisition(key, n));
                addLog(esc(lastResult), 'loot-rare');
            }
        } catch (error) {
            console.error('뜨개질 보상 생성 실패', { id, error });
            lastResult = '보상을 만들지 못했습니다. 다시 시도하기 전에 보관함을 확인하세요.';
        }
        updateStaticUI();
        render();
    }
    document.getElementById('item-tab-knitting')?.addEventListener('click', event => {
        const action = event.target.closest('[data-knit]'), filter = event.target.closest('[data-knit-filter]');
        if (action) knit(action.dataset.knit);
        if (filter) { ownedOnly = filter.dataset.knitFilter === 'owned'; render(); }
    });
    addEventListener('project-idle:knitting-yarn', ({ detail }) => {
        if (game.isBackgroundCalculation) return;
        if (detail.first || detail.complete) {
            game.noti.items = true;
            showGameToast(detail.complete ? `「${detail.name}」 뜨개질 가능` : `새 실타래 「${detail.name}」`, { tone: 'leaf', duration: 2800 });
        }
        if (detail.first || detail.complete || game.settings.showLootLog) addLog(`실타래 「${esc(detail.name)}」 ${detail.count}/${detail.set}`, 'loot-rare');
        render();
    });
    function offlineHtml(gains) {
        if (!gains?.total) return '';
        return `<div class="background-result-chips"><span class="background-result-chip">실타래 <b>+${gains.total}</b></span>`
            + gains.fresh.map(name => `<span class="background-result-chip"><em>새 실타래</em> ${esc(name)}</span>`).join('') + '</div>';
    }
    return Object.freeze({ render, offlineHtml });
})();
safeExposeGlobals({ knittingUi });
