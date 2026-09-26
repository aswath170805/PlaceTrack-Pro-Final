'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { 
  GraduationCap, 
  ShieldAlert, 
  Users, 
  BarChart3, 
  CalendarCheck, 
  LogOut, 
  LogIn,
  BookOpen, 
  LayoutDashboard, 
  ChevronDown, 
  Shield, 
  Mail, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (pathname === '/login' || pathname === '/register' || (pathname.includes('/student/tests/') && !pathname.includes('/results'))) {
    return null;
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setIsProfileOpen(false);
    await logout();
    router.replace('/login');
  };

  const isFaculty = role === 'faculty';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">PlaceTrack <span className="text-blue-600">Pro</span></span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Placement Portal</span>
            </div>
          </Link>

          {/* Role Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {role === 'student' && (
              <>
                <Link 
                  href="/student" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/student' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <Link 
                  href="/student/analytics" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/analytics') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance AI
                </Link>
                <Link 
                  href="/student/attendance" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/attendance') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Attendance
                </Link>
              </>
            )}

            {role === 'faculty' && (
              <>
                <Link 
                  href="/faculty" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/faculty' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Faculty Hub
                </Link>
                <Link 
                  href="/faculty/question-banks" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/question-banks') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Question Banks & Authoring
                </Link>
                <Link 
                  href="/faculty/attendance" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/faculty/attendance') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Absence Review
                </Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link 
                  href="/admin" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Overview
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/users') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Users & Batches
                </Link>
                <Link 
                  href="/admin/tampering-logs"
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.includes('/tampering-logs') ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Tampering Logs
                </Link>
              </>
            )}
          </nav>

          {/* Right Header Controls: Current Role Badge & Interactive Profile Dropdown */}
          <div className="flex items-center space-x-3">
            
            {/* Active Role Pill Badge: For Faculty users, restrict display to static FACULTY badge */}
            {isFaculty ? (
              <div className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center space-x-2 bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>FACULTY</span>
              </div>
            ) : (
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs border ${
                role === 'admin'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  role === 'admin' ? 'bg-amber-500' : 'bg-blue-600'
                }`} />
                <span>ROLE: {role}</span>
              </div>
            )}

            {/* User Profile Avatar with Clickable Modal Dropdown */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 shadow-xs"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm ${
                    role === 'faculty' ? 'bg-indigo-600' : role === 'admin' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}>
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block text-left pr-1">
                    <span className="block text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">{user?.full_name}</span>
                    <span className="block text-[10px] text-slate-400 capitalize font-medium">{role}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Modal Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* User Profile Info Card */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-900">{user?.full_name}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          role === 'faculty' ? 'bg-indigo-100 text-indigo-800' : role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {role}
                        </span>
                      </div>

                      <div className="flex items-center text-[11px] text-slate-500 truncate">
                        <Mail className="w-3 h-3 mr-1.5 text-slate-400 shrink-0" />
                        <span className="truncate">{user?.email || 'user@svce.ac.in'}</span>
                      </div>

                      <div className="flex items-center text-[11px] text-slate-500">
                        <Building2 className="w-3 h-3 mr-1.5 text-slate-400 shrink-0" />
                        <span>Department: <strong className="text-slate-700">{user?.department || 'CSE'}</strong></span>
                      </div>
                    </div>

                    {/* Logout Trigger */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          setShowLogoutModal(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2 text-red-500" />
                        Log Out of Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Confirmation Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Sign Out Confirmation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to log out? You will be redirected to the sign-in page.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
