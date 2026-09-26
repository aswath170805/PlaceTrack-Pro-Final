import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    const requester = await requireRole(['admin']);
    if (!requester.is_super_admin) {
      return NextResponse.json({ success: false, error: 'Only super-admins can delete users.' }, { status: 403 });
    }
    if (requester.id === userId) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    await supabase.from('audit_logs').insert([{ actor_id: requester.id, action: 'DELETE_USER', target_table: 'profiles', target_id: userId }]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}