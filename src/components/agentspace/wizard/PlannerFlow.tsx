import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import type { PlanQuestion } from '../../../lib/api'

export type SectionStatus = 'pending' | 'planning' | 'needs_input' | 'done'

export interface SectionState {
  name: string
  status: SectionStatus
  approach: string
  questions: PlanQuestion[]
  answeredCount: number
}

interface Props {
  seedPrompt: string
  sections: SectionState[]
  isCompiling: boolean
  onAnswerQuestion: (sectionIdx: number, questionIdx: number, answer: string) => void
}

const SECTION_ICONS: Record<SectionStatus, JSX.Element> = {
  pending: <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />,
  planning: <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />,
  needs_input: (
    <span className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-amber-600">?</span>
    </span>
  ),
  done: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
}

export default function PlannerFlow({ seedPrompt, sections, isCompiling, onAnswerQuestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [sections, isCompiling])

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

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400 font-medium">Planning agent sections</span>
            <span className="text-xs text-gray-400">
              {sections.filter(s => s.status === 'done').length} / {sections.length}
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(sections.filter(s => s.status === 'done').length / sections.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Section timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-5 bottom-5 w-px bg-gray-200" />

          <div className="space-y-5">
            {sections.map((section, idx) => (
              <SectionRow
                key={section.name}
                section={section}
                idx={idx}
                onAnswerQuestion={onAnswerQuestion}
              />
            ))}

            {/* Compiler row */}
            <AnimatePresence>
              {isCompiling && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex items-start gap-3 pl-1"
                >
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Launching Prompt Compiler</p>
                    <p className="text-xs text-gray-400 mt-0.5">Synthesising your agent specification…</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Individual section row ─────────────────────────────────────────────────────

interface SectionRowProps {
  section: SectionState
  idx: number
  onAnswerQuestion: (sectionIdx: number, questionIdx: number, answer: string) => void
}

function SectionRow({ section, idx, onAnswerQuestion }: SectionRowProps) {
  const { name, status, approach, questions, answeredCount } = section
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Reset custom input state when the current question advances
  useEffect(() => {
    setCustomInput('')
    setShowCustom(false)
  }, [answeredCount])

  const currentQ = questions[answeredCount] ?? null

  function handleChoice(answer: string) {
    onAnswerQuestion(idx, answeredCount, answer)
  }

  function handleCustomSubmit() {
    if (!customInput.trim()) return
    handleChoice(customInput.trim())
    setCustomInput('')
    setShowCustom(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: idx * 0.04 }}
      className="flex items-start gap-3 pl-1"
    >
      {/* Icon */}
      <div className="mt-0.5 relative z-10 bg-white">
        {SECTION_ICONS[status]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${
            status === 'done' ? 'text-gray-500' :
            status === 'planning' ? 'text-gray-900' :
            status === 'needs_input' ? 'text-amber-700' :
            'text-gray-400'
          }`}>
            {name}
          </p>
          {status === 'planning' && (
            <span className="text-xs text-indigo-500 font-medium">Planning…</span>
          )}
          {status === 'needs_input' && (
            <span className="text-xs text-amber-500 font-medium">Input needed</span>
          )}
          {status === 'done' && (
            <span className="text-xs text-emerald-500 font-medium">Done</span>
          )}
        </div>

        {/* Approach snippet */}
        <AnimatePresence>
          {approach && (
            <motion.div
              initial={{ opacity: 0, y: 4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-gray-500 leading-relaxed">
                  {approach.slice(0, 160)}{approach.length > 160 ? '…' : ''}
                  {status === 'planning' && (
                    <BlinkCursor />
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current question card — one at a time */}
        <AnimatePresence mode="wait">
          {status === 'needs_input' && currentQ && (
            <motion.div
              key={answeredCount}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mt-3 bg-white border border-indigo-200 rounded-xl p-4 shadow-sm"
            >
              {/* Progress indicator if multiple questions */}
              {questions.length > 1 && (
                <p className="text-xs text-indigo-400 font-medium mb-2">
                  Question {answeredCount + 1} of {questions.length}
                </p>
              )}

              <p className="text-sm font-medium text-gray-800 mb-3">{currentQ.query_statement}</p>

              <div className="space-y-2">
                <SuggestionButton
                  label={`① ${currentQ.suggestion1.statement}`}
                  onClick={() => handleChoice(currentQ.suggestion1.statement)}
                />
                <SuggestionButton
                  label={`② ${currentQ.suggestion2.statement}`}
                  onClick={() => handleChoice(currentQ.suggestion2.statement)}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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

function BlinkCursor() {
  return (
    <span
      className="inline-block w-[2px] h-3 bg-gray-400 ml-0.5 align-middle animate-pulse"
      style={{ animationDuration: '0.8s' }}
    />
  )
}
