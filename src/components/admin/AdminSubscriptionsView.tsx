import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Hash, Loader2, Plus, Search, ToggleLeft, ToggleRight, User, X } from 'lucide-react'
import {
  activateSubscription,
  fetchAdminAgentspaceDetails,
  fetchAdminSubscriptions,
  fetchPlanConfig,
  searchAdminAgentspaces,
  updateAdminSubscription,
  type AdminSubscription,
  type AgentspaceDetails,
  type AgentspaceSearchResult,
} from '../../lib/api'

const PLAN_TIERS = ['trial', 'starter', 'growth', 'pro'] as const

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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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

// ── Agentspace search + UUID widget ──────────────────────────────────────────

function AgentspacePickerWidget({
  token,
  value,
  name,
  onChange,
  disabled,
}: {
  token: string
  value: string
  name: string
  onChange: (id: string, name: string) => void
  disabled?: boolean
}) {
  const [mode, setMode] = useState<'search' | 'uuid'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AgentspaceSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [uuidInput, setUuidInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (mode !== 'search' || query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchAdminAgentspaces(token, query))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, token, mode])

  function selectResult(r: AgentspaceSearchResult) {
    onChange(r.id, r.name)
    setQuery('')
    setResults([])
  }

  function applyUuid() {
    const id = uuidInput.trim()
    if (id.length < 32) return
    onChange(id, id.slice(0, 8) + '…')
    setUuidInput('')
  }

  function clearSelection() {
    onChange('', '')
    setQuery('')
    setResults([])
    setUuidInput('')
  }

  if (disabled) {
    return (
      <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
        <span className="text-sm text-indigo-700 font-medium truncate">{name || value}</span>
      </div>
    )
  }

  // Selection made
  if (value) {
    return (
      <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
        <span className="text-sm text-indigo-700 font-medium truncate flex-1">{name}</span>
        <button type="button" onClick={clearSelection} className="text-indigo-400 hover:text-indigo-600 transition-colors duration-[120ms] shrink-0">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-[120ms] ${
            mode === 'search' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search size={11} />
          Search by name
        </button>
        <button
          type="button"
          onClick={() => { setMode('uuid'); setResults([]) }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-[120ms] ${
            mode === 'uuid' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Hash size={11} />
          Paste UUID
        </button>
      </div>

      {mode === 'search' ? (
        <div className="relative">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
            {searching ? <Loader2 size={14} className="text-gray-400 animate-spin shrink-0" /> : <Search size={14} className="text-gray-400 shrink-0" />}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
            />
          </div>
          {results.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden max-h-52 overflow-y-auto">
              {results.map((r, idx) => (
                <button
                  key={r.id || idx}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectResult(r) }}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors duration-[120ms] border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  {(r.admin_email || r.admin_name) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <User size={10} />
                      {r.admin_name ? `${r.admin_name} · ` : ''}{r.admin_email}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={uuidInput}
            onChange={(e) => setUuidInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUuid() } }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 placeholder-gray-400"
          />
          <button
            type="button"
            onClick={applyUuid}
            disabled={uuidInput.trim().length < 32}
            className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] disabled:opacity-40"
          >
            Use
          </button>
        </div>
      )}
    </div>
  )
}

// ── Agentspace detail card (shown after selection) ────────────────────────────

function AgentspaceDetailCard({ token, agentspaceId, planTier }: { token: string; agentspaceId: string; planTier: string }) {
  const [details, setDetails] = useState<AgentspaceDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchAdminAgentspaceDetails(token, agentspaceId)
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false))
  }, [token, agentspaceId])

  if (loading) return <div className="flex items-center gap-2 py-2"><Loader2 size={14} className="text-gray-400 animate-spin" /><span className="text-xs text-gray-400">Loading details…</span></div>
  if (!details) return null

  const sub = details.subscription
  const isTrial = planTier === 'trial'

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 text-xs">
      {/* Admin info */}
      {(details.admin_name || details.admin_email) && (
        <div className="flex items-center gap-1.5 text-gray-600">
          <User size={12} className="shrink-0 text-gray-400" />
          <span className="font-medium">{details.admin_name || 'Unknown'}</span>
          {details.admin_email && <span className="text-gray-400">· {details.admin_email}</span>}
        </div>
      )}

      {/* Current subscription */}
      {sub ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Current plan:</span>
          <PlanBadge tier={sub.plan_tier} />
          <StatusBadge status={sub.status} />
          {sub.period_end && <span className="text-gray-400">ends {fmtDate(sub.period_end)}</span>}
          <span className="text-gray-500">· {details.balance.toLocaleString()} / {sub.minutes_included.toLocaleString()} mins</span>
        </div>
      ) : (
        <p className="text-gray-400">No existing subscription</p>
      )}

      {/* Trial warning */}
      {isTrial && details.had_trial && (
        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 rounded-md px-2 py-1.5">
          <AlertCircle size={12} className="shrink-0" />
          <span>This agentspace already used its trial. Activating will be blocked.</span>
        </div>
      )}
      {isTrial && !details.had_trial && (
        <div className="flex items-center gap-1.5 text-green-700 bg-green-50 rounded-md px-2 py-1.5">
          <CheckCircle size={12} className="shrink-0" />
          <span>Trial eligible — no prior trial found.</span>
        </div>
      )}
    </div>
  )
}

// ── Activate Modal ────────────────────────────────────────────────────────────

function ActivateModal({
  token,
  existing,
  onClose,
  onSuccess,
}: {
  token: string
  existing?: AdminSubscription
  onClose: () => void
  onSuccess: () => void
}) {
  const [agentspaceId, setAgentspaceId] = useState(existing?.agentspace_id ?? '')
  const [agentspaceName, setAgentspaceName] = useState(existing?.agentspace_name ?? '')
  const [planTier, setPlanTier] = useState<string>(existing?.plan_tier ?? 'trial')
  const [currency, setCurrency] = useState<'INR' | 'USD'>(existing?.currency as 'INR' | 'USD' ?? 'INR')
  const [planMinutes, setPlanMinutes] = useState<Record<string, number>>({})
  const [requesterEmail, setRequesterEmail] = useState(existing?.requester_email ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPlanConfig()
      .then(config => {
        const map: Record<string, number> = {}
        for (const p of config.plans) map[p.tier] = p.minutes
        setPlanMinutes(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentspaceId.trim()) { setError('Select an agentspace to continue.'); return }
    setLoading(true); setError('')
    try {
      await activateSubscription(token, {
        agentspace_id: agentspaceId.trim(),
        plan_tier: planTier,
        currency,
        requester_email: requesterEmail || undefined,
        notes: notes || undefined,
      })
      onSuccess()
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <p className="text-sm font-semibold text-gray-900">
              {existing ? 'Update Subscription' : 'Activate Subscription'}
            </p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Agentspace picker */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Agentspace <span className="text-red-500">*</span>
              </label>
              <AgentspacePickerWidget
                token={token}
                value={agentspaceId}
                name={agentspaceName}
                onChange={(id, name) => { setAgentspaceId(id); setAgentspaceName(name) }}
                disabled={!!existing}
              />
            </div>

            {/* Agentspace detail card — shown once selection is made */}
            {agentspaceId && (
              <AgentspaceDetailCard token={token} agentspaceId={agentspaceId} planTier={planTier} />
            )}

            {/* Plan */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Plan</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PLAN_TIERS.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setPlanTier(t)}
                    className={`text-left px-3 py-2 text-xs rounded-lg border capitalize transition-all duration-[120ms] ${
                      planTier === t
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium capitalize">{t}</span>
                    {planMinutes[t] != null && <span className="block text-gray-400 font-normal">{planMinutes[t].toLocaleString()} mins</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {(['INR', 'USD'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-[120ms] ${
                      currency === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Requester email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Requester email <span className="text-gray-400 font-normal">(for trial dedup)</span></label>
              <input value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Notes */}
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

// ── Main view ─────────────────────────────────────────────────────────────────

interface AdminSubscriptionsViewProps {
  token: string
  openActivateModal?: boolean
  onActivateModalConsumed?: () => void
}

export function AdminSubscriptionsView({ token, openActivateModal, onActivateModalConsumed }: AdminSubscriptionsViewProps) {
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

  useEffect(() => {
    if (openActivateModal) {
      setModalTarget('new')
      onActivateModalConsumed?.()
    }
  }, [openActivateModal])

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
    <div className="px-6 py-8 max-w-6xl mx-auto w-full">
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
          onSuccess={() => {
            setModalTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}
