import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Loader, RefreshCw } from 'lucide-react'
import type { EvalInputs } from '../../../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  agentName: string
  participantRole: string
  compileStatus: 'running' | 'done' | 'error'
  onRetryCompile: () => void
  onSubmit: (inputs: EvalInputs) => void
  initialValues?: EvalInputs
}

// ── Suggestion chips ───────────────────────────────────────────────────────────

const COMPETENCY_CHIPS = [
  'Communication clarity and structure',
  'Subject knowledge and accuracy',
  'Critical thinking and reasoning',
  'Confidence and professional presence',
  'Problem-solving approach',
]

const STRONG_CHIPS = [
  'Gives structured, well-reasoned answers with supporting evidence',
  'Demonstrates in-depth subject knowledge without prompting',
  'Responds confidently under pressure and handles follow-up questions',
  'Communicates clearly and adapts language to the context',
  'Shows initiative and asks insightful clarifying questions',
]

const WEAK_CHIPS = [
  'Gives vague or unsupported answers without reasoning',
  'Struggles to apply knowledge to the specific context',
  'Becomes hesitant or loses composure under probing',
  'Uses filler words frequently and lacks structured delivery',
  'Cannot engage with follow-up questions or unexpected scenarios',
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function EvaluationStep({
  agentName,
  participantRole,
  compileStatus,
  onRetryCompile,
  onSubmit,
  initialValues,
}: Props) {
  const [competency, setCompetency] = useState(initialValues?.competency ?? '')
  const [strong, setStrong] = useState(initialValues?.strong_performance ?? '')
  const [weak, setWeak] = useState(initialValues?.weak_performance ?? '')
  const [additional, setAdditional] = useState(initialValues?.additional ?? '')

  const canSubmit =
    compileStatus !== 'running' && competency.trim() && strong.trim() && weak.trim()

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({
      competency: competency.trim(),
      strong_performance: strong.trim(),
      weak_performance: weak.trim(),
      additional: additional.trim() || undefined,
    })
  }

  const displayName = agentName || 'the agent'
  const displayRole = participantRole || 'the participant'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          How should {displayName} evaluate {displayRole}?
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Define what good and weak performance look like so {displayName} can generate meaningful feedback.
        </p>
      </div>

      {/* Compile status banner */}
      <div className="px-8">
        <AnimatePresence>
          {compileStatus === 'running' && (
            <motion.div
              key="running"
              className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <Loader size={15} className="animate-spin flex-shrink-0" />
              <span>Preparing agent in the background&hellip;</span>
            </motion.div>
          )}
          {compileStatus === 'error' && (
            <motion.div
              key="error"
              className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>Could not prepare agent.</span>
              <button
                onClick={onRetryCompile}
                className="ml-auto flex items-center gap-1.5 text-red-600 font-medium hover:text-red-800 transition-colors duration-[120ms]"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
        {/* Competency */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            What is being evaluated?
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Name the core skill or competency this session is assessing
          </p>
          <textarea
            value={competency}
            onChange={e => setCompetency(e.target.value)}
            placeholder="e.g. Oral defence of research methodology and academic argument"
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMPETENCY_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setCompetency(chip)}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-full border border-gray-200 hover:border-indigo-200 transition-colors duration-[120ms]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Strong performance */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            What does strong performance look like?
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Describe what an excellent response or outcome looks like in this session
          </p>
          <textarea
            value={strong}
            onChange={e => setStrong(e.target.value)}
            placeholder="e.g. Gives structured, well-reasoned answers and defends their position confidently under follow-up"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {STRONG_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setStrong(chip)}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-full border border-gray-200 hover:border-green-200 transition-colors duration-[120ms]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Weak performance */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            What does weak performance look like?
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Describe what a poor or insufficient response looks like
          </p>
          <textarea
            value={weak}
            onChange={e => setWeak(e.target.value)}
            placeholder="e.g. Gives vague answers without reasoning, struggles with follow-up questions, or loses composure under pressure"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {WEAK_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setWeak(chip)}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-full border border-gray-200 hover:border-red-200 transition-colors duration-[120ms]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Additional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional criteria{' '}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={additional}
            onChange={e => setAdditional(e.target.value)}
            placeholder="Any other specific things to assess or penalise..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-[120ms]"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="px-8 pb-8 pt-4 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-all duration-[120ms] ${
            canSubmit
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {compileStatus === 'running' ? 'Preparing agent...' : 'Generate metrics'}
        </button>
      </div>
    </div>
  )
}
