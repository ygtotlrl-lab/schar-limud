-- ============================================================
-- שכר לימוד — Supabase setup
-- הרץ ב-Supabase SQL Editor לפני השימוש הראשון
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS public.sl_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_users TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_users_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_users_all" ON public.sl_users FOR ALL USING (true) WITH CHECK (true);

-- Students
CREATE TABLE IF NOT EXISTS public.sl_students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  handled_months JSONB DEFAULT '[]',
  card_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_students TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_students_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_students_all" ON public.sl_students FOR ALL USING (true) WITH CHECK (true);

-- Transactions
CREATE TABLE IF NOT EXISTS public.sl_transactions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES public.sl_students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_transactions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_transactions_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_transactions_all" ON public.sl_transactions FOR ALL USING (true) WITH CHECK (true);

-- Settings
CREATE TABLE IF NOT EXISTS public.sl_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_settings TO anon, authenticated, service_role;
ALTER TABLE public.sl_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_settings_all" ON public.sl_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.sl_settings (key, value) VALUES ('default_tuition', '2000') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_settings (key, value) VALUES ('admin_pass', 'admin') ON CONFLICT DO NOTHING;

-- Lists (sections, payment_methods, spread_options, contacts)
CREATE TABLE IF NOT EXISTS public.sl_lists (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_lists TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_lists_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_lists_all" ON public.sl_lists FOR ALL USING (true) WITH CHECK (true);

-- Default admin user (password: admin)
INSERT INTO public.sl_users (username, password) VALUES ('admin', 'admin') ON CONFLICT DO NOTHING;
