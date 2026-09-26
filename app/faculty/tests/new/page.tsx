'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Batch,
  QuestionBank,
  Test, 
  Question 
} from '@/lib/types';
import { DatabaseService } from '@/lib/dbService';
import { useAuth } from '@/lib/authContext';
import { 
  FileCheck2, 
  ShieldAlert, 
  Clock, 
  Users, 
  BookOpen, 
  CheckCircle2,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Upload,
  Code,
  FileText,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface AssessmentSession {
  id: string;
  selectedBankId?: string;
}

export default function CreateTestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState<string>('');
  const [type, setType] = useState<'daily_practice' | 'weekly_assessment' | 'custom'>('weekly_assessment');
  const [batchId, setBatchId] = useState<string>('');
  const [duration, setDuration] = useState<number>(45);
  const [isProctored, setIsProctored] = useState<boolean>(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [targetDepartment, setTargetDepartment] = useState<string>('CSE');
  const [targetYear, setTargetYear] = useState<string>('1st');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([DatabaseService.getBatches(), DatabaseService.getQuestionBanks()])
      .then(([loadedBatches, loadedBanks]) => {
        setBatches(loadedBatches);
        setQuestionBanks(loadedBanks);
      })
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to load batches and question banks.'));
  }, []);

  // Sessions configuration
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);

  const addSession = () => {
    const newSession: AssessmentSession = {
      id: 'sess-' + Date.now(),
      selectedBankId: '',
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (index: number) => {
    if (sessions.length <= 1) return;
    setSessions(sessions.filter((_, idx) => idx !== index));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (questionBanks.length === 0) throw new Error('Create a question bank before scheduling an assessment.');
      const selectedBankIds = [...new Set(sessions.map((session) => session.selectedBankId).filter((id): id is string => !!id))];
      if (selectedBankIds.length === 0) throw new Error('Select at least one saved question bank.');
      const availableQuestions = await DatabaseService.getQuestions();
      const selectedQuestionIds = availableQuestions
        .filter((question) => selectedBankIds.includes(question.bank_id))
        .filter((question) => question.target_department?.toLowerCase() === targetDepartment.toLowerCase() && question.target_year?.replace(/\s+Year$/i, '') === targetYear)
        .map((question) => question.id);
      if (selectedQuestionIds.length === 0) throw new Error('Selected banks contain no questions routed to this department and year.');

      const created = await DatabaseService.createTest({
        title,
        type,
        batch_id: batchId || undefined,
        duration_minutes: duration,
        is_proctored: isProctored,
        created_by: user?.id || '',
        target_department: targetDepartment,
        target_year: targetYear,
      });
      await DatabaseService.attachQuestionsToTest(created.id, selectedQuestionIds);

      setSuccessMessage('Assessment successfully configured and scheduled! Redirecting to Hub...');
      setTimeout(() => {
        router.push('/faculty');
      }, 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to create assessment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Faculty Hub
        </button>

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Multi-Session Assessment Builder</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Schedule & Configure New Assessment</h1>
            <p className="text-xs text-slate-500">
              Set up multi-session exams with custom sessions (e.g. Session 1 MCQ, Session 2 Coding), upload questions or select banks
            </p>
          </div>

          <form onSubmit={handleCreateTest} className="space-y-8">
            
            {/* Title & Type */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assessment Title</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. TCS NQT & Wipro National Qualifier Comprehensive Assessment"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setType('daily_practice')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    type === 'daily_practice' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block mb-1">Daily Practice</span>
                  <span className="text-[10px] font-normal text-slate-500">Continuous skill drill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('weekly_assessment')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    type === 'weekly_assessment' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block mb-1">Weekly Assessment</span>
                  <span className="text-[10px] font-normal text-slate-500">Multi-session scheduled mock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('custom')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    type === 'custom' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="block mb-1">Company Custom Exam</span>
                  <span className="text-[10px] font-normal text-slate-500">Tier-1 campus drive</span>
                </button>
              </div>
            </div>

            {/* Target Batch, Target Department, Target Year & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Student Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">No batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Total Duration (Minutes)</label>
                <input
                  required
                  type="number"
                  min={5}
                  max={240}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Department Allocation</label>
                <select
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="CSE">CSE</option>
                  <option value="AI">AI</option>
                  <option value="EEE">EEE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Academic Year</label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                </select>
              </div>
            </div>

            {/* Browser integrity event logging */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Record browser integrity events</h4>
                  <p className="text-[11px] text-amber-700">Store tab changes, focus loss, clipboard actions, and restricted shortcuts.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isProctored}
                onChange={(e) => setIsProctored(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
              />
            </div>

            {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{errorMessage}</p>}

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-indigo-600" />
                    Question Bank Selection
                  </h3>
                  <p className="text-[11px] text-slate-500">Choose saved question banks to include in this assessment.</p>
                </div>
                <button
                  type="button"
                  onClick={addSession}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Add Session
                </button>
              </div>

              <div className="space-y-4">
                {sessions.map((sess, idx) => (
                  <div key={sess.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Selection {idx + 1}</span>
                      {sessions.length > 1 && <button type="button" onClick={() => removeSession(idx)} aria-label={`Remove selection ${idx + 1}`} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">Saved question bank</label>
                      <select
                        required
                        value={sess.selectedBankId || ''}
                        onChange={(event) => {
                          const updated = [...sessions];
                          updated[idx].selectedBankId = event.target.value;
                          setSessions(updated);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        <option value="">Select saved bank</option>
                        {questionBanks.map((bank) => <option key={bank.id} value={bank.id}>{bank.title} ({bank.topic})</option>)}
                      </select>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center space-x-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving assessment...' : 'Publish assessment'}</span>
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
