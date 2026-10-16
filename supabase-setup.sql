-- TrufaHub: execute no SQL Editor do Supabase.
-- 1) Tabela de metadados com Row Level Security.
create table if not exists public.scripts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  storage_path text not null unique,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scripts enable row level security;
create policy "Users can read their own scripts" on public.scripts for select to authenticated using (auth.uid() = user_id);
create policy "Users can add their own scripts" on public.scripts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own scripts" on public.scripts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own scripts" on public.scripts for delete to authenticated using (auth.uid() = user_id);

-- 2) Bucket privado. Limite por arquivo: 10 MiB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lua-scripts', 'lua-scripts', false, 10485760, array['text/plain','application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['text/plain','application/octet-stream'];

-- 3) Restringe operações no bucket ao diretório do próprio usuário.
create policy "Users can view own Lua files" on storage.objects for select to authenticated
using (bucket_id = 'lua-scripts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can upload own Lua files" on storage.objects for insert to authenticated
with check (bucket_id = 'lua-scripts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own Lua files" on storage.objects for update to authenticated
using (bucket_id = 'lua-scripts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'lua-scripts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own Lua files" on storage.objects for delete to authenticated
using (bucket_id = 'lua-scripts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Se executar o SQL mais de uma vez, políticas já existentes podem gerar aviso de nome duplicado.
-- Nesse caso, remova as políticas anteriores no painel ou transforme os CREATE POLICY em blocos condicionais.
