import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, CheckCircle2, ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import type { PlanQuestion } from '../../../lib/api'

// ── BlinkingCursor ─────────────────────────────────────────────────────────────

function BlinkingCursor() {
  return (
    <motion.span
      className="inline-block w-px h-[1em] bg-indigo-400 ml-0.5 align-middle"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// ── TypewriterMessage ──────────────────────────────────────────────────────────

type TypewriterPhase = 'typing' | 'holding' | 'erasing'

function TypewriterMessage({ messages }: { messages: string[] }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [phase, setPhase] = useState<TypewriterPhase>('typing')

  useEffect(() => {
    const msg = messages[msgIdx]

    if (phase === 'typing') {
      if (displayedText.length < msg.length) {
        const t = setTimeout(
          () => setDisplayedText(msg.slice(0, displayedText.length + 1)),
          45,
        )
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('holding'), 1400)
        return () => clearTimeout(t)
      }
    }

    if (phase === 'holding') {
      const t = setTimeout(() => setPhase('erasing'), 0)
      return () => clearTimeout(t)
    }

    if (phase === 'erasing') {
      setDisplayedText('')
      setMsgIdx(i => (i + 1) % messages.length)
      setPhase('typing')
    }
  }, [displayedText, phase, msgIdx, messages])

  return (
    <div className="flex items-center min-h-5">
      <span className="text-sm text-gray-700 font-medium">{displayedText}</span>
      <BlinkingCursor />
    </div>
  )
}

// ── AgentLabel ─────────────────────────────────────────────────────────────────

export type PlannerStatus =
  | 'planning'
  | 'awaiting_answers'
  | 'awaiting_evaluation'

interface Props {
  seedPrompt: string
  status: PlannerStatus
  questions: PlanQuestion[]
  compileReady: boolean
  onAnswerAll: (answers: string[]) => void
  onEvalSubmit: (criteria: string) => void
}

function AgentLabel() {
  return (
    <div className="flex items-center gap-1.5">
      <Brain className="w-3.5 h-3.5 text-indigo-400" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
        Planning Agent
      </span>
    </div>
  )
}

// ── Thinking panel (shared layout for planning / compiling / generating) ───────

const PLANNING_MESSAGES = [
  'Analyzing your description...',
  'Mapping behavior patterns...',
  'Planning session flow...',
  'Considering interaction rules...',
  'Defining guardrails...',
]

interface ThinkingPanelProps {
  messages: string[]
  hint?: string
}

function ThinkingPanel({ messages, hint }: ThinkingPanelProps) {
  return (
    <motion.div
      key="thinking"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-center gap-8 py-12"
    >
      <AgentLabel />
      <div className="flex flex-col items-center gap-2">
        <TypewriterMessage messages={messages} />
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PlannerFlow({ seedPrompt, status, questions, compileReady, onAnswerAll, onEvalSubmit }: Props) {
  const [revealingQuestions, setRevealingQuestions] = useState(false)
  const revealFired = useRef(false)

  useEffect(() => {
    if (status === 'awaiting_answers' && !revealFired.current) {
      revealFired.current = true
      setRevealingQuestions(true)
      const t = setTimeout(() => setRevealingQuestions(false), 1200)
      return () => clearTimeout(t)
    }
  }, [status])

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">

        {/* Seed prompt badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-800 font-medium leading-relaxed">{seedPrompt}</p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* Planning */}
          {status === 'planning' && (
            <ThinkingPanel
              key="planning"
              messages={PLANNING_MESSAGES}
              hint="Usually takes 10–15 seconds"
            />
          )}

          {/* Questions reveal interstitial */}
          {status === 'awaiting_answers' && revealingQuestions && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Brain className="w-4.5 h-4.5 text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">
                  I have {questions.length} question{questions.length !== 1 ? 's' : ''} to refine your agent
                </p>
                <p className="text-xs text-gray-500 mt-1">Select an option or type your own answer</p>
              </div>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4 text-indigo-300" />
              </motion.div>
            </motion.div>
          )}

          {/* Question flow */}
          {status === 'awaiting_answers' && !revealingQuestions && questions.length > 0 && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <QuestionFlow questions={questions} onComplete={onAnswerAll} />
            </motion.div>
          )}

          {/* Evaluation input */}
          {status === 'awaiting_evaluation' && (
            <motion.div
              key="eval"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <EvaluationForm compileReady={compileReady} onSubmit={onEvalSubmit} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Evaluation form ────────────────────────────────────────────────────────────

function EvaluationForm({ compileReady, onSubmit }: { compileReady: boolean; onSubmit: (criteria: string) => void }) {
  const [criteria, setCriteria] = useState('')

  function handleSubmit() {
    if (!criteria.trim()) return
    onSubmit(criteria.trim())
  }

  return (
    <div className="space-y-5">
      {/* Background compile indicator — fades out once compile finishes */}
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
              <span className="text-xs text-indigo-500">Preparing agent prompt in background…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Agent created. One last step.</h3>
        <p className="text-sm text-gray-500">How should sessions be evaluated?</p>
      </div>

      <textarea
        autoFocus
        value={criteria}
        onChange={e => setCriteria(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && criteria.trim()) handleSubmit()
        }}
        rows={4}
        placeholder="e.g. Focus on whether the candidate articulates reasoning clearly, handles objections with confidence, and demonstrates product knowledge throughout…"
        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none duration-[120ms]"
      />

      <button
        onClick={handleSubmit}
        disabled={!criteria.trim()}
        className={`w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
          criteria.trim()
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        Generate Evaluation Criteria
      </button>
    </div>
  )
}

// ── Question flow — answers one at a time, shows completed above ───────────────

interface QuestionFlowProps {
  questions: PlanQuestion[]
  onComplete: (answers: string[]) => void
}

function QuestionFlow({ questions, onComplete }: QuestionFlowProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [launching, setLaunching] = useState(false)

  function handleAnswer(answer: string) {
    const next = [...answers, answer]
    if (next.length >= questions.length) {
      setAnswers(next)
      setLaunching(true)
      setTimeout(() => onComplete(next), 500)
    } else {
      setAnswers(next)
      setCurrentIdx(prev => prev + 1)
    }
  }

  const currentQ = questions[currentIdx]
  const progress = (currentIdx / questions.length) * 100

  if (launching) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-center gap-3 py-4 px-4 bg-indigo-50 border border-indigo-100 rounded-xl"
      >
        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-indigo-800">Launching Prompt Compiler</p>
          <p className="text-xs text-indigo-500 mt-0.5">Synthesising your agent specification…</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {questions.length > 1 && (
        <div className="w-full h-0.5 bg-gray-100 rounded-full mb-1">
          <motion.div
            className="h-full bg-indigo-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Answered questions (locked) */}
      {answers.map((ans, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
        >
          {questions.length > 1 && (
            <p className="text-xs text-gray-400 mb-1">Question {i + 1} of {questions.length}</p>
          )}
          <p className="text-xs font-medium text-gray-500 mb-1">{questions[i].query_statement}</p>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-gray-700">{ans}</p>
          </div>
        </motion.div>
      ))}

      {/* Active question */}
      {currentQ && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm"
          >
            {questions.length > 1 && (
              <p className="text-xs text-indigo-400 font-medium mb-2">
                Question {currentIdx + 1} of {questions.length}
              </p>
            )}
            <p className="text-sm font-medium text-gray-800 mb-3">{currentQ.query_statement}</p>
            <QuestionCard question={currentQ} onAnswer={handleAnswer} />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

// ── Single question card with suggestions + custom input ──────────────────────

interface QuestionCardProps {
  question: PlanQuestion
  onAnswer: (answer: string) => void
}

function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  function handleCustomSubmit() {
    if (!customInput.trim()) return
    onAnswer(customInput.trim())
  }

  return (
    <div className="space-y-2">
      <SuggestionButton
        label={question.suggestion1.statement}
        onClick={() => onAnswer(question.suggestion1.statement)}
      />
      <SuggestionButton
        label={question.suggestion2.statement}
        onClick={() => onAnswer(question.suggestion2.statement)}
      />

      {showCustom ? (
        <div className="flex gap-2 mt-1">
          <input
            autoFocus
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            placeholder="Type your preference…"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customInput.trim()}
            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] flex items-center gap-1"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 duration-[120ms]"
        >
          Enter custom preference…
        </button>
      )}
    </div>
  )
}

function SuggestionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 duration-[120ms] transition-colors"
    >
      {label}
    </button>
  )
}
