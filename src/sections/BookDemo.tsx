import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Video, CheckCircle } from 'lucide-react'
import { fadeInUp, staggerContainer } from '../lib/motion'

const MEETING_POINTS = [
  { icon: Clock, text: '30 minutes, no fluff' },
  { icon: Video, text: 'Google Meet or Zoom' },
  { icon: CheckCircle, text: 'Live demo tailored to your use case' },
]

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
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="md:pt-6"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
              Meet the founder
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-[36px] font-semibold text-gray-900 mb-4"
          >
            See Vivalyn in action
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-lg text-gray-600 mb-10">
            Book a 30-minute call — get a live walkthrough and see how Vivalyn fits your workflow.
          </motion.p>

          <motion.div variants={fadeInUp} className="space-y-4 mb-10">
            {MEETING_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon size={15} className="text-indigo-600 shrink-0" />
                <span className="text-sm text-gray-600">{text}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} className="border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Hosted by</p>
            <p className="text-sm font-semibold text-gray-900">Shreyash Singh</p>
            <p className="text-sm text-gray-500">Founder, Vivalyn</p>
          </motion.div>
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
            data-url="https://calendly.com/shreyash-vivalyn/30min?primary_color=b412e5&hide_event_type_details=1&hide_gdpr_banner=1"
            style={{ minWidth: '320px', height: '660px' }}
          />
        </motion.div>

      </div>
    </section>
  )
}
