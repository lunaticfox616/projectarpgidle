import { createExplorationObjectView } from '../rendering/exploration-objects.mjs';

// Canvas returns one frame's hit areas; DOM changes wait until the frame is complete.
class ExplorationObjectActions {
    constructor(deps) {
        this.deps = deps;
        this.interaction = { hovered: null };
        this.renderer = createExplorationObjectView(deps, this.interaction);
        this.layer = undefined;
        this.lastRun = undefined;
        this.buttons = new Map();
        this.pending = null;
        this.installed = false;
        this.onObject = this.logObject.bind(this);
    }

    append(owner, actors, view) { this.pending = this.renderer.append(owner, actors, view); }

    /** Apply DOM changes after drawing, to avoid forced style updates between Canvas calls. */
    flushButtons(owner) {
        if(!this.pending)return;
        const {run,p,rows}=this.pending;
        this.pending=null;
        this.syncLayer(owner, run);
        if(!run?.objects)return;
        const shown=new Set();
        for(const {row,point} of rows){this.button(owner, row,point,p);shown.add(row.id);}
        for(const [id,node] of this.buttons)if(!shown.has(id)){node.remove();this.buttons.delete(id);}
    }

    syncLayer(owner, run) {
        if(!this.layer) {
            const wrap=this.deps.document.getElementById('battlefield-wrap');if(!wrap)return;
            this.layer=this.deps.document.createElement('div');this.layer.id='exploration-object-actions';this.layer.setAttribute('aria-label',this.deps._t('발견한 상자와 오브젝트'));
            wrap.appendChild(this.layer);
        }
        if(this.lastRun!==run){this.buttons.forEach(n=>n.remove());this.buttons.clear();this.lastRun=run;}
        this.layer.hidden=!run?.objects||!!owner.isBackgroundCalculation;
    }

    button(owner, row,point,p) {
        if(!this.layer)return;
        let node=this.buttons.get(row.id);
        if(!node) {
            node=this.deps.document.createElement('button');node.type='button';node.className='exploration-object-action';
            node.dataset.objectId=row.id;
            const action=['pot','crate'].includes(row.kind)?'부수기':row.kind==='nest'?'건드리기':'열기';
            const name=this.deps.actExplorationState.objects.name(row);
            node.setAttribute('aria-label',`${name} ${action}`);
            const text=this.deps.document.createElement('span');text.textContent=`${name} ${action}`;node.appendChild(text);
            node.addEventListener('click',event=>{event.stopPropagation();this.deps.request(row.id);});
            const hot=on=>()=>{if(on)this.interaction.hovered=row.id;else if(this.interaction.hovered===row.id)this.interaction.hovered=null;};
            node.addEventListener('pointerenter',hot(true));node.addEventListener('focus',hot(true));
            node.addEventListener('pointerleave',hot(false));node.addEventListener('blur',hot(false));
            this.layer.appendChild(node);this.buttons.set(row.id,node);
        }
        const size=Math.max(28,p.tileW*.9),x=Math.round(point.x-size/2),y=Math.round(point.y+p.actorGroundOffsetY-size);
        const style=`left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        if(node.dataset.bounds!==style){node.style.cssText=style;node.dataset.bounds=style;}
        node.disabled=owner.combatHalted||owner.playerHp<=0||owner.moveTimer>0;
    }

    logObject(event) {
        const {kind,name,objectKind}=event.detail;
        if(objectKind==='pot'||objectKind==='crate')return;
        this.deps.addLog(kind==='spawn'?this.deps._t('{name}에서 몬스터가 나타났습니다.', { name }):this.deps._t('{name}의 전리품을 획득했습니다.', { name }),kind==='spawn'?'attack-monster':'loot-magic',{noToast:true});
    }

    install() {
        if(this.installed)return;
        this.deps.events.addEventListener('project-idle:exploration-object',this.onObject);
        this.installed=true;
    }

    dispose() {
        if(this.installed)this.deps.events.removeEventListener('project-idle:exploration-object',this.onObject);
        this.installed=false;
        this.layer?.remove();
        this.layer=undefined;
        this.lastRun=undefined;
        this.buttons.clear();
        this.pending=null;
        this.interaction.hovered=null;
    }
}

export function createExplorationObjectActions(deps) {
    const actions=new ExplorationObjectActions(deps);
    return {
        append:actions.append.bind(actions), flushButtons:actions.flushButtons.bind(actions),
        draw:actions.renderer.draw, drawGround:actions.renderer.drawGround,
        install:actions.install.bind(actions), dispose:actions.dispose.bind(actions)
    };
}
