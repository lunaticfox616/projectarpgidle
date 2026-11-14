import { stumpIsMature, stumpGoldenMul, stumpYieldKind } from './stump-box-item-values.mjs';

export function stumpStageOf(env, item) {
    if (env.ASLEEP[item.family]) return stumpIsMature(item) ? item.family : env.ASLEEP[item.family];
    return stumpIsMature(item) && item.path ? item.path : 'seed';
}

/** '황금 화염 꽃': colour and stage without the target (talismans and scars by name). */
export function stumpShortName(env, item) {
    if (item.family === 'talisman') return stumpIsMature(item) ? item.name : env.deps._t('{name} (잠듦)', { name: item.name });
    if (item.family === 'scar') return stumpIsMature(item) ? env.deps.STUMP_BOX_SCAR.name : env.deps._t('{name} (잠듦)', { name: env.deps.STUMP_BOX_SCAR.name });
    return `${item.albino ? env.deps._t('알비노 ') : ''}${stumpGoldenMul(env, item) > 1 ? env.deps._t('황금 ') : ''}${item.ancient ? env.deps._t('고대 ') : ''}${env.deps.STUMP_BOX_COLORS[item.color].label} ${env.deps.STUMP_BOX_STAGES[stumpStageOf(env, item)].label}`;
}

/** The item's name: a growing seed does not tell what it becomes. */
export function stumpLabel(env, item) { return stumpShortName(env, item); }

/** A stat line in the box's own words ('점화 확률 +3%'): main lines, extra lines and a scar's lines share them. */
export function stumpLineText(env, stat, value) {
    const row = env.LINE_ROWS.concat(env.ALBINO_ROWS).find(entry => entry.stat === stat);
    const shown = String(Math.round(value * 10) / 10);
    return row ? row.text.replace('{v}', shown) : `${env.deps.getStatName(stat)} +${shown}`;
}

export function stumpIconPath(env, item) {
    if (item.albino) return `assets/items/stump-albino-v1/${stumpYieldKind(item)}-${item.color}.png`;
    if (item.family === 'scar' && stumpIsMature(item)) return 'assets/items/stump-albino-v1/scar-ember.png';
    const icon = env.deps.STUMP_BOX_STAGES[stumpStageOf(env, item)].icon, suffix = item.family === 'talisman' ? item.rarity : item.color;
    return `assets/items/stump-pixel-v1/${icon}${suffix ? `-${suffix}` : ''}.png`;
}
