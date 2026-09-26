import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['faculty', 'admin']);
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.from('questions').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Question was not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API delete question error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}