import { motion } from 'framer-motion'
import type { EvaluationReport } from '../../lib/api'

interface Props {
  report: EvaluationReport
  agentName: string
  userName: string
  turnCount: number
}

// ── Score color helper ─────────────────────────────────────────────────────────

function scoreColors(score: number): { bg: string; border: string; text: string; label: string } {
  if (score >= 9) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Excellent' }
  if (score >= 7) return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', label: 'Good' }
  if (score >= 5) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Fair' }
  return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', label: 'Needs work' }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportScreen({ report, agentName, userName, turnCount }: Props) {
  const scoreEntries = Object.entries(report.scoring)
  const avgScore =
    scoreEntries.length > 0
      ? scoreEntries.reduce((sum, [, v]) => sum + v, 0) / scoreEntries.length
      : 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-2xl"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Session Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {userName} · {agentName} · {turnCount} {turnCount === 1 ? 'exchange' : 'exchanges'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}</p>
            <p className="text-xs text-gray-400">avg score</p>
          </div>
        </div>

        {/* ── Summary ─────────────────────────────────────────────────────── */}
        {report.summary && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 mb-4">
            <SectionLabel>Overall</SectionLabel>
            <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
          </div>
        )}

        {/* ── Score heatmap ────────────────────────────────────────────────── */}
        {scoreEntries.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 mb-4">
            <SectionLabel>Scores</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {scoreEntries.map(([metric, score], i) => {
                const { bg, border, text, label } = scoreColors(score)
                return (
                  <motion.div
                    key={metric}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.06, ease: 'easeOut' }}
                    className={`${bg} ${border} border rounded-xl px-4 py-4 flex flex-col items-center text-center`}
                  >
                    <span className={`text-3xl font-bold ${text} leading-none`}>{score}</span>
                    <span className={`text-[10px] font-semibold mt-1 ${text} opacity-70 uppercase tracking-wide`}>{label}</span>
                    <span className="text-xs text-gray-500 mt-2 font-medium leading-tight">{metric}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Highlights ───────────────────────────────────────────────────── */}
        {report.highlights.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 mb-4">
            <SectionLabel>Highlights</SectionLabel>
            <ul className="space-y-2">
              {report.highlights.map((h, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  <span className="leading-relaxed">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Feedback ─────────────────────────────────────────────────────── */}
        {report.feedback.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 mb-4">
            <SectionLabel>Feedback</SectionLabel>
            <ul className="space-y-2">
              {report.feedback.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Transcript summary ───────────────────────────────────────────── */}
        {report.transcript_summary && (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5">
            <SectionLabel>Transcript Summary</SectionLabel>
            <p className="text-sm text-gray-600 leading-relaxed">{report.transcript_summary}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{children}</p>
  )
}
