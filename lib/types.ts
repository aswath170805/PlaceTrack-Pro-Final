export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: 'student' | 'faculty' | 'admin';
  department: string;
  year_of_study: string;
  academic_year?: string;
  batch_id?: string;
  is_verified?: boolean;
  is_super_admin?: boolean;
  current_streak?: number;
  avatar_url?: string;
  created_at: string;
}

export interface Batch {
  id: string;
  name: string;
  created_by?: string;
  student_count?: number;
}

export interface QuestionBank {
  id: string;
  title: string;
  topic: string;
  question_count?: number;
  created_by: string;
  target_department?: string;
  target_year?: string;
}

export interface Question {
  id: string;
  bank_id: string;
  type: 'mcq' | 'coding' | 'short_answer';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  target_department?: string;
  target_year?: string;
  content: {
    questionText: string;
    options?: string[];
    correctAnswer?: string | number;
    explanation?: string;
    starterCode?: string;
    testCases?: { input: string; expectedOutput: string; isPublic?: boolean }[];
  };
  created_at: string;
}

export interface Test {
  id: string;
  title: string;
  type: 'daily_practice' | 'weekly_assessment' | 'custom';
  batch_id?: string;
  batch_name?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_by: string;
  is_proctored: boolean;
  question_count?: number;
  target_department?: string;
  target_year?: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  user_name?: string;
  email?: string;
  role: 'student' | 'faculty' | 'admin';
  department?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  test_title?: string;
  student_id: string;
  student_name?: string;
  started_at: string;
  submitted_at?: string;
  score: number;
  max_score?: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted' | 'flagged';
  flag_count?: number;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: unknown;
  is_correct?: boolean;
  score?: number;
}

export interface ProctoringEvent {
  id: string;
  attempt_id: string;
  student_name?: string;
  test_title?: string;
  event_type: 'multiple_faces' | 'no_face' | 'gaze_away' | 'phone_detected' | 'tab_switch' | 'window_blur' | 'copy_paste';
  severity: 'low' | 'medium' | 'high';
  snapshot_url?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  session_id: string;
  session_title: string;
  status: 'present' | 'absent';
  absence_reason?: string;
  reviewed_by_faculty: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  target_table: string;
  target_id?: string;
  metadata?: unknown;
  created_at: string;
}