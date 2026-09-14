// Host positioning rules for the integer-cell native controllers; laboratory only.
(() => {
    const lab = newSkillLab, native = lab.native;
    const originalTargets = getSkillTargets;
    const live = () => game.enemies.filter(enemy => enemy.hp > 0);
    native.holyMistInRange = (source,enemy) => getGridUnitCells(enemy)
        .some(cell=>native.WT_HOLY_MIST.inRange(source,cell));
    // Match the existing 12-contact ceiling: bottle + native shards + bonus shards.
    native.emptyFlaskMaxShards = 11;
    native.emptyFlaskShards = options => {
        const rule=native.WT_EMPTY_FLASK;
        const plan=rule.rollShards({...options,extraProjectileChance:0});
        const percent=Math.max(0,Number(options.extraProjectileChance)||0);
        let remaining=native.emptyFlaskMaxShards-plan.baseCount;
        for(let i=0;i<plan.baseCount && remaining>0;i++) {
            const fraction=rule.rollShards({baseCount:1,extraProjectileChance:percent%100,rng:options.rng}).extraCount;
            const count=Math.min(remaining,Math.floor(percent/100)+fraction);
            for(let j=0;j<count;j++)plan.shards.push({baseIndex:i,bonus:true});
            remaining-=count;
        }
        return {...plan,extraCount:plan.shards.length-plan.baseCount,totalShards:plan.shards.length,chancePercent:percent};
    };
    lab.turnTarget = enemy => {
        const center = getGridUnitCenter(enemy), source = game.gridPlayer;
        const dx = source.gx-center.gx, dy = source.gy-center.gy;
        enemy.facingDirection = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 4 : 6) : (dy < 0 ? 8 : 2);
        return enemy.facingDirection;
    };
    lab.targetFacing = enemy => enemy.facingDirection || lab.turnTarget(enemy);
    native.assassinationDestination = (target, direction) => {
        const size = getGridUnitFootprint(target);
        const cell = {gx:target.gx,gy:target.gy};
        if(direction === 4) cell.gx += size.columns;
        if(direction === 6) cell.gx--;
        if(direction === 8) cell.gy += size.rows;
        if(direction === 2) cell.gy--;
        return hasGridCell(cell) ? cell : null;
    };
    lab.canLand = cell => hasGridCell(cell) && !getGridBlockedCells(game.gridPlayer).has(gridCellKey(cell.gx,cell.gy));
    lab.judgmentDirection = (source, target) => {
        const rule = native.WT_RIPPLE_JUDGMENT;
        return [2,4,6,8].find(direction => {
            const center = rule.landingCell(source,direction);
            return center && getGridUnitCells(target).some(cell=>rule.inCross(center,cell));
        });
    };
    lab.coldAim = (source, target) => {
        const rule = native.WT_SUPERCOOLED_MIXTURE, center = getGridUnitCenter(target);
        return rule.inCastRange(source,center) ? center : null;
    };
    lab.coldTargets = hit => live().filter(enemy=>getGridUnitCells(enemy).some(cell=>
        native.WT_SUPERCOOLED_MIXTURE.inRing(hit.landingCell,cell,hit.index)
        || (hit.index===0 && Math.max(Math.abs(cell.gx-hit.landingCell.gx),Math.abs(cell.gy-hit.landingCell.gy))<=.5)));
    lab.areaTargets = hit => {
        const keys = new Set(hit.cells.map(cell=>gridCellKey(cell.gx,cell.gy)));
        return live().filter(enemy=>isGridUnitInCellSet(enemy,keys));
    };
    getSkillTargets = stats => {
        if(game.activeSkill === '과냉각 혼합물') {
            return originalTargets(stats).filter(row=>lab.coldAim(game.gridPlayer,row.enemy));
        }
        if(game.activeSkill !== '파문심판') return originalTargets(stats);
        return live().filter(enemy=>lab.judgmentDirection(game.gridPlayer,enemy) !== undefined)
            .map(enemy=>({enemy,mult:1}));
    };
})();
