import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  fetchAdminSubscriptions,
  activateSubscription,
  updateAdminSubscription,
  type AdminSubscription,
} from '../../lib/api'

const PLAN_TIERS = ['trial', 'starter', 'growth', 'pro'] as const
const PLAN_MINUTES: Record<string, number> = { trial: 150, starter: 1500, growth: 4000, pro: 8000 }

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-indigo-50 text-indigo-600',
  starter: 'bg-blue-50 text-blue-600',
  growth: 'bg-violet-50 text-violet-600',
  pro: 'bg-emerald-50 text-emerald-700',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  )
}

function PlanBadge({ tier }: { tier: string }) {
  const cls = PLAN_COLORS[tier] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {tier}
    </span>
  )
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function dateInputToIso(val: string): string {
  return val ? `${val}T00:00:00+00:00` : ''
}

function ActivateModal({
  token,
  existing,
  onClose,
  onSuccess,
}: {
  token: string
  existing?: AdminSubscription
  onClose: () => void
  onSuccess: (sub: AdminSubscription) => void
}) {
  const [agentspaceId, setAgentspaceId] = useState(existing?.agentspace_id ?? '')
  const [planTier, setPlanTier] = useState<string>(existing?.plan_tier ?? 'trial')
  const [currency, setCurrency] = useState<'INR' | 'USD'>(existing?.currency as 'INR' | 'USD' ?? 'INR')
  const [periodStart, setPeriodStart] = useState(isoToDateInput(existing?.period_start) || new Date().toISOString().slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(isoToDateInput(existing?.period_end) || '')
  const [requesterEmail, setRequesterEmail] = useState(existing?.requester_email ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Auto-set period end to +1 month
  useEffect(() => {
    if (periodStart && !periodEnd) {
      const d = new Date(periodStart)
      d.setMonth(d.getMonth() + 1)
      setPeriodEnd(d.toISOString().slice(0, 10))
    }
  }, [periodStart])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentspaceId.trim()) { setError('Agentspace ID is required.'); return }
    if (!periodStart || !periodEnd) { setError('Period start and end are required.'); return }
    setLoading(true); setError('')
    try {
      const sub = await activateSubscription(token, {
        agentspace_id: agentspaceId.trim(),
        plan_tier: planTier,
        currency,
        period_start: dateInputToIso(periodStart),
        period_end: dateInputToIso(periodEnd),
        requester_email: requesterEmail || undefined,
        notes: notes || undefined,
      })
      onSuccess(sub)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate subscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onMouseDown={e => { if (e.target === backdropRef.current) onClose() }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {existing ? 'Update Subscription' : 'Activate Subscription'}
            </p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Agentspace ID <span className="text-red-500">*</span>
              </label>
              <input
                value={agentspaceId}
                onChange={e => setAgentspaceId(e.target.value)}
                placeholder="UUID"
                disabled={!!existing}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                <div className="flex flex-col gap-1">
                  {PLAN_TIERS.map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setPlanTier(t)}
                      className={`text-left px-3 py-1.5 text-xs rounded-lg border capitalize transition-all duration-[120ms] ${
                        planTier === t
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t} — {PLAN_MINUTES[t].toLocaleString()} mins
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <div className="inline-flex bg-gray-100 rounded-lg p-1">
                    {(['INR', 'USD'] as const).map(c => (
                      <button key={c} type="button" onClick={() => setCurrency(c)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-[120ms] ${
                          currency === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period start</label>
                  <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Period end</label>
                  <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Requester email (for trial dedup)</label>
              <input value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors duration-[120ms]"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] disabled:opacity-50"
              >
                {loading ? 'Saving...' : existing ? 'Update' : 'Activate'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function AdminSubscriptionsView({ token }: { token: string }) {
  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [modalTarget, setModalTarget] = useState<AdminSubscription | 'new' | null>(null)

  const load = () => {
    setLoading(true)
    fetchAdminSubscriptions(token)
      .then(setSubs)
      .catch(() => setSubs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const handleToggleScaling = async (sub: AdminSubscription) => {
    try {
      const updated = await updateAdminSubscription(token, sub.id, { scaling_enabled: !sub.scaling_enabled })
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, ...updated } : s))
    } catch {
      // silent
    }
  }

  const handleCancel = async (sub: AdminSubscription) => {
    try {
      const updated = await updateAdminSubscription(token, sub.id, { status: 'cancelled' })
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, ...updated } : s))
    } catch {
      // silent
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscriptions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage agentspace plans. Activating resets the minute balance.</p>
        </div>
        <button
          onClick={() => setModalTarget('new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]"
        >
          <Plus size={15} />
          Activate Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No subscriptions yet.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Agentspace</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Scaling</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors duration-[120ms]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[160px]">{sub.agentspace_name || sub.agentspace_id.slice(0, 8)}</p>
                    {sub.requester_email && <p className="text-xs text-gray-400">{sub.requester_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge tier={sub.plan_tier} />
                    <p className="text-xs text-gray-400 mt-1">{sub.minutes_included.toLocaleString()} mins · {sub.currency}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {sub.period_start ? new Date(sub.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    {' → '}
                    {sub.period_end ? new Date(sub.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`font-medium ${sub.balance <= 0 ? 'text-red-600' : sub.balance < sub.minutes_included * 0.1 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {sub.balance.toLocaleString()}
                    </span>
                    <span className="text-gray-400"> / {sub.minutes_included.toLocaleString()} mins</span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.plan_tier === 'pro' ? (
                      <button onClick={() => handleToggleScaling(sub)} className="text-gray-400 hover:text-indigo-600 transition-colors duration-[120ms]">
                        {sub.scaling_enabled
                          ? <ToggleRight size={20} className="text-indigo-600" />
                          : <ToggleLeft size={20} />}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalTarget(sub)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-[120ms]"
                      >
                        Renew / Edit
                      </button>
                      {sub.status === 'active' && (
                        <button
                          onClick={() => handleCancel(sub)}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all duration-[120ms]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalTarget !== null && (
        <ActivateModal
          token={token}
          existing={modalTarget !== 'new' ? modalTarget : undefined}
          onClose={() => setModalTarget(null)}
          onSuccess={sub => {
            setSubs(prev => {
              const idx = prev.findIndex(s => s.id === sub.id)
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = { ...prev[idx], ...sub }
                return updated
              }
              return [sub, ...prev]
            })
            setModalTarget(null)
          }}
        />
      )}
    </div>
  )
}
