-- ============================================================================
-- 경매장 서버 시세(2026-11-21): 시세 보정과 운영 모드를 담는 표 한 줄(auction_market_pulse)과 RPC 하나(get_auction_snapshot).
-- ----------------------------------------------------------------------------
-- 적용: Supabase 대시보드 > SQL Editor > New query에 이 파일 전체를 붙여 넣고 Run. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
--   여러 번 실행해도 안전하다(표, 한 줄, 인덱스는 없을 때만 만들고, 함수는 바꿔 쓴다). 기존 데이터는 지우지 않는다.
--   db/cloud-and-playtest.sql(cloud_saves)과 db/anti-cheat.sql(cheat_holds, cheat_flags)을 실행한 프로젝트에 쓴다.
-- 하는 일: 로그인한 플레이어가 경매장을 열면 게임이 이 RPC를 POST로 부른다(modules/application/auction-pulse-service.mjs). 함수는
--   cloud_saves를 읽기만 하고, 쓰는 곳은 제 표 auction_market_pulse의 한 줄뿐이다(다시 센 값을 저장한다). 그 줄을 고치므로 읽기 전용
--   트랜잭션이 되는 GET으로는 부를 수 없고 POST로 불러야 한다.
--   다시 셀 때는 최근 24시간 안에 저장한 계정 가운데 가장 최근에 저장한 400명만 본다(그 밖의 저장은 JSON을 읽지 않는다). 그래서 표는
--   가장 최근에 저장한 400개 계정 사이의 투표다. 그중 루프 20 이상(season과 loopCount + 1 가운데 큰 값, 다른 db 파일과 같은 식)이고,
--   가입한 지 7일이 지났고, 운영 보류(cheat_holds)가 없고, 14일 안에 치트 기록(cheat_flags)이 없는 계정의 거래 흐름(save_data의
--   auction.trend: 산 계열과 재료는 +, 출품한 계열과 판 재료는 -, 시세 구간마다 반으로 준다)을 열쇠 62개마다 한 계정 한 표로 센다:
--   0보다 크면 +1, 작으면 -1, 숫자가 아니면 세지 않는다.
--   한 표라도 낸 계정(voters)이 20명보다 적으면 보정이 없다. 20명 이상이면 열쇠마다 round(0.06 x (오름 - 내림) / voters, 2)이고 0이면 뺀다.
--   게임은 받은 보정을 그다음 시세 구간(15분) 것으로 저장해 그 구간에만 더하고, 그래도 시세는 0.85~1.15 밖으로 나가지 않는다.
-- 비용: 마지막 계산이 10분보다 오래됐거나 15분 시세 구간이 바뀐 뒤 처음 부른 요청 하나만 다시 센다(다른 요청은 저장된 값을 그대로 읽는다).
--   다시 셀 때 updated_at 인덱스(cloud_saves_updated_at_idx, 이 파일이 만든다)로 하루 안의 저장을 최근 순으로 400개까지만 고르고, 그
--   400개의 save_data만 읽는다. 많아야 10분에 한 번이다.
-- 운영 모드: 'hybrid'(기본, 경매장이 장비 전당의 다른 플레이어 장비도 보여 준다) 또는 'pulse_only'(상인 매물과 시세만). 바꿀 때는
--   update public.auction_market_pulse set mode = 'pulse_only' where id = 1;
--   (되돌릴 때는 'hybrid'). 함수는 모드를 바꾸지 않는다. 게임은 경매장을 열 때 다음 요청부터 새 모드를 쓴다.
-- 이 파일을 실행하지 않아도 게임은 그대로 돈다: RPC가 없으면(404) 그 판 동안 묻지 않고, 보정 없이 'hybrid'로 보인다.
-- ============================================================================

begin;

-- 먼저 실행해야 하는 파일의 표가 없으면 여기서 멈춘다(함수는 표가 없어도 만들어지고 부를 때에야 실패하기 때문이다).
do $$
begin
    if to_regclass('public.cloud_saves') is null or to_regclass('public.cheat_holds') is null
       or to_regclass('public.cheat_flags') is null then
        raise exception 'db/cloud-and-playtest.sql과 db/anti-cheat.sql을 먼저 실행하세요';
    end if;
end $$;

create table if not exists public.auction_market_pulse (
    id          smallint primary key default 1 check (id = 1),
    mode        text not null default 'hybrid' check (mode in ('hybrid', 'pulse_only')),
    bucket      bigint not null default 0,
    voters      integer not null default 0,
    deltas      jsonb not null default '{}'::jsonb,
    computed_at timestamptz not null default to_timestamp(0)
);
insert into public.auction_market_pulse (id) values (1) on conflict (id) do nothing;
alter table public.auction_market_pulse enable row level security;
-- 정책을 두지 않는다. 아래 보안 정의자 함수만 읽고 쓴다(전당 표와 같다).
revoke all on public.auction_market_pulse from anon, authenticated;

-- 다시 셀 때 하루 안의 저장을 최근 순으로 고르는 인덱스. cloud_saves의 데이터는 바꾸지 않는다.
create index if not exists cloud_saves_updated_at_idx on public.cloud_saves (updated_at);

-- 경매장 시세 한 장: { serverNow: 서버 시각(UTC ms), bucket: 보정을 센 시세 구간(floor(초 / 900)), mode, voters, deltas: { 열쇠: 보정 } }.
-- 다른 요청이 지금 다시 세고 있으면(줄이 잠겨 있으면) 기다리지 않고 저장된 값을 그대로 돌려준다. 그때 bucket은 저장된 구간이라 지난 구간일 수 있고,
-- 게임은 제 구간과 다른 bucket의 보정을 쓰지 않는다.
create or replace function public.get_auction_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    -- 열쇠 목록은 게임의 auctionHouse.pulseKeys()와 같다(modules/domain/auction-pulse.mjs auctionPulseKeys: modules/data/auction-house.mjs의
    -- families 12개 다음 materials.keys 50개, 묶음 차례). 게임의 목록이 바뀌면 여기도 고친다.
    pulse_keys constant text[] := array[
        'fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'spell', 'summon', 'projectile', 'attack', 'armor', 'resistance', 'emberBranch',
        'burningEmberBranch', 'voidChisel', 'venomStinger', 'enchantedHoney', 'oceanRerollShard', 'altarEmber', 'altarIchor', 'deepWhetstone',
        'rootIron', 'jewelPolish', 'abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos', 'catalystCrit',
        'catalystSummon', 'oilFire', 'oilCold', 'oilLight', 'oilChaos', 'fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift', 'bossKeyFlame',
        'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'trialKey3', 'chaosKey', 'coreKey', 'hiveKey', 'colonyTrace', 'bossCore', 'underCopper',
        'underSilver', 'underGold', 'skyEssence', 'jewelShard', 'runeShard', 'pollen', 'beeswax', 'sealShard', 'strongSealShard', 'radiantSealShard',
        'reefFragment', 'colonyShard'];
    now_at constant timestamptz := now();
    bucket_now constant bigint := floor(extract(epoch from now()) / 900)::bigint;
    pulse public.auction_market_pulse%rowtype;
    counted_voters integer;
    counted_deltas jsonb;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

    select * into pulse from public.auction_market_pulse where id = 1;
    if not found then
        -- 손으로 줄을 지운 경우: 기본값으로 다시 놓는다.
        insert into public.auction_market_pulse (id) values (1) on conflict (id) do nothing;
        select * into pulse from public.auction_market_pulse where id = 1;
    end if;

    if pulse.bucket <> bucket_now or pulse.computed_at < now_at - interval '10 minutes' then
        select * into pulse from public.auction_market_pulse where id = 1 for update skip locked;
        if not found then
            -- 다른 요청이 세는 중: 저장된 값을 그대로 돌려준다.
            select * into pulse from public.auction_market_pulse where id = 1;
        elsif pulse.bucket <> bucket_now or pulse.computed_at < now_at - interval '10 minutes' then
            -- 잠근 뒤 다시 본다: 잠그는 사이 다른 요청이 방금 세어 놓았으면 또 세지 않는다.
            with recent as materialized (
                -- 하루 안의 저장 가운데 최근 400개. 여기서는 save_data를 풀어 읽지 않고 그대로 넘긴다.
                -- materialized: 아래 조건이 이 안으로 밀려 들어가 400개 밖의 저장을 읽는 일이 없게 한다.
                select rs.user_id, rs.save_data
                  from public.cloud_saves rs
                 where rs.updated_at >= now_at - interval '24 hours'
                 order by rs.updated_at desc
                 limit 400
            ), picked as materialized (
                -- 계정마다 필요한 세 값만 한 번씩 꺼낸다. 뒤에서는 이 작은 값만 쓴다(큰 저장을 열쇠마다 다시 풀지 않는다).
                select recent.user_id,
                       recent.save_data -> 'season' as season,
                       recent.save_data -> 'loopCount' as loop_count,
                       recent.save_data #> '{auction,trend}' as trend
                  from recent
            ), eligible as (
                -- 숫자가 아닌 값은 case로 막아 형 변환이 실패하지 않는다.
                -- 루프 번호는 db/equipment-hall.sql hall_inventory_limit와 같은 식이다: greatest(1, season, loopCount + 1).
                select picked.user_id, picked.trend
                  from picked
                  join auth.users au on au.id = picked.user_id
                 where greatest(1,
                           case when jsonb_typeof(picked.season) = 'number'
                                then floor((picked.season #>> '{}')::numeric) else 1 end,
                           case when jsonb_typeof(picked.loop_count) = 'number'
                                then floor((picked.loop_count #>> '{}')::numeric) + 1 else 1 end) >= 20
                   and au.created_at < now_at - interval '7 days'
                   and not exists (select 1 from public.cheat_holds ch where ch.user_id = picked.user_id)
                   and not exists (select 1 from public.cheat_flags cf
                                    where cf.user_id = picked.user_id and cf.last_at >= now_at - interval '14 days')
            ), votes as (
                -- 계정 하나, 열쇠 하나에 한 표: JSON 숫자만 세고 그 부호가 표다(0이면 표가 없다).
                select eligible.user_id, pk.key_name,
                       case when jsonb_typeof(eligible.trend) = 'object' and jsonb_typeof(eligible.trend -> pk.key_name) = 'number'
                            then sign((eligible.trend ->> pk.key_name)::numeric)::integer else 0 end as vote
                  from eligible
                 cross join unnest(pulse_keys) as pk(key_name)
            ), counted as (
                select (count(distinct votes.user_id) filter (where votes.vote <> 0))::integer as voters from votes
            ), tallies as (
                select votes.key_name, count(*) filter (where votes.vote > 0) - count(*) filter (where votes.vote < 0) as net
                  from votes
                 group by votes.key_name
            )
            select counted.voters,
                   case when counted.voters < 20 then '{}'::jsonb
                        else coalesce((select jsonb_object_agg(tally.key_name, round(0.06 * tally.net / counted.voters, 2))
                                         from tallies tally
                                        where round(0.06 * tally.net / counted.voters, 2) <> 0), '{}'::jsonb) end
              into counted_voters, counted_deltas
              from counted;

            update public.auction_market_pulse
               set bucket = bucket_now, voters = coalesce(counted_voters, 0), deltas = coalesce(counted_deltas, '{}'::jsonb), computed_at = now_at
             where id = 1
            returning * into pulse;
        end if;
    end if;

    return jsonb_build_object(
        'serverNow', floor(extract(epoch from now_at) * 1000)::bigint,
        'bucket', pulse.bucket,
        'mode', pulse.mode,
        'voters', pulse.voters,
        'deltas', pulse.deltas);
end;
$$;

revoke all on function public.get_auction_snapshot() from public, anon;
grant execute on function public.get_auction_snapshot() to authenticated;

commit;
