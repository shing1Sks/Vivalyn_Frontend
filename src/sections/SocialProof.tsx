import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { METRICS, TESTIMONIALS } from '../lib/constants'
import Card from '../components/ui/Card'
import SectionWrapper from '../components/ui/SectionWrapper'

const PARTNER_NAMES = [
  'TechCorp',
  'ScaleUp Inc.',
  'EduLearn',
  'GrowthCo',
  'SalesForward',
  'TrainPro',
]

export default function SocialProof() {
  return (
    <SectionWrapper>
      {/* Metrics banner */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
      >
        {METRICS.map((metric) => (
          <motion.div
            key={metric.label}
            variants={fadeInUp}
            className="text-center"
          >
            <p className="text-3xl md:text-4xl font-bold text-indigo-600">
              {metric.value}
            </p>
            <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Logo row */}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-16">
        {PARTNER_NAMES.map((name) => (
          <span
            key={name}
            className="text-lg font-semibold text-gray-300 hover:text-gray-700 transition-colors duration-[180ms] cursor-default select-none"
          >
            {name}
          </span>
        ))}
      </div>

      {/* Testimonials */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid md:grid-cols-3 gap-6"
      >
        {TESTIMONIALS.map((testimonial) => (
          <motion.div key={testimonial.name} variants={fadeInUp}>
            <Card hoverable={false} className="h-full">
              <p className="text-gray-600 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {testimonial.name}
                </p>
                <p className="text-sm text-gray-500">{testimonial.title}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  )
}
