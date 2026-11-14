import { COSMOS_STONE_TIER_FLOORS } from '../data/cosmos-atlas.mjs';

/** Native atlas stones; no DOM or renderer dependency. */
export class CosmosAtlasStones {
    constructor(deps, services) { this.deps = deps; this.state = services.state; }

    getCosmosTierFloor(state = this.state.getState()) {
        const count = Math.max(0, Math.min(5, this.state.getEquippedCosmosStoneCount(state)));
        return COSMOS_STONE_TIER_FLOORS[count] || 1;
    }

    getCosmosStonePool(galaxy) {
        const pools = this.deps.COSMOS_BOSS_STONE_OPTION_POOLS || {};
        return pools[String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))))] || null;
    }

    rollCosmosStoneOption(galaxy, bossOption) {
        const pool = this.getCosmosStonePool(galaxy);
        const source = pool ? (bossOption ? pool.bossOptions : pool.options) : [];
        if (!Array.isArray(source) || source.length <= 0) return null;
        const row = source[Math.floor(Math.random() * source.length)];
        const min = Number(row.min || 0);
        const max = Number(row.max || min);
        const value = min === max ? min : Number((min + Math.random() * (max - min)).toFixed(2));
        return { stat: row.stat, value, min, max, label: row.label || row.stat, boss: !!bossOption };
    }

    ensureCosmosStoneOptions(state, galaxy) {
        const g = String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))));
        state.bossStoneOptions = state.bossStoneOptions && typeof state.bossStoneOptions === 'object' ? state.bossStoneOptions : {};
        if (!Array.isArray(state.bossStoneOptions[g])) {
            state.bossStoneOptions[g] = [this.rollCosmosStoneOption(g, false), this.rollCosmosStoneOption(g, false), this.rollCosmosStoneOption(g, false)].filter(Boolean);
        }
        while (state.bossStoneOptions[g].length < 3) {
            const option = this.rollCosmosStoneOption(g, false);
            if (option) state.bossStoneOptions[g].push(option);
            else break;
        }
        state.bossStoneOptions[g] = state.bossStoneOptions[g].slice(0, 3);
        return state.bossStoneOptions[g];
    }

    getCosmosStoneOptionText(option) {
        if (!option) return '빈 옵션';
        const value = Number(option.value || 0);
        const sign = value > 0 ? '+' : '';
        return this.deps._t('{value}{label} {sign}{value2} (범위 {min}~{max})', { value: option.boss ? '👑 ' : '', label: option.label || option.stat, sign, value2: value, min: option.min, max: option.max });
    }

    getCosmosStoneNameByGalaxy(galaxy) {
        const pool = this.getCosmosStonePool(galaxy);
        return pool && pool.name ? pool.name : this.deps._t('G{galaxy} 우주석', { galaxy });
    }

    findCosmosBossRelicIndexForStone(relics, galaxy) {
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        if (g === 6) return relics.findIndex(relic => relic && relic.rerollStoneOption);
        return relics.findIndex(relic => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) === g);
    }

    cosmosRelicBlockReason(state, galaxy) {
        if (!this.state.isCosmosStoneAcquired(state, galaxy)) return '먼저 해당 우주석을 획득해야 합니다.';
        if (!Array.isArray(state.bossRelics) || state.bossRelics.length <= 0) return '사용할 보스 유물이 없습니다.';
        return '';
    }

    *applyCosmosBossRelicToStone(galaxy) {
        const state = this.state.getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        const blocked = this.cosmosRelicBlockReason(state, g);
        if (blocked) return this.deps.canLog && (yield { kind: 'addLog', args: [blocked, 'attack-monster'] });
        const relicIndex = this.findCosmosBossRelicIndexForStone(state.bossRelics, g);
        if (relicIndex < 0) return this.deps.canLog && (yield { kind: 'addLog', args: ['해당 우주석에 사용할 보스 유물이 없습니다.', 'attack-monster'] });
        const options = this.ensureCosmosStoneOptions(state, g);
        const idx = Math.max(0, Math.min(2, Math.floor(Math.random() * 3)));
        const next = this.rollCosmosStoneOption(g, true);
        if (!next) return;
        state.bossRelics.splice(relicIndex, 1);
        options[idx] = next;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('💠 {g} 보스 옵션 리롤: {next}', { g: this.getCosmosStoneNameByGalaxy(g), next: this.getCosmosStoneOptionText(next) }), 'loot-unique'] });
        if (this.deps.canRefresh) (yield { kind: 'updateStaticUI', args: [] });
        (yield { kind: 'renderCosmosAtlas', args: [] });
    }

    getBossStoneName(node) {
        const theme = String((node && node.theme) || '');
        if (theme.includes('백색')) return '백성핵석';
        if (theme.includes('보호막')) return '장막핵석';
        if (theme.includes('블랙홀')) return '중력핵석';
        if (theme.includes('성운')) return '성운핵석';
        if (theme.includes('황혼') || theme.includes('붕괴')) return '붕괴핵석';
        return '우주석';
    }

    *equipBossStoneByGalaxy(galaxy) {
        const state = this.state.getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        const stone = this.getCosmosStoneNameByGalaxy(g);
        if (!this.state.isCosmosStoneAcquired(state, g)) {
            if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('은하 {g} 우주석이 없습니다.', { g }), 'attack-monster'] });
            return;
        }
        if (state.equippedStones[String(g)]) return;
        this.ensureCosmosStoneOptions(state, g);
        state.equippedStones[String(g)] = true;
        state.equippedStoneGalaxy = this.state.getEquippedCosmosStoneCount(state);
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('💠 {stone} 장착: 우주계 최소 Tier {cosmosTierFloor} 적용', { stone, cosmosTierFloor: this.getCosmosTierFloor() }), 'season-up'] });
        (yield { kind: 'renderCosmosAtlas', args: [] });
    }

    *unequipBossStoneByGalaxy(galaxy) {
        const state = this.state.getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        delete state.equippedStones[String(g)];
        state.equippedStoneGalaxy = this.state.getEquippedCosmosStoneCount(state);
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('💠 {g} 해제', { g: this.getCosmosStoneNameByGalaxy(g) }), 'season-up'] });
        (yield { kind: 'renderCosmosAtlas', args: [] });
    }
}
