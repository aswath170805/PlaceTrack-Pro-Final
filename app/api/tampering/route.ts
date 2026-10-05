import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

const allowedEvents = new Set(['tab_switch', 'window_defocus', 'unauthorized_key_press', 'copy_paste_attempt', 'context_menu']);

export async function POST(request: Request) {
  try {
    const student = await requireRole(['student']);
    const { eventType, metadata, attemptId } = await request.json();
    if (typeof eventType !== 'string') return NextResponse.json({ success: false, error: 'Unsupported tampering event.' }, { status: 400 });
    const supabase = await createClient();
    const storedEventType = allowedEvents.has(eventType) ? eventType : 'window_defocus';
    const eventMetadata = {
      ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
      attemptId: attemptId || null,
      ...(storedEventType !== eventType ? { reportedEventType: eventType } : {}),
    };
    const { error } = await supabase
      .from('tampering_logs')
      .insert({ student_id: student.id, event_type: storedEventType, metadata: eventMetadata });
    if (error) throw error;
    return NextResponse.json({
      success: true,
      event: { id: crypto.randomUUID(), event_type: eventType, created_at: new Date().toISOString() },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

export async function GET() {
  try {
    await requireRole(['admin']);
    const supabase = await createClient();
    const { data, error } = await supabase.from('tampering_logs').select('id, student_id, event_type, metadata, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      success: true,
      logs: (data || []).map((log) => ({
        ...log,
        event_type: log.metadata?.record_type === 'identity_capture'
          ? 'identity_verification'
          : log.metadata?.reportedEventType || log.event_type,
        metadata: log.metadata?.record_type === 'identity_capture'
          ? { record_type: 'identity_capture', attemptId: log.metadata.attemptId, capturedAt: log.metadata.capturedAt }
          : log.metadata,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
