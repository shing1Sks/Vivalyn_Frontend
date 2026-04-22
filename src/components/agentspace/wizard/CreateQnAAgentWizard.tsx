import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, CheckCircle, Copy, Link2, Loader2, MessageSquare, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
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
  type QnACompileResult,
  type QnAPromptSpec,
  type QnAQuestionBank,
} from '../../../lib/api'
import LanguageVoiceSelector from './LanguageVoiceSelector'
import QnAResourceStep from './QnAResourceStep'
import QnAQuestionReview from './QnAQuestionReview'
import QnAConfigureView from './QnAConfigureView'

// ── Types ──────────────────────────────────────────────────────────────────────

type QnAWizardStep =
  | 'language-voice'
  | 'resource-upload'
  | 'evaluation'
  | 'question-review'
  | 'done'
  | 'configure'

type SavePhase = 'idle' | 'compile' | 'metrics' | 'save' | 'done'

function stepStatus(current: SavePhase, target: 'compile' | 'metrics' | 'save'): 'pending' | 'running' | 'done' {
  const order: SavePhase[] = ['compile', 'metrics', 'save', 'done']
  const ci = order.indexOf(current)
  const ti = order.indexOf(target)
  return ci > ti ? 'done' : ci === ti ? 'running' : 'pending'
}

const STEP_DOTS: QnAWizardStep[] = ['language-voice', 'resource-upload', 'evaluation', 'done']

const PLACEHOLDER_BANK: QnAQuestionBank = { fixed: [], randomized_pool: [], randomized_count: 0 }

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  agentspaceId: string
  onClose: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CreateQnAAgentWizard({ open, agentspaceId, onClose }: Props) {
  const { session } = useAuth()

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<QnAWizardStep>('language-voice')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedPersonaName, setSelectedPersonaName] = useState('')

  const [assessmentContext, setAssessmentContext] = useState('')
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{ text: string; type: 'fixed' | 'randomized'; cross_question_enabled: boolean }>>([])
  const [questionsReady, setQuestionsReady] = useState(false)
  const [questionsError, setQuestionsError] = useState<string | null>(null)

  const [compiledResult, setCompiledResult] = useState<QnACompileResult | null>(null)
  const [compiledAgentName, setCompiledAgentName] = useState<string | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)

  const [savePhase, setSavePhase] = useState<SavePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isSubscriptionError, setIsSubscriptionError] = useState(false)

  // Background promises — both fire on resource step submit
  const bgCompileRef = useRef<Promise<QnACompileResult | null>>(Promise.resolve(null))
  const bgQuestionsRef = useRef<Promise<Array<{ text: string; type: 'fixed' | 'randomized'; cross_question_enabled: boolean }> | null>>(Promise.resolve(null))
  // Stores eval criteria from eval step, used when question review confirms
  const evalCriteriaRef = useRef<string>('')
  // Stores the compile context for retry on failure
  const compileContextRef = useRef<{ tone: string; feedbackMode: 'silent' | 'feedback'; context: string } | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('language-voice')
      setSelectedLanguage('')
      setSelectedVoiceName('')
      setSelectedPersonaName('')
      setAssessmentContext('')
      setGeneratedQuestions([])
      setQuestionsReady(false)
      setQuestionsError(null)
      setCompiledResult(null)
      setCompiledAgentName(null)
      setSavedAgent(null)
      setSavePhase('idle')
      setError(null)
      setIsSubscriptionError(false)
      bgCompileRef.current = Promise.resolve(null)
      bgQuestionsRef.current = Promise.resolve(null)
      evalCriteriaRef.current = ''
      compileContextRef.current = null
    }
  }, [open])

  // ── Background helpers ──────────────────────────────────────────────────────

  const startBackgroundCompile = useCallback((tone: string, feedbackMode: 'silent' | 'feedback', context: string) => {
    if (!session) return
    compileContextRef.current = { tone, feedbackMode, context }
    bgCompileRef.current = (async (): Promise<QnACompileResult | null> => {
      try {
        const result = await compileQnAAgent(session.access_token, {
          question_bank: PLACEHOLDER_BANK,
          tone,
          feedback_mode: feedbackMode,
          session_context: context,
        })
        setCompiledResult(result)
        setCompiledAgentName(result.agent_name)
        return result
      } catch {
        return null
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const startBackgroundQuestions = useCallback((context: string, resourceText: string, resourceImages: string[]) => {
    if (!session) return
    bgQuestionsRef.current = (async () => {
      try {
        const result = await generateQnAQuestions(session.access_token, {
          context,
          resource_text: resourceText || undefined,
          resource_images: resourceImages.length > 0 ? resourceImages : undefined,
        })
        setGeneratedQuestions(result.questions)
        setQuestionsReady(true)
        return result.questions
      } catch (e: unknown) {
        setQuestionsError(e instanceof Error ? e.message : 'Failed to generate questions.')
        return null
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // ── Step handlers ────────────────────────────────────────────────────────────

  function handleLanguageVoiceContinue(lang: string, _pref: string, voiceName: string, personaName: string) {
    setSelectedLanguage(lang)
    setSelectedVoiceName(voiceName)
    setSelectedPersonaName(personaName)
    setStep('resource-upload')
  }

  const handleGenerateAssessment = useCallback((
    context: string,
    resourceText: string,
    resourceImages: string[],
    tone: string,
    feedbackMode: 'silent' | 'feedback',
  ) => {
    setAssessmentContext(context)
    setError(null)
    setQuestionsError(null)

    // Fire both in parallel — no blocking
    startBackgroundCompile(tone, feedbackMode, context)
    startBackgroundQuestions(context, resourceText, resourceImages)

    setStep('evaluation')
  }, [startBackgroundCompile, startBackgroundQuestions])

  // Eval step: just store criteria and move to question review
  const handleEvalSubmit = useCallback((criteria: string) => {
    evalCriteriaRef.current = criteria
    setStep('question-review')
  }, [])

  // Question review: confirmed bank → full save pipeline
  const handleQuestionBankReady = useCallback(async (bank: QnAQuestionBank) => {
    if (!session) return

    setStep('done')
    setSavePhase('compile')
    setError(null)
    setIsSubscriptionError(false)

    // Await background compile — should be done by now
    let spec = await bgCompileRef.current
    if (!spec) {
      const ctx = compileContextRef.current
      if (ctx) {
        startBackgroundCompile(ctx.tone, ctx.feedbackMode, ctx.context)
        spec = await bgCompileRef.current
      }
      if (!spec) {
        setError('Agent compilation failed. Please try again.')
        setStep('question-review')
        setSavePhase('idle')
        return
      }
    }

    // Patch confirmed question bank into compiled spec
    spec = { ...spec, question_bank: bank }

    setSavePhase('metrics')
    let metrics: EvaluationMetrics
    try {
      metrics = await generateEvaluationCriteria(session.access_token, {
        session_brief: spec.session_brief,
        users_raw_evaluation_criteria: evalCriteriaRef.current,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate evaluation criteria.')
      setStep('question-review')
      setSavePhase('idle')
      return
    }

    setSavePhase('save')
    try {
      const { agent_name, ...promptSections } = spec
      const agent = await saveQnAAgent(session.access_token, agentspaceId, {
        agent_name,
        agent_prompt: promptSections as QnAPromptSpec,
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
      setStep('question-review')
      setSavePhase('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentspaceId, selectedLanguage, selectedVoiceName, startBackgroundCompile])

  function handleBack() {
    if (step === 'resource-upload') setStep('language-voice')
    else if (step === 'evaluation') setStep('resource-upload')
    else if (step === 'question-review') setStep('evaluation')
    else if (step === 'configure') setStep('done')
  }

  const canGoBack = ['resource-upload', 'evaluation', 'question-review', 'configure'].includes(step)

  if (!open) return null

  const dotStepIdx =
    step === 'configure' || (step === 'done' && savePhase === 'done')
      ? STEP_DOTS.length
      : step === 'question-review' || step === 'done'
        ? STEP_DOTS.length - 1
        : STEP_DOTS.indexOf(step as typeof STEP_DOTS[number])

  // ── Render ───────────────────────────────────────────────────────────────────

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

            <div className="flex-1 flex justify-center items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-500 bg-indigo-50 rounded-full px-2.5 py-1">
                QnA Agent
              </span>
              <div className="flex gap-2">
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
            </div>

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

            {step === 'resource-upload' && (
              <QnAResourceStep
                language={selectedLanguage}
                personaName={selectedPersonaName}
                onGenerate={handleGenerateAssessment}
              />
            )}

            {step === 'evaluation' && (
              <EvaluationStep
                compileReady={compiledResult !== null}
                onSubmit={handleEvalSubmit}
              />
            )}

            {step === 'question-review' && !questionsError && questionsReady && (
              <QnAQuestionReview
                initialQuestions={generatedQuestions}
                onContinue={handleQuestionBankReady}
              />
            )}

            {step === 'question-review' && !questionsError && !questionsReady && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <p className="text-sm text-gray-500">Generating your question bank...</p>
              </div>
            )}

            {step === 'question-review' && questionsError && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
                <p className="text-sm text-gray-700 font-medium text-center">{questionsError}</p>
                <button
                  onClick={() => {
                    setQuestionsError(null)
                    startBackgroundQuestions(assessmentContext, '', [])
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 duration-[120ms]"
                >
                  Try again
                </button>
              </div>
            )}

            {step === 'done' && (
              <DoneStep
                savedAgent={savedAgent}
                agentName={compiledAgentName ?? '...'}
                savePhase={savePhase}
                token={session?.access_token ?? ''}
                onConfigure={() => setStep('configure')}
                onClose={onClose}
              />
            )}

            {step === 'configure' && savedAgent && (
              <QnAConfigureView agent={savedAgent} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Evaluation step ────────────────────────────────────────────────────────────

interface EvaluationStepProps {
  compileReady: boolean
  onSubmit: (criteria: string) => void
}

function EvaluationStep({ compileReady, onSubmit }: EvaluationStepProps) {
  const [criteria, setCriteria] = useState('')

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto w-full space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">How should sessions be scored?</h3>
          <p className="text-sm text-gray-500">Define the evaluation criteria while your agent is being prepared in the background.</p>
        </div>

        <AnimatePresence>
          {!compileReady && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                <span className="text-xs text-indigo-500">Preparing agent prompt and questions in background...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          autoFocus
          value={criteria}
          onChange={e => setCriteria(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && criteria.trim()) onSubmit(criteria.trim())
          }}
          rows={4}
          placeholder="e.g. Focus on accuracy of answers, depth of explanation, clarity of communication, and how well the candidate reasons through unfamiliar scenarios..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
        />

        <button
          onClick={() => { if (criteria.trim()) onSubmit(criteria.trim()) }}
          disabled={!criteria.trim()}
          className={`w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
            criteria.trim()
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
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
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">QnA</span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isReady && isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <span className={`text-xs font-medium ${isReady && isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isReady ? (isLive ? 'Live' : 'Idle') : 'Creating...'}
              </span>
            </div>
          </div>
        </div>

        {/* Action tiles */}
        <motion.div
          className="grid grid-cols-2 gap-2 mb-3"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(liveUrl, 'live')}
            disabled={!isReady}
            className={`${tileBase} hover:border-emerald-300 hover:bg-emerald-50/50 ${isReady ? tileActive : tileMuted}`}
          >
            {copiedLive ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedLive ? 'Copied!' : 'Live link'}</span>
          </motion.button>

          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(testUrl, 'test')}
            disabled={!isReady}
            className={`${tileBase} hover:border-orange-300 hover:bg-orange-50/50 ${isReady ? tileActive : tileMuted}`}
          >
            {copiedTest ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-orange-400 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedTest ? 'Copied!' : 'Test link'}</span>
          </motion.button>

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
            <span className="text-sm text-gray-700 font-medium truncate">{isLive ? 'Set idle' : 'Set live'}</span>
          </motion.button>

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
