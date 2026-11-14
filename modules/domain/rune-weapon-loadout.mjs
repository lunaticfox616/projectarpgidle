import { runeFlowIsMobilityRuneName, runeFlowCanUseSkillWithCurrentEquipment } from './rune-weapon-rules.mjs';

export function runeFlowFitActiveSkillToWeapon(env, owner, allowMobility = false) {
    // 이동 룬은 주 공격 칸으로 돌아오지 않는다(불러올 때 이동 칸으로, js/save-migrations.js keepBlockedMobilityGem).
    if (runeFlowIsMobilityRuneName(env, owner.weaponBlockedSkill)) owner.weaponBlockedSkill = '';
    runeFlowReleaseMobilityRuneFromAttackSlot(env, owner, allowMobility);
    const blocked = owner.weaponBlockedSkill;
    if (owner.activeSkill === '기본 공격' && blocked && (owner.skills || []).includes(blocked) && runeFlowCanUseSkillWithCurrentEquipment(env, owner, blocked)) {
        owner.activeSkill = blocked;
        if (owner.weaponBlockedSkill === blocked) owner.weaponBlockedSkill = '';
    }
    const worn = owner.activeSkill;
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, worn)) return;
    owner.weaponBlockedSkill = worn;
    owner.activeSkill = '기본 공격';
}

export function runeFlowReleaseMobilityRuneFromAttackSlot(env, owner, allowMobility = false) {
    const worn = owner.activeSkill;
    if (allowMobility || !runeFlowIsMobilityRuneName(env, worn) || env.deps.isMobilityRuneAttackWorn(owner)) return;
    if (!runeFlowIsMobilityRuneName(env, owner.mobilitySkill) || !(owner.skills || []).includes(owner.mobilitySkill)) owner.mobilitySkill = worn;
    owner.activeSkill = '기본 공격';
}
