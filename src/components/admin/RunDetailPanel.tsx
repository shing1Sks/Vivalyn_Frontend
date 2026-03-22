import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchAdminRunDetail } from '../../lib/api'
import type { AdminRunDetail } from '../../lib/api'

interface Props {
  token: string
  runId: string | null
  onClose: () => void
}

function MetricRow({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{String(value)}</span>
    </div>
  )
}

function EvalReport({ report }: { report: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  if (!report || Object.keys(report).length === 0) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors duration-[120ms]"
      >
        <span className="text-sm font-semibold text-gray-900">Evaluation Report</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function RunDetailPanel({ token, runId, onClose }: Props) {
  const [run, setRun] = useState<AdminRunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setRun(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchAdminRunDetail(token, runId)
      .then(setRun)
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, runId])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (runId) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [runId, onClose])

  return (
    <AnimatePresence>
      {runId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">Run Detail</p>
                {run && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{run.run_id.slice(0, 16)}…</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-[120ms]"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 py-8 justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {run && (
                <>
                  {/* Meta */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-0">
                    <MetricRow label="Created" value={new Date(run.created_at).toLocaleString('en-IN')} />
                    <MetricRow label="User" value={run.user_name ? `${run.user_name} (${run.user_email})` : run.user_email} />
                    <MetricRow label="Type" value={run.is_test ? 'Test' : 'Live'} />
                    <MetricRow label="Turns" value={run.conversation_turns} />
                    <MetricRow label="Duration" value={`${run.session_duration_seconds.toFixed(1)}s`} />
                  </div>

                  {/* LLM */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">LLM — Conversation</p>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-0">
                      <MetricRow label="Model" value={run.llm_conv_model} />
                      <MetricRow label="Input tokens" value={run.llm_conv_input_tokens.toLocaleString()} />
                      <MetricRow label="Cached tokens" value={run.llm_conv_cached_tokens.toLocaleString()} />
                      <MetricRow label="Output tokens" value={run.llm_conv_output_tokens.toLocaleString()} />
                    </div>
                  </div>

                  {(run.llm_report_model || run.llm_report_input_tokens) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">LLM — Report</p>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-0">
                        <MetricRow label="Model" value={run.llm_report_model} />
                        <MetricRow label="Input tokens" value={run.llm_report_input_tokens?.toLocaleString() ?? null} />
                        <MetricRow label="Output tokens" value={run.llm_report_output_tokens?.toLocaleString() ?? null} />
                      </div>
                    </div>
                  )}

                  {/* STT */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Speech-to-Text</p>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-0">
                      <MetricRow label="Model" value={run.stt_model} />
                      <MetricRow label="Total seconds" value={run.stt_total_seconds.toFixed(2)} />
                      <MetricRow label="Calls" value={run.stt_calls} />
                    </div>
                  </div>

                  {/* TTS */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Text-to-Speech</p>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-0">
                      <MetricRow label="Model" value={run.tts_model} />
                      <MetricRow label="Total chars" value={run.tts_total_chars.toLocaleString()} />
                      <MetricRow label="Calls" value={run.tts_calls} />
                    </div>
                  </div>

                  {/* Transcript */}
                  {run.transcript && run.transcript.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Transcript</p>
                      <div className="space-y-2">
                        {run.transcript.map((msg, i) => {
                          const isUser = msg.role === 'user'
                          return (
                            <div
                              key={i}
                              className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                                  isUser
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-indigo-50 text-indigo-900'
                                }`}
                              >
                                <p className="text-xs font-medium mb-1 opacity-60">
                                  {isUser ? 'User' : 'Agent'}
                                </p>
                                <p className="leading-relaxed">{msg.content}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evaluation report */}
                  <EvalReport report={run.evaluation_report} />
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
