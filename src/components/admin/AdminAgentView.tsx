import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, ArrowLeft, Users, Clock, Cpu, Mic, Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchAdminAgentDetail } from '../../lib/api'
import type { AdminAgentDetail, AdminRunSummary } from '../../lib/api'

interface Props {
  token: string
  agentId: string
  agentName: string
  dateFrom: string
  dateTo: string
  excludeTest: boolean
  viewMode: 'usage' | 'tokens'
  onSelectRun: (runId: string) => void
  onBack: () => void
}

function runCredits(sessionSeconds: number): number {
  return Math.max(1, Math.ceil(sessionSeconds / 60))
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function AdminAgentView({ token, agentId, agentName, dateFrom, dateTo, excludeTest, viewMode, onSelectRun, onBack }: Props) {
  const [data, setData] = useState<AdminAgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchAdminAgentDetail(token, agentId, dateFrom, dateTo, excludeTest, page, PAGE_SIZE)
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, agentId, dateFrom, dateTo, excludeTest, page])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [dateFrom, dateTo, excludeTest])

  const runs = data?.runs ?? []
  const totals = runs.reduce(
    (acc, r) => ({
      sessions: acc.sessions + 1,
      seconds: acc.seconds + r.session_duration_seconds,
      llmIn: acc.llmIn + r.llm_conv_input_tokens,
      llmOut: acc.llmOut + r.llm_conv_output_tokens,
      stt: acc.stt + r.stt_total_seconds,
      credits: acc.credits + runCredits(r.session_duration_seconds),
    }),
    { sessions: 0, seconds: 0, llmIn: 0, llmOut: 0, stt: 0, credits: 0 },
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-[120ms]"
        >
          <ArrowLeft className="w-4 h-4" />
          Org
        </button>
        <span className="text-gray-300">/</span>
        <h2 className="text-base font-semibold text-gray-900">{agentName}</h2>
        {data && (
          <span className="text-xs text-gray-400">{data.total} total runs</span>
        )}
      </div>

      {/* KPI row */}
      {viewMode === 'usage' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Sessions (page)" value={totals.sessions.toString()} />
          <KpiCard icon={Clock} label="Session Hours" value={(totals.seconds / 3600).toFixed(1)} />
          <KpiCard icon={Cpu} label="LLM Tokens" value={((totals.llmIn + totals.llmOut) / 1000).toFixed(0) + 'k'} />
          <KpiCard icon={Mic} label="STT Minutes" value={(totals.stt / 60).toFixed(1)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Sessions (page)" value={totals.sessions.toString()} />
          <KpiCard icon={Clock} label="Session Hours" value={(totals.seconds / 3600).toFixed(1)} />
          <KpiCard icon={Cpu} label="Credits Used" value={totals.credits.toLocaleString()} />
          <KpiCard icon={Mic} label="Credits / Session" value={totals.sessions ? (totals.credits / totals.sessions).toFixed(1) : '—'} />
        </div>
      )}

      {/* Runs table */}
      {runs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">
          No runs found for this period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">User</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-3 py-3">Type</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Turns</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Duration</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM In</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM Out</th>
                  {viewMode === 'usage' ? (
                    <>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">STT min</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">TTS chars</th>
                    </>
                  ) : (
                    <th className="text-right text-xs font-medium text-indigo-600 px-4 py-3">Credits</th>
                  )}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run: AdminRunSummary) => (
                  <tr
                    key={run.run_id}
                    onClick={() => onSelectRun(run.run_id)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors duration-[120ms]"
                  >
                    <td className="px-5 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(run.created_at)}</td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <p className="font-medium text-gray-900 truncate">{run.user_name || run.user_email}</p>
                      {run.user_name && (
                        <p className="text-xs text-gray-400 truncate">{run.user_email}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${run.is_test ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {run.is_test ? 'Test' : 'Live'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{run.conversation_turns}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {run.session_duration_seconds.toFixed(0)}s
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {(run.llm_conv_input_tokens / 1000).toFixed(1)}k
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {(run.llm_conv_output_tokens / 1000).toFixed(1)}k
                    </td>
                    {viewMode === 'usage' ? (
                      <>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(run.stt_total_seconds / 60).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {run.tts_total_chars.toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right font-medium text-indigo-700">
                        {runCredits(run.session_duration_seconds)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className="text-indigo-600 text-xs font-medium">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages} · {data?.total} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
