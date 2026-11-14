

export function cosmosRulePickWeightedCosmosDirective(candidates, rng) {
    const total = candidates.reduce((sum, row) => sum + Math.max(0, Number(row.weight) || 0), 0);
    if (total <= 0) return null;
    let roll = rng() * total;
    for (const row of candidates) {
        roll -= Math.max(0, Number(row.weight) || 0);
        if (roll <= 0) return row;
    }
    return candidates[candidates.length - 1] || null;
}

export function cosmosRuleGetCosmosExpeditionDirectiveChoices(env, nodeId, cycle) {
    const rows = Array.isArray(env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB)
        ? env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB.filter(Boolean) : [];
    const safe = rows.find(row => row.id === 'survey');
    if (!safe) return [];
    const choices = [safe];
    const candidates = rows.filter(row => row.id !== safe.id && Number(row.weight) > 0);
    const rng = env.deps.createSeededRng(`cosmos-expedition:${String(nodeId || 'unknown')}:${Math.max(0, Math.floor(Number(cycle) || 0))}`);
    while (choices.length < 3 && candidates.length > 0) {
        const picked = cosmosRulePickWeightedCosmosDirective(candidates, rng);
        if (!picked) break;
        choices.push(picked);
        candidates.splice(candidates.indexOf(picked), 1);
    }
    return choices;
}

export function cosmosRuleResolveCosmosMechanic(env, tag, seed) {
    const rows = Array.isArray(env.deps.COSMOS_MECHANIC_DB) ? env.deps.COSMOS_MECHANIC_DB : [];
    if (rows.length === 0) return null;
    const normalizedTag = String(tag || '').trim();
    const tagged = rows.find(row => Array.isArray(row.tags) && row.tags.includes(normalizedTag));
    if (tagged) return tagged;
    const index = Math.abs(Math.floor(Number(seed) || 0)) % rows.length;
    return rows[index];
}
