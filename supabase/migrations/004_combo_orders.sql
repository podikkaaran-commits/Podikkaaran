begin;

create index if not exists store_orders_mobile_idx
on public.store_orders ((details #>> '{customer,mobile}'));

create or replace function public.store_reserve_order_stock()
returns trigger language plpgsql set search_path = public as $$
declare
  item record;
  offer record;
  previously_reserved boolean := false;
  restore_stock boolean := false;
  mobile text := new.details #>> '{customer,mobile}';
  purchased bigint;
begin
  if tg_op = 'UPDATE' then
    previously_reserved := old.details #>> '{payment,method}' = 'cod' or old.details #>> '{payment,status}' = 'paid';
    restore_stock := previously_reserved and coalesce(old.details->>'status', '') not in ('Cancelled', 'Shipped', 'Delivered')
      and new.details->>'status' = 'Cancelled';
    if old.details->>'status' = 'Cancelled' and new.details->>'status' <> 'Cancelled' then
      raise exception 'Cancelled orders cannot be reopened';
    end if;
    if previously_reserved and not restore_stock then return new; end if;
  end if;

  if not restore_stock then
    if new.details->>'status' = 'Cancelled' or
      (new.details #>> '{payment,method}' <> 'cod' and new.details #>> '{payment,status}' <> 'paid') then
      return new;
    end if;
  end if;

  if mobile is not null and (restore_stock or exists (
    select from jsonb_to_recordset(coalesce(new.details->'combos', '[]')) c(max integer) where c.max > 0
  )) then
    perform pg_advisory_xact_lock(hashtextextended(mobile, 2711));
  end if;

  if not restore_stock then
    for offer in
      select c.slug, sum(c.qty) as qty, min(c.max) as max
      from jsonb_to_recordset(coalesce(new.details->'combos', '[]')) c(slug text, qty integer, max integer)
      where c.max > 0 group by c.slug
    loop
      select coalesce(sum(c.qty), 0) into purchased
      from public.store_orders o
      cross join lateral jsonb_to_recordset(coalesce(o.details->'combos', '[]')) c(slug text, qty integer)
      where o.id <> new.id and o.details #>> '{customer,mobile}' = mobile
        and o.details->>'status' <> 'Cancelled' and c.slug = offer.slug
        and (o.details #>> '{payment,method}' = 'cod' or o.details #>> '{payment,status}' = 'paid');
      if purchased + offer.qty > offer.max then raise exception 'Combo customer limit reached'; end if;
    end loop;
  end if;

  for item in
    select x.slug, sum(x.qty) as qty from jsonb_to_recordset(new.details->'items') x(slug text, qty integer)
    group by x.slug order by x.slug
  loop
    if restore_stock then
      update public.store_products set product = jsonb_set(product, '{stock}', to_jsonb((product->>'stock')::integer + item.qty))
      where slug = item.slug;
    else
      update public.store_products set product = jsonb_set(product, '{stock}', to_jsonb((product->>'stock')::integer - item.qty))
      where slug = item.slug and (product->>'active')::boolean and item.qty > 0 and (product->>'stock')::integer >= item.qty;
      if not found then raise exception 'Insufficient stock for %', item.slug; end if;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.store_patch_products(changes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  item record;
begin
  for item in select key as slug, value as patch from jsonb_each(changes) order by key
  loop
    update public.store_products set product = product || item.patch
    where slug = item.slug;
  end loop;
end;
$$;
revoke all on function public.store_patch_products(jsonb) from public, anon, authenticated;
grant execute on function public.store_patch_products(jsonb) to service_role;

commit;
