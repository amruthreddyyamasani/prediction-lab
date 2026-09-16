-- Prediction Lab core schema. Applied through Supabase MCP.
create extension if not exists pgcrypto;

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, timezone text not null default 'UTC', theme text not null default 'dark' check (theme in ('dark','light','system')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null unique, description text, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.predictions (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, question text not null check (char_length(question) between 10 and 1000), normalized_question text, category_id uuid references public.categories(id) on delete set null, status text not null default 'active' check (status in ('active','resolved','expired','cancelled')), resolution_date date not null, resolution_criteria text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.forecast_versions (id uuid primary key default gen_random_uuid(), prediction_id uuid not null references public.predictions(id) on delete cascade, version_number integer not null, probability numeric(5,4) not null check (probability >= 0 and probability <= 1), label text not null check (label in ('likely','uncertain','unlikely')), uncertainty text not null check (uncertainty in ('low','medium','high')), rationale text not null, baseline text, current_signals text, catalysts text, risks text, counterfactual text, key_variables jsonb not null default '[]'::jsonb, generated_by text not null default 'structured_llm', change_summary text, created_at timestamptz not null default now(), unique(prediction_id, version_number));
create table if not exists public.evidence (id uuid primary key default gen_random_uuid(), prediction_id uuid not null references public.predictions(id) on delete cascade, source_url text not null, source_name text not null, title text not null, published_at timestamptz, excerpt text not null, stance text not null check (stance in ('supporting','contradicting','context')), relevance numeric(5,4) not null default 0.5 check (relevance >= 0 and relevance <= 1), source_type text not null default 'external', created_at timestamptz not null default now());
create table if not exists public.resolutions (id uuid primary key default gen_random_uuid(), prediction_id uuid not null unique references public.predictions(id) on delete cascade, outcome text not null check (outcome in ('yes','no','ambiguous','cancelled')), resolved_at timestamptz not null default now(), resolution_note text not null, source_url text, brier_score numeric(8,6), created_at timestamptz not null default now());

insert into public.categories (slug,name,description,sort_order) values ('ai-technology','AI & Technology','Computing, software, robotics, and artificial intelligence.',10),('science','Science','Scientific discoveries, research, and exploration.',20),('business','Business','Companies, products, and markets.',30),('economy','Economy','Macroeconomics, jobs, trade, and public finance.',40),('geopolitics','Geopolitics','International relations, security, and statecraft.',50),('climate','Climate','Climate, environment, and natural systems.',60),('health','Health & Medicine','Health systems, medicine, and public health.',70),('space','Space','Human and robotic space exploration.',80),('society','Society','Culture, demographics, and social change.',90) on conflict (slug) do nothing;
create index if not exists predictions_owner_status_idx on public.predictions(owner_id,status,resolution_date);
create index if not exists predictions_category_idx on public.predictions(category_id);
create index if not exists versions_prediction_created_idx on public.forecast_versions(prediction_id,created_at desc);
create index if not exists evidence_prediction_stance_idx on public.evidence(prediction_id,stance);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email)) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at before update on public.predictions for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.predictions enable row level security;
alter table public.forecast_versions enable row level security;
alter table public.evidence enable row level security;
alter table public.resolutions enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists categories_select_authenticated on public.categories;
create policy categories_select_authenticated on public.categories for select to authenticated using (true);
drop policy if exists predictions_owner_all on public.predictions;
create policy predictions_owner_all on public.predictions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists versions_owner_all on public.forecast_versions;
create policy versions_owner_all on public.forecast_versions for all using (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid()));
drop policy if exists evidence_owner_all on public.evidence;
create policy evidence_owner_all on public.evidence for all using (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid()));
drop policy if exists resolutions_owner_all on public.resolutions;
create policy resolutions_owner_all on public.resolutions for all using (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.predictions p where p.id = prediction_id and p.owner_id = auth.uid()));
revoke execute on function public.handle_new_user() from public;
