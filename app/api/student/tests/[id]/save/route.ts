import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const body = await req.json();
    const { attemptId, answers } = body;
    const student = await requireRole(['student']);
    if (typeof attemptId !== 'string' || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ success: false, error: 'A valid attempt and answer set are required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('id', attemptId)
      .eq('test_id', testId)
      .eq('student_id', student.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return NextResponse.json({ success: false, error: 'Assessment attempt is no longer active.' }, { status: 409 });

    const answerRows = Object.entries(answers).map(([questionId, studentAnswer]) => ({
      attempt_id: attemptId,
      question_id: questionId,
      student_answer: studentAnswer,
    }));
    const { error: deleteError } = await supabase.from('attempt_answers').delete().eq('attempt_id', attemptId);
    if (deleteError) throw deleteError;
    if (answerRows.length) {
      const { error: insertError } = await supabase.from('attempt_answers').insert(answerRows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      testId,
      attemptId,
      savedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
