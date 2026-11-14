

export function buildGetCosmosDebuffSpec(env, type, power) {
    const p = Math.max(1, Number(power || 1));
    const table = {
        cosmos_regen_down: { type, label: env.deps._t('재생 효율 감소'), value: Math.min(70, Math.floor(32 * p)), duration: 5.5 },
        cosmos_leech_down: { type, label: env.deps._t('흡혈 효율 감소'), value: Math.min(75, Math.floor(36 * p)), duration: 5.5 },
        cosmos_res_down: { type, label: env.deps._t('저항 감소'), value: Math.min(38, Math.floor(16 * p)), duration: 5.0 },
        cosmos_aspd_down: { type, label: env.deps._t('공격 속도 감소'), value: Math.min(46, Math.floor(20 * p)), duration: 4.5 }
    };
    return table[type] || null;
}

export function* buildApplyCosmosBossPlayerDebuff(env, enemy) {
    if (!hasBossDebuffs(enemy)) return;
    const due = dueBossDebuff(env, enemy);
    if (!due) return;
    const { spec, now } = due;
    env.owner.cosmosPlayerDebuffs = Array.isArray(env.owner.cosmosPlayerDebuffs) ? env.owner.cosmosPlayerDebuffs : [];
    let row = env.owner.cosmosPlayerDebuffs.find(d => d && d.type === spec.type);
    if (!row) { row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 }; env.owner.cosmosPlayerDebuffs.push(row); }
    row.label = env.deps._t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1000);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), now + Math.floor(spec.duration * 1000));
    if (env.owner.settings && env.owner.settings.showCombatLog) (yield { kind: 'addLog', args: [env.deps._t('🌌 {name}의 우주계 보스 디버프: {label} -{value}%', { name: env.deps.i18n.enemyName(enemy.name), label: env.deps._t(spec.label), value: spec.value }), 'attack-monster', { noToast: true }] });
}

function hasBossDebuffs(enemy) {
    if (!enemy || !enemy.isBoss || !Array.isArray(enemy.cosmosBossDebuffs) || enemy.cosmosBossDebuffs.length <= 0) return;
    return true;
}

function dueBossDebuff(env, enemy) {
    if (typeof env.deps.getCosmosGalaxyBossMechanic === 'function' && env.deps.getCosmosGalaxyBossMechanic(enemy.cosmosBossId)) return;
    const now = env.deps.getCombatTime();
    if (now < Math.floor(enemy.nextCosmosBossDebuffAt || 0)) return;
    enemy.nextCosmosBossDebuffAt = now + 3200;
    const type = enemy.cosmosBossDebuffs[Math.abs((enemy.variantSeed || 0) + Math.floor(now / 3200)) % enemy.cosmosBossDebuffs.length];
    const spec = buildGetCosmosDebuffSpec(env, type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    return { spec, now };
}

export function buildApplyCosmosBossSpecialDebuff(env, enemy, type) {
    const spec = buildGetCosmosDebuffSpec(env, type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    env.owner.cosmosPlayerDebuffs = Array.isArray(env.owner.cosmosPlayerDebuffs) ? env.owner.cosmosPlayerDebuffs : [];
    let row = env.owner.cosmosPlayerDebuffs.find(debuff => debuff && debuff.type === spec.type);
    if (!row) {
        row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 };
        env.owner.cosmosPlayerDebuffs.push(row);
    }
    row.label = env.deps._t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1000);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), env.deps.getCombatTime() + row.durationMs);
}

export function buildApplyCosmosPlayerDebuffsToStats(env, pStats) {
    env.owner.cosmosPlayerDebuffs = Array.isArray(env.owner.cosmosPlayerDebuffs) ? env.owner.cosmosPlayerDebuffs : [];
    const currentZone = env.deps.getZone(env.owner.currentZoneId);
    if (!currentZone || currentZone.type !== 'cosmos') {
        env.owner.cosmosPlayerDebuffs = [];
        return;
    }
    const now = env.deps.getCombatTime();
    env.owner.cosmosPlayerDebuffs = env.owner.cosmosPlayerDebuffs.filter(d => d && (d.expiresAt || 0) > now);
    env.owner.cosmosPlayerDebuffs.forEach(d => {
        const value = Math.max(0, Math.min(90, Number(d.value || 0)));
        if (d.type === 'cosmos_regen_down') {
            pStats.regen = Math.max(0, (pStats.regen || 0) * (1 - value / 100));
            pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_leech_down') {
            pStats.leech = Math.max(0, (pStats.leech || 0) * (1 - value / 100));
            pStats.spellLeech = Math.max(0, (pStats.spellLeech || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_res_down') {
            pStats.resF -= value;
            pStats.resC -= value;
            pStats.resL -= value;
            pStats.resChaos -= value;
        } else if (d.type === 'cosmos_aspd_down') {
            pStats.aspd *= Math.max(0.2, 1 - value / 100);
        }
    });
}
