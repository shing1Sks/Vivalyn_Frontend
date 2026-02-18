import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import SectionWrapper from '../components/ui/SectionWrapper'

export default function SolutionSummary() {
  return (
    <SectionWrapper id="solution">
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
          What We Do
        </motion.p>
        <motion.h2
          variants={fadeInUp}
          className="text-3xl md:text-[32px] font-semibold text-gray-900 leading-snug"
        >
          Lightweight AI agents that train and assess at scale
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="mt-5 text-lg text-gray-600 leading-relaxed"
        >
          We provide customizable AI agents that simulate real business
          interactions and assess performance with your rubric. Launch an
          assessor in 3 steps: define goal, set rubric, deploy. Use agents for
          role-play, cold-call practice, demo rehearsals, customer-handling
          drills, and large-scale training sessions.
        </motion.p>
      </motion.div>
    </SectionWrapper>
  )
}
