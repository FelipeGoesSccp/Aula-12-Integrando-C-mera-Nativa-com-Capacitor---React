-- Rode no SQL Editor do Supabase (troque 'fotos-camera' pelo nome do seu bucket)

-- Permite que o app (chave anon) ENVIE arquivos para o bucket
create policy "Permitir upload anonimo em fotos-camera"
on storage.objects for insert
to anon
with check (bucket_id = 'fotos-camera');

-- Permite LER/listar os arquivos do bucket
create policy "Permitir leitura anonima em fotos-camera"
on storage.objects for select
to anon
using (bucket_id = 'fotos-camera');
