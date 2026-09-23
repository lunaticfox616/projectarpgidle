// Per-biome cached terrain art; no combat or save mutations.
const explorationArt=(()=>{
    const assets=new Map(),loads=new Map();
    function canvas(w,h) {
        const c=document.createElement('canvas');c.width=w;c.height=h;return c;
    }
    async function load(profile) {
        const image=new Image();image.src=profile.material;
        const props=new Image();props.src=profile.props;
        await Promise.all([image.decode(),props.decode()]);
        const propBounds=readPropBounds(props,profile.regions);
        const c=canvas(256,256),ctx=c.getContext('2d',{willReadFrequently:true});
        ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,256,256);
        const material=ctx.getImageData(0,0,256,256).data;
        const swatches=Array.from({length:4},(_,kind)=>{
            const colors=new Uint8ClampedArray(96*96*3);
            for(let y=0;y<96;y++)for(let x=0;x<96;x++)colors.set(sample(material,kind,x,y,96),(y*96+x)*3);
            return colors;
        });
        const kit={profile,props,propBounds,swatches};assets.set(profile,kit);return kit;
    }
    function sample(material,kind,x,y,period) {
        // Overlap the edge strips instead of reflecting the texture into kaleidoscope patterns.
        const u=x%period,v=y%period,wx=u<32?u/32:1,wy=v<32?v/32:1;
        const pixel=(px,py,ch)=>material[(((py+Math.floor(kind/2)*128)*256+px+(kind%2)*128)*4)+ch];
        return [0,1,2].map(ch=>{
            const a=pixel(u,v,ch),b=pixel(u<32?u+period:u,v,ch);
            const c=pixel(u,v<32?v+period:v,ch),d=pixel(u<32?u+period:u,v<32?v+period:v,ch);
            return (a*wx+b*(1-wx))*wy+(c*wx+d*(1-wx))*(1-wy);
        });
    }
    // Yield between bounded preparation slices; large maps must not block input/paint.
    function yieldPreparation() {return new Promise(resolve=>setTimeout(resolve,0));}
    async function groundDistances(map) {
        const w=map[0].length*32,h=map.length*32,occupied=await floorOccupancy(map),distance=new Float32Array(w*h);
        distance.fill(32);
        for(let i=0;i<distance.length;i++) {
            if(i%32768===0)await yieldPreparation();
            if(isBoundary(occupied,i,w,h))distance[i]=0;
        }
        await sweepDistances(distance,w,h,1);await sweepDistances(distance,w,h,-1);
        for(let i=0;i<distance.length;i++)if(!occupied[i])distance[i]=-distance[i]-.5;
        return distance;
    }
    async function floorOccupancy(map) {
        const w=map[0].length*32,h=map.length*32,occupied=new Uint8Array(w*h);
        const masks=map.map((row,y)=>row.map((value,x)=>value?maskAt(map,x,y):-1));
        for(let y=0;y<h;y++) {
            if(y%32===0)await yieldPreparation();
            for(let x=0;x<w;x++) {
                const mask=masks[Math.floor(y/32)][Math.floor(x/32)];
                if(mask>=0)occupied[y*w+x]=+inside(mask,x%32,y%32);
            }
        }
        return occupied;
    }
    function isBoundary(occupied,i,w,h) {
        const x=i%w,y=Math.floor(i/w),value=occupied[i];
        return (x>0&&occupied[i-1]!==value)||(y>0&&occupied[i-w]!==value)
            ||(x<w-1&&occupied[i+1]!==value)||(y<h-1&&occupied[i+w]!==value);
    }
    async function sweepDistances(distance,w,h,step) {
        const start=step>0?0:w*h-1,end=step>0?w*h:-1;
        for(let i=start;i!==end;i+=step) {
            if(i%32768===0)await yieldPreparation();
            sweepNeighbors(distance,i,w,step);
        }
    }
    function sweepNeighbors(distance,i,w,step) {
        const x=i%w,y=Math.floor(i/w),priorX=x-step,priorY=y-step;
        if(priorX>=0&&priorX<w)distance[i]=Math.min(distance[i],distance[i-step]+1);
        if(priorY<0||priorY>=distance.length/w)return;
        distance[i]=Math.min(distance[i],distance[i-step*w]+1);
        if(x>0)distance[i]=Math.min(distance[i],distance[i-step*w-1]+Math.SQRT2);
        if(x<w-1)distance[i]=Math.min(distance[i],distance[i-step*w+1]+Math.SQRT2);
    }
    async function ground(map,kind,kit) {
        const {swatches,profile}=kit;
        if(profile.surface==='suspended')return suspendedGround(map,kind,swatches);
        const w=map[0].length*32,h=map.length*32,c=canvas(w,h),ctx=c.getContext('2d');
        const pixels=ctx.createImageData(w,h),distance=await groundDistances(map),ruins=kind.rooms.filter(room=>room.role==='boss'||room.role==='elite').map(room=>[room.gx+.5,room.gy+.5,room.radiusX+1,room.radiusY+1]);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
            if(x===0 && y%16===0)await yieldPreparation();
            const i=y*w+x,phase=((y%96)*96+x%96)*3;
            const drift=3*Math.sin(x*.083+Math.sin(y*.06))+2*Math.sin(y*.13+x*.04);
            const edge=distance[i]+drift;
            const dirt=Math.max(0,Math.min(1,(edge+5)/26));
            const meadow=Math.max(0,Math.min(1,(edge+24)/22));
            const stone=Math.max(profile.paving,stoneCoverage(ruins,x/32,y/32))*dirt;
            for(let ch=0;ch<3;ch++) {
                const forest=swatches[2][phase+ch],grass=swatches[3][phase+ch],earth=swatches[1][phase+ch];
                const margin=forest+(grass-forest)*meadow,trail=margin+(earth-margin)*dirt;
                pixels.data[i*4+ch]=trail+(swatches[0][phase+ch]-trail)*stone;
            }
            pixels.data[i*4+3]=255;
        }
        ctx.putImageData(pixels,0,0);return c;
    }
    /** Room platforms and the narrow links use distinct materials, in final rotated map coordinates. */
    function suspendedTiles(layout) {
        return layout.tiles.map((floor,i)=>{
            if(!floor)return 0;
            const x=i%layout.columns,y=Math.floor(i/layout.columns);
            if(layout.rooms.some(room=>Math.abs(x-room.gx)<=room.radiusX&&Math.abs(y-room.gy)<=room.radiusY))return 1;
            return layout.tiles[i-1]&&layout.tiles[i+1]?3:2;
        });
    }
    async function suspendedGround(map,layout,swatches) {
        const w=layout.columns*32,h=layout.rows*32,c=canvas(w,h),ctx=c.getContext('2d');
        const pixels=ctx.createImageData(w,h),distance=await groundDistances(map),tiles=suspendedTiles(layout);
        const raster={data:pixels.data,distance,tiles,swatches,w,columns:layout.columns,
            shades:[[1,1,1],[.52,.52,.52],[.1656,.2185,.2944]]};
        for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
            if(x===0&&y%16===0)await yieldPreparation();
            suspendedPixel(raster,x,y);
        }
        ctx.putImageData(pixels,0,0);return c;
    }
    function suspendedPixel(raster,x,y) {
        const {data,distance,tiles,swatches,w,columns,shades}=raster,i=y*w+x;
        const layer=distance[i]>=0?0:(y>=10&&distance[i-w*10]>=0?1:2);
        const tile=tiles[Math.floor(y/32)*columns+Math.floor(x/32)];
        const phase=(tile===3?((x%96)*96+y%96):((y%96)*96+x%96))*3;
        const material=layer===0?(tile===1?1:0):4-layer;
        const light=layer===0&&distance[i]<2?1.15:1;
        for(let ch=0;ch<3;ch++)data[i*4+ch]=swatches[material][phase+ch]*shades[layer][ch]*light;
        data[i*4+3]=255;
    }
    function stoneCoverage(ruins,x,y) {
        let coverage=0;
        for(const [cx,cy,rx,ry] of ruins) {
            const radius=Math.hypot((x-cx)/rx,(y-cy)/ry);
            const erosion=.08*Math.sin(x*2.7+y*.8)+.06*Math.sin(y*3.1-x);
            coverage=Math.max(coverage,Math.max(0,Math.min(1,(1-radius+erosion)*4)));
        }
        return coverage;
    }
    function readPropBounds(props,regions) {
        const c=canvas(props.width,props.height),ctx=c.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(props,0,0);
        // Crops follow each atlas's isolated silhouettes, not a shared grid assumption.
        return regions.map(([x,y,w,h])=>{
            const pixels=ctx.getImageData(x,y,w,h).data;
            let left=w,top=h,right=0,bottom=0;
            for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++) {
                if(pixels[(yy*w+xx)*4+3]<12)continue;
                left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);
            }
            if(left>right)throw Error('빈 지형 오브젝트');
            return [x+left,y+top,right-left+1,bottom-top+1];
        });
    }
    function prop(ctx,placement,biome='root') {
        const {props,propBounds}=assets.get(profileFor(biome));
        const [id,x,y,tilesWide]=placement,[sx,sy,sw,sh]=propBounds[id];
        const w=Math.round(tilesWide*32),h=Math.round(w*sh/sw),px=Math.round(x*32),py=Math.round(y*32);
        ctx.fillStyle='#102c2460';ctx.beginPath();
        ctx.ellipse(px+w*.13,py-3,w*.36,Math.max(3,w*.11),-.12,0,Math.PI*2);ctx.fill();
        ctx.drawImage(props,sx,sy,sw,sh,px-Math.floor(w/2),py-h,w,h);
    }
    function gate(closed) {
        const c=canvas(128,160),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
        if(closed){
            ctx.fillStyle='#27342f';ctx.fillRect(39,53,50,94);
            for(let row=0;row<5;row++){
                ctx.fillStyle=row%2?'#485247':'#525a4c';ctx.fillRect(41,55+row*18,46,16);
                ctx.fillStyle='#899079';ctx.fillRect(41,55+row*18,46,2);
            }
            ctx.strokeStyle='#c5a46b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,61);ctx.lineTo(64,139);ctx.stroke();
        }
        prop(ctx,[2,2,4.65,3.8]);return c;
    }
    function maskAt(map,x,y) {
        const neighbors=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
        let mask=neighbors.reduce((value,[dx,dy],i)=>map[y+dy]?.[x+dx]===1?value|(1<<i):value,0);
        for(const [corner,a,b] of [[2,1,4],[8,4,16],[32,16,64],[128,64,1]])if(!(mask&a)||!(mask&b))mask&=~corner;
        return mask;
    }
    function inside(mask,x,y) {
        const left=x<16,top=y<16,dx=left?x:31-x,dy=top?y:31-y;
        const h=!!(mask&[4,64][Number(left)]),v=!!(mask&[16,1][Number(top)]);
        if(!h&&!v)return dx>=5&&dy>=5&&dx+dy>=14;
        if(!h)return dx>=5;
        if(!v)return dy>=5;
        const bit=[[128,2],[32,8]][Number(!top)][Number(!left)];
        return !!(mask&bit)||dx+dy>=5;
    }
    function profileFor(biome) {
        // Transitional art only: remaining act profiles still use the approved root kit
        // until their own reviewed material/prop atlases are connected.
        return ACT_EXPLORATION_ART[biome] || ACT_EXPLORATION_ART.root;
    }
    function loadProfile(profile) {
        if(!loads.has(profile))loads.set(profile,load(profile));
        return loads.get(profile);
    }
    async function ready(layout) {
        const [kit]=await Promise.all([loadProfile(profileFor(layout?.biome)),loadProfile(ACT_EXPLORATION_ART.root)]);
        return kit;
    }
    async function terrain(layout) {
        const kit=await ready(layout);
        const map=Array.from({length:layout.rows},(_,y)=>layout.tiles.slice(y*layout.columns,(y+1)*layout.columns));
        return ground(map,layout,kit);
    }
    function scenery(layout) {
        const profile=profileFor(layout.biome);
        if(profile.landmarkWidths)return boundaryScenery(layout,profile.landmarkWidths);
        if(profile.platformWidths)return suspendedScenery(layout,profile.platformWidths);
        const result=[];
        for(let y=2;y<layout.rows-2;y+=3)for(let x=2;x<layout.columns-2;x+=3) {
            if(actExplorationMap.walkable(layout,{gx:x,gy:y}))continue;
            const nearby=actExplorationMap.neighbors(layout,{gx:x,gy:y});
            if(!nearby.length)continue;
            result.push({id:result.length,placement:[(x+y)%2,x+.5,y+.9,3.2]});
        }
        return result;
    }
    function suspendedScenery(layout,widths) {
        // Place roots along broad platform edges, never in one-tile bridge corridors.
        return layout.rooms.filter(room=>room.role!=='boss').map((room,index)=>({
            id:index,placement:[index%widths.length,room.gx-room.radiusX+.65,room.gy+room.radiusY+.6,widths[index%widths.length]]
        }));
    }
    function boundaryScenery(layout,widths) {
        const result=[];
        for(const [index,room] of layout.rooms.entries()) {
            for(const side of [-1,1]) {
                const x=room.gx+side*(room.radiusX+1),y=room.gy+room.radiusY;
                if(actExplorationMap.walkable(layout,{gx:x,gy:y}))continue;
                const id=(index+(side===1?1:0))%widths.length,width=widths[id];
                result.push({id:result.length,placement:[id,x+.5,y+.9,width]});
            }
        }
        return result;
    }
    return {ready,terrain,scenery,prop,gate};
})();
safeExposeGlobals({explorationArt});
