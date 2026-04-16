import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Link2, Loader2, Copy, Rocket, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  ApiError,
  compileAgentPlan,
  generateEvaluationCriteria,
  planAgent,
  saveAgent,
  toggleAgentStatus,
  type Agent,
  type AgentPromptSpec,
  type CompileResult,
  type PlanQuestion,
} from '../../lib/api'
import LanguageVoiceSelector from './wizard/LanguageVoiceSelector'
import PlannerFlow, { type PlannerStatus } from './wizard/PlannerFlow'
import AgentConfigureView from './wizard/AgentConfigureView'

// ── Types ─────────────────────────────────────────────────────────────────────

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

  // Avoid double-trigger in strict mode
  const planningStarted = useRef(false)

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
      planningStarted.current = false
    }
  }, [open])

  // ── Eval + save ─────────────────────────────────────────────────────────────

  const handleEvalSubmit = useCallback(async (criteria: string) => {
    if (!session || !finalSpec || !configuredSpec) return
    setPlannerStatus('generating_metrics')

    try {
      const metrics = await generateEvaluationCriteria(session.access_token, {
        session_brief: finalSpec.session_brief,
        users_raw_evaluation_criteria: criteria,
      })

      const { agent_name } = finalSpec
      const agent = await saveAgent(session.access_token, agentspaceId, {
        agent_name,
        agent_prompt: configuredSpec,
        agent_language: selectedLanguage,
        agent_voice: selectedVoiceName,
        transcript_evaluation_metrics: metrics,
      })

      setSavedAgent(agent)
      setStep('done')
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 403) {
        setIsSubscriptionError(true)
        setError('Your plan has expired. Renew to continue creating agents.')
      } else {
        setIsSubscriptionError(false)
        setError(e instanceof Error ? e.message : 'Failed to save agent. Please try again.')
      }
      setPlannerStatus('awaiting_evaluation')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentspaceId, finalSpec, configuredSpec, selectedLanguage, selectedVoiceName])

  // ── Compiler ────────────────────────────────────────────────────────────────

  const runCompiler = useCallback(async (plan: Record<string, unknown>) => {
    if (!session) return
    setPlannerStatus('compiling')

    try {
      const spec = await compileAgentPlan(session.access_token, {
        plan_history: JSON.stringify(plan, null, 2),
      })
      setFinalSpec(spec)

      const { agent_name: _name, ...promptSections } = spec
      setConfiguredSpec(promptSections as AgentPromptSpec)

      setPlannerStatus('awaiting_evaluation')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Compilation failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

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
        await runCompiler(result.plan)
      } else {
        setError('Unexpected planner response. Please try again.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Planning failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, runCompiler])

  // ── Second planner call (with Q&A answers) ──────────────────────────────────

  const handleAnswersSubmitted = useCallback(async (answers: string[]) => {
    if (!session) return
    setPlannerStatus('planning')

    const planHistory = plannerQuestions
      .map((q, i) => `Q: ${q.query_statement}\nA: ${answers[i] ?? ''}`)
      .join('\n')

    try {
      const result = await planAgent(session.access_token, {
        seed_prompt: seedPrompt,
        plan_history: planHistory,
      })

      if (result.status === 'ready' && result.plan) {
        await runCompiler(result.plan)
      } else {
        setError('Unexpected planner response. Please try again.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Planning failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, seedPrompt, plannerQuestions, runCompiler])

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

  // Dot index logic: configure and done both count as past-all-done
  const dotStepIdx = (step === 'configure') ? STEP_DOTS.indexOf('done') : STEP_DOTS.indexOf(step)

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
                onAnswerAll={handleAnswersSubmitted}
                onEvalSubmit={handleEvalSubmit}
              />
            )}

            {step === 'done' && savedAgent && (
              <DoneStep
                savedAgent={savedAgent}
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
                evaluationMetrics={savedAgent.transcript_evaluation_metrics}
                onSaved={spec => setConfiguredSpec(spec)}
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
  savedAgent: Agent
  token: string
  onConfigure: () => void
  onClose: () => void
}

function DoneStep({ savedAgent, token, onConfigure, onClose }: DoneStepProps) {
  const [isLive, setIsLive] = useState(savedAgent.agent_status === 'live')
  const [toggling, setToggling] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)

  const liveUrl = `${window.location.origin}/agent/${savedAgent.id}`
  const testUrl = `${window.location.origin}/agent/${savedAgent.id}?mode=test`

  async function handleToggle() {
    if (toggling) return
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

  const tileClass = 'border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/50 duration-[120ms] cursor-pointer w-full text-left'

  return (
    <div className="flex items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{savedAgent.agent_name}</h2>
          <div className="flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className={`text-xs font-medium ${isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isLive ? 'Live' : 'Idle'}
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
            className={tileClass}
          >
            {copiedLive
              ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              : <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            }
            <span className="text-sm text-gray-700 font-medium truncate">
              {copiedLive ? 'Copied!' : 'Live link'}
            </span>
          </motion.button>

          {/* Copy test link */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(testUrl, 'test')}
            className={tileClass}
          >
            {copiedTest
              ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              : <Copy className="w-4 h-4 text-gray-400 shrink-0" />
            }
            <span className="text-sm text-gray-700 font-medium truncate">
              {copiedTest ? 'Copied!' : 'Test link'}
            </span>
          </motion.button>

          {/* Toggle live/idle */}
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={handleToggle}
            disabled={toggling}
            className={`${tileClass} disabled:opacity-60`}
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
            className={tileClass}
          >
            <Settings2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 font-medium truncate">Configure</span>
          </motion.button>
        </motion.div>

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
