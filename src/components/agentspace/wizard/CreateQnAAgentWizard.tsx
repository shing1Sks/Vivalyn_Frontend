import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, BarChart2, Check, Copy, Link2, Loader2, Settings2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import {
  ApiError,
  compileQnAAgent,
  generateEvaluationCriteria,
  generateQnAQuestions,
  saveQnAAgent,
  toggleAgentStatus,
  type Agent,
  type QnACompileResult,
  type QnAPromptSpec,
  type QnAQuestionBank,
} from '../../../lib/api'
import LanguageVoiceSelector from './LanguageVoiceSelector'
import QnAResourceStep from './QnAResourceStep'
import QnAQuestionReview from './QnAQuestionReview'
import QnABehaviorStep from './QnABehaviorStep'
import QnAConfigureView from './QnAConfigureView'

// ── Types ──────────────────────────────────────────────────────────────────────

type QnAWizardStep =
  | 'language-voice'
  | 'resource-upload'
  | 'question-review'
  | 'behavior-config'
  | 'evaluation'
  | 'done'
  | 'configure'

type EvalStatus = 'idle' | 'generating'

const STEP_DOTS: QnAWizardStep[] = ['language-voice', 'resource-upload', 'question-review', 'behavior-config', 'done']

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
  const [questionBank, setQuestionBank] = useState<QnAQuestionBank | null>(null)
  const [compiledResult, setCompiledResult] = useState<QnACompileResult | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isCompilingAgent, setIsCompilingAgent] = useState(false)
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle')
  const [evalCriteria, setEvalCriteria] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubscriptionError, setIsSubscriptionError] = useState(false)

  // Prevent double triggers in strict mode
  const resourceStepStarted = useRef(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('language-voice')
      setSelectedLanguage('')
      setSelectedVoiceName('')
      setSelectedPersonaName('')
      setAssessmentContext('')
      setGeneratedQuestions([])
      setQuestionBank(null)
      setCompiledResult(null)
      setSavedAgent(null)
      setIsGeneratingQuestions(false)
      setIsCompilingAgent(false)
      setEvalStatus('idle')
      setEvalCriteria('')
      setError(null)
      setIsSubscriptionError(false)
      resourceStepStarted.current = false
    }
  }, [open])

  // ── Step handlers ────────────────────────────────────────────────────────────

  function handleLanguageVoiceContinue(lang: string, _pref: string, voiceName: string, personaName: string) {
    setSelectedLanguage(lang)
    setSelectedVoiceName(voiceName)
    setSelectedPersonaName(personaName)
    setStep('resource-upload')
  }

  const handleGenerateQuestions = useCallback(async (context: string, resourceText: string, resourceImages: string[]) => {
    if (!session) return
    setAssessmentContext(context)
    setIsGeneratingQuestions(true)
    setError(null)

    try {
      const result = await generateQnAQuestions(session.access_token, {
        context,
        resource_text: resourceText || undefined,
        resource_images: resourceImages.length > 0 ? resourceImages : undefined,
      })
      setGeneratedQuestions(result.questions)
      setStep('question-review')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Failed to generate questions. Please try again.')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }, [session])

  function handleQuestionBankReady(bank: QnAQuestionBank) {
    setQuestionBank(bank)
    setStep('behavior-config')
  }

  const handleGenerateAgent = useCallback(async (tone: string, feedbackMode: 'silent' | 'feedback') => {
    if (!session || !questionBank) return
    setIsCompilingAgent(true)
    setError(null)

    try {
      const result = await compileQnAAgent(session.access_token, {
        question_bank: questionBank,
        tone,
        feedback_mode: feedbackMode,
        session_context: assessmentContext,
      })
      setCompiledResult(result)
      setStep('evaluation')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined
      setError(msg ?? 'Failed to compile agent. Please try again.')
    } finally {
      setIsCompilingAgent(false)
    }
  }, [session, questionBank, assessmentContext])

  const handleEvalSubmit = useCallback(async () => {
    if (!session || !compiledResult || !evalCriteria.trim()) return
    setEvalStatus('generating')
    setError(null)

    try {
      const metrics = await generateEvaluationCriteria(session.access_token, {
        session_brief: compiledResult.session_brief,
        users_raw_evaluation_criteria: evalCriteria.trim(),
      })

      const { agent_name, ...promptSections } = compiledResult
      const agent = await saveQnAAgent(session.access_token, agentspaceId, {
        agent_name,
        agent_prompt: promptSections as QnAPromptSpec,
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
      setEvalStatus('idle')
    }
  }, [session, agentspaceId, compiledResult, evalCriteria, selectedLanguage, selectedVoiceName])

  function handleBack() {
    if (step === 'resource-upload') setStep('language-voice')
    else if (step === 'question-review') setStep('resource-upload')
    else if (step === 'behavior-config') setStep('question-review')
    else if (step === 'configure') setStep('done')
  }

  const canGoBack = ['resource-upload', 'question-review', 'behavior-config', 'configure'].includes(step)

  if (!open) return null

  const dotStepIdx = step === 'configure' ? STEP_DOTS.indexOf('done')
    : step === 'evaluation' ? STEP_DOTS.indexOf('done') - 1
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
              {/* QnA badge */}
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-500 bg-indigo-50 rounded-full px-2.5 py-1">
                QnA Agent
              </span>
              {/* Step dots */}
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

            {(step === 'resource-upload' || (step === 'question-review' && isGeneratingQuestions)) && (
              <QnAResourceStep
                language={selectedLanguage}
                personaName={selectedPersonaName}
                isLoading={isGeneratingQuestions}
                onGenerate={handleGenerateQuestions}
              />
            )}

            {step === 'question-review' && !isGeneratingQuestions && generatedQuestions.length > 0 && (
              <QnAQuestionReview
                initialQuestions={generatedQuestions}
                onContinue={handleQuestionBankReady}
              />
            )}

            {(step === 'behavior-config' || (step === 'evaluation' && isCompilingAgent)) && (
              <QnABehaviorStep
                isLoading={isCompilingAgent}
                onGenerate={handleGenerateAgent}
              />
            )}

            {step === 'evaluation' && !isCompilingAgent && compiledResult && (
              <EvaluationStep
                status={evalStatus}
                criteria={evalCriteria}
                onCriteriaChange={setEvalCriteria}
                onSubmit={handleEvalSubmit}
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

            {step === 'configure' && savedAgent && (
              <QnAConfigureView
                agent={savedAgent}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Evaluation step ────────────────────────────────────────────────────────────

interface EvaluationStepProps {
  status: EvalStatus
  criteria: string
  onCriteriaChange: (v: string) => void
  onSubmit: () => void
}

function EvaluationStep({ status, criteria, onCriteriaChange, onSubmit }: EvaluationStepProps) {
  const isGenerating = status === 'generating'

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
          Evaluation Agent
        </div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Finalising evaluation framework...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto w-full space-y-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Agent ready. One last step.</h3>
          <p className="text-sm text-gray-500">How should assessment sessions be scored?</p>
        </div>

        <textarea
          autoFocus
          value={criteria}
          onChange={e => onCriteriaChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && criteria.trim()) onSubmit()
          }}
          rows={4}
          placeholder="e.g. Focus on accuracy of answers, depth of explanation, clarity of communication, and how well the candidate reasons through unfamiliar scenarios..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
        />

        <button
          onClick={onSubmit}
          disabled={!criteria.trim()}
          className={`w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
            criteria.trim()
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Save Agent
        </button>
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
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{savedAgent.agent_name}</h2>
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
            className={tileClass}
          >
            {copiedLive ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Link2 className="w-4 h-4 text-gray-400 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedLive ? 'Copied!' : 'Live link'}</span>
          </motion.button>

          <motion.button
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
            onClick={() => copyLink(testUrl, 'test')}
            className={tileClass}
          >
            {copiedTest ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 shrink-0" />}
            <span className="text-sm text-gray-700 font-medium truncate">{copiedTest ? 'Copied!' : 'Test link'}</span>
          </motion.button>

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
            <span className="text-sm text-gray-700 font-medium truncate">{isLive ? 'Set idle' : 'Set live'}</span>
          </motion.button>

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
