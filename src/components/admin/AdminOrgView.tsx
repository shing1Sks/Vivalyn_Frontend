import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, ArrowLeft, Users, Clock, Cpu, Mic, Volume2 } from 'lucide-react'
import { fetchAdminOrgDetail } from '../../lib/api'
import type { AdminAgentSummary } from '../../lib/api'

interface Props {
  token: string
  agentspaceId: string
  orgName: string
  dateFrom: string
  dateTo: string
  excludeTest: boolean
  onSelectAgent: (agentId: string, agentName: string) => void
  onBack: () => void
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

export function AdminOrgView({ token, agentspaceId, orgName, dateFrom, dateTo, excludeTest, onSelectAgent, onBack }: Props) {
  const [agents, setAgents] = useState<AdminAgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchAdminOrgDetail(token, agentspaceId, dateFrom, dateTo, excludeTest)
      .then(setAgents)
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [token, agentspaceId, dateFrom, dateTo, excludeTest])

  const totals = agents.reduce(
    (acc, a) => ({
      sessions: acc.sessions + a.total_sessions,
      seconds: acc.seconds + a.total_session_seconds,
      llmIn: acc.llmIn + a.total_llm_conv_input_tokens,
      llmOut: acc.llmOut + a.total_llm_conv_output_tokens,
      stt: acc.stt + a.total_stt_seconds,
      tts: acc.tts + a.total_tts_chars,
    }),
    { sessions: 0, seconds: 0, llmIn: 0, llmOut: 0, stt: 0, tts: 0 },
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Total Sessions" value={totals.sessions.toLocaleString()} />
        <KpiCard icon={Clock} label="Session Hours" value={(totals.seconds / 3600).toFixed(1)} />
        <KpiCard
          icon={Cpu}
          label="LLM Tokens"
          value={((totals.llmIn + totals.llmOut) / 1000).toFixed(0) + 'k'}
        />
        <KpiCard icon={Mic} label="STT Minutes" value={(totals.stt / 60).toFixed(1)} />
        <KpiCard icon={Volume2} label="TTS Characters" value={totals.tts.toLocaleString()} />
      </div>

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
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM In</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">LLM Out</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">STT min</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">TTS chars</th>
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
    </div>
  )
}
