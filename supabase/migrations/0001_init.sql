-- ================================================================
-- Sistem Pengurusan & Serahan PPE — Migrasi Awal
-- Rujuk: Spesifikasi Sistem PPE, Bahagian 5 & 6
-- ================================================================

create extension if not exists pgcrypto;

-- ========================================
-- 1. PPE ITEMS (stok)
-- ========================================
create table if not exists ppe_items (
  id text primary key,              -- cth: 'helmet-putih', 'vest-am', 'uniform-oren'
  category text not null,           -- 'Safety Helmet' | 'Safety Vest' | 'Safety Shoes' | 'Uniform'
  variant text not null,            -- 'Putih' | 'Kuning' | 'Staff' | 'Pekerja Am' | 'Black Hammer' | 'Safety King' | 'Oren'
  name text not null,               -- nama penuh utk paparan, cth 'Safety Helmet Putih'
  unit text not null default 'unit',-- 'unit' | 'pasang' | 'set'
  stock integer not null default 0,
  updated_at timestamptz default now()
);

-- ========================================
-- 2. EMPLOYEES (pangkalan data pekerja)
-- ========================================
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  staff_id text unique not null,       -- No. Staf (medan carian utama)
  comp_code text,
  branch text,
  name text not null,
  ic_number text,                      -- No. IC / Passport
  position text not null check (position in ('STAFF & PENYELIA','PEMANDU','PEKERJA AM')),
  created_at timestamptz default now()
);
create index if not exists idx_employees_name on employees using gin (to_tsvector('simple', name));
create index if not exists idx_employees_staff_id on employees (staff_id);

-- ========================================
-- 3. REQUESTS (permohonan / rekod serahan)
-- ========================================
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  ref_no text unique,                -- No. Rujukan (dijana automatik, atau dibawa masuk semasa import data lama)
  employee_id uuid references employees(id),
  employee_name text not null,       -- snapshot masa hantar
  staff_id text not null,
  comp_code text,
  branch text,
  ic_number text,
  position text,
  items jsonb not null,              -- [{ itemId, name, size, qtyRequested, qtyIssued }]
  note text default '',
  status text not null default 'pending' check (status in ('pending','issued','rejected')),
  remark text default '',
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by text
);
create index if not exists idx_requests_staff_id on requests(staff_id);
create index if not exists idx_requests_status on requests(status);
create index if not exists idx_requests_processed_at on requests(processed_at);
create index if not exists idx_requests_created_at on requests(created_at);

-- Auto-jana No. Rujukan bila tidak dibekalkan (cth. import data lama boleh bekalkan sendiri)
create sequence if not exists requests_ref_seq;

create or replace function set_request_ref_no()
returns trigger as $$
begin
  if new.ref_no is null or new.ref_no = '' then
    new.ref_no := 'PPE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('requests_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_request_ref_no on requests;
create trigger trg_set_request_ref_no
  before insert on requests
  for each row execute function set_request_ref_no();

-- ========================================
-- 4. SETTINGS (tetapan syarikat — satu baris sahaja)
-- ========================================
create table if not exists settings (
  id int primary key default 1,
  company_name text not null default 'Nama Syarikat Anda',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into settings (id, company_name)
  values (1, 'Nama Syarikat Anda')
  on conflict (id) do nothing;

-- ================================================================
-- RPC: Lulus permohonan secara atomik (§6.4.4)
-- Tolak stok setiap item (qtyIssued > 0), kemudian tandakan
-- permohonan sebagai 'issued'. Jika mana-mana bahagian gagal,
-- keseluruhan transaksi dibatalkan (rollback).
-- ================================================================
create or replace function approve_request(
  p_request_id uuid,
  p_items jsonb,          -- items terkini dgn qtyIssued yg disahkan HR
  p_remark text,
  p_processed_by text
)
returns requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_item_id text;
  v_qty_issued integer;
  v_updated requests;
begin
  if not exists (select 1 from requests where id = p_request_id and status = 'pending') then
    raise exception 'Permohonan tidak wujud atau sudah diproses';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := v_item->>'itemId';
    v_qty_issued := coalesce((v_item->>'qtyIssued')::integer, 0);

    if v_qty_issued > 0 then
      update ppe_items
        set stock = stock - v_qty_issued,
            updated_at = now()
        where id = v_item_id;

      if not found then
        raise exception 'Item PPE % tidak dijumpai dalam stok', v_item_id;
      end if;
    end if;
  end loop;

  update requests
    set status = 'issued',
        items = p_items,
        remark = coalesce(p_remark, remark),
        processed_at = now(),
        processed_by = p_processed_by
    where id = p_request_id
    returning * into v_updated;

  return v_updated;
end;
$$;

-- ================================================================
-- RPC: Tolak permohonan (tiada perubahan stok) — §6.4.5
-- ================================================================
create or replace function reject_request(
  p_request_id uuid,
  p_remark text,
  p_processed_by text
)
returns requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated requests;
begin
  update requests
    set status = 'rejected',
        remark = coalesce(p_remark, remark),
        processed_at = now(),
        processed_by = p_processed_by
    where id = p_request_id and status = 'pending'
    returning * into v_updated;

  if v_updated is null then
    raise exception 'Permohonan tidak wujud atau sudah diproses';
  end if;

  return v_updated;
end;
$$;

-- ================================================================
-- Row Level Security
-- ================================================================
alter table employees enable row level security;
alter table ppe_items enable row level security;
alter table requests enable row level security;
alter table settings enable row level security;

-- NOTA: pekerja (anon) TIDAK diberi akses SELECT terus pada employees kerana
-- baris itu mengandungi `ic_number` (medan sensitif). Sebaliknya pekerja guna
-- view `employees_public` di bawah yang menyembunyikan No. IC.

-- NOTA: pekerja (anon) TIDAK diberi akses SELECT terus pada ppe_items kerana
-- baris itu mengandungi `stock` (maklumat dalaman). Sebaliknya pekerja guna
-- view `ppe_items_public` di bawah yang menyembunyikan lajur stok.

-- Nama syarikat dipaparkan pada borang awam pekerja — tidak sensitif
drop policy if exists "public can read settings" on settings;
create policy "public can read settings"
  on settings for select using (true);

-- Pekerja boleh hantar permohonan, tapi TIDAK boleh baca/ubah rekod
drop policy if exists "public can insert requests" on requests;
create policy "public can insert requests"
  on requests for insert with check (status = 'pending');

-- HR (authenticated) — akses penuh
drop policy if exists "hr full access requests" on requests;
create policy "hr full access requests"
  on requests for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "hr full access employees" on employees;
create policy "hr full access employees"
  on employees for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "hr full access ppe_items" on ppe_items;
create policy "hr full access ppe_items"
  on ppe_items for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "hr full access settings" on settings;
create policy "hr full access settings"
  on settings for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Benarkan pengguna authenticated panggil RPC lulus/tolak
grant execute on function approve_request(uuid, jsonb, text, text) to authenticated;
grant execute on function reject_request(uuid, text, text) to authenticated;

-- ================================================================
-- Views awam (tanpa medan sensitif) — untuk borang pekerja (anon key)
-- Views dicipta oleh pemilik migrasi (bypass RLS jadual asas), jadi
-- grant SELECT terus pada view memberi akses terhad-lajur kepada anon
-- tanpa mendedahkan ic_number / stock.
-- ================================================================
create or replace view employees_public as
  select id, staff_id, comp_code, branch, name, position
  from employees;
grant select on employees_public to anon, authenticated;

create or replace view ppe_items_public as
  select id, category, variant, name, unit
  from ppe_items;
grant select on ppe_items_public to anon, authenticated;

-- ================================================================
-- Seed data awal — item PPE (§6.1)
-- ================================================================
insert into ppe_items (id, category, variant, name, unit, stock) values
  ('helmet-putih', 'Safety Helmet', 'Putih', 'Safety Helmet Putih', 'unit', 0),
  ('helmet-kuning', 'Safety Helmet', 'Kuning', 'Safety Helmet Kuning', 'unit', 0),
  ('vest-staff', 'Safety Vest', 'Staff', 'Safety Vest Staff', 'unit', 0),
  ('vest-am', 'Safety Vest', 'Pekerja Am', 'Safety Vest Pekerja Am', 'unit', 0),
  ('shoes-black-hammer', 'Safety Shoes', 'Black Hammer', 'Safety Shoes Black Hammer', 'pasang', 0),
  ('shoes-safety-king', 'Safety Shoes', 'Safety King', 'Safety Shoes Safety King', 'pasang', 0),
  ('uniform-oren', 'Uniform', 'Oren', 'Uniform Oren', 'set', 0)
on conflict (id) do nothing;
