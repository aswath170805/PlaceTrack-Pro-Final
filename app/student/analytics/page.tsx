'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import { BarChart3, Download, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { DatabaseService } from '@/lib/dbService';
import { TestAttempt } from '@/lib/types';

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    DatabaseService.getTestAttempts(user.id)
      .then(setAttempts)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load assessment history.'));
  }, [user?.id]);

  const completedAttempts = attempts.filter((attempt) => attempt.status !== 'in_progress');
  const averageScore = completedAttempts.length
    ? Math.round(completedAttempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) / completedAttempts.length)
    : 0;
  const scoreTrend = [...completedAttempts]
    .sort((first, second) => new Date(first.submitted_at || first.started_at).getTime() - new Date(second.submitted_at || second.started_at).getTime())
    .map((attempt, index) => ({
      test: attempt.test_title || `Assessment ${index + 1}`,
      score: Number(attempt.score) || 0,
    }));

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Title & Export Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Performance Intelligence Dashboard</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Placement Readiness & Topic Analytics</h1>
            <p className="text-xs text-slate-500">Assessment history recorded for your account</p>
          </div>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-colors print:hidden"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Performance Report (PDF)
          </button>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-slate-500">Completed assessments</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{completedAttempts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-slate-500">Recorded average score</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{averageScore}%</p>
          </div>
        </div>

        {/* Recharts Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Topic mastery</h3>
                <p className="text-xs text-slate-500">No graded answer-by-topic records are available.</p>
              </div>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="py-16 text-center text-sm text-slate-400">Topic statistics will appear when graded answers are stored.</p>
          </div>

          {/* Historical Score Progress Line Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Score Progress Trend Over Time</h3>
                <p className="text-xs text-slate-500">Scores from completed attempts</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>

            {scoreTrend.length > 0 ? <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="test" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} name="Test Score (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div> : <p className="py-16 text-center text-sm text-slate-400">No completed assessment scores recorded.</p>}
          </div>

        </div>

      </div>
    </div>
  );
}
