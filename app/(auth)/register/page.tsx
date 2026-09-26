'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { GraduationCap, Lock, Mail, User, BookOpen, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, isLoading } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState<string>('CSE');
  const [yearOfStudy, setYearOfStudy] = useState<string>('4th');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = await signUpWithEmail({
      email,
      pass: password,
      fullName,
      role,
      department,
      yearOfStudy,
    });

    if (res.success) {
      if (role === 'faculty') router.push('/faculty');
      else router.push('/student');
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check form fields.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
            <GraduationCap className="w-7 h-7" />
          </div>
        </Link>

        <h2 className="text-3xl font-black tracking-tight text-white">Create College Account</h2>
        <p className="mt-2 text-xs text-slate-400">
          Register your student or faculty profile for PlaceTrack Pro
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300" role="alert">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {(errorMsg.includes('temporarily limited confirmation emails') || errorMsg.includes('account may already exist')) && (
                <p className="mt-2 pl-6 text-slate-300">
                  Check your inbox and try signing in before registering again. For recurring limits, configure a custom SMTP provider in Supabase Auth email settings.{' '}
                  <Link href="/login" className="font-bold text-blue-300 underline underline-offset-2">Go to sign in</Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Account Role */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Account Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    role === 'student' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('faculty')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    role === 'faculty' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Faculty Member
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">College Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.johnson@college.edu"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="CSE">CSE</option>
                  <option value="AI">AI</option>
                  <option value="EEE">EEE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                </select>
              </div>

              {role === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Year of Study</label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center mt-2"
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-blue-400 hover:underline">
                Sign In Instead
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
