import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { FEATURE_CATEGORIES } from '../lib/constants'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionWrapper from '../components/ui/SectionWrapper'

export default function FeatureGrid() {
  return (
    <SectionWrapper bgSoft id="products">
      <div className="text-center mb-12">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 mb-4">
          Capabilities
        </p>
        <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900">
          Everything you need to train and assess
        </h2>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid md:grid-cols-3 gap-6"
      >
        {FEATURE_CATEGORIES.map((category) => (
          <motion.div key={category.title} variants={fadeInUp}>
            <Card className="h-full">
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.title}
                </h3>
                {category.comingSoon && <Badge>Coming Soon</Badge>}
              </div>
              <ul className="space-y-4">
                {category.features.map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <feature.icon
                      size={20}
                      strokeWidth={1.5}
                      className="text-gray-700 shrink-0 mt-0.5"
                    />
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
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  )
}
