// The persistent disclosure owns visibility; collection rules remain in the ocean domain.
function renderOceanCollectionPanel(st, progress) {
    const section = document.getElementById('fishing-collection');
    if (!section.open) return;
    if (uiDisplay.matches('(max-width: 1080px)') && section.dataset.mobileSelected !== 'true') return;
    document.getElementById('ui-fishing-collection').innerHTML = `<div class="ocean-section-head"><div><strong>심해 도감</strong><span>발견 ${progress.discoveredCount}/${progress.totalCount} · 보유량은 제작에 사용해도 누적 기록은 유지됩니다.</span></div></div><div class="ocean-milestone-grid">${renderOceanCollectionMilestones(progress)}</div><div class="ocean-fish-grid">${renderOceanFishCollection(st)}</div>`;
}

safeExposeGlobals({ renderOceanCollectionPanel });
