import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import type { AdminOverview, AdminOrgSummary } from '../../lib/api'
import { loadPricing } from './PricingCalculator'

interface Props {
  overview: AdminOverview
  orgs: AdminOrgSummary[]
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  fontSize: '12px',
  color: '#374151',
}

const COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706']

export function UsageCharts({ overview, orgs }: Props) {
  const pricing = loadPricing()

  // Sessions + revenue/cost over time — exact same calculation as PricingCalculator
  const timeData = overview.daily_series.map((d) => {
    const sessionMins = d.session_seconds / 60
    const costUsd =
      (d.llm_conv_input / 1_000_000) * pricing.llmConvInput +
      (d.llm_conv_cached / 1_000_000) * pricing.llmConvCached +
      (d.llm_conv_output / 1_000_000) * pricing.llmConvOutput +
      (d.llm_report_input / 1_000_000) * pricing.llmReportInput +
      (d.llm_report_output / 1_000_000) * pricing.llmReportOutput +
      (d.stt_seconds / 60) * pricing.sttPerMinute +
      (d.tts_chars / 1_000_000) * pricing.ttsPerMChars
    const costInr = Math.round(costUsd * pricing.usdToInr * 100) / 100
    const revenueInr = Math.round(sessionMins * pricing.sellingPricePerMinute * 100) / 100
    return {
      date: d.date.slice(5), // MM-DD
      sessions: d.sessions,
      cost: costInr,
      revenue: revenueInr,
    }
  })

  // Cost breakdown for pie
  const pieData = [
    { name: 'LLM Conv In', value: overview.total_llm_conv_input_tokens },
    { name: 'LLM Conv Out', value: overview.total_llm_conv_output_tokens },
    {
      name: 'LLM Report',
      value: overview.total_llm_report_input_tokens + overview.total_llm_report_output_tokens,
    },
    { name: 'STT secs', value: Math.round(overview.total_stt_seconds) },
    { name: 'TTS chars', value: overview.total_tts_chars },
  ].filter((d) => d.value > 0)

  // Top 8 orgs by sessions
  const orgData = [...orgs]
    .sort((a, b) => b.total_sessions - a.total_sessions)
    .slice(0, 8)
    .map((o) => ({ name: o.agentspace_name.slice(0, 14), sessions: o.total_sessions }))

  if (timeData.length === 0 && orgs.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Sessions over time — full width */}
      {timeData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Sessions Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue vs Cost over time — full width */}
      {timeData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Revenue vs Cost (₹)</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Cost
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [`₹${(v as number).toFixed(2)}`, name]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#f87171"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Cost"
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: Top orgs + Usage breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {orgData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Top Orgs by Sessions</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={orgData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={72} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="sessions" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Usage Breakdown</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [(value as number).toLocaleString(), name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} iconSize={8} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
