import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { EvalMetric, EvaluationMetrics } from '../../../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  evalResult: EvaluationMetrics | null
  regenerating: boolean
  onResultChange: (metrics: EvaluationMetrics | null) => void
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

export default function EvaluationStep({ evalResult, regenerating, onResultChange }: Props) {
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
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Evaluation criteria</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review and adjust the metrics used to score each session.
        </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-emerald-600">Strong (5/5)</label>
                  <textarea
                    value={metric.strong}
                    onChange={e => updateMetric(i, 'strong', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-red-500">Weak (1/5)</label>
                  <textarea
                    value={metric.weak}
                    onChange={e => updateMetric(i, 'weak', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Skeleton + loading overlay */}
      {!evalResult && !regenerating && (
        <div className="min-h-[60vh] flex flex-col">
          {/* Sticky loader banner */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-0 py-3 flex items-center gap-3 mb-4">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <MorphingText phases={EVAL_PHASES} active={true} />
          </div>

          <div className="flex-1 select-none pointer-events-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
                    <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                      <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
