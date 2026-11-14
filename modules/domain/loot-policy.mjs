import { clampNumber } from '../common/numbers.mjs';
const boolMap = (keys, raw, fallback) => Object.fromEntries(keys.map(key => [key, typeof (raw && raw[key]) === 'boolean' ? raw[key] : fallback[key] !== false]));
const PICK_GROUPS = Object.freeze({
    rarity: settings => settings.itemFilterRarities, slot: settings => settings.itemFilterSlots,
    weapon: settings => settings.itemFilterWeaponCategories, always: settings => settings.itemFilterAlways,
    beams: settings => settings.lootFx.beams, notices: settings => settings.lootFx.notices
});

/** The same normalized pickup targets and retained-item highlights; read state explicitly. */
class EquipmentLootPolicy {
    constructor(tables, deps) { this.tables = tables; this.deps = deps; }
    statOptions() {
        const ids = new Set(this.tables.MOD_DB.flatMap(mod => [mod.statId || mod.id,
            ...(mod.compound || []).map(stat => stat.statId || stat.id)]));
        return [...ids].filter(Boolean).map(id => ({ id, name: this.deps.getStatName(id) }))
            .sort((a, b) => a.name.localeCompare(b.name, this.deps.i18n.locale));
    }
    tagOptions() {
        return Object.entries(this.tables.AFFIX_TAG_LABELS).map(([id, name]) => ({ id, name }));
    }
    normalizeRule(rule, validIds) {
        if (!rule || !Number.isFinite(rule.minTier)) return null;
        const minTier = clampNumber(Math.floor(Number(rule.minTier)), 0, 20);
        if (typeof rule.tag === 'string') {
            return this.tables.AFFIX_TAG_LABELS[rule.tag] && Number.isFinite(rule.minCount)
                ? { tag: rule.tag, minCount: clampNumber(Math.floor(Number(rule.minCount)), 1, 6), minTier } : null;
        }
        return validIds.has(rule.statId) && Number.isFinite(rule.minValue) ? { statId: rule.statId, minValue: Math.max(0, Number(rule.minValue)), minTier } : null;
    }
    ruleKey(rule) {
        return rule.tag ? 'tag:' + rule.tag : rule.statId;
    }
    normalizeTargets(input) {
        const source = input && typeof input === 'object' ? input : {};
        const validIds = new Set(this.statOptions().map(stat => stat.id));
        const seen = new Set();
        const rules = (Array.isArray(source.rules) ? source.rules : []).map(rule => this.normalizeRule(rule, validIds)).filter(rule => {
            if (!rule || seen.has(this.ruleKey(rule))) return false;
            seen.add(this.ruleKey(rule));
            return true;
        }).slice(0, 6);
        return { enabled: source.enabled === true, slot: this.tables.EQUIPMENT_DROP_SLOTS.includes(source.slot) ? source.slot : 'any',
            scope: source.scope === 'all' ? 'all' : 'explicit',
            minMatches: clampNumber(Math.floor(Number(source.minMatches) || 1), 1, Math.max(1, rules.length)), rules };
    }
    normalizeSettings(settings) {
        settings.autoSalvageEnabled = !!settings.autoSalvageEnabled;
        settings.autoSalvageRarities = { ...this.deps.defaults.settings.autoSalvageRarities, ...settings.autoSalvageRarities };
        settings.itemFilterRarities = { ...this.deps.defaults.settings.itemFilterRarities, ...settings.itemFilterRarities };
        settings.itemFilterMinHiddenTier = clampNumber(Math.floor(Number(settings.itemFilterMinHiddenTier) || 1), 1, 20);
        settings.itemFilterTierThreshold = clampNumber(Math.floor(Number(settings.itemFilterTierThreshold) || 10), 1, 20);
        settings.itemFilterMinTierCount = clampNumber(Math.floor(Number(settings.itemFilterMinTierCount) || 0), 0, 6);
        settings.equipmentTargets = this.normalizeTargets(settings.equipmentTargets);
        this.normalizePickupDetail(settings);
    }
    normalizePickupDetail(settings) {
        const defaults = this.deps.defaults.settings, rarities = Object.keys(this.tables.ITEM_RARITY_LABELS), tiers = settings.itemFilterMinTiers || {};
        const legacy = rarities.every(key => !(Number(tiers[key]) > 1)) ? settings.itemFilterMinHiddenTier : null;
        settings.itemFilterMinTiers = Object.fromEntries(rarities.map(key => [key, clampNumber(Math.floor(Number(legacy || tiers[key]) || 1), 1, 20)]));
        settings.itemFilterMinHiddenTier = 1;
        settings.itemFilterSlots = boolMap(this.tables.EQUIPMENT_DROP_SLOTS, settings.itemFilterSlots, defaults.itemFilterSlots);
        settings.itemFilterWeaponCategories = boolMap(Object.keys(this.tables.WEAPON_CATEGORIES), settings.itemFilterWeaponCategories, defaults.itemFilterWeaponCategories);
        settings.itemFilterAlways = boolMap(Object.keys(defaults.itemFilterAlways), settings.itemFilterAlways, defaults.itemFilterAlways);
        const fx = settings.lootFx || {};
        settings.lootFx = { beams: boolMap(Object.keys(defaults.lootFx.beams), fx.beams, defaults.lootFx.beams),
            notices: boolMap(Object.keys(defaults.lootFx.notices), fx.notices, defaults.lootFx.notices) };
    }
    pickupPreset(key, zone) {
        const preset = this.tables.ITEM_PICKUP_PRESETS[key];
        if (!preset) return null;
        const tierFloor = preset.tierBelowZoneCap ? Math.max(1, this.deps.getZoneEquipmentTierCap(zone) - preset.tierBelowZoneCap) : 1;
        return { itemFilterEnabled: true, itemFilterRarities: { ...preset.rarities }, itemFilterMinHiddenTier: 1, itemFilterMinTierCount: 0,
            itemFilterMinTiers: { normal: tierFloor, magic: tierFloor, rare: tierFloor, unique: tierFloor },
            itemFilterOnlyNewCodexUnique: !!preset.onlyNewCodexUnique };
    }
    targetLines(item, scope) {
        const stats = item.stats || [];
        return (scope === 'all' ? stats.concat(item.baseStats || [], item.underEnchant || []) : stats).filter(Boolean);
    }
    pickGroup(settings, group) {
        return Object.hasOwn(PICK_GROUPS, group) ? PICK_GROUPS[group](settings) : null;
    }
    togglePick(settings, group, key) {
        const map = this.pickGroup(settings, group);
        if (!map || !Object.hasOwn(map, key)) return false;
        map[key] = map[key] === false;
        return true;
    }
    updatePickup(settings, input) {
        const tiers = input.itemFilterMinTiers;
        if (!Number.isFinite(input.itemFilterTierThreshold) || !Number.isFinite(input.itemFilterMinTierCount)) return false;
        if (!tiers || Object.keys(this.tables.ITEM_RARITY_LABELS).some(key => !Number.isFinite(tiers[key]))) return false;
        const next = { ...settings, itemFilterEnabled: input.itemFilterEnabled === true,
            itemFilterOnlyNewCodexUnique: input.itemFilterOnlyNewCodexUnique === true,
            itemFilterMinTiers: { ...tiers },
            itemFilterTierThreshold: clampNumber(Math.floor(input.itemFilterTierThreshold), 1, 20),
            itemFilterMinTierCount: clampNumber(Math.floor(input.itemFilterMinTierCount), 0, 6) };
        this.normalizePickupDetail(next);
        Object.assign(settings, next);
        return true;
    }
    applyPreset(settings, key, zone) {
        const patch = this.pickupPreset(key, zone);
        if (!patch) return false;
        const next = { ...settings, ...patch };
        this.normalizeSettings(next);
        Object.assign(settings, next);
        return true;
    }
    updateTargets(settings, input) {
        if (!Array.isArray(input.rules) || input.rules.some(rule => !rule)) return false;
        if (new Set(input.rules.map(rule => this.ruleKey(rule))).size !== input.rules.length) return false;
        settings.equipmentTargets = this.normalizeTargets(input);
        return true;
    }
    addTarget(settings, kind) {
        const filter = settings.equipmentTargets;
        if (filter.rules.length >= 6 || !['stat', 'tag'].includes(kind)) return false;
        const field = kind === 'tag' ? 'tag' : 'statId';
        const options = kind === 'tag' ? this.tagOptions() : this.statOptions();
        const option = options.find(row => !filter.rules.some(rule => rule[field] === row.id));
        if (!option) return false;
        const rule = kind === 'tag' ? { tag: option.id, minCount: 2, minTier: 0 } : { statId: option.id, minValue: 0, minTier: 0 };
        filter.rules = [...filter.rules, rule];
        return true;
    }
    removeTarget(settings, index) {
        const filter = settings.equipmentTargets;
        if (!Number.isInteger(index) || index < 0 || index >= filter.rules.length) return false;
        settings.equipmentTargets = this.normalizeTargets({ ...filter, rules: filter.rules.filter((_, i) => i !== index) });
        return true;
    }
    targetStats(lines) {
        return lines.flatMap(stat => [stat, ...(stat.extraStats || []).map(extra => ({ ...extra, tier: stat.tier }))]);
    }
    lineMatchesRule(stat, rule) {
        if (!stat || Number(stat.tier || 0) < rule.minTier) return false;
        return rule.tag ? this.deps.getAffixTags(stat).includes(rule.tag) : stat.id === rule.statId && Number(stat.val) >= rule.minValue;
    }
    ruleMet(rule, lines, expanded) {
        return rule.tag ? lines.filter(line => this.lineMatchesRule(line, rule)).length >= rule.minCount : expanded.some(stat => this.lineMatchesRule(stat, rule));
    }
    matches(item, targetGame) {
        const filter = targetGame.settings && targetGame.settings.equipmentTargets;
        if (!filter || !filter.enabled || !filter.rules.length || !item) return false;
        if (filter.slot !== 'any' && filter.slot !== item.slot) return false;
        const lines = this.targetLines(item, filter.scope), expanded = this.targetStats(lines);
        return filter.rules.filter(rule => this.ruleMet(rule, lines, expanded)).length >= filter.minMatches;
    }
    highlight(item, targetGame) {
        if (item.rarity === 'unique' && (targetGame.uniqueHuntTargets || []).includes(this.deps.getUniqueCodexKeyByItem(item))) return { reason: this.deps.translate('목표 고유 획득'), color: '#7fffd2', priority: 3 };
        if (this.matches(item, targetGame)) return { reason: this.deps.translate('목표 옵션 일치'), color: '#7fffd2', priority: 3 };
        if (item.rarity === 'unique') return { reason: this.deps.translate('고유 장비 획득'), color: '#ffbb69', priority: 2 };
        if (item.exceptionalBase) return { reason: this.deps.translate('특출 베이스 발견'), color: '#f3d779', priority: 1 };
        if (item.corrupted) return { reason: this.deps.translate('타락 장비 발견'), color: '#e7685c', priority: 1 };
        return null;
    }
    ownedItems(state) {
        const equipped = this.deps.getEquipmentLoadoutOwnedItems(state);
        const stash = state.offlineProgress || {};
        return [...new Set(equipped.concat(stash.stash || [], stash.protectedOverflow || []))];
    }
    collectHighlights(before, after) {
        const beforeIds = new Set(this.ownedItems(before).map(item => String(item.id)));
        const seen = new Set();
        const rows = [];
        for (const item of this.ownedItems(after)) {
            const id = String(item.id);
            if (beforeIds.has(id) || seen.has(id)) continue;
            seen.add(id);
            const info = this.highlight(item, before);
            if (!info) continue;
            const inStash = (after.offlineProgress?.stash || []).includes(item);
            const worn = Object.values(after.equipment || {}).includes(item); // 빈 칸에 자동으로 입었다(검토 6차)
            rows.push({ id: item.id, name: item.name, rarity: item.rarity, slot: item.slot, location: inStash ? '방치 보관함' : worn ? '자동 착용' : '장비창', ...info });
        }
        rows.sort((a, b) => b.priority - a.priority);
        return { items: rows.slice(0, 5), total: rows.length };
    }
}
export const createEquipmentLootPolicy = (tables, deps) => new EquipmentLootPolicy(tables, deps);
