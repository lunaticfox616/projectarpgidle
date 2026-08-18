-- 장비 전당과 참고용 루프/DPS 랭킹.
-- db/cloud-and-playtest.sql, db/social.sql 실행 후 Supabase SQL Editor에서 한 번 실행한다.
-- 전당 등록·구매·회수는 서버의 클라우드 저장을 잠그고 처리한다.
-- 기존 PTP 거래가 설치되어 있으면 열린 장비와 미수령 판매금을 먼저 돌려준 뒤 테이블과 RPC를 제거한다.

begin;

do $$
begin
    if to_regclass('public.player_trade_listings') is null then return; end if;
    execute 'alter table public.player_trade_listings add column if not exists proceeds_claimed_at timestamptz';

    update public.cloud_saves save
       set save_data = jsonb_set(save.save_data, '{inventory}',
               (case when jsonb_typeof(save.save_data -> 'inventory') = 'array' then save.save_data -> 'inventory' else '[]'::jsonb end) || coalesce((
                   select jsonb_agg(listing.item_snapshot order by listing.id)
                     from public.player_trade_listings listing
                    where listing.seller_id = save.user_id and listing.status = 'open'
                      and not exists (
                          select 1 from jsonb_array_elements(case when jsonb_typeof(save.save_data -> 'inventory') = 'array' then save.save_data -> 'inventory' else '[]'::jsonb end) owned
                           where owned ->> 'tradeKey' = listing.item_key::text
                      )
               ), '[]'::jsonb), true),
           revision = revision + 1, updated_at = now()
     where exists (select 1 from public.player_trade_listings listing
                    where listing.seller_id = save.user_id and listing.status = 'open');

    update public.cloud_saves save
       set save_data = jsonb_set(save.save_data, '{currencies,goldenRule}', to_jsonb(
               greatest(0, coalesce(case when jsonb_typeof(save.save_data #> '{currencies,goldenRule}') = 'number'
                   then (save.save_data #>> '{currencies,goldenRule}')::bigint end, 0)) + coalesce((
                   select sum(listing.price) from public.player_trade_listings listing
                    where listing.seller_id = save.user_id and listing.status = 'sold'
                      and listing.proceeds_claimed_at is null
               ), 0)), true),
           revision = revision + 1, updated_at = now()
     where exists (select 1 from public.player_trade_listings listing
                    where listing.seller_id = save.user_id and listing.status = 'sold'
                      and listing.proceeds_claimed_at is null);

    update public.player_trade_listings set status = 'cancelled', completed_at = now() where status = 'open';
    update public.player_trade_listings set proceeds_claimed_at = now()
     where status = 'sold' and proceeds_claimed_at is null;
end;
$$;

drop function if exists public.create_trade_listing(uuid, integer, bigint);
drop function if exists public.cancel_trade_listing(bigint, bigint);
drop function if exists public.buy_trade_listing(bigint, bigint);
drop function if exists public.claim_trade_proceeds(bigint);
drop function if exists public.get_player_exchange();
drop function if exists public.trade_inventory_limit(jsonb);
drop table if exists public.player_trade_listings;
drop table if exists public.trade_item_registry;

create table if not exists public.hall_item_registry (
    item_key uuid primary key,
    owner_id uuid not null references auth.users(id) on delete cascade,
    state text not null check (state in ('inventory', 'hall', 'retired')),
    listing_id bigint,
    source_listing_id bigint,
    updated_at timestamptz not null default now()
);

alter table public.hall_item_registry drop constraint if exists hall_item_registry_state_check;
alter table public.hall_item_registry add constraint hall_item_registry_state_check
    check (state in ('inventory', 'hall', 'retired'));

create table if not exists public.hall_listings (
    id bigint generated always as identity primary key,
    curator_id uuid not null references auth.users(id) on delete cascade,
    curator_name text not null,
    item_key uuid not null,
    item_snapshot jsonb not null,
    item_score bigint not null check (item_score between 1 and 9000000000000000),
    price integer not null check (price between 1 and 25000),
    honor_per_copy integer not null check (honor_per_copy between 1 and 50),
    copies_sold integer not null default 0 check (copies_sold between 0 and 5),
    copy_cap integer not null default 5 check (copy_cap between 1 and 5),
    status text not null default 'open' check (status in ('open', 'sold_out', 'withdrawn')),
    created_at timestamptz not null default now(),
    retired_at timestamptz
);

create table if not exists public.hall_purchases (
    id bigint generated always as identity primary key,
    listing_id bigint not null references public.hall_listings(id) on delete cascade,
    buyer_id uuid not null references auth.users(id) on delete cascade,
    replica_key uuid not null unique,
    price integer not null check (price between 1 and 25000),
    purchased_at timestamptz not null default now(),
    unique (listing_id, buyer_id)
);

create table if not exists public.hall_curator_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    honor bigint not null default 0 check (honor between 0 and 9000000000000000),
    copies_shared bigint not null default 0 check (copies_shared between 0 and 9000000000000000),
    updated_at timestamptz not null default now()
);

create unique index if not exists hall_item_single_open_idx
    on public.hall_listings(item_key) where status in ('open', 'sold_out');
create index if not exists hall_listing_open_score_idx
    on public.hall_listings(status, item_score desc, created_at desc);
create index if not exists hall_listing_curator_idx
    on public.hall_listings(curator_id, created_at desc);
create index if not exists hall_purchase_buyer_idx
    on public.hall_purchases(buyer_id, purchased_at desc);

create table if not exists public.player_rankings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    nickname text not null,
    loop_count integer not null check (loop_count between 1 and 100000),
    dps bigint not null check (dps between 0 and 9000000000000000),
    ascend_class text,
    active_skill text,
    save_revision bigint not null,
    ranking_day date not null default ((now() at time zone 'Asia/Seoul')::date),
    updated_at timestamptz not null default now()
);

alter table public.player_rankings add column if not exists ranking_day date;
update public.player_rankings set ranking_day = (updated_at at time zone 'Asia/Seoul')::date where ranking_day is null;
alter table public.player_rankings alter column ranking_day set not null;
alter table public.player_rankings alter column ranking_day set default ((now() at time zone 'Asia/Seoul')::date);
create index if not exists player_rankings_daily_loop_idx
    on public.player_rankings(ranking_day, loop_count desc, dps desc, updated_at asc);
create index if not exists player_rankings_daily_dps_idx
    on public.player_rankings(ranking_day, dps desc, loop_count desc, updated_at asc);

alter table public.hall_item_registry enable row level security;
alter table public.hall_listings enable row level security;
alter table public.hall_purchases enable row level security;
alter table public.hall_curator_profiles enable row level security;
alter table public.player_rankings enable row level security;
revoke all on public.hall_item_registry from anon, authenticated;
revoke all on public.hall_listings from anon, authenticated;
revoke all on public.hall_purchases from anon, authenticated;
revoke all on public.hall_curator_profiles from anon, authenticated;
revoke all on public.player_rankings from anon, authenticated;

create or replace function public.hall_inventory_limit(save_data jsonb)
returns integer language sql immutable set search_path = public as $$
    select 30 + greatest(0, coalesce(
        case when jsonb_typeof(save_data -> 'inventoryExpandLevel') = 'number'
             then (save_data ->> 'inventoryExpandLevel')::integer end, 0)) * 5;
$$;

create or replace function public.hall_number(value_data jsonb, fallback_value numeric, min_value numeric, max_value numeric)
returns numeric language sql immutable set search_path = public as $$
    select case when jsonb_typeof(value_data) = 'number'
        then least(max_value, greatest(min_value, (value_data #>> '{}')::numeric))
        else fallback_value end;
$$;

create or replace function public.hall_array(value_data jsonb)
returns jsonb language sql immutable set search_path = public as $$
    select case when jsonb_typeof(value_data) = 'array' then value_data else '[]'::jsonb end;
$$;

create or replace function public.hall_roll_quality(stat_data jsonb)
returns numeric language plpgsql immutable set search_path = public as $$
declare
    rolled numeric := public.hall_number(stat_data -> 'val', 0, -9000000000000, 9000000000000);
    low_roll numeric := public.hall_number(coalesce(stat_data -> 'valMin', stat_data -> 'baseRollMin'), rolled, -9000000000000, 9000000000000);
    high_roll numeric := public.hall_number(coalesce(stat_data -> 'valMax', stat_data -> 'baseRollMax'), rolled, -9000000000000, 9000000000000);
begin
    if high_roll <= low_roll then return 0.75; end if;
    return least(1, greatest(0, (rolled - low_roll) / (high_roll - low_roll)));
end;
$$;

create or replace function public.hall_affix_weight(stat_id text)
returns numeric language sql immutable set search_path = public as $$
    select case
        when stat_id in ('gemLevel','summonGemLevel','summonCap','projectileExtraShots','maxResAll','maxResF','maxResC','maxResL','maxResChaos') then 2.5
        when stat_id in ('aspd','crit','critDmg','resPen','physIgnore','deflectChance','blockChance','leech','pctHp','spellFlatDmg','flatDmg') then 1.5
        when stat_id in ('resAll','resChaos','energyShield','armor','evasion','flatHp','move','ds','regen','regenFlat') then 1.2
        else 1 end;
$$;

create or replace function public.hall_base_stat_weight(stat_id text)
returns numeric language sql immutable set search_path = public as $$
    select case
        when stat_id in ('projectileExtraShots','flaskUtilSlots') then 500
        when stat_id in ('crit','aspd','move','resAll','resChaos','dr','blockChance') then 24
        when stat_id in ('flatDmg','spellFlatDmg','summonFlatDmg') then 12
        when stat_id = 'flatHp' then 3
        when stat_id in ('armor','evasion','energyShield') then 0.8
        else 2 end;
$$;

create or replace function public.hall_item_score(item_data jsonb)
returns bigint language plpgsql immutable set search_path = public as $$
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
        roll_quality := public.hall_roll_quality(stat_data);
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
            roll_quality := public.hall_roll_quality(stat_data);
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
            roll_quality := public.hall_roll_quality(stat_data);
            score_value := score_value + (260 + 460 * roll_quality) * stat_weight;
            if stat_tier > 0 then score_value := score_value + power(stat_tier, 2) * 12 * stat_weight; end if;
        end loop;
        if lower(coalesce(item_data ->> 'corrupted', 'false')) = 'true' then score_value := score_value + 250; end if;
    end if;
    return greatest(1, least(9000000000000000, round(score_value)))::bigint;
end;
$$;

create or replace function public.hall_item_price(item_data jsonb)
returns integer language plpgsql immutable set search_path = public as $$
declare score_value bigint := public.hall_item_score(item_data);
begin
    if item_data ->> 'rarity' = 'unique' then
        return greatest(350, least(12000, ceil(score_value::numeric / 14)::integer));
    end if;
    return greatest(75, least(6000, ceil(score_value::numeric / 18)::integer));
end;
$$;

create or replace function public.validate_hall_item(item_data jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare
    max_stat_lines integer := 8;
begin
    if item_data ->> 'rarity' = 'rare' then max_stat_lines := 7; end if;
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
       or jsonb_array_length(public.hall_array(item_data -> 'stats')) > max_stat_lines
       or jsonb_typeof(item_data -> 'baseStats') is distinct from 'array'
       or jsonb_array_length(public.hall_array(item_data -> 'baseStats')) > 8
       or exists (select 1 from (
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'stats'))
               union all
               select value stat from jsonb_array_elements(public.hall_array(item_data -> 'baseStats'))
           ) item_stats where jsonb_typeof(stat) is distinct from 'object'
              or length(coalesce(stat ->> 'id', '')) not between 1 and 80
              or jsonb_typeof(stat -> 'val') is distinct from 'number'
              or abs(public.hall_number(stat -> 'val', 0, -9000000000001, 9000000000001)) > 9000000000000) then
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
                 where jsonb_typeof(stat -> 'tier') is distinct from 'number'
                    or public.hall_number(stat -> 'tier', 0, -1, 21) not between 1 and least(20,
                        public.hall_number(coalesce(item_data -> 'affixTierCap', item_data -> 'hiddenTier'), 1, 1, 20)))
        or exists (select 1 from jsonb_array_elements(public.hall_array(item_data -> 'stats')) stat
                    group by stat ->> 'id' having count(*) > 1)
    ) then raise exception 'HALL_ITEM_REJECTED'; end if;
end;
$$;

create or replace function public.get_hall_item_from_save(save_data jsonb, item_key uuid)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
    matches jsonb;
    match_count integer;
begin
    select count(*), jsonb_agg(entry) into match_count, matches
      from jsonb_array_elements(public.hall_array(save_data -> 'inventory')) entry
     where entry ->> 'tradeKey' = item_key::text;
    if match_count > 1 then raise exception 'HALL_ITEM_KEY_CONFLICT'; end if;
    if match_count = 0 then return null; end if;
    return matches -> 0;
end;
$$;

create or replace function public.quote_hall_item(p_item_key uuid, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    item_data jsonb;
    score_value bigint;
    price_value integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    item_data := public.get_hall_item_from_save(save_row.save_data, p_item_key);
    if item_data is null then raise exception 'HALL_ITEM_NOT_FOUND'; end if;
    perform public.validate_hall_item(item_data);
    score_value := public.hall_item_score(item_data);
    price_value := public.hall_item_price(item_data);
    return jsonb_build_object('score', score_value, 'price', price_value,
        'honorPerCopy', greatest(1, least(50, ceil(price_value::numeric / 200)::integer)));
end;
$$;

create or replace function public.create_hall_listing(p_item_key uuid, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    item_data jsonb;
    remaining_inventory jsonb;
    listing_row public.hall_listings%rowtype;
    registry_row public.hall_item_registry%rowtype;
    profile_name text;
    score_value bigint;
    price_value integer;
    honor_value integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    if (select count(*) from public.hall_listings where curator_id = account_id and status in ('open','sold_out')) >= 3 then raise exception 'HALL_LISTING_LIMIT'; end if;
    if exists (select 1 from public.hall_listings where curator_id = account_id and created_at > now() - interval '5 seconds') then raise exception 'HALL_RATE_LIMIT'; end if;
    if (select count(*) from public.hall_listings where curator_id = account_id and created_at > now() - interval '1 day') >= 20 then raise exception 'HALL_LISTING_DAILY_LIMIT'; end if;
    item_data := public.get_hall_item_from_save(save_row.save_data, p_item_key);
    if item_data is null then raise exception 'HALL_ITEM_NOT_FOUND'; end if;
    perform public.validate_hall_item(item_data);
    select * into registry_row from public.hall_item_registry where item_key = p_item_key for update;
    if found and registry_row.owner_id = account_id and registry_row.state = 'retired' then raise exception 'HALL_RELIST_BLOCKED'; end if;
    if found and (registry_row.owner_id <> account_id or registry_row.state <> 'inventory') then raise exception 'HALL_ITEM_OWNERSHIP'; end if;

    score_value := public.hall_item_score(item_data);
    price_value := public.hall_item_price(item_data);
    honor_value := greatest(1, least(50, ceil(price_value::numeric / 200)::integer));
    select nickname into profile_name from public.player_profiles where user_id = account_id;
    profile_name := left(coalesce(nullif(trim(profile_name), ''), '익명'), 24);
    insert into public.hall_listings(curator_id, curator_name, item_key, item_snapshot, item_score, price, honor_per_copy)
    values (account_id, profile_name, p_item_key, item_data, score_value, price_value, honor_value)
    returning * into listing_row;
    item_data := jsonb_set(item_data, '{id}', to_jsonb(9100000000000::bigint + listing_row.id), true);
    update public.hall_listings set item_snapshot = item_data where id = listing_row.id;

    remaining_inventory := coalesce((
        select jsonb_agg(entry order by ordinal)
          from jsonb_array_elements(public.hall_array(save_row.save_data -> 'inventory')) with ordinality rows(entry, ordinal)
         where coalesce(entry ->> 'tradeKey', '') <> p_item_key::text
    ), '[]'::jsonb);
    update public.cloud_saves set save_data = jsonb_set(save_data, '{inventory}', remaining_inventory, true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    insert into public.hall_item_registry(item_key, owner_id, state, listing_id)
    values (p_item_key, account_id, 'hall', listing_row.id)
    on conflict (item_key) do update set state = 'hall', listing_id = excluded.listing_id, updated_at = now();
    return jsonb_build_object('listingId', listing_row.id, 'item', item_data, 'score', score_value,
        'price', price_value, 'honorPerCopy', honor_value, 'currentRevision', save_row.revision + 1, 'status', 'open');
end;
$$;

create or replace function public.withdraw_hall_listing(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.hall_listings%rowtype;
    save_row public.cloud_saves%rowtype;
    inventory jsonb;
    returned_item jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.hall_listings where id = p_listing_id for update;
    if not found or listing_row.curator_id <> account_id or listing_row.status not in ('open','sold_out') then raise exception 'HALL_LISTING_NOT_ACTIVE'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    inventory := public.hall_array(save_row.save_data -> 'inventory');
    if jsonb_array_length(inventory) >= public.hall_inventory_limit(save_row.save_data) then raise exception 'HALL_INVENTORY_FULL'; end if;
    returned_item := listing_row.item_snapshot;
    if listing_row.copies_sold > 0 then returned_item := jsonb_set(returned_item, '{hallRelistBlocked}', 'true'::jsonb, true); end if;
    update public.cloud_saves set save_data = jsonb_set(save_data, '{inventory}', inventory || jsonb_build_array(returned_item), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.hall_listings set status = 'withdrawn', retired_at = now() where id = listing_row.id;
    update public.hall_item_registry set state = case when listing_row.copies_sold > 0 then 'retired' else 'inventory' end,
        source_listing_id = case when listing_row.copies_sold > 0 then listing_row.id else source_listing_id end, updated_at = now()
     where item_key = listing_row.item_key and owner_id = account_id and state = 'hall';
    if not found then raise exception 'HALL_ITEM_OWNERSHIP'; end if;
    return jsonb_build_object('listingId', listing_row.id, 'item', returned_item,
        'currentRevision', save_row.revision + 1, 'status', 'withdrawn');
end;
$$;

create or replace function public.buy_hall_replica(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.hall_listings%rowtype;
    buyer_save public.cloud_saves%rowtype;
    buyer_currency bigint;
    buyer_inventory jsonb;
    purchase_row public.hall_purchases%rowtype;
    replica_key uuid := gen_random_uuid();
    replica_data jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.hall_listings where id = p_listing_id for update;
    if not found or listing_row.status <> 'open' or listing_row.copies_sold >= listing_row.copy_cap then raise exception 'HALL_LISTING_NOT_ACTIVE'; end if;
    if listing_row.curator_id = account_id then raise exception 'HALL_SELF_PURCHASE'; end if;
    if exists (select 1 from public.hall_purchases where listing_id = p_listing_id and buyer_id = account_id) then raise exception 'HALL_ALREADY_COLLECTED'; end if;
    if exists (select 1 from public.hall_purchases where buyer_id = account_id and purchased_at > now() - interval '10 seconds') then raise exception 'HALL_RATE_LIMIT'; end if;
    if (select count(*) from public.hall_purchases where buyer_id = account_id and purchased_at > now() - interval '1 day') >= 10 then raise exception 'HALL_DAILY_LIMIT'; end if;
    select * into buyer_save from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if buyer_save.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    buyer_currency := greatest(0, coalesce((buyer_save.save_data #>> '{currencies,goldenRule}')::bigint, 0));
    if buyer_currency < listing_row.price then raise exception 'HALL_CURRENCY_SHORTAGE'; end if;
    buyer_inventory := public.hall_array(buyer_save.save_data -> 'inventory');
    if jsonb_array_length(buyer_inventory) >= public.hall_inventory_limit(buyer_save.save_data) then raise exception 'HALL_INVENTORY_FULL'; end if;

    insert into public.hall_purchases(listing_id, buyer_id, replica_key, price)
    values (listing_row.id, account_id, replica_key, listing_row.price) returning * into purchase_row;
    replica_data := listing_row.item_snapshot || jsonb_build_object(
        'id', 9200000000000::bigint + purchase_row.id, 'tradeKey', replica_key::text,
        'locked', true, 'tradeLocked', true, 'hallReplica', true, 'hallSourceId', listing_row.id,
        'hallCuratorName', listing_row.curator_name, 'hallAppraisalScore', listing_row.item_score);
    update public.cloud_saves set save_data = jsonb_set(
            jsonb_set(save_data, '{currencies,goldenRule}', to_jsonb(buyer_currency - listing_row.price), true),
            '{inventory}', buyer_inventory || jsonb_build_array(replica_data), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.hall_listings set copies_sold = copies_sold + 1,
        status = case when copies_sold + 1 >= copy_cap then 'sold_out' else status end,
        retired_at = case when copies_sold + 1 >= copy_cap then now() else retired_at end
     where id = listing_row.id;
    insert into public.hall_curator_profiles(user_id, honor, copies_shared)
    values (listing_row.curator_id, listing_row.honor_per_copy, 1)
    on conflict (user_id) do update set honor = hall_curator_profiles.honor + excluded.honor,
        copies_shared = hall_curator_profiles.copies_shared + 1, updated_at = now();
    insert into public.hall_item_registry(item_key, owner_id, state, source_listing_id)
    values (replica_key, account_id, 'inventory', listing_row.id);
    return jsonb_build_object('listingId', listing_row.id, 'item', replica_data, 'price', listing_row.price,
        'goldenRule', buyer_currency - listing_row.price, 'currentRevision', buyer_save.revision + 1,
        'copiesSold', listing_row.copies_sold + 1,
        'status', case when listing_row.copies_sold + 1 >= listing_row.copy_cap then 'sold_out' else 'open' end);
end;
$$;

create or replace function public.submit_player_ranking(p_dps bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    profile_name text;
    loop_value integer;
    ranking_today date := (now() at time zone 'Asia/Seoul')::date;
    affected_rows integer;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_dps < 0 or p_dps > 9000000000000000 then raise exception 'RANKING_INVALID_DPS'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id;
    if not found or save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    loop_value := greatest(1, least(100000, coalesce(
        case when jsonb_typeof(save_row.save_data -> 'season') = 'number'
             then (save_row.save_data ->> 'season')::integer end, 1)));
    select nickname into profile_name from public.player_profiles where user_id = account_id;
    insert into public.player_rankings(user_id, nickname, loop_count, dps, ascend_class, active_skill, save_revision, ranking_day, updated_at)
    values (account_id, left(coalesce(nullif(trim(profile_name), ''), '익명'), 24), loop_value, p_dps,
        left(coalesce(save_row.save_data ->> 'ascendClass', ''), 32),
        left(coalesce(save_row.save_data ->> 'activeSkill', ''), 48), save_row.revision, ranking_today, now())
    on conflict (user_id) do update set nickname = excluded.nickname, loop_count = excluded.loop_count,
        dps = excluded.dps, ascend_class = excluded.ascend_class, active_skill = excluded.active_skill,
        save_revision = excluded.save_revision, ranking_day = excluded.ranking_day, updated_at = excluded.updated_at
        where player_rankings.ranking_day < excluded.ranking_day;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'RANKING_DAILY_LIMIT'; end if;
    return jsonb_build_object('loopCount', loop_value, 'dps', p_dps,
        'saveRevision', save_row.revision, 'rankingDay', ranking_today);
end;
$$;

create or replace function public.get_player_hall()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    ranking_today date := (now() at time zone 'Asia/Seoul')::date;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    return jsonb_build_object(
        'listings', coalesce((select jsonb_agg(row_data order by (row_data ->> 'score')::bigint desc, (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'curatorName', listing.curator_name,
                'item', listing.item_snapshot, 'score', listing.item_score, 'price', listing.price,
                'honorPerCopy', listing.honor_per_copy, 'copiesSold', listing.copies_sold,
                'copyCap', listing.copy_cap, 'createdAt', listing.created_at,
                'isMine', listing.curator_id = account_id,
                'alreadyCollected', exists(select 1 from public.hall_purchases purchase
                    where purchase.listing_id = listing.id and purchase.buyer_id = account_id)) row_data
              from public.hall_listings listing where listing.status = 'open'
             order by listing.item_score desc, listing.created_at desc limit 80) open_rows), '[]'::jsonb),
        'mine', coalesce((select jsonb_agg(row_data order by (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'item', listing.item_snapshot,
                'score', listing.item_score, 'price', listing.price, 'status', listing.status,
                'copiesSold', listing.copies_sold, 'copyCap', listing.copy_cap, 'createdAt', listing.created_at) row_data
              from public.hall_listings listing where listing.curator_id = account_id
                and listing.status in ('open','sold_out')
             order by listing.created_at desc limit 20) mine_rows), '[]'::jsonb),
        'honor', coalesce((select honor from public.hall_curator_profiles where user_id = account_id), 0),
        'copiesShared', coalesce((select copies_shared from public.hall_curator_profiles where user_id = account_id), 0),
        'collectionCount', (select count(*) from public.hall_purchases where buyer_id = account_id),
        'loopRanking', coalesce((select jsonb_agg(to_jsonb(ranked) - 'user_id') from (
            select nickname, loop_count, dps, ascend_class, active_skill, updated_at
              from public.player_rankings where ranking_day = ranking_today
             order by loop_count desc, dps desc, updated_at asc limit 50) ranked), '[]'::jsonb),
        'dpsRanking', coalesce((select jsonb_agg(to_jsonb(ranked) - 'user_id') from (
            select nickname, loop_count, dps, ascend_class, active_skill, updated_at
              from public.player_rankings where ranking_day = ranking_today
             order by dps desc, loop_count desc, updated_at asc limit 50) ranked), '[]'::jsonb),
        'rankingDay', ranking_today,
        'rankingSubmittedToday', exists(select 1 from public.player_rankings
            where user_id = account_id and ranking_day = ranking_today)
    );
end;
$$;

revoke all on function public.hall_inventory_limit(jsonb) from public, anon, authenticated;
revoke all on function public.hall_number(jsonb, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.hall_array(jsonb) from public, anon, authenticated;
revoke all on function public.hall_roll_quality(jsonb) from public, anon, authenticated;
revoke all on function public.hall_affix_weight(text) from public, anon, authenticated;
revoke all on function public.hall_base_stat_weight(text) from public, anon, authenticated;
revoke all on function public.hall_item_score(jsonb) from public, anon, authenticated;
revoke all on function public.hall_item_price(jsonb) from public, anon, authenticated;
revoke all on function public.validate_hall_item(jsonb) from public, anon, authenticated;
revoke all on function public.get_hall_item_from_save(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.quote_hall_item(uuid, bigint) from public, anon;
revoke all on function public.create_hall_listing(uuid, bigint) from public, anon;
revoke all on function public.withdraw_hall_listing(bigint, bigint) from public, anon;
revoke all on function public.buy_hall_replica(bigint, bigint) from public, anon;
revoke all on function public.submit_player_ranking(bigint, bigint) from public, anon;
revoke all on function public.get_player_hall() from public, anon;
grant execute on function public.quote_hall_item(uuid, bigint) to authenticated;
grant execute on function public.create_hall_listing(uuid, bigint) to authenticated;
grant execute on function public.withdraw_hall_listing(bigint, bigint) to authenticated;
grant execute on function public.buy_hall_replica(bigint, bigint) to authenticated;
grant execute on function public.submit_player_ranking(bigint, bigint) to authenticated;
grant execute on function public.get_player_hall() to authenticated;

commit;
