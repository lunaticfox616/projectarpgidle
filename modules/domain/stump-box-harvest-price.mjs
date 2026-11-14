

export function stumpHarvestPriceKey(kind, color) { return `harvest:${kind}${color ? `:${color}` : ''}`; }

export function stumpIsHarvestPrice(env, key) { return env.HARVEST_PRICE.test(key); }

export function stumpParseHarvestPrice(env, key) {
    const [, kind, color] = env.HARVEST_PRICE.exec(key);
    return { kind, color: color || null };
}

export function stumpHarvestPriceName(env, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key), name = kind === env.ANY_KIND ? env.ANY_KIND_LABEL : env.deps.STUMP_BOX_STAGES[kind].label;
    return color ? `${env.deps._t(env.deps.STUMP_BOX_COLORS[color].label)} ${env.deps._t(name)}` : env.deps._t(name);
}

/** 값 그림: 색이 없는 값은 화염 그림을 쓰고 화면이 무채색으로 칠한다(css/shop-view.css .is-any-colour). 종류가 any면 꽃 그림이다. */
export function stumpHarvestPriceIcon(env, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key);
    return `assets/items/stump-pixel-v1/${env.deps.STUMP_BOX_STAGES[kind === env.ANY_KIND ? 'flower' : kind].icon}-${color || 'fire'}.png`;
}

export function stumpHarvestWalletKeys(env) { return [...env.COLORS.map(color => stumpHarvestPriceKey('flower', color)), stumpHarvestPriceKey('root'), stumpHarvestPriceKey('vine'), stumpHarvestPriceKey('fruit')]; }
