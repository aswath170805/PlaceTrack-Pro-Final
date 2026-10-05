'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isSessionReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSessionReady && (!user || role !== 'admin')) {
      router.replace('/login');
    }
  }, [isSessionReady, user, role, router]);

  if (!isSessionReady || !user || role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
