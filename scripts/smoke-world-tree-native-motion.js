const assert=require('assert'),vm=require('vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const reference=require('./fixtures/world-tree-v338-layout.json');
const runtime=buildGameRuntime();
vm.runInContext('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1920};',runtime);
const projection={tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:gx*48+24,y:gy*48+24})};
let matrix=[1,0,0,1,0,0],stack=[],draws=[];
const ctx={
 save(){stack.push(matrix.slice());},restore(){matrix=stack.pop();},
 translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
 scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
 rotate(angle){const [a,b,c,d]=matrix,co=Math.cos(angle),si=Math.sin(angle);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=-a*si+c*co;matrix[3]=-b*si+d*co;},
 drawImage(image,sx,sy,sw,sh,x,y,w,h){
  assert([sx,sy,sw,sh,x,y,w,h,...matrix,this.globalAlpha].every(Number.isFinite),'all sprite geometry must be finite');
  assert(sw>0&&sh>0&&sx>=0&&sy>=0&&sx+sw<=1024&&sy+sh<=1920,'native sub-frame crop stays in atlas');
  const sign=Math.sign(matrix[0]*matrix[3]-matrix[1]*matrix[2]);
  draws.push({x:matrix[4],y:matrix[5],scale:w/sw,scaleY:sign*h/sh,angle:Math.atan2(matrix[1],matrix[0]),frame:{x:sx,y:sy,w:sw,h:sh},alpha:this.globalAlpha/.85});
 }
};
// The game deliberately allows artwork beyond map edges. Compare the original
// viewport's visible submissions; that is the only omitted gallery restriction.
function withinOriginalViewport(d){
 const half=(Math.abs(d.angle)>1e-12?46:32)*d.scale*Math.max(1,Math.abs(d.scaleY/d.scale));
 return !(d.x+half<0||d.y+half<0||d.x-half>=432||d.y-half>=384);
}
const before=vm.runInContext('JSON.stringify(game)',runtime);
let samples=0;
for(const row of reference.cases){
 const snapshot=JSON.stringify(row.event);
 for(const sample of row.samples){
  draws=[];runtime.worldTreeSkillFx.beginFrame();
  runtime.worldTreeSkillFx.renderEvent(ctx,row.event,row.event.at+sample.age,projection);
  const actual=draws.filter(withinOriginalViewport);
  const label=row.event.skillName+'/'+row.event.kind+'/'+sample.age;
  assert.strictEqual(actual.length,sample.draws.length,label+' sprite count');
  actual.forEach((a,i)=>{
   const b=sample.draws[i];
   assert.deepStrictEqual(a.frame,b.frame,label+' native crop');
   for(const key of ['x','y','scale','scaleY','alpha'])assert(Math.abs(a[key]-b[key])<1e-7,label+' '+key);
   assert(Math.abs(Math.sin(a.angle)-Math.sin(b.angle))<1e-7&&Math.abs(Math.cos(a.angle)-Math.cos(b.angle))<1e-7,label+' rotation');
  });
  samples++;
 }
 assert.strictEqual(JSON.stringify(row.event),snapshot,'renderer preserves event snapshots');
}
assert.strictEqual(vm.runInContext('JSON.stringify(game)',runtime),before,'presentation never changes combat');
console.log('world-tree v3.38: '+reference.cases.length+' events, '+samples+' original reference samples passed');
