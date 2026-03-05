import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import type { PlanQuestion } from '../../../lib/api'

export type PlannerStatus = 'planning' | 'awaiting_answers' | 'compiling'

interface Props {
  seedPrompt: string
  status: PlannerStatus
  questions: PlanQuestion[]
  onAnswerAll: (answers: string[]) => void
}

export default function PlannerFlow({ seedPrompt, status, questions, onAnswerAll }: Props) {
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
          {status === 'planning' && (
            <motion.div
              key="planning"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center gap-3 py-4"
            >
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Analyzing your agent</p>
                <p className="text-xs text-gray-400 mt-0.5">Planning identity, behavior and guardrails…</p>
              </div>
            </motion.div>
          )}

          {status === 'awaiting_answers' && questions.length > 0 && (
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

          {status === 'compiling' && (
            <motion.div
              key="compiling"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-center gap-3 py-4"
            >
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Launching Prompt Compiler</p>
                <p className="text-xs text-gray-400 mt-0.5">Synthesising your agent specification…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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

  function handleAnswer(answer: string) {
    const next = [...answers, answer]
    if (next.length >= questions.length) {
      onComplete(next)
    } else {
      setAnswers(next)
      setCurrentIdx(prev => prev + 1)
    }
  }

  const currentQ = questions[currentIdx]

  return (
    <div className="space-y-3">
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
        label={`① ${question.suggestion1.statement}`}
        onClick={() => onAnswer(question.suggestion1.statement)}
      />
      <SuggestionButton
        label={`② ${question.suggestion2.statement}`}
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
          ③ Enter custom preference…
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
