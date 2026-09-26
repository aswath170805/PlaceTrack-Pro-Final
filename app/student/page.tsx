'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { DatabaseService } from '@/lib/dbService';
import { Test, TestAttempt, TestAttempt as AttemptType } from '@/lib/types';
import { assessmentMatchesStudent } from '@/lib/assessmentTargeting';
import { formatAssessmentTimeIST, getAssessmentWindowStatus } from '@/lib/assessmentSchedule';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  Sparkles, 
  BrainCircuit 
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<AttemptType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStudentData() {
      const allTests = await DatabaseService.getTests();
      const allAttempts = await DatabaseService.getTestAttempts(user?.id);
      setTests(allTests);
      setAttempts(allAttempts);
      setLoading(false);
    }
    loadStudentData();
  }, [user]);

  const userDept = user?.department || 'CSE';
  const userYear = (user?.academic_year || user?.year_of_study || '').replace(/\s+Year$/i, '').toLowerCase();

  const allocatedTests = tests.filter((test) => user && assessmentMatchesStudent(test, user));
  const completedAttempts = attempts.filter((attempt) => attempt.status !== 'in_progress');
  const averageScore = completedAttempts.length
    ? Math.round(completedAttempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) / completedAttempts.length)
    : 0;
  const dailyPracticeTest = allocatedTests.find((t) => t.type === 'daily_practice');
  const weeklyTests = allocatedTests.filter((t) => t.type === 'weekly_assessment');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1 text-xs text-blue-200 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Placement Season 2026 • {userDept} ({userYear})</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="mt-2 text-slate-300 max-w-xl text-sm leading-relaxed">
              View department-routed assessments and your recorded performance.
            </p>
          </div>

          {/* Quick Stats Pill Header */}
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <div className="text-center px-3 border-r border-white/10">
              <span className="block text-2xl font-black text-white">{averageScore}%</span>
              <span className="text-[11px] text-slate-300 font-medium">Recorded Avg Score</span>
            </div>
            <div className="text-center px-3 border-r border-white/10">
              <span className="block text-2xl font-black text-emerald-400">{user?.current_streak || 0}</span>
              <span className="text-[11px] text-slate-300 font-medium">Daily Streak</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-2xl font-black text-amber-400">{weeklyTests.length}</span>
              <span className="text-[11px] text-slate-300 font-medium">Active Mocks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        
        {/* Daily Practice & Urgent Assessments Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily Practice Action Card */}
          {dailyPracticeTest && (
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg uppercase tracking-wider">
                      Daily Practice Set
                    </span>
                    {dailyPracticeTest.target_department && dailyPracticeTest.target_department !== 'All Departments' && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded">
                        {dailyPracticeTest.target_department}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {dailyPracticeTest.duration_minutes} mins
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {dailyPracticeTest.title}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Topic focus: Data Structures, Aptitude, Core OS. Build consistency with quick curated questions.
                </p>
              </div>

              {getAssessmentWindowStatus(dailyPracticeTest) === 'open' ? (
                <Link
                  href={`/student/tests/${dailyPracticeTest.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-blue-500/20 group"
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Start Daily Practice
                </Link>
              ) : (
                <button type="button" disabled className="w-full inline-flex items-center justify-center px-4 py-3 bg-slate-200 text-slate-500 font-semibold rounded-xl text-sm cursor-not-allowed">
                  {getAssessmentWindowStatus(dailyPracticeTest) === 'upcoming'
                    ? `Opens ${formatAssessmentTimeIST(dailyPracticeTest.start_time)}`
                    : getAssessmentWindowStatus(dailyPracticeTest) === 'closed' ? 'Practice window closed' : 'Not scheduled'}
                </button>
              )}
            </div>
          )}

          {/* Scheduled Mock Assessments List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Scheduled Mock Assessments</h3>
                <p className="text-xs text-slate-500">Proctored tests allocated to your branch & year</p>
              </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Assessment Windows
              </span>
            </div>

            {weeklyTests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium text-slate-600">No mock assessments currently scheduled for {userDept} - {userYear}.</p>
                <p className="text-xs text-slate-400 mt-1">Check back soon or practice with the daily assessment set!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {weeklyTests.map((test) => (
                  <div 
                    key={test.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-all gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-slate-900 text-sm">{test.title}</span>
                        {test.target_department && test.target_department !== 'All Departments' && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                            {test.target_department}
                          </span>
                        )}
                        {test.target_year && test.target_year !== 'All Years' && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            {test.target_year}
                          </span>
                        )}
                        {test.is_proctored && (
                          <span className="inline-flex items-center text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
                            Proctored
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>Duration: <strong className="text-slate-700">{test.duration_minutes} mins</strong></span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {formatAssessmentTimeIST(test.start_time)} to {formatAssessmentTimeIST(test.end_time)}
                      </p>
                    </div>

                    {getAssessmentWindowStatus(test) === 'open' ? (
                      <Link
                        href={`/student/tests/${test.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
                      >
                        Enter Assessment
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    ) : (
                      <button type="button" disabled className="inline-flex items-center justify-center px-4 py-2 bg-slate-200 text-slate-500 font-medium text-xs rounded-lg whitespace-nowrap cursor-not-allowed">
                        {getAssessmentWindowStatus(test) === 'upcoming'
                          ? `Opens ${formatAssessmentTimeIST(test.start_time)}`
                          : getAssessmentWindowStatus(test) === 'closed' ? 'Window closed' : 'Not scheduled'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Analytics & Performance Teaser Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Topic Weakness Focus Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">AI Topic Recommendation</h4>
                <p className="text-[11px] text-slate-500">Based on recent tests</p>
              </div>
            </div>
            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60 mb-4">
              <p className="text-xs text-amber-900 font-medium">
                &ldquo;Focus on <strong>Data Structures</strong> (40% accuracy in last 3 tests). Recommended topic practice available.&rdquo;
              </p>
            </div>
            <Link 
              href="/student/analytics"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              View Full Analytics Report
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {/* Recent Test Attempts History */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-slate-900">Recent Test Submissions</h4>
              <Link href="/student/analytics" className="text-xs text-blue-600 font-semibold hover:underline">
                View All Results
              </Link>
            </div>

            <div className="space-y-3">
              {attempts.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${att.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {att.status === 'submitted' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{att.test_title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(att.started_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-sm font-extrabold text-slate-900">{att.score}%</span>
                    <Link href={`/student/results/${att.id}`} className="text-[11px] text-blue-600 font-medium hover:underline">
                      View Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
