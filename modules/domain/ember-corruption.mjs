// 타오른 잿불가지(12번 루프 30, 2026-10-08, data/ember-corruption.js): 장비 하나에 한 번 쓰는 두 번째 타락. 이미 타락한 장비와
// 고유 장비에도 쓴다. 결과를 고르고 장비를 바꾼다. 재가 되는 결과는 장비를 지우지 않고 알리기만 한다: 지우기와 그루터기 함 거름은
// 제작실 화면(js/ember-corruption-ui.js)이 한다. 타락 전용 줄은 item.emberLines에 따로 둔다(접두, 접미 자리를 차지하지 않는다).
import { emberScalableLines, emberLinePool, emberResult, emberBakeLines, emberShareText, emberAddLines, emberLinesText, emberBurnReason, emberOutcomes, emberBurn, emberAshGrowth, emberNormalize, emberKillDrops } from './ember-corruption-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createEmberEnvironment(deps) {
    const env = { deps };
    env.SLOTS = Object.freeze([...new Set(env.deps.EMBER_CORRUPTION_LINES.flatMap(row => row.slots))]);
    env.BY_ID = new Map(env.deps.EMBER_CORRUPTION_LINES.map(row => [row.id, row]));
    env.CAN = Object.freeze({
    scale: item => emberScalableLines(item).length > 0,
    twoLines: item => emberLinePool(env, item).length >= 2,
    scaleAndLine: item => emberScalableLines(item).length > 0 && emberLinePool(env, item).length > 0,
    quality: item => Math.floor(Number(item.quality) || 0) < env.deps.EMBER_CORRUPTION_RULES.quality
});
    env.APPLY = Object.freeze({
    ash: () => emberResult('ash', '장비가 타서 재가 되었습니다.'),
    scale: (item, random) => {
        const share = emberBakeLines(env, item, random);
        return emberResult('scale', env.deps._t('옵션 수치가 다시 구워졌습니다(평균 {share}).', { share: emberShareText(share) }), { share });
    },
    twoLines: (item, random) => {
        const lines = emberAddLines(env, item, 2, random);
        return emberResult('twoLines', env.deps._t('타락 전용 줄이 생겼습니다: {lines}', { lines: emberLinesText(env, lines) }), { lines });
    },
    scaleAndLine: (item, random) => {
        const share = emberBakeLines(env, item, random), lines = emberAddLines(env, item, 1, random);
        return emberResult('scaleAndLine', env.deps._t('옵션 수치가 다시 구워지고(평균 {share}) 타락 전용 줄이 생겼습니다: {lines}', { share: emberShareText(share), lines: emberLinesText(env, lines) }), { share, lines });
    },
    quality: item => {
        const before = Math.floor(Number(item.quality) || 0);
        item.quality = env.deps.EMBER_CORRUPTION_RULES.quality;
        return emberResult('quality', env.deps._t('품질이 {before}% → {quality}%로 올랐습니다.', { before, quality: item.quality }));
    },
    nothing: () => emberResult('nothing', '불길이 잦아들었습니다. 변화가 없습니다.')
});
    return env;
}

export function createEmberCorruption(deps) {
    const env = createEmberEnvironment(deps);
    return Object.freeze({
        burnReason: (...args) => emberBurnReason(env, ...args),
        outcomes: (...args) => emberOutcomes(env, ...args),
        burn: (...args) => emberBurn(env, ...args),
        ashGrowth: (...args) => emberAshGrowth(env, ...args),
        normalize: (...args) => emberNormalize(env, ...args),
        killDrops: (...args) => emberKillDrops(env, ...args),
        linePool: (...args) => emberLinePool(env, ...args),
        scalableLines: emberScalableLines
    });
}
