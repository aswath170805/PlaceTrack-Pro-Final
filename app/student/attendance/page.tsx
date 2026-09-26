'use client';

import React, { useEffect, useState } from 'react';
import { AttendanceRecord } from '@/lib/types';
import { CalendarCheck, Clock, AlertCircle } from 'lucide-react';

export default function StudentAttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/attendance/log')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load attendance.');
        setAttendanceRecords(result.records.map((record: { id: string; student_id: string; entry_type: string; login_timestamp: string }) => ({
          id: record.id,
          student_id: record.student_id,
          session_id: record.id,
          session_title: record.entry_type === 'assessment_entry' ? 'Assessment entry' : 'Portal login',
          status: 'present' as const,
          reviewed_by_faculty: false,
          created_at: record.login_timestamp,
        })));
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Unable to load attendance.'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Placement Attendance Module</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Placement Class Attendance History</h1>
          <p className="text-xs text-slate-500">Attendance is recorded when you sign in or enter an assessment.</p>
        </div>

        {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="mr-2 inline h-4 w-4" />{loadError}</div>}

        {/* Attendance Timeline Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Placement Sessions Log</h3>
            <span className="text-xs font-semibold text-slate-500">Total Sessions: {attendanceRecords.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {attendanceRecords.length === 0 && !loadError && <p className="p-6 text-sm text-slate-500">No attendance entries yet.</p>}
            {attendanceRecords.map((record) => (
              <div key={record.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">{record.session_title}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Date: {new Date(record.created_at).toLocaleDateString()}</p>
                  
                  {record.absence_reason && (
                    <div className="mt-2 p-2.5 bg-slate-100/80 rounded-xl text-xs text-slate-700">
                      <span className="font-bold text-slate-900">Submitted Reason: </span>
                      <span className="italic">{record.absence_reason}</span>
                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        record.reviewed_by_faculty ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {record.reviewed_by_faculty ? 'Reviewed by Faculty' : 'Pending Faculty Review'}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
