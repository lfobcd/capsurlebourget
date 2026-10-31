
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_email_confirmed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL)
$$;

-- PROFILES (public info)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '' CHECK (char_length(first_name) <= 50),
  city text CHECK (char_length(city) <= 80),
  vehicle text CHECK (char_length(vehicle) <= 80),
  bio text CHECK (char_length(bio) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- PRIVATE CONTACT (last name + phone)
CREATE TABLE public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_name text NOT NULL DEFAULT '' CHECK (char_length(last_name) <= 50),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- TRIPS
CREATE TYPE public.trip_type AS ENUM ('aller_retour', 'aller', 'retour');
CREATE TYPE public.luggage_size AS ENUM ('small', 'cabin', 'large');
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure_city text NOT NULL CHECK (char_length(departure_city) BETWEEN 2 AND 80),
  meeting_address text NOT NULL CHECK (char_length(meeting_address) BETWEEN 3 AND 200),
  waypoints text[] NOT NULL DEFAULT '{}',
  departure_at timestamptz NOT NULL,
  return_at timestamptz,
  trip_type public.trip_type NOT NULL DEFAULT 'aller_retour',
  seats_total int NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  seats_available int NOT NULL CHECK (seats_available >= 0),
  vehicle text CHECK (char_length(vehicle) <= 80),
  price_per_seat numeric(6,2) NOT NULL DEFAULT 0 CHECK (price_per_seat >= 0 AND price_per_seat <= 45),
  distance_km int NOT NULL CHECK (distance_km BETWEEN 1 AND 1500),
  description text CHECK (char_length(description) <= 1000),
  luggage public.luggage_size NOT NULL DEFAULT 'cabin',
  non_smoking boolean NOT NULL DEFAULT true,
  pets boolean NOT NULL DEFAULT false,
  pmr boolean NOT NULL DEFAULT false,
  music boolean NOT NULL DEFAULT true,
  vibes text[] NOT NULL DEFAULT '{}',
  axis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seats_available <= seats_total),
  CHECK (return_at IS NULL OR return_at > departure_at),
  CHECK (price_per_seat <= round(distance_km * 0.08, 2))
);
CREATE INDEX trips_departure_idx ON public.trips (departure_at);
GRANT SELECT ON public.trips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trips public read" ON public.trips FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Verified drivers create trips" ON public.trips FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() AND public.is_email_confirmed());
CREATE POLICY "Drivers update own trips" ON public.trips FOR UPDATE TO authenticated
  USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Drivers delete own trips" ON public.trips FOR DELETE TO authenticated USING (driver_id = auth.uid());

-- Seats are fixed at creation; drivers cannot tamper with seat counts directly
CREATE OR REPLACE FUNCTION public.trips_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.seats_available := NEW.seats_total;
    IF NEW.departure_at < now() THEN
      RAISE EXCEPTION 'La date de départ doit être dans le futur.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF current_setting('app.seat_change', true) IS DISTINCT FROM 'on' THEN
      NEW.seats_available := OLD.seats_available;
      NEW.seats_total := OLD.seats_total;
    END IF;
    NEW.driver_id := OLD.driver_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trips_guard BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.trips_guard();

-- BOOKINGS
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'refused', 'cancelled');
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seats int NOT NULL CHECK (seats BETWEEN 1 AND 8),
  message text CHECK (char_length(message) <= 500),
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, passenger_id)
);
GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passenger or driver reads booking" ON public.bookings FOR SELECT TO authenticated
  USING (passenger_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.driver_id = auth.uid()));

-- Contact visibility: owner or other party of a CONFIRMED booking
CREATE OR REPLACE FUNCTION public.can_view_contact(_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _target = auth.uid() OR EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.trips t ON t.id = b.trip_id
    WHERE b.status = 'confirmed' AND (
      (b.passenger_id = auth.uid() AND t.driver_id = _target) OR
      (t.driver_id = auth.uid() AND b.passenger_id = _target)
    )
  )
$$;
CREATE POLICY "Contact visible to owner or confirmed party" ON public.profile_private FOR SELECT TO authenticated
  USING (public.can_view_contact(user_id));
CREATE POLICY "Own contact insert" ON public.profile_private FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own contact update" ON public.profile_private FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Transactional booking functions
CREATE OR REPLACE FUNCTION public.book_trip(_trip_id uuid, _seats int, _message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  v_existing public.bookings%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour réserver.'; END IF;
  IF NOT public.is_email_confirmed() THEN RAISE EXCEPTION 'Confirme ton adresse email avant de réserver.'; END IF;
  IF _seats IS NULL OR _seats < 1 OR _seats > 8 THEN RAISE EXCEPTION 'Nombre de places invalide.'; END IF;
  IF _message IS NOT NULL AND char_length(_message) > 500 THEN RAISE EXCEPTION 'Message trop long (500 caractères max).'; END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce trajet n''existe plus.'; END IF;
  IF v_trip.driver_id = auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas réserver ton propre trajet.'; END IF;
  IF v_trip.departure_at < now() THEN RAISE EXCEPTION 'Ce trajet est déjà parti.'; END IF;
  IF v_trip.seats_available < _seats THEN RAISE EXCEPTION 'Il ne reste pas assez de places sur ce trajet.'; END IF;

  SELECT * INTO v_existing FROM public.bookings WHERE trip_id = _trip_id AND passenger_id = auth.uid() FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Tu as déjà une réservation sur ce trajet.';
    END IF;
    UPDATE public.bookings SET seats = _seats, message = _message, status = 'pending', updated_at = now()
      WHERE id = v_existing.id RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.bookings (trip_id, passenger_id, seats, message)
      VALUES (_trip_id, auth.uid(), _seats, _message) RETURNING id INTO v_id;
  END IF;

  PERFORM set_config('app.seat_change', 'on', true);
  UPDATE public.trips SET seats_available = seats_available - _seats WHERE id = _trip_id;
  PERFORM set_config('app.seat_change', 'off', true);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.respond_booking(_booking_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_b public.bookings%ROWTYPE;
  v_driver uuid;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Réservation introuvable.'; END IF;
  SELECT driver_id INTO v_driver FROM public.trips WHERE id = v_b.trip_id FOR UPDATE;
  IF v_driver IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Seul·e le ou la conducteur·rice peut répondre.'; END IF;
  IF v_b.status <> 'pending' THEN RAISE EXCEPTION 'Cette demande a déjà été traitée.'; END IF;
  IF _accept THEN
    UPDATE public.bookings SET status = 'confirmed', updated_at = now() WHERE id = _booking_id;
  ELSE
    UPDATE public.bookings SET status = 'refused', updated_at = now() WHERE id = _booking_id;
    PERFORM set_config('app.seat_change', 'on', true);
    UPDATE public.trips SET seats_available = LEAST(seats_total, seats_available + v_b.seats) WHERE id = v_b.trip_id;
    PERFORM set_config('app.seat_change', 'off', true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.passenger_id <> auth.uid() THEN RAISE EXCEPTION 'Réservation introuvable.'; END IF;
  IF v_b.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'Cette réservation n''est plus active.'; END IF;
  PERFORM 1 FROM public.trips WHERE id = v_b.trip_id FOR UPDATE;
  UPDATE public.bookings SET status = 'cancelled', updated_at = now() WHERE id = _booking_id;
  PERFORM set_config('app.seat_change', 'on', true);
  UPDATE public.trips SET seats_available = LEAST(seats_total, seats_available + v_b.seats) WHERE id = v_b.trip_id;
  PERFORM set_config('app.seat_change', 'off', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.book_trip(uuid, int, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.respond_booking(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.book_trip(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_booking(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- CONVERSATIONS & MESSAGES
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (trip_id, user_a, user_b)
);
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (user_a, user_b));

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND auth.uid() IN (user_a, user_b))
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_trip_id uuid, _other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a uuid; v_b uuid; v_id uuid; v_driver uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour écrire.'; END IF;
  IF NOT public.is_email_confirmed() THEN RAISE EXCEPTION 'Confirme ton adresse email avant d''écrire.'; END IF;
  IF _other = auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas t''écrire à toi-même.'; END IF;
  SELECT driver_id INTO v_driver FROM public.trips WHERE id = _trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ce trajet n''existe plus.'; END IF;
  -- one side must be the driver of the trip
  IF v_driver <> auth.uid() AND v_driver <> _other THEN RAISE EXCEPTION 'Conversation non autorisée.'; END IF;
  -- driver can only start conversations with passengers who booked
  IF v_driver = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE trip_id = _trip_id AND passenger_id = _other) THEN
    RAISE EXCEPTION 'Tu ne peux écrire qu''aux personnes ayant demandé une place.';
  END IF;
  v_a := LEAST(auth.uid(), _other); v_b := GREATEST(auth.uid(), _other);
  SELECT id INTO v_id FROM public.conversations WHERE trip_id = _trip_id AND user_a = v_a AND user_b = v_b;
  IF v_id IS NULL THEN
    INSERT INTO public.conversations (trip_id, user_a, user_b) VALUES (_trip_id, v_a, v_b)
      ON CONFLICT (trip_id, user_a, user_b) DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.conversations WHERE trip_id = _trip_id AND user_a = v_a AND user_b = v_b;
    END IF;
  END IF;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid) TO authenticated;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));
CREATE POLICY "Verified participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND read_at IS NULL AND public.is_conversation_participant(conversation_id) AND public.is_email_confirmed());

CREATE OR REPLACE FUNCTION public.messages_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_after_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_after_insert();

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_conversation_participant(_conversation_id) THEN RAISE EXCEPTION 'Conversation introuvable.'; END IF;
  UPDATE public.messages SET read_at = now()
    WHERE conversation_id = _conversation_id AND sender_id <> auth.uid() AND read_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, author_id, target_id),
  CHECK (author_id <> target_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Confirmed travellers review each other" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_view_contact(target_id) AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.trips t ON t.id = b.trip_id
    WHERE t.id = trip_id AND b.status = 'confirmed' AND t.departure_at < now()
      AND ((b.passenger_id = auth.uid() AND t.driver_id = target_id) OR (t.driver_id = auth.uid() AND b.passenger_id = target_id))
  ));

-- REPORTS
CREATE TYPE public.report_reason AS ENUM ('prix_excessif', 'spam', 'propos_inappropries', 'faux_profil', 'securite', 'autre');
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('trip', 'user')),
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason public.report_reason NOT NULL,
  details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members file reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins read reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name)
    VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'first_name', ''), 50));
  INSERT INTO public.profile_private (user_id, last_name, phone)
    VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'last_name', ''), 50), left(coalesce(NEW.raw_user_meta_data->>'phone', ''), 20));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
