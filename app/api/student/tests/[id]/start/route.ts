import { NextRequest, NextResponse } from 'next/server';
import type { Question } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';
import { assessmentAudienceMismatch, assessmentMatchesStudent, questionMatchesStudent } from '@/lib/assessmentTargeting';
import { formatAssessmentTimeIST, getAssessmentDeadline, getAssessmentWindowStatus } from '@/lib/assessmentSchedule';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: assessmentId } = await params;
    const student = await requireRole(['student']);
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: test, error: testError } = await adminSupabase
      .from('tests')
      .select('*')
      .eq('id', assessmentId)
      .maybeSingle();
    if (testError) throw testError;
    if (!test) {
      return NextResponse.json({ success: false, error: 'Assessment was not found.' }, { status: 404 });
    }
    if (!assessmentMatchesStudent(test, student)) {
      return NextResponse.json({ success: false, error: assessmentAudienceMismatch(test, student) }, { status: 403 });
    }

    const windowStatus = getAssessmentWindowStatus(test);
    if (windowStatus === 'unscheduled') {
      return NextResponse.json({ success: false, error: 'This assessment does not have a valid start and end time.' }, { status: 409 });
    }
    if (windowStatus === 'upcoming') {
      return NextResponse.json({ success: false, error: `This assessment opens at ${formatAssessmentTimeIST(test.start_time)}.` }, { status: 403 });
    }
    if (windowStatus === 'closed') {
      return NextResponse.json({ success: false, error: 'The assessment window has ended.' }, { status: 410 });
    }

    const { data: assignedRows, error: assignedError } = await adminSupabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', assessmentId);
    if (assignedError) throw assignedError;
    const assignedQuestionIds = new Set((assignedRows || []).map((row) => row.question_id));
    const { data: questionRows, error: questionsError } = await adminSupabase.from('questions').select('*');
    if (questionsError) throw questionsError;
    const eligibleQuestions = ((questionRows || []) as Question[])
      .filter((question) => assignedQuestionIds.has(question.id))
      .filter((question) => questionMatchesStudent(question, student.department, student.academic_year || student.year_of_study));
    if (eligibleQuestions.length === 0) {
      return NextResponse.json({ success: false, error: 'No questions are assigned to your department and year.' }, { status: 409 });
    }

    const { data: existingAttempt, error: existingAttemptError } = await supabase
      .from('test_attempts')
      .select('id, started_at')
      .eq('test_id', assessmentId)
      .eq('student_id', student.id)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingAttemptError) throw existingAttemptError;

    let attempt = existingAttempt;
    if (!attempt) {
      const { data: newAttempt, error: createAttemptError } = await supabase
        .from('test_attempts')
        .insert({
          test_id: assessmentId,
          student_id: student.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          score: 0,
        })
        .select('id, started_at')
        .single();
      if (createAttemptError) throw createAttemptError;
      attempt = newAttempt;
    }

    const serverNow = new Date().toISOString();
    const deadlineAt = new Date(getAssessmentDeadline(attempt.started_at, test.duration_minutes, test.end_time!)).toISOString();

    return NextResponse.json({
      success: true,
      assessmentId,
      attemptId: attempt.id,
      startedAt: attempt.started_at,
      deadlineAt,
      serverNow,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
