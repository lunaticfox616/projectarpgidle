const ARM_ROWS = Object.freeze({ wide: { up: 6, right: 2, left: 2, down: 3 }, narrow: { up: 3, right: 1, left: 1, down: 2 } });
const LEAF_ART = 'pixel:leaf';
const YARN_ART = 'assets/ui/currency/yarn.png';

export class GroundLootPresentation {
    constructor(deps) {
        this.deps = deps;
        for (const name of ['isMajor', 'importance']) this[name] = this[name].bind(this);
        this.floorReceipt = {
            currency: row => ({ currency: row.currency, count: row.count }),
            equipment: row => ({ item: row.item, itemKind: 'equipment', highlight: row.highlight, unidentified: row.item.rarity === 'unique' }),
            jewel: row => ({ item: row.item, itemKind: 'jewel', color: this.deps.getJewelLootColor(row.item) }),
            core: row => ({ item: row.item, itemKind: 'core' }),
            talisman: row => ({ item: row.item, itemKind: 'talisman', color: this.deps.TALISMAN_RARITY_TONES[row.item.rarity] }),
            stump: row => ({ stump: row.item, itemKind: 'stump', color: this.deps.STUMP_BOX_COLORS[row.item.color].tone }),
            leaf: row => ({ leaf: row.leaf, itemKind: 'leaf', color: this.deps.MEMORY_LEAVES.tone }),
            yarn: row => ({ yarn: row.yarn, itemKind: 'yarn', color: '#d7bb82' }),
            gem: row => ({ gem: row.gem, itemKind: 'gem', color: this.deps.getRarityColor('rare') }),
            rune: row => ({ gem: row.gem.name, itemKind: 'gem', color: this.deps.getRarityColor('rare') })
        };
    }

    momentOf(receipt) { return this.deps.lootMoments.ofReceipt(receipt); }

    isMajor(receipt) { return this.deps.lootMoments.rank(this.momentOf(receipt)) >= 2; }

    importance(receipt) { return this.deps.lootMoments.rank(this.momentOf(receipt)) * 100 + this.deps.getRarityRank(receipt.item?.rarity || 'normal'); }

    pileTier(lead, rarity) {
        const rank = this.deps.lootMoments.rank(this.momentOf(lead));
        if (rank >= 3) return 'jackpot';
        if (rank === 2) return 'major';
        return (rank === 1 && this.fxOn('beams', 'good')) || this.deps.getRarityRank(rarity) >= 2 ? 'rare' : 'plain';
    }

    fxOn(group, key) { return !(this.deps.viewSettings().lootFx && this.deps.viewSettings().lootFx[group] && this.deps.viewSettings().lootFx[group][key] === false); }

    notice(kind, text, tone, duration) { if (this.fxOn('notices', kind)) this.deps.showGameToast(text, { tone, duration }); }

    pileKind(lead, currency) { return currency ? 'currency' : lead.leaf ? 'leaf' : 'equipment'; }

    leadArt(lead) { return lead.yarn ? YARN_ART : lead.leaf ? LEAF_ART : lead.stump ? this.deps.stumpBox.dropIcon(lead.stump) : lead.gem ? this.deps.getSkillGemArtPath(lead.gem) : this.deps.getInventoryItemVisualAsset(lead.item, lead.itemKind); }

    leadName(lead) { return lead.stump ? this.deps.stumpBox.dropName(lead.stump) : lead.yarn ? this.deps._t('실타래 {name}', { name: this.deps.knitting.row(lead.yarn).name }) : lead.leaf ? this.deps.memoryLeaves.leaf(lead.leaf).name : lead.gem ? this.deps._t('[{gem}] 룬', { gem: lead.gem }) : this.shownName(lead); }

    shownName(receipt) { return receipt.unidentified ? `미확인 ${receipt.item.baseName || this.deps.getItemSlotDisplayLabel(receipt.item, '고유')}` : receipt.item.name; }

    currencyRow(label, receipt) {
        label.innerHTML = this.deps.styledCurrency(receipt.currency) + (receipt.count > 1 ? ' ×' + receipt.count : '');
        label.dataset.currency = receipt.currency;
        const tone = label.querySelector('.orb-tone');
        if (tone) label.style.setProperty('--loot-color', tone.style.getPropertyValue('--orb-tone'));
    }

    nameRow(receipt, index) {
        const label = this.deps.document.createElement('span'); label.className = 'battle-loot-name';
        if (this.isMajor(receipt)) label.classList.add('is-major');
        if (receipt.settled) label.classList.add('is-settled');
        label.style.setProperty('--row', String(receipt.settled === false ? 0 : index));
        label.dataset.rarity = receipt.item?.rarity || 'normal';
        label.dataset.moment = this.momentOf(receipt) || '';
        label.style.setProperty('--loot-color', receipt.color || this.deps.getRarityColor(label.dataset.rarity));
        if (receipt.currency) this.currencyRow(label, receipt);
        else label.textContent = this.leadName(receipt);
        if (receipt.leaf) label.dataset.rarity = 'leaf';
        this.deps.itemInfluencesUi.markFrame(label, receipt.item);
        return label;
    }

    labelArms(receipts, narrow) {
        const limits = narrow ? ARM_ROWS.narrow : ARM_ROWS.wide;
        const arms = { up: [], right: [], left: [], down: [] };
        receipts.forEach((receipt, index) => {
            const sides = arms.right.length <= arms.left.length ? ['right', 'left'] : ['left', 'right'];
            const side = ['up', ...sides, 'down'].find(name => arms[name].length < limits[name]);
            if (side) arms[side].push(this.nameRow(receipt, index));
        });
        return ['up', 'right', 'left', 'down'].filter(side => arms[side].length).map(side => {
            const arm = this.deps.document.createElement('div');
            arm.className = side === 'up' ? 'battle-loot-labels' : `battle-loot-labels is-${side}`;
            arms[side].forEach(row => arm.append(row));
            return arm;
        });
    }

    appearance(marker, receipts, narrow) {
        const lead = receipts[0], item = lead.item, currency = lead.currency && this.deps.getCurrencyInfo(lead.currency);
        marker.dataset.rarity = item?.rarity || 'normal';
        marker.dataset.kind = this.pileKind(lead, currency);
        marker.dataset.tier = this.pileTier(lead, marker.dataset.rarity);
        marker.dataset.lead = currency ? currency.name : this.leadName(lead);
        marker.classList.toggle('is-unidentified', !!lead.unidentified);
        if (currency) marker.dataset.currency = lead.currency;
        const arms = this.labelArms(receipts, narrow);
        marker.style.setProperty('--loot-color', arms[0].firstElementChild.style.getPropertyValue('--loot-color'));
        const flight = this.deps.document.createElement('div'); flight.className = 'battle-loot-flight';
        flight.append(this.lootArt(currency ? currency.icon : this.leadArt(lead), item));
        marker.append(flight, ...arms);
        return flight;
    }

    lootArt(src, item) {
        if (src === LEAF_ART) {
            const leaf = this.deps.document.createElement('span'); leaf.className = 'battle-loot-item battle-loot-leaf';
            leaf.innerHTML = this.deps.renderPixelIcon('leaf', 'battle-loot-leaf-icon');
            return leaf;
        }
        if (!src) {
            const glyph = this.deps.document.createElement('span'); glyph.className = 'battle-loot-item battle-loot-glyph';
            return glyph;
        }
        const art = this.deps.document.createElement('img'); art.className = 'battle-loot-item'; art.alt = '';
        art.src = src;
        if (item?.slot === '무기') art.classList.add('weapon');
        return art;
    }

    beam(marker, receipt, height) {
        if (!this.isMajor(receipt) || !this.fxOn('beams', marker.dataset.tier === 'jackpot' ? 'jackpot' : 'great')) return;
        marker.dataset.beam = 'true';
        const pillar = this.deps.document.createElement('div'); pillar.className = 'battle-loot-beam'; marker.prepend(pillar);
        marker.style.setProperty('--beam-height', Math.min(152, height * .36) + 'px');
        if (marker.dataset.tier === 'jackpot') {
            marker.style.setProperty('--beam-color', '#ff5e6c');
            marker.style.setProperty('--beam-core', '#ffe7a3');
            const rays = this.deps.document.createElement('div'); rays.className = 'battle-loot-rays'; marker.prepend(rays);
            return;
        }
        if (receipt.currency === 'burningEmberBranch') {
            marker.style.setProperty('--beam-color', this.deps.EMBER_CORRUPTION_TONE);
            marker.style.setProperty('--beam-core', '#ffe2b8');
        }
        if (receipt.currency !== 'goldenRule') return;
        marker.style.setProperty('--beam-color', '#f7d66a');
        marker.style.setProperty('--beam-core', '#fff7d1');
    }

    floorReceipts(pile, fresh) { return pile.rows.map(row => ({ ...this.floorReceipt[this.deps.floorLoot.kindOf(row)](row), row, settled: !fresh.includes(row) }))
        .sort((a, b) => this.importance(b) - this.importance(a)); }

    restAngle(receipt) { return (receipt.item?.slot === '무기' ? 54 : -16) + 'deg'; }

    fineNote(item) {
        const lines = item.rarity === 'rare' ? this.deps.lootMoments.fineLines(item) : 0;
        return lines >= this.deps.LOOT_OMENS.fineRare.good ? this.deps._t(', 좋은 옵션 {lines}줄', { lines }) : '';
    }
}
