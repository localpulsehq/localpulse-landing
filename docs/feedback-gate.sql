-- Feedback gate config (one per cafe)
create table if not exists public.feedback_gate_configs (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  google_review_url text not null,
  notify_email text,
  threshold integer not null default 4,
  active boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists feedback_gate_configs_cafe_id_key
  on public.feedback_gate_configs (cafe_id);

-- Feedback submissions (all ratings)
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.cafes(id) on delete cascade,
  rating integer not null,
  message text,
  contact text,
  status text not null default 'new',
  source text,
  meta jsonb,
  internal_note text,
  created_at timestamptz default now()
);

create index if not exists feedback_submissions_business_id_idx
  on public.feedback_submissions (business_id, created_at desc);

-- RLS
alter table public.feedback_gate_configs enable row level security;
alter table public.feedback_submissions enable row level security;

-- Gate config: owner read/write
create policy "feedback_gate_configs_owner_select"
  on public.feedback_gate_configs
  for select
  using (exists (
    select 1 from public.cafes
    where cafes.id = feedback_gate_configs.cafe_id
      and cafes.owner_id = auth.uid()
  ));

create policy "feedback_gate_configs_owner_insert"
  on public.feedback_gate_configs
  for insert
  with check (exists (
    select 1 from public.cafes
    where cafes.id = feedback_gate_configs.cafe_id
      and cafes.owner_id = auth.uid()
  ));

create policy "feedback_gate_configs_owner_update"
  on public.feedback_gate_configs
  for update
  using (exists (
    select 1 from public.cafes
    where cafes.id = feedback_gate_configs.cafe_id
      and cafes.owner_id = auth.uid()
  ));

-- Submissions: public insert, owner read/update
create policy "feedback_submissions_public_insert"
  on public.feedback_submissions
  for insert
  to anon, authenticated
  with check (rating >= 1 and rating <= 5);

create policy "feedback_submissions_owner_select"
  on public.feedback_submissions
  for select
  using (exists (
    select 1 from public.cafes
    where cafes.id = feedback_submissions.business_id
      and cafes.owner_id = auth.uid()
  ));

create policy "feedback_submissions_owner_update"
  on public.feedback_submissions
  for update
  using (exists (
    select 1 from public.cafes
    where cafes.id = feedback_submissions.business_id
      and cafes.owner_id = auth.uid()
  ));

create policy "feedback_submissions_owner_delete_archived"
  on public.feedback_submissions
  for delete
  using (
    status = 'archived'
    and exists (
      select 1 from public.cafes
      where cafes.id = feedback_submissions.business_id
        and cafes.owner_id = auth.uid()
    )
  );
