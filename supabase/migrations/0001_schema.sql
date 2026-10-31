-- 0001_schema: tables for the bulk-hiring app.
-- Status values, templates and checks mirror docs/plan/00-overview.md.

create table public.hr_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.drives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 3 and 120),
  role text not null check (length(btrim(role)) > 0),
  location text not null check (length(btrim(location)) > 0),
  openings int not null default 1 check (openings > 0),
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.drive_rounds (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives (id) on delete cascade,
  position int not null check (position >= 1),
  name text not null check (length(btrim(name)) between 1 and 60),
  unique (drive_id, position)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid not null references public.drives (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (length(btrim(full_name)) between 2 and 100),
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  city text not null check (length(btrim(city)) > 0),
  qualification text not null check (length(btrim(qualification)) > 0),
  experience_years numeric(4, 1) not null default 0 check (experience_years between 0 and 60),
  current_round int not null default 1 check (current_round >= 1),
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'rejected', 'selected', 'details_submitted', 'onboarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drive_id, email)
);
create index candidates_user_id_idx on public.candidates (user_id);
create index candidates_pipeline_idx on public.candidates (drive_id, status, current_round);

create table public.round_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  round_position int not null check (round_position >= 1),
  round_name text not null,
  decision text not null check (decision in ('approved', 'on_hold', 'rejected', 'reopened')),
  note text,
  candidate_message text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz not null default now()
);
create index round_decisions_candidate_idx on public.round_decisions (candidate_id, decided_at);

create table public.joining_details (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  date_of_birth date not null,
  aadhaar_number text not null check (aadhaar_number ~ '^[2-9][0-9]{11}$'),
  pan_number text not null check (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  uan_number text check (uan_number is null or uan_number ~ '^[0-9]{12}$'),
  bank_account_holder text not null check (length(btrim(bank_account_holder)) > 0),
  bank_account_number text not null check (bank_account_number ~ '^[0-9]{9,18}$'),
  bank_ifsc text not null check (bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  address text not null check (length(btrim(address)) > 0),
  emergency_contact_name text not null check (length(btrim(emergency_contact_name)) > 0),
  emergency_contact_phone text not null check (emergency_contact_phone ~ '^[6-9][0-9]{9}$'),
  preferred_joining_date date not null,
  submitted_at timestamptz not null default now(),
  changes_requested_reason text
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  template text not null check (template in (
    'application_received', 'moved_to_round', 'selected', 'on_hold', 'rejected',
    'reopened', 'details_received', 'changes_requested', 'onboarded'
  )),
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_candidate_idx on public.messages (candidate_id, created_at);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger candidates_touch_updated_at
  before update on public.candidates
  for each row execute function public.touch_updated_at();
