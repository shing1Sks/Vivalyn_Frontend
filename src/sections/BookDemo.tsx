import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'

export default function BookDemo() {
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current) return
    scriptLoaded.current = true
    const existing = document.querySelector(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]'
    )
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <section id="demo" className="py-16 md:py-24 px-6 bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-12"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
              Meet the founder
            </span>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-[36px] font-semibold text-gray-900"
          >
            See Vivalyn in action
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-gray-600 max-w-[52ch] mx-auto"
          >
            Book a 30-minute call with our founder — get a live walkthrough and see how Vivalyn fits your workflow.
          </motion.p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/shreyash-singh/30min"
            style={{ minWidth: '320px', height: '700px' }}
          />
        </motion.div>
      </div>
    </section>
  )
}
