// 클라우드 저장 DB 정리(2026-10-03, Supabase 무료 플랜). SQL은 여기서 실행할 수 없어 글자로 확인한다.
// 세이브는 보안 정의자 함수로만 쓰고(직접 쓰기 권한을 거둠), 세이브 하나는 8MiB까지, 이전 기록은 약 30분 간격으로 2개,
// 전당 가방 한도는 클라이언트와 같은 칸 수(예전에는 지워진 inventoryExpandLevel을 읽어 늘 30이었다).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
const sqlFiles = fs.readdirSync(path.join(ROOT, 'db')).filter(name => name.endsWith('.sql'));

// 함수 본문은 $$로 감싼다. 이 작업의 첫 시도에서 편집 스크립트가 $$를 $로 바꿔 함수가 깨졌다.
for (const name of sqlFiles) {
    const sql = read(`db/${name}`);
    assert.strictEqual((sql.match(/\$\$/g) || []).length % 2, 0, `${name}: every $$ quote is closed`);
    assert.ok(!/^\$;|\bas \$\s*$/m.test(sql), `${name}: no $ left over from a broken $$`);
    assert.ok(!/create policy[^;]*on public\.cloud_saves\s+for (insert|update|delete|all)\b/i.test(sql),
        `${name}: no policy lets a player write cloud_saves directly`);
}

function functionBlock(sql, name) {
    const start = sql.indexOf(`create or replace function public.${name}(`);
    assert.ok(start >= 0, `${name} is defined`);
    const open = sql.indexOf('$$', start), close = sql.indexOf('$$', open + 2);
    return sql.slice(start, close + 3);
}

const cloud = read('db/cloud-and-playtest.sql');
const ops = read('db/operations-and-ghost.sql');
const hall = read('db/equipment-hall.sql');
const bundle = read('db/save-limits-20261003.sql');
const READ_ONLY = 'revoke all on public.cloud_saves from anon, authenticated;\ngrant select on public.cloud_saves to authenticated;';
assert.ok(cloud.includes(READ_ONLY) && bundle.includes(READ_ONLY), 'players can only read cloud_saves (their own row, by policy)');
for (const policy of ['cloud_saves_insert_own', 'cloud_saves_update_own']) {
    assert.ok(bundle.includes(`drop policy if exists "${policy}" on public.cloud_saves;`), `the one-time file drops ${policy}`);
}
for (const [name, sql] of [['cloud-and-playtest.sql', cloud], ['operations-and-ghost.sql', ops]]) {
    const commit = functionBlock(sql, 'commit_cloud_save');
    assert.ok(/\nsecurity definer\n/.test(commit), `${name}: commit_cloud_save still writes once direct writes are revoked`);
    assert.ok(commit.includes(`if pg_column_size(next_save_data) > 8388608 then raise exception 'SAVE_TOO_LARGE'; end if;`),
        `${name}: commit_cloud_save refuses a save over 8MiB`);
}
const commit = functionBlock(ops, 'commit_cloud_save');
assert.ok(commit.includes(`recent.created_at > now() - interval '30 minutes'`), 'a commit records the earlier save about every 30 minutes, not every save');
assert.ok(!/stored_data/.test(commit), 'a commit no longer reads the whole stored save just to lock the row');
assert.deepStrictEqual([...ops.matchAll(/order by keep\.revision desc limit (\d+)/g)].map(match => Number(match[1])), [2, 2],
    'commit and restore keep two earlier versions');
assert.ok(/limit 3;\n\$\$;$/.test(functionBlock(ops, 'list_cloud_save_versions')), 'the history list is the current save plus the two kept versions');
assert.ok(read('js/cloud-tools-ui.js').includes('약 30분 간격으로 최대 2개'), 'the history panel tells what the server keeps');

// 전당 가방 한도는 클라이언트 getEquipmentInventoryPageCount와 같은 구간과 상수를 쓴다.
const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const hallLimit = functionBlock(hall, 'hall_inventory_limit');
assert.ok(!hallLimit.includes('inventoryExpandLevel'), 'the hall limit no longer reads the removed inventoryExpandLevel');
const clientSteps = run('getEquipmentInventoryPageCount.toString()')
    .match(/loop < (\d+) \? Math\.floor\(loop \/ (\d+)\) : (\d+) \+ Math\.floor\(\(loop - (\d+)\) \/ (\d+)\)/);
const serverSteps = hallLimit
    .match(/loop_number < (\d+) then floor\(loop_row\.loop_number \/ (\d+)\)\s+else (\d+) \+ floor\(\(loop_row\.loop_number - (\d+)\) \/ (\d+)\)/);
assert.ok(clientSteps && serverSteps, 'both page formulas are readable');
assert.deepStrictEqual(serverSteps.slice(1), clientSteps.slice(1), 'the hall earns pages at the same loops as the client');
assert.ok(hallLimit.includes(`least(${run('EQUIPMENT_INVENTORY_MAX_PAGES')}, 1 +`), 'the hall page cap is EQUIPMENT_INVENTORY_MAX_PAGES');
assert.ok(hallLimit.includes(`* ${run('EQUIPMENT_INVENTORY_CELLS_PER_PAGE')})::integer`), 'a hall page is EQUIPMENT_INVENTORY_CELLS_PER_PAGE cells');
assert.ok(/'season'[\s\S]*'loopCount'/.test(hallLimit), 'the hall loop is the larger of season and loopCount + 1, like the client');

// 한 번 실행용 파일은 원본과 같은 함수를 담는다(나중에 원본을 다시 실행해도 같은 상태).
for (const [name, source] of [['commit_cloud_save', ops], ['list_cloud_save_versions', ops], ['restore_cloud_save_version', ops], ['hall_inventory_limit', hall]]) {
    assert.strictEqual(functionBlock(bundle, name), functionBlock(source, name), `the one-time file's ${name} matches its source file`);
}
assert.ok(/^begin;$/m.test(bundle) && /^commit;$/m.test(bundle), 'the one-time file runs in one transaction');
assert.ok(!/^\s*(delete|update|insert|truncate)\b/im.test(bundle.replace(/create or replace function[\s\S]*?\$\$[\s\S]*?\$\$;/g, '')),
    'the one-time file changes no rows outside function bodies');

// 서버가 SAVE_TOO_LARGE로 거절하면 플레이어는 한국어 안내를 본다.
assert.ok(/너무 커서/.test(run(`describeCloudServerError({ message: 'SAVE_TOO_LARGE' }, 400)`)), 'SAVE_TOO_LARGE reads as a Korean notice');
assert.strictEqual(run(`describeCloudServerError({ message: 'AUTH_REQUIRED' }, 400)`), 'AUTH_REQUIRED', 'other server messages pass through');
assert.strictEqual(run(`describeCloudServerError(null, 503)`), 'HTTP 503', 'an empty body falls back to the status');
console.log('smoke-db-save-limits passed');
