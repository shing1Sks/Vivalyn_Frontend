import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Building2, Check, CheckCircle2, ChevronRight, Clock, Copy,
  FileText, Link2, Loader2, MessageSquare, Pencil, RotateCcw, Search, Settings2, Tag, ToggleLeft, ToggleRight, X, XCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useScrollLock } from '../../hooks/useScrollLock'
import {
  ApiError,
  compileAgent,
  generateEvaluationCriteria,
  saveAgent,
  toggleAgentStatus,
  updateAgent,
  type Agent,
  type AgentPromptSpec,
  type CompileResponse,
  type EvaluationMetrics,
  type SessionDesignRequest,
} from '../../lib/api'
import { agentToTemplate, GENERAL_TEMPLATES, type AgentTemplate } from '../../lib/agentTemplates'
import LanguageVoiceSelector from './wizard/LanguageVoiceSelector'
import SessionDesignStep from './wizard/SessionDesignStep'
import EvaluationStep from './wizard/EvaluationStep'
import MiniTestSession from './wizard/MiniTestSession'
import AgentConfigureView from './wizard/AgentConfigureView'

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep =
  | 'templates'
  | 'voice-language'
  | 'session-design'
  | 'evaluation'
  | 'test'
  | 'deploy'
  | 'configure'

const NAV_STEPS: { key: WizardStep; label: string }[] = [
  { key: 'templates',      label: 'Templates' },
  { key: 'voice-language', label: 'Voice & Language' },
  { key: 'session-design', label: 'Session Design' },
  { key: 'evaluation',     label: 'Evaluation' },
  { key: 'test',           label: 'Test' },
  { key: 'deploy',         label: 'Deploy' },
]

// ── Draft persistence ─────────────────────────────────────────────────────────

interface WizardDraft {
  step: WizardStep
  language: string
  voicePref: string
  voiceName: string
  templateId: string | null
  pendingSessionDesign: SessionDesignRequest | null
  sessionDesign: SessionDesignRequest | null
  compileResult: CompileResponse | null
  evalResult: EvaluationMetrics | null
  savedAgent: Agent | null
}

type AutoTrigger =
  | { type: 'compile'; design: SessionDesignRequest; lang: string; voiceName: string }
  | { type: 'eval-save'; compileRes: CompileResponse; design: SessionDesignRequest; lang: string; voiceName: string }
  | null

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  agentspaceId: string
  onClose: () => void
  orgAgents?: Agent[]
  initialStep?: string
  onStepChange?: (step: string | null) => void
}

export default function CreateAgentWizard({ open, agentspaceId, onClose, orgAgents, initialStep, onStepChange }: Props) {
  useScrollLock(open)
  const { session } = useAuth()

  const DRAFT_KEY = `vivalyn_wizard_draft_${agentspaceId}`
  const draftRef = useRef<WizardDraft | null>(null)
  const hasAppliedInitialStep = useRef(false)
  const wasOpenRef = useRef(false)

  const [hasDraft, setHasDraft] = useState(false)
  const [autoTrigger, setAutoTrigger] = useState<AutoTrigger>(null)
  const [step, setStep] = useState<WizardStep>('templates')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [maxReachedIdx, setMaxReachedIdx] = useState(0)

  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [sessionDesign, setSessionDesign] = useState<SessionDesignRequest | null>(null)

  const [pendingSessionDesign, setPendingSessionDesign] = useState<SessionDesignRequest | null>(null)
  const [pendingLangVoice, setPendingLangVoice] = useState<{ lang: string; pref: string; voiceName: string } | null>(null)
  const [pendingEvalResult, setPendingEvalResult] = useState<EvaluationMetrics | null>(null)
  const [compileResult, setCompileResult] = useState<CompileResponse | null>(null)
  const [evalResult, setEvalResult] = useState<EvaluationMetrics | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)
  const [configuredSpec, setConfiguredSpec] = useState<AgentPromptSpec | null>(null)

  const [compileLoading, setCompileLoading] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showCompileSuccess, setShowCompileSuccess] = useState(false)
  const [testPhase, setTestPhase] = useState<string>('idle')
  const [shouldEndTest, setShouldEndTest] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isSubscriptionError, setIsSubscriptionError] = useState(false)

  useEffect(() => {
    const idx = NAV_STEPS.findIndex(s => s.key === step)
    if (idx >= 0) setMaxReachedIdx(prev => Math.max(prev, idx))
  }, [step])

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      let loadedDraft: WizardDraft | null = null
      try { loadedDraft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') } catch { /* ignore */ }
      const hasMeaningful = !!(loadedDraft?.pendingSessionDesign || loadedDraft?.sessionDesign || loadedDraft?.savedAgent)

      if (hasMeaningful && loadedDraft) {
        draftRef.current = loadedDraft
        setHasDraft(true)
        setSelectedLanguage(loadedDraft.language)
        setSelectedVoiceName(loadedDraft.voiceName)
        if (loadedDraft.pendingSessionDesign) {
          setPendingSessionDesign(loadedDraft.pendingSessionDesign)
          setPendingLangVoice({ lang: loadedDraft.language, pref: loadedDraft.voicePref, voiceName: loadedDraft.voiceName })
        }
        setStep('templates')
        setCompletedSteps(new Set())
        setMaxReachedIdx(0)
        setSessionDesign(null)
        setPendingEvalResult(null)
        setCompileResult(null)
        setEvalResult(null)
        setSavedAgent(null)
        setConfiguredSpec(null)
        setCompileLoading(false)
        setCompileError(null)
        setEvalLoading(false)
        setSaveLoading(false)
        setRegenerating(false)
        setShowCompileSuccess(false)
        setTestPhase('idle')
        setShouldEndTest(false)
        setError(null)
        setIsSubscriptionError(false)
      } else {
        draftRef.current = null
        setHasDraft(false)
        const stepToUse = (!hasAppliedInitialStep.current && initialStep) ? initialStep as WizardStep : 'templates'
        hasAppliedInitialStep.current = true
        setStep(stepToUse)
        setCompletedSteps(new Set())
        setMaxReachedIdx(0)
        setSelectedLanguage('')
        setSelectedVoiceName('')
        setSelectedTemplate(null)
        setSessionDesign(null)
        setPendingSessionDesign(null)
        setPendingLangVoice(null)
        setPendingEvalResult(null)
        setCompileResult(null)
        setEvalResult(null)
        setSavedAgent(null)
        setConfiguredSpec(null)
        setCompileLoading(false)
        setCompileError(null)
        setEvalLoading(false)
        setSaveLoading(false)
        setRegenerating(false)
        setShowCompileSuccess(false)
        setTestPhase('idle')
        setShouldEndTest(false)
        setError(null)
        setIsSubscriptionError(false)
      }
    }
  }, [open])

  function markDone(s: WizardStep) {
    setCompletedSteps(prev => new Set([...prev, s]))
  }

  // Save draft throughout the pipeline (including after agent is saved, so restore works at all steps)
  useEffect(() => {
    if (!open) return
    if (step === 'templates' && !selectedTemplate && !pendingLangVoice) return
    const draft: WizardDraft = {
      step: step === 'configure' ? 'deploy' : step,
      language: selectedLanguage,
      voicePref: pendingLangVoice?.pref ?? '',
      voiceName: selectedVoiceName,
      templateId: selectedTemplate?.id ?? null,
      pendingSessionDesign,
      sessionDesign,
      compileResult,
      evalResult,
      savedAgent,
    }
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* ignore */ }
  }, [open, step, selectedLanguage, selectedVoiceName, pendingLangVoice, selectedTemplate, pendingSessionDesign, sessionDesign, compileResult, evalResult, savedAgent, DRAFT_KEY])

  // Clear draft when wizard closes (cancel from any step, or done from deploy)
  useEffect(() => {
    if (!open && wasOpenRef.current) {
      wasOpenRef.current = false
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    }
  }, [open, DRAFT_KEY])

  // Auto-retrigger in-flight async work after draft restore
  useEffect(() => {
    if (!autoTrigger || !open || !session) return
    const trigger = autoTrigger
    setAutoTrigger(null)
    if (trigger.type === 'compile') {
      runCompileChain(trigger.design, trigger.lang, trigger.voiceName)
        .then(() => {
          setSessionDesign(trigger.design)
          setShowCompileSuccess(true)
          setTimeout(() => { setShowCompileSuccess(false); setStep('evaluation') }, 1200)
        })
        .catch(() => {})
    } else if (trigger.type === 'eval-save') {
      runEvalAndSave(trigger.compileRes, trigger.design, trigger.lang, trigger.voiceName)
    }
  }, [autoTrigger, open, session])

  // Notify parent of step changes for URL sync
  useEffect(() => {
    if (!open) return
    onStepChange?.(step === 'configure' || step === 'templates' ? null : step)
  }, [step, open])

  function handleRestoreDraft() {
    const draft = draftRef.current
    if (!draft) return
    setHasDraft(false)

    // Restore all captured state
    setSelectedLanguage(draft.language)
    setSelectedVoiceName(draft.voiceName)
    setPendingLangVoice({ lang: draft.language, pref: draft.voicePref, voiceName: draft.voiceName })
    if (draft.pendingSessionDesign) setPendingSessionDesign(draft.pendingSessionDesign)
    if (draft.sessionDesign) setSessionDesign(draft.sessionDesign)
    if (draft.compileResult) setCompileResult(draft.compileResult)
    if (draft.evalResult) { setEvalResult(draft.evalResult); setPendingEvalResult(draft.evalResult) }
    if (draft.savedAgent) { setSavedAgent(draft.savedAgent); setConfiguredSpec(draft.savedAgent.agent_prompt) }

    // If agent was saved but step was still 'evaluation' (save happened in background), advance to 'test'
    const effectiveStep: WizardStep = (draft.savedAgent && draft.step === 'evaluation') ? 'test' : draft.step as WizardStep

    const stepOrder: WizardStep[] = ['templates', 'voice-language', 'session-design', 'evaluation', 'test', 'deploy']
    const targetIdx = stepOrder.indexOf(effectiveStep)
    setCompletedSteps(new Set(stepOrder.slice(0, Math.max(0, targetIdx)) as WizardStep[]))
    setMaxReachedIdx(Math.max(0, targetIdx))
    setStep(effectiveStep)

    // Schedule async retrigger for work that was in-flight at refresh time
    if (!draft.compileResult && draft.sessionDesign) {
      // Refresh happened mid-compile: re-run the full compile→eval→save chain
      setAutoTrigger({ type: 'compile', design: draft.sessionDesign, lang: draft.language, voiceName: draft.voiceName })
    } else if (draft.compileResult && !draft.savedAgent && draft.sessionDesign) {
      // Refresh happened after compile but before save: re-run eval→save
      setAutoTrigger({ type: 'eval-save', compileRes: draft.compileResult, design: draft.sessionDesign, lang: draft.language, voiceName: draft.voiceName })
    }
  }

  function handleDiscardDraft() {
    sessionStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
    draftRef.current = null
    setSelectedLanguage('')
    setSelectedVoiceName('')
    setPendingSessionDesign(null)
    setPendingLangVoice(null)
  }

  function getStepStatus(s: WizardStep): 'upcoming' | 'current' | 'done' | 'loading' {
    if (step === s) {
      if (s === 'session-design' && compileLoading) return 'loading'
      if (s === 'evaluation' && (compileLoading || evalLoading)) return 'loading'
      if (s === 'test' && saveLoading) return 'loading'
      if (s === 'evaluation' && regenerating) return 'loading'
      return 'current'
    }
    if (completedSteps.has(s)) return 'done'
    return 'upcoming'
  }

  // ── Step handlers ──────────────────────────────────────────────────────────

  function handleTemplateSelect(t: AgentTemplate) {
    setSelectedTemplate(t)
    resetDownstreamState()
    markDone('templates')
    setStep('voice-language')
  }

  function handleStartBlank() {
    setSelectedTemplate(null)
    resetDownstreamState()
    markDone('templates')
    setStep('voice-language')
  }

  function resetDownstreamState() {
    setSessionDesign(null)
    setPendingSessionDesign(null)
    setPendingLangVoice(null)
    setPendingEvalResult(null)
    setCompileResult(null)
    setEvalResult(null)
    setSavedAgent(null)
    setConfiguredSpec(null)
    setCompileError(null)
    setCompileLoading(false)
    setEvalLoading(false)
    setSaveLoading(false)
    setRegenerating(false)
    setShowCompileSuccess(false)
    setTestPhase('idle')
    setShouldEndTest(false)
    setError(null)
    setIsSubscriptionError(false)
  }

  function handleLanguageVoiceContinue() {
    if (!pendingLangVoice) return
    setSelectedLanguage(pendingLangVoice.lang)
    setSelectedVoiceName(pendingLangVoice.voiceName)
    markDone('voice-language')
    setStep('session-design')
  }

  function runEvalAndSave(compileRes: CompileResponse, design: SessionDesignRequest, lang: string, voiceName: string) {
    setEvalLoading(true)
    setError(null)
    const ctx = compileRes.spec.session_context
    const sessionBrief = ctx?.session_brief ?? ''
    const additionalContext = ctx
      ? [`Agent role: ${ctx.agent_role}`, `Participant: ${ctx.participant_role}`, `Objective: ${ctx.session_objective}`, `Style: ${ctx.communication_style}`, `Duration: ${ctx.session_duration_minutes} min`].join('\n')
      : ''
    generateEvaluationCriteria(session!.access_token, {
      session_brief: sessionBrief,
      competency: '', strong_performance: '', weak_performance: '', additional: additionalContext,
    })
      .then(async metrics => {
        setEvalResult(metrics)
        setPendingEvalResult(metrics)
        setEvalLoading(false)
        setSaveLoading(true)
        try {
          const agent = await saveAgent(session!.access_token, agentspaceId, {
            agent_name: design.agent_name,
            agent_display_label: compileRes.agent_display_label || undefined,
            agent_prompt: compileRes.spec,
            agent_language: lang,
            agent_voice: voiceName,
            transcript_evaluation_metrics: metrics,
            session_design_config: design,
            eval_config: { mode: 'auto' },
          })
          setSavedAgent(agent)
          setConfiguredSpec(compileRes.spec)
        } catch (e: unknown) {
          if (e instanceof ApiError && e.status === 403) {
            setIsSubscriptionError(true)
            setError('Your plan has expired. Renew to continue creating agents.')
          } else {
            setError(e instanceof Error ? e.message : 'Failed to save agent. Please try again.')
          }
        } finally {
          setSaveLoading(false)
        }
      })
      .catch(() => setEvalLoading(false))
  }

  function runCompileChain(design: SessionDesignRequest, lang: string, voiceName: string) {
    setCompileLoading(true)
    setCompileError(null)
    setError(null)
    setCompileResult(null)
    setSavedAgent(null)
    setConfiguredSpec(null)

    return compileAgent(session!.access_token, design)
      .then(compileRes => {
        setCompileResult(compileRes)
        setCompileLoading(false)
        runEvalAndSave(compileRes, design, lang, voiceName)
      })
      .catch(() => {
        setCompileError('Compilation failed. Please try again.')
        setError('Compilation failed. Please try again.')
        setIsSubscriptionError(false)
        setCompileLoading(false)
        throw new Error('compile failed')
      })
  }

  function handleSessionDesignContinue() {
    if (!pendingSessionDesign || !session) return
    const design = pendingSessionDesign
    const lang = pendingLangVoice?.lang ?? selectedLanguage
    const voiceName = pendingLangVoice?.voiceName ?? selectedVoiceName

    const designUnchanged =
      sessionDesign !== null &&
      JSON.stringify(design) === JSON.stringify(sessionDesign) &&
      compileResult !== null

    markDone('session-design')

    if (designUnchanged) {
      setStep('evaluation')
      return
    }

    setError(null)
    setShowCompileSuccess(false)
    setCompileError(null)

    runCompileChain(design, lang, voiceName)
      .then(() => {
        setSessionDesign(design)
        setShowCompileSuccess(true)
        setTimeout(() => {
          setShowCompileSuccess(false)
          setStep('evaluation')
        }, 1200)
      })
      .catch(() => {})
  }

  async function handleEvalContinue() {
    if (!pendingEvalResult || !session || !savedAgent) return
    markDone('evaluation')
    setStep('test')
    try {
      await updateAgent(session.access_token, savedAgent.id, {
        transcript_evaluation_metrics: pendingEvalResult,
        eval_config: { mode: 'auto' },
      })
    } catch { /* silent */ }
  }

  function handleTestPhaseChange(phase: string) {
    setTestPhase(phase)
    if (phase === 'idle' || phase === 'ended' || phase === 'error') setShouldEndTest(false)
  }

  function handleTestContinue() {
    if (testPhase === 'active' || testPhase === 'connecting') {
      setShouldEndTest(true)
      return
    }
    markDone('test')
    setStep('deploy')
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-white flex"
        >
          {/* ── Sidebar nav ─────────────────────────────────────────────── */}
          <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-gray-100 bg-gray-50 flex-col">
            <div className="px-5 py-5 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">New Agent</span>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
              {NAV_STEPS.map((s, i) => {
                const status = getStepStatus(s.key)
                const isClickable = i <= maxReachedIdx && step !== s.key && !compileLoading && !evalLoading && !saveLoading
                return (
                  <button
                    key={s.key}
                    onClick={() => { if (isClickable) setStep(s.key) }}
                    disabled={status === 'upcoming'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left duration-[120ms] border ${
                      status === 'current'
                        ? 'bg-white border-gray-200 shadow-sm'
                        : isClickable
                        ? 'border-transparent hover:bg-white hover:border-gray-200 cursor-pointer'
                        : 'border-transparent cursor-default'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'done'     ? 'bg-indigo-600'
                      : status === 'loading'  ? 'bg-indigo-50 border border-indigo-200'
                      : status === 'current'  ? 'bg-indigo-50 border-2 border-indigo-600'
                      : 'bg-gray-100'
                    }`}>
                      {status === 'done'    && <Check className="w-2.5 h-2.5 text-white" />}
                      {status === 'loading' && <Loader2 className="w-2.5 h-2.5 text-indigo-600 animate-spin" />}
                      {(status === 'current' || status === 'upcoming') && (
                        <span className={`text-[9px] font-bold ${status === 'current' ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span className={`text-xs font-medium ${
                      status === 'current'   ? 'text-gray-900'
                      : status === 'done'    ? 'text-gray-600'
                      : status === 'loading' ? 'text-gray-700'
                      : 'text-gray-400'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </nav>
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 duration-[120ms] px-2 py-1.5 rounded-lg hover:bg-white"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            <div className="md:hidden h-12 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
              <span className="text-sm font-medium text-gray-700">
                {NAV_STEPS.find(s => s.key === step)?.label ?? 'New Agent'}
              </span>
              <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className={`overflow-hidden border-b flex-shrink-0 ${isSubscriptionError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSubscriptionError && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      <p className={`text-sm ${isSubscriptionError ? 'text-amber-800' : 'text-red-700'}`}>
                        {error}
                        {isSubscriptionError && (
                          <> <a href="mailto:hello@vivalyn.in?subject=Renew%20plan" className="font-medium underline">Contact us to renew.</a></>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setError(null); setIsSubscriptionError(false) }}
                      className={isSubscriptionError ? 'text-amber-400 hover:text-amber-700' : 'text-red-400 hover:text-red-700'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step content */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {step === 'templates' && (
                  <TemplatesContent
                    onSelect={handleTemplateSelect}
                    onStartBlank={handleStartBlank}
                    orgAgents={orgAgents}
                    hasDraft={hasDraft}
                    onRestoreDraft={handleRestoreDraft}
                    onDiscardDraft={handleDiscardDraft}
                  />
                )}

                {step === 'voice-language' && (
                  <LanguageVoiceSelector
                    onSelectionChange={(l, p, v) => setPendingLangVoice({ lang: l, pref: p, voiceName: v })}
                  />
                )}

                {step === 'session-design' && (
                  <SessionDesignStep
                    language={pendingLangVoice?.lang ?? ''}
                    initialValues={pendingSessionDesign ?? sessionDesign ?? (selectedTemplate ? {
                      agent_name: selectedTemplate.suggested_name,
                      session_objective: selectedTemplate.session_objective,
                      agent_role: selectedTemplate.agent_role,
                      participant_role: selectedTemplate.participant_role,
                      communication_style: selectedTemplate.style,
                      session_duration_minutes: selectedTemplate.duration,
                    } : undefined)}
                    defaultAgentName={!selectedTemplate ? (pendingLangVoice?.voiceName ?? '') : undefined}
                    onChange={setPendingSessionDesign}
                  />
                )}

                {step === 'evaluation' && (
                  <EvaluationStep
                    evalResult={evalResult}
                    regenerating={regenerating}
                    onResultChange={setPendingEvalResult}
                  />
                )}

                {step === 'test' && (
                  <TestStepContent
                    compileLoading={compileLoading}
                    evalLoading={evalLoading}
                    saveLoading={saveLoading}
                    savedAgent={savedAgent}
                    agentName={sessionDesign?.agent_name ?? ''}
                    token={session?.access_token ?? ''}
                    email={session?.user.email ?? ''}
                    name={session?.user.user_metadata?.full_name ?? session?.user.email ?? 'Test user'}
                    onPhaseChange={handleTestPhaseChange}
                    shouldEnd={shouldEndTest}
                  />
                )}

                {step === 'deploy' && (
                  <DeployContent
                    savedAgent={savedAgent}
                    agentName={sessionDesign?.agent_name ?? '…'}
                    token={session?.access_token ?? ''}
                    onConfigure={() => setStep('configure')}
                    onClose={onClose}
                  />
                )}

                {step === 'configure' && savedAgent && configuredSpec && (
                  <AgentConfigureView
                    spec={configuredSpec}
                    agentId={savedAgent.id}
                    agentName={savedAgent.agent_name}
                    agentDisplayLabel={savedAgent.agent_display_label}
                    agentLanguage={savedAgent.agent_language}
                    agentVoice={savedAgent.agent_voice}
                    agentFirstSpeaker={savedAgent.agent_first_speaker}
                    evaluationMetrics={savedAgent.transcript_evaluation_metrics}
                    sessionDesignConfig={savedAgent.session_design_config}
                    evalConfig={savedAgent.eval_config}
                    onSaved={spec => setConfiguredSpec(spec)}
                    onAgentUpdated={updates => {
                      if (updates.agent_language) savedAgent.agent_language = updates.agent_language
                      if (updates.agent_voice) savedAgent.agent_voice = updates.agent_voice
                      if (updates.agent_first_speaker) savedAgent.agent_first_speaker = updates.agent_first_speaker
                    }}
                  />
                )}
              </div>

              {/* Sticky footer */}
              {step !== 'templates' && step !== 'deploy' && step !== 'configure' && (() => {
                const backStep: Partial<Record<WizardStep, WizardStep>> = {
                  'voice-language': 'templates',
                  'session-design': 'voice-language',
                  'evaluation':     'session-design',
                  'test':           'evaluation',
                }
                const isDesignStale = step === 'session-design' && sessionDesign !== null && pendingSessionDesign !== null && JSON.stringify(pendingSessionDesign) !== JSON.stringify(sessionDesign)
                const canContinue =
                  step === 'voice-language'  ? pendingLangVoice !== null :
                  step === 'session-design'  ? (pendingSessionDesign !== null && !compileLoading) :
                  step === 'evaluation'      ? (pendingEvalResult !== null && !evalLoading) :
                  step === 'test'            ? (savedAgent !== null && testPhase !== 'reporting' && testPhase !== 'connecting') :
                  false
                const isButtonDisabled = !canContinue || (step === 'session-design' && (compileLoading || showCompileSuccess)) || (step === 'evaluation' && regenerating)
                function handleContinue() {
                  if (step === 'voice-language') handleLanguageVoiceContinue()
                  else if (step === 'session-design') handleSessionDesignContinue()
                  else if (step === 'evaluation') handleEvalContinue()
                  else if (step === 'test') handleTestContinue()
                }
                return (
                  <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 flex items-center justify-between gap-3">
                    <button
                      onClick={() => { const back = backStep[step]; if (back) setStep(back) }}
                      disabled={compileLoading}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    {step === 'session-design' ? (
                      <button
                        onClick={handleContinue}
                        disabled={isButtonDisabled}
                        className={`px-6 py-2 text-sm font-semibold rounded-lg duration-[120ms] flex items-center gap-2 min-w-[140px] justify-center ${
                          compileLoading
                            ? 'bg-indigo-600 text-white opacity-80'
                            : showCompileSuccess
                            ? 'bg-emerald-600 text-white'
                            : compileError && !compileLoading
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : canContinue
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {compileLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Compiling…</>
                        ) : showCompileSuccess ? (
                          <><CheckCircle2 className="w-4 h-4" />Done</>
                        ) : compileError && !compileLoading ? (
                          <><XCircle className="w-4 h-4" />Retry</>
                        ) : isDesignStale ? (
                          'Regenerate'
                        ) : (
                          'Continue'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleContinue}
                        disabled={isButtonDisabled}
                        className={`px-6 py-2 text-sm font-semibold rounded-lg duration-[120ms] flex items-center gap-2 ${
                          canContinue && !regenerating && !saveLoading
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {step === 'evaluation' && saveLoading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />Saving agent…</>
                        ) : step === 'evaluation' ? (
                          'Save & continue'
                        ) : step === 'test' && testPhase === 'active' ? (
                          'End & continue'
                        ) : (
                          'Continue'
                        )}
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Templates step ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  academic: 'bg-violet-50 text-violet-700 border-violet-100',
  interview: 'bg-sky-50 text-sky-700 border-sky-100',
  corporate: 'bg-amber-50 text-amber-700 border-amber-100',
}

const GENERAL_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'academic', label: 'Academic' },
  { id: 'interview', label: 'Interview' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'org', label: 'From Your Org' },
] as const

function TemplatesContent({
  onSelect,
  onStartBlank,
  orgAgents,
  hasDraft,
  onRestoreDraft,
  onDiscardDraft,
}: {
  onSelect: (t: AgentTemplate) => void
  onStartBlank: () => void
  orgAgents?: Agent[]
  hasDraft?: boolean
  onRestoreDraft?: () => void
  onDiscardDraft?: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [orgLoading, setOrgLoading] = useState(false)

  useEffect(() => {
    if (activeCategory === 'org') {
      setOrgLoading(true)
      const t = setTimeout(() => setOrgLoading(false), 350)
      return () => clearTimeout(t)
    }
  }, [activeCategory])

  const q = search.toLowerCase().trim()

  const validOrg = (orgAgents ?? []).filter(a => a.session_design_config != null)
  const filteredOrg = validOrg.filter(a => {
    if (!q) return true
    const label = (a.agent_display_label || a.agent_name).toLowerCase()
    return label.includes(q) || a.session_design_config!.session_objective.toLowerCase().includes(q)
  })

  const filtered = GENERAL_TEMPLATES.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.session_objective.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Draft restore banner */}
      {hasDraft && (
        <div className="mb-6 border border-indigo-200 bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">You have an unsaved draft</p>
              <p className="text-xs text-gray-500 mt-0.5">Resume where you left off.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onDiscardDraft} className="text-xs text-gray-400 hover:text-gray-600 duration-[120ms] px-2 py-1">
              Discard
            </button>
            <button onClick={onRestoreDraft} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 border border-indigo-200 bg-white rounded-lg duration-[120ms]">
              Restore
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Start with a template</h1>
        <p className="text-sm text-gray-500">Choose from {GENERAL_TEMPLATES.length} templates or build your own.</p>
      </div>

      {/* Start from scratch — compact top option */}
      <button
        onClick={onStartBlank}
        className="w-full text-left border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/20 duration-[120ms] group mb-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Pencil className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Start from scratch</p>
            <p className="text-xs text-gray-500">Build your agent manually with full control.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 duration-[120ms] shrink-0" />
        </div>
      </button>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={activeCategory === 'org' ? 'Search your org\'s agents…' : 'Search templates…'}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-[120ms]"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {GENERAL_CATEGORIES.filter(c => c.id !== 'org').map(cat => {
          const count = cat.id === 'all' ? GENERAL_TEMPLATES.length
            : GENERAL_TEMPLATES.filter(t => t.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-[120ms] ${
                activeCategory === cat.id
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {cat.label} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={() => setActiveCategory('org')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-[120ms] ${
            activeCategory === 'org'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
          }`}
        >
          <Building2 className="w-3 h-3" />
          From Your Org <span className="opacity-70">({filteredOrg.length})</span>
        </button>
      </div>

      {/* Content area */}
      <div className="pr-1">
        {activeCategory === 'org' ? (
          orgAgents === undefined || orgLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <p className="text-sm text-gray-500">Loading org agents…</p>
            </div>
          ) : filteredOrg.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              {q ? 'No org agents match your search.' : 'No org agents with session config found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrg.map(agent => {
                const sdc = agent.session_design_config!
                const label = agent.agent_display_label || agent.agent_name
                return (
                  <button
                    key={agent.id}
                    onClick={() => onSelect(agentToTemplate(agent))}
                    className="text-left border border-gray-200 border-l-[3px] border-l-indigo-400 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/30 duration-[120ms] group bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-100">
                        Your org
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 duration-[120ms]" />
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-1">{label}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{agent.agent_language.toUpperCase()} · {agent.agent_voice} · {sdc.session_duration_minutes} min · {sdc.communication_style}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {sdc.session_objective}
                    </p>
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="text-left border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/30 duration-[120ms] group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {t.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 duration-[120ms]" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">{t.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{t.duration} min · {t.style}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {t.session_objective}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm text-gray-400">
                No templates match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Test step ─────────────────────────────────────────────────────────────────

function TestStepContent({
  compileLoading, evalLoading, saveLoading, savedAgent, agentName, token, email, name,
  onPhaseChange, shouldEnd,
}: {
  compileLoading: boolean
  evalLoading: boolean
  saveLoading: boolean
  savedAgent: Agent | null
  agentName: string
  token: string
  email: string
  name: string
  onPhaseChange: (phase: string) => void
  shouldEnd: boolean
}) {
  const isLoading = compileLoading || evalLoading || saveLoading

  return (
    <div className="flex flex-col h-full">
      {/* Status strip — visible while background chain is running */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-b border-gray-100 bg-gray-50"
          >
            <div className="px-6 py-2.5 flex items-center gap-3">
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
              <div className="flex items-center gap-2 text-xs">
                <span className={compileLoading ? 'text-indigo-600 font-medium' : 'text-gray-400'}>
                  Compiling
                </span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className={evalLoading ? 'text-indigo-600 font-medium' : compileLoading ? 'text-gray-300' : 'text-gray-400'}>
                  Evaluation
                </span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className={saveLoading ? 'text-indigo-600 font-medium' : (compileLoading || evalLoading) ? 'text-gray-300' : 'text-gray-400'}>
                  Saving
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test session */}
      <div className="flex-1 min-h-0">
        {!savedAgent ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <p className="text-sm text-gray-400">Preparing agent…</p>
            {agentName && <p className="text-xs text-gray-300">{agentName}</p>}
          </div>
        ) : (
          <MiniTestSession
            agentId={savedAgent.id}
            token={token}
            email={email}
            name={name}
            agentFirstSpeaker={savedAgent.agent_first_speaker}
            onPhaseChange={onPhaseChange}
            shouldEnd={shouldEnd}
          />
        )}
      </div>
    </div>
  )
}

// ── Deploy step ───────────────────────────────────────────────────────────────

function DeployContent({
  savedAgent,
  agentName,
  token,
  onConfigure,
  onClose,
}: {
  savedAgent: Agent | null
  agentName: string
  token: string
  onConfigure: () => void
  onClose: () => void
}) {
  const [isLive, setIsLive] = useState(savedAgent?.agent_status === 'live')
  const [toggling, setToggling] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (savedAgent?.agent_first_speaker as 'agent' | 'user') ?? 'agent'
  )
  const [displayLabel, setDisplayLabel] = useState(savedAgent?.agent_display_label ?? '')
  const [labelDraft, setLabelDraft] = useState(savedAgent?.agent_display_label ?? '')
  const [editingLabel, setEditingLabel] = useState(false)
  const [showReport, setShowReport] = useState(savedAgent?.show_report ?? false)

  const liveUrl = savedAgent ? `${window.location.origin}/agent/${savedAgent.id}` : ''
  const testUrl = savedAgent ? `${window.location.origin}/agent/${savedAgent.id}?mode=test` : ''

  async function handleToggle() {
    if (toggling || !savedAgent) return
    const next: 'live' | 'idle' = isLive ? 'idle' : 'live'
    setToggling(true)
    try {
      await toggleAgentStatus(token, savedAgent.id, next)
      setIsLive(!isLive)
    } catch { /* silent */ } finally {
      setToggling(false)
    }
  }

  function copyLink(url: string, which: 'live' | 'test') {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      if (which === 'live') {
        setCopiedLive(true)
        setTimeout(() => setCopiedLive(false), 2000)
      } else {
        setCopiedTest(true)
        setTimeout(() => setCopiedTest(false), 2000)
      }
    })
  }

  async function handleFirstSpeakerToggle(val: 'agent' | 'user') {
    if (val === firstSpeaker || !savedAgent) return
    setFirstSpeaker(val)
    try {
      await updateAgent(token, savedAgent.id, { agent_first_speaker: val })
    } catch { /* silent */ }
  }

  async function handleShowReportToggle() {
    if (!savedAgent) return
    const next = !showReport
    setShowReport(next)
    try { await updateAgent(token, savedAgent.id, { show_report: next }) } catch { /* silent */ }
  }

  async function saveLabel() {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed === displayLabel || !savedAgent) return
    setDisplayLabel(trimmed)
    try { await updateAgent(token, savedAgent.id, { agent_display_label: trimmed || undefined }) } catch { /* silent */ }
  }

  const tileBase = 'border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 duration-[120ms] w-full text-left'
  const tileMuted = 'opacity-40 pointer-events-none'

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 flex items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full border-2 bg-emerald-50 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{agentName}</h2>
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className={`text-xs font-medium ${isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isLive ? 'Live' : 'Idle'}
            </span>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-2 gap-2 mb-3"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(liveUrl, 'live')}
            disabled={!savedAgent}
            className={`${tileBase} hover:border-emerald-300 hover:bg-emerald-50/50 ${!savedAgent ? tileMuted : ''}`}
          >
            {copiedLive ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedLive ? 'Copied!' : 'Live link'}</span>
          </motion.button>

          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(testUrl, 'test')}
            disabled={!savedAgent}
            className={`${tileBase} hover:border-orange-300 hover:bg-orange-50/50 ${!savedAgent ? tileMuted : ''}`}
          >
            {copiedTest ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-orange-400 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedTest ? 'Copied!' : 'Test link'}</span>
          </motion.button>

          {isLive ? (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
              className={`${tileBase} bg-emerald-50 border-emerald-200`}
            >
              <ToggleRight className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">Live</span>
            </motion.div>
          ) : (
            <motion.button
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
              onClick={handleToggle}
              disabled={toggling || !savedAgent}
              className={`${tileBase} hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-60 ${!savedAgent ? tileMuted : ''}`}
            >
              {toggling
                ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
                : <ToggleLeft className="w-5 h-5 text-gray-300 shrink-0" />}
              <span className="text-sm text-gray-700 font-medium">Go live</span>
            </motion.button>
          )}

          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={onConfigure}
            disabled={!savedAgent}
            className={`${tileBase} hover:border-gray-300 hover:bg-gray-50 ${!savedAgent ? tileMuted : ''}`}
          >
            <Settings2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Configure</span>
          </motion.button>
        </motion.div>

        <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Display label</span>
          </div>
          {editingLabel ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={saveLabel}
              onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabelDraft(displayLabel); setEditingLabel(false) } }}
              placeholder="Public-facing name…"
              className="text-sm text-right border-b border-indigo-400 outline-none text-gray-700 bg-transparent max-w-[160px]"
            />
          ) : (
            <button onClick={() => { setLabelDraft(displayLabel); setEditingLabel(true) }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 duration-[120ms]">
              {displayLabel || <span className="text-gray-300 text-xs italic">not set</span>}
              <Pencil className="w-3 h-3 text-gray-400 shrink-0" />
            </button>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Who opens the session</span>
          </div>
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {(['agent', 'user'] as const).map(val => (
              <button
                key={val}
                onClick={() => handleFirstSpeakerToggle(val)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md duration-[120ms] ${
                  firstSpeaker === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {val === 'agent' ? 'Agent' : 'Participant'}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Show report to candidate</span>
          </div>
          <button
            onClick={handleShowReportToggle}
            disabled={!savedAgent}
            className="disabled:opacity-40"
          >
            {showReport
              ? <ToggleRight className="w-6 h-6 text-indigo-600" />
              : <ToggleLeft className="w-6 h-6 text-gray-300" />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 duration-[120ms]"
        >
          Done
        </button>
      </motion.div>
    </div>
  )
}

