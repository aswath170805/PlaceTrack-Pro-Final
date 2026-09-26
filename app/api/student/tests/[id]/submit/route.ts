import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/dbService';
import { requireRole } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { assessmentMatchesStudent, questionMatchesStudent } from '@/lib/assessmentTargeting';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const student = await requireRole(['student']);
    const body = await req.json();
    const { answers } = body;

    const test = (await DatabaseService.getTests()).find((entry) => entry.id === testId);
    if (!test || !assessmentMatchesStudent(test, student)) {
      return NextResponse.json({ success: false, error: 'This assessment is not allocated to your department and academic year.' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: assignedQuestionRows, error: assignedQuestionsError } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', testId);
    if (assignedQuestionsError) throw assignedQuestionsError;
    const assignedQuestionIds = new Set((assignedQuestionRows || []).map((row) => row.question_id));
    const allQuestions = (await DatabaseService.getQuestions())
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

    // Record submission in Database
    const attempt = await DatabaseService.submitTestAttempt({
      test_id: testId,
      student_id: student.id,
      score: finalPercentage,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      score: finalPercentage,
      attemptId: attempt.id,
      evaluatedAnswers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
