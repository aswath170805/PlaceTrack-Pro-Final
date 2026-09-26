import { createClient } from '@/lib/supabase/client';
import {
  Batch,
  Profile,
  QuestionBank,
  Question,
  Test,
  TestAttempt,
  AttendanceRecord,
  VerificationRequest
} from '@/lib/types';

// Direct Supabase Postgres Database Service

export class DatabaseService {
  private static getSupabase() {
    return createClient();
  }

  // BATCHES
  static async getBatches(): Promise<Batch[]> {
    const { data, error } = await this.getSupabase().from('batches').select('*');
    if (error) throw new Error(`Unable to load batches: ${error.message}`);
    return (data || []) as Batch[];
  }

  static async createBatch(name: string, createdBy?: string): Promise<Batch> {
    const { data, error } = await this.getSupabase().from('batches').insert([{ name, created_by: createdBy }]).select().single();
    if (error) throw new Error(`Unable to create batch: ${error.message}`);
    return data as Batch;
  }

  // PROFILES / USERS
  static async getProfiles(): Promise<Profile[]> {
    const { data, error } = await this.getSupabase().from('profiles').select('*');
    if (error) throw new Error(`Unable to load profiles: ${error.message}`);
    return (data || []) as Profile[];
  }

  static async updateProfileRole(userId: string, role: 'student' | 'faculty' | 'admin', _requesterId?: string): Promise<void> {
    const response = await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newRole: role }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to update this account role.');
  }

  // VERIFICATION REQUESTS
  static async getVerificationRequests(): Promise<VerificationRequest[]> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Unable to load access requests: ${error.message}`);
    return (data || []) as VerificationRequest[];
  }

  static async approveVerificationRequest(requestId: string, userId: string, reviewerId?: string): Promise<boolean> {
    const response = await fetch('/api/admin/verify-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            userId,
            status: 'approved',
            reviewerId,
          })
        });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to approve this access request.');
    return true;
  }

  static async rejectVerificationRequest(requestId: string, userId: string, reason?: string, reviewerId?: string): Promise<boolean> {
    const response = await fetch('/api/admin/verify-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            userId,
            status: 'rejected',
            reason: reason || 'Access request declined by Administrator',
            reviewerId,
          })
        });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to reject this access request.');
    return true;
  }

  // QUESTION BANKS & QUESTIONS
  static async getQuestionBanks(): Promise<QuestionBank[]> {
    const { data, error } = await this.getSupabase().from('question_banks').select('*');
    if (error) throw new Error(`Unable to load question banks: ${error.message}`);
    return (data || []) as QuestionBank[];
  }

  static async createQuestionBank(title: string, topic: string, createdBy: string, target_department?: string, target_year?: string): Promise<QuestionBank> {
    const { data, error } = await this.getSupabase().from('question_banks').insert([{
        title,
        topic,
        created_by: createdBy,
        target_department: target_department || 'CSE',
        target_year: target_year || '1st'
      }]).select().single();
    if (error) throw new Error(`Unable to create question bank: ${error.message}`);
    return data as QuestionBank;
  }

  static async getQuestions(bankId?: string): Promise<Question[]> {
    let query = this.getSupabase().from('questions').select('*');
    if (bankId) query = query.eq('bank_id', bankId);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load questions: ${error.message}`);
    return (data || []) as Question[];
  }

  static async getQuestionsForStudent(department?: string, year?: string): Promise<Question[]> {
    const normalizeYear = (value?: string) => (value || '').replace(/\s+Year$/i, '').trim().toLowerCase();
    const matchesStudentRoute = (question: Question) => {
      const questionData = question as Question & { department?: string; academic_year?: string };
      const targetDepartment = question.target_department || questionData.department || '';
      const targetYear = question.target_year || questionData.academic_year || '';
      return !!department && !!year && targetDepartment.toLowerCase() === department.toLowerCase() && normalizeYear(targetYear) === normalizeYear(year);
    };

    const { data, error } = await this.getSupabase().from('questions').select('*');
    if (error) throw new Error(`Unable to load routed questions: ${error.message}`);
    return ((data || []) as Question[]).filter(matchesStudentRoute);
  }

  static async createQuestion(question: Partial<Question>): Promise<Question> {
    const { data, error } = await this.getSupabase().from('questions').insert([{
        bank_id: question.bank_id,
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty,
        content: question.content,
        target_department: question.target_department || 'CSE',
        target_year: question.target_year || '1st'
      }]).select().single();
    if (error) throw new Error(`Unable to create question: ${error.message}`);
    return data as Question;
  }

  static async updateQuestion(question: Question): Promise<Question> {
    const { data, error } = await this.getSupabase().from('questions').update({
        type: question.type,
        topic: question.topic,
        difficulty: question.difficulty,
        content: question.content,
        target_department: question.target_department,
        target_year: question.target_year,
      }).eq('id', question.id).select().single();
    if (error) throw new Error(`Unable to update question: ${error.message}`);
    return data as Question;
  }

  // TESTS & TEST ATTEMPTS
  static async getTests(): Promise<Test[]> {
    const { data, error } = await this.getSupabase().from('tests').select('*');
    if (error) throw new Error(`Unable to load assessments: ${error.message}`);
    return (data || []) as Test[];
  }

  static async createTest(testData: Partial<Test>): Promise<Test> {
    const { data, error } = await this.getSupabase().from('tests').insert([{
        title: testData.title,
        type: testData.type,
        batch_id: testData.batch_id,
        created_by: testData.created_by,
        duration_minutes: testData.duration_minutes,
        is_proctored: testData.is_proctored,
        target_department: testData.target_department || 'All Departments',
        target_year: testData.target_year || 'All Years'
      }]).select().single();
    if (error) throw new Error(`Unable to create assessment: ${error.message}`);
    return data as Test;
  }

  static async attachQuestionsToTest(testId: string, questionIds: string[]): Promise<void> {
    const rows = questionIds.map((questionId) => ({ test_id: testId, question_id: questionId }));
    const { error } = await this.getSupabase().from('test_questions').insert(rows);
    if (error) throw new Error(`Unable to attach questions to assessment: ${error.message}`);
  }

  static async getTestAttempts(studentId?: string): Promise<TestAttempt[]> {
    let query = this.getSupabase().from('test_attempts').select('*');
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load assessment attempts: ${error.message}`);
    return (data || []) as TestAttempt[];
  }

  static async submitTestAttempt(attemptData: Partial<TestAttempt>): Promise<TestAttempt> {
    const { data, error } = await this.getSupabase().from('test_attempts').insert([{
        test_id: attemptData.test_id,
        student_id: attemptData.student_id,
        score: attemptData.score,
        status: attemptData.status || 'submitted',
        started_at: attemptData.started_at,
        submitted_at: attemptData.submitted_at,
      }]).select().single();
    if (error) throw new Error(`Unable to save assessment attempt: ${error.message}`);
    return data as TestAttempt;
  }

  static async getReadinessScore(studentId: string): Promise<{ overall_score: number }> {
    const { data, error } = await this.getSupabase().from('test_attempts').select('score').eq('student_id', studentId);
    if (error) throw new Error(`Unable to load readiness score: ${error.message}`);
    const scores = (data || []).map((attempt) => Number(attempt.score) || 0);
    const overall_score = scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0;
    return { overall_score };
  }

  static async terminateTestAttempt(targetId: string, _flagCount: number, _reason: string): Promise<void> {
    const { data, error } = await this.getSupabase()
      .from('test_attempts')
      .update({ status: 'flagged', submitted_at: new Date().toISOString() })
      .eq('id', targetId)
      .select('id')
      .single();
    if (error) throw new Error(`Unable to terminate assessment: ${error.message}`);
    if (!data) throw new Error('Assessment attempt not found.');
  }

  // ATTENDANCE
  static async getAttendanceRecords(studentId?: string): Promise<AttendanceRecord[]> {
    let query = this.getSupabase().from('attendance_logs').select('id, student_id, entry_type, login_timestamp');
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query.order('login_timestamp', { ascending: false });
    if (error) throw new Error(`Unable to load attendance logs: ${error.message}`);

    const profiles = await this.getSupabase().from('profiles').select('id, full_name');
    if (profiles.error) throw new Error(`Unable to load attendance names: ${profiles.error.message}`);
    const names = new Map((profiles.data || []).map((profile) => [profile.id, profile.full_name]));
    return (data || []).map((record) => ({
      id: record.id,
      student_id: record.student_id,
      student_name: names.get(record.student_id),
      session_id: record.id,
      session_title: record.entry_type === 'assessment_entry' ? 'Assessment entry' : 'Portal login',
      status: 'present' as const,
      reviewed_by_faculty: false,
      created_at: record.login_timestamp,
    }));
  }
}
