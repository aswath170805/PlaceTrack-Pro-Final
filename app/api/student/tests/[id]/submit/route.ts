import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { assessmentAudienceMismatch, assessmentMatchesStudent, questionMatchesStudent } from '@/lib/assessmentTargeting';
import { getAssessmentDeadline, getAssessmentWindowStatus } from '@/lib/assessmentSchedule';
import type { Question } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const student = await requireRole(['student']);
    const body = await req.json();
    const { answers, attemptId } = body;
    if (typeof attemptId !== 'string' || !attemptId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ success: false, error: 'A valid attempt and answer set are required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
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
      return NextResponse.json({ success: false, error: 'This assessment has not opened yet.' }, { status: 403 });
    }

    const { data: attempt, error: attemptLookupError } = await supabase
      .from('test_attempts')
      .select('id, started_at, status')
      .eq('id', attemptId)
      .eq('test_id', testId)
      .eq('student_id', student.id)
      .maybeSingle();
    if (attemptLookupError) throw attemptLookupError;
    if (!attempt || attempt.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'This assessment attempt is no longer active.' }, { status: 409 });
    }
    const attemptStartedAt = Date.parse(attempt.started_at);
    if (attemptStartedAt < Date.parse(test.start_time || '') || attemptStartedAt >= Date.parse(test.end_time || '')) {
      return NextResponse.json({ success: false, error: 'This attempt did not start during the assessment window.' }, { status: 403 });
    }

    const now = Date.now();
    const hardDeadline = getAssessmentDeadline(attempt.started_at, test.duration_minutes, test.end_time!);
    const submissionStatus = now >= hardDeadline ? 'auto_submitted' : 'submitted';
    const { data: assignedQuestionRows, error: assignedQuestionsError } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', testId);
    if (assignedQuestionsError) throw assignedQuestionsError;
    const assignedQuestionIds = new Set((assignedQuestionRows || []).map((row) => row.question_id));
    const { data: questionRows, error: questionsError } = await supabase.from('questions').select('*');
    if (questionsError) throw questionsError;
    const allQuestions = ((questionRows || []) as Question[])
      .filter((question) => questionMatchesStudent(question, student.department, student.academic_year || student.year_of_study))
      .filter((question) => assignedQuestionIds.has(question.id));
    if (allQuestions.length === 0) {
      return NextResponse.json({ success: false, error: 'No questions are routed to this assessment.' }, { status: 400 });
    }
    let totalScore = 0;
    const pointsPerQuestion = 100 / allQuestions.length;
    let maxScore = 0;
    const evaluatedAnswers: Record<string, boolean> = {};

    allQuestions.forEach((q) => {
      const studentAns = answers ? answers[q.id] : undefined;
      const expectedAns = q.content.correctAnswer;
      const isCorrect = q.type === 'mcq' && Number(studentAns) === Number(expectedAns);
      maxScore += pointsPerQuestion;
      if (isCorrect) totalScore += pointsPerQuestion;
      evaluatedAnswers[q.id] = isCorrect;
    });

    const finalPercentage = Math.round((totalScore / (maxScore || 100)) * 100);

    const { data: completedAttempt, error: updateAttemptError } = await supabase
      .from('test_attempts')
      .update({
        score: finalPercentage,
        status: submissionStatus,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .eq('student_id', student.id)
      .eq('status', 'in_progress')
      .select('id')
      .maybeSingle();
    if (updateAttemptError) throw updateAttemptError;
    if (!completedAttempt) {
      return NextResponse.json({ success: false, error: 'This assessment attempt was already submitted.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      score: finalPercentage,
      attemptId: completedAttempt.id,
      status: submissionStatus,
      evaluatedAnswers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
