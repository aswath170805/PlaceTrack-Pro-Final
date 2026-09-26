'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { DatabaseService } from '@/lib/dbService';
import { Batch, Test, QuestionBank, AttendanceRecord, TestAttempt, Profile } from '@/lib/types';
import { 
  PlusCircle, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  FileCheck2,
  TrendingUp,
  PieChart as PieIcon,
  Download,
  FileText,
  Award,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// PDF Stylesheet for student assessment report
const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  scoreBadge: {
    backgroundColor: '#e0e7ff',
    padding: 8,
    borderRadius: 8,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4338ca',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  gridItem: {
    width: '50%',
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: 'bold',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e1b4b',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  commentBox: {
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  commentText: {
    fontSize: 10,
    color: '#3730a3',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  }
});

// Single Student PDF Progress Document
const StudentPerformancePdf = ({ attempt }: { attempt: TestAttempt }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View>
          <Text style={pdfStyles.title}>Assessment Attempt Record</Text>
          <Text style={pdfStyles.subtitle}>PlaceTrack Pro Saved Attempt Data</Text>
        </View>
        <View style={pdfStyles.scoreBadge}>
          <Text style={pdfStyles.scoreText}>{attempt.score}%</Text>
          <Text style={{ fontSize: 7, color: '#4338ca' }}>Saved Score</Text>
        </View>
      </View>

      <View style={pdfStyles.grid}>
        <View style={pdfStyles.gridItem}>
          <Text style={pdfStyles.label}>Student Full Name</Text>
          <Text style={pdfStyles.value}>{attempt.student_name || `Student ${attempt.student_id}`}</Text>
        </View>
        <View style={pdfStyles.gridItem}>
          <Text style={pdfStyles.label}>Assessment</Text>
          <Text style={pdfStyles.value}>{attempt.test_title || `Assessment ${attempt.test_id}`}</Text>
        </View>
        <View style={pdfStyles.gridItem}>
          <Text style={pdfStyles.label}>Attempt ID</Text>
          <Text style={pdfStyles.value}>{attempt.id}</Text>
        </View>
        <View style={pdfStyles.gridItem}>
          <Text style={pdfStyles.label}>Submission Date</Text>
          <Text style={pdfStyles.value}>{new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString()}</Text>
        </View>
        <View style={pdfStyles.gridItem}>
          <Text style={pdfStyles.label}>Assessment Status</Text>
          <Text style={pdfStyles.value}>{attempt.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Recorded Status</Text>
      <View style={pdfStyles.commentBox}>
        <Text style={pdfStyles.commentText}>
          {`Attempt status: ${attempt.status}. This report contains saved attempt fields only.`}
        </Text>
      </View>

      <Text style={pdfStyles.footer}>
        PlaceTrack Pro • Assessment attempt record
      </Text>
    </Page>
  </Document>
);

// Department Participation Colors
const DEPT_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function FacultyDashboard() {
  const { user } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    async function loadFacultyData() {
      const t = await DatabaseService.getTests();
      const b = await DatabaseService.getBatches();
      const qb = await DatabaseService.getQuestionBanks();
      const att = await DatabaseService.getAttendanceRecords();
      const atts = await DatabaseService.getTestAttempts();
      const people = await DatabaseService.getProfiles();
      setTests(t);
      setBatches(b);
      setQuestionBanks(qb);
      setAttendance(att);
      setAttempts(atts);
      setProfiles(people);
    }
    loadFacultyData();
  }, []);

  const weeklyAnalyticsData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const dayAttempts = attempts.filter((attempt) => {
      const submitted = attempt.submitted_at ? new Date(attempt.submitted_at) : null;
      return submitted?.toDateString() === date.toDateString();
    });
    return {
      day: date.toLocaleDateString(undefined, { weekday: 'short' }),
      submissionCount: dayAttempts.length,
      avgScore: dayAttempts.length ? Math.round(dayAttempts.reduce((sum, item) => sum + Number(item.score || 0), 0) / dayAttempts.length) : 0,
    };
  });

  const departmentPieData = ['CSE', 'AI', 'EEE', 'ECE', 'IT'].map((department) => {
    const count = profiles.filter((profile) => profile.role === 'student' && profile.department === department).length;
    return { name: department, value: count, count: `${count} students` };
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">
      
      {/* Faculty Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-inner border-b border-indigo-900/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Faculty Command Center • Placement Intelligence</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
              Welcome, {user?.full_name || 'Faculty Member'} 👩‍🏫
            </h1>
            <p className="mt-2 text-slate-300 max-w-xl text-xs leading-relaxed">
              Curate multi-session assessments, author questions with LeetCode test cases, monitor student attendance, and track real-time departmental placement performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/faculty/tests/new"
              className="inline-flex items-center px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Schedule Assessment
            </Link>
            <Link
              href="/faculty/question-banks"
              className="inline-flex items-center px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all"
            >
              <BookOpen className="w-4 h-4 mr-2 text-indigo-300" />
              Manage Question Banks
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{tests.length}</span>
              <span className="text-xs text-slate-500 font-medium">Active Assessments</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{batches.length}</span>
              <span className="text-xs text-slate-500 font-medium">Assigned Batches</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{questionBanks.length}</span>
              <span className="text-xs text-slate-500 font-medium">Question Banks</span>
            </div>
          </div>

          <Link href="/faculty/attendance" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-amber-400 transition-colors">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{attendance.length}</span>
              <span className="text-xs text-amber-600 font-bold">Attendance Entries</span>
            </div>
          </Link>

        </div>

        {/* Recorded assessment activity and student counts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Weekly submission counts and saved scores */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                  Daily Assessment Submissions & Average Score
                </h3>
                <p className="text-xs text-slate-500">
                  Recorded completed attempts for each day
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Last 7 days</span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="left" dataKey="submissionCount" fill="#4f46e5" name="Submissions" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={3} name="Avg Score (%)" dot={{ r: 4, fill: '#10b981' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Distribution Pie Chart */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center">
                <PieIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Department Breakdown
              </h3>
                <p className="text-xs text-slate-500">Registered student accounts by department</p>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    formatter={(value: any) => [`${value} students`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Department Legend with color indicators */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
              {departmentPieData.map((dept, idx) => (
                <div key={idx} className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                  <span className="truncate text-slate-700 font-medium">{dept.name.split(' ')[0]}</span>
                  <span className="text-slate-400 font-bold">({dept.value})</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Student Progress Report & PDF Download Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-indigo-600" />
                Student Assessment Attempts & Performance Progress
              </h3>
              <p className="text-xs text-slate-500">
                After students take tests, review their scores and download individual progress audit PDFs.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              {attempts.length} Submissions Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Assessment Title</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Proctor Flags</th>
                  <th className="py-3 px-4">Completed On</th>
                  <th className="py-3 px-4 text-right">Student PDF Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {att.student_name || `Student ${att.student_id}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {att.test_title || tests.find((test) => test.id === att.test_id)?.title || `Assessment ${att.test_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-black text-sm ${
                        att.score >= 75 ? 'text-emerald-600' : att.score >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {att.score}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {att.flag_count && att.flag_count > 0 ? (
                        <span className="inline-flex items-center text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          {att.flag_count} Flagged
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Not tracked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : 'Not submitted'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isMounted ? (
                        <PDFDownloadLink
                          document={<StudentPerformancePdf attempt={att} />}
                          fileName={`${(att.student_name || 'Student').replace(/\s+/g, '_')}_Progress_Audit.pdf`}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download PDF
                        </PDFDownloadLink>
                      ) : (
                        <button className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl">
                          Loading PDF...
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Batches Overview */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Batch Readiness & Performance</h3>
              <p className="text-xs text-slate-500">Assigned student cohort breakdown</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Batch Roster</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {batches.map((b) => (
              <div key={b.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                    {b.student_count ?? 0} Students
                  </span>
                </div>
                <Link
                  href="/faculty/attendance"
                  className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center"
                >
                  <span>Review Batch Attendance</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
