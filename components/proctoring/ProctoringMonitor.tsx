'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Clock, Maximize, Mic, ShieldAlert, Smartphone, Users, WifiOff } from 'lucide-react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface ProctoringMonitorProps {
  attemptId: string;
  testId: string;
  isProctored: boolean;
  onAutoSubmit: (reason: string, warningCount: number) => void;
  onIdentityReady: () => void;
}

type StoredEvent = { id: string; event_type: string; created_at: string };
type PositionBox = { x: number; y: number; width: number; height: number };
const OFFLINE_GRACE_MS = 3 * 60 * 1000;

export default function ProctoringMonitor({ attemptId, testId, isProctored, onAutoSubmit, onIdentityReady }: ProctoringMonitorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const lastPositionRef = useRef<PositionBox | null>(null);
  const warningCountRef = useRef(0);
  const terminatedRef = useRef(false);
  const identitySubmittedRef = useRef(false);
  const offlineSinceRef = useRef<number | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [livePhoto, setLivePhoto] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [identityRequested, setIdentityRequested] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [offlineSeconds, setOfflineSeconds] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);

  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      void element.play().catch(() => undefined);
    }
  }, []);

  const recordEvent = async (eventType: string, metadata: Record<string, unknown> = {}) => {
    try {
      const response = await fetch('/api/tampering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, attemptId, metadata }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not store proctoring event.');
      setEvents((previous) => [result.event, ...previous].slice(0, 5));
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Could not store proctoring event.');
    }
  };

  const terminate = (reason: string) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;
    void recordEvent(reason.includes('AI') ? 'ai_tool_shortcut' : 'window_defocus', { reason });
    onAutoSubmit(reason, warningCountRef.current);
  };

  const addWarning = (reason: string) => {
    if (terminatedRef.current) return;
    const next = warningCountRef.current + 1;
    warningCountRef.current = next;
    setWarnings(next);
    void recordEvent('head_pose_warning', { reason, warningCount: next });
    if (next >= 3) terminate('Three proctoring warnings reached');
  };

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      setRecordingError('Fullscreen permission is required for this assessment.');
    }
  };

  const captureLivePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setLivePhoto(canvas.toDataURL('image/jpeg', 0.68));
  };

  const selectIdPhoto = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      setIdPhoto(canvas.toDataURL('image/jpeg', 0.68));
      setIdentityError(null);
      URL.revokeObjectURL(imageUrl);
    };
    image.onerror = () => {
      setIdentityError('Could not read that ID image. Please choose another photo.');
      URL.revokeObjectURL(imageUrl);
    };
    image.src = imageUrl;
  };

  useEffect(() => {
    if (!isProctored) return;
    let active = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        setCameraReady(stream.getVideoTracks().length > 0);
        setMicrophoneReady(stream.getAudioTracks().length > 0);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        const denied = error instanceof DOMException && error.name === 'NotAllowedError';
        setCameraError(denied ? 'Camera and microphone access are required.' : 'Unable to access the camera and microphone.');
        void recordEvent(denied ? 'camera_denied' : 'microphone_denied');
      }
    };
    void startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setCameraReady(false);
      setMicrophoneReady(false);
    };
  }, [isProctored]);

  useEffect(() => {
    if (!isProctored) return;
    const handleFullscreenChange = () => {
      const activeFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(activeFullscreen);
      if (!activeFullscreen && identityReady) terminate('Fullscreen mode was exited');
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [identityReady, isProctored]);

  useEffect(() => {
    if (!isProctored || !identityReady) return;
    const onVisibility = () => { if (document.hidden) terminate('Assessment window or another application was opened'); };
    const onBlur = () => terminate('Assessment window lost focus');
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const restricted = event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) || (event.ctrlKey && ['u', 'l'].includes(key));
      if (restricted) { event.preventDefault(); terminate('AI or restricted browser tool detected'); }
    };
    const onClipboard = (event: ClipboardEvent) => { event.preventDefault(); terminate('Clipboard access was attempted'); };
    const onOffline = () => { const now = Date.now(); offlineSinceRef.current = now; setOfflineSince(now); setOfflineSeconds(Math.ceil(OFFLINE_GRACE_MS / 1000)); void recordEvent('network_loss'); };
    const onOnline = () => { offlineSinceRef.current = null; setOfflineSince(null); setOfflineSeconds(0); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('paste', onClipboard);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('paste', onClipboard);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [identityReady]);

  useEffect(() => {
    if (!isProctored || !identityReady) return;
    let active = true;
    const inspectFrame = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        if (!detectorRef.current) detectorRef.current = await cocoSsd.load();
        const predictions = await detectorRef.current.detect(videoRef.current);
        const people = predictions.filter((item) => item.class === 'person' && item.score > 0.62);
        const phones = predictions.filter((item) => item.class === 'cell phone' && item.score > 0.55);
        if (phones.length) return terminate('A mobile phone was detected near the assessment camera');
        if (people.length > 1) return terminate('Multiple people were detected in the camera view');
        if (people.length === 1) {
          const [x, y, width, height] = people[0].bbox;
          const previous = lastPositionRef.current;
          if (previous && Math.hypot(x - previous.x, y - previous.y) > Math.max(width, height) * 0.55) addWarning('Large head or position change detected');
          lastPositionRef.current = { x, y, width, height };
        }
      } catch {
        setRecordingError('Camera analysis is temporarily unavailable.');
      }
    };
    const interval = window.setInterval(() => void inspectFrame(), 2500);
    return () => { active = false; window.clearInterval(interval); };
  }, [identityReady]);

  useEffect(() => {
    if (!offlineSince) return;
    const interval = window.setInterval(() => {
      if (offlineSinceRef.current) {
        const remaining = Math.max(0, Math.ceil((OFFLINE_GRACE_MS - (Date.now() - offlineSinceRef.current)) / 1000));
        setOfflineSeconds(remaining);
        if (remaining < 1) {
          window.clearInterval(interval);
          terminate('Network was unavailable for more than three minutes');
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [offlineSince]);

  useEffect(() => {
    if (!attemptId || !livePhoto || !idPhoto || !identityRequested || identitySubmittedRef.current) return;
    identitySubmittedRef.current = true;
    setIdentitySaving(true);
    void fetch(`/api/student/tests/${testId}/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, livePhotoData: livePhoto, collegeIdPhotoData: idPhoto }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Identity evidence could not be saved.');
      setIdentitySaved(true);
    }).catch((error) => {
      identitySubmittedRef.current = false;
      const message = error instanceof Error ? error.message : '';
      setIdentityError(message || 'Identity evidence could not be saved. Check your connection and try again.');
    }).finally(() => setIdentitySaving(false));
  }, [attemptId, idPhoto, identityRequested, livePhoto, testId]);

  if (!isProctored) return null;
  if (!identityReady) {
    return <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/95 p-4 text-white">
        <div className="my-auto w-full max-w-3xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-black">Assessment identity check</h2>
              <p className="text-xs text-slate-400">Allow camera and microphone, capture a live photo, and upload your college ID before continuing.</p>
            </div>
          </div>
          {cameraError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{cameraError}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold"><span>Live camera</span><span className={cameraReady && microphoneReady ? 'text-emerald-400' : 'text-amber-300'}>{cameraReady ? 'Camera ready' : 'Waiting for camera'}</span></div>
              <video ref={attachVideo} muted playsInline className="aspect-video w-full rounded-xl border border-slate-700 bg-black object-cover" />
              <div className="flex items-center gap-3 text-[11px] text-slate-400"><span className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" />{cameraReady ? 'Allowed' : 'Permission needed'}</span><span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" />{microphoneReady ? 'Allowed' : 'Permission needed'}</span></div>
              <button type="button" onClick={captureLivePhoto} disabled={!cameraReady} className="w-full rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-bold disabled:opacity-40">{livePhoto ? 'Retake live photo' : 'Capture live photo'}</button>
              {livePhoto && <img src={livePhoto} alt="Captured live photo" className="h-24 w-32 rounded-lg border border-emerald-500 object-cover" />}
            </section>
            <section className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold"><span>College ID photo</span>{idPhoto && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" />Photo selected</span>}</div>
              <label className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center text-xs font-bold ${idPhoto ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
                {idPhoto ? <img src={idPhoto} alt="Selected college ID" className="max-h-40 w-full rounded-lg object-contain" /> : <><Camera className="h-7 w-7 text-slate-500" /><span>Select a clear image of your college ID</span></>}
                <input type="file" accept="image/*" onChange={(event) => selectIdPhoto(event.target.files?.[0])} className="sr-only" />
              </label>
              {idPhoto && <p className="text-[11px] font-semibold text-emerald-400">College ID image selected successfully.</p>}
            </section>
          </div>
          <button type="button" onClick={requestFullscreen} className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs font-bold ${isFullscreen ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-indigo-500 bg-indigo-600 text-white'}`}>
            <Maximize className="h-4 w-4" />
            {isFullscreen ? 'Fullscreen is active' : 'Enter fullscreen to continue'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (identitySaved) {
                setIdentityReady(true);
                onIdentityReady();
              } else {
                setIdentityRequested(true);
              }
            }}
            disabled={!livePhoto || !idPhoto || !cameraReady || !microphoneReady || !isFullscreen || identitySaving}
            className={`w-full rounded-lg px-4 py-3 text-xs font-black disabled:opacity-40 ${identitySaved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          >
            {identitySaving ? 'Uploading verification photos...' : identitySaved ? 'Continue to assessment' : 'Upload photos and verify'}
          </button>
          {!isFullscreen && <p className="text-center text-[11px] text-amber-300">Enter fullscreen first. Leaving fullscreen during the test automatically submits your assessment.</p>}
          {identityError && <p role="alert" className="text-xs text-red-300">{identityError}</p>}
          {!identitySaved && <p className="text-[11px] text-slate-500">The questions become available after both photos are saved. Photo matching against the ID requires manual review or a dedicated verification service.</p>}
        </div>
      </div>
    </>;
  }
  return <>
    <video ref={attachVideo} muted playsInline className="fixed bottom-4 left-4 z-40 h-28 w-40 rounded-xl border border-emerald-500/50 bg-black object-cover shadow-2xl" />
    <canvas ref={canvasRef} className="hidden" />
    {!identityReady && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-4 text-white"><div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6 text-amber-400" /><div><h2 className="text-lg font-black">Secure assessment check</h2><p className="text-xs text-slate-400">Camera, microphone, fullscreen, and identity evidence are required before the questions open.</p></div></div>{cameraError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{cameraError}</p>}<div className="grid grid-cols-2 gap-3 text-xs text-slate-300"><div className="rounded-xl border border-slate-800 p-3"><Camera className="mb-2 h-4 w-4 text-emerald-400" />Camera {cameraReady ? 'ready' : 'waiting'}</div><div className="rounded-xl border border-slate-800 p-3"><Mic className="mb-2 h-4 w-4 text-emerald-400" />Microphone {microphoneReady ? 'ready' : 'waiting'}</div></div><button type="button" onClick={requestFullscreen} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold"><Maximize className="h-4 w-4" />{isFullscreen ? 'Fullscreen active' : 'Enable fullscreen'}</button><button type="button" onClick={captureLivePhoto} disabled={!cameraReady} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold disabled:opacity-40">{livePhoto ? 'Live photo captured' : 'Capture live photo'}</button><label className="block cursor-pointer rounded-xl border border-slate-700 px-4 py-3 text-center text-xs font-bold">{idPhoto ? 'College ID photo selected' : 'Select college ID photo'}<input type="file" accept="image/*" onChange={(event) => selectIdPhoto(event.target.files?.[0])} className="hidden" /></label>{identityError && <p className="text-xs text-red-300">{identityError}</p>}<button type="button" onClick={() => setIdentityRequested(true)} disabled={!livePhoto || !idPhoto || identitySaving || !cameraReady || !microphoneReady} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black disabled:opacity-40">{identitySaving ? 'Saving verification evidence...' : <><CheckCircle2 className="h-4 w-4" />Submit verification</>}</button><p className="text-[11px] text-slate-500">The submitted images are stored for assessment identity review. Actual face-to-ID matching requires a dedicated verification service.</p></div></div>}
    {offlineSince && <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/95 p-6 text-center text-white"><div className="max-w-md space-y-3"><WifiOff className="mx-auto h-12 w-12 text-amber-400" /><h2 className="text-xl font-black">Connection lost</h2><p className="text-sm text-slate-300">Stay on this page. The assessment is paused for up to three minutes while the connection recovers.</p><p className="font-mono text-amber-300">Recovery window: {Math.floor(offlineSeconds / 60)}:{String(offlineSeconds % 60).padStart(2, '0')}</p></div></div>}
    {identityReady && <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-white shadow-2xl"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><ShieldAlert className="h-4 w-4 text-amber-400" />Integrity monitor</span><span className="text-[10px] text-emerald-400">{isFullscreen ? 'FULLSCREEN' : 'CHECK'}</span></div><div className="mb-2 flex items-center justify-between text-[11px] text-slate-400"><span className="flex items-center gap-1"><Users className="h-3 w-3" />Warnings</span><span className="font-bold text-amber-400">{warnings}/3</span></div>{recordingError && <p className="text-[10px] text-red-300">{recordingError}</p>}{events.map((event) => <div key={event.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-300"><span className="truncate">{event.event_type.replaceAll('_', ' ')}</span><span className="flex shrink-0 items-center gap-1 text-slate-500"><Clock className="h-3 w-3" />{new Date(event.created_at).toLocaleTimeString()}</span></div>)}<div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Smartphone className="h-3 w-3" />Phone and person scan active</div></div>}
  </>;
}
