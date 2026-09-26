import type { SupabaseClient } from '@supabase/supabase-js';

export function isMissingAttendanceEntryTypeColumn(error?: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return message.includes('entry_type') && (
    error.code === 'PGRST204'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find')
  );
}

export async function insertAttendanceLog(
  supabase: SupabaseClient,
  studentId: string,
  entryType: 'portal_login' | 'assessment_entry',
) {
  const result = await supabase.from('attendance_logs').insert({ student_id: studentId, entry_type: entryType });
  if (!isMissingAttendanceEntryTypeColumn(result.error)) return result.error;

  const legacyResult = await supabase.from('attendance_logs').insert({ student_id: studentId });
  return legacyResult.error;
}