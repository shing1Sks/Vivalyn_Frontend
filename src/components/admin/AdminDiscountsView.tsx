import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ChevronDown, Loader2, Mail, Plus, X } from 'lucide-react'
import {
  fetchAdminDiscounts,
  createDiscountCode,
  updateDiscountCode,
  sendDiscountEmail,
  fetchDiscountUsage,
  projectDiscount,
  type DiscountCode,
  type DiscountUsage,
  type DiscountProjection,
} from '../../lib/api'

const PLAN_TIERS = ['trial', 'starter', 'growth', 'pro'] as const
const PLAN_PRICES_INR: Record<string, number> = { trial: 200, starter: 2499, growth: 4499, pro: 8499 }
const PLAN_PRICES_USD: Record<string, number> = { trial: 2.5, starter: 35, growth: 69, pro: 137 }

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function SendEmailModal({
  code,
  token,
  onClose,
}: {
  code: DiscountCode
  token: string
  onClose: () => void
}) {
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSend = async () => {
    if (!toEmail.trim() || !toName.trim()) { setError('Email and name are required.'); return }
    setLoading(true); setError('')
    try {
      await sendDiscountEmail(token, code.id, { to_email: toEmail.trim(), to_name: toName.trim() })
      setSent(true)
    } catch {
      setError('Failed to send. Try again.')
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}
        >
          {sent ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">Discount email sent</p>
              <p className="text-xs text-gray-500 mb-4">Code <strong>{code.code}</strong> sent to {toEmail}.</p>
              <button onClick={onClose} className="text-sm text-indigo-600 font-medium">Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Send code <span className="text-indigo-600">{code.code}</span></p>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Recipient name</label>
                  <input value={toName} onChange={e => setToName(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Recipient email</label>
                  <input type="email" value={toEmail} onChange={e => setToEmail(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors duration-[120ms]">Cancel</button>
                  <button onClick={handleSend} disabled={loading}
                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function UsageDrawer({
  code,
  token,
  onClose,
}: {
  code: DiscountCode
  token: string
  onClose: () => void
}) {
  const [data, setData] = useState<{ usage: DiscountUsage[]; total_uses: number; total_savings: number; total_revenue: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDiscountUsage(token, code.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [token, code.id])

  return (
    <div className="mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4">
      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
      ) : !data ? (
        <p className="text-xs text-gray-400 text-center py-4">Failed to load usage data.</p>
      ) : (
        <>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-xs text-gray-400">Total uses</p>
              <p className="text-sm font-semibold text-gray-900">{data.total_uses}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total savings given</p>
              <p className="text-sm font-semibold text-gray-900">{data.total_savings.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Revenue collected</p>
              <p className="text-sm font-semibold text-gray-900">{data.total_revenue.toFixed(2)}</p>
            </div>
          </div>
          {data.usage.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No uses yet.</p>
          ) : (
            <div className="space-y-2">
              {data.usage.map(u => (
                <div key={u.id} className="flex items-center justify-between text-xs text-gray-600 bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <span className="font-medium truncate max-w-[120px]">{u.agentspace_id.slice(0, 8)}</span>
                  <span className="capitalize">{u.plan_tier} · {u.currency}</span>
                  <span className="text-red-500">-{u.savings.toFixed(2)} off</span>
                  <span className="text-gray-400">{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors duration-[120ms]">
        Collapse usage
      </button>
    </div>
  )
}

function MarginProjector({
  token,
  planTier,
  discountType,
  value,
  currency,
}: {
  token: string
  planTier: string
  discountType: string
  value: number
  currency: string
}) {
  const [proj, setProj] = useState<DiscountProjection | null>(null)

  useEffect(() => {
    if (!planTier || !discountType || value <= 0) { setProj(null); return }
    projectDiscount(token, { plan_tier: planTier, discount_type: discountType, value, currency })
      .then(setProj)
      .catch(() => setProj(null))
  }, [token, planTier, discountType, value, currency])

  if (!proj) return null

  const priceSymbol = currency === 'INR' ? '₹' : '$'

  return (
    <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${proj.below_floor ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Original price</span>
        <span className="font-medium text-gray-700">{priceSymbol}{proj.base_price}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Effective price</span>
        <span className="font-medium text-gray-700">{priceSymbol}{proj.effective_price}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Per-session revenue</span>
        <span className={`font-medium ${proj.below_floor ? 'text-red-600' : 'text-gray-700'}`}>
          {priceSymbol}{proj.per_session_revenue}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Cost floor / session</span>
        <span className="text-gray-500">{priceSymbol}{proj.cost_floor_per_session}</span>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 pt-1.5">
        <span className={proj.below_floor ? 'text-red-600 font-medium' : 'text-gray-500'}>Margin</span>
        <span className={`font-semibold ${proj.below_floor ? 'text-red-600' : 'text-emerald-600'}`}>
          {proj.margin_pct}%
        </span>
      </div>
      {proj.below_floor && (
        <div className="flex items-start gap-1.5 pt-1 text-red-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>Below cost floor — discount will be rejected.</span>
        </div>
      )}
    </div>
  )
}

export function AdminDiscountsView({ token }: { token: string }) {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUsage, setExpandedUsage] = useState<string | null>(null)
  const [sendEmailTarget, setSendEmailTarget] = useState<DiscountCode | null>(null)

  // Generator form state
  const [code, setCode] = useState('')
  const [planTier, setPlanTier] = useState('starter')
  const [discountType, setDiscountType] = useState<'pct' | 'fixed'>('pct')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [agentspaceId, setAgentspaceId] = useState('')
  const [expiry, setExpiry] = useState('')
  const [oneTime, setOneTime] = useState(true)
  const [applyTo, setApplyTo] = useState('monthly')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = () => {
    setLoading(true)
    fetchAdminDiscounts(token)
      .then(setCodes)
      .catch(() => setCodes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !value) { setCreateError('Code and value are required.'); return }
    setCreating(true); setCreateError('')
    try {
      const created = await createDiscountCode(token, {
        code: code.trim(),
        plan_tier: planTier,
        discount_type: discountType,
        value: parseFloat(value),
        currency,
        agentspace_id: agentspaceId || undefined,
        expiry: expiry || undefined,
        one_time: oneTime,
        apply_to: applyTo,
      })
      setCodes(prev => [{ ...created, usage_count: 0 }, ...prev])
      setCode(''); setValue('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create discount.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (dc: DiscountCode) => {
    try {
      const updated = await updateDiscountCode(token, dc.id, { is_active: !dc.is_active })
      setCodes(prev => prev.map(c => c.id === dc.id ? { ...c, ...updated } : c))
    } catch {
      // silent
    }
  }

  const numValue = parseFloat(value) || 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Discounts</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate and manage discount codes. Cost floor is enforced on create.</p>
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-gray-200 p-5 mb-8 bg-white">
        <p className="text-sm font-semibold text-gray-900 mb-4">New Discount Code</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <div className="flex gap-2">
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                />
                <button type="button" onClick={() => setCode(generateCode())}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors duration-[120ms]"
                >
                  Random
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Plan tier</label>
              <div className="flex flex-col gap-1">
                {PLAN_TIERS.map(t => (
                  <button key={t} type="button" onClick={() => setPlanTier(t)}
                    className={`text-left px-2 py-1 text-xs rounded-md border capitalize transition-all duration-[120ms] ${
                      planTier === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['pct', 'fixed'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setDiscountType(t)}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all duration-[120ms] ${
                      discountType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {t === 'pct' ? '%' : 'Fixed'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Value {discountType === 'pct' ? '(%)' : '(amount)'}
              </label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                min="0" step="0.01" placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <div className="flex flex-col gap-1">
                {(['INR', 'USD', 'both'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className={`text-left px-2 py-1 text-xs rounded-md border transition-all duration-[120ms] ${
                      currency === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agentspace ID (leave blank = global)</label>
              <input value={agentspaceId} onChange={e => setAgentspaceId(e.target.value)}
                placeholder="UUID or empty"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry (optional)</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Usage</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button type="button" onClick={() => setOneTime(true)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all duration-[120ms] ${oneTime ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  One-time
                </button>
                <button type="button" onClick={() => setOneTime(false)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all duration-[120ms] ${!oneTime ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Multi-use
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Apply to</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['monthly', 'yearly', 'both'] as const).map(a => (
                  <button key={a} type="button" onClick={() => setApplyTo(a)}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all duration-[120ms] capitalize ${
                      applyTo === a ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Margin projector */}
          {numValue > 0 && (
            <MarginProjector
              token={token}
              planTier={planTier}
              discountType={discountType}
              value={numValue}
              currency={currency === 'both' ? 'INR' : currency}
            />
          )}

          {createError && <p className="text-xs text-red-600">{createError}</p>}

          <button type="submit" disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms] disabled:opacity-50"
          >
            <Plus size={14} />
            {creating ? 'Creating...' : 'Create Code'}
          </button>
        </form>
      </div>

      {/* Code table */}
      <p className="text-sm font-semibold text-gray-900 mb-3">All Codes ({codes.length})</p>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No discount codes yet.</div>
      ) : (
        <div className="space-y-2">
          {codes.map(dc => (
            <div key={dc.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-gray-900 tracking-widest">{dc.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${dc.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                    {dc.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium capitalize">{dc.plan_tier}</span>
                  <span className="text-xs text-gray-500">
                    {dc.discount_type === 'pct' ? `${dc.value}% off` : `${dc.value} off`} · {dc.currency}
                  </span>
                  {dc.one_time && <span className="text-xs text-gray-400">one-time</span>}
                  {dc.expiry && (
                    <span className="text-xs text-gray-400">
                      exp {new Date(dc.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{dc.usage_count} use{dc.usage_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedUsage(prev => prev === dc.id ? null : dc.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-[120ms]"
                  >
                    Usage
                    <ChevronDown size={12} className={`transition-transform duration-[120ms] ${expandedUsage === dc.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={() => setSendEmailTarget(dc)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-[120ms]"
                  >
                    <Mail size={12} />
                    Send
                  </button>
                  <button
                    onClick={() => handleToggleActive(dc)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-[120ms] ${
                      dc.is_active
                        ? 'text-red-500 border-red-100 hover:bg-red-50'
                        : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                    }`}
                  >
                    {dc.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedUsage === dc.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                  >
                    <UsageDrawer code={dc} token={token} onClose={() => setExpandedUsage(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {sendEmailTarget && (
        <SendEmailModal
          code={sendEmailTarget}
          token={token}
          onClose={() => setSendEmailTarget(null)}
        />
      )}
    </div>
  )
}
