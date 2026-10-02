// Wide-map art (2026-10-02 simplification, docs/atlas-pinnacles-20261002.md 1절): every exploration map — story act, content or
// atlas — is one of the ten painted act maps (data ACT_EXPLORATION_BACKDROPS, painted by scripts/build-act-maps.cjs). The backdrop
// and its gate frames are drawn at the backdrop's own pixel scale. The transitional material/prop kits that coloured generated maps are
// gone; if a picture cannot be decoded a flat stand-in (floor over the map's own shade) keeps the run readable. No combat or save mutations.
const explorationArt=(()=>{
    const BACKDROP_PX=16,gateSheets=new Map();
    function canvas(w,h) {
        const c=document.createElement('canvas');c.width=w;c.height=h;return c;
    }
    function backdropFor(layout) {return ACT_EXPLORATION_BACKDROPS[layout?.id]||null;}
    // The art version rides the URL so a redrawn map is never served from the browser's image cache.
    async function decodeImage(src) {
        const image=new Image();image.src=`${src}?v=${ACT_EXPLORATION_ART_VERSION}`;await image.decode();return image;
    }
    async function decodeWithRetry(src) {
        for(let attempt=0;attempt<2;attempt++) {
            // A decode can be aborted while the page is still settling; one retry avoids a session-long fallback.
            try{return await decodeImage(src);}catch(error){console.warn('exploration backdrop failed to load:',src,error);}
        }
        return null;
    }
    async function loadBackdrop(layout) {
        const entry=backdropFor(layout);if(!entry)return null;
        const [image,gateSheet]=await Promise.all([decodeWithRetry(entry.map),entry.gate?decodeWithRetry(entry.gate):null]);
        if(!image)return null;
        if(image.width!==layout.columns*BACKDROP_PX||image.height!==layout.rows*BACKDROP_PX) {
            console.warn('exploration backdrop size mismatch:',entry.map,image.width,image.height);return null;
        }
        if(gateSheet)gateSheets.set(layout.id,{image:gateSheet,offset:entry.gateOffset||[-gateSheet.width/4,-gateSheet.height]});
        return image;
    }
    /** Stand-in when the painting is missing: walls in the map's shade, floor a few steps lighter, at the backdrop's scale. */
    function plain(layout) {
        const shade=backdropFor(layout)?.shade||[16,14,18],c=canvas(layout.columns*BACKDROP_PX,layout.rows*BACKDROP_PX),ctx=c.getContext('2d');
        ctx.fillStyle=`rgb(${shade.join(',')})`;ctx.fillRect(0,0,c.width,c.height);
        ctx.fillStyle=`rgb(${shade.map(value=>Math.min(255,value*2+44)).join(',')})`;
        layout.tiles.forEach((floor,i)=>{
            if(floor)ctx.fillRect((i%layout.columns)*BACKDROP_PX,Math.floor(i/layout.columns)*BACKDROP_PX,BACKDROP_PX,BACKDROP_PX);
        });
        return c;
    }
    async function terrain(layout) {return (await loadBackdrop(layout))||plain(layout);}
    /** Painted maps carry their props in the picture: no separate scenery actors. */
    function scenery() {return [];}
    // Backdrop maps get a gate frame at the backdrop's own pixel scale (drawn at tile/16, never resampled).
    function backdropGate(closed,layout) {
        const sheet=gateSheets.get(layout?.id);if(!sheet)return null;
        const w=sheet.image.width/2,h=sheet.image.height,c=canvas(w,h),ctx=c.getContext('2d');
        ctx.drawImage(sheet.image,closed?0:w,0,w,h,0,0,w,h);
        c.pixelTile=BACKDROP_PX;c.offset=sheet.offset;return c;
    }
    /** Stand-in gate (the gate picture failed): a stone door when sealed, an empty frame when open. */
    function plainGate(closed) {
        const c=canvas(128,160),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
        ctx.fillStyle='#3a3226';ctx.fillRect(33,47,62,106);
        ctx.fillStyle='#27342f';ctx.fillRect(39,53,50,94);
        if(closed) {
            for(let row=0;row<5;row++){
                ctx.fillStyle=row%2?'#485247':'#525a4c';ctx.fillRect(41,55+row*18,46,16);
                ctx.fillStyle='#899079';ctx.fillRect(41,55+row*18,46,2);
            }
            ctx.strokeStyle='#c5a46b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,61);ctx.lineTo(64,139);ctx.stroke();
        }
        return c;
    }
    function gate(closed,layout) {return backdropGate(closed,layout)||plainGate(closed);}
    return {terrain,scenery,gate};
})();
safeExposeGlobals({explorationArt});
