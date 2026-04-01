import { useState } from 'react'
import { Clock } from 'lucide-react'
import type { AgentspaceSubscription } from '../../lib/api'
import InquiryModal from '../ui/InquiryModal'

interface Props {
  subscription: AgentspaceSubscription | null
  userEmail?: string
}

export default function NoActivePlanScreen({ subscription, userEmail }: Props) {
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [planInterest, setPlanInterest] = useState<string | undefined>(undefined)

  function openInquiry(interest?: string) {
    setPlanInterest(interest)
    setInquiryOpen(true)
  }

  // Pending state: row exists but not yet activated
  const isPending = subscription?.has_subscription && subscription.status === 'inactive'

  // Expired state
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
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your plan has ended</h2>
            <p className="text-sm text-gray-500 mb-6">
              {subscription?.period_end
                ? <>Your plan expired on {new Date(subscription.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Renew to continue using Vivalyn.</>
                : <>Your plan is no longer active. Contact us to renew.</>
              }
            </p>
            <button
              onClick={() => openInquiry(subscription?.plan_tier ?? undefined)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]"
            >
              Renew Plan
            </button>
          </div>
        </div>
        <InquiryModal
          open={inquiryOpen}
          onClose={() => setInquiryOpen(false)}
          planInterest={planInterest}
          prefillEmail={userEmail}
        />
      </>
    )
  }

  // Default: no subscription at all
  return (
    <>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get started with Vivalyn</h2>
            <p className="text-sm text-gray-500">
              Your workspace doesn't have an active plan yet. Choose how you'd like to begin:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Trial card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Trial</p>
              <p className="text-2xl font-bold text-gray-900 mb-0.5">₹200</p>
              <p className="text-xs text-gray-400 mb-3">one-time</p>
              <p className="text-xs text-gray-500 mb-4">~15 sessions · 150 mins</p>
              <button
                onClick={() => openInquiry('trial')}
                className="mt-auto w-full py-2 px-4 border border-indigo-600 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors duration-[120ms]"
              >
                Request Trial
              </button>
            </div>

            {/* Starter card */}
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 flex flex-col ring-1 ring-indigo-100">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Starter</p>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <p className="text-2xl font-bold text-gray-900">₹2,499</p>
                <span className="text-xs text-gray-400 line-through">₹2,999</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">/month</p>
              <p className="text-xs text-gray-500 mb-4">~150 sessions · 1,500 mins</p>
              <button
                onClick={() => openInquiry('starter')}
                className="mt-auto w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-[120ms]"
              >
                Get Started
              </button>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Need Growth or Pro?{' '}
              <button
                onClick={() => openInquiry(undefined)}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
              >
                Contact us
              </button>
            </p>
            <p className="text-xs text-gray-400">
              Already submitted a request? Our team will activate your plan within 24 hours.
            </p>
          </div>
        </div>
      </div>

      <InquiryModal
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        planInterest={planInterest}
        prefillEmail={userEmail}
      />
    </>
  )
}
