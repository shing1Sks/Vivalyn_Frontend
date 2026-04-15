import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { getAllPlansIn, getAllPlansIntl } from '../lib/constants'
import type { PricingPlan } from '../lib/constants'
import SectionWrapper from '../components/ui/SectionWrapper'
import Button from '../components/ui/Button'
import InquiryModal from '../components/ui/InquiryModal'

type Region = 'india' | 'international'

const TRIAL_LABELS = ['Request a Demo', 'Start Free Trial']

function TrialCta({ onClick }: { onClick: () => void }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % TRIAL_LABELS.length), 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-[120ms] cursor-pointer overflow-hidden h-[42px]"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {TRIAL_LABELS[idx]}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function PricingCard({
  plan,
  onAction,
}: {
  plan: PricingPlan
  onAction: (tier: string) => void
}) {
  const isTrial = plan.tier === 'trial'
  const isStarter = plan.tier === 'starter'
  const isContact = plan.tier === 'growth' || plan.tier === 'pro'

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all duration-[120ms] h-full ${
        isStarter
          ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600'
          : 'border-gray-200 shadow-sm'
      }`}
    >
      {isStarter && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
          Most Popular
        </span>
      )}

      {/* Plan name + price */}
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          {plan.crossedPrice && (
            <span className="text-lg text-gray-400 line-through">{plan.crossedPrice}</span>
          )}
          <span className="text-3xl font-semibold text-gray-900">{plan.price}</span>
          <span className="text-sm text-gray-500">{plan.billingLabel}</span>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-gray-100 pt-4 mb-5 flex-1 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <Check size={15} strokeWidth={2} className="text-indigo-600 shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700">
            <span className="font-medium">{plan.sessions} sessions</span>
            <span className="text-gray-500"> (~10 min each)</span>
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Check size={15} strokeWidth={2} className="text-indigo-600 shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700">
            <span className="font-medium">{plan.minutes.toLocaleString()} mins</span>
            <span className="text-gray-500"> included</span>
          </span>
        </div>
        {isStarter && (
          <div className="flex items-start gap-2.5">
            <Check size={15} strokeWidth={2} className="text-indigo-600 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Monthly reset, no rollover</span>
          </div>
        )}
        {plan.scalingAvailable && (
          <div className="flex items-start gap-2.5">
            <Check size={15} strokeWidth={2} className="text-indigo-600 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">
              Scaling beyond limit
              {plan.additionalRate && (
                <span className="text-gray-500"> ({plan.additionalRate})</span>
              )}
            </span>
          </div>
        )}
        {plan.note && (
          <p className="text-xs text-gray-400 pt-1 leading-relaxed">{plan.note}</p>
        )}
      </div>

      {/* Discount badge for Growth/Pro */}
      {isContact && (
        <p className="text-xs text-indigo-600 text-center mb-3">
          Reach out for better pricing →
        </p>
      )}

      {/* CTA */}
      {isTrial ? (
        <TrialCta onClick={() => onAction(plan.tier)} />
      ) : isContact ? (
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => onAction(plan.tier)}
        >
          Talk to us
        </Button>
      ) : (
        <Button
          variant="primary"
          className="w-full justify-center"
          onClick={() => onAction(plan.tier)}
        >
          Get Started
        </Button>
      )}
    </div>
  )
}

function PricingCardSkeleton() {
  return (
    <div className="h-[320px] rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
  )
}

export default function Pricing() {
  const [region, setRegion] = useState<Region>('india')
  const [modalOpen, setModalOpen] = useState(false)
  const [plansIn, setPlansIn] = useState<PricingPlan[]>([])
  const [plansIntl, setPlansIntl] = useState<PricingPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  useEffect(() => {
    setPlansLoading(true)
    Promise.all([getAllPlansIn(), getAllPlansIntl()])
      .then(([inPlans, intlPlans]) => {
        setPlansIn(inPlans)
        setPlansIntl(intlPlans)
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [])

  const plans = region === 'india' ? plansIn : plansIntl

  const handleAction = () => {
    setModalOpen(true)
  }

  return (
    <SectionWrapper bgSoft id="pricing">
      <div className="text-center mb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
          Pricing
        </p>
        <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900 mb-3">
          Simple, transparent pricing
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Monthly plans with a fixed minute allowance. Reset every billing cycle.
        </p>

        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mt-8">
          <button
            onClick={() => setRegion('india')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-[120ms] cursor-pointer ${
              region === 'india'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            India (₹)
          </button>
          <button
            onClick={() => setRegion('international')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-[120ms] cursor-pointer ${
              region === 'international'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            International ($)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[0, 1, 2, 3].map((i) => <PricingCardSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div
            key={region}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <motion.div key={plan.tier} variants={fadeInUp} className="flex flex-col">
                  <PricingCard plan={plan} onAction={handleAction} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </SectionWrapper>
  )
}
