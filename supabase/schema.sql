-- PlaceTrack Pro Database Schema & Row-Level Security Policies
-- Executed on Supabase / Postgres

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  department TEXT,
  year_of_study TEXT,
  batch_id UUID,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_batch 
  FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

-- 3. Question Banks
CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.question_banks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'coding', 'short_answer')),
  content JSONB NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tests
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_practice', 'weekly_assessment', 'custom')),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INT NOT NULL DEFAULT 60,
  created_by UUID REFERENCES public.profiles(id),
  is_proctored BOOLEAN DEFAULT true,
  is_unified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_unified BOOLEAN NOT NULL DEFAULT false;

-- 6. Test Questions Junction
CREATE TABLE IF NOT EXISTS public.test_questions (
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  PRIMARY KEY (test_id, question_id)
);

-- 7. Test Attempts
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'flagged')) DEFAULT 'in_progress'
);

-- 8. Attempt Answers
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer JSONB,
  is_correct BOOLEAN,
  score NUMERIC DEFAULT 0
);

-- 9. Proctoring Events
CREATE TABLE IF NOT EXISTS public.proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('multiple_faces', 'no_face', 'gaze_away', 'phone_detected', 'tab_switch', 'window_blur', 'copy_paste')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  snapshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  session_title TEXT NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent')),
  absence_reason TEXT,
  reviewed_by_faculty BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper RLS Functions
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies

-- PROFILES: Users read self; Faculty/Admin read all.
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.get_user_role() IN ('faculty', 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.get_user_role() = 'admin');
CREATE POLICY "Super admins delete profiles" ON public.profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles requester WHERE requester.id = auth.uid() AND requester.is_super_admin = true)
);

-- BATCHES: Authenticated read; Faculty/Admin manage.
CREATE POLICY "All authenticated users view batches" ON public.batches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Faculty/Admin manage batches" ON public.batches FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));

-- QUESTION BANKS & QUESTIONS: Faculty/Admin manage; Students read.
CREATE POLICY "Faculty/Admin manage question banks" ON public.question_banks FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));
CREATE POLICY "Students view question banks" ON public.question_banks FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Faculty/Admin manage questions" ON public.questions FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));
CREATE POLICY "Students view questions" ON public.questions FOR SELECT USING (auth.role() = 'authenticated');

-- TESTS & TEST QUESTIONS: Everyone view; Faculty/Admin manage.
CREATE POLICY "View tests" ON public.tests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage tests" ON public.tests FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));

CREATE POLICY "View test_questions" ON public.test_questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage test_questions" ON public.test_questions FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));

-- TEST ATTEMPTS: Students manage own attempts; Faculty/Admin view all.
CREATE POLICY "Students view own test attempts" ON public.test_attempts FOR SELECT USING (student_id = auth.uid() OR public.get_user_role() IN ('faculty', 'admin'));
CREATE POLICY "Students create own test attempts" ON public.test_attempts FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own test attempts" ON public.test_attempts FOR UPDATE USING (student_id = auth.uid() OR public.get_user_role() IN ('faculty', 'admin'));

-- ATTEMPT ANSWERS: Students insert/select own answers; Faculty/Admin view all.
CREATE POLICY "Students manage attempt answers" ON public.attempt_answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.test_attempts ta WHERE ta.id = attempt_answers.attempt_id AND ta.student_id = auth.uid()
  ) OR public.get_user_role() IN ('faculty', 'admin')
);

-- PROCTORING EVENTS: Students insert events; Faculty/Admin view all.
CREATE POLICY "Students insert proctoring events" ON public.proctoring_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_attempts ta WHERE ta.id = proctoring_events.attempt_id AND ta.student_id = auth.uid()
  ) OR public.get_user_role() IN ('faculty', 'admin')
);
CREATE POLICY "View proctoring events" ON public.proctoring_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.test_attempts ta WHERE ta.id = proctoring_events.attempt_id AND ta.student_id = auth.uid()
  ) OR public.get_user_role() IN ('faculty', 'admin')
);

-- ATTENDANCE: Students view & update own; Faculty/Admin full access.
CREATE POLICY "Students view attendance" ON public.attendance FOR SELECT USING (student_id = auth.uid() OR public.get_user_role() IN ('faculty', 'admin'));
CREATE POLICY "Students submit absence reason" ON public.attendance FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Faculty/Admin manage attendance" ON public.attendance FOR ALL USING (public.get_user_role() IN ('faculty', 'admin'));

-- AUDIT LOGS: Admin only.
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT USING (public.get_user_role() = 'admin');

-- Auth Trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, department, year_of_study)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'department', 'Computer Science'),
    COALESCE(new.raw_user_meta_data->>'year_of_study', 'Final Year')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Verification Requests Table (Faculty / Student Approval Workflow)
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage verification requests" ON public.verification_requests FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Users view own verification requests" ON public.verification_requests FOR SELECT USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

-- Target Department & Academic Year allocations on tests, question banks, and questions
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS target_department TEXT DEFAULT 'All Departments';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS target_year TEXT DEFAULT 'All Years';

ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS target_department TEXT DEFAULT 'All Departments';
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS target_year TEXT DEFAULT 'All Years';

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS target_department TEXT DEFAULT 'All Departments';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS target_year TEXT DEFAULT 'All Years';

-- Database Trigger and Function to prevent client-side updates to role and is_verified
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoked by an authenticated non-service-role client, prevent changing role or is_verified directly
  IF (current_user != 'service_role' AND auth.role() = 'authenticated') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Changing profile role is prohibited directly through client. Use Admin API.';
    END IF;
    IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
      RAISE EXCEPTION 'Changing verification status is prohibited directly through client. Use Admin API.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_roles();

