import type { Test } from '@/lib/types';

export type AssessmentWindowStatus = 'unscheduled' | 'upcoming' | 'open' | 'closed';

export function getAssessmentWindowStatus(test: Pick<Test, 'start_time' | 'end_time'>, now = Date.now()): AssessmentWindowStatus {
  const start = Date.parse(test.start_time || '');
  const end = Date.parse(test.end_time || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'unscheduled';
  if (now < start) return 'upcoming';
  if (now >= end) return 'closed';
  return 'open';
}

export function istDateTimeLocalToUtc(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}:00+05:30`);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function formatAssessmentTimeIST(value?: string | null) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'Not scheduled';
  return `${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)} IST`;
}

export function getAssessmentDeadline(startedAt: string, durationMinutes: number, endTime: string) {
  return Math.min(Date.parse(startedAt) + durationMinutes * 60_000, Date.parse(endTime));
}