const assert=require('node:assert/strict');
module.exports=async function checkInvestment(frame) {
 const result=await frame.evaluate(()=>{
  const lab=newSkillLab,random=Math.random,gear=game.equipment['갑옷'].stats;
  Math.random=()=>.5;
  try {
   const plans=[0,100,200,500,100000].map(percent=>lab.native.emptyFlaskShards({baseCount:3,extraProjectileChance:percent,rng:Math.random}));
   const fractional=[.25,.75].map(value=>lab.native.emptyFlaskShards({baseCount:3,extraProjectileChance:150,rng:()=>value}).extraCount);
   const flask=[];
   for(const percent of [0,100,200,500]) {
    changeSkill('빈 플라스크');lab.bossMode=false;lab.reset();
    game.equipment['갑옷'].stats=[{id:'projectileExtraChance',val:percent},{id:'flatDmg',val:10000}];
    game.enemies=game.enemies.slice(0,1);Object.assign(game.enemies[0],{hp:1e8,maxHp:1e8,evasion:0});
    const start=getCombatTime();performPlayerAttack(getPlayerStats());const cast=lab.casts.at(-1).cast;
    for(let t=0;t<5000;t+=25){game.combatTimeMs=start+t;cast.update(getCombatTime());}
    flask.push({percent,hits:lab.history.length,damage:lab.history.map(h=>h.damage)});
   }
   const mist=[];
   for(const cell of [{gx:4,gy:3},{gx:2,gy:2},{gx:0,gy:0}]) {
    changeSkill('신성한 안개');lab.bossMode=true;lab.reset();
    Object.assign(game.enemies[0],cell,{hp:1e8,maxHp:1e8});
    performPlayerAttack(getPlayerStats());const cast=lab.casts.at(-1).cast;
    game.combatTimeMs=cast.impactAt;cast.update(getCombatTime());cast.update(getCombatTime()+1);
    mist.push({hits:lab.history.length,pct:lab.mist.getFireTakenIncreasePercent(game.enemies[0].id,getCombatTime())});
   }
   return {plans:plans.map(p=>p.totalShards),fractional,flask,mist};
  }finally{Math.random=random;game.equipment['갑옷'].stats=gear;lab.bossMode=false;changeSkill('탄성 플라스크');lab.reset();}
 });
 assert.deepEqual(result.plans,[3,6,9,11,11]);
 assert.deepEqual(result.fractional,[6,3],'fraction above 100% still rolls');
 assert.deepEqual(result.flask.map(r=>r.hits),[4,7,10,12],'all planned shards really hit, with bounded total');
 const base=result.flask[0].damage[0];
 for(const row of result.flask.slice(1)) {
  assert.ok(row.damage.slice(0,4).every(d=>d===base),'native contacts retain damage');
  assert.ok(row.damage.slice(4).every(d=>Math.abs(d/base-.4)<.01),'bonus contacts approach 40% after damage rounding');
 }
 assert.deepEqual(result.mist,[{hits:1,pct:20},{hits:1,pct:20},{hits:0,pct:0}],
  'both adjacent boss orientations hit/debuff once; distant boss is untouched');
 console.log('Investment: fractional/large projectile chance, real capped contacts, 40% bonus damage and boss mist passed.');
};
