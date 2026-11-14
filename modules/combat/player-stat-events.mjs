import { stealEliteTrait } from '../domain/player-combat-effects.mjs';

/** Block event only, outside the cached stat core. The caller supplies the optional talent owner. */
export function* playerGrantStoneShieldOnBlock(env, stats) {
    if (typeof env.deps.grantTalentStoneShield !== 'function') return;
    const shield = env.deps.grantTalentStoneShield(stats.maxHp);
    if (shield) yield { kind: 'addBattleFx', args: ['statusText', {
        text: env.deps._t('돌 보호막 +{amount}', { amount: shield.amount }), color: '#d8b77a', duration: 300
    }] };
}

/** A kill applies the trait first, then the UI may display its accepted name. No cached stat result is changed here. */
export function* playerGrantEliteTraitOnKill(env, enemy, stats) {
    const trait = stealEliteTrait(env.owner, enemy, stats, env.deps.getCombatTime);
    if (!trait) return;
    if (env.owner.settings && env.owner.settings.showCombatLog !== false) yield {
        kind: 'addLog', args: [env.deps._t('🩸 정예 특성 흡수: {name}', { name: env.deps._t(trait.name || '정예 특성') }), 'loot-unique', { noToast: true }]
    };
}
