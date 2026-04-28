import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  FlaskConical,
  Loader2,
  Mail,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import { useTokenBalance } from '../../context/TokenContext'
import {
  fetchAgentspaceSubscription,
  fetchTokenTransactions,
  initiatePayment,
  cancelSubscription,
  switchPlan,
} from '../../lib/api'
import type { AgentspaceSubscription } from '../../lib/api'
import { getAllPlansIn } from '../../lib/constants'
import type { PricingPlan } from '../../lib/constants'
import { loadRazorpayScript } from '../../lib/razorpay'
import SlidePanel from './SlidePanel'

const CONTACT_EMAIL = 'hello@vivalyn.in'
const SELF_SERVE_TIERS = new Set(['trial', 'starter', 'growth', 'pro'])
const _TIER_RANK: Record<string, number> = { trial: 1, starter: 2, growth: 3, pro: 4 }

function tierBadgeClass(tier: string): string {
  const map: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-600',
    starter: 'bg-indigo-50 text-indigo-700',
    growth: 'bg-violet-50 text-violet-700',
    pro: 'bg-amber-50 text-amber-700',
  }
  return map[tier] ?? 'bg-gray-100 text-gray-600'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    expired: 'bg-amber-50 text-amber-700',
    inactive: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function PlanPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const { balance, lowThreshold } = useTokenBalance()
  const navigate = useNavigate()

  const [subscription, setSubscription] = useState<AgentspaceSubscription | null>(null)
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)
  const [allPlansIn, setAllPlansIn] = useState<PricingPlan[]>([])

  // Token history (top 10)
  const [txRows, setTxRows] = useState<Array<{ id: string; created_at: string; delta: number; balance_after: number; reason: string }>>([])
  const [txLoading, setTxLoading] = useState(false)

  // Renew (expired → repurchase)
  const [renewPayingTier, setRenewPayingTier] = useState<string | null>(null)
  const [renewPayError, setRenewPayError] = useState<string | null>(null)

  // Switch plan actions
  const [switchLoadingKey, setSwitchLoadingKey] = useState<string | null>(null)  // `${tier}_now` or `${tier}_renewal`
  const [switchMessage, setSwitchMessage] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Cancel confirmation
  const [cancelConfirm, setCancelConfirm] = useState<'now' | 'renewal' | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const token = session?.access_token
  const spaceId = activeSpace?.id
  const isAdmin = activeSpace?.role === 'admin'

  useEffect(() => {
    getAllPlansIn().then(setAllPlansIn).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open || !token || !spaceId) return
    setSubLoading(true)
    setSubError(null)
    fetchAgentspaceSubscription(token, spaceId)
      .then(setSubscription)
      .catch((e: Error) => setSubError(e.message))
      .finally(() => setSubLoading(false))
  }, [open, token, spaceId])

  useEffect(() => {
    if (!open || !token || !spaceId) return
    setTxLoading(true)
    fetchTokenTransactions(token, spaceId, 1, 10)
      .then((res) => setTxRows(res.transactions))
      .catch(() => setTxRows([]))
      .finally(() => setTxLoading(false))
  }, [open, token, spaceId])

  async function handleRazorpayCheckout(
    checkout: {
      gateway: string
      razorpay_key_id?: string
      subscription_id?: string
      order_id?: string
      amount?: number
      description?: string
      checkout_url?: string
    },
    onDismiss?: () => void,
  ) {
    if (checkout.gateway === 'stripe' && checkout.checkout_url) {
      window.location.href = checkout.checkout_url
      return
    }
    const loaded = await loadRazorpayScript()
    if (!loaded) throw new Error('Failed to load Razorpay. Please try again.')

    if (checkout.order_id) {
      // One-time order (trial) — no autopay mandate
      const rz = new window.Razorpay({
        key: checkout.razorpay_key_id!,
        order_id: checkout.order_id,
        amount: checkout.amount,
        currency: 'INR',
        name: 'Vivalyn',
        description: checkout.description ?? 'Vivalyn Plan',
        handler: (response) => {
          navigate(`/payment/success?provider=razorpay&order_id=${response.razorpay_order_id}`)
        },
        modal: { ondismiss: onDismiss ?? (() => {}) },
        theme: { color: '#4f46e5' },
      })
      rz.open()
    } else {
      // Recurring subscription
      const rz = new window.Razorpay({
        key: checkout.razorpay_key_id!,
        subscription_id: checkout.subscription_id!,
        name: 'Vivalyn',
        description: checkout.description ?? 'Vivalyn Plan',
        handler: (response) => {
          navigate(`/payment/success?provider=razorpay&sub_id=${response.razorpay_subscription_id}`)
        },
        modal: { ondismiss: onDismiss ?? (() => {}) },
        theme: { color: '#4f46e5' },
      })
      rz.open()
    }
  }

  async function handleRenewClick(tier: string) {
    if (!session || !activeSpace) return
    setRenewPayingTier(tier)
    setRenewPayError(null)
    try {
      const checkout = await initiatePayment(session.access_token, {
        agentspace_id: activeSpace.id,
        plan_tier: tier,
        currency: 'INR',
      })
      await handleRazorpayCheckout(checkout as never, () => setRenewPayingTier(null))
      setRenewPayingTier(null)
    } catch (err: unknown) {
      setRenewPayError(err instanceof Error ? err.message : 'Something went wrong.')
      setRenewPayingTier(null)
    }
  }

  async function handleSwitchNow(tier: string) {
    if (!token || !spaceId) return
    const key = `${tier}_now`
    setSwitchLoadingKey(key)
    setSwitchError(null)
    setSwitchMessage(null)
    try {
      const result = await switchPlan(token, { agentspace_id: spaceId, new_plan_tier: tier, at_period_end: false })
      if ('ok' in result && result.ok) {
        setSwitchMessage((result as { message?: string }).message ?? 'Done')
      } else {
        await handleRazorpayCheckout(result as never, () => setSwitchLoadingKey(null))
        setSwitchLoadingKey(null)
      }
    } catch (err: unknown) {
      setSwitchError(err instanceof Error ? err.message : 'Switch failed.')
      setSwitchLoadingKey(null)
    }
  }

  async function handleSwitchAtRenewal(tier: string) {
    if (!token || !spaceId) return
    const key = `${tier}_renewal`
    setSwitchLoadingKey(key)
    setSwitchError(null)
    setSwitchMessage(null)
    try {
      const result = await switchPlan(token, { agentspace_id: spaceId, new_plan_tier: tier, at_period_end: true })
      setSwitchMessage('message' in result ? (result as { message: string }).message : 'Scheduled.')
    } catch (err: unknown) {
      setSwitchError(err instanceof Error ? err.message : 'Switch failed.')
    } finally {
      setSwitchLoadingKey(null)
    }
  }

  async function handleCancel(atPeriodEnd: boolean) {
    if (!token || !spaceId) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      await cancelSubscription(token, { agentspace_id: spaceId, at_period_end: atPeriodEnd })
      setCancelConfirm(null)
      // Refresh subscription
      const updated = await fetchAgentspaceSubscription(token, spaceId)
      setSubscription(updated)
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed.')
    } finally {
      setCancelLoading(false)
    }
  }

  const minutesUsed = subscription?.minutes_included != null && balance != null
    ? subscription.minutes_included - balance
    : null

  return (
    <SlidePanel open={open} onClose={onClose} title="Plan" subtitle={activeSpace?.name}>
      <div className="px-6 py-4 space-y-5">
        {subLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}
        {subError && (
          <div className="flex items-center gap-2 text-sm text-red-500 py-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {subError}
          </div>
        )}

        {!subLoading && !subError && subscription && (
          <>
            {/* Current plan card */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-medium text-gray-500">Current Plan</span>
              </div>

              {subscription.has_subscription ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {subscription.plan_tier}
                      {subscription.scaling_enabled && (
                        <span className="ml-1.5 text-xs font-normal text-indigo-600">+ Scaling</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {subscription.cancel_at_period_end && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Cancels at renewal
                        </span>
                      )}
                      {statusBadge(subscription.status)}
                    </div>
                  </div>

                  {subscription.period_start && subscription.period_end && (
                    <p className="text-xs text-gray-400">
                      {new Date(subscription.period_start).toLocaleDateString()} — {new Date(subscription.period_end).toLocaleDateString()}
                    </p>
                  )}


                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Used this cycle</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        {minutesUsed !== null ? minutesUsed.toLocaleString() : '—'} min
                      </p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
                      <p className={`text-sm font-semibold tabular-nums ${balance !== null && balance <= lowThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                        {balance !== null ? balance.toLocaleString() : '—'} min
                      </p>
                    </div>
                  </div>

                  {/* Cancel section — active subs, admin only */}
                  {isAdmin && subscription.status === 'active' && !subscription.cancel_at_period_end && (
                    <div className="pt-2 border-t border-gray-200">
                      {cancelError && <p className="text-xs text-red-600 mb-2">{cancelError}</p>}
                      {cancelConfirm === null ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCancelConfirm('now')}
                            className="flex-1 py-1.5 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors duration-[120ms]"
                          >
                            Cancel now
                          </button>
                          <button
                            onClick={() => setCancelConfirm('renewal')}
                            className="flex-1 py-1.5 px-3 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-[120ms]"
                          >
                            Cancel at renewal
                          </button>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs text-red-700 mb-2 font-medium">
                            {cancelConfirm === 'now'
                              ? 'Cancel immediately? Access ends now.'
                              : 'Cancel at renewal? Access until period end.'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancel(cancelConfirm === 'renewal')}
                              disabled={cancelLoading}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors duration-[120ms]"
                            >
                              {cancelLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              Confirm
                            </button>
                            <button
                              onClick={() => { setCancelConfirm(null); setCancelError(null) }}
                              disabled={cancelLoading}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors duration-[120ms]"
                            >
                              Never mind
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 py-2">No active plan on this workspace.</p>
              )}
            </div>

            <div className="h-px bg-gray-100" />

            {/* All Plans */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2.5">All Plans</p>
              {switchError && (
                <p className="text-xs text-red-600 mb-2">{switchError}</p>
              )}
              {switchMessage && (
                <p className="text-xs text-emerald-600 mb-2">{switchMessage}</p>
              )}
              <div className="space-y-2">
                {allPlansIn.filter((plan) => {
                  if (plan.tier === 'trial' && subscription.had_trial) return false
                  return true
                }).map((plan) => {
                  const isCurrent = subscription.plan_tier === plan.tier && subscription.status === 'active'
                  const isExpiredOrCancelled = subscription.status === 'expired' || subscription.status === 'cancelled'
                  const canSwitch = isAdmin && subscription.status === 'active' && !isCurrent && SELF_SERVE_TIERS.has(plan.tier)
                  const canSubscribe = isAdmin && !subscription.has_subscription && SELF_SERVE_TIERS.has(plan.tier)
                  const canRenew = isAdmin && isExpiredOrCancelled && SELF_SERVE_TIERS.has(plan.tier)
                  const currentRank = _TIER_RANK[subscription.plan_tier ?? ''] ?? 0
                  const planRank = _TIER_RANK[plan.tier] ?? 0
                  const switchLabel = planRank > currentRank ? 'Upgrade' : 'Downgrade'

                  return (
                    <div
                      key={plan.tier}
                      className={`rounded-xl border p-3 ${isCurrent ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100'}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${tierBadgeClass(plan.tier)}`}>
                            {plan.name}
                          </span>
                          {isCurrent && <span className="text-[10px] font-medium text-indigo-600">Current</span>}
                          {plan.scalingAvailable && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                              <Zap className="w-2.5 h-2.5" />Scaling
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-semibold text-gray-900">{plan.price}</span>
                          {plan.price !== 'Contact us' && (
                            <span className="text-xs text-gray-400 ml-1">{plan.billingLabel}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {plan.minutes.toLocaleString()} min · {plan.sessions} sessions
                        {plan.additionalRate ? ` · Overage: ${plan.additionalRate}` : ''}
                      </p>

                      {canSwitch && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSwitchNow(plan.tier)}
                            disabled={switchLoadingKey !== null}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors duration-[120ms]"
                          >
                            {switchLoadingKey === `${plan.tier}_now` && <Loader2 className="w-3 h-3 animate-spin" />}
                            {switchLabel} now
                          </button>
                          <button
                            onClick={() => handleSwitchAtRenewal(plan.tier)}
                            disabled={switchLoadingKey !== null}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors duration-[120ms]"
                          >
                            {switchLoadingKey === `${plan.tier}_renewal` && <Loader2 className="w-3 h-3 animate-spin" />}
                            At renewal
                          </button>
                        </div>
                      )}

                      {canSubscribe && (
                        <div>
                          {renewPayError && renewPayingTier === plan.tier && (
                            <p className="text-xs text-red-600 mb-1.5">{renewPayError}</p>
                          )}
                          <button
                            onClick={() => handleRenewClick(plan.tier)}
                            disabled={renewPayingTier !== null}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors duration-[120ms]"
                          >
                            {renewPayingTier === plan.tier && <Loader2 className="w-3 h-3 animate-spin" />}
                            Get {plan.name}
                          </button>
                        </div>
                      )}

                      {canRenew && (
                        <div>
                          {renewPayError && renewPayingTier === plan.tier && (
                            <p className="text-xs text-red-600 mb-1.5">{renewPayError}</p>
                          )}
                          <button
                            onClick={() => handleRenewClick(plan.tier)}
                            disabled={renewPayingTier !== null}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors duration-[120ms]"
                          >
                            {renewPayingTier === plan.tier && <Loader2 className="w-3 h-3 animate-spin" />}
                            Get {plan.name}
                          </button>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </div>

            {/* Custom pricing */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 mb-0.5">Custom pricing or queries?</p>
                <p className="text-xs text-gray-500 mb-2">Yearly lock-in, volume pricing, enterprise plans, or anything else.</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Pricing Query')}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-[120ms]"
                >
                  {CONTACT_EMAIL} →
                </a>
              </div>
            </div>

            {/* Token history — top 10 */}
            {subscription.has_subscription && (
              <>
                <div className="h-px bg-gray-100" />
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-3">Token history</p>
                  {txLoading && (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    </div>
                  )}
                  {!txLoading && txRows.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center">No transactions yet.</p>
                  )}
                  {!txLoading && txRows.length > 0 && (
                    <div>
                      {txRows.map((tx) => {
                        const isTest = tx.reason === 'test_session'
                        return (
                          <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isTest ? 'bg-gray-100' : tx.delta > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              {isTest
                                ? <FlaskConical className="w-3 h-3 text-gray-400" />
                                : tx.delta > 0
                                  ? <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                  : <ArrowDownLeft className="w-3 h-3 text-red-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium text-gray-700 capitalize">
                                  {tx.reason.replace(/_/g, ' ')}
                                </p>
                                {isTest && (
                                  <span className="inline-flex items-center px-1.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                    Test
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {new Date(tx.created_at).toLocaleDateString()} · bal: {tx.balance_after}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold tabular-nums ${isTest ? 'text-gray-400' : tx.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isTest ? '0' : tx.delta > 0 ? `+${tx.delta}` : `${tx.delta}`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </SlidePanel>
  )
}
