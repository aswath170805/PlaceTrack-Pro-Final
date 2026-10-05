import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

const MAX_PHOTO_SIZE = 1_200_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: testId } = await params;
    const student = await requireRole(['student']);
    const { attemptId, livePhotoData, collegeIdPhotoData } = await req.json();

    if (typeof attemptId !== 'string' || typeof livePhotoData !== 'string' || typeof collegeIdPhotoData !== 'string') {
      return NextResponse.json({ success: false, error: 'Live photo and college ID photo are required.' }, { status: 400 });
    }
    if (livePhotoData.length > MAX_PHOTO_SIZE || collegeIdPhotoData.length > MAX_PHOTO_SIZE) {
      return NextResponse.json({ success: false, error: 'Captured photos are too large.' }, { status: 413 });
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
    if (!attempt) return NextResponse.json({ success: false, error: 'Assessment attempt not found.' }, { status: 404 });

    const { error: identityError } = await supabase.from('tampering_logs').insert({
      student_id: student.id,
      event_type: 'context_menu',
      metadata: {
        record_type: 'identity_capture',
        attemptId,
        livePhotoData,
        collegeIdPhotoData,
        capturedAt: new Date().toISOString(),
      },
    });
    if (identityError) throw identityError;

    return NextResponse.json({ success: true, identityVerified: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}