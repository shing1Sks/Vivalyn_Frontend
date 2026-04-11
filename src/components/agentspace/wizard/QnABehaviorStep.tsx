import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'

// ── Thinking panel ─────────────────────────────────────────────────────────────

const THINKING_MESSAGES = [
  'Building your assessor...',
  'Defining behavioral rules...',
  'Calibrating tone and style...',
  'Finalizing agent profile...',
]

function ThinkingPanel() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % THINKING_MESSAGES.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        Prompt Compiler
      </div>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-600 font-medium"
          >
            {THINKING_MESSAGES[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  isLoading: boolean
  onGenerate: (tone: string, feedbackMode: 'silent' | 'feedback') => void
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function QnABehaviorStep({ isLoading, onGenerate }: Props) {
  const [tone, setTone] = useState('')
  const [feedbackMode, setFeedbackMode] = useState<'silent' | 'feedback'>('silent')

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ThinkingPanel />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Configure the assessor</h2>
          <p className="text-sm text-gray-500 mb-6">
            Define how the agent sounds and behaves during the assessment.
          </p>

          {/* Tone input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assessor persona tone
            </label>
            <input
              autoFocus
              type="text"
              value={tone}
              onChange={e => setTone(e.target.value)}
              placeholder="e.g. formal examiner, friendly tutor, strict evaluator"
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
            />
          </div>

          {/* Feedback mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              After each answer, the agent should
            </label>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setFeedbackMode('silent')}
                className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left duration-[120ms] ${
                  feedbackMode === 'silent'
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  feedbackMode === 'silent' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Move on silently</p>
                  <p className="text-xs text-gray-500 mt-0.5">Acknowledge briefly and continue to the next question</p>
                </div>
              </button>

              <button
                onClick={() => setFeedbackMode('feedback')}
                className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left duration-[120ms] ${
                  feedbackMode === 'feedback'
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  feedbackMode === 'feedback' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Give brief feedback</p>
                  <p className="text-xs text-gray-500 mt-0.5">One sentence of targeted response before moving on</p>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => { if (tone.trim()) onGenerate(tone.trim(), feedbackMode) }}
            disabled={!tone.trim()}
            className={`w-full py-3 rounded-xl text-sm font-semibold duration-[120ms] flex items-center justify-center gap-2 ${
              tone.trim()
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Generate Agent
          </button>
        </div>
      </div>
    </div>
  )
}
