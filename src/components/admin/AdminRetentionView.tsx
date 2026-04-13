import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CheckCircle, Clock, Loader2, TrendingDown, XCircle } from 'lucide-react'
import { fetchAdminRetention, type AdminRetentionOrg, type AdminRetentionData } from '../../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMonth(ym: string): string {
  // "2026-04" → "Apr '26"
  const [y, m] = ym.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  trial: 'bg-indigo-50 text-indigo-600 border-indigo-200',
}

const PLAN_STYLE: Record<string, string> = {
  trial: 'bg-indigo-50 text-indigo-600',
  starter: 'bg-blue-50 text-blue-600',
  growth: 'bg-violet-50 text-violet-600',
  pro: 'bg-emerald-50 text-emerald-700',
}

function StatusBadge({ status, expiringSoon }: { status: string; expiringSoon: boolean }) {
  if (expiringSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Expiring soon
      </span>
    )
  }
  const cls = STATUS_STYLE[status] ?? STATUS_STYLE.inactive
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls} capitalize`}>
      {status}
    </span>
  )
}

function PlanBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-gray-400">—</span>
  const cls = PLAN_STYLE[tier] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {tier}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminRetentionView({ token }: { token: string }) {
  const [data, setData] = useState<AdminRetentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchAdminRetention(token)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load retention data.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-red-500">{error || 'No data.'}</p>
      </div>
    )
  }

  const { orgs, monthly_sessions } = data

  // Summary counts
  const activeCount = orgs.filter(o => o.status === 'active' && !o.expiring_soon).length
  const expiringSoonCount = orgs.filter(o => o.expiring_soon).length
  const expiredCount = orgs.filter(o => o.status === 'expired' || o.status === 'cancelled').length
  const trialCount = orgs.filter(o => o.plan_tier === 'trial' && o.status === 'active').length

  const chartData = monthly_sessions.map(row => ({
    month: fmtMonth(row.month),
    sessions: row.count,
  }))

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Retention</h1>
        <p className="text-sm text-gray-500 mt-0.5">Subscription health and usage activity across all organisations.</p>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active" value={activeCount} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Expiring soon" value={expiringSoonCount} icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
        <StatCard label="Expired / churned" value={expiredCount} icon={XCircle} color="bg-red-50 text-red-500" />
        <StatCard label="Trial" value={trialCount} icon={Clock} color="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Monthly sessions chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Sessions per month (last 6 months, live only)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: 'none' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="sessions" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Org table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Organisation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">30d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">60d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">90d sessions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No subscriptions yet.</td>
                </tr>
              ) : (
                orgs.map(org => <OrgRow key={org.agentspace_id} org={org} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Org row ───────────────────────────────────────────────────────────────────

function OrgRow({ org }: { org: AdminRetentionOrg }) {
  const days = daysUntil(org.period_end)
  const isChurned = org.status === 'expired' || org.status === 'cancelled'
  const wasActive = (org.sessions_last_90d ?? 0) > 0

  return (
    <tr className={`hover:bg-gray-50 duration-[120ms] ${isChurned && wasActive ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isChurned && wasActive && (
            <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <span className="font-medium text-gray-800 truncate max-w-[180px]">{org.agentspace_name || org.agentspace_id}</span>
        </div>
      </td>
      <td className="px-4 py-3"><PlanBadge tier={org.plan_tier} /></td>
      <td className="px-4 py-3"><StatusBadge status={org.status} expiringSoon={org.expiring_soon} /></td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {fmtDate(org.period_start)}
        {' → '}
        {org.period_end ? (
          <span className={days !== null && days <= 7 && days >= 0 ? 'text-amber-600 font-medium' : ''}>
            {fmtDate(org.period_end)}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-600">{org.sessions_last_30d}</td>
      <td className="px-4 py-3 text-right text-xs text-gray-600">{org.sessions_last_60d}</td>
      <td className="px-4 py-3 text-right text-xs text-gray-600">{org.sessions_last_90d}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(org.last_session_at)}</td>
    </tr>
  )
}
