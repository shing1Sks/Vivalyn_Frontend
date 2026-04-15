import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, CheckCircle, Clock, Loader2, TrendingDown, XCircle } from 'lucide-react'
import {
  fetchAdminRetention,
  type AdminRetentionOrg,
  type AdminRetentionData,
  type SubscriptionEvent,
} from '../../lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { trial: 1, starter: 2, growth: 3, pro: 4 }
const TIER_LABELS: Record<number, string> = { 1: 'Trial', 2: 'Starter', 3: 'Growth', 4: 'Pro' }

const LINE_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
]

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// Build a "YYYY-MM" → tier rank map for a single org from its events
function buildOrgTierByMonth(events: SubscriptionEvent[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const ev of events) {
    const ym = ev.created_at.slice(0, 7)
    const rank = TIER_RANK[ev.plan_tier] ?? 0
    // keep the latest event rank for each month
    if (!map.has(ym) || rank > 0) map.set(ym, rank)
  }
  return map
}

// Given a sorted list of "YYYY-MM" keys and an org's event-by-month map,
// resolve the org's tier rank at each month (carry-forward the last known tier)
function resolveTimeline(months: string[], tierByMonth: Map<string, number>): (number | null)[] {
  let current: number | null = null
  return months.map(ym => {
    if (tierByMonth.has(ym)) current = tierByMonth.get(ym)!
    return current
  })
}

// Get all YYYY-MM strings from earliest event date to current month
function buildMonthRange(orgs: AdminRetentionOrg[]): string[] {
  let earliest: string | null = null
  for (const org of orgs) {
    for (const ev of org.events) {
      const ym = ev.created_at.slice(0, 7)
      if (!earliest || ym < earliest) earliest = ym
    }
  }
  if (!earliest) return []

  const months: string[] = []
  const now = new Date()
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let cur = earliest
  while (cur <= currentYm) {
    months.push(cur)
    const [y, m] = cur.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    cur = next
  }
  return months
}

// ── Badges ────────────────────────────────────────────────────────────────────

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

// ── Plan tier timeline chart ───────────────────────────────────────────────────

function PlanTierTimeline({ orgs }: { orgs: AdminRetentionOrg[] }) {
  const orgsWithEvents = orgs.filter(o => o.events.length > 0)
  if (orgsWithEvents.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-1">Plan tier history</p>
        <p className="text-xs text-gray-400 mb-6">Per-org plan progression over time</p>
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-gray-400">
            No plan history yet — events will appear here after the first renewal or upgrade.
          </p>
        </div>
      </div>
    )
  }

  const months = buildMonthRange(orgsWithEvents)
  if (months.length === 0) return null

  // Build chart data: [{month, orgName1: tierRank, orgName2: tierRank, ...}]
  const orgTierMaps = orgsWithEvents.map(org => buildOrgTierByMonth(org.events))
  const chartData = months.map((ym, i) => {
    const point: Record<string, string | number | null> = { month: fmtMonth(ym) }
    orgsWithEvents.forEach((org, j) => {
      const timeline = resolveTimeline(months, orgTierMaps[j])
      point[org.agentspace_name || org.agentspace_id] = timeline[i]
    })
    return point
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm font-medium text-gray-700 mb-1">Plan tier history</p>
      <p className="text-xs text-gray-400 mb-4">Per-org plan progression — each line is one organisation</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {orgsWithEvents.map((org, i) => (
          <span key={org.agentspace_id} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="w-3 h-0.5 inline-block rounded"
              style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
            />
            {org.agentspace_name || org.agentspace_id}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0.5, 4.5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v: number) => TIER_LABELS[v] ?? ''}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: 'none' }}
            formatter={(value: number, name: string) => [TIER_LABELS[value] ?? value, name]}
          />
          {orgsWithEvents.map((org, i) => (
            <Line
              key={org.agentspace_id}
              type="stepAfter"
              dataKey={org.agentspace_name || org.agentspace_id}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Utilization cards ─────────────────────────────────────────────────────────

function UtilizationSection({ orgs }: { orgs: AdminRetentionOrg[] }) {
  const relevant = orgs.filter(o => o.minutes_included > 0)
  if (relevant.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm font-medium text-gray-700 mb-1">Current period utilisation</p>
      <p className="text-xs text-gray-400 mb-4">Minutes used vs included in this billing cycle</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relevant.map(org => {
          const pct = Math.min(100, Math.round((org.minutes_used_this_period / org.minutes_included) * 100))
          const isHeavy = pct >= 80
          let barColor = 'bg-emerald-500'
          if (org.status === 'expired' || org.status === 'cancelled') barColor = 'bg-red-400'
          else if (org.expiring_soon || isHeavy) barColor = 'bg-amber-400'

          return (
            <div key={org.agentspace_id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {org.agentspace_name || org.agentspace_id}
                  </span>
                  <PlanBadge tier={org.plan_tier} />
                </div>
                <StatusBadge status={org.status} expiringSoon={org.expiring_soon} />
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`${barColor} h-2 rounded-full duration-[120ms]`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {org.minutes_used_this_period} / {org.minutes_included} min
                <span className="ml-2 text-gray-500 font-medium">{pct}%</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Org table row ─────────────────────────────────────────────────────────────

function OrgRow({ org }: { org: AdminRetentionOrg }) {
  const days = daysUntil(org.period_end)
  const isChurned = org.status === 'expired' || org.status === 'cancelled'
  const wasActive = (org.sessions_last_90d ?? 0) > 0
  const utilPct = org.minutes_included > 0
    ? Math.min(100, Math.round((org.minutes_used_this_period / org.minutes_included) * 100))
    : null

  return (
    <tr className={`hover:bg-gray-50 duration-[120ms] ${isChurned && wasActive ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isChurned && wasActive && <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          <span className="font-medium text-gray-800 truncate max-w-[180px]">
            {org.agentspace_name || org.agentspace_id}
          </span>
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
      <td className="px-4 py-3 text-right text-xs text-gray-600">
        {utilPct !== null ? (
          <span className={utilPct >= 80 ? 'text-amber-600 font-medium' : ''}>
            {utilPct}%
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

  const { orgs } = data

  const activeCount = orgs.filter(o => o.status === 'active' && !o.expiring_soon).length
  const expiringSoonCount = orgs.filter(o => o.expiring_soon).length
  const expiredCount = orgs.filter(o => o.status === 'expired' || o.status === 'cancelled').length
  const trialCount = orgs.filter(o => o.plan_tier === 'trial' && o.status === 'active').length

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

      {/* Plan tier timeline */}
      <PlanTierTimeline orgs={orgs} />

      {/* Current period utilisation */}
      <UtilizationSection orgs={orgs} />

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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Util.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">30d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">60d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">90d sessions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No subscriptions yet.</td>
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
