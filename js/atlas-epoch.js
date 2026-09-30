/** 시대 재생 (docs/atlas-endgame-20260930.md 1 · 5절): 아틀라스 위의 환생 층. 씨앗 4개를 모으면 아틀라스 진행(완료 · 보너스 · 패시브 ·
 * 씨앗)을 되돌리고 세계수 정수를 받아 영구 특전(지도 드롭 · 수량 · 패시브 포인트 · 시작 지도석 · 각인 홈 · 루프 시작 보급)을 산다.
 * 상태는 game.atlas.epoch {count, essence, perks:{id: rank}} — 루프와 시대를 넘어 남는다.
 */
const atlasEpoch = (() => {
    const PERKS = new Map(ATLAS.epoch.perks.map(perk => [perk.id, perk]));
    const ledger = state => state.atlas.epoch;
    const rank = (state, id) => ledger(state).perks[id] || 0;
    const mapNodes = state => state.atlas.completed.filter(id => !id.endsWith('_g') && id !== 'pinnacle').length;

    function reason(state) {
        if (state.atlas.seeds < ATLAS.seeds.max) return `세계수 씨앗 ${ATLAS.seeds.max}개가 필요합니다(지금 ${state.atlas.seeds}개). 정점을 쓰러뜨리면 하나씩 얻습니다.`;
        return state.atlas.run ? '열린 지도를 먼저 마치거나 닫으세요.' : '';
    }
    function essenceFor(state) {
        const rule = ATLAS.epoch.essence;
        return rule.base + Math.floor(mapNodes(state) / rule.perCompleted) + Math.floor(state.atlas.bonus.length / rule.perBonus)
            + state.atlas.seeds * rule.perSeed;
    }
    /** 시대 재생: 진행을 되돌리고 정수를 받는다. 해금 · 자동 지도 · 각인 홈 설정 · 특전은 남는다. @returns {string} '' when done. */
    function rebirth(state) {
        const why = reason(state);
        if (why) return why;
        const epoch = ledger(state), gained = essenceFor(state);
        epoch.count += 1;
        epoch.essence += gained;
        Object.assign(state.atlas, { completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, lastResult: null, starterSeason: 0 });
        atlas.setLoadout(state, state.atlas.loadout); // the passive slot is gone with the passives
        return '';
    }
    const cost = (state, id) => (rank(state, id) + 1) * ATLAS.epoch.costStep;
    function buyReason(state, id) {
        const perk = PERKS.get(id);
        if (!perk) return '없는 특전입니다.';
        if (rank(state, id) >= perk.max) return '이미 가장 높은 단계입니다.';
        return ledger(state).essence >= cost(state, id) ? '' : `세계수 정수가 부족합니다(필요 ${cost(state, id)}).`;
    }
    function buy(state, id) {
        const why = buyReason(state, id);
        if (why) return why;
        ledger(state).essence -= cost(state, id);
        ledger(state).perks[id] = rank(state, id) + 1;
        return '';
    }
    /** Effect objects for the atlas bonus sum (keys shared with the passives): each perk's effect × its rank. */
    function effects(state) {
        return ATLAS.epoch.perks.filter(perk => perk.effect && rank(state, perk.id))
            .map(perk => Object.fromEntries(Object.entries(perk.effect).map(([key, value]) => [key, value * rank(state, perk.id)])));
    }
    const points = state => ATLAS.epoch.perks.reduce((sum, perk) => sum + (perk.points || 0) * rank(state, perk.id), 0);
    /** 시작 보급: 새 루프의 빈 지갑에 들어가는 재화. */
    function supply(state) {
        const perk = PERKS.get('supply'), level = rank(state, 'supply');
        return level ? perk.supply.map(([key, amount]) => [key, amount * level]) : [];
    }
    function normalize(raw) {
        const source = raw && typeof raw === 'object' ? raw : {}, perks = {};
        for (const perk of ATLAS.epoch.perks) {
            const value = Math.floor(Number(source.perks && source.perks[perk.id]) || 0);
            if (value > 0) perks[perk.id] = Math.min(perk.max, value);
        }
        const count = value => Math.max(0, Math.min(1e6, Math.floor(Number(value) || 0)));
        return { count: count(source.count), essence: count(source.essence), perks };
    }
    return Object.freeze({ perks: PERKS, rank, reason, essenceFor, rebirth, cost, buyReason, buy, effects, points, supply, normalize });
})();
safeExposeGlobals({ atlasEpoch });
