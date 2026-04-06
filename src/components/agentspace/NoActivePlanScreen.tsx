import { useState, useEffect } from 'react'
import { Clock, Zap, Mail } from 'lucide-react'
import type { AgentspaceSubscription } from '../../lib/api'
import { getAllPlansIn, getAllPlansIntl } from '../../lib/constants'
import type { PricingPlan } from '../../lib/constants'

const CONTACT_EMAIL = 'hello@vivalyn.in'

function tierBadgeClass(tier: string): string {
  const map: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-600',
    starter: 'bg-indigo-50 text-indigo-700',
    growth: 'bg-violet-50 text-violet-700',
    pro: 'bg-amber-50 text-amber-700',
  }
  return map[tier] ?? 'bg-gray-100 text-gray-600'
}

interface Props {
  subscription: AgentspaceSubscription | null
}

export default function NoActivePlanScreen({ subscription }: Props) {
  const [currency, setCurrency] = useState<'inr' | 'intl'>('inr')
  const [plansIn, setPlansIn] = useState<PricingPlan[]>([])
  const [plansIntl, setPlansIntl] = useState<PricingPlan[]>([])

  useEffect(() => {
    getAllPlansIn().then(setPlansIn).catch(() => {})
    getAllPlansIntl().then(setPlansIntl).catch(() => {})
  }, [])

  const isPending = subscription?.has_subscription && subscription.status === 'inactive'
  const isExpired = subscription?.has_subscription &&
    (subscription.status === 'expired' || subscription.status === 'cancelled')

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Pending activation</h2>
          <p className="text-sm text-gray-500">
            Your request has been received. Our team will activate your plan within 24 hours.
          </p>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your plan has ended</h2>
          <p className="text-sm text-gray-500 mb-6">
            {subscription?.period_end
              ? <>Your plan expired on {new Date(subscription.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Contact us to renew.</>
              : <>Your plan is no longer active. Contact us to renew.</>
            }
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plan Renewal — ' + (subscription?.plan_tier ?? 'Vivalyn'))}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]"
          >
            Renew Plan
          </a>
        </div>
      </div>
    )
  }

  const plans = currency === 'inr' ? plansIn : plansIntl

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-10">
      <div className="w-full max-w-3xl">

        {/* Header + toggle */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Choose a plan</h2>
            <p className="text-sm text-gray-500">All plans run ~10 minutes per session.</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 shrink-0">
            {(['inr', 'intl'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-[120ms] cursor-pointer ${
                  currency === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c === 'inr' ? 'India (₹)' : 'Intl ($)'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {plans.map((plan) => {
            const mailtoSubject = encodeURIComponent(`Plan Request — ${plan.name}`)

            return (
              <div
                key={plan.tier}
                className={`bg-white rounded-xl border p-5 flex flex-col ${
                  plan.tier === 'starter'
                    ? 'border-indigo-200 ring-1 ring-indigo-100'
                    : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${tierBadgeClass(plan.tier)}`}>
                    {plan.name}
                  </span>
                  {plan.scalingAvailable && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" />
                      Scaling
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  {plan.crossedPrice && (
                    <span className="text-sm text-gray-400 line-through block">{plan.crossedPrice}</span>
                  )}
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-xs text-gray-400 ml-1">{plan.billingLabel}</span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Minutes included</span>
                    <span className="font-medium text-gray-900">{plan.minutes.toLocaleString()} min</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Sessions (~10 min)</span>
                    <span className="font-medium text-gray-900">{plan.sessions}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Scaling overage</span>
                    <span className="font-medium text-gray-900">{plan.additionalRate ?? '—'}</span>
                  </div>
                </div>

                {plan.note && (
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">{plan.note}</p>
                )}

                {/* CTA */}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}`}
                  className={`w-full py-2 px-4 text-sm font-medium rounded-lg text-center transition-colors duration-[120ms] ${
                    plan.tier === 'starter'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Request {plan.name}
                </a>
              </div>
            )
          })}
        </div>

        {/* Custom pricing / queries */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 mb-0.5">Need custom pricing or have a question?</p>
            <p className="text-xs text-gray-500 mb-3">
              Yearly lock-in discounts, volume pricing, enterprise plans, or anything else — reach out directly.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Pricing Query')}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-[120ms]"
            >
              {CONTACT_EMAIL} →
            </a>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-5">
          Already submitted a request? Our team will activate your plan within 24 hours.
        </p>
      </div>
    </div>
  )
}
