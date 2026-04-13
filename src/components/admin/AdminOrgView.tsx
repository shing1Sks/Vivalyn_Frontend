import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, ArrowLeft, Users, Clock, Cpu, Mic, Volume2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, FlaskConical } from 'lucide-react'
import { fetchAdminOrgDetail, fetchAdminOrgTokenTransactions } from '../../lib/api'
import type { AdminAgentSummary, TokenTransaction } from '../../lib/api'

interface Props {
  token: string
  agentspaceId: string
  orgName: string
  dateFrom: string
  dateTo: string
  excludeTest: boolean
  viewMode: 'usage' | 'tokens'
  onSelectAgent: (agentId: string, agentName: string) => void
  onBack: () => void
}

const TX_PAGE_SIZE = 20

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export function AdminOrgView({ token, agentspaceId, orgName, dateFrom, dateTo, excludeTest, viewMode, onSelectAgent, onBack }: Props) {
  const [agents, setAgents] = useState<AdminAgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [txOpen, setTxOpen] = useState(false)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchAdminOrgDetail(token, agentspaceId, dateFrom, dateTo, excludeTest)
      .then(setAgents)
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, agentspaceId, dateFrom, dateTo, excludeTest])

  useEffect(() => {
    if (!txOpen) return
    setTxLoading(true)
    setTxError(null)
    fetchAdminOrgTokenTransactions(token, agentspaceId, txPage, TX_PAGE_SIZE)
      .then((res) => { setTransactions(res.transactions); setTxTotal(res.total) })
      .catch((e) => setTxError(e.message ?? 'Failed to load'))
      .finally(() => setTxLoading(false))
  }, [token, agentspaceId, txOpen, txPage])

  const totals = agents.reduce(
    (acc, a) => ({
      sessions: acc.sessions + a.total_sessions,
      seconds: acc.seconds + a.total_session_seconds,
      llmIn: acc.llmIn + a.total_llm_conv_input_tokens,
      llmOut: acc.llmOut + a.total_llm_conv_output_tokens,
      stt: acc.stt + a.total_stt_seconds,
      tts: acc.tts + a.total_tts_chars,
      credits: acc.credits + Math.max(1, Math.ceil(a.total_session_seconds / 60)),
    }),
    { sessions: 0, seconds: 0, llmIn: 0, llmOut: 0, stt: 0, tts: 0, credits: 0 },
  )

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
          Overview
        </button>
        <span className="text-gray-300">/</span>
        <h2 className="text-base font-semibold text-gray-900">{orgName}</h2>
      </div>

      {/* KPI row */}
      {viewMode === 'usage' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={Users} label="Total Sessions" value={totals.sessions.toLocaleString()} />
          <KpiCard icon={Clock} label="Session Hours" value={(totals.seconds / 3600).toFixed(1)} />
          <KpiCard icon={Cpu} label="LLM Tokens" value={((totals.llmIn + totals.llmOut) / 1000).toFixed(0) + 'k'} />
          <KpiCard icon={Mic} label="STT Minutes" value={(totals.stt / 60).toFixed(1)} />
          <KpiCard icon={Volume2} label="TTS Characters" value={totals.tts.toLocaleString()} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={Users} label="Total Sessions" value={totals.sessions.toLocaleString()} />
          <KpiCard icon={Clock} label="Session Hours" value={(totals.seconds / 3600).toFixed(1)} />
          <KpiCard icon={Cpu} label="Credits Used" value={totals.credits.toLocaleString()} />
          <KpiCard icon={Mic} label="Credits / Session" value={totals.sessions ? (totals.credits / totals.sessions).toFixed(1) : '—'} />
          <KpiCard icon={Volume2} label="Agents" value={agents.length.toString()} />
        </div>
      )}

      {/* Agents table */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">
          No agents found for this period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Agents</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Agent</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Sessions</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Hrs</th>
                  {viewMode === 'usage' ? (
                    <>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM In</th>
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM Out</th>
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
                {agents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    onClick={() => onSelectAgent(agent.agent_id, agent.agent_name)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors duration-[120ms]"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{agent.agent_name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{agent.total_sessions}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {(agent.total_session_seconds / 3600).toFixed(1)}
                    </td>
                    {viewMode === 'usage' ? (
                      <>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(agent.total_llm_conv_input_tokens / 1000).toFixed(0)}k
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(agent.total_llm_conv_output_tokens / 1000).toFixed(0)}k
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(agent.total_stt_seconds / 60).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {agent.total_tts_chars.toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right font-medium text-indigo-700">
                        {Math.max(1, Math.ceil(agent.total_session_seconds / 60)).toLocaleString()}
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
        </div>
      )}

      {/* Token Transactions section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setTxOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors duration-[120ms]"
        >
          Token Transactions
          {txOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {txOpen && (
          <div className="border-t border-gray-100 px-5 py-4">
            {txLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              </div>
            )}
            {txError && <p className="text-sm text-red-500">{txError}</p>}
            {!txLoading && !txError && (
              <>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No transactions found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 py-2">Date</th>
                        <th className="text-left text-xs font-medium text-gray-500 py-2">Reason</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Delta</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Balance</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const isTest = tx.reason === 'test_session'
                        return (
                          <tr key={tx.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2.5 text-xs text-gray-500 whitespace-nowrap pr-4">
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isTest ? 'bg-gray-100' : tx.delta > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                  {isTest
                                    ? <FlaskConical className="w-2.5 h-2.5 text-gray-400" />
                                    : tx.delta > 0
                                      ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-600" />
                                      : <ArrowDownLeft className="w-2.5 h-2.5 text-red-500" />
                                  }
                                </div>
                                <span className="text-xs text-gray-700 capitalize">{tx.reason.replace(/_/g, ' ')}</span>
                                {isTest && (
                                  <span className="inline-flex items-center px-1.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                    Test
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`py-2.5 text-right font-medium tabular-nums text-sm pr-4 ${isTest ? 'text-gray-400' : tx.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isTest ? '0' : tx.delta > 0 ? `+${tx.delta}` : `${tx.delta}`}
                            </td>
                            <td className="py-2.5 text-right text-xs text-gray-500 tabular-nums pr-4">{tx.balance_after}</td>
                            <td className="py-2.5 text-right">
                              {tx.run_id ? (
                                <span className="text-xs text-indigo-600 font-mono">{tx.run_id.slice(0, 8)}…</span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                {Math.ceil(txTotal / TX_PAGE_SIZE) > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-xs text-gray-400">
                      Page {txPage} of {Math.ceil(txTotal / TX_PAGE_SIZE)} · {txTotal} total
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        disabled={txPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setTxPage((p) => Math.min(Math.ceil(txTotal / TX_PAGE_SIZE), p + 1))}
                        disabled={txPage === Math.ceil(txTotal / TX_PAGE_SIZE)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
