import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { PRICING_PLANS_IN, PRICING_PLANS_INTL } from '../lib/constants'
import type { PricingPlan } from '../lib/constants'
import SectionWrapper from '../components/ui/SectionWrapper'
import Button from '../components/ui/Button'
import InquiryModal from '../components/ui/InquiryModal'

type Region = 'india' | 'international'

function PricingCard({
  plan,
  onGetStarted,
}: {
  plan: PricingPlan
  onGetStarted: (tier: string) => void
}) {
  const isStarter = plan.tier === 'starter'

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all duration-[120ms] ${
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

      <div className="border-t border-gray-100 pt-4 mb-6 flex-1 space-y-2.5">
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
        {plan.tier === 'starter' && (
          <div className="flex items-start gap-2.5">
            <Check size={15} strokeWidth={2} className="text-indigo-600 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">Monthly reset, no rollover</span>
          </div>
        )}
        {plan.note && (
          <p className="text-xs text-gray-400 pt-1 leading-relaxed">{plan.note}</p>
        )}
      </div>

      <Button
        variant={isStarter ? 'primary' : 'secondary'}
        className="w-full justify-center"
        onClick={() => onGetStarted(plan.tier)}
      >
        Get Started
      </Button>
    </div>
  )
}

export default function Pricing() {
  const [region, setRegion] = useState<Region>('india')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | undefined>()

  const plans = region === 'india' ? PRICING_PLANS_IN : PRICING_PLANS_INTL

  const handleGetStarted = (tier: string) => {
    setSelectedTier(tier)
    setModalOpen(true)
  }

  return (
    <SectionWrapper id="pricing">
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
        <motion.div
          key={region}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={fadeInUp}>
                <PricingCard plan={plan} onGetStarted={handleGetStarted} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Contact Us to Explore More Plans */}
      <div className="mt-14 max-w-2xl mx-auto rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Need more? Explore Growth and Pro plans
        </h3>
        <p className="text-sm text-gray-500 mb-1">
          Growth (4,000 mins) and Pro (8,000 mins + scaling) are available via our sales team.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Fill out a short form and we'll send you pricing for your preferred currency within 24 hours.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            className="justify-center gap-2"
            onClick={() => { setSelectedTier(undefined); setModalOpen(true) }}
          >
            Contact Us
            <ArrowRight size={15} />
          </Button>
          <span className="text-sm text-gray-400">
            or email us at{' '}
            <a
              href="mailto:hello@vivalyn.in"
              className="text-indigo-600 hover:text-indigo-700 transition-colors duration-[120ms]"
            >
              hello@vivalyn.in
            </a>
          </span>
        </div>
      </div>

      <InquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        planInterest={selectedTier}
      />
    </SectionWrapper>
  )
}
