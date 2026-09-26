import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/dbService';
import { Question } from '@/lib/types';
import { requireRole } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

// Fisher-Yates shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const student = await requireRole(['student']);
    const department = student.department;
    const year = (student.academic_year || student.year_of_study || '').replace(/\s+Year$/i, '').toLowerCase();
    const tests = await DatabaseService.getTests();
    const test = tests.find((entry) => entry.id === testId);
    const targetYear = (test?.target_year || '').replace(/\s+Year$/i, '').toLowerCase();
    if (!test || test.target_department?.toLowerCase() !== department?.toLowerCase() || targetYear !== year) {
      return NextResponse.json({ success: false, error: 'This assessment is not allocated to your department and academic year.' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: testQuestionRows, error: testQuestionError } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', testId);
    if (testQuestionError) throw testQuestionError;
    const assignedQuestionIds = new Set((testQuestionRows || []).map((row) => row.question_id));
    if (assignedQuestionIds.size === 0) {
      return NextResponse.json({ success: false, error: 'This assessment has no saved questions assigned yet.' }, { status: 404 });
    }

    const { error: attendanceError } = await supabase.from('attendance_logs').insert({ student_id: student.id, entry_type: 'assessment_entry' });
    if (attendanceError) throw attendanceError;

    const questions = (await DatabaseService.getQuestionsForStudent(department, year))
      .filter((question) => assignedQuestionIds.has(question.id));

    // 1. Randomize Question Presentation Order per session
    const randomizedQuestions = shuffleArray(questions);

    // 2. Randomize MCQ Answer Options & Strip Answer Keys
    const safeQuestions: Question[] = randomizedQuestions.map((q) => {
      const safeContent = { ...q.content };
      
      // CRITICAL SERVER SECURITY: Never expose correctAnswer, answerKey, or explanation to browser
      delete (safeContent as any).correctAnswer;
      delete (safeContent as any).answerKey;
      delete (safeContent as any).explanation;
      if (q.type === 'coding' && Array.isArray(safeContent.testCases)) {
        safeContent.testCases = safeContent.testCases.filter((testCase) => testCase.isPublic !== false);
      }

      return {
        ...q,
        content: safeContent as any,
      };
    });

    return NextResponse.json({
      success: true,
      testId,
      test,
      sessionSecurityActive: true,
      questions: safeQuestions,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
