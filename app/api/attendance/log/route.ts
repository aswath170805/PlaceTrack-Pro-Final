import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function GET() {
  try {
    const student = await requireRole(['student']);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, student_id, entry_type, login_timestamp')
      .eq('student_id', student.id)
      .order('login_timestamp', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, records: data || [] });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const student = await requireRole(['student']);
    const body = await request.json().catch(() => ({}));
    const entryType = body.entryType || 'portal_login';
    if (!['portal_login', 'assessment_entry'].includes(entryType)) {
      return NextResponse.json({ success: false, error: 'Unsupported attendance entry type.' }, { status: 400 });
    }
    const supabase = await createClient();
    const { error } = await supabase.from('attendance_logs').insert({ student_id: student.id, entry_type: entryType });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}