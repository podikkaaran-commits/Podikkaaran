begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
commit;
