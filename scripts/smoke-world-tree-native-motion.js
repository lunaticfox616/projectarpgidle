const assert=require('assert'),vm=require('vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const reference=require('./fixtures/world-tree-v37-layout.json');
const runtime=buildGameRuntime();
vm.runInContext('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};',runtime);
const projection={tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:gx*48+24,y:gy*48+24})};
let matrix=[1,0,0,1,0,0],stack=[],draws=[];
const ctx={
 save(){stack.push(matrix.slice());},restore(){matrix=stack.pop();},
 translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
 scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
 rotate(angle){const [a,b,c,d]=matrix,co=Math.cos(angle),si=Math.sin(angle);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=-a*si+c*co;matrix[3]=-b*si+d*co;},
 drawImage(image,sx,sy,sw,sh,x,y,w,h){
  assert.strictEqual(sw,64);assert.strictEqual(sh,64);assert.strictEqual(w,h,'native art must retain its aspect ratio');
  assert.strictEqual(this.globalAlpha,.85,'user opacity is applied to every sprite');
  draws.push([matrix[4],matrix[5],Math.hypot(matrix[0],matrix[1])*w/64,Math.atan2(matrix[1],matrix[0]),sx,sy]);
 }
};
const before=vm.runInContext('JSON.stringify(game)',runtime);
let samples=0;
for(const row of reference.cases){
 const snapshot=JSON.stringify(row.event);
 for(const sample of row.samples){
  draws=[];runtime.worldTreeSkillFx.beginFrame();
  runtime.worldTreeSkillFx.renderEvent(ctx,row.event,row.event.at+sample.age,projection);
  const label=`${row.event.skillName}/${row.event.kind}/${sample.age}`;
  assert.strictEqual(draws.length,sample.draws.length,label+' sprite count');
  draws.forEach((actual,index)=>actual.forEach((value,field)=>{
   assert(Math.abs(value-sample.draws[index][field])<1e-8,`${label} sprite ${index} field ${field}: ${value} != ${sample.draws[index][field]}`);
  }));
  samples++;
 }
 assert.strictEqual(JSON.stringify(row.event),snapshot,'event snapshots remain immutable');
}
assert.strictEqual(vm.runInContext('JSON.stringify(game)',runtime),before,'native presentation cannot change combat');
console.log(`world-tree native motion: ${reference.cases.length} events, ${samples} original-reference samples passed`);
