-- 로그인 계정 저장과 최소 플레이테스트 계측.
-- Supabase SQL Editor에서 한 번 실행한다. 반복 실행해도 안전하다.

create table if not exists public.cloud_saves (
    user_id uuid primary key references auth.users(id) on delete cascade,
    save_data jsonb not null,
    revision bigint not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.cloud_saves add column if not exists revision bigint not null default 0;
alter table public.cloud_saves enable row level security;

do $$
declare policy_row record;
begin
    for policy_row in select policyname from pg_policies where schemaname = 'public' and tablename = 'cloud_saves'
    loop execute format('drop policy if exists %I on public.cloud_saves', policy_row.policyname); end loop;
end;
$$;

drop policy if exists "cloud_saves_select_own" on public.cloud_saves;
create policy "cloud_saves_select_own" on public.cloud_saves
    for select to authenticated using (auth.uid() = user_id);

drop policy if exists "cloud_saves_insert_own" on public.cloud_saves;
create policy "cloud_saves_insert_own" on public.cloud_saves
    for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "cloud_saves_update_own" on public.cloud_saves;
create policy "cloud_saves_update_own" on public.cloud_saves
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.commit_cloud_save(expected_revision bigint, next_save_data jsonb)
returns table(committed boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
set search_path = public
as $$
declare
    stored_revision bigint;
begin
    if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
    if next_save_data is null then raise exception 'SAVE_DATA_REQUIRED'; end if;

    select revision into stored_revision
      from public.cloud_saves
     where user_id = auth.uid()
     for update;

    if not found then
        if greatest(expected_revision, 0) <> 0 then
            return query select false, 0::bigint, null::timestamptz;
            return;
        end if;
        insert into public.cloud_saves(user_id, save_data, revision, updated_at)
        values (auth.uid(), next_save_data, 1, now());
        return query select true, 1::bigint, now();
        return;
    end if;

    if stored_revision <> greatest(expected_revision, 0) then
        return query select false, stored_revision, (select updated_at from public.cloud_saves where user_id = auth.uid());
        return;
    end if;

    update public.cloud_saves
       set save_data = next_save_data, revision = stored_revision + 1, updated_at = now()
     where user_id = auth.uid();
    return query select true, stored_revision + 1, now();
end;
$$;

grant execute on function public.commit_cloud_save(bigint, jsonb) to authenticated;

create table if not exists public.playtest_runs (
    id bigint generated always as identity primary key,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    session_id uuid not null,
    zone_id text not null,
    zone_type text not null,
    loop integer not null check (loop >= 1),
    ascend_class text,
    hero_id text,
    active_skill text,
    result text not null check (result in ('clear', 'death')),
    duration_ms integer not null check (duration_ms between 0 and 86400000),
    dps bigint not null default 0,
    ehp_min bigint not null default 0,
    ehp_by_element jsonb not null default '{}'::jsonb,
    frame_p95_ms numeric(8,2),
    long_frames integer not null default 0,
    peak_fx integer not null default 0,
    app_version text not null,
    platform text not null,
    created_at timestamptz not null default now()
);

create index if not exists playtest_runs_user_created_idx on public.playtest_runs(user_id, created_at desc);
create index if not exists playtest_runs_class_created_idx on public.playtest_runs(ascend_class, created_at desc);
alter table public.playtest_runs enable row level security;

drop policy if exists "playtest_runs_insert_own" on public.playtest_runs;
create policy "playtest_runs_insert_own" on public.playtest_runs
    for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.guard_playtest_run_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    delete from public.playtest_runs where created_at < now() - interval '30 days';
    if (select count(*) from public.playtest_runs where user_id = new.user_id and created_at >= now() - interval '1 day') >= 60 then
        raise exception 'PLAYTEST_DAILY_LIMIT';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_playtest_run_insert on public.playtest_runs;
create trigger trg_guard_playtest_run_insert before insert on public.playtest_runs
    for each row execute function public.guard_playtest_run_insert();

create table if not exists public.client_error_reports (
    id bigint generated always as identity primary key,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    fingerprint text not null,
    message text not null check (char_length(message) between 1 and 1000),
    stack text check (char_length(stack) <= 5000),
    context jsonb not null default '{}'::jsonb,
    app_version text not null,
    created_at timestamptz not null default now()
);

create index if not exists client_errors_user_created_idx on public.client_error_reports(user_id, created_at desc);
alter table public.client_error_reports enable row level security;

drop policy if exists "client_error_reports_insert_own" on public.client_error_reports;
create policy "client_error_reports_insert_own" on public.client_error_reports
    for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.guard_client_error_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    delete from public.client_error_reports where created_at < now() - interval '30 days';
    if exists (
        select 1 from public.client_error_reports
         where user_id = new.user_id and fingerprint = new.fingerprint
           and created_at >= now() - interval '10 minutes'
    ) then raise exception 'ERROR_DUPLICATE_LIMIT'; end if;
    if (select count(*) from public.client_error_reports where user_id = new.user_id and created_at >= now() - interval '1 day') >= 20 then
        raise exception 'ERROR_DAILY_LIMIT';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_client_error_insert on public.client_error_reports;
create trigger trg_guard_client_error_insert before insert on public.client_error_reports
    for each row execute function public.guard_client_error_insert();

create or replace view public.playtest_class_stats_30d
with (security_invoker = true) as
select
    coalesce(ascend_class, 'unascended') as ascend_class,
    count(distinct user_id) as players,
    count(*) as runs,
    round(100.0 * count(*) filter (where result = 'clear') / nullif(count(*), 0), 1) as clear_rate_pct,
    percentile_cont(0.5) within group (order by duration_ms) filter (where result = 'clear') as median_clear_ms,
    percentile_cont(0.5) within group (order by dps) as median_dps,
    percentile_cont(0.5) within group (order by ehp_min) as median_ehp
from public.playtest_runs
where created_at >= now() - interval '30 days'
group by coalesce(ascend_class, 'unascended')
having count(distinct user_id) >= 3;

-- 원시 기록과 집계 뷰는 게임 클라이언트가 읽지 않는다. 통계는 Supabase Dashboard에서 조회한다.
revoke all on public.playtest_runs, public.client_error_reports, public.playtest_class_stats_30d from anon, authenticated;
grant insert on public.playtest_runs, public.client_error_reports to authenticated;
grant usage, select on sequence public.playtest_runs_id_seq, public.client_error_reports_id_seq to authenticated;
