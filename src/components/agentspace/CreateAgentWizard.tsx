import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, CheckCircle, Link2, Loader2, Copy, MessageSquare, Rocket, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  ApiError,
  compileAgentPlan,
  generateEvaluationCriteria,
  planAgent,
  saveAgent,
  toggleAgentStatus,
  updateAgent,
  type Agent,
  type AgentPromptSpec,
  type CompileResult,
  type EvaluationMetrics,
  type PlanQuestion,
} from '../../lib/api'
import LanguageVoiceSelector from './wizard/LanguageVoiceSelector'
import PlannerFlow, { type PlannerStatus } from './wizard/PlannerFlow'
import AgentConfigureView from './wizard/AgentConfigureView'

// ── Types ─────────────────────────────────────────────────────────────────────

type SavePhase = 'idle' | 'compile' | 'metrics' | 'save' | 'done'

function stepStatus(current: SavePhase, target: 'compile' | 'metrics' | 'save'): 'pending' | 'running' | 'done' {
  const order: SavePhase[] = ['compile', 'metrics', 'save', 'done']
  const ci = order.indexOf(current)
  const ti = order.indexOf(target)
  return ci > ti ? 'done' : ci === ti ? 'running' : 'pending'
}

type WizardStep =
  | 'language-voice'
  | 'prompt-input'
  | 'planning'
  | 'done'
  | 'configure'

const STEP_DOTS: WizardStep[] = ['language-voice', 'prompt-input', 'planning', 'done']

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  agentspaceId: string
  onClose: () => void
}

export default function CreateAgentWizard({ open, agentspaceId, onClose }: Props) {
  const { session } = useAuth()

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('language-voice')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedPersonaName, setSelectedPersonaName] = useState('')
  const [seedPrompt, setSeedPrompt] = useState('')

  // Planner state
  const [plannerStatus, setPlannerStatus] = useState<PlannerStatus>('planning')
  const [plannerQuestions, setPlannerQuestions] = useState<PlanQuestion[]>([])

  const [finalSpec, setFinalSpec] = useState<CompileResult | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)
  const [configuredSpec, setConfiguredSpec] = useState<AgentPromptSpec | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubscriptionError, setIsSubscriptionError] = useState(false)
  const [savePhase, setSavePhase] = useState<SavePhase>('idle')

  // Avoid double-trigger in strict mode
  const planningStarted = useRef(false)
  // Background compile promise — resolves to spec or null on error
  const bgCompileRef = useRef<Promise<CompileResult | null>>(Promise.resolve(null))
  // Stored plan for compile retry on error
  const planResultRef = useRef<Record<string, unknown> | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('language-voice')
      setSelectedLanguage('')
      setSelectedVoiceName('')
      setSelectedPersonaName('')
      setSeedPrompt('')
      setPlannerStatus('planning')
      setPlannerQuestions([])
      setFinalSpec(null)
      setSavedAgent(null)
      setConfiguredSpec(null)
      setError(null)
      setIsSubscriptionError(false)
      setSavePhase('idle')
      planningStarted.current = false
      bgCompileRef.current = Promise.resolve(null)
      planResultRef.current = null
    }
  }, [open])

  // ── Background compiler ─────────────────────────────────────────────────────

  const startBackgroundCompile = useCallback((plan: Record<string, unknown>) => {
    if (!session) return
    bgCompileRef.current = (async (): Promise<CompileResult | null> => {
      try {
        const spec = await compileAgentPlan(session.access_token, {
          plan_history: JSON.stringify(plan, null, 2),
        })
        setFinalSpec(spec)
        const { agent_name: _n, ...promptSections } = spec
        setConfiguredSpec(promptSections as AgentPromptSpec)
        return spec
      } catch {
        return null
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // ── Eval + save ─────────────────────────────────────────────────────────────

  const handleEvalSubmit = useCallback(async (criteria: string) => {
    if (!session) return

    setStep('done')
    setSavePhase('compile')
    setError(null)
    setIsSubscriptionError(false)

    // Await background compile — likely already done by the time user types criteria
    let spec = await bgCompileRef.current
    if (!spec) {
      // Compile failed — retry once with stored plan
      if (planResultRef.current) {
        startBackgroundCompile(planResultRef.current)
        spec = await bgCompileRef.current
      }
      if (!spec) {
        setError('Agent compilation failed. Please try again.')
        setStep('planning')
        setPlannerStatus('awaiting_evaluation')
        setSavePhase('idle')
        return
      }
    }

    setSavePhase('metrics')
    let metrics: EvaluationMetrics
    try {
      metrics = await generateEvaluationCriteria(session.access_token, {
        session_brief: spec.session_brief,
        users_raw_evaluation_criteria: criteria,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate evaluation criteria.')
      setStep('planning')
      setPlannerStatus('awaiting_evaluation')
      setSavePhase('idle')
      return
    }

    setSavePhase('save')
    try {
      const { agent_name, ...promptSections } = spec
      const agentPrompt = (configuredSpec ?? promptSections) as AgentPromptSpec
      const agent = await saveAgent(session.access_token, agentspaceId, {
        agent_name,
        agent_prompt: agentPrompt,
        agent_language: selectedLanguage,
        agent_voice: selectedVoiceName,
        transcript_evaluation_metrics: metrics,
      })
      setSavedAgent(agent)
      setSavePhase('done')
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 403) {
        setIsSubscriptionError(true)
        setError('Your plan has expired. Renew to continue creating agents.')
      } else {
        setIsSubscriptionError(false)
        setError(e instanceof Error ? e.message : 'Failed to save agent. Please try again.')
      }
      setStep('planning')
      setPlannerStatus('awaiting_evaluation')
      setSavePhase('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentspaceId, configuredSpec, selectedLanguage, selectedVoiceName, startBackgroundCompile])

  // ── First planner call ──────────────────────────────────────────────────────

  const runPlanner = useCallback(async (seed: string) => {
    if (!session) return
    setPlannerStatus('planning')

    try {
      const result = await planAgent(session.access_token, { seed_prompt: seed })

      if (result.status === 'need_inputs' && result.questions?.length) {
        setPlannerQuestions(result.questions)
        setPlannerStatus('awaiting_answers')
      } else if (result.status === 'ready' && result.plan) {
        planResultRef.current = result.plan
        startBackgroundCompile(result.plan)
        setPlannerStatus('awaiting_evaluation')
      } else {
        setError('Unexpected planner response. Please try again.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Planning failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, startBackgroundCompile])

  // ── Second planner call (with Q&A answers) ──────────────────────────────────

  const handleAnswersSubmitted = useCallback((answers: string[]) => {
    if (!session) return

    // Show eval input immediately — planner second call + compile run as a background chain
    setPlannerStatus('awaiting_evaluation')

    const planHistory = plannerQuestions
      .map((q, i) => `Q: ${q.query_statement}\nA: ${answers[i] ?? ''}`)
      .join('\n')

    bgCompileRef.current = (async (): Promise<CompileResult | null> => {
      try {
        const result = await planAgent(session.access_token, {
          seed_prompt: seedPrompt,
          plan_history: planHistory,
        })
        if (!result.plan) return null
        planResultRef.current = result.plan
        const spec = await compileAgentPlan(session.access_token, {
          plan_history: JSON.stringify(result.plan, null, 2),
        })
        setFinalSpec(spec)
        const { agent_name: _n, ...promptSections } = spec
        setConfiguredSpec(promptSections as AgentPromptSpec)
        return spec
      } catch {
        return null
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, seedPrompt, plannerQuestions])

  // ── Step handlers ───────────────────────────────────────────────────────────

  function handleLanguageVoiceContinue(lang: string, _pref: string, voiceName: string, personaName: string) {
    setSelectedLanguage(lang)
    setSelectedVoiceName(voiceName)
    setSelectedPersonaName(personaName)
    setStep('prompt-input')
  }

  function handlePromptSubmit() {
    if (!seedPrompt.trim()) return
    setStep('planning')
    if (!planningStarted.current) {
      planningStarted.current = true
      runPlanner(seedPrompt.trim())
    }
  }

  function handleBack() {
    if (step === 'prompt-input') setStep('language-voice')
    else if (step === 'configure') setStep('done')
  }

  const canGoBack = step === 'prompt-input' || step === 'configure'

  if (!open) return null

  // Dot index: configure + completed done = all past; saving done = last dot active
  const dotStepIdx = (step === 'configure' || (step === 'done' && savePhase === 'done'))
    ? STEP_DOTS.length          // beyond all dots → every dot is 'past'
    : STEP_DOTS.indexOf(step)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-white flex flex-col"
        >
          {/* Header bar */}
          <div className="h-14 border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0">
            {/* Back */}
            <div className="w-24 flex-shrink-0">
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 duration-[120ms]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            {/* Step dots */}
            <div className="flex-1 flex justify-center gap-2">
              {STEP_DOTS.map((s, i) => {
                const isPast = dotStepIdx > i
                const isActive = dotStepIdx === i
                return (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full duration-[120ms] ${
                      isPast ? 'bg-indigo-600' :
                      isActive ? 'bg-indigo-400' :
                      'bg-gray-200'
                    }`}
                  />
                )
              })}
            </div>

            {/* Close */}
            <div className="w-24 flex-shrink-0 flex justify-end">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className={`overflow-hidden border-b ${isSubscriptionError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}
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

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            {step === 'language-voice' && (
              <LanguageVoiceSelector onContinue={handleLanguageVoiceContinue} />
            )}

            {step === 'prompt-input' && (
              <PromptInputStep
                value={seedPrompt}
                onChange={setSeedPrompt}
                onSubmit={handlePromptSubmit}
                language={selectedLanguage}
                personaName={selectedPersonaName}
              />
            )}

            {step === 'planning' && (
              <PlannerFlow
                seedPrompt={seedPrompt}
                status={plannerStatus}
                questions={plannerQuestions}
                compileReady={finalSpec !== null}
                onAnswerAll={handleAnswersSubmitted}
                onEvalSubmit={handleEvalSubmit}
              />
            )}

            {step === 'done' && (
              <DoneStep
                savedAgent={savedAgent}
                agentName={finalSpec?.agent_name ?? '…'}
                savePhase={savePhase}
                token={session?.access_token ?? ''}
                onConfigure={() => setStep('configure')}
                onClose={onClose}
              />
            )}

            {step === 'configure' && savedAgent && configuredSpec && (
              <AgentConfigureView
                spec={configuredSpec}
                agentId={savedAgent.id}
                agentLanguage={savedAgent.agent_language}
                agentVoice={savedAgent.agent_voice}
                agentFirstSpeaker={savedAgent.agent_first_speaker}
                evaluationMetrics={savedAgent.transcript_evaluation_metrics}
                onSaved={spec => setConfiguredSpec(spec)}
                onAgentUpdated={updates => {
                  savedAgent.agent_language = updates.agent_language
                  savedAgent.agent_voice = updates.agent_voice
                  if (updates.agent_first_speaker) savedAgent.agent_first_speaker = updates.agent_first_speaker
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Prompt input step ──────────────────────────────────────────────────────────

interface PromptInputStepProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  language: string
  personaName: string
}

function PromptInputStep({ value, onChange, onSubmit, language, personaName }: PromptInputStepProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          {/* Meta chips */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {language.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">
              {personaName}
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Describe your training agent</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tell us what kind of voice agent you want to create. Be as specific or broad as you like — our planner will ask follow-up questions.
          </p>

          <textarea
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && value.trim()) onSubmit()
            }}
            rows={6}
            placeholder="e.g. A sales coaching agent for B2B SaaS reps that helps them practice cold calls and objection handling…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
          />
          <p className="text-xs text-gray-400 mt-1.5">Press Cmd+Enter or click Launch to start</p>

          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className={`mt-5 w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
              value.trim()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Rocket className="w-4 h-4" />
            Launch Planning Agent
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Done step ──────────────────────────────────────────────────────────────────

interface DoneStepProps {
  savedAgent: Agent | null
  agentName: string
  savePhase: SavePhase
  token: string
  onConfigure: () => void
  onClose: () => void
}

function DoneStep({ savedAgent, agentName, savePhase, token, onConfigure, onClose }: DoneStepProps) {
  const [isLive, setIsLive] = useState(savedAgent?.agent_status === 'live')
  const [toggling, setToggling] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)
  const [firstSpeaker, setFirstSpeaker] = useState<'agent' | 'user'>(
    (savedAgent?.agent_first_speaker as 'agent' | 'user') ?? 'agent'
  )

  // Sync live state once agent is saved
  useEffect(() => {
    if (savedAgent) {
      setIsLive(savedAgent.agent_status === 'live')
      setFirstSpeaker((savedAgent.agent_first_speaker as 'agent' | 'user') ?? 'agent')
    }
  }, [savedAgent])

  const liveUrl = savedAgent ? `${window.location.origin}/agent/${savedAgent.id}` : ''
  const testUrl = savedAgent ? `${window.location.origin}/agent/${savedAgent.id}?mode=test` : ''
  const isReady = savePhase === 'done' && savedAgent !== null

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

  const tileBase = 'border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 duration-[120ms] w-full text-left'
  const tileActive = 'hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
  const tileMuted = 'opacity-40 pointer-events-none'

  return (
    <div className="flex items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Progress steps — shown while saving */}
        <AnimatePresence>
          {!isReady && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-5"
            >
              <div className="flex flex-col gap-2.5">
                {([
                  ['compile', 'Compiling agent prompt'],
                  ['metrics', 'Generating evaluation criteria'],
                  ['save',    'Saving to your space'],
                ] as const).map(([phase, label]) => {
                  const s = stepStatus(savePhase, phase)
                  return (
                    <div key={phase} className="flex items-center gap-2.5 text-sm">
                      {s === 'done'    && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {s === 'running' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
                      {s === 'pending' && <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />}
                      <span className={
                        s === 'done'    ? 'text-gray-500' :
                        s === 'running' ? 'text-gray-800 font-medium' :
                        'text-gray-400'
                      }>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="text-center mb-6">
          <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center mx-auto mb-4 duration-[120ms] ${
            isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
          }`}>
            {isReady
              ? <Check className="w-7 h-7 text-emerald-500" />
              : <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            }
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{agentName}</h2>
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isReady && isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className={`text-xs font-medium ${isReady && isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isReady ? (isLive ? 'Live' : 'Idle') : 'Creating…'}
            </span>
          </div>
        </div>

        {/* Action tiles */}
        <motion.div
          className="grid grid-cols-2 gap-2 mb-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {/* Copy live link */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(liveUrl, 'live')}
            disabled={!isReady}
            className={`${tileBase} hover:border-emerald-300 hover:bg-emerald-50/50 ${isReady ? tileActive : tileMuted}`}
          >
            {copiedLive
              ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              : <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />
            }
            <span className="text-sm text-gray-700 font-medium truncate">
              {copiedLive ? 'Copied!' : 'Live link'}
            </span>
          </motion.button>

          {/* Copy test link */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(testUrl, 'test')}
            disabled={!isReady}
            className={`${tileBase} hover:border-orange-300 hover:bg-orange-50/50 ${isReady ? tileActive : tileMuted}`}
          >
            {copiedTest
              ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              : <Copy className="w-4 h-4 text-orange-400 shrink-0" />
            }
            <span className="text-sm text-gray-700 font-medium truncate">
              {copiedTest ? 'Copied!' : 'Test link'}
            </span>
          </motion.button>

          {/* Toggle live/idle */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={handleToggle}
            disabled={toggling || !isReady}
            className={`${tileBase} ${isReady ? `${tileActive} disabled:opacity-60` : tileMuted}`}
          >
            {toggling ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
            ) : isLive ? (
              <ToggleRight className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-300 shrink-0" />
            )}
            <span className="text-sm text-gray-700 font-medium truncate">
              {isLive ? 'Set idle' : 'Set live'}
            </span>
          </motion.button>

          {/* Configure */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={onConfigure}
            disabled={!isReady}
            className={`${tileBase} ${isReady ? tileActive : tileMuted}`}
          >
            <Settings2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium truncate">Configure</span>
          </motion.button>
        </motion.div>

        {/* Who opens the session */}
        <div className={`border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between mb-3 ${!isReady ? 'opacity-40' : ''}`}>
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium">Who opens the session</span>
          </div>
          <div className={`inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5 ${!isReady ? 'pointer-events-none' : ''}`}>
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

        <button
          onClick={onClose}
          disabled={!isReady}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 duration-[120ms] disabled:opacity-40 disabled:pointer-events-none"
        >
          Done
        </button>
      </motion.div>
    </div>
  )
}
