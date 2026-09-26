'use client';

import React, { useEffect, useState } from 'react';
import { 
  QuestionBank, 
  Question 
} from '@/lib/types';
import { DatabaseService } from '@/lib/dbService';
import { useAuth } from '@/lib/authContext';
import { 
  BookOpen, 
  PlusCircle, 
  Code, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Edit3,
  Upload,
  Download,
  Eye,
  Lock,
  Sparkles,
  HelpCircle,
  FileCheck
} from 'lucide-react';

export default function QuestionBanksPage() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // New Question Bank Modal state
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [newBankTitle, setNewBankTitle] = useState<string>('');
  const [newBankTopic, setNewBankTopic] = useState<string>('');
  const [newBankDept, setNewBankDept] = useState<string>('CSE');
  const [newBankYear, setNewBankYear] = useState<string>('1st');

  // Question Modal state (Create & Edit)
  const [showQModal, setShowQModal] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qType, setQType] = useState<'mcq' | 'coding'>('mcq');
  const [qText, setQText] = useState<string>('');
  const [qTopic, setQTopic] = useState<string>('Data Structures');
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qDept, setQDept] = useState<string>('CSE');
  const [qYear, setQYear] = useState<string>('1st');
  const [mcqOptions, setMcqOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [mcqCorrect, setMcqCorrect] = useState<number>(0);
  const [starterCode, setStarterCode] = useState<string>('function solution(nums, target) {\n  // Implement logic\n}');
  const [testCases, setTestCases] = useState<{ input: string; expectedOutput: string; isPublic: boolean }[]>([
    { input: '[2,7,11,15], 9', expectedOutput: '[0, 1]', isPublic: true },
    { input: '[3,2,4], 6', expectedOutput: '[1, 2]', isPublic: true },
    { input: '[3,3], 6', expectedOutput: '[0, 1]', isPublic: false }
  ]);

  const activeBank = banks.find((b) => b.id === selectedBankId) || banks[0];
  const bankQuestions = questions.filter((q) => q.bank_id === selectedBankId);

  useEffect(() => {
    let isActive = true;
    Promise.all([DatabaseService.getQuestionBanks(), DatabaseService.getQuestions()]).then(([loadedBanks, loadedQuestions]) => {
      if (!isActive) return;
      setBanks(loadedBanks);
      setQuestions(loadedQuestions);
      if (loadedBanks.length > 0) setSelectedBankId(loadedBanks[0].id);
      setLoadError(null);
    }).catch((error) => {
      if (isActive) setLoadError(error instanceof Error ? error.message : 'Unable to load question banks.');
    }).finally(() => {
      if (isActive) setIsLoadingBanks(false);
    });
    return () => { isActive = false; };
  }, []);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const newB = await DatabaseService.createQuestionBank(newBankTitle, newBankTopic, user?.id || '', newBankDept, newBankYear);
    setBanks((previous) => [...previous, newB]);
    setSelectedBankId(newB.id);
    setShowBankModal(false);
    setNewBankTitle('');
    setNewBankTopic('');
    setNewBankDept('CSE');
    setNewBankYear('1st');
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQType('mcq');
    setQText('');
    setQTopic(activeBank?.topic || 'General');
    setQDifficulty('medium');
    setQDept(['All Departments', 'CSE', 'AI', 'EEE', 'ECE', 'IT'].includes(activeBank?.target_department || '') ? activeBank!.target_department! : 'CSE');
    setQYear(['All Years', '1st', '2nd', '3rd', '4th'].includes(activeBank?.target_year || '') ? activeBank!.target_year! : '1st');
    setMcqOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setMcqCorrect(0);
    setStarterCode('function solution() {\n  // Code here\n}');
    setTestCases([
      { input: '[1, 2, 3]', expectedOutput: '6', isPublic: true },
      { input: '[4, 5, 6]', expectedOutput: '15', isPublic: false }
    ]);
    setShowQModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQType(q.type === 'coding' ? 'coding' : 'mcq');
    setQText(q.content.questionText);
    setQTopic(q.topic);
    setQDifficulty(q.difficulty);
    setQDept(['All Departments', 'CSE', 'AI', 'EEE', 'ECE', 'IT'].includes(q.target_department || activeBank?.target_department || '') ? (q.target_department || activeBank?.target_department)! : 'CSE');
    setQYear(['All Years', '1st', '2nd', '3rd', '4th'].includes(q.target_year || activeBank?.target_year || '') ? (q.target_year || activeBank?.target_year)! : '1st');
    if (q.type === 'mcq') {
      setMcqOptions(q.content.options || ['Option A', 'Option B', 'Option C', 'Option D']);
      setMcqCorrect(typeof q.content.correctAnswer === 'number' ? q.content.correctAnswer : 0);
    } else {
      setStarterCode(q.content.starterCode || 'function solution() {}');
      if (q.content.testCases && q.content.testCases.length > 0) {
        setTestCases(q.content.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isPublic: tc.isPublic !== undefined ? tc.isPublic : true
        })));
      }
    }
    setShowQModal(true);
  };

  const handleDeleteQuestion = async (question: Question) => {
    if (!window.confirm('Delete this question? It will also be removed from any assessment that uses it.')) return;
    setDeletingQuestionId(question.id);
    setLoadError(null);
    try {
      const response = await fetch(`/api/faculty/questions/${question.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete question.');
      setQuestions((previous) => previous.filter((entry) => entry.id !== question.id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete question.');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleDeleteBank = async (bank: QuestionBank) => {
    const questionCount = questions.filter((question) => question.bank_id === bank.id).length;
    if (!window.confirm(`Delete "${bank.title}" and its ${questionCount} question(s)? Questions will also be removed from assessments that use them.`)) return;
    setDeletingBankId(bank.id);
    setLoadError(null);
    try {
      const response = await fetch(`/api/faculty/question-banks/${bank.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete question bank.');
      const remainingBanks = banks.filter((entry) => entry.id !== bank.id);
      setBanks(remainingBanks);
      setQuestions((previous) => previous.filter((question) => question.bank_id !== bank.id));
      if (selectedBankId === bank.id) setSelectedBankId(remainingBanks[0]?.id || '');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to delete question bank.');
    } finally {
      setDeletingBankId(null);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestionId) {
      const existingQuestion = questions.find((question) => question.id === editingQuestionId);
      if (!existingQuestion) return;
      const updatedQuestion = {
        ...existingQuestion,
        type: qType,
        topic: qTopic,
        difficulty: qDifficulty,
        target_department: qDept,
        target_year: qYear,
        content: {
          ...existingQuestion.content,
          questionText: qText,
          options: qType === 'mcq' ? mcqOptions : undefined,
          correctAnswer: qType === 'mcq' ? mcqCorrect : undefined,
          starterCode: qType === 'coding' ? starterCode : undefined,
          testCases: qType === 'coding' ? testCases : undefined,
        },
      };
      const savedQuestion = await DatabaseService.updateQuestion(updatedQuestion);
      setQuestions((previous) => previous.map((question) => question.id === editingQuestionId ? savedQuestion : question));
    } else {
      const newQ = await DatabaseService.createQuestion({
        bank_id: selectedBankId,
        type: qType,
        topic: qTopic,
        difficulty: qDifficulty,
        target_department: qDept,
        target_year: qYear,
        content: {
          questionText: qText,
          options: qType === 'mcq' ? mcqOptions : undefined,
          correctAnswer: qType === 'mcq' ? mcqCorrect : undefined,
          starterCode: qType === 'coding' ? starterCode : undefined,
          testCases: qType === 'coding' ? testCases : undefined,
        },
      });
      setQuestions((previous) => [newQ, ...previous]);
    }
    setShowQModal(false);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isPublic: true }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, idx) => idx !== index));
  };

  if (isLoadingBanks) return <div className="min-h-screen p-10 text-sm text-slate-500">Loading saved question banks...</div>;
  if (!activeBank) return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-black text-slate-900">Create a question bank</h1>
        {loadError && <p role="alert" className="text-xs text-red-700">{loadError}</p>}
        <form onSubmit={handleCreateBank} className="space-y-3">
          <input required value={newBankTitle} onChange={(event) => setNewBankTitle(event.target.value)} placeholder="Bank title" className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
          <input required value={newBankTopic} onChange={(event) => setNewBankTopic(event.target.value)} placeholder="Topic" className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
          <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white">Create bank</button>
        </form>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Placement Question Bank & Authoring Studio</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Manage Question Banks & Challenges</h1>
            <p className="text-xs text-slate-500">
              Create and manage saved MCQs and coding questions with routed department/year assignments.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowBankModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Question Bank
            </button>
          </div>
        </div>

        {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{loadError}</p>}

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Question Banks Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Available Banks</h3>
            {banks.map((bank) => (
              <div key={bank.id} className={`rounded-2xl border text-xs font-medium transition-all ${
                selectedBankId === bank.id ? 'bg-slate-900 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}>
                <button type="button" onClick={() => setSelectedBankId(bank.id)} className="w-full text-left p-4">
                  <span className="block font-bold text-sm truncate mb-1">{bank.title}</span>
                  <span className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedBankId === bank.id ? 'bg-indigo-500/30 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}>
                      {bank.target_department || 'All Depts'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedBankId === bank.id ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {bank.target_year || 'All Years'}
                    </span>
                  </span>
                  <span className="flex justify-between items-center text-[10px] opacity-75">
                    <span>Topic: {bank.topic}</span>
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{questions.filter((question) => question.bank_id === bank.id).length} questions</span>
                  </span>
                </button>
                <div className="px-3 pb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleDeleteBank(bank)}
                    disabled={deletingBankId !== null || deletingQuestionId !== null}
                    title="Delete question bank and all its questions"
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selectedBankId === bank.id ? 'border-red-400/40 text-red-200 hover:bg-red-500/20' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deletingBankId === bank.id ? 'Deleting...' : 'Delete bank'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Questions Panel */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{activeBank.title}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-slate-500">Domain: {activeBank.topic}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-semibold text-indigo-600">{bankQuestions.length} Total Items</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOpenAddQuestion}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Question Items List */}
            <div className="space-y-4">
              {bankQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No questions created in this bank yet. Click &quot;Add Question&quot; or upload a PDF to author items!
                </div>
              ) : (
                bankQuestions.map((q, idx) => (
                  <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group hover:border-slate-300 transition-all">
                    
                    {/* Top metadata and Edit/Delete triggers */}
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          Q{idx + 1}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          q.type === 'coding' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {q.type}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded capitalize">
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {q.topic}
                        </span>
                        {(q.target_department || activeBank.target_department) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-150">
                            Dept: {q.target_department || activeBank.target_department}
                          </span>
                        )}
                        {(q.target_year || activeBank.target_year) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            Year: {q.target_year || activeBank.target_year}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDeleteQuestion(q)}
                          disabled={deletingQuestionId !== null || deletingBankId !== null}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Question"
                        >
                          {deletingQuestionId === q.id ? <span className="text-[10px]">...</span> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{q.content.questionText}</p>

                    {/* MCQ Options Display */}
                    {q.type === 'mcq' && q.content.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {q.content.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              q.content.correctAnswer === oIdx
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                            {q.content.correctAnswer === oIdx && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Coding Workspace Display with Public/Private Test Cases */}
                    {q.type === 'coding' && (
                      <div className="space-y-2 pt-1">
                        <div className="p-3 bg-slate-950 text-emerald-400 text-xs rounded-xl font-mono overflow-x-auto">
                          {q.content.starterCode}
                        </div>
                        
                        {q.content.testCases && q.content.testCases.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Test Cases (Evaluation Engine):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.content.testCases.map((tc, tcIdx) => (
                                <div key={tcIdx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-mono space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-sans text-[10px] font-bold">Case #{tcIdx + 1}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-sans flex items-center ${
                                      tc.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {tc.isPublic ? <Eye className="w-2.5 h-2.5 mr-1" /> : <Lock className="w-2.5 h-2.5 mr-1" />}
                                      {tc.isPublic ? 'Public' : 'Private'}
                                    </span>
                                  </div>
                                  <div><strong className="text-slate-600">In:</strong> {tc.input}</div>
                                  <div><strong className="text-slate-600">Out:</strong> {tc.expectedOutput}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

      {/* New Question Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateBank} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Create Question Bank</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Title</label>
              <input
                required
                type="text"
                value={newBankTitle}
                onChange={(e) => setNewBankTitle(e.target.value)}
                placeholder="e.g. Advanced Operating Systems & Threads"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Topic / Subject</label>
              <input
                required
                type="text"
                value={newBankTopic}
                onChange={(e) => setNewBankTopic(e.target.value)}
                placeholder="e.g. Core CS / OS / Data Structures"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Department</label>
                <select
                  value={newBankDept}
                  onChange={(e) => setNewBankDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="All Departments">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="AI">AI</option>
                  <option value="EEE">EEE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Year</label>
                <select
                  value={newBankYear}
                  onChange={(e) => setNewBankYear(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="All Years">All Years</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Create Bank
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Question Authoring & Editing Modal (MCQ / Coding) */}
      {showQModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleSaveQuestion} className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {editingQuestionId ? 'Edit Question' : 'Author New Question'}
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="mcq">MCQ</option>
                  <option value="coding">Coding Challenge</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Department</label>
                <select
                  value={qDept}
                  onChange={(e) => setQDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="All Departments">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="AI">AI</option>
                  <option value="EEE">EEE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Year</label>
                <select
                  value={qYear}
                  onChange={(e) => setQYear(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="All Years">All Years</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Question Statement</label>
              <textarea
                required
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Enter complete problem or question text..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* MCQ Options */}
            {qType === 'mcq' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Options (Select radio for correct answer)</label>
                {mcqOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={mcqCorrect === idx}
                      onChange={() => setMcqCorrect(idx)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...mcqOptions];
                        updated[idx] = e.target.value;
                        setMcqOptions(updated);
                      }}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Coding Challenge Editor & Test Case Builder */}
            {qType === 'coding' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Starter Code Template</label>
                  <textarea
                    rows={4}
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    className="w-full p-3 bg-slate-900 text-emerald-400 font-mono rounded-xl text-xs"
                  />
                </div>

                {/* Test Cases Builder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Test Cases Manager (Public & Private for LeetCode Evaluator)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddTestCase}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Test Case
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {testCases.map((tc, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Case #{idx + 1}</span>
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center space-x-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tc.isPublic}
                                onChange={(e) => {
                                  const updated = [...testCases];
                                  updated[idx].isPublic = e.target.checked;
                                  setTestCases(updated);
                                }}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">Public (Visible)</span>
                            </label>
                            {testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTestCase(idx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Input args e.g. [2,7,11,15], 9"
                            value={tc.input}
                            onChange={(e) => {
                              const updated = [...testCases];
                              updated[idx].input = e.target.value;
                              setTestCases(updated);
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Expected output e.g. [0, 1]"
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const updated = [...testCases];
                              updated[idx].expectedOutput = e.target.value;
                              setTestCases(updated);
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                {editingQuestionId ? 'Update Question' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
