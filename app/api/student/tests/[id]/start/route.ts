import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/dbService';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assessmentId } = await params;
    const student = await requireRole(['student']);

    const test = (await DatabaseService.getTests()).find((entry) => entry.id === assessmentId);
    const studentYear = (student.academic_year || student.year_of_study || '').replace(/\s+Year$/i, '').toLowerCase();
    const testYear = (test?.target_year || '').replace(/\s+Year$/i, '').toLowerCase();
    if (!test || test.target_department?.toLowerCase() !== student.department?.toLowerCase() || testYear !== studentYear) {
      return NextResponse.json({ success: false, error: 'This assessment is not allocated to your department and academic year.' }, { status: 403 });
    }

    const attempt = await DatabaseService.submitTestAttempt({
      test_id: assessmentId,
      student_id: student.id,
      student_name: student.full_name,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      score: 0,
    });

    const supabase = await createClient();
    const { error: attendanceError } = await supabase.from('attendance_logs').insert({ student_id: student.id, entry_type: 'assessment_entry' });
    if (attendanceError) throw attendanceError;

    return NextResponse.json({
      success: true,
      assessmentId,
      attemptId: attempt.id,
      authorizedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
