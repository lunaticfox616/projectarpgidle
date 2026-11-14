import { renderSeasonNode } from './static-season-nodes.mjs';

export function renderStaticSeason(runtime) {
    let seasonVisible = runtime.deps.game.season > 1 || runtime.deps.game.seasonPoints > 0;
    runtime.deps.document.getElementById('trait-season-section').style.display = seasonVisible ? 'block' : 'none';
    runtime.deps.document.getElementById('season-content-section').style.display = seasonVisible ? 'block' : 'none';
    runtime.deps.loopClimbUi.render(); runtime.deps.worldTreeBarkUi.renderBarkPanel();
    renderStaticSeasonRoadmap(runtime);
    renderStaticSeasonOrbit(runtime);
}

export function renderStaticSeasonRoadmap(runtime) {
    let seasonRoadmapKeys = Object.keys(runtime.deps.SEASON_CONTENT_ROADMAP).map(Number).filter(v => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    let collapsePast = runtime.deps.game.settings.collapsePastLoopMilestones !== false;
    let roadmapToggle = runtime.deps.document.getElementById('btn-toggle-past-loop-milestones');
    if (roadmapToggle) roadmapToggle.innerText = collapsePast ? (0, runtime.deps._t)('지난 루프 펼치기') : (0, runtime.deps._t)('지난 루프 접기');
    let pastRoadmapCount = seasonRoadmapKeys.filter(seasonNum => seasonNum < runtime.deps.game.season).length;
    let collapsedRoadmapSummary = collapsePast && pastRoadmapCount > 0
        ? `<div style="color:#78d99a; border:1px dashed rgba(46,204,113,.55); border-radius:8px; padding:8px 12px;">${(0, runtime.deps._t)('완료한 지난 루프 이정표 {pastRoadmapCount}개가 접혀 있습니다.', { pastRoadmapCount })}</div>`
        : '';
    let roadmapCards = seasonRoadmapKeys.map(seasonNum => {
        let def = runtime.deps.SEASON_CONTENT_ROADMAP[seasonNum];
        if (!def) return '';
        let unlocked = seasonNum <= runtime.deps.game.season;
        let current = seasonNum === runtime.deps.game.season;
        let stateColor = current ? '#f1c40f' : (unlocked ? '#2ecc71' : '#7f8c8d');
        // 지난 루프는 '지남': 이정표의 해금 항목은 루프에 닿으면 열 수 있게 될 뿐, 해금 목록에서 사야 열린다(예전 '해금됨'이 사지 않은 것도 열린 것처럼 보였다).
        let stateText = current ? '진행 중' : (unlocked ? '지남' : '잠김');
        let reqText = (0, runtime.deps.getLoopAbyssRequirementText)(seasonNum);
        let hiddenStyle = collapsePast && unlocked && !current ? 'display:none;' : '';
        return `<div style="${hiddenStyle}background:#121822; border:1px solid ${stateColor}; border-radius:8px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <strong style="color:${stateColor};">${(0, runtime.deps._t)(def.title)}</strong><span style="color:${stateColor}; font-size:12px;">${stateText}</span>
            </div>
            <div style="color:var(--copy-bright); font-size:12px; line-height:1.5;">• ${reqText}<br>${(def.features || []).map(v => `• ${v}`).join('<br>')}</div>
        </div>`;
    }).join('');
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-season-content-roadmap'), collapsedRoadmapSummary + roadmapCards
            || `<div style="color:var(--copy-muted);">${(0, runtime.deps._t)('루프 1을 클리어하면 루프 이정표가 열립니다.')}</div>`);
}

export function renderStaticSeasonOrbit(runtime) {
    let seasonNodeIds = Object.keys(runtime.deps.SEASON_NODES || {});
    let activeSeasonNodeCount = seasonNodeIds.filter(id => (0, runtime.deps.getSeasonNodeLevel)(id) > 0).length;
    let seasonEvolved = (0, runtime.deps.isSeasonTreeEvolved)();
    let seasonSummary = `<div class="trait-progress-summary"><div><strong>${(0, runtime.deps._t)(seasonEvolved ? '순환 완성' : '우로보로스 원환')}</strong><span>${(0, runtime.deps._t)('{n}/{total} 노드 활성화', { n: activeSeasonNodeCount, total: seasonNodeIds.length })}</span></div><div><strong>${(0, runtime.deps._t)('{max} 포인트', { max: Math.max(0, Math.floor(runtime.deps.game.seasonPoints || 0)) })}</strong><span>${seasonEvolved ? (0, runtime.deps._t)('외곽 노드 강화 및 내부 노드 투자 가능') : (0, runtime.deps._t)('남은 원형 노드 {max}개', { max: Math.max(0, seasonNodeIds.length - activeSeasonNodeCount) })}</span></div></div>`;
    let ringNodes = runtime.deps.SEASON_OUROBOROS_RING_NODES.map((id, index) => {
        const angle = (90 - index * 360 / runtime.deps.SEASON_OUROBOROS_RING_NODES.length) * Math.PI / 180;
        const radius = 40.7;
        return renderSeasonNode(runtime, id, id === 's_root' ? 'origin-node' : 'ring-node', 50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius);
    }).join('');
    let innerIds = Object.keys(runtime.deps.SEASON_INNER_NODES || {});
    let innerNodes = seasonEvolved ? innerIds.map((id, index) => {
        let angle = (-90 + index * 360 / innerIds.length) * Math.PI / 180;
        return renderSeasonNode(runtime, id, 'inner-node', 50 + Math.cos(angle) * 17.2, 50 + Math.sin(angle) * 17.2);
    }).join('') : '';
    let innerCircle = seasonEvolved ? '<div class="loop-magic-circle" aria-hidden="true"><span class="loop-magic-runes"></span><span class="loop-magic-core"></span></div>' : '';
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-season-tree'), `${seasonSummary}<div class="loop-passive-orbit ${seasonEvolved ? 'complete' : ''}"><div class="loop-orbit-ambient" aria-hidden="true"></div><span class="loop-ouroboros-silhouette" aria-hidden="true"></span>${innerCircle}${(0, runtime.deps.loopOrbitCenterHtml)()}${ringNodes}${innerNodes}</div>`);
}
