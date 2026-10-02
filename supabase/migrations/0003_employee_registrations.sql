-- ================================================================
-- Pendaftaran staf baharu (borang awam) — masuk senarai menunggu
-- semakan HR; HR lulus → rekod dimasukkan ke jadual employees.
-- ================================================================

create table if not exists employee_registrations (
  id uuid primary key default gen_random_uuid(),
  staff_id text not null check (char_length(staff_id) between 1 and 50),
  name text not null check (char_length(name) between 1 and 200),
  ic_number text not null check (char_length(ic_number) between 1 and 50),
  comp_code text check (comp_code is null or char_length(comp_code) <= 50),
  branch text check (branch is null or char_length(branch) <= 100),
  position text not null check (position in ('STAFF & PENYELIA','PEMANDU','PEKERJA AM')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by text
);

-- Satu No. Staf hanya boleh ada satu pendaftaran menunggu pada satu masa
create unique index if not exists uq_employee_registrations_pending_staff_id
  on employee_registrations (staff_id) where status = 'pending';
create index if not exists idx_employee_registrations_status
  on employee_registrations (status);

alter table employee_registrations enable row level security;

-- Pekerja (anon) hanya boleh HANTAR pendaftaran; tidak boleh baca/ubah
drop policy if exists "public can insert registrations" on employee_registrations;
create policy "public can insert registrations"
  on employee_registrations for insert
  with check (status = 'pending' and processed_at is null and processed_by is null);

drop policy if exists "hr full access registrations" on employee_registrations;
create policy "hr full access registrations"
  on employee_registrations for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ================================================================
-- RPC: lulus pendaftaran (atomik) — masukkan ke employees + tandakan approved
-- ================================================================
create or replace function approve_employee_registration(
  p_id uuid,
  p_processed_by text
)
returns employee_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg employee_registrations;
  v_updated employee_registrations;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Tidak dibenarkan';
  end if;

  select * into v_reg from employee_registrations
    where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Pendaftaran tidak wujud atau sudah diproses';
  end if;

  if exists (select 1 from employees where staff_id = v_reg.staff_id) then
    raise exception 'No. Staf % sudah wujud dalam pangkalan data pekerja', v_reg.staff_id;
  end if;

  insert into employees (staff_id, comp_code, branch, name, ic_number, position)
    values (v_reg.staff_id, v_reg.comp_code, v_reg.branch, v_reg.name, v_reg.ic_number, v_reg.position);

  update employee_registrations
    set status = 'approved', processed_at = now(), processed_by = p_processed_by
    where id = p_id
    returning * into v_updated;

  return v_updated;
end;
$$;

create or replace function reject_employee_registration(
  p_id uuid,
  p_processed_by text
)
returns employee_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated employee_registrations;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Tidak dibenarkan';
  end if;

  update employee_registrations
    set status = 'rejected', processed_at = now(), processed_by = p_processed_by
    where id = p_id and status = 'pending'
    returning * into v_updated;

  if v_updated is null then
    raise exception 'Pendaftaran tidak wujud atau sudah diproses';
  end if;

  return v_updated;
end;
$$;

-- ================================================================
-- Keselamatan: fungsi security definer secara lalai boleh dipanggil oleh
-- sesiapa (termasuk anon). Tutup akses anon pada SEMUA fungsi HR, termasuk
-- approve_request / reject_request dari migrasi terdahulu.
-- ================================================================
revoke execute on function approve_request(uuid, jsonb, text, text) from public, anon;
revoke execute on function reject_request(uuid, text, text) from public, anon;
revoke execute on function approve_employee_registration(uuid, text) from public, anon;
revoke execute on function reject_employee_registration(uuid, text) from public, anon;

grant execute on function approve_request(uuid, jsonb, text, text) to authenticated;
grant execute on function reject_request(uuid, text, text) to authenticated;
grant execute on function approve_employee_registration(uuid, text) to authenticated;
grant execute on function reject_employee_registration(uuid, text) to authenticated;
