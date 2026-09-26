import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/supabase/auth';

const accounts = [
  {
    email: '2027eee0001@svce.ac.in',
    passwordVariable: 'SEED_STUDENT_PASSWORD',
    fullName: 'Aravind',
    role: 'student' as const,
    department: 'EEE',
    yearOfStudy: '1st Year',
    academicYear: '1st',
  },
  {
    email: 'balki0017@svce.ac.in',
    passwordVariable: 'SEED_TEACHER_PASSWORD',
    fullName: 'Balki',
    role: 'faculty' as const,
    department: 'EEE',
    yearOfStudy: 'N/A',
    academicYear: null,
  },
];

export async function POST() {
  try {
    const administrator = await requireRole(['admin']);
    const supabase = createAdminClient();
    const { data: userPage, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;

    const missingPassword = accounts.find((account) => {
      const exists = userPage.users.some((user) => user.email?.toLowerCase() === account.email);
      const password = process.env[account.passwordVariable];
      return !exists && (!password || password.length < 8);
    });
    if (missingPassword) {
      return NextResponse.json(
        { success: false, error: `Set ${missingPassword.passwordVariable} to a password of at least 8 characters in the server environment to create ${missingPassword.email}.` },
        { status: 500 },
      );
    }

    const seededAccounts = [];
    for (const account of accounts) {
      const metadata = {
        full_name: account.fullName,
        role: account.role,
        department: account.department,
        year_of_study: account.yearOfStudy,
        academic_year: account.academicYear || '4th',
      };
      const existingUser = userPage.users.find((user) => user.email?.toLowerCase() === account.email);
      const { data: authResult, error: authError } = existingUser
        ? await supabase.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
            user_metadata: metadata,
          })
        : await supabase.auth.admin.createUser({
            email: account.email,
            password: process.env[account.passwordVariable]!,
            email_confirm: true,
            user_metadata: metadata,
          });
      if (authError) throw authError;
      if (!authResult.user) throw new Error(`Unable to create Auth user ${account.email}.`);

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authResult.user.id,
        full_name: account.fullName,
        role: account.role,
        department: account.department,
        year_of_study: account.yearOfStudy,
        academic_year: account.academicYear,
        is_verified: true,
      });
      if (profileError) throw profileError;

      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ status: 'approved', reviewed_by: administrator.id, reviewed_at: new Date().toISOString(), rejection_reason: null })
        .eq('user_id', authResult.user.id)
        .eq('status', 'pending');
      if (requestError) throw requestError;

      seededAccounts.push({ id: authResult.user.id, email: account.email, role: account.role });
    }

    return NextResponse.json({ success: true, accounts: seededAccounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Account seeding failed.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
