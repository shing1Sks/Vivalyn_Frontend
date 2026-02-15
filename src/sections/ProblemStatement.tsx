import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import SectionWrapper from '../components/ui/SectionWrapper'

export default function ProblemStatement() {
  return (
    <SectionWrapper bgSoft>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="max-w-[720px] mx-auto text-center"
      >
        <motion.p
          variants={fadeInUp}
          className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4"
        >
          The Problem
        </motion.p>
        <motion.h2
          variants={fadeInUp}
          className="text-3xl md:text-[32px] font-semibold text-gray-900 leading-snug"
        >
          Why current training and feedback systems fail at scale
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="mt-5 text-lg text-gray-600 leading-relaxed"
        >
          One-on-one coaching delivers the best outcomes — but it's expensive,
          slow, and inconsistent. Organizations need repeatable, measurable
          practice that mimics real-world friction without exploding cost or
          logistics.
        </motion.p>
        <motion.div
          variants={fadeInUp}
          className="mt-10 border-t border-gray-200"
        />
      </motion.div>
    </SectionWrapper>
  )
}
