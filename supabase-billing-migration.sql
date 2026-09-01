-- Execute uma vez no SQL Editor do projeto "fala-real-soletra" (mesmo
-- projeto Supabase que o Soletra já usa para login - jptxomplvexsfyynmxju).
-- Cria as tabelas de assinatura/pagamento pra cobrança recorrente via
-- Mercado Pago: R$20/mês por e-mail cadastrado. Contas com role admin/master
-- (mesmo papel já usado no painel "Usuários cadastrados" do auth.js) ficam
-- isentas.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_subscription_id text unique,
  status text not null default 'pending',
  plan_code text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_payment_id text unique,
  amount_cents integer,
  currency text not null default 'BRL',
  status text not null default 'pending',
  raw_status jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- Reaproveita o mesmo critério de "equipe" já usado no app (role admin ou
-- master, ver auth.js) - função própria pra não depender de nomes de
-- funções de outra migração que podem não existir neste projeto.
create or replace function public.is_billing_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','master') and is_active) $$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions own read') then
    execute 'create policy "subscriptions own read" on public.subscriptions for select using (user_id = auth.uid() or public.is_billing_staff())';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='payments own read') then
    execute 'create policy "payments own read" on public.payments for select using (user_id = auth.uid() or public.is_billing_staff())';
  end if;
end $$;

-- O navegador só LÊ a própria assinatura (útil pra eventuais telas futuras);
-- criar/atualizar é sempre via /api/payments/* (chave de serviço), nunca
-- direto do cliente.
grant select on public.subscriptions to authenticated;
grant select on public.payments to authenticated;
grant select, insert, update on public.subscriptions to service_role;
grant select, insert, update on public.payments to service_role;

create index if not exists subscriptions_user_idx on public.subscriptions (user_id, current_period_end desc);
create index if not exists subscriptions_provider_idx on public.subscriptions (provider_subscription_id);
