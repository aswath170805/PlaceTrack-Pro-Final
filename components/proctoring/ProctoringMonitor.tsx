'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Clock } from 'lucide-react';

interface ProctoringMonitorProps {
  attemptId: string;
  isProctored: boolean;
}

export default function ProctoringMonitor({ attemptId, isProctored }: ProctoringMonitorProps) {
  const [recentEvents, setRecentEvents] = useState<{ id: string; event_type: string; created_at: string }[]>([]);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Browser Focus & Keyboard Event Listeners (Tab Switch, Copy/Paste, Window Blur)
  useEffect(() => {
    if (!isProctored) return;

    const recordTampering = async (eventType: string, metadata: Record<string, string>) => {
      try {
        const response = await fetch('/api/tampering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, metadata: { ...metadata, attemptId } }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not store tampering event.');
        setRecentEvents((previous) => [result.event, ...previous].slice(0, 5));
        setRecordingError(null);
      } catch (error) {
        setRecordingError(error instanceof Error ? error.message : 'Could not store tampering event.');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void recordTampering('tab_switch', {});
      }
    };

    const handleWindowBlur = () => {
      void recordTampering('window_defocus', {});
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      void recordTampering('copy_paste_attempt', { action: e.type });
    };

    const handleUnauthorizedKey = (event: KeyboardEvent) => {
      if (typeof event.key !== 'string') return;
      const key = event.key.toLowerCase();
      const isDeveloperShortcut = event.key === 'F12'
        || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key))
        || (event.ctrlKey && key === 'u');
      if (!isDeveloperShortcut) return;
      event.preventDefault();
      void recordTampering('unauthorized_key_press', { key: event.key });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      void recordTampering('context_menu', {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleUnauthorizedKey);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleUnauthorizedKey);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isProctored, attemptId]);

  if (!isProctored) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Integrity Monitor</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">BROWSER EVENTS</span>
      </div>

      <div className="mb-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400">
        Records tab changes, focus loss, clipboard actions, context-menu use, and restricted shortcuts.
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Stored events</span>
          <span className="font-bold text-amber-400">{recentEvents.length}</span>
        </div>

        {recordingError && <p role="alert" className="text-[10px] text-red-300">{recordingError}</p>}
        {recentEvents.map((event) => (
          <div key={event.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="truncate">{event.event_type.replaceAll('_', ' ')}</span>
            <span className="flex shrink-0 items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3" />
              {new Date(event.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
