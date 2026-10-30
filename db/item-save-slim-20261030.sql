-- ============================================================================
-- 장비 저장 축약에 맞춘 전당 검사(2026-10-30). 클라이언트가 장비 줄의 다시 만들 수 있는 칸(valMin/valMax, valueStep, fixedValue, statName,
-- baseRollMin/baseRollMax)을 빼고 저장하므로(js/item-save-slim.js, saveVersion 20) 서버의 범위 검사와 전시 점수가 줄에 적힌 범위 대신
-- 표를 본다: 추가 옵션 줄은 public.hall_affix_table(mod_id, tier), 베이스 줄은 새 표 public.hall_base_table(base_id, stat_id).
-- ----------------------------------------------------------------------------
-- 적용 순서(모두 Supabase 대시보드 > SQL Editor > New query에 붙여 넣고 Run):
--   0) 아직이라면 db/hall-watch-20261030.sql과 db/hall-affix-table-20261030.sql(추가 옵션 표를 만들고 채운다).
--   1) 이 파일 db/item-save-slim-20261030.sql: 베이스 옵션 표와 범위 함수를 만들고 검사 함수를 바꾼다. 여러 번 실행해도 안전하고 기존 데이터는
--      지우지 않는다. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
--   2) db/hall-base-table-20261030.sql: 베이스 옵션 표를 채운다(비우고 다시 채운다). 게임의 베이스(BASE_ITEM_DB)가 바뀌면
--      node scripts/export-hall-affix-table.cjs 로 다시 만들어 다시 실행한다. 채우기 전까지 베이스 줄은 줄에 적힌 범위로만 보는데,
--      saveVersion 20 세이브의 베이스 줄은 범위를 들고 오지 않으므로 2)를 돌리기 전에는 값 천만·티어 20 검사만 받는다(거절은 없다).
--   db/equipment-hall.sql과 db/anti-cheat.sql을 실행한 프로젝트에 쓴다. 1절~3절의 문장은 원본 db/equipment-hall.sql(표, hall_line_bounds,
--   hall_roll_quality, hall_item_score, hall_item_price)과 db/anti-cheat.sql(hall_item_out_of_range)에도 같은 문장으로 들어 있어 새로 설치하는
--   프로젝트는 원본만 실행하면 된다(scripts/check-db-mirror.js가 두 사본이 같은지 본다).
-- 바뀌는 것:
--   hall_item_out_of_range: 추가 옵션 줄의 범위를 (sourceModId, tier)로 표에서, 베이스 줄은 (baseId, 줄 id)로 베이스 표에서 찾는다. 표에 없는
--     줄과 복합 옵션의 둘째 수치·잿불·부여·주입·잠식 줄은 전처럼 줄에 적힌 범위로 본다. 표가 비어 있으면 모두 전처럼 돈다.
--   hall_roll_quality: 같은 범위로 굴림 품질을 센다(전: 줄에 적힌 범위, 없으면 0.75). 인자가 (item_data, stat_data, line_kind)로 바뀌고
--     옛 hall_roll_quality(jsonb)는 지운다. 이를 읽는 hall_item_score와 hall_item_price는 표를 읽으므로 immutable이 아니라 stable이 된다.
--   validate_hall_item과 hall_affix_table_rejects는 id, tier, val, 슬롯만 보므로 줄어든 형식 그대로 돈다. 전당의 item_snapshot도 줄어든
--     형식으로 들어가고, 받는 쪽(js/player-exchange.js → normalizeItem)이 되살린다.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) 추가 옵션 표와 베이스 옵션 표 (db/equipment-hall.sql과 같은 문장). 추가 옵션 표는 0)이 이미 만들었으면 그대로 두고,
--    아니면 빈 표로 만들어 hall_line_bounds가 없는 표를 읽다 죽지 않게 한다(빈 동안은 줄의 범위로 검사).
-- ---------------------------------------------------------------------------
create table if not exists public.hall_affix_table (
    mod_id  text not null,
    stat_id text not null,
    tier    integer not null check (tier between 1 and 20),
    min_val numeric not null,
    max_val numeric not null,
    slots   text[] not null,
    primary key (mod_id, tier)
);
create index if not exists hall_affix_table_stat_idx on public.hall_affix_table (stat_id);
alter table public.hall_affix_table enable row level security;
revoke all on public.hall_affix_table from anon, authenticated;

create table if not exists public.hall_base_table (
    base_id text not null,
    stat_id text not null,
    min_val numeric not null,
    max_val numeric not null,
    primary key (base_id, stat_id)
);
alter table public.hall_base_table enable row level security;
revoke all on public.hall_base_table from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) 줄의 범위와 굴림 품질, 전시 점수 (db/equipment-hall.sql과 같은 문장)
-- ---------------------------------------------------------------------------
-- 장비 한 줄의 굴림 범위 [아래, 위](2026-10-30). 클라이언트가 다시 만들 수 있는 범위를 빼고 저장하므로(js/item-save-slim.js) 줄에 적힌 범위 대신 표를 본다:
--   추가 옵션 줄(line_kind 'stat')은 추가 옵션 표에서 (sourceModId, 티어)로. sourceModId가 없는 줄은 제단·화석·바다의 작업대 줄이라 제 범위를
--     들고 오면 그 범위를 쓰고(표의 같은 이름 다른 옵션과 섞이지 않게), 범위도 없으면 (id, 티어)로 표를 본다.
--   베이스 줄(line_kind 'base')은 제 범위를 들고 오면 그 범위를 쓰고(방패 업그레이드가 이월한 막기 확률처럼 정의와 다른 범위, js/items.js
--     rollUpgradedBaseStats), 없으면 베이스 옵션 표(db/hall-base-table-20261030.sql)에서 (baseId, 줄 id)로.
--   표에 없는 줄과 그 밖의 줄(line_kind 'other': 복합 옵션의 둘째 수치, 잿불, 하급 부여, 혼돈 주입, 잠식)은 줄의 valMin/valMax(없으면
--     baseRollMin/baseRollMax)를 쓰고, 그것도 없으면 null이다.
-- 표는 RLS만 켜고 정책이 없어 보안 정의자 함수(guard_hall_listing, quote_hall_item, create_hall_listing)에서만 보인다.
create or replace function public.hall_line_bounds(item_data jsonb, line jsonb, line_kind text)
returns numeric[] language plpgsql stable set search_path = public as $$
declare
    low_val numeric;
    high_val numeric;
    mod_key text := line ->> 'sourceModId';
begin
    if line_kind = 'base' and (jsonb_typeof(line -> 'valMin') is distinct from 'number'
                               or jsonb_typeof(line -> 'valMax') is distinct from 'number') then
        select min_val, max_val into low_val, high_val from public.hall_base_table
         where base_id = coalesce(item_data ->> 'baseId', '') and stat_id = coalesce(line ->> 'id', '');
    elsif line_kind = 'stat' and jsonb_typeof(line -> 'tier') = 'number'
          and (mod_key is not null or jsonb_typeof(line -> 'valMin') is distinct from 'number'
               or jsonb_typeof(line -> 'valMax') is distinct from 'number') then
        select min_val, max_val into low_val, high_val from public.hall_affix_table
         where mod_id = coalesce(mod_key, line ->> 'id', '') and tier = (line ->> 'tier')::numeric;
    end if;
    if low_val is null then
        low_val := public.hall_number(coalesce(nullif(line -> 'valMin', 'null'::jsonb), line -> 'baseRollMin'), null, -9000000000000, 9000000000000);
        high_val := public.hall_number(coalesce(nullif(line -> 'valMax', 'null'::jsonb), line -> 'baseRollMax'), null, -9000000000000, 9000000000000);
    end if;
    if low_val is null or high_val is null then return null; end if;
    return array[least(low_val, high_val), greatest(low_val, high_val)];
end;
$$;

-- 줄의 굴림 품질 0~1(범위 안 어디쯤인가). 범위는 hall_line_bounds가 표와 줄에서 찾고, 없거나 폭이 0이면 0.75다.
create or replace function public.hall_roll_quality(item_data jsonb, stat_data jsonb, line_kind text)
returns numeric language plpgsql stable set search_path = public as $$
declare
    rolled numeric := public.hall_number(stat_data -> 'val', 0, -9000000000000, 9000000000000);
    bounds numeric[] := public.hall_line_bounds(item_data, stat_data, line_kind);
begin
    if bounds is null or bounds[2] <= bounds[1] then return 0.75; end if;
    return least(1, greatest(0, (rolled - bounds[1]) / (bounds[2] - bounds[1])));
end;
$$;

-- 전시 점수. 굴림 품질은 표와 줄에서 범위를 찾으므로(hall_roll_quality) immutable이 아니라 stable이다(2026-10-30).
create or replace function public.hall_item_score(item_data jsonb)
returns bigint language plpgsql stable set search_path = public as $$
declare
    rarity_name text := coalesce(item_data ->> 'rarity', '');
    slot_name text := coalesce(item_data ->> 'slot', '');
    hidden_tier numeric := public.hall_number(coalesce(item_data -> 'hiddenTier', item_data -> 'itemTier'), 1, 1, 40);
    slot_weight numeric := case when slot_name = '무기' then 1.25 when slot_name in ('목걸이','반지') then 1.15 when slot_name in ('갑옷','방패') then 1.1 else 1 end;
    score_value numeric := 300 + power(hidden_tier, 2) * 12 * slot_weight;
    stat_data jsonb;
    stat_tier numeric;
    stat_weight numeric;
    roll_quality numeric;
begin
    for stat_data in select value from jsonb_array_elements(public.hall_array(item_data -> 'baseStats')) loop
        roll_quality := public.hall_roll_quality(item_data, stat_data, 'base');
        score_value := score_value + 100 + 180 * roll_quality
            + abs(public.hall_number(stat_data -> 'val', 0, -9000000000000, 9000000000000))
                * public.hall_base_stat_weight(coalesce(stat_data ->> 'id', '')) * (0.7 + roll_quality * 0.3);
        if lower(coalesce(stat_data ->> 'exceptional', 'false')) = 'true' then score_value := score_value + 450; end if;
    end loop;
    if rarity_name = 'rare' then
        score_value := score_value + 450;
        for stat_data in select value from jsonb_array_elements(public.hall_array(item_data -> 'stats')) loop
            stat_tier := public.hall_number(stat_data -> 'tier', 1, 1, 20);
            stat_weight := public.hall_affix_weight(coalesce(stat_data ->> 'id', ''));
            roll_quality := public.hall_roll_quality(item_data, stat_data, 'stat');
            score_value := score_value + power(stat_tier, 2) * 9 * stat_weight * (0.75 + roll_quality * 0.5);
        end loop;
        if jsonb_typeof(item_data -> 'chaosInfusion') = 'object' then score_value := score_value + 650; end if;
        if jsonb_typeof(item_data -> 'encroached') = 'object' then score_value := score_value + 1200; end if;
        if lower(coalesce(item_data ->> 'corrupted', 'false')) = 'true' then score_value := score_value + 150; end if;
    else
        score_value := score_value + 4500 + power(hidden_tier, 2) * 8;
        if length(coalesce(item_data ->> 'uniqueEffectKey', '')) > 0 then score_value := score_value + 2200; end if;
        for stat_data in select value from jsonb_array_elements(public.hall_array(item_data -> 'stats')) loop
            stat_tier := public.hall_number(stat_data -> 'tier', 0, 0, 20);
            stat_weight := public.hall_affix_weight(coalesce(stat_data ->> 'id', ''));
            roll_quality := public.hall_roll_quality(item_data, stat_data, 'stat');
            score_value := score_value + (260 + 460 * roll_quality) * stat_weight;
            if stat_tier > 0 then score_value := score_value + power(stat_tier, 2) * 12 * stat_weight; end if;
        end loop;
        if lower(coalesce(item_data ->> 'corrupted', 'false')) = 'true' then score_value := score_value + 250; end if;
    end if;
    return greatest(1, least(9000000000000000, round(score_value)))::bigint;
end;
$$;

create or replace function public.hall_item_price(item_data jsonb)
returns integer language plpgsql stable set search_path = public as $$
declare score_value bigint := public.hall_item_score(item_data);
begin
    if item_data ->> 'rarity' = 'unique' then
        return greatest(350, least(12000, ceil(score_value::numeric / 14)::integer));
    end if;
    return greatest(75, least(6000, ceil(score_value::numeric / 18)::integer));
end;
$$;

-- 옛 모양의 굴림 품질 함수: hall_item_score가 더는 부르지 않는다.
drop function if exists public.hall_roll_quality(jsonb);

-- ---------------------------------------------------------------------------
-- 3) 전당 등록의 범위 검사 (db/anti-cheat.sql과 같은 문장)
-- ---------------------------------------------------------------------------
-- 장비 한 줄이 게임에서 나올 수 없는 수치인가(js/guest-save-check.js statProblem, data/constants.js GUEST_SAVE_CHECK와 같다):
-- 값이 천만을 넘거나, 티어가 20을 넘거나, 그 줄의 굴림 범위 최댓값보다 범위 크기 + 1만큼 넘게 크다(최댓값의 2배쯤).
-- 뛰어난 기반(1.2배), 오염(1.15배), 잉걸불(0.8~1.2배)을 겹쳐도 이 여유 안에 든다. 굴림 범위가 없는 줄은 앞의 두 기준만 본다.
-- 굴림 범위는 2026-10-30부터 hall_line_bounds(db/equipment-hall.sql)가 준다: 추가 옵션 줄은 추가 옵션 표, 베이스 줄은 베이스 옵션 표,
-- 표에 없는 줄과 그 밖의 줄만 줄에 적힌 범위(클라이언트는 다시 만들 수 있는 범위를 빼고 저장한다, js/item-save-slim.js).
-- 보는 줄은 게임이 능력치에 더하는 줄 모두다(js/equipment-stat-resolution.js): 추가 옵션과 그 둘째 수치(extraStats), 베이스 옵션,
-- 잿불 줄(emberLines), 하급 부여(underEnchant), 혼돈 주입(chaosInfusion), 고른 잠식 줄(encroached.chosen). 없는 칸은 null이라 빠진다.
create or replace function public.hall_item_out_of_range(item_data jsonb)
returns boolean language sql stable set search_path = public as $$
    select exists (
        select 1
          from (select value as line, 'stat' as line_kind from jsonb_array_elements(public.hall_array(item_data -> 'stats'))
                union all
                select value, 'base' from jsonb_array_elements(public.hall_array(item_data -> 'baseStats'))
                union all
                select value, 'other' from jsonb_array_elements(public.hall_array(item_data -> 'emberLines')
                    || jsonb_path_query_array(item_data, '$.stats[*].extraStats[*]')
                    || jsonb_build_array(item_data -> 'underEnchant', item_data -> 'chaosInfusion', item_data #> '{encroached,chosen}'))) lines
         cross join lateral (
               select public.cheat_number(lines.line -> 'val') as val,
                      public.hall_line_bounds(item_data, lines.line, lines.line_kind) as bounds) roll
         where jsonb_typeof(lines.line -> 'val') = 'number'
           and (abs(roll.val) > 10000000
                or public.cheat_number(lines.line -> 'tier') > 20
                or (roll.bounds is not null
                    and roll.val > roll.bounds[2] + greatest(abs(roll.bounds[1]), abs(roll.bounds[2]), 1) + 1))
    );
$$;

-- 안쪽 함수는 RPC로 부르지 못하게 한다.
revoke all on function public.hall_line_bounds(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.hall_roll_quality(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.hall_item_score(jsonb) from public, anon, authenticated;
revoke all on function public.hall_item_price(jsonb) from public, anon, authenticated;
revoke all on function public.hall_item_out_of_range(jsonb) from public, anon, authenticated;

commit;
