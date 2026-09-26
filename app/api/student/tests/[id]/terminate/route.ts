import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const student = await requireRole(['student']);
    const body = await req.json();
    const { attemptId } = body;

    if (!attemptId) return NextResponse.json({ success: false, error: 'attemptId is required.' }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('test_attempts')
      .update({ status: 'flagged', submitted_at: new Date().toISOString() })
      .eq('id', attemptId)
      .eq('test_id', testId)
      .eq('student_id', student.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Assessment attempt not found.' }, { status: 404 });

    return NextResponse.json({
      success: true,
      status: 'flagged',
      terminatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
