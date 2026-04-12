import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'

export default function ProblemSolution() {
  return (
    <section id="why" className="scroll-mt-[20vh] overflow-hidden">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid md:grid-cols-2"
      >
        {/* Problem — gray half */}
        <motion.div
          variants={fadeInUp}
          className="bg-gray-100 px-10 py-36"
        >
          <div className="max-w-[480px]">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-4">
              The Problem
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 leading-snug mb-5">
              Why current training fails at scale
            </h2>
            <p className="text-gray-600 leading-relaxed">
              One-on-one coaching delivers the best outcomes — but it's expensive, slow, and
              inconsistent. Organizations need repeatable, measurable practice that mimics
              real-world friction without exploding cost or logistics.
            </p>
          </div>
        </motion.div>

        {/* Solution — white half */}
        <motion.div
          variants={fadeInUp}
          className="bg-white px-10 py-36"
        >
          <div className="max-w-[480px]">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
              What We Do
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 leading-snug mb-5">
              AI agents that train and assess at scale
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Customizable AI agents simulate real business interactions and assess performance
              against your rubric. Launch an assessor in minutes — define the goal, set
              the criteria, deploy.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
