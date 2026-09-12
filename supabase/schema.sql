create extension if not exists pgcrypto;

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, avatar_url text, created_at timestamptz not null default now());
create table if not exists public.conversations (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null default 'New chat', archived boolean not null default false, pinned boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('user','assistant','system','tool')), content text not null default '', status text not null default 'completed', created_at timestamptz not null default now());
create table if not exists public.agent_runs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, conversation_id uuid references public.conversations(id) on delete cascade, state text not null, error text, started_at timestamptz not null default now(), completed_at timestamptz);
create table if not exists public.agent_steps (id uuid primary key default gen_random_uuid(), run_id uuid not null references public.agent_runs(id) on delete cascade, sequence_no integer not null, state text not null, summary text not null, tool_id text, created_at timestamptz not null default now());
create table if not exists public.attachments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, conversation_id uuid references public.conversations(id) on delete cascade, name text not null, mime_type text not null, size_bytes bigint not null, storage_path text, created_at timestamptz not null default now());
create table if not exists public.connections (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null, account_label text, scopes text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, provider));
create table if not exists public.memories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, project_id uuid, content text not null, source text not null, created_at timestamptz not null default now());
create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, action text not null, risk_level text not null, status text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now());

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.attachments enable row level security;
alter table public.connections enable row level security;
alter table public.memories enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profiles" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own conversations" on public.conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own runs" on public.agent_runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own steps" on public.agent_steps for all using (run_id in (select id from public.agent_runs where user_id = auth.uid())) with check (run_id in (select id from public.agent_runs where user_id = auth.uid()));
create policy "own attachments" on public.attachments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own connections" on public.connections for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own memories" on public.memories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own audit" on public.audit_logs for select using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id, display_name, avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url') on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
