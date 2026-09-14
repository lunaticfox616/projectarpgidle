// The persistent disclosure owns visibility; collection rules remain in the ocean domain.
function renderOceanCollectionPanel(st, progress) {
    const section = document.getElementById('fishing-collection');
    if (!section.open) return;
    if (uiDisplay.matches('(max-width: 1080px)') && section.dataset.mobileSelected !== 'true') return;
    const discovered = progress.discovered.slice().sort((a, b) => Number(b === st.lastCatch?.key) - Number(a === st.lastCatch?.key));
    const unknown = Object.keys(OCEAN_FISH_DB).filter(key => !progress.discovered.includes(key));
    const ready = progress.milestones.filter(row => row.ready && !row.claimed).length;
    const fish = renderOceanFishCollection(st, discovered) || '<p class="ocean-collection-empty">잠수 중 전투 구간을 완료해 첫 물고기를 낚아보세요.</p>';
    // Fish cards are read-only. Interactive rewards stay in fixed slots so refreshes preserve focus.
    updateGamePanelMarkup(document.getElementById('ui-fishing-collection'), `
        <div class="ocean-section-head"><div><strong>심해 도감 · ${progress.discoveredCount}/${progress.totalCount}</strong><span>물고기를 제작에 사용해도 발견 기록은 유지됩니다.</span></div></div>
        <div class="ocean-fish-grid">${fish}</div>
        <details class="ocean-collection-group" data-collection="rewards"><summary>도감 보상 <b>${ready ? `${ready}개 수령 가능` : '발견 보상 확인'}</b></summary><div class="ocean-milestone-grid">${renderOceanCollectionMilestones(progress)}</div></details>
        <details class="ocean-collection-group" data-collection="unknown"><summary>미발견 어종 <b>${unknown.length}종</b></summary><div class="ocean-fish-grid">${renderOceanFishCollection(st, unknown)}</div></details>`);
}

safeExposeGlobals({ renderOceanCollectionPanel });
