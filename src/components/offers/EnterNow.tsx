'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { enterContest } from '@/lib/api_contests';
import { r2Upload } from '@/lib/upload-client';
import { useTranslations } from 'next-intl';

declare global {
  interface Window {
    jsQR?: (
      data: Uint8ClampedArray,
      width: number,
      height: number,
    ) => { data?: string; rawValue?: string } | null;
  }
}

type McqOption = {
  id?: string;
  label?: string | null;
  position?: number | null;
};

type ContestTask = {
  id: string;
  kind: string;
  title?: string | null;
  description?: string | null;
  metadata?: any;
  round_id?: string | null;
  options?: {
    id?: string;
    label?: string | null;
    is_correct?: boolean;
    position?: number | null;
  }[] | null;
};

type Props = {
  contestId: string;
  contestType: string;
  mcqOptions?: McqOption[] | null;
  tasks?: ContestTask[] | null;
  disabled: boolean;
  disabledReason?: string | null;
  onSubmitted?: () => void;
};

type DetectionStatus = 'idle' | 'starting' | 'active' | 'error';

export default function EnterNow({
  contestId,
  contestType,
  mcqOptions = [],
  tasks = [],
  disabled,
  disabledReason,
  onSubmitted,
}: Props) {
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [assetPreviewName, setAssetPreviewName] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [predictionScores, setPredictionScores] = useState<{ teamA: string; teamB: string }>({
    teamA: '',
    teamB: '',
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, any> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<'success' | 'info'>('info');
  const [busy, setBusy] = useState(false);

  const [nativeScannerSupported, setNativeScannerSupported] = useState(false);
  const [jsQrReady, setJsQrReady] = useState(false);
  const [jsQrError, setJsQrError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<DetectionStatus>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const urlPrefillAppliedRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('OfferDetail.enterNow');
  const setNotice = useCallback(
    (text: string | null, variant: 'success' | 'info' = 'info') => {
      setMessage(text);
      setMessageVariant(variant);
    },
    [],
  );
  const resolveEntryError = (payload: any) => {
    const rawError = typeof payload?.error === 'string' ? payload.error.trim() : '';
    const rawMessage =
      typeof payload?.message === 'string'
        ? payload.message.trim()
        : typeof payload?.detail === 'string'
        ? payload.detail.trim()
        : '';
    const errorCode = rawError.toUpperCase();
    const message = rawMessage.toLowerCase();

    if (errorCode === 'INVALID_CODE') return t('messages.codeInvalid');
    if (errorCode === 'CODE_ALREADY_USED') return t('messages.codeUsed');
    if (errorCode === 'CODE_EXPIRED') return t('messages.codeExpired');
    if (errorCode === 'TASK_ALREADY_SUBMITTED') return t('messages.taskAlreadySubmitted');
    if (errorCode === 'NOT FOUND' || errorCode === 'NOT_FOUND') return t('messages.notFound');

    if (message.includes('code redemption limit reached')) return t('messages.codeLimitReached');
    if (message.includes('contest is not active')) return t('messages.offerInactive');
    if (message.includes('contest is closed for entries')) return t('messages.offerClosed');
    if (message.includes('per-user limit exceeded')) return t('messages.limitExceeded');

    return t('messages.submitError');
  };
  const redirectToSignIn = useCallback(() => {
    if (typeof window === 'undefined') return;
    const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/sign-in${nextParam}`);
  }, [router]);

  const normalizedType = useMemo(() => (contestType || '').toUpperCase(), [contestType]);
  const baseSupportsMedia = ['UGC', 'TREASURE_HUNT', 'LEADERBOARD'].includes(normalizedType);
  const isCodeEntryContest = normalizedType === 'QR_CODE' || normalizedType === 'RAFFLE';
  const isRiddleContest = normalizedType === 'RIDDLE';
  const baseSupportsFreeText =
    !isCodeEntryContest &&
    (normalizedType !== 'RIDDLE' || ['UGC', 'TREASURE_HUNT', 'SURVEY', 'PREDICTION'].includes(normalizedType));

  const orderedOptions = useMemo(() => {
    const opts = Array.isArray(mcqOptions)
      ? mcqOptions.filter((opt) => !!opt && typeof opt.label === 'string' && opt.label.trim())
      : [];
    return opts
      .map((opt, index) => ({
        id: opt.id ? String(opt.id) : `opt-${index}`,
        label: opt.label || '',
        position: typeof opt.position === 'number' ? opt.position : index + 1,
      }))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [mcqOptions]);

  const taskOptions = useMemo<ContestTask[]>(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks
      .filter((task) => task && task.id && task.kind)
      .map((task, index) => ({
        ...task,
        id: String(task.id),
        kind: String(task.kind || '').toUpperCase(),
        options: Array.isArray(task.options)
          ? task.options.map((opt, optIndex) => ({
              id: opt?.id ? String(opt.id) : `task-opt-${index}-${optIndex}`,
              label: opt?.label || '',
              is_correct: !!opt?.is_correct,
              position:
                typeof opt?.position === 'number' ? opt.position : optIndex + 1,
            }))
          : undefined,
      }));
  }, [tasks]);

  useEffect(() => {
    if (taskOptions.length === 0) {
      setSelectedTaskId(null);
      return;
    }
    if (!selectedTaskId || !taskOptions.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(taskOptions[0].id);
    }
  }, [taskOptions, selectedTaskId]);

const selectedTask = useMemo(
  () => taskOptions.find((task) => task.id === selectedTaskId) || null,
  [taskOptions, selectedTaskId],
);

const activeTaskKind = selectedTask?.kind ?? null;

const formatTaskKind = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasNative = typeof (window as any).BarcodeDetector !== 'undefined';
    setNativeScannerSupported(hasNative);
    if (hasNative) {
      setJsQrReady(false);
      setJsQrError(null);
      return;
    }

    if (typeof window.jsQR === 'function') {
      setJsQrReady(true);
      setJsQrError(null);
      return;
    }

    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.async = true;
    script.onload = () => {
      if (cancelled) return;
      if (typeof window.jsQR === 'function') {
        setJsQrReady(true);
        setJsQrError(null);
      } else {
        setJsQrError('QR helper loaded but unavailable.');
      }
    };
    script.onerror = () => {
      if (cancelled) return;
        setJsQrError(t('scanner.jsQrFailed'));
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTask && selectedTask.kind === 'SCAN_QR') {
      if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas');
      }
    } else if (!isCodeEntryContest) {
      stopScanner();
      setScannerStatus('idle');
    }
  }, [selectedTask, isCodeEntryContest]);

  

  useEffect(() => {
    setAnswer('');
    setSelectedOption(null);
    setCode('');
    setAssetUrl(null);
    setAssetPreviewName(null);
    setUploadError(null);
    setPredictionScores({ teamA: '', teamB: '' });
    setConfirmOpen(false);
    setPendingPayload(null);
    setNotice(null);
    if (!(selectedTask && selectedTask.kind === 'SCAN_QR') && !isCodeEntryContest) {
      stopScanner();
      setScannerStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId]);

  function stopScanner() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  const taskMcqOptions = useMemo(() => {
    if (!selectedTask || selectedTask.kind !== 'MCQ') return [];
    const metadata = selectedTask.metadata || {};
    const raw =
      Array.isArray(metadata?.options) && metadata.options.length
        ? metadata.options
        : Array.isArray(metadata?.choices) && metadata.choices.length
        ? metadata.choices
        : Array.isArray(metadata)
        ? metadata
        : [];
    return raw
      .map((entry: any, index: number) => {
        if (entry == null) return null;
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (!trimmed) return null;
          return { id: `task-opt-${index}`, label: trimmed, position: index + 1 };
        }
        if (typeof entry === 'object') {
          const label = entry.label || entry.name || entry.value;
          if (!label) return null;
          return {
            id: entry.id ? String(entry.id) : `task-opt-${index}`,
            label: String(label),
            position: entry.position ?? index + 1,
          };
        }
        return null;
      })
      .filter((item): item is { id: string; label: string; position?: number | null } => !!item)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [selectedTask]);

  const mcqOptionList = useMemo(() => {
    if (selectedTask && selectedTask.kind === 'MCQ') {
      const taskLevelOptions = Array.isArray(selectedTask.options)
        ? selectedTask.options
            .map((opt, index) => {
              if (!opt) return null;
              const label = typeof opt.label === 'string' ? opt.label.trim() : '';
              if (!label) return null;
              return {
                id: opt.id ? String(opt.id) : `task-opt-${index}`,
                label,
                position: typeof opt.position === 'number' ? opt.position : index + 1,
              };
            })
            .filter((opt): opt is { id: string; label: string; position?: number } => !!opt)
        : [];

      if (taskLevelOptions.length) {
        return taskLevelOptions;
      }

      const metadata = selectedTask.metadata || {};
      const rawOptions: any[] = Array.isArray(metadata.options) ? metadata.options : metadata.options_json || [];
      if (rawOptions?.length) {
        const normalized = rawOptions
          .map((entry, index) => {
            if (!entry) return null;
            if (typeof entry === 'string') {
              const trimmed = entry.trim();
              if (!trimmed) return null;
              return { id: `task-opt-${index}`, label: trimmed, position: index + 1 };
            }
            if (typeof entry === 'object') {
              const label = entry.label || entry.name || entry.value;
              if (!label) return null;
              return {
                id: entry.id ? String(entry.id) : `task-opt-${index}`,
                label: String(label),
                position: entry.position ?? index + 1,
              };
            }
            return null;
          })
          .filter((opt): opt is { id: string; label: string; position?: number } => !!opt);
        if (normalized.length) return normalized;
      }

      return taskMcqOptions;
    }
    return isRiddleContest ? orderedOptions : [];
  }, [selectedTask, taskMcqOptions, isRiddleContest, orderedOptions]);

  const predictionContext = useMemo(() => {
    if (!(selectedTask && selectedTask.metadata?.match_prediction)) return null;
    const meta = selectedTask.metadata || {};
    const fallbackA = mcqOptionList[0]?.label || t('prediction.teamAFallback');
    const fallbackB =
      mcqOptionList[mcqOptionList.length - 1]?.label || t('prediction.teamBFallback');
    return {
      teamA: String(meta.team_a || fallbackA || t('prediction.teamAFallback')),
      teamB: String(meta.team_b || fallbackB || t('prediction.teamBFallback')),
      requireScores: meta.require_scores !== false,
    };
  }, [selectedTask, mcqOptionList, t]);

  const showMcq = (selectedTask && selectedTask.kind === 'MCQ') || (!selectedTask && isRiddleContest);
  const showQr =
    (selectedTask && selectedTask.kind === 'SCAN_QR') || (!selectedTask && isCodeEntryContest);
  const showUpload =
    (selectedTask && ['UPLOAD_PHOTO', 'UPLOAD_VIDEO'].includes(selectedTask.kind)) ||
    (!selectedTask && baseSupportsMedia);
  const showTextArea =
    (selectedTask && ['ANSWER_TEXT', 'CHECKIN', 'REFERRAL'].includes(selectedTask.kind)) ||
    (!selectedTask && baseSupportsFreeText);
  const showPredictionScores = Boolean(predictionContext);
  const predictionWinnerKey = useMemo(() => {
    if (!predictionContext || !selectedOption) return null;
    const selected = mcqOptionList.find((option) => option.id === selectedOption);
    if (!selected?.label) return null;
    const label = selected.label.trim().toLowerCase();
    const teamALabel = predictionContext.teamA.trim().toLowerCase();
    const teamBLabel = predictionContext.teamB.trim().toLowerCase();
    if (label === teamALabel) return 'team_a';
    if (label === teamBLabel) return 'team_b';
    return 'draw';
  }, [predictionContext, selectedOption, mcqOptionList]);

  useEffect(() => {
    if (!showQr) setScannerEnabled(false);
  }, [showQr]);

  const shouldScan =
    scannerEnabled &&
    showQr &&
    (selectedTask?.kind === 'SCAN_QR' || (!selectedTask && isCodeEntryContest));

  const [scannerReady, setScannerReady] = useState(false);

  function extractCode(raw: string) {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      const paramKeys = ['code', 'token', 'qr', 'value'];
      for (const key of paramKeys) {
        const param = url.searchParams.get(key);
        if (param) return param.trim();
      }
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && /^[A-Z0-9-]{4,}$/i.test(lastSegment)) return lastSegment.trim();
    } catch {
      // not a URL, continue to regex fallback
    }

    const match = trimmed.match(/[A-Z0-9-]{4,}/i);
    return match ? match[0] : trimmed;
  }

  useEffect(() => {
    if (urlPrefillAppliedRef.current) return;
    if (!searchParams) return;
    const paramKeys = ['code', 'token', 'qr', 'value'];
    let paramValue: string | null = null;
    for (const key of paramKeys) {
      const candidate = searchParams.get(key);
      if (candidate) {
        paramValue = candidate;
        break;
      }
    }
    if (!paramValue) return;

    const cleaned = extractCode(paramValue);
    if (cleaned) {
      setCode(cleaned);
      urlPrefillAppliedRef.current = true;

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        let changed = false;
        for (const key of paramKeys) {
          if (params.has(key)) {
            params.delete(key);
            changed = true;
          }
        }
        if (changed) {
          const query = params.toString();
          const hash = window.location.hash || '';
          const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;
          router.replace(nextUrl, { scroll: false });
        }
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!shouldScan) {
      stopScanner();
      setScannerReady(false);
      if (scannerStatus !== 'idle') setScannerStatus('idle');
      return;
    }
    if (scannerStatus === 'idle') {
      setScannerStatus('starting');
    }
  }, [shouldScan, scannerStatus]);

  useEffect(() => {
    if (!shouldScan || scannerStatus !== 'starting') return;

    let cancelled = false;

    const ensureCanvas = () => {
      if (!canvasRef.current && typeof document !== 'undefined') {
        canvasRef.current = document.createElement('canvas');
      }
    };

    async function startScanner() {
      if (!nativeScannerSupported && !jsQrReady && jsQrError) {
        setScannerStatus('error');
        setScannerError(jsQrError);
        return;
      }
      if (!nativeScannerSupported && !jsQrReady && !jsQrError) {
        setScannerError('Preparing scanner...');
        return;
      }
      setScannerError(null);

      try {
        ensureCanvas();

        const Detector = nativeScannerSupported ? (window as any).BarcodeDetector : null;
        if (nativeScannerSupported && !detectorRef.current && Detector) {
          detectorRef.current = new Detector({ formats: ['qr_code'] });
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not available in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const playPromise = videoRef.current.play();
          if (playPromise) {
            try {
              await playPromise;
            } catch {
              /* ignore autoplay errors */
            }
          }
        }

        const scanFrame = async () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;

          if (!width || !height) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);

          const detectorAvailable = nativeScannerSupported && detectorRef.current;
          const jsQrAvailable = jsQrReady && typeof window.jsQR === 'function';
          if (!detectorAvailable && !jsQrAvailable) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          try {
          const handleDetection = (raw?: string | null) => {
            if (!raw) return false;
              const value = raw.trim();
              if (!value) return false;
              setCode(extractCode(value));
              setScannerEnabled(false);
              setScannerStatus('idle');
              setScannerReady(false);
              stopScanner();
              return true;
            };

            if (detectorAvailable && videoRef.current) {
              const detections = await detectorRef.current!.detect(videoRef.current);
              if (handleDetection(detections?.[0]?.rawValue)) return;
            }
            if (jsQrAvailable) {
              const imageData = ctx.getImageData(0, 0, width, height);
              const result = window.jsQR!(imageData.data, width, height);
              if (handleDetection(result?.data || result?.rawValue)) return;
            }
          } catch (err) {
            console.warn('QR detection failed', err);
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        setScannerReady(true);
        setScannerStatus('active');
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (error: any) {
        console.error('Unable to start QR scanner', error);
        setScannerStatus('error');
        setScannerError(error?.message || t('scanner.cameraAccess'));
        stopScanner();
        setScannerReady(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
    };
  }, [shouldScan, scannerStatus, nativeScannerSupported, jsQrReady, jsQrError]);

  useEffect(() => {
    if (!showMcq) {
      setSelectedOption(null);
      return;
    }
    if (!mcqOptionList.length) {
      setSelectedOption(null);
      return;
    }
    if (!selectedOption || !mcqOptionList.some((option) => option.id === selectedOption)) {
      setSelectedOption(mcqOptionList[0].id);
    }
  }, [showMcq, mcqOptionList, selectedOption]);

  const uploadAccept = selectedTask?.kind === 'UPLOAD_VIDEO' ? 'video/*' : 'image/*';

  async function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (!file) return;

    setUploadingAsset(true);
    setUploadError(null);

    try {
      const urls = await r2Upload([file], 'entries');
      if (!urls.length) throw new Error(t('messages.uploadFailed'));
      setAssetUrl(urls[0]);
      setAssetPreviewName(file.name);
      setNotice(t('messages.mediaUploaded'), 'success');
    } catch (error: any) {
      setUploadError(error?.message || t('messages.uploadError'));
    } finally {
      setUploadingAsset(false);
    }
  }

  function resetForm() {
    setAnswer('');
    setSelectedOption(null);
    setCode('');
    setAssetUrl(null);
    setAssetPreviewName(null);
    setUploadError(null);
    setPredictionScores({ teamA: '', teamB: '' });
    setConfirmOpen(false);
    setPendingPayload(null);
    setNotice(t('messages.submitSuccess'), 'success');
    setScannerStatus('idle');
    stopScanner();
  }

  function buildPayload() {
    const trimmedAnswer = answer.trim();
    const trimmedCode = code.trim();

    setNotice(null);
    setUploadError(null);

    const payload: Record<string, any> = {
      entry_type: normalizedType || null,
    };

    if (selectedTask) {
      payload.task_id = selectedTask.id;
    }

    let provided = false;

    if (showMcq) {
      if (!mcqOptionList.length) {
        setNotice(t('messages.choicesMissing'));
        return null;
      }
      if (!selectedOption) {
        setNotice(t('messages.mustSelectOption'));
        return null;
      }
      if (selectedTask && selectedTask.kind === 'MCQ') {
        const chosen = mcqOptionList.find((option) => option.id === selectedOption);
        if (!chosen?.label) {
          setNotice(t('messages.invalidChoice'));
          return null;
        }
        const realTaskOption =
          Array.isArray(selectedTask.options) &&
          selectedTask.options.some(
            (opt) => opt?.id && String(opt.id) === selectedOption,
          );
        payload.mcq_option_id = realTaskOption ? selectedOption : null;
        payload.answer_text = chosen.label;
        provided = true;
      } else {
        payload.mcq_option_id = selectedOption;
        provided = true;
        if (trimmedAnswer) {
          payload.answer_text = trimmedAnswer;
        }
      }
    }

    if (showTextArea) {
      if (trimmedAnswer) {
        payload.answer_text = trimmedAnswer;
        provided = true;
      } else if (selectedTask && selectedTask.kind === 'ANSWER_TEXT') {
        setNotice(t('messages.answerRequired'));
        return null;
      }
    }

    if (showQr) {
      if (!trimmedCode) {
        setNotice(t('messages.codeRequired'));
        return null;
      }
      payload.code_hash = trimmedCode;
      provided = true;
    }

    if (showUpload) {
      if (
        selectedTask &&
        ['UPLOAD_PHOTO', 'UPLOAD_VIDEO'].includes(selectedTask.kind) &&
        !assetUrl
      ) {
        setNotice(t('messages.uploadRequired'));
        return null;
      }
      if (assetUrl) {
        payload.asset_url = assetUrl;
        payload.evidence_image_url = assetUrl;
        provided = true;
      }
    }

    if (showPredictionScores && predictionContext) {
      const rawTeamA = predictionScores.teamA.trim();
      const rawTeamB = predictionScores.teamB.trim();
      const hasScoreA = rawTeamA !== '';
      const hasScoreB = rawTeamB !== '';

      if (predictionContext.requireScores && (!hasScoreA || !hasScoreB)) {
        setNotice(t('messages.predictionScoresRequired'));
        return null;
      }
      if (hasScoreA !== hasScoreB) {
        setNotice(t('messages.predictionScoresInvalid'));
        return null;
      }

      if (hasScoreA && hasScoreB) {
        const parsedA = Number(rawTeamA);
        const parsedB = Number(rawTeamB);
        if (
          !Number.isFinite(parsedA) ||
          parsedA < 0 ||
          !Number.isInteger(parsedA) ||
          !Number.isFinite(parsedB) ||
          parsedB < 0 ||
          !Number.isInteger(parsedB)
        ) {
          setNotice(t('messages.predictionScoresInvalid'));
          return null;
        }
        if (!predictionWinnerKey) {
          setNotice(t('messages.invalidChoice'));
          return null;
        }
        if (
          (predictionWinnerKey === 'team_a' && !(parsedA > parsedB)) ||
          (predictionWinnerKey === 'team_b' && !(parsedB > parsedA)) ||
          (predictionWinnerKey === 'draw' && parsedA !== parsedB)
        ) {
          setNotice(t('messages.predictionScoreMismatch'));
          return null;
        }
        payload.answer_text = `${predictionContext.teamA} ${parsedA} - ${parsedB} ${predictionContext.teamB}`;
        payload.prediction_scores = { team_a: parsedA, team_b: parsedB };
        payload.prediction_winner = predictionWinnerKey;
        provided = true;
      }
    }

    if (predictionWinnerKey && !payload.prediction_winner) {
      payload.prediction_winner = predictionWinnerKey;
    }

    if (selectedTask && ['CHECKIN', 'REFERRAL'].includes(selectedTask.kind)) {
      provided = provided || !!trimmedAnswer;
      if (!trimmedAnswer) {
        payload.answer_text = selectedTask.kind;
        provided = true;
      }
    }

    if (!provided) {
      setNotice(t('messages.infoRequired'));
      return null;
    }

    return payload;
  }

  async function submitPayload(payload: Record<string, any>) {
    setBusy(true);
    try {
      const response = await enterContest(contestId, payload);
      if (response?.error) {
        if (response.error === 'unauthorized' || response.error === 'AUTH_REQUIRED') {
          redirectToSignIn();
          return;
        }
        setNotice(resolveEntryError(response));
        return;
      }
      resetForm();
      onSubmitted?.();
    } catch (error: any) {
      setNotice(t('messages.submitError'));
    } finally {
      setBusy(false);
      setPendingPayload(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || busy || uploadingAsset) return;
    const payload = buildPayload();
    if (!payload) return;
    setPendingPayload(payload);
    setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    if (!pendingPayload || disabled || busy || uploadingAsset) return;
    setConfirmOpen(false);
    await submitPayload(pendingPayload);
  }

  const disableForm = disabled || busy || uploadingAsset;
  const uploadStatusLabel = assetUrl
    ? t('upload.attached')
    : uploadingAsset
    ? t('upload.uploading')
    : selectedTask?.kind === 'UPLOAD_VIDEO'
    ? t('upload.ctaVideo')
    : t('upload.ctaImage');
  const uploadHint = assetPreviewName
    ? assetPreviewName
    : uploadingAsset
    ? t('upload.wait')
    : selectedTask?.kind === 'UPLOAD_VIDEO'
    ? t('upload.formatsVideo')
    : t('upload.formatsImage');

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('title')}</h2>
        {disabled && (
          <span className="inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-muted">
            {disabledReason || t('closedBadge')}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {taskOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted" htmlFor="entry-task">
              {t('task.label')}
            </label>
            <select
              id="entry-task"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
              value={selectedTaskId ?? ''}
              onChange={(event) => setSelectedTaskId(event.target.value || null)}
              disabled={disableForm}
            >
              {taskOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title || task.kind}
                </option>
              ))}
            </select>
            {selectedTask?.description && (
              <p className="text-xs text-muted">{selectedTask.description}</p>
            )}
          </div>
        )}

        {showTextArea && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted" htmlFor="entry-answer">
              {t('text.label')}
            </label>
            <textarea
              id="entry-answer"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
              placeholder={t('text.placeholder')}
              rows={4}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={disableForm}
            />
            <p className="text-xs text-muted">
              {t('text.helper')}
            </p>
          </div>
        )}

        {showMcq && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted">{t('mcq.label')}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mcqOptionList.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    selectedOption === option.id
                      ? 'border-primary bg-primary-weak text-text'
                      : 'border-border bg-white hover:border-primary'
                  }`}
                >
                  <input
                    type="radio"
                    name="mcq-option"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => setSelectedOption(option.id)}
                    disabled={disableForm}
                    className="h-4 w-4 accent-primary-hover"
                  />
                  <span>
                    <span className="mr-2 text-xs uppercase tracking-wide text-muted">
                      {(option.position ?? '') && `${option.position}.`}
                    </span>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {showPredictionScores && predictionContext && (
          <div className="space-y-3 rounded-3xl border border-primary bg-primary-weak/60 p-4">
            <div className="text-sm font-semibold text-text">{t('prediction.title')}</div>
            <p className="text-xs text-primary-hover">
              {predictionContext.requireScores
                ? t('prediction.requiredHint')
                : t('prediction.optionalHint')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-hover">
                  {t('prediction.teamScore', { team: predictionContext.teamA })}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-primary bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={predictionScores.teamA}
                  onChange={(event) =>
                    setPredictionScores((prev) => ({ ...prev, teamA: event.target.value }))
                  }
                  disabled={disableForm}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-hover">
                  {t('prediction.teamScore', { team: predictionContext.teamB })}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-primary bg-white px-4 py-3 text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  value={predictionScores.teamB}
                  onChange={(event) =>
                    setPredictionScores((prev) => ({ ...prev, teamB: event.target.value }))
                  }
                  disabled={disableForm}
                />
              </label>
            </div>
          </div>
        )}

        {showUpload && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-muted">{t('upload.label')}</div>
                <p className="text-xs text-muted">{t('upload.helper')}</p>
              </div>
              {assetUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setAssetUrl(null);
                    setAssetPreviewName(null);
                  }}
                  className="text-xs font-medium text-danger hover:text-danger"
                  disabled={disableForm}
                >
                  {t('upload.remove')}
                </button>
              )}
            </div>
            <label
              className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                assetUrl
                  ? 'border-success bg-success-weak text-[#4D8A1F]'
                  : 'border-border bg-bg text-muted hover:border-primary hover:bg-primary-weak/60'
              } ${disableForm ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                type="file"
                accept={uploadAccept}
                className="hidden"
                onChange={(event) => handleFileSelect(event.target.files)}
                disabled={disableForm}
              />
              <div className="text-sm font-semibold">
                {uploadStatusLabel}
              </div>
              <div className="mt-2 text-xs">
                {uploadHint}
              </div>
            </label>
            {uploadError && <div className="text-xs text-danger">{uploadError}</div>}
          </div>
        )}

        {showQr && (
          <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted" htmlFor="entry-code">
              {t('qr.label')}
            </label>
                <input
                  id="entry-code"
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-weak transition"
                  placeholder={t('qr.placeholder')}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={disableForm}
                />
          </div>
          <button
            type="button"
            className="rv-btn mt-2 w-full sm:ml-4 sm:w-auto"
            onClick={() => setScannerEnabled((prev) => !prev)}
            disabled={disabled || busy}
          >
            {scannerEnabled && (scannerStatus === 'starting' || scannerStatus === 'active')
              ? t('qr.stop')
              : t('qr.scan')}
          </button>
        </div>
        {scannerEnabled && (
          <div className="space-y-2 rounded-2xl border border-primary bg-primary-weak/70 p-4 text-xs text-primary-hover">
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-xl border border-primary bg-black/40 object-cover"
              muted
              autoPlay
              playsInline
            />
            {!scannerReady && (
              <div className="text-[11px] font-medium text-primary-hover">{t('qr.initializing')}</div>
            )}
            <div>{t('qr.instruction')}</div>
          </div>
        )}
        {scannerStatus === 'error' && scannerError && (
          <div className="rounded-2xl border border-danger bg-[rgba(214,76,76,0.08)] p-3 text-xs text-danger">
            {scannerError}
          </div>
        )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={disableForm}
            className={`inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              disableForm
                ? 'bg-muted cursor-not-allowed'
                : 'bg-primary-hover hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg shadow-[0_10px_30px_rgba(26,35,50,0.06)]'
            }`}
          >
            {busy ? t('buttons.submitting') : t('buttons.submit')}
          </button>
          <div className="text-xs text-muted">
            {selectedTask
              ? t('info.taskLabel', { task: formatTaskKind(selectedTask.kind) })
              : isRiddleContest
              ? t('info.singleAnswer')
              : t('info.multiEntry')}
          </div>
        </div>

      {message && (
        <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              messageVariant === 'success'
                ? 'border-success bg-success-weak text-[#4D8A1F]'
                : 'border-accent bg-accent-weak text-accent-hover'
            }`}
          >
            {message}
          </div>
        )}
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="text-lg font-semibold text-text">
              {t('confirm.title')}
            </div>
            <p className="mt-2 text-sm text-muted">
              {t('confirm.description')}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rv-btn px-5 py-2.5"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingPayload(null);
                }}
                disabled={busy}
              >
                {t('confirm.cancel')}
              </button>
              <button
                type="button"
                className="rv-btn-primary px-5 py-2.5"
                onClick={handleConfirmSubmit}
                disabled={busy}
              >
                {busy ? t('buttons.submitting') : t('confirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
