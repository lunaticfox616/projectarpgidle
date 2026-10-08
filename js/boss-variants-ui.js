// 보스 변이체의 기록(12번 루프 33, js/boss-variants.js): 나타날 때와 쓰러질 때의 기록과 알림, 기억 던전 보기의 변이체 기록 칸.
const bossVariantsUi = (() => {
    const esc = value => escapeHTML(String(value));
    function announce(detail) {
        if (detail.kind === 'spawn') {
            const how = detail.recalled ? '기억 속에서 변이체가 다시 불려 나왔습니다' : '변이체가 나타났습니다';
            addLog(`🧬 ${how}: ${esc(detail.name)}`, 'loot-unique', { toast: true });
            return;
        }
        const gift = detail.first ? ` 처음 잡은 변이: ${detail.gift.map(([key, amount]) => `${ORB_DB[key].name} ${amount}`).join(', ')}.` : '';
        const memory = detail.memory ? ` ${esc(atlas.node(detail.memory.node).boss)}의 기억 ${detail.memory.tier}단계를 얻었습니다.` : '';
        addLog(`🧬 변이체 처치: ${esc(detail.name)}. 전리품이 늘었습니다.${gift}${memory}`, 'loot-unique', { toast: !!(detail.first || detail.memory) });
    }
    /** The memory view's variant record: each variant and how often it fell (from loop 33, or once any fell). */
    function recordHtml() {
        const rows = bossVariants.records(game);
        if (!bossVariants.open(game) && !rows.some(row => row.kills > 0)) return '';
        const chips = rows.map(row => `<span class="${row.kills ? 'is-on' : ''}" style="--tint:${row.kind.outline}"><i></i>${esc(row.kind.name)} ${row.kills}</span>`).join('');
        return `<section class="atlas-late-group"><h3>변이체 기록</h3><p class="atlas-muted">루프 ${BOSS_VARIANTS.minLoop}부터 보스가 드물게 변이체로 나옵니다.
            처음 잡은 변이마다 황금률, 아틀라스의 보스였다면 그 보스의 기억 ${BOSS_VARIANTS.reward.memoryTier}단계.</p><div class="atlas-late-blight">${chips}</div></section>`;
    }
    window.addEventListener('project-idle:boss-variant', event => announce(event.detail || {}));
    return Object.freeze({ recordHtml });
})();
safeExposeGlobals({ bossVariantsUi });
