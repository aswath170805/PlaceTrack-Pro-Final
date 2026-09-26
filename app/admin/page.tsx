'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { DatabaseService } from '@/lib/dbService';
import { Profile, Test } from '@/lib/types';
import { 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  Activity 
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [tamperingLogs, setTamperingLogs] = useState<{ id: string; student_id: string; event_type: string; created_at: string }[]>([]);
  const [isSeedingAccounts, setIsSeedingAccounts] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const seedEeeAccounts = async () => {
    if (!window.confirm('Create or update the requested EEE accounts? Existing account passwords will not be changed.')) return;
    setIsSeedingAccounts(true);
    setSeedMessage(null);
    try {
      const response = await fetch('/api/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Account seeding failed.');
      setSeedMessage(`Real Supabase accounts ready: ${result.accounts.map((account: { email: string }) => account.email).join(', ')}`);
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : 'Account seeding failed.');
    } finally {
      setIsSeedingAccounts(false);
    }
  };

  useEffect(() => {
    async function loadAdminData() {
      const p = await DatabaseService.getProfiles();
      const t = await DatabaseService.getTests();
      setProfiles(p);
      setTests(t);
      const response = await fetch('/api/tampering');
      if (response.ok) {
        const result = await response.json();
        setTamperingLogs(result.logs || []);
      }
    }
    loadAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      
      {/* Admin Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-3 py-1 text-xs text-amber-200 font-medium mb-3">
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Placement System Control Center</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Administrator Command Center 🛡️
            </h1>
            <p className="mt-2 text-slate-300 max-w-xl text-sm leading-relaxed">
              User governance, assessment routing, and consolidated assessment-integrity events.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => void seedEeeAccounts()}
                disabled={isSeedingAccounts}
                className="inline-flex items-center px-4 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 font-bold text-xs rounded-xl transition-all"
              >
                {isSeedingAccounts ? 'Seeding EEE Accounts...' : 'Seed EEE Accounts'}
              </button>
            )}
            <Link
              href="/admin/tampering-logs"
              className="inline-flex items-center px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Review Tampering Logs
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users & Batches
            </Link>
          </div>
        </div>
      </div>

      {seedMessage && (
        <div className={`max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 text-xs font-semibold ${seedMessage.includes('failed') || seedMessage.includes('Set ') ? 'text-red-700' : 'text-emerald-700'}`} role="status">
          {seedMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <Link href="/admin/tampering-logs" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-amber-500 transition-colors">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{tamperingLogs.length}</span>
              <span className="text-xs text-amber-700 font-bold">Tampering Events</span>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{profiles.length}</span>
              <span className="text-xs text-slate-500 font-medium">Registered Accounts</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{tests.length}</span>
              <span className="text-xs text-slate-500 font-medium">Configured Tests</span>
            </div>
          </div>

          <Link href="/admin/tampering-logs" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-blue-500 transition-colors">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{profiles.filter((profile) => profile.is_verified).length}</span>
              <span className="text-xs text-slate-500 font-medium">Verified Accounts</span>
            </div>
          </Link>

        </div>

        {/* Recent integrity events */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Recent Tampering Events</h3>
            {tamperingLogs.slice(0, 3).map((log) => (
              <p key={log.id} className="text-xs text-slate-400">
                {log.event_type.replaceAll('_', ' ')} · Student {log.student_id} · {new Date(log.created_at).toLocaleString()}
              </p>
            ))}
            {tamperingLogs.length === 0 && <p className="text-xs text-slate-400">No integrity events recorded.</p>}
          </div>

          <Link
            href="/admin/tampering-logs"
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shrink-0"
          >
            Open Tampering Logs
          </Link>
        </div>

      </div>
    </div>
  );
}
