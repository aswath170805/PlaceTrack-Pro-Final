import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { questionMatchesAssessment } from '@/lib/assessmentTargeting';
import type { Question } from '@/lib/types';

const departments = ['All Departments', 'CSE', 'AI', 'EEE', 'ECE', 'IT'];
const years = ['All Years', '1st', '2nd', '3rd', '4th'];
const assessmentTypes = ['daily_practice', 'weekly_assessment', 'custom'];

export async function POST(req: Request) {
  try {
    const faculty = await requireRole(['faculty', 'admin']);
    const body = await req.json();
    const {
      title,
      type,
      duration_minutes: duration,
      is_proctored: isProctored,
      is_unified: isUnified,
      target_department: targetDepartment,
      target_year: targetYear,
      start_time: startTime,
      end_time: endTime,
      question_ids: questionIds,
    } = body;

    if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) {
      return NextResponse.json({ success: false, error: 'Enter an assessment title of 1 to 160 characters.' }, { status: 400 });
    }
    if (!assessmentTypes.includes(type)) {
      return NextResponse.json({ success: false, error: 'Select a valid assessment type.' }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 5 || duration > 240) {
      return NextResponse.json({ success: false, error: 'Duration must be a whole number between 5 and 240 minutes.' }, { status: 400 });
    }
    if (typeof isProctored !== 'boolean' || typeof isUnified !== 'boolean' || !departments.includes(targetDepartment) || !years.includes(targetYear)) {
      return NextResponse.json({ success: false, error: 'Select valid proctoring and audience settings.' }, { status: 400 });
    }

    const startsAt = Date.parse(startTime);
    const endsAt = Date.parse(endTime);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt < Date.now() || endsAt <= startsAt) {
      return NextResponse.json({ success: false, error: 'Provide a valid future start time and a later end time.' }, { status: 400 });
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0 || questionIds.some((id) => typeof id !== 'string') || new Set(questionIds).size !== questionIds.length) {
      return NextResponse.json({ success: false, error: 'Select at least one unique saved question.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: questions, error: questionError } = await supabase
      .from('questions')
      .select('id, target_department, target_year')
      .in('id', questionIds);
    if (questionError) throw questionError;
    if (!questions || questions.length !== questionIds.length) {
      return NextResponse.json({ success: false, error: 'One or more selected questions no longer exist.' }, { status: 400 });
    }
    if (questions.some((question) => !questionMatchesAssessment(question as Question, targetDepartment, targetYear, isUnified))) {
      return NextResponse.json({ success: false, error: 'Selected questions do not match the assessment audience.' }, { status: 400 });
    }

    const { data: createdTest, error: createError } = await supabase
      .from('tests')
      .insert({
        title: title.trim(),
        type,
        batch_id: null,
        created_by: faculty.id,
        duration_minutes: duration,
        is_proctored: isProctored,
        is_unified: isUnified,
        target_department: targetDepartment,
        target_year: targetYear,
        start_time: new Date(startsAt).toISOString(),
        end_time: new Date(endsAt).toISOString(),
      })
      .select('id')
      .single();
    if (createError) throw createError;

    const { error: attachError } = await supabase
      .from('test_questions')
      .insert(questionIds.map((questionId: string) => ({ test_id: createdTest.id, question_id: questionId })));
    if (attachError) {
      await supabase.from('tests').delete().eq('id', createdTest.id);
      throw attachError;
    }

    return NextResponse.json({ success: true, testId: createdTest.id });
  } catch (err: any) {
    console.error('API create assessment error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}