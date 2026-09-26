import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const student = await requireRole(['student']);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('test_attempts')
      .select('id, test_id, started_at, submitted_at, score, status, tests(title)')
      .eq('id', attemptId)
      .eq('student_id', student.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Assessment result not found.' }, { status: 404 });
    return NextResponse.json({ success: true, attempt: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load assessment result.';
    return NextResponse.json({ success: false, error: message }, { status: message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}