import { useEffect, useState } from 'react'
import { Activity, CreditCard, Loader2, MessageSquare } from 'lucide-react'
import {
  fetchContactEvents,
  fetchAdminOverview,
  fetchAdminSubscriptions,
  type AdminSubscription,
  type ContactEvent,
} from '../../lib/api'
import type { AdminSection } from './AdminSidebar'

interface AdminHomeViewProps {
  token: string
  onNavigate: (section: AdminSection) => void
  onActivateSubscription: () => void
}

interface HomeStats {
  activeSubscriptions: number
  openInquiries: number
  sessionsLast30d: number
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

const STATUS_COLORS: Record<string, string> = {
  new:     'bg-indigo-50 text-indigo-700',
  seen:    'bg-amber-50 text-amber-700',
  replied: 'bg-blue-50 text-blue-700',
  closed:  'bg-gray-100 text-gray-500',
  active:  'bg-green-50 text-green-700',
  trial: 'bg-indigo-50 text-indigo-700',
  inactive: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-indigo-50 text-indigo-700',
  starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-purple-50 text-purple-700',
  pro: 'bg-green-50 text-green-700',
}

export function AdminHomeView({ token, onNavigate, onActivateSubscription }: AdminHomeViewProps) {
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [recentInquiries, setRecentInquiries] = useState<ContactEvent[]>([])
  const [recentSubscriptions, setRecentSubscriptions] = useState<AdminSubscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)

    Promise.all([
      fetchAdminSubscriptions(token),
      fetchContactEvents(token),
      fetchAdminOverview(token, formatDate(from), formatDate(to), true),
    ])
      .then(([subs, inquiries, overview]) => {
        setStats({
          activeSubscriptions: subs.filter((s) => s.status === 'active').length,
          openInquiries: inquiries.filter((i: ContactEvent) => i.status !== 'closed').length,
          sessionsLast30d: overview.total_sessions,
        })
        setRecentInquiries(inquiries.slice(0, 5))
        setRecentSubscriptions(subs.slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-0.5">Admin overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CreditCard className="w-4 h-4 text-indigo-600" />}
          label="Active Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4 text-yellow-600" />}
          label="Open Inquiries"
          value={stats?.openInquiries ?? 0}
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-green-600" />}
          label="Sessions (last 30d)"
          value={stats?.sessionsLast30d ?? 0}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => { onNavigate('subscriptions'); onActivateSubscription() }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]"
        >
          <CreditCard className="w-4 h-4" />
          Activate Subscription
        </button>
        <button
          onClick={() => onNavigate('inquiries')}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-[120ms]"
        >
          <MessageSquare className="w-4 h-4" />
          View Inquiries
        </button>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent inquiries */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Inquiries</h2>
            <button
              onClick={() => onNavigate('inquiries')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInquiries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No inquiries yet</p>
            ) : (
              recentInquiries.map((inq) => (
                <div key={inq.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inq.name}</p>
                    <p className="text-xs text-gray-500 truncate">{inq.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inq.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inq.status}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(inq.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent subscriptions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Subscriptions</h2>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSubscriptions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No subscriptions yet</p>
            ) : (
              recentSubscriptions.map((sub) => (
                <div key={sub.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sub.agentspace_name}</p>
                    <p className="text-xs text-gray-500">{sub.period_end ? `Ends ${new Date(sub.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No end date'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[sub.plan_tier] ?? 'bg-gray-100 text-gray-600'}`}>
                      {sub.plan_tier}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}
