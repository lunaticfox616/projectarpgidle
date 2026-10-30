-- ============================================================================
-- 전당 보강 묶음(2026-10-30): 추가 옵션 표 검사, 황금률 잔액과 전당 구매·등록 감시, 중복 접속 차단.
-- ----------------------------------------------------------------------------
-- 적용 순서(모두 Supabase 대시보드 > SQL Editor > New query에 붙여 넣고 Run):
--   1) 이 파일 db/hall-watch-20261030.sql: 표와 함수, 트리거를 만들거나 바꾼다. 여러 번 실행해도 안전하고 기존 데이터는 지우지 않는다.
--      한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
--   2) db/hall-affix-table-20261030.sql: 추가 옵션 표를 채운다(비우고 다시 채운다). 게임의 추가 옵션이 바뀌면
--      node scripts/export-hall-affix-table.cjs 로 다시 만들어 다시 실행한다. 채우기 전까지 전당 등록 검사는 예전 범위 검사만 한다.
--   db/cloud-and-playtest.sql, db/operations-and-ghost.sql, db/social.sql, db/equipment-hall.sql, db/anti-cheat.sql을 실행한 프로젝트에 쓴다.
--   1절과 2절은 원본 db/equipment-hall.sql(표, 표 검사 함수, validate_hall_item)과 db/anti-cheat.sql(기록 종류, watch_cloud_save_values)에도
--   같은 문장으로 들어 있어 새로 설치하는 프로젝트는 원본만 실행하면 된다(scripts/check-db-mirror.js가 두 사본이 같은지 본다).
--   3절(전당 감시)과 4절(중복 접속)은 이 파일에만 있다.
-- 원칙(db/anti-cheat.sql과 같다):
--   틀릴 수 없는 검사만 막는다: 추가 옵션 표 밖의 줄(HALL_ITEM_REJECTED), 다른 기기가 이 계정으로 접속한 뒤에 온 옛 화면의 저장과 전당 요청
--   (CLOUD_SESSION_SUPERSEDED). 어림 검사는 기록만 한다: 황금률 잔액, 하루 전당 구매와 등록의 이상치(상위 20명의 가운데 값보다 10배 넘게 클 때,
--   20명이 안 되면 보지 않는다). 감시 트리거는 AFTER에서 돌고 실패해도 구매와 등록은 들어간다(lock_timeout 2초).
-- 클라이언트: js/cloud-session-guard-ui.js(중복 접속), js/cloud-tools-ui.js 운영 창의 치트 감시(새 기록 종류 golden_rule, hall_buy, hall_list).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) 전당 등록: 추가 옵션 표 검사 (db/equipment-hall.sql과 같은 문장)
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

-- 추가 옵션 한 줄이 표와 맞지 않는가: 표에 그 능력치가 있는데 이 슬롯에 주는 행이 없다, 티어가 그 능력치의 티어 범위 밖이다, 값이 그 티어의
-- 최솟값과 최댓값 밖이다. 표에 없는 능력치(고유 전용 줄처럼 특수한 줄)는 걸리지 않고 기존 범위 검사(db/anti-cheat.sql)로 넘어간다.
-- p_scale은 잿불 타락이 저장한 배율(emberScale 0.8~1.2), p_top_tier는 타락(corrupted) 장비의 티어 상한(값이 그 티어의 최댓값까지 오른다,
-- js/loot.js corruptedValue). 반올림 여유는 표의 범위나 값이 정수면 0.5(잿불 배율은 정수 값을 정수로 반올림한다, js/ember-corruption.js rescale), 아니면 0.01.
create or replace function public.hall_affix_line_rejected(p_stat_id text, p_slot text, p_tier numeric, p_val numeric, p_scale numeric, p_top_tier numeric)
returns boolean language plpgsql stable set search_path = public as $$
declare
    low_tier integer;
    high_tier integer;
    low_val numeric;
    high_val numeric;
    whole boolean;
    slack numeric;
begin
    if not exists (select 1 from public.hall_affix_table where stat_id = p_stat_id) then return false; end if;
    select min(tier), max(tier) into low_tier, high_tier from public.hall_affix_table where stat_id = p_stat_id and p_slot = any(slots);
    if low_tier is null or p_tier < low_tier or p_tier > high_tier then return true; end if;
    select min(min_val), bool_and(min_val = trunc(min_val) and max_val = trunc(max_val)) into low_val, whole
      from public.hall_affix_table where stat_id = p_stat_id and p_slot = any(slots) and tier = p_tier;
    if low_val is null then return true; end if;
    select max(max_val) into high_val
      from public.hall_affix_table where stat_id = p_stat_id and p_slot = any(slots) and tier between p_tier and greatest(p_tier, p_top_tier);
    slack := case when whole or p_val = trunc(p_val) then 0.5 else 0.01 end + 0.000001;
    return p_val < low_val * p_scale - slack or p_val > high_val * p_scale + slack;
end;
$$;

-- 희귀 장비의 추가 옵션(stats)을 표와 맞춰 본다. 표가 비어 있으면(db/hall-affix-table-20261030.sql을 아직 돌리지 않은 DB) 보지 않는다.
-- 값과 티어가 숫자인 줄만 본다(그 밖의 줄은 validate_hall_item의 앞 검사가 거른다). 메아리 줄(isEchoMod)은 원본과 같은 id라 앞의 중복 id 검사가
-- 먼저 거르므로 따로 두지 않는다(표식만 붙인 줄이 검사를 비켜 가지 않게). 잿불 배율(emberScale)은 잿불 타락한 장비(burned)에서만 본다.
-- 복합 옵션의 둘째 수치(extraStats)와 고유 장비의 줄(고유마다 정한 범위)은 표에 없어 기존 범위 검사로 간다.
-- 표는 RLS만 켜고 정책이 없어 보안 정의자 함수(quote_hall_item, create_hall_listing)에서만 보인다: authenticated로 도는 곳에서 부르면 빈 표로 보여 검사가 꺼진다.
create or replace function public.hall_affix_table_rejects(item_data jsonb)
returns boolean language plpgsql stable set search_path = public as $$
declare
    slot_name text := coalesce(item_data ->> 'slot', '');
    top_tier numeric := case when lower(coalesce(item_data ->> 'corrupted', 'false')) = 'true'
                             then public.hall_number(coalesce(item_data -> 'affixTierCap', item_data -> 'hiddenTier'), 1, 1, 20) else 0 end;
    burned boolean := lower(coalesce(item_data ->> 'burned', 'false')) = 'true';
begin
    if coalesce(item_data ->> 'rarity', '') <> 'rare' or not exists (select 1 from public.hall_affix_table) then return false; end if;
    return exists (
        select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) line
         where jsonb_typeof(line -> 'val') = 'number' and jsonb_typeof(line -> 'tier') = 'number'
           and public.hall_affix_line_rejected(coalesce(line ->> 'id', ''), slot_name,
                   public.hall_number(line -> 'tier', 0, 0, 100), public.hall_number(line -> 'val', 0, -9000000000000, 9000000000000),
                   case when burned then public.hall_number(line -> 'emberScale', 1, 0.8, 1.2) else 1 end, top_tier));
end;
$$;

-- 등록할 장비의 모양 검사. 추가 옵션의 티어 상한은 장비가 들고 온 affixTierCap으로 보고, 2026-10-30부터 능력치 id, 티어, 값, 슬롯은
-- 추가 옵션 표(hall_affix_table_rejects)로도 본다. 표를 읽으므로 immutable이 아니라 stable이다.
create or replace function public.validate_hall_item(item_data jsonb)
returns void language plpgsql stable set search_path = public as $$
declare
    stat_cap integer := case when item_data ->> 'rarity' = 'rare' then 7 else 8 end;   -- 줄 끝의 맨 case ... end는 Supabase SQL Editor가 문장을 거기서 끊는다(2026-10-30)
begin
    if jsonb_typeof(item_data) is distinct from 'object'
       or length(coalesce(item_data ->> 'name', '')) not between 1 and 80
       or length(coalesce(nullif(item_data ->> 'baseId', ''), item_data ->> 'baseName', '')) not between 1 and 80
       or coalesce(item_data ->> 'slot', '') not in ('무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패')
       or coalesce(item_data ->> 'rarity', '') not in ('rare','unique')
       or octet_length(item_data::text) > 24000
       or lower(coalesce(item_data ->> 'locked', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'tradeLocked', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'hallReplica', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'hallRelistBlocked', 'false')) = 'true' then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if jsonb_typeof(item_data -> 'stats') is distinct from 'array'
       or jsonb_array_length(public.hall_array(item_data -> 'stats')) > stat_cap
       or jsonb_typeof(item_data -> 'baseStats') is distinct from 'array'
       or jsonb_array_length(public.hall_array(item_data -> 'baseStats')) > 8
       or exists (select 1 from (
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'stats'))
               union all
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'baseStats'))
           ) item_stats where jsonb_typeof(stat) is distinct from 'object'
              or length(coalesce(stat ->> 'id', '')) not between 1 and 80
              or case when jsonb_typeof(stat -> 'val') = 'number'
                      then abs((stat ->> 'val')::numeric) > 9000000000000 else true end) then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if item_data ? 'abyssSockets' and jsonb_typeof(item_data -> 'abyssSockets') not in ('array','null') then
        raise exception 'HALL_ITEM_REJECTED';
    end if;
    if exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'abyssSockets')) socket
                where jsonb_typeof(socket -> 'jewel') = 'object') then
        raise exception 'HALL_SOCKET_NOT_EMPTY';
    end if;
    if item_data ->> 'rarity' = 'rare' and (
        exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) stat
                 where case when jsonb_typeof(stat -> 'tier') = 'number'
                     then (stat ->> 'tier')::numeric not between 1 and least(20,
                         public.hall_number(coalesce(item_data -> 'affixTierCap', item_data -> 'hiddenTier'), 1, 1, 20))
                     else true end)
        or exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) stat
                    group by stat ->> 'id' having count(*) > 1)
    ) then raise exception 'HALL_ITEM_REJECTED'; end if;
    if public.hall_affix_table_rejects(item_data) then raise exception 'HALL_ITEM_REJECTED'; end if;
end;
$$;

revoke all on function public.hall_affix_line_rejected(text, text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.hall_affix_table_rejects(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) 저장 감시: 황금률 잔액 (db/anti-cheat.sql과 같은 문장)
-- ---------------------------------------------------------------------------
-- 기록 종류 목록은 다시 실행할 때마다 새로 건다. 새 종류: golden_rule(황금률 잔액), hall_buy(하루 전당 구매), hall_list(하루 전당 등록).
alter table public.cheat_flags drop constraint if exists cheat_flags_kind_check;
alter table public.cheat_flags add constraint cheat_flags_kind_check check (kind in ('clock', 'currency', 'level', 'ghost_dps', 'ghost_ehp', 'golden_rule', 'hall_buy', 'hall_list'));

-- 기기 시계: 세이브가 본 가장 늦은 시각(saveMeta.maxSeenAt, lastModifiedAt)이 서버 시각보다 10분 넘게 앞선다.
-- 나올 수 없는 값: 화폐가 천만을 넘거나 음수다(GUEST_SAVE_CHECK.currencyMax). 레벨이 200을 넘는다(MAX_PLAYER_LEVEL).
-- 황금률(전당의 지불 재화, 2026-10-30): 잔액이 10만을 넘으면 따로 기록한다(전당의 가장 비싼 전시 25,000의 4배). 전당은 클라이언트 저장의 황금률을
-- 읽어 깎으므로 보장이 아니라 감시다. 임계는 실제 플레이 자료를 보고 바꾼다(db/hall-watch-20261030.sql의 사본과 함께).
create or replace function public.watch_cloud_save_values(p_user_id uuid, p_digest jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
    seen_ms numeric := greatest(public.cheat_number(p_digest #> '{saveMeta,maxSeenAt}'), public.cheat_number(p_digest #> '{saveMeta,lastModifiedAt}'));
    now_ms numeric := extract(epoch from now()) * 1000;
    wallet jsonb := case when jsonb_typeof(p_digest -> 'currencies') = 'object' then p_digest -> 'currencies' else '{}'::jsonb end;
    level_value numeric := public.cheat_number(p_digest -> 'level');
    top_key text;
    top_value numeric;
    low_value numeric;
begin
    if seen_ms > now_ms + 600000 then
        perform public.note_cheat_flag(p_user_id, 'clock', jsonb_build_object('aheadMinutes', round((seen_ms - now_ms) / 60000)));
    end if;
    select entry.key, public.cheat_number(entry.value) into top_key, top_value
      from jsonb_each(wallet) entry order by public.cheat_number(entry.value) desc limit 1;
    select min(public.cheat_number(entry.value)) into low_value from jsonb_each(wallet) entry;
    if coalesce(top_value, 0) > 10000000 or coalesce(low_value, 0) < 0 then
        perform public.note_cheat_flag(p_user_id, 'currency', jsonb_build_object('key', top_key, 'value', top_value, 'lowest', low_value));
    end if;
    if public.cheat_number(wallet -> 'goldenRule') > 100000 then
        perform public.note_cheat_flag(p_user_id, 'golden_rule', jsonb_build_object('value', public.cheat_number(wallet -> 'goldenRule')));
    end if;
    if level_value > 200 then
        perform public.note_cheat_flag(p_user_id, 'level', jsonb_build_object('level', level_value));
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) 전당 감시: 하루 구매와 등록의 이상치는 기록만 한다
-- ---------------------------------------------------------------------------
-- 오늘(UTC)의 시작. 날짜는 db/anti-cheat.sql과 같이 UTC로 센다.
create or replace function public.cheat_utc_day_start()
returns timestamptz language sql stable set search_path = public as $$
    select (date_trunc('day', now() at time zone 'utc')) at time zone 'utc';
$$;

-- 구매가 실제로 들어간 뒤(AFTER) 돈다: 오늘 이 계정이 산 복제본 수와 쓴 황금률 합이, 오늘 가장 많이 산 20명(자기 빼고)의 가운데 값보다
-- 10배 넘게 크면 hall_buy로 기록한다(둘 중 하나라도). 하루 구매 상한(10개)과 전시 값 상한(25,000)이 따로 있어 자주 걸리지는 않는다.
-- 기록이 실패해도 구매는 막지 않는다. 잠금을 2초 넘게 기다리면 그 오류도 예외 블록이 잡는다(watch_ghost_dps와 같은 까닭).
create or replace function public.watch_hall_purchase()
returns trigger language plpgsql security definer set search_path = public set lock_timeout = '2s' as $$
declare
    day_start timestamptz := public.cheat_utc_day_start();
    my_buys integer;
    my_spent numeric;
    peers integer;
    median_buys numeric;
    median_spent numeric;
begin
    begin
        select count(*), coalesce(sum(price), 0) into my_buys, my_spent
          from public.hall_purchases where buyer_id = new.buyer_id and purchased_at >= day_start;
        select count(*), percentile_cont(0.5) within group (order by top.buys), percentile_cont(0.5) within group (order by top.spent)
          into peers, median_buys, median_spent
          from (select count(*) as buys, sum(price) as spent from public.hall_purchases
                 where purchased_at >= day_start and buyer_id <> new.buyer_id
                 group by buyer_id order by count(*) desc limit 20) top;
        if peers >= 20 and ((median_buys > 0 and my_buys > median_buys * 10) or (median_spent > 0 and my_spent > median_spent * 10)) then
            perform public.note_cheat_flag(new.buyer_id, 'hall_buy', jsonb_build_object('buys', my_buys, 'spent', my_spent,
                'topMedianBuys', round(median_buys, 1), 'topMedianSpent', round(median_spent)));
        end if;
    exception when others then
        raise warning 'watch_hall_purchase: %', sqlerrm;
    end;
    return null;
end;
$$;

drop trigger if exists trg_watch_hall_purchase on public.hall_purchases;
create trigger trg_watch_hall_purchase after insert on public.hall_purchases
    for each row execute function public.watch_hall_purchase();

-- 등록이 실제로 들어간 뒤(AFTER) 돈다: 오늘 이 계정의 등록 수가, 오늘 가장 많이 등록한 20명(자기 빼고)의 가운데 값보다 10배 넘게 크면
-- hall_list로 기록한다. 하루 등록 상한(20개)이 따로 있다. 기록이 실패해도 등록은 막지 않는다.
create or replace function public.watch_hall_listing()
returns trigger language plpgsql security definer set search_path = public set lock_timeout = '2s' as $$
declare
    day_start timestamptz := public.cheat_utc_day_start();
    my_listings integer;
    peers integer;
    median_listings numeric;
begin
    begin
        select count(*) into my_listings
          from public.hall_listings where curator_id = new.curator_id and created_at >= day_start;
        select count(*), percentile_cont(0.5) within group (order by top.listings)
          into peers, median_listings
          from (select count(*) as listings from public.hall_listings
                 where created_at >= day_start and curator_id <> new.curator_id
                 group by curator_id order by count(*) desc limit 20) top;
        if peers >= 20 and median_listings > 0 and my_listings > median_listings * 10 then
            perform public.note_cheat_flag(new.curator_id, 'hall_list', jsonb_build_object('listings', my_listings, 'topMedian', round(median_listings, 1)));
        end if;
    exception when others then
        raise warning 'watch_hall_listing: %', sqlerrm;
    end;
    return null;
end;
$$;

drop trigger if exists trg_watch_hall_listing on public.hall_listings;
create trigger trg_watch_hall_listing after insert on public.hall_listings
    for each row execute function public.watch_hall_listing();

-- ---------------------------------------------------------------------------
-- 4) 중복 접속 차단: 같은 계정의 새 접속이 이기고, 옛 화면의 저장과 전당 요청은 거절한다
-- ---------------------------------------------------------------------------
-- 화면(탭)마다 접속 표(무작위 문자열)를 하나 만들어 로그인하면 claim_cloud_session으로 적는다(계정마다 한 줄, 마지막 것이 남는다). 그 뒤 모든
-- 서버 요청에 x-rignin-session 머리말로 같은 표를 싣는다(js/cloud-session-guard-ui.js, js/ui.js cloudRequestHeaders). 클라우드 저장을 쓰는 요청
-- (commit_cloud_save의 업로드, 전당의 등록과 구매와 회수가 바꾸는 세이브)에서 머리말의 표가 적힌 표와 다르면 CLOUD_SESSION_SUPERSEDED로 거절한다:
-- 다른 기기가 그 뒤에 접속했다는 뜻이고, 그 화면의 저장이 새 기기의 진행을 덮어쓰지 않는다. 머리말이 없는 요청(이 장치가 없는 옛 클라이언트)과
-- 남의 줄을 고치는 관리자 요청은 막지 않는다. 옛 화면은 1분마다 자기 줄을 읽어(아래 select 정책) 다른 표가 적혀 있으면 스스로 멈춘다.
create table if not exists public.cloud_sessions (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    token      text not null,
    claimed_at timestamptz not null default now()
);

alter table public.cloud_sessions enable row level security;
revoke all on public.cloud_sessions from anon, authenticated;
drop policy if exists "cloud_sessions_select_own" on public.cloud_sessions;
create policy "cloud_sessions_select_own" on public.cloud_sessions
    for select to authenticated using (user_id = (select auth.uid()));
grant select on public.cloud_sessions to authenticated;

-- 이 화면의 접속 표를 적는다. 같은 계정의 앞선 표는 덮인다(새 접속이 이긴다).
create or replace function public.claim_cloud_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_token is null or length(p_token) not between 8 and 80 then raise exception 'INVALID_REQUEST'; end if;
    insert into public.cloud_sessions as session (user_id, token) values (account_id, p_token)
    on conflict (user_id) do update set token = excluded.token, claimed_at = now();
    return jsonb_build_object('token', p_token, 'claimedAt', now());
end;
$$;

-- 이 요청이 실은 접속 표(x-rignin-session 머리말). PostgREST가 요청 머리말을 request.headers에 JSON으로 둔다. 없으면 null.
create or replace function public.cloud_request_session_token()
returns text language sql stable set search_path = public as $$
    select nullif(trim(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-rignin-session', '')), '');
$$;

-- cloud_saves에 쓰기 직전(BEFORE) 돈다. 요청이 표를 실었고, 자기 줄을 고치는 요청이며, 적힌 표가 있는데 다르면 거절한다.
-- 다른 감시 트리거(trg_watch_cloud_save)보다 이름 순으로 먼저 돈다.
create or replace function public.guard_cloud_session()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    sent text := public.cloud_request_session_token();
    claimed text;
begin
    if sent is null or auth.uid() is distinct from new.user_id then return new; end if;
    select token into claimed from public.cloud_sessions where user_id = new.user_id;
    if claimed is not null and claimed <> sent then raise exception 'CLOUD_SESSION_SUPERSEDED'; end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_cloud_session on public.cloud_saves;
create trigger trg_guard_cloud_session before insert or update of save_data on public.cloud_saves
    for each row execute function public.guard_cloud_session();

-- 안쪽 함수는 RPC로 부르지 못하게 한다. claim_cloud_session만 로그인한 사용자가 부른다.
revoke all on function public.cheat_utc_day_start() from public, anon, authenticated;
revoke all on function public.watch_hall_purchase() from public, anon, authenticated;
revoke all on function public.watch_hall_listing() from public, anon, authenticated;
revoke all on function public.cloud_request_session_token() from public, anon, authenticated;
revoke all on function public.guard_cloud_session() from public, anon, authenticated;
revoke all on function public.claim_cloud_session(text) from public, anon;
grant execute on function public.claim_cloud_session(text) to authenticated;

commit;
