import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const studentPassword = process.env.SEED_STUDENT_PASSWORD;
const teacherPassword = process.env.SEED_TEACHER_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'placeholder') {
  throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.');
}
if (!studentPassword || !teacherPassword || studentPassword.length < 8 || teacherPassword.length < 8) {
  throw new Error('Provide SEED_STUDENT_PASSWORD and SEED_TEACHER_PASSWORD (at least 8 characters each).');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: '2027eee0001@svce.ac.in',
    password: studentPassword,
    fullName: 'Aravind',
    role: 'student',
    department: 'EEE',
    yearOfStudy: '1st Year',
    academicYear: '1st',
  },
  {
    email: 'balki0017@svce.ac.in',
    password: teacherPassword,
    fullName: 'Balki',
    role: 'faculty',
    department: 'EEE',
    yearOfStudy: 'N/A',
    academicYear: null,
  },
];

async function findAuthUser(email) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
  }
}

for (const account of accounts) {
  const metadata = {
    full_name: account.fullName,
    role: account.role,
    department: account.department,
    year_of_study: account.yearOfStudy,
    academic_year: account.academicYear || '4th',
  };
  const existingUser = await findAuthUser(account.email);
  const { data, error } = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      })
    : await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: metadata,
      });
  if (error) throw new Error(`Unable to create or update ${account.email}: ${error.message}`);
  if (!data.user) throw new Error(`Supabase returned no Auth user for ${account.email}.`);

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: account.fullName,
    role: account.role,
    department: account.department,
    year_of_study: account.yearOfStudy,
    academic_year: account.academicYear,
    is_verified: true,
  });
  if (profileError) throw new Error(`Unable to save ${account.email}'s profile: ${profileError.message}`);

  const { error: requestError } = await supabase
    .from('verification_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), rejection_reason: null })
    .eq('user_id', data.user.id)
    .eq('status', 'pending');
  if (requestError) throw new Error(`Unable to approve ${account.email}: ${requestError.message}`);

  console.log(`Ready: ${account.email} (${account.role}, ${account.department}${account.academicYear ? `, ${account.academicYear}` : ''})`);
}