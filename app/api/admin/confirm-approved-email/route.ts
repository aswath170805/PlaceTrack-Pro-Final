import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: Request) {
  try {
    const reviewer = await requireRole(['admin']);
    const { userId } = await req.json();
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ success: false, error: 'A valid user ID is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_verified')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return NextResponse.json({ success: false, error: 'The account profile was not found.' }, { status: 404 });
    if (!['student', 'faculty'].includes(profile.role) || profile.is_verified !== true) {
      return NextResponse.json({ success: false, error: 'Only approved student and faculty accounts can have email confirmed.' }, { status: 403 });
    }

    const { error: confirmationError } = await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
    if (confirmationError) throw confirmationError;

    await supabase.from('audit_logs').insert([{
      actor_id: reviewer.id,
      actor_name: 'Placement Admin',
      action: 'CONFIRM_APPROVED_USER_EMAIL',
      target_table: 'auth.users',
      target_id: userId,
      metadata: { user_name: profile.full_name, role: profile.role },
    }]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API confirm-approved-email error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
