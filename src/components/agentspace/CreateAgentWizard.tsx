import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Loader2, Rocket, Settings2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  compileAgentPlan,
  planAgentSection,
  saveAgent,
  type Agent,
  type AgentPromptSpec,
  type CompileResult,
  type PlanQuestion,
} from '../../lib/api'
import LanguageVoiceSelector from './wizard/LanguageVoiceSelector'
import PlannerFlow, { type SectionState } from './wizard/PlannerFlow'
import AgentConfigureView from './wizard/AgentConfigureView'

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep =
  | 'language-voice'
  | 'prompt-input'
  | 'planning'
  | 'compiling'
  | 'done'
  | 'configure'

const PLAN_SECTIONS = [
  'Identity & Persona',
  'Task Definition',
  'Objective',
  'Transcript',
  'Guardrails',
] as const

const STEP_DOTS: WizardStep[] = ['language-voice', 'prompt-input', 'planning', 'done']

// ── plan_history helpers (mirror test_prompt_planning.py) ─────────────────────

function appendApproach(history: string, sectionName: string, approach: string): string {
  return history + `\n\n[Section: ${sectionName}]\nApproach: ${approach}`
}

function appendUserAnswer(history: string, queryStatement: string, answer: string): string {
  return history + `\n  Q: ${queryStatement}\n  A (user): ${answer}`
}

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
  const [selectedVoicePreference, setSelectedVoicePreference] = useState('')
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const [selectedPersonaName, setSelectedPersonaName] = useState('')
  const [seedPrompt, setSeedPrompt] = useState('')
  const [planHistoryRef] = useState({ current: '' })
  const [sections, setSections] = useState<SectionState[]>(
    PLAN_SECTIONS.map(name => ({
      name,
      status: 'pending',
      approach: '',
      questions: [] as PlanQuestion[],
      answeredCount: 0,
    })),
  )
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [isCompiling, setIsCompiling] = useState(false)
  const [finalSpec, setFinalSpec] = useState<CompileResult | null>(null)
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null)
  const [configuredSpec, setConfiguredSpec] = useState<AgentPromptSpec | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Track whether planning has kicked off (avoid double-trigger in strict mode)
  const planningStarted = useRef(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('language-voice')
      setSelectedLanguage('')
      setSelectedVoicePreference('')
      setSelectedVoiceName('')
      setSelectedPersonaName('')
      setSeedPrompt('')
      planHistoryRef.current = ''
      setSections(
        PLAN_SECTIONS.map(name => ({
          name,
          status: 'pending',
          approach: '',
          questions: [],
          answeredCount: 0,
        })),
      )
      setCurrentSectionIdx(0)
      setIsCompiling(false)
      setFinalSpec(null)
      setSavedAgent(null)
      setConfiguredSpec(null)
      setError(null)
      planningStarted.current = false
    }
  }, [open])

  // ── Planning loop ───────────────────────────────────────────────────────────

  const planSection = useCallback(async (idx: number, currentSeed: string) => {
    if (!session) return

    // Mark section as planning
    setSections(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], status: 'planning' }
      return next
    })

    try {
      const result = await planAgentSection(session.access_token, {
        seed_prompt: currentSeed,
        plan_history: planHistoryRef.current,
        section_name: PLAN_SECTIONS[idx],
      })

      // Append approach immediately
      planHistoryRef.current = appendApproach(
        planHistoryRef.current,
        PLAN_SECTIONS[idx],
        result.approach,
      )

      if (result.need_user_inputs && result.questions.length > 0) {
        // Show questions to user
        setSections(prev => {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            status: 'needs_input',
            approach: result.approach,
            questions: result.questions,
            answeredCount: 0,
          }
          return next
        })
        // Planning continues when user answers (see handleAnswerQuestion)
      } else {
        // No user input needed — mark done and plan next
        setSections(prev => {
          const next = [...prev]
          next[idx] = { ...next[idx], status: 'done', approach: result.approach }
          return next
        })
        const nextIdx = idx + 1
        setCurrentSectionIdx(nextIdx)
        if (nextIdx < PLAN_SECTIONS.length) {
          planSection(nextIdx, currentSeed)
        } else {
          runCompiler()
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Planning failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const runCompiler = useCallback(async () => {
    if (!session) return
    setIsCompiling(true)
    setStep('compiling')

    try {
      const spec = await compileAgentPlan(session.access_token, {
        plan_history: planHistoryRef.current,
      })
      setFinalSpec(spec)

      // Extract agent_name from compiler result; the rest are the 5 prompt sections
      const { agent_name, ...promptSections } = spec

      // Inject voice persona so the agent knows its name and character
      const agentPromptFull = {
        ...promptSections,
        voice_character: {
          name: `Your name is ${selectedPersonaName}.`,
          persona: `You are ${selectedPersonaName}. Introduce yourself by name at the start of each session and maintain a warm, natural conversational style throughout.`,
        },
      }
      setConfiguredSpec(agentPromptFull)

      // Auto-save agent
      const agent = await saveAgent(session.access_token, agentspaceId, {
        agent_name,
        agent_prompt: agentPromptFull,
        agent_language: selectedLanguage,
        agent_voice: selectedVoiceName,
      })
      setSavedAgent(agent)
      setIsCompiling(false)
      setStep('done')
    } catch (e: any) {
      setIsCompiling(false)
      setError(e?.message ?? 'Compilation failed. Please try again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentspaceId, selectedLanguage, selectedVoiceName, selectedPersonaName])

  // ── User answers a question ─────────────────────────────────────────────────

  function handleAnswerQuestion(sectionIdx: number, questionIdx: number, answer: string) {
    const section = sections[sectionIdx]
    const q = section.questions[questionIdx]

    // Append answer to history
    planHistoryRef.current = appendUserAnswer(
      planHistoryRef.current,
      q.query_statement,
      answer,
    )

    const newAnsweredCount = section.answeredCount + 1
    const allAnswered = newAnsweredCount >= section.questions.length

    setSections(prev => {
      const next = [...prev]
      next[sectionIdx] = {
        ...next[sectionIdx],
        answeredCount: newAnsweredCount,
        status: allAnswered ? 'done' : 'needs_input',
      }
      return next
    })

    if (allAnswered) {
      const nextIdx = sectionIdx + 1
      setCurrentSectionIdx(nextIdx)
      if (nextIdx < PLAN_SECTIONS.length) {
        planSection(nextIdx, seedPrompt)
      } else {
        runCompiler()
      }
    }
  }

  // ── Step handlers ───────────────────────────────────────────────────────────

  function handleLanguageVoiceContinue(lang: string, pref: string, voiceName: string, personaName: string) {
    setSelectedLanguage(lang)
    setSelectedVoicePreference(pref)
    setSelectedVoiceName(voiceName)
    setSelectedPersonaName(personaName)
    setStep('prompt-input')
  }

  function handlePromptSubmit() {
    if (!seedPrompt.trim()) return
    setStep('planning')
    if (!planningStarted.current) {
      planningStarted.current = true
      planSection(0, seedPrompt.trim())
    }
  }

  function handleBack() {
    if (step === 'prompt-input') setStep('language-voice')
    else if (step === 'planning') {/* can't go back mid-planning */}
    else if (step === 'done' || step === 'compiling') {/* no back */}
    else if (step === 'configure') setStep('done')
  }

  const canGoBack = step === 'prompt-input' || step === 'configure'

  if (!open) return null

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
                const isActive = step === s || (step === 'planning' && s === 'planning') || (step === 'compiling' && s === 'planning')
                const isPast = STEP_DOTS.indexOf(step) > i || step === 'compiling' || (step === 'done' && i < 3)
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
                className="overflow-hidden bg-red-50 border-b border-red-200"
              >
                <div className="px-6 py-3 flex items-center justify-between">
                  <p className="text-sm text-red-700">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
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

            {(step === 'planning' || step === 'compiling') && (
              <PlannerFlow
                seedPrompt={seedPrompt}
                sections={sections}
                isCompiling={step === 'compiling'}
                onAnswerQuestion={handleAnswerQuestion}
              />
            )}

            {step === 'done' && savedAgent && configuredSpec && (
              <DoneStep
                onConfigure={() => setStep('configure')}
              />
            )}

            {step === 'configure' && savedAgent && configuredSpec && (
              <AgentConfigureView
                spec={configuredSpec}
                agentId={savedAgent.id}
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
          <p className="text-xs text-gray-400 mt-1.5">Press ⌘Enter or click Launch to start</p>

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

function DoneStep({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-center max-w-sm"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Agent Ready</h2>
        <p className="text-sm text-gray-500 mb-8">
          Your training agent has been created and saved. You can configure its prompt sections or deploy it now.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfigure}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-indigo-300 text-indigo-700 font-medium text-sm hover:bg-indigo-50 duration-[120ms]"
          >
            <Settings2 className="w-4 h-4" />
            Configure Prompt
          </button>
          <button
            disabled
            title="Coming soon"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-gray-400 font-medium text-sm cursor-not-allowed"
          >
            <Rocket className="w-4 h-4" />
            Deploy
            <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 ml-1">Soon</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
