/** Roll and deliver a kill's rewards in order. Yielded notices never grant rewards a second time.
 * Resume after each notice so unlocks, observers and receipts keep their original timing.
 * Item/content ports not yet migrated use the active game, matching LootDelivery's owner contract. */
const isDeepChaosLootZone = zone => !!zone && zone.type === 'abyss' && Math.max(0, Math.floor(zone.depth || 0)) >= 21;

class KillLoot {
    constructor(delivery, rolls, deps) { this.delivery = delivery; this.rolls = rolls; this.deps = deps; }
    *equipment(state, enemy, zone, minimumRarity, slot) {
        const drop = this.deps.variants.expand(this.deps.generateEquipment(enemy, { minimumRarity, zone, slot }));
        const options = enemy.roomInvader ? { guaranteedKeep: true } : undefined, kept = [];
        const length = drop.items.length;
        for (let index = 0; index < length; index++) {
            const item = drop.items[index];
            if ((yield* this.keepEquipment(state, enemy, item, options)) === 'kept') kept.push(item);
        }
        return kept;
    }
    *keepEquipment(state, enemy, item, options) {
        const result = this.delivery.keepEquipment(state, enemy, item, options);
        if (result.celebrate || result.receipt) yield { action: 'equipmentDelivery', enemy, item, result };
        return result.status;
    }
    *rootWeapon(state, enemy, zone) {
        if (!this.deps.rootWeapon(enemy) || this.deps.random() >= this.deps.rootChance) return [];
        return yield* this.equipment(state, enemy, zone, null, '무기');
    }
    *equipmentLoot(state, enemy, zone, roll) {
        const kept = [];
        for (let index = 0; index < roll.count; index++)
            kept.push(...(yield* this.equipment(state, enemy, zone, index === 0 ? roll.minimumRarity : null)));
        state.equipmentDropProgress = roll.nextProgress;
        kept.push(...(yield* this.rootWeapon(state, enemy, zone)), ...this.deps.wards.rollFieldDrop(enemy, zone));
        return kept[0] || null;
    }
    *realmUnique(state, enemy, zone) {
        const item = this.deps.realmUnique(zone, enemy);
        return item && (yield* this.keepEquipment(state, enemy, item, { guaranteedKeep: true })) ? item : null;
    }
    context(state, enemy, zone) {
        const greed = this.deps.supports.blessingGreed(state);
        enemy.greedDropMul = greed ? 1 + greed.dropPct / 100 : 1;
        return { multiplier: this.deps.contentMultiplier(zone) * enemy.greedDropMul,
            awakening: this.deps.content.isUnlocked('gemAwakening', state),
            deferred: !!this.deps.floor.encounterOwner(state) };
    }
    *roll(state, enemy) {
        const zone = this.deps.zone(state.currentZoneId) || this.deps.zone(0), context = this.context(state, enemy, zone);
        yield* this.echo(state, enemy, context);
        yield* this.rune(state, enemy, context);
        const chances = this.deps.chances(zone, enemy), { drops, gear } = this.rolls.currencyAndGear(enemy, zone, chances.equipment);
        for (const drop of drops) yield* this.currency(state, enemy, drop, context);
        const item = yield* this.equipmentLoot(state, enemy, zone, gear);
        yield* this.realmUnique(state, enemy, zone);
        if (item && state.settings.showLootLog) yield { action: 'equipmentLog', item };
        this.deps.wildTalisman(enemy, chances.talisman);
        yield* this.jewel(state, enemy, context.multiplier);
        const mapping = !!zone && zone.type === 'abyss';
        yield* this.beeLoot(state, enemy, mapping, context);
        if (zone?.type === 'atlasMap' && this.deps.atlasPassives.has(state, 'beeEvents')) yield* this.beeEvent(state, enemy);
        yield* this.hiveKey(state, enemy, mapping, context);
        yield* this.colonyTrace(state, zone, context);
        const yarn = this.delivery.rollYarn(state, enemy, zone);
        if (yarn) yield { action: 'yarn', id: yarn };
        yield* this.guardianFossils(state, enemy, zone, context);
    }
    *echo(state, enemy, context) {
        if (!(this.deps.content.canDropCurrency('awakenedEcho', state) && context.awakening && (enemy.isBoss || enemy.isElite))) return;
        if (this.deps.random() >= (enemy.isBoss ? 0.045 : 0.004) * context.multiplier) return;
        this.delivery.awardCurrency(state, 'awakenedEcho', 1);
        if (state.settings.showLootLog) yield { action: 'echo', deferred: context.deferred };
    }
    *rune(state, enemy, context) {
        if (!(this.deps.random() < (enemy.isBoss ? 0.09 : enemy.isElite ? 0.018 : 0.003) * context.multiplier * this.deps.gemMultiplier(enemy))) return;
        // Public lower-level draw is still observed by the existing drop simulator.
        const reward = this.deps.runeReward(context.awakening, !!enemy.isBoss);
        if (reward.gem && this.delivery.placeRune(state, enemy, reward.gem)) return;
        if (this.deps.floor.encounterOwner(state)) return;
        if (reward.gem) {
            const cap = reward.kind === 'support' ? this.deps.gems.resonanceCap(state, this.deps.stats()) : 0;
            this.deps.gems.grant(state, reward.gem, cap);
            yield { action: 'unlocks' };
        }
        yield { event: 'gem-loot-received', detail: reward };
    }
    *currency(state, enemy, drop, context) {
        if (!drop || !drop[0]) return;
        if (drop[0] === 'core') {
            const core = this.deps.cores.roll();
            if (this.delivery.placeItem(state, enemy, 'core', { item: core })) return;
            this.deps.cores.keep(core, state);
            yield { action: 'receipt', enemy, receipt: { item: core, itemKind: 'core' } };
            yield { event: 'core-item-received', detail: core };
            return;
        }
        const result = yield* this.keepCurrency(state, enemy, drop[0], drop[1]);
        if (result.gain > 0 && !result.floor && state.settings.showLootLog)
            yield { action: 'currencyLog', key: drop[0], amount: result.gain, deferred: context.deferred };
    }
    *keepCurrency(state, enemy, key, count) {
        const result = this.delivery.keepCurrency(state, enemy, key, count);
        if (result.receipt) yield { action: 'receipt', enemy, receipt: result.receipt };
        return result;
    }
    *jewel(state, enemy, multiplier) {
        if (!(this.deps.content.isUnlocked('jewel', state) && (state.season || 1) >= 5 && (enemy.isElite || enemy.isBoss)
            && this.deps.random() < 0.0056 * multiplier)) return;
        const jewel = this.deps.generateJewel(this.deps.zone(state.currentZoneId) || { type: 'act', storyOrder: 1 });
        if (this.delivery.placeItem(state, enemy, 'jewel', { item: jewel })) return;
        const receipt = this.deps.receiveJewel(jewel);
        if (receipt.stored) yield { action: 'jewelReceipt', enemy, jewel };
        yield { event: 'jewel-drop-received', detail: receipt };
    }
    *beeLoot(state, enemy, mapping, context) {
        if (!(state.beehive?.unlockedPermanent && mapping && !enemy.isBoss)) return;
        const gains = [];
        const pollen = yield* this.pollen(state, enemy);
        if (pollen) gains.push(pollen);
        if (enemy.isElite) gains.push(...this.eliteBeeLoot(state));
        if (state.settings.showLootLog) for (const gain of gains) yield { action: 'beeLoot', ...gain, deferred: context.deferred };
    }
    *pollen(state, enemy) {
        if (this.deps.random() >= 0.015) return null;
        const amount = enemy.isElite ? 2 : 1;
        return (yield* this.keepCurrency(state, enemy, 'pollen', amount)).floor ? null : { key: 'pollen', amount };
    }
    eliteBeeLoot(state) {
        const gains = [];
        for (const [key, chance] of [['venomStinger', 0.0048], ['enchantedHoney', 0.00064], ['beeswax', 0.0032]]) {
            if (this.deps.random() >= chance) continue;
            this.delivery.awardCurrency(state, key, 1); gains.push({ key, amount: 1 });
        }
        return gains;
    }
    *beeEvent(state, enemy) {
        if (!enemy || enemy.isBoss || (state.currencies.pollen || 0) < 10) return;
        if (this.deps.random() >= (enemy.isElite ? 0.012 : 0.0025)) return;
        state.currencies.pollen = Math.max(0, (state.currencies.pollen || 0) - 10);
        yield* this.beeEventRewards(this.deps.random());
    }
    *beeEventRewards(roll) {
        if (roll < 0.08) {
            this.deps.awardCurrency('pollen', 25); this.deps.awardCurrency('enchantedHoney', 1); this.deps.awardCurrency('beeswax', 2);
            yield { action: 'beeEvent', kind: 'queen' };
        } else if (roll < 0.28) {
            this.deps.awardCurrency('venomStinger', 1);
            if (this.deps.random() < 0.35) this.deps.awardCurrency('beeswax', 1);
            yield { action: 'beeEvent', kind: 'sting' };
        } else if (roll < 0.55) {
            this.deps.awardCurrency('pollen', 15); this.deps.awardCurrency('beeswax', 1);
            yield { action: 'beeEvent', kind: 'bumble' };
        } else {
            this.deps.awardCurrency('pollen', 8); yield { action: 'beeEvent', kind: 'worker' };
        }
    }
    *hiveKey(state, enemy, mapping, context) {
        if (!((state.season || 1) >= 8 && mapping && this.deps.random() < (enemy.isBoss ? 0.005 : enemy.isElite ? 0.0015 : 0.0002))) return;
        this.delivery.awardCurrency(state, 'hiveKey', 1);
        if (state.settings.showLootLog) yield { action: 'hiveKey', deferred: context.deferred };
    }
    *colonyTrace(state, zone, context) {
        const deep = isDeepChaosLootZone(zone);
        if (!((state.season || 1) >= 15 && (deep || state.currentZoneId === 'beehive_run' || state.currentZoneId === 'grand_breach_run'))) return;
        const chance = deep ? 0.00075 : state.currentZoneId === 'grand_breach_run' ? 0.001125 : 0.0005;
        if (this.deps.random() >= chance) return;
        this.delivery.awardCurrency(state, 'colonyTrace', 1);
        yield { action: 'trace', deferred: context.deferred };
    }
    *guardianFossils(state, enemy, zone, context) {
        const rolled = this.rolls.guardianFossils(state, enemy, zone);
        if (!rolled) return;
        const { floor, keys } = rolled;
        for (const key of keys) yield* this.keepCurrency(state, enemy, key, 1);
        if (keys.includes('fossilAbyssal')) yield { action: 'fossil', deferred: context.deferred };
        const currencies = {};
        for (const key of keys) currencies[key] = (currencies[key] || 0) + 1;
        state.labyrinthLastResult = { season: state.season, floor, pending: true, currencies };
    }
}

export const createKillLoot = (delivery, rolls, deps) => new KillLoot(delivery, rolls, deps);
