-- 로그인 플레이어 간 장비 거래와 참고용 루프/DPS 랭킹.
-- db/cloud-and-playtest.sql, db/social.sql 실행 후 Supabase SQL Editor에서 한 번 실행한다.
-- 거래는 서버의 클라우드 저장을 직접 잠그고 수정하므로 구매/판매 도중 재화·아이템이 복제되지 않는다.

begin;

create table if not exists public.trade_item_registry (
    item_key uuid primary key,
    owner_id uuid not null references auth.users(id) on delete cascade,
    state text not null check (state in ('inventory', 'escrow')),
    last_listing_id bigint,
    updated_at timestamptz not null default now()
);

create table if not exists public.player_trade_listings (
    id bigint generated always as identity primary key,
    seller_id uuid not null references auth.users(id) on delete cascade,
    seller_name text not null,
    buyer_id uuid references auth.users(id) on delete set null,
    item_key uuid not null,
    item_snapshot jsonb not null,
    price integer not null check (price between 1 and 9999),
    status text not null default 'open' check (status in ('open', 'sold', 'cancelled')),
    created_at timestamptz not null default now(),
    completed_at timestamptz,
    proceeds_claimed_at timestamptz
);

alter table public.player_trade_listings add column if not exists proceeds_claimed_at timestamptz;

create index if not exists player_trade_open_created_idx
    on public.player_trade_listings(status, created_at desc);
create index if not exists player_trade_seller_created_idx
    on public.player_trade_listings(seller_id, created_at desc);
create unique index if not exists trade_item_single_open_idx
    on public.player_trade_listings(item_key) where status = 'open';

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
update public.player_rankings
   set ranking_day = (updated_at at time zone 'Asia/Seoul')::date
 where ranking_day is null;
alter table public.player_rankings alter column ranking_day set not null;
alter table public.player_rankings alter column ranking_day
    set default ((now() at time zone 'Asia/Seoul')::date);

create index if not exists player_rankings_loop_idx
    on public.player_rankings(loop_count desc, dps desc, updated_at asc);
create index if not exists player_rankings_dps_idx
    on public.player_rankings(dps desc, loop_count desc, updated_at asc);
create index if not exists player_rankings_daily_loop_idx
    on public.player_rankings(ranking_day, loop_count desc, dps desc, updated_at asc);
create index if not exists player_rankings_daily_dps_idx
    on public.player_rankings(ranking_day, dps desc, loop_count desc, updated_at asc);

alter table public.trade_item_registry enable row level security;
alter table public.player_trade_listings enable row level security;
alter table public.player_rankings enable row level security;
revoke all on public.trade_item_registry from anon, authenticated;
revoke all on public.player_trade_listings from anon, authenticated;
revoke all on public.player_rankings from anon, authenticated;

create or replace function public.trade_inventory_limit(save_data jsonb)
returns integer language sql immutable set search_path = public as $$
    select 30 + greatest(0, coalesce(
        case when jsonb_typeof(save_data -> 'inventoryExpandLevel') = 'number'
             then (save_data ->> 'inventoryExpandLevel')::integer end, 0)) * 5;
$$;

create or replace function public.create_trade_listing(p_item_key uuid, p_price integer, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    item_data jsonb;
    listing_row public.player_trade_listings%rowtype;
    registry_row public.trade_item_registry%rowtype;
    profile_name text;
    remaining_inventory jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_item_key is null or p_price not between 1 and 9999 then raise exception 'TRADE_INVALID_INPUT'; end if;

    -- The cloud row is also the per-account trade mutex. Limits must be checked
    -- after this lock, otherwise simultaneous requests can both pass them.
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    if (select count(*) from public.player_trade_listings where seller_id = account_id and status = 'open') >= 8 then
        raise exception 'TRADE_LISTING_LIMIT';
    end if;
    if exists (select 1 from public.player_trade_listings where seller_id = account_id and created_at > now() - interval '5 seconds') then
        raise exception 'TRADE_RATE_LIMIT';
    end if;
    if (select count(*) from public.player_trade_listings where seller_id = account_id and created_at > now() - interval '1 day') >= 50 then
        raise exception 'TRADE_DAILY_LIMIT';
    end if;

    select entry into item_data
      from jsonb_array_elements(coalesce(save_row.save_data -> 'inventory', '[]'::jsonb)) entry
     where entry ->> 'tradeKey' = p_item_key::text limit 1;
    if item_data is null then raise exception 'TRADE_ITEM_NOT_FOUND'; end if;
    if jsonb_typeof(item_data) <> 'object'
       or length(coalesce(item_data ->> 'name', '')) not between 1 and 80
       or coalesce(item_data ->> 'slot', '') not in ('무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패')
       or coalesce(item_data ->> 'rarity', '') not in ('normal','magic','rare','unique')
       or octet_length(item_data::text) > 24000
       or lower(coalesce(item_data ->> 'locked', 'false')) = 'true'
       or lower(coalesce(item_data ->> 'tradeLocked', 'false')) = 'true' then
        raise exception 'TRADE_ITEM_REJECTED';
    end if;
    if jsonb_typeof(coalesce(item_data -> 'stats', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(item_data -> 'stats', '[]'::jsonb)) > 8
       or exists (
            select 1 from jsonb_array_elements(coalesce(item_data -> 'stats', '[]'::jsonb)) stat
             where jsonb_typeof(stat) <> 'object'
                or length(coalesce(stat ->> 'id', '')) not between 1 and 80
                or jsonb_typeof(stat -> 'val') <> 'number'
                or abs((stat ->> 'val')::numeric) > 9000000000000
       ) then
        raise exception 'TRADE_ITEM_REJECTED';
    end if;

    select * into registry_row from public.trade_item_registry where item_key = p_item_key for update;
    if found and (registry_row.owner_id <> account_id or registry_row.state <> 'inventory') then
        raise exception 'TRADE_ITEM_OWNERSHIP';
    end if;

    select nickname into profile_name from public.player_profiles where user_id = account_id;
    profile_name := left(coalesce(nullif(trim(profile_name), ''), '익명'), 24);
    insert into public.player_trade_listings(seller_id, seller_name, item_key, item_snapshot, price)
    values (account_id, profile_name, p_item_key, item_data, p_price) returning * into listing_row;
    item_data := jsonb_set(item_data, '{id}', to_jsonb(9000000000000::bigint + listing_row.id), true);
    update public.player_trade_listings set item_snapshot = item_data where id = listing_row.id;

    remaining_inventory := coalesce((
        select jsonb_agg(entry order by ordinal)
          from jsonb_array_elements(coalesce(save_row.save_data -> 'inventory', '[]'::jsonb)) with ordinality rows(entry, ordinal)
         where coalesce(entry ->> 'tradeKey', '') <> p_item_key::text
    ), '[]'::jsonb);
    update public.cloud_saves
       set save_data = jsonb_set(save_data, '{inventory}', remaining_inventory, true),
           revision = revision + 1, updated_at = now()
     where user_id = account_id;
    insert into public.trade_item_registry(item_key, owner_id, state, last_listing_id)
    values (p_item_key, account_id, 'escrow', listing_row.id)
    on conflict (item_key) do update set state = 'escrow', last_listing_id = excluded.last_listing_id, updated_at = now();

    return jsonb_build_object('listingId', listing_row.id, 'item', item_data,
        'currentRevision', save_row.revision + 1, 'status', 'open');
end;
$$;

create or replace function public.cancel_trade_listing(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.player_trade_listings%rowtype;
    save_row public.cloud_saves%rowtype;
    inventory jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.player_trade_listings where id = p_listing_id for update;
    if not found or listing_row.seller_id <> account_id or listing_row.status <> 'open' then raise exception 'TRADE_LISTING_NOT_OPEN'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    inventory := coalesce(save_row.save_data -> 'inventory', '[]'::jsonb);
    if jsonb_array_length(inventory) >= public.trade_inventory_limit(save_row.save_data) then raise exception 'TRADE_INVENTORY_FULL'; end if;

    update public.cloud_saves
       set save_data = jsonb_set(save_data, '{inventory}', inventory || jsonb_build_array(listing_row.item_snapshot), true),
           revision = revision + 1, updated_at = now()
     where user_id = account_id;
    update public.player_trade_listings set status = 'cancelled', completed_at = now() where id = listing_row.id;
    update public.trade_item_registry set state = 'inventory', updated_at = now()
     where item_key = listing_row.item_key and owner_id = account_id;
    if not found then raise exception 'TRADE_ITEM_OWNERSHIP'; end if;
    return jsonb_build_object('listingId', listing_row.id, 'item', listing_row.item_snapshot,
        'currentRevision', save_row.revision + 1, 'status', 'cancelled');
end;
$$;

create or replace function public.buy_trade_listing(p_listing_id bigint, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    listing_row public.player_trade_listings%rowtype;
    buyer_save public.cloud_saves%rowtype;
    buyer_currency bigint;
    buyer_inventory jsonb;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into listing_row from public.player_trade_listings where id = p_listing_id for update;
    if not found or listing_row.status <> 'open' then raise exception 'TRADE_LISTING_NOT_OPEN'; end if;
    if listing_row.seller_id = account_id then raise exception 'TRADE_SELF_PURCHASE'; end if;
    select * into buyer_save from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if buyer_save.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    if exists (select 1 from public.player_trade_listings where buyer_id = account_id and completed_at > now() - interval '10 seconds') then
        raise exception 'TRADE_RATE_LIMIT';
    end if;
    if (select count(*) from public.player_trade_listings where buyer_id = account_id and completed_at > now() - interval '1 day') >= 50 then
        raise exception 'TRADE_DAILY_LIMIT';
    end if;
    buyer_currency := greatest(0, coalesce((buyer_save.save_data #>> '{currencies,goldenRule}')::bigint, 0));
    if buyer_currency < listing_row.price then raise exception 'TRADE_CURRENCY_SHORTAGE'; end if;
    buyer_inventory := coalesce(buyer_save.save_data -> 'inventory', '[]'::jsonb);
    if jsonb_array_length(buyer_inventory) >= public.trade_inventory_limit(buyer_save.save_data) then raise exception 'TRADE_INVENTORY_FULL'; end if;

    update public.cloud_saves set save_data = jsonb_set(
            jsonb_set(save_data, '{currencies,goldenRule}', to_jsonb(buyer_currency - listing_row.price), true),
            '{inventory}', buyer_inventory || jsonb_build_array(listing_row.item_snapshot), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.player_trade_listings set status = 'sold', buyer_id = account_id, completed_at = now() where id = listing_row.id;
    update public.trade_item_registry set owner_id = account_id, state = 'inventory', updated_at = now()
     where item_key = listing_row.item_key and owner_id = listing_row.seller_id and state = 'escrow';
    if not found then raise exception 'TRADE_ITEM_OWNERSHIP'; end if;

    return jsonb_build_object('listingId', listing_row.id, 'item', listing_row.item_snapshot,
        'price', listing_row.price, 'goldenRule', buyer_currency - listing_row.price,
        'currentRevision', buyer_save.revision + 1, 'status', 'sold');
end;
$$;

create or replace function public.claim_trade_proceeds(p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    save_row public.cloud_saves%rowtype;
    current_currency bigint;
    claim_value bigint;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    select * into save_row from public.cloud_saves where user_id = account_id for update;
    if not found then raise exception 'CLOUD_SAVE_NOT_FOUND'; end if;
    if save_row.revision <> greatest(0, p_expected_revision) then raise exception 'CLOUD_REVISION_CONFLICT'; end if;
    perform 1 from public.player_trade_listings
     where seller_id = account_id and status = 'sold' and proceeds_claimed_at is null
     order by id for update;
    select coalesce(sum(price), 0) into claim_value from public.player_trade_listings
     where seller_id = account_id and status = 'sold' and proceeds_claimed_at is null;
    if claim_value <= 0 then raise exception 'TRADE_NO_PROCEEDS'; end if;
    current_currency := greatest(0, coalesce((save_row.save_data #>> '{currencies,goldenRule}')::bigint, 0));
    if current_currency + claim_value > 9000000000000000 then raise exception 'TRADE_CURRENCY_OVERFLOW'; end if;

    update public.cloud_saves set save_data = jsonb_set(save_data, '{currencies,goldenRule}',
            to_jsonb(current_currency + claim_value), true),
        revision = revision + 1, updated_at = now() where user_id = account_id;
    update public.player_trade_listings set proceeds_claimed_at = now()
     where seller_id = account_id and status = 'sold' and proceeds_claimed_at is null;
    return jsonb_build_object('claimed', claim_value, 'goldenRule', current_currency + claim_value,
        'currentRevision', save_row.revision + 1);
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

create or replace function public.get_player_exchange()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    account_id uuid := auth.uid();
    ranking_today date := (now() at time zone 'Asia/Seoul')::date;
begin
    if account_id is null then raise exception 'AUTH_REQUIRED'; end if;
    return jsonb_build_object(
        'listings', coalesce((select jsonb_agg(row_data order by (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'sellerName', listing.seller_name,
                'item', listing.item_snapshot, 'price', listing.price, 'createdAt', listing.created_at,
                'isMine', listing.seller_id = account_id) row_data
              from public.player_trade_listings listing where listing.status = 'open'
             order by listing.created_at desc limit 80) open_rows), '[]'::jsonb),
        'mine', coalesce((select jsonb_agg(row_data order by (row_data ->> 'createdAt') desc) from (
            select jsonb_build_object('id', listing.id, 'item', listing.item_snapshot,
                'price', listing.price, 'status', listing.status, 'createdAt', listing.created_at) row_data
              from public.player_trade_listings listing where listing.seller_id = account_id
             order by listing.created_at desc limit 20) mine_rows), '[]'::jsonb),
        'unclaimedProceeds', coalesce((select sum(listing.price) from public.player_trade_listings listing
            where listing.seller_id = account_id and listing.status = 'sold' and listing.proceeds_claimed_at is null), 0),
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

revoke all on function public.trade_inventory_limit(jsonb) from public, anon, authenticated;
revoke all on function public.create_trade_listing(uuid, integer, bigint) from public, anon;
revoke all on function public.cancel_trade_listing(bigint, bigint) from public, anon;
revoke all on function public.buy_trade_listing(bigint, bigint) from public, anon;
revoke all on function public.claim_trade_proceeds(bigint) from public, anon;
revoke all on function public.submit_player_ranking(bigint, bigint) from public, anon;
revoke all on function public.get_player_exchange() from public, anon;
grant execute on function public.create_trade_listing(uuid, integer, bigint) to authenticated;
grant execute on function public.cancel_trade_listing(bigint, bigint) to authenticated;
grant execute on function public.buy_trade_listing(bigint, bigint) to authenticated;
grant execute on function public.claim_trade_proceeds(bigint) to authenticated;
grant execute on function public.submit_player_ranking(bigint, bigint) to authenticated;
grant execute on function public.get_player_exchange() to authenticated;

commit;
