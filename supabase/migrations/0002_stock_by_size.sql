-- ================================================================
-- Stok PPE mengikut saiz — untuk kategori yang ada saiz
-- (Safety Vest, Safety Shoes, Uniform). Safety Helmet kekal guna
-- `stock` terus (tiada saiz).
-- ================================================================

alter table ppe_items add column if not exists stock_by_size jsonb;

-- `stock` sentiasa jadi JUMLAH automatik merentas semua saiz bila
-- `stock_by_size` diisi (bukan null). Item tanpa saiz (helmet) terus
-- edit `stock` seperti biasa (stock_by_size kekal null).
create or replace function sync_ppe_item_stock_total()
returns trigger as $$
begin
  if new.stock_by_size is not null then
    select coalesce(sum((value)::numeric), 0)::int into new.stock
    from jsonb_each_text(new.stock_by_size);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_ppe_item_stock_total on ppe_items;
create trigger trg_sync_ppe_item_stock_total
  before insert or update on ppe_items
  for each row execute function sync_ppe_item_stock_total();

-- ================================================================
-- approve_request — kemaskini supaya tolak stok ikut SAIZ yang betul
-- bila item berkenaan ada saiz; jika tiada saiz (helmet), tolak
-- `stock` terus seperti sebelum ini.
-- ================================================================
create or replace function approve_request(
  p_request_id uuid,
  p_items jsonb,
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
  v_size text;
  v_qty_issued integer;
  v_updated requests;
begin
  if not exists (select 1 from requests where id = p_request_id and status = 'pending') then
    raise exception 'Permohonan tidak wujud atau sudah diproses';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := v_item->>'itemId';
    v_size := nullif(v_item->>'size', '');
    v_qty_issued := coalesce((v_item->>'qtyIssued')::integer, 0);

    if v_qty_issued > 0 then
      if v_size is not null then
        update ppe_items
          set stock_by_size = jsonb_set(
                coalesce(stock_by_size, '{}'::jsonb),
                array[v_size],
                to_jsonb(greatest(0, coalesce((stock_by_size->>v_size)::int, 0) - v_qty_issued))
              ),
              updated_at = now()
          where id = v_item_id;
      else
        update ppe_items
          set stock = stock - v_qty_issued,
              updated_at = now()
          where id = v_item_id;
      end if;

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
