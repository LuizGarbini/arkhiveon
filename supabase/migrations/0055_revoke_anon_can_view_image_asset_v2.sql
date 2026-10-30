-- 0055 · Tira EXECUTE de anon em can_view_image_asset_v2.
-- O advisor do Supabase apontou que anon podia executar: os default privileges
-- do Supabase dão EXECUTE a anon. A função sempre nega pra anon; isto fecha o acesso.
-- Revoke em public também (idempotente). authenticated segue com EXECUTE.

revoke execute on function public.can_view_image_asset_v2(uuid, uuid, boolean, boolean, boolean, uuid) from anon;
revoke execute on function public.can_view_image_asset_v2(uuid, uuid, boolean, boolean, boolean, uuid) from public;
grant execute on function public.can_view_image_asset_v2(uuid, uuid, boolean, boolean, boolean, uuid) to authenticated;
