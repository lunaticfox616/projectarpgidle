// Controlled combat comparison, not a human playtest or a balance verdict.
const fs = require('fs');
const fixture = require('./lib/replay-fixture');
const builds = [
    {classId:'warrior', skill:'연속 베기', kind:'근접 다수 타격'},
    {classId:'alchemist', skill:'빙결 침식', kind:'중첩 지속 피해'},
    {classId:'occultist', skill:'서리늑대 소환', kind:'소환'}
];
const results=[];
for(const build of builds) for(const seed of [5,17,29]) {
    const {runtime:r,run}=fixture(seed);
    const summoned=build.kind==='소환';
    r.benchmarkInput={level:8,selectedClassId:build.classId,
        selectedHeroId:r.PLAYER_CLASS_DEFS[build.classId].recommendedTalentHeroId,
        skills:['기본 공격',build.skill],activeSkill:summoned?'기본 공격':build.skill,
        gemData:{[build.skill]:{level:3,exp:0}},loopStarterGemGranted:true,
        equippedSummonSkills:summoned?[build.skill]:[],summonSkillCounts:summoned?{[build.skill]:1}:{},
        summonLoadoutInitialized:true};
    run('game=mergeDefaults({...game,...benchmarkInput});game.playerHp=getPlayerStats().maxHp;startEncounterRun();');
    const stats=r.getPlayerStats();
    const result=r.simulateBackgroundCombat({snapshot:run('game'),elapsedMs:60000});
    results.push({...build,seed,tags:r.SKILL_DB[build.skill].tags,
        estimatedDps:stats.totalDps,summonDps:stats.summonDps,processedMs:result.processedMs,
        kills:result.metrics.kills,deaths:result.metrics.deaths,experience:result.metrics.exp,
        zone:result.game.currentZoneId,progress:result.game.runProgress,remainingHp:result.game.playerHp});
}
const report={scenario:'Level 8, gem level 3, default equipment, same starting map, 60 seconds, three seeded runs per build',results};
fs.writeFileSync(process.argv[2] || 'artifacts/starter-build-comparison-20260905.json',JSON.stringify(report,null,2)+'\n');
console.log(results.map(row=>`${row.kind} seed ${row.seed}: ${row.kills} kills, ${row.deaths} deaths, ${row.experience} XP`).join('\n'));
