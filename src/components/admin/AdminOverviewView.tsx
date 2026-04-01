import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, Users, Clock, Cpu, Mic, Volume2 } from 'lucide-react'
import { fetchAdminOverview, fetchAdminOrgs, fetchTokenBalance } from '../../lib/api'
import type { AdminOverview, AdminOrgSummary, TokenBalance } from '../../lib/api'
import { PricingCalculator } from './PricingCalculator'
import { UsageCharts } from './UsageCharts'

interface Props {
  token: string
  dateFrom: string
  dateTo: string
  excludeTest: boolean
  viewMode: 'usage' | 'tokens'
  onSelectOrg: (orgId: string, orgName: string) => void
}

function OrgRingGauge({ balance, lowThreshold }: { balance: number; lowThreshold: number }) {
  const color =
    balance > lowThreshold * 3 ? '#16a34a'
    : balance > lowThreshold ? '#d97706'
    : '#dc2626'
  const fullMark = Math.max(lowThreshold * 20, balance + 1)
  const pct = Math.min(1, balance / fullMark)
  const r = 9
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
      <circle cx="11" cy="11" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
      <circle
        cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 11 11)"
      />
    </svg>
  )
}

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

export function AdminOverviewView({ token, dateFrom, dateTo, excludeTest, viewMode, onSelectOrg }: Props) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [orgs, setOrgs] = useState<AdminOrgSummary[]>([])
  const [orgBalances, setOrgBalances] = useState<Record<string, TokenBalance>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchAdminOverview(token, dateFrom, dateTo, excludeTest),
      fetchAdminOrgs(token, dateFrom, dateTo, excludeTest),
    ])
      .then(([ov, os]) => {
        setOverview(ov)
        setOrgs(os)
        // Batch-fetch token balances for all orgs
        Promise.all(
          os.map((o) =>
            fetchTokenBalance(token, o.agentspace_id)
              .then((b) => ({ id: o.agentspace_id, b }))
              .catch(() => ({ id: o.agentspace_id, b: { balance: 0, low_balance_threshold: 10, updated_at: null } }))
          )
        ).then((results) => {
          const map: Record<string, TokenBalance> = {}
          results.forEach(({ id, b }) => { map[id] = b })
          setOrgBalances(map)
        })
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, dateFrom, dateTo, excludeTest])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="flex items-center gap-2 py-20 justify-center text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">{error ?? 'No data'}</span>
      </div>
    )
  }

  const sessionHours = (overview.total_session_seconds / 3600).toFixed(1)
  const sttMinutes = (overview.total_stt_seconds / 60).toFixed(1)
  const totalLlmTokens = (
    overview.total_llm_conv_input_tokens +
    overview.total_llm_conv_output_tokens +
    overview.total_llm_report_input_tokens +
    overview.total_llm_report_output_tokens
  ).toLocaleString()
  const totalCredits = orgs.reduce((sum, o) =>
    sum + Math.max(1, Math.ceil(o.total_session_seconds / 60)), 0)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {viewMode === 'usage' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={Users}
            label="Total Sessions"
            value={overview.total_sessions.toLocaleString()}
            sub={`${overview.live_sessions} live · ${overview.test_sessions} test`}
          />
          <KpiCard icon={Clock} label="Session Hours" value={sessionHours} sub="total duration" />
          <KpiCard icon={Cpu} label="LLM Tokens" value={totalLlmTokens} sub={`${overview.total_llm_conv_cached_tokens.toLocaleString()} cached`} />
          <KpiCard icon={Mic} label="STT Minutes" value={sttMinutes} sub={`${overview.total_stt_calls.toLocaleString()} calls`} />
          <KpiCard icon={Volume2} label="TTS Characters" value={overview.total_tts_chars.toLocaleString()} sub={`${overview.total_tts_calls.toLocaleString()} calls`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={Users} label="Total Sessions" value={overview.total_sessions.toLocaleString()} sub={`${overview.live_sessions} live · ${overview.test_sessions} test`} />
          <KpiCard icon={Clock} label="Session Hours" value={sessionHours} sub="total duration" />
          <KpiCard icon={Cpu} label="Total Credits Used" value={totalCredits.toLocaleString()} sub="across all orgs" />
          <KpiCard icon={Mic} label="Avg Credits/Session" value={overview.total_sessions ? (totalCredits / overview.total_sessions).toFixed(1) : '—'} />
          <KpiCard icon={Volume2} label="Orgs Tracked" value={orgs.length.toString()} />
        </div>
      )}

      {/* Pricing calculator */}
      <PricingCalculator overview={overview} />

      {/* Charts */}
      <UsageCharts overview={overview} orgs={orgs} />

      {/* Orgs table */}
      {orgs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Organizations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Org</th>
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
                    <>
                      <th className="text-right text-xs font-medium text-indigo-600 px-4 py-3">Credits Used</th>
                      <th className="text-right text-xs font-medium text-indigo-600 px-4 py-3">Balance</th>
                    </>
                  )}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const bal = orgBalances[org.agentspace_id]
                  const creditsUsed = Math.max(1, Math.ceil(org.total_session_seconds / 60))
                  return (
                    <tr
                      key={org.agentspace_id}
                      onClick={() => onSelectOrg(org.agentspace_id, org.agentspace_name)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors duration-[120ms]"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{org.agentspace_name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{org.total_sessions}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {(org.total_session_seconds / 3600).toFixed(1)}
                      </td>
                      {viewMode === 'usage' ? (
                        <>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {(org.total_llm_conv_input_tokens / 1000).toFixed(0)}k
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {(org.total_llm_conv_output_tokens / 1000).toFixed(0)}k
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {(org.total_stt_seconds / 60).toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {org.total_tts_chars.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-medium text-indigo-700">
                            {creditsUsed.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {bal ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <OrgRingGauge balance={bal.balance} lowThreshold={bal.low_balance_threshold} />
                                <span className="text-sm font-medium tabular-nums text-gray-700">{bal.balance.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right">
                        <span className="text-indigo-600 text-xs font-medium">View</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
