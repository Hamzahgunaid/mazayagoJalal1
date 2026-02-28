'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import StatusOverview from '@/components/contests/status/StatusOverview';
import StatusProgressTeam from '@/components/contests/status/ProgressTeam';
import JudgesPanel from '@/components/contests/status/JudgesPanel';
import WinnersSelection from '@/components/contests/status/WinnersSelection';
import PrizeSummarySection from '@/components/contests/status/PrizeSummarySection';
import WinnerPrizeLinkingSection from '@/components/contests/status/WinnerPrizeLinkingSection';
import PredictionResultsPanel from '@/components/contests/status/PredictionResultsPanel';
import EntriesEvaluationPanel from '@/components/contests/status/EntriesEvaluationPanel';
import GradingSummarySection from '@/components/contests/status/GradingSummarySection';
import {
  buildJudgesInfo,
  buildTaskProgress,
  buildWinnerCandidates,
  countGalleryItems,
  buildStageHint,
  formatStatusLabel,
  formatWinnerSummary,
  toDisplayNumber,
  type CandidateCard,
  type ContestRecord,
  type ContestTaskRecord,
  type EntryApiItem,
  type WinnerCard,
  type WinnerRecord,
} from '@/components/contests/status/statusPage.helpers';
import { getContest, listWinners } from '@/lib/api_contests';

const ENTRY_FETCH_LIMIT = 50;

type SectionToggleId =
  | 'overview'
  | 'progress'
  | 'prediction-results'
  | 'answers'
  | 'winners'
  | 'grading'
  | 'judges';

const SECTION_ELEMENT_IDS: Record<SectionToggleId, string> = {
  overview: 'contest-section-overview',
  progress: 'contest-section-progress',
  'prediction-results': 'contest-section-prediction-results',
  answers: 'contest-section-answers',
  winners: 'contest-section-winners',
  grading: 'contest-section-grading',
  judges: 'contest-section-judges',
};

const SECTION_ORDER: SectionToggleId[] = [
  'overview',
  'progress',
  'prediction-results',
  'answers',
  'winners',
  'grading',
  'judges',
];

const isSectionToggleId = (value: string | null): value is SectionToggleId => {
  if (!value) return false;
  return SECTION_ORDER.includes(value as SectionToggleId);
};

type ContestRefereeRecord = NonNullable<ContestRecord['referees']>[number];

type ContestJudgeApiRecord = {
  user_id: string;
  role?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
};



const parseMetadata = (value: any) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
};

const isPredictionTask = (task: ContestTaskRecord) => {
  const meta = parseMetadata(task.metadata);
  return String(task.kind || '').toUpperCase() === 'PREDICTION' || meta.match_prediction === true;
};

const hasOfficialResult = (task: ContestTaskRecord) => {
  const meta = parseMetadata(task.metadata);
  const options = Array.isArray(task.options) ? task.options : [];
  return meta.result_recorded === true || options.some((option: any) => option?.is_correct === true);
};

export default function ContestStatusPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const t = useTranslations('OfferStatus');
  const sectionLabels = useMemo(
    () => ({
      overview: t('nav.overview'),
      progress: t('nav.progress'),
      'prediction-results': t('nav.predictionResults'),
      answers: t('nav.answers'),
      winners: t('nav.winners'),
      grading: t('nav.grading'),
      judges: t('nav.judges'),
    }),
    [t],
  );
  const statusLabelOverrides = useMemo(
    () => ({
      ACTIVE: t('statusLabels.active'),
      PAUSED: t('statusLabels.paused'),
      ENDED: t('statusLabels.ended'),
      DRAFT: t('statusLabels.draft'),
      CORRECT: t('statusLabels.correct'),
      VALIDATED: t('statusLabels.validated'),
      INCORRECT: t('statusLabels.incorrect'),
      PENDING: t('statusLabels.pending'),
      IN_REVIEW: t('statusLabels.inReview'),
      NEEDS_REVIEW: t('statusLabels.needsReview'),
      SUBMITTED: t('statusLabels.submitted'),
    }),
    [t],
  );

  const [contest, setContest] = useState<ContestRecord | null>(null);
  const [entries, setEntries] = useState<EntryApiItem[]>([]);
  const [tasks, setTasks] = useState<ContestTaskRecord[]>([]);
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [winnersCount, setWinnersCount] = useState(0);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [publishingWinners, setPublishingWinners] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<SectionToggleId | null>(null);
  const [showPinnedBar, setShowPinnedBar] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionToggleId | null>(null);
  const [queryInitialized, setQueryInitialized] = useState(false);
  const [pendingScrollSection, setPendingScrollSection] = useState<SectionToggleId | null>(null);
  const [pendingFocusAnchor, setPendingFocusAnchor] = useState<string | null>(null);
  const [contestJudges, setContestJudges] = useState<ContestRefereeRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [storedSeedReveal, setStoredSeedReveal] = useState<string | null>(null);
  const [storedExternalEntropy, setStoredExternalEntropy] = useState<string | null>(null);
  const [showPrizeSummary, setShowPrizeSummary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getContest(slug);
        const fetched: ContestRecord | null = data?.contest ?? (data?.id ? data : null);
        if (!fetched?.id) {
          throw new Error(t('page.notFound'));
        }

        const [entrySnapshot, tasksData, winnersData, judgesData] = await Promise.all([
          fetchEntriesSnapshot(slug).catch((err) => {
            console.warn('entries snapshot failed', err);
            return [] as EntryApiItem[];
          }),
          fetchContestTasks(slug).catch((err) => {
            console.warn('tasks fetch failed', err);
            return [] as ContestTaskRecord[];
          }),
          fetchContestWinners(slug, fetched.id, t('winners.fallbackName')).catch((err) => {
            console.warn('winners fetch failed', err);
            return [] as WinnerRecord[];
          }),
          fetchContestJudges(fetched.id).catch((err) => {
            console.warn('judges fetch failed', err);
            return [] as ContestRefereeRecord[];
          }),
        ]);

        if (cancelled) return;
        setContest(fetched);
        setEntries(entrySnapshot);
        setTasks(tasksData);
        setWinners(winnersData);
        setWinnersCount(winnersData.length);
        setContestJudges(judgesData);
      } catch (err: any) {
        if (!cancelled) {
          setContest(null);
          setEntries([]);
          setTasks([]);
          setWinners([]);
          setContestJudges([]);
          setWinnersCount(0);
          setError(err?.message || t('page.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, t]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) throw new Error('me');
        const json = await response.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUserId(json?.user?.id ?? null);
          setCurrentUserRoles(Array.isArray(json?.user?.roles) ? json.user.roles : []);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserId(null);
          setCurrentUserRoles([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (typeof window === 'undefined' || !contest?.id) return;
    setStoredSeedReveal(localStorage.getItem(`rv.seed_reveal.${contest.id}`));
    setStoredExternalEntropy(localStorage.getItem(`rv.external_entropy.${contest.id}`));
  }, [contest?.id]);

  useEffect(() => {
    if (queryInitialized) return;
    const sectionParam = searchParams?.get('section');
    if (isSectionToggleId(sectionParam)) {
      if (sectionParam === 'overview') {
        setFocusedSection(null);
      } else {
        setFocusedSection(sectionParam);
      }
      setPendingScrollSection(sectionParam);
    }
    setQueryInitialized(true);
  }, [queryInitialized, searchParams]);

  const overviewContest = useMemo(() => {
    if (!contest) return null;
    return {
      title: contest.title,
      slug: contest.slug || slug,
      statusLabel: formatStatusLabel(contest.status, {
        fallback: t('statusLabels.draft'),
        overrides: statusLabelOverrides,
      }),
      stageHint: buildStageHint(contest, {
        scheduleTbd: t('overview.stage.tbd'),
        range: (start, end) => t('overview.stage.range', { start, end }),
        opens: (date) => t('overview.stage.opens', { date }),
        closes: (date) => t('overview.stage.closes', { date }),
      }),
    };
  }, [contest, slug, statusLabelOverrides, t]);
  const overviewLinks = useMemo(() => {
    if (!contest?.slug) return [];
    return [
      { label: t('overview.links.qrBatches'), href: `/offers/${contest.slug}/codes` },
      { label: t('overview.links.winnersPage'), href: `/offers/${contest.slug}/winner` },
      { label: t('overview.links.auditLogs'), href: `/offers/${contest.slug}/status/audit` },
    ];
  }, [contest?.slug, t]);

  const tasksProgress = useMemo(
    () =>
      buildTaskProgress(tasks, {
        untitledTask: t('progress.task.untitled'),
        noDescription: t('progress.task.noDescription'),
        roundLabel: (code) => t('progress.task.roundLabel', { code }),
      }),
    [tasks, t],
  );
  const judgesInfo = useMemo(
    () =>
      buildJudgesInfo(contestJudges.length > 0 ? contestJudges : contest?.referees, {
        judgeLabel: (index) => t('progress.judgeFallback', { index }),
      }),
    [contestJudges, contest?.referees, t],
  );
  const winnersSummary = useMemo<WinnerCard[]>(
    () => winners.map((winner) => formatWinnerSummary(winner, t('winners.fallbackName'))),
    [winners, t],
  );
  const prizesInfo = useMemo(() => (Array.isArray(contest?.prizes) ? contest.prizes : []), [contest?.prizes]);
  const selectionMode = useMemo(() => String(contest?.selection || '').toUpperCase(), [contest?.selection]);
  const eligibleEntriesCount = useMemo(() => {
    const fromStats = contest?.entries_stats?.correct;
    const computed = entries.filter((entry) => {
      const status = String(entry.status || '').toUpperCase();
      return status === 'CORRECT' || status === 'VALIDATED';
    }).length;
    if (typeof fromStats === 'number') return Math.max(fromStats, computed);
    return computed;
  }, [contest?.entries_stats?.correct, entries]);
  const gradingPendingCount = useMemo(
    () => entries.filter((entry) => ['PENDING', 'IN_REVIEW', 'NEEDS_REVIEW', 'SUBMITTED'].includes(String(entry.status || '').toUpperCase())).length,
    [entries],
  );
  const gradingFinalizedCount = useMemo(
    () => entries.filter((entry) => ['CORRECT', 'VALIDATED', 'INCORRECT'].includes(String(entry.status || '').toUpperCase())).length,
    [entries],
  );


  const winnerCandidates = useMemo<CandidateCard[]>(
    () =>
      buildWinnerCandidates(entries, winnersSummary, {
        roundLabel: (code) => t('entries.roundLabel', { code }),
        entryTitleFallback: t('entries.fallbackTitle'),
        participantFallback: t('entries.participantFallback'),
        userLabel: (suffix) => t('entries.userLabel', { suffix }),
        justNow: t('entries.justNow'),
      }),
    [entries, winnersSummary, t],
  );
  const predictionMode = useMemo(() => {
    const rawRules = contest?.rules_json;
    if (!rawRules) return '';
    if (typeof rawRules === 'string') {
      try {
        const parsed = JSON.parse(rawRules);
        return String(parsed?.prediction_mode || '').toUpperCase();
      } catch {
        return '';
      }
    }
    if (typeof rawRules === 'object') {
      return String((rawRules as any)?.prediction_mode || '').toUpperCase();
    }
    return '';
  }, [contest?.rules_json]);
  const isTournamentPrediction = useMemo(() => {
    const contestType = String(contest?.type || '').toUpperCase();
    return contestType === 'PREDICTION' && predictionMode === 'TOURNAMENT';
  }, [contest?.type, predictionMode]);
  const showOverview = true;
  const showProgress = focusedSection === 'progress';
  const showPredictionResults = focusedSection === 'prediction-results' && isTournamentPrediction;
  const showAnswers = focusedSection === 'answers';
  const showWinners = focusedSection === 'winners';
  const showGrading = focusedSection === 'grading';
  const showJudges = focusedSection === 'judges';
  const visibleSections = useMemo<SectionToggleId[]>(() => {
    if (!focusedSection) {
      return ['overview'];
    }
    const focusedVisible =
      focusedSection === 'prediction-results' ? showPredictionResults : focusedSection !== 'overview';
    return focusedVisible ? ['overview', focusedSection] : ['overview'];
  }, [focusedSection, showPredictionResults]);
  const navPillClass = (active: boolean) =>
    [
      'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-weak',
      active
        ? 'border-secondary bg-secondary text-white shadow-sm'
        : 'border-border bg-white text-muted hover:border-border',
    ].join(' ');
  const overviewNote = t('overview.note');

  const handleFocusSection = useCallback((sectionId: SectionToggleId, anchorId?: string) => {
    setFocusedSection(sectionId);
    setPendingScrollSection(sectionId);
    setPendingFocusAnchor(anchorId ?? null);
  }, []);
  const handleScrollToSection = useCallback((sectionId: SectionToggleId) => {
    if (typeof window === 'undefined') return;
    const elementId = SECTION_ELEMENT_IDS[sectionId];
    if (!elementId) return;
    const target = document.getElementById(elementId);
    if (!target) return;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
  }, []);
  const handleScrollToEntriesSection = useCallback(() => {
    setShowPrizeSummary(false);
    handleFocusSection('answers');
  }, [handleFocusSection]);

  const handleOpenManageGallery = useCallback(() => {
    if (typeof window === 'undefined' || !contest?.slug) return;
    setShowPrizeSummary(false);
    window.location.assign(`/offers/${contest.slug}/manage?tab=media`);
  }, [contest?.slug]);

  const handleScrollToPrizesOverview = useCallback(() => {
    setShowPrizeSummary(true);
    handleFocusSection('overview', 'contest-prizes-overview');
  }, [handleFocusSection]);

  const handleScrollToJudges = useCallback(() => {
    setShowPrizeSummary(false);
    handleFocusSection('judges', 'contest-judges-panel');
  }, [handleFocusSection]);

  const handleRefreshPredictionData = useCallback(async () => {
    try {
      const [contestData, tasksData, entrySnapshot] = await Promise.all([
        getContest(slug),
        fetchContestTasks(slug),
        fetchEntriesSnapshot(slug),
      ]);
      const refreshedContest: ContestRecord | null =
        contestData?.contest ?? (contestData?.id ? contestData : null);
      if (refreshedContest?.id) {
        setContest(refreshedContest);
      }
      setTasks(tasksData);
      setEntries(entrySnapshot);
    } catch (err) {
      console.warn('prediction refresh failed', err);
    }
  }, [slug]);

  useEffect(() => {
    if (focusedSection && focusedSection !== 'overview') {
      setShowPrizeSummary(false);
    }
  }, [focusedSection]);

  const overviewMetrics = useMemo(() => {
    if (!contest) return [];
    const stats = contest.entries_stats || {};
    const prizesCount = Array.isArray(contest.prizes) ? contest.prizes.length : 0;
    const entriesTotal = stats.total ?? entries.length;
    const pendingCount = stats.pending ?? 0;
    const galleryCount = countGalleryItems(contest);
    const hasTasks = tasks.length > 0;
    const judgeCount = contestJudges.length
      ? contestJudges.length
      : Array.isArray(contest.referees)
        ? contest.referees.length
        : 0;
    const hasJudges = judgeCount > 0;
    const roundsCount = hasTasks
      ? tasks.reduce((set, task) => {
          if (task.round_id && typeof task.round_id === 'string' && task.round_id.trim()) {
            set.add(task.round_id);
          }
          return set;
        }, new Set<string>()).size
      : 0;

    const metricsList = [
      {
        label: t('metrics.prizesConfigured'),
        value: toDisplayNumber(prizesCount),
        helper:
          typeof contest.max_winners === 'number'
            ? t('metrics.helpers.prizesMax', { count: contest.max_winners })
            : t('metrics.helpers.prizesNoLimit'),
        onClick: handleScrollToPrizesOverview,
      },
      {
        label: t('metrics.publishedWinners'),
        value: toDisplayNumber(winnersCount),
        helper: winnersCount ? t('metrics.helpers.winnersLive') : t('metrics.helpers.winnersPending'),
        onClick: () => {
          setShowPrizeSummary(false);
          handleFocusSection('winners');
        },
      },
      {
        label: t('metrics.entriesSubmitted'),
        value: toDisplayNumber(entriesTotal),
        helper: t('metrics.helpers.entriesPending', { count: pendingCount }),
        onClick: handleScrollToEntriesSection,
      },
      {
        label: t('metrics.galleryItems'),
        value: toDisplayNumber(galleryCount),
        helper: galleryCount ? t('metrics.helpers.gallerySynced') : t('metrics.helpers.galleryEmpty'),
        onClick: handleOpenManageGallery,
      },
    ];
    metricsList.push({
      label: t('metrics.gradingReview'),
      value: t('metrics.values.gradingCounts', {
        pending: toDisplayNumber(gradingPendingCount),
        finalized: toDisplayNumber(gradingFinalizedCount),
      }),
      helper: t('metrics.helpers.gradingSummary', { total: toDisplayNumber(entriesTotal) }),
      onClick: () => {
        setShowPrizeSummary(false);
        handleFocusSection('grading');
      },
    });
    if (isTournamentPrediction) {
      metricsList.push({
        label: t('metrics.predictionResults'),
        value: toDisplayNumber(tasks.length),
        helper: tasks.length ? t('metrics.helpers.predictionReady') : t('metrics.helpers.predictionEmpty'),
        onClick: () => {
          setShowPrizeSummary(false);
          handleFocusSection('prediction-results');
        },
      });
    }
    if (hasTasks) {
      metricsList.push({
        label: t('metrics.roundsTasks'),
        value: t('metrics.values.roundsTasks', {
          rounds: toDisplayNumber(roundsCount || 0),
          tasks: toDisplayNumber(tasks.length),
        }),
        helper: roundsCount ? t('metrics.helpers.roundsMapped') : t('metrics.helpers.roundsUnassigned'),
        onClick: () => {
          setShowPrizeSummary(false);
          handleFocusSection('progress');
        },
      });
    }
    if (hasJudges) {
      metricsList.push({
        label: t('metrics.judgingPanel'),
        value: t('metrics.values.judgesCount', { count: toDisplayNumber(judgeCount) }),
        helper: t('metrics.helpers.judgesReview'),
        onClick: handleScrollToJudges,
      });
    }
  return metricsList;
  }, [
    contest,
    entries,
    winnersCount,
    tasks,
    contestJudges,
    isTournamentPrediction,
    gradingPendingCount,
    gradingFinalizedCount,
    handleScrollToEntriesSection,
    handleScrollToPrizesOverview,
    handleScrollToJudges,
    handleFocusSection,
    handleOpenManageGallery,
    t,
  ]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!contest) {
      setShowPinnedBar(false);
      return;
    }
    const handleScroll = () => {
      setShowPinnedBar(window.scrollY > 320);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [contest]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!contest) {
      setActiveSection(null);
      return;
    }
    if (visibleSections.length === 0) {
      setActiveSection(null);
      return;
    }
    setActiveSection((current) =>
      current && visibleSections.includes(current) ? current : visibleSections[0] ?? null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!intersecting) return;
        const matched = Object.entries(SECTION_ELEMENT_IDS).find(
          ([sectionId, elementId]) => elementId === intersecting.target.id,
        );
        if (matched) {
          setActiveSection(matched[0] as SectionToggleId);
        }
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0.1, 0.3, 0.6] },
    );
    const elements = visibleSections
      .map((sectionId) => document.getElementById(SECTION_ELEMENT_IDS[sectionId]))
      .filter((el): el is HTMLElement => Boolean(el));
    elements.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
    };
  }, [contest, visibleSections]);

  useEffect(() => {
    if (!pendingScrollSection) return;
    if (!contest) return;
    if (!visibleSections.includes(pendingScrollSection)) return;
    const anchorId = pendingFocusAnchor;
    const sectionId = pendingScrollSection;
    const scrollTarget = () => {
      if (typeof window === 'undefined') return;
      if (anchorId) {
        const target = document.getElementById(anchorId);
        if (target) {
          const targetTop = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
          return;
        }
      }
      handleScrollToSection(sectionId);
    };
    requestAnimationFrame(scrollTarget);
    setActiveSection(sectionId);
    setPendingScrollSection(null);
    setPendingFocusAnchor(null);
  }, [contest, pendingScrollSection, visibleSections, handleScrollToSection, pendingFocusAnchor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!queryInitialized) return;
    const url = new URL(window.location.href);
    let modified = false;
    if (url.searchParams.has('view')) {
      url.searchParams.delete('view');
      modified = true;
    }
    const sectionValue = activeSection ?? null;
    if (sectionValue) {
      if (url.searchParams.get('section') !== sectionValue) {
        url.searchParams.set('section', sectionValue);
        modified = true;
      }
    } else if (url.searchParams.has('section')) {
      url.searchParams.delete('section');
      modified = true;
    }
    if (modified) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeSection, queryInitialized]);


  const refreshWinners = useCallback(async () => {
    if (!contest?.id) return;
    const refreshed = await fetchContestWinners(slug, contest.id, t('winners.fallbackName')).catch(() => [] as WinnerRecord[]);
    setWinners(refreshed);
    setWinnersCount(refreshed.length);
  }, [contest?.id, slug, t]);

  const handleEnsureSeedCommit = useCallback(async (seedCommit: string) => {
    if (!contest?.id) return false;
    setDrawError(null);
    try {
      const response = await fetch(`/api/owner/contests/${contest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ seed_commit: seedCommit }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403) throw new Error(t('errors.forbidden'));
        throw new Error(json?.error || t('winners.drawError'));
      }
      setContest((prev) => (prev ? { ...prev, seed_commit: seedCommit } : prev));
      return true;
    } catch (err: any) {
      setDrawError(err?.message || t('winners.drawError'));
      return false;
    }
  }, [contest?.id, t]);

  const handlePublishWinners = useCallback(async (seedReveal: string, externalEntropy: string | null) => {
    if (!contest?.id) return;
    if (!seedReveal.trim()) {
      setDrawError(t('errors.seedRevealRequired'));
      return;
    }
    setDrawError(null);
    setPublishNotice(null);
    setPublishingWinners(true);
    try {
      const defaultTake =
        typeof contest.max_winners === 'number' && contest.max_winners > 0 ? contest.max_winners : 1;
      const take = selectionMode === 'EVERY_CODE' ? Math.max(eligibleEntriesCount, 0) : defaultTake;
      const response = await fetch(`/api/owner/contests/${contest.id}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ seed_reveal: seedReveal, external_entropy: externalEntropy ?? null, take }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403) throw new Error(t('errors.forbidden'));
        const msg = String(json?.error || '');
        if (msg.includes('Seed reveal does not match seed commit')) throw new Error(t('errors.seedMismatch'));
        throw new Error(json?.error || t('winners.drawError'));
      }
      if (selectionMode === 'EVERY_CODE') {
        if (prizesInfo.length === 1 && prizesInfo[0]?.id) {
          const bulkResponse = await fetch(`/api/owner/contests/${contest.id}/winners/assign-prize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ prizeId: prizesInfo[0].id, onlyUnassigned: true }),
          });
          if (bulkResponse.ok) setPublishNotice(t('prizes.autoAssignedSuccess'));
        } else if (prizesInfo.length > 1) {
          setPublishNotice(t('prizes.bulkAssignHintMultiplePrizes'));
        }
      }

      const [refreshed, contestData] = await Promise.all([
        fetchContestWinners(slug, contest.id, t('winners.fallbackName')).catch(() => [] as WinnerRecord[]),
        getContest(slug).catch(() => null),
      ]);
      const refreshedContest: ContestRecord | null = (contestData as any)?.contest ?? ((contestData as any)?.id ? (contestData as any) : null);
      if (refreshedContest) setContest(refreshedContest);
      setWinners(refreshed);
      setWinnersCount(refreshed.length);
          } catch (err: any) {
      setDrawError(err?.message || t('winners.drawError'));
      throw err;
    } finally {
      setPublishingWinners(false);
    }
  }, [contest?.id, contest?.max_winners, eligibleEntriesCount, prizesInfo, selectionMode, slug, t]);

  const hasPublishedWinners = Boolean(contest?.has_published_winners ?? contest?.winners_published ?? winnersCount > 0);
  const publicProof = contest?.public_proof as Record<string, any> | null | undefined;
  const seedCommit = publicProof?.seed_commit ?? contest?.seed_commit ?? null;
  const seedReveal = hasPublishedWinners ? publicProof?.seed_reveal ?? null : null;
  const externalEntropy = publicProof?.external_entropy ?? null;
  const predictionPublishBlocked = isTournamentPrediction && tasks.some((task) => isPredictionTask(task) && !hasOfficialResult(task));

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-text site-gradient">
      {contest && showPinnedBar && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-4xl rounded-3xl border border-border bg-white p-4 shadow backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
              <div className="font-semibold text-text">{contest.title}</div>
              <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wide text-muted">
                <span>
                  {t('page.pinned.status')}:{' '}
                  <span className="text-text">
                    {overviewContest?.statusLabel || t('statusLabels.draft')}
                  </span>
                </span>
                <span>
                  {t('page.pinned.winners')}:{' '}
                  <span className="text-text">{toDisplayNumber(winnersCount)}</span>
                </span>
                <span>
                  {t('page.pinned.entries')}:{' '}
                  <span className="text-text">
                    {toDisplayNumber(contest.entries_stats?.total ?? entries.length)}
                  </span>
                </span>
              </div>
            </div>
            {visibleSections.length > 0 && (
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="toolbar"
                aria-label={t('page.pinnedNavLabel')}
              >
                {visibleSections.map((sectionId) => (
                  <button
                    key={`pinned-${sectionId}`}
                    type="button"
                    className={navPillClass(activeSection === sectionId)}
                    onClick={() => handleScrollToSection(sectionId)}
                    aria-pressed={activeSection === sectionId}
                  >
                    {sectionLabels[sectionId]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-10">
        {loading && (
          <div className="rounded-3xl border border-border bg-white p-6 text-sm text-muted shadow-sm">
            {t('page.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-danger bg-[rgba(214,76,76,0.08)] p-6 text-sm font-medium text-danger shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && !contest && (
          <div className="rounded-3xl border border-border bg-white p-6 text-sm text-muted shadow-sm">
            {t('page.notFound')}
          </div>
        )}

        {contest && overviewContest && showOverview && (
          <section id={SECTION_ELEMENT_IDS.overview} className="space-y-4">
            <StatusOverview
              contest={overviewContest}
              metrics={overviewMetrics}
              note={overviewNote}
              quickLinks={overviewLinks}
            />
            {showPrizeSummary && (
              <PrizeSummarySection slug={contest.slug} prizes={prizesInfo} maxWinners={contest.max_winners ?? null} />
            )}
          </section>
        )}

        {contest && showProgress && (
          <section id={SECTION_ELEMENT_IDS.progress}>
            <StatusProgressTeam
              slug={contest.slug}
              tasks={tasksProgress}
            />
          </section>
        )}
        {contest && showJudges && (
          <section id={SECTION_ELEMENT_IDS.judges}>
            <JudgesPanel slug={contest.slug} judges={judgesInfo} />
          </section>
        )}
        {contest && showPredictionResults && (
          <section id={SECTION_ELEMENT_IDS['prediction-results']}>
            <PredictionResultsPanel
              contestId={contest.id}
              tasks={tasks}
              onRefresh={handleRefreshPredictionData}
            />
          </section>
        )}
        {contest && showAnswers && (
          <section id={SECTION_ELEMENT_IDS.answers}>
            <EntriesEvaluationPanel entries={entries} tasks={tasks} />
          </section>
        )}
        {contest && showWinners && (
          <section id={SECTION_ELEMENT_IDS.winners}>
            <WinnersSelection
              contestId={contest.id}
              contestStatus={contest.status ?? null}
              entriesTotal={contest.entries_stats?.total ?? entries.length}
              candidates={winnerCandidates}
              winners={winnersSummary}
              selectionMode={selectionMode}
              eligibleCount={eligibleEntriesCount}
              onEnsureSeedCommit={handleEnsureSeedCommit}
              onPublishWinners={handlePublishWinners}
              publishingWinners={publishingWinners}
              drawError={drawError}
              maxWinners={contest.max_winners ?? null}
              isLocked={hasPublishedWinners}
              seedCommit={seedCommit}
              seedReveal={seedReveal}
              externalEntropy={externalEntropy}
              proofUrl={`/api/contests/${contest.id}/proof`}
              predictionPublishBlocked={predictionPublishBlocked}
              publishNotice={publishNotice}
              prizeLinkingSection={
                <WinnerPrizeLinkingSection
                  contestId={contest.id}
                  hasPublishedWinners={hasPublishedWinners}
                  prizes={prizesInfo.map((prize: any) => ({ id: prize.id || '', title: prize.name || prize.title || '' })).filter((prize: any) => prize.id)}
                  winners={winners.map((winner: any) => ({
                    id: winner.id,
                    entry_id: winner.entry_id || undefined,
                    code: null,
                    user_display: winner.user_display_name || null,
                    prize_id: winner.prize_id || null,
                    published_at: winner.published_at || null,
                  }))}
                  onRefreshWinners={refreshWinners}
                />
              }
            />
          </section>
        )}

        {contest && showGrading && (
          <section id={SECTION_ELEMENT_IDS.grading}>
            <GradingSummarySection
              slug={contest.slug}
              entries={entries}
              tasks={tasks}
            />
          </section>
        )}

      </div>
    </main>
  );
}

async function fetchEntriesSnapshot(slug: string): Promise<EntryApiItem[]> {
  const response = await fetch(
    `/api/contests/by-slug/${encodeURIComponent(slug)}/entries?limit=${ENTRY_FETCH_LIMIT}`,
    { cache: 'no-store' },
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || 'Unable to load entries.');
  }
  return Array.isArray(json?.items) ? (json.items as EntryApiItem[]) : [];
}

async function fetchContestTasks(slug: string): Promise<ContestTaskRecord[]> {
  const response = await fetch(`/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`, {
    cache: 'no-store',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || 'Unable to load tasks.');
  }
  return Array.isArray(json?.items) ? (json.items as ContestTaskRecord[]) : [];
}

async function fetchContestWinners(
  slug: string,
  contestId: string,
  fallbackName = 'Winner',
): Promise<WinnerRecord[]> {
  try {
    const response = await fetch(`/api/public/contests/by-slug/${encodeURIComponent(slug)}/winners`, {
      cache: 'no-store',
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(json?.winners)) {
      return (json.winners as WinnerRecord[]).map((winner) => normalizeWinnerRecord(winner, fallbackName));
    }
  } catch (error) {
    console.warn('public winners fetch failed', error);
  }

  try {
    const fallback = await listWinners(contestId);
    if (Array.isArray(fallback)) {
      return fallback.map((winner) => normalizeWinnerRecord(winner, fallbackName));
    }
    if (Array.isArray((fallback as any)?.items)) {
      return (fallback as any).items.map((winner: WinnerRecord) => normalizeWinnerRecord(winner, fallbackName));
    }
  } catch (error) {
    console.warn('fallback winners fetch failed', error);
  }

  return [];
}

async function fetchContestJudges(contestId: string): Promise<ContestRefereeRecord[]> {
  const response = await fetch(`/api/owner/contests/${contestId}/referees`, {
    cache: 'no-store',
    credentials: 'include',
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || 'Unable to load judges.');
  }
  const items = Array.isArray(json?.items) ? (json.items as ContestJudgeApiRecord[]) : [];
  return items.map((item, index) => ({
    user_id: item.user_id || `judge-${index}`,
    role: item.role,
    full_name: item.full_name || null,
    display_name: item.display_name || null,
    user: {
      full_name: item.full_name || null,
      display_name: item.display_name || null,
      name: item.full_name || item.display_name || null,
    },
  }));
}

function normalizeWinnerRecord(raw: any, fallbackName = 'Winner'): WinnerRecord {
  const makeId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `winner-${Math.random().toString(36).slice(2, 9)}`;
  if (!raw || typeof raw !== 'object') {
    return {
      id: makeId(),
      user_display_name: fallbackName,
    };
  }
  return {
    id: raw.id || raw.entry_id || makeId(),
    entry_id: raw.entry_id || null,
    prize_id: raw.prize_id || raw.prize?.id || null,
    user_display_name: raw.identity_name || raw.user_display_name || raw.user?.display_name || raw.user?.full_name || fallbackName,
    prize_name: raw.prize_name || raw.prize?.name || null,
    published_at: raw.published_at || raw.decided_at || null,
    user_avatar_url: raw.user_avatar_url || raw.user?.avatar_url || null,
  };
}
