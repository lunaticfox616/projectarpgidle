/** 전직 저장 경계(2026-10-02, 전직 18종). 모르는 전직은 비우고 그 노드 · 키스톤에 쓴 포인트를 돌려준다(예전에는 검사하지 않아
 * 전직 화면이 이름을 읽다 멈췄다). 직업과 맞지 않는 예전 저장(전직을 아무 직업이나 고르던 때)은 이번 루프만 그대로 둔다 — 전직은
 * 루프마다 새로 고른다. 재능 개화 카드는 있는 조합만 남긴다. 지난 루프 전직 배치도 검사한다. 두 번 불러와도 같다. */
export function normalizeAscendancySave(deps, merged) {
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    if (merged.ascendClass && !deps.CLASS_TEMPLATES[merged.ascendClass]) {
        merged.ascendPoints = Math.max(0, Math.floor(Number(merged.ascendPoints) || 0)) + merged.ascendNodes.length;
        const keystones = Array.isArray(merged.ascendKeystones) ? merged.ascendKeystones.length : 0;
        merged.ascendKeystonePoints = Math.max(0, Math.floor(Number(merged.ascendKeystonePoints) || 0)) + keystones;
        merged.ascendClass = '';
        merged.ascendNodes = [];
        merged.ascendKeystones = [];
    }
    normalizeTalentCardKeys(deps, merged);
    merged.lastLoopAscendPlan = normalizeLastLoopAscendPlan(deps, merged.lastLoopAscendPlan);
}

/** 지난 루프 전직 배치: 있는 전직, 노드 id 모양(n1~n13d), 그 전직의 키스톤만 남긴다. */
export function normalizeLastLoopAscendPlan(deps, raw) {
    if (!raw || typeof raw !== 'object' || !deps.CLASS_TEMPLATES[raw.ascendClass]) return null;
    const keystoneIds = new Set((deps.CLASS_KEYSTONE_DEFS[raw.ascendClass] || []).map(node => node.id));
    const keepIds = (value, keep) => Array.from(new Set((Array.isArray(value) ? value : []).filter(id => typeof id === 'string' && keep(id)))).slice(0, 32);
    return { ascendClass: raw.ascendClass, nodes: keepIds(raw.nodes, id => /^n\d{1,2}[a-d]?$/.test(id)), keystones: keepIds(raw.keystones, id => keystoneIds.has(id)) };
}

/** 재능 개화 카드(2026-10-02 재능 정리): 카드를 그 전직의 카드(직업의 대표 재능 × 전직)로 옮겨 합친다. 레벨과 점수는 큰 쪽,
 * 개화 횟수는 더한다. 장착 칸과 개화 기록도 옮기고 겹치면 하나만 남긴다. 모르는 전직의 카드는 버린다. 두 번 불러와도 같다. */
export function normalizeTalentCardKeys(deps, merged) {
    if (typeof deps.TALENT_BLOOM_CARD_DEFS !== 'object' || !deps.TALENT_BLOOM_CARD_DEFS || typeof deps.getTalentBloomCardKeyForAscendancy !== 'function') return;
    const bloomCardOf = key => (0, deps.getTalentBloomCardKeyForAscendancy)(String(key || '').split('__')[1]);
    const cards = merged.talentCards && typeof merged.talentCards === 'object' ? merged.talentCards : {};
    const folded = {};
    Object.entries(cards).forEach(([key, card]) => {
        const to = bloomCardOf(key);
        if (to && card && typeof card === 'object') folded[to] = mergeTalentCardRecords(folded[to], card);
    });
    merged.talentCards = folded;
    if (Array.isArray(merged.talentCardLoadout)) {
        const moved = merged.talentCardLoadout.map(key => (key ? bloomCardOf(key) : null));
        merged.talentCardLoadout = moved.map((key, index) => (key && folded[key] && moved.indexOf(key) === index ? key : null));
    }
    if (Array.isArray(merged.talentBloomCombos)) merged.talentBloomCombos = Array.from(new Set(merged.talentBloomCombos.map(bloomCardOf).filter(Boolean)));
    alignBloomLoopTalent(deps, merged);
}

/** 이번 루프의 개화 재능 기록도 직업의 대표 재능으로 맞춘다(5차 노드 n13a, n13b가 이 값을 읽는다). */
export function alignBloomLoopTalent(deps, merged) {
    const classTalent = (0, deps.getTalentBloomHeroIdForAscendancy)(merged.ascendClass);
    if (!classTalent) return;
    if (merged.bloomedTalentThisLoop) merged.bloomedTalentThisLoop = classTalent;
    if (merged.pendingTalentBloomHeroId) merged.pendingTalentBloomHeroId = classTalent;
}

export function mergeTalentCardRecords(previous, card) {
    if (!previous) return { ...card };
    return { ...previous, level: Math.max(Number(previous.level) || 1, Number(card.level) || 1), score: Math.max(Number(previous.score) || 0, Number(card.score) || 0),
        count: (Number(previous.count) || 0) + (Number(card.count) || 0) };
}
