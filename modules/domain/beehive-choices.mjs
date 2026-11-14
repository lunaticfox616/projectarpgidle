export class BeehiveChoices {
    constructor(deps) {
        this.deps = deps;
    }

    rewardAmount(base, branchStep) {
        let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
        return Math.max(1, Math.floor(base * (1 + depthBonus)));
    }

    penaltyPool(owner, branchStep) {
        let depth = Math.max(1, Math.floor(branchStep || 1));
        let pool = [
            { key: 'swarm', text: (0, this.deps._t)('군체 분노 +1'), power: 1 },
            { key: 'pursuit', text: (0, this.deps._t)('이번 무리 벌 +2마리'), power: 2 },
            { key: 'pollen_tax', text: (0, this.deps._t)('꽃가루 -6'), power: 1 }
        ];
        if (depth >= 4) pool.push({ key: 'deep_swarm', text: (0, this.deps._t)('심층 군체 분노 +2'), power: 2 });
        pool.push({ key: 'venom_tax', text: (0, this.deps._t)('독벌침 1개 소모 확률 25%'), power: 1 },
            { key: 'honey_tax', text: (0, this.deps._t)('벌꿀 1개 소모 확률 20%'), power: 1 });
        if (depth >= 6) pool.push({ key: 'royal_swarm', text: (0, this.deps._t)('왕실 군체 분노 +3'), power: 3 });
        return pool.filter((...args) => this.canPay(owner, ...args));
    }

    penaltyCost(penalty) {
        const costs = {
            pollen_tax: { key: 'pollen', name: '꽃가루', amount: 6, chance: 1 },
            venom_tax: { key: 'venomStinger', name: '독벌침', amount: 1, chance: 0.25 },
            honey_tax: { key: 'enchantedHoney', name: '벌꿀', amount: 1, chance: 0.2 }
        };
        return penalty ? costs[penalty.key] : undefined;
    }

    canPay(owner, penalty) {
        if (!penalty) return false;
        const cost = this.penaltyCost(penalty);
        if (cost) return (owner.currencies[cost.key] || 0) >= cost.amount;
        return ['swarm', 'sting', 'pursuit', 'deep_swarm', 'royal_swarm'].includes(penalty.key);
    }

    selectable(owner, choices, key) {
        if (!['a', 'b', 'c'].includes(key)) return null;
        const pick = choices[key];
        if (!pick || key !== 'c' || ['a', 'b', 'c'].some(id => this.canPay(owner, choices[id]?.penalty))) return pick;
        // Old saves or spending between waves can exhaust all three costs. Keep rewards
        // fixed and visibly offer one combat penalty so the expedition cannot softlock.
        return { ...pick, penalty: { key: 'swarm', text: (0, this.deps._t)('군체 분노 +1'), power: 1 } };
    }

    rewardPool(owner, branchStep) {
        // Filter new offers only; already saved choices and promised rewards retain their original payouts.
        let depth = Math.max(1, Math.floor(branchStep || 1));
        const currencies = { honey: ['enchantedHoney'], stinger: ['venomStinger'],
            bundle: ['pollen', 'venomStinger', 'formlessDew'] };
        return [
            { type: 'pollen', weight: 42 }, { type: 'honey', weight: 18 }, { type: 'stinger', weight: 16 },
            { type: 'formlessDew', weight: 14 + Math.min(8, depth) }, { type: 'goldenRule', weight: 2 + Math.floor(depth / 4) },
            { type: 'jewelShard', weight: 10 }, { type: 'beeswax', weight: 10 }, { type: 'bundle', weight: 4 }
        ].filter(row => (currencies[row.type] || [row.type]).every(key => this.deps.contentProgression.canDropCurrency(key,owner)));
    }

    pickReward(owner, branchStep, usedTypes) {
        let used = usedTypes || new Set();
        let pool = this.rewardPool(owner, branchStep).filter(row => !used.has(row.type));
        if (pool.length <= 0) pool = this.rewardPool(owner, branchStep);
        let total = pool.reduce((sum, row) => sum + Math.max(0, row.weight || 0), 0);
        let roll = this.deps.random() * Math.max(1, total);
        for (let row of pool) {
            roll -= Math.max(0, row.weight || 0);
            if (roll <= 0) return row.type;
        }
        return pool[0].type;
    }

    prepare(owner, b) {
        if (!b || !b.inRun || b.awaitingClear || b.queenActive) return;
        let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
        let used = new Set();
        let immediate = this.pickReward(owner, nextStep, used);
        used.add(immediate);
        let wave = this.pickReward(owner, nextStep, used);
        used.add(wave);
        let queen = this.pickReward(owner, nextStep, used);
        b.pendingChoice = {
            a: this.option(owner, immediate, nextStep, 'immediate'),
            b: this.option(owner, wave, nextStep, 'wave'),
            c: this.option(owner, queen, nextStep, 'queen'),
            branchStep: nextStep
        };
    }

    timingLabel(timing) {
        if (timing === 'immediate') return '즉시 보상';
        if (timing === 'queen') return '여왕벌 보상';
        return '웨이브 보상';
    }

    timingMultiplier(timing) {
        if (timing === 'immediate') return 0.55;
        if (timing === 'queen') return 2.25;
        return 1;
    }

    scaledAmount(baseAmount, timing) {
        return Math.max(1, Math.floor(Math.max(1, baseAmount || 1) * this.timingMultiplier(timing)));
    }

    scaledChance(baseChance, timing) {
        let chance = Number.isFinite(baseChance) ? baseChance : 1;
        if (timing === 'immediate') return Math.max(0.05, Math.min(1, chance * 0.75));
        if (timing === 'queen') return Math.min(1, chance + 0.35);
        return chance;
    }

    option(owner, type, branchStep, timing = 'wave') {
        let step = Math.max(1, Math.floor(branchStep || ((owner.beehive || {}).branchStep || 1)));
        let penaltyPool = this.penaltyPool(owner, step);
        let penalty = penaltyPool[Math.floor(this.deps.random() * penaltyPool.length)];
        const reward = this.rewardOffer(type, step, timing);
        const text = this.deps._t('[{label}] {text} / 대가: {text2}', {
            label: this.timingLabel(timing), text: reward.text, text2: penalty.text
        });
        return { ...reward, text, penalty, timing };
    }

    rewardOffer(type, step, timing) {
        const scaled = base => this.scaledAmount(this.rewardAmount(base, step), timing);
        switch (type) {
        case 'pollen': return this.amountOffer(type, scaled(12 + Math.floor(this.deps.random() * 7)));
        case 'honey':
        case 'stinger':
        case 'goldenRule': return this.chanceOffer(type, step, timing);
        case 'formlessDew': return this.amountOffer(type, scaled(1 + Number(step >= 7)));
        case 'jewelShard': return this.amountOffer(type, scaled(2 + Math.floor(this.deps.random() * 3)));
        case 'beeswax': return this.amountOffer(type, this.scaledAmount(1 + Number(step >= 8), timing));
        case 'bundle': return this.amountOffer(type, this.scaledAmount(1, timing));
        default: return this.amountOffer('pollen', this.scaledAmount(10, timing));
        }
    }

    amountOffer(effect, amount) {
        const labels = {
            pollen: '꽃가루 +{amount}', formlessDew: '형체 없는 이슬 +{amount}',
            jewelShard: '주얼 결정 +{amount}', beeswax: '밀랍 +{amount}',
            bundle: '꽃가루 +{value}, 독벌침 +{amount}, 형체 없는 이슬 +{amount2}'
        };
        return { text: this.deps._t(labels[effect], { amount, value: 20 * amount, amount2: amount }), effect, amount, chance: undefined };
    }

    chanceOffer(effect, step, timing) {
        const chances = { honey: 0.30, stinger: 0.38, goldenRule: step >= 8 ? 1 : 0.35 };
        const labels = { honey: '벌꿀 획득 확률 {floor}%', stinger: '독벌침 획득 확률 {floor}%', goldenRule: '황금률 획득 확률 {floor}%' };
        const chance = this.scaledChance(chances[effect], timing);
        const text = effect === 'goldenRule' && chance >= 1 ? '황금률 +1'
            : this.deps._t(labels[effect], { floor: Math.floor(chance * 100) });
        return { text, effect, amount: 1, chance };
    }

    applyPenalty(owner, penalty, b) {
        if (!this.canPay(owner, penalty)) return null;
        b.waveExtra = Number(penalty.key === 'pursuit') * 2;
        const cost = this.penaltyCost(penalty);
        if (cost) {
            if (cost.chance < 1 && this.deps.random() >= cost.chance) return (0, this.deps._t)('{name} 소모 없음', { name: cost.name });
            owner.currencies[cost.key] -= cost.amount;
            return `${cost.name} -${cost.amount}`;
        }
        return this.applyCombatPenalty(owner, penalty, b);
    }

    applyCombatPenalty(owner, penalty, b) {
        let power = Math.max(1, Math.floor(penalty.power || 1));
        if (['swarm', 'deep_swarm', 'royal_swarm'].includes(penalty.key)) b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + power));
        else if (penalty.key === 'sting') owner.playerHp = Math.max(1, Math.floor((owner.playerHp || 1) * 0.95));
        return penalty.text || '';
    }

    applyReward(owner, pick) {
        if (!pick) return '';
        let chance = Number.isFinite(pick.chance) ? pick.chance : 1;
        if (chance < 1 && this.deps.random() >= chance) return '보상 획득 실패';
        let amount = Math.max(1, Math.floor(pick.amount || 1));
        return this.creditReward(owner, pick.effect, amount);
    }

    creditReward(owner, effect, amount) {
        if (effect === 'honey') { owner.currencies.enchantedHoney = (owner.currencies.enchantedHoney || 0) + amount; return (0, this.deps._t)('벌꿀 +{amount}', { amount }); }
        if (effect === 'stinger') { owner.currencies.venomStinger = (owner.currencies.venomStinger || 0) + amount; return (0, this.deps._t)('독벌침 +{amount}', { amount }); }
        if (effect === 'bundle') return this.creditBundle(owner, amount);
        if (!effect) return '';
        const merged = Object.entries(this.deps.CURRENCY_LEGACY_MERGE || {}).find(([, keys]) => keys.includes(effect));
        const key = merged ? merged[0] : effect;
        owner.currencies[key] = (owner.currencies[key] || 0) + amount;
        return `${this.deps.getCurrencyInfo(key).name} +${amount}`;
    }

    creditBundle(owner, amount) {
            owner.currencies.pollen = (owner.currencies.pollen || 0) + (20 * amount);
            owner.currencies.venomStinger = (owner.currencies.venomStinger || 0) + amount;
            owner.currencies.formlessDew = (owner.currencies.formlessDew || 0) + amount;
            return (0, this.deps._t)('꽃가루 +{value} / 독벌침 +{amount} / 형체 없는 이슬 +{amount2}', { value: 20 * amount, amount, amount2: amount });
    }
}
