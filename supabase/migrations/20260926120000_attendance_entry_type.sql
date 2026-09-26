ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'portal_login';

ALTER TABLE public.attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_entry_type_check;

ALTER TABLE public.attendance_logs
  ADD CONSTRAINT attendance_logs_entry_type_check
  CHECK (entry_type IN ('portal_login', 'assessment_entry'));

NOTIFY pgrst, 'reload schema';