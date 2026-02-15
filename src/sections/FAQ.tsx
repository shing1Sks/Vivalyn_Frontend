import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import { FAQ_ITEMS } from '../lib/constants'
import Accordion from '../components/ui/Accordion'
import SectionWrapper from '../components/ui/SectionWrapper'

export default function FAQ() {
  return (
    <SectionWrapper bgSoft id="faq">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="max-w-[720px] mx-auto"
      >
        <motion.div variants={fadeInUp} className="text-center mb-10">
          <h2 className="text-3xl md:text-[32px] font-semibold text-gray-900">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-gray-600">
            Everything you need to know about getting started.
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="divide-y divide-gray-200"
        >
          {FAQ_ITEMS.map((item) => (
            <Accordion
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </motion.div>
      </motion.div>
    </SectionWrapper>
  )
}
