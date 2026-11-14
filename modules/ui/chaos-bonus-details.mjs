

export function buildGetChaosRealmBonusSummary(env) {
    let b = (env.deps.ensureChaosRealmState().permanentBonuses || {});
    const rows = [
        ['피해 +{pctDmg}%', 'pctDmg', 'pctDmg', true],
        ['이속 +{move}%', 'move', 'move', true],
        ['생명력 +{pctHp}%', 'pctHp', 'pctHp', true],
        ['카오스저항 +{floor}%', 'resChaos', 'floor'],
        ['치명 +{floor}%', 'crit', 'floor'],
        ['관통 +{floor}%', 'resPen', 'floor'],
        ['방어/회피/보호막 +{floor}%', 'armorPct', 'floor'],
        ['치피 +{floor}%', 'critDmg', 'floor'],
        ['공속 +{floor}%', 'aspd', 'floor']
    ];
    return rows.map(([label, field, param, decimal]) => env.deps._t(label, {
        [param]: decimal ? (b[field] || 0).toFixed(1) : Math.floor(b[field] || 0)
    })).join(', ');
}
