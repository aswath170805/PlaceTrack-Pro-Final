'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { DatabaseService } from '@/lib/dbService';
import { Profile, VerificationRequest } from '@/lib/types';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Building2, 
  Shield, 
  Check, 
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [requestLoadError, setRequestLoadError] = useState<string | null>(null);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [emailConfirmationUserId, setEmailConfirmationUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const profiles = await DatabaseService.getProfiles();
      setUsers(profiles);
      try {
        setRequests(await DatabaseService.getVerificationRequests());
        setRequestLoadError(null);
      } catch (error) {
        setRequests([]);
        setRequestLoadError(error instanceof Error ? error.message : 'Access requests could not be loaded.');
      } finally {
        setIsLoadingRequests(false);
      }
    }
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'student' | 'faculty' | 'admin') => {
    try {
      await DatabaseService.updateProfileRole(userId, newRole, currentAdmin?.id);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setStatusIsError(false);
      setStatusMessage(`User role successfully updated to ${newRole.toUpperCase()}.`);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update this account role.');
    }
  };

  const handleDeleteUser = async (user: Profile) => {
    if (!window.confirm(`Permanently delete ${user.full_name} and their account?`)) return;
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatusMessage(result.error || 'Unable to delete this account.');
      return;
    }
    setUsers((previous) => previous.filter((entry) => entry.id !== user.id));
    setStatusMessage(`Deleted account for ${user.full_name}.`);
  };

  const handleApprove = async (req: VerificationRequest) => {
    try {
      await DatabaseService.approveVerificationRequest(req.id, req.user_id, currentAdmin?.id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)));
      setUsers((prev) => prev.map((u) => (u.id === req.user_id ? { ...u, is_verified: true } : u)));
      setStatusIsError(false);
      setStatusMessage(`Approved access request for ${req.user_name || 'user'}.`);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to approve this access request.');
    }
  };

  const handleReject = async (req: VerificationRequest) => {
    try {
      await DatabaseService.rejectVerificationRequest(req.id, req.user_id, 'Access declined by Placement Administrator', currentAdmin?.id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)));
      setUsers((prev) => prev.map((u) => (u.id === req.user_id ? { ...u, is_verified: false } : u)));
      setStatusIsError(false);
      setStatusMessage(`Declined access request for ${req.user_name || 'user'}.`);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to reject this access request.');
    }
  };

  const handleConfirmEmail = async (user: Profile) => {
    setEmailConfirmationUserId(user.id);
    try {
      const response = await fetch('/api/admin/confirm-approved-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to confirm this account email.');
      setStatusIsError(false);
      setStatusMessage(`Email confirmed for ${user.full_name}. They can now sign in.`);
    } catch (error) {
      setStatusIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to confirm this account email.');
    } finally {
      setEmailConfirmationUserId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Identity & Governance</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">User & Faculty Access Governance</h1>
            <p className="text-xs text-slate-500">
              Approve new faculty registrations, update user roles securely via backend API, and manage institutional accounts
            </p>
          </div>

          {currentAdmin && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Acting Admin: {currentAdmin.full_name}</span>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className={`p-4 border rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in ${statusIsError ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`} role={statusIsError ? 'alert' : 'status'}>
            {statusIsError ? <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Verification Requests Queue */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                Faculty & Account Approval Requests
              </h3>
              <p className="text-xs text-slate-500">Review incoming requests before granting workspace access</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              pendingRequests.length > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
              {pendingRequests.length} Pending Approval
            </span>
          </div>

          <div className="p-6 pt-0">
            {requestLoadError ? (
              <div role="alert" className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
                {requestLoadError}. No placeholder requests are being shown.
              </div>
            ) : isLoadingRequests ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading access requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No pending access requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => {
                  const profile = users.find((user) => user.id === req.user_id);
                  return (
                  <div key={req.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{req.user_name || profile?.full_name || 'Account'}</span>
                        <span className="text-[11px] text-slate-500 flex items-center mt-0.5">
                          <Mail className="w-3 h-3 mr-1 text-slate-400" />
                          {req.email || profile?.email || req.user_id}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center mt-0.5">
                          <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                          Department: {req.department || profile?.department || 'Not provided'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex space-x-2 pt-1 border-t border-slate-200/80">
                        <button
                          onClick={() => handleApprove(req)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Access</span>
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          className="flex-1 py-1.5 bg-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">User Accounts Directory</h3>
              <p className="text-xs text-slate-500">Manage account roles and access permissions</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Accounts: {users.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">User Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Email Confirmation</th>
                  <th className="p-4">Current Role</th>
                  <th className="p-4">Change Role (Backend API)</th>
                  {currentAdmin?.is_super_admin && <th className="p-4">Account</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <span>{u.full_name}</span>
                        <span className="block text-[10px] font-normal text-slate-400">{u.id}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">{u.department || 'CSE'}</td>
                    <td className="p-4">
                      {u.is_verified ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {u.is_verified && (u.role === 'student' || u.role === 'faculty') ? (
                        <button
                          type="button"
                          onClick={() => void handleConfirmEmail(u)}
                          disabled={emailConfirmationUserId !== null}
                          title="Confirm email for this already-approved account"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {emailConfirmationUserId === u.id ? 'Confirming...' : 'Confirm Email'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {u.role === 'admin' ? 'Not required' : 'Available after approval'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-800' : u.role === 'faculty' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    {currentAdmin?.is_super_admin && (
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(u)}
                          disabled={u.is_super_admin}
                          title={u.is_super_admin ? 'Super-admin accounts cannot be deleted here' : 'Delete user account'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
