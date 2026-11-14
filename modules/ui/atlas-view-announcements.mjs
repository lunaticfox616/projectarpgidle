import { nodeName, ledger } from './atlas-view-model.mjs';
import { lostRewards } from './atlas-view-results.mjs';

export function dropsText(runtime, detail) {
    const parts = [];
    if (detail.room) parts.push(`${detail.golden ? `${runtime.deps.ATLAS.goldenRoom.prefix} ` : ''}${runtime.deps.ATLAS.encounters[detail.room].name} 정리: ${detail.rewards.map(([key, n]) => `${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)} ${n}`).join(', ') || (0, runtime.deps._t)('보상 없음')}`);
    if (detail.maps.length) parts.push(`지도석 ${detail.maps.map(map => `${nodeName(runtime, map.node)}(${map.tier})`).join(', ')}`);
    if (detail.fragments.length) parts.push(`각인 ${detail.fragments.map(id => runtime.deps.atlas.fragment(id).name).join(', ')}`);
    // 깨어난 뒤 제단 · 리그 방의 재료(js/atlas-endgame.js roomItems): 보스를 잡아야 보관함에 들어온다.
    if (detail.late && detail.late.length) parts.push(`${detail.late.map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(', ')} (보스를 잡으면 받음)`);
    return `🗺️ ${parts.join(', ')}`;
}

export function logClass(runtime, detail) {
    if (detail.kind === 'failed') return 'death';
    return detail.kind === 'complete' && (detail.first || detail.bonus || detail.seed) ? 'loot-unique' : 'season-up';
}

export function autoReturnText(runtime, detail) {
    const lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    if (lock) return (0, runtime.deps._t)(' → 자동 지도 대기: {lock}', { lock });
    if (!ledger(runtime).stash.length) return ' → 지도석이 없어 원래 사냥터로 돌아갑니다.';
    return (0, runtime.deps._t)(' → {tier}등급 이하 지도석이 없어 원래 사냥터로 돌아갑니다.', { tier: detail.tier });
}

/** Explain why a completed run did not chain; manual special challenges never advertise an automatic stone spend. */
export function returnText(runtime, detail) {
    if (detail.board) return ' → 심재의 나이테에서 다음 길을 고르세요.';
    if (detail.next) return '';
    if (runtime.deps.game.settings.mapCompleteAction === 'stop') return ' → 완료 후 멈춤 설정으로 전투를 멈춥니다.';
    const special = detail.memory?.spoils || !['map', 'guardian'].includes(runtime.deps.atlas.node(detail.nodeId).kind);
    if (special) return ' → 특수 도전을 마치고 원래 사냥터로 돌아갑니다.';
    if (ledger(runtime).autoMap) return autoReturnText(runtime, detail);
    const left = ledger(runtime).stash.length;
    return left ? (0, runtime.deps._t)(' → 원래 사냥터로 돌아갑니다. 남은 지도석 {left}개는 아틀라스에서 고르세요.', { left }) : '';
}

export function announce(runtime, detail) {
    const text = {
        board: () => detail.message,
        omen: () => (0, runtime.deps._t)('🔮 뿌리를 품은 몬스터에게서 {name}를 얻었습니다.', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[detail.key].name) }),
        complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? (0, runtime.deps._t)(', 첫 완료') : ''}${detail.bonus ? (0, runtime.deps._t)(', 보너스 달성') : ''}${detail.drops ? (0, runtime.deps._t)(', 지도석 {drops}개', { drops: detail.drops }) : ''}`
            + (detail.ticket ? `, ${(0, runtime.deps._t)(runtime.deps.ORB_DB[detail.ticket].name)}` : '') + (detail.seed ? (0, runtime.deps._t)(', 세계수 씨앗 {seeds}/{max}', { seeds: detail.seeds, max: runtime.deps.ATLAS.seeds.max }) : '')
            + (detail.next ? (0, runtime.deps._t)(' → 다음 지도: {next}', { next: nodeName(runtime, detail.next) }) : returnText(runtime, detail)),
        portal: () => (0, runtime.deps._t)('🌀 {REASON}, 남은 포털 {portals}', { REASON: runtime.state.REASON[detail.reason] || detail.reason, portals: detail.portals }),
        failed: () => (0, runtime.deps._t)('🗺️ {REASON}, 포털이 모두 닫혀 지도가 실패했습니다.', { REASON: runtime.state.REASON[detail.reason] || detail.reason }),
        drops: () => dropsText(runtime, detail),
        starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? (0, runtime.deps._t)(', 지도석 {count}개', { count: detail.count }) : ''}` : (0, runtime.deps._t)('🌳 이번 루프의 지도석 {count}개가 보관함에 들어왔습니다.', { count: detail.count })
    }[detail.kind];
    if (!text) return;
    (0, runtime.deps.addLog)(text(), logClass(runtime, detail));
    if (detail.kind === 'complete' && (detail.lost || detail.lostFragments)) (0, runtime.deps.addLog)((0, runtime.deps._t)('보관 한도가 가득 차 {detail}를 보관하지 못했습니다.', { detail: lostRewards(runtime, detail).join(', ') }), 'attack-monster');
    if (detail.kind === 'starter' && detail.opened) runtime.deps.contentUnlockUi.announceJourney('map-explore-worldtree');
    runtime.state.signature = '';
}
