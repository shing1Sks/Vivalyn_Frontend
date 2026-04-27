import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  recompileEval,
  recompileSession,
  updateAgent,
  type AgentPromptSpec,
  type EvalConfig,
  type EvalMetric,
  type EvaluationMetrics,
  type SessionDesignRequest,
} from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import VoiceSettingsModal from "./VoiceSettingsModal";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  spec: AgentPromptSpec;
  agentId: string;
  agentName?: string;
  agentDisplayLabel?: string | null;
  agentLanguage: string;
  agentVoice: string;
  agentFirstSpeaker?: string;
  evaluationMetrics?: EvaluationMetrics | null;
  sessionDesignConfig?: SessionDesignRequest | null;
  evalConfig?: EvalConfig | null;
  onSaved: (spec: AgentPromptSpec) => void;
  onAgentUpdated?: (updates: {
    agent_name?: string;
    agent_display_label?: string;
    agent_language?: string;
    agent_voice?: string;
    agent_first_speaker?: string;
  }) => void;
}

const COMM_STYLES = ["Conversational", "Formal", "Coaching", "Strict"] as const;
const DURATION_PILLS = [10, 15, 30] as const;
const BEHAVIOR_RULE_ORDER = ["opening", "probing", "adaptation", "feedback", "closing"];

type Tab = "session" | "evaluation";

// ── Component ──────────────────────────────────────────────────────────────────

export default function AgentConfigureView({
  spec,
  agentId,
  agentName,
  agentDisplayLabel,
  agentLanguage,
  agentVoice,
  agentFirstSpeaker,
  evaluationMetrics,
  sessionDesignConfig,
  evalConfig,
  onSaved,
  onAgentUpdated,
}: Props) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("session");
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        tabMenuRef.current &&
        !tabMenuRef.current.contains(e.target as Node)
      ) {
        setTabMenuOpen(false);
      }
    }
    if (tabMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tabMenuOpen]);

  // ── Names ──────────────────────────────────────────────────────────────────
  const [editedAgentName, setEditedAgentName] = useState(agentName ?? "");
  const [editedDisplayLabel, setEditedDisplayLabel] = useState(
    agentDisplayLabel ?? "",
  );

  // ── Session config ─────────────────────────────────────────────────────────
  const [sessionConfig, setSessionConfig] = useState<
    Partial<SessionDesignRequest>
  >(() => {
    if (sessionDesignConfig) return { ...sessionDesignConfig };
    // Fall back to session_context from the compiled spec
    const ctx = spec.session_context;
    if (ctx) {
      return {
        agent_name: agentName ?? "",
        session_objective: ctx.session_objective,
        agent_role: ctx.agent_role,
        participant_role: ctx.participant_role,
        communication_style: ctx.communication_style,
        session_duration_minutes: ctx.session_duration_minutes,
      };
    }
    return {};
  });
  const [customDuration, setCustomDuration] = useState(() => {
    const d =
      sessionDesignConfig?.session_duration_minutes ??
      spec.session_context?.session_duration_minutes;
    if (!d) return "";
    return DURATION_PILLS.includes(d as (typeof DURATION_PILLS)[number])
      ? ""
      : String(d);
  });
  const [isCustomDuration, setIsCustomDuration] = useState(() => {
    const d =
      sessionDesignConfig?.session_duration_minutes ??
      spec.session_context?.session_duration_minutes;
    return (
      !!d && !DURATION_PILLS.includes(d as (typeof DURATION_PILLS)[number])
    );
  });

  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionStale, setSessionStale] = useState(false);
  const [sessionStaleDismissed, setSessionStaleDismissed] = useState(false);
  const [recompileSessionLoading, setRecompileSessionLoading] = useState(false);

  // ── Eval config ────────────────────────────────────────────────────────────
  const [currentEvalConfig, setCurrentEvalConfig] = useState<EvalConfig>(
    evalConfig ?? { mode: "auto" },
  );
  const isLegacyMetrics = (m: EvaluationMetrics['metrics']): boolean =>
    m.length > 0 && typeof (m[0] as unknown as string) === 'string'
  const [editedMetrics, setEditedMetrics] = useState<EvalMetric[]>(() => {
    const m = evaluationMetrics?.metrics ?? []
    if (isLegacyMetrics(m)) return []
    const slots = [...(m as EvalMetric[]).slice(0, 4)]
    while (slots.length < 4) slots.push({ name: '', definition: '', strong: '', weak: '' })
    return slots
  });
  const [editedCuratorPrompt, setEditedCuratorPrompt] = useState(
    evaluationMetrics?.report_curator_prompt ?? "",
  );
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);
  const [evalStale, setEvalStale] = useState(false);
  const [evalStaleDismissed, setEvalStaleDismissed] = useState(false);
  const [recompileEvalLoading, setRecompileEvalLoading] = useState(false);

  // ── Voice / first-speaker ──────────────────────────────────────────────────
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // ── Right-panel collapsible sections ──────────────────────────────────────
  const [behaviorOpen, setBehaviorOpen] = useState(true);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);
  const [firstSpeaker, setFirstSpeaker] = useState<"agent" | "user">(
    (agentFirstSpeaker as "agent" | "user") ?? "agent",
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildSessionDesignRequest(): SessionDesignRequest {
    const effectiveDuration = isCustomDuration
      ? parseInt(customDuration, 10) || 0
      : (sessionConfig.session_duration_minutes ?? 0);
    return {
      agent_name: editedAgentName.trim(),
      session_objective: sessionConfig.session_objective?.trim() ?? "",
      agent_role: sessionConfig.agent_role?.trim() ?? "",
      participant_role: sessionConfig.participant_role?.trim() ?? "",
      communication_style: sessionConfig.communication_style ?? "",
      session_duration_minutes: effectiveDuration,
      additional_context: sessionConfig.additional_context?.trim() || undefined,
    };
  }

  async function handleSaveSessionConfig() {
    if (!session) return;
    setSessionSaving(true);
    setSessionSaved(false);
    try {
      const config = buildSessionDesignRequest();
      const updates: Parameters<typeof updateAgent>[2] = {
        session_design_config: config,
      };
      if (editedAgentName.trim() && editedAgentName.trim() !== agentName)
        updates.agent_name = editedAgentName.trim();
      if (editedDisplayLabel !== (agentDisplayLabel ?? ""))
        updates.agent_display_label = editedDisplayLabel.trim() || undefined;
      await updateAgent(session.access_token, agentId, updates);
      setSessionSaved(true);
      setSessionStale(true);
      setSessionStaleDismissed(false);
      if (updates.agent_name || updates.agent_display_label !== undefined) {
        onAgentUpdated?.({
          agent_name: editedAgentName.trim(),
          agent_display_label: editedDisplayLabel.trim() || undefined,
        });
      }
      setTimeout(() => setSessionSaved(false), 3000);
    } catch {
      /* silent */
    } finally {
      setSessionSaving(false);
    }
  }

  async function handleRecompileSession() {
    if (!session) return;
    setRecompileSessionLoading(true);
    try {
      const config = buildSessionDesignRequest();
      const updatedAgent = await recompileSession(
        session.access_token,
        agentId,
        config,
      );
      onSaved(updatedAgent.agent_prompt as AgentPromptSpec);
      onAgentUpdated?.({
        agent_name: updatedAgent.agent_name,
        agent_display_label: updatedAgent.agent_display_label ?? undefined,
      });
      setSessionStale(false);
      setSessionStaleDismissed(false);
    } catch {
      /* silent */
    } finally {
      setRecompileSessionLoading(false);
    }
  }

  async function handleSaveEvalConfig() {
    if (!session) return;
    setEvalSaving(true);
    setEvalSaved(false);
    try {
      await updateAgent(session.access_token, agentId, {
        eval_config: currentEvalConfig,
      });
      setEvalSaved(true);
      setEvalStale(true);
      setEvalStaleDismissed(false);
      setTimeout(() => setEvalSaved(false), 3000);
    } catch {
      /* silent */
    } finally {
      setEvalSaving(false);
    }
  }

  async function handleRecompileEval() {
    if (!session) return;
    setRecompileEvalLoading(true);
    try {
      const sessionBrief = spec.session_context?.session_brief ?? "";
      const updatedAgent = await recompileEval(session.access_token, agentId, {
        session_brief: sessionBrief,
        eval_config: currentEvalConfig,
      });
      const newMetrics = updatedAgent.transcript_evaluation_metrics;
      if (newMetrics && !isLegacyMetrics(newMetrics.metrics)) {
        const slots = [...(newMetrics.metrics as EvalMetric[]).slice(0, 4)]
        while (slots.length < 4) slots.push({ name: '', definition: '', strong: '', weak: '' })
        setEditedMetrics(slots)
        setEditedCuratorPrompt(newMetrics.report_curator_prompt)
      }
      setEvalStale(false);
      setEvalStaleDismissed(false);
    } catch {
      /* silent */
    } finally {
      setRecompileEvalLoading(false);
    }
  }

  async function handleSaveMetrics() {
    if (!session) return;
    const metrics = editedMetrics.filter(m => m.name.trim())
    await updateAgent(session.access_token, agentId, {
      transcript_evaluation_metrics:
        metrics.length > 0 || editedCuratorPrompt.trim()
          ? { metrics, report_curator_prompt: editedCuratorPrompt }
          : null,
    });
  }

  function handleVoiceUpdated(lang: string, voice: string) {
    onAgentUpdated?.({ agent_language: lang, agent_voice: voice });
  }

  async function handleFirstSpeakerChange(val: "agent" | "user") {
    if (val === firstSpeaker || !session) return;
    setFirstSpeaker(val);
    try {
      await updateAgent(session.access_token, agentId, {
        agent_first_speaker: val,
      });
      onAgentUpdated?.({
        agent_language: agentLanguage,
        agent_voice: agentVoice,
        agent_first_speaker: val,
      });
    } catch {
      /* silent */
    }
  }

  const isSaving = activeTab === "session" ? sessionSaving : evalSaving;
  const isSaved = activeTab === "session" ? sessionSaved : evalSaved;

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 md:gap-4">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">
            Configure Agent
          </h2>

          {/* Mobile tab dropdown */}
          <div className="md:hidden relative" ref={tabMenuRef}>
            <button
              onClick={() => setTabMenuOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 duration-[120ms]"
            >
              {activeTab === "session" ? "Session" : "Evaluation"}
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-150 ${tabMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {tabMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {(["session", "evaluation"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setActiveTab(t);
                      setTabMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium duration-[120ms] capitalize ${
                      activeTab === t
                        ? "text-indigo-600 bg-indigo-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language / voice badges */}
          <div className="hidden md:flex items-center gap-1.5">
            {agentName && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
                {agentName}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1">
              {agentLanguage}
            </span>
            <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {agentVoice}
            </span>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* First speaker toggle */}
          <div className="hidden md:flex items-center gap-2">
            {(["agent", "user"] as const).map((val) => (
              <button
                key={val}
                onClick={() => handleFirstSpeakerChange(val)}
                className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all duration-150 ${
                  firstSpeaker === val
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                {val === "agent" ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                {val === "agent" ? "Agent starts" : "Participant starts"}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={
            activeTab === "session"
              ? handleSaveSessionConfig
              : handleSaveEvalConfig
          }
          disabled={isSaving}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]"
        >
          <span className="hidden md:inline">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                Saving…
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                Saved
              </>
            ) : (
              "Save config"
            )}
          </span>
          <span className="md:hidden">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </span>
        </button>
      </div>
      {/* Mobile language/voice row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {agentVoice} ·{" "}
            <span className="font-medium text-gray-700">
              {agentLanguage.toUpperCase()}
            </span>
          </span>
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Starts
          </span>
          {(["agent", "user"] as const).map((val) => (
            <button
              key={val}
              onClick={() => handleFirstSpeakerChange(val)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150 ${
                firstSpeaker === val
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {val === "agent" ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      </div>
      <VoiceSettingsModal
        agentId={agentId}
        agentLanguage={agentLanguage}
        agentVoice={agentVoice}
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onUpdated={handleVoiceUpdated}
      />
      {/* ── Two-panel layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — desktop only */}
        <nav className="hidden md:flex flex-col w-44 shrink-0 border-r border-gray-100 bg-white py-6 px-3 gap-1">
          {(["session", "evaluation"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-all duration-[120ms] capitalize ${
                activeTab === t
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Split content area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Form panel (left) ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "session" ? (
              <div className="px-6 md:px-8 py-6 space-y-5">
                {/* No config notice */}
                {!sessionDesignConfig && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
                    This agent was created before config storage was added. Fill
                    in the fields below and click
                    <span className="font-semibold"> Regenerate Agent</span> to
                    enable config-based editing.
                  </div>
                )}

                {/* Stale config notice */}
                <AnimatePresence>
                  {sessionStale && !sessionStaleDismissed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          Config updated — regenerate to apply changes.
                        </div>
                        <button
                          onClick={() => setSessionStaleDismissed(true)}
                          className="text-amber-400 hover:text-amber-700 duration-[120ms]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Names card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Names
                  </p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">
                        Persona name
                      </label>
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                        Used in agent — rename carefully
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editedAgentName}
                      onChange={(e) => setEditedAgentName(e.target.value)}
                      placeholder="e.g. Dr. Patel"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">
                        Display label
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Shown in records — freely editable
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editedDisplayLabel}
                      onChange={(e) => setEditedDisplayLabel(e.target.value)}
                      placeholder="e.g. Viva Voce Biology Examiner"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                    />
                  </div>
                </div>

                {/* Session config fields */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Session configuration
                  </p>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Duration
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {DURATION_PILLS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setSessionConfig((prev) => ({
                              ...prev,
                              session_duration_minutes: d,
                            }));
                            setIsCustomDuration(false);
                          }}
                          className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                            !isCustomDuration &&
                            sessionConfig.session_duration_minutes === d
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {d} min
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsCustomDuration(true)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                          isCustomDuration
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Custom
                      </button>
                      {isCustomDuration && (
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          placeholder="20"
                          autoFocus
                          className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      )}
                    </div>
                  </div>

                  {/* Textareas */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Session objective
                      </label>
                      <textarea
                        value={sessionConfig.session_objective ?? ""}
                        onChange={(e) =>
                          setSessionConfig((prev) => ({
                            ...prev,
                            session_objective: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="e.g. Conduct a rigorous oral examination on machine learning…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Agent role
                      </label>
                      <textarea
                        value={sessionConfig.agent_role ?? ""}
                        onChange={(e) =>
                          setSessionConfig((prev) => ({
                            ...prev,
                            agent_role: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="e.g. A rigorous oral examiner…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Participant role
                      </label>
                      <textarea
                        value={sessionConfig.participant_role ?? ""}
                        onChange={(e) =>
                          setSessionConfig((prev) => ({
                            ...prev,
                            participant_role: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="e.g. A postgraduate student…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Additional context
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        value={sessionConfig.additional_context ?? ""}
                        onChange={(e) =>
                          setSessionConfig((prev) => ({
                            ...prev,
                            additional_context: e.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Extra context or constraints…"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Communication style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Communication style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COMM_STYLES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setSessionConfig((prev) => ({
                              ...prev,
                              communication_style: s,
                            }))
                          }
                          className={`px-3 py-2 text-sm rounded-lg border transition-all duration-[120ms] ${
                            sessionConfig.communication_style === s
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Regenerate button */}
                <button
                  onClick={handleRecompileSession}
                  disabled={recompileSessionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-[120ms]"
                >
                  {recompileSessionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Agent
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="px-6 md:px-8 py-6 space-y-5">
                {/* No eval config notice */}
                {!evalConfig && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
                    This agent was created before eval config storage was added.
                    Set your preferences below and click
                    <span className="font-semibold"> Regenerate Eval</span>.
                  </div>
                )}

                {/* Stale eval notice */}
                <AnimatePresence>
                  {evalStale && !evalStaleDismissed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                        <div className="flex items-center gap-2 text-sm text-amber-800">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          Eval config updated — regenerate to apply changes.
                        </div>
                        <button
                          onClick={() => setEvalStaleDismissed(true)}
                          className="text-amber-400 hover:text-amber-700 duration-[120ms]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Eval config form */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Evaluation configuration
                  </p>

                  {/* Mode selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEvalConfig((prev) => ({
                          ...prev,
                          mode: "auto",
                        }))
                      }
                      className={`text-left border rounded-xl p-4 transition-all duration-[120ms] ${
                        currentEvalConfig.mode === "auto"
                          ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-900">
                          Auto-generate
                        </p>
                        <Sparkles
                          size={14}
                          className={
                            currentEvalConfig.mode === "auto"
                              ? "text-indigo-500"
                              : "text-gray-300"
                          }
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Based on session design
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEvalConfig((prev) => ({
                          ...prev,
                          mode: "custom",
                        }))
                      }
                      className={`text-left border rounded-xl p-4 transition-all duration-[120ms] ${
                        currentEvalConfig.mode === "custom"
                          ? "bg-white border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-gray-900">
                          Customize
                        </p>
                        <Brain
                          size={14}
                          className={
                            currentEvalConfig.mode === "custom"
                              ? "text-indigo-500"
                              : "text-gray-300"
                          }
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Define criteria manually
                      </p>
                    </button>
                  </div>

                  <AnimatePresence>
                    {currentEvalConfig.mode === "custom" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden space-y-4"
                      >
                        {[
                          {
                            label: "What is being evaluated?",
                            key: "competency" as const,
                            placeholder: "e.g. Oral defence of research methodology",
                          },
                          {
                            label: "Strong performance",
                            key: "strong_performance" as const,
                            placeholder: "e.g. Gives structured, well-reasoned answers…",
                          },
                          {
                            label: "Weak performance",
                            key: "weak_performance" as const,
                            placeholder: "e.g. Gives vague answers without reasoning…",
                          },
                          {
                            label: "Additional context",
                            key: "additional" as const,
                            placeholder: "Any other notes…",
                          },
                        ].map(({ label, key, placeholder }) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {label}
                            </label>
                            <textarea
                              value={currentEvalConfig[key] ?? ""}
                              onChange={(e) =>
                                setCurrentEvalConfig((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder={placeholder}
                              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Regenerate eval button */}
                <button
                  onClick={handleRecompileEval}
                  disabled={recompileEvalLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-[120ms]"
                >
                  {recompileEvalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Eval
                    </>
                  )}
                </button>

                {/* Metrics */}
                {(editedMetrics.some((m) => m.name) || editedCuratorPrompt) && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Evaluation metrics
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {editedMetrics.map((metric, i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                        >
                          <input
                            type="text"
                            value={metric.name}
                            onChange={(e) =>
                              setEditedMetrics((prev) =>
                                prev.map((m, idx) =>
                                  idx === i ? { ...m, name: e.target.value } : m,
                                ),
                              )
                            }
                            placeholder={`Metric ${i + 1} name`}
                            className="w-full px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                          <textarea
                            value={metric.definition}
                            onChange={(e) =>
                              setEditedMetrics((prev) =>
                                prev.map((m, idx) =>
                                  idx === i ? { ...m, definition: e.target.value } : m,
                                ),
                              )
                            }
                            placeholder="Definition"
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <textarea
                              value={metric.strong}
                              onChange={(e) =>
                                setEditedMetrics((prev) =>
                                  prev.map((m, idx) =>
                                    idx === i ? { ...m, strong: e.target.value } : m,
                                  ),
                                )
                              }
                              placeholder="Strong (5/5)"
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                            />
                            <textarea
                              value={metric.weak}
                              onChange={(e) =>
                                setEditedMetrics((prev) =>
                                  prev.map((m, idx) =>
                                    idx === i ? { ...m, weak: e.target.value } : m,
                                  ),
                                )
                              }
                              placeholder="Weak (1/5)"
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveMetrics}
                      className="w-full px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-[120ms]"
                    >
                      Save metrics
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Output panel (right) — desktop only, session tab only ─────── */}
          {activeTab === "session" && (
          <div className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l border-gray-100 overflow-y-auto bg-white">
              <div className="px-5 py-6 space-y-5">
                {/* Panel header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Agent
                  </p>
                  {spec.session_context?.session_type && (
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-md px-2 py-0.5 capitalize">
                      {spec.session_context.session_type}
                    </span>
                  )}
                </div>

                {/* Stale indicator */}
                {sessionStale && !sessionStaleDismissed && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Showing last generated — regenerate to update
                  </div>
                )}

                {/* Identity */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Who I am
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {spec.identity_and_persona || (
                      <span className="text-xs text-gray-400 italic">
                        Not generated yet
                      </span>
                    )}
                  </p>
                </div>

                {/* Session brief */}
                {spec.session_context?.session_brief && (
                  <div className="space-y-1.5 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Session brief
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {spec.session_context.session_brief}
                    </p>
                  </div>
                )}

                {/* Behavior rules — collapsible */}
                {spec.behavior_rules &&
                  Object.keys(spec.behavior_rules).length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setBehaviorOpen((v) => !v)}
                        className="flex items-center justify-between w-full mb-3 group"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Behavior
                        </p>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-[120ms] ${behaviorOpen ? "" : "-rotate-90"}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {behaviorOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden space-y-4"
                          >
                            {[
                              ...BEHAVIOR_RULE_ORDER.filter(
                                (k) => k in spec.behavior_rules,
                              ),
                              ...Object.keys(spec.behavior_rules).filter(
                                (k) => !BEHAVIOR_RULE_ORDER.includes(k),
                              ),
                            ].map((key) => (
                              <div key={key} className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                  {key}
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {spec.behavior_rules[key]}
                                </p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                {/* Guardrails — collapsible, closed by default */}
                {spec.guardrails?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setGuardrailsOpen((v) => !v)}
                      className="flex items-center justify-between w-full mb-3 group"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Guardrails
                        <span className="ml-1.5 normal-case font-normal text-gray-300">
                          ({spec.guardrails.length})
                        </span>
                      </p>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-[120ms] ${guardrailsOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {guardrailsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <ol className="space-y-2">
                            {spec.guardrails.map((g, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[10px] font-medium text-gray-400 mt-0.5 shrink-0 w-3.5 text-right">
                                  {i + 1}.
                                </span>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {g}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
          </div>
          )}

        </div>
      </div>
    </div>
  )
}
