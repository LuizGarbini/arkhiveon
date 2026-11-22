-- Rollback 0082: remove storage_objects.
-- Nada depende dela antes da S2/S3. Se a 0083/0084 estiverem aplicadas,
-- aplique antes os rollbacks delas (0084, depois 0083): o trigger da 0084
-- e as RPCs da 0083 usam esta tabela.
drop table if exists public.storage_objects;
