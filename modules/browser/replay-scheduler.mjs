/** Yield after paint, bounded by a timer when WebViews stop delivering frames. */
export function createReplayScheduler(deps) {
    const pending=new Set();
    let active=true;

    function waitFrame() {
        if (!active) return Promise.resolve();
        return new Promise(resolve=>{
            let timer=null,frame=null,paintTimer=null,finished=false;
            const finish=()=>{
                if (finished) return;
                finished=true;
                if (timer!==null) deps.clearTimeout(timer);
                if (paintTimer!==null) deps.clearTimeout(paintTimer);
                if (frame!==null && typeof deps.cancelAnimationFrame==='function') deps.cancelAnimationFrame(frame);
                pending.delete(finish); resolve();
            };
            pending.add(finish);
            timer=deps.setTimeout(finish,100);
            if (typeof deps.requestAnimationFrame==='function') frame=deps.requestAnimationFrame(()=>{
                frame=null;
                if (!finished) paintTimer=deps.setTimeout(finish,0);
            });
        });
    }

    function delay(ms) {
        if (!active) return Promise.resolve();
        return new Promise(resolve=>{
            let timer=null;
            const finish=()=>{ if (timer!==null) deps.clearTimeout(timer); pending.delete(finish); resolve(); };
            pending.add(finish); timer=deps.setTimeout(finish,ms);
        });
    }

    function dispose() { active=false; for(const finish of pending) finish(); pending.clear(); }
    return Object.freeze({waitFrame,delay,dispose});
}
