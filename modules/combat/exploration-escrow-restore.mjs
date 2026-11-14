import { escrowValidate } from './exploration-escrow-validation.mjs';
import { escrowClaim } from './exploration-escrow-claim.mjs';
import { LOOT_UPGRADES } from './act-exploration-loot-values.mjs';

function escrowMigrateLegacyLoot(run) {
    if(run.loot===null)return; // validate() reports the malformed save below.
    while(Object.hasOwn(LOOT_UPGRADES,run.loot?.version))LOOT_UPGRADES[run.loot.version](run.loot);
}

export function escrowRestore(env, state,run) {
    if(run.loot===undefined)return;
    escrowMigrateLegacyLoot(run);
    escrowValidate(env, run.loot);
    if(run.status==='active' && run.loot.phase!=='pending')throw Error('진행 중 탐험의 보상이 이미 종료되었습니다.');
    if(run.status==='failed' && run.loot.phase!=='lost')throw Error('실패한 탐험에 보상이 남아 있습니다.');
    if(run.completionApplied && run.loot.phase!=='claimed')throw Error('완료된 탐험 보상이 정산되지 않았습니다.');
    if(run.loot.phase==='pending')escrowClaim(env, state,run);
    delete run.loot;
}
