import { incidentWorn, incidentRule, incidentQuiet, incidentReceipt, incidentTell, incidentNote } from '../combat/incident-common.mjs';

/** 이 피해가 행운의 숫자인가: 같은 숫자로만 된 수의 { digit, length, mul }. 일곱 번째 행운의 병이 없으면 7로만 된 수(777 이상)만,
     * 병이 있으면 그 재화를 rewardMul배. 첫자리와 끝자리가 다르면 바로 그만 본다(거의 모든 피해). 아니면 null. */
export function incidentLuckyHit(env, dealt) {
    const text = String(dealt), digit = text[0];
    if (text[text.length - 1] !== digit || ![...text].every(ch => ch === digit)) return null;
    const luck = incidentWorn(env, 'repdigitLuck');
    return luck || (digit === '7' && dealt >= incidentRule(env).lucky.min) ? { digit, length: text.length, mul: luck ? luck.rewardMul : 1 } : null;
}

/** 한 번에 준 피해(js/combat-resources.js applyDamageToEnemyResource)가 행운의 숫자(111 이상)면 그 자릿수의 재화. 한 번 나오면 gapMs 동안 쉰다. */
export function* incidentNoteDamage(env, enemy, dealt) {
    if (!(dealt >= 111) || env.owner.isBackgroundCalculation) return;
    const hit = incidentLuckyHit(env, dealt), now = env.deps.getCombatTime();
    if (!hit || now - env.runtime.luckyAt < incidentRule(env).lucky.gapMs || incidentQuiet(env, env.deps.getZone(env.owner.currentZoneId))) return;
    env.runtime.luckyAt = now;
    const rows = incidentRule(env).lucky.rewards, [key, count] = rows[Math.min(rows.length - 1, hit.length - 3)];
    incidentReceipt(env, () => env.deps.keepCurrencyDrop(enemy, key, count * hit.mul));
    (yield* incidentTell(env.deps._t('행운의 숫자 {number}{particle} 나왔습니다.', { number: dealt.toLocaleString(env.deps.i18n.locale), particle: env.deps.pickParticle(String(hit.digit), '이', '가') }), 'reward'));
    (yield* incidentNote(env, 'lucky'));
}
