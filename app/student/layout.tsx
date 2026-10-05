'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Clock, LogOut, Lock } from 'lucide-react';

export default function StudentLayoutGuard({ children }: { children: React.ReactNode }) {
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

  if (role !== 'student') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-4 shadow-2xl">
          <Lock className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-black text-white">Access Restricted to Students</h2>
          <p className="text-xs text-slate-400">
            This area is exclusively reserved for Students with enrolled institutional accounts.
          </p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            Return to Student Sign In
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
          <h2 className="text-xl font-black text-white">Account Verification Pending</h2>
          <p className="text-xs text-slate-300">
            Hello <strong>{user.full_name}</strong>! Your account registration is undergoing verification by the Placement Cell Admin. Access to tests and dashboards will be unlocked as soon as your account is verified.
          </p>
          <button
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl text-slate-300 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Try Again Later</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
