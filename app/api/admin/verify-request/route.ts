import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';

export async function POST(req: Request) {
  try {
    const reviewer = await requireRole(['admin']);
    const { requestId, userId, status, reason } = await req.json();
    if (!requestId || !userId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'A request, user, and valid review status are required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isApproved = status === 'approved';

    const { data: requestRecord, error: requestLookupError } = await supabase
      .from('verification_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .eq('user_id', userId)
      .maybeSingle();
    if (requestLookupError) throw requestLookupError;
    if (!requestRecord) return NextResponse.json({ success: false, error: 'Access request was not found.' }, { status: 404 });
    if (requestRecord.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'This access request has already been reviewed.' }, { status: 409 });
    }

    const { data: profileBefore, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id, is_verified')
      .eq('id', userId)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;
    if (!profileBefore) return NextResponse.json({ success: false, error: 'The account profile was not found.' }, { status: 404 });

    // Update the profile first; only report approval if both records are confirmed.
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({ is_verified: isApproved })
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (profileError) throw profileError;
    if (!updatedProfile) return NextResponse.json({ success: false, error: 'The account profile could not be updated.' }, { status: 404 });

    const { data: updatedRequest, error: reqError } = await supabase
      .from('verification_requests')
      .update({
        status: status,
        rejection_reason: isApproved ? null : reason || 'Access request rejected by Placement Admin.',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.id,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (reqError) {
      await supabase.from('profiles').update({ is_verified: profileBefore.is_verified }).eq('id', userId);
      throw reqError;
    }
    if (!updatedRequest) {
      await supabase.from('profiles').update({ is_verified: profileBefore.is_verified }).eq('id', userId);
      return NextResponse.json({ success: false, error: 'This access request was reviewed by another admin.' }, { status: 409 });
    }

    // Fetch user name for auditing
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // 3. Log audit entry
    await supabase.from('audit_logs').insert([
      {
        actor_id: reviewer.id,
        actor_name: 'Placement Admin',
        action: isApproved ? 'APPROVE_USER_VERIFICATION' : 'REJECT_USER_VERIFICATION',
        target_table: 'verification_requests',
        target_id: requestId,
        metadata: {
          user_id: userId,
          user_name: profileData?.full_name || 'User',
          reason: isApproved ? 'Access granted' : reason || 'Access request rejected',
        },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API verify-request error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
