
CREATE TABLE public.giveaways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prize TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  winner_entry_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaways TO authenticated;
GRANT SELECT ON public.giveaways TO anon;
GRANT ALL ON public.giveaways TO service_role;
ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view giveaways" ON public.giveaways FOR SELECT USING (true);
CREATE POLICY "Admins manage giveaways" ON public.giveaways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.giveaway_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (giveaway_id, email)
);
GRANT SELECT, INSERT ON public.giveaway_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaway_entries TO authenticated;
GRANT ALL ON public.giveaway_entries TO service_role;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can enter open giveaway" ON public.giveaway_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.giveaways g WHERE g.id = giveaway_id AND g.status = 'open'));
CREATE POLICY "Admins view entries" ON public.giveaway_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage entries" ON public.giveaway_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_giveaways_updated_at BEFORE UPDATE ON public.giveaways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
