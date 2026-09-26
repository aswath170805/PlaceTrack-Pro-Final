import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: Request) {
  try {
    const requester = await requireRole(['admin']);
    const { userId, newRole } = await req.json();
    if (!userId || !['student', 'faculty', 'admin'].includes(newRole)) {
      return NextResponse.json({ success: false, error: 'A userId and valid role are required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch original name for audit log
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, is_super_admin')
      .eq('id', userId)
      .single();
    if (profileData?.is_super_admin && !requester.is_super_admin) {
      return NextResponse.json({ success: false, error: 'Only a super-admin can change another super-admin account.' }, { status: 403 });
    }

    // Perform database role update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Log admin action in database
    await supabase.from('audit_logs').insert([
      {
        actor_id: requester.id,
        actor_name: 'Placement Admin',
        action: 'UPDATE_USER_ROLE',
        target_table: 'profiles',
        target_id: userId,
        metadata: { new_role: newRole, user_name: profileData?.full_name || 'User' },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API update-role error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
