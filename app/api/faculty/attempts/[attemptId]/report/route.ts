import { createElement } from 'react';
import { NextResponse } from 'next/server';
import { Document, Page, Text, View, renderToBuffer, StyleSheet } from '@react-pdf/renderer';
import { requireRole } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const styles = StyleSheet.create({
  page: { padding: 36, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#4f46e5', paddingBottom: 12, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 9, color: '#64748b', marginTop: 4, textTransform: 'uppercase' },
  scoreBadge: { backgroundColor: '#e0e7ff', padding: 8, borderRadius: 8, textAlign: 'center' },
  scoreText: { fontSize: 16, fontWeight: 'bold', color: '#4338ca' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20 },
  gridItem: { width: '50%', marginBottom: 8 },
  label: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' },
  value: { fontSize: 11, color: '#0f172a', fontWeight: 'bold', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e1b4b', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 4 },
  commentBox: { backgroundColor: '#eef2ff', padding: 10, borderRadius: 6, marginBottom: 15 },
  commentText: { fontSize: 10, color: '#3730a3', lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 30, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
});

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    await requireRole(['faculty', 'admin']);
    const { attemptId } = await params;
    const supabase = createAdminClient();
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return NextResponse.json({ success: false, error: 'Assessment attempt was not found.' }, { status: 404 });

    const [profileResult, testResult] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', attempt.student_id).maybeSingle(),
      supabase.from('tests').select('title').eq('id', attempt.test_id).maybeSingle(),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (testResult.error) throw testResult.error;

    const studentName = profileResult.data?.full_name || `Student ${attempt.student_id}`;
    const testTitle = testResult.data?.title || `Assessment ${attempt.test_id}`;
    const submittedDate = new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(attempt.submitted_at || attempt.started_at));

    const document = createElement(
      Document,
      { title: 'Assessment Attempt Record' },
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(
          View,
          { style: styles.header },
          createElement(
            View,
            null,
            createElement(Text, { style: styles.title }, 'Assessment Attempt Record'),
            createElement(Text, { style: styles.subtitle }, 'PlaceTrack Pro Saved Attempt Data'),
          ),
          createElement(
            View,
            { style: styles.scoreBadge },
            createElement(Text, { style: styles.scoreText }, `${attempt.score}%`),
            createElement(Text, { style: { fontSize: 7, color: '#4338ca' } }, 'Saved Score'),
          ),
        ),
        createElement(
          View,
          { style: styles.grid },
          ...[
            ['Student Full Name', studentName],
            ['Assessment', testTitle],
            ['Attempt ID', attempt.id],
            ['Submission Date', submittedDate],
            ['Assessment Status', String(attempt.status).toUpperCase()],
          ].map(([label, value]) => createElement(
            View,
            { key: label, style: styles.gridItem },
            createElement(Text, { style: styles.label }, label),
            createElement(Text, { style: styles.value }, value),
          )),
        ),
        createElement(Text, { style: styles.sectionTitle }, 'Recorded Status'),
        createElement(
          View,
          { style: styles.commentBox },
          createElement(Text, { style: styles.commentText }, `Attempt status: ${attempt.status}. This report contains saved attempt fields only.`),
        ),
        createElement(Text, { style: styles.footer }, 'PlaceTrack Pro | Assessment attempt record'),
      ),
    );

    const pdf = await renderToBuffer(document);
    const safeStudentName = studentName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeStudentName}_Progress_Audit.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    console.error('API assessment report error:', error);
    const status = error.message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
