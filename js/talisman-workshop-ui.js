// Unsealing choices are UI state. Existing unseal/exchange functions own costs and rewards.
const talismanWorkshopUi = (() => {
    let source = 'sealShard';
    const sources = ['sealShard', 'strongSealShard', 'radiantSealShard'];

    function renderSource(key) {
        const count = Math.max(0, Math.floor(game.currencies[key] || 0));
        return `<section class="talisman-unseal-source" data-unseal-source="${key}"><h3>${renderSealShardBadge(key)} · 보유 ${count}개</h3><p>후보 비교는 편린 1개로 여러 후보 중 하나를 선택합니다.<br>바로 해제는 비교 없이 최대 10개를 보관합니다.</p><div class="talisman-unseal-actions"><button onclick="startTalismanUnseal('${key}')" aria-label="${escapeHTML(ORB_DB[key].name)} 후보 비교" ${count ? '' : 'disabled'}>후보 비교 · 1개</button><button onclick="startBulkTalismanUnseal('${key}')" aria-label="${escapeHTML(ORB_DB[key].name)} 바로 해제" ${count ? '' : 'disabled'}>바로 해제 · ${Math.min(10,count)}개</button></div></section>`;
    }

    function renderCandidate(unseal) {
        return `<section class="talisman-unseal-candidate"><div class="talisman-candidate-shape">${renderTalismanMiniShapeFromCells(unseal.current.cells, unseal.current.shape, {cellSize:12, gap:2, markDir:unseal.current.markDir})}${renderSealShardBadge(unseal.source)}</div>${buildTalismanTooltipHtml(unseal.current)}<p>남은 확인 기회 ${unseal.rollsLeft}/${unseal.totalRolls}</p><div class="talisman-unseal-actions"><button onclick="acceptCurrentTalisman()">이 부적 선택</button><button onclick="previewNextTalismanShape()" ${unseal.rollsLeft <= 1 ? 'disabled' : ''}>다음 후보</button><button onclick="discardCurrentTalisman()">후보 파괴</button></div></section>`;
    }

    function render() {
        const unseal = game.talismanUnseal;
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const selector = document.getElementById('talisman-unseal-source');
        if (unseal && sources.includes(unseal.source)) source = unseal.source;
        selector.parentElement.hidden = !mobile || !!unseal;
        selector.value = source;
        const root = document.getElementById('ui-talisman-unseal');
        const html = unseal ? renderCandidate(unseal) : (mobile ? [source] : sources).map(renderSource).join('');
        if (root.__unsealHtml !== html) { root.innerHTML = html; root.__unsealHtml = html; }
        renderExchange();
    }

    function renderExchange() {
        const exchange = document.getElementById('ui-talisman-exchange');
        const buttons = `<button onclick="exchangeTalismanShards('strong')" ${(game.currencies.sealShard || 0) < 80 ? 'disabled' : ''}>편린 80 → 강력 편린 1</button><button onclick="exchangeTalismanShards('radiant')" ${(game.currencies.strongSealShard || 0) < 40 ? 'disabled' : ''}>강력 편린 40 → 찬란 편린 1</button>`;
        if (exchange.__exchangeHtml !== buttons) { exchange.innerHTML = buttons; exchange.__exchangeHtml = buttons; }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('talisman-unseal-source').addEventListener('change', event => {
            source = event.target.value;
            render();
        });
    }, {once:true});
    return {render};
})();
safeExposeGlobals({talismanWorkshopUi});
