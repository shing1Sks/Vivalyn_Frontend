import { motion } from 'framer-motion'
import { Clock, Shuffle, Users, Bot, ClipboardCheck, BarChart3 } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'

const PROBLEMS = [
  {
    icon: Clock,
    title: "Coaching doesn't scale",
    description: "1:1 feedback takes hours per manager weekly — most teams simply can't keep up.",
  },
  {
    icon: Shuffle,
    title: 'Inconsistent standards',
    description: "Without a shared rubric, scores vary by coach and improvement is hard to track.",
  },
  {
    icon: Users,
    title: 'Practice is rare',
    description: "Real scenarios are hard to recreate. Trainees rarely get enough reps before going live.",
  },
]

const SOLUTIONS = [
  {
    icon: Bot,
    title: 'Realistic AI agents',
    description: 'Launch in minutes. Agents simulate real interactions consistently — anytime, at any scale.',
  },
  {
    icon: ClipboardCheck,
    title: 'Rubric-based scoring',
    description: 'Every session scored against the same criteria. No variance, no bias.',
  },
  {
    icon: BarChart3,
    title: 'Actionable reports',
    description: 'Scores, transcripts, and specific coaching recommendations after every session.',
  },
]

export default function ProblemSolution() {
  return (
    <section id="why" className="scroll-mt-[72px] py-24 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid md:grid-cols-2 gap-6 items-stretch"
        >
          {/* Left: Problem */}
          <motion.div variants={fadeInUp} className="flex flex-col justify-center">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
              Why it matters
            </p>
            <h2 className="text-2xl md:text-[30px] font-semibold text-gray-900 leading-snug mb-8">
              Training at scale is broken
            </h2>
            <div className="space-y-5">
              {PROBLEMS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Right: Solution */}
          <motion.div
            variants={fadeInUp}
            className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 flex flex-col justify-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-500 mb-2">
              What we do
            </p>
            <h3 className="text-xl md:text-[24px] font-semibold text-gray-900 leading-snug mb-7">
              AI agents that simulate, assess, and report — at any scale
            </h3>
            <div className="space-y-5">
              {SOLUTIONS.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
