import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { FileText, BarChart3, MessageSquare, Lightbulb } from 'lucide-react'
import SectionWrapper from '../components/ui/SectionWrapper'

const REPORT_FEATURES = [
  {
    icon: FileText,
    title: 'AI-generated summary',
    description: 'Score, pass/fail status, and time spent — at a glance.',
  },
  {
    icon: BarChart3,
    title: 'Rubric-based scoring',
    description: 'Scores per criterion with percentile vs. cohort comparison.',
  },
  {
    icon: MessageSquare,
    title: 'Full transcript analysis',
    description:
      'Highlighted moments like missed objections and strong closings.',
  },
  {
    icon: Lightbulb,
    title: 'Actionable recommendations',
    description: 'Coach prompts and micro-lessons tailored to each learner.',
  },
]

function MockReport() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-gray-500">assessment-report.pdf</span>
      </div>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
            <p className="text-xs text-gray-500">Cold Call Assessment — Q4</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-indigo-600">87</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Content', score: 92, color: 'bg-emerald-500' },
            { label: 'Clarity', score: 88, color: 'bg-indigo-600' },
            { label: 'Objections', score: 72, color: 'bg-amber-500' },
            { label: 'Closing', score: 85, color: 'bg-indigo-600' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <p className="text-xs font-medium text-gray-700 mt-1">
                {item.score}%
              </p>
            </div>
          ))}
        </div>

        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-xs font-medium text-indigo-700 mb-1">
            Top Recommendation
          </p>
          <p className="text-sm text-indigo-900">
            Practice acknowledging customer concerns before redirecting the
            conversation.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ReportPreview() {
  return (
    <SectionWrapper bgSoft>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid md:grid-cols-2 gap-12 md:gap-16 items-center"
      >
        <motion.div variants={fadeInUp}>
          <MockReport />
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
              Detailed Reports
            </p>
            <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900 leading-snug">
              Every session produces actionable insights
            </h2>
            <p className="mt-4 text-gray-600">
              Each assessment generates a comprehensive report your team can act
              on immediately.
            </p>
          </div>

          <ul className="space-y-5">
            {REPORT_FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <feature.icon
                    size={20}
                    strokeWidth={1.5}
                    className="text-indigo-600"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {feature.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </SectionWrapper>
  )
}
