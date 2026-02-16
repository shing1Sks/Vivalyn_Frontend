import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { PRICING_PLANS_IN, PRICING_PLANS_INTL } from '../lib/constants'
import type { PricingPlan } from '../lib/constants'
import SectionWrapper from '../components/ui/SectionWrapper'
import Button from '../components/ui/Button'

function PricingCard({ plan }: { plan: PricingPlan }) {
  const isFree = plan.price === 'Free'
  const isPopular = plan.popular

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all duration-[180ms] ${
        isPopular
          ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600'
          : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
          <Sparkles size={12} /> Most Popular
        </span>
      )}

      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-semibold text-gray-900 whitespace-nowrap">
            {plan.price}
          </span>
          {isFree ? (
            <p className="text-xs text-gray-500 mt-1">Available on request</p>
          ) : (
            <span className="text-sm text-gray-500 ml-1">one-time</span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6 flex-1">
        <ul className="space-y-3">
          <li className="flex items-start gap-2.5">
            <Check
              size={16}
              strokeWidth={2}
              className="text-indigo-600 shrink-0 mt-0.5"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">{plan.credits}</span> credits
              included
            </span>
          </li>
          {plan.bonus && (
            <li className="flex items-start gap-2.5">
              <Check
                size={16}
                strokeWidth={2}
                className="text-indigo-600 shrink-0 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium text-emerald-600">
                  {plan.bonus}
                </span>{' '}
                bonus credits
              </span>
            </li>
          )}
          <li className="flex items-start gap-2.5">
            <Check
              size={16}
              strokeWidth={2}
              className="text-indigo-600 shrink-0 mt-0.5"
            />
            <span className="text-sm text-gray-700">
              {plan.sessions} sessions (10 min each)
            </span>
          </li>
          {plan.perSession && (
            <li className="flex items-start gap-2.5">
              <Check
                size={16}
                strokeWidth={2}
                className="text-indigo-600 shrink-0 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                {plan.perSession} per session
              </span>
            </li>
          )}
        </ul>
      </div>

      <Button
        variant={isPopular ? 'primary' : 'secondary'}
        className="w-full justify-center"
      >
        {isFree ? 'Request Demo' : 'Get Started'}
      </Button>
    </div>
  )
}

type Region = 'india' | 'international'

export default function Pricing() {
  const [region, setRegion] = useState<Region>('india')
  const plans =
    region === 'india' ? PRICING_PLANS_IN : PRICING_PLANS_INTL

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
          Pay once, use your credits anytime. No subscriptions, no hidden fees.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 min-h-[420px]">
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={fadeInUp}>
                <PricingCard plan={plan} />
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10">
            Need a custom plan?{' '}
            <a
              href="#"
              className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors duration-[120ms]"
            >
              Contact sales
            </a>
          </p>
        </motion.div>
      </AnimatePresence>
    </SectionWrapper>
  )
}
