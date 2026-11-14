import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';
import { UNDERWORLD_GEAR_SLOTS } from '../data/underworld-crafting.mjs';
import { underworldEnchantCost, underworldLimitBreakCost,
    underworldGrowthCost, ownedUnderworldRuneNumbers } from '../domain/underworld-crafting.mjs';

/** Owns transient controls and listeners; current saves are read through deps. */
class UnderworldRuneView {
    constructor(deps, inventory, details) {
        this.deps = deps;
        this.inventory = inventory;
        this.details = details;
        this.active = true;
        this.listeners = [];
        this.updateMarkup = this.deps.updateGamePanelMarkup;
        this.iconHtml = no => this.details.iconHtml(no);
        this.COST_NAMES = Object.freeze({underCopper:'구리',underSilver:'은',underGold:'금',runeShard:'지하석 조각'});
        this.costHtml = cost => Object.entries(cost).map(([key, value]) => `<i class="is-${key}">${this.COST_NAMES[key]} ${value}</i>`).join(', ');
        this.PAGES = Object.freeze([['entry', '탐사'], ['stones', '지하석'], ['gear', '장비 가공']]);
        this.page = 'entry';
        this.held = key => Math.max(0, Math.floor(Number((this.deps.game.currencies || {})[key]) || 0));
        this.statName = stat => this.deps.getStatName(stat).replace(/\s*\(%\)$/, '');
        this.pct = stat => (this.deps.P_STATS[stat]?.isPct || /\(%\)$/.test(this.deps.getStatName(stat)) ? '%' : '');
        this.statText = (stat, value) => `${this.statName(stat)} +${this.deps.formatValue(stat, value)}${this.pct(stat)}`;
        this.rangeText = (stat, min, max) => `${this.deps.formatValue(stat, min)}${max === min ? '' : `~${this.deps.formatValue(stat, max)}`}${this.pct(stat)}`;
        this.RESOURCES = Object.freeze([['runeShard', '지하석 조각'], ['underCopper', '구리'], ['underSilver', '은'], ['underGold', '금']]);
        this.resourcesHtml = keys => `<div class="underworld-resource-strip">${this.RESOURCES.filter(([key]) => keys.includes(key))
        .map(([key, name]) => `<span class="is-${key}">${name} <b>${this.held(key)}</b></span>`).join('')}</div>`;
        for (const name of ["progressLabel","ownedNumbers","growthCost","costText","growthChoice","chooseGrowth","validateGrowthChoice","pages","enchantCost","limitBreakCost","render","entryCardHtml","entryPageHtml","nextRewardHtml","skyStoneHtml","stonesPageHtml","slotsHtml","slotAttrs","stoneActionsHtml","gearPageHtml","enchantCardHtml","limitBreakHtml"]) this[name] = this[name].bind(this);
        listenView(this, this.deps.window, 'project-idle:underworld-milestone', ({ detail }) => this.deps.addLog(detail.text, 'loot-unique'));
    }

    progressLabel(state) {
        const slots = Math.max(0, Math.floor(state.unlockedSlots || 0));
        const max = Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0));
        if (!max) return '지하계 10층 격파 시 첫 지하석과 슬롯 해금';
        return `${slots}/6 슬롯, 지하석 ${max === 1 ? '1' : `1~${max}`} 해금`;
    }

    ownedNumbers(state) {
        return ownedUnderworldRuneNumbers(state,this.deps.getUnderworldRuneDef);
    }

    growthCost(level, reroll) {
        return underworldGrowthCost(level,reroll);
    }

    costText(cost) {
        return Object.entries(cost).map(([key, value]) => `${this.COST_NAMES[key]} ${value}`).join(', ');
    }

    growthChoice(state, no, reroll) {
        const def = this.deps.getUnderworldRuneDef(no), level = state.enhanceLvByNo[no] || 0;
        const cost = this.growthCost(level, reroll);
        const missing = Object.entries(cost).some(([key, amount]) => (this.deps.game.currencies[key] || 0) < amount);
        const effect = `${this.deps.getStatName(def.stat)} +${this.deps.formatValue(def.stat, def.val*(1+level*0.01))}${this.deps.P_STATS[def.stat]?.isPct ? '%' : ''}`;
        return {value:no,label:`${def.name}, 지하석 ${no}, +${level}${reroll ? '' : ` → +${level+1}`}`,
            detail:`${effect}\n${this.costText(cost)}${missing ? this.deps._t('\n재료 부족') : ''}`};
    }

    async chooseGrowth(reroll) {
        if (!this.active || this.pendingGrowth || !this.deps.assertBuildEditable()) return null;
        const owner = this.deps.game, loop = owner.loopCount, season = owner.season;
        const state = this.deps.ensureUnderworldRuneState();
        const numbers = this.ownedNumbers(state).filter(no => reroll ? state.enhanceLvByNo[no] >= 5 : (state.enhanceLvByNo[no] || 0) < 15);
        if (!numbers.length) {
            this.deps.addLog(reroll ? '보유 또는 장착한 +5 이상 지하석이 필요합니다.' : '강화 가능한 보유/장착 지하석이 없습니다. (최대 +15)', 'attack-monster');
            return null;
        }
        const levels = new Map(numbers.map(no => [no,state.enhanceLvByNo[no] || 0]));
        this.pendingGrowth = true;
        let no;
        try {
            no = await this.deps.requestGameChoice({title:reroll ? '지하석 보너스 리롤' : '지하석 강화',
                message:this.deps._t('같은 번호의 모든 지하석에 적용됩니다.'),confirmLabel:reroll ? '옵션 리롤' : '지하석 강화',
                choices:numbers.map(no => this.growthChoice(state,no,reroll))});
        } finally {
            this.pendingGrowth = false;
        }
        if (no === null) return null;
        if (!this.growthContextCurrent(owner, loop, season)) return null;
        return this.validateGrowthChoice(state, no, levels.get(no), reroll);
    }

    growthContextCurrent(owner, loop, season) {
        return this.active && owner === this.deps.game && owner.loopCount === loop && owner.season === season;
    }

    isGrowthCurrent(choice) {
        return !!choice && this.growthContextCurrent(choice.owner, choice.loop, choice.season)
            && choice.state === this.deps.game.underworldRunes;
    }

    validateGrowthChoice(state, no, level, reroll) {
        if (!this.deps.assertBuildEditable()) return null;
        const owner = this.deps.game, choice = {state,no,level,owner,loop:owner.loopCount,season:owner.season};
        const quote = this.deps.crafting.quoteGrowth(owner,choice,reroll);
        if (quote.reason === 'state') {
            this.deps.addLog(this.deps._t('지하석 상태가 변경되었습니다. 다시 선택하세요.'), 'attack-monster'); return null;
        }
        if (quote.reason === 'cost') {
            this.deps.addLog(this.deps._t('재료 부족, {cost}', { cost: this.costText(quote.cost) }), 'attack-monster'); return null;
        }
        return {...choice,cost:quote.cost};
    }

    pages() {
        const select = id => { this.page = this.PAGES.some(([key]) => key === id) ? id : 'entry'; this.render(); };
        return {select, items: this.PAGES.map(([id, label]) => ({id, label, on: this.page === id}))};
    }

    enchantCost(strength) {
        return underworldEnchantCost(strength);
    }

    limitBreakCost(slot) {
        return underworldLimitBreakCost(slot,this.deps.UNDERWORLD_LIMIT_BREAK);
    }

    async pickSlot(slotArg, slots) {
        if (!this.active || !this.deps.assertBuildEditable()) return null;
        const owner = this.deps.game, loop = owner.loopCount, season = owner.season;
        const slot = slots.includes(slotArg) ? slotArg : await this.pickGearDialog(slots);
        return slot ? {slot,owner,loop,season} : null;
    }

    gearChoiceCurrent(choice) {
        return !!choice && this.growthContextCurrent(choice.owner,choice.loop,choice.season) && this.deps.assertBuildEditable();
    }

    pickGearDialog(slots) {
        return this.deps.requestGameChoice({title:this.deps._t('장비 대상 선택'),
            message:this.deps._t('작업을 적용할 장비 부위를 선택하세요.'),
            choices:slots.map(slot => ({value:slot,label:slot,detail:this.deps.game.equipment?.[slot]?.name || (this.deps.game.equipment?.[slot] ? '장착 장비' : '장비 없음')})),
            confirmLabel:this.deps._t('대상 선택')});
    }

    gearFailure(result, limitBreak) {
        const t = this.deps._t, cost = result.cost;
        if (result.reason === 'item') return this.deps.addLog(t('해당 부위 장비가 없습니다.'),'attack-monster');
        if (result.reason === 'quality') return this.deps.addLog(t('한계돌파는 퀄리티 {quality}% 장비만 가능합니다(지금 {q}%).', {quality:result.required,q:result.before}),'attack-monster',{toast:true});
        if (result.reason === 'locked') return this.deps.addLog(t('이미 한계돌파를 시도한 장비입니다. 퀄리티 재부여 불가 상태입니다.'),'attack-monster');
        if (result.reason !== 'cost') throw new Error(`Unknown underworld crafting refusal: ${result.reason}`);
        const text = limitBreak ? t('지하계 재화 부족 (구리 {baseCost}/은 {baseCost2}/금 {baseCost3})', {baseCost:cost.underCopper,baseCost2:cost.underSilver,baseCost3:cost.underGold})
            : t('지하계 재화 부족 (구리 {costC}/은 {costS}/금 {costG})', {costC:cost.underCopper,costS:cost.underSilver,costG:cost.underGold});
        this.deps.addLog(text,'attack-monster');
    }

    async enchant(slotArg) {
        const choice = await this.pickSlot(slotArg,Object.keys(this.deps.UNDERWORLD_ENCHANT_POOLS));
        if (!this.gearChoiceCurrent(choice)) return;
        const result = this.deps.crafting.enchant(choice.owner,choice.slot);
        if (!result.ok) return this.gearFailure(result,false);
        const {item,id,value,cost} = result;
        this.deps.addLog(this.deps._t('⛏️ 지하계 인챈트 성공: [{name}] {id} +{value} (비용 구리{costC}/은{costS}/금{costG})',
            {name:this.deps._t(item.name),id:this.deps.getStatName(id),value:this.deps.formatValue(id,value),costC:cost.underCopper,costS:cost.underSilver,costG:cost.underGold}),'loot-rare');
        this.deps.updateStaticUI();
    }

    async limitBreak(slotArg) {
        const choice = await this.pickSlot(slotArg,UNDERWORLD_GEAR_SLOTS);
        if (!this.gearChoiceCurrent(choice)) return;
        const result = this.deps.crafting.limitBreak(choice.owner,choice.slot);
        if (!result.ok) return this.gearFailure(result,true);
        const {item,before,after,delta} = result;
        this.deps.addLog(this.deps._t('🧱 한계돌파 시도: [{name}] 퀄리티 {before}% → {after}% (변동 {delta}%, 재부여 잠김)',
            {name:this.deps.getItemDisplayName(item),before,after,delta:`${delta>=0?'+':''}${delta}` }),'season-up');
        this.deps.updateStaticUI();
    }

    async grow(reroll) {
        const choice = await this.chooseGrowth(reroll);
        if (!this.isGrowthCurrent(choice)) return;
        const result = this.deps.crafting.grow(this.deps.game,choice,reroll);
        if (!result.ok) {
            this.validateGrowthChoice(choice.state,choice.no,choice.level,reroll);
            return;
        }
        const {no,level,lines} = result, name = this.deps.getUnderworldRuneDef(no).name;
        if (reroll) {
            const text = lines.map(row => `${this.deps.getStatName(row.stat)} +${this.deps.formatValue(row.stat,row.val)}`).join(' / ');
            this.deps.addLog(this.deps._t('지하석 옵션 리롤: {name}, {text}', {name,text}),'season-up');
        } else this.deps.addLog(this.deps._t('지하석 강화 성공: {name} +{value} (보너스 옵션 {length}줄)', {name,value:level,length:lines.length}),'loot-unique');
        this.deps.updateStaticUI(); this.deps.queueImportantSave(200);
    }

    render() {
        if (!this.active) return;
        this.inventory.closeStale();
        const list = this.deps.document.getElementById('ui-underworld-list'), panel = this.deps.document.getElementById('ui-underworld-panel');
        if (!list || !panel) return;
        this.owner = this.deps.game;
        this.bindControls([list, panel]);
        this.deps.captureUiDisclosureState(panel);
        this.updateMarkup(list, this.page === 'entry' ? this.entryCardHtml() : '');
        this.updateMarkup(panel, ({entry: this.entryPageHtml, stones: this.stonesPageHtml, gear: this.gearPageHtml})[this.page]());
        this.deps.restoreUiDisclosureState(panel);
    }

    entryCardHtml() {
        const progress = this.deps.game.underworldProgress || {}, floor = Math.max(1, Math.floor(progress.currentFloor || 1));
        const highest = Math.max(1, Math.floor(progress.highestFloor || 1)), block = this.deps.getUnderworldEntryBlock(this.deps.game), off = block ? 'disabled' : '';
        const lock = block ? `<div class="underworld-entry-block"><small class="underworld-lock">${this.deps.escapeHTML(block.label)}</small>
            ${this.deps.contentUnlockUi.progressButton(block.route, '조건을 채울 곳 보기')}</div>` : '';
        const other = floor === highest ? '' : `<button type="button" data-exploration-departure data-underworld-command="floor" data-underworld-value="${floor}" ${off}>${this.deps._t('{floor}층 입장', { floor })}</button>`;
        return `<section class="underworld-entry-card ${this.deps.game.currentZoneId === this.deps.UNDERWORLD_ZONE_ID ? 'current' : ''}"><div class="underworld-entry-copy">`
            + `<span>${this.deps._t('최고층 도전 기준, 현재 선택 {floor}층', { floor })}</span><strong>${this.deps._t('최고 개방 {highest}층', { highest })}</strong><div>${this.deps.buildMapPowerEstimateHtml(this.deps.getUnderworldZone(highest))}</div>${lock}</div>`
            + `<div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure data-underworld-command="floor" data-underworld-value="${highest}" ${off}>${this.deps._t('최고층 {highest} 입장', { highest })}</button>`
            + `${other}<button type="button" data-exploration-departure data-underworld-command="prompt" ${off}>${this.deps._t('다른 층…')}</button></div></section>`;
    }

    entryPageHtml() {
        const tickets = [['uberRootTicketFlame', '화염', 'is-fire'], ['uberRootTicketFrost', '냉기', 'is-cold'], ['uberRootTicketStorm', '번개', 'is-light'], ['uberRootTicketChaos', '카오스', 'is-chaos']];
        return `<div class="underworld-lower-grid">${this.skyStoneHtml()}<section class="underworld-upgrade-card underworld-reward-card">${this.nextRewardHtml()}`
            + `<div class="underworld-ticket-strip"><small>${this.deps._t('그림자 뿌리 입장권')}</small>${tickets.map(([key, name, tone]) => `<span class="has-stat ${tone}">${name} <b>${this.held(key)}</b></span>`).join('')}</div></section></div>`;
    }

    nextRewardHtml() {
        const state = this.deps.ensureUnderworldRuneState(), rule = this.deps.UNDERWORLD_DEEP_FLOOR_REWARD;
        const nextNo = Math.min(30, Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0))) + 1;
        const paid = Math.max(rule.fromFloor, Math.floor(this.deps.game.underworldProgress.deepRewardFloor || 0));
        const floor = nextNo <= 30 ? nextNo * 10 : rule.fromFloor + (Math.floor((paid - rule.fromFloor) / rule.every) + 1) * rule.every;
        const reward = this.deps.window.GameModules.state.underworldMilestoneReward(floor);
        const slots = reward.slots > state.unlockedSlots ? `<span>${this.deps._t('지하석 슬롯 {slots}/6', { slots: reward.slots })}</span>` : '';
        const stone = reward.rune ? `<div class="underworld-next-stone">${this.iconHtml(reward.rune.no)}<div><strong>${this.deps._t('{name} 지하석 1개', { name: this.deps.escapeHTML(this.deps._t(reward.rune.name)) })}</strong>
            <small>${this.details.effectHtml(reward.rune.no)}</small><span>${this.deps._t('지하석 1~{no} 해금', { no: reward.rune.no })}</span>${slots}</div></div>` : '';
        const materials = this.RESOURCES.filter(([key]) => reward.currencies[key]).map(([key, name]) => `<span class="is-${key}">${name} <b>${this.deps._t('{currencies}개', { currencies: reward.currencies[key] })}</b></span>`).join('');
        return `<div><strong>${this.deps._t('{floor}층 보상', { floor })}</strong>${stone}<div class="underworld-ticket-strip">${materials}</div><small>${this.deps._t('15층부터 지속 피해')}</small></div>`;
    }

    skyStoneHtml() {
        const tower = this.deps.ensureSkyTowerState(), level = Math.max(0, Math.floor((tower.skyStone || {}).level || 0));
        const maxed = level >= this.deps.getSkyStoneMaxLevel(), cost = this.deps.getSkyStoneNextCost();
        return `<section class="underworld-upgrade-card"><div><strong>창공석 ${level > 0 ? `+${level}` : this.deps._t('미제작')}</strong><span>${this.deps._t('지하계 중력 패널티 감소 {skyStoneReductionPct}% / 75%', { skyStoneReductionPct: this.deps.getSkyStoneReductionPct() })}</span></div>`
            + `<div><span>${this.deps._t('응축된 창공의 정수 {floor}', { floor: Math.floor(tower.condensedPower || 0) })}</span><button data-underworld-command="sky-stone" ${maxed ? 'disabled' : ''}>${level > 0 ? this.deps._t('강화') : this.deps._t('제작')}, ${maxed ? this.deps._t('최대') : cost}</button></div></section>`;
    }

    stonesPageHtml() {
        const state = this.deps.ensureUnderworldRuneState(), counts = this.deps.getUnderworldRuneCountMap(state.obtainedRunes);
        const owned = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const chips = Object.keys(counts).map(Number).sort((a, b) => a - b).map(no => {
            return `<button type="button" class="underworld-rune-chip" data-underworld-command="tooltip" data-underworld-rune="${no}" data-info-tooltip-anchor="1">${this.iconHtml(no)}<span>${this.deps.getUnderworldRuneDef(no)?.name || this.deps._t('지하석{no}', { no })}</span><b>×${counts[no]}</b></button>`;
        }).join('');
        return `<div class="underworld-panel-head"><div><strong>${this.deps._t('지하석')}</strong><span>${this.progressLabel(state)}</span></div>${this.resourcesHtml(this.RESOURCES.map(([key]) => key))}</div>`
            + `<section class="underworld-rune-console"><div class="underworld-rune-slots">${this.slotsHtml(state)}</div></section>${this.stoneActionsHtml(state)}`
            + `<section class="underworld-inventory-card"><strong>${this.deps._t('보유 지하석 {owned}개', { owned })}</strong><div class="underworld-rune-inventory">${chips || this.deps._t('<span class="core-cube-muted">없음</span>')}</div></section>`;
    }

    slotsHtml(state) {
        return Array.from({length: 6}, (_, index) => {
            const no = state.equippedRunes[index], unlocked = index < Math.max(0, Math.floor(state.unlockedSlots || 0)), def = no ? this.deps.getUnderworldRuneDef(no) : null;
            const label = unlocked ? (def ? def.name : '비어 있음') : '잠김', art = unlocked ? this.iconHtml(no) : '';
            const effect = unlocked ? (def ? this.details.effectHtml(no) : '눌러서 장착') : this.deps._t('{value}층 격파', { value: (index + 1) * 10 });
            return `<button type="button" class="underworld-rune-slot ${unlocked ? 'unlocked' : 'locked'}" ${this.slotAttrs(no, index, unlocked)}><span class="underworld-rune-slot-no">${index + 1}</span>`
                + `<span class="underworld-rune-slot-art">${art}</span><strong>${label}</strong><small>${effect}</small></button>`;
        }).join('');
    }

    slotAttrs(no, index, unlocked) {
        if (!unlocked) return 'disabled';
        return `data-underworld-command="slot" data-underworld-value="${index}" data-underworld-rune="${no || ''}" data-info-tooltip-anchor="1"`;
    }

    stoneActionsHtml(state) {
        const blocked = this.held('runeShard') < 10 || !state.unlockedRunesMaxNumber || this.deps.game.woodsmanBuildLock;
        const actions = [['craft', '가공', '해금된 번호 가운데 하나', this.costHtml({runeShard: 10}), blocked],
            ['upgrade', '승급', '같은 번호 3개를 다음 번호 1개로', '<i class="is-runeShard">지하석 조각, 번호만큼(최소 5)</i>', false],
            ['enhance', '강화', '능력치 +1%씩, 5, 10, 15단계에 보너스 옵션', this.deps._t('{n}부터', { n: this.costHtml(this.growthCost(0, false)) }), false],
            ['reroll', '보너스 다시', '+5 이상 지하석의 보너스 옵션을 다시 굴림', this.deps._t('{n}부터', { n: this.costHtml(this.growthCost(0, true)) }), false]];
        return `<div class="underworld-action-grid underworld-stone-actions">${actions.map(([call, title, effect, cost, off]) =>
            `<button data-underworld-command="${call}" ${off ? 'disabled' : ''}><strong>${title}</strong><span>${effect}</span><small>${cost}</small></button>`).join('')}</div>`;
    }

    gearPageHtml() {
        const cards = Object.entries(this.deps.UNDERWORLD_ENCHANT_POOLS).map(([slot, pool]) => this.enchantCardHtml(slot, pool)).join('');
        return `<div class="underworld-panel-head"><div><strong>${this.deps._t('장비 인챈트')}</strong><span>${this.deps._t('장착한 장비에 지하계 옵션 한 줄, 다시 하면 그 줄이 바뀝니다')}</span></div>`
            + `${this.resourcesHtml(['underCopper', 'underSilver', 'underGold'])}</div><div class="underworld-enchant-grid">${cards}</div>${this.limitBreakHtml()}`;
    }

    enchantCardHtml(slot, pool) {
        const item = this.deps.game.equipment && this.deps.game.equipment[slot], now = item && item.underEnchant;
        const rows = pool.map(([stat, min, max, strength]) => {
            const cost = this.enchantCost(strength);
            return `<li class="has-stat" style="--stat-tone:${this.deps.getItemStatToneColor(stat)}"><span>${this.statName(stat)} +${this.rangeText(stat, min, max)}</span><small><i class="is-underCopper">${cost.underCopper}</i>/<i class="is-underSilver">${cost.underSilver}</i>/<i class="is-underGold">${cost.underGold}</i></small></li>`;
        }).join('');
        return `<article class="underworld-enchant-card"><header><strong>${slot}</strong><span>${item ? this.deps.escapeHTML(this.deps.getItemDisplayName(item)) : this.deps._t('장비 없음')}</span></header>`
            + `<p class="${now ? 'is-on' : ''}">${now ? this.deps._t('지금 {id}', { id: this.statText(now.id, now.val) }) : this.deps._t('인챈트 없음')}</p>`
            + `<ul><li class="is-head"><span>${this.deps._t('나올 수 있는 효과')}</span><small><i class="is-underCopper">${this.deps._t('구리')}</i>/<i class="is-underSilver">${this.deps._t('은')}</i>/<i class="is-underGold">${this.deps._t('금')}</i></small></li>${rows}</ul>`
            + `<button type="button" data-underworld-command="enchant" data-underworld-value="${this.deps.escapeHTML(slot)}" ${item ? '' : 'disabled'}>${this.deps._t('인챈트')}</button></article>`;
    }

    limitBreakHtml() {
        const rule = this.deps.UNDERWORLD_LIMIT_BREAK;
        const costs = [['무기', 'weapon'], ['방어구', 'armour'], ['장신구', 'accessory']]
            .map(([name, key]) => `<span>${name} ${this.costHtml({underCopper: rule.costs[key][0], underSilver: rule.costs[key][1], underGold: rule.costs[key][2]})}</span>`).join('');
        const ready = Object.entries(this.deps.game.equipment || {}).filter(([, item]) => item && Math.floor(item.quality || 0) === rule.quality && !item.qualityLockedByLimitBreak);
        const buttons = ready.length ? ready.map(([slot, item]) => `<button type="button" data-underworld-command="limit-break" data-underworld-value="${this.deps.escapeHTML(slot)}">${slot}, ${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}</button>`).join('')
            : `<span>${this.deps._t('퀄리티 {quality}%인 장착 장비가 없습니다', { quality: rule.quality })}</span>`;
        return `<section class="underworld-upgrade-card underworld-limit-break"><div><strong>${this.deps._t('한계돌파')}</strong>`
            + `<span>${this.deps._t('퀄리티 {quality}% 장비의 퀄리티가 −{swing}~+{swing2}%(최대 {cap}%), 그 뒤로 고정', { quality: rule.quality, swing: rule.swing, swing2: rule.swing, cap: rule.cap })}</span>`
            + `<div class="underworld-ticket-strip">${costs}</div></div><div class="underworld-limit-targets">${buttons}</div></section>`;
    }

    bindControls(hosts) {
        if (this.hosts?.every((host, index) => host === hosts[index])) return;
        for (const host of this.hosts || []) releaseViewTarget(this, host);
        this.hosts = hosts;
        for (const host of hosts) {
            listenView(this, host, 'click', event => this.onClick(event, host));
            listenView(this, host, 'mouseover', event => this.onTooltip(event, host));
            listenView(this, host, 'mousemove', event => this.onTooltip(event, host));
            listenView(this, host, 'mouseout', event => this.onTooltipOut(event));
        }
    }

    onClick(event, host) {
        const button = event.target.closest('[data-underworld-command]');
        if (!this.active || !button || !host.contains(button) || button.disabled) return;
        if (this.owner !== this.deps.game) return this.render();
        const value = button.dataset.underworldValue;
        const actions = {
            floor: () => this.deps.enterUnderworldFloor(Number(value)), prompt: this.deps.enterUnderworldPrompt,
            'sky-stone': this.deps.upgradeSkyStone, craft: () => this.inventory.craft(),
            upgrade: () => this.inventory.openUpgrade(), enhance: () => this.grow(false),
            reroll: () => this.grow(true), enchant: () => this.enchant(value),
            'limit-break': () => this.limitBreak(value),
            slot: () => this.inventory.openSlot(Number(value)), tooltip: () => this.onTooltip(event, host)
        };
        const command = button.dataset.underworldCommand;
        if (Object.hasOwn(actions, command)) actions[command]();
    }

    onTooltip(event, host) {
        const button = event.target.closest('[data-underworld-rune]');
        if (!this.active || !button || !host.contains(button) || !button.dataset.underworldRune) return;
        this.details.showTooltip(event, Number(button.dataset.underworldRune));
    }

    onTooltipOut(event) {
        const button = event.target.closest('[data-underworld-rune]');
        if (button && !button.contains(event.relatedTarget)) this.deps.hideInfoTooltip();
    }

    api() { return {applyUnderworldEnchant: slot => this.enchant(slot),attemptUnderworldLimitBreak: slot => this.limitBreak(slot),
        enhanceUnderworldRune: () => this.grow(false),rerollUnderworldRuneBonus: () => this.grow(true),
        updateMarkup: this.updateMarkup,progressLabel: this.progressLabel,chooseGrowth: this.chooseGrowth,
        isGrowthCurrent: choice => this.isGrowthCurrent(choice),
        pages: this.pages,render: this.render,enchantCost: this.enchantCost,limitBreakCost: this.limitBreakCost,iconHtml: this.iconHtml}; }

    dispose() {
        releaseViewEvents(this);
        this.inventory.dispose();
    }
}

export function createUnderworldRuneView(deps, inventory, details) {
    const view = new UnderworldRuneView(deps,inventory,details);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}

