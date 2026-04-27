import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Check, CheckCircle2, ChevronRight, Clock, Copy,
  FileText, Link2, Loader2, MessageSquare, Pencil, Settings2, Tag, ToggleLeft, ToggleRight, X, XCircle,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useScrollLock } from '../../../hooks/useScrollLock'
import {
  ApiError,
  compileQnAAgent,
  generateEvaluationCriteria,
  generateQnAQuestions,
  saveQnAAgent,
  toggleAgentStatus,
  updateAgent,
  type Agent,
  type EvaluationMetrics,
  type QnACompileResponse,
  type QnAPromptSpec,
  type QnAQuestionBank,
  type QnASessionDesignRequest,
} from '../../../lib/api'
import { QNA_TEMPLATES, type QnAAgentTemplate } from '../../../lib/agentTemplates'
import LanguageVoiceSelector from './LanguageVoiceSelector'
import QnASessionDesignStep from './QnASessionDesignStep'
import EvaluationStep from './EvaluationStep'
import QnAQuestionReview from './QnAQuestionReview'
import QnAConfigureView from './QnAConfigureView'
import MiniTestSession from './MiniTestSession'

// ── Types ──────────────────────────────────────────────────────────────────────

type QnAWizardStep =
  | 'templates'
  | 'voice-language'
  | 'session-design'
  | 'questions'
  | 'evaluation'
  | 'test'
  | 'deploy'
  | 'configure'

const NAV_STEPS: { key: QnAWizardStep; label: string }[] = [
  { key: 'templates',      label: 'Templates' },
  { key: 'voice-language', label: 'Voice & Language' },
  { key: 'session-design', label: 'Session Design' },
  { key: 'questions',      label: 'Questions' },
  { key: 'evaluation',     label: 'Evaluation' },
  { key: 'test',           label: 'Test' },
  { key: 'deploy',         label: 'Deploy' },
]

const COMPILE_PHASES = [
  'Analyzing your session design…',
  'Building agent persona…',
  'Writing behavior rules…',
  'Generating questions…',
  'Finalizing agent prompt…',
]

// ── MorphingStepText ──────────────────────────────────────────────────────────

function MorphingStepText({ phases, active }: { phases: string[]; active: boolean }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setIdx(i => (i + 1) % phases.length)
    }, 1900)
    return () => clearInterval(interval)
  }, [active, phases.length])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="text-sm text-gray-500"
      >
        {phases[idx]}
      </motion.span>
    </AnimatePresence>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  agentspaceId: string
  onClose: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CreateQnAAgentWizard({ open, agentspaceId, onClose }: Props) {
  useScrollLock(open)
  const { session } = useAuth()

  const [step, setStep] = useState<QnAWizardStep>('templates')
  const [completedSteps, setCompletedSteps] = useState<Set<QnAWizardStep>>(new Set())
  const [maxReachedIdx, setMaxReachedIdx] = useState(0)

  const [selectedTemplate, setSelectedTemplate] = useState<QnAAgentTemplate | null>(null)
  const [sessionDesign, setSessionDesign] = useState<QnASessionDesignRequest | null>(null)
  const [compileResult, setCompileResult] = useState<QnACompileResponse | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{ text: string; type: 'fixed' | 'randomized'; cross_question_enabled: boolean }>>([])
  const [evalResult, setEvalResult] = useState<EvaluationMetrics | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)

  const [pendingSessionDesign, setPendingSessionDesign] = useState<QnASessionDesignRequest | null>(null)
  const [pendingLangVoice, setPendingLangVoice] = useState<{ lang: string; pref: string; voiceName: string } | null>(null)
  const [pendingEvalResult, setPendingEvalResult] = useState<EvaluationMetrics | null>(null)
  const [pendingBank, setPendingBank] = useState<QnAQuestionBank | null>(null)

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
      setStep('templates')
      setCompletedSteps(new Set())
      setMaxReachedIdx(0)
      setSelectedTemplate(null)
      setSessionDesign(null)
      setCompileResult(null)
      setGeneratedQuestions([])
      setEvalResult(null)
      setSavedAgent(null)
      setPendingSessionDesign(null)
      setPendingLangVoice(null)
      setPendingEvalResult(null)
      setPendingBank(null)
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
  }, [open])

  function markDone(s: QnAWizardStep) {
    setCompletedSteps(prev => new Set([...prev, s]))
  }

  function getStepStatus(s: QnAWizardStep): 'upcoming' | 'current' | 'done' | 'loading' {
    if (step === s) {
      if (s === 'session-design' && compileLoading) return 'loading'
      if (s === 'evaluation' && (evalLoading || regenerating)) return 'loading'
      if (s === 'test' && saveLoading) return 'loading'
      return 'current'
    }
    if (completedSteps.has(s)) return 'done'
    return 'upcoming'
  }

  // ── Step handlers ───────────────────────────────────────────────────────────

  function handleTemplateSelect(t: QnAAgentTemplate) {
    setSelectedTemplate(t)
    setPendingSessionDesign(null)
    markDone('templates')
    setStep('voice-language')
  }

  function handleStartBlank() {
    setSelectedTemplate(null)
    setPendingSessionDesign(null)
    markDone('templates')
    setStep('voice-language')
  }

  function handleLanguageVoiceContinue() {
    if (!pendingLangVoice) return
    markDone('voice-language')
    setStep('session-design')
  }

  function runCompileAndQuestions(design: QnASessionDesignRequest) {
    setCompileLoading(true)
    setCompileError(null)
    setError(null)
    setCompileResult(null)
    return Promise.all([
      compileQnAAgent(session!.access_token, { session_design: design }),
      generateQnAQuestions(session!.access_token, {
        context: design.session_objective,
        resource_text: design.resource_text || undefined,
        resource_images: design.resource_images?.length ? design.resource_images : undefined,
      }).then(r => r.questions),
    ])
      .then(([compileRes, questions]) => {
        setCompileResult(compileRes)
        setGeneratedQuestions(questions)
        setPendingBank(null)
        setCompileLoading(false)
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

    const designUnchanged =
      sessionDesign !== null &&
      JSON.stringify(design) === JSON.stringify(sessionDesign) &&
      compileResult !== null

    markDone('session-design')

    if (designUnchanged) {
      setStep('questions')
      return
    }

    setError(null)
    setShowCompileSuccess(false)
    setCompileError(null)

    setSavedAgent(null)
    runCompileAndQuestions(design)
      .then(() => {
        setSessionDesign(design)
        setShowCompileSuccess(true)
        setTimeout(() => {
          setShowCompileSuccess(false)
          setStep('questions')
        }, 1200)
      })
      .catch(() => {})
  }

  function handleRetryCompile() {
    if (!session || !sessionDesign) return
    setError(null)
    setCompileError(null)
    runCompileAndQuestions(sessionDesign).catch(() => {})
  }

  function handleQuestionsContinue() {
    if (!pendingBank || !compileResult || !session || !sessionDesign) return

    const bank = pendingBank
    markDone('questions')
    setStep('evaluation')

    // If already saved (user went back and changed questions), just update the bank
    if (savedAgent) {
      const spec: QnAPromptSpec = { ...compileResult.spec, question_bank: bank }
      updateAgent(session.access_token, savedAgent.id, { agent_prompt: spec }).catch(() => {})
      return
    }

    // First time — trigger eval → save chain
    setEvalLoading(true)
    const ctx = compileResult.spec.session_context
    const sessionBrief = ctx?.session_brief ?? ''
    const additionalContext = ctx
      ? [`Agent role: ${ctx.agent_role}`, `Participant: ${ctx.participant_role}`, `Objective: ${ctx.session_objective}`, `Style: ${ctx.communication_style}`, `Duration: ${ctx.session_duration_minutes} min`].join('\n')
      : ''
    generateEvaluationCriteria(session.access_token, {
      session_brief: sessionBrief,
      competency: '', strong_performance: '', weak_performance: '', additional: additionalContext,
    })
      .then(async metrics => {
        setEvalResult(metrics)
        setPendingEvalResult(metrics)
        setEvalLoading(false)
        setSaveLoading(true)
        const spec: QnAPromptSpec = { ...compileResult.spec, question_bank: bank }
        try {
          const agent = await saveQnAAgent(session.access_token, agentspaceId, {
            agent_name: sessionDesign.agent_name,
            agent_display_label: compileResult.agent_display_label || undefined,
            agent_prompt: spec,
            agent_language: pendingLangVoice?.lang ?? '',
            agent_voice: pendingLangVoice?.voiceName ?? '',
            transcript_evaluation_metrics: metrics,
            session_design_config: sessionDesign,
            eval_config: { mode: 'auto' },
          })
          setSavedAgent(agent)
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
          <aside className="hidden md:flex w-56 shrink-0 border-r border-gray-100 bg-gray-50 flex-col">
            <div className="px-5 py-5 border-b border-gray-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">New QnA Agent</span>
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
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
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
            <div className="md:hidden h-12 border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
              <span className="text-sm font-medium text-gray-700">
                {NAV_STEPS.find(s => s.key === step)?.label ?? 'New QnA Agent'}
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
                  className={`overflow-hidden border-b shrink-0 ${isSubscriptionError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}
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
                    <button onClick={() => { setError(null); setIsSubscriptionError(false) }} className={isSubscriptionError ? 'text-amber-400 hover:text-amber-700' : 'text-red-400 hover:text-red-700'}>
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
                  <QnATemplatesContent onSelect={handleTemplateSelect} onStartBlank={handleStartBlank} />
                )}

                {step === 'voice-language' && (
                  <LanguageVoiceSelector
                    onSelectionChange={(l, p, v) => setPendingLangVoice({ lang: l, pref: p, voiceName: v })}
                  />
                )}

                {step === 'session-design' && (
                  <QnASessionDesignStep
                    language={pendingLangVoice?.lang ?? ''}
                    initialValues={pendingSessionDesign ?? sessionDesign ?? (selectedTemplate ? {
                      agent_name: selectedTemplate.suggested_name,
                      session_objective: selectedTemplate.session_objective,
                      agent_role: selectedTemplate.agent_role,
                      participant_role: selectedTemplate.participant_role,
                      communication_style: selectedTemplate.style,
                      session_duration_minutes: selectedTemplate.duration,
                      feedback_mode: selectedTemplate.feedback_mode,
                    } : undefined)}
                    defaultAgentName={!selectedTemplate ? (pendingLangVoice?.voiceName ?? '') : undefined}
                    onChange={setPendingSessionDesign}
                  />
                )}

                {step === 'questions' && (
                  <QnAQuestionsContent
                    compileLoading={compileLoading}
                    compileError={compileError}
                    generatedQuestions={generatedQuestions}
                    sessionDurationMinutes={sessionDesign?.session_duration_minutes}
                    onBankChange={setPendingBank}
                    onRetry={handleRetryCompile}
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
                  <QnATestStepContent
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
                  <QnADeployContent
                    savedAgent={savedAgent}
                    agentName={sessionDesign?.agent_name ?? '…'}
                    token={session?.access_token ?? ''}
                    onConfigure={() => setStep('configure')}
                    onClose={onClose}
                  />
                )}

                {step === 'configure' && savedAgent && (
                  <QnAConfigureView agent={savedAgent} />
                )}
              </div>

              {/* Sticky footer */}
              {step !== 'templates' && step !== 'deploy' && step !== 'configure' && (() => {
                const backStep: Partial<Record<QnAWizardStep, QnAWizardStep>> = {
                  'voice-language': 'templates',
                  'session-design': 'voice-language',
                  'questions':      'session-design',
                  'evaluation':     'questions',
                  'test':           'evaluation',
                }
                const isDesignStale = step === 'session-design' && sessionDesign !== null && pendingSessionDesign !== null && JSON.stringify(pendingSessionDesign) !== JSON.stringify(sessionDesign)
                const canContinue =
                  step === 'voice-language'  ? pendingLangVoice !== null :
                  step === 'session-design'  ? (pendingSessionDesign !== null && !compileLoading) :
                  step === 'questions'       ? (pendingBank !== null && !compileLoading && compileError === null) :
                  step === 'evaluation'      ? (pendingEvalResult !== null && !evalLoading) :
                  step === 'test'            ? (savedAgent !== null && testPhase !== 'reporting' && testPhase !== 'connecting') :
                  false
                const isButtonDisabled = !canContinue || (step === 'session-design' && (compileLoading || showCompileSuccess)) || (step === 'evaluation' && regenerating)
                function handleContinue() {
                  if (step === 'voice-language') handleLanguageVoiceContinue()
                  else if (step === 'session-design') handleSessionDesignContinue()
                  else if (step === 'questions') handleQuestionsContinue()
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

const FEATURED_QNA = QNA_TEMPLATES.slice(0, 3)

const QNA_CATEGORY_COLORS: Record<string, string> = {
  academic: 'bg-violet-50 text-violet-700 border-violet-100',
  professional: 'bg-sky-50 text-sky-700 border-sky-100',
  language: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function QnATemplatesContent({
  onSelect,
  onStartBlank,
}: {
  onSelect: (t: QnAAgentTemplate) => void
  onStartBlank: () => void
}) {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 rounded-full px-2.5 py-1">
          QnA Agent
        </span>
        <h1 className="text-2xl font-semibold text-gray-900 mt-3 mb-2">Start with a template</h1>
        <p className="text-sm text-gray-500">Choose a template to pre-fill your session design, or start from scratch.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {FEATURED_QNA.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/30 duration-[120ms] group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${QNA_CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {t.category}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 duration-[120ms]" />
            </div>
            <p className="text-base font-semibold text-gray-900 mb-1">{t.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{t.duration} min · {t.style}</span>
            </div>
          </button>
        ))}

        <button
          onClick={onStartBlank}
          className="text-left border border-dashed border-gray-300 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/20 duration-[120ms] group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Custom</span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 duration-[120ms]" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">Start from scratch</p>
            <p className="text-xs text-gray-400">Fill in all session details manually.</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Questions step ────────────────────────────────────────────────────────────

function QnAQuestionsContent({
  compileLoading,
  compileError,
  generatedQuestions,
  sessionDurationMinutes,
  onBankChange,
  onRetry,
}: {
  compileLoading: boolean
  compileError: string | null
  generatedQuestions: Array<{ text: string; type: 'fixed' | 'randomized'; cross_question_enabled: boolean }>
  sessionDurationMinutes?: number
  onBankChange: (bank: QnAQuestionBank | null) => void
  onRetry: () => void
}) {
  if (compileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-12">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <MorphingStepText phases={COMPILE_PHASES} active={compileLoading} />
        <div className="w-64 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-indigo-400 rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: '85%' }}
            transition={{ duration: 8, ease: 'easeInOut' }}
          />
        </div>
      </div>
    )
  }

  if (compileError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-12">
        <div className="w-full max-w-sm border border-red-200 bg-red-50 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-700">{compileError}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms]"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <QnAQuestionReview
      initialQuestions={generatedQuestions}
      sessionDurationMinutes={sessionDurationMinutes}
      onBankChange={onBankChange}
    />
  )
}

// ── Test step ─────────────────────────────────────────────────────────────────

function QnATestStepContent({
  evalLoading,
  saveLoading,
  savedAgent,
  agentName,
  token,
  email,
  name,
  onPhaseChange,
  shouldEnd,
}: {
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
  const isLoading = evalLoading || saveLoading

  return (
    <div className="flex flex-col h-full">
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
                <span className={evalLoading ? 'text-indigo-600 font-medium' : 'text-gray-400'}>
                  Generating evaluation
                </span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className={saveLoading ? 'text-indigo-600 font-medium' : evalLoading ? 'text-gray-300' : 'text-gray-400'}>
                  Saving
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function QnADeployContent({
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
    (savedAgent?.agent_first_speaker as 'agent' | 'user') ?? 'agent',
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
      if (which === 'live') { setCopiedLive(true); setTimeout(() => setCopiedLive(false), 2000) }
      else { setCopiedTest(true); setTimeout(() => setCopiedTest(false), 2000) }
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
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full border-2 bg-emerald-50 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{agentName}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">QnA</span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <span className={`text-xs font-medium ${isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isLive ? 'Live' : 'Idle'}
              </span>
            </div>
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
