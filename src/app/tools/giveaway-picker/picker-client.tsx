"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectAndGetManagedPages,
  FB_SCOPE_MINIMAL_PAGES,
  type FacebookManagedPage,
} from "@/lib/meta/facebookSdkClient";
import { r2Upload } from "@/lib/upload-client";
import LiveDrawStage from "./live-draw-stage";

type AnyObj = Record<string, any>;

type DrawMode = "RANDOM_ALL" | "RANDOM_CORRECT";
type AnswerMatch = "EXACT" | "CONTAINS" | "NORMALIZED_EXACT";
type VideoFormat = "V_9_16" | "S_1_1" | "H_16_9";
type PickerTab = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

const INSTAGRAM_COMMENTS_SYNC_ENABLED = false;

function normalizeApiError(errorValue: unknown): string {
  if (!errorValue) return "Request failed";
  if (typeof errorValue === "string") return errorValue;
  if (errorValue instanceof Error) return errorValue.message;
  if (typeof errorValue === "object") {
    const errObj = errorValue as AnyObj;
    if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message;
    if (typeof errObj.error === "string" && errObj.error.trim()) return errObj.error;
    if (Array.isArray(errObj.formErrors) && errObj.formErrors.length) return String(errObj.formErrors[0]);
    if (errObj.fieldErrors && typeof errObj.fieldErrors === "object") {
      const firstFieldError = Object.values(errObj.fieldErrors).find((v) => Array.isArray(v) && v.length);
      if (Array.isArray(firstFieldError) && firstFieldError.length) return String(firstFieldError[0]);
    }
    try {
      return JSON.stringify(errorValue);
    } catch {
      return "Request failed";
    }
  }
  return String(errorValue);
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(normalizeApiError(json?.error || json));
  return json;
}


export default function GiveawayPickerClient() {
  const [tab, setTab] = useState<PickerTab>("FACEBOOK");
  const [drawId, setDrawId] = useState("");
  const [state, setState] = useState<AnyObj>({});
  const [connectedPages, setConnectedPages] = useState<any[]>([]);
  const [managedPages, setManagedPages] = useState<FacebookManagedPage[]>([]);
  const [selectedManagedPageId, setSelectedManagedPageId] = useState("");
  const [selectedSocialPageId, setSelectedSocialPageId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingContestImage, setUploadingContestImage] = useState(false);

  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const contestImageFileRef = useRef<HTMLInputElement | null>(null);
  const hydratedRef = useRef(false);

  const [title, setTitle] = useState("New Giveaway Draw");
  const [winnersCount, setWinnersCount] = useState(1);
  const [alternatesCount, setAlternatesCount] = useState(0);
  const [lockedAt, setLockedAt] = useState("");
  const [drawMode, setDrawMode] = useState<DrawMode>("RANDOM_ALL");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [answerMatch, setAnswerMatch] = useState<AnswerMatch>("NORMALIZED_EXACT");
  const [logoUrl, setLogoUrl] = useState("");
  const [contestImageUrl, setContestImageUrl] = useState("");
  const [showLogo, setShowLogo] = useState(false);
  const [showContestImage, setShowContestImage] = useState(false);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("V_9_16");
  const [ruleDedupOneEntryPerUser, setRuleDedupOneEntryPerUser] = useState(true);
  const [ruleExcludePageAdmins, setRuleExcludePageAdmins] = useState(false);
  const [ruleIncludeReplies, setRuleIncludeReplies] = useState(false);
  const [ruleRequiredKeyword, setRuleRequiredKeyword] = useState("");
  const [ruleBannedKeyword, setRuleBannedKeyword] = useState("");
  const [ruleRequireLikePage, setRuleRequireLikePage] = useState(false);
  const [ruleRequireLikePost, setRuleRequireLikePost] = useState(false);
  const [ruleRequireLikeComment, setRuleRequireLikeComment] = useState(false);
  const [ruleMinMentions, setRuleMinMentions] = useState(0);
  const [ruleRequiredHashtag, setRuleRequiredHashtag] = useState("");
  const [ruleRequiredMention, setRuleRequiredMention] = useState("");
  const [ruleBlockList, setRuleBlockList] = useState("");
  const [ruleUseMinMentions, setRuleUseMinMentions] = useState(false);
  const [ruleUseHashtag, setRuleUseHashtag] = useState(false);
  const [ruleUseMention, setRuleUseMention] = useState(false);
  const [ruleUseBlockList, setRuleUseBlockList] = useState(false);
  const [animationType, setAnimationType] = useState("ROULETTE");
  const [animationEnableSounds, setAnimationEnableSounds] = useState(true);
  const [animationDurationSec, setAnimationDurationSec] = useState(12);
  const [animationPickOneByOne, setAnimationPickOneByOne] = useState(true);
  const [mainColor, setMainColor] = useState("#6366f1");
  const [instagramPostUrl, setInstagramPostUrl] = useState("");
  const [instagramSourceMeta, setInstagramSourceMeta] = useState<AnyObj>({});
  const [instagramStep, setInstagramStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [facebookStep, setFacebookStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showInstagramSettings, setShowInstagramSettings] = useState(true);
  const [showPrizesModal, setShowPrizesModal] = useState(false);
  const [prizeDraft, setPrizeDraft] = useState("");
  const [instagramPrizes, setInstagramPrizes] = useState<string[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [facebookConfirmNotice, setFacebookConfirmNotice] = useState("");
  const [facebookSettingsCollapsed, setFacebookSettingsCollapsed] = useState(false);
  const [facebookReadyToStart, setFacebookReadyToStart] = useState(false);
  const [facebookShowAnimationStep, setFacebookShowAnimationStep] = useState(false);
  const [facebookShowPublishStep, setFacebookShowPublishStep] = useState(false);
  const [liveDrawSpinning, setLiveDrawSpinning] = useState(false);
  const [liveStagePhase, setLiveStagePhase] = useState<"IDLE" | "SPIN" | "REVEAL" | "CONFIRM" | "DONE">("IDLE");
  const [livePhaseProgress, setLivePhaseProgress] = useState(0);
  const [liveDrawDisplayName, setLiveDrawDisplayName] = useState("");
  const [liveDrawDisplayType, setLiveDrawDisplayType] = useState<"WINNER" | "ALTERNATE">("WINNER");
  const [liveDrawRevealed, setLiveDrawRevealed] = useState<any[]>([]);
  const [livePresentationMode, setLivePresentationMode] = useState(false);
  const [liveAnimationPreset, setLiveAnimationPreset] = useState<"ROULETTE" | "SLOT" | "CARD_FLIP">("ROULETTE");
  const [liveWheelAngle, setLiveWheelAngle] = useState(0);
  const [liveCountdown, setLiveCountdown] = useState<number | null>(null);
  const [liveAudit, setLiveAudit] = useState<{ seed: string; hash_before: string; hash_after: string } | null>(null);
  const [publishPipeline, setPublishPipeline] = useState<any>(null);
  const [publishManifest, setPublishManifest] = useState<any>(null);
  const [publishStatusLoading, setPublishStatusLoading] = useState(false);
  const [retryingRender, setRetryingRender] = useState(false);

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100";

  const frozen = ["FROZEN", "DRAWN", "PUBLISHED"].includes(state?.draw?.status);

  const syncSetupFromDraw = (draw?: AnyObj) => {
    if (!draw) return;
    hydratedRef.current = true;
    setTitle(String(draw.title || "New Giveaway Draw"));
    setWinnersCount(Number(draw.winners_count || 1));
    setAlternatesCount(Number(draw.alternates_count || 0));
    setLockedAt(draw.locked_at ? new Date(draw.locked_at).toISOString().slice(0, 16) : "");
    setDrawMode((draw.draw_mode || "RANDOM_ALL") as DrawMode);
    setCorrectAnswer(String(draw.correct_answer || ""));
    setAnswerMatch((draw.answer_match || "NORMALIZED_EXACT") as AnswerMatch);
    setLogoUrl(String(draw.logo_url || ""));
    setContestImageUrl(String(draw.contest_image_url || ""));
    setShowLogo(Boolean(draw.show_logo));
    setShowContestImage(Boolean(draw.show_contest_image));
    setVideoFormat((draw.video_format || "V_9_16") as VideoFormat);
    setAnimationType(String(draw.animation_type || "ROULETTE"));
    setAnimationEnableSounds(Boolean(draw.animation_enable_sounds ?? true));
    setAnimationDurationSec(Number(draw.animation_duration_sec || 12));
    setAnimationPickOneByOne(Boolean(draw.animation_pick_one_by_one ?? true));
    setMainColor(String(draw.main_color || "#6366f1"));
  };

  const syncRulesFromDraw = (rules?: AnyObj | null) => {
    setRuleDedupOneEntryPerUser(Boolean(rules?.dedup_one_entry_per_user ?? true));
    setRuleExcludePageAdmins(Boolean(rules?.exclude_page_admins ?? false));
    setRuleIncludeReplies(Boolean(rules?.include_replies ?? false));
    setRuleRequiredKeyword(String(rules?.required_keyword || ""));
    setRuleBannedKeyword(String(rules?.banned_keyword || ""));
    setRuleRequireLikePage(Boolean(rules?.require_like_page ?? false));
    setRuleRequireLikePost(Boolean(rules?.require_like_post ?? false));
    setRuleRequireLikeComment(Boolean(rules?.require_like_comment ?? false));
    setRuleMinMentions(Number(rules?.min_mentions || 0));
    setRuleRequiredHashtag(String(rules?.required_hashtag || ""));
    setRuleRequiredMention(String(rules?.required_mention || ""));
    setRuleBlockList(Array.isArray(rules?.block_list) ? rules.block_list.join("\n") : "");
    setRuleUseMinMentions(Number(rules?.min_mentions || 0) > 0);
    setRuleUseHashtag(Boolean(String(rules?.required_hashtag || "").trim()));
    setRuleUseMention(Boolean(String(rules?.required_mention || "").trim()));
    setRuleUseBlockList(Array.isArray(rules?.block_list) && rules.block_list.length > 0);
  };

  const loadConnectedPages = async () => {
    const result = await api("/api/tools/social-pages?provider=FACEBOOK");
    const rows = result.data || [];
    setConnectedPages(rows);
    return rows;
  };

  const loadDraw = async (id = drawId) => {
    if (!id) return;
    const res = await api(`/api/tools/giveaway-draws/${id}`);
    setState(res.data);
    setInstagramSourceMeta(res.data?.source || {});
    setInstagramPostUrl(String(res.data?.source?.post_url || ""));
    if (tab === "INSTAGRAM") setInstagramStep(res.data?.source?.post_url ? 2 : 1);
    if (tab === "FACEBOOK") {
      const hasSource = Boolean(res.data?.source?.fb_post_id);
      setFacebookStep(hasSource ? 5 : selectedSocialPageId ? 3 : connectedPages.length ? 2 : 1);
    }
    syncSetupFromDraw(res.data?.draw);
    syncRulesFromDraw(res.data?.rules);
    await loadPublishStatus(id);
  };

  const saveSourceIfPossible = async (socialPageId: string, postId: string, sourcePosts: any[], force = false, explicitDrawId?: string) => {
    if ((!drawId && !force && !explicitDrawId) || !socialPageId || !postId || frozen) return;
    const selectedPost = sourcePosts.find((item) => item.fb_post_id === postId);
    if (!selectedPost) return;
    const id = explicitDrawId || drawId;
    if (!id) return;
    await api(`/api/tools/giveaway-draws/${id}/facebook/source`, {
      method: "POST",
      body: JSON.stringify({ social_page_id: socialPageId, ...selectedPost }),
    });
    await loadDraw(id);
  };

  const ensureFacebookDraw = async () => {
    if (drawId) return drawId;
    const created = await api("/api/tools/giveaway-draws", {
      method: "POST",
      body: JSON.stringify({
        platform: "FACEBOOK",
        title,
        winners_count: winnersCount,
        alternates_count: alternatesCount,
        locked_at: lockedAt ? new Date(lockedAt).toISOString() : undefined,
      }),
    });
    const id = String(created?.data?.id || "");
    if (!id) throw new Error("Failed to create draw");
    setDrawId(id);
    return id;
  };

  const loadPostsForConnectedPage = async (socialPageId: string, autoPick = true) => {
    const result = await api(`/api/tools/facebook/pages/${socialPageId}/posts`);
    const loaded = result.data || [];
    setPosts(loaded);
    if (autoPick && loaded[0]?.fb_post_id) {
      const first = loaded[0].fb_post_id;
      setSelectedPostId(first);
      await saveSourceIfPossible(socialPageId, first, loaded);
    } else {
      setSelectedPostId("");
    }
    return loaded;
  };

  const importManagedPage = async (page: FacebookManagedPage) => {
    const importRes = await api("/api/tools/social-pages/import-facebook", {
      method: "POST",
      body: JSON.stringify({
        fb_page_id: page.id,
        fb_page_name: page.name,
        page_access_token: page.access_token,
      }),
    });

    const connectedRows = await loadConnectedPages();
    const connectedId = importRes?.data?.id || connectedRows.find((r: any) => r.fb_page_id === page.id)?.id;
    if (connectedId) {
      setSelectedSocialPageId(connectedId);
      await loadPostsForConnectedPage(connectedId, true);
    }
  };

  const connectWithFacebook = async () => {
    setPageLoading(true);
    setError("");
    try {
      const fbPages = await connectAndGetManagedPages(FB_SCOPE_MINIMAL_PAGES);
      setManagedPages(fbPages);
      if (!fbPages.length) {
        setError("No Facebook pages returned for this account.");
        return;
      }
      const first = fbPages[0];
      setSelectedManagedPageId(first.id);
      await importManagedPage(first);
      setFacebookStep(2);
    } catch (e: any) {
      setError(String(e?.message || "Failed to connect with Facebook"));
    } finally {
      setPageLoading(false);
    }
  };

  const persistDrawSetup = async () => {
    if (frozen) return;
    if (drawMode === "RANDOM_CORRECT" && !correctAnswer.trim()) return;

    const computedLockedAt = tab === "FACEBOOK" ? (lockedAt ? new Date(lockedAt).toISOString() : new Date().toISOString()) : null;

    const payload: AnyObj = {
      title,
      winners_count: winnersCount,
      alternates_count: alternatesCount,
      locked_at: tab === "INSTAGRAM" ? null : computedLockedAt,
      draw_mode: drawMode,
      correct_answer: drawMode === "RANDOM_CORRECT" ? correctAnswer.trim() : null,
      answer_match: answerMatch,
      logo_url: logoUrl || null,
      contest_image_url: contestImageUrl || null,
      show_logo: showLogo,
      show_contest_image: showContestImage,
      video_format: videoFormat,
      animation_type: animationType || null,
      animation_enable_sounds: animationEnableSounds,
      animation_duration_sec: animationDurationSec || null,
      animation_pick_one_by_one: animationPickOneByOne,
      main_color: mainColor || null,
    };

    let id = drawId;
    if (!id) {
      const created = await api("/api/tools/giveaway-draws", {
        method: "POST",
        body: JSON.stringify({
          platform: tab === "INSTAGRAM" ? "INSTAGRAM" : "FACEBOOK",
          title,
          winners_count: winnersCount,
          alternates_count: alternatesCount,
          locked_at: tab === "INSTAGRAM" ? undefined : computedLockedAt,
        }),
      });
      id = String(created?.data?.id || "");
      setDrawId(id);
    }

    if (!id) return;
    await api(`/api/tools/giveaway-draws/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    await loadDraw(id);

    if (tab === "FACEBOOK" && selectedSocialPageId && selectedPostId) {
      await saveSourceIfPossible(selectedSocialPageId, selectedPostId, posts, true);
    }
    if (tab === "INSTAGRAM" && instagramPostUrl.trim()) {
      await api(`/api/tools/giveaway-draws/${id}/instagram/source`, {
        method: "POST",
        body: JSON.stringify({ post_url: instagramPostUrl.trim(), ...instagramSourceMeta }),
      });
      await loadDraw(id);
      setInstagramStep(2);
    }
  };

  const persistRules = async () => {
    if (!drawId || frozen) return;

    setSavingRules(true);
    try {
      await api(`/api/tools/giveaway-draws/${drawId}/rules`, {
        method: "POST",
        body: JSON.stringify({
          dedup_one_entry_per_user: ruleDedupOneEntryPerUser,
          exclude_page_admins: ruleExcludePageAdmins,
          include_replies: ruleIncludeReplies,
          required_keyword: ruleRequiredKeyword.trim() ? ruleRequiredKeyword.trim() : null,
          banned_keyword: ruleBannedKeyword.trim() ? ruleBannedKeyword.trim() : null,
          require_like_page: ruleRequireLikePage,
          require_like_post: ruleRequireLikePost,
          require_like_comment: ruleRequireLikeComment,
          min_mentions: ruleUseMinMentions ? ruleMinMentions : 0,
          required_hashtag: ruleUseHashtag && ruleRequiredHashtag.trim() ? ruleRequiredHashtag.trim() : null,
          required_mention: ruleUseMention && ruleRequiredMention.trim() ? ruleRequiredMention.trim() : null,
          block_list: ruleUseBlockList ? ruleBlockList.split(/\r?\n/).map((v) => v.trim()).filter(Boolean) : [],
        }),
      });
      await loadDraw();
    } finally {
      setSavingRules(false);
    }
  };

  const runOfficialDrawWithAnimation = async () => {
    if (!drawId || liveDrawSpinning) return;

    const phaseByPreset = {
      ROULETTE: { intro: 2000, spin: 8000, reveal: 2000, confirm: 1000, tick: 90 },
      SLOT: { intro: 1800, spin: 10000, reveal: 1800, confirm: 900, tick: 75 },
      CARD_FLIP: { intro: 1600, spin: 7000, reveal: 2200, confirm: 1000, tick: 120 },
    } as const;

    const phase = phaseByPreset[liveAnimationPreset];
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const beep = (f = 740, d = 0.06) => {
      if (typeof window === "undefined") return;
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + d);
    };

    setBusy(true);
    setLiveDrawSpinning(true);
    setLiveDrawRevealed([]);
    setLiveAudit(null);
    setLiveWheelAngle(0);
    setLiveCountdown(3);

    try {
      const result = await api(`/api/tools/giveaway-draws/${drawId}/draw`, { method: "POST" });
      const payload = result?.data || {};
      const picked = Array.isArray(payload?.picked) ? payload.picked : Array.isArray(payload) ? payload : [];
      const audit = payload?.audit || null;
      if (audit?.seed) setLiveAudit(audit);

      if (!picked.length) {
        await loadDraw();
        return;
      }

      setLiveDrawDisplayType("WINNER");
      setLiveDrawDisplayName("Preparing live stage...");
      for (let count = 3; count >= 1; count -= 1) {
        setLiveCountdown(count);
        beep(520 + count * 90, 0.1);
        await wait(1000);
      }
      setLiveCountdown(null);
      beep(980, 0.12);
      await wait(Math.max(600, phase.intro - 1000));

      for (let i = 0; i < picked.length; i += 1) {
        const selected = picked[i];
        const selectedType = i < winnersCount ? "WINNER" : "ALTERNATE";
        const start = Date.now();

        setLiveStagePhase("SPIN");
        while (Date.now() - start < phase.spin) {
          const random = picked[Math.floor(Math.random() * picked.length)];
          const elapsed = Date.now() - start;
          setLiveDrawDisplayName(String(random?.display_name || "Participant"));
          setLiveDrawDisplayType(selectedType);
          setLiveWheelAngle((prev) => prev + 24 + Math.random() * 22);
          beep(680 + ((i % 5) * 60), 0.03);
          await wait(phase.tick);
        }

        setLiveStagePhase("REVEAL");
        setLivePhaseProgress(78);
        setLiveDrawDisplayName(String(selected?.display_name || "Participant"));
        setLiveDrawDisplayType(selectedType);
        beep(selectedType === "WINNER" ? 980 : 840, 0.12);
        await wait(phase.reveal);

        setLiveStagePhase("CONFIRM");
        setLivePhaseProgress(92);
        setLiveDrawRevealed((prev) => [...prev, { ...selected, winner_type: selectedType, rank: i + 1, revealed_at: new Date().toISOString() }]);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(selectedType === "WINNER" ? [60, 40, 120] : [50]);
        await wait(phase.confirm);
      }

      setLiveStagePhase("DONE");
      setLivePhaseProgress(100);
      await loadDraw();
    } finally {
      setLiveCountdown(null);
      setLiveDrawSpinning(false);
      setBusy(false);
    }
  };

  const loadPublishStatus = async (id = drawId) => {
    if (!id) return;
    setPublishStatusLoading(true);
    try {
      const res = await api(`/api/tools/giveaway-draws/${id}/publish/status`);
      setPublishPipeline(res?.data?.render_status || null);
      setPublishManifest(res?.data?.manifest || null);
    } catch {
      setPublishPipeline(null);
      setPublishManifest(null);
    } finally {
      setPublishStatusLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "FACEBOOK") return;
    if (selectedSocialPageId) return;

    let canceled = false;

    const hydrateFacebookFromStoredPages = async () => {
      try {
        const rows = await loadConnectedPages();
        if (canceled) return;

        if (!rows.length) {
          setFacebookStep(1);
          return;
        }

        const sourcePageId = String(state?.source?.social_page_id || "");
        const preferred = rows.find((r: any) => r.id === sourcePageId) || rows[0];
        if (!preferred?.id) return;

        setSelectedSocialPageId(preferred.id);
        setSelectedManagedPageId(String(preferred.fb_page_id || ""));

        const loaded = await loadPostsForConnectedPage(preferred.id, false);
        if (canceled) return;

        const sourcePostId = String(state?.source?.fb_post_id || "");
        if (sourcePostId && loaded.some((p: any) => String(p.fb_post_id) === sourcePostId)) {
          setSelectedPostId(sourcePostId);
          setFacebookStep(4);
          return;
        }

        setFacebookStep(loaded.length ? 3 : 2);
      } catch (e: any) {
        if (canceled) return;
        setError(normalizeApiError(e?.message || e));
      }
    };

    void hydrateFacebookFromStoredPages();

    return () => {
      canceled = true;
    };
  }, [tab, selectedSocialPageId, state?.source?.social_page_id, state?.source?.fb_post_id]);

  useEffect(() => {
    if (tab === "TIKTOK") return;
    if (frozen) return;
    if (tab === "FACEBOOK" && (!selectedSocialPageId || !selectedPostId)) return;
    if (tab === "FACEBOOK" && facebookStep > 4) return;
    if (tab === "INSTAGRAM" && !instagramPostUrl.trim()) return;

    if (hydratedRef.current) {
      hydratedRef.current = false;
      return;
    }

    const t = setTimeout(() => {
      void persistDrawSetup();
    }, 700);
    return () => clearTimeout(t);
  }, [
    title,
    winnersCount,
    alternatesCount,
    lockedAt,
    drawMode,
    correctAnswer,
    answerMatch,
    logoUrl,
    contestImageUrl,
    showLogo,
    showContestImage,
    videoFormat,
    selectedSocialPageId,
    selectedPostId,
    facebookStep,
    tab,
    frozen,
    instagramPostUrl,
    animationType,
    animationEnableSounds,
    animationDurationSec,
    animationPickOneByOne,
    mainColor,
  ]);

  useEffect(() => {
    if (!drawId) return;
    const st = String(publishPipeline?.status || "");
    if (!["queued", "rendering", "uploaded"].includes(st)) return;
    const t = setInterval(() => {
      void loadPublishStatus(drawId);
      void loadDraw(drawId);
    }, 5000);
    return () => clearInterval(t);
  }, [drawId, publishPipeline?.status]);

  useEffect(() => {
    if (tab !== "FACEBOOK" || !facebookShowPublishStep || !drawId) return;
    void loadPublishStatus(drawId);
    void loadDraw(drawId);
  }, [tab, facebookShowPublishStep, drawId]);

  const selectedConnectedPage = connectedPages.find((p) => p.id === selectedSocialPageId) || null;
  const selectedFacebookPost = posts.find((p) => p.fb_post_id === selectedPostId) || null;
  const selectedFacebookPostComments = Number(
    selectedFacebookPost?.comments_count ??
    selectedFacebookPost?.commentsCount ??
    selectedFacebookPost?.comment_count ??
    selectedFacebookPost?.comments ??
    selectedFacebookPost?.total_comments ??
    selectedFacebookPost?.comments_total ??
    state?.source?.comments_count ??
    state?.source?.comment_count ??
    0,
  );
  const selectedFacebookPostPreview =
    String(
      selectedFacebookPost?.picture_url ||
      selectedFacebookPost?.image_url ||
      selectedFacebookPost?.thumbnail_url ||
      selectedFacebookPost?.media_url ||
      "",
    ).trim() || null;
  const summary = state?.summary || null;
  const summaryTotal = Number(summary?.total_comments_in_window ?? summary?.total ?? 0);
  const summaryUniqueUsers = Number(summary?.unique_users_count ?? summary?.unique_users ?? 0);
  const summaryEligible = Number(summary?.eligible_count ?? summary?.eligible ?? 0);
  const summaryExcluded = Number(summary?.excluded_count ?? summary?.excluded ?? 0);
  const summaryFetchedAt = summary?.fetched_at ? new Date(summary.fetched_at).toLocaleString() : "-";
  const summaryLatestCommentAt = summary?.latest_comment_at_in_window ? new Date(summary.latest_comment_at_in_window).toLocaleString() : "-";
  const summaryBreakdown = summary?.exclusion_breakdown || summary?.breakdown || {};
  const participants = Array.isArray(state?.participants) ? state.participants : [];
  const showFacebookAdvanced = tab !== "FACEBOOK" || facebookStep > 4;
  const freezeStatus = String(state?.draw?.status || "-");
  const freezeCode = String(state?.draw?.draw_code || "-");
  const freezeLockedAt = state?.draw?.locked_at ? new Date(state.draw.locked_at).toLocaleString() : "Not set";
  const freezeSourceReady = tab === "INSTAGRAM" ? Boolean(state?.source?.post_url) : Boolean(state?.source?.fb_post_id);
  const freezeCanRun = Boolean(drawId && state?.draw?.locked_at && freezeSourceReady);
  const winners = Array.isArray(state?.winners) ? state.winners : [];
  const revealedWinnerCards = (liveDrawRevealed.length ? liveDrawRevealed : winners).filter((w: any) => String(w?.winner_type || "WINNER") === "WINNER");
  const getWinnerAvatar = (winner: any) => String(
    winner?.avatar_url || winner?.profile_picture_url || winner?.picture_url || winner?.photo_url || "",
  ).trim();
  const liveReelPool = useMemo(() => {
    const fromWinners = winners.map((w: any) => String(w?.display_name || "")).filter(Boolean);
    const fromLive = liveDrawRevealed.map((w: any) => String(w?.display_name || "")).filter(Boolean);
    const merged = [...fromWinners, ...fromLive];
    if (liveDrawDisplayName) merged.unshift(liveDrawDisplayName);
    const fallback = ["Player A", "Player B", "Player C", "Player D", "Player E", "Player F"];
    return (merged.length ? merged : fallback).slice(0, 12);
  }, [winners, liveDrawRevealed, liveDrawDisplayName]);
  const liveWheelNames = liveReelPool.slice(0, 8);
  const publicSlug = String(state?.draw?.public_view_slug || "");
  const publishVideoUrl = String(state?.assets?.video_url || "");
  const publishAt = state?.assets?.published_at ? new Date(state.assets.published_at).toLocaleString() : "-";
  const publishStorage = publishVideoUrl.includes("r2") ? "Cloudflare R2" : "External storage";
  const publishBaseFolder = publishVideoUrl ? publishVideoUrl.replace(/\/video\.mp4$/, "") : "";
  const pipelineStatus = String(publishPipeline?.status || "packaged");
  const pipelineStages = ["packaged", "queued", "rendering", "uploaded", "published"];
  const pipelineIndex = Math.max(0, pipelineStages.indexOf(pipelineStatus));
  const pipelinePct = Math.round(((pipelineIndex + 1) / pipelineStages.length) * 100);
  const pipelineEta = publishPipeline?.eta_seconds ? `${publishPipeline.eta_seconds}s` : "-";
  const certificateUrl = publicSlug ? `/tools/giveaway-picker/r/${publicSlug}` : "";
  const publishedVideoUrl = String(state?.assets?.video_url || publishManifest?.assets?.video_output || "");
  const authorName = String(selectedConnectedPage?.name || state?.source?.fb_page_name || instagramSourceMeta?.ig_username || state?.source?.ig_username || "-");
  const sourcePostLink = String(selectedFacebookPost?.permalink_url || selectedFacebookPost?.url || state?.source?.post_url || instagramPostUrl || (state?.source?.fb_post_id ? `https://facebook.com/${state.source.fb_post_id}` : ""));
  const topWinnerName = String((winners.find((w: any) => String(w?.winner_type || "WINNER") === "WINNER")?.display_name) || (revealedWinnerCards[0]?.display_name) || "Winner");
  const storyImageDownloadUrl = useMemo(() => {
    const name = topWinnerName.replace(/[&<>"']/g, "");
    const dateText = new Date().toISOString().slice(0, 10);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${mainColor}'/><stop offset='100%' stop-color='#7c3aed'/></linearGradient></defs>
      <rect width='1080' height='1920' fill='url(#g)'/>
      <circle cx='540' cy='820' r='210' fill='rgba(255,255,255,0.2)'/>
      <circle cx='540' cy='820' r='185' fill='white'/>
      <text x='540' y='500' text-anchor='middle' fill='white' font-size='62' font-family='Arial' font-weight='700'>Giveaway Winner</text>
      <text x='540' y='880' text-anchor='middle' fill='#111827' font-size='72' font-family='Arial' font-weight='800'>🏆</text>
      <text x='540' y='1160' text-anchor='middle' fill='white' font-size='70' font-family='Arial' font-weight='700'>${name}</text>
      <text x='540' y='1260' text-anchor='middle' fill='rgba(255,255,255,0.85)' font-size='40' font-family='Arial'>${dateText}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [topWinnerName, mainColor]);

  const uploadLogo = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingLogo(true);
    try {
      const [url] = await r2Upload(files);
      if (url) setLogoUrl(url);
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const uploadContestImage = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingContestImage(true);
    try {
      const [url] = await r2Upload(files);
      if (url) setContestImageUrl(url);
    } finally {
      setUploadingContestImage(false);
      if (contestImageFileRef.current) contestImageFileRef.current.value = "";
    }
  };

  const fetchInstagramPostMeta = async (postUrl: string) => {
    const res = await api("/api/external-contest-posts/fetch", {
      method: "POST",
      body: JSON.stringify({ url: postUrl }),
    });

    const rawAccountName = String(res?.account_name || "").trim();
    const accountNameLooksLikeCaption = /\bon instagram\b/i.test(rawAccountName) || rawAccountName.length > 80 || rawAccountName.includes("\n");
    const safeAccountName = !accountNameLooksLikeCaption && rawAccountName ? rawAccountName.slice(0, 255) : null;
    const rawCaption = String(res?.text || "").trim();
    const safeCaptionSnippet = rawCaption ? rawCaption.slice(0, 500) : null;

    const nextMeta: AnyObj = {
      post_url: postUrl,
      ig_username: safeAccountName,
      media_cover_url: String(res?.suggested_cover_url || "").trim() || null,
      caption_snippet: safeCaptionSnippet,
    };

    setInstagramSourceMeta((prev) => ({ ...prev, ...nextMeta }));
    return nextMeta;
  };

  return (
    <main className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Giveaway Picker</h1>
      <div className="flex gap-2">
        {(["FACEBOOK", "INSTAGRAM", "TIKTOK"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 border ${tab === t ? "bg-black text-white" : ""}`}>
            {t === "FACEBOOK" ? "Facebook" : t === "INSTAGRAM" ? "Instagram" : `${t} (Coming soon)`}
          </button>
        ))}
      </div>

{tab !== "INSTAGRAM" ? null : (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-600 via-pink-600 to-violet-600 p-4 sm:p-6 shadow-[0_20px_80px_-30px_rgba(168,85,247,0.9)] space-y-4">
            <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />

            {instagramStep === 1 ? (
              <section className="relative rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-3 text-white">
                <h2 className="text-lg font-semibold">Post URL</h2>
                <div className="flex gap-2">
                  <input className="w-full rounded-xl border border-white/50 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="https://www.instagram.com/p/..." value={instagramPostUrl} onChange={(e) => setInstagramPostUrl(e.target.value)} disabled={frozen} />
                  <button
                    className="rounded-xl px-4 py-3 text-sm font-semibold bg-fuchsia-500 text-white shadow-sm hover:bg-fuchsia-400 disabled:opacity-60"
                    disabled={!instagramPostUrl.trim() || frozen || busy}
                    onClick={async () => {
                      setError("");
                      setBusy(true);
                      try {
                        await fetchInstagramPostMeta(instagramPostUrl.trim());
                        await persistDrawSetup();
                        setInstagramStep(2);
                      } catch (e: any) {
                        setError(String(e?.message || "Failed to load Instagram post"));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Loading..." : "Next →"}
                  </button>
                </div>
                {error ? <p className="text-xs text-rose-100">{error}</p> : null}
              </section>
            ) : null}

            {instagramStep >= 2 ? (
              <section className="relative rounded-2xl border border-white/30 bg-white/95 p-4 sm:p-5 space-y-3 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">Post Card</h2>
                <div className="rounded-2xl border border-fuchsia-100 bg-gradient-to-b from-white to-fuchsia-50 p-3 space-y-3 text-sm text-slate-700">
                  {instagramSourceMeta?.media_cover_url ? <img src={instagramSourceMeta.media_cover_url} alt="Preview" className="h-44 w-full object-cover rounded-xl" /> : <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-500">Preview not available</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2"><span className="font-medium">Username/Account:</span> {String(instagramSourceMeta?.ig_username || state?.source?.ig_username || "-")}</div>
                    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2"><span className="font-medium">Comments count:</span> {String(instagramSourceMeta?.comments_count ?? state?.source?.comments_count ?? "-")}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-xl px-4 py-2 text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-60" disabled={!drawId || !instagramPostUrl.trim() || busy} onClick={async () => {
                    setError("");
                    setBusy(true);
                    try {
                      const latestMeta = await fetchInstagramPostMeta(instagramPostUrl.trim());
                      await api(`/api/tools/giveaway-draws/${drawId}/instagram/source`, { method: "POST", body: JSON.stringify({ post_url: instagramPostUrl.trim(), ...latestMeta }) });
                      if (INSTAGRAM_COMMENTS_SYNC_ENABLED) {
                        await api(`/api/tools/giveaway-draws/${drawId}/instagram/sync`, { method: "POST" });
                        await loadDraw();
                        setInstagramStep(3);
                      } else {
                        await loadDraw();
                        setInstagramStep(3);
                        setError("تم حفظ المنشور. جلب تعليقات انستغرام غير مدعوم حالياً، لذلك أكمل الإعدادات ثم السحب بدون التعليقات.");
                      }
                    } catch (e: any) {
                      const message = normalizeApiError(e?.message || e);
                      const syncUnavailable = message.toLowerCase().includes("not implemented") || message.includes("ليس متاح") || message.toLowerCase().includes("instagram comments fetcher");
                      if (syncUnavailable) {
                        await loadDraw();
                        setInstagramStep(3);
                        setError("تم حفظ المنشور، لكن جلب تعليقات انستغرام غير متاح حالياً في النظام. يمكنك متابعة الإعدادات الآن.");
                      } else {
                        setError(message || "Failed to load comments");
                      }
                    } finally { setBusy(false); }
                  }}>{busy ? "Loading..." : INSTAGRAM_COMMENTS_SYNC_ENABLED ? "Load Comments" : "Save & Continue"}</button>
                  <button className="rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setInstagramStep(1)}>Back</button>
                </div>
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
              </section>
            ) : null}

            {instagramStep >= 3 ? (
              <section className="relative rounded-2xl border border-white/30 bg-white/95 p-4 sm:p-5 space-y-3 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">Settings</h2>

                {showInstagramSettings ? (
                  <div className="space-y-4">
                    <label className="space-y-1 block"><span className="text-xs font-medium text-slate-600">Title</span><input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} disabled={frozen} /></label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="space-y-1 block"><span className="text-xs font-medium text-slate-600"># Winners</span><input className={fieldClass} type="number" min={1} value={winnersCount} onChange={(e) => setWinnersCount(Number(e.target.value || 1))} disabled={frozen} /></label>
                      <label className="space-y-1 block"><span className="text-xs font-medium text-slate-600"># Substitutes</span><input className={fieldClass} type="number" min={0} value={alternatesCount} onChange={(e) => setAlternatesCount(Number(e.target.value || 0))} disabled={frozen} /></label>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                      <div className="text-sm font-medium text-slate-800">Prizes</div>
                      <button className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-fuchsia-300 text-fuchsia-700 bg-white hover:bg-fuchsia-50" onClick={() => setShowPrizesModal(true)}>Define</button>
                      {instagramPrizes.length ? <ul className="text-xs list-disc pl-5 text-slate-700">{instagramPrizes.map((p, i) => <li key={`${p}-${i}`}>{p}</li>)}</ul> : null}
                    </div>

                    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"><span>Exclude Duplicates</span><input type="checkbox" checked={ruleDedupOneEntryPerUser} onChange={(e) => setRuleDedupOneEntryPerUser(e.target.checked)} disabled={frozen} /></label>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <label className="flex items-center justify-between text-sm"><span>Min of Mentions</span><input type="checkbox" checked={ruleUseMinMentions} onChange={(e) => setRuleUseMinMentions(e.target.checked)} disabled={frozen} /></label>
                      {ruleUseMinMentions ? <input className={fieldClass} type="number" min={0} value={ruleMinMentions} onChange={(e) => setRuleMinMentions(Number(e.target.value || 0))} disabled={frozen} /> : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <label className="flex items-center justify-between text-sm"><span>Filter by #Hashtag</span><input type="checkbox" checked={ruleUseHashtag} onChange={(e) => setRuleUseHashtag(e.target.checked)} disabled={frozen} /></label>
                      {ruleUseHashtag ? <input className={fieldClass} value={ruleRequiredHashtag} onChange={(e) => setRuleRequiredHashtag(e.target.value)} placeholder="#hashtag" disabled={frozen} /> : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <label className="flex items-center justify-between text-sm"><span>Filter by @Mention</span><input type="checkbox" checked={ruleUseMention} onChange={(e) => setRuleUseMention(e.target.checked)} disabled={frozen} /></label>
                      {ruleUseMention ? <input className={fieldClass} value={ruleRequiredMention} onChange={(e) => setRuleRequiredMention(e.target.value)} placeholder="@profile" disabled={frozen} /> : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <label className="flex items-center justify-between text-sm"><span>Block List</span><input type="checkbox" checked={ruleUseBlockList} onChange={(e) => setRuleUseBlockList(e.target.checked)} disabled={frozen} /></label>
                      {ruleUseBlockList ? <textarea className={fieldClass} value={ruleBlockList} onChange={(e) => setRuleBlockList(e.target.value)} placeholder="one username/id per line" disabled={frozen} /> : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                      <div className="text-sm font-medium">Winner Animation</div>
                      <label className="space-y-1 block"><span className="text-xs">Animation</span>
                        <select className={fieldClass} value={animationType} onChange={(e) => setAnimationType(e.target.value)} disabled={frozen}>
                          <option value="COUNTDOWN">Countdown</option>
                          <option value="SPINNING_NAMES">Spinning Names</option>
                          <option value="ROULETTE">Roulette</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between text-sm"><span>Enable Sounds</span><input type="checkbox" checked={animationEnableSounds} onChange={(e) => setAnimationEnableSounds(e.target.checked)} disabled={frozen} /></label>
                      <label className="space-y-1 block"><span className="text-xs">Duration (sec.)</span><input className={fieldClass} type="number" min={1} max={600} value={animationDurationSec} onChange={(e) => setAnimationDurationSec(Number(e.target.value || 12))} disabled={frozen} /></label>
                      <label className="flex items-center justify-between text-sm"><span>Pick one by one</span><input type="checkbox" checked={animationPickOneByOne} onChange={(e) => setAnimationPickOneByOne(e.target.checked)} disabled={frozen} /></label>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                      <div className="text-sm font-medium">Brand Identity</div>
                      <div className="flex gap-2">
                        <button className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white" disabled={frozen} onClick={() => logoFileRef.current?.click()}>Upload logo</button>
                        <button className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white" disabled={frozen || !logoUrl} onClick={() => setLogoUrl("")}>Delete logo</button>
                      </div>
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="h-20 object-contain" /> : null}
                      <label className="space-y-1 block"><span className="text-xs">Main color</span><input className={fieldClass} value={mainColor} onChange={(e) => setMainColor(e.target.value)} disabled={frozen} /></label>
                    </div>

                    <div className="flex gap-2">
                      <button className="rounded-xl px-4 py-2 text-sm font-semibold border border-slate-300 bg-white text-slate-700" disabled={!drawId || frozen || savingRules} onClick={() => void persistRules()}>{savingRules ? "Saving..." : "Save rules"}</button>
                      <button className="rounded-xl px-4 py-2 text-sm font-semibold bg-lime-500 text-white hover:bg-lime-400 disabled:opacity-60" disabled={frozen} onClick={async () => {
                        await persistDrawSetup();
                        await persistRules();
                        setShowInstagramSettings(false);
                        setInstagramStep(4);
                      }}>Confirm</button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Settings confirmed.</div>
                )}
              </section>
            ) : null}

            {instagramStep >= 4 ? (
              <section className="relative rounded-2xl border border-white/30 bg-white/95 p-4 sm:p-5 space-y-3 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">Participants + Start</h2>
                <button className="rounded-xl px-4 py-2 text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-60" disabled={!drawId || busy || !INSTAGRAM_COMMENTS_SYNC_ENABLED} onClick={async () => {
                  if (!INSTAGRAM_COMMENTS_SYNC_ENABLED) {
                    setError("جلب تعليقات انستغرام غير مدعوم حالياً في النظام.");
                    return;
                  }
                  setBusy(true);
                  try { await api(`/api/tools/giveaway-draws/${drawId}/instagram/sync`, { method: "POST" }); await loadDraw(); } finally { setBusy(false); }
                }}>{busy ? "Loading..." : INSTAGRAM_COMMENTS_SYNC_ENABLED ? "Load comments" : "Sync unavailable"}</button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-slate-500">Total</div><div className="text-lg font-semibold text-slate-900">{summaryTotal}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-slate-500">Unique</div><div className="text-lg font-semibold text-slate-900">{summaryUniqueUsers}</div></div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="text-emerald-700">Eligible</div><div className="text-lg font-semibold text-emerald-700">{summaryEligible}</div></div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><div className="text-rose-700">Excluded</div><div className="text-lg font-semibold text-rose-700">{summaryExcluded}</div></div>
                </div>
                <button className="rounded-xl px-4 py-2 text-sm font-semibold bg-lime-500 text-white hover:bg-lime-400 disabled:opacity-60" disabled={!drawId} onClick={async () => {
                  const map: Record<string, "ROULETTE" | "SLOT" | "CARD_FLIP"> = {
                    COUNTDOWN: "CARD_FLIP",
                    SPINNING_NAMES: "SLOT",
                    ROULETTE: "ROULETTE",
                  };
                  setLiveAnimationPreset(map[animationType] || "ROULETTE");
                  await runOfficialDrawWithAnimation();
                  setInstagramStep(6);
                }}>Start</button>
              </section>
            ) : null}

            {instagramStep >= 6 ? (
              <section className="relative rounded-2xl border border-white/30 bg-white/95 p-4 sm:p-5 space-y-3 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">Results + Share</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-semibold mb-2 text-slate-700">Winners</div>
                    <ul className="space-y-1 text-xs">{winners.filter((w: any) => w.winner_type === "WINNER").map((w: any) => <li key={w.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">{w.rank}. {w.display_name || "-"}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-2 text-slate-700">Substitutes</div>
                    <ul className="space-y-1 text-xs">{winners.filter((w: any) => w.winner_type === "ALTERNATE").map((w: any) => <li key={w.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">{w.rank}. {w.display_name || "-"}</li>)}</ul>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button className="rounded-xl px-3 py-2 text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-500 disabled:opacity-60" disabled={!drawId}>Share as comment</button>
                  <button className="rounded-xl px-3 py-2 text-sm font-semibold border border-slate-300 bg-white text-slate-700" disabled={!drawId}>Download Story certificate (jpg)</button>
                  <button className="rounded-xl px-3 py-2 text-sm font-semibold border border-slate-300 bg-white text-slate-700" disabled={!drawId}>Download Story animation (mp4)</button>
                </div>
              </section>
            ) : null}

            {showPrizesModal ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-4 space-y-3 shadow-2xl">
                  <h3 className="font-semibold text-slate-900">Prizes</h3>
                  <input className={fieldClass} placeholder="Prize" value={prizeDraft} onChange={(e) => setPrizeDraft(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg px-3 py-2 text-sm border border-slate-300" onClick={() => setShowPrizesModal(false)}>Close</button>
                    <button className="rounded-lg px-3 py-2 text-sm font-semibold bg-lime-500 text-white" onClick={() => {
                      if (prizeDraft.trim()) setInstagramPrizes((prev) => [...prev, prizeDraft.trim()]);
                      setPrizeDraft("");
                      setShowPrizesModal(false);
                    }}>Save/Confirm</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

{tab !== "FACEBOOK" ? null : (
        <>
          <section className="overflow-hidden rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-white via-fuchsia-50 to-violet-100 shadow-xl shadow-fuchsia-100/60">
            <div className="border-b border-fuchsia-100/80 bg-white/70 px-4 py-4 backdrop-blur sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-500">Facebook Giveaway</p>
                  <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">Connect Facebook</h2>
                </div>
                
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {facebookStep >= 1 && facebookStep < 5 ? (<div className="rounded-2xl border border-fuchsia-100 bg-white p-3.5 shadow-sm">
                <div className="mb-2 text-sm font-semibold text-slate-800">Connect Facebook</div>
                <button className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60" onClick={connectWithFacebook} disabled={pageLoading}>
                  {pageLoading ? "Connecting..." : "Connect with Facebook"}
                </button>
                {selectedConnectedPage ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div>
                      <div className="text-[11px] text-slate-500">Connected page</div>
                      <div className="text-sm font-semibold text-slate-900">{selectedConnectedPage.fb_page_name}</div>
                    </div>
                    <button
                      className="rounded-lg border border-fuchsia-200 bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50"
                      onClick={async () => {
                        await api(`/api/tools/social-pages/${selectedConnectedPage.id}`, { method: "DELETE" });
                        setSelectedSocialPageId("");
                        setSelectedPostId("");
                        setPosts([]);
                        setManagedPages([]);
                        setSelectedManagedPageId("");
                        setFacebookStep(1);
                        await loadConnectedPages();
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : null}
              </div>) : null}

              {facebookStep >= 2 && facebookStep < 5 ? (
                <div className="rounded-2xl border border-fuchsia-100 bg-white p-3.5 shadow-sm">
                  <div className="mb-2 text-sm font-semibold text-slate-800">Pages</div>
                  {connectedPages.length ? (
                    <div className="space-y-2">
                      {connectedPages.map((p: any) => (
                        <button
                          key={p.id}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${selectedSocialPageId === p.id ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800" : "border-slate-200 bg-white text-slate-700 hover:border-fuchsia-200"}`}
                          onClick={async () => {
                            setSelectedSocialPageId(p.id);
                            setSelectedManagedPageId(String(p.fb_page_id || ""));
                            await loadPostsForConnectedPage(p.id, false);
                            setFacebookStep(3);
                          }}
                        >
                          <span className="font-medium">{String(p.fb_page_name || p.fb_page_id || "Page")}</span>
                          <span className="text-slate-400">›</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No connected pages found. Connect Facebook first.</p>
                  )}
                </div>
              ) : null}

              {facebookStep === 3 ? (
                <div className="rounded-2xl border border-fuchsia-100 bg-white p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">Most recent posts</div>
                    <div className="text-xs font-medium text-fuchsia-600">Most recent ▾</div>
                  </div>
                  {posts.length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {posts.map((p) => {
                        const imageUrl = String(p.picture_url || p.image_url || p.thumbnail_url || p.media_url || "").trim();
                        const commentsCount = Number(p.comments_count ?? p.commentsCount ?? p.comment_count ?? p.comments ?? p.total_comments ?? p.comments_total ?? 0);
                        return (
                          <button
                            key={p.fb_post_id}
                            className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${selectedPostId === p.fb_post_id ? "border-fuchsia-400 ring-2 ring-fuchsia-200" : "border-slate-200 hover:border-fuchsia-200"}`}
                            onClick={async () => {
                              setSelectedPostId(p.fb_post_id);
                              await saveSourceIfPossible(selectedSocialPageId, p.fb_post_id, posts);
                              setFacebookStep(4);
                            }}
                          >
                            {imageUrl ? <img src={imageUrl} alt="Post preview" className="h-32 w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="h-32 bg-slate-200" />}
                            <div className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-700">
                              <span className="truncate">{String(p.post_text_snippet || "Post")}</span>
                              <span className="rounded-full bg-black/85 px-2 py-0.5 text-[10px] font-semibold text-white">💬 {commentsCount}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No posts loaded for this page.</p>
                  )}
                </div>
              ) : null}

              {facebookStep >= 4 && selectedFacebookPost ? (
                <div className="rounded-2xl border border-fuchsia-100 bg-white p-3.5 shadow-sm">
                  <div className="mb-2 text-sm font-semibold text-slate-800">Post card</div>
                  {selectedFacebookPostPreview ? <img src={selectedFacebookPostPreview} alt="Selected post" className="h-56 w-full rounded-2xl object-cover" /> : <div className="h-36 rounded-2xl bg-slate-100" />}
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">💬 Comments</span>
                    <span className="rounded-full bg-fuchsia-600 px-3 py-1 font-semibold text-white">{selectedFacebookPostComments}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
                      disabled={!selectedSocialPageId || !selectedPostId || busy}
                      onClick={async () => {
                        setError("");
                        setBusy(true);
                        try {
                          const id = await ensureFacebookDraw();
                          await saveSourceIfPossible(selectedSocialPageId, selectedPostId, posts, true, id);
                          await api(`/api/tools/giveaway-draws/${id}/facebook/sync`, { method: "POST" });
                          await loadDraw(id);
                          setFacebookStep(5);
                          setTimeout(() => {
                            if (typeof document !== "undefined") {
                              document.getElementById("facebook-draw-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }, 30);
                        } catch (e: any) {
                          setError(normalizeApiError(e?.message || e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? "Loading..." : "Load comments"}
                    </button>
                    <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setFacebookStep(3)}>Back</button>
                  </div>
                </div>
              ) : null}

              {facebookStep > 4 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                  ✅ Comments synced successfully. Continue with Draw Setup settings below.
                </div>
              ) : null}

              {error ? <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>
          </section>

          {showFacebookAdvanced ? (
          <section id="facebook-draw-setup" className="space-y-3 rounded-3xl border border-fuchsia-200/80 bg-gradient-to-b from-fuchsia-700 to-pink-500 p-4 text-white shadow-xl sm:p-5">
            <h2 className="font-semibold text-white">Step 5 — Settings & Participants</h2>
            <label className="space-y-1 block">
              <span className="text-sm text-white">Title</span>
              <input className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-slate-900" placeholder="Giveaway title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={frozen} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block"><span className="text-sm"># Winners</span><input className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-slate-900" type="number" min={1} value={winnersCount} onChange={(e) => setWinnersCount(Number(e.target.value || 1))} disabled={frozen} /></label>
              <label className="space-y-1 block"><span className="text-sm"># Substitutes</span><input className="w-full rounded-xl border border-white/40 bg-white px-3 py-2 text-slate-900" type="number" min={0} value={alternatesCount} onChange={(e) => setAlternatesCount(Number(e.target.value || 0))} disabled={frozen} /></label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/25 py-2">
              <div className="text-xl">Prizes <span className="ml-2 rounded bg-white/80 px-1.5 py-0.5 text-xs text-fuchsia-700">New</span></div>
              <button className="rounded-full border border-white/60 px-5 py-2" onClick={() => setShowPrizesModal(true)}>Define</button>
            </div>

            <div className="space-y-3 text-lg">
              <label className="flex items-center justify-between"><span>Exclude Duplicates</span><input type="checkbox" checked={ruleDedupOneEntryPerUser} onChange={(e) => setRuleDedupOneEntryPerUser(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Min of Mentions</span><input type="checkbox" checked={ruleUseMinMentions} onChange={(e) => setRuleUseMinMentions(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Filter by #Hashtag</span><input type="checkbox" checked={ruleUseHashtag} onChange={(e) => setRuleUseHashtag(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Filter by @Mention</span><input type="checkbox" checked={ruleUseMention} onChange={(e) => setRuleUseMention(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Bonus & Extra Chances</span><input type="checkbox" checked={ruleRequireLikePost} onChange={(e) => setRuleRequireLikePost(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Block List</span><input type="checkbox" checked={ruleUseBlockList} onChange={(e) => setRuleUseBlockList(e.target.checked)} /></label>
            </div>

            <div className="pt-2 text-yellow-200 text-2xl font-semibold">✎ Winner Animation <span className="ml-2 rounded bg-white px-2 py-0.5 text-xs text-slate-700">New</span></div>
            <div className="border-t border-white/20 pt-3 space-y-3">
              <label className="flex items-center justify-between"><span className="text-xl">Animation</span>
                <select className="rounded-lg border border-white/40 bg-white px-3 py-1.5 text-fuchsia-700" value={animationType} onChange={(e) => setAnimationType(e.target.value)}>
                  <option value="ROULETTE">Countdown</option>
                  <option value="SLOT">Spinning Names</option>
                  <option value="CARD_FLIP">Wheel of Fortune</option>
                </select>
              </label>
              <label className="flex items-center justify-between"><span className="text-xl">Enable Sounds</span><input type="checkbox" checked={animationEnableSounds} onChange={(e) => setAnimationEnableSounds(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span className="text-xl">Duration (sec.)</span><input className="w-24 rounded-lg border border-white/40 bg-white px-3 py-1 text-center text-fuchsia-700" type="number" min={1} max={120} value={animationDurationSec} onChange={(e) => setAnimationDurationSec(Number(e.target.value || 10))} /></label>
            </div>

            <div className="pt-2 text-yellow-200 text-2xl font-semibold">🎨 Brand Identity</div>
            <div className="border-t border-white/20 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl">Logo</div>
                  <div className="text-sm text-fuchsia-100">Recommended size (180×50px)</div>
                </div>
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadLogo(e.target.files)} />
                <button className="rounded-full border border-white/60 px-5 py-2" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}>{uploadingLogo ? "Uploading..." : "Upload"}</button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl">Main Color</span>
                <input type="color" value={mainColor} onChange={(e) => setMainColor(e.target.value)} className="h-12 w-12 rounded-full border-2 border-white bg-transparent" />
              </div>
              <div className="flex flex-wrap gap-2">
                {['#7c2c8f','#dc2626','#fb7185','#a855f7','#4b2a63','#4f46e5','#4c1dff','#90a4ae','#fb923c','#16a34a','#65a30d','#ca8a04'].map((c) => (
                  <button key={c} className="h-10 w-10 rounded-xl border-2 border-white/80" style={{ backgroundColor: c }} onClick={() => setMainColor(c)} />
                ))}
              </div>
            </div>

            {facebookSettingsCollapsed ? null : (<button className="w-full rounded-xl bg-lime-500 px-4 py-3 text-2xl font-bold text-white hover:bg-lime-400 disabled:opacity-60" disabled={!drawId || frozen || savingRules || busy} onClick={async () => {
              setFacebookConfirmNotice("");
              setError("");
              try {
                await persistDrawSetup();
                await persistRules();
                if (drawId) {
                  await api(`/api/tools/giveaway-draws/${drawId}/facebook/sync`, { method: "POST" });
                  await api(`/api/tools/giveaway-draws/${drawId}/freeze`, { method: "POST" });
                  await loadDraw(drawId);
                }
                setFacebookSettingsCollapsed(true);
                setFacebookReadyToStart(true);
                setFacebookShowAnimationStep(false);
                setFacebookShowPublishStep(false);
                setFacebookConfirmNotice("تم حفظ الإعدادات والرولز بنجاح.");
              } catch (e: any) {
                setError(normalizeApiError(e?.message || e));
              }
            }}>
              Confirm
            </button>)}
            {facebookConfirmNotice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{facebookConfirmNotice}</p> : null}

            {facebookShowAnimationStep ? null : (
            <div className="rounded-2xl border border-fuchsia-200 bg-white p-3 space-y-3 shadow-lg">
              <h3 className="font-semibold text-fuchsia-700">Step 6 — Participants</h3>
            <p className="text-xs text-slate-600">Sync pulls comments from the selected post, applies current rules, then updates eligibility statistics.</p>
            <button className="border rounded px-2 py-1" disabled={!drawId || busy || (tab === "INSTAGRAM" && !INSTAGRAM_COMMENTS_SYNC_ENABLED)} onClick={async () => {
              if (tab === "INSTAGRAM" && !INSTAGRAM_COMMENTS_SYNC_ENABLED) {
                setError("جلب تعليقات انستغرام غير مدعوم حالياً في النظام.");
                return;
              }
              setBusy(true);
              try { await api(`/api/tools/giveaway-draws/${drawId}/facebook/sync`, { method: "POST" }); await loadDraw(); } finally { setBusy(false); }
            }}>{busy ? "Syncing..." : "Sync now"}</button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded border bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">Total comments in window</div>
                <div className="text-lg font-semibold">{summaryTotal}</div>
              </div>
              <div className="rounded border bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">Unique users</div>
                <div className="text-lg font-semibold">{summaryUniqueUsers}</div>
              </div>
              <div className="rounded border bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">Eligible entries</div>
                <div className="text-lg font-semibold text-emerald-700">{summaryEligible}</div>
              </div>
              <div className="rounded border bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500">Excluded entries</div>
                <div className="text-lg font-semibold text-rose-700">{summaryExcluded}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="rounded border bg-white p-2">
                <span className="font-medium">Last sync time:</span> {summaryFetchedAt}
              </div>
              <div className="rounded border bg-white p-2">
                <span className="font-medium">Latest comment in window:</span> {summaryLatestCommentAt}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-700">Exclusion breakdown</h3>
              {Object.keys(summaryBreakdown || {}).length ? (
                <ul className="space-y-1 text-xs">
                  {Object.entries(summaryBreakdown).map(([reason, count]) => (
                    <li key={reason} className="flex items-center justify-between rounded border bg-white px-2 py-1">
                      <span className="font-medium">{reason}</span>
                      <span>{String(count)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No exclusions yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-fuchsia-100 overflow-hidden">
              <div className="flex items-center justify-between bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-3 text-white">
                <div className="text-lg font-bold">Participants</div>
                <div className="text-sm">TOTAL {summaryTotal}</div>
              </div>
              {participants.length ? (
                <ul className="divide-y divide-slate-200 bg-white">
                  {participants.slice(0, 40).map((p: any, idx: number) => (
                    <li key={p.id || idx} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">{String(p.display_name || "Participant")}</span>
                      <span className="text-slate-500 text-xs truncate max-w-[50%]">{String(p.comment_text || "-")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-4 text-sm text-slate-500">No participants yet. Press Sync now.</div>
              )}
            </div>

            {facebookReadyToStart ? (
              <button
                className="w-full rounded-xl bg-lime-500 px-4 py-3 text-3xl font-bold text-white hover:bg-lime-400"
                onClick={() => {
                  const map: Record<string, "ROULETTE" | "SLOT" | "CARD_FLIP"> = {
                    COUNTDOWN: "CARD_FLIP",
                    SPINNING_NAMES: "SLOT",
                    ROULETTE: "ROULETTE",
                    SLOT: "SLOT",
                    CARD_FLIP: "CARD_FLIP",
                  };
                  setLiveAnimationPreset(map[animationType] || "ROULETTE");
                  setFacebookShowAnimationStep(true);
                  setFacebookReadyToStart(false);
                  setFacebookShowPublishStep(false);
                  setTimeout(() => {
                    if (typeof document !== "undefined") {
                      document.getElementById("facebook-live-draw-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                    void runOfficialDrawWithAnimation();
                  }, 30);
                }}
              >
                Start!
              </button>
            ) : null}

            <details>
              <summary className="cursor-pointer text-xs text-slate-600">Show raw summary JSON</summary>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(summary || {}, null, 2)}</pre>
            </details>
            </div>
            )}
          </section>
          ) : null}

          {tab === "FACEBOOK" ? null : (<section className="border rounded p-3 space-y-3">
            <h2 className="font-semibold">Freeze</h2>
            <p className="text-xs text-slate-600">Freeze locks the participants list before the official draw. It requires locked time and source post.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="rounded border bg-slate-50 p-2"><span className="font-medium">Status:</span> {freezeStatus}</div>
              <div className="rounded border bg-slate-50 p-2"><span className="font-medium">Draw code:</span> {freezeCode}</div>
              <div className="rounded border bg-slate-50 p-2"><span className="font-medium">Locked at:</span> {freezeLockedAt}</div>
              <div className="rounded border bg-slate-50 p-2"><span className="font-medium">Source post:</span> {freezeSourceReady ? "Selected" : "Not selected"}</div>
            </div>

            <div className="text-xs space-y-1">
              <p className={state?.draw?.locked_at ? "text-emerald-700" : "text-amber-700"}>{state?.draw?.locked_at ? "✓ Locked time is set." : "• Please set Locked at in Draw Setup."}</p>
              <p className={freezeSourceReady ? "text-emerald-700" : "text-amber-700"}>{freezeSourceReady ? "✓ Source post is selected." : "• Please select source post in Connect Page."}</p>
            </div>

            <button className="border rounded px-2 py-1" disabled={!freezeCanRun} onClick={async () => { await api(`/api/tools/giveaway-draws/${drawId}/freeze`, { method: "POST" }); await loadDraw(); }}>Freeze participants</button>
          </section>)}

          <LiveDrawStage
            visible={!(tab === "FACEBOOK" && !facebookShowAnimationStep)}
            liveDrawSpinning={liveDrawSpinning}
            liveCountdown={liveCountdown}
            liveAnimationPreset={liveAnimationPreset}
            liveWheelAngle={liveWheelAngle}
            liveWheelNames={liveWheelNames}
            liveDrawDisplayType={liveDrawDisplayType}
            liveDrawDisplayName={liveDrawDisplayName}
            liveReelPool={liveReelPool}
            revealedWinnerCards={revealedWinnerCards}
            getWinnerAvatar={getWinnerAvatar}
            busy={busy}
            drawId={drawId}
            onPublish={async () => {
              if (!drawId) return;
              setBusy(true);
              try {
                await api(`/api/tools/giveaway-draws/${drawId}/publish`, { method: "POST" });
                await loadDraw();
                await loadPublishStatus();
                setFacebookShowAnimationStep(false);
                setFacebookShowPublishStep(true);
                setTimeout(() => {
                  if (typeof document !== "undefined") {
                    document.getElementById("facebook-publish-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 30);
              } finally {
                setBusy(false);
              }
            }}
          />

          {(tab === "FACEBOOK" && !facebookShowPublishStep) ? null : (
            <section id="facebook-publish-step" className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
                <h3 className="text-2xl font-bold text-slate-900">Story Animation (.mp4)</h3>
                <a
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-semibold text-slate-700 hover:bg-slate-50"
                  href={publishedVideoUrl || "#"}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download video
                </a>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-400 to-blue-500 p-3 shadow-sm">
                    <div className="aspect-[9/16] rounded-xl bg-white/80 p-3 flex flex-col items-center justify-center text-center">
                      <div className="mb-3 h-20 w-20 rounded-full border-4 border-white bg-white text-3xl flex items-center justify-center">🏆</div>
                      <p className="text-sm text-slate-500">Winner</p>
                      <p className="text-xl font-bold text-slate-900">{topWinnerName}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-700 to-fuchsia-500 p-3 shadow-sm">
                    <div className="aspect-[9/16] rounded-xl bg-white/10 flex items-center justify-center">
                      <div className="h-24 w-24 rounded-full bg-white/90 flex items-center justify-center text-5xl font-extrabold text-violet-700">3</div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5">
                  <h3 className="text-2xl font-bold text-slate-900">Certificate of Validity</h3>
                  <p className="mt-2 text-lg text-slate-500">Share the following link with your followers to check the certificate public page.</p>
                </div>
                <div className="border-t border-slate-200 p-5">
                  <div className="text-xl text-slate-500">Certificate Page</div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <a className="text-xl text-blue-600 underline" target="_blank" rel="noreferrer" href={certificateUrl || "#"}>{certificateUrl || "-"}</a>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
                      onClick={async () => {
                        if (!certificateUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
                        await navigator.clipboard.writeText(`${window.location.origin}${certificateUrl}`);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5"><h3 className="text-2xl font-bold text-slate-900">Giveaway Details</h3></div>
                <div className="border-t border-slate-200 p-5 space-y-8 text-xl">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><span className="font-semibold text-slate-900">{new Date().toISOString().slice(0, 10)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Type</span><span className="font-semibold text-slate-900">{tab === "INSTAGRAM" ? "Instagram Giveaway" : tab === "TIKTOK" ? "TikTok Giveaway" : "Facebook Giveaway"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Participants</span><span className="rounded-full bg-emerald-100 px-4 py-1 font-bold text-emerald-700">{summaryTotal}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Author</span><span className="font-semibold text-blue-600">{authorName}</span></div>
                  <div className="space-y-2"><div className="text-slate-500">Post</div><a className="text-blue-600 underline break-all" href={sourcePostLink || "#"} target="_blank" rel="noreferrer">{sourcePostLink || "-"}</a></div>
                </div>
                <div className="border-t border-slate-200 p-5">
                  <div className="mb-3 flex items-center gap-2 text-2xl font-semibold text-slate-900">🏆 Winners</div>
                  <div className="space-y-2">
                    {winners.filter((w: any) => String(w?.winner_type || "WINNER") === "WINNER").map((w: any, idx: number) => (
                      <div key={w.id || idx} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-lg">
                        <span>{idx + 1}. {String(w.display_name || "-")}</span>
                        <span className="text-fuchsia-500">↗</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
                <h3 className="text-2xl font-bold text-slate-900">Story Certificate (.jpg)</h3>
                <a className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-semibold text-slate-700 hover:bg-slate-50" href={storyImageDownloadUrl} download="story-certificate.jpg">Download image</a>
              </article>
            </section>
          )}
        </>
      )}
    </main>
  );
}
