begin;

create or replace function public.store_reserve_order_stock()
returns trigger language plpgsql set search_path = public as $$
declare
  item record;
begin
  if tg_op = 'UPDATE' then
    if old.details #>> '{payment,method}' = 'cod' or old.details #>> '{payment,status}' = 'paid' then
      return new;
    end if;
  end if;
  if new.details #>> '{payment,method}' <> 'cod' and new.details #>> '{payment,status}' <> 'paid' then
    return new;
  end if;
  for item in
    select x.slug, sum(x.qty) as qty from jsonb_to_recordset(new.details->'items') x(slug text, qty integer)
    group by x.slug order by x.slug
  loop
    update public.store_products set product = jsonb_set(product, '{stock}', to_jsonb((product->>'stock')::integer - item.qty))
    where slug = item.slug and (product->>'active')::boolean and item.qty > 0 and (product->>'stock')::integer >= item.qty;
    if not found then raise exception 'Insufficient stock for %', item.slug; end if;
  end loop;
  return new;
end;
$$;

create or replace trigger reserve_store_stock
after insert or update on public.store_orders
for each row execute function public.store_reserve_order_stock();

create or replace function public.store_commit_order(order_details jsonb, previous_details jsonb default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if previous_details is null then
    insert into public.store_orders(id, created_at, details)
    values(order_details->>'id', (order_details->>'createdAt')::timestamptz, order_details);
  else
    update public.store_orders set details = order_details
    where id = order_details->>'id' and details = previous_details;
    if not found then raise exception 'Order changed, refresh and retry'; end if;
  end if;
end;
$$;
revoke all on function public.store_commit_order(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.store_commit_order(jsonb,jsonb) to service_role;
commit;
