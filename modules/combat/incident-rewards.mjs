import { incidentQuiet, incidentReceipt, incidentRule, incidentNote, incidentTell, incidentWorn, incidentOften } from '../combat/incident-common.mjs';
import { incidentJoinFight, incidentMakeCritter } from '../combat/incident-critters.mjs';

/** 처치(js/combat-kill-rewards.js countKillForContent): 길 잃은 몬스터의 장비, 잡은 슬라임의 보상과 알림. 슬라임이 아니면 황금을 빚는 손(rise).
     * 방치 정산에서는 아무것도 하지 않는다(그동안 슬라임은 달아나지도 못한다). */
export function* incidentOnKill(env, enemy, zone) {
    if (!enemy || incidentQuiet(env, zone)) return;
    if (!enemy.critter) {
        if (enemy.stray) { incidentReceipt(env, () => env.deps.grantEquipmentPick(enemy, zone, incidentRule(env).stray.gear, null)); (yield* incidentNote(env, 'stray')); }
        (yield* incidentRise(env, enemy, zone));
        return;
    }
    const rainbow = enemy.critter === 'rainbow';
    incidentReceipt(env, () => { incidentGrantCritterRewards(env, enemy, zone); if (rainbow) incidentGrantRainbowRewards(env, enemy, zone); });
    (yield* incidentNote(env, rainbow ? 'rainbow' : 'critter'));
    if (rainbow || !enemy.feast) (yield* incidentTell(rainbow ? '무지갯빛 수액 슬라임을 잡았습니다.' : '금빛 수액 슬라임을 잡았습니다.', rainbow ? 'chase' : 'reward', rainbow));
}

/** 쓰러뜨린 몬스터(방 단위 무대의 보통 무리, 보스와 보스 단계의 호위, 오브젝트 웨이브 말고)가 그 자리에서 수액 슬라임으로 일어난다:
     * 이번 루프의 lucky.kill번째 처치는 무지갯빛으로, 황금을 빚는 손(goldenTouch)을 끼면 chance의 확률로 금빛(무지갯빛은
     * critter.rainbow.chance대로). 슬라임은 그 무리에 들어 방이 끝나기 전에 선다(js/combat-kill-rewards.js handleEnemyDeath가 죽은 몬스터를 무리에서
     * 빼는 것은 이 뒤다). 방을 비우는 셈에는 들지 않는다(js/atlas-encounters.js emptiedPack). */
export function* incidentRise(env, enemy, zone) {
    if (enemy.isBoss || !enemy.explorationPack || !env.deps.hasGridCell(enemy)) return;
    const kind = incidentRiseKind(env), run = kind ? env.deps.actExplorationState.current(env.owner) : null;
    const host = run ? run.packs.find(row => row.key === enemy.explorationPack && row.stage === null && !row.objectId) : null;
    if (!host) return;
    incidentJoinFight(env, host, incidentMakeCritter(env, zone, { gx: enemy.gx, gy: enemy.gy }, kind !== 'gold'));
    if (kind !== 'lucky') return;
    (yield* incidentTell(env.deps._t('이번 루프의 {kill}번째 처치입니다.', { kill: incidentRule(env).lucky.kill.toLocaleString(env.deps.i18n.locale) }), 'chase', true));
    (yield* incidentNote(env, 'luckyKill'));
}

/** 이 처치가 일어나는 슬라임: 'lucky'(이번 루프의 lucky.kill번째, 무지갯빛), 'rainbow', 'gold', 아니면 ''. countKillForContent가 이
     * 처치를 game.loopKills에 더하는 것은 이 뒤라 지금 수에 1을 더해 센다. */
export function incidentRiseKind(env) {
    if (Math.floor(Number(env.owner.loopKills) || 0) + 1 === incidentRule(env).lucky.kill) return 'lucky';
    const touch = incidentWorn(env, 'goldenTouch');
    if (!touch || Math.random() >= touch.chance) return '';
    return Math.random() < incidentRule(env).critter.rainbow.chance * incidentOften(env) ? 'rainbow' : 'gold';
}

/** 금빛: 재화를 picks번 무게로 뽑고(열리지 않은 재화는 떨어지지 않는다), gear 등급 이상의 장비 하나. */
export function incidentGrantCritterRewards(env, enemy, zone) {
    const R = incidentRule(env).critter.rewards, total = R.currencies.reduce((sum, row) => sum + row[2], 0), lure = incidentWorn(env, 'critterLure'), mul = lure ? lure.rewardMul : 1;
    for (let i = 0; i < R.picks; i++) {
        let edge = Math.random() * total;
        const row = R.currencies.find(([, , weight]) => (edge -= weight) < 0) || R.currencies[0];
        env.deps.keepCurrencyDrop(enemy, row[0], row[1] * mul);
    }
    env.deps.grantEquipmentPick(enemy, zone, R.gear, null);
}

/** 무지갯빛: 재화 하나와 고유 장비 하나(chaseShare의 확률로 체이싱 고유, js/atlas-finds.js의 보물과 같은 길). */
export function incidentGrantRainbowRewards(env, enemy, zone) {
    const R = incidentRule(env).critter.rainbow, chase = Math.random() < R.chaseShare;
    const names = chase ? env.deps.UNIQUE_DB.filter(row => row.ultraRare && !row.dropOnly).map(row => row.name) : [];
    env.deps.keepCurrencyDrop(enemy, R.currency, 1);
    const itemLevel = env.deps.levelProgression.itemLevel(zone, enemy), cap = Math.min(env.deps.getRealmEquipmentHiddenTierCap(zone), env.deps.levelProgression.maxDropTier(itemLevel));
    const item = env.deps.levelProgression.stampItem(env.deps.generateUniqueItem(cap, null, names.length ? env.deps.rndChoice(names) : null, zone), itemLevel);
    if (item) env.deps.keepEquipmentDrop(enemy, item, { guaranteedKeep: true });
}
