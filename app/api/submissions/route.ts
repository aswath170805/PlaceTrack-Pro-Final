import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(request: Request) {
  try {
    const student = await requireRole(['student']);
    const { questionId, code } = await request.json();
    if (!questionId || typeof code !== 'string' || code.length === 0 || code.length > 100000) {
      return NextResponse.json({ success: false, error: 'questionId and a valid code submission are required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, type, target_department, target_year, department, academic_year')
      .eq('id', questionId)
      .single();
    if (questionError || !question || question.type !== 'coding') {
      return NextResponse.json({ success: false, error: 'Coding question not found.' }, { status: 404 });
    }

    const questionDepartment = question.target_department || question.department || '';
    const questionYear = (question.target_year || question.academic_year || '').replace(/\s+Year$/i, '').toLowerCase();
    const studentYear = (student.academic_year || student.year_of_study || '').replace(/\s+Year$/i, '').toLowerCase();
    if (questionDepartment.toLowerCase() !== student.department.toLowerCase() || questionYear !== studentYear) {
      return NextResponse.json({ success: false, error: 'This question is not routed to your department and academic year.' }, { status: 403 });
    }

    const { data, error } = await supabase.from('submissions').insert({
      student_id: student.id,
      question_id: questionId,
      code_submitted: code,
      status: 'partial',
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, submission: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
