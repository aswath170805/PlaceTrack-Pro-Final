import type { Profile, Question, Test } from '@/lib/types';

type TargetKind = 'department' | 'year';

function normalizeTarget(value?: string) {
  return (value || '').replace(/\s+Year$/i, '').trim().toLowerCase();
}

function isWildcardTarget(value: string | undefined, kind: TargetKind) {
  const target = normalizeTarget(value);
  if (kind === 'department') {
    return ['all departments', 'all depts', 'any department', 'any dept', '*'].includes(target);
  }
  return ['all years', 'any year', '*'].includes(target);
}

export function targetMatchesStudent(target: string | undefined, actual: string | undefined, kind: TargetKind) {
  if (!actual) return false;
  return isWildcardTarget(target, kind) || normalizeTarget(target) === normalizeTarget(actual);
}

export function assessmentMatchesStudent(test: Test, student: Profile) {
  return targetMatchesStudent(test.target_department, student.department, 'department')
    && targetMatchesStudent(test.target_year, student.academic_year || student.year_of_study, 'year');
}

export function questionMatchesStudent(question: Question, department?: string, year?: string) {
  const questionData = question as Question & { department?: string; academic_year?: string };
  return targetMatchesStudent(question.target_department || questionData.department, department, 'department')
    && targetMatchesStudent(question.target_year || questionData.academic_year, year, 'year');
}

function questionScopeMatchesAudience(questionTarget: string | undefined, audienceTarget: string, kind: TargetKind) {
  if (isWildcardTarget(audienceTarget, kind)) return true;
  return isWildcardTarget(questionTarget, kind) || normalizeTarget(questionTarget) === normalizeTarget(audienceTarget);
}

export function questionMatchesAssessment(question: Question, targetDepartment: string, targetYear: string, requireUniform = false) {
  const departmentMatches = questionScopeMatchesAudience(question.target_department, targetDepartment, 'department');
  const yearMatches = questionScopeMatchesAudience(question.target_year, targetYear, 'year');
  if (!departmentMatches || !yearMatches) return false;
  if (requireUniform && isWildcardTarget(targetDepartment, 'department') && !isWildcardTarget(question.target_department, 'department')) return false;
  if (requireUniform && isWildcardTarget(targetYear, 'year') && !isWildcardTarget(question.target_year, 'year')) return false;
  return true;
}
