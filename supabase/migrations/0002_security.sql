-- 0002_security: row level security, the HR check, the summary view and realtime.
-- HR (rows in hr_users) gets full access. Candidates can only read their own
-- candidates / joining_details / messages rows. All candidate writes go through
-- security-definer functions (0003). anon gets nothing but get_public_drive.

create function public.is_hr() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hr_users where user_id = auth.uid());
$$;
revoke all on function public.is_hr() from public;
grant execute on function public.is_hr() to anon, authenticated;

alter table public.hr_users enable row level security;
alter table public.drives enable row level security;
alter table public.drive_rounds enable row level security;
alter table public.candidates enable row level security;
alter table public.round_decisions enable row level security;
alter table public.joining_details enable row level security;
alter table public.messages enable row level security;

-- Logged-out visitors never touch tables directly.
revoke all on all tables in schema public from anon;

create policy hr_users_self_read on public.hr_users
  for select to authenticated using (user_id = auth.uid());

create policy drives_hr_all on public.drives
  for all to authenticated using (public.is_hr()) with check (public.is_hr());

create policy drive_rounds_hr_all on public.drive_rounds
  for all to authenticated using (public.is_hr()) with check (public.is_hr());

create policy candidates_hr_all on public.candidates
  for all to authenticated using (public.is_hr()) with check (public.is_hr());
create policy candidates_own_read on public.candidates
  for select to authenticated using (user_id = auth.uid());

create policy round_decisions_hr_all on public.round_decisions
  for all to authenticated using (public.is_hr()) with check (public.is_hr());

create policy joining_details_hr_all on public.joining_details
  for all to authenticated using (public.is_hr()) with check (public.is_hr());
create policy joining_details_own_read on public.joining_details
  for select to authenticated using (
    exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
  );

create policy messages_hr_all on public.messages
  for all to authenticated using (public.is_hr()) with check (public.is_hr());
create policy messages_own_read on public.messages
  for select to authenticated using (
    exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid())
  );

-- Per-drive counts for the HR dashboard. security_invoker makes RLS apply,
-- so only HR sees real numbers.
create view public.drive_summary with (security_invoker = true) as
select
  d.id as drive_id,
  count(c.id) filter (where c.status = 'active')::int as active,
  count(c.id) filter (where c.status = 'on_hold')::int as on_hold,
  count(c.id) filter (where c.status = 'rejected')::int as rejected,
  count(c.id) filter (where c.status = 'selected')::int as selected,
  count(c.id) filter (where c.status = 'details_submitted')::int as details_submitted,
  count(c.id) filter (where c.status = 'onboarded')::int as onboarded,
  count(c.id)::int as total
from public.drives d
left join public.candidates c on c.drive_id = d.id
group by d.id;
revoke all on public.drive_summary from anon;

-- Live arrivals in the HR pipeline.
alter publication supabase_realtime add table public.candidates;
