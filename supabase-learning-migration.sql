-- Execute uma vez no SQL Editor do projeto fala-real-soletra.
create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique(account_id, display_name)
);
create table if not exists public.learning_attempts (
  id bigint generated always as identity primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  module text not null,
  subject text not null,
  score integer not null default 0 check(score>=0),
  accuracy integer not null default 0 check(accuracy between 0 and 100),
  errors integer not null default 0 check(errors>=0),
  duration_seconds integer not null default 0 check(duration_seconds>=0),
  created_at timestamptz not null default now()
);
create or replace function public.enforce_two_children() returns trigger language plpgsql as $$ begin
  if (select count(*) from public.child_profiles where account_id=new.account_id)>=2 then raise exception 'child limit reached'; end if;
  return new;
end $$;
drop trigger if exists child_profile_limit on public.child_profiles;
create trigger child_profile_limit before insert on public.child_profiles for each row execute function public.enforce_two_children();
alter table public.child_profiles enable row level security;
alter table public.learning_attempts enable row level security;
drop policy if exists "family owns children" on public.child_profiles;
create policy "family owns children" on public.child_profiles for all to authenticated using(account_id=auth.uid() or public.current_user_is_education_staff()) with check(account_id=auth.uid());
drop policy if exists "family owns attempts" on public.learning_attempts;
create policy "family owns attempts" on public.learning_attempts for select to authenticated using(account_id=auth.uid() or public.current_user_is_education_staff());
drop policy if exists "family inserts attempts" on public.learning_attempts;
create policy "family inserts attempts" on public.learning_attempts for insert to authenticated with check(account_id=auth.uid() and (child_id is null or exists(select 1 from public.child_profiles c where c.id=child_id and c.account_id=auth.uid())));
grant select,insert,update,delete on public.child_profiles to authenticated;
grant select,insert on public.learning_attempts to authenticated;
grant usage,select on sequence public.learning_attempts_id_seq to authenticated;
create or replace function public.education_leaderboard(result_limit integer default 25)
returns table(account_id uuid,display_name text,total_score bigint,best_subject text,difficulty_subject text)
language sql stable security definer set search_path=public as $$
  with stats as (
    select a.account_id,coalesce(c.display_name,p.full_name,split_part(p.email,'@',1)) display_name,a.subject,sum(a.score) score,avg(a.accuracy) accuracy
    from learning_attempts a join profiles p on p.id=a.account_id left join child_profiles c on c.id=a.child_id
    where p.is_active group by a.account_id,coalesce(c.display_name,p.full_name,split_part(p.email,'@',1)),a.subject
  ), totals as (select account_id,display_name,sum(score) total_score from stats group by account_id,display_name)
  select t.account_id,t.display_name,t.total_score,(select subject from stats s where s.account_id=t.account_id and s.display_name=t.display_name order by accuracy desc,score desc limit 1),(select subject from stats s where s.account_id=t.account_id and s.display_name=t.display_name order by accuracy asc,score desc limit 1)
  from totals t order by total_score desc limit least(greatest(result_limit,1),100)
$$;
revoke all on function public.education_leaderboard(integer) from public,anon;
grant execute on function public.education_leaderboard(integer) to authenticated;
