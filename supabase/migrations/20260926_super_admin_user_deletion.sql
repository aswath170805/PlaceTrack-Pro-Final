ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'portal_login';
ALTER TABLE public.attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_entry_type_check;
ALTER TABLE public.attendance_logs
  ADD CONSTRAINT attendance_logs_entry_type_check
  CHECK (entry_type IN ('portal_login', 'assessment_entry'));

UPDATE public.profiles
SET department = CASE lower(department)
  WHEN 'computer science' THEN 'CSE'
  WHEN 'computer science & engineering' THEN 'CSE'
  WHEN 'information technology' THEN 'IT'
  WHEN 'electronics & comm' THEN 'ECE'
  WHEN 'artificial intelligence & data science' THEN 'AI'
  WHEN 'aids' THEN 'AI'
  ELSE department
END
WHERE department IS NOT NULL;

UPDATE public.profiles
SET academic_year = CASE
  WHEN year_of_study ILIKE '1st%' THEN '1st'
  WHEN year_of_study ILIKE '2nd%' THEN '2nd'
  WHEN year_of_study ILIKE '3rd%' THEN '3rd'
  WHEN year_of_study ILIKE '4th%' THEN '4th'
  ELSE '4th'
END
WHERE academic_year IS NULL OR academic_year NOT IN ('1st', '2nd', '3rd', '4th');

UPDATE public.profiles SET department = 'CSE' WHERE department IS NULL;

CREATE OR REPLACE FUNCTION public.protect_profile_authoritative_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'student' AND (
    NEW.department IS NULL OR NEW.department NOT IN ('CSE', 'AI', 'EEE', 'ECE', 'IT') OR
    NEW.academic_year IS NULL OR NEW.academic_year NOT IN ('1st', '2nd', '3rd', '4th')
  ) THEN
    RAISE EXCEPTION 'Students must have a supported department and academic year';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'student' AND (
    NEW.department IS DISTINCT FROM OLD.department OR NEW.academic_year IS DISTINCT FROM OLD.academic_year
  ) AND (
    NEW.department IS NULL OR NEW.department NOT IN ('CSE', 'AI', 'EEE', 'ECE', 'IT') OR
    NEW.academic_year IS NULL OR NEW.academic_year NOT IN ('1st', '2nd', '3rd', '4th')
  ) THEN
    RAISE EXCEPTION 'Students must have a supported department and academic year';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles requester
      WHERE requester.id = auth.uid() AND requester.is_super_admin = true
    ) THEN
    RAISE EXCEPTION 'Only a super-admin can change super-admin status';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() = OLD.id AND (
      NEW.role IS DISTINCT FROM OLD.role OR
      NEW.department IS DISTINCT FROM OLD.department OR
      NEW.year_of_study IS DISTINCT FROM OLD.year_of_study OR
      NEW.academic_year IS DISTINCT FROM OLD.academic_year OR
      NEW.is_verified IS DISTINCT FROM OLD.is_verified OR
      NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin OR
      NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
      NEW.last_active_date IS DISTINCT FROM OLD.last_active_date
    ) THEN
      RAISE EXCEPTION 'Authoritative profile fields cannot be changed by the account owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_authoritative_fields ON public.profiles;
CREATE TRIGGER protect_profile_authoritative_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_authoritative_fields();

DROP POLICY IF EXISTS "Students view questions" ON public.questions;
DROP POLICY IF EXISTS "Students view routed questions" ON public.questions;
CREATE POLICY "Students view routed questions" ON public.questions FOR SELECT USING (
  public.get_user_role() IN ('faculty', 'admin') OR EXISTS (
    SELECT 1 FROM public.profiles student
    WHERE student.id = auth.uid()
      AND student.role = 'student'
      AND COALESCE(public.questions.department, NULLIF(public.questions.target_department, 'All Departments')) = student.department
      AND COALESCE(public.questions.academic_year, NULLIF(REPLACE(public.questions.target_year, ' Year', ''), 'All Years')) = student.academic_year
  )
);

DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins delete profiles" ON public.profiles;

CREATE POLICY "Super admins delete profiles" ON public.profiles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles requester
    WHERE requester.id = auth.uid() AND requester.is_super_admin = true
  )
);

ALTER TABLE public.tampering_logs
  DROP CONSTRAINT IF EXISTS tampering_logs_event_type_check;
ALTER TABLE public.tampering_logs
  ADD CONSTRAINT tampering_logs_event_type_check
  CHECK (event_type IN ('tab_switch', 'window_defocus', 'unauthorized_key_press', 'copy_paste_attempt', 'context_menu'));

DROP TRIGGER IF EXISTS attendance_updates_student_activity ON public.attendance_logs;