'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/dbService';
import { AttendanceRecord } from '@/lib/types';
import { CalendarCheck, AlertCircle, Clock } from 'lucide-react';

export default function FacultyAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttendance() {
      try {
        setRecords(await DatabaseService.getAttendanceRecords());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load attendance activity.');
      }
    }
    loadAttendance();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Faculty Attendance Activity</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Student Login & Assessment Entries</h1>
          <p className="text-xs text-slate-500">Recorded portal logins and assessment entries.</p>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div>}

        {/* Absence Review List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Attendance Records</h3>
            <span className="text-xs font-semibold text-slate-500">Total: {records.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {records.length === 0 && !error && <p className="p-6 text-sm text-slate-500">No attendance activity recorded yet.</p>}
            {records.map((record) => (
              <div key={record.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">{record.student_name || `Student ${record.student_id}`}</span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Entry: <strong>{record.session_title}</strong> • Date: {new Date(record.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
