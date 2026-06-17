
REVOKE EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_variant_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock(uuid, integer) TO service_role;
