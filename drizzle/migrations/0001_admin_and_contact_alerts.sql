-- ===== ADMIN POWERS =====
CREATE POLICY "Admins delete trips" ON public.trips FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update trips" ON public.trips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read contacts" ON public.profile_private FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT DELETE ON public.reports TO authenticated;
CREATE POLICY "Admins delete reports" ON public.reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== SMS / WHATSAPP ALERTS (logged + rate-limited) =====
CREATE TABLE public.contact_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_alerts_sender_idx ON public.contact_alerts (sender_id, created_at DESC);
CREATE INDEX contact_alerts_booking_idx ON public.contact_alerts (booking_id, sender_id, created_at DESC);
GRANT SELECT ON public.contact_alerts TO authenticated;
GRANT ALL ON public.contact_alerts TO service_role;
ALTER TABLE public.contact_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender or recipient reads alerts" ON public.contact_alerts FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Admins read alerts" ON public.contact_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Rules (keep in sync with CONTACT_RULES in src/config/event.ts):
--  * must accept the rules; email confirmed
--  * passenger -> driver: booking pending or confirmed; driver -> passenger: confirmed only
--  * max 3 alerts per booking per sender, 30 min apart, max 10 per sender per 24h
--  * no alert 22h-8h (Paris) unless departure is within 12h
--  * not after the trip departed + 24h
CREATE OR REPLACE FUNCTION public.request_contact_alert(_booking_id uuid, _accept_rules boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_b public.bookings%ROWTYPE;
  v_t public.trips%ROWTYPE;
  v_recipient uuid;
  v_phone text;
  v_last timestamptz;
  v_count int;
  v_hour int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour prévenir quelqu''un.'; END IF;
  IF NOT public.is_email_confirmed() THEN RAISE EXCEPTION 'Confirme ton adresse email avant de prévenir quelqu''un.'; END IF;
  IF _accept_rules IS NOT TRUE THEN RAISE EXCEPTION 'Tu dois accepter les règles d''envoi pour continuer.'; END IF;

  SELECT * INTO v_b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Réservation introuvable.'; END IF;
  SELECT * INTO v_t FROM public.trips WHERE id = v_b.trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce trajet n''existe plus.'; END IF;

  IF v_b.passenger_id = auth.uid() THEN
    IF v_b.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'Ta réservation n''est plus active.'; END IF;
    v_recipient := v_t.driver_id;
  ELSIF v_t.driver_id = auth.uid() THEN
    IF v_b.status <> 'confirmed' THEN RAISE EXCEPTION 'Tu peux prévenir un passager seulement après avoir accepté sa demande.'; END IF;
    v_recipient := v_b.passenger_id;
  ELSE
    RAISE EXCEPTION 'Action non autorisée.';
  END IF;

  IF v_t.departure_at + interval '24 hours' < now() THEN RAISE EXCEPTION 'Ce trajet est terminé.'; END IF;

  v_hour := extract(hour FROM (now() AT TIME ZONE 'Europe/Paris'))::int;
  IF (v_hour >= 22 OR v_hour < 8) AND v_t.departure_at - now() > interval '12 hours' THEN
    RAISE EXCEPTION 'Pas d''alerte entre 22h et 8h : laisse dormir les gens ! Réessaie à partir de 8h.';
  END IF;

  SELECT count(*), max(created_at) INTO v_count, v_last FROM public.contact_alerts
    WHERE booking_id = _booking_id AND sender_id = auth.uid();
  IF v_count >= 3 THEN RAISE EXCEPTION 'Tu as déjà envoyé 3 alertes pour cette réservation. Utilise la messagerie du site.'; END IF;
  IF v_last IS NOT NULL AND v_last > now() - interval '30 minutes' THEN
    RAISE EXCEPTION 'Patiente 30 minutes entre deux alertes.';
  END IF;
  SELECT count(*) INTO v_count FROM public.contact_alerts
    WHERE sender_id = auth.uid() AND created_at > now() - interval '24 hours';
  IF v_count >= 10 THEN RAISE EXCEPTION 'Limite de 10 alertes par jour atteinte. Réessaie demain.'; END IF;

  SELECT phone INTO v_phone FROM public.profile_private WHERE user_id = v_recipient;
  IF v_phone IS NULL OR btrim(v_phone) = '' THEN
    RAISE EXCEPTION 'Cette personne n''a pas renseigné de numéro. Écris-lui via la messagerie.';
  END IF;

  INSERT INTO public.contact_alerts (booking_id, sender_id, recipient_id) VALUES (_booking_id, auth.uid(), v_recipient);
  RETURN v_phone;
END $$;
REVOKE EXECUTE ON FUNCTION public.request_contact_alert(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_contact_alert(uuid, boolean) TO authenticated;