import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { STEPS } from '../lib/constants'
import SectionWrapper from '../components/ui/SectionWrapper'

export default function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works">
      <div className="text-center mb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
          Simple Setup
        </p>
        <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900">
          Launch an assessment in 3 steps
        </h2>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid md:grid-cols-3 gap-8 relative"
      >
        {/* Connector line */}
        <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px bg-gray-200" />

        {STEPS.map((step) => (
          <motion.div
            key={step.number}
            variants={fadeInUp}
            className="text-center relative"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 font-semibold flex items-center justify-center mx-auto mb-4 relative z-10 text-lg">
              {step.number}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 max-w-[280px] mx-auto">
              {step.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  )
}
