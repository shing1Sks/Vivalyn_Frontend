import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'
import type { EvalMetric, EvaluationMetrics } from '../../../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  evalResult: EvaluationMetrics | null
  regenerating: boolean
  onResultChange: (metrics: EvaluationMetrics | null) => void
  onRegenerate: () => void
}

const EVAL_PHASES = [
  'Generating evaluation criteria…',
  'Building scoring rubric…',
  'Creating report curator…',
  'Finalizing metrics…',
]

// ── MorphingText ───────────────────────────────────────────────────────────────

function MorphingText({ phases, active }: { phases: string[]; active: boolean }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setIdx(i => (i + 1) % phases.length)
    }, 1900)
    return () => clearInterval(interval)
  }, [active, phases.length])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="text-sm text-gray-500"
      >
        {phases[idx]}
      </motion.span>
    </AnimatePresence>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLegacyMetrics(metrics: EvaluationMetrics['metrics']): boolean {
  return metrics.length > 0 && typeof (metrics[0] as unknown as string) === 'string'
}

function toEvalMetrics(raw: EvaluationMetrics['metrics']): EvalMetric[] {
  if (isLegacyMetrics(raw)) return []
  return raw as EvalMetric[]
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function EvaluationStep({ evalResult, regenerating, onResultChange, onRegenerate }: Props) {
  const [editedMetrics, setEditedMetrics] = useState<EvalMetric[]>(() =>
    evalResult ? toEvalMetrics(evalResult.metrics) : []
  )
  const [editedCuratorPrompt, setEditedCuratorPrompt] = useState(() => evalResult?.report_curator_prompt ?? '')

  // Sync when result first arrives or replaced by regeneration
  const [lastResult, setLastResult] = useState(evalResult)
  if (evalResult !== lastResult) {
    setLastResult(evalResult)
    if (evalResult) {
      setEditedMetrics(toEvalMetrics(evalResult.metrics))
      setEditedCuratorPrompt(evalResult.report_curator_prompt)
    }
  }

  // Propagate edits to parent reactively
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!evalResult || editedMetrics.length !== 4 || !editedMetrics.every(m => m.name.trim())) {
      onResultChange(null)
      return
    }
    onResultChange({ report_curator_prompt: editedCuratorPrompt.trim(), metrics: editedMetrics })
  }, [editedMetrics, editedCuratorPrompt, evalResult])

  function updateMetric(i: number, field: keyof EvalMetric, value: string) {
    setEditedMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const isLegacy = evalResult ? isLegacyMetrics(evalResult.metrics) : false

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Evaluation criteria</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and adjust the metrics used to score each session.
          </p>
        </div>
        {evalResult && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 duration-[120ms] disabled:opacity-40 disabled:pointer-events-none mt-1"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
      </div>

      {/* Loading / regenerating overlay */}
      {regenerating && (
        <div className="border border-gray-200 rounded-xl p-8 flex flex-col items-center gap-4 mb-6">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <MorphingText phases={EVAL_PHASES} active={regenerating} />
        </div>
      )}

      {/* Legacy notice */}
      {evalResult && !regenerating && isLegacy && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          Generated before structured metrics were available. Regenerate to upgrade.
        </div>
      )}

      {/* Metric cards */}
      {evalResult && !regenerating && !isLegacy && (
        <div className="space-y-4">
          {editedMetrics.map((metric, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Metric {i + 1}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Name</label>
                <input
                  type="text"
                  value={metric.name}
                  onChange={e => updateMetric(i, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Definition</label>
                <textarea
                  value={metric.definition}
                  onChange={e => updateMetric(i, 'definition', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-emerald-600">Strong (5/5)</label>
                  <textarea
                    value={metric.strong}
                    onChange={e => updateMetric(i, 'strong', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-500">Weak (1/5)</label>
                  <textarea
                    value={metric.weak}
                    onChange={e => updateMetric(i, 'weak', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Report curator prompt
            </label>
            <textarea
              value={editedCuratorPrompt}
              onChange={e => setEditedCuratorPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!evalResult && !regenerating && (
        <div className="border border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-400">Preparing evaluation criteria…</p>
        </div>
      )}
    </div>
  )
}
