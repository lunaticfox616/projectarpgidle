// 묘목장과 고대 씨앗(12번 루프 39, 42, 2026-10-08, data/stump-nursery.js): 묘목 무리의 처치 드롭(js/combat-skill-effects.js recordKillProgress),
// 묘목장 정리의 선물(js/atlas-run.js clearRoom), 최종 보스의 고대 씨앗(js/atlas-endgame.js onComplete). 받은 것은 그루터기 함 보관함으로
// 가고(stumpBox.createItem), 그 소식은 보통 드롭처럼 'stump-box-changed'로 알린다. 보관함이 가득 차면 고대 씨앗은 그래도 들어가고(보스 부적처럼),
// 보통 씨앗은 드롭처럼 거름이 된다(stumpBox.compostOverflow). 고대 씨앗의 효과는 js/stump-box.js가 계산한다.
import { nurseryOpen, nurseryAncientOpen, nurseryColorOf, nurseryOnKilled, nurseryClearGift, nurseryAncientFromBoss } from './stump-nursery-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createStumpNursery(deps) {
    const env = { deps };
    env.N = env.deps.STUMP_NURSERY;
    env.COLORS = Object.freeze(Object.keys(env.deps.STUMP_BOX_COLORS));
    return Object.freeze({
        open: (...args) => nurseryOpen(env, ...args),
        ancientOpen: (...args) => nurseryAncientOpen(env, ...args),
        colorOf: (...args) => nurseryColorOf(env, ...args),
        onKilled: (...args) => nurseryOnKilled(env, ...args),
        clearGift: (...args) => nurseryClearGift(env, ...args),
        ancientFromBoss: (...args) => nurseryAncientFromBoss(env, ...args)
    });
}
