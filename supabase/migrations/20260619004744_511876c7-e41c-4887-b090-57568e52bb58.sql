
-- Explicit admin SELECT policies (documents intent, prevents accidental opening)
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view newsletter subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Explicitly block client-side role changes (server/service_role only)
CREATE POLICY "No client inserts on user_roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No client updates on user_roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on user_roles" ON public.user_roles
  FOR DELETE TO authenticated USING (false);

-- Remove redundant always-true policies (service_role bypasses RLS already)
DROP POLICY IF EXISTS "Service role manages orders" ON public.orders;
DROP POLICY IF EXISTS "Service role manages reviews" ON public.reviews;

-- Admin can manage reviews (replaces the dropped overly-permissive policy)
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit a review" ON public.reviews
  FOR INSERT TO anon WITH CHECK (true);

-- Lock down SECURITY DEFINER functions to service_role.
-- has_role stays callable because RLS policies invoke it.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_variant_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_variant_stock(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock(uuid, integer) TO service_role;
