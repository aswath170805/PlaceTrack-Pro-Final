import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/auth';

const allowedEvents = new Set(['tab_switch', 'window_defocus', 'unauthorized_key_press', 'copy_paste_attempt', 'context_menu']);

export async function POST(request: Request) {
  try {
    const student = await requireRole(['student']);
    const { eventType, metadata } = await request.json();
    if (!allowedEvents.has(eventType)) return NextResponse.json({ success: false, error: 'Unsupported tampering event.' }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tampering_logs')
      .insert({ student_id: student.id, event_type: eventType, metadata: metadata || {} })
      .select('id, student_id, event_type, metadata, created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, event: data });
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
    return NextResponse.json({ success: true, logs: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
