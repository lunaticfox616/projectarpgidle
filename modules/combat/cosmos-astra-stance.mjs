import { COSMOS_ASTRA_STANCE_CYCLE_MS, COSMOS_ASTRA_STANCES } from '../data/skill-combat-values.mjs';

export function* hitApplyCosmosAstraStance(env, enemy) {
    if (!enemy || !enemy.astraBase) return;
    let base = enemy.astraBase;
    let idx = Math.floor(env.deps.getCombatTime() / COSMOS_ASTRA_STANCE_CYCLE_MS) % COSMOS_ASTRA_STANCES.length;
    let stance = COSMOS_ASTRA_STANCES[idx];
    if (enemy.astraStanceIdx !== idx) {
        enemy.astraStanceIdx = idx;
        (yield { kind: 'addLog', args: [env.deps._t('🌌 아스트라의 표식이 바뀝니다: {name}', { name: env.deps._t(stance.name) }), 'attack-monster', { noToast: true }] });
    }
    applyStanceDefenses(enemy, base, stance);
    applyStanceOffense(enemy, base, stance);
}

function applyStanceDefenses(enemy, base, stance) {
    enemy.ele = stance.ele || enemy.ele;
    enemy.dr = Math.min(90, base.dr + (stance.drAdd || 0));
    enemy.armor = Math.floor(base.armor * (stance.armorMul || 1));
    enemy.evasion = Math.floor(base.evasion * (stance.evasionMul || 1));
    let resAdd = stance.resAllAdd || 0;
    enemy.resF = Math.min(95, base.resF + resAdd);
    enemy.resC = Math.min(95, base.resC + resAdd);
    enemy.resL = Math.min(95, base.resL + resAdd);
    enemy.resChaos = Math.min(95, base.resChaos + resAdd + (stance.resChaosAdd || 0));
}

function applyStanceOffense(enemy, base, stance) {
    enemy.penetration = base.penetration + (stance.penetrationAdd || 0);
    enemy.critChance = base.critChance + (stance.critChanceAdd || 0);
    enemy.atkMul = base.atkMul * (stance.atkMulMul || 1);
    enemy.attackSpeedVar = base.attackSpeedVar * (stance.attackSpeedVarMul || 1);
    enemy.regenRate = base.regenRate * (stance.regenMul || 1);
}
