'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Clock, LogOut, Lock } from 'lucide-react';

export default function FacultyLayoutGuard({ children }: { children: React.ReactNode }) {
  const { user, role, logout, isSessionReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSessionReady && !user) {
      router.replace('/login');
    }
  }, [isSessionReady, user, router]);

  if (!isSessionReady) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (role !== 'faculty') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-4 shadow-2xl">
          <Lock className="w-12 h-12 text-indigo-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-black text-white">Access Restricted to Faculty</h2>
          <p className="text-xs text-slate-400">
            This hub is reserved for Teachers & Faculty members with verified institutional credentials.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            Return to Faculty Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!user.is_verified) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full space-y-4 shadow-2xl">
          <Clock className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-white">Teacher Verification Pending</h2>
          <p className="text-xs text-slate-300">
            Hello <strong>{user.full_name}</strong>! Your Faculty profile is undergoing verification by the Placement Cell Administrator. Access to question authoring and test builder will be enabled upon approval.
          </p>
          <button
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl text-slate-300 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Check Status Later</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
