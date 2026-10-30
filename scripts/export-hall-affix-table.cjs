#!/usr/bin/env node
'use strict';
/**
 * 전당의 추가 옵션 표를 SQL로 내보낸다(2026-10-30). 게임이 굴릴 수 있는 추가 옵션 한 줄의 (능력치 id, 티어, 값 범위, 슬롯)을
 * public.hall_affix_table 행으로 적어, 서버의 전당 등록 검사(db/equipment-hall.sql validate_hall_item → hall_affix_table_rejects)가
 * 장비가 스스로 들고 온 valMin/valMax 대신 이 표를 믿게 한다.
 *
 * 출처(게임을 node vm에 올려 실제 굴림 함수 getAffixTierRange로 계산한다, scripts/lib/game-runtime.js):
 *   MOD_DB(js/state.js; 지역 전용 줄 data/region-affixes.js, 영향 전용 줄 data/item-influences.js, 무기 대분류 줄 포함) 티어마다 한 행,
 *   FOSSIL_EXCLUSIVE_MODS(화석 전용 줄, base/step) 티어 1~20(내림과 반올림 굴림의 합집합),
 *   OCEAN_WORKBENCH_OPTIONS(바다의 작업대 고정 줄, js/passives.js) 티어 5 한 행(모든 슬롯).
 *   복합 옵션의 둘째 수치(extraStats)는 표에 넣지 않는다(서버도 그 줄은 기존 범위 검사로 본다).
 *
 * 베이스 옵션 표(2026-10-30, db/hall-base-table-20261030.sql)도 같이 쓴다: BASE_ITEM_DB의 베이스마다 그 줄의 굴림 범위(baseStatRollBounds)를
 *   public.hall_base_table(base_id, stat_id → min_val, max_val) 행으로 적어, 범위를 빼고 저장한 장비(js/item-save-slim.js)의 베이스 줄을
 *   서버가 이 표로 검사한다(db/anti-cheat.sql hall_item_out_of_range, db/equipment-hall.sql hall_roll_quality).
 *
 * 사용: node scripts/export-hall-affix-table.cjs            → db/hall-affix-table-20261030.sql과 db/hall-base-table-20261030.sql을 다시 쓴다
 *       node scripts/export-hall-affix-table.cjs --check    → 두 파일이 지금 게임과 같은지만 본다(종료 코드 1 = 다르다)
 * MOD_DB나 화석 전용 줄, 바다의 작업대 줄, BASE_ITEM_DB를 고치면 다시 돌리고, 사용자가 그 SQL을 Supabase SQL Editor에서 다시 실행한다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'db', 'hall-affix-table-20261030.sql');
const BASE_OUTPUT = path.join(ROOT, 'db', 'hall-base-table-20261030.sql');
const ALL_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'];
const ROWS_PER_INSERT = 200;

/** A numeric literal without exponent or float noise (0.1 steps are stored as 0.1, not 0.1000000001). */
function literal(value) {
    return String(Number(Number(value).toFixed(4)));
}

function sqlText(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
}

/** One row per tier of a listed (tierValues) mod, as the game rolls it. */
function listedRows(mod, getAffixTierRange) {
    const statId = mod.statId || mod.id;
    return mod.tierValues.map((unused, index) => {
        const range = getAffixTierRange(mod, statId, index + 1);
        return { modId: mod.id, statId, tier: index + 1, min: range.min, max: range.max, slots: mod.slots };
    });
}

/** Tiers 1~20 of a base/step mod; a drop may round either way (getAffixTierRange roundInteger), so both are allowed. */
function steppedRows(mod, getAffixTierRange) {
    const statId = mod.statId || mod.id;
    return Array.from({ length: 20 }, (unused, index) => {
        const floor = getAffixTierRange(mod, statId, index + 1, false), round = getAffixTierRange(mod, statId, index + 1, true);
        return { modId: mod.id, statId, tier: index + 1, min: Math.min(floor.min, round.min), max: Math.max(floor.max, round.max), slots: mod.slots };
    });
}

/** The bench line as applySeaGiftBenchOption stores it: tier 5, whole-number ends, on any slot. */
function oceanRows(options) {
    return options.map(option => ({ modId: option.id, statId: option.statId, tier: 5, min: Math.floor(option.min), max: Math.floor(option.max), slots: ALL_SLOTS }));
}

function collectRows() {
    const context = buildGameRuntime();
    const read = name => vm.runInContext(name, context);
    const getAffixTierRange = read('getAffixTierRange');
    const rows = [
        ...read('MOD_DB').flatMap(mod => listedRows(mod, getAffixTierRange)),
        ...read('FOSSIL_EXCLUSIVE_MODS').flatMap(mod => steppedRows(mod, getAffixTierRange)),
        ...oceanRows(read('OCEAN_WORKBENCH_OPTIONS'))
    ];
    const keys = new Set();
    for (const row of rows) {
        const key = row.modId + '#' + row.tier;
        if (keys.has(key)) throw new Error('같은 (mod_id, tier)가 두 번 나왔다: ' + key);
        keys.add(key);
        if (!(row.min <= row.max) || !row.slots.length) throw new Error('범위나 슬롯이 비었다: ' + key);
    }
    return rows;
}

/** One row per base line of every base, with the bounds rollBaseStat writes (js/passives.js baseStatRollBounds), low end first
 * (a negative base such as 균열유리 로브's 생명력 -40 rolls with its ends reversed). */
function collectBaseRows() {
    const context = buildGameRuntime();
    const read = name => vm.runInContext(name, context);
    const bounds = read('baseStatRollBounds');
    const rows = read('BASE_ITEM_DB').flatMap(base => (base.baseStats || []).map(stat => {
        const range = bounds(stat);
        return { baseId: base.id, statId: stat.id, min: Math.min(range.min, range.max), max: Math.max(range.min, range.max) };
    }));
    const keys = new Set();
    for (const row of rows) {
        const key = row.baseId + '#' + row.statId;
        if (keys.has(key)) throw new Error('같은 (base_id, stat_id)가 두 번 나왔다: ' + key);
        keys.add(key);
        if (!(row.min <= row.max)) throw new Error('범위가 비었다: ' + key);
    }
    return rows;
}

function baseRowLiteral(row) {
    return '(' + [sqlText(row.baseId), sqlText(row.statId), literal(row.min), literal(row.max)].join(', ') + ')';
}

function renderBaseSql(rows) {
    const lines = [
        '-- 전당 베이스 옵션 표(2026-10-30). scripts/export-hall-affix-table.cjs가 게임 데이터에서 만든 파일이라 손으로 고치지 않는다.',
        '-- 적용: db/item-save-slim-20261030.sql(표와 검사 함수를 만든다)을 먼저 실행한 뒤, 이 파일 내용을 Supabase SQL Editor에 붙여 넣고 Run.',
        '--   표를 비우고 다시 채우므로 여러 번 실행해도 같다. 게임의 베이스(BASE_ITEM_DB)가 바뀌면 다시 만들어 다시 실행한다.',
        '--   한 묶음이라 중간에 실패하면 표는 이전 그대로다. 표가 비어 있는 동안 베이스 줄은 장비가 들고 온 범위로만 검사하는데, saveVersion 20',
'--   세이브의 베이스 줄은 범위를 들고 오지 않으므로 그동안은 값 천만·티어 20 검사만 받는다(거절은 없다).',
        '-- 행: ' + rows.length + '개.',
        '',
        'begin;',
        '',
        'create table if not exists public.hall_base_table (',
        '    base_id text not null,',
        '    stat_id text not null,',
        '    min_val numeric not null,',
        '    max_val numeric not null,',
        '    primary key (base_id, stat_id)',
        ');',
        'alter table public.hall_base_table enable row level security;',
        'revoke all on public.hall_base_table from anon, authenticated;',
        '',
        'truncate table public.hall_base_table;',
        ''
    ];
    for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
        lines.push('insert into public.hall_base_table (base_id, stat_id, min_val, max_val) values');
        lines.push(rows.slice(start, start + ROWS_PER_INSERT).map(row => '    ' + baseRowLiteral(row)).join(',\n') + ';');
        lines.push('');
    }
    lines.push('commit;', '');
    return lines.join('\n');
}

function rowLiteral(row) {
    const slots = 'array[' + row.slots.map(sqlText).join(',') + ']::text[]';
    return '(' + [sqlText(row.modId), sqlText(row.statId), row.tier, literal(row.min), literal(row.max), slots].join(', ') + ')';
}

function renderSql(rows) {
    const lines = [
        '-- 전당 추가 옵션 표(2026-10-30). scripts/export-hall-affix-table.cjs가 게임 데이터에서 만든 파일이라 손으로 고치지 않는다.',
        '-- 적용: db/hall-watch-20261030.sql(표와 검사 함수를 만든다)을 먼저 실행한 뒤, 이 파일 내용을 Supabase SQL Editor에 붙여 넣고 Run.',
        '--   표를 비우고 다시 채우므로 여러 번 실행해도 같다. 게임의 추가 옵션(MOD_DB, 화석 전용 줄, 바다의 작업대 줄)이 바뀌면 다시 만들어 다시 실행한다.',
        '--   한 묶음이라 중간에 실패하면 표는 이전 그대로다. 표가 비어 있는 동안 전당 등록 검사는 예전 범위 검사만 한다.',
        '-- 행: ' + rows.length + '개.',
        '',
        'begin;',
        '',
        'create table if not exists public.hall_affix_table (',
        '    mod_id  text not null,',
        '    stat_id text not null,',
        '    tier    integer not null check (tier between 1 and 20),',
        '    min_val numeric not null,',
        '    max_val numeric not null,',
        '    slots   text[] not null,',
        '    primary key (mod_id, tier)',
        ');',
        'create index if not exists hall_affix_table_stat_idx on public.hall_affix_table (stat_id);',
        'alter table public.hall_affix_table enable row level security;',
        'revoke all on public.hall_affix_table from anon, authenticated;',
        '',
        'truncate table public.hall_affix_table;',
        ''
    ];
    for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
        lines.push('insert into public.hall_affix_table (mod_id, stat_id, tier, min_val, max_val, slots) values');
        lines.push(rows.slice(start, start + ROWS_PER_INSERT).map(row => '    ' + rowLiteral(row)).join(',\n') + ';');
        lines.push('');
    }
    lines.push('commit;', '');
    return lines.join('\n');
}

function writeOrCheck(output, sql, what) {
    const name = path.relative(ROOT, output).replace(/\\/g, '/');
    if (process.argv.includes('--check')) {
        const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') : '';
        if (current !== sql) {
            console.error(name + '이 지금 게임의 ' + what + '과 다르다: node scripts/export-hall-affix-table.cjs 로 다시 만든다');
            process.exit(1);
        }
        console.log(name + '은 지금 게임과 같다');
        return;
    }
    fs.writeFileSync(output, sql);
    console.log('wrote ' + name + ' (' + sql.split('\n').length + ' lines)');
}

function main() {
    writeOrCheck(OUTPUT, renderSql(collectRows()), '추가 옵션');
    writeOrCheck(BASE_OUTPUT, renderBaseSql(collectBaseRows()), '베이스 옵션');
}

main();
