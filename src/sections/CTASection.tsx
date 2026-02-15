import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '../lib/motion'
import Button from '../components/ui/Button'

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="max-w-[1200px] mx-auto bg-indigo-600 rounded-2xl px-8 py-16 md:p-16 text-center"
      >
        <motion.h2
          variants={fadeInUp}
          className="text-3xl md:text-[32px] font-semibold text-white leading-snug"
        >
          Ready to scale your training?
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="mt-4 text-indigo-100 text-lg max-w-[50ch] mx-auto"
        >
          Join organizations using Vivalyn to deliver consistent, measurable
          training at a fraction of the cost.
        </motion.p>
        <motion.div variants={fadeInUp} className="mt-8 flex flex-wrap justify-center gap-4">
          <Button
            variant="secondary"
            className="bg-white text-indigo-600 border-white hover:bg-indigo-50"
          >
            Book a demo
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-indigo-500"
          >
            Request pilot pricing
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
