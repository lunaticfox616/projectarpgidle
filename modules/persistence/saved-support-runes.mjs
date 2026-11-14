import { mergeGrownGemRecords } from './legacy-summon-migration.mjs';
import { moved, renamed } from './saved-support-definitions.mjs';

export const list = (value) => Array.isArray(value) ? value : [];

export const record = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const unique = (values) => [...new Set(values)];

export const successor = (name) => moved[name] || renamed[name] || name;

export const summon = (deps, name) => (deps.SKILL_DB[name]?.tags || []).some(tag => ['summon_attack', 'summon_buff', 'summon_guard'].includes(tag));

export const single = (deps, name) => !(deps.SKILL_DB[name]?.tags || []).includes('summon_attack');

export const copy = (value) => JSON.parse(JSON.stringify(value));

export function mergeRecords(deps, a, b, skill) {
        const rows = { a: (0, deps.normalizeGemRecord)(a), b: (0, deps.normalizeGemRecord)(b) };
        const out = (0, deps.normalizeGemRecord)(mergeGrownGemRecords(rows, ['a', 'b']));
        if (skill) { out.unlockedTier = 1; out.activeTier = 1; }
        return out;
    }

export function renameSupports(deps, state) {
        state.supportGemData = { ...record(state.supportGemData) };
        Object.entries(renamed).forEach(([from, to]) => {
            if (!Object.hasOwn(state.supportGemData, from)) return;
            state.supportGemData[to] = mergeRecords(deps, state.supportGemData[to], state.supportGemData[from], false);
            delete state.supportGemData[from];
        });
        ['supports', 'sealedSupports', 'equippedSupports'].forEach(key => {
            state[key] = unique(list(state[key]).map(name => renamed[name] || name));
        });
    }

export function ownedSupportKind(state, name) {
        if (state.supports.includes(name) || state.equippedSupports.includes(name)) return 'owned';
        if (state.sealedSupports.includes(name)) return 'sealed';
        return Object.hasOwn(state.supportGemData, name) ? 'owned' : null;
    }

export function moveOwned(deps, state, name, report) {
        const to = moved[name], source = state.supportGemData[name];
        const holding = ownedSupportKind(state, name);
        if (!holding) return;
        state.gemData[to] = mergeRecords(deps, state.gemData[to], source, true);
        if (holding === 'owned') state.skills.push(to);
        else state.sealedSkills.push(to);
        const tier = name === '수액 골렘 소환' ? 1 : (0, deps.normalizeGemRecord)(source).unlockedTier;
        report.tiers[name] = Math.max(report.tiers[name] || 1, tier);
        delete state.supportGemData[name];
    }

export function migrateLoadout(deps, state) {
        renameSupports(deps, state);
        const equip = state.equippedSupports.filter(name => Object.hasOwn(moved, name)
            && (name.endsWith('전령') || name === '수액 골렘 소환')).map(name => moved[name]);
        const report = { equip, tiers: {} };
        state.skills = list(state.skills).slice(); state.sealedSkills = list(state.sealedSkills).slice();
        state.gemData = { ...record(state.gemData) };
        Object.keys(moved).forEach(name => moveOwned(deps, state, name, report));
        ['supports', 'sealedSupports', 'equippedSupports'].forEach(key => { state[key] = state[key].filter(name => !moved[name]); });
        state.skills = unique(state.skills);
        state.sealedSkills = unique(state.sealedSkills).filter(name => !state.skills.includes(name));
        if (state.activeSkill === '수액 골렘 소환') {
            state.activeSkill = '기본 공격'; report.equip.push('수액 골렘 소환');
        }
        if (state.mobilitySkill === '수액 골렘 소환') state.mobilitySkill = null;
        report.equip = unique(report.equip);
        return report;
    }

export function reward(row) {
        if (!row || row.kind !== 'support') return row;
        if (moved[row.name]) return { kind: 'attack', name: moved[row.name], awakened: row.awakened === true };
        return { ...row, name: successor(row.name) };
    }

export function rewards(rows) {
        const out = [];
        list(rows).map(reward).forEach(row => {
            const held = out.find(other => other?.kind === row?.kind && other?.name === row?.name);
            if (!held) { out.push(row); return; }
            if (row.kind === 'attack') held.awakened = held.awakened || row.awakened;
            if (row.kind === 'support') held.tier = Math.max(held.tier, row.tier);
        });
        return out;
    }

export function renameRows(owner, key) {
        if (!Array.isArray(owner?.[key])) return;
        owner[key] = owner[key].map(row => row?.gem?.kind === 'support' ? { ...row, gem: reward(row.gem) } : row);
    }

export function holdings(state) {
        const run = state.actExploration;
        if (Array.isArray(run?.loot?.gems)) run.loot.gems = rewards(run.loot.gems);
        renameRows(run, 'groundLoot');
        if (state.colony) { state.colony = copy(state.colony); renameRows(state.colony, 'pendingLoot'); }
        if (state.voidRift) { state.voidRift = copy(state.voidRift); renameRows(state.voidRift.grandRun, 'pendingLoot'); }
        if (state.npcShops) {
            state.npcShops = copy(state.npcShops);
            Object.values(record(state.npcShops)).forEach(shop => renameRows(shop, 'offers'));
        }
    }

export function normalizeSupportMigrationReceipt(meta) {
        const previous = record(meta.supportRuneMigration);
        const names = unique(list(previous.moved).filter(name => Object.hasOwn(moved, name)));
        if (!names.length) { delete meta.supportRuneMigration; return; }
        const refund = Number(previous.refund);
        meta.supportRuneMigration = { version: 1, moved: names,
            refund: Number.isFinite(refund) ? Math.min(60, Math.max(0, Math.floor(refund))) : 0,
            noticePending: previous.noticePending === true };
    }

export function migrateLockedLoadout(deps, state, saved) {
        if (!state.woodsmanBuildSnapshot || typeof state.woodsmanBuildSnapshot !== 'object') return null;
        const snapshot = copy(state.woodsmanBuildSnapshot);
        // Earlier locks did not snapshot summon/sealed fields. They kept using the live fields; preserve those on upgrade.
        ['sealedSkills', 'sealedSupports', 'equippedSummonSkills', 'summonSkillCounts'].forEach(key => {
            if (!Object.hasOwn(snapshot, key) && Object.hasOwn(saved, key)) snapshot[key] = copy(saved[key]);
        });
        state.woodsmanBuildSnapshot = snapshot;
        return migrateLoadout(deps, snapshot);
    }

export function migrate(deps, state, saved) {
        normalizeSupportMigrationReceipt(state.saveMeta);
        const root = migrateLoadout(deps, state);
        const locked = migrateLockedLoadout(deps, state, saved);
        holdings(state);
        const tiers = { ...root.tiers };
        Object.entries(locked?.tiers || {}).forEach(([name, tier]) => { tiers[name] = Math.max(tiers[name] || 1, tier); });
        const names = Object.keys(tiers);
        if (names.length) {
            const refund = Object.values(tiers).reduce((sum, tier) => sum + [0, 0, 2, 5][tier], 0);
            const balance = Number(state.currencies.skyEssence);
            state.currencies.skyEssence = (Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0) + refund;
            state.saveMeta.supportRuneMigration = { version: 1, moved: names, refund, noticePending: true };
        }
        return { root, locked };
    }

/** Preserve old summon ordering and counts first; migrated heralds/guards only use genuinely free slots. */
export function finishLoadout(deps, state, cap, hasCounts, candidates) {
        const names = unique(list(state.equippedSummonSkills)).filter(name => summon(deps, name) && state.skills.includes(name));
        const counts = {}, old = record(state.summonSkillCounts);
        let remaining = cap;
        names.forEach(name => {
            const requested = hasCounts && !single(deps, name) ? Math.max(1, Math.floor(Number(old[name]) || 1)) : 1;
            const count = Math.min(remaining, requested);
            if (count > 0) counts[name] = count;
            remaining -= count;
        });
        list(candidates).forEach(name => {
            if (remaining <= 0 || counts[name] || !state.skills.includes(name)) return;
            counts[name] = 1; remaining--;
        });
        const attackers = names.filter(name => !single(deps, name));
        let cursor = 0;
        while (!hasCounts && remaining > 0 && attackers.length) {
            const name = attackers[cursor++ % attackers.length];
            counts[name] = (counts[name] || 0) + 1; remaining--;
        }
        state.equippedSummonSkills = Object.keys(counts); state.summonSkillCounts = counts;
    }
