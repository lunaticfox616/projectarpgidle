export const LOOT_UPGRADES={
        // Version 1 granted flask drops immediately, so it has no pending flask rewards to recover.
        1:loot=>Object.assign(loot,{version:2,flasks:[],alchemyGlass:0}),
        // v2 already granted gem drops. Only future rolls enter the pending collection.
        2:loot=>Object.assign(loot,{version:3,gems:[]}),
        // v3 granted cube material immediately; its previous drops must not be paid twice.
        3:loot=>Object.assign(loot,{version:4,blurred45:0}),
        // v4 paid these collections immediately, including their auto-salvage rewards.
        4:loot=>Object.assign(loot,{version:5,growthItems:[],jewels:[],growthCodex:[]}),
        // v5 bypassed equipment salvage, so it has no deferred recovery records.
        5:loot=>Object.assign(loot,{version:6,salvagedEquipment:[]}),
        // v6 held core cube material. The cube became core items (2026-09-30); old progress resets without compensation.
        6:loot=>{delete loot.blurred45;Object.assign(loot,{version:7,cores:[]});},
        // v7 held growth items and growth essence. The growth board was removed (2026-09-30); they go without compensation.
        7:loot=>{
            delete loot.growthItems;delete loot.growthCodex;
            if(loot.currencies&&typeof loot.currencies==='object')delete loot.currencies.growthEssence;
            loot.version=8;
        },
        // v8 held flask discoveries and alchemy glass. Flasks were removed (2026-10-01); they go without compensation.
        8:loot=>{delete loot.flasks;delete loot.alchemyGlass;loot.version=9;},
        // v9 could hold meteor shards (atlas meteor craters) and other star-wedge currencies. Star wedges were removed
        // (2026-10-01); those currencies go without compensation.
        9:loot=>{
            if(loot.currencies&&typeof loot.currencies==='object')['meteorShard','incompleteStarWedge','starWedge','astralCore'].forEach(key=>delete loot.currencies[key]);
            loot.version=10;
        }
    };
