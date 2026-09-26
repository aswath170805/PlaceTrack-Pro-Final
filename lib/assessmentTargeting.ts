import type { Profile, Question, Test } from '@/lib/types';

type TargetKind = 'department' | 'year';

const departmentAliases: Record<string, string> = {
  'computer science': 'cse',
  'computer science and engineering': 'cse',
  'computer science engineering': 'cse',
  'artificial intelligence': 'ai',
  'information technology': 'it',
  'electrical and electronics engineering': 'eee',
  'electronics and communication engineering': 'ece',
};

const yearAliases: Record<string, string> = {
  first: '1st',
  'first year': '1st',
  '1': '1st',
  '1st': '1st',
  second: '2nd',
  'second year': '2nd',
  '2': '2nd',
  '2nd': '2nd',
  third: '3rd',
  'third year': '3rd',
  '3': '3rd',
  '3rd': '3rd',
  fourth: '4th',
  'fourth year': '4th',
  '4': '4th',
  '4th': '4th',
};

function normalizeTarget(value: string | undefined, kind: TargetKind) {
  const normalized = (value || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (kind === 'department') return departmentAliases[normalized] || normalized;

  const year = normalized
    .replace(/^academic year\s+/, '')
    .replace(/^year\s+/, '')
    .replace(/\s+(academic year|year|of study)$/i, '')
    .trim();
  return yearAliases[year] || year;
}

function isWildcardTarget(value: string | undefined, kind: TargetKind) {
  const target = normalizeTarget(value, kind);
  if (kind === 'department') {
    return ['all departments', 'all depts', 'any department', 'any dept', '*'].includes(target);
  }
  return ['all years', 'any year', '*'].includes(target);
}

export function targetMatchesStudent(target: string | undefined, actual: string | undefined, kind: TargetKind) {
  if (!actual) return false;
  return isWildcardTarget(target, kind) || normalizeTarget(target, kind) === normalizeTarget(actual, kind);
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
  return isWildcardTarget(questionTarget, kind) || normalizeTarget(questionTarget, kind) === normalizeTarget(audienceTarget, kind);
}

export function questionMatchesAssessment(question: Question, targetDepartment: string, targetYear: string, requireUniform = false) {
  const departmentMatches = questionScopeMatchesAudience(question.target_department, targetDepartment, 'department');
  const yearMatches = questionScopeMatchesAudience(question.target_year, targetYear, 'year');
  if (!departmentMatches || !yearMatches) return false;
  if (requireUniform && isWildcardTarget(targetDepartment, 'department') && !isWildcardTarget(question.target_department, 'department')) return false;
  if (requireUniform && isWildcardTarget(targetYear, 'year') && !isWildcardTarget(question.target_year, 'year')) return false;
  return true;
}

export function assessmentAudienceMismatch(test: Test, student: Profile) {
  const studentYear = student.academic_year || student.year_of_study || 'not set';
  return `This assessment targets ${test.target_department || 'department not set'} / ${test.target_year || 'year not set'}, but your profile is ${student.department || 'department not set'} / ${studentYear}. Ask an administrator to correct the profile or assessment target.`;
}
