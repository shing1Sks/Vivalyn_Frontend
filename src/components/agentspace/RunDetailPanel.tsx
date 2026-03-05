import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle, ChevronRight, Loader2, MessageSquare, X } from 'lucide-react'
import { fetchRunRecordById, type EvaluationReport, type RunRecord } from '../../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────────

type TranscriptMsg = { role: string; content: string | Record<string, unknown>; timestamp: string }

function resolveContent(content: string | Record<string, unknown>): string {
  if (typeof content === 'string') return content
  // Structured content objects (e.g. {why, type, excerpt}) — show excerpt if available, else stringify
  if (typeof content === 'object' && content !== null) {
    if (typeof content.excerpt === 'string') return content.excerpt
    if (typeof content.text === 'string') return content.text
    if (typeof content.content === 'string') return content.content
    return JSON.stringify(content)
  }
  return String(content)
}
type TranscriptStatus = 'loading' | 'loaded' | 'error'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function avgScore(report: EvaluationReport | null): string {
  if (!report?.scoring) return '—'
  const vals = Object.values(report.scoring) as number[]
  if (!vals.length) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-red-500'
}

// ── Radar Chart ─────────────────────────────────────────────────────────────────

function RadarChart({ scoring }: { scoring: Record<string, number> }) {
  const entries = Object.entries(scoring)
  if (entries.length === 0) return null

  const size = 220
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 78
  const labelPadding = 22
  const n = entries.length

  function polar(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const angles = entries.map((_, i) => (360 / n) * i)
  const dataPoints = entries.map(([, score], i) => polar(angles[i], (score / 10) * maxRadius))
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background rings */}
      {[0.33, 0.66, 1.0].map((ratio, ri) => (
        <polygon
          key={ri}
          points={angles.map(a => { const p = polar(a, maxRadius * ratio); return `${p.x},${p.y}` }).join(' ')}
          fill="none"
          stroke={ratio === 1.0 ? '#e0e7ff' : '#f1f5f9'}
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {angles.map((angle, i) => {
        const end = polar(angle, maxRadius)
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth="1" />
      })}

      {/* Filled polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(79, 70, 229, 0.12)"
        stroke="#4f46e5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" />)}

      {/* Labels */}
      {entries.map(([metric], i) => {
        const lp = polar(angles[i], maxRadius + labelPadding)
        const angle = angles[i]
        const anchor: 'start' | 'middle' | 'end' =
          angle > 10 && angle < 170 ? 'start' : angle > 190 && angle < 350 ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="9.5"
            fill="#6b7280"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {metric.length > 14 ? metric.slice(0, 13) + '…' : metric}
          </text>
        )
      })}
    </svg>
  )
}

// ── Section label ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
      {children}
    </p>
  )
}

// ── Transcript bubble ────────────────────────────────────────────────────────────

function TranscriptBubble({ role, content, timestamp }: TranscriptMsg) {
  const isUser = role === 'user'
  const text = resolveContent(content)
  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-50 text-indigo-900 rounded-xl rounded-tr-sm'
            : 'bg-gray-100 text-gray-800 rounded-xl rounded-tl-sm'
        }`}
      >
        {text}
      </div>
      <span className="text-[10px] text-gray-400 px-1">
        {new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// ── Transcript panel ─────────────────────────────────────────────────────────────

interface TranscriptPanelProps {
  transcript: TranscriptMsg[]
  status: TranscriptStatus
  onClose: () => void
  onRetry: () => void
}

function TranscriptPanel({ transcript, status, onClose, onRetry }: TranscriptPanelProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed top-0 right-0 md:right-[500px] h-full w-full md:w-[420px] bg-white border-l border-gray-200 shadow-lg z-50 md:z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Transcript</span>
          {status === 'loaded' && transcript.length > 0 && (
            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums">
              {transcript.length} messages
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 duration-[120ms]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-gray-400">Failed to load transcript.</p>
            <button
              onClick={onRetry}
              className="text-xs text-indigo-600 hover:text-indigo-700 duration-[120ms]"
            >
              Try again
            </button>
          </div>
        )}
        {status === 'loaded' && (
          transcript.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No transcript available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transcript.map((msg, i) => (
                <TranscriptBubble key={i} {...msg} />
              ))}
            </div>
          )
        )}
      </div>
    </motion.div>
  )
}

// ── Main panel ──────────────────────────────────────────────────────────────────

export interface RunDetailPanelProps {
  run: RunRecord
  agentspaceId: string
  token: string
  onClose: () => void
}

export default function RunDetailPanel({ run, agentspaceId, token, onClose }: RunDetailPanelProps) {
  const report = run.evaluation_report
  const score = avgScore(report)

  const [transcriptData, setTranscriptData] = useState<TranscriptMsg[]>([])
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('loading')
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  function fetchTranscript() {
    setTranscriptStatus('loading')
    fetchRunRecordById(token, agentspaceId, run.id)
      .then(full => {
        setTranscriptData(full.transcript ?? [])
        setTranscriptStatus('loaded')
      })
      .catch(() => setTranscriptStatus('error'))
  }

  useEffect(() => {
    fetchTranscript()
  }, [run.id])

  function handleClose() {
    setTranscriptOpen(false)
    onClose()
  }

  return (
    <>
      {/* Detail panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">{run.user_name}</p>
            <p className="text-sm text-gray-500 truncate">{run.user_email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                {run.agent_name}
              </span>
              <span className="text-xs text-gray-400">{formatFullDate(run.created_at)}</span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  run.is_test ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {run.is_test ? 'Test' : 'Live'}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 duration-[120ms] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 flex flex-col gap-6">
            {report ? (
              <>
                {/* Overall score */}
                <div className="flex flex-col items-center gap-1">
                  <p className="text-4xl font-semibold text-gray-900 tabular-nums">{score}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Overall Score / 10</p>
                </div>

                {/* Radar chart */}
                {report.scoring && Object.keys(report.scoring).length > 0 && (
                  <div className="flex justify-center">
                    <RadarChart scoring={report.scoring} />
                  </div>
                )}

                {/* Per-metric chips */}
                {report.scoring && Object.keys(report.scoring).length > 0 && (
                  <div>
                    <SectionLabel>Scores</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(report.scoring).map(([metric, val]) => (
                        <div
                          key={metric}
                          className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
                        >
                          <span className="text-xs text-gray-500">{metric}</span>
                          <span className={`text-xs font-semibold ${scoreColor(val)}`}>{val}/10</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {report.summary && (
                  <div>
                    <SectionLabel>Summary</SectionLabel>
                    <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
                  </div>
                )}

                {/* Session overview */}
                {report.transcript_summary && (
                  <div>
                    <SectionLabel>Session Overview</SectionLabel>
                    <p className="text-sm text-gray-600 leading-relaxed">{report.transcript_summary}</p>
                  </div>
                )}

                {/* Highlights */}
                {report.highlights && report.highlights.length > 0 && (
                  <div>
                    <SectionLabel>Highlights</SectionLabel>
                    <ul className="space-y-2">
                      {report.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-700">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback */}
                {report.feedback && report.feedback.length > 0 && (
                  <div>
                    <SectionLabel>Areas to Improve</SectionLabel>
                    <ul className="space-y-2">
                      {report.feedback.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No evaluation report for this session.</p>
            )}

            {/* Transcript row — always shown */}
            <div>
              <SectionLabel>Transcript</SectionLabel>
              <button
                onClick={() => setTranscriptOpen(true)}
                disabled={transcriptStatus === 'loading' || transcriptStatus === 'error'}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] group"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  {transcriptStatus === 'loading' && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading…
                    </span>
                  )}
                  {transcriptStatus === 'error' && (
                    <span className="text-sm text-red-500">Failed to load —{' '}
                      <button
                        onClick={e => { e.stopPropagation(); fetchTranscript() }}
                        className="underline text-indigo-600"
                      >
                        retry
                      </button>
                    </span>
                  )}
                  {transcriptStatus === 'loaded' && (
                    <span className="text-sm text-gray-700">
                      View Transcript
                      <span className="ml-2 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full tabular-nums">
                        {transcriptData.length}
                      </span>
                    </span>
                  )}
                </div>
                {transcriptStatus === 'loaded' && (
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 duration-[120ms]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transcript panel */}
      <AnimatePresence>
        {transcriptOpen && (
          <TranscriptPanel
            transcript={transcriptData}
            status={transcriptStatus}
            onClose={() => setTranscriptOpen(false)}
            onRetry={fetchTranscript}
          />
        )}
      </AnimatePresence>
    </>
  )
}
