'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, FileCheck2 } from 'lucide-react';

type AttemptResult = {
  id: string;
  test_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  status: string;
  tests?: { title?: string } | null;
};

export default function TestResultPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/student/results/${attemptId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load result.');
        setAttempt(result.attempt as AttemptResult);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load result.'));
  }, [attemptId]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/student" className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-1.5 h-4 w-4" />Back to Dashboard
        </Link>

        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <AlertCircle className="mr-2 inline h-4 w-4" />{error}
          </div>
        ) : !attempt ? (
          <p className="text-sm text-slate-500">Loading saved result...</p>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />Saved assessment result
                </div>
                <h1 className="text-2xl font-black text-slate-900">{attempt.tests?.title || 'Assessment'}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Submitted {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'not yet'}
                </p>
              </div>
              <FileCheck2 className="h-6 w-6 text-blue-700" />
            </div>
            <div className="mt-8 flex items-end gap-2">
              <span className="text-5xl font-black text-blue-700">{Number(attempt.score) || 0}%</span>
              <span className="pb-1 text-xs font-bold uppercase text-slate-400">Recorded score</span>
            </div>
            <p className="mt-4 text-xs text-slate-500">Status: {attempt.status.replaceAll('_', ' ')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
