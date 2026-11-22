-- Rollback 0083: remove as RPCs da cota e os ajudantes em private.
-- Aplique antes o rollback da 0084 se ela estiver aplicada.
drop function if exists public.my_storage_context(uuid);
drop function if exists public.release_storage(text);
drop function if exists public.confirm_storage(text, bigint);
drop function if exists public.reserve_storage(uuid, uuid, bigint, text, text);
drop function if exists public.storage_payer(uuid);
drop function if exists private.storage_display_name(uuid);
drop function if exists private.storage_plan(uuid);
drop function if exists private.storage_used(uuid);
drop function if exists private.storage_resolve_payer(uuid, uuid);
drop function if exists public.storage_limit(text);
