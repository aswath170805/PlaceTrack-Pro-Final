'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { GraduationCap, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function CentralizedLoginPage() {
  const router = useRouter();
  const { signInWithEmail, logout, isLoading, isAdminAccessVisible, isFacultyAccessVisible } = useAuth();

  const [accessRole, setAccessRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if ((accessRole === 'admin' && !isAdminAccessVisible) || (accessRole === 'faculty' && !isFacultyAccessVisible)) {
      setAccessRole('student');
    }
  }, [accessRole, isAdminAccessVisible, isFacultyAccessVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = await signInWithEmail(email, password);
    if (res.success && res.role) {
      if (res.role !== accessRole) {
        await logout();
        setErrorMsg(`These credentials do not belong to the ${accessRole} sign-in view.`);
        return;
      }
      if (res.role !== 'admin' && res.isVerified !== true) {
        await logout();
        setErrorMsg('Your account is awaiting administrator approval. Please try again after access is confirmed.');
        return;
      }
      if (res.role === 'admin') router.push('/admin');
      else if (res.role === 'faculty') router.push('/faculty');
      else router.push('/student');
      return;
    }

    setErrorMsg(res.error || 'Invalid credentials. Please check your email and password.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
            <GraduationCap className="w-7 h-7" />
          </div>
        </Link>

        <h2 className="text-3xl font-black tracking-tight text-white">{accessRole === 'faculty' ? 'Faculty Sign In' : accessRole === 'admin' ? 'Admin Sign In' : 'Student Sign In'}</h2>
        <p className="mt-2 text-xs text-slate-400">
          Sign in with your registered college account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">College Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
            >
              {isLoading ? 'Authenticating...' : `Sign In as ${accessRole === 'faculty' ? 'Faculty' : accessRole === 'admin' ? 'Admin' : 'Student'}`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>

          {(isAdminAccessVisible || isFacultyAccessVisible) && (
            <div className="mt-6 border-t border-slate-800 pt-4 space-y-3">
              {isAdminAccessVisible && (
                <button
                  type="button"
                  onClick={() => setAccessRole('admin')}
                  aria-pressed={accessRole === 'admin'}
                  className={`w-full py-2.5 text-white font-bold text-xs rounded-xl ${accessRole === 'admin' ? 'bg-amber-500' : 'bg-amber-700 hover:bg-amber-600'}`}
                >
                  Admin Sign In
                </button>
              )}
              {isFacultyAccessVisible && (
                <button
                  type="button"
                  onClick={() => setAccessRole('faculty')}
                  aria-pressed={accessRole === 'faculty'}
                  className={`w-full py-2.5 text-white font-bold text-xs rounded-xl ${accessRole === 'faculty' ? 'bg-indigo-500' : 'bg-indigo-700 hover:bg-indigo-600'}`}
                >
                  Faculty / Teacher Sign In
                </button>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account yet?{' '}
              <Link href="/register" className="font-bold text-blue-400 hover:underline">
                Register New Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
